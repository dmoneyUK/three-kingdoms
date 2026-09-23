import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";

export const baseUrl = process.env.GAME_TEST_URL ?? "http://localhost:3137";
const testStatePath = process.env.GAME_TEST_STATE_PATH ?? resolve(new URL("../", import.meta.url).pathname, ".wrangler/test-state");
const d1Directory = pathToFileURL(join(testStatePath, "v3/d1/miniflare-D1DatabaseObject/"));
export const membersByCode = new Map();

export async function drainEmptyPrivateDecisions(code, fallbackToken) {
  const members = membersByCode.get(code) ?? [{ token: fallbackToken }];
  for (let guard = 0; guard < 40; guard++) {
    let advanced = false;
    for (const member of members) {
      const preview = await state(code, member.token);
      const current = preview.data.currentAction;
      if (!preview.data.isMyAction) continue;
      if (current?.kind === "response" && current.legalActions?.includes("decline_response") && !(current.options?.length ?? 0)) {
        await request("decline_response", { code, token: member.token });
        advanced = true;
        break;
      }
      if (current?.kind === "dying" && current.legalActions?.includes("skip_rescue") && !current.legalActions?.includes("give_peach")) {
        await request("skip_rescue", { code, token: member.token });
        advanced = true;
        break;
      }
    }
    if (!advanced) break;
  }
}

export async function request(action, values = {}) {
  if (values.preserveResponse) { values = { ...values }; delete values.preserveResponse; }
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${baseUrl}/api/rooms`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...values }) });
    const text = await response.text();
    if (text) {
      try {
        const result = { status: response.status, data: JSON.parse(text) };
        return result;
      }
      catch {
        if (response.status < 500 || attempt === 2) assert.fail(`${action} returned a non-JSON ${response.status} response: ${text.slice(0, 120)}`);
      }
    } else if (response.status !== 500 || attempt === 2) assert.fail(`${action} returned an empty ${response.status} response`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`${action} did not return a response`);
}

export async function requestAndSettle(action, values = {}) {
  const preserveResponse = Boolean(values.preserveResponse);
  if (values.code && !preserveResponse && !["respond", "decline_response", "trigger", "decline_trigger", "skip_rescue", "start_response_timer", "start_rescue_timer", "advance_timers"].includes(action)) await drainEmptyPrivateDecisions(values.code, values.token);
  const handBeforeAction = values.code && values.token && ["play_card", "draw"].includes(action)
    ? ((await state(values.code, values.token)).data.myHand ?? [])
    : null;
  let actionValues = values;
  if ((action === "respond" || action === "trigger") && actionValues.providerId === undefined) {
    const preview = await state(actionValues.code, actionValues.token);
    const options = action === "respond" ? preview.data.currentAction?.options ?? [] : preview.data.currentAction?.triggerOptions ?? [];
    const selected = options.find((option) => {
      const selection = option.selection;
      if (!selection) return true;
      const ids = Array.isArray(actionValues.cardIds) ? actionValues.cardIds : actionValues.cardId ? [actionValues.cardId] : [];
      const eligible = selection.eligibleCardIds ?? [];
      return ids.length >= selection.min && ids.length <= selection.max && ids.every((id) => eligible.includes(id));
    }) ?? options[0];
    if (selected) actionValues = { ...actionValues, providerId: action === "respond" ? selected.providerId : selected.effectId };
  }
  const result = await request(action, actionValues);
  if (actionValues.code && !preserveResponse && !["start_response_timer", "start_rescue_timer", "advance_timers"].includes(action)) {
    await drainEmptyPrivateDecisions(actionValues.code, actionValues.token);
    const refreshed = await state(actionValues.code, actionValues.token);
    result.data = { ...result.data, room: refreshed.data };
    if (result.data.drawnCards === undefined && handBeforeAction && Array.isArray(refreshed.data.myHand)) {
      const beforeIds = new Set(handBeforeAction.map((card) => card.id));
      const drawnCards = refreshed.data.myHand.filter((card) => !beforeIds.has(card.id));
      if (drawnCards.length) result.data.drawnCards = drawnCards;
    }
  }
  return result;
}

export async function state(code, token, audit = false) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${baseUrl}/api/rooms?code=${code}&token=${token}${audit ? "&audit=1" : ""}`);
    const text = await response.text();
    if (text) {
      try { return { status: response.status, data: JSON.parse(text) }; }
      catch {
        if (response.status < 500 || attempt === 2) assert.fail(`room state returned a non-JSON ${response.status} response: ${text.slice(0, 120)}`);
      }
    } else if (response.status !== 500 || attempt === 2) assert.fail(`room state returned an empty ${response.status} response`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("room state did not return a response");
}

