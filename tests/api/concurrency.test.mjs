/* eslint-disable @typescript-eslint/no-unused-vars */
import test from "node:test";
import {
  assert, card, createHumanGame, createHumanSetupGame, createTestGame, createTestLobby, discardIds, distributeLegacy, drainEmptyPrivateDecisions, markReady, normalizeRoomData, openBorrowedSwordScenario, openFankuiAttack, openGanglieAttack, openGanglieGroup, openGuoDamage, openHujiaScenario, passNegationWindows, prepareGuoJudgement, query, quote, request, requestAndSettle, roomCardCount, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state, takeDamageIfPending, waitForState,
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
  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "dismantle-semantic-negate", targetId: alicePlayer.id, targetCardIndex: 0 });
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
  assert.deepEqual(attack.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["test_damage_about_to_apply_a", "test_damage_about_to_apply_b"]);

  await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_a" });
  const afterB = await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_b" });
  assert.equal(afterB.status, 200);
  assert.equal(afterB.data.room.phase, "dying");
  assert.equal(afterB.data.room.pending?.kind, "dying");
  assert.equal(afterB.data.room.currentAction.kind, "dying");
  assert.equal(afterB.data.room.pendingDying.targetId, alicePlayer.id);
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
  assert.equal(rescued.data.room.currentAction.kind, "turn");
  assert.equal(rescued.data.room.log.filter((entry) => /Alice takes 1 damage/.test(entry)).length, 1, "rescue does not replay damage");
  assert.equal(rescued.data.room.log.filter((entry) => /enters Dying/.test(entry)).length, 1, "Dying begins once");
  const persisted = query(`SELECT phase || ':' || COALESCE(pending_json, '') FROM rooms WHERE code=${quote(game.code)}`);
  assert.match(persisted, /^play-struck:$/, "the shared rescue pipeline returns to the turn sequence");
});

test("Dying uses one ordered rescue pass and does not revisit a passed actor", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice, bob, carol] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  setHand(hostPlayer.id, [card("Attack", "ordered-rescue"), card("Peach", "host-unused")], 4, 4);
  setHand(alicePlayer.id, [], -1, 4);
  sql(`UPDATE players SET role='Rebel' WHERE id=${quote(alicePlayer.id)}`);
  setHand(bobPlayer.id, [card("Peach", "ordered-bob")], 4, 4);
  setHand(carolPlayer.id, [card("Peach", "ordered-carol")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-ordered-rescue", targetId: alicePlayer.id });
  await takeDamageIfPending(game.code, alice.token);
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
});

test("the current Dying actor may give multiple Peaches consecutively", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice, bob] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer] = game.room.players;
  setHand(hostPlayer.id, [card("Attack", "consecutive-rescue")], 4, 4);
  setHand(alicePlayer.id, [], -1, 4);
  setHand(bobPlayer.id, [card("Peach", "consecutive-1"), card("Peach", "consecutive-2"), card("Peach", "consecutive-3")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-consecutive-rescue", targetId: alicePlayer.id });
  await takeDamageIfPending(game.code, alice.token);
  for (const [index, id] of ["peach-consecutive-1", "peach-consecutive-2", "peach-consecutive-3"].entries()) {
    const result = await requestAndSettle("give_peach", { code: game.code, token: bob.token, cardId: id });
    assert.equal(result.status, 200);
    const hp = result.data.room.players.find((player) => player.id === alicePlayer.id).hp;
    assert.equal(hp, [-1, 0, 1][index]);
    if (index < 2) assert.equal(result.data.room.actionPlayerId, bobPlayer.id, "Bob remains the rescue actor between consecutive Peaches");
  }
  assert.equal((await state(game.code, alice.token)).data.pendingDying, null);
});

test("a Dying actor may stop after a partial Peach without being revisited", { timeout: 30_000 }, async () => {
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

  const finished = await state(game.code, host.token);
  assert.equal(finished.data.players.find((player) => player.id === alicePlayer.id).hp, 4);
  assert.equal(finished.data.log.filter((entry) => /Alice plays Dodge and blocks the Attack/.test(entry)).length, 1, "Dodge is consumed and logged once");
  assert.equal(discardIds(game.code).filter((id) => id === "dodge-stale-response").length, 1, "the Dodge enters discard once");
  assert.notEqual(finished.data.phase, "resolving");
  assert.equal(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`), "", "the response does not strand the room");
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
  const results = await Promise.all([
    requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_b" }),
    requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_b" }),
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
  };
  const rescues = await Promise.all([
    requestAndSettle("give_peach", { code: game.code, token: bob.token, cardId: "peach-double-lethal", context: rescueContext }),
    requestAndSettle("give_peach", { code: game.code, token: bob.token, cardId: "peach-double-lethal", context: rescueContext }),
  ]);
  assert.equal(rescues.filter((result) => result.status === 200).length, 1, `exactly one Peach rescue claims Dying: ${JSON.stringify(rescues)}`);
  assert.equal(rescues.filter((result) => result.status === 409).length, 1, "the duplicate rescue is rejected");
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


