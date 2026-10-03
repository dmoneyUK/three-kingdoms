import assert from "node:assert/strict";
import test from "node:test";
import { buildPresentationClientView } from "../game/presentation-client.ts";

function scene(overrides = {}) {
  return {
    semantics: "PROVEN",
    interactionId: "interaction-1",
    rootFrameId: "root-frame",
    activeFrameId: "active-frame",
    parentFrameId: null,
    checkpointId: "checkpoint-1",
    presentationRevision: 3,
    stage: "ATTACK_RESPONSE",
    sourceId: "A",
    effect: "Attack",
    targetIds: ["B"],
    currentParticipantId: "B",
    decisionActorId: "B",
    activeResolverId: "A",
    activeSourceId: "A",
    activeTargetIds: ["B"],
    participantIds: ["A", "B"],
    participantRoles: {
      sourceId: "A",
      originalTargetIds: ["B"],
      activeTargetIds: ["B"],
      currentParticipantId: "B",
      decisionActorId: "B",
      activeResolverId: "A",
      parentParticipantId: null,
      participantIds: ["A", "B"],
    },
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  return {
    identity: { interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3 },
    stable: { kind: "CHOICE", interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3, decisionActorId: "B" },
    interaction: scene(),
    decision: { actorId: "B", stage: "ATTACK_RESPONSE" },
    localControl: { source: "CurrentAction", actionRevision: "action-1", kind: "response", actorId: "B", entitled: true },
    settlement: null,
    transitionEvents: [],
    ...overrides,
  };
}

test("adapter maps coherent public CHOICE and source-owned roles without legal controls", () => {
  const view = buildPresentationClientView(snapshot(), "B");
  assert.deepEqual(view, {
    hasInteraction: true,
    interactionId: "interaction-1",
    checkpointId: "checkpoint-1",
    presentationRevision: 3,
    stage: "ATTACK_RESPONSE",
    sourceId: "A",
    originalTargetIds: ["B"],
    activeTargetIds: ["B"],
    currentParticipantId: "B",
    decisionActorId: "B",
    activeResolverId: "A",
    participantIds: ["A", "B"],
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
    parentFrameId: null,
    stableKind: "CHOICE",
    isLocalDecisionActor: true,
    hasLocalControl: true,
    localActionRevision: "action-1",
  });
  assert.equal("options" in view, false);
  assert.equal("legalActions" in view, false);
  assert.equal("providers" in view, false);
});

test("adapter keeps the public scene viewer-equal while local entitlement changes", () => {
  const acting = buildPresentationClientView(snapshot(), "B");
  const uninvolved = buildPresentationClientView(snapshot({ localControl: { ...snapshot().localControl, actorId: null, entitled: false } }), "C");
  assert.deepEqual({
    interactionId: uninvolved.interactionId,
    checkpointId: uninvolved.checkpointId,
    stage: uninvolved.stage,
    sourceId: uninvolved.sourceId,
    originalTargetIds: uninvolved.originalTargetIds,
    activeTargetIds: uninvolved.activeTargetIds,
    decisionActorId: uninvolved.decisionActorId,
  }, {
    interactionId: acting.interactionId,
    checkpointId: acting.checkpointId,
    stage: acting.stage,
    sourceId: acting.sourceId,
    originalTargetIds: acting.originalTargetIds,
    activeTargetIds: acting.activeTargetIds,
    decisionActorId: acting.decisionActorId,
  });
  assert.equal(uninvolved.isLocalDecisionActor, false);
  assert.equal(uninvolved.hasLocalControl, false);
});

test("adapter keeps local action revision but does not infer public interaction from identity-free REST", () => {
  const view = buildPresentationClientView(snapshot({
    identity: null,
    interaction: null,
    decision: null,
    stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
    localControl: { source: "CurrentAction", actionRevision: "turn-1", kind: "turn", actorId: "B", entitled: true },
  }), "B");
  assert.equal(view.hasInteraction, false);
  assert.deepEqual({
    interactionId: view.interactionId,
    checkpointId: view.checkpointId,
    presentationRevision: view.presentationRevision,
    stage: view.stage,
    sourceId: view.sourceId,
    originalTargetIds: view.originalTargetIds,
    activeTargetIds: view.activeTargetIds,
    currentParticipantId: view.currentParticipantId,
    decisionActorId: view.decisionActorId,
    activeResolverId: view.activeResolverId,
    participantIds: view.participantIds,
    stableKind: view.stableKind,
  }, {
    interactionId: null,
    checkpointId: null,
    presentationRevision: null,
    stage: null,
    sourceId: null,
    originalTargetIds: [],
    activeTargetIds: [],
    currentParticipantId: null,
    decisionActorId: null,
    activeResolverId: null,
    participantIds: [],
    stableKind: "REST",
  });
  assert.equal(view.hasLocalControl, true);
  assert.equal(view.localActionRevision, "turn-1");
});

test("adapter exposes child-frame continuity without reconstructing a parent", () => {
  const view = buildPresentationClientView(snapshot({
    interaction: scene({ parentFrameId: "parent-frame", continuity: { relation: "CHILD_FRAME", parentFrameId: "parent-frame" } }),
  }), "C");
  assert.deepEqual(view.continuity, { relation: "CHILD_FRAME", parentFrameId: "parent-frame" });
  assert.equal(view.parentFrameId, "parent-frame");
});

test("adapter is deterministic, non-mutating, and independent of legacy compatibility data", () => {
  const input = snapshot({ pending: { kind: "response", actorId: "legacy" }, timeline: [{ id: "legacy-event" }], presentationV2: { stableBoundary: { kind: "SETTLEMENT" } } });
  const before = structuredClone(input);
  const first = buildPresentationClientView(input, "B");
  const second = buildPresentationClientView(input, "B");
  const legacyChanged = buildPresentationClientView({ ...input, pending: { kind: "dying", targetId: "other" }, timeline: [{ id: "different-event" }], presentationV2: { stableBoundary: { kind: "REST" } } }, "B");
  assert.deepEqual(second, first);
  assert.deepEqual(legacyChanged, first);
  assert.deepEqual(input, before);
});

test("adapter fails closed for partial authority instead of reconstructing it from fallbacks", () => {
  const partial = snapshot({
    interaction: { semantics: "PROVEN", interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3 },
    pending: { kind: "response", actorId: "B" },
    timeline: [{ id: "event-with-a-plausible-id" }],
    presentationV2: { interactionScene: scene() },
  });
  const view = buildPresentationClientView(partial, "B");
  assert.equal(view.hasInteraction, false);
  assert.equal(view.stableKind, "REST");
  assert.equal(view.interactionId, null);
  assert.deepEqual(view.originalTargetIds, []);
  assert.equal(view.isLocalDecisionActor, true, "private entitlement remains local without recreating public authority");
});
