import test from "node:test";
import { composePresentationSnapshot } from "../../game/presentation-snapshot.ts";
import {
  assert, card, createHumanGame, createTestGame, discardIds, query, quote, request, requestAndSettle, roomCardCount,
  setDeck, setEquipment, setHand, setTurn, sql, state,
} from "./test-support.mjs";

function configureLust(game, { firstHero = "guan-yu", secondHero = "cao-cao", firstHand = [], secondHand = [], cost = card("Peach", "lust-cost") } = {}) {
  const [diao, first, second, fourth] = game.room.players;
  sql(`UPDATE players SET hero='diao-chan', hp=3, max_hp=3 WHERE id=${quote(diao.id)}`);
  sql(`UPDATE players SET hero=${quote(firstHero)}, hp=4, max_hp=4, alive=1 WHERE id=${quote(first.id)}`);
  sql(`UPDATE players SET hero=${quote(secondHero)}, hp=4, max_hp=4, alive=1 WHERE id=${quote(second.id)}`);
  sql(`UPDATE players SET hero='sun-shangxiang', hp=3, max_hp=3, alive=1 WHERE id=${quote(fourth.id)}`);
  setHand(diao.id, cost ? [cost] : [], 3, 3);
  setHand(first.id, firstHand, 4, 4);
  setHand(second.id, secondHand, 4, 4);
  setHand(fourth.id, [], 3, 3);
  for (const player of game.room.players) setEquipment(player.id, {});
  setTurn(game.code, diao.seat, "play");
  return { diao, first, second, fourth, cost };
}

