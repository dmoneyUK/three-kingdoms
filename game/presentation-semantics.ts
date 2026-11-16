import { CARD_DEFINITIONS } from "./cards";
import type { CardKind, CardRank, CardSuit, EquipmentZone } from "./model";

/** Stable public identity shared by the public event and the current decision. */
export type PresentationSemanticIdentity = {
  interactionId: string;
  rootFrameId: string;
  checkpointId: string;
  presentationRevision: number;
};

/** Generic meanings are provider-neutral; card, Hero and skill IDs do not belong here. */
export const PUBLIC_PRESENTATION_EVENT_CATEGORIES = [
  "CARD_PLAYED",
  "CARD_EQUIPPED",
  "CARD_DISCARDED",
  "CARD_OBTAINED",
  "CARD_TRANSFERRED",
  "EFFECT_APPLIED",
  "EFFECT_CANCELLED",
  "EFFECT_RESTORED",
  "DAMAGE_APPLIED",
  "DAMAGE_PREVENTED",
  "SKILL_USED",
  "ACTION_DECLINED",
  "STAGE_COMPLETED",
] as const;

export type PublicPresentationEventCategory = typeof PUBLIC_PRESENTATION_EVENT_CATEGORIES[number];

export type PublicEffectDescriptor = { kind: string; label?: string };

export type PublicOutcomeSourceKind = "card" | "skill" | "phase" | "damage" | "recovery" | "equipment" | "judgement" | "group" | "other";

/** Public counts and owners only; physical card identities and faces never belong here. */
export type CommittedPublicOutcomeChange =
  | { kind: "HP_COST_LOST" | "DAMAGE_APPLIED" | "HP_RECOVERED"; playerId: string; amount: number }
  | { kind: "CARD_DRAWN"; playerId: string; amount: number; fromZone: "DECK"; toZone: "HAND" }
  | { kind: "CARD_DISCARDED"; playerId: string; amount: number; fromZone: "HAND" | "EQUIPMENT" | "JUDGEMENT"; toZone: "DISCARD" }
  | { kind: "CARD_GAINED"; playerId: string; amount: number; fromZone: "DECK" | "DISCARD"; toZone: "HAND" | "EQUIPMENT" }
  | { kind: "CARD_TRANSFERRED"; fromPlayerId: string; toPlayerId: string; amount: number; fromZone: "HAND" | "EQUIPMENT" | "JUDGEMENT"; toZone: "HAND" | "EQUIPMENT" | "JUDGEMENT" }
  | { kind: "CARD_EQUIPPED"; playerId: string; amount: 1; fromZone: "HAND"; toZone: "EQUIPMENT" }
  | { kind: "CARD_UNEQUIPPED"; playerId: string; amount: 1; fromZone: "EQUIPMENT"; toZone: "HAND" | "DISCARD" };

/** Optional metadata for a single already-committed public room event. */
export type CommittedPublicOutcomeDraft = {
  source: { kind: PublicOutcomeSourceKind; label?: string };
  changes: readonly CommittedPublicOutcomeChange[];
};

/** The shared proof collector binds a draft to the actual persisted event identity and sequence. */
export type CommittedPublicOutcome = CommittedPublicOutcomeDraft & {
  semantics: "PROVEN";
  visibility: "PUBLIC";
  eventId: string;
  identity: PresentationSemanticIdentity;
  order: number;
  rootEventId: string;
  frameId: string;
  parentFrameId?: string;
  category: PublicPresentationEventCategory;
  actorId?: string;
  affectedPlayerIds: readonly string[];
};

/** Minimal public receipt for one committed choice from a revealed Harvest pool. */
export type PublicBumperHarvestPick = {
  semantics: "PROVEN";
  visibility: "PUBLIC";
  eventId: string;
  order: number;
  actorId: string;
  rootEventId: string;
  chosenCardId: string;
  chosenFace: { kind: CardKind; suit: CardSuit; rank: CardRank };
  committedIdentity: PresentationSemanticIdentity;
};

export type PublicZoneEndpoint =
  | { zone: "HAND" | "EQUIPMENT" | "JUDGEMENT"; ownerId: string; slot?: keyof EquipmentZone }
  | { zone: "DECK" | "DISCARD"; ownerId: null };

/** Server-committed movement of one already-public physical card. */
export type PublicPhysicalZoneTransition = {
  semantics: "PROVEN";
  visibility: "PUBLIC";
  /** ID of the committed log event that records this movement. */
  eventId: string;
  /** Exact public event that supplies the real CardFace. */
  sourceEventId?: string;
  /** Causal public root; it can differ from sourceEventId on a later Judgement. */
  rootEventId?: string;
  physicalCardId: string;
  from: PublicZoneEndpoint;
  to: PublicZoneEndpoint;
};

/** A provider-supplied, immutable public fact. Labels must already be privacy-safe. */
export type PublicPresentationEvent = {
  semantics: "PROVEN";
  visibility: "PUBLIC";
  identity: PresentationSemanticIdentity;
  eventId: string;
  resolutionId?: string;
  order: number;
  frameId?: string;
  parentFrameId?: string;
  rootEventId?: string;
  category: PublicPresentationEventCategory;
  actorId?: string;
  affectedPlayerIds: readonly string[];
  label?: string;
  outcomeLabel?: string;
  amount?: number;
  effect?: PublicEffectDescriptor;
  committedOutcome?: CommittedPublicOutcome;
  bumperHarvestPick?: PublicBumperHarvestPick;
};

/** Minimal metadata appended to an already-committed public room event. */
export type PublicPresentationEventFactDraft = {
  semantics: "PROVEN";
  visibility: "PUBLIC";
  eventId?: string;
  resolutionId?: string;
  order?: number;
  interactionId: string;
  frameId: string;
  parentFrameId?: string;
  rootEventId?: string;
  category: PublicPresentationEventCategory;
  actorId?: string;
  affectedPlayerIds?: readonly string[];
  label?: string;
  outcomeLabel?: string;
  amount?: number;
  effect?: PublicEffectDescriptor;
  committedOutcome?: CommittedPublicOutcomeDraft;
  /** Extra server proof required before a Harvest pick can enter the public fact stream. */
  bumperHarvestPickProof?: PublicBumperHarvestPickProof;
  /** Causal checkpoint captured by the server at the committed event. */
  committedIdentity?: PresentationSemanticIdentity;
};

/** A validated server fact enriched only by the shared proof collector. */
export type PublicPresentationEventFactProjection = Omit<PublicPresentationEventFactDraft, "committedOutcome"> & {
  committedOutcome?: CommittedPublicOutcome;
  bumperHarvestPick?: PublicBumperHarvestPick;
};

/** Server proof for one committed choice from the already-public Harvest pool. */
export type PublicBumperHarvestPickProof = {
  semantics: "PROVEN";
  eventId: string;
  interactionId: string;
  rootFrameId: string;
  rootEventId: string;
  rootResolutionId: string;
  rootCardId: string;
  revealEventId: string;
  sourceId: string;
  actorId: string;
  card: { id: string; kind: string; suit: string; rank: string };
};

