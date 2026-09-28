import test from "node:test";
import {
  assert, card, createHumanGame, createTestLobby, quote, query, request, requestAndSettle, setEquipment, setHand, setTurn, sql, state,
} from "./test-support.mjs";

test("healthy Gongsun Zan makes a raw-distance-2 Attack legal", async () => {
  const game = await createHumanGame();
  const [host] = game.members;
  const [source, , target] = game.room.players;
  sql(`UPDATE players SET hero='gongsun-zan' WHERE id=${quote(source.id)}`);
  setEquipment(source.id);
  setHand(source.id, [card("Attack", "militia-healthy")], 4, 4);
  setHand(target.id, [card("Dodge", "militia-answer")], 4, 4);
  setTurn(game.code, source.seat);

  const projected = await state(game.code, host.token);
  assert.equal(projected.data.players.find((player) => player.id === target.id).distance, 1, "healthy Militia projects effective distance 1");
  assert.equal(projected.data.players.find((player) => player.id === source.id).hero, "gongsun-zan");

  const attack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-militia-healthy", targetId: target.id });
  assert.equal(attack.status, 200, JSON.stringify(attack.data));
  assert.equal(attack.data.room.pendingAttack.targetId, target.id, "the legal target enters the normal Attack response flow");
});

test("low-HP Gongsun Zan makes the same raw-distance-2 Attack illegal", async () => {
  const game = await createHumanGame();
  const [host] = game.members;
  const [source, , target] = game.room.players;
  sql(`UPDATE players SET hero='gongsun-zan' WHERE id=${quote(target.id)}`);
  setEquipment(source.id);
  setEquipment(target.id);
  setHand(source.id, [card("Attack", "militia-low")], 4, 4);
  setHand(target.id, [], 2, 4);
  setTurn(game.code, source.seat);

  const projected = await state(game.code, host.token);
  assert.equal(projected.data.players.find((player) => player.id === target.id).distance, 3, "low-HP Militia projects effective distance 3");
  const attack = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-militia-low", targetId: target.id });
  assert.equal(attack.status, 409, "the target is rejected by authoritative Attack range validation");
});

test("Gongsun Zan remains selectable through the Quick Test hero flow", async () => {
  const created = await createTestLobby();
  const lordId = created.data.room.meId;
  const gongsun = { id: "gongsun-zan", name: "stale name", skills: [{ name: "stale", description: "stale" }] };
  sql(`UPDATE players SET hero_options_json=${quote(JSON.stringify([gongsun]))} WHERE id=${quote(lordId)}`);
  const projected = await state(created.data.room.code, created.data.token);
  assert.deepEqual(projected.data.myHeroOptions.map((hero) => hero.id), ["gongsun-zan"]);
  assert.deepEqual(projected.data.myHeroOptions[0].skills.map((skill) => skill.name), ["Militia"]);
  const chosen = await requestAndSettle("choose_hero", { code: created.data.room.code, token: created.data.token, heroId: "gongsun-zan" });
  assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
  assert.equal(query(`SELECT hero FROM players WHERE id=${quote(lordId)}`), "gongsun-zan");
});
