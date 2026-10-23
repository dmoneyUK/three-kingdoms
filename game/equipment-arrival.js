import { cardDefinition } from "./cards.js";

/**
 * Resolve an equipment journey from a public committed event and authoritative
 * public equipment ownership. The physical card ID is the join key; names and
 * DOM order are never used to guess the owner.
 */
export function equipmentArrivalIdentity(event, players) {
  if (!event || event.type !== "card" || event.action !== "equip" || event.playedAs
    || event.presentation === false || typeof event.id !== "string" || !event.id
    || typeof event.card?.id !== "string" || !event.card.id) return null;

  const slot = cardDefinition(event.card.kind).equipmentSlot;
  if (!slot) return null;

  const owners = players.flatMap((player) => player.equipmentCards?.some((card) => card.id === event.card.id)
    ? [{ player, card: player.equipmentCards.find((card) => card.id === event.card.id) }]
    : []);
  if (owners.length > 1 || owners.length === 1 && owners[0].card?.kind !== event.card.kind) return null;

  if (typeof event.actorId === "string" && event.actorId) {
    if (!players.some((player) => player.id === event.actorId)) return null;
    if (owners.length === 1 && owners[0].player.id !== event.actorId) return null;
    return { eventId: event.id, cardId: event.card.id, ownerId: event.actorId, slot };
  }

  // Older public timelines have no stable actor ID. The exact physical card
  // may still prove its owner while it remains in that player's Equipment.
  if (owners.length !== 1) return null;
  return { eventId: event.id, cardId: event.card.id, ownerId: owners[0].player.id, slot };
}

/**
 * New equipment thumbnails stay visually parked until their own presentation
 * arrival. Events already present at mount are supplied as presented, so a
 * late join or refresh never replays or hides settled Equipment.
 */
export function pendingEquipmentArrivalIdentities(events, players, presentedEventIds) {
  const pending = events.filter((event) => event && typeof event.id === "string" && event.id
    && !event.id.startsWith("optimistic-") && !presentedEventIds.has(event.id)
    && event.type === "card" && event.action === "equip" && !event.playedAs
    && event.presentation !== false && event.card?.id);
  const uniqueEvents = [...new Map(pending.map((event) => [event.id, event])).values()];

  return uniqueEvents
    .map((event) => equipmentArrivalIdentity(event, players))
    .filter((identity) => identity !== null && players.some((player) => player.id === identity.ownerId
      && player.equipmentCards?.some((card) => card.id === identity.cardId
        && card.kind && cardDefinition(card.kind).equipmentSlot === identity.slot)));
}