/** Reads only structured, committed public log records; never inspects message text. */
export function collectPublicPresentationEventFacts(input: {
  timeline: readonly unknown[];
  /** Public, non-presented events that can prove a committed public outcome without becoming display facts. */
  supportingPublicEvents?: readonly unknown[];
  identity: unknown;
  frames: readonly unknown[];
  rootEventId?: string | null;
}): PublicPresentationEventFactProjection[] {
  const current = identity(input.identity);
  if (!current) return [];
  const proofTimeline = input.supportingPublicEvents?.length
    ? [...input.timeline, ...input.supportingPublicEvents]
    : input.timeline;
  const frameRows = input.frames.map(record).filter((frame): frame is Record<string, unknown> => Boolean(frame));
  if (!frameRows.length) return [];
  const frameIds = new Set(frameRows.flatMap((frame) => typeof frame.frameId === "string" ? [frame.frameId] : []));
  const eventIdCounts = new Map<string, number>();
  const orderCounts = new Map<number, number>();
  for (const candidate of input.timeline) {
    const event = record(candidate);
    if (!event || event.presentation === false || typeof event.privateToPlayerId === "string"
      || !nonEmptyString(event.id) || !Number.isSafeInteger(event.publicSequence)) continue;
    eventIdCounts.set(event.id, (eventIdCounts.get(event.id) ?? 0) + 1);
    orderCounts.set(event.publicSequence as number, (orderCounts.get(event.publicSequence as number) ?? 0) + 1);
  }
  const facts: PublicPresentationEventFactProjection[] = [];
  input.timeline.forEach((candidate) => {
    const event = record(candidate);
    if (!event || !nonEmptyString(event.id) || event.presentation === false || typeof event.privateToPlayerId === "string"
      || !Number.isSafeInteger(event.publicSequence) || (event.publicSequence as number) < 0) return;
    const order = event.publicSequence as number;
    const raw = record(event.publicFact);
    if (raw) {
      if (raw.semantics !== "PROVEN" || raw.visibility !== "PUBLIC"
        || raw.interactionId !== current.interactionId || !nonEmptyString(raw.frameId) || !frameIds.has(raw.frameId)) return;
      if (raw.category === "CARD_EQUIPPED" && !isCommittedPublicEquipmentFact(event, raw)) return;
      const effect = record(raw.effect);
      const hasHarvestPickProof = raw.bumperHarvestPickProof !== undefined;
      if ((effect?.kind === "bumper_harvest_pick" || hasHarvestPickProof)
        && !isCommittedPublicBumperHarvestPick(event, raw, proofTimeline, frameRows)) return;
      const bumperHarvestPick = effect?.kind === "bumper_harvest_pick"
        ? bumperHarvestPickFromCommittedFact(event, raw, current, order)
        : null;
      if ((effect?.kind === "bumper_harvest_pick" || hasHarvestPickProof) && !bumperHarvestPick) return;
      const frame = frameRows.find((row) => row.frameId === raw.frameId);
      if (raw.parentFrameId !== undefined && raw.parentFrameId !== (frame?.parentFrameId ?? undefined)) return;
      const fact: PublicPresentationEventFactProjection = {
        semantics: "PROVEN", visibility: "PUBLIC", eventId: event.id,
        ...(typeof event.resolutionId === "string" ? { resolutionId: event.resolutionId } : {}), order,
        interactionId: current.interactionId, frameId: raw.frameId,
        ...(typeof frame?.parentFrameId === "string" ? { parentFrameId: frame.parentFrameId } : {}),
        ...(typeof raw.rootEventId === "string" ? { rootEventId: raw.rootEventId } : {}),
        category: raw.category as PublicPresentationEventCategory,
        ...(typeof event.actorId === "string" ? { actorId: event.actorId }
          : typeof raw.actorId === "string" ? { actorId: raw.actorId } : {}),
        ...(Array.isArray(raw.affectedPlayerIds) ? { affectedPlayerIds: raw.affectedPlayerIds as string[] } : {}),
        ...(typeof raw.label === "string" ? { label: raw.label } : {}),
        ...(typeof raw.outcomeLabel === "string" ? { outcomeLabel: raw.outcomeLabel } : {}),
        ...(Number.isSafeInteger(raw.amount) && (raw.amount as number) >= 0 ? { amount: raw.amount as number } : {}),
        ...(record(raw.effect) ? { effect: raw.effect as { kind: string; label?: string } } : {}),
        ...(bumperHarvestPick ? { bumperHarvestPick } : {}),
      };
      const committedIdentity = identity(raw.committedIdentity);
      const rawActorId = nonEmptyString(raw.actorId) ? raw.actorId : undefined;
      const eventActorId = nonEmptyString(event.actorId) ? event.actorId : undefined;
      const affectedForOutcome = uniqueStrings(raw.affectedPlayerIds, true) ?? [];
      const effectLabel = record(raw.effect)?.label;
      const actorMismatch = Boolean(eventActorId && rawActorId && eventActorId !== rawActorId);
      const committedOutcome = raw.committedOutcome === undefined || (eventIdCounts.get(event.id) ?? 0) !== 1
        || (orderCounts.get(order) ?? 0) !== 1 || actorMismatch
        || !committedIdentity || !sameInteraction(committedIdentity, current)
        || committedIdentity.presentationRevision > current.presentationRevision
        || committedIdentity.rootFrameId !== current.rootFrameId
        || !frameRows.some((candidateFrame) => candidateFrame.frameId === committedIdentity.rootFrameId
          && (candidateFrame.parentFrameId === null || candidateFrame.parentFrameId === undefined))
        ? null
        : bindCommittedPublicOutcome(raw.committedOutcome, {
          eventId: event.id,
          order,
          identity: committedIdentity,
          currentIdentity: current,
          rootEventId: typeof raw.rootEventId === "string" ? raw.rootEventId : "",
          frameId: raw.frameId,
          ...(typeof frame?.parentFrameId === "string" ? { parentFrameId: frame.parentFrameId } : {}),
          category: raw.category as PublicPresentationEventCategory,
          ...(eventActorId ?? rawActorId ? { actorId: eventActorId ?? rawActorId } : {}),
          affectedPlayerIds: affectedForOutcome,
          publicLabels: [typeof raw.label === "string" ? raw.label : undefined, typeof effectLabel === "string" ? effectLabel : undefined],
        });
      if (raw.category === "CARD_DISCARDED" && !isCommittedPublicDiscardFact(event, raw)
        && !committedOutcome?.changes.some((change) => change.kind === "CARD_DISCARDED")) return;
      if (committedOutcome) fact.committedOutcome = committedOutcome;
      facts.push(fact);
      return;
    }

    // Root card identity is inherited only through the exact Pending-proven
    // event ID. The public fact remains intentionally less specific.
    if (event.id !== input.rootEventId || event.type !== "card" && event.type !== "cards") return;
    if (event.action !== "play" && event.action !== "discard"
      && event.action !== "gain" && event.action !== "reveal" && event.action !== "activate") return;
    const category: PublicPresentationEventCategory = event.action === "play" ? "CARD_PLAYED"
      : event.action === "discard" ? "CARD_DISCARDED"
        : event.action === "gain" ? "CARD_OBTAINED"
          : event.action === "activate" ? "SKILL_USED" : "EFFECT_APPLIED";
    if (category === "CARD_DISCARDED" && !isCommittedPublicDiscardFact(event, {
      category, actorId: event.actorId, affectedPlayerIds: typeof event.actorId === "string" ? [event.actorId] : [],
    })) return;
    const rootFrameId = frameRows.find((frame) => frame.parentFrameId === null || frame.parentFrameId === undefined)?.frameId;
    if (typeof rootFrameId !== "string") return;
    const rootFrame = frameRows.find((frame) => frame.frameId === rootFrameId);
    const rootOrigin = record(rootFrame?.origin);
    const rootCard = record(event.card);
    const rootCardLabel = category === "CARD_PLAYED" && typeof rootCard?.kind === "string"
      ? CARD_DEFINITIONS[rootCard.kind as keyof typeof CARD_DEFINITIONS]?.name
      : undefined;
    const rootTargets = Array.isArray(rootOrigin?.originalTargetIds)
      ? rootOrigin.originalTargetIds.filter((playerId): playerId is string => nonEmptyString(playerId))
      : [];
    facts.push({
      semantics: "PROVEN", visibility: "PUBLIC", eventId: event.id,
      ...(typeof event.resolutionId === "string" ? { resolutionId: event.resolutionId } : {}), order,
      interactionId: current.interactionId, frameId: rootFrameId, rootEventId: event.id,
      ...(typeof rootFrame?.parentFrameId === "string" ? { parentFrameId: rootFrame.parentFrameId } : {}),
      category,
      ...(typeof rootOrigin?.originSourceId === "string" ? { actorId: rootOrigin.originSourceId }
        : typeof event.actorId === "string" ? { actorId: event.actorId } : {}),
      affectedPlayerIds: rootTargets,
      label: category === "CARD_PLAYED" ? rootCardLabel ?? "A card was played."
        : category === "CARD_DISCARDED" ? "A card was discarded."
          : category === "CARD_OBTAINED" ? "A card was obtained."
            : category === "SKILL_USED" ? "A card ability was used." : "A card was revealed.",
      ...(rootCardLabel ? { effect: { kind: "card_play", label: rootCardLabel } } : {}),
    });
  });
  return facts;
}

