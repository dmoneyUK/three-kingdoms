import test from "node:test";
import {
  assert, card, createHumanGame, query, quote, request, setDeck, setEquipment, setHand, setTurn, sql, state,
} from "./test-support.mjs";

async function openAttack({ judgement, equipment = {}, targetHand = [card("Dodge", "target-dodge")], targetHero = "zhao-yun" } = {}) {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const [sourceMember, targetMember] = game.members;
  const attack = card("Attack", "ma-chao-attack");
  sql(`UPDATE players SET hero='ma-chao', hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero=${quote(targetHero)}, hp=4, max_hp=4 WHERE id=${quote(target.id)}`);
  setHand(source.id, [attack], 4, 4);
  setHand(target.id, targetHand, 4, 4);
  setEquipment(source.id, equipment);
  setDeck(game.code, [judgement, card("Attack", "after-judgement-a"), card("Dodge", "after-judgement-b")]);
  setTurn(game.code, source.seat, "play");
  const log = JSON.parse(query(`SELECT log_json FROM rooms WHERE code=${quote(game.code)}`));
  log.push(`@card:${JSON.stringify({ id: "private-ma-chao-attack-draw", player: source.name, target: source.name, card: attack, action: "draw", presentation: false, privateToPlayerId: source.id, drawPlayerId: source.id })}`);
  sql(`UPDATE rooms SET log_json=${quote(JSON.stringify(log))} WHERE code=${quote(game.code)}`);
  const played = await request("play_card", { code: game.code, token: sourceMember.token, cardId: "attack-ma-chao-attack", targetId: target.id });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  return { game, source, target, sourceMember, targetMember, attack, targetHand };
}

