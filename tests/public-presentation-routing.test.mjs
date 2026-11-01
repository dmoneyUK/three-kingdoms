import assert from "node:assert/strict";
import test from "node:test";
import {
  PUBLIC_PRESENTATION_EVENT_COVERAGE,
  PUBLIC_PRESENTATION_LEGACY_ALLOWLIST,
  routePublicPresentation,
} from "../app/public-presentation-routing.ts";

function fact(eventId, order, rootEventId, actorId, overrides = {}) {
  return {
    semantics: "PROVEN", visibility: "PUBLIC",
    identity: { interactionId: "interaction-1", rootFrameId: "root-frame", checkpointId: `checkpoint-${order}`, presentationRevision: order },
    eventId, order, frameId: `frame-${order}`, rootEventId, category: "CARD_PLAYED", actorId,
    affectedPlayerIds: [], ...overrides,
  };
}

function timeline(eventId, sequence, rootEventId, actorId, physicalCardId, overrides = {}) {
  return {
    semantics: "PROVEN", visibility: "PUBLIC", eventId, publicSequence: sequence,
    interactionId: "interaction-1", rootFrameId: "root-frame", rootEventId, actorId,
    action: eventId === rootEventId ? "play" : "response", physicalCardIds: [physicalCardId],
    ...overrides,
  };
}

function journeyInput({ viewerId = "viewer-1", interactionId = "interaction-1", rootFrameId = "root-frame", rootEventId = "root-event", rootCardId = "root-card", response = null, layoutReady = true, retiredTransitionIds = [], existingOwners = [] } = {}) {
  const rootFact = fact(rootEventId, 1, rootEventId, "actor-1", {
    identity: { interactionId, rootFrameId, checkpointId: "checkpoint-1", presentationRevision: 1 },
  });
  const rootTimeline = timeline(rootEventId, 1, rootEventId, "actor-1", rootCardId, { interactionId, rootFrameId });
  const facts = [rootFact];
  const publicTimeline = [rootTimeline];
  const transitions = [{ eventId: rootEventId, physicalCardIds: [rootCardId] }];
  if (response) {
    facts.push(fact(response.eventId, 2, rootEventId, response.actorId, {
      identity: { interactionId, rootFrameId, checkpointId: "checkpoint-2", presentationRevision: 2 },
    }));
    publicTimeline.push(timeline(response.eventId, 2, rootEventId, response.actorId, response.cardId, { interactionId, rootFrameId }));
    transitions.push({ eventId: response.eventId, physicalCardIds: [response.cardId] });
  }
  const checkpointId = response ? "checkpoint-2" : "checkpoint-1";
  const presentationRevision = response ? 2 : 1;
  const snapshot = {
    identity: { interactionId, checkpointId, presentationRevision },
    stable: { kind: "CHOICE", interactionId, checkpointId, presentationRevision, decisionActorId: "actor-2" },
    interaction: { semantics: "PROVEN", interactionId, rootFrameId, activeFrameId: "active-frame", stage: "RESPONSE" },
    publicEventFacts: facts,
    retainedPublicEvent: undefined,
    retainedPublicEventFacts: [],
  };
  const clientView = {
    hasInteraction: true, interactionId, checkpointId, presentationRevision, rootFrameId,
    stage: "RESPONSE", stableKind: "CHOICE",
  };
  return {
    scope: { roomCode: "ROOM", viewerId, generation: `${viewerId}:scope-1` },
    snapshot, clientView, publicTimeline, publicZones: [],
    replay: { retiredTransitionIds },
    candidate: {
      kind: "public-journey", interactionId, rootFrameId, rootEventId, sourceId: "actor-1",
      mode: "active", transitions, layoutReady,
    },
    existingOwners,
  };
}

