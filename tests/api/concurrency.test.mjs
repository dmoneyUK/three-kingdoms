/* eslint-disable @typescript-eslint/no-unused-vars */
import test from "node:test";
import { derivePublicInteractionNarration } from "../../game/public-activity.ts";
import { assertPublicOutcomeHasH4Owner } from "./public-outcome-h4-assertions.mjs";
import {
  restoreSequentialDyingFixture, advanceNegationWindow, assert, card, createHumanGame, createHumanSetupGame, createTestGame, createTestLobby, discardIds, distributeLegacy, drainEmptyPrivateDecisions, markReady, normalizeRoomData, openBorrowedSwordScenario, openFankuiAttack, openGanglieAttack, openGanglieGroup, openGuoDamage, openHujiaScenario, passNegationWindows, prepareGuoJudgement, query, quote, request, requestAndSettle, roomCardCount, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state, takeDamageIfPending, waitForState,
} from "./test-support.mjs";

test("unknown semantic Dodge and Negate providers cross the real API and D1 boundary", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members; const [hostPlayer, alicePlayer] = game.room.players;
  sql(`UPDATE players SET hero='test-hero' WHERE id=${quote(alicePlayer.id)}`);
  setHand(hostPlayer.id, [card("Attack", "semantic-dodge")], 4, 4); setHand(alicePlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  const attack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-semantic-dodge", targetId: alicePlayer.id });
  assert.equal(attack.status, 200); const aliceView = await state(game.code, alice.token); assert.ok(aliceView.data.currentAction.options.some((option) => option.providerId === "test_semantic_dodge"));
  const dodged = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "test_semantic_dodge" });
  assert.equal(dodged.status, 200); assert.equal(dodged.data.room.phase, "play-struck"); assert.equal(dodged.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

  sql(`UPDATE players SET hero='test-hero' WHERE id=${quote(alicePlayer.id)}`);
  setHand(hostPlayer.id, [card("Dismantle", "semantic-negate")], 4, 4); setHand(alicePlayer.id, [card("Attack", "semantic-kept")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "dismantle-semantic-negate", targetId: alicePlayer.id, targetCardIndex: 0, preserveResponse: true });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.actionPlayerId, null); const negateView = await state(game.code, alice.token); assert.ok(negateView.data.currentAction.options.some((option) => option.providerId === "test_semantic_negate"));
  const negated = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "test_semantic_negate" });
  assert.equal(negated.status, 200); assert.equal(negated.data.room.phase, "response"); assert.equal(negated.data.room.pendingNegation.chainDepth, 1); assert.equal(negated.data.room.pendingNegation.negated, true);
});

test("attack_dodged trigger continuation reopens every synthetic provider through Worker/D1", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host");
  const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);

  // The test-only trigger registry is inert unless these markers are persisted
  // in the isolated room, so this exercises the same live discovery path as a
  // future equipment or hero capability without adding a Standard card.
  setEquipment(hostPlayer.id, {
    armor: card("NioShield", "test-trigger-a-equipped"),
    defensiveHorse: card("NioShield", "test-trigger-b-equipped"),
  });
  setHand(hostPlayer.id, [card("Attack", "trigger-chain")], 4, 4);
  setHand(alicePlayer.id, [card("Dodge", "trigger-chain")], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  const attack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-trigger-chain", targetId: alicePlayer.id });
  assert.equal(attack.status, 200);
  assert.equal(attack.data.room.pendingAttack.actorId, alicePlayer.id);

  const dodged = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: "dodge-trigger-chain" });
  assert.equal(dodged.status, 200);
  const offered = await state(game.code, host.token);
  assert.equal(offered.data.currentAction.kind, "trigger");
  assert.deepEqual(offered.data.currentAction.triggerOptions.map((option) => option.effectId), ["test_attack_dodged_a", "test_attack_dodged_b"]);

  const afterA = await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_attack_dodged_a" });
  assert.equal(afterA.status, 200);
  assert.equal(afterA.data.room.currentAction.kind, "trigger");
  assert.deepEqual(afterA.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["test_attack_dodged_b"], "provider A is excluded when the same event reopens");
  const reopened = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.deepEqual(reopened.resolvedEffectIds, ["test_attack_dodged_a"]);

  const afterB = await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_attack_dodged_b" });
  assert.equal(afterB.status, 200);
  assert.equal(afterB.data.room.phase, "play-struck", "the original Attack-dodged continuation resumes after trigger exhaustion");
  assert.equal(afterB.data.room.pending, null);
  assert.equal(afterB.data.room.currentAction.kind, "turn");
  assert.equal(afterB.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4, "a continue_event reaction does not add damage");
  const triggerResolutions = afterB.data.room.log.filter((entry) => /resolves an optional reaction/.test(entry));
  assert.equal(triggerResolutions.length, 2, "each synthetic provider resolves exactly once");
  const persisted = query(`SELECT phase || ':' || COALESCE(pending_json, '') FROM rooms WHERE code=${quote(game.code)}`);
  assert.match(persisted, /^play-struck:$/, "the room is not stranded in response or resolving");
});

test("damage_about_to_apply trigger exhaustion resumes original Attack damage once", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host");
  const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);
  sql(`UPDATE players SET hero=NULL WHERE id=${quote(alicePlayer.id)}`);

  setEquipment(hostPlayer.id, {
    armor: card("NioShield", "test-trigger-a-equipped"),
    defensiveHorse: card("NioShield", "test-trigger-b-equipped"),
  });
  setHand(hostPlayer.id, [card("Attack", "damage-trigger-chain")], 4, 4);
  setHand(alicePlayer.id, [], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  const attack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-damage-trigger-chain", targetId: alicePlayer.id });
  assert.equal(attack.status, 200);
  assert.equal(attack.data.room.currentAction.kind, "trigger");
  assert.deepEqual(attack.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["test_damage_about_to_apply_a", "test_damage_about_to_apply_b"]);
  assert.equal(attack.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4, "damage is deferred while reactions are open");

  const afterA = await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_a" });
  assert.equal(afterA.status, 200);
  assert.equal(afterA.data.room.currentAction.kind, "trigger");
  assert.deepEqual(afterA.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["test_damage_about_to_apply_b"], "provider A is excluded when the damage event reopens");
  const reopened = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.deepEqual(reopened.resolvedEffectIds, ["test_damage_about_to_apply_a"]);
  assert.equal(afterA.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4, "reopening does not apply damage early");

  const afterB = await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_b" });
  assert.equal(afterB.status, 200);
  assert.equal(afterB.data.room.phase, "play-struck", "the original Attack continuation resumes after trigger exhaustion");
  assert.equal(afterB.data.room.pending, null);
  assert.equal(afterB.data.room.currentAction.kind, "turn");
  assert.equal(afterB.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3, "original Attack damage is applied exactly once");
  assert.equal(afterB.data.room.log.filter((entry) => /Alice takes 1 damage\./.test(entry)).length, 1, "the damage transition is recorded exactly once");
  assert.equal(afterB.data.room.log.filter((entry) => /resolves an optional reaction/.test(entry)).length, 2, "each synthetic provider resolves exactly once");
  const persisted = query(`SELECT phase || ':' || COALESCE(pending_json, '') FROM rooms WHERE code=${quote(game.code)}`);
  assert.match(persisted, /^play-struck:$/, "the room is not stranded in response or resolving");
});

