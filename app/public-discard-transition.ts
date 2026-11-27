import { publicH4CardFaceReference, publicH4CardSourceReference, publicH4Copy, type PublicH4Segment } from "../game/public-h4-copy";
import type { PublicPhysicalZoneTransition, PublicZoneEndpoint } from "../game/presentation-semantics";
import { cardDefinition } from "../game/cards";
import type { CardKind, CardRank, CardSuit } from "../game/model";

export type PublicDiscardCard = { id: string; kind: string; rank?: string; suit?: string };
export type PublicDiscardCardFace = { id: string; name: string; rank: CardRank; suit: CardSuit };
export type PublicDiscardTimelineEvent = {
  id: string;
  type: "card" | "cards" | "message";
  action?: string;
  actorId?: string;
  card?: PublicDiscardCard;
  cards?: readonly PublicDiscardCard[];
  presentation?: boolean;
  privateToPlayerId?: string;
  publicSequence?: number;
  publicDismantleSettlement?: unknown;
  publicCardEffects?: readonly unknown[];
  publicZoneTransitions?: readonly PublicPhysicalZoneTransition[];
};

export type PublicDiscardTransitionRoute = {
  kind: "public-discard-transition";
  claimId: string;
  scope: { roomCode: string; viewerId: string; generation: string };
  eventId: string;
  transitions: readonly {
    physicalCardId: string;
    from: Extract<PublicZoneEndpoint, { zone: "HAND" | "EQUIPMENT" | "JUDGEMENT" }>;
    to: { zone: "DISCARD"; ownerId: null };
  }[];
};

export type PublicDiscardAnnouncement = {
  eventId: string;
  actorId: string;
  order: number;
  count: number;
  cards: readonly { id: string; name: string; rank: CardRank; suit: CardSuit }[] | null;
  headline: string;
  segments?: readonly PublicH4Segment[];
  accessibleLabel: string;
};

export type PublicDiscardByActionAnnouncement = {
  cards: readonly { id: string; name: string; rank: CardRank; suit: CardSuit }[] | null;
  headline: string;
  segments?: readonly PublicH4Segment[];
  accessibleLabel: string;
};

function eventCards(event: PublicDiscardTimelineEvent): readonly PublicDiscardCard[] {
  if (event.type === "card") return event.card ? [event.card] : [];
  return event.type === "cards" && Array.isArray(event.cards) ? event.cards : [];
}

/** One face formatter shared by every committed public discard presentation. */
export function publicDiscardCardFaces(cards: readonly PublicDiscardCard[]): readonly PublicDiscardCardFace[] | null {
  const ranks = new Set<CardRank>(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]);
  const suits = new Set<CardSuit>(["♥", "♦", "♣", "♠"]);
  if (!cards.length || cards.some((card) => !card || typeof card.id !== "string" || !card.id || typeof card.kind !== "string")) return null;
  const faces = cards.map((card) => {
    if (!ranks.has(card.rank as CardRank) || !suits.has(card.suit as CardSuit)) return null;
    const definition = cardDefinition(card.kind as CardKind);
    return definition ? { id: card.id, name: definition.name, rank: card.rank as CardRank, suit: card.suit as CardSuit } : null;
  });
  return faces.every((face): face is PublicDiscardCardFace => Boolean(face)) ? faces : null;
}

export function publicDiscardCardList(faces: readonly PublicDiscardCardFace[]): string {
  return faces.map((card) => publicH4CardFaceReference(card) ?? "a public card").join(" · ");
}

function isSourceEndpoint(value: unknown): value is Extract<PublicZoneEndpoint, { zone: "HAND" | "EQUIPMENT" | "JUDGEMENT" }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const endpoint = value as Record<string, unknown>;
  if (typeof endpoint.ownerId !== "string" || endpoint.ownerId.length === 0) return false;
  if (endpoint.zone === "HAND" || endpoint.zone === "JUDGEMENT") return endpoint.slot === undefined;
  if (endpoint.zone !== "EQUIPMENT") return false;
  return endpoint.slot === "weapon" || endpoint.slot === "armor"
    || endpoint.slot === "offensiveHorse" || endpoint.slot === "defensiveHorse";
}

