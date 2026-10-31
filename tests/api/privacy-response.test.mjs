/* eslint-disable @typescript-eslint/no-unused-vars */
import test from "node:test";
import {
  advanceNegationWindow, assert, card, createHumanGame, createHumanSetupGame, createTestGame, createTestLobby, discardIds, distributeLegacy, drainEmptyPrivateDecisions, markReady, normalizeRoomData, openBorrowedSwordScenario, openFankuiAttack, openGanglieAttack, openGanglieGroup, openGuoDamage, openHujiaScenario, passNegationWindows, prepareGuoJudgement, query, quote, request, requestAndSettle, roomCardCount, seedPlayingGame, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state, takeDamageIfPending, waitForState,
} from "./test-support.mjs";

test("shared Negation windows keep submissions private and expose only each viewer's legal response", { timeout: 60_000 }, async () => {
  const nobody = await createHumanGame(); const [nobodySourceMember] = nobody.members; const [nobodySource, ...nobodyOthers] = nobody.room.players; const drawTwo = card("DrawTwo", "privacy-negation");
  setHand(nobodySource.id, [drawTwo], 4, 4); for (const player of nobodyOthers) setHand(player.id, [], 4, 4); setTurn(nobody.code, nobodySource.seat);
  const settled = await requestAndSettle("play_card", { code: nobody.code, token: nobodySourceMember.token, cardId: drawTwo.id, preserveResponse: true });
  assert.equal(settled.status, 200); assert.equal(settled.data.room.phase, "response");
  const emptyWindowId = settled.data.room.currentAction.negationWindowId;
  assert.ok(emptyWindowId);
  assert.equal(settled.data.room.currentAction.deadline - settled.data.room.responseCountdownVisibleAt, 8_000);
  for (const member of nobody.members) {
    const view = (await state(nobody.code, member.token)).data;
    assert.equal(view.currentAction.negationWindowId, emptyWindowId);
    assert.equal(view.currentAction.options?.length ?? 0, 0, "an ineligible seat receives no fictitious Negation option");
    assert.equal(view.pendingNegation.actorId, null);
  }
  await advanceNegationWindow(nobody.code, nobodySourceMember.token, emptyWindowId);
  const nobodySettled = (await state(nobody.code, nobodySourceMember.token)).data;
  assert.equal(nobodySettled.pendingNegation, null); assert.equal(nobodySettled.phase, "play");
  assert.ok(nobodySettled.log.some((entry) => entry.includes("No Negation responses remain")));
  assert.equal(nobodySettled.log.some((entry) => /passes the Negation|Checking|Skipping/.test(entry)), false);

  async function openWithNegation(holderIndex) {
    const game = await createHumanGame(); const sourceMember = game.members[0]; const holderMember = game.members[holderIndex]; const otherMember = game.members[holderIndex === 1 ? 2 : 1]; const source = game.room.players[0]; const holder = game.room.players[holderIndex]; const root = card("DrawTwo", `privacy-holder-${holderIndex}`); const negation = card("Negation", `privacy-holder-${holderIndex}`);
    for (const player of game.room.players) setHand(player.id, [], 4, 4); setHand(source.id, [root], 4, 4); setHand(holder.id, [negation], 4, 4); setTurn(game.code, source.seat);
    const opened = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: root.id, preserveResponse: true });
    assert.equal(opened.status, 200); return { game, sourceMember, holderMember, otherMember, source, holder, root, negation, opened };
  }

  const target = await openWithNegation(1); const targetView = (await state(target.game.code, target.holderMember.token)).data; const publicTargetView = (await state(target.game.code, target.sourceMember.token)).data; const targetOtherView = (await state(target.game.code, target.otherMember.token)).data;
  assert.equal(targetView.currentAction.requirement, "negate"); assert.ok(targetView.currentAction.options.some((option) => option.providerId === "negation_card")); assert.equal(targetView.isMyAction, true);
  const affectedPlayer = target.game.room.players.find((player) => player.id === targetView.pendingNegation.effectTargetId);
  assert.equal(targetView.actionReason, `Play Negation to cancel ${targetView.pendingNegation.cardName}'s effect on ${affectedPlayer?.name}, or Pass.`);
  assert.equal(publicTargetView.actionPlayerId, null); assert.equal(publicTargetView.pendingNegation.actorId, null); assert.equal(publicTargetView.actionReason, "No Negation available. Pass."); assert.equal(publicTargetView.currentAction.options?.length ?? 0, 0);
  assert.equal(targetOtherView.actionPlayerId, null); assert.equal(targetOtherView.pendingNegation.actorId, null); assert.equal(targetOtherView.actionReason, "No Negation available. Pass.");
  const targetWindowId = targetView.currentAction.negationWindowId;
  const targetPassed = await requestAndSettle("decline_response", { code: target.game.code, token: target.holderMember.token, preserveResponse: true, preserveNegationWindow: true }); assert.equal(targetPassed.status, 200);
  const targetAfterPass = (await state(target.game.code, target.holderMember.token)).data;
  assert.equal(targetAfterPass.currentAction.negationWindowId, targetWindowId, "one Pass does not close the common window early");
  assert.equal(targetAfterPass.pendingNegation.submitted, true);
  assert.equal(targetAfterPass.currentAction.options?.length ?? 0, 0);
  assert.equal((await state(target.game.code, target.sourceMember.token)).data.timeline.some((event) => event.card?.id === target.negation.id), false, "a private Pass or intent is not a public card event");
  await advanceNegationWindow(target.game.code, target.sourceMember.token, targetWindowId);
  assert.equal((await state(target.game.code, target.sourceMember.token)).data.pendingNegation, null);

  const nonTarget = await openWithNegation(2); const nonTargetView = (await state(nonTarget.game.code, nonTarget.holderMember.token)).data;
  assert.equal(nonTargetView.currentAction.requirement, "negate"); assert.ok(nonTargetView.currentAction.options.some((option) => option.providerId === "negation_card")); assert.equal(nonTargetView.isMyAction, true);
  const nonTargetWindowId = nonTargetView.currentAction.negationWindowId;
  assert.equal((await requestAndSettle("decline_response", { code: nonTarget.game.code, token: nonTarget.holderMember.token, preserveResponse: true, preserveNegationWindow: true })).status, 200);
  assert.equal((await state(nonTarget.game.code, nonTarget.holderMember.token)).data.currentAction.negationWindowId, nonTargetWindowId);
  await advanceNegationWindow(nonTarget.game.code, nonTarget.sourceMember.token, nonTargetWindowId);
});

