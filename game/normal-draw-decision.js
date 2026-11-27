/**
 * A normal automatic Draw is keyed only by the server's current decision
 * identity. Presentation events, their order, and local animation state are
 * deliberately absent from this identity.
 */
export function normalDrawDecisionIdentity({
  roomCode,
  viewerId,
  actionRevision,
  turnSeat,
  phase,
  status,
  isMyTurn,
  isMyAction,
  actorId,
  canDraw,
}) {
  if (status !== "playing" || typeof phase !== "string" || !phase.startsWith("draw")
    || isMyTurn !== true || isMyAction !== true || actorId !== viewerId || canDraw !== true
    || typeof roomCode !== "string" || !roomCode || typeof viewerId !== "string" || !viewerId
    || typeof actionRevision !== "string" || !actionRevision || !Number.isSafeInteger(turnSeat)) return null;
  return JSON.stringify([roomCode, viewerId, actionRevision, turnSeat, phase]);
}

export function sameNormalDrawDecision(identity, snapshot) {
  return Boolean(identity && normalDrawDecisionIdentity(snapshot) === identity);
}

export function createAutomaticDrawAttempt(identity) {
  if (!identity) return null;
  return {
    identity,
    phase: "idle",
    requests: 0,
    lastAttemptServerNow: 0,
    revalidatedServerNow: 0,
  };
}

/** Schedule one attempt only while the same server-owned Draw decision is current. */
export function prepareAutomaticDrawAttempt(attempt, {
  identity,
  busy,
  serverNow,
  initialDelayMs,
  retryDelayMs,
}) {
  if (!attempt || attempt.identity !== identity) {
    if (attempt) attempt.phase = "done";
    return null;
  }
  if (busy || ["sending", "done", "exhausted", "scheduled"].includes(attempt.phase)) return null;
  if (attempt.requests >= 2) {
    attempt.phase = "exhausted";
    return null;
  }
  if (attempt.phase === "awaiting") {
    if (!Number.isSafeInteger(serverNow) || serverNow <= attempt.lastAttemptServerNow) return null;
    attempt.phase = "retry-ready";
    attempt.revalidatedServerNow = serverNow;
  }
  if (attempt.requests > 0 && attempt.phase !== "retry-ready") return null;
  attempt.phase = "scheduled";
  return { delayMs: attempt.requests === 0 ? initialDelayMs : retryDelayMs };
}

/** Recheck the live authorization at timer fire before making the server call. */
export function beginAutomaticDrawAttempt(attempt, { identity, busy, serverNow }) {
  if (!attempt || attempt.phase !== "scheduled") return false;
  if (attempt.identity !== identity) {
    attempt.phase = "done";
    return false;
  }
  if (busy) {
    attempt.phase = attempt.requests === 0 ? "idle" : "awaiting";
    return false;
  }
  if (!Number.isSafeInteger(serverNow)
    || attempt.requests > 0 && serverNow < attempt.revalidatedServerNow) {
    attempt.phase = "awaiting";
    return false;
  }
  attempt.phase = "sending";
  attempt.requests += 1;
  attempt.lastAttemptServerNow = serverNow;
  return true;
}

/** A returned boolean is not proof of commit; only a fresh same decision permits retry. */
export function reconcileAutomaticDrawAttempt(attempt, { identity, freshSnapshot, serverNow }) {
  if (!attempt || attempt.phase !== "sending") return;
  if (!freshSnapshot) {
    attempt.phase = "awaiting";
    return;
  }
  if (attempt.identity !== identity) {
    attempt.phase = "done";
    return;
  }
  if (attempt.requests >= 2) {
    attempt.phase = "exhausted";
    return;
  }
  attempt.phase = identity ? "retry-ready" : "awaiting";
  if (attempt.phase === "retry-ready" && Number.isSafeInteger(serverNow)) {
    attempt.revalidatedServerNow = serverNow;
  }
}

export function isNormalDrawH4Message(event, presentation) {
  return Boolean(event?.type === "message" && presentation && event.id === presentation.eventId);
}

export function normalDrawQueuedH4DisplayDuration(event, isQueuedPublicH4, presentation, normalDrawMs, otherMessageMs) {
  if (!isQueuedPublicH4 || event?.type !== "message") return 0;
  return isNormalDrawH4Message(event, presentation) ? normalDrawMs : otherMessageMs;
}

