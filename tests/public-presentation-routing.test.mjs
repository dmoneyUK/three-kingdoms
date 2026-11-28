import assert from "node:assert/strict";
import test from "node:test";
import {
  PUBLIC_PRESENTATION_EVENT_COVERAGE,
  coalesceLinkedJudgementActivationQueue,
  coalescePresentationQueue,
  presentationEventBlocksActions,
  publicH4FactAtPresentationCursor,
  publicRetaliationSettlementOwnsEvent,
  routePublicPresentation,
  selectPublicH4AnnouncementOwner,
  uniquePublicH4Facts,
} from "../app/public-presentation-routing.ts";
import { PUBLIC_PRESENTATION_EVENT_CATEGORIES } from "../game/presentation-semantics.ts";

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

test("coverage inventory records one current producer, route, owner and zone for every event family", () => {
  assert.equal(PUBLIC_PRESENTATION_EVENT_COVERAGE.length, 21);
  assert.deepEqual(PUBLIC_PRESENTATION_EVENT_COVERAGE.map((entry) => entry.id), Array.from({ length: 21 }, (_, index) => `E${String(index + 1).padStart(2, "0")}`));
  assert.ok(PUBLIC_PRESENTATION_EVENT_COVERAGE.every((entry) => entry.producer.trim() && entry.route && entry.currentOwner.trim() && entry.zone.trim()));
  assert.ok(PUBLIC_PRESENTATION_EVENT_COVERAGE.every((entry) => !("legacyRoutes" in entry) && !("nextMigration" in entry)));
});

