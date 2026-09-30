import test from "node:test";
import {
  assert, card, createHumanGame, createTestGame, discardIds, query, quote, request, requestAndSettle, roomCardCount,
  setDeck, setEquipment, setHand, setTurn, sql, state,
} from "./test-support.mjs";

function configureLust(game, { firstHero = "guan-yu", secondHero = "cao-cao", firstHand = [], secondHand = [], cost = card("Peach", "lust-cost") } = {}) {
  const [diao, first, second, fourth] = game.room.players;
  sql(`UPDATE players SET hero='diao-chan', hp=3, max_hp=3 WHERE id=${quote(diao.id)}`);
  sql(`UPDATE players SET hero=${quote(firstHero)}, hp=4, max_hp=4, alive=1 WHERE id=${quote(first.id)}`);
  sql(`UPDATE players SET hero=${quote(secondHero)}, hp=4, max_hp=4, alive=1 WHERE id=${quote(second.id)}`);
  sql(`UPDATE players SET hero='sun-shangxiang', hp=3, max_hp=3, alive=1 WHERE id=${quote(fourth.id)}`);
  setHand(diao.id, cost ? [cost] : [], 3, 3);
  setHand(first.id, firstHand, 4, 4);
  setHand(second.id, secondHand, 4, 4);
  setHand(fourth.id, [], 3, 3);
  for (const player of game.room.players) setEquipment(player.id, {});
  setTurn(game.code, diao.seat, "play");
  return { diao, first, second, fourth, cost };
}

test("Lust offers ordered male Duel targets, accepts one Hand cost, bypasses Negation, and sources failure damage from the other duelist", async () => {
  const game = await createHumanGame();
  const setup = configureLust(game);
  const opened = (await state(game.code, game.members[0].token)).data;
  const option = opened.currentAction.triggerOptions.find((entry) => entry.effectId === "diao_chan_lust");
  assert.ok(option, JSON.stringify(opened));
  assert.deepEqual(option.selection.targetIds, [setup.first.id, setup.second.id]);
  assert.equal(option.selection.targetMin, 2);
  assert.equal(option.selection.targetMax, 2);
  assert.deepEqual(option.selection.eligibleCardIds, [setup.cost.id]);

  const started = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_lust", cardIds: [setup.cost.id], targetIds: [setup.first.id, setup.second.id], preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const firstView = (await state(game.code, game.members[1].token)).data;
  assert.equal(firstView.currentAction.actorId, setup.first.id);
  assert.equal(firstView.currentAction.requirement, "attack");
  assert.equal(firstView.currentAction.options.some((entry) => entry.providerId === "card"), false);
  assert.equal(started.data.room.pendingNegation, null);
  assert.equal(started.data.room.pendingDuel.damageCards.length, 0);
  assert.equal(started.data.room.pendingDuel.resumePlayerId, setup.diao.id);
  assert.equal(JSON.stringify(started.data.room.log).includes("stratagem_used"), false);
  assert.equal(JSON.stringify(started.data.room.log).includes("Cultivation"), false);
  assert.equal(discardIds(game.code).includes(setup.cost.id), true);
  assert.equal(roomCardCount(game.code, setup.cost.id), 1);

  const firstDeclines = await requestAndSettle("decline_response", { code: game.code, token: game.members[1].token, preserveResponse: true });
  assert.equal(firstDeclines.status, 200, JSON.stringify(firstDeclines.data));
  const finished = firstDeclines;
  assert.equal(finished.data.room.players.find((player) => player.id === setup.first.id).hp, 3);
  assert.equal(finished.data.room.players.find((player) => player.id === setup.second.id).hp, 4);
  assert.equal(finished.data.room.players.find((player) => player.id === setup.diao.id).hp, 3);
  assert.ok(finished.data.room.log.some((entry) => entry.includes(`${setup.second.name}`) && entry.includes(`${setup.first.name}`)), JSON.stringify(finished.data.room.log));
  assert.equal(finished.data.room.phase, "play");
  assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(game.code)}`)).lustUsed, true);
});

test("Lust accepts owned Equipment, rejects stale or duplicate selections, and resets on the next Play Phase", async () => {
  const game = await createHumanGame();
  const equipmentCost = card("GreenDragonBlade", "lust-equipment-cost");
  const setup = configureLust(game, { cost: null });
  setEquipment(setup.diao.id, { weapon: equipmentCost });
  const opened = (await state(game.code, game.members[0].token)).data;
  const option = opened.currentAction.triggerOptions.find((entry) => entry.effectId === "diao_chan_lust");
  assert.deepEqual(option.selection.eligibleCardIds, [equipmentCost.id]);

  const invalid = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_lust", cardIds: ["foreign-card"], targetIds: [setup.first.id, setup.first.id] });
  assert.equal(invalid.status, 409);
  assert.equal(discardIds(game.code).includes(equipmentCost.id), false);
  assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(game.code)}`)).lustUsed, undefined);

  const used = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_lust", cardIds: [equipmentCost.id], targetIds: [setup.second.id, setup.first.id], preserveResponse: true });
  assert.equal(used.status, 200, JSON.stringify(used.data));
  assert.equal(used.data.room.currentAction.actorId, setup.second.id);
  assert.equal(used.data.room.players.find((player) => player.id === setup.diao.id).equipmentCards.length, 0);
  assert.equal(discardIds(game.code).includes(equipmentCost.id), true);
  assert.equal(roomCardCount(game.code, equipmentCost.id), 1);
  await requestAndSettle("decline_response", { code: game.code, token: game.members[2].token, preserveResponse: true });

  const replay = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_lust", cardIds: [equipmentCost.id], targetIds: [setup.first.id, setup.second.id] });
  assert.equal(replay.status, 409);
  const next = await requestAndSettle("end_turn", { code: game.code, token: game.members[0].token });
  if (next.status !== 200) assert.fail(JSON.stringify(next.data));
  if (next.data.room.currentAction?.triggerOptions?.some((entry) => entry.effectId === "diao_chan_beauty_outshining_moon")) {
    assert.equal((await requestAndSettle("decline_trigger", { code: game.code, token: game.members[0].token })).status, 200);
  }
  for (const member of game.members.slice(1)) {
    assert.equal((await requestAndSettle("draw", { code: game.code, token: member.token })).status, 200);
    assert.equal((await requestAndSettle("end_turn", { code: game.code, token: member.token })).status, 200);
  }
  assert.equal((await requestAndSettle("draw", { code: game.code, token: game.members[0].token })).status, 200);
  assert.equal((await state(game.code, game.members[0].token)).data.currentAction.triggerOptions.some((entry) => entry.effectId === "diao_chan_lust"), true);
});

