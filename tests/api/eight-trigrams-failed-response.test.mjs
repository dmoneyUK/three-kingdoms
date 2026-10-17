import test from "node:test";
import {
  assert, card, createHumanGame, discardIds, passNegationWindows, query, quote, request, requestAndSettle, roomCardCount,
  setDeck, setEquipment, setHand, setTurn, sql, state,
} from "./test-support.mjs";

function storedPending(code) {
  const json = query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`);
  return json ? JSON.parse(json) : null;
}

test("failed Eight Trigrams keeps a multi-Dodge Attack open through Sima Yi's replacement", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, targetMember] = game.members;
  const [source, target] = game.room.players;
  sql(`UPDATE players SET hero='lü-bu' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(target.id)}`);

  const attack = card("Attack", "eight-fail-lubu-attack");
  const firstDodge = card("Dodge", "eight-fail-lubu-dodge-1");
  const secondDodge = card("Dodge", "eight-fail-lubu-dodge-2");
  const replacement = card("Peach", "eight-fail-lubu-guicai", "♣");
  const armor = card("EightTrigrams", "eight-fail-lubu-armor");
  const originalJudgement = card("Peach", "eight-fail-lubu-original", "♥");
  setHand(source.id, [attack], 4, 4);
  setHand(target.id, [firstDodge, secondDodge, replacement], 4, 4);
  setEquipment(target.id, { armor });
  setDeck(game.code, [originalJudgement]);
  setTurn(game.code, source.seat);

  const started = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: target.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const initial = (await state(game.code, targetMember.token)).data;
  const interactionId = initial.causalEnvelope?.interactionId;
  assert.ok(interactionId);
  assert.equal(initial.currentAction.kind, "response");
  assert.ok(initial.currentAction.options.some((option) => option.providerId === "eight_trigrams_dodge"));

  const judged = await requestAndSettle("respond", { code: game.code, token: targetMember.token, providerId: "eight_trigrams_dodge" });
  assert.equal(judged.status, 200, JSON.stringify(judged.data));
  assert.equal(judged.data.room.currentAction.kind, "trigger");
  assert.equal(judged.data.room.currentAction.triggerEvent, "judgement_revealed");
  const replaced = await requestAndSettle("trigger", { code: game.code, token: targetMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));

  const afterFailure = replaced.data.room;
  assert.equal(afterFailure.phase, "response");
  assert.equal(afterFailure.currentAction.kind, "response");
  assert.equal(afterFailure.currentAction.actorId, target.id);
  assert.equal(afterFailure.currentAction.requirement, "dodge");
  assert.ok(afterFailure.currentAction.legalActions.includes("respond"));
  assert.ok(afterFailure.currentAction.legalActions.includes("decline_response"));
  assert.equal(afterFailure.currentAction.options.some((option) => option.providerId === "eight_trigrams_dodge"), false);
  assert.ok(afterFailure.currentAction.options.some((option) => option.providerId === "card" && option.selection.eligibleCardIds.includes(firstDodge.id)));
  assert.equal(afterFailure.players.find((player) => player.id === target.id).hp, 4, "failed Judgement does not resolve Attack damage");
  assert.equal(afterFailure.causalEnvelope?.interactionId, interactionId);
  assert.equal(afterFailure.causalEnvelope?.checkpoint.stage, "ATTACK_RESPONSE");
  const sourceView = (await state(game.code, sourceMember.token)).data;
  assert.equal(sourceView.currentAction.options, undefined, "the responding actor's private providers stay private to that actor");
  assert.deepEqual(sourceView.pending, { kind: "response" });
  let pending = storedPending(game.code);
  assert.equal(pending.requirement.count, 2, "failed provider consumes none of Lü Bu's two-Dodge requirement");
  assert.ok(pending.disabledProviderIds.includes("eight_trigrams_dodge"));
  assert.equal(pending.continuation.targetId, target.id);
  assert.equal(pending.continuation.sourceId, source.id);
  assert.equal(roomCardCount(game.code, originalJudgement.id), 1);
  assert.equal(roomCardCount(game.code, replacement.id), 1, "Guicai's replacement remains conserved as the final Judgement card");

  const firstAnswered = await requestAndSettle("respond", { code: game.code, token: targetMember.token, providerId: "card", cardId: firstDodge.id });
  assert.equal(firstAnswered.status, 200, JSON.stringify(firstAnswered.data));
  assert.equal(firstAnswered.data.room.currentAction.kind, "response");
  assert.equal(firstAnswered.data.room.currentAction.actorId, target.id);
  assert.equal(firstAnswered.data.room.currentAction.options.some((option) => option.providerId === "eight_trigrams_dodge"), false, "the failed provider stays unavailable for this response");
  pending = storedPending(game.code);
  assert.equal(pending.requirement.count, 1);
  assert.ok(pending.disabledProviderIds.includes("eight_trigrams_dodge"));

  const secondAnswered = await requestAndSettle("respond", { code: game.code, token: targetMember.token, providerId: "card", cardId: secondDodge.id });
  assert.equal(secondAnswered.status, 200, JSON.stringify(secondAnswered.data));
  assert.ok(secondAnswered.data.room.phase.startsWith("play"));
  assert.equal(secondAnswered.data.room.players.find((player) => player.id === target.id).hp, 4);
  for (const value of [attack, firstDodge, secondDodge, replacement, originalJudgement]) assert.equal(roomCardCount(game.code, value.id), 1, `${value.id} remains conserved`);
  assert.equal(secondAnswered.data.room.players.find((player) => player.id === target.id).equipmentCards.filter((value) => value.id === armor.id).length, 1);
  assert.ok(discardIds(game.code).includes(firstDodge.id));
  assert.ok(discardIds(game.code).includes(secondDodge.id));
});

test("failed Eight Trigrams reopens the same Group/AOE Dodge actor before advancing", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, targetMember, bobMember, carolMember] = game.members;
  const [source, target, bob, carol] = game.room.players;
  const arrows = card("RainingArrows", "eight-fail-group-source");
  const targetDodge = card("Dodge", "eight-fail-group-target-dodge");
  const bobDodge = card("Dodge", "eight-fail-group-bob-dodge");
  const carolDodge = card("Dodge", "eight-fail-group-carol-dodge");
  const armor = card("EightTrigrams", "eight-fail-group-armor");
  const judgement = card("Peach", "eight-fail-group-judgement", "♣");
  setHand(source.id, [arrows], 4, 4);
  setHand(target.id, [targetDodge], 4, 4);
  setHand(bob.id, [bobDodge], 4, 4);
  setHand(carol.id, [carolDodge], 4, 4);
  setEquipment(target.id, { armor });
  setDeck(game.code, [judgement]);
  setTurn(game.code, source.seat);

  const started = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: arrows.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  await passNegationWindows(game.code, game.members);
  const initial = (await state(game.code, targetMember.token)).data;
  assert.equal(initial.currentAction.kind, "response");
  assert.equal(initial.currentAction.actorId, target.id);
  const interactionId = initial.causalEnvelope?.interactionId;
  const initialPending = storedPending(game.code);

  const failed = await requestAndSettle("respond", { code: game.code, token: targetMember.token, providerId: "eight_trigrams_dodge" });
  assert.equal(failed.status, 200, JSON.stringify(failed.data));
  assert.equal(failed.data.room.currentAction.kind, "response");
  assert.equal(failed.data.room.currentAction.actorId, target.id, "the group cursor does not advance on provider failure");
  assert.equal(failed.data.room.currentAction.options.some((option) => option.providerId === "eight_trigrams_dodge"), false);
  assert.ok(failed.data.room.currentAction.options.some((option) => option.providerId === "card" && option.selection.eligibleCardIds.includes(targetDodge.id)));
  assert.equal(failed.data.room.players.find((player) => player.id === target.id).hp, 4);
  assert.equal(failed.data.room.causalEnvelope?.interactionId, interactionId);
  assert.equal(failed.data.room.causalEnvelope?.checkpoint.stage, "GROUP_RESOLUTION");
  assert.deepEqual(failed.data.room.causalEnvelope?.frames[0].origin.originalTargetIds, [target.id, bob.id, carol.id]);
  assert.deepEqual(failed.data.room.causalEnvelope?.frames[0].current.currentTargetIds, [target.id]);
  const afterFailurePending = storedPending(game.code);
  assert.equal(afterFailurePending.continuation.kind, "group");
  assert.equal(afterFailurePending.continuation.sourceId, source.id);
  assert.deepEqual(afterFailurePending.continuation.remainingIds, initialPending.continuation.remainingIds);
  assert.ok(afterFailurePending.disabledProviderIds.includes("eight_trigrams_dodge"));

  const targetAnswered = await requestAndSettle("respond", { code: game.code, token: targetMember.token, providerId: "card", cardId: targetDodge.id });
  assert.equal(targetAnswered.status, 200, JSON.stringify(targetAnswered.data));
  assert.equal(targetAnswered.data.room.currentAction.kind, "response");
  assert.equal(targetAnswered.data.room.currentAction.actorId, bob.id);
  const bobAnswered = await requestAndSettle("respond", { code: game.code, token: bobMember.token, providerId: "card", cardId: bobDodge.id });
  assert.equal(bobAnswered.status, 200, JSON.stringify(bobAnswered.data));
  assert.equal(bobAnswered.data.room.currentAction.kind, "response");
  assert.equal(bobAnswered.data.room.currentAction.actorId, carol.id);
  const carolAnswered = await requestAndSettle("respond", { code: game.code, token: carolMember.token, providerId: "card", cardId: carolDodge.id });
  assert.equal(carolAnswered.status, 200, JSON.stringify(carolAnswered.data));
  assert.equal(carolAnswered.data.room.phase, "play");
  for (const player of [target, bob, carol]) assert.equal(carolAnswered.data.room.players.find((candidate) => candidate.id === player.id).hp, 4);
  for (const value of [arrows, targetDodge, bobDodge, carolDodge, judgement]) assert.equal(roomCardCount(game.code, value.id), 1, `${value.id} remains conserved`);
  assert.equal(carolAnswered.data.room.players.find((player) => player.id === target.id).equipmentCards.filter((value) => value.id === armor.id).length, 1);
});

test("failed Eight Trigrams does not deal damage until the player explicitly declines", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, targetMember] = game.members;
  const [source, target] = game.room.players;
  const attack = card("Attack", "eight-fail-pass-attack");
  const armor = card("EightTrigrams", "eight-fail-pass-armor");
  const judgement = card("Peach", "eight-fail-pass-judgement", "♣");
  setHand(source.id, [attack], 4, 4);
  setHand(target.id, [], 4, 4);
  setEquipment(target.id, { armor });
  setDeck(game.code, [judgement]);
  setTurn(game.code, source.seat);

  const started = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: target.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const failed = await request("respond", { code: game.code, token: targetMember.token, providerId: "eight_trigrams_dodge" });
  assert.equal(failed.status, 200, JSON.stringify(failed.data));
  const reopened = (await state(game.code, targetMember.token)).data;
  assert.equal(reopened.currentAction.kind, "response");
  assert.equal(reopened.currentAction.options.length, 0);
  assert.deepEqual(reopened.currentAction.legalActions, ["decline_response"]);
  assert.equal(reopened.players.find((player) => player.id === target.id).hp, 4);

  const declined = await request("decline_response", { code: game.code, token: targetMember.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  const resolved = (await state(game.code, targetMember.token)).data;
  assert.equal(resolved.players.find((player) => player.id === target.id).hp, 3);
  for (const value of [attack, judgement]) assert.equal(roomCardCount(game.code, value.id), 1, `${value.id} remains conserved`);
  assert.equal(resolved.players.find((player) => player.id === target.id).equipmentCards.filter((value) => value.id === armor.id).length, 1);
});
