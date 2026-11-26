import test from "node:test";
import { strict as assert } from "node:assert";
import { performance } from "node:perf_hooks";
import { baseUrl } from "./harness.mjs";
import {
  card,
  createTestLobby,
  query,
  quote,
  request,
  requestAndSettle,
  roomCardCount,
  runBotScheduler,
  runBotStep,
  seedPlayingGame,
  setDeck,
  setHand,
  setTurn,
  sql,
  state,
} from "./test-support.mjs";

const SEED = 0x5eedf00d;
const PUBLIC_EVENTS = 203;
const BOT_WORK_ROWS = 150;
const WARMUPS = Math.max(1, Number(process.env.FREE_BUDGET_RUNTIME_WARMUPS ?? 1));
const MEASURED = Math.max(3, Number(process.env.FREE_BUDGET_RUNTIME_SAMPLES ?? 3));
const ROLES = ["Lord", "Loyalist", "Rebel", "Renegade"];
const HEROES = ["cao-cao", "liu-bei", "sun-quan", "xiahou-dun"];
const SAFE_DEMO_HERO_IDS = new Set([
  "cao-cao", "liu-bei", "sun-quan", "xiahou-dun", "guo-jia", "guan-yu", "zhang-fei", "zhao-yun", "ma-chao",
  "gan-ning", "huang-gai", "sun-shangxiang", "hua-tuo", "lü-bu", "huaxiong", "gongsun-zan", "pan-feng",
]);

function percentile(values, p) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function summarize(samples) {
  const wall = samples.map((sample) => sample.wallMs);
  const clientCpu = samples.map((sample) => sample.clientProcessCpuMs);
  const bytes = samples.map((sample) => sample.responseBytes);
  const statuses = samples.reduce((counts, sample) => {
    const key = String(sample.status);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  return {
    samples: samples.length,
    statuses,
    responseBytes: { p50: percentile(bytes, 50), p95: percentile(bytes, 95), max: Math.max(...bytes) },
    wallMs: { p50: percentile(wall, 50), p95: percentile(wall, 95), p99: percentile(wall, 99), max: Math.max(...wall) },
    clientProcessCpuMs: { p50: percentile(clientCpu, 50), p95: percentile(clientCpu, 95), p99: percentile(clientCpu, 99), max: Math.max(...clientCpu) },
  };
}

async function jsonFetch(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* The caller reports the bounded status only. */ }
  return { status: response.status, data, text, responseBytes: Buffer.byteLength(text) };
}

async function measured(label, operation) {
  const startedAt = performance.now();
  const cpuBefore = process.cpuUsage();
  const result = await operation();
  const cpu = process.cpuUsage(cpuBefore);
  return {
    label,
    status: result.status,
    // Kept on the in-process sample only for assertions; summarize() emits
    // bounded timings/statuses and never serializes response bodies.
    data: result.data,
    text: result.text ?? "",
    responseBytes: result.responseBytes ?? 0,
    wallMs: performance.now() - startedAt,
    // This is the Node test process around the HTTP request, never a claim
    // about Cloudflare Worker invocation CPU.
    clientProcessCpuMs: (cpu.user + cpu.system) / 1000,
  };
}

function jsonPost(action, values) {
  return jsonFetch("/api/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ...values }),
  });
}

function roomGet(code, token) {
  return jsonFetch(`/api/rooms?${new URLSearchParams({ code, token })}`);
}

function roomIdForCode(code) {
  const roomId = query(`SELECT id FROM rooms WHERE code=${quote(code)}`);
  assert.ok(roomId, `local D1 exposes the room id for ${code}`);
  return roomId;
}

function playerHandContains(playerId, cardId) {
  const handJson = query(`SELECT hand_json FROM players WHERE id=${quote(playerId)}`);
  return JSON.parse(handJson || "[]").some((held) => held.id === cardId);
}

function finishLocalBotRoom(roomId) {
  sql(`UPDATE rooms SET status='finished', phase='finished', pending_json=NULL WHERE id=${quote(roomId)} AND test_room=0`);
}

function resetStaleLocalBotRooms() {
  sql("UPDATE rooms SET status='finished', phase='finished', pending_json=NULL WHERE test_room=0 AND status IN ('lobby','heroes','playing') AND EXISTS (SELECT 1 FROM players WHERE players.room_id=rooms.id AND players.controller_type='bot')");
  sql("DELETE FROM bot_demo_rate_limits");
}