test("Lust uses generic Duel target legality, including Empty Fortress, and preserves Lü Bu's Unrivaled count", async () => {
  const fortress = await createHumanGame();
  const fortressSetup = configureLust(fortress, { firstHero: "zhuge-liang", secondHero: "zhao-yun" });
  setHand(fortressSetup.first.id, [], 4, 4);
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(fortressSetup.fourth.id)}`);
  setHand(fortressSetup.fourth.id, [], 4, 4);
  const fortressView = (await state(fortress.code, fortress.members[0].token)).data;
  const fortressOption = fortressView.currentAction.triggerOptions.find((entry) => entry.effectId === "diao_chan_lust");
  assert.ok(fortressOption, JSON.stringify(fortressView));
  assert.equal(fortressOption.selection.targetIds.includes(fortressSetup.first.id), false);
  assert.equal(fortressOption.selection.targetIds.includes(fortressSetup.second.id), true);

  const unrivaled = await createHumanGame();
  const setup = configureLust(unrivaled, { firstHero: "zhao-yun", secondHero: "lü-bu" });
  const started = await requestAndSettle("trigger", { code: unrivaled.code, token: unrivaled.members[0].token, providerId: "diao_chan_lust", cardIds: [setup.cost.id], targetIds: [setup.first.id, setup.second.id], preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  assert.equal(started.data.room.pendingDuel.wushuangPlayerId, setup.second.id);
  assert.equal(started.data.room.pendingDuel.requiredAttackCount, 2);
});

test("Lust enters canonical Attack conversion providers for Guan Yu, Zhao Yun, and Serpent Spear", async () => {
  const cases = [
    { hero: "guan-yu", providerId: "guan_yu_red_card_attack", hand: [{ ...card("Peach", "lust-guan-red"), suit: "♥" }], selection: { cardId: "peach-lust-guan-red" } },
    { hero: "zhao-yun", providerId: "zhao_yun_dodge_as_attack", hand: [card("Dodge", "lust-zhao-dodge")], selection: { cardId: "dodge-lust-zhao-dodge" } },
    { hero: "guan-yu", providerId: "serpent_spear_attack", hand: [card("Peach", "lust-spear-a"), card("Dodge", "lust-spear-b")], equipment: { weapon: card("SerpentSpear", "lust-spear") }, selection: { cardIds: ["peach-lust-spear-a", "dodge-lust-spear-b"] } },
  ];
  for (const scenario of cases) {
    const game = await createHumanGame();
    const setup = configureLust(game, { firstHero: scenario.hero, firstHand: scenario.hand });
    if (scenario.equipment) setEquipment(setup.first.id, scenario.equipment);
    const started = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_lust", cardIds: [setup.cost.id], targetIds: [setup.first.id, setup.second.id], preserveResponse: true });
    assert.equal(started.status, 200, JSON.stringify(started.data));
    const view = (await state(game.code, game.members[1].token)).data;
    assert.ok(view.currentAction.options.some((entry) => entry.providerId === scenario.providerId), `${scenario.providerId}: ${JSON.stringify(view)}`);
    const answered = await requestAndSettle("respond", { code: game.code, token: game.members[1].token, providerId: scenario.providerId, ...scenario.selection });
    assert.equal(answered.status, 200, JSON.stringify(answered.data));
    assert.equal(answered.data.room.players.find((player) => player.id === setup.second.id).hp, 3);
    for (const held of scenario.hand) assert.equal(roomCardCount(game.code, held.id), 1);
  }
});

test("Beauty Outshining the Moon is an optional private own-turn draw and shares turn_end ordering with Yue Jin", async () => {
  const game = await createHumanGame();
  const [diao, yue, other, fourth] = game.room.players;
  const draw = card("Attack", "beauty-draw");
  const cost = card("Peach", "beauty-yue-cost");
  sql(`UPDATE players SET hero='diao-chan', hp=3, max_hp=3 WHERE id=${quote(diao.id)}`);
  sql(`UPDATE players SET hero='yue-jin', hp=4, max_hp=4 WHERE id=${quote(yue.id)}`);
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(other.id)}`);
  sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(fourth.id)}`);
  setHand(diao.id, [], 3, 3); setHand(yue.id, [cost], 4, 4); setHand(other.id, [], 4, 4); setHand(fourth.id, [], 4, 4);
  for (const player of game.room.players) setEquipment(player.id, {});
  setDeck(game.code, [draw]);
  setTurn(game.code, diao.seat, "play");

  const opened = await requestAndSettle("end_turn", { code: game.code, token: game.members[0].token, preserveResponse: true });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const beauty = (await state(game.code, game.members[0].token)).data;
  assert.equal(beauty.currentAction.actorId, diao.id);
  assert.deepEqual(beauty.currentAction.triggerOptions.map((entry) => entry.effectId), ["diao_chan_beauty_outshining_moon"]);
  assert.equal((await state(game.code, game.members[1].token)).data.currentAction.triggerOptions.some((entry) => entry.effectId === "diao_chan_beauty_outshining_moon"), false);
  const reloaded = await state(game.code, game.members[0].token);
  const accepted = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_beauty_outshining_moon", preserveResponse: true });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.equal((await state(game.code, game.members[0].token)).data.myHand.some((held) => held.id === draw.id), true);
  assert.equal((await state(game.code, game.members[1].token)).data.players.find((player) => player.id === diao.id).handCount, 1);
  assert.equal(JSON.stringify((await state(game.code, game.members[1].token)).data).includes(draw.id), false);
  const stale = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "diao_chan_beauty_outshining_moon", context: { actionRevision: reloaded.data.actionRevision, meId: diao.id, phase: "response", pendingKind: "trigger", actorId: diao.id } });
  assert.equal(stale.status, 409);
  assert.equal(roomCardCount(game.code, draw.id), 1);
  const yueWindow = (await state(game.code, game.members[1].token)).data;
  assert.equal(yueWindow.currentAction.triggerOptions.some((entry) => entry.effectId === "yue_jin_dauntless"), true);
  const settled = await requestAndSettle("decline_trigger", { code: game.code, token: game.members[1].token });
  assert.equal(settled.status, 200, JSON.stringify(settled.data));
  assert.equal(settled.data.room.phase, "draw");

  const declined = await createHumanGame();
  const declineDiao = declined.room.players[0];
  sql(`UPDATE players SET hero='diao-chan' WHERE id=${quote(declineDiao.id)}`);
  for (const player of declined.room.players.slice(1)) sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(player.id)}`);
  setHand(declineDiao.id, [], 3, 3); setDeck(declined.code, [card("Attack", "beauty-decline-draw")]); setTurn(declined.code, declineDiao.seat, "play");
  const declinedOpen = await requestAndSettle("end_turn", { code: declined.code, token: declined.members[0].token, preserveResponse: true });
  assert.equal(declinedOpen.status, 200, JSON.stringify(declinedOpen.data));
  const declinedResult = await requestAndSettle("decline_trigger", { code: declined.code, token: declined.members[0].token });
  assert.equal(declinedResult.status, 200, JSON.stringify(declinedResult.data));
  assert.equal((await state(declined.code, declined.members[0].token)).data.myHand.some((held) => held.id === "beauty-decline-draw"), false);
});

