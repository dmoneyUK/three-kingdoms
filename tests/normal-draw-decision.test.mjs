import assert from "node:assert/strict";
import test from "node:test";
import {
  beginAutomaticDrawAttempt,
  createAutomaticDrawAttempt,
  isNormalDrawH4Message,
  normalDrawDecisionIdentity,
  normalDrawQueuedH4DisplayDuration,
  normalDrawPresentationView,
  normalDrawPresentationBatch,
  normalDrawPrivateCardIds,
  normalDrawStageEventId,
  prepareAutomaticDrawAttempt,
  reconcileAutomaticDrawAttempt,
  sameNormalDrawDecision,
} from "../game/normal-draw-decision.js";

const snapshot = {
  roomCode: "ABCDE",
  viewerId: "player-1",
  actionRevision: "revision-10",
  turnSeat: 2,
  phase: "draw",
  status: "playing",
  isMyTurn: true,
  isMyAction: true,
  actorId: "player-1",
  canDraw: true,
};

test("normal Draw authorization is keyed by the viewer's fresh server decision, not presentation backlog", () => {
  const identity = normalDrawDecisionIdentity({ ...snapshot, activeEvent: "old-card", queuedEvents: ["old-h4"] });
  assert.ok(identity);
  assert.equal(sameNormalDrawDecision(identity, { ...snapshot, activeEvent: null, queuedEvents: [] }), true);
  assert.equal(sameNormalDrawDecision(identity, { ...snapshot, actionRevision: "revision-11" }), false);
});

test("automatic normal Draw fails closed outside the current viewer-owned draw decision", () => {
  for (const changes of [
    { isMyTurn: false },
    { isMyAction: false },
    { actorId: "player-2" },
    { canDraw: false },
    { phase: "response" },
    { status: "finished" },
    { actionRevision: "" },
  ]) assert.equal(normalDrawDecisionIdentity({ ...snapshot, ...changes }), null);
});

test("automatic Draw recovers only from a fresh matching decision and stops after one bounded retry", () => {
  const identity = normalDrawDecisionIdentity(snapshot);
  const attempt = createAutomaticDrawAttempt(identity);
  assert.deepEqual(prepareAutomaticDrawAttempt(attempt, {
    identity, busy: false, serverNow: 1_000, initialDelayMs: 100, retryDelayMs: 250,
  }), { delayMs: 100 });
  assert.equal(beginAutomaticDrawAttempt(attempt, { identity, busy: false, serverNow: 1_000 }), true);

  reconcileAutomaticDrawAttempt(attempt, { identity: null, freshSnapshot: false, serverNow: 0 });
  assert.equal(attempt.phase, "awaiting", "an unavailable refresh does not claim success or immediately replay");
  assert.equal(prepareAutomaticDrawAttempt(attempt, {
    identity, busy: false, serverNow: 1_000, initialDelayMs: 100, retryDelayMs: 250,
  }), null, "retry waits for a newer authoritative polling snapshot");
  assert.deepEqual(prepareAutomaticDrawAttempt(attempt, {
    identity, busy: false, serverNow: 1_001, initialDelayMs: 100, retryDelayMs: 250,
  }), { delayMs: 250 });
  assert.equal(beginAutomaticDrawAttempt(attempt, { identity, busy: false, serverNow: 1_001 }), true);
  assert.equal(attempt.requests, 2);

  reconcileAutomaticDrawAttempt(attempt, { identity, freshSnapshot: true, serverNow: 1_002 });
  assert.equal(attempt.phase, "exhausted", "same authorization after the bounded retry cannot loop");
  assert.equal(prepareAutomaticDrawAttempt(attempt, {
    identity, busy: false, serverNow: 1_003, initialDelayMs: 100, retryDelayMs: 250,
  }), null);
});

test("busy or stale timer callbacks cannot send a Draw request", () => {
  const identity = normalDrawDecisionIdentity(snapshot);
  const attempt = createAutomaticDrawAttempt(identity);
  prepareAutomaticDrawAttempt(attempt, { identity, busy: false, serverNow: 1_000, initialDelayMs: 100, retryDelayMs: 250 });
  assert.equal(beginAutomaticDrawAttempt(attempt, { identity, busy: true, serverNow: 1_000 }), false);
  assert.equal(attempt.requests, 0);
  prepareAutomaticDrawAttempt(attempt, { identity, busy: false, serverNow: 1_001, initialDelayMs: 100, retryDelayMs: 250 });
  assert.equal(beginAutomaticDrawAttempt(attempt, {
    identity: normalDrawDecisionIdentity({ ...snapshot, actionRevision: "revision-11" }),
    busy: false,
    serverNow: 1_002,
  }), false);
  assert.equal(attempt.phase, "done");
  assert.equal(attempt.requests, 0);
});

