import assert from "node:assert/strict";
import test from "node:test";
import { createBotActionPrincipal, isBotActionPrincipal } from "../worker/bot-principal.ts";
import { isBotActionOutcome } from "../worker/bot-outcome.ts";

const correlation = {
  decisionId: "decision-1",
  actorId: "actor-1",
  actionRevision: "revision-1",
};

test("compact Bot outcome validation requires a durable canonical proof", () => {
  assert.equal(isBotActionOutcome({
    ...correlation,
    kind: "committed",
    commitProof: {
      source: "canonical_executor",
      roomId: "room-1",
      ...correlation,
      commitKind: "transition",
      reference: { kind: "event", id: "event-1" },
    },
  }), true);
  assert.equal(isBotActionOutcome({ ...correlation, kind: "committed", commitProof: { source: "canonical_executor" } }), false);
  assert.equal(isBotActionOutcome({ ...correlation, kind: "waiting_for_human" }), true);
  assert.equal(isBotActionOutcome({ ...correlation, kind: "stale", reason: "duplicate" }), true);
  assert.equal(isBotActionOutcome({ ...correlation, kind: "failed", errorCode: "malformed_result", retryable: true }), true);
});

test("the compact selector cannot be forged from public request-shaped data", () => {
  assert.equal(isBotActionPrincipal({
    roomId: "room-1", botId: "actor-1", actionRevision: "revision-1", decisionId: "decision-1", compactResult: true,
  }), false);
  const principal = createBotActionPrincipal({
    roomId: "room-1", botId: "actor-1", actionRevision: "revision-1", decisionId: "decision-1", compactResult: true,
  });
  assert.equal(isBotActionPrincipal(principal), true);
});