test("Quick Test keeps Lust projected to the acting controlled Diao Chan seat", async () => {
  const quick = await createTestGame();
  const { token, room } = quick.data;
  const code = room.code;
  const [diao, first, second, fourth] = room.players;
  sql(`UPDATE players SET hero='diao-chan', hp=3, max_hp=3 WHERE id=${quote(diao.id)}`);
  sql(`UPDATE players SET hero='guan-yu', hp=4, max_hp=4 WHERE id=${quote(first.id)}`);
  sql(`UPDATE players SET hero='cao-cao', hp=4, max_hp=4 WHERE id=${quote(second.id)}`);
  sql(`UPDATE players SET hero='sun-shangxiang', hp=3, max_hp=3 WHERE id=${quote(fourth.id)}`);
  setHand(diao.id, [card("Peach", "quick-lust-cost")], 3, 3);
  setHand(first.id, [], 4, 4); setHand(second.id, [], 4, 4); setHand(fourth.id, [], 3, 3);
  for (const player of room.players) setEquipment(player.id, {});
  setTurn(code, diao.seat, "play");
  const view = (await state(code, token)).data;
  assert.equal(view.meId, diao.id);
  assert.equal(view.currentAction.triggerOptions.some((entry) => entry.effectId === "diao_chan_lust"), true);
});
