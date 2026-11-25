import test from "node:test";
import {
  assert, card, query, quote, request, requestAndSettle, runBotScheduler, runBotStep,
  setDeck, setEquipment, setHand, setJudgement, setTurn, roomCardCount, sql, state,
} from "./test-support.mjs";

const hourlyAddLimitDisabledForTest = process.env.GAME_TEST_BOT_DEMO_DISABLE_HOURLY_ADD_LIMIT === "true";

function seedActiveBotRoom({ code, phase = "play", lastActivityAt = Date.now() }) {
  const roomId = crypto.randomUUID();
  const botId = crypto.randomUUID();
  sql(`INSERT INTO rooms (id, code, host_player_id, status, max_players, created_at, last_activity_at, phase, test_room)
    VALUES (${quote(roomId)}, ${quote(code)}, ${quote(crypto.randomUUID())}, 'playing', 4,
      ${lastActivityAt}, ${lastActivityAt}, ${quote(phase)}, 0)`);
  sql(`INSERT INTO players (id, room_id, name, token_hash, seat, connected_at, controller_type)
    VALUES (${quote(botId)}, ${quote(roomId)}, 'CAP BOT', ${quote(`bot:no-login:${botId}`)}, 0, ${Date.now()}, 'bot')`);
  return roomId;
}

async function createBotGame() {
  sql("DELETE FROM bot_demo_rate_limits");
  const created = await requestAndSettle("create", { name: "Scheduler Host" });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const code = created.data.room.code;
  const hostId = created.data.room.meId;
  for (let index = 0; index < 3; index++) {
    const added = await requestAndSettle("add_bot", { code, token: created.data.token, requestId: crypto.randomUUID() });
    assert.equal(added.status, 201, JSON.stringify(added.data));
  }

  let room = (await requestAndSettle("start", { code, token: created.data.token })).data.room;
  for (let guard = 0; room.status === "heroes" && guard < 8; guard++) {
    const actor = room.players.find((player) => player.id === room.actionPlayerId);
    assert.ok(actor, "the Hero selector is exposed by the server projection");
    if (actor.id === hostId) {
      const selected = await requestAndSettle("choose_hero", { code, token: created.data.token, heroId: room.myHeroOptions[0]?.id });
      assert.equal(selected.status, 200, JSON.stringify(selected.data));
    } else {
      const selected = await runBotStep(code, actor.id, { actionRevision: room.actionRevision, decisionId: crypto.randomUUID() });
      assert.equal(selected.status, 200, JSON.stringify(selected.data));
      assert.notEqual(selected.data.state, "unsupported", JSON.stringify(selected.data));
    }
    room = (await state(code, created.data.token)).data;
  }
  assert.equal(room.status, "playing", "the normal Hero flow initializes the room before scheduler assertions");
  const bots = room.players.filter((player) => player.isBot);
  const safeDemoGeneralIds = new Set([
    "cao-cao", "liu-bei", "sun-quan", "xiahou-dun", "guo-jia", "guan-yu", "zhang-fei", "zhao-yun", "ma-chao",
    "gan-ning", "huang-gai", "sun-shangxiang", "hua-tuo", "lü-bu", "huaxiong", "gongsun-zan", "pan-feng",
  ]);
  assert.ok(bots.every((bot) => safeDemoGeneralIds.has(bot.hero)), "Staging demo bots choose only their server-assigned safe Hero subset");
  for (const assignment of JSON.parse(query(`SELECT json_group_array(json_object('role', role, 'hero', hero, 'options', json(hero_options_json))) FROM players WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)}) AND controller_type='bot'`))) {
    const options = assignment.options;
    assert.ok(options.every((option) => safeDemoGeneralIds.has(option.id)), "the bot's assigned candidates remain inside the safe Staging demo pool");
    assert.ok(options.some((option) => option.id === assignment.hero), "the selected bot Hero came from its server-assigned candidates");
  }
  return { code, token: created.data.token, hostId, room, bots };
}