export async function seedPlayingGame(input = {}) {
  const response = await fetch(`${baseUrl}/__test/seed-playing-game`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  const members = data.players.map((player) => ({ name: player.name, token: player.token }));
  membersByCode.set(data.code, members);
  return { code: data.code, members, room: (await state(data.code, members[0].token)).data, fixture: data };
}

export async function takeDamageIfPending(code, token) {
  const current = await state(code, token);
  if (current.data.pendingAttack && current.data.actionPlayerId === current.data.meId) return requestAndSettle("decline_response", { code, token });
  if (current.data.currentAction?.kind === "trigger" && current.data.actionPlayerId === current.data.meId) return requestAndSettle("decline_trigger", { code, token });
  return { status: 200, data: { room: current.data } };
}

export async function waitForState(code, token, predicate) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const result = await state(code, token);
    if (predicate(result.data)) return result.data;
    // Production GETs are intentionally read-only. Tests that model a live
    // client therefore submit the explicit timer transition once a published
    // deadline has elapsed, instead of relying on a polling side effect.
    const pendingJson = query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`);
    const pending = pendingJson ? JSON.parse(pendingJson) : null;
    const deadline = pending?.completeAt ?? pending?.deadline ?? 0;
    if (deadline > 0 && deadline <= Date.now()) await requestAndSettle("advance_timers", { code, token });
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail("room state did not reach the expected condition");
}

export function databasePath() {
  const file = readdirSync(d1Directory).find((name) => name.endsWith(".sqlite") && basename(name) !== "metadata.sqlite");
  assert.ok(file, "local D1 database was created");
  return join(d1Directory.pathname, file);
}

let fixtureDatabase;
function database() {
  fixtureDatabase ??= new DatabaseSync(databasePath());
  fixtureDatabase.exec("PRAGMA busy_timeout = 5000");
  return fixtureDatabase;
}

export function sql(statement) { database().exec(statement); }

export function query(statement) {
  const rows = database().prepare(statement).all();
  return rows.map((row) => String(Object.values(row)[0] ?? "")).join("\n");
}

export function quote(value) { return `'${String(value).replaceAll("'", "''")}'`; }

export function card(kind, suffix, suit = "♠") { return { id: `${kind.toLowerCase()}-${suffix}`, kind, suit, rank: "A" }; }

export function setHand(playerId, cards, hp, maxHp = hp) { sql(`UPDATE players SET hand_json=${quote(JSON.stringify(cards))}, hp=${hp}, max_hp=${maxHp}, alive=1 WHERE id=${quote(playerId)}`); }

export function setJudgement(playerId, cards) { sql(`UPDATE players SET judgement_json=${quote(JSON.stringify(cards))} WHERE id=${quote(playerId)}`); }

export function setEquipment(playerId, equipment = {}) { sql(`UPDATE players SET equipment_json=${quote(JSON.stringify(equipment))} WHERE id=${quote(playerId)}`); }

export function setDeck(roomCode, cards) { sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(cards))}, discard_json='[]' WHERE code=${quote(roomCode)}`); }

export function setTurn(roomCode, seat, phase = "play") { sql(`UPDATE rooms SET turn_seat=${seat}, phase=${quote(phase)}, pending_json=NULL, status='playing' WHERE code=${quote(roomCode)}`); }

export function discardIds(roomCode) { return query(`SELECT json_extract(value,'$.id') FROM rooms,json_each(rooms.discard_json) WHERE rooms.code=${quote(roomCode)}`).split("\n").filter(Boolean); }

export function roomCardCount(roomCode, cardId) {
  const roomZones = query(`SELECT deck_json || char(10) || discard_json FROM rooms WHERE code=${quote(roomCode)}`).split("\n").filter(Boolean);
  const playerHands = query(`SELECT hand_json FROM players WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(roomCode)})`).split("\n").filter(Boolean);
  return [...roomZones, ...playerHands].reduce((count, json) => count + JSON.parse(json || "[]").filter((item) => item.id === cardId).length, 0);
}

export async function markReady(code, members) {
  for (const member of members) {
    const result = await requestAndSettle("set_ready", { code, token: member.token, ready: true });
    assert.equal(result.status, 200, JSON.stringify(result.data));
  }
}

export async function passNegationWindows(code, members) {
  for (let guard = 0; guard < 40; guard++) {
    let passed = false;
    for (const member of members) {
      const view = (await state(code, member.token)).data;
      if (view.isMyAction && view.currentAction?.kind === "response" && view.currentAction.requirement === "negate" && view.currentAction.legalActions?.includes("decline_response")) {
        const declined = await requestAndSettle("decline_response", { code, token: member.token, preserveResponse: true });
        assert.equal(declined.status, 200, JSON.stringify(declined.data));
        passed = true;
        break;
      }
    }
    if (!passed) return;
  }
  assert.fail("Negation windows did not settle");
}

export async function createTestLobby() {
  const created = await requestAndSettle("create", { name: "Host" });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const code = created.data.room.code;
  const added = await requestAndSettle("add_test_players", { code, token: created.data.token, name: "Host" });
  assert.equal(added.status, 200, JSON.stringify(added.data));
  assert.equal(added.data.room.players.length, 4);
  assert.deepEqual(added.data.room.players.map((player) => player.name), ["Host", "Test Player 2", "Test Player 3", "Test Player 4"]);
  const started = await requestAndSettle("start", { code, token: created.data.token, name: "Host" });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  membersByCode.set(code, [{ token: created.data.token }]);
  return { ...created, data: { ...created.data, room: started.data.room } };
}

export async function createTestGame() {
  const created = await createTestLobby();
  let room = created.data.room;
  while (room.status === "heroes") {
    const actor = room.players.find((player) => player.id === room.meId);
    assert.ok(actor, "host test session projects the next controlled seat");
    const chosen = room.myHeroOptions[0];
    assert.ok(chosen, `host test session exposes a selectable hero for ${actor.name}`);
    const result = await requestAndSettle("choose_hero", { code: room.code, token: created.data.token, heroId: chosen.id });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    room = result.data.room;
  }
  const fixtureHeroes = ["guan-yu", "simayi", "zhao-yun", "xiahou-dun"];
  const fixtureHp = { "guan-yu": 4, simayi: 3, "zhao-yun": 4, "xiahou-dun": 3 };
  for (const player of room.players) {
    const hero = fixtureHeroes[player.seat];
    const hp = fixtureHp[hero] + (player.role === "Lord" ? 1 : 0);
    sql(`UPDATE players SET hero=${quote(hero)}, hp=${hp}, max_hp=${hp}, hero_options_json='[]' WHERE id=${quote(player.id)}`);
  }
  return { ...created, data: { ...created.data, room: (await state(room.code, created.data.token)).data } };
}

export async function createHumanSetupGame() {
  const created = await requestAndSettle("create", { name: "Host" });
  assert.equal(created.status, 201);
  const code = created.data.room.code;
  const members = [{ name: "Host", token: created.data.token }];
  for (const name of ["Alice", "Bob", "Carol"]) {
    const joined = await requestAndSettle("join", { code, name });
    assert.equal(joined.status, 201);
    members.push({ name, token: joined.data.token });
  }
  membersByCode.set(code, members);
  const started = await requestAndSettle("start", { code, token: created.data.token, name: "Host" });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const views = await Promise.all(members.map((member) => state(code, member.token)));
  return { code, members, views: views.map((view) => view.data) };
}

export async function prepareGuoJudgement({ original, replacement = null, purposeCard = null }) {
  const game = await createHumanGame();
  const [source, guo, sima, other] = game.room.players;
  const [sourceMember, guoMember, simaMember] = game.members;
  sql(`UPDATE players SET hero='yue-jin' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='guo-jia', hp=3, max_hp=3 WHERE id=${quote(guo.id)}`);
  sql(`UPDATE players SET hero='simayi', hp=3, max_hp=3 WHERE id=${quote(sima.id)}`);
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(other.id)}`);
  for (const player of [source, guo, sima, other]) setHand(player.id, [], 3, 3);
  if (replacement) setHand(sima.id, [replacement], 3, 3);
  setJudgement(guo.id, [purposeCard ?? card("Overindulgence", "guo-delayed", "♠")]);
  setDeck(game.code, [original, card("Attack", "guo-draw-a"), card("Dodge", "guo-draw-b")]);
  setTurn(game.code, guo.seat, "draw");
  return { game, source, guo, sima, sourceMember, guoMember, simaMember };
}

