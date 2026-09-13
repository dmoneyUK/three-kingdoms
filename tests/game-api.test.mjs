import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const baseUrl = process.env.GAME_TEST_URL ?? "http://localhost:3137";
const d1Directory = new URL("../.wrangler/test-state/v3/d1/miniflare-D1DatabaseObject/", import.meta.url);

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

async function takeDamageIfPending(code, token) {
  const current = await state(code, token);
  if (current.data.pendingAttack && current.data.actionPlayerId === current.data.meId) return request("take_damage", { code, token });
  return { status: 200, data: { room: current.data } };
}

async function waitForState(code, token, predicate) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const result = await state(code, token);
    if (predicate(result.data)) return result.data;
    // Production GETs are intentionally read-only. Tests that model a live
    // client therefore submit the explicit timer transition once a published
    // deadline has elapsed, instead of relying on a polling side effect.
    const pendingJson = query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`);
    const pending = pendingJson ? JSON.parse(pendingJson) : null;
    const deadline = pending?.completeAt ?? pending?.botAdvanceAt ?? pending?.deadline ?? 0;
    if (deadline > 0 && deadline <= Date.now()) await request("advance_timers", { code, token });
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail("room state did not reach the expected condition");
}

function databasePath() {
  const file = readdirSync(d1Directory).find((name) => name.endsWith(".sqlite") && basename(name) !== "metadata.sqlite");
  assert.ok(file, "local D1 database was created");
  return join(d1Directory.pathname, file);
}
function sql(statement) { const result = spawnSync("sqlite3", ["-cmd", ".timeout 5000", databasePath(), statement], { encoding: "utf8" }); assert.equal(result.status, 0, result.stderr); }
function query(statement) { const result = spawnSync("sqlite3", ["-cmd", ".timeout 5000", databasePath(), statement], { encoding: "utf8" }); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); }
function quote(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function card(kind, suffix) { return { id: `${kind.toLowerCase()}-${suffix}`, kind, suit: "♠", rank: "A" }; }
function setHand(playerId, cards, hp, maxHp = hp) { sql(`UPDATE players SET hand_json=${quote(JSON.stringify(cards))}, hp=${hp}, max_hp=${maxHp}, alive=1 WHERE id=${quote(playerId)}`); }
function setJudgement(playerId, cards) { sql(`UPDATE players SET judgement_json=${quote(JSON.stringify(cards))} WHERE id=${quote(playerId)}`); }
function setEquipment(playerId, equipment = {}) { sql(`UPDATE players SET equipment_json=${quote(JSON.stringify(equipment))} WHERE id=${quote(playerId)}`); }
function setDeck(roomCode, cards) { sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(cards))}, discard_json='[]' WHERE code=${quote(roomCode)}`); }
function setTurn(roomCode, seat, phase = "play") { sql(`UPDATE rooms SET turn_seat=${seat}, phase=${quote(phase)}, pending_json=NULL, status='playing' WHERE code=${quote(roomCode)}`); }
function discardIds(roomCode) { return query(`SELECT json_extract(value,'$.id') FROM rooms,json_each(rooms.discard_json) WHERE rooms.code=${quote(roomCode)}`).split("\n").filter(Boolean); }

test("room reads are read-only and presence heartbeats are throttled", async () => {
  const created = await request("create", { name: "Presence Host" });
  assert.equal(created.status, 201);
  const { code, meId } = created.data.room;
  const { token } = created.data;
  const beforeRead = query(`SELECT connected_at FROM players WHERE id=${quote(meId)}`);
  assert.equal((await state(code, token)).status, 200);
  assert.equal(query(`SELECT connected_at FROM players WHERE id=${quote(meId)}`), beforeRead, "GET room state must not write presence");
  sql(`UPDATE players SET connected_at=0 WHERE id=${quote(meId)}`);
  assert.equal((await request("heartbeat", { code, token })).status, 200);
  const afterHeartbeat = query(`SELECT connected_at FROM players WHERE id=${quote(meId)}`);
  assert.ok(Number(afterHeartbeat) > 0, "a stale presence timestamp is refreshed");
  assert.equal((await request("heartbeat", { code, token })).status, 200);
  assert.equal(query(`SELECT connected_at FROM players WHERE id=${quote(meId)}`), afterHeartbeat, "a fresh heartbeat does not write again");
});

test("an inactive active room is closed after five minutes without a game event", async () => {
  const created = await request("create", { quickStart: true });
  const { code } = created.data.room;
  const { token } = created.data;
  sql(`UPDATE rooms SET last_activity_at=${Date.now() - 5 * 60_000 - 1} WHERE code=${quote(code)}`);
  const closed = await request("expire_inactive_room", { code, token });
  assert.equal(closed.status, 200);
  assert.equal(closed.data.room.status, "finished");
  assert.equal(closed.data.room.phase, "finished");
  assert.equal(closed.data.room.pending, null);
  assert.ok(closed.data.room.log.some((message) => /five minutes with no game events/.test(message)));
});

async function createHumanGame() {
  const created = await request("create", { name: "Host" });
  assert.equal(created.status, 201);
  const code = created.data.room.code;
  const members = [{ name: "Host", token: created.data.token }];
  for (const name of ["Alice", "Bob", "Carol"]) { const joined = await request("join", { code, name }); assert.equal(joined.status, 201); members.push({ name, token: joined.data.token }); }
  assert.equal((await request("start", { code, token: members[0].token, name: "Host" })).status, 200);
  for (const member of members) { const before = await state(code, member.token); assert.equal((await request("choose_hero", { code, token: member.token, heroId: before.data.myHeroOptions[0].id })).status, 200); }
  const started = (await state(code, members[0].token)).data; const deck = JSON.parse(query(`SELECT deck_json FROM rooms WHERE code=${quote(code)}`) || "[]");
  for (const player of started.players) {
    const hand = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(player.id)}`) || "[]");
    for (let index = 0; index < hand.length; index++) if (hand[index].kind === "Negation") { const replacementIndex = deck.findIndex((held) => held.kind !== "Negation"); const [replacement] = deck.splice(replacementIndex, 1); deck.push(hand[index]); hand[index] = replacement; }
    sql(`UPDATE players SET hand_json=${quote(JSON.stringify(hand))} WHERE id=${quote(player.id)}`);
  }
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(deck))} WHERE code=${quote(code)}`);
  return { code, members, room: (await state(code, members[0].token)).data };
}

