import test from "node:test";
import {
  assert, card, createHumanSetupGame, createTestGame, openBorrowedSwordScenario, query, quote, request, requestAndSettle, setDeck, setEquipment, setHand, setTurn, sql, state,
} from "./test-support.mjs";

function setHeroes(room, heroes) {
  room.players.forEach((player, index) => sql(`UPDATE players SET hero=${quote(heroes[index])}, hero_options_json='[]', hp=4, max_hp=4, alive=1 WHERE id=${quote(player.id)}`));
}

async function openStargazing(game) {
  const { code } = game;
  const baseRoom = game.room ?? game.views?.[0] ?? game.data.room;
  const players = baseRoom.players;
  const zhugeIndex = 1;
  setHeroes(baseRoom, ["guan-yu", "zhuge-liang", "zhao-yun", "xiahou-dun"]);
  players.forEach((player) => setHand(player.id, [], 4, 4));
  setDeck(code, [card("Attack", "star-a"), card("Dodge", "star-b"), card("Peach", "star-c"), card("Duel", "star-d"), card("Negation", "star-e"), card("Attack", "star-f")]);
  setTurn(code, players[0].seat, "play");
  const previousToken = game.members?.[0]?.token ?? game.data.token;
  const ended = await requestAndSettle("end_turn", { code, token: previousToken });
  assert.equal(ended.status, 200, JSON.stringify(ended.data));
  const actorToken = game.members?.[zhugeIndex]?.token ?? game.data.token;
  const actorView = await state(code, actorToken);
  assert.equal(actorView.data.currentAction?.kind, "trigger", JSON.stringify(actorView.data));
  assert.ok(actorView.data.currentAction.triggerOptions.some((option) => option.effectId === "zhuge_liang_stargazing"));
  return { ...game, room: baseRoom, actorToken, actorView: actorView.data };
}

