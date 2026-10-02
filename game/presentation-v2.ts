import type { CurrentAction } from "./protocol";

/** UX2.0B foundation contract; no interaction/frame/checkpoint identities. */
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
  rootContext: { eventId: string | null; kind: string | null; sourceId: string | null; originalTargetIds: readonly string[]; resolutionId: string | null } | null;
  activeContext: { kind: string | null; stage: string | null; sourceId: string | null; currentTargetIds: readonly string[]; eventIds: readonly string[]; resolutionId: string | null } | null;
  parentContext: { kind: string | null; sourceId: string | null; targetIds: readonly string[]; resumeKind: string | null } | null;
  participants: readonly PresentationParticipant[];
  groupResolution: { cardKind: string; sourceId: string | null; semantics: "UNPROVEN"; participantIds: readonly string[]; activeParticipantId: string | null } | null;
  decision: { kind: CurrentAction["kind"] | null; actorId: string | null; actionRevision: string; resolutionId: string | null; readyAfterEventId: string | null; deadline: number } | null;
  settlement: { eventId: string; resolutionId: string | null } | null;
  transitionEvents: readonly { eventId: string; type: string; resolutionId: string | null }[];
};

type RecordLike = Record<string, unknown>;
type Context = {
  kind: string; stage: string; sourceId: string | null; targetIds: string[]; originalTargetIds: string[];
  resolutionId: string | null; sequenceStartCardId: string | null; cardKind: string | null;
  participantIds: string[]; activeParticipantId: string | null;
};

function record(value: unknown): RecordLike | null { return value && typeof value === "object" && !Array.isArray(value) ? value as RecordLike : null; }
function stringValue(value: unknown): string | null { return typeof value === "string" && value.length > 0 ? value : null; }
function unique(values: readonly (string | null | undefined)[]): string[] { return [...new Set(values.filter((value): value is string => Boolean(value)))]; }
function strings(value: unknown): string[] { return Array.isArray(value) ? unique(value.map(stringValue)) : []; }
function firstString(...values: unknown[]): string | null { for (const value of values) { const result = stringValue(value); if (result) return result; } return null; }
function firstRecord(...values: unknown[]): RecordLike | null { for (const value of values) { const candidate = record(value); if (candidate) return candidate; } return null; }

function stageFor(kind: string, value: RecordLike): string {
  if (kind === "response" || kind === "trigger") return stringValue(value.event) ?? kind;
  if (kind === "dying") return "dying";
  // cardKind is descriptive metadata, never proof of Group semantics.
  if (kind === "group") return "group";
  if (kind === "negation") return "negation";
  if (kind === "judgement" || kind.includes("judgement") || value.judgement) return "judgement";
  if (kind.includes("damage")) return "damage";
  return kind;
}

function contextFor(value: unknown): Context | null {
  const item = record(value); if (!item) return null;
  const kind = stringValue(item.kind); if (!kind) return null;
  const declaration = record(item.declaration);
  const continuation = record(item.continuation);
  const judgement = record(item.judgement);
  const resume = record(judgement?.resume);
  return {
    kind,
    stage: stageFor(kind, item),
    sourceId: firstString(item.sourceId, declaration?.sourceId, continuation?.sourceId, judgement?.sourceId),
    targetIds: unique([...strings(item.targetIds), ...strings(continuation?.targetIds), firstString(item.targetId, item.effectTargetId, continuation?.targetId, continuation?.effectTargetId, judgement?.targetId, resume?.targetId)]),
    // Historical targets must come from explicit root/declaration data only.
    originalTargetIds: unique([...strings(item.originalTargetIds), ...strings(declaration?.targetIds), firstString(item.originalTargetId, declaration?.targetId)]),
    resolutionId: firstString(item.resolutionId, continuation?.resolutionId, declaration?.resolutionId, judgement?.resolutionId),
    sequenceStartCardId: firstString(item.sequenceStartCardId, continuation?.sequenceStartCardId, declaration?.sequenceStartCardId, judgement?.revealedEventId),
    cardKind: firstString(item.cardKind, continuation?.cardKind),
    participantIds: unique([...strings(item.remainingIds), ...strings(continuation?.remainingIds)]),
    activeParticipantId: firstString(item.activeParticipantId, item.currentParticipantId, continuation?.activeParticipantId, continuation?.currentParticipantId),
  };
}

/** Parent direction is taken from known continuation discriminators. */
function parentValue(pending: RecordLike | null, activeValue: RecordLike | null): unknown {
  const pendingKind = stringValue(pending?.kind);
  if (pendingKind === "dying") return firstRecord(pending?.resumePending, pending?.resumeTrigger, pending?.resumeEffect);
  const continuation = record(pending?.continuation) ?? activeValue;
  switch (stringValue(continuation?.kind)) {
    case "damage_suffered_event": return firstRecord(continuation?.resumeGroup, continuation?.resumeDamageSuffered, continuation?.resumeTurnEnd);
    case "attack_targeted_event": return firstRecord(continuation?.group);
    case "judgement":
    case "judgement_revealed_event":
    case "judgement_effective_event": return firstRecord(continuation?.resume, record(continuation?.judgement)?.resume);
    case "negation": return firstRecord(record(continuation?.effect)?.pending);
    case "trigger": return firstRecord(continuation?.resume);
    default: return null;
  }
}

