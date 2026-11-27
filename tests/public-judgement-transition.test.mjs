import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isM3JudgementTransitionEvent, publicCardRevealCompletionFromCommittedEvent, publicJudgementReplacementOwnsActiveTimer, publicJudgementReplacementRevealCompletion, publicJudgementTransitionUsesCompletedPriorReveal, publicJudgementTransitionUsesExistingRevealOwner, routePublicJudgementReveal, routePublicJudgementTransition } from "../app/public-judgement-transition.ts";

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
  assert.ok(routePublicJudgementReveal({ ...base, existingOwners: [{ eventId: "other-event", physicalCardId: event.card.id, owner: "PublicCardDisplay" }] }),
    "a reused physical card under a different event does not claim this reveal");
  assert.equal(routePublicJudgementReveal({ ...base, existingOwners: [{ eventId: event.id, physicalCardId: event.card.id, owner: "PublicCardDisplay" }] }), null,
    "the exact selected renderer owner suppresses the duplicate standalone route");
  assert.ok(routePublicJudgementReveal({ ...base, existingOwners: [{ eventId: event.id, physicalCardId: event.card.id, owner: "PublicPhysicalCardTransition" }] }),
    "a different renderer does not claim the original reveal");
  const completion = { owner: "PublicCardDisplay", roomCode: "ROOM", viewerId: "viewer-1", sourceEventId: event.id, physicalCardId: event.card.id };
  assert.equal(routePublicJudgementReveal({ ...base, completedReveals: [completion] }), null,
    "the exact real-render completion suppresses a duplicate reveal");
  assert.ok(routePublicJudgementReveal({ ...base, completedReveals: [{ ...completion, viewerId: "viewer-2" }] }),
    "another viewer's completion cannot suppress this viewer's reveal");
  assert.equal(routePublicJudgementReveal({ ...base, timeline: [{ ...event, card: { ...event.card, id: "different-physical-card" } }] }), null);
  assert.equal(routePublicJudgementReveal({ ...base, timeline: [event, { ...event, id: "duplicate-event" }] }), null);
});