test("private faces synchronize only with the exact public Draw Phase result and recipient", () => {
  const card = { id: "private-physical-card", kind: "Dodge" };
  const transfer = {
    transferId: "private-transfer",
    cardId: card.id,
    rootEventId: "normal-draw-event",
    sourceZone: "deck",
    recipientId: "player-1",
    revealUntil: 12_000,
  };
  const event = { id: "normal-draw-event", type: "message", presentation: true, drawPlayerId: "player-1", publicSequence: 14 };
  const fact = {
    semantics: "PROVEN",
    visibility: "PUBLIC",
    eventId: "normal-draw-event",
    order: 14,
    effect: { kind: "draw_phase" },
    committedOutcome: {
      source: { kind: "phase", label: "Draw Phase" },
      changes: [{ kind: "CARD_DRAWN", playerId: "player-1", amount: 1 }],
    },
  };
  assert.deepEqual(normalDrawPresentationBatch({
    viewerId: "player-1", transfers: [transfer], cards: [card], events: [event], publicFacts: [fact, fact],
  }), { eventId: "normal-draw-event", cards: [card], transferIds: ["private-transfer"], expiresAt: 12_000 });
  assert.equal(normalDrawPresentationBatch({ viewerId: "player-2", transfers: [transfer], cards: [card], events: [event], publicFacts: [fact] }), null);
  assert.equal(normalDrawPresentationBatch({ viewerId: "player-1", transfers: [transfer], cards: [card], events: [{ ...event, id: "other" }], publicFacts: [fact] }), null);
  assert.equal(normalDrawPresentationBatch({ viewerId: "player-1", transfers: [transfer], cards: [], events: [event], publicFacts: [fact] }), null);
  assert.equal(normalDrawPresentationBatch({ viewerId: "player-1", transfers: [transfer], cards: [card], events: [{ ...event, publicSequence: 15 }], publicFacts: [fact] }), null);
  assert.equal(normalDrawPresentationBatch({ viewerId: "player-1", transfers: [{ ...transfer, initialDeal: true }], cards: [card], events: [event], publicFacts: [fact] }), null);
});

test("normal Draw stage is scoped to its viewer and committed H4 cursor, then remains visible for its bounded presentation", () => {
  const state = {
    roomCode: "ABCDE",
    viewerId: "player-1",
    eventId: "draw-event",
    cards: [{ id: "private-card" }],
    transferIds: ["private-transfer"],
    expiresAtWallMs: 5_000,
    visibleSinceMs: null,
  };
  const base = {
    state, roomCode: "ABCDE", viewerId: "player-1", activeEventId: null,
    queuedEventId: "draw-event", fallbackCards: [], hasActiveEvent: false,
    queuedEventCount: 0, now: 1_000,
  };
  assert.deepEqual(normalDrawPresentationView(base), {
    visible: true, cards: state.cards, stageVisible: true,
  });
  assert.equal(normalDrawPresentationView({ ...base, queuedEventId: "prior-passive-event" }).visible, false);
  assert.equal(normalDrawPresentationView({ ...base, viewerId: "player-2" }).visible, false);
  assert.equal(normalDrawPresentationView({ ...base, now: 5_001 }).visible, false);
  assert.deepEqual(normalDrawPresentationView({
    ...base,
    state: { ...state, visibleSinceMs: 900 },
    queuedEventId: "later-event",
    now: 5_001,
  }), { visible: true, cards: state.cards, stageVisible: true });
  assert.deepEqual(normalDrawPrivateCardIds(state, "ABCDE", "player-1"), ["private-card"]);
  assert.deepEqual(normalDrawPrivateCardIds(state, "ABCDE", "player-2"), []);
  assert.equal(isNormalDrawH4Message({ type: "message", id: "draw-event" }, state), true);
  assert.equal(isNormalDrawH4Message({ type: "card", id: "draw-event" }, state), false);
  assert.equal(normalDrawQueuedH4DisplayDuration({ type: "message", id: "draw-event" }, true, state, 3_000, 2_400), 3_000);
  assert.equal(normalDrawQueuedH4DisplayDuration({ type: "message", id: "other-event" }, true, state, 3_000, 2_400), 2_400);
  assert.equal(normalDrawQueuedH4DisplayDuration({ type: "message", id: "draw-event" }, false, state, 3_000, 2_400), 0);
  assert.equal(normalDrawStageEventId(true, state), "draw-event");
  assert.equal(normalDrawStageEventId(false, state), undefined);
});
