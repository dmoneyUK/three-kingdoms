/* eslint-disable @typescript-eslint/no-unused-vars */
import test from "node:test";
import {
  assert, card, createHumanGame, createHumanSetupGame, createTestGame, createTestLobby, discardIds, distributeLegacy, drainEmptyPrivateDecisions, markReady, normalizeRoomData, openBorrowedSwordScenario, openFankuiAttack, openGanglieAttack, openGanglieGroup, openGuoDamage, openHujiaScenario, passNegationWindows, prepareGuoJudgement, query, quote, request, requestAndSettle, roomCardCount, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state, takeDamageIfPending, waitForState,
} from "./test-support.mjs";

test("Xiahou Dun Stauchness declines or resolves a non-Heart Judgement through the generic source choice", { timeout: 30_000 }, async () => {
  const declined = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-decline-judge"), suit: "♠", rank: "7" } });
  assert.ok(declined.actionPresentation?.readyAfterEventId, "the damage trigger waits for its essential presentation barrier");
  const skipped = await requestAndSettle("decline_trigger", { code: declined.code, token: declined.targetMember.token });
  assert.equal(skipped.status, 200, JSON.stringify(skipped.data));
  assert.equal(skipped.data.room.phase, "play-struck");
  assert.equal(skipped.data.room.players.find((player) => player.id === declined.target.id).hp, 2);
  assert.equal(discardIds(declined.code).includes("dodge-ganglie-decline-judge"), false, "declining does not invent a Judgement card");

  const resolved = await openGanglieAttack({
    judge: { ...card("Dodge", "ganglie-spade-judge"), suit: "♠", rank: "7" },
    sourceCards: [card("Attack", "ganglie-discard-attack"), card("Dodge", "ganglie-cost-a"), card("Peach", "ganglie-cost-b")],
  });
  const accepted = await requestAndSettle("trigger", { code: resolved.code, token: resolved.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const sourceView = (await state(resolved.code, resolved.sourceMember.token)).data;
  assert.equal(sourceView.currentAction.kind, "trigger");
  assert.equal(sourceView.currentAction.triggerEvent, "damage_suffered");
  assert.equal(sourceView.currentAction.actorId, resolved.source.id);
  assert.ok(sourceView.currentAction.presentation?.readyAfterEventId, "the mandatory source choice retains its presentation barrier");
  const choice = sourceView.currentAction.triggerOptions.find((option) => option.effectId === "xiahou_dun_ganglie");
  assert.equal(choice.description, "The Judgement is not a Heart. Choose one: discard exactly 2 cards from your hand, or take 1 damage from Xiahou Dun. Equipment and Judgement Zone cards cannot be discarded for this choice.");
  assert.deepEqual(choice.selection.choices.map((entry) => entry.id), ["discard_two", "take_damage"]);
  assert.equal(choice.selection.choices[0].label, "Discard exactly 2 cards from your hand");
  assert.equal(choice.selection.cardCountByChoice.discard_two, 2);
  assert.deepEqual(choice.selection.eligibleHandKeys, ["hand:0", "hand:1"]);
  const targetView = (await state(resolved.code, resolved.targetMember.token)).data;
  assert.deepEqual(targetView.currentAction.triggerOptions, [], "the mandatory source choice is not projected to Xiahou Dun");
  const discarded = await requestAndSettle("trigger", { code: resolved.code, token: resolved.sourceMember.token, providerId: "xiahou_dun_ganglie", choice: "discard_two", cardKeys: ["hand:0", "hand:1"] });
  assert.equal(discarded.status, 200, JSON.stringify(discarded.data));
  assert.equal(discarded.data.room.phase, "play-struck");
  assert.equal(discarded.data.room.players.find((player) => player.id === resolved.target.id).hp, 2);
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(resolved.source.id)}`)).length, 0);
  for (const id of ["dodge-ganglie-spade-judge", "dodge-ganglie-cost-a", "peach-ganglie-cost-b"]) assert.ok(discardIds(resolved.code).includes(id), `${id} is conserved in discard`);
  assert.equal(discarded.data.room.log.filter((entry) => /takes 1 damage\./.test(entry)).length, 1);
});

test("Stauchness uses the final Guicai card, limits discard choices, and resumes when its source disappears", { timeout: 30_000 }, async () => {
  const game = await openGanglieAttack({
    judge: { ...card("Dodge", "ganglie-heart-judge"), suit: "♥", rank: "2" },
    sourceCards: [card("Attack", "ganglie-heart-attack"), card("Peach", "ganglie-heart-extra")],
  });
  const accepted = await requestAndSettle("trigger", { code: game.code, token: game.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.equal(accepted.data.room.phase, "play-struck");
  assert.ok(accepted.data.room.log.some((entry) => /Heart result means Stauchness has no effect/.test(entry)));
  assert.ok(discardIds(game.code).includes("dodge-ganglie-heart-judge"));

  const guicai = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-guicai-original"), suit: "♠", rank: "9" } });
  const sima = guicai.room.players.find((player) => player.name === "Bob");
  const simaMember = guicai.members.find((member) => member.name === "Bob");
  assert.ok(sima && simaMember);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(sima.id)}`);
  const replacement = { ...card("Dodge", "ganglie-guicai-replacement"), suit: "♥", rank: "Q" };
  setHand(sima.id, [replacement], 3, 3);
  const acceptedForGuicai = await requestAndSettle("trigger", { code: guicai.code, token: guicai.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(acceptedForGuicai.status, 200, JSON.stringify(acceptedForGuicai.data));
  const guicaiView = (await state(guicai.code, simaMember.token)).data;
  assert.equal(guicaiView.currentAction.triggerEvent, "judgement_revealed");
  assert.deepEqual(guicaiView.currentAction.triggerOptions.map((option) => option.effectId), ["sima_yi_guicai"]);
  const replaced = await requestAndSettle("trigger", { code: guicai.code, token: simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
  assert.equal(replaced.data.room.phase, "play-struck");
  assert.ok(discardIds(guicai.code).includes("dodge-ganglie-guicai-original"));
  assert.ok(discardIds(guicai.code).includes("dodge-ganglie-guicai-replacement"));

  const guicaiToNonHeart = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-guicai-heart-original"), suit: "♥", rank: "2" } });
  const sima2 = guicaiToNonHeart.room.players.find((player) => player.name === "Bob");
  const simaMember2 = guicaiToNonHeart.members.find((member) => member.name === "Bob");
  assert.ok(sima2 && simaMember2);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(sima2.id)}`);
  const replacementBlack = { ...card("Dodge", "ganglie-guicai-black-replacement"), suit: "♠", rank: "7" };
  setHand(sima2.id, [replacementBlack], 3, 3);
  const acceptedForReverseGuicai = await requestAndSettle("trigger", { code: guicaiToNonHeart.code, token: guicaiToNonHeart.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(acceptedForReverseGuicai.status, 200, JSON.stringify(acceptedForReverseGuicai.data));
  const reverseWindow = await state(guicaiToNonHeart.code, simaMember2.token);
  assert.equal(reverseWindow.data.currentAction.triggerEvent, "judgement_revealed");
  const reverseReplaced = await requestAndSettle("trigger", { code: guicaiToNonHeart.code, token: simaMember2.token, providerId: "sima_yi_guicai", cardId: replacementBlack.id });
  assert.equal(reverseReplaced.status, 200, JSON.stringify(reverseReplaced.data));
  assert.equal(reverseReplaced.data.room.currentAction.actorId, guicaiToNonHeart.source.id);
  const reverseChoice = await requestAndSettle("trigger", { code: guicaiToNonHeart.code, token: guicaiToNonHeart.sourceMember.token, providerId: "xiahou_dun_ganglie", choice: "take_damage" });
  assert.equal(reverseChoice.status, 200, JSON.stringify(reverseChoice.data));
  assert.equal(reverseChoice.data.room.players.find((player) => player.id === guicaiToNonHeart.source.id).hp, 3);
  assert.ok(discardIds(guicaiToNonHeart.code).includes("dodge-ganglie-guicai-heart-original"));
  assert.ok(discardIds(guicaiToNonHeart.code).includes("dodge-ganglie-guicai-black-replacement"));

  const sourceGone = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-source-gone"), suit: "♠", rank: "4" } });
  sql(`UPDATE players SET alive=0, hp=0, hand_json='[]' WHERE id=${quote(sourceGone.source.id)}`);
  sql(`UPDATE rooms SET turn_seat=${sourceGone.target.seat} WHERE code=${quote(sourceGone.code)}`);
  const resumed = await requestAndSettle("decline_trigger", { code: sourceGone.code, token: sourceGone.targetMember.token });
  assert.equal(resumed.status, 200, JSON.stringify(resumed.data));
  assert.equal(resumed.data.room.phase, "play-struck");
  assert.equal(resumed.data.room.pending, null);
});

test("host test flow projects Stauchness privately through the generic currentAction", { timeout: 30_000 }, async () => {
  const quick = await createTestGame();
  const { token, room } = quick.data;
  const [source, target, ...others] = room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='xiahou-dun' WHERE id=${quote(target.id)}`);
  setHand(source.id, [card("Attack", "quick-ganglie-attack"), card("Dodge", "quick-ganglie-cost-a"), card("Peach", "quick-ganglie-cost-b")], 4, 4);
  setHand(target.id, [], 3, 3);
  for (const player of others) setHand(player.id, [], 3, 3);
  setTurn(room.code, source.seat);
  setDeck(room.code, [{ ...card("Dodge", "quick-ganglie-judge"), suit: "♠", rank: "7" }]);
  const started = await requestAndSettle("play_card", { code: room.code, token, cardId: "attack-quick-ganglie-attack", targetId: target.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  assert.equal(started.data.room.currentAction.actorId, target.id);
  const accepted = await requestAndSettle("trigger", { code: room.code, token, providerId: "xiahou_dun_ganglie" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.equal(accepted.data.room.currentAction.actorId, source.id);
  assert.equal(accepted.data.room.currentAction.triggerEvent, "damage_suffered");
  assert.ok(accepted.data.room.currentAction.presentation?.readyAfterEventId);
  assert.deepEqual(accepted.data.room.currentAction.triggerOptions[0].selection.eligibleHandKeys, ["hand:0", "hand:1"]);
  assert.deepEqual(accepted.data.room.players.map((player) => player.handCards), [[], [], [], []], "host test flow never projects other hands");
  assert.deepEqual(accepted.data.room.myHand.map((held) => held.id), ["dodge-quick-ganglie-cost-a", "peach-quick-ganglie-cost-b"]);
});

test("Sima Yi Retaliation uses the generic target-card picker with privacy and exact card conservation", { timeout: 30_000 }, async () => {
  const game = await openFankuiAttack();
  const pending = (await state(game.code, game.targetMember.token)).data;
  const option = pending.currentAction.triggerOptions.find((entry) => entry.effectId === "sima_yi_fankui");
  assert.deepEqual(option.selection, { type: "target_cards", targetId: game.source.id, min: 1, max: 1, eligibleKeys: ["hand:0"] });
  assert.deepEqual(pending.myHand, [], "Sima Yi starts with an empty hand");
  assert.equal(pending.players.find((player) => player.id === game.source.id).handCards.length, 0, "Sima Yi does not receive source hand identities");
  const unrelated = (await state(game.code, game.members[2].token)).data;
  assert.equal(unrelated.players.find((player) => player.id === game.source.id).handCards.length, 0, "unrelated viewers do not receive source hand identities");

  const obtained = await requestAndSettle("trigger", { code: game.code, token: game.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] });
  assert.equal(obtained.status, 200, JSON.stringify(obtained.data));
  assert.equal(obtained.data.room.phase, "play-struck");
  assert.deepEqual(obtained.data.room.myHand.map((held) => held.id), ["peach-fankui-source-hidden"]);
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(game.source.id)} AND json_extract(value,'$.id')='peach-fankui-source-hidden'`), "0");
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(game.target.id)} AND json_extract(value,'$.id')='peach-fankui-source-hidden'`), "1");
  assert.equal(obtained.data.room.log.filter((entry) => /obtains a card from Host with Retaliation/.test(entry)).length, 1);
});

test("Retaliation can obtain an eligible public Equipment or Judgement card and ignores empty sources", { timeout: 30_000 }, async () => {
  const shield = card("NioShield", "fankui-public-equipment");
  const equipmentGame = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-equipment-attack")], sourceEquipment: { armor: shield } });
  const equipmentState = (await state(equipmentGame.code, equipmentGame.targetMember.token)).data;
  assert.deepEqual(equipmentState.currentAction.triggerOptions[0].selection.eligibleKeys, [shield.id]);
  const tookEquipment = await requestAndSettle("trigger", { code: equipmentGame.code, token: equipmentGame.targetMember.token, providerId: "sima_yi_fankui", cardKeys: [shield.id] });
  assert.equal(tookEquipment.status, 200, JSON.stringify(tookEquipment.data));
  assert.deepEqual(tookEquipment.data.room.myHand.map((held) => held.id), [shield.id]);
  assert.deepEqual(tookEquipment.data.room.players.find((player) => player.id === equipmentGame.source.id).equipmentCards, []);

  const delayed = card("Lightning", "fankui-public-judgement");
  const judgementGame = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-judgement-attack")], sourceJudgement: [delayed] });
  const judgementState = (await state(judgementGame.code, judgementGame.targetMember.token)).data;
  assert.deepEqual(judgementState.currentAction.triggerOptions[0].selection.eligibleKeys, [delayed.id]);
  const tookJudgement = await requestAndSettle("trigger", { code: judgementGame.code, token: judgementGame.targetMember.token, providerId: "sima_yi_fankui", cardKeys: [delayed.id] });
  assert.equal(tookJudgement.status, 200, JSON.stringify(tookJudgement.data));
  assert.deepEqual(tookJudgement.data.room.myHand.map((held) => held.id), [delayed.id]);
  assert.deepEqual(tookJudgement.data.room.players.find((player) => player.id === judgementGame.source.id).judgementCards, []);

  const emptyGame = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-empty-source")], expectReaction: false });
  const emptyState = (await state(emptyGame.code, emptyGame.targetMember.token)).data;
  assert.equal(emptyState.phase, "play-struck", JSON.stringify(emptyState));
  assert.equal(emptyState.currentAction.kind, "turn");
  assert.equal(emptyState.currentAction.triggerEvent, undefined);
});

test("Retaliation rejects stale source cards, handles a vanished source, and has one concurrent winner", { timeout: 30_000 }, async () => {
  const stale = await openFankuiAttack();
  setHand(stale.source.id, [], 4, 4);
  const staleResult = await requestAndSettle("trigger", { code: stale.code, token: stale.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] });
  assert.equal(staleResult.status, 409);
  assert.equal(staleResult.data.stale, true);
  assert.equal(staleResult.data.room.pending.kind, "trigger");

  const vanished = await openFankuiAttack();
  sql(`UPDATE players SET alive=0, hp=0, hand_json='[]', equipment_json='{}', judgement_json='[]' WHERE id=${quote(vanished.source.id)}`);
  sql(`UPDATE rooms SET turn_seat=${vanished.target.seat} WHERE code=${quote(vanished.code)}`);
  const skipped = await requestAndSettle("decline_trigger", { code: vanished.code, token: vanished.targetMember.token });
  assert.equal(skipped.status, 200, JSON.stringify(skipped.data));
  assert.equal(skipped.data.room.phase, "play-struck");
  assert.equal(skipped.data.room.pending, null);

  const race = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-race-attack"), card("Peach", "fankui-race-hidden")] });
  const [first, second] = await Promise.all([
    requestAndSettle("trigger", { code: race.code, token: race.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] }),
    requestAndSettle("trigger", { code: race.code, token: race.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] }),
  ]);
  assert.equal([first.status, second.status].filter((status) => status === 200).length, 1);
  const loser = [first, second].find((result) => result.status === 409);
  assert.ok(loser?.data.stale === true);
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(race.target.id)} AND json_extract(value,'$.id')='peach-fankui-race-hidden'`), "1");
  assert.equal(discardIds(race.code).filter((id) => id === "peach-fankui-race-hidden").length, 0);
  assert.equal((await state(race.code, race.targetMember.token)).data.phase, "play-struck");
});

test("host test flow follows Sima Yi only while he owns the Retaliation decision", { timeout: 30_000 }, async () => {
  const started = await createTestGame();
  const { token, room } = started.data;
  const [source, sima] = room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(sima.id)}`);
  setHand(source.id, [card("Attack", "quick-fankui-attack"), card("Peach", "quick-fankui-hidden")], 4, 4);
  setHand(sima.id, [], 3, 3);
  for (const player of room.players) { setEquipment(player.id, {}); setJudgement(player.id, []); }
  for (const player of room.players.slice(2)) setHand(player.id, [], 3, 3);
  setTurn(room.code, source.seat);
  const attacked = await requestAndSettle("play_card", { code: room.code, token, cardId: "attack-quick-fankui-attack", targetId: sima.id });
  assert.equal(attacked.status, 200, JSON.stringify(attacked.data));
  assert.equal(attacked.data.room.meId, sima.id);
  assert.equal(attacked.data.room.currentAction.actorId, sima.id);
  assert.deepEqual(attacked.data.room.currentAction.triggerOptions[0].selection.eligibleKeys, ["hand:0"]);
  const obtained = await requestAndSettle("trigger", { code: room.code, token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] });
  assert.equal(obtained.status, 200, JSON.stringify(obtained.data));
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(sima.id)} AND json_extract(value,'$.id')='peach-quick-fankui-hidden'`), "1");
  assert.equal(obtained.data.room.meId, source.id);
});

test("Stauchness take-damage choice enters the normal Dying flow and stale concurrent acceptance has one winner", { timeout: 30_000 }, async () => {
  const dying = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-dying-judge"), suit: "♣", rank: "5" }, sourceHp: 1, sourceCards: [card("Attack", "ganglie-dying-attack"), card("Peach", "ganglie-dying-extra")] });
  const accepted = await requestAndSettle("trigger", { code: dying.code, token: dying.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const sourceView = (await state(dying.code, dying.sourceMember.token)).data;
  const option = sourceView.currentAction.triggerOptions.find((entry) => entry.effectId === "xiahou_dun_ganglie");
  assert.deepEqual(option.selection.choices.map((entry) => entry.id), ["take_damage"], "one hand card cannot satisfy discard 2");
  assert.deepEqual(option.selection.eligibleHandKeys, ["hand:0"]);
  const damaged = await requestAndSettle("trigger", { code: dying.code, token: dying.sourceMember.token, providerId: "xiahou_dun_ganglie", choice: "take_damage" });
  assert.equal(damaged.status, 200, JSON.stringify(damaged.data));
  assert.equal(damaged.data.room.phase, "dying");
  assert.equal(damaged.data.room.pendingDying.targetId, dying.source.id);
  assert.equal(damaged.data.room.players.find((player) => player.id === dying.source.id).hp, 0);
  assert.ok(damaged.data.room.log.some((entry) => /takes 1 damage from Alice for Stauchness and enters Dying/.test(entry)));

  for (let attempt = 0; attempt < 4; attempt++) {
    const race = await openGanglieAttack({ judge: { ...card("Dodge", `ganglie-race-${attempt}`), suit: "♥", rank: "2" } });
    const [first, second] = await Promise.all([
      requestAndSettle("trigger", { code: race.code, token: race.targetMember.token, providerId: "xiahou_dun_ganglie" }),
      requestAndSettle("trigger", { code: race.code, token: race.targetMember.token, providerId: "xiahou_dun_ganglie" }),
    ]);
    const results = [first, second];
    assert.equal(results.filter((result) => result.status === 200).length, 1);
    const loser = results.find((result) => result.status === 409);
    assert.ok(loser && loser.data.stale === true && loser.data.room);
    assert.equal(loser.data.room.phase, "play-struck");
    assert.equal(loser.data.room.pending, null);
    assert.equal(loser.data.room.players.every((player) => player.handCards.length === 0), true);
    assert.equal(discardIds(race.code).filter((id) => id === `dodge-ganglie-race-${attempt}`).length, 1);
    assert.equal((await state(race.code, race.sourceMember.token)).data.players.find((player) => player.id === race.target.id).hp, 2);
  }
});

test("turn engine completes repeated rounds, rejects duplicate actions, and skips defeated players", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const membersBySeat = game.room.players.map((player) => ({ player, member: game.members.find((member) => member.name === player.name) })).sort((a, b) => a.player.seat - b.player.seat);
  assert.ok(membersBySeat.every(({ member }) => member));
  for (const { player } of membersBySeat) setHand(player.id, [], 10, 10);
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(Array.from({ length: 40 }, (_, index) => card("Dodge", `round-${index}`))))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  setTurn(game.code, membersBySeat[0].player.seat, "draw");

  for (let round = 0; round < 3; round++) {
    for (let index = 0; index < membersBySeat.length; index++) {
      const current = membersBySeat[index]; const next = membersBySeat[(index + 1) % membersBySeat.length];
      const before = await state(game.code, current.member.token);
      assert.equal(before.data.turnSeat, current.player.seat, `round ${round + 1} starts ${current.player.name}'s turn`); assert.equal(before.data.phase, "draw");
      const drawn = await requestAndSettle("draw", { code: game.code, token: current.member.token });
      assert.equal(drawn.status, 200); assert.equal(drawn.data.room.phase, "play"); assert.equal(drawn.data.drawnCards.length, 2);
      assert.equal((await requestAndSettle("draw", { code: game.code, token: current.member.token })).status, 409, "a player cannot draw twice");
      assert.equal((await requestAndSettle("end_turn", { code: game.code, token: next.member.token })).status, 409, "the next player cannot act early");
      const ended = await requestAndSettle("end_turn", { code: game.code, token: current.member.token });
      assert.equal(ended.status, 200); assert.equal(ended.data.room.turnSeat, next.player.seat); assert.equal(ended.data.room.phase, "draw");
    }
  }

  const [playerOne, defeated, playerThree] = membersBySeat;
  sql(`UPDATE players SET alive=0, hp=0 WHERE id=${quote(defeated.player.id)}`);
  for (const { player } of membersBySeat) if (player.id !== defeated.player.id) setHand(player.id, [], 10, 10);
  setTurn(game.code, playerOne.player.seat, "play");
  const skipped = await requestAndSettle("end_turn", { code: game.code, token: playerOne.member.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.turnSeat, playerThree.player.seat); assert.equal(skipped.data.room.phase, "draw");
  assert.equal((await requestAndSettle("draw", { code: game.code, token: defeated.member.token })).status, 409, "a defeated player cannot act");

  setTurn(game.code, defeated.player.seat, "draw");
  const invalidState = await requestAndSettle("draw", { code: game.code, token: defeated.member.token });
  assert.equal(invalidState.status, 409); assert.match(invalidState.data.error, /Game state check failed: The active turn does not belong to a living player/);
});

