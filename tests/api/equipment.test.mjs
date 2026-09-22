/* eslint-disable @typescript-eslint/no-unused-vars */
import test from "node:test";
import {
  assert, card, createHumanGame, createHumanSetupGame, createTestGame, createTestLobby, discardIds, distributeLegacy, drainEmptyPrivateDecisions, markReady, normalizeRoomData, openBorrowedSwordScenario, openFankuiAttack, openGanglieAttack, openGanglieGroup, openGuoDamage, openHujiaScenario, passNegationWindows, prepareGuoJudgement, query, quote, request, requestAndSettle, roomCardCount, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state, takeDamageIfPending, waitForState,
} from "./test-support.mjs";

test("Raining Arrows and Barbarian Invasion resume through Xiahou Dun Stauchness", { timeout: 30_000 }, async () => {
  for (const kind of ["RainingArrows", "BarbarianInvasion"]) {
    const declined = await openGanglieGroup({ kind, suffix: `ganglie-${kind.toLowerCase()}-decline`, judge: { ...card("Dodge", `ganglie-${kind.toLowerCase()}-decline-judge`), suit: "♥", rank: "2" } });
    const skipped = await requestAndSettle("decline_trigger", { code: declined.code, token: declined.targetMember.token });
    assert.equal(skipped.status, 200, JSON.stringify(skipped.data));
    assert.equal(skipped.data.room.currentAction.kind, "response");
    assert.equal(skipped.data.room.currentAction.actorId, declined.bob.id, "declining Stauchness resumes the next AOE target");
    assert.equal(skipped.data.room.players.find((player) => player.id === declined.target.id).hp, 2);
    const bobAnswered = await requestAndSettle("respond", { code: declined.code, token: declined.bobMember.token, cardId: `${declined.required.toLowerCase()}-ganglie-${kind.toLowerCase()}-decline-bob` });
    const finished = await requestAndSettle("respond", { code: declined.code, token: declined.carolMember.token, cardId: `${declined.required.toLowerCase()}-ganglie-${kind.toLowerCase()}-decline-carol` });
    assert.equal(bobAnswered.status, 200); assert.equal(finished.status, 200, JSON.stringify(finished.data));
    assert.equal(finished.data.room.phase, "play");
    assert.equal(discardIds(declined.code).filter((id) => id === `${kind.toLowerCase()}-ganglie-${kind.toLowerCase()}-decline-source`).length, 1, "the held AOE card is discarded exactly once after completion");

    const accepted = await openGanglieGroup({ kind, suffix: `ganglie-${kind.toLowerCase()}-accept`, judge: { ...card("Dodge", `ganglie-${kind.toLowerCase()}-accept-judge`), suit: "♠", rank: "7" } });
    const judged = await requestAndSettle("trigger", { code: accepted.code, token: accepted.targetMember.token, providerId: "xiahou_dun_ganglie" });
    assert.equal(judged.status, 200, JSON.stringify(judged.data));
    assert.equal(judged.data.room.currentAction.kind, "trigger");
    assert.equal(judged.data.room.currentAction.triggerEvent, "damage_suffered");
    assert.equal(judged.data.room.currentAction.actorId, accepted.source.id, "the Stauchness consequence belongs to the damage source");
    const consequence = await requestAndSettle("trigger", { code: accepted.code, token: accepted.sourceMember.token, providerId: "xiahou_dun_ganglie", choice: "take_damage" });
    assert.equal(consequence.status, 200, JSON.stringify(consequence.data));
    assert.equal(consequence.data.room.currentAction.kind, "response");
    assert.equal(consequence.data.room.currentAction.actorId, accepted.bob.id, "resolving Stauchness resumes the next AOE target");
    assert.equal(consequence.data.room.players.find((player) => player.id === accepted.target.id).hp, 2);
    assert.equal(consequence.data.room.players.find((player) => player.id === accepted.source.id).hp, 3);
    await requestAndSettle("respond", { code: accepted.code, token: accepted.bobMember.token, cardId: `${accepted.required.toLowerCase()}-ganglie-${kind.toLowerCase()}-accept-bob` });
    const acceptedFinished = await requestAndSettle("respond", { code: accepted.code, token: accepted.carolMember.token, cardId: `${accepted.required.toLowerCase()}-ganglie-${kind.toLowerCase()}-accept-carol` });
    assert.equal(acceptedFinished.status, 200, JSON.stringify(acceptedFinished.data));
    assert.equal(acceptedFinished.data.room.phase, "play");
    assert.equal(discardIds(accepted.code).filter((id) => id === `${kind.toLowerCase()}-ganglie-${kind.toLowerCase()}-accept-source`).length, 1, "accepting Stauchness does not duplicate the held AOE discard");
  }
});

test("host test flow follows the Xiahou Dun Group trigger perspective", { timeout: 30_000 }, async () => {
  const quick = await createTestGame();
  const { token, room } = quick.data;
  const [source, first, second, xiahou] = room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero=NULL WHERE id IN (${quote(first.id)},${quote(second.id)})`);
  sql(`UPDATE players SET hero='xiahou-dun' WHERE id=${quote(xiahou.id)}`);
  setHand(source.id, [card("RainingArrows", "quick-group-ganglie")], 4, 4);
  setHand(first.id, [], 3, 3); setHand(second.id, [], 3, 3); setHand(xiahou.id, [], 3, 3);
  setTurn(room.code, source.seat);
  const opened = await requestAndSettle("play_card", { code: room.code, token, cardId: "rainingarrows-quick-group-ganglie" });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  assert.equal(opened.data.room.currentAction.triggerEvent, "damage_suffered");
  assert.equal(opened.data.room.currentAction.actorId, xiahou.id);
  assert.equal(opened.data.room.meId, xiahou.id, "host test flow follows the Group trigger actor");
  assert.equal(opened.data.room.isMyAction, true);
  assert.deepEqual(opened.data.room.players.map((player) => player.handCards), [[], [], [], []]);
  const declined = await requestAndSettle("decline_trigger", { code: room.code, token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.phase, "play");
  assert.equal(discardIds(room.code).filter((id) => id === "rainingarrows-quick-group-ganglie").length, 1);
});

test("host test flow exhausts each AOE Negation window before the target response, with one private hand", async () => {
  for (const [kind, required] of [["RainingArrows", "Dodge"], ["BarbarianInvasion", "Attack"]]) {
  const created = await createTestGame(); const { token, room } = created.data;
  const [me, ...targets] = room.players;
  setHand(me.id, [card(kind, "perspective"), card("Negation", "perspective-user")], 3, 3);
  for (const target of targets) setHand(target.id, [card("Negation", `perspective-${target.seat}`), card(required, `perspective-${target.seat}`)], 3, 3);
  setTurn(room.code, me.seat);
  const act = (action, extra = {}) => requestAndSettle(action, { code: room.code, token, ...extra });
  let result = await act("play_card", { cardId: `${kind.toLowerCase()}-perspective` }); assert.equal(result.status, 200, JSON.stringify(result.data));
  for (const target of targets) {
    const ordered = room.players;
    for (const responder of ordered) {
      const view = result.data.room;
      assert.equal(view.meId, responder.id); assert.equal(view.actionPlayerId, responder.id);
      assert.ok(view.isMyAction); assert.ok(view.players.every((p) => p.handCards.length === 0));
      assert.deepEqual(view.myHand, JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(responder.id)}`)));
      assert.equal(view.myRole, view.players.find((p) => p.id === responder.id).role);
      result = await act("decline_response"); assert.equal(result.status, 200);
    }
    assert.equal(result.data.room.meId, target.id); assert.equal(result.data.room.pendingNegation, null);
    assert.equal(result.data.room.currentAction.requirement, required.toLowerCase());
    result = await act("respond", { cardId: `${required.toLowerCase()}-perspective-${target.seat}` }); assert.equal(result.status, 200);
    if (result.data.room.currentAction?.triggerEvent === "damage_suffered") {
      result = await act("decline_trigger"); assert.equal(result.status, 200, JSON.stringify(result.data));
    }
  }
  assert.equal(result.data.room.meId, me.id); assert.equal(result.data.room.phase, "play");
  assert.ok(result.data.room.players.every((p) => p.handCards.length === 0));
  setTurn(room.code, me.seat, "draw");
  const drawn = await act("draw");
  assert.ok(drawn.data.room.timeline.some((event) => event.drawPlayerId === me.id));
  assert.equal(drawn.data.drawnCards.length, 2);
  }
});

