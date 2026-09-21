import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { normalizeRoomData } from "../game/room-safety.js";

const baseUrl = process.env.GAME_TEST_URL ?? "http://localhost:3137";
const d1Directory = new URL("../.wrangler/test-state/v3/d1/miniflare-D1DatabaseObject/", import.meta.url);

async function request(action, values = {}) {
  if ((action === "respond" || action === "trigger") && values.providerId === undefined) {
    const preview = await state(values.code, values.token);
    const options = action === "respond" ? preview.data.currentAction?.options ?? [] : preview.data.currentAction?.triggerOptions ?? [];
    const selected = options.find((option) => {
      const selection = option.selection;
      if (!selection) return true;
      const ids = Array.isArray(values.cardIds) ? values.cardIds : values.cardId ? [values.cardId] : [];
      const eligible = selection.eligibleCardIds ?? [];
      return ids.length >= selection.min && ids.length <= selection.max && ids.every((id) => eligible.includes(id));
    }) ?? options[0];
    if (selected) values = { ...values, providerId: action === "respond" ? selected.providerId : selected.effectId };
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${baseUrl}/api/rooms`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...values }) });
    const text = await response.text();
    if (text) {
      try { return { status: response.status, data: JSON.parse(text) }; }
      catch {
        if (response.status < 500 || attempt === 2) assert.fail(`${action} returned a non-JSON ${response.status} response: ${text.slice(0, 120)}`);
      }
    } else if (response.status !== 500 || attempt === 2) assert.fail(`${action} returned an empty ${response.status} response`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`${action} did not return a response`);
}

async function state(code, token, audit = false) {
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

async function takeDamageIfPending(code, token) {
  const current = await state(code, token);
  if (current.data.pendingAttack && current.data.actionPlayerId === current.data.meId) return request("decline_response", { code, token });
  if (current.data.currentAction?.kind === "trigger" && current.data.actionPlayerId === current.data.meId) return request("decline_trigger", { code, token });
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
    const deadline = pending?.completeAt ?? pending?.deadline ?? 0;
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
function card(kind, suffix, suit = "♠") { return { id: `${kind.toLowerCase()}-${suffix}`, kind, suit, rank: "A" }; }
function setHand(playerId, cards, hp, maxHp = hp) { sql(`UPDATE players SET hand_json=${quote(JSON.stringify(cards))}, hp=${hp}, max_hp=${maxHp}, alive=1 WHERE id=${quote(playerId)}`); }
function setJudgement(playerId, cards) { sql(`UPDATE players SET judgement_json=${quote(JSON.stringify(cards))} WHERE id=${quote(playerId)}`); }
function setEquipment(playerId, equipment = {}) { sql(`UPDATE players SET equipment_json=${quote(JSON.stringify(equipment))} WHERE id=${quote(playerId)}`); }
function setDeck(roomCode, cards) { sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(cards))}, discard_json='[]' WHERE code=${quote(roomCode)}`); }
function setTurn(roomCode, seat, phase = "play") { sql(`UPDATE rooms SET turn_seat=${seat}, phase=${quote(phase)}, pending_json=NULL, status='playing' WHERE code=${quote(roomCode)}`); }
function discardIds(roomCode) { return query(`SELECT json_extract(value,'$.id') FROM rooms,json_each(rooms.discard_json) WHERE rooms.code=${quote(roomCode)}`).split("\n").filter(Boolean); }

async function createQuickTestGame() {
  const created = await request("create", { quickStart: true });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  let room = created.data.room;
  while (room.status === "heroes") {
    const actor = room.players.find((player) => player.id === room.meId);
    assert.ok(actor, "Quick Test projects the next seat to the shared controller");
    const chosen = room.myHeroOptions[0];
    assert.ok(chosen, `Quick Test exposes a selectable hero for ${actor.name}`);
    const result = await request("choose_hero", { code: room.code, token: created.data.token, heroId: chosen.id });
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

async function createHumanSetupGame() {
  const created = await request("create", { name: "Host" });
  assert.equal(created.status, 201);
  const code = created.data.room.code;
  const members = [{ name: "Host", token: created.data.token }];
  for (const name of ["Alice", "Bob", "Carol"]) {
    const joined = await request("join", { code, name });
    assert.equal(joined.status, 201);
    members.push({ name, token: joined.data.token });
  }
  const started = await request("start", { code, token: created.data.token, name: "Host" });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const views = await Promise.all(members.map((member) => state(code, member.token)));
  return { code, members, views: views.map((view) => view.data) };
}

test("Quick Game uses one controller across four seats with a normal shuffled opening deal", async () => {
  const created = await request("create", { quickStart: true });
  assert.equal(created.status, 201);
  assert.equal(created.data.room.status, "heroes");
  assert.equal(created.data.room.isTestController, true);
  assert.equal(created.data.room.players.length, 4);
  assert.equal(created.data.room.myHeroOptions.length, 5);
  assert.equal(created.data.room.myHeroOptions.some((hero) => hero.id === "yu-jin"), false);
  assert.deepEqual(created.data.room.myHeroOptions.find((hero) => hero.id === "cao-cao").skills.map((skill) => skill.name), ["Treachery", "Entourage"]);
  assert.equal(created.data.room.players.filter((player) => player.role === "Lord").length, 1);
  assert.equal(created.data.room.players.filter((player) => player.role === null).length, 3);
  let room = created.data.room;
  const lord = room.players.find((player) => player.role === "Lord");
  assert.equal(room.meId, lord.id, "Quick Game starts with the shared controller on the Lord seat");
  const lordChoice = room.myHeroOptions[0].id;
  const lordResult = await request("choose_hero", { code: room.code, token: created.data.token, heroId: lordChoice });
  assert.equal(lordResult.status, 200, JSON.stringify(lordResult.data));
  room = lordResult.data.room;
  while (room.status === "heroes") {
    const actor = room.players.find((player) => player.id === room.meId);
    const chosen = await request("choose_hero", { code: room.code, token: created.data.token, heroId: room.myHeroOptions[0].id });
    assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
    assert.equal(chosen.data.room.players.find((player) => player.id === actor.id).generalReady, true);
    room = chosen.data.room;
  }
  assert.equal(room.status, "playing");
  assert.equal(room.players.length, 4);
  assert.ok(room.players.every((player) => player.hero));
  assert.ok(room.players.every((player) => player.hp === player.maxHp));
  assert.equal(room.turnSeat, lord.seat);
  assert.equal(room.deckCount, 92);
  const openingHands = room.players.map((player) => JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(player.id)}`)));
  const deck = JSON.parse(query(`SELECT deck_json FROM rooms WHERE code=${quote(room.code)}`));
  assert.ok(openingHands.every((hand) => hand.length === 4));
  const quickInitialDraws = room.timeline.filter((event) => event.type === "card" && event.action === "draw" && event.initialDeal && event.drawPlayerId === room.meId);
  assert.equal(quickInitialDraws.length, 4, "Quick Game projects the current seat's four-card opening deal as private draws");
  assert.equal(room.timeline.filter((event) => event.type === "card" && event.initialDeal && event.drawPlayerId !== room.meId).length, 0, "Quick Game does not expose another seat's opening hand");
  const allOpeningIds = [...openingHands.flat(), ...deck].map((card) => card.id);
  assert.equal(new Set(allOpeningIds).size, 108, "Quick Game preserves the shuffled physical deck without special-card duplication");

  const normal = await createHumanSetupGame();
  const normalLordView = normal.views.find((view) => view.myRole === "Lord");
  assert.ok(normalLordView, "normal multiplayer reveals the Lord role only to the Lord seat");
  assert.equal(normalLordView.myHeroOptions.length, 5);
  const normalLordMember = normal.members.find((member, index) => normal.views[index].meId === normalLordView.meId);
  const normalById = new Map(normal.views.map((view, index) => [view.meId, { view, member: normal.members[index] }]));
  for (const { view } of normalById.values()) {
    assert.equal(view.players.filter((player) => player.role === "Lord").length, 1);
    assert.equal(view.players.filter((player) => player.hero !== null).length, 0, "no general is revealed before selection");
    if (view.myRole !== "Lord") assert.equal(view.myHeroOptions.length, 0, "non-Lords wait for the Lord before receiving candidates");
  }
  const firstNonLord = [...normalById.values()].find(({ view }) => view.myRole !== "Lord");
  assert.ok(firstNonLord);
  const blocked = await request("choose_hero", { code: normal.code, token: firstNonLord.member.token, heroId: firstNonLord.view.myHeroOptions[0]?.id ?? "cao-cao" });
  assert.equal(blocked.status, 409, "normal multiplayer cannot choose before the Lord");
  const normalLordChoice = normalLordView.myHeroOptions[0];
  let normalProgress = await request("choose_hero", { code: normal.code, token: normalLordMember.token, heroId: normalLordChoice.id });
  assert.equal(normalProgress.status, 200, JSON.stringify(normalProgress.data));
  let normalState = normalProgress.data.room;
  assert.equal(normalState.players.find((player) => player.id === normalLordView.meId).hero, normalLordChoice.id);
  assert.equal(normalState.players.filter((player) => player.id !== normalLordView.meId && player.hero !== null).length, 0);
  while (normalState.status === "heroes") {
    const actorId = normalState.actionPlayerId;
    const actor = normal.members.find((member) => normalState.players.find((player) => player.id === actorId)?.name === member.name);
    assert.ok(actor);
    const actorView = (await state(normal.code, actor.token)).data;
    assert.equal(actorView.isMyAction, true);
    assert.equal(actorView.myHeroOptions.length, 3);
    normalProgress = await request("choose_hero", { code: normal.code, token: actor.token, heroId: actorView.myHeroOptions[0].id });
    assert.equal(normalProgress.status, 200, JSON.stringify(normalProgress.data));
    normalState = normalProgress.data.room;
    if (normalState.status === "heroes") {
      const observer = normal.members.find((member) => member.token !== actor.token);
      const observerView = (await state(normal.code, observer.token)).data;
      assert.equal(observerView.players.find((player) => player.id === actorId).hero, null, "other non-Lord selections stay hidden");
      assert.equal(observerView.players.find((player) => player.id === actorId).generalReady, true);
    }
  }
  assert.equal(normalState.status, "playing");
  const normalLord = normalState.players.find((player) => player.id === normalLordView.meId);
  assert.equal(normalState.turnSeat, normalLord.seat);
  assert.equal(normalLord.hp, normalLord.maxHp);
  assert.equal(normalLord.maxHp, normalLordChoice.hp + 1, "the Lord receives the Standard +1 HP bonus");
  const finalNormalViews = await Promise.all(normal.members.map((member) => state(normal.code, member.token)));
  for (const viewResponse of finalNormalViews) {
    const view = viewResponse.data;
    const initialDraws = view.timeline.filter((event) => event.type === "card" && event.action === "draw" && event.initialDeal && event.drawPlayerId === view.meId);
    assert.equal(initialDraws.length, 4, "each multiplayer private view receives exactly four opening draw cards");
    assert.equal(view.timeline.filter((event) => event.type === "card" && event.initialDeal && event.drawPlayerId !== view.meId).length, 0, "opening hands remain private to each player view");
  }
});

test("Wu hero skills complete through the normal semantic API", async () => {
  const qixiGame = await createHumanGame(); const qixiSource = qixiGame.room.players[0]; const qixiTarget = qixiGame.room.players[1];
  const blackCard = card("Peach", "qixi-black", "♣"); const targetCard = card("Peach", "qixi-target");
  sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(qixiSource.id)}`); setHand(qixiSource.id, [blackCard], 4, 4); setHand(qixiTarget.id, [targetCard], 4, 4); setTurn(qixiGame.code, qixiSource.seat);
  const qixi = await request("trigger", { code: qixiGame.code, token: qixiGame.members[0].token, providerId: "gan_ning_qixi", cardIds: [blackCard.id], targetId: qixiTarget.id });
  assert.equal(qixi.status, 200, JSON.stringify(qixi.data)); assert.equal(qixi.data.room.pendingTargetCard.cardKind, "Dismantle");
  const qixiChosen = await request("choose_target_card", { code: qixiGame.code, token: qixiGame.members[0].token, targetCardZone: "hand", targetCardIndex: 0 });
  assert.equal(qixiChosen.status, 200, JSON.stringify(qixiChosen.data)); assert.ok(discardIds(qixiGame.code).includes(blackCard.id)); assert.ok(!JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(qixiTarget.id)}`)).some((item) => item.id === targetCard.id));

  const kejiGame = await createHumanGame(); const kejiSource = kejiGame.room.players[0]; const oversized = [card("Peach", "keji-1"), card("Peach", "keji-2"), card("Peach", "keji-3")];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(kejiSource.id)}`); setHand(kejiSource.id, oversized, 2, 4); setTurn(kejiGame.code, kejiSource.seat);
  const keji = await request("end_turn", { code: kejiGame.code, token: kejiGame.members[0].token }); assert.equal(keji.status, 200, JSON.stringify(keji.data)); assert.notEqual(keji.data.room.phase, "discard");

  const kurouGame = await createHumanGame(); const kurouSource = kurouGame.room.players[0]; const kurouDraw = [card("Peach", "kurou-a"), card("Dodge", "kurou-b")];
  sql(`UPDATE players SET hero='huang-gai' WHERE id=${quote(kurouSource.id)}`); setHand(kurouSource.id, [], 4, 4); setDeck(kurouGame.code, kurouDraw); setTurn(kurouGame.code, kurouSource.seat);
  const kurou = await request("trigger", { code: kurouGame.code, token: kurouGame.members[0].token, providerId: "huang_gai_kurou" }); assert.equal(kurou.status, 200, JSON.stringify(kurou.data)); assert.equal(kurou.data.room.players.find((player) => player.id === kurouSource.id).hp, 3); assert.equal(kurou.data.room.myHand.length, 2);

  const zhouGame = await createHumanGame(); const zhouSource = zhouGame.room.players[0]; const zhouDraw = [card("Peach", "yingzi-a"), card("Dodge", "yingzi-b"), card("Attack", "yingzi-c")];
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(zhouSource.id)}`); setHand(zhouSource.id, [], 3, 3); setDeck(zhouGame.code, zhouDraw); setTurn(zhouGame.code, zhouSource.seat, "draw");
  const yingzi = await request("draw", { code: zhouGame.code, token: zhouGame.members[0].token }); assert.equal(yingzi.status, 200, JSON.stringify(yingzi.data)); assert.equal(yingzi.data.room.myHand.length, 0); assert.equal(yingzi.data.room.currentAction.kind, "trigger"); assert.equal(yingzi.data.room.currentAction.triggerOptions[0].effectId, "zhou_yu_yingzi"); assert.ok(yingzi.data.room.currentAction.legalActions.includes("decline_trigger"));
  const otherSeatView = await state(zhouGame.code, zhouGame.members[1].token); assert.equal(otherSeatView.data.currentAction.triggerOptions.length, 0, "Yingzi is private to Zhou Yu");
  const skippedYingzi = await request("decline_trigger", { code: zhouGame.code, token: zhouGame.members[0].token }); assert.equal(skippedYingzi.status, 200, JSON.stringify(skippedYingzi.data)); assert.equal(skippedYingzi.data.room.myHand.length, 2, "declining Yingzi draws exactly two normal cards");

  const acceptedGame = await createHumanGame(); const acceptedSource = acceptedGame.room.players[0];
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(acceptedSource.id)}`); setHand(acceptedSource.id, [], 3, 3); setDeck(acceptedGame.code, zhouDraw); setTurn(acceptedGame.code, acceptedSource.seat, "draw");
  await request("draw", { code: acceptedGame.code, token: acceptedGame.members[0].token });
  const acceptedYingzi = await request("trigger", { code: acceptedGame.code, token: acceptedGame.members[0].token, providerId: "zhou_yu_yingzi" }); assert.equal(acceptedYingzi.status, 200, JSON.stringify(acceptedYingzi.data)); assert.equal(acceptedYingzi.data.room.myHand.length, 3, "accepting Yingzi draws exactly three normal cards"); assert.equal(acceptedYingzi.data.room.phase, "play");

  const fanjianGame = await createHumanGame(); const fanjianSource = fanjianGame.room.players[0]; const fanjianTarget = fanjianGame.room.players[1]; const concealed = card("Peach", "fanjian-card", "♥"); const spare = card("Dodge", "fanjian-spare", "♠");
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(fanjianSource.id)}`); setHand(fanjianSource.id, [concealed, spare], 3, 3); setHand(fanjianTarget.id, [], 4, 4); setTurn(fanjianGame.code, fanjianSource.seat);
  const sourceView = await state(fanjianGame.code, fanjianGame.members[0].token);
  const initialOption = sourceView.data.currentAction.triggerOptions.find((option) => option.effectId === "zhou_yu_fanjian");
  assert.ok(initialOption); assert.deepEqual(initialOption.selection, { type: "target", targetIds: [fanjianTarget.id, fanjianGame.room.players[2].id, fanjianGame.room.players[3].id] });
  const fanjian = await request("trigger", { code: fanjianGame.code, token: fanjianGame.members[0].token, providerId: "zhou_yu_fanjian", targetId: fanjianTarget.id }); assert.equal(fanjian.status, 200, JSON.stringify(fanjian.data));
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(fanjianSource.id)}`)).length, 2, "activation does not transfer a card");
  const suitView = await state(fanjianGame.code, fanjianGame.members[1].token); const suitOption = suitView.data.currentAction.triggerOptions.find((option) => option.effectId === "zhou_yu_fanjian_choice");
  assert.deepEqual(suitOption.selection.choices.map((choice) => choice.id), ["♥", "♦", "♣", "♠"]); assert.equal(suitOption.allowDecline, false); assert.equal(JSON.stringify(suitView.data.currentAction).includes(concealed.id), false);
  const guess = await request("trigger", { code: fanjianGame.code, token: fanjianGame.members[1].token, providerId: "zhou_yu_fanjian_choice", choice: "♠" }); assert.equal(guess.status, 200, JSON.stringify(guess.data));
  const cardView = await state(fanjianGame.code, fanjianGame.members[1].token); const hiddenOption = cardView.data.currentAction.triggerOptions.find((option) => option.effectId === "zhou_yu_fanjian_choice");
  assert.deepEqual(hiddenOption.selection, { type: "target_cards", targetId: fanjianSource.id, min: 1, max: 1, eligibleKeys: ["hand:0", "hand:1"] }); assert.equal(JSON.stringify(cardView.data.currentAction).includes(concealed.id), false); assert.equal(JSON.stringify(cardView.data.currentAction).includes(concealed.suit), false);
  const obtained = await request("trigger", { code: fanjianGame.code, token: fanjianGame.members[1].token, providerId: "zhou_yu_fanjian_choice", cardKeys: ["hand:0"] }); assert.equal(obtained.status, 200, JSON.stringify(obtained.data)); assert.equal(obtained.data.room.players.find((player) => player.id === fanjianTarget.id).hp, 3); assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(fanjianTarget.id)}`)).map((item) => item.id), [concealed.id]); assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(fanjianSource.id)}`)).map((item) => item.id), [spare.id]);
  const duplicate = await request("trigger", { code: fanjianGame.code, token: fanjianGame.members[1].token, providerId: "zhou_yu_fanjian_choice", cardKeys: ["hand:0"] }); assert.equal(duplicate.status, 409);
});

test("Lü Bu Wushuang requires two Dodges for an Attack", async () => {
  const game = await createHumanGame(); const source = game.room.players[0]; const target = game.room.players[1]; const attack = card("Attack", "wushuang-attack"); const dodges = [card("Dodge", "wushuang-dodge-a"), card("Dodge", "wushuang-dodge-b")];
  sql(`UPDATE players SET hero='lü-bu' WHERE id=${quote(source.id)}`); setHand(source.id, [attack], 4, 4); setHand(target.id, dodges, 4, 4); setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: game.members[0].token, cardId: attack.id, targetId: target.id }); assert.equal(opened.status, 200, JSON.stringify(opened.data)); const response = await state(game.code, game.members[1].token); assert.equal(response.data.currentAction.requirement, "dodge"); assert.equal(response.data.currentAction.options.find((option) => option.providerId === "card").selection.min, 2);
  const blocked = await request("respond", { code: game.code, token: game.members[1].token, providerId: "card", cardIds: dodges.map((item) => item.id) }); assert.equal(blocked.status, 200, JSON.stringify(blocked.data)); assert.equal(blocked.data.room.players.find((player) => player.id === target.id).hp, 4);
});

test("Fanjian validates target ownership, empty hands, matching suits, once-per-phase state, and Dying", async () => {
  const selfGame = await createHumanGame(); const self = selfGame.room.players[0]; const selfCard = card("Peach", "fanjian-self");
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(self.id)}`); setHand(self.id, [selfCard], 3, 3); setTurn(selfGame.code, self.seat);
  assert.equal((await request("trigger", { code: selfGame.code, token: selfGame.members[0].token, providerId: "zhou_yu_fanjian", targetId: self.id })).status, 409, "Zhou Yu cannot target himself");
  const emptyGame = await createHumanGame(); const emptySource = emptyGame.room.players[0]; const emptyTarget = emptyGame.room.players[1];
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(emptySource.id)}`); setHand(emptySource.id, [], 3, 3); setTurn(emptyGame.code, emptySource.seat);
  assert.equal((await request("trigger", { code: emptyGame.code, token: emptyGame.members[0].token, providerId: "zhou_yu_fanjian", targetId: emptyTarget.id })).status, 409, "Fanjian requires a non-empty hand");

  const matchGame = await createHumanGame(); const matchSource = matchGame.room.players[0]; const matchTarget = matchGame.room.players[1]; const matchCard = card("Peach", "fanjian-match", "♥");
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(matchSource.id)}`); setHand(matchSource.id, [matchCard], 3, 3); setHand(matchTarget.id, [], 4, 4); setTurn(matchGame.code, matchSource.seat);
  await request("trigger", { code: matchGame.code, token: matchGame.members[0].token, providerId: "zhou_yu_fanjian", targetId: matchTarget.id });
  await request("trigger", { code: matchGame.code, token: matchGame.members[1].token, providerId: "zhou_yu_fanjian_choice", choice: "♥" });
  const matched = await request("trigger", { code: matchGame.code, token: matchGame.members[1].token, providerId: "zhou_yu_fanjian_choice", cardKeys: ["hand:0"] });
  assert.equal(matched.status, 200, JSON.stringify(matched.data)); assert.equal(matched.data.room.players.find((player) => player.id === matchTarget.id).hp, 4); assert.equal((await request("trigger", { code: matchGame.code, token: matchGame.members[0].token, providerId: "zhou_yu_fanjian", targetId: matchTarget.id })).status, 409, "Fanjian cannot be used twice in one Play Phase");
  for (const player of matchGame.room.players.slice(2)) setHand(player.id, [], 4, 4);
  assert.equal((await request("end_turn", { code: matchGame.code, token: matchGame.members[0].token })).status, 200);
  for (const index of [1, 2, 3]) {
    assert.equal((await request("draw", { code: matchGame.code, token: matchGame.members[index].token })).status, 200);
    assert.equal((await request("end_turn", { code: matchGame.code, token: matchGame.members[index].token })).status, 200);
  }
  const nextDraw = await request("draw", { code: matchGame.code, token: matchGame.members[0].token }); assert.equal(nextDraw.status, 200, JSON.stringify(nextDraw.data)); assert.equal(nextDraw.data.room.currentAction.triggerOptions[0].effectId, "zhou_yu_yingzi");
  const nextPlay = await request("decline_trigger", { code: matchGame.code, token: matchGame.members[0].token }); assert.equal(nextPlay.status, 200, JSON.stringify(nextPlay.data)); assert.ok(nextPlay.data.room.currentAction.triggerOptions.some((option) => option.effectId === "zhou_yu_fanjian"), "Fanjian resets on Zhou Yu's next turn");

  const dyingGame = await createHumanGame(); const dyingSource = dyingGame.room.players[0]; const dyingTarget = dyingGame.room.players[1]; const dyingCard = card("Peach", "fanjian-dying", "♥");
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(dyingSource.id)}`); setHand(dyingSource.id, [dyingCard], 3, 3); setHand(dyingTarget.id, [], 1, 4); setTurn(dyingGame.code, dyingSource.seat);
  await request("trigger", { code: dyingGame.code, token: dyingGame.members[0].token, providerId: "zhou_yu_fanjian", targetId: dyingTarget.id });
  await request("trigger", { code: dyingGame.code, token: dyingGame.members[1].token, providerId: "zhou_yu_fanjian_choice", choice: "♠" });
  const lethal = await request("trigger", { code: dyingGame.code, token: dyingGame.members[1].token, providerId: "zhou_yu_fanjian_choice", cardKeys: ["hand:0"] });
  assert.equal(lethal.status, 200, JSON.stringify(lethal.data)); assert.equal(lethal.data.room.phase, "dying"); assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(dyingTarget.id)}`)).map((item) => item.id), [dyingCard.id]);
});

test("Yingzi uses the same optional trigger sequence in Quick Game and rejects duplicate acceptance", async () => {
  const quick = await createQuickTestGame(); const { token, room } = quick.data; const source = room.players[0];
  const drawCardsForYingzi = [card("Peach", "quick-yingzi-a"), card("Dodge", "quick-yingzi-b"), card("Attack", "quick-yingzi-c")];
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(source.id)}`); setHand(source.id, [], 3, 3); setDeck(room.code, drawCardsForYingzi); setTurn(room.code, source.seat, "draw");
  const opened = await request("draw", { code: room.code, token }); assert.equal(opened.status, 200, JSON.stringify(opened.data)); assert.equal(opened.data.room.meId, source.id); assert.deepEqual(opened.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["zhou_yu_yingzi"]);
  const submissions = await Promise.all([
    request("trigger", { code: room.code, token, providerId: "zhou_yu_yingzi" }),
    request("trigger", { code: room.code, token, providerId: "zhou_yu_yingzi" }),
  ]);
  assert.deepEqual(submissions.map((result) => result.status).sort(), [200, 409]);
  const resolved = await state(room.code, token); assert.equal(resolved.data.myHand.length, 3, "Quick Game accepts Yingzi once and draws exactly three normal cards"); assert.equal(resolved.data.phase, "play");
});

