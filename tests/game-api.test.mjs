import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { normalizeRoomData } from "../game/room-safety.js";

const baseUrl = process.env.GAME_TEST_URL ?? "http://localhost:3137";
const d1Directory = new URL("../.wrangler/test-state/v3/d1/miniflare-D1DatabaseObject/", import.meta.url);
const membersByCode = new Map();

async function drainEmptyPrivateDecisions(code, fallbackToken) {
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

async function request(action, values = {}) {
  const preserveResponse = Boolean(values.preserveResponse);
  if (preserveResponse) { values = { ...values }; delete values.preserveResponse; }
  // The browser explicitly passes zero-option semantic responses and empty
  // Peach rescue decisions. Older scenario tests often submit the next
  // domain action directly, so mirror that client behavior here without
  // skipping any private option that the acting player could actually use.
  if (values.code && !preserveResponse && !["respond", "decline_response", "trigger", "decline_trigger", "skip_rescue", "start_response_timer", "start_rescue_timer", "advance_timers"].includes(action)) await drainEmptyPrivateDecisions(values.code, values.token);
  const handBeforeAction = values.code && values.token && ["play_card", "draw"].includes(action)
    ? ((await state(values.code, values.token)).data.myHand ?? [])
    : null;
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
      try {
        const result = { status: response.status, data: JSON.parse(text) };
        if (values.code && !preserveResponse && !["start_response_timer", "start_rescue_timer", "advance_timers"].includes(action)) {
          await drainEmptyPrivateDecisions(values.code, values.token);
          const refreshed = await state(values.code, values.token);
          result.data = { ...result.data, room: refreshed.data };
          if (result.data.drawnCards === undefined && handBeforeAction && Array.isArray(refreshed.data.myHand)) {
            const beforeIds = new Set(handBeforeAction.map((card) => card.id));
            const drawnCards = refreshed.data.myHand.filter((card) => !beforeIds.has(card.id));
            if (drawnCards.length) result.data.drawnCards = drawnCards;
          }
        }
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
function roomCardCount(roomCode, cardId) {
  const roomZones = query(`SELECT deck_json || char(10) || discard_json FROM rooms WHERE code=${quote(roomCode)}`).split("\n").filter(Boolean);
  const playerHands = query(`SELECT hand_json FROM players WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(roomCode)})`).split("\n").filter(Boolean);
  return [...roomZones, ...playerHands].reduce((count, json) => count + JSON.parse(json || "[]").filter((item) => item.id === cardId).length, 0);
}
async function markReady(code, members) {
  for (const member of members) {
    const result = await request("set_ready", { code, token: member.token, ready: true });
    assert.equal(result.status, 200, JSON.stringify(result.data));
  }
}

async function passNegationWindows(code, members) {
  for (let guard = 0; guard < 40; guard++) {
    let passed = false;
    for (const member of members) {
      const view = (await state(code, member.token)).data;
      if (view.isMyAction && view.currentAction?.kind === "response" && view.currentAction.requirement === "negate" && view.currentAction.legalActions?.includes("decline_response")) {
        const declined = await request("decline_response", { code, token: member.token, preserveResponse: true });
        assert.equal(declined.status, 200, JSON.stringify(declined.data));
        passed = true;
        break;
      }
    }
    if (!passed) return;
  }
  assert.fail("Negation windows did not settle");
}

async function createTestLobby() {
  const created = await request("create", { name: "Host" });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const code = created.data.room.code;
  const added = await request("add_test_players", { code, token: created.data.token, name: "Host" });
  assert.equal(added.status, 200, JSON.stringify(added.data));
  assert.equal(added.data.room.players.length, 4);
  assert.deepEqual(added.data.room.players.map((player) => player.name), ["Host", "Test Player 2", "Test Player 3", "Test Player 4"]);
  assert.ok(added.data.room.players.slice(1).every((player) => player.ready), "generated test seats are ready immediately");
  const ready = await request("set_ready", { code, token: created.data.token, name: "Host", ready: true });
  assert.equal(ready.status, 200, JSON.stringify(ready.data));
  const started = await request("start", { code, token: created.data.token, name: "Host" });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  membersByCode.set(code, [{ token: created.data.token }]);
  return { ...created, data: { ...created.data, room: started.data.room } };
}

async function createTestGame() {
  const created = await createTestLobby();
  let room = created.data.room;
  while (room.status === "heroes") {
    const actor = room.players.find((player) => player.id === room.meId);
    assert.ok(actor, "host test session projects the next controlled seat");
    const chosen = room.myHeroOptions[0];
    assert.ok(chosen, `host test session exposes a selectable hero for ${actor.name}`);
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
  await markReady(code, members);
  membersByCode.set(code, members);
  const started = await request("start", { code, token: created.data.token, name: "Host" });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const views = await Promise.all(members.map((member) => state(code, member.token)));
  return { code, members, views: views.map((view) => view.data) };
}

test("host test seats use one controller across four seats with a normal shuffled opening deal", async () => {
  const created = await createTestLobby();
  assert.equal(created.data.room.status, "heroes");
  assert.equal(created.data.room.isTestController, true);
  assert.equal(created.data.room.players.length, 4);
  assert.equal(created.data.room.myHeroOptions.length, 5);
  assert.equal(created.data.room.myHeroOptions.some((hero) => hero.id === "yu-jin"), false);
  assert.deepEqual(created.data.room.myHeroOptions.find((hero) => hero.id === "cao-cao").skills.map((skill) => skill.name), ["Treachery", "Entourage"]);
  const lordId = created.data.room.meId;
  const storedOptions = query(`SELECT hero_options_json FROM players WHERE id=${quote(lordId)}`);
  const staleOptions = JSON.parse(storedOptions).map((hero) => ({ ...hero, name: "Old name", skills: [{ name: "Old skill", description: "Old description" }] }));
  sql(`UPDATE players SET hero_options_json=${quote(JSON.stringify(staleOptions))} WHERE id=${quote(lordId)}`);
  const refreshedOptions = (await state(created.data.room.code, created.data.token)).data.myHeroOptions;
  const refreshedCao = refreshedOptions.find((hero) => hero.id === "cao-cao");
  assert.deepEqual(refreshedCao?.skills.map((skill) => skill.name), ["Treachery", "Entourage"], "persisted hero candidates rehydrate current skill names");
  assert.match(refreshedCao?.skills[1].description ?? "", /characters from the Wei kingdom/);
  sql(`UPDATE players SET hero_options_json=${quote(storedOptions)} WHERE id=${quote(lordId)}`);
  assert.equal(created.data.room.players.filter((player) => player.role === "Lord").length, 1);
  assert.equal(created.data.room.players.filter((player) => player.role === null).length, 3);
  let room = created.data.room;
  const lord = room.players.find((player) => player.role === "Lord");
  assert.equal(room.meId, lord.id, "the host test session starts on the Lord seat");
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
  assert.equal(quickInitialDraws.length, 4, "the host test session projects the current seat's four-card opening deal as private draws");
  assert.equal(room.timeline.filter((event) => event.type === "card" && event.initialDeal && event.drawPlayerId !== room.meId).length, 0, "the host test session does not expose another seat's opening hand");
  const allOpeningIds = [...openingHands.flat(), ...deck].map((card) => card.id);
  assert.equal(new Set(allOpeningIds).size, 108, "host test flow preserves the shuffled physical deck without special-card duplication");

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

async function prepareGuoJudgement({ original, replacement = null, purposeCard = null }) {
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

test("Guo Jia Jealousy of God waits for the final Judgment card and handles Necromancy", { timeout: 30_000 }, async () => {
  const original = { ...card("Dodge", "guo-original"), suit: "♠", rank: "7" };
  const replacement = { ...card("Peach", "guo-replacement"), suit: "♥", rank: "Q" };
  const accepted = await prepareGuoJudgement({ original, replacement });
  const opened = await request("draw", { code: accepted.game.code, token: accepted.guoMember.token, preserveResponse: true });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  await passNegationWindows(accepted.game.code, accepted.game.members);
  const revealed = await waitForState(accepted.game.code, accepted.guoMember.token, (room) => room.currentAction?.kind === "trigger" && room.currentAction.triggerEvent === "judgement_revealed");
  assert.equal(revealed.currentAction.triggerOptions.length, 0, "Guo Jia is not offered before Necromancy finishes");
  const replaced = await request("trigger", { code: accepted.game.code, token: accepted.simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
  const reloaded = await waitForState(accepted.game.code, accepted.guoMember.token, (room) => room.currentAction?.kind === "trigger" && room.currentAction.triggerEvent === "judgement_effective");
  assert.equal(reloaded.currentAction.triggerEvent, "judgement_effective");
  assert.deepEqual(reloaded.currentAction.triggerOptions.map((option) => option.label), ["Jealousy of God"]);
  assert.deepEqual((await state(accepted.game.code, accepted.simaMember.token)).data.currentAction.triggerOptions ?? [], [], "the private Jealousy choice belongs only to Guo Jia");
  const acceptedResult = await request("trigger", { code: accepted.game.code, token: accepted.guoMember.token, providerId: "guo_jia_jealousy_of_god" });
  assert.equal(acceptedResult.status, 200, JSON.stringify(acceptedResult.data));
  assert.ok(acceptedResult.data.room.myHand.some((held) => held.id === replacement.id), "the replacement Judgment card enters Guo Jia's hand");
  assert.equal(roomCardCount(accepted.game.code, original.id), 1, "the original revealed card remains exactly once after normal discard/reshuffle processing");
  assert.equal(roomCardCount(accepted.game.code, replacement.id), 1, "the obtained replacement remains exactly once");
  assert.equal(JSON.parse(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(accepted.sima.id)} AND json_extract(value,'$.id')=${quote(replacement.id)}`)), 0, "Necromancy removes the replacement from Sima Yi");
  assert.equal((await request("trigger", { code: accepted.game.code, token: accepted.guoMember.token, providerId: "guo_jia_jealousy_of_god" })).status, 409, "stale Jealousy cannot obtain the card twice");

  const declinedOriginal = { ...original, id: "guo-decline-original" };
  const declined = await prepareGuoJudgement({ original: declinedOriginal, purposeCard: card("Overindulgence", "guo-decline-delayed", "♠") });
  const declineOpened = await request("draw", { code: declined.game.code, token: declined.guoMember.token, preserveResponse: true });
  assert.equal(declineOpened.status, 200);
  await passNegationWindows(declined.game.code, declined.game.members);
  await waitForState(declined.game.code, declined.guoMember.token, (room) => room.currentAction?.kind === "trigger" && room.currentAction.triggerEvent === "judgement_effective");
  const declinedResult = await request("decline_trigger", { code: declined.game.code, token: declined.guoMember.token });
  assert.equal(declinedResult.status, 200, JSON.stringify(declinedResult.data));
  assert.equal(roomCardCount(declined.game.code, declinedOriginal.id), 1, "a declined final Judgment card follows the normal discard/reshuffle destination");
});

async function openGuoDamage({ amount = 1, deckCards = [] } = {}) {
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
  const played = await request("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: guo.id, preserveResponse: true });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  if (played.data.room.currentAction?.kind === "response") {
    const declined = await request("decline_response", { code: game.code, token: guoMember.token });
    assert.equal(declined.status, 200, JSON.stringify(declined.data));
  }
  const guoView = (await state(game.code, guoMember.token)).data;
  assert.equal(guoView.currentAction.kind, "trigger", JSON.stringify(guoView));
  assert.equal(guoView.currentAction.triggerEvent, "damage_suffered");
  return { game, source, guo, sourceMember, guoMember };
}

async function distributeLegacy(opened, recipientId) {
  const view = (await state(opened.game.code, opened.guoMember.token)).data;
  const cards = view.currentAction.distribution.cards;
  assert.equal(cards.length, 2);
  const submitted = await request("trigger", { code: opened.game.code, token: opened.guoMember.token, providerId: "private_card_distribution", assignments: cards.map((held) => ({ cardId: held.id, recipientId })) });
  assert.equal(submitted.status, 200, JSON.stringify(submitted.data));
  return { cards, room: submitted.data.room };
}

test("Legacy privately distributes top two cards and repeats once per damage point", { timeout: 30_000 }, async () => {
  const firstCards = [card("Peach", "legacy-one-a"), card("Dodge", "legacy-one-b"), card("Attack", "legacy-spare")];
  const one = await openGuoDamage({ deckCards: firstCards });
  const privateView = (await state(one.game.code, one.guoMember.token)).data;
  const otherView = (await state(one.game.code, one.game.members[2].token)).data;
  assert.equal(privateView.currentAction.kind, "trigger");
  const accepted = await request("trigger", { code: one.game.code, token: one.guoMember.token, providerId: "guo_jia_legacy" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const held = (await state(one.game.code, one.guoMember.token)).data;
  const hidden = (await state(one.game.code, one.game.members[2].token)).data;
  assert.equal(held.currentAction.kind, "card_distribution");
  assert.deepEqual(held.currentAction.distribution.cards.map((card) => card.id), [firstCards[0].id, firstCards[1].id]);
  assert.equal(hidden.currentAction.distribution, undefined, "other seats cannot inspect Legacy's held cards");
  assert.equal(JSON.stringify(hidden.currentAction).includes(firstCards[0].id), false);
  const settled = await distributeLegacy(one, one.guo.id);
  assert.deepEqual(settled.room.players.find((player) => player.id === one.guo.id).handCount, 2);
  assert.equal(settled.room.players.find((player) => player.id === one.guo.id).hp, 3);
  assert.equal((await request("trigger", { code: one.game.code, token: one.guoMember.token, providerId: "private_card_distribution", assignments: [] })).status, 409, "stale distribution cannot replay cards");
  assert.ok(privateView.currentAction.triggerOptions.every((option) => option.effectId === "guo_jia_legacy"));
  void otherView;

  const two = await openGuoDamage({ amount: 2, deckCards: [card("Peach", "legacy-two-a"), card("Dodge", "legacy-two-b"), card("Attack", "legacy-two-c"), card("Peach", "legacy-two-d"), card("Attack", "legacy-two-spare")] });
  assert.equal((await state(two.game.code, two.guoMember.token)).data.players.find((player) => player.id === two.guo.id).hp, 2, "Bared Bodied applies one 2-damage event");
  const firstTrigger = await request("trigger", { code: two.game.code, token: two.guoMember.token, providerId: "guo_jia_legacy" });
  assert.equal(firstTrigger.status, 200, JSON.stringify(firstTrigger.data));
  const firstDistribution = await distributeLegacy(two, two.guo.id);
  assert.equal(firstDistribution.room.players.find((player) => player.id === two.guo.id).handCount, 2);
  const secondTriggerView = (await state(two.game.code, two.guoMember.token)).data;
  assert.equal(secondTriggerView.currentAction.kind, "trigger", "a 2-damage event opens a second independent Legacy opportunity");
  assert.ok(secondTriggerView.currentAction.triggerOptions.some((option) => option.effectId === "guo_jia_legacy"));
  await request("trigger", { code: two.game.code, token: two.guoMember.token, providerId: "guo_jia_legacy" });
  const secondDistribution = await distributeLegacy(two, two.guo.id);
  assert.equal(secondDistribution.room.players.find((player) => player.id === two.guo.id).handCount, 4);
  assert.equal(secondDistribution.room.players.find((player) => player.id === two.guo.id).hp, 2, "Bared Bodied keeps one 2-damage event while Legacy repeats twice");
  const totalHeld = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(two.guo.id)}`));
  assert.deepEqual(totalHeld.map((held) => held.id), ["peach-legacy-two-a", "dodge-legacy-two-b", "attack-legacy-two-c", "peach-legacy-two-d"]);
});

test("source-less Lightning damage can open three independent Legacy opportunities", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, guo] = game.room.players;
  const guoMember = game.members[1];
  sql(`UPDATE players SET hero='guo-jia', hp=4, max_hp=4 WHERE id=${quote(guo.id)}`);
  for (const player of game.room.players) setHand(player.id, [], 4, 4);
  const lightning = { ...card("Lightning", "guo-lightning"), suit: "♠", rank: "5" };
  setJudgement(guo.id, [lightning]);
  const legacyCards = [card("Peach", "guo-lightning-a"), card("Dodge", "guo-lightning-b"), card("Attack", "guo-lightning-c"), card("Peach", "guo-lightning-d"), card("Attack", "guo-lightning-e"), card("Dodge", "guo-lightning-f")];
  setDeck(game.code, [{ ...card("Attack", "guo-lightning-judge"), suit: "♠", rank: "6" }, ...legacyCards]);
  setTurn(game.code, guo.seat, "draw");
  const started = await request("draw", { code: game.code, token: guoMember.token, preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  await passNegationWindows(game.code, game.members);
  let view = (await state(game.code, guoMember.token)).data;
  if (view.currentAction.triggerEvent === "judgement_effective") {
    const declinedJudgement = await request("decline_trigger", { code: game.code, token: guoMember.token });
    assert.equal(declinedJudgement.status, 200, JSON.stringify(declinedJudgement.data));
    view = (await state(game.code, guoMember.token)).data;
  }
  for (let index = 0; index < 3; index++) {
    assert.equal(view.currentAction.kind, "trigger", JSON.stringify(view));
    assert.equal(view.currentAction.triggerEvent, "damage_suffered");
    await request("trigger", { code: game.code, token: guoMember.token, providerId: "guo_jia_legacy" });
    await distributeLegacy({ game: { code: game.code }, guoMember }, guo.id);
    view = (await state(game.code, guoMember.token)).data;
  }
  assert.equal(view.players.find((player) => player.id === guo.id).hp, 1);
  const lightningHand = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(guo.id)}`));
  assert.ok(legacyCards.every((card) => lightningHand.some((held) => held.id === card.id)), "all three Legacy resolutions transfer their own next two cards");
  void source;
});

test("normal multiplayer lobby requires named ready players and keeps roles private", async () => {
  const created = await request("create", { name: "Host" });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.room.status, "lobby");
  assert.equal(created.data.room.players[0].seat, 0);
  assert.equal(created.data.room.players[0].isHost, true);
  assert.equal(created.data.room.players[0].ready, false);
  assert.equal(created.data.room.players[0].role, null);
  assert.equal(query(`SELECT ready FROM players WHERE id=${quote(created.data.room.meId)}`), "0");

  const members = [{ name: "Host", token: created.data.token }];
  for (const name of ["Alice", "Bob"]) {
    const joined = await request("join", { code: created.data.room.code, name });
    assert.equal(joined.status, 201, JSON.stringify(joined.data));
    members.push({ name, token: joined.data.token });
  }
  assert.deepEqual((await state(created.data.room.code, created.data.token)).data.players.map((player) => player.seat), [0, 1, 2]);
  assert.equal((await request("start", { code: created.data.room.code, token: created.data.token })).status, 409, "a host cannot start below four players");
  assert.equal((await request("set_ready", { code: created.data.room.code, token: members[0].token, ready: true })).status, 200);
  assert.equal((await request("start", { code: created.data.room.code, token: members[0].token })).status, 409, "all current players must be ready");

  const fourth = await request("join", { code: created.data.room.code, name: "Carol" });
  assert.equal(fourth.status, 201);
  assert.equal(fourth.data.room.players.find((player) => player.name === "Carol").ready, false, "a joining seat never inherits another player's readiness");
  members.push({ name: "Carol", token: fourth.data.token });
  for (const member of members.slice(1)) {
    const ready = await request("set_ready", { code: created.data.room.code, token: member.token, ready: true });
    assert.equal(ready.status, 200, JSON.stringify(ready.data));
  }
  assert.equal((await request("start", { code: created.data.room.code, token: members[1].token })).status, 403, "only the host can start");
  const started = await request("start", { code: created.data.room.code, token: members[0].token });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  assert.equal(started.data.room.status, "heroes");
  assert.equal((await request("join", { code: created.data.room.code, name: "Late" })).status, 409, "joining closes when the lobby ends");
  assert.equal((await request("start", { code: created.data.room.code, token: members[0].token })).status, 409, "a stale start cannot reset hero selection");

  const lobbyViews = await Promise.all(members.map((member) => state(created.data.room.code, member.token)));
  for (const viewResponse of lobbyViews) {
    const view = viewResponse.data;
    assert.equal(view.players.filter((player) => player.role === "Lord").length, 1);
    const visibleRoles = view.players.filter((player) => player.role !== null);
    assert.equal(visibleRoles.length, view.myRole === "Lord" ? 1 : 2, "only the Lord and the viewer's own role are visible after allocation");
    assert.equal(view.players.find((player) => player.id === view.meId).role, view.myRole, "the viewer sees their own role");
    assert.ok(view.players.filter((player) => player.id !== view.meId && player.role !== null).every((player) => player.role === "Lord"));
  }
});

test("host test seats remain controllable without exposing a mixed human seat", async () => {
  const created = await request("create", { name: "Host" });
  assert.equal(created.status, 201);
  const code = created.data.room.code;
  const joined = await request("join", { code, name: "Alice" });
  assert.equal(joined.status, 201);
  const added = await request("add_test_players", { code, token: created.data.token, name: "Host" });
  assert.equal(added.status, 200, JSON.stringify(added.data));
  assert.equal(added.data.room.players.length, 4);
  assert.deepEqual(added.data.room.players.map((player) => player.name), ["Host", "Alice", "Test Player 3", "Test Player 4"]);
  assert.equal(added.data.room.isTestController, true);
  assert.ok(added.data.room.players.slice(2).every((player) => player.ready));
  await markReady(code, [{ name: "Host", token: created.data.token }, { name: "Alice", token: joined.data.token }]);
  const started = await request("start", { code, token: created.data.token, name: "Host" });
  assert.equal(started.status, 200, JSON.stringify(started.data));

  const hostId = added.data.room.players.find((player) => player.name === "Host").id;
  const aliceId = added.data.room.players.find((player) => player.name === "Alice").id;
  const controlledIds = new Set(added.data.room.players.filter((player) => player.id !== aliceId).map((player) => player.id));
  let room = started.data.room;
  const selectedIds = new Set();
  while (room.status === "heroes") {
    const actorId = room.actionPlayerId;
    const actor = room.players.find((player) => player.id === actorId);
    assert.ok(actor, "hero selection always has an authoritative actor");
    const actorToken = controlledIds.has(actor.id) ? created.data.token : joined.data.token;
    const actorView = (await state(code, actorToken)).data;
    assert.equal(actorView.meId, actor.id);
    assert.equal(actorView.isMyAction, true);
    const chosen = actorView.myHeroOptions[0];
    assert.ok(chosen, `the acting ${actor.name} seat has private hero options`);
    if (actor.id === aliceId) {
      const hostView = (await state(code, created.data.token)).data;
      assert.equal(hostView.meId, hostId, "the host token falls back to its own seat for Alice's decision");
      assert.equal(hostView.isMyAction, false);
      assert.equal(hostView.players.find((player) => player.id === aliceId).hero, null, "Alice's hero stays private from the host");
      assert.deepEqual(hostView.myHand, [], "the host view never switches to Alice's private hand");
    }
    const result = await request("choose_hero", { code, token: actorToken, heroId: chosen.id });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    selectedIds.add(actor.id);
    room = result.data.room;
  }
  assert.equal(room.status, "playing");
  for (const id of controlledIds) assert.ok(selectedIds.has(id), "the shared host controller selected every host-owned test seat");
  const generated = room.players.find((player) => controlledIds.has(player.id) && player.id !== hostId);
  assert.ok(generated, "the mixed room has a generated seat owned by the host token");
  setTurn(code, generated.seat, "play");
  const generatedView = (await state(code, created.data.token)).data;
  assert.equal(generatedView.meId, generated.id, "the host token can control its generated seat during gameplay");
  assert.equal(generatedView.isMyTurn, true);
  setTurn(code, room.players.find((player) => player.id === aliceId).seat, "play");
  const aliceTurnHostView = (await state(code, created.data.token)).data;
  assert.equal(aliceTurnHostView.meId, hostId, "the host token does not switch to Alice during gameplay");
  assert.equal(aliceTurnHostView.isMyTurn, false);
});

test("normal role allocation preserves the exact Standard sets for four through eight players", async () => {
  const expected = {
    4: { Lord: 1, Loyalist: 1, Rebel: 1, Spy: 1 },
    5: { Lord: 1, Loyalist: 1, Rebel: 2, Spy: 1 },
    6: { Lord: 1, Loyalist: 1, Rebel: 3, Spy: 1 },
    7: { Lord: 1, Loyalist: 2, Rebel: 3, Spy: 1 },
    8: { Lord: 1, Loyalist: 2, Rebel: 4, Spy: 1 },
  };
  let hostWasNotLord = false;
  for (const count of [4, 5, 6, 7, 8]) {
    const created = await request("create", { name: `Host${count}` });
    assert.equal(created.status, 201);
    const members = [{ name: `Host${count}`, token: created.data.token }];
    for (let seat = 1; seat < count; seat++) {
      const joined = await request("join", { code: created.data.room.code, name: `Player${count}-${seat}` });
      assert.equal(joined.status, 201);
      members.push({ name: `Player${count}-${seat}`, token: joined.data.token });
    }
    if (count === 8) assert.equal((await request("join", { code: created.data.room.code, name: "TooMany" })).status, 409, "room maximum remains eight");
    await markReady(created.data.room.code, members);
    const started = await request("start", { code: created.data.room.code, token: members[0].token });
    assert.equal(started.status, 200, JSON.stringify(started.data));
    const views = await Promise.all(members.map((member) => state(created.data.room.code, member.token)));
    const counts = Object.fromEntries(["Lord", "Loyalist", "Rebel", "Spy"].map((role) => [role, 0]));
    for (const viewResponse of views) counts[viewResponse.data.myRole] += 1;
    assert.deepEqual(counts, expected[count]);
    for (const viewResponse of views) {
      const view = viewResponse.data;
      assert.equal(view.players.filter((player) => player.role === "Lord").length, 1);
      assert.equal(view.players.filter((player) => player.role !== null).length, view.myRole === "Lord" ? 1 : 2);
      assert.equal(view.players.find((player) => player.id === view.meId).role, view.myRole);
    }
    if (views[0].data.myRole !== "Lord") hostWasNotLord = true;
  }
  assert.equal(hostWasNotLord, true, "the host is not forced to be Lord");
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

test("Qixi follows the normalized browser selection contract in multiplayer and host test flow", async () => {
  async function exercise(game, token, label) {
    const source = game.room.players[0]; const target = game.room.players[1];
    const material = card("BorrowedSword", `qixi-browser-${label}`, "♣"); const targetCard = card("Peach", `qixi-browser-target-${label}`);
    sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(source.id)}`); setHand(source.id, [material], 4, 4); setHand(target.id, [targetCard], 4, 4); setTurn(game.room.code, source.seat);
    const raw = await state(game.room.code, token); const client = normalizeRoomData(raw.data); assert.ok(client, `${label} client state normalizes`);
    const option = client.currentAction?.triggerOptions?.find((candidate) => candidate.effectId === "gan_ning_qixi");
    assert.ok(option, `${label} currentAction contains Gan Ning Qixi`);
    assert.equal(option.selection?.type, "cards");
    assert.ok(option.selection?.eligibleCardIds.includes(material.id), `${label} exposes K♣ Borrowed Sword as eligible material`);
    assert.ok(option.selection?.targetIds?.includes(target.id), `${label} exposes the card-holding target`);
    const cardIds = client.myHand.filter((held) => option.selection?.type === "cards" && option.selection.eligibleCardIds.includes(held.id)).map((held) => held.id).slice(0, 1);
    const targetIds = option.selection?.type === "cards" ? option.selection.targetIds : [];
    assert.deepEqual(cardIds, [material.id], `${label} client selection submits exactly one card`);
    assert.ok(targetIds.includes(target.id), `${label} client selection includes targetId`);
    const context = { actionRevision: client.actionRevision, meId: client.meId, phase: client.phase, pendingKind: client.pending?.kind ?? null, actorId: client.actionPlayerId };
    assert.equal(option.effectId, "gan_ning_qixi");
    assert.equal(context.meId, source.id); assert.equal(context.phase, "play"); assert.equal(context.pendingKind, null); assert.equal(context.actorId, source.id);
    const posted = await request("trigger", { code: game.room.code, token, providerId: option.effectId, cardIds, targetId: target.id, context });
    assert.equal(posted.status, 200, `${label} Qixi POST: ${JSON.stringify(posted.data)}`);
    assert.equal(posted.data.room.phase, "response");
    assert.ok(posted.data.room.pendingTargetCard?.cardKind === "Dismantle" || posted.data.room.currentAction?.requirement === "negate", `${label} enters the shared Burning Bridges continuation`);
    const duplicate = await request("trigger", { code: game.room.code, token, providerId: option.effectId, cardIds, targetId: target.id, context });
    assert.equal(duplicate.status, 409, `${label} duplicate Qixi submission is stale-safe`);
    assert.notEqual((await state(game.room.code, token)).data.phase, "resolving", `${label} duplicate rejection never strands the room in resolving`);
  }

  const multiplayer = await createHumanGame();
  await exercise(multiplayer, multiplayer.members[0].token, "multiplayer");
  const quick = await createTestGame();
  await exercise(quick.data, quick.data.token, "host-test");
});

test("Qixi projects only living targets with affectable cards and keeps material in hand-only scope", async () => {
  for (const [zone, install] of [["hand", (player, value) => setHand(player.id, [value], 4, 4)], ["equipment", (player, value) => setEquipment(player.id, { weapon: value })], ["judgement", (player, value) => setJudgement(player.id, [value])]]) {
    const game = await createHumanGame(); const source = game.room.players[0]; const target = game.room.players[1];
    const material = card("Peach", `qixi-${zone}-material`, "♠"); const targetCard = card("Peach", `qixi-${zone}-target`);
    sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(source.id)}`); setHand(source.id, [material], 4, 4); setHand(target.id, [], 4, 4); install(target, targetCard); setTurn(game.code, source.seat);
    const view = (await state(game.code, game.members[0].token)).data; const option = view.currentAction.triggerOptions.find((candidate) => candidate.effectId === "gan_ning_qixi");
    assert.ok(option.selection.targetIds.includes(target.id), `${zone}-only target is eligible`); assert.ok(!option.selection.targetIds.includes(source.id), "self is never eligible");
  }

  const cardless = await createHumanGame(); const source = cardless.room.players[0]; const target = cardless.room.players[1]; const material = card("Peach", "qixi-cardless-material", "♣");
  sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(source.id)}`); setHand(source.id, [material], 4, 4); setHand(target.id, [], 4, 4); setTurn(cardless.code, source.seat);
  const cardlessView = (await state(cardless.code, cardless.members[0].token)).data; const cardlessOption = cardlessView.currentAction.triggerOptions.find((candidate) => candidate.effectId === "gan_ning_qixi");
  assert.ok(!cardlessOption.selection.targetIds.includes(target.id), "a completely cardless target is not projected");
  const rejected = await request("trigger", { code: cardless.code, token: cardless.members[0].token, providerId: "gan_ning_qixi", cardIds: [material.id], targetId: target.id });
  assert.equal(rejected.status, 409); assert.equal((await state(cardless.code, cardless.members[0].token)).data.phase, "play");

  const red = await createHumanGame(); const redSource = red.room.players[0]; const redTarget = red.room.players[1];
  const redCard = card("Peach", "qixi-red-material", "♦"); sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(redSource.id)}`); setHand(redSource.id, [redCard], 4, 4); setHand(redTarget.id, [card("Peach", "qixi-red-target")], 4, 4); setTurn(red.code, redSource.seat);
  assert.equal((await state(red.code, red.members[0].token)).data.currentAction.triggerOptions?.some((candidate) => candidate.effectId === "gan_ning_qixi") ?? false, false, "red material is not eligible");

  const equippedMaterial = await createHumanGame(); const equippedSource = equippedMaterial.room.players[0]; const equippedTarget = equippedMaterial.room.players[1]; const equipment = card("BorrowedSword", "qixi-equipment-zone", "♣");
  sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(equippedSource.id)}`); setHand(equippedSource.id, [], 4, 4); setEquipment(equippedSource.id, { weapon: equipment }); setHand(equippedTarget.id, [card("Peach", "qixi-equipment-target")], 4, 4); setTurn(equippedMaterial.code, equippedSource.seat);
  assert.equal((await state(equippedMaterial.code, equippedMaterial.members[0].token)).data.currentAction.triggerOptions?.some((candidate) => candidate.effectId === "gan_ning_qixi") ?? false, false, "equipment already equipped cannot be Qixi material");
});

test("Qixi uses the ordinary Burning Bridges Negation and target-card continuations", async () => {
  const game = await createHumanGame(); const source = game.room.players[0]; const target = game.room.players[1]; const material = card("BorrowedSword", "qixi-negation-material", "♣"); const negation = card("Negation", "qixi-negation"); const targetCard = card("Peach", "qixi-negation-target");
  sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(source.id)}`); setHand(source.id, [material], 4, 4); setHand(target.id, [negation, targetCard], 4, 4); setTurn(game.code, source.seat);
  const opened = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "gan_ning_qixi", cardIds: [material.id], targetId: target.id });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.currentAction.actorId, target.id); assert.equal((await state(game.code, game.members[1].token)).data.currentAction.requirement, "negate");
  const declined = await request("decline_response", { code: game.code, token: game.members[1].token });
  assert.equal(declined.status, 200); assert.equal(declined.data.room.pendingTargetCard.cardKind, "Dismantle");
  const selected = await request("choose_target_card", { code: game.code, token: game.members[0].token, targetCardZone: "hand", targetCardIndex: 1 });
  assert.equal(selected.status, 200); assert.equal(selected.data.room.phase, "play"); assert.ok(discardIds(game.code).includes(material.id)); assert.ok(!JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(target.id)}`)).some((held) => held.id === targetCard.id));

  const negatedGame = await createHumanGame(); const negatedSource = negatedGame.room.players[0]; const negatedTarget = negatedGame.room.players[1]; const negatedMaterial = card("BorrowedSword", "qixi-negated-material", "♠"); const negatingCard = card("Negation", "qixi-negating-card"); const preservedTargetCard = card("Peach", "qixi-negated-target");
  sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(negatedSource.id)}`); setHand(negatedSource.id, [negatedMaterial], 4, 4); setHand(negatedTarget.id, [negatingCard, preservedTargetCard], 4, 4); setTurn(negatedGame.code, negatedSource.seat);
  const negated = await request("trigger", { code: negatedGame.code, token: negatedGame.members[0].token, providerId: "gan_ning_qixi", cardIds: [negatedMaterial.id], targetId: negatedTarget.id });
  assert.equal(negated.status, 200); const answered = await request("respond", { code: negatedGame.code, token: negatedGame.members[1].token, cardId: negatingCard.id });
  assert.equal(answered.status, 200); assert.equal(answered.data.room.phase, "play"); assert.ok(discardIds(negatedGame.code).includes(negatedMaterial.id)); assert.ok(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(negatedTarget.id)}`)).some((held) => held.id === preservedTargetCard.id));
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