test("shared Negation settles early after explicit responses from all seats in 4/5/6/8-player rooms", { timeout: 60_000 }, async () => {
  const roleSets = {
    4: ["Lord", "Loyalist", "Rebel", "Renegade"],
    5: ["Lord", "Loyalist", "Rebel", "Rebel", "Renegade"],
    6: ["Lord", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"],
    8: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"],
  };
  for (const [seatCountText, roles] of Object.entries(roleSets)) {
    const seatCount = Number(seatCountText);
    const root = card("DrawTwo", `n0-all-pass-${seatCount}-root`);
    const draws = [card("Attack", `n0-all-pass-${seatCount}-draw-1`), card("Dodge", `n0-all-pass-${seatCount}-draw-2`)];
    const game = await seedPlayingGame({
      phase: "play",
      turnSeat: 0,
      players: Array.from({ length: seatCount }, (_, index) => ({
        name: `N0 Seat ${index + 1}`,
        role: roles[index],
        hero: "zhao-yun",
        hp: 4,
        maxHp: 4,
        hand: index === 0 ? [root] : [],
      })),
    });
    setDeck(game.code, draws);
    const opened = await request("play_card", { code: game.code, token: game.members[0].token, cardId: root.id });
    assert.equal(opened.status, 200, `${seatCount} seats: ${JSON.stringify(opened.data)}`);
    const windowId = opened.data.room.currentAction.negationWindowId;
    const deadline = opened.data.room.currentAction.deadline;
    assert.ok(windowId);
    assert.equal(deadline - opened.data.room.responseCountdownVisibleAt, 8_000);
    assert.deepEqual(opened.data.room.currentAction.options, []);
    for (const member of game.members.slice(0, seatCount - 2)) {
      const passed = await request("decline_response", { code: game.code, token: member.token });
      assert.equal(passed.status, 200, `${seatCount} seats: ${JSON.stringify(passed.data)}`);
      assert.equal(passed.data.room.phase, "response", "the window stays open while any snapshot seat is silent");
      assert.equal(passed.data.room.currentAction.negationWindowId, windowId);
      assert.equal(passed.data.room.currentAction.deadline, deadline, "explicit Pass never moves the original deadline");
    }

    assert.ok(Date.now() < deadline, "the final responses exercise the before-deadline path");
    const finalPasses = await Promise.all(game.members.slice(seatCount - 2).map((member) =>
      request("decline_response", { code: game.code, token: member.token })));
    for (const result of finalPasses) assert.equal(result.status, 200, `${seatCount} seats: ${JSON.stringify(result.data)}`);

    const settled = (await state(game.code, game.members[0].token)).data;
    assert.equal(settled.phase, "play", `${seatCount} seats: the last durable replies settle before the 8s maximum`);
    assert.equal(settled.pendingNegation, null);
    assert.equal(settled.timeline.filter((event) => event.message?.includes("draws 2 cards")).length, 1, "concurrent final Passes resolve the underlying effect exactly once");
    assert.ok(settled.myHand.some((held) => held.id === draws[0].id));
    assert.ok(settled.myHand.some((held) => held.id === draws[1].id));
    assert.equal(roomCardCount(game.code, root.id), 1);
    assert.equal(query(`SELECT COUNT(*) FROM negation_window_submissions WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(game.code)}) AND window_id=${quote(windowId)}`), "0", "private submissions are retired after the once-only settlement");
    assert.equal(JSON.stringify(settled).includes("submission_json"), false);
    if (seatCount === 4) {
      const observer = (await state(game.code, game.members[1].token)).data;
      const publicOrder = (view) => view.timeline.filter((event) => Number.isSafeInteger(event.publicSequence))
        .map(({ id, publicSequence }) => [id, publicSequence]);
      assert.deepEqual(publicOrder(settled), publicOrder(observer), "identical committed checkpoints expose the same public event order to each viewer");
      assert.equal(JSON.stringify(settled).includes("publicSequenceWatermark"), false, "the internal private-log watermark stays server-side");

      const persistedLog = JSON.parse(query(`SELECT log_json FROM rooms WHERE code=${quote(game.code)}`));
      const structured = persistedLog.flatMap((entry) => {
        const prefix = ["@event:", "@card:", "@cards:", "@history:"].find((candidate) => entry.startsWith(candidate));
        return prefix ? [{ prefix, value: JSON.parse(entry.slice(prefix.length)) }] : [];
      });
      let previousWatermark = null;
      const publicOrdinals = [];
      for (const { prefix, value } of structured) {
        assert.ok(Number.isSafeInteger(value.publicSequenceWatermark), "every structured D1 record carries the sequence watermark");
        const isPublic = prefix !== "@history:" && value.presentation !== false && typeof value.privateToPlayerId !== "string";
        if (previousWatermark !== null) assert.equal(value.publicSequenceWatermark, previousWatermark + Number(isPublic), "private records preserve the watermark and public commits advance it once");
        if (isPublic) {
          assert.equal(value.publicSequence, value.publicSequenceWatermark);
          publicOrdinals.push(value.publicSequence);
        } else assert.equal(Object.hasOwn(value, "publicSequence"), false);
        previousWatermark = value.publicSequenceWatermark;
      }
      assert.deepEqual(publicOrdinals, [...new Set(publicOrdinals)], "concurrent Worker/D1 settlement leaves no duplicate public ordinal");
    }
  }
});

test("early shared Negation settlement chooses the canonical seat winner, not the first intent", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, prioritySeat, passingSeat, fastSeat] = game.room.players;
  const root = card("DrawTwo", "n0-priority-root");
  const priorityNegation = card("Negation", "n0-priority-negation");
  const fastNegation = card("Negation", "n0-fast-negation");
  setHand(source.id, [root], 4, 4);
  setHand(prioritySeat.id, [priorityNegation], 4, 4);
  setHand(passingSeat.id, [], 4, 4);
  setHand(fastSeat.id, [fastNegation], 4, 4);
  setTurn(game.code, source.seat);

  const opened = await request("play_card", { code: game.code, token: game.members[0].token, cardId: root.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const firstWindowId = opened.data.room.currentAction.negationWindowId;
  const firstWindow = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.deepEqual(firstWindow.seatOrderPlayerIds, [source.id, prioritySeat.id, passingSeat.id, fastSeat.id]);

  const fastIntent = await request("respond", { code: game.code, token: game.members[3].token, providerId: "negation_card", cardId: fastNegation.id });
  assert.equal(fastIntent.status, 200, JSON.stringify(fastIntent.data));
  assert.equal(fastIntent.data.room.currentAction.negationWindowId, firstWindowId, "an early intent remains private while seats are outstanding");
  assert.equal(fastIntent.data.room.timeline.some((event) => event.card?.id === fastNegation.id), false);

  for (const index of [0, 2]) {
    const passed = await request("decline_response", { code: game.code, token: game.members[index].token });
    assert.equal(passed.status, 200, JSON.stringify(passed.data));
    assert.equal(passed.data.room.currentAction.negationWindowId, firstWindowId);
  }
  assert.ok(Date.now() < opened.data.room.currentAction.deadline);
  const priorityIntent = await request("respond", { code: game.code, token: game.members[1].token, providerId: "negation_card", cardId: priorityNegation.id });
  assert.equal(priorityIntent.status, 200, JSON.stringify(priorityIntent.data));

  const counter = (await state(game.code, game.members[0].token)).data;
  const counterWindowId = counter.currentAction.negationWindowId;
  assert.ok(counterWindowId);
  assert.notEqual(counterWindowId, firstWindowId, "the selected winner immediately opens a fresh counter window");
  assert.equal(counter.pendingNegation.latestNegationPlayerId, prioritySeat.id, "canonical snapshot seat order beats the faster later-seat intent");
  assert.equal(counter.timeline.filter((event) => event.card?.id === priorityNegation.id).length, 1);
  assert.equal(counter.timeline.some((event) => event.card?.id === fastNegation.id), false);
  assert.equal(roomCardCount(game.code, priorityNegation.id), 1, "only the winner's real Negation is consumed once");
  assert.equal(roomCardCount(game.code, fastNegation.id), 1, "the losing intent retains its physical card");
  assert.ok((await state(game.code, game.members[3].token)).data.myHand.some((held) => held.id === fastNegation.id));
  assert.deepEqual(JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`)).seatOrderPlayerIds,
    [passingSeat.id, fastSeat.id, source.id, prioritySeat.id], "the counter window takes a fresh seat snapshot and priority start");
  assert.equal(counter.currentAction.deadline - counter.responseCountdownVisibleAt, 8_000);
  for (const member of game.members) {
    const view = (await state(game.code, member.token)).data;
    assert.equal(view.currentAction.negationWindowId, counterWindowId);
    assert.equal(view.pendingNegation.submitted, false, "the previous window's private responses do not carry over");
  }
});

test("a skill-only Negation provider counts as an explicit response in the shared window", async () => {
  const root = card("DrawTwo", "n0-skill-only-root");
  const game = await seedPlayingGame({
    phase: "play",
    turnSeat: 0,
    players: ["Lord", "Loyalist", "Rebel", "Renegade"].map((role, index) => ({
      name: `N0 Skill Seat ${index + 1}`,
      role,
      hero: "zhao-yun",
      hp: 4,
      maxHp: 4,
      hand: index === 0 ? [root] : [],
    })),
  });
  const [source, skillSeat] = game.room.players;
  sql(`UPDATE players SET hero='test-hero' WHERE id=${quote(skillSeat.id)}`);

  const opened = await request("play_card", { code: game.code, token: game.members[0].token, cardId: root.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const windowId = opened.data.room.currentAction.negationWindowId;
  const skillView = (await state(game.code, game.members[1].token)).data;
  assert.ok(skillView.currentAction.options.some((option) => option.providerId === "test_semantic_negate"), "a no-card hero provider remains a real legal Negation option");

  for (const index of [0, 2, 3]) {
    const passed = await request("decline_response", { code: game.code, token: game.members[index].token });
    assert.equal(passed.status, 200, JSON.stringify(passed.data));
    assert.equal(passed.data.room.currentAction.negationWindowId, windowId, "no-card seats do not auto-pass the silent skill provider");
  }
  assert.ok(Date.now() < opened.data.room.currentAction.deadline);
  const skillIntent = await request("respond", { code: game.code, token: game.members[1].token, providerId: "test_semantic_negate" });
  assert.equal(skillIntent.status, 200, JSON.stringify(skillIntent.data));

  const counter = (await state(game.code, game.members[0].token)).data;
  assert.notEqual(counter.currentAction.negationWindowId, windowId, "the explicit skill response completes the window and starts a fresh counter window");
  assert.equal(counter.pendingNegation.latestNegationPlayerId, skillSeat.id);
  assert.equal(counter.pendingNegation.negated, true);
  assert.ok(counter.timeline.some((event) => event.message?.includes("uses test_semantic_negate to cancel")));
  assert.equal(roomCardCount(game.code, root.id), 1);
  assert.equal(query(`SELECT COUNT(*) FROM negation_window_submissions WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(game.code)}) AND window_id=${quote(windowId)}`), "0");
  assert.equal(source.alive, true);
});

test("an identical retry recovers early settlement after the last response was durably stored", async () => {
  const game = await createHumanGame();
  const root = card("DrawTwo", "n0-retry-root");
  const draws = [card("Attack", "n0-retry-draw-1"), card("Dodge", "n0-retry-draw-2")];
  const [source, , , finalSeat] = game.room.players;
  setHand(source.id, [root], 4, 4);
  for (const player of game.room.players.slice(1)) setHand(player.id, [], 4, 4);
  setDeck(game.code, draws);
  setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: game.members[0].token, cardId: root.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const windowId = opened.data.room.currentAction.negationWindowId;

  for (const member of game.members.slice(0, 3)) {
    assert.equal((await request("decline_response", { code: game.code, token: member.token })).status, 200);
  }
  assert.equal((await state(game.code, game.members[0].token)).data.currentAction.negationWindowId, windowId, "one seat remains silent before the retry");
  sql(`INSERT INTO negation_window_submissions (room_id, window_id, player_id, submission_json, created_at) SELECT rooms.id, ${quote(windowId)}, players.id, '{"kind":"pass"}', ${Date.now()} FROM rooms JOIN players ON players.room_id=rooms.id WHERE rooms.code=${quote(game.code)} AND players.id=${quote(finalSeat.id)}`);

  const retried = await request("decline_response", { code: game.code, token: game.members[3].token });
  assert.equal(retried.status, 200, JSON.stringify(retried.data));
  assert.equal(retried.data.room.phase, "play", "an idempotent retry resumes the all-seats completion check");
  assert.equal(retried.data.room.pendingNegation, null);
  const settled = (await state(game.code, game.members[0].token)).data;
  assert.equal(settled.timeline.filter((event) => event.message?.includes("draws 2 cards")).length, 1);
  assert.ok(settled.myHand.some((held) => held.id === draws[0].id));
  assert.ok(settled.myHand.some((held) => held.id === draws[1].id));
  assert.equal(roomCardCount(game.code, root.id), 1);
});

test("all viewers share one immutable Negation deadline, including after a private response timer request", async () => {
  const game = await createHumanGame(); const [sourceMember, targetMember] = game.members;
  const [source, target] = game.room.players;
  const drawTwo = card("DrawTwo", "negation-timeout");
  setHand(source.id, [drawTwo], 4, 4); setHand(target.id, [card("Negation", "negation-timeout")], 4, 4);
  setTurn(game.code, source.seat);

  const opened = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: drawTwo.id, preserveResponse: true });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.pendingNegation.actorId, null, "the public view does not reveal an eligible responder");
  const windowId = opened.data.room.currentAction.negationWindowId;
  const deadline = opened.data.room.currentAction.deadline;
  const targetView = (await state(game.code, targetMember.token)).data;
  assert.equal(targetView.currentAction.requirement, "negate"); assert.ok(deadline > Date.now());
  assert.equal(targetView.currentAction.negationWindowId, windowId);
  assert.equal(targetView.currentAction.deadline, deadline);
  const armed = await request("start_response_timer", { code: game.code, token: targetMember.token });
  assert.equal(armed.status, 200); assert.equal(armed.data.room.currentAction.deadline, deadline);
  const early = await request("advance_timers", { code: game.code, token: sourceMember.token });
  assert.equal(early.status, 200); assert.equal(early.data.room.currentAction.negationWindowId, windowId);
  await advanceNegationWindow(game.code, sourceMember.token, windowId);
  const advanced = (await state(game.code, sourceMember.token)).data;
  assert.equal(advanced.pendingNegation, null); assert.equal(advanced.phase, "play");
  assert.equal(advanced.log.some((entry) => /passes the Negation|Checking|Skipping|timed out/.test(entry)), false);
});

test("shared Negation keeps three human submissions private and rejects conflicting or late window replays", { timeout: 60_000 }, async () => {
  const root = card("DrawTwo", "gate-b-private-root");
  const seatTwoCard = card("Negation", "gate-b-seat-two");
  const seatThreeCard = card("Negation", "gate-b-seat-three");
  const seatFourCard = card("Negation", "gate-b-seat-four");
  const seatFiveCard = card("Negation", "gate-b-seat-five");
  const game = await seedPlayingGame({
    phase: "play",
    turnSeat: 0,
    players: [
      { name: "Source", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [root] },
      { name: "Seat Two", role: "Loyalist", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [seatTwoCard] },
      { name: "Seat Three", role: "Rebel", hero: "zhang-liao", hp: 4, maxHp: 4, hand: [seatThreeCard] },
      { name: "Seat Four", role: "Rebel", hero: "simayi", hp: 4, maxHp: 4, hand: [seatFourCard] },
      { name: "Seat Five", role: "Renegade", hero: "guo-jia", hp: 4, maxHp: 4, hand: [seatFiveCard] },
    ],
  });
  const [source, seatTwo, seatThree, seatFour, seatFive] = game.room.players;
  const [sourceMember, seatTwoMember, seatThreeMember, seatFourMember, seatFiveMember] = game.members;
  const secretCardIds = [seatTwoCard.id, seatThreeCard.id, seatFourCard.id, seatFiveCard.id];

  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: root.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const firstWindowId = opened.data.room.currentAction.negationWindowId;
  const sharedDeadline = opened.data.room.currentAction.deadline;
  const sharedVisibleAt = opened.data.room.responseCountdownVisibleAt;
  assert.ok(firstWindowId);
  assert.equal(sharedDeadline - sharedVisibleAt, 8_000);
  assert.equal(new Set(game.members.map(({ token }) => token)).size, 5, "every fixture seat uses its own authenticated human token");

  const beforeSubmissions = await Promise.all(game.members.map(({ token }) => state(game.code, token)));
  for (const [index, response] of beforeSubmissions.entries()) {
    const view = response.data;
    assert.equal(view.isTestController, false);
    assert.equal(view.meId, game.room.players[index].id);
    assert.equal(view.currentAction.actorId, game.room.players[index].id);
    assert.equal(view.currentAction.negationWindowId, firstWindowId);
    assert.equal(view.currentAction.deadline, sharedDeadline);
    assert.equal(view.responseCountdownVisibleAt, sharedVisibleAt);
    assert.equal(view.actionPlayerId, null);
    assert.equal(view.pendingNegation.actorId, null);
    assert.equal(view.pendingNegation.submitted, false);
    assert.deepEqual(view.presentationSnapshot.viewerNegationChoice, {
      windowId: firstWindowId,
      locked: false,
      choice: null,
    }, "the current viewer starts with an unlocked private choice for this exact window");
    assert.equal("seatOrderPlayerIds" in view.pendingNegation, false);
    const options = view.currentAction.options ?? [];
    if (index === 0) assert.equal(options.some(({ providerId }) => providerId === "negation_card"), false);
    else assert.ok(options.some(({ providerId }) => providerId === "negation_card"));
    const serialized = JSON.stringify(view);
    for (const hiddenCardId of secretCardIds) {
      if (hiddenCardId !== secretCardIds[index - 1]) assert.equal(serialized.includes(hiddenCardId), false, `seat ${index + 1} cannot see another hand's physical Negation ID`);
    }
    assert.equal(serialized.includes("submission_json"), false);
    assert.equal(serialized.includes("submittedIds"), false);
  }

  const [seatTwoIntent, seatThreePass] = await Promise.all([
    request("respond", { code: game.code, token: seatTwoMember.token, providerId: "negation_card", cardId: seatTwoCard.id }),
    request("decline_response", { code: game.code, token: seatThreeMember.token }),
  ]);
  assert.equal(seatTwoIntent.status, 200, JSON.stringify(seatTwoIntent.data));
  assert.equal(seatThreePass.status, 200, JSON.stringify(seatThreePass.data));
  assert.equal((await request("respond", { code: game.code, token: seatFourMember.token, providerId: "negation_card", cardId: seatFourCard.id })).status, 200);
  assert.equal((await request("respond", { code: game.code, token: seatTwoMember.token, providerId: "negation_card", cardId: seatTwoCard.id })).status, 200, "an exact duplicate intent is idempotent");
  assert.equal((await request("decline_response", { code: game.code, token: seatThreeMember.token })).status, 200, "an exact duplicate Pass is idempotent");
  assert.equal((await request("decline_response", { code: game.code, token: seatTwoMember.token })).status, 409, "a player cannot replace a locked intent with Pass");
  assert.equal((await request("respond", { code: game.code, token: seatThreeMember.token, providerId: "negation_card", cardId: seatThreeCard.id })).status, 409, "a player cannot replace a locked Pass with an intent");
  assert.equal(query(`SELECT COUNT(*) FROM negation_window_submissions WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(game.code)}) AND window_id=${quote(firstWindowId)}`), "3", "independent seats keep their own single submission row");

  const afterSubmissions = await Promise.all(game.members.map(({ token }) => state(game.code, token)));
  for (const [index, response] of afterSubmissions.entries()) {
    const view = response.data;
    assert.equal(view.currentAction.negationWindowId, firstWindowId);
    assert.equal(view.currentAction.deadline, sharedDeadline, "submissions do not shorten or restart the shared deadline");
    assert.equal(view.responseCountdownVisibleAt, sharedVisibleAt);
    assert.equal(view.pendingNegation.submitted, [false, true, true, true, false][index], "submission status is visible only to its owner");
    const privateChoice = [null, "negation_intent", "pass", "negation_intent", null][index];
    assert.deepEqual(view.presentationSnapshot.viewerNegationChoice, {
      windowId: firstWindowId,
      locked: privateChoice !== null,
      choice: privateChoice,
    }, "only the authenticated viewer's own locked choice category is projected");
    assert.equal(view.presentationSnapshot.publicEventFacts.some((fact) =>
      fact.category === "CARD_PLAYED" && [seatTwo.id, seatThree.id, seatFour.id].includes(fact.actorId)), false,
    "uncommitted Negation intents never become public card-play facts");
    const serialized = JSON.stringify(view);
    for (const hiddenCardId of secretCardIds) {
      if (hiddenCardId !== secretCardIds[index - 1]) assert.equal(serialized.includes(hiddenCardId), false, `seat ${index + 1} cannot see another private intent or card ID`);
    }
    assert.equal(view.timeline.some((event) => secretCardIds.includes(event.card?.id)), false, "uncommitted intents do not become public card events");
    if (index === 0 || index === 4) {
      assert.deepEqual(view.currentAction.options, beforeSubmissions[index].data.currentAction.options, "other seats' submissions do not change this viewer's legal options");
      assert.equal(view.actionReason, beforeSubmissions[index].data.actionReason, "other seats' submission progress is not exposed through guidance");
      assert.equal(view.actionRevision, beforeSubmissions[index].data.actionRevision, "another seat's private submission does not stale this viewer's action");
    }
  }

  const timerRequest = await request("start_response_timer", { code: game.code, token: seatFiveMember.token });
  assert.equal(timerRequest.status, 200);
  assert.equal(timerRequest.data.room.currentAction.deadline, sharedDeadline, "a timer request cannot move the common deadline");
  const earlyAdvance = await request("advance_timers", { code: game.code, token: sourceMember.token });
  assert.equal(earlyAdvance.status, 200);
  assert.equal(earlyAdvance.data.room.currentAction.negationWindowId, firstWindowId, "a silent/disconnected living seat does not let submissions close the window early");

  const expiredAt = Date.now() - 1;
  sql(`UPDATE rooms SET pending_json=json_set(pending_json,'$.openedAt',${expiredAt - 8000},'$.deadline',${expiredAt}) WHERE code=${quote(game.code)} AND json_extract(pending_json,'$.windowId')=${quote(firstWindowId)}`);
  const [firstTimerAdvance, racingTimerAdvance] = await Promise.all([
    request("advance_timers", { code: game.code, token: sourceMember.token }),
    request("advance_timers", { code: game.code, token: seatTwoMember.token }),
  ]);
  assert.equal(firstTimerAdvance.status, 200, JSON.stringify(firstTimerAdvance.data));
  assert.equal(racingTimerAdvance.status, 200, JSON.stringify(racingTimerAdvance.data));
  const counter = (await state(game.code, sourceMember.token)).data;
  const counterWindowId = counter.currentAction.negationWindowId;
  assert.ok(counterWindowId);
  assert.notEqual(counterWindowId, firstWindowId);
  assert.equal(counter.pendingNegation.latestNegationPlayerId, seatTwo.id);
  assert.equal(counter.timeline.some((event) => event.card?.id === seatTwoCard.id), true);
  assert.equal(counter.timeline.some((event) => event.card?.id === seatThreeCard.id || event.card?.id === seatFourCard.id), false);
  assert.equal(roomCardCount(game.code, seatTwoCard.id), 1, "the canonical winner's card is consumed exactly once");
  assert.equal(roomCardCount(game.code, seatThreeCard.id), 1, "a passing player's hand card is retained");
  assert.equal(roomCardCount(game.code, seatFourCard.id), 1, "a losing submission's hand card is retained");
  assert.equal(roomCardCount(game.code, seatFiveCard.id), 1, "a disconnected seat's hand card is retained");
  assert.ok((await state(game.code, seatFourMember.token)).data.myHand.some((held) => held.id === seatFourCard.id), "the losing submitter's card remains private and available after the deadline");

  const reconnectView = (await state(game.code, seatFiveMember.token)).data;
  const counterDeadline = reconnectView.currentAction.deadline;
  const counterVisibleAt = reconnectView.responseCountdownVisibleAt;
  assert.equal(counterDeadline - counterVisibleAt, 8_000);
  const staleReplay = await request("respond", {
    code: game.code,
    token: seatFiveMember.token,
    providerId: "negation_card",
    cardId: seatFiveCard.id,
    context: {
      actionRevision: reconnectView.actionRevision,
      meId: seatFive.id,
      phase: reconnectView.phase,
      pendingKind: reconnectView.pending?.kind ?? null,
      actorId: reconnectView.actionPlayerId,
      windowId: firstWindowId,
    },
  });
  assert.equal(staleReplay.status, 409, "a reconnected client cannot replay its old window ID in the counter window");
  assert.equal(staleReplay.data.room.currentAction.negationWindowId, counterWindowId);
  assert.equal(staleReplay.data.room.currentAction.deadline, counterDeadline, "a stale replay cannot restart the counter deadline");
  assert.equal(staleReplay.data.room.responseCountdownVisibleAt, counterVisibleAt);
  assert.equal(staleReplay.data.room.pendingNegation.submitted, false);
  assert.equal(roomCardCount(game.code, seatFiveCard.id), 1);

  await advanceNegationWindow(game.code, sourceMember.token, counterWindowId);
  const resolved = (await state(game.code, sourceMember.token)).data;
  assert.equal(resolved.pendingNegation, null);
  assert.equal(resolved.phase, "play");
  assert.equal(roomCardCount(game.code, root.id), 1, "the root physical card remains conserved after the completed counter deadline");
  assert.equal(roomCardCount(game.code, seatTwoCard.id), 1, "duplicate timer advances cannot consume the winning intent twice");
});

