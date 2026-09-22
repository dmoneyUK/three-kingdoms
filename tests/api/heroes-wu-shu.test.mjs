/* eslint-disable @typescript-eslint/no-unused-vars */
import test from "node:test";
import {
  assert, card, createHumanGame, createHumanSetupGame, createTestGame, createTestLobby, discardIds, distributeLegacy, drainEmptyPrivateDecisions, markReady, normalizeRoomData, openBorrowedSwordScenario, openFankuiAttack, openGanglieAttack, openGanglieGroup, openGuoDamage, openHujiaScenario, passNegationWindows, prepareGuoJudgement, query, quote, request, requestAndSettle, roomCardCount, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state, takeDamageIfPending, waitForState,
} from "./test-support.mjs";

test("Fanjian validates target ownership, empty hands, matching suits, once-per-phase state, and Dying", async () => {
  const selfGame = await createHumanGame(); const self = selfGame.room.players[0]; const selfCard = card("Peach", "fanjian-self");
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(self.id)}`); setHand(self.id, [selfCard], 3, 3); setTurn(selfGame.code, self.seat);
  assert.equal((await requestAndSettle("trigger", { code: selfGame.code, token: selfGame.members[0].token, providerId: "zhou_yu_fanjian", targetId: self.id })).status, 409, "Zhou Yu cannot target himself");
  const emptyGame = await createHumanGame(); const emptySource = emptyGame.room.players[0]; const emptyTarget = emptyGame.room.players[1];
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(emptySource.id)}`); setHand(emptySource.id, [], 3, 3); setTurn(emptyGame.code, emptySource.seat);
  assert.equal((await requestAndSettle("trigger", { code: emptyGame.code, token: emptyGame.members[0].token, providerId: "zhou_yu_fanjian", targetId: emptyTarget.id })).status, 409, "Fanjian requires a non-empty hand");

  const matchGame = await createHumanGame(); const matchSource = matchGame.room.players[0]; const matchTarget = matchGame.room.players[1]; const matchCard = card("Peach", "fanjian-match", "♥");
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(matchSource.id)}`); setHand(matchSource.id, [matchCard], 3, 3); setHand(matchTarget.id, [], 4, 4); setTurn(matchGame.code, matchSource.seat);
  await requestAndSettle("trigger", { code: matchGame.code, token: matchGame.members[0].token, providerId: "zhou_yu_fanjian", targetId: matchTarget.id });
  await requestAndSettle("trigger", { code: matchGame.code, token: matchGame.members[1].token, providerId: "zhou_yu_fanjian_choice", choice: "♥" });
  const matched = await requestAndSettle("trigger", { code: matchGame.code, token: matchGame.members[1].token, providerId: "zhou_yu_fanjian_choice", cardKeys: ["hand:0"] });
  assert.equal(matched.status, 200, JSON.stringify(matched.data)); assert.equal(matched.data.room.players.find((player) => player.id === matchTarget.id).hp, 4); assert.equal((await requestAndSettle("trigger", { code: matchGame.code, token: matchGame.members[0].token, providerId: "zhou_yu_fanjian", targetId: matchTarget.id })).status, 409, "Fanjian cannot be used twice in one Play Phase");
  for (const player of matchGame.room.players.slice(2)) setHand(player.id, [], 4, 4);
  assert.equal((await requestAndSettle("end_turn", { code: matchGame.code, token: matchGame.members[0].token })).status, 200);
  for (const index of [1, 2, 3]) {
    assert.equal((await requestAndSettle("draw", { code: matchGame.code, token: matchGame.members[index].token })).status, 200);
    assert.equal((await requestAndSettle("end_turn", { code: matchGame.code, token: matchGame.members[index].token })).status, 200);
  }
  const nextDraw = await requestAndSettle("draw", { code: matchGame.code, token: matchGame.members[0].token }); assert.equal(nextDraw.status, 200, JSON.stringify(nextDraw.data)); assert.equal(nextDraw.data.room.currentAction.triggerOptions[0].effectId, "zhou_yu_yingzi");
  const nextPlay = await requestAndSettle("decline_trigger", { code: matchGame.code, token: matchGame.members[0].token }); assert.equal(nextPlay.status, 200, JSON.stringify(nextPlay.data)); assert.ok(nextPlay.data.room.currentAction.triggerOptions.some((option) => option.effectId === "zhou_yu_fanjian"), "Fanjian resets on Zhou Yu's next turn");

  const dyingGame = await createHumanGame(); const dyingSource = dyingGame.room.players[0]; const dyingTarget = dyingGame.room.players[1]; const dyingCard = card("Peach", "fanjian-dying", "♥");
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(dyingSource.id)}`); setHand(dyingSource.id, [dyingCard], 3, 3); setHand(dyingTarget.id, [], 1, 4); setTurn(dyingGame.code, dyingSource.seat);
  await requestAndSettle("trigger", { code: dyingGame.code, token: dyingGame.members[0].token, providerId: "zhou_yu_fanjian", targetId: dyingTarget.id });
  await requestAndSettle("trigger", { code: dyingGame.code, token: dyingGame.members[1].token, providerId: "zhou_yu_fanjian_choice", choice: "♠" });
  const lethal = await requestAndSettle("trigger", { code: dyingGame.code, token: dyingGame.members[1].token, providerId: "zhou_yu_fanjian_choice", cardKeys: ["hand:0"] });
  assert.equal(lethal.status, 200, JSON.stringify(lethal.data)); assert.equal(lethal.data.room.phase, "dying"); assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(dyingTarget.id)}`)).map((item) => item.id), [dyingCard.id]);
});

test("Yingzi uses the same optional trigger sequence in host test flow and rejects duplicate acceptance", async () => {
  const quick = await createTestGame(); const { token, room } = quick.data; const source = room.players[0];
  const drawCardsForYingzi = [card("Peach", "quick-yingzi-a"), card("Dodge", "quick-yingzi-b"), card("Attack", "quick-yingzi-c")];
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(source.id)}`); setHand(source.id, [], 3, 3); setDeck(room.code, drawCardsForYingzi); setTurn(room.code, source.seat, "draw");
  const opened = await requestAndSettle("draw", { code: room.code, token }); assert.equal(opened.status, 200, JSON.stringify(opened.data)); assert.equal(opened.data.room.meId, source.id); assert.deepEqual(opened.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["zhou_yu_yingzi"]);
  const submissions = await Promise.all([
    requestAndSettle("trigger", { code: room.code, token, providerId: "zhou_yu_yingzi" }),
    requestAndSettle("trigger", { code: room.code, token, providerId: "zhou_yu_yingzi" }),
  ]);
  assert.deepEqual(submissions.map((result) => result.status).sort(), [200, 409]);
  const resolved = await state(room.code, token); assert.equal(resolved.data.myHand.length, 3, "host test flow accepts Yingzi once and draws exactly three normal cards"); assert.equal(resolved.data.phase, "play");
});

