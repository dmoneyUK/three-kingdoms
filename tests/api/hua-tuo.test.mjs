import test from "node:test";
import { derivePublicInteractionNarration } from "../../game/public-activity.ts";
import { assertPublicOutcomeHasH4Owner } from "./public-outcome-h4-assertions.mjs";
import { assert, card, createHumanGame, discardIds, query, quote, request, requestAndSettle, roomCardCount, setHand, setTurn, state, sql } from "./test-support.mjs";

function committedSkillOutcome(view, label) {
  return [...(view.presentationSnapshot?.publicEventFacts ?? []), ...(view.presentationSnapshot?.retainedPublicEventFacts ?? [])]
    .filter((fact) => fact.category === "SKILL_USED" && fact.label === label && fact.committedOutcome)
    .sort((left, right) => left.order - right.order)
    .at(-1);
}

function committedSkillNarration(view, fact) {
  return derivePublicInteractionNarration({
    snapshot: view.presentationSnapshot,
    players: view.players,
    rootEventId: fact.rootEventId,
    interactionId: fact.identity.interactionId,
    rootFrameId: fact.identity.rootFrameId,
    eventId: fact.eventId,
  });
}

test("Prodigal Healer discards exactly one Hand card, heals self or another injured living character, and is once per Play Phase", async () => {
  const game = await createHumanGame();
  const [hua, target, full, dead] = game.room.players;
  const cost = card("Attack", "prodigal-cost", "♠");
  sql(`UPDATE players SET hero='hua-tuo' WHERE id=${quote(hua.id)}`);
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(target.id)}`);
  sql(`UPDATE players SET hero='lady-gan', hp=3, max_hp=3 WHERE id=${quote(full.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=0, max_hp=4, alive=0 WHERE id=${quote(dead.id)}`);
  setHand(hua.id, [cost], 2, 3);
  setHand(target.id, [], 2, 4);
  setHand(full.id, [], 3, 3);
  setHand(dead.id, [], 0, 4);
  sql(`UPDATE players SET alive=0, hp=0 WHERE id=${quote(dead.id)}`);
  setTurn(game.code, hua.seat, "play");

  const opened = (await state(game.code, game.members[0].token)).data;
  const option = opened.currentAction.triggerOptions.find((entry) => entry.effectId === "hua_tuo_prodigal_healer");
  assert.ok(option, JSON.stringify(opened));
  assert.deepEqual(option.selection, { type: "cards", min: 1, max: 1, eligibleCardIds: [cost.id], targetIds: [hua.id, target.id] });

  const used = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "hua_tuo_prodigal_healer", cardIds: [cost.id], targetId: target.id });
  assert.equal(used.status, 200, JSON.stringify(used.data));
  const prodigalEvent = used.data.room.timeline.find((event) => event.type === "cards" && event.cards.some((item) => item.id === cost.id));
  assert.deepEqual(prodigalEvent.publicCardEffects?.[0]?.materials, [{ cardId: cost.id, ownerId: hua.id, fromZone: "HAND", toZone: "DISCARD" }]);
  assert.equal(prodigalEvent.publicCardEffects?.[0]?.targetId, target.id);
  const healed = (await state(game.code, game.members[0].token)).data;
  assert.equal(healed.players.find((player) => player.id === target.id).hp, 3);
  const outcome = committedSkillOutcome(healed, "Prodigal Healer");
  assert.ok(outcome, "the shared public skill result records its committed discard and recovery");
  assertPublicOutcomeHasH4Owner(healed, outcome.eventId);
  assert.deepEqual(outcome.committedOutcome.changes, [
    { kind: "CARD_DISCARDED", playerId: hua.id, amount: 1, fromZone: "HAND", toZone: "DISCARD" },
    { kind: "HP_RECOVERED", playerId: target.id, amount: 1 },
  ]);
  assert.equal(committedSkillNarration(healed, outcome)?.headline,
    `${hua.name} Prodigal Healer: ${hua.name} discarded 1 card; ${target.name} recovered 1 HP.`);
  const observer = (await state(game.code, game.members[1].token)).data;
  assert.deepEqual(committedSkillOutcome(observer, "Prodigal Healer"), outcome,
    "all viewers share the same public counts and committed event identity");
  assertPublicOutcomeHasH4Owner(observer, outcome.eventId);
  assert.equal(JSON.stringify(outcome).includes(cost.id), false, "the aggregate outcome does not add a private card identity");
  assert.equal(healed.myHand.length, 0);
  assert.equal(discardIds(game.code).includes(cost.id), true);
  assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(game.code)}`) || "{}").prodigalHealerUsed, true);
  assert.equal(healed.currentAction.triggerOptions?.some((entry) => entry.effectId === "hua_tuo_prodigal_healer") ?? false, false);
  assert.equal(roomCardCount(game.code, cost.id), 1);

  const replay = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "hua_tuo_prodigal_healer", cardIds: [cost.id], targetId: hua.id });
  assert.equal(replay.status, 409);

  const ended = await requestAndSettle("end_turn", { code: game.code, token: game.members[0].token });
  assert.equal(ended.status, 200, JSON.stringify(ended.data));
  setHand(hua.id, [card("Dodge", "prodigal-next-turn")], 2, 3);
  for (const member of game.members.slice(1, 3)) {
    const drawn = await requestAndSettle("draw", { code: game.code, token: member.token });
    assert.equal(drawn.status, 200, JSON.stringify(drawn.data));
    const nextEnded = await requestAndSettle("end_turn", { code: game.code, token: member.token });
    assert.equal(nextEnded.status, 200, JSON.stringify(nextEnded.data));
  }
  assert.equal((await requestAndSettle("draw", { code: game.code, token: game.members[0].token })).status, 200);
  const nextPlay = (await state(game.code, game.members[0].token)).data;
  assert.equal(nextPlay.currentAction.triggerOptions.some((entry) => entry.effectId === "hua_tuo_prodigal_healer"), true, JSON.stringify(nextPlay));
});

