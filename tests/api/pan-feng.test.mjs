import test from "node:test";
import {
  assert, card, createHumanGame, query, quote, request, requestAndSettle, roomCardCount, setDeck, setEquipment, setHand, setTurn, sql, state,
} from "./test-support.mjs";

function configure(game, { sourceHp = 4, targetHp = 3, targetHero = "zhao-yun" } = {}) {
  const [source, target, third, fourth] = game.room.players;
  sql(`UPDATE players SET hero='pan-feng', hp=${sourceHp}, max_hp=4, alive=1 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero=${quote(targetHero)}, hp=${targetHp}, max_hp=4, alive=1 WHERE id=${quote(target.id)}`);
  for (const player of [third, fourth]) sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4, alive=1 WHERE id=${quote(player.id)}`);
  for (const player of [source, target, third, fourth]) {
    setHand(player.id, [], player.id === source.id ? sourceHp : player.id === target.id ? targetHp : 4, 4);
    setEquipment(player.id, {});
  }
  setTurn(game.code, source.seat, "play");
  sql(`UPDATE rooms SET skill_state_json=${quote(JSON.stringify({ turnPlayerId: source.id }))} WHERE code=${quote(game.code)}`);
  return { source, target, third, fourth, sourceHp, targetHp, sourceMember: game.members[0], targetMember: game.members[1], thirdMember: game.members[2] };
}

async function resolveAttack(game, setup, attack, { targetId = setup.target.id, targetIds, preserveResponse = true } = {}) {
  setHand(setup.source.id, [attack], setup.sourceHp ?? 4, 4);
  const played = await request("play_card", { code: game.code, token: setup.sourceMember.token, cardId: attack.id, targetId, ...(targetIds ? { targetIds } : {}), preserveResponse });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  const dodged = await request("decline_response", { code: game.code, token: setup.targetMember.token, preserveResponse });
  assert.equal(dodged.status, 200, JSON.stringify(dodged.data));
  return (await state(game.code, setup.sourceMember.token)).data;
}

test("Axe of Insanity uses post-damage HP and draws exactly two private cards", async () => {
  const game = await createHumanGame();
  const setup = configure(game, { sourceHp: 4, targetHp: 3 });
  const attack = card("Attack", "pan-basic-attack", "♥");
  const firstDraw = card("Dodge", "pan-draw-1");
  const secondDraw = card("Peach", "pan-draw-2");
  setDeck(game.code, [firstDraw, secondDraw]);
  const view = await resolveAttack(game, setup, attack);
  assert.equal(view.players.find((player) => player.id === setup.target.id).hp, 2);
  assert.deepEqual(view.myHand.map((item) => item.id), [firstDraw.id, secondDraw.id]);
  assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(game.code)}`)).axeOfInsanityUsed, true);
  assert.equal((await state(game.code, setup.targetMember.token)).data.myHand.some((item) => item.id === firstDraw.id), false);
  assert.equal(roomCardCount(game.code, firstDraw.id), 1);
  assert.equal(roomCardCount(game.code, secondDraw.id), 1);
  assert.equal((await request("trigger", { code: game.code, token: setup.sourceMember.token, providerId: "pan_feng_axe_of_insanity" })).status, 409, "a replayed activation cannot duplicate the resolved effect");
});

test("Axe of Insanity compares equality and greater target HP after damage as HP loss", async () => {
  for (const [sourceHp, targetHp, expectedSourceHp] of [[3, 4, 2], [2, 3, 1]]) {
    const game = await createHumanGame();
    const setup = configure(game, { sourceHp, targetHp });
    const attack = card("Attack", `pan-loss-${sourceHp}-${targetHp}`);
    const view = await resolveAttack(game, setup, attack);
    assert.equal(view.players.find((player) => player.id === setup.target.id).hp, targetHp - 1);
    assert.equal(view.players.find((player) => player.id === setup.source.id).hp, expectedSourceHp);
    assert.equal(view.myHand.length, 0, "the HP-loss branch does not draw");
    assert.equal(view.currentAction?.triggerEvent, undefined, "mandatory Axe resolution does not leave a confirmation dialog");
  }
  const afterDamageComparison = await createHumanGame();
  const comparison = configure(afterDamageComparison, { sourceHp: 3, targetHp: 3 });
  setDeck(afterDamageComparison.code, [card("Dodge", "pan-after-damage-1"), card("Dodge", "pan-after-damage-2")]);
  const comparisonView = await resolveAttack(afterDamageComparison, comparison, card("Attack", "pan-after-damage"));
  assert.equal(comparisonView.players.find((player) => player.id === comparison.target.id).hp, 2);
  assert.equal(comparisonView.players.find((player) => player.id === comparison.source.id).hp, 3);
  assert.equal(comparisonView.myHand.length, 2, "3 HP versus target 3 to 2 is the draw branch");
});