test("lethal damage trigger exhaustion enters shared Dying and Peach rescue exactly once", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, , bob] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer] = game.room.players;
  assert.ok(hostPlayer && alicePlayer && bobPlayer);

  setEquipment(hostPlayer.id, {
    armor: card("NioShield", "test-trigger-a-lethal-equipped"),
    defensiveHorse: card("NioShield", "test-trigger-b-lethal-equipped"),
  });
  setHand(hostPlayer.id, [card("Attack", "lethal-damage-trigger-chain")], 4, 4);
  setHand(alicePlayer.id, [], 1, 4);
  setHand(bobPlayer.id, [card("Peach", "lethal-rescue")], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  const attack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-lethal-damage-trigger-chain", targetId: alicePlayer.id });
  assert.equal(attack.status, 200);
  const attackEnvelope = attack.data.room.causalEnvelope;
  assert.ok(attackEnvelope, "Attack root envelope is persisted at the real response boundary");
  assert.equal(attackEnvelope.frames.length, 1);
  assert.deepEqual(attack.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["test_damage_about_to_apply_a", "test_damage_about_to_apply_b"]);

  await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_a" });
  const afterB = await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_b" });
  assert.equal(afterB.status, 200);
  assert.equal(afterB.data.room.phase, "dying");
  assert.equal(afterB.data.room.pending?.kind, "dying");
  assert.equal(afterB.data.room.currentAction.kind, "dying");
  assert.equal(afterB.data.room.pendingDying.targetId, alicePlayer.id);
  const dyingEnvelope = afterB.data.room.causalEnvelope;
  assert.ok(dyingEnvelope, "lethal Damage/Dying keeps the persisted envelope");
  assert.equal(dyingEnvelope.interactionId, attackEnvelope.interactionId);
  assert.equal(dyingEnvelope.activeFrameId, attackEnvelope.activeFrameId);
  assert.equal(dyingEnvelope.frames.find((frame) => frame.frameId === dyingEnvelope.activeFrameId).stage, "DYING");
  assert.equal(dyingEnvelope.frames.find((frame) => frame.frameId === dyingEnvelope.activeFrameId).origin.originalTargetIds[0], alicePlayer.id);
  assert.equal(afterB.data.room.players.find((player) => player.id === alicePlayer.id).hp, 0);
  assert.equal(afterB.data.room.players.find((player) => player.id === alicePlayer.id).alive, true, "shared Dying keeps the target rescuable");
  assert.equal(afterB.data.room.log.filter((entry) => /Alice takes 1 damage/.test(entry)).length, 1);
  assert.equal(afterB.data.room.log.filter((entry) => /enters Dying/.test(entry)).length, 1);
  assert.equal(afterB.data.room.log.filter((entry) => /resolves an optional reaction/.test(entry)).length, 2);
  assert.equal(afterB.data.room.log.filter((entry) => /Peach rescue begins/.test(entry)).length, 1);

  const rescued = await requestAndSettle("give_peach", { code: game.code, token: bob.token, cardId: "peach-lethal-rescue" });
  assert.equal(rescued.status, 200);
  assert.equal(rescued.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.equal(rescued.data.room.players.find((player) => player.id === alicePlayer.id).alive, true);
  assert.equal(rescued.data.room.pendingDying, null);
  assert.equal(rescued.data.room.causalEnvelope, null, "settled lethal Interaction clears its envelope after rescue");
  const rescueRecoveryFacts = rescued.data.room.timeline.filter((event) => event.publicFact?.visibility === "PUBLIC"
    && event.publicFact.committedOutcome?.changes?.some((change) => change.kind === "HP_RECOVERED" && change.playerId === alicePlayer.id));
  assert.equal(rescueRecoveryFacts.length, 1, "the committed recovery H4 fact survives retirement of the settled Dying envelope");
  assert.equal(rescueRecoveryFacts[0].publicFact.committedOutcome.changes[0].amount, 1, "the public result carries the actual recovered HP");
  assertPublicOutcomeHasH4Owner(rescued.data.room, rescueRecoveryFacts[0].id);
  assert.equal(rescued.data.room.currentAction.kind, "turn");
  assert.equal(rescued.data.room.log.filter((entry) => /Alice takes 1 damage/.test(entry)).length, 1, "rescue does not replay damage");
  assert.equal(rescued.data.room.log.filter((entry) => /enters Dying/.test(entry)).length, 1, "Dying begins once");
  const persisted = query(`SELECT phase || ':' || COALESCE(pending_json, '') FROM rooms WHERE code=${quote(game.code)}`);
  assert.match(persisted, /^play-struck:$/, "the shared rescue pipeline returns to the turn sequence");

  setEquipment(hostPlayer.id, {});
  const freshAttack = card("Attack", "fresh-root-after-rescue");
  const freshDodge = card("Dodge", "fresh-root-after-rescue-dodge");
  setHand(hostPlayer.id, [freshAttack], 4, 4);
  setHand(alicePlayer.id, [freshDodge], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  const reopened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: freshAttack.id, targetId: alicePlayer.id });
  assert.equal(reopened.status, 200, JSON.stringify(reopened.data));
  assert.notEqual(reopened.data.room.causalEnvelope.interactionId, attackEnvelope.interactionId, "a settled root is not reused");
  assert.notEqual(reopened.data.room.causalEnvelope.activeFrameId, attackEnvelope.activeFrameId, "a fresh root gets a fresh frame");
});

test("saved sequential Dying: Dying uses one ordered rescue pass and does not revisit a passed actor", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice, bob, carol] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  setHand(hostPlayer.id, [card("Attack", "ordered-rescue"), card("Peach", "host-unused")], 4, 4);
  setHand(alicePlayer.id, [], -1, 4);
  sql(`UPDATE players SET role='Rebel' WHERE id=${quote(alicePlayer.id)}`);
  setDeck(game.code, [card("Dodge", "rebel-reward-1"), card("Attack", "rebel-reward-2"), card("Peach", "rebel-reward-3")]);
  setHand(bobPlayer.id, [card("Peach", "ordered-bob")], 4, 4);
  setHand(carolPlayer.id, [card("Peach", "ordered-carol")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-ordered-rescue", targetId: alicePlayer.id });
  await takeDamageIfPending(game.code, alice.token);
  restoreSequentialDyingFixture(game.code, hostPlayer.id);
  assert.equal((await state(game.code, host.token)).data.players.find((player) => player.id === alicePlayer.id).hp, -2);
  await requestAndSettle("skip_rescue", { code: game.code, token: host.token });
  const bobPrompt = await state(game.code, bob.token);
  assert.equal(bobPrompt.data.actionPlayerId, bobPlayer.id);
  const partial = await requestAndSettle("give_peach", { code: game.code, token: bob.token, cardId: "peach-ordered-bob" });
  assert.equal(partial.data.room.players.find((player) => player.id === alicePlayer.id).hp, -1);
  const carolPrompt = await state(game.code, carol.token);
  assert.equal(carolPrompt.data.actionPlayerId, carolPlayer.id, "partial rescue advances to the next actor after Bob finishes his only Peach");
  const orderedPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(orderedPending.actorId, carolPlayer.id, "Host is not revisited");
  assert.deepEqual(orderedPending.remainingIds, []);
  await requestAndSettle("skip_rescue", { code: game.code, token: carol.token });
  const defeated = await waitForState(game.code, host.token, (room) => !room.players.find((player) => player.id === alicePlayer.id).alive);
  assert.equal(defeated.players.find((player) => player.id === alicePlayer.id).role, "Rebel");
  const rawRewardEvents = defeated.timeline.filter((event) => event.publicFact?.committedOutcome?.source.label === "Rebel Defeat Reward");
  assert.equal(rawRewardEvents.length, 1, "the committed reward result is persisted as one public event before snapshot projection");
  const rewardFact = [...(defeated.presentationSnapshot?.retainedPublicEventFacts ?? []), ...(defeated.presentationSnapshot?.publicEventFacts ?? [])]
    .find((fact) => fact.committedOutcome?.source.label === "Rebel Defeat Reward");
  assert.ok(rewardFact, "the shared public snapshot retains the persisted reward outcome after Dying defeat");
  const attackRoots = defeated.timeline.filter((event) => event.type === "card" && event.action === "play" && event.card?.id === "attack-ordered-rescue");
  assert.equal(attackRoots.length, 1, "the original Attack remains present as the public causal root");
  assert.equal(rewardFact.rootEventId, attackRoots[0].id, "the committed reward remains linked to the original Attack root");
  assert.deepEqual(rewardFact.committedOutcome.changes, [
    { kind: "CARD_DRAWN", playerId: hostPlayer.id, amount: 3, fromZone: "DECK", toZone: "HAND" },
  ], "the public result reports the actual reward draw count without card identities");
  const rewardNarration = derivePublicInteractionNarration({
    snapshot: defeated.presentationSnapshot,
    players: defeated.players,
    rootEventId: rewardFact.rootEventId,
    interactionId: rewardFact.identity.interactionId,
    rootFrameId: rewardFact.identity.rootFrameId,
    eventId: rewardFact.eventId,
  });
  assert.match(rewardNarration?.headline ?? "", /Host.*drew 3 cards/);
  assert.equal(JSON.stringify(rewardFact).includes("rebel-reward-"), false, "the public result never reveals drawn card identities");
  const observer = (await state(game.code, bob.token)).data;
  const observerReward = derivePublicInteractionNarration({
    snapshot: observer.presentationSnapshot,
    players: observer.players,
    rootEventId: rewardFact.rootEventId,
    interactionId: rewardFact.identity.interactionId,
    rootFrameId: rewardFact.identity.rootFrameId,
    eventId: rewardFact.eventId,
  });
  assert.equal(observerReward?.headline, rewardNarration?.headline, "the public reward H4 is identical for a second viewer");
});

test("saved sequential Dying: the current Dying actor may give multiple Peaches consecutively", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice, bob] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer] = game.room.players;
  setHand(hostPlayer.id, [card("Attack", "consecutive-rescue")], 4, 4);
  setHand(alicePlayer.id, [], -1, 4);
  setHand(bobPlayer.id, [card("Peach", "consecutive-1"), card("Peach", "consecutive-2"), card("Peach", "consecutive-3")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-consecutive-rescue", targetId: alicePlayer.id });
  await takeDamageIfPending(game.code, alice.token);
  restoreSequentialDyingFixture(game.code, bobPlayer.id);
  for (const [index, id] of ["peach-consecutive-1", "peach-consecutive-2", "peach-consecutive-3"].entries()) {
    const result = await requestAndSettle("give_peach", { code: game.code, token: bob.token, cardId: id });
    assert.equal(result.status, 200);
    const hp = result.data.room.players.find((player) => player.id === alicePlayer.id).hp;
    assert.equal(hp, [-1, 0, 1][index]);
    if (index < 2) assert.equal(result.data.room.actionPlayerId, bobPlayer.id, "Bob remains the rescue actor between consecutive Peaches");
  }
  assert.equal((await state(game.code, alice.token)).data.pendingDying, null);
});

