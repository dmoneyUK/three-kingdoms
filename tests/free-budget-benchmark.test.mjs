import test from "node:test";
import { strict as assert } from "node:assert";
import { performance } from "node:perf_hooks";
import { shouldLookupAuthenticatedSession } from "../app/api/internal-bot-session.ts";

const SEED = 0x5eedf00d;
const WARMUPS = 5;
const MEASURED = 20;
const PUBLIC_EVENTS = 203;
const BOT_WORK_ROWS = 150;
const PLAYERS = 4;

const SCENARIOS = [
  { name: "get_unchanged_1v", family: "authenticated_get", viewerCount: 1 },
  { name: "get_unchanged_2v", family: "authenticated_get", viewerCount: 2 },
  { name: "get_unchanged_4v", family: "authenticated_get", viewerCount: 4 },
  { name: "get_active_response", family: "authenticated_get_response", viewerCount: 1 },
  { name: "human_decline_response", family: "human_post", viewerCount: 1, action: "decline_response" },
  { name: "human_advance_timers", family: "human_post", viewerCount: 1, action: "advance_timers" },
  { name: "final_settlement_post", family: "human_post", viewerCount: 1, action: "final_settlement" },
  { name: "bot_internal_step", family: "bot_http", viewerCount: 1, action: "bot_step", internalBot: true },
  { name: "postwrite", family: "postwrite", viewerCount: 1, action: "postwrite", internalBot: true },
  { name: "cron", family: "cron", viewerCount: 1, action: "cron" },
];

function makeFixture(seed = SEED) {
  let value = seed >>> 0;
  const next = () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value;
  };
  const players = Array.from({ length: PLAYERS }, (_, seat) => ({
    id: `player-${seat}`,
    seat,
    role: seat === 0 ? "Lord" : seat === 1 ? "Rebel" : "Spy",
    controllerType: seat === 0 ? "human" : "bot",
    isTestPlayer: false,
    handCount: 2 + (next() % 4),
    alive: true,
  }));
  const publicEvents = Array.from({ length: PUBLIC_EVENTS }, (_, index) => ({
    id: `event-${index}`,
    message: `Fixture action ${index}`,
    publicSequence: index + 1,
    publicSequenceWatermark: index + 1,
  }));
  const botWork = Array.from({ length: BOT_WORK_ROWS }, (_, index) => ({
    decisionId: `work-${index}`,
    botId: `player-${1 + (index % 3)}`,
    status: index < 3 ? "unsupported" : index % 5 === 0 ? "waiting" : "consumed",
    actionRevision: `revision-${index}`,
  }));
  return {
    seed,
    roomId: "room-free-budget-01",
    actionRevision: "revision-203-150",
    phase: "response",
    responseWindow: { id: "response-17", deadline: 1_735_000_000_000 },
    privateCardId: "private-bot-card-never-public",
    players,
    publicEvents,
    botWork,
  };
}

function emptyCounters() {
  return {
    d1Queries: 0,
    d1RowsRead: 0,
    d1RowsWritten: 0,
    tokenHashes: 0,
    authenticatedSessionLookups: 0,
    roomStateProjections: 0,
    viewerProjections: 0,
    logRecordsDecoded: 0,
    botWorkRowsScanned: 0,
    jsonEncodes: 0,
    jsonDecodes: 0,
    schedulerDispatches: 0,
    bytes: 0,
  };
}

function publicProjection(fixture, viewer, counters) {
  counters.roomStateProjections += 1;
  counters.viewerProjections += 1;
  counters.logRecordsDecoded += fixture.publicEvents.length;
  counters.botWorkRowsScanned += fixture.botWork.length;
  const timeline = fixture.publicEvents.map(({ id, message, publicSequence }) => ({ id, message, publicSequence }));
  const latestBotStatus = new Map();
  for (const work of fixture.botWork) latestBotStatus.set(work.botId, work.status);
  return {
    roomId: fixture.roomId,
    actionRevision: fixture.actionRevision,
    phase: fixture.phase,
    responseWindow: fixture.responseWindow,
    viewer,
    timeline,
    players: fixture.players.map(({ id, seat, handCount, alive }) => ({ id, seat, handCount, alive })),
    botStatus: [...latestBotStatus.entries()].sort(([a], [b]) => a.localeCompare(b)),
    currentAction: { kind: "response", actorId: "player-0", legalActions: ["decline_response"] },
  };
}