test("coverage inventory classifies every E01-E21 family and names each temporary legacy owner", () => {
  assert.equal(PUBLIC_PRESENTATION_EVENT_COVERAGE.length, 21);
  assert.deepEqual(PUBLIC_PRESENTATION_EVENT_COVERAGE.map((entry) => entry.id), Array.from({ length: 21 }, (_, index) => `E${String(index + 1).padStart(2, "0")}`));
  assert.equal(new Set(PUBLIC_PRESENTATION_LEGACY_ALLOWLIST.map((entry) => entry.id)).size, PUBLIC_PRESENTATION_LEGACY_ALLOWLIST.length);
  const legacyIds = new Set(PUBLIC_PRESENTATION_LEGACY_ALLOWLIST.map((entry) => entry.id));
  assert.ok(PUBLIC_PRESENTATION_EVENT_COVERAGE.flatMap((entry) => entry.legacyRoutes).every((id) => legacyIds.has(id)));
  assert.equal(PUBLIC_PRESENTATION_LEGACY_ALLOWLIST.some((entry) => entry.id === "STATIC_GENERIC_FALLBACK"), false);
  assert.ok(PUBLIC_PRESENTATION_LEGACY_ALLOWLIST.every((entry) => entry.owner && entry.removalSlice && entry.action));
});

test("Attack, Duel and committed Negation response cards retain one public journey owner", () => {
  for (const response of [null, { eventId: "duel-attack-event", cardId: "duel-attack-card", actorId: "actor-2" }, { eventId: "negation-event", cardId: "negation-card", actorId: "actor-3" }]) {
    const result = routePublicPresentation(journeyInput({ response }));
    assert.equal(result.kind, "public-journey");
    assert.equal(result.claimedBy, "PublicCardDisplay");
    assert.equal(result.transitions.length, response ? 2 : 1);
    assert.deepEqual(result.transitions.map(({ order }) => order), response ? [1, 2] : [1]);
  }
});

test("false candidate and stale interaction fail closed while repeated polls keep a stable event claim", () => {
  const input = journeyInput();
  const first = routePublicPresentation(input);
  const polled = routePublicPresentation(input);
  assert.equal(first.claimId, polled.claimId);
  assert.deepEqual(first.transitions, polled.transitions);

  const falseCandidate = journeyInput();
  falseCandidate.candidate.transitions[0] = { eventId: "not-in-public-proof", physicalCardIds: ["invented-card"] };
  assert.deepEqual(routePublicPresentation(falseCandidate), { kind: "blocked-invalid-proof", reason: "missing-public-fact" });

  const stale = journeyInput({ interactionId: "older-interaction" });
  stale.snapshot.identity = { interactionId: "newer-interaction", checkpointId: "new-checkpoint", presentationRevision: 9 };
  stale.snapshot.stable = { kind: "CHOICE", interactionId: "newer-interaction", checkpointId: "new-checkpoint", presentationRevision: 9, decisionActorId: "actor-2" };
  stale.snapshot.interaction = { semantics: "PROVEN", interactionId: "newer-interaction", rootFrameId: "new-root", activeFrameId: "new-active", stage: "RESPONSE" };
  stale.clientView = { ...stale.snapshot.identity, hasInteraction: true, rootFrameId: "new-root", stage: "RESPONSE", stableKind: "CHOICE" };
  assert.deepEqual(routePublicPresentation(stale), { kind: "blocked-invalid-proof", reason: "active-interaction-mismatch" });

  assert.deepEqual(routePublicPresentation(journeyInput({ retiredTransitionIds: ["root-event"] })), { kind: "no-public-card-action", reason: "replayed-transition" });
});

test("viewer rebase changes only the scoped callback generation, and layout readiness never changes ownership", () => {
  const first = routePublicPresentation(journeyInput({ viewerId: "viewer-1", layoutReady: false }));
  const switched = journeyInput({ viewerId: "viewer-2", layoutReady: false });
  switched.expectedScopeGeneration = "viewer-2:scope-1";
  const second = routePublicPresentation(switched);
  assert.equal(first.kind, "public-journey");
  assert.equal(second.kind, "public-journey");
  assert.equal(first.claimedBy, second.claimedBy);
  assert.equal(first.claimId, second.claimId);
  assert.deepEqual(first.transitions, second.transitions);
  assert.notEqual(first.scope.viewerId, second.scope.viewerId);
  assert.equal(first.presentationState, "layout-pending");
  assert.equal(second.presentationState, "layout-pending");

  const conflictingOwners = journeyInput({ existingOwners: [
    { eventId: "root-event", physicalCardId: "root-card", owner: "PublicCardDisplay" },
    { eventId: "root-event", physicalCardId: "root-card", owner: "TableResolutionSequence" },
  ] });
  assert.equal(routePublicPresentation(conflictingOwners).shadowComparison.status, "multiple-owners");

  switched.expectedScopeGeneration = "viewer-1:scope-1";
  assert.deepEqual(routePublicPresentation(switched), { kind: "blocked-invalid-proof", reason: "scope-generation-mismatch" });
});