test("AOE counter rounds include their own Negation player last and resume the affected target", async () => {
  const created = await createTestGame(); const { token, room } = created.data;
  const [me, p1, p2, p3] = room.players;
  for (const p of room.players) setHand(p.id, [card("Negation", `self-${p.seat}`), card("Attack", `self-${p.seat}`)], 3, 3);
  setHand(me.id, [card("BarbarianInvasion", "self-root"), card("Negation", "self-0")], 3, 3);
  setHand(p1.id, [card("Negation", "self-1"), card("Attack", "self-1")], 3, 3);
  setHand(p2.id, [card("Negation", "self-again"), card("Attack", "self-2")], 3, 3);
  setTurn(room.code, me.seat);
  const act = (action, extra = {}) => requestAndSettle(action, { code: room.code, token, ...extra });
  let result = await act("play_card", { cardId: "barbarianinvasion-self-root" });
  assert.equal(result.data.room.actionPlayerId, me.id);
  assert.ok(result.data.room.responseCountdownVisibleAt > Date.now(), "an eligible Negation response receives a server-side timeout");
  await act("decline_response");
  result = await act("respond", { cardId: "negation-self-1" });
  assert.equal(result.data.room.actionPlayerId, p2.id); assert.equal(result.data.room.pendingNegation.chainDepth, 1); assert.equal(result.data.room.pendingNegation.negated, true); assert.equal(result.data.room.pendingNegation.latestNegationPlayerId, p1.id);
  result = await act("respond", { cardId: "negation-self-again" });
  assert.equal(result.data.room.pendingNegation.chainDepth, 2); assert.equal(result.data.room.pendingNegation.negated, false); assert.equal(result.data.room.pendingNegation.latestNegationPlayerId, p2.id);
  for (const p of [p3, me]) {
    assert.equal(result.data.room.actionPlayerId, p.id);
    assert.equal(result.data.room.pendingNegation.responseTarget, `${p2.name}'s Negation`);
    result = await act("decline_response");
  }
  assert.equal(result.data.room.pendingNegation, null);
  assert.equal(result.data.room.currentAction.actorId, p1.id);
  assert.equal(result.data.room.pendingGroup.requiredKind, "Attack");
  result = await act("respond", { cardId: "attack-self-1" });
  assert.equal(result.data.room.pendingNegation.effectTargetId, p2.id);
});

test("AOE Attack capability preserves legal conversions and auto-damages only without a response", async () => {
  const created = await createTestGame(); const { token, room } = created.data;
  const [me, p1, p2, p3] = room.players;
  for (const p of room.players) { setHand(p.id, [], 3, 3); setEquipment(p.id, {}); }
  setHand(me.id, [card("BarbarianInvasion", "capability")], 3, 3);
  setHand(p1.id, [card("Dodge", "cost1"), card("Peach", "cost2")], 3, 3);
  setEquipment(p1.id, { weapon: card("SerpentSpear", "capability") });
  setTurn(room.code, me.seat);
  const act = (action, extra = {}) => requestAndSettle(action, { code: room.code, token, ...extra });
  let result = await act("play_card", { cardId: "barbarianinvasion-capability" });
  assert.equal(result.data.room.currentAction.actorId, p1.id, "no normal Attack, but a legal alternative keeps the decision open");
  assert.equal((await act("respond", { cardIds: ["dodge-cost1"] })).status, 409);
  result = await act("respond", { cardIds: ["dodge-cost1", "peach-cost2"] });
  if (result.data.room.currentAction?.triggerEvent === "damage_suffered") result = await act("decline_trigger");
  assert.equal(result.data.room.phase, "play");
  assert.equal(result.data.room.players.find(p => p.id === p1.id).hp, 3);
  for (const p of [p2, p3]) assert.equal(result.data.room.players.find(player => player.id === p.id).hp, 2);
});