test("complete room, turn, card, response, discard, bot, and audit flow", { timeout: 60_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice, bob, carol] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host");
  const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  const bobPlayer = game.room.players.find((player) => player.name === "Bob");
  const carolPlayer = game.room.players.find((player) => player.name === "Carol");
  assert.ok(hostPlayer && alicePlayer && bobPlayer && carolPlayer);
  assert.equal(game.room.status, "playing"); assert.equal(game.room.phase, "draw"); assert.equal(game.room.isMyTurn, true); assert.equal(game.room.myHand.length, 4); assert.equal(game.room.myRole, "Lord");
  const displayedRoles = await Promise.all(game.members.map(async (member) => (await state(game.code, member.token)).data.myRole));
  assert.ok(displayedRoles.includes("Traitor")); assert.ok(!displayedRoles.includes("Renegade"), "the Renegade role is presented as Traitor");
  const deckComposition = query(`WITH cards(kind) AS (SELECT json_extract(value,'$.kind') FROM rooms,json_each(rooms.deck_json) WHERE rooms.code=${quote(game.code)} UNION ALL SELECT json_extract(value,'$.kind') FROM players,json_each(players.hand_json) WHERE players.room_id=(SELECT id FROM rooms WHERE code=${quote(game.code)})) SELECT kind||':'||COUNT(*) FROM cards GROUP BY kind ORDER BY kind`).split("\n");
  assert.deepEqual(deckComposition, ["Attack:30", "BarbarianInvasion:3", "BumperHarvest:2", "Dismantle:6", "Dodge:15", "DrawTwo:4", "Duel:3", "EightTrigrams:2", "FerganaSteed:1", "FrostSword:1", "GreenDragonBlade:1", "HexMark:1", "Lightning:2", "Negation:3", "NioShield:1", "Oath:1", "Overindulgence:2", "Peach:8", "PurpleBay:1", "RainingArrows:1", "RedHare:1", "RockCleavingAxe:1", "SerpentSpear:1", "Shadowrunner:1", "SkyPiercingHalberd:1", "Steal:5", "YellowHoofedFlyingLightning:1", "ZhugeCrossbow:2"]);
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
  assert.equal(attacked.data.room.pendingAttack.deadline, 0, "a human response stays unarmed until its presentation is ready");
  assert.equal((await request("start_response_timer", { code: game.code, token: bob.token })).status, 409, "only the acting player can start their response timer");
  const timedAttack = await request("start_response_timer", { code: game.code, token: alice.token });
  assert.ok(timedAttack.data.room.pendingAttack.deadline - Date.now() > 25_000, "the acting player receives a 30-second visible response deadline");
  const repeatedTimer = await request("start_response_timer", { code: game.code, token: alice.token });
  assert.equal(repeatedTimer.data.room.pendingAttack.deadline, timedAttack.data.room.pendingAttack.deadline, "repeated timer starts must not extend a human response deadline");
  const publicAttackTimer = await state(game.code, host.token);
  assert.equal(publicAttackTimer.data.pendingAttack.deadline, timedAttack.data.room.pendingAttack.deadline, "the table can show the same countdown beside the acting player");
  assert.equal((await request("respond_dodge", { code: game.code, token: bob.token, cardId: "dodge-answer" })).status, 409);
  const dodged = await request("respond_dodge", { code: game.code, token: alice.token, cardId: "dodge-answer", context: { actionRevision: timedAttack.data.room.actionRevision, meId: timedAttack.data.room.meId, phase: timedAttack.data.room.phase, pendingKind: "attack", actorId: timedAttack.data.room.actionPlayerId } });
  assert.equal(dodged.status, 200); assert.equal(dodged.data.room.phase, "play-struck"); assert.equal(dodged.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

  setHand(hostPlayer.id, [card("Attack", "damage")], 4, 5); setHand(alicePlayer.id, [], 4); setTurn(game.code, hostPlayer.seat);
  const damagePrompt = await request("play_card", { code: game.code, token: host.token, cardId: "attack-damage", targetId: alicePlayer.id });
  assert.equal(damagePrompt.status, 200); assert.equal(damagePrompt.data.room.phase, "play-struck"); assert.equal(damagePrompt.data.room.actionPlayerId, hostPlayer.id);
  const damaged = await takeDamageIfPending(game.code, alice.token);
  assert.equal(damaged.status, 200); assert.equal(damaged.data.room.phase, "play-struck"); assert.equal(damaged.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3);

  setHand(hostPlayer.id, [card("Peach", "heal")], 3, 5); setTurn(game.code, hostPlayer.seat);
  const healed = await request("play_card", { code: game.code, token: host.token, cardId: "peach-heal" });
  assert.equal(healed.status, 200); assert.equal(healed.data.room.players.find((player) => player.id === hostPlayer.id).hp, 4); assert.equal(healed.data.room.myHand.length, 0);

  setHand(hostPlayer.id, [card("Dismantle", "hidden-card")], 4, 5); setHand(bobPlayer.id, [card("Attack", "kept"), card("Dodge", "chosen")], 4); setTurn(game.code, hostPlayer.seat);
  const dismantleOpened = await request("play_card", { code: game.code, token: host.token, cardId: "dismantle-hidden-card", targetId: bobPlayer.id });
  assert.equal(dismantleOpened.status, 200); assert.equal(dismantleOpened.data.room.pendingTargetCard.targetId, bobPlayer.id);
  assert.equal((await request("choose_target_card", { code: game.code, token: host.token, targetCardZone: "hand", targetCardIndex: 3 })).status, 400);
  const dismantled = await request("choose_target_card", { code: game.code, token: host.token, targetCardZone: "hand", targetCardIndex: 1 });
  assert.equal(dismantled.status, 200); assert.equal(dismantled.data.room.phase, "play"); assert.equal(dismantled.data.room.players.find((player) => player.id === bobPlayer.id).handCount, 1); assert.equal(dismantled.data.room.discardTop.id, "dodge-chosen");
  assert.ok(dismantled.data.room.timeline.some((event) => event.type === "card" && event.card.kind === "Dismantle" && event.target === "Bob"));
  assert.ok(dismantled.data.room.timeline.some((event) => event.type === "card" && event.action === "discard" && event.card.id === "dodge-chosen"));

  setHand(hostPlayer.id, [card("Steal", "take-card")], 4, 5); setHand(bobPlayer.id, [card("Attack", "too-far")], 4); setHand(alicePlayer.id, [card("Peach", "prize"), card("Dodge", "left")], 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "steal-take-card", targetId: bobPlayer.id, targetCardIndex: 0 })).status, 409);
  const stealOpened = await request("play_card", { code: game.code, token: host.token, cardId: "steal-take-card", targetId: alicePlayer.id });
  assert.equal(stealOpened.status, 200); assert.equal(stealOpened.data.room.pendingTargetCard.cardKind, "Steal");
  const stolen = await request("choose_target_card", { code: game.code, token: host.token, targetCardZone: "hand", targetCardIndex: 0 });
  assert.equal(stolen.status, 200); assert.equal(stolen.data.room.phase, "play"); assert.equal(stolen.data.room.players.find((player) => player.id === alicePlayer.id).handCount, 1);
  assert.ok(stolen.data.room.myHand.some((held) => held.id === "peach-prize")); assert.equal(stolen.data.room.discardTop.id, "steal-take-card");
  assert.ok(stolen.data.room.timeline.some((event) => event.type === "card" && event.card.kind === "Steal" && event.target === "Alice"));
  assert.equal(stolen.data.room.timeline.some((event) => event.type === "card" && event.card.id === "peach-prize"), false, "a stolen hidden hand card stays private");

  setHand(hostPlayer.id, [card("Duel", "challenge"), card("Attack", "host-answer")], 4, 5); setHand(alicePlayer.id, [card("Attack", "alice-answer")], 4); setTurn(game.code, hostPlayer.seat);
  const challenged = await request("play_card", { code: game.code, token: host.token, cardId: "duel-challenge", targetId: alicePlayer.id });
  assert.equal(challenged.status, 200); assert.equal(challenged.data.room.phase, "response"); assert.equal(challenged.data.room.actionPlayerId, alicePlayer.id); assert.equal(challenged.data.room.pendingDuel.opponentId, hostPlayer.id);
  assert.equal((await request("respond_duel", { code: game.code, token: bob.token, cardId: "attack-alice-answer" })).status, 409);
  const aliceAnswers = await request("respond_duel", { code: game.code, token: alice.token, cardId: "attack-alice-answer" });
  assert.equal(aliceAnswers.status, 200); assert.equal(aliceAnswers.data.room.actionPlayerId, hostPlayer.id); assert.equal(aliceAnswers.data.room.pendingDuel.deadline, 0, "a new human Duel responder stays unarmed until the response is visible");
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
  const oathResult = oath.data.room.timeline.find((event) => event.type === "card" && event.card?.kind === "Oath");
  assert.ok(oathResult?.resolutionId, "presentation events carry a separate resolution identity");
  assert.equal(oathResult?.importance, "essential");

  setHand(hostPlayer.id, [card("Oath", "full-health")], 5, 5); setHand(alicePlayer.id, [], 4, 4); setHand(bobPlayer.id, [], 4, 4); setHand(carolPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  const harmlessOath = await request("play_card", { code: game.code, token: host.token, cardId: "oath-full-health" });
  assert.equal(harmlessOath.status, 200); assert.equal(harmlessOath.data.room.phase, "play"); assert.equal(harmlessOath.data.room.myHand.length, 0);
  assert.ok(harmlessOath.data.room.timeline.some((event) => event.type === "card" && event.card.id === "oath-full-health"));
  assert.ok(harmlessOath.data.room.timeline.some((event) => /nobody recovers HP/.test(event.message ?? "")));

  setHand(hostPlayer.id, [card("BumperHarvest", "global-choice")], 5, 5); setHand(alicePlayer.id, [], 4, 4); setHand(bobPlayer.id, [], 4, 4); setHand(carolPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  const harvestCards = [card("Attack", "harvest-host"), card("Dodge", "harvest-alice"), card("Peach", "harvest-bob"), card("Steal", "harvest-carol")];
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(harvestCards))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const harvest = await request("play_card", { code: game.code, token: host.token, cardId: "bumperharvest-global-choice" });
  assert.equal(harvest.status, 200); assert.equal(harvest.data.room.phase, "response"); assert.equal(harvest.data.room.actionPlayerId, hostPlayer.id); assert.equal(harvest.data.room.pendingHarvest.revealed.length, 4);
  assert.ok(harvest.data.room.timeline.some((event) => event.type === "cards" && event.action === "reveal" && event.cards.length === 4));
  assert.equal((await request("preview_harvest", { code: game.code, token: alice.token, cardId: "dodge-harvest-alice" })).status, 409, "players cannot preview out of order");
  const hostPreview = await request("preview_harvest", { code: game.code, token: host.token, cardId: "attack-harvest-host" });
  assert.equal(hostPreview.status, 200); assert.equal(hostPreview.data.room.phase, "response"); assert.equal(hostPreview.data.room.actionPlayerId, hostPlayer.id); assert.equal(hostPreview.data.room.pendingHarvest.previewCardId, "attack-harvest-host");
  assert.ok(!hostPreview.data.room.myHand.some((held) => held.id === "attack-harvest-host"), "previewing does not take the card");
  assert.equal((await state(game.code, alice.token)).data.pendingHarvest.previewCardId, "attack-harvest-host", "other players see the current preview");
  const clearedPreview = await request("preview_harvest", { code: game.code, token: host.token, cardId: null });
  assert.equal(clearedPreview.status, 200); assert.equal(clearedPreview.data.room.pendingHarvest.previewCardId, null); assert.equal(clearedPreview.data.room.actionPlayerId, hostPlayer.id);
  assert.equal((await request("preview_harvest", { code: game.code, token: host.token, cardId: "attack-harvest-host" })).status, 200);
  assert.equal((await request("choose_harvest", { code: game.code, token: alice.token, cardId: "dodge-harvest-alice" })).status, 409, "players cannot choose out of order");
  const hostHarvest = await request("choose_harvest", { code: game.code, token: host.token, cardId: "attack-harvest-host" });
  assert.equal(hostHarvest.status, 200); assert.equal(hostHarvest.data.room.actionPlayerId, alicePlayer.id); assert.ok(hostHarvest.data.room.myHand.some((held) => held.id === "attack-harvest-host"));
  assert.equal(hostHarvest.data.room.pendingHarvest.previewCardId, null, "the preview clears for the next chooser");
  assert.equal(hostHarvest.data.room.pendingHarvest.revealed.length, 4, "all cards remain visible while choices continue"); assert.equal(hostHarvest.data.room.pendingHarvest.availableIds.length, 3); assert.equal(hostHarvest.data.room.pendingHarvest.choices[0].playerName, "Host");
  assert.equal(hostHarvest.data.room.timeline.find((event) => event.type === "cards" && event.action === "reveal").presentation, false, "the persistent choice panel replaces a separate reveal presentation");
  const aliceHarvest = await request("choose_harvest", { code: game.code, token: alice.token, cardId: "dodge-harvest-alice" });
  assert.equal(aliceHarvest.data.room.actionPlayerId, bobPlayer.id);
  const bobHarvest = await request("choose_harvest", { code: game.code, token: bob.token, cardId: "peach-harvest-bob" });
  assert.equal(bobHarvest.data.room.actionPlayerId, carolPlayer.id);
  const carolHarvest = await request("choose_harvest", { code: game.code, token: carol.token, cardId: "steal-harvest-carol" });
  assert.equal(carolHarvest.status, 200); assert.equal(carolHarvest.data.room.phase, "response"); assert.equal(carolHarvest.data.room.pendingHarvest.complete, true);
  assert.equal(carolHarvest.data.room.pendingHarvest.choices.length, 4, "the final shaded choice remains visible before the panel closes");
  assert.ok(carolHarvest.data.room.myHand.some((held) => held.id === "steal-harvest-carol"));
  assert.equal(carolHarvest.data.room.timeline.filter((event) => event.type === "card" && event.action === "gain").length, 4);
  const completedHarvest = await waitForState(game.code, host.token, (room) => room.phase === "play" && room.pendingHarvest === null);
  assert.equal(completedHarvest.pendingHarvest, null);
  assert.ok(discardIds(game.code).includes("bumperharvest-global-choice"), "Bumper Harvest enters discard only after every choice finishes");

  setHand(hostPlayer.id, [card("BumperHarvest", "single-target-negation")], 5, 5); setHand(alicePlayer.id, [card("Negation", "harvest-host")], 4, 4); setHand(bobPlayer.id, [], 4, 4); setHand(carolPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  const negatedHarvestCards = [card("Attack", "harvest-negated-host"), card("Dodge", "harvest-negated-alice"), card("Peach", "harvest-negated-bob"), card("Steal", "harvest-negated-carol")];
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(negatedHarvestCards))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const harvestNegationWindow = await request("play_card", { code: game.code, token: host.token, cardId: "bumperharvest-single-target-negation" });
  assert.equal(harvestNegationWindow.status, 200); assert.equal(harvestNegationWindow.data.room.pendingNegation.effectTargetId, hostPlayer.id, "Bumper Harvest opens Negation for its first affected player");
  assert.ok(!discardIds(game.code).includes("bumperharvest-single-target-negation"), "the active Bumper Harvest card stays out of discard");
  const hostEffectCancelled = await request("respond_negation", { code: game.code, token: alice.token, cardId: "negation-harvest-host" });
  assert.equal(hostEffectCancelled.status, 200); assert.equal(hostEffectCancelled.data.room.pendingHarvest.actorId, alicePlayer.id, "Negation skips only Host and Bumper Harvest continues with Alice");
  assert.equal(hostEffectCancelled.data.room.pendingHarvest.availableIds.length, 4, "the cancelled player's unchosen card remains available");
  assert.ok(!hostEffectCancelled.data.room.myHand.some((held) => held.id === "attack-harvest-negated-host"));
  const aliceAfterNegation = await request("choose_harvest", { code: game.code, token: alice.token, cardId: "dodge-harvest-negated-alice" });
  assert.equal(aliceAfterNegation.data.room.pendingHarvest.actorId, bobPlayer.id);
  const bobAfterNegation = await request("choose_harvest", { code: game.code, token: bob.token, cardId: "peach-harvest-negated-bob" });
  assert.equal(bobAfterNegation.data.room.pendingHarvest.actorId, carolPlayer.id);
  const carolAfterNegation = await request("choose_harvest", { code: game.code, token: carol.token, cardId: "steal-harvest-negated-carol" });
  assert.equal(carolAfterNegation.data.room.pendingHarvest.complete, true); assert.equal(carolAfterNegation.data.room.pendingHarvest.choices.length, 3);
  await waitForState(game.code, host.token, (room) => room.phase === "play" && room.pendingHarvest === null);
  const harvestNegationDiscard = discardIds(game.code);
  assert.ok(harvestNegationDiscard.includes("bumperharvest-single-target-negation")); assert.ok(harvestNegationDiscard.includes("negation-harvest-host")); assert.ok(harvestNegationDiscard.includes("attack-harvest-negated-host"), "the card left by the cancelled target is discarded when Bumper Harvest concludes");

  setHand(hostPlayer.id, [card("BarbarianInvasion", "global")], 4, 5); setHand(alicePlayer.id, [card("Attack", "barbarian-answer")], 4); setHand(bobPlayer.id, [], 1, 4); setHand(carolPlayer.id, [card("Attack", "barbarian-answer")], 4); setTurn(game.code, hostPlayer.seat);
  const invasion = await request("play_card", { code: game.code, token: host.token, cardId: "barbarianinvasion-global" });
  assert.equal(invasion.status, 200); assert.equal(invasion.data.room.phase, "response"); assert.equal(invasion.data.room.actionPlayerId, alicePlayer.id); assert.equal(invasion.data.room.pendingGroup.requiredKind, "Attack");
  assert.ok(!discardIds(game.code).includes("barbarianinvasion-global"), "the active global card stays out of discard during its response sequence");
  assert.equal((await request("respond_group", { code: game.code, token: bob.token, cardId: "attack-barbarian-answer" })).status, 409);
  const invasionAlice = await request("respond_group", { code: game.code, token: alice.token, cardId: "attack-barbarian-answer" });
  assert.equal(invasionAlice.status, 200); assert.equal(invasionAlice.data.room.actionPlayerId, carolPlayer.id);
  assert.equal(invasionAlice.data.room.players.find((player) => player.id === bobPlayer.id).alive, false, "Bob has no legal Attack response and automatically takes damage");
  assert.ok(!discardIds(game.code).includes("attack-barbarian-answer"), "global responses stay in the active sequence until it finishes");
  const aliceInvasionResponse = invasionAlice.data.room.timeline.find((event) => event.type === "card" && event.card.id === "attack-barbarian-answer" && event.player === "Alice");
  assert.equal(aliceInvasionResponse.target, "Alice", "an AOE response has no directional player target");
  const invasionBob = await request("take_group_damage", { code: game.code, token: bob.token });
  assert.equal(invasionBob.status, 409, "an automatically resolved target cannot submit a second damage action");
  const invasionCarol = await request("respond_group", { code: game.code, token: carol.token, cardId: "attack-barbarian-answer" });
  assert.equal(invasionCarol.status, 200); assert.equal(invasionCarol.data.room.phase, "play"); assert.equal(invasionCarol.data.room.pendingGroup, null);
  assert.equal(discardIds(game.code).filter((id) => id === "barbarianinvasion-global").length, 1);
  assert.equal(discardIds(game.code).filter((id) => id === "attack-barbarian-answer").length, 2);
  assert.ok(invasionCarol.data.room.timeline.some((event) => event.type === "card" && event.card.kind === "BarbarianInvasion"));

  setHand(hostPlayer.id, [card("RainingArrows", "global")], 4, 5); setHand(alicePlayer.id, [card("Dodge", "arrows-answer")], 4); setHand(bobPlayer.id, [card("Dodge", "arrows-answer")], 4); setHand(carolPlayer.id, [card("Dodge", "arrows-answer")], 4); setTurn(game.code, hostPlayer.seat);
  const arrows = await request("play_card", { code: game.code, token: host.token, cardId: "rainingarrows-global" });
  assert.equal(arrows.status, 200); assert.equal(arrows.data.room.actionPlayerId, alicePlayer.id); assert.equal(arrows.data.room.pendingGroup.requiredKind, "Dodge");
  assert.equal((await request("respond_group", { code: game.code, token: alice.token, cardId: "dodge-arrows-answer" })).data.room.actionPlayerId, bobPlayer.id);
  assert.equal((await request("respond_group", { code: game.code, token: bob.token, cardId: "dodge-arrows-answer" })).data.room.actionPlayerId, carolPlayer.id);
  const arrowsFinished = await request("respond_group", { code: game.code, token: carol.token, cardId: "dodge-arrows-answer" });
  assert.equal(arrowsFinished.status, 200); assert.equal(arrowsFinished.data.room.phase, "play"); assert.equal(arrowsFinished.data.room.pendingGroup, null);
  assert.ok(arrowsFinished.data.room.timeline.some((event) => event.type === "card" && event.card.kind === "RainingArrows"));
  const arrowResponses = arrowsFinished.data.room.timeline.filter((event) => event.type === "card" && event.card.id === "dodge-arrows-answer");
  assert.equal(arrowResponses.length, 3); assert.ok(arrowResponses.every((event) => event.target === event.player), "every Dodge response to Raining Arrows is directionless");

  const discardHand = Array.from({ length: 6 }, (_, index) => card("Dodge", `discard-${index}`));
  setHand(hostPlayer.id, discardHand, 4, 5); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("end_turn", { code: game.code, token: host.token })).data.room.phase, "discard");
  assert.equal((await request("discard_cards", { code: game.code, token: host.token, cardIds: ["dodge-discard-0"] })).status, 400);
  const discarded = await request("discard_cards", { code: game.code, token: host.token, cardIds: ["dodge-discard-0", "dodge-discard-1"] });
  assert.equal(discarded.status, 200); assert.equal(discarded.data.room.turnSeat, alicePlayer.seat); assert.equal(discarded.data.room.phase, "draw"); assert.equal(discarded.data.room.myHand.length, 4);
  const groupedDiscard = discarded.data.room.timeline.find((entry) => entry.type === "cards" && entry.action === "discard" && entry.player === "Host"); assert.equal(groupedDiscard.cards.length, 2);

  setHand(hostPlayer.id, [card("Strike", "dying")], 4, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [], 4); setHand(carolPlayer.id, [], 4); sql(`UPDATE players SET role='Rebel' WHERE id=${quote(alicePlayer.id)}`); setTurn(game.code, hostPlayer.seat);
  await request("play_card", { code: game.code, token: host.token, cardId: "strike-dying", targetId: alicePlayer.id });
  await takeDamageIfPending(game.code, alice.token);
  const dying = { data: { room: (await state(game.code, host.token)).data } };
  assert.equal(dying.data.room.phase, "play-struck"); assert.equal(dying.data.room.players.find((player) => player.id === alicePlayer.id).hp, 0);
  assert.equal(dying.data.room.players.find((player) => player.id === alicePlayer.id).alive, false);
  assert.equal(dying.data.room.players.find((player) => player.id === alicePlayer.id).role, "Rebel"); assert.equal(dying.data.room.myHand.length, 3);
  assert.ok(dying.data.room.timeline.some((entry) => /Alice takes 1 damage and enters Dying/.test(entry.message ?? "")));
  assert.ok(dying.data.room.timeline.some((entry) => /Alice receives no Peach and is defeated/.test(entry.message ?? "")));
  assert.ok(dying.data.room.timeline.some((entry) => /Alice's role is revealed: Rebel/.test(entry.message ?? "")));
  assert.ok(dying.data.room.timeline.some((entry) => /defeated Rebel Alice and draws 3 reward cards/.test(entry.message ?? "")));

  setHand(hostPlayer.id, [card("Strike", "attacker-rescue"), card("Peach", "attacker-rescue")], 4, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [], 4); setHand(carolPlayer.id, [], 4); setTurn(game.code, hostPlayer.seat);
  await request("play_card", { code: game.code, token: host.token, cardId: "strike-attacker-rescue", targetId: alicePlayer.id });
  await takeDamageIfPending(game.code, alice.token);
  const attackerRescuePrompt = { data: { room: (await state(game.code, host.token)).data } };
  assert.equal(attackerRescuePrompt.data.room.phase, "dying"); assert.equal(attackerRescuePrompt.data.room.actionPlayerId, hostPlayer.id); assert.equal(attackerRescuePrompt.data.room.pendingDying.deadline, 0);
  const timedAttackerPrompt = await request("start_rescue_timer", { code: game.code, token: host.token }); assert.ok(timedAttackerPrompt.data.room.pendingDying.deadline > Date.now());
  assert.equal((await request("give_peach", { code: game.code, token: host.token })).status, 409);
  sql(`UPDATE rooms SET pending_json=json_set(pending_json,'$.deadline',1) WHERE code=${quote(game.code)}`);
  const attackerRescue = await request("give_peach", { code: game.code, token: host.token, cardId: "peach-attacker-rescue" });
  assert.equal(attackerRescue.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.ok(attackerRescue.data.room.timeline.some((entry) => entry.type === "card" && entry.player === "Host" && entry.target === "Alice" && entry.card.kind === "Peach"));

  setHand(hostPlayer.id, [card("Strike", "rescue")], 4, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [card("Peach", "rescue-other")], 4); setHand(carolPlayer.id, [], 4); setTurn(game.code, hostPlayer.seat);
  await request("play_card", { code: game.code, token: host.token, cardId: "strike-rescue", targetId: alicePlayer.id });
  const rescuePrompt = await takeDamageIfPending(game.code, alice.token);
  assert.equal(rescuePrompt.data.room.phase, "dying"); assert.equal(rescuePrompt.data.room.actionPlayerId, null); assert.equal(rescuePrompt.data.room.isMyAction, false); assert.match(rescuePrompt.data.room.actionReason, /no rescue action is required/);
  const bobPrivatePrompt = await state(game.code, bob.token); assert.equal(bobPrivatePrompt.data.actionPlayerId, bobPlayer.id); assert.equal(bobPrivatePrompt.data.isMyAction, true); assert.match(bobPrivatePrompt.data.actionReason, /Decide whether to give Peach/);
  const alicePrivateView = await state(game.code, alice.token); assert.equal(alicePrivateView.data.actionPlayerId, null); assert.equal(alicePrivateView.data.pendingDying.deadline, 0);
  const rescued = await request("give_peach", { code: game.code, token: bob.token, cardId: "peach-rescue-other" });
  assert.equal(rescued.status, 200); assert.equal(rescued.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1); assert.equal(rescued.data.room.players.find((player) => player.id === alicePlayer.id).alive, true);
  assert.ok(rescued.data.room.timeline.some((entry) => entry.type === "card" && entry.player === "Bob" && entry.target === "Alice" && entry.card.kind === "Peach"));

  setHand(hostPlayer.id, [card("Strike", "skip-rescue")], 4, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [card("Peach", "declined")], 4); setHand(carolPlayer.id, [], 4); setTurn(game.code, hostPlayer.seat);
  await request("play_card", { code: game.code, token: host.token, cardId: "strike-skip-rescue", targetId: alicePlayer.id });
  assert.equal((await takeDamageIfPending(game.code, alice.token)).data.room.actionPlayerId, null);
  const skippedRescue = await request("skip_rescue", { code: game.code, token: bob.token });
  assert.equal(skippedRescue.status, 200); assert.equal(skippedRescue.data.room.players.find((player) => player.id === alicePlayer.id).alive, true);
  const skippedRescueSettled = await waitForState(game.code, host.token, (room) => !room.players.find((player) => player.id === alicePlayer.id).alive);
  assert.equal(skippedRescueSettled.players.find((player) => player.id === alicePlayer.id).alive, false);

  setHand(hostPlayer.id, [card("Strike", "timeout-rescue")], 4, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [card("Peach", "timed-out")], 4); setHand(carolPlayer.id, [], 4); setTurn(game.code, hostPlayer.seat);
  const timeoutAttack = await request("play_card", { code: game.code, token: host.token, cardId: "strike-timeout-rescue", targetId: alicePlayer.id });
  const timeoutDying = timeoutAttack.data.room.actionPlayerId === alicePlayer.id ? await takeDamageIfPending(game.code, alice.token) : timeoutAttack;
  assert.equal(timeoutDying.data.room.actionPlayerId, null);
  await request("start_rescue_timer", { code: game.code, token: bob.token }); sql(`UPDATE rooms SET pending_json=json_set(pending_json,'$.deadline',1) WHERE code=${quote(game.code)}`);
  const timedOutRescue = await request("skip_rescue", { code: game.code, token: bob.token });
  assert.equal(timedOutRescue.status, 200); const timedOutSettled = await waitForState(game.code, host.token, (room) => !room.players.find((player) => player.id === alicePlayer.id).alive); assert.equal(timedOutSettled.phase, "play-struck"); assert.equal(timedOutSettled.players.find((player) => player.id === alicePlayer.id).alive, false);
  const repeatedTimeout = await request("skip_rescue", { code: game.code, token: bob.token }); assert.equal(repeatedTimeout.status, 200); assert.equal(repeatedTimeout.data.room.phase, "play-struck");

  const audit = await state(game.code, host.token, true);
  assert.equal(audit.status, 200); assert.ok(Array.isArray(audit.data.audit), "the authenticated audit endpoint returns the room audit table");
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
  assert.deepEqual(quick.data.room.players.map((player) => player.isBot), [false, false, false, false]);
  assert.equal(quick.data.room.isTestController, true);
  assert.ok(quick.data.room.players.every((player) => player.handCards.length === 0), "Quick Test exposes only the controlled player's myHand");
  assert.ok(quick.data.room.players.every((player) => player.hero)); assert.equal(new Set(quick.data.room.players.map((player) => player.hero)).size, 4);
  assert.equal(quick.data.room.players.find((player) => player.name === "ME").hero, "zhang-fei");
  assert.ok(quick.data.room.players.filter((player) => player.name !== "ME").every((player) => player.hp === 3 && player.maxHp === 3));
  assert.equal(quick.data.room.myHand.length, 4);
  assert.deepEqual(new Set(quick.data.room.myHand.map((openingCard) => openingCard.kind)), new Set(["Attack", "EightTrigrams"]), "ME starts with the newly implemented card and otherwise-randomized opening cards");
  assert.equal(quick.data.room.myHand.filter((openingCard) => openingCard.kind === "Attack").length, 3, "ME starts with three Attack cards");
  assert.ok(quick.data.room.myHand.some((openingCard) => openingCard.kind === "EightTrigrams"), "Eight Trigrams is guaranteed in the Quick Test opening hand");
  const quickDeck = JSON.parse(query(`SELECT deck_json FROM rooms WHERE code=${quote(quick.data.room.code)}`));
  assert.ok(["ZhugeCrossbow", "GreenDragonBlade", "RockCleavingAxe", "SkyPiercingHalberd"].every((kind) => quickDeck.some((deckCard) => deckCard.kind === kind)), "every non-tested weapon remains available in the draw deck");
  assert.equal(quick.data.room.players.find((player) => player.name === "Player 3").handCount, 4);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(quick.data.room.code)}) AND seat=3`)).map((openingCard) => openingCard.kind), ["Negation", "Attack", "Attack", "Attack"], "Player 3 retains three seeded Attack cards");
  assert.ok(JSON.parse(query(`SELECT hand_json FROM players WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(quick.data.room.code)}) AND seat=1`)).some((openingCard) => openingCard.kind === "SerpentSpear"), "Player 1 starts with Serpent Spear for Quick Test response coverage");
  assert.ok(quick.data.room.players.filter((player) => player.name !== "ME").every((player) => player.handCount === 4), "focused quick-test cards replace rather than enlarge the other seats' hands");
  assert.ok(quick.data.room.players.every((player) => player.equipmentCards.length === 0 && player.hp === 3 && player.maxHp === 3), "every test seat starts at 3 HP with empty equipment");
  assert.equal(quickDeck.filter((item) => ["Shadowrunner", "HexMark", "YellowHoofedFlyingLightning", "RedHare", "PurpleBay", "FerganaSteed"].includes(item.kind)).length, 6, "the six distinct Standard mounts remain in the draw pile");
  assert.equal((await state(botCode, botToken, true)).data.audit.length, 0);
  assert.ok((await state(quick.data.room.code, quick.data.token, true)).data.audit.length > 0);
  const quickDraw = await request("draw", { code: quick.data.room.code, token: quick.data.token });
  assert.equal(quickDraw.status, 200); assert.equal(quickDraw.data.drawnCards.length, 2); assert.equal(quickDraw.data.room.phase, "play"); assert.equal(quickDraw.data.room.myHand.length, 6);
  const quickMe = quickDraw.data.room.players.find((player) => player.name === "ME"); const quickPlayerOne = quickDraw.data.room.players.find((player) => player.name === "Player 1");
  setHand(quickMe.id, [card("Strike", "zhang-fei-1"), card("Strike", "zhang-fei-2")], quickMe.hp, quickMe.maxHp); setHand(quickPlayerOne.id, [card("Dodge", "zhang-fei-1"), card("Dodge", "zhang-fei-2")], 1, 1); setTurn(quick.data.room.code, quickMe.seat);
  const firstQuickAttack = await request("play_card", { code: quick.data.room.code, token: quick.data.token, cardId: "strike-zhang-fei-1", targetId: quickPlayerOne.id });
  assert.equal(firstQuickAttack.data.room.phase, "response"); assert.equal(firstQuickAttack.data.room.actionPlayerId, quickPlayerOne.id);
  assert.equal((await request("respond_dodge", { code: quick.data.room.code, token: quick.data.token, cardId: "dodge-zhang-fei-1" })).data.room.phase, "play");
  const secondQuickAttack = await request("play_card", { code: quick.data.room.code, token: quick.data.token, cardId: "strike-zhang-fei-2", targetId: quickPlayerOne.id });
  assert.equal(secondQuickAttack.data.room.phase, "response");
  assert.equal((await request("respond_dodge", { code: quick.data.room.code, token: quick.data.token, cardId: "dodge-zhang-fei-2" })).data.room.phase, "play");
  setHand(quickPlayerOne.id, [card("Peach", "controller-one"), card("Dodge", "controller-two")], 1, 1);
  setTurn(quick.data.room.code, quickPlayerOne.seat, "draw");
  const controlledSeat = await state(quick.data.room.code, quick.data.token);
  assert.equal(controlledSeat.data.meId, quickPlayerOne.id, "the same Quick Test controller becomes the active seat");
  assert.equal(controlledSeat.data.myHand.length, 2);
  assert.ok(controlledSeat.data.players.every((player) => player.handCards.length === 0));
});

test("Quick Test exhausts each AOE Negation window before the target response, with one private hand", async () => {
  for (const [kind, required] of [["RainingArrows", "Dodge"], ["BarbarianInvasion", "Attack"]]) {
  const created = await request("create", { quickStart: true }); const { token, room } = created.data;
  const [me, ...targets] = room.players;
  setHand(me.id, [card(kind, "perspective"), card("Negation", "perspective-user")], 3, 3);
  for (const target of targets) setHand(target.id, [card("Negation", `perspective-${target.seat}`), card(required, `perspective-${target.seat}`)], 3, 3);
  setTurn(room.code, me.seat);
  const act = (action, extra = {}) => request(action, { code: room.code, token, ...extra });
  let result = await act("play_card", { cardId: `${kind.toLowerCase()}-perspective` });
  for (const target of targets) {
    const ordered = room.players;
    for (const responder of ordered) {
      const view = result.data.room;
      assert.equal(view.meId, responder.id); assert.equal(view.actionPlayerId, responder.id);
      assert.ok(view.isMyAction); assert.ok(view.players.every((p) => p.handCards.length === 0));
      assert.deepEqual(view.myHand, JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(responder.id)}`)));
      assert.equal(view.myRole, view.players.find((p) => p.id === responder.id).role);
      result = await act("pass_negation"); assert.equal(result.status, 200);
    }
    assert.equal(result.data.room.meId, target.id); assert.equal(result.data.room.pendingNegation, null);
    assert.equal(result.data.room.pendingGroup.requiredKind, required);
    result = await act("respond_group", { cardId: `${required.toLowerCase()}-perspective-${target.seat}` }); assert.equal(result.status, 200);
  }
  assert.equal(result.data.room.meId, me.id); assert.equal(result.data.room.phase, "play");
  assert.ok(result.data.room.players.every((p) => p.handCards.length === 0));
  setTurn(room.code, me.seat, "draw");
  const drawn = await act("draw");
  assert.ok(drawn.data.room.timeline.some((event) => event.drawPlayerId === me.id));
  assert.equal(drawn.data.drawnCards.length, 2);
  }
});