test("saved sequential Dying: a Dying actor may stop after a partial Peach without being revisited", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice, bob, carol] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  setHand(hostPlayer.id, [card("Attack", "early-stop")], 4, 4);
  setHand(alicePlayer.id, [], -1, 4);
  setHand(bobPlayer.id, [card("Peach", "early-stop-1"), card("Peach", "early-stop-2"), card("Peach", "early-stop-3")], 4, 4);
  setHand(carolPlayer.id, [card("Peach", "early-stop-carol")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-early-stop", targetId: alicePlayer.id });
  await takeDamageIfPending(game.code, alice.token);
  restoreSequentialDyingFixture(game.code, bobPlayer.id);

  await requestAndSettle("skip_rescue", { code: game.code, token: host.token });
  const partial = await requestAndSettle("give_peach", { code: game.code, token: bob.token, cardId: "peach-early-stop-1" });
  assert.equal(partial.data.room.players.find((player) => player.id === alicePlayer.id).hp, -1);
  assert.equal(partial.data.room.actionPlayerId, bobPlayer.id);
  const stopped = await requestAndSettle("skip_rescue", { code: game.code, token: bob.token });
  const carolPrompt = await state(game.code, carol.token);
  assert.equal(carolPrompt.data.actionPlayerId, carolPlayer.id);
  assert.equal(stopped.data.room.players.find((player) => player.id === bobPlayer.id).handCount, 2);
  const stoppedPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(stoppedPending.actorId, carolPlayer.id, "Bob is not revisited after ending his opportunity");
});

test("stale and concurrent response submissions claim each transition once", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer] = game.room.players;
  assert.ok(hostPlayer && alicePlayer && bobPlayer);

  setHand(hostPlayer.id, [card("Attack", "stale-response")], 4, 4);
  setHand(alicePlayer.id, [card("Dodge", "stale-response")], 4, 4);
  setHand(bobPlayer.id, [card("Peach", "stale-response-rescue")], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-stale-response", targetId: alicePlayer.id });
  assert.equal(opened.status, 200);
  const root = opened.data.room.causalEnvelope;
  assert.ok(root, "the stale-response test starts from a real causal root");
  const rootIdentity = {
    interactionId: root.interactionId,
    frameId: root.activeFrameId,
    checkpointId: root.checkpoint.checkpointId,
    presentationRevision: root.presentationRevision,
  };
  const staleContext = {
    actionRevision: opened.data.room.actionRevision,
    meId: hostPlayer.id,
    phase: "play",
    pendingKind: null,
    actorId: hostPlayer.id,
  };
  const prompt = await state(game.code, alice.token);
  assert.equal(prompt.data.actionPlayerId, alicePlayer.id);

  const stale = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-stale-response", context: staleContext });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.stale, true);
  assert.equal(stale.data.room.pendingAttack.actorId, alicePlayer.id);
  assert.deepEqual({
    interactionId: stale.data.room.causalEnvelope.interactionId,
    frameId: stale.data.room.causalEnvelope.activeFrameId,
    checkpointId: stale.data.room.causalEnvelope.checkpoint.checkpointId,
    presentationRevision: stale.data.room.causalEnvelope.presentationRevision,
  }, rootIdentity, "a stale request leaves the real causal identity unchanged");
  const stalePending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(stalePending.continuation.causal.interactionId, rootIdentity.interactionId);
  assert.equal(stalePending.continuation.causal.frameId, rootIdentity.frameId);
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(alicePlayer.id)} AND json_extract(value,'$.id')='dodge-stale-response'`), "1", "the stale request does not consume the Dodge");

  const context = {
    actionRevision: prompt.data.actionRevision,
    meId: alicePlayer.id,
    phase: prompt.data.phase,
    pendingKind: "response",
    actorId: alicePlayer.id,
  };
  const results = await Promise.all([
    requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-stale-response", context }),
    requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-stale-response", context }),
  ]);
  assert.equal(results.filter((result) => result.status === 200).length, 1, "exactly one duplicate response claims the Attack");
  const losers = results.filter((result) => result.status === 409);
  assert.equal(losers.length, 1, "exactly one duplicate loses the Attack claim");
  assert.equal(losers[0].data.stale, true, "the losing duplicate is reported stale");
  assert.ok(losers[0].data.room, "the stale response includes a fresh room projection");
  assert.deepEqual(losers[0].data.room.myHand, [], "the losing response does not leak another private hand");
  assert.ok(losers[0].data.room.players.every((player) => player.handCards.length === 0), "the stale response keeps all other hands private");
  const settledEnvelopeJson = query(`SELECT causal_envelope_json FROM rooms WHERE code=${quote(game.code)}`);
  if (settledEnvelopeJson) assert.equal(JSON.parse(settledEnvelopeJson).interactionId, rootIdentity.interactionId, "a duplicate cannot create a second causal root");

  const finished = await state(game.code, host.token);
  assert.equal(finished.data.players.find((player) => player.id === alicePlayer.id).hp, 4);
  assert.equal(finished.data.log.filter((entry) => /Alice plays Dodge and blocks the Attack/.test(entry)).length, 1, "Dodge is consumed and logged once");
  assert.equal(discardIds(game.code).filter((id) => id === "dodge-stale-response").length, 1, "the Dodge enters discard once");
  assert.notEqual(finished.data.phase, "resolving");
  assert.equal(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`), "", "the response does not strand the room");
});

test("interrupted Dodge against a converted Attack remains retryable in a long room", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [attacker, defender] = game.members;
  const [source, target] = game.room.players;
  const attack = { ...card("Dodge", "interrupted-dodge-attack"), rank: "2", suit: "♥" };
  const dodge = { ...card("Dodge", "interrupted-dodge-response"), rank: "J", suit: "♦" };
  sql(`UPDATE players SET hero='zhao-yun', equipment_json='{}' WHERE id=${quote(source.id)};
    UPDATE players SET hero='zhen-ji', equipment_json='{}' WHERE id=${quote(target.id)};`);
  setHand(source.id, [attack], 4, 4);
  setHand(target.id, [dodge], 3, 3);
  setTurn(game.code, source.seat, "play");
  const history = Array.from({ length: 198 }, (_, index) => `@event:${JSON.stringify({
    id: `interrupted-dodge-history-${index}`, message: `Committed public history ${index}`,
  })}`);
  sql(`UPDATE rooms SET log_json=${quote(JSON.stringify(history))} WHERE code=${quote(game.code)}`);
  const opened = await requestAndSettle("play_card", { code: game.code, token: attacker.token, cardId: attack.id, playAs: "attack", targetId: target.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const before = (await state(game.code, defender.token)).data;
  assert.equal(before.currentAction.requirement, "dodge");
  const snapshot = () => query(`SELECT json_object('phase',phase,'pending',pending_json,'log',log_json,'discard',discard_json,'causal',causal_envelope_json) FROM rooms WHERE code=${quote(game.code)}`);
  const beforeCommit = snapshot();
  const context = { actionRevision: before.actionRevision, meId: target.id, phase: "response", pendingKind: "response", actorId: target.id };
  const payload = { code: game.code, token: defender.token, providerId: "card", cardId: dodge.id, context };
  const respond = () => request("respond", payload);

  // Abort the card write after the room statement. An earlier standalone
  // phase claim would survive this failure and strand the response.
  sql(`CREATE TRIGGER interrupted_dodge_payment BEFORE UPDATE OF hand_json ON players
    WHEN OLD.id=${quote(target.id)} AND NEW.hand_json IS NOT OLD.hand_json
    BEGIN SELECT RAISE(ABORT, 'injected interrupted Dodge payment'); END;`);
  try {
    const interrupted = await fetch(new URL("/api/rooms", process.env.GAME_TEST_URL ?? "http://localhost:3137"), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "respond", ...payload }),
    });
    assert.equal(interrupted.status, 500);
    await interrupted.body?.cancel();
    assert.equal(snapshot(), beforeCommit, "a failed write leaves the exact room response retryable");
    const refreshed = (await state(game.code, defender.token)).data;
    assert.equal(refreshed.actionRevision, before.actionRevision);
    assert.equal(refreshed.currentAction.requirement, "dodge");
    assert.ok(refreshed.myHand.some(({ id }) => id === dodge.id));
    assert.ok(!discardIds(game.code).includes(dodge.id));
  } finally {
    sql("DROP TRIGGER interrupted_dodge_payment");
  }

  const replay = await Promise.all([respond(), respond()]);
  assert.deepEqual(replay.map(({ status }) => status).sort(), [200, 409]);
  const after = (await state(game.code, defender.token)).data;
  assert.equal(after.phase, "play-struck");
  assert.equal(after.players.find(({ id }) => id === target.id).hp, 3);
  assert.equal(after.myHand.length, 0);
  assert.equal(discardIds(game.code).filter((id) => id === dodge.id).length, 1);
  assert.equal(roomCardCount(game.code, dodge.id), 1);
  const cards = after.timeline.filter((event) => event.action === "play" && event.card?.id === dodge.id);
  assert.equal(cards.length, 1, "the committed Dodge is recorded once");
  assert.equal(cards[0].attackDodgeResponse?.counterRelation, "BLOCKS_TARGET_EFFECT", "canonical presentation proof survives the atomic commit");
  assert.equal(cards[0].attackDodgeResponse?.responseActorId, target.id);
});

