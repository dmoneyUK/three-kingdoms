import type { CurrentAction } from "./protocol";
import type { CausalEnvelope, CausalFrame } from "./presentation-causality";

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
  /** The parsed server-owned causal envelope; never reconstructed by this projector. */
  causalEnvelope?: CausalEnvelope | null;
};

export type PresentationParticipant = {
  playerId: string;
  roles: readonly ("source" | "target" | "current_target" | "responder" | "group_participant")[];
};

export type InteractionSceneContinuity = {
  relation: "UNPROVEN" | "ROOT_FRAME" | "SAME_FRAME" | "CHILD_FRAME";
  parentFrameId: string | null;
};

/** Public, server-owned semantic snapshot for a future Interaction Stage client. */
export type PresentationInteractionScene = {
  semantics: "PROVEN" | "UNPROVEN";
  interactionId: string | null;
  rootFrameId: string | null;
  activeFrameId: string | null;
  parentFrameId: string | null;
  checkpointId: string | null;
  presentationRevision: number | null;
  stage: CausalFrame["stage"] | null;
  sourceId: string | null;
  effect: string | null;
  targetIds: readonly string[];
  currentParticipantId: string | null;
  decisionActorId: string | null;
  activeResolverId: string | null;
  activeSourceId: string | null;
  activeTargetIds: readonly string[];
  participantIds: readonly string[];
  continuity: InteractionSceneContinuity;
};

export type PresentationDyingBarrier = {
  semantics: "PROVEN" | "UNPROVEN";
  interactionId: string | null;
  rootFrameId: string | null;
  activeFrameId: string | null;
  parentFrameId: string | null;
  checkpointId: string | null;
  presentationRevision: number | null;
  stage: "DYING" | null;
  dyingPlayerId: string | null;
  rescuerId: string | null;
  decisionActorId: string | null;
  state: "RESCUE_CHOICE" | "UNPROVEN";
};

