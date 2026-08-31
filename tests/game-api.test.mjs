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
  for (let attempt = 0; attempt < 500; attempt++) {
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
function sql(statement) { const result = spawnSync("sqlite3", ["-cmd", ".timeout 5000", databasePath(), statement], { encoding: "utf8" }); assert.equal(result.status, 0, result.stderr); }
function query(statement) { const result = spawnSync("sqlite3", ["-cmd", ".timeout 5000", databasePath(), statement], { encoding: "utf8" }); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); }
function quote(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function card(kind, suffix) { return { id: `${kind.toLowerCase()}-${suffix}`, kind, suit: "♠", rank: "A" }; }
function setHand(playerId, cards, hp, maxHp = hp) { sql(`UPDATE players SET hand_json=${quote(JSON.stringify(cards))}, hp=${hp}, max_hp=${maxHp}, alive=1 WHERE id=${quote(playerId)}`); }
function setJudgement(playerId, cards) { sql(`UPDATE players SET judgement_json=${quote(JSON.stringify(cards))} WHERE id=${quote(playerId)}`); }
function setEquipment(playerId, equipment = {}) { sql(`UPDATE players SET equipment_json=${quote(JSON.stringify(equipment))} WHERE id=${quote(playerId)}`); }
function setTurn(roomCode, seat, phase = "play") { sql(`UPDATE rooms SET turn_seat=${seat}, phase=${quote(phase)}, pending_json=NULL, status='playing' WHERE code=${quote(roomCode)}`); }
function discardIds(roomCode) { return query(`SELECT json_extract(value,'$.id') FROM rooms,json_each(rooms.discard_json) WHERE rooms.code=${quote(roomCode)}`).split("\n").filter(Boolean); }

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

test("complete room, turn, card, response, discard, bot, and audit flow", { timeout: 30_000 }, async () => {
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
  assert.deepEqual(deckComposition, ["Attack:30", "BarbarianInvasion:3", "BumperHarvest:2", "Dismantle:6", "Dodge:15", "DrawTwo:4", "Duel:3", "GreenDragonBlade:1", "Lightning:2", "Negation:3", "Oath:1", "Overindulgence:2", "Peach:8", "RainingArrows:1", "Steal:5", "ZhugeCrossbow:2"]);
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
  assert.equal((await request("start_response_timer", { code: game.code, token: bob.token })).status, 409, "only the acting player can start their response timer");
  const timedAttack = await request("start_response_timer", { code: game.code, token: alice.token });
  assert.ok(timedAttack.data.room.pendingAttack.deadline > Date.now(), "the acting player receives a visible response deadline");
  const publicAttackTimer = await state(game.code, host.token);
  assert.equal(publicAttackTimer.data.pendingAttack.deadline, timedAttack.data.room.pendingAttack.deadline, "the table can show the same countdown beside the acting player");
  assert.equal((await request("respond_dodge", { code: game.code, token: bob.token, cardId: "dodge-answer" })).status, 409);
  const dodged = await request("respond_dodge", { code: game.code, token: alice.token, cardId: "dodge-answer" });
  assert.equal(dodged.status, 200); assert.equal(dodged.data.room.phase, "play-struck"); assert.equal(dodged.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

  setHand(hostPlayer.id, [card("Attack", "damage")], 4, 5); setHand(alicePlayer.id, [], 4); setTurn(game.code, hostPlayer.seat);
  const damagePrompt = await request("play_card", { code: game.code, token: host.token, cardId: "attack-damage", targetId: alicePlayer.id });
  assert.equal(damagePrompt.status, 200); assert.equal(damagePrompt.data.room.phase, "response"); assert.equal(damagePrompt.data.room.actionPlayerId, alicePlayer.id);
  const damaged = await request("take_damage", { code: game.code, token: alice.token });
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
  assert.equal(aliceAnswers.status, 200); assert.equal(aliceAnswers.data.room.actionPlayerId, hostPlayer.id); assert.equal(aliceAnswers.data.room.pendingDuel.deadline ?? 0, 0, "a new actor receives a fresh timer");
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
  assert.equal(invasionAlice.status, 200); assert.equal(invasionAlice.data.room.actionPlayerId, bobPlayer.id);
  assert.ok(!discardIds(game.code).includes("attack-barbarian-answer"), "global responses stay in the active sequence until it finishes");
  const aliceInvasionResponse = invasionAlice.data.room.timeline.find((event) => event.type === "card" && event.card.id === "attack-barbarian-answer" && event.player === "Alice");
  assert.equal(aliceInvasionResponse.target, "Alice", "an AOE response has no directional player target");
  const invasionBob = await request("take_group_damage", { code: game.code, token: bob.token });
  assert.equal(invasionBob.status, 200); assert.equal(invasionBob.data.room.players.find((player) => player.id === bobPlayer.id).alive, false); assert.equal(invasionBob.data.room.actionPlayerId, carolPlayer.id);
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
  await request("take_damage", { code: game.code, token: alice.token });
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
  await request("take_damage", { code: game.code, token: alice.token });
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
  const rescuePrompt = await request("take_damage", { code: game.code, token: alice.token });
  assert.equal(rescuePrompt.data.room.phase, "dying"); assert.equal(rescuePrompt.data.room.actionPlayerId, null); assert.equal(rescuePrompt.data.room.isMyAction, false); assert.match(rescuePrompt.data.room.actionReason, /no rescue action is required/);
  const bobPrivatePrompt = await state(game.code, bob.token); assert.equal(bobPrivatePrompt.data.actionPlayerId, bobPlayer.id); assert.equal(bobPrivatePrompt.data.isMyAction, true); assert.match(bobPrivatePrompt.data.actionReason, /Decide whether to give Peach/);
  const alicePrivateView = await state(game.code, alice.token); assert.equal(alicePrivateView.data.actionPlayerId, null); assert.equal(alicePrivateView.data.pendingDying.deadline, 0);
  const rescued = await request("give_peach", { code: game.code, token: bob.token, cardId: "peach-rescue-other" });
  assert.equal(rescued.status, 200); assert.equal(rescued.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1); assert.equal(rescued.data.room.players.find((player) => player.id === alicePlayer.id).alive, true);
  assert.ok(rescued.data.room.timeline.some((entry) => entry.type === "card" && entry.player === "Bob" && entry.target === "Alice" && entry.card.kind === "Peach"));

  setHand(hostPlayer.id, [card("Strike", "skip-rescue")], 4, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [card("Peach", "declined")], 4); setHand(carolPlayer.id, [], 4); setTurn(game.code, hostPlayer.seat);
  await request("play_card", { code: game.code, token: host.token, cardId: "strike-skip-rescue", targetId: alicePlayer.id });
  assert.equal((await request("take_damage", { code: game.code, token: alice.token })).data.room.actionPlayerId, null);
  const skippedRescue = await request("skip_rescue", { code: game.code, token: bob.token });
  assert.equal(skippedRescue.status, 200); assert.equal(skippedRescue.data.room.players.find((player) => player.id === alicePlayer.id).alive, true);
  const skippedRescueSettled = await waitForState(game.code, host.token, (room) => !room.players.find((player) => player.id === alicePlayer.id).alive);
  assert.equal(skippedRescueSettled.players.find((player) => player.id === alicePlayer.id).alive, false);

  setHand(hostPlayer.id, [card("Strike", "timeout-rescue")], 4, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [card("Peach", "timed-out")], 4); setHand(carolPlayer.id, [], 4); setTurn(game.code, hostPlayer.seat);
  const timeoutAttack = await request("play_card", { code: game.code, token: host.token, cardId: "strike-timeout-rescue", targetId: alicePlayer.id });
  const timeoutDying = timeoutAttack.data.room.actionPlayerId === alicePlayer.id ? await request("take_damage", { code: game.code, token: alice.token }) : timeoutAttack;
  assert.equal(timeoutDying.data.room.actionPlayerId, null);
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
  assert.equal(quick.data.room.myHand.length, 16);
  assert.deepEqual(new Set(quick.data.room.myHand.map((openingCard) => openingCard.kind)), new Set(["Attack", "Dodge", "Peach", "DrawTwo", "Dismantle", "Steal", "Duel", "Oath", "BarbarianInvasion", "RainingArrows", "BumperHarvest", "Negation", "Overindulgence", "Lightning", "ZhugeCrossbow", "GreenDragonBlade"]), "ME starts every test game with one of each implemented WTK Standard card");
  assert.ok(quick.data.room.players.filter((player) => player.isBot).every((player) => player.handCount === 4), "defensive quick-test cards replace rather than enlarge bot hands");
  assert.equal((await state(botCode, botToken, true)).data.audit.length, 0);
  assert.ok((await state(quick.data.room.code, quick.data.token, true)).data.audit.length > 0);
  const quickDraw = await request("draw", { code: quick.data.room.code, token: quick.data.token });
  assert.equal(quickDraw.status, 200); assert.equal(quickDraw.data.drawnCards.length, 2); assert.equal(quickDraw.data.room.phase, "play"); assert.equal(quickDraw.data.room.myHand.length, 18);
  const quickMe = quickDraw.data.room.players.find((player) => player.name === "ME"); const quickPlayerOne = quickDraw.data.room.players.find((player) => player.name === "Player 1");
  setHand(quickMe.id, [card("Strike", "zhang-fei-1"), card("Strike", "zhang-fei-2")], quickMe.hp, quickMe.maxHp); setHand(quickPlayerOne.id, [card("Dodge", "zhang-fei-1"), card("Dodge", "zhang-fei-2")], 1, 1); setTurn(quick.data.room.code, quickMe.seat);
  assert.equal((await request("play_card", { code: quick.data.room.code, token: quick.data.token, cardId: "strike-zhang-fei-1", targetId: quickPlayerOne.id })).data.room.phase, "play");
  assert.equal((await request("play_card", { code: quick.data.room.code, token: quick.data.token, cardId: "strike-zhang-fei-2", targetId: quickPlayerOne.id })).data.room.phase, "play");
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
  const firstAttack = await request("take_damage", { code: game.code, token: alice.token });
  assert.equal(firstAttack.data.room.phase, "play", "Zhuge Crossbow returns its owner to an unrestricted Play Phase");
  assert.equal(firstAttack.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "attack-crossbow-two", targetId: alicePlayer.id })).status, 200);
  const secondAttack = await request("take_damage", { code: game.code, token: alice.token });
  assert.equal(secondAttack.data.room.phase, "play");
  assert.equal(secondAttack.data.room.players.find((player) => player.id === alicePlayer.id).hp, 2);

  const replaced = await request("play_card", { code: game.code, token: host.token, cardId: "zhugecrossbow-replacement" });
  assert.equal(replaced.status, 200);
  assert.deepEqual(replaced.data.room.players.find((player) => player.id === hostPlayer.id).equipmentCards.map((equipment) => equipment.id), ["zhugecrossbow-replacement"]);
  assert.ok(discardIds(game.code).includes("zhugecrossbow-first"), "equipping a new weapon discards the previous weapon");

  const quick = await request("create", { quickStart: true }); const [me, playerOne, playerTwo, playerThree] = quick.data.room.players;
  setHand(me.id, [], me.hp, me.maxHp); setHand(playerOne.id, [card("ZhugeCrossbow", "bot")], 1, 1); setHand(playerTwo.id, [], 1, 1); setHand(playerThree.id, [], 1, 1); setTurn(quick.data.room.code, me.seat);
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(Array.from({ length: 12 }, (_, index) => card("Dodge", `crossbow-bot-draw-${index}`))))}, discard_json='[]' WHERE code=${quote(quick.data.room.code)}`);
  await request("end_turn", { code: quick.data.room.code, token: quick.data.token });
  const botRound = await waitForState(quick.data.room.code, quick.data.token, (room) => room.turnSeat === me.seat && room.phase === "draw");
  assert.equal(botRound.players.find((player) => player.id === playerOne.id).equipmentCards[0].kind, "ZhugeCrossbow");
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
  const dodged = await request("respond_dodge", { code: game.code, token: bob.token, cardId: "dodge-dragon" });
  assert.equal(dodged.status, 200); assert.equal(dodged.data.room.pendingGreenDragon.actorId, hostPlayer.id); assert.equal(dodged.data.room.actionPlayerId, hostPlayer.id);
  const followed = await request("respond_green_dragon", { code: game.code, token: host.token, cardId: "attack-dragon-follow-up" });
  assert.equal(followed.status, 200); assert.equal(followed.data.room.pendingAttack.targetId, bobPlayer.id, "the follow-up must keep the original target"); assert.equal(followed.data.room.pendingAttack.sequenceStartCardId, "attack-dragon-first", "the complete Attack/Dodge chain keeps one presentation scope");
  const damaged = await request("take_damage", { code: game.code, token: bob.token });
  assert.equal(damaged.status, 200); assert.equal(damaged.data.room.players.find((player) => player.id === bobPlayer.id).hp, 3); assert.equal(damaged.data.room.phase, "play-struck");
  assert.equal(damaged.data.room.timeline.filter((event) => event.type === "card" && event.player === "Host" && event.card.kind === "Attack").length, 2);

  setHand(hostPlayer.id, [card("Attack", "dragon-skip-first"), card("Attack", "dragon-kept")], 4, 4); setHand(bobPlayer.id, [card("Dodge", "dragon-skip")], 3, 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "attack-dragon-skip-first", targetId: bobPlayer.id })).status, 200);
  assert.equal((await request("respond_dodge", { code: game.code, token: bob.token, cardId: "dodge-dragon-skip" })).data.room.pendingGreenDragon.actorId, hostPlayer.id);
  const skipped = await request("pass_green_dragon", { code: game.code, token: host.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.phase, "play-struck"); assert.ok(skipped.data.room.myHand.some((held) => held.id === "attack-dragon-kept"), "skipping preserves the unused follow-up Attack");

  const quick = await request("create", { quickStart: true }); const [me, playerOne, playerTwo, playerThree] = quick.data.room.players;
  setEquipment(playerOne.id); setHand(me.id, [], me.hp, me.maxHp); setHand(playerOne.id, [card("GreenDragonBlade", "bot"), card("Attack", "dragon-bot-first"), card("Attack", "dragon-bot-follow-up")], 1, 1); setHand(playerTwo.id, [card("Dodge", "dragon-bot-first"), card("Dodge", "dragon-bot-follow-up")], 1, 1); setHand(playerThree.id, [], 1, 1); setTurn(quick.data.room.code, me.seat);
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(Array.from({ length: 20 }, (_, index) => card("Dodge", `dragon-bot-draw-${index}`))))}, discard_json='[]' WHERE code=${quote(quick.data.room.code)}`);
  assert.equal((await request("end_turn", { code: quick.data.room.code, token: quick.data.token })).status, 200);
  const botRound = await waitForState(quick.data.room.code, quick.data.token, (room) => room.turnSeat === me.seat && room.phase === "draw");
  assert.equal(botRound.players.find((player) => player.id === playerOne.id).equipmentCards[0].kind, "GreenDragonBlade");
  assert.equal(botRound.timeline.filter((event) => event.type === "card" && event.player === "Player 1" && event.card.kind === "Attack").length, 2, "the bot uses the Green Dragon Blade follow-up");
  assert.ok(botRound.log.some((entry) => /Green Dragon Blade may continue/.test(entry)));
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

