/* eslint-disable @typescript-eslint/no-unused-vars */
import test from "node:test";
import { derivePublicActivityStatus } from "../../game/public-activity.ts";
import {
  assert, card, createHumanGame, createTestGame, discardIds, query, quote, request, requestAndSettle, roomCardCount,
  setDeck, setEquipment, setHand, setTurn, sql, state,
} from "./test-support.mjs";

function configure(game, { targetHero = "zhao-yun", targetHp = 4, targetHand = [], targetEquipment = {}, yueCards = [card("Peach", "dauntless-cost")] } = {}) {
  const [target, yue, ...others] = game.room.players;
  sql(`UPDATE players SET hero=${quote(targetHero)}, hp=${targetHp}, max_hp=4 WHERE id=${quote(target.id)}`);
  sql(`UPDATE players SET hero='yue-jin', hp=4, max_hp=4 WHERE id=${quote(yue.id)}`);
  for (const player of others) sql(`UPDATE players SET hero=NULL, hp=4, max_hp=4 WHERE id=${quote(player.id)}`);
  setHand(target.id, targetHand, targetHp, 4);
  setHand(yue.id, yueCards, 4, 4);
  for (const player of others) setHand(player.id, [], 4, 4);
  setEquipment(target.id, targetEquipment);
  setEquipment(yue.id, {});
  for (const player of others) setEquipment(player.id, {});
  setTurn(game.code, target.seat, "play");
  return { target, yue, others };
}

async function openDauntless(game, targetMember, yueMember) {
  const ended = await requestAndSettle("end_turn", { code: game.code, token: targetMember.token, preserveResponse: true });
  assert.equal(ended.status, 200, JSON.stringify(ended.data));
  const yueView = await state(game.code, yueMember.token);
  const option = yueView.data.currentAction?.triggerOptions?.find((entry) => entry.effectId === "yue_jin_dauntless");
  assert.ok(option, JSON.stringify(yueView.data));
  return { ended, yueView, option };
}

test("Dauntless uses the shared turn_end event, private Basic cost, and target-owned Equipment choice", async () => {
  const game = await createHumanGame();
  const { target, yue } = configure(game, {
    targetEquipment: { weapon: card("GreenDragonBlade", "dauntless-weapon"), armor: card("NioShield", "dauntless-armor") },
    yueCards: [card("Peach", "dauntless-peach"), card("DrawTwo", "dauntless-stratagem")],
  });
  const opened = await openDauntless(game, game.members[0], game.members[1]);
  assert.deepEqual(opened.option.selection.eligibleCardIds, ["peach-dauntless-peach"], "only catalogue Basic cards are private eligible costs");
  assert.deepEqual((await state(game.code, game.members[0].token)).data.currentAction.triggerOptions, [], "the Yue Jin cost stays private");
  const reloaded = await state(game.code, game.members[1].token);
  assert.equal(reloaded.data.actionRevision, opened.yueView.data.actionRevision, "reload preserves the same activation revision");

  const activated = await requestAndSettle("trigger", { code: game.code, token: game.members[1].token, providerId: "yue_jin_dauntless", cardId: "peach-dauntless-peach", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  assert.equal(activated.data.room.currentAction.actorId, target.id);
  const paidCost = activated.data.room.timeline.find((event) => event.type === "cards" && event.cards.some((item) => item.id === "peach-dauntless-peach"));
  assert.deepEqual(paidCost.publicCardEffects?.[0], {
    semantics: "PROVEN", eventId: paidCost.id, effectId: "yue_jin_dauntless", effectClass: "COST",
    activationOwnerId: yue.id,
    materials: [{ cardId: "peach-dauntless-peach", ownerId: yue.id, fromZone: "HAND", toZone: "DISCARD" }],
    targetId: target.id, outcome: "ACTIVATION_COST",
  });
  const targetView = await state(game.code, game.members[0].token);
  assert.ok(targetView.data.currentAction.triggerOptions?.[0], JSON.stringify(targetView.data));
  assert.deepEqual(targetView.data.currentAction.triggerOptions[0].selection.eligibleKeys, ["greendragonblade-dauntless-weapon", "nioshield-dauntless-armor"]);
  assert.deepEqual(targetView.data.currentAction.legalActions, ["trigger"], "Equipment is mandatory and cannot be converted to damage");
  assert.equal(roomCardCount(game.code, "peach-dauntless-peach"), 1, "the Basic cost remains conserved exactly once");

  const targetReload = await state(game.code, game.members[0].token);
  assert.equal(targetReload.data.actionRevision, activated.data.room.actionRevision, "reload preserves the target Equipment decision");
  const selected = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "yue_jin_dauntless", cardKeys: ["nioshield-dauntless-armor"] });
  assert.equal(selected.status, 200, JSON.stringify(selected.data));
  assert.equal(selected.data.room.players.find((player) => player.id === target.id).equipmentCards.length, 1);
  assert.equal(selected.data.room.players.find((player) => player.id === target.id).hp, 4, "Equipment settlement deals no damage");
  const targetEquipment = selected.data.room.timeline.find((event) => event.type === "cards" && event.cards.some((item) => item.id === "nioshield-dauntless-armor"));
  assert.deepEqual(targetEquipment.publicCardEffects?.[0], {
    semantics: "PROVEN", eventId: targetEquipment.id, effectId: "yue_jin_dauntless", effectClass: "EFFECT",
    activationOwnerId: yue.id,
    materials: [{ cardId: "nioshield-dauntless-armor", ownerId: target.id, fromZone: "EQUIPMENT", toZone: "DISCARD" }],
    targetId: target.id, outcome: "DAMAGE_PREVENTED",
  }, "the activation owner and the target-owned Equipment material remain distinct");
  assert.equal(discardIds(game.code).filter((id) => ["peach-dauntless-peach", "nioshield-dauntless-armor"].includes(id)).length, 2);
  assert.equal((await state(game.code, game.members[1].token)).data.phase, "draw", "turn-end continues to the next living seat exactly once");
});

