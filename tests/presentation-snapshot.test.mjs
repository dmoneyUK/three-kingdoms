import test from "node:test";
import assert from "node:assert/strict";
import { composePresentationSnapshot } from "../game/presentation-snapshot.ts";
import { projectPresentationV2 } from "../game/presentation-v2.ts";

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

function groupScene({ child = false, currentParticipantId = "B", effect = "Raining Arrows" } = {}) {
  const targetIds = ["B", "C", "D"];
  return scene({
    rootFrameId: "group-frame",
    activeFrameId: child ? "damage-frame" : "group-frame",
    parentFrameId: child ? "group-frame" : null,
    stage: child ? "DAMAGE" : "GROUP_RESOLUTION",
    effect,
    targetIds,
    currentParticipantId,
    activeTargetIds: [currentParticipantId],
    participantRoles: {
      sourceId: "A", originalTargetIds: targetIds, activeTargetIds: [currentParticipantId], currentParticipantId,
      decisionActorId: "C", activeResolverId: "C", parentParticipantId: currentParticipantId, participantIds: targetIds,
    },
    continuity: child ? { relation: "CHILD_FRAME", parentFrameId: "group-frame" } : { relation: "ROOT_FRAME", parentFrameId: null },
  });
}

function groupResolution(groupSceneValue, overrides = {}) {
  return {
    semantics: "PROVEN",
    interactionId: groupSceneValue.interactionId,
    groupFrameId: groupSceneValue.rootFrameId,
    activeFrameId: groupSceneValue.activeFrameId,
    parentFrameId: groupSceneValue.parentFrameId,
    checkpointId: groupSceneValue.checkpointId,
    presentationRevision: groupSceneValue.presentationRevision,
    stage: groupSceneValue.stage,
    cardKind: "RainingArrows",
    resolutionSemantics: "GROUP",
    effect: "Raining Arrows",
    sourceId: "A",
    targetIds: groupSceneValue.targetIds,
    currentParticipantId: "B",
    participantProgress: [
      { playerId: "B", order: 1, status: groupSceneValue.activeFrameId === groupSceneValue.rootFrameId ? "CURRENT" : "PAUSED" },
      { playerId: "C", order: 2, status: "PENDING" },
      { playerId: "D", order: 3, status: "RESOLVED" },
    ],
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
  assert.equal(acting.groupParticipantProgress, null);
  assert.deepEqual(acting.interaction, waiting.interaction, "public interaction is viewer-stable");
  assert.deepEqual(acting.identity, waiting.identity, "public identity is viewer-stable");
  assert.deepEqual(acting.stable, waiting.stable, "public boundary is viewer-stable");
  assert.notDeepEqual(acting.localControl, waiting.localControl, "only local control reflects entitlement/current action");
  assert.equal(acting.localControl.entitled, true);
  assert.equal(waiting.localControl.entitled, false);
  assert.equal(acting.settlement, null);
  assert.deepEqual(acting.transitionEvents, []);
});

