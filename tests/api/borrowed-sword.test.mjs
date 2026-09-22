/* eslint-disable @typescript-eslint/no-unused-vars */
import test from "node:test";
import {
  assert, card, createHumanGame, createHumanSetupGame, createTestGame, createTestLobby, discardIds, distributeLegacy, drainEmptyPrivateDecisions, markReady, normalizeRoomData, openBorrowedSwordScenario, openFankuiAttack, openGanglieAttack, openGanglieGroup, openGuoDamage, openHujiaScenario, passNegationWindows, prepareGuoJudgement, query, quote, request, requestAndSettle, roomCardCount, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state, takeDamageIfPending, waitForState,
} from "./test-support.mjs";

test("Borrowed Sword forces a ranged Attack and transfers the Weapon on refusal", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const [source, holder, secondTarget] = game.room.players;
  const borrowed = card("BorrowedSword", "forced"); const weapon = card("GreenDragonBlade", "borrowed-weapon"); const attack = card("Attack", "borrowed-attack");
  setHand(source.id, [borrowed], 4, 5); setHand(holder.id, [attack], 4, 4); setHand(secondTarget.id, [], 4, 4); setEquipment(holder.id, { weapon }); setTurn(game.code, source.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.pendingBorrowedSword.stage, "choose_target");
  assert.equal(opened.data.room.currentAction.kind, "borrowed_sword"); assert.deepEqual(opened.data.room.currentAction.legalActions, ["choose_borrowed_sword_target"]); assert.equal(opened.data.room.currentAction.options, undefined);
  const chosen = await requestAndSettle("choose_borrowed_sword_target", { code: game.code, token: host.token, targetId: secondTarget.id });
  assert.equal(chosen.status, 200); assert.equal(chosen.data.room.pendingBorrowedSword.stage, "force_attack"); assert.equal(chosen.data.room.actionPlayerId, holder.id);
  const refused = await requestAndSettle("decline_response", { code: game.code, token: alice.token });
  assert.equal(refused.status, 200, JSON.stringify(refused.data)); assert.equal(refused.data.room.phase, "play"); assert.ok((await state(game.code, host.token)).data.myHand.some((item) => item.id === weapon.id));

  setHand(source.id, [borrowed], 4, 5); setHand(holder.id, [attack], 4, 4); setHand(secondTarget.id, [], 4, 4); setEquipment(holder.id, { weapon }); setTurn(game.code, source.seat);
  await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id });
  assert.equal((await requestAndSettle("choose_borrowed_sword_target", { code: game.code, token: host.token, targetId: secondTarget.id })).status, 200);
  const played = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: attack.id });
  assert.equal(played.status, 200, JSON.stringify(played.data)); assert.equal(played.data.room.players.find((player) => player.id === secondTarget.id).hp, 3); assert.equal(played.data.room.players.find((player) => player.id === holder.id).equipmentCards[0].id, weapon.id);

  const spear = card("SerpentSpear", "borrowed-spear"); setHand(source.id, [borrowed], 4, 5); setHand(holder.id, [card("Peach", "spear-cost-one"), card("Dodge", "spear-cost-two")], 4, 4); setHand(secondTarget.id, [], 4, 4); setEquipment(holder.id, { weapon: spear }); setTurn(game.code, source.seat);
  await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id }); await requestAndSettle("choose_borrowed_sword_target", { code: game.code, token: host.token, targetId: secondTarget.id });
  const spearAttack = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "serpent_spear_attack", cardIds: ["peach-spear-cost-one", "dodge-spear-cost-two"] });
  assert.equal(spearAttack.status, 200, JSON.stringify(spearAttack.data)); assert.equal(spearAttack.data.room.players.find((player) => player.id === secondTarget.id).hp, 3); assert.equal(spearAttack.data.room.players.find((player) => player.id === holder.id).equipmentCards[0].id, spear.id);
});

