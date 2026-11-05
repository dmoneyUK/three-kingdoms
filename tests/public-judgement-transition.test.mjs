import assert from "node:assert/strict";
import test from "node:test";
import { isM3JudgementTransitionEvent, publicJudgementTransitionUsesExistingRevealOwner, routePublicJudgementReveal, routePublicJudgementTransition } from "../app/public-judgement-transition.ts";

const card = { id: "physical-delayed-card", kind: "Overindulgence", rank: "4", suit: "♥" };
const ownerId = "player-1";
const targetId = "player-2";

function setup({ from, to, sourceAction = "play", privateSource = false, rootEventId = "source-event", eventId = "transition-event" }) {
  const identity = { interactionId: "judgement-interaction", rootFrameId: "judgement-frame", checkpointId: "settled", presentationRevision: 2 };
  const fact = {
    semantics: "PROVEN", visibility: "PUBLIC", identity, eventId, order: 12, rootEventId,
    category: "STAGE_COMPLETED", actorId: ownerId, affectedPlayerIds: [to.ownerId ?? targetId],
  };
  const source = { id: "source-event", type: "card", action: sourceAction, card, player: "Test Player 1", presentation: true, publicSequence: 3,
    ...(privateSource ? { privateToPlayerId: ownerId } : {}) };
  const event = {
    id: eventId, type: "message", message: "A public Judgement card moves.", actorId: ownerId,
    publicSequence: 12, presentation: true, publicFact: { semantics: "PROVEN", visibility: "PUBLIC", category: "STAGE_COMPLETED", actorId: ownerId, rootEventId, interactionId: identity.interactionId },
    publicZoneTransition: { semantics: "PROVEN", visibility: "PUBLIC", eventId, sourceEventId: "source-event", rootEventId,
      physicalCardId: card.id, from, to },
  };
  const snapshot = {
    identity: null,
    stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
    interaction: null,
    publicEventFacts: [],
    retainedPublicEvent: fact,
    retainedPublicEventFacts: [fact],
  };
  const clientView = { hasInteraction: false, interactionId: null, checkpointId: null, presentationRevision: null, rootFrameId: null, stage: "REST", stableKind: "REST" };
  return { event, source, timeline: [source, event], snapshot, clientView };
}

function route(input) {
  return routePublicJudgementTransition({
    ...input, roomCode: "ROOM", viewerId: "viewer-1",
  });
}

function originalReveal({ privateToPlayerId, presentation = true } = {}) {
  return {
    id: "original-judgement-reveal", type: "card", action: "reveal", judgement: true,
    presentation, publicSequence: 9, resolutionId: "judgement-resolution",
    card: { id: "physical-drawn-judgement", kind: "Dodge", rank: "7", suit: "♠" },
    ...(privateToPlayerId ? { privateToPlayerId } : {}),
  };
}

test("a committed public original Judgement reveal has one scoped physical-card owner", () => {
  const event = originalReveal();
  const timeline = [event];
  const first = routePublicJudgementReveal({ event, timeline, roomCode: "ROOM", viewerId: "viewer-1" });
  const switchedViewer = routePublicJudgementReveal({ event, timeline, roomCode: "ROOM", viewerId: "viewer-2" });
  assert.deepEqual(first, {
    kind: "judgement-reveal", claimedBy: "PublicJudgementCardReveal",
    claimId: ["ROOM", "public-judgement-reveal", event.id, event.card.id].join("\u001f"),
    scope: { roomCode: "ROOM", viewerId: "viewer-1", generation: "ROOM:viewer-1" },
    eventId: event.id, physicalCardId: event.card.id, publicSequence: 9,
  });
  assert.equal(switchedViewer.physicalCardId, first.physicalCardId);
  assert.notEqual(switchedViewer.scope.generation, first.scope.generation);
});