test("FIX9 Group stale response preserves causal identity and card state", { timeout: 30_000 }, async () => {
  const opened = await openGanglieGroup({ kind: "RainingArrows", suffix: "fix8-group-stale", judge: { ...card("Dodge", "fix8-group-stale-judge"), suit: "♥", rank: "2" } });
  const advanced = await requestAndSettle("decline_trigger", { code: opened.code, token: opened.targetMember.token });
  assert.equal(advanced.status, 200, JSON.stringify(advanced.data));
  const prompt = await state(opened.code, opened.bobMember.token);
  assert.equal(prompt.data.currentAction.kind, "response");
  const root = prompt.data.causalEnvelope;
  const identity = { interactionId: root.interactionId, frameId: root.activeFrameId, checkpointId: root.checkpoint.checkpointId, presentationRevision: root.presentationRevision };
  const stale = await requestAndSettle("respond", { code: opened.code, token: opened.bobMember.token, providerId: "card", cardId: `${opened.required.toLowerCase()}-fix8-group-stale-bob`, context: { actionRevision: "stale-fix8-group", meId: opened.bob.id, phase: "response", pendingKind: "response", actorId: opened.bob.id } });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.stale, true);
  assert.deepEqual({ interactionId: stale.data.room.causalEnvelope.interactionId, frameId: stale.data.room.causalEnvelope.activeFrameId, checkpointId: stale.data.room.causalEnvelope.checkpoint.checkpointId, presentationRevision: stale.data.room.causalEnvelope.presentationRevision }, identity);
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(opened.bob.id)} AND json_extract(value,'$.id')='${opened.required.toLowerCase()}-fix8-group-stale-bob'`), "1");
});

test("FIX9 ordinary Duel stale response preserves causal identity before valid progression", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members;
  const [source, target] = game.room.players;
  const duel = card("Duel", "fix8-duel-stale");
  const attack = card("Attack", "fix8-duel-stale-response");
  setHand(source.id, [duel], 4, 4); setHand(target.id, [attack], 4, 4); setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: host.token, cardId: duel.id, targetId: target.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const root = opened.data.room.causalEnvelope;
  const identity = { interactionId: root.interactionId, frameId: root.activeFrameId, checkpointId: root.checkpoint.checkpointId, presentationRevision: root.presentationRevision };
  const stale = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: attack.id, context: { actionRevision: "stale-fix8-duel", meId: target.id, phase: "response", pendingKind: "response", actorId: target.id } });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.stale, true);
  assert.deepEqual({ interactionId: stale.data.room.causalEnvelope.interactionId, frameId: stale.data.room.causalEnvelope.activeFrameId, checkpointId: stale.data.room.causalEnvelope.checkpoint.checkpointId, presentationRevision: stale.data.room.causalEnvelope.presentationRevision }, identity);
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(target.id)} AND json_extract(value,'$.id')='${attack.id}'`), "1");
  await advanceNegationWindow(game.code, host.token, opened.data.room.currentAction.negationWindowId);
  const prompt = await state(game.code, alice.token);
  const valid = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: attack.id, context: { actionRevision: prompt.data.actionRevision, meId: target.id, phase: prompt.data.phase, pendingKind: "response", actorId: target.id }, preserveResponse: true });
  assert.equal(valid.status, 200, JSON.stringify(valid.data));
  assert.equal(valid.data.room.causalEnvelope.interactionId, identity.interactionId);
  assert.equal(valid.data.room.causalEnvelope.frames.length, 1);
});

test("FIX9 Group duplicate response race advances one participant once", { timeout: 30_000 }, async () => {
  const opened = await openGanglieGroup({ kind: "RainingArrows", suffix: "fix9-group-race", judge: { ...card("Dodge", "fix9-group-race-judge"), suit: "♥", rank: "2" } });
  const advanced = await requestAndSettle("decline_trigger", { code: opened.code, token: opened.targetMember.token });
  assert.equal(advanced.status, 200, JSON.stringify(advanced.data));
  const prompt = await state(opened.code, opened.bobMember.token);
  const context = { actionRevision: prompt.data.actionRevision, meId: opened.bob.id, phase: prompt.data.phase, pendingKind: "response", actorId: opened.bob.id };
  const results = await Promise.all([
    requestAndSettle("respond", { code: opened.code, token: opened.bobMember.token, providerId: "card", cardId: `${opened.required.toLowerCase()}-fix9-group-race-bob`, context, preserveResponse: true }),
    requestAndSettle("respond", { code: opened.code, token: opened.bobMember.token, providerId: "card", cardId: `${opened.required.toLowerCase()}-fix9-group-race-bob`, context, preserveResponse: true }),
  ]);
  assert.equal(results.filter((result) => result.status === 200).length, 1, JSON.stringify(results));
  assert.equal(results.filter((result) => result.status === 409 && result.data.stale).length, 1, JSON.stringify(results));
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(opened.bob.id)} AND json_extract(value,'$.id')='${opened.required.toLowerCase()}-fix9-group-race-bob'`), "0");
  const after = await state(opened.code, opened.bobMember.token);
  assert.equal(after.data.causalEnvelope.frames.length, 2, "FIX14 retains the settled Damage child in the public causal history");
  assert.equal(after.data.causalEnvelope.interactionId, prompt.data.causalEnvelope.interactionId);
  assert.equal(after.data.causalEnvelope.activeFrameId, prompt.data.causalEnvelope.activeFrameId);
});

test("FIX9 ordinary Duel duplicate response race advances one exchange once", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members;
  const [source, target] = game.room.players;
  const duel = card("Duel", "fix9-duel-race");
  const attack = card("Attack", "fix9-duel-race-response");
  const sourceAttack = card("Attack", "fix9-duel-race-source-response");
  setHand(source.id, [duel, sourceAttack], 4, 4); setHand(target.id, [attack], 4, 4); setTurn(game.code, source.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: duel.id, targetId: target.id, preserveResponse: true });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  await advanceNegationWindow(game.code, host.token, opened.data.room.currentAction.negationWindowId);
  const prompt = await state(game.code, alice.token);
  const context = { actionRevision: prompt.data.actionRevision, meId: target.id, phase: prompt.data.phase, pendingKind: "response", actorId: target.id };
  const results = await Promise.all([
    requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: attack.id, context, preserveResponse: true }),
    requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: attack.id, context, preserveResponse: true }),
  ]);
  assert.equal(results.filter((result) => result.status === 200).length, 1, JSON.stringify(results));
  assert.equal(results.filter((result) => result.status === 409 && result.data.stale).length, 1, JSON.stringify(results));
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(target.id)} AND json_extract(value,'$.id')='${attack.id}'`), "0");
  const after = await state(game.code, host.token);
  assert.equal(after.data.pendingDuel.actorId, source.id);
  assert.equal(after.data.causalEnvelope.frames.length, 1);
  assert.equal(after.data.causalEnvelope.interactionId, prompt.data.causalEnvelope.interactionId);
  assert.equal(after.data.causalEnvelope.activeFrameId, prompt.data.causalEnvelope.activeFrameId);
});

test("stale and concurrent trigger submissions execute optional reactions once", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host");
  const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);

  setEquipment(hostPlayer.id, {
    armor: card("NioShield", "test-trigger-a-equipped"),
    defensiveHorse: card("NioShield", "test-trigger-b-equipped"),
  });
  setHand(hostPlayer.id, [card("Attack", "stale-trigger")], 4, 4);
  setHand(alicePlayer.id, [card("Dodge", "stale-trigger")], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-stale-trigger", targetId: alicePlayer.id });
  await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-stale-trigger" });
  const offered = await state(game.code, host.token);
  assert.equal(offered.data.currentAction.kind, "trigger");
  const context = {
    actionRevision: offered.data.actionRevision,
    meId: hostPlayer.id,
    phase: offered.data.phase,
    pendingKind: "trigger",
    actorId: hostPlayer.id,
  };

  const results = await Promise.all([
    requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_attack_dodged_a", context }),
    requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_attack_dodged_a", context }),
  ]);
  assert.equal(results.filter((result) => result.status === 200).length, 1, "exactly one duplicate trigger claims the event");
  assert.equal(results.filter((result) => result.status === 409 && result.data.stale).length, 1, "the losing trigger is reported stale");

  const afterA = await state(game.code, host.token);
  assert.deepEqual(afterA.data.currentAction.triggerOptions.map((option) => option.effectId), ["test_attack_dodged_b"]);
  assert.equal(afterA.data.log.filter((entry) => /resolves an optional reaction/.test(entry)).length, 1, "the trigger executes once");
  const pending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.deepEqual(pending.resolvedEffectIds, ["test_attack_dodged_a"]);

  const finished = await requestAndSettle("decline_trigger", { code: game.code, token: host.token });
  assert.equal(finished.status, 200);
  assert.equal(finished.data.room.phase, "play-struck");
  assert.equal(finished.data.room.pending, null);
  assert.notEqual(finished.data.room.phase, "resolving");
  assert.equal(finished.data.room.log.filter((entry) => /resolves an optional reaction/.test(entry)).length, 1);
});