test("Yingzi opens only after a Zhou Yu delayed Judgement resolves", async () => {
  const game = await createHumanGame(); const source = game.room.players[0];
  const delayed = card("Overindulgence", "yingzi-delayed"); const judge = card("Dodge", "yingzi-judge", "♥"); const normalDraw = [card("Peach", "yingzi-normal-a"), card("Dodge", "yingzi-normal-b"), card("Attack", "yingzi-normal-c")];
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(source.id)}`); setHand(source.id, [], 3, 3); setJudgement(source.id, [delayed]); setDeck(game.code, [judge, ...normalDraw]); setTurn(game.code, source.seat, "draw");
  const opened = await request("draw", { code: game.code, token: game.members[0].token }); assert.equal(opened.status, 200, JSON.stringify(opened.data)); assert.equal(opened.data.room.currentAction.triggerOptions[0].effectId, "zhou_yu_yingzi");
  const judgementIndex = opened.data.room.log.findIndex((entry) => entry.includes("judges A♥ for Overindulgence")); const yingziIndex = opened.data.room.log.findIndex((entry) => entry.includes("may use Yingzi"));
  assert.ok(judgementIndex >= 0 && judgementIndex < yingziIndex, "Judgement resolves before Yingzi is offered");
  const declined = await request("decline_trigger", { code: game.code, token: game.members[0].token }); assert.equal(declined.status, 200, JSON.stringify(declined.data)); assert.equal(declined.data.room.myHand.length, 2);
});

test("Quick Game uses Fanjian's shared-controller sequence and private opaque card choice", async () => {
  const quick = await createQuickTestGame(); const { token, room } = quick.data; const { code } = room; const source = room.players[0]; const target = room.players[1]; const concealed = card("Peach", "quick-fanjian", "♦");
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(source.id)}`); setHand(source.id, [concealed], 3, 3); setHand(target.id, [], 4, 4); setTurn(code, source.seat);
  const opened = await request("trigger", { code, token, providerId: "zhou_yu_fanjian", targetId: target.id }); assert.equal(opened.status, 200, JSON.stringify(opened.data)); assert.equal(opened.data.room.currentAction.actorId, target.id);
  const targetView = await state(code, token); assert.equal(targetView.data.meId, target.id); assert.equal(targetView.data.currentAction.triggerOptions[0].selection.type, "choice");
  const guessed = await request("trigger", { code, token, providerId: "zhou_yu_fanjian_choice", choice: "♦" }); assert.equal(guessed.status, 200, JSON.stringify(guessed.data)); assert.equal(guessed.data.room.currentAction.triggerOptions[0].selection.type, "target_cards"); assert.deepEqual(guessed.data.room.currentAction.triggerOptions[0].selection.eligibleKeys, ["hand:0"]);
  const selected = await request("trigger", { code, token, providerId: "zhou_yu_fanjian_choice", cardKeys: ["hand:0"] }); assert.equal(selected.status, 200, JSON.stringify(selected.data)); assert.equal(selected.data.room.players.find((player) => player.id === target.id).handCount, 1); assert.equal(selected.data.room.players.find((player) => player.id === target.id).hp, 4);
});

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
  const created = await createQuickTestGame();
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
  let setup = (await state(code, members[0].token)).data;
  while (setup.status === "heroes") {
    const actorMember = members.find((member) => setup.players.some((player) => player.id === setup.actionPlayerId && player.name === member.name));
    assert.ok(actorMember, "the authoritative setup actor has a matching human seat");
    const actorView = (await state(code, actorMember.token)).data;
    const chosen = await request("choose_hero", { code, token: actorMember.token, heroId: actorView.myHeroOptions[0].id });
    assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
    setup = chosen.data.room;
  }
  const started = (await state(code, members[0].token)).data; const deck = JSON.parse(query(`SELECT deck_json FROM rooms WHERE code=${quote(code)}`) || "[]");
  for (const player of started.players) {
    const hand = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(player.id)}`) || "[]");
    for (let index = 0; index < hand.length; index++) if (hand[index].kind === "Negation") { const replacementIndex = deck.findIndex((held) => held.kind !== "Negation"); const [replacement] = deck.splice(replacementIndex, 1); deck.push(hand[index]); hand[index] = replacement; }
    sql(`UPDATE players SET hand_json=${quote(JSON.stringify(hand))} WHERE id=${quote(player.id)}`);
  }
  for (const player of started.players) {
    const hp = 4 + (player.role === "Lord" ? 1 : 0);
    sql(`UPDATE players SET hero='yue-jin', hp=${hp}, max_hp=${hp}, hero_options_json='[]' WHERE id=${quote(player.id)}`);
  }
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify(deck))} WHERE code=${quote(code)}`);
  return { code, members, room: (await state(code, members[0].token)).data };
}

test("the three faction lords expose their active skills through the semantic protocol", { timeout: 120_000 }, async () => {
  const rendeGame = await createHumanGame();
  const [rendeHost, rendeAlice] = rendeGame.members;
  const rendeLiu = rendeGame.room.players.find((player) => player.name === "Host");
  const rendeTarget = rendeGame.room.players.find((player) => player.name === "Alice");
  assert.ok(rendeLiu && rendeTarget);
  const rendeCards = [card("Attack", "rende-one"), card("Dodge", "rende-two"), card("Peach", "rende-three")];
  sql(`UPDATE players SET hero='liu-bei' WHERE id=${quote(rendeLiu.id)}`);
  setHand(rendeLiu.id, rendeCards, 3, 4); setHand(rendeTarget.id, [], 4, 4); setTurn(rendeGame.code, rendeLiu.seat);
  const rendeView = await state(rendeGame.code, rendeHost.token);
  const rendeOption = rendeView.data.currentAction.triggerOptions.find((option) => option.effectId === "liu_bei_rende");
  assert.ok(rendeOption, "Liu Bei projects Rende as a generic Play Phase trigger");
  assert.deepEqual(rendeOption.selection.eligibleCardIds, rendeCards.map((held) => held.id));
  const rende = await request("trigger", { code: rendeGame.code, token: rendeHost.token, providerId: "liu_bei_rende", cardIds: [rendeCards[0].id, rendeCards[1].id], targetId: rendeTarget.id });
  assert.equal(rende.status, 200, JSON.stringify(rende.data));
  assert.equal(rende.data.room.players.find((player) => player.id === rendeLiu.id).hp, 4, "Rende recovers after giving two cards");
  assert.deepEqual((await state(rendeGame.code, rendeAlice.token)).data.myHand.map((held) => held.id), [rendeCards[0].id, rendeCards[1].id]);

  const zhihengGame = await createHumanGame();
  const zhihengHost = zhihengGame.members[0];
  const zhihengSun = zhihengGame.room.players.find((player) => player.name === "Host");
  assert.ok(zhihengSun);
  const discarded = card("Peach", "zhiheng-discard"); const drawn = card("Attack", "zhiheng-drawn");
  sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(zhihengSun.id)}`);
  setHand(zhihengSun.id, [discarded], 4, 4); setDeck(zhihengGame.code, [drawn]); setTurn(zhihengGame.code, zhihengSun.seat);
  const zhiheng = await request("trigger", { code: zhihengGame.code, token: zhihengHost.token, providerId: "sun_quan_zhiheng", cardIds: [discarded.id] });
  assert.equal(zhiheng.status, 200, JSON.stringify(zhiheng.data));
  assert.ok(zhiheng.data.room.myHand.some((held) => held.id === drawn.id), "Zhiheng draws the replacement card privately");
  assert.ok(discardIds(zhihengGame.code).includes(discarded.id));
  assert.deepEqual(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(zhihengGame.code)}`)), { turnPlayerId: zhihengSun.id, zhihengUsed: true });

  const jiuyuanGame = await createHumanGame();
  const jiuyuanMembers = jiuyuanGame.members;
  const jiuyuanSource = jiuyuanGame.room.players.find((player) => player.name === "Host");
  const sun = jiuyuanGame.room.players.find((player) => player.name === "Alice");
  const wuRescuer = jiuyuanGame.room.players.find((player) => player.name === "Bob");
  assert.ok(jiuyuanSource && sun && wuRescuer);
  const lethalAttack = card("Attack", "jiuyuan-lethal"); const rescuePeach = card("Peach", "jiuyuan-peach");
  sql(`UPDATE players SET hero=NULL WHERE id IN (${jiuyuanGame.room.players.filter((player) => player.id !== sun.id && player.id !== wuRescuer.id).map((player) => quote(player.id)).join(",")})`);
  sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(sun.id)}`); sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(wuRescuer.id)}`);
  setEquipment(sun.id, {}); setHand(jiuyuanSource.id, [lethalAttack], 4, 4); setHand(sun.id, [], 1, 4); setHand(wuRescuer.id, [rescuePeach], 4, 4); setTurn(jiuyuanGame.code, jiuyuanSource.seat);
  const jiuyuanAttack = await request("play_card", { code: jiuyuanGame.code, token: jiuyuanMembers[0].token, cardId: lethalAttack.id, targetId: sun.id });
  assert.equal(jiuyuanAttack.status, 200, JSON.stringify(jiuyuanAttack.data));
  let jiuyuanRescue = null;
  const jiuyuanMemberById = new Map(jiuyuanGame.room.players.map((player, index) => [player.id, jiuyuanMembers[index]]));
  for (let attempt = 0; attempt < jiuyuanMembers.length && !jiuyuanRescue; attempt++) {
    const view = await state(jiuyuanGame.code, jiuyuanMembers[0].token); const actorId = view.data.currentAction?.actorId; const actorMember = actorId ? jiuyuanMemberById.get(actorId) : null;
    if (view.data.currentAction?.kind !== "dying" || !actorMember) break;
    jiuyuanRescue = actorId === wuRescuer.id
      ? await request("give_peach", { code: jiuyuanGame.code, token: actorMember.token, cardId: rescuePeach.id })
      : await request("skip_rescue", { code: jiuyuanGame.code, token: actorMember.token });
    if (actorId !== wuRescuer.id) jiuyuanRescue = null;
  }
  assert.equal(jiuyuanRescue?.status, 200, JSON.stringify(jiuyuanRescue?.data));
  assert.equal(jiuyuanRescue.data.room.players.find((player) => player.id === sun.id).hp, 2, JSON.stringify(jiuyuanRescue.data.room));

  const jianxiongGame = await createHumanGame();
  const jianxiongHost = jianxiongGame.members[0];
  const jianxiongSource = jianxiongGame.room.players.find((player) => player.name === "Host");
  const cao = jianxiongGame.room.players.find((player) => player.name === "Alice");
  assert.ok(jianxiongSource && cao);
  const damageCard = card("Attack", "jianxiong-attack");
  sql(`UPDATE players SET hero=NULL WHERE id IN (${jianxiongGame.room.players.filter((player) => player.id !== cao.id).map((player) => quote(player.id)).join(",")})`); sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(cao.id)}`);
  setEquipment(jianxiongSource.id, {}); setEquipment(cao.id, {}); setHand(jianxiongSource.id, [damageCard], 4, 4); setHand(cao.id, [], 4, 4); setTurn(jianxiongGame.code, jianxiongSource.seat);
  const damage = await request("play_card", { code: jianxiongGame.code, token: jianxiongHost.token, cardId: damageCard.id, targetId: cao.id });
  assert.equal(damage.status, 200, JSON.stringify(damage.data));
  const caoDamageView = await state(jianxiongGame.code, jianxiongGame.members[1].token);
  assert.ok(caoDamageView.data.currentAction.triggerOptions?.some((option) => option.effectId === "cao_cao_jianxiong"), JSON.stringify(caoDamageView.data));
  const gained = await request("trigger", { code: jianxiongGame.code, token: jianxiongGame.members[1].token, providerId: "cao_cao_jianxiong" });
  assert.equal(gained.status, 200, JSON.stringify(gained.data));
  assert.ok((await state(jianxiongGame.code, jianxiongGame.members[1].token)).data.myHand.some((held) => held.id === damageCard.id));
  assert.equal(discardIds(jianxiongGame.code).includes(damageCard.id), false, "Jianxiong takes the damage card before it reaches discard");

  const hujiaGame = await createHumanGame();
  const [hujiaHost, hujiaAlice, hujiaBob] = hujiaGame.members;
  const hujiaSource = hujiaGame.room.players.find((player) => player.name === "Host");
  const hujiaCao = hujiaGame.room.players.find((player) => player.name === "Alice");
  const hujiaWei = hujiaGame.room.players.find((player) => player.name === "Bob");
  assert.ok(hujiaSource && hujiaCao && hujiaWei);
  const hujiaAttack = card("Attack", "hujia-attack"); const hujiaDodge = card("Dodge", "hujia-dodge");
  sql(`UPDATE players SET hero=NULL WHERE id=${quote(hujiaSource.id)}`); sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(hujiaCao.id)}`); sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(hujiaWei.id)}`);
  setEquipment(hujiaCao.id, {}); setHand(hujiaSource.id, [hujiaAttack], 4, 4); setHand(hujiaCao.id, [], 4, 4); setHand(hujiaWei.id, [hujiaDodge], 4, 4); setTurn(hujiaGame.code, hujiaSource.seat);
  const hujiaOpened = await request("play_card", { code: hujiaGame.code, token: hujiaHost.token, cardId: hujiaAttack.id, targetId: hujiaCao.id });
  assert.equal(hujiaOpened.status, 200, JSON.stringify(hujiaOpened.data));
  const hujiaTargetView = await state(hujiaGame.code, hujiaAlice.token);
  assert.ok(hujiaTargetView.data.currentAction?.options?.some((option) => option.providerId === "cao_cao_hujia"), JSON.stringify(hujiaTargetView.data));
  const delegated = await request("respond", { code: hujiaGame.code, token: hujiaAlice.token, providerId: "cao_cao_hujia" });
  assert.equal(delegated.status, 200, JSON.stringify(delegated.data));
  assert.equal(delegated.data.room.currentAction.actorId, hujiaWei.id, "Hujia moves the Dodge decision to a Wei delegate");
  const hujiaDodged = await request("respond", { code: hujiaGame.code, token: hujiaBob.token, cardId: hujiaDodge.id });
  assert.equal(hujiaDodged.status, 200, JSON.stringify(hujiaDodged.data));
  assert.equal(hujiaDodged.data.room.players.find((player) => player.id === hujiaCao.id).hp, 4, "the delegated Dodge prevents damage");

  const jijiangGame = await createHumanGame();
  const [jijiangHost, jijiangAlice, jijiangBob] = jijiangGame.members;
  const jijiangSource = jijiangGame.room.players.find((player) => player.name === "Host");
  const liu = jijiangGame.room.players.find((player) => player.name === "Alice");
  const shu = jijiangGame.room.players.find((player) => player.name === "Bob");
  const other = jijiangGame.room.players.find((player) => player.name === "Carol");
  assert.ok(jijiangSource && liu && shu && other);
  const invasion = card("BarbarianInvasion", "jijiang-invasion"); const jijiangAttack = card("Attack", "jijiang-attack");
  sql(`UPDATE players SET hero=NULL WHERE id=${quote(jijiangSource.id)}`); sql(`UPDATE players SET hero='liu-bei' WHERE id=${quote(liu.id)}`); sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(shu.id)}`); sql(`UPDATE players SET hero=NULL WHERE id=${quote(other.id)}`);
  setHand(jijiangSource.id, [invasion], 4, 4); setHand(liu.id, [], 4, 4); setHand(shu.id, [jijiangAttack], 4, 4); setHand(other.id, [], 4, 4); setTurn(jijiangGame.code, jijiangSource.seat);
  const invasionOpened = await request("play_card", { code: jijiangGame.code, token: jijiangHost.token, cardId: invasion.id });
  assert.equal(invasionOpened.status, 200, JSON.stringify(invasionOpened.data));
  const jijiangTargetView = await state(jijiangGame.code, jijiangAlice.token);
  assert.ok(jijiangTargetView.data.currentAction.options.some((option) => option.providerId === "liu_bei_jijiang"));
  const jijiangDelegated = await request("respond", { code: jijiangGame.code, token: jijiangAlice.token, providerId: "liu_bei_jijiang" });
  assert.equal(jijiangDelegated.status, 200, JSON.stringify(jijiangDelegated.data));
  assert.equal(jijiangDelegated.data.room.currentAction.actorId, shu.id);
  const jijiangAnswered = await request("respond", { code: jijiangGame.code, token: jijiangBob.token, cardId: jijiangAttack.id });
  assert.equal(jijiangAnswered.status, 200, JSON.stringify(jijiangAnswered.data));
  assert.equal(jijiangAnswered.data.room.phase, "play", JSON.stringify(jijiangAnswered.data.room));
  assert.ok(jijiangAnswered.data.room.log.some((entry) => entry.includes("Bob plays Attack against Barbarian Invasion")));
});

test("Hujia prompts a living Wei character even when that character has no Dodge", { timeout: 120_000 }, async () => {
  const game = await openHujiaScenario({ delegateHero: "simayi" });
  const activated = await request("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia" });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  assert.equal(activated.data.error, undefined);
  assert.equal(activated.data.room.currentAction.actorId, game.delegate.id);
  const delegateView = await state(game.code, game.delegateMember.token);
  assert.deepEqual(delegateView.data.currentAction.legalActions, ["decline_response"]);
  assert.deepEqual(delegateView.data.currentAction.options, []);
  assert.match(delegateView.data.currentAction.reason, /^Cao Cao asks you to provide Dodge with Hujia\.$/);
  const caoView = await state(game.code, game.caoMember.token);
  assert.doesNotMatch(caoView.data.currentAction.reason, /no Dodge/i);
});

test("Hujia lets a Wei character with Dodge cancel the Attack", { timeout: 120_000 }, async () => {
  const dodge = card("Dodge", "hujia-regression-dodge");
  const game = await openHujiaScenario({ delegateHero: "simayi", delegateCards: [dodge] });
  const activated = await request("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia" });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  const delegateView = await state(game.code, game.delegateMember.token);
  assert.ok(delegateView.data.currentAction.legalActions.includes("respond"));
  assert.ok(delegateView.data.currentAction.legalActions.includes("decline_response"));
  assert.match(delegateView.data.currentAction.reason, /Play Dodge or decline/);
  const answered = await request("respond", { code: game.code, token: game.delegateMember.token, cardId: dodge.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.equal(answered.data.room.players.find((player) => player.id === game.cao.id).hp, 4);
});

test("Hujia asks Wei characters in action order instead of skipping empty hands", { timeout: 120_000 }, async () => {
  const dodge = card("Dodge", "hujia-order-dodge");
  const game = await openHujiaScenario({ delegateHero: "simayi", thirdHero: "zhang-liao", thirdCards: [dodge] });
  const activated = await request("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia" });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  assert.equal(activated.data.room.currentAction.actorId, game.delegate.id);
  const firstDecline = await request("decline_response", { code: game.code, token: game.delegateMember.token });
  assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data));
  assert.equal(firstDecline.data.room.currentAction.actorId, game.third.id);
  const answered = await request("respond", { code: game.code, token: game.thirdMember.token, cardId: dodge.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.equal(answered.data.room.players.find((player) => player.id === game.cao.id).hp, 4);
});

test("Hujia returns to Cao Cao after every Wei character declines without looping", { timeout: 120_000 }, async () => {
  const game = await openHujiaScenario({ delegateHero: "simayi", thirdHero: "zhang-liao" });
  const activated = await request("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia" });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  const firstDecline = await request("decline_response", { code: game.code, token: game.delegateMember.token });
  assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data));
  assert.equal(firstDecline.data.room.currentAction.actorId, game.third.id);
  const secondDecline = await request("decline_response", { code: game.code, token: game.thirdMember.token });
  assert.equal(secondDecline.status, 200, JSON.stringify(secondDecline.data));
  assert.equal(secondDecline.data.room.currentAction.actorId, game.cao.id);
  const caoAfterDelegation = await state(game.code, game.caoMember.token);
  assert.deepEqual(caoAfterDelegation.data.currentAction.legalActions, ["decline_response"]);
  assert.deepEqual(caoAfterDelegation.data.currentAction.options, []);
  const finalDecline = await request("decline_response", { code: game.code, token: game.caoMember.token });
  assert.equal(finalDecline.status, 200, JSON.stringify(finalDecline.data));
  assert.equal(finalDecline.data.room.players.find((player) => player.id === game.cao.id).hp, 3);
});

