/* eslint-disable @typescript-eslint/no-unused-vars */
import test from "node:test";
import {
  assert, card, createHumanGame, createHumanSetupGame, createTestGame, createTestLobby, discardIds, distributeLegacy, drainEmptyPrivateDecisions, markReady, normalizeRoomData, openBorrowedSwordScenario, openFankuiAttack, openGanglieAttack, openGanglieGroup, openGuoDamage, openHujiaScenario, passNegationWindows, prepareGuoJudgement, query, quote, request, requestAndSettle, roomCardCount, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state, takeDamageIfPending, waitForState,
} from "./test-support.mjs";

test("Something Out of Nothing preserves Play Phase and reveals the stratagem without exposing drawn cards", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const host = game.members[0];
  const hostPlayer = game.room.players.find((player) => player.name === "Host");
  assert.ok(hostPlayer);
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(hostPlayer.id)}`);
  setHand(hostPlayer.id, [card("DrawTwo", "tactic")], 4, 5);
  setTurn(game.code, hostPlayer.seat);
  const recycledCards = [card("Strike", "recycled-1"), card("Dodge", "recycled-2")];
  sql(`UPDATE rooms SET deck_json='[]', discard_json=${quote(JSON.stringify(recycledCards))} WHERE code=${quote(game.code)}`);

  const result = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "drawtwo-tactic" });
  assert.equal(result.status, 200);
  assert.equal(result.data.room.phase, "play");
  assert.equal(result.data.drawnCards.length, 2);
  assert.equal(result.data.room.myHand.length, 2);
  assert.equal(result.data.room.discardTop.kind, "DrawTwo");
  assert.deepEqual(new Set(result.data.drawnCards.map((drawn) => drawn.id)), new Set(recycledCards.map((recycled) => recycled.id)));
  assert.equal(result.data.drawnCards.some((drawn) => drawn.id === "drawtwo-tactic"), false);
  const publicPlay = result.data.room.timeline.find((event) => event.type === "card" && event.card.kind === "DrawTwo");
  assert.equal(publicPlay.player, "Host");
  assert.equal(publicPlay.target, "Host");
  const drawHistory = result.data.room.timeline.find((event) => /plays Something Out of Nothing and draws 2 cards/.test(event.message ?? ""));
  assert.equal(drawHistory.presentation, false);
  const opponentView = await state(game.code, game.members[1].token);
  assert.equal(opponentView.data.players.find((player) => player.id === hostPlayer.id).handCount, 2);
  assert.equal(opponentView.data.myHand.some((held) => result.data.drawnCards.some((drawn) => drawn.id === held.id)), false);
});

test("host test flow follows the live actor for Something Out of Nothing and rejects stale actions", { timeout: 30_000 }, async () => {
  const quick = await createTestGame(); const { token, room } = quick.data;
  const [me, playerOne, playerTwo, playerThree] = room.players;
  const openingHandKinds = (player) => JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(player.id)}`)).map((held) => held.kind);
  assert.equal(me.hero, "guan-yu", "Player1 is Guan Yu for Wusheng coverage");
  assert.equal(playerOne.hero, "simayi", "Player2 is Sima Yi for Guicai coverage");
  assert.equal(playerTwo.hero, "zhao-yun", "Player3 is Zhao Yun for Longdan coverage");
  assert.equal(playerThree.hero, "xiahou-dun", "Player4 is Xiahou Dun for Stauchness coverage");
  const openingPlayers = [me, playerOne, playerTwo, playerThree];
  assert.ok(openingPlayers.every((player) => openingHandKinds(player).length === 4), "every host test flow seat receives four opening cards");
  assert.equal(JSON.parse(query(`SELECT COUNT(*) FROM json_each((SELECT deck_json FROM rooms WHERE code=${quote(room.code)}))`)), 92, "host test flow uses the same 4-card opening deal as normal games");
  setHand(me.id, [], 3, 3); setHand(playerOne.id, [card("DrawTwo", "quick-live")], 3, 3); setHand(playerTwo.id, [card("Negation", "quick-live")], 3, 3); setHand(playerThree.id, [], 3, 3); setTurn(room.code, playerOne.seat, "play");
  const before = await state(room.code, token);
  const played = await requestAndSettle("play_card", { code: room.code, token, cardId: "drawtwo-quick-live" });
  assert.equal(played.status, 200); assert.equal(played.data.room.phase, "response");
  assert.equal(played.data.room.pendingNegation.kind, "negation", "the public pending DTO retains its discriminator for the client normalizer");
  assert.deepEqual(played.data.room.pending, { kind: "response" }, "the canonical pending view exposes one semantic response discriminator");
  assert.equal(played.data.room.currentAction.kind, "response"); assert.equal(played.data.room.currentAction.actorId, playerTwo.id);
  assert.deepEqual(played.data.room.currentAction.legalActions.sort(), ["decline_response", "respond"], "only the active host test flow seat receives canonical response actions");
  assert.equal(played.data.room.currentAction.requirement, "negate");
  assert.equal(played.data.room.currentAction.options[0]?.providerId, "negation_card");
  assert.equal(played.data.room.pendingNegation.actorId, playerTwo.id); assert.equal(played.data.room.actionPlayerId, playerTwo.id); assert.equal(played.data.room.meId, playerTwo.id); assert.equal(played.data.room.isMyAction, true);
  const responseTarget = played.data.room.pendingNegation.responseTarget;
  assert.ok(played.data.room.timeline.some((event) => (event.message ?? "").includes("Negation window opens") && (event.message ?? "").includes(responseTarget)), "the response window is visible in the event history");
  const stale = await requestAndSettle("decline_response", { code: room.code, token, context: { actionRevision: before.data.actionRevision, meId: playerOne.id, phase: "play", pendingKind: null, actorId: playerOne.id } });
  assert.equal(stale.status, 409); assert.equal(stale.data.stale, true); assert.equal(stale.data.room.meId, playerTwo.id); assert.equal(stale.data.room.pendingNegation.actorId, playerTwo.id);
  const passed = await requestAndSettle("decline_response", { code: room.code, token });
  assert.equal(passed.status, 200); assert.equal(passed.data.room.phase, "play"); assert.equal(passed.data.room.pendingNegation, null);
  assert.ok(passed.data.room.timeline.some((event) => (event.message ?? "").includes("No Negation responses remain") && (event.message ?? "").includes(responseTarget)), "the completed response window is visible in the event history");
});

test("host test flow Something Out of Nothing resolves without a generic damage response", { timeout: 30_000 }, async () => {
  const quick = await createTestGame(); const { token, room } = quick.data;
  const [me, playerOne, playerTwo, playerThree] = room.players;
  setHand(me.id, [], 3, 3); setHand(playerOne.id, [card("DrawTwo", "quick-no-negation")], 3, 3); setHand(playerTwo.id, [], 3, 3); setHand(playerThree.id, [], 3, 3); setTurn(room.code, playerOne.seat, "play");
  const result = await requestAndSettle("play_card", { code: room.code, token, cardId: "drawtwo-quick-no-negation" });
  assert.equal(result.status, 200); assert.equal(result.data.room.phase, "play"); assert.equal(result.data.room.pendingNegation, null); assert.equal(result.data.room.pendingGroup, null); assert.equal(result.data.room.players.find((player) => player.id === playerOne.id).hp, 3); assert.equal(result.data.drawnCards.length, 2);
});