test("Yingzi opens only after a Zhou Yu delayed Judgement resolves", async () => {
  const game = await createHumanGame(); const source = game.room.players[0];
  const delayed = card("Overindulgence", "yingzi-delayed"); const judge = card("Dodge", "yingzi-judge", "♥"); const normalDraw = [card("Peach", "yingzi-normal-a"), card("Dodge", "yingzi-normal-b"), card("Attack", "yingzi-normal-c")];
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(source.id)}`); setHand(source.id, [], 3, 3); setJudgement(source.id, [delayed]); setDeck(game.code, [judge, ...normalDraw]); setTurn(game.code, source.seat, "draw");
  const opened = await requestAndSettle("draw", { code: game.code, token: game.members[0].token }); assert.equal(opened.status, 200, JSON.stringify(opened.data)); assert.equal(opened.data.room.currentAction.triggerOptions[0].effectId, "zhou_yu_yingzi");
  const judgementIndex = opened.data.room.log.findIndex((entry) => entry.includes("judges A♥ for Overindulgence")); const heroicIndex = opened.data.room.log.findIndex((entry) => entry.includes("may use Heroic"));
  assert.ok(judgementIndex >= 0 && judgementIndex < heroicIndex, "Judgement resolves before Heroic is offered");
  const declined = await requestAndSettle("decline_trigger", { code: game.code, token: game.members[0].token }); assert.equal(declined.status, 200, JSON.stringify(declined.data)); assert.equal(declined.data.room.myHand.length, 2);
});

test("Zhang Liao Assault replaces normal Draw Phase cards with private hand transfers", async () => {
  const declinedGame = await createHumanGame(); const declinedSource = declinedGame.room.players[0]; const declinedTarget = declinedGame.room.players[1];
  const declinedCard = card("Peach", "assault-decline-target", "♥"); const declinedDeck = [card("Attack", "assault-decline-a"), card("Dodge", "assault-decline-b")];
  sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(declinedSource.id)}`); setHand(declinedSource.id, [], 4, 4); setHand(declinedTarget.id, [declinedCard], 4, 4); for (const player of declinedGame.room.players.slice(2)) setHand(player.id, [], 4, 4); setDeck(declinedGame.code, declinedDeck); setTurn(declinedGame.code, declinedSource.seat, "draw");
  const declinedOffer = await requestAndSettle("draw", { code: declinedGame.code, token: declinedGame.members[0].token });
  assert.equal(declinedOffer.status, 200, JSON.stringify(declinedOffer.data)); assert.equal(declinedOffer.data.room.currentAction.triggerOptions[0].label, "Assault"); assert.ok(declinedOffer.data.room.currentAction.legalActions.includes("decline_trigger"));
  const declined = await requestAndSettle("decline_trigger", { code: declinedGame.code, token: declinedGame.members[0].token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data)); assert.equal(declined.data.room.myHand.length, 2, "declining Assault draws the normal two deck cards"); assert.equal(declined.data.room.deckCount, 0);

  const one = await createHumanGame(); const source = one.room.players[0]; const target = one.room.players[1]; const hidden = { ...card("Peach", "assault-one-hidden", "♦"), rank: "9" }; const oneDeck = [card("Attack", "assault-one-deck-a"), card("Dodge", "assault-one-deck-b")];
  sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(source.id)}`); setHand(source.id, [], 4, 4); setHand(target.id, [hidden], 4, 4); for (const player of one.room.players.slice(2)) setHand(player.id, [], 4, 4); setDeck(one.code, oneDeck); setTurn(one.code, source.seat, "draw");
  const opened = await requestAndSettle("draw", { code: one.code, token: one.members[0].token }); const option = opened.data.room.currentAction.triggerOptions.find((candidate) => candidate.effectId === "zhang_liao_assault");
  assert.ok(option); assert.deepEqual(option.selection, { type: "target", targetIds: [target.id], min: 1, max: 2 }); assert.equal(JSON.stringify(opened.data.room.currentAction).includes(hidden.id), false);
  const observer = await state(one.code, one.members[1].token); assert.deepEqual(observer.data.currentAction.triggerOptions, [], "other players cannot see Zhang Liao's private trigger options");
  const reloaded = await state(one.code, one.members[0].token); assert.equal(reloaded.data.actionRevision, opened.data.room.actionRevision, "reload preserves the same Assault decision revision"); assert.deepEqual(reloaded.data.currentAction, opened.data.room.currentAction);
  const oneBefore = new Set([hidden.id, ...oneDeck.map((held) => held.id)]);
  const obtained = await requestAndSettle("trigger", { code: one.code, token: one.members[0].token, providerId: "zhang_liao_assault", targetIds: [target.id] });
  assert.equal(obtained.status, 200, JSON.stringify(obtained.data)); assert.equal(obtained.data.room.phase, "play"); assert.equal(obtained.data.room.deckCount, 2, "Assault does not consume deck cards"); assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(target.id)}`)), []); assert.deepEqual(obtained.data.room.myHand.map((held) => held.id), [hidden.id]); assert.deepEqual(new Set([...obtained.data.room.myHand.map((held) => held.id), ...JSON.parse(query(`SELECT deck_json FROM rooms WHERE code=${quote(one.code)}`)).map((held) => held.id)]), oneBefore); const publicTimeline = (await state(one.code, one.members[1].token)).data.timeline; assert.equal(publicTimeline.some((entry) => [hidden.id].some((value) => JSON.stringify(entry).includes(value))), false, "public history does not reveal transferred card details");

  const two = await createHumanGame(); const twoSource = two.room.players[0]; const twoA = two.room.players[1]; const twoB = two.room.players[2]; const twoCardA = card("Peach", "assault-two-a", "♣"); const twoCardB = card("Dodge", "assault-two-b", "♠"); const twoDeck = [card("Attack", "assault-two-deck-a"), card("Attack", "assault-two-deck-b")];
  sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(twoSource.id)}`); setHand(twoSource.id, [], 4, 4); setHand(twoA.id, [twoCardA], 4, 4); setHand(twoB.id, [twoCardB], 4, 4); setHand(two.room.players[3].id, [], 4, 4); setDeck(two.code, twoDeck); setTurn(two.code, twoSource.seat, "draw");
  await requestAndSettle("draw", { code: two.code, token: two.members[0].token }); const twoResolved = await requestAndSettle("trigger", { code: two.code, token: two.members[0].token, providerId: "zhang_liao_assault", targetIds: [twoA.id, twoB.id] });
  assert.equal(twoResolved.status, 200, JSON.stringify(twoResolved.data)); assert.equal(twoResolved.data.room.myHand.length, 2); assert.equal(twoResolved.data.room.deckCount, 2); assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(twoA.id)}`)), []); assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(twoB.id)}`)), []); assert.deepEqual(new Set(twoResolved.data.room.myHand.map((held) => held.id)), new Set([twoCardA.id, twoCardB.id]));

  const invalid = await createHumanGame(); const invalidSource = invalid.room.players[0]; const invalidA = invalid.room.players[1]; const invalidB = invalid.room.players[2]; const invalidCard = card("Peach", "assault-invalid", "♥");
  sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(invalidSource.id)}`); setHand(invalidSource.id, [card("Dodge", "assault-self")], 4, 4); setHand(invalidA.id, [invalidCard], 4, 4); setHand(invalidB.id, [card("Attack", "assault-invalid-b")], 4, 4); setHand(invalid.room.players[3].id, [], 4, 4); setDeck(invalid.code, [card("Attack", "assault-invalid-deck-a"), card("Dodge", "assault-invalid-deck-b")]); setTurn(invalid.code, invalidSource.seat, "draw");
  await requestAndSettle("draw", { code: invalid.code, token: invalid.members[0].token }); const invalidBefore = JSON.stringify(await state(invalid.code, invalid.members[0].token));
  for (const targetIds of [[invalidA.id, invalidB.id, invalid.room.players[3].id], [invalidA.id, invalidA.id], [invalidSource.id], [invalid.room.players[3].id]]) {
    const rejected = await requestAndSettle("trigger", { code: invalid.code, token: invalid.members[0].token, providerId: "zhang_liao_assault", targetIds }); assert.equal(rejected.status, 409); assert.equal(JSON.stringify(await state(invalid.code, invalid.members[0].token)), invalidBefore, "invalid Assault selection leaves state unchanged");
  }
  const staleContext = (await state(invalid.code, invalid.members[0].token)).data; const declinedInvalid = await requestAndSettle("decline_trigger", { code: invalid.code, token: invalid.members[0].token }); assert.equal(declinedInvalid.status, 200); const stale = await requestAndSettle("trigger", { code: invalid.code, token: invalid.members[0].token, providerId: "zhang_liao_assault", targetIds: [invalidA.id], context: { actionRevision: staleContext.actionRevision, meId: invalidSource.id, phase: "response", pendingKind: "trigger", actorId: invalidSource.id } }); assert.equal(stale.status, 409); assert.equal(stale.data.stale, true);

  const empty = await createHumanGame(); const emptySource = empty.room.players[0];
  sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(emptySource.id)}`); for (const player of empty.room.players) setHand(player.id, [], 4, 4); setDeck(empty.code, [card("Attack", "assault-empty-a"), card("Dodge", "assault-empty-b")]); setTurn(empty.code, emptySource.seat, "draw");
  const noTarget = await requestAndSettle("draw", { code: empty.code, token: empty.members[0].token }); assert.equal(noTarget.status, 200); assert.equal(noTarget.data.room.currentAction.kind, "turn"); assert.equal(noTarget.data.room.phase, "play"); assert.equal(noTarget.data.room.myHand.length, 2, "without eligible targets normal draw continues");

  const delayed = await createHumanGame(); const delayedSource = delayed.room.players[0]; const delayedTarget = delayed.room.players[1]; const delayedCard = card("Peach", "assault-delayed-target", "♥"); const overindulgence = card("Overindulgence", "assault-delayed"); const judgement = card("Dodge", "assault-delayed-judgement", "♥");
  sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(delayedSource.id)}`); setHand(delayedSource.id, [], 4, 4); setHand(delayedTarget.id, [delayedCard], 4, 4); for (const player of delayed.room.players.slice(2)) setHand(player.id, [], 4, 4); setJudgement(delayedSource.id, [overindulgence]); setDeck(delayed.code, [judgement, card("Attack", "assault-delayed-deck-a"), card("Dodge", "assault-delayed-deck-b")]); setTurn(delayed.code, delayedSource.seat, "draw");
  const delayedOpened = await requestAndSettle("draw", { code: delayed.code, token: delayed.members[0].token }); assert.equal(delayedOpened.status, 200); assert.equal(delayedOpened.data.room.currentAction.triggerOptions[0].effectId, "zhang_liao_assault"); assert.ok(delayedOpened.data.room.log.findIndex((entry) => entry.includes("judges A♥ for Overindulgence")) < delayedOpened.data.room.log.findIndex((entry) => entry.includes("may use Assault")), "Assault opens after delayed Judgement resolution");
});