test("Hujia fallback lets Cao Cao use his own Dodge after all Wei declines", { timeout: 120_000 }, async () => {
  const dodge = card("Dodge", "hujia-fallback-dodge");
  const game = await openHujiaScenario({ delegateHero: "simayi", caoCards: [dodge] });
  const activated = await request("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia" });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  const declined = await request("decline_response", { code: game.code, token: game.delegateMember.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.currentAction.actorId, game.cao.id);
  const caoView = await state(game.code, game.caoMember.token);
  assert.ok(caoView.data.currentAction.legalActions.includes("respond"));
  assert.ok(caoView.data.currentAction.legalActions.includes("decline_response"));
  assert.ok(caoView.data.currentAction.options.some((option) => option.providerId === "card"));
  assert.equal(caoView.data.currentAction.options.some((option) => option.providerId === "cao_cao_hujia"), false);
  const answered = await request("respond", { code: game.code, token: game.caoMember.token, cardId: dodge.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.equal(answered.data.room.players.find((player) => player.id === game.cao.id).hp, 4);
});

test("Jijiang also asks an empty-handed Shu character before the next delegate", { timeout: 120_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, liuMember, firstShuMember, secondShuMember] = game.members;
  const source = game.room.players.find((player) => player.name === "Host");
  const liu = game.room.players.find((player) => player.name === "Alice");
  const firstShu = game.room.players.find((player) => player.name === "Bob");
  const secondShu = game.room.players.find((player) => player.name === "Carol");
  assert.ok(source && liu && firstShu && secondShu);
  const invasion = card("BarbarianInvasion", "jijiang-order-invasion");
  const attack = card("Attack", "jijiang-order-attack");
  for (const player of game.room.players) sql("UPDATE players SET hero=NULL WHERE id=" + quote(player.id));
  sql("UPDATE players SET hero='liu-bei' WHERE id=" + quote(liu.id));
  sql("UPDATE players SET hero='guan-yu' WHERE id=" + quote(firstShu.id));
  sql("UPDATE players SET hero='zhao-yun' WHERE id=" + quote(secondShu.id));
  setHand(source.id, [invasion], 4, 4); setHand(liu.id, [], 4, 4); setHand(firstShu.id, [], 4, 4); setHand(secondShu.id, [attack], 4, 4); setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: invasion.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const liuView = await state(game.code, liuMember.token);
  assert.ok(liuView.data.currentAction.options.some((option) => option.providerId === "liu_bei_jijiang"));
  const activated = await request("respond", { code: game.code, token: liuMember.token, providerId: "liu_bei_jijiang" });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  assert.equal(activated.data.room.currentAction.actorId, firstShu.id);
  const firstDecline = await request("decline_response", { code: game.code, token: firstShuMember.token });
  assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data));
  assert.equal(firstDecline.data.room.currentAction.actorId, secondShu.id);
  const answered = await request("respond", { code: game.code, token: secondShuMember.token, cardId: attack.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
});

async function openHujiaScenario({ delegateHero, delegateCards = [], thirdHero = null, thirdCards = [], caoCards = [] }) {
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
  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: cao.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const caoView = await state(game.code, caoMember.token);
  assert.ok(caoView.data.currentAction.options.some((option) => option.providerId === "cao_cao_hujia"), JSON.stringify(caoView.data));
  return { ...game, source, cao, delegate, third, sourceMember, caoMember, delegateMember, thirdMember };
}

async function openGanglieAttack({ judge, sourceCards = [card("Attack", "ganglie-attack")], sourceHp = 4 } = {}) {
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
  const attack = await request("play_card", { code: game.code, token: sourceMember.token, cardId: sourceCards[0].id, targetId: target.id });
  assert.equal(attack.status, 200, JSON.stringify(attack.data));
  assert.equal(attack.data.room.currentAction.kind, "trigger", JSON.stringify(attack.data.room));
  assert.equal(attack.data.room.currentAction.triggerEvent, "damage_suffered");
  assert.equal(attack.data.room.currentAction.actorId, target.id);
  return { ...game, sourceMember, targetMember, source, target, actionPresentation: attack.data.room.currentAction.presentation };
}

async function openFankuiAttack({ sourceCards = [card("Attack", "fankui-attack"), card("Peach", "fankui-source-hidden")], sourceHp = 4, sourceMaxHp = 4, sourceEquipment = {}, sourceJudgement = [], expectReaction = true } = {}) {
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
  const attack = await request("play_card", { code: game.code, token: sourceMember.token, cardId: sourceCards[0].id, targetId: target.id });
  assert.equal(attack.status, 200, JSON.stringify(attack.data));
  if (expectReaction) {
    assert.equal(attack.data.room.currentAction.kind, "trigger", JSON.stringify(attack.data.room));
    assert.equal(attack.data.room.currentAction.triggerEvent, "damage_suffered");
    assert.equal(attack.data.room.currentAction.actorId, target.id);
  }
  return { ...game, sourceMember, targetMember, source, target, actionPresentation: attack.data.room.currentAction.presentation };
}

async function openGanglieGroup({ kind, judge, suffix }) {
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
  const started = await request("play_card", { code: game.code, token: sourceMember.token, cardId: `${kind.toLowerCase()}-${suffix}-source` });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  assert.equal(started.data.room.currentAction.kind, "trigger", JSON.stringify(started.data.room));
  assert.equal(started.data.room.currentAction.triggerEvent, "damage_suffered");
  assert.equal(started.data.room.currentAction.actorId, target.id);
  const targetView = (await state(game.code, targetMember.token)).data;
  assert.ok(targetView.currentAction.triggerOptions.some((option) => option.effectId === "xiahou_dun_ganglie"));
  return { ...game, sourceMember, targetMember, bobMember, carolMember, source, target, bob, carol, required };
}


test("Raining Arrows and Barbarian Invasion resume through Xiahou Dun Stauchness", { timeout: 30_000 }, async () => {
  for (const kind of ["RainingArrows", "BarbarianInvasion"]) {
    const declined = await openGanglieGroup({ kind, suffix: `ganglie-${kind.toLowerCase()}-decline`, judge: { ...card("Dodge", `ganglie-${kind.toLowerCase()}-decline-judge`), suit: "♥", rank: "2" } });
    const skipped = await request("decline_trigger", { code: declined.code, token: declined.targetMember.token });
    assert.equal(skipped.status, 200, JSON.stringify(skipped.data));
    assert.equal(skipped.data.room.currentAction.kind, "response");
    assert.equal(skipped.data.room.currentAction.actorId, declined.bob.id, "declining Stauchness resumes the next AOE target");
    assert.equal(skipped.data.room.players.find((player) => player.id === declined.target.id).hp, 2);
    const bobAnswered = await request("respond", { code: declined.code, token: declined.bobMember.token, cardId: `${declined.required.toLowerCase()}-ganglie-${kind.toLowerCase()}-decline-bob` });
    const finished = await request("respond", { code: declined.code, token: declined.carolMember.token, cardId: `${declined.required.toLowerCase()}-ganglie-${kind.toLowerCase()}-decline-carol` });
    assert.equal(bobAnswered.status, 200); assert.equal(finished.status, 200, JSON.stringify(finished.data));
    assert.equal(finished.data.room.phase, "play");
    assert.equal(discardIds(declined.code).filter((id) => id === `${kind.toLowerCase()}-ganglie-${kind.toLowerCase()}-decline-source`).length, 1, "the held AOE card is discarded exactly once after completion");

    const accepted = await openGanglieGroup({ kind, suffix: `ganglie-${kind.toLowerCase()}-accept`, judge: { ...card("Dodge", `ganglie-${kind.toLowerCase()}-accept-judge`), suit: "♠", rank: "7" } });
    const judged = await request("trigger", { code: accepted.code, token: accepted.targetMember.token, providerId: "xiahou_dun_ganglie" });
    assert.equal(judged.status, 200, JSON.stringify(judged.data));
    assert.equal(judged.data.room.currentAction.kind, "trigger");
    assert.equal(judged.data.room.currentAction.triggerEvent, "damage_suffered");
    assert.equal(judged.data.room.currentAction.actorId, accepted.source.id, "the Stauchness consequence belongs to the damage source");
    const consequence = await request("trigger", { code: accepted.code, token: accepted.sourceMember.token, providerId: "xiahou_dun_ganglie", choice: "take_damage" });
    assert.equal(consequence.status, 200, JSON.stringify(consequence.data));
    assert.equal(consequence.data.room.currentAction.kind, "response");
    assert.equal(consequence.data.room.currentAction.actorId, accepted.bob.id, "resolving Stauchness resumes the next AOE target");
    assert.equal(consequence.data.room.players.find((player) => player.id === accepted.target.id).hp, 2);
    assert.equal(consequence.data.room.players.find((player) => player.id === accepted.source.id).hp, 3);
    await request("respond", { code: accepted.code, token: accepted.bobMember.token, cardId: `${accepted.required.toLowerCase()}-ganglie-${kind.toLowerCase()}-accept-bob` });
    const acceptedFinished = await request("respond", { code: accepted.code, token: accepted.carolMember.token, cardId: `${accepted.required.toLowerCase()}-ganglie-${kind.toLowerCase()}-accept-carol` });
    assert.equal(acceptedFinished.status, 200, JSON.stringify(acceptedFinished.data));
    assert.equal(acceptedFinished.data.room.phase, "play");
    assert.equal(discardIds(accepted.code).filter((id) => id === `${kind.toLowerCase()}-ganglie-${kind.toLowerCase()}-accept-source`).length, 1, "accepting Stauchness does not duplicate the held AOE discard");
  }
});

test("Quick Test follows the Xiahou Dun Group trigger perspective", { timeout: 30_000 }, async () => {
  const quick = await createQuickTestGame();
  const { token, room } = quick.data;
  const [source, first, second, xiahou] = room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero=NULL WHERE id IN (${quote(first.id)},${quote(second.id)})`);
  sql(`UPDATE players SET hero='xiahou-dun' WHERE id=${quote(xiahou.id)}`);
  setHand(source.id, [card("RainingArrows", "quick-group-ganglie")], 4, 4);
  setHand(first.id, [], 3, 3); setHand(second.id, [], 3, 3); setHand(xiahou.id, [], 3, 3);
  setTurn(room.code, source.seat);
  const opened = await request("play_card", { code: room.code, token, cardId: "rainingarrows-quick-group-ganglie" });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  assert.equal(opened.data.room.currentAction.triggerEvent, "damage_suffered");
  assert.equal(opened.data.room.currentAction.actorId, xiahou.id);
  assert.equal(opened.data.room.meId, xiahou.id, "Quick Test follows the Group trigger actor");
  assert.equal(opened.data.room.isMyAction, true);
  assert.deepEqual(opened.data.room.players.map((player) => player.handCards), [[], [], [], []]);
  const declined = await request("decline_trigger", { code: room.code, token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.phase, "play");
  assert.equal(discardIds(room.code).filter((id) => id === "rainingarrows-quick-group-ganglie").length, 1);
});

test("Quick Test exhausts each AOE Negation window before the target response, with one private hand", async () => {
  for (const [kind, required] of [["RainingArrows", "Dodge"], ["BarbarianInvasion", "Attack"]]) {
  const created = await createQuickTestGame(); const { token, room } = created.data;
  const [me, ...targets] = room.players;
  setHand(me.id, [card(kind, "perspective"), card("Negation", "perspective-user")], 3, 3);
  for (const target of targets) setHand(target.id, [card("Negation", `perspective-${target.seat}`), card(required, `perspective-${target.seat}`)], 3, 3);
  setTurn(room.code, me.seat);
  const act = (action, extra = {}) => request(action, { code: room.code, token, ...extra });
  let result = await act("play_card", { cardId: `${kind.toLowerCase()}-perspective` }); assert.equal(result.status, 200, JSON.stringify(result.data));
  for (const target of targets) {
    const ordered = room.players;
    for (const responder of ordered) {
      const view = result.data.room;
      assert.equal(view.meId, responder.id); assert.equal(view.actionPlayerId, responder.id);
      assert.ok(view.isMyAction); assert.ok(view.players.every((p) => p.handCards.length === 0));
      assert.deepEqual(view.myHand, JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(responder.id)}`)));
      assert.equal(view.myRole, view.players.find((p) => p.id === responder.id).role);
      result = await act("decline_response"); assert.equal(result.status, 200);
    }
    assert.equal(result.data.room.meId, target.id); assert.equal(result.data.room.pendingNegation, null);
    assert.equal(result.data.room.currentAction.requirement, required.toLowerCase());
    result = await act("respond", { cardId: `${required.toLowerCase()}-perspective-${target.seat}` }); assert.equal(result.status, 200);
    if (result.data.room.currentAction?.triggerEvent === "damage_suffered") {
      result = await act("decline_trigger"); assert.equal(result.status, 200, JSON.stringify(result.data));
    }
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
  const created = await createQuickTestGame(); const { token, room } = created.data;
  const [me, p1, p2, p3] = room.players;
  for (const p of room.players) setHand(p.id, [card("Negation", `self-${p.seat}`), card("Attack", `self-${p.seat}`)], 3, 3);
  setHand(me.id, [card("BarbarianInvasion", "self-root"), card("Negation", "self-0")], 3, 3);
  setHand(p1.id, [card("Negation", "self-1"), card("Attack", "self-1")], 3, 3);
  setHand(p2.id, [card("Negation", "self-again"), card("Attack", "self-2")], 3, 3);
  setTurn(room.code, me.seat);
  const act = (action, extra = {}) => request(action, { code: room.code, token, ...extra });
  let result = await act("play_card", { cardId: "barbarianinvasion-self-root" });
  assert.equal(result.data.room.actionPlayerId, me.id);
  assert.equal(result.data.room.responseCountdownVisibleAt, 0, "a human Negation window has no countdown before its presentation is ready");
  await act("decline_response");
  result = await act("respond", { cardId: "negation-self-1" });
  assert.equal(result.data.room.actionPlayerId, p2.id); assert.equal(result.data.room.pendingNegation.chainDepth, 1); assert.equal(result.data.room.pendingNegation.negated, true); assert.equal(result.data.room.pendingNegation.latestNegationPlayerId, p1.id);
  result = await act("respond", { cardId: "negation-self-again" });
  assert.equal(result.data.room.pendingNegation.chainDepth, 2); assert.equal(result.data.room.pendingNegation.negated, false); assert.equal(result.data.room.pendingNegation.latestNegationPlayerId, p2.id);
  for (const p of [p3, me]) {
    assert.equal(result.data.room.actionPlayerId, p.id);
    assert.equal(result.data.room.pendingNegation.responseTarget, "Player3's Negation");
    result = await act("decline_response");
  }
  assert.equal(result.data.room.pendingNegation, null);
  assert.equal(result.data.room.currentAction.actorId, p1.id);
  assert.equal(result.data.room.pendingGroup.requiredKind, "Attack");
  result = await act("respond", { cardId: "attack-self-1" });
  assert.equal(result.data.room.pendingNegation.effectTargetId, p2.id);
});

test("AOE Attack capability preserves legal conversions and auto-damages only without a response", async () => {
  const created = await createQuickTestGame(); const { token, room } = created.data;
  const [me, p1, p2, p3] = room.players;
  for (const p of room.players) { setHand(p.id, [], 3, 3); setEquipment(p.id, {}); }
  setHand(me.id, [card("BarbarianInvasion", "capability")], 3, 3);
  setHand(p1.id, [card("Dodge", "cost1"), card("Peach", "cost2")], 3, 3);
  setEquipment(p1.id, { weapon: card("SerpentSpear", "capability") });
  setTurn(room.code, me.seat);
  const act = (action, extra = {}) => request(action, { code: room.code, token, ...extra });
  let result = await act("play_card", { cardId: "barbarianinvasion-capability" });
  assert.equal(result.data.room.currentAction.actorId, p1.id, "no normal Attack, but a legal alternative keeps the decision open");
  assert.equal((await act("respond", { cardIds: ["dodge-cost1"] })).status, 409);
  result = await act("respond", { cardIds: ["dodge-cost1", "peach-cost2"] });
  if (result.data.room.currentAction?.triggerEvent === "damage_suffered") result = await act("decline_trigger");
  assert.equal(result.data.room.phase, "play");
  assert.equal(result.data.room.players.find(p => p.id === p1.id).hp, 3);
  for (const p of [p2, p3]) assert.equal(result.data.room.players.find(player => player.id === p.id).hp, 2);
});

test("human seat switching preserves private decisions across response and trigger chains", async () => {
  const game = await createHumanGame();
  const [host, alice, bob] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer] = game.room.players;
  const ids = (room) => room.myHand.map((held) => held.id).sort();

  // Ordinary response: the attack changes the acting seat from Host to Alice.
  setHand(hostPlayer.id, [card("Attack", "seat-switch")], 4, 4);
  setHand(alicePlayer.id, [card("Dodge", "seat-switch"), card("Peach", "alice-private")], 4, 4);
  setHand(bobPlayer.id, [card("Attack", "bob-private")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  const opened = await request("play_card", { code: game.code, token: host.token, cardId: "attack-seat-switch", targetId: alicePlayer.id });
  assert.equal(opened.status, 200);
  const hostResponse = (await state(game.code, host.token)).data;
  const aliceResponse = (await state(game.code, alice.token)).data;
  const bobResponse = (await state(game.code, bob.token)).data;
  const responseResolutionId = aliceResponse.currentAction.presentation.resolutionId;
  assert.equal(hostResponse.meId, hostPlayer.id);
  assert.equal(aliceResponse.meId, alicePlayer.id);
  assert.equal(aliceResponse.actionPlayerId, alicePlayer.id);
  assert.equal(aliceResponse.isMyAction, true);
  assert.equal(hostResponse.isMyAction, false);
  assert.equal(bobResponse.isMyAction, false);
  assert.deepEqual(ids(aliceResponse), ["dodge-seat-switch", "peach-alice-private"]);
  assert.deepEqual(ids(hostResponse), []);
  assert.deepEqual(ids(bobResponse), ["attack-bob-private"]);
  assert.ok(aliceResponse.currentAction.options.some((option) => option.providerId === "card"));
  assert.deepEqual(hostResponse.currentAction.options ?? [], []);
  assert.deepEqual(bobResponse.currentAction.options ?? [], []);
  assert.equal(hostResponse.currentAction.presentation.resolutionId, responseResolutionId);
  assert.equal(bobResponse.currentAction.presentation.resolutionId, responseResolutionId);
  assert.equal((await request("respond", { code: game.code, token: host.token, providerId: "card", cardId: "dodge-seat-switch" })).status, 409, "the previous seat cannot answer after the actor changes");
  const answered = await request("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-seat-switch" });
  assert.equal(answered.status, 200);
  assert.equal(answered.data.room.phase, "play-struck");
  assert.equal((await request("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-seat-switch" })).status, 409, "the same response cannot resolve twice");
  assert.equal((await state(game.code, host.token)).data.players.find((player) => player.id === alicePlayer.id).hp, 4);

  // Trigger chain: Dodge changes the actor to Host for Green Dragon, then the
  // follow-up Attack changes it back to Bob for the ordinary response.
  setEquipment(hostPlayer.id, { weapon: card("GreenDragonBlade", "seat-switch") });
  setHand(hostPlayer.id, [card("Attack", "trigger-first"), card("Attack", "trigger-follow-up")], 4, 4);
  setHand(alicePlayer.id, [], 4, 4);
  setHand(bobPlayer.id, [card("Dodge", "trigger-response"), card("Peach", "bob-private")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  const triggerAttack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-trigger-first", targetId: bobPlayer.id });
  assert.equal(triggerAttack.status, 200);
  const dodged = await request("respond", { code: game.code, token: bob.token, providerId: "card", cardId: "dodge-trigger-response" });
  assert.equal(dodged.status, 200);
  setHand(bobPlayer.id, [card("Dodge", "trigger-response"), card("Peach", "bob-private")], 4, 4);
  const hostTrigger = (await state(game.code, host.token)).data;
  const bobBeforeTrigger = (await state(game.code, bob.token)).data;
  const triggerResolutionId = hostTrigger.currentAction.presentation.resolutionId;
  assert.equal(hostTrigger.meId, hostPlayer.id);
  assert.equal(hostTrigger.actionPlayerId, hostPlayer.id);
  assert.equal(hostTrigger.currentAction.kind, "trigger");
  assert.ok(hostTrigger.currentAction.triggerOptions.some((option) => option.effectId === "green_dragon_blade_attack_dodged"));
  assert.equal(bobBeforeTrigger.meId, bobPlayer.id);
  assert.equal(bobBeforeTrigger.isMyAction, false);
  assert.deepEqual(bobBeforeTrigger.currentAction.triggerOptions ?? [], []);
  assert.deepEqual(ids(hostTrigger), ["attack-trigger-follow-up"]);
  assert.deepEqual(ids(bobBeforeTrigger), ["dodge-trigger-response", "peach-bob-private"]);
  assert.equal(bobBeforeTrigger.currentAction.presentation.resolutionId, triggerResolutionId);
  assert.equal((await request("trigger", { code: game.code, token: bob.token, providerId: "green_dragon_blade_attack_dodged", cardId: "attack-trigger-follow-up" })).status, 409, "the defender cannot answer the attacker's trigger");
  const followUp = await request("trigger", { code: game.code, token: host.token, providerId: "green_dragon_blade_attack_dodged", cardId: "attack-trigger-follow-up" });
  assert.equal(followUp.status, 200);
  const bobResponseAgain = (await state(game.code, bob.token)).data;
  const hostAfterSwitch = (await state(game.code, host.token)).data;
  assert.equal(bobResponseAgain.meId, bobPlayer.id);
  assert.equal(bobResponseAgain.actionPlayerId, bobPlayer.id);
  assert.equal(bobResponseAgain.isMyAction, true);
  assert.equal(bobResponseAgain.currentAction.kind, "response");
  assert.ok(bobResponseAgain.currentAction.options.some((option) => option.providerId === "card"));
  assert.deepEqual(hostAfterSwitch.currentAction.options ?? [], []);
  assert.equal(bobResponseAgain.currentAction.presentation.resolutionId, triggerResolutionId);
  const followUpAnswered = await request("respond", { code: game.code, token: bob.token, providerId: "card", cardId: "dodge-trigger-response" });
  assert.equal(followUpAnswered.status, 200);
  assert.equal(followUpAnswered.data.room.phase, "play-struck");
  assert.equal((await request("respond", { code: game.code, token: bob.token, providerId: "card", cardId: "dodge-trigger-response" })).status, 409, "the trigger chain cannot resolve its response twice");
  assert.equal((await state(game.code, host.token)).data.players.find((player) => player.id === bobPlayer.id).hp, 4);
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
    assert.equal(result.data.room.currentAction.kind, "response");
    result = await act(seat, "decline_response");
  }
  assert.equal(result.data.room.pendingNegation, null);
  const duelTargetView = await state(game.code, game.members[2].token);
  assert.equal(duelTargetView.data.currentAction.kind, "response"); assert.equal(duelTargetView.data.currentAction.requirement, "attack"); assert.equal(duelTargetView.data.currentAction.actorId, players[2].id);
  assert.equal((await act(2, "respond", { providerId: "card", cardId: "negation-2-two" })).status, 409, "closed window cannot be reopened");
  result = await act(2, "respond", { providerId: "card", cardId: "attack-2-reply" });
  const nextDuelView = await state(game.code, game.members[0].token);
  assert.equal(result.status, 200); assert.equal(nextDuelView.data.currentAction.kind, "response"); assert.equal(nextDuelView.data.currentAction.requirement, "attack"); assert.equal(nextDuelView.data.currentAction.actorId, players[0].id);
});



test("no-Dodge auto resolution keeps Frost Sword and shield checks and skips empty Arrow responders", async () => {
  const game = await createHumanGame(); const [host, , , carol] = game.members;
  const [me, first, second, last] = game.room.players;
  for (const player of game.room.players) { setHand(player.id, [], 3, 3); setEquipment(player.id); }
  sql(`UPDATE players SET hero=NULL WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(game.code)})`);
  setHand(me.id, [card("Attack", "no-dodge-frost")], 3, 3);
  setHand(first.id, [card("Peach", "frost-kept")], 3, 3);
  setEquipment(me.id, { weapon: card("FrostSword", "no-dodge") }); setTurn(game.code, me.seat);
  const frost = await request("play_card", { code: game.code, token: host.token, cardId: "attack-no-dodge-frost", targetId: first.id });
  assert.equal(frost.status, 200); assert.equal(frost.data.room.pendingAttack, null);
  assert.equal(frost.data.room.pendingFrostSword.actorId, me.id); assert.equal(frost.data.room.players.find((p) => p.id === first.id).hp, 3);
  const damage = await request("decline_trigger", { code: game.code, token: host.token });
  assert.equal(damage.status, 200); assert.equal(damage.data.room.players.find((p) => p.id === first.id).hp, 2);
  setHand(me.id, [card("RainingArrows", "no-dodge")], 3, 3); setHand(first.id, [], 3, 3);
  setHand(last.id, [card("Dodge", "last-arrow")], 3, 3); setTurn(game.code, me.seat);
  const arrows = await request("play_card", { code: game.code, token: host.token, cardId: "rainingarrows-no-dodge" });
  assert.equal(arrows.status, 200); assert.equal(arrows.data.room.actionPlayerId, last.id);
  assert.equal(arrows.data.room.players.find((p) => p.id === first.id).hp, 2);
  assert.equal(arrows.data.room.players.find((p) => p.id === second.id).hp, 2);
  assert.equal(arrows.data.room.players.find((p) => p.id === last.id).hp, 3);
  const response = await request("respond", { code: game.code, token: carol.token, cardId: "dodge-last-arrow" });
  assert.equal(response.status, 200); assert.equal(response.data.room.pendingGroup, null);
});

