import { CARD_KINDS, type Card, type CardKind, type CardRank, type CardSuit } from "../game/model";
import type { PublicOutcomeSourceKind, PublicPresentationEvent } from "../game/presentation-semantics";
import type {
  PresentationDismantleSettlement,
  PresentationPublicCardEffect,
  PresentationPublicCardEffectSource,
  PresentationV2Event,
} from "../game/presentation-v2";
import { publicH4Copy, type PublicH4Segment } from "../game/public-h4-copy";
import { formatCommittedPublicOutcomeWithSegments } from "../game/public-activity";
import { publicDiscardCardFaces, publicDiscardCardList, type PublicDiscardCardFace } from "./public-discard-transition";

export type PublicDiscardSettlementMode =
  | "self" | "forced" | "direct" | "cost" | "effect" | "equipment-replacement" | "defeat" | "lord-punishment" | "unknown";

export type PublicDiscardSettlementMaterial = {
  /** Null only when the committed event proves removal but lacks a complete public face. */
  card: Card | null;
  physicalCardId: string;
  ownerId: string | null;
  /** The player whose Judgement zone held an unowned-zone card, when proven. */
  affectedPlayerId?: string;
  fromZone: "HAND" | "EQUIPMENT" | "JUDGEMENT";
  fromSlot?: "weapon" | "armor" | "offensiveHorse" | "defensiveHorse";
  toZone: "DISCARD";
};

export type CanonicalPublicDiscardSettlement = {
  semantics: "PROVEN";
  visibility: "PUBLIC";
  eventId: string;
  order: number;
  rootEventId?: string;
  resolutionId?: string;
  interactionId?: string;
  frameId?: string;
  activationOwnerId?: string;
  affectedPlayerIds: readonly string[];
  source: { kind: PublicOutcomeSourceKind; label?: string; providerId?: string };
  mode: PublicDiscardSettlementMode;
  materials: readonly PublicDiscardSettlementMaterial[];
  presentation: "eligible" | "excluded";
  exclusionReason?: "conversion" | "judgement" | "already-presented-play" | "previously-read-judgement" | "ambiguous-owner";
};

export type PublicDiscardSettlementCopy = {
  eventId: string;
  order: number;
  cards: readonly PublicDiscardCardFace[] | null;
  headline: string;
  segments?: readonly PublicH4Segment[];
  accessibleLabel: string;
};

/** Matches one renderer to the canonical proof by event and the complete ordered physical-card set. */
export function publicDiscardSettlementForMaterials(input: {
  settlements: readonly CanonicalPublicDiscardSettlement[];
  eventId: string;
  physicalCardIds: readonly string[];
}): CanonicalPublicDiscardSettlement | null {
  if (!nonEmpty(input.eventId) || input.physicalCardIds.length === 0
    || input.physicalCardIds.some((id) => !nonEmpty(id))
    || new Set(input.physicalCardIds).size !== input.physicalCardIds.length) return null;
  const matches = input.settlements.filter((settlement) => settlement.semantics === "PROVEN"
    && settlement.visibility === "PUBLIC" && settlement.presentation === "eligible"
    && settlement.eventId === input.eventId
    && settlement.materials.length === input.physicalCardIds.length
    && settlement.materials.every((material, index) => material.physicalCardId === input.physicalCardIds[index]));
  return matches.length === 1 ? matches[0] : null;
}

type Endpoint = { zone: string; ownerId: string | null; slot?: string };
type EventWithDiscardProof = PresentationV2Event & {
  publicSequence?: number;
  publicDismantleSettlement?: unknown;
  publicCardEffects?: unknown;
  publicZoneTransitions?: unknown;
  publicZoneTransition?: unknown;
  publicDiscardContext?: unknown;
  actorId?: string;
};

