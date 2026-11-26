import { judgementResolutionFor, judgementSucceeds, type JudgementPurpose } from "./decisions/judgement";
import { CARD_DEFINITIONS } from "./cards";
import type { Card, CardKind, CardRank, CardSuit } from "./model";
import { verifiedPlayerCopy, type VerifiedPlayerCopySegment } from "./verified-player-copy";
import type { PublicInteractionNarration } from "./public-activity";

export type PublicJudgementStatus = "satisfied" | "unsatisfied";
export type PublicJudgementContinuationKind = "luoshen" | "delayed" | "attack_targeted" | "response" | "damage_suffered";

/**
 * Server-owned metadata attached to the original public reveal. It contains no
 * selected Hand identity; a replacement is represented only after commitment.
 */
export type PublicJudgementPresentationRecord = {
  semantics: "PROVEN";
  visibility: "PUBLIC";
  judgementId: string;
  targetId: string;
  judgingPlayerId: string;
  purpose: JudgementPurpose;
  continuationKind: PublicJudgementContinuationKind;
  sourceCard?: PublicJudgementCardFace;
  resolutionId?: string;
  causal?: { interactionId: string; frameId: string; parentFrameId?: string };
  stage: "OPEN" | "FINAL" | "UNVERIFIED";
  originalStatus: PublicJudgementStatus;
  finalStatus?: PublicJudgementStatus;
  replacementEventId?: string;
  replacementActorId?: string;
};

export type PublicJudgementCardFace = {
  id: string;
  kind: CardKind;
  suit: CardSuit;
  rank: CardRank;
};

export type PublicJudgementPresentation = {
  semantics: "PROVEN";
  visibility: "PUBLIC";
  judgementId: string;
  eventId: string;
  order: number;
  phase: "ORIGINAL" | "REPLACEMENT";
  status: "PROVISIONAL" | "FINAL";
  targetId: string;
  judgingPlayerId: string;
  purpose: JudgementPurpose;
  continuationKind: PublicJudgementContinuationKind;
  sourceCard?: PublicJudgementCardFace;
  resolutionId?: string;
  causal?: { interactionId: string; frameId: string; parentFrameId?: string };
  originalCard: PublicJudgementCardFace;
  effectiveCard: PublicJudgementCardFace;
  judgementStatus: PublicJudgementStatus;
  replacement?: {
    eventId: string;
    actorId: string;
    materialOwnerId: string;
    physicalCardId: string;
    fromZone: "HAND";
    toZone: "JUDGEMENT";
    effectId: "sima_yi_guicai";
  };
  copy: { message: string; segments: readonly VerifiedPlayerCopySegment[] };
};

type PublicTimelineEvent = {
  id?: unknown;
  type?: unknown;
  player?: unknown;
  target?: unknown;
  card?: unknown;
  action?: unknown;
  judgement?: unknown;
  presentation?: unknown;
  privateToPlayerId?: unknown;
  publicSequence?: unknown;
  resolutionId?: unknown;
  publicJudgementPresentation?: unknown;
  publicCardEffects?: unknown;
};

type PublicJudgementPlayer = { id: string; name: string; hero?: string | null };
type ProjectedJudgementEffect = {
  semantics: "PROVEN";
  eventId: string;
  effectId: string;
  effectClass: string;
  activationOwnerId: string;
  targetId?: string;
  outcome?: string;
  rootEventId?: string;
  rootResolutionId?: string;
  interactionId?: string;
  rootFrameId?: string;
  materials: readonly { cardId: string; ownerId: string | null; fromZone: string; toZone: string }[];
  cards: readonly { id: string; kind: string; suit: string; rank: string }[];
};