test("concurrent lethal damage continuation enters Dying once and accepts one rescue", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, , bob] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer] = game.room.players;
  assert.ok(hostPlayer && alicePlayer && bobPlayer);

  setEquipment(hostPlayer.id, {
    armor: card("NioShield", "test-trigger-a-equipped"),
    defensiveHorse: card("NioShield", "test-trigger-b-equipped"),
  });
  setHand(hostPlayer.id, [card("Attack", "double-lethal")], 4, 4);
  setHand(alicePlayer.id, [], 1, 4);
  setHand(bobPlayer.id, [card("Peach", "double-lethal")], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-double-lethal", targetId: alicePlayer.id });
  await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_a" });
  const beforeFinal = (await state(game.code, host.token)).data;
  const damageContext = { actionRevision: beforeFinal.actionRevision, meId: beforeFinal.meId,
    phase: beforeFinal.phase, pendingKind: beforeFinal.pending.kind, actorId: beforeFinal.actionPlayerId };
  const results = await Promise.all([
    requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_b", context: damageContext }),
    requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_b", context: damageContext }),
  ]);
  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal(results.filter((result) => result.status === 409 && result.data.stale).length, 1);

  const dying = await state(game.code, bob.token);
  assert.equal(dying.data.phase, "dying");
  assert.equal(dying.data.log.filter((entry) => /Alice takes 1 damage/.test(entry)).length, 1);
  assert.equal(dying.data.log.filter((entry) => /enters Dying/.test(entry)).length, 1);
  assert.equal(dying.data.players.find((player) => player.id === alicePlayer.id).hp, 0);

  const rescueContext = {
    actionRevision: dying.data.actionRevision,
    meId: dying.data.meId,
    phase: dying.data.phase,
    pendingKind: dying.data.pending?.kind,
    actorId: dying.data.actionPlayerId,
    windowId: dying.data.currentAction.sharedWindow.windowId,
  };
  const rescues = await Promise.all([
    requestAndSettle("give_peach", { code: game.code, token: bob.token, cardId: "peach-double-lethal", context: rescueContext }),
    requestAndSettle("give_peach", { code: game.code, token: bob.token, cardId: "peach-double-lethal", context: rescueContext }),
  ]);
  assert.ok(rescues.some((result) => result.status === 200), JSON.stringify(rescues));
  assert.ok(rescues.every((result) => [200, 409].includes(result.status)), "identical pending intent is idempotent; settled stale retry may reject");
  const finished = await state(game.code, host.token);
  assert.equal(finished.data.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.equal(finished.data.log.filter((entry) => /Alice takes 1 damage/.test(entry)).length, 1);
  assert.equal(finished.data.log.filter((entry) => /Peach rescue begins/.test(entry)).length, 1);
  assert.equal(discardIds(game.code).filter((id) => id === "peach-double-lethal").length, 1);
  assert.notEqual(finished.data.phase, "resolving");
  assert.equal(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`), "");
});

test("Dying rescue resumes a global response chain and victory stops it immediately", { timeout: 30_000 }, async () => {
  const rescuedGame = await createHumanGame();
  const [host, , bob, carol] = rescuedGame.members; const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = rescuedGame.room.players;
  setHand(hostPlayer.id, [card("BarbarianInvasion", "rescue-chain")], 5, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [card("Peach", "rescue-chain")], 4, 4); setHand(carolPlayer.id, [card("Attack", "rescue-chain")], 4, 4); setTurn(rescuedGame.code, hostPlayer.seat);
  sql(`UPDATE rooms SET discard_json='[]' WHERE code=${quote(rescuedGame.code)}`);
  const started = await requestAndSettle("play_card", { code: rescuedGame.code, token: host.token, cardId: "barbarianinvasion-rescue-chain" });
  const dying = started;
  assert.equal(dying.data.room.phase, "dying"); assert.equal(dying.data.room.pendingGroup.cardKind, "BarbarianInvasion", "the AOE sequence remains visible through Dying rescue"); assert.deepEqual(discardIds(rescuedGame.code), []);
  const bobPrompt = await state(rescuedGame.code, bob.token); assert.equal(bobPrompt.data.isMyAction, true); assert.equal(bobPrompt.data.pendingDying.targetId, alicePlayer.id);
  const rescued = await requestAndSettle("give_peach", { code: rescuedGame.code, token: bob.token, cardId: "peach-rescue-chain" });
  assert.equal(rescued.data.room.phase, "response"); assert.equal(rescued.data.room.actionPlayerId, carolPlayer.id); assert.equal(rescued.data.room.turnSeat, hostPlayer.seat);
  assert.equal(rescued.data.room.players.find(p => p.id === bobPlayer.id).hp, 3);
  assert.deepEqual(discardIds(rescuedGame.code), [], "the rescue Peach remains part of the active AOE sequence");
  const bobResponded = await requestAndSettle("decline_response", { code: rescuedGame.code, token: bob.token });
  assert.equal(bobResponded.status, 409);
  const chainFinished = await requestAndSettle("respond", { code: rescuedGame.code, token: carol.token, cardId: "attack-rescue-chain" });
  assert.equal(chainFinished.data.room.phase, "play"); assert.equal(chainFinished.data.room.turnSeat, hostPlayer.seat); assert.equal(chainFinished.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.deepEqual(discardIds(rescuedGame.code), ["barbarianinvasion-rescue-chain", "peach-rescue-chain", "attack-rescue-chain"], "AOE, rescue, and response cards enter discard together after the chain finishes");

  const victoryGame = await createHumanGame();
  const [winner] = victoryGame.members; const [lord, lastRebel, loyalistOne, loyalistTwo] = victoryGame.room.players;
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(lord.id)}; UPDATE players SET role='Rebel' WHERE id=${quote(lastRebel.id)}; UPDATE players SET role='Loyalist' WHERE id IN (${quote(loyalistOne.id)},${quote(loyalistTwo.id)})`);
  setHand(lord.id, [card("BarbarianInvasion", "winning-chain")], 5, 5); setHand(lastRebel.id, [], 1, 4); setHand(loyalistOne.id, [], 4, 4); setHand(loyalistTwo.id, [], 4, 4); setTurn(victoryGame.code, lord.seat);
  const winningCard = await requestAndSettle("play_card", { code: victoryGame.code, token: winner.token, cardId: "barbarianinvasion-winning-chain" });
  const victory = winningCard;
  assert.equal(victory.status, 200); assert.equal(victory.data.room.status, "finished"); assert.equal(victory.data.room.phase, "finished"); assert.equal(victory.data.room.pendingGroup, null);
  assert.equal(victory.data.room.players.find((player) => player.id === loyalistOne.id).hp, 4); assert.equal(victory.data.room.players.find((player) => player.id === loyalistTwo.id).hp, 4);
  assert.ok(victory.data.room.timeline.some((event) => /Lord and Loyalist victory/.test(event.message ?? "")));
  assert.equal(discardIds(victoryGame.code).filter((id) => id === "barbarianinvasion-winning-chain").length, 1, "victory commits the held global card exactly once");
  assert.equal((await requestAndSettle("draw", { code: victoryGame.code, token: winner.token })).status, 409, "no action is accepted after victory");
});

