import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createPresentationTransitionStore, buildAttackDodgePresentationTransitions } from "../app/presentation/presentation-transition-store.ts";

const scope = { roomCode: "ROOM-1", viewerId: "viewer-1" };

function restView(overrides = {}) {
  return {
    hasInteraction: false,
    interactionId: null,
    checkpointId: null,
    presentationRevision: null,
    rootFrameId: null,
    activeFrameId: null,
    stage: null,
    effect: null,
    sourceId: null,
    originalTargetIds: [],
    activeTargetIds: [],
    currentParticipantId: null,
    decisionActorId: null,
    activeResolverId: null,
    participantIds: [],
    groupResolution: null,
    groupParticipantProgress: [],
    oathRecipientScope: null,
    bumperHarvestProgress: null,
    reactionChain: null,
    rootAction: null,
    skillEffectAction: null,
    skillEffectSettlements: [],
    dismantleSettlements: [],
    stealSettlements: [],
    cardAcquisitionSettlements: [],
    attackHitSettlements: [],
    groupSettlements: [],
    bumperHarvestSettlements: [],
    duelExchange: null,
    lustDuelExchange: null,
    attackDodgeResponses: [],
    selfTargetActions: [],
    deflectionActions: [],
    continuity: { relation: "UNPROVEN", parentFrameId: null },
    parentFrameId: null,
    stableKind: "REST",
    isLocalDecisionActor: false,
    hasLocalControl: false,
    localActionRevision: null,
    ...overrides,
  };
}

function activeView(overrides = {}) {
  return restView({
    hasInteraction: true,
    interactionId: "attack-interaction",
    checkpointId: "checkpoint-1",
    presentationRevision: 1,
    rootFrameId: "attack-frame",
    activeFrameId: "attack-frame",
    stage: "ATTACK_RESPONSE",
    effect: "Attack",
    sourceId: "source",
    originalTargetIds: ["target"],
    activeTargetIds: ["target"],
    currentParticipantId: "target",
    decisionActorId: "target",
    activeResolverId: "source",
    participantIds: ["source", "target"],
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
    stableKind: "CHOICE",
    hasLocalControl: true,
    localActionRevision: "private-action-1",
    ...overrides,
  });
}

function attack(rootEventId = "attack-event") {
  return {
    semantics: "PROVEN",
    action: "ATTACK",
    cardKind: "Attack",
    physicalCardKind: "Attack",
    interactionId: "attack-interaction",
    rootFrameId: "attack-frame",
    activeFrameId: "attack-frame",
    checkpointId: "checkpoint-1",
    presentationRevision: 1,
    rootEventId,
    sourceId: "source",
    targetId: "target",
  };
}

function dodge(responseEventId = "dodge-event", rootEventId = "attack-event") {
  return {
    semantics: "PROVEN",
    counterRelation: "BLOCKS_TARGET_EFFECT",
    interactionId: "attack-interaction",
    rootFrameId: "attack-frame",
    rootEventId,
    rootResolutionId: `resolution-${rootEventId}`,
    rootSourceId: "source",
    targetId: "target",
    responseActorId: "target",
    rootCardKind: "Attack",
    responseCardKind: "Dodge",
    responseEventId,
    responseResolutionId: `resolution-${rootEventId}`,
    turnSeatAtCommit: 1,
  };
}

function hit(eventId = "hit-event", rootEventId = "attack-event") {
  return {
    semantics: "PROVEN",
    eventId,
    rootEventId,
    rootResolutionId: `resolution-${rootEventId}`,
    sourceId: "source",
    targetId: "target",
    outcome: "ATTACK_DAMAGE_APPLIED",
  };
}

test("hydrates an existing Attack/Dodge/result view without replay", () => {
  const hydrated = activeView({
    rootAction: attack(),
    attackDodgeResponses: [dodge()],
    attackHitSettlements: [hit()],
  });
  const store = createPresentationTransitionStore(scope, hydrated);
  const snapshot = store.getSnapshotFor(scope);
  assert.equal(snapshot.presentation.kind, "NONE");
  assert.deepEqual(snapshot.attackDodgeTransitions, []);
  assert.deepEqual(snapshot.pendingAttackDodgeTransitions, []);
});