test("Lust offers ordered male Duel targets, accepts one Hand cost, bypasses Negation, and sources failure damage from the other duelist", async () => {
  const game = await createHumanGame();
  const setup = configureLust(game);
  const hiddenCard = card("Dodge", "lust-private-unspent-card");
  setHand(setup.diao.id, [setup.cost, hiddenCard], 3, 3);
  const opened = (await state(game.code, game.members[0].token)).data;
  const option = opened.currentAction.triggerOptions.find((entry) => entry.effectId === "diao_chan_lust");
  assert.ok(option, JSON.stringify(opened));
  assert.deepEqual(option.selection.targetIds, [setup.first.id, setup.second.id]);
  assert.equal(option.selection.targetMin, 2);
  assert.equal(option.selection.targetMax, 2);
  assert.deepEqual(option.selection.eligibleCardIds, [setup.cost.id, hiddenCard.id],
    "the active actor can legally pay with either Hand card; only the committed cost is publicly proved");

  const started = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_lust", cardIds: [setup.cost.id], targetIds: [setup.first.id, setup.second.id], preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const lustActivation = started.data.room.timeline.filter((event) => event.publicDiaoChanNotice?.notice === "ACTIVATION");
  assert.equal(lustActivation.length, 1, JSON.stringify(started.data.room.timeline));
  const activationEvent = lustActivation[0];
  const lustCostEvent = started.data.room.timeline.find((event) => event.type === "cards" && event.cards.some((item) => item.id === setup.cost.id));
  assert.deepEqual(lustCostEvent.publicCardEffects, [{
    semantics: "PROVEN", eventId: lustCostEvent.id, activationEventId: activationEvent.id,
    effectId: "diao_chan_lust", effectClass: "COST",
    activationOwnerId: setup.diao.id,
    materials: [{ cardId: setup.cost.id, ownerId: setup.diao.id, fromZone: "HAND", toZone: "DISCARD" }],
    targetIds: [setup.first.id, setup.second.id],
    outcome: "DUEL_DECLARED",
  }], "the public proof identifies only the committed physical cost and its true payer");
  assert.equal(activationEvent.publicDiaoChanNotice.costEventId, lustCostEvent.id,
    "the activation names its exact committed public cost event");
  const projectedLustCost = started.data.room.presentationSnapshot.publicCardEffects.find((effect) => effect.eventId === lustCostEvent.id);
  assert.deepEqual(projectedLustCost.cards, [setup.cost]);
  assert.deepEqual(projectedLustCost.materials, lustCostEvent.publicCardEffects[0].materials);
  assert.equal(projectedLustCost.activationEventId, activationEvent.id);
  const sanitizedSnapshot = composePresentationSnapshot({
    presentationV2: {
      ...started.data.room.presentationV2,
      publicCardEffects: started.data.room.presentationV2.publicCardEffects.map((effect) => ({ ...effect, privateDebugCardId: hiddenCard.id })),
    },
    currentAction: started.data.room.currentAction,
    actionRevision: started.data.room.actionRevision,
    viewerId: setup.diao.id,
  });
  assert.equal(JSON.stringify(sanitizedSnapshot.publicCardEffects).includes(hiddenCard.id), false,
    "snapshot composition copies only the approved public proof schema");
  const publicObserver = (await state(game.code, game.members[3].token)).data;
  assert.equal(JSON.stringify(publicObserver.presentationSnapshot.publicCardEffects).includes(hiddenCard.id), false,
    "unspent private Hand cards never enter the public cost proof");
  assert.deepEqual(publicObserver.presentationSnapshot.publicCardEffects, started.data.room.presentationSnapshot.publicCardEffects);
  assert.deepEqual(activationEvent.publicDiaoChanNotice, {
    semantics: "PROVEN", effectId: "diao_chan_lust", notice: "ACTIVATION", sourceId: setup.diao.id,
    firstParticipantId: setup.first.id, secondParticipantId: setup.second.id, firstActorId: setup.first.id,
    costEventId: lustCostEvent.id,
  });
  const projectedActivation = started.data.room.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "ACTIVATION");
  assert.equal(started.data.room.presentationSnapshot.diaoChanSkillNotices.filter((notice) => notice.notice === "ACTIVATION").length, 1);
  assert.equal(projectedActivation.costEventId, lustCostEvent.id);
  const firstView = (await state(game.code, game.members[1].token)).data;
  assert.equal(firstView.currentAction.actorId, setup.first.id);
  assert.equal(firstView.currentAction.requirement, "attack");
  assert.equal(firstView.currentAction.options.some((entry) => entry.providerId === "card"), false);
  assert.equal(started.data.room.pendingNegation, null);
  assert.equal(started.data.room.pendingDuel.damageCards.length, 0);
  assert.equal(started.data.room.pendingDuel.resumePlayerId, setup.diao.id);
  const duelRoot = started.data.room.causalEnvelope;
  assert.ok(duelRoot, "the real Duel root envelope is persisted at the first response boundary");
  const duelPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(duelPending.causal.interactionId, duelRoot.interactionId);
  assert.equal(duelPending.causal.frameId, duelRoot.activeFrameId);
  const duelViewer = (await state(game.code, game.members[2].token)).data;
  assert.equal(duelViewer.causalEnvelope.interactionId, duelRoot.interactionId);
  assert.equal(duelViewer.causalEnvelope.checkpoint.checkpointId, duelRoot.checkpoint.checkpointId);
  assert.equal(JSON.stringify(started.data.room.log).includes("stratagem_used"), false);
  assert.equal(JSON.stringify(started.data.room.log).includes("Cultivation"), false);
  assert.equal(discardIds(game.code).includes(setup.cost.id), true);
  assert.equal(roomCardCount(game.code, setup.cost.id), 1);

  const firstDeclines = await requestAndSettle("decline_response", { code: game.code, token: game.members[1].token, preserveResponse: true });
  assert.equal(firstDeclines.status, 200, JSON.stringify(firstDeclines.data));
  if (firstDeclines.data.room.causalEnvelope) {
    assert.equal(firstDeclines.data.room.causalEnvelope.interactionId, duelRoot.interactionId, "Duel participant progression stays in one Interaction");
    assert.equal(firstDeclines.data.room.causalEnvelope.frames.length, 1, "Duel response Attack does not create a child Frame");
  }
  const finished = firstDeclines;
  assert.equal(finished.data.room.players.find((player) => player.id === setup.first.id).hp, 3);
  assert.equal(finished.data.room.players.find((player) => player.id === setup.second.id).hp, 4);
  assert.equal(finished.data.room.players.find((player) => player.id === setup.diao.id).hp, 3);
  assert.ok(finished.data.room.log.some((entry) => entry.includes(`${setup.second.name}`) && entry.includes(`${setup.first.name}`)), JSON.stringify(finished.data.room.log));
  const lustResults = finished.data.room.presentationSnapshot.diaoChanSkillNotices.filter((notice) => notice.notice === "DUEL_RESULT");
  assert.equal(lustResults.length, 1, JSON.stringify(finished.data.room.presentationSnapshot.diaoChanSkillNotices));
  assert.deepEqual(lustResults[0], {
    semantics: "PROVEN", effectId: "diao_chan_lust", notice: "DUEL_RESULT", eventId: lustResults[0].eventId,
    rootEventId: lustActivation[0].id, sourceId: setup.diao.id, firstParticipantId: setup.first.id,
    secondParticipantId: setup.second.id, firstActorId: setup.first.id, failedPlayerId: setup.first.id,
    damageSourceId: setup.second.id, damageAmount: 1, outcome: "DAMAGE_APPLIED",
    interactionId: started.data.room.presentationSnapshot.lustDuelExchange.interactionId,
    rootFrameId: started.data.room.presentationSnapshot.lustDuelExchange.rootFrameId,
    responseCount: 0, settledAt: lustResults[0].settledAt,
  });
  const settledExchange = finished.data.room.presentationSnapshot.lustDuelExchange;
  assert.equal(settledExchange.responseCount, 0);
  assert.equal(settledExchange.settlement.failedPlayerId, setup.first.id);
  assert.equal(settledExchange.settlement.damageSourceId, setup.second.id);
  const otherViewer = (await state(game.code, game.members[3].token)).data;
  assert.deepEqual(otherViewer.presentationSnapshot.diaoChanSkillNotices, finished.data.room.presentationSnapshot.diaoChanSkillNotices);
  const normalizeSettlementWindow = (exchange) => {
    const normalized = structuredClone(exchange);
    delete normalized.settlement.readRemainingMs;
    return normalized;
  };
  assert.deepEqual(normalizeSettlementWindow(otherViewer.presentationSnapshot.lustDuelExchange), normalizeSettlementWindow(settledExchange));
  assert.equal(finished.data.room.phase, "play");
  assert.equal(finished.data.room.causalEnvelope, null, "the settled Duel root clears after the exchange");
  assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(game.code)}`)).lustUsed, true);
});

test("Lust accepts owned Equipment, rejects stale or duplicate selections, and resets on the next Play Phase", async () => {
  const game = await createHumanGame();
  const equipmentCost = card("GreenDragonBlade", "lust-equipment-cost");
  const setup = configureLust(game, { cost: null });
  setEquipment(setup.diao.id, { weapon: equipmentCost });
  const opened = (await state(game.code, game.members[0].token)).data;
  const option = opened.currentAction.triggerOptions.find((entry) => entry.effectId === "diao_chan_lust");
  assert.deepEqual(option.selection.eligibleCardIds, [equipmentCost.id]);

  const invalid = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_lust", cardIds: ["foreign-card"], targetIds: [setup.first.id, setup.first.id] });
  assert.equal(invalid.status, 409);
  assert.equal(discardIds(game.code).includes(equipmentCost.id), false);
  assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(game.code)}`)).lustUsed, undefined);

  const used = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_lust", cardIds: [equipmentCost.id], targetIds: [setup.second.id, setup.first.id], preserveResponse: true });
  assert.equal(used.status, 200, JSON.stringify(used.data));
  assert.equal(used.data.room.presentationSnapshot.diaoChanSkillNotices[0].firstActorId, setup.second.id);
  assert.equal(used.data.room.currentAction.actorId, setup.second.id);
  assert.equal(used.data.room.players.find((player) => player.id === setup.diao.id).equipmentCards.length, 0);
  assert.equal(discardIds(game.code).includes(equipmentCost.id), true);
  assert.equal(roomCardCount(game.code, equipmentCost.id), 1);
  await requestAndSettle("decline_response", { code: game.code, token: game.members[2].token, preserveResponse: true });

  const replay = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_lust", cardIds: [equipmentCost.id], targetIds: [setup.first.id, setup.second.id] });
  assert.equal(replay.status, 409);
  const next = await requestAndSettle("end_turn", { code: game.code, token: game.members[0].token });
  if (next.status !== 200) assert.fail(JSON.stringify(next.data));
  if (next.data.room.currentAction?.triggerOptions?.some((entry) => entry.effectId === "diao_chan_beauty_outshining_moon")) {
    assert.equal((await requestAndSettle("decline_trigger", { code: game.code, token: game.members[0].token })).status, 200);
  }
  for (const member of game.members.slice(1)) {
    assert.equal((await requestAndSettle("draw", { code: game.code, token: member.token })).status, 200);
    assert.equal((await requestAndSettle("end_turn", { code: game.code, token: member.token })).status, 200);
  }
  assert.equal((await requestAndSettle("draw", { code: game.code, token: game.members[0].token })).status, 200);
  assert.equal((await state(game.code, game.members[0].token)).data.currentAction.triggerOptions.some((entry) => entry.effectId === "diao_chan_lust"), true);
});