async function logRolePolicyDiagnostic(code, token, fixture) {
  const view = (await state(code, token)).data ?? {};
  const pendingRaw = query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`);
  let pending = null;
  try { pending = pendingRaw ? JSON.parse(pendingRaw) : null; } catch { pending = { kind: "malformed" }; }
  const actor = view.players?.find(({ id }) => id === view.actionPlayerId);
  console.error(JSON.stringify({
    fixture,
    phase: view.phase ?? null,
    pendingKind: pending?.kind ?? null,
    pendingEvent: pending?.event ?? null,
    actorSeat: actor?.seat ?? null,
    heroIds: view.players?.map(({ hero }) => hero ?? null) ?? [],
    turnSeat: Number(query(`SELECT turn_seat FROM rooms WHERE code=${quote(code)}`) || 0),
    transitionKind: view.currentAction?.kind ?? null,
    legalActions: view.currentAction?.legalActions ?? [],
  }));
}

test("a long Bot room refreshes the final authenticated projection without leaking private state", async () => {
  const { code, token, hostId, bots } = await createBotGame();
  const hostSeat = Number(query(`SELECT seat FROM players WHERE id=${quote(hostId)}`));
  const privateBotCard = card("Dodge", "perf-bot-private");
  const newCards = [card("Peach", "perf-draw"), card("Dismantle", "perf-draw")];
  setHand(bots[0].id, [privateBotCard], 4, 4);
  setHand(hostId, [], 3, 3);
  setDeck(code, newCards);
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  sql(`UPDATE players SET hero='sun-quan', role='Renegade', alive=1 WHERE id=${quote(hostId)};
    UPDATE players SET role='Lord' WHERE id=${quote(bots[0].id)};
    UPDATE players SET role='Rebel' WHERE id IN (${quote(bots[1].id)},${quote(bots[2].id)});`);
  setTurn(code, hostSeat, "draw");

  const publicEventCount = 203;
  const log = Array.from({ length: publicEventCount }, (_, index) => {
    const publicSequence = index + 1;
    return `@event:${JSON.stringify({ id: `perf-event-${index}`, message: `Fixture action ${index}`, publicSequence, publicSequenceWatermark: publicSequence })}`;
  });
  log.push(`@card:${JSON.stringify({ id: "perf-private-event", action: "gain", presentation: false,
    privateToPlayerId: bots[0].id, card: privateBotCard, publicSequenceWatermark: publicEventCount })}`);
  assert.equal(log.filter((entry) => entry.startsWith("@event:")).length, publicEventCount);
  sql(`UPDATE rooms SET log_json=${quote(JSON.stringify(log))} WHERE id=${quote(roomId)}`);
  const now = Date.now();
  const work = Array.from({ length: 150 }, (_, index) => {
    const bot = bots[index % bots.length];
    const status = index < bots.length ? "unsupported" : "consumed";
    return `(${quote(`${roomId}-perf-work-${index}`)},${quote(roomId)},${quote(bot.id)},${quote(`perf-revision-${index}`)},
      ${quote(status)},${now + index},${now + index},${now + index})`;
  });
  sql(`INSERT INTO bot_work (decision_id,room_id,bot_id,action_revision,status,available_at,created_at,updated_at) VALUES ${work.join(",")}`);

  const start = performance.now();
  const owner = await state(code, token);
  const anonymous = await state(code, "");
  const denied = await state(code, token, false, bots[0].id);
  assert.equal(owner.status, 200);
  assert.equal(anonymous.status, 200);
  assert.equal(denied.status, 403);
  assert.ok(owner.data.timeline.length >= 200, "the synthetic long room returns at least 200 public timeline events");
  assert.deepEqual(owner.data.timeline, anonymous.data.timeline);
  assert.equal(owner.data.actionRevision, anonymous.data.actionRevision);
  assert.equal(owner.data.currentAction.actorId, hostId);
  assert.equal(owner.data.myRole, "Spy");
  assert.equal(anonymous.data.myRole, null);
  assert.equal(anonymous.data.players.find(({ id }) => id === hostId).role, null);
  assert.equal(anonymous.data.players.find(({ id }) => id === bots[0].id).role, "Lord");
  assert.ok(owner.data.players.filter(({ isBot }) => isBot).every(({ botStatus }) => botStatus === "waiting_for_human"));
  assert.ok(!JSON.stringify(owner.data).includes(privateBotCard.id));

  const drawn = await request("draw", { code, token });
  assert.equal(drawn.status, 200, JSON.stringify(drawn.data));
  const refreshed = await state(code, token);
  assert.equal(refreshed.data.actionRevision, drawn.data.room.actionRevision);
  assert.deepEqual(refreshed.data.currentAction, drawn.data.room.currentAction);
  assert.deepEqual(refreshed.data.timeline, drawn.data.room.timeline);
  assert.deepEqual(refreshed.data.presentationSnapshot, drawn.data.room.presentationSnapshot);
  assert.deepEqual(refreshed.data.myHand, newCards);

  const stratagem = await request("play_card", { code, token, cardId: newCards[1].id, targetId: bots[0].id });
  assert.equal(stratagem.status, 200, JSON.stringify(stratagem.data));
  const response = await state(code, token);
  assert.equal(response.data.phase, "response");
  assert.equal(response.data.currentAction.kind, "response");
  assert.equal(response.data.actionRevision, stratagem.data.room.actionRevision);
  assert.ok(!JSON.stringify(response.data).includes(privateBotCard.id));
  const windowId = response.data.currentAction.negationWindowId;
  assert.ok(windowId, "the real Dismantle action opens the server-owned shared Negation response");
  const botPasses = [];
  for (let wake = 0; wake < 3; wake++) {
    const pass = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
    assert.equal(pass.status, 200, JSON.stringify(pass.data));
    assert.equal(pass.data.steps, 1, `room-scoped wake ${wake + 1} must dispatch one Bot decision`);
    botPasses.push(pass);
  }
  assert.equal(botPasses.reduce((total, pass) => total + pass.data.consumed, 0), 3,
    JSON.stringify(botPasses.map((pass) => pass.data)));
  assert.equal(query(`SELECT COUNT(*) FROM negation_window_submissions WHERE window_id=${quote(windowId)}`), "3");
  assert.equal((await state(code, token)).data.currentAction.negationWindowId, windowId,
    "the shared response remains open for the human after all three Bot passes");
  const passed = await request("decline_response", { code, token });
  assert.equal(passed.status, 200, JSON.stringify(passed.data));
  assert.equal((await state(code, token)).data.pendingTargetCard?.targetId, bots[0].id,
    "the canonical Negation pass resumes Dismantle's target-card continuation");

  sql(`UPDATE players SET hp=0, alive=0 WHERE id=${quote(hostId)}`);
  setTurn(code, bots[0].seat, "play");
  const defeated = await state(code, token);
  assert.equal(defeated.data.players.find(({ id }) => id === hostId).alive, false);
  assert.equal(defeated.data.players.find(({ id }) => id === hostId).hp, 0);
  assert.deepEqual(defeated.data.currentAction.legalActions, []);
  assert.ok(!JSON.stringify(defeated.data).includes(privateBotCard.id));
  console.info(JSON.stringify({ fixture: "long-bot-room-shared-negation", publicEvents: publicEventCount,
    seededBotWorkRows: work.length, botNegationPasses: botPasses.reduce((total, pass) => total + pass.data.consumed, 0),
    wallMs: Math.round(performance.now() - start), responseBytes: Buffer.byteLength(JSON.stringify(owner.data)) }));
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("persistent scheduler waits for a human Hero choice, then consumes one unique revision per bot", async () => {
  sql("DELETE FROM bot_demo_rate_limits");
  const created = await requestAndSettle("create", { name: "Scheduler Hero Host" });
  assert.equal(created.status, 201);
  const code = created.data.room.code;
  const token = created.data.token;
  const hostId = created.data.room.meId;
  for (let index = 0; index < 3; index++) {
    const added = await requestAndSettle("add_bot", { code, token, requestId: crypto.randomUUID() });
    assert.equal(added.status, 201, JSON.stringify(added.data));
  }
  await requestAndSettle("start", { code, token });
  // Keep this scheduler boundary deterministic: the host is the first normal
  // selector, followed by the three bots in seat order.
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(hostId)}`);
  let room = (await state(code, token)).data;
  assert.equal(room.actionPlayerId, hostId, "the Lord owns the first Hero decision");
  const revision = room.actionRevision;
  const waiting = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 4, captureDiagnostics: true });
  assert.equal(waiting.status, 200, JSON.stringify(waiting.data));
  assert.equal(waiting.data.steps, 0, "no bot acts while the human owns Hero selection");
  assert.deepEqual(waiting.data.diagnostics, [], "idle scheduler wakes and human-owned choices emit no custom Bot diagnostics");
  assert.equal((await state(code, token)).data.actionRevision, revision);
  assert.equal(query(`SELECT COUNT(*) FROM bot_work WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)})`), "0");

  const hero = room.myHeroOptions[0];
  assert.ok(hero);
  const chosen = await requestAndSettle("choose_hero", { code, token, heroId: hero.id });
  assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
  const scheduled = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 3, captureDiagnostics: true });
  assert.equal(scheduled.status, 200, JSON.stringify(scheduled.data));
  assert.equal(scheduled.data.steps, 3);
  assert.equal(scheduled.data.consumed, 3);
  assert.equal(scheduled.data.diagnostics.filter((event) => event.event === "bot_work_transition" && event.nextStatus === "consumed").length, 3);
  assert.ok(scheduled.data.diagnostics.every((event) => event.roomCode === code && event.wakeSource === "cron"));
  room = (await state(code, token)).data;
  assert.equal(room.status, "playing");
  assert.ok(room.players.filter((player) => player.isBot).every((player) => player.hero), "bots use their assigned Hero choices");
  assert.equal(query(`SELECT COUNT(*) FROM bot_work WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)}) AND status='consumed'`), "3");
  assert.equal(query(`SELECT actions_reserved FROM bot_room_scheduler WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)})`), "3");
  assert.equal(JSON.stringify(scheduled.data).includes("myHand"), false, "scheduler evidence contains only bounded counters");
  const duplicateWake = await runBotScheduler({ roomCode: code, captureDiagnostics: true });
  assert.deepEqual(duplicateWake.data.diagnostics, [], "repeated wakeups do not duplicate completed-work logs");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("unscoped scheduler ignores stale rooms while an explicit target can recover one", async () => {
  const { code, token, bots } = await createBotGame();
  const bot = bots[0];
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  // Keep this test's candidate set isolated from rooms left by an earlier
  // focused case. The local fixture is disposable; no hosted D1 is touched.
  sql(`UPDATE rooms SET status='finished', phase='finished'
    WHERE status IN ('heroes', 'playing') AND id <> ${quote(roomId)}
      AND id IN (SELECT DISTINCT room_id FROM players WHERE controller_type='bot' AND is_test_player=0)`);
  setHand(bot.id, [], 4, 4);
  setDeck(code, [card("Dodge", "stale-room-draw-a"), card("Peach", "stale-room-draw-b")]);
  setTurn(code, bot.seat, "draw");
  const before = (await state(code, token)).data;
  const staleAt = Date.now() - 6 * 60_000;
  sql(`UPDATE rooms SET last_activity_at=${staleAt} WHERE id=${quote(roomId)};
    UPDATE players SET connected_at=${staleAt} WHERE room_id=${quote(roomId)}`);
  assert.equal(query(`SELECT last_activity_at FROM rooms WHERE id=${quote(roomId)}`), String(staleAt));

  const unscoped = await runBotScheduler({ maxRoomsPerWakeup: 8, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(unscoped.status, 200, JSON.stringify(unscoped.data));
  assert.equal(unscoped.data.steps, 0, "a global Cron-shaped wake does not select an idle historical room");
  assert.deepEqual(unscoped.data.diagnostics, []);
  assert.equal((await state(code, token)).data.actionRevision, before.actionRevision, "the stale room is not mutated by an unscoped wake");
  assert.equal(query(`SELECT COUNT(*) FROM bot_work WHERE room_id=${quote(roomId)}`), "0");

  const targeted = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(targeted.status, 200, JSON.stringify(targeted.data));
  assert.equal(targeted.data.consumed, 1, "a post-write/diagnostic target can recover the known stale room");
  assert.equal(query(`SELECT COUNT(*) FROM bot_work WHERE room_id=${quote(roomId)} AND status='consumed'`), "1");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE id=${quote(roomId)}`);
});

test("default bot creation stops at its global per-hour limit", { skip: hourlyAddLimitDisabledForTest }, async () => {
  sql("DELETE FROM bot_demo_rate_limits");
  const hosts = [];
  for (let index = 0; index < 13; index++) {
    const created = await requestAndSettle("create", { name: `Rate Limit Host ${index + 1}` });
    assert.equal(created.status, 201);
    hosts.push(created.data);
  }
  const results = await Promise.all(hosts.map((host) => requestAndSettle("add_bot", {
    code: host.room.code,
    token: host.token,
    requestId: crypto.randomUUID(),
  })));
  assert.equal(results.filter((result) => result.status === 201).length, 12, "the global hourly limiter admits no more than twelve bot seats");
  const blocked = results.find((result) => result.status === 429);
  assert.ok(blocked, "the overflow request receives an explicit rate-limit response");
  assert.match(blocked.data.error, /Staging bot creation limit/);
  const hostCodes = hosts.map((host) => quote(host.room.code)).join(",");
  assert.equal(query(`SELECT COUNT(*) FROM players WHERE controller_type='bot' AND room_id IN (SELECT id FROM rooms WHERE code IN (${hostCodes}))`), "12");
  sql("DELETE FROM bot_demo_rate_limits");
  sql("UPDATE rooms SET status='finished', phase='finished' WHERE host_player_id IN (SELECT id FROM players WHERE name LIKE 'Rate Limit Host %')");
});

test("AI Staging hourly-limit opt-out admits 25 distinct bot additions without touching quota rows", { skip: !hourlyAddLimitDisabledForTest }, async () => {
  sql("DELETE FROM bot_demo_rate_limits");
  const hourBucket = Math.floor(Date.now() / 3_600_000);
  sql(`INSERT INTO bot_demo_rate_limits (hour_bucket, bot_add_count) VALUES (${hourBucket}, 12)`);

  const hosts = [];
  for (let index = 0; index < 25; index++) {
    const created = await requestAndSettle("create", { name: `Rate Opt Out ${index + 1}` });
    assert.equal(created.status, 201);
    hosts.push({ ...created.data, requestId: crypto.randomUUID() });
  }

  const results = await Promise.all(hosts.map((host) => request("add_bot", {
    code: host.room.code,
    token: host.token,
    requestId: host.requestId,
  })));
  assert.ok(results.every((result) => result.status === 201), JSON.stringify(results.map((result) => result.status)));
  const replay = await request("add_bot", {
    code: hosts[0].room.code,
    token: hosts[0].token,
    requestId: hosts[0].requestId,
  });
  assert.equal(replay.status, 200, "retrying one request ID returns its existing bot instead of creating a second seat");

  const hostCodes = hosts.map((host) => quote(host.room.code)).join(",");
  assert.equal(query(`SELECT COUNT(*) FROM players WHERE controller_type='bot' AND room_id IN (SELECT id FROM rooms WHERE code IN (${hostCodes}))`), "25");
  assert.equal(query(`SELECT bot_add_count FROM bot_demo_rate_limits WHERE hour_bucket=${hourBucket}`), "12",
    "the Staging opt-out neither reserves a quota slot nor cleans historical quota rows");

  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code IN (${hostCodes})`);
  sql(`DELETE FROM bot_demo_rate_limits WHERE hour_bucket=${hourBucket}`);
});

test("Staging caps concurrent active bot rooms without starting a ninth room", async () => {
  sql("DELETE FROM bot_demo_rate_limits");
  sql("UPDATE rooms SET status='finished', phase='finished' WHERE status IN ('heroes', 'playing') AND id IN (SELECT DISTINCT room_id FROM players WHERE controller_type='bot' AND is_test_player=0)");
  const activeAt = Date.now();
  for (let index = 0; index < 8; index++) {
    const code = `CAP${String(index).padStart(2, "0")}`;
    seedActiveBotRoom({ code, lastActivityAt: activeAt });
  }

  const created = await requestAndSettle("create", { name: "Room Cap Host" });
  assert.equal(created.status, 201);
  const code = created.data.room.code;
  for (let index = 0; index < 3; index++) {
    const added = await requestAndSettle("add_bot", { code, token: created.data.token, requestId: crypto.randomUUID() });
    assert.equal(added.status, 201, JSON.stringify(added.data));
  }
  const blocked = await requestAndSettle("start", { code, token: created.data.token });
  assert.equal(blocked.status, 429, JSON.stringify(blocked.data));
  assert.match(blocked.data.error, /eight active rooms/);
  assert.equal((await state(code, created.data.token)).data.status, "lobby", "the cap leaves the candidate room unchanged");
  sql("UPDATE rooms SET status='finished', phase='finished' WHERE code LIKE 'CAP%'");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("eight-room admission excludes timed-out idle games but counts resolving and Hero-selection rooms", async () => {
  sql("DELETE FROM bot_demo_rate_limits");
  sql("UPDATE rooms SET status='finished', phase='finished' WHERE status IN ('heroes', 'playing') AND id IN (SELECT DISTINCT room_id FROM players WHERE controller_type='bot' AND is_test_player=0)");
  const now = Date.now();
  const staleAt = now - 6 * 60_000;
  for (let index = 0; index < 6; index++) seedActiveBotRoom({ code: `LIVE${index}`, lastActivityAt: now });
  seedActiveBotRoom({ code: "RESOLV", phase: "resolving", lastActivityAt: staleAt });
  seedActiveBotRoom({ code: "IDLE0", lastActivityAt: staleAt });

  async function createBotLobby(name) {
    const created = await requestAndSettle("create", { name });
    assert.equal(created.status, 201);
    for (let index = 0; index < 3; index++) {
      const added = await request("add_bot", { code: created.data.room.code, token: created.data.token, requestId: crypto.randomUUID() });
      assert.equal(added.status, 201, JSON.stringify(added.data));
    }
    return created.data;
  }

  const first = await createBotLobby("First Active Candidate");
  const firstStart = await requestAndSettle("start", { code: first.room.code, token: first.token });
  assert.equal(firstStart.status, 200, JSON.stringify(firstStart.data));
  assert.equal(query(`SELECT status FROM rooms WHERE code=${quote(first.room.code)}`), "heroes");

  const second = await createBotLobby("Second Active Candidate");
  const secondStart = await requestAndSettle("start", { code: second.room.code, token: second.token });
  assert.equal(secondStart.status, 429, JSON.stringify(secondStart.data));
  assert.match(secondStart.data.error, /eight active rooms/);
  assert.equal(query(`SELECT status FROM rooms WHERE code=${quote(second.room.code)}`), "lobby");
  assert.equal(query("SELECT status FROM rooms WHERE code='IDLE0'"), "playing", "admission ignores an expired room without sweeping or mutating it");

  sql("UPDATE rooms SET status='finished', phase='finished' WHERE code LIKE 'LIVE%' OR code IN ('RESOLV', 'IDLE0')");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code IN (${quote(first.room.code)}, ${quote(second.room.code)})`);
});

test("duplicate wakes and an expired claim recover through one canonical draw without double mutation", async () => {
  const { code, token, bots } = await createBotGame();
  const bot = bots[0];
  sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(bot.id)}`);
  setHand(bot.id, [], 4, 4);
  // A second wake may legitimately claim a later revision. Keep this draw
  // fixture free of playable cards so an Attack cannot change the observation.
  setDeck(code, [card("Dodge", "scheduler-draw-a"), card("Dodge", "scheduler-draw-b"), card("Peach", "scheduler-draw-c")]);
  setTurn(code, bot.seat, "draw");
  const beforeDraw = (await state(code, token)).data;

  const concurrent = await Promise.all([
    runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true }),
    runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true }),
  ]);
  assert.ok(concurrent.every((result) => result.status === 200));
  const originalDecisionId = query(`SELECT decision_id FROM bot_work WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)}) AND bot_id=${quote(bot.id)} AND action_revision=${quote(beforeDraw.actionRevision)}`);
  const concurrentLogs = concurrent.flatMap((result) => result.data.diagnostics);
  assert.equal(concurrentLogs.filter((event) => event.event === "bot_work_transition" && event.nextStatus === "consumed" && event.decisionId === originalDecisionId).length, 1,
    "duplicate wakes emit one consumed transition only after the D1 compare-and-set succeeds");
  const afterDraw = (await state(code, token)).data;
  assert.equal(afterDraw.players.find((player) => player.id === bot.id).handCount, 2, "the revision's canonical draw runs once even across duplicate wakes");
  assert.ok(["thinking", "waiting_for_human"].includes(afterDraw.players.find((player) => player.id === bot.id).botStatus), "duplicate wakeups expose only a safe in-progress or waiting status");
  for (const held of ["dodge-scheduler-draw-a", "dodge-scheduler-draw-b"]) assert.equal(roomCardCount(code, held), 1);
  assert.equal(query(`SELECT COUNT(*) FROM bot_work WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)}) AND bot_id=${quote(bot.id)} AND action_revision=${quote(beforeDraw.actionRevision)}`), "1");
  assert.equal(query(`SELECT status FROM bot_work WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)}) AND bot_id=${quote(bot.id)} AND action_revision=${quote(beforeDraw.actionRevision)}`), "consumed");

  // A later Worker wake can take over a persisted claim whose lease expired.
  setHand(bot.id, [card("Dodge", "scheduler-restart-held")], 4, 4);
  setDeck(code, [card("Dodge", "scheduler-restart-a"), card("Peach", "scheduler-restart-b"), card("Attack", "scheduler-restart-c")]);
  setTurn(code, bot.seat, "draw");
  const restartState = (await state(code, token)).data;
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  const decisionId = crypto.randomUUID();
  const oldTime = Date.now() - 120_000;
  sql(`INSERT INTO bot_work (decision_id, room_id, bot_id, action_revision, status, attempts, available_at, lease_token, lease_until, budget_reserved, created_at, updated_at)
    VALUES (${quote(decisionId)}, ${quote(roomId)}, ${quote(bot.id)}, ${quote(restartState.actionRevision)}, 'claimed', 1, ${oldTime}, 'abandoned-worker-lease', ${oldTime}, 1, ${oldTime}, ${oldTime})`);
  const recovered = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(recovered.data.consumed, 1, JSON.stringify(recovered.data));
  assert.equal(recovered.data.diagnostics.filter((event) => event.event === "bot_work_transition" && event.nextStatus === "consumed").length, 1,
    "an expired claim logs its successful recovered transition once");
  assert.equal(query(`SELECT status FROM bot_work WHERE decision_id=${quote(decisionId)}`), "consumed");
  assert.equal(query(`SELECT attempts FROM bot_work WHERE decision_id=${quote(decisionId)}`), "2");
  const afterRecovery = (await state(code, token)).data;
  assert.equal(afterRecovery.players.find((player) => player.id === bot.id).handCount, 3, "the expired unexecuted claim resumes once");
  for (const held of ["dodge-scheduler-restart-held", "dodge-scheduler-restart-a", "peach-scheduler-restart-b"]) assert.equal(roomCardCount(code, held), 1);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("an interrupted Bot draw keeps a private checkpoint and resumes exactly once", async () => {
  const { code, token, bots } = await createBotGame();
  const bot = bots[0];
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(bot.id)}`);
  setHand(bot.id, [], 4, 4);
  const held = [card("Dodge", "scheduler-checkpoint-a"), card("Peach", "scheduler-checkpoint-b")];
  setDeck(code, held);
  setTurn(code, bot.seat, "draw");
  const before = (await state(code, token)).data;
  const triggerName = "abort_bot_draw_checkpoint";
  sql(`CREATE TRIGGER ${triggerName} BEFORE UPDATE OF hand_json ON players
    WHEN OLD.room_id=${quote(roomId)} AND EXISTS (
      SELECT 1 FROM rooms WHERE rooms.id=OLD.room_id
        AND json_extract(rooms.pending_json, '$.kind')='bot_action_checkpoint'
    )
    BEGIN SELECT RAISE(ABORT, 'interrupted Bot draw checkpoint settlement'); END;`);
  try {
    const interrupted = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
    assert.equal(interrupted.data.retries, 1, JSON.stringify(interrupted.data));
    assert.equal(query(`SELECT phase FROM rooms WHERE id=${quote(roomId)}`), "resolving");
    assert.equal(query(`SELECT json_extract(pending_json, '$.kind') FROM rooms WHERE id=${quote(roomId)}`), "bot_action_checkpoint");
    assert.equal(query(`SELECT json_extract(pending_json, '$.actionRevision') FROM rooms WHERE id=${quote(roomId)}`), before.actionRevision);
    assert.equal(query(`SELECT json_array_length(hand_json) FROM players WHERE id=${quote(bot.id)}`), "0");
    assert.equal(query(`SELECT status FROM bot_work WHERE room_id=${quote(roomId)} AND action_revision=${quote(before.actionRevision)}`), "pending");
  } finally {
    sql(`DROP TRIGGER ${triggerName}`);
  }

  sql(`UPDATE bot_work SET available_at=1 WHERE room_id=${quote(roomId)} AND action_revision=${quote(before.actionRevision)}`);
  const recovered = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(recovered.data.consumed, 1, JSON.stringify(recovered.data));
  assert.equal(query(`SELECT status FROM bot_work WHERE room_id=${quote(roomId)} AND action_revision=${quote(before.actionRevision)}`), "consumed");
  assert.equal(query(`SELECT phase FROM rooms WHERE id=${quote(roomId)}`), "play");
  assert.equal(query(`SELECT pending_json IS NULL FROM rooms WHERE id=${quote(roomId)}`), "1");
  assert.equal(query(`SELECT json_array_length(hand_json) FROM players WHERE id=${quote(bot.id)}`), "2");
  for (const heldCard of held) assert.equal(roomCardCount(code, heldCard.id), 1, `${heldCard.id} remains physically conserved`);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("Cron resumes a private Oath recovery checkpoint before scheduling Bot work", async () => {
  const { code, token, hostId, bots } = await createBotGame();
  const bot = bots[0];
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  const hostSeat = Number(query(`SELECT seat FROM players WHERE id=${quote(hostId)}`));
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(bot.id)}`);
  // The recovery checkpoint represents the already-committed HP write; Cron
  // must publish/resume it, not apply the HP a second time.
  setHand(bot.id, [], 4, 4);
  setTurn(code, hostSeat, "play");
  const checkpoint = {
    kind: "recovery_checkpoint", version: 1, id: crypto.randomUUID(), effect: "oath",
    records: [{ playerId: bot.id, amountRecovered: 1, sourceId: bot.id, reason: "oath" }],
    resume: { kind: "phase", phase: "play", playerId: bot.id },
  };
  sql(`UPDATE rooms SET phase='resolving', pending_json=${quote(JSON.stringify(checkpoint))} WHERE id=${quote(roomId)}`);

  const wake = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(wake.status, 200, JSON.stringify(wake.data));
  assert.equal(wake.data.steps, 0, "the Cron wake only resumes the durable checkpoint");
  assert.equal(query(`SELECT phase FROM rooms WHERE id=${quote(roomId)}`), "play");
  assert.equal(query(`SELECT pending_json IS NULL FROM rooms WHERE id=${quote(roomId)}`), "1");
  assert.equal(query(`SELECT hp FROM players WHERE id=${quote(bot.id)}`), "4");
  assert.equal((await state(code, token)).data.currentAction.actorId, hostId);
  assert.equal(JSON.stringify((await state(code, token)).data).includes("recovery_checkpoint"), false);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE id=${quote(roomId)}`);
});

test("human turns and the exhausted per-room action budget leave bot actions untouched", async () => {
  const { code, token, hostId, bots } = await createBotGame();
  const bot = bots[0];
  const human = (await state(code, token)).data.players.find((player) => player.id === hostId);
  setTurn(code, human.seat, "play");
  const humanState = (await state(code, token)).data;
  assert.equal(humanState.actionPlayerId, hostId, "the human owns the current authoritative turn");
  const waiting = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 2, captureDiagnostics: true });
  assert.equal(waiting.data.steps, 0);
  assert.deepEqual(waiting.data.diagnostics, [], "a human-turn cron wake emits no work event");
  const publicHumanState = (await state(code, token)).data;
  assert.equal(publicHumanState.actionRevision, humanState.actionRevision, "no timer or gameplay mutation is applied to a human turn");
  assert.ok(publicHumanState.players.filter((player) => player.isBot).every((player) => player.botStatus === "waiting_for_human"), "the public projection reports only the safe waiting state");
  assert.equal(query(`SELECT COUNT(*) FROM bot_work WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)})`), "0");

  setHand(bot.id, [], 4, 4);
  setDeck(code, [card("Attack", "scheduler-late-a"), card("Dodge", "scheduler-late-b")]);
  setTurn(code, bot.seat, "draw");
  const queuedBotTurn = (await state(code, token)).data;
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  const delayedDecisionId = crypto.randomUUID();
  const queuedAt = Date.now();
  sql(`INSERT INTO bot_work (decision_id, room_id, bot_id, action_revision, status, attempts, available_at, budget_reserved, created_at, updated_at)
    VALUES (${quote(delayedDecisionId)}, ${quote(roomId)}, ${quote(bot.id)}, ${quote(queuedBotTurn.actionRevision)}, 'pending', 0, ${queuedAt}, 0, ${queuedAt}, ${queuedAt})`);
  setTurn(code, human.seat, "play");
  const lateHumanState = (await state(code, token)).data;
  const lateWake = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1 });
  assert.equal(lateWake.data.steps, 0, "a queued bot revision cannot execute after a human takes the turn");
  assert.equal(query(`SELECT status FROM bot_work WHERE decision_id=${quote(delayedDecisionId)}`), "pending");
  assert.equal((await state(code, token)).data.actionRevision, lateHumanState.actionRevision);

  setHand(bot.id, [card("Peach", "scheduler-retry-held")], 4, 4);
  setDeck(code, [card("Attack", "scheduler-retry-a"), card("Dodge", "scheduler-retry-b")]);
  setTurn(code, bot.seat, "draw");
  const retryState = (await state(code, token)).data;
  const exhaustedDecisionId = crypto.randomUUID();
  const retryTime = Date.now();
  sql(`INSERT INTO bot_work (decision_id, room_id, bot_id, action_revision, status, attempts, available_at, budget_reserved, created_at, updated_at)
    VALUES (${quote(exhaustedDecisionId)}, ${quote(roomId)}, ${quote(bot.id)}, ${quote(retryState.actionRevision)}, 'pending', 3, ${retryTime}, 0, ${retryTime}, ${retryTime})`);
  const retries = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(retries.data.failed, 1);
  assert.equal(retries.data.diagnostics.filter((event) => event.event === "bot_work_transition" && event.nextStatus === "failed" && event.errorCode === "retry_limit").length, 1);
  assert.ok(retries.data.diagnostics.some((event) => event.event === "bot_work_transition"
    && event.decisionId === delayedDecisionId && event.previousStatus === "pending" && event.nextStatus === "stale"
    && event.errorCode === "revision_changed"), "obsolete work records one revision-change transition");
  assert.ok(retries.data.diagnostics.some((event) => event.event === "bot_scheduler_summary"), "an abnormal wake gets at most one bounded summary");
  assert.equal(query(`SELECT error_code FROM bot_work WHERE decision_id=${quote(exhaustedDecisionId)}`), "retry_limit");
  assert.equal(query(`SELECT status FROM bot_work WHERE decision_id=${quote(delayedDecisionId)}`), "stale", "the next bot revision expires the abandoned human-era work");
  assert.equal((await state(code, token)).data.actionRevision, retryState.actionRevision, "a retry-exhausted decision is not dispatched");

  // A new state revision cannot spend beyond the room's persisted 200-action budget.
  setHand(bot.id, [card("Peach", "scheduler-budget-held")], 4, 4);
  setDeck(code, [card("Attack", "scheduler-budget-a"), card("Dodge", "scheduler-budget-b")]);
  setTurn(code, bot.seat, "draw");
  const budgetState = (await state(code, token)).data;
  sql(`UPDATE bot_room_scheduler SET lease_token=NULL, lease_until=0, actions_reserved=200, updated_at=${Date.now()} WHERE room_id=${quote(roomId)}`);
  const bounded = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(bounded.data.steps, 0);
  assert.equal(bounded.data.failed, 1);
  assert.equal(bounded.data.diagnostics.filter((event) => event.event === "bot_work_transition" && event.errorCode === "action_budget_exhausted").length, 1);
  assert.equal(query(`SELECT error_code FROM bot_work WHERE room_id=${quote(roomId)} AND action_revision=${quote(budgetState.actionRevision)}`), "action_budget_exhausted");
  assert.equal((await state(code, token)).data.players.find((player) => player.id === bot.id).botStatus, "error");
  assert.equal((await state(code, token)).data.actionRevision, budgetState.actionRevision, "the 200-action cap blocks dispatch");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("multiple eligible Dodges select one deterministically and keep private details server-only", async () => {
  const { code, token, hostId, bots, room } = await createBotGame();
  const bot = bots[0];
  const host = room.players.find((player) => player.id === hostId);
  sql(`UPDATE players SET hero='sun-quan' WHERE id IN (${quote(hostId)}, ${quote(bot.id)})`);
  setHand(hostId, [card("Attack", "scheduler-unsupported-attack")], 4, 4);
  setHand(bot.id, [card("Dodge", "scheduler-unsupported-dodge-a"), card("Dodge", "scheduler-unsupported-dodge-b")], 4, 4);
  setTurn(code, host.seat, "play");
  const attack = await requestAndSettle("play_card", { code, token, cardId: "attack-scheduler-unsupported-attack", targetId: bot.id });
  assert.equal(attack.status, 200, JSON.stringify(attack.data));
  assert.equal(attack.data.room.actionPlayerId, bot.id);
  const hpBefore = attack.data.room.players.find((player) => player.id === bot.id).hp;

  const played = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(played.data.consumed, 1);
  const decisionContext = played.data.decisionDiagnostics.find((event) => event.event === "bot_decision_context");
  const evaluation = played.data.decisionDiagnostics.find((event) => event.event === "bot_decision_evaluation");
  const result = played.data.decisionDiagnostics.find((event) => event.event === "bot_decision_result");
  assert.equal(decisionContext.hand.length, 2);
  assert.equal(evaluation.cause, "canonical_combat_response");
  assert.equal(evaluation.options[0].selection.eligibleCardIds.length, 2);
  assert.equal(result.decisionId, decisionContext.decisionId);
  assert.equal(result.mutationCommitted, true);
  assert.ok(result.after.hand.length === 1 && result.after.hand[0].cardId === "dodge-scheduler-unsupported-dodge-b");

  const repeated = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(repeated.data.steps, 0);
  const publicRoom = (await state(code, token)).data;
  assert.equal(publicRoom.players.find((player) => player.id === bot.id).hp, hpBefore);
  const serialized = JSON.stringify(publicRoom);
  assert.ok(serialized.includes("dodge-scheduler-unsupported-dodge-a"), "the played Dodge is now a public card");
  assert.ok(!serialized.includes("dodge-scheduler-unsupported-dodge-b"), "the unplayed Dodge stays private");
  assert.ok(!serialized.includes("bot_decision_context"), "private diagnostic events stay server-side");
  assert.equal(serialized.includes("token_hash"), false);
  assert.equal(serialized.includes("error_code"), false);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("a Bot commits its physical Attack and the human Dodge window together", async () => {
  const { code, token, hostId, bots } = await createBotGame();
  const bot = bots[0];
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(hostId)};
    UPDATE players SET role='Rebel' WHERE id=${quote(bot.id)};
    UPDATE players SET role='Loyalist' WHERE id=${quote(bots[1].id)};
    UPDATE players SET role='Renegade' WHERE id=${quote(bots[2].id)}`);
  sql(`UPDATE players SET hero='sun-quan', equipment_json='{}' WHERE id IN (${quote(hostId)}, ${quote(bot.id)})`);
  setHand(hostId, [card("Dodge", "bot-attack-human-dodge")], 4, 4);
  const physicalAttack = card("Attack", "bot-active-attack");
  setHand(bot.id, [physicalAttack], 4, 4);
  setTurn(code, bot.seat, "play");
  const before = (await state(code, token)).data;
  assert.equal(before.actionPlayerId, bot.id);

  // Abort the second statement of the D1 batch. Its room transition must
  // roll back so a later wake can still use the same decision revision.
  sql(`CREATE TRIGGER bot_attack_hand_write_abort BEFORE UPDATE OF hand_json ON players
    WHEN OLD.id = ${quote(bot.id)} AND NEW.hand_json <> OLD.hand_json
    BEGIN SELECT RAISE(ABORT, 'bot attack fixture write failure'); END;`);
  try {
    const failed = await runBotStep(code, bot.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
    assert.equal(failed.status, 500, JSON.stringify(failed.data));
    const afterFailure = (await state(code, token)).data;
    assert.equal(afterFailure.actionRevision, before.actionRevision);
    assert.equal(afterFailure.phase, "play");
    assert.equal(roomCardCount(code, physicalAttack.id), 1);
  } finally {
    sql("DROP TRIGGER bot_attack_hand_write_abort");
  }

  const attack = await runBotStep(code, bot.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
  assert.equal(attack.status, 200, JSON.stringify(attack.data));
  const pending = (await state(code, token)).data;
  assert.equal(pending.actionPlayerId, hostId);
  assert.equal(pending.currentAction.kind, "response");
  assert.equal(pending.currentAction.requirement, "dodge");
  assert.equal(pending.players.find((player) => player.id === bot.id).handCount, 0);
  assert.equal(roomCardCount(code, physicalAttack.id), 1);

  const replay = await runBotStep(code, bot.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
  assert.equal(replay.status, 200, JSON.stringify(replay.data));
  assert.equal(replay.data.state, "waiting_for_human");
  assert.equal((await state(code, token)).data.actionRevision, pending.actionRevision);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("the injected Responses mock can choose a canonical alternative and cannot invent one", async () => {
  const { code, token, bots } = await createBotGame();
  const bot = bots[0];
  const attack = card("Attack", "mock-policy-attack");
  sql(`UPDATE players SET hero='zhang-fei', equipment_json='{}' WHERE id=${quote(bot.id)}`);
  setHand(bot.id, [attack], 4, 4);
  setTurn(code, bot.seat, "play");
  const before = (await state(code, token)).data;
  const invalid = await runBotStep(code, bot.id, { actionRevision: before.actionRevision, mockChoiceKind: "heal" });
  assert.equal(invalid.status, 200, JSON.stringify(invalid.data));
  assert.equal(invalid.data.code, "BOT_POLICY_DECISION_REJECTED");
  assert.equal((await state(code, token)).data.actionRevision, before.actionRevision);
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(bot.id)}`))[0].id, attack.id);

  const ended = await runBotStep(code, bot.id, { actionRevision: before.actionRevision, mockChoiceKind: "end_turn" });
  assert.equal(ended.status, 200, JSON.stringify(ended.data));
  assert.notEqual((await state(code, token)).data.actionPlayerId, bot.id);
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(bot.id)}`))[0].id, attack.id);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("a Loyalist Bot rejects Lord-harming AOE policy choices and attacks another legal seat", async () => {
  const { code, token, hostId, bots } = await createBotGame();
  const loyalist = bots[0];
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(hostId)};
    UPDATE players SET role='Loyalist', hero='zhang-fei' WHERE id=${quote(loyalist.id)};
    UPDATE players SET role='Rebel' WHERE id=${quote(bots[1].id)};
    UPDATE players SET role='Renegade' WHERE id=${quote(bots[2].id)}`);
  const invasion = card("BarbarianInvasion", "role-guard-invasion");
  const arrows = card("RainingArrows", "role-guard-arrows");
  const lightning = card("Lightning", "role-guard-lightning");
  const attack = card("Attack", "role-guard-attack");
  setHand(loyalist.id, [invasion, arrows, lightning, attack], 4, 4);
  setTurn(code, loyalist.seat, "play");

  const before = (await state(code, token)).data;
  const blockedPolicy = await runBotStep(code, loyalist.id, {
    actionRevision: before.actionRevision, decisionId: crypto.randomUUID(), mockChoiceKind: "stratagem",
  });
  assert.equal(blockedPolicy.status, 200, JSON.stringify(blockedPolicy.data));
  assert.equal(blockedPolicy.data.code, "BOT_POLICY_DECISION_REJECTED", "the harmful AOE was not offered to the mock policy");
  assert.equal((await state(code, token)).data.actionRevision, before.actionRevision, "a rejected policy choice does not mutate the match");
  assert.equal(roomCardCount(code, invasion.id), 1);
  assert.equal(roomCardCount(code, arrows.id), 1);
  assert.equal(roomCardCount(code, lightning.id), 1);

  const safeAttack = await runBotStep(code, loyalist.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
  assert.equal(safeAttack.status, 200, JSON.stringify(safeAttack.data));
  const after = (await state(code, token)).data;
  assert.equal(after.phase, "response");
  assert.notEqual(after.actionPlayerId, hostId, "the canonical Attack targets an eligible non-Lord seat");
  assert.ok(bots.slice(1).some(({ id }) => id === after.actionPlayerId));
  assert.equal(roomCardCount(code, attack.id), 1);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(loyalist.id)}`)).map(({ id }) => id),
    [invasion.id, arrows.id, lightning.id], "both harmful AOEs and delayed Lightning remain in the Loyalist's hand");
  assert.equal(after.players.find(({ id }) => id === hostId).role, "Lord", "the public Lord role remains visible");
  assert.ok(after.players.filter(({ id }) => id !== hostId).every(({ role }) => role !== "Loyalist" && role !== "Rebel" && role !== "Renegade"),
    "other living players' private roles remain hidden in the public room projection");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("role policy filters converted, Serpent Spear, and multi-target Attacks through canonical candidates", async () => {
  const { code, token, hostId, bots } = await createBotGame();
  const loyalist = bots[0];
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(hostId)};
    UPDATE players SET role='Loyalist' WHERE id=${quote(loyalist.id)};
    UPDATE players SET role='Rebel' WHERE id=${quote(bots[1].id)};
    UPDATE players SET role='Renegade' WHERE id=${quote(bots[2].id)}`);

  const convertedDodge = card("Dodge", "role-guard-longdan");
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(loyalist.id)}`);
  setHand(loyalist.id, [convertedDodge], 4, 4);
  setTurn(code, loyalist.seat, "play");
  let before = (await state(code, token)).data;
  let result = await runBotStep(code, loyalist.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  let after = (await state(code, token)).data;
  assert.equal(after.phase, "response");
  assert.notEqual(after.actionPlayerId, hostId, "a converted Dodge Attack avoids the public Lord");
  assert.equal(roomCardCount(code, convertedDodge.id), 1);

  const spearCost = [card("Peach", "role-guard-spear-peach"), card("Dodge", "role-guard-spear-dodge")];
  sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(loyalist.id)}`);
  setEquipment(loyalist.id, { weapon: card("SerpentSpear", "role-guard-spear") });
  setHand(loyalist.id, spearCost, 4, 4);
  setTurn(code, loyalist.seat, "play");
  before = (await state(code, token)).data;
  result = await runBotStep(code, loyalist.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  after = (await state(code, token)).data;
  assert.equal(after.phase, "response");
  assert.notEqual(after.actionPlayerId, hostId, "Serpent Spear cannot launder a Lord target");
  for (const cost of spearCost) assert.equal(roomCardCount(code, cost.id), 1);

  const halberdAttack = card("Attack", "role-guard-halberd");
  setEquipment(loyalist.id, { weapon: card("SkyPiercingHalberd", "role-guard-halberd-weapon") });
  setHand(loyalist.id, [halberdAttack], 4, 4);
  setTurn(code, loyalist.seat, "play");
  before = (await state(code, token)).data;
  result = await runBotStep(code, loyalist.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  after = (await state(code, token)).data;
  assert.equal(after.phase, "response");
  assert.notEqual(after.actionPlayerId, hostId, "the multi-target canonical Attack set excludes the Lord");
  const groupPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`));
  assert.equal(groupPending.kind, "response");
  assert.equal(groupPending.continuation.kind, "group");
  assert.equal(groupPending.continuation.cardKind, "SkyPiercingHalberdAttack");
  assert.deepEqual(groupPending.continuation.heldCards.map(({ id }) => id), [halberdAttack.id]);
  assert.ok(groupPending.continuation.participantProgress.participants.length >= 2);
  assert.ok(groupPending.continuation.participantProgress.participants.every(({ playerId }) => playerId !== hostId),
    "the complete canonical Halberd target set excludes the Lord");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("a Loyalist ends safely when a targeted Stratagem can only harm the living Lord", async () => {
  const { code, token, hostId, bots } = await createBotGame();
  const loyalist = bots[0];
  // Fix every actor's Hero and turn-boundary state. The failing CI fixture left
  // three random Heroes in place, so a legitimate private turn-start/end
  // trigger could replace the expected safe End Turn -> Draw transition.
  const steal = card("Steal", "role-guard-only-lord");
  const lordDodge = card("Dodge", "role-guard-only-lord-target");
  sql(`UPDATE rooms SET skill_state_json='{}' WHERE code=${quote(code)};
    UPDATE players SET role='Lord', hero='sun-quan', hp=4, max_hp=4, alive=1, equipment_json='{}', judgement_json='[]' WHERE id=${quote(hostId)};
    UPDATE players SET role='Loyalist', hero='cao-cao', hp=4, max_hp=4, alive=1, equipment_json='{}', judgement_json='[]' WHERE id=${quote(loyalist.id)};
    UPDATE players SET role='Rebel', hero='zhang-fei', hp=4, max_hp=4, alive=1, equipment_json='{}', judgement_json='[]' WHERE id=${quote(bots[1].id)};
    UPDATE players SET role='Renegade', hero='gongsun-zan', hp=4, max_hp=4, alive=1, equipment_json='{}', judgement_json='[]' WHERE id=${quote(bots[2].id)}`);
  setHand(loyalist.id, [steal], 4, 4);
  setHand(hostId, [lordDodge], 4, 4);
  setHand(bots[1].id, [], 4, 4);
  setHand(bots[2].id, [], 4, 4);
  for (const player of [hostId, loyalist.id, bots[1].id, bots[2].id]) {
    setEquipment(player, {});
    setJudgement(player, []);
  }
  setTurn(code, loyalist.seat, "play");
  const before = (await state(code, token)).data;
  const result = await runBotStep(code, loyalist.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  let after;
  try {
    after = (await state(code, token)).data;
    assert.notEqual(after.actionPlayerId, loyalist.id, "the Bot uses a legally offered safe End Turn fallback instead of retrying");
    assert.equal(roomCardCount(code, steal.id), 1, "the Lord-targeted Steal remains unplayed");
    assert.equal(roomCardCount(code, lordDodge.id), 1, "the Lord's original card remains conserved");
    assert.equal(after.players.find(({ id }) => id === hostId).hp, 4, "the Lord HP is unchanged");
    assert.equal(after.phase, "draw", `safe End Turn must reach Draw with no pending continuation: ${JSON.stringify({ phase: after.phase, currentAction: after.currentAction?.kind })}`);
    assert.equal(query(`SELECT pending_json IS NULL FROM rooms WHERE code=${quote(code)}`), "1", "safe End Turn leaves no pending trigger");
    assert.equal(after.actionPlayerId, bots[1].id, "the next living seat owns the Draw phase");
  } catch (error) {
    await logRolePolicyDiagnostic(code, token, "role-guard-only-lord-deterministic-fallback");
    throw error;
  }
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("a deterministic End Turn can open and canonically decline a real turn-start trigger", async () => {
  const { code, token, hostId, bots, room } = await createBotGame();
  const host = room.players.find(({ id }) => id === hostId);
  const endingBot = room.players.find(({ seat }) => seat === (host.seat + 3) % 4);
  assert.ok(host && endingBot?.isBot, "fixture has deterministic adjacent host/Bot seats");
  const top = card("Attack", "role-guard-stargazing-top");
  const bottom = card("Dodge", "role-guard-stargazing-bottom");
  sql(`UPDATE rooms SET skill_state_json='{}' WHERE code=${quote(code)};
    UPDATE players SET role='Lord', hero='zhuge-liang', hp=4, max_hp=4, alive=1, equipment_json='{}', judgement_json='[]' WHERE id=${quote(hostId)};
    UPDATE players SET role='Loyalist', hero='zhang-fei', hp=4, max_hp=4, alive=1, equipment_json='{}', judgement_json='[]' WHERE id=${quote(bots[0].id)};
    UPDATE players SET role='Rebel', hero='sun-quan', hp=4, max_hp=4, alive=1, equipment_json='{}', judgement_json='[]' WHERE id=${quote(bots[1].id)};
    UPDATE players SET role='Renegade', hero='gongsun-zan', hp=4, max_hp=4, alive=1, equipment_json='{}', judgement_json='[]' WHERE id=${quote(bots[2].id)}`);
  for (const player of room.players) {
    setHand(player.id, [], 4, 4);
    setEquipment(player.id, {});
    setJudgement(player.id, []);
  }
  setDeck(code, [top, bottom]);
  setTurn(code, endingBot.seat, "play");

  const before = (await state(code, token)).data;
  const ended = await runBotStep(code, endingBot.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
  assert.equal(ended.status, 200, JSON.stringify(ended.data));
  const pending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`));
  assert.equal(pending.kind, "trigger");
  assert.equal(pending.event, "turn_start");
  assert.equal(pending.actorId, hostId, "the next seat's canonical turn-start trigger belongs to the host");
  const opened = (await state(code, token)).data;
  assert.equal(opened.currentAction.actorId, hostId);
  assert.equal(opened.currentAction.kind, "trigger");
  assert.equal(opened.currentAction.triggerEvent, "turn_start");
  assert.ok(opened.currentAction.triggerOptions.some(({ effectId }) => effectId === "zhuge_liang_stargazing"));

  const declined = await request("decline_trigger", { code, token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  const after = (await state(code, token)).data;
  assert.equal(after.phase, "draw");
  assert.equal(after.actionPlayerId, hostId, "canonical decline resumes the host's Draw phase");
  assert.equal(query(`SELECT pending_json IS NULL FROM rooms WHERE code=${quote(code)}`), "1");
  assert.equal(roomCardCount(code, top.id), 1);
  assert.equal(roomCardCount(code, bottom.id), 1);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("Rebel prefers the public Lord and Renegade delays him until the final duel", async () => {
  const { code, token, hostId, bots } = await createBotGame();
  const [rebel, renegade, loyalist] = bots;
  // A passive-only Hero keeps an optional active skill from changing the target-policy fixture.
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(hostId)};
    UPDATE players SET role='Rebel' WHERE id=${quote(rebel.id)};
    UPDATE players SET role='Renegade', hero='cao-cao' WHERE id=${quote(renegade.id)};
    UPDATE players SET role='Loyalist' WHERE id=${quote(loyalist.id)}`);
  const rebelAttack = card("Attack", "role-guard-rebel");
  setHand(rebel.id, [rebelAttack], 4, 4);
  setTurn(code, rebel.seat, "play");
  let before = (await state(code, token)).data;
  let result = await runBotStep(code, rebel.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  let after = (await state(code, token)).data;
  assert.equal(after.actionPlayerId, hostId, "Rebel chooses a legally reachable Lord over comparable seats");

  const earlyAttack = card("Attack", "role-guard-renegade-early");
  setHand(renegade.id, [earlyAttack], 4, 4);
  setTurn(code, renegade.seat, "play");
  before = (await state(code, token)).data;
  result = await runBotStep(code, renegade.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  after = (await state(code, token)).data;
  assert.ok([rebel.id, loyalist.id].includes(after.actionPlayerId), "with four living seats, Renegade chooses a safe non-Lord target");

  sql(`UPDATE players SET hp=0, alive=0 WHERE id IN (${quote(rebel.id)}, ${quote(loyalist.id)})`);
  const finalAttack = card("Attack", "role-guard-renegade-final");
  setHand(renegade.id, [finalAttack], 4, 4);
  setTurn(code, renegade.seat, "play");
  before = (await state(code, token)).data;
  result = await runBotStep(code, renegade.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  after = (await state(code, token)).data;
  assert.equal(after.actionPlayerId, hostId, "Renegade may target the Lord in the two-player final duel");
  assert.equal(roomCardCount(code, finalAttack.id), 1);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("successive Bot Attacks account for committed public pressure before choosing comparable targets", async () => {
  const { code, token, hostId, bots, room } = await createBotGame();
  const [loyalist, lord, rebel] = bots;
  sql(`UPDATE players SET hero='cao-cao', equipment_json='{}' WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)});
    UPDATE players SET role='Renegade' WHERE id=${quote(hostId)};
    UPDATE players SET role='Loyalist' WHERE id=${quote(loyalist.id)};
    UPDATE players SET role='Lord' WHERE id=${quote(lord.id)};
    UPDATE players SET role='Rebel' WHERE id=${quote(rebel.id)}`);

  const opening = card("Attack", "pressure-opening");
  setHand(hostId, [opening], 4, 4);
  setTurn(code, room.players.find(({ id }) => id === hostId).seat, "play");
  const human = await request("play_card", { code, token, cardId: opening.id, targetId: rebel.id });
  assert.equal(human.status, 200, JSON.stringify(human.data));

  const targetFor = async (actor, index) => {
    setEquipment(actor.id, { weapon: card("BlueSteelSword", `pressure-weapon-${index}`) });
    setHand(actor.id, [card("Attack", `pressure-attack-${index}`)], 4, 4);
    setTurn(code, actor.seat, "play");
    const before = (await state(code, token)).data;
    const selected = await runBotStep(code, actor.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
    assert.equal(selected.status, 200, JSON.stringify(selected.data));
    const after = (await state(code, token)).data;
    const pending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`));
    assert.equal(pending?.requirement?.kind, "dodge", "canonical server response requires Dodge");
    assert.equal(pending?.continuation?.sourceId, actor.id);
    assert.equal(pending?.actorId, pending?.continuation?.targetId);
    assert.ok(!JSON.stringify(after).includes("botTargetPressure"), "server pressure records never enter the viewer projection");
    return pending.actorId;
  };
  assert.equal(await targetFor(loyalist, 1), hostId, "the host is a legitimate fresh target and the Lord is protected");
  assert.equal(await targetFor(lord, 2), loyalist.id, "the Lord chooses a comparably useful target that has not just been attacked");
  assert.equal(await targetFor(rebel, 3), lord.id, "public Lord priority remains in force");
  assert.equal(query(`SELECT COUNT(*) FROM rooms r,json_each(r.log_json) e WHERE r.code=${quote(code)} AND e.value LIKE '%"botTargetPressure"%'`), "4");
  assert.ok(!JSON.stringify((await state(code, "")).data).includes("botTargetPressure"));
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("a Loyalist's targeted active skill selects a non-Lord using its resolved effect", async () => {
  const { code, token, hostId, bots } = await createBotGame();
  const loyalist = bots[0];
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(hostId)};
    UPDATE players SET role='Loyalist', hero='gan-ning' WHERE id=${quote(loyalist.id)};
    UPDATE players SET role='Rebel' WHERE id=${quote(bots[1].id)};
    UPDATE players SET role='Renegade' WHERE id=${quote(bots[2].id)}`);
  const blackCard = card("Peach", "role-guard-qixi", "♣");
  setHand(loyalist.id, [blackCard], 4, 4);
  setHand(bots[1].id, [card("Dodge", "role-guard-qixi-target")], 4, 4);
  setHand(bots[2].id, [card("Dodge", "role-guard-qixi-other")], 4, 4);
  setTurn(code, loyalist.seat, "play");
  const before = (await state(code, token)).data;
  const result = await runBotStep(code, loyalist.id, { actionRevision: before.actionRevision, decisionId: crypto.randomUUID() });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  const pending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`));
  assert.equal(pending.kind, "negation_window", "canonical Qixi Dismantle enters Negation before target-card selection");
  assert.equal(pending.continuation.effect.kind, "dismantle");
  assert.notEqual(pending.continuation.effectTargetId, hostId, "resolved targeted skill harm never selects the public Lord");
  assert.deepEqual(pending.continuation.heldCards.map(({ id }) => id), [blackCard.id],
    "the skill card stays conserved in the canonical targeted-effect continuation");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("a Bot answers an ordinary Attack with its single canonical physical Dodge", async () => {
  const { code, token, hostId, bots, room } = await createBotGame();
  const bot = bots[0];
  const host = room.players.find((player) => player.id === hostId);
  // Keep this a plain physical-card response even when random Hero assignment
  // would otherwise add a Cao Cao Hujia provider or a converted-card skill.
  sql(`UPDATE players SET hero='sun-quan' WHERE id IN (${quote(hostId)}, ${quote(bot.id)})`);
  setHand(hostId, [card("Attack", "scheduler-one-dodge-attack")], 4, 4);
  setHand(bot.id, [card("Dodge", "scheduler-one-dodge-card")], 4, 4);
  setTurn(code, host.seat, "play");
  const attack = await requestAndSettle("play_card", { code, token, cardId: "attack-scheduler-one-dodge-attack", targetId: bot.id });
  assert.equal(attack.status, 200, JSON.stringify(attack.data));
  const hpBefore = attack.data.room.players.find((player) => player.id === bot.id).hp;

  const result = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(result.data.consumed, 1, JSON.stringify({
    consumed: result.data.consumed,
    unsupported: result.data.unsupported,
    decisions: result.data.decisionDiagnostics.map(({ event, cause, selectedAction, response, options }) => ({
      event, cause, selectedAction, requiredCount: response?.requiredCount,
      providers: options?.map((option) => option.providerId),
    })),
  }));
  assert.equal(result.data.unsupported, 0);
  const contextEvent = result.data.decisionDiagnostics.find((event) => event.event === "bot_decision_context");
  const evaluation = result.data.decisionDiagnostics.find((event) => event.event === "bot_decision_evaluation");
  const resultEvent = result.data.decisionDiagnostics.find((event) => event.event === "bot_decision_result");
  assert.ok(contextEvent, "decision context is present");
  assert.equal(contextEvent.hand.length, 1);
  assert.ok(contextEvent.hand[0].cardId === "dodge-scheduler-one-dodge-card", "the full physical Bot card ID is present only in the captured diagnostic event");
  assert.equal(contextEvent.hand[0].canonicalKind, "Dodge");
  assert.equal(contextEvent.response.continuationKind, "attack");
  assert.equal(contextEvent.response.requirement, "dodge");
  assert.equal(evaluation.selectedAction, "respond");
  assert.equal(evaluation.cause, "single_physical_dodge_supported");
  assert.equal(evaluation.options.length, 1);
  assert.equal(evaluation.options[0].providerId, "card");
  assert.ok(evaluation.options[0].selection.eligibleCardIds[0] === "dodge-scheduler-one-dodge-card", "the canonical candidate is linked to that same physical card");
  assert.equal(resultEvent.decisionId, contextEvent.decisionId);
  assert.equal(resultEvent.selectedAction, "respond");
  assert.equal(resultEvent.httpStatus, 200);
  assert.equal(resultEvent.canonicalOutcome, "accepted");
  assert.equal(resultEvent.mutationCommitted, true);
  assert.equal(resultEvent.before.hand.length, 1);
  assert.equal(resultEvent.after.hand.length, 0);
  assert.equal(resultEvent.before.hp, resultEvent.after.hp);
  assert.equal(result.data.diagnostics.filter((event) => event.event === "bot_work_transition" && event.decisionId === contextEvent.decisionId && event.nextStatus === "consumed").length, 1);

  const publicRoom = (await state(code, token)).data;
  assert.equal(publicRoom.players.find((player) => player.id === bot.id).hp, hpBefore, "canonical Dodge avoids damage");
  assert.equal(publicRoom.players.find((player) => player.id === bot.id).handCount, 0, "the Bot no longer holds the response card");
  assert.equal(publicRoom.players.find((player) => player.id === bot.id).botStatus, "waiting_for_human", "the successful response clears the Bot work and returns control to the human turn");
  const serialized = JSON.stringify(publicRoom);
  assert.equal(serialized.includes(contextEvent.decisionId), false, "private decision correlation never enters gameplay JSON");
  assert.equal(serialized.includes("bot_decision_context"), false, "private server diagnostics never enter gameplay JSON");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("a wounded Bot heals first, equips an empty slot, and keeps the spare weapon", async () => {
  const { code, token, bots } = await createBotGame();
  const bot = bots[0];
  sql(`UPDATE players SET hero='zhang-fei', equipment_json='{}' WHERE id=${quote(bot.id)}`);
  const peach = card("Peach", "basic-play");
  const weapon = card("ZhugeCrossbow", "basic-play");
  const spare = card("SkyPiercingHalberd", "basic-play");
  setHand(bot.id, [peach, weapon, spare], 3, 4);
  setTurn(code, bot.seat, "play");

  async function step() {
    const room = (await state(code, token)).data;
    const result = await runBotStep(code, bot.id, { actionRevision: room.actionRevision, decisionId: crypto.randomUUID() });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.notEqual(result.data.state, "unsupported", JSON.stringify(result.data));
  }
  await step();
  assert.equal((await state(code, token)).data.players.find((player) => player.id === bot.id).hp, 4);
  assert.equal(roomCardCount(code, peach.id), 1);
  await step();
  assert.equal(JSON.parse(query(`SELECT equipment_json FROM players WHERE id=${quote(bot.id)}`)).weapon.id, spare.id);
  await step();
  assert.equal(JSON.parse(query(`SELECT equipment_json FROM players WHERE id=${quote(bot.id)}`)).weapon.id, spare.id);
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(bot.id)}`))[0].id, weapon.id);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("Bots submit distinct shared Negation passes without taking the human decision", async () => {
  const { code, token, hostId, bots, room } = await createBotGame();
  const host = room.players.find(({ id }) => id === hostId);
  const draw = card("DrawTwo", "shared-negation-bots");
  sql(`UPDATE players SET hero='zhang-fei' WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)})`);
  setHand(hostId, [draw], 4, 4);
  for (const bot of bots) setHand(bot.id, [], 4, 4);
  setDeck(code, [card("Attack", "shared-negation-draw-a"), card("Dodge", "shared-negation-draw-b")]);
  setTurn(code, host.seat, "play");

  const played = await request("play_card", { code, token, cardId: draw.id });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  const open = (await state(code, token)).data;
  const windowId = open.currentAction.negationWindowId;
  assert.ok(windowId);
  assert.equal(open.actionPlayerId, null);

  const result = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 4 });
  assert.equal(result.data.consumed, 3, JSON.stringify(result.data));
  assert.equal(query(`SELECT COUNT(*) FROM negation_window_submissions WHERE window_id=${quote(windowId)}`), "3");
  assert.equal(query(`SELECT COUNT(*) FROM negation_window_submissions WHERE window_id=${quote(windowId)} AND player_id=${quote(hostId)}`), "0");
  const repeated = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 4 });
  assert.equal(repeated.data.steps, 0);
  const pass = await request("decline_response", { code, token, context: { windowId } });
  assert.equal(pass.status, 200, JSON.stringify(pass.data));
  const after = (await state(code, token)).data;
  assert.equal(after.phase, "play");
  assert.equal(after.myHand.length, 2);
  assert.equal(roomCardCount(code, draw.id), 1);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("Bot Steal resumes through Negation and selects an opaque target-hand slot", async () => {
  const { code, token, hostId, bots } = await createBotGame();
  const actor = bots[0];
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(hostId)};
    UPDATE players SET role='Rebel' WHERE id=${quote(actor.id)};
    UPDATE players SET role='Loyalist' WHERE id=${quote(bots[1].id)};
    UPDATE players SET role='Renegade' WHERE id=${quote(bots[2].id)}`);
  const steal = card("Steal", "bot-steal");
  const hidden = card("Dodge", "bot-steal-target-private");
  sql(`UPDATE players SET hero='zhang-fei', equipment_json='{}' WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)})`);
  for (const bot of bots) setHand(bot.id, bot.id === actor.id ? [steal] : [], 4, 4);
  setHand(hostId, [hidden], 4, 4);
  setTurn(code, actor.seat, "play");
  const opening = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 4 });
  assert.equal(opening.data.consumed, 4, JSON.stringify(opening.data));
  const negation = (await state(code, token)).data;
  assert.ok(negation.currentAction.negationWindowId);
  const passed = await request("decline_response", { code, token, context: { windowId: negation.currentAction.negationWindowId } });
  assert.equal(passed.status, 200, JSON.stringify(passed.data));

  const pending = (await state(code, token)).data;
  assert.equal(pending.currentAction.kind, "target_card");
  assert.equal(pending.actionPlayerId, actor.id);
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  const workFilter = `room_id=${quote(roomId)} AND action_revision=${quote(pending.actionRevision)}`;
  sql(`CREATE TRIGGER abort_bot_target_card BEFORE UPDATE OF hand_json ON players
    WHEN OLD.id=${quote(hostId)} AND NEW.hand_json IS NOT OLD.hand_json
    BEGIN SELECT RAISE(ABORT, 'interrupted bot target card'); END;`);
  try {
    const failed = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1 });
    assert.equal(failed.data.retries, 1, JSON.stringify(failed.data));
    const retry = (await state(code, token)).data;
    assert.equal(retry.actionRevision, pending.actionRevision);
    assert.equal(retry.currentAction.kind, "target_card");
    assert.equal(retry.myHand[0].id, hidden.id);
  } finally {
    sql("DROP TRIGGER abort_bot_target_card");
  }
  const decisionId = query(`SELECT decision_id FROM bot_work WHERE ${workFilter}`);
  assert.ok(decisionId);
  sql(`UPDATE bot_work SET status='claimed', lease_token='expired-target-card', lease_until=1, available_at=1 WHERE decision_id=${quote(decisionId)};
    CREATE TRIGGER abort_bot_target_ack BEFORE UPDATE OF status ON bot_work
    WHEN OLD.decision_id=${quote(decisionId)} AND NEW.status='consumed'
    BEGIN SELECT RAISE(ABORT, 'interrupted bot target acknowledgment'); END;`);
  try {
    const interrupted = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
    assert.equal(interrupted.status, 200);
    assert.ok(interrupted.data.diagnostics.some((event) => event.event === "bot_scheduler_error"));
    const committed = (await state(code, token)).data;
    assert.equal(committed.phase, "play");
    assert.equal(committed.pendingTargetCard, null);
    assert.equal(committed.myHand.length, 0);
    assert.equal(query(`SELECT status FROM bot_work WHERE decision_id=${quote(decisionId)}`), "claimed");
  } finally {
    sql("DROP TRIGGER abort_bot_target_ack");
  }
  sql(`UPDATE bot_work SET lease_until=1 WHERE decision_id=${quote(decisionId)}`);
  await Promise.all([
    runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1 }),
    runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1 }),
  ]);
  assert.equal(query(`SELECT status FROM bot_work WHERE decision_id=${quote(decisionId)}`), "stale");
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(actor.id)}`))[0].id, hidden.id);
  assert.equal(roomCardCount(code, hidden.id), 1);
  assert.equal(roomCardCount(code, steal.id), 1);
  assert.ok(!JSON.stringify((await state(code, "")).data).includes(hidden.id));
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("an expired pending target-card claim recovers once across duplicate wakes", async () => {
  const { code, token, hostId, bots } = await createBotGame();
  const actor = bots[0];
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(hostId)};
    UPDATE players SET role='Rebel' WHERE id=${quote(actor.id)};
    UPDATE players SET role='Loyalist' WHERE id=${quote(bots[1].id)};
    UPDATE players SET role='Renegade' WHERE id=${quote(bots[2].id)}`);
  const steal = card("Steal", "bot-steal-expired-claim");
  const hidden = card("Dodge", "bot-steal-expired-claim-private");
  sql(`UPDATE players SET hero='zhang-fei', equipment_json='{}' WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)})`);
  for (const bot of bots) setHand(bot.id, bot.id === actor.id ? [steal] : [], 4, 4);
  setHand(hostId, [hidden], 4, 4);
  setTurn(code, actor.seat, "play");

  const opening = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 4 });
  assert.equal(opening.data.consumed, 4, JSON.stringify(opening.data));
  const negation = (await state(code, token)).data;
  assert.ok(negation.currentAction.negationWindowId);
  const passed = await request("decline_response", { code, token, context: { windowId: negation.currentAction.negationWindowId } });
  assert.equal(passed.status, 200, JSON.stringify(passed.data));

  const pending = (await state(code, token)).data;
  assert.equal(pending.currentAction.kind, "target_card");
  assert.equal(pending.actionPlayerId, actor.id);
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  let decisionId = query(`SELECT decision_id FROM bot_work WHERE room_id=${quote(roomId)} AND action_revision=${quote(pending.actionRevision)}`);
  // The human response POST may finish before its post-write waitUntil inserts
  // the next work row. Seed the same server-owned claim shape when that
  // response race leaves no row yet; the recovery assertion remains wholly
  // local and does not bypass the canonical target-card handler.
  if (!decisionId) {
    decisionId = crypto.randomUUID();
    const now = Date.now();
    sql(`INSERT INTO bot_work (decision_id,room_id,bot_id,action_revision,status,attempts,available_at,lease_token,lease_until,budget_reserved,created_at,updated_at)
      VALUES (${quote(decisionId)},${quote(roomId)},${quote(actor.id)},${quote(pending.actionRevision)},'claimed',1,1,'abandoned-target-card',1,1,${now},${now})`);
  }
  sql(`UPDATE bot_work SET status='claimed', lease_token='abandoned-target-card', lease_until=1, available_at=1
    WHERE decision_id=${quote(decisionId)}`);

  const wakes = await Promise.all([
    runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true }),
    runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true }),
  ]);
  const transitions = wakes.flatMap(({ data }) => data.diagnostics ?? [])
    .filter((event) => event.event === "bot_work_transition" && event.decisionId === decisionId);
  assert.equal(transitions.filter((event) => event.nextStatus === "consumed").length, 1,
    "duplicate Cron/waitUntil wakes consume the expired target-card claim once");
  assert.equal(query(`SELECT status FROM bot_work WHERE decision_id=${quote(decisionId)}`), "consumed");
  const settled = (await state(code, token)).data;
  assert.notEqual(settled.currentAction.kind, "target_card");
  assert.equal((await state(code, token)).data.myHand.some(({ id }) => id === hidden.id), false);
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(actor.id)}`)).some(({ id }) => id === hidden.id), true);
  assert.equal(roomCardCount(code, hidden.id), 1);
  assert.equal(roomCardCount(code, steal.id), 1);
  assert.ok(!JSON.stringify((await state(code, "")).data).includes(hidden.id), "anonymous viewers never receive the stolen card identity");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("shared rescue consumes at most one of two Bot Peach intents", async () => {
  const { code, token, hostId, bots } = await createBotGame();
  const [attacker, first, second] = bots;
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(hostId)};
    UPDATE players SET role='Rebel' WHERE id=${quote(attacker.id)};
    UPDATE players SET role='Loyalist' WHERE id=${quote(first.id)};
    UPDATE players SET role='Renegade' WHERE id=${quote(second.id)}`);
  const peaches = [card("Peach", "shared-rescue-first"), card("Peach", "shared-rescue-second")];
  const handCount = (id) => Number(query(`SELECT json_array_length(hand_json) FROM players WHERE id=${quote(id)}`));
  sql(`UPDATE players SET hero='zhang-fei', equipment_json='{}' WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)})`);
  setHand(hostId, [], 1, 4);
  setHand(attacker.id, [card("Attack", "shared-rescue-attack")], 4, 4);
  setHand(first.id, [peaches[0]], 4, 4);
  setHand(second.id, [peaches[1]], 4, 4);
  setTurn(code, attacker.seat, "play");
  assert.equal((await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1 })).data.consumed, 1);
  assert.equal((await request("decline_response", { code, token })).status, 200);
  const dying = (await state(code, token)).data;
  const windowId = dying.currentAction.sharedWindow?.windowId;
  assert.ok(windowId);
  assert.equal(dying.actionPlayerId, null);
  const wakes = await Promise.all([
    runBotScheduler({ roomCode: code, maxStepsPerWakeup: 4 }),
    runBotScheduler({ roomCode: code, maxStepsPerWakeup: 4 }),
  ]);
  assert.equal(wakes.reduce((sum, { data }) => sum + data.consumed, 0), 3);
  assert.equal(handCount(first.id) + handCount(second.id), 2, "intents do not use a Peach before arbitration");
  assert.equal((await request("skip_rescue", { code, token, windowId })).status, 200);
  const rescued = (await state(code, token)).data.players.find(({ id }) => id === hostId);
  assert.ok(rescued.alive && rescued.hp === 1);
  assert.equal(handCount(first.id) + handCount(second.id), 1);
  for (const peach of peaches) assert.equal(roomCardCount(code, peach.id), 1);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

for (const scenario of [
  { name: "Lord and Loyalist victory", hostRole: "Rebel", attackerRole: "Lord", otherSeatsAlive: false },
  { name: "Rebel victory", hostRole: "Lord", attackerRole: "Rebel", otherSeatsAlive: true },
  { name: "Traitor victory", hostRole: "Lord", attackerRole: "Renegade", otherSeatsAlive: false },
]) {
  test(`canonical Bot combat and shared rescue finish the match with ${scenario.name}`, async () => {
    const { code, token, hostId, bots } = await createBotGame();
    const [attacker, ...otherBots] = bots;
    const attack = card("Attack", "bot-terminal-combat");
    setHand(hostId, [], 1, 4);
    setHand(attacker.id, [attack], 4, 4);
    for (const other of otherBots) setHand(other.id, [], scenario.otherSeatsAlive ? 4 : 0, 4);
    sql(`UPDATE players SET hero='zhang-fei', equipment_json='{}' WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)})`);
    sql(`UPDATE players SET role=${quote(scenario.hostRole)} WHERE id=${quote(hostId)}`);
    sql(`UPDATE players SET role=${quote(scenario.attackerRole)} WHERE id=${quote(attacker.id)}`);
    for (const [index, other] of otherBots.entries()) {
      sql(`UPDATE players SET alive=${scenario.otherSeatsAlive ? 1 : 0},
        role=${quote(index === 0 ? "Rebel" : "Renegade")} WHERE id=${quote(other.id)}`);
    }
    setTurn(code, attacker.seat, "play");
    const opening = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1 });
    assert.equal(opening.data.consumed, 1, JSON.stringify(opening.data));
    const response = (await state(code, token)).data;
    assert.equal(response.actionPlayerId, hostId);
    assert.ok(response.currentAction.legalActions.includes("decline_response"));
    const declined = await request("decline_response", { code, token });
    assert.equal(declined.status, 200, JSON.stringify(declined.data));

    const dying = (await state(code, token)).data;
    assert.equal(dying.status, "playing");
    assert.ok(dying.currentAction.legalActions.includes("skip_rescue"));
    const skipped = await request("skip_rescue", { code, token, windowId: dying.currentAction.sharedWindow?.windowId });
    assert.equal(skipped.status, 200, JSON.stringify(skipped.data));
    const rescue = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 4 });
    assert.equal(rescue.data.unsupported, 0, JSON.stringify(rescue.data));
    const terminal = (await state(code, token)).data;
    assert.equal(terminal.status, "finished");
    assert.equal(terminal.phase, "finished");
    assert.ok(terminal.log.some((entry) => entry.includes(`${scenario.name}! The match is over.`)));
    assert.equal(roomCardCount(code, attack.id), 1);
  });
}

test("one human and three genuine Bots progress through a stratagem, Hero trigger and rescue to a winner", async () => {
  const { code, token, hostId, bots, room } = await createBotGame();
  const [attacker, helper, renegade] = bots;
  const draw = card("DrawTwo", "complete-bot-match");
  const attack = card("Attack", "complete-bot-match");
  const bow = card("KirinBow", "complete-bot-match");
  // Two Rebel hits should reach rescue; the Renegade now correctly avoids the Lord in a four-player game.
  setHand(hostId, [], 2, 4);
  setHand(attacker.id, [draw, attack], 3, 3);
  setHand(helper.id, [card("Attack", "complete-bot-match-helper")], 4, 4);
  setHand(renegade.id, [card("Attack", "complete-bot-match-renegade")], 4, 4);
  setDeck(code, Array.from({ length: 12 }, (_, index) => card("Dodge", `complete-bot-match-${index}`)));
  sql(`UPDATE players SET hero='zhang-fei', equipment_json='{}' WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)})`);
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(hostId)}`);
  sql(`UPDATE players SET role='Rebel', hero='huang-yueying' WHERE id=${quote(attacker.id)}`);
  sql(`UPDATE players SET role='Rebel', equipment_json=${quote(JSON.stringify({ weapon: bow }))} WHERE id=${quote(helper.id)}`);
  sql(`UPDATE players SET role='Renegade' WHERE id=${quote(renegade.id)}`);
  setTurn(code, room.players.find(({ id }) => id === hostId).seat, "play");
  assert.equal((await request("end_turn", { code, token })).status, 200);

  let steps = 0;
  let passedNegation = false;
  let declinedAttacks = 0;
  let skippedRescue = false;
  let final;
  const deadline = Date.now() + 20_000;
  for (let poll = 0; poll < 100 && Date.now() < deadline; poll++) {
    const scheduled = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 4 });
    assert.equal(scheduled.status, 200);
    assert.equal(scheduled.data.unsupported + scheduled.data.failed, 0, JSON.stringify(scheduled.data));
    steps += scheduled.data.steps;
    final = (await state(code, token)).data;
    if (final.status === "finished") break;
    const decision = final.currentAction;
    if (decision.actorId !== hostId) {
      // A committed discard handoff deliberately waits out its presentation
      // deadline before the next seat can draw.
      if (!scheduled.data.steps) await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }
    let human;
    if (decision.negationWindowId && decision.legalActions.includes("decline_response")) {
      human = await request("decline_response", { code, token, context: { windowId: decision.negationWindowId } });
      passedNegation = true;
    } else if (decision.legalActions.includes("decline_response")) {
      human = await request("decline_response", { code, token });
      declinedAttacks++;
    } else if (decision.sharedWindow?.windowId && !decision.sharedWindow.locked && decision.legalActions.includes("skip_rescue")) {
      human = await request("skip_rescue", { code, token, windowId: decision.sharedWindow.windowId });
      skippedRescue = true;
    }
    if (human) assert.equal(human.status, 200, JSON.stringify(human.data));
    else if (!scheduled.data.steps) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(final?.status, "finished", JSON.stringify({
    phase: final?.phase, turnSeat: final?.turnSeat, pending: final?.currentAction?.kind,
    steps, passedNegation, declinedAttacks, skippedRescue,
    seats: final?.players.map(({ seat, hp, botStatus }) => ({ seat, hp, botStatus })),
  }));
  assert.ok(passedNegation && declinedAttacks >= 2 && skippedRescue);
  assert.ok(steps > 0 && steps <= 200);
  assert.match(final.log.join("\n"), /Cultivation/);
  assert.match(final.log.join("\n"), /Rebel victory! The match is over\./);
  assert.equal(final.players.filter(({ isBot }) => isBot).length, 3);
  assert.equal(roomCardCount(code, draw.id), 1);
  assert.equal(roomCardCount(code, attack.id), 1);
});