test("host test flow accepts only one competing response submission", { timeout: 30_000 }, async () => {
  const quick = await createTestGame(); const { token, room } = quick.data;
  const [me, playerOne, playerTwo, playerThree] = room.players;
  setHand(me.id, [card("BarbarianInvasion", "quick-race")], 3, 3); setHand(playerOne.id, [card("Attack", "quick-race")], 3, 3); setHand(playerTwo.id, [], 3, 3); setHand(playerThree.id, [], 3, 3); setTurn(room.code, me.seat, "play");
  const started = await requestAndSettle("play_card", { code: room.code, token, cardId: "barbarianinvasion-quick-race" });
  assert.equal(started.status, 200); assert.equal(started.data.room.currentAction.actorId, playerOne.id);
  const raceContext = { actionRevision: started.data.room.actionRevision, meId: playerOne.id, phase: "response", pendingKind: "response", actorId: playerOne.id };
  const [manual, timeout] = await Promise.all([
    requestAndSettle("respond", { code: room.code, token, cardId: "attack-quick-race", context: raceContext, preserveResponse: true }),
    requestAndSettle("decline_response", { code: room.code, token, context: raceContext, preserveResponse: true }),
  ]);
  assert.equal([manual.status, timeout.status].filter((status) => status === 200).length, 1);
  assert.equal([manual.status, timeout.status].filter((status) => status === 409).length, 1);
  await drainEmptyPrivateDecisions(room.code, token);
  const final = await state(room.code, token);
  if (final.data.currentAction?.triggerEvent === "damage_suffered") await requestAndSettle("decline_trigger", { code: room.code, token });
  const settled = await state(room.code, token);
  assert.equal(settled.data.pendingGroup, null); assert.equal(settled.data.phase, "play"); assert.equal(settled.data.meId, me.id);
});