test("Yingzi uses the same optional trigger sequence in host test flow and rejects duplicate acceptance", async () => {
  const quick = await createTestGame(); const { token, room } = quick.data; const source = room.players[0];
  const drawCardsForYingzi = [card("Peach", "quick-yingzi-a"), card("Dodge", "quick-yingzi-b"), card("Attack", "quick-yingzi-c")];
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(source.id)}`); setHand(source.id, [], 3, 3); setDeck(room.code, drawCardsForYingzi); setTurn(room.code, source.seat, "draw");
  const opened = await request("draw", { code: room.code, token }); assert.equal(opened.status, 200, JSON.stringify(opened.data)); assert.equal(opened.data.room.meId, source.id); assert.deepEqual(opened.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["zhou_yu_yingzi"]);
  const submissions = await Promise.all([
    request("trigger", { code: room.code, token, providerId: "zhou_yu_yingzi" }),
    request("trigger", { code: room.code, token, providerId: "zhou_yu_yingzi" }),
  ]);
  assert.deepEqual(submissions.map((result) => result.status).sort(), [200, 409]);
  const resolved = await state(room.code, token); assert.equal(resolved.data.myHand.length, 3, "host test flow accepts Yingzi once and draws exactly three normal cards"); assert.equal(resolved.data.phase, "play");
});

test("Yingzi opens only after a Zhou Yu delayed Judgement resolves", async () => {
  const game = await createHumanGame(); const source = game.room.players[0];
  const delayed = card("Overindulgence", "yingzi-delayed"); const judge = card("Dodge", "yingzi-judge", "♥"); const normalDraw = [card("Peach", "yingzi-normal-a"), card("Dodge", "yingzi-normal-b"), card("Attack", "yingzi-normal-c")];
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(source.id)}`); setHand(source.id, [], 3, 3); setJudgement(source.id, [delayed]); setDeck(game.code, [judge, ...normalDraw]); setTurn(game.code, source.seat, "draw");
  const opened = await request("draw", { code: game.code, token: game.members[0].token }); assert.equal(opened.status, 200, JSON.stringify(opened.data)); assert.equal(opened.data.room.currentAction.triggerOptions[0].effectId, "zhou_yu_yingzi");
  const judgementIndex = opened.data.room.log.findIndex((entry) => entry.includes("judges A♥ for Overindulgence")); const heroicIndex = opened.data.room.log.findIndex((entry) => entry.includes("may use Heroic"));
  assert.ok(judgementIndex >= 0 && judgementIndex < heroicIndex, "Judgement resolves before Heroic is offered");
  const declined = await request("decline_trigger", { code: game.code, token: game.members[0].token }); assert.equal(declined.status, 200, JSON.stringify(declined.data)); assert.equal(declined.data.room.myHand.length, 2);
});