/** The public stage and possible next action, exactly scoped to its checkpoint. */
export type PublicPresentationDecision = {
  semantics: "PROVEN";
  visibility: "PUBLIC" | "REDACTED";
  identity: PresentationSemanticIdentity;
  decisionId: string;
  stage: string;
  stageLabel: string;
  actorIds: readonly string[];
  actionLabels: readonly string[];
  nextEffect?: PublicEffectDescriptor;
  responseWindowOpen: boolean | null;
};

export type ViewerNegationChoice = {
  windowId: string;
  locked: boolean;
  choice: "pass" | "negation_intent" | null;
};

export type PublicPresentationSemantics = {
  identity: PresentationSemanticIdentity | null;
  event: PublicPresentationEvent | null;
  events: readonly PublicPresentationEvent[];
  nextDecision: PublicPresentationDecision | null;
  viewerNegationChoice: ViewerNegationChoice | null;
};

const EVENT_CATEGORIES = new Set<PublicPresentationEventCategory>(PUBLIC_PRESENTATION_EVENT_CATEGORIES);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function nonEmptyString(value: unknown, maxLength = 160): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function identity(value: unknown): PresentationSemanticIdentity | null {
  const item = record(value);
  if (!item || !nonEmptyString(item.interactionId) || !nonEmptyString(item.rootFrameId)
    || !nonEmptyString(item.checkpointId) || !Number.isSafeInteger(item.presentationRevision)
    || (item.presentationRevision as number) < 0) return null;
  return {
    interactionId: item.interactionId,
    rootFrameId: item.rootFrameId,
    checkpointId: item.checkpointId,
    presentationRevision: item.presentationRevision as number,
  };
}

const PUBLIC_OUTCOME_SOURCE_KINDS = new Set<PublicOutcomeSourceKind>([
  "card", "skill", "phase", "damage", "recovery", "equipment", "judgement", "group", "other",
]);

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const keys = Object.keys(value);
  return required.every((key) => Object.hasOwn(value, key))
    && keys.every((key) => required.includes(key) || optional.includes(key));
}

function publicOutcomeChange(value: unknown): CommittedPublicOutcomeChange | null {
  const item = record(value);
  if (!item || !Number.isSafeInteger(item.amount) || (item.amount as number) <= 0) return null;
  const amount = item.amount as number;
  switch (item.kind) {
    case "HP_COST_LOST":
    case "DAMAGE_APPLIED":
    case "HP_RECOVERED":
      return exactKeys(item, ["kind", "playerId", "amount"]) && nonEmptyString(item.playerId)
        ? { kind: item.kind, playerId: item.playerId, amount } : null;
    case "CARD_DRAWN":
      return exactKeys(item, ["kind", "playerId", "amount", "fromZone", "toZone"])
        && nonEmptyString(item.playerId) && item.fromZone === "DECK" && item.toZone === "HAND"
        ? { kind: item.kind, playerId: item.playerId, amount, fromZone: "DECK", toZone: "HAND" } : null;
    case "CARD_DISCARDED":
      return exactKeys(item, ["kind", "playerId", "amount", "fromZone", "toZone"])
        && nonEmptyString(item.playerId) && (item.fromZone === "HAND" || item.fromZone === "EQUIPMENT" || item.fromZone === "JUDGEMENT")
        && item.toZone === "DISCARD"
        ? { kind: item.kind, playerId: item.playerId, amount, fromZone: item.fromZone, toZone: "DISCARD" } : null;
    case "CARD_GAINED":
      return exactKeys(item, ["kind", "playerId", "amount", "fromZone", "toZone"])
        && nonEmptyString(item.playerId) && (item.fromZone === "DECK" || item.fromZone === "DISCARD")
        && (item.toZone === "HAND" || item.toZone === "EQUIPMENT")
        ? { kind: item.kind, playerId: item.playerId, amount, fromZone: item.fromZone, toZone: item.toZone } : null;
    case "CARD_TRANSFERRED":
      return exactKeys(item, ["kind", "fromPlayerId", "toPlayerId", "amount", "fromZone", "toZone"])
        && nonEmptyString(item.fromPlayerId) && nonEmptyString(item.toPlayerId) && item.fromPlayerId !== item.toPlayerId
        && (item.fromZone === "HAND" || item.fromZone === "EQUIPMENT" || item.fromZone === "JUDGEMENT")
        && (item.toZone === "HAND" || item.toZone === "EQUIPMENT" || item.toZone === "JUDGEMENT")
        ? { kind: item.kind, fromPlayerId: item.fromPlayerId, toPlayerId: item.toPlayerId, amount,
          fromZone: item.fromZone, toZone: item.toZone } : null;
    case "CARD_EQUIPPED":
      return exactKeys(item, ["kind", "playerId", "amount", "fromZone", "toZone"])
        && nonEmptyString(item.playerId) && amount === 1 && item.fromZone === "HAND" && item.toZone === "EQUIPMENT"
        ? { kind: item.kind, playerId: item.playerId, amount: 1, fromZone: "HAND", toZone: "EQUIPMENT" } : null;
    case "CARD_UNEQUIPPED":
      return exactKeys(item, ["kind", "playerId", "amount", "fromZone", "toZone"])
        && nonEmptyString(item.playerId) && amount === 1 && item.fromZone === "EQUIPMENT"
        && (item.toZone === "HAND" || item.toZone === "DISCARD")
        ? { kind: item.kind, playerId: item.playerId, amount: 1, fromZone: "EQUIPMENT", toZone: item.toZone } : null;
    default:
      return null;
  }
}