test("AOE counter rounds include their own Negation player last and resume the affected target", async () => {
  const created = await request("create", { quickStart: true }); const { token, room } = created.data;
  const [me, p1, p2, p3] = room.players;
  for (const p of room.players) setHand(p.id, [card("Negation", `self-${p.seat}`), card("Attack", `self-${p.seat}`)], 3, 3);
  setHand(me.id, [card("BarbarianInvasion", "self-root"), card("Negation", "self-0")], 3, 3);
  setHand(p1.id, [card("Negation", "self-1"), card("Negation", "self-again"), card("Attack", "self-1")], 3, 3);
  setTurn(room.code, me.seat);
  const act = (action, extra = {}) => request(action, { code: room.code, token, ...extra });
  let result = await act("play_card", { cardId: "barbarianinvasion-self-root" });
  assert.equal(result.data.room.actionPlayerId, me.id);
  assert.equal(result.data.room.responseCountdownVisibleAt, 0, "a human Negation window has no countdown before its presentation is ready");
  await act("pass_negation");
  result = await act("respond_negation", { cardId: "negation-self-1" });
  assert.equal(result.data.room.actionPlayerId, p1.id);
  result = await act("respond_negation", { cardId: "negation-self-again" });
  assert.equal(result.data.room.pendingNegation.chainDepth, 2);
  for (const p of [p2, p3, me]) {
    assert.equal(result.data.room.actionPlayerId, p.id);
    assert.equal(result.data.room.pendingNegation.responseTarget, "Player 1's Negation");
    result = await act("pass_negation");
  }
  assert.equal(result.data.room.pendingNegation, null);
  assert.equal(result.data.room.pendingGroup.actorId, p1.id);
  assert.equal(result.data.room.pendingGroup.requiredKind, "Attack");
  result = await act("respond_group", { cardId: "attack-self-1" });
  assert.equal(result.data.room.pendingNegation.effectTargetId, p2.id);
});

test("AOE Attack capability preserves legal conversions and auto-damages only without a response", async () => {
  const created = await request("create", { quickStart: true }); const { token, room } = created.data;
  const [me, p1, p2, p3] = room.players;
  for (const p of room.players) { setHand(p.id, [], 3, 3); setEquipment(p.id, {}); }
  setHand(me.id, [card("BarbarianInvasion", "capability")], 3, 3);
  setHand(p1.id, [card("Dodge", "cost1"), card("Peach", "cost2")], 3, 3);
  setEquipment(p1.id, { weapon: card("SerpentSpear", "capability") });
  setTurn(room.code, me.seat);
  const act = (action, extra = {}) => request(action, { code: room.code, token, ...extra });
  let result = await act("play_card", { cardId: "barbarianinvasion-capability" });
  assert.equal(result.data.room.pendingGroup.actorId, p1.id, "no normal Attack, but a legal alternative keeps the decision open");
  assert.equal((await act("respond_group", { cardIds: ["dodge-cost1"] })).status, 409);
  result = await act("respond_group", { cardIds: ["dodge-cost1", "peach-cost2"] });
  assert.equal(result.data.room.phase, "play");
  assert.equal(result.data.room.players.find(p => p.id === p1.id).hp, 3);
  for (const p of [p2, p3]) assert.equal(result.data.room.players.find(player => player.id === p.id).hp, 2);
});

test("Negation opportunities start at the target, include the user, and reset only after a card", async () => {
  const game = await createHumanGame(); const players = game.room.players;
  for (const player of players) setHand(player.id, [card("Negation", `${player.seat}-one`), card("Negation", `${player.seat}-two`), card("Attack", `${player.seat}-reply`)], 4, 4);
  setHand(players[0].id, [card("Duel", "ordered"), card("Negation", "0-one"), card("Attack", "0-reply")], 4, 4);
  setTurn(game.code, players[0].seat);
  const act = (seat, action, extra = {}) => request(action, { code: game.code, token: game.members[seat].token, ...extra });
  let result = await act(0, "play_card", { cardId: "duel-ordered", targetId: players[2].id });
  for (const seat of [0, 1, 2, 3]) {
    assert.equal(result.data.room.actionPlayerId, players[seat].id);
    assert.equal(result.data.room.pendingDuel, null, "normal responses remain closed");
    result = await act(seat, "pass_negation");
  }
  assert.equal(result.data.room.pendingNegation, null);
  assert.equal(result.data.room.pendingDuel.actorId, players[2].id);
  assert.equal(result.data.room.pendingDuel.deadline, 0, "the deferred human Duel response is unarmed until displayed");
  assert.equal((await act(2, "respond_negation", { cardId: "negation-2-two" })).status, 409, "closed window cannot be reopened");
  result = await act(2, "respond_duel", { cardId: "attack-2-reply" });
  assert.equal(result.status, 200); assert.equal(result.data.room.pendingDuel.actorId, players[0].id);
});

test("normal responses follow Negation passes and retain both Attack and Spear choices", async () => {
  for (const kind of ["RainingArrows", "BarbarianInvasion", "Duel"]) {
    const game = await createHumanGame(); const [me, target, next, last] = game.room.players;
    setHand(me.id, [card(kind, "window"), card("Negation", "user-window"), card("Attack", "source-reply")], 4, 4);
    setHand(target.id, [card("Negation", "target-window"), card("Attack", "target-reply"), card("Dodge", "target-reply"), card("Peach", "spear-cost")], 4, 4);
    setEquipment(target.id, { weapon: card("SerpentSpear", "window") });
    setHand(next.id, [card("Attack", "next"), card("Dodge", "next")], 4, 4); setHand(last.id, [], 4, 4);
    setTurn(game.code, me.seat);
    const act = (seat, action, extra = {}) => request(action, { code: game.code, token: game.members[seat].token, ...extra });
    let result = await act(0, "play_card", { cardId: `${kind.toLowerCase()}-window`, targetId: target.id });
    assert.equal(result.data.room.actionPlayerId, me.id);
    const action = kind === "Duel" ? "respond_duel" : "respond_group";
    assert.equal((await act(1, action, { cardId: kind === "RainingArrows" ? "dodge-target-reply" : "attack-target-reply" })).status, 409);
    const order = [0, 1];
    for (const seat of order) result = await act(seat, "pass_negation");
    const response = kind === "Duel" ? result.data.room.pendingDuel : result.data.room.pendingGroup;
    assert.equal(result.data.room.pendingNegation, null); assert.equal(response.actorId, target.id);
    assert.equal(response.deadline, 0, "a deferred human response waits for its own visible-decision timer");
    const extra = kind === "RainingArrows" ? { cardId: "dodge-target-reply" } : { cardIds: ["dodge-target-reply", "peach-spear-cost"] };
    result = await act(1, action, extra); assert.equal(result.status, 200, "Spear is usable even when a normal Attack is also held");
    assert.equal(result.data.room.players.find((p) => p.id === target.id).hp, 4);
    if (kind !== "Duel") assert.equal(result.data.room.pendingNegation.effectTargetId, next.id, "next target opens only after the first target's normal response finishes");
  }
});

test("effective distance rejects unreachable targets before consuming Attack and includes both horses", async () => {
  const game = await createHumanGame(); const [host] = game.members;
  const [me, adjacent, opposite] = game.room.players;
  setHand(me.id, [card("Attack", "distance-guard"), card("Steal", "distance-guard")], 3, 3);
  setHand(adjacent.id, [], 3, 3); setEquipment(adjacent.id, { defensiveHorse: card("DefensiveHorse", "distance-guard") });
  setTurn(game.code, me.seat);
  const before = (await state(game.code, host.token)).data;
  assert.equal(before.players.find((p) => p.id === adjacent.id).distance, 2);
  assert.equal(before.players.find((p) => p.id === me.id).attackRange, 1);
  const rejected = await request("play_card", { code: game.code, token: host.token, cardId: "attack-distance-guard", targetId: adjacent.id });
  assert.equal(rejected.status, 409); assert.match(rejected.data.error, /range/i);
  const unchanged = (await state(game.code, host.token)).data;
  assert.deepEqual(unchanged.myHand, before.myHand); assert.equal(unchanged.phase, "play");
  assert.equal(unchanged.players.find((p) => p.id === adjacent.id).hp, 3);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "steal-distance-guard", targetId: adjacent.id })).status, 409);
  setEquipment(me.id, { offensiveHorse: card("OffensiveHorse", "distance-guard") });
  const mounted = (await state(game.code, host.token)).data;
  assert.equal(mounted.players.find((p) => p.id === adjacent.id).distance, 1);
  assert.equal(mounted.players.find((p) => p.id === opposite.id).distance, 1);
  assert.equal(mounted.players.find((p) => p.id === me.id).attackRange, 1, "a mount changes distance, not weapon range");
  const hit = await request("play_card", { code: game.code, token: host.token, cardId: "attack-distance-guard", targetId: adjacent.id });
  assert.equal(hit.status, 200); assert.equal(hit.data.room.pendingAttack, null);
  assert.equal(hit.data.room.players.find((p) => p.id === adjacent.id).hp, 2);
  assert.ok(!hit.data.room.myHand.some((c) => c.id === "attack-distance-guard"));
});