test("Zhang Liao Assault replaces normal Draw Phase cards with private hand transfers", async () => {
  const declinedGame = await createHumanGame(); const declinedSource = declinedGame.room.players[0]; const declinedTarget = declinedGame.room.players[1];
  const declinedCard = card("Peach", "assault-decline-target", "♥"); const declinedDeck = [card("Attack", "assault-decline-a"), card("Dodge", "assault-decline-b")];
  sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(declinedSource.id)}`); setHand(declinedSource.id, [], 4, 4); setHand(declinedTarget.id, [declinedCard], 4, 4); for (const player of declinedGame.room.players.slice(2)) setHand(player.id, [], 4, 4); setDeck(declinedGame.code, declinedDeck); setTurn(declinedGame.code, declinedSource.seat, "draw");
  const declinedOffer = await request("draw", { code: declinedGame.code, token: declinedGame.members[0].token });
  assert.equal(declinedOffer.status, 200, JSON.stringify(declinedOffer.data)); assert.equal(declinedOffer.data.room.currentAction.triggerOptions[0].label, "Assault"); assert.ok(declinedOffer.data.room.currentAction.legalActions.includes("decline_trigger"));
  const declined = await request("decline_trigger", { code: declinedGame.code, token: declinedGame.members[0].token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data)); assert.equal(declined.data.room.myHand.length, 2, "declining Assault draws the normal two deck cards"); assert.equal(declined.data.room.deckCount, 0);

  const one = await createHumanGame(); const source = one.room.players[0]; const target = one.room.players[1]; const hidden = { ...card("Peach", "assault-one-hidden", "♦"), rank: "9" }; const oneDeck = [card("Attack", "assault-one-deck-a"), card("Dodge", "assault-one-deck-b")];
  sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(source.id)}`); setHand(source.id, [], 4, 4); setHand(target.id, [hidden], 4, 4); for (const player of one.room.players.slice(2)) setHand(player.id, [], 4, 4); setDeck(one.code, oneDeck); setTurn(one.code, source.seat, "draw");
  const opened = await request("draw", { code: one.code, token: one.members[0].token }); const option = opened.data.room.currentAction.triggerOptions.find((candidate) => candidate.effectId === "zhang_liao_assault");
  assert.ok(option); assert.deepEqual(option.selection, { type: "target", targetIds: [target.id], min: 1, max: 2 }); assert.equal(JSON.stringify(opened.data.room.currentAction).includes(hidden.id), false);
  const observer = await state(one.code, one.members[1].token); assert.deepEqual(observer.data.currentAction.triggerOptions, [], "other players cannot see Zhang Liao's private trigger options");
  const reloaded = await state(one.code, one.members[0].token); assert.equal(reloaded.data.actionRevision, opened.data.room.actionRevision, "reload preserves the same Assault decision revision"); assert.deepEqual(reloaded.data.currentAction, opened.data.room.currentAction);
  const oneBefore = new Set([hidden.id, ...oneDeck.map((held) => held.id)]);
  const obtained = await request("trigger", { code: one.code, token: one.members[0].token, providerId: "zhang_liao_assault", targetIds: [target.id] });
  assert.equal(obtained.status, 200, JSON.stringify(obtained.data)); assert.equal(obtained.data.room.phase, "play"); assert.equal(obtained.data.room.deckCount, 2, "Assault does not consume deck cards"); assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(target.id)}`)), []); assert.deepEqual(obtained.data.room.myHand.map((held) => held.id), [hidden.id]); assert.deepEqual(new Set([...obtained.data.room.myHand.map((held) => held.id), ...JSON.parse(query(`SELECT deck_json FROM rooms WHERE code=${quote(one.code)}`)).map((held) => held.id)]), oneBefore); const publicTimeline = (await state(one.code, one.members[1].token)).data.timeline; assert.equal(publicTimeline.some((entry) => [hidden.id].some((value) => JSON.stringify(entry).includes(value))), false, "public history does not reveal transferred card details");

  const two = await createHumanGame(); const twoSource = two.room.players[0]; const twoA = two.room.players[1]; const twoB = two.room.players[2]; const twoCardA = card("Peach", "assault-two-a", "♣"); const twoCardB = card("Dodge", "assault-two-b", "♠"); const twoDeck = [card("Attack", "assault-two-deck-a"), card("Attack", "assault-two-deck-b")];
  sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(twoSource.id)}`); setHand(twoSource.id, [], 4, 4); setHand(twoA.id, [twoCardA], 4, 4); setHand(twoB.id, [twoCardB], 4, 4); setHand(two.room.players[3].id, [], 4, 4); setDeck(two.code, twoDeck); setTurn(two.code, twoSource.seat, "draw");
  await request("draw", { code: two.code, token: two.members[0].token }); const twoResolved = await request("trigger", { code: two.code, token: two.members[0].token, providerId: "zhang_liao_assault", targetIds: [twoA.id, twoB.id] });
  assert.equal(twoResolved.status, 200, JSON.stringify(twoResolved.data)); assert.equal(twoResolved.data.room.myHand.length, 2); assert.equal(twoResolved.data.room.deckCount, 2); assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(twoA.id)}`)), []); assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(twoB.id)}`)), []); assert.deepEqual(new Set(twoResolved.data.room.myHand.map((held) => held.id)), new Set([twoCardA.id, twoCardB.id]));

  const invalid = await createHumanGame(); const invalidSource = invalid.room.players[0]; const invalidA = invalid.room.players[1]; const invalidB = invalid.room.players[2]; const invalidCard = card("Peach", "assault-invalid", "♥");
  sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(invalidSource.id)}`); setHand(invalidSource.id, [card("Dodge", "assault-self")], 4, 4); setHand(invalidA.id, [invalidCard], 4, 4); setHand(invalidB.id, [card("Attack", "assault-invalid-b")], 4, 4); setHand(invalid.room.players[3].id, [], 4, 4); setDeck(invalid.code, [card("Attack", "assault-invalid-deck-a"), card("Dodge", "assault-invalid-deck-b")]); setTurn(invalid.code, invalidSource.seat, "draw");
  await request("draw", { code: invalid.code, token: invalid.members[0].token }); const invalidBefore = JSON.stringify(await state(invalid.code, invalid.members[0].token));
  for (const targetIds of [[invalidA.id, invalidB.id, invalid.room.players[3].id], [invalidA.id, invalidA.id], [invalidSource.id], [invalid.room.players[3].id]]) {
    const rejected = await request("trigger", { code: invalid.code, token: invalid.members[0].token, providerId: "zhang_liao_assault", targetIds }); assert.equal(rejected.status, 409); assert.equal(JSON.stringify(await state(invalid.code, invalid.members[0].token)), invalidBefore, "invalid Assault selection leaves state unchanged");
  }
  const staleContext = (await state(invalid.code, invalid.members[0].token)).data; const declinedInvalid = await request("decline_trigger", { code: invalid.code, token: invalid.members[0].token }); assert.equal(declinedInvalid.status, 200); const stale = await request("trigger", { code: invalid.code, token: invalid.members[0].token, providerId: "zhang_liao_assault", targetIds: [invalidA.id], context: { actionRevision: staleContext.actionRevision, meId: invalidSource.id, phase: "response", pendingKind: "trigger", actorId: invalidSource.id } }); assert.equal(stale.status, 409); assert.equal(stale.data.stale, true);

  const empty = await createHumanGame(); const emptySource = empty.room.players[0];
  sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(emptySource.id)}`); for (const player of empty.room.players) setHand(player.id, [], 4, 4); setDeck(empty.code, [card("Attack", "assault-empty-a"), card("Dodge", "assault-empty-b")]); setTurn(empty.code, emptySource.seat, "draw");
  const noTarget = await request("draw", { code: empty.code, token: empty.members[0].token }); assert.equal(noTarget.status, 200); assert.equal(noTarget.data.room.currentAction.kind, "turn"); assert.equal(noTarget.data.room.phase, "play"); assert.equal(noTarget.data.room.myHand.length, 2, "without eligible targets normal draw continues");

  const delayed = await createHumanGame(); const delayedSource = delayed.room.players[0]; const delayedTarget = delayed.room.players[1]; const delayedCard = card("Peach", "assault-delayed-target", "♥"); const overindulgence = card("Overindulgence", "assault-delayed"); const judgement = card("Dodge", "assault-delayed-judgement", "♥");
  sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(delayedSource.id)}`); setHand(delayedSource.id, [], 4, 4); setHand(delayedTarget.id, [delayedCard], 4, 4); for (const player of delayed.room.players.slice(2)) setHand(player.id, [], 4, 4); setJudgement(delayedSource.id, [overindulgence]); setDeck(delayed.code, [judgement, card("Attack", "assault-delayed-deck-a"), card("Dodge", "assault-delayed-deck-b")]); setTurn(delayed.code, delayedSource.seat, "draw");
  const delayedOpened = await request("draw", { code: delayed.code, token: delayed.members[0].token }); assert.equal(delayedOpened.status, 200); assert.equal(delayedOpened.data.room.currentAction.triggerOptions[0].effectId, "zhang_liao_assault"); assert.ok(delayedOpened.data.room.log.findIndex((entry) => entry.includes("judges A♥ for Overindulgence")) < delayedOpened.data.room.log.findIndex((entry) => entry.includes("may use Assault")), "Assault opens after delayed Judgement resolution");
});

test("Xu Zhu Bared Bodied replaces one Draw Phase card and scopes Attack/Duel damage to the active turn", { timeout: 120_000 }, async () => {
  const declined = await createHumanGame(); const declinedSource = declined.room.players[0];
  sql(`UPDATE players SET hero='xu-chu' WHERE id=${quote(declinedSource.id)}`); setHand(declinedSource.id, [], 4, 4); for (const player of declined.room.players.slice(1)) setHand(player.id, [], 4, 4); setDeck(declined.code, [card("Attack", "bared-decline-a"), card("Dodge", "bared-decline-b")]); setTurn(declined.code, declinedSource.seat, "draw");
  const declinedOffer = await request("draw", { code: declined.code, token: declined.members[0].token }); assert.equal(declinedOffer.status, 200, JSON.stringify(declinedOffer.data)); assert.equal(declinedOffer.data.room.currentAction.triggerOptions[0].label, "Bared Bodied");
  const declinedRevision = declinedOffer.data.room.actionRevision; const declinedResult = await request("decline_trigger", { code: declined.code, token: declined.members[0].token }); assert.equal(declinedResult.status, 200, JSON.stringify(declinedResult.data)); assert.equal(declinedResult.data.room.myHand.length, 2); assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(declined.code)}`)).baredBodiedActive, undefined);
  const stale = await request("trigger", { code: declined.code, token: declined.members[0].token, providerId: "xu_chu_bared_bodied", context: { actionRevision: declinedRevision, meId: declinedSource.id, phase: "response", pendingKind: "trigger", actorId: declinedSource.id } }); assert.equal(stale.status, 409); assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(declined.code)}`)).baredBodiedActive, undefined);

  const accepted = await createHumanGame(); const acceptedSource = accepted.room.players[0]; const acceptedAttack = card("Attack", "bared-accepted-attack");
  sql(`UPDATE players SET hero='xu-chu' WHERE id=${quote(acceptedSource.id)}`); setHand(acceptedSource.id, [], 4, 4); for (const player of accepted.room.players.slice(1)) setHand(player.id, [], 4, 4); setDeck(accepted.code, [acceptedAttack, card("Dodge", "bared-accepted-deck")]); setTurn(accepted.code, acceptedSource.seat, "draw");
  const acceptedOffer = await request("draw", { code: accepted.code, token: accepted.members[0].token }); const acceptedResult = await request("trigger", { code: accepted.code, token: accepted.members[0].token, providerId: "xu_chu_bared_bodied" });
  assert.equal(acceptedResult.status, 200, JSON.stringify(acceptedResult.data)); assert.equal(acceptedResult.data.room.myHand.length, 1); assert.equal(acceptedResult.data.room.deckCount, 1); assert.deepEqual(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(accepted.code)}`)), { turnPlayerId: acceptedSource.id, baredBodiedActive: true });
  const reloaded = await state(accepted.code, accepted.members[0].token); assert.equal(reloaded.data.myHand[0].id, acceptedAttack.id); assert.deepEqual(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(accepted.code)}`)), { turnPlayerId: acceptedSource.id, baredBodiedActive: true }); assert.ok(acceptedOffer.data.room.currentAction.triggerOptions.some((option) => option.effectId === "xu_chu_bared_bodied"));

  const attackTarget = accepted.room.players[1]; const attackResult = await request("play_card", { code: accepted.code, token: accepted.members[0].token, cardId: acceptedAttack.id, targetId: attackTarget.id }); assert.equal(attackResult.status, 200, JSON.stringify(attackResult.data)); assert.equal(attackResult.data.room.players.find((player) => player.id === attackTarget.id).hp, 2); assert.equal(attackResult.data.room.log.filter((entry) => entry.includes("takes 2 damage")).length, 1);

  const duel = await createHumanGame(); const duelSource = duel.room.players[0]; const duelTarget = duel.room.players[1]; const duelCard = card("Duel", "bared-duel");
  sql(`UPDATE players SET hero='xu-chu' WHERE id=${quote(duelSource.id)}`); setHand(duelSource.id, [], 4, 4); setHand(duelTarget.id, [], 4, 4); for (const player of duel.room.players.slice(2)) setHand(player.id, [], 4, 4); setDeck(duel.code, [duelCard, card("Dodge", "bared-duel-deck")]); setTurn(duel.code, duelSource.seat, "draw");
  await request("draw", { code: duel.code, token: duel.members[0].token }); await request("trigger", { code: duel.code, token: duel.members[0].token, providerId: "xu_chu_bared_bodied" }); const duelResult = await request("play_card", { code: duel.code, token: duel.members[0].token, cardId: duelCard.id, targetId: duelTarget.id });
  assert.equal(duelResult.status, 200, JSON.stringify(duelResult.data)); assert.equal(duelResult.data.room.players.find((player) => player.id === duelTarget.id).hp, 2); assert.equal(duelResult.data.room.log.filter((entry) => entry.includes("2 Duel damage")).length, 1);

  const duelLoss = await createHumanGame(); const lossSource = duelLoss.room.players[0]; const lossTarget = duelLoss.room.players[1]; const lossDuel = card("Duel", "bared-duel-loss"); const lossAttack = card("Attack", "bared-duel-loss-response");
  sql(`UPDATE players SET hero='xu-chu' WHERE id=${quote(lossSource.id)}`); setHand(lossSource.id, [], 4, 4); setHand(lossTarget.id, [lossAttack], 4, 4); for (const player of duelLoss.room.players.slice(2)) setHand(player.id, [], 4, 4); setDeck(duelLoss.code, [lossDuel, card("Dodge", "bared-duel-loss-deck")]); setTurn(duelLoss.code, lossSource.seat, "draw");
  await request("draw", { code: duelLoss.code, token: duelLoss.members[0].token }); await request("trigger", { code: duelLoss.code, token: duelLoss.members[0].token, providerId: "xu_chu_bared_bodied" }); await request("play_card", { code: duelLoss.code, token: duelLoss.members[0].token, cardId: lossDuel.id, targetId: lossTarget.id, preserveResponse: true }); await request("decline_response", { code: duelLoss.code, token: duelLoss.members[0].token, preserveResponse: true }); await request("decline_response", { code: duelLoss.code, token: duelLoss.members[1].token, preserveResponse: true });
  await request("decline_response", { code: duelLoss.code, token: duelLoss.members[2].token, preserveResponse: true }); await request("decline_response", { code: duelLoss.code, token: duelLoss.members[3].token, preserveResponse: true }); const lossRespond = await request("respond", { code: duelLoss.code, token: duelLoss.members[1].token, cardId: lossAttack.id, preserveResponse: true }); assert.equal(lossRespond.status, 200, JSON.stringify(lossRespond.data)); const lossResult = await request("decline_response", { code: duelLoss.code, token: duelLoss.members[0].token }); assert.equal(lossResult.status, 200, JSON.stringify(lossResult.data)); assert.equal(lossResult.data.room.players.find((player) => player.id === lossSource.id).hp, 3); assert.equal(lossResult.data.room.players.find((player) => player.id === lossTarget.id).hp, 4);

  const dying = await createHumanGame(); const dyingSource = dying.room.players[0]; const dyingTarget = dying.room.players[1]; const dyingAttack = card("Attack", "bared-dying-attack");
  sql(`UPDATE players SET hero='xu-chu' WHERE id=${quote(dyingSource.id)}`); setHand(dyingSource.id, [], 4, 4); setHand(dyingTarget.id, [], 2, 4); for (const player of dying.room.players.slice(2)) setHand(player.id, [], 4, 4); setDeck(dying.code, [dyingAttack]); setTurn(dying.code, dyingSource.seat, "draw");
  await request("draw", { code: dying.code, token: dying.members[0].token }); await request("trigger", { code: dying.code, token: dying.members[0].token, providerId: "xu_chu_bared_bodied" }); const dyingResult = await request("play_card", { code: dying.code, token: dying.members[0].token, cardId: dyingAttack.id, targetId: dyingTarget.id });
  assert.equal(dyingResult.status, 200, JSON.stringify(dyingResult.data)); assert.equal(dyingResult.data.room.players.find((player) => player.id === dyingTarget.id).alive, false); assert.equal(dyingResult.data.room.log.filter((entry) => entry.includes("takes 2 damage")).length, 1);

  const reset = await createHumanGame(); const resetSource = reset.room.players[0];
  sql(`UPDATE players SET hero='xu-chu' WHERE id=${quote(resetSource.id)}`); setHand(resetSource.id, [], 4, 4); for (const player of reset.room.players.slice(1)) setHand(player.id, [], 4, 4); setDeck(reset.code, [card("Dodge", "bared-reset-a"), card("Dodge", "bared-reset-b"), card("Dodge", "bared-reset-c"), card("Dodge", "bared-reset-d"), card("Dodge", "bared-reset-e"), card("Dodge", "bared-reset-f"), card("Dodge", "bared-reset-g"), card("Dodge", "bared-reset-h"), card("Dodge", "bared-reset-i")]); setTurn(reset.code, resetSource.seat, "draw");
  await request("draw", { code: reset.code, token: reset.members[0].token }); await request("trigger", { code: reset.code, token: reset.members[0].token, providerId: "xu_chu_bared_bodied" }); await request("end_turn", { code: reset.code, token: reset.members[0].token });
  for (let seat = 1; seat < reset.room.players.length; seat++) { await request("draw", { code: reset.code, token: reset.members[seat].token }); await request("end_turn", { code: reset.code, token: reset.members[seat].token }); }
  const resetState = await state(reset.code, reset.members[0].token); assert.equal(resetState.data.phase, "draw"); assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(reset.code)}`)).baredBodiedActive, undefined); assert.ok(resetState.data.currentAction.legalActions.includes("draw"));
});