test("Axe of Insanity is once per Play Phase, including a two-damage event and Halberd targets", async () => {
  const game = await createHumanGame();
  const setup = configure(game, { sourceHp: 4, targetHp: 4 });
  const [, secondTarget] = [setup.target, setup.third];
  setHand(secondTarget.id, [], 4, 4);
  setEquipment(setup.source.id, { weapon: card("SkyPiercingHalberd", "pan-halberd") });
  const attack = card("Attack", "pan-halberd-attack");
  const draws = [card("Dodge", "pan-halberd-draw-1"), card("Peach", "pan-halberd-draw-2"), card("Dodge", "pan-halberd-extra")];
  setDeck(game.code, draws);
  setHand(setup.source.id, [attack], 4, 4);
  const started = await request("play_card", { code: game.code, token: setup.sourceMember.token, cardId: attack.id, targetIds: [setup.target.id, secondTarget.id], preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  assert.equal((await request("decline_response", { code: game.code, token: setup.targetMember.token, preserveResponse: true })).status, 200);
  assert.equal((await request("decline_response", { code: game.code, token: setup.thirdMember.token, preserveResponse: true })).status, 200);
  const view = (await state(game.code, setup.sourceMember.token)).data;
  assert.deepEqual(view.myHand.map((item) => item.id), [draws[0].id, draws[1].id]);
  assert.equal(view.players.find((player) => player.id === setup.target.id).hp, 3);
  assert.equal(view.players.find((player) => player.id === secondTarget.id).hp, 3);

});

test("Axe of Insanity becomes available again in the next Play Phase", async () => {
  const game = await createHumanGame();
  const setup = configure(game, { sourceHp: 4, targetHp: 3 });
  const firstAttack = card("Attack", "pan-next-phase-first");
  setDeck(game.code, [card("Dodge", "pan-next-phase-draw-1"), card("Peach", "pan-next-phase-draw-2")]);
  await resolveAttack(game, setup, firstAttack);
  assert.equal((await requestAndSettle("end_turn", { code: game.code, token: setup.sourceMember.token })).status, 200);
  const nextAttack = card("Attack", "pan-next-phase-second");
  setHand(setup.source.id, [nextAttack], 4, 4);
  for (let index = 0; index < 3; index++) {
    const member = game.members[index + 1];
    const player = game.room.players[index + 1];
    setHand(player.id, [], 4, 4);
    assert.equal((await requestAndSettle("draw", { code: game.code, token: member.token })).status, 200);
    assert.equal((await requestAndSettle("end_turn", { code: game.code, token: member.token })).status, 200);
  }
  assert.equal((await requestAndSettle("draw", { code: game.code, token: setup.sourceMember.token })).status, 200);
  const resetState = JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(resetState.axeOfInsanityUsed, undefined);
  setHand(setup.source.id, [nextAttack], 4, 4);
  setDeck(game.code, [card("Dodge", "pan-next-phase-draw-3"), card("Peach", "pan-next-phase-draw-4")]);
  const second = await request("play_card", { code: game.code, token: setup.sourceMember.token, cardId: nextAttack.id, targetId: setup.target.id, preserveResponse: true });
  assert.equal(second.status, 200, JSON.stringify(second.data));
  assert.equal((await request("decline_response", { code: game.code, token: setup.targetMember.token, preserveResponse: true })).status, 200);
  assert.equal((await state(game.code, setup.sourceMember.token)).data.myHand.length, 2);
});

test("Axe of Insanity follows semantic Attack source identity through conversions and Borrowed Sword", async () => {
  const borrowed = await createHumanGame();
  const [borrowSource, pan, target] = borrowed.room.players;
  sql(`UPDATE players SET hero='cao-cao', hp=4, max_hp=4 WHERE id=${quote(borrowSource.id)}`);
  sql(`UPDATE players SET hero='pan-feng', hp=4, max_hp=4 WHERE id=${quote(pan.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=3, max_hp=4 WHERE id=${quote(target.id)}`);
  setHand(borrowSource.id, [card("BorrowedSword", "pan-borrowed")], 4, 4);
  setHand(pan.id, [card("Attack", "pan-borrowed-attack")], 4, 4);
  setHand(target.id, [], 3, 4);
  setEquipment(pan.id, { weapon: card("GreenDragonBlade", "pan-borrowed-weapon") });
  setTurn(borrowed.code, borrowSource.seat, "play");
  sql(`UPDATE rooms SET skill_state_json=${quote(JSON.stringify({ turnPlayerId: borrowSource.id }))} WHERE code=${quote(borrowed.code)}`);
  assert.equal((await requestAndSettle("play_card", { code: borrowed.code, token: borrowed.members[0].token, cardId: "borrowedsword-pan-borrowed", targetId: pan.id })).status, 200);
  assert.equal((await requestAndSettle("choose_borrowed_sword_target", { code: borrowed.code, token: borrowed.members[0].token, targetId: target.id })).status, 200);
  assert.equal((await requestAndSettle("respond", { code: borrowed.code, token: borrowed.members[1].token, providerId: "card", cardId: "attack-pan-borrowed-attack", preserveResponse: true })).status, 200);
  assert.equal((await request("decline_response", { code: borrowed.code, token: borrowed.members[2].token, preserveResponse: true })).status, 200);
  const borrowedView = (await state(borrowed.code, borrowed.members[1].token)).data;
  assert.equal(borrowedView.myHand.length, 2, "the forced Attack performer owns Axe of Insanity");
});

test("Axe of Insanity keeps Pan Feng as source after Da Qiao Deflection", async () => {
  const game = await createHumanGame();
  const [source, daqiao, replacement, fourth] = game.room.players;
  const [sourceMember, daqiaoMember, replacementMember] = game.members;
  const attack = card("Attack", "pan-deflection-attack", "♥");
  const cost = card("Peach", "pan-deflection-cost");
  const drawOne = card("Dodge", "pan-deflection-draw-1");
  const drawTwo = card("Peach", "pan-deflection-draw-2");
  sql(`UPDATE players SET hero='pan-feng', hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='daqiao', hp=3, max_hp=4 WHERE id=${quote(daqiao.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=3, max_hp=4 WHERE id=${quote(replacement.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(fourth.id)}`);
  setHand(source.id, [attack], 4, 4); setHand(daqiao.id, [cost], 3, 4); setHand(replacement.id, [], 3, 4); setHand(fourth.id, [], 4, 4);
  setDeck(game.code, [drawOne, drawTwo]); setTurn(game.code, source.seat, "play");
  sql(`UPDATE rooms SET skill_state_json=${quote(JSON.stringify({ turnPlayerId: source.id }))} WHERE code=${quote(game.code)}`);
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: daqiao.id, preserveResponse: true })).status, 200);
  assert.equal((await requestAndSettle("trigger", { code: game.code, token: daqiaoMember.token, providerId: "daqiao_deflection", cardId: cost.id, targetId: replacement.id, preserveResponse: true })).status, 200);
  assert.equal((await requestAndSettle("decline_response", { code: game.code, token: replacementMember.token })).status, 200);
  const view = (await state(game.code, sourceMember.token)).data;
  assert.equal(view.players.find((player) => player.id === daqiao.id).hp, 3);
  assert.equal(view.players.find((player) => player.id === replacement.id).hp, 2);
  assert.deepEqual(view.myHand.map((item) => item.id), [drawOne.id, drawTwo.id]);
});