test("Borrowed Sword canonical response ownership and CAS matrix", { timeout: 120_000 }, async () => {
  {
    const s = await openBorrowedSwordScenario(); const stage2 = (await state(s.game.code, s.alice.token)).data; const other = (await state(s.game.code, s.host.token)).data;
    assert.equal(stage2.currentAction.actorId, s.holder.id); assert.ok(stage2.currentAction.options.some((option) => option.providerId === "card")); assert.ok(stage2.currentAction.options[0].selection.eligibleCardIds.length);
    const armed = await requestAndSettle("start_response_timer", { code: s.game.code, token: s.alice.token }); assert.equal(armed.status, 200); assert.ok(armed.data.room.currentAction.deadline > Date.now()); const rearmed = await requestAndSettle("start_response_timer", { code: s.game.code, token: s.alice.token }); assert.equal(rearmed.data.room.currentAction.deadline, armed.data.room.currentAction.deadline);
    assert.equal(other.meId, s.source.id); assert.deepEqual(other.currentAction.legalActions, []); assert.equal(other.currentAction.options, undefined);
    const stale = await requestAndSettle("decline_response", { code: s.game.code, token: s.alice.token, context: { actionRevision: s.stage1Revision, meId: s.holder.id, phase: "response", pendingKind: "response", actorId: s.holder.id } });
    assert.equal(stale.status, 409); assert.equal(stale.data.stale, true);
    const wrongSeat = await requestAndSettle("decline_response", { code: s.game.code, token: s.host.token }); assert.equal(wrongSeat.status, 409);
    const unchanged = (await state(s.game.code, s.alice.token)).data; assert.equal(unchanged.currentAction.actorId, s.holder.id); assert.equal(unchanged.currentAction.kind, "response"); assert.ok(unchanged.currentAction.options[0].selection.eligibleCardIds.includes(s.attackId)); assert.ok(unchanged.players.find((player) => player.id === s.holder.id).equipmentCards.some((item) => item.id === s.weapon.id));
    const attackId = s.attackId;
    const [a, b] = await Promise.all([request("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: attackId }), request("decline_response", { code: s.game.code, token: s.alice.token })]);
    assert.equal([a.status, b.status].filter((status) => status === 200).length, 1); assert.equal([a.status, b.status].filter((status) => status === 409).length, 1);
  }
  {
    const s = await openBorrowedSwordScenario(); const attackId = s.attackId;
    const [a, b] = await Promise.all([request("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: attackId }), request("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: attackId })]);
    assert.equal([a.status, b.status].filter((status) => status === 200).length, 1); assert.equal([a.status, b.status].filter((status) => status === 409).length, 1); assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(s.holder.id)} AND json_extract(value,'$.id')=${quote(attackId)}`), "0");
  }
  {
    const s = await openBorrowedSwordScenario(); const [a, b] = await Promise.all([request("decline_response", { code: s.game.code, token: s.alice.token }), request("decline_response", { code: s.game.code, token: s.alice.token })]);
    assert.equal([a.status, b.status].filter((status) => status === 200).length, 1); assert.equal([a.status, b.status].filter((status) => status === 409).length, 1); assert.equal(discardIds(s.game.code).filter((id) => id === s.weapon.id).length, 0); assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(s.source.id)} AND json_extract(value,'$.id')=${quote(s.weapon.id)}`), "1");
  }
  {
    const s = await openBorrowedSwordScenario({ choose: false }); const [a, b] = await Promise.all([request("choose_borrowed_sword_target", { code: s.game.code, token: s.host.token, targetId: s.target.id }), request("choose_borrowed_sword_target", { code: s.game.code, token: s.host.token, targetId: s.target.id })]);
    assert.equal([a.status, b.status].filter((status) => status === 200).length, 1); assert.equal([a.status, b.status].filter((status) => status === 409).length, 1); assert.equal((await state(s.game.code, s.alice.token)).data.currentAction.actorId, s.holder.id);
  }
});