test("all public fact categories resolve to one H4 owner and duplicate projections keep one proof", () => {
  for (const [index, category] of PUBLIC_PRESENTATION_EVENT_CATEGORIES.entries()) {
    const candidate = fact(`h4-${category}`, index + 1, "root-event", "actor-1", { category });
    assert.deepEqual(selectPublicH4AnnouncementOwner({ fact: candidate }), {
      eventId: candidate.eventId, owner: "PublicInteractionAnnouncementLayer",
    }, `${category} has one generic H4 surface when no accepted special owner applies`);
  }

  const rootFact = fact("result-event", 5, "root-event", "actor-1", { category: "SKILL_USED", resolutionId: "root-resolution" });
  const cardDisplayOwner = selectPublicH4AnnouncementOwner({
    fact: rootFact,
    cardDisplay: { enabled: true, rootEventId: "root-event", interactionId: "interaction-1", rootFrameId: "root-frame" },
  });
  assert.deepEqual(cardDisplayOwner, { eventId: rootFact.eventId, owner: "PublicCardDisplay" });
  assert.deepEqual(selectPublicH4AnnouncementOwner({
    fact: rootFact,
    cardDisplay: {
      enabled: true,
      rootEventId: "effect-event",
      interactionId: "interaction-1",
      rootFrameId: "root-frame",
      causalRootEventId: "root-event",
    },
  }), { eventId: rootFact.eventId, owner: "PublicCardDisplay" },
  "a proof-backed effect frame owns a public fact linked to its exact causal root");
  assert.deepEqual(selectPublicH4AnnouncementOwner({
    fact: rootFact,
    cardDisplay: {
      enabled: true,
      rootEventId: "effect-event",
      interactionId: "interaction-1",
      rootFrameId: "root-frame",
      causalRootEventId: "different-root",
    },
  }), { eventId: rootFact.eventId, owner: "PublicInteractionAnnouncementLayer" },
  "a frame cannot take ownership of a fact from another root");
  assert.deepEqual(selectPublicH4AnnouncementOwner({
    fact: rootFact,
    cardDisplay: {
      enabled: true,
      rootEventId: "effect-event",
      interactionId: "other-interaction",
      rootFrameId: "root-frame",
      causalRootEventId: "root-event",
    },
  }), { eventId: rootFact.eventId, owner: "PublicInteractionAnnouncementLayer" },
  "a frame cannot take ownership across interaction identities");
  assert.deepEqual(selectPublicH4AnnouncementOwner({
    fact: rootFact,
    cardDisplay: {
      enabled: true,
      rootEventId: "effect-event",
      interactionId: "interaction-1",
      rootFrameId: "different-frame",
      causalRootEventId: "root-event",
    },
  }), { eventId: rootFact.eventId, owner: "PublicInteractionAnnouncementLayer" },
  "a frame cannot take ownership across root frame identities");
  assert.deepEqual(selectPublicH4AnnouncementOwner({
    fact: { ...rootFact, category: "CARD_DISCARDED" },
    discard: { eventId: rootFact.eventId, order: rootFact.order },
  }), { eventId: rootFact.eventId, owner: "PublicDiscardAnnouncementLayer" },
    "an exact physical discard keeps its approved H4 owner when no composite result is attached");
  assert.deepEqual(selectPublicH4AnnouncementOwner({
    fact: { ...rootFact, category: "CARD_DISCARDED", committedOutcome: { eventId: rootFact.eventId } },
    discard: { eventId: rootFact.eventId, order: rootFact.order, materialIds: ["discard-a", "discard-b"] },
  }), { eventId: rootFact.eventId, owner: "PublicDiscardAnnouncementLayer" },
    "a same-event discard with exact public materials uses the richer canonical copy when no matching display frame owns it");
  assert.deepEqual(selectPublicH4AnnouncementOwner({
    fact: { ...rootFact, category: "CARD_DISCARDED", committedOutcome: { eventId: rootFact.eventId } },
    cardDisplay: { enabled: true, rootEventId: "frame-event", interactionId: rootFact.identity.interactionId,
      rootFrameId: rootFact.identity.rootFrameId, causalRootEventId: rootFact.rootEventId,
      discardEventId: rootFact.eventId, discardMaterialIds: ["discard-a", "discard-b"] },
    discard: { eventId: rootFact.eventId, order: rootFact.order, materialIds: ["discard-a", "discard-b"] },
  }), { eventId: rootFact.eventId, owner: "PublicCardDisplay" },
    "a committed discard with its exact frame keeps detail and same-event outcome on one H4 owner");
  assert.deepEqual(selectPublicH4AnnouncementOwner({
    fact: { ...rootFact, category: "CARD_DISCARDED", committedOutcome: { eventId: rootFact.eventId } },
    cardDisplay: { enabled: true, rootEventId: "frame-event", interactionId: rootFact.identity.interactionId,
      rootFrameId: rootFact.identity.rootFrameId, causalRootEventId: rootFact.rootEventId,
      discardEventId: rootFact.eventId, discardMaterialIds: ["discard-b", "discard-a"] },
    discard: { eventId: rootFact.eventId, order: rootFact.order, materialIds: ["discard-a", "discard-b"] },
  }), { eventId: rootFact.eventId, owner: "PublicDiscardAnnouncementLayer" },
    "a display frame with the same event but a different material order cannot own the discard H4");
  assert.deepEqual(selectPublicH4AnnouncementOwner({
    fact: rootFact, discard: { eventId: "later-discard", order: rootFact.order + 1 },
  }), { eventId: "later-discard", owner: "PublicDiscardAnnouncementLayer" },
    "a genuinely later public discard supersedes the older fact");
  assert.deepEqual(selectPublicH4AnnouncementOwner({
    fact: rootFact, factIsActive: true, discard: { eventId: "later-discard", order: rootFact.order + 1 },
  }), { eventId: rootFact.eventId, owner: "PublicInteractionAnnouncementLayer" },
    "a later discard cannot preempt an earlier fact that already owns its queued read turn");
  assert.deepEqual(selectPublicH4AnnouncementOwner({ skillEvent: { eventId: "skill-event" } }), {
    eventId: "skill-event", owner: "PublicSkillEventAnnouncementLayer",
  });

  const withResult = { ...rootFact, committedOutcome: { eventId: rootFact.eventId, changes: [{ kind: "CARD_DRAWN", amount: 2 }] } };
  const merged = uniquePublicH4Facts([rootFact, { ...rootFact, identity: { ...rootFact.identity, checkpointId: "later", presentationRevision: 2 }, committedOutcome: withResult.committedOutcome }]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].committedOutcome, withResult.committedOutcome, "the richer validated public result survives a duplicate checkpoint projection");
  assert.deepEqual(uniquePublicH4Facts([rootFact, { ...rootFact, category: "DAMAGE_APPLIED" }]), [],
    "contradictory facts for one durable event ID fail closed");
  assert.deepEqual(uniquePublicH4Facts([rootFact, { ...rootFact, resolutionId: "other-resolution" }]), [],
    "contradictory resolution identities for one durable event ID fail closed");
});

test("a proven Retaliation settlement owns its exact event and prevents a generic duplicate notice", () => {
  const retaliation = {
    eventId: "retaliation-settlement", semantics: "PROVEN", acquisitionKind: "RETALIATION", outcome: "RETALIATION_RESOLVED",
  };
  assert.equal(publicRetaliationSettlementOwnsEvent(retaliation.eventId, [retaliation]), true);
  assert.equal(publicRetaliationSettlementOwnsEvent("later-independent-event", [retaliation]), false,
    "a later independent public event retains its own H4");
  assert.equal(publicRetaliationSettlementOwnsEvent(retaliation.eventId, [
    retaliation, { ...retaliation },
  ]), false, "ambiguous duplicate proof must fail closed");
  assert.equal(publicRetaliationSettlementOwnsEvent(retaliation.eventId, [
    { ...retaliation, semantics: "UNPROVEN" },
  ]), false, "unproven acquisition facts cannot suppress generic public feedback");
  assert.equal(publicRetaliationSettlementOwnsEvent(retaliation.eventId, [
    { ...retaliation, acquisitionKind: "STEAL", outcome: "STEAL_RESOLVED" },
  ]), false, "existing Steal notice ownership remains unchanged");
});