test("private, uncommitted, mismatched, replayed, or already-owned Judgement reveals fail closed", () => {
  const event = originalReveal();
  const base = { event, timeline: [event], roomCode: "ROOM", viewerId: "viewer-1" };
  assert.equal(routePublicJudgementReveal({ ...base, event: originalReveal({ privateToPlayerId: "viewer-1" }), timeline: [originalReveal({ privateToPlayerId: "viewer-1" })] }), null);
  assert.equal(routePublicJudgementReveal({ ...base, event: originalReveal({ presentation: false }), timeline: [originalReveal({ presentation: false })] }), null);
  assert.equal(routePublicJudgementReveal({ ...base, retiredEventIds: [event.id] }), null);
  assert.equal(routePublicJudgementReveal({ ...base, existingOwners: [{ eventId: "other-event", physicalCardId: event.card.id, owner: "PublicCardDisplay" }] }), null);
  assert.ok(routePublicJudgementReveal({ ...base, existingOwners: [{ eventId: event.id, physicalCardId: "other-card", owner: "PublicPhysicalCardTransition" }] }),
    "a shared causal root cannot suppress a distinct physical reveal card");
  assert.equal(routePublicJudgementReveal({ ...base, timeline: [{ ...event, card: { ...event.card, id: "different-physical-card" } }] }), null);
  assert.equal(routePublicJudgementReveal({ ...base, timeline: [event, { ...event, id: "duplicate-event" }] }), null);
});

test("committed delayed-card attachment routes the exact real card into the recipient Judgement slot", () => {
  const input = setup({ from: { zone: "HAND", ownerId }, to: { zone: "JUDGEMENT", ownerId: targetId } });
  const result = route(input);
  assert.equal(isM3JudgementTransitionEvent(input.event), true);
  assert.equal(result.kind, "zone-transition");
  assert.equal(result.physicalCardId, card.id);
  assert.equal(result.sourceEventId, input.source.id);
  assert.equal(result.destination, "JUDGEMENT");
  assert.equal(result.ownerId, targetId);
});

test("later Judgement settlement routes from the real Judgement owner to public Discard", () => {
  const input = setup({ from: { zone: "JUDGEMENT", ownerId: targetId }, to: { zone: "DISCARD", ownerId: null }, sourceAction: "activate" });
  const result = route(input);
  assert.equal(result.kind, "zone-transition");
  assert.equal(result.destination, "DISCARD");
  assert.deepEqual(result.from, { zone: "JUDGEMENT", ownerId: targetId });
});

test("a Deck-to-Discard judgement movement reuses the original reveal owner; delayed card still animates", () => {
  const revealedCard = setup({ from: { zone: "DECK", ownerId: null }, to: { zone: "DISCARD", ownerId: null }, sourceAction: "reveal" });
  const revealRoute = route(revealedCard);
  assert.equal(publicJudgementTransitionUsesExistingRevealOwner(revealRoute), true);

  const delayedCard = setup({ from: { zone: "JUDGEMENT", ownerId: targetId }, to: { zone: "DISCARD", ownerId: null }, sourceAction: "activate" });
  const delayedRoute = route(delayedCard);
  assert.equal(publicJudgementTransitionUsesExistingRevealOwner(delayedRoute), false);
});

test("cancelled placement and private, mismatched, or replayed proof never create a public card route", () => {
  const cancelled = setup({ from: { zone: "HAND", ownerId }, to: { zone: "DISCARD", ownerId: null } });
  delete cancelled.event.publicZoneTransition;
  assert.equal(isM3JudgementTransitionEvent(cancelled.event), false);
  assert.equal(route(cancelled), null);

  const hidden = setup({ from: { zone: "HAND", ownerId }, to: { zone: "JUDGEMENT", ownerId: targetId }, privateSource: true });
  assert.deepEqual(route(hidden), { kind: "blocked-invalid-proof", reason: "timeline-proof-mismatch" });

  const mismatched = setup({ from: { zone: "HAND", ownerId }, to: { zone: "JUDGEMENT", ownerId: targetId } });
  mismatched.event.publicZoneTransition.physicalCardId = "another-card";
  assert.deepEqual(route(mismatched), { kind: "blocked-invalid-proof", reason: "timeline-proof-mismatch" });

  const replayed = setup({ from: { zone: "HAND", ownerId }, to: { zone: "JUDGEMENT", ownerId: targetId } });
  assert.deepEqual(routePublicJudgementTransition({ ...replayed, roomCode: "ROOM", viewerId: "viewer-1", retiredTransitionIds: [replayed.event.id] }), {
    kind: "no-public-card-action", reason: "replayed-transition",
  });
});