/** Validates public outcome content and prevents card faces, IDs, or private fields from entering it. */
export function validateCommittedPublicOutcomeDraft(
  value: unknown,
  publicFact?: { actorId?: string; affectedPlayerIds?: readonly string[]; publicLabels?: readonly (string | undefined)[] },
): CommittedPublicOutcomeDraft | null {
  const item = record(value);
  const source = record(item?.source);
  if (!item || !exactKeys(item, ["source", "changes"]) || !source
    || !exactKeys(source, ["kind"], ["label"])
    || typeof source.kind !== "string" || !PUBLIC_OUTCOME_SOURCE_KINDS.has(source.kind as PublicOutcomeSourceKind)
    || source.label !== undefined && !nonEmptyString(source.label)
    || !Array.isArray(item.changes) || item.changes.length === 0) return null;
  const changes = item.changes.map(publicOutcomeChange);
  if (changes.some((change) => change === null)) return null;
  const normalizedSource = {
    kind: source.kind as PublicOutcomeSourceKind,
    ...(typeof source.label === "string" ? { label: source.label } : {}),
  };
  if (publicFact) {
    const participants = new Set([...(publicFact.actorId ? [publicFact.actorId] : []), ...(publicFact.affectedPlayerIds ?? [])]);
    const publicLabels = new Set((publicFact.publicLabels ?? []).filter((label): label is string => typeof label === "string"));
    if (normalizedSource.label && !publicLabels.has(normalizedSource.label)) return null;
    for (const change of changes as CommittedPublicOutcomeChange[]) {
      const ids = change.kind === "CARD_TRANSFERRED" ? [change.fromPlayerId, change.toPlayerId] : [change.playerId];
      if (ids.some((id) => !participants.has(id))) return null;
    }
  }
  return { source: normalizedSource, changes: changes as CommittedPublicOutcomeChange[] };
}

type CommittedOutcomeBinding = {
  eventId: string;
  order: number;
  identity: PresentationSemanticIdentity;
  currentIdentity: PresentationSemanticIdentity;
  rootEventId: string;
  frameId: string;
  parentFrameId?: string;
  category: PublicPresentationEventCategory;
  actorId?: string;
  affectedPlayerIds: readonly string[];
  publicLabels?: readonly (string | undefined)[];
};

function bindCommittedPublicOutcome(value: unknown, binding: CommittedOutcomeBinding): CommittedPublicOutcome | null {
  const item = record(value);
  if (!item || !sameInteraction(binding.identity, binding.currentIdentity)
    || binding.identity.presentationRevision > binding.currentIdentity.presentationRevision
    || !nonEmptyString(binding.eventId) || !Number.isSafeInteger(binding.order) || binding.order < 0
    || !nonEmptyString(binding.rootEventId) || !nonEmptyString(binding.frameId)
    || binding.actorId !== undefined && !nonEmptyString(binding.actorId)
    || !uniqueStrings(binding.affectedPlayerIds, true)
    || !EVENT_CATEGORIES.has(binding.category)) return null;
  const publicFact = { actorId: binding.actorId, affectedPlayerIds: binding.affectedPlayerIds, publicLabels: binding.publicLabels };
  const draft = validateCommittedPublicOutcomeDraft({ source: item.source, changes: item.changes }, publicFact);
  if (!draft) return null;
  const boundKeys = ["semantics", "visibility", "eventId", "identity", "order", "rootEventId", "frameId", "category", "affectedPlayerIds"];
  const hasBoundKeys = boundKeys.some((key) => Object.hasOwn(item, key)) || Object.hasOwn(item, "actorId") || Object.hasOwn(item, "parentFrameId");
  if (hasBoundKeys) {
    const storedIdentity = identity(item.identity);
    const storedAffected = uniqueStrings(item.affectedPlayerIds, true);
    if (!exactKeys(item, [...boundKeys, "source", "changes"], ["actorId", "parentFrameId"])
      || item.semantics !== "PROVEN" || item.visibility !== "PUBLIC" || item.eventId !== binding.eventId
      || !storedIdentity || !sameIdentity(storedIdentity, binding.identity) || item.order !== binding.order
      || item.rootEventId !== binding.rootEventId || item.frameId !== binding.frameId
      || item.parentFrameId !== binding.parentFrameId || item.category !== binding.category
      || item.actorId !== binding.actorId || !storedAffected
      || storedAffected.length !== binding.affectedPlayerIds.length
      || storedAffected.some((id, index) => id !== binding.affectedPlayerIds[index])) return null;
  } else if (!exactKeys(item, ["source", "changes"])) {
    return null;
  }
  return {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: binding.eventId,
    identity: binding.identity, order: binding.order, rootEventId: binding.rootEventId,
    frameId: binding.frameId, ...(binding.parentFrameId ? { parentFrameId: binding.parentFrameId } : {}),
    category: binding.category, ...(binding.actorId ? { actorId: binding.actorId } : {}),
    affectedPlayerIds: [...binding.affectedPlayerIds], ...draft,
  };
}

function isCommittedPublicEquipmentFact(event: Record<string, unknown>, fact: Record<string, unknown>): boolean {
  const card = record(event.card);
  const kind = typeof card?.kind === "string" ? CARD_DEFINITIONS[card.kind as keyof typeof CARD_DEFINITIONS] : null;
  const actorId = typeof event.actorId === "string" ? event.actorId : null;
  const affectedPlayerIds = Array.isArray(fact.affectedPlayerIds) ? fact.affectedPlayerIds : null;
  const effect = record(fact.effect);
  return event.type === "card" && event.action === "equip" && event.presentation !== false
    && typeof event.privateToPlayerId !== "string" && nonEmptyString(event.id)
    && nonEmptyString(card?.id) && Boolean(kind?.equipmentSlot) && Boolean(actorId)
    && fact.rootEventId === event.id && fact.actorId === actorId
    && fact.label === kind?.name
    && effect?.kind === "equipment_play" && effect.label === kind?.name
    && affectedPlayerIds?.length === 1 && affectedPlayerIds[0] === actorId;
}