test("Lust activation proof stays bound through several real Duel Attack rounds", async () => {
  const game = await createHumanGame();
  const firstAttacks = [card("Attack", "lust-round-one"), card("Attack", "lust-round-three")];
  const secondAttack = card("Attack", "lust-round-two");
  const setup = configureLust(game, { firstHand: firstAttacks, secondHand: [secondAttack] });
  const started = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_lust", cardIds: [setup.cost.id], targetIds: [setup.first.id, setup.second.id], preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const root = started.data.room.timeline.find((event) => event.publicDiaoChanNotice?.notice === "ACTIVATION");
  assert.ok(root);
  const paidCost = started.data.room.timeline.find((event) => event.type === "cards" && event.cards.some((item) => item.id === setup.cost.id));
  const initialExchange = started.data.room.presentationSnapshot.lustDuelExchange;
  assert.equal(initialExchange.semantics, "PROVEN");
  assert.equal(initialExchange.root.activationEventId, root.id);
  assert.equal(initialExchange.root.costEventId, paidCost.id);
  assert.equal(initialExchange.root.costCardId, setup.cost.id);
  assert.equal(initialExchange.root.ownerId, setup.diao.id);
  assert.equal(initialExchange.root.firstParticipantId, setup.first.id);
  assert.equal(initialExchange.root.secondParticipantId, setup.second.id);
  assert.equal(initialExchange.root.firstActorId, setup.first.id);
  assert.equal(initialExchange.responseCount, 0);
  assert.deepEqual(initialExchange.responses, []);
  const rounds = [
    [game.members[1], setup.first, firstAttacks[0], setup.second.id],
    [game.members[2], setup.second, secondAttack, setup.first.id],
    [game.members[1], setup.first, firstAttacks[1], setup.second.id],
  ];
  const responseEventIds = [];
  for (const [index, [member, actor, attack, nextActorId]] of rounds.entries()) {
    const accepted = await requestAndSettle("respond", { code: game.code, token: member.token, providerId: "card", cardId: attack.id, preserveResponse: true });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
    assert.equal(accepted.data.room.currentAction.actorId, nextActorId);
    const exchange = accepted.data.room.presentationSnapshot.lustDuelExchange;
    assert.equal(exchange.semantics, "PROVEN");
    assert.equal(exchange.responseCount, index + 1);
    assert.equal(exchange.responses.length, index + 1);
    const latest = exchange.responses.at(-1);
    assert.equal(latest.relation, "LUST_DUEL_EXCHANGE");
    assert.equal(latest.activationEventId, root.id);
    assert.equal(latest.costEventId, paidCost.id);
    assert.equal(latest.ordinal, index + 1);
    assert.equal(latest.sourceId, actor.id);
    assert.equal(latest.decisionActorId, actor.id);
    assert.equal(latest.targetId, actor.id === setup.first.id ? setup.second.id : setup.first.id);
    assert.equal(latest.responseActorId, actor.id);
    assert.deepEqual(latest.responseCardIds, [attack.id]);
    assert.equal(latest.responseEventId, accepted.data.room.timeline.find((event) => event.lustDuelAttackResponse?.ordinal === index + 1)?.id);
    responseEventIds.push(latest.responseEventId);
    const observer = (await state(game.code, game.members[3].token)).data;
    assert.deepEqual(observer.presentationSnapshot.lustDuelExchange, exchange,
      "every public viewer receives the same generated-Duel event proof without hidden Hand identities");
    assert.equal(JSON.stringify(observer.presentationSnapshot.lustDuelExchange).includes("lust-private"), false);
    const forged = composePresentationSnapshot({
      presentationV2: {
        ...accepted.data.room.presentationV2,
        lustDuelExchange: { ...exchange, responses: exchange.responses.map((response, responseIndex) => responseIndex === index ? { ...response, sourceId: setup.diao.id } : response) },
      },
      currentAction: accepted.data.room.currentAction,
      actionRevision: accepted.data.room.actionRevision,
      viewerId: setup.diao.id,
    });
    assert.equal(forged.lustDuelExchange, null, "forged actor identity fails closed in the snapshot projection");
  }
  const failed = await requestAndSettle("decline_response", { code: game.code, token: game.members[2].token, preserveResponse: true });
  assert.equal(failed.status, 200, JSON.stringify(failed.data));
  const result = failed.data.room.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "DUEL_RESULT");
  assert.ok(result, JSON.stringify(failed.data.room.presentationSnapshot.diaoChanSkillNotices));
  assert.deepEqual(result, {
    semantics: "PROVEN", effectId: "diao_chan_lust", notice: "DUEL_RESULT", eventId: result.eventId,
    rootEventId: root.id, sourceId: setup.diao.id, firstParticipantId: setup.first.id,
    secondParticipantId: setup.second.id, firstActorId: setup.first.id, failedPlayerId: setup.second.id,
    damageSourceId: setup.first.id, damageAmount: 1, outcome: "DAMAGE_APPLIED",
    interactionId: initialExchange.interactionId, rootFrameId: initialExchange.rootFrameId,
    responseCount: 3, settledAt: result.settledAt,
  });
  const settledExchange = failed.data.room.presentationSnapshot.lustDuelExchange;
  assert.equal(settledExchange.semantics, "PROVEN");
  assert.equal(settledExchange.interactionId, initialExchange.interactionId);
  assert.equal(settledExchange.rootFrameId, initialExchange.rootFrameId);
  assert.equal(settledExchange.currentParticipantId, null);
  assert.equal(settledExchange.decisionActorId, null);
  assert.equal(settledExchange.responseCount, 3);
  assert.deepEqual(settledExchange.responses.map((response) => response.responseEventId), responseEventIds);
  const stableSettlement = { ...settledExchange.settlement };
  delete stableSettlement.readRemainingMs;
  assert.deepEqual(stableSettlement, {
    eventId: result.eventId, failedPlayerId: setup.second.id, damageSourceId: setup.first.id,
    damageAmount: 1, outcome: "DAMAGE_APPLIED", settledAt: result.settledAt,
  });
  assert.ok(settledExchange.settlement.readRemainingMs > 0 && settledExchange.settlement.readRemainingMs <= 2000);
  assert.equal(failed.data.room.players.find((player) => player.id === setup.second.id).hp, 3);
});

