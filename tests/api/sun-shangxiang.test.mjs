import test from "node:test";
import { assert, card, createHumanGame, discardIds, quote, query, request, requestAndSettle, setDeck, setEquipment, setHand, setTurn, sql, state, takeDamageIfPending } from "./test-support.mjs";

function configure(game, { sunHp = 2, targetHero = "guan-yu", targetHp = 2, targetMaxHp = 4, sunHand = [card("Dodge", "betrothment-a"), card("Peach", "betrothment-b")] } = {}) {
  const [sun, target, ...others] = game.room.players;
  sql(`UPDATE players SET hero='sun-shangxiang' WHERE id=${quote(sun.id)}`);
  sql(`UPDATE players SET hero=${quote(targetHero)} WHERE id=${quote(target.id)}`);
  setHand(sun.id, sunHand, sunHp, 3);
  setHand(target.id, [], targetHp, targetMaxHp);
  for (const player of others) { sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(player.id)}`); setHand(player.id, [], 4, 4); }
  setEquipment(sun.id, {});
  setTurn(game.code, sun.seat, "play");
  return { sun, target };
}

test("Betrothment uses exactly two Hand cards, recovers Sun first then the injured male, and resets by turn state", async () => {
  const game = await createHumanGame();
  const { sun, target } = configure(game);
  setDeck(game.code, [card("Attack", "betrothment-draw"), card("Dodge", "betrothment-next")]);
  const opened = await state(game.code, game.members[0].token);
  const option = opened.data.currentAction.triggerOptions.find((entry) => entry.effectId === "sun_shangxiang_betrothment");
  assert.ok(option, JSON.stringify(opened.data));
  assert.equal(option.selection.min, 2);
  assert.equal(option.selection.max, 2);
  assert.deepEqual(option.selection.eligibleCardIds, ["dodge-betrothment-a", "peach-betrothment-b"]);
  assert.deepEqual(option.selection.targetIds, [target.id]);

  const used = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "sun_shangxiang_betrothment", cardIds: ["dodge-betrothment-a", "peach-betrothment-b"], targetId: target.id });
  assert.equal(used.status, 200, JSON.stringify(used.data));
  const resolved = (await state(game.code, game.members[0].token)).data;
  assert.equal(resolved.players.find((player) => player.id === sun.id).hp, 3);
  assert.equal(resolved.players.find((player) => player.id === target.id).hp, 3);
  assert.equal(resolved.myHand.length, 0);
  assert.equal(discardIds(game.code).filter((id) => id.includes("betrothment-")).length, 2);
  assert.equal(resolved.currentAction.triggerOptions?.some((entry) => entry.effectId === "sun_shangxiang_betrothment") ?? false, false);
  assert.equal((await request("trigger", { code: game.code, token: game.members[0].token, providerId: "sun_shangxiang_betrothment", cardIds: ["dodge-betrothment-a", "peach-betrothment-b"], targetId: target.id })).status, 409);
});

test("Betrothment remains legal for full-HP Sun, excludes full-HP/female/dead males, and rejects Equipment costs", async () => {
  const game = await createHumanGame();
  const { sun, target } = configure(game, { sunHp: 3, targetHero: "guan-yu", targetHp: 2 });
  const female = game.room.players[2];
  const deadMale = game.room.players[3];
  sql(`UPDATE players SET hero='lady-gan', hp=2, max_hp=3, alive=1 WHERE id=${quote(female.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=0, max_hp=4, alive=0 WHERE id=${quote(deadMale.id)}`);
  const opened = (await state(game.code, game.members[0].token)).data;
  const option = opened.currentAction.triggerOptions.find((entry) => entry.effectId === "sun_shangxiang_betrothment");
  assert.deepEqual(option.selection.targetIds, [target.id]);
  setEquipment(sun.id, { armor: card("NioShield", "betrothment-equipment") });
  const invalid = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "sun_shangxiang_betrothment", cardIds: ["betrothment-equipment", "dodge-betrothment-a"], targetId: target.id });
  assert.equal(invalid.status, 409);
  assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(game.code)}`) || "{}").betrothmentUsed, undefined);
});

test("Daredevil observes Equipment replacement and offers one private draw of two cards", async () => {
  const game = await createHumanGame();
  const { sun } = configure(game, { sunHp: 3, targetHp: 4, targetMaxHp: 4, sunHand: [card("BlueSteelSword", "new-weapon"), card("Dodge", "daredevil-spare")] });
  const oldWeapon = card("ZhugeCrossbow", "old-weapon");
  setEquipment(sun.id, { weapon: oldWeapon });
  setDeck(game.code, [card("Attack", "daredevil-draw-a"), card("Peach", "daredevil-draw-b")]);
  const newWeapon = card("BlueSteelSword", "new-weapon");
  const equipped = await request("play_card", { code: game.code, token: game.members[0].token, cardId: newWeapon.id });
  assert.equal(equipped.status, 200, JSON.stringify(equipped.data));
  assert.equal(equipped.data.room.currentAction.triggerEvent, "equipment_lost");
  assert.equal(equipped.data.room.currentAction.triggerOptions[0].effectId, "sun_shangxiang_daredevil");
  const accepted = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "sun_shangxiang_daredevil" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.deepEqual((await state(game.code, game.members[0].token)).data.myHand.map((item) => item.id), ["dodge-daredevil-spare", "attack-daredevil-draw-a", "peach-daredevil-draw-b"]);
});

