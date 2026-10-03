import test from "node:test";
import assert from "node:assert/strict";
import { composePresentationSnapshot } from "../game/presentation-snapshot.ts";

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
    activeResolverId: "B",
    activeSourceId: "A",
    activeTargetIds: ["B"],
    participantIds: [],
    participantRoles: {
      sourceId: "A",
      originalTargetIds: ["B"],
      activeTargetIds: ["B"],
      currentParticipantId: "B",
      decisionActorId: "B",
      activeResolverId: "B",
      parentParticipantId: null,
      participantIds: [],
    },
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
    ...overrides,
  };
}

function presentation(interactionScene, stableBoundary = coherentBoundary()) {
  return {
    interactionScene,
    stableBoundary,
    settlement: { eventId: "legacy-final", resolutionId: "legacy-resolution" },
    transitionEvents: [{ eventId: "legacy-transition", type: "card", resolutionId: "legacy-resolution" }],
  };
}

function coherentBoundary(overrides = {}) {
  return {
    kind: "CHOICE",
    interactionId: "interaction-1",
    checkpointId: "checkpoint-1",
    presentationRevision: 3,
    decisionActorId: "B",
    ...overrides,
  };
}

test("snapshot composes proven identity and public scene while keeping CurrentAction local", () => {
  const publicPresentation = presentation(scene());
  const acting = composePresentationSnapshot({ presentationV2: publicPresentation, currentAction: { kind: "response", actorId: "B" }, actionRevision: "action-a", viewerId: "B" });
  const waiting = composePresentationSnapshot({ presentationV2: publicPresentation, currentAction: { kind: "none", actorId: null }, actionRevision: "action-b", viewerId: "C" });

  assert.deepEqual(acting.identity, { interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3 });
  assert.deepEqual(acting.interaction, publicPresentation.interactionScene);
  assert.deepEqual(acting.stable, publicPresentation.stableBoundary);
  assert.deepEqual(acting.decision, { actorId: "B", stage: "ATTACK_RESPONSE" });
  assert.deepEqual(acting.interaction, waiting.interaction, "public interaction is viewer-stable");
  assert.deepEqual(acting.identity, waiting.identity, "public identity is viewer-stable");
  assert.deepEqual(acting.stable, waiting.stable, "public boundary is viewer-stable");
  assert.notDeepEqual(acting.localControl, waiting.localControl, "only local control reflects entitlement/current action");
  assert.equal(acting.localControl.entitled, true);
  assert.equal(waiting.localControl.entitled, false);
  assert.equal(acting.settlement, null);
  assert.deepEqual(acting.transitionEvents, []);
});

test("snapshot fails closed for malformed or absent public causal proof", () => {
  const malformed = composePresentationSnapshot({
    presentationV2: presentation(scene({ checkpointId: null }), { kind: "SETTLEMENT", interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3, decisionActorId: null }),
    currentAction: { kind: "none", actorId: null },
    actionRevision: "legacy-action",
    viewerId: "B",
  });
  const absent = composePresentationSnapshot({
    presentationV2: presentation(null, { kind: "SETTLEMENT", interactionId: "legacy", checkpointId: "legacy", presentationRevision: 99, decisionActorId: null }),
    currentAction: { kind: "none", actorId: null },
    actionRevision: "legacy-action",
    viewerId: "B",
  });

  for (const snapshot of [malformed, absent]) {
    assert.equal(snapshot.identity, null);
    assert.equal(snapshot.interaction, null);
    assert.equal(snapshot.decision, null);
    assert.deepEqual(snapshot.stable, { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null });
    assert.equal(snapshot.settlement, null, "legacy settlement cannot become authoritative");
    assert.deepEqual(snapshot.transitionEvents, [], "legacy transition events remain reserved");
  }
});

test("snapshot fails closed atomically for every scene-boundary coherence mismatch", () => {
  const cases = [
    ["interaction", { interactionId: "other-interaction" }],
    ["checkpoint", { checkpointId: "other-checkpoint" }],
    ["revision", { presentationRevision: 4 }],
    ["choice actor", { decisionActorId: "C" }],
    ["REST", { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null }],
    ["SETTLEMENT", { kind: "SETTLEMENT", interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3, decisionActorId: "B" }],
  ];
  for (const [label, boundary] of cases) {
    const snapshot = composePresentationSnapshot({
      presentationV2: presentation(scene(), boundary),
      currentAction: { kind: "response", actorId: "B" },
      actionRevision: `local-${label}`,
      viewerId: "B",
    });
    assert.equal(snapshot.identity, null, `${label}: identity`);
    assert.equal(snapshot.interaction, null, `${label}: interaction`);
    assert.equal(snapshot.decision, null, `${label}: decision`);
    assert.deepEqual(snapshot.stable, { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null }, `${label}: stable`);
    assert.equal(snapshot.settlement, null, `${label}: settlement`);
    assert.deepEqual(snapshot.transitionEvents, [], `${label}: transition events`);
    assert.equal(snapshot.localControl.entitled, true, `${label}: local control remains local only`);
    assert.equal(snapshot.localControl.actionRevision, `local-${label}`, `${label}: local control cannot recreate public identity`);
  }
});

test("snapshot repeated reads are pure and do not change identity or revision", () => {
  const input = {
    presentationV2: presentation(scene()),
    currentAction: { kind: "response", actorId: "B" },
    actionRevision: "same-action",
    viewerId: "B",
  };
  const before = structuredClone(input);
  const first = composePresentationSnapshot(input);
  const second = composePresentationSnapshot(input);
  assert.deepEqual(second, first);
  assert.deepEqual(input, before, "composition does not mutate authoritative inputs");
});

test("localControl remains a thin viewer-private reference and never carries legal controls", () => {
  const snapshot = composePresentationSnapshot({
    presentationV2: presentation(scene()),
    currentAction: { kind: "response", actorId: "B" },
    actionRevision: "action-reference",
    viewerId: "B",
  });

  assert.deepEqual(Object.keys(snapshot.localControl).sort(), ["actionRevision", "actorId", "entitled", "kind", "source"]);
  assert.deepEqual(snapshot.localControl, {
    source: "CurrentAction",
    actionRevision: "action-reference",
    kind: "response",
    actorId: "B",
    entitled: true,
  });
  assert.equal("options" in snapshot.localControl, false);
  assert.equal("legalActions" in snapshot.localControl, false);
  assert.equal("cards" in snapshot.localControl, false);
  assert.equal("providers" in snapshot.localControl, false);
});
