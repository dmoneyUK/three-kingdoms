export type PublicDismantleSettlementIdentity = {
  roomCode: string;
  eventId: string;
  rootEventId: string;
  actionRevision: string | null;
  turnSeat: number | null;
  sourceSeat: number;
  publicSequence: number | null;
};

export type PublicDismantleSettlementProgress = {
  roomCode: string;
  status: string;
  actionRevision: string | null;
  turnSeat: number | null;
  liveRootEventId: string | null;
  latestPublicSequence: number | null;
};

export type PublicDismantleSettlementRetirementReason =
  | "already-retired"
  | "room-changed"
  | "game-ended"
  | "turn-advanced"
  | "action-advanced"
  | "different-live-root"
  | "newer-public-event";

export type PublicDismantleCommittedEvent = {
  id: string;
  type: string;
  action?: string;
  card?: { id?: string };
  cards?: readonly { id?: string }[];
  presentation?: boolean;
  privateToPlayerId?: string;
  publicSequence?: number;
  finalResult?: boolean;
};

export type PublicDismantleOutcomeFact = {
  eventId: string;
  order: number;
  rootEventId?: string;
  semantics?: string;
  visibility?: string;
};

/**
 * Finds the newest real public owner using validated public facts, explicit
 * committed card events, and event IDs already proven by public transition or
 * settlement projections. An arbitrary timeline tail is never an owner.
 */
export function latestProvenPublicEventSequence(input: {
  timeline: readonly PublicDismantleCommittedEvent[];
  publicOutcomeFacts: readonly PublicDismantleOutcomeFact[];
  validatedPublicDiscardEventIds: ReadonlySet<string>;
  validatedPublicSettlementEventIds: ReadonlySet<string>;
}): number | null {
  const eventsById = new Map<string, PublicDismantleCommittedEvent[]>();
  for (const event of input.timeline) {
    if (!event || typeof event.id !== "string" || !event.id) continue;
    const matching = eventsById.get(event.id) ?? [];
    matching.push(event);
    eventsById.set(event.id, matching);
  }
  const orders: number[] = [];
  const addPublicSequence = (event: PublicDismantleCommittedEvent | undefined, expectedOrder?: number) => {
    if (!event || eventsById.get(event.id)?.length !== 1 || event.presentation === false
      || typeof event.privateToPlayerId === "string" || !Number.isSafeInteger(event.publicSequence)
      || (event.publicSequence as number) < 0 || expectedOrder !== undefined && event.publicSequence !== expectedOrder) return;
    orders.push(event.publicSequence as number);
  };

  for (const fact of input.publicOutcomeFacts) {
    if (fact.semantics !== "PROVEN" || fact.visibility !== "PUBLIC"
      || typeof fact.rootEventId !== "string" || !fact.rootEventId
      || !Number.isSafeInteger(fact.order) || fact.order < 0) continue;
    addPublicSequence(eventsById.get(fact.eventId)?.[0], fact.order);
  }

  for (const event of input.timeline) {
    if (eventsById.get(event.id)?.length !== 1 || event.presentation === false
      || typeof event.privateToPlayerId === "string" || !Number.isSafeInteger(event.publicSequence)
      || (event.publicSequence as number) < 0) continue;
    const hasPublicPhysicalCard = event.type === "card" && typeof event.card?.id === "string" && event.card.id.length > 0
      || event.type === "cards" && Array.isArray(event.cards) && event.cards.some((card) => typeof card?.id === "string" && card.id.length > 0);
    if (hasPublicPhysicalCard && ["play", "equip", "activate", "reveal"].includes(event.action ?? "")) {
      addPublicSequence(event);
      continue;
    }
    if ((event.type === "card" || event.type === "cards") && event.action === "discard"
      && input.validatedPublicDiscardEventIds.has(event.id)) addPublicSequence(event);
    if (input.validatedPublicSettlementEventIds.has(event.id) && event.finalResult === true) addPublicSequence(event);
  }
  return orders.length ? Math.max(...orders) : null;
}

export function publicDismantleSettlementIdentityFromEvent(input: {
  roomCode: string;
  eventId: string;
  rootEventId: string;
  actionRevision: string | null;
  turnSeat: number | null;
  sourceSeat: number;
  status: string;
  event: PublicDismantleCommittedEvent | null;
}): PublicDismantleSettlementIdentity | null {
  const { event } = input;
  if (!input.roomCode || !input.eventId || !input.rootEventId || input.status !== "playing"
    || !Number.isSafeInteger(input.sourceSeat) || input.turnSeat !== input.sourceSeat
    || !event || event.id !== input.eventId || event.type !== "card" || event.action !== "discard"
    || event.presentation === false || typeof event.privateToPlayerId === "string"
    || !Number.isSafeInteger(event.publicSequence) || (event.publicSequence as number) < 0) return null;
  return {
    roomCode: input.roomCode,
    eventId: input.eventId,
    rootEventId: input.rootEventId,
    actionRevision: input.actionRevision,
    turnSeat: input.turnSeat,
    sourceSeat: input.sourceSeat,
    publicSequence: event.publicSequence as number,
  };
}

export function publicDismantleSettlementRetirementKey(identity: Pick<PublicDismantleSettlementIdentity, "roomCode" | "eventId">): string {
  return `${identity.roomCode}\u001f${identity.eventId}`;
}

/**
 * A Dismantle result is current only while its authenticated server turn and
 * action revision remain current. Geometry/H4 visibility is deliberately not
 * part of this decision: a temporary overlay must not consume its read time.
 */
export function publicDismantleSettlementRetirementReason(
  identity: PublicDismantleSettlementIdentity,
  progress: PublicDismantleSettlementProgress,
  retiredEventIds: ReadonlySet<string> = new Set(),
): PublicDismantleSettlementRetirementReason | null {
  if (retiredEventIds.has(publicDismantleSettlementRetirementKey(identity))) return "already-retired";
  if (progress.roomCode !== identity.roomCode) return "room-changed";
  if (progress.status === "finished") return "game-ended";
  if (progress.turnSeat !== identity.turnSeat || progress.turnSeat !== identity.sourceSeat) return "turn-advanced";
  if (progress.actionRevision !== identity.actionRevision) return "action-advanced";
  if (progress.liveRootEventId && progress.liveRootEventId !== identity.rootEventId) return "different-live-root";
  if (identity.publicSequence !== null && progress.latestPublicSequence !== null
    && progress.latestPublicSequence > identity.publicSequence) return "newer-public-event";
  return null;
}
