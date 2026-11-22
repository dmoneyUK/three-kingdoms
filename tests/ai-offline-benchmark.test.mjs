import assert from "node:assert/strict";
import test from "node:test";
import { offlineDecisionFixtures } from "../ai/decision-fixtures.ts";
import { evaluateOfflineBenchmark, offlineBenchmarkCases, offlineFixtureTransport } from "../ai/offline-benchmark.ts";

test("offline benchmark combines the eleven accepted fixtures with distinct control cases", async () => {
  const cases = offlineBenchmarkCases();
  const fixtureIds = offlineDecisionFixtures.map(({ id }) => id);
  assert.equal(fixtureIds.length, 11);
  assert.deepEqual(cases.slice(0, fixtureIds.length).map(({ id }) => id), fixtureIds);
  assert.equal(new Set(cases.map(({ id }) => id)).size, cases.length);
  const report = await evaluateOfflineBenchmark(cases, async (request, id) => {
    assert.equal(JSON.stringify(request).includes("synthetic-private-"), false, `private fixture identity reached transport in ${id}`);
    return offlineFixtureTransport(request, id);
  });
  assert.deepEqual(report.summary, {
    cases: 20, passed: 20, validSelections: 12, abstentions: 1, rejections: 7, modelTokens: 0, apiSpend: 0,
  });
  const byId = new Map(report.results.map((result) => [result.id, result]));
  assert.equal(byId.get("reject-private-field").transportCalls, 0);
  assert.equal(byId.get("wrong-decision").outcome.code, "stale_decision");
  assert.equal(byId.get("wrong-version").outcome.code, "stale_observation");
  assert.equal(byId.get("unsolicited-action-fields").outcome.code, "invalid_response");
  assert.equal(byId.get("refusal").outcome.code, "refusal");
  assert.equal(byId.get("timeout").outcome.code, "timeout");
  assert.equal(byId.get("abstain").outcome.status, "abstained");
  assert.equal(byId.get("two-dodge-options").preference, "UNDERDETERMINED");
  assert.equal(byId.get("low-hp-peach-rescue").preference, "MATCH");
  assert.ok(report.results.every(({ elapsedMs }) => Number.isFinite(elapsedMs) && elapsedMs >= 0));
  console.info(JSON.stringify({ offlineBenchmark: report.summary }));
});

test("an invented option is rejected and reduces the benchmark pass count", async () => {
  const cases = offlineBenchmarkCases();
  const result = await evaluateOfflineBenchmark(cases, async (request, id) => id === "one-dodge-option"
    ? { status: "completed", output: { observationVersion: 1, decisionId: request.decisionId,
      selectedCandidateId: "invented-by-bad-mock", reason: "Intentional control." } }
    : offlineFixtureTransport(request, id));
  assert.equal(result.summary.passed, cases.length - 1);
  assert.equal(result.summary.validSelections, 11);
  assert.deepEqual(result.results.find(({ id }) => id === "one-dodge-option").outcome,
    { status: "rejected", code: "unknown_candidate" });
});

test("a supplied rescue skip is legal even when it misses the synthetic preference", async () => {
  const cases = offlineBenchmarkCases().filter(({ id }) => id === "low-hp-peach-rescue");
  const { results, summary } = await evaluateOfflineBenchmark(cases, async (request) => ({
    status: "completed",
    output: { observationVersion: 1, decisionId: request.decisionId, selectedCandidateId: "candidate-3", reason: "Synthetic skip." },
  }));
  assert.equal(summary.passed, 1);
  assert.equal(summary.validSelections, 1);
  assert.equal(results[0].preference, "MISS");
});