test("equipment and later discard transitions for one physical card have separate server event identities", () => {
  const cardId = "same-physical-card";
  const equipIdentity = { interactionId: "equip-interaction", rootFrameId: "equip-frame", checkpointId: "equip-checkpoint", presentationRevision: 1 };
  const equipFact = fact("equip-event", 10, "equip-event", "actor-1", { category: "CARD_EQUIPPED", identity: equipIdentity });
  const equipTimeline = timeline("equip-event", 10, "equip-event", "actor-1", cardId, {
    interactionId: "equip-interaction", rootFrameId: "equip-frame", action: "equip", destination: "EQUIPMENT",
  });
  const equipInput = {
    ...journeyInput(),
    snapshot: {
      identity: { interactionId: "equip-interaction", checkpointId: "equip-checkpoint", presentationRevision: 1 },
      stable: { kind: "SETTLEMENT", interactionId: "equip-interaction", checkpointId: "equip-checkpoint", presentationRevision: 1, decisionActorId: null },
      interaction: { semantics: "PROVEN", interactionId: "equip-interaction", rootFrameId: "equip-frame", activeFrameId: "equip-frame", stage: "SETTLEMENT" },
      publicEventFacts: [equipFact], retainedPublicEventFacts: [],
    },
    clientView: { hasInteraction: true, interactionId: "equip-interaction", checkpointId: "equip-checkpoint", presentationRevision: 1, rootFrameId: "equip-frame", stage: "SETTLEMENT", stableKind: "SETTLEMENT" },
    publicTimeline: [equipTimeline],
    publicZones: [{ semantics: "PROVEN", visibility: "PUBLIC", eventId: "equip-event", physicalCardId: cardId, ownerId: "actor-1", zone: "EQUIPMENT", slot: "weapon" }],
    existingOwners: [{ eventId: "equip-event", physicalCardId: cardId, owner: "TableResolutionSequence" }],
    candidate: { kind: "zone-transition", mode: "active", interactionId: "equip-interaction", rootFrameId: "equip-frame", rootEventId: "equip-event", transitionId: "equip-event", eventId: "equip-event", physicalCardId: cardId, ownerId: "actor-1", destination: "EQUIPMENT", slot: "weapon" },
  };
  const equip = routePublicPresentation(equipInput);
  assert.equal(equip.kind, "zone-transition");
  assert.equal(equip.claimedBy, "PublicPhysicalCardTransition");
  assert.deepEqual(equip.shadowComparison, { status: "mismatch", currentOwners: ["TableResolutionSequence"] });

  const discardIdentity = { interactionId: "discard-interaction", rootFrameId: "discard-frame", checkpointId: "discard-checkpoint", presentationRevision: 1 };
  const discardFact = fact("discard-event", 11, "discard-event", "actor-1", { category: "CARD_DISCARDED", identity: discardIdentity });
  const discardTimeline = timeline("discard-event", 11, "discard-event", "actor-1", cardId, {
    interactionId: "discard-interaction", rootFrameId: "discard-frame", rootEventId: "discard-event", action: "discard", destination: "DISCARD",
  });
  const discardInput = {
    ...equipInput,
    snapshot: {
      identity: { interactionId: "discard-interaction", checkpointId: "discard-checkpoint", presentationRevision: 1 },
      stable: { kind: "SETTLEMENT", interactionId: "discard-interaction", checkpointId: "discard-checkpoint", presentationRevision: 1, decisionActorId: null },
      interaction: { semantics: "PROVEN", interactionId: "discard-interaction", rootFrameId: "discard-frame", activeFrameId: "discard-frame", stage: "SETTLEMENT" },
      publicEventFacts: [discardFact], retainedPublicEventFacts: [],
    },
    clientView: { hasInteraction: true, interactionId: "discard-interaction", checkpointId: "discard-checkpoint", presentationRevision: 1, rootFrameId: "discard-frame", stage: "SETTLEMENT", stableKind: "SETTLEMENT" },
    publicTimeline: [discardTimeline],
    publicZones: [{ semantics: "PROVEN", visibility: "PUBLIC", eventId: "discard-event", physicalCardId: cardId, ownerId: null, zone: "DISCARD" }],
    candidate: { kind: "zone-transition", mode: "active", interactionId: "discard-interaction", rootFrameId: "discard-frame", rootEventId: "discard-event", transitionId: "discard-event", eventId: "discard-event", physicalCardId: cardId, ownerId: null, destination: "DISCARD" },
  };
  const discard = routePublicPresentation(discardInput);
  assert.equal(discard.kind, "zone-transition");
  assert.equal(discard.physicalCardId, equip.physicalCardId);
  assert.notEqual(discard.claimId, equip.claimId);
});