test("Xu Zhu Bared Bodied replaces one Draw Phase card and scopes Attack/Duel damage to the active turn", { timeout: 120_000 }, async () => {
  const declined = await createHumanGame(); const declinedSource = declined.room.players[0];
  sql(`UPDATE players SET hero='xu-chu' WHERE id=${quote(declinedSource.id)}`); setHand(declinedSource.id, [], 4, 4); for (const player of declined.room.players.slice(1)) setHand(player.id, [], 4, 4); setDeck(declined.code, [card("Attack", "bared-decline-a"), card("Dodge", "bared-decline-b")]); setTurn(declined.code, declinedSource.seat, "draw");
  const declinedOffer = await requestAndSettle("draw", { code: declined.code, token: declined.members[0].token }); assert.equal(declinedOffer.status, 200, JSON.stringify(declinedOffer.data)); assert.equal(declinedOffer.data.room.currentAction.triggerOptions[0].label, "Bared Bodied");
  const declinedRevision = declinedOffer.data.room.actionRevision; const declinedResult = await requestAndSettle("decline_trigger", { code: declined.code, token: declined.members[0].token }); assert.equal(declinedResult.status, 200, JSON.stringify(declinedResult.data)); assert.equal(declinedResult.data.room.myHand.length, 2); assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(declined.code)}`)).baredBodiedActive, undefined);
  const stale = await requestAndSettle("trigger", { code: declined.code, token: declined.members[0].token, providerId: "xu_chu_bared_bodied", context: { actionRevision: declinedRevision, meId: declinedSource.id, phase: "response", pendingKind: "trigger", actorId: declinedSource.id } }); assert.equal(stale.status, 409); assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(declined.code)}`)).baredBodiedActive, undefined);

  const accepted = await createHumanGame(); const acceptedSource = accepted.room.players[0]; const acceptedAttack = card("Attack", "bared-accepted-attack");
  sql(`UPDATE players SET hero='xu-chu' WHERE id=${quote(acceptedSource.id)}`); setHand(acceptedSource.id, [], 4, 4); for (const player of accepted.room.players.slice(1)) setHand(player.id, [], 4, 4); setDeck(accepted.code, [acceptedAttack, card("Dodge", "bared-accepted-deck")]); setTurn(accepted.code, acceptedSource.seat, "draw");
  const acceptedOffer = await requestAndSettle("draw", { code: accepted.code, token: accepted.members[0].token }); const acceptedResult = await requestAndSettle("trigger", { code: accepted.code, token: accepted.members[0].token, providerId: "xu_chu_bared_bodied" });
  assert.equal(acceptedResult.status, 200, JSON.stringify(acceptedResult.data)); assert.equal(acceptedResult.data.room.myHand.length, 1); assert.equal(acceptedResult.data.room.deckCount, 1); assert.deepEqual(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(accepted.code)}`)), { turnPlayerId: acceptedSource.id, baredBodiedActive: true });
  const reloaded = await state(accepted.code, accepted.members[0].token); assert.equal(reloaded.data.myHand[0].id, acceptedAttack.id); assert.deepEqual(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(accepted.code)}`)), { turnPlayerId: acceptedSource.id, baredBodiedActive: true }); assert.ok(acceptedOffer.data.room.currentAction.triggerOptions.some((option) => option.effectId === "xu_chu_bared_bodied"));

  const attackTarget = accepted.room.players[1]; const attackResult = await requestAndSettle("play_card", { code: accepted.code, token: accepted.members[0].token, cardId: acceptedAttack.id, targetId: attackTarget.id }); assert.equal(attackResult.status, 200, JSON.stringify(attackResult.data)); assert.equal(attackResult.data.room.players.find((player) => player.id === attackTarget.id).hp, 2); assert.equal(attackResult.data.room.log.filter((entry) => entry.includes("takes 2 damage")).length, 1);

  const duel = await createHumanGame(); const duelSource = duel.room.players[0]; const duelTarget = duel.room.players[1]; const duelCard = card("Duel", "bared-duel");
  sql(`UPDATE players SET hero='xu-chu' WHERE id=${quote(duelSource.id)}`); setHand(duelSource.id, [], 4, 4); setHand(duelTarget.id, [], 4, 4); for (const player of duel.room.players.slice(2)) setHand(player.id, [], 4, 4); setDeck(duel.code, [duelCard, card("Dodge", "bared-duel-deck")]); setTurn(duel.code, duelSource.seat, "draw");
  await requestAndSettle("draw", { code: duel.code, token: duel.members[0].token }); await requestAndSettle("trigger", { code: duel.code, token: duel.members[0].token, providerId: "xu_chu_bared_bodied" }); const duelResult = await requestAndSettle("play_card", { code: duel.code, token: duel.members[0].token, cardId: duelCard.id, targetId: duelTarget.id });
  assert.equal(duelResult.status, 200, JSON.stringify(duelResult.data)); assert.equal(duelResult.data.room.players.find((player) => player.id === duelTarget.id).hp, 2); assert.equal(duelResult.data.room.log.filter((entry) => entry.includes("2 Duel damage")).length, 1);

  const duelLoss = await createHumanGame(); const lossSource = duelLoss.room.players[0]; const lossTarget = duelLoss.room.players[1]; const lossDuel = card("Duel", "bared-duel-loss"); const lossAttack = card("Attack", "bared-duel-loss-response");
  sql(`UPDATE players SET hero='xu-chu' WHERE id=${quote(lossSource.id)}`); setHand(lossSource.id, [], 4, 4); setHand(lossTarget.id, [lossAttack], 4, 4); for (const player of duelLoss.room.players.slice(2)) setHand(player.id, [], 4, 4); setDeck(duelLoss.code, [lossDuel, card("Dodge", "bared-duel-loss-deck")]); setTurn(duelLoss.code, lossSource.seat, "draw");
  await requestAndSettle("draw", { code: duelLoss.code, token: duelLoss.members[0].token }); await requestAndSettle("trigger", { code: duelLoss.code, token: duelLoss.members[0].token, providerId: "xu_chu_bared_bodied" }); await requestAndSettle("play_card", { code: duelLoss.code, token: duelLoss.members[0].token, cardId: lossDuel.id, targetId: lossTarget.id, preserveResponse: true }); const lossRespond = await requestAndSettle("respond", { code: duelLoss.code, token: duelLoss.members[1].token, cardId: lossAttack.id, preserveResponse: true }); assert.equal(lossRespond.status, 200, JSON.stringify(lossRespond.data)); const lossResult = await requestAndSettle("decline_response", { code: duelLoss.code, token: duelLoss.members[0].token }); assert.equal(lossResult.status, 200, JSON.stringify(lossResult.data)); assert.equal(lossResult.data.room.players.find((player) => player.id === lossSource.id).hp, 3); assert.equal(lossResult.data.room.players.find((player) => player.id === lossTarget.id).hp, 4);

  const dying = await createHumanGame(); const dyingSource = dying.room.players[0]; const dyingTarget = dying.room.players[1]; const dyingAttack = card("Attack", "bared-dying-attack");
  sql(`UPDATE players SET hero='xu-chu' WHERE id=${quote(dyingSource.id)}`); setHand(dyingSource.id, [], 4, 4); setHand(dyingTarget.id, [], 2, 4); for (const player of dying.room.players.slice(2)) setHand(player.id, [], 4, 4); setDeck(dying.code, [dyingAttack]); setTurn(dying.code, dyingSource.seat, "draw");
  await requestAndSettle("draw", { code: dying.code, token: dying.members[0].token }); await requestAndSettle("trigger", { code: dying.code, token: dying.members[0].token, providerId: "xu_chu_bared_bodied" }); const dyingResult = await requestAndSettle("play_card", { code: dying.code, token: dying.members[0].token, cardId: dyingAttack.id, targetId: dyingTarget.id });
  assert.equal(dyingResult.status, 200, JSON.stringify(dyingResult.data)); assert.equal(dyingResult.data.room.players.find((player) => player.id === dyingTarget.id).alive, false); assert.equal(dyingResult.data.room.log.filter((entry) => entry.includes("takes 2 damage")).length, 1);

  const reset = await createHumanGame(); const resetSource = reset.room.players[0];
  sql(`UPDATE players SET hero='xu-chu' WHERE id=${quote(resetSource.id)}`); setHand(resetSource.id, [], 4, 4); for (const player of reset.room.players.slice(1)) setHand(player.id, [], 4, 4); setDeck(reset.code, [card("Dodge", "bared-reset-a"), card("Dodge", "bared-reset-b"), card("Dodge", "bared-reset-c"), card("Dodge", "bared-reset-d"), card("Dodge", "bared-reset-e"), card("Dodge", "bared-reset-f"), card("Dodge", "bared-reset-g"), card("Dodge", "bared-reset-h"), card("Dodge", "bared-reset-i")]); setTurn(reset.code, resetSource.seat, "draw");
  await requestAndSettle("draw", { code: reset.code, token: reset.members[0].token }); await requestAndSettle("trigger", { code: reset.code, token: reset.members[0].token, providerId: "xu_chu_bared_bodied" }); await requestAndSettle("end_turn", { code: reset.code, token: reset.members[0].token });
  for (let seat = 1; seat < reset.room.players.length; seat++) { await requestAndSettle("draw", { code: reset.code, token: reset.members[seat].token }); await requestAndSettle("end_turn", { code: reset.code, token: reset.members[seat].token }); }
  const resetState = await state(reset.code, reset.members[0].token); assert.equal(resetState.data.phase, "draw"); assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(reset.code)}`)).baredBodiedActive, undefined); assert.ok(resetState.data.currentAction.legalActions.includes("draw"));
});

test("Composure tracks the whole turn and can optionally skip Discard", { timeout: 120_000 }, async () => {
  const noAttack = await createHumanGame(); const noAttackSource = noAttack.room.players[0];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(noAttackSource.id)}`); setHand(noAttackSource.id, [card("Peach", "composure-no-attack-a"), card("Dodge", "composure-no-attack-b"), card("Peach", "composure-no-attack-c")], 2, 4); setTurn(noAttack.code, noAttackSource.seat);
  const offered = await requestAndSettle("end_turn", { code: noAttack.code, token: noAttack.members[0].token });
  assert.equal(offered.status, 200, JSON.stringify(offered.data)); assert.equal(offered.data.room.currentAction.triggerOptions[0].label, "Composure"); assert.notEqual(offered.data.room.currentAction.triggerOptions[0].label, "Keji"); assert.equal(offered.data.room.phase, "response");
  const declined = await requestAndSettle("decline_trigger", { code: noAttack.code, token: noAttack.members[0].token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data)); assert.equal(declined.data.room.phase, "discard");

  const acceptedGame = await createHumanGame(); const acceptedSource = acceptedGame.room.players[0];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(acceptedSource.id)}`); setHand(acceptedSource.id, [card("Peach", "composure-accept-a"), card("Dodge", "composure-accept-b"), card("Peach", "composure-accept-c")], 2, 4); setTurn(acceptedGame.code, acceptedSource.seat);
  const acceptedOffer = await requestAndSettle("end_turn", { code: acceptedGame.code, token: acceptedGame.members[0].token });
  const accepted = await requestAndSettle("trigger", { code: acceptedGame.code, token: acceptedGame.members[0].token, providerId: "lu_meng_keji" });
  assert.equal(acceptedOffer.status, 200); assert.equal(accepted.status, 200, JSON.stringify(accepted.data)); assert.notEqual(accepted.data.room.phase, "discard");

  const physical = await createHumanGame(); const physicalSource = physical.room.players[0]; const physicalTarget = physical.room.players[1]; const physicalAttack = card("Attack", "composure-physical");
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(physicalSource.id)}`); setHand(physicalSource.id, [physicalAttack], 2, 4); setHand(physicalTarget.id, [], 4, 4); setTurn(physical.code, physicalSource.seat);
  const physicalPlayed = await requestAndSettle("play_card", { code: physical.code, token: physical.members[0].token, cardId: physicalAttack.id, targetId: physicalTarget.id }); assert.equal(physicalPlayed.status, 200, JSON.stringify(physicalPlayed.data));
  const physicalEnded = await requestAndSettle("end_turn", { code: physical.code, token: physical.members[0].token }); assert.equal(physicalEnded.status, 200, JSON.stringify(physicalEnded.data)); assert.notEqual(physicalEnded.data.room.currentAction?.triggerOptions?.some((option) => option.label === "Composure"), true);

  const virtual = await createHumanGame(); const virtualSource = virtual.room.players[0]; const virtualTarget = virtual.room.players[1]; const virtualCost = [card("Peach", "composure-virtual-a"), card("Dodge", "composure-virtual-b")];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(virtualSource.id)}`); setHand(virtualSource.id, virtualCost, 2, 4); setEquipment(virtualSource.id, { weapon: card("SerpentSpear", "composure-virtual-spear") }); setHand(virtualTarget.id, [], 4, 4); setTurn(virtual.code, virtualSource.seat);
  const virtualPlayed = await requestAndSettle("serpent_spear_attack", { code: virtual.code, token: virtual.members[0].token, cardIds: virtualCost.map((held) => held.id), targetId: virtualTarget.id }); assert.equal(virtualPlayed.status, 200, JSON.stringify(virtualPlayed.data));
  const virtualEnded = await requestAndSettle("end_turn", { code: virtual.code, token: virtual.members[0].token }); assert.equal(virtualEnded.status, 200, JSON.stringify(virtualEnded.data)); assert.notEqual(virtualEnded.data.room.currentAction?.triggerOptions?.some((option) => option.label === "Composure"), true);
});

test("Composure remains optional at the boundary, resets next turn, and is shared by hosted seats", { timeout: 120_000 }, async () => {
  const noDiscard = await createHumanGame(); const noDiscardSource = noDiscard.room.players[0];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(noDiscardSource.id)}`); setHand(noDiscardSource.id, [card("Peach", "composure-no-discard")], 2, 4); setTurn(noDiscard.code, noDiscardSource.seat);
  const noDiscardOffer = await requestAndSettle("end_turn", { code: noDiscard.code, token: noDiscard.members[0].token });
  assert.equal(noDiscardOffer.status, 200, JSON.stringify(noDiscardOffer.data)); assert.notEqual(noDiscardOffer.data.room.phase, "response"); assert.notEqual(noDiscardOffer.data.room.phase, "discard", "an in-limit hand follows the ordinary no-discard boundary");

  const reset = await createHumanGame(); const resetSource = reset.room.players[0];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(resetSource.id)}`); setHand(resetSource.id, [card("Peach", "composure-reset-a"), card("Dodge", "composure-reset-b"), card("Peach", "composure-reset-c")], 2, 4);
  for (const player of reset.room.players.filter((candidate) => candidate.id !== resetSource.id)) setHand(player.id, [], 4, 4);
  setTurn(reset.code, resetSource.seat);
  const firstOffer = await requestAndSettle("end_turn", { code: reset.code, token: reset.members[0].token }); assert.equal(firstOffer.data.room.currentAction.triggerOptions[0].label, "Composure");
  const firstAccepted = await requestAndSettle("trigger", { code: reset.code, token: reset.members[0].token, providerId: "lu_meng_keji" }); assert.equal(firstAccepted.status, 200, JSON.stringify(firstAccepted.data));
  for (let offset = 1; offset < reset.room.players.length; offset++) {
    const seat = (resetSource.seat + offset) % reset.room.players.length; const token = reset.members[seat].token;
    const drawn = await requestAndSettle("draw", { code: reset.code, token }); assert.equal(drawn.status, 200, JSON.stringify(drawn.data));
    const ended = await requestAndSettle("end_turn", { code: reset.code, token }); assert.equal(ended.status, 200, JSON.stringify(ended.data));
  }
  const nextDraw = await requestAndSettle("draw", { code: reset.code, token: reset.members[resetSource.seat].token });
  assert.equal(nextDraw.status, 200, JSON.stringify(nextDraw.data));
  const resetOffer = await requestAndSettle("end_turn", { code: reset.code, token: reset.members[resetSource.seat].token });
  assert.equal(resetOffer.status, 200, JSON.stringify(resetOffer.data)); assert.equal(resetOffer.data.room.currentAction.triggerOptions[0].label, "Composure", "the next turn starts with a fresh no-Attack history");

  const ordinary = await createHumanGame(); const ordinarySource = ordinary.room.players[0];
  sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(ordinarySource.id)}`); setHand(ordinarySource.id, [card("Peach", "composure-ordinary-a"), card("Peach", "composure-ordinary-b")], 1, 4); setTurn(ordinary.code, ordinarySource.seat);
  const ordinaryEnded = await requestAndSettle("end_turn", { code: ordinary.code, token: ordinary.members[0].token }); assert.equal(ordinaryEnded.status, 200, JSON.stringify(ordinaryEnded.data)); assert.equal(ordinaryEnded.data.room.phase, "discard"); assert.equal(ordinaryEnded.data.room.currentAction?.triggerOptions?.some((option) => option.label === "Composure") ?? false, false);

  const hosted = await createTestGame(); const hostedSource = hosted.data.room.players[0];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(hostedSource.id)}`); setHand(hostedSource.id, [card("Peach", "composure-hosted-a"), card("Dodge", "composure-hosted-b")], 1, 4); setTurn(hosted.data.room.code, hostedSource.seat);
  const hostedOffer = await requestAndSettle("end_turn", { code: hosted.data.room.code, token: hosted.data.token }); assert.equal(hostedOffer.status, 200, JSON.stringify(hostedOffer.data)); assert.equal(hostedOffer.data.room.currentAction.triggerOptions[0].label, "Composure");
});

test("Composure counts Dodged and lethal Attacks, survives reload, and rejects stale use", { timeout: 120_000 }, async () => {
  const dodged = await createHumanGame(); const dodgedSource = dodged.room.players[0]; const dodgedTarget = dodged.room.players[1];
  const dodgedAttack = card("Attack", "composure-dodged-attack"); const dodgedHand = [dodgedAttack, card("Peach", "composure-dodged-extra-a"), card("Dodge", "composure-dodged-extra-b"), card("Peach", "composure-dodged-extra-c")];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(dodgedSource.id)}`); setHand(dodgedSource.id, dodgedHand, 2, 4); setHand(dodgedTarget.id, [card("Dodge", "composure-dodged-response")], 4, 4); setTurn(dodged.code, dodgedSource.seat);
  const dodgedPlay = await requestAndSettle("play_card", { code: dodged.code, token: dodged.members[0].token, cardId: dodgedAttack.id, targetId: dodgedTarget.id, preserveResponse: true }); assert.equal(dodgedPlay.status, 200, JSON.stringify(dodgedPlay.data));
  const dodgedResponse = await requestAndSettle("respond", { code: dodged.code, token: dodged.members[1].token, cardId: "dodge-composure-dodged-response", preserveResponse: true }); assert.equal(dodgedResponse.status, 200, JSON.stringify(dodgedResponse.data));
  const reloaded = await state(dodged.code, dodged.members[0].token); assert.ok(reloaded.data.phase?.startsWith("play"), `the Dodged Attack returns to the Play flow, got ${reloaded.data.phase}`); assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(dodged.code)}`)).attackUsed, true, "the authoritative turn fact survives a room reload");
  const dodgedEnded = await requestAndSettle("end_turn", { code: dodged.code, token: dodged.members[0].token }); assert.equal(dodgedEnded.status, 200, JSON.stringify(dodgedEnded.data)); assert.equal(dodgedEnded.data.room.phase, "discard"); assert.equal(dodgedEnded.data.room.currentAction?.triggerOptions?.some((option) => option.label === "Composure") ?? false, false);

  const lethal = await createHumanGame(); const lethalSource = lethal.room.players[0]; const lethalTarget = lethal.room.players[1];
  const lethalAttack = card("Attack", "composure-lethal-attack"); sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(lethalSource.id)}`); for (const [player, role] of lethal.room.players.map((player, index) => [player, ["Rebel", "Loyalist", "Lord", "Renegade"][index]])) sql(`UPDATE players SET role=${quote(role)} WHERE id=${quote(player.id)}`); setHand(lethalSource.id, [lethalAttack, card("Dodge", "composure-lethal-extra-a"), card("Dodge", "composure-lethal-extra-b"), card("Dodge", "composure-lethal-extra-c")], 2, 4); setHand(lethalTarget.id, [], 1, 4); for (const player of lethal.room.players.slice(2)) setHand(player.id, [], 4, 4); setTurn(lethal.code, lethalSource.seat);
  const lethalPlay = await requestAndSettle("play_card", { code: lethal.code, token: lethal.members[0].token, cardId: lethalAttack.id, targetId: lethalTarget.id }); assert.equal(lethalPlay.status, 200, JSON.stringify(lethalPlay.data));
  const lethalEnded = await requestAndSettle("end_turn", { code: lethal.code, token: lethal.members[0].token }); assert.equal(lethalEnded.status, 200, JSON.stringify(lethalEnded.data)); assert.equal(lethalEnded.data.room.phase, "discard"); assert.equal(lethalEnded.data.room.players.find((player) => player.id === lethalTarget.id).alive, false); assert.equal(lethalEnded.data.room.currentAction?.triggerOptions?.some((option) => option.label === "Composure") ?? false, false);

  const equipment = await createHumanGame(); const equipmentSource = equipment.room.players[0]; const shield = card("NioShield", "composure-equipment", "♣");
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(equipmentSource.id)}`); setHand(equipmentSource.id, [shield, card("Peach", "composure-equipment-extra-a"), card("Dodge", "composure-equipment-extra-b"), card("Peach", "composure-equipment-extra-c")], 2, 4); setTurn(equipment.code, equipmentSource.seat);
  const equipped = await requestAndSettle("play_card", { code: equipment.code, token: equipment.members[0].token, cardId: shield.id }); assert.equal(equipped.status, 200, JSON.stringify(equipped.data));
  const equipmentEnded = await requestAndSettle("end_turn", { code: equipment.code, token: equipment.members[0].token }); assert.equal(equipmentEnded.status, 200, JSON.stringify(equipmentEnded.data)); assert.equal(equipmentEnded.data.room.currentAction.triggerOptions[0].label, "Composure", "non-Attack equipment does not disable Composure");

  const stale = await createHumanGame(); const staleSource = stale.room.players[0]; sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(staleSource.id)}`); setHand(staleSource.id, [card("Peach", "composure-stale-a"), card("Dodge", "composure-stale-b"), card("Peach", "composure-stale-c")], 2, 4); setTurn(stale.code, staleSource.seat);
  const staleOpen = await requestAndSettle("end_turn", { code: stale.code, token: stale.members[0].token }); assert.equal(staleOpen.data.room.currentAction.triggerOptions[0].label, "Composure");
  const staleDecline = await requestAndSettle("decline_trigger", { code: stale.code, token: stale.members[0].token }); assert.equal(staleDecline.status, 200, JSON.stringify(staleDecline.data));
  const staleReplay = await requestAndSettle("trigger", { code: stale.code, token: stale.members[0].token, providerId: "lu_meng_keji" }); assert.equal(staleReplay.status, 409); assert.equal(staleReplay.data.stale, true);
});