test("canonical Raining Arrows responses either consume Dodge or apply damage", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  for (const player of game.room.players) { setHand(player.id, [], 4, 4); setEquipment(player.id); }
  const rainingArrows = { ...card("RainingArrows", "canonical-arrows"), suit: "♥", rank: "A" };
  setHand(hostPlayer.id, [rainingArrows], 4, 4);
  setHand(alicePlayer.id, [card("Dodge", "canonical-dodge")], 4, 4);
  setHand(bobPlayer.id, [card("Dodge", "canonical-bob-dodge")], 4, 4);
  setHand(carolPlayer.id, [card("Dodge", "canonical-carol-dodge")], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  const opened = await request("play_card", { code: game.code, token: host.token, cardId: "rainingarrows-canonical-arrows" });
  assert.equal(opened.status, 200);
  const aliceDecision = await state(game.code, alice.token);
  assert.equal(aliceDecision.data.currentAction.requirement, "dodge");
  const dodged = await request("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-canonical-dodge" });
  assert.equal(dodged.status, 200, JSON.stringify(dodged.data)); assert.equal(dodged.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);
  assert.equal(dodged.data.room.currentAction.actorId, bobPlayer.id);

  const damaged = await request("decline_response", { code: game.code, token: game.members[2].token });
  assert.equal(damaged.status, 200); assert.equal(damaged.data.room.players.find((player) => player.id === bobPlayer.id).hp, 3);
  const finished = await request("decline_response", { code: game.code, token: game.members[3].token });
  assert.equal(finished.status, 200); assert.equal(finished.data.room.players.find((player) => player.id === carolPlayer.id).hp, 3);
  assert.equal(finished.data.room.pendingGroup, null); assert.equal(finished.data.room.phase, "play");
  assert.equal(finished.data.room.timeline.find((event) => event.type === "card" && event.card.id === rainingArrows.id)?.playedAs, undefined);
  assert.equal(discardIds(game.code).filter((id) => id === rainingArrows.id).length, 1);

  const wushengGame = await createHumanGame(); const [wushengHost] = wushengGame.members;
  const [wushengHostPlayer, wushengAlicePlayer] = wushengGame.room.players;
  sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(wushengHostPlayer.id)}`);
  const virtualArrows = { ...card("RainingArrows", "wusheng-arrows"), suit: "♥", rank: "A" };
  setHand(wushengHostPlayer.id, [virtualArrows], 4, 4); setHand(wushengAlicePlayer.id, [card("Dodge", "wusheng-arrows-dodge")], 4, 4); setTurn(wushengGame.code, wushengHostPlayer.seat);
  const virtual = await request("play_card", { code: wushengGame.code, token: wushengHost.token, cardId: virtualArrows.id, playAs: "attack", targetId: wushengAlicePlayer.id });
  assert.equal(virtual.status, 200, JSON.stringify(virtual.data));
  assert.equal(virtual.data.room.timeline.find((event) => event.type === "card" && event.card.id === virtualArrows.id)?.playedAs, "attack");
  assert.equal(virtual.data.room.players.find((player) => player.id === wushengAlicePlayer.id).hp, 4);
  assert.equal(discardIds(wushengGame.code).filter((id) => id === virtualArrows.id).length, 1);

  const longdanPlayGame = await createHumanGame(); const [longdanHost] = longdanPlayGame.members;
  const [longdanHostPlayer, longdanTargetPlayer] = longdanPlayGame.room.players;
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(longdanHostPlayer.id)}`);
  const longdanPlayDodge = card("Dodge", "longdan-play-phase-dodge");
  const longdanPlayAttack = card("Attack", "longdan-native-attack");
  setHand(longdanHostPlayer.id, [longdanPlayDodge, longdanPlayAttack], 4, 4); setHand(longdanTargetPlayer.id, [], 4, 4); setTurn(longdanPlayGame.code, longdanHostPlayer.seat);
  const longdanPlay = await request("play_card", { code: longdanPlayGame.code, token: longdanHost.token, cardId: longdanPlayDodge.id, playAs: "attack", targetId: longdanTargetPlayer.id });
  assert.equal(longdanPlay.status, 200, JSON.stringify(longdanPlay.data));
  assert.equal(longdanPlay.data.room.timeline.find((event) => event.type === "card" && event.card.id === longdanPlayDodge.id)?.playedAs, "attack");
  assert.equal(discardIds(longdanPlayGame.code).filter((id) => id === longdanPlayDodge.id).length, 1);

  const longdanResponseGame = await createHumanGame(); const [responseHost, responseAlice] = longdanResponseGame.members;
  const [responseHostPlayer, responseAlicePlayer, responseBobPlayer, responseCarolPlayer] = longdanResponseGame.room.players;
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(responseAlicePlayer.id)}`);
  const responseArrows = card("RainingArrows", "longdan-response-arrows"); const responseAttack = card("Attack", "longdan-attack-as-dodge");
  setHand(responseHostPlayer.id, [responseArrows], 4, 4); setHand(responseAlicePlayer.id, [responseAttack], 4, 4); setHand(responseBobPlayer.id, [], 4, 4); setHand(responseCarolPlayer.id, [], 4, 4); setTurn(longdanResponseGame.code, responseHostPlayer.seat);
  assert.equal((await request("play_card", { code: longdanResponseGame.code, token: responseHost.token, cardId: responseArrows.id })).status, 200);
  const longdanResponseDecision = await state(longdanResponseGame.code, responseAlice.token);
  assert.equal(longdanResponseDecision.data.currentAction.options.find((option) => option.providerId === "zhao_yun_attack_as_dodge")?.playedAs, "dodge");
  const longdanDodged = await request("respond", { code: longdanResponseGame.code, token: responseAlice.token, providerId: "zhao_yun_attack_as_dodge", cardId: responseAttack.id });
  assert.equal(longdanDodged.status, 200, JSON.stringify(longdanDodged.data));
  assert.equal(longdanDodged.data.room.timeline.find((event) => event.type === "card" && event.card.id === responseAttack.id)?.playedAs, "dodge");
  assert.equal(longdanDodged.data.room.players.find((player) => player.id === responseAlicePlayer.id).hp, 4);
});


test("Green Dragon Blade and Attack-use-limit rules preserve normal Attack flow", { timeout: 30_000 }, async () => {
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
  const dragonDecision = await state(game.code, bob.token); assert.equal(dragonDecision.data.currentAction.kind, "response"); assert.equal(dragonDecision.data.currentAction.requirement, "dodge"); assert.ok(dragonDecision.data.currentAction.options.some((option) => option.providerId === "card"));
  const dodged = await request("respond", { code: game.code, token: bob.token, providerId: "card", cardId: "dodge-dragon" });
  assert.equal(dodged.status, 200); assert.equal(dodged.data.room.currentAction.kind, "trigger"); assert.equal(dodged.data.room.actionPlayerId, hostPlayer.id);
  const dragonTrigger = await state(game.code, host.token);
  assert.equal(dragonTrigger.data.currentAction.kind, "trigger"); assert.equal(dragonTrigger.data.currentAction.triggerOptions[0].effectId, "green_dragon_blade_attack_dodged");
  const persistedDragonTrigger = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(persistedDragonTrigger.kind, "trigger"); assert.equal(dragonTrigger.data.currentAction.presentation.readyAfterEventId, persistedDragonTrigger.readyAfterEventId, "the trigger records its own presentation barrier at creation");
  const followed = await request("trigger", { code: game.code, token: host.token, providerId: "green_dragon_blade_attack_dodged", cardId: "attack-dragon-follow-up" });
  assert.equal(followed.status, 200); assert.equal(followed.data.room.pendingAttack, null, "an exhausted defender takes follow-up damage without another response");
  const damaged = await takeDamageIfPending(game.code, bob.token);
  assert.equal(damaged.status, 200); assert.equal(damaged.data.room.players.find((player) => player.id === bobPlayer.id).hp, 3); assert.equal(damaged.data.room.phase, "play-struck");
  assert.equal(damaged.data.room.timeline.filter((event) => event.type === "card" && event.player === "Host" && event.card.kind === "Attack").length, 2);

  setHand(hostPlayer.id, [card("Attack", "dragon-skip-first"), card("Attack", "dragon-kept")], 4, 4); setHand(bobPlayer.id, [card("Dodge", "dragon-skip")], 3, 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "attack-dragon-skip-first", targetId: bobPlayer.id })).status, 200);
  assert.equal((await request("respond", { code: game.code, token: bob.token, cardId: "dodge-dragon-skip" })).data.room.currentAction.actorId, hostPlayer.id);
  const skipped = await request("decline_trigger", { code: game.code, token: host.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.phase, "play-struck"); assert.ok(skipped.data.room.myHand.some((held) => held.id === "attack-dragon-kept"), "skipping preserves the unused follow-up Attack");

  async function attackLimitScenario(hero, equipment, attackCount, expectedAfterAttack) {
    const limitGame = await createHumanGame();
    const [limitHost] = limitGame.members;
    const [limitSource, limitTarget] = limitGame.room.players;
    sql(`UPDATE players SET hero=${quote(hero)} WHERE id=${quote(limitSource.id)}`);
    setEquipment(limitSource.id, equipment);
    setEquipment(limitTarget.id, {});
    const attacks = Array.from({ length: attackCount }, (_, index) => card("Attack", `limit-${hero}-${index}`));
    setHand(limitSource.id, attacks, 4, 4); setHand(limitTarget.id, [], 4, 4); setTurn(limitGame.code, limitSource.seat);
    for (let index = 0; index < attacks.length; index++) {
      const result = await request("play_card", { code: limitGame.code, token: limitHost.token, cardId: attacks[index].id, targetId: limitTarget.id });
      assert.equal(result.status, 200, JSON.stringify(result.data));
      assert.equal(result.data.room.phase, expectedAfterAttack, `${hero} Attack ${index + 1} returns to the expected Play state`);
      if (index < attacks.length - 1 && expectedAfterAttack === "play-struck") {
        const rejected = await request("play_card", { code: limitGame.code, token: limitHost.token, cardId: attacks[index + 1].id, targetId: limitTarget.id });
        assert.equal(rejected.status, 409, `${hero} cannot declare a second normal Attack`);
        break;
      }
    }
  }

  await attackLimitScenario("cao-cao", {}, 2, "play-struck");
  await attackLimitScenario("zhang-fei", {}, 3, "play");
  await attackLimitScenario("cao-cao", { weapon: card("ZhugeCrossbow", "limit-crossbow") }, 2, "play");


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
  const serpentDecision = await state(game.code, bob.token); assert.equal(serpentDecision.data.currentAction.kind, "response"); assert.equal(serpentDecision.data.currentAction.requirement, "dodge"); assert.ok(serpentDecision.data.currentAction.options.some((option) => option.providerId === "card"));
  const dodged = await request("respond", { code: game.code, token: bob.token, providerId: "card", cardId: "dodge-serpent-answer" });
  assert.equal(dodged.status, 200); assert.equal(dodged.data.room.phase, "play-struck"); assert.ok(discardIds(game.code).includes("peach-serpent-one"));

  setEquipment(alicePlayer.id, { weapon: card("SerpentSpear", "duel") });
  setHand(hostPlayer.id, [card("Duel", "serpent")], 4, 4); setHand(alicePlayer.id, [card("Peach", "duel-one"), card("Dodge", "duel-two")], 4, 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "duel-serpent", targetId: alicePlayer.id })).status, 200);
  const duelView = await state(game.code, alice.token); assert.equal(duelView.data.currentAction.kind, "response"); assert.equal(duelView.data.currentAction.requirement, "attack"); assert.ok(duelView.data.currentAction.options.some((option) => option.providerId === "serpent_spear_attack"));
  const duelAnswer = await request("respond", { code: game.code, token: alice.token, providerId: "serpent_spear_attack", cardIds: ["peach-duel-one", "dodge-duel-two"] });
  const hostAfterDuel = await state(game.code, host.token);
  assert.equal(duelAnswer.status, 200); assert.equal(hostAfterDuel.data.currentAction.kind, "response"); assert.equal(hostAfterDuel.data.currentAction.requirement, "attack"); assert.equal(hostAfterDuel.data.currentAction.actorId, hostPlayer.id); assert.ok(duelAnswer.data.room.timeline.some((event) => event.type === "cards" && event.action === "play" && event.player === "Alice"));

  setEquipment(alicePlayer.id, { weapon: card("SerpentSpear", "invasion") });
  setHand(hostPlayer.id, [card("BarbarianInvasion", "serpent")], 4, 4); setHand(alicePlayer.id, [card("Peach", "invasion-one"), card("Dodge", "invasion-two")], 4, 4); setHand(bobPlayer.id, [], 4, 4); setHand(carolPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "barbarianinvasion-serpent" })).status, 200);
  const invasionAnswer = await request("respond", { code: game.code, token: alice.token, cardIds: ["peach-invasion-one", "dodge-invasion-two"] });
  assert.equal(invasionAnswer.status, 200); assert.equal(invasionAnswer.data.room.pendingGroup, null); assert.equal(invasionAnswer.data.room.players.find(p => p.id === bobPlayer.id).hp, 3); assert.equal(invasionAnswer.data.room.players.find(p => p.id === carolPlayer.id).hp, 3); assert.ok(invasionAnswer.data.room.timeline.some((event) => event.type === "cards" && event.action === "play" && event.player === "Alice"));

  setEquipment(hostPlayer.id, { weapon: card("SerpentSpear", "trigrams-spear") });
  setEquipment(alicePlayer.id, { armor: card("EightTrigrams", "trigrams-spear-armor") });
  setHand(hostPlayer.id, [card("Peach", "trigrams-spear-cost-1"), card("Dodge", "trigrams-spear-cost-2")], 4, 4);
  setHand(alicePlayer.id, [], 3, 4); setDeck(game.code, [{ ...card("Peach", "trigrams-spear-judgement"), suit: "♥", rank: "7" }]); setTurn(game.code, hostPlayer.seat);
  const spearTrigrams = await request("serpent_spear_attack", { code: game.code, token: host.token, cardIds: ["peach-trigrams-spear-cost-1", "dodge-trigrams-spear-cost-2"], targetId: alicePlayer.id });
  assert.equal(spearTrigrams.status, 200); assert.equal(spearTrigrams.data.room.pendingAttack?.actorId, alicePlayer.id, "Serpent Spear opens the defender's Dodge response");
  const spearJudgement = await request("respond", { code: game.code, token: alice.token });
  assert.equal(spearJudgement.status, 200); assert.equal(spearJudgement.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3, "red Eight Trigrams judgement blocks a Serpent Spear Attack");


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
  const skippedPrompt = await request("respond", { code: game.code, token: alice.token, cardId: "dodge-axe-skip" });
  assert.equal(skippedPrompt.data.room.currentAction.kind, "trigger"); assert.equal(skippedPrompt.data.room.actionPlayerId, hostPlayer.id);
  assert.equal(skippedPrompt.data.room.currentAction.deadline, 0, "Rock Cleaving Axe waits for the visible-decision timer after Dodge");
  assert.equal((await request("trigger", { code: game.code, token: bob.token, cardIds: ["peach-axe-skip-one", "rockcleavingaxe-equip"] })).status, 409, "only the attacker owns the Axe decision");
  assert.equal((await request("trigger", { code: game.code, token: host.token, cardIds: ["peach-axe-skip-one", "peach-axe-skip-one"] })).status, 409, "the same card cannot pay both costs");
  const timed = await request("start_response_timer", { code: game.code, token: host.token }); assert.ok(timed.data.room.currentAction.deadline - Date.now() > 25_000, "the visible Axe prompt arms its human response deadline");
  const repeatedAxeTimer = await request("start_response_timer", { code: game.code, token: host.token }); assert.equal(repeatedAxeTimer.data.room.currentAction.deadline, timed.data.room.currentAction.deadline, "repeated Axe timer starts preserve the original deadline");
  const skipped = await request("decline_trigger", { code: game.code, token: host.token });
  assert.equal(skipped.status, 200); assert.equal(skipped.data.room.phase, "play-struck"); assert.equal(skipped.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

  setHand(hostPlayer.id, [card("Attack", "axe-force"), card("Peach", "axe-cost")], 4, 5); setHand(alicePlayer.id, [card("Dodge", "axe-force")], 2); setEquipment(hostPlayer.id, { weapon: card("RockCleavingAxe", "cost") }); setTurn(game.code, hostPlayer.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: "attack-axe-force", targetId: alicePlayer.id })).status, 200);
  const forcePrompt = await request("respond", { code: game.code, token: alice.token, cardId: "dodge-axe-force" });
  assert.equal(forcePrompt.data.room.currentAction.kind, "trigger");
  const axeTrigger = await state(game.code, host.token);
  assert.equal(axeTrigger.data.currentAction.kind, "trigger"); assert.equal(axeTrigger.data.currentAction.triggerOptions[0].effectId, "rock_cleaving_axe_attack_dodged");
  const forced = await request("trigger", { code: game.code, token: host.token, providerId: "rock_cleaving_axe_attack_dodged", cardIds: ["peach-axe-cost", "rockcleavingaxe-cost"] });
  assert.equal(forced.status, 200); assert.equal(forced.data.room.phase, "play-struck"); assert.equal(forced.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.equal(forced.data.room.players.find((player) => player.id === hostPlayer.id).equipmentCards.length, 0, "the Axe itself may be one of the two discarded cards");
  assert.ok(discardIds(game.code).includes("peach-axe-cost")); assert.ok(discardIds(game.code).includes("rockcleavingaxe-cost"));
  const axeCostEvent = forced.data.room.timeline.find((event) => event.type === "cards" && event.message?.includes("Rock Cleaving Axe"));
  assert.deepEqual(axeCostEvent.cards.map((item) => item.id), ["peach-axe-cost", "rockcleavingaxe-cost"]);


});

test("Sky Piercing Halberd expands a last-hand Attack to up to three ordered Dodge responses", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice, bob, carol] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  setHand(hostPlayer.id, [card("SkyPiercingHalberd", "equip")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const equipped = await request("play_card", { code: game.code, token: host.token, cardId: "skypiercinghalberd-equip" });
  assert.equal(equipped.status, 200); assert.equal(equipped.data.room.players.find((player) => player.id === hostPlayer.id).attackRange, 4);

  setHand(hostPlayer.id, [card("Attack", "last")], 4, 4); setHand(alicePlayer.id, [card("Dodge", "alice")], 4, 4); setHand(bobPlayer.id, [], 4, 4); setHand(carolPlayer.id, [card("Dodge", "carol")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const launched = await request("play_card", { code: game.code, token: host.token, cardId: "attack-last", targetIds: [alicePlayer.id, bobPlayer.id, carolPlayer.id] });
  assert.equal(launched.status, 200); assert.equal(launched.data.room.pendingGroup.cardKind, "SkyPiercingHalberdAttack"); assert.equal(launched.data.room.currentAction.actorId, alicePlayer.id); assert.equal(launched.data.room.currentAction.deadline, 0, "the human Halberd response waits for the visible-decision timer");
  assert.deepEqual(discardIds(game.code), [], "the final-hand Attack remains held until every Halberd target has resolved");
  const aliceDodge = await request("respond", { code: game.code, token: alice.token, cardId: "dodge-alice" });
  assert.equal(aliceDodge.status, 200); assert.equal(aliceDodge.data.room.currentAction.actorId, carolPlayer.id, "the target without Dodge takes damage immediately and the next eligible seat becomes active");
  const bobDamage = { status: 200, data: { room: (await state(game.code, bob.token)).data } };
  assert.equal(bobDamage.status, 200); assert.equal(bobDamage.data.room.currentAction.actorId, carolPlayer.id); assert.equal(bobDamage.data.room.players.find((player) => player.id === bobPlayer.id).hp, 3);
  const carolDodge = await request("respond", { code: game.code, token: carol.token, cardId: "dodge-carol" });
  assert.equal(carolDodge.status, 200); assert.equal(carolDodge.data.room.phase, "play-struck");
  assert.ok(carolDodge.data.room.log.some((entry) => /Sky Piercing Halberd Attack finishes resolving/.test(entry)));
  assert.deepEqual(discardIds(game.code), ["attack-last", "dodge-alice", "dodge-carol"], "the Attack and every Dodge discard together after the sequence finishes");

  setHand(hostPlayer.id, [card("Attack", "not-last"), card("Peach", "kept")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const rejected = await request("play_card", { code: game.code, token: host.token, cardId: "attack-not-last", targetIds: [alicePlayer.id, bobPlayer.id] });
  assert.equal(rejected.status, 400, "the Halberd cannot expand an Attack unless it was the final hand card");


});

test("Frost Sword offers its owner the choice to prevent Attack damage and discard up to two target cards", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members; const [hostPlayer, alicePlayer] = game.room.players;
  setHand(hostPlayer.id, [card("FrostSword", "equip")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const equipped = await request("play_card", { code: game.code, token: host.token, cardId: "frostsword-equip" });
  assert.equal(equipped.status, 200); assert.equal(equipped.data.room.players.find((player) => player.id === hostPlayer.id).attackRange, 2);
  setHand(hostPlayer.id, [card("Attack", "attack")], 4, 4); setHand(alicePlayer.id, [card("Peach", "one"), card("Dodge", "two"), card("Peach", "three"), card("Attack", "four")], 4, 4); setEquipment(alicePlayer.id, { offensiveHorse: card("FerganaSteed", "frost-mount") }); setTurn(game.code, hostPlayer.seat);
  const attack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-attack", targetId: alicePlayer.id });
  assert.equal(attack.status, 200);
  const damage = await takeDamageIfPending(game.code, alice.token);
  assert.equal(damage.status, 200); assert.equal(damage.data.room.pendingFrostSword.actorId, hostPlayer.id);
  const frostTrigger = await state(game.code, host.token);
  assert.equal(frostTrigger.data.currentAction.kind, "trigger"); assert.equal(frostTrigger.data.currentAction.triggerOptions[0].effectId, "frost_sword_damage_about_to_apply");
  const frostSelection = frostTrigger.data.currentAction.triggerOptions.find((option) => option.effectId === "frost_sword_damage_about_to_apply")?.selection;
  const expectedFrostKeys = ["hand:0", "hand:1", "hand:2", "hand:3", "ferganasteed-frost-mount"];
  assert.deepEqual(frostSelection?.eligibleKeys, expectedFrostKeys, "Frost Sword projects every target Hand position");
  const normalizedFrostTrigger = normalizeRoomData(frostTrigger.data);
  assert.deepEqual(normalizedFrostTrigger?.currentAction?.triggerOptions?.find((option) => option.effectId === "frost_sword_damage_about_to_apply")?.selection?.eligibleKeys, expectedFrostKeys, "room normalization preserves Frost Sword eligibility");
  const frost = await request("trigger", { code: game.code, token: host.token, providerId: "frost_sword_damage_about_to_apply", cardKeys: ["hand:0", "hand:1"] });
  assert.equal(frost.status, 200); assert.equal(frost.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4, "Frost Sword prevents the Attack damage"); assert.equal(frost.data.room.players.find((player) => player.id === alicePlayer.id).handCount, 2, "Frost Sword discards two target cards");

  setHand(hostPlayer.id, [card("Attack", "judgement-only")], 4, 4); setHand(alicePlayer.id, [], 4, 4); setEquipment(alicePlayer.id); setJudgement(alicePlayer.id, [card("Lightning", "protected-zone")]); setTurn(game.code, hostPlayer.seat);
  const judgementOnlyAttack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-judgement-only", targetId: alicePlayer.id });
  assert.equal(judgementOnlyAttack.status, 200);
  const judgementOnlyDamage = await takeDamageIfPending(game.code, alice.token);
  assert.equal(judgementOnlyDamage.status, 200);
  assert.equal(judgementOnlyDamage.data.room.pendingFrostSword, null, "a Judgement Zone card alone cannot open Frost Sword's discard branch");
  assert.equal(judgementOnlyDamage.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3, "Attack damage is dealt when Frost Sword has no eligible Hand or Equipment card");


});

test("Kirin Bow discards one damaged target Mount and then applies the Attack damage", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members; const [hostPlayer, alicePlayer] = game.room.players;
  setEquipment(hostPlayer.id, { weapon: card("KirinBow", "bow") }); setHand(hostPlayer.id, [card("Attack", "attack")], 4, 4);
  setEquipment(alicePlayer.id, { offensiveHorse: card("FerganaSteed", "offensive"), defensiveHorse: card("Shadowrunner", "defensive") }); setHand(alicePlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  const attack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-attack", targetId: alicePlayer.id });
  assert.equal(attack.status, 200); const triggerDamage = await takeDamageIfPending(game.code, alice.token); assert.equal(triggerDamage.status, 200); const trigger = await state(game.code, host.token);
  assert.equal(trigger.status, 200); assert.equal(trigger.data.currentAction.kind, "trigger");
  assert.deepEqual(trigger.data.currentAction.triggerOptions[0].selection.eligibleKeys, ["ferganasteed-offensive", "shadowrunner-defensive"]);
  const readyAfterEventId = trigger.data.currentAction.presentation?.readyAfterEventId;
  const barrier = readyAfterEventId ? trigger.data.timeline.find((event) => event.id === readyAfterEventId) : null;
  assert.ok(!readyAfterEventId || barrier?.importance === "essential" && (barrier.type === "card" && barrier.card.kind === "Attack" || barrier.type === "cards" && barrier.cards.some((card) => card.kind === "Attack")), "Kirin Bow trigger barrier is the Attack card presentation or absent");
  const informationalDamageMessage = trigger.data.timeline.find((event) => event.type === "message" && /would damage/.test(event.message));
  assert.ok(informationalDamageMessage, "the informational damage message is present");
  assert.notEqual(readyAfterEventId, informationalDamageMessage?.id, "the informational damage message never blocks the Kirin Bow trigger");
  const resolved = await request("trigger", { code: game.code, token: host.token, providerId: "kirin_bow_damage_about_to_apply", cardKeys: ["shadowrunner-defensive"] });
  assert.equal(resolved.status, 200); const target = resolved.data.room.players.find((player) => player.id === alicePlayer.id);
  assert.equal(target.hp, 3); assert.deepEqual(target.equipmentCards.map((item) => item.kind), ["FerganaSteed"]); assert.ok(discardIds(game.code).includes("shadowrunner-defensive"));

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
  assert.ok(blackAttack.data.room.timeline.some((event) => event.type === "message" && event.effectNotice && /Nio Shield blocks .*black Attack/.test(event.message)), "Nio Shield shows an Effect Triggered notice when it blocks a black Attack");

  const redAttack = { ...card("Attack", "red"), suit: "♥" };
  setHand(hostPlayer.id, [redAttack], 4, 4); setTurn(game.code, hostPlayer.seat);
  const redPrompt = await request("play_card", { code: game.code, token: host.token, cardId: redAttack.id, targetId: alicePlayer.id });
  assert.equal(redPrompt.status, 200); assert.equal(redPrompt.data.room.pendingAttack, null, "red Attack damages an undefended player despite Nio Shield");
  const redDamage = await takeDamageIfPending(game.code, alice.token);
  assert.equal(redDamage.status, 200); assert.equal(redDamage.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3, "Nio Shield does not prevent red Attack damage");

  setEquipment(hostPlayer.id, { weapon: card("SkyPiercingHalberd", "nio") }); setHand(hostPlayer.id, [card("Attack", "halberd-black")], 4, 4); setHand(bobPlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  const halberdAttack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-halberd-black", targetIds: [alicePlayer.id, bobPlayer.id] });
  assert.equal(halberdAttack.status, 200); assert.equal(halberdAttack.data.room.pendingGroup, null, "Nio Shield prevents its damage and the remaining target without Dodge takes damage immediately"); assert.equal(halberdAttack.data.room.players.find((player) => player.id === bobPlayer.id).hp, 3);
  assert.ok(halberdAttack.data.room.timeline.some((event) => event.type === "message" && event.effectNotice && /Nio Shield blocks .*black Attack/.test(event.message)), "Nio Shield shows an Effect Triggered notice for a Halberd black Attack");


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
  assert.equal(blackAttack.status, 200); const blackResult = await request("respond", { code: game.code, token: alice.token, providerId: "eight_trigrams_dodge" });
  assert.equal(blackResult.status, 200); assert.equal(blackResult.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3); assert.ok(blackResult.data.room.log.some((entry) => /Eight Trigrams Formation/.test(entry)));

  const simaMember = game.members.find((member) => member.name === "Bob"); const simaPlayer = game.room.players.find((player) => player.name === "Bob");
  assert.ok(simaMember && simaPlayer);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(simaPlayer.id)}`);
  const originalBlack = { ...card("Peach", "trigrams-guicai-original"), suit: "♣", rank: "8" };
  const replacementRed = { ...card("Peach", "trigrams-guicai-replacement"), suit: "♥", rank: "Q" };
  setHand(simaPlayer.id, [replacementRed], 4, 4); setHand(hostPlayer.id, [card("Attack", "trigrams-guicai-attack")], 4, 4); setHand(alicePlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat, "play");
  setDeck(game.code, [originalBlack]);
  const guicaiAttack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-trigrams-guicai-attack", targetId: alicePlayer.id });
  assert.equal(guicaiAttack.status, 200);
  const guicaiJudgement = await request("respond", { code: game.code, token: alice.token, providerId: "eight_trigrams_dodge" });
  assert.equal(guicaiJudgement.status, 200, JSON.stringify(guicaiJudgement.data));
  assert.equal(guicaiJudgement.data.room.currentAction.triggerEvent, "judgement_revealed");
  assert.equal(guicaiJudgement.data.room.actionPlayerId, simaPlayer.id);
  const guicaiDodge = await request("trigger", { code: game.code, token: simaMember.token, providerId: "sima_yi_guicai", cardId: replacementRed.id });
  assert.equal(guicaiDodge.status, 200, JSON.stringify(guicaiDodge.data));
  assert.equal(guicaiDodge.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4, "a red Guicai replacement changes Eight Trigrams to a Dodge");
  assert.ok(discardIds(game.code).includes(originalBlack.id)); assert.ok(discardIds(game.code).includes(replacementRed.id));

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