test("Composure tracks the whole turn and can optionally skip Discard", { timeout: 120_000 }, async () => {
  const noAttack = await createHumanGame(); const noAttackSource = noAttack.room.players[0];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(noAttackSource.id)}`); setHand(noAttackSource.id, [card("Peach", "composure-no-attack-a"), card("Dodge", "composure-no-attack-b"), card("Peach", "composure-no-attack-c")], 2, 4); setTurn(noAttack.code, noAttackSource.seat);
  const offered = await request("end_turn", { code: noAttack.code, token: noAttack.members[0].token });
  assert.equal(offered.status, 200, JSON.stringify(offered.data)); assert.equal(offered.data.room.currentAction.triggerOptions[0].label, "Composure"); assert.notEqual(offered.data.room.currentAction.triggerOptions[0].label, "Keji"); assert.equal(offered.data.room.phase, "response");
  const declined = await request("decline_trigger", { code: noAttack.code, token: noAttack.members[0].token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data)); assert.equal(declined.data.room.phase, "discard");

  const acceptedGame = await createHumanGame(); const acceptedSource = acceptedGame.room.players[0];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(acceptedSource.id)}`); setHand(acceptedSource.id, [card("Peach", "composure-accept-a"), card("Dodge", "composure-accept-b"), card("Peach", "composure-accept-c")], 2, 4); setTurn(acceptedGame.code, acceptedSource.seat);
  const acceptedOffer = await request("end_turn", { code: acceptedGame.code, token: acceptedGame.members[0].token });
  const accepted = await request("trigger", { code: acceptedGame.code, token: acceptedGame.members[0].token, providerId: "lu_meng_keji" });
  assert.equal(acceptedOffer.status, 200); assert.equal(accepted.status, 200, JSON.stringify(accepted.data)); assert.notEqual(accepted.data.room.phase, "discard");

  const physical = await createHumanGame(); const physicalSource = physical.room.players[0]; const physicalTarget = physical.room.players[1]; const physicalAttack = card("Attack", "composure-physical");
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(physicalSource.id)}`); setHand(physicalSource.id, [physicalAttack], 2, 4); setHand(physicalTarget.id, [], 4, 4); setTurn(physical.code, physicalSource.seat);
  const physicalPlayed = await request("play_card", { code: physical.code, token: physical.members[0].token, cardId: physicalAttack.id, targetId: physicalTarget.id }); assert.equal(physicalPlayed.status, 200, JSON.stringify(physicalPlayed.data));
  const physicalEnded = await request("end_turn", { code: physical.code, token: physical.members[0].token }); assert.equal(physicalEnded.status, 200, JSON.stringify(physicalEnded.data)); assert.notEqual(physicalEnded.data.room.currentAction?.triggerOptions?.some((option) => option.label === "Composure"), true);

  const virtual = await createHumanGame(); const virtualSource = virtual.room.players[0]; const virtualTarget = virtual.room.players[1]; const virtualCost = [card("Peach", "composure-virtual-a"), card("Dodge", "composure-virtual-b")];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(virtualSource.id)}`); setHand(virtualSource.id, virtualCost, 2, 4); setEquipment(virtualSource.id, { weapon: card("SerpentSpear", "composure-virtual-spear") }); setHand(virtualTarget.id, [], 4, 4); setTurn(virtual.code, virtualSource.seat);
  const virtualPlayed = await request("serpent_spear_attack", { code: virtual.code, token: virtual.members[0].token, cardIds: virtualCost.map((held) => held.id), targetId: virtualTarget.id }); assert.equal(virtualPlayed.status, 200, JSON.stringify(virtualPlayed.data));
  const virtualEnded = await request("end_turn", { code: virtual.code, token: virtual.members[0].token }); assert.equal(virtualEnded.status, 200, JSON.stringify(virtualEnded.data)); assert.notEqual(virtualEnded.data.room.currentAction?.triggerOptions?.some((option) => option.label === "Composure"), true);
});

