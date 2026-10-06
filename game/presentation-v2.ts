import type { CurrentAction } from "./protocol";
import type { CausalEnvelope, CausalFrame } from "./presentation-causality";
import { CARD_KINDS, type CardKind } from "./model";
import { isGroupParticipantProgressOutcomeAllowed, type GroupParticipantProgressOutcome, type GroupParticipantProgressStatus, type GroupResolutionSemantics, type HarvestParticipantProgressOutcome, type HarvestParticipantProgressStatus, type NegationHistoryRecord } from "./pending";

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
  negationSettlement?: unknown;
};

export type PresentationNegationSettlementProof = {
  semantics: "PROVEN";
  outcome: "ROOT_CANCELLED" | "ROOT_RESTORED";
  interactionId: string;
  rootFrameId: string;
  checkpointId: string;
  presentationRevision: number;
  resolutionId: string;
  rootCardKind: CardKind;
  sourceId: string;
  targetId: string;
};

export type PresentationNegationSettlement = PresentationNegationSettlementProof & {
  eventId: string;
};

export type PresentationV2Input = {
  pending: unknown | null;
  currentAction: Pick<CurrentAction, "kind" | "actorId" | "reason" | "deadline" | "declineAction" | "presentation"> | null;
  actionRevision: string;
  timeline: readonly PresentationV2Event[];
  /** Engine-derived public Oath recipients; never reconstructed from client state. */
  oathRecipientIds?: readonly string[] | null;
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

export type PresentationParticipantRoles = {
  sourceId: string | null;
  originalTargetIds: readonly string[];
  activeTargetIds: readonly string[];
  currentParticipantId: string | null;
  decisionActorId: string | null;
  activeResolverId: string | null;
  parentParticipantId: string | null;
  participantIds: readonly string[];
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
  participantRoles: PresentationParticipantRoles;
  /** Immutable root-frame origin for proven nested interactions. */
  rootOrigin?: {
    frameId: string;
    stage: CausalFrame["stage"];
    sourceId: string | null;
    effect: string;
    targetIds: readonly string[];
  };
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

export type PresentationReactionChainNode = {
  nodeId: string;
  interactionId: string;
  frameId: string;
  causedByNodeId: string | null;
  actorId: string;
  kind: "CARD_PLAY";
  object: { type: "card"; cardKind: "Negation" };
};

export type PresentationReactionChainRootCard = {
  interactionId: string;
  frameId: string;
  sourceId: string;
  targetId: string;
  cardKind: CardKind;
};

export type PresentationReactionChain = {
  semantics: "PROVEN";
  interactionId: string;
  frameId: string;
  rootCard: PresentationReactionChainRootCard | null;
  nodes: readonly PresentationReactionChainNode[];
};

/** Simultaneous Oath recovery scope; intentionally has no sequential current participant. */
export type PresentationOathRecipientScope = {
  semantics: "PROVEN";
  cardKind: "Oath";
  interactionId: string;
  rootFrameId: string;
  activeFrameId: string;
  checkpointId: string;
  presentationRevision: number;
  sourceId: string;
  recipientIds: readonly string[];
};

export type PresentationBumperHarvestProgress = {
  semantics: "PROVEN";
  interactionId: string;
  rootFrameId: string;
  activeFrameId: string;
  checkpointId: string;
  presentationRevision: number;
  sourceId: string;
  targetIds: readonly string[];
  currentParticipantId: string | null;
  participants: readonly { playerId: string; order: number; status: HarvestParticipantProgressStatus; outcome?: HarvestParticipantProgressOutcome }[];
};

export type PresentationStableBoundaryKind = "REST" | "CHOICE" | "SETTLEMENT" | "SPECIAL";

export type PresentationStableBoundary = {
  kind: PresentationStableBoundaryKind;
  interactionId: string | null;
  checkpointId: string | null;
  presentationRevision: number | null;
  decisionActorId: string | null;
};

export type PresentationV2 = {
  rootContext: { eventId: string | null; kind: string | null; sourceId: string | null; originalTargetIds: readonly string[]; resolutionId: string | null } | null;
  activeContext: { kind: string | null; stage: string | null; sourceId: string | null; currentTargetIds: readonly string[]; eventIds: readonly string[]; resolutionId: string | null } | null;
  parentContext: { kind: string | null; sourceId: string | null; targetIds: readonly string[]; resumeKind: string | null } | null;
  participants: readonly PresentationParticipant[];
  interactionScene: PresentationInteractionScene | null;
  dyingBarrier: PresentationDyingBarrier | null;
  reactionChain: PresentationReactionChain | null;
  negationSettlement: PresentationNegationSettlement | null;
  oathRecipientScope: PresentationOathRecipientScope | null;
  bumperHarvestProgress: PresentationBumperHarvestProgress | null;
  groupResolution: {
    semantics: "PROVEN" | "UNPROVEN";
    resolutionSemantics: GroupResolutionSemantics | null;
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
    participantProgress: readonly { playerId: string; order: number; status: GroupParticipantProgressStatus; outcome?: GroupParticipantProgressOutcome }[] | null;
  } | null;
  decision: { kind: CurrentAction["kind"] | null; actorId: string | null; actionRevision: string; resolutionId: string | null; readyAfterEventId: string | null; deadline: number } | null;
  settlement: { eventId: string; resolutionId: string | null } | null;
  transitionEvents: readonly { eventId: string; type: string; resolutionId: string | null }[];
  stableBoundary: PresentationStableBoundary;
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

function bumperHarvestPendingFrom(pending: unknown): RecordLike | null {
  const item = record(pending);
  if (item?.kind === "harvest") return item;
  const continuation = record(item?.continuation);
  const effect = record(continuation?.effect);
  const harvest = record(effect?.pending);
  return item?.kind === "response" && continuation?.kind === "negation" && effect?.kind === "harvest_target" && harvest?.kind === "harvest"
    ? harvest
    : null;
}

function isBumperHarvestNegationPending(pending: unknown): boolean {
  const item = record(pending);
  const continuation = record(item?.continuation);
  const effect = record(continuation?.effect);
  return item?.kind === "response" && continuation?.kind === "negation" && effect?.kind === "harvest_target"
    && record(effect.pending)?.kind === "harvest";
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

const RESPONSE_DECISION_CONTINUATIONS = new Set([
  "attack", "influencing_attack", "group", "duel", "negation", "borrowed_sword_attack",
]);
const TRIGGER_DECISION_CONTINUATIONS = new Set([
  "attack_targeted_event", "attack_dodged_event", "damage_about_to_apply_event", "damage_suffered_event",
  "turn_start_event", "draw_phase_event", "discard_phase_event", "turn_end_event", "judgement_revealed_event",
  "judgement_effective_event", "hero_choice_event", "hand_loss_event", "equipment_lost_event",
  "stratagem_used_event", "hp_recovered_event",
]);
const SOURCE_OWNED_TRIGGER_EVENTS = new Set(["attack_targeted"]);
const SOURCE_OWNED_TRIGGER_CONTINUATIONS = new Set(["attack_targeted_event"]);

/**
 * A source-owned Attack-targeted trigger is a semantic decision even while
 * the active Attack frame resolver remains the target. Every link is read
 * from persisted Pending/declaration/envelope state; CurrentAction is not a
 * proof source.
 */
function sourceOwnedTriggerDecisionActorId(envelope: CausalEnvelope | null, pending: unknown, activeFrame: CausalFrame | null): string | null {
  const item = record(pending);
  const continuation = record(item?.continuation);
  const declaration = record(continuation?.declaration);
  const causal = record(item?.causal);
  const continuationCausal = record(continuation?.causal);
  const declarationCausal = record(declaration?.causal);
  const actorId = stringValue(item?.actorId);
  const sourceId = stringValue(declaration?.sourceId);
  const targetId = stringValue(declaration?.targetId);
  const checkpointFrame = envelope?.frames.find((frame) => frame.frameId === envelope.checkpoint.frameId) ?? null;
  if (item?.kind !== "trigger"
    || !SOURCE_OWNED_TRIGGER_EVENTS.has(stringValue(item.event) ?? "")
    || !SOURCE_OWNED_TRIGGER_CONTINUATIONS.has(stringValue(continuation?.kind) ?? "")
    || !envelope || !activeFrame || activeFrame.stage !== "ATTACK_RESPONSE" || !checkpointFrame
    || !actorId || !sourceId || !targetId
    || actorId !== sourceId
    || causal?.interactionId !== envelope.interactionId
    || causal.frameId !== activeFrame.frameId
    || continuationCausal?.interactionId !== envelope.interactionId
    || continuationCausal.frameId !== activeFrame.frameId
    || declarationCausal?.interactionId !== envelope.interactionId
    || declarationCausal.frameId !== activeFrame.frameId
    || checkpointFrame.frameId !== activeFrame.frameId
    || checkpointFrame.stage !== activeFrame.stage
    || envelope.checkpoint.stage !== activeFrame.stage
    || activeFrame.current.resolvingPlayerId !== targetId
    || activeFrame.origin.originSourceId !== sourceId
    || activeFrame.current.currentSourceId !== sourceId
    || !activeFrame.origin.originalTargetIds.includes(targetId)
    || !activeFrame.current.currentTargetIds.includes(targetId)) return null;
  return actorId;
}

/**
 * A public decision actor is established only by persisted semantic Pending
 * proof and its matching causal resolver, with the exact source-owned
 * Attack-targeted exception above. CurrentAction remains a viewer-specific
 * control projection and is deliberately not evidence here.
 */
function semanticDecisionActorId(envelope: CausalEnvelope | null, pending: unknown, activeFrame: CausalFrame | null, dyingProof: DyingDecisionProof | null): string | null {
  if (dyingProof) return stringValue(dyingProof.pending.actorId);
  const item = record(pending);
  const actorId = stringValue(item?.actorId);
  const causal = record(item?.causal);
  const continuation = record(item?.continuation);
  const continuationKind = stringValue(continuation?.kind);
  // The responder currently scanned in a Bumper Harvest Negation window is
  // private. The affected chooser is projected separately as the participant.
  if (isBumperHarvestNegationPending(pending)) return null;
  if (item?.kind === "harvest" && envelope && activeFrame && actorId) {
    const progress = record(item.participantProgress);
    const harvestCausal = record(item.causal);
    const participant = Array.isArray(progress?.participants)
      ? progress.participants.map(record).find((candidate) => candidate?.playerId === actorId)
      : null;
    if (progress?.version === 1 && progress.interactionId === envelope.interactionId
      && progress.rootFrameId === activeFrame.frameId
      && harvestCausal?.interactionId === envelope.interactionId && harvestCausal.frameId === activeFrame.frameId
      && envelope.activeFrameId === activeFrame.frameId && envelope.checkpoint.frameId === activeFrame.frameId
      && envelope.checkpoint.stage === "SEQUENTIAL_CHOICE" && activeFrame.stage === "SEQUENTIAL_CHOICE"
      && activeFrame.parentFrameId == null && activeFrame.origin.originEffect === "BumperHarvest"
      && activeFrame.origin.originSourceId === item.sourceId
      && activeFrame.current.currentTargetIds.length === 1 && activeFrame.current.currentTargetIds[0] === actorId
      && activeFrame.current.resolvingPlayerId === actorId
      && progress.currentParticipantId === actorId && participant?.status === "CURRENT") return actorId;
  }
  if (!envelope || !activeFrame || !item || !actorId || !causal || causal.interactionId !== envelope.interactionId
    || causal.frameId !== activeFrame.frameId) return null;
  if (item.kind === "response" && RESPONSE_DECISION_CONTINUATIONS.has(continuationKind ?? "")) return activeFrame.current.resolvingPlayerId === actorId ? actorId : null;
  const sourceOwnedActorId = sourceOwnedTriggerDecisionActorId(envelope, pending, activeFrame);
  if (sourceOwnedActorId) return sourceOwnedActorId;
  if (activeFrame.current.resolvingPlayerId === actorId && item.kind === "trigger" && TRIGGER_DECISION_CONTINUATIONS.has(continuationKind ?? "")) return actorId;
  return null;
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
  parentParticipantId: string | null;
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
    parentParticipantId,
    participantIds,
    activeParticipantId: firstString(group.activeParticipantId, group.currentParticipantId),
  };
}

function interactionSceneFor(
  envelope: CausalEnvelope | null,
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
  const participantRoleTargetIds = groupValues
    ? [...new Set([...(activeFrame?.origin.originalTargetIds ?? []), ...groupValues.targetIds])]
    : targetIds;
  const currentParticipantId = groupValues?.currentParticipantId ?? firstString(activeCurrent?.currentTargetIds[0]);
  const dyingProof = dyingDecisionProof(envelope, pending);
  const semanticDecisionActor = semanticDecisionActorId(envelope, pending, activeFrame, dyingProof);
  const publicActiveResolverId = isBumperHarvestNegationPending(pending) ? null : activeCurrent?.resolvingPlayerId ?? null;
  const relation: InteractionSceneContinuity["relation"] = !proven
    ? "UNPROVEN"
    : activeFrame?.parentFrameId
      ? "CHILD_FRAME"
      : groupValues && activeFrame?.stage === "NEGATION"
        ? "SAME_FRAME"
      : "ROOT_FRAME";
  const parentFrame = activeFrame?.parentFrameId
    ? envelope?.frames.find((frame) => frame.frameId === activeFrame.parentFrameId) ?? null
    : null;
  const rootFrame = proven && activeFrame?.parentFrameId
    ? envelope?.frames.find((frame) => frame.parentFrameId === null) ?? null
    : null;
  let rootAncestor = activeFrame;
  const visitedFrames = new Set<string>();
  while (rootAncestor?.parentFrameId && !visitedFrames.has(rootAncestor.frameId)) {
    visitedFrames.add(rootAncestor.frameId);
    rootAncestor = envelope?.frames.find((frame) => frame.frameId === rootAncestor?.parentFrameId) ?? null;
  }
  const rootOrigin = rootFrame
    && rootAncestor?.frameId === rootFrame.frameId
    && rootFrame.frameId !== activeFrame?.frameId
    ? {
      frameId: rootFrame.frameId,
      stage: rootFrame.stage,
      sourceId: rootFrame.origin.originSourceId,
      effect: rootFrame.origin.originEffect,
      targetIds: [...rootFrame.origin.originalTargetIds],
    }
    : null;
  const participantRoles: PresentationParticipantRoles = proven
    ? {
      sourceId,
      originalTargetIds: participantRoleTargetIds,
      activeTargetIds: activeCurrent?.currentTargetIds ?? [],
      currentParticipantId,
      decisionActorId: semanticDecisionActor,
      activeResolverId: publicActiveResolverId,
      parentParticipantId: groupValues && activeFrame?.frameId !== groupValues.groupFrame?.frameId
        ? firstString(parentFrame?.current.currentTargetIds.length === 1 ? parentFrame.current.currentTargetIds[0] : null, groupValues.parentParticipantId)
        : null,
      participantIds: groupValues?.participantIds ?? [],
    }
    : {
      sourceId: null,
      originalTargetIds: [],
      activeTargetIds: [],
      currentParticipantId: null,
      decisionActorId: null,
      activeResolverId: null,
      parentParticipantId: null,
      participantIds: [],
    };
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
    decisionActorId: semanticDecisionActor,
    activeResolverId: publicActiveResolverId,
    activeSourceId: activeCurrent?.currentSourceId ?? null,
    activeTargetIds: activeCurrent?.currentTargetIds ?? [],
    participantIds: groupValues?.participantIds ?? [],
    participantRoles,
    ...(rootOrigin ? { rootOrigin } : {}),
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

function groupPresentation(
  scene: PresentationInteractionScene | null,
  groupValues: GroupProjectionValues | null,
  participantProgress: {
    resolutionSemantics: GroupResolutionSemantics;
    participants: Array<{ playerId: string; order: number; status: GroupParticipantProgressStatus; outcome?: GroupParticipantProgressOutcome }>;
  } | null,
) {
  if (!scene || !groupValues) return null;
  return {
    semantics: scene.semantics,
    resolutionSemantics: participantProgress?.resolutionSemantics ?? null,
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
    participantProgress: participantProgress?.participants ?? null,
  };
}

function oathRecipientScopeFor(
  pending: unknown,
  envelope: CausalEnvelope | null,
  scene: PresentationInteractionScene | null,
  recipientIds: readonly string[] | null | undefined,
): PresentationOathRecipientScope | null {
  const response = record(pending);
  const continuation = record(response?.continuation);
  const effect = record(continuation?.effect);
  if (response?.kind !== "response" || continuation?.kind !== "negation" || effect?.kind !== "oath"
    || !scene || scene.semantics !== "PROVEN" || scene.stage !== "NEGATION"
    || !envelope || !Array.isArray(recipientIds)) return null;

  const sourceId = stringValue(continuation.sourceId);
  const responseCausal = record(response.causal);
  const continuationCausal = record(continuation.causal);
  const activeFrame = envelope.frames.find((frame) => frame.frameId === envelope.activeFrameId) ?? null;
  const rootFrames = envelope.frames.filter((frame) => frame.parentFrameId === null || frame.parentFrameId === undefined);
  const rootFrame = rootFrames.length === 1 ? rootFrames[0] : null;
  if (!sourceId || !activeFrame || !rootFrame || rootFrame.frameId !== activeFrame.frameId
    || activeFrame.stage !== "NEGATION" || activeFrame.parentFrameId != null
    || envelope.checkpoint.frameId !== activeFrame.frameId || envelope.checkpoint.stage !== "NEGATION"
    || responseCausal?.interactionId !== envelope.interactionId || responseCausal.frameId !== activeFrame.frameId
    || continuationCausal?.interactionId !== envelope.interactionId || continuationCausal.frameId !== activeFrame.frameId
    || continuation.effectTargetId !== sourceId
    || scene.interactionId !== envelope.interactionId || scene.rootFrameId !== rootFrame.frameId
    || scene.activeFrameId !== activeFrame.frameId || scene.checkpointId !== envelope.checkpoint.checkpointId
    || scene.presentationRevision !== envelope.presentationRevision || scene.sourceId !== sourceId
    || scene.participantRoles.sourceId !== sourceId
    || rootFrame.origin.originSourceId !== sourceId || rootFrame.origin.originalTargetIds.length !== 1
    || rootFrame.origin.originalTargetIds[0] !== sourceId
    || rootFrame.current.currentTargetIds.length !== 1 || rootFrame.current.currentTargetIds[0] !== sourceId
    || rootFrame.current.currentSourceId !== sourceId
    || rootFrame.current.currentEffect !== rootFrame.origin.originEffect
    || scene.effect !== rootFrame.origin.originEffect) return null;

  const recipients: string[] = [];
  const seen = new Set<string>();
  for (const recipientId of recipientIds) {
    if (typeof recipientId !== "string" || recipientId.length === 0 || seen.has(recipientId)) return null;
    seen.add(recipientId);
    recipients.push(recipientId);
  }
  return {
    semantics: "PROVEN",
    cardKind: "Oath",
    interactionId: envelope.interactionId,
    rootFrameId: rootFrame.frameId,
    activeFrameId: activeFrame.frameId,
    checkpointId: envelope.checkpoint.checkpointId,
    presentationRevision: envelope.presentationRevision,
    sourceId,
    recipientIds: recipients,
  };
}

function bumperHarvestProgressFor(
  envelope: CausalEnvelope | null,
  pending: unknown,
  scene: PresentationInteractionScene | null,
): PresentationBumperHarvestProgress | null {
  const item = record(pending);
  const harvest = bumperHarvestPendingFrom(pending);
  const progress = record(harvest?.participantProgress);
  const causal = record(harvest?.causal);
  const rootFrameId = stringValue(progress?.rootFrameId);
  const sourceId = stringValue(harvest?.sourceId);
  const root = envelope?.frames.find((frame) => frame.frameId === rootFrameId) ?? null;
  const active = envelope?.frames.find((frame) => frame.frameId === envelope.activeFrameId) ?? null;
  const storedParticipants = progress?.participants;
  if (!item || !harvest || !progress || progress.version !== 1 || !rootFrameId || !sourceId
    || !envelope || !root || !active || !Array.isArray(storedParticipants) || !storedParticipants.length
    || root.parentFrameId != null || root.stage !== "SEQUENTIAL_CHOICE"
    || root.origin.originEffect !== "BumperHarvest" || root.origin.originSourceId !== sourceId
    || root.current.currentSourceId !== sourceId || root.current.currentEffect !== "BumperHarvest"
    || progress.interactionId !== envelope.interactionId || causal?.interactionId !== envelope.interactionId
    || causal.frameId !== root.frameId || rootFrameId !== root.frameId
    || root.origin.originalTargetIds.length !== storedParticipants.length
    || new Set(root.origin.originalTargetIds).size !== root.origin.originalTargetIds.length) return null;

  const participants: Array<{ playerId: string; order: number; status: HarvestParticipantProgressStatus; outcome?: HarvestParticipantProgressOutcome }> = [];
  const validStatuses = new Set<HarvestParticipantProgressStatus>(["PENDING", "CURRENT", "RESOLVED", "NO_LONGER_APPLICABLE"]);
  for (let index = 0; index < storedParticipants.length; index++) {
    const stored = record(storedParticipants[index]);
    const playerId = stringValue(stored?.playerId);
    const status = stored?.status;
    const outcome = stored?.outcome;
    if (!playerId || playerId !== root.origin.originalTargetIds[index]
      || typeof status !== "string" || !validStatuses.has(status as HarvestParticipantProgressStatus)) return null;
    if (status === "RESOLVED") {
      if (outcome !== "CHOSE_CARD" && outcome !== "NEGATED") return null;
    } else if (outcome !== undefined) return null;
    participants.push({ playerId, order: index + 1, status: status as HarvestParticipantProgressStatus, ...(outcome === "CHOSE_CARD" || outcome === "NEGATED" ? { outcome } : {}) });
  }
  const current = participants.filter(({ status }) => status === "CURRENT");
  const currentParticipantId = typeof progress.currentParticipantId === "string" && progress.currentParticipantId.length
    ? progress.currentParticipantId
    : null;
  const complete = Boolean(harvest.completeAt);
  if (complete) {
    if (current.length || currentParticipantId || root.current.currentTargetIds.length || root.current.resolvingPlayerId !== null
      || strings(harvest.remainingIds).length) return null;
  } else if (current.length !== 1 || current[0].playerId !== currentParticipantId || harvest.actorId !== currentParticipantId
    || root.current.currentTargetIds.length !== 1 || root.current.currentTargetIds[0] !== currentParticipantId
    || root.current.resolvingPlayerId !== currentParticipantId) return null;

  const isChoice = item.kind === "harvest";
  if (isChoice) {
    if (active.frameId !== root.frameId || active.stage !== "SEQUENTIAL_CHOICE"
      || envelope.checkpoint.frameId !== root.frameId || envelope.checkpoint.stage !== "SEQUENTIAL_CHOICE"
      || causal.frameId !== active.frameId
      || (!complete && item.actorId !== currentParticipantId)) return null;
  } else {
    const continuation = record(item.continuation);
    const effect = record(continuation?.effect);
    const responseCausal = record(item.causal);
    const continuationCausal = record(continuation?.causal);
    if (item.kind !== "response" || continuation?.kind !== "negation" || effect?.kind !== "harvest_target"
      || effect.pending !== harvest || active.frameId === root.frameId || active.parentFrameId !== root.frameId
      || active.stage !== "NEGATION" || envelope.checkpoint.frameId !== active.frameId || envelope.checkpoint.stage !== "NEGATION"
      || responseCausal?.interactionId !== envelope.interactionId || responseCausal.frameId !== active.frameId
      || continuationCausal?.interactionId !== envelope.interactionId || continuationCausal.frameId !== active.frameId
      || continuation.effectTargetId !== currentParticipantId || item.actorId !== active.current.resolvingPlayerId
      || active.origin.originEffect !== "BumperHarvest" || active.origin.originSourceId !== sourceId
      || active.origin.originalTargetIds.length !== 1 || active.origin.originalTargetIds[0] !== currentParticipantId
      || active.current.currentSourceId !== sourceId || active.current.currentEffect !== "BumperHarvest"
      || active.current.currentTargetIds.length !== 1 || active.current.currentTargetIds[0] !== currentParticipantId
      || complete) return null;
  }

  if (!scene || scene.semantics !== "PROVEN" || scene.interactionId !== envelope.interactionId
    || scene.rootFrameId !== root.frameId || scene.activeFrameId !== active.frameId
    || scene.checkpointId !== envelope.checkpoint.checkpointId || scene.presentationRevision !== envelope.presentationRevision
    || scene.stage !== active.stage || scene.sourceId !== sourceId || scene.effect !== "BumperHarvest"
    || scene.currentParticipantId !== currentParticipantId || scene.participantRoles.sourceId !== sourceId
    || (active.frameId === root.frameId
      ? scene.continuity.relation !== "ROOT_FRAME"
      : !scene.rootOrigin || scene.rootOrigin.frameId !== root.frameId || scene.rootOrigin.effect !== "BumperHarvest"
        || scene.rootOrigin.sourceId !== sourceId || scene.rootOrigin.targetIds.length !== root.origin.originalTargetIds.length
        || scene.rootOrigin.targetIds.some((id, index) => id !== root.origin.originalTargetIds[index])
        || scene.continuity.relation !== "CHILD_FRAME" || scene.decisionActorId !== null || scene.activeResolverId !== null)) return null;

  return {
    semantics: "PROVEN",
    interactionId: envelope.interactionId,
    rootFrameId: root.frameId,
    activeFrameId: active.frameId,
    checkpointId: envelope.checkpoint.checkpointId,
    presentationRevision: envelope.presentationRevision,
    sourceId,
    targetIds: [...root.origin.originalTargetIds],
    currentParticipantId,
    participants,
  };
}

function groupParticipantProgress(
  envelope: CausalEnvelope | null,
  group: RecordLike | null,
  values: GroupProjectionValues | null,
  scene: PresentationInteractionScene | null,
): {
  resolutionSemantics: GroupResolutionSemantics;
  participants: Array<{ playerId: string; order: number; status: GroupParticipantProgressStatus; outcome?: GroupParticipantProgressOutcome }>;
} | null {
  if (!envelope || !group || !values || scene?.semantics !== "PROVEN"
    || !["BarbarianInvasion", "RainingArrows", "SkyPiercingHalberdAttack"].includes(values.cardKind)) return null;
  const progress = record(group.participantProgress);
  const causal = record(group.causal);
  const root = values.groupFrame;
  const active = values.activeFrame;
  const storedParticipants = progress?.participants;
  const targetIds = root?.origin.originalTargetIds;
  const resolutionSemantics = progress?.resolutionSemantics;
  if (!progress || progress.version !== 1 || (resolutionSemantics !== "GROUP" && resolutionSemantics !== "ORDERED")
    || !causal || !root || !active || !Array.isArray(storedParticipants) || !targetIds?.length
    || root.parentFrameId !== null || !["GROUP_RESOLUTION", "NEGATION"].includes(root.stage)
    || root.origin.originEffect !== values.cardKind
    || causal.interactionId !== envelope.interactionId || causal.frameId !== root.frameId
    || progress.interactionId !== envelope.interactionId || progress.groupFrameId !== root.frameId
    || values.targetIds.length !== targetIds.length || values.targetIds.some((id, index) => id !== targetIds[index])) return null;
  if (new Set(targetIds).size !== targetIds.length || storedParticipants.length !== targetIds.length) return null;

  const validStatuses = new Set<GroupParticipantProgressStatus>(["PENDING", "CURRENT", "PAUSED", "RESOLVED", "NO_LONGER_APPLICABLE"]);
  const participants: Array<{ playerId: string; order: number; status: GroupParticipantProgressStatus; outcome?: GroupParticipantProgressOutcome }> = [];
  for (let index = 0; index < targetIds.length; index++) {
    const stored = record(storedParticipants[index]);
    const playerId = stringValue(stored?.playerId);
    const status = stored?.status;
    if (playerId !== targetIds[index] || typeof status !== "string" || !validStatuses.has(status as GroupParticipantProgressStatus)) return null;
    const outcome = stored?.outcome;
    if (outcome !== undefined && ((outcome !== "AVOIDED" && outcome !== "DAMAGED" && outcome !== "NEGATED" && outcome !== "DEFEATED")
      || !isGroupParticipantProgressOutcomeAllowed(values.cardKind, resolutionSemantics, status as GroupParticipantProgressStatus, outcome))) return null;
    participants.push({ playerId, order: index + 1, status: status as GroupParticipantProgressStatus, ...(outcome === "AVOIDED" || outcome === "DAMAGED" || outcome === "NEGATED" || outcome === "DEFEATED" ? { outcome } : {}) });
  }

  const activeParticipants = participants.filter(({ status }) => status === "CURRENT" || status === "PAUSED");
  const currentParticipantId = values.currentParticipantId;
  if (activeParticipants.length !== 1 || !currentParticipantId || activeParticipants[0].playerId !== currentParticipantId
    || root.current.currentTargetIds.length !== 1 || root.current.currentTargetIds[0] !== currentParticipantId) return null;
  if (active.frameId === root.frameId) {
    if (!["GROUP_RESOLUTION", "NEGATION"].includes(active.stage) || activeParticipants[0].status !== "CURRENT") return null;
  } else {
    let ancestor: CausalFrame | null = active;
    const visited = new Set<string>();
    while (ancestor && ancestor.frameId !== root.frameId && !visited.has(ancestor.frameId)) {
      visited.add(ancestor.frameId);
      ancestor = ancestor.parentFrameId ? envelope.frames.find((frame) => frame.frameId === ancestor?.parentFrameId) ?? null : null;
    }
    if (ancestor?.frameId !== root.frameId || activeParticipants[0].status !== "PAUSED") return null;
  }
  return { resolutionSemantics, participants };
}

function reactionChainFor(
  envelope: CausalEnvelope | null,
  pending: unknown,
  scene: PresentationInteractionScene | null,
  bumperProgress: PresentationBumperHarvestProgress | null,
): PresentationReactionChain | null {
  const item = record(pending);
  const continuation = record(item?.continuation);
  const effect = record(continuation?.effect);
  const responseCausal = record(item?.causal);
  const continuationCausal = record(continuation?.causal);
  const bumperWindow = isBumperHarvestNegationPending(pending);
  if (item?.kind !== "response" || continuation?.kind !== "negation"
    || scene?.semantics !== "PROVEN" || scene.stage !== "NEGATION"
    || typeof scene.interactionId !== "string" || !scene.interactionId
    || typeof scene.activeFrameId !== "string" || !scene.activeFrameId
    || !envelope || scene.interactionId !== envelope.interactionId
    || scene.activeFrameId !== envelope.activeFrameId
    || envelope.checkpoint.frameId !== scene.activeFrameId || envelope.checkpoint.stage !== "NEGATION"
    || responseCausal?.interactionId !== scene.interactionId || responseCausal.frameId !== scene.activeFrameId
    || continuationCausal?.interactionId !== scene.interactionId || continuationCausal.frameId !== scene.activeFrameId) return null;

  const frame = envelope.frames.find(({ frameId }) => frameId === scene.activeFrameId);
  if (!frame || frame.stage !== "NEGATION" || frame.current.resolvingPlayerId !== item.actorId) return null;
  if (bumperWindow) {
    if (!bumperProgress || effect?.kind !== "harvest_target"
      || effect.pending?.actorId !== bumperProgress.currentParticipantId
      || bumperProgress.activeFrameId !== frame.frameId
      || scene.decisionActorId !== null || scene.activeResolverId !== null) return null;
  } else if (!stringValue(scene.decisionActorId) || item.actorId !== scene.decisionActorId) return null;
  const rawHistory: unknown = continuation.negationHistory;
  if (rawHistory !== undefined && !Array.isArray(rawHistory)) return null;
  const history = (rawHistory ?? []) as unknown[];
  const nodeIds = new Set<string>();
  const physicalCardIds = new Set<string>();
  let previousNodeId: string | null = null;
  const nodes: PresentationReactionChainNode[] = [];
  for (const value of history) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const stored = value as Partial<NegationHistoryRecord>;
    if (typeof stored.nodeId !== "string" || !stored.nodeId
      || stored.interactionId !== scene.interactionId || stored.frameId !== scene.activeFrameId
      || stored.causedByNodeId !== previousNodeId
      || typeof stored.actorId !== "string" || !stored.actorId
      || typeof stored.physicalCardId !== "string" || !stored.physicalCardId
      || stored.kind !== "NEGATION_CARD"
      || nodeIds.has(stored.nodeId) || physicalCardIds.has(stored.physicalCardId)) return null;
    nodeIds.add(stored.nodeId);
    physicalCardIds.add(stored.physicalCardId);
    previousNodeId = stored.nodeId;
    nodes.push({
      nodeId: stored.nodeId,
      interactionId: stored.interactionId,
      frameId: stored.frameId,
      causedByNodeId: stored.causedByNodeId,
      actorId: stored.actorId,
      kind: "CARD_PLAY",
      object: { type: "card", cardKind: "Negation" },
    });
  }
  const sourceId = stringValue(continuation.sourceId);
  const targetId = stringValue(continuation.effectTargetId);
  const cardName = stringValue(continuation.cardName);
  const rootCardKind = continuation.rootCardKind;
  const expectedRootCardKind = effect && sourceId && targetId ? singleTargetNegationRootCardKind(effect, sourceId, targetId) : null;
  const rootFrame = envelope.frames.find(({ frameId }) => frameId === scene.rootFrameId);
  const isProvenSingleTargetRoot = Boolean(
    expectedRootCardKind && rootCardKind === expectedRootCardKind
      && sourceId && targetId
      && scene.continuity.relation === "ROOT_FRAME"
      && scene.rootFrameId === scene.activeFrameId
      && rootFrame?.frameId === frame.frameId
      && rootFrame.stage === "NEGATION"
      && (rootFrame.parentFrameId === undefined || rootFrame.parentFrameId === null)
      && rootFrame.origin.originSourceId === sourceId
      && rootFrame.current.currentSourceId === sourceId
      && cardName !== null && rootFrame.origin.originEffect === cardName
      && rootFrame.current.currentEffect === cardName && scene.effect === cardName
      && rootFrame.origin.originalTargetIds.length === 1 && rootFrame.origin.originalTargetIds[0] === targetId
      && rootFrame.current.currentTargetIds.length === 1 && rootFrame.current.currentTargetIds[0] === targetId
      && scene.sourceId === sourceId && scene.activeSourceId === sourceId
      && scene.participantRoles.sourceId === sourceId
      && scene.targetIds.length === 1 && scene.targetIds[0] === targetId
      && scene.activeTargetIds.length === 1 && scene.activeTargetIds[0] === targetId
      && scene.participantRoles.originalTargetIds.length === 1 && scene.participantRoles.originalTargetIds[0] === targetId
      && scene.activeResolverId === item.actorId && scene.decisionActorId === item.actorId,
  );
  const rootCard = isProvenSingleTargetRoot && sourceId && targetId && CARD_KINDS.includes(rootCardKind as CardKind)
    ? { interactionId: scene.interactionId, frameId: frame.frameId, sourceId, targetId, cardKind: rootCardKind as CardKind }
    : null;
  return { semantics: "PROVEN", interactionId: scene.interactionId, frameId: scene.activeFrameId, rootCard, nodes };
}

function negationSettlementFor(
  timeline: readonly PresentationV2Event[],
  envelope: CausalEnvelope | null,
  pending: unknown | null,
): PresentationNegationSettlement | null {
  const pendingItem = record(pending);
  const pendingContinuation = record(pendingItem?.continuation);
  if (pendingItem?.kind === "response" && pendingContinuation?.kind === "negation") return null;
  const event = [...timeline].reverse().find((candidate) => candidate.negationSettlement !== undefined);
  if (!event || event.type !== "message" || event.presentation === false || event.importance !== "essential"
    || !event.id || !event.resolutionId || !envelope) return null;

  const value = record(event.negationSettlement);
  if (!value || value.semantics !== "PROVEN"
    || value.outcome !== "ROOT_CANCELLED" && value.outcome !== "ROOT_RESTORED"
    || typeof value.interactionId !== "string" || !value.interactionId
    || typeof value.rootFrameId !== "string" || !value.rootFrameId
    || typeof value.checkpointId !== "string" || !value.checkpointId
    || !Number.isInteger(value.presentationRevision) || (value.presentationRevision as number) < 0
    || typeof value.resolutionId !== "string" || value.resolutionId !== event.resolutionId
    || typeof value.sourceId !== "string" || !value.sourceId
    || typeof value.targetId !== "string" || !value.targetId
    || typeof value.rootCardKind !== "string" || !CARD_KINDS.includes(value.rootCardKind as CardKind)
    || value.interactionId !== envelope.interactionId
    || (value.presentationRevision as number) > envelope.presentationRevision) return null;

  const root = envelope.frames.find((frame) => frame.frameId === value.rootFrameId);
  if (!root || (root.parentFrameId !== undefined && root.parentFrameId !== null)
    || root.origin.originSourceId !== value.sourceId
    || root.origin.originalTargetIds.length !== 1 || root.origin.originalTargetIds[0] !== value.targetId) return null;

  return {
    semantics: "PROVEN",
    outcome: value.outcome,
    interactionId: value.interactionId,
    rootFrameId: value.rootFrameId,
    checkpointId: value.checkpointId,
    presentationRevision: value.presentationRevision as number,
    resolutionId: value.resolutionId,
    rootCardKind: value.rootCardKind as CardKind,
    sourceId: value.sourceId,
    targetId: value.targetId,
    eventId: event.id,
  };
}

function singleTargetNegationRootCardKind(effect: Record<string, unknown>, sourceId: string, targetId: string): CardKind | null {
  const effectTargetMatches = (value: unknown) => value === targetId;
  switch (effect.kind) {
    case "draw_two": return sourceId === targetId ? "DrawTwo" : null;
    case "dismantle": return effectTargetMatches(effect.targetId) ? "Dismantle" : null;
    case "steal": return effectTargetMatches(effect.targetId) ? "Steal" : null;
    case "duel": {
      const pending = record(effect.pending);
      const duel = record(pending?.continuation);
      return pending?.kind === "response" && duel?.kind === "duel" && duel.sourceId === sourceId && duel.targetId === targetId ? "Duel" : null;
    }
    case "overindulgence": return effectTargetMatches(effect.targetId) ? "Overindulgence" : null;
    case "lightning": return effectTargetMatches(effect.targetId) ? "Lightning" : null;
    case "rations_depleted": return effectTargetMatches(effect.targetId) ? "RationsDepleted" : null;
    case "borrowed_sword": return effectTargetMatches(effect.targetId) ? "BorrowedSword" : null;
    default: return null;
  }
}

function pendingCausalMatchesScene(scene: PresentationInteractionScene | null, pending: unknown): boolean {
  const item = record(pending);
  const causal = record(item?.causal);
  return scene?.semantics === "PROVEN"
    && causal?.interactionId === scene.interactionId
    && causal?.frameId === scene.activeFrameId;
}

function stableBoundaryFor(
  scene: PresentationInteractionScene | null,
  pending: unknown,
  bumperHarvestProgress: PresentationBumperHarvestProgress | null,
): PresentationStableBoundary {
  const proven = scene?.semantics === "PROVEN";
  const identity = {
    interactionId: proven ? scene?.interactionId ?? null : null,
    checkpointId: proven ? scene?.checkpointId ?? null : null,
    presentationRevision: proven ? scene?.presentationRevision ?? null : null,
  };
  const decisionActorId = proven ? scene?.decisionActorId ?? null : null;
  if (decisionActorId) return { kind: "CHOICE", ...identity, decisionActorId };
  if (bumperHarvestProgress && (scene?.stage === "NEGATION" || bumperHarvestProgress.currentParticipantId === null)) {
    return { kind: "SPECIAL", ...identity, decisionActorId: null };
  }

  const item = record(pending);
  const continuation = record(item?.continuation);
  const continuationKind = stringValue(continuation?.kind);
  const sourceOwnedTriggerCandidate = proven
    && item?.kind === "trigger"
    && stringValue(item.event) === "attack_targeted"
    && continuationKind === "attack_targeted_event"
    && pendingCausalMatchesScene(scene, pending);
  const persistentSpecial = proven && !sourceOwnedTriggerCandidate && (
    scene?.stage === "JUDGEMENT"
    || (continuationKind === "borrowed_sword_attack" && pendingCausalMatchesScene(scene, pending))
    || (scene?.continuity.relation === "CHILD_FRAME" && scene.stage === "DAMAGE")
  );
  if (persistentSpecial) return { kind: "SPECIAL", ...identity, decisionActorId: null };
  return { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null };
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

function participantsFromScene(scene: PresentationInteractionScene): PresentationParticipant[] {
  const map = new Map<string, Set<PresentationParticipant["roles"][number]>>();
  const add = (id: string | null, role: PresentationParticipant["roles"][number]) => {
    if (!id) return;
    const roles = map.get(id) ?? new Set<PresentationParticipant["roles"][number]>();
    roles.add(role);
    map.set(id, roles);
  };
  add(scene.participantRoles.sourceId, "source");
  scene.participantRoles.originalTargetIds.forEach((id) => add(id, id === scene.participantRoles.currentParticipantId ? "current_target" : "target"));
  scene.participantRoles.participantIds.forEach((id) => add(id, "group_participant"));
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
  const interactionScene = interactionSceneFor(envelope, groupValues, input.pending);
  const oathRecipientScope = oathRecipientScopeFor(input.pending, envelope, interactionScene, input.oathRecipientIds);
  const projectedBumperHarvestProgress = bumperHarvestProgressFor(envelope, input.pending, interactionScene);
  const projectedGroupParticipantProgress = groupParticipantProgress(envelope, group, groupValues, interactionScene);
  const dyingBarrier = dyingBarrierFor(envelope, input.pending);
  const reactionChain = reactionChainFor(envelope, input.pending, interactionScene, projectedBumperHarvestProgress);
  const negationSettlement = negationSettlementFor(input.timeline, envelope, input.pending);
  // The typed interactionScene below is the causal authority. These legacy
  // context objects intentionally retain Pending-first kind/target shapes for
  // existing consumers; they are descriptive compatibility data and must not
  // be used to reconstruct causal identity.
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
    participants: interactionScene?.semantics === "PROVEN" ? participantsFromScene(interactionScene) : participants(active, group),
    interactionScene,
    dyingBarrier,
    reactionChain,
    negationSettlement,
    oathRecipientScope,
    bumperHarvestProgress: projectedBumperHarvestProgress,
    groupResolution: groupCardKind ? groupPresentation(interactionScene, groupValues, projectedGroupParticipantProgress) : null,
    decision: input.currentAction ? { kind: input.currentAction.kind, actorId: isBumperHarvestNegationPending(input.pending) ? null : input.currentAction.actorId, actionRevision: input.actionRevision, resolutionId: input.currentAction.presentation?.resolutionId ?? null, readyAfterEventId: barrierId, deadline: input.currentAction.deadline } : null,
    settlement: settlementEvent ? { eventId: settlementEvent.id, resolutionId: settlementEvent.resolutionId ?? null } : null,
    transitionEvents: input.timeline.filter((event) => event.presentation !== false && relevantIds.includes(event.id)).map((event) => ({ eventId: event.id, type: event.type, resolutionId: event.resolutionId ?? null })),
    stableBoundary: stableBoundaryFor(interactionScene, input.pending, projectedBumperHarvestProgress),
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