test("Borrowed Sword transfer never follows a stale or replaced Weapon", { timeout: 120_000 }, async () => {
  for (const replacement of [null, card("BlueSteelSword", "replacement")]) {
    const s = await openBorrowedSwordScenario(); setEquipment(s.holder.id, replacement ? { weapon: replacement } : {});
    const declined = await requestAndSettle("decline_response", { code: s.game.code, token: s.alice.token }); assert.equal(declined.status, 200); assert.equal(declined.data.room.phase, "play");
    assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(s.source.id)} AND json_extract(value,'$.id')=${quote(s.weapon.id)}`), "0");
    if (replacement) assert.equal(query(`SELECT json_extract(equipment_json,'$.weapon.id') FROM players WHERE id=${quote(s.holder.id)}`), replacement.id);
  }
  const noProvider = await openBorrowedSwordScenario({ attack: false, choose: false }); setEquipment(noProvider.holder.id, { weapon: card("BlueSteelSword", "unrelated") });
  const ended = await requestAndSettle("choose_borrowed_sword_target", { code: noProvider.game.code, token: noProvider.host.token, targetId: noProvider.target.id }); assert.equal(ended.status, 200, JSON.stringify(ended.data)); assert.equal(ended.data.room.phase, "play"); assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(noProvider.source.id)} AND json_extract(value,'$.id')=${quote(noProvider.weapon.id)}`), "0");

  const impossible = await createHumanGame(); const [impossibleHost] = impossible.members; const [impossibleSource, deadNear, impossibleHolder, deadFar] = impossible.room.players;
  const impossibleBorrowed = card("BorrowedSword", "borrowed-no-target");
  setHand(impossibleSource.id, [impossibleBorrowed], 4, 5); setHand(impossibleHolder.id, [], 4, 4); setEquipment(impossibleSource.id, { defensiveHorse: card("DefensiveHorse", "borrowed-out-of-range") }); setEquipment(impossibleHolder.id, { weapon: card("ZhugeCrossbow", "borrowed-range-one") });
  sql(`UPDATE players SET alive=0,hp=0,hand_json='[]',equipment_json='{}' WHERE id IN (${quote(deadNear.id)},${quote(deadFar.id)})`); setTurn(impossible.code, impossibleSource.seat);
  const rejected = await requestAndSettle("play_card", { code: impossible.code, token: impossibleHost.token, cardId: impossibleBorrowed.id, targetId: impossibleHolder.id });
  assert.equal(rejected.status, 409); assert.match(rejected.data.error, /no legal target/); assert.equal((await state(impossible.code, impossibleHost.token)).data.pendingBorrowedSword, null);
});