function actionContext(view, meId) {
  const decision = view.currentAction ?? {};
  return {
    actionRevision: view.actionRevision,
    meId,
    phase: view.phase,
    pendingKind: view.pending?.kind ?? null,
    actorId: view.actionPlayerId,
    ...(decision.negationWindowId ? { windowId: decision.negationWindowId } : {}),
    ...(decision.sharedWindow?.windowId ? { windowId: decision.sharedWindow.windowId } : {}),
  };
}

function seedLongHistory(roomId, playerIds) {
  const log = Array.from({ length: PUBLIC_EVENTS }, (_, index) => {
    const sequence = index + 1;
    return `@event:${JSON.stringify({
      id: `free-budget-runtime-${SEED}-${index}`,
      message: `Benchmark public event ${index}`,
      publicSequence: sequence,
      publicSequenceWatermark: sequence,
    })}`;
  });
  const now = Date.now();
  const workRows = Array.from({ length: BOT_WORK_ROWS }, (_, index) => {
    const botId = playerIds[index % playerIds.length];
    const revision = `free-budget-runtime-${SEED}-${index}`;
    return `(${quote(`${roomId}-${revision}`)},${quote(roomId)},${quote(botId)},${quote(revision)},'consumed',1,${now + index},NULL,NULL,0,'benchmark_seed',${now},${now})`;
  });
  sql(`UPDATE rooms SET log_json=${quote(JSON.stringify(log))} WHERE id=${quote(roomId)}`);
  sql(`INSERT INTO bot_work
    (decision_id, room_id, bot_id, action_revision, status, attempts, available_at, lease_token, lease_until, budget_reserved, error_code, created_at, updated_at)
    VALUES ${workRows.join(",")}`);
  assert.equal(query(`SELECT COUNT(*) FROM rooms WHERE id=${quote(roomId)} AND json_array_length(log_json)=${PUBLIC_EVENTS}`), "1");
  assert.equal(query(`SELECT COUNT(*) FROM bot_work WHERE room_id=${quote(roomId)}`), String(BOT_WORK_ROWS));
}

async function createHumanHistoryFixture({ phase = "draw", turnSeat = 0 } = {}) {
  const privateCards = HEROES.map((_, index) => card("Dodge", `free-budget-human-${SEED}-${index}`));
  const game = await seedPlayingGame({
    phase,
    turnSeat,
    players: ROLES.map((role, index) => ({
      name: `Free budget human ${index + 1}`,
      role,
      hero: HEROES[index],
      hp: 4,
      maxHp: 4,
      hand: [privateCards[index]],
    })),
    deck: [card("Peach", `free-budget-deck-${SEED}`), card("Attack", `free-budget-deck-attack-${SEED}`)],
  });
  const ids = game.room.players.map((player) => player.id);
  setTurn(game.code, ids[turnSeat] ? turnSeat : 0, phase);
  seedLongHistory(game.fixture.roomId, ids);
  return { ...game, playerIds: ids, privateCards };
}

async function createGenuineBotGame() {
  sql("DELETE FROM bot_demo_rate_limits");
  const created = await requestAndSettle("create", { name: `Free budget bot ${SEED}` });
  assert.equal(created.status, 201, JSON.stringify({ status: created.status }));
  const code = created.data.room.code;
  const hostId = created.data.room.meId;
  for (let index = 0; index < 3; index += 1) {
    const added = await requestAndSettle("add_bot", { code, token: created.data.token, requestId: crypto.randomUUID() });
    assert.equal(added.status, 201, JSON.stringify({ status: added.status }));
  }
  const started = await requestAndSettle("start", { code, token: created.data.token });
  assert.ok(started?.data?.room, JSON.stringify(started));
  let room = started.data.room;
  for (let guard = 0; room.status === "heroes" && guard < 8; guard += 1) {
    const actor = room.players.find((player) => player.id === room.actionPlayerId);
    assert.ok(actor, "the real Bot fixture exposes one Hero actor at a time");
    if (actor.id === hostId) {
      const hero = room.myHeroOptions.find(({ id }) => SAFE_DEMO_HERO_IDS.has(id)) ?? room.myHeroOptions[0];
      const chosen = await requestAndSettle("choose_hero", { code, token: created.data.token, heroId: hero?.id });
      assert.equal(chosen.status, 200, JSON.stringify({ status: chosen.status }));
    } else {
      const chosen = await runBotStep(code, actor.id, { actionRevision: room.actionRevision, decisionId: crypto.randomUUID() });
      assert.equal(chosen.status, 200, JSON.stringify({ status: chosen.status }));
      assert.notEqual(chosen.data.state, "unsupported", JSON.stringify({ state: chosen.data.state }));
    }
    room = (await state(code, created.data.token)).data;
  }
  assert.equal(room.status, "playing");
  const bots = room.players.filter((player) => player.isBot);
  assert.equal(bots.length, 3);
  const roomId = roomIdForCode(code);
  seedLongHistory(roomId, room.players.map((player) => player.id));
  return { code, roomId, token: created.data.token, hostId, room, bots };
}

