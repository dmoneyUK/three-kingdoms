import assert from "node:assert/strict";
import test from "node:test";
import { runBoundedPostWriteBotScheduler } from "../worker/postwrite-bot-scheduler.ts";

function outcome(steps, consumed = steps) {
  return {
    roomsConsidered: steps ? 1 : 0,
    roomsLocked: steps ? 1 : 0,
    steps,
    consumed,
    unsupported: 0,
    stale: 0,
    failed: 0,
    retries: 0,
  };
}

test("post-write wake injects exactly one Bot step instead of three four-step passes", async () => {
  const calls = [];
  const dispatched = [];
  const scheduler = async (_db, options) => {
    calls.push(options);
    for (let index = 0; index < options.maxStepsPerWakeup; index++) dispatched.push(`decision-${dispatched.length + 1}`);
    return outcome(options.maxStepsPerWakeup);
  };

  const result = await runBoundedPostWriteBotScheduler({}, "AIP01", { wakeSource: "postwrite" }, scheduler);

  assert.deepEqual(calls, [{ roomCode: "AIP01", maxStepsPerWakeup: 1 }]);
  assert.deepEqual(dispatched, ["decision-1"]);
  assert.equal(result.steps, 1);
  assert.equal(result.consumed, 1);
});

test("independent room-scoped wakes resume durable work without combining passes", async () => {
  const calls = [];
  const committed = [];
  let nextDecision = 1;
  const scheduler = async (_db, options) => {
    calls.push(options);
    const decision = nextDecision <= 3 ? `decision-${nextDecision++}` : null;
    if (decision) committed.push(decision);
    return outcome(decision ? 1 : 0);
  };

  for (let wake = 0; wake < 4; wake++) {
    await runBoundedPostWriteBotScheduler({}, "AIP01", { wakeSource: "postwrite" }, scheduler);
  }

  assert.equal(calls.length, 4);
  assert.ok(calls.every(({ roomCode, maxStepsPerWakeup }) => roomCode === "AIP01" && maxStepsPerWakeup === 1));
  assert.deepEqual(committed, ["decision-1", "decision-2", "decision-3"],
    "each later room-scoped wake can resume the next durable decision");
});