export async function openGuoDamage({ amount = 1, deckCards = [] } = {}) {
  const game = await createHumanGame();
  const [source, guo, bob, carol] = game.room.players;
  const [sourceMember, guoMember] = game.members;
  sql(`UPDATE players SET hero='${amount === 2 ? "xu-chu" : "yue-jin"}' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='guo-jia', hp=4, max_hp=4 WHERE id=${quote(guo.id)}`);
  for (const player of [source, guo, bob, carol]) setHand(player.id, [], 4, 4);
  const attack = card("Attack", `guo-damage-${amount}`);
  setHand(source.id, [attack], amount === 2 ? 4 : 4, 4);
  if (amount === 2) sql(`UPDATE rooms SET skill_state_json=${quote(JSON.stringify({ turnPlayerId: source.id, baredBodiedActive: true }))} WHERE code=${quote(game.code)}`);
  setDeck(game.code, deckCards);
  setTurn(game.code, source.seat, "play");
  const played = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: guo.id, preserveResponse: true });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  if (played.data.room.currentAction?.kind === "response") {
    const declined = await requestAndSettle("decline_response", { code: game.code, token: guoMember.token });
    assert.equal(declined.status, 200, JSON.stringify(declined.data));
  }
  const guoView = (await state(game.code, guoMember.token)).data;
  assert.equal(guoView.currentAction.kind, "trigger", JSON.stringify(guoView));
  assert.equal(guoView.currentAction.triggerEvent, "damage_suffered");
  return { game, source, guo, sourceMember, guoMember };
}