test("no-Dodge auto resolution keeps Frost Sword and shield checks and skips empty Arrow responders", async () => {
  const game = await createHumanGame(); const [host, , , carol] = game.members;
  const [me, first, second, last] = game.room.players;
  for (const player of game.room.players) { setHand(player.id, [], 3, 3); setEquipment(player.id); }
  setHand(me.id, [card("Attack", "no-dodge-frost")], 3, 3);
  setHand(first.id, [card("Peach", "frost-kept")], 3, 3);
  setEquipment(me.id, { weapon: card("FrostSword", "no-dodge") }); setTurn(game.code, me.seat);
  const frost = await request("play_card", { code: game.code, token: host.token, cardId: "attack-no-dodge-frost", targetId: first.id });
  assert.equal(frost.status, 200); assert.equal(frost.data.room.pendingAttack, null);
  assert.equal(frost.data.room.pendingFrostSword.actorId, me.id); assert.equal(frost.data.room.players.find((p) => p.id === first.id).hp, 3);
  const damage = await request("pass_frost_sword", { code: game.code, token: host.token });
  assert.equal(damage.status, 200); assert.equal(damage.data.room.players.find((p) => p.id === first.id).hp, 2);
  setHand(me.id, [card("RainingArrows", "no-dodge")], 3, 3); setHand(first.id, [], 3, 3);
  setHand(last.id, [card("Dodge", "last-arrow")], 3, 3); setTurn(game.code, me.seat);
  const arrows = await request("play_card", { code: game.code, token: host.token, cardId: "rainingarrows-no-dodge" });
  assert.equal(arrows.status, 200); assert.equal(arrows.data.room.actionPlayerId, last.id);
  assert.equal(arrows.data.room.players.find((p) => p.id === first.id).hp, 2);
  assert.equal(arrows.data.room.players.find((p) => p.id === second.id).hp, 2);
  assert.equal(arrows.data.room.players.find((p) => p.id === last.id).hp, 3);
  const response = await request("respond_group", { code: game.code, token: carol.token, cardId: "dodge-last-arrow" });
  assert.equal(response.status, 200); assert.equal(response.data.room.pendingGroup, null);
});

test("Zhuge Crossbow equips, replaces, enables repeated Attacks, and is used by bots", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members; const [hostPlayer, alicePlayer] = game.room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(hostPlayer.id)}`);
  setEquipment(hostPlayer.id);
  setHand(hostPlayer.id, [card("ZhugeCrossbow", "first"), card("Attack", "crossbow-one"), card("Attack", "crossbow-two"), card("ZhugeCrossbow", "replacement")], 4, 5);
  setHand(alicePlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  sql(`UPDATE rooms SET discard_json='[]' WHERE code=${quote(game.code)}`);

  const equipped = await request("play_card", { code: game.code, token: host.token, cardId: "zhugecrossbow-first" });
  assert.equal(equipped.status, 200); assert.equal(equipped.data.room.phase, "play");
  assert.equal(equipped.data.room.players.find((player) => player.id === hostPlayer.id).equipmentCards[0].id, "zhugecrossbow-first");
  assert.deepEqual(discardIds(game.code), [], "an equipped weapon does not enter the discard pile");

  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "attack-crossbow-one", targetId: alicePlayer.id })).status, 200);
  const firstAttack = await takeDamageIfPending(game.code, alice.token);
  assert.equal(firstAttack.data.room.phase, "play", "Zhuge Crossbow returns its owner to an unrestricted Play Phase");
  assert.equal(firstAttack.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "attack-crossbow-two", targetId: alicePlayer.id })).status, 200);
  const secondAttack = await takeDamageIfPending(game.code, alice.token);
  assert.equal(secondAttack.data.room.phase, "play");
  assert.equal(secondAttack.data.room.players.find((player) => player.id === alicePlayer.id).hp, 2);

  const replaced = await request("play_card", { code: game.code, token: host.token, cardId: "zhugecrossbow-replacement" });
  assert.equal(replaced.status, 200);
  assert.deepEqual(replaced.data.room.players.find((player) => player.id === hostPlayer.id).equipmentCards.map((equipment) => equipment.id), ["zhugecrossbow-replacement"]);
  assert.ok(discardIds(game.code).includes("zhugecrossbow-first"), "equipping a new weapon discards the previous weapon");

  const quick = await request("create", { quickStart: true, botTest: true }); const [me, playerOne, playerTwo, playerThree] = quick.data.room.players;
  setHand(me.id, [], me.hp, me.maxHp); setHand(playerOne.id, [card("ZhugeCrossbow", "bot")], 1, 1); setHand(playerTwo.id, [], 1, 1); setHand(playerThree.id, [], 1, 1); setTurn(quick.data.room.code, me.seat);
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(Array.from({ length: 12 }, (_, index) => card("Dodge", `crossbow-bot-draw-${index}`))))}, discard_json='[]' WHERE code=${quote(quick.data.room.code)}`);
  await request("end_turn", { code: quick.data.room.code, token: quick.data.token });
  const botRound = await waitForState(quick.data.room.code, quick.data.token, (room) => room.turnSeat === me.seat && room.phase === "draw");
  assert.ok(botRound.players.find((player) => player.id === playerOne.id).equipmentCards.some((equipment) => equipment.kind === "ZhugeCrossbow"));
  assert.ok(botRound.log.some((entry) => /Player 1 equips Zhuge Crossbow/.test(entry)));
});

test("Green Dragon Blade grants range 3 and chains Attack after Dodge", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, , bob] = game.members; const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(hostPlayer.id)}`);
  setEquipment(hostPlayer.id); setHand(hostPlayer.id, [card("GreenDragonBlade", "human"), card("Attack", "dragon-first"), card("Attack", "dragon-follow-up")], 4, 4);
  setHand(alicePlayer.id, [], 4, 4); setHand(bobPlayer.id, [card("Dodge", "dragon")], 4, 4); setHand(carolPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  sql(`UPDATE rooms SET discard_json='[]' WHERE code=${quote(game.code)}`);

  const equipped = await request("play_card", { code: game.code, token: host.token, cardId: "greendragonblade-human" });
  const publicHost = equipped.data.room.players.find((player) => player.id === hostPlayer.id);
  assert.equal(publicHost.equipmentCards[0].kind, "GreenDragonBlade"); assert.equal(publicHost.attackRange, 3);
  assert.equal(equipped.data.room.players.find((player) => player.id === bobPlayer.id).distance, 2, "Bob is opposite Host at distance 2");

  const firstAttack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-dragon-first", targetId: bobPlayer.id });
  assert.equal(firstAttack.status, 200); assert.equal(firstAttack.data.room.pendingAttack.targetId, bobPlayer.id, "range 3 permits the opposite target");
  assert.equal(firstAttack.data.room.pendingAttack.origin, "card", "normal Attack uses the shared Attack declaration");
  assert.equal(firstAttack.data.room.pendingAttack.physicalCardId, "attack-dragon-first", "the physical Attack remains available to source-sensitive rules");
  const dodged = await request("respond_dodge", { code: game.code, token: bob.token, cardId: "dodge-dragon" });
  assert.equal(dodged.status, 200); assert.equal(dodged.data.room.pendingGreenDragon.actorId, hostPlayer.id); assert.equal(dodged.data.room.actionPlayerId, hostPlayer.id);
  const followed = await request("respond_green_dragon", { code: game.code, token: host.token, cardId: "attack-dragon-follow-up" });
  assert.equal(followed.status, 200); assert.equal(followed.data.room.pendingAttack, null, "an exhausted defender takes follow-up damage without another response");
  const damaged = await takeDamageIfPending(game.code, bob.token);
  assert.equal(damaged.status, 200); assert.equal(damaged.data.room.players.find((player) => player.id === bobPlayer.id).hp, 3); assert.equal(damaged.data.room.phase, "play-struck");
  assert.equal(damaged.data.room.timeline.filter((event) => event.type === "card" && event.player === "Host" && event.card.kind === "Attack").length, 2);

  setHand(hostPlayer.id, [card("Attack", "dragon-skip-first"), card("Attack", "dragon-kept")], 4, 4); setHand(bobPlayer.id, [card("Dodge", "dragon-skip")], 3, 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "attack-dragon-skip-first", targetId: bobPlayer.id })).status, 200);
  assert.equal((await request("respond_dodge", { code: game.code, token: bob.token, cardId: "dodge-dragon-skip" })).data.room.pendingGreenDragon.actorId, hostPlayer.id);
  const skipped = await request("pass_green_dragon", { code: game.code, token: host.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.phase, "play-struck"); assert.ok(skipped.data.room.myHand.some((held) => held.id === "attack-dragon-kept"), "skipping preserves the unused follow-up Attack");

  const quick = await request("create", { quickStart: true, botTest: true }); const [me, playerOne, playerTwo, playerThree] = quick.data.room.players;
  setEquipment(playerOne.id); setHand(me.id, [], me.hp, me.maxHp); setHand(playerOne.id, [card("GreenDragonBlade", "bot"), card("Attack", "dragon-bot-first"), card("Attack", "dragon-bot-follow-up")], 1, 1); setHand(playerTwo.id, [card("Dodge", "dragon-bot-first"), card("Dodge", "dragon-bot-follow-up")], 1, 1); setHand(playerThree.id, [], 1, 1); setTurn(quick.data.room.code, me.seat);
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(Array.from({ length: 20 }, (_, index) => card("Dodge", `dragon-bot-draw-${index}`))))}, discard_json='[]' WHERE code=${quote(quick.data.room.code)}`);
  assert.equal((await request("end_turn", { code: quick.data.room.code, token: quick.data.token })).status, 200);
  const botRound = await waitForState(quick.data.room.code, quick.data.token, (room) => room.turnSeat === me.seat && room.phase === "draw");
  assert.equal(botRound.players.find((player) => player.id === playerOne.id).equipmentCards[0].kind, "GreenDragonBlade");
  assert.equal(botRound.timeline.filter((event) => event.type === "card" && event.player === "Player 1" && event.card.kind === "Attack").length, 2, "the bot uses the Green Dragon Blade follow-up");
  assert.ok(botRound.log.some((entry) => /Green Dragon Blade may continue/.test(entry)));
});

test("Serpent Spear grants range 3 and forms Attack from exactly two hand cards", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice, bob] = game.members; const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(hostPlayer.id)}`);
  setEquipment(hostPlayer.id);
  setHand(hostPlayer.id, [card("SerpentSpear", "human"), card("Peach", "serpent-one"), card("Dodge", "serpent-two")], 4, 4);
  setHand(alicePlayer.id, [], 4, 4); setHand(bobPlayer.id, [card("Dodge", "serpent-answer")], 4, 4); setHand(carolPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  sql(`UPDATE rooms SET discard_json='[]' WHERE code=${quote(game.code)}`);

  const equipped = await request("play_card", { code: game.code, token: host.token, cardId: "serpentspear-human" });
  const publicHost = equipped.data.room.players.find((player) => player.id === hostPlayer.id);
  assert.equal(publicHost.equipmentCards[0].kind, "SerpentSpear"); assert.equal(publicHost.attackRange, 3);
  assert.equal(equipped.data.room.players.find((player) => player.id === bobPlayer.id).distance, 2);
  assert.equal((await request("serpent_spear_attack", { code: game.code, token: host.token, cardIds: ["peach-serpent-one", "peach-serpent-one"], targetId: bobPlayer.id })).status, 409, "the same card cannot pay both costs");

  const formed = await request("serpent_spear_attack", { code: game.code, token: host.token, cardIds: ["peach-serpent-one", "dodge-serpent-two"], targetId: bobPlayer.id });
  assert.equal(formed.status, 200); assert.equal(formed.data.room.pendingAttack.targetId, bobPlayer.id); assert.equal(formed.data.room.pendingAttack.sequenceStartCardId, "peach-serpent-one");
  assert.equal(formed.data.room.pendingAttack.origin, "serpent_spear", "Serpent Spear uses the same Attack declaration with preserved provenance");
  assert.equal(formed.data.room.pendingAttack.physicalCardId, undefined, "a formed Attack has no single physical Attack card");
  const formedEvent = formed.data.room.timeline.find((event) => event.type === "cards" && event.action === "play" && event.player === "Host");
  assert.deepEqual(formedEvent.cards.map((item) => item.id), ["peach-serpent-one", "dodge-serpent-two"]); assert.equal(formedEvent.target, "Bob");
  const dodged = await request("respond_dodge", { code: game.code, token: bob.token, cardId: "dodge-serpent-answer" });
  assert.equal(dodged.status, 200); assert.equal(dodged.data.room.phase, "play-struck"); assert.ok(discardIds(game.code).includes("peach-serpent-one"));

  setEquipment(alicePlayer.id, { weapon: card("SerpentSpear", "duel") });
  setHand(hostPlayer.id, [card("Duel", "serpent")], 4, 4); setHand(alicePlayer.id, [card("Peach", "duel-one"), card("Dodge", "duel-two")], 4, 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "duel-serpent", targetId: alicePlayer.id })).status, 200);
  const duelAnswer = await request("respond_duel", { code: game.code, token: alice.token, cardIds: ["peach-duel-one", "dodge-duel-two"] });
  assert.equal(duelAnswer.status, 200); assert.equal(duelAnswer.data.room.pendingDuel.actorId, hostPlayer.id); assert.ok(duelAnswer.data.room.timeline.some((event) => event.type === "cards" && event.action === "play" && event.player === "Alice"));

  setEquipment(alicePlayer.id, { weapon: card("SerpentSpear", "invasion") });
  setHand(hostPlayer.id, [card("BarbarianInvasion", "serpent")], 4, 4); setHand(alicePlayer.id, [card("Peach", "invasion-one"), card("Dodge", "invasion-two")], 4, 4); setHand(bobPlayer.id, [], 4, 4); setHand(carolPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "barbarianinvasion-serpent" })).status, 200);
  const invasionAnswer = await request("respond_group", { code: game.code, token: alice.token, cardIds: ["peach-invasion-one", "dodge-invasion-two"] });
  assert.equal(invasionAnswer.status, 200); assert.equal(invasionAnswer.data.room.pendingGroup, null); assert.equal(invasionAnswer.data.room.players.find(p => p.id === bobPlayer.id).hp, 3); assert.equal(invasionAnswer.data.room.players.find(p => p.id === carolPlayer.id).hp, 3); assert.ok(invasionAnswer.data.room.timeline.some((event) => event.type === "cards" && event.action === "play" && event.player === "Alice"));

  setEquipment(hostPlayer.id, { weapon: card("SerpentSpear", "trigrams-spear") });
  setEquipment(alicePlayer.id, { armor: card("EightTrigrams", "trigrams-spear-armor") });
  setHand(hostPlayer.id, [card("Peach", "trigrams-spear-cost-1"), card("Dodge", "trigrams-spear-cost-2")], 4, 4);
  setHand(alicePlayer.id, [], 3, 4); setDeck(game.code, [{ ...card("Peach", "trigrams-spear-judgement"), suit: "♥", rank: "7" }]); setTurn(game.code, hostPlayer.seat);
  const spearTrigrams = await request("serpent_spear_attack", { code: game.code, token: host.token, cardIds: ["peach-trigrams-spear-cost-1", "dodge-trigrams-spear-cost-2"], targetId: alicePlayer.id });
  assert.equal(spearTrigrams.status, 200); assert.equal(spearTrigrams.data.room.pendingAttack?.actorId, alicePlayer.id, "Serpent Spear opens the defender's Dodge response");
  const spearJudgement = await request("respond_eight_trigrams", { code: game.code, token: alice.token });
  assert.equal(spearJudgement.status, 200); assert.equal(spearJudgement.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3, "red Eight Trigrams judgement blocks a Serpent Spear Attack");

  const quick = await request("create", { quickStart: true, botTest: true }); const [me, playerOne, playerTwo, playerThree] = quick.data.room.players;
  setEquipment(playerOne.id); setHand(me.id, [], me.hp, me.maxHp); setHand(playerOne.id, [card("SerpentSpear", "bot"), card("Peach", "bot-one"), card("Dodge", "bot-two")], 1, 1); setHand(playerTwo.id, [card("Dodge", "bot-answer")], 1, 1); setHand(playerThree.id, [], 1, 1); setTurn(quick.data.room.code, me.seat);
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(Array.from({ length: 20 }, (_, index) => card("Peach", `serpent-bot-draw-${index}`))))}, discard_json='[]' WHERE code=${quote(quick.data.room.code)}`);
  assert.equal((await request("end_turn", { code: quick.data.room.code, token: quick.data.token })).status, 200);
  const botRound = await waitForState(quick.data.room.code, quick.data.token, (room) => room.turnSeat === me.seat && room.phase === "draw");
  assert.equal(botRound.players.find((player) => player.id === playerOne.id).equipmentCards[0].kind, "SerpentSpear");
  assert.ok(botRound.timeline.some((event) => event.type === "cards" && event.action === "play" && event.player === "Player 1"), "the bot forms an Attack from two cards");
  assert.ok(botRound.log.some((entry) => /Player 1 discards 2 cards with Serpent Spear to form an Attack/.test(entry)));
});