test("Daredevil observes Steal taking Equipment into the attacker's Hand", async () => {
  const game = await createHumanGame();
  const [source, sun] = game.room.players;
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='sun-shangxiang' WHERE id=${quote(sun.id)}`);
  const weapon = card("ZhugeCrossbow", "steal-equipment");
  const steal = card("Steal", "steal-card");
  setHand(source.id, [steal], 4, 4); setHand(sun.id, [card("Dodge", "steal-spare")], 3, 3); setEquipment(sun.id, { weapon }); setTurn(game.code, source.seat, "play");
  const played = await request("play_card", { code: game.code, token: game.members[0].token, cardId: steal.id, targetId: sun.id });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  const chosen = await request("choose_target_card", { code: game.code, token: game.members[0].token, targetCardZone: "equipment", targetCardId: weapon.id });
  assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
  assert.equal(chosen.data.room.currentAction.actorId, sun.id);
  assert.equal(chosen.data.room.currentAction.triggerEvent, "equipment_lost");
  const declined = await request("decline_trigger", { code: game.code, token: game.members[1].token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.players.find((player) => player.id === source.id).handCount, 1);
  assert.ok((await state(game.code, game.members[0].token)).data.myHand.some((item) => item.id === weapon.id));
  assert.equal(declined.data.room.players.find((player) => player.id === sun.id).equipmentCards.length, 0);
});

test("Daredevil resumes Kirin Bow damage after Sun loses a Mount", async () => {
  const game = await createHumanGame();
  const [source, sun] = game.room.players;
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='sun-shangxiang' WHERE id=${quote(sun.id)}`);
  const bow = card("KirinBow", "sun-kirin-bow");
  const attack = card("Attack", "sun-kirin-attack");
  const mount = card("FerganaSteed", "sun-kirin-mount");
  setEquipment(source.id, { weapon: bow }); setHand(source.id, [attack], 4, 4);
  setEquipment(sun.id, { offensiveHorse: mount }); setHand(sun.id, [card("Dodge", "sun-kirin-dodge")], 3, 3); setTurn(game.code, source.seat, "play");
  const played = await requestAndSettle("play_card", { code: game.code, token: game.members[0].token, cardId: attack.id, targetId: sun.id });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  assert.equal((await takeDamageIfPending(game.code, game.members[1].token)).status, 200);
  const kirin = await state(game.code, game.members[0].token);
  assert.equal(kirin.data.currentAction.triggerOptions[0].effectId, "kirin_bow_damage_about_to_apply");
  const removed = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "kirin_bow_damage_about_to_apply", cardKeys: [mount.id], preserveResponse: true });
  assert.equal(removed.status, 200, JSON.stringify(removed.data));
  assert.equal(removed.data.room.currentAction.actorId, sun.id, JSON.stringify(removed.data.room.currentAction));
  assert.equal(removed.data.room.currentAction.triggerEvent, "equipment_lost");
  const accepted = await requestAndSettle("trigger", { code: game.code, token: game.members[1].token, providerId: "sun_shangxiang_daredevil" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const finalState = (await state(game.code, game.members[1].token)).data;
  assert.equal(finalState.players.find((player) => player.id === sun.id).hp, 2);
  assert.equal(finalState.phase, "play-struck");
  assert.equal(finalState.players.find((player) => player.id === sun.id).equipmentCards.length, 0);
});

test("Daredevil resumes Dauntless turn-end continuation after Sun loses Equipment", async () => {
  const game = await createHumanGame();
  const [sun, yue] = game.room.players;
  sql(`UPDATE players SET hero='sun-shangxiang' WHERE id=${quote(sun.id)}`);
  sql(`UPDATE players SET hero='yue-jin' WHERE id=${quote(yue.id)}`);
  const weapon = card("ZhugeCrossbow", "sun-dauntless-weapon");
  const peach = card("Peach", "sun-dauntless-cost");
  setEquipment(sun.id, { weapon }); setHand(sun.id, [], 3, 3);
  setEquipment(yue.id, {}); setHand(yue.id, [peach], 4, 4); setTurn(game.code, sun.seat, "play");
  const ended = await requestAndSettle("end_turn", { code: game.code, token: game.members[0].token, preserveResponse: true });
  assert.equal(ended.status, 200, JSON.stringify(ended.data));
  const activated = await requestAndSettle("trigger", { code: game.code, token: game.members[1].token, providerId: "yue_jin_dauntless", cardId: peach.id, preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  const selected = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "yue_jin_dauntless", cardKeys: [weapon.id], preserveResponse: true });
  assert.equal(selected.status, 200, JSON.stringify(selected.data));
  assert.equal(selected.data.room.currentAction.actorId, sun.id);
  assert.equal(selected.data.room.currentAction.triggerEvent, "equipment_lost", JSON.stringify(selected.data.room.currentAction));
  const declined = await requestAndSettle("decline_trigger", { code: game.code, token: game.members[0].token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.phase, "draw");
  assert.equal(declined.data.room.players.find((player) => player.id === sun.id).equipmentCards.length, 0);
});