function isCommittedPublicDiscardFact(event: Record<string, unknown>, fact: Record<string, unknown>): boolean {
  const cards = event.type === "card"
    ? [record(event.card)]
    : event.type === "cards" && Array.isArray(event.cards)
      ? event.cards.map(record)
      : [];
  const transitions = event.type === "card"
    ? [record(event.publicZoneTransition)]
    : event.type === "cards" && Array.isArray(event.publicZoneTransitions)
      ? event.publicZoneTransitions.map(record)
      : [];
  const eventActorId = typeof event.actorId === "string" ? event.actorId : null;
  const affectedPlayerIds = uniqueStrings(fact.affectedPlayerIds, true);
  if ((event.type !== "card" && event.type !== "cards") || event.action !== "discard" || event.presentation === false
    || typeof event.privateToPlayerId === "string" || !nonEmptyString(event.id) || !cards.length
    || transitions.length !== cards.length
    || !eventActorId || fact.category !== "CARD_DISCARDED" || fact.actorId !== eventActorId
    || !affectedPlayerIds || !affectedPlayerIds.includes(eventActorId)) return false;

  const cardIds = new Set<string>();
  for (const card of cards) {
    const cardId = card?.id;
    if (!nonEmptyString(cardId) || cardIds.has(cardId)) return false;
    cardIds.add(cardId);
  }
  const discardedByZone = new Map<"HAND" | "EQUIPMENT" | "JUDGEMENT", number>();
  const matchedCardIds = new Set<string>();
  for (const transition of transitions) {
    if (!transition) return false;
    const from = record(transition.from);
    const to = record(transition.to);
    const physicalCardId = transition.physicalCardId;
    const fromZone = from?.zone;
    if (transition.semantics !== "PROVEN" || transition.visibility !== "PUBLIC"
      || transition.eventId !== event.id
      || event.type === "cards" && (transition.sourceEventId !== event.id || transition.rootEventId !== event.id)
      || !nonEmptyString(physicalCardId) || !cardIds.has(physicalCardId)
      || matchedCardIds.has(physicalCardId) || !from || !(fromZone === "HAND" || fromZone === "EQUIPMENT" || fromZone === "JUDGEMENT")
      || from.ownerId !== eventActorId || !affectedPlayerIds.includes(eventActorId)
      || !to || to.zone !== "DISCARD" || to.ownerId !== null) return false;
    matchedCardIds.add(physicalCardId);
    discardedByZone.set(fromZone, (discardedByZone.get(fromZone) ?? 0) + 1);
  }
  if (matchedCardIds.size !== cardIds.size) return false;

  // Preserve the established single-card discard proof. Group outcomes are
  // accepted only when their generic count facts exactly match every physical
  // transition and source zone.
  if (fact.committedOutcome === undefined) return event.type === "card";
  const effect = record(fact.effect);
  const outcome = validateCommittedPublicOutcomeDraft(fact.committedOutcome, {
    actorId: eventActorId,
    affectedPlayerIds,
    publicLabels: [typeof fact.label === "string" ? fact.label : undefined, typeof effect?.label === "string" ? effect.label : undefined],
  });
  if (!outcome || outcome.changes.length !== discardedByZone.size) return false;
  const remaining = new Map(discardedByZone);
  for (const change of outcome.changes) {
    if (change.kind !== "CARD_DISCARDED" || change.playerId !== eventActorId || change.toZone !== "DISCARD"
      || remaining.get(change.fromZone) !== change.amount) return false;
    remaining.delete(change.fromZone);
  }
  return remaining.size === 0;
}

function isCommittedPublicBumperHarvestPick(
  event: Record<string, unknown>,
  fact: Record<string, unknown>,
  timeline: readonly unknown[],
  frames: readonly Record<string, unknown>[],
): boolean {
  const proof = record(fact.bumperHarvestPickProof);
  const card = record(proof?.card);
  const effect = record(fact.effect);
  const actorId = typeof event.actorId === "string" ? event.actorId : null;
  const rootEventId = typeof proof?.rootEventId === "string" ? proof.rootEventId : null;
  const revealEventId = typeof proof?.revealEventId === "string" ? proof.revealEventId : null;
  const matchingPickEvents = timeline.map(record).filter((candidate): candidate is Record<string, unknown> =>
    Boolean(candidate && candidate.id === event.id));
  const rootMatches = rootEventId ? timeline.map(record).filter((candidate): candidate is Record<string, unknown> =>
    Boolean(candidate && candidate.id === rootEventId)) : [];
  const revealMatches = revealEventId ? timeline.map(record).filter((candidate): candidate is Record<string, unknown> =>
    Boolean(candidate && candidate.id === revealEventId)) : [];
  const root = rootMatches.length === 1 ? rootMatches[0] : null;
  const reveal = revealMatches.length === 1 ? revealMatches[0] : null;
  const rootCard = record(root?.card);
  const rootProof = record(root?.bumperHarvestRoot);
  const revealCards = Array.isArray(reveal?.cards) ? reveal.cards.map(record).filter((candidate): candidate is Record<string, unknown> => Boolean(candidate)) : [];
  const matchingRevealedCards = revealCards.filter((revealed) => revealed.id === card?.id
    && revealed.kind === card?.kind && revealed.suit === card?.suit && revealed.rank === card?.rank);
  const cardDefinition = typeof card?.kind === "string" ? CARD_DEFINITIONS[card.kind as keyof typeof CARD_DEFINITIONS] : null;
  const frame = frames.find((candidate) => candidate.frameId === proof?.rootFrameId);
  const affected = Array.isArray(fact.affectedPlayerIds) ? fact.affectedPlayerIds : [];
  return matchingPickEvents.length === 1 && event.type === "message"
    && proof?.semantics === "PROVEN" && nonEmptyString(proof.eventId) && proof.eventId === event.id
    && nonEmptyString(proof.interactionId) && proof.interactionId === fact.interactionId
    && nonEmptyString(proof.rootFrameId) && proof.rootFrameId === frame?.frameId && (frame?.parentFrameId ?? null) === null
    && nonEmptyString(rootEventId) && rootEventId === fact.rootEventId
    && nonEmptyString(proof.rootResolutionId) && proof.rootResolutionId === event.resolutionId
    && nonEmptyString(proof.rootCardId) && nonEmptyString(proof.sourceId) && nonEmptyString(proof.actorId)
    && proof.actorId === actorId && fact.actorId === actorId && affected.length === 1 && affected[0] === actorId
    && effect?.kind === "bumper_harvest_pick" && fact.category === "CARD_OBTAINED"
    && rootMatches.length === 1 && root?.type === "card" && root.action === "play" && root.presentation !== false
    && root?.resolutionId === proof.rootResolutionId && rootCard?.id === proof.rootCardId && rootCard.kind === "BumperHarvest"
    && rootProof?.semantics === "PROVEN" && rootProof.sourceId === proof.sourceId && rootProof.cardId === proof.rootCardId
    && rootProof.interactionId === proof.interactionId && rootProof.rootFrameId === proof.rootFrameId
    && revealMatches.length === 1 && reveal?.type === "cards" && reveal.action === "reveal" && reveal.presentation === false
    && typeof reveal.privateToPlayerId !== "string" && reveal?.resolutionId === proof.rootResolutionId
    && nonEmptyString(proof.revealEventId) && nonEmptyString(card?.id) && nonEmptyString(card?.kind)
    && nonEmptyString(card?.suit) && nonEmptyString(card?.rank) && matchingRevealedCards.length === 1
    && cardDefinition?.name === fact.label
    && nonEmptyString(fact.outcomeLabel) && fact.outcomeLabel === event.message;
}