test("Rock Cleaving Axe grants range 3 and can discard any two cards after Dodge to force damage", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice, bob] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice"); const bobPlayer = game.room.players.find((player) => player.name === "Bob");
  assert.ok(hostPlayer && alicePlayer && bobPlayer);

  setHand(hostPlayer.id, [card("RockCleavingAxe", "equip")], 4, 5); setTurn(game.code, hostPlayer.seat);
  const equipped = await request("play_card", { code: game.code, token: host.token, cardId: "rockcleavingaxe-equip" });
  const publicHost = equipped.data.room.players.find((player) => player.id === hostPlayer.id);
  assert.equal(publicHost.equipmentCards[0].kind, "RockCleavingAxe"); assert.equal(publicHost.attackRange, 3);
  assert.equal(equipped.data.room.players.find((player) => player.id === bobPlayer.id).distance, 2);

  setHand(hostPlayer.id, [card("Attack", "axe-skip"), card("Peach", "axe-skip-one")], 4, 5); setHand(alicePlayer.id, [card("Dodge", "axe-skip")], 4); setTurn(game.code, hostPlayer.seat);
  const dodgePrompt = await request("play_card", { code: game.code, token: host.token, cardId: "attack-axe-skip", targetId: alicePlayer.id });
  assert.equal(dodgePrompt.status, 200); assert.equal(dodgePrompt.data.room.pendingAttack.deadline, 0, "Dodge waits for the visible-decision timer");
  const skippedPrompt = await request("respond_dodge", { code: game.code, token: alice.token, cardId: "dodge-axe-skip" });
  assert.equal(skippedPrompt.data.room.pendingRockCleaving.actorId, hostPlayer.id); assert.equal(skippedPrompt.data.room.actionPlayerId, hostPlayer.id);
  assert.equal(skippedPrompt.data.room.pendingRockCleaving.deadline, 0, "Rock Cleaving Axe waits for the visible-decision timer after Dodge");
  assert.equal((await request("respond_rock_cleaving", { code: game.code, token: bob.token, cardIds: ["peach-axe-skip-one", "rockcleavingaxe-equip"] })).status, 409, "only the attacker owns the Axe decision");
  assert.equal((await request("respond_rock_cleaving", { code: game.code, token: host.token, cardIds: ["peach-axe-skip-one", "peach-axe-skip-one"] })).status, 409, "the same card cannot pay both costs");
  const timed = await request("start_response_timer", { code: game.code, token: host.token }); assert.ok(timed.data.room.pendingRockCleaving.deadline - Date.now() > 25_000, "the visible Axe prompt arms its human response deadline");
  const repeatedAxeTimer = await request("start_response_timer", { code: game.code, token: host.token }); assert.equal(repeatedAxeTimer.data.room.pendingRockCleaving.deadline, timed.data.room.pendingRockCleaving.deadline, "repeated Axe timer starts preserve the original deadline");
  const skipped = await request("pass_rock_cleaving", { code: game.code, token: host.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.phase, "play-struck"); assert.equal(skipped.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

  setHand(hostPlayer.id, [card("Attack", "axe-force"), card("Peach", "axe-cost")], 4, 5); setHand(alicePlayer.id, [card("Dodge", "axe-force")], 2); setEquipment(hostPlayer.id, { weapon: card("RockCleavingAxe", "cost") }); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "attack-axe-force", targetId: alicePlayer.id })).status, 200);
  const forcePrompt = await request("respond_dodge", { code: game.code, token: alice.token, cardId: "dodge-axe-force" });
  assert.equal(forcePrompt.data.room.pendingRockCleaving.sequenceStartCardId, "attack-axe-force");
  const forced = await request("respond_rock_cleaving", { code: game.code, token: host.token, cardIds: ["peach-axe-cost", "rockcleavingaxe-cost"] });
  assert.equal(forced.status, 200); assert.equal(forced.data.room.phase, "play-struck"); assert.equal(forced.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.equal(forced.data.room.players.find((player) => player.id === hostPlayer.id).equipmentCards.length, 0, "the Axe itself may be one of the two discarded cards");
  assert.ok(discardIds(game.code).includes("peach-axe-cost")); assert.ok(discardIds(game.code).includes("rockcleavingaxe-cost"));
  const axeCostEvent = forced.data.room.timeline.find((event) => event.type === "cards" && event.message?.includes("Rock Cleaving Axe"));
  assert.deepEqual(axeCostEvent.cards.map((item) => item.id), ["peach-axe-cost", "rockcleavingaxe-cost"]);

  const quick = await request("create", { quickStart: true, botTest: true }); const [me, playerOne, playerTwo, playerThree] = quick.data.room.players;
  setHand(me.id, [], me.hp, me.maxHp); setEquipment(playerOne.id, { weapon: card("RockCleavingAxe", "bot") });
  setHand(playerOne.id, [card("Attack", "axe-bot"), card("Peach", "axe-bot-cost")], 1, 1); setHand(playerTwo.id, [card("Dodge", "axe-bot")], 1, 1); setHand(playerThree.id, [], 1, 1); setTurn(quick.data.room.code, me.seat);
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(Array.from({ length: 20 }, (_, index) => card("Peach", `axe-bot-draw-${index}`))))}, discard_json='[]' WHERE code=${quote(quick.data.room.code)}`);
  assert.equal((await request("end_turn", { code: quick.data.room.code, token: quick.data.token })).status, 200);
  const botRound = await waitForState(quick.data.room.code, quick.data.token, (room) => room.turnSeat === me.seat && room.phase === "draw");
  assert.ok(botRound.log.some((entry) => /Player 1 discards 2 cards with Rock Cleaving Axe/.test(entry)), "a bot uses the Axe after its Attack is dodged");
});

test("Sky Piercing Halberd expands a last-hand Attack to up to three ordered Dodge responses", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice, bob, carol] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  setHand(hostPlayer.id, [card("SkyPiercingHalberd", "equip")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const equipped = await request("play_card", { code: game.code, token: host.token, cardId: "skypiercinghalberd-equip" });
  assert.equal(equipped.status, 200); assert.equal(equipped.data.room.players.find((player) => player.id === hostPlayer.id).attackRange, 4);

  setHand(hostPlayer.id, [card("Attack", "last")], 4, 4); setHand(alicePlayer.id, [card("Dodge", "alice")], 4, 4); setHand(bobPlayer.id, [], 4, 4); setHand(carolPlayer.id, [card("Dodge", "carol")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const launched = await request("play_card", { code: game.code, token: host.token, cardId: "attack-last", targetIds: [alicePlayer.id, bobPlayer.id, carolPlayer.id] });
  assert.equal(launched.status, 200); assert.equal(launched.data.room.pendingGroup.cardKind, "SkyPiercingHalberdAttack"); assert.equal(launched.data.room.pendingGroup.actorId, alicePlayer.id); assert.equal(launched.data.room.pendingGroup.deadline, 0, "the human Halberd response waits for the visible-decision timer");
  assert.deepEqual(discardIds(game.code), [], "the final-hand Attack remains held until every Halberd target has resolved");
  const aliceDodge = await request("respond_group", { code: game.code, token: alice.token, cardId: "dodge-alice" });
  assert.equal(aliceDodge.status, 200); assert.equal(aliceDodge.data.room.pendingGroup.actorId, carolPlayer.id, "the target without Dodge takes damage immediately and the next eligible seat becomes active");
  const bobDamage = { status: 200, data: { room: (await state(game.code, bob.token)).data } };
  assert.equal(bobDamage.status, 200); assert.equal(bobDamage.data.room.pendingGroup.actorId, carolPlayer.id); assert.equal(bobDamage.data.room.players.find((player) => player.id === bobPlayer.id).hp, 3);
  const carolDodge = await request("respond_group", { code: game.code, token: carol.token, cardId: "dodge-carol" });
  assert.equal(carolDodge.status, 200); assert.equal(carolDodge.data.room.phase, "play-struck");
  assert.ok(carolDodge.data.room.log.some((entry) => /Sky Piercing Halberd Attack finishes resolving/.test(entry)));
  assert.deepEqual(discardIds(game.code), ["attack-last", "dodge-alice", "dodge-carol"], "the Attack and every Dodge discard together after the sequence finishes");

  setHand(hostPlayer.id, [card("Attack", "not-last"), card("Peach", "kept")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const rejected = await request("play_card", { code: game.code, token: host.token, cardId: "attack-not-last", targetIds: [alicePlayer.id, bobPlayer.id] });
  assert.equal(rejected.status, 400, "the Halberd cannot expand an Attack unless it was the final hand card");

  const quick = await request("create", { quickStart: true, botTest: true }); const [me, playerOne, playerTwo, playerThree] = quick.data.room.players;
  setHand(me.id, [], me.hp, me.maxHp); setEquipment(playerOne.id, { weapon: card("SkyPiercingHalberd", "bot") }); setHand(playerOne.id, [card("Attack", "bot-last")], 1, 1); setHand(playerTwo.id, [card("Dodge", "bot-one")], 1, 1); setHand(playerThree.id, [card("Dodge", "bot-two")], 1, 1); setTurn(quick.data.room.code, me.seat);
  sql(`UPDATE rooms SET deck_json='[]', discard_json='[]' WHERE code=${quote(quick.data.room.code)}`);
  assert.equal((await request("end_turn", { code: quick.data.room.code, token: quick.data.token })).status, 200);
  const botRound = await waitForState(quick.data.room.code, quick.data.token, (room) => room.turnSeat === me.seat && room.phase === "draw");
  assert.ok(botRound.log.some((entry) => /Sky Piercing Halberd/.test(entry)), "a bot uses its final Attack against multiple targets when equipped");
});

test("Frost Sword offers its owner the choice to prevent Attack damage and discard up to two target cards", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members; const [hostPlayer, alicePlayer] = game.room.players;
  setHand(hostPlayer.id, [card("FrostSword", "equip")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const equipped = await request("play_card", { code: game.code, token: host.token, cardId: "frostsword-equip" });
  assert.equal(equipped.status, 200); assert.equal(equipped.data.room.players.find((player) => player.id === hostPlayer.id).attackRange, 2);
  setHand(hostPlayer.id, [card("Attack", "attack")], 4, 4); setHand(alicePlayer.id, [card("Peach", "one"), card("Dodge", "two"), card("Peach", "three")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const attack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-attack", targetId: alicePlayer.id });
  assert.equal(attack.status, 200);
  const damage = await takeDamageIfPending(game.code, alice.token);
  assert.equal(damage.status, 200); assert.equal(damage.data.room.pendingFrostSword.actorId, hostPlayer.id);
  const frost = await request("use_frost_sword", { code: game.code, token: host.token, cardKeys: ["hand:0", "hand:1"] });
  assert.equal(frost.status, 200); assert.equal(frost.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4, "Frost Sword prevents the Attack damage"); assert.equal(frost.data.room.players.find((player) => player.id === alicePlayer.id).handCount, 1, "Frost Sword discards two target cards");

  setHand(hostPlayer.id, [card("Attack", "judgement-only")], 4, 4); setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [card("Lightning", "protected-zone")]); setTurn(game.code, hostPlayer.seat);
  const judgementOnlyAttack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-judgement-only", targetId: alicePlayer.id });
  assert.equal(judgementOnlyAttack.status, 200);
  const judgementOnlyDamage = await takeDamageIfPending(game.code, alice.token);
  assert.equal(judgementOnlyDamage.status, 200);
  assert.equal(judgementOnlyDamage.data.room.pendingFrostSword, null, "a Judgement Zone card alone cannot open Frost Sword's discard branch");
  assert.equal(judgementOnlyDamage.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3, "Attack damage is dealt when Frost Sword has no eligible Hand or Equipment card");

  const quick = await request("create", { quickStart: true, botTest: true }); const [me, bot] = quick.data.room.players;
  setEquipment(me.id, { weapon: card("FrostSword", "quick") }); setHand(me.id, [card("Attack", "quick")], me.hp, me.maxHp); setHand(bot.id, [card("Peach", "one"), card("Peach", "two")], 1, 1); setTurn(quick.data.room.code, me.seat);
  const botTarget = await request("play_card", { code: quick.data.room.code, token: quick.data.token, cardId: "attack-quick", targetId: bot.id });
  assert.equal(botTarget.status, 200); assert.equal(botTarget.data.room.pendingFrostSword.actorId, me.id, "an undefended bot target also opens the Frost Sword owner prompt");
});

test("Nio Shield occupies the Armor slot and prevents black Attack before Dodge or damage", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members; const [hostPlayer, alicePlayer, bobPlayer] = game.room.players;
  setHand(alicePlayer.id, [card("NioShield", "equip")], 4, 4); setTurn(game.code, alicePlayer.seat);
  const equipped = await request("play_card", { code: game.code, token: alice.token, cardId: "nioshield-equip" });
  assert.equal(equipped.status, 200);
  assert.ok(equipped.data.room.players.find((player) => player.id === alicePlayer.id).equipmentCards.some((item) => item.kind === "NioShield"), "Nio Shield is visible in the target's Armor slot");

  setHand(hostPlayer.id, [card("Attack", "black")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const blackAttack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-black", targetId: alicePlayer.id });
  assert.equal(blackAttack.status, 200);
  assert.equal(blackAttack.data.room.phase, "play-struck", "the black Attack finishes without opening a Dodge response");
  assert.equal(blackAttack.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4, "Nio Shield prevents the black Attack's damage");
  assert.ok(blackAttack.data.room.log.some((entry) => /Nio Shield makes them immune/.test(entry)));

  const redAttack = { ...card("Attack", "red"), suit: "♥" };
  setHand(hostPlayer.id, [redAttack], 4, 4); setTurn(game.code, hostPlayer.seat);
  const redPrompt = await request("play_card", { code: game.code, token: host.token, cardId: redAttack.id, targetId: alicePlayer.id });
  assert.equal(redPrompt.status, 200); assert.equal(redPrompt.data.room.pendingAttack, null, "red Attack damages an undefended player despite Nio Shield");
  const redDamage = await takeDamageIfPending(game.code, alice.token);
  assert.equal(redDamage.status, 200); assert.equal(redDamage.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3, "Nio Shield does not prevent red Attack damage");

  setEquipment(hostPlayer.id, { weapon: card("SkyPiercingHalberd", "nio") }); setHand(hostPlayer.id, [card("Attack", "halberd-black")], 4, 4); setHand(bobPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  const halberdAttack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-halberd-black", targetIds: [alicePlayer.id, bobPlayer.id] });
  assert.equal(halberdAttack.status, 200); assert.equal(halberdAttack.data.room.pendingGroup, null, "Nio Shield prevents its damage and the remaining target without Dodge takes damage immediately"); assert.equal(halberdAttack.data.room.players.find((player) => player.id === bobPlayer.id).hp, 3);
  assert.ok(halberdAttack.data.room.log.some((entry) => /Nio Shield makes them immune/.test(entry)));

  const quick = await request("create", { quickStart: true, botTest: true }); const [me, bot] = quick.data.room.players;
  setEquipment(bot.id, { armor: card("NioShield", "bot") }); setHand(me.id, [card("Attack", "bot-black")], me.hp, me.maxHp); setTurn(quick.data.room.code, me.seat);
  const botShield = await request("play_card", { code: quick.data.room.code, token: quick.data.token, cardId: "attack-bot-black", targetId: bot.id });
  assert.equal(botShield.status, 200); assert.equal(botShield.data.room.players.find((player) => player.id === bot.id).hp, bot.hp, "a shielded bot also ignores a black Attack without consuming Dodge");
});

test("Eight Trigrams offers optional red Judgement as Dodge and black Judgement fails", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members; const [hostPlayer, alicePlayer] = game.room.players;
  setEquipment(alicePlayer.id, { armor: card("EightTrigrams", "armor") }); setHand(alicePlayer.id, [], 4, 4); setHand(hostPlayer.id, [card("Attack", "trigrams-red")], 4, 4);
  setDeck(game.code, [{ ...card("Peach", "judgement-red"), suit: "♥", rank: "7" }]); setTurn(game.code, hostPlayer.seat);
  const redAttack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-trigrams-red", targetId: alicePlayer.id });
  assert.equal(redAttack.status, 200); assert.equal(redAttack.data.room.pendingAttack.actorId, alicePlayer.id);
  const redView = await state(game.code, alice.token);
  assert.equal(redView.data.currentAction.requirement, "dodge");
  assert.ok(redView.data.currentAction.options.some((option) => option.providerId === "eight_trigrams_dodge"));
  const redResult = await request("respond", { code: game.code, token: alice.token, providerId: "eight_trigrams_dodge" });
  assert.equal(redResult.status, 200); assert.equal(redResult.data.room.pendingAttack, null); assert.equal(redResult.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

  setHand(hostPlayer.id, [card("Attack", "trigrams-black")], 4, 4); setDeck(game.code, [{ ...card("Peach", "judgement-black"), suit: "♣", rank: "8" }]); setTurn(game.code, hostPlayer.seat);
  const blackAttack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-trigrams-black", targetId: alicePlayer.id });
  assert.equal(blackAttack.status, 200); const blackResult = await request("respond_eight_trigrams", { code: game.code, token: alice.token });
  assert.equal(blackResult.status, 200); assert.equal(blackResult.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3); assert.ok(blackResult.data.room.log.some((entry) => /Eight Trigrams Formation/.test(entry)));

});

test("generic response executes Zhen Ji's black-card Dodge without a physical Dodge", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);
  sql(`UPDATE players SET hero='zhen-ji' WHERE id=${quote(alicePlayer.id)}`);
  const blackPeach = { ...card("Peach", "qingguo"), suit: "♠" };
  setHand(hostPlayer.id, [card("Attack", "qingguo")], 4, 5); setHand(alicePlayer.id, [blackPeach], 4); setTurn(game.code, hostPlayer.seat);
  const attacked = await request("play_card", { code: game.code, token: host.token, cardId: "attack-qingguo", targetId: alicePlayer.id });
  assert.equal(attacked.status, 200);
  const aliceView = await state(game.code, alice.token);
  assert.ok(aliceView.data.currentAction.options.some((option) => option.providerId === "zhen_ji_black_card_dodge"));
  const resolved = await request("respond", { code: game.code, token: alice.token, providerId: "zhen_ji_black_card_dodge", cardId: blackPeach.id });
  assert.equal(resolved.status, 200);
  assert.equal(resolved.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);
  assert.ok(discardIds(game.code).includes(blackPeach.id));
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

test("Quick Test follows the live actor for Something Out of Nothing and rejects stale actions", { timeout: 30_000 }, async () => {
  const quick = await request("create", { quickStart: true }); const { token, room } = quick.data;
  const [me, playerOne, playerTwo, playerThree] = room.players;
  setHand(me.id, [], 3, 3); setHand(playerOne.id, [card("DrawTwo", "quick-live")], 3, 3); setHand(playerTwo.id, [card("Negation", "quick-live")], 3, 3); setHand(playerThree.id, [], 3, 3); setTurn(room.code, playerOne.seat, "play");
  const before = await state(room.code, token);
  const played = await request("play_card", { code: room.code, token, cardId: "drawtwo-quick-live" });
  assert.equal(played.status, 200); assert.equal(played.data.room.phase, "response");
  assert.equal(played.data.room.pendingNegation.kind, "negation", "the public pending DTO retains its discriminator for the client normalizer");
  assert.deepEqual(played.data.room.pending, { kind: "response" }, "the canonical pending view exposes one semantic response discriminator");
  assert.equal(played.data.room.currentAction.kind, "response"); assert.equal(played.data.room.currentAction.actorId, playerTwo.id);
  assert.deepEqual(played.data.room.currentAction.legalActions.sort(), ["decline_response", "respond"], "only the active Quick Test seat receives canonical response actions");
  assert.equal(played.data.room.currentAction.requirement, "negate");
  assert.equal(played.data.room.currentAction.options[0]?.providerId, "negation_card");
  assert.equal(played.data.room.pendingNegation.actorId, playerTwo.id); assert.equal(played.data.room.actionPlayerId, playerTwo.id); assert.equal(played.data.room.meId, playerTwo.id); assert.equal(played.data.room.isMyAction, true);
  assert.ok(played.data.room.timeline.some((event) => /Negation window opens for Something Out of Nothing's effect on Player 1/.test(event.message ?? "")), "the response window is visible in the event history");
  const stale = await request("pass_negation", { code: room.code, token, context: { actionRevision: before.data.actionRevision, meId: playerOne.id, phase: "play", pendingKind: null, actorId: playerOne.id } });
  assert.equal(stale.status, 409); assert.equal(stale.data.stale, true); assert.equal(stale.data.room.meId, playerTwo.id); assert.equal(stale.data.room.pendingNegation.actorId, playerTwo.id);
  const passed = await request("pass_negation", { code: room.code, token });
  assert.equal(passed.status, 200); assert.equal(passed.data.room.phase, "play"); assert.equal(passed.data.room.pendingNegation, null);
  assert.ok(passed.data.room.timeline.some((event) => /Negation window closes for Something Out of Nothing's effect on Player 1/.test(event.message ?? "")), "the completed response window is visible in the event history");
});

test("Quick Test Something Out of Nothing resolves without a generic damage response", { timeout: 30_000 }, async () => {
  const quick = await request("create", { quickStart: true }); const { token, room } = quick.data;
  const [me, playerOne, playerTwo, playerThree] = room.players;
  setHand(me.id, [], 3, 3); setHand(playerOne.id, [card("DrawTwo", "quick-no-negation")], 3, 3); setHand(playerTwo.id, [], 3, 3); setHand(playerThree.id, [], 3, 3); setTurn(room.code, playerOne.seat, "play");
  const result = await request("play_card", { code: room.code, token, cardId: "drawtwo-quick-no-negation" });
  assert.equal(result.status, 200); assert.equal(result.data.room.phase, "play"); assert.equal(result.data.room.pendingNegation, null); assert.equal(result.data.room.pendingGroup, null); assert.equal(result.data.room.players.find((player) => player.id === playerOne.id).hp, 3); assert.equal(result.data.drawnCards.length, 2);
});

test("Quick Test accepts only one competing response submission", { timeout: 30_000 }, async () => {
  const quick = await request("create", { quickStart: true }); const { token, room } = quick.data;
  const [me, playerOne, playerTwo, playerThree] = room.players;
  setHand(me.id, [card("BarbarianInvasion", "quick-race")], 3, 3); setHand(playerOne.id, [card("Attack", "quick-race")], 3, 3); setHand(playerTwo.id, [], 3, 3); setHand(playerThree.id, [], 3, 3); setTurn(room.code, me.seat, "play");
  const started = await request("play_card", { code: room.code, token, cardId: "barbarianinvasion-quick-race" });
  assert.equal(started.status, 200); assert.equal(started.data.room.pendingGroup.actorId, playerOne.id);
  const [manual, timeout] = await Promise.all([
    request("respond_group", { code: room.code, token, cardId: "attack-quick-race" }),
    request("take_group_damage", { code: room.code, token }),
  ]);
  assert.equal([manual.status, timeout.status].filter((status) => status === 200).length, 1);
  assert.equal([manual.status, timeout.status].filter((status) => status === 409).length, 1);
  const final = await state(room.code, token);
  assert.equal(final.data.pendingGroup, null); assert.equal(final.data.phase, "play"); assert.equal(final.data.meId, me.id);
});

test("Negation cancels a stratagem and a counter-Negation restores it in ordered response", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);

  setHand(hostPlayer.id, [card("Dismantle", "cancelled")], 5, 5);
  setHand(alicePlayer.id, [card("Attack", "protected"), card("Negation", "cancel")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  const opened = await request("play_card", { code: game.code, token: host.token, cardId: "dismantle-cancelled", targetId: alicePlayer.id, targetCardIndex: 0 });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.phase, "response"); assert.equal(opened.data.room.pendingNegation.cardName, "Burning Bridges"); assert.equal(opened.data.room.pendingNegation.responseTarget, "Burning Bridges's effect on Alice"); assert.equal(opened.data.room.actionPlayerId, alicePlayer.id);
  assert.equal(opened.data.room.discardTop, null, "Burning Bridges stays outside discard while its Negation decision is open");
  const cancelled = await request("respond_negation", { code: game.code, token: alice.token, cardId: "negation-cancel" });
  assert.equal(cancelled.status, 200); assert.equal(cancelled.data.room.phase, "play"); assert.equal(cancelled.data.room.pendingNegation, null);
  assert.equal((await state(game.code, alice.token)).data.myHand.some((held) => held.id === "attack-protected"), true, "the cancelled stratagem does not discard its target card");

  setHand(hostPlayer.id, [card("Dismantle", "restored"), card("Negation", "counter")], 5, 5);
  setHand(alicePlayer.id, [card("Attack", "removed"), card("Negation", "first")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  const reopened = await request("play_card", { code: game.code, token: host.token, cardId: "dismantle-restored", targetId: alicePlayer.id, targetCardIndex: 0 });
  assert.equal(reopened.data.room.actionPlayerId, hostPlayer.id, "the initial response starts with the source");
  assert.equal(reopened.data.room.discardTop.id, "negation-cancel", "the previous completed discard remains visible while the new sequence is pending");
  const firstNegation = await request("pass_negation", { code: game.code, token: host.token });
  assert.equal(firstNegation.data.room.actionPlayerId, alicePlayer.id);
  const firstPlayed = await request("respond_negation", { code: game.code, token: alice.token, cardId: "negation-first" });
  assert.equal(firstPlayed.data.room.actionPlayerId, hostPlayer.id);
  assert.equal(firstPlayed.data.room.pendingNegation.responseTarget, "Alice's Negation", "the counter window names the latest Negation rather than the root Stratagem");
  assert.equal(firstPlayed.data.room.discardTop.id, "negation-cancel", "neither Burning Bridges nor the first Negation enters discard before the counter decision");
  const restored = await request("respond_negation", { code: game.code, token: host.token, cardId: "negation-counter" });
  assert.equal(restored.status, 200); assert.equal(restored.data.room.phase, "response"); assert.equal(restored.data.room.pendingTargetCard.cardKind, "Dismantle");
  assert.equal((await state(game.code, alice.token)).data.myHand.some((held) => held.id === "attack-removed"), true, "the target card is not chosen before Negation finishes");
  const chosen = await request("choose_target_card", { code: game.code, token: host.token, targetCardZone: "hand", targetCardIndex: 0 });
  assert.equal(chosen.status, 200); assert.equal(chosen.data.room.phase, "play");
  assert.equal(chosen.data.room.discardTop.id, "attack-removed", "the revealed target card enters discard only when the complete sequence finishes");
  assert.equal((await state(game.code, alice.token)).data.myHand.some((held) => held.id === "attack-removed"), false, "counter-Negation restores the original stratagem effect");
  assert.ok(chosen.data.room.log.some((entry) => /plays Negation to restore Burning Bridges/.test(entry)));
  const finalDiscard = JSON.parse(query(`SELECT discard_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.deepEqual(finalDiscard.slice(-4).map((held) => held.id), ["dismantle-restored", "negation-first", "negation-counter", "attack-removed"], "the entire Burning Bridges sequence commits to discard together in play order");
});