test("shared Negation leaves ordinary human responses on the 60-second timeout", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [attackerMember, defenderMember] = game.members;
  const [attacker, defender] = game.room.players;
  const attack = card("Attack", "gate-b-normal-response-timeout");
  setHand(attacker.id, [attack], 4, 4);
  setHand(defender.id, [card("Dodge", "gate-b-normal-response-timeout")], 4, 4);
  setTurn(game.code, attacker.seat);

  const opened = await request("play_card", { code: game.code, token: attackerMember.token, cardId: attack.id, targetId: defender.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  assert.equal(opened.data.room.currentAction.deadline, 0, "the ordinary response waits for the established client-ready timer");
  const armed = await request("start_response_timer", { code: game.code, token: defenderMember.token });
  assert.equal(armed.status, 200, JSON.stringify(armed.data));
  const deadline = armed.data.room.currentAction.deadline;
  const visibleAt = armed.data.room.responseCountdownVisibleAt;
  assert.equal(deadline - visibleAt, 60_000);
  const attackerView = (await state(game.code, attackerMember.token)).data;
  const defenderView = (await state(game.code, defenderMember.token)).data;
  assert.equal(attackerView.currentAction.deadline, deadline);
  assert.equal(defenderView.currentAction.deadline, deadline);
  assert.equal(attackerView.responseCountdownVisibleAt, visibleAt);
  assert.equal(defenderView.responseCountdownVisibleAt, visibleAt);
  const repeated = await request("start_response_timer", { code: game.code, token: defenderMember.token });
  assert.equal(repeated.data.room.currentAction.deadline, deadline, "repeated timer requests preserve the original 60-second deadline");
});

test("Dying rescue exposes only real Peach blockers and skips empty seats", { timeout: 30_000 }, async () => {
  async function lethal(peach) {
    const game = await createHumanGame(); const [sourceMember, targetMember] = game.members; const [source, target] = game.room.players;
    const attack = card("Attack", peach ? "peach-holder-attack" : "peach-empty-attack");
    setHand(source.id, peach ? [attack, card("Peach", "peach-holder") ] : [attack], 4, 4); setHand(target.id, [], 1, 4); setTurn(game.code, source.seat);
    const opened = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: target.id, preserveResponse: true });
    assert.equal(opened.status, 200); assert.equal((await requestAndSettle("decline_response", { code: game.code, token: targetMember.token, preserveResponse: true })).status, 200);
    return { game, sourceMember, targetMember, source, target };
  }
  const empty = await lethal(false); const emptyRescue = (await state(empty.game.code, empty.sourceMember.token)).data;
  assert.notEqual(emptyRescue.phase, "dying", "no legal Peach blocker is scanned automatically");
  assert.equal(emptyRescue.presentationV2.dyingBarrier, null);

  const holder = await lethal(true); const holderRescue = (await state(holder.game.code, holder.sourceMember.token)).data;
  assert.equal(holderRescue.phase, "dying"); assert.ok(holderRescue.currentAction.legalActions.includes("skip_rescue")); assert.ok(holderRescue.currentAction.legalActions.includes("give_peach"));
  const holderSkipped = await requestAndSettle("skip_rescue", { code: holder.game.code, token: holder.sourceMember.token }); assert.equal(holderSkipped.status, 200);
  assert.notEqual(holderSkipped.data.room.phase, "dying");
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(holder.source.id)}`)).map((item) => item.id), ["peach-peach-holder"]);
});

test("AOE uses one shared Negation window before opening its ordinary target response", { timeout: 30_000 }, async () => {
  for (const [kind, required] of [["RainingArrows", "dodge"], ["BarbarianInvasion", "attack"]]) {
    const game = await createHumanGame(); const [sourceMember, firstMember] = game.members; const [source, first, second, last] = game.room.players;
    const group = card(kind, `privacy-${kind}`); setHand(source.id, [group], 4, 4); setHand(first.id, [], 4, 4); setHand(second.id, [], 4, 4); setHand(last.id, [], 4, 4); setTurn(game.code, source.seat);
    const opened = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: group.id, preserveResponse: true });
    assert.equal(opened.status, 200);
    const windowId = opened.data.room.currentAction.negationWindowId;
    assert.ok(windowId);
    assert.equal(opened.data.room.pendingNegation.actorId, null);
    await advanceNegationWindow(game.code, sourceMember.token, windowId);
    const firstResponse = (await state(game.code, firstMember.token)).data;
    assert.equal(firstResponse.currentAction.requirement, required); assert.deepEqual(firstResponse.currentAction.options, []); assert.deepEqual(firstResponse.currentAction.legalActions, ["decline_response"]); assert.equal(firstResponse.pendingNegation, null);
  }
});

test("the three faction lords expose their active skills through the semantic protocol", { timeout: 120_000 }, async () => {
  const rendeGame = await createHumanGame();
  const [rendeHost, rendeAlice] = rendeGame.members;
  const rendeLiu = rendeGame.room.players.find((player) => player.name === "Host");
  const rendeTarget = rendeGame.room.players.find((player) => player.name === "Alice");
  assert.ok(rendeLiu && rendeTarget);
  const rendeCards = [card("Attack", "rende-one"), card("Dodge", "rende-two"), card("Peach", "rende-three")];
  sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(rendeLiu.id)}`);
  setHand(rendeLiu.id, rendeCards, 3, 4); setHand(rendeTarget.id, [], 4, 4); setTurn(rendeGame.code, rendeLiu.seat);
  const rendeView = await state(rendeGame.code, rendeHost.token);
  const rendeOption = rendeView.data.currentAction.triggerOptions.find((option) => option.effectId === "liu_bei_rende");
  assert.ok(rendeOption, "Liu Bei projects Rende as a generic Play Phase trigger");
  assert.deepEqual(rendeOption.selection.eligibleCardIds, rendeCards.map((held) => held.id));
  const rende = await requestAndSettle("trigger", { code: rendeGame.code, token: rendeHost.token, providerId: "liu_bei_rende", cardIds: [rendeCards[0].id, rendeCards[1].id], targetId: rendeTarget.id });
  assert.equal(rende.status, 200, JSON.stringify(rende.data));
  assert.equal(rende.data.room.players.find((player) => player.id === rendeLiu.id).hp, 4, "Rende recovers after giving two cards");
  assert.deepEqual((await state(rendeGame.code, rendeAlice.token)).data.myHand.map((held) => held.id), [rendeCards[0].id, rendeCards[1].id]);

  const zhihengGame = await createHumanGame();
  const zhihengHost = zhihengGame.members[0];
  const zhihengSun = zhihengGame.room.players.find((player) => player.name === "Host");
  assert.ok(zhihengSun);
  const discarded = card("Peach", "zhiheng-discard"); const equipped = card("BlueSteelSword", "zhiheng-equipment"); const drawn = card("Attack", "zhiheng-drawn"); const drawnTwo = card("Dodge", "zhiheng-drawn-two");
  sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(zhihengSun.id)}`);
  setHand(zhihengSun.id, [discarded], 4, 4); setEquipment(zhihengSun.id, { weapon: equipped }); setDeck(zhihengGame.code, [drawn, drawnTwo]); setTurn(zhihengGame.code, zhihengSun.seat);
  const projectedZhiheng = await state(zhihengGame.code, zhihengHost.token); const zhihengOption = projectedZhiheng.data.currentAction.triggerOptions.find((option) => option.effectId === "sun_quan_zhiheng");
  assert.deepEqual(zhihengOption.selection.eligibleCardIds, [discarded.id, equipped.id]);
  const zhiheng = await requestAndSettle("trigger", { code: zhihengGame.code, token: zhihengHost.token, providerId: "sun_quan_zhiheng", cardIds: [discarded.id, equipped.id] });
  assert.equal(zhiheng.status, 200, JSON.stringify(zhiheng.data));
  const zhihengCostEvent = zhiheng.data.room.timeline.find((event) => event.type === "cards" && event.cards.some((item) => item.id === discarded.id));
  assert.deepEqual(zhihengCostEvent.publicCardEffects?.[0]?.materials, [
    { cardId: discarded.id, ownerId: zhihengSun.id, fromZone: "HAND", toZone: "DISCARD" },
    { cardId: equipped.id, ownerId: zhihengSun.id, fromZone: "EQUIPMENT", toZone: "DISCARD" },
  ], "Equilibrium proves only its exact Hand/Equipment payments");
  assert.equal(zhihengCostEvent.publicCardEffects?.[0]?.activationOwnerId, zhihengSun.id);
  assert.deepEqual(new Set(zhiheng.data.room.myHand.map((held) => held.id)), new Set([drawn.id, drawnTwo.id]), "Equilibrium draws one replacement for each discarded card");
  assert.ok(discardIds(zhihengGame.code).includes(discarded.id)); assert.ok(discardIds(zhihengGame.code).includes(equipped.id));
  const zhihengObserver = (await state(zhihengGame.code, zhihengGame.members[1].token)).data;
  assert.equal(JSON.stringify(zhihengObserver.presentationSnapshot.publicCardEffects).includes(drawn.id), false);
  assert.equal(JSON.stringify(zhihengObserver.presentationSnapshot.publicCardEffects).includes(drawnTwo.id), false,
    "Equilibrium's private replacement draws never enter public proof");
  assert.deepEqual(JSON.parse(query(`SELECT equipment_json FROM players WHERE id=${quote(zhihengSun.id)}`)), {}, "an Equilibrium equipment cost leaves the Equipment Zone");
  assert.deepEqual(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(zhihengGame.code)}`)), { turnPlayerId: zhihengSun.id, zhihengUsed: true });

  const jiuyuanGame = await createHumanGame();
  const jiuyuanMembers = jiuyuanGame.members;
  const jiuyuanSource = jiuyuanGame.room.players.find((player) => player.name === "Host");
  const sun = jiuyuanGame.room.players.find((player) => player.name === "Alice");
  const wuRescuer = jiuyuanGame.room.players.find((player) => player.name === "Bob");
  assert.ok(jiuyuanSource && sun && wuRescuer);
  const lethalAttack = card("Attack", "jiuyuan-lethal"); const rescuePeach = card("Peach", "jiuyuan-peach");
  sql(`UPDATE players SET hero=NULL WHERE id IN (${jiuyuanGame.room.players.filter((player) => player.id !== sun.id && player.id !== wuRescuer.id).map((player) => quote(player.id)).join(",")})`);
  sql(`UPDATE players SET hero='sun-quan', role='Lord' WHERE id=${quote(sun.id)}`); sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(wuRescuer.id)}`);
  setEquipment(sun.id, {}); setHand(jiuyuanSource.id, [lethalAttack], 4, 4); setHand(sun.id, [], 1, 4); setHand(wuRescuer.id, [rescuePeach], 4, 4); setTurn(jiuyuanGame.code, jiuyuanSource.seat);
  const jiuyuanAttack = await requestAndSettle("play_card", { code: jiuyuanGame.code, token: jiuyuanMembers[0].token, cardId: lethalAttack.id, targetId: sun.id });
  assert.equal(jiuyuanAttack.status, 200, JSON.stringify(jiuyuanAttack.data));
  let jiuyuanRescue = null;
  const jiuyuanMemberById = new Map(jiuyuanGame.room.players.map((player, index) => [player.id, jiuyuanMembers[index]]));
  for (let attempt = 0; attempt < jiuyuanMembers.length && !jiuyuanRescue; attempt++) {
    const privateViews = await Promise.all(jiuyuanMembers.map((member) => state(jiuyuanGame.code, member.token)));
    const activeIndex = privateViews.findIndex((view) => view.data.currentAction?.kind === "dying" && view.data.isMyAction);
    const view = activeIndex >= 0 ? privateViews[activeIndex] : null;
    const actorId = view?.data.currentAction?.actorId; const actorMember = actorId ? jiuyuanMemberById.get(actorId) : null;
    if (!view || !actorMember) break;
    jiuyuanRescue = actorId === wuRescuer.id
      ? await requestAndSettle("give_peach", { code: jiuyuanGame.code, token: actorMember.token, cardId: rescuePeach.id })
      : await requestAndSettle("skip_rescue", { code: jiuyuanGame.code, token: actorMember.token });
    if (actorId !== wuRescuer.id) jiuyuanRescue = null;
  }
  assert.equal(jiuyuanRescue?.status, 200, JSON.stringify(jiuyuanRescue?.data));
  assert.equal(jiuyuanRescue.data.room.players.find((player) => player.id === sun.id).hp, 2, JSON.stringify(jiuyuanRescue.data.room));

  const jianxiongGame = await createHumanGame();
  const jianxiongHost = jianxiongGame.members[0];
  const jianxiongSource = jianxiongGame.room.players.find((player) => player.name === "Host");
  const cao = jianxiongGame.room.players.find((player) => player.name === "Alice");
  assert.ok(jianxiongSource && cao);
  const damageCard = card("Attack", "jianxiong-attack");
  sql(`UPDATE players SET hero=NULL WHERE id IN (${jianxiongGame.room.players.filter((player) => player.id !== cao.id).map((player) => quote(player.id)).join(",")})`); sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(cao.id)}`);
  setEquipment(jianxiongSource.id, {}); setEquipment(cao.id, {}); setHand(jianxiongSource.id, [damageCard], 4, 4); setHand(cao.id, [], 4, 4); setTurn(jianxiongGame.code, jianxiongSource.seat);
  const damage = await requestAndSettle("play_card", { code: jianxiongGame.code, token: jianxiongHost.token, cardId: damageCard.id, targetId: cao.id });
  assert.equal(damage.status, 200, JSON.stringify(damage.data));
  const caoDamageView = await state(jianxiongGame.code, jianxiongGame.members[1].token);
  assert.ok(caoDamageView.data.currentAction.triggerOptions?.some((option) => option.effectId === "cao_cao_jianxiong"), JSON.stringify(caoDamageView.data));
  const gained = await requestAndSettle("trigger", { code: jianxiongGame.code, token: jianxiongGame.members[1].token, providerId: "cao_cao_jianxiong" });
  assert.equal(gained.status, 200, JSON.stringify(gained.data));
  assert.ok((await state(jianxiongGame.code, jianxiongGame.members[1].token)).data.myHand.some((held) => held.id === damageCard.id));
  assert.equal(discardIds(jianxiongGame.code).includes(damageCard.id), false, "Jianxiong takes the damage card before it reaches discard");

  const hujiaGame = await createHumanGame();
  const [hujiaHost, hujiaAlice, hujiaBob] = hujiaGame.members;
  const hujiaSource = hujiaGame.room.players.find((player) => player.name === "Host");
  const hujiaCao = hujiaGame.room.players.find((player) => player.name === "Alice");
  const hujiaWei = hujiaGame.room.players.find((player) => player.name === "Bob");
  assert.ok(hujiaSource && hujiaCao && hujiaWei);
  const hujiaAttack = card("Attack", "hujia-attack"); const hujiaDodge = card("Dodge", "hujia-dodge");
  sql(`UPDATE players SET hero=NULL WHERE id=${quote(hujiaSource.id)}`); sql(`UPDATE players SET hero='cao-cao', role='Lord' WHERE id=${quote(hujiaCao.id)}`); sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(hujiaWei.id)}`);
  setEquipment(hujiaCao.id, {}); setHand(hujiaSource.id, [hujiaAttack], 4, 4); setHand(hujiaCao.id, [], 4, 4); setHand(hujiaWei.id, [hujiaDodge], 4, 4); setTurn(hujiaGame.code, hujiaSource.seat);
  const hujiaOpened = await requestAndSettle("play_card", { code: hujiaGame.code, token: hujiaHost.token, cardId: hujiaAttack.id, targetId: hujiaCao.id });
  assert.equal(hujiaOpened.status, 200, JSON.stringify(hujiaOpened.data));
  const hujiaTargetView = await state(hujiaGame.code, hujiaAlice.token);
  assert.ok(hujiaTargetView.data.currentAction?.options?.some((option) => option.providerId === "cao_cao_hujia"), JSON.stringify(hujiaTargetView.data));
  const delegated = await requestAndSettle("respond", { code: hujiaGame.code, token: hujiaAlice.token, providerId: "cao_cao_hujia" });
  assert.equal(delegated.status, 200, JSON.stringify(delegated.data));
  assert.equal(delegated.data.room.currentAction.actorId, hujiaWei.id, "Hujia moves the Dodge decision to a Wei delegate");
  const hujiaDodged = await requestAndSettle("respond", { code: hujiaGame.code, token: hujiaBob.token, cardId: hujiaDodge.id });
  assert.equal(hujiaDodged.status, 200, JSON.stringify(hujiaDodged.data));
  assert.equal(hujiaDodged.data.room.players.find((player) => player.id === hujiaCao.id).hp, 4, "the delegated Dodge prevents damage");

  const nonLordHujia = await createHumanGame();
  const nonLordSource = nonLordHujia.room.players[0]; const nonLordCao = nonLordHujia.room.players[1]; const nonLordWei = nonLordHujia.room.players[2];
  const nonLordAttack = card("Attack", "hujia-non-lord-attack"); const nonLordDodge = card("Dodge", "hujia-non-lord-dodge");
  sql(`UPDATE players SET hero=NULL WHERE id IN (${nonLordHujia.room.players.map((player) => quote(player.id)).join(",")})`);
  sql(`UPDATE players SET hero='cao-cao', role='Loyalist' WHERE id=${quote(nonLordCao.id)}`); sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(nonLordWei.id)}`);
  setHand(nonLordSource.id, [nonLordAttack], 4, 4); setHand(nonLordCao.id, [], 4, 4); setHand(nonLordWei.id, [nonLordDodge], 4, 4); setHand(nonLordHujia.room.players[3].id, [], 4, 4); setTurn(nonLordHujia.code, nonLordSource.seat);
  const nonLordOpened = await requestAndSettle("play_card", { code: nonLordHujia.code, token: nonLordHujia.members[0].token, cardId: nonLordAttack.id, targetId: nonLordCao.id });
  assert.equal(nonLordOpened.status, 200, JSON.stringify(nonLordOpened.data));
  const nonLordView = await state(nonLordHujia.code, nonLordHujia.members[1].token);
  assert.equal(nonLordView.data.currentAction.options?.some((option) => option.providerId === "cao_cao_hujia") ?? false, false, "a non-Lord Cao Cao does not discover Entourage");
  const forgedNonLord = await requestAndSettle("respond", { code: nonLordHujia.code, token: nonLordHujia.members[1].token, providerId: "cao_cao_hujia" });
  assert.equal(forgedNonLord.status, 409, "resolution rejects a forged non-Lord Entourage invocation");

  const jijiangGame = await createHumanGame();
  const [jijiangHost, jijiangAlice, jijiangBob] = jijiangGame.members;
  const jijiangSource = jijiangGame.room.players.find((player) => player.name === "Host");
  const liu = jijiangGame.room.players.find((player) => player.name === "Alice");
  const shu = jijiangGame.room.players.find((player) => player.name === "Bob");
  const other = jijiangGame.room.players.find((player) => player.name === "Carol");
  assert.ok(jijiangSource && liu && shu && other);
  const invasion = card("BarbarianInvasion", "jijiang-invasion"); const jijiangAttack = card("Attack", "jijiang-attack");
  sql(`UPDATE players SET hero=NULL WHERE id=${quote(jijiangSource.id)}`); sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(liu.id)}`); sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(shu.id)}`); sql(`UPDATE players SET hero=NULL WHERE id=${quote(other.id)}`);
  setHand(jijiangSource.id, [invasion], 4, 4); setHand(liu.id, [], 4, 4); setHand(shu.id, [jijiangAttack], 4, 4); setHand(other.id, [], 4, 4); setTurn(jijiangGame.code, jijiangSource.seat);
  const invasionOpened = await requestAndSettle("play_card", { code: jijiangGame.code, token: jijiangHost.token, cardId: invasion.id });
  assert.equal(invasionOpened.status, 200, JSON.stringify(invasionOpened.data));
  const jijiangTargetView = await state(jijiangGame.code, jijiangAlice.token);
  assert.ok(jijiangTargetView.data.currentAction.options.some((option) => option.providerId === "liu_bei_jijiang"));
  const jijiangDelegated = await requestAndSettle("respond", { code: jijiangGame.code, token: jijiangAlice.token, providerId: "liu_bei_jijiang" });
  assert.equal(jijiangDelegated.status, 200, JSON.stringify(jijiangDelegated.data));
  assert.equal(jijiangDelegated.data.room.currentAction.actorId, shu.id);
  const jijiangAnswered = await requestAndSettle("respond", { code: jijiangGame.code, token: jijiangBob.token, cardId: jijiangAttack.id });
  assert.equal(jijiangAnswered.status, 200, JSON.stringify(jijiangAnswered.data));
  assert.equal(jijiangAnswered.data.room.phase, "play", JSON.stringify(jijiangAnswered.data.room));
  assert.ok(jijiangAnswered.data.room.log.some((entry) => entry.includes("Bob plays Attack against Barbarian Invasion")));
});

