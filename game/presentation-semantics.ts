import { CARD_DEFINITIONS } from "./cards";

/** Stable public identity shared by the public event and the current decision. */
export type PresentationSemanticIdentity = {
  interactionId: string;
  rootFrameId: string;
  checkpointId: string;
  presentationRevision: number;
};

/** Generic meanings are provider-neutral; card, Hero and skill IDs do not belong here. */
export type PublicPresentationEventCategory =
  | "CARD_PLAYED"
  | "CARD_DISCARDED"
  | "CARD_OBTAINED"
  | "CARD_TRANSFERRED"
  | "EFFECT_APPLIED"
  | "EFFECT_CANCELLED"
  | "EFFECT_RESTORED"
  | "DAMAGE_APPLIED"
  | "DAMAGE_PREVENTED"
  | "SKILL_USED"
  | "ACTION_DECLINED"
  | "STAGE_COMPLETED";

export type PublicEffectDescriptor = { kind: string; label?: string };

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
};

/** Reads only structured, committed public log records; never inspects message text. */
export function collectPublicPresentationEventFacts(input: {
  timeline: readonly unknown[];
  identity: unknown;
  frames: readonly unknown[];
  rootEventId?: string | null;
}): PublicPresentationEventFactDraft[] {
  const current = identity(input.identity);
  if (!current) return [];
  const frameRows = input.frames.map(record).filter((frame): frame is Record<string, unknown> => Boolean(frame));
  if (!frameRows.length) return [];
  const frameIds = new Set(frameRows.flatMap((frame) => typeof frame.frameId === "string" ? [frame.frameId] : []));
  const facts: PublicPresentationEventFactDraft[] = [];
  input.timeline.forEach((candidate) => {
    const event = record(candidate);
    if (!event || !nonEmptyString(event.id) || event.presentation === false || typeof event.privateToPlayerId === "string"
      || !Number.isSafeInteger(event.appendOrder) || (event.appendOrder as number) < 0) return;
    const order = event.appendOrder as number;
    const raw = record(event.publicFact);
    if (raw) {
      if (raw.semantics !== "PROVEN" || raw.visibility !== "PUBLIC"
        || raw.interactionId !== current.interactionId || !nonEmptyString(raw.frameId) || !frameIds.has(raw.frameId)) return;
      const frame = frameRows.find((row) => row.frameId === raw.frameId);
      if (raw.parentFrameId !== undefined && raw.parentFrameId !== (frame?.parentFrameId ?? undefined)) return;
      const fact: PublicPresentationEventFactDraft = {
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
      };
      facts.push(fact);
      return;
    }

    // Root card identity is inherited only through the exact Pending-proven
    // event ID. The public fact remains intentionally less specific.
    if (event.id !== input.rootEventId || event.type !== "card" && event.type !== "cards") return;
    if (event.action !== "play" && event.action !== "equip" && event.action !== "discard"
      && event.action !== "gain" && event.action !== "reveal" && event.action !== "activate") return;
    const category: PublicPresentationEventCategory = event.action === "play" || event.action === "equip" ? "CARD_PLAYED"
      : event.action === "discard" ? "CARD_DISCARDED"
        : event.action === "gain" ? "CARD_OBTAINED"
          : event.action === "activate" ? "SKILL_USED" : "EFFECT_APPLIED";
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

const EVENT_CATEGORIES = new Set<PublicPresentationEventCategory>([
  "CARD_PLAYED", "CARD_DISCARDED", "CARD_OBTAINED", "CARD_TRANSFERRED", "EFFECT_APPLIED",
  "EFFECT_CANCELLED", "EFFECT_RESTORED", "DAMAGE_APPLIED", "DAMAGE_PREVENTED", "SKILL_USED",
  "ACTION_DECLINED", "STAGE_COMPLETED",
]);

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
  };
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
    }, current);
    return fact ? [fact] : [];
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