test("Negation cancels a stratagem and a counter-Negation restores it in ordered response", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);

  setHand(hostPlayer.id, [card("Dismantle", "cancelled")], 5, 5);
  setHand(alicePlayer.id, [card("Attack", "protected"), card("Negation", "cancel")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "dismantle-cancelled", targetId: alicePlayer.id, targetCardIndex: 0 });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.phase, "response"); assert.equal(opened.data.room.pendingNegation.cardName, "Burning Bridges"); assert.equal(opened.data.room.pendingNegation.responseTarget, "Burning Bridges's effect on Alice"); assert.equal(opened.data.room.actionPlayerId, null);
  assert.equal(opened.data.room.discardTop, null, "Burning Bridges stays outside discard while its Negation decision is open");
  const cancelled = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: "negation-cancel" });
  assert.equal(cancelled.status, 200); assert.equal(cancelled.data.room.phase, "play"); assert.equal(cancelled.data.room.pendingNegation, null);
  assert.equal((await state(game.code, alice.token)).data.myHand.some((held) => held.id === "attack-protected"), true, "the cancelled stratagem does not discard its target card");

  setHand(hostPlayer.id, [card("Dismantle", "restored"), card("Negation", "counter")], 5, 5);
  setHand(alicePlayer.id, [card("Attack", "removed"), card("Negation", "first")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  const reopened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "dismantle-restored", targetId: alicePlayer.id, targetCardIndex: 0 });
  assert.equal(reopened.data.room.actionPlayerId, hostPlayer.id, "the initial response starts with the source when the source has a Negation capability");
  assert.equal(reopened.data.room.discardTop.id, "negation-cancel", "the previous completed discard remains visible while the new sequence is pending");
  await requestAndSettle("decline_response", { code: game.code, token: host.token });
  assert.equal((await state(game.code, alice.token)).data.actionPlayerId, alicePlayer.id);
  const firstPlayed = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: "negation-first" });
  const counterView = (await state(game.code, host.token)).data;
  assert.equal(counterView.actionPlayerId, hostPlayer.id);
  assert.equal(counterView.pendingNegation.responseTarget, "Alice's Negation", "the counter window names the latest Negation rather than the root Stratagem");
  assert.equal(firstPlayed.data.room.discardTop.id, "negation-cancel", "neither Burning Bridges nor the first Negation enters discard before the counter decision");
  const restored = await requestAndSettle("respond", { code: game.code, token: host.token, cardId: "negation-counter" });
  assert.equal(restored.status, 200); assert.equal(restored.data.room.phase, "response"); assert.equal(restored.data.room.pendingTargetCard.cardKind, "Dismantle");
  assert.equal((await state(game.code, alice.token)).data.myHand.some((held) => held.id === "attack-removed"), true, "the target card is not chosen before Negation finishes");
  const chosen = await requestAndSettle("choose_target_card", { code: game.code, token: host.token, targetCardZone: "hand", targetCardIndex: 0 });
  assert.equal(chosen.status, 200); assert.equal(chosen.data.room.phase, "play");
  assert.equal(chosen.data.room.discardTop.id, "attack-removed", "the revealed target card enters discard only when the complete sequence finishes");
  assert.equal((await state(game.code, alice.token)).data.myHand.some((held) => held.id === "attack-removed"), false, "counter-Negation restores the original stratagem effect");
  assert.ok(chosen.data.room.log.some((entry) => /plays Negation to restore Burning Bridges/.test(entry)));
  const finalDiscard = JSON.parse(query(`SELECT discard_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.deepEqual(finalDiscard.slice(-4).map((held) => held.id), ["dismantle-restored", "negation-first", "negation-counter", "attack-removed"], "the entire Burning Bridges sequence commits to discard together in play order");
});

test("Steal chooses from the target's current zones only after counter-Negation", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);
  const spear = card("SerpentSpear", "post-negation-prize");
  setHand(hostPlayer.id, [card("Steal", "post-negation"), card("Negation", "restore-steal")], 5, 5);
  setHand(alicePlayer.id, [card("Negation", "cancel-steal")], 4, 4); setEquipment(alicePlayer.id, { weapon: spear }); setTurn(game.code, hostPlayer.seat);

  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "steal-post-negation", targetId: alicePlayer.id });
  assert.equal(opened.data.room.pendingTargetCard, null, "target cards are not selected or exposed before Negation responses finish");
  await requestAndSettle("decline_response", { code: game.code, token: host.token });
  await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: "negation-cancel-steal" });
  const restored = await requestAndSettle("respond", { code: game.code, token: host.token, cardId: "negation-restore-steal" });
  assert.equal(restored.data.room.pendingTargetCard.targetId, alicePlayer.id); assert.equal(restored.data.room.players.find((player) => player.id === alicePlayer.id).handCount, 0);
  assert.equal(restored.data.room.players.find((player) => player.id === alicePlayer.id).equipmentCards[0].id, spear.id);
  const obtained = await requestAndSettle("choose_target_card", { code: game.code, token: host.token, targetCardZone: "equipment", targetCardId: spear.id });
  assert.equal(obtained.status, 200); assert.equal(obtained.data.room.phase, "play"); assert.ok(obtained.data.room.myHand.some((held) => held.id === spear.id));
  assert.equal(obtained.data.room.players.find((player) => player.id === alicePlayer.id).equipmentCards.length, 0);
  assert.equal(obtained.data.room.log.some((entry) => /no valid card left/.test(entry)), false);
  assert.deepEqual(discardIds(game.code).slice(-3), ["steal-post-negation", "negation-cancel-steal", "negation-restore-steal"]);
});

test("Lu Xun's Modesty blocks only Steal and Overindulgence", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host] = game.members;
  const source = game.room.players.find((player) => player.name === "Host");
  const luXun = game.room.players.find((player) => player.name === "Alice");
  const other = game.room.players.find((player) => player.name === "Carol");
  assert.ok(source && luXun && other);
  sql(`UPDATE players SET hero='lu-xun' WHERE id=${quote(luXun.id)}`);
  sql(`UPDATE rooms SET discard_json='[]' WHERE code=${quote(game.code)}`);

  const steal = card("Steal", "modesty-blocked");
  setHand(source.id, [steal], 4, 4); setHand(luXun.id, [card("Peach", "modesty-lu-card")], 3, 3); setTurn(game.code, source.seat);
  const blockedSteal = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: steal.id, targetId: luXun.id });
  assert.equal(blockedSteal.status, 409, JSON.stringify(blockedSteal.data));
  const blockedStealState = await state(game.code, host.token);
  assert.deepEqual(blockedStealState.data.myHand.map((held) => held.id), [steal.id], "Modesty rejects Steal before it leaves the source hand");
  assert.equal(discardIds(game.code).includes(steal.id), false, "a blocked Steal is not discarded");
  assert.equal(blockedStealState.data.pending, null, "a blocked Steal does not open a Negation decision");
  assert.equal(blockedStealState.data.phase, "play");

  const otherSteal = card("Steal", "modesty-other");
  setHand(source.id, [otherSteal], 4, 4); setHand(other.id, [card("Peach", "modesty-other-card")], 4, 4); setTurn(game.code, source.seat);
  const allowedOtherSteal = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: otherSteal.id, targetId: other.id });
  assert.equal(allowedOtherSteal.status, 200, JSON.stringify(allowedOtherSteal.data));
  assert.equal(allowedOtherSteal.data.room.pendingTargetCard.targetId, other.id, "other heroes remain valid Steal targets");

  const overindulgence = card("Overindulgence", "modesty-blocked");
  setHand(source.id, [overindulgence], 4, 4); setJudgement(luXun.id, []); setTurn(game.code, source.seat);
  const blockedOverindulgence = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: overindulgence.id, targetId: luXun.id });
  assert.equal(blockedOverindulgence.status, 409, JSON.stringify(blockedOverindulgence.data));
  const blockedOverindulgenceState = await state(game.code, host.token);
  assert.deepEqual(blockedOverindulgenceState.data.myHand.map((held) => held.id), [overindulgence.id], "Modesty rejects Overindulgence before it leaves the source hand");
  assert.equal(discardIds(game.code).includes(overindulgence.id), false, "a blocked Overindulgence is not discarded");
  assert.deepEqual(blockedOverindulgenceState.data.players.find((player) => player.id === luXun.id).judgementCards, [], "a blocked Overindulgence does not modify the Judgement Zone");
  assert.equal(blockedOverindulgenceState.data.pending, null, "a blocked Overindulgence does not open a Negation decision");

  const allowedOverindulgence = card("Overindulgence", "modesty-other");
  setHand(source.id, [allowedOverindulgence], 4, 4); setJudgement(other.id, []); setTurn(game.code, source.seat);
  const allowedOtherOverindulgence = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: allowedOverindulgence.id, targetId: other.id });
  assert.equal(allowedOtherOverindulgence.status, 200, JSON.stringify(allowedOtherOverindulgence.data));
  assert.deepEqual(allowedOtherOverindulgence.data.room.players.find((player) => player.id === other.id).judgementCards.map((delayed) => delayed.id), [allowedOverindulgence.id], "other heroes remain valid Overindulgence targets");

  const duel = card("Duel", "modesty-duel");
  setHand(source.id, [duel], 4, 4); setHand(luXun.id, [card("Attack", "modesty-duel-response")], 3, 3); setTurn(game.code, source.seat);
  const allowedDuel = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: duel.id, targetId: luXun.id });
  assert.equal(allowedDuel.status, 200, JSON.stringify(allowedDuel.data));
  assert.equal(allowedDuel.data.room.pendingDuel.targetId, luXun.id, "Modesty does not affect Duel");

  const burningBridges = card("Dismantle", "modesty-burning-bridges");
  setHand(source.id, [burningBridges], 4, 4); setHand(luXun.id, [card("Peach", "modesty-burning-target")], 3, 3); setTurn(game.code, source.seat);
  const allowedBurningBridges = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: burningBridges.id, targetId: luXun.id });
  assert.equal(allowedBurningBridges.status, 200, JSON.stringify(allowedBurningBridges.data));
  assert.equal(allowedBurningBridges.data.room.pendingTargetCard.targetId, luXun.id, "Modesty does not affect Burning Bridges");
});

test("Lu Xun's Second Wind is a private once-per-loss continuation", { timeout: 60_000 }, async () => {
  const acceptedGame = await createHumanGame();
  const acceptedLu = acceptedGame.room.players[1];
  const acceptedTarget = acceptedGame.room.players[2];
  sql(`UPDATE players SET hero='lu-xun' WHERE id=${quote(acceptedLu.id)}`);
  const acceptedAttack = card("Attack", "second-wind-play");
  setHand(acceptedLu.id, [acceptedAttack], 3, 3); setHand(acceptedTarget.id, [], 4, 4); setDeck(acceptedGame.code, [card("Peach", "second-wind-draw")]); setTurn(acceptedGame.code, acceptedLu.seat);
  const played = await requestAndSettle("play_card", { code: acceptedGame.code, token: acceptedGame.members[1].token, cardId: acceptedAttack.id, targetId: acceptedTarget.id });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  assert.equal(played.data.room.currentAction.kind, "trigger", "losing the last card offers Second Wind");
  assert.equal(played.data.room.currentAction.actorId, acceptedLu.id);
  assert.equal(played.data.room.currentAction.triggerOptions[0].effectId, "lu_xun_second_wind");
  assert.deepEqual((await state(acceptedGame.code, acceptedGame.members[2].token)).data.currentAction.triggerOptions, [], "Second Wind remains private to Lu Xun");
  const accepted = await requestAndSettle("trigger", { code: acceptedGame.code, token: acceptedGame.members[1].token, providerId: "lu_xun_second_wind" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.deepEqual(accepted.data.room.myHand.map((held) => held.id), ["peach-second-wind-draw"], "accepting draws exactly one card");
  assert.equal(accepted.data.room.currentAction.kind, "turn", "the completed trigger resumes normal play");

  const declinedGame = await createHumanGame();
  const declinedLu = declinedGame.room.players[1]; const declinedTarget = declinedGame.room.players[2];
  sql(`UPDATE players SET hero='lu-xun' WHERE id=${quote(declinedLu.id)}`);
  const declinedAttack = card("Attack", "second-wind-decline");
  setHand(declinedLu.id, [declinedAttack], 3, 3); setHand(declinedTarget.id, [], 4, 4); setDeck(declinedGame.code, [card("Peach", "second-wind-unused")]); setTurn(declinedGame.code, declinedLu.seat);
  const declinedPlay = await requestAndSettle("play_card", { code: declinedGame.code, token: declinedGame.members[1].token, cardId: declinedAttack.id, targetId: declinedTarget.id });
  assert.equal(declinedPlay.data.room.currentAction.triggerOptions[0].effectId, "lu_xun_second_wind");
  const declined = await requestAndSettle("decline_trigger", { code: declinedGame.code, token: declinedGame.members[1].token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data)); assert.equal(declined.data.room.myHand.length, 0, "declining draws none"); assert.ok(["play", "play-struck"].includes(declined.data.room.phase), "declining resumes the interrupted continuation");

  const responseGame = await createHumanGame();
  const responseSource = responseGame.room.players[0]; const responseLu = responseGame.room.players[1];
  sql(`UPDATE players SET hero='lu-xun' WHERE id=${quote(responseLu.id)}`);
  const responseAttack = card("Attack", "second-wind-response-attack"); const responseDodge = card("Dodge", "second-wind-response-dodge");
  setHand(responseSource.id, [responseAttack], 4, 4); setHand(responseLu.id, [responseDodge], 3, 3); setTurn(responseGame.code, responseSource.seat);
  const responseOpened = await requestAndSettle("play_card", { code: responseGame.code, token: responseGame.members[0].token, cardId: responseAttack.id, targetId: responseLu.id });
  assert.equal(responseOpened.status, 200, JSON.stringify(responseOpened.data));
  const responseBlocked = await requestAndSettle("respond", { code: responseGame.code, token: responseGame.members[1].token, providerId: "card", cardId: responseDodge.id });
  assert.equal(responseBlocked.status, 200, JSON.stringify(responseBlocked.data)); assert.equal(responseBlocked.data.room.currentAction.triggerOptions[0].effectId, "lu_xun_second_wind", "a last card used as a response also triggers Second Wind");

  const discardGame = await createHumanGame(); const discardLu = discardGame.room.players[1];
  sql(`UPDATE players SET hero='lu-xun' WHERE id=${quote(discardLu.id)}`);
  const discardCards = [card("Peach", "second-wind-discard-a"), card("Dodge", "second-wind-discard-b")];
  setHand(discardLu.id, discardCards, 0, 3); setTurn(discardGame.code, discardLu.seat, "discard");
  const discarded = await requestAndSettle("discard_cards", { code: discardGame.code, token: discardGame.members[1].token, cardIds: discardCards.map((held) => held.id) });
  assert.equal(discarded.status, 200, JSON.stringify(discarded.data)); assert.equal(discarded.data.room.currentAction.triggerOptions.length, 1, "losing multiple cards together opens one Second Wind decision");
  const discardedDecline = await requestAndSettle("decline_trigger", { code: discardGame.code, token: discardGame.members[1].token });
  assert.equal(discardedDecline.status, 200, JSON.stringify(discardedDecline.data)); assert.equal(discardedDecline.data.room.currentAction.kind, "turn");

  const removedGame = await createHumanGame(); const removedSource = removedGame.room.players[0]; const removedLu = removedGame.room.players[1];
  sql(`UPDATE players SET hero='lu-xun' WHERE id=${quote(removedLu.id)}`);
  const dismantle = card("Dismantle", "second-wind-removed"); const removedCard = card("Peach", "second-wind-removed-target");
  setHand(removedSource.id, [dismantle], 4, 4); setHand(removedLu.id, [removedCard], 3, 3); setTurn(removedGame.code, removedSource.seat);
  const dismantled = await requestAndSettle("play_card", { code: removedGame.code, token: removedGame.members[0].token, cardId: dismantle.id, targetId: removedLu.id });
  assert.equal(dismantled.status, 200, JSON.stringify(dismantled.data));
  const removed = await requestAndSettle("choose_target_card", { code: removedGame.code, token: removedGame.members[0].token, targetCardZone: "hand", targetCardIndex: 0 });
  assert.equal(removed.status, 200, JSON.stringify(removed.data)); assert.equal(removed.data.room.currentAction.actorId, removedLu.id, "removing Lu Xun's last card opens his private trigger");
  assert.deepEqual(removed.data.room.currentAction.triggerOptions, [], "the trigger remains private from the removing player");
  const removedLuView = await state(removedGame.code, removedGame.members[1].token);
  assert.equal(removedLuView.data.currentAction.triggerOptions[0].effectId, "lu_xun_second_wind");
});

test("Negation cancels an AOE for one target and the card continues in seat order", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice, bob, carol] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice"); const bobPlayer = game.room.players.find((player) => player.name === "Bob"); const carolPlayer = game.room.players.find((player) => player.name === "Carol");
  assert.ok(hostPlayer && alicePlayer && bobPlayer && carolPlayer);

  for (const { kind, requiredKind } of [{ kind: "BarbarianInvasion", requiredKind: "Attack" }, { kind: "RainingArrows", requiredKind: "Dodge" }]) {
    setHand(hostPlayer.id, [card(kind, "per-target")], 5, 5);
    setHand(alicePlayer.id, [card("Negation", `${kind}-alice`)], 4, 4);
    setHand(bobPlayer.id, [card(requiredKind, `${kind}-bob`)], 4, 4);
    setHand(carolPlayer.id, [card(requiredKind, `${kind}-carol`)], 4, 4);
    setTurn(game.code, hostPlayer.seat);
    sql(`UPDATE rooms SET discard_json='[]' WHERE code=${quote(game.code)}`);

    const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: `${kind.toLowerCase()}-per-target` });
    assert.equal(opened.status, 200); assert.equal(opened.data.room.pendingNegation.effectTargetId, alicePlayer.id); assert.equal(opened.data.room.actionPlayerId, null);
    assert.deepEqual(discardIds(game.code), [], `${kind} stays staged while Alice decides whether to Negate`);
    const aliceNegates = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: `negation-${kind}-alice` });
    assert.equal(aliceNegates.status, 200); assert.equal(aliceNegates.data.room.pendingNegation, null, "an empty counter round is skipped without prompting the source");
    assert.equal(aliceNegates.data.room.currentAction.actorId, bobPlayer.id, `${kind} moves to Bob's target response`);
    assert.equal(aliceNegates.data.room.pendingGroup.requiredKind, requiredKind);
    assert.equal(aliceNegates.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

    const bobResponse = await requestAndSettle("respond", { code: game.code, token: bob.token, cardId: `${requiredKind.toLowerCase()}-${kind}-bob` });
    assert.equal(bobResponse.status, 200); assert.equal(bobResponse.data.room.currentAction.actorId, carolPlayer.id, `${kind} continues to Carol after Bob responds`);
    assert.deepEqual(discardIds(game.code), [], `${kind}, Negation, and Bob's response remain staged`);
    const finished = await requestAndSettle("respond", { code: game.code, token: carol.token, cardId: `${requiredKind.toLowerCase()}-${kind}-carol` });
    assert.equal(finished.status, 200); assert.equal(finished.data.room.phase, "play"); assert.equal(finished.data.room.pendingGroup, null);
    assert.ok(finished.data.room.log.some((entry) => new RegExp(`${kind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows"}'s effect on Alice is cancelled`).test(entry)));
    assert.deepEqual(discardIds(game.code), [`${kind.toLowerCase()}-per-target`, `negation-${kind}-alice`, `${requiredKind.toLowerCase()}-${kind}-bob`, `${requiredKind.toLowerCase()}-${kind}-carol`], "the complete AOE sequence enters discard once, in play order");
  }
});