function runInvocation(fixture, scenario, { optimized }) {
  const counters = emptyCounters();
  const startedAt = performance.now();
  const cpuBefore = process.cpuUsage();
  const internalBot = Boolean(scenario.internalBot);
  const mustLookupSession = optimized
    ? shouldLookupAuthenticatedSession(internalBot)
    : true;

  // These are route-shaped counters for a deterministic local model. They are
  // intentionally not presented as Cloudflare CPU or D1 telemetry.
  counters.d1Queries += 3;
  counters.d1RowsRead += 1 + PLAYERS + BOT_WORK_ROWS;
  if (mustLookupSession) {
    counters.tokenHashes += 1;
    counters.authenticatedSessionLookups += 1;
    counters.d1Queries += 1;
    counters.d1RowsRead += internalBot ? 0 : 1;
  }
  if (["human_post", "bot_http", "postwrite"].includes(scenario.family)) {
    counters.d1RowsWritten += scenario.family === "postwrite" ? 2 : 1;
  }
  if (scenario.family === "cron") {
    counters.schedulerDispatches += 1;
    counters.d1Queries += 1;
  }

  const viewers = Array.from({ length: scenario.viewerCount }, (_, index) => `viewer-${index}`);
  const room = viewers.map((viewer) => publicProjection(fixture, viewer, counters));
  const payload = {
    room: room.length === 1 ? room[0] : room,
    ...(scenario.action ? { action: scenario.action } : {}),
  };
  const encoded = JSON.stringify(payload);
  counters.jsonEncodes += 1;
  counters.bytes = Buffer.byteLength(encoded);
  if (scenario.family === "bot_http" || scenario.family === "postwrite") {
    JSON.parse(encoded);
    counters.jsonDecodes += 1;
  }
  const cpu = process.cpuUsage(cpuBefore);
  return {
    fingerprint: encoded,
    counters,
    wallMs: performance.now() - startedAt,
    cpuUs: cpu.user + cpu.system,
  };
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function summarize(samples) {
  const cpu = samples.map((sample) => sample.cpuUs / 1000);
  const wall = samples.map((sample) => sample.wallMs);
  const counters = samples[0].counters;
  return {
    samples: samples.length,
    localCpuMs: { p50: percentile(cpu, 50), p95: percentile(cpu, 95), p99: percentile(cpu, 99), max: Math.max(...cpu) },
    wallMs: { p50: percentile(wall, 50), p95: percentile(wall, 95), p99: percentile(wall, 99), max: Math.max(...wall) },
    workPerInvocation: counters,
  };
}

function runScenario(fixture, scenario, optimized) {
  for (let warmup = 0; warmup < WARMUPS; warmup++) runInvocation(fixture, scenario, { optimized });
  const samples = Array.from({ length: MEASURED }, () => runInvocation(fixture, scenario, { optimized }));
  return { summary: summarize(samples), fingerprint: samples[0].fingerprint };
}

function correctnessMatrix(fixture) {
  const cases = [
    { name: "valid-principal", roomId: fixture.roomId, botId: "player-1", role: "Rebel", revision: fixture.actionRevision, expected: true },
    { name: "wrong-room", roomId: "other-room", botId: "player-1", role: "Rebel", revision: fixture.actionRevision, expected: false },
    { name: "wrong-actor", roomId: fixture.roomId, botId: "player-0", role: "Lord", revision: fixture.actionRevision, expected: false },
    { name: "wrong-role-snapshot", roomId: fixture.roomId, botId: "player-1", role: "Lord", revision: fixture.actionRevision, expected: false },
    { name: "test-seat", roomId: fixture.roomId, botId: "player-1", role: "Rebel", revision: fixture.actionRevision, isTestPlayer: true, expected: false },
    { name: "stale-revision", roomId: fixture.roomId, botId: "player-1", role: "Rebel", revision: "stale", expected: false },
    { name: "replay-after-consume", roomId: fixture.roomId, botId: "player-1", role: "Rebel", revision: fixture.actionRevision, consumed: true, expected: false },
  ];
  const outcome = (entry) => {
    const actor = fixture.players.find((player) => player.id === entry.botId);
    return Boolean(entry.roomId === fixture.roomId && actor?.controllerType === "bot" && actor.role === entry.role
      && !actor.isTestPlayer && !entry.isTestPlayer && entry.revision === fixture.actionRevision && !entry.consumed);
  };
  return cases.map((entry) => ({
    ...entry,
    baseline: outcome(entry),
    optimized: outcome(entry),
  }));
}

test("AIP-PERF-01 FREE-BUDGET-01 deterministic benchmark and internal Bot lookup equivalence", () => {
  const fixture = makeFixture();
  assert.equal(fixture.players.length, PLAYERS);
  assert.equal(fixture.publicEvents.length, PUBLIC_EVENTS);
  assert.equal(fixture.botWork.length, BOT_WORK_ROWS);
  assert.equal(shouldLookupAuthenticatedSession(false), true, "human callers retain token/session authentication");
  assert.equal(shouldLookupAuthenticatedSession(true), false, "server-minted Bot principals skip duplicate session lookup");

  const results = {};
  for (const scenario of SCENARIOS) {
    const baseline = runScenario(fixture, scenario, false);
    const optimized = runScenario(fixture, scenario, true);
    assert.equal(optimized.fingerprint, baseline.fingerprint, `${scenario.name} public/private projection changed`);
    assert.equal(optimized.summary.workPerInvocation.roomStateProjections, baseline.summary.workPerInvocation.roomStateProjections);
    assert.equal(optimized.summary.workPerInvocation.logRecordsDecoded, baseline.summary.workPerInvocation.logRecordsDecoded);
    assert.equal(optimized.summary.workPerInvocation.bytes, baseline.summary.workPerInvocation.bytes);
    assert.ok(!optimized.fingerprint.includes(fixture.privateCardId), `${scenario.name} leaked a private card identifier`);
    results[scenario.name] = {
      family: scenario.family,
      viewerCount: scenario.viewerCount,
      baseline: baseline.summary,
      optimized: optimized.summary,
      delta: {
        authenticatedSessionLookups: optimized.summary.workPerInvocation.authenticatedSessionLookups
          - baseline.summary.workPerInvocation.authenticatedSessionLookups,
        tokenHashes: optimized.summary.workPerInvocation.tokenHashes
          - baseline.summary.workPerInvocation.tokenHashes,
        d1Queries: optimized.summary.workPerInvocation.d1Queries - baseline.summary.workPerInvocation.d1Queries,
      },
      correctness: "deep-equal projection; private card absent",
    };
  }

  const botDelta = results.bot_internal_step.delta;
  assert.deepEqual(botDelta, { authenticatedSessionLookups: -1, tokenHashes: -1, d1Queries: -1 });
  for (const entry of correctnessMatrix(fixture)) {
    assert.equal(entry.baseline, entry.expected, `${entry.name} baseline outcome changed`);
    assert.equal(entry.optimized, entry.expected, `${entry.name} optimized outcome changed`);
  }

  const output = {
    benchmark: "AIP-PERF-01 FREE-BUDGET-01",
    sourceSha: process.env.WTK_SOURCE_SHA ?? "working-tree",
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    fixture: { seed: SEED, seats: PLAYERS, publicEvents: PUBLIC_EVENTS, botWorkRows: BOT_WORK_ROWS },
    sampling: { warmups: WARMUPS, measured: MEASURED },
    measurement: {
      observed: "local process CPU and wall time for a route-shaped synthetic model",
      cpuUnit: "ms of process.cpuUsage user+system",
      wallUnit: "ms performance.now",
      d1Wait: "not observed; D1 counters are deterministic fixture work counts",
      hostedCloudflareCpu: "not observed; local percentiles are not an SLO or Free-plan proof",
    },
    correctness: correctnessMatrix(fixture),
    scenarios: results,
    trafficAssumptions: {
      normalPolling: "one authenticated GET per 2s; offline estimate only",
      activeResponsePolling: "one authenticated GET per 1s; offline estimate only",
      viewers: [1, 2, 4],
    },
  };
  console.info(`FREE_BUDGET_BENCHMARK_JSON ${JSON.stringify(output)}`);
});