export async function distributeLegacy(opened, recipientId) {
  const view = (await state(opened.game.code, opened.guoMember.token)).data;
  const cards = view.currentAction.distribution.cards;
  assert.equal(cards.length, 2);
  const submitted = await requestAndSettle("trigger", { code: opened.game.code, token: opened.guoMember.token, providerId: "private_card_distribution", assignments: cards.map((held) => ({ cardId: held.id, recipientId })) });
  assert.equal(submitted.status, 200, JSON.stringify(submitted.data));
  return { cards, room: submitted.data.room };
}

export async function createHumanGame() {
  return seedPlayingGame({
    players: ["Host", "Alice", "Bob", "Carol"].map((name, index) => ({
      name,
      role: ["Rebel", "Loyalist", "Lord", "Renegade"][index],
      hero: "yue-jin",
      hp: 4,
      maxHp: 4,
      hand: [
        card("DrawTwo", `fixture-${index}-a`),
        card("DrawTwo", `fixture-${index}-b`),
        card("DrawTwo", `fixture-${index}-c`),
        card("DrawTwo", `fixture-${index}-d`),
      ],
    })),
    turnSeat: 0,
    phase: "play",
  });
}

export async function openHujiaScenario({ delegateHero, delegateCards = [], thirdHero = null, thirdCards = [], caoCards = [] }) {
  const game = await createHumanGame();
  const [sourceMember, caoMember, delegateMember, thirdMember] = game.members;
  const source = game.room.players.find((player) => player.name === "Host");
  const cao = game.room.players.find((player) => player.name === "Alice");
  const delegate = game.room.players.find((player) => player.name === "Bob");
  const third = game.room.players.find((player) => player.name === "Carol");
  assert.ok(source && cao && delegate && third);
  const attack = card("Attack", "hujia-regression-attack");
  for (const player of game.room.players) sql("UPDATE players SET hero=NULL WHERE id=" + quote(player.id));
  sql("UPDATE players SET hero='cao-cao' WHERE id=" + quote(cao.id));
  sql("UPDATE players SET hero=" + quote(delegateHero) + " WHERE id=" + quote(delegate.id));
  if (thirdHero) sql("UPDATE players SET hero=" + quote(thirdHero) + " WHERE id=" + quote(third.id));
  setEquipment(cao.id, {});
  setHand(source.id, [attack], 4, 4); setHand(cao.id, caoCards, 4, 4); setHand(delegate.id, delegateCards, 4, 4); setHand(third.id, thirdCards, 4, 4);
  setTurn(game.code, source.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: cao.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const caoView = await state(game.code, caoMember.token);
  assert.ok(caoView.data.currentAction.options.some((option) => option.providerId === "cao_cao_hujia"), JSON.stringify(caoView.data));
  return { ...game, source, cao, delegate, third, sourceMember, caoMember, delegateMember, thirdMember };
}

export async function openGanglieAttack({ judge, sourceCards = [card("Attack", "ganglie-attack")], sourceHp = 4 } = {}) {
  const game = await createHumanGame();
  const sourceMember = game.members[0];
  const targetMember = game.members[1];
  const source = game.room.players.find((player) => player.name === "Host");
  const target = game.room.players.find((player) => player.name === "Alice");
  assert.ok(source && target);
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='xiahou-dun' WHERE id=${quote(target.id)}`);
  setHand(source.id, sourceCards, sourceHp, 4);
  setHand(target.id, [], 3, 3);
  setTurn(game.code, source.seat);
  setDeck(game.code, [judge]);
  const attack = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: sourceCards[0].id, targetId: target.id });
  assert.equal(attack.status, 200, JSON.stringify(attack.data));
  if (attack.data.room.currentAction?.kind === "response") {
    const declined = await requestAndSettle("decline_response", { code: game.code, token: targetMember.token });
    assert.equal(declined.status, 200, JSON.stringify(declined.data));
  }
  const settled = (await state(game.code, sourceMember.token)).data;
  assert.equal(settled.currentAction.kind, "trigger", JSON.stringify(settled));
  assert.equal(settled.currentAction.triggerEvent, "damage_suffered");
  assert.equal(settled.currentAction.actorId, target.id);
  return { ...game, sourceMember, targetMember, source, target, actionPresentation: settled.currentAction.presentation };
}

export async function openFankuiAttack({ sourceCards = [card("Attack", "fankui-attack"), card("Peach", "fankui-source-hidden")], sourceHp = 4, sourceMaxHp = 4, sourceEquipment = {}, sourceJudgement = [], expectReaction = true } = {}) {
  const game = await createHumanGame();
  const sourceMember = game.members[0];
  const targetMember = game.members[1];
  const source = game.room.players.find((player) => player.name === "Host");
  const target = game.room.players.find((player) => player.name === "Alice");
  assert.ok(source && target);
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(target.id)}`);
  setHand(source.id, sourceCards, sourceHp, sourceMaxHp);
  setHand(target.id, [], 3, 3);
  setEquipment(source.id, sourceEquipment);
  setJudgement(source.id, sourceJudgement);
  setTurn(game.code, source.seat);
  const attack = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: sourceCards[0].id, targetId: target.id });
  assert.equal(attack.status, 200, JSON.stringify(attack.data));
  if (attack.data.room.currentAction?.kind === "response") {
    const declined = await requestAndSettle("decline_response", { code: game.code, token: targetMember.token });
    assert.equal(declined.status, 200, JSON.stringify(declined.data));
  }
  if (expectReaction) {
    const settled = (await state(game.code, sourceMember.token)).data;
    assert.equal(settled.currentAction.kind, "trigger", JSON.stringify(settled));
    assert.equal(settled.currentAction.triggerEvent, "damage_suffered");
    assert.equal(settled.currentAction.actorId, target.id);
    return { ...game, sourceMember, targetMember, source, target, actionPresentation: settled.currentAction.presentation };
  }
  return { ...game, sourceMember, targetMember, source, target, actionPresentation: attack.data.room.currentAction.presentation };
}