test("only exact committed legacy proof is allowlisted and compared with current renderer ownership", () => {
  const input = journeyInput();
  input.candidate = {
    kind: "legacy", mode: "active", allowlistId: "STATIC_SELF_TARGET_PEACH_ROOT",
    transitionId: "root-event", eventId: "root-event", rootEventId: "root-event",
    physicalCardIds: ["root-card"], interactionId: "interaction-1", rootFrameId: "root-frame",
  };
  input.publicTimeline[0].physicalCardKinds = { "root-card": "Peach" };
  input.existingOwners = [{ eventId: "root-event", physicalCardId: "root-card", owner: "PublicCardDisplay.static-fallback" }];
  const allowed = routePublicPresentation(input);
  assert.equal(allowed.kind, "legacy-allowlisted");
  assert.equal(allowed.removalSlice, "M5");
  assert.equal(allowed.shadowComparison.status, "match");

  input.candidate.allowlistId = "STATIC_GENERIC_FALLBACK";
  assert.deepEqual(routePublicPresentation(input), { kind: "blocked-invalid-proof", reason: "legacy-route-not-allowlisted" });
});

test("fact-only routes require the exact public timeline event and current public stage", () => {
  const input = journeyInput();
  const damageFact = fact("damage-fact", 2, "root-event", "actor-1", { category: "DAMAGE_APPLIED" });
  input.snapshot.publicEventFacts.push(damageFact);
  input.snapshot.identity = { interactionId: "interaction-1", checkpointId: "checkpoint-2", presentationRevision: 2 };
  input.snapshot.stable = { kind: "CHOICE", interactionId: "interaction-1", checkpointId: "checkpoint-2", presentationRevision: 2, decisionActorId: "actor-2" };
  input.clientView = { hasInteraction: true, interactionId: "interaction-1", checkpointId: "checkpoint-2", presentationRevision: 2, rootFrameId: "root-frame", stage: "RESPONSE", stableKind: "CHOICE" };
  input.publicTimeline.push({
    semantics: "PROVEN", visibility: "PUBLIC", eventId: "damage-fact", publicSequence: 2,
    interactionId: "interaction-1", rootFrameId: "root-frame", rootEventId: "root-event",
  });
  input.candidate = { kind: "fact-only", eventId: "damage-fact" };
  const route = routePublicPresentation(input);
  assert.equal(route.kind, "fact-only");
  assert.equal(route.claimedBy, "PublicInteractionAnnouncementLayer");
  input.publicTimeline[1].publicSequence = 99;
  assert.deepEqual(routePublicPresentation(input), { kind: "blocked-invalid-proof", reason: "missing-public-timeline-proof" });
});

test("private pending Negation stays absent from public routing; R7 receipt is recipient-only", () => {
  const publicInput = journeyInput();
  publicInput.candidate = { kind: "private-pending" };
  assert.deepEqual(routePublicPresentation(publicInput), { kind: "no-public-card-action", reason: "private-or-uncommitted" });

  const privateReceipt = {
    ...publicInput,
    scope: { roomCode: "ROOM", viewerId: "recipient", generation: "recipient:scope-1" },
    candidate: { kind: "private-receipt", eventId: "transfer-event", physicalCardId: "private-card", recipientId: "recipient" },
  };
  const recipientRoute = routePublicPresentation(privateReceipt);
  assert.equal(recipientRoute.kind, "private-receipt");
  assert.equal(recipientRoute.physicalCardId, "private-card");
  privateReceipt.scope = { ...privateReceipt.scope, viewerId: "spectator", generation: "spectator:scope-1" };
  const spectatorRoute = routePublicPresentation(privateReceipt);
  assert.deepEqual(spectatorRoute, { kind: "no-public-card-action", reason: "private-or-uncommitted" });
  assert.equal(JSON.stringify(spectatorRoute).includes("private-card"), false);
});