test("single-target Negation settlement requires a typed, root-bound public occurrence", () => {
  const envelope = {
    version: 1,
    interactionId: "interaction-negation",
    frames: [{
      frameId: "root-negation-frame", parentFrameId: null, stage: "NEGATION",
      origin: { originSourceId: "A", originEffect: "Dismantle", originalTargetIds: ["B"] },
      current: { currentSourceId: "A", currentEffect: "Dismantle", currentTargetIds: ["B"], resolvingPlayerId: "B" },
    }],
    activeFrameId: "root-negation-frame",
    checkpoint: { checkpointId: "settlement-checkpoint", frameId: "root-negation-frame", stage: "NEGATION" },
    presentationRevision: 5,
  };
  const proof = {
    semantics: "PROVEN", outcome: "ROOT_CANCELLED", interactionId: "interaction-negation",
    rootFrameId: "root-negation-frame", checkpointId: "settlement-checkpoint", presentationRevision: 5,
    resolutionId: "resolution-negation", rootCardKind: "Dismantle", sourceId: "A", targetId: "B",
  };
  const event = {
    id: "negation-settlement-event", type: "message", message: "root disposition",
    resolutionId: "resolution-negation", importance: "essential", negationSettlement: proof,
  };
  const projected = projectPresentationV2({ pending: null, currentAction: null, actionRevision: "settled", timeline: [event], causalEnvelope: envelope });
  assert.deepEqual(projected.negationSettlement, { ...proof, eventId: event.id });
  const local = composePresentationSnapshot({ presentationV2: projected, currentAction: null, actionRevision: "settled", viewerId: "A" });
  const observer = composePresentationSnapshot({ presentationV2: projected, currentAction: null, actionRevision: "other", viewerId: "C" });
  assert.deepEqual(local.settlement, { ...proof, eventId: event.id });
  assert.deepEqual(observer.settlement, local.settlement, "public settlement is viewer-equal");
  assert.equal(JSON.stringify(local.settlement).includes("physical"), false, "settlement exposes no physical card identity");

  for (const mismatch of [
    { event: { ...event, resolutionId: "different-resolution" } },
    { envelope: { ...envelope, interactionId: "different-interaction" } },
    { proof: { ...proof, rootFrameId: "different-root" } },
    { proof: { ...proof, sourceId: "different-source" } },
    { proof: { ...proof, targetId: "different-target" } },
  ]) {
    const invalidEvent = { ...event, ...(mismatch.event ?? {}), negationSettlement: mismatch.proof ?? proof };
    const invalidEnvelope = mismatch.envelope ?? envelope;
    assert.equal(projectPresentationV2({ pending: null, currentAction: null, actionRevision: "settled", timeline: [invalidEvent], causalEnvelope: invalidEnvelope }).negationSettlement, null);
  }

  const legacyFinalResult = projectPresentationV2({
    pending: null, currentAction: null, actionRevision: "settled",
    timeline: [{ ...event, negationSettlement: undefined, finalResult: true }], causalEnvelope: envelope,
  });
  assert.equal(legacyFinalResult.negationSettlement, null, "legacy result flags and text cannot manufacture Negation outcome");
  const openNegation = projectPresentationV2({
    pending: { kind: "response", continuation: { kind: "negation" } }, currentAction: null, actionRevision: "open",
    timeline: [event], causalEnvelope: envelope,
  });
  assert.equal(openNegation.negationSettlement, null, "an open Negation decision cannot expose a stale settlement");
});

test("snapshot forwards only identity- and ordered-scope-coherent Standard AOE progress", () => {
  for (const child of [false, true]) {
    const interaction = groupScene({ child });
    const projected = composePresentationSnapshot({
      presentationV2: { ...presentation(interaction), groupResolution: groupResolution(interaction, { participantProgress: [
        { playerId: "B", order: 1, status: child ? "PAUSED" : "CURRENT" },
        { playerId: "C", order: 2, status: "PENDING" },
        { playerId: "D", order: 3, status: "RESOLVED", outcome: "AVOIDED" },
      ] }) },
      currentAction: { kind: "response", actorId: "C" },
      actionRevision: `aoe-${child}`,
      viewerId: "C",
    });
    assert.deepEqual(projected.groupParticipantProgress, {
      cardKind: "RainingArrows",
      resolutionSemantics: "GROUP",
      interactionId: interaction.interactionId,
      groupFrameId: interaction.rootFrameId,
      activeFrameId: interaction.activeFrameId,
      checkpointId: interaction.checkpointId,
      presentationRevision: interaction.presentationRevision,
      targetIds: ["B", "C", "D"],
      currentParticipantId: "B",
      participants: [
        { playerId: "B", order: 1, status: child ? "PAUSED" : "CURRENT" },
        { playerId: "C", order: 2, status: "PENDING" },
        { playerId: "D", order: 3, status: "RESOLVED", outcome: "AVOIDED" },
      ],
    });
  }
});

