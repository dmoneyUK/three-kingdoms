import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { attachBotExecutionContext, createBotActionPrincipal, createBotExecutionContext, getBotExecutionContext, isBotActionPrincipal, recordBotCommit } from "../worker/bot-principal.ts";
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
  assert.equal(Object.hasOwn(principal, "compactResult"), false);
});

test("compact projection uses an opaque in-process capability, never a public marker", () => {
  const principal = createBotActionPrincipal({ roomId: "room-1", botId: "actor-1", actionRevision: "revision-1", decisionId: "decision-1" });
  const context = createBotExecutionContext(correlation);
  assert.match(context.projectionToken, /^[0-9a-f-]{36}$/i);
  assert.equal(getBotExecutionContext(principal), null);
  attachBotExecutionContext(principal, context);
  assert.equal(getBotExecutionContext(principal), context);
  assert.equal(fs.readFileSync(new URL("../app/api/rooms/route.ts", import.meta.url), "utf8").includes("BOT_COMPACT_RESPONSE_TOKEN"), false);
});

test("compact outcomes reject placeholders, private extras, and malformed proof references", () => {
  const proof = {
    source: "canonical_executor", roomId: "room-1", ...correlation,
    commitKind: "transition", reference: { kind: "event", id: "event-1" },
  };
  assert.equal(isBotActionOutcome({ ...correlation, kind: "committed", commitProof: { ...proof, reference: { kind: "event", id: "unknown" } } }), false);
  assert.equal(isBotActionOutcome({ ...correlation, kind: "committed", commitProof: proof, privateHand: [{ id: "hidden" }] }), false);
  assert.equal(isBotActionOutcome({ ...correlation, kind: "committed", commitProof: { ...proof, roomId: " " } }), false);
  assert.equal(isBotActionOutcome({ ...correlation, kind: "failed", errorCode: "malformed_result", retryable: true, response: {} }), false);
});

test("terminal Bot proof cannot be downgraded or replaced by another dispatch", () => {
  const context = createBotExecutionContext(correlation);
  const terminal = {
    source: "canonical_executor",
    roomId: "room-1",
    ...correlation,
    commitKind: "terminal",
    reference: { kind: "row", id: "room-1" },
  };
  recordBotCommit(context, terminal);
  recordBotCommit(context, { ...terminal, commitKind: "checkpoint", reference: { kind: "checkpoint", id: "later" } });
  assert.deepEqual(context.commit, terminal);
  recordBotCommit(context, { ...terminal, decisionId: "other-dispatch" });
  assert.deepEqual(context.commit, terminal, "an unrelated correlation cannot claim the terminal proof");
});