test("only the affected bot negates a targeted stratagem; later bots do not counter it", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const host = game.members[0];
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const playerOne = game.room.players.find((player) => player.name === "Alice"); const playerTwo = game.room.players.find((player) => player.name === "Bob"); const playerThree = game.room.players.find((player) => player.name === "Carol");
  assert.ok(hostPlayer && playerOne && playerTwo && playerThree);
  for (const player of [playerOne, playerTwo, playerThree]) sql(`UPDATE players SET token_hash=${quote(`bot:${player.id}`)} WHERE id=${quote(player.id)}`);
  setHand(hostPlayer.id, [card("Steal", "bot-negation")], 5, 5);
  setHand(playerOne.id, [card("Negation", "player-1"), card("Attack", "protected")], 4, 4);
  setHand(playerTwo.id, [card("Negation", "player-2")], 4, 4);
  setHand(playerThree.id, [card("Negation", "player-3")], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  const result = await request("play_card", { code: game.code, token: host.token, cardId: "steal-bot-negation", targetId: playerOne.id, targetCardIndex: 1 });
  assert.equal(result.status, 200); assert.equal(result.data.room.phase, "play"); assert.equal(result.data.room.pendingNegation, null);
  const oneHand = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(playerOne.id)}`)); const twoHand = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(playerTwo.id)}`)); const threeHand = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(playerThree.id)}`));
  assert.equal(oneHand.some((held) => held.kind === "Negation"), false, "Player 1 spends one Negation to stop Steal");
  assert.equal(oneHand.some((held) => held.id === "attack-protected"), true, "Steal is cancelled");
  assert.equal(twoHand.some((held) => held.kind === "Negation"), true, "Player 2 does not counter Player 1");
  assert.equal(threeHand.some((held) => held.kind === "Negation"), true, "Player 3 does not counter Player 1");
  assert.equal(result.data.room.timeline.filter((event) => event.type === "card" && event.card.kind === "Negation").length, 1);
});

test("Steal chooses from the target's current zones only after counter-Negation", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);
  const spear = card("SerpentSpear", "post-negation-prize");
  setHand(hostPlayer.id, [card("Steal", "post-negation"), card("Negation", "restore-steal")], 5, 5);
  setHand(alicePlayer.id, [card("Negation", "cancel-steal")], 4, 4); setEquipment(alicePlayer.id, { weapon: spear }); setTurn(game.code, hostPlayer.seat);

  const opened = await request("play_card", { code: game.code, token: host.token, cardId: "steal-post-negation", targetId: alicePlayer.id });
  assert.equal(opened.data.room.pendingTargetCard, null, "target cards are not selected or exposed before Negation responses finish");
  await request("pass_negation", { code: game.code, token: host.token });
  await request("respond_negation", { code: game.code, token: alice.token, cardId: "negation-cancel-steal" });
  const restored = await request("respond_negation", { code: game.code, token: host.token, cardId: "negation-restore-steal" });
  assert.equal(restored.data.room.pendingTargetCard.targetId, alicePlayer.id); assert.equal(restored.data.room.players.find((player) => player.id === alicePlayer.id).handCount, 0);
  assert.equal(restored.data.room.players.find((player) => player.id === alicePlayer.id).equipmentCards[0].id, spear.id);
  const obtained = await request("choose_target_card", { code: game.code, token: host.token, targetCardZone: "equipment", targetCardId: spear.id });
  assert.equal(obtained.status, 200); assert.equal(obtained.data.room.phase, "play"); assert.ok(obtained.data.room.myHand.some((held) => held.id === spear.id));
  assert.equal(obtained.data.room.players.find((player) => player.id === alicePlayer.id).equipmentCards.length, 0);
  assert.equal(obtained.data.room.log.some((entry) => /no valid card left/.test(entry)), false);
  assert.deepEqual(discardIds(game.code).slice(-3), ["steal-post-negation", "negation-cancel-steal", "negation-restore-steal"]);
});

test("Negation cancels an AOE for one target and the card continues in seat order", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice, bob, carol] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice"); const bobPlayer = game.room.players.find((player) => player.name === "Bob"); const carolPlayer = game.room.players.find((player) => player.name === "Carol");
  assert.ok(hostPlayer && alicePlayer && bobPlayer && carolPlayer);

  for (const { kind, requiredKind } of [{ kind: "BarbarianInvasion", requiredKind: "Attack" }, { kind: "RainingArrows", requiredKind: "Dodge" }]) {
    setHand(hostPlayer.id, [card(kind, "per-target"), card("Negation", `${kind}-counter-option`)], 5, 5);
    setHand(alicePlayer.id, [card("Negation", `${kind}-alice`)], 4, 4);
    setHand(bobPlayer.id, [card(requiredKind, `${kind}-bob`)], 4, 4);
    setHand(carolPlayer.id, [card(requiredKind, `${kind}-carol`)], 4, 4);
    setTurn(game.code, hostPlayer.seat);
    sql(`UPDATE rooms SET discard_json='[]' WHERE code=${quote(game.code)}`);

    const opened = await request("play_card", { code: game.code, token: host.token, cardId: `${kind.toLowerCase()}-per-target` });
    assert.equal(opened.status, 200); assert.equal(opened.data.room.pendingNegation.effectTargetId, alicePlayer.id); assert.equal(opened.data.room.actionPlayerId, hostPlayer.id);
    await request("pass_negation", { code: game.code, token: host.token });
    assert.deepEqual(discardIds(game.code), [], `${kind} stays staged while Alice decides whether to Negate`);
    const aliceNegates = await request("respond_negation", { code: game.code, token: alice.token, cardId: `negation-${kind}-alice` });
    assert.equal(aliceNegates.status, 200); assert.equal(aliceNegates.data.room.actionPlayerId, hostPlayer.id, "the source may immediately counter or skip after a target Negates");
    assert.deepEqual(discardIds(game.code), [], `the ${kind} and first Negation both remain staged`);
    const counterTimer = await request("start_response_timer", { code: game.code, token: host.token }); assert.ok(counterTimer.data.room.pendingNegation.deadline > Date.now());
    const repeatedCounterTimer = await request("start_response_timer", { code: game.code, token: host.token }); assert.equal(repeatedCounterTimer.data.room.pendingNegation.deadline, counterTimer.data.room.pendingNegation.deadline, "counter-Negation timer remains idempotent");
    const protectedAlice = await request("pass_negation", { code: game.code, token: host.token });
    assert.equal(protectedAlice.status, 200); assert.equal(protectedAlice.data.room.pendingNegation.effectTargetId, bobPlayer.id, `${kind} opens Bob's separate Negation opportunity`);
    const bobWindowClosed = await request("pass_negation", { code: game.code, token: host.token });
    assert.equal(bobWindowClosed.data.room.pendingNegation, null); assert.equal(bobWindowClosed.data.room.pendingGroup.actorId, bobPlayer.id);
    assert.equal(protectedAlice.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

    const bobResponse = await request("respond_group", { code: game.code, token: bob.token, cardId: `${requiredKind.toLowerCase()}-${kind}-bob` });
    assert.equal(bobResponse.status, 200); assert.equal(bobResponse.data.room.pendingNegation.effectTargetId, carolPlayer.id, `${kind} continues to Carol after Bob responds`);
    const carolWindowClosed = await request("pass_negation", { code: game.code, token: host.token });
    assert.equal(carolWindowClosed.data.room.pendingGroup.actorId, carolPlayer.id);
    assert.deepEqual(discardIds(game.code), [], `${kind}, Negation, and Bob's response remain staged`);
    const finished = await request("respond_group", { code: game.code, token: carol.token, cardId: `${requiredKind.toLowerCase()}-${kind}-carol` });
    assert.equal(finished.status, 200); assert.equal(finished.data.room.phase, "play"); assert.equal(finished.data.room.pendingGroup, null);
    assert.ok(finished.data.room.log.some((entry) => new RegExp(`${kind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows"}'s effect on Alice is cancelled`).test(entry)));
    assert.deepEqual(discardIds(game.code), [`${kind.toLowerCase()}-per-target`, `negation-${kind}-alice`, `${requiredKind.toLowerCase()}-${kind}-bob`, `${requiredKind.toLowerCase()}-${kind}-carol`], "the complete AOE sequence enters discard once, in play order");
  }
});