test("classic role deaths apply cleanup, rewards, penalties, and victory rules", { timeout: 30_000 }, async () => {
  const loyalistPenaltyGame = await createHumanGame();
  const [lordMember, loyalistMember, , traitorTargetMember] = loyalistPenaltyGame.members;
  const [lord, loyalist, rebel, traitor] = loyalistPenaltyGame.room.players;
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(lord.id)}; UPDATE players SET role='Loyalist' WHERE id=${quote(loyalist.id)}; UPDATE players SET role='Rebel' WHERE id=${quote(rebel.id)}; UPDATE players SET role='Renegade' WHERE id=${quote(traitor.id)}`);
  setHand(lord.id, [card("Attack", "loyalist-penalty"), card("DrawTwo", "lord-discard"), card("Dismantle", "lord-discard")], 5, 5);
  setHand(loyalist.id, [card("DrawTwo", "defeated-discard"), card("Dismantle", "defeated-discard")], 1, 4);
  setEquipment(lord.id, { weapon: card("ZhugeCrossbow", "lord-penalty") }); setEquipment(loyalist.id, { weapon: card("ZhugeCrossbow", "defeated-discard") });
  setHand(rebel.id, [], 4, 4); setHand(traitor.id, [], 4, 4); setTurn(loyalistPenaltyGame.code, lord.seat);
  await requestAndSettle("play_card", { code: loyalistPenaltyGame.code, token: lordMember.token, cardId: "attack-loyalist-penalty", targetId: loyalist.id });
  await takeDamageIfPending(loyalistPenaltyGame.code, loyalistMember.token);
  const penalisedState = await state(loyalistPenaltyGame.code, lordMember.token);
  const penalised = { status: penalisedState.status, data: { room: penalisedState.data } };
  assert.equal(penalised.status, 200); assert.equal(penalised.data.room.status, "playing");
  assert.equal(penalised.data.room.myHand.length, 0, "the Lord discards every remaining hand card after defeating a Loyalist");
  assert.equal(penalised.data.room.players.find((player) => player.id === loyalist.id).alive, false);
  assert.equal(penalised.data.room.players.find((player) => player.id === loyalist.id).handCount, 0, "a defeated player's hand is cleared");
  assert.deepEqual(penalised.data.room.players.find((player) => player.id === lord.id).equipmentCards, [], "the Lord's Loyalist-kill penalty clears equipment");
  assert.deepEqual(penalised.data.room.players.find((player) => player.id === loyalist.id).equipmentCards, [], "a defeated player's equipment is cleared");
  assert.ok(discardIds(loyalistPenaltyGame.code).includes("zhugecrossbow-lord-penalty"));
  assert.ok(discardIds(loyalistPenaltyGame.code).includes("zhugecrossbow-defeated-discard"));
  assert.ok(penalised.data.room.timeline.some((event) => event.type === "cards" && event.action === "discard" && event.player === "Host" && event.cards.length === 2));
  assert.ok(penalised.data.room.timeline.some((event) => event.type === "cards" && event.action === "discard" && event.player === "Alice" && event.cards.length === 2));
  assert.ok(penalised.data.room.timeline.some((event) => /Lord's penalty/.test(event.message ?? "")));

  setHand(lord.id, [card("Attack", "traitor-no-reward"), card("DrawTwo", "traitor-no-reward")], 5, 5);
  setHand(traitor.id, [card("Dismantle", "traitor-defeated")], 1, 4); setTurn(loyalistPenaltyGame.code, lord.seat);
  await requestAndSettle("play_card", { code: loyalistPenaltyGame.code, token: lordMember.token, cardId: "attack-traitor-no-reward", targetId: traitor.id });
  await takeDamageIfPending(loyalistPenaltyGame.code, traitorTargetMember.token);
  const noTraitorReward = { data: { room: (await state(loyalistPenaltyGame.code, lordMember.token)).data } };
  assert.equal(noTraitorReward.data.room.myHand.length, 1, "defeating the Traitor grants no cards and applies no penalty");
  assert.equal(noTraitorReward.data.room.players.find((player) => player.id === traitor.id).handCount, 0);

  const nonLordGame = await createHumanGame();
  const [rebelMember, loyalistTargetMember] = nonLordGame.members; const [rebelKiller, loyalistTarget, livingLord, livingTraitor] = nonLordGame.room.players;
  sql(`UPDATE players SET role='Rebel' WHERE id=${quote(rebelKiller.id)}; UPDATE players SET role='Loyalist' WHERE id=${quote(loyalistTarget.id)}; UPDATE players SET role='Lord' WHERE id=${quote(livingLord.id)}; UPDATE players SET role='Renegade' WHERE id=${quote(livingTraitor.id)}`);
  setHand(rebelKiller.id, [card("Attack", "nonlord-loyalist"), card("DrawTwo", "nonlord-keeps")], 4, 4); setHand(loyalistTarget.id, [], 1, 4); setHand(livingLord.id, [], 5, 5); setHand(livingTraitor.id, [], 4, 4); setTurn(nonLordGame.code, rebelKiller.seat);
  await requestAndSettle("play_card", { code: nonLordGame.code, token: rebelMember.token, cardId: "attack-nonlord-loyalist", targetId: loyalistTarget.id });
  await takeDamageIfPending(nonLordGame.code, loyalistTargetMember.token);
  const unpenalised = { data: { room: (await state(nonLordGame.code, rebelMember.token)).data } };
  assert.equal(unpenalised.data.room.myHand.length, 1, "a non-Lord receives no penalty for defeating a Loyalist");

  const rebelRewardGame = await createHumanGame();
  const [traitorMember, rebelTargetMember] = rebelRewardGame.members; const [traitorKiller, rebelTarget, rewardLord, rewardLoyalist] = rebelRewardGame.room.players;
  sql(`UPDATE players SET role='Renegade' WHERE id=${quote(traitorKiller.id)}; UPDATE players SET role='Rebel' WHERE id=${quote(rebelTarget.id)}; UPDATE players SET role='Lord' WHERE id=${quote(rewardLord.id)}; UPDATE players SET role='Loyalist' WHERE id=${quote(rewardLoyalist.id)}`);
  setHand(traitorKiller.id, [card("Attack", "rebel-reward"), card("DrawTwo", "reward-kept")], 4, 4); setHand(rebelTarget.id, [], 1, 4); setHand(rewardLord.id, [], 5, 5); setHand(rewardLoyalist.id, [], 4, 4); setTurn(rebelRewardGame.code, traitorKiller.seat);
  await requestAndSettle("play_card", { code: rebelRewardGame.code, token: traitorMember.token, cardId: "attack-rebel-reward", targetId: rebelTarget.id });
  await takeDamageIfPending(rebelRewardGame.code, rebelTargetMember.token);
  const rewarded = { data: { room: (await state(rebelRewardGame.code, traitorMember.token)).data } };
  assert.equal(rewarded.data.room.myHand.length, 4, "a Traitor also draws three cards for defeating a Rebel");
  assert.ok(rewarded.data.room.timeline.some((event) => /draws 3 reward cards/.test(event.message ?? "")));
  const rewardArrivals = rewarded.data.room.timeline.filter((event) => event.type === "card" && event.privateHandTransfer);
  assert.equal(rewardArrivals.length, 3, "the committed Rebel reward has one owner-private receipt per card");
  assert.ok(rewardArrivals.every((event) => event.privateHandTransfer.recipientId === traitorKiller.id
    && event.privateHandTransfer.sourceZone === "deck"
    && rewarded.data.room.myHand.some((held) => held.id === event.card.id)));
  const rewardObserver = (await state(rebelRewardGame.code, rebelTargetMember.token)).data;
  assert.equal(rewardObserver.timeline.some((event) => event.privateHandTransfer), false);
  assert.ok(rewardArrivals.every((event) => !JSON.stringify(rewardObserver).includes(event.card.id)));

  const traitorVictoryGame = await createHumanGame();
  const [finalLordMember, traitorWinner] = traitorVictoryGame.members; const [finalLord, finalTraitor, deadRebel, deadLoyalist] = traitorVictoryGame.room.players;
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(finalLord.id)}; UPDATE players SET role='Renegade' WHERE id=${quote(finalTraitor.id)}; UPDATE players SET role='Rebel',alive=0,hp=0,hand_json='[]' WHERE id=${quote(deadRebel.id)}; UPDATE players SET role='Loyalist',alive=0,hp=0,hand_json='[]' WHERE id=${quote(deadLoyalist.id)}`);
  setHand(finalLord.id, [], 1, 5); setHand(finalTraitor.id, [card("Attack", "traitor-victory")], 4, 4); setTurn(traitorVictoryGame.code, finalTraitor.seat);
  await requestAndSettle("play_card", { code: traitorVictoryGame.code, token: traitorWinner.token, cardId: "attack-traitor-victory", targetId: finalLord.id });
  const traitorVictory = await takeDamageIfPending(traitorVictoryGame.code, finalLordMember.token);
  assert.equal(traitorVictory.data.room.status, "finished"); assert.equal(traitorVictory.data.room.phase, "finished"); assert.equal(traitorVictory.data.room.pending, null); assert.equal(traitorVictory.data.room.currentAction.actorId, null); assert.equal(traitorVictory.data.room.currentAction.kind, "none"); assert.ok(traitorVictory.data.room.timeline.some((event) => /Traitor victory/.test(event.message ?? "")));

  const rebelVictoryGame = await createHumanGame();
  const [fallenLordMember, falseTraitor] = rebelVictoryGame.members; const [fallenLord, attackingTraitor, survivingRebel, fallenLoyalist] = rebelVictoryGame.room.players;
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(fallenLord.id)}; UPDATE players SET role='Renegade' WHERE id=${quote(attackingTraitor.id)}; UPDATE players SET role='Rebel' WHERE id=${quote(survivingRebel.id)}; UPDATE players SET role='Loyalist',alive=0,hp=0,hand_json='[]' WHERE id=${quote(fallenLoyalist.id)}`);
  setHand(fallenLord.id, [], 1, 5); setHand(attackingTraitor.id, [card("Attack", "rebel-victory")], 4, 4); setHand(survivingRebel.id, [], 4, 4); setTurn(rebelVictoryGame.code, attackingTraitor.seat);
  await requestAndSettle("play_card", { code: rebelVictoryGame.code, token: falseTraitor.token, cardId: "attack-rebel-victory", targetId: fallenLord.id });
  const rebelVictory = await takeDamageIfPending(rebelVictoryGame.code, fallenLordMember.token);
  assert.equal(rebelVictory.data.room.status, "finished"); assert.ok(rebelVictory.data.room.timeline.some((event) => /Rebel victory/.test(event.message ?? "")));
});

test("interrupted End Turn and Beauty payment recover from one private checkpoint", { timeout: 60_000 }, async () => {
  const game = await createHumanGame();
  const players = game.room.players;
  const [actor, next] = players;
  const [member] = game.members;
  const token = member.token;
  const code = game.code;
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  const filter = `id=${quote(roomId)}`;
  const snapshot = () => JSON.parse(query(`SELECT json_array(phase,pending_json,log_json,turn_epoch) FROM rooms WHERE ${filter}`));
  const own = players.map((_, seat) => card("Dodge", `turn-end-private-${seat}`));
  const beautyDraw = card("Peach", "turn-end-beauty-payment");
  players.forEach((player, seat) => setHand(player.id, [own[seat]], 4, 4));
  sql(`UPDATE players SET hero=CASE seat WHEN ${actor.seat} THEN 'diao-chan' ELSE 'zhang-fei' END WHERE room_id=${quote(roomId)}`);
  setDeck(code, [beautyDraw]);
  setTurn(code, actor.seat);
  const before = snapshot();
  const initial = (await state(code, token)).data;
  const payload = { code, token, context: { actionRevision: initial.actionRevision, meId: actor.id, actorId: actor.id, phase: initial.phase } };
  const failedPost = async (action, data) => {
    const response = await fetch(new URL("/api/rooms", process.env.GAME_TEST_URL ?? "http://localhost:3137"), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...data }),
    });
    assert.equal(response.status, 500);
    await response.body?.cancel();
  };

  sql(`CREATE TRIGGER abort_end_turn_entry BEFORE UPDATE OF phase ON rooms
    WHEN OLD.id=${quote(roomId)} AND NEW.phase='resolving'
    BEGIN SELECT RAISE(ABORT, 'interrupted checkpoint entry'); END;`);
  try {
    await failedPost("end_turn", payload);
    assert.deepEqual(snapshot(), before, "an interrupted first write leaves the legal Play decision unchanged");
  } finally {
    sql("DROP TRIGGER abort_end_turn_entry");
  }

  const stallSettlement = () => sql(`CREATE TRIGGER abort_end_turn_exit BEFORE UPDATE OF phase ON rooms
    WHEN OLD.id=${quote(roomId)} AND json_extract(OLD.pending_json,'$.kind')='turn_end_checkpoint'
    BEGIN SELECT RAISE(ABORT, 'interrupted checkpoint settlement'); END;`);
  stallSettlement();
  try {
    await failedPost("end_turn", payload);
    const paused = snapshot();
    assert.equal(paused[0], "resolving");
    assert.equal(JSON.parse(paused[1]).kind, "turn_end_checkpoint");
    assert.equal(paused[3], before[3]);
    for (const outsider of ["", "not-a-room-member"]) {
      const { data } = await state(code, outsider);
      assert.equal(data.pending, null);
      assert.equal(data.currentAction.kind, "none");
      assert.deepEqual(data.currentAction.legalActions, []);
      assert.ok(own.every(({ id }) => !JSON.stringify(data).includes(id)));
    }
    assert.deepEqual(snapshot(), paused, "unauthenticated reads neither reveal nor advance the checkpoint");
  } finally {
    sql("DROP TRIGGER abort_end_turn_exit");
  }

  await Promise.all([request("advance_timers", { code, token }), ...game.members.map((viewer) => state(code, viewer.token))]);
  const views = await Promise.all(game.members.map((viewer) => state(code, viewer.token)));
  const triggerView = views[0].data;
  assert.equal(triggerView.phase, "response");
  assert.equal(triggerView.currentAction.triggerOptions[0].effectId, "diao_chan_beauty_outshining_moon");
  for (const [index, { data }] of views.entries()) {
    assert.deepEqual(data.myHand.map(({ id }) => id), [own[index].id]);
    assert.ok(own.every(({ id }, seat) => seat === index || !JSON.stringify(data).includes(id)));
    assert.ok(data.myRole);
    const lordId = data.players.find(({ role }) => role === "Lord")?.id;
    for (const publicPlayer of data.players) {
      if (publicPlayer.id !== players[index].id && publicPlayer.id !== lordId) assert.equal(publicPlayer.role, null);
    }
    if (index !== 0) assert.deepEqual(data.currentAction.legalActions, []);
  }
  const activation = { code, token, providerId: "diao_chan_beauty_outshining_moon",
    context: { actionRevision: triggerView.actionRevision, actorId: actor.id, meId: actor.id, phase: "response" } };
  stallSettlement();
  try {
    await failedPost("trigger", activation);
    const paused = snapshot();
    assert.equal(JSON.parse(paused[1]).continuation.resolvedEffectIds.includes("diao_chan_beauty_outshining_moon"), true);
    assert.equal(roomCardCount(code, beautyDraw.id), 1);
  } finally {
    sql("DROP TRIGGER abort_end_turn_exit");
  }
  const replay = await Promise.all([request("trigger", activation), ...game.members.map((viewer) => state(code, viewer.token))]);
  assert.equal(replay[0].status, 409);
  const restored = (await state(code, token)).data;
  assert.equal(restored.phase, "draw");
  assert.equal(restored.currentAction.actorId, next.id);
  assert.equal(snapshot()[3], before[3] + 1);
  assert.equal(restored.myHand.filter(({ id }) => id === beautyDraw.id).length, 1);
  assert.equal(restored.log.filter((log) => log.includes("finishes Play; the turn-end event begins")).length, 1);
  assert.equal(restored.log.filter((log) => log.includes("activated Beauty Outshining the Moon")).length, 1);
});

test("interrupted Peach recovery resumes from one private checkpoint", { timeout: 60_000 }, async () => {
  const game = await createHumanGame();
  const [actor] = game.room.players;
  const [{ token }] = game.members;
  const code = game.code;
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  const peach = card("Peach", "interrupted-recovery");
  setHand(actor.id, [peach], 2, 4);
  setEquipment(actor.id, {});
  sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(actor.id)}`);
  setTurn(code, actor.seat);
  const before = (await state(code, token)).data;
  const payload = {
    code,
    token,
    cardId: peach.id,
    context: { actionRevision: before.actionRevision, meId: actor.id, actorId: actor.id, phase: before.phase },
  };
  const roomSnapshot = () => JSON.parse(query(`SELECT json_object('phase',phase,'pending',pending_json,'log',log_json,'turnEpoch',turn_epoch) FROM rooms WHERE id=${quote(roomId)}`));
  const playerSnapshot = () => JSON.parse(query(`SELECT json_object('hand',hand_json,'hp',hp) FROM players WHERE id=${quote(actor.id)}`));
  const beforeRoom = roomSnapshot();
  const beforePlayer = playerSnapshot();
  const failedPost = async () => {
    const response = await fetch(new URL("/api/rooms", process.env.GAME_TEST_URL ?? "http://localhost:3137"), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "play_card", ...payload }),
    });
    assert.equal(response.status, 500);
    await response.body?.cancel();
  };

  sql(`CREATE TRIGGER abort_peach_checkpoint_entry BEFORE UPDATE OF phase ON rooms
    WHEN OLD.id=${quote(roomId)} AND NEW.phase='resolving'
    BEGIN SELECT RAISE(ABORT, 'interrupted Peach checkpoint entry'); END;`);
  try {
    await failedPost();
    assert.deepEqual(roomSnapshot(), beforeRoom, "an interrupted checkpoint entry leaves the Play decision unchanged");
    assert.deepEqual(playerSnapshot(), beforePlayer, "an interrupted checkpoint entry leaves the Peach in hand");
  } finally {
    sql("DROP TRIGGER abort_peach_checkpoint_entry");
  }

  sql(`CREATE TRIGGER abort_peach_checkpoint_settlement BEFORE UPDATE OF phase ON rooms
    WHEN OLD.id=${quote(roomId)} AND json_extract(OLD.pending_json,'$.kind')='recovery_checkpoint' AND NEW.phase <> 'resolving'
    BEGIN SELECT RAISE(ABORT, 'interrupted Peach checkpoint settlement'); END;`);
  try {
    await failedPost();
    const paused = roomSnapshot();
    const pausedPlayer = playerSnapshot();
    assert.equal(paused.phase, "resolving");
    assert.equal(JSON.parse(paused.pending).kind, "recovery_checkpoint");
    assert.equal(JSON.parse(paused.pending).effect, "peach");
    assert.equal(paused.turnEpoch, beforeRoom.turnEpoch);
    assert.equal(JSON.parse(pausedPlayer.hand).some(({ id }) => id === peach.id), false);
    assert.equal(pausedPlayer.hp, 3);
    const publicView = (await state(code, "")).data;
    assert.equal(publicView.pending, null, "unauthenticated reads do not expose the recovery checkpoint");
    assert.equal(publicView.currentAction.kind, "none");
    assert.equal(publicView.currentAction.legalActions.length, 0);
    assert.equal(JSON.stringify(publicView).includes("recovery_checkpoint"), false);
  } finally {
    sql("DROP TRIGGER abort_peach_checkpoint_settlement");
  }

  const recovered = await Promise.all([state(code, token), state(code, token)]);
  assert.equal(recovered[0].data.phase, "play");
  assert.equal(recovered[0].data.players.find(({ id }) => id === actor.id).hp, 3);
  assert.equal(recovered[0].data.myHand.some(({ id }) => id === peach.id), false);
  assert.equal(recovered[0].data.log.filter((entry) => entry.includes("plays Peach and recovers 1 HP")).length, 1);
  assert.equal(discardIds(code).filter((id) => id === peach.id).length, 1);
  assert.equal(roomCardCount(code, peach.id), 1);
  assert.equal(query(`SELECT json_extract(pending_json,'$.kind') FROM rooms WHERE id=${quote(roomId)}`), "");
  for (const viewer of game.members) {
    const view = (await state(code, viewer.token)).data;
    assert.equal(view.myHand.some(({ id }) => id === peach.id), false);
  }
});