function isDiscardEndpoint(value: unknown): value is { zone: "DISCARD"; ownerId: null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const endpoint = value as Record<string, unknown>;
  return endpoint.zone === "DISCARD" && endpoint.ownerId === null && endpoint.slot === undefined;
}

/**
 * Routes only the server-committed discard event that carries its exact source
 * zone metadata. Dismantle results and R4 material keep their separate owners.
 */
export function routePublicDiscardTransition(input: {
  event: PublicDiscardTimelineEvent;
  timeline: readonly PublicDiscardTimelineEvent[];
  roomCode: string;
  viewerId: string;
  retiredTransitionIds?: readonly string[];
}): PublicDiscardTransitionRoute | null {
  const { event, timeline } = input;
  if ((event.type !== "card" && event.type !== "cards") || event.action !== "discard"
    || event.presentation === false || typeof event.privateToPlayerId === "string"
    || !event.actorId || !Number.isSafeInteger(event.publicSequence) || (event.publicSequence ?? -1) < 0
    || event.publicDismantleSettlement || event.publicCardEffects?.length) return null;
  if (!input.roomCode || !input.viewerId) return null;
  const sameEvent = timeline.filter((candidate) => candidate.id === event.id);
  if (sameEvent.length !== 1 || sameEvent[0].type !== event.type || sameEvent[0].action !== "discard"
    || sameEvent[0].publicSequence !== event.publicSequence || sameEvent[0].actorId !== event.actorId
    || sameEvent[0].presentation !== event.presentation || sameEvent[0].privateToPlayerId !== event.privateToPlayerId
    || JSON.stringify(sameEvent[0].publicZoneTransitions) !== JSON.stringify(event.publicZoneTransitions)
    || JSON.stringify(sameEvent[0].publicDismantleSettlement) !== JSON.stringify(event.publicDismantleSettlement)
    || JSON.stringify(sameEvent[0].publicCardEffects) !== JSON.stringify(event.publicCardEffects)) return null;

  const cards = eventCards(event);
  const committedCards = eventCards(sameEvent[0]);
  const cardIdentity = (items: readonly PublicDiscardCard[]) => items.map(({ id, kind, rank, suit }) => `${id}\u001f${kind}\u001f${rank ?? ""}\u001f${suit ?? ""}`).join("\u001e");
  if (!cards.length || cards.some((card) => !card || typeof card.id !== "string" || !card.id || typeof card.kind !== "string")
    || committedCards.some((card) => !card || typeof card.id !== "string" || !card.id || typeof card.kind !== "string")
    || cardIdentity(cards) !== cardIdentity(committedCards)) return null;
  const transitions = event.publicZoneTransitions;
  if (!transitions?.length || transitions.some((transition) => !transition || typeof transition !== "object")
    || new Set(cards.map((card) => card.id)).size !== cards.length
    || transitions.length !== cards.length || new Set(transitions.map((transition) => transition.physicalCardId)).size !== transitions.length) return null;
  const byCardId = new Map(cards.map((card) => [card.id, card]));
  if (cards.some((card, index) => transitions[index]?.physicalCardId !== card.id)) return null;
  const routed = transitions.map((transition) => {
    if (!transition || typeof transition !== "object") return null;
    const card = byCardId.get(transition.physicalCardId);
    if (!card || transition.semantics !== "PROVEN" || transition.visibility !== "PUBLIC"
      || transition.eventId !== event.id || transition.sourceEventId !== event.id || transition.rootEventId !== event.id
      || !isSourceEndpoint(transition.from) || transition.from.ownerId !== event.actorId
      || !isDiscardEndpoint(transition.to)) return null;
    return { physicalCardId: card.id, from: transition.from, to: { zone: "DISCARD" as const, ownerId: null } };
  });
  if (routed.some((transition) => transition === null) || cards.some((card) => !transitions.some((transition) => transition.physicalCardId === card.id))) return null;
  if ((input.retiredTransitionIds ?? []).includes(event.id)) return null;

  return {
    kind: "public-discard-transition",
    claimId: `${input.roomCode}\u001fpublic-discard\u001f${event.id}`,
    scope: { roomCode: input.roomCode, viewerId: input.viewerId, generation: `${input.roomCode}:${input.viewerId}` },
    eventId: event.id,
    transitions: routed as NonNullable<(typeof routed)[number]>[],
  };
}