test("Axe of Insanity does not trigger from Dodge, non-Attack damage, or Liu Bei Influencing", async () => {
  const game = await createHumanGame();
  const setup = configure(game, { sourceHp: 4, targetHp: 3 });
  const dodgedAttack = card("Attack", "pan-dodged");
  const dodge = card("Dodge", "pan-dodge-card");
  setHand(setup.source.id, [dodgedAttack], 4, 4);
  setHand(setup.target.id, [dodge], 3, 4);
  const played = await request("play_card", { code: game.code, token: setup.sourceMember.token, cardId: dodgedAttack.id, targetId: setup.target.id, preserveResponse: true });
  assert.equal(played.status, 200);
  assert.equal((await request("respond", { code: game.code, token: setup.targetMember.token, providerId: "card", cardId: dodge.id, preserveResponse: true })).status, 200);
  assert.equal((await state(game.code, setup.sourceMember.token)).data.myHand.length, 0);
  assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(game.code)}`)).axeOfInsanityUsed, undefined);

  const influencing = await createHumanGame();
  const [liu, panTarget, shu] = influencing.room.players;
  sql(`UPDATE players SET hero='liu-bei', role='Lord', hp=4, max_hp=4 WHERE id=${quote(liu.id)}`);
  sql(`UPDATE players SET hero='pan-feng', hp=3, max_hp=4 WHERE id=${quote(panTarget.id)}`);
  sql(`UPDATE players SET hero='guan-yu', hp=4, max_hp=4 WHERE id=${quote(shu.id)}`);
  const infAttack = card("Attack", "pan-influencing");
  setHand(liu.id, [], 4, 4); setHand(panTarget.id, [], 3, 4); setHand(shu.id, [infAttack], 4, 4); setTurn(influencing.code, liu.seat, "play");
  sql(`UPDATE rooms SET skill_state_json=${quote(JSON.stringify({ turnPlayerId: liu.id }))} WHERE code=${quote(influencing.code)}`);
  assert.equal((await requestAndSettle("trigger", { code: influencing.code, token: influencing.members[0].token, providerId: "liu_bei_jijiang", targetId: panTarget.id })).status, 200);
  assert.equal((await requestAndSettle("respond", { code: influencing.code, token: influencing.members[2].token, providerId: "card", cardId: infAttack.id, preserveResponse: true })).status, 200);
  assert.equal((await request("decline_response", { code: influencing.code, token: influencing.members[1].token, preserveResponse: true })).status, 200);
  assert.equal((await state(influencing.code, influencing.members[1].token)).data.myHand.length, 0);
});

test("Axe of Insanity HP loss uses canonical Dying and resumes the interrupted damage event", async () => {
  const game = await createHumanGame();
  const setup = configure(game, { sourceHp: 1, targetHp: 2 });
  const peach = card("Peach", "pan-rescue-peach");
  setHand(setup.target.id, [peach], 2, 4);
  const attack = card("Attack", "pan-lethal-branch");
  setHand(setup.source.id, [attack], 1, 4);
  const played = await request("play_card", { code: game.code, token: setup.sourceMember.token, cardId: attack.id, targetId: setup.target.id, preserveResponse: true });
  assert.equal(played.status, 200);
  assert.equal((await request("decline_response", { code: game.code, token: setup.targetMember.token, preserveResponse: true })).status, 200);
  const dying = await state(game.code, setup.sourceMember.token);
  assert.equal(dying.data.phase, "dying", JSON.stringify(dying.data));
  assert.equal((await request("skip_rescue", { code: game.code, token: setup.sourceMember.token, preserveResponse: true })).status, 200);
  const rescued = await request("give_peach", { code: game.code, token: setup.targetMember.token, cardId: peach.id, preserveResponse: true });
  assert.equal(rescued.status, 200, JSON.stringify(rescued.data));
  const resumed = (await state(game.code, setup.sourceMember.token)).data;
  assert.equal(resumed.players.find((player) => player.id === setup.source.id).hp, 1);
  assert.equal(resumed.players.find((player) => player.id === setup.target.id).hp, 1);
  assert.equal(resumed.currentAction?.triggerEvent, undefined);
  assert.equal(roomCardCount(game.code, peach.id), 1);
});
