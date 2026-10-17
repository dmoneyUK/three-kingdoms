import test from "node:test";
import {
  assert, card, createHumanGame, query, quote, request, roomCardCount, setDeck, setHand, setTurn, sql, state,
} from "./test-support.mjs";

function configure(game, hp = 4) {
  const [source, rescuer, third, fourth] = game.room.players;
  sql(`UPDATE players SET hero='huang-gai' WHERE id=${quote(source.id)}`);
  for (const player of [rescuer, third, fourth]) sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(player.id)}`);
  for (const player of [source, rescuer, third, fourth]) setHand(player.id, [], player.id === source.id ? hp : 4, 4);
  setTurn(game.code, source.seat, "play");
  return { source, rescuer, third, fourth, sourceMember: game.members[0], rescuerMember: game.members[1] };
}

async function activate(game, setup) {
  const result = await request("trigger", { code: game.code, token: setup.sourceMember.token, providerId: "huang_gai_kurou" });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  return result;
}

test("Self Sacrifice loses 1 HP before drawing when Huang Gai survives", async () => {
  const game = await createHumanGame();
  const setup = configure(game, 2);
  const drawn = [card("Dodge", "huang-safe-a"), card("Peach", "huang-safe-b")];
  setDeck(game.code, drawn);

  const result = await activate(game, setup);
  assert.equal(result.data.room.players.find((player) => player.id === setup.source.id).hp, 1);
  assert.deepEqual(result.data.room.myHand.map((item) => item.id), drawn.map((item) => item.id));
  assert.equal(result.data.room.phase, "play");
  assert.equal(roomCardCount(game.code, drawn[0].id), 1);
  assert.equal(roomCardCount(game.code, drawn[1].id), 1);
});

test("1 HP Self Sacrifice opens Dying before either draw card is available", async () => {
  const game = await createHumanGame();
  const setup = configure(game, 1);
  const drawn = [card("Dodge", "huang-dying-a"), card("Peach", "huang-dying-b")];
  setHand(setup.rescuer.id, [card("Peach", "huang-dying-rescue")], 5, 4);
  setDeck(game.code, drawn);

  const result = await activate(game, setup);
  const source = result.data.room.players.find((player) => player.id === setup.source.id);
  assert.equal(result.data.room.phase, "dying");
  assert.equal(result.data.room.pendingDying.targetId, setup.source.id);
  assert.equal(source.hp, 0);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(setup.source.id)}`)), []);
  assert.deepEqual(JSON.parse(query(`SELECT deck_json FROM rooms WHERE code=${quote(game.code)}`)).map((item) => item.id), drawn.map((item) => item.id));
  assert.equal(result.data.room.log.some((entry) => /damage_suffered|suffered damage/i.test(entry)), false);
});

