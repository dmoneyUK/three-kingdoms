import type { PresentationClientView } from "../game/presentation-client";
import type { PresentationSnapshot } from "../game/presentation-snapshot";
import type { PublicPhysicalZoneTransition } from "../game/presentation-semantics";
import { publicFactsForEvent, routePublicPresentation, type PublicPresentationExistingOwner, type PublicPresentationRoute, type PublicTimelineEventReference, type PublicZoneProjection } from "./public-presentation-routing";

type PublicCard = { id: string; kind: string; rank?: string; suit?: string };
export type PublicJudgementTimelineEvent = {
  id: string;
  type: string;
  action?: string;
  actorId?: string;
  card?: PublicCard;
  presentation?: boolean;
  judgement?: boolean;
  resolutionId?: string;
  privateToPlayerId?: string;
  publicSequence?: number;
  publicFact?: { category?: string; actorId?: string; rootEventId?: string; interactionId?: string; frameId?: string; visibility?: string; semantics?: string };
  publicZoneTransition?: PublicPhysicalZoneTransition;
};

export type PublicJudgementRevealRoute = {
  kind: "judgement-reveal";
  claimedBy: "PublicJudgementCardReveal";
  claimId: string;
  scope: { roomCode: string; viewerId: string; generation: string };
  eventId: string;
  physicalCardId: string;
  publicSequence: number;
};

/** Claims only the active, server-committed public original Judgement card. */
export function routePublicJudgementReveal(input: {
  event: PublicJudgementTimelineEvent;
  timeline: readonly PublicJudgementTimelineEvent[];
  roomCode: string;
  viewerId: string;
  retiredEventIds?: readonly string[];
  existingOwners?: readonly { eventId: string; physicalCardId: string; owner: string }[];
}): PublicJudgementRevealRoute | null {
  const { event, timeline } = input;
  if (!input.roomCode || !input.viewerId || event.type !== "card" || event.action !== "reveal"
    || event.judgement !== true || event.presentation === false || typeof event.privateToPlayerId === "string"
    || !event.id || !event.card?.id || !event.card.kind || !event.card.rank || !event.card.suit
    || !Number.isSafeInteger(event.publicSequence) || (event.publicSequence as number) < 0
    || input.retiredEventIds?.includes(event.id)) return null;

  const matchingEvents = timeline.filter((candidate) => candidate.id === event.id);
  const matchingSequence = timeline.filter((candidate) => candidate.publicSequence === event.publicSequence);
  const committed = matchingEvents[0];
  if (matchingEvents.length !== 1 || matchingSequence.length !== 1 || committed?.type !== "card"
    || committed.action !== "reveal" || committed.judgement !== true || committed.presentation === false
    || typeof committed.privateToPlayerId === "string" || committed.publicSequence !== event.publicSequence
    || committed.card?.id !== event.card.id || committed.card.kind !== event.card.kind
    || committed.card.rank !== event.card.rank || committed.card.suit !== event.card.suit) return null;
  // A causal root ID is not a CardFace owner ID: one interaction can contain
  // multiple events and physical cards. Suppress only an owner of this exact
  // physical card, so a shared root cannot hide a distinct original reveal.
  if (input.existingOwners?.some((owner) => owner.physicalCardId === event.card?.id)) return null;

  return {
    kind: "judgement-reveal", claimedBy: "PublicJudgementCardReveal",
    claimId: [input.roomCode, "public-judgement-reveal", event.id, event.card.id].join("\u001f"),
    scope: { roomCode: input.roomCode, viewerId: input.viewerId, generation: `${input.roomCode}:${input.viewerId}` },
    eventId: event.id, physicalCardId: event.card.id, publicSequence: event.publicSequence as number,
  };
}

function isEndpoint(value: unknown): value is PublicZoneProjection["from"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const endpoint = value as Record<string, unknown>;
  if (endpoint.zone === "HAND" || endpoint.zone === "EQUIPMENT" || endpoint.zone === "JUDGEMENT") {
    return typeof endpoint.ownerId === "string" && endpoint.ownerId.length > 0;
  }
  return (endpoint.zone === "DECK" || endpoint.zone === "DISCARD") && endpoint.ownerId === null;
}

function sameEndpoint(left: PublicZoneProjection["from"], right: PublicZoneTransitionEndpoint) {
  return Boolean(left && left.zone === right.zone && left.ownerId === right.ownerId && left.slot === right.slot);
}

type PublicZoneTransitionEndpoint = NonNullable<PublicPhysicalZoneTransition["from"]>;

function transitionFor(event: PublicJudgementTimelineEvent): PublicPhysicalZoneTransition | null {
  const transition = event.publicZoneTransition;
  if (!transition || transition.semantics !== "PROVEN" || transition.visibility !== "PUBLIC"
    || transition.eventId !== event.id || !transition.physicalCardId || !transition.sourceEventId || !transition.rootEventId
    || !isEndpoint(transition.from) || !isEndpoint(transition.to)) return null;
  const fromJudgement = transition.from.zone === "JUDGEMENT";
  const toJudgement = transition.to.zone === "JUDGEMENT";
  const judgementCardSettlement = fromJudgement && (toJudgement || transition.to.zone === "DISCARD");
  const judgementRevealSettlement = transition.from.zone === "DECK" && transition.to.zone === "DISCARD";
  const delayedCardAttachment = transition.from.zone === "HAND" && toJudgement;
  return judgementCardSettlement || judgementRevealSettlement || delayedCardAttachment ? transition : null;
}

