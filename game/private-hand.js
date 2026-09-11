export function baselineHand(playerId, hand, events) {
  return { playerId, cardIds: new Set(hand.map((card) => card.id)), eventIds: new Set(events.map((event) => event.id)) };
}

// Changing seats establishes a new baseline, never a private draw. Same-seat
// additions need a new authoritative draw event, not just an unfamiliar ID.
export function updatePrivateHand(previous, playerId, hand, events) {
  const baseline = baselineHand(playerId, hand, events);
  const switched = previous.playerId !== playerId;
  const freshEvents = events.filter((event) => !previous.eventIds.has(event.id));
  const hasDraw = !switched && freshEvents.some((event) => event.drawPlayerId === playerId);
  const gains = new Set(freshEvents.flatMap((event) => event.gainedCardIds ?? []));
  const drawn = hasDraw ? hand.filter((card) => !previous.cardIds.has(card.id) && !gains.has(card.id)) : [];
  return { baseline, switched, drawn };
}