test("snapshot admits only identity-coherent simultaneous Oath recipient scope", () => {
  const interaction = scene({
    rootFrameId: "oath-frame",
    activeFrameId: "oath-frame",
    stage: "NEGATION",
    effect: "Oath of the Peach Garden",
  });
  const oathRecipientScope = {
    semantics: "PROVEN",
    cardKind: "Oath",
    interactionId: interaction.interactionId,
    rootFrameId: interaction.rootFrameId,
    activeFrameId: interaction.activeFrameId,
    checkpointId: interaction.checkpointId,
    presentationRevision: interaction.presentationRevision,
    sourceId: interaction.sourceId,
    recipientIds: ["A", "C"],
  };
  const accepted = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), oathRecipientScope },
    currentAction: { kind: "response", actorId: "B" },
    actionRevision: "oath-1",
    viewerId: "B",
  });
  assert.deepEqual(accepted.oathRecipientScope, oathRecipientScope);

  const mismatched = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), oathRecipientScope: { ...oathRecipientScope, activeFrameId: "other-frame" } },
    currentAction: { kind: "response", actorId: "B" },
    actionRevision: "oath-2",
    viewerId: "B",
  });
  assert.equal(mismatched.oathRecipientScope, null, "a scope from another frame fails closed without discarding unrelated proven authority");
  assert.equal(mismatched.interaction?.semantics, "PROVEN");
});

test("snapshot preserves explicit ORDERED Halberd semantics and target order", () => {
  const interaction = groupScene();
  const orderedGroup = groupResolution(interaction, {
    cardKind: "SkyPiercingHalberdAttack",
    effect: "Attack",
    resolutionSemantics: "ORDERED",
  });
  const snapshot = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: orderedGroup },
    currentAction: { kind: "response", actorId: "B" },
    actionRevision: "halberd-ordered",
    viewerId: "B",
  });
  assert.equal(snapshot.groupParticipantProgress?.resolutionSemantics, "ORDERED");
  assert.deepEqual(snapshot.groupParticipantProgress?.targetIds, ["B", "C", "D"]);
  assert.deepEqual(snapshot.groupParticipantProgress?.participants.map(({ playerId, order }) => ({ playerId, order })), [
    { playerId: "B", order: 1 }, { playerId: "C", order: 2 }, { playerId: "D", order: 3 },
  ]);
});

test("snapshot drops AOE progress on root identity, order, participant, or status mismatch", () => {
  const interaction = groupScene();
  const base = groupResolution(interaction);
  const malformed = [
    { ...base, interactionId: "other-interaction" },
    { ...base, groupFrameId: "other-frame" },
    { ...base, targetIds: ["C", "B", "D"] },
    { ...base, resolutionSemantics: "INVALID" },
    { ...base, participantProgress: [...base.participantProgress].reverse() },
    { ...base, participantProgress: [{ ...base.participantProgress[0], status: "INVALID" }, ...base.participantProgress.slice(1)] },
    { ...base, participantProgress: [{ ...base.participantProgress[0], outcome: "AVOIDED" }, ...base.participantProgress.slice(1)] },
    { ...base, participantProgress: [{ ...base.participantProgress[0], outcome: "DAMAGED" }, ...base.participantProgress.slice(1)] },
    { ...base, participantProgress: [...base.participantProgress.slice(0, 1), { ...base.participantProgress[1], outcome: "AVOIDED" }, ...base.participantProgress.slice(2)] },
    { ...base, participantProgress: [...base.participantProgress.slice(0, 1), { ...base.participantProgress[1], outcome: "DAMAGED" }, ...base.participantProgress.slice(2)] },
    { ...base, currentParticipantId: "C" },
  ];
  for (const group of malformed) {
    const snapshot = composePresentationSnapshot({
      presentationV2: { ...presentation(interaction), groupResolution: group },
      currentAction: { kind: "response", actorId: "B" },
      actionRevision: "malformed-aoe",
      viewerId: "B",
    });
    assert.equal(snapshot.identity?.interactionId, interaction.interactionId, "unrelated public scene remains usable");
    assert.equal(snapshot.groupParticipantProgress, null);
  }
});