/** Builds public copy only from the exact committed discard event and route. */
export function publicDiscardAnnouncement(input: {
  event: PublicDiscardTimelineEvent;
  route: PublicDiscardTransitionRoute;
  players: readonly { id: string; name: string }[];
}): PublicDiscardAnnouncement | null {
  const { event, route } = input;
  if (route.eventId !== event.id || route.transitions.length === 0
    || route.transitions.some((transition) => transition.from.ownerId !== event.actorId)
    || route.transitions.length !== eventCards(event).length
    || !Number.isSafeInteger(event.publicSequence) || (event.publicSequence ?? -1) < 0) return null;
  const actor = input.players.find((player) => player.id === event.actorId)?.name.trim();
  if (!actor) return null;
  const count = route.transitions.length;
  const cardList = publicDiscardCardFaces(eventCards(event));
  const suffix = cardList
    ? ` discarded ${count} ${count === 1 ? "card" : "cards"}: ${publicDiscardCardList(cardList)}.`
    : ` discarded ${count} ${count === 1 ? "card" : "cards"}.`;
  const { message: headline, segments } = publicH4Copy([{ id: event.actorId!, name: actor }, suffix]);
  return { eventId: event.id, actorId: event.actorId!, order: event.publicSequence!, count, cards: cardList, headline, segments, accessibleLabel: headline };
}

/** Formats one committed effect that makes its target's discarded cards public. */
export function publicDiscardByActionAnnouncement(input: {
  actor: { id: string; name: string };
  materialOwner: { id: string; name: string };
  actionLabel: string;
  actionSourceKind?: "card" | "equipment" | "skill";
  cards: readonly PublicDiscardCard[];
}): PublicDiscardByActionAnnouncement | null {
  const { actor, materialOwner, actionLabel, cards } = input;
  if (!actor.id || !actor.name.trim() || !materialOwner.id || !materialOwner.name.trim()
    || !actionLabel.trim() || !cards.length || cards.some((card) => !card.id || !card.kind)
    || new Set(cards.map((card) => card.id)).size !== cards.length) return null;
  const normalizedActionLabel = actionLabel.trim();
  const cardList = publicDiscardCardFaces(cards);
  const sourceLabel = input.actionSourceKind === "card"
    ? publicH4CardSourceReference({ kind: "card", label: normalizedActionLabel }) ?? "a card"
    : input.actionSourceKind === "equipment"
      ? publicH4CardSourceReference({ kind: "equipment", label: normalizedActionLabel }) ?? "an equipment effect"
      : input.actionSourceKind === "skill" ? normalizedActionLabel : "a public effect";
  const count = cards.length;
  const cardCopy = cardList ? `: ${publicDiscardCardList(cardList)}.` : ".";
  const { message: headline, segments } = publicH4Copy([
    { id: actor.id, name: actor.name.trim() },
    ` used ${sourceLabel} to discard ${count} ${count === 1 ? "card" : "cards"} from `,
    { id: materialOwner.id, name: materialOwner.name.trim() },
    cardCopy,
  ]);
  return { cards: cardList, headline, segments, accessibleLabel: headline };
}
