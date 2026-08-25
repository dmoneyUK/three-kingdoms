import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const baseUrl = process.env.GAME_TEST_URL ?? "http://localhost:3137";
const d1Directory = new URL("../.wrangler/state/v3/d1/miniflare-D1DatabaseObject/", import.meta.url);

async function request(action, values = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${baseUrl}/api/rooms`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...values }) });
    const text = await response.text();
    if (text) return { status: response.status, data: JSON.parse(text) };
    if (response.status !== 500 || attempt === 2) assert.fail(`${action} returned an empty ${response.status} response`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`${action} did not return a response`);
}

async function state(code, token, audit = false) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${baseUrl}/api/rooms?code=${code}&token=${token}${audit ? "&audit=1" : ""}`);
    const text = await response.text();
    if (text) return { status: response.status, data: JSON.parse(text) };
    if (response.status !== 500 || attempt === 2) assert.fail(`room state returned an empty ${response.status} response`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("room state did not return a response");
}

async function waitForState(code, token, predicate) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = await state(code, token);
    if (predicate(result.data)) return result.data;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail("room state did not reach the expected condition");
}

function databasePath() {
  const file = readdirSync(d1Directory).find((name) => name.endsWith(".sqlite") && basename(name) !== "metadata.sqlite");
  assert.ok(file, "local D1 database was created");
  return join(d1Directory.pathname, file);
}
function sql(statement) { const result = spawnSync("sqlite3", [databasePath(), statement], { encoding: "utf8" }); assert.equal(result.status, 0, result.stderr); }
function query(statement) { const result = spawnSync("sqlite3", [databasePath(), statement], { encoding: "utf8" }); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); }
function quote(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function card(kind, suffix) { return { id: `${kind.toLowerCase()}-${suffix}`, kind, suit: "♠", rank: "A" }; }
function setHand(playerId, cards, hp, maxHp = hp) { sql(`UPDATE players SET hand_json=${quote(JSON.stringify(cards))}, hp=${hp}, max_hp=${maxHp}, alive=1 WHERE id=${quote(playerId)}`); }
function setTurn(roomCode, seat, phase = "play") { sql(`UPDATE rooms SET turn_seat=${seat}, phase=${quote(phase)}, pending_json=NULL, status='playing' WHERE code=${quote(roomCode)}`); }

async function createHumanGame() {
  const created = await request("create", { name: "Host" });
  assert.equal(created.status, 201);
  const code = created.data.room.code;
  const members = [{ name: "Host", token: created.data.token }];
  for (const name of ["Alice", "Bob", "Carol"]) { const joined = await request("join", { code, name }); assert.equal(joined.status, 201); members.push({ name, token: joined.data.token }); }
  assert.equal((await request("start", { code, token: members[0].token, name: "Host" })).status, 200);
  for (const member of members) { const before = await state(code, member.token); assert.equal((await request("choose_hero", { code, token: member.token, heroId: before.data.myHeroOptions[0].id })).status, 200); }
  return { code, members, room: (await state(code, members[0].token)).data };
}

test("complete room, turn, card, response, discard, bot, and audit flow", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice, bob, carol] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host");
  const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  const bobPlayer = game.room.players.find((player) => player.name === "Bob");
  const carolPlayer = game.room.players.find((player) => player.name === "Carol");
  assert.ok(hostPlayer && alicePlayer && bobPlayer && carolPlayer);
  assert.equal(game.room.status, "playing"); assert.equal(game.room.phase, "draw"); assert.equal(game.room.isMyTurn, true); assert.equal(game.room.myHand.length, 4); assert.equal(game.room.myRole, "Lord");
  const deckComposition = query(`WITH cards(kind) AS (SELECT json_extract(value,'$.kind') FROM rooms,json_each(rooms.deck_json) WHERE rooms.code=${quote(game.code)} UNION ALL SELECT json_extract(value,'$.kind') FROM players,json_each(players.hand_json) WHERE players.room_id=(SELECT id FROM rooms WHERE code=${quote(game.code)})) SELECT kind||':'||COUNT(*) FROM cards GROUP BY kind ORDER BY kind`).split("\n");
  assert.deepEqual(deckComposition, ["Attack:30", "BarbarianInvasion:3", "Dismantle:6", "Dodge:15", "DrawTwo:4", "Duel:3", "Oath:1", "Peach:8", "RainingArrows:1", "Steal:5"]);
  assert.ok(game.room.players.filter((player) => player.role !== null).every((player) => player.name === "Host"));
  const aliceView = await state(game.code, alice.token);
  assert.equal(aliceView.data.players.find((player) => player.name === "Host").role, "Lord");
  assert.ok(aliceView.data.players.find((player) => player.name === "Alice").role);
  assert.equal(aliceView.data.players.find((player) => player.name === "Bob").role, null);

  assert.equal((await request("draw", { code: game.code, token: alice.token })).status, 409);
  const draw = await request("draw", { code: game.code, token: host.token });
  assert.equal(draw.status, 200); assert.equal(draw.data.drawnCards.length, 2); assert.equal(draw.data.room.myHand.length, 6); assert.equal(draw.data.room.phase, "play");
  assert.equal((await request("draw", { code: game.code, token: host.token })).status, 409);

  setHand(hostPlayer.id, [card("Attack", "range")], 4, 5); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "attack-range", targetId: bobPlayer.id })).status, 409);

  setHand(hostPlayer.id, [card("Attack", "dodge")], 4, 5); setHand(alicePlayer.id, [card("Dodge", "answer")], 4); setTurn(game.code, hostPlayer.seat);
  const attacked = await request("play_card", { code: game.code, token: host.token, cardId: "attack-dodge", targetId: alicePlayer.id });
  assert.equal(attacked.status, 200); assert.equal(attacked.data.room.phase, "response"); assert.equal(attacked.data.room.actionPlayerId, alicePlayer.id);
  assert.equal((await request("respond_dodge", { code: game.code, token: bob.token, cardId: "dodge-answer" })).status, 409);
  const dodged = await request("respond_dodge", { code: game.code, token: alice.token, cardId: "dodge-answer" });
  assert.equal(dodged.status, 200); assert.equal(dodged.data.room.phase, "play-struck"); assert.equal(dodged.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

  setHand(hostPlayer.id, [card("Attack", "damage")], 4, 5); setHand(alicePlayer.id, [], 4); setTurn(game.code, hostPlayer.seat);
  const damaged = await request("play_card", { code: game.code, token: host.token, cardId: "attack-damage", targetId: alicePlayer.id });
  assert.equal(damaged.status, 200); assert.equal(damaged.data.room.phase, "play-struck"); assert.equal(damaged.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3);

  setHand(hostPlayer.id, [card("Peach", "heal")], 3, 5); setTurn(game.code, hostPlayer.seat);
  const healed = await request("play_card", { code: game.code, token: host.token, cardId: "peach-heal" });
  assert.equal(healed.status, 200); assert.equal(healed.data.room.players.find((player) => player.id === hostPlayer.id).hp, 4); assert.equal(healed.data.room.myHand.length, 0);

  setHand(hostPlayer.id, [card("Dismantle", "hidden-card")], 4, 5); setHand(bobPlayer.id, [card("Attack", "kept"), card("Dodge", "chosen")], 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "dismantle-hidden-card", targetId: bobPlayer.id, targetCardIndex: 3 })).status, 400);
  const dismantled = await request("play_card", { code: game.code, token: host.token, cardId: "dismantle-hidden-card", targetId: bobPlayer.id, targetCardIndex: 1 });
  assert.equal(dismantled.status, 200); assert.equal(dismantled.data.room.phase, "play"); assert.equal(dismantled.data.room.players.find((player) => player.id === bobPlayer.id).handCount, 1); assert.equal(dismantled.data.room.discardTop.id, "dodge-chosen");
  assert.ok(dismantled.data.room.timeline.some((event) => event.type === "card" && event.card.kind === "Dismantle" && event.target === "Bob"));
  assert.ok(dismantled.data.room.timeline.some((event) => event.type === "card" && event.action === "discard" && event.card.id === "dodge-chosen"));

  setHand(hostPlayer.id, [card("Steal", "take-card")], 4, 5); setHand(bobPlayer.id, [card("Attack", "too-far")], 4); setHand(alicePlayer.id, [card("Peach", "prize"), card("Dodge", "left")], 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "steal-take-card", targetId: bobPlayer.id, targetCardIndex: 0 })).status, 409);
  const stolen = await request("play_card", { code: game.code, token: host.token, cardId: "steal-take-card", targetId: alicePlayer.id, targetCardIndex: 0 });
  assert.equal(stolen.status, 200); assert.equal(stolen.data.room.phase, "play"); assert.equal(stolen.data.room.players.find((player) => player.id === alicePlayer.id).handCount, 1);
  assert.ok(stolen.data.room.myHand.some((held) => held.id === "peach-prize")); assert.equal(stolen.data.room.discardTop.id, "steal-take-card");
  assert.ok(stolen.data.room.timeline.some((event) => event.type === "card" && event.card.kind === "Steal" && event.target === "Alice"));
  assert.equal(stolen.data.room.timeline.some((event) => event.type === "card" && event.card.id === "peach-prize"), false, "a stolen hidden hand card stays private");

  setHand(hostPlayer.id, [card("Duel", "challenge"), card("Attack", "host-answer")], 4, 5); setHand(alicePlayer.id, [card("Attack", "alice-answer")], 4); setTurn(game.code, hostPlayer.seat);
  const challenged = await request("play_card", { code: game.code, token: host.token, cardId: "duel-challenge", targetId: alicePlayer.id });
  assert.equal(challenged.status, 200); assert.equal(challenged.data.room.phase, "response"); assert.equal(challenged.data.room.actionPlayerId, alicePlayer.id); assert.equal(challenged.data.room.pendingDuel.opponentId, hostPlayer.id);
  assert.equal((await request("respond_duel", { code: game.code, token: bob.token, cardId: "attack-alice-answer" })).status, 409);
  const aliceAnswers = await request("respond_duel", { code: game.code, token: alice.token, cardId: "attack-alice-answer" });
  assert.equal(aliceAnswers.status, 200); assert.equal(aliceAnswers.data.room.actionPlayerId, hostPlayer.id);
  const hostAnswers = await request("respond_duel", { code: game.code, token: host.token, cardId: "attack-host-answer" });
  assert.equal(hostAnswers.status, 200); assert.equal(hostAnswers.data.room.actionPlayerId, alicePlayer.id);
  const losesDuel = await request("take_duel_damage", { code: game.code, token: alice.token });
  assert.equal(losesDuel.status, 200); assert.equal(losesDuel.data.room.phase, "play"); assert.equal(losesDuel.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3);
  assert.ok(losesDuel.data.room.timeline.some((event) => event.type === "card" && event.card.kind === "Duel" && event.target === "Alice"));
  assert.ok(losesDuel.data.room.timeline.some((event) => /fails to play Attack and takes 1 Duel damage/.test(event.message ?? "")));

  setHand(hostPlayer.id, [card("Oath", "heal-all")], 3, 5); setHand(alicePlayer.id, [], 3, 4); setHand(bobPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  const oath = await request("play_card", { code: game.code, token: host.token, cardId: "oath-heal-all" });
  assert.equal(oath.status, 200); assert.equal(oath.data.room.phase, "play"); assert.equal(oath.data.room.players.find((player) => player.id === hostPlayer.id).hp, 4); assert.equal(oath.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4); assert.equal(oath.data.room.players.find((player) => player.id === bobPlayer.id).hp, 4);
  assert.ok(oath.data.room.timeline.some((event) => event.type === "card" && event.card.kind === "Oath"));
  assert.ok(oath.data.room.timeline.some((event) => /Oath of the Peach Garden/.test(event.message ?? "")));

  setHand(hostPlayer.id, [card("Oath", "full-health")], 5, 5); setHand(alicePlayer.id, [], 4, 4); setHand(bobPlayer.id, [], 4, 4); setHand(carolPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  const harmlessOath = await request("play_card", { code: game.code, token: host.token, cardId: "oath-full-health" });
  assert.equal(harmlessOath.status, 200); assert.equal(harmlessOath.data.room.phase, "play"); assert.equal(harmlessOath.data.room.myHand.length, 0);
  assert.ok(harmlessOath.data.room.timeline.some((event) => event.type === "card" && event.card.id === "oath-full-health"));
  assert.ok(harmlessOath.data.room.timeline.some((event) => /nobody recovers HP/.test(event.message ?? "")));

  setHand(hostPlayer.id, [card("BarbarianInvasion", "global")], 4, 5); setHand(alicePlayer.id, [card("Attack", "barbarian-answer")], 4); setHand(bobPlayer.id, [], 1, 4); setHand(carolPlayer.id, [card("Attack", "barbarian-answer")], 4); setTurn(game.code, hostPlayer.seat);
  const invasion = await request("play_card", { code: game.code, token: host.token, cardId: "barbarianinvasion-global" });
  assert.equal(invasion.status, 200); assert.equal(invasion.data.room.phase, "response"); assert.equal(invasion.data.room.actionPlayerId, alicePlayer.id); assert.equal(invasion.data.room.pendingGroup.requiredKind, "Attack");
  assert.equal((await request("respond_group", { code: game.code, token: bob.token, cardId: "attack-barbarian-answer" })).status, 409);
  const invasionAlice = await request("respond_group", { code: game.code, token: alice.token, cardId: "attack-barbarian-answer" });
  assert.equal(invasionAlice.status, 200); assert.equal(invasionAlice.data.room.actionPlayerId, bobPlayer.id);
  const invasionBob = await request("take_group_damage", { code: game.code, token: bob.token });
  assert.equal(invasionBob.status, 200); assert.equal(invasionBob.data.room.players.find((player) => player.id === bobPlayer.id).alive, false); assert.equal(invasionBob.data.room.actionPlayerId, carolPlayer.id);
  const invasionCarol = await request("respond_group", { code: game.code, token: carol.token, cardId: "attack-barbarian-answer" });
  assert.equal(invasionCarol.status, 200); assert.equal(invasionCarol.data.room.phase, "play"); assert.equal(invasionCarol.data.room.pendingGroup, null);
  assert.ok(invasionCarol.data.room.timeline.some((event) => event.type === "card" && event.card.kind === "BarbarianInvasion"));

  setHand(hostPlayer.id, [card("RainingArrows", "global")], 4, 5); setHand(alicePlayer.id, [card("Dodge", "arrows-answer")], 4); setHand(bobPlayer.id, [card("Dodge", "arrows-answer")], 4); setHand(carolPlayer.id, [card("Dodge", "arrows-answer")], 4); setTurn(game.code, hostPlayer.seat);
  const arrows = await request("play_card", { code: game.code, token: host.token, cardId: "rainingarrows-global" });
  assert.equal(arrows.status, 200); assert.equal(arrows.data.room.actionPlayerId, alicePlayer.id); assert.equal(arrows.data.room.pendingGroup.requiredKind, "Dodge");
  assert.equal((await request("respond_group", { code: game.code, token: alice.token, cardId: "dodge-arrows-answer" })).data.room.actionPlayerId, bobPlayer.id);
  assert.equal((await request("respond_group", { code: game.code, token: bob.token, cardId: "dodge-arrows-answer" })).data.room.actionPlayerId, carolPlayer.id);
  const arrowsFinished = await request("respond_group", { code: game.code, token: carol.token, cardId: "dodge-arrows-answer" });
  assert.equal(arrowsFinished.status, 200); assert.equal(arrowsFinished.data.room.phase, "play"); assert.equal(arrowsFinished.data.room.pendingGroup, null);
  assert.ok(arrowsFinished.data.room.timeline.some((event) => event.type === "card" && event.card.kind === "RainingArrows"));

  const discardHand = Array.from({ length: 6 }, (_, index) => card("Dodge", `discard-${index}`));
  setHand(hostPlayer.id, discardHand, 4, 5); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("end_turn", { code: game.code, token: host.token })).data.room.phase, "discard");
  assert.equal((await request("discard_cards", { code: game.code, token: host.token, cardIds: ["dodge-discard-0"] })).status, 400);
  const discarded = await request("discard_cards", { code: game.code, token: host.token, cardIds: ["dodge-discard-0", "dodge-discard-1"] });
  assert.equal(discarded.status, 200); assert.equal(discarded.data.room.turnSeat, alicePlayer.seat); assert.equal(discarded.data.room.phase, "draw"); assert.equal(discarded.data.room.myHand.length, 4);
  const groupedDiscard = discarded.data.room.timeline.find((entry) => entry.type === "cards" && entry.player === "Host"); assert.equal(groupedDiscard.cards.length, 2);

  setHand(hostPlayer.id, [card("Strike", "dying")], 4, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [], 4); setHand(carolPlayer.id, [], 4); sql(`UPDATE players SET role='Rebel' WHERE id=${quote(alicePlayer.id)}`); setTurn(game.code, hostPlayer.seat);
  const dying = await request("play_card", { code: game.code, token: host.token, cardId: "strike-dying", targetId: alicePlayer.id });
  assert.equal(dying.data.room.phase, "play-struck"); assert.equal(dying.data.room.players.find((player) => player.id === alicePlayer.id).hp, 0);
  assert.equal(dying.data.room.players.find((player) => player.id === alicePlayer.id).alive, false);
  assert.equal(dying.data.room.players.find((player) => player.id === alicePlayer.id).role, "Rebel"); assert.equal(dying.data.room.myHand.length, 3);
  assert.ok(dying.data.room.timeline.some((entry) => /Alice takes 1 damage and enters Dying/.test(entry.message ?? "")));
  assert.ok(dying.data.room.timeline.some((entry) => /Alice receives no Peach and is defeated/.test(entry.message ?? "")));
  assert.ok(dying.data.room.timeline.some((entry) => /Alice's role is revealed: Rebel/.test(entry.message ?? "")));
  assert.ok(dying.data.room.timeline.some((entry) => /defeated Rebel Alice and draws 3 reward cards/.test(entry.message ?? "")));

  setHand(hostPlayer.id, [card("Strike", "attacker-rescue"), card("Peach", "attacker-rescue")], 4, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [], 4); setHand(carolPlayer.id, [], 4); setTurn(game.code, hostPlayer.seat);
  const attackerRescuePrompt = await request("play_card", { code: game.code, token: host.token, cardId: "strike-attacker-rescue", targetId: alicePlayer.id });
  assert.equal(attackerRescuePrompt.data.room.phase, "dying"); assert.equal(attackerRescuePrompt.data.room.actionPlayerId, hostPlayer.id); assert.equal(attackerRescuePrompt.data.room.pendingDying.deadline, 0);
  const timedAttackerPrompt = await request("start_rescue_timer", { code: game.code, token: host.token }); assert.ok(timedAttackerPrompt.data.room.pendingDying.deadline > Date.now());
  assert.equal((await request("give_peach", { code: game.code, token: host.token })).status, 409);
  sql(`UPDATE rooms SET pending_json=json_set(pending_json,'$.deadline',1) WHERE code=${quote(game.code)}`);
  const attackerRescue = await request("give_peach", { code: game.code, token: host.token, cardId: "peach-attacker-rescue" });
  assert.equal(attackerRescue.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.ok(attackerRescue.data.room.timeline.some((entry) => entry.type === "card" && entry.player === "Host" && entry.target === "Alice" && entry.card.kind === "Peach"));

  setHand(hostPlayer.id, [card("Strike", "rescue")], 4, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [card("Peach", "rescue-other")], 4); setHand(carolPlayer.id, [], 4); setTurn(game.code, hostPlayer.seat);
  const rescuePrompt = await request("play_card", { code: game.code, token: host.token, cardId: "strike-rescue", targetId: alicePlayer.id });
  assert.equal(rescuePrompt.data.room.phase, "dying"); assert.equal(rescuePrompt.data.room.actionPlayerId, null); assert.equal(rescuePrompt.data.room.isMyAction, false); assert.match(rescuePrompt.data.room.actionReason, /no rescue action is required/);
  const bobPrivatePrompt = await state(game.code, bob.token); assert.equal(bobPrivatePrompt.data.actionPlayerId, bobPlayer.id); assert.equal(bobPrivatePrompt.data.isMyAction, true); assert.match(bobPrivatePrompt.data.actionReason, /Decide whether to give Peach/);
  const alicePrivateView = await state(game.code, alice.token); assert.equal(alicePrivateView.data.actionPlayerId, null); assert.equal(alicePrivateView.data.pendingDying.deadline, 0);
  const rescued = await request("give_peach", { code: game.code, token: bob.token, cardId: "peach-rescue-other" });
  assert.equal(rescued.status, 200); assert.equal(rescued.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1); assert.equal(rescued.data.room.players.find((player) => player.id === alicePlayer.id).alive, true);
  assert.ok(rescued.data.room.timeline.some((entry) => entry.type === "card" && entry.player === "Bob" && entry.target === "Alice" && entry.card.kind === "Peach"));

  setHand(hostPlayer.id, [card("Strike", "skip-rescue")], 4, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [card("Peach", "declined")], 4); setHand(carolPlayer.id, [], 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "strike-skip-rescue", targetId: alicePlayer.id })).data.room.actionPlayerId, null);
  const skippedRescue = await request("skip_rescue", { code: game.code, token: bob.token });
  assert.equal(skippedRescue.status, 200); assert.equal(skippedRescue.data.room.players.find((player) => player.id === alicePlayer.id).alive, true);
  const skippedRescueSettled = await waitForState(game.code, host.token, (room) => !room.players.find((player) => player.id === alicePlayer.id).alive);
  assert.equal(skippedRescueSettled.players.find((player) => player.id === alicePlayer.id).alive, false);

  setHand(hostPlayer.id, [card("Strike", "timeout-rescue")], 4, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [card("Peach", "timed-out")], 4); setHand(carolPlayer.id, [], 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "strike-timeout-rescue", targetId: alicePlayer.id })).data.room.actionPlayerId, null);
  await request("start_rescue_timer", { code: game.code, token: bob.token }); sql(`UPDATE rooms SET pending_json=json_set(pending_json,'$.deadline',1) WHERE code=${quote(game.code)}`);
  const timedOutRescue = await request("skip_rescue", { code: game.code, token: bob.token });
  assert.equal(timedOutRescue.status, 200); const timedOutSettled = await waitForState(game.code, host.token, (room) => !room.players.find((player) => player.id === alicePlayer.id).alive); assert.equal(timedOutSettled.phase, "play-struck"); assert.equal(timedOutSettled.players.find((player) => player.id === alicePlayer.id).alive, false);
  const repeatedTimeout = await request("skip_rescue", { code: game.code, token: bob.token }); assert.equal(repeatedTimeout.status, 200); assert.equal(repeatedTimeout.data.room.phase, "play-struck");

  const audit = await state(game.code, host.token, true);
  assert.equal(audit.status, 200); assert.ok(audit.data.audit.length > 10); assert.ok(audit.data.audit.some((entry) => entry.action === "draw")); assert.ok(audit.data.audit.some((entry) => entry.phase_after === "response"));
  assert.equal((await state(game.code, "invalid-token", true)).status, 403);

  const botCreated = await request("create", { name: "Bot Host" }); const botCode = botCreated.data.room.code; const botToken = botCreated.data.token;
  const botsAdded = await request("add_test_players", { code: botCode, token: botToken });
  assert.deepEqual(botsAdded.data.room.players.map((player) => player.name), ["Bot Host", "Player 1", "Player 2", "Player 3"]);
  assert.deepEqual(botsAdded.data.room.players.map((player) => player.isBot), [false, true, true, true]);
  assert.equal((await request("start", { code: botCode, token: alice.token, name: "Alice" })).status, 403);
  const botStart = await request("start", { code: botCode, token: botToken, name: "Bot Host" });
  const botReady = await request("choose_hero", { code: botCode, token: botToken, heroId: botStart.data.room.myHeroOptions[0].id });
  assert.equal(botReady.data.room.phase, "draw");
  const botDraw = await request("draw", { code: botCode, token: botToken }); assert.equal(botDraw.data.drawnCards.length, 2);
  const botHostPlayer = botDraw.data.room.players.find((player) => player.name === "Bot Host");
  setHand(botHostPlayer.id, [], botHostPlayer.hp, botHostPlayer.maxHp); setTurn(botCode, botHostPlayer.seat);
  sql(`UPDATE players SET hand_json='[]' WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(botCode)}) AND token_hash LIKE 'bot:%'`);
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(Array.from({ length: 6 }, (_, index) => card("Dodge", `bot-draw-${index}`))))}, discard_json='[]' WHERE code=${quote(botCode)}`);
  const botsPlayed = await request("end_turn", { code: botCode, token: botToken });
  assert.equal(botsPlayed.status, 200); assert.notEqual(botsPlayed.data.room.turnSeat, botHostPlayer.seat); assert.equal(botsPlayed.data.room.phase, "draw");
  const botsSettled = await waitForState(botCode, botToken, (room) => room.turnSeat === botHostPlayer.seat && room.phase === "draw");
  assert.ok(botsSettled.timeline.some((entry) => /Player [123]/.test(entry.message ?? entry.player ?? "")));
  assert.ok(botsSettled.timeline.some((entry) => /Player 1's turn started · drawing 2 cards/.test(entry.message ?? "")));
  const playerOne = botsSettled.players.find((player) => player.name === "Player 1"); const playerTwo = botsSettled.players.find((player) => player.name === "Player 2"); const playerThree = botsSettled.players.find((player) => player.name === "Player 3");

  setHand(botHostPlayer.id, [card("Dodge", "round-return")], 1, botHostPlayer.maxHp); setHand(playerOne.id, [], 4, 4); setHand(playerTwo.id, [], 4, 4); setHand(playerThree.id, [card("Attack", "round-return")], 4, 4); setTurn(botCode, botHostPlayer.seat);
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(Array.from({ length: 12 }, (_, index) => card("Dodge", `round-return-draw-${index}`))))}, discard_json='[]' WHERE code=${quote(botCode)}`);
  const playerThreeAttack = await request("end_turn", { code: botCode, token: botToken });
  assert.equal(playerThreeAttack.status, 200);
  const waitingForMe = await waitForState(botCode, botToken, (room) => room.phase === "response" && room.actionPlayerId === botHostPlayer.id);
  assert.equal(waitingForMe.turnSeat, playerThree.seat); assert.equal(waitingForMe.pendingAttack.sourceId, playerThree.id);
  const returnedToMe = await request("respond_dodge", { code: botCode, token: botToken, cardId: "dodge-round-return" });
  assert.equal(returnedToMe.status, 200); assert.equal(returnedToMe.data.room.turnSeat, botHostPlayer.seat); assert.equal(returnedToMe.data.room.phase, "draw"); assert.equal(returnedToMe.data.room.isMyTurn, true);

  setHand(botHostPlayer.id, [card("Strike", "rescue-bot")], botHostPlayer.hp, botHostPlayer.maxHp); setHand(playerOne.id, [], 1, playerOne.maxHp); setHand(playerTwo.id, [card("Peach", "bot-saviour")], playerTwo.hp, playerTwo.maxHp); setHand(playerThree.id, [], playerThree.hp, playerThree.maxHp); setTurn(botCode, botHostPlayer.seat);
  const rescuedBot = await request("play_card", { code: botCode, token: botToken, cardId: "strike-rescue-bot", targetId: playerOne.id });
  assert.equal(rescuedBot.data.room.players.find((player) => player.id === playerOne.id).alive, true); assert.equal(rescuedBot.data.room.players.find((player) => player.id === playerOne.id).hp, 1);
  assert.ok(rescuedBot.data.room.timeline.some((entry) => entry.type === "card" && entry.player === "Player 2" && entry.target === "Player 1" && entry.card.kind === "Peach"));
  setHand(botHostPlayer.id, [card("BarbarianInvasion", "bots")], botHostPlayer.hp, botHostPlayer.maxHp); setHand(playerOne.id, [card("Attack", "bot-group-1")], 2, 2); setHand(playerTwo.id, [], 2, 2); setHand(playerThree.id, [card("Attack", "bot-group-3")], 2, 2); setTurn(botCode, botHostPlayer.seat);
  const botInvasion = await request("play_card", { code: botCode, token: botToken, cardId: "barbarianinvasion-bots" });
  assert.equal(botInvasion.status, 200); assert.equal(botInvasion.data.room.phase, "play"); assert.equal(botInvasion.data.room.pendingGroup, null); assert.equal(botInvasion.data.room.players.find((player) => player.id === playerTwo.id).hp, 1);
  assert.ok(botInvasion.data.room.timeline.some((entry) => entry.type === "card" && entry.player === "Player 1" && entry.card.kind === "Attack"));
  assert.ok(botInvasion.data.room.timeline.some((entry) => /Player 2 does not play Attack and takes 1 damage from Barbarian Invasion/.test(entry.message ?? "")));
  assert.equal((await state(game.code, host.token, true)).data.audit.length, 0);
  assert.ok((await state(botCode, botToken, true)).data.audit.length > 0);

  const quick = await request("create", { quickStart: true });
  assert.equal(quick.status, 201); assert.equal(quick.data.room.status, "playing"); assert.equal(quick.data.room.phase, "draw"); assert.equal(quick.data.room.isMyTurn, true); assert.equal(quick.data.room.myRole, "Lord");
  assert.deepEqual(quick.data.room.players.map((player) => player.name), ["ME", "Player 1", "Player 2", "Player 3"]);
  assert.deepEqual(quick.data.room.players.map((player) => player.isBot), [false, true, true, true]);
  assert.ok(quick.data.room.players.every((player) => player.hero)); assert.equal(new Set(quick.data.room.players.map((player) => player.hero)).size, 4);
  assert.equal(quick.data.room.players.find((player) => player.name === "ME").hero, "zhang-fei");
  assert.ok(quick.data.room.players.filter((player) => player.isBot).every((player) => player.hp === 1 && player.maxHp === 1));
  assert.equal(quick.data.room.myHand.length, 10);
  assert.deepEqual(new Set(quick.data.room.myHand.map((openingCard) => openingCard.kind)), new Set(["Attack", "Dodge", "Peach", "DrawTwo", "Dismantle", "Steal", "Duel", "Oath", "BarbarianInvasion", "RainingArrows"]), "ME starts every test game with one of each implemented card");
  assert.equal((await state(botCode, botToken, true)).data.audit.length, 0);
  assert.ok((await state(quick.data.room.code, quick.data.token, true)).data.audit.length > 0);
  const quickDraw = await request("draw", { code: quick.data.room.code, token: quick.data.token });
  assert.equal(quickDraw.status, 200); assert.equal(quickDraw.data.drawnCards.length, 2); assert.equal(quickDraw.data.room.phase, "play"); assert.equal(quickDraw.data.room.myHand.length, 12);
  const quickMe = quickDraw.data.room.players.find((player) => player.name === "ME"); const quickPlayerOne = quickDraw.data.room.players.find((player) => player.name === "Player 1");
  setHand(quickMe.id, [card("Strike", "zhang-fei-1"), card("Strike", "zhang-fei-2")], quickMe.hp, quickMe.maxHp); setHand(quickPlayerOne.id, [card("Dodge", "zhang-fei-1"), card("Dodge", "zhang-fei-2")], 1, 1); setTurn(quick.data.room.code, quickMe.seat);
  assert.equal((await request("play_card", { code: quick.data.room.code, token: quick.data.token, cardId: "strike-zhang-fei-1", targetId: quickPlayerOne.id })).data.room.phase, "play");
  assert.equal((await request("play_card", { code: quick.data.room.code, token: quick.data.token, cardId: "strike-zhang-fei-2", targetId: quickPlayerOne.id })).data.room.phase, "play");
});

