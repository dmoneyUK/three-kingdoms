import { cardDefinition } from "../game/cards";
import type { Card } from "../game/model";
import { equipmentArrivalIdentity } from "../game/equipment-arrival.js";
import type { PresentationClientView } from "../game/presentation-client";
import type { PresentationSnapshot } from "../game/presentation-snapshot";
import type { PublicPresentationEvent, PublicPhysicalZoneTransition } from "../game/presentation-semantics";
import type { PublicInteractionNarration } from "../game/public-activity";
import { createPublicStageVisibleHoldPolicy } from "../game/public-stage-layout";
import type { PublicCardDisplayAction } from "./public-card-display";
import {
  publicFactsForEvent,
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
};

/** Only an ordinary committed equip owns the canonical public CardFace journey. */
export function isCommittedPublicEquipmentPlay(event: PublicEquipmentEvent | null | undefined): boolean {
  return Boolean(event && event.type === "card" && event.action === "equip" && !event.playedAs
    && event.presentation !== false && !event.privateToPlayerId && event.card?.id && event.actorId);
}

/**
 * Adapts the committed room event and its immutable queued public fact to the
 * shared PublicCardDisplay owner. A queue claim is bound to its original event
 * identity and sequence, so a later unrelated snapshot root cannot invalidate it.
 */
export function routePublicEquipmentTransition(input: {
  event: PublicEquipmentEvent;
  players: readonly EquipmentPlayer[];
  snapshot: PresentationSnapshot;
  clientView: PresentationClientView;
  roomCode: string;
  viewerId: string;
  committedPublicFact?: PublicPresentationEvent;
  retiredTransitionIds?: readonly string[];
  existingOwners?: readonly PublicPresentationExistingOwner[];
}): PublicPresentationRoute | null {
  const { event, players, snapshot } = input;
  if (!isCommittedPublicEquipmentPlay(event) || !event.card || !event.actorId) return null;
  const arrival = equipmentArrivalIdentity(event, players);
  if (!arrival || arrival.eventId !== event.id || arrival.cardId !== event.card.id || arrival.ownerId !== event.actorId) {
    return { kind: "blocked-invalid-proof", reason: "missing-zone-proof" };
  }
  const exactOwners = players.filter((player) => player.equipmentCards.some((card) => card.id === arrival.cardId && card.kind === event.card?.kind));
  const slot = cardDefinition(event.card.kind).equipmentSlot;
  if (!slot || exactOwners.length !== 1 || exactOwners[0].id !== arrival.ownerId || arrival.slot !== slot) {
    return { kind: "blocked-invalid-proof", reason: "zone-proof-mismatch" };
  }
  if (!Number.isSafeInteger(event.publicSequence) || (event.publicSequence ?? -1) < 0) {
    return { kind: "blocked-invalid-proof", reason: "timeline-proof-mismatch" };
  }

  const facts = publicFactsForEvent(snapshot, event.id, input.committedPublicFact ? [input.committedPublicFact] : []);
  if (facts.length !== 1) return { kind: "blocked-invalid-proof", reason: facts.length ? "conflicting-public-facts" : "missing-public-fact" };
  const fact = facts[0];
  if (fact.category !== "CARD_EQUIPPED" || fact.visibility !== "PUBLIC" || fact.semantics !== "PROVEN"
    || fact.eventId !== event.id || fact.order !== event.publicSequence || fact.rootEventId !== event.id
    || !fact.identity.interactionId || !fact.identity.rootFrameId
    || !fact.actorId || fact.actorId !== event.actorId || !fact.affectedPlayerIds.includes(event.actorId)) {
    return { kind: "blocked-invalid-proof", reason: "timeline-proof-mismatch" };
  }

  const timeline: PublicTimelineEventReference = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: event.id, publicSequence: event.publicSequence!,
    interactionId: fact.identity.interactionId, rootFrameId: fact.identity.rootFrameId, rootEventId: fact.rootEventId,
    actorId: event.actorId, action: "equip", physicalCardIds: [event.card.id],
    physicalCardKinds: { [event.card.id]: event.card.kind }, destination: "EQUIPMENT",
  };
  const zone: PublicZoneProjection = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: event.id, physicalCardId: event.card.id,
    ownerId: arrival.ownerId, zone: "EQUIPMENT", slot,
  };
  return routePublicPresentation({
    scope: { roomCode: input.roomCode, viewerId: input.viewerId, generation: `${input.roomCode}:${input.viewerId}` },
    snapshot,
    clientView: input.clientView,
    publicTimeline: [timeline],
    publicZones: [zone],
    committedPublicFacts: [fact],
    replay: { retiredTransitionIds: input.retiredTransitionIds },
    candidate: {
      kind: "zone-transition", mode: "committed", interactionId: fact.identity.interactionId,
      rootFrameId: fact.identity.rootFrameId, rootEventId: fact.rootEventId,
      transitionId: event.id, eventId: event.id, physicalCardId: event.card.id,
      ownerId: arrival.ownerId, destination: "EQUIPMENT", slot,
    },
    existingOwners: input.existingOwners,
    expectedScopeGeneration: `${input.roomCode}:${input.viewerId}`,
  });
}