function bumperHarvestPickFromCommittedFact(
  event: Record<string, unknown>,
  fact: Record<string, unknown>,
  current: PresentationSemanticIdentity,
  order: number,
): PublicBumperHarvestPick | null {
  const proof = record(fact.bumperHarvestPickProof);
  const card = record(proof?.card);
  const committedIdentity = identity(fact.committedIdentity);
  const actorId = typeof event.actorId === "string" ? event.actorId : null;
  const rootEventId = typeof proof?.rootEventId === "string" ? proof.rootEventId : null;
  const cardKind = typeof card?.kind === "string" && CARD_DEFINITIONS[card.kind as CardKind] ? card.kind as CardKind : null;
  const suit = card?.suit === "♥" || card?.suit === "♦" || card?.suit === "♣" || card?.suit === "♠" ? card.suit as CardSuit : null;
  const rank = typeof card?.rank === "string" && ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"].includes(card.rank)
    ? card.rank as CardRank : null;
  if (!proof || !committedIdentity || !sameInteraction(committedIdentity, current)
    || committedIdentity.presentationRevision > current.presentationRevision
    || !nonEmptyString(event.id) || proof.eventId !== event.id
    || !Number.isSafeInteger(event.publicSequence) || event.publicSequence !== order
    || !actorId || proof.actorId !== actorId || fact.actorId !== actorId
    || !rootEventId || fact.rootEventId !== rootEventId
    || proof.interactionId !== committedIdentity.interactionId
    || proof.rootFrameId !== committedIdentity.rootFrameId
    || !nonEmptyString(card?.id) || !cardKind || !suit || !rank) return null;
  return {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: event.id, order, actorId,
    rootEventId, chosenCardId: card.id,
    chosenFace: { kind: cardKind, suit, rank },
    committedIdentity,
  };
}

function sameIdentity(left: PresentationSemanticIdentity, right: PresentationSemanticIdentity): boolean {
  return left.interactionId === right.interactionId
    && left.rootFrameId === right.rootFrameId
    && left.checkpointId === right.checkpointId
    && left.presentationRevision === right.presentationRevision;
}

function sameInteraction(left: PresentationSemanticIdentity, right: PresentationSemanticIdentity): boolean {
  return left.interactionId === right.interactionId && left.rootFrameId === right.rootFrameId;
}

function uniqueStrings(value: unknown, allowEmpty = false): string[] | null {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)
    || !value.every((item) => nonEmptyString(item))) return null;
  const values = value as string[];
  return new Set(values).size === values.length ? values : null;
}

function publicEvent(value: unknown, current: PresentationSemanticIdentity): PublicPresentationEvent | null {
  const item = record(value);
  const eventIdentity = identity(item?.identity);
  const affectedPlayerIds = uniqueStrings(item?.affectedPlayerIds, true);
  const bumperHarvestPick = publicBumperHarvestPick(item?.bumperHarvestPick, item, current);
  if (!item || item.semantics !== "PROVEN" || item.visibility !== "PUBLIC" || !eventIdentity
    || !sameInteraction(eventIdentity, current) || eventIdentity.presentationRevision > current.presentationRevision
    || !nonEmptyString(item.eventId) || !Number.isSafeInteger(item.order) || (item.order as number) < 0
    || item.resolutionId !== undefined && !nonEmptyString(item.resolutionId)
    || typeof item.category !== "string" || !EVENT_CATEGORIES.has(item.category as PublicPresentationEventCategory)
    || (item.actorId !== undefined && !nonEmptyString(item.actorId)) || !affectedPlayerIds
    || (item.label !== undefined && !nonEmptyString(item.label))
    || (item.outcomeLabel !== undefined && !nonEmptyString(item.outcomeLabel))
    || (item.amount !== undefined && (!Number.isSafeInteger(item.amount) || (item.amount as number) < 0))
    || (item.frameId !== undefined && !nonEmptyString(item.frameId))
    || (item.parentFrameId !== undefined && !nonEmptyString(item.parentFrameId))
    || (item.rootEventId !== undefined && !nonEmptyString(item.rootEventId))
    || (item.effect !== undefined && (!record(item.effect) || !nonEmptyString(record(item.effect)?.kind)
      || record(item.effect)?.label !== undefined && !nonEmptyString(record(item.effect)?.label)))) return null;
  const outcomeIdentity = identity(record(item.committedOutcome)?.identity);
  const committedOutcome = item.committedOutcome === undefined || !outcomeIdentity
    || !nonEmptyString(item.rootEventId) || !nonEmptyString(item.frameId)
    ? null
    : bindCommittedPublicOutcome(item.committedOutcome, {
      eventId: item.eventId,
      order: item.order as number,
      identity: outcomeIdentity,
      currentIdentity: eventIdentity,
      rootEventId: item.rootEventId,
      frameId: item.frameId,
      ...(typeof item.parentFrameId === "string" ? { parentFrameId: item.parentFrameId } : {}),
      category: item.category as PublicPresentationEventCategory,
      ...(typeof item.actorId === "string" ? { actorId: item.actorId } : {}),
      affectedPlayerIds,
      publicLabels: [typeof item.label === "string" ? item.label : undefined,
        typeof record(item.effect)?.label === "string" ? record(item.effect)!.label as string : undefined],
    });
  return {
    semantics: "PROVEN",
    visibility: "PUBLIC",
    identity: eventIdentity,
    eventId: item.eventId,
    ...(item.resolutionId ? { resolutionId: item.resolutionId as string } : {}),
    order: item.order as number,
    ...(item.frameId ? { frameId: item.frameId as string } : {}),
    ...(item.parentFrameId ? { parentFrameId: item.parentFrameId as string } : {}),
    ...(item.rootEventId ? { rootEventId: item.rootEventId as string } : {}),
    category: item.category as PublicPresentationEventCategory,
    ...(item.actorId ? { actorId: item.actorId as string } : {}),
    affectedPlayerIds,
    ...(item.label ? { label: item.label as string } : {}),
    ...(item.outcomeLabel ? { outcomeLabel: item.outcomeLabel } : {}),
    ...(item.amount !== undefined ? { amount: item.amount as number } : {}),
    ...(record(item.effect) ? { effect: {
      kind: record(item.effect)!.kind as string,
      ...(typeof record(item.effect)!.label === "string" ? { label: record(item.effect)!.label as string } : {}),
    } } : {}),
    ...(committedOutcome ? { committedOutcome } : {}),
    ...(bumperHarvestPick ? { bumperHarvestPick } : {}),
  };
}