test("Benevolence counts exact physical cards cumulatively and spends its threshold once", { timeout: 120_000 }, async () => {
  async function open(cards, hp = 3) {
    const game = await createHumanGame(); const source = game.room.players[0]; const target = game.room.players[1];
    sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(source.id)}`); setHand(source.id, cards, hp, 4); setHand(target.id, [], 4, 4); setTurn(game.code, source.seat);
    return { game, source, target };
  }
  const one = await open([card("Attack", "rende-one")]);
  assert.equal((await requestAndSettle("trigger", { code: one.game.code, token: one.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-one"], targetId: one.target.id })).status, 200);
  assert.equal((await state(one.game.code, one.game.members[0].token)).data.players.find((player) => player.id === one.source.id).hp, 3, "one card does not reach the recovery threshold");

  const two = await open([card("Attack", "rende-two-a"), card("Dodge", "rende-two-b")]);
  const twoResult = await requestAndSettle("trigger", { code: two.game.code, token: two.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-two-a", "dodge-rende-two-b"], targetId: two.target.id });
  assert.equal(twoResult.status, 200, JSON.stringify(twoResult.data)); assert.equal(twoResult.data.room.players.find((player) => player.id === two.source.id).hp, 4, "two cards recover once when Liu Bei is eligible");
  assert.deepEqual(discardIds(two.game.code), [], "Benevolence transfers cards without touching discard");
  const benevolenceRecipient = (await state(two.game.code, two.game.members[1].token)).data;
  assert.deepEqual(benevolenceRecipient.myHand.map((held) => held.id), ["attack-rende-two-a", "dodge-rende-two-b"]);
  const benevolenceArrivals = benevolenceRecipient.timeline.filter((event) => event.type === "card" && event.privateHandTransfer);
  assert.deepEqual(benevolenceArrivals.map((event) => event.privateHandTransfer.cardId), ["attack-rende-two-a", "dodge-rende-two-b"]);
  assert.ok(benevolenceArrivals.every((event) => event.privateHandTransfer.sourceZone === "hand"
    && event.privateHandTransfer.sourcePlayerId === two.source.id
    && event.privateHandTransfer.recipientId === two.target.id));
  const benevolenceObserver = (await state(two.game.code, two.game.members[2].token)).data;
  assert.equal(benevolenceObserver.timeline.some((event) => event.privateHandTransfer), false, "other seats do not receive private transfer receipts");
  const serializedObserver = JSON.stringify(benevolenceObserver);
  assert.equal(serializedObserver.includes("attack-rende-two-a"), false, "a transferred hidden card ID is not disclosed to observers");
  assert.equal(serializedObserver.includes("dodge-rende-two-b"), false, "the second transferred hidden card ID is not disclosed to observers");
  assert.equal(benevolenceRecipient.timeline.some((event) => event.type === "cards" && event.action === "play"
    && event.cards.some((held) => held.id === "attack-rende-two-a" || held.id === "dodge-rende-two-b")), false,
  "a hand transfer is not represented as a public card play");

  const split = await open([card("Attack", "rende-split-a"), card("Dodge", "rende-split-b")]);
  setHand(split.game.room.players[2].id, [], 4, 4);
  await requestAndSettle("trigger", { code: split.game.code, token: split.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-split-a"], targetId: split.target.id });
  const splitTarget = split.game.room.players[2];
  await requestAndSettle("trigger", { code: split.game.code, token: split.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["dodge-rende-split-b"], targetId: splitTarget.id });
  assert.equal((await state(split.game.code, split.game.members[0].token)).data.players.find((player) => player.id === split.source.id).hp, 4, "the threshold is cumulative across recipients and uses");
  assert.deepEqual((await state(split.game.code, split.game.members[2].token)).data.myHand.map((held) => held.id), ["dodge-rende-split-b"]);

  const full = await open([card("Attack", "rende-full-a"), card("Dodge", "rende-full-b"), card("Peach", "rende-full-c")], 4);
  await requestAndSettle("trigger", { code: full.game.code, token: full.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-full-a", "dodge-rende-full-b"], targetId: full.target.id });
  sql(`UPDATE players SET hp=3, hand_json=${quote(JSON.stringify([card("Peach", "rende-full-c")] ))} WHERE id=${quote(full.source.id)}`);
  await requestAndSettle("trigger", { code: full.game.code, token: full.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["peach-rende-full-c"], targetId: full.game.room.players[2].id });
  assert.equal((await state(full.game.code, full.game.members[0].token)).data.players.find((player) => player.id === full.source.id).hp, 3, "reaching the threshold at full HP spends the once-per-phase recovery event");

  const invalid = await open([card("Attack", "rende-invalid")]);
  const beforeInvalid = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(invalid.source.id)}`));
  assert.equal((await requestAndSettle("trigger", { code: invalid.game.code, token: invalid.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-invalid"], targetId: invalid.source.id })).status, 409);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(invalid.source.id)}`)), beforeInvalid, "an invalid self-target does not partially transfer cards");
  const stale = await open([card("Attack", "rende-stale")]);
  const staleView = await state(stale.game.code, stale.game.members[0].token); assert.ok(staleView.data.currentAction.triggerOptions.some((option) => option.effectId === "liu_bei_rende"));
  setHand(stale.source.id, [], 3, 4);
  const staleResult = await requestAndSettle("trigger", { code: stale.game.code, token: stale.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-stale"], targetId: stale.target.id });
  assert.equal(staleResult.status, 409); assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(stale.target.id)}`)).length, 0, "a stale hand selection does not partially transfer");

  const reset = await open([card("Attack", "rende-reset-give")]);
  await requestAndSettle("trigger", { code: reset.game.code, token: reset.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-reset-give"], targetId: reset.target.id });
  for (const player of reset.game.room.players.slice(1)) setHand(player.id, [], 4, 4);
  await requestAndSettle("end_turn", { code: reset.game.code, token: reset.game.members[0].token });
  for (let index = 1; index < reset.game.room.players.length; index++) { await requestAndSettle("draw", { code: reset.game.code, token: reset.game.members[index].token }); await requestAndSettle("end_turn", { code: reset.game.code, token: reset.game.members[index].token }); }
  const nextDraw = await requestAndSettle("draw", { code: reset.game.code, token: reset.game.members[0].token });
  assert.equal(nextDraw.status, 200, JSON.stringify(nextDraw.data));
  assert.ok((await state(reset.game.code, reset.game.members[0].token)).data.currentAction.triggerOptions.some((option) => option.effectId === "liu_bei_rende"), "Benevolence remains available on Liu Bei's next turn");
});

test("Influencing initiates a normal delegated Attack without leaking Shu hands", { timeout: 120_000 }, async () => {
  const game = await createHumanGame(); const source = game.room.players[0]; const firstShu = game.room.players[1]; const secondShu = game.room.players[2]; const target = game.room.players[3];
  const delegatedAttack = card("Attack", "influencing-attack"); const normalAttack = card("Attack", "influencing-normal");
  sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(source.id)}`); sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(firstShu.id)}`); sql(`UPDATE players SET hero='zhuge-liang' WHERE id=${quote(secondShu.id)}`); sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(target.id)}`);
  setHand(source.id, [normalAttack], 4, 4); setHand(firstShu.id, [delegatedAttack], 4, 4); setHand(secondShu.id, [], 4, 4); setHand(target.id, [], 4, 4); setTurn(game.code, source.seat);
  const projected = await state(game.code, game.members[0].token); const option = projected.data.currentAction.triggerOptions.find((candidate) => candidate.effectId === "liu_bei_jijiang");
  assert.ok(option, JSON.stringify(projected.data)); assert.equal(option.label, "Influencing"); assert.deepEqual(option.selection.targetIds, [firstShu.id, target.id]);
  const selected = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "liu_bei_jijiang", targetId: target.id });
  assert.equal(selected.status, 200, JSON.stringify(selected.data)); assert.equal(selected.data.room.currentAction.actorId, firstShu.id); assert.equal(selected.data.room.currentAction.reason.includes(delegatedAttack.id), false); assert.equal(JSON.stringify(selected.data.room.currentAction).includes(delegatedAttack.id), false);
  const accepted = await requestAndSettle("respond", { code: game.code, token: game.members[1].token, providerId: "card", cardId: delegatedAttack.id });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data)); assert.equal(accepted.data.room.players.find((player) => player.id === target.id).hp, 3); assert.equal(accepted.data.room.phase, "play-struck"); assert.ok(discardIds(game.code).includes(delegatedAttack.id));
  assert.deepEqual((await state(game.code, game.members[0].token)).data.myHand, [normalAttack], "the delegate's private hand is not projected to Liu Bei");

  const declinedGame = await createTestGame(); const declinedRoom = declinedGame.data.room; const declinedSource = declinedRoom.players[0]; const declinedFirst = declinedRoom.players[1]; const declinedSecond = declinedRoom.players[2]; const declinedTarget = declinedRoom.players[3]; const declinedToken = declinedGame.data.token; const followUpAttack = card("Attack", "influencing-follow-up");
  sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(declinedSource.id)}`); sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(declinedFirst.id)}`); sql(`UPDATE players SET hero='zhuge-liang' WHERE id=${quote(declinedSecond.id)}`); sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(declinedTarget.id)}`);
  setHand(declinedSource.id, [followUpAttack], 4, 4); setHand(declinedFirst.id, [], 4, 4); setHand(declinedSecond.id, [], 4, 4); setHand(declinedTarget.id, [], 4, 4); setTurn(declinedRoom.code, declinedSource.seat);
  const declinedStart = await requestAndSettle("trigger", { code: declinedRoom.code, token: declinedToken, providerId: "liu_bei_jijiang", targetId: declinedTarget.id, preserveResponse: true }); assert.equal(declinedStart.status, 200, JSON.stringify(declinedStart.data));
  const firstDecline = await requestAndSettle("decline_response", { code: declinedRoom.code, token: declinedToken, preserveResponse: true }); assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data)); assert.equal(firstDecline.data.room.currentAction.actorId, declinedSecond.id);
  const allDeclined = await requestAndSettle("decline_response", { code: declinedRoom.code, token: declinedToken, preserveResponse: true }); assert.equal(allDeclined.status, 200, JSON.stringify(allDeclined.data)); assert.equal(allDeclined.data.room.phase, "play"); assert.equal(discardIds(declinedRoom.code).includes(followUpAttack.id), false);
  const normal = await requestAndSettle("play_card", { code: declinedRoom.code, token: declinedToken, cardId: followUpAttack.id, targetId: declinedTarget.id }); assert.equal(normal.status, 200, JSON.stringify(normal.data));
});

test("Influencing reuses the normal Attack pipeline for semantic providers", { timeout: 120_000 }, async () => {
  const nonLord = await createHumanGame(); const nonLordSource = nonLord.room.players[0]; const nonLordDelegate = nonLord.room.players[1]; const nonLordTarget = nonLord.room.players[2];
  sql(`UPDATE players SET hero='liu-bei', role='Loyalist' WHERE id=${quote(nonLordSource.id)}`); sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(nonLordDelegate.id)}`); setHand(nonLordSource.id, [], 4, 4); setHand(nonLordDelegate.id, [card("Attack", "non-lord-attack")], 4, 4); setHand(nonLordTarget.id, [], 4, 4); setTurn(nonLord.code, nonLordSource.seat);
  assert.equal((await state(nonLord.code, nonLord.members[0].token)).data.currentAction.triggerOptions?.some((option) => option.effectId === "liu_bei_jijiang") ?? false, false, "a non-Lord Liu Bei does not project Influencing");
  assert.equal((await requestAndSettle("trigger", { code: nonLord.code, token: nonLord.members[0].token, providerId: "liu_bei_jijiang", targetId: nonLordTarget.id })).status, 409);

  const cases = [
    { hero: "guan-yu", providerId: "guan_yu_red_card_attack", material: { ...card("Peach", "influencing-god-of-war"), suit: "♥" }, selection: { cardId: "peach-influencing-god-of-war" }, playedAs: "attack" },
    { hero: "zhao-yun", providerId: "zhao_yun_dodge_as_attack", material: card("Dodge", "influencing-braveheart"), selection: { cardId: "dodge-influencing-braveheart" }, playedAs: "attack" },
    { hero: "guan-yu", providerId: "serpent_spear_attack", material: [card("Peach", "influencing-spear-one"), card("Dodge", "influencing-spear-two")], selection: { cardIds: ["peach-influencing-spear-one", "dodge-influencing-spear-two"] }, equipment: { weapon: card("SerpentSpear", "influencing-spear") } },
  ];
  for (const scenario of cases) {
    const game = await createHumanGame(); const source = game.room.players[0]; const delegate = game.room.players[1]; const target = game.room.players[3];
    const materials = Array.isArray(scenario.material) ? scenario.material : [scenario.material];
    for (const player of game.room.players) sql(`UPDATE players SET hero=NULL WHERE id=${quote(player.id)}`);
    sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(source.id)}`); sql(`UPDATE players SET hero=${quote(scenario.hero)} WHERE id=${quote(delegate.id)}`); sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(target.id)}`);
    setHand(source.id, [], 4, 4); setHand(delegate.id, materials, 4, 4); setHand(game.room.players[2].id, [], 4, 4); setHand(target.id, [], 4, 4); setEquipment(delegate.id, scenario.equipment ?? {}); setTurn(game.code, source.seat);
    const before = (await state(game.code, game.members[0].token)).data;
    assert.ok(before.currentAction.triggerOptions.some((option) => option.effectId === "liu_bei_jijiang"), `${scenario.providerId} keeps active Influencing visible before Attack use`);
    const opened = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "liu_bei_jijiang", targetId: target.id, preserveResponse: true });
    assert.equal(opened.status, 200, JSON.stringify(opened.data));
    const delegateView = (await state(game.code, game.members[1].token)).data;
    const provider = delegateView.currentAction.options.find((option) => option.providerId === scenario.providerId);
    assert.ok(provider, `${scenario.providerId} is projected privately to the delegate`);
    assert.equal(JSON.stringify((await state(game.code, game.members[0].token)).data.currentAction).includes(materials[0].id), false, "the requester does not see delegate card identity");
    const accepted = await requestAndSettle("respond", { code: game.code, token: game.members[1].token, providerId: scenario.providerId, ...scenario.selection });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
    assert.equal(accepted.data.room.players.find((player) => player.id === target.id).hp, 3, `${scenario.providerId} enters the ordinary Dodge/damage pipeline`);
    for (const material of materials) assert.ok(discardIds(game.code).includes(material.id), `${scenario.providerId} consumes ${material.id}`);
    assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(delegate.id)}`)).length, 0, `${scenario.providerId} removes provider costs from the delegate`);
    assert.equal((await state(game.code, game.members[0].token)).data.currentAction.triggerOptions?.some((option) => option.effectId === "liu_bei_jijiang") ?? false, false, "a successful delegated Attack consumes Liu Bei's normal Attack allowance");
  }
});

test("Delegated Duel keeps Liu Bei as the duelist and damage source", { timeout: 120_000 }, async () => {
  const game = await createHumanGame(); const source = game.room.players[0]; const liu = game.room.players[1]; const shu = game.room.players[2];
  const duel = card("Duel", "influencing-duel"); const attack = card("Attack", "influencing-duel-attack");
  for (const player of game.room.players) sql(`UPDATE players SET hero=NULL WHERE id=${quote(player.id)}`);
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`); sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(liu.id)}`); sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(shu.id)}`);
  setHand(source.id, [duel], 4, 4); setHand(liu.id, [], 4, 4); setHand(shu.id, [attack], 4, 4); setHand(game.room.players[3].id, [], 4, 4); setTurn(game.code, source.seat);
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: game.members[0].token, cardId: duel.id, targetId: liu.id })).status, 200);
  const liuView = await state(game.code, game.members[1].token); assert.ok(liuView.data.currentAction.options.some((option) => option.providerId === "liu_bei_jijiang"));
  assert.equal((await requestAndSettle("respond", { code: game.code, token: game.members[1].token, providerId: "liu_bei_jijiang", preserveResponse: true })).status, 200);
  const delegatedAttack = await requestAndSettle("respond", { code: game.code, token: game.members[2].token, providerId: "card", cardId: attack.id, preserveResponse: true });
  assert.equal(delegatedAttack.status, 200);
  const afterDelegatedAttack = await state(game.code, game.members[0].token);
  const duelExchange = afterDelegatedAttack.data.presentationV2.duelExchange;
  assert.equal(duelExchange?.responseCount, 1, "the accepted delegated Attack is linked to the persistent public Duel root");
  assert.equal(duelExchange?.responses[0].sourceId, liu.id, "the response direction uses the semantic Duel actor");
  assert.equal(duelExchange?.responses[0].targetId, source.id);
  assert.equal(duelExchange?.responses[0].decisionActorId, liu.id);
  assert.equal(duelExchange?.responses[0].responseActorId, shu.id, "the public proof separately names the actual card submitter");
  assert.equal(duelExchange?.root.sourceId, source.id);
  assert.equal(duelExchange?.root.targetId, liu.id);
  assert.equal(duelExchange?.root.eventId, afterDelegatedAttack.data.timeline.find((event) => event.card?.id === duel.id)?.id);
  const afterLiu = await state(game.code, game.members[0].token);
  assert.equal(afterLiu.data.currentAction.actorId, source.id, "the next Duel response returns to Cao Cao, not Guan Yu");
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(shu.id)}`)).length, 0);
  const failed = await requestAndSettle("decline_response", { code: game.code, token: game.members[0].token });
  assert.equal(failed.status, 200, JSON.stringify(failed.data));
  assert.equal(failed.data.room.players.find((player) => player.id === source.id).hp, 3, "a failed response damages the current semantic duelist");
  assert.ok(failed.data.room.log.some((entry) => entry.includes(liu.name)), `Liu Bei is the semantic Duel damage source: ${JSON.stringify(failed.data.room.log)}`);
});

test("Delegated Borrowed Sword Attack spends the delegate's cards but attacks as Liu Bei", { timeout: 120_000 }, async () => {
  const game = await createHumanGame(); const source = game.room.players[0]; const liu = game.room.players[1]; const shu = game.room.players[2]; const target = game.room.players[3];
  const borrowed = card("BorrowedSword", "influencing-borrowed"); const weapon = card("GreenDragonBlade", "influencing-borrowed-weapon"); const attack = card("Attack", "influencing-borrowed-attack");
  for (const player of game.room.players) sql(`UPDATE players SET hero=NULL WHERE id=${quote(player.id)}`);
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`); sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(liu.id)}`); sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(shu.id)}`);
  setHand(source.id, [borrowed], 4, 4); setHand(liu.id, [], 4, 4); setHand(shu.id, [attack], 4, 4); setHand(target.id, [], 4, 4); setEquipment(liu.id, { weapon }); setTurn(game.code, source.seat);
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: game.members[0].token, cardId: borrowed.id, targetId: liu.id })).status, 200);
  assert.equal((await requestAndSettle("choose_borrowed_sword_target", { code: game.code, token: game.members[0].token, targetId: target.id, preserveResponse: true })).status, 200);
  assert.equal((await requestAndSettle("respond", { code: game.code, token: game.members[1].token, providerId: "liu_bei_jijiang", preserveResponse: true })).status, 200);
  const delegated = await requestAndSettle("respond", { code: game.code, token: game.members[2].token, providerId: "card", cardId: attack.id, preserveResponse: true });
  assert.equal(delegated.status, 200, JSON.stringify(delegated.data));
  const pending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(pending.continuation.sourceId, liu.id, "Borrowed Sword uses Liu Bei as semantic attacker");
  assert.equal(pending.actorId, target.id);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(shu.id)}`)), [], "provider cost leaves the delegate's hand");
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(liu.id)}`)), [], "the semantic attacker does not pay the delegate's card cost");
  assert.equal((await requestAndSettle("decline_response", { code: game.code, token: game.members[3].token })).status, 200);
  assert.equal((await state(game.code, game.members[0].token)).data.players.find((player) => player.id === target.id).hp, 3);
});