test("Composure remains optional at the boundary, resets next turn, and is shared by hosted seats", { timeout: 120_000 }, async () => {
  const noDiscard = await createHumanGame(); const noDiscardSource = noDiscard.room.players[0];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(noDiscardSource.id)}`); setHand(noDiscardSource.id, [card("Peach", "composure-no-discard")], 2, 4); setTurn(noDiscard.code, noDiscardSource.seat);
  const noDiscardOffer = await request("end_turn", { code: noDiscard.code, token: noDiscard.members[0].token });
  assert.equal(noDiscardOffer.status, 200, JSON.stringify(noDiscardOffer.data)); assert.notEqual(noDiscardOffer.data.room.phase, "response"); assert.notEqual(noDiscardOffer.data.room.phase, "discard", "an in-limit hand follows the ordinary no-discard boundary");

  const reset = await createHumanGame(); const resetSource = reset.room.players[0];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(resetSource.id)}`); setHand(resetSource.id, [card("Peach", "composure-reset-a"), card("Dodge", "composure-reset-b"), card("Peach", "composure-reset-c")], 2, 4);
  for (const player of reset.room.players.filter((candidate) => candidate.id !== resetSource.id)) setHand(player.id, [], 4, 4);
  setTurn(reset.code, resetSource.seat);
  const firstOffer = await request("end_turn", { code: reset.code, token: reset.members[0].token }); assert.equal(firstOffer.data.room.currentAction.triggerOptions[0].label, "Composure");
  const firstAccepted = await request("trigger", { code: reset.code, token: reset.members[0].token, providerId: "lu_meng_keji" }); assert.equal(firstAccepted.status, 200, JSON.stringify(firstAccepted.data));
  for (let offset = 1; offset < reset.room.players.length; offset++) {
    const seat = (resetSource.seat + offset) % reset.room.players.length; const token = reset.members[seat].token;
    const drawn = await request("draw", { code: reset.code, token }); assert.equal(drawn.status, 200, JSON.stringify(drawn.data));
    const ended = await request("end_turn", { code: reset.code, token }); assert.equal(ended.status, 200, JSON.stringify(ended.data));
  }
  const nextDraw = await request("draw", { code: reset.code, token: reset.members[resetSource.seat].token });
  assert.equal(nextDraw.status, 200, JSON.stringify(nextDraw.data));
  const resetOffer = await request("end_turn", { code: reset.code, token: reset.members[resetSource.seat].token });
  assert.equal(resetOffer.status, 200, JSON.stringify(resetOffer.data)); assert.equal(resetOffer.data.room.currentAction.triggerOptions[0].label, "Composure", "the next turn starts with a fresh no-Attack history");

  const ordinary = await createHumanGame(); const ordinarySource = ordinary.room.players[0];
  sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(ordinarySource.id)}`); setHand(ordinarySource.id, [card("Peach", "composure-ordinary-a"), card("Peach", "composure-ordinary-b")], 1, 4); setTurn(ordinary.code, ordinarySource.seat);
  const ordinaryEnded = await request("end_turn", { code: ordinary.code, token: ordinary.members[0].token }); assert.equal(ordinaryEnded.status, 200, JSON.stringify(ordinaryEnded.data)); assert.equal(ordinaryEnded.data.room.phase, "discard"); assert.equal(ordinaryEnded.data.room.currentAction?.triggerOptions?.some((option) => option.label === "Composure") ?? false, false);

  const hosted = await createTestGame(); const hostedSource = hosted.data.room.players[0];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(hostedSource.id)}`); setHand(hostedSource.id, [card("Peach", "composure-hosted-a"), card("Dodge", "composure-hosted-b")], 1, 4); setTurn(hosted.data.room.code, hostedSource.seat);
  const hostedOffer = await request("end_turn", { code: hosted.data.room.code, token: hosted.data.token }); assert.equal(hostedOffer.status, 200, JSON.stringify(hostedOffer.data)); assert.equal(hostedOffer.data.room.currentAction.triggerOptions[0].label, "Composure");
});

test("Composure counts Dodged and lethal Attacks, survives reload, and rejects stale use", { timeout: 120_000 }, async () => {
  const dodged = await createHumanGame(); const dodgedSource = dodged.room.players[0]; const dodgedTarget = dodged.room.players[1];
  const dodgedAttack = card("Attack", "composure-dodged-attack"); const dodgedHand = [dodgedAttack, card("Peach", "composure-dodged-extra-a"), card("Dodge", "composure-dodged-extra-b"), card("Peach", "composure-dodged-extra-c")];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(dodgedSource.id)}`); setHand(dodgedSource.id, dodgedHand, 2, 4); setHand(dodgedTarget.id, [card("Dodge", "composure-dodged-response")], 4, 4); setTurn(dodged.code, dodgedSource.seat);
  const dodgedPlay = await request("play_card", { code: dodged.code, token: dodged.members[0].token, cardId: dodgedAttack.id, targetId: dodgedTarget.id, preserveResponse: true }); assert.equal(dodgedPlay.status, 200, JSON.stringify(dodgedPlay.data));
  const dodgedResponse = await request("respond", { code: dodged.code, token: dodged.members[1].token, cardId: "dodge-composure-dodged-response", preserveResponse: true }); assert.equal(dodgedResponse.status, 200, JSON.stringify(dodgedResponse.data));
  const reloaded = await state(dodged.code, dodged.members[0].token); assert.ok(reloaded.data.phase?.startsWith("play"), `the Dodged Attack returns to the Play flow, got ${reloaded.data.phase}`); assert.equal(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(dodged.code)}`)).attackUsed, true, "the authoritative turn fact survives a room reload");
  const dodgedEnded = await request("end_turn", { code: dodged.code, token: dodged.members[0].token }); assert.equal(dodgedEnded.status, 200, JSON.stringify(dodgedEnded.data)); assert.equal(dodgedEnded.data.room.phase, "discard"); assert.equal(dodgedEnded.data.room.currentAction?.triggerOptions?.some((option) => option.label === "Composure") ?? false, false);

  const lethal = await createHumanGame(); const lethalSource = lethal.room.players[0]; const lethalTarget = lethal.room.players[1];
  const lethalAttack = card("Attack", "composure-lethal-attack"); sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(lethalSource.id)}`); for (const [player, role] of lethal.room.players.map((player, index) => [player, ["Rebel", "Loyalist", "Lord", "Renegade"][index]])) sql(`UPDATE players SET role=${quote(role)} WHERE id=${quote(player.id)}`); setHand(lethalSource.id, [lethalAttack, card("Dodge", "composure-lethal-extra-a"), card("Dodge", "composure-lethal-extra-b"), card("Dodge", "composure-lethal-extra-c")], 2, 4); setHand(lethalTarget.id, [], 1, 4); for (const player of lethal.room.players.slice(2)) setHand(player.id, [], 4, 4); setTurn(lethal.code, lethalSource.seat);
  const lethalPlay = await request("play_card", { code: lethal.code, token: lethal.members[0].token, cardId: lethalAttack.id, targetId: lethalTarget.id }); assert.equal(lethalPlay.status, 200, JSON.stringify(lethalPlay.data));
  const lethalEnded = await request("end_turn", { code: lethal.code, token: lethal.members[0].token }); assert.equal(lethalEnded.status, 200, JSON.stringify(lethalEnded.data)); assert.equal(lethalEnded.data.room.phase, "discard"); assert.equal(lethalEnded.data.room.players.find((player) => player.id === lethalTarget.id).alive, false); assert.equal(lethalEnded.data.room.currentAction?.triggerOptions?.some((option) => option.label === "Composure") ?? false, false);

  const equipment = await createHumanGame(); const equipmentSource = equipment.room.players[0]; const shield = card("NioShield", "composure-equipment", "♣");
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(equipmentSource.id)}`); setHand(equipmentSource.id, [shield, card("Peach", "composure-equipment-extra-a"), card("Dodge", "composure-equipment-extra-b"), card("Peach", "composure-equipment-extra-c")], 2, 4); setTurn(equipment.code, equipmentSource.seat);
  const equipped = await request("play_card", { code: equipment.code, token: equipment.members[0].token, cardId: shield.id }); assert.equal(equipped.status, 200, JSON.stringify(equipped.data));
  const equipmentEnded = await request("end_turn", { code: equipment.code, token: equipment.members[0].token }); assert.equal(equipmentEnded.status, 200, JSON.stringify(equipmentEnded.data)); assert.equal(equipmentEnded.data.room.currentAction.triggerOptions[0].label, "Composure", "non-Attack equipment does not disable Composure");

  const stale = await createHumanGame(); const staleSource = stale.room.players[0]; sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(staleSource.id)}`); setHand(staleSource.id, [card("Peach", "composure-stale-a"), card("Dodge", "composure-stale-b"), card("Peach", "composure-stale-c")], 2, 4); setTurn(stale.code, staleSource.seat);
  const staleOpen = await request("end_turn", { code: stale.code, token: stale.members[0].token }); assert.equal(staleOpen.data.room.currentAction.triggerOptions[0].label, "Composure");
  const staleDecline = await request("decline_trigger", { code: stale.code, token: stale.members[0].token }); assert.equal(staleDecline.status, 200, JSON.stringify(staleDecline.data));
  const staleReplay = await request("trigger", { code: stale.code, token: stale.members[0].token, providerId: "lu_meng_keji" }); assert.equal(staleReplay.status, 409); assert.equal(staleReplay.data.stale, true);
});

test("host test flow uses Fanjian's shared-controller sequence and private opaque card choice", async () => {
  const quick = await createTestGame(); const { token, room } = quick.data; const { code } = room; const source = room.players[0]; const target = room.players[1]; const concealed = card("Peach", "quick-fanjian", "♦");
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
  const created = await createTestGame();
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
  membersByCode.set(code, members);
  await markReady(code, members);
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

test("Attack response windows are public while Dodge options remain private", { timeout: 30_000 }, async () => {
  async function open(targetCards, suffix) {
    const game = await createHumanGame();
    const [sourceMember, targetMember, otherMember] = game.members;
    const [source, target, other, last] = game.room.players;
    const attack = card("Attack", `privacy-${suffix}`);
    setHand(source.id, [attack], 4, 4); setHand(target.id, targetCards, 4, 4); setHand(other.id, [], 4, 4); setHand(last.id, [], 4, 4);
    setEquipment(source.id); setEquipment(target.id); setEquipment(other.id); setEquipment(last.id); setTurn(game.code, source.seat);
    const played = await request("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: target.id, preserveResponse: true });
    assert.equal(played.status, 200, JSON.stringify(played.data));
    return { game, sourceMember, targetMember, otherMember, source, target, other, attack };
  }

  const empty = await open([], "empty");
  const emptyTarget = (await state(empty.game.code, empty.targetMember.token)).data;
  assert.equal(emptyTarget.phase, "response"); assert.equal(emptyTarget.actionPlayerId, empty.target.id);
  assert.equal(emptyTarget.currentAction.kind, "response"); assert.equal(emptyTarget.currentAction.requirement, "dodge");
  assert.deepEqual(emptyTarget.currentAction.options, []); assert.ok(emptyTarget.currentAction.legalActions.includes("decline_response")); assert.equal(emptyTarget.currentAction.legalActions.includes("respond"), false);
  assert.equal(emptyTarget.players.find((player) => player.id === empty.target.id).hp, 4);
  const emptyOther = (await state(empty.game.code, empty.otherMember.token)).data;
  assert.equal(emptyOther.phase, "response"); assert.equal(emptyOther.actionPlayerId, empty.target.id); assert.equal(emptyOther.currentAction.kind, "response");
  assert.equal(emptyOther.currentAction.reason, emptyTarget.currentAction.reason); assert.deepEqual(emptyOther.currentAction.options ?? [], []);
  const declinedEmpty = await request("decline_response", { code: empty.game.code, token: empty.targetMember.token });
  assert.equal(declinedEmpty.status, 200); assert.equal(declinedEmpty.data.room.players.find((player) => player.id === empty.target.id).hp, 3);

  const held = await open([card("Dodge", "privacy-held")], "held");
  const heldTarget = (await state(held.game.code, held.targetMember.token)).data;
  assert.ok(heldTarget.currentAction.options.some((option) => option.providerId === "card"));
  assert.ok(heldTarget.currentAction.legalActions.includes("respond")); assert.ok(heldTarget.currentAction.legalActions.includes("decline_response"));
  const declinedHeld = await request("decline_response", { code: held.game.code, token: held.targetMember.token });
  assert.equal(declinedHeld.status, 200); assert.equal(declinedHeld.data.room.players.find((player) => player.id === held.target.id).hp, 3);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(held.target.id)}`)).map((item) => item.id), ["dodge-privacy-held"]);
});