test("Negation cancels a stratagem and a counter-Negation restores it in ordered response", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);

  setHand(hostPlayer.id, [card("Dismantle", "cancelled")], 5, 5);
  setHand(alicePlayer.id, [card("Attack", "protected"), card("Negation", "cancel")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  const opened = await request("play_card", { code: game.code, token: host.token, cardId: "dismantle-cancelled", targetId: alicePlayer.id, targetCardIndex: 0 });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.phase, "response"); assert.equal(opened.data.room.pendingNegation.cardName, "Burning Bridges"); assert.equal(opened.data.room.actionPlayerId, alicePlayer.id);
  assert.equal(opened.data.room.discardTop, null, "Burning Bridges stays outside discard while its Negation decision is open");
  const cancelled = await request("respond_negation", { code: game.code, token: alice.token, cardId: "negation-cancel" });
  assert.equal(cancelled.status, 200); assert.equal(cancelled.data.room.phase, "play"); assert.equal(cancelled.data.room.pendingNegation, null);
  assert.equal((await state(game.code, alice.token)).data.myHand.some((held) => held.id === "attack-protected"), true, "the cancelled stratagem does not discard its target card");

  setHand(hostPlayer.id, [card("Dismantle", "restored"), card("Negation", "counter")], 5, 5);
  setHand(alicePlayer.id, [card("Attack", "removed"), card("Negation", "first")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  const reopened = await request("play_card", { code: game.code, token: host.token, cardId: "dismantle-restored", targetId: alicePlayer.id, targetCardIndex: 0 });
  assert.equal(reopened.data.room.actionPlayerId, alicePlayer.id, "the initial response starts after the source and continues in seat order");
  assert.equal(reopened.data.room.discardTop.id, "negation-cancel", "the previous completed discard remains visible while the new sequence is pending");
  const firstNegation = await request("respond_negation", { code: game.code, token: alice.token, cardId: "negation-first" });
  assert.equal(firstNegation.data.room.actionPlayerId, hostPlayer.id);
  assert.equal(firstNegation.data.room.discardTop.id, "negation-cancel", "neither Burning Bridges nor the first Negation enters discard before the counter decision");
  const restored = await request("respond_negation", { code: game.code, token: host.token, cardId: "negation-counter" });
  assert.equal(restored.status, 200); assert.equal(restored.data.room.phase, "play");
  assert.equal(restored.data.room.discardTop.id, "attack-removed", "the revealed target card enters discard only when the complete sequence finishes");
  assert.equal((await state(game.code, alice.token)).data.myHand.some((held) => held.id === "attack-removed"), false, "counter-Negation restores the original stratagem effect");
  assert.ok(restored.data.room.log.some((entry) => /plays Negation to restore Burning Bridges/.test(entry)));
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
    assert.equal(opened.status, 200); assert.equal(opened.data.room.pendingNegation.effectTargetId, alicePlayer.id); assert.equal(opened.data.room.actionPlayerId, alicePlayer.id);
    assert.deepEqual(discardIds(game.code), [], `${kind} stays staged while Alice decides whether to Negate`);
    const aliceNegates = await request("respond_negation", { code: game.code, token: alice.token, cardId: `negation-${kind}-alice` });
    assert.equal(aliceNegates.status, 200); assert.equal(aliceNegates.data.room.actionPlayerId, hostPlayer.id, "the source may immediately counter or skip after a target Negates");
    assert.deepEqual(discardIds(game.code), [], `the ${kind} and first Negation both remain staged`);
    const counterTimer = await request("start_response_timer", { code: game.code, token: host.token }); assert.ok(counterTimer.data.room.pendingNegation.deadline > Date.now());
    const protectedAlice = await request("pass_negation", { code: game.code, token: host.token });
    assert.equal(protectedAlice.status, 200); assert.equal(protectedAlice.data.room.pendingNegation, null); assert.equal(protectedAlice.data.room.pendingGroup.actorId, bobPlayer.id, `${kind} continues to Bob immediately when the source skips its counter-Negation`);
    assert.equal(protectedAlice.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

    const bobResponse = await request("respond_group", { code: game.code, token: bob.token, cardId: `${requiredKind.toLowerCase()}-${kind}-bob` });
    assert.equal(bobResponse.status, 200); assert.equal(bobResponse.data.room.pendingGroup.actorId, carolPlayer.id, `${kind} continues to Carol after Bob responds`);
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

  const quick = await request("create", { quickStart: true }); const [me, playerOne, playerTwo, playerThree] = quick.data.room.players;
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

  const quick = await request("create", { quickStart: true }); const [me, playerOne, playerTwo, playerThree] = quick.data.room.players;
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
  const quick = await request("create", { quickStart: true });
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
  const quick = await request("create", { quickStart: true });
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
  const [host, alice, bob, carol] = rescuedGame.members; const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = rescuedGame.room.players;
  setHand(hostPlayer.id, [card("BarbarianInvasion", "rescue-chain")], 5, 5); setHand(alicePlayer.id, [], 1, 4); setHand(bobPlayer.id, [card("Peach", "rescue-chain")], 4, 4); setHand(carolPlayer.id, [card("Attack", "rescue-chain")], 4, 4); setTurn(rescuedGame.code, hostPlayer.seat);
  sql(`UPDATE rooms SET discard_json='[]' WHERE code=${quote(rescuedGame.code)}`);
  const started = await request("play_card", { code: rescuedGame.code, token: host.token, cardId: "barbarianinvasion-rescue-chain" });
  assert.equal(started.data.room.actionPlayerId, alicePlayer.id);
  const dying = await request("take_group_damage", { code: rescuedGame.code, token: alice.token });
  assert.equal(dying.data.room.phase, "dying"); assert.equal(dying.data.room.pendingGroup.cardKind, "BarbarianInvasion", "the AOE sequence remains visible through Dying rescue"); assert.deepEqual(discardIds(rescuedGame.code), []);
  const bobPrompt = await state(rescuedGame.code, bob.token); assert.equal(bobPrompt.data.isMyAction, true); assert.equal(bobPrompt.data.pendingDying.targetId, alicePlayer.id);
  const rescued = await request("give_peach", { code: rescuedGame.code, token: bob.token, cardId: "peach-rescue-chain" });
  assert.equal(rescued.data.room.phase, "response"); assert.equal(rescued.data.room.actionPlayerId, bobPlayer.id); assert.equal(rescued.data.room.turnSeat, hostPlayer.seat);
  assert.deepEqual(discardIds(rescuedGame.code), [], "the rescue Peach remains part of the active AOE sequence");
  const bobResponded = await request("take_group_damage", { code: rescuedGame.code, token: bob.token });
  assert.equal(bobResponded.data.room.actionPlayerId, carolPlayer.id);
  const chainFinished = await request("respond_group", { code: rescuedGame.code, token: carol.token, cardId: "attack-rescue-chain" });
  assert.equal(chainFinished.data.room.phase, "play"); assert.equal(chainFinished.data.room.turnSeat, hostPlayer.seat); assert.equal(chainFinished.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.deepEqual(discardIds(rescuedGame.code), ["barbarianinvasion-rescue-chain", "peach-rescue-chain", "attack-rescue-chain"], "AOE, rescue, and response cards enter discard together after the chain finishes");

  const victoryGame = await createHumanGame();
  const [winner, rebel] = victoryGame.members; const [lord, lastRebel, loyalistOne, loyalistTwo] = victoryGame.room.players;
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(lord.id)}; UPDATE players SET role='Rebel' WHERE id=${quote(lastRebel.id)}; UPDATE players SET role='Loyalist' WHERE id IN (${quote(loyalistOne.id)},${quote(loyalistTwo.id)})`);
  setHand(lord.id, [card("BarbarianInvasion", "winning-chain")], 5, 5); setHand(lastRebel.id, [], 1, 4); setHand(loyalistOne.id, [], 4, 4); setHand(loyalistTwo.id, [], 4, 4); setTurn(victoryGame.code, lord.seat);
  const winningCard = await request("play_card", { code: victoryGame.code, token: winner.token, cardId: "barbarianinvasion-winning-chain" });
  assert.equal(winningCard.data.room.actionPlayerId, lastRebel.id);
  const victory = await request("take_group_damage", { code: victoryGame.code, token: rebel.token });
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
  await request("take_damage", { code: loyalistPenaltyGame.code, token: loyalistMember.token });
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
  await request("take_damage", { code: loyalistPenaltyGame.code, token: traitorTargetMember.token });
  const noTraitorReward = { data: { room: (await state(loyalistPenaltyGame.code, lordMember.token)).data } };
  assert.equal(noTraitorReward.data.room.myHand.length, 1, "defeating the Traitor grants no cards and applies no penalty");
  assert.equal(noTraitorReward.data.room.players.find((player) => player.id === traitor.id).handCount, 0);

  const nonLordGame = await createHumanGame();
  const [rebelMember, loyalistTargetMember] = nonLordGame.members; const [rebelKiller, loyalistTarget, livingLord, livingTraitor] = nonLordGame.room.players;
  sql(`UPDATE players SET role='Rebel' WHERE id=${quote(rebelKiller.id)}; UPDATE players SET role='Loyalist' WHERE id=${quote(loyalistTarget.id)}; UPDATE players SET role='Lord' WHERE id=${quote(livingLord.id)}; UPDATE players SET role='Renegade' WHERE id=${quote(livingTraitor.id)}`);
  setHand(rebelKiller.id, [card("Attack", "nonlord-loyalist"), card("DrawTwo", "nonlord-keeps")], 4, 4); setHand(loyalistTarget.id, [], 1, 4); setHand(livingLord.id, [], 5, 5); setHand(livingTraitor.id, [], 4, 4); setTurn(nonLordGame.code, rebelKiller.seat);
  await request("play_card", { code: nonLordGame.code, token: rebelMember.token, cardId: "attack-nonlord-loyalist", targetId: loyalistTarget.id });
  await request("take_damage", { code: nonLordGame.code, token: loyalistTargetMember.token });
  const unpenalised = { data: { room: (await state(nonLordGame.code, rebelMember.token)).data } };
  assert.equal(unpenalised.data.room.myHand.length, 1, "a non-Lord receives no penalty for defeating a Loyalist");

  const rebelRewardGame = await createHumanGame();
  const [traitorMember, rebelTargetMember] = rebelRewardGame.members; const [traitorKiller, rebelTarget, rewardLord, rewardLoyalist] = rebelRewardGame.room.players;
  sql(`UPDATE players SET role='Renegade' WHERE id=${quote(traitorKiller.id)}; UPDATE players SET role='Rebel' WHERE id=${quote(rebelTarget.id)}; UPDATE players SET role='Lord' WHERE id=${quote(rewardLord.id)}; UPDATE players SET role='Loyalist' WHERE id=${quote(rewardLoyalist.id)}`);
  setHand(traitorKiller.id, [card("Attack", "rebel-reward"), card("DrawTwo", "reward-kept")], 4, 4); setHand(rebelTarget.id, [], 1, 4); setHand(rewardLord.id, [], 5, 5); setHand(rewardLoyalist.id, [], 4, 4); setTurn(rebelRewardGame.code, traitorKiller.seat);
  await request("play_card", { code: rebelRewardGame.code, token: traitorMember.token, cardId: "attack-rebel-reward", targetId: rebelTarget.id });
  await request("take_damage", { code: rebelRewardGame.code, token: rebelTargetMember.token });
  const rewarded = { data: { room: (await state(rebelRewardGame.code, traitorMember.token)).data } };
  assert.equal(rewarded.data.room.myHand.length, 4, "a Traitor also draws three cards for defeating a Rebel");
  assert.ok(rewarded.data.room.timeline.some((event) => /draws 3 reward cards/.test(event.message ?? "")));

  const traitorVictoryGame = await createHumanGame();
  const [finalLordMember, traitorWinner] = traitorVictoryGame.members; const [finalLord, finalTraitor, deadRebel, deadLoyalist] = traitorVictoryGame.room.players;
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(finalLord.id)}; UPDATE players SET role='Renegade' WHERE id=${quote(finalTraitor.id)}; UPDATE players SET role='Rebel',alive=0,hp=0,hand_json='[]' WHERE id=${quote(deadRebel.id)}; UPDATE players SET role='Loyalist',alive=0,hp=0,hand_json='[]' WHERE id=${quote(deadLoyalist.id)}`);
  setHand(finalLord.id, [], 1, 5); setHand(finalTraitor.id, [card("Attack", "traitor-victory")], 4, 4); setTurn(traitorVictoryGame.code, finalTraitor.seat);
  await request("play_card", { code: traitorVictoryGame.code, token: traitorWinner.token, cardId: "attack-traitor-victory", targetId: finalLord.id });
  const traitorVictory = await request("take_damage", { code: traitorVictoryGame.code, token: finalLordMember.token });
  assert.equal(traitorVictory.data.room.status, "finished"); assert.ok(traitorVictory.data.room.timeline.some((event) => /Traitor victory/.test(event.message ?? "")));

  const rebelVictoryGame = await createHumanGame();
  const [fallenLordMember, falseTraitor] = rebelVictoryGame.members; const [fallenLord, attackingTraitor, survivingRebel, fallenLoyalist] = rebelVictoryGame.room.players;
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(fallenLord.id)}; UPDATE players SET role='Renegade' WHERE id=${quote(attackingTraitor.id)}; UPDATE players SET role='Rebel' WHERE id=${quote(survivingRebel.id)}; UPDATE players SET role='Loyalist',alive=0,hp=0,hand_json='[]' WHERE id=${quote(fallenLoyalist.id)}`);
  setHand(fallenLord.id, [], 1, 5); setHand(attackingTraitor.id, [card("Attack", "rebel-victory")], 4, 4); setHand(survivingRebel.id, [], 4, 4); setTurn(rebelVictoryGame.code, attackingTraitor.seat);
  await request("play_card", { code: rebelVictoryGame.code, token: falseTraitor.token, cardId: "attack-rebel-victory", targetId: fallenLord.id });
  const rebelVictory = await request("take_damage", { code: rebelVictoryGame.code, token: fallenLordMember.token });
  assert.equal(rebelVictory.data.room.status, "finished"); assert.ok(rebelVictory.data.room.timeline.some((event) => /Rebel victory/.test(event.message ?? "")));
});