test("Stargazing is optional, private, exact-card, reload-safe, and resumes Draw once", async () => {
  const game = await createHumanSetupGame();
  const opened = await openStargazing(game);
  const { code, actorToken } = opened;
  const accepted = await request("trigger", { code, token: actorToken, providerId: "zhuge_liang_stargazing" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const actor = (await state(code, actorToken)).data;
  assert.equal(actor.currentAction.kind, "deck_reorder");
  assert.deepEqual(actor.currentAction.deckReorder.cards.map((item) => item.id), ["attack-star-a", "dodge-star-b", "peach-star-c", "duel-star-d"]);
  assert.equal(actor.currentAction.deckReorder.minTop, 0);
  assert.equal(actor.currentAction.deckReorder.maxTop, 4);
  assert.equal(query(`SELECT json_extract(pending_json,'$.cards[0].id') FROM rooms WHERE code=${quote(code)}`), "attack-star-a");
  const opponent = (await state(code, opened.members[2].token)).data;
  assert.equal(opponent.currentAction.kind, "deck_reorder");
  assert.equal(opponent.currentAction.deckReorder, undefined);
  assert.equal(JSON.stringify(opponent.currentAction).includes("attack-star-a"), false);
  const reloaded = (await state(code, actorToken)).data;
  assert.deepEqual(reloaded.currentAction.deckReorder.cards.map((item) => item.id), actor.currentAction.deckReorder.cards.map((item) => item.id));

  const invalidDuplicate = await request("trigger", { code, token: actorToken, providerId: "private_deck_reorder", topCardIds: ["peach-star-c", "peach-star-c"], bottomCardIds: ["attack-star-a", "dodge-star-b", "duel-star-d"] });
  assert.equal(invalidDuplicate.status, 409);
  const invalidForeign = await request("trigger", { code, token: actorToken, providerId: "private_deck_reorder", topCardIds: ["foreign"], bottomCardIds: ["attack-star-a", "dodge-star-b", "peach-star-c", "duel-star-d"] });
  assert.equal(invalidForeign.status, 409);
  assert.equal((await state(code, actorToken)).data.currentAction.kind, "deck_reorder");

  const completed = await request("trigger", { code, token: actorToken, providerId: "private_deck_reorder", topCardIds: ["peach-star-c", "attack-star-a"], bottomCardIds: ["duel-star-d", "dodge-star-b"] });
  assert.equal(completed.status, 200, JSON.stringify(completed.data));
  assert.equal((await state(code, actorToken)).data.phase, "draw");
  assert.deepEqual(JSON.parse(query(`SELECT deck_json FROM rooms WHERE code=${quote(code)}`))[0].id, "peach-star-c");
  assert.deepEqual(JSON.parse(query(`SELECT deck_json FROM rooms WHERE code=${quote(code)}`)).map((item) => item.id), ["peach-star-c", "attack-star-a", "negation-star-e", "attack-star-f", "duel-star-d", "dodge-star-b"]);
  const replay = await request("trigger", { code, token: actorToken, providerId: "private_deck_reorder", topCardIds: ["peach-star-c"], bottomCardIds: ["attack-star-a", "dodge-star-b", "peach-star-c", "duel-star-d"] });
  assert.equal(replay.status, 409);
});

test("Quick Test keeps Stargazing cards private to the acting controlled seat", async () => {
  const game = await createTestGame();
  const { room, token } = game.data;
  setHeroes(room, ["guan-yu", "zhuge-liang", "zhao-yun", "xiahou-dun"]);
  room.players.forEach((player) => setHand(player.id, [], 4, 4));
  setDeck(room.code, [card("Attack", "quick-star-a"), card("Dodge", "quick-star-b"), card("Peach", "quick-star-c"), card("Duel", "quick-star-d"), card("Attack", "quick-star-e")]);
  setTurn(room.code, room.players[0].seat, "play");
  const ended = await requestAndSettle("end_turn", { code: room.code, token });
  assert.equal(ended.status, 200, JSON.stringify(ended.data));
  const actor = (await state(room.code, token)).data;
  assert.equal(actor.meId, room.players[1].id);
  const opened = await request("trigger", { code: room.code, token, providerId: "zhuge_liang_stargazing" });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const privateView = (await state(room.code, token)).data;
  assert.equal(privateView.currentAction.kind, "deck_reorder");
  assert.deepEqual(privateView.currentAction.deckReorder.cards.map((item) => item.id), ["attack-quick-star-a", "dodge-quick-star-b", "peach-quick-star-c", "duel-quick-star-d"]);
});

test("Stargazing is offered only to Zhuge Liang and decline resumes Draw", async () => {
  const game = await createHumanSetupGame();
  const opened = await openStargazing(game);
  const declined = await requestAndSettle("decline_trigger", { code: opened.code, token: opened.actorToken });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.phase, "draw");
  assert.notEqual(declined.data.room.currentAction.kind, "deck_reorder");

  const other = await createHumanSetupGame();
  const room = other.views[0];
  setHeroes(room, ["guan-yu", "zhao-yun", "xiahou-dun", "sun-ce"]);
  room.players.forEach((player) => setHand(player.id, [], 4, 4));
  setDeck(other.code, [card("Attack", "non-zhuge-star-a"), card("Dodge", "non-zhuge-star-b"), card("Peach", "non-zhuge-star-c"), card("Duel", "non-zhuge-star-d")]);
  setTurn(other.code, room.players[0].seat, "play");
  const ended = await requestAndSettle("end_turn", { code: other.code, token: other.members?.[0]?.token ?? other.data.token });
  assert.equal(ended.status, 200, JSON.stringify(ended.data));
  const next = (await state(other.code, other.members?.[1]?.token ?? other.data.token)).data;
  assert.equal(Boolean(next.currentAction?.triggerOptions?.some((option) => option.effectId === "zhuge_liang_stargazing")), false);
});

test("Stargazing uses the canonical discard refill boundary", async () => {
  const game = await createHumanSetupGame();
  const baseRoom = game.views[0];
  setHeroes(baseRoom, ["guan-yu", "zhuge-liang", "zhao-yun", "xiahou-dun"]);
  baseRoom.players.forEach((player) => setHand(player.id, [], 4, 4));
  setDeck(game.code, [card("Attack", "refill-deck")]);
  sql(`UPDATE rooms SET discard_json=${quote(JSON.stringify([card("Dodge", "refill-a"), card("Peach", "refill-b"), card("Duel", "refill-c")]))} WHERE code=${quote(game.code)}`);
  setTurn(game.code, baseRoom.players[0].seat, "play");
  const ended = await requestAndSettle("end_turn", { code: game.code, token: game.members[0].token });
  assert.equal(ended.status, 200, JSON.stringify(ended.data));
  const opened = await request("trigger", { code: game.code, token: game.members[1].token, providerId: "zhuge_liang_stargazing" });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const view = (await state(game.code, game.members[1].token)).data;
  assert.equal(view.currentAction.kind, "deck_reorder");
  assert.equal(view.currentAction.deckReorder.cards.length, 4);
  assert.equal(query(`SELECT json_array_length(deck_json) FROM rooms WHERE code=${quote(game.code)}`), "0");
  assert.equal(query(`SELECT json_array_length(discard_json) FROM rooms WHERE code=${quote(game.code)}`), "0");
});

async function targetGame() {
  const game = await createHumanSetupGame();
  const [source, target, other, fourth] = game.views[0].players;
  setHeroes(game.views[0], ["guan-yu", "zhuge-liang", "zhao-yun", "xiahou-dun"]);
  [source, target, other, fourth].forEach((player) => setHand(player.id, [], 4, 4));
  setTurn(game.code, source.seat, "play");
  return { ...game, room: game.views[0], source, target, sourceToken: game.members[0].token };
}

test("Empty Fortress is live server-side Attack and Duel legality", async () => {
  const game = await targetGame();
  const attack = card("Attack", "empty-attack");
  setHand(game.source.id, [attack], 4, 4);
  const blocked = await request("play_card", { code: game.code, token: game.sourceToken, cardId: attack.id, targetId: game.target.id });
  assert.equal(blocked.status, 409);
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(game.source.id)} AND json_extract(value,'$.id')=${quote(attack.id)}`), "1");

  setHand(game.target.id, [card("Peach", "empty-hand-live")], 4, 4);
  setTurn(game.code, game.source.seat, "play");
  const allowed = await request("play_card", { code: game.code, token: game.sourceToken, cardId: attack.id, targetId: game.target.id });
  assert.equal(allowed.status, 200, JSON.stringify(allowed.data));

  const duelGame = await targetGame();
  const duel = card("Duel", "empty-duel");
  setHand(duelGame.source.id, [duel], 4, 4);
  const duelBlocked = await request("play_card", { code: duelGame.code, token: duelGame.sourceToken, cardId: duel.id, targetId: duelGame.target.id });
  assert.equal(duelBlocked.status, 409);
  setHand(duelGame.target.id, [card("Peach", "duel-live")], 4, 4);
  setTurn(duelGame.code, duelGame.source.seat, "play");
  const duelAllowed = await request("play_card", { code: duelGame.code, token: duelGame.sourceToken, cardId: duel.id, targetId: duelGame.target.id });
  assert.equal(duelAllowed.status, 200, JSON.stringify(duelAllowed.data));

  const staleGame = await targetGame();
  const staleAttack = card("Attack", "empty-stale");
  setHand(staleGame.source.id, [staleAttack], 4, 4);
  setHand(staleGame.target.id, [card("Peach", "stale-live")], 4, 4);
  setTurn(staleGame.code, staleGame.source.seat, "play");
  await state(staleGame.code, staleGame.sourceToken);
  setHand(staleGame.target.id, [], 4, 4);
  const staleBlocked = await request("play_card", { code: staleGame.code, token: staleGame.sourceToken, cardId: staleAttack.id, targetId: staleGame.target.id });
  assert.equal(staleBlocked.status, 409);
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(staleGame.source.id)} AND json_extract(value,'$.id')=${quote(staleAttack.id)}`), "1");
});