test("Borrowed Sword forced Attacks re-enter Dodge and attack-targeted continuations", { timeout: 60_000 }, async () => {
  {
    const s = await openBorrowedSwordScenario({ weaponKind: "YinYangSwords" });
    sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(s.holder.id)}`); sql(`UPDATE players SET hero='zhen-ji' WHERE id=${quote(s.target.id)}`);
    setHand(s.target.id, [], 4, 4);
    const attack = await requestAndSettle("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: s.attackId }); assert.equal(attack.status, 200, JSON.stringify(attack.data));
    const targetedPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(s.game.code)}`));
    assert.equal(targetedPending.continuation.declaration.origin, "borrowed_sword"); assert.equal(targetedPending.continuation.declaration.sourceId, s.holder.id); assert.equal(targetedPending.continuation.declaration.resumePlayerId, s.source.id);
    const targetDecision = (await state(s.game.code, s.game.members[2].token)).data;
    assert.deepEqual(targetDecision.currentAction.legalActions, ["trigger"]);
    assert.equal(targetDecision.currentAction.declineAction, undefined);
    assert.deepEqual(targetDecision.currentAction.triggerOptions[0], { effectId: "yin_yang_swords_attack_targeted", label: "Yin-Yang Swords", allowDecline: false, timeoutChoiceId: "draw", selection: { type: "choice", choices: [{ id: "draw", label: "Allow attacker to draw 1 card" }], eligibleHandKeys: [] } });
    assert.equal((await requestAndSettle("decline_trigger", { code: s.game.code, token: s.game.members[2].token })).status, 409);
    setDeck(s.game.code, [card("Peach", "yin-draw")]);
    const drawn = await requestAndSettle("trigger", { code: s.game.code, token: s.game.members[2].token, providerId: "yin_yang_swords_attack_targeted", choice: "draw" }); assert.equal(drawn.status, 200, JSON.stringify(drawn.data));
    assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(s.holder.id)}`)).length, 1, "the attacker draws one card");
    const holderView = (await state(s.game.code, s.alice.token)).data;
    assert.equal(holderView.timeline.find((event) => event.type === "card" && event.action === "draw" && !event.initialDeal)?.card.id, "peach-yin-draw", "the attacker receives a private draw presentation card");
    assert.equal((await state(s.game.code, s.game.members[2].token)).data.timeline.some((event) => event.type === "card" && event.action === "draw" && !event.initialDeal), false, "the private drawn card is not exposed to the target");
    assert.equal(drawn.data.room.phase, "play");
  }
  {
    const s = await openBorrowedSwordScenario({ weaponKind: "YinYangSwords" });
    sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(s.holder.id)}`); sql(`UPDATE players SET hero='zhen-ji' WHERE id=${quote(s.target.id)}`);
    const discarded = card("Peach", "yin-discard"); setHand(s.target.id, [discarded], 4, 4);
    const attack = await requestAndSettle("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: s.attackId }); assert.equal(attack.status, 200, JSON.stringify(attack.data));
    const targetDecision = (await state(s.game.code, s.game.members[2].token)).data;
    assert.deepEqual(targetDecision.currentAction.legalActions, ["trigger"]); assert.equal(targetDecision.currentAction.declineAction, undefined);
    const declined = await requestAndSettle("decline_trigger", { code: s.game.code, token: s.game.members[2].token }); assert.equal(declined.status, 409);
    const chosen = await requestAndSettle("trigger", { code: s.game.code, token: s.game.members[2].token, providerId: "yin_yang_swords_attack_targeted", choice: "discard", cardKeys: ["hand:0"] }); assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
    assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(s.target.id)}`)).some((item) => item.id === discarded.id), false, "the target loses the selected hand card");
    assert.equal(chosen.data.room.phase, "play");
  }
  const s = await openBorrowedSwordScenario({ weaponKind: "YinYangSwords" });
  sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(s.holder.id)}`); sql(`UPDATE players SET hero='zhen-ji' WHERE id=${quote(s.target.id)}`);
  const dodge = card("Dodge", "borrowed-dodge"); const hidden = card("Peach", "borrowed-hidden"); setHand(s.target.id, [hidden, dodge], 4, 4);
  const attack = await requestAndSettle("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: s.attackId }); assert.equal(attack.status, 200, JSON.stringify(attack.data));
  const targetDecision = (await state(s.game.code, s.game.members[2].token)).data; assert.equal(targetDecision.currentAction.kind, "trigger"); assert.equal(targetDecision.currentAction.actorId, s.target.id); const yin = await requestAndSettle("trigger", { code: s.game.code, token: s.game.members[2].token, providerId: "yin_yang_swords_attack_targeted", choice: "discard", cardKeys: ["hand:0"] }); assert.equal(yin.status, 200, JSON.stringify(yin.data) + ` pending=${query(`SELECT turn_seat||':'||pending_json FROM rooms WHERE code=${quote(s.game.code)}`)}`);
  const dodgePending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(s.game.code)}`)); assert.equal(dodgePending.continuation.origin, "borrowed_sword"); assert.equal(dodgePending.continuation.sourceId, s.holder.id); assert.equal(dodgePending.continuation.resumePlayerId, s.source.id);
  const dodgePrompt = await state(s.game.code, s.game.members[2].token); assert.equal(dodgePrompt.data.currentAction.kind, "response"); assert.equal(dodgePrompt.data.currentAction.actorId, s.target.id);
  const dodged = await requestAndSettle("respond", { code: s.game.code, token: s.game.members[2].token, providerId: "card", cardId: dodge.id }); assert.equal(dodged.status, 200, JSON.stringify(dodged.data)); assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(s.holder.id)} AND json_extract(value,'$.id')=${quote(s.attackId)}`), "0");

  const spearScenario = await openBorrowedSwordScenario({ attack: false, weaponKind: "SerpentSpear", choose: false });
  const spearCostA = card("Peach", "borrowed-spear-cost-a"); const spearCostB = card("Dodge", "borrowed-spear-cost-b"); const targetDodge = card("Dodge", "borrowed-spear-target-dodge");
  setHand(spearScenario.holder.id, [spearCostA, spearCostB], 4, 4); setHand(spearScenario.target.id, [targetDodge], 4, 4);
  assert.equal((await requestAndSettle("choose_borrowed_sword_target", { code: spearScenario.game.code, token: spearScenario.host.token, targetId: spearScenario.target.id })).status, 200);
  const spear = await requestAndSettle("respond", { code: spearScenario.game.code, token: spearScenario.alice.token, providerId: "serpent_spear_attack", cardIds: [spearCostA.id, spearCostB.id] }); assert.equal(spear.status, 200, JSON.stringify(spear.data));
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(spearScenario.holder.id)} AND (json_extract(value,'$.id')=${quote(spearCostA.id)} OR json_extract(value,'$.id')=${quote(spearCostB.id)})`), "0");
  const spearDodge = await requestAndSettle("respond", { code: spearScenario.game.code, token: spearScenario.game.members[2].token, providerId: "card", cardId: targetDodge.id }); assert.equal(spearDodge.status, 200, JSON.stringify(spearDodge.data));

  const frostScenario = await openBorrowedSwordScenario({ weaponKind: "FrostSword" });
  const frostTargetCard = card("Peach", "borrowed-frost-target"); const rescuePeach = card("Peach", "borrowed-frost-rescue");
  sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(frostScenario.target.id)}`);
  setHand(frostScenario.source.id, [rescuePeach], 4, 5); setHand(frostScenario.target.id, [frostTargetCard], 1, 4);
  const frostAttack = await requestAndSettle("respond", { code: frostScenario.game.code, token: frostScenario.alice.token, providerId: "card", cardId: frostScenario.attackId }); assert.equal(frostAttack.status, 200, JSON.stringify(frostAttack.data));
  const damagePending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(frostScenario.game.code)}`)); assert.equal(damagePending.continuation.origin, "borrowed_sword"); assert.equal(damagePending.continuation.sourceId, frostScenario.holder.id); assert.equal(damagePending.continuation.resumePlayerId, frostScenario.source.id);
  const frostDeclined = await requestAndSettle("decline_trigger", { code: frostScenario.game.code, token: frostScenario.alice.token }); assert.equal(frostDeclined.status, 200, JSON.stringify(frostDeclined.data));
  const dyingPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(frostScenario.game.code)}`)); assert.equal(dyingPending.kind, "dying"); assert.equal(dyingPending.origin, "borrowed_sword"); assert.equal(dyingPending.resumePlayerId, frostScenario.source.id); assert.equal(frostDeclined.data.room.pendingDying.origin, "borrowed_sword");

  const longdanScenario = await openBorrowedSwordScenario({ attack: false, choose: false });
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(longdanScenario.holder.id)}`);
  const longdanBorrowedDodge = card("Dodge", "borrowed-longdan-dodge");
  setHand(longdanScenario.holder.id, [longdanBorrowedDodge], 4, 4); setHand(longdanScenario.target.id, [], 4, 4);
  assert.equal((await requestAndSettle("choose_borrowed_sword_target", { code: longdanScenario.game.code, token: longdanScenario.host.token, targetId: longdanScenario.target.id })).status, 200);
  const borrowedDecision = await state(longdanScenario.game.code, longdanScenario.alice.token);
  assert.equal(borrowedDecision.data.currentAction.options.find((option) => option.providerId === "zhao_yun_dodge_as_attack")?.playedAs, "attack");
  const borrowedLongdan = await requestAndSettle("respond", { code: longdanScenario.game.code, token: longdanScenario.alice.token, providerId: "zhao_yun_dodge_as_attack", cardId: longdanBorrowedDodge.id });
  assert.equal(borrowedLongdan.status, 200, JSON.stringify(borrowedLongdan.data));
  assert.equal(borrowedLongdan.data.room.timeline.find((event) => event.type === "card" && event.card.id === longdanBorrowedDodge.id)?.playedAs, "attack");
});