test("Cavalry is an optional source-owned attack_targeted trigger and Skip preserves Dodge", async () => {
  const opened = await openAttack({ judgement: { ...card("Attack", "cavalry-black"), suit: "♣", rank: "7" } });
  const trigger = (await state(opened.game.code, opened.sourceMember.token)).data;
  assert.ok(trigger.causalEnvelope, "Attack-targeted entry retains the real Attack root envelope");
  const persisted = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(opened.game.code)}`));
  const activeFrame = trigger.causalEnvelope.frames.find((frame) => frame.frameId === trigger.causalEnvelope.activeFrameId);
  const publicAttackEvents = trigger.timeline.filter((event) => event.type === "card" && event.action === "play" && event.presentation !== false && event.card?.id === opened.attack.id);
  assert.equal(publicAttackEvents.length, 1, "the physical Attack has one exact public play event despite its private draw history");
  const attackRootEvent = publicAttackEvents[0];
  assert.equal(persisted.kind, "trigger");
  assert.equal(persisted.event, "attack_targeted");
  assert.equal(persisted.actorId, opened.source.id);
  assert.equal(persisted.causal.interactionId, trigger.causalEnvelope.interactionId);
  assert.equal(persisted.causal.frameId, trigger.causalEnvelope.activeFrameId);
  assert.equal(persisted.continuation.kind, "attack_targeted_event");
  assert.equal(persisted.continuation.causal.interactionId, trigger.causalEnvelope.interactionId);
  assert.equal(persisted.continuation.causal.frameId, trigger.causalEnvelope.activeFrameId);
  assert.equal(persisted.continuation.declaration.causal.interactionId, trigger.causalEnvelope.interactionId);
  assert.equal(persisted.continuation.declaration.causal.frameId, trigger.causalEnvelope.activeFrameId);
  assert.equal(persisted.continuation.declaration.sourceId, opened.source.id);
  assert.equal(persisted.continuation.declaration.targetId, opened.target.id);
  assert.equal(persisted.continuation.declaration.rootEventId, attackRootEvent.id,
    "the Attack declaration retains the public play-event identity while Cavalry is pending");
  assert.equal(activeFrame?.stage, "ATTACK_RESPONSE");
  assert.equal(activeFrame?.origin.originSourceId, opened.source.id);
  assert.deepEqual(activeFrame?.origin.originalTargetIds, [opened.target.id]);
  assert.equal(activeFrame?.current.currentSourceId, opened.source.id);
  assert.deepEqual(activeFrame?.current.currentTargetIds, [opened.target.id]);
  assert.equal(activeFrame?.current.resolvingPlayerId, opened.target.id);
  assert.equal(trigger.causalEnvelope.checkpoint.frameId, activeFrame?.frameId);
  assert.equal(trigger.causalEnvelope.checkpoint.stage, activeFrame?.stage);
  const repeated = (await state(opened.game.code, opened.sourceMember.token)).data;
  assert.equal(repeated.causalEnvelope.interactionId, trigger.causalEnvelope.interactionId);
  assert.equal(repeated.causalEnvelope.checkpoint.checkpointId, trigger.causalEnvelope.checkpoint.checkpointId);
  assert.equal(repeated.causalEnvelope.presentationRevision, trigger.causalEnvelope.presentationRevision);
  assert.equal(trigger.currentAction.kind, "trigger", JSON.stringify(trigger));
  assert.equal(trigger.currentAction.actorId, opened.source.id);
  assert.deepEqual(trigger.currentAction.triggerOptions.map((option) => option.effectId), ["ma_chao_cavalry"]);
  assert.equal(trigger.presentationV2.interactionScene?.semantics, "PROVEN", "the source-owned trigger still has a proven public Attack scene");
  assert.equal(trigger.presentationV2.interactionScene?.decisionActorId, opened.source.id);
  assert.equal(trigger.presentationV2.interactionScene?.activeResolverId, opened.target.id);
  assert.deepEqual(trigger.presentationV2.stableBoundary, { kind: "CHOICE", interactionId: trigger.presentationV2.interactionScene?.interactionId, checkpointId: trigger.presentationV2.interactionScene?.checkpointId, presentationRevision: trigger.presentationV2.interactionScene?.presentationRevision, decisionActorId: opened.source.id });
  assert.deepEqual(trigger.presentationSnapshot.identity, { interactionId: trigger.presentationV2.interactionScene?.interactionId, checkpointId: trigger.presentationV2.interactionScene?.checkpointId, presentationRevision: trigger.presentationV2.interactionScene?.presentationRevision });
  assert.deepEqual(trigger.presentationSnapshot.stable, trigger.presentationV2.stableBoundary);
  assert.deepEqual(trigger.presentationSnapshot.interaction, trigger.presentationV2.interactionScene);
  assert.deepEqual(trigger.presentationSnapshot.decision, { actorId: opened.source.id, stage: trigger.presentationV2.interactionScene?.stage });
  const skipped = await request("decline_trigger", { code: opened.game.code, token: opened.sourceMember.token });
  assert.equal(skipped.status, 200, JSON.stringify(skipped.data));
  const dodge = (await state(opened.game.code, opened.targetMember.token)).data;
  assert.equal(dodge.currentAction.kind, "response", JSON.stringify(dodge));
  assert.equal(dodge.currentAction.requirement, "dodge");
  assert.equal(dodge.currentAction.presentation.readyAfterEventId === attackRootEvent.id, false,
    "the response barrier is the trigger-resume message, not the Attack root event");
  assert.equal(dodge.timeline.find((event) => event.id === dodge.currentAction.presentation.readyAfterEventId)?.type, "message");
  assert.equal(dodge.presentationV2.rootAction?.rootEventId, attackRootEvent.id,
    "the response graph is rooted at the original public Attack after the trigger is declined");
  assert.deepEqual(dodge.presentationSnapshot.rootAction, dodge.presentationV2.rootAction);
  const sourceView = (await state(opened.game.code, opened.sourceMember.token)).data;
  assert.deepEqual(sourceView.presentationV2.rootAction, dodge.presentationV2.rootAction,
    "the exact public Attack root is viewer-equal for attacker and defender");
  assert.equal(dodge.timeline.find((event) => event.id === attackRootEvent.id)?.card?.kind, "Attack");
  assert.equal(dodge.presentationV2.interactionScene?.decisionActorId, opened.target.id);
  assert.equal(dodge.presentationV2.interactionScene?.activeResolverId, opened.target.id);
  assert.equal(dodge.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(dodge.presentationSnapshot.decision?.actorId, opened.target.id);
  const dodgeCard = opened.targetHand[0];
  const committedDodge = await request("respond", { code: opened.game.code, token: opened.targetMember.token, providerId: "card", cardId: dodgeCard.id });
  assert.equal(committedDodge.status, 200, JSON.stringify(committedDodge.data));
  const afterDodge = (await state(opened.game.code, opened.sourceMember.token)).data;
  assert.equal(afterDodge.presentationV2.attackDodgeResponses?.[0]?.rootEventId, attackRootEvent.id,
    "the committed Dodge proof remains linked to the same original Attack event");
  const afterDodgeTarget = (await state(opened.game.code, opened.targetMember.token)).data;
  assert.deepEqual(afterDodgeTarget.presentationV2.attackDodgeResponses, afterDodge.presentationV2.attackDodgeResponses,
    "source and target receive the same exact public Attack/Dodge relation");
});

test("Cavalry rejects a stale trigger submission after the window resolves", async () => {
  const opened = await openAttack({ judgement: { ...card("Attack", "cavalry-stale"), suit: "♣", rank: "7" } });
  assert.equal((await request("trigger", { code: opened.game.code, token: opened.sourceMember.token, providerId: "ma_chao_cavalry" })).status, 200);
  const stale = await request("trigger", { code: opened.game.code, token: opened.sourceMember.token, providerId: "ma_chao_cavalry" });
  assert.equal(stale.status, 409, JSON.stringify(stale.data));
});

for (const [label, suit, suppresses] of [["Heart", "♥", true], ["Diamond", "♦", true], ["Club", "♣", false], ["Spade", "♠", false]]) {
  test(`Cavalry ${label} result ${suppresses ? "suppresses" : "allows"} Dodge`, async () => {
    const opened = await openAttack({ judgement: { ...card("Attack", `cavalry-${label.toLowerCase()}`), suit, rank: "7" } });
    const confirmed = await request("trigger", { code: opened.game.code, token: opened.sourceMember.token, providerId: "ma_chao_cavalry" });
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.data));
    const targetView = (await state(opened.game.code, opened.targetMember.token)).data;
    if (suppresses) {
      assert.equal(targetView.players.find((player) => player.id === opened.target.id).hp, 3, JSON.stringify(targetView));
      assert.notEqual(targetView.currentAction?.kind, "response", "red Cavalry must not open Dodge");
    } else {
      assert.equal(targetView.currentAction.kind, "response", JSON.stringify(targetView));
      assert.equal(targetView.currentAction.requirement, "dodge");
    }
  });
}

test("Cavalry uses the shared Judgement replacement continuation", async () => {
  const game = await createHumanGame();
  const [source, target, sima] = game.room.players;
  const [sourceMember, targetMember, simaMember] = game.members;
  sql(`UPDATE players SET hero='ma-chao', hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(target.id)}`);
  sql(`UPDATE players SET hero='simayi', hp=3, max_hp=3 WHERE id=${quote(sima.id)}`);
  setHand(source.id, [card("Attack", "cavalry-replacement-attack")], 4, 4);
  setHand(target.id, [], 4, 4);
  const replacement = { ...card("Dodge", "cavalry-replacement"), suit: "♥", rank: "2" };
  setHand(sima.id, [replacement], 3, 3);
  setDeck(game.code, [{ ...card("Attack", "cavalry-original"), suit: "♠", rank: "9" }]);
  setTurn(game.code, source.seat, "play");
  assert.equal((await request("play_card", { code: game.code, token: sourceMember.token, cardId: "attack-cavalry-replacement-attack", targetId: target.id })).status, 200);
  const attackView = (await state(game.code, sourceMember.token)).data;
  const attackRoot = attackView.causalEnvelope;
  assert.ok(attackRoot, "Cavalry starts from the authoritative Attack root");
  const attackScene = attackView.presentationV2.interactionScene;
  assert.equal(attackScene.semantics, "PROVEN");
  assert.equal(attackScene.stage, "ATTACK_RESPONSE");
  assert.equal(attackScene.continuity.relation, "ROOT_FRAME");
  assert.equal(attackScene.sourceId, source.id);
  assert.deepEqual(attackScene.targetIds, [target.id]);
  assert.equal(attackScene.currentParticipantId, target.id);
  assert.deepEqual(attackScene.participantRoles, {
    sourceId: source.id,
    originalTargetIds: [target.id],
    activeTargetIds: [target.id],
    currentParticipantId: target.id,
    // Cavalry is source-owned, while this ATTACK_RESPONSE frame remains
    // resolved by the target. Both persisted roles are public and distinct.
    decisionActorId: source.id,
    activeResolverId: target.id,
    parentParticipantId: null,
    participantIds: [],
  });
  assert.equal(attackView.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(attackView.presentationV2.stableBoundary.decisionActorId, source.id);
  assert.equal(attackView.presentationSnapshot.decision?.actorId, source.id);
  assert.equal((await request("trigger", { code: game.code, token: sourceMember.token, providerId: "ma_chao_cavalry" })).status, 200);
  const revealed = (await state(game.code, simaMember.token)).data;
  assert.equal(revealed.currentAction.triggerEvent, "judgement_revealed", JSON.stringify(revealed));
  assert.equal(revealed.currentAction.actorId, sima.id);
  assert.equal(revealed.causalEnvelope.interactionId, attackRoot.interactionId);
  assert.equal(revealed.causalEnvelope.activeFrameId, attackRoot.activeFrameId);
  assert.notEqual(revealed.causalEnvelope.checkpoint.checkpointId, attackRoot.checkpoint.checkpointId, "Judgement reveal advances the semantic checkpoint within the Attack Interaction");
  assert.equal(revealed.causalEnvelope.presentationRevision, attackRoot.presentationRevision + 1, "Judgement reveal advances presentationRevision once");
  assert.equal(revealed.causalEnvelope.frames[0].stage, "JUDGEMENT");
  assert.equal(revealed.presentationV2.interactionScene.semantics, "PROVEN");
  assert.equal(revealed.presentationV2.interactionScene.stage, "JUDGEMENT");
  assert.equal(revealed.presentationV2.interactionScene.continuity.relation, "ROOT_FRAME");
  assert.equal(revealed.presentationV2.interactionScene.interactionId, attackScene.interactionId);
  assert.equal(revealed.presentationV2.interactionScene.rootFrameId, attackScene.rootFrameId);
  assert.equal(revealed.presentationV2.interactionScene.activeFrameId, attackScene.activeFrameId);
  assert.equal(revealed.presentationV2.interactionScene.participantRoles.decisionActorId, sima.id);
  assert.equal(revealed.presentationV2.interactionScene.participantRoles.activeResolverId, sima.id);
  assert.equal(revealed.presentationV2.stableBoundary.kind, "CHOICE");
  assert.ok(revealed.currentAction.triggerOptions?.some((option) => option.effectId === "sima_yi_guicai"), "the Judgement actor receives private Guicai controls");
  const revealedOtherViewer = (await state(game.code, targetMember.token)).data;
  assert.deepEqual(revealedOtherViewer.presentationV2.interactionScene, revealed.presentationV2.interactionScene);
  assert.deepEqual(revealedOtherViewer.presentationV2.interactionScene.participantRoles, revealed.presentationV2.interactionScene.participantRoles);
  assert.deepEqual(revealedOtherViewer.presentationV2.stableBoundary, revealed.presentationV2.stableBoundary);
  assert.equal(revealedOtherViewer.currentAction.triggerOptions?.length, 0, "Judgement controls remain private to the acting viewer");
  const revealPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(revealPending.causal.interactionId, attackRoot.interactionId);
  const reloaded = (await state(game.code, simaMember.token)).data;
  assert.equal(reloaded.currentAction.triggerEvent, "judgement_revealed", JSON.stringify(reloaded));
  assert.equal(reloaded.currentAction.actorId, sima.id);
  assert.equal(reloaded.causalEnvelope.interactionId, attackRoot.interactionId);
  assert.equal(reloaded.causalEnvelope.checkpoint.checkpointId, revealed.causalEnvelope.checkpoint.checkpointId);
  assert.equal(reloaded.causalEnvelope.presentationRevision, revealed.causalEnvelope.presentationRevision);
  const replaced = await request("trigger", { code: game.code, token: simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
  const settled = (await state(game.code, targetMember.token)).data;
  assert.equal(settled.players.find((player) => player.id === target.id).hp, 3, JSON.stringify(settled));
  assert.equal(settled.causalEnvelope, null, "the resumed Attack root settles after Cavalry damage");
  assert.equal(settled.presentationV2.interactionScene, null, "no stale Judgement scene remains after Attack settlement");
  assert.notEqual(settled.currentAction?.kind, "response", "a red replacement must suppress Dodge");
});

test("Cavalry keeps Dodge available when Sima Yi replaces the original red Judgement with Black", async () => {
  const game = await createHumanGame();
  const [source, target, sima] = game.room.players;
  const [sourceMember, targetMember, simaMember] = game.members;
  sql(`UPDATE players SET hero='ma-chao', hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(target.id)}`);
  sql(`UPDATE players SET hero='simayi', hp=3, max_hp=3 WHERE id=${quote(sima.id)}`);
  const original = { ...card("Attack", "cavalry-red-original"), suit: "♥", rank: "9" };
  const replacement = { ...card("Dodge", "cavalry-black-replacement"), suit: "♣", rank: "2" };
  setHand(source.id, [card("Attack", "cavalry-red-attack")], 4, 4);
  setHand(target.id, [], 4, 4);
  setHand(sima.id, [replacement], 3, 3);
  setDeck(game.code, [original]);
  setTurn(game.code, source.seat, "play");
  assert.equal((await request("play_card", { code: game.code, token: sourceMember.token, cardId: "attack-cavalry-red-attack", targetId: target.id })).status, 200);
  assert.equal((await request("trigger", { code: game.code, token: sourceMember.token, providerId: "ma_chao_cavalry" })).status, 200);
  const revealed = (await state(game.code, simaMember.token)).data;
  assert.equal(revealed.currentAction.triggerEvent, "judgement_revealed", JSON.stringify(revealed));
  const replaced = await request("trigger", { code: game.code, token: simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
  const dodge = (await state(game.code, targetMember.token)).data;
  assert.equal(dodge.currentAction.kind, "response", JSON.stringify(dodge));
  assert.equal(dodge.currentAction.requirement, "dodge");
  const sourceWaiting = (await state(game.code, sourceMember.token)).data;
  const resumedScene = dodge.presentationV2.interactionScene;
  assert.equal(resumedScene.semantics, "PROVEN");
  assert.equal(resumedScene.stage, "ATTACK_RESPONSE");
  assert.equal(resumedScene.continuity.relation, "ROOT_FRAME");
  assert.equal(resumedScene.interactionId, revealed.presentationV2.interactionScene.interactionId);
  assert.equal(resumedScene.rootFrameId, revealed.presentationV2.interactionScene.rootFrameId);
  assert.equal(resumedScene.activeFrameId, revealed.presentationV2.interactionScene.activeFrameId);
  assert.equal(resumedScene.decisionActorId, target.id);
  assert.deepEqual(resumedScene.participantRoles, { sourceId: source.id, originalTargetIds: [target.id], activeTargetIds: [target.id], currentParticipantId: target.id, decisionActorId: target.id, activeResolverId: target.id, parentParticipantId: null, participantIds: [] });
  assert.deepEqual(sourceWaiting.presentationV2.interactionScene, resumedScene, "Attack -> Judgement public scene is viewer-equivalent after resume");
});

test("Cavalry preserves a virtual Serpent Spear Attack identity", async () => {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const [sourceMember, targetMember] = game.members;
  sql(`UPDATE players SET hero='ma-chao', hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(target.id)}`);
  const materials = [card("Peach", "cavalry-spear-one"), card("Dodge", "cavalry-spear-two")];
  setHand(source.id, materials, 4, 4); setHand(target.id, [], 4, 4);
  setEquipment(source.id, { weapon: card("SerpentSpear", "cavalry-spear") });
  setDeck(game.code, [{ ...card("Attack", "cavalry-spear-judge"), suit: "♦", rank: "5" }]);
  setTurn(game.code, source.seat, "play");
  assert.equal((await request("serpent_spear_attack", { code: game.code, token: sourceMember.token, targetId: target.id, cardIds: materials.map((item) => item.id) })).status, 200);
  const opened = (await state(game.code, sourceMember.token)).data;
  assert.equal(opened.currentAction.actorId, source.id);
  assert.equal((await request("trigger", { code: game.code, token: sourceMember.token, providerId: "ma_chao_cavalry" })).status, 200);
  const settled = (await state(game.code, targetMember.token)).data;
  assert.equal(settled.players.find((player) => player.id === target.id).hp, 3, JSON.stringify(settled));
});

test("Cavalry opens independently for each Sky Piercing Halberd target", async () => {
  const game = await createHumanGame();
  const [source, first, second] = game.room.players;
  const [sourceMember, firstMember, secondMember] = game.members;
  sql(`UPDATE players SET hero='ma-chao', hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  for (const player of [first, second]) sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(player.id)}`);
  const attack = card("Attack", "cavalry-halberd-attack");
  setHand(source.id, [attack], 4, 4); setHand(first.id, [], 4, 4); setHand(second.id, [], 4, 4);
  setEquipment(source.id, { weapon: card("SkyPiercingHalberd", "cavalry-halberd") });
  setDeck(game.code, [
    { ...card("Attack", "cavalry-halberd-red"), suit: "♥", rank: "6" },
    { ...card("Attack", "cavalry-halberd-black"), suit: "♣", rank: "6" },
  ]);
  setTurn(game.code, source.seat, "play");
  assert.equal((await request("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetIds: [first.id, second.id] })).status, 200);
  assert.equal((await request("trigger", { code: game.code, token: sourceMember.token, providerId: "ma_chao_cavalry" })).status, 200);
  const secondWindow = (await state(game.code, sourceMember.token)).data;
  assert.equal(secondWindow.currentAction.kind, "trigger", JSON.stringify(secondWindow));
  assert.equal(secondWindow.currentAction.actorId, source.id, "the second Halberd target gets its own Cavalry window");
  assert.equal((await request("trigger", { code: game.code, token: sourceMember.token, providerId: "ma_chao_cavalry" })).status, 200);
  const secondDodge = (await state(game.code, secondMember.token)).data;
  assert.equal(secondDodge.currentAction.kind, "response", JSON.stringify(secondDodge));
  assert.equal((await request("decline_response", { code: game.code, token: secondMember.token })).status, 200);
  const firstState = (await state(game.code, firstMember.token)).data;
  assert.equal(firstState.players.find((player) => player.id === first.id).hp, 3, JSON.stringify(firstState));
  assert.equal(firstState.players.find((player) => player.id === second.id).hp, 3, JSON.stringify(firstState));
});
