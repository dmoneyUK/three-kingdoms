import test from "node:test";
import { assert, card, createHumanGame, discardIds, query, quote, request, requestAndSettle, roomCardCount, setHand, setTurn, state, sql } from "./test-support.mjs";

test("Prodigal Healer discards exactly one Hand card, heals self or another injured living character, and is once per Play Phase", async () => {
  const game = await createHumanGame();
  const [hua, target, full, dead] = game.room.players;
  const cost = card("Attack", "prodigal-cost", "♠");
  sql(`UPDATE players SET hero='hua-tuo' WHERE id=${quote(hua.id)}`);
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(target.id)}`);
  sql(`UPDATE players SET hero='lady-gan', hp=3, max_hp=3 WHERE id=${quote(full.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=0, max_hp=4, alive=0 WHERE id=${quote(dead.id)}`);
  setHand(hua.id, [cost], 2, 3);
  setHand(target.id, [], 2, 4);
  setHand(full.id, [], 3, 3);
  setHand(dead.id, [], 0, 4);
  sql(`UPDATE players SET alive=0, hp=0 WHERE id=${quote(dead.id)}`);
  setTurn(game.code, hua.seat, "play");

  const opened = (await state(game.code, game.members[0].token)).data;
  const option = opened.currentAction.triggerOptions.find((entry) => entry.effectId === "hua_tuo_prodigal_healer");
  assert.ok(option, JSON.stringify(opened));
  assert.deepEqual(option.selection, { type: "cards", min: 1, max: 1, eligibleCardIds: [cost.id], targetIds: [hua.id, target.id] });

  const used = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "hua_tuo_prodigal_healer", cardIds: [cost.id], targetId: target.id });
  assert.equal(used.status, 200, JSON.stringify(used.data));
  const healed = (await state(game.code, game.members[0].token)).data;
  assert.equal(healed.players.find((player) => player.id === target.id).hp, 3);
  assert.equal(healed.myHand.length, 0);
  assert.equal(discardIds(game.code).includes(cost.id), true);
  assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(game.code)}`) || "{}").prodigalHealerUsed, true);
  assert.equal(healed.currentAction.triggerOptions?.some((entry) => entry.effectId === "hua_tuo_prodigal_healer") ?? false, false);
  assert.equal(roomCardCount(game.code, cost.id), 1);

  const replay = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "hua_tuo_prodigal_healer", cardIds: [cost.id], targetId: hua.id });
  assert.equal(replay.status, 409);

  const ended = await requestAndSettle("end_turn", { code: game.code, token: game.members[0].token });
  assert.equal(ended.status, 200, JSON.stringify(ended.data));
  setHand(hua.id, [card("Dodge", "prodigal-next-turn")], 2, 3);
  for (const member of game.members.slice(1, 3)) {
    const drawn = await requestAndSettle("draw", { code: game.code, token: member.token });
    assert.equal(drawn.status, 200, JSON.stringify(drawn.data));
    const nextEnded = await requestAndSettle("end_turn", { code: game.code, token: member.token });
    assert.equal(nextEnded.status, 200, JSON.stringify(nextEnded.data));
  }
  assert.equal((await requestAndSettle("draw", { code: game.code, token: game.members[0].token })).status, 200);
  const nextPlay = (await state(game.code, game.members[0].token)).data;
  assert.equal(nextPlay.currentAction.triggerOptions.some((entry) => entry.effectId === "hua_tuo_prodigal_healer"), true, JSON.stringify(nextPlay));
});

test("First Aid offers only private red non-Peach cards and preserves Lady Gan Prudence through Dying", async () => {
  const game = await createHumanGame();
  const [source, lady, hua] = game.room.players;
  const attack = card("Attack", "first-aid-dying-attack", "♠");
  const redAttack = card("Attack", "first-aid-red-attack", "♥");
  const blackDodge = card("Dodge", "first-aid-black-dodge", "♠");
  sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='lady-gan' WHERE id=${quote(lady.id)}`);
  sql(`UPDATE players SET hero='hua-tuo' WHERE id=${quote(hua.id)}`);
  setHand(source.id, [attack], 4, 4);
  setHand(lady.id, [], 1, 3);
  setHand(hua.id, [redAttack, blackDodge], 3, 3);
  setTurn(game.code, source.seat, "play");

  const started = await requestAndSettle("play_card", { code: game.code, token: game.members[0].token, cardId: attack.id, targetId: lady.id, preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const declinedDodge = await request("decline_response", { code: game.code, token: game.members[1].token });
  assert.equal(declinedDodge.status, 200, JSON.stringify(declinedDodge.data));
  assert.equal((await request("skip_rescue", { code: game.code, token: game.members[0].token })).status, 200);
  assert.equal((await request("skip_rescue", { code: game.code, token: game.members[1].token })).status, 200);

  const huaView = (await state(game.code, game.members[2].token)).data;
  assert.equal(huaView.phase, "dying");
  assert.equal(huaView.currentAction.requirement, "peach");
  const firstAid = huaView.currentAction.options.find((option) => option.providerId === "hua_tuo_first_aid");
  assert.ok(firstAid, JSON.stringify(huaView));
  assert.deepEqual(firstAid.selection.eligibleCardIds, [redAttack.id]);
  assert.equal(firstAid.selection.eligibleCardIds.includes(blackDodge.id), false);
  const opponentView = (await state(game.code, game.members[0].token)).data;
  assert.equal(JSON.stringify(opponentView).includes(redAttack.id), false, "the red-card choices remain private to Hua Tuo");

  const rescued = await request("respond", { code: game.code, token: game.members[2].token, providerId: "hua_tuo_first_aid", cardId: redAttack.id });
  assert.equal(rescued.status, 200, JSON.stringify(rescued.data));
  const afterRescue = (await state(game.code, game.members[1].token)).data;
  assert.equal(afterRescue.currentAction.triggerEvent, "hp_recovered");
  assert.deepEqual(afterRescue.currentAction.triggerOptions.map((option) => option.effectId), ["lady_gan_prudence"]);
  assert.equal((await state(game.code, game.members[2].token)).data.myHand.some((card) => card.id === redAttack.id), false);

  const prudence = await request("trigger", { code: game.code, token: game.members[1].token, providerId: "lady_gan_prudence", targetId: source.id });
  assert.equal(prudence.status, 200, JSON.stringify(prudence.data));
  assert.equal(prudence.data.room.pendingDying, null);
  assert.equal(prudence.data.room.players.find((player) => player.id === lady.id).hp, 1);
  assert.equal(roomCardCount(game.code, redAttack.id), 1);
});