test("presentation queue keeps validated H4 facts in public order across resolution coalescing", () => {
  const current = [
    { id: "result-1", resolutionId: "resolution-1", importance: "informational" },
    { id: "old-ordinary", resolutionId: "resolution-1", importance: "informational" },
  ];
  const incoming = [
    { id: "result-2", resolutionId: "resolution-2", importance: "informational" },
    { id: "new-ordinary", resolutionId: "resolution-2", importance: "informational" },
  ];
  assert.deepEqual(coalescePresentationQueue(current, incoming, new Set(["result-1", "result-2"])).map(({ id }) => id),
    ["result-1", "result-2", "new-ordinary"],
    "a newer resolution may coalesce ordinary presentation while preserving each admitted public H4 event exactly once");
  assert.deepEqual(coalescePresentationQueue(current, incoming, new Set(["result-1", "result-2"])).map(({ id }) => id),
    ["result-1", "result-2", "new-ordinary"], "reapplying the same poll is idempotent");
  const queuedH4Ids = new Set(["result-1", "result-2"]);
  assert.equal(presentationEventBlocksActions({ id: "result-1", type: "message" }, queuedH4Ids), false,
    "a public result read turn does not disable legal game actions");
  assert.equal(presentationEventBlocksActions({ id: "card-action", type: "card" }, queuedH4Ids), true,
    "existing card journeys retain their action lock");
  assert.equal(presentationEventBlocksActions({ id: "other-message", type: "message" }, queuedH4Ids), true,
    "unvalidated informational messages do not gain the H4 exception");
});

test("a proven Judgement activation is coalesced only when its exact original reveal is queued", () => {
  const activation = { id: "stauchness-activation", type: "message" };
  const original = { id: "stauchness-original", type: "card" };
  const linked = [{ activationEventId: activation.id, originalEventId: original.id }];

  const sameSnapshot = coalesceLinkedJudgementActivationQueue(null, [], [activation, original], linked);
  assert.deepEqual(sameSnapshot.queue.map(({ id }) => id), [original.id]);
  assert.deepEqual(sameSnapshot.incoming.map(({ id }) => id), [original.id]);
  assert.deepEqual(sameSnapshot.retiredActivationEventIds, [activation.id]);

  const splitSnapshot = coalesceLinkedJudgementActivationQueue(activation, [], [original], linked);
  assert.equal(splitSnapshot.activeEvent.id, original.id, "an active redundant activation hands off to the exact original reveal");
  assert.deepEqual(splitSnapshot.queue, []);

  const alreadyQueuedOriginal = coalesceLinkedJudgementActivationQueue(activation, [original], [], linked);
  assert.equal(alreadyQueuedOriginal.activeEvent.id, original.id, "a newly validated link also hands off when the reveal is already queued");
  assert.deepEqual(alreadyQueuedOriginal.queue, []);
  assert.deepEqual(alreadyQueuedOriginal.incoming, []);

  const withIndependentEvent = coalesceLinkedJudgementActivationQueue(activation,
    [{ id: "independent", type: "card" }], [original], linked);
  assert.equal(withIndependentEvent.activeEvent.id, "independent", "intervening committed events keep their order");
  assert.deepEqual(withIndependentEvent.queue.map(({ id }) => id), [original.id]);

  const missingProof = coalesceLinkedJudgementActivationQueue(activation, [], [original], []);
  assert.equal(missingProof.activeEvent.id, activation.id, "without an exact projected link the ordinary activation stays visible");
  assert.equal(missingProof.queue[0].id, original.id);
});

test("H4 cursor selection never jumps ahead of the event currently being presented", () => {
  const facts = [
    { eventId: "fact-1", order: 11 },
    { eventId: "fact-2", order: 14 },
    { eventId: "fact-3", order: 19 },
  ];
  assert.deepEqual(publicH4FactAtPresentationCursor(facts, { id: "fact-2", publicSequence: 14 }), {
    fact: facts[1], isExactCursorFact: true,
  });
  assert.deepEqual(publicH4FactAtPresentationCursor(facts, { id: "ordinary-15", publicSequence: 15 }), {
    fact: facts[1], isExactCursorFact: false,
  }, "an ordinary event retains the latest earlier public fact, never the later fact-3 result");
  assert.deepEqual(publicH4FactAtPresentationCursor(facts, { id: "ordinary-10", publicSequence: 10 }), {
    fact: null, isExactCursorFact: false,
  }, "an event before the first outcome cannot show a future H4 result");
  assert.deepEqual(publicH4FactAtPresentationCursor(facts, null), {
    fact: facts[2], isExactCursorFact: false,
  }, "a fresh or restored view presents the latest retained committed fact");
});