test("interrupted Discard commits its payment and public handoff at most once", { timeout: 60_000 }, async () => {
  const game = await createHumanGame();
  const [actor, next] = game.room.players;
  const [{ token }] = game.members;
  const code = game.code;
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  const keep = card("Dodge", "recover-discard-keep");
  const discard = card("Peach", "recover-discard-pay");
  sql(`UPDATE players SET hero='zhang-fei' WHERE room_id=${quote(roomId)}`);
  setHand(actor.id, [keep, discard], 1, 4);
  setTurn(code, actor.seat, "discard");
  const view = (await state(code, token)).data;
  const payload = { code, token, cardIds: [discard.id], context: {
    phase: "discard", actorId: actor.id, meId: actor.id, actionRevision: view.actionRevision,
  } };
  const epoch = Number(query(`SELECT turn_epoch FROM rooms WHERE id=${quote(roomId)}`));
  const failedDiscard = async () => {
    const response = await fetch(new URL("/api/rooms", process.env.GAME_TEST_URL ?? "http://localhost:3137"), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "discard_cards", ...payload }),
    });
    assert.equal(response.status, 500);
    await response.body?.cancel();
  };

  sql(`CREATE TRIGGER abort_discard_payment BEFORE UPDATE OF hand_json ON players
    WHEN OLD.id=${quote(actor.id)} BEGIN SELECT RAISE(ABORT, 'interrupted discard payment'); END;`);
  try {
    await failedDiscard();
    assert.equal((await state(code, token)).data.actionRevision, view.actionRevision);
    assert.ok(!discardIds(code).includes(discard.id));
  } finally {
    sql("DROP TRIGGER abort_discard_payment");
  }
  sql(`CREATE TRIGGER abort_discard_handoff BEFORE UPDATE OF phase ON rooms
    WHEN OLD.id=${quote(roomId)} AND json_extract(OLD.pending_json,'$.kind')='turn_end_checkpoint'
    BEGIN SELECT RAISE(ABORT, 'interrupted discard handoff'); END;`);
  try {
    await failedDiscard();
    assert.equal(query(`SELECT json_extract(pending_json,'$.kind') FROM rooms WHERE id=${quote(roomId)}`), "turn_end_checkpoint");
    assert.equal(discardIds(code).filter((id) => id === discard.id).length, 1);
    assert.equal(roomCardCount(code, discard.id), 1);
  } finally {
    sql("DROP TRIGGER abort_discard_handoff");
  }

  const [replay] = await Promise.all([request("discard_cards", payload), ...game.members.map((viewer) => state(code, viewer.token))]);
  assert.equal(replay.status, 409);
  const handoff = (await state(code, token)).data;
  assert.equal(handoff.phase, "resolving");
  assert.equal(handoff.publicDiscardHandoff.cardCount, 1);
  assert.deepEqual(handoff.currentAction.legalActions, []);
  assert.equal(Number(query(`SELECT turn_epoch FROM rooms WHERE id=${quote(roomId)}`)), epoch);
  const eventId = handoff.publicDiscardHandoff.eventId;
  assert.equal(handoff.timeline.filter(({ id }) => id === eventId).length, 1);
  assert.equal((await request("draw", { code, token: game.members[1].token })).status, 409);

  sql(`UPDATE rooms SET pending_json=json_set(pending_json,'$.deadline',${Date.now() - 1}) WHERE id=${quote(roomId)}`);
  await Promise.all(game.members.map((viewer) => state(code, viewer.token)));
  const restored = (await state(code, token)).data;
  assert.equal(restored.phase, "draw");
  assert.equal(restored.currentAction.actorId, next.id);
  assert.equal(Number(query(`SELECT turn_epoch FROM rooms WHERE id=${quote(roomId)}`)), epoch + 1);
  assert.deepEqual(restored.myHand.map(({ id }) => id), [keep.id]);
  assert.equal(discardIds(code).filter((id) => id === discard.id).length, 1);
});