test("Luoshen repeats real Judgements before delayed-card Judgements and preserves card destinations", { timeout: 30_000 }, async () => {
  async function beginZhenTurn(deck, judgement = [], simaHand = []) {
    const created = await createTestGame();
    const { token, room } = created.data;
    const code = room.code;
    const zhen = room.players.find((player) => player.seat === 3);
    assert.ok(zhen, "host test flow exposes a deterministic Player4 seat for the Luoshen fixture");
    sql(`UPDATE players SET hero='zhen-ji', hp=3, max_hp=3, hero_options_json='[]' WHERE id=${quote(zhen.id)}`);
    const previous = room.players.find((player) => player.seat === (zhen.seat + 3) % room.players.length);
    assert.ok(previous);
    for (const player of room.players) setHand(player.id, [], player.hp ?? 3, player.maxHp ?? 3);
    const sima = room.players.find((player) => player.hero === "simayi");
    assert.ok(sima, "host test flow exposes Sima Yi in Player2 for Guicai coverage");
    setHand(sima.id, simaHand, 3, 3);
    setHand(zhen.id, [], 3, 3);
    setJudgement(zhen.id, judgement);
    setDeck(code, deck);
    setTurn(code, previous.seat);
    const ended = await requestAndSettle("end_turn", { code, token });
    assert.equal(ended.status, 200, JSON.stringify(ended.data));
    return { code, token, zhen, sima, room: ended.data.room };
  }

  const sevenSpades = { ...card("Attack", "luoshen-seven"), suit: "♠", rank: "7" };
  const fourClubs = { ...card("Dodge", "luoshen-four"), suit: "♣", rank: "4" };
  const queenHearts = { ...card("Peach", "luoshen-queen"), suit: "♥", rank: "Q" };
  const jackClubs = { ...card("Duel", "overindulgence-next"), suit: "♣", rank: "J" };
  const drawOne = card("Attack", "draw-one", "♠");
  const drawTwo = card("Dodge", "draw-two", "♥");
  const overindulgence = card("Overindulgence", "zhen-zone", "♠");
  const sequence = await beginZhenTurn([sevenSpades, fourClubs, queenHearts, jackClubs, drawOne, drawTwo], [overindulgence]);
  assert.equal(sequence.room.phase, "response");
  assert.equal(sequence.room.currentAction.kind, "trigger");
  assert.equal(sequence.room.currentAction.triggerEvent, "turn_start");
  assert.deepEqual(sequence.room.currentAction.triggerOptions.map((option) => option.label), ["Godess of Luo River"]);

  const first = await requestAndSettle("trigger", { code: sequence.code, token: sequence.token, providerId: "zhen_ji_luoshen" });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  assert.equal(first.data.room.phase, "response");
  assert.deepEqual(first.data.room.myHand.map((held) => held.id), [sevenSpades.id]);
  assert.equal(first.data.room.currentAction.triggerEvent, "turn_start");
  assert.equal(first.data.room.deckCount, 5);

  const second = await requestAndSettle("trigger", { code: sequence.code, token: sequence.token, providerId: "zhen_ji_luoshen" });
  assert.equal(second.status, 200, JSON.stringify(second.data));
  assert.deepEqual(second.data.room.myHand.map((held) => held.id), [sevenSpades.id, fourClubs.id]);
  assert.equal(second.data.room.currentAction.triggerEvent, "turn_start");
  assert.equal(second.data.room.deckCount, 4);

  const third = await requestAndSettle("trigger", { code: sequence.code, token: sequence.token, providerId: "zhen_ji_luoshen" });
  assert.equal(third.status, 200, JSON.stringify(third.data));
  assert.equal(third.data.room.phase, "draw");
  assert.equal(third.data.room.pending, null);
  assert.deepEqual(third.data.room.myHand.map((held) => held.id), [sevenSpades.id, fourClubs.id]);
  assert.deepEqual(discardIds(sequence.code), [queenHearts.id]);
  assert.ok(third.data.room.players.find((player) => player.id === sequence.zhen.id).judgementCards.some((held) => held.id === overindulgence.id));
  assert.equal(third.data.room.currentAction.kind, "turn");
  assert.equal(third.data.room.currentAction.triggerEvent, undefined, "Luoshen is not offered again merely because the phase starts with draw");

  const delayed = await requestAndSettle("draw", { code: sequence.code, token: sequence.token });
  assert.equal(delayed.status, 200, JSON.stringify(delayed.data));
  assert.equal(delayed.data.room.phase, "discard", "the next card is a new Overindulgence Judgement and skips Play");
  assert.equal(discardIds(sequence.code).filter((id) => id === jackClubs.id).length, 1, "the delayed Judgement consumes the next card exactly once");
  assert.equal(discardIds(sequence.code).filter((id) => id === queenHearts.id).length, 1, "the red Luoshen card is discarded exactly once");
  assert.equal(discardIds(sequence.code).filter((id) => id === overindulgence.id).length, 1, "the delayed card is discarded exactly once");
  assert.equal(discardIds(sequence.code).filter((id) => id === sevenSpades.id).length, 0);
  assert.equal(discardIds(sequence.code).filter((id) => id === fourClubs.id).length, 0);

  const declinedImmediately = await beginZhenTurn([queenHearts], [overindulgence]);
  const declined = await requestAndSettle("decline_trigger", { code: declinedImmediately.code, token: declinedImmediately.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.phase, "draw");
  assert.equal(declined.data.room.pending, null);
  assert.equal((await state(declinedImmediately.code, declinedImmediately.token)).data.currentAction.triggerEvent, undefined);

  const blackThenDecline = await beginZhenTurn([sevenSpades, queenHearts], [overindulgence]);
  const accepted = await requestAndSettle("trigger", { code: blackThenDecline.code, token: blackThenDecline.token, providerId: "zhen_ji_luoshen" });
  assert.deepEqual(accepted.data.room.myHand.map((held) => held.id), [sevenSpades.id]);
  const stopped = await requestAndSettle("decline_trigger", { code: blackThenDecline.code, token: blackThenDecline.token });
  assert.equal(stopped.status, 200, JSON.stringify(stopped.data));
  assert.equal(stopped.data.room.phase, "draw");
  assert.deepEqual(stopped.data.room.myHand.map((held) => held.id), [sevenSpades.id]);

  const redFirst = await beginZhenTurn([queenHearts, sevenSpades]);
  const red = await requestAndSettle("trigger", { code: redFirst.code, token: redFirst.token, providerId: "zhen_ji_luoshen" });
  assert.equal(red.status, 200, JSON.stringify(red.data));
  assert.equal(red.data.room.phase, "draw");
  assert.deepEqual(discardIds(redFirst.code), [queenHearts.id]);

  const replacementBlack = { ...card("Attack", "guicai-black"), suit: "♠", rank: "7" };
  const originalRed = { ...card("Peach", "guicai-original-red"), suit: "♥", rank: "Q" };
  const redToBlack = await beginZhenTurn([originalRed], [], [replacementBlack]);
  const redStart = await requestAndSettle("trigger", { code: redToBlack.code, token: redToBlack.token, providerId: "zhen_ji_luoshen" });
  assert.equal(redStart.data.room.currentAction.triggerEvent, "judgement_revealed");
  assert.equal(redStart.data.room.actionPlayerId, redToBlack.sima.id, "Guicai moves perspective to Sima Yi");
  assert.deepEqual(redStart.data.room.currentAction.triggerOptions[0].selection.eligibleCardIds, [replacementBlack.id]);
  const redReplaced = await requestAndSettle("trigger", { code: redToBlack.code, token: redToBlack.token, providerId: "sima_yi_guicai", cardId: replacementBlack.id });
  assert.equal(redReplaced.status, 200, JSON.stringify(redReplaced.data));
  assert.equal(redReplaced.data.room.currentAction.triggerEvent, "turn_start", "black final Luoshen result continues the sequence");
  assert.deepEqual(redReplaced.data.room.myHand.map((held) => held.id), [replacementBlack.id]);
  assert.equal(query(`SELECT json_array_length(hand_json) FROM players WHERE id=${quote(redToBlack.sima.id)}`), "0", "Guicai consumes the replacement from Sima Yi's hand");
  assert.ok(discardIds(redToBlack.code).includes(originalRed.id), "the original red reveal is discarded");
  assert.ok(redReplaced.data.room.log.some((entry) => entry.includes("Sima Yi replaces the Judgement card with 7♠ using Necromancy.")));
  assert.equal((await requestAndSettle("decline_trigger", { code: redToBlack.code, token: redToBlack.token })).data.room.phase, "draw");

  const replacementRed = { ...card("Peach", "guicai-red"), suit: "♥", rank: "Q" };
  const originalBlack = { ...card("Attack", "guicai-original-black"), suit: "♠", rank: "7" };
  const blackToRed = await beginZhenTurn([originalBlack], [], [replacementRed]);
  await requestAndSettle("trigger", { code: blackToRed.code, token: blackToRed.token, providerId: "zhen_ji_luoshen" });
  const blackRevealed = await state(blackToRed.code, blackToRed.token);
  assert.equal(blackRevealed.data.currentAction.triggerEvent, "judgement_revealed");
  const blackReplaced = await requestAndSettle("trigger", { code: blackToRed.code, token: blackToRed.token, providerId: "sima_yi_guicai", cardId: replacementRed.id });
  assert.equal(blackReplaced.status, 200, JSON.stringify(blackReplaced.data));
  assert.equal(blackReplaced.data.room.phase, "draw", "red final Luoshen result ends the sequence");
  assert.deepEqual(blackReplaced.data.room.players.find((player) => player.id === blackToRed.zhen.id).handCards, []);
  assert.ok(discardIds(blackToRed.code).includes(originalBlack.id));
  assert.ok(discardIds(blackToRed.code).includes(replacementRed.id));

  const declinedOriginal = { ...card("Attack", "guicai-declined-original"), suit: "♣", rank: "8" };
  const declinedReplacement = { ...card("Peach", "guicai-declined-replacement"), suit: "♥", rank: "Q" };
  const declinedGuicai = await beginZhenTurn([declinedOriginal], [], [declinedReplacement]);
  await requestAndSettle("trigger", { code: declinedGuicai.code, token: declinedGuicai.token, providerId: "zhen_ji_luoshen" });
  const declinedReplacementWindow = await requestAndSettle("decline_trigger", { code: declinedGuicai.code, token: declinedGuicai.token });
  assert.equal(declinedReplacementWindow.status, 200, JSON.stringify(declinedReplacementWindow.data));
  assert.deepEqual(declinedReplacementWindow.data.room.myHand.map((held) => held.id), [declinedOriginal.id], "declining Guicai keeps the revealed card final");
  assert.equal(query(`SELECT json_array_length(hand_json) FROM players WHERE id=${quote(declinedGuicai.sima.id)}`), "1");
  assert.equal(discardIds(declinedGuicai.code).includes(declinedOriginal.id), false);
  assert.equal((await requestAndSettle("decline_trigger", { code: declinedGuicai.code, token: declinedGuicai.token })).data.room.phase, "draw");
});

test("Overindulgence uses the Judgement Zone and skips only a failed target's Play Phase", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members; const bob = game.members.find((member) => member.name === "Bob");
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice"); const bobPlayer = game.room.players.find((player) => player.name === "Bob");
  assert.ok(hostPlayer && alicePlayer && bobPlayer && bob);

  setHand(hostPlayer.id, [card("Overindulgence", "cancelled")], 5, 5); setHand(alicePlayer.id, [card("Negation", "overindulgence")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "overindulgence-cancelled", targetId: alicePlayer.id });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.pendingNegation, null); assert.equal(opened.data.room.phase, "play");
  assert.deepEqual(opened.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards.map((delayed) => delayed.id), ["overindulgence-cancelled"], "placement immediately enters the Judgement Zone");

  setHand(hostPlayer.id, [card("Overindulgence", "placed")], 5, 5); setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, []); setTurn(game.code, hostPlayer.seat);
  const placed = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "overindulgence-placed", targetId: alicePlayer.id });
  assert.equal(placed.status, 200); assert.equal(placed.data.room.phase, "play"); assert.equal(placed.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards[0].id, "overindulgence-placed");
  setHand(hostPlayer.id, [card("Overindulgence", "duplicate")], 5, 5); setTurn(game.code, hostPlayer.seat);
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "overindulgence-duplicate", targetId: alicePlayer.id })).status, 409, "a Judgement Zone cannot contain duplicate Overindulgence cards");

  setHand(alicePlayer.id, [], 4, 4); setTurn(game.code, alicePlayer.seat, "draw");
  const failedJudge = { ...card("Dodge", "failed-judge"), suit: "♠", rank: "7" }; const failedDraws = [card("Attack", "failed-draw-1"), card("Peach", "failed-draw-2")];
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([failedJudge, ...failedDraws]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const skipped = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.phase, "discard"); assert.equal(skipped.data.drawnCards.length, 2); assert.deepEqual(skipped.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, []);
  assert.ok(skipped.data.room.timeline.some((event) => event.type === "card" && event.action === "reveal" && event.card.id === "dodge-failed-judge"));
  assert.ok(skipped.data.room.log.some((entry) => /not a Heart, so the Play Phase is skipped/.test(entry)));

  const overOriginal = { ...card("Dodge", "guicai-over-original"), suit: "♣", rank: "8" };
  const overReplacement = { ...card("Peach", "guicai-over-replacement"), suit: "♥", rank: "Q" };
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(bobPlayer.id)}`);
  setHand(bobPlayer.id, [overReplacement], 4, 4); setEquipment(bobPlayer.id, { armor: card("EightTrigrams", "guicai-equipment") });
  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [card("Overindulgence", "guicai-overindulgence")]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([overOriginal, card("Attack", "guicai-over-draw-1"), card("Dodge", "guicai-over-draw-2")] ))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const overWindow = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(overWindow.status, 200, JSON.stringify(overWindow.data));
  assert.equal(overWindow.data.room.currentAction.triggerEvent, "judgement_revealed");
  assert.equal(overWindow.data.room.actionPlayerId, bobPlayer.id);
  const overView = await state(game.code, bob.token);
  assert.deepEqual(overView.data.currentAction.triggerOptions[0].selection.eligibleCardIds, [overReplacement.id], "Guicai exposes only Sima Yi's hand cards, never equipment");
  const overReplaced = await requestAndSettle("trigger", { code: game.code, token: bob.token, providerId: "sima_yi_guicai", cardId: overReplacement.id });
  assert.equal(overReplaced.status, 200, JSON.stringify(overReplaced.data));
  assert.equal(overReplaced.data.room.phase, "play", "a Heart replacement changes Overindulgence to a successful result");
  assert.ok(overReplaced.data.room.log.some((entry) => /judges Q♥ for Overindulgence.*Heart result allows the Play Phase/.test(entry)));
  assert.ok(discardIds(game.code).includes(overOriginal.id)); assert.ok(discardIds(game.code).includes(overReplacement.id));

  const ended = await requestAndSettle("end_turn", { code: game.code, token: alice.token });
  assert.equal(ended.status, 200); assert.equal(ended.data.room.turnSeat, bobPlayer.seat);

  const heartDelayed = { ...card("Overindulgence", "heart"), suit: "♣", rank: "6" }; const heartJudge = { ...card("Dodge", "heart-judge"), suit: "♥", rank: "9" };
  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [heartDelayed]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([heartJudge, card("Attack", "heart-draw-1"), card("Attack", "heart-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const passed = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(passed.status, 200); assert.equal(passed.data.room.phase, "play"); assert.ok(passed.data.room.log.some((entry) => /Heart result allows the Play Phase/.test(entry)));

  const negatedAtJudgement = { ...card("Overindulgence", "judgement-negated"), suit: "♥", rank: "6" };
  setHand(alicePlayer.id, [card("Negation", "judgement-window")], 4, 4); setJudgement(alicePlayer.id, [negatedAtJudgement]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([card("Dodge", "unused-judgement"), card("Attack", "post-negation-draw-1"), card("Attack", "post-negation-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const judgementWindow = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(judgementWindow.status, 200); assert.equal(judgementWindow.data.room.phase, "response"); assert.equal(judgementWindow.data.room.pendingNegation.cardName, "Overindulgence"); assert.equal(judgementWindow.data.room.actionPlayerId, alicePlayer.id);
  const judgementCancelled = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: "negation-judgement-window" });
  assert.equal(judgementCancelled.status, 200); assert.equal(judgementCancelled.data.room.phase, "draw"); assert.deepEqual(judgementCancelled.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, []);
  assert.equal(judgementCancelled.data.room.log.filter((entry) => /Overindulgence's effect on Alice is cancelled by Negation\./.test(entry)).length, 1, "Negated Overindulgence records one cancellation");
  const afterJudgementNegation = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(afterJudgementNegation.status, 200); assert.equal(afterJudgementNegation.data.room.phase, "play"); assert.equal(afterJudgementNegation.data.room.timeline.some((event) => event.card?.id === "dodge-unused-judgement"), false, "Negation cancels the delayed effect before a judgement card is drawn");


});

test("Lightning is placed on self, transfers after a miss, and deals 3 thunder damage on Spade 2-9", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice, bob] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice"); const bobPlayer = game.room.players.find((player) => player.name === "Bob");
  assert.ok(hostPlayer && alicePlayer && bobPlayer);

  for (const player of game.room.players) setHand(player.id, player.id === hostPlayer.id ? [card("Lightning", "placed")] : [], 5, 5);
  setTurn(game.code, hostPlayer.seat, "play");
  const placed = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "lightning-placed" });
  assert.equal(placed.status, 200); assert.equal(placed.data.room.phase, "play");
  assert.equal(placed.data.room.players.find((player) => player.id === hostPlayer.id).judgementCards[0].id, "lightning-placed");
  setHand(hostPlayer.id, [card("Lightning", "duplicate")], 5, 5); setTurn(game.code, hostPlayer.seat, "play");
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "lightning-duplicate" })).status, 409);

  const negatedJudgementLightning = { ...card("Lightning", "judgement-window"), suit: "♦", rank: "Q" };
  setHand(alicePlayer.id, [card("Negation", "lightning-judgement-window")], 4, 4); setJudgement(alicePlayer.id, [{ ...card("Overindulgence", "intact-after-lightning"), suit: "♣", rank: "6" }, negatedJudgementLightning]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([card("Dodge", "unused-lightning-judge")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const judgementNegationWindow = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(judgementNegationWindow.status, 200); assert.equal(judgementNegationWindow.data.room.pendingNegation.cardName, "Lightning");
  const latestLightningEvent = judgementNegationWindow.data.room.timeline.filter((event) => event.type === "card" && event.card.id === "lightning-judgement-window").at(-1);
  assert.equal(latestLightningEvent.action, "activate", "a fresh judgement activation anchors the current Negation presentation instead of the original turn's discards");
  const negatedLightning = (await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: "negation-lightning-judgement-window" })).data.room;
  assert.equal(negatedLightning.phase, "draw"); assert.deepEqual(negatedLightning.players.find((player) => player.id === alicePlayer.id).judgementCards.map((delayed) => delayed.id), ["overindulgence-intact-after-lightning"]); assert.deepEqual(negatedLightning.players.find((player) => player.id === bobPlayer.id).judgementCards.map((delayed) => delayed.id), ["lightning-judgement-window"], "Negated Lightning transfers without drawing a Judgement");

  const missedLightning = { ...card("Lightning", "miss"), suit: "♠", rank: "K" }; const missJudge = { ...card("Dodge", "miss-judge"), suit: "♥", rank: "7" };
  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [missedLightning]); setJudgement(bobPlayer.id, []); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([missJudge, card("Attack", "miss-draw-1"), card("Peach", "miss-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const missed = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(missed.status, 200); assert.equal(missed.data.room.phase, "play"); assert.equal(missed.data.drawnCards.length, 2);
  assert.deepEqual(missed.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, []);
  assert.equal(missed.data.room.players.find((player) => player.id === bobPlayer.id).judgementCards[0].id, "lightning-miss");
  assert.ok(missed.data.room.log.some((entry) => /Lightning misses and transfers to Bob/.test(entry)));

  const hitLightning = { ...card("Lightning", "hit"), suit: "♥", rank: "A" }; const hitJudge = { ...card("Attack", "hit-judge"), suit: "♠", rank: "5" };
  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [hitLightning]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([hitJudge, card("Attack", "hit-draw-1"), card("Dodge", "hit-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const hit = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(hit.status, 200); assert.equal(hit.data.room.phase, "play"); assert.equal(hit.data.drawnCards.length, 2);
  assert.equal(hit.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.deepEqual(hit.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, []);
  assert.ok(hit.data.room.log.some((entry) => /takes 3 thunder damage/.test(entry)));

  for (const player of game.room.players) setHand(player.id, player.id === bobPlayer.id ? [card("Peach", "lightning-rescue-1"), card("Peach", "lightning-rescue-2"), card("Peach", "lightning-rescue-3")] : [], player.id === alicePlayer.id ? 1 : 4, player.id === hostPlayer.id ? 5 : 4);
  setJudgement(alicePlayer.id, [{ ...card("Lightning", "lethal"), suit: "♦", rank: "Q" }]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([{ ...card("Attack", "lethal-judge"), suit: "♠", rank: "8" }, card("Attack", "unused-lethal-draw")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const lethal = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(lethal.status, 200); assert.equal(lethal.data.room.players.find((player) => player.id === alicePlayer.id).hp, -2, "Lightning preserves true post-damage HP");
  const rescueView = await state(game.code, bob.token); assert.equal(rescueView.data.pendingDying.recoveryNeeded, 3);
  for (const id of ["peach-lightning-rescue-1", "peach-lightning-rescue-2", "peach-lightning-rescue-3"]) {
    const rescued = await requestAndSettle("give_peach", { code: game.code, token: bob.token, cardId: id });
    assert.equal(rescued.status, 200);
  }
  const rescued = await state(game.code, alice.token);
  assert.equal(rescued.data.players.find((player) => player.id === alicePlayer.id).hp, 1, "three Peaches rescue a target from -2 HP");
  assert.equal(rescued.data.players.find((player) => player.id === alicePlayer.id).alive, true);
});

test("delayed Standard cards resolve newest first and stale draws cannot replay them", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice"); const bobPlayer = game.room.players.find((player) => player.name === "Bob");
  assert.ok(hostPlayer && alicePlayer && bobPlayer);
  for (const player of game.room.players) setHand(player.id, [], 4, 4);

  const olderLightning = { ...card("Lightning", "older"), suit: "♥", rank: "Q" }; const newerOverindulgence = { ...card("Overindulgence", "newer"), suit: "♣", rank: "6" };
  setJudgement(alicePlayer.id, [olderLightning, newerOverindulgence]); setTurn(game.code, alicePlayer.seat, "draw");
  setDeck(game.code, [{ ...card("Dodge", "over-judge"), suit: "♠", rank: "7" }, { ...card("Dodge", "lightning-judge"), suit: "♥", rank: "7" }]);
  const alice = game.members.find((member) => member.name === "Alice"); const beforeFirstDraw = await state(game.code, alice.token);
  const newestFirst = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(newestFirst.status, 200); assert.equal(newestFirst.data.room.phase, "draw-skip-play"); assert.deepEqual(newestFirst.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards.map((delayed) => delayed.id), ["lightning-older"]);
  assert.ok(newestFirst.data.room.log.some((entry) => /Overindulgence/.test(entry)));
  const staleDraw = await requestAndSettle("draw", { code: game.code, token: alice.token, context: { actionRevision: beforeFirstDraw.data.actionRevision } });
  assert.equal(staleDraw.status, 409); assert.equal(staleDraw.data.stale, true); assert.deepEqual(staleDraw.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards.map((delayed) => delayed.id), ["lightning-older"], "the stale revision cannot resolve the remaining delayed card");
  const olderResolved = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(olderResolved.status, 200); assert.deepEqual(olderResolved.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, []); assert.ok(olderResolved.data.room.log.some((entry) => /Lightning misses and transfers to Bob/.test(entry)), "the older Lightning resolves after the newer Overindulgence");
  assert.equal(olderResolved.data.room.players.find((player) => player.id === bobPlayer.id).judgementCards[0].id, "lightning-older");

  const lightning = { ...card("Lightning", "race"), suit: "♥", rank: "Q" }; setJudgement(alicePlayer.id, [lightning]); setTurn(game.code, alicePlayer.seat, "draw"); setDeck(game.code, [{ ...card("Dodge", "race-judge"), suit: "♥", rank: "7" }, card("Attack", "race-draw-1"), card("Attack", "race-draw-2")]);
  const [first, second] = await Promise.all([request("draw", { code: game.code, token: alice.token }), request("draw", { code: game.code, token: alice.token })]);
  assert.equal([first.status, second.status].filter((status) => status === 200).length, 1, "duplicate draw submissions resolve one delayed effect");
  const afterRace = await state(game.code, alice.token); assert.equal(afterRace.data.players.find((player) => player.id === alicePlayer.id).judgementCards.length, 0);
});

test("Rations Depleted targets at distance 1 and skips only a failed target's Draw Phase", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice"); const bobPlayer = game.room.players.find((player) => player.name === "Bob");
  assert.ok(hostPlayer && alicePlayer && bobPlayer);

  setHand(hostPlayer.id, [card("RationsDepleted", "far")], 5, 5); setTurn(game.code, hostPlayer.seat, "play");
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "rationsdepleted-far", targetId: bobPlayer.id })).status, 409, "Rations Depleted cannot target a character at distance 2");
  setHand(hostPlayer.id, [card("RationsDepleted", "placement-negated")], 5, 5); setHand(alicePlayer.id, [card("Negation", "rations-placement")], 4, 4); setTurn(game.code, hostPlayer.seat, "play");
  const placementWindow = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "rationsdepleted-placement-negated", targetId: alicePlayer.id });
  assert.equal(placementWindow.status, 200); assert.equal(placementWindow.data.room.pendingNegation.cardName, "Rations Depleted");
  const placementCancelled = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: "negation-rations-placement" });
  assert.equal(placementCancelled.status, 200); assert.deepEqual(placementCancelled.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, [], "Negation cancels Rations Depleted before placement");
  setHand(hostPlayer.id, [card("RationsDepleted", "placed")], 5, 5); setTurn(game.code, hostPlayer.seat, "play");
  const placed = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "rationsdepleted-placed", targetId: alicePlayer.id });
  assert.equal(placed.status, 200); assert.equal(placed.data.room.phase, "play"); assert.equal(placed.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards[0].id, "rationsdepleted-placed");
  setHand(hostPlayer.id, [card("RationsDepleted", "duplicate")], 5, 5); setTurn(game.code, hostPlayer.seat, "play");
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "rationsdepleted-duplicate", targetId: alicePlayer.id })).status, 409, "a Judgement Zone cannot contain duplicate Rations Depleted cards");

  const failedRations = { ...card("RationsDepleted", "failed"), suit: "♣", rank: "4" }; const failedJudge = { ...card("Dodge", "failed-rations-judge"), suit: "♠", rank: "10" };
  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [failedRations]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([failedJudge, card("Attack", "blocked-draw-1"), card("Peach", "blocked-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const skipped = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.phase, "play"); assert.equal(skipped.data.drawnCards, undefined); assert.equal(skipped.data.room.myHand.length, 0, "failed Rations Depleted draws no cards but still allows Play");
  assert.ok(skipped.data.room.log.some((entry) => /not a Club, so the Draw Phase is skipped/.test(entry)));
  assert.ok(discardIds(game.code).includes("rationsdepleted-failed")); assert.ok(discardIds(game.code).includes("dodge-failed-rations-judge"));

  const clubRations = { ...card("RationsDepleted", "club"), suit: "♠", rank: "10" }; const clubJudge = { ...card("Dodge", "club-rations-judge"), suit: "♣", rank: "7" };
  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [clubRations]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([clubJudge, card("Attack", "club-draw-1"), card("Peach", "club-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const passed = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(passed.status, 200); assert.equal(passed.data.room.phase, "play"); assert.equal(passed.data.drawnCards.length, 2); assert.ok(passed.data.room.log.some((entry) => /Club result allows the Draw Phase/.test(entry)));

  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [{ ...card("RationsDepleted", "combined"), suit: "♠", rank: "10" }, { ...card("Overindulgence", "combined"), suit: "♥", rank: "6" }]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([{ ...card("Dodge", "combined-rations-judge"), suit: "♠", rank: "10" }, { ...card("Dodge", "combined-overindulgence-judge"), suit: "♠", rank: "7" }, card("Attack", "combined-unused-draw")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const firstDelayed = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(firstDelayed.status, 200); assert.equal(firstDelayed.data.room.phase, "draw-skip-play"); assert.equal(firstDelayed.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards.length, 1, "the older delayed card remains after the newer card resolves first");
  const combinedSkip = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(combinedSkip.status, 200); assert.equal(combinedSkip.data.room.phase, "discard"); assert.equal(combinedSkip.data.drawnCards, undefined); assert.equal(combinedSkip.data.room.myHand.length, 0, "Rations Depleted and Overindulgence preserve both skipped phases across consecutive judgements");

  const negatedRations = { ...card("RationsDepleted", "judgement-negated"), suit: "♠", rank: "10" };
  setHand(alicePlayer.id, [card("Negation", "rations-judgement-window")], 4, 4); setJudgement(alicePlayer.id, [negatedRations]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([card("Dodge", "unused-rations-judge"), card("Attack", "negated-draw-1"), card("Peach", "negated-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const judgementWindow = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(judgementWindow.status, 200); assert.equal(judgementWindow.data.room.pendingNegation.cardName, "Rations Depleted");
  const cancelled = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: "negation-rations-judgement-window" });
  assert.equal(cancelled.status, 200); assert.equal(cancelled.data.room.phase, "draw");
  const afterNegation = await requestAndSettle("draw", { code: game.code, token: alice.token });
  assert.equal(afterNegation.status, 200); assert.equal(afterNegation.data.drawnCards.length, 2); assert.equal(afterNegation.data.room.timeline.some((event) => event.card?.id === "dodge-unused-rations-judge"), false);


});


