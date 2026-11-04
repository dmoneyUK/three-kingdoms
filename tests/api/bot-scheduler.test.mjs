import test from "node:test";
import {
  assert, card, query, quote, requestAndSettle, runBotScheduler, runBotStep,
  setDeck, setHand, setTurn, roomCardCount, sql, state,
} from "./test-support.mjs";

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
  const waiting = await runBotScheduler({ maxStepsPerWakeup: 4 });
  assert.equal(waiting.status, 200, JSON.stringify(waiting.data));
  assert.equal(waiting.data.steps, 0, "no bot acts while the human owns Hero selection");
  assert.equal((await state(code, token)).data.actionRevision, revision);
  assert.equal(query(`SELECT COUNT(*) FROM bot_work WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)})`), "0");

  const hero = room.myHeroOptions[0];
  assert.ok(hero);
  const chosen = await requestAndSettle("choose_hero", { code, token, heroId: hero.id });
  assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
  const scheduled = await runBotScheduler({ maxStepsPerWakeup: 3 });
  assert.equal(scheduled.status, 200, JSON.stringify(scheduled.data));
  assert.equal(scheduled.data.steps, 3);
  assert.equal(scheduled.data.consumed, 3);
  room = (await state(code, token)).data;
  assert.equal(room.status, "playing");
  assert.ok(room.players.filter((player) => player.isBot).every((player) => player.hero), "bots use their assigned Hero choices");
  assert.equal(query(`SELECT COUNT(*) FROM bot_work WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)}) AND status='consumed'`), "3");
  assert.equal(query(`SELECT actions_reserved FROM bot_room_scheduler WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)})`), "3");
  assert.equal(JSON.stringify(scheduled.data).includes("myHand"), false, "scheduler evidence contains only bounded counters");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("public Staging bot creation stops at its global per-hour limit", async () => {
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

test("Staging caps concurrent active bot rooms without starting a ninth room", async () => {
  sql("DELETE FROM bot_demo_rate_limits");
  for (let index = 0; index < 8; index++) {
    const roomId = crypto.randomUUID();
    const botId = crypto.randomUUID();
    const code = `CAP${String(index).padStart(2, "0")}`;
    sql(`INSERT INTO rooms (id, code, host_player_id, status, max_players, created_at)
      VALUES (${quote(roomId)}, ${quote(code)}, ${quote(crypto.randomUUID())}, 'playing', 4, ${Date.now()})`);
    sql(`INSERT INTO players (id, room_id, name, token_hash, seat, connected_at, controller_type)
      VALUES (${quote(botId)}, ${quote(roomId)}, 'CAP BOT', ${quote(`bot:no-login:${botId}`)}, 0, ${Date.now()}, 'bot')`);
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

test("duplicate wakes and an expired claim recover through one canonical draw without double mutation", async () => {
  const { code, token, bots } = await createBotGame();
  const bot = bots[0];
  setHand(bot.id, [], 4, 4);
  setDeck(code, [card("Attack", "scheduler-draw-a"), card("Dodge", "scheduler-draw-b"), card("Peach", "scheduler-draw-c")]);
  setTurn(code, bot.seat, "draw");
  const beforeDraw = (await state(code, token)).data;

  const concurrent = await Promise.all([
    runBotScheduler({ maxStepsPerWakeup: 1 }),
    runBotScheduler({ maxStepsPerWakeup: 1 }),
  ]);
  assert.ok(concurrent.every((result) => result.status === 200));
  const afterDraw = (await state(code, token)).data;
  assert.equal(afterDraw.players.find((player) => player.id === bot.id).handCount, 2, "the revision's canonical draw runs once even across duplicate wakes");
  assert.ok(["thinking", "waiting_for_human"].includes(afterDraw.players.find((player) => player.id === bot.id).botStatus), "duplicate wakeups expose only a safe in-progress or waiting status");
  for (const held of ["attack-scheduler-draw-a", "dodge-scheduler-draw-b"]) assert.equal(roomCardCount(code, held), 1);
  assert.equal(query(`SELECT COUNT(*) FROM bot_work WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)}) AND bot_id=${quote(bot.id)} AND action_revision=${quote(beforeDraw.actionRevision)}`), "1");
  assert.equal(query(`SELECT status FROM bot_work WHERE room_id=(SELECT id FROM rooms WHERE code=${quote(code)}) AND bot_id=${quote(bot.id)} AND action_revision=${quote(beforeDraw.actionRevision)}`), "consumed");

  // A later Worker wake can take over a persisted claim whose lease expired.
  setHand(bot.id, [card("Attack", "scheduler-restart-held")], 4, 4);
  setDeck(code, [card("Dodge", "scheduler-restart-a"), card("Peach", "scheduler-restart-b"), card("Attack", "scheduler-restart-c")]);
  setTurn(code, bot.seat, "draw");
  const restartState = (await state(code, token)).data;
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  const decisionId = crypto.randomUUID();
  const oldTime = Date.now() - 120_000;
  sql(`INSERT INTO bot_work (decision_id, room_id, bot_id, action_revision, status, attempts, available_at, lease_token, lease_until, budget_reserved, created_at, updated_at)
    VALUES (${quote(decisionId)}, ${quote(roomId)}, ${quote(bot.id)}, ${quote(restartState.actionRevision)}, 'claimed', 1, ${oldTime}, 'abandoned-worker-lease', ${oldTime}, 1, ${oldTime}, ${oldTime})`);
  const recovered = await runBotScheduler({ maxStepsPerWakeup: 1 });
  assert.equal(recovered.data.consumed, 1, JSON.stringify(recovered.data));
  assert.equal(query(`SELECT status FROM bot_work WHERE decision_id=${quote(decisionId)}`), "consumed");
  assert.equal(query(`SELECT attempts FROM bot_work WHERE decision_id=${quote(decisionId)}`), "2");
  const afterRecovery = (await state(code, token)).data;
  assert.equal(afterRecovery.players.find((player) => player.id === bot.id).handCount, 3, "the expired unexecuted claim resumes once");
  for (const held of ["attack-scheduler-restart-held", "dodge-scheduler-restart-a", "peach-scheduler-restart-b"]) assert.equal(roomCardCount(code, held), 1);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("human turns and the exhausted per-room action budget leave bot actions untouched", async () => {
  const { code, token, hostId, bots } = await createBotGame();
  const bot = bots[0];
  const human = (await state(code, token)).data.players.find((player) => player.id === hostId);
  setTurn(code, human.seat, "play");
  const humanState = (await state(code, token)).data;
  assert.equal(humanState.actionPlayerId, hostId, "the human owns the current authoritative turn");
  const waiting = await runBotScheduler({ maxStepsPerWakeup: 2 });
  assert.equal(waiting.data.steps, 0);
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
  const lateWake = await runBotScheduler({ maxStepsPerWakeup: 1 });
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
  const retries = await runBotScheduler({ maxStepsPerWakeup: 1 });
  assert.equal(retries.data.failed, 1);
  assert.equal(query(`SELECT error_code FROM bot_work WHERE decision_id=${quote(exhaustedDecisionId)}`), "retry_limit");
  assert.equal(query(`SELECT status FROM bot_work WHERE decision_id=${quote(delayedDecisionId)}`), "stale", "the next bot revision expires the abandoned human-era work");
  assert.equal((await state(code, token)).data.actionRevision, retryState.actionRevision, "a retry-exhausted decision is not dispatched");

  // A new state revision cannot spend beyond the room's persisted 200-action budget.
  setHand(bot.id, [card("Peach", "scheduler-budget-held")], 4, 4);
  setDeck(code, [card("Attack", "scheduler-budget-a"), card("Dodge", "scheduler-budget-b")]);
  setTurn(code, bot.seat, "draw");
  const budgetState = (await state(code, token)).data;
  sql(`UPDATE bot_room_scheduler SET lease_token=NULL, lease_until=0, actions_reserved=200, updated_at=${Date.now()} WHERE room_id=${quote(roomId)}`);
  const bounded = await runBotScheduler({ maxStepsPerWakeup: 1 });
  assert.equal(bounded.data.steps, 0);
  assert.equal(bounded.data.failed, 1);
  assert.equal(query(`SELECT error_code FROM bot_work WHERE room_id=${quote(roomId)} AND action_revision=${quote(budgetState.actionRevision)}`), "action_budget_exhausted");
  assert.equal((await state(code, token)).data.players.find((player) => player.id === bot.id).botStatus, "error");
  assert.equal((await state(code, token)).data.actionRevision, budgetState.actionRevision, "the 200-action cap blocks dispatch");
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});

test("unsupported bot responses stop without advancing and reveal no private work data", async () => {
  const { code, token, hostId, bots, room } = await createBotGame();
  const bot = bots[0];
  const host = room.players.find((player) => player.id === hostId);
  setHand(hostId, [card("Attack", "scheduler-unsupported-attack")], 4, 4);
  setHand(bot.id, [card("Dodge", "scheduler-unsupported-dodge")], 4, 4);
  setTurn(code, host.seat, "play");
  const attack = await requestAndSettle("play_card", { code, token, cardId: "attack-scheduler-unsupported-attack", targetId: bot.id });
  assert.equal(attack.status, 200, JSON.stringify(attack.data));
  assert.equal(attack.data.room.actionPlayerId, bot.id);
  const hpBefore = attack.data.room.players.find((player) => player.id === bot.id).hp;

  const stopped = await runBotScheduler({ maxStepsPerWakeup: 1 });
  assert.equal(stopped.data.unsupported, 1);
  const publicRoom = (await state(code, token)).data;
  assert.equal(publicRoom.players.find((player) => player.id === bot.id).botStatus, "unsupported");
  assert.equal(publicRoom.players.find((player) => player.id === bot.id).hp, hpBefore, "a legal Dodge option is never silently declined");
  const serialized = JSON.stringify(publicRoom);
  assert.equal(serialized.includes("scheduler-unsupported-dodge"), false);
  assert.equal(serialized.includes("token_hash"), false);
  assert.equal(serialized.includes("error_code"), false);
  sql(`UPDATE rooms SET status='finished', phase='finished' WHERE code=${quote(code)}`);
});
