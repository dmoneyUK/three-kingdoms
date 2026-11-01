import { cardDefinition } from "../game/cards";
import type { Card } from "../game/model";
import { equipmentArrivalIdentity } from "../game/equipment-arrival.js";
import type { PresentationClientView } from "../game/presentation-client";
import type { PresentationSnapshot } from "../game/presentation-snapshot";
import type { PublicPhysicalZoneTransition } from "../game/presentation-semantics";
import {
  routePublicPresentation,
  type PublicPresentationExistingOwner,
  type PublicPresentationRoute,
  type PublicTimelineEventReference,
  type PublicZoneProjection,
} from "./public-presentation-routing";

type EquipmentPlayer = { id: string; equipmentCards: readonly Card[] };

export type PublicEquipmentEvent = {
  id: string;
  type: string;
  action?: string;
  actorId?: string;
  card?: Card;
  playedAs?: string;
  presentation?: boolean;
  privateToPlayerId?: string;
  publicSequence?: number;
  publicZoneTransition?: PublicPhysicalZoneTransition;
  publicFact?: {
    category?: string;
    effect?: { kind?: string };
  };
};

function publicFactsFor(snapshot: PresentationSnapshot, eventId: string) {
  const facts = [
    ...snapshot.publicEventFacts,
    ...(snapshot.retainedPublicEventFacts ?? []),
    ...(snapshot.retainedPublicEvent ? [snapshot.retainedPublicEvent] : []),
  ].filter((fact) => fact.eventId === eventId);
  const unique = new Map(facts.map((fact) => [JSON.stringify([
    fact.identity.interactionId, fact.identity.rootFrameId, fact.identity.checkpointId,
    fact.identity.presentationRevision, fact.order, fact.rootEventId, fact.category, fact.actorId,
  ]), fact]));
  return [...unique.values()];
}

function replacementProofMatches(event: PublicEquipmentEvent, players: readonly EquipmentPlayer[]) {
  const proof = event.publicZoneTransition;
  const card = event.card;
  const slot = card ? cardDefinition(card.kind).equipmentSlot : undefined;
  return Boolean(event.type === "card" && event.action === "discard" && event.presentation !== false
    && event.publicFact?.category === "CARD_DISCARDED" && event.publicFact.effect?.kind === "equipment_replaced"
    && !event.privateToPlayerId && card && slot && proof?.semantics === "PROVEN" && proof.visibility === "PUBLIC"
    && proof.eventId === event.id && proof.physicalCardId === card.id
    && proof.from.zone === "EQUIPMENT" && proof.from.ownerId === event.actorId && proof.from.slot === slot
    && proof.to.zone === "DISCARD" && proof.to.ownerId === null
    && !players.some((player) => player.equipmentCards.some((equipped) => equipped.id === card.id)));
}

/**
 * Builds the M2 candidate only from a committed event plus the validated public
 * snapshot and its actual destination proof. Private receipts and unrelated
 * public discards are deliberately left to their existing owners.
 */
