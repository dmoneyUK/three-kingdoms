import assert from "node:assert/strict";
import test from "node:test";
import { isM3JudgementTransitionEvent, routePublicJudgementTransition } from "../app/public-judgement-transition.ts";

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