test("publishes exact Attack, Dodge-block and applied-hit transitions and acknowledges parked cards", () => {
  const store = createPresentationTransitionStore(scope, restView());
  const notifications = [];
  const unsubscribe = store.subscribe(() => notifications.push(store.getSnapshotFor(scope)));

  assert.equal(store.accept(scope, activeView({ rootAction: attack() })), true);
  let snapshot = store.getSnapshotFor(scope);
  assert.equal(snapshot.presentation.kind, "INTERACTION_TRANSITION");
  assert.deepEqual(snapshot.attackDodgeTransitions.map(({ kind, eventId, rootEventId, fresh }) => ({ kind, eventId, rootEventId, fresh })), [
    { kind: "ATTACK_COMMITTED", eventId: "attack-event", rootEventId: "attack-event", fresh: true },
  ]);
  assert.equal(snapshot.pendingAttackDodgeTransitions[0].eventId, "attack-event");

  assert.equal(store.acknowledgeAttackDodgeEvent(scope, "attack-event"), true);
  assert.equal(store.accept(scope, activeView({ rootAction: attack(), attackDodgeResponses: [dodge()] })), true);
  snapshot = store.getSnapshotFor(scope);
  assert.deepEqual(snapshot.attackDodgeTransitions.map(({ kind, eventId, rootEventId, outcome }) => ({ kind, eventId, rootEventId, outcome })), [
    { kind: "DODGE_COMMITTED", eventId: "dodge-event", rootEventId: "attack-event", outcome: "ATTACK_BLOCKED_BY_DODGE" },
  ]);
  assert.deepEqual(snapshot.pendingAttackDodgeTransitions.map(({ kind, eventId }) => ({ kind, eventId })), [
    { kind: "DODGE_COMMITTED", eventId: "dodge-event" },
  ]);

  assert.equal(store.acknowledgeAttackDodgeEvent(scope, "dodge-event"), true);
  assert.equal(store.accept(scope, activeView({ rootAction: attack("attack-event-2") })), true);
  assert.equal(store.getSnapshotFor(scope).attackDodgeTransitions[0].kind, "ATTACK_COMMITTED");
  assert.equal(store.acknowledgeAttackDodgeEvent(scope, "attack-event-2"), true);
  assert.equal(store.accept(scope, activeView({
    rootAction: attack("attack-event-2"),
    attackHitSettlements: [hit("hit-event-2", "attack-event-2")],
  })), true);
  const hitTransition = store.getSnapshotFor(scope).attackDodgeTransitions[0];
  assert.equal(hitTransition.kind, "ATTACK_HIT");
  assert.equal(hitTransition.eventId, "hit-event-2");
  assert.equal(hitTransition.rootEventId, "attack-event-2");
  assert.equal(hitTransition.outcome, "ATTACK_DAMAGE_APPLIED");
  assert.equal(notifications.length, 7);
  unsubscribe();
});

test("deduplicates repeated identities while retaining a newer fact for a pending response", () => {
  const store = createPresentationTransitionStore(scope, activeView({ rootAction: attack() }));
  const responseView = activeView({ rootAction: attack(), attackDodgeResponses: [dodge()] });
  assert.equal(store.accept(scope, responseView), true);
  const firstSnapshot = store.getSnapshotFor(scope);
  assert.equal(firstSnapshot.pendingAttackDodgeTransitions[0].proof.turnSeatAtCommit, 1);
  assert.equal(store.accept(scope, { ...responseView }), false);
  assert.equal(store.getSnapshotFor(scope), firstSnapshot);
  assert.equal(store.accept(scope, { ...responseView, hasLocalControl: false, isLocalDecisionActor: false, localActionRevision: "private-action-2" }), false,
    "private response-control revisions do not create a public transition or gate the live response UI");

  const updatedProof = { ...dodge(), turnSeatAtCommit: 2 };
  assert.equal(store.accept(scope, activeView({ rootAction: attack(), attackDodgeResponses: [updatedProof] })), true);
  const updatedSnapshot = store.getSnapshotFor(scope);
  assert.equal(updatedSnapshot.attackDodgeTransitions[0].kind, "DODGE_PROOF_UPDATED");
  assert.equal(updatedSnapshot.attackDodgeTransitions[0].fresh, false);
  assert.equal(updatedSnapshot.pendingAttackDodgeTransitions[0].proof.turnSeatAtCommit, 2);
  assert.equal(updatedSnapshot.pendingAttackDodgeTransitions[0].proofKey, firstSnapshot.pendingAttackDodgeTransitions[0].proofKey);
});