test("1 HP Self Sacrifice resumes after Peach rescue and draws exactly once", async () => {
  const game = await createHumanGame();
  const setup = configure(game, 1);
  const peach = card("Peach", "huang-peach-rescue", "♥");
  const drawn = [card("Dodge", "huang-peach-draw-a"), card("Peach", "huang-peach-draw-b")];
  setHand(setup.rescuer.id, [peach], 4, 4);
  setDeck(game.code, drawn);
  await activate(game, setup);
  const duringDying = await state(game.code, setup.sourceMember.token);
  assert.equal(duringDying.data.phase, "dying");
  assert.equal(duringDying.data.pendingDying.targetId, setup.source.id);
  assert.equal(JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`)).resumeEffect.kind, "draw_cards", "the draw continuation survives room reload");
  assert.equal((await request("skip_rescue", { code: game.code, token: setup.sourceMember.token })).status, 200);

  const rescues = await Promise.all([
    request("give_peach", { code: game.code, token: setup.rescuerMember.token, cardId: peach.id }),
    request("give_peach", { code: game.code, token: setup.rescuerMember.token, cardId: peach.id }),
  ]);
  assert.deepEqual(rescues.map((result) => result.status).sort(), [200, 409]);
  const after = (await state(game.code, setup.sourceMember.token)).data;
  assert.equal(after.phase, "play");
  assert.equal(after.players.find((player) => player.id === setup.source.id).hp, 1);
  assert.deepEqual(after.myHand.map((item) => item.id), drawn.map((item) => item.id));
  assert.equal(roomCardCount(game.code, drawn[0].id), 1);
  assert.equal(roomCardCount(game.code, drawn[1].id), 1);
  assert.equal(roomCardCount(game.code, peach.id), 1);
});

test("1 HP Self Sacrifice accepts First Aid rescue before drawing", async () => {
  const game = await createHumanGame();
  const setup = configure(game, 1);
  const redCard = card("Attack", "huang-first-aid", "♥");
  const drawn = [card("Dodge", "huang-first-draw-a"), card("Peach", "huang-first-draw-b")];
  sql(`UPDATE players SET hero='hua-tuo' WHERE id=${quote(setup.rescuer.id)}`);
  setHand(setup.rescuer.id, [redCard], 3, 3);
  setDeck(game.code, drawn);
  await activate(game, setup);
  assert.equal((await request("skip_rescue", { code: game.code, token: setup.sourceMember.token })).status, 200);
  const rescueView = (await state(game.code, setup.rescuerMember.token)).data;
  assert.ok(rescueView.currentAction.options.some((option) => option.providerId === "hua_tuo_first_aid"));
  const rescued = await request("respond", { code: game.code, token: setup.rescuerMember.token, providerId: "hua_tuo_first_aid", cardId: redCard.id });
  assert.equal(rescued.status, 200, JSON.stringify(rescued.data));
  const after = (await state(game.code, setup.sourceMember.token)).data;
  assert.equal(after.phase, "play");
  assert.deepEqual(after.myHand.map((item) => item.id), drawn.map((item) => item.id));
  assert.equal(roomCardCount(game.code, redCard.id), 1);
});

test("failed 1 HP Self Sacrifice rescue defeats Huang Gai without drawing", async () => {
  const game = await createHumanGame();
  const setup = configure(game, 1);
  const drawn = [card("Dodge", "huang-failed-draw-a"), card("Peach", "huang-failed-draw-b")];
  setDeck(game.code, drawn);
  await activate(game, setup);
  await request("skip_rescue", { code: game.code, token: setup.sourceMember.token });
  await request("skip_rescue", { code: game.code, token: setup.rescuerMember.token });
  await request("skip_rescue", { code: game.code, token: game.members[2].token });
  const failed = await request("skip_rescue", { code: game.code, token: game.members[3].token });
  assert.equal(failed.status, 200, JSON.stringify(failed.data));
  const after = (await state(game.code, setup.rescuerMember.token)).data;
  assert.equal(after.players.find((player) => player.id === setup.source.id).alive, false);
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(setup.source.id)}`)).length, 0);
  assert.deepEqual(JSON.parse(query(`SELECT deck_json FROM rooms WHERE code=${quote(game.code)}`)).map((item) => item.id), drawn.map((item) => item.id));
  assert.equal(roomCardCount(game.code, drawn[0].id), 1);
  assert.equal(roomCardCount(game.code, drawn[1].id), 1);
});

test("Self Sacrifice draws through the canonical refill boundary and preserves physical cards", async () => {
  const game = await createHumanGame();
  const setup = configure(game, 2);
  const first = card("Dodge", "huang-refill-deck");
  const second = card("Peach", "huang-refill-discard");
  setDeck(game.code, [first]);
  sql(`UPDATE rooms SET discard_json=${quote(JSON.stringify([second]))} WHERE code=${quote(game.code)}`);
  const result = await activate(game, setup);
  assert.equal(result.data.room.phase, "play");
  assert.deepEqual(result.data.room.myHand.map((item) => item.id), [first.id, second.id]);
  assert.equal(roomCardCount(game.code, first.id), 1);
  assert.equal(roomCardCount(game.code, second.id), 1);
  assert.equal(roomCardCount(game.code, first.id), 1);
});