test("Judgement H4 selects one owner, with the replacement frame claiming only its exact stage", () => {
  const original = {
    semantics: "PROVEN", visibility: "PUBLIC", judgementId: "judgement-1", eventId: "judgement-1", order: 10,
    phase: "ORIGINAL", status: "PROVISIONAL",
  };
  const replacement = {
    ...original, eventId: "replacement-1", order: 11, phase: "REPLACEMENT", status: "FINAL",
  };
  assert.deepEqual(selectPublicH4AnnouncementOwner({ judgement: {
    presentation: original, isActive: true, replacementFrameMatches: false,
  } }), { eventId: "judgement-1", owner: "PublicInteractionAnnouncementLayer" });
  assert.deepEqual(selectPublicH4AnnouncementOwner({ judgement: {
    presentation: replacement, isActive: true, replacementFrameMatches: true,
  } }), { eventId: "replacement-1", owner: "PublicCardDisplay" });
  assert.deepEqual(selectPublicH4AnnouncementOwner({ judgement: {
    presentation: replacement, isActive: true, replacementFrameMatches: false,
  } }), { eventId: "replacement-1", owner: "PublicInteractionAnnouncementLayer" });
  assert.deepEqual(selectPublicH4AnnouncementOwner({
    fact: fact("stauchness-judgement-result", 12, "judgement-1", "target-1", {
      resolutionId: "judgement-resolution", effect: { kind: "judgement", label: "Stauchness" },
    }),
    judgement: {
      presentation: { ...replacement, resolutionId: "judgement-resolution" },
      isActive: false, replacementFrameMatches: true,
    },
  }), { eventId: "stauchness-judgement-result", owner: "PublicInteractionAnnouncementLayer" },
  "a later committed event advances H4 by event order instead of resolution-wide override");
  assert.deepEqual(selectPublicH4AnnouncementOwner({
    fact: fact("stauchness-consequence", 13, "judgement-1", "source-1", {
      resolutionId: "judgement-resolution", effect: { kind: "skill_result", label: "Stauchness" },
    }),
    judgement: {
      presentation: { ...replacement, resolutionId: "judgement-resolution" },
      isActive: false, replacementFrameMatches: true,
    },
  }), { eventId: "stauchness-consequence", owner: "PublicInteractionAnnouncementLayer" },
  "a later committed non-Judgement consequence may advance H4 normally");
  assert.deepEqual(selectPublicH4AnnouncementOwner({ judgement: {
    presentation: replacement, isActive: false, replacementFrameMatches: false,
  }, discard: { eventId: "later-discard", order: 12 } }), {
    eventId: "later-discard", owner: "PublicDiscardAnnouncementLayer",
  });
  assert.deepEqual(selectPublicH4AnnouncementOwner({ judgement: {
    presentation: replacement, isActive: true, replacementFrameMatches: false,
  }, discard: { eventId: "later-discard", order: 12 } }), {
    eventId: "replacement-1", owner: "PublicInteractionAnnouncementLayer",
  }, "a later queued discard does not preempt the currently read Judgement stage");
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
    { eventId: "root-event", physicalCardId: "root-card", owner: "PriorRenderer" },
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
    existingOwners: [{ eventId: "equip-event", physicalCardId: cardId, owner: "PriorRenderer" }],
    candidate: { kind: "zone-transition", mode: "active", interactionId: "equip-interaction", rootFrameId: "equip-frame", rootEventId: "equip-event", transitionId: "equip-event", eventId: "equip-event", physicalCardId: cardId, ownerId: "actor-1", destination: "EQUIPMENT", slot: "weapon" },
  };
  const equip = routePublicPresentation(equipInput);
  assert.equal(equip.kind, "zone-transition");
  assert.equal(equip.claimedBy, "PublicCardDisplay");
  assert.deepEqual(equip.shadowComparison, { status: "mismatch", currentOwners: ["PriorRenderer"] });

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

test("uncommitted/private candidate has no public physical-card route", () => {
  const input = journeyInput();
  input.candidate = { kind: "private-pending" };
  assert.deepEqual(routePublicPresentation(input), { kind: "no-public-card-action", reason: "private-or-uncommitted" });
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