test("Empty Fortress covers Guan Yu, Zhao Yun, Serpent Spear, and Halberd target selection", async () => {
  const game = await targetGame();
  const redPeach = { ...card("Peach", "wusheng-empty", "♥") };
  setHeroes(game.room, ["guan-yu", "zhuge-liang", "zhao-yun", "xiahou-dun"]);
  setHand(game.source.id, [redPeach], 4, 4);
  const guan = await request("play_card", { code: game.code, token: game.sourceToken, cardId: redPeach.id, playAs: "attack", targetId: game.target.id });
  assert.equal(guan.status, 409);

  setTurn(game.code, game.source.seat, "play");
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(game.source.id)}`);
  const dodge = card("Dodge", "longdan-empty", "♠");
  setHand(game.source.id, [dodge], 4, 4);
  const zhao = await request("play_card", { code: game.code, token: game.sourceToken, cardId: dodge.id, playAs: "attack", targetId: game.target.id });
  assert.equal(zhao.status, 409);

  setTurn(game.code, game.source.seat, "play");
  sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(game.source.id)}`);
  const spear = { kind: "SerpentSpear", id: "serpent-empty", suit: "♠", rank: "K" };
  setEquipment(game.source.id, { weapon: spear });
  const materials = [card("Peach", "spear-empty-a", "♥"), card("Dodge", "spear-empty-b", "♠")];
  setHand(game.source.id, materials, 4, 4);
  const spearResult = await request("serpent_spear_attack", { code: game.code, token: game.sourceToken, cardIds: materials.map((item) => item.id), targetId: game.target.id });
  assert.equal(spearResult.status, 409);

  setTurn(game.code, game.source.seat, "play");
  setEquipment(game.source.id, { weapon: { kind: "SkyPiercingHalberd", id: "halberd-empty", suit: "♠", rank: "K" } });
  const halberdAttack = card("Attack", "halberd-empty-attack");
  setHand(game.source.id, [halberdAttack], 4, 4);
  const halberdBlocked = await request("play_card", { code: game.code, token: game.sourceToken, cardId: halberdAttack.id, targetIds: [game.target.id, game.room.players[2].id] });
  assert.equal(halberdBlocked.status, 409);
  setHand(game.target.id, [card("Peach", "halberd-live")], 4, 4);
  setTurn(game.code, game.source.seat, "play");
  const halberdAllowed = await request("play_card", { code: game.code, token: game.sourceToken, cardId: halberdAttack.id, targetIds: [game.target.id, game.room.players[2].id] });
  assert.equal(halberdAllowed.status, 200, JSON.stringify(halberdAllowed.data));
});

test("Empty Fortress rejects a Borrowed Sword target before the forced Attack begins", async () => {
  const scenario = await openBorrowedSwordScenario({ choose: false });
  setHeroes(scenario.game.room, ["guan-yu", "zhao-yun", "zhuge-liang", "xiahou-dun"]);
  const blocked = await request("choose_borrowed_sword_target", { code: scenario.game.code, token: scenario.host.token, targetId: scenario.target.id });
  assert.equal(blocked.status, 400);
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(scenario.holder.id)} AND json_extract(value,'$.id')=${quote(scenario.attackId)}`), "1");
});

test("Liu Bei Influencing excludes empty-handed Zhuge Liang from Attack targets", async () => {
  const game = await targetGame();
  sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(game.source.id)}`);
  sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(game.room.players[2].id)}`);
  setTurn(game.code, game.source.seat, "play");
  const view = (await state(game.code, game.sourceToken)).data;
  const option = view.currentAction.triggerOptions.find((candidate) => candidate.effectId === "liu_bei_jijiang");
  assert.ok(option, JSON.stringify(view.currentAction));
  assert.equal(option.selection.targetIds.includes(game.target.id), false);
});
