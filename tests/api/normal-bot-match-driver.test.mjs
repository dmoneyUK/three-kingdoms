import assert from "node:assert/strict";
import test from "node:test";
import { NORMAL_BOT_MATCH_STATUSES, runNormalBotMatch } from "./normal-bot-match-driver.mjs";

test("Track G normal Bot match driver uses bounded legal human actions", { timeout: 70_000 }, async () => {
  const summary = await runNormalBotMatch();
  console.log(JSON.stringify(summary));
  assert.ok(NORMAL_BOT_MATCH_STATUSES.includes(summary.status));
  assert.notEqual(summary.status, "TRANSPORT_FAILURE", JSON.stringify(summary));
  assert.notEqual(summary.status, "BOT_UNSUPPORTED", JSON.stringify(summary));
  assert.notEqual(summary.status, "BOT_FAILED", JSON.stringify(summary));
  assert.equal(summary.invariants.genuineBots, true, JSON.stringify(summary));
  assert.equal(summary.invariants.privateIsolation, true, JSON.stringify(summary));
  assert.equal(summary.invariants.independentReread, true, JSON.stringify(summary));
  assert.equal(summary.invariants.publicPhysicalTransitionIntegrity, true, JSON.stringify(summary));
  assert.ok(summary.turns > 0 || summary.scheduler.steps > 0, JSON.stringify(summary));
});