const RANKS = new Set<CardRank>(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]);
const SUITS = new Set<CardSuit>(["♥", "♦", "♣", "♠"]);
const SOURCE_KINDS = new Set<PublicOutcomeSourceKind>(["card", "skill", "phase", "damage", "recovery", "equipment", "judgement", "group", "other"]);
const EQUIPMENT_SLOTS = new Set(["weapon", "armor", "offensiveHorse", "defensiveHorse"]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function physicalCard(value: unknown): Card | null {
  const item = record(value);
  if (!item || !nonEmpty(item.id) || typeof item.kind !== "string" || !CARD_KINDS.includes(item.kind as CardKind)
    || typeof item.rank !== "string" || !RANKS.has(item.rank as CardRank)
    || typeof item.suit !== "string" || !SUITS.has(item.suit as CardSuit)) return null;
  return { id: item.id, kind: item.kind as CardKind, rank: item.rank as CardRank, suit: item.suit as CardSuit };
}

function eventCards(event: EventWithDiscardProof): readonly Card[] | null {
  if (event.type === "card") {
    const card = physicalCard(event.card);
    return card ? [card] : null;
  }
  if (event.type !== "cards" || !Array.isArray(event.cards) || event.cards.length === 0) return null;
  const cards = event.cards.map(physicalCard);
  return cards.every((card): card is Card => Boolean(card)) && new Set(cards.map((card) => card.id)).size === cards.length ? cards : null;
}

function eventCardRefs(event: EventWithDiscardProof): readonly { physicalCardId: string; card: Card | null }[] | null {
  const rawCards = event.type === "card" ? [event.card] : event.type === "cards" && Array.isArray(event.cards) ? event.cards : null;
  if (!rawCards?.length) return null;
  const refs = rawCards.map((raw) => {
    const item = record(raw);
    if (!item || !nonEmpty(item.id) || typeof item.kind !== "string" || !CARD_KINDS.includes(item.kind as CardKind)) return null;
    return { physicalCardId: item.id, card: physicalCard(item) };
  });
  return refs.every((ref): ref is { physicalCardId: string; card: Card | null } => Boolean(ref))
    && new Set(refs.map((ref) => ref.physicalCardId)).size === refs.length ? refs : null;
}

function sameCards(left: readonly Card[], right: readonly Card[]): boolean {
  return left.length === right.length && left.every((card, index) => {
    const expected = right[index];
    return expected && card.id === expected.id && card.kind === expected.kind && card.rank === expected.rank && card.suit === expected.suit;
  });
}

function publicEvent(event: EventWithDiscardProof, eventCounts: ReadonlyMap<string, number>): boolean {
  return nonEmpty(event.id) && eventCounts.get(event.id) === 1 && event.presentation !== false
    && typeof event.privateToPlayerId !== "string" && (event.type === "card" || event.type === "cards")
    && Number.isSafeInteger(event.publicSequence) && (event.publicSequence ?? -1) >= 0;
}

function publicDiscardContext(event: EventWithDiscardProof): {
  mode: PublicDiscardSettlementMode;
  source: { kind: PublicOutcomeSourceKind; label?: string; providerId?: string };
  activationOwnerId?: string;
  rootEventId?: string;
  resolutionId?: string;
} | null {
  const context = record(event.publicDiscardContext);
  const source = sourceValue(context?.source);
  const modes = new Set<PublicDiscardSettlementMode>(["self", "forced", "direct", "cost", "effect", "equipment-replacement", "defeat", "lord-punishment"]);
  if (!context || context.semantics !== "PROVEN" || context.eventId !== event.id
    || typeof context.mode !== "string" || !modes.has(context.mode as PublicDiscardSettlementMode) || !source
    || context.activationOwnerId !== undefined && !nonEmpty(context.activationOwnerId)
    || context.rootEventId !== undefined && !nonEmpty(context.rootEventId)
    || context.resolutionId !== undefined && (!nonEmpty(context.resolutionId) || context.resolutionId !== event.resolutionId)) return null;
  if ((context.mode === "self" || context.mode === "equipment-replacement" || context.mode === "lord-punishment")
    && context.activationOwnerId !== event.actorId) return null;
  return {
    mode: context.mode as PublicDiscardSettlementMode,
    source,
    ...(typeof context.activationOwnerId === "string" ? { activationOwnerId: context.activationOwnerId } : {}),
    ...(typeof context.rootEventId === "string" ? { rootEventId: context.rootEventId } : {}),
    ...(typeof context.resolutionId === "string" ? { resolutionId: context.resolutionId } : {}),
  };
}

function sourceValue(value: unknown): { kind: PublicOutcomeSourceKind; label?: string; providerId?: string } | null {
  const item = record(value);
  if (!item || typeof item.kind !== "string" || !SOURCE_KINDS.has(item.kind as PublicOutcomeSourceKind)) return null;
  if (item.label !== undefined && (!nonEmpty(item.label) || item.label.length > 80)) return null;
  if (item.providerId !== undefined && (!nonEmpty(item.providerId) || item.providerId.length > 100)) return null;
  return { kind: item.kind as PublicOutcomeSourceKind, ...(typeof item.label === "string" ? { label: item.label.trim() } : {}), ...(typeof item.providerId === "string" ? { providerId: item.providerId.trim() } : {}) };
}

function eventFact(eventId: string, facts: readonly PublicPresentationEvent[]): PublicPresentationEvent | null {
  const matches = facts.filter((fact) => fact.eventId === eventId && fact.visibility === "PUBLIC" && fact.semantics === "PROVEN");
  return matches.length === 1 ? matches[0] : null;
}

function rootMatches(events: readonly EventWithDiscardProof[], counts: ReadonlyMap<string, number>, event: EventWithDiscardProof, rootEventId: string, resolutionId?: string): boolean {
  if (rootEventId === event.id) return resolutionId === undefined || resolutionId === event.resolutionId;
  if (counts.get(rootEventId) !== 1) return false;
  const root = events.find((candidate) => candidate.id === rootEventId);
  return Boolean(root && root.presentation !== false && typeof root.privateToPlayerId !== "string"
    && (root.type === "card" || root.type === "cards")
    && (root.action === "play" || root.action === "equip" || root.action === "activate" || root.action === "discard" || root.action === "reveal")
    && (!resolutionId || root.resolutionId === resolutionId));
}

function hasExcludedEffectClass(event: EventWithDiscardProof): boolean {
  return Array.isArray(event.publicCardEffects) && event.publicCardEffects.some((proof) => {
    const effectClass = record(proof)?.effectClass;
    return effectClass === "CONVERSION" || effectClass === "JUDGEMENT";
  });
}

function sourceFor(
  proofSource: PresentationPublicCardEffectSource | undefined,
  fact: PublicPresentationEventFactProjection | null,
  fallbackKind: PublicOutcomeSourceKind = "other",
): { kind: PublicOutcomeSourceKind; label?: string; providerId?: string } {
  const typed = sourceValue(proofSource);
  if (typed) return typed;
  const committed = sourceValue(fact?.committedOutcome?.source);
  if (committed) return committed;
  if (fact?.label && nonEmpty(fact.label) && fact.label.length <= 80) return { kind: fallbackKind, label: fact.label.trim() };
  if (fact?.effect?.label && nonEmpty(fact.effect.label) && fact.effect.label.length <= 80) return { kind: fallbackKind, label: fact.effect.label.trim() };
  return { kind: fallbackKind };
}

function zone(value: unknown): "HAND" | "EQUIPMENT" | "JUDGEMENT" | null {
  return value === "HAND" || value === "EQUIPMENT" || value === "JUDGEMENT" ? value : null;
}

function endpoint(value: unknown): Endpoint | null {
  const item = record(value);
  if (!item || typeof item.zone !== "string") return null;
  const sourceZone = zone(item.zone);
  if (sourceZone) {
    if (!nonEmpty(item.ownerId)) return null;
    if (sourceZone === "EQUIPMENT") return typeof item.slot === "string" && EQUIPMENT_SLOTS.has(item.slot)
      ? { zone: sourceZone, ownerId: item.ownerId, slot: item.slot } : null;
    return item.slot === undefined ? { zone: sourceZone, ownerId: item.ownerId } : null;
  }
  return item.zone === "DISCARD" && item.ownerId === null && item.slot === undefined ? { zone: "DISCARD", ownerId: null } : null;
}

function transitionsFor(event: EventWithDiscardProof, cards: readonly { physicalCardId: string; card: Card | null }[], expectedRootEventId = event.id): PublicDiscardSettlementMaterial[] | null {
  const hasPlural = event.publicZoneTransitions !== undefined;
  const hasSingular = event.publicZoneTransition !== undefined;
  if (hasPlural === hasSingular) return null;
  const candidates = hasPlural
    ? Array.isArray(event.publicZoneTransitions) ? event.publicZoneTransitions : null
    : cards.length === 1 ? [event.publicZoneTransition] : null;
  if (!candidates || candidates.length !== cards.length) return null;
  const raw = candidates.map(record);
  if (raw.some((transition) => !transition)) return null;
  const transitions = raw as Record<string, unknown>[];
  if (new Set(transitions.map((transition) => transition.physicalCardId)).size !== transitions.length) return null;
  const result: PublicDiscardSettlementMaterial[] = [];
  for (let index = 0; index < cards.length; index++) {
    const transition = transitions[index];
    const card = cards[index];
    const from = endpoint(transition?.from);
    const to = endpoint(transition?.to);
    const fromZone = zone(from?.zone);
    if (!transition || !from || !to || transition.semantics !== "PROVEN" || transition.visibility !== "PUBLIC"
      || transition.eventId !== event.id || transition.sourceEventId !== event.id
      || transition.rootEventId !== expectedRootEventId
      || !nonEmpty(transition.physicalCardId) || transition.physicalCardId !== card.physicalCardId
      || to.zone !== "DISCARD" || !fromZone) return null;
    result.push({ card: card.card, physicalCardId: card.physicalCardId, ownerId: from.ownerId, fromZone, ...(from.slot ? { fromSlot: from.slot as PublicDiscardSettlementMaterial["fromSlot"] } : {}), toZone: "DISCARD" });
  }
  return result;
}

function factMatchesMaterials(fact: PublicPresentationEventFactProjection | null, materials: readonly PublicDiscardSettlementMaterial[]): boolean {
  const changes = fact?.committedOutcome?.changes;
  if (!changes) return true;
  const expected = new Map<string, number>();
  for (const material of materials) {
    if (!material.ownerId) return false;
    const key = `${material.ownerId}\u001f${material.fromZone}`;
    expected.set(key, (expected.get(key) ?? 0) + 1);
  }
  const actual = new Map<string, number>();
  for (const change of changes) {
    if (change.kind !== "CARD_DISCARDED" || change.toZone !== "DISCARD") continue;
    const key = `${change.playerId}\u001f${change.fromZone}`;
    actual.set(key, (actual.get(key) ?? 0) + change.amount);
  }
  return expected.size === actual.size && [...expected].every(([key, amount]) => actual.get(key) === amount);
}

function modeFromFact(fact: PublicPresentationEventFactProjection | null): PublicDiscardSettlementMode {
  const kind = fact?.effect?.kind;
  switch (kind) {
    case "turn_end_discard": return "self";
    case "forced_discard": return "forced";
    case "equipment_replacement": return "equipment-replacement";
    case "defeat_discard": return "defeat";
    case "lord_punishment_discard": return "lord-punishment";
    default: return "unknown";
  }
}

function excluded(settlement: Omit<CanonicalPublicDiscardSettlement, "presentation">, reason: NonNullable<CanonicalPublicDiscardSettlement["exclusionReason"]>): CanonicalPublicDiscardSettlement {
  return { ...settlement, presentation: "excluded", exclusionReason: reason };
}

function matchingRawEffect(event: EventWithDiscardProof, proof: PresentationPublicCardEffect): boolean {
  if (!Array.isArray(event.publicCardEffects)) return false;
  const matches = event.publicCardEffects.map(record).filter((raw) => raw?.semantics === "PROVEN"
    && raw.eventId === proof.eventId && raw.effectId === proof.effectId && raw.effectClass === proof.effectClass
    && raw.activationOwnerId === proof.activationOwnerId
    && JSON.stringify(raw.source) === JSON.stringify(proof.source)
    && raw.rootEventId === proof.rootEventId && raw.rootResolutionId === proof.rootResolutionId
    && raw.interactionId === proof.interactionId && raw.rootFrameId === proof.rootFrameId
    && raw.targetId === proof.targetId && JSON.stringify(raw.targetIds) === JSON.stringify(proof.targetIds)
    && raw.outcome === proof.outcome && raw.resultingCardKind === proof.resultingCardKind);
  if (matches.length !== 1) return false;
  const materials = Array.isArray(matches[0]?.materials) ? matches[0]!.materials as unknown[] : [];
  return materials.length === proof.materials.length && materials.every((raw, index) => {
    const item = record(raw);
    const expected = proof.materials[index];
    return item?.cardId === expected.cardId && item.ownerId === expected.ownerId
      && item.fromZone === expected.fromZone && item.toZone === expected.toZone;
  });
}

function matchingRawDismantle(event: EventWithDiscardProof, proof: PresentationDismantleSettlement): boolean {
  const raw = record(event.publicDismantleSettlement);
  if (!raw) return false;
  const optionalCardMatches = (rawValue: unknown, projected: Card | undefined) => {
    if (projected === undefined) return rawValue === undefined;
    const parsed = physicalCard(rawValue);
    return Boolean(parsed && sameCards([parsed], [projected]));
  };
  return raw.semantics === "PROVEN" && raw.rootEventId === proof.rootEventId
    && raw.rootResolutionId === proof.rootResolutionId && raw.sourceId === proof.sourceId
    && raw.targetId === proof.targetId && raw.outcome === proof.outcome
    && raw.sourceZone === proof.sourceZone && raw.affectedCardOwnerId === proof.affectedCardOwnerId
    && raw.destinationZone === proof.destinationZone && raw.destinationOwnerId === proof.destinationOwnerId
    && raw.rootInteractionId === proof.rootInteractionId && raw.rootFrameId === proof.rootFrameId
    && raw.resultingCardKind === proof.resultingCardKind
    && optionalCardMatches(raw.affectedCardFace, proof.affectedCardFace)
    && optionalCardMatches(raw.rootPhysicalCard, proof.rootPhysicalCard);
}

/**
 * Normalizes only already committed server proof. It returns excluded records
 * for known non-discard movements so callers cannot accidentally route them as
 * a fresh discard reveal.
 */
export function normalizePublicDiscardSettlements(input: {
  timeline: readonly PresentationV2Event[];
  publicCardEffects: readonly PresentationPublicCardEffect[];
  dismantleSettlements: readonly PresentationDismantleSettlement[];
  publicEventFacts: readonly PublicPresentationEvent[];
}): CanonicalPublicDiscardSettlement[] {
  const events = input.timeline as readonly EventWithDiscardProof[];
  const counts = new Map<string, number>();
  const orderCounts = new Map<number, number>();
  for (const event of events) {
    if (nonEmpty(event.id)) counts.set(event.id, (counts.get(event.id) ?? 0) + 1);
    if (Number.isSafeInteger(event.publicSequence)) orderCounts.set(event.publicSequence!, (orderCounts.get(event.publicSequence!) ?? 0) + 1);
  }
  const settlements: CanonicalPublicDiscardSettlement[] = [];
  const specializedEventIds = new Set<string>();

  for (const proof of input.dismantleSettlements) {
    const event = events.find((candidate) => candidate.id === proof.eventId);
    if (!event || !publicEvent(event, counts) || orderCounts.get(event.publicSequence!) !== 1
      || !matchingRawDismantle(event, proof) || event.action !== "discard" || event.type !== "card"
      || event.finalResult !== true || !record(event.publicDismantleSettlement)
      || !proof.affectedCardFace || proof.destinationZone !== "discard" || proof.destinationOwnerId !== null
      || !proof.sourceId || !proof.targetId || proof.rootResolutionId !== event.resolutionId) continue;
    if (!rootMatches(events, counts, event, proof.rootEventId, proof.rootResolutionId)) continue;
    const cards = eventCards(event);
    const selected = physicalCard(proof.affectedCardFace);
    if (!cards || cards.length !== 1 || !selected || !sameCards(cards, [selected])) continue;
    specializedEventIds.add(event.id);
    const sourceZone = proof.sourceZone === "hand" ? "HAND" : proof.sourceZone === "equipment" ? "EQUIPMENT" : proof.sourceZone === "judgement" ? "JUDGEMENT" : null;
    if (!sourceZone) continue;
    const ownerId = proof.affectedCardOwnerId;
    if (sourceZone === "JUDGEMENT" ? ownerId !== null : ownerId !== proof.targetId) continue;
    const transitions = transitionsFor(event, [{ physicalCardId: selected.id, card: selected }], proof.rootEventId);
    if (sourceZone === "EQUIPMENT" && !transitions?.[0]?.fromSlot) continue;
    const transitionOwnerId = sourceZone === "JUDGEMENT" ? proof.targetId : ownerId;
    if (transitions && (transitions[0].ownerId !== transitionOwnerId || transitions[0].fromZone !== sourceZone)) continue;
    const base: Omit<CanonicalPublicDiscardSettlement, "presentation"> = {
      semantics: "PROVEN", visibility: "PUBLIC", eventId: event.id, order: event.publicSequence!,
      rootEventId: proof.rootEventId, resolutionId: proof.rootResolutionId,
      ...(proof.rootInteractionId ? { interactionId: proof.rootInteractionId } : {}),
      ...(proof.rootFrameId ? { frameId: proof.rootFrameId } : {}),
      activationOwnerId: proof.sourceId, affectedPlayerIds: [proof.targetId],
      source: { kind: "card", label: "Dismantle", providerId: "dismantle" }, mode: "direct",
      materials: [{ card: selected, physicalCardId: selected.id, ownerId, ...(sourceZone === "JUDGEMENT" ? { affectedPlayerId: proof.targetId } : {}), fromZone: sourceZone, ...(transitions?.[0]?.fromSlot ? { fromSlot: transitions[0].fromSlot } : {}), toZone: "DISCARD" }],
    };
    settlements.push(sourceZone === "JUDGEMENT" ? excluded(base, "previously-read-judgement") : { ...base, presentation: "eligible" });
  }

  for (const proof of input.publicCardEffects) {
    if (!proof.materials.some((material) => material.toZone === "DISCARD")) continue;
    const event = events.find((candidate) => candidate.id === proof.eventId);
    const cards = event ? eventCards(event) : null;
    if (!event || !publicEvent(event, counts) || orderCounts.get(event.publicSequence!) !== 1
      || !cards || !matchingRawEffect(event, proof) || !sameCards(cards, proof.cards)) continue;
    specializedEventIds.add(event.id);
    const discardMaterials = proof.materials.filter((material) => material.toZone === "DISCARD");
    const materials: PublicDiscardSettlementMaterial[] = [];
    let materialsValid = true;
    for (const material of discardMaterials) {
      const sourceZone = zone(material.fromZone);
      const card = proof.cards[proof.materials.indexOf(material)];
      if (!sourceZone || sourceZone === "JUDGEMENT" && proof.effectClass !== "JUDGEMENT"
        || !material.ownerId || !card) {
        materialsValid = false;
        break;
      }
      materials.push({ card, physicalCardId: card.id, ownerId: material.ownerId, fromZone: sourceZone, toZone: "DISCARD" });
    }
    if (!materialsValid || materials.length !== proof.materials.length) continue;
    const fact = eventFact(event.id, input.publicEventFacts);
    const factMatchesEffectRoot = Boolean(fact && proof.rootEventId && fact.rootEventId === proof.rootEventId);
    const source = sourceFor(proof.source, fact, proof.effectClass === "EFFECT" ? "equipment" : "skill");
    const ownerIds = materials.flatMap((material) => material.ownerId ? [material.ownerId] : []);
    const base: Omit<CanonicalPublicDiscardSettlement, "presentation"> = {
      semantics: "PROVEN", visibility: "PUBLIC", eventId: event.id, order: event.publicSequence!,
      ...(proof.rootEventId ? { rootEventId: proof.rootEventId } : {}),
      ...(proof.rootResolutionId ? { resolutionId: proof.rootResolutionId } : event.resolutionId ? { resolutionId: event.resolutionId } : {}),
      ...((proof.interactionId ?? (factMatchesEffectRoot ? fact?.identity.interactionId : undefined))
        ? { interactionId: proof.interactionId ?? fact?.identity.interactionId } : {}),
      ...((proof.rootFrameId ?? (factMatchesEffectRoot ? fact?.identity.rootFrameId : undefined))
        ? { frameId: proof.rootFrameId ?? fact?.identity.rootFrameId } : {}),
      activationOwnerId: proof.activationOwnerId, affectedPlayerIds: [...new Set([...(proof.targetId ? [proof.targetId] : []), ...ownerIds])],
      source, mode: proof.effectClass === "COST"
        ? ownerIds.length > 0 && ownerIds.every((id) => id !== proof.activationOwnerId) ? "forced" : "cost"
        : "effect",
      materials,
    };
    if (proof.effectClass === "CONVERSION") settlements.push(excluded(base, "conversion"));
    else if (proof.effectClass === "JUDGEMENT") settlements.push(excluded(base, "judgement"));
    else if ((event.action === "play" || event.action === "reveal") && proof.effectClass !== "COST") settlements.push(excluded(base, "already-presented-play"));
    else {
      const rootEventId = proof.rootEventId ?? fact?.rootEventId ?? event.id;
      const transitions = Array.isArray(event.publicZoneTransitions) ? transitionsFor(event, cards.map((card) => ({ physicalCardId: card.id, card })), rootEventId) : null;
      if (transitions) {
        const aligned = transitions.length === materials.length && transitions.every((transition, index) => {
          const material = materials[index];
          return transition.physicalCardId === material.physicalCardId && transition.ownerId === material.ownerId
            && transition.fromZone === material.fromZone && transition.toZone === material.toZone;
        });
        if (!aligned) continue;
        for (let index = 0; index < materials.length; index++) materials[index] = { ...materials[index], ...(transitions[index].fromSlot ? { fromSlot: transitions[index].fromSlot } : {}) };
      }
      if (materials.some((material) => material.fromZone === "JUDGEMENT")) settlements.push(excluded(base, "previously-read-judgement"));
      else if (!factMatchesMaterials(fact, materials)) continue;
      else settlements.push({ ...base, materials, presentation: "eligible" });
    }
  }

  for (const event of events) {
    if (!publicEvent(event, counts) || orderCounts.get(event.publicSequence!) !== 1
      || specializedEventIds.has(event.id) || hasExcludedEffectClass(event) || event.action !== "discard") continue;
    const cards = eventCardRefs(event);
    if (!cards) continue;
    const context = publicDiscardContext(event);
    if (event.publicDiscardContext !== undefined && !context) continue;
    const fact = eventFact(event.id, input.publicEventFacts);
    const rootEventId = context?.rootEventId ?? fact?.rootEventId ?? event.id;
    if (!rootMatches(events, counts, event, rootEventId, context?.resolutionId ?? event.resolutionId)) continue;
    const materials = transitionsFor(event, cards, rootEventId);
    if (!materials || materials.some((material) => material.ownerId !== event.actorId)) continue;
    if (!factMatchesMaterials(fact, materials)) continue;
    const mode = context?.mode ?? modeFromFact(fact);
    const source = context?.source ?? sourceFor(undefined, fact);
    const base: Omit<CanonicalPublicDiscardSettlement, "presentation"> = {
      semantics: "PROVEN", visibility: "PUBLIC", eventId: event.id, order: event.publicSequence!,
      rootEventId,
      ...(context?.resolutionId ? { resolutionId: context.resolutionId } : event.resolutionId ? { resolutionId: event.resolutionId } : {}),
      ...(fact?.rootEventId === rootEventId && fact.identity.interactionId ? { interactionId: fact.identity.interactionId } : {}),
      ...(fact?.rootEventId === rootEventId && fact.identity.rootFrameId ? { frameId: fact.identity.rootFrameId } : {}),
      activationOwnerId: context?.activationOwnerId ?? fact?.actorId ?? event.actorId,
      affectedPlayerIds: [...new Set(materials.flatMap((material) => material.ownerId ? [material.ownerId] : []))],
      source, mode,
      materials,
    };
    settlements.push(materials.some((material) => material.fromZone === "JUDGEMENT")
      ? excluded(base, "previously-read-judgement") : { ...base, presentation: "eligible" });
  }

  const eligibleClaimCounts = new Map<string, number>();
  for (const settlement of settlements) {
    if (settlement.presentation !== "eligible") continue;
    const key = JSON.stringify([settlement.eventId, settlement.materials.map((material) => material.physicalCardId)]);
    eligibleClaimCounts.set(key, (eligibleClaimCounts.get(key) ?? 0) + 1);
  }
  return settlements.map((settlement) => {
    if (settlement.presentation !== "eligible") return settlement;
    const key = JSON.stringify([settlement.eventId, settlement.materials.map((material) => material.physicalCardId)]);
    return eligibleClaimCounts.get(key) === 1 ? settlement : excluded(settlement, "ambiguous-owner");
  }).sort((left, right) => left.order - right.order || left.eventId.localeCompare(right.eventId));
}

function namedPlayer(players: readonly { id: string; name: string }[], id: string | null | undefined): { id: string; name: string } | null {
  if (!id) return null;
  const matches = players.filter((player) => player.id === id && nonEmpty(player.name));
  return matches.length === 1 ? { id, name: matches[0].name.trim() } : null;
}

/** Formats only a canonical committed settlement, preserving verified player spans. */
export function publicDiscardSettlementCopy(input: {
  settlement: CanonicalPublicDiscardSettlement;
  players: readonly { id: string; name: string }[];
  committedOutcome?: PublicPresentationEvent["committedOutcome"];
  publicEventFacts?: readonly PublicPresentationEvent[];
}): PublicDiscardSettlementCopy | null {
  const { settlement, players } = input;
  if (settlement.presentation !== "eligible" || settlement.visibility !== "PUBLIC" || !settlement.materials.length) return null;
  const completeCards = settlement.materials.every(({ card }) => Boolean(card))
    ? publicDiscardCardFaces(settlement.materials.map(({ card }) => card!)) : null;
  const cards = completeCards && completeCards.length === settlement.materials.length ? completeCards : null;
  const ownerIds = [...new Set(settlement.materials.map((material) => material.ownerId ?? material.affectedPlayerId).filter((id): id is string => Boolean(id)))];
  const owners = ownerIds.map((id) => namedPlayer(players, id));
  if (owners.some((owner) => !owner)) return null;
  const owner = owners.length === 1 ? owners[0]! : null;
  const actor = namedPlayer(players, settlement.activationOwnerId);
  const count = settlement.materials.length;
  const noun = count === 1 ? "card" : "cards";
  const cardList = cards ? publicDiscardCardList(cards) : null;
  const detail = cardList ? `: ${cardList}` : "";
  const namedSingle = count === 1 && cardList ? `’s ${cardList}` : null;
  const parts: Array<string | { id: string; name: string }> = [];

  if ((settlement.mode === "direct" || settlement.mode === "forced" || settlement.mode === "cost" || settlement.mode === "effect")
    && !actor && owner) {
    parts.push(`Publicly discarded ${count} ${noun} from `, owner, `${detail}.`);
  } else if (settlement.mode === "direct" && actor && owner) {
    parts.push(actor, ` used ${settlement.source.label ?? "Dismantle"} to discard `, owner,
      namedSingle ? `${namedSingle}.` : `’s ${count} ${noun}${detail}.`);
  } else if (settlement.mode === "forced" && actor && owner) {
    parts.push(actor, ` used ${settlement.source.label ?? "an effect"}, causing `, owner, ` to discard ${count} ${noun}${detail}.`);
  } else if ((settlement.mode === "cost" || settlement.mode === "effect") && actor && owner) {
    if (actor.id === owner.id) parts.push(actor, ` used ${settlement.source.label ?? "an effect"} and discarded ${count} ${noun}${detail}.`);
    else if (namedSingle) parts.push(actor, ` used ${settlement.source.label ?? "an effect"} to discard `, owner, namedSingle, ".");
    else parts.push(actor, ` used ${settlement.source.label ?? "an effect"} to discard ${count} ${noun} from `, owner, `${detail}.`);
  } else if (settlement.mode === "equipment-replacement" && owner) {
    parts.push(owner, ` lost ${count} Equipment ${noun} during replacement${detail}.`);
  } else if (settlement.mode === "defeat" && owner) {
    parts.push(owner, `’s ${count === 1 ? "card was" : "cards were"} discarded after defeat${detail}.`);
  } else if (settlement.mode === "lord-punishment" && owner) {
    parts.push(owner, ` discarded ${count} ${noun} as the Lord’s penalty${detail}.`);
  } else if (settlement.mode === "self" && owner) {
    parts.push(owner, ` discarded ${count} ${noun}${detail}.`);
  } else if (owner) {
    parts.push(owner, ` discarded ${count} ${noun}${detail}.`);
  } else {
    parts.push(`Publicly discarded ${count} ${noun}${detail}.`);
  }
  const { message: headline, segments } = publicH4Copy(parts);
  let message = headline;
  let headlineSegments = segments;
  const committedOutcome = input.committedOutcome;
  if (committedOutcome) {
    if (committedOutcome.semantics !== "PROVEN" || committedOutcome.visibility !== "PUBLIC"
      || committedOutcome.eventId !== settlement.eventId
      || settlement.rootEventId && committedOutcome.rootEventId !== settlement.rootEventId
      || !Array.isArray(committedOutcome.changes)) return null;
    const expectedDiscardCounts = new Map<string, number>();
    for (const material of settlement.materials) {
      if (!material.ownerId) return null;
      const key = `${material.ownerId}\u001f${material.fromZone}`;
      expectedDiscardCounts.set(key, (expectedDiscardCounts.get(key) ?? 0) + 1);
    }
    const actualDiscardCounts = new Map<string, number>();
    for (const change of committedOutcome.changes) {
      if (change.kind !== "CARD_DISCARDED" || change.toZone !== "DISCARD") continue;
      const key = `${change.playerId}\u001f${change.fromZone}`;
      actualDiscardCounts.set(key, (actualDiscardCounts.get(key) ?? 0) + change.amount);
    }
    if (expectedDiscardCounts.size !== actualDiscardCounts.size
      || [...expectedDiscardCounts].some(([key, amount]) => actualDiscardCounts.get(key) !== amount)) return null;
    const otherChanges = committedOutcome.changes.filter((change) => change.kind !== "CARD_DISCARDED");
    if (otherChanges.length) {
      const additional = formatCommittedPublicOutcomeWithSegments({
        ...committedOutcome,
        actorId: undefined,
        source: { kind: "other" },
        changes: otherChanges,
      }, players,
        input.publicEventFacts);
      if (!additional) return null;
      message = `${headline} ${additional.message}`;
      headlineSegments = [...segments, { kind: "text", text: " " }, ...additional.segments];
    }
  }
  return { eventId: settlement.eventId, order: settlement.order, cards, headline: message, segments: headlineSegments, accessibleLabel: message };
}

/** Formats a canonical settlement with only its unique same-event public outcome. */
export function publicDiscardSettlementCopyForFacts(input: {
  settlement: CanonicalPublicDiscardSettlement;
  players: readonly { id: string; name: string }[];
  publicEventFacts: readonly PublicPresentationEvent[];
}): PublicDiscardSettlementCopy | null {
  const matches = input.publicEventFacts.filter((fact) => fact.eventId === input.settlement.eventId
    && fact.semantics === "PROVEN" && fact.visibility === "PUBLIC");
  if (matches.length > 1) return null;
  return publicDiscardSettlementCopy({
    settlement: input.settlement,
    players: input.players,
    committedOutcome: matches[0]?.committedOutcome,
    publicEventFacts: input.publicEventFacts,
  });
}