test("Hujia prompts a living Wei character even when that character has no Dodge", { timeout: 120_000 }, async () => {
  const game = await openHujiaScenario({ delegateHero: "simayi" });
  const activated = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  assert.equal(activated.data.error, undefined);
  assert.equal(activated.data.room.currentAction.actorId, game.delegate.id);
  const delegateView = await state(game.code, game.delegateMember.token);
  assert.deepEqual(delegateView.data.currentAction.legalActions, ["decline_response"]);
  assert.deepEqual(delegateView.data.currentAction.options, []);
  assert.match(delegateView.data.currentAction.reason, /^Cao Cao asks you to provide Dodge with Entourage\.$/);
  const caoView = await state(game.code, game.caoMember.token);
  assert.doesNotMatch(caoView.data.currentAction.reason, /no Dodge/i);
});

test("Hujia lets a Wei character with Dodge cancel the Attack", { timeout: 120_000 }, async () => {
  const dodge = card("Dodge", "hujia-regression-dodge");
  const game = await openHujiaScenario({ delegateHero: "simayi", delegateCards: [dodge] });
  const activated = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  const delegateView = await state(game.code, game.delegateMember.token);
  assert.ok(delegateView.data.currentAction.legalActions.includes("respond"));
  assert.ok(delegateView.data.currentAction.legalActions.includes("decline_response"));
  assert.match(delegateView.data.currentAction.reason, /Play Dodge or decline/);
  const answered = await requestAndSettle("respond", { code: game.code, token: game.delegateMember.token, cardId: dodge.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.equal(answered.data.room.players.find((player) => player.id === game.cao.id).hp, 4);
});

test("Deliverance is Lord-only, faction- and ownership-gated, capped, and resumes Dying", { timeout: 120_000 }, async () => {
  async function rescue({ role = "Lord", rescuerHero = "gan-ning", self = false, maxHp = 4 }) {
    const game = await createHumanGame();
    const source = game.room.players[0]; const sun = game.room.players[1]; const rescuer = game.room.players[2];
    const attack = card("Attack", `deliverance-attack-${role}-${rescuerHero}-${self}-${maxHp}`); const peach = card("Peach", `deliverance-peach-${role}-${rescuerHero}-${self}-${maxHp}`);
    for (const player of game.room.players) sql(`UPDATE players SET hero=NULL WHERE id=${quote(player.id)}`);
    sql(`UPDATE players SET hero='sun-quan', role=${quote(role)} WHERE id=${quote(sun.id)}`);
    if (!self) sql(`UPDATE players SET hero=${quote(rescuerHero)} WHERE id=${quote(rescuer.id)}`);
    setHand(source.id, [attack], 4, 4); setHand(sun.id, self ? [peach] : [], 1, maxHp); setHand(rescuer.id, self ? [] : [peach], 4, 4); setHand(game.room.players[3].id, [], 4, 4); setTurn(game.code, source.seat);
    const started = await requestAndSettle("play_card", { code: game.code, token: game.members[0].token, cardId: attack.id, targetId: sun.id });
    assert.equal(started.status, 200, JSON.stringify(started.data));
    const membersById = new Map(game.room.players.map((player, index) => [player.id, game.members[index]]));
    let rescued = null;
    for (let attempt = 0; attempt < game.members.length && !rescued; attempt++) {
      const views = await Promise.all(game.members.map((member) => state(game.code, member.token)));
      const activeIndex = views.findIndex((view) => view.data.currentAction?.kind === "dying" && view.data.isMyAction);
      const actorId = activeIndex >= 0 ? views[activeIndex].data.currentAction.actorId : null; const actorMember = actorId ? membersById.get(actorId) : null;
      if (!actorId || !actorMember) break;
      const peachOwner = self ? sun.id : rescuer.id;
      rescued = actorId === peachOwner
        ? await requestAndSettle("give_peach", { code: game.code, token: actorMember.token, cardId: peach.id })
        : (await requestAndSettle("skip_rescue", { code: game.code, token: actorMember.token }), null);
    }
    assert.equal(rescued?.status, 200, "the eligible Peach owner completes rescue");
    return rescued.data.room;
  }

  const lordWu = await rescue({});
  assert.equal(lordWu.players.find((player) => player.id === lordWu.players[1].id)?.hp, 2);
  assert.equal(lordWu.phase, "play-struck", "Dying resumes the interrupted Attack continuation"); assert.equal(lordWu.pendingDying, null);
  const nonLord = await rescue({ role: "Loyalist" });
  assert.equal(nonLord.players[1].hp, 1, "non-Lord Sun Quan gets ordinary Peach recovery");
  const nonWu = await rescue({ rescuerHero: "cao-cao" });
  assert.equal(nonWu.players[1].hp, 1, "non-Wu rescuer gets ordinary Peach recovery");
  const ownPeach = await rescue({ self: true });
  assert.equal(ownPeach.players[1].hp, 1, "Sun Quan's own Peach gets ordinary recovery");
  const capped = await rescue({ maxHp: 1 });
  assert.equal(capped.players[1].hp, 1, "canonical recovery caps Deliverance at max HP");
});

test("Hujia asks Wei characters in action order instead of skipping empty hands", { timeout: 120_000 }, async () => {
  const dodge = card("Dodge", "hujia-order-dodge");
  const game = await openHujiaScenario({ delegateHero: "simayi", thirdHero: "zhang-liao", thirdCards: [dodge] });
  const activated = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  assert.equal(activated.data.room.currentAction.actorId, game.delegate.id);
  const firstDecline = await requestAndSettle("decline_response", { code: game.code, token: game.delegateMember.token, preserveResponse: true });
  assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data));
  assert.equal(firstDecline.data.room.currentAction.actorId, game.third.id);
  const answered = await requestAndSettle("respond", { code: game.code, token: game.thirdMember.token, cardId: dodge.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.equal(answered.data.room.players.find((player) => player.id === game.cao.id).hp, 4);
});

test("Hujia returns to Cao Cao after every Wei character declines without looping", { timeout: 120_000 }, async () => {
  const game = await openHujiaScenario({ delegateHero: "simayi", thirdHero: "zhang-liao" });
  const activated = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  const firstDecline = await requestAndSettle("decline_response", { code: game.code, token: game.delegateMember.token, preserveResponse: true });
  assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data));
  assert.equal(firstDecline.data.room.currentAction.actorId, game.third.id);
  const secondDecline = await requestAndSettle("decline_response", { code: game.code, token: game.thirdMember.token, preserveResponse: true });
  assert.equal(secondDecline.status, 200, JSON.stringify(secondDecline.data));
  assert.equal(secondDecline.data.room.currentAction.actorId, game.cao.id);
  const caoAfterDelegation = await state(game.code, game.caoMember.token);
  assert.deepEqual(caoAfterDelegation.data.currentAction.legalActions, ["decline_response"]);
  assert.deepEqual(caoAfterDelegation.data.currentAction.options, []);
  const finalDecline = await requestAndSettle("decline_response", { code: game.code, token: game.caoMember.token, preserveResponse: true });
  assert.equal(finalDecline.status, 200, JSON.stringify(finalDecline.data));
  assert.equal(finalDecline.data.room.players.find((player) => player.id === game.cao.id).hp, 3);
});

