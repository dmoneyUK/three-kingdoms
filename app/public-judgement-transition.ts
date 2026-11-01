import type { PresentationClientView } from "../game/presentation-client";
import type { PresentationSnapshot } from "../game/presentation-snapshot";
import type { PublicPhysicalZoneTransition } from "../game/presentation-semantics";
import { publicFactsForEvent, routePublicPresentation, type PublicPresentationExistingOwner, type PublicPresentationRoute, type PublicTimelineEventReference, type PublicZoneProjection } from "./public-presentation-routing";

type PublicCard = { id: string; kind: string };
export type PublicJudgementTimelineEvent = {
  id: string;
  type: string;
  action?: string;
  actorId?: string;
  card?: PublicCard;
  presentation?: boolean;
  privateToPlayerId?: string;
  publicSequence?: number;
  publicFact?: { category?: string; actorId?: string; rootEventId?: string; interactionId?: string; frameId?: string; visibility?: string; semantics?: string };
  publicZoneTransition?: PublicPhysicalZoneTransition;
};

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

export function publicJudgementTransitionMatches(event: PublicJudgementTimelineEvent, route: PublicPresentationRoute): boolean {
  const transition = transitionFor(event);
  return Boolean(route.kind === "zone-transition" && transition && route.eventId === event.id
    && route.physicalCardId === transition.physicalCardId && route.sourceEventId === transition.sourceEventId
    && route.destination === transition.to.zone && route.ownerId === transition.to.ownerId
    && sameEndpoint(route.from, transition.from));
}