export function normalDrawStageEventId(visible, presentation) {
  return visible ? presentation?.eventId : undefined;
}

/** Resolves the already-proven private draw stage without changing its owner or expiry. */
export function normalDrawPresentationView({
  state,
  roomCode,
  viewerId,
  activeEventId,
  queuedEventId,
  fallbackCards,
  hasActiveEvent,
  queuedEventCount,
  now,
}) {
  const cursorEventId = activeEventId ?? queuedEventId ?? "";
  const scopeMatches = Boolean(state && state.roomCode === roomCode && state.viewerId === viewerId);
  const cursorMatches = scopeMatches && state.eventId === cursorEventId;
  const proofStillFresh = Boolean(state
    && (state.visibleSinceMs !== null || now < state.expiresAtWallMs));
  const visible = Boolean(scopeMatches && proofStillFresh
    && (state.visibleSinceMs !== null || cursorMatches));
  const stageVisible = visible
    || fallbackCards.length > 0 && !hasActiveEvent && queuedEventCount === 0;
  return { visible, cards: visible ? state.cards : fallbackCards, stageVisible };
}

export function normalDrawPrivateCardIds(state, roomCode, viewerId) {
  return state?.roomCode === roomCode && state.viewerId === viewerId
    ? state.cards.map((card) => card.id)
    : [];
}

/** Links recipient-private physical arrivals to one committed normal Draw H4. */
export function normalDrawPresentationBatch({ viewerId, transfers, cards, events, publicFacts }) {
  if (typeof viewerId !== "string" || !viewerId || !Array.isArray(transfers)
    || !Array.isArray(cards) || !Array.isArray(events) || !Array.isArray(publicFacts)) return null;
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const rootIds = [...new Set(transfers.flatMap((transfer) =>
    typeof transfer.rootEventId === "string" && transfer.rootEventId ? [transfer.rootEventId] : []))];
  const matches = rootIds.flatMap((eventId) => {
    const facts = [...new Map(publicFacts.filter((fact) => fact.eventId === eventId
      && fact.effect?.kind === "draw_phase"
      && fact.committedOutcome?.source?.kind === "phase"
      && fact.committedOutcome?.source?.label === "Draw Phase")
      .map((fact) => [JSON.stringify(fact), fact])).values()];
    const timelineEvents = events.filter((event) => event.id === eventId);
    const associated = transfers.filter((transfer) => transfer.rootEventId === eventId);
    const linked = associated.filter((transfer) => transfer.sourceZone === "deck"
      && transfer.recipientId === viewerId && transfer.initialDeal !== true
      && transfer.transferId && transfer.cardId && Number.isSafeInteger(transfer.revealUntil));
    const changes = facts[0]?.committedOutcome?.changes ?? [];
    const draw = changes.length === 1 ? changes[0] : null;
    if (facts.length !== 1 || facts[0]?.semantics !== "PROVEN" || facts[0]?.visibility !== "PUBLIC"
      || timelineEvents.length !== 1 || timelineEvents[0].type !== "message"
      || timelineEvents[0].presentation === false || timelineEvents[0].drawPlayerId !== viewerId
      || !Number.isSafeInteger(timelineEvents[0].publicSequence)
      || facts[0].order !== timelineEvents[0].publicSequence
      || !draw || draw.kind !== "CARD_DRAWN" || draw.playerId !== viewerId
      || !Number.isSafeInteger(draw.amount) || draw.amount <= 0
      || associated.length !== linked.length
      || linked.length !== draw.amount
      || new Set(linked.map((transfer) => transfer.transferId)).size !== linked.length
      || new Set(linked.map((transfer) => transfer.cardId)).size !== linked.length
      || linked.some((transfer) => !cardById.has(transfer.cardId))) return [];
    return [{
      eventId,
      cards: linked.map((transfer) => cardById.get(transfer.cardId)),
      transferIds: linked.map((transfer) => transfer.transferId),
      expiresAt: Math.min(...linked.map((transfer) => transfer.revealUntil)),
    }];
  });
  return matches.length === 1 ? matches[0] : null;
}