test("Hujia fallback lets Cao Cao use his own Dodge after all Wei declines", { timeout: 120_000 }, async () => {
  const dodge = card("Dodge", "hujia-fallback-dodge");
  const game = await openHujiaScenario({ delegateHero: "simayi", caoCards: [dodge] });
  const activated = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  const declined = await requestAndSettle("decline_response", { code: game.code, token: game.delegateMember.token, preserveResponse: true });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.currentAction.actorId, game.cao.id);
  const caoView = await state(game.code, game.caoMember.token);
  assert.ok(caoView.data.currentAction.legalActions.includes("respond"));
  assert.ok(caoView.data.currentAction.legalActions.includes("decline_response"));
  assert.ok(caoView.data.currentAction.options.some((option) => option.providerId === "card"));
  assert.equal(caoView.data.currentAction.options.some((option) => option.providerId === "cao_cao_hujia"), false);
  const answered = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, cardId: dodge.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.equal(answered.data.room.players.find((player) => player.id === game.cao.id).hp, 4);
});

test("Jijiang also asks an empty-handed Shu character before the next delegate", { timeout: 120_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, liuMember, firstShuMember, secondShuMember] = game.members;
  const source = game.room.players.find((player) => player.name === "Host");
  const liu = game.room.players.find((player) => player.name === "Alice");
  const firstShu = game.room.players.find((player) => player.name === "Bob");
  const secondShu = game.room.players.find((player) => player.name === "Carol");
  assert.ok(source && liu && firstShu && secondShu);
  const invasion = card("BarbarianInvasion", "jijiang-order-invasion");
  const attack = card("Attack", "jijiang-order-attack");
  for (const player of game.room.players) sql("UPDATE players SET hero=NULL WHERE id=" + quote(player.id));
  sql("UPDATE players SET hero='liu-bei', role='Lord' WHERE id=" + quote(liu.id));
  sql("UPDATE players SET hero='guan-yu' WHERE id=" + quote(firstShu.id));
  sql("UPDATE players SET hero='zhao-yun' WHERE id=" + quote(secondShu.id));
  setHand(source.id, [invasion], 4, 4); setHand(liu.id, [], 4, 4); setHand(firstShu.id, [], 4, 4); setHand(secondShu.id, [attack], 4, 4); setTurn(game.code, source.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: invasion.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const liuView = await state(game.code, liuMember.token);
  assert.ok(liuView.data.currentAction.options.some((option) => option.providerId === "liu_bei_jijiang"));
  const activated = await requestAndSettle("respond", { code: game.code, token: liuMember.token, providerId: "liu_bei_jijiang", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  assert.equal(activated.data.room.currentAction.actorId, firstShu.id);
  const firstDecline = await requestAndSettle("decline_response", { code: game.code, token: firstShuMember.token, preserveResponse: true });
  assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data));
  assert.equal(firstDecline.data.room.currentAction.actorId, secondShu.id);
  const answered = await requestAndSettle("respond", { code: game.code, token: secondShuMember.token, cardId: attack.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
});