test("Negation windows and counter-windows include players without private Negation", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [sourceMember, firstMember, secondMember] = game.members;
  const [source, first, second, last] = game.room.players; const drawTwo = card("DrawTwo", "privacy-negation");
  setHand(source.id, [drawTwo], 4, 4); setHand(first.id, [], 4, 4); setHand(second.id, [], 4, 4); setHand(last.id, [], 4, 4); setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: drawTwo.id, preserveResponse: true });
  assert.equal(opened.status, 200); const sourceView = (await state(game.code, sourceMember.token)).data;
  assert.equal(sourceView.currentAction.requirement, "negate"); assert.deepEqual(sourceView.currentAction.options, []); assert.deepEqual(sourceView.currentAction.legalActions, ["decline_response"]);
  const passed = await request("decline_response", { code: game.code, token: sourceMember.token, preserveResponse: true });
  assert.equal(passed.status, 200); const firstView = (await state(game.code, firstMember.token)).data;
  assert.equal(firstView.currentAction.actorId, first.id); assert.equal(firstView.currentAction.requirement, "negate"); assert.deepEqual(firstView.currentAction.options, []);

  setHand(first.id, [card("Negation", "privacy-counter")], 4, 4);
  const withCard = (await state(game.code, firstMember.token)).data;
  assert.ok(withCard.currentAction.options.some((option) => option.providerId === "negation_card"), JSON.stringify(withCard.currentAction));
  const declined = await request("decline_response", { code: game.code, token: firstMember.token, preserveResponse: true });
  assert.equal(declined.status, 200); assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(first.id)}`)).map((item) => item.id), ["negation-privacy-counter"]);
  assert.equal((await state(game.code, secondMember.token)).data.currentAction.actorId, second.id);

  const counterGame = await createHumanGame(); const [counterSource, counterFirst, counterSecond, counterLast] = counterGame.members; const [counterSourcePlayer] = counterGame.room.players;
  setHand(counterSourcePlayer.id, [card("DrawTwo", "counter-root")], 4, 4); setHand(counterGame.room.players[1].id, [card("Negation", "counter-negation")], 4, 4); setHand(counterGame.room.players[2].id, [], 4, 4); setHand(counterGame.room.players[3].id, [], 4, 4); setTurn(counterGame.code, counterSourcePlayer.seat);
  await request("play_card", { code: counterGame.code, token: counterSource.token, cardId: "drawtwo-counter-root", preserveResponse: true });
  await request("decline_response", { code: counterGame.code, token: counterSource.token, preserveResponse: true });
  const negated = await request("respond", { code: counterGame.code, token: counterFirst.token, providerId: "negation_card", cardId: "negation-counter-negation", preserveResponse: true });
  assert.equal(negated.status, 200); const counterSecondView = (await state(counterGame.code, counterSecond.token)).data;
  assert.equal(counterSecondView.currentAction.requirement, "negate"); assert.deepEqual(counterSecondView.currentAction.options, []); assert.deepEqual(counterSecondView.currentAction.legalActions, ["decline_response"]);
  assert.equal((await request("decline_response", { code: counterGame.code, token: counterSecond.token, preserveResponse: true })).status, 200);
  assert.equal((await state(counterGame.code, counterLast.token)).data.currentAction.requirement, "negate");
});

test("Dying rescue gives every living rescuer a private Peach decision", { timeout: 30_000 }, async () => {
  async function lethal(peach) {
    const game = await createHumanGame(); const [sourceMember, targetMember] = game.members; const [source, target] = game.room.players;
    const attack = card("Attack", peach ? "peach-holder-attack" : "peach-empty-attack");
    setHand(source.id, peach ? [attack, card("Peach", "peach-holder") ] : [attack], 4, 4); setHand(target.id, [], 1, 4); setTurn(game.code, source.seat);
    const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: target.id, preserveResponse: true });
    assert.equal(opened.status, 200); assert.equal((await request("decline_response", { code: game.code, token: targetMember.token, preserveResponse: true })).status, 200);
    return { game, sourceMember, targetMember, source, target };
  }
  const empty = await lethal(false); const emptyRescue = (await state(empty.game.code, empty.sourceMember.token)).data;
  assert.equal(emptyRescue.phase, "dying"); assert.equal(emptyRescue.currentAction.kind, "dying"); assert.deepEqual(emptyRescue.currentAction.legalActions, ["skip_rescue"]);
  const skipped = await request("skip_rescue", { code: empty.game.code, token: empty.sourceMember.token, preserveResponse: true }); assert.equal(skipped.status, 200); assert.equal(skipped.data.room.phase, "dying");

  const holder = await lethal(true); const holderRescue = (await state(holder.game.code, holder.sourceMember.token)).data;
  assert.equal(holderRescue.phase, "dying"); assert.ok(holderRescue.currentAction.legalActions.includes("skip_rescue")); assert.ok(holderRescue.currentAction.legalActions.includes("give_peach"));
  const holderSkipped = await request("skip_rescue", { code: holder.game.code, token: holder.sourceMember.token }); assert.equal(holderSkipped.status, 200);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(holder.source.id)}`)).map((item) => item.id), ["peach-peach-holder"]);
});

test("AOE response windows open before failure for players with no private response", { timeout: 30_000 }, async () => {
  for (const [kind, required] of [["RainingArrows", "dodge"], ["BarbarianInvasion", "attack"]]) {
    const game = await createHumanGame(); const [sourceMember, firstMember, secondMember, lastMember] = game.members; const [source, first, second, last] = game.room.players;
    const group = card(kind, `privacy-${kind}`); setHand(source.id, [group], 4, 4); setHand(first.id, [], 4, 4); setHand(second.id, [], 4, 4); setHand(last.id, [], 4, 4); setTurn(game.code, source.seat);
    await request("play_card", { code: game.code, token: sourceMember.token, cardId: group.id, preserveResponse: true });
    for (const member of [sourceMember, firstMember, secondMember, lastMember]) {
      const view = (await state(game.code, member.token)).data; assert.equal(view.currentAction.requirement, "negate"); assert.deepEqual(view.currentAction.options, []);
      assert.equal((await request("decline_response", { code: game.code, token: member.token, preserveResponse: true })).status, 200);
    }
    const firstResponse = (await state(game.code, firstMember.token)).data;
    assert.equal(firstResponse.currentAction.requirement, required); assert.deepEqual(firstResponse.currentAction.options, []); assert.deepEqual(firstResponse.currentAction.legalActions, ["decline_response"]);
  }
});

test("the three faction lords expose their active skills through the semantic protocol", { timeout: 120_000 }, async () => {
  const rendeGame = await createHumanGame();
  const [rendeHost, rendeAlice] = rendeGame.members;
  const rendeLiu = rendeGame.room.players.find((player) => player.name === "Host");
  const rendeTarget = rendeGame.room.players.find((player) => player.name === "Alice");
  assert.ok(rendeLiu && rendeTarget);
  const rendeCards = [card("Attack", "rende-one"), card("Dodge", "rende-two"), card("Peach", "rende-three")];
  sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(rendeLiu.id)}`);
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
  const discarded = card("Peach", "zhiheng-discard"); const equipped = card("BlueSteelSword", "zhiheng-equipment"); const drawn = card("Attack", "zhiheng-drawn"); const drawnTwo = card("Dodge", "zhiheng-drawn-two");
  sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(zhihengSun.id)}`);
  setHand(zhihengSun.id, [discarded], 4, 4); setEquipment(zhihengSun.id, { weapon: equipped }); setDeck(zhihengGame.code, [drawn, drawnTwo]); setTurn(zhihengGame.code, zhihengSun.seat);
  const projectedZhiheng = await state(zhihengGame.code, zhihengHost.token); const zhihengOption = projectedZhiheng.data.currentAction.triggerOptions.find((option) => option.effectId === "sun_quan_zhiheng");
  assert.deepEqual(zhihengOption.selection.eligibleCardIds, [discarded.id, equipped.id]);
  const zhiheng = await request("trigger", { code: zhihengGame.code, token: zhihengHost.token, providerId: "sun_quan_zhiheng", cardIds: [discarded.id, equipped.id] });
  assert.equal(zhiheng.status, 200, JSON.stringify(zhiheng.data));
  assert.deepEqual(new Set(zhiheng.data.room.myHand.map((held) => held.id)), new Set([drawn.id, drawnTwo.id]), "Equilibrium draws one replacement for each discarded card");
  assert.ok(discardIds(zhihengGame.code).includes(discarded.id)); assert.ok(discardIds(zhihengGame.code).includes(equipped.id));
  assert.deepEqual(JSON.parse(query(`SELECT equipment_json FROM players WHERE id=${quote(zhihengSun.id)}`)), {}, "an Equilibrium equipment cost leaves the Equipment Zone");
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
  sql(`UPDATE players SET hero=NULL WHERE id=${quote(jijiangSource.id)}`); sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(liu.id)}`); sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(shu.id)}`); sql(`UPDATE players SET hero=NULL WHERE id=${quote(other.id)}`);
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