test("Dauntless activation, own-turn exclusion, no-Basic private Pass, decline, and stale submissions are safe", async () => {
  const declined = await createHumanGame();
  const declineSetup = configure(declined, { yueCards: [card("Peach", "dauntless-decline")] });
  await openDauntless(declined, declined.members[0], declined.members[1]);
  const decline = await requestAndSettle("decline_trigger", { code: declined.code, token: declined.members[1].token });
  assert.equal(decline.status, 200, JSON.stringify(decline.data));
  assert.equal((await state(declined.code, declined.members[1].token)).data.phase, "draw");

  const ownTurn = await createHumanGame();
  const ownSetup = configure(ownTurn, { yueCards: [card("Peach", "dauntless-own")] });
  setTurn(ownTurn.code, ownSetup.yue.seat, "play");
  const ownEnded = await requestAndSettle("end_turn", { code: ownTurn.code, token: ownTurn.members[1].token });
  assert.equal(ownEnded.status, 200, JSON.stringify(ownEnded.data));
  assert.equal((await state(ownTurn.code, ownTurn.members[0].token)).data.currentAction?.triggerOptions?.some((option) => option.effectId === "yue_jin_dauntless") ?? false, false, "Yue Jin never triggers on Yue Jin's own turn");

  const noBasic = await createHumanGame();
  const noBasicSetup = configure(noBasic, { yueCards: [card("DrawTwo", "dauntless-no-basic")] });
  const noBasicEnded = await requestAndSettle("end_turn", { code: noBasic.code, token: noBasic.members[0].token, preserveResponse: true });
  assert.equal(noBasicEnded.status, 200, JSON.stringify(noBasicEnded.data));
  const noBasicOwner = await state(noBasic.code, noBasic.members[1].token);
  assert.equal(noBasicOwner.data.phase, "response", "no Basic card still opens the unconditional private Pass window");
  assert.deepEqual(noBasicOwner.data.currentAction.triggerOptions, []);
  assert.ok(noBasicOwner.data.currentAction.legalActions.includes("decline_trigger"));
  const unauthorizedTimer = await request("start_response_timer", { code: noBasic.code, token: noBasic.members[0].token });
  assert.equal(unauthorizedTimer.status, 409, "only Yue Jin can start the private response timer");
  const armedNoBasic = await request("start_response_timer", { code: noBasic.code, token: noBasic.members[1].token });
  assert.equal(armedNoBasic.status, 200, JSON.stringify(armedNoBasic.data));
  assert.ok(armedNoBasic.data.room.currentAction.deadline > Date.now());
  assert.ok(armedNoBasic.data.room.currentAction.deadline <= Date.now() + 60_000);
  const concealedTimer = await state(noBasic.code, noBasic.members[0].token);
  assert.equal(concealedTimer.data.currentAction.deadline, 0, "the private response timer is hidden from other viewers");
  assert.equal(concealedTimer.data.responseCountdownVisibleAt, 0);
  const refreshedViews = await Promise.all(noBasic.members.map((member) => state(noBasic.code, member.token)));
  for (const { data } of refreshedViews) {
    assert.deepEqual(derivePublicActivityStatus(data), { kind: "resolving", text: "Resolving…" }, "refresh/reconnect preserves the unconditional shared status");
    if (data.meId !== noBasicSetup.yue.id) {
      assert.equal(data.currentAction.deadline, 0);
      assert.equal(data.currentAction.actorId, null);
      assert.equal(data.actionPlayerId, null);
    }
  }
  const refreshedPublicMessages = refreshedViews.map(({ data }) => data.timeline.filter((event) => event.type === "message").map((event) => event.message));
  assert.ok(refreshedPublicMessages.every((messages) => JSON.stringify(messages) === JSON.stringify(refreshedPublicMessages[0])),
    "refresh/reconnect keeps public timeline text identical for all authenticated viewers");
  sql(`UPDATE rooms SET pending_json=json_set(pending_json,'$.deadline',${Date.now() - 1}) WHERE code=${quote(noBasic.code)}`);
  const timedOut = await requestAndSettle("decline_trigger", { code: noBasic.code, token: noBasic.members[1].token });
  assert.equal(timedOut.status, 200, JSON.stringify(timedOut.data));
  assert.equal(timedOut.data.room.phase, "draw", "the existing response timeout Skip closes the private window once");

  const switched = await createTestGame();
  const { token, room } = switched.data;
  const [switchedTarget, switchedYue, ...switchedOthers] = room.players;
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(switchedTarget.id)}`);
  sql(`UPDATE players SET hero='yue-jin', hp=4, max_hp=4 WHERE id=${quote(switchedYue.id)}`);
  for (const player of switchedOthers) sql(`UPDATE players SET hero=NULL, hp=4, max_hp=4 WHERE id=${quote(player.id)}`);
  setHand(switchedTarget.id, [], 4, 4);
  setHand(switchedYue.id, [card("DrawTwo", "dauntless-switch-no-basic")], 4, 4);
  for (const player of switchedOthers) setHand(player.id, [], 4, 4);
  setTurn(room.code, switchedTarget.seat, "play");
  const switchedEnd = await requestAndSettle("end_turn", { code: room.code, token, preserveResponse: true });
  assert.equal(switchedEnd.status, 200, JSON.stringify(switchedEnd.data));
  const switchedViews = await Promise.all(room.players.map((player) => state(room.code, token, false, player.id)));
  assert.deepEqual(switchedViews.map(({ data }) => data.meId).sort(), room.players.map((player) => player.id).sort(), "host Switch can read each authenticated test-player projection during the private window");
  for (const { data } of switchedViews) {
    assert.deepEqual(derivePublicActivityStatus(data), { kind: "resolving", text: "Resolving…" });
    assert.equal(data.timeline.some((event) => event.type === "message" && /Dauntless|may use/i.test(event.message)), false);
    if (data.meId === switchedYue.id) {
      assert.deepEqual(data.currentAction.triggerOptions, []);
      assert.ok(data.currentAction.legalActions.includes("decline_trigger"));
    } else {
      assert.equal(data.currentAction.actorId, null);
      assert.equal(data.actionPlayerId, null);
      assert.equal(data.currentAction.deadline, 0);
    }
  }
  assert.deepEqual(
    (await state(room.code, token, false, switchedYue.id)).data.currentAction,
    switchedViews.find(({ data }) => data.meId === switchedYue.id).data.currentAction,
    "switching away and back reloads the same owner-only Pass decision",
  );
  const switchedPass = await requestAndSettle("decline_trigger", { code: room.code, token });
  assert.equal(switchedPass.status, 200, JSON.stringify(switchedPass.data));
  assert.equal(switchedPass.data.room.phase, "draw");

  const stale = await createHumanGame();
  const staleSetup = configure(stale, { yueCards: [card("Peach", "dauntless-stale")] });
  const staleOpened = await openDauntless(stale, stale.members[0], stale.members[1]);
  const staleContext = { actionRevision: staleOpened.yueView.data.actionRevision, meId: staleSetup.yue.id, phase: "response", pendingKind: "trigger", actorId: staleSetup.yue.id };
  const accepted = await requestAndSettle("trigger", { code: stale.code, token: stale.members[1].token, providerId: "yue_jin_dauntless", cardId: "peach-dauntless-stale", context: staleContext, preserveResponse: true });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const replay = await requestAndSettle("trigger", { code: stale.code, token: stale.members[1].token, providerId: "yue_jin_dauntless", cardId: "peach-dauntless-stale", context: staleContext });
  assert.equal(replay.status, 409); assert.equal(replay.data.stale, true);
});

test("Dauntless falls back to sourced damage and preserves Sima Yi, Xiahou Dun, Guo Jia, and Cao Cao semantics", async () => {
  const simaGame = await createHumanGame();
  const sima = configure(simaGame, { targetHero: "simayi", yueCards: [card("Peach", "dauntless-sima-cost"), card("DrawTwo", "dauntless-sima-gain")] });
  await openDauntless(simaGame, simaGame.members[0], simaGame.members[1]);
  const simaDamage = await requestAndSettle("trigger", { code: simaGame.code, token: simaGame.members[1].token, providerId: "yue_jin_dauntless", cardId: "peach-dauntless-sima-cost", preserveResponse: true });
  assert.equal(simaDamage.data.room.currentAction.actorId, sima.target.id);
  const simaView = await state(simaGame.code, simaGame.members[0].token);
  const independentDamageRoot = simaView.data.causalEnvelope;
  assert.ok(independentDamageRoot, "Dauntless creates an independent Damage causal root");
  assert.equal(independentDamageRoot.frames.length, 1);
  assert.equal(independentDamageRoot.frames[0].parentFrameId, null);
  assert.equal(independentDamageRoot.frames[0].stage, "DAMAGE");
  assert.equal(independentDamageRoot.frames[0].origin.originSourceId, sima.yue.id);
  assert.deepEqual(independentDamageRoot.frames[0].origin.originalTargetIds, [sima.target.id]);
  assert.equal(simaView.data.presentationV2.interactionScene?.semantics, "PROVEN");
  assert.equal(simaView.data.presentationV2.interactionScene?.interactionId, independentDamageRoot.interactionId);
  assert.equal(simaView.data.presentationV2.interactionScene?.rootFrameId, independentDamageRoot.activeFrameId);
  assert.equal(simaView.data.presentationV2.interactionScene?.stage, "DAMAGE");
  assert.equal(simaView.data.presentationV2.interactionScene?.sourceId, sima.yue.id);
  assert.deepEqual(simaView.data.presentationV2.interactionScene?.targetIds, [sima.target.id]);
  assert.equal(simaView.data.presentationV2.interactionScene?.currentParticipantId, sima.target.id);
  assert.equal(simaView.data.presentationV2.interactionScene?.activeResolverId, sima.target.id);
  assert.equal(simaView.data.presentationV2.interactionScene?.decisionActorId, sima.target.id);
  const simaOtherViewer = await state(simaGame.code, simaGame.members[1].token);
  assert.deepEqual(simaOtherViewer.data.presentationV2.interactionScene, simaView.data.presentationV2.interactionScene);
  assert.ok(simaView.data.currentAction.triggerOptions?.[0], JSON.stringify(simaView.data));
  assert.equal(simaView.data.currentAction.triggerOptions[0].effectId, "sima_yi_fankui");
  const retaliation = await requestAndSettle("trigger", { code: simaGame.code, token: simaGame.members[0].token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] });
  assert.equal(retaliation.status, 200, JSON.stringify(retaliation.data));
  assert.equal(retaliation.data.room.players.find((player) => player.id === sima.target.id).hp, 3);
  const retaliationNotice = retaliation.data.room.timeline.find((event) => event.type === "message" && event.message.includes("with Retaliation."));
  assert.ok(retaliationNotice?.effectNotice, "the public Retaliation result is a separately identified Effect Triggered notice");
  assert.equal(roomCardCount(simaGame.code, "drawtwo-dauntless-sima-gain"), 1);
  assert.equal((await state(simaGame.code, simaGame.members[1].token)).data.phase, "draw");

  const caoGame = await createHumanGame();
  const cao = configure(caoGame, { targetHero: "cao-cao", yueCards: [card("Peach", "dauntless-cao-cost")] });
  await openDauntless(caoGame, caoGame.members[0], caoGame.members[1]);
  const caoDamage = await requestAndSettle("trigger", { code: caoGame.code, token: caoGame.members[1].token, providerId: "yue_jin_dauntless", cardId: "peach-dauntless-cao-cost" });
  assert.equal(caoDamage.status, 200, JSON.stringify(caoDamage.data));
  assert.equal(caoDamage.data.room.players.find((player) => player.id === cao.target.id).hp, 3);
  assert.equal(caoDamage.data.room.players.find((player) => player.id === cao.target.id).handCount, 0, "no physical damage card means no Treachery option");
  assert.equal(caoDamage.data.room.presentationV2.interactionScene, null, "independent Dauntless Damage clears when no post-damage reaction exists");
  assert.ok(discardIds(caoGame.code).includes("peach-dauntless-cao-cost"));

  const guoGame = await createHumanGame();
  const guo = configure(guoGame, { targetHero: "guo-jia", yueCards: [card("Peach", "dauntless-guo-cost")] });
  setDeck(guoGame.code, [card("Dodge", "dauntless-legacy-a"), card("Peach", "dauntless-legacy-b")]);
  await openDauntless(guoGame, guoGame.members[0], guoGame.members[1]);
  const guoDamage = await requestAndSettle("trigger", { code: guoGame.code, token: guoGame.members[1].token, providerId: "yue_jin_dauntless", cardId: "peach-dauntless-guo-cost", preserveResponse: true });
  const guoView = await state(guoGame.code, guoGame.members[0].token);
  assert.equal(guoView.data.currentAction.triggerOptions.filter((option) => option.effectId === "guo_jia_legacy").length, 1, "Dauntless opens one Legacy opportunity");
  const guoDeclined = await requestAndSettle("decline_trigger", { code: guoGame.code, token: guoGame.members[0].token });
  assert.equal(guoDeclined.status, 200, JSON.stringify(guoDeclined.data));

  const xiahouGame = await createHumanGame();
  const xiahou = configure(xiahouGame, { targetHero: "xiahou-dun", yueCards: [card("Peach", "dauntless-xiahou-cost"), card("Dodge", "dauntless-xiahou-a"), card("Peach", "dauntless-xiahou-b")] });
  setDeck(xiahouGame.code, [{ ...card("Dodge", "dauntless-ganglie-judge"), suit: "♠", rank: "7" }]);
  await openDauntless(xiahouGame, xiahouGame.members[0], xiahouGame.members[1]);
  await requestAndSettle("trigger", { code: xiahouGame.code, token: xiahouGame.members[1].token, providerId: "yue_jin_dauntless", cardId: "peach-dauntless-xiahou-cost", preserveResponse: true });
  const ganglie = await requestAndSettle("trigger", { code: xiahouGame.code, token: xiahouGame.members[0].token, providerId: "xiahou_dun_ganglie" });
  assert.equal(ganglie.data.room.currentAction.actorId, xiahou.yue.id, "Stauchness consequence is owned by the Dauntless source");
  const punishment = await requestAndSettle("trigger", { code: xiahouGame.code, token: xiahouGame.members[1].token, providerId: "xiahou_dun_ganglie", choice: "take_damage" });
  assert.equal(punishment.status, 200, JSON.stringify(punishment.data));
  assert.equal(punishment.data.room.players.find((player) => player.id === xiahou.yue.id).hp, 3);
  assert.equal((await state(xiahouGame.code, xiahouGame.members[1].token)).data.phase, "draw");
});

test("Dauntless damage survives Dying rescue or defeat and returns to turn-end continuation", async () => {
  const rescued = await createHumanGame();
  const rescueSetup = configure(rescued, { targetHp: 1, yueCards: [card("Peach", "dauntless-rescue-cost")] });
  setHand(rescued.room.players[2].id, [card("Peach", "dauntless-rescue")], 4, 4);
  await openDauntless(rescued, rescued.members[0], rescued.members[1]);
  const dying = await requestAndSettle("trigger", { code: rescued.code, token: rescued.members[1].token, providerId: "yue_jin_dauntless", cardId: "peach-dauntless-rescue-cost", preserveResponse: true });
  assert.equal(dying.data.room.phase, "dying", JSON.stringify(dying.data));
  const rescue = await requestAndSettle("give_peach", { code: rescued.code, token: rescued.members[2].token, cardId: "peach-dauntless-rescue" });
  assert.equal(rescue.status, 200, JSON.stringify(rescue.data));
  const resumed = await state(rescued.code, rescued.members[1].token);
  assert.equal(resumed.data.phase, "draw"); assert.equal(resumed.data.turnSeat, rescueSetup.yue.seat);
  assert.equal(resumed.data.players.find((player) => player.id === rescueSetup.target.id).hp, 1);
  assert.equal(resumed.data.log.filter((entry) => entry.includes("turn-end effects finish; the next living character begins")).length, 1);

  const defeated = await createHumanGame();
  const defeatSetup = configure(defeated, { targetHp: 1, yueCards: [card("Peach", "dauntless-defeat-cost")] });
  for (const player of defeated.room.players.filter((player) => player.id !== defeatSetup.target.id && player.id !== defeatSetup.yue.id)) setHand(player.id, [], 4, 4);
  await openDauntless(defeated, defeated.members[0], defeated.members[1]);
  const lethal = await requestAndSettle("trigger", { code: defeated.code, token: defeated.members[1].token, providerId: "yue_jin_dauntless", cardId: "peach-dauntless-defeat-cost" });
  assert.equal(lethal.status, 200, JSON.stringify(lethal.data));
  const finished = await state(defeated.code, defeated.members[1].token);
  assert.equal(finished.data.players.find((player) => player.id === defeatSetup.target.id).alive, false);
  assert.notEqual(finished.data.phase, "resolving");
  assert.equal(roomCardCount(defeated.code, "peach-dauntless-defeat-cost"), 1);
});

test("Dauntless public projection privacy audit across independent viewers", async () => {
  const withBasic = await createHumanGame();
  const basicSetup = configure(withBasic, { yueCards: [card("Peach", "dauntless-privacy-basic")] });
  await openDauntless(withBasic, withBasic.members[0], withBasic.members[1]);
  const basicViews = await Promise.all(withBasic.members.map((member) => state(withBasic.code, member.token)));
  const sharedBasicStatus = derivePublicActivityStatus(basicViews[0].data);
  assert.deepEqual(sharedBasicStatus, { kind: "resolving", text: "Resolving…" });
  for (const { data } of basicViews) {
    assert.deepEqual(derivePublicActivityStatus(data), sharedBasicStatus, "all independent viewers receive the same public status");
    assert.equal(data.timeline.some((event) => event.type === "message" && /may use Dauntless|Dauntless.*end of/i.test(event.message)), false, "private Basic-card eligibility is absent from shared timeline text");
    if (data.meId === basicSetup.yue.id) {
      assert.equal(data.actionPlayerId, basicSetup.yue.id);
      assert.equal(data.currentAction.actorId, basicSetup.yue.id);
      assert.match(data.currentAction.reason, /Dauntless/);
      assert.deepEqual(data.currentAction.triggerOptions.map((option) => option.effectId), ["yue_jin_dauntless"]);
      continue;
    }
    assert.equal(data.actionPlayerId, null, "other viewers do not receive the private decision owner");
    assert.equal(data.currentAction.actorId, null);
    assert.equal(data.currentAction.kind, "none");
    assert.equal(data.currentAction.deadline, 0);
    assert.equal(data.currentAction.reason, "Resolving…");
    assert.deepEqual(data.currentAction.legalActions, []);
    assert.equal(data.actionReason, "Resolving…");
    assert.equal(data.myHand.some((held) => held.id === "peach-dauntless-privacy-basic"), false);
    assert.equal(data.pending, null);
    assert.equal(data.responseCountdownVisibleAt, 0);
    assert.equal(data.actionRevision.includes(basicSetup.yue.id), false, "revision does not serialize the private decision owner");
    const publicProjection = JSON.stringify({
      currentAction: data.currentAction, actionPlayerId: data.actionPlayerId, actionReason: data.actionReason,
      pending: data.pending, responseCountdownVisibleAt: data.responseCountdownVisibleAt, actionRevision: data.actionRevision,
      presentationV2: data.presentationV2, presentationSnapshot: data.presentationSnapshot, timeline: data.timeline,
    });
    assert.equal(publicProjection.includes(basicSetup.yue.id), false, "no public projection field recovers the private actor ID");
    assert.equal(publicProjection.includes("peach-dauntless-privacy-basic"), false, "no public projection field recovers the private Basic cost card");
  }

  const withoutBasic = await createHumanGame();
  const noBasicSetup = configure(withoutBasic, { yueCards: [card("DrawTwo", "dauntless-privacy-no-basic")] });
  const noBasicEnd = await requestAndSettle("end_turn", { code: withoutBasic.code, token: withoutBasic.members[0].token, preserveResponse: true });
  assert.equal(noBasicEnd.status, 200, JSON.stringify(noBasicEnd.data));
  const noBasicViews = await Promise.all(withoutBasic.members.map((member) => state(withoutBasic.code, member.token)));
  const sharedNoBasicStatus = derivePublicActivityStatus(noBasicViews[0].data);
  assert.deepEqual(sharedNoBasicStatus, sharedBasicStatus, "public status does not depend on whether Yue Jin has a Basic card");
  for (const { data } of noBasicViews) {
    assert.deepEqual(derivePublicActivityStatus(data), sharedNoBasicStatus, "all independent viewers receive the same public status");
    assert.equal(data.timeline.some((event) => event.type === "message" && /Dauntless|may use/i.test(event.message)), false);
    if (data.meId === noBasicSetup.yue.id) {
      assert.equal(data.currentAction.kind, "trigger");
      assert.equal(data.currentAction.actorId, noBasicSetup.yue.id);
      assert.deepEqual(data.currentAction.triggerOptions, [], "no Basic card means the private window offers only Pass");
      assert.ok(data.currentAction.legalActions.includes("decline_trigger"));
      assert.match(data.currentAction.reason, /Pass to continue/);
      continue;
    }
    assert.equal(data.phase, "response");
    assert.equal(data.actionPlayerId, null);
    assert.equal(data.currentAction.actorId, null);
    assert.equal(data.currentAction.kind, "none");
    assert.equal(data.currentAction.reason, "Resolving…");
    assert.deepEqual(data.currentAction.legalActions, []);
    assert.equal(data.pending, null);
    assert.equal(data.responseCountdownVisibleAt, 0);
    assert.equal(data.actionRevision.includes(noBasicSetup.yue.id), false);
    assert.equal(data.myHand.some((held) => held.id === "drawtwo-dauntless-privacy-no-basic"), false);
    const publicProjection = JSON.stringify({
      currentAction: data.currentAction, actionPlayerId: data.actionPlayerId, actionReason: data.actionReason,
      pending: data.pending, responseCountdownVisibleAt: data.responseCountdownVisibleAt, actionRevision: data.actionRevision,
      presentationV2: data.presentationV2, presentationSnapshot: data.presentationSnapshot, timeline: data.timeline,
    });
    assert.equal(publicProjection.includes(noBasicSetup.yue.id), false);
    assert.equal(publicProjection.includes("drawtwo-dauntless-privacy-no-basic"), false);
  }
  const publicMessages = (data) => data.timeline.filter((event) => event.type === "message").map((event) => event.message);
  assert.ok(basicViews.every(({ data }) => JSON.stringify(publicMessages(data)) === JSON.stringify(publicMessages(basicViews[0].data))), "the public timeline text is identical across the one-Basic views");
  assert.ok(noBasicViews.every(({ data }) => JSON.stringify(publicMessages(data)) === JSON.stringify(publicMessages(noBasicViews[0].data))), "the public timeline text is identical across the zero-Basic views");
  assert.deepEqual(publicMessages(basicViews[0].data), publicMessages(noBasicViews[0].data), "zero and one Basic-card windows have the same shared timeline copy");
  const passed = await requestAndSettle("decline_trigger", { code: withoutBasic.code, token: withoutBasic.members[1].token });
  assert.equal(passed.status, 200, JSON.stringify(passed.data));
  assert.equal(passed.data.room.phase, "draw", "private Pass advances the turn-end event once");
});