test("Lust uses generic Duel target legality, including Empty Fortress, and preserves Lü Bu's Unrivaled count", async () => {
  const fortress = await createHumanGame();
  const fortressSetup = configureLust(fortress, { firstHero: "zhuge-liang", secondHero: "zhao-yun" });
  setHand(fortressSetup.first.id, [], 4, 4);
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(fortressSetup.fourth.id)}`);
  setHand(fortressSetup.fourth.id, [], 4, 4);
  const fortressView = (await state(fortress.code, fortress.members[0].token)).data;
  const fortressOption = fortressView.currentAction.triggerOptions.find((entry) => entry.effectId === "diao_chan_lust");
  assert.ok(fortressOption, JSON.stringify(fortressView));
  assert.equal(fortressOption.selection.targetIds.includes(fortressSetup.first.id), false);
  assert.equal(fortressOption.selection.targetIds.includes(fortressSetup.second.id), true);

  const unrivaled = await createHumanGame();
  const setup = configureLust(unrivaled, { firstHero: "zhao-yun", secondHero: "lü-bu" });
  const started = await requestAndSettle("trigger", { code: unrivaled.code, token: unrivaled.members[0].token, providerId: "diao_chan_lust", cardIds: [setup.cost.id], targetIds: [setup.first.id, setup.second.id], preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  assert.equal(started.data.room.pendingDuel.wushuangPlayerId, setup.second.id);
  assert.equal(started.data.room.pendingDuel.requiredAttackCount, 2);
});

test("Lust enters canonical Attack conversion providers for Guan Yu, Zhao Yun, and Serpent Spear", async () => {
  const cases = [
    { hero: "guan-yu", providerId: "guan_yu_red_card_attack", hand: [{ ...card("Peach", "lust-guan-red"), suit: "♥" }], selection: { cardId: "peach-lust-guan-red" } },
    { hero: "zhao-yun", providerId: "zhao_yun_dodge_as_attack", hand: [card("Dodge", "lust-zhao-dodge")], selection: { cardId: "dodge-lust-zhao-dodge" } },
    { hero: "guan-yu", providerId: "serpent_spear_attack", hand: [card("Peach", "lust-spear-a"), card("Dodge", "lust-spear-b")], equipment: { weapon: card("SerpentSpear", "lust-spear") }, selection: { cardIds: ["peach-lust-spear-a", "dodge-lust-spear-b"] } },
  ];
  for (const scenario of cases) {
    const game = await createHumanGame();
    const setup = configureLust(game, { firstHero: scenario.hero, firstHand: scenario.hand });
    if (scenario.equipment) setEquipment(setup.first.id, scenario.equipment);
    const started = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_lust", cardIds: [setup.cost.id], targetIds: [setup.first.id, setup.second.id], preserveResponse: true });
    assert.equal(started.status, 200, JSON.stringify(started.data));
    const view = (await state(game.code, game.members[1].token)).data;
    assert.ok(view.currentAction.options.some((entry) => entry.providerId === scenario.providerId), `${scenario.providerId}: ${JSON.stringify(view)}`);
    const answered = await requestAndSettle("respond", { code: game.code, token: game.members[1].token, providerId: scenario.providerId, ...scenario.selection });
    assert.equal(answered.status, 200, JSON.stringify(answered.data));
    assert.equal(answered.data.room.players.find((player) => player.id === setup.second.id).hp, 3);
    const materialId = scenario.selection.cardId ?? scenario.selection.cardIds[0];
    const conversionEvent = answered.data.room.timeline.find((event) => (event.type === "card" && event.card?.id === materialId)
      || event.type === "cards" && event.cards.some((item) => item.id === materialId));
    const conversion = conversionEvent.publicCardEffects?.find((proof) => proof.effectId === scenario.providerId);
    assert.ok(conversion, `${scenario.providerId} exposes proof for the real material event`);
    assert.equal(conversion.activationOwnerId, setup.first.id);
    assert.equal(conversion.resultingCardKind, "Attack");
    assert.deepEqual(conversion.materials.map((entry) => entry.cardId), Array.isArray(scenario.selection.cardIds) ? scenario.selection.cardIds : [scenario.selection.cardId]);
    for (const held of scenario.hand) assert.equal(roomCardCount(game.code, held.id), 1);
  }
});

test("Lust Duel uses Lü Bu's semantic Attack count across ordinary and converted providers", async () => {
  const scenarios = [
    { hero: "guan-yu", provider: "guan_yu_red_card_attack", firstHand: [{ ...card("Peach", "wushuang-lust-guan-red"), suit: "♥" }, card("Attack", "wushuang-lust-guan-ordinary")], firstSelection: { cardId: "peach-wushuang-lust-guan-red" } },
    { hero: "zhao-yun", provider: "zhao_yun_dodge_as_attack", firstHand: [card("Dodge", "wushuang-lust-zhao-conversion"), card("Attack", "wushuang-lust-zhao-ordinary")], firstSelection: { cardId: "dodge-wushuang-lust-zhao-conversion" } },
    { hero: "guan-yu", provider: "serpent_spear_attack", firstHand: [card("Peach", "wushuang-lust-spear-a"), card("Dodge", "wushuang-lust-spear-b"), card("Attack", "wushuang-lust-spear-ordinary")], equipment: { weapon: card("SerpentSpear", "wushuang-lust-spear") }, firstSelection: { cardIds: ["peach-wushuang-lust-spear-a", "dodge-wushuang-lust-spear-b"] } },
  ];
  for (const scenario of scenarios) {
    const game = await createHumanGame(); const setup = configureLust(game, { firstHero: scenario.hero, secondHero: "lü-bu", firstHand: scenario.firstHand }); if (scenario.equipment) setEquipment(setup.first.id, scenario.equipment);
    const started = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_lust", cardIds: [setup.cost.id], targetIds: [setup.first.id, setup.second.id], preserveResponse: true }); assert.equal(started.status, 200, JSON.stringify(started.data));
    const first = await requestAndSettle("respond", { code: game.code, token: game.members[1].token, providerId: scenario.provider, ...scenario.firstSelection, preserveResponse: true }); assert.equal(first.status, 200, JSON.stringify(first.data));
    const pending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`)); assert.equal(pending.requirement.count, 1); assert.equal(pending.actorId, setup.first.id); assert.equal(pending.continuation.kind, "duel");
    const secondCard = scenario.firstHand.at(-1); const second = await requestAndSettle("respond", { code: game.code, token: game.members[1].token, providerId: "card", cardId: secondCard.id, preserveResponse: true }); assert.equal(second.status, 200, JSON.stringify(second.data));
    const next = await state(game.code, game.members[2].token); assert.equal(next.data.currentAction.actorId, setup.second.id); assert.equal((await requestAndSettle("decline_response", { code: game.code, token: game.members[2].token })).status, 200);
    for (const held of scenario.firstHand) assert.equal(roomCardCount(game.code, held.id), 1);
  }
});