function publicBumperHarvestPick(value: unknown, event: Record<string, unknown> | null, current: PresentationSemanticIdentity): PublicBumperHarvestPick | null {
  const item = record(value);
  const committedIdentity = identity(item?.committedIdentity);
  const face = record(item?.chosenFace);
  const cardKind = typeof face?.kind === "string" && CARD_DEFINITIONS[face.kind as CardKind] ? face.kind as CardKind : null;
  const suit = face?.suit === "♥" || face?.suit === "♦" || face?.suit === "♣" || face?.suit === "♠" ? face.suit as CardSuit : null;
  const rank = typeof face?.rank === "string" && ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"].includes(face.rank)
    ? face.rank as CardRank : null;
  if (!item || !event || item.semantics !== "PROVEN" || item.visibility !== "PUBLIC"
    || !committedIdentity || !sameInteraction(committedIdentity, current)
    || committedIdentity.presentationRevision > current.presentationRevision
    || item.eventId !== event.eventId || item.order !== event.order || item.actorId !== event.actorId
    || item.rootEventId !== event.rootEventId || !nonEmptyString(item.chosenCardId)
    || !cardKind || !suit || !rank || !nonEmptyString(event.eventId)
    || !Number.isSafeInteger(event.order) || !nonEmptyString(event.actorId) || !nonEmptyString(event.rootEventId)) return null;
  return {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: event.eventId, order: event.order as number,
    actorId: event.actorId, rootEventId: event.rootEventId, chosenCardId: item.chosenCardId,
    chosenFace: { kind: cardKind, suit, rank }, committedIdentity,
  };
}

function retainedPublicFactWithOutcome(
  event: Record<string, unknown>,
  fact: Record<string, unknown>,
  eventIdentity: PresentationSemanticIdentity,
  currentIdentity: PresentationSemanticIdentity,
) {
  const affectedPlayerIds = uniqueStrings(fact.affectedPlayerIds ?? [], true) ?? [];
  const eventActorId = nonEmptyString(event.actorId) ? event.actorId : undefined;
  const factActorId = nonEmptyString(fact.actorId) ? fact.actorId : undefined;
  const effectLabel = record(fact.effect)?.label;
  const factIdentity = identity(fact.committedIdentity);
  const outcome = fact.committedOutcome === undefined || Boolean(eventActorId && factActorId && eventActorId !== factActorId)
    || !factIdentity ? null
    : bindCommittedPublicOutcome(fact.committedOutcome, {
      eventId: event.id as string,
      order: event.publicSequence as number,
      identity: factIdentity,
      currentIdentity,
      rootEventId: typeof fact.rootEventId === "string" ? fact.rootEventId : "",
      frameId: typeof fact.frameId === "string" ? fact.frameId : "",
      ...(typeof fact.parentFrameId === "string" ? { parentFrameId: fact.parentFrameId } : {}),
      category: fact.category as PublicPresentationEventCategory,
      ...(eventActorId ?? factActorId ? { actorId: eventActorId ?? factActorId } : {}),
      affectedPlayerIds,
      publicLabels: [typeof fact.label === "string" ? fact.label : undefined,
        typeof effectLabel === "string" ? effectLabel : undefined],
    });
  const { committedOutcome: _untrustedDraft, ...base } = fact;
  void _untrustedDraft;
  return {
    ...base,
    identity: eventIdentity,
    eventId: event.id,
    order: event.publicSequence,
    affectedPlayerIds,
    ...(typeof event.resolutionId === "string" ? { resolutionId: event.resolutionId } : {}),
    ...(outcome ? { committedOutcome: outcome } : {}),
  };
}

const RETAINED_PUBLIC_EVENT_FACT_LIMIT = 32;
const RETAINABLE_PUBLIC_EVENT_CATEGORIES: ReadonlySet<PublicPresentationEventCategory> = new Set(PUBLIC_PRESENTATION_EVENT_CATEGORIES);

function retainedPublicFactFromEvent(event: Record<string, unknown>): PublicPresentationEvent | null {
  const fact = record(event.publicFact);
  const committedIdentity = identity(fact?.committedIdentity);
  if (!fact || !committedIdentity || fact.interactionId !== committedIdentity.interactionId || !nonEmptyString(fact.rootEventId)
    || !RETAINABLE_PUBLIC_EVENT_CATEGORIES.has(fact.category as PublicPresentationEventCategory)
    || fact.category === "CARD_EQUIPPED" && !isCommittedPublicEquipmentFact(event, fact)) return null;
  const retained = publicEvent(retainedPublicFactWithOutcome(event, fact, committedIdentity, committedIdentity), committedIdentity);
  if (!retained) return null;
  if (fact.category === "CARD_DISCARDED" && !isCommittedPublicDiscardFact(event, fact)
    && !retained.committedOutcome?.changes.some((change) => change.kind === "CARD_DISCARDED")) return null;
  return retained;
}

/** Retains a bounded, ordered queue of independently committed public outcomes at rest. */
export function retainedPublicEventFromTimeline(timeline: readonly unknown[]): { event: PublicPresentationEvent; facts: PublicPresentationEvent[] } | null {
  const events = timeline.map(record).filter((event): event is Record<string, unknown> => Boolean(event))
    .filter((event) => event.presentation !== false && typeof event.privateToPlayerId !== "string"
      && nonEmptyString(event.id) && Number.isSafeInteger(event.publicSequence) && (event.publicSequence as number) >= 0)
    .sort((left, right) => (left.publicSequence as number) - (right.publicSequence as number));
  if (new Set(events.map((event) => event.id)).size !== events.length
    || new Set(events.map((event) => event.publicSequence)).size !== events.length) return null;
  const facts: PublicPresentationEvent[] = [];
  let latestIndex = -1;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (record(event.publicFact)) {
      const retained = retainedPublicFactFromEvent(event);
      if (!retained) {
        // An unprovable newest fact must not fall back to stale older narration.
        if (latestIndex < 0) return null;
      } else {
        facts.push(retained);
        if (latestIndex < 0) latestIndex = index;
        if (facts.length >= RETAINED_PUBLIC_EVENT_FACT_LIMIT) break;
      }
    }
    // A newer committed card action supersedes an earlier result. Do not
    // reconstruct its meaning from a message or from the displayed CardFace.
    if (latestIndex < 0 && (event.type === "card" || event.type === "cards")
      && (event.action === "play" || event.action === "equip" || event.action === "activate")) return null;
  }
  if (latestIndex < 0 || !facts.length) return null;
  const latest = facts[0];
  return { event: latest, facts: facts.reverse() };
}

export function validateRetainedPublicEvent(value: unknown): PublicPresentationEvent | null {
  const eventIdentity = identity(record(value)?.identity);
  return eventIdentity ? publicEvent(value, eventIdentity) : null;
}