test("Overindulgence uses the Judgement Zone and skips only a failed target's Play Phase", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice"); const bobPlayer = game.room.players.find((player) => player.name === "Bob");
  assert.ok(hostPlayer && alicePlayer && bobPlayer);

  setHand(hostPlayer.id, [card("Overindulgence", "cancelled")], 5, 5); setHand(alicePlayer.id, [card("Negation", "overindulgence")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const opened = await request("play_card", { code: game.code, token: host.token, cardId: "overindulgence-cancelled", targetId: alicePlayer.id });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.pendingNegation.effectTargetId, alicePlayer.id);
  const cancelled = await request("respond_negation", { code: game.code, token: alice.token, cardId: "negation-overindulgence" });
  assert.equal(cancelled.status, 200); assert.deepEqual(cancelled.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, [], "Negation prevents placement in the Judgement Zone");

  setHand(hostPlayer.id, [card("Overindulgence", "placed")], 5, 5); setHand(alicePlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  const placed = await request("play_card", { code: game.code, token: host.token, cardId: "overindulgence-placed", targetId: alicePlayer.id });
  assert.equal(placed.status, 200); assert.equal(placed.data.room.phase, "play"); assert.equal(placed.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards[0].id, "overindulgence-placed");
  setHand(hostPlayer.id, [card("Overindulgence", "duplicate")], 5, 5); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "overindulgence-duplicate", targetId: alicePlayer.id })).status, 409, "a Judgement Zone cannot contain duplicate Overindulgence cards");

  setHand(alicePlayer.id, [], 4, 4); setTurn(game.code, alicePlayer.seat, "draw");
  const failedJudge = { ...card("Dodge", "failed-judge"), suit: "♠", rank: "7" }; const failedDraws = [card("Attack", "failed-draw-1"), card("Peach", "failed-draw-2")];
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([failedJudge, ...failedDraws]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const skipped = await request("draw", { code: game.code, token: alice.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.phase, "discard"); assert.equal(skipped.data.drawnCards.length, 2); assert.deepEqual(skipped.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, []);
  assert.ok(skipped.data.room.timeline.some((event) => event.type === "card" && event.action === "reveal" && event.card.id === "dodge-failed-judge"));
  assert.ok(skipped.data.room.log.some((entry) => /not a Heart, so the Play Phase is skipped/.test(entry)));
  const ended = await request("discard_cards", { code: game.code, token: alice.token, cardIds: [] });
  assert.equal(ended.status, 200); assert.equal(ended.data.room.turnSeat, bobPlayer.seat);

  const heartDelayed = { ...card("Overindulgence", "heart"), suit: "♣", rank: "6" }; const heartJudge = { ...card("Dodge", "heart-judge"), suit: "♥", rank: "9" };
  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [heartDelayed]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([heartJudge, card("Attack", "heart-draw-1"), card("Attack", "heart-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const passed = await request("draw", { code: game.code, token: alice.token });
  assert.equal(passed.status, 200); assert.equal(passed.data.room.phase, "play"); assert.ok(passed.data.room.log.some((entry) => /Heart result allows the Play Phase/.test(entry)));

  const negatedAtJudgement = { ...card("Overindulgence", "judgement-negated"), suit: "♥", rank: "6" };
  setHand(alicePlayer.id, [card("Negation", "judgement-window")], 4, 4); setJudgement(alicePlayer.id, [negatedAtJudgement]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([card("Dodge", "unused-judgement"), card("Attack", "post-negation-draw-1"), card("Attack", "post-negation-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const judgementWindow = await request("draw", { code: game.code, token: alice.token });
  assert.equal(judgementWindow.status, 200); assert.equal(judgementWindow.data.room.phase, "response"); assert.equal(judgementWindow.data.room.pendingNegation.cardName, "Overindulgence"); assert.equal(judgementWindow.data.room.actionPlayerId, alicePlayer.id);
  const judgementCancelled = await request("respond_negation", { code: game.code, token: alice.token, cardId: "negation-judgement-window" });
  assert.equal(judgementCancelled.status, 200); assert.equal(judgementCancelled.data.room.phase, "draw"); assert.deepEqual(judgementCancelled.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, []);
  const afterJudgementNegation = await request("draw", { code: game.code, token: alice.token });
  assert.equal(afterJudgementNegation.status, 200); assert.equal(afterJudgementNegation.data.room.phase, "play"); assert.equal(afterJudgementNegation.data.room.timeline.some((event) => event.card?.id === "dodge-unused-judgement"), false, "Negation cancels the delayed effect before a judgement card is drawn");

  const quick = await request("create", { quickStart: true, botTest: true }); const [me, playerOne, playerTwo, playerThree] = quick.data.room.players;
  for (const player of [me, playerOne, playerTwo, playerThree]) setHand(player.id, [], player.hp, player.maxHp);
  setJudgement(playerOne.id, [{ ...card("Overindulgence", "bot-judge"), suit: "♣", rank: "6" }]); setTurn(quick.data.room.code, me.seat, "play");
  const botJudge = { ...card("Dodge", "bot-judgement-result"), suit: "♣", rank: "8" }; const botDeck = [botJudge, ...Array.from({ length: 20 }, (_, index) => card("Dodge", `bot-overindulgence-draw-${index}`))];
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(botDeck))}, discard_json='[]' WHERE code=${quote(quick.data.room.code)}`);
  assert.equal((await request("end_turn", { code: quick.data.room.code, token: quick.data.token })).status, 200);
  const botRoundFinished = await waitForState(quick.data.room.code, quick.data.token, (room) => room.turnSeat === me.seat && room.phase === "draw");
  assert.deepEqual(botRoundFinished.players.find((player) => player.id === playerOne.id).judgementCards, []); assert.ok(botRoundFinished.log.some((entry) => /Player 1 skips the Play Phase because of Overindulgence/.test(entry)));
});

test("Lightning is placed on self, transfers after a miss, and deals 3 thunder damage on Spade 2-9", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice"); const bobPlayer = game.room.players.find((player) => player.name === "Bob");
  assert.ok(hostPlayer && alicePlayer && bobPlayer);

  for (const player of game.room.players) setHand(player.id, player.id === hostPlayer.id ? [card("Lightning", "placed")] : [], 5, 5);
  setTurn(game.code, hostPlayer.seat, "play");
  const placed = await request("play_card", { code: game.code, token: host.token, cardId: "lightning-placed" });
  assert.equal(placed.status, 200); assert.equal(placed.data.room.phase, "play");
  assert.equal(placed.data.room.players.find((player) => player.id === hostPlayer.id).judgementCards[0].id, "lightning-placed");
  setHand(hostPlayer.id, [card("Lightning", "duplicate")], 5, 5); setTurn(game.code, hostPlayer.seat, "play");
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "lightning-duplicate" })).status, 409);

  const negatedJudgementLightning = { ...card("Lightning", "judgement-window"), suit: "♦", rank: "Q" };
  setHand(alicePlayer.id, [card("Negation", "lightning-judgement-window")], 4, 4); setJudgement(alicePlayer.id, [negatedJudgementLightning]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([card("Dodge", "unused-lightning-judge")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const judgementNegationWindow = await request("draw", { code: game.code, token: alice.token });
  assert.equal(judgementNegationWindow.status, 200); assert.equal(judgementNegationWindow.data.room.pendingNegation.cardName, "Lightning");
  const latestLightningEvent = judgementNegationWindow.data.room.timeline.filter((event) => event.type === "card" && event.card.id === "lightning-judgement-window").at(-1);
  assert.equal(latestLightningEvent.action, "activate", "a fresh judgement activation anchors the current Negation presentation instead of the original turn's discards");
  assert.equal((await request("respond_negation", { code: game.code, token: alice.token, cardId: "negation-lightning-judgement-window" })).data.room.phase, "draw");

  const missedLightning = { ...card("Lightning", "miss"), suit: "♠", rank: "K" }; const missJudge = { ...card("Dodge", "miss-judge"), suit: "♥", rank: "7" };
  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [missedLightning]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([missJudge, card("Attack", "miss-draw-1"), card("Peach", "miss-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const missed = await request("draw", { code: game.code, token: alice.token });
  assert.equal(missed.status, 200); assert.equal(missed.data.room.phase, "play"); assert.equal(missed.data.drawnCards.length, 2);
  assert.deepEqual(missed.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, []);
  assert.equal(missed.data.room.players.find((player) => player.id === bobPlayer.id).judgementCards[0].id, "lightning-miss");
  assert.ok(missed.data.room.log.some((entry) => /Lightning misses and transfers to Bob/.test(entry)));

  const hitLightning = { ...card("Lightning", "hit"), suit: "♥", rank: "A" }; const hitJudge = { ...card("Attack", "hit-judge"), suit: "♠", rank: "5" };
  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [hitLightning]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([hitJudge, card("Attack", "hit-draw-1"), card("Dodge", "hit-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const hit = await request("draw", { code: game.code, token: alice.token });
  assert.equal(hit.status, 200); assert.equal(hit.data.room.phase, "play"); assert.equal(hit.data.drawnCards.length, 2);
  assert.equal(hit.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.deepEqual(hit.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, []);
  assert.ok(hit.data.room.log.some((entry) => /takes 3 thunder damage/.test(entry)));

  for (const player of game.room.players) setHand(player.id, [], player.id === alicePlayer.id ? 1 : 4, player.id === hostPlayer.id ? 5 : 4);
  setJudgement(alicePlayer.id, [{ ...card("Lightning", "lethal"), suit: "♦", rank: "Q" }]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([{ ...card("Attack", "lethal-judge"), suit: "♠", rank: "8" }, card("Attack", "unused-lethal-draw")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const lethal = await request("draw", { code: game.code, token: alice.token });
  assert.equal(lethal.status, 200); assert.equal(lethal.data.room.players.find((player) => player.id === alicePlayer.id).alive, false, "an unrescued Lightning victim is defeated");
  assert.equal(lethal.data.room.turnSeat, bobPlayer.seat, "source-free Lightning defeat advances to the next living turn owner");
});

test("Rations Depleted targets at distance 1 and skips only a failed target's Draw Phase", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice"); const bobPlayer = game.room.players.find((player) => player.name === "Bob");
  assert.ok(hostPlayer && alicePlayer && bobPlayer);

  setHand(hostPlayer.id, [card("RationsDepleted", "far")], 5, 5); setTurn(game.code, hostPlayer.seat, "play");
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "rationsdepleted-far", targetId: bobPlayer.id })).status, 409, "Rations Depleted cannot target a character at distance 2");
  setHand(hostPlayer.id, [card("RationsDepleted", "placement-negated")], 5, 5); setHand(alicePlayer.id, [card("Negation", "rations-placement")], 4, 4); setTurn(game.code, hostPlayer.seat, "play");
  const placementWindow = await request("play_card", { code: game.code, token: host.token, cardId: "rationsdepleted-placement-negated", targetId: alicePlayer.id });
  assert.equal(placementWindow.status, 200); assert.equal(placementWindow.data.room.pendingNegation.cardName, "Rations Depleted");
  const placementCancelled = await request("respond_negation", { code: game.code, token: alice.token, cardId: "negation-rations-placement" });
  assert.equal(placementCancelled.status, 200); assert.deepEqual(placementCancelled.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, [], "Negation cancels Rations Depleted before placement");
  setHand(hostPlayer.id, [card("RationsDepleted", "placed")], 5, 5); setTurn(game.code, hostPlayer.seat, "play");
  const placed = await request("play_card", { code: game.code, token: host.token, cardId: "rationsdepleted-placed", targetId: alicePlayer.id });
  assert.equal(placed.status, 200); assert.equal(placed.data.room.phase, "play"); assert.equal(placed.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards[0].id, "rationsdepleted-placed");
  setHand(hostPlayer.id, [card("RationsDepleted", "duplicate")], 5, 5); setTurn(game.code, hostPlayer.seat, "play");
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "rationsdepleted-duplicate", targetId: alicePlayer.id })).status, 409, "a Judgement Zone cannot contain duplicate Rations Depleted cards");

  const failedRations = { ...card("RationsDepleted", "failed"), suit: "♣", rank: "4" }; const failedJudge = { ...card("Dodge", "failed-rations-judge"), suit: "♠", rank: "10" };
  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [failedRations]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([failedJudge, card("Attack", "blocked-draw-1"), card("Peach", "blocked-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const skipped = await request("draw", { code: game.code, token: alice.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.phase, "play"); assert.equal(skipped.data.drawnCards, undefined); assert.equal(skipped.data.room.myHand.length, 0, "failed Rations Depleted draws no cards but still allows Play");
  assert.ok(skipped.data.room.log.some((entry) => /not a Club, so the Draw Phase is skipped/.test(entry)));
  assert.ok(discardIds(game.code).includes("rationsdepleted-failed")); assert.ok(discardIds(game.code).includes("dodge-failed-rations-judge"));

  const clubRations = { ...card("RationsDepleted", "club"), suit: "♠", rank: "10" }; const clubJudge = { ...card("Dodge", "club-rations-judge"), suit: "♣", rank: "7" };
  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [clubRations]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([clubJudge, card("Attack", "club-draw-1"), card("Peach", "club-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const passed = await request("draw", { code: game.code, token: alice.token });
  assert.equal(passed.status, 200); assert.equal(passed.data.room.phase, "play"); assert.equal(passed.data.drawnCards.length, 2); assert.ok(passed.data.room.log.some((entry) => /Club result allows the Draw Phase/.test(entry)));

  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [{ ...card("RationsDepleted", "combined"), suit: "♠", rank: "10" }, { ...card("Overindulgence", "combined"), suit: "♥", rank: "6" }]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([{ ...card("Dodge", "combined-rations-judge"), suit: "♠", rank: "10" }, { ...card("Dodge", "combined-overindulgence-judge"), suit: "♣", rank: "7" }, card("Attack", "combined-unused-draw")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const firstDelayed = await request("draw", { code: game.code, token: alice.token });
  assert.equal(firstDelayed.status, 200); assert.equal(firstDelayed.data.room.phase, "draw-skip-draw"); assert.equal(firstDelayed.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards.length, 1);
  const combinedSkip = await request("draw", { code: game.code, token: alice.token });
  assert.equal(combinedSkip.status, 200); assert.equal(combinedSkip.data.room.phase, "discard"); assert.equal(combinedSkip.data.drawnCards, undefined); assert.equal(combinedSkip.data.room.myHand.length, 0, "Rations Depleted and Overindulgence preserve both skipped phases across consecutive judgements");

  const negatedRations = { ...card("RationsDepleted", "judgement-negated"), suit: "♠", rank: "10" };
  setHand(alicePlayer.id, [card("Negation", "rations-judgement-window")], 4, 4); setJudgement(alicePlayer.id, [negatedRations]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([card("Dodge", "unused-rations-judge"), card("Attack", "negated-draw-1"), card("Peach", "negated-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const judgementWindow = await request("draw", { code: game.code, token: alice.token });
  assert.equal(judgementWindow.status, 200); assert.equal(judgementWindow.data.room.pendingNegation.cardName, "Rations Depleted");
  const cancelled = await request("respond_negation", { code: game.code, token: alice.token, cardId: "negation-rations-judgement-window" });
  assert.equal(cancelled.status, 200); assert.equal(cancelled.data.room.phase, "draw");
  const afterNegation = await request("draw", { code: game.code, token: alice.token });
  assert.equal(afterNegation.status, 200); assert.equal(afterNegation.data.drawnCards.length, 2); assert.equal(afterNegation.data.room.timeline.some((event) => event.card?.id === "dodge-unused-rations-judge"), false);

  const quick = await request("create", { quickStart: true, botTest: true }); const [me, playerOne, playerTwo, playerThree] = quick.data.room.players;
  for (const player of [me, playerOne, playerTwo, playerThree]) setHand(player.id, player.id === playerOne.id ? [card("RationsDepleted", "bot-play")] : [], player.hp, player.maxHp);
  setTurn(quick.data.room.code, me.seat, "play");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(Array.from({ length: 20 }, (_, index) => card("Dodge", `rations-bot-${index}`))))}, discard_json='[]' WHERE code=${quote(quick.data.room.code)}`);
  assert.equal((await request("end_turn", { code: quick.data.room.code, token: quick.data.token })).status, 200);
  const botRoundFinished = await waitForState(quick.data.room.code, quick.data.token, (room) => room.turnSeat === me.seat && room.phase === "draw");
  assert.ok(botRoundFinished.log.some((entry) => /Player 1 plays Rations Depleted on Player 2/.test(entry)), "a bot plays Rations Depleted on an adjacent target");
  assert.ok(botRoundFinished.log.some((entry) => /Player 2 skips the Draw Phase because of Rations Depleted/.test(entry)), "a bot resolves the skipped Draw Phase and continues its turn");
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

test("bot Bumper Harvest resolves in seat order and pauses only for ME", { timeout: 30_000 }, async () => {
  const quick = await request("create", { quickStart: true, botTest: true });
  const token = quick.data.token; const code = quick.data.room.code;
  const [me, playerOne, playerTwo, playerThree] = quick.data.room.players;
  setHand(me.id, [], 10, 10); setHand(playerOne.id, [card("BumperHarvest", "bot")], 10, 10); setHand(playerTwo.id, [], 10, 10); setHand(playerThree.id, [], 10, 10); setTurn(code, me.seat);
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(Array.from({ length: 20 }, (_, index) => card("Dodge", `bot-harvest-${index}`))))}, discard_json='[]' WHERE code=${quote(code)}`);
  assert.equal((await request("end_turn", { code, token })).status, 200);
  const firstBotPreview = await waitForState(code, token, (room) => room.pendingHarvest?.previewCardId && room.pendingHarvest.choices.length === 0);
  assert.equal(firstBotPreview.pendingHarvest.actorId, playerOne.id); assert.equal(firstBotPreview.pendingHarvest.availableIds.length, 4);
  const firstBotConfirmed = await waitForState(code, token, (room) => room.pendingHarvest?.choices.length === 1);
  assert.equal(firstBotConfirmed.pendingHarvest.choices[0].playerName, "Player 1"); assert.equal(firstBotConfirmed.pendingHarvest.previewCardId, null);
  const prompt = await waitForState(code, token, (room) => room.phase === "response" && room.pendingHarvest && room.isMyAction);
  assert.equal(prompt.turnSeat, playerOne.seat); assert.equal(prompt.pendingHarvest.actorId, me.id); assert.equal(prompt.pendingHarvest.revealed.length, 4); assert.equal(prompt.pendingHarvest.availableIds.length, 1); assert.equal(prompt.pendingHarvest.choices.length, 3);
  assert.equal(prompt.timeline.filter((event) => event.type === "card" && event.action === "gain").length, 3);
  const chosenId = prompt.pendingHarvest.availableIds[0];
  const chosen = await request("choose_harvest", { code, token, cardId: chosenId });
  assert.equal(chosen.status, 200); assert.equal(chosen.data.room.pendingHarvest.complete, true); assert.equal(chosen.data.room.pendingHarvest.choices.length, 4);
  const returned = await waitForState(code, token, (room) => room.turnSeat === me.seat && room.phase === "draw");
  assert.ok(returned.myHand.some((held) => held.id === chosenId));
  assert.ok(returned.timeline.some((event) => event.type === "card" && event.player === "Player 1" && event.card.kind === "BumperHarvest"));
});

test("bot global cards resolve across consecutive rounds and return the turn to ME", { timeout: 30_000 }, async () => {
  const quick = await request("create", { quickStart: true, botTest: true });
  const token = quick.data.token; const code = quick.data.room.code;
  const [me, playerOne, playerTwo, playerThree] = quick.data.room.players;
  const defensiveDeck = (prefix) => Array.from({ length: 20 }, (_, index) => card("Dodge", `${prefix}-${index}`));

  setHand(me.id, [card("Attack", "invasion-response")], me.hp, me.maxHp); setHand(playerOne.id, [card("BarbarianInvasion", "bot-round")], 1, 1); setHand(playerTwo.id, [card("Negation", "invasion-protection")], 1, 1); setHand(playerThree.id, [card("Attack", "invasion-response")], 1, 1); setTurn(code, me.seat);
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(defensiveDeck("invasion-draw")))}, discard_json='[]' WHERE code=${quote(code)}`);
  assert.equal((await request("end_turn", { code, token })).status, 200);
  const invasionForMe = await waitForState(code, token, (room) => room.phase === "response" && room.pendingGroup?.cardKind === "BarbarianInvasion" && room.isMyAction);
  assert.equal(invasionForMe.turnSeat, playerOne.seat); assert.equal(invasionForMe.pendingGroup.sourceId, playerOne.id);
  assert.equal((await request("respond_group", { code, token, cardId: "attack-invasion-response" })).status, 200);
  const afterInvasion = await waitForState(code, token, (room) => room.turnSeat === me.seat && room.phase === "draw");
  assert.equal(afterInvasion.isMyTurn, true); assert.ok(afterInvasion.timeline.some((event) => event.type === "card" && event.player === "Player 1" && event.card.kind === "BarbarianInvasion"));
  const invasionResponses = afterInvasion.timeline.filter((event) => event.type === "card" && event.card.id === "attack-invasion-response");
  assert.equal(invasionResponses.length, 2); assert.ok(invasionResponses.every((event) => event.target === event.player), "human and bot Attack responses to Barbarian Invasion are directionless");
  assert.ok(afterInvasion.timeline.some((event) => event.type === "card" && event.player === "Player 2" && event.card.id === "negation-invasion-protection"), "a bot can Negate a bot-played AOE for itself");
  assert.ok(afterInvasion.timeline.some((event) => /Barbarian Invasion's effect on Player 2 is cancelled/.test(event.message ?? "")));

  setHand(me.id, [card("Dodge", "arrows-response")], me.hp, me.maxHp); setHand(playerOne.id, [card("Dodge", "arrows-response-1")], 1, 1); setHand(playerTwo.id, [card("Dodge", "arrows-response-2")], 1, 1); setHand(playerThree.id, [card("RainingArrows", "bot-round")], 1, 1); setTurn(code, me.seat);
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(defensiveDeck("arrows-draw")))}, discard_json='[]' WHERE code=${quote(code)}`);
  assert.equal((await request("end_turn", { code, token })).status, 200);
  const arrowsForMe = await waitForState(code, token, (room) => room.phase === "response" && room.pendingGroup?.cardKind === "RainingArrows" && room.isMyAction);
  assert.equal(arrowsForMe.turnSeat, playerThree.seat); assert.equal(arrowsForMe.pendingGroup.sourceId, playerThree.id);
  assert.equal((await request("respond_group", { code, token, cardId: "dodge-arrows-response" })).status, 200);
  const afterArrows = await waitForState(code, token, (room) => room.turnSeat === me.seat && room.phase === "draw");
  assert.equal(afterArrows.isMyTurn, true); assert.ok(afterArrows.timeline.some((event) => event.type === "card" && event.player === "Player 3" && event.card.kind === "RainingArrows"));
  const botArrowResponses = afterArrows.timeline.filter((event) => event.type === "card" && event.card.id.startsWith("dodge-arrows-response"));
  assert.ok(botArrowResponses.length >= 1); assert.ok(botArrowResponses.every((event) => event.target === event.player));
});

test("Dying rescue resumes a global response chain and victory stops it immediately", { timeout: 30_000 }, async () => {
  const rescuedGame = await createHumanGame();
  const [host, , bob, carol] = rescuedGame.members; const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = rescuedGame.room.players;
  setHand(hostPlayer.id, [card("BarbarianInvasion", "rescue-chain")], 5, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [card("Peach", "rescue-chain")], 4, 4); setHand(carolPlayer.id, [card("Attack", "rescue-chain")], 4, 4); setTurn(rescuedGame.code, hostPlayer.seat);
  sql(`UPDATE rooms SET discard_json='[]' WHERE code=${quote(rescuedGame.code)}`);
  const started = await request("play_card", { code: rescuedGame.code, token: host.token, cardId: "barbarianinvasion-rescue-chain" });
  const dying = started;
  assert.equal(dying.data.room.phase, "dying"); assert.equal(dying.data.room.pendingGroup.cardKind, "BarbarianInvasion", "the AOE sequence remains visible through Dying rescue"); assert.deepEqual(discardIds(rescuedGame.code), []);
  const bobPrompt = await state(rescuedGame.code, bob.token); assert.equal(bobPrompt.data.isMyAction, true); assert.equal(bobPrompt.data.pendingDying.targetId, alicePlayer.id);
  const rescued = await request("give_peach", { code: rescuedGame.code, token: bob.token, cardId: "peach-rescue-chain" });
  assert.equal(rescued.data.room.phase, "response"); assert.equal(rescued.data.room.actionPlayerId, carolPlayer.id); assert.equal(rescued.data.room.turnSeat, hostPlayer.seat);
  assert.equal(rescued.data.room.players.find(p => p.id === bobPlayer.id).hp, 3);
  assert.deepEqual(discardIds(rescuedGame.code), [], "the rescue Peach remains part of the active AOE sequence");
  const bobResponded = await request("take_group_damage", { code: rescuedGame.code, token: bob.token });
  assert.equal(bobResponded.status, 409);
  const chainFinished = await request("respond_group", { code: rescuedGame.code, token: carol.token, cardId: "attack-rescue-chain" });
  assert.equal(chainFinished.data.room.phase, "play"); assert.equal(chainFinished.data.room.turnSeat, hostPlayer.seat); assert.equal(chainFinished.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.deepEqual(discardIds(rescuedGame.code), ["barbarianinvasion-rescue-chain", "peach-rescue-chain", "attack-rescue-chain"], "AOE, rescue, and response cards enter discard together after the chain finishes");

  const victoryGame = await createHumanGame();
  const [winner] = victoryGame.members; const [lord, lastRebel, loyalistOne, loyalistTwo] = victoryGame.room.players;
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(lord.id)}; UPDATE players SET role='Rebel' WHERE id=${quote(lastRebel.id)}; UPDATE players SET role='Loyalist' WHERE id IN (${quote(loyalistOne.id)},${quote(loyalistTwo.id)})`);
  setHand(lord.id, [card("BarbarianInvasion", "winning-chain")], 5, 5); setHand(lastRebel.id, [], 1, 4); setHand(loyalistOne.id, [], 4, 4); setHand(loyalistTwo.id, [], 4, 4); setTurn(victoryGame.code, lord.seat);
  const winningCard = await request("play_card", { code: victoryGame.code, token: winner.token, cardId: "barbarianinvasion-winning-chain" });
  const victory = winningCard;
  assert.equal(victory.status, 200); assert.equal(victory.data.room.status, "finished"); assert.equal(victory.data.room.phase, "finished"); assert.equal(victory.data.room.pendingGroup, null);
  assert.equal(victory.data.room.players.find((player) => player.id === loyalistOne.id).hp, 4); assert.equal(victory.data.room.players.find((player) => player.id === loyalistTwo.id).hp, 4);
  assert.ok(victory.data.room.timeline.some((event) => /Lord and Loyalist victory/.test(event.message ?? "")));
  assert.equal(discardIds(victoryGame.code).filter((id) => id === "barbarianinvasion-winning-chain").length, 1, "victory commits the held global card exactly once");
  assert.equal((await request("draw", { code: victoryGame.code, token: winner.token })).status, 409, "no action is accepted after victory");
});

test("classic role deaths apply cleanup, rewards, penalties, and victory rules", { timeout: 30_000 }, async () => {
  const loyalistPenaltyGame = await createHumanGame();
  const [lordMember, loyalistMember, , traitorTargetMember] = loyalistPenaltyGame.members;
  const [lord, loyalist, rebel, traitor] = loyalistPenaltyGame.room.players;
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(lord.id)}; UPDATE players SET role='Loyalist' WHERE id=${quote(loyalist.id)}; UPDATE players SET role='Rebel' WHERE id=${quote(rebel.id)}; UPDATE players SET role='Renegade' WHERE id=${quote(traitor.id)}`);
  setHand(lord.id, [card("Attack", "loyalist-penalty"), card("DrawTwo", "lord-discard"), card("Dismantle", "lord-discard")], 5, 5);
  setHand(loyalist.id, [card("DrawTwo", "defeated-discard"), card("Dismantle", "defeated-discard")], 1, 4);
  setEquipment(lord.id, { weapon: card("ZhugeCrossbow", "lord-penalty") }); setEquipment(loyalist.id, { weapon: card("ZhugeCrossbow", "defeated-discard") });
  setHand(rebel.id, [], 4, 4); setHand(traitor.id, [], 4, 4); setTurn(loyalistPenaltyGame.code, lord.seat);
  await request("play_card", { code: loyalistPenaltyGame.code, token: lordMember.token, cardId: "attack-loyalist-penalty", targetId: loyalist.id });
  await takeDamageIfPending(loyalistPenaltyGame.code, loyalistMember.token);
  const penalisedState = await state(loyalistPenaltyGame.code, lordMember.token);
  const penalised = { status: penalisedState.status, data: { room: penalisedState.data } };
  assert.equal(penalised.status, 200); assert.equal(penalised.data.room.status, "playing");
  assert.equal(penalised.data.room.myHand.length, 0, "the Lord discards every remaining hand card after defeating a Loyalist");
  assert.equal(penalised.data.room.players.find((player) => player.id === loyalist.id).alive, false);
  assert.equal(penalised.data.room.players.find((player) => player.id === loyalist.id).handCount, 0, "a defeated player's hand is cleared");
  assert.deepEqual(penalised.data.room.players.find((player) => player.id === lord.id).equipmentCards, [], "the Lord's Loyalist-kill penalty clears equipment");
  assert.deepEqual(penalised.data.room.players.find((player) => player.id === loyalist.id).equipmentCards, [], "a defeated player's equipment is cleared");
  assert.ok(discardIds(loyalistPenaltyGame.code).includes("zhugecrossbow-lord-penalty"));
  assert.ok(discardIds(loyalistPenaltyGame.code).includes("zhugecrossbow-defeated-discard"));
  assert.ok(penalised.data.room.timeline.some((event) => event.type === "cards" && event.action === "discard" && event.player === "Host" && event.cards.length === 2));
  assert.ok(penalised.data.room.timeline.some((event) => event.type === "cards" && event.action === "discard" && event.player === "Alice" && event.cards.length === 2));
  assert.ok(penalised.data.room.timeline.some((event) => /Lord's penalty/.test(event.message ?? "")));

  setHand(lord.id, [card("Attack", "traitor-no-reward"), card("DrawTwo", "traitor-no-reward")], 5, 5);
  setHand(traitor.id, [card("Dismantle", "traitor-defeated")], 1, 4); setTurn(loyalistPenaltyGame.code, lord.seat);
  await request("play_card", { code: loyalistPenaltyGame.code, token: lordMember.token, cardId: "attack-traitor-no-reward", targetId: traitor.id });
  await takeDamageIfPending(loyalistPenaltyGame.code, traitorTargetMember.token);
  const noTraitorReward = { data: { room: (await state(loyalistPenaltyGame.code, lordMember.token)).data } };
  assert.equal(noTraitorReward.data.room.myHand.length, 1, "defeating the Traitor grants no cards and applies no penalty");
  assert.equal(noTraitorReward.data.room.players.find((player) => player.id === traitor.id).handCount, 0);

  const nonLordGame = await createHumanGame();
  const [rebelMember, loyalistTargetMember] = nonLordGame.members; const [rebelKiller, loyalistTarget, livingLord, livingTraitor] = nonLordGame.room.players;
  sql(`UPDATE players SET role='Rebel' WHERE id=${quote(rebelKiller.id)}; UPDATE players SET role='Loyalist' WHERE id=${quote(loyalistTarget.id)}; UPDATE players SET role='Lord' WHERE id=${quote(livingLord.id)}; UPDATE players SET role='Renegade' WHERE id=${quote(livingTraitor.id)}`);
  setHand(rebelKiller.id, [card("Attack", "nonlord-loyalist"), card("DrawTwo", "nonlord-keeps")], 4, 4); setHand(loyalistTarget.id, [], 1, 4); setHand(livingLord.id, [], 5, 5); setHand(livingTraitor.id, [], 4, 4); setTurn(nonLordGame.code, rebelKiller.seat);
  await request("play_card", { code: nonLordGame.code, token: rebelMember.token, cardId: "attack-nonlord-loyalist", targetId: loyalistTarget.id });
  await takeDamageIfPending(nonLordGame.code, loyalistTargetMember.token);
  const unpenalised = { data: { room: (await state(nonLordGame.code, rebelMember.token)).data } };
  assert.equal(unpenalised.data.room.myHand.length, 1, "a non-Lord receives no penalty for defeating a Loyalist");

  const rebelRewardGame = await createHumanGame();
  const [traitorMember, rebelTargetMember] = rebelRewardGame.members; const [traitorKiller, rebelTarget, rewardLord, rewardLoyalist] = rebelRewardGame.room.players;
  sql(`UPDATE players SET role='Renegade' WHERE id=${quote(traitorKiller.id)}; UPDATE players SET role='Rebel' WHERE id=${quote(rebelTarget.id)}; UPDATE players SET role='Lord' WHERE id=${quote(rewardLord.id)}; UPDATE players SET role='Loyalist' WHERE id=${quote(rewardLoyalist.id)}`);
  setHand(traitorKiller.id, [card("Attack", "rebel-reward"), card("DrawTwo", "reward-kept")], 4, 4); setHand(rebelTarget.id, [], 1, 4); setHand(rewardLord.id, [], 5, 5); setHand(rewardLoyalist.id, [], 4, 4); setTurn(rebelRewardGame.code, traitorKiller.seat);
  await request("play_card", { code: rebelRewardGame.code, token: traitorMember.token, cardId: "attack-rebel-reward", targetId: rebelTarget.id });
  await takeDamageIfPending(rebelRewardGame.code, rebelTargetMember.token);
  const rewarded = { data: { room: (await state(rebelRewardGame.code, traitorMember.token)).data } };
  assert.equal(rewarded.data.room.myHand.length, 4, "a Traitor also draws three cards for defeating a Rebel");
  assert.ok(rewarded.data.room.timeline.some((event) => /draws 3 reward cards/.test(event.message ?? "")));

  const traitorVictoryGame = await createHumanGame();
  const [finalLordMember, traitorWinner] = traitorVictoryGame.members; const [finalLord, finalTraitor, deadRebel, deadLoyalist] = traitorVictoryGame.room.players;
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(finalLord.id)}; UPDATE players SET role='Renegade' WHERE id=${quote(finalTraitor.id)}; UPDATE players SET role='Rebel',alive=0,hp=0,hand_json='[]' WHERE id=${quote(deadRebel.id)}; UPDATE players SET role='Loyalist',alive=0,hp=0,hand_json='[]' WHERE id=${quote(deadLoyalist.id)}`);
  setHand(finalLord.id, [], 1, 5); setHand(finalTraitor.id, [card("Attack", "traitor-victory")], 4, 4); setTurn(traitorVictoryGame.code, finalTraitor.seat);
  await request("play_card", { code: traitorVictoryGame.code, token: traitorWinner.token, cardId: "attack-traitor-victory", targetId: finalLord.id });
  const traitorVictory = await takeDamageIfPending(traitorVictoryGame.code, finalLordMember.token);
  assert.equal(traitorVictory.data.room.status, "finished"); assert.ok(traitorVictory.data.room.timeline.some((event) => /Traitor victory/.test(event.message ?? "")));

  const rebelVictoryGame = await createHumanGame();
  const [fallenLordMember, falseTraitor] = rebelVictoryGame.members; const [fallenLord, attackingTraitor, survivingRebel, fallenLoyalist] = rebelVictoryGame.room.players;
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(fallenLord.id)}; UPDATE players SET role='Renegade' WHERE id=${quote(attackingTraitor.id)}; UPDATE players SET role='Rebel' WHERE id=${quote(survivingRebel.id)}; UPDATE players SET role='Loyalist',alive=0,hp=0,hand_json='[]' WHERE id=${quote(fallenLoyalist.id)}`);
  setHand(fallenLord.id, [], 1, 5); setHand(attackingTraitor.id, [card("Attack", "rebel-victory")], 4, 4); setHand(survivingRebel.id, [], 4, 4); setTurn(rebelVictoryGame.code, attackingTraitor.seat);
  await request("play_card", { code: rebelVictoryGame.code, token: falseTraitor.token, cardId: "attack-rebel-victory", targetId: fallenLord.id });
  const rebelVictory = await takeDamageIfPending(rebelVictoryGame.code, fallenLordMember.token);
  assert.equal(rebelVictory.data.room.status, "finished"); assert.ok(rebelVictory.data.room.timeline.some((event) => /Rebel victory/.test(event.message ?? "")));
});
