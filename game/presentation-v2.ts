import type { CurrentAction } from "./protocol";

/**
 * UX2.0B foundation types. These are deliberately descriptive and do not
 * introduce interactionId, frameId, checkpointId, or presentationRevision.
 */
export type PresentationV2Event = {
  id: string;
  type: "message" | "card" | "cards" | string;
  player?: string;
  target?: string;
  card?: { id?: string; kind?: string };
  cards?: readonly { id?: string; kind?: string }[];
  action?: string;
  resolutionId?: string;
  importance?: "essential" | "informational";
  finalResult?: boolean;
  presentation?: boolean;
  judgement?: boolean;
};

export type PresentationV2Input = {
  pending: unknown | null;
  currentAction: Pick<CurrentAction, "kind" | "actorId" | "reason" | "deadline" | "declineAction" | "presentation"> | null;
  actionRevision: string;
  timeline: readonly PresentationV2Event[];
};

export type PresentationParticipant = {
  playerId: string;
  roles: readonly ("source" | "target" | "current_target" | "responder" | "group_participant")[];
};

export type PresentationV2 = {
  rootContext: {
    eventId: string | null;
    kind: string | null;
    sourceId: string | null;
    originalTargetIds: readonly string[];
    resolutionId: string | null;
  } | null;
  activeContext: {
    kind: string | null;
    stage: string | null;
    sourceId: string | null;
    currentTargetIds: readonly string[];
    eventIds: readonly string[];
    resolutionId: string | null;
  } | null;
  parentContext: {
    kind: string | null;
    sourceId: string | null;
    targetIds: readonly string[];
    resumeKind: string | null;
  } | null;
  participants: readonly PresentationParticipant[];
  groupResolution: {
    cardKind: string;
    sourceId: string | null;
    semantics: "UNPROVEN";
    participantIds: readonly string[];
    activeParticipantId: string | null;
  } | null;
  decision: {
    kind: CurrentAction["kind"] | null;
    actorId: string | null;
    actionRevision: string;
    resolutionId: string | null;
    readyAfterEventId: string | null;
    deadline: number;
  } | null;
  settlement: {
    eventId: string;
    resolutionId: string | null;
  } | null;
  transitionEvents: readonly {
    eventId: string;
    type: string;
    resolutionId: string | null;
  }[];
};

type RecordLike = Record<string, unknown>;

function record(value: unknown): RecordLike | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordLike : null;
}

function stringValue(value: unknown): string | null { return typeof value === "string" && value.length > 0 ? value : null; }
function unique(values: readonly (string | null | undefined)[]): string[] { return [...new Set(values.filter((value): value is string => Boolean(value)))]; }
function arrayOfStrings(value: unknown): string[] { return Array.isArray(value) ? unique(value.map(stringValue)) : []; }

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const result = stringValue(value);
    if (result) return result;
  }
  return null;
}

type Context = {
  kind: string;
  stage: string;
  sourceId: string | null;
  targetIds: string[];
  resolutionId: string | null;
  sequenceStartCardId: string | null;
  cardKind: string | null;
  participantIds: string[];
  nested: RecordLike | null;
};