test("host test flow uses Fanjian's shared-controller sequence and private opaque card choice", async () => {
  const quick = await createTestGame(); const { token, room } = quick.data; const { code } = room; const source = room.players[0]; const target = room.players[1]; const concealed = card("Peach", "quick-fanjian", "♦");
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(source.id)}`); setHand(source.id, [concealed], 3, 3); setHand(target.id, [], 4, 4); setTurn(code, source.seat);
  const opened = await requestAndSettle("trigger", { code, token, providerId: "zhou_yu_fanjian", targetId: target.id }); assert.equal(opened.status, 200, JSON.stringify(opened.data)); assert.equal(opened.data.room.currentAction.actorId, target.id);
  const targetView = await state(code, token); assert.equal(targetView.data.meId, target.id); assert.equal(targetView.data.currentAction.triggerOptions[0].selection.type, "choice");
  const guessed = await requestAndSettle("trigger", { code, token, providerId: "zhou_yu_fanjian_choice", choice: "♦" }); assert.equal(guessed.status, 200, JSON.stringify(guessed.data)); assert.equal(guessed.data.room.currentAction.triggerOptions[0].selection.type, "target_cards"); assert.deepEqual(guessed.data.room.currentAction.triggerOptions[0].selection.eligibleKeys, ["hand:0"]);
  const selected = await requestAndSettle("trigger", { code, token, providerId: "zhou_yu_fanjian_choice", cardKeys: ["hand:0"] }); assert.equal(selected.status, 200, JSON.stringify(selected.data)); assert.equal(selected.data.room.players.find((player) => player.id === target.id).handCount, 1); assert.equal(selected.data.room.players.find((player) => player.id === target.id).hp, 4);
});

test("room reads are read-only and presence heartbeats are throttled", async () => {
  const created = await requestAndSettle("create", { name: "Presence Host" });
  assert.equal(created.status, 201);
  const { code, meId } = created.data.room;
  const { token } = created.data;
  const beforeRead = query(`SELECT connected_at FROM players WHERE id=${quote(meId)}`);
  assert.equal((await state(code, token)).status, 200);
  assert.equal(query(`SELECT connected_at FROM players WHERE id=${quote(meId)}`), beforeRead, "GET room state must not write presence");
  sql(`UPDATE players SET connected_at=0 WHERE id=${quote(meId)}`);
  assert.equal((await requestAndSettle("heartbeat", { code, token })).status, 200);
  const afterHeartbeat = query(`SELECT connected_at FROM players WHERE id=${quote(meId)}`);
  assert.ok(Number(afterHeartbeat) > 0, "a stale presence timestamp is refreshed");
  assert.equal((await requestAndSettle("heartbeat", { code, token })).status, 200);
  assert.equal(query(`SELECT connected_at FROM players WHERE id=${quote(meId)}`), afterHeartbeat, "a fresh heartbeat does not write again");
});

test("an inactive active room is closed after five minutes without a game event", async () => {
  const created = await createTestGame();
  const { code } = created.data.room;
  const { token } = created.data;
  sql(`UPDATE rooms SET last_activity_at=${Date.now() - 5 * 60_000 - 1} WHERE code=${quote(code)}`);
  const closed = await requestAndSettle("expire_inactive_room", { code, token });
  assert.equal(closed.status, 200);
  assert.equal(closed.data.room.status, "finished");
  assert.equal(closed.data.room.phase, "finished");
  assert.equal(closed.data.room.pending, null);
  assert.ok(closed.data.room.log.some((message) => /five minutes with no game events/.test(message)));
});

test("Attack response windows are public while Dodge options remain private", { timeout: 30_000 }, async () => {
  async function open(targetCards, suffix) {
    const game = await createHumanGame();
    const [sourceMember, targetMember, otherMember] = game.members;
    const [source, target, other, last] = game.room.players;
    const attack = card("Attack", `privacy-${suffix}`);
    setHand(source.id, [attack], 4, 4); setHand(target.id, targetCards, 4, 4); setHand(other.id, [], 4, 4); setHand(last.id, [], 4, 4);
    setEquipment(source.id); setEquipment(target.id); setEquipment(other.id); setEquipment(last.id); setTurn(game.code, source.seat);
    const played = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: target.id, preserveResponse: true });
    assert.equal(played.status, 200, JSON.stringify(played.data));
    return { game, sourceMember, targetMember, otherMember, source, target, other, attack };
  }

  const empty = await open([], "empty");
  const emptyTarget = (await state(empty.game.code, empty.targetMember.token)).data;
  assert.equal(emptyTarget.phase, "response"); assert.equal(emptyTarget.actionPlayerId, empty.target.id);
  assert.equal(emptyTarget.currentAction.kind, "response"); assert.equal(emptyTarget.currentAction.requirement, "dodge");
  assert.deepEqual(emptyTarget.currentAction.options, []); assert.ok(emptyTarget.currentAction.legalActions.includes("decline_response")); assert.equal(emptyTarget.currentAction.legalActions.includes("respond"), false);
  assert.equal(emptyTarget.players.find((player) => player.id === empty.target.id).hp, 4);
  const emptyOther = (await state(empty.game.code, empty.otherMember.token)).data;
  assert.equal(emptyOther.phase, "response"); assert.equal(emptyOther.actionPlayerId, empty.target.id); assert.equal(emptyOther.currentAction.kind, "response");
  assert.equal(emptyOther.currentAction.reason, emptyTarget.currentAction.reason); assert.deepEqual(emptyOther.currentAction.options ?? [], []);
  const declinedEmpty = await requestAndSettle("decline_response", { code: empty.game.code, token: empty.targetMember.token });
  assert.equal(declinedEmpty.status, 200); assert.equal(declinedEmpty.data.room.players.find((player) => player.id === empty.target.id).hp, 3);

  const held = await open([card("Dodge", "privacy-held")], "held");
  const heldTarget = (await state(held.game.code, held.targetMember.token)).data;
  assert.ok(heldTarget.currentAction.options.some((option) => option.providerId === "card"));
  assert.ok(heldTarget.currentAction.legalActions.includes("respond")); assert.ok(heldTarget.currentAction.legalActions.includes("decline_response"));
  const declinedHeld = await requestAndSettle("decline_response", { code: held.game.code, token: held.targetMember.token });
  assert.equal(declinedHeld.status, 200); assert.equal(declinedHeld.data.room.players.find((player) => player.id === held.target.id).hp, 3);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(held.target.id)}`)).map((item) => item.id), ["dodge-privacy-held"]);
});