const JUDGEMENT_PURPOSES = new Set<JudgementPurpose>([
  "ganglie", "luoshen", "cavalry", "eight_trigrams", "overindulgence", "rations_depleted", "lightning",
]);
const CARD_SUITS = new Set<CardSuit>(["♥", "♦", "♣", "♠"]);
const CARD_RANKS = new Set<CardRank>(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function publicCardFace(value: unknown): PublicJudgementCardFace | null {
  const candidate = record(value);
  if (!candidate || !nonEmptyString(candidate.id) || typeof candidate.kind !== "string"
    || !Object.hasOwn(CARD_DEFINITIONS, candidate.kind)
    || typeof candidate.suit !== "string" || !CARD_SUITS.has(candidate.suit as CardSuit)
    || typeof candidate.rank !== "string" || !CARD_RANKS.has(candidate.rank as CardRank)) return null;
  return {
    id: candidate.id,
    kind: candidate.kind as CardKind,
    suit: candidate.suit as CardSuit,
    rank: candidate.rank as CardRank,
  };
}

function statusFor(purpose: JudgementPurpose, card: PublicJudgementCardFace): PublicJudgementStatus {
  return judgementSucceeds(purpose, card as Card) ? "satisfied" : "unsatisfied";
}

function statusCopy(status: PublicJudgementStatus) {
  return status === "satisfied" ? "Match." : "Not Match.";
}

function eventCard(event: PublicTimelineEvent | undefined): PublicJudgementCardFace | null {
  return publicCardFace(event?.card);
}

function copyFor(input: {
  phase: "ORIGINAL" | "REPLACEMENT";
  purpose: JudgementPurpose;
  continuationKind: PublicJudgementContinuationKind;
  target: PublicJudgementPlayer;
  originalCard: PublicJudgementCardFace;
  effectiveCard: PublicJudgementCardFace;
  judgementStatus: PublicJudgementStatus;
  includeStatus: boolean;
  replacementActor?: PublicJudgementPlayer;
}): { message: string; segments: readonly VerifiedPlayerCopySegment[] } | null {
  const label = judgementResolutionFor(input.purpose).label;
  const originalLead = input.continuationKind === "delayed"
    ? [input.target, ` is judging ${label}. Judgement: ${input.originalCard.rank}${input.originalCard.suit}.`]
    : [input.target, ` used ${label}. Judgement: ${input.originalCard.rank}${input.originalCard.suit}.`];
  if (input.phase === "ORIGINAL") {
    const formatted = verifiedPlayerCopy(input.includeStatus ? [...originalLead, ` ${statusCopy(input.judgementStatus)}`] : originalLead);
    return { message: formatted.message, segments: formatted.segments };
  }
  if (!input.replacementActor) return null;
  const replacementLine = verifiedPlayerCopy([
    input.replacementActor,
    ` used Necromancy to replace the Judgement card with ${input.effectiveCard.rank}${input.effectiveCard.suit}. ${statusCopy(input.judgementStatus)}`,
  ]);
  const firstLine = verifiedPlayerCopy(originalLead);
  const segments = [...firstLine.segments, { kind: "text" as const, text: "\n" }, ...replacementLine.segments];
  return { message: segments.map((segment) => segment.text).join(""), segments };
}

function expectedContinuation(purpose: JudgementPurpose): PublicJudgementContinuationKind {
  switch (purpose) {
    case "ganglie": return "damage_suffered";
    case "luoshen": return "luoshen";
    case "cavalry": return "attack_targeted";
    case "eight_trigrams": return "response";
    case "overindulgence":
    case "rations_depleted":
    case "lightning": return "delayed";
  }
}

function sameFace(left: PublicJudgementCardFace, right: PublicJudgementCardFace) {
  return left.id === right.id && left.kind === right.kind && left.suit === right.suit && left.rank === right.rank;
}

function replacementProofFor(input: {
  originalEvent: PublicTimelineEvent;
  replacementEvent: PublicTimelineEvent | undefined;
  replacementId: string;
  replacementActorId: string;
  targetId: string;
  originalCard: PublicJudgementCardFace;
  projectedEffects: readonly ProjectedJudgementEffect[];
  byEventId: ReadonlyMap<string, PublicTimelineEvent>;
  eventIdCounts: ReadonlyMap<string, number>;
  players: readonly PublicJudgementPlayer[];
}): { card: PublicJudgementCardFace; replacement: PublicJudgementPresentation["replacement"]; actor: PublicJudgementPlayer } | null {
  const replacementEvent = input.replacementEvent;
  const replacementCard = eventCard(replacementEvent);
  const originalResolutionId = input.originalEvent.resolutionId;
  if (!replacementEvent || !replacementCard || replacementEvent.type !== "card" || replacementEvent.action !== "reveal"
    || replacementEvent.judgement !== true || replacementEvent.presentation === false
    || typeof replacementEvent.privateToPlayerId === "string"
    || replacementEvent.id !== input.replacementId || input.eventIdCounts.get(input.replacementId) !== 1
    || !Number.isSafeInteger(replacementEvent.publicSequence) || !Number.isSafeInteger(input.originalEvent.publicSequence)
    || (replacementEvent.publicSequence as number) <= (input.originalEvent.publicSequence as number)
    || sameFace(replacementCard, input.originalCard)
    || !nonEmptyString(originalResolutionId) || replacementEvent.resolutionId !== originalResolutionId) return null;

  const rawEffects = Array.isArray(replacementEvent.publicCardEffects) ? replacementEvent.publicCardEffects.map(record) : [];
  const matchingRaw = rawEffects.filter((effect) => effect?.effectId === "sima_yi_guicai" && effect.effectClass === "JUDGEMENT");
  const matchingProjected = input.projectedEffects.filter((effect) => effect.eventId === input.replacementId
    && effect.effectId === "sima_yi_guicai" && effect.effectClass === "JUDGEMENT");
  if (matchingRaw.length !== 1 || matchingProjected.length !== 1) return null;
  const raw = matchingRaw[0]!;
  const projected = matchingProjected[0]!;
  const rawMaterials = Array.isArray(raw.materials) ? raw.materials.map(record) : [];
  const [rawMaterial] = rawMaterials;
  const [material] = projected.materials;
  const [projectedCard] = projected.cards;
  if (raw.semantics !== "PROVEN" || raw.eventId !== input.replacementId
    || raw.activationOwnerId !== input.replacementActorId || raw.targetId !== input.targetId
    || raw.outcome !== "REPLACED_JUDGEMENT" || raw.rootEventId !== input.originalEvent.id
    || raw.rootResolutionId !== originalResolutionId || rawMaterials.length !== 1
    || !rawMaterial || rawMaterial.cardId !== replacementCard.id || rawMaterial.ownerId !== input.replacementActorId
    || rawMaterial.fromZone !== "HAND" || rawMaterial.toZone !== "JUDGEMENT"
    || projected.semantics !== "PROVEN" || projected.eventId !== input.replacementId
    || projected.activationOwnerId !== input.replacementActorId || projected.targetId !== input.targetId
    || projected.outcome !== "REPLACED_JUDGEMENT" || projected.rootEventId !== input.originalEvent.id
    || projected.rootResolutionId !== originalResolutionId || projected.materials.length !== 1
    || !material || material.cardId !== replacementCard.id || material.ownerId !== input.replacementActorId
    || material.fromZone !== "HAND" || material.toZone !== "JUDGEMENT"
    || !projectedCard || projectedCard.id !== replacementCard.id || projectedCard.kind !== replacementCard.kind
    || projectedCard.suit !== replacementCard.suit || projectedCard.rank !== replacementCard.rank) return null;

  const actorEvent = input.byEventId.get(input.replacementId);
  const owner = input.players.find((player) => player.id === input.replacementActorId);
  const target = input.players.find((player) => player.id === input.targetId);
  const originalPresentation = record(input.originalEvent.publicJudgementPresentation);
  const originalCausal = record(originalPresentation?.causal);
  if (actorEvent !== replacementEvent || !owner?.name || owner.hero !== "simayi" || !target?.name
    || replacementEvent.player !== owner.name || replacementEvent.target !== target.name
    || input.originalEvent.target !== target.name
    || originalCausal && (raw.interactionId !== originalCausal.interactionId
      || raw.rootFrameId !== originalCausal.frameId
      || projected.interactionId !== originalCausal.interactionId
      || projected.rootFrameId !== originalCausal.frameId)) return null;
  return {
    card: replacementCard,
    replacement: {
      eventId: input.replacementId,
      actorId: owner.id,
      materialOwnerId: owner.id,
      physicalCardId: replacementCard.id,
      fromZone: "HAND",
      toZone: "JUDGEMENT",
      effectId: "sima_yi_guicai",
    },
    actor: owner,
  };
}

/**
 * Projects only server-persisted committed Judgement records. Replacement
 * output requires matching original reveal, raw effect proof and shared
 * validated effect projection; missing proof produces no presentation fact.
 */
export function projectPublicJudgementPresentations(
  timeline: readonly unknown[],
  projectedEffects: readonly ProjectedJudgementEffect[],
  players: readonly PublicJudgementPlayer[],
): PublicJudgementPresentation[] {
  const rows = timeline.map((value) => record(value)).filter((value): value is Record<string, unknown> => Boolean(value));
  const eventIdCounts = new Map<string, number>();
  const orderCounts = new Map<number, number>();
  const byEventId = new Map<string, PublicTimelineEvent>();
  for (const row of rows) {
    if (typeof row.id === "string") {
      eventIdCounts.set(row.id, (eventIdCounts.get(row.id) ?? 0) + 1);
      byEventId.set(row.id, row as PublicTimelineEvent);
    }
    if (Number.isSafeInteger(row.publicSequence)) orderCounts.set(row.publicSequence as number, (orderCounts.get(row.publicSequence as number) ?? 0) + 1);
  }
  const projected: PublicJudgementPresentation[] = [];
  const seenJudgements = new Set<string>();
  for (const row of rows) {
    const originalEvent = row as PublicTimelineEvent;
    const raw = record(row.publicJudgementPresentation);
    if (!raw || row.type !== "card" || row.action !== "reveal" || row.judgement !== true
      || row.presentation === false || typeof row.privateToPlayerId === "string"
      || !nonEmptyString(row.id) || eventIdCounts.get(row.id) !== 1
      || !Number.isSafeInteger(row.publicSequence) || orderCounts.get(row.publicSequence as number) !== 1
      || raw.semantics !== "PROVEN" || raw.visibility !== "PUBLIC" || raw.judgementId !== row.id
      || !nonEmptyString(raw.targetId) || raw.judgingPlayerId !== raw.targetId
      || typeof raw.purpose !== "string" || !JUDGEMENT_PURPOSES.has(raw.purpose as JudgementPurpose)
      || typeof raw.continuationKind !== "string" || !["luoshen", "delayed", "attack_targeted", "response", "damage_suffered"].includes(raw.continuationKind)
      || expectedContinuation(raw.purpose as JudgementPurpose) !== raw.continuationKind
      || !["OPEN", "FINAL", "UNVERIFIED"].includes(String(raw.stage))
      || !["satisfied", "unsatisfied"].includes(String(raw.originalStatus))) continue;
    const judgementId = row.id;
    if (seenJudgements.has(judgementId)) continue;
    seenJudgements.add(judgementId);
    const originalCard = eventCard(originalEvent);
    const target = players.find((player) => player.id === raw.targetId);
    const sourceCard = raw.sourceCard === undefined ? undefined : publicCardFace(raw.sourceCard);
    if (raw.sourceCard !== undefined && !sourceCard) continue;
    if (!originalCard || !target?.name || originalEvent.player !== target.name || originalEvent.target !== target.name
      || statusFor(raw.purpose as JudgementPurpose, originalCard) !== raw.originalStatus
      || !nonEmptyString(originalEvent.resolutionId)
      || raw.resolutionId !== undefined && (!nonEmptyString(raw.resolutionId) || originalEvent.resolutionId !== raw.resolutionId)) continue;
    const rawCausal = record(raw.causal);
    const causal = rawCausal && nonEmptyString(rawCausal.interactionId) && nonEmptyString(rawCausal.frameId)
      && (rawCausal.parentFrameId === undefined || rawCausal.parentFrameId === null || nonEmptyString(rawCausal.parentFrameId))
      ? { interactionId: rawCausal.interactionId, frameId: rawCausal.frameId,
        ...(nonEmptyString(rawCausal.parentFrameId) ? { parentFrameId: rawCausal.parentFrameId } : {}) }
      : raw.causal === undefined ? undefined : null;
    if (causal === null) continue;
    const base = {
      semantics: "PROVEN" as const,
      visibility: "PUBLIC" as const,
      judgementId,
      targetId: raw.targetId,
      judgingPlayerId: raw.judgingPlayerId,
      purpose: raw.purpose as JudgementPurpose,
      continuationKind: raw.continuationKind as PublicJudgementContinuationKind,
      ...(sourceCard ? { sourceCard } : {}),
      // The durable original event is the server authority for resolution
      // identity. Older committed records may omit the redundant nested copy;
      // replacement validation still requires the exact same resolution.
      resolutionId: nonEmptyString(raw.resolutionId) ? raw.resolutionId : originalEvent.resolutionId as string,
      ...(causal ? { causal } : {}),
      originalCard,
    };
    const makeFact = (input: {
      eventId: string;
      order: number;
      phase: "ORIGINAL" | "REPLACEMENT";
      status: "PROVISIONAL" | "FINAL";
      effectiveCard: PublicJudgementCardFace;
      judgementStatus: PublicJudgementStatus;
      replacement?: PublicJudgementPresentation["replacement"];
      replacementActor?: PublicJudgementPlayer;
    }) => {
      const copy = copyFor({
        phase: input.phase,
        purpose: base.purpose,
        continuationKind: base.continuationKind,
        target,
        originalCard,
        effectiveCard: input.effectiveCard,
        judgementStatus: input.judgementStatus,
        includeStatus: input.status === "FINAL",
        ...(input.replacementActor ? { replacementActor: input.replacementActor } : {}),
      });
      return copy ? { ...base, ...input, copy } : null;
    };

    if (raw.stage === "OPEN" || raw.stage === "UNVERIFIED") {
      if (raw.replacementEventId !== undefined || raw.replacementActorId !== undefined || raw.finalStatus !== undefined) continue;
      const fact = makeFact({ eventId: judgementId, order: row.publicSequence as number, phase: "ORIGINAL", status: "PROVISIONAL",
        effectiveCard: originalCard, judgementStatus: raw.originalStatus as PublicJudgementStatus });
      if (fact) projected.push(fact);
      continue;
    }

    if (raw.replacementEventId === undefined) {
      if (raw.replacementActorId !== undefined || raw.finalStatus !== raw.originalStatus) continue;
      const fact = makeFact({ eventId: judgementId, order: row.publicSequence as number, phase: "ORIGINAL", status: "FINAL",
        effectiveCard: originalCard, judgementStatus: raw.finalStatus as PublicJudgementStatus });
      if (fact) projected.push(fact);
      continue;
    }

    if (!nonEmptyString(raw.replacementEventId) || !nonEmptyString(raw.replacementActorId)
      || !["satisfied", "unsatisfied"].includes(String(raw.finalStatus))) continue;
    const replacementEvent = byEventId.get(raw.replacementEventId);
    const replacementProof = replacementProofFor({
      originalEvent, replacementEvent, replacementId: raw.replacementEventId, replacementActorId: raw.replacementActorId,
      targetId: target.id, originalCard, projectedEffects, byEventId, eventIdCounts,
      players,
    });
    if (!replacementProof || statusFor(base.purpose, replacementProof.card) !== raw.finalStatus) continue;
    const originalFact = makeFact({ eventId: judgementId, order: row.publicSequence as number, phase: "ORIGINAL", status: "PROVISIONAL",
      effectiveCard: originalCard, judgementStatus: raw.originalStatus as PublicJudgementStatus });
    const replacementOrder = replacementEvent?.publicSequence;
    const replacementFact = Number.isSafeInteger(replacementOrder) && orderCounts.get(replacementOrder as number) === 1
      ? makeFact({ eventId: raw.replacementEventId, order: replacementOrder as number, phase: "REPLACEMENT", status: "FINAL",
        effectiveCard: replacementProof.card, judgementStatus: raw.finalStatus as PublicJudgementStatus,
        replacement: replacementProof.replacement, replacementActor: replacementProof.actor })
      : null;
    if (originalFact && replacementFact) projected.push(originalFact, replacementFact);
  }
  return projected.sort((left, right) => left.order - right.order || left.judgementId.localeCompare(right.judgementId));
}

/**
 * Select the newest proven Judgement stage that has reached the public event
 * cursor. This keeps an original reveal visible while a later replacement is
 * already present in the same poll.
 */
export function publicJudgementPresentationAtCursor(
  presentations: readonly PublicJudgementPresentation[],
  cursor: { eventId: string; order?: number } | null,
): PublicJudgementPresentation | null {
  const candidates = presentations.filter((presentation) => presentation.semantics === "PROVEN"
    && presentation.visibility === "PUBLIC" && nonEmptyString(presentation.judgementId)
    && nonEmptyString(presentation.eventId) && Number.isSafeInteger(presentation.order)
    && (presentation.phase === "ORIGINAL" || presentation.phase === "REPLACEMENT")
    && (presentation.status === "PROVISIONAL" || presentation.status === "FINAL"));
  if (cursor) {
    const exact = candidates.filter((presentation) => presentation.eventId === cursor.eventId);
    if (exact.length > 1) return null;
    if (exact.length === 1) return exact[0];
    if (!Number.isSafeInteger(cursor.order)) return null;
  }
  const eligible = cursor
    ? candidates.filter((presentation) => presentation.order <= (cursor.order ?? -1))
    : candidates;
  if (!eligible.length) return null;
  const ordered = [...eligible].sort((left, right) => left.order - right.order);
  const latest = ordered.at(-1)!;
  return ordered.filter((presentation) => presentation.order === latest.order).length === 1 ? latest : null;
}

/** Adapts canonical server Judgement copy to the existing shared H4 surface. */
export function publicJudgementNarrationForPresentation(
  presentation: PublicJudgementPresentation | null,
): PublicInteractionNarration | null {
  if (!presentation || presentation.semantics !== "PROVEN" || presentation.visibility !== "PUBLIC"
    || !presentation.eventId || !presentation.judgementId || !presentation.copy.message.trim()) return null;
  const actorId = presentation.phase === "REPLACEMENT"
    ? presentation.replacement?.actorId
    : presentation.judgingPlayerId;
  if (!actorId) return null;
  return {
    eventId: presentation.eventId,
    publicSequence: presentation.order,
    rootEventId: presentation.judgementId,
    ...(presentation.causal ? {
      interactionId: presentation.causal.interactionId,
      rootFrameId: presentation.causal.frameId,
    } : {}),
    actorId,
    headline: presentation.copy.message,
    headlineSegments: presentation.copy.segments,
    compactHeadline: presentation.copy.message,
    accessibleLabel: presentation.copy.message,
    latestCommittedEventId: presentation.eventId,
    phase: presentation.status === "PROVISIONAL" ? "WINDOW_OPEN" : "FINAL",
  };
}

/** A replacement frame may own H4 only when every physical and causal ID agrees. */
export function publicJudgementReplacementFrameMatches(input: {
  presentation: PublicJudgementPresentation | null;
  actionEventId: string;
  actionCardId: string;
  actionActorId: string;
  actionTargetId: string | null;
  actionInteractionId?: string;
  actionRootFrameId?: string;
  frameEventId: string;
  frameRootEventId?: string;
  frameResolutionId?: string;
  frameEffectId: string;
  frameEffectClass: string;
  frameActivationOwnerId: string;
  frameMaterialCardIds: readonly string[];
}): boolean {
  const presentation = input.presentation;
  const replacement = presentation?.replacement;
  if (!presentation || presentation.phase !== "REPLACEMENT" || !replacement
    || presentation.eventId !== input.actionEventId || replacement.eventId !== input.actionEventId
    || presentation.judgementId !== input.frameRootEventId || presentation.targetId !== input.actionTargetId
    || replacement.physicalCardId !== input.actionCardId || replacement.actorId !== input.actionActorId
    || replacement.materialOwnerId !== input.actionActorId || replacement.effectId !== input.frameEffectId
    || replacement.effectId !== "sima_yi_guicai" || input.frameEffectClass !== "JUDGEMENT"
    || input.frameEventId !== input.actionEventId || input.frameActivationOwnerId !== input.actionActorId
    || input.frameMaterialCardIds.length !== 1 || input.frameMaterialCardIds[0] !== input.actionCardId
    || !presentation.resolutionId || input.frameResolutionId !== presentation.resolutionId) return false;
  return !presentation.causal || input.actionInteractionId === presentation.causal.interactionId
    && input.actionRootFrameId === presentation.causal.frameId;
}