test("Guan Yu uses a red hand card as Attack through the normal multiplayer pipeline", async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);
  sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(hostPlayer.id)}`);
  const redPeach = { ...card("Peach", "wusheng-red"), suit: "♥" };
  setHand(hostPlayer.id, [redPeach], 4, 4); setHand(alicePlayer.id, [card("Dodge", "wusheng-dodge")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const playView = await state(game.code, host.token);
  assert.deepEqual(playView.data.currentAction.playPhaseActions, [{ cardId: redPeach.id, canPlayAs: "attack" }], "the acting Guan Yu receives the private Play Phase Attack projection");
  assert.equal((await state(game.code, alice.token)).data.currentAction.playPhaseActions, undefined, "other seats do not receive Guan Yu's private convertible-card projection");
  const played = await request("play_card", { code: game.code, token: host.token, cardId: redPeach.id, playAs: "attack", targetId: alicePlayer.id });
  assert.equal(played.status, 200);
  assert.equal(played.data.room.timeline.find((event) => event.type === "card" && event.card.id === redPeach.id)?.playedAs, "attack");
  const defender = await state(game.code, alice.token); const attacker = await state(game.code, host.token);
  assert.equal(defender.data.currentAction.kind, "response");
  assert.ok(defender.data.currentAction.options.some((option) => option.providerId === "card"));
  assert.equal(attacker.data.currentAction?.options?.length ?? 0, 0, "only the defender receives private response options");
  const dodge = card("Dodge", "wusheng-dodge");
  assert.equal((await request("respond", { code: game.code, token: host.token, providerId: "card", cardId: dodge.id })).status, 409);
  const blocked = await request("respond", { code: game.code, token: alice.token, providerId: "card", cardId: dodge.id });
  assert.equal(blocked.status, 200); assert.equal(discardIds(game.code).filter((id) => id === redPeach.id).length, 1);
  assert.equal((await request("respond", { code: game.code, token: alice.token, providerId: "card", cardId: dodge.id })).status, 409, "duplicate response cannot consume either card twice");
});

test("Something Out of Nothing preserves Play Phase and reveals the stratagem without exposing drawn cards", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const host = game.members[0];
  const hostPlayer = game.room.players.find((player) => player.name === "Host");
  assert.ok(hostPlayer);
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(hostPlayer.id)}`);
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
  const quick = await createQuickTestGame(); const { token, room } = quick.data;
  const [me, playerOne, playerTwo, playerThree] = room.players;
  const openingHandKinds = (player) => JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(player.id)}`)).map((held) => held.kind);
  assert.equal(me.hero, "guan-yu", "Player1 is Guan Yu for Wusheng coverage");
  assert.equal(playerOne.hero, "simayi", "Player2 is Sima Yi for Guicai coverage");
  assert.equal(playerTwo.hero, "zhao-yun", "Player3 is Zhao Yun for Longdan coverage");
  assert.equal(playerThree.hero, "xiahou-dun", "Player4 is Xiahou Dun for Stauchness coverage");
  const openingPlayers = [me, playerOne, playerTwo, playerThree];
  assert.ok(openingPlayers.every((player) => openingHandKinds(player).length === 4), "every Quick Test seat receives four opening cards");
  assert.equal(JSON.parse(query(`SELECT COUNT(*) FROM json_each((SELECT deck_json FROM rooms WHERE code=${quote(room.code)}))`)), 92, "Quick Test uses the same 4-card opening deal as normal games");
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
  assert.ok(played.data.room.timeline.some((event) => /Negation window opens for Something Out of Nothing's effect on Player2/.test(event.message ?? "")), "the response window is visible in the event history");
  const stale = await request("decline_response", { code: room.code, token, context: { actionRevision: before.data.actionRevision, meId: playerOne.id, phase: "play", pendingKind: null, actorId: playerOne.id } });
  assert.equal(stale.status, 409); assert.equal(stale.data.stale, true); assert.equal(stale.data.room.meId, playerTwo.id); assert.equal(stale.data.room.pendingNegation.actorId, playerTwo.id);
  const passed = await request("decline_response", { code: room.code, token });
  assert.equal(passed.status, 200); assert.equal(passed.data.room.phase, "play"); assert.equal(passed.data.room.pendingNegation, null);
  assert.ok(passed.data.room.timeline.some((event) => /Negation window closes for Something Out of Nothing's effect on Player2/.test(event.message ?? "")), "the completed response window is visible in the event history");
});

test("Quick Test Something Out of Nothing resolves without a generic damage response", { timeout: 30_000 }, async () => {
  const quick = await createQuickTestGame(); const { token, room } = quick.data;
  const [me, playerOne, playerTwo, playerThree] = room.players;
  setHand(me.id, [], 3, 3); setHand(playerOne.id, [card("DrawTwo", "quick-no-negation")], 3, 3); setHand(playerTwo.id, [], 3, 3); setHand(playerThree.id, [], 3, 3); setTurn(room.code, playerOne.seat, "play");
  const result = await request("play_card", { code: room.code, token, cardId: "drawtwo-quick-no-negation" });
  assert.equal(result.status, 200); assert.equal(result.data.room.phase, "play"); assert.equal(result.data.room.pendingNegation, null); assert.equal(result.data.room.pendingGroup, null); assert.equal(result.data.room.players.find((player) => player.id === playerOne.id).hp, 3); assert.equal(result.data.drawnCards.length, 2);
});

test("Quick Test accepts only one competing response submission", { timeout: 30_000 }, async () => {
  const quick = await createQuickTestGame(); const { token, room } = quick.data;
  const [me, playerOne, playerTwo, playerThree] = room.players;
  setHand(me.id, [card("BarbarianInvasion", "quick-race")], 3, 3); setHand(playerOne.id, [card("Attack", "quick-race")], 3, 3); setHand(playerTwo.id, [], 3, 3); setHand(playerThree.id, [], 3, 3); setTurn(room.code, me.seat, "play");
  const started = await request("play_card", { code: room.code, token, cardId: "barbarianinvasion-quick-race" });
  assert.equal(started.status, 200); assert.equal(started.data.room.currentAction.actorId, playerOne.id);
  const [manual, timeout] = await Promise.all([
    request("respond", { code: room.code, token, cardId: "attack-quick-race" }),
    request("decline_response", { code: room.code, token }),
  ]);
  assert.equal([manual.status, timeout.status].filter((status) => status === 200).length, 1);
  assert.equal([manual.status, timeout.status].filter((status) => status === 409).length, 1);
  const final = await state(room.code, token);
  if (final.data.currentAction?.triggerEvent === "damage_suffered") await request("decline_trigger", { code: room.code, token });
  const settled = await state(room.code, token);
  assert.equal(settled.data.pendingGroup, null); assert.equal(settled.data.phase, "play"); assert.equal(settled.data.meId, me.id);
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
  const cancelled = await request("respond", { code: game.code, token: alice.token, cardId: "negation-cancel" });
  assert.equal(cancelled.status, 200); assert.equal(cancelled.data.room.phase, "play"); assert.equal(cancelled.data.room.pendingNegation, null);
  assert.equal((await state(game.code, alice.token)).data.myHand.some((held) => held.id === "attack-protected"), true, "the cancelled stratagem does not discard its target card");

  setHand(hostPlayer.id, [card("Dismantle", "restored"), card("Negation", "counter")], 5, 5);
  setHand(alicePlayer.id, [card("Attack", "removed"), card("Negation", "first")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  const reopened = await request("play_card", { code: game.code, token: host.token, cardId: "dismantle-restored", targetId: alicePlayer.id, targetCardIndex: 0 });
  assert.equal(reopened.data.room.actionPlayerId, hostPlayer.id, "the initial response starts with the source");
  assert.equal(reopened.data.room.discardTop.id, "negation-cancel", "the previous completed discard remains visible while the new sequence is pending");
  const firstNegation = await request("decline_response", { code: game.code, token: host.token });
  assert.equal(firstNegation.data.room.actionPlayerId, alicePlayer.id);
  const firstPlayed = await request("respond", { code: game.code, token: alice.token, cardId: "negation-first" });
  assert.equal(firstPlayed.data.room.actionPlayerId, hostPlayer.id);
  assert.equal(firstPlayed.data.room.pendingNegation.responseTarget, "Alice's Negation", "the counter window names the latest Negation rather than the root Stratagem");
  assert.equal(firstPlayed.data.room.discardTop.id, "negation-cancel", "neither Burning Bridges nor the first Negation enters discard before the counter decision");
  const restored = await request("respond", { code: game.code, token: host.token, cardId: "negation-counter" });
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


test("Steal chooses from the target's current zones only after counter-Negation", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);
  const spear = card("SerpentSpear", "post-negation-prize");
  setHand(hostPlayer.id, [card("Steal", "post-negation"), card("Negation", "restore-steal")], 5, 5);
  setHand(alicePlayer.id, [card("Negation", "cancel-steal")], 4, 4); setEquipment(alicePlayer.id, { weapon: spear }); setTurn(game.code, hostPlayer.seat);

  const opened = await request("play_card", { code: game.code, token: host.token, cardId: "steal-post-negation", targetId: alicePlayer.id });
  assert.equal(opened.data.room.pendingTargetCard, null, "target cards are not selected or exposed before Negation responses finish");
  await request("decline_response", { code: game.code, token: host.token });
  await request("respond", { code: game.code, token: alice.token, cardId: "negation-cancel-steal" });
  const restored = await request("respond", { code: game.code, token: host.token, cardId: "negation-restore-steal" });
  assert.equal(restored.data.room.pendingTargetCard.targetId, alicePlayer.id); assert.equal(restored.data.room.players.find((player) => player.id === alicePlayer.id).handCount, 0);
  assert.equal(restored.data.room.players.find((player) => player.id === alicePlayer.id).equipmentCards[0].id, spear.id);
  const obtained = await request("choose_target_card", { code: game.code, token: host.token, targetCardZone: "equipment", targetCardId: spear.id });
  assert.equal(obtained.status, 200); assert.equal(obtained.data.room.phase, "play"); assert.ok(obtained.data.room.myHand.some((held) => held.id === spear.id));
  assert.equal(obtained.data.room.players.find((player) => player.id === alicePlayer.id).equipmentCards.length, 0);
  assert.equal(obtained.data.room.log.some((entry) => /no valid card left/.test(entry)), false);
  assert.deepEqual(discardIds(game.code).slice(-3), ["steal-post-negation", "negation-cancel-steal", "negation-restore-steal"]);
});

test("Lu Xun's Modesty blocks only Steal and Overindulgence", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host] = game.members;
  const source = game.room.players.find((player) => player.name === "Host");
  const luXun = game.room.players.find((player) => player.name === "Alice");
  const other = game.room.players.find((player) => player.name === "Carol");
  assert.ok(source && luXun && other);
  sql(`UPDATE players SET hero='lu-xun' WHERE id=${quote(luXun.id)}`);
  sql(`UPDATE rooms SET discard_json='[]' WHERE code=${quote(game.code)}`);

  const steal = card("Steal", "modesty-blocked");
  setHand(source.id, [steal], 4, 4); setHand(luXun.id, [card("Peach", "modesty-lu-card")], 3, 3); setTurn(game.code, source.seat);
  const blockedSteal = await request("play_card", { code: game.code, token: host.token, cardId: steal.id, targetId: luXun.id });
  assert.equal(blockedSteal.status, 409, JSON.stringify(blockedSteal.data));
  const blockedStealState = await state(game.code, host.token);
  assert.deepEqual(blockedStealState.data.myHand.map((held) => held.id), [steal.id], "Modesty rejects Steal before it leaves the source hand");
  assert.equal(discardIds(game.code).includes(steal.id), false, "a blocked Steal is not discarded");
  assert.equal(blockedStealState.data.pending, null, "a blocked Steal does not open a Negation decision");
  assert.equal(blockedStealState.data.phase, "play");

  const otherSteal = card("Steal", "modesty-other");
  setHand(source.id, [otherSteal], 4, 4); setHand(other.id, [card("Peach", "modesty-other-card")], 4, 4); setTurn(game.code, source.seat);
  const allowedOtherSteal = await request("play_card", { code: game.code, token: host.token, cardId: otherSteal.id, targetId: other.id });
  assert.equal(allowedOtherSteal.status, 200, JSON.stringify(allowedOtherSteal.data));
  assert.equal(allowedOtherSteal.data.room.pendingTargetCard.targetId, other.id, "other heroes remain valid Steal targets");

  const overindulgence = card("Overindulgence", "modesty-blocked");
  setHand(source.id, [overindulgence], 4, 4); setJudgement(luXun.id, []); setTurn(game.code, source.seat);
  const blockedOverindulgence = await request("play_card", { code: game.code, token: host.token, cardId: overindulgence.id, targetId: luXun.id });
  assert.equal(blockedOverindulgence.status, 409, JSON.stringify(blockedOverindulgence.data));
  const blockedOverindulgenceState = await state(game.code, host.token);
  assert.deepEqual(blockedOverindulgenceState.data.myHand.map((held) => held.id), [overindulgence.id], "Modesty rejects Overindulgence before it leaves the source hand");
  assert.equal(discardIds(game.code).includes(overindulgence.id), false, "a blocked Overindulgence is not discarded");
  assert.deepEqual(blockedOverindulgenceState.data.players.find((player) => player.id === luXun.id).judgementCards, [], "a blocked Overindulgence does not modify the Judgement Zone");
  assert.equal(blockedOverindulgenceState.data.pending, null, "a blocked Overindulgence does not open a Negation decision");

  const allowedOverindulgence = card("Overindulgence", "modesty-other");
  setHand(source.id, [allowedOverindulgence], 4, 4); setJudgement(other.id, []); setTurn(game.code, source.seat);
  const allowedOtherOverindulgence = await request("play_card", { code: game.code, token: host.token, cardId: allowedOverindulgence.id, targetId: other.id });
  assert.equal(allowedOtherOverindulgence.status, 200, JSON.stringify(allowedOtherOverindulgence.data));
  assert.deepEqual(allowedOtherOverindulgence.data.room.players.find((player) => player.id === other.id).judgementCards.map((delayed) => delayed.id), [allowedOverindulgence.id], "other heroes remain valid Overindulgence targets");

  const duel = card("Duel", "modesty-duel");
  setHand(source.id, [duel], 4, 4); setHand(luXun.id, [card("Attack", "modesty-duel-response")], 3, 3); setTurn(game.code, source.seat);
  const allowedDuel = await request("play_card", { code: game.code, token: host.token, cardId: duel.id, targetId: luXun.id });
  assert.equal(allowedDuel.status, 200, JSON.stringify(allowedDuel.data));
  assert.equal(allowedDuel.data.room.pendingDuel.targetId, luXun.id, "Modesty does not affect Duel");

  const burningBridges = card("Dismantle", "modesty-burning-bridges");
  setHand(source.id, [burningBridges], 4, 4); setHand(luXun.id, [card("Peach", "modesty-burning-target")], 3, 3); setTurn(game.code, source.seat);
  const allowedBurningBridges = await request("play_card", { code: game.code, token: host.token, cardId: burningBridges.id, targetId: luXun.id });
  assert.equal(allowedBurningBridges.status, 200, JSON.stringify(allowedBurningBridges.data));
  assert.equal(allowedBurningBridges.data.room.pendingTargetCard.targetId, luXun.id, "Modesty does not affect Burning Bridges");
});

test("Lu Xun's Second Wind is a private once-per-loss continuation", { timeout: 60_000 }, async () => {
  const acceptedGame = await createHumanGame();
  const acceptedLu = acceptedGame.room.players[1];
  const acceptedTarget = acceptedGame.room.players[2];
  sql(`UPDATE players SET hero='lu-xun' WHERE id=${quote(acceptedLu.id)}`);
  const acceptedAttack = card("Attack", "second-wind-play");
  setHand(acceptedLu.id, [acceptedAttack], 3, 3); setHand(acceptedTarget.id, [], 4, 4); setDeck(acceptedGame.code, [card("Peach", "second-wind-draw")]); setTurn(acceptedGame.code, acceptedLu.seat);
  const played = await request("play_card", { code: acceptedGame.code, token: acceptedGame.members[1].token, cardId: acceptedAttack.id, targetId: acceptedTarget.id });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  assert.equal(played.data.room.currentAction.kind, "trigger", "losing the last card offers Second Wind");
  assert.equal(played.data.room.currentAction.actorId, acceptedLu.id);
  assert.equal(played.data.room.currentAction.triggerOptions[0].effectId, "lu_xun_second_wind");
  assert.deepEqual((await state(acceptedGame.code, acceptedGame.members[2].token)).data.currentAction.triggerOptions, [], "Second Wind remains private to Lu Xun");
  const accepted = await request("trigger", { code: acceptedGame.code, token: acceptedGame.members[1].token, providerId: "lu_xun_second_wind" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.deepEqual(accepted.data.room.myHand.map((held) => held.id), ["peach-second-wind-draw"], "accepting draws exactly one card");
  assert.equal(accepted.data.room.currentAction.kind, "turn", "the completed trigger resumes normal play");

  const declinedGame = await createHumanGame();
  const declinedLu = declinedGame.room.players[1]; const declinedTarget = declinedGame.room.players[2];
  sql(`UPDATE players SET hero='lu-xun' WHERE id=${quote(declinedLu.id)}`);
  const declinedAttack = card("Attack", "second-wind-decline");
  setHand(declinedLu.id, [declinedAttack], 3, 3); setHand(declinedTarget.id, [], 4, 4); setDeck(declinedGame.code, [card("Peach", "second-wind-unused")]); setTurn(declinedGame.code, declinedLu.seat);
  const declinedPlay = await request("play_card", { code: declinedGame.code, token: declinedGame.members[1].token, cardId: declinedAttack.id, targetId: declinedTarget.id });
  assert.equal(declinedPlay.data.room.currentAction.triggerOptions[0].effectId, "lu_xun_second_wind");
  const declined = await request("decline_trigger", { code: declinedGame.code, token: declinedGame.members[1].token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data)); assert.equal(declined.data.room.myHand.length, 0, "declining draws none"); assert.ok(["play", "play-struck"].includes(declined.data.room.phase), "declining resumes the interrupted continuation");

  const responseGame = await createHumanGame();
  const responseSource = responseGame.room.players[0]; const responseLu = responseGame.room.players[1];
  sql(`UPDATE players SET hero='lu-xun' WHERE id=${quote(responseLu.id)}`);
  const responseAttack = card("Attack", "second-wind-response-attack"); const responseDodge = card("Dodge", "second-wind-response-dodge");
  setHand(responseSource.id, [responseAttack], 4, 4); setHand(responseLu.id, [responseDodge], 3, 3); setTurn(responseGame.code, responseSource.seat);
  const responseOpened = await request("play_card", { code: responseGame.code, token: responseGame.members[0].token, cardId: responseAttack.id, targetId: responseLu.id });
  assert.equal(responseOpened.status, 200, JSON.stringify(responseOpened.data));
  const responseBlocked = await request("respond", { code: responseGame.code, token: responseGame.members[1].token, providerId: "card", cardId: responseDodge.id });
  assert.equal(responseBlocked.status, 200, JSON.stringify(responseBlocked.data)); assert.equal(responseBlocked.data.room.currentAction.triggerOptions[0].effectId, "lu_xun_second_wind", "a last card used as a response also triggers Second Wind");

  const discardGame = await createHumanGame(); const discardLu = discardGame.room.players[1];
  sql(`UPDATE players SET hero='lu-xun' WHERE id=${quote(discardLu.id)}`);
  const discardCards = [card("Peach", "second-wind-discard-a"), card("Dodge", "second-wind-discard-b")];
  setHand(discardLu.id, discardCards, 0, 3); setTurn(discardGame.code, discardLu.seat, "discard");
  const discarded = await request("discard_cards", { code: discardGame.code, token: discardGame.members[1].token, cardIds: discardCards.map((held) => held.id) });
  assert.equal(discarded.status, 200, JSON.stringify(discarded.data)); assert.equal(discarded.data.room.currentAction.triggerOptions.length, 1, "losing multiple cards together opens one Second Wind decision");
  const discardedDecline = await request("decline_trigger", { code: discardGame.code, token: discardGame.members[1].token });
  assert.equal(discardedDecline.status, 200, JSON.stringify(discardedDecline.data)); assert.equal(discardedDecline.data.room.currentAction.kind, "turn");

  const removedGame = await createHumanGame(); const removedSource = removedGame.room.players[0]; const removedLu = removedGame.room.players[1];
  sql(`UPDATE players SET hero='lu-xun' WHERE id=${quote(removedLu.id)}`);
  const dismantle = card("Dismantle", "second-wind-removed"); const removedCard = card("Peach", "second-wind-removed-target");
  setHand(removedSource.id, [dismantle], 4, 4); setHand(removedLu.id, [removedCard], 3, 3); setTurn(removedGame.code, removedSource.seat);
  const dismantled = await request("play_card", { code: removedGame.code, token: removedGame.members[0].token, cardId: dismantle.id, targetId: removedLu.id });
  assert.equal(dismantled.status, 200, JSON.stringify(dismantled.data));
  const removed = await request("choose_target_card", { code: removedGame.code, token: removedGame.members[0].token, targetCardZone: "hand", targetCardIndex: 0 });
  assert.equal(removed.status, 200, JSON.stringify(removed.data)); assert.equal(removed.data.room.currentAction.actorId, removedLu.id, "removing Lu Xun's last card opens his private trigger");
  assert.deepEqual(removed.data.room.currentAction.triggerOptions, [], "the trigger remains private from the removing player");
  const removedLuView = await state(removedGame.code, removedGame.members[1].token);
  assert.equal(removedLuView.data.currentAction.triggerOptions[0].effectId, "lu_xun_second_wind");
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
    await request("decline_response", { code: game.code, token: host.token });
    assert.deepEqual(discardIds(game.code), [], `${kind} stays staged while Alice decides whether to Negate`);
    const aliceNegates = await request("respond", { code: game.code, token: alice.token, cardId: `negation-${kind}-alice` });
    assert.equal(aliceNegates.status, 200); assert.equal(aliceNegates.data.room.actionPlayerId, hostPlayer.id, "the source may immediately counter or skip after a target Negates");
    assert.deepEqual(discardIds(game.code), [], `the ${kind} and first Negation both remain staged`);
    const counterTimer = await request("start_response_timer", { code: game.code, token: host.token }); assert.ok(counterTimer.data.room.pendingNegation.deadline > Date.now());
    const repeatedCounterTimer = await request("start_response_timer", { code: game.code, token: host.token }); assert.equal(repeatedCounterTimer.data.room.pendingNegation.deadline, counterTimer.data.room.pendingNegation.deadline, "counter-Negation timer remains idempotent");
    const protectedAlice = await request("decline_response", { code: game.code, token: host.token });
    assert.equal(protectedAlice.status, 200); assert.equal(protectedAlice.data.room.pendingNegation.effectTargetId, bobPlayer.id, `${kind} opens Bob's separate Negation opportunity`);
    const bobWindowClosed = await request("decline_response", { code: game.code, token: host.token });
    assert.equal(bobWindowClosed.data.room.pendingNegation, null); assert.equal(bobWindowClosed.data.room.currentAction.actorId, bobPlayer.id);
    assert.equal(protectedAlice.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

    const bobResponse = await request("respond", { code: game.code, token: bob.token, cardId: `${requiredKind.toLowerCase()}-${kind}-bob` });
    assert.equal(bobResponse.status, 200); assert.equal(bobResponse.data.room.pendingNegation.effectTargetId, carolPlayer.id, `${kind} continues to Carol after Bob responds`);
    const carolWindowClosed = await request("decline_response", { code: game.code, token: host.token });
    assert.equal(carolWindowClosed.data.room.currentAction.actorId, carolPlayer.id);
    assert.deepEqual(discardIds(game.code), [], `${kind}, Negation, and Bob's response remain staged`);
    const finished = await request("respond", { code: game.code, token: carol.token, cardId: `${requiredKind.toLowerCase()}-${kind}-carol` });
    assert.equal(finished.status, 200); assert.equal(finished.data.room.phase, "play"); assert.equal(finished.data.room.pendingGroup, null);
    assert.ok(finished.data.room.log.some((entry) => new RegExp(`${kind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows"}'s effect on Alice is cancelled`).test(entry)));
    assert.deepEqual(discardIds(game.code), [`${kind.toLowerCase()}-per-target`, `negation-${kind}-alice`, `${requiredKind.toLowerCase()}-${kind}-bob`, `${requiredKind.toLowerCase()}-${kind}-carol`], "the complete AOE sequence enters discard once, in play order");
  }
});