test("human seat switching preserves private decisions across response and trigger chains", async () => {
  const game = await createHumanGame();
  const [host, alice, bob] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer] = game.room.players;
  const ids = (room) => room.myHand.map((held) => held.id).sort();

  // Ordinary response: the attack changes the acting seat from Host to Alice.
  setHand(hostPlayer.id, [card("Attack", "seat-switch")], 4, 4);
  setHand(alicePlayer.id, [card("Dodge", "seat-switch"), card("Peach", "alice-private")], 4, 4);
  setHand(bobPlayer.id, [card("Attack", "bob-private")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-seat-switch", targetId: alicePlayer.id });
  assert.equal(opened.status, 200);
  const hostResponse = (await state(game.code, host.token)).data;
  const aliceResponse = (await state(game.code, alice.token)).data;
  const bobResponse = (await state(game.code, bob.token)).data;
  const responseResolutionId = aliceResponse.currentAction.presentation.resolutionId;
  assert.equal(hostResponse.meId, hostPlayer.id);
  assert.equal(aliceResponse.meId, alicePlayer.id);
  assert.equal(aliceResponse.actionPlayerId, alicePlayer.id);
  assert.equal(aliceResponse.isMyAction, true);
  assert.equal(hostResponse.isMyAction, false);
  assert.equal(bobResponse.isMyAction, false);
  assert.deepEqual(ids(aliceResponse), ["dodge-seat-switch", "peach-alice-private"]);
  assert.deepEqual(ids(hostResponse), []);
  assert.deepEqual(ids(bobResponse), ["attack-bob-private"]);
  assert.ok(aliceResponse.currentAction.options.some((option) => option.providerId === "card"));
  assert.deepEqual(hostResponse.currentAction.options ?? [], []);
  assert.deepEqual(bobResponse.currentAction.options ?? [], []);
  assert.equal(hostResponse.currentAction.presentation.resolutionId, responseResolutionId);
  assert.equal(bobResponse.currentAction.presentation.resolutionId, responseResolutionId);
  assert.equal((await requestAndSettle("respond", { code: game.code, token: host.token, providerId: "card", cardId: "dodge-seat-switch" })).status, 409, "the previous seat cannot answer after the actor changes");
  const answered = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-seat-switch" });
  assert.equal(answered.status, 200);
  assert.equal(answered.data.room.phase, "play-struck");
  assert.equal((await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-seat-switch" })).status, 409, "the same response cannot resolve twice");
  assert.equal((await state(game.code, host.token)).data.players.find((player) => player.id === alicePlayer.id).hp, 4);

  // Trigger chain: Dodge changes the actor to Host for Green Dragon, then the
  // follow-up Attack changes it back to Bob for the ordinary response.
  setEquipment(hostPlayer.id, { weapon: card("GreenDragonBlade", "seat-switch") });
  setHand(hostPlayer.id, [card("Attack", "trigger-first"), card("Attack", "trigger-follow-up")], 4, 4);
  setHand(alicePlayer.id, [], 4, 4);
  setHand(bobPlayer.id, [card("Dodge", "trigger-response"), card("Peach", "bob-private")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  const triggerAttack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-trigger-first", targetId: bobPlayer.id });
  assert.equal(triggerAttack.status, 200);
  const dodged = await requestAndSettle("respond", { code: game.code, token: bob.token, providerId: "card", cardId: "dodge-trigger-response" });
  assert.equal(dodged.status, 200);
  setHand(bobPlayer.id, [card("Dodge", "trigger-response"), card("Peach", "bob-private")], 4, 4);
  const hostTrigger = (await state(game.code, host.token)).data;
  const bobBeforeTrigger = (await state(game.code, bob.token)).data;
  const triggerResolutionId = hostTrigger.currentAction.presentation.resolutionId;
  assert.equal(hostTrigger.meId, hostPlayer.id);
  assert.equal(hostTrigger.actionPlayerId, hostPlayer.id);
  assert.equal(hostTrigger.currentAction.kind, "trigger");
  assert.ok(hostTrigger.currentAction.triggerOptions.some((option) => option.effectId === "green_dragon_blade_attack_dodged"));
  assert.equal(bobBeforeTrigger.meId, bobPlayer.id);
  assert.equal(bobBeforeTrigger.isMyAction, false);
  assert.deepEqual(bobBeforeTrigger.currentAction.triggerOptions ?? [], []);
  assert.deepEqual(ids(hostTrigger), ["attack-trigger-follow-up"]);
  assert.deepEqual(ids(bobBeforeTrigger), ["dodge-trigger-response", "peach-bob-private"]);
  assert.equal(bobBeforeTrigger.currentAction.presentation.resolutionId, triggerResolutionId);
  assert.equal((await requestAndSettle("trigger", { code: game.code, token: bob.token, providerId: "green_dragon_blade_attack_dodged", cardId: "attack-trigger-follow-up" })).status, 409, "the defender cannot answer the attacker's trigger");
  const followUp = await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "green_dragon_blade_attack_dodged", cardId: "attack-trigger-follow-up" });
  assert.equal(followUp.status, 200);
  const bobResponseAgain = (await state(game.code, bob.token)).data;
  const hostAfterSwitch = (await state(game.code, host.token)).data;
  assert.equal(bobResponseAgain.meId, bobPlayer.id);
  assert.equal(bobResponseAgain.actionPlayerId, bobPlayer.id);
  assert.equal(bobResponseAgain.isMyAction, true);
  assert.equal(bobResponseAgain.currentAction.kind, "response");
  assert.ok(bobResponseAgain.currentAction.options.some((option) => option.providerId === "card"));
  assert.deepEqual(hostAfterSwitch.currentAction.options ?? [], []);
  assert.equal(bobResponseAgain.currentAction.presentation.resolutionId, triggerResolutionId);
  const followUpAnswered = await requestAndSettle("respond", { code: game.code, token: bob.token, providerId: "card", cardId: "dodge-trigger-response" });
  assert.equal(followUpAnswered.status, 200);
  assert.equal(followUpAnswered.data.room.phase, "play-struck");
  assert.equal((await requestAndSettle("respond", { code: game.code, token: bob.token, providerId: "card", cardId: "dodge-trigger-response" })).status, 409, "the trigger chain cannot resolve its response twice");
  assert.equal((await state(game.code, host.token)).data.players.find((player) => player.id === bobPlayer.id).hp, 4);
});

test("Negation opportunities follow reaction order, include the user, and reset only after a card", async () => {
  const game = await createHumanGame(); const players = game.room.players;
  for (const player of players) setHand(player.id, [card("Negation", `${player.seat}-one`), card("Negation", `${player.seat}-two`), card("Attack", `${player.seat}-reply`)], 4, 4);
  setHand(players[0].id, [card("Duel", "ordered"), card("Negation", "0-one"), card("Attack", "0-reply")], 4, 4);
  setTurn(game.code, players[0].seat);
  const act = (seat, action, extra = {}) => requestAndSettle(action, { code: game.code, token: game.members[seat].token, ...extra });
  let result = await act(0, "play_card", { cardId: "duel-ordered", targetId: players[2].id });
  for (const seat of [0, 1, 2, 3]) {
    const privateView = (await state(game.code, game.members[seat].token)).data;
    assert.equal(privateView.actionPlayerId, players[seat].id);
    assert.equal(privateView.currentAction.kind, "response");
    result = await act(seat, "decline_response");
  }
  assert.equal(result.data.room.pendingNegation, null);
  const duelTargetView = await state(game.code, game.members[2].token);
  assert.equal(duelTargetView.data.currentAction.kind, "response"); assert.equal(duelTargetView.data.currentAction.requirement, "attack"); assert.equal(duelTargetView.data.currentAction.actorId, players[2].id);
  assert.equal((await act(2, "respond", { providerId: "card", cardId: "negation-2-two" })).status, 409, "closed window cannot be reopened");
  result = await act(2, "respond", { providerId: "card", cardId: "attack-2-reply" });
  const nextDuelView = await state(game.code, game.members[0].token);
  assert.equal(result.status, 200); assert.equal(nextDuelView.data.currentAction.kind, "response"); assert.equal(nextDuelView.data.currentAction.requirement, "attack"); assert.equal(nextDuelView.data.currentAction.actorId, players[0].id);
});

test("no-Dodge auto resolution keeps Frost Sword and shield checks and skips empty Arrow responders", async () => {
  const game = await createHumanGame(); const [host, , , carol] = game.members;
  const [me, first, second, last] = game.room.players;
  for (const player of game.room.players) { setHand(player.id, [], 3, 3); setEquipment(player.id); }
  sql(`UPDATE players SET hero=NULL WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(game.code)})`);
  setHand(me.id, [card("Attack", "no-dodge-frost")], 3, 3);
  setHand(first.id, [card("Peach", "frost-kept")], 3, 3);
  setEquipment(me.id, { weapon: card("FrostSword", "no-dodge") }); setTurn(game.code, me.seat);
  const frost = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-no-dodge-frost", targetId: first.id });
  assert.equal(frost.status, 200); assert.equal(frost.data.room.pendingAttack, null);
  assert.equal(frost.data.room.pendingFrostSword.actorId, me.id); assert.equal(frost.data.room.players.find((p) => p.id === first.id).hp, 3);
  const damage = await requestAndSettle("decline_trigger", { code: game.code, token: host.token });
  assert.equal(damage.status, 200); assert.equal(damage.data.room.players.find((p) => p.id === first.id).hp, 2);
  setHand(me.id, [card("RainingArrows", "no-dodge")], 3, 3); setHand(first.id, [], 3, 3);
  setHand(last.id, [card("Dodge", "last-arrow")], 3, 3); setTurn(game.code, me.seat);
  const arrows = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "rainingarrows-no-dodge" });
  assert.equal(arrows.status, 200); assert.equal(arrows.data.room.actionPlayerId, last.id);
  assert.equal(arrows.data.room.players.find((p) => p.id === first.id).hp, 2);
  assert.equal(arrows.data.room.players.find((p) => p.id === second.id).hp, 2);
  assert.equal(arrows.data.room.players.find((p) => p.id === last.id).hp, 3);
  const response = await requestAndSettle("respond", { code: game.code, token: carol.token, cardId: "dodge-last-arrow" });
  assert.equal(response.status, 200); assert.equal(response.data.room.pendingGroup, null);
});

test("canonical Raining Arrows responses either consume Dodge or apply damage", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  for (const player of game.room.players) { setHand(player.id, [], 4, 4); setEquipment(player.id); }
  const rainingArrows = { ...card("RainingArrows", "canonical-arrows"), suit: "♥", rank: "A" };
  setHand(hostPlayer.id, [rainingArrows], 4, 4);
  setHand(alicePlayer.id, [card("Dodge", "canonical-dodge")], 4, 4);
  setHand(bobPlayer.id, [card("Dodge", "canonical-bob-dodge")], 4, 4);
  setHand(carolPlayer.id, [card("Dodge", "canonical-carol-dodge")], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "rainingarrows-canonical-arrows" });
  assert.equal(opened.status, 200);
  const aliceDecision = await state(game.code, alice.token);
  assert.equal(aliceDecision.data.currentAction.requirement, "dodge");
  const dodged = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-canonical-dodge" });
  assert.equal(dodged.status, 200, JSON.stringify(dodged.data)); assert.equal(dodged.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);
  assert.equal(dodged.data.room.currentAction.actorId, bobPlayer.id);

  const damaged = await requestAndSettle("decline_response", { code: game.code, token: game.members[2].token });
  assert.equal(damaged.status, 200); assert.equal(damaged.data.room.players.find((player) => player.id === bobPlayer.id).hp, 3);
  const finished = await requestAndSettle("decline_response", { code: game.code, token: game.members[3].token });
  assert.equal(finished.status, 200); assert.equal(finished.data.room.players.find((player) => player.id === carolPlayer.id).hp, 3);
  assert.equal(finished.data.room.pendingGroup, null); assert.equal(finished.data.room.phase, "play");
  assert.equal(finished.data.room.timeline.find((event) => event.type === "card" && event.card.id === rainingArrows.id)?.playedAs, undefined);
  assert.equal(discardIds(game.code).filter((id) => id === rainingArrows.id).length, 1);

  const wushengGame = await createHumanGame(); const [wushengHost] = wushengGame.members;
  const [wushengHostPlayer, wushengAlicePlayer] = wushengGame.room.players;
  sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(wushengHostPlayer.id)}`);
  const virtualArrows = { ...card("RainingArrows", "wusheng-arrows"), suit: "♥", rank: "A" };
  setHand(wushengHostPlayer.id, [virtualArrows], 4, 4); setHand(wushengAlicePlayer.id, [card("Dodge", "wusheng-arrows-dodge")], 4, 4); setTurn(wushengGame.code, wushengHostPlayer.seat);
  const virtual = await requestAndSettle("play_card", { code: wushengGame.code, token: wushengHost.token, cardId: virtualArrows.id, playAs: "attack", targetId: wushengAlicePlayer.id });
  assert.equal(virtual.status, 200, JSON.stringify(virtual.data));
  assert.equal(virtual.data.room.timeline.find((event) => event.type === "card" && event.card.id === virtualArrows.id)?.playedAs, "attack");
  assert.equal(virtual.data.room.players.find((player) => player.id === wushengAlicePlayer.id).hp, 4);
  assert.equal(discardIds(wushengGame.code).filter((id) => id === virtualArrows.id).length, 1);

  const longdanPlayGame = await createHumanGame(); const [longdanHost] = longdanPlayGame.members;
  const [longdanHostPlayer, longdanTargetPlayer] = longdanPlayGame.room.players;
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(longdanHostPlayer.id)}`);
  const longdanPlayDodge = card("Dodge", "longdan-play-phase-dodge");
  const longdanPlayAttack = card("Attack", "longdan-native-attack");
  setHand(longdanHostPlayer.id, [longdanPlayDodge, longdanPlayAttack], 4, 4); setHand(longdanTargetPlayer.id, [], 4, 4); setTurn(longdanPlayGame.code, longdanHostPlayer.seat);
  const longdanPlay = await requestAndSettle("play_card", { code: longdanPlayGame.code, token: longdanHost.token, cardId: longdanPlayDodge.id, playAs: "attack", targetId: longdanTargetPlayer.id });
  assert.equal(longdanPlay.status, 200, JSON.stringify(longdanPlay.data));
  assert.equal(longdanPlay.data.room.timeline.find((event) => event.type === "card" && event.card.id === longdanPlayDodge.id)?.playedAs, "attack");
  assert.equal(discardIds(longdanPlayGame.code).filter((id) => id === longdanPlayDodge.id).length, 1);

  const longdanResponseGame = await createHumanGame(); const [responseHost, responseAlice] = longdanResponseGame.members;
  const [responseHostPlayer, responseAlicePlayer, responseBobPlayer, responseCarolPlayer] = longdanResponseGame.room.players;
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(responseAlicePlayer.id)}`);
  const responseArrows = card("RainingArrows", "longdan-response-arrows"); const responseAttack = card("Attack", "longdan-attack-as-dodge");
  setHand(responseHostPlayer.id, [responseArrows], 4, 4); setHand(responseAlicePlayer.id, [responseAttack], 4, 4); setHand(responseBobPlayer.id, [], 4, 4); setHand(responseCarolPlayer.id, [], 4, 4); setTurn(longdanResponseGame.code, responseHostPlayer.seat);
  assert.equal((await requestAndSettle("play_card", { code: longdanResponseGame.code, token: responseHost.token, cardId: responseArrows.id })).status, 200);
  const longdanResponseDecision = await state(longdanResponseGame.code, responseAlice.token);
  assert.equal(longdanResponseDecision.data.currentAction.options.find((option) => option.providerId === "zhao_yun_attack_as_dodge")?.playedAs, "dodge");
  const longdanDodged = await requestAndSettle("respond", { code: longdanResponseGame.code, token: responseAlice.token, providerId: "zhao_yun_attack_as_dodge", cardId: responseAttack.id });
  assert.equal(longdanDodged.status, 200, JSON.stringify(longdanDodged.data));
  assert.equal(longdanDodged.data.room.timeline.find((event) => event.type === "card" && event.card.id === responseAttack.id)?.playedAs, "dodge");
  assert.equal(longdanDodged.data.room.players.find((player) => player.id === responseAlicePlayer.id).hp, 4);
});

test("Green Dragon Blade and Attack-use-limit rules preserve normal Attack flow", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, , bob] = game.members; const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(hostPlayer.id)}`);
  setEquipment(hostPlayer.id); setHand(hostPlayer.id, [card("GreenDragonBlade", "human"), card("Attack", "dragon-first"), card("Attack", "dragon-follow-up")], 4, 4);
  setHand(alicePlayer.id, [], 4, 4); setHand(bobPlayer.id, [card("Dodge", "dragon")], 4, 4); setHand(carolPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  sql(`UPDATE rooms SET discard_json='[]' WHERE code=${quote(game.code)}`);

  const equipped = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "greendragonblade-human" });
  const publicHost = equipped.data.room.players.find((player) => player.id === hostPlayer.id);
  assert.equal(publicHost.equipmentCards[0].kind, "GreenDragonBlade"); assert.equal(publicHost.attackRange, 3);
  assert.equal(equipped.data.room.players.find((player) => player.id === bobPlayer.id).distance, 2, "Bob is opposite Host at distance 2");

  const firstAttack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-dragon-first", targetId: bobPlayer.id });
  assert.equal(firstAttack.status, 200); assert.equal(firstAttack.data.room.pendingAttack.targetId, bobPlayer.id, "range 3 permits the opposite target");
  assert.equal(firstAttack.data.room.pendingAttack.origin, "card", "normal Attack uses the shared Attack declaration");
  assert.equal(firstAttack.data.room.pendingAttack.physicalCardId, "attack-dragon-first", "the physical Attack remains available to source-sensitive rules");
  const dragonDecision = await state(game.code, bob.token); assert.equal(dragonDecision.data.currentAction.kind, "response"); assert.equal(dragonDecision.data.currentAction.requirement, "dodge"); assert.ok(dragonDecision.data.currentAction.options.some((option) => option.providerId === "card"));
  const dodged = await requestAndSettle("respond", { code: game.code, token: bob.token, providerId: "card", cardId: "dodge-dragon" });
  assert.equal(dodged.status, 200); assert.equal(dodged.data.room.currentAction.kind, "trigger"); assert.equal(dodged.data.room.actionPlayerId, hostPlayer.id);
  const dragonTrigger = await state(game.code, host.token);
  assert.equal(dragonTrigger.data.currentAction.kind, "trigger"); assert.equal(dragonTrigger.data.currentAction.triggerOptions[0].effectId, "green_dragon_blade_attack_dodged");
  const persistedDragonTrigger = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(persistedDragonTrigger.kind, "trigger"); assert.equal(dragonTrigger.data.currentAction.presentation.readyAfterEventId, persistedDragonTrigger.readyAfterEventId, "the trigger records its own presentation barrier at creation");
  const followed = await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "green_dragon_blade_attack_dodged", cardId: "attack-dragon-follow-up" });
  assert.equal(followed.status, 200); assert.equal(followed.data.room.pendingAttack, null, "an exhausted defender takes follow-up damage without another response");
  const damaged = await takeDamageIfPending(game.code, bob.token);
  assert.equal(damaged.status, 200); assert.equal(damaged.data.room.players.find((player) => player.id === bobPlayer.id).hp, 3); assert.equal(damaged.data.room.phase, "play-struck");
  assert.equal(damaged.data.room.timeline.filter((event) => event.type === "card" && event.player === "Host" && event.card.kind === "Attack").length, 2);

  setHand(hostPlayer.id, [card("Attack", "dragon-skip-first"), card("Attack", "dragon-kept")], 4, 4); setHand(bobPlayer.id, [card("Dodge", "dragon-skip")], 3, 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-dragon-skip-first", targetId: bobPlayer.id })).status, 200);
  assert.equal((await requestAndSettle("respond", { code: game.code, token: bob.token, cardId: "dodge-dragon-skip" })).data.room.currentAction.actorId, hostPlayer.id);
  const skipped = await requestAndSettle("decline_trigger", { code: game.code, token: host.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.phase, "play-struck"); assert.ok(skipped.data.room.myHand.some((held) => held.id === "attack-dragon-kept"), "skipping preserves the unused follow-up Attack");

  async function attackLimitScenario(hero, equipment, attackCount, expectedAfterAttack) {
    const limitGame = await createHumanGame();
    const [limitHost] = limitGame.members;
    const [limitSource, limitTarget] = limitGame.room.players;
    sql(`UPDATE players SET hero=${quote(hero)} WHERE id=${quote(limitSource.id)}`);
    setEquipment(limitSource.id, equipment);
    setEquipment(limitTarget.id, {});
    const attacks = Array.from({ length: attackCount }, (_, index) => card("Attack", `limit-${hero}-${index}`));
    setHand(limitSource.id, attacks, 4, 4); setHand(limitTarget.id, [], 4, 4); setTurn(limitGame.code, limitSource.seat);
    for (let index = 0; index < attacks.length; index++) {
      const result = await requestAndSettle("play_card", { code: limitGame.code, token: limitHost.token, cardId: attacks[index].id, targetId: limitTarget.id });
      assert.equal(result.status, 200, JSON.stringify(result.data));
      assert.equal(result.data.room.phase, expectedAfterAttack, `${hero} Attack ${index + 1} returns to the expected Play state`);
      if (index < attacks.length - 1 && expectedAfterAttack === "play-struck") {
        const rejected = await requestAndSettle("play_card", { code: limitGame.code, token: limitHost.token, cardId: attacks[index + 1].id, targetId: limitTarget.id });
        assert.equal(rejected.status, 409, `${hero} cannot declare a second normal Attack`);
        break;
      }
    }
  }

  await attackLimitScenario("cao-cao", {}, 2, "play-struck");
  await attackLimitScenario("zhang-fei", {}, 3, "play");
  await attackLimitScenario("cao-cao", { weapon: card("ZhugeCrossbow", "limit-crossbow") }, 2, "play");


});