test("First Aid offers only private red non-Peach cards and preserves Lady Gan Prudence through Dying", async () => {
  const game = await createHumanGame();
  const [source, lady, hua] = game.room.players;
  const attack = card("Attack", "first-aid-dying-attack", "♠");
  const redAttack = card("Attack", "first-aid-red-attack", "♥");
  const blackDodge = card("Dodge", "first-aid-black-dodge", "♠");
  sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='lady-gan' WHERE id=${quote(lady.id)}`);
  sql(`UPDATE players SET hero='hua-tuo' WHERE id=${quote(hua.id)}`);
  setHand(source.id, [attack], 4, 4);
  setHand(lady.id, [], 1, 3);
  setHand(hua.id, [redAttack, blackDodge], 3, 3);
  setTurn(game.code, source.seat, "play");

  const started = await requestAndSettle("play_card", { code: game.code, token: game.members[0].token, cardId: attack.id, targetId: lady.id, preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const declinedDodge = await request("decline_response", { code: game.code, token: game.members[1].token });
  assert.equal(declinedDodge.status, 200, JSON.stringify(declinedDodge.data));
  assert.equal((await request("skip_rescue", { code: game.code, token: game.members[0].token })).status, 200);
  assert.equal((await request("skip_rescue", { code: game.code, token: game.members[1].token })).status, 200);

  const huaView = (await state(game.code, game.members[2].token)).data;
  assert.equal(huaView.phase, "dying");
  assert.equal(huaView.currentAction.requirement, "peach");
  const firstAid = huaView.currentAction.options.find((option) => option.providerId === "hua_tuo_first_aid");
  assert.ok(firstAid, JSON.stringify(huaView));
  assert.deepEqual(firstAid.selection.eligibleCardIds, [redAttack.id]);
  assert.equal(firstAid.selection.eligibleCardIds.includes(blackDodge.id), false);
  const opponentView = (await state(game.code, game.members[0].token)).data;
  assert.equal(JSON.stringify(opponentView).includes(redAttack.id), false, "the red-card choices remain private to Hua Tuo");

  const rescued = await requestAndSettle("respond", { code: game.code, token: game.members[2].token, providerId: "hua_tuo_first_aid", cardId: redAttack.id });
  assert.equal(rescued.status, 200, JSON.stringify(rescued.data));
  const afterRescue = (await state(game.code, game.members[1].token)).data;
  const firstAidEvent = afterRescue.timeline.find((event) => event.type === "card" && event.card?.id === redAttack.id);
  assert.deepEqual(firstAidEvent.publicCardEffects?.[0]?.materials, [{ cardId: redAttack.id, ownerId: hua.id, fromZone: "HAND", toZone: "PUBLIC_PLAY" }]);
  assert.equal(firstAidEvent.publicCardEffects?.[0]?.resultingCardKind, "Peach");
  assert.equal(firstAidEvent.publicCardEffects?.[0]?.outcome, "AS_PEACH");
  assert.equal(afterRescue.currentAction.triggerEvent, "hp_recovered");
  assert.deepEqual(afterRescue.currentAction.triggerOptions.map((option) => option.effectId), ["lady_gan_prudence"]);
  assert.equal((await state(game.code, game.members[2].token)).data.myHand.some((card) => card.id === redAttack.id), false);

  const prudence = await request("trigger", { code: game.code, token: game.members[1].token, providerId: "lady_gan_prudence", targetId: source.id });
  assert.equal(prudence.status, 200, JSON.stringify(prudence.data));
  assert.equal(prudence.data.room.pendingDying, null);
  assert.equal(prudence.data.room.players.find((player) => player.id === lady.id).hp, 1);
  assert.equal(roomCardCount(game.code, redAttack.id), 1);
});
