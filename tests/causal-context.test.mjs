import test from "node:test";
import assert from "node:assert/strict";
import { childCausalFrame, createCausalRoot, resumeCausalFrame } from "../game/causal-context.ts";

const rootInput = {
  stage: "ATTACK_RESPONSE",
  origin: { originSourceId: "A", originEffect: "card", originalTargetIds: ["B"] },
  current: { currentSourceId: "A", currentEffect: "card", currentTargetIds: ["B"], resolvingPlayerId: "B" },
};

test("C2 root identity survives a nested child and typed parent resume", () => {
  const root = createCausalRoot(rootInput);
  const child = childCausalFrame(root.envelope, {
    stage: "DAMAGE",
    origin: { originSourceId: "A", originEffect: "damage", originalTargetIds: ["B"] },
    current: { currentSourceId: "A", currentEffect: "damage", currentTargetIds: ["B"], resolvingPlayerId: "B" },
    causeNodeId: "attack-event-1",
  });

  assert.equal(child.context.interactionId, root.context.interactionId);
  assert.notEqual(child.context.frameId, root.context.frameId);
  assert.equal(child.context.parentFrameId, root.context.frameId);
  assert.equal(child.context.causeNodeId, "attack-event-1");
  assert.equal(child.envelope.activeFrameId, child.context.frameId);

  const resumed = resumeCausalFrame(child.envelope, child.context);
  assert.equal(resumed.context.frameId, root.context.frameId);
  assert.equal(resumed.envelope.interactionId, root.envelope.interactionId);
  assert.equal(resumed.envelope.activeFrameId, root.context.frameId);
  assert.equal(resumed.envelope.frames.find((frame) => frame.frameId === child.context.frameId).parentFrameId, root.context.frameId);
});

test("C2 keeps immutable origin while current targets redirect", () => {
  const root = createCausalRoot(rootInput);
  const child = childCausalFrame(root.envelope, {
    stage: "DAMAGE",
    origin: { originSourceId: "A", originEffect: "redirected-damage", originalTargetIds: ["B"] },
    current: { currentSourceId: "A", currentEffect: "redirected-damage", currentTargetIds: ["D"], resolvingPlayerId: "D" },
  });
  const frame = child.envelope.frames.find((candidate) => candidate.frameId === child.context.frameId);
  assert.deepEqual(frame.origin.originalTargetIds, ["B"]);
  assert.deepEqual(frame.current.currentTargetIds, ["D"]);
});