test("Serpent Spear grants range 3 and forms Attack from exactly two hand cards", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice, bob] = game.members; const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(hostPlayer.id)}`);
  setEquipment(hostPlayer.id);
  setHand(hostPlayer.id, [card("SerpentSpear", "human"), card("Peach", "serpent-one"), card("Dodge", "serpent-two")], 4, 4);
  setHand(alicePlayer.id, [], 4, 4); setHand(bobPlayer.id, [card("Dodge", "serpent-answer")], 4, 4); setHand(carolPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  sql(`UPDATE rooms SET discard_json='[]' WHERE code=${quote(game.code)}`);

  const equipped = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "serpentspear-human" });
  const publicHost = equipped.data.room.players.find((player) => player.id === hostPlayer.id);
  assert.equal(publicHost.equipmentCards[0].kind, "SerpentSpear"); assert.equal(publicHost.attackRange, 3);
  assert.equal(equipped.data.room.players.find((player) => player.id === bobPlayer.id).distance, 2);
  assert.equal((await requestAndSettle("serpent_spear_attack", { code: game.code, token: host.token, cardIds: ["peach-serpent-one", "peach-serpent-one"], targetId: bobPlayer.id })).status, 409, "the same card cannot pay both costs");

  const formed = await requestAndSettle("serpent_spear_attack", { code: game.code, token: host.token, cardIds: ["peach-serpent-one", "dodge-serpent-two"], targetId: bobPlayer.id });
  assert.equal(formed.status, 200); assert.equal(formed.data.room.pendingAttack.targetId, bobPlayer.id); assert.equal(formed.data.room.pendingAttack.sequenceStartCardId, "peach-serpent-one");
  assert.equal(formed.data.room.pendingAttack.origin, "serpent_spear", "Serpent Spear uses the same Attack declaration with preserved provenance");
  assert.equal(formed.data.room.pendingAttack.physicalCardId, undefined, "a formed Attack has no single physical Attack card");
  const formedEvent = formed.data.room.timeline.find((event) => event.type === "cards" && event.action === "play" && event.player === "Host");
  assert.deepEqual(formedEvent.cards.map((item) => item.id), ["peach-serpent-one", "dodge-serpent-two"]); assert.equal(formedEvent.target, "Bob");
  const serpentDecision = await state(game.code, bob.token); assert.equal(serpentDecision.data.currentAction.kind, "response"); assert.equal(serpentDecision.data.currentAction.requirement, "dodge"); assert.ok(serpentDecision.data.currentAction.options.some((option) => option.providerId === "card"));
  const dodged = await requestAndSettle("respond", { code: game.code, token: bob.token, providerId: "card", cardId: "dodge-serpent-answer" });
  assert.equal(dodged.status, 200); assert.equal(dodged.data.room.phase, "play-struck"); assert.ok(discardIds(game.code).includes("peach-serpent-one"));

  setEquipment(alicePlayer.id, { weapon: card("SerpentSpear", "duel") });
  setHand(hostPlayer.id, [card("Duel", "serpent")], 4, 4); setHand(alicePlayer.id, [card("Peach", "duel-one"), card("Dodge", "duel-two")], 4, 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "duel-serpent", targetId: alicePlayer.id })).status, 200);
  const duelView = await state(game.code, alice.token); assert.equal(duelView.data.currentAction.kind, "response"); assert.equal(duelView.data.currentAction.requirement, "attack"); assert.ok(duelView.data.currentAction.options.some((option) => option.providerId === "serpent_spear_attack"));
  const duelAnswer = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "serpent_spear_attack", cardIds: ["peach-duel-one", "dodge-duel-two"], preserveResponse: true });
  const hostAfterDuel = await state(game.code, host.token);
  assert.equal(duelAnswer.status, 200); assert.equal(hostAfterDuel.data.currentAction.kind, "response"); assert.equal(hostAfterDuel.data.currentAction.requirement, "attack"); assert.equal(hostAfterDuel.data.currentAction.actorId, hostPlayer.id); assert.ok(duelAnswer.data.room.timeline.some((event) => event.type === "cards" && event.action === "play" && event.player === "Alice"));

  setEquipment(alicePlayer.id, { weapon: card("SerpentSpear", "invasion") });
  setHand(hostPlayer.id, [card("BarbarianInvasion", "serpent")], 4, 4); setHand(alicePlayer.id, [card("Peach", "invasion-one"), card("Dodge", "invasion-two")], 4, 4); setHand(bobPlayer.id, [], 4, 4); setHand(carolPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "barbarianinvasion-serpent" })).status, 200);
  const invasionAnswer = await requestAndSettle("respond", { code: game.code, token: alice.token, cardIds: ["peach-invasion-one", "dodge-invasion-two"] });
  assert.equal(invasionAnswer.status, 200); assert.equal(invasionAnswer.data.room.pendingGroup, null); assert.equal(invasionAnswer.data.room.players.find(p => p.id === bobPlayer.id).hp, 3); assert.equal(invasionAnswer.data.room.players.find(p => p.id === carolPlayer.id).hp, 3); assert.ok(invasionAnswer.data.room.timeline.some((event) => event.type === "cards" && event.action === "play" && event.player === "Alice"));

  setEquipment(hostPlayer.id, { weapon: card("SerpentSpear", "trigrams-spear") });
  setEquipment(alicePlayer.id, { armor: card("EightTrigrams", "trigrams-spear-armor") });
  setHand(hostPlayer.id, [card("Peach", "trigrams-spear-cost-1"), card("Dodge", "trigrams-spear-cost-2")], 4, 4);
  setHand(alicePlayer.id, [], 3, 4); setDeck(game.code, [{ ...card("Peach", "trigrams-spear-judgement"), suit: "♥", rank: "7" }]); setTurn(game.code, hostPlayer.seat);
  const spearTrigrams = await requestAndSettle("serpent_spear_attack", { code: game.code, token: host.token, cardIds: ["peach-trigrams-spear-cost-1", "dodge-trigrams-spear-cost-2"], targetId: alicePlayer.id });
  assert.equal(spearTrigrams.status, 200); assert.equal(spearTrigrams.data.room.pendingAttack?.actorId, alicePlayer.id, "Serpent Spear opens the defender's Dodge response");
  const spearJudgement = await requestAndSettle("respond", { code: game.code, token: alice.token });
  assert.equal(spearJudgement.status, 200); assert.equal(spearJudgement.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3, "red Eight Trigrams judgement blocks a Serpent Spear Attack");


});

test("Rock Cleaving Axe grants range 3 and can discard any two cards after Dodge to force damage", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice, bob] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice"); const bobPlayer = game.room.players.find((player) => player.name === "Bob");
  assert.ok(hostPlayer && alicePlayer && bobPlayer);

  setHand(hostPlayer.id, [card("RockCleavingAxe", "equip")], 4, 5); setTurn(game.code, hostPlayer.seat);
  const equipped = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "rockcleavingaxe-equip" });
  const publicHost = equipped.data.room.players.find((player) => player.id === hostPlayer.id);
  assert.equal(publicHost.equipmentCards[0].kind, "RockCleavingAxe"); assert.equal(publicHost.attackRange, 3);
  assert.equal(equipped.data.room.players.find((player) => player.id === bobPlayer.id).distance, 2);

  setHand(hostPlayer.id, [card("Attack", "axe-skip"), card("Peach", "axe-skip-one")], 4, 5); setHand(alicePlayer.id, [card("Dodge", "axe-skip")], 4); setTurn(game.code, hostPlayer.seat);
  const dodgePrompt = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-axe-skip", targetId: alicePlayer.id });
  assert.equal(dodgePrompt.status, 200); assert.equal(dodgePrompt.data.room.pendingAttack.deadline, 0, "Dodge waits for the visible-decision timer");
  const skippedPrompt = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: "dodge-axe-skip" });
  assert.equal(skippedPrompt.data.room.currentAction.kind, "trigger"); assert.equal(skippedPrompt.data.room.actionPlayerId, hostPlayer.id);
  assert.equal(skippedPrompt.data.room.currentAction.deadline, 0, "Rock Cleaving Axe waits for the visible-decision timer after Dodge");
  assert.equal((await requestAndSettle("trigger", { code: game.code, token: bob.token, cardIds: ["peach-axe-skip-one", "rockcleavingaxe-equip"] })).status, 409, "only the attacker owns the Axe decision");
  assert.equal((await requestAndSettle("trigger", { code: game.code, token: host.token, cardIds: ["peach-axe-skip-one", "peach-axe-skip-one"] })).status, 409, "the same card cannot pay both costs");
  const timed = await requestAndSettle("start_response_timer", { code: game.code, token: host.token }); assert.ok(timed.data.room.currentAction.deadline - Date.now() > 25_000, "the visible Axe prompt arms its human response deadline");
  const repeatedAxeTimer = await requestAndSettle("start_response_timer", { code: game.code, token: host.token }); assert.equal(repeatedAxeTimer.data.room.currentAction.deadline, timed.data.room.currentAction.deadline, "repeated Axe timer starts preserve the original deadline");
  const skipped = await requestAndSettle("decline_trigger", { code: game.code, token: host.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.phase, "play-struck"); assert.equal(skipped.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

  setHand(hostPlayer.id, [card("Attack", "axe-force"), card("Peach", "axe-cost")], 4, 5); setHand(alicePlayer.id, [card("Dodge", "axe-force")], 2); setEquipment(hostPlayer.id, { weapon: card("RockCleavingAxe", "cost") }); setTurn(game.code, hostPlayer.seat);
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-axe-force", targetId: alicePlayer.id })).status, 200);
  const forcePrompt = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: "dodge-axe-force" });
  assert.equal(forcePrompt.data.room.currentAction.kind, "trigger");
  const axeTrigger = await state(game.code, host.token);
  assert.equal(axeTrigger.data.currentAction.kind, "trigger"); assert.equal(axeTrigger.data.currentAction.triggerOptions[0].effectId, "rock_cleaving_axe_attack_dodged");
  const forced = await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "rock_cleaving_axe_attack_dodged", cardIds: ["peach-axe-cost", "rockcleavingaxe-cost"] });
  assert.equal(forced.status, 200); assert.equal(forced.data.room.phase, "play-struck"); assert.equal(forced.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.equal(forced.data.room.players.find((player) => player.id === hostPlayer.id).equipmentCards.length, 0, "the Axe itself may be one of the two discarded cards");
  assert.ok(discardIds(game.code).includes("peach-axe-cost")); assert.ok(discardIds(game.code).includes("rockcleavingaxe-cost"));
  const axeCostEvent = forced.data.room.timeline.find((event) => event.type === "cards" && event.message?.includes("Rock Cleaving Axe"));
  assert.deepEqual(axeCostEvent.cards.map((item) => item.id), ["peach-axe-cost", "rockcleavingaxe-cost"]);


});

test("Sky Piercing Halberd expands a last-hand Attack to up to three ordered Dodge responses", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice, bob, carol] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  setHand(hostPlayer.id, [card("SkyPiercingHalberd", "equip")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const equipped = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "skypiercinghalberd-equip" });
  assert.equal(equipped.status, 200); assert.equal(equipped.data.room.players.find((player) => player.id === hostPlayer.id).attackRange, 4);

  setHand(hostPlayer.id, [card("Attack", "last")], 4, 4); setHand(alicePlayer.id, [card("Dodge", "alice")], 4, 4); setHand(bobPlayer.id, [], 4, 4); setHand(carolPlayer.id, [card("Dodge", "carol")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const launched = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-last", targetIds: [alicePlayer.id, bobPlayer.id, carolPlayer.id] });
  assert.equal(launched.status, 200); assert.equal(launched.data.room.pendingGroup.cardKind, "SkyPiercingHalberdAttack"); assert.equal(launched.data.room.currentAction.actorId, alicePlayer.id); assert.equal(launched.data.room.currentAction.deadline, 0, "the human Halberd response waits for the visible-decision timer");
  assert.deepEqual(discardIds(game.code), [], "the final-hand Attack remains held until every Halberd target has resolved");
  const aliceDodge = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: "dodge-alice" });
  assert.equal(aliceDodge.status, 200); assert.equal(aliceDodge.data.room.currentAction.actorId, carolPlayer.id, "the target without Dodge takes damage immediately and the next eligible seat becomes active");
  const bobDamage = { status: 200, data: { room: (await state(game.code, bob.token)).data } };
  assert.equal(bobDamage.status, 200); assert.equal(bobDamage.data.room.currentAction.actorId, carolPlayer.id); assert.equal(bobDamage.data.room.players.find((player) => player.id === bobPlayer.id).hp, 3);
  const carolDodge = await requestAndSettle("respond", { code: game.code, token: carol.token, cardId: "dodge-carol" });
  assert.equal(carolDodge.status, 200); assert.equal(carolDodge.data.room.phase, "play-struck");
  assert.ok(carolDodge.data.room.log.some((entry) => /Sky Piercing Halberd Attack finishes resolving/.test(entry)));
  assert.deepEqual(discardIds(game.code), ["attack-last", "dodge-alice", "dodge-carol"], "the Attack and every Dodge discard together after the sequence finishes");

  setHand(hostPlayer.id, [card("Attack", "not-last"), card("Peach", "kept")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const rejected = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-not-last", targetIds: [alicePlayer.id, bobPlayer.id] });
  assert.equal(rejected.status, 400, "the Halberd cannot expand an Attack unless it was the final hand card");


});

test("Frost Sword offers its owner the choice to prevent Attack damage and discard up to two target cards", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members; const [hostPlayer, alicePlayer] = game.room.players;
  setHand(hostPlayer.id, [card("FrostSword", "equip")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const equipped = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "frostsword-equip" });
  assert.equal(equipped.status, 200); assert.equal(equipped.data.room.players.find((player) => player.id === hostPlayer.id).attackRange, 2);
  setHand(hostPlayer.id, [card("Attack", "attack")], 4, 4); setHand(alicePlayer.id, [card("Peach", "one"), card("Dodge", "two"), card("Peach", "three"), card("Attack", "four")], 4, 4); setEquipment(alicePlayer.id, { offensiveHorse: card("FerganaSteed", "frost-mount") }); setTurn(game.code, hostPlayer.seat);
  const attack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-attack", targetId: alicePlayer.id });
  assert.equal(attack.status, 200);
  const damage = await takeDamageIfPending(game.code, alice.token);
  assert.equal(damage.status, 200); assert.equal(damage.data.room.pendingFrostSword.actorId, hostPlayer.id);
  const frostTrigger = await state(game.code, host.token);
  assert.equal(frostTrigger.data.currentAction.kind, "trigger"); assert.equal(frostTrigger.data.currentAction.triggerOptions[0].effectId, "frost_sword_damage_about_to_apply");
  const frostSelection = frostTrigger.data.currentAction.triggerOptions.find((option) => option.effectId === "frost_sword_damage_about_to_apply")?.selection;
  const expectedFrostKeys = ["hand:0", "hand:1", "hand:2", "hand:3", "ferganasteed-frost-mount"];
  assert.deepEqual(frostSelection?.eligibleKeys, expectedFrostKeys, "Frost Sword projects every target Hand position");
  const normalizedFrostTrigger = normalizeRoomData(frostTrigger.data);
  assert.deepEqual(normalizedFrostTrigger?.currentAction?.triggerOptions?.find((option) => option.effectId === "frost_sword_damage_about_to_apply")?.selection?.eligibleKeys, expectedFrostKeys, "room normalization preserves Frost Sword eligibility");
  const frost = await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "frost_sword_damage_about_to_apply", cardKeys: ["hand:0", "hand:1"] });
  assert.equal(frost.status, 200); assert.equal(frost.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4, "Frost Sword prevents the Attack damage"); assert.equal(frost.data.room.players.find((player) => player.id === alicePlayer.id).handCount, 2, "Frost Sword discards two target cards");

  setHand(hostPlayer.id, [card("Attack", "judgement-only")], 4, 4); setHand(alicePlayer.id, [], 4, 4); setEquipment(alicePlayer.id); setJudgement(alicePlayer.id, [card("Lightning", "protected-zone")]); setTurn(game.code, hostPlayer.seat);
  const judgementOnlyAttack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-judgement-only", targetId: alicePlayer.id });
  assert.equal(judgementOnlyAttack.status, 200);
  const judgementOnlyDamage = await takeDamageIfPending(game.code, alice.token);
  assert.equal(judgementOnlyDamage.status, 200);
  assert.equal(judgementOnlyDamage.data.room.pendingFrostSword, null, "a Judgement Zone card alone cannot open Frost Sword's discard branch");
  assert.equal(judgementOnlyDamage.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3, "Attack damage is dealt when Frost Sword has no eligible Hand or Equipment card");


});

test("Kirin Bow discards one damaged target Mount and then applies the Attack damage", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members; const [hostPlayer, alicePlayer] = game.room.players;
  setEquipment(hostPlayer.id, { weapon: card("KirinBow", "bow") }); setHand(hostPlayer.id, [card("Attack", "attack")], 4, 4);
  setEquipment(alicePlayer.id, { offensiveHorse: card("FerganaSteed", "offensive"), defensiveHorse: card("Shadowrunner", "defensive") }); setHand(alicePlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  const attack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-attack", targetId: alicePlayer.id });
  assert.equal(attack.status, 200); const triggerDamage = await takeDamageIfPending(game.code, alice.token); assert.equal(triggerDamage.status, 200); const trigger = await state(game.code, host.token);
  assert.equal(trigger.status, 200); assert.equal(trigger.data.currentAction.kind, "trigger");
  assert.deepEqual(trigger.data.currentAction.triggerOptions[0].selection.eligibleKeys, ["ferganasteed-offensive", "shadowrunner-defensive"]);
  const readyAfterEventId = trigger.data.currentAction.presentation?.readyAfterEventId;
  const barrier = readyAfterEventId ? trigger.data.timeline.find((event) => event.id === readyAfterEventId) : null;
  assert.ok(!readyAfterEventId || barrier?.importance === "essential" && (barrier.type === "card" && barrier.card.kind === "Attack" || barrier.type === "cards" && barrier.cards.some((card) => card.kind === "Attack")), "Kirin Bow trigger barrier is the Attack card presentation or absent");
  const informationalDamageMessage = trigger.data.timeline.find((event) => event.type === "message" && /would damage/.test(event.message));
  assert.ok(informationalDamageMessage, "the informational damage message is present");
  assert.notEqual(readyAfterEventId, informationalDamageMessage?.id, "the informational damage message never blocks the Kirin Bow trigger");
  const resolved = await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "kirin_bow_damage_about_to_apply", cardKeys: ["shadowrunner-defensive"] });
  assert.equal(resolved.status, 200); const target = resolved.data.room.players.find((player) => player.id === alicePlayer.id);
  assert.equal(target.hp, 3); assert.deepEqual(target.equipmentCards.map((item) => item.kind), ["FerganaSteed"]); assert.ok(discardIds(game.code).includes("shadowrunner-defensive"));

});

test("Nio Shield occupies the Armor slot and prevents black Attack before Dodge or damage", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members; const [hostPlayer, alicePlayer, bobPlayer] = game.room.players;
  setHand(alicePlayer.id, [card("NioShield", "equip")], 4, 4); setTurn(game.code, alicePlayer.seat);
  const equipped = await requestAndSettle("play_card", { code: game.code, token: alice.token, cardId: "nioshield-equip" });
  assert.equal(equipped.status, 200);
  assert.ok(equipped.data.room.players.find((player) => player.id === alicePlayer.id).equipmentCards.some((item) => item.kind === "NioShield"), "Nio Shield is visible in the target's Armor slot");

  setHand(hostPlayer.id, [card("Attack", "black")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const blackAttack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-black", targetId: alicePlayer.id });
  assert.equal(blackAttack.status, 200);
  assert.equal(blackAttack.data.room.phase, "play-struck", "the black Attack finishes without opening a Dodge response");
  assert.equal(blackAttack.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4, "Nio Shield prevents the black Attack's damage");
  assert.ok(blackAttack.data.room.timeline.some((event) => event.type === "message" && event.effectNotice && /Nio Shield blocks .*black Attack/.test(event.message)), "Nio Shield shows an Effect Triggered notice when it blocks a black Attack");

  const redAttack = { ...card("Attack", "red"), suit: "♥" };
  setHand(hostPlayer.id, [redAttack], 4, 4); setTurn(game.code, hostPlayer.seat);
  const redPrompt = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: redAttack.id, targetId: alicePlayer.id });
  assert.equal(redPrompt.status, 200); assert.equal(redPrompt.data.room.pendingAttack, null, "red Attack damages an undefended player despite Nio Shield");
  const redDamage = await takeDamageIfPending(game.code, alice.token);
  assert.equal(redDamage.status, 200); assert.equal(redDamage.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3, "Nio Shield does not prevent red Attack damage");

  setEquipment(hostPlayer.id, { weapon: card("SkyPiercingHalberd", "nio") }); setHand(hostPlayer.id, [card("Attack", "halberd-black")], 4, 4); setHand(bobPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  const halberdAttack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-halberd-black", targetIds: [alicePlayer.id, bobPlayer.id] });
  assert.equal(halberdAttack.status, 200); assert.equal(halberdAttack.data.room.pendingGroup, null, "Nio Shield prevents its damage and the remaining target without Dodge takes damage immediately"); assert.equal(halberdAttack.data.room.players.find((player) => player.id === bobPlayer.id).hp, 3);
  assert.ok(halberdAttack.data.room.timeline.some((event) => event.type === "message" && event.effectNotice && /Nio Shield blocks .*black Attack/.test(event.message)), "Nio Shield shows an Effect Triggered notice for a Halberd black Attack");


});

test("Eight Trigrams offers optional red Judgement as Dodge and black Judgement fails", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members; const [hostPlayer, alicePlayer] = game.room.players;
  setEquipment(alicePlayer.id, { armor: card("EightTrigrams", "armor") }); setHand(alicePlayer.id, [], 4, 4); setHand(hostPlayer.id, [card("Attack", "trigrams-red")], 4, 4);
  setDeck(game.code, [{ ...card("Peach", "judgement-red"), suit: "♥", rank: "7" }]); setTurn(game.code, hostPlayer.seat);
  const redAttack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-trigrams-red", targetId: alicePlayer.id });
  assert.equal(redAttack.status, 200); assert.equal(redAttack.data.room.pendingAttack.actorId, alicePlayer.id);
  const redView = await state(game.code, alice.token);
  assert.equal(redView.data.currentAction.requirement, "dodge");
  assert.ok(redView.data.currentAction.options.some((option) => option.providerId === "eight_trigrams_dodge"));
  const redResult = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "eight_trigrams_dodge" });
  assert.equal(redResult.status, 200); assert.equal(redResult.data.room.pendingAttack, null); assert.equal(redResult.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

  setHand(hostPlayer.id, [card("Attack", "trigrams-black")], 4, 4); setDeck(game.code, [{ ...card("Peach", "judgement-black"), suit: "♣", rank: "8" }]); setTurn(game.code, hostPlayer.seat);
  const blackAttack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-trigrams-black", targetId: alicePlayer.id });
  assert.equal(blackAttack.status, 200); const blackResult = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "eight_trigrams_dodge" });
  assert.equal(blackResult.status, 200); assert.equal(blackResult.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3); assert.ok(blackResult.data.room.log.some((entry) => /Eight Trigrams Formation/.test(entry)));

  const simaMember = game.members.find((member) => member.name === "Bob"); const simaPlayer = game.room.players.find((player) => player.name === "Bob");
  assert.ok(simaMember && simaPlayer);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(simaPlayer.id)}`);
  const originalBlack = { ...card("Peach", "trigrams-guicai-original"), suit: "♣", rank: "8" };
  const replacementRed = { ...card("Peach", "trigrams-guicai-replacement"), suit: "♥", rank: "Q" };
  setHand(simaPlayer.id, [replacementRed], 4, 4); setHand(hostPlayer.id, [card("Attack", "trigrams-guicai-attack")], 4, 4); setHand(alicePlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat, "play");
  setDeck(game.code, [originalBlack]);
  const guicaiAttack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-trigrams-guicai-attack", targetId: alicePlayer.id });
  assert.equal(guicaiAttack.status, 200);
  const guicaiJudgement = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "eight_trigrams_dodge" });
  assert.equal(guicaiJudgement.status, 200, JSON.stringify(guicaiJudgement.data));
  assert.equal(guicaiJudgement.data.room.currentAction.triggerEvent, "judgement_revealed");
  assert.equal(guicaiJudgement.data.room.actionPlayerId, simaPlayer.id);
  const guicaiDodge = await requestAndSettle("trigger", { code: game.code, token: simaMember.token, providerId: "sima_yi_guicai", cardId: replacementRed.id });
  assert.equal(guicaiDodge.status, 200, JSON.stringify(guicaiDodge.data));
  assert.equal(guicaiDodge.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4, "a red Guicai replacement changes Eight Trigrams to a Dodge");
  assert.ok(discardIds(game.code).includes(originalBlack.id)); assert.ok(discardIds(game.code).includes(replacementRed.id));

});