test("defeated current-turn owner persists and recovers one private handoff", { timeout: 60_000 }, async () => {
  const game = await createHumanGame();
  const [ownerMember, opponentMember, lordMember] = game.members;
  const [owner, opponent, lord, other] = game.room.players;
  const code = game.code;
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  const duel = card("Duel", "defeat-handoff");
  const attack = card("Attack", "defeat-handoff-reply");
  const hiddenOpponentCard = card("Dodge", "defeat-handoff-private");

  // The owner is a non-Lord so a four-seat match remains non-terminal after
  // the lethal Duel loss.  All heroes are pinned to a no-trigger fixture.
  sql(`UPDATE players SET role=CASE seat WHEN ${owner.seat} THEN 'Rebel' WHEN ${opponent.seat} THEN 'Loyalist' WHEN ${lord.seat} THEN 'Lord' ELSE 'Renegade' END, hero='zhao-yun' WHERE room_id=${quote(roomId)}`);
  setHand(owner.id, [duel], 1, 4);
  setHand(opponent.id, [attack, hiddenOpponentCard], 4, 4);
  setHand(lord.id, [], 4, 4);
  setHand(other.id, [], 4, 4);
  setTurn(code, owner.seat, "play");

  const duelOpened = await request("play_card", { code, token: ownerMember.token, cardId: duel.id, targetId: opponent.id });
  assert.equal(duelOpened.status, 200, JSON.stringify(duelOpened.data));
  assert.equal(duelOpened.data.room.currentAction.kind, "response");
  assert.ok(duelOpened.data.room.currentAction.negationWindowId);
  await passNegationWindows(code, game.members);
  const duelTargetView = (await state(code, opponentMember.token)).data;
  assert.equal(duelTargetView.currentAction.kind, "response");
  assert.equal(duelTargetView.currentAction.actorId, opponent.id);

  const duelAnswered = await request("respond", { code, token: opponentMember.token, providerId: "card", cardId: attack.id });
  assert.equal(duelAnswered.status, 200, JSON.stringify(duelAnswered.data));
  const ownerResponse = (await state(code, ownerMember.token)).data;
  assert.equal(ownerResponse.currentAction.kind, "response");
  assert.equal(ownerResponse.currentAction.actorId, owner.id);

  const duelLost = await request("decline_response", { code, token: ownerMember.token });
  assert.equal(duelLost.status, 200, JSON.stringify(duelLost.data));
  const dying = (await state(code, ownerMember.token)).data;
  assert.equal(dying.phase, "dying", JSON.stringify(dying));
  assert.equal(dying.pendingDying.targetId, owner.id);

  const failedPost = async (token) => {
    const view = (await state(code, token)).data;
    const response = await fetch(new URL("/api/rooms", process.env.GAME_TEST_URL ?? "http://localhost:3137"), {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "skip_rescue", code, token, windowId: view.currentAction.sharedWindow?.windowId }),
    });
    assert.equal(response.status, 500);
    await response.body?.cancel();
  };

  // The old implementation committed death, then exposed play with the dead
  // seat before the separate continuation.  Keep that boundary armed so the
  // regression proves the new checkpoint is the only committed handoff.
  sql(`CREATE TRIGGER abort_legacy_defeat_handoff BEFORE UPDATE OF phase ON rooms
    WHEN OLD.id=${quote(roomId)} AND OLD.phase='resolving' AND NEW.phase='resolving' AND NEW.pending_json IS NULL
      AND json_extract(OLD.pending_json,'$.kind') != 'defeat_handoff'
    BEGIN SELECT RAISE(ABORT, 'interrupted legacy defeat handoff'); END;`);
  sql(`CREATE TRIGGER abort_defeat_checkpoint_start BEFORE UPDATE OF phase ON rooms
    WHEN OLD.id=${quote(roomId)} AND OLD.phase='resolving' AND json_extract(OLD.pending_json,'$.kind')='defeat_handoff' AND NEW.phase IN ('draw','response')
    BEGIN SELECT RAISE(ABORT, 'interrupted defeat checkpoint start'); END;`);
  try {
    let finalRescueToken = ownerMember.token;
    for (let guard = 0; guard < game.members.length + 1; guard++) {
      const open = [];
      for (const member of game.members) {
        const view = (await state(code, member.token)).data;
        if (view.currentAction?.legalActions?.includes("skip_rescue") && !view.currentAction.sharedWindow?.locked) open.push(member);
      }
      assert.ok(open.length > 0, "a shared Dying window keeps one pass available");
      finalRescueToken = open[open.length - 1].token;
      if (open.length === 1) break;
      const passed = await request("skip_rescue", { code, token: open[0].token });
      assert.equal(passed.status, 200, JSON.stringify(passed.data));
    }
    await failedPost(finalRescueToken);
    const persisted = JSON.parse(query(`SELECT json_object('phase',phase,'pending',pending_json,'turnSeat',turn_seat,'turnEpoch',turn_epoch) FROM rooms WHERE id=${quote(roomId)}`));
    assert.equal(persisted.phase, "resolving");
    assert.equal(JSON.parse(persisted.pending).kind, "defeat_handoff");
    assert.equal(persisted.turnSeat, owner.seat);
    assert.equal(Number(persisted.turnEpoch), Number(query(`SELECT turn_epoch FROM rooms WHERE id=${quote(roomId)}`)));
    const defeated = JSON.parse(query(`SELECT json_object('alive',alive,'hp',hp,'hand',hand_json) FROM players WHERE id=${quote(owner.id)}`));
    assert.equal(defeated.alive, 0);
    assert.equal(defeated.hp, 0);
    assert.deepEqual(JSON.parse(defeated.hand), []);

    // The internal checkpoint is hidden from both anonymous and authenticated
    // public projections while the recovery write is fault-injected.
    const hidden = await state(code, "");
    assert.equal(hidden.data.pending, null);
    assert.equal(hidden.data.currentAction.kind, "none");
    assert.deepEqual(hidden.data.currentAction.legalActions, []);
    assert.equal(JSON.stringify(hidden.data).includes("defeat_handoff"), false);
  } finally {
    sql("DROP TRIGGER abort_legacy_defeat_handoff");
    sql("DROP TRIGGER abort_defeat_checkpoint_start");
  }

  const epoch = Number(query(`SELECT turn_epoch FROM rooms WHERE id=${quote(roomId)}`));
  const [first, second] = await Promise.all([state(code, ownerMember.token), state(code, opponentMember.token)]);
  assert.equal(first.data.phase, "draw");
  assert.equal(first.data.turnSeat, opponent.seat);
  assert.equal(first.data.currentAction.actorId, opponent.id);
  assert.equal(second.data.phase, "draw");
  assert.equal(Number(query(`SELECT turn_epoch FROM rooms WHERE id=${quote(roomId)}`)), epoch + 1);
  assert.equal(query(`SELECT json_extract(pending_json,'$.kind') FROM rooms WHERE id=${quote(roomId)}`), "");
  assert.equal(query(`SELECT COUNT(*) FROM players WHERE id=${quote(owner.id)} AND alive=0 AND hp=0`), "1");
  assert.equal((await state(code, ownerMember.token)).data.isMyAction, false);
  assert.equal((await state(code, ownerMember.token)).data.myHand.some(({ id }) => id === duel.id), false);
  assert.equal((await state(code, ownerMember.token)).data.currentAction.actorId, opponent.id);
  assert.equal((await state(code, lordMember.token)).data.currentAction.actorId, opponent.id);
  assert.equal(JSON.stringify(first.data).includes(hiddenOpponentCard.id), false, "private opponent hand stays private");
});