function pendingContexts(pending: unknown) {
  const pendingRecord = record(pending);
  const pendingContext = contextFor(pending);
  const continuation = record(pendingRecord?.continuation);
  const active = continuation ? contextFor(continuation) ?? pendingContext : pendingContext;
  const parent = contextFor(parentValue(pendingRecord, continuation));
  // Only an actual GroupContinuation can produce groupResolution.
  const group = active?.kind === "group" ? record(continuation) ?? pendingRecord : null;
  return { active, parent, group, root: pendingContext };
}

function eventCardIds(event: PresentationV2Event): string[] { return unique([event.card?.id, ...(event.cards ?? []).map((card) => card.id ?? null)]); }
function eventForContext(context: Context | null, timeline: readonly PresentationV2Event[], barrierId: string | null): PresentationV2Event | null {
  if (!context) return null;
  if (context.sequenceStartCardId) {
    const byCard = timeline.find((event) => event.presentation !== false && eventCardIds(event).includes(context.sequenceStartCardId as string));
    if (byCard) return byCard;
  }
  if (barrierId) return timeline.find((event) => event.id === barrierId && event.presentation !== false) ?? null;
  return null;
}

function participants(active: Context | null, group: RecordLike | null): PresentationParticipant[] {
  if (!active) return [];
  const map = new Map<string, Set<PresentationParticipant["roles"][number]>>();
  const add = (id: string | null, role: PresentationParticipant["roles"][number]) => { if (!id) return; const roles = map.get(id) ?? new Set(); roles.add(role); map.set(id, roles); };
  add(active.sourceId, "source");
  active.targetIds.forEach((id, index) => add(id, index === 0 ? "current_target" : "target"));
  if (group) strings(group.remainingIds).forEach((id) => add(id, "group_participant"));
  return [...map].map(([playerId, roles]) => ({ playerId, roles: [...roles] }));
}

/** Pure, deterministic projection. CurrentAction remains the legality authority. */
export function projectPresentationV2(input: PresentationV2Input): PresentationV2 {
  const { active, parent, group, root } = pendingContexts(input.pending);
  const barrierId = input.currentAction?.presentation?.readyAfterEventId ?? null;
  const legacyResolutionId = firstString(input.currentAction?.presentation?.resolutionId, active?.resolutionId, parent?.resolutionId, root?.resolutionId);
  const rootEvent = eventForContext(root, input.timeline, barrierId) ?? eventForContext(active, input.timeline, barrierId);
  const activeEvent = eventForContext(active, input.timeline, barrierId);
  const parentEvent = eventForContext(parent, input.timeline, barrierId);
  const relevantIds = unique([rootEvent?.id, activeEvent?.id, parentEvent?.id, barrierId]);
  const settlementEvent = input.timeline.find((event) => relevantIds.includes(event.id) && event.finalResult === true) ?? null;
  if (settlementEvent) relevantIds.push(settlementEvent.id);
  const groupCardKind = group ? firstString(group.cardKind, group.kind === "group" ? "group" : null) : null;
  const rootContext = (root || active || rootEvent) ? {
    eventId: rootEvent?.id ?? null,
    kind: root?.kind ?? active?.kind ?? null,
    sourceId: root?.sourceId ?? active?.sourceId ?? null,
    originalTargetIds: root?.originalTargetIds ?? [],
    resolutionId: legacyResolutionId,
  } : null;
  return {
    rootContext,
    activeContext: active ? { kind: active.kind, stage: active.stage, sourceId: active.sourceId, currentTargetIds: active.targetIds, eventIds: relevantIds.filter((id) => id === activeEvent?.id || id === barrierId), resolutionId: legacyResolutionId } : null,
    parentContext: parent ? { kind: parent.kind, sourceId: parent.sourceId, targetIds: parent.targetIds, resumeKind: parent.kind } : null,
    participants: participants(active, group),
    groupResolution: groupCardKind ? { cardKind: groupCardKind, sourceId: firstString(group.sourceId), semantics: "UNPROVEN", participantIds: strings(group.remainingIds), activeParticipantId: firstString(group.activeParticipantId, group.currentParticipantId) } : null,
    decision: input.currentAction ? { kind: input.currentAction.kind, actorId: input.currentAction.actorId, actionRevision: input.actionRevision, resolutionId: input.currentAction.presentation?.resolutionId ?? null, readyAfterEventId: barrierId, deadline: input.currentAction.deadline } : null,
    settlement: settlementEvent ? { eventId: settlementEvent.id, resolutionId: settlementEvent.resolutionId ?? null } : null,
    transitionEvents: input.timeline.filter((event) => event.presentation !== false && relevantIds.includes(event.id)).map((event) => ({ eventId: event.id, type: event.type, resolutionId: event.resolutionId ?? null })),
  };
}

/** Read-only characterization helper for the existing client-armed timer contract. */
export function presentationBarrierState(input: { currentAction: Pick<CurrentAction, "deadline" | "presentation"> | null; timeline: readonly PresentationV2Event[]; presentedEventIds?: ReadonlySet<string>; now?: number; }) {
  const barrierId = input.currentAction?.presentation?.readyAfterEventId ?? null;
  const barrier = barrierId ? input.timeline.find((event) => event.id === barrierId) ?? null : null;
  const presented = input.presentedEventIds?.has(barrierId ?? "") ?? false;
  const barrierOpen = !barrierId || Boolean(presented || barrier?.type === "message" || barrier?.importance === "informational");
  const deadline = input.currentAction?.deadline ?? 0;
  return { barrierId, barrierOpen, deadline, deadlineStarted: deadline > 0, expired: deadline > 0 && (input.now ?? Date.now()) >= deadline } as const;
}