test("Something Out of Nothing preserves Play Phase and reveals the stratagem without exposing drawn cards", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const host = game.members[0];
  const hostPlayer = game.room.players.find((player) => player.name === "Host");
  assert.ok(hostPlayer);
  setHand(hostPlayer.id, [card("DrawTwo", "tactic")], 4, 5);
  setTurn(game.code, hostPlayer.seat);
  const recycledCards = [card("Strike", "recycled-1"), card("Dodge", "recycled-2")];
  sql(`UPDATE rooms SET deck_json='[]', discard_json=${quote(JSON.stringify(recycledCards))} WHERE code=${quote(game.code)}`);

  const result = await request("play_card", { code: game.code, token: host.token, cardId: "drawtwo-tactic" });
  assert.equal(result.status, 200);
  assert.equal(result.data.room.phase, "play");
  assert.equal(result.data.drawnCards.length, 2);
  assert.equal(result.data.room.myHand.length, 2);
  assert.equal(result.data.room.discardTop.kind, "DrawTwo");
  assert.deepEqual(new Set(result.data.drawnCards.map((drawn) => drawn.id)), new Set(recycledCards.map((recycled) => recycled.id)));
  assert.equal(result.data.drawnCards.some((drawn) => drawn.id === "drawtwo-tactic"), false);
  const publicPlay = result.data.room.timeline.find((event) => event.type === "card" && event.card.kind === "DrawTwo");
  assert.equal(publicPlay.player, "Host");
  assert.equal(publicPlay.target, "Host");
  const drawHistory = result.data.room.timeline.find((event) => /plays Something Out of Nothing and draws 2 cards/.test(event.message ?? ""));
  assert.equal(drawHistory.presentation, false);
  const opponentView = await state(game.code, game.members[1].token);
  assert.equal(opponentView.data.players.find((player) => player.id === hostPlayer.id).handCount, 2);
  assert.equal(opponentView.data.myHand.some((held) => result.data.drawnCards.some((drawn) => drawn.id === held.id)), false);
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
      const drawn = await request("draw", { code: game.code, token: current.member.token });
      assert.equal(drawn.status, 200); assert.equal(drawn.data.room.phase, "play"); assert.equal(drawn.data.drawnCards.length, 2);
      assert.equal((await request("draw", { code: game.code, token: current.member.token })).status, 409, "a player cannot draw twice");
      assert.equal((await request("end_turn", { code: game.code, token: next.member.token })).status, 409, "the next player cannot act early");
      const ended = await request("end_turn", { code: game.code, token: current.member.token });
      assert.equal(ended.status, 200); assert.equal(ended.data.room.turnSeat, next.player.seat); assert.equal(ended.data.room.phase, "draw");
    }
  }

  const [, playerOne, defeated, playerThree] = membersBySeat;
  sql(`UPDATE players SET alive=0, hp=0 WHERE id=${quote(defeated.player.id)}`);
  for (const { player } of membersBySeat) if (player.id !== defeated.player.id) setHand(player.id, [], 10, 10);
  setTurn(game.code, playerOne.player.seat, "play");
  const skipped = await request("end_turn", { code: game.code, token: playerOne.member.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.turnSeat, playerThree.player.seat); assert.equal(skipped.data.room.phase, "draw");
  assert.equal((await request("draw", { code: game.code, token: defeated.member.token })).status, 409, "a defeated player cannot act");

  setTurn(game.code, defeated.player.seat, "draw");
  const invalidState = await request("draw", { code: game.code, token: defeated.member.token });
  assert.equal(invalidState.status, 409); assert.match(invalidState.data.error, /Game state check failed: The active turn does not belong to a living player/);
});
