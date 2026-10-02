import test from "node:test";
import assert from "node:assert/strict";
import {
  causalEnvelopePresentationRevision,
  parseCausalEnvelope,
} from "../game/presentation-causality.ts";
import { advanceCausalCheckpoint, advanceCausalPresentationRevision, advanceCausalSemanticCheckpoint, createCausalEnvelope, createCausalFrame, createChildCausalFrame, resumeCausalParentFrame, switchActiveCausalFrame, updateCausalFrameCurrent, updateCausalFrameStage } from "../app/api/causal-envelope.ts";

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

test("parser rejects structurally impossible envelopes", () => {
  const original = envelope();
  const duplicate = { ...original, frames: [original.frames[0], original.frames[0]] };
  const missingParent = { ...original, frames: [{ ...original.frames[0], parentFrameId: "missing" }] };
  const mismatchedCheckpoint = { ...original, checkpoint: { ...original.checkpoint, stage: "DAMAGE" } };
  assert.equal(parseCausalEnvelope(JSON.stringify(duplicate)), null);
  assert.equal(parseCausalEnvelope(JSON.stringify(missingParent)), null);
  assert.equal(parseCausalEnvelope(JSON.stringify(mismatchedCheckpoint)), null);
});

test("parser characterization allows a cross-frame checkpoint and projector must defend the boundary", () => {
  const original = envelope();
  const second = createCausalFrame({
    stage: "DAMAGE",
    origin: { originSourceId: "source", originEffect: "damage", originalTargetIds: ["target"] },
    current: { currentSourceId: "source", currentEffect: "damage", currentTargetIds: ["target"], resolvingPlayerId: "target" },
  });
  const incoherent = { ...original, frames: [original.frames[0], second], checkpoint: { ...original.checkpoint, frameId: second.frameId, stage: second.stage } };
  assert.ok(parseCausalEnvelope(JSON.stringify(incoherent)));
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
  const advanced = advanceCausalPresentationRevision(authoritative);
  assert.equal(advanced.presentationRevision, 1);
  assert.equal(authoritative.presentationRevision, 0);
});

test("authoritative checkpoint and Frame primitives preserve causal identity and origin", () => {
  const original = envelope();
  const rootFrame = original.frames[0];
  const child = createChildCausalFrame(original, {
    stage: "DAMAGE",
    causeNodeId: "damage-occurrence",
    origin: { originSourceId: "source", originEffect: "nested damage", originalTargetIds: ["B"] },
    current: { currentSourceId: "source", currentEffect: "nested damage", currentTargetIds: ["B"], resolvingPlayerId: "B" },
  });
  const childFrame = child.frames.find((frame) => frame.frameId === child.activeFrameId);
  assert.ok(childFrame);
  assert.equal(child.interactionId, original.interactionId);
  assert.notEqual(child.activeFrameId, original.activeFrameId);
  assert.equal(childFrame.parentFrameId, rootFrame.frameId);
  assert.equal(child.frames.length, 2);

  const redirected = updateCausalFrameCurrent(child, child.activeFrameId, { currentTargetIds: ["D"] });
  const redirectedFrame = redirected.frames.find((frame) => frame.frameId === redirected.activeFrameId);
  assert.deepEqual(redirectedFrame.origin.originalTargetIds, ["B"]);
  assert.deepEqual(redirectedFrame.current.currentTargetIds, ["D"]);
  assert.equal(redirected.interactionId, child.interactionId);
  assert.equal(redirected.activeFrameId, child.activeFrameId);

  const staged = updateCausalFrameStage(redirected, redirected.activeFrameId, "DYING");
  assert.equal(staged.frames.find((frame) => frame.frameId === staged.activeFrameId).stage, "DYING");
  const resumed = resumeCausalParentFrame(staged);
  assert.equal(resumed.activeFrameId, rootFrame.frameId);
  const switched = switchActiveCausalFrame(staged, rootFrame.frameId);
  assert.equal(switched.activeFrameId, rootFrame.frameId);
  assert.equal(switched.interactionId, original.interactionId);
});

test("checkpoint advancement is explicit and independent from Frame/Interaction identity", () => {
  const original = envelope();
  const advanced = advanceCausalCheckpoint(original, original.activeFrameId, "ATTACK_RESPONSE");
  assert.notEqual(advanced.checkpoint.checkpointId, original.checkpoint.checkpointId);
  assert.equal(advanced.interactionId, original.interactionId);
  assert.equal(advanced.activeFrameId, original.activeFrameId);
  assert.equal(advanced.presentationRevision, original.presentationRevision + 1);
  const publicUpdate = advanceCausalPresentationRevision(advanced);
  assert.equal(publicUpdate.checkpoint.checkpointId, advanced.checkpoint.checkpointId);
  assert.equal(publicUpdate.presentationRevision, advanced.presentationRevision + 1);
  assert.equal(original.checkpoint.checkpointId !== advanced.checkpoint.checkpointId, true);
});

test("semantic checkpoint changes stage and current atomically once", () => {
  const frame = createCausalFrame({ stage: "GROUP_RESOLUTION", origin: { originSourceId: "A", originEffect: "RainingArrows", originalTargetIds: ["B"] }, current: { currentSourceId: "A", currentEffect: "RainingArrows", currentTargetIds: ["B"], resolvingPlayerId: "B" } });
  const original = createCausalEnvelope({ frames: [frame], activeFrameId: frame.frameId, presentationRevision: 4 });
  const advanced = advanceCausalSemanticCheckpoint(original, frame.frameId, { stage: "NEGATION", current: { currentTargetIds: ["B"], resolvingPlayerId: "C" } });
  assert.equal(advanced.interactionId, original.interactionId);
  assert.equal(advanced.activeFrameId, frame.frameId);
  assert.equal(advanced.frames.length, 1);
  assert.equal(advanced.frames[0].stage, "NEGATION");
  assert.equal(advanced.frames[0].origin.originEffect, "RainingArrows");
  assert.equal(advanced.frames[0].current.resolvingPlayerId, "C");
  assert.equal(advanced.checkpoint.frameId, frame.frameId);
  assert.equal(advanced.checkpoint.stage, "NEGATION");
  assert.equal(advanced.presentationRevision, original.presentationRevision + 1);
});