test("verified replacement holds its exact active cursor until its own visible reveal completes", () => {
  const identity = { hasVerifiedCandidate: true, activeEventId: "replacement-event",
    replacementEventId: "replacement-event", selectedActionEventId: "replacement-event" };
  assert.equal(publicJudgementReplacementOwnsActiveTimer(identity), true);
  assert.equal(publicJudgementReplacementOwnsActiveTimer({ ...identity, activeEventId: "other-event" }), false);
  assert.equal(publicJudgementReplacementOwnsActiveTimer({ ...identity, hasVerifiedCandidate: false }), false);
  assert.equal(publicJudgementReplacementOwnsActiveTimer({ ...identity, selectedActionEventId: "other-event" }), false);

  const completion = { owner: "PublicCardDisplay", roomCode: "ROOM", viewerId: "viewer-1",
    sourceEventId: "replacement-event", physicalCardId: "replacement-card" };
  assert.deepEqual(publicJudgementReplacementRevealCompletion({ completions: [completion], roomCode: "ROOM",
    viewerId: "viewer-1", eventId: "replacement-event", physicalCardId: "replacement-card" }), completion);
  assert.equal(publicJudgementReplacementRevealCompletion({ completions: [completion], roomCode: "ROOM",
    viewerId: "viewer-2", eventId: "replacement-event", physicalCardId: "replacement-card" }), null);
  assert.equal(publicJudgementReplacementRevealCompletion({ completions: [completion], roomCode: "ROOM",
    viewerId: "viewer-1", eventId: "other-event", physicalCardId: "replacement-card" }), null);
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

test("only this viewer's completed public source-card reveal suppresses its matching HAND-to-JUDGEMENT centre reveal", () => {
  const input = setup({ from: { zone: "HAND", ownerId }, to: { zone: "JUDGEMENT", ownerId: targetId } });
  const routeResult = route(input);
  const completion = publicCardRevealCompletionFromCommittedEvent({
    roomCode: "ROOM", viewerId: "viewer-1", sourceEventId: input.source.id,
    physicalCardId: card.id, timeline: input.timeline,
  });
  assert.equal(completion?.owner, "PublicCardDisplay");
  assert.equal(publicJudgementTransitionUsesCompletedPriorReveal(routeResult, completion), true);
  assert.equal(publicJudgementTransitionUsesCompletedPriorReveal(routeResult, null), false, "cold viewers retain one full-size read");
  assert.equal(publicJudgementTransitionUsesCompletedPriorReveal(routeResult, { ...completion, roomCode: "OTHER" }), false);
  assert.equal(publicJudgementTransitionUsesCompletedPriorReveal(routeResult, { ...completion, viewerId: "viewer-2" }), false);
  assert.equal(publicJudgementTransitionUsesCompletedPriorReveal(routeResult, { ...completion, sourceEventId: "another-event" }), false);
  assert.equal(publicJudgementTransitionUsesCompletedPriorReveal(routeResult, { ...completion, physicalCardId: "another-card" }), false);
  const deckReveal = route(setup({ from: { zone: "DECK", ownerId: null }, to: { zone: "DISCARD", ownerId: null }, sourceAction: "reveal" }));
  assert.equal(publicJudgementTransitionUsesCompletedPriorReveal(deckReveal, completion), false, "a distinct later Deck Judgement keeps its own reveal");
  const judgementDiscard = route(setup({ from: { zone: "JUDGEMENT", ownerId: targetId }, to: { zone: "DISCARD", ownerId: null }, sourceAction: "activate" }));
  assert.equal(publicJudgementTransitionUsesCompletedPriorReveal(judgementDiscard, completion), false, "JUDGEMENT-to-DISCARD keeps its own terminal presentation");
});

test("a reveal completion record requires one exact committed public source CardFace", () => {
  const input = setup({ from: { zone: "HAND", ownerId }, to: { zone: "JUDGEMENT", ownerId: targetId } });
  const valid = { roomCode: "ROOM", viewerId: "viewer-1", sourceEventId: input.source.id, physicalCardId: card.id, timeline: input.timeline };
  assert.ok(publicCardRevealCompletionFromCommittedEvent(valid));
  assert.equal(publicCardRevealCompletionFromCommittedEvent({ ...valid, physicalCardId: "different-card" }), null);
  assert.equal(publicCardRevealCompletionFromCommittedEvent({ ...valid, timeline: [...input.timeline, input.source] }), null, "duplicate event IDs are ambiguous");
  assert.equal(publicCardRevealCompletionFromCommittedEvent({ ...valid, timeline: [{ ...input.source, presentation: false }, input.event] }), null);
  assert.equal(publicCardRevealCompletionFromCommittedEvent({ ...valid, timeline: [{ ...input.source, privateToPlayerId: "viewer-1" }, input.event] }), null);
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

test("static Judgement and its zone-flight hold share the measured H4-safe centre", () => {
  const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const sequenceStyleSource = readFileSync(new URL("../app/sequence-overrides.css", import.meta.url), "utf8");
  const transitionSource = pageSource.slice(
    pageSource.indexOf("function PublicJudgementCardTransition"),
    pageSource.indexOf("const PUBLIC_RESULT_PROTECTED_SELECTORS"),
  );

  assert.match(pageSource, /function measurePublicJudgementSafeCentre\(table: HTMLElement, reveal: HTMLElement\)[\s\S]*?h4SafeBattlefieldCardRect\(\{ width: face\.offsetWidth, height: face\.offsetHeight \}\)/);
  assert.match(pageSource, /function PublicJudgementOriginalReveal[\s\S]*?observePublicJudgementSafeCentre\(table, reveal\)/);
  assert.match(transitionSource, /arrivingInJudgement\s*\?\s*observePublicJudgementSafeCentre\(table, reveal\)/);
  assert.match(sequenceStyleSource, /\.active-table-reveal\.public-judgement-original-reveal\s*\{\s*left: var\(--judgement-center-x, 50%\);\s*top: var\(--judgement-center-y, 50%\);/);
  assert.match(sequenceStyleSource, /@keyframes judgementCardToZone\s*\{[\s\S]*?0% \{ left: var\(--origin-x, 50%\);[\s\S]*?10%, 85% \{ left: var\(--public-reveal-x, 50%\); top: var\(--public-reveal-y, 50%\);[\s\S]*?100% \{ left: var\(--judgement-x, 50%\);/);
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

  const wrongAuthor = setup({ from: { zone: "HAND", ownerId }, to: { zone: "JUDGEMENT", ownerId: targetId } });
  wrongAuthor.event.publicZoneTransition.from.ownerId = "player-3";
  assert.deepEqual(route(wrongAuthor), { kind: "blocked-invalid-proof", reason: "timeline-proof-mismatch" });

  const wrongRecipient = setup({ from: { zone: "HAND", ownerId }, to: { zone: "JUDGEMENT", ownerId: targetId } });
  wrongRecipient.event.publicZoneTransition.to.ownerId = "player-3";
  assert.deepEqual(route(wrongRecipient), { kind: "blocked-invalid-proof", reason: "timeline-proof-mismatch" });

  const replayed = setup({ from: { zone: "HAND", ownerId }, to: { zone: "JUDGEMENT", ownerId: targetId } });
  assert.deepEqual(routePublicJudgementTransition({ ...replayed, roomCode: "ROOM", viewerId: "viewer-1", retiredTransitionIds: [replayed.event.id] }), {
    kind: "no-public-card-action", reason: "replayed-transition",
  });
});