test("Benevolence counts exact physical cards cumulatively and spends its threshold once", { timeout: 120_000 }, async () => {
  async function open(cards, hp = 3) {
    const game = await createHumanGame(); const source = game.room.players[0]; const target = game.room.players[1];
    sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(source.id)}`); setHand(source.id, cards, hp, 4); setHand(target.id, [], 4, 4); setTurn(game.code, source.seat);
    return { game, source, target };
  }
  const one = await open([card("Attack", "rende-one")]);
  assert.equal((await request("trigger", { code: one.game.code, token: one.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-one"], targetId: one.target.id })).status, 200);
  assert.equal((await state(one.game.code, one.game.members[0].token)).data.players.find((player) => player.id === one.source.id).hp, 3, "one card does not reach the recovery threshold");

  const two = await open([card("Attack", "rende-two-a"), card("Dodge", "rende-two-b")]);
  const twoResult = await request("trigger", { code: two.game.code, token: two.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-two-a", "dodge-rende-two-b"], targetId: two.target.id });
  assert.equal(twoResult.status, 200, JSON.stringify(twoResult.data)); assert.equal(twoResult.data.room.players.find((player) => player.id === two.source.id).hp, 4, "two cards recover once when Liu Bei is eligible");
  assert.deepEqual(discardIds(two.game.code), [], "Benevolence transfers cards without touching discard");
  assert.deepEqual((await state(two.game.code, two.game.members[1].token)).data.myHand.map((held) => held.id), ["attack-rende-two-a", "dodge-rende-two-b"]);

  const split = await open([card("Attack", "rende-split-a"), card("Dodge", "rende-split-b")]);
  setHand(split.game.room.players[2].id, [], 4, 4);
  await request("trigger", { code: split.game.code, token: split.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-split-a"], targetId: split.target.id });
  const splitTarget = split.game.room.players[2];
  await request("trigger", { code: split.game.code, token: split.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["dodge-rende-split-b"], targetId: splitTarget.id });
  assert.equal((await state(split.game.code, split.game.members[0].token)).data.players.find((player) => player.id === split.source.id).hp, 4, "the threshold is cumulative across recipients and uses");
  assert.deepEqual((await state(split.game.code, split.game.members[2].token)).data.myHand.map((held) => held.id), ["dodge-rende-split-b"]);

  const full = await open([card("Attack", "rende-full-a"), card("Dodge", "rende-full-b"), card("Peach", "rende-full-c")], 4);
  await request("trigger", { code: full.game.code, token: full.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-full-a", "dodge-rende-full-b"], targetId: full.target.id });
  sql(`UPDATE players SET hp=3, hand_json=${quote(JSON.stringify([card("Peach", "rende-full-c")] ))} WHERE id=${quote(full.source.id)}`);
  await request("trigger", { code: full.game.code, token: full.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["peach-rende-full-c"], targetId: full.game.room.players[2].id });
  assert.equal((await state(full.game.code, full.game.members[0].token)).data.players.find((player) => player.id === full.source.id).hp, 3, "reaching the threshold at full HP spends the once-per-phase recovery event");

  const invalid = await open([card("Attack", "rende-invalid")]);
  const beforeInvalid = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(invalid.source.id)}`));
  assert.equal((await request("trigger", { code: invalid.game.code, token: invalid.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-invalid"], targetId: invalid.source.id })).status, 409);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(invalid.source.id)}`)), beforeInvalid, "an invalid self-target does not partially transfer cards");
  const stale = await open([card("Attack", "rende-stale")]);
  const staleView = await state(stale.game.code, stale.game.members[0].token); assert.ok(staleView.data.currentAction.triggerOptions.some((option) => option.effectId === "liu_bei_rende"));
  setHand(stale.source.id, [], 3, 4);
  const staleResult = await request("trigger", { code: stale.game.code, token: stale.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-stale"], targetId: stale.target.id });
  assert.equal(staleResult.status, 409); assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(stale.target.id)}`)).length, 0, "a stale hand selection does not partially transfer");

  const reset = await open([card("Attack", "rende-reset-give")]);
  await request("trigger", { code: reset.game.code, token: reset.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-reset-give"], targetId: reset.target.id });
  for (const player of reset.game.room.players.slice(1)) setHand(player.id, [], 4, 4);
  await request("end_turn", { code: reset.game.code, token: reset.game.members[0].token });
  for (let index = 1; index < reset.game.room.players.length; index++) { await request("draw", { code: reset.game.code, token: reset.game.members[index].token }); await request("end_turn", { code: reset.game.code, token: reset.game.members[index].token }); }
  const nextDraw = await request("draw", { code: reset.game.code, token: reset.game.members[0].token });
  assert.equal(nextDraw.status, 200, JSON.stringify(nextDraw.data));
  assert.ok((await state(reset.game.code, reset.game.members[0].token)).data.currentAction.triggerOptions.some((option) => option.effectId === "liu_bei_rende"), "Benevolence remains available on Liu Bei's next turn");
});

test("Influencing initiates a normal delegated Attack without leaking Shu hands", { timeout: 120_000 }, async () => {
  const game = await createHumanGame(); const source = game.room.players[0]; const firstShu = game.room.players[1]; const secondShu = game.room.players[2]; const target = game.room.players[3];
  const delegatedAttack = card("Attack", "influencing-attack"); const normalAttack = card("Attack", "influencing-normal");
  sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(source.id)}`); sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(firstShu.id)}`); sql(`UPDATE players SET hero='zhuge-liang' WHERE id=${quote(secondShu.id)}`); sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(target.id)}`);
  setHand(source.id, [normalAttack], 4, 4); setHand(firstShu.id, [delegatedAttack], 4, 4); setHand(secondShu.id, [], 4, 4); setHand(target.id, [], 4, 4); setTurn(game.code, source.seat);
  const projected = await state(game.code, game.members[0].token); const option = projected.data.currentAction.triggerOptions.find((candidate) => candidate.effectId === "liu_bei_jijiang");
  assert.ok(option, JSON.stringify(projected.data)); assert.equal(option.label, "Influencing"); assert.deepEqual(option.selection.targetIds, [firstShu.id, target.id]);
  const selected = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "liu_bei_jijiang", targetId: target.id });
  assert.equal(selected.status, 200, JSON.stringify(selected.data)); assert.equal(selected.data.room.currentAction.actorId, firstShu.id); assert.equal(selected.data.room.currentAction.reason.includes(delegatedAttack.id), false); assert.equal(JSON.stringify(selected.data.room.currentAction).includes(delegatedAttack.id), false);
  const accepted = await request("respond", { code: game.code, token: game.members[1].token, providerId: "card", cardId: delegatedAttack.id });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data)); assert.equal(accepted.data.room.players.find((player) => player.id === target.id).hp, 3); assert.equal(accepted.data.room.phase, "play-struck"); assert.ok(discardIds(game.code).includes(delegatedAttack.id));
  assert.deepEqual((await state(game.code, game.members[0].token)).data.myHand, [normalAttack], "the delegate's private hand is not projected to Liu Bei");

  const declinedGame = await createTestGame(); const declinedRoom = declinedGame.data.room; const declinedSource = declinedRoom.players[0]; const declinedFirst = declinedRoom.players[1]; const declinedSecond = declinedRoom.players[2]; const declinedTarget = declinedRoom.players[3]; const declinedToken = declinedGame.data.token; const followUpAttack = card("Attack", "influencing-follow-up");
  sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(declinedSource.id)}`); sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(declinedFirst.id)}`); sql(`UPDATE players SET hero='zhuge-liang' WHERE id=${quote(declinedSecond.id)}`); sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(declinedTarget.id)}`);
  setHand(declinedSource.id, [followUpAttack], 4, 4); setHand(declinedFirst.id, [], 4, 4); setHand(declinedSecond.id, [], 4, 4); setHand(declinedTarget.id, [], 4, 4); setTurn(declinedRoom.code, declinedSource.seat);
  const declinedStart = await request("trigger", { code: declinedRoom.code, token: declinedToken, providerId: "liu_bei_jijiang", targetId: declinedTarget.id, preserveResponse: true }); assert.equal(declinedStart.status, 200, JSON.stringify(declinedStart.data));
  const firstDecline = await request("decline_response", { code: declinedRoom.code, token: declinedToken, preserveResponse: true }); assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data)); assert.equal(firstDecline.data.room.currentAction.actorId, declinedSecond.id);
  const allDeclined = await request("decline_response", { code: declinedRoom.code, token: declinedToken, preserveResponse: true }); assert.equal(allDeclined.status, 200, JSON.stringify(allDeclined.data)); assert.equal(allDeclined.data.room.phase, "play"); assert.equal(discardIds(declinedRoom.code).includes(followUpAttack.id), false);
  const normal = await request("play_card", { code: declinedRoom.code, token: declinedToken, cardId: followUpAttack.id, targetId: declinedTarget.id }); assert.equal(normal.status, 200, JSON.stringify(normal.data));
});

test("Influencing reuses the normal Attack pipeline for semantic providers", { timeout: 120_000 }, async () => {
  const nonLord = await createHumanGame(); const nonLordSource = nonLord.room.players[0]; const nonLordDelegate = nonLord.room.players[1]; const nonLordTarget = nonLord.room.players[2];
  sql(`UPDATE players SET hero='liu-bei', role='Loyalist' WHERE id=${quote(nonLordSource.id)}`); sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(nonLordDelegate.id)}`); setHand(nonLordSource.id, [], 4, 4); setHand(nonLordDelegate.id, [card("Attack", "non-lord-attack")], 4, 4); setHand(nonLordTarget.id, [], 4, 4); setTurn(nonLord.code, nonLordSource.seat);
  assert.equal((await state(nonLord.code, nonLord.members[0].token)).data.currentAction.triggerOptions?.some((option) => option.effectId === "liu_bei_jijiang") ?? false, false, "a non-Lord Liu Bei does not project Influencing");
  assert.equal((await request("trigger", { code: nonLord.code, token: nonLord.members[0].token, providerId: "liu_bei_jijiang", targetId: nonLordTarget.id })).status, 409);

  const cases = [
    { hero: "guan-yu", providerId: "guan_yu_red_card_attack", material: { ...card("Peach", "influencing-god-of-war"), suit: "♥" }, selection: { cardId: "peach-influencing-god-of-war" }, playedAs: "attack" },
    { hero: "zhao-yun", providerId: "zhao_yun_dodge_as_attack", material: card("Dodge", "influencing-braveheart"), selection: { cardId: "dodge-influencing-braveheart" }, playedAs: "attack" },
    { hero: "guan-yu", providerId: "serpent_spear_attack", material: [card("Peach", "influencing-spear-one"), card("Dodge", "influencing-spear-two")], selection: { cardIds: ["peach-influencing-spear-one", "dodge-influencing-spear-two"] }, equipment: { weapon: card("SerpentSpear", "influencing-spear") } },
  ];
  for (const scenario of cases) {
    const game = await createHumanGame(); const source = game.room.players[0]; const delegate = game.room.players[1]; const target = game.room.players[3];
    const materials = Array.isArray(scenario.material) ? scenario.material : [scenario.material];
    for (const player of game.room.players) sql(`UPDATE players SET hero=NULL WHERE id=${quote(player.id)}`);
    sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(source.id)}`); sql(`UPDATE players SET hero=${quote(scenario.hero)} WHERE id=${quote(delegate.id)}`); sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(target.id)}`);
    setHand(source.id, [], 4, 4); setHand(delegate.id, materials, 4, 4); setHand(game.room.players[2].id, [], 4, 4); setHand(target.id, [], 4, 4); setEquipment(delegate.id, scenario.equipment ?? {}); setTurn(game.code, source.seat);
    const before = (await state(game.code, game.members[0].token)).data;
    assert.ok(before.currentAction.triggerOptions.some((option) => option.effectId === "liu_bei_jijiang"), `${scenario.providerId} keeps active Influencing visible before Attack use`);
    const opened = await request("trigger", { code: game.code, token: game.members[0].token, providerId: "liu_bei_jijiang", targetId: target.id, preserveResponse: true });
    assert.equal(opened.status, 200, JSON.stringify(opened.data));
    const delegateView = (await state(game.code, game.members[1].token)).data;
    const provider = delegateView.currentAction.options.find((option) => option.providerId === scenario.providerId);
    assert.ok(provider, `${scenario.providerId} is projected privately to the delegate`);
    assert.equal(JSON.stringify((await state(game.code, game.members[0].token)).data.currentAction).includes(materials[0].id), false, "the requester does not see delegate card identity");
    const accepted = await request("respond", { code: game.code, token: game.members[1].token, providerId: scenario.providerId, ...scenario.selection });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
    assert.equal(accepted.data.room.players.find((player) => player.id === target.id).hp, 3, `${scenario.providerId} enters the ordinary Dodge/damage pipeline`);
    for (const material of materials) assert.ok(discardIds(game.code).includes(material.id), `${scenario.providerId} consumes ${material.id}`);
    assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(delegate.id)}`)).length, 0, `${scenario.providerId} removes provider costs from the delegate`);
    assert.equal((await state(game.code, game.members[0].token)).data.currentAction.triggerOptions?.some((option) => option.effectId === "liu_bei_jijiang") ?? false, false, "a successful delegated Attack consumes Liu Bei's normal Attack allowance");
  }
});

test("Delegated Duel keeps Liu Bei as the duelist and damage source", { timeout: 120_000 }, async () => {
  const game = await createHumanGame(); const source = game.room.players[0]; const liu = game.room.players[1]; const shu = game.room.players[2];
  const duel = card("Duel", "influencing-duel"); const attack = card("Attack", "influencing-duel-attack");
  for (const player of game.room.players) sql(`UPDATE players SET hero=NULL WHERE id=${quote(player.id)}`);
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`); sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(liu.id)}`); sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(shu.id)}`);
  setHand(source.id, [duel], 4, 4); setHand(liu.id, [], 4, 4); setHand(shu.id, [attack], 4, 4); setHand(game.room.players[3].id, [], 4, 4); setTurn(game.code, source.seat);
  assert.equal((await request("play_card", { code: game.code, token: game.members[0].token, cardId: duel.id, targetId: liu.id })).status, 200);
  const liuView = await state(game.code, game.members[1].token); assert.ok(liuView.data.currentAction.options.some((option) => option.providerId === "liu_bei_jijiang"));
  assert.equal((await request("respond", { code: game.code, token: game.members[1].token, providerId: "liu_bei_jijiang", preserveResponse: true })).status, 200);
  assert.equal((await request("respond", { code: game.code, token: game.members[2].token, providerId: "card", cardId: attack.id, preserveResponse: true })).status, 200);
  const afterLiu = await state(game.code, game.members[0].token);
  assert.equal(afterLiu.data.currentAction.actorId, source.id, "the next Duel response returns to Cao Cao, not Guan Yu");
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(shu.id)}`)).length, 0);
  const failed = await request("decline_response", { code: game.code, token: game.members[0].token });
  assert.equal(failed.status, 200, JSON.stringify(failed.data));
  assert.equal(failed.data.room.players.find((player) => player.id === source.id).hp, 3, "a failed response damages the current semantic duelist");
  assert.ok(failed.data.room.log.some((entry) => entry.includes(liu.name)), `Liu Bei is the semantic Duel damage source: ${JSON.stringify(failed.data.room.log)}`);
});

test("Delegated Borrowed Sword Attack spends the delegate's cards but attacks as Liu Bei", { timeout: 120_000 }, async () => {
  const game = await createHumanGame(); const source = game.room.players[0]; const liu = game.room.players[1]; const shu = game.room.players[2]; const target = game.room.players[3];
  const borrowed = card("BorrowedSword", "influencing-borrowed"); const weapon = card("GreenDragonBlade", "influencing-borrowed-weapon"); const attack = card("Attack", "influencing-borrowed-attack");
  for (const player of game.room.players) sql(`UPDATE players SET hero=NULL WHERE id=${quote(player.id)}`);
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`); sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(liu.id)}`); sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(shu.id)}`);
  setHand(source.id, [borrowed], 4, 4); setHand(liu.id, [], 4, 4); setHand(shu.id, [attack], 4, 4); setHand(target.id, [], 4, 4); setEquipment(liu.id, { weapon }); setTurn(game.code, source.seat);
  assert.equal((await request("play_card", { code: game.code, token: game.members[0].token, cardId: borrowed.id, targetId: liu.id })).status, 200);
  assert.equal((await request("choose_borrowed_sword_target", { code: game.code, token: game.members[0].token, targetId: target.id, preserveResponse: true })).status, 200);
  assert.equal((await request("respond", { code: game.code, token: game.members[1].token, providerId: "liu_bei_jijiang", preserveResponse: true })).status, 200);
  const delegated = await request("respond", { code: game.code, token: game.members[2].token, providerId: "card", cardId: attack.id, preserveResponse: true });
  assert.equal(delegated.status, 200, JSON.stringify(delegated.data));
  const pending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(pending.continuation.sourceId, liu.id, "Borrowed Sword uses Liu Bei as semantic attacker");
  assert.equal(pending.actorId, target.id);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(shu.id)}`)), [], "provider cost leaves the delegate's hand");
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(liu.id)}`)), [], "the semantic attacker does not pay the delegate's card cost");
  assert.equal((await request("decline_response", { code: game.code, token: game.members[3].token })).status, 200);
  assert.equal((await state(game.code, game.members[0].token)).data.players.find((player) => player.id === target.id).hp, 3);
});