export async function openGanglieGroup({ kind, judge, suffix }) {
  const game = await createHumanGame();
  const [sourceMember, targetMember, bobMember, carolMember] = game.members;
  const [source, target, bob, carol] = game.room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='xiahou-dun' WHERE id=${quote(target.id)}`);
  sql(`UPDATE players SET hero=NULL WHERE id IN (${quote(bob.id)},${quote(carol.id)})`);
  const required = kind === "RainingArrows" ? "Dodge" : "Attack";
  setHand(source.id, [card(kind, `${suffix}-source`)], 4, 4);
  setHand(target.id, [], 3, 3);
  setHand(bob.id, [card(required, `${suffix}-bob`)], 4, 4);
  setHand(carol.id, [card(required, `${suffix}-carol`)], 4, 4);
  setTurn(game.code, source.seat);
  setDeck(game.code, [judge]);
  const started = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: `${kind.toLowerCase()}-${suffix}-source` });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  await passNegationWindows(game.code, game.members);
  const settled = await state(game.code, sourceMember.token);
  assert.equal(settled.data.currentAction.kind, "trigger", JSON.stringify(settled.data));
  assert.equal(settled.data.currentAction.triggerEvent, "damage_suffered");
  assert.equal(settled.data.currentAction.actorId, target.id);
  const targetView = (await state(game.code, targetMember.token)).data;
  assert.ok(targetView.currentAction.triggerOptions.some((option) => option.effectId === "xiahou_dun_ganglie"));
  return { ...game, sourceMember, targetMember, bobMember, carolMember, source, target, bob, carol, required };
}

export let borrowedScenarioCounter = 0;

export async function openBorrowedSwordScenario({ attack = true, weaponKind = "GreenDragonBlade", choose = true } = {}) {
  const scenarioId = ++borrowedScenarioCounter;
  const game = await createHumanGame(); const [host, alice] = game.members;
  const [source, holder, target] = game.room.players;
  const borrowed = card("BorrowedSword", `borrowed-${scenarioId}`);
  const weapon = card(weaponKind, `weapon-${scenarioId}`);
  const attackCard = attack ? card("Attack", `attack-${scenarioId}`) : null;
  setHand(source.id, [borrowed], 4, 5); setHand(holder.id, attackCard ? [attackCard] : [], 4, 4); setHand(target.id, [], 4, 4); setEquipment(holder.id, { weapon }); setTurn(game.code, source.seat);
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id })).status, 200);
  const stage1 = (await state(game.code, host.token)).data;
  assert.equal(stage1.currentAction.actorId, source.id); assert.deepEqual(stage1.currentAction.legalActions, ["choose_borrowed_sword_target"]);
  if (choose) assert.equal((await requestAndSettle("choose_borrowed_sword_target", { code: game.code, token: host.token, targetId: target.id })).status, 200);
  return { game, host, alice, source, holder, target, weapon, attackId: attackCard?.id, stage1Revision: stage1.actionRevision };
}