function contextFor(value: unknown): Context | null {
  const item = record(value);
  if (!item) return null;
  const kind = stringValue(item.kind);
  if (!kind) return null;
  const declaration = record(item.declaration);
  const continuation = record(item.continuation);
  const judgement = record(item.judgement);
  const judgementResume = record(judgement?.resume);
  const sourceId = firstString(item.sourceId, declaration?.sourceId, continuation?.sourceId, judgement?.sourceId);
  const targetIds = unique([
    ...arrayOfStrings(item.targetIds),
    ...arrayOfStrings(declaration?.targetIds),
    ...arrayOfStrings(continuation?.targetIds),
    firstString(item.targetId, item.effectTargetId, declaration?.targetId, continuation?.targetId, continuation?.effectTargetId, judgement?.targetId, judgementResume?.targetId),
  ]);
  const nested = firstRecord(
    item.resumePending,
    item.resumeTrigger,
    item.resumeDamageSuffered,
    item.resumeGroup,
    item.resume,
    item.resumeEffect,
    judgementResume,
    continuation?.resumePending,
    continuation?.resumeTrigger,
    continuation?.resumeDamageSuffered,
    continuation?.resumeGroup,
    continuation?.resume,
    continuation?.effect && record(continuation.effect)?.pending,
    item.effect && record(item.effect)?.pending,
  );
  return {
    kind,
    stage: stageFor(kind, item),
    sourceId,
    targetIds,
    resolutionId: firstString(item.resolutionId, continuation?.resolutionId, declaration?.resolutionId, judgement?.resolutionId),
    sequenceStartCardId: firstString(item.sequenceStartCardId, continuation?.sequenceStartCardId, declaration?.sequenceStartCardId, judgement?.revealedEventId),
    cardKind: firstString(item.cardKind, continuation?.cardKind),
    participantIds: unique([...arrayOfStrings(item.remainingIds), ...arrayOfStrings(continuation?.remainingIds)]),
    nested,
  };
}

function firstRecord(...values: unknown[]): RecordLike | null {
  for (const value of values) {
    const candidate = record(value);
    if (candidate) return candidate;
  }
  return null;
}

function stageFor(kind: string, value: RecordLike): string {
  if (kind === "response" || kind === "trigger") return stringValue(value.event) ?? kind;
  if (kind === "dying") return "dying";
  if (kind === "group" || stringValue(value.cardKind)) return "group";
  if (kind === "negation") return "negation";
  if (kind === "judgement" || kind.includes("judgement") || value.judgement) return "judgement";
  if (kind.includes("damage")) return "damage";
  return kind;
}

function pendingContext(pending: unknown): { active: Context | null; parent: Context | null; group: RecordLike | null } {
  const pendingRecord = record(pending);
  const active = contextFor(pending);
  const continuation = pendingRecord?.continuation;
  const continuationContext = contextFor(continuation);
  const actualActive = continuationContext ?? active;
  const nested = actualActive?.nested ?? null;
  const parent = contextFor(nested);
  const group = findGroup(actualActive, pendingRecord, nested);
  return { active: actualActive, parent, group };
}

function findGroup(...values: (Context | RecordLike | null)[]): RecordLike | null {
  for (const value of values) {
    const candidate = value && "kind" in value ? value : null;
    if (!candidate) continue;
    const item = "kind" in candidate ? candidate as RecordLike : null;
    if (item && (stringValue(item.cardKind) || item.kind === "group")) return item;
    const nested = item ? firstRecord(item.continuation, item.resumePending, item.resumeGroup, item.pending) : null;
    if (nested && (stringValue(nested.cardKind) || nested.kind === "group")) return nested;
  }
  return null;
}

function eventCardIds(event: PresentationV2Event): string[] {
  return unique([event.card?.id, ...(event.cards ?? []).map((card) => card.id ?? null)]);
}

function eventForContext(context: Context | null, timeline: readonly PresentationV2Event[]): PresentationV2Event | null {
  if (!context) return null;
  if (context.resolutionId) {
    const matching = timeline.find((event) => event.resolutionId === context.resolutionId && event.presentation !== false);
    if (matching) return matching;
  }
  if (context.sequenceStartCardId) {
    const matching = timeline.find((event) => eventCardIds(event).includes(context.sequenceStartCardId as string));
    if (matching) return matching;
  }
  return null;
}

function participantProjection(active: Context | null, group: RecordLike | null): PresentationParticipant[] {
  if (!active) return [];
  const participants = new Map<string, Set<PresentationParticipant["roles"][number]>>();
  const add = (id: string | null, role: PresentationParticipant["roles"][number]) => {
    if (!id) return;
    const roles = participants.get(id) ?? new Set<PresentationParticipant["roles"][number]>();
    roles.add(role); participants.set(id, roles);
  };
  add(active.sourceId, "source");
  active.targetIds.forEach((id, index) => add(id, index === 0 ? "current_target" : "target"));
  if (group) arrayOfStrings(group.remainingIds).forEach((id) => add(id, "group_participant"));
  return [...participants].map(([playerId, roles]) => ({ playerId, roles: [...roles] }));
}