test("Hujia prompts a living Wei character even when that character has no Dodge", { timeout: 120_000 }, async () => {
  const game = await openHujiaScenario({ delegateHero: "simayi" });
  const activated = await request("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  assert.equal(activated.data.error, undefined);
  assert.equal(activated.data.room.currentAction.actorId, game.delegate.id);
  const delegateView = await state(game.code, game.delegateMember.token);
  assert.deepEqual(delegateView.data.currentAction.legalActions, ["decline_response"]);
  assert.deepEqual(delegateView.data.currentAction.options, []);
  assert.match(delegateView.data.currentAction.reason, /^Cao Cao asks you to provide Dodge with Entourage\.$/);
  const caoView = await state(game.code, game.caoMember.token);
  assert.doesNotMatch(caoView.data.currentAction.reason, /no Dodge/i);
});

test("Hujia lets a Wei character with Dodge cancel the Attack", { timeout: 120_000 }, async () => {
  const dodge = card("Dodge", "hujia-regression-dodge");
  const game = await openHujiaScenario({ delegateHero: "simayi", delegateCards: [dodge] });
  const activated = await request("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
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
  const activated = await request("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  assert.equal(activated.data.room.currentAction.actorId, game.delegate.id);
  const firstDecline = await request("decline_response", { code: game.code, token: game.delegateMember.token, preserveResponse: true });
  assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data));
  assert.equal(firstDecline.data.room.currentAction.actorId, game.third.id);
  const answered = await request("respond", { code: game.code, token: game.thirdMember.token, cardId: dodge.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.equal(answered.data.room.players.find((player) => player.id === game.cao.id).hp, 4);
});

test("Hujia returns to Cao Cao after every Wei character declines without looping", { timeout: 120_000 }, async () => {
  const game = await openHujiaScenario({ delegateHero: "simayi", thirdHero: "zhang-liao" });
  const activated = await request("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  const firstDecline = await request("decline_response", { code: game.code, token: game.delegateMember.token, preserveResponse: true });
  assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data));
  assert.equal(firstDecline.data.room.currentAction.actorId, game.third.id);
  const secondDecline = await request("decline_response", { code: game.code, token: game.thirdMember.token, preserveResponse: true });
  assert.equal(secondDecline.status, 200, JSON.stringify(secondDecline.data));
  assert.equal(secondDecline.data.room.currentAction.actorId, game.cao.id);
  const caoAfterDelegation = await state(game.code, game.caoMember.token);
  assert.deepEqual(caoAfterDelegation.data.currentAction.legalActions, ["decline_response"]);
  assert.deepEqual(caoAfterDelegation.data.currentAction.options, []);
  const finalDecline = await request("decline_response", { code: game.code, token: game.caoMember.token, preserveResponse: true });
  assert.equal(finalDecline.status, 200, JSON.stringify(finalDecline.data));
  assert.equal(finalDecline.data.room.players.find((player) => player.id === game.cao.id).hp, 3);
});

test("Hujia fallback lets Cao Cao use his own Dodge after all Wei declines", { timeout: 120_000 }, async () => {
  const dodge = card("Dodge", "hujia-fallback-dodge");
  const game = await openHujiaScenario({ delegateHero: "simayi", caoCards: [dodge] });
  const activated = await request("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  const declined = await request("decline_response", { code: game.code, token: game.delegateMember.token, preserveResponse: true });
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
  sql("UPDATE players SET hero='liu-bei', role='Lord' WHERE id=" + quote(liu.id));
  sql("UPDATE players SET hero='guan-yu' WHERE id=" + quote(firstShu.id));
  sql("UPDATE players SET hero='zhao-yun' WHERE id=" + quote(secondShu.id));
  setHand(source.id, [invasion], 4, 4); setHand(liu.id, [], 4, 4); setHand(firstShu.id, [], 4, 4); setHand(secondShu.id, [attack], 4, 4); setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: invasion.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const liuView = await state(game.code, liuMember.token);
  assert.ok(liuView.data.currentAction.options.some((option) => option.providerId === "liu_bei_jijiang"));
  const activated = await request("respond", { code: game.code, token: liuMember.token, providerId: "liu_bei_jijiang", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  assert.equal(activated.data.room.currentAction.actorId, firstShu.id);
  const firstDecline = await request("decline_response", { code: game.code, token: firstShuMember.token, preserveResponse: true });
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
  if (attack.data.room.currentAction?.kind === "response") {
    const declined = await request("decline_response", { code: game.code, token: targetMember.token });
    assert.equal(declined.status, 200, JSON.stringify(declined.data));
  }
  const settled = (await state(game.code, sourceMember.token)).data;
  assert.equal(settled.currentAction.kind, "trigger", JSON.stringify(settled));
  assert.equal(settled.currentAction.triggerEvent, "damage_suffered");
  assert.equal(settled.currentAction.actorId, target.id);
  return { ...game, sourceMember, targetMember, source, target, actionPresentation: settled.currentAction.presentation };
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
  if (attack.data.room.currentAction?.kind === "response") {
    const declined = await request("decline_response", { code: game.code, token: targetMember.token });
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
  await passNegationWindows(game.code, game.members);
  const settled = await state(game.code, sourceMember.token);
  assert.equal(settled.data.currentAction.kind, "trigger", JSON.stringify(settled.data));
  assert.equal(settled.data.currentAction.triggerEvent, "damage_suffered");
  assert.equal(settled.data.currentAction.actorId, target.id);
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

test("host test flow follows the Xiahou Dun Group trigger perspective", { timeout: 30_000 }, async () => {
  const quick = await createTestGame();
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
  assert.equal(opened.data.room.meId, xiahou.id, "host test flow follows the Group trigger actor");
  assert.equal(opened.data.room.isMyAction, true);
  assert.deepEqual(opened.data.room.players.map((player) => player.handCards), [[], [], [], []]);
  const declined = await request("decline_trigger", { code: room.code, token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.phase, "play");
  assert.equal(discardIds(room.code).filter((id) => id === "rainingarrows-quick-group-ganglie").length, 1);
});

test("host test flow exhausts each AOE Negation window before the target response, with one private hand", async () => {
  for (const [kind, required] of [["RainingArrows", "Dodge"], ["BarbarianInvasion", "Attack"]]) {
  const created = await createTestGame(); const { token, room } = created.data;
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
  const created = await createTestGame(); const { token, room } = created.data;
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
    assert.equal(result.data.room.pendingNegation.responseTarget, `${p2.name}'s Negation`);
    result = await act("decline_response");
  }
  assert.equal(result.data.room.pendingNegation, null);
  assert.equal(result.data.room.currentAction.actorId, p1.id);
  assert.equal(result.data.room.pendingGroup.requiredKind, "Attack");
  result = await act("respond", { cardId: "attack-self-1" });
  assert.equal(result.data.room.pendingNegation.effectTargetId, p2.id);
});

test("AOE Attack capability preserves legal conversions and auto-damages only without a response", async () => {
  const created = await createTestGame(); const { token, room } = created.data;
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
  const duelAnswer = await request("respond", { code: game.code, token: alice.token, providerId: "serpent_spear_attack", cardIds: ["peach-duel-one", "dodge-duel-two"], preserveResponse: true });
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

test("host test flow follows the live actor for Something Out of Nothing and rejects stale actions", { timeout: 30_000 }, async () => {
  const quick = await createTestGame(); const { token, room } = quick.data;
  const [me, playerOne, playerTwo, playerThree] = room.players;
  const openingHandKinds = (player) => JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(player.id)}`)).map((held) => held.kind);
  assert.equal(me.hero, "guan-yu", "Player1 is Guan Yu for Wusheng coverage");
  assert.equal(playerOne.hero, "simayi", "Player2 is Sima Yi for Guicai coverage");
  assert.equal(playerTwo.hero, "zhao-yun", "Player3 is Zhao Yun for Longdan coverage");
  assert.equal(playerThree.hero, "xiahou-dun", "Player4 is Xiahou Dun for Stauchness coverage");
  const openingPlayers = [me, playerOne, playerTwo, playerThree];
  assert.ok(openingPlayers.every((player) => openingHandKinds(player).length === 4), "every host test flow seat receives four opening cards");
  assert.equal(JSON.parse(query(`SELECT COUNT(*) FROM json_each((SELECT deck_json FROM rooms WHERE code=${quote(room.code)}))`)), 92, "host test flow uses the same 4-card opening deal as normal games");
  setHand(me.id, [], 3, 3); setHand(playerOne.id, [card("DrawTwo", "quick-live")], 3, 3); setHand(playerTwo.id, [card("Negation", "quick-live")], 3, 3); setHand(playerThree.id, [], 3, 3); setTurn(room.code, playerOne.seat, "play");
  const before = await state(room.code, token);
  const played = await request("play_card", { code: room.code, token, cardId: "drawtwo-quick-live" });
  assert.equal(played.status, 200); assert.equal(played.data.room.phase, "response");
  assert.equal(played.data.room.pendingNegation.kind, "negation", "the public pending DTO retains its discriminator for the client normalizer");
  assert.deepEqual(played.data.room.pending, { kind: "response" }, "the canonical pending view exposes one semantic response discriminator");
  assert.equal(played.data.room.currentAction.kind, "response"); assert.equal(played.data.room.currentAction.actorId, playerTwo.id);
  assert.deepEqual(played.data.room.currentAction.legalActions.sort(), ["decline_response", "respond"], "only the active host test flow seat receives canonical response actions");
  assert.equal(played.data.room.currentAction.requirement, "negate");
  assert.equal(played.data.room.currentAction.options[0]?.providerId, "negation_card");
  assert.equal(played.data.room.pendingNegation.actorId, playerTwo.id); assert.equal(played.data.room.actionPlayerId, playerTwo.id); assert.equal(played.data.room.meId, playerTwo.id); assert.equal(played.data.room.isMyAction, true);
  const responseTarget = played.data.room.pendingNegation.responseTarget;
  assert.ok(played.data.room.timeline.some((event) => (event.message ?? "").includes("Negation window opens") && (event.message ?? "").includes(responseTarget)), "the response window is visible in the event history");
  const stale = await request("decline_response", { code: room.code, token, context: { actionRevision: before.data.actionRevision, meId: playerOne.id, phase: "play", pendingKind: null, actorId: playerOne.id } });
  assert.equal(stale.status, 409); assert.equal(stale.data.stale, true); assert.equal(stale.data.room.meId, playerTwo.id); assert.equal(stale.data.room.pendingNegation.actorId, playerTwo.id);
  const passed = await request("decline_response", { code: room.code, token });
  assert.equal(passed.status, 200); assert.equal(passed.data.room.phase, "play"); assert.equal(passed.data.room.pendingNegation, null);
  assert.ok(passed.data.room.timeline.some((event) => (event.message ?? "").includes("Negation window closes") && (event.message ?? "").includes(responseTarget)), "the completed response window is visible in the event history");
});

test("host test flow Something Out of Nothing resolves without a generic damage response", { timeout: 30_000 }, async () => {
  const quick = await createTestGame(); const { token, room } = quick.data;
  const [me, playerOne, playerTwo, playerThree] = room.players;
  setHand(me.id, [], 3, 3); setHand(playerOne.id, [card("DrawTwo", "quick-no-negation")], 3, 3); setHand(playerTwo.id, [], 3, 3); setHand(playerThree.id, [], 3, 3); setTurn(room.code, playerOne.seat, "play");
  const result = await request("play_card", { code: room.code, token, cardId: "drawtwo-quick-no-negation" });
  assert.equal(result.status, 200); assert.equal(result.data.room.phase, "play"); assert.equal(result.data.room.pendingNegation, null); assert.equal(result.data.room.pendingGroup, null); assert.equal(result.data.room.players.find((player) => player.id === playerOne.id).hp, 3); assert.equal(result.data.drawnCards.length, 2);
});

test("host test flow accepts only one competing response submission", { timeout: 30_000 }, async () => {
  const quick = await createTestGame(); const { token, room } = quick.data;
  const [me, playerOne, playerTwo, playerThree] = room.players;
  setHand(me.id, [card("BarbarianInvasion", "quick-race")], 3, 3); setHand(playerOne.id, [card("Attack", "quick-race")], 3, 3); setHand(playerTwo.id, [], 3, 3); setHand(playerThree.id, [], 3, 3); setTurn(room.code, me.seat, "play");
  const started = await request("play_card", { code: room.code, token, cardId: "barbarianinvasion-quick-race" });
  assert.equal(started.status, 200); assert.equal(started.data.room.currentAction.actorId, playerOne.id);
  const raceContext = { actionRevision: started.data.room.actionRevision, meId: playerOne.id, phase: "response", pendingKind: "response", actorId: playerOne.id };
  const [manual, timeout] = await Promise.all([
    request("respond", { code: room.code, token, cardId: "attack-quick-race", context: raceContext, preserveResponse: true }),
    request("decline_response", { code: room.code, token, context: raceContext, preserveResponse: true }),
  ]);
  assert.equal([manual.status, timeout.status].filter((status) => status === 200).length, 1);
  assert.equal([manual.status, timeout.status].filter((status) => status === 409).length, 1);
  await drainEmptyPrivateDecisions(room.code, token);
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
    const created = await createTestGame();
    const { token, room } = created.data;
    const code = room.code;
    const zhen = room.players.find((player) => player.seat === 3);
    assert.ok(zhen, "host test flow exposes a deterministic Player4 seat for the Luoshen fixture");
    sql(`UPDATE players SET hero='zhen-ji', hp=3, max_hp=3, hero_options_json='[]' WHERE id=${quote(zhen.id)}`);
    const previous = room.players.find((player) => player.seat === (zhen.seat + 3) % room.players.length);
    assert.ok(previous);
    for (const player of room.players) setHand(player.id, [], player.hp ?? 3, player.maxHp ?? 3);
    const sima = room.players.find((player) => player.hero === "simayi");
    assert.ok(sima, "host test flow exposes Sima Yi in Player2 for Guicai coverage");
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
  assert.deepEqual(sequence.room.currentAction.triggerOptions.map((option) => option.label), ["Godess of Luo River"]);

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
  assert.ok(redReplaced.data.room.log.some((entry) => entry.includes("Sima Yi replaces the Judgement card with 7♠ using Necromancy.")));
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

test("host test flow projects Stauchness privately through the generic currentAction", { timeout: 30_000 }, async () => {
  const quick = await createTestGame();
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
  assert.deepEqual(accepted.data.room.players.map((player) => player.handCards), [[], [], [], []], "host test flow never projects other hands");
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

test("host test flow follows Sima Yi only while he owns the Retaliation decision", { timeout: 30_000 }, async () => {
  const started = await createTestGame();
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