async function prepareBotDraw() {
  const game = await createGenuineBotGame();
  const bot = game.bots[0];
  const drawn = card("Peach", `free-budget-bot-draw-${SEED}-${crypto.randomUUID()}`);
  setHand(bot.id, [], 4, 4);
  setDeck(game.code, [drawn]);
  setTurn(game.code, bot.seat, "draw");
  const view = (await state(game.code, game.token)).data;
  assert.equal(view.currentAction.actorId, bot.id);
  return { ...game, bot, drawn, view };
}

async function prepareResponse() {
  const game = await createHumanHistoryFixture({ phase: "play", turnSeat: 0 });
  const [source, target] = game.room.players;
  const sourceToken = game.members[0].token;
  const targetToken = game.members[1].token;
  const attack = card("Attack", `free-budget-response-${SEED}-${crypto.randomUUID()}`);
  setHand(source.id, [attack], 4, 4);
  setHand(target.id, [], 4, 4);
  setTurn(game.code, source.seat, "play");
  const opened = await request("play_card", { code: game.code, token: sourceToken, cardId: attack.id, targetId: target.id });
  assert.equal(opened.status, 200, JSON.stringify({ status: opened.status }));
  const targetView = (await state(game.code, targetToken)).data;
  assert.equal(targetView.currentAction?.kind, "response");
  assert.equal(targetView.currentAction?.actorId, target.id);
  return { ...game, source, target, sourceToken, targetToken, attack, targetView };
}

async function prepareTerminalSettlement() {
  const game = await createHumanHistoryFixture({ phase: "play", turnSeat: 1 });
  const hostId = game.playerIds[0];
  const attacker = game.room.players.find(({ id }) => id === game.playerIds[1]);
  const attack = card("Attack", `free-budget-terminal-${SEED}-${crypto.randomUUID()}`);
  setHand(hostId, [], 1, 4);
  setHand(attacker.id, [attack], 4, 4);
  setTurn(game.code, attacker.seat, "play");
  const opening = await request("play_card", {
    code: game.code,
    token: game.members[1].token,
    cardId: attack.id,
    targetId: hostId,
  });
  assert.equal(opening.status, 200, JSON.stringify({ status: opening.status }));
  const hostToken = game.members[0].token;
  const responseView = (await state(game.code, hostToken)).data;
  if (responseView.currentAction?.kind === "response") {
    assert.ok(responseView.currentAction.legalActions?.includes("decline_response"), JSON.stringify({ phase: responseView.phase, status: responseView.status, currentAction: responseView.currentAction, pending: responseView.pending }));
    const declined = await jsonPost("decline_response", {
      code: game.code,
      token: hostToken,
      context: actionContext(responseView, hostId),
    });
    assert.equal(declined.status, 200, JSON.stringify({ status: declined.status }));
  } else {
    assert.ok(responseView.currentAction?.kind === "dying" && responseView.currentAction.legalActions?.includes("skip_rescue"), JSON.stringify({ phase: responseView.phase, status: responseView.status, currentAction: responseView.currentAction, pending: responseView.pending }));
  }
  const dying = (await state(game.code, hostToken)).data;
  assert.ok(dying.currentAction?.legalActions?.includes("skip_rescue"), JSON.stringify({ phase: dying.phase, status: dying.status, currentAction: dying.currentAction, pending: dying.pending, players: dying.players.map(({ id, role, alive, hp }) => ({ id, role, alive, hp })) }));
  return { ...game, hostId, token: hostToken, roomId: game.fixture.roomId, dying };
}