export function routePublicEquipmentTransition(input: {
  event: PublicEquipmentEvent;
  players: readonly EquipmentPlayer[];
  snapshot: PresentationSnapshot;
  clientView: PresentationClientView;
  roomCode: string;
  viewerId: string;
  retiredTransitionIds?: readonly string[];
  existingOwners?: readonly PublicPresentationExistingOwner[];
}): PublicPresentationRoute | null {
  const { event, players, snapshot, clientView } = input;
  if (event.type !== "card" || event.presentation === false || event.privateToPlayerId
    || !event.card || !event.id) return null;

  let destination: PublicZoneProjection["zone"];
  let ownerId: string | null;
  let slot: PublicZoneProjection["slot"];
  let from: PublicZoneProjection["from"] | undefined;
  let zone: PublicZoneProjection | null = null;

  if (event.action === "equip" && !event.playedAs) {
    const arrival = equipmentArrivalIdentity(event, players);
    if (!arrival) return { kind: "blocked-invalid-proof", reason: "missing-zone-proof" };
    const exactOwners = players.filter((player) => player.equipmentCards.some((card) => card.id === arrival.cardId && card.kind === event.card?.kind));
    if (exactOwners.length !== 1 || exactOwners[0].id !== arrival.ownerId || arrival.ownerId !== event.actorId) {
      return { kind: "blocked-invalid-proof", reason: "zone-proof-mismatch" };
    }
    destination = "EQUIPMENT";
    ownerId = arrival.ownerId;
    slot = arrival.slot as PublicZoneProjection["slot"];
    zone = { semantics: "PROVEN", visibility: "PUBLIC", eventId: event.id, physicalCardId: event.card.id, ownerId, zone: destination, slot };
  } else if (event.action === "discard" && replacementProofMatches(event, players)) {
    const proof = event.publicZoneTransition!;
    destination = "DISCARD";
    ownerId = null;
    slot = undefined;
    from = { zone: "EQUIPMENT", ownerId: proof.from.ownerId, slot: proof.from.slot };
    zone = { semantics: "PROVEN", visibility: "PUBLIC", eventId: event.id, physicalCardId: event.card.id, ownerId, zone: destination, from };
  } else {
    return null;
  }

  const facts = publicFactsFor(snapshot, event.id);
  if (facts.length !== 1) return { kind: "blocked-invalid-proof", reason: facts.length ? "conflicting-public-facts" : "missing-public-fact" };
  const fact = facts[0];
  if (!fact.rootEventId || !fact.actorId || fact.actorId !== event.actorId || !Number.isSafeInteger(event.publicSequence)) {
    return { kind: "blocked-invalid-proof", reason: "timeline-proof-mismatch" };
  }
  const expectedCategory = event.action === "equip" ? "CARD_EQUIPPED" : "CARD_DISCARDED";
  if (fact.category !== expectedCategory) return { kind: "blocked-invalid-proof", reason: "missing-public-fact" };
  if (destination === "DISCARD" && (fact.effect?.kind !== "equipment_replaced" || fact.rootEventId === event.id)) return null;
  const timeline: PublicTimelineEventReference = {
    semantics: "PROVEN",
    visibility: "PUBLIC",
    eventId: event.id,
    publicSequence: event.publicSequence!,
    interactionId: fact.identity.interactionId,
    rootFrameId: fact.identity.rootFrameId,
    rootEventId: fact.rootEventId,
    actorId: event.actorId,
    action: event.action === "equip" ? "equip" : "discard",
    physicalCardIds: [event.card.id],
    physicalCardKinds: { [event.card.id]: event.card.kind },
    destination,
  };
  const transitionFrom = from;
  const candidate = {
    kind: "zone-transition" as const,
    mode: clientView.hasInteraction ? "active" as const : "parked" as const,
    interactionId: fact.identity.interactionId,
    rootFrameId: fact.identity.rootFrameId,
    rootEventId: fact.rootEventId,
    transitionId: event.id,
    eventId: event.id,
    physicalCardId: event.card.id,
    ownerId,
    destination,
    ...(slot ? { slot } : {}),
    ...(transitionFrom ? { from: transitionFrom } : {}),
  };
  return routePublicPresentation({
    scope: { roomCode: input.roomCode, viewerId: input.viewerId, generation: `${input.roomCode}:${input.viewerId}` },
    snapshot,
    clientView,
    publicTimeline: [timeline],
    publicZones: zone ? [zone] : [],
    replay: { retiredTransitionIds: input.retiredTransitionIds },
    candidate,
    existingOwners: input.existingOwners,
    expectedScopeGeneration: `${input.roomCode}:${input.viewerId}`,
  });
}

export function isM2EquipmentTransitionEvent(event: PublicEquipmentEvent | null | undefined): boolean {
  return Boolean(event && event.type === "card"
    && (event.action === "equip" && !event.playedAs || event.publicZoneTransition !== undefined));
}
