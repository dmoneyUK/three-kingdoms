import type { PublicPhysicalZoneTransition } from "../game/presentation-semantics";

type PublicHandRevealCard = { id: string; kind: string };
export type PublicHandRevealTimelineEvent = {
  id: string;
  type: "card";
  action?: string;
  actorId?: string;
  card?: PublicHandRevealCard;
  publicSequence?: number;
  presentation?: boolean;
  privateToPlayerId?: string;
  judgement?: boolean;
  publicZoneTransition?: PublicPhysicalZoneTransition;
  publicCardEffects?: readonly unknown[];
  publicDismantleSettlement?: unknown;
};

export type PublicHandRevealTransitionRoute = {
  kind: "public-hand-reveal-transition";
  claimId: string;
  scope: { roomCode: string; viewerId: string; generation: string };
  eventId: string;
  physicalCardId: string;
  sourcePlayerId: string;
  destinationPlayerId: string;
};

function isHandEndpoint(value: unknown): value is { zone: "HAND"; ownerId: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const endpoint = value as Record<string, unknown>;
  return endpoint.zone === "HAND" && typeof endpoint.ownerId === "string" && endpoint.ownerId.length > 0;
}

/** Claims only an actually public reveal with exact, committed Hand-to-Hand identity. */
export function routePublicHandRevealTransition(input: {
  event: PublicHandRevealTimelineEvent;
  timeline: readonly PublicHandRevealTimelineEvent[];
  roomCode: string;
  viewerId: string;
  retiredTransitionIds?: readonly string[];
}): PublicHandRevealTransitionRoute | null {
  const { event, timeline } = input;
  if (event.type !== "card" || event.action !== "reveal" || event.judgement === true
    || event.presentation !== true || typeof event.privateToPlayerId === "string"
    || !event.actorId || !Number.isSafeInteger(event.publicSequence) || (event.publicSequence ?? -1) < 0
    || !event.card || typeof event.card.id !== "string" || !event.card.id || typeof event.card.kind !== "string"
    || event.publicDismantleSettlement || event.publicCardEffects?.length
    || !input.roomCode || !input.viewerId) return null;

  const sameEvent = timeline.filter((candidate) => candidate.id === event.id);
  if (sameEvent.length !== 1 || sameEvent[0].type !== "card"
    || sameEvent[0].action !== event.action || sameEvent[0].actorId !== event.actorId
    || sameEvent[0].publicSequence !== event.publicSequence
    || sameEvent[0].presentation !== event.presentation
    || sameEvent[0].privateToPlayerId !== event.privateToPlayerId
    || sameEvent[0].card?.id !== event.card.id || sameEvent[0].card?.kind !== event.card.kind
    || JSON.stringify(sameEvent[0].publicZoneTransition) !== JSON.stringify(event.publicZoneTransition)) return null;

  const transition = event.publicZoneTransition;
  if (!transition || typeof transition !== "object"
    || transition.semantics !== "PROVEN" || transition.visibility !== "PUBLIC"
    || transition.eventId !== event.id || transition.sourceEventId !== event.id
    || typeof transition.rootEventId !== "string" || !transition.rootEventId
    || transition.physicalCardId !== event.card.id
    || !isHandEndpoint(transition.from) || transition.from.ownerId !== event.actorId
    || !isHandEndpoint(transition.to) || transition.to.ownerId === transition.from.ownerId) return null;
  if ((input.retiredTransitionIds ?? []).includes(event.id)) return null;

  return {
    kind: "public-hand-reveal-transition",
    claimId: `${input.roomCode}\u001fpublic-hand-reveal\u001f${event.id}`,
    scope: { roomCode: input.roomCode, viewerId: input.viewerId, generation: `${input.roomCode}:${input.viewerId}` },
    eventId: event.id,
    physicalCardId: event.card.id,
    sourcePlayerId: transition.from.ownerId,
    destinationPlayerId: transition.to.ownerId,
  };
}