test("private-only refresh clears a stale presentation transition without retiring pending public events", () => {
  const store = createPresentationTransitionStore(scope, restView());
  const attackView = activeView({ rootAction: attack() });
  store.accept(scope, attackView);
  assert.equal(store.getSnapshotFor(scope).presentation.kind, "INTERACTION_TRANSITION");

  assert.equal(store.accept(scope, {
    ...attackView,
    hasLocalControl: true,
    isLocalDecisionActor: true,
    localActionRevision: "private-refresh",
  }), false);
  const snapshot = store.getSnapshotFor(scope);
  assert.equal(snapshot.presentation.kind, "NONE");
  assert.deepEqual(snapshot.pendingAttackDodgeTransitions.map(({ kind, eventId }) => ({ kind, eventId })), [
    { kind: "ATTACK_COMMITTED", eventId: "attack-event" },
  ]);
});

test("room/view switches and proof truncation reset or retire transitions without replay", () => {
  const store = createPresentationTransitionStore(scope, restView());
  const responseView = activeView({ attackDodgeResponses: [dodge()] });
  store.accept(scope, responseView);
  store.acknowledgeAttackDodgeEvent(scope, "dodge-event");
  store.accept(scope, activeView());
  assert.equal(store.accept(scope, responseView), true);
  assert.deepEqual(store.getSnapshotFor(scope).attackDodgeTransitions, [], "a previously observed proof does not replay after truncation");
  assert.deepEqual(store.getSnapshotFor(scope).pendingAttackDodgeTransitions, []);

  const nextScope = { roomCode: "ROOM-2", viewerId: "viewer-2" };
  store.accept(nextScope, activeView({ rootAction: attack("existing-root") }));
  assert.deepEqual(store.getSnapshotFor(nextScope).attackDodgeTransitions, []);
  assert.deepEqual(store.getSnapshotFor(nextScope).pendingAttackDodgeTransitions, []);
  assert.deepEqual(store.getSnapshotFor(scope).attackDodgeTransitions, []);
  assert.equal(store.acknowledgeAttackDodgeEvent(scope, "existing-root"), false, "a prior scope cannot acknowledge the new view");
});

test("pure transition comparison fails closed for non-semantic results and keeps actual event IDs", () => {
  const previous = activeView({ rootAction: attack() });
  const next = activeView({
    rootAction: attack(),
    attackDodgeResponses: [dodge()],
    attackHitSettlements: [{ ...hit(), outcome: "ATTACK_BLOCKED_BY_DODGE" }],
  });
  assert.deepEqual(buildAttackDodgePresentationTransitions(previous, next).map(({ kind, eventId, rootEventId }) => ({ kind, eventId, rootEventId })), [
    { kind: "DODGE_COMMITTED", eventId: "dodge-event", rootEventId: "attack-event" },
  ]);
});

test("GameRoom uses the scoped store for its real InteractionStage and Attack/Dodge callsites", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /import \{ createPresentationTransitionStore \} from "\.\/presentation\/presentation-transition-store"/);
  assert.doesNotMatch(page, /function createPresentationTransitionStore\s*\(/);
  assert.match(page, /createPresentationTransitionStore\(presentationTransitionScope, clientPresentation\)/);
  assert.match(page, /presentationTransitionStore\.getSnapshotFor\(presentationTransitionScope\)/);
  assert.match(page, /presentationTransitionStore\.accept\(presentationTransitionScope, clientPresentation\)/);
  assert.match(page, /rootFresh: pendingAttackDodgeEventIds\.has\(rootAction\.rootEventId\)/);
  assert.match(page, /responseFresh: pendingAttackDodgeEventIds\.has\(attackDodgeDisplayCandidate\.proof\.responseEventId\)/);
  assert.match(page, /<InteractionStage view=\{clientPresentation\} transitionKind=\{presentationTransition\.kind\}/);
  assert.match(page, /<PublicCardDisplay action=\{publicCardDisplayAction\}/);
  assert.doesNotMatch(page, /newAttackDodgeResponseProofs|observedAttackDodgeProofs|attackDodgeProofKeysFromTimeline/);
});