export function isM3JudgementTransitionEvent(event: PublicJudgementTimelineEvent | null | undefined): boolean {
  return Boolean(event && event.type === "message" && event.presentation !== false
    && typeof event.privateToPlayerId !== "string" && transitionFor(event));
}

/** Routes only a committed, exact physical-card Judgement movement. */
export function routePublicJudgementTransition(input: {
  event: PublicJudgementTimelineEvent;
  timeline: readonly PublicJudgementTimelineEvent[];
  snapshot: PresentationSnapshot;
  clientView: PresentationClientView;
  roomCode: string;
  viewerId: string;
  retiredTransitionIds?: readonly string[];
  existingOwners?: readonly PublicPresentationExistingOwner[];
}): PublicPresentationRoute | null {
  const { event, timeline, snapshot, clientView } = input;
  const transition = transitionFor(event);
  const fact = event.publicFact;
  if (!transition || event.presentation === false || event.privateToPlayerId || !Number.isSafeInteger(event.publicSequence)
    || fact?.semantics !== "PROVEN" || fact.visibility !== "PUBLIC" || fact.category !== "STAGE_COMPLETED"
    || fact.rootEventId !== transition.rootEventId || !fact.actorId || event.actorId !== fact.actorId) return null;
  const sourceMatches = timeline.filter((candidate) => candidate.id === transition.sourceEventId);
  if (sourceMatches.length !== 1) return { kind: "blocked-invalid-proof", reason: "timeline-proof-mismatch" };
  const source = sourceMatches[0];
  if (source.type !== "card" || source.presentation === false || source.privateToPlayerId
    || source.card?.id !== transition.physicalCardId
    || source.action !== "play" && source.action !== "activate" && source.action !== "reveal") {
    return { kind: "blocked-invalid-proof", reason: "timeline-proof-mismatch" };
  }
  const factRows = publicFactsForEvent(snapshot, event.id);
  if (factRows.length !== 1 || factRows[0].category !== "STAGE_COMPLETED"
    || factRows[0].rootEventId !== transition.rootEventId || factRows[0].actorId !== fact.actorId
    || factRows[0].order !== event.publicSequence) return { kind: "blocked-invalid-proof", reason: factRows.length ? "conflicting-public-facts" : "missing-public-fact" };

  const zone: PublicZoneProjection = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: event.id,
    physicalCardId: transition.physicalCardId,
    ownerId: transition.to.ownerId,
    zone: transition.to.zone,
    ...(transition.to.zone === "EQUIPMENT" && transition.to.slot ? { slot: transition.to.slot as PublicZoneProjection["slot"] } : {}),
    from: transition.from,
    sourceEventId: transition.sourceEventId,
    rootEventId: transition.rootEventId,
  };
  const timelineProof: PublicTimelineEventReference = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: event.id,
    publicSequence: event.publicSequence!, interactionId: factRows[0].identity.interactionId,
    rootFrameId: factRows[0].identity.rootFrameId, rootEventId: transition.rootEventId,
    actorId: fact.actorId, action: "zone_transition", physicalCardIds: [transition.physicalCardId],
    physicalCardKinds: { [transition.physicalCardId]: source.card.kind }, destination: transition.to.zone,
  };
  const from = transition.from;
  const toOwnerId = transition.to.ownerId;
  const toSlot = transition.to.zone === "EQUIPMENT" ? transition.to.slot as PublicZoneProjection["slot"] : undefined;
  return routePublicPresentation({
    scope: { roomCode: input.roomCode, viewerId: input.viewerId, generation: `${input.roomCode}:${input.viewerId}` },
    snapshot,
    clientView,
    publicTimeline: [timelineProof],
    publicZones: [zone],
    replay: { retiredTransitionIds: input.retiredTransitionIds },
    candidate: {
      kind: "zone-transition", mode: clientView.hasInteraction ? "active" : "parked",
      interactionId: factRows[0].identity.interactionId, rootFrameId: factRows[0].identity.rootFrameId,
      rootEventId: transition.rootEventId, transitionId: event.id, eventId: event.id,
      physicalCardId: transition.physicalCardId, ownerId: toOwnerId, destination: transition.to.zone,
      sourceEventId: transition.sourceEventId,
      ...(toSlot ? { slot: toSlot } : {}), ...(from ? { from } : {}),
    },
    existingOwners: input.existingOwners,
    expectedScopeGeneration: `${input.roomCode}:${input.viewerId}`,
  });
}

export function publicJudgementTransitionSourceEventId(route: PublicPresentationRoute | null): string | null {
  return route?.kind === "zone-transition" ? route.sourceEventId ?? null : null;
}

/** A deck reveal already has its own CardFace owner before it reaches Discard. */
export function publicJudgementTransitionUsesExistingRevealOwner(route: PublicPresentationRoute): boolean {
  return route.kind === "zone-transition" && route.from?.zone === "DECK"
    && route.destination === "DISCARD" && Boolean(route.sourceEventId && route.physicalCardId);
}

export function publicJudgementTransitionMatches(event: PublicJudgementTimelineEvent, route: PublicPresentationRoute): boolean {
  const transition = transitionFor(event);
  return Boolean(route.kind === "zone-transition" && transition && route.eventId === event.id
    && route.physicalCardId === transition.physicalCardId && route.sourceEventId === transition.sourceEventId
    && route.destination === transition.to.zone && route.ownerId === transition.to.ownerId
    && sameEndpoint(route.from, transition.from));
}