test("Beauty Outshining the Moon is an optional private own-turn draw and shares turn_end ordering with Yue Jin", async () => {
  const game = await createHumanGame();
  const [diao, yue, other, fourth] = game.room.players;
  const draw = card("Attack", "beauty-draw");
  const cost = card("Peach", "beauty-yue-cost");
  sql(`UPDATE players SET hero='diao-chan', hp=3, max_hp=3 WHERE id=${quote(diao.id)}`);
  sql(`UPDATE players SET hero='yue-jin', hp=4, max_hp=4 WHERE id=${quote(yue.id)}`);
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(other.id)}`);
  sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(fourth.id)}`);
  setHand(diao.id, [], 3, 3); setHand(yue.id, [cost], 4, 4); setHand(other.id, [], 4, 4); setHand(fourth.id, [], 4, 4);
  for (const player of game.room.players) setEquipment(player.id, {});
  setDeck(game.code, [draw]);
  setTurn(game.code, diao.seat, "play");

  const opened = await requestAndSettle("end_turn", { code: game.code, token: game.members[0].token, preserveResponse: true });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const beauty = (await state(game.code, game.members[0].token)).data;
  assert.equal(beauty.currentAction.actorId, diao.id);
  assert.deepEqual(beauty.currentAction.triggerOptions.map((entry) => entry.effectId), ["diao_chan_beauty_outshining_moon"]);
  assert.equal((await state(game.code, game.members[1].token)).data.currentAction.triggerOptions.some((entry) => entry.effectId === "diao_chan_beauty_outshining_moon"), false);
  const reloaded = await state(game.code, game.members[0].token);
  const accepted = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_beauty_outshining_moon", preserveResponse: true });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const viewerViews = await Promise.all(game.members.map(async (member) => (await state(game.code, member.token)).data));
  assert.equal(viewerViews[0].myHand.some((held) => held.id === draw.id), true, "the owner receives the physical card in Hand");
  const publicBeautyView = viewerViews[1];
  const provenNotice = publicBeautyView.presentationSnapshot.diaoChanSkillNotices;
  assert.deepEqual(provenNotice.map((notice) => notice.notice), ["ACTIVATION", "DRAWN"]);
  assert.equal(provenNotice.find((notice) => notice.notice === "DRAWN").drawCount, 1);
  assert.equal(publicBeautyView.timeline.filter((event) => event.effectNotice === true && event.message.includes("Beauty")).length, 0);
  for (const [index, viewerView] of viewerViews.entries()) {
    assert.deepEqual(viewerView.presentationSnapshot.diaoChanSkillNotices, provenNotice,
      `viewer ${index + 1} receives the same public Beauty proof`);
    assert.equal(viewerView.players.find((player) => player.id === diao.id).handCount, 1,
      `viewer ${index + 1} receives the same public Hand count`);
    if (index > 0) {
      assert.equal(viewerView.myHand.some((held) => held.id === draw.id), false,
        `viewer ${index + 1} does not receive the private draw`);
      assert.equal(JSON.stringify(viewerView).includes(draw.id), false,
        `viewer ${index + 1}'s complete projection omits the drawn card identity`);
    }
  }
  const stale = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_beauty_outshining_moon", context: { actionRevision: reloaded.data.actionRevision, meId: diao.id, phase: "response", pendingKind: "trigger", actorId: diao.id } });
  assert.equal(stale.status, 409);
  assert.equal(roomCardCount(game.code, draw.id), 1);
  const yueWindow = (await state(game.code, game.members[1].token)).data;
  assert.equal(yueWindow.currentAction.triggerOptions.some((entry) => entry.effectId === "yue_jin_dauntless"), true);
  const settled = await requestAndSettle("decline_trigger", { code: game.code, token: game.members[1].token });
  assert.equal(settled.status, 200, JSON.stringify(settled.data));
  assert.equal(settled.data.room.phase, "draw");

  const declined = await createHumanGame();
  const declineDiao = declined.room.players[0];
  sql(`UPDATE players SET hero='diao-chan' WHERE id=${quote(declineDiao.id)}`);
  for (const player of declined.room.players.slice(1)) sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(player.id)}`);
  setHand(declineDiao.id, [], 3, 3); setDeck(declined.code, [card("Attack", "beauty-decline-draw")]); setTurn(declined.code, declineDiao.seat, "play");
  const declinedOpen = await requestAndSettle("end_turn", { code: declined.code, token: declined.members[0].token, preserveResponse: true });
  assert.equal(declinedOpen.status, 200, JSON.stringify(declinedOpen.data));
  const declinedResult = await requestAndSettle("decline_trigger", { code: declined.code, token: declined.members[0].token });
  assert.equal(declinedResult.status, 200, JSON.stringify(declinedResult.data));
  assert.equal((await state(declined.code, declined.members[0].token)).data.myHand.some((held) => held.id === "beauty-decline-draw"), false);
  assert.equal((await state(declined.code, declined.members[1].token)).data.presentationSnapshot.diaoChanSkillNotices.length, 0);
});

test("Beauty draws from a shuffled discard pile and reports an empty-deck outcome truthfully", async () => {
  const shuffled = await createHumanGame();
  const [shuffleDiao, ...shuffleOthers] = shuffled.room.players;
  const shuffledCard = card("Peach", "beauty-shuffled-private-draw", "♥");
  sql(`UPDATE players SET hero='diao-chan', hp=3, max_hp=3 WHERE id=${quote(shuffleDiao.id)}`);
  for (const player of shuffleOthers) sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(player.id)}`);
  for (const player of shuffled.room.players) setHand(player.id, [], player.id === shuffleDiao.id ? 3 : 4, player.id === shuffleDiao.id ? 3 : 4);
  setDeck(shuffled.code, []);
  sql(`UPDATE rooms SET discard_json=${quote(JSON.stringify([shuffledCard]))} WHERE code=${quote(shuffled.code)}`);
  setTurn(shuffled.code, shuffleDiao.seat, "play");

  const opened = await requestAndSettle("end_turn", { code: shuffled.code, token: shuffled.members[0].token, preserveResponse: true });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const accepted = await requestAndSettle("trigger", { code: shuffled.code, token: shuffled.members[0].token, providerId: "diao_chan_beauty_outshining_moon", preserveResponse: true });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const shuffledOwner = (await state(shuffled.code, shuffled.members[0].token)).data;
  assert.equal(shuffledOwner.myHand.some((held) => held.id === shuffledCard.id), true,
    "Beauty refills from the discard pile after the deck is exhausted");
  assert.equal(shuffledOwner.log.some((entry) => entry.includes("The discard pile is shuffled into a new draw deck.")), true);
  const shuffledObservers = await Promise.all(shuffled.members.slice(1).map(async (member) => (await state(shuffled.code, member.token)).data));
  for (const observer of shuffledObservers) {
    assert.deepEqual(observer.presentationSnapshot.diaoChanSkillNotices.map((notice) => notice.notice), ["ACTIVATION", "DRAWN"]);
    assert.equal(JSON.stringify(observer).includes(shuffledCard.id), false);
  }

  const exhausted = await createHumanGame();
  const [emptyDiao, ...emptyOthers] = exhausted.room.players;
  sql(`UPDATE players SET hero='diao-chan', hp=3, max_hp=3 WHERE id=${quote(emptyDiao.id)}`);
  for (const player of emptyOthers) sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(player.id)}`);
  for (const player of exhausted.room.players) setHand(player.id, [], player.id === emptyDiao.id ? 3 : 4, player.id === emptyDiao.id ? 3 : 4);
  setDeck(exhausted.code, []);
  setTurn(exhausted.code, emptyDiao.seat, "play");

  const emptyOpened = await requestAndSettle("end_turn", { code: exhausted.code, token: exhausted.members[0].token, preserveResponse: true });
  assert.equal(emptyOpened.status, 200, JSON.stringify(emptyOpened.data));
  const emptyAccepted = await requestAndSettle("trigger", { code: exhausted.code, token: exhausted.members[0].token, providerId: "diao_chan_beauty_outshining_moon", preserveResponse: true });
  assert.equal(emptyAccepted.status, 200, JSON.stringify(emptyAccepted.data));
  const emptyOwner = (await state(exhausted.code, exhausted.members[0].token)).data;
  assert.deepEqual(emptyOwner.presentationSnapshot.diaoChanSkillNotices.map((notice) => notice.notice), ["ACTIVATION"]);
  assert.equal(JSON.stringify(emptyOwner).includes("used Beauty and drew 1 card"), false);
  for (const member of exhausted.members.slice(1)) {
    const observer = (await state(exhausted.code, member.token)).data;
    assert.deepEqual(observer.presentationSnapshot.diaoChanSkillNotices.map((notice) => notice.notice), ["ACTIVATION"]);
    assert.equal(JSON.stringify(observer).includes("used Beauty and drew 1 card"), false);
  }
});

test("Quick Test keeps Lust projected to the acting controlled Diao Chan seat", async () => {
  const quick = await createTestGame();
  const { token, room } = quick.data;
  const code = room.code;
  const [diao, first, second, fourth] = room.players;
  sql(`UPDATE players SET hero='diao-chan', hp=3, max_hp=3 WHERE id=${quote(diao.id)}`);
  sql(`UPDATE players SET hero='guan-yu', hp=4, max_hp=4 WHERE id=${quote(first.id)}`);
  sql(`UPDATE players SET hero='cao-cao', hp=4, max_hp=4 WHERE id=${quote(second.id)}`);
  sql(`UPDATE players SET hero='sun-shangxiang', hp=3, max_hp=3 WHERE id=${quote(fourth.id)}`);
  setHand(diao.id, [card("Peach", "quick-lust-cost")], 3, 3);
  setHand(first.id, [], 4, 4); setHand(second.id, [], 4, 4); setHand(fourth.id, [], 3, 3);
  for (const player of room.players) setEquipment(player.id, {});
  setTurn(code, diao.seat, "play");
  const view = (await state(code, token)).data;
  assert.equal(view.meId, diao.id);
  assert.equal(view.currentAction.triggerOptions.some((entry) => entry.effectId === "diao_chan_lust"), true);
});
