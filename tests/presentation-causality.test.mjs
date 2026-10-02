import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceCausalEnvelopePresentationRevision,
  causalEnvelopePresentationRevision,
  parseCausalEnvelope,
} from "../game/presentation-causality.ts";
import { createCausalEnvelope, createCausalFrame } from "../app/api/causal-envelope.ts";

function envelope() {
  const frame = createCausalFrame({
    stage: "ATTACK_RESPONSE",
    origin: { originSourceId: "source", originEffect: "Attack", originalTargetIds: ["target"] },
    current: { currentSourceId: "source", currentEffect: "Attack", currentTargetIds: ["target"], resolvingPlayerId: "target" },
  });
  return createCausalEnvelope({ frames: [frame], activeFrameId: frame.frameId });
}

test("legacy rooms without a causal envelope remain readable", () => {
  assert.equal(parseCausalEnvelope(null), null);
  assert.equal(parseCausalEnvelope(undefined), null);
  assert.equal(parseCausalEnvelope("{}"), null);
  assert.equal(parseCausalEnvelope("not-json"), null);
});

test("server-owned envelope survives JSON persistence without private viewer state", () => {
  const original = envelope();
  const reloaded = parseCausalEnvelope(JSON.stringify(original));
  assert.deepEqual(reloaded, original);
  assert.equal("options" in original, false);
  assert.equal("legalTargets" in original, false);
  assert.equal("hand" in original, false);
});

test("public presentation revision is viewer-independent and advances only authoritatively", () => {
  const authoritative = envelope();
  const viewerA = { causalEnvelope: authoritative, currentAction: { options: [{ providerId: "card" }] } };
  const viewerB = { causalEnvelope: authoritative, currentAction: { options: undefined } };
  assert.equal(causalEnvelopePresentationRevision(viewerA.causalEnvelope), 0);
  assert.equal(causalEnvelopePresentationRevision(viewerB.causalEnvelope), 0);
  const advanced = advanceCausalEnvelopePresentationRevision(authoritative);
  assert.equal(advanced.presentationRevision, 1);
  assert.equal(authoritative.presentationRevision, 0);
});