function nextDecision(value: unknown, current: PresentationSemanticIdentity): PublicPresentationDecision | null {
  const item = record(value);
  const decisionIdentity = identity(item?.identity);
  // A public response window may have several eligible viewers without naming
  // any one actor. The local CurrentAction remains the source for each viewer.
  const actorIds = uniqueStrings(item?.actorIds, true);
  const actionLabels = uniqueStrings(item?.actionLabels, true);
  if (!item || item.semantics !== "PROVEN" || (item.visibility !== "PUBLIC" && item.visibility !== "REDACTED") || !decisionIdentity
    || !sameIdentity(decisionIdentity, current) || !nonEmptyString(item.decisionId)
    || !nonEmptyString(item.stage) || !nonEmptyString(item.stageLabel) || !actorIds || !actionLabels
    || item.visibility === "PUBLIC" && typeof item.responseWindowOpen !== "boolean"
    || item.visibility === "REDACTED" && (item.responseWindowOpen !== null || actorIds.length > 0
      || actionLabels.length > 0 || item.nextEffect !== undefined)) return null;
  const nextEffect = item.nextEffect === undefined ? null : record(item.nextEffect);
  if (item.nextEffect !== undefined && (!nextEffect || !nonEmptyString(nextEffect.kind)
    || nextEffect.label !== undefined && !nonEmptyString(nextEffect.label))) return null;
  return {
    semantics: "PROVEN",
    visibility: item.visibility as PublicPresentationDecision["visibility"],
    identity: decisionIdentity,
    decisionId: item.decisionId,
    stage: item.stage,
    stageLabel: item.stageLabel,
    actorIds,
    actionLabels,
    ...(nextEffect ? { nextEffect: {
      kind: nextEffect.kind as string,
      ...(typeof nextEffect.label === "string" ? { label: nextEffect.label } : {}),
    } } : {}),
    responseWindowOpen: item.responseWindowOpen as boolean | null,
  };
}

/**
 * Normalizes generic, server-proven public facts and the current viewer's
 * server-authorized choice. It never derives game legality or provider meaning.
 */
export function projectPublicPresentationSemantics(input: {
  identity: unknown;
  events: readonly unknown[];
  nextDecision: unknown;
  viewerNegationChoice?: unknown;
}): PublicPresentationSemantics {
  const current = identity(input.identity);
  if (!current) return { identity: null, event: null, events: [], nextDecision: null, viewerNegationChoice: null };

  const events = input.events.map((candidate) => publicEvent(candidate, current)).filter((candidate): candidate is PublicPresentationEvent => Boolean(candidate));
  const duplicateIds = new Set<string>();
  const duplicateOrders = new Set<number>();
  const seenIds = new Set<string>();
  const seenOrders = new Set<number>();
  for (const event of events) {
    if (seenIds.has(event.eventId)) duplicateIds.add(event.eventId);
    if (seenOrders.has(event.order)) duplicateOrders.add(event.order);
    seenIds.add(event.eventId);
    seenOrders.add(event.order);
  }
  const orderedEvents = duplicateIds.size || duplicateOrders.size
    ? []
    : events.sort((left, right) => left.order - right.order);
  const event = orderedEvents.at(-1) ?? null;
  const decision = nextDecision(input.nextDecision, current);
  return {
    identity: current,
    event,
    events: orderedEvents,
    nextDecision: decision,
    viewerNegationChoice: viewerNegationChoice(input.viewerNegationChoice),
  };
}

function viewerNegationChoice(value: unknown): ViewerNegationChoice | null {
  const item = record(value);
  if (!item || !nonEmptyString(item.windowId) || typeof item.locked !== "boolean"
    || item.choice !== null && item.choice !== "pass" && item.choice !== "negation_intent"
    || item.choice !== null && !item.locked) return null;
  return { windowId: item.windowId, locked: item.locked, choice: item.choice as ViewerNegationChoice["choice"] };
}

/** Builds a public next-stage fact only from a coherent server snapshot. */
export function publicDecisionFromPresentationSnapshot(value: unknown): PublicPresentationDecision | null {
  const snapshot = record(value);
  const identityRow = record(snapshot?.identity);
  const snapshotIdentity = identityRow && nonEmptyString(identityRow.interactionId)
    && nonEmptyString(identityRow.checkpointId) && Number.isSafeInteger(identityRow.presentationRevision)
    && (identityRow.presentationRevision as number) >= 0
    ? {
      interactionId: identityRow.interactionId as string,
      checkpointId: identityRow.checkpointId as string,
      presentationRevision: identityRow.presentationRevision as number,
    }
    : null;
  const interaction = record(snapshot?.interaction);
  const stable = record(snapshot?.stable);
  if (!snapshotIdentity || !interaction || !stable || interaction.semantics !== "PROVEN"
    || !nonEmptyString(interaction.rootFrameId) || interaction.interactionId !== snapshotIdentity.interactionId
    || interaction.checkpointId !== snapshotIdentity.checkpointId
    || interaction.presentationRevision !== snapshotIdentity.presentationRevision
    || (stable.kind !== "CHOICE" && stable.kind !== "SPECIAL")
    || stable.interactionId !== snapshotIdentity.interactionId
    || stable.checkpointId !== snapshotIdentity.checkpointId
    || stable.presentationRevision !== snapshotIdentity.presentationRevision) return null;
  const next = record(snapshot?.publicNextDecision);
  if (!next || next.stage !== interaction.stage) return null;
  const current: PresentationSemanticIdentity = { ...snapshotIdentity, rootFrameId: interaction.rootFrameId };
  const decision = nextDecision(next, current);
  if (!decision) return null;
  if (stable.kind === "CHOICE" && (!nonEmptyString(stable.decisionActorId)
    || !decision.actorIds.includes(stable.decisionActorId))) return null;
  if (stable.kind === "SPECIAL" && stable.decisionActorId !== null) return null;
  return decision;
}

/** Validates structured committed event facts against the current causal frame graph. */
export function publicEventFactsFromPresentationV2(value: unknown, identityValue: unknown, framesValue: unknown): PublicPresentationEvent[] {
  const current = identity(identityValue);
  const frames = Array.isArray(framesValue) ? framesValue.map(record).filter((frame): frame is Record<string, unknown> => Boolean(frame)) : [];
  if (!current || !frames.length) return [];
  const accepted = Array.isArray(value) ? value.flatMap((candidate) => {
    const item = record(candidate);
    if (!item || item.semantics !== "PROVEN" || item.visibility !== "PUBLIC"
      || item.interactionId !== current.interactionId || !nonEmptyString(item.frameId)) return [];
    const frame = frames.find((candidateFrame) => candidateFrame.frameId === item.frameId);
    if (!frame || item.parentFrameId !== undefined && item.parentFrameId !== (frame.parentFrameId ?? undefined)) return [];
    const fact = publicEvent({
      semantics: "PROVEN", visibility: "PUBLIC", identity: current,
      eventId: item.eventId, order: item.order, frameId: item.frameId,
      ...(item.resolutionId ? { resolutionId: item.resolutionId } : {}),
      ...(item.parentFrameId ? { parentFrameId: item.parentFrameId } : {}),
      ...(item.rootEventId ? { rootEventId: item.rootEventId } : {}),
      category: item.category, actorId: item.actorId,
      affectedPlayerIds: item.affectedPlayerIds ?? [], label: item.label,
      outcomeLabel: item.outcomeLabel, amount: item.amount, effect: item.effect,
      committedOutcome: item.committedOutcome,
      bumperHarvestPick: item.bumperHarvestPick,
    }, current);
    if (!fact || fact.category === "CARD_DISCARDED" && !fact.committedOutcome) return [];
    return [fact];
  }) : [];
  const eventIds = new Set<string>();
  const orders = new Set<number>();
  for (const item of accepted) {
    if (eventIds.has(item.eventId) || orders.has(item.order)) return [];
    eventIds.add(item.eventId);
    orders.add(item.order);
  }
  return accepted.sort((left, right) => left.order - right.order);
}