test("snapshot preserves only a resolved Raining Arrows Damaged outcome", () => {
  const interaction = groupScene({ currentParticipantId: "C" });
  const base = groupResolution(interaction, { currentParticipantId: "C", participantProgress: [
    { playerId: "B", order: 1, status: "RESOLVED", outcome: "DAMAGED" },
    { playerId: "C", order: 2, status: "CURRENT" },
    { playerId: "D", order: 3, status: "PENDING" },
  ] });
  const projected = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: base },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "resolved-damage-outcome",
    viewerId: "C",
  });
  assert.equal(projected.groupParticipantProgress?.participants[0].outcome, "DAMAGED");

  const malformed = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [{ ...base.participantProgress[0], status: "PAUSED" }, ...base.participantProgress.slice(1)] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "unresolved-damage-outcome",
    viewerId: "C",
  });
  assert.equal(malformed.groupParticipantProgress, null, "unresolved damage is not a public outcome");

  const negated = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "NEGATED" },
      ...base.participantProgress.slice(1),
    ] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "resolved-negated-outcome",
    viewerId: "C",
  });
  assert.equal(negated.groupParticipantProgress?.participants[0].outcome, "NEGATED");

  const defeated = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "DEFEATED" },
      ...base.participantProgress.slice(1),
    ] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "resolved-defeated-outcome",
    viewerId: "C",
  });
  assert.equal(defeated.groupParticipantProgress?.participants[0].outcome, "DEFEATED");

  const unresolvedNegated = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [
      { playerId: "B", order: 1, status: "PAUSED", outcome: "NEGATED" },
      ...base.participantProgress.slice(1),
    ] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "unresolved-negated-outcome",
    viewerId: "C",
  });
  assert.equal(unresolvedNegated.groupParticipantProgress, null, "an unresolved Negation cannot publish an outcome");
});

test("snapshot preserves resolved Barbarian Invasion damage but rejects avoidance", () => {
  const interaction = groupScene({ currentParticipantId: "C", effect: "Barbarian Invasion" });
  const base = groupResolution(interaction, {
    cardKind: "BarbarianInvasion",
    effect: "Barbarian Invasion",
    currentParticipantId: "C",
    participantProgress: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "DAMAGED" },
      { playerId: "C", order: 2, status: "CURRENT" },
      { playerId: "D", order: 3, status: "PENDING" },
    ],
  });
  const projected = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: base },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "barbarian-damage-outcome",
    viewerId: "C",
  });
  assert.equal(projected.groupParticipantProgress?.cardKind, "BarbarianInvasion");
  assert.equal(projected.groupParticipantProgress?.participants[0].outcome, "DAMAGED");

  const malformed = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "AVOIDED" },
      ...base.participantProgress.slice(1),
    ] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "barbarian-avoidance-outcome",
    viewerId: "C",
  });
  assert.equal(malformed.groupParticipantProgress, null, "Barbarian Invasion cannot claim an Avoided outcome");

  const negated = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "NEGATED" },
      ...base.participantProgress.slice(1),
    ] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "barbarian-negated-outcome",
    viewerId: "C",
  });
  assert.equal(negated.groupParticipantProgress?.participants[0].outcome, "NEGATED");

  const defeated = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "DEFEATED" },
      ...base.participantProgress.slice(1),
    ] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "barbarian-defeated-outcome",
    viewerId: "C",
  });
  assert.equal(defeated.groupParticipantProgress?.participants[0].outcome, "DEFEATED");
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