test("Luoshen repeats real Judgements before delayed-card Judgements and preserves card destinations", { timeout: 30_000 }, async () => {
  async function beginZhenTurn(deck, judgement = [], simaHand = []) {
    const created = await createQuickTestGame();
    const { token, room } = created.data;
    const code = room.code;
    const zhen = room.players.find((player) => player.seat === 3);
    assert.ok(zhen, "Quick Test exposes a deterministic Player4 seat for the Luoshen fixture");
    sql(`UPDATE players SET hero='zhen-ji', hp=3, max_hp=3, hero_options_json='[]' WHERE id=${quote(zhen.id)}`);
    const previous = room.players.find((player) => player.seat === (zhen.seat + 3) % room.players.length);
    assert.ok(previous);
    for (const player of room.players) setHand(player.id, [], player.hp ?? 3, player.maxHp ?? 3);
    const sima = room.players.find((player) => player.hero === "simayi");
    assert.ok(sima, "Quick Test exposes Sima Yi in Player2 for Guicai coverage");
    setHand(sima.id, simaHand, 3, 3);
    setHand(zhen.id, [], 3, 3);
    setJudgement(zhen.id, judgement);
    setDeck(code, deck);
    setTurn(code, previous.seat);
    const ended = await request("end_turn", { code, token });
    assert.equal(ended.status, 200, JSON.stringify(ended.data));
    return { code, token, zhen, sima, room: ended.data.room };
  }

  const sevenSpades = { ...card("Attack", "luoshen-seven"), suit: "♠", rank: "7" };
  const fourClubs = { ...card("Dodge", "luoshen-four"), suit: "♣", rank: "4" };
  const queenHearts = { ...card("Peach", "luoshen-queen"), suit: "♥", rank: "Q" };
  const jackClubs = { ...card("Duel", "overindulgence-next"), suit: "♣", rank: "J" };
  const drawOne = card("Attack", "draw-one", "♠");
  const drawTwo = card("Dodge", "draw-two", "♥");
  const overindulgence = card("Overindulgence", "zhen-zone", "♠");
  const sequence = await beginZhenTurn([sevenSpades, fourClubs, queenHearts, jackClubs, drawOne, drawTwo], [overindulgence]);
  assert.equal(sequence.room.phase, "response");
  assert.equal(sequence.room.currentAction.kind, "trigger");
  assert.equal(sequence.room.currentAction.triggerEvent, "turn_start");
  assert.deepEqual(sequence.room.currentAction.triggerOptions.map((option) => option.label), ["Luoshen"]);

  const first = await request("trigger", { code: sequence.code, token: sequence.token, providerId: "zhen_ji_luoshen" });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  assert.equal(first.data.room.phase, "response");
  assert.deepEqual(first.data.room.myHand.map((held) => held.id), [sevenSpades.id]);
  assert.equal(first.data.room.currentAction.triggerEvent, "turn_start");
  assert.equal(first.data.room.deckCount, 5);

  const second = await request("trigger", { code: sequence.code, token: sequence.token, providerId: "zhen_ji_luoshen" });
  assert.equal(second.status, 200, JSON.stringify(second.data));
  assert.deepEqual(second.data.room.myHand.map((held) => held.id), [sevenSpades.id, fourClubs.id]);
  assert.equal(second.data.room.currentAction.triggerEvent, "turn_start");
  assert.equal(second.data.room.deckCount, 4);

  const third = await request("trigger", { code: sequence.code, token: sequence.token, providerId: "zhen_ji_luoshen" });
  assert.equal(third.status, 200, JSON.stringify(third.data));
  assert.equal(third.data.room.phase, "draw");
  assert.equal(third.data.room.pending, null);
  assert.deepEqual(third.data.room.myHand.map((held) => held.id), [sevenSpades.id, fourClubs.id]);
  assert.deepEqual(discardIds(sequence.code), [queenHearts.id]);
  assert.ok(third.data.room.players.find((player) => player.id === sequence.zhen.id).judgementCards.some((held) => held.id === overindulgence.id));
  assert.equal(third.data.room.currentAction.kind, "turn");
  assert.equal(third.data.room.currentAction.triggerEvent, undefined, "Luoshen is not offered again merely because the phase starts with draw");

  const delayed = await request("draw", { code: sequence.code, token: sequence.token });
  assert.equal(delayed.status, 200, JSON.stringify(delayed.data));
  assert.equal(delayed.data.room.phase, "discard", "the next card is a new Overindulgence Judgement and skips Play");
  assert.equal(discardIds(sequence.code).filter((id) => id === jackClubs.id).length, 1, "the delayed Judgement consumes the next card exactly once");
  assert.equal(discardIds(sequence.code).filter((id) => id === queenHearts.id).length, 1, "the red Luoshen card is discarded exactly once");
  assert.equal(discardIds(sequence.code).filter((id) => id === overindulgence.id).length, 1, "the delayed card is discarded exactly once");
  assert.equal(discardIds(sequence.code).filter((id) => id === sevenSpades.id).length, 0);
  assert.equal(discardIds(sequence.code).filter((id) => id === fourClubs.id).length, 0);

  const declinedImmediately = await beginZhenTurn([queenHearts], [overindulgence]);
  const declined = await request("decline_trigger", { code: declinedImmediately.code, token: declinedImmediately.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.phase, "draw");
  assert.equal(declined.data.room.pending, null);
  assert.equal((await state(declinedImmediately.code, declinedImmediately.token)).data.currentAction.triggerEvent, undefined);

  const blackThenDecline = await beginZhenTurn([sevenSpades, queenHearts], [overindulgence]);
  const accepted = await request("trigger", { code: blackThenDecline.code, token: blackThenDecline.token, providerId: "zhen_ji_luoshen" });
  assert.deepEqual(accepted.data.room.myHand.map((held) => held.id), [sevenSpades.id]);
  const stopped = await request("decline_trigger", { code: blackThenDecline.code, token: blackThenDecline.token });
  assert.equal(stopped.status, 200, JSON.stringify(stopped.data));
  assert.equal(stopped.data.room.phase, "draw");
  assert.deepEqual(stopped.data.room.myHand.map((held) => held.id), [sevenSpades.id]);

  const redFirst = await beginZhenTurn([queenHearts, sevenSpades]);
  const red = await request("trigger", { code: redFirst.code, token: redFirst.token, providerId: "zhen_ji_luoshen" });
  assert.equal(red.status, 200, JSON.stringify(red.data));
  assert.equal(red.data.room.phase, "draw");
  assert.deepEqual(discardIds(redFirst.code), [queenHearts.id]);

  const replacementBlack = { ...card("Attack", "guicai-black"), suit: "♠", rank: "7" };
  const originalRed = { ...card("Peach", "guicai-original-red"), suit: "♥", rank: "Q" };
  const redToBlack = await beginZhenTurn([originalRed], [], [replacementBlack]);
  const redStart = await request("trigger", { code: redToBlack.code, token: redToBlack.token, providerId: "zhen_ji_luoshen" });
  assert.equal(redStart.data.room.currentAction.triggerEvent, "judgement_revealed");
  assert.equal(redStart.data.room.actionPlayerId, redToBlack.sima.id, "Guicai moves perspective to Sima Yi");
  assert.deepEqual(redStart.data.room.currentAction.triggerOptions[0].selection.eligibleCardIds, [replacementBlack.id]);
  const redReplaced = await request("trigger", { code: redToBlack.code, token: redToBlack.token, providerId: "sima_yi_guicai", cardId: replacementBlack.id });
  assert.equal(redReplaced.status, 200, JSON.stringify(redReplaced.data));
  assert.equal(redReplaced.data.room.currentAction.triggerEvent, "turn_start", "black final Luoshen result continues the sequence");
  assert.deepEqual(redReplaced.data.room.myHand.map((held) => held.id), [replacementBlack.id]);
  assert.equal(query(`SELECT json_array_length(hand_json) FROM players WHERE id=${quote(redToBlack.sima.id)}`), "0", "Guicai consumes the replacement from Sima Yi's hand");
  assert.ok(discardIds(redToBlack.code).includes(originalRed.id), "the original red reveal is discarded");
  assert.ok(redReplaced.data.room.log.some((entry) => entry.includes("Sima Yi replaces the Judgement card with 7♠ using Guicai.")));
  assert.equal((await request("decline_trigger", { code: redToBlack.code, token: redToBlack.token })).data.room.phase, "draw");

  const replacementRed = { ...card("Peach", "guicai-red"), suit: "♥", rank: "Q" };
  const originalBlack = { ...card("Attack", "guicai-original-black"), suit: "♠", rank: "7" };
  const blackToRed = await beginZhenTurn([originalBlack], [], [replacementRed]);
  await request("trigger", { code: blackToRed.code, token: blackToRed.token, providerId: "zhen_ji_luoshen" });
  const blackRevealed = await state(blackToRed.code, blackToRed.token);
  assert.equal(blackRevealed.data.currentAction.triggerEvent, "judgement_revealed");
  const blackReplaced = await request("trigger", { code: blackToRed.code, token: blackToRed.token, providerId: "sima_yi_guicai", cardId: replacementRed.id });
  assert.equal(blackReplaced.status, 200, JSON.stringify(blackReplaced.data));
  assert.equal(blackReplaced.data.room.phase, "draw", "red final Luoshen result ends the sequence");
  assert.deepEqual(blackReplaced.data.room.players.find((player) => player.id === blackToRed.zhen.id).handCards, []);
  assert.ok(discardIds(blackToRed.code).includes(originalBlack.id));
  assert.ok(discardIds(blackToRed.code).includes(replacementRed.id));

  const declinedOriginal = { ...card("Attack", "guicai-declined-original"), suit: "♣", rank: "8" };
  const declinedReplacement = { ...card("Peach", "guicai-declined-replacement"), suit: "♥", rank: "Q" };
  const declinedGuicai = await beginZhenTurn([declinedOriginal], [], [declinedReplacement]);
  await request("trigger", { code: declinedGuicai.code, token: declinedGuicai.token, providerId: "zhen_ji_luoshen" });
  const declinedReplacementWindow = await request("decline_trigger", { code: declinedGuicai.code, token: declinedGuicai.token });
  assert.equal(declinedReplacementWindow.status, 200, JSON.stringify(declinedReplacementWindow.data));
  assert.deepEqual(declinedReplacementWindow.data.room.myHand.map((held) => held.id), [declinedOriginal.id], "declining Guicai keeps the revealed card final");
  assert.equal(query(`SELECT json_array_length(hand_json) FROM players WHERE id=${quote(declinedGuicai.sima.id)}`), "1");
  assert.equal(discardIds(declinedGuicai.code).includes(declinedOriginal.id), false);
  assert.equal((await request("decline_trigger", { code: declinedGuicai.code, token: declinedGuicai.token })).data.room.phase, "draw");
});

test("Overindulgence uses the Judgement Zone and skips only a failed target's Play Phase", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members; const bob = game.members.find((member) => member.name === "Bob");
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice"); const bobPlayer = game.room.players.find((player) => player.name === "Bob");
  assert.ok(hostPlayer && alicePlayer && bobPlayer && bob);

  setHand(hostPlayer.id, [card("Overindulgence", "cancelled")], 5, 5); setHand(alicePlayer.id, [card("Negation", "overindulgence")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const opened = await request("play_card", { code: game.code, token: host.token, cardId: "overindulgence-cancelled", targetId: alicePlayer.id });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.pendingNegation, null); assert.equal(opened.data.room.phase, "play");
  assert.deepEqual(opened.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards.map((delayed) => delayed.id), ["overindulgence-cancelled"], "placement immediately enters the Judgement Zone");

  setHand(hostPlayer.id, [card("Overindulgence", "placed")], 5, 5); setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, []); setTurn(game.code, hostPlayer.seat);
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

  const overOriginal = { ...card("Dodge", "guicai-over-original"), suit: "♣", rank: "8" };
  const overReplacement = { ...card("Peach", "guicai-over-replacement"), suit: "♥", rank: "Q" };
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(bobPlayer.id)}`);
  setHand(bobPlayer.id, [overReplacement], 4, 4); setEquipment(bobPlayer.id, { armor: card("EightTrigrams", "guicai-equipment") });
  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [card("Overindulgence", "guicai-overindulgence")]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([overOriginal, card("Attack", "guicai-over-draw-1"), card("Dodge", "guicai-over-draw-2")] ))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const overWindow = await request("draw", { code: game.code, token: alice.token });
  assert.equal(overWindow.status, 200, JSON.stringify(overWindow.data));
  assert.equal(overWindow.data.room.currentAction.triggerEvent, "judgement_revealed");
  assert.equal(overWindow.data.room.actionPlayerId, bobPlayer.id);
  const overView = await state(game.code, bob.token);
  assert.deepEqual(overView.data.currentAction.triggerOptions[0].selection.eligibleCardIds, [overReplacement.id], "Guicai exposes only Sima Yi's hand cards, never equipment");
  const overReplaced = await request("trigger", { code: game.code, token: bob.token, providerId: "sima_yi_guicai", cardId: overReplacement.id });
  assert.equal(overReplaced.status, 200, JSON.stringify(overReplaced.data));
  assert.equal(overReplaced.data.room.phase, "play", "a Heart replacement changes Overindulgence to a successful result");
  assert.ok(overReplaced.data.room.log.some((entry) => /judges Q♥ for Overindulgence.*Heart result allows the Play Phase/.test(entry)));
  assert.ok(discardIds(game.code).includes(overOriginal.id)); assert.ok(discardIds(game.code).includes(overReplacement.id));

  const ended = await request("end_turn", { code: game.code, token: alice.token });
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
  const judgementCancelled = await request("respond", { code: game.code, token: alice.token, cardId: "negation-judgement-window" });
  assert.equal(judgementCancelled.status, 200); assert.equal(judgementCancelled.data.room.phase, "draw"); assert.deepEqual(judgementCancelled.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, []);
  assert.equal(judgementCancelled.data.room.log.filter((entry) => /Overindulgence's effect on Alice is cancelled by Negation\./.test(entry)).length, 1, "Negated Overindulgence records one cancellation");
  const afterJudgementNegation = await request("draw", { code: game.code, token: alice.token });
  assert.equal(afterJudgementNegation.status, 200); assert.equal(afterJudgementNegation.data.room.phase, "play"); assert.equal(afterJudgementNegation.data.room.timeline.some((event) => event.card?.id === "dodge-unused-judgement"), false, "Negation cancels the delayed effect before a judgement card is drawn");


});

test("Lightning is placed on self, transfers after a miss, and deals 3 thunder damage on Spade 2-9", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice, bob] = game.members;
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
  setHand(alicePlayer.id, [card("Negation", "lightning-judgement-window")], 4, 4); setJudgement(alicePlayer.id, [{ ...card("Overindulgence", "intact-after-lightning"), suit: "♣", rank: "6" }, negatedJudgementLightning]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([card("Dodge", "unused-lightning-judge")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const judgementNegationWindow = await request("draw", { code: game.code, token: alice.token });
  assert.equal(judgementNegationWindow.status, 200); assert.equal(judgementNegationWindow.data.room.pendingNegation.cardName, "Lightning");
  const latestLightningEvent = judgementNegationWindow.data.room.timeline.filter((event) => event.type === "card" && event.card.id === "lightning-judgement-window").at(-1);
  assert.equal(latestLightningEvent.action, "activate", "a fresh judgement activation anchors the current Negation presentation instead of the original turn's discards");
  const negatedLightning = (await request("respond", { code: game.code, token: alice.token, cardId: "negation-lightning-judgement-window" })).data.room;
  assert.equal(negatedLightning.phase, "draw"); assert.deepEqual(negatedLightning.players.find((player) => player.id === alicePlayer.id).judgementCards.map((delayed) => delayed.id), ["overindulgence-intact-after-lightning"]); assert.deepEqual(negatedLightning.players.find((player) => player.id === bobPlayer.id).judgementCards.map((delayed) => delayed.id), ["lightning-judgement-window"], "Negated Lightning transfers without drawing a Judgement");

  const missedLightning = { ...card("Lightning", "miss"), suit: "♠", rank: "K" }; const missJudge = { ...card("Dodge", "miss-judge"), suit: "♥", rank: "7" };
  setHand(alicePlayer.id, [], 4, 4); setJudgement(alicePlayer.id, [missedLightning]); setJudgement(bobPlayer.id, []); setTurn(game.code, alicePlayer.seat, "draw");
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

  for (const player of game.room.players) setHand(player.id, player.id === bobPlayer.id ? [card("Peach", "lightning-rescue-1"), card("Peach", "lightning-rescue-2"), card("Peach", "lightning-rescue-3")] : [], player.id === alicePlayer.id ? 1 : 4, player.id === hostPlayer.id ? 5 : 4);
  setJudgement(alicePlayer.id, [{ ...card("Lightning", "lethal"), suit: "♦", rank: "Q" }]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([{ ...card("Attack", "lethal-judge"), suit: "♠", rank: "8" }, card("Attack", "unused-lethal-draw")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const lethal = await request("draw", { code: game.code, token: alice.token });
  assert.equal(lethal.status, 200); assert.equal(lethal.data.room.players.find((player) => player.id === alicePlayer.id).hp, -2, "Lightning preserves true post-damage HP");
  const rescueView = await state(game.code, bob.token); assert.equal(rescueView.data.pendingDying.recoveryNeeded, 3);
  for (const id of ["peach-lightning-rescue-1", "peach-lightning-rescue-2", "peach-lightning-rescue-3"]) {
    const rescued = await request("give_peach", { code: game.code, token: bob.token, cardId: id });
    assert.equal(rescued.status, 200);
  }
  const rescued = await state(game.code, alice.token);
  assert.equal(rescued.data.players.find((player) => player.id === alicePlayer.id).hp, 1, "three Peaches rescue a target from -2 HP");
  assert.equal(rescued.data.players.find((player) => player.id === alicePlayer.id).alive, true);
});

test("delayed Standard cards resolve newest first and stale draws cannot replay them", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const hostPlayer = game.room.players.find((player) => player.name === "Host"); const alicePlayer = game.room.players.find((player) => player.name === "Alice"); const bobPlayer = game.room.players.find((player) => player.name === "Bob");
  assert.ok(hostPlayer && alicePlayer && bobPlayer);
  for (const player of game.room.players) setHand(player.id, [], 4, 4);

  const olderLightning = { ...card("Lightning", "older"), suit: "♥", rank: "Q" }; const newerOverindulgence = { ...card("Overindulgence", "newer"), suit: "♣", rank: "6" };
  setJudgement(alicePlayer.id, [olderLightning, newerOverindulgence]); setTurn(game.code, alicePlayer.seat, "draw");
  setDeck(game.code, [{ ...card("Dodge", "over-judge"), suit: "♠", rank: "7" }, { ...card("Dodge", "lightning-judge"), suit: "♥", rank: "7" }]);
  const alice = game.members.find((member) => member.name === "Alice"); const beforeFirstDraw = await state(game.code, alice.token);
  const newestFirst = await request("draw", { code: game.code, token: alice.token });
  assert.equal(newestFirst.status, 200); assert.equal(newestFirst.data.room.phase, "draw-skip-play"); assert.deepEqual(newestFirst.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards.map((delayed) => delayed.id), ["lightning-older"]);
  assert.ok(newestFirst.data.room.log.some((entry) => /Overindulgence/.test(entry)));
  const staleDraw = await request("draw", { code: game.code, token: alice.token, context: { actionRevision: beforeFirstDraw.data.actionRevision } });
  assert.equal(staleDraw.status, 409); assert.equal(staleDraw.data.stale, true); assert.deepEqual(staleDraw.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards.map((delayed) => delayed.id), ["lightning-older"], "the stale revision cannot resolve the remaining delayed card");
  const olderResolved = await request("draw", { code: game.code, token: alice.token });
  assert.equal(olderResolved.status, 200); assert.deepEqual(olderResolved.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards, []); assert.ok(olderResolved.data.room.log.some((entry) => /Lightning misses and transfers to Bob/.test(entry)), "the older Lightning resolves after the newer Overindulgence");
  assert.equal(olderResolved.data.room.players.find((player) => player.id === bobPlayer.id).judgementCards[0].id, "lightning-older");

  const lightning = { ...card("Lightning", "race"), suit: "♥", rank: "Q" }; setJudgement(alicePlayer.id, [lightning]); setTurn(game.code, alicePlayer.seat, "draw"); setDeck(game.code, [{ ...card("Dodge", "race-judge"), suit: "♥", rank: "7" }, card("Attack", "race-draw-1"), card("Attack", "race-draw-2")]);
  const [first, second] = await Promise.all([request("draw", { code: game.code, token: alice.token }), request("draw", { code: game.code, token: alice.token })]);
  assert.equal([first.status, second.status].filter((status) => status === 200).length, 1, "duplicate draw submissions resolve one delayed effect");
  const afterRace = await state(game.code, alice.token); assert.equal(afterRace.data.players.find((player) => player.id === alicePlayer.id).judgementCards.length, 0);
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
  const placementCancelled = await request("respond", { code: game.code, token: alice.token, cardId: "negation-rations-placement" });
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
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([{ ...card("Dodge", "combined-rations-judge"), suit: "♠", rank: "10" }, { ...card("Dodge", "combined-overindulgence-judge"), suit: "♠", rank: "7" }, card("Attack", "combined-unused-draw")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const firstDelayed = await request("draw", { code: game.code, token: alice.token });
  assert.equal(firstDelayed.status, 200); assert.equal(firstDelayed.data.room.phase, "draw-skip-play"); assert.equal(firstDelayed.data.room.players.find((player) => player.id === alicePlayer.id).judgementCards.length, 1, "the older delayed card remains after the newer card resolves first");
  const combinedSkip = await request("draw", { code: game.code, token: alice.token });
  assert.equal(combinedSkip.status, 200); assert.equal(combinedSkip.data.room.phase, "discard"); assert.equal(combinedSkip.data.drawnCards, undefined); assert.equal(combinedSkip.data.room.myHand.length, 0, "Rations Depleted and Overindulgence preserve both skipped phases across consecutive judgements");

  const negatedRations = { ...card("RationsDepleted", "judgement-negated"), suit: "♠", rank: "10" };
  setHand(alicePlayer.id, [card("Negation", "rations-judgement-window")], 4, 4); setJudgement(alicePlayer.id, [negatedRations]); setTurn(game.code, alicePlayer.seat, "draw");
  sql(`UPDATE rooms SET deck_json=${quote(JSON.stringify([card("Dodge", "unused-rations-judge"), card("Attack", "negated-draw-1"), card("Peach", "negated-draw-2")]))}, discard_json='[]' WHERE code=${quote(game.code)}`);
  const judgementWindow = await request("draw", { code: game.code, token: alice.token });
  assert.equal(judgementWindow.status, 200); assert.equal(judgementWindow.data.room.pendingNegation.cardName, "Rations Depleted");
  const cancelled = await request("respond", { code: game.code, token: alice.token, cardId: "negation-rations-judgement-window" });
  assert.equal(cancelled.status, 200); assert.equal(cancelled.data.room.phase, "draw");
  const afterNegation = await request("draw", { code: game.code, token: alice.token });
  assert.equal(afterNegation.status, 200); assert.equal(afterNegation.data.drawnCards.length, 2); assert.equal(afterNegation.data.room.timeline.some((event) => event.card?.id === "dodge-unused-rations-judge"), false);


});

test("Xiahou Dun Stauchness declines or resolves a non-Heart Judgement through the generic source choice", { timeout: 30_000 }, async () => {
  const declined = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-decline-judge"), suit: "♠", rank: "7" } });
  assert.ok(declined.actionPresentation?.readyAfterEventId, "the damage trigger waits for its essential presentation barrier");
  const skipped = await request("decline_trigger", { code: declined.code, token: declined.targetMember.token });
  assert.equal(skipped.status, 200, JSON.stringify(skipped.data));
  assert.equal(skipped.data.room.phase, "play-struck");
  assert.equal(skipped.data.room.players.find((player) => player.id === declined.target.id).hp, 2);
  assert.equal(discardIds(declined.code).includes("dodge-ganglie-decline-judge"), false, "declining does not invent a Judgement card");

  const resolved = await openGanglieAttack({
    judge: { ...card("Dodge", "ganglie-spade-judge"), suit: "♠", rank: "7" },
    sourceCards: [card("Attack", "ganglie-discard-attack"), card("Dodge", "ganglie-cost-a"), card("Peach", "ganglie-cost-b")],
  });
  const accepted = await request("trigger", { code: resolved.code, token: resolved.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const sourceView = (await state(resolved.code, resolved.sourceMember.token)).data;
  assert.equal(sourceView.currentAction.kind, "trigger");
  assert.equal(sourceView.currentAction.triggerEvent, "damage_suffered");
  assert.equal(sourceView.currentAction.actorId, resolved.source.id);
  assert.ok(sourceView.currentAction.presentation?.readyAfterEventId, "the mandatory source choice retains its presentation barrier");
  const choice = sourceView.currentAction.triggerOptions.find((option) => option.effectId === "xiahou_dun_ganglie");
  assert.equal(choice.description, "The Judgement is not a Heart. Choose one: discard exactly 2 cards from your hand, or take 1 damage from Xiahou Dun. Equipment and Judgement Zone cards cannot be discarded for this choice.");
  assert.deepEqual(choice.selection.choices.map((entry) => entry.id), ["discard_two", "take_damage"]);
  assert.equal(choice.selection.choices[0].label, "Discard exactly 2 cards from your hand");
  assert.equal(choice.selection.cardCountByChoice.discard_two, 2);
  assert.deepEqual(choice.selection.eligibleHandKeys, ["hand:0", "hand:1"]);
  const targetView = (await state(resolved.code, resolved.targetMember.token)).data;
  assert.deepEqual(targetView.currentAction.triggerOptions, [], "the mandatory source choice is not projected to Xiahou Dun");
  const discarded = await request("trigger", { code: resolved.code, token: resolved.sourceMember.token, providerId: "xiahou_dun_ganglie", choice: "discard_two", cardKeys: ["hand:0", "hand:1"] });
  assert.equal(discarded.status, 200, JSON.stringify(discarded.data));
  assert.equal(discarded.data.room.phase, "play-struck");
  assert.equal(discarded.data.room.players.find((player) => player.id === resolved.target.id).hp, 2);
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(resolved.source.id)}`)).length, 0);
  for (const id of ["dodge-ganglie-spade-judge", "dodge-ganglie-cost-a", "peach-ganglie-cost-b"]) assert.ok(discardIds(resolved.code).includes(id), `${id} is conserved in discard`);
  assert.equal(discarded.data.room.log.filter((entry) => /takes 1 damage\./.test(entry)).length, 1);
});

test("Stauchness uses the final Guicai card, limits discard choices, and resumes when its source disappears", { timeout: 30_000 }, async () => {
  const game = await openGanglieAttack({
    judge: { ...card("Dodge", "ganglie-heart-judge"), suit: "♥", rank: "2" },
    sourceCards: [card("Attack", "ganglie-heart-attack"), card("Peach", "ganglie-heart-extra")],
  });
  const accepted = await request("trigger", { code: game.code, token: game.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.equal(accepted.data.room.phase, "play-struck");
  assert.ok(accepted.data.room.log.some((entry) => /Heart result means Stauchness has no effect/.test(entry)));
  assert.ok(discardIds(game.code).includes("dodge-ganglie-heart-judge"));

  const guicai = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-guicai-original"), suit: "♠", rank: "9" } });
  const sima = guicai.room.players.find((player) => player.name === "Bob");
  const simaMember = guicai.members.find((member) => member.name === "Bob");
  assert.ok(sima && simaMember);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(sima.id)}`);
  const replacement = { ...card("Dodge", "ganglie-guicai-replacement"), suit: "♥", rank: "Q" };
  setHand(sima.id, [replacement], 3, 3);
  const acceptedForGuicai = await request("trigger", { code: guicai.code, token: guicai.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(acceptedForGuicai.status, 200, JSON.stringify(acceptedForGuicai.data));
  const guicaiView = (await state(guicai.code, simaMember.token)).data;
  assert.equal(guicaiView.currentAction.triggerEvent, "judgement_revealed");
  assert.deepEqual(guicaiView.currentAction.triggerOptions.map((option) => option.effectId), ["sima_yi_guicai"]);
  const replaced = await request("trigger", { code: guicai.code, token: simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
  assert.equal(replaced.data.room.phase, "play-struck");
  assert.ok(discardIds(guicai.code).includes("dodge-ganglie-guicai-original"));
  assert.ok(discardIds(guicai.code).includes("dodge-ganglie-guicai-replacement"));

  const guicaiToNonHeart = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-guicai-heart-original"), suit: "♥", rank: "2" } });
  const sima2 = guicaiToNonHeart.room.players.find((player) => player.name === "Bob");
  const simaMember2 = guicaiToNonHeart.members.find((member) => member.name === "Bob");
  assert.ok(sima2 && simaMember2);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(sima2.id)}`);
  const replacementBlack = { ...card("Dodge", "ganglie-guicai-black-replacement"), suit: "♠", rank: "7" };
  setHand(sima2.id, [replacementBlack], 3, 3);
  const acceptedForReverseGuicai = await request("trigger", { code: guicaiToNonHeart.code, token: guicaiToNonHeart.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(acceptedForReverseGuicai.status, 200, JSON.stringify(acceptedForReverseGuicai.data));
  const reverseWindow = await state(guicaiToNonHeart.code, simaMember2.token);
  assert.equal(reverseWindow.data.currentAction.triggerEvent, "judgement_revealed");
  const reverseReplaced = await request("trigger", { code: guicaiToNonHeart.code, token: simaMember2.token, providerId: "sima_yi_guicai", cardId: replacementBlack.id });
  assert.equal(reverseReplaced.status, 200, JSON.stringify(reverseReplaced.data));
  assert.equal(reverseReplaced.data.room.currentAction.actorId, guicaiToNonHeart.source.id);
  const reverseChoice = await request("trigger", { code: guicaiToNonHeart.code, token: guicaiToNonHeart.sourceMember.token, providerId: "xiahou_dun_ganglie", choice: "take_damage" });
  assert.equal(reverseChoice.status, 200, JSON.stringify(reverseChoice.data));
  assert.equal(reverseChoice.data.room.players.find((player) => player.id === guicaiToNonHeart.source.id).hp, 3);
  assert.ok(discardIds(guicaiToNonHeart.code).includes("dodge-ganglie-guicai-heart-original"));
  assert.ok(discardIds(guicaiToNonHeart.code).includes("dodge-ganglie-guicai-black-replacement"));

  const sourceGone = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-source-gone"), suit: "♠", rank: "4" } });
  sql(`UPDATE players SET alive=0, hp=0, hand_json='[]' WHERE id=${quote(sourceGone.source.id)}`);
  sql(`UPDATE rooms SET turn_seat=${sourceGone.target.seat} WHERE code=${quote(sourceGone.code)}`);
  const resumed = await request("decline_trigger", { code: sourceGone.code, token: sourceGone.targetMember.token });
  assert.equal(resumed.status, 200, JSON.stringify(resumed.data));
  assert.equal(resumed.data.room.phase, "play-struck");
  assert.equal(resumed.data.room.pending, null);
});

test("Quick Test projects Stauchness privately through the generic currentAction", { timeout: 30_000 }, async () => {
  const quick = await createQuickTestGame();
  const { token, room } = quick.data;
  const [source, target, ...others] = room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='xiahou-dun' WHERE id=${quote(target.id)}`);
  setHand(source.id, [card("Attack", "quick-ganglie-attack"), card("Dodge", "quick-ganglie-cost-a"), card("Peach", "quick-ganglie-cost-b")], 4, 4);
  setHand(target.id, [], 3, 3);
  for (const player of others) setHand(player.id, [], 3, 3);
  setTurn(room.code, source.seat);
  setDeck(room.code, [{ ...card("Dodge", "quick-ganglie-judge"), suit: "♠", rank: "7" }]);
  const started = await request("play_card", { code: room.code, token, cardId: "attack-quick-ganglie-attack", targetId: target.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  assert.equal(started.data.room.currentAction.actorId, target.id);
  const accepted = await request("trigger", { code: room.code, token, providerId: "xiahou_dun_ganglie" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.equal(accepted.data.room.currentAction.actorId, source.id);
  assert.equal(accepted.data.room.currentAction.triggerEvent, "damage_suffered");
  assert.ok(accepted.data.room.currentAction.presentation?.readyAfterEventId);
  assert.deepEqual(accepted.data.room.currentAction.triggerOptions[0].selection.eligibleHandKeys, ["hand:0", "hand:1"]);
  assert.deepEqual(accepted.data.room.players.map((player) => player.handCards), [[], [], [], []], "Quick Test never projects other hands");
  assert.deepEqual(accepted.data.room.myHand.map((held) => held.id), ["dodge-quick-ganglie-cost-a", "peach-quick-ganglie-cost-b"]);
});

test("Sima Yi Retaliation uses the generic target-card picker with privacy and exact card conservation", { timeout: 30_000 }, async () => {
  const game = await openFankuiAttack();
  const pending = (await state(game.code, game.targetMember.token)).data;
  const option = pending.currentAction.triggerOptions.find((entry) => entry.effectId === "sima_yi_fankui");
  assert.deepEqual(option.selection, { type: "target_cards", targetId: game.source.id, min: 1, max: 1, eligibleKeys: ["hand:0"] });
  assert.deepEqual(pending.myHand, [], "Sima Yi starts with an empty hand");
  assert.equal(pending.players.find((player) => player.id === game.source.id).handCards.length, 0, "Sima Yi does not receive source hand identities");
  const unrelated = (await state(game.code, game.members[2].token)).data;
  assert.equal(unrelated.players.find((player) => player.id === game.source.id).handCards.length, 0, "unrelated viewers do not receive source hand identities");

  const obtained = await request("trigger", { code: game.code, token: game.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] });
  assert.equal(obtained.status, 200, JSON.stringify(obtained.data));
  assert.equal(obtained.data.room.phase, "play-struck");
  assert.deepEqual(obtained.data.room.myHand.map((held) => held.id), ["peach-fankui-source-hidden"]);
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(game.source.id)} AND json_extract(value,'$.id')='peach-fankui-source-hidden'`), "0");
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(game.target.id)} AND json_extract(value,'$.id')='peach-fankui-source-hidden'`), "1");
  assert.equal(obtained.data.room.log.filter((entry) => /obtains a card from Host with Retaliation/.test(entry)).length, 1);
});

test("Retaliation can obtain an eligible public Equipment or Judgement card and ignores empty sources", { timeout: 30_000 }, async () => {
  const shield = card("NioShield", "fankui-public-equipment");
  const equipmentGame = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-equipment-attack")], sourceEquipment: { armor: shield } });
  const equipmentState = (await state(equipmentGame.code, equipmentGame.targetMember.token)).data;
  assert.deepEqual(equipmentState.currentAction.triggerOptions[0].selection.eligibleKeys, [shield.id]);
  const tookEquipment = await request("trigger", { code: equipmentGame.code, token: equipmentGame.targetMember.token, providerId: "sima_yi_fankui", cardKeys: [shield.id] });
  assert.equal(tookEquipment.status, 200, JSON.stringify(tookEquipment.data));
  assert.deepEqual(tookEquipment.data.room.myHand.map((held) => held.id), [shield.id]);
  assert.deepEqual(tookEquipment.data.room.players.find((player) => player.id === equipmentGame.source.id).equipmentCards, []);

  const delayed = card("Lightning", "fankui-public-judgement");
  const judgementGame = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-judgement-attack")], sourceJudgement: [delayed] });
  const judgementState = (await state(judgementGame.code, judgementGame.targetMember.token)).data;
  assert.deepEqual(judgementState.currentAction.triggerOptions[0].selection.eligibleKeys, [delayed.id]);
  const tookJudgement = await request("trigger", { code: judgementGame.code, token: judgementGame.targetMember.token, providerId: "sima_yi_fankui", cardKeys: [delayed.id] });
  assert.equal(tookJudgement.status, 200, JSON.stringify(tookJudgement.data));
  assert.deepEqual(tookJudgement.data.room.myHand.map((held) => held.id), [delayed.id]);
  assert.deepEqual(tookJudgement.data.room.players.find((player) => player.id === judgementGame.source.id).judgementCards, []);

  const emptyGame = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-empty-source")], expectReaction: false });
  const emptyState = (await state(emptyGame.code, emptyGame.targetMember.token)).data;
  assert.equal(emptyState.phase, "play-struck", JSON.stringify(emptyState));
  assert.equal(emptyState.currentAction.kind, "turn");
  assert.equal(emptyState.currentAction.triggerEvent, undefined);
});

test("Retaliation rejects stale source cards, handles a vanished source, and has one concurrent winner", { timeout: 30_000 }, async () => {
  const stale = await openFankuiAttack();
  setHand(stale.source.id, [], 4, 4);
  const staleResult = await request("trigger", { code: stale.code, token: stale.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] });
  assert.equal(staleResult.status, 409);
  assert.equal(staleResult.data.stale, true);
  assert.equal(staleResult.data.room.pending.kind, "trigger");

  const vanished = await openFankuiAttack();
  sql(`UPDATE players SET alive=0, hp=0, hand_json='[]', equipment_json='{}', judgement_json='[]' WHERE id=${quote(vanished.source.id)}`);
  sql(`UPDATE rooms SET turn_seat=${vanished.target.seat} WHERE code=${quote(vanished.code)}`);
  const skipped = await request("decline_trigger", { code: vanished.code, token: vanished.targetMember.token });
  assert.equal(skipped.status, 200, JSON.stringify(skipped.data));
  assert.equal(skipped.data.room.phase, "play-struck");
  assert.equal(skipped.data.room.pending, null);

  const race = await openFankuiAttack({ sourceCards: [card("Attack", "fankui-race-attack"), card("Peach", "fankui-race-hidden")] });
  const [first, second] = await Promise.all([
    request("trigger", { code: race.code, token: race.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] }),
    request("trigger", { code: race.code, token: race.targetMember.token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] }),
  ]);
  assert.equal([first.status, second.status].filter((status) => status === 200).length, 1);
  const loser = [first, second].find((result) => result.status === 409);
  assert.ok(loser?.data.stale === true);
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(race.target.id)} AND json_extract(value,'$.id')='peach-fankui-race-hidden'`), "1");
  assert.equal(discardIds(race.code).filter((id) => id === "peach-fankui-race-hidden").length, 0);
  assert.equal((await state(race.code, race.targetMember.token)).data.phase, "play-struck");
});