test("generic response executes Zhen Ji's black-card Dodge without a physical Dodge", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);
  sql(`UPDATE players SET hero='zhen-ji' WHERE id=${quote(alicePlayer.id)}`);
  const blackPeach = { ...card("Peach", "qingguo"), suit: "♠" };
  setHand(hostPlayer.id, [card("Attack", "qingguo")], 4, 5); setHand(alicePlayer.id, [blackPeach], 4); setTurn(game.code, hostPlayer.seat);
  const attacked = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-qingguo", targetId: alicePlayer.id });
  assert.equal(attacked.status, 200);
  const aliceView = await state(game.code, alice.token);
  assert.ok(aliceView.data.currentAction.options.some((option) => option.providerId === "zhen_ji_black_card_dodge"));
  const resolved = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "zhen_ji_black_card_dodge", cardId: blackPeach.id });
  assert.equal(resolved.status, 200);
  assert.equal(resolved.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);
  assert.ok(discardIds(game.code).includes(blackPeach.id));
});

test("Guan Yu uses a red hand card as Attack through the normal multiplayer pipeline", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);
  sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(hostPlayer.id)}`);
  const redPeach = { ...card("Peach", "wusheng-red"), suit: "♥" };
  setHand(hostPlayer.id, [redPeach], 4, 4); setHand(alicePlayer.id, [card("Dodge", "wusheng-dodge")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const playView = await state(game.code, host.token);
  assert.deepEqual(playView.data.currentAction.playPhaseActions, [{ cardId: redPeach.id, canPlayAs: "attack" }], "the acting Guan Yu receives the private Play Phase Attack projection");
  assert.equal((await state(game.code, alice.token)).data.currentAction.playPhaseActions, undefined, "other seats do not receive Guan Yu's private convertible-card projection");
  const played = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: redPeach.id, playAs: "attack", targetId: alicePlayer.id });
  assert.equal(played.status, 200);
  assert.equal(played.data.room.timeline.find((event) => event.type === "card" && event.card.id === redPeach.id)?.playedAs, "attack");
  const defender = await state(game.code, alice.token); const attacker = await state(game.code, host.token);
  assert.equal(defender.data.currentAction.kind, "response");
  assert.ok(defender.data.currentAction.options.some((option) => option.providerId === "card"));
  assert.equal(attacker.data.currentAction?.options?.length ?? 0, 0, "only the defender receives private response options");
  const dodge = card("Dodge", "wusheng-dodge");
  assert.equal((await requestAndSettle("respond", { code: game.code, token: host.token, providerId: "card", cardId: dodge.id })).status, 409);
  const blocked = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: dodge.id });
  assert.equal(blocked.status, 200); assert.equal(discardIds(game.code).filter((id) => id === redPeach.id).length, 1);
  assert.equal((await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: dodge.id })).status, 409, "duplicate response cannot consume either card twice");
});