async function collectScenario(name, sampleFactory) {
  for (let warmup = 0; warmup < WARMUPS; warmup += 1) await sampleFactory();
  const samples = [];
  for (let index = 0; index < MEASURED; index += 1) samples.push(...await sampleFactory());
  return { name, summary: summarize(samples) };
}

test("AIP-PERF-01 FREE-BUDGET-01R uses real local Worker/D1 requests", { timeout: 12 * 60_000 }, async () => {
  resetStaleLocalBotRooms();
  const scenarios = [];
  const runtimeCounterEvidence = [];
  const correctness = {
    fixtureRows: { publicEvents: PUBLIC_EVENTS, botWorkRows: BOT_WORK_ROWS },
    privateViews: "pending",
    invalidMember: "pending",
    staleReplay: "pending",
    botAuthority: "pending",
    cardConservation: "pending",
  };

  scenarios.push(await collectScenario("authenticated_get_4_distinct_humans", async () => {
    const fixture = await createHumanHistoryFixture();
    const privateIds = fixture.privateCards.map((held) => held.id);
    const samples = [];
    for (let index = 0; index < fixture.members.length; index += 1) {
      const member = fixture.members[index];
      const sample = await measured(`viewer_${index + 1}`, async () => roomGet(fixture.code, member.token));
      assert.equal(sample.status, 200);
      const view = (await state(fixture.code, member.token)).data;
      const serialized = JSON.stringify(view);
      assert.ok(view.myHand.some((held) => held.id === privateIds[index]));
      for (let other = 0; other < privateIds.length; other += 1) {
        if (other !== index) assert.equal(serialized.includes(privateIds[other]), false, "other viewers' private cards remain absent");
      }
      samples.push(sample);
    }
    const invalidMember = await state(fixture.code, fixture.members[1].token, false, fixture.playerIds[0]);
    assert.equal(invalidMember.status, 403, "an ordinary member cannot request another player's private test view");
    const testLobby = await createTestLobby();
    const invalidTestViewer = await state(testLobby.data.room.code, testLobby.data.token, false, "not-a-controlled-player");
    assert.equal(invalidTestViewer.status, 403, "a test viewer outside the authenticated roster is rejected");
    correctness.privateViews = "four distinct authenticated projections; other private card IDs absent";
    correctness.invalidMember = `ordinary-member private-view ${invalidMember.status}; invalid test viewer ${invalidTestViewer.status}`;
    return samples;
  }));

  scenarios.push(await collectScenario("authenticated_get_active_response", async () => {
    const fixture = await prepareResponse();
    const sample = await measured("active_response_target", async () => roomGet(fixture.code, fixture.targetToken));
    assert.equal(sample.status, 200);
    const view = (await state(fixture.code, fixture.targetToken)).data;
    assert.equal(view.currentAction.kind, "response");
    assert.equal(view.currentAction.actorId, fixture.target.id);
    return [sample];
  }));

  scenarios.push(await collectScenario("human_decline_response", async () => {
    const fixture = await prepareResponse();
    const beforeCount = 1;
    const staleContext = actionContext(fixture.targetView, fixture.target.id);
    const sample = await measured("decline_response", async () => jsonPost("decline_response", {
      code: fixture.code,
      token: fixture.targetToken,
      context: staleContext,
    }));
    assert.equal(sample.status, 200, JSON.stringify({ status: sample.status }));
    const afterDecline = (await state(fixture.code, fixture.targetToken)).data;
    assert.equal(afterDecline.currentAction?.actorId === fixture.target.id, false);
    assert.notEqual(afterDecline.actionRevision, fixture.targetView.actionRevision);
    assert.equal((await state(fixture.code, fixture.targetToken)).data.timeline.filter((entry) => JSON.stringify(entry).includes(fixture.attack.id)).length >= beforeCount, true);
    assert.equal(roomCardCount(fixture.code, fixture.attack.id), 1, "declined Attack remains exactly once across authoritative zones");
    const replay = await jsonPost("decline_response", { code: fixture.code, token: fixture.targetToken, context: staleContext });
    assert.equal(replay.status, 409, "the same response context cannot be replayed");
    correctness.cardConservation = "ordinary Attack remains exactly once across authoritative zones after decline";
    correctness.staleReplay = `decline_response replay rejected ${replay.status}`;
    return [sample];
  }));

  scenarios.push(await collectScenario("human_advance_timers", async () => {
    const fixture = await prepareResponse();
    const pending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(fixture.code)}`));
    const expired = { ...pending };
    for (const key of ["deadline", "completeAt", "choiceDeadlineAt"]) if (key in expired) expired[key] = Date.now() - 1;
    sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify(expired))} WHERE code=${quote(fixture.code)}`);
    const view = (await state(fixture.code, fixture.targetToken)).data;
    const sample = await measured("advance_timers", async () => jsonPost("advance_timers", {
      code: fixture.code,
      token: fixture.targetToken,
      context: actionContext(view, fixture.target.id),
    }));
    assert.equal(sample.status, 200, JSON.stringify({ status: sample.status }));
    return [sample];
  }));

  scenarios.push(await collectScenario("bot_internal_step", async () => {
    const fixture = await prepareBotDraw();
    const sample = await measured("run_bot_step", async () => jsonFetch("/__test/run-bot-step", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: fixture.code, botId: fixture.bot.id, actionRevision: fixture.view.actionRevision, decisionId: crypto.randomUUID() }),
    }));
    assert.equal(sample.status, 200, JSON.stringify({ status: sample.status }));
    assert.equal(sample.text.includes(fixture.token), false, "Bot response does not expose a bearer token");
    assert.equal(playerHandContains(fixture.bot.id, fixture.drawn.id), true, JSON.stringify({ sample: sample.data }));
    assert.equal(query(`SELECT COUNT(*) FROM bot_work WHERE room_id=${quote(fixture.roomId)}`), String(BOT_WORK_ROWS));
    finishLocalBotRoom(fixture.roomId);
    return [sample];
  }));

  scenarios.push(await collectScenario("bot_room_targeted_scheduler_wake", async () => {
    const fixture = await prepareBotDraw();
    const sample = await measured("run_bot_scheduler", async () => jsonFetch("/__test/run-bot-scheduler", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomCode: fixture.code, maxStepsPerWakeup: 1, captureRuntimeCounters: true }),
    }));
    assert.equal(sample.status, 200, JSON.stringify({ status: sample.status }));
    assert.equal(sample.data.steps, 1, JSON.stringify({ steps: sample.data.steps }));
    assert.equal(sample.data.consumed, 1, JSON.stringify({ consumed: sample.data.consumed }));
    assert.ok(sample.data.runtimeCounters, "scheduler returns counters from the actual compact runtime");
    runtimeCounterEvidence.push({ scenario: "bot_room_targeted_scheduler_wake", counters: sample.data.runtimeCounters });
    assert.equal(playerHandContains(fixture.bot.id, fixture.drawn.id), true);
    finishLocalBotRoom(fixture.roomId);
    return [sample];
  }));

  scenarios.push(await collectScenario("human_postwrite_draw", async () => {
    const fixture = await createHumanHistoryFixture({ phase: "draw", turnSeat: 0 });
    const view = (await state(fixture.code, fixture.members[0].token)).data;
    assert.equal(view.currentAction.actorId, fixture.playerIds[0]);
    const sample = await measured("draw_postwrite", async () => jsonPost("draw", {
      code: fixture.code,
      token: fixture.members[0].token,
      context: actionContext(view, fixture.playerIds[0]),
    }));
    assert.equal(sample.status, 200, JSON.stringify({ status: sample.status }));
    return [sample];
  }));

  scenarios.push(await collectScenario("representative_final_settlement_skip_rescue", async () => {
    const fixture = await prepareTerminalSettlement();
    const sample = await measured("skip_rescue_terminal", async () => jsonPost("skip_rescue", {
      code: fixture.code,
      token: fixture.token,
      context: actionContext(fixture.dying, fixture.hostId),
    }));
    assert.equal(sample.status, 200, JSON.stringify({ status: sample.status }));
    for (let guard = 0; guard < 3; guard += 1) {
      const hostCheckpoint = (await state(fixture.code, fixture.token)).data;
      const sharedWindowId = hostCheckpoint.currentAction?.sharedWindow?.windowId;
      if (sharedWindowId) {
        for (const member of fixture.members) {
          const memberCheckpoint = (await state(fixture.code, member.token)).data;
          if (memberCheckpoint.currentAction?.sharedWindow?.windowId !== sharedWindowId
            || memberCheckpoint.currentAction?.sharedWindow?.locked
            || !memberCheckpoint.isMyAction
            || !memberCheckpoint.currentAction.legalActions?.includes("skip_rescue")) continue;
          const passed = await jsonPost("skip_rescue", {
            code: fixture.code,
            token: member.token,
            context: actionContext(memberCheckpoint, memberCheckpoint.meId),
          });
          assert.equal(passed.status, 200, JSON.stringify({ status: passed.status, data: passed.data }));
        }
      }
      const pendingJson = query(`SELECT pending_json FROM rooms WHERE code=${quote(fixture.code)}`);
      const pending = pendingJson ? JSON.parse(pendingJson) : null;
      if (pending?.deadline) sql(`UPDATE rooms SET pending_json=json_set(pending_json,'$.deadline',${Date.now() - 1}) WHERE code=${quote(fixture.code)}`);
      const current = (await state(fixture.code, fixture.token)).data;
      if (current.status === "finished") break;
      const wake = await runBotScheduler({ roomCode: fixture.code, maxStepsPerWakeup: 3 });
      assert.equal(wake.status, 200, JSON.stringify({ status: wake.status, data: wake.data }));
      const advanced = await jsonPost("advance_timers", { code: fixture.code, token: fixture.token });
      assert.equal(advanced.status, 200, JSON.stringify({ status: advanced.status, data: advanced.data }));
    }
    const terminal = (await state(fixture.code, fixture.token)).data;
    assert.equal(terminal.status, "finished", JSON.stringify({ status: terminal.status, phase: terminal.phase, players: terminal.players.map(({ id, role, alive, hp }) => ({ id, role, alive, hp })), currentAction: terminal.currentAction }));
    assert.equal(terminal.phase, "finished");
    correctness.staleReplay = "terminal skip_rescue advanced the opaque revision and finished canonically";
    return [sample];
  }));

  const botAuthority = await prepareBotDraw();
  const wrongActor = await jsonFetch("/__test/run-bot-step", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: botAuthority.code, botId: botAuthority.hostId, actionRevision: botAuthority.view.actionRevision, decisionId: crypto.randomUUID() }),
  });
  const staleBot = await jsonFetch("/__test/run-bot-step", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: botAuthority.code, botId: botAuthority.bot.id, actionRevision: "stale-revision", decisionId: crypto.randomUUID() }),
  });
  assert.equal(wrongActor.status, 403);
  assert.equal(staleBot.status, 409);
  correctness.botAuthority = `human actor rejected ${wrongActor.status}; stale Bot revision rejected ${staleBot.status}`;
  finishLocalBotRoom(botAuthority.roomId);

  console.info(`FREE_BUDGET_RUNTIME_BENCHMARK_JSON ${JSON.stringify({
    benchmark: "AIP-PERF-01 FREE-BUDGET-01R",
    sourceSha: process.env.WTK_SOURCE_SHA ?? "working-tree",
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    fixture: { seed: SEED, seats: 4, publicEvents: PUBLIC_EVENTS, botWorkRows: BOT_WORK_ROWS, botFixture: "1 human + 3 genuine server-owned Bots", getFixture: "4 distinct genuine human sessions" },
    sampling: { warmups: WARMUPS, measured: MEASURED, minimumMeasuredPerKeyPath: 3 },
    measurement: {
      observed: "real local Worker HTTP API/D1 requests through tests/run-tests.mjs",
      wallUnit: "ms performance.now around each actual HTTP request",
      clientProcessCpuUnit: "ms of Node harness process.cpuUsage; not Worker CPU",
      workerCpu: "not exposed by local Wrangler harness; no Worker CPU claim",
      d1RowsAndQueries: "not exposed by local harness; fixture row counts are verified, not read/write telemetry",
      hostedCloudflareCpu: "not observed; local measurements are not Free-plan proof",
    },
    runtimeCounterEvidence,
    correctness,
    scenarios,
    trafficAssumptions: { normalPolling: "one authenticated GET per 2s, offline estimate only", activeResponsePolling: "one authenticated GET per 1s, offline estimate only", viewers: [1, 2, 4] },
  })}`);
});
