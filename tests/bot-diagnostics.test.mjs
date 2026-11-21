import assert from "node:assert/strict";
import test from "node:test";
import { emitBotDiagnostic, runBotSchedulerWake } from "../worker/bot-diagnostics.ts";

const decisionId = "d713f8a3-55c2-4b45-8f89-8095bd1557c2";

test("bot diagnostics use a fixed privacy-safe schema and ignore extra secret fields", () => {
  const lines = [];
  emitBotDiagnostic({ enabled: true, wakeSource: "cron", sink: (line) => lines.push(line) }, {
    event: "bot_work_transition",
    roomCode: "pu99v",
    decisionId,
    previousStatus: "claimed",
    nextStatus: "unsupported",
    errorCode: "unsupported_bot_decision",
    attempts: 99,
    elapsedMs: 999_999,
    token: "token-secret",
    myHand: ["hidden-card"],
    role: "hidden-role",
    pending_json: "private-pending",
    exception: "raw exception secret",
  });

  assert.equal(lines.length, 1);
  const line = JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(line).sort(), [
    "attempts", "component", "decisionId", "elapsedMs", "errorCode", "event", "level", "nextStatus", "previousStatus", "roomCode", "version", "wakeSource",
  ].sort());
  assert.equal(line.roomCode, "PU99V");
  assert.equal(line.decisionId, decisionId);
  assert.equal(line.attempts, 3);
  assert.equal(line.elapsedMs, 120_000);
  assert.equal(line.level, "warn");
  for (const secret of ["token-secret", "hidden-card", "hidden-role", "private-pending", "raw exception secret"]) {
    assert.equal(lines[0].includes(secret), false);
  }
});

test("scheduler rejection is logged once with a fixed error code and no exception text", async () => {
  const captured = [];
  const outcome = await runBotSchedulerWake({
    enabled: true,
    wakeSource: "postwrite",
    sink: (line, level) => captured.push({ event: JSON.parse(line), level }),
  }, async () => {
    throw new Error("raw response body token=secret myHand=hidden pending_json=private");
  });

  assert.equal(outcome, null);
  assert.equal(captured.length, 1);
  assert.equal(captured[0].level, "error");
  assert.deepEqual(captured[0].event, {
    component: "bot_scheduler",
    version: 1,
    event: "bot_scheduler_error",
    wakeSource: "postwrite",
    level: "error",
    errorCode: "scheduler_rejected",
  });
  assert.equal(JSON.stringify(captured).includes("raw response body"), false);
  assert.equal(JSON.stringify(captured).includes("secret"), false);
});

test("disabled diagnostics and failing log sinks cannot change scheduler outcomes", async () => {
  const lines = [];
  emitBotDiagnostic({ enabled: false, wakeSource: "cron", sink: (line) => lines.push(line) }, {
    event: "bot_scheduler_error",
    errorCode: "scheduler_rejected",
  });
  assert.equal(lines.length, 0);

  const outcome = await runBotSchedulerWake({ enabled: true, wakeSource: "cron", sink: () => { throw new Error("logger failure"); } }, async () => ({
    roomsConsidered: 1,
    roomsLocked: 1,
    steps: 1,
    consumed: 1,
    unsupported: 1,
    stale: 0,
    failed: 0,
    retries: 0,
  }));
  assert.equal(outcome?.consumed, 1);
});

test("successful-action diagnostics obey a per-wake cap", () => {
  const lines = [];
  const context = { enabled: true, wakeSource: "postwrite", maxSuccessfulTransitions: 2, sink: (line) => lines.push(line) };
  for (let index = 0; index < 3; index++) {
    emitBotDiagnostic(context, {
      event: "bot_work_transition",
      roomCode: "CAP01",
      decisionId: `d713f8a3-55c2-4b45-8f89-8095bd1557c${index}`,
      previousStatus: "claimed",
      nextStatus: "consumed",
      attempts: 1,
    });
  }
  assert.equal(lines.length, 2);
});