/**
 * Pure, conservative projection of public causal meaning. It never decides
 * whether an action or target is legal; those remain in CurrentAction and the
 * authoritative engine.
 */
export function projectPresentationV2(input: PresentationV2Input): PresentationV2 {
  const { active, parent, group } = pendingContext(input.pending);
  const legacyResolutionId = firstString(input.currentAction?.presentation?.resolutionId, active?.resolutionId, parent?.resolutionId);
  const rootEvent = eventForContext(active, input.timeline) ?? eventForContext(parent, input.timeline);
  const rootContext = active || rootEvent
    ? {
        eventId: rootEvent?.id ?? null,
        kind: active?.kind ?? null,
        sourceId: active?.sourceId ?? null,
        originalTargetIds: active?.targetIds ?? [],
        resolutionId: legacyResolutionId,
      }
    : null;
  const eventIds = input.timeline.filter((event) => event.presentation !== false && (!legacyResolutionId || event.resolutionId === legacyResolutionId)).map((event) => event.id);
  const groupCardKind = group ? firstString(group.cardKind, group.kind === "group" ? "group" : null) : null;
  const participantIds = group ? [...("participantIds" in group && Array.isArray(group.participantIds) ? group.participantIds : arrayOfStrings(group.remainingIds))] : [];
  const settlementEvent = input.timeline.find((event) => event.finalResult === true && (!legacyResolutionId || event.resolutionId === legacyResolutionId)) ?? null;
  return {
    rootContext,
    activeContext: active ? { kind: active.kind, stage: active.stage, sourceId: active.sourceId, currentTargetIds: active.targetIds, eventIds, resolutionId: legacyResolutionId } : null,
    parentContext: parent ? { kind: parent.kind, sourceId: parent.sourceId, targetIds: parent.targetIds, resumeKind: parent.kind } : null,
    participants: participantProjection(active, group),
    groupResolution: groupCardKind ? { cardKind: groupCardKind, sourceId: firstString(group.sourceId), semantics: "UNPROVEN", participantIds, activeParticipantId: null } : null,
    decision: input.currentAction ? {
      kind: input.currentAction.kind,
      actorId: input.currentAction.actorId,
      actionRevision: input.actionRevision,
      resolutionId: input.currentAction.presentation?.resolutionId ?? null,
      readyAfterEventId: input.currentAction.presentation?.readyAfterEventId ?? null,
      deadline: input.currentAction.deadline,
    } : null,
    settlement: settlementEvent ? { eventId: settlementEvent.id, resolutionId: settlementEvent.resolutionId ?? null } : null,
    transitionEvents: input.timeline.filter((event) => event.presentation !== false).map((event) => ({ eventId: event.id, type: event.type, resolutionId: event.resolutionId ?? null })),
  };
}

/** A read-only characterization of the current barrier/timer contract. */
export function presentationBarrierState(input: {
  currentAction: Pick<CurrentAction, "deadline" | "presentation"> | null;
  timeline: readonly PresentationV2Event[];
  presentedEventIds?: ReadonlySet<string>;
  now?: number;
}) {
  const barrierId = input.currentAction?.presentation?.readyAfterEventId ?? null;
  const barrier = barrierId ? input.timeline.find((event) => event.id === barrierId) ?? null : null;
  const presented = input.presentedEventIds?.has(barrierId ?? "") ?? false;
  const barrierOpen = !barrierId || Boolean(presented || barrier?.type === "message" || barrier?.importance === "informational");
  const deadline = input.currentAction?.deadline ?? 0;
  return {
    barrierId,
    barrierOpen,
    deadline,
    deadlineStarted: deadline > 0,
    expired: deadline > 0 && (input.now ?? Date.now()) >= deadline,
  } as const;
}