test("a two-Dodge requirement uses one canonical response per revision", async () => {
  const { code, token, hostId, bots, room } = await createBotGame();
  const bot = bots[0];
  const host = room.players.find((player) => player.id === hostId);
  sql(`UPDATE players SET hero='sun-quan' WHERE id IN (${quote(hostId)}, ${quote(bot.id)})`);
  setHand(hostId, [card("Attack", "scheduler-multi-dodge-attack")], 4, 4);
  setHand(bot.id, [card("Dodge", "scheduler-multi-dodge-a"), card("Dodge", "scheduler-multi-dodge-b")], 4, 4);
  setTurn(code, host.seat, "play");
  const attack = await requestAndSettle("play_card", { code, token, cardId: "attack-scheduler-multi-dodge-attack", targetId: bot.id });
  assert.equal(attack.status, 200, JSON.stringify(attack.data));
  const pending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`));
  assert.equal(pending.kind, "response", "the fixture is an ordinary card Attack Dodge window");
  assert.ok(pending.requirement, "the ordinary response window carries its explicit Dodge requirement");
  pending.requirement.count = 2;
  pending.continuation.requiredDodgeCount = 2;
  sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify(pending))} WHERE code=${quote(code)}`);
  const hpBefore = attack.data.room.players.find((player) => player.id === bot.id).hp;

  const first = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(first.data.consumed, 1);
  const response = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`));
  assert.equal(response.requirement.count, 1);
  assert.equal((await state(code, token)).data.players.find((player) => player.id === bot.id).handCount, 1);
  const second = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(second.data.consumed, 1);
  const after = (await state(code, token)).data;
  assert.equal(after.players.find((player) => player.id === bot.id).hp, hpBefore);
  assert.equal(after.players.find((player) => player.id === bot.id).handCount, 0);
  assert.equal(after.actionPlayerId, hostId);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("concurrent scheduler wakeups consume one eligible Dodge at most once", async () => {
  const { code, token, hostId, bots, room } = await createBotGame();
  const bot = bots[0];
  const host = room.players.find((player) => player.id === hostId);
  sql(`UPDATE players SET hero='sun-quan' WHERE id IN (${quote(hostId)}, ${quote(bot.id)})`);
  setHand(hostId, [card("Attack", "scheduler-race-attack")], 4, 4);
  setHand(bot.id, [card("Dodge", "scheduler-race-dodge")], 4, 4);
  setTurn(code, host.seat, "play");
  const attack = await requestAndSettle("play_card", { code, token, cardId: "attack-scheduler-race-attack", targetId: bot.id });
  assert.equal(attack.status, 200, JSON.stringify(attack.data));
  const hpBefore = attack.data.room.players.find((player) => player.id === bot.id).hp;

  const wakeups = await Promise.all([
    runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true }),
    runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true }),
  ]);
  const initialConsumed = wakeups.reduce((sum, wake) => sum + wake.data.consumed, 0);
  assert.ok(initialConsumed <= 1, "concurrent scheduler wakeups cannot consume the same Dodge more than once");
  if (initialConsumed === 0) wakeups.push(await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true }));
  assert.equal(wakeups.reduce((sum, wake) => sum + wake.data.consumed, 0), 1, JSON.stringify(wakeups.map((wake) => ({
    consumed: wake.data.consumed, unsupported: wake.data.unsupported, stale: wake.data.stale, failed: wake.data.failed,
    skippedLocked: wake.data.skippedLocked, steps: wake.data.steps,
    decisions: wake.data.decisionDiagnostics.map(({ event, cause, selectedAction, httpStatus }) => ({ event, cause, selectedAction, httpStatus })),
  }))));
  const consumedTransitions = wakeups.flatMap((wake) => wake.data.diagnostics)
    .filter((event) => event.event === "bot_work_transition" && event.nextStatus === "consumed");
  assert.equal(consumedTransitions.length, 1);
  const publicRoom = (await state(code, token)).data;
  assert.equal(publicRoom.players.find((player) => player.id === bot.id).hp, hpBefore);
  assert.equal(query(`SELECT COUNT(*) FROM players WHERE id=${quote(bot.id)} AND hand_json='[]'`), "1");
  assert.equal(query(`SELECT COUNT(*) FROM bot_work WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)}) AND status='consumed'`), "1");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("skill-converted Dodge uses the canonical provider and consumes the physical card", async () => {
  const { code, token, hostId, bots, room } = await createBotGame();
  const bot = bots[0];
  const host = room.players.find((player) => player.id === hostId);
  sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(hostId)}`);
  sql(`UPDATE players SET hero='zhen-ji' WHERE id=${quote(bot.id)}`);
  setHand(hostId, [card("Attack", "scheduler-skill-attack")], 4, 4);
  setHand(bot.id, [card("Attack", "scheduler-skill-black-card", "♣")], 4, 4);
  setTurn(code, host.seat, "play");
  const attack = await requestAndSettle("play_card", { code, token, cardId: "attack-scheduler-skill-attack", targetId: bot.id });
  assert.equal(attack.status, 200, JSON.stringify(attack.data));
  const hpBefore = attack.data.room.players.find((player) => player.id === bot.id).hp;

  const played = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(played.data.consumed, 1);
  const evaluation = played.data.decisionDiagnostics.find((event) => event.event === "bot_decision_evaluation");
  assert.equal(evaluation.cause, "canonical_combat_response");
  assert.equal(evaluation.options[0].providerId, "zhen_ji_black_card_dodge");
  const after = (await state(code, token)).data;
  assert.equal(after.players.find((player) => player.id === bot.id).hp, hpBefore);
  assert.equal(after.players.find((player) => player.id === bot.id).handCount, 0);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("a bot's canonical empty-response decline logs one consumed transition", async () => {
  const { code, token, hostId, bots, room } = await createBotGame();
  const bot = bots[0];
  const host = room.players.find((player) => player.id === hostId);
  sql(`UPDATE players SET hero='sun-quan' WHERE id IN (${quote(hostId)}, ${quote(bot.id)})`);
  setHand(hostId, [card("Attack", "scheduler-decline-attack")], 4, 4);
  setHand(bot.id, [card("Peach", "scheduler-decline-peach")], 4, 4);
  setTurn(code, host.seat, "play");
  const attack = await requestAndSettle("play_card", { code, token, cardId: "attack-scheduler-decline-attack", targetId: bot.id });
  assert.equal(attack.status, 200, JSON.stringify(attack.data));
  const hpBefore = attack.data.room.players.find((player) => player.id === bot.id).hp;

  const declined = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(declined.data.consumed, 1, JSON.stringify({
    consumed: declined.data.consumed,
    unsupported: declined.data.unsupported,
    stale: declined.data.stale,
    failed: declined.data.failed,
    decisions: declined.data.decisionDiagnostics.map(({ event, selectedAction, cause, httpStatus, canonicalOutcome, workStatus }) => ({ event, selectedAction, cause, httpStatus, canonicalOutcome, workStatus })),
    transitions: declined.data.diagnostics.map(({ event, nextStatus, errorCode }) => ({ event, nextStatus, errorCode })),
  }));
  const evaluation = declined.data.decisionDiagnostics.find((event) => event.event === "bot_decision_evaluation");
  const result = declined.data.decisionDiagnostics.find((event) => event.event === "bot_decision_result");
  assert.equal(evaluation.cause, "no_legal_defense_declined");
  assert.equal(evaluation.selectedAction, "decline_response");
  assert.equal(result.before.hand.length, 1);
  assert.equal(result.after.hand.length, 1);
  assert.equal(result.mutationCommitted, true, "declining is correlated with canonical HP/pending progression");
  const declinedEvent = declined.data.diagnostics.find((event) => event.event === "bot_work_transition" && event.nextStatus === "consumed");
  assert.ok(declinedEvent, "the canonical decline emits one consumed transition");
  assert.equal((await state(code, token)).data.players.find((player) => player.id === bot.id).hp, hpBefore - 1,
    "the canonical decline resolves the Attack when the bot has no legal Dodge option");
  const repeated = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.equal(repeated.data.diagnostics.filter((event) => event.event === "bot_work_transition" && event.decisionId === declinedEvent.decisionId).length, 0,
    "the consumed decline does not produce a duplicate event even if a later Bot decision changes state");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("a thrown dispatch records one sanitized retry transition and does not leak exception text", async () => {
  const { code, token, bots } = await createBotGame();
  const bot = bots[0];
  setHand(bot.id, [], 4, 4);
  setDeck(code, [card("Attack", "scheduler-throw-held"), card("Dodge", "scheduler-throw-next")]);
  setTurn(code, bot.seat, "draw");

  const failedDispatch = await runBotScheduler({
    roomCode: code,
    maxStepsPerWakeup: 1,
    captureDiagnostics: true,
    simulateDispatchError: true,
  });
  assert.equal(failedDispatch.data.retries, 1);
  const transitions = failedDispatch.data.diagnostics.filter((event) => event.event === "bot_work_transition");
  assert.equal(transitions.length, 1);
  assert.equal(transitions[0].previousStatus, "claimed");
  assert.equal(transitions[0].nextStatus, "pending");
  assert.equal(transitions[0].errorCode, "dispatch_error");
  assert.equal(failedDispatch.data.diagnostics.filter((event) => event.event === "bot_scheduler_summary").length, 1);
  assert.equal(JSON.stringify(failedDispatch.data.diagnostics).includes("test-only dispatch exception"), false);
  assert.equal(JSON.stringify(failedDispatch.data.diagnostics).includes("must-not-be-logged"), false);

  sql(`UPDATE bot_work SET available_at=${Date.now() + 60_000} WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)}) AND error_code='dispatch_error'`);
  const repeated = await runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true });
  assert.deepEqual(repeated.data.diagnostics, [], "a scheduled retry is not logged again before its next state transition");
  assert.equal((await state(code, token)).data.players.find((player) => player.id === bot.id).handCount, 0);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("expired Bot End Turn acknowledgement cannot replay the committed turn", async () => {
  const { code, token, bots } = await createBotGame();
  const [actor, next] = bots;
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  sql(`UPDATE players SET hero='zhang-fei' WHERE room_id=${quote(roomId)}`);
  setHand(actor.id, [], 4, 4);
  setTurn(code, actor.seat, "play");
  const before = (await state(code, token)).data;
  const revision = quote(before.actionRevision);
  const epoch = Number(query(`SELECT turn_epoch FROM rooms WHERE id=${quote(roomId)}`));
  const decisionId = quote(crypto.randomUUID());
  sql(`INSERT INTO bot_work (decision_id,room_id,bot_id,action_revision,status,attempts,available_at,lease_token,lease_until,budget_reserved,created_at,updated_at)
    VALUES (${decisionId},${quote(roomId)},${quote(actor.id)},${revision},'claimed',1,1,'expired-before-dispatch',1,1,1,1);
    CREATE TRIGGER abort_end_turn_ack BEFORE UPDATE OF status ON bot_work
    WHEN OLD.decision_id=${decisionId} AND NEW.status='consumed'
    BEGIN SELECT RAISE(ABORT, 'interrupted End Turn acknowledgement'); END;`);
  try {
    const [interrupted, competingHuman] = await Promise.all([
      runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1, captureDiagnostics: true }),
      request("end_turn", { code, token, context: { actionRevision: before.actionRevision, phase: "play" } }),
    ]);
    assert.equal(competingHuman.status, 409, "a competing room member cannot end the Bot's turn");
    assert.ok(interrupted.data.diagnostics.some((event) => event.event === "bot_scheduler_error"));
    const after = (await state(code, token)).data;
    assert.equal(after.phase, "draw");
    assert.equal(after.currentAction.actorId, next.id);
    assert.equal(query(`SELECT status FROM bot_work WHERE decision_id=${decisionId}`), "claimed");
  } finally {
    sql("DROP TRIGGER abort_end_turn_ack");
  }
  sql(`UPDATE bot_work SET lease_until=1 WHERE decision_id=${decisionId}`);
  await Promise.all([runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1 }),
    runBotScheduler({ roomCode: code, maxStepsPerWakeup: 1 })]);
  assert.equal(query(`SELECT status FROM bot_work WHERE decision_id=${decisionId}`), "stale");
  assert.equal(Number(query(`SELECT turn_epoch FROM rooms WHERE id=${quote(roomId)}`)), epoch + 1);
  const afterRetry = (await state(code, token)).data;
  assert.equal(afterRetry.log.filter((log) => log.includes(`${actor.name} finishes Play; the turn-end event begins`)).length, 1);
});