export type PresentationV2 = {
  rootContext: { eventId: string | null; kind: string | null; sourceId: string | null; originalTargetIds: readonly string[]; resolutionId: string | null } | null;
  activeContext: { kind: string | null; stage: string | null; sourceId: string | null; currentTargetIds: readonly string[]; eventIds: readonly string[]; resolutionId: string | null } | null;
  parentContext: { kind: string | null; sourceId: string | null; targetIds: readonly string[]; resumeKind: string | null } | null;
  participants: readonly PresentationParticipant[];
  interactionScene: PresentationInteractionScene | null;
  dyingBarrier: PresentationDyingBarrier | null;
  groupResolution: {
    semantics: "PROVEN" | "UNPROVEN";
    interactionId: string | null;
    groupFrameId: string | null;
    activeFrameId: string | null;
    parentFrameId: string | null;
    checkpointId: string | null;
    presentationRevision: number | null;
    stage: CausalFrame["stage"] | null;
    cardKind: string;
    effect: string;
    sourceId: string | null;
    targetIds: readonly string[];
    currentParticipantId: string | null;
    decisionActorId: string | null;
    activeResolverId: string | null;
    activeSourceId: string | null;
    activeTargetIds: readonly string[];
    participantIds: readonly string[];
    activeParticipantId: string | null;
  } | null;
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
function continuationRecord(value: unknown): RecordLike | null {
  const item = record(value);
  return record(item?.continuation) ?? item;
}

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
    case "damage_suffered_event": return firstRecord(continuationRecord(continuation?.resumeGroup), continuationRecord(continuation?.resumeDamageSuffered), continuationRecord(continuation?.resumeTurnEnd));
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

type DyingDecisionProof = {
  pending: RecordLike;
  activeFrame: CausalFrame;
};

/**
 * One proof is shared by the Dying barrier and the generic interaction scene.
 * Pending is descriptive here: rescue legality is established by the engine
 * before this state is persisted, while the projector only proves coherence.
 */
function dyingDecisionProof(envelope: CausalEnvelope | null, pending: unknown): DyingDecisionProof | null {
  const pendingRecord = record(pending);
  if (pendingRecord?.kind !== "dying") return null;
  const activeFrame = envelope?.frames.find((frame) => frame.frameId === envelope.activeFrameId) ?? null;
  const checkpointFrame = envelope?.frames.find((frame) => frame.frameId === envelope.checkpoint.frameId) ?? null;
  const causal = record(pendingRecord.causal);
  const actorId = stringValue(pendingRecord.actorId);
  if (!envelope || !activeFrame || activeFrame.stage !== "DYING" || checkpointFrame?.frameId !== activeFrame.frameId
    || envelope.checkpoint.stage !== "DYING" || causal?.interactionId !== envelope.interactionId
    || causal.frameId !== activeFrame.frameId || !actorId || activeFrame.current.resolvingPlayerId !== actorId) return null;
  return { pending: pendingRecord, activeFrame };
}

/**
 * Follow only typed continuation edges. Presentation must not discover a
 * Group by recursively walking arbitrary pending data: that turns an
 * incidental nested object into public causal authority.
 */
function typedGroupContinuation(pending: unknown): RecordLike | null {
  const item = record(pending);
  if (!item) return null;
  if (item.kind === "response" && record(item.continuation)?.kind === "group") return record(item.continuation);
  if (item.kind === "response" && record(item.continuation)?.kind === "negation") {
    const effect = record(record(item.continuation)?.effect);
    const groupPending = record(effect?.pending);
    if (record(groupPending?.continuation)?.kind === "group") return record(groupPending.continuation);
  }
  if (item.kind === "trigger") {
    const continuation = record(item.continuation);
    if (continuation?.kind === "damage_suffered_event") {
      const resumeGroup = record(continuation.resumeGroup);
      if (record(resumeGroup?.continuation)?.kind === "group") return record(resumeGroup.continuation);
    }
  }
  if (item.kind === "dying") {
    const resumePending = record(item.resumePending);
    if (record(resumePending?.continuation)?.kind === "group") return record(resumePending.continuation);
    const resumeTrigger = record(item.resumeTrigger);
    const resumeGroup = record(resumeTrigger?.resumeGroup);
    if (record(resumeGroup?.continuation)?.kind === "group") return record(resumeGroup.continuation);
  }
  return null;
}

function typedGroupParticipantOwner(pending: unknown): string | null {
  const item = record(pending);
  if (!item) return null;
  if (item.kind === "response") return stringValue(item.actorId);
  if (item.kind === "trigger") return stringValue(item.actorId);
  if (item.kind === "dying") return stringValue(item.actorId);
  return null;
}

function groupFrameFor(envelope: CausalEnvelope | null, continuation: RecordLike | null): CausalFrame | null {
  if (!envelope) return null;
  const causal = record(continuation?.causal);
  const referenced = stringValue(causal?.frameId);
  return referenced ? envelope.frames.find((frame) => frame.frameId === referenced) ?? null : null;
}

type GroupProjectionValues = {
  groupFrame: CausalFrame | null;
  activeFrame: CausalFrame | null;
  cardKind: string;
  effect: string;
  sourceId: string | null;
  targetIds: readonly string[];
  currentParticipantId: string | null;
  participantIds: readonly string[];
  activeParticipantId: string | null;
};

function groupProjectionValues(envelope: CausalEnvelope | null, pending: unknown, group: RecordLike | null): GroupProjectionValues | null {
  if (!group) return null;
  const groupFrame = groupFrameFor(envelope, group);
  const activeFrame = envelope?.frames.find((frame) => frame.frameId === envelope.activeFrameId) ?? null;
  const origin = groupFrame?.origin;
  const current = groupFrame?.current;
  const targetIds = origin?.originalTargetIds ?? [];
  const participantIds = strings(group.remainingIds);
  const participantOwnerId = typedGroupParticipantOwner(pending);
  const parentParticipantId = current?.currentTargetIds.length === 1 ? current.currentTargetIds[0] : null;
  const childParticipantId = activeFrame && activeFrame.frameId !== groupFrame?.frameId && activeFrame.parentFrameId === groupFrame?.frameId
    && (activeFrame.stage === "DAMAGE" || activeFrame.stage === "DYING")
    ? firstString(activeFrame.origin.originalTargetIds[0], activeFrame.current.currentTargetIds[0])
    : null;
  return {
    groupFrame,
    activeFrame,
    cardKind: firstString(group.cardKind, origin?.originEffect) ?? "group",
    effect: origin?.originEffect ?? firstString(group.cardKind) ?? "group",
    sourceId: firstString(origin?.originSourceId, group.sourceId),
    targetIds,
    currentParticipantId: firstString(childParticipantId, parentParticipantId, participantOwnerId),
    participantIds,
    activeParticipantId: firstString(group.activeParticipantId, group.currentParticipantId),
  };
}

function interactionSceneFor(
  envelope: CausalEnvelope | null,
  currentAction: PresentationV2Input["currentAction"],
  groupValues: GroupProjectionValues | null,
  pending: unknown,
): PresentationInteractionScene | null {
  const activeFrame = groupValues?.activeFrame ?? envelope?.frames.find((frame) => frame.frameId === envelope.activeFrameId) ?? null;
  if (!groupValues && !envelope) return null;
  const checkpointFrame = envelope?.frames.find((frame) => frame.frameId === envelope.checkpoint.frameId) ?? null;
  const coherentCheckpoint = Boolean(activeFrame && checkpointFrame && envelope?.checkpoint.frameId === activeFrame.frameId && envelope.checkpoint.stage === activeFrame.stage);
  const proven = Boolean(envelope && activeFrame && (!groupValues || groupValues.groupFrame) && coherentCheckpoint);
  const activeCurrent = activeFrame?.current;
  const sourceId = groupValues?.sourceId ?? firstString(activeFrame?.origin.originSourceId, activeCurrent?.currentSourceId);
  const targetIds = groupValues?.targetIds ?? activeFrame?.origin.originalTargetIds ?? [];
  const currentParticipantId = groupValues?.currentParticipantId ?? firstString(activeCurrent?.currentTargetIds[0]);
  const pendingRecord = record(pending);
  const dyingProof = dyingDecisionProof(envelope, pending);
  const dyingPending = pendingRecord?.kind === "dying" ? pendingRecord : null;
  const relation: InteractionSceneContinuity["relation"] = !proven
    ? "UNPROVEN"
    : activeFrame?.parentFrameId
      ? "CHILD_FRAME"
      : groupValues && activeFrame?.stage === "NEGATION"
        ? "SAME_FRAME"
        : "ROOT_FRAME";
  return {
    semantics: proven ? "PROVEN" : "UNPROVEN",
    interactionId: proven ? envelope?.interactionId ?? null : null,
    rootFrameId: proven ? groupValues?.groupFrame?.frameId ?? envelope?.frames.find((frame) => frame.parentFrameId === null)?.frameId ?? null : null,
    activeFrameId: proven ? envelope?.activeFrameId ?? null : null,
    parentFrameId: proven ? activeFrame?.parentFrameId ?? null : null,
    checkpointId: proven ? envelope?.checkpoint.checkpointId ?? null : null,
    presentationRevision: proven ? envelope?.presentationRevision ?? null : null,
    stage: proven ? activeFrame?.stage ?? null : null,
    sourceId,
    effect: groupValues?.effect ?? activeFrame?.origin.originEffect ?? null,
    targetIds,
    currentParticipantId,
    decisionActorId: dyingProof ? dyingProof.pending.actorId as string : dyingPending ? null : currentAction?.actorId ?? null,
    activeResolverId: activeCurrent?.resolvingPlayerId ?? null,
    activeSourceId: activeCurrent?.currentSourceId ?? null,
    activeTargetIds: activeCurrent?.currentTargetIds ?? [],
    participantIds: groupValues?.participantIds ?? [],
    continuity: { relation, parentFrameId: proven ? activeFrame?.parentFrameId ?? null : null },
  };
}

function dyingBarrierFor(envelope: CausalEnvelope | null, pending: unknown): PresentationDyingBarrier | null {
  const pendingRecord = record(pending);
  if (pendingRecord?.kind !== "dying") return null;
  const proof = dyingDecisionProof(envelope, pending);
  const activeFrame = proof?.activeFrame ?? null;
  const proven = Boolean(proof);
  return {
    semantics: proven ? "PROVEN" : "UNPROVEN",
    interactionId: proven ? envelope?.interactionId ?? null : null,
    rootFrameId: proven ? envelope?.frames.find((frame) => frame.parentFrameId === null)?.frameId ?? null : null,
    activeFrameId: proven ? envelope?.activeFrameId ?? null : null,
    parentFrameId: proven ? activeFrame?.parentFrameId ?? null : null,
    checkpointId: proven ? envelope?.checkpoint.checkpointId ?? null : null,
    presentationRevision: proven ? envelope?.presentationRevision ?? null : null,
    stage: proven ? "DYING" : null,
    dyingPlayerId: stringValue(pendingRecord.targetId),
    rescuerId: proven ? stringValue(pendingRecord.actorId) : null,
    decisionActorId: proven ? stringValue(pendingRecord.actorId) : null,
    state: proven ? "RESCUE_CHOICE" : "UNPROVEN",
  };
}

function groupPresentation(scene: PresentationInteractionScene | null, groupValues: GroupProjectionValues | null) {
  if (!scene || !groupValues) return null;
  return {
    semantics: scene.semantics,
    interactionId: scene.interactionId,
    groupFrameId: scene.rootFrameId,
    activeFrameId: scene.activeFrameId,
    parentFrameId: scene.parentFrameId,
    checkpointId: scene.checkpointId,
    presentationRevision: scene.presentationRevision,
    stage: scene.stage,
    cardKind: groupValues.cardKind,
    effect: groupValues.effect,
    sourceId: scene.sourceId,
    targetIds: scene.targetIds,
    currentParticipantId: scene.currentParticipantId,
    decisionActorId: scene.decisionActorId,
    activeResolverId: scene.activeResolverId,
    activeSourceId: scene.activeSourceId,
    activeTargetIds: scene.activeTargetIds,
    participantIds: scene.participantIds,
    activeParticipantId: groupValues.activeParticipantId,
  };
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
  const { active, parent, group: directGroup, root } = pendingContexts(input.pending);
  const group = directGroup ?? typedGroupContinuation(input.pending);
  const envelope = input.causalEnvelope ?? null;
  const causalRootFrame = envelope?.frames.find((frame) => frame.parentFrameId === null) ?? null;
  const causalActiveFrame = envelope?.frames.find((frame) => frame.frameId === envelope.activeFrameId) ?? null;
  const causalParentFrame = causalActiveFrame?.parentFrameId
    ? envelope?.frames.find((frame) => frame.frameId === causalActiveFrame.parentFrameId) ?? null
    : null;
  const barrierId = input.currentAction?.presentation?.readyAfterEventId ?? null;
  const legacyResolutionId = firstString(input.currentAction?.presentation?.resolutionId, active?.resolutionId, parent?.resolutionId, root?.resolutionId);
  const rootEvent = eventForContext(root, input.timeline, barrierId) ?? eventForContext(active, input.timeline, barrierId);
  const activeEvent = eventForContext(active, input.timeline, barrierId);
  const parentEvent = eventForContext(parent, input.timeline, barrierId);
  const relevantIds = unique([rootEvent?.id, activeEvent?.id, parentEvent?.id, barrierId]);
  const settlementEvent = input.timeline.find((event) => relevantIds.includes(event.id) && event.finalResult === true) ?? null;
  if (settlementEvent) relevantIds.push(settlementEvent.id);
  const groupCardKind = group ? firstString(group.cardKind, group.kind === "group" ? "group" : null) : null;
  const groupValues = groupProjectionValues(envelope, input.pending, group);
  const interactionScene = interactionSceneFor(envelope, input.currentAction, groupValues, input.pending);
  const dyingBarrier = dyingBarrierFor(envelope, input.pending);
  // Once causal metadata exists, public context comes from its frames. The
  // pending-derived values below remain only for legacy rooms without an
  // envelope and cannot override authoritative causal state.
  const rootContext = (causalRootFrame || root || active || rootEvent) ? {
    eventId: rootEvent?.id ?? null,
    kind: root?.kind ?? active?.kind ?? causalRootFrame?.stage ?? null,
    sourceId: causalRootFrame?.origin.originSourceId ?? root?.sourceId ?? active?.sourceId ?? null,
    originalTargetIds: causalRootFrame?.origin.originalTargetIds ?? root?.originalTargetIds ?? [],
    resolutionId: legacyResolutionId,
  } : null;
  const activeContext = causalActiveFrame
    ? { kind: active?.kind ?? causalActiveFrame.stage, stage: causalActiveFrame.stage, sourceId: active?.sourceId ?? causalActiveFrame.current.currentSourceId, currentTargetIds: active?.targetIds ?? causalActiveFrame.current.currentTargetIds, eventIds: relevantIds.filter((id) => id === activeEvent?.id || id === barrierId), resolutionId: legacyResolutionId }
    : active
      ? { kind: active.kind, stage: active.stage, sourceId: active.sourceId, currentTargetIds: active.targetIds, eventIds: relevantIds.filter((id) => id === activeEvent?.id || id === barrierId), resolutionId: legacyResolutionId }
      : null;
  const parentContext = causalParentFrame
    ? { kind: parent?.kind ?? causalParentFrame.stage, sourceId: parent?.sourceId ?? causalParentFrame.origin.originSourceId, targetIds: parent?.targetIds ?? causalParentFrame.origin.originalTargetIds, resumeKind: parent?.kind ?? causalParentFrame.stage }
    : parent ? { kind: parent.kind, sourceId: parent.sourceId, targetIds: parent.targetIds, resumeKind: parent.kind } : null;
  return {
    rootContext,
    activeContext,
    parentContext,
    participants: participants(active, group),
    interactionScene,
    dyingBarrier,
    groupResolution: groupCardKind ? groupPresentation(interactionScene, groupValues) : null,
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