test("Quick Test follows Sima Yi only while he owns the Retaliation decision", { timeout: 30_000 }, async () => {
  const started = await createQuickTestGame();
  const { token, room } = started.data;
  const [source, sima] = room.players;
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='simayi' WHERE id=${quote(sima.id)}`);
  setHand(source.id, [card("Attack", "quick-fankui-attack"), card("Peach", "quick-fankui-hidden")], 4, 4);
  setHand(sima.id, [], 3, 3);
  for (const player of room.players) { setEquipment(player.id, {}); setJudgement(player.id, []); }
  for (const player of room.players.slice(2)) setHand(player.id, [], 3, 3);
  setTurn(room.code, source.seat);
  const attacked = await request("play_card", { code: room.code, token, cardId: "attack-quick-fankui-attack", targetId: sima.id });
  assert.equal(attacked.status, 200, JSON.stringify(attacked.data));
  assert.equal(attacked.data.room.meId, sima.id);
  assert.equal(attacked.data.room.currentAction.actorId, sima.id);
  assert.deepEqual(attacked.data.room.currentAction.triggerOptions[0].selection.eligibleKeys, ["hand:0"]);
  const obtained = await request("trigger", { code: room.code, token, providerId: "sima_yi_fankui", cardKeys: ["hand:0"] });
  assert.equal(obtained.status, 200, JSON.stringify(obtained.data));
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(sima.id)} AND json_extract(value,'$.id')='peach-quick-fankui-hidden'`), "1");
  assert.equal(obtained.data.room.meId, source.id);
});

test("Stauchness take-damage choice enters the normal Dying flow and stale concurrent acceptance has one winner", { timeout: 30_000 }, async () => {
  const dying = await openGanglieAttack({ judge: { ...card("Dodge", "ganglie-dying-judge"), suit: "♣", rank: "5" }, sourceHp: 1, sourceCards: [card("Attack", "ganglie-dying-attack"), card("Peach", "ganglie-dying-extra")] });
  const accepted = await request("trigger", { code: dying.code, token: dying.targetMember.token, providerId: "xiahou_dun_ganglie" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const sourceView = (await state(dying.code, dying.sourceMember.token)).data;
  const option = sourceView.currentAction.triggerOptions.find((entry) => entry.effectId === "xiahou_dun_ganglie");
  assert.deepEqual(option.selection.choices.map((entry) => entry.id), ["take_damage"], "one hand card cannot satisfy discard 2");
  assert.deepEqual(option.selection.eligibleHandKeys, ["hand:0"]);
  const damaged = await request("trigger", { code: dying.code, token: dying.sourceMember.token, providerId: "xiahou_dun_ganglie", choice: "take_damage" });
  assert.equal(damaged.status, 200, JSON.stringify(damaged.data));
  assert.equal(damaged.data.room.phase, "dying");
  assert.equal(damaged.data.room.pendingDying.targetId, dying.source.id);
  assert.equal(damaged.data.room.players.find((player) => player.id === dying.source.id).hp, 0);
  assert.ok(damaged.data.room.log.some((entry) => /takes 1 damage from Alice for Stauchness and enters Dying/.test(entry)));

  for (let attempt = 0; attempt < 4; attempt++) {
    const race = await openGanglieAttack({ judge: { ...card("Dodge", `ganglie-race-${attempt}`), suit: "♥", rank: "2" } });
    const [first, second] = await Promise.all([
      request("trigger", { code: race.code, token: race.targetMember.token, providerId: "xiahou_dun_ganglie" }),
      request("trigger", { code: race.code, token: race.targetMember.token, providerId: "xiahou_dun_ganglie" }),
    ]);
    const results = [first, second];
    assert.equal(results.filter((result) => result.status === 200).length, 1);
    const loser = results.find((result) => result.status === 409);
    assert.ok(loser && loser.data.stale === true && loser.data.room);
    assert.equal(loser.data.room.phase, "play-struck");
    assert.equal(loser.data.room.pending, null);
    assert.equal(loser.data.room.players.every((player) => player.handCards.length === 0), true);
    assert.equal(discardIds(race.code).filter((id) => id === `dodge-ganglie-race-${attempt}`).length, 1);
    assert.equal((await state(race.code, race.sourceMember.token)).data.players.find((player) => player.id === race.target.id).hp, 2);
  }
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




test("unknown semantic Dodge and Negate providers cross the real API and D1 boundary", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members; const [hostPlayer, alicePlayer] = game.room.players;
  sql(`UPDATE players SET hero='test-hero' WHERE id=${quote(alicePlayer.id)}`);
  setHand(hostPlayer.id, [card("Attack", "semantic-dodge")], 4, 4); setHand(alicePlayer.id, [], 4, 4); setTurn(game.code, hostPlayer.seat);
  const attack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-semantic-dodge", targetId: alicePlayer.id });
  assert.equal(attack.status, 200); const aliceView = await state(game.code, alice.token); assert.ok(aliceView.data.currentAction.options.some((option) => option.providerId === "test_semantic_dodge"));
  const dodged = await request("respond", { code: game.code, token: alice.token, providerId: "test_semantic_dodge" });
  assert.equal(dodged.status, 200); assert.equal(dodged.data.room.phase, "play-struck"); assert.equal(dodged.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4);

  sql(`UPDATE players SET hero='test-hero' WHERE id=${quote(alicePlayer.id)}`);
  setHand(hostPlayer.id, [card("Dismantle", "semantic-negate")], 4, 4); setHand(alicePlayer.id, [card("Attack", "semantic-kept")], 4, 4); setTurn(game.code, hostPlayer.seat);
  const opened = await request("play_card", { code: game.code, token: host.token, cardId: "dismantle-semantic-negate", targetId: alicePlayer.id, targetCardIndex: 0 });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.actionPlayerId, alicePlayer.id); const negateView = await state(game.code, alice.token); assert.ok(negateView.data.currentAction.options.some((option) => option.providerId === "test_semantic_negate"));
  const negated = await request("respond", { code: game.code, token: alice.token, providerId: "test_semantic_negate" });
  assert.equal(negated.status, 200); assert.equal(negated.data.room.phase, "response"); assert.equal(negated.data.room.pendingNegation.chainDepth, 1); assert.equal(negated.data.room.pendingNegation.negated, true);
});

test("attack_dodged trigger continuation reopens every synthetic provider through Worker/D1", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host");
  const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);

  // The test-only trigger registry is inert unless these markers are persisted
  // in the isolated room, so this exercises the same live discovery path as a
  // future equipment or hero capability without adding a Standard card.
  setEquipment(hostPlayer.id, {
    armor: card("NioShield", "test-trigger-a-equipped"),
    defensiveHorse: card("NioShield", "test-trigger-b-equipped"),
  });
  setHand(hostPlayer.id, [card("Attack", "trigger-chain")], 4, 4);
  setHand(alicePlayer.id, [card("Dodge", "trigger-chain")], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  const attack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-trigger-chain", targetId: alicePlayer.id });
  assert.equal(attack.status, 200);
  assert.equal(attack.data.room.pendingAttack.actorId, alicePlayer.id);

  const dodged = await request("respond", { code: game.code, token: alice.token, cardId: "dodge-trigger-chain" });
  assert.equal(dodged.status, 200);
  const offered = await state(game.code, host.token);
  assert.equal(offered.data.currentAction.kind, "trigger");
  assert.deepEqual(offered.data.currentAction.triggerOptions.map((option) => option.effectId), ["test_attack_dodged_a", "test_attack_dodged_b"]);

  const afterA = await request("trigger", { code: game.code, token: host.token, providerId: "test_attack_dodged_a" });
  assert.equal(afterA.status, 200);
  assert.equal(afterA.data.room.currentAction.kind, "trigger");
  assert.deepEqual(afterA.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["test_attack_dodged_b"], "provider A is excluded when the same event reopens");
  const reopened = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.deepEqual(reopened.resolvedEffectIds, ["test_attack_dodged_a"]);

  const afterB = await request("trigger", { code: game.code, token: host.token, providerId: "test_attack_dodged_b" });
  assert.equal(afterB.status, 200);
  assert.equal(afterB.data.room.phase, "play-struck", "the original Attack-dodged continuation resumes after trigger exhaustion");
  assert.equal(afterB.data.room.pending, null);
  assert.equal(afterB.data.room.currentAction.kind, "turn");
  assert.equal(afterB.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4, "a continue_event reaction does not add damage");
  const triggerResolutions = afterB.data.room.log.filter((entry) => /resolves an optional reaction/.test(entry));
  assert.equal(triggerResolutions.length, 2, "each synthetic provider resolves exactly once");
  const persisted = query(`SELECT phase || ':' || COALESCE(pending_json, '') FROM rooms WHERE code=${quote(game.code)}`);
  assert.match(persisted, /^play-struck:$/, "the room is not stranded in response or resolving");
});

test("damage_about_to_apply trigger exhaustion resumes original Attack damage once", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host");
  const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);
  sql(`UPDATE players SET hero=NULL WHERE id=${quote(alicePlayer.id)}`);

  setEquipment(hostPlayer.id, {
    armor: card("NioShield", "test-trigger-a-equipped"),
    defensiveHorse: card("NioShield", "test-trigger-b-equipped"),
  });
  setHand(hostPlayer.id, [card("Attack", "damage-trigger-chain")], 4, 4);
  setHand(alicePlayer.id, [], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  const attack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-damage-trigger-chain", targetId: alicePlayer.id });
  assert.equal(attack.status, 200);
  assert.equal(attack.data.room.currentAction.kind, "trigger");
  assert.deepEqual(attack.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["test_damage_about_to_apply_a", "test_damage_about_to_apply_b"]);
  assert.equal(attack.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4, "damage is deferred while reactions are open");

  const afterA = await request("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_a" });
  assert.equal(afterA.status, 200);
  assert.equal(afterA.data.room.currentAction.kind, "trigger");
  assert.deepEqual(afterA.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["test_damage_about_to_apply_b"], "provider A is excluded when the damage event reopens");
  const reopened = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.deepEqual(reopened.resolvedEffectIds, ["test_damage_about_to_apply_a"]);
  assert.equal(afterA.data.room.players.find((player) => player.id === alicePlayer.id).hp, 4, "reopening does not apply damage early");

  const afterB = await request("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_b" });
  assert.equal(afterB.status, 200);
  assert.equal(afterB.data.room.phase, "play-struck", "the original Attack continuation resumes after trigger exhaustion");
  assert.equal(afterB.data.room.pending, null);
  assert.equal(afterB.data.room.currentAction.kind, "turn");
  assert.equal(afterB.data.room.players.find((player) => player.id === alicePlayer.id).hp, 3, "original Attack damage is applied exactly once");
  assert.equal(afterB.data.room.log.filter((entry) => /Alice takes 1 damage\./.test(entry)).length, 1, "the damage transition is recorded exactly once");
  assert.equal(afterB.data.room.log.filter((entry) => /resolves an optional reaction/.test(entry)).length, 2, "each synthetic provider resolves exactly once");
  const persisted = query(`SELECT phase || ':' || COALESCE(pending_json, '') FROM rooms WHERE code=${quote(game.code)}`);
  assert.match(persisted, /^play-struck:$/, "the room is not stranded in response or resolving");
});

test("lethal damage trigger exhaustion enters shared Dying and Peach rescue exactly once", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, , bob] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer] = game.room.players;
  assert.ok(hostPlayer && alicePlayer && bobPlayer);

  setEquipment(hostPlayer.id, {
    armor: card("NioShield", "test-trigger-a-lethal-equipped"),
    defensiveHorse: card("NioShield", "test-trigger-b-lethal-equipped"),
  });
  setHand(hostPlayer.id, [card("Attack", "lethal-damage-trigger-chain")], 4, 4);
  setHand(alicePlayer.id, [], 1, 4);
  setHand(bobPlayer.id, [card("Peach", "lethal-rescue")], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  const attack = await request("play_card", { code: game.code, token: host.token, cardId: "attack-lethal-damage-trigger-chain", targetId: alicePlayer.id });
  assert.equal(attack.status, 200);
  assert.deepEqual(attack.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["test_damage_about_to_apply_a", "test_damage_about_to_apply_b"]);

  await request("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_a" });
  const afterB = await request("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_b" });
  assert.equal(afterB.status, 200);
  assert.equal(afterB.data.room.phase, "dying");
  assert.equal(afterB.data.room.pending?.kind, "dying");
  assert.equal(afterB.data.room.currentAction.kind, "dying");
  assert.equal(afterB.data.room.pendingDying.targetId, alicePlayer.id);
  assert.equal(afterB.data.room.players.find((player) => player.id === alicePlayer.id).hp, 0);
  assert.equal(afterB.data.room.players.find((player) => player.id === alicePlayer.id).alive, true, "shared Dying keeps the target rescuable");
  assert.equal(afterB.data.room.log.filter((entry) => /Alice takes 1 damage/.test(entry)).length, 1);
  assert.equal(afterB.data.room.log.filter((entry) => /enters Dying/.test(entry)).length, 1);
  assert.equal(afterB.data.room.log.filter((entry) => /resolves an optional reaction/.test(entry)).length, 2);
  assert.equal(afterB.data.room.log.filter((entry) => /Peach rescue begins/.test(entry)).length, 1);

  const rescued = await request("give_peach", { code: game.code, token: bob.token, cardId: "peach-lethal-rescue" });
  assert.equal(rescued.status, 200);
  assert.equal(rescued.data.room.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.equal(rescued.data.room.players.find((player) => player.id === alicePlayer.id).alive, true);
  assert.equal(rescued.data.room.pendingDying, null);
  assert.equal(rescued.data.room.currentAction.kind, "turn");
  assert.equal(rescued.data.room.log.filter((entry) => /Alice takes 1 damage/.test(entry)).length, 1, "rescue does not replay damage");
  assert.equal(rescued.data.room.log.filter((entry) => /enters Dying/.test(entry)).length, 1, "Dying begins once");
  const persisted = query(`SELECT phase || ':' || COALESCE(pending_json, '') FROM rooms WHERE code=${quote(game.code)}`);
  assert.match(persisted, /^play-struck:$/, "the shared rescue pipeline returns to the turn sequence");
});

test("Dying uses one ordered rescue pass and does not revisit a passed actor", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice, bob, carol] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  setHand(hostPlayer.id, [card("Attack", "ordered-rescue"), card("Peach", "host-unused")], 4, 4);
  setHand(alicePlayer.id, [], -1, 4);
  sql(`UPDATE players SET role='Rebel' WHERE id=${quote(alicePlayer.id)}`);
  setHand(bobPlayer.id, [card("Peach", "ordered-bob")], 4, 4);
  setHand(carolPlayer.id, [card("Peach", "ordered-carol")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  await request("play_card", { code: game.code, token: host.token, cardId: "attack-ordered-rescue", targetId: alicePlayer.id });
  await takeDamageIfPending(game.code, alice.token);
  assert.equal((await state(game.code, host.token)).data.players.find((player) => player.id === alicePlayer.id).hp, -2);
  await request("skip_rescue", { code: game.code, token: host.token });
  const bobPrompt = await state(game.code, bob.token);
  assert.equal(bobPrompt.data.actionPlayerId, bobPlayer.id);
  const partial = await request("give_peach", { code: game.code, token: bob.token, cardId: "peach-ordered-bob" });
  assert.equal(partial.data.room.players.find((player) => player.id === alicePlayer.id).hp, -1);
  const carolPrompt = await state(game.code, carol.token);
  assert.equal(carolPrompt.data.actionPlayerId, carolPlayer.id, "partial rescue advances to the next actor after Bob finishes his only Peach");
  const orderedPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(orderedPending.actorId, carolPlayer.id, "Host is not revisited");
  assert.deepEqual(orderedPending.remainingIds, []);
  await request("skip_rescue", { code: game.code, token: carol.token });
  const defeated = await waitForState(game.code, host.token, (room) => !room.players.find((player) => player.id === alicePlayer.id).alive);
  assert.equal(defeated.players.find((player) => player.id === alicePlayer.id).role, "Rebel");
});

test("the current Dying actor may give multiple Peaches consecutively", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice, bob] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer] = game.room.players;
  setHand(hostPlayer.id, [card("Attack", "consecutive-rescue")], 4, 4);
  setHand(alicePlayer.id, [], -1, 4);
  setHand(bobPlayer.id, [card("Peach", "consecutive-1"), card("Peach", "consecutive-2"), card("Peach", "consecutive-3")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  await request("play_card", { code: game.code, token: host.token, cardId: "attack-consecutive-rescue", targetId: alicePlayer.id });
  await takeDamageIfPending(game.code, alice.token);
  for (const [index, id] of ["peach-consecutive-1", "peach-consecutive-2", "peach-consecutive-3"].entries()) {
    const result = await request("give_peach", { code: game.code, token: bob.token, cardId: id });
    assert.equal(result.status, 200);
    const hp = result.data.room.players.find((player) => player.id === alicePlayer.id).hp;
    assert.equal(hp, [-1, 0, 1][index]);
    if (index < 2) assert.equal(result.data.room.actionPlayerId, bobPlayer.id, "Bob remains the rescue actor between consecutive Peaches");
  }
  assert.equal((await state(game.code, alice.token)).data.pendingDying, null);
});

test("a Dying actor may stop after a partial Peach without being revisited", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice, bob, carol] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer, carolPlayer] = game.room.players;
  setHand(hostPlayer.id, [card("Attack", "early-stop")], 4, 4);
  setHand(alicePlayer.id, [], -1, 4);
  setHand(bobPlayer.id, [card("Peach", "early-stop-1"), card("Peach", "early-stop-2"), card("Peach", "early-stop-3")], 4, 4);
  setHand(carolPlayer.id, [card("Peach", "early-stop-carol")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  await request("play_card", { code: game.code, token: host.token, cardId: "attack-early-stop", targetId: alicePlayer.id });
  await takeDamageIfPending(game.code, alice.token);

  await request("skip_rescue", { code: game.code, token: host.token });
  const partial = await request("give_peach", { code: game.code, token: bob.token, cardId: "peach-early-stop-1" });
  assert.equal(partial.data.room.players.find((player) => player.id === alicePlayer.id).hp, -1);
  assert.equal(partial.data.room.actionPlayerId, bobPlayer.id);
  const stopped = await request("skip_rescue", { code: game.code, token: bob.token });
  const carolPrompt = await state(game.code, carol.token);
  assert.equal(carolPrompt.data.actionPlayerId, carolPlayer.id);
  assert.equal(stopped.data.room.players.find((player) => player.id === bobPlayer.id).handCount, 2);
  const stoppedPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(stoppedPending.actorId, carolPlayer.id, "Bob is not revisited after ending his opportunity");
});

