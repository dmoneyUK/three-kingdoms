export const PRIVATE_HAND_REVEAL_DURATION_MS = 3000;

function transferFor(event, playerId) {
  const proof = event?.privateHandTransfer;
  const cardId = event?.card?.id;
  if (event?.type !== "card" || !event.id || !cardId
    || event.presentation !== false || event.action !== "draw" && event.action !== "gain"
    || event.privateToPlayerId !== playerId
    || !proof || proof.semantics !== "PRIVATE_PROVEN"
    || proof.transferId !== event.id || proof.cardId !== cardId
    || proof.recipientId !== playerId || proof.destinationZone !== "hand"
    || !["deck", "hand", "equipment", "judgement", "harvest_pool", "damage_cards", "distribution"].includes(proof.sourceZone)
    || !Number.isFinite(proof.committedAt) || !Number.isFinite(proof.revealUntil)
    || proof.revealUntil <= proof.committedAt) return null;
  return { eventId: event.id, cardId, transferId: proof.transferId, initialDeal: event.initialDeal === true, committedAt: proof.committedAt, revealUntil: proof.revealUntil };
}

function activeTransfers(events, playerId, now, seenTransferIds, initialDealOnly = false) {
  const seenEvents = new Set();
  const seenCards = new Set();
  return events.flatMap((event) => {
    const transfer = transferFor(event, playerId);
    if (!transfer || (initialDealOnly && !transfer.initialDeal)
      || transfer.revealUntil <= now || seenTransferIds.has(transfer.transferId)
      || seenEvents.has(transfer.eventId) || seenCards.has(transfer.cardId)) return [];
    seenEvents.add(transfer.eventId);
    seenCards.add(transfer.cardId);
    return [transfer];
  });
}

export function pendingPrivateHandCardIds(playerId, hand, events, { now = Date.now(), seenTransferIds = new Set(), initialDealOnly = false } = {}) {
  const handIds = new Set(hand.map((card) => card.id));
  return new Set(activeTransfers(events, playerId, now, seenTransferIds, initialDealOnly)
    .filter((transfer) => handIds.has(transfer.cardId))
    .map((transfer) => transfer.cardId));
}

// When a page first loads, only still-current, unseen committed arrivals are
// removed from the baseline so that the same update can present them. Older
// arrivals and already consumed transfers remain ordinary Hand cards.
export function baselineHand(playerId, hand, events, { now = Date.now(), seenTransferIds = new Set() } = {}) {
  const transfers = activeTransfers(events, playerId, now, seenTransferIds);
  const handIds = new Set(hand.map((card) => card.id));
  const activeTransfersInHand = transfers.filter((transfer) => handIds.has(transfer.cardId));
  const pendingEventIds = new Set(activeTransfersInHand.map((transfer) => transfer.eventId));
  const pendingCardIds = new Set(activeTransfersInHand.map((transfer) => transfer.cardId));
  return {
    playerId,
    cardIds: new Set(hand.filter((card) => !pendingCardIds.has(card.id)).map((card) => card.id)),
    eventIds: new Set(events.filter((event) => !pendingEventIds.has(event.id)).map((event) => event.id)),
  };
}

// A seat switch is a fresh private baseline. Never turn cards that were
// already in another seat's Hand into arrivals; only a live initial deal for
// the selected seat keeps its established special presentation.
export function updatePrivateHand(previous, playerId, hand, events, { now = Date.now(), seenTransferIds = new Set() } = {}) {
  const switched = previous.playerId !== playerId;
  const previouslyPresented = new Set(!switched && Array.isArray(previous.presentedTransferIds) ? previous.presentedTransferIds : []);
  const currentTransfers = activeTransfers(events, playerId, now, seenTransferIds);
  const ignoredTransferIds = switched ? currentTransfers.filter((transfer) => !transfer.initialDeal).map((transfer) => transfer.transferId) : [];
  const transfers = currentTransfers.filter((transfer) => !switched || transfer.initialDeal)
    .filter((transfer) => !previouslyPresented.has(transfer.transferId));
  const handIds = new Set(hand.map((card) => card.id));
  const freshTransfers = transfers.filter((transfer) => handIds.has(transfer.cardId)
    && (!switched || transfer.initialDeal));
  const transferredCardIds = new Set(freshTransfers.map((transfer) => transfer.cardId));
  const byId = new Map(hand.map((card) => [card.id, card]));
  return {
    baseline: {
      playerId,
      cardIds: new Set(hand.map((card) => card.id)),
      eventIds: new Set(events.map((event) => event.id)),
      presentedTransferIds: [...new Set([...previouslyPresented, ...ignoredTransferIds, ...freshTransfers.map((transfer) => transfer.transferId)])],
    },
    switched,
    drawn: freshTransfers.flatMap((transfer) => {
      const card = byId.get(transfer.cardId);
      return card && transferredCardIds.has(card.id) ? [card] : [];
    }),
    presentedTransferIds: freshTransfers.map((transfer) => transfer.transferId),
    ignoredTransferIds,
  };
}