/** Builds the one canonical CardDisplay action from the exact public equip fact and route. */
export function publicEquipmentCardDisplayAction(input: {
  event: PublicEquipmentEvent;
  route: PublicPresentationRoute | null | undefined;
  fact: PublicPresentationEvent | null | undefined;
  narration: PublicInteractionNarration | null | undefined;
  roomCode: string;
  viewerId: string;
  seenEventIds: ReadonlySet<string>;
}): PublicCardDisplayAction | null {
  const { event, route, fact, narration } = input;
  if (!isCommittedPublicEquipmentPlay(event) || !event.card || !event.actorId
    || route?.kind !== "zone-transition" || route.claimedBy !== "PublicCardDisplay"
    || route.scope.roomCode !== input.roomCode || route.scope.viewerId !== input.viewerId
    || route.eventId !== event.id || route.physicalCardId !== event.card.id
    || route.ownerId !== event.actorId || route.destination !== "EQUIPMENT" || !route.slot
    || !fact || fact.semantics !== "PROVEN" || fact.visibility !== "PUBLIC"
    || fact.eventId !== event.id || fact.rootEventId !== event.id || fact.category !== "CARD_EQUIPPED"
    || fact.actorId !== event.actorId || fact.order !== event.publicSequence
    || !fact.identity.interactionId || !fact.identity.rootFrameId
    || !narration || narration.eventId !== event.id || narration.rootEventId !== event.id
    || narration.interactionId !== fact.identity.interactionId || narration.rootFrameId !== fact.identity.rootFrameId
    || narration.actorId !== event.actorId) return null;

  const slot = route.slot;
  const claim = {
    claimId: route.claimId,
    eventId: event.id,
    physicalCardId: event.card.id,
    ownerId: event.actorId,
    slot,
    h4EventId: event.id,
  } as const;
  const visibleHoldPolicy = createPublicStageVisibleHoldPolicy({
    semantics: "PROVEN",
    identity: {
      roomId: input.roomCode,
      rootEventId: event.id,
      interactionId: fact.identity.interactionId,
      eventId: event.id,
      cardId: event.card.id,
      viewerId: input.viewerId,
      rootFrameId: fact.identity.rootFrameId,
      h4EventId: claim.h4EventId,
      phase: "REVEAL",
      materialCardIds: [event.card.id],
      frame: null,
    },
    completion: {
      kind: "EQUIPMENT_ARRIVAL",
      claimId: claim.claimId,
      eventId: claim.eventId,
      physicalCardId: claim.physicalCardId,
      ownerId: claim.ownerId,
      destination: "EQUIPMENT",
      slot: claim.slot,
    },
  });
  if (!visibleHoldPolicy) return null;
  return {
    key: [input.roomCode, "equipment", route.claimId].join(":"),
    rootEventId: event.id,
    interactionId: fact.identity.interactionId,
    rootFrameId: fact.identity.rootFrameId,
    checkpointId: fact.identity.checkpointId,
    presentationRevision: fact.identity.presentationRevision,
    sourceId: event.actorId,
    targetId: null,
    cardFace: event.card,
    cardKind: event.card.kind,
    cardLabel: cardDefinition(event.card.kind).name.toUpperCase(),
    ariaLabel: narration.accessibleLabel,
    publicNotice: narration.headline,
    publicNoticeSegments: narration.headlineSegments,
    publicNoticeCompact: narration.compactHeadline,
    publicNoticeEventId: event.id,
    publicInteractionNarration: narration,
    motion: {
      type: "zone-transition",
      scopeKey: route.claimId,
      freshEventIds: input.seenEventIds.has(event.id) ? [] : [event.id],
    },
    visibleHoldPolicy,
    zoneTransition: claim,
  };
}

/** Reject stale or duplicate parked callbacks; the route revalidates live slot ownership. */
export function publicEquipmentArrivalCompletionMatches(input: {
  route: PublicPresentationRoute | null | undefined;
  claim: NonNullable<PublicCardDisplayAction["zoneTransition"]>;
  roomCode: string;
  viewerId: string;
  presentedEventIds?: ReadonlySet<string>;
}): boolean {
  const route = input.route;
  return Boolean(route?.kind === "zone-transition" && route.claimedBy === "PublicCardDisplay"
    && route.scope.roomCode === input.roomCode && route.scope.viewerId === input.viewerId
    && route.claimId === input.claim.claimId && route.eventId === input.claim.eventId
    && route.physicalCardId === input.claim.physicalCardId && route.ownerId === input.claim.ownerId
    && route.destination === "EQUIPMENT" && route.slot === input.claim.slot
    && input.claim.h4EventId === input.claim.eventId
    && !input.presentedEventIds?.has(input.claim.eventId));
}