test("stale and concurrent response submissions claim each transition once", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer] = game.room.players;
  assert.ok(hostPlayer && alicePlayer && bobPlayer);

  setHand(hostPlayer.id, [card("Attack", "stale-response")], 4, 4);
  setHand(alicePlayer.id, [card("Dodge", "stale-response")], 4, 4);
  setHand(bobPlayer.id, [card("Peach", "stale-response-rescue")], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  const opened = await request("play_card", { code: game.code, token: host.token, cardId: "attack-stale-response", targetId: alicePlayer.id });
  assert.equal(opened.status, 200);
  const staleContext = {
    actionRevision: opened.data.room.actionRevision,
    meId: hostPlayer.id,
    phase: "play",
    pendingKind: null,
    actorId: hostPlayer.id,
  };
  const prompt = await state(game.code, alice.token);
  assert.equal(prompt.data.actionPlayerId, alicePlayer.id);

  const stale = await request("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-stale-response", context: staleContext });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.stale, true);
  assert.equal(stale.data.room.pendingAttack.actorId, alicePlayer.id);

  const context = {
    actionRevision: prompt.data.actionRevision,
    meId: alicePlayer.id,
    phase: prompt.data.phase,
    pendingKind: "response",
    actorId: alicePlayer.id,
  };
  const results = await Promise.all([
    request("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-stale-response", context }),
    request("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-stale-response", context }),
  ]);
  assert.equal(results.filter((result) => result.status === 200).length, 1, "exactly one duplicate response claims the Attack");
  const losers = results.filter((result) => result.status === 409);
  assert.equal(losers.length, 1, "exactly one duplicate loses the Attack claim");
  assert.equal(losers[0].data.stale, true, "the losing duplicate is reported stale");
  assert.ok(losers[0].data.room, "the stale response includes a fresh room projection");
  assert.deepEqual(losers[0].data.room.myHand, [], "the losing response does not leak another private hand");
  assert.ok(losers[0].data.room.players.every((player) => player.handCards.length === 0), "the stale response keeps all other hands private");

  const finished = await state(game.code, host.token);
  assert.equal(finished.data.players.find((player) => player.id === alicePlayer.id).hp, 4);
  assert.equal(finished.data.log.filter((entry) => /Alice plays Dodge and blocks the Attack/.test(entry)).length, 1, "Dodge is consumed and logged once");
  assert.equal(discardIds(game.code).filter((id) => id === "dodge-stale-response").length, 1, "the Dodge enters discard once");
  assert.notEqual(finished.data.phase, "resolving");
  assert.equal(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`), "", "the response does not strand the room");
});

test("stale and concurrent trigger submissions execute optional reactions once", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members;
  const hostPlayer = game.room.players.find((player) => player.name === "Host");
  const alicePlayer = game.room.players.find((player) => player.name === "Alice");
  assert.ok(hostPlayer && alicePlayer);

  setEquipment(hostPlayer.id, {
    armor: card("NioShield", "test-trigger-a-equipped"),
    defensiveHorse: card("NioShield", "test-trigger-b-equipped"),
  });
  setHand(hostPlayer.id, [card("Attack", "stale-trigger")], 4, 4);
  setHand(alicePlayer.id, [card("Dodge", "stale-trigger")], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  await request("play_card", { code: game.code, token: host.token, cardId: "attack-stale-trigger", targetId: alicePlayer.id });
  await request("respond", { code: game.code, token: alice.token, providerId: "card", cardId: "dodge-stale-trigger" });
  const offered = await state(game.code, host.token);
  assert.equal(offered.data.currentAction.kind, "trigger");
  const context = {
    actionRevision: offered.data.actionRevision,
    meId: hostPlayer.id,
    phase: offered.data.phase,
    pendingKind: "trigger",
    actorId: hostPlayer.id,
  };

  const results = await Promise.all([
    request("trigger", { code: game.code, token: host.token, providerId: "test_attack_dodged_a", context }),
    request("trigger", { code: game.code, token: host.token, providerId: "test_attack_dodged_a", context }),
  ]);
  assert.equal(results.filter((result) => result.status === 200).length, 1, "exactly one duplicate trigger claims the event");
  assert.equal(results.filter((result) => result.status === 409 && result.data.stale).length, 1, "the losing trigger is reported stale");

  const afterA = await state(game.code, host.token);
  assert.deepEqual(afterA.data.currentAction.triggerOptions.map((option) => option.effectId), ["test_attack_dodged_b"]);
  assert.equal(afterA.data.log.filter((entry) => /resolves an optional reaction/.test(entry)).length, 1, "the trigger executes once");
  const pending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.deepEqual(pending.resolvedEffectIds, ["test_attack_dodged_a"]);

  const finished = await request("decline_trigger", { code: game.code, token: host.token });
  assert.equal(finished.status, 200);
  assert.equal(finished.data.room.phase, "play-struck");
  assert.equal(finished.data.room.pending, null);
  assert.notEqual(finished.data.room.phase, "resolving");
  assert.equal(finished.data.room.log.filter((entry) => /resolves an optional reaction/.test(entry)).length, 1);
});

test("concurrent lethal damage continuation enters Dying once and accepts one rescue", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, , bob] = game.members;
  const [hostPlayer, alicePlayer, bobPlayer] = game.room.players;
  assert.ok(hostPlayer && alicePlayer && bobPlayer);

  setEquipment(hostPlayer.id, {
    armor: card("NioShield", "test-trigger-a-equipped"),
    defensiveHorse: card("NioShield", "test-trigger-b-equipped"),
  });
  setHand(hostPlayer.id, [card("Attack", "double-lethal")], 4, 4);
  setHand(alicePlayer.id, [], 1, 4);
  setHand(bobPlayer.id, [card("Peach", "double-lethal")], 4, 4);
  setTurn(game.code, hostPlayer.seat);

  await request("play_card", { code: game.code, token: host.token, cardId: "attack-double-lethal", targetId: alicePlayer.id });
  await request("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_a" });
  const results = await Promise.all([
    request("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_b" }),
    request("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_b" }),
  ]);
  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal(results.filter((result) => result.status === 409 && result.data.stale).length, 1);

  const dying = await state(game.code, bob.token);
  assert.equal(dying.data.phase, "dying");
  assert.equal(dying.data.log.filter((entry) => /Alice takes 1 damage/.test(entry)).length, 1);
  assert.equal(dying.data.log.filter((entry) => /enters Dying/.test(entry)).length, 1);
  assert.equal(dying.data.players.find((player) => player.id === alicePlayer.id).hp, 0);

  const rescueContext = {
    actionRevision: dying.data.actionRevision,
    meId: dying.data.meId,
    phase: dying.data.phase,
    pendingKind: dying.data.pending?.kind,
    actorId: dying.data.actionPlayerId,
  };
  const rescues = await Promise.all([
    request("give_peach", { code: game.code, token: bob.token, cardId: "peach-double-lethal", context: rescueContext }),
    request("give_peach", { code: game.code, token: bob.token, cardId: "peach-double-lethal", context: rescueContext }),
  ]);
  assert.equal(rescues.filter((result) => result.status === 200).length, 1, `exactly one Peach rescue claims Dying: ${JSON.stringify(rescues)}`);
  assert.equal(rescues.filter((result) => result.status === 409).length, 1, "the duplicate rescue is rejected");
  const finished = await state(game.code, host.token);
  assert.equal(finished.data.players.find((player) => player.id === alicePlayer.id).hp, 1);
  assert.equal(finished.data.log.filter((entry) => /Alice takes 1 damage/.test(entry)).length, 1);
  assert.equal(finished.data.log.filter((entry) => /Peach rescue begins/.test(entry)).length, 1);
  assert.equal(discardIds(game.code).filter((id) => id === "peach-double-lethal").length, 1);
  assert.notEqual(finished.data.phase, "resolving");
  assert.equal(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`), "");
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
  const bobResponded = await request("decline_response", { code: rescuedGame.code, token: bob.token });
  assert.equal(bobResponded.status, 409);
  const chainFinished = await request("respond", { code: rescuedGame.code, token: carol.token, cardId: "attack-rescue-chain" });
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
  assert.equal(traitorVictory.data.room.status, "finished"); assert.equal(traitorVictory.data.room.phase, "finished"); assert.equal(traitorVictory.data.room.pending, null); assert.equal(traitorVictory.data.room.currentAction.actorId, null); assert.equal(traitorVictory.data.room.currentAction.kind, "none"); assert.ok(traitorVictory.data.room.timeline.some((event) => /Traitor victory/.test(event.message ?? "")));

  const rebelVictoryGame = await createHumanGame();
  const [fallenLordMember, falseTraitor] = rebelVictoryGame.members; const [fallenLord, attackingTraitor, survivingRebel, fallenLoyalist] = rebelVictoryGame.room.players;
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(fallenLord.id)}; UPDATE players SET role='Renegade' WHERE id=${quote(attackingTraitor.id)}; UPDATE players SET role='Rebel' WHERE id=${quote(survivingRebel.id)}; UPDATE players SET role='Loyalist',alive=0,hp=0,hand_json='[]' WHERE id=${quote(fallenLoyalist.id)}`);
  setHand(fallenLord.id, [], 1, 5); setHand(attackingTraitor.id, [card("Attack", "rebel-victory")], 4, 4); setHand(survivingRebel.id, [], 4, 4); setTurn(rebelVictoryGame.code, attackingTraitor.seat);
  await request("play_card", { code: rebelVictoryGame.code, token: falseTraitor.token, cardId: "attack-rebel-victory", targetId: fallenLord.id });
  const rebelVictory = await takeDamageIfPending(rebelVictoryGame.code, fallenLordMember.token);
  assert.equal(rebelVictory.data.room.status, "finished"); assert.ok(rebelVictory.data.room.timeline.some((event) => /Rebel victory/.test(event.message ?? "")));
});

test("Borrowed Sword forces a ranged Attack and transfers the Weapon on refusal", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const [source, holder, secondTarget] = game.room.players;
  const borrowed = card("BorrowedSword", "forced"); const weapon = card("GreenDragonBlade", "borrowed-weapon"); const attack = card("Attack", "borrowed-attack");
  setHand(source.id, [borrowed], 4, 5); setHand(holder.id, [attack], 4, 4); setHand(secondTarget.id, [], 4, 4); setEquipment(holder.id, { weapon }); setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.pendingBorrowedSword.stage, "choose_target");
  assert.equal(opened.data.room.currentAction.kind, "borrowed_sword"); assert.deepEqual(opened.data.room.currentAction.legalActions, ["choose_borrowed_sword_target"]); assert.equal(opened.data.room.currentAction.options, undefined);
  const chosen = await request("choose_borrowed_sword_target", { code: game.code, token: host.token, targetId: secondTarget.id });
  assert.equal(chosen.status, 200); assert.equal(chosen.data.room.pendingBorrowedSword.stage, "force_attack"); assert.equal(chosen.data.room.actionPlayerId, holder.id);
  const refused = await request("decline_response", { code: game.code, token: alice.token });
  assert.equal(refused.status, 200, JSON.stringify(refused.data)); assert.equal(refused.data.room.phase, "play"); assert.ok((await state(game.code, host.token)).data.myHand.some((item) => item.id === weapon.id));

  setHand(source.id, [borrowed], 4, 5); setHand(holder.id, [attack], 4, 4); setHand(secondTarget.id, [], 4, 4); setEquipment(holder.id, { weapon }); setTurn(game.code, source.seat);
  await request("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id });
  assert.equal((await request("choose_borrowed_sword_target", { code: game.code, token: host.token, targetId: secondTarget.id })).status, 200);
  const played = await request("respond", { code: game.code, token: alice.token, providerId: "card", cardId: attack.id });
  assert.equal(played.status, 200, JSON.stringify(played.data)); assert.equal(played.data.room.players.find((player) => player.id === secondTarget.id).hp, 3); assert.equal(played.data.room.players.find((player) => player.id === holder.id).equipmentCards[0].id, weapon.id);

  const spear = card("SerpentSpear", "borrowed-spear"); setHand(source.id, [borrowed], 4, 5); setHand(holder.id, [card("Peach", "spear-cost-one"), card("Dodge", "spear-cost-two")], 4, 4); setHand(secondTarget.id, [], 4, 4); setEquipment(holder.id, { weapon: spear }); setTurn(game.code, source.seat);
  await request("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id }); await request("choose_borrowed_sword_target", { code: game.code, token: host.token, targetId: secondTarget.id });
  const spearAttack = await request("respond", { code: game.code, token: alice.token, providerId: "serpent_spear_attack", cardIds: ["peach-spear-cost-one", "dodge-spear-cost-two"] });
  assert.equal(spearAttack.status, 200, JSON.stringify(spearAttack.data)); assert.equal(spearAttack.data.room.players.find((player) => player.id === secondTarget.id).hp, 3); assert.equal(spearAttack.data.room.players.find((player) => player.id === holder.id).equipmentCards[0].id, spear.id);
});

let borrowedScenarioCounter = 0;
async function openBorrowedSwordScenario({ attack = true, weaponKind = "GreenDragonBlade", choose = true } = {}) {
  const scenarioId = ++borrowedScenarioCounter;
  const game = await createHumanGame(); const [host, alice] = game.members;
  const [source, holder, target] = game.room.players;
  const borrowed = card("BorrowedSword", `borrowed-${scenarioId}`);
  const weapon = card(weaponKind, `weapon-${scenarioId}`);
  const attackCard = attack ? card("Attack", `attack-${scenarioId}`) : null;
  setHand(source.id, [borrowed], 4, 5); setHand(holder.id, attackCard ? [attackCard] : [], 4, 4); setHand(target.id, [], 4, 4); setEquipment(holder.id, { weapon }); setTurn(game.code, source.seat);
  assert.equal((await request("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id })).status, 200);
  const stage1 = (await state(game.code, host.token)).data;
  assert.equal(stage1.currentAction.actorId, source.id); assert.deepEqual(stage1.currentAction.legalActions, ["choose_borrowed_sword_target"]);
  if (choose) assert.equal((await request("choose_borrowed_sword_target", { code: game.code, token: host.token, targetId: target.id })).status, 200);
  return { game, host, alice, source, holder, target, weapon, attackId: attackCard?.id, stage1Revision: stage1.actionRevision };
}

test("Borrowed Sword canonical response ownership and CAS matrix", { timeout: 120_000 }, async () => {
  {
    const s = await openBorrowedSwordScenario(); const stage2 = (await state(s.game.code, s.alice.token)).data; const other = (await state(s.game.code, s.host.token)).data;
    assert.equal(stage2.currentAction.actorId, s.holder.id); assert.ok(stage2.currentAction.options.some((option) => option.providerId === "card")); assert.ok(stage2.currentAction.options[0].selection.eligibleCardIds.length);
    const armed = await request("start_response_timer", { code: s.game.code, token: s.alice.token }); assert.equal(armed.status, 200); assert.ok(armed.data.room.currentAction.deadline > Date.now()); const rearmed = await request("start_response_timer", { code: s.game.code, token: s.alice.token }); assert.equal(rearmed.data.room.currentAction.deadline, armed.data.room.currentAction.deadline);
    assert.equal(other.meId, s.source.id); assert.deepEqual(other.currentAction.legalActions, []); assert.equal(other.currentAction.options, undefined);
    const stale = await request("decline_response", { code: s.game.code, token: s.alice.token, context: { actionRevision: s.stage1Revision, meId: s.holder.id, phase: "response", pendingKind: "response", actorId: s.holder.id } });
    assert.equal(stale.status, 409); assert.equal(stale.data.stale, true);
    const wrongSeat = await request("decline_response", { code: s.game.code, token: s.host.token }); assert.equal(wrongSeat.status, 409);
    const unchanged = (await state(s.game.code, s.alice.token)).data; assert.equal(unchanged.currentAction.actorId, s.holder.id); assert.equal(unchanged.currentAction.kind, "response"); assert.ok(unchanged.currentAction.options[0].selection.eligibleCardIds.includes(s.attackId)); assert.ok(unchanged.players.find((player) => player.id === s.holder.id).equipmentCards.some((item) => item.id === s.weapon.id));
    const attackId = s.attackId;
    const [a, b] = await Promise.all([request("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: attackId }), request("decline_response", { code: s.game.code, token: s.alice.token })]);
    assert.equal([a.status, b.status].filter((status) => status === 200).length, 1); assert.equal([a.status, b.status].filter((status) => status === 409).length, 1);
  }
  {
    const s = await openBorrowedSwordScenario(); const attackId = s.attackId;
    const [a, b] = await Promise.all([request("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: attackId }), request("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: attackId })]);
    assert.equal([a.status, b.status].filter((status) => status === 200).length, 1); assert.equal([a.status, b.status].filter((status) => status === 409).length, 1); assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(s.holder.id)} AND json_extract(value,'$.id')=${quote(attackId)}`), "0");
  }
  {
    const s = await openBorrowedSwordScenario(); const [a, b] = await Promise.all([request("decline_response", { code: s.game.code, token: s.alice.token }), request("decline_response", { code: s.game.code, token: s.alice.token })]);
    assert.equal([a.status, b.status].filter((status) => status === 200).length, 1); assert.equal([a.status, b.status].filter((status) => status === 409).length, 1); assert.equal(discardIds(s.game.code).filter((id) => id === s.weapon.id).length, 0); assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(s.source.id)} AND json_extract(value,'$.id')=${quote(s.weapon.id)}`), "1");
  }
  {
    const s = await openBorrowedSwordScenario({ choose: false }); const [a, b] = await Promise.all([request("choose_borrowed_sword_target", { code: s.game.code, token: s.host.token, targetId: s.target.id }), request("choose_borrowed_sword_target", { code: s.game.code, token: s.host.token, targetId: s.target.id })]);
    assert.equal([a.status, b.status].filter((status) => status === 200).length, 1); assert.equal([a.status, b.status].filter((status) => status === 409).length, 1); assert.equal((await state(s.game.code, s.alice.token)).data.currentAction.actorId, s.holder.id);
  }
});

test("Borrowed Sword transfer never follows a stale or replaced Weapon", { timeout: 120_000 }, async () => {
  for (const replacement of [null, card("BlueSteelSword", "replacement")]) {
    const s = await openBorrowedSwordScenario(); setEquipment(s.holder.id, replacement ? { weapon: replacement } : {});
    const declined = await request("decline_response", { code: s.game.code, token: s.alice.token }); assert.equal(declined.status, 200); assert.equal(declined.data.room.phase, "play");
    assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(s.source.id)} AND json_extract(value,'$.id')=${quote(s.weapon.id)}`), "0");
    if (replacement) assert.equal(query(`SELECT json_extract(equipment_json,'$.weapon.id') FROM players WHERE id=${quote(s.holder.id)}`), replacement.id);
  }
  const noProvider = await openBorrowedSwordScenario({ attack: false, choose: false }); setEquipment(noProvider.holder.id, { weapon: card("BlueSteelSword", "unrelated") });
  const ended = await request("choose_borrowed_sword_target", { code: noProvider.game.code, token: noProvider.host.token, targetId: noProvider.target.id }); assert.equal(ended.status, 200, JSON.stringify(ended.data)); assert.equal(ended.data.room.phase, "play"); assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(noProvider.source.id)} AND json_extract(value,'$.id')=${quote(noProvider.weapon.id)}`), "0");

  const impossible = await createHumanGame(); const [impossibleHost] = impossible.members; const [impossibleSource, deadNear, impossibleHolder, deadFar] = impossible.room.players;
  const impossibleBorrowed = card("BorrowedSword", "borrowed-no-target");
  setHand(impossibleSource.id, [impossibleBorrowed], 4, 5); setHand(impossibleHolder.id, [], 4, 4); setEquipment(impossibleSource.id, { defensiveHorse: card("DefensiveHorse", "borrowed-out-of-range") }); setEquipment(impossibleHolder.id, { weapon: card("ZhugeCrossbow", "borrowed-range-one") });
  sql(`UPDATE players SET alive=0,hp=0,hand_json='[]',equipment_json='{}' WHERE id IN (${quote(deadNear.id)},${quote(deadFar.id)})`); setTurn(impossible.code, impossibleSource.seat);
  const rejected = await request("play_card", { code: impossible.code, token: impossibleHost.token, cardId: impossibleBorrowed.id, targetId: impossibleHolder.id });
  assert.equal(rejected.status, 409); assert.match(rejected.data.error, /no legal target/); assert.equal((await state(impossible.code, impossibleHost.token)).data.pendingBorrowedSword, null);
});

test("Borrowed Sword forced Attacks re-enter Dodge and attack-targeted continuations", { timeout: 60_000 }, async () => {
  {
    const s = await openBorrowedSwordScenario({ weaponKind: "YinYangSwords" });
    sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(s.holder.id)}`); sql(`UPDATE players SET hero='zhen-ji' WHERE id=${quote(s.target.id)}`);
    setHand(s.target.id, [], 4, 4);
    const attack = await request("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: s.attackId }); assert.equal(attack.status, 200, JSON.stringify(attack.data));
    const targetedPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(s.game.code)}`));
    assert.equal(targetedPending.continuation.declaration.origin, "borrowed_sword"); assert.equal(targetedPending.continuation.declaration.sourceId, s.holder.id); assert.equal(targetedPending.continuation.declaration.resumePlayerId, s.source.id);
    const targetDecision = (await state(s.game.code, s.game.members[2].token)).data;
    assert.deepEqual(targetDecision.currentAction.legalActions, ["trigger"]);
    assert.equal(targetDecision.currentAction.declineAction, undefined);
    assert.deepEqual(targetDecision.currentAction.triggerOptions[0], { effectId: "yin_yang_swords_attack_targeted", label: "Yin-Yang Swords", allowDecline: false, timeoutChoiceId: "draw", selection: { type: "choice", choices: [{ id: "draw", label: "Allow attacker to draw 1 card" }], eligibleHandKeys: [] } });
    assert.equal((await request("decline_trigger", { code: s.game.code, token: s.game.members[2].token })).status, 409);
    setDeck(s.game.code, [card("Peach", "yin-draw")]);
    const drawn = await request("trigger", { code: s.game.code, token: s.game.members[2].token, providerId: "yin_yang_swords_attack_targeted", choice: "draw" }); assert.equal(drawn.status, 200, JSON.stringify(drawn.data));
    assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(s.holder.id)}`)).length, 1, "the attacker draws one card");
    const holderView = (await state(s.game.code, s.alice.token)).data;
    assert.equal(holderView.timeline.find((event) => event.type === "card" && event.action === "draw" && !event.initialDeal)?.card.id, "peach-yin-draw", "the attacker receives a private draw presentation card");
    assert.equal((await state(s.game.code, s.game.members[2].token)).data.timeline.some((event) => event.type === "card" && event.action === "draw" && !event.initialDeal), false, "the private drawn card is not exposed to the target");
    assert.equal(drawn.data.room.phase, "play");
  }
  {
    const s = await openBorrowedSwordScenario({ weaponKind: "YinYangSwords" });
    sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(s.holder.id)}`); sql(`UPDATE players SET hero='zhen-ji' WHERE id=${quote(s.target.id)}`);
    const discarded = card("Peach", "yin-discard"); setHand(s.target.id, [discarded], 4, 4);
    const attack = await request("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: s.attackId }); assert.equal(attack.status, 200, JSON.stringify(attack.data));
    const targetDecision = (await state(s.game.code, s.game.members[2].token)).data;
    assert.deepEqual(targetDecision.currentAction.legalActions, ["trigger"]); assert.equal(targetDecision.currentAction.declineAction, undefined);
    const declined = await request("decline_trigger", { code: s.game.code, token: s.game.members[2].token }); assert.equal(declined.status, 409);
    const chosen = await request("trigger", { code: s.game.code, token: s.game.members[2].token, providerId: "yin_yang_swords_attack_targeted", choice: "discard", cardKeys: ["hand:0"] }); assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
    assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(s.target.id)}`)).some((item) => item.id === discarded.id), false, "the target loses the selected hand card");
    assert.equal(chosen.data.room.phase, "play");
  }
  const s = await openBorrowedSwordScenario({ weaponKind: "YinYangSwords" });
  sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(s.holder.id)}`); sql(`UPDATE players SET hero='zhen-ji' WHERE id=${quote(s.target.id)}`);
  const dodge = card("Dodge", "borrowed-dodge"); const hidden = card("Peach", "borrowed-hidden"); setHand(s.target.id, [hidden, dodge], 4, 4);
  const attack = await request("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: s.attackId }); assert.equal(attack.status, 200, JSON.stringify(attack.data));
  const targetDecision = (await state(s.game.code, s.game.members[2].token)).data; assert.equal(targetDecision.currentAction.kind, "trigger"); assert.equal(targetDecision.currentAction.actorId, s.target.id); const yin = await request("trigger", { code: s.game.code, token: s.game.members[2].token, providerId: "yin_yang_swords_attack_targeted", choice: "discard", cardKeys: ["hand:0"] }); assert.equal(yin.status, 200, JSON.stringify(yin.data) + ` pending=${query(`SELECT turn_seat||':'||pending_json FROM rooms WHERE code=${quote(s.game.code)}`)}`);
  const dodgePending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(s.game.code)}`)); assert.equal(dodgePending.continuation.origin, "borrowed_sword"); assert.equal(dodgePending.continuation.sourceId, s.holder.id); assert.equal(dodgePending.continuation.resumePlayerId, s.source.id);
  const dodgePrompt = await state(s.game.code, s.game.members[2].token); assert.equal(dodgePrompt.data.currentAction.kind, "response"); assert.equal(dodgePrompt.data.currentAction.actorId, s.target.id);
  const dodged = await request("respond", { code: s.game.code, token: s.game.members[2].token, providerId: "card", cardId: dodge.id }); assert.equal(dodged.status, 200, JSON.stringify(dodged.data)); assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(s.holder.id)} AND json_extract(value,'$.id')=${quote(s.attackId)}`), "0");

  const spearScenario = await openBorrowedSwordScenario({ attack: false, weaponKind: "SerpentSpear", choose: false });
  const spearCostA = card("Peach", "borrowed-spear-cost-a"); const spearCostB = card("Dodge", "borrowed-spear-cost-b"); const targetDodge = card("Dodge", "borrowed-spear-target-dodge");
  setHand(spearScenario.holder.id, [spearCostA, spearCostB], 4, 4); setHand(spearScenario.target.id, [targetDodge], 4, 4);
  assert.equal((await request("choose_borrowed_sword_target", { code: spearScenario.game.code, token: spearScenario.host.token, targetId: spearScenario.target.id })).status, 200);
  const spear = await request("respond", { code: spearScenario.game.code, token: spearScenario.alice.token, providerId: "serpent_spear_attack", cardIds: [spearCostA.id, spearCostB.id] }); assert.equal(spear.status, 200, JSON.stringify(spear.data));
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(spearScenario.holder.id)} AND (json_extract(value,'$.id')=${quote(spearCostA.id)} OR json_extract(value,'$.id')=${quote(spearCostB.id)})`), "0");
  const spearDodge = await request("respond", { code: spearScenario.game.code, token: spearScenario.game.members[2].token, providerId: "card", cardId: targetDodge.id }); assert.equal(spearDodge.status, 200, JSON.stringify(spearDodge.data));

  const frostScenario = await openBorrowedSwordScenario({ weaponKind: "FrostSword" });
  const frostTargetCard = card("Peach", "borrowed-frost-target"); const rescuePeach = card("Peach", "borrowed-frost-rescue");
  sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(frostScenario.target.id)}`);
  setHand(frostScenario.source.id, [rescuePeach], 4, 5); setHand(frostScenario.target.id, [frostTargetCard], 1, 4);
  const frostAttack = await request("respond", { code: frostScenario.game.code, token: frostScenario.alice.token, providerId: "card", cardId: frostScenario.attackId }); assert.equal(frostAttack.status, 200, JSON.stringify(frostAttack.data));
  const damagePending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(frostScenario.game.code)}`)); assert.equal(damagePending.continuation.origin, "borrowed_sword"); assert.equal(damagePending.continuation.sourceId, frostScenario.holder.id); assert.equal(damagePending.continuation.resumePlayerId, frostScenario.source.id);
  const frostDeclined = await request("decline_trigger", { code: frostScenario.game.code, token: frostScenario.alice.token }); assert.equal(frostDeclined.status, 200, JSON.stringify(frostDeclined.data));
  const dyingPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(frostScenario.game.code)}`)); assert.equal(dyingPending.kind, "dying"); assert.equal(dyingPending.origin, "borrowed_sword"); assert.equal(dyingPending.resumePlayerId, frostScenario.source.id); assert.equal(frostDeclined.data.room.pendingDying.origin, "borrowed_sword");

  const longdanScenario = await openBorrowedSwordScenario({ attack: false, choose: false });
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(longdanScenario.holder.id)}`);
  const longdanBorrowedDodge = card("Dodge", "borrowed-longdan-dodge");
  setHand(longdanScenario.holder.id, [longdanBorrowedDodge], 4, 4); setHand(longdanScenario.target.id, [], 4, 4);
  assert.equal((await request("choose_borrowed_sword_target", { code: longdanScenario.game.code, token: longdanScenario.host.token, targetId: longdanScenario.target.id })).status, 200);
  const borrowedDecision = await state(longdanScenario.game.code, longdanScenario.alice.token);
  assert.equal(borrowedDecision.data.currentAction.options.find((option) => option.providerId === "zhao_yun_dodge_as_attack")?.playedAs, "attack");
  const borrowedLongdan = await request("respond", { code: longdanScenario.game.code, token: longdanScenario.alice.token, providerId: "zhao_yun_dodge_as_attack", cardId: longdanBorrowedDodge.id });
  assert.equal(borrowedLongdan.status, 200, JSON.stringify(borrowedLongdan.data));
  assert.equal(borrowedLongdan.data.room.timeline.find((event) => event.type === "card" && event.card.id === longdanBorrowedDodge.id)?.playedAs, "attack");
});
