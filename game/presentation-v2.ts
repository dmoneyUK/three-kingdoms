import type { CurrentAction } from "./protocol";
import type { CausalEnvelope, CausalFrame } from "./presentation-causality";
import { CARD_DEFINITIONS } from "./cards";
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
  playedAs?: "attack" | "dodge" | "peach";
  resolutionId?: string;
  importance?: "essential" | "informational";
  finalResult?: boolean;
  presentation?: boolean;
  judgement?: boolean;
  negationSettlement?: unknown;
  selfTargetAction?: unknown;
  attackDodgeResponse?: unknown;
  duelAttackResponse?: unknown;
  publicSkillEffect?: { effectId?: unknown; sourceId?: unknown; targetId?: unknown };
  publicSkillEffectSettlement?: unknown;
  bumperHarvestRoot?: { semantics?: unknown; sourceId?: unknown; cardId?: unknown };
};

export type PresentationSkillEffectAction = {
  semantics: "PROVEN";
  effectId: "zhou_yu_fanjian";
  rootEventId: string;
  sourceId: string;
  targetId: string;
};

export type PresentationSkillEffectActionEvent = Pick<PresentationSkillEffectAction, "effectId" | "sourceId" | "targetId">;

export type PresentationSkillEffectSettlementProof = {
  semantics: "PROVEN";
  effectId: "zhou_yu_fanjian";
  rootEventId: string;
  sourceId: string;
  targetId: string;
  outcome: "SUITS_MATCHED" | "SUITS_DIFFERED";
};

export type PresentationSkillEffectSettlement = PresentationSkillEffectSettlementProof & {
  eventId: string;
};

/** Server-authored public proof attached only to a successfully used self-target card event. */
export type PresentationSelfTargetActionProof = {
  semantics: "PROVEN";
  sourceId: string;
  targetId: string;
  cardKind: "Peach";
};

/** Event-scoped public self-target action; unlike a response root, it has no causal frame. */
export type PresentationSelfTargetAction = PresentationSelfTargetActionProof & {
  rootEventId: string;
  resolutionId: string;
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

export type PresentationReactionChainPublicEventLinks = {
  root: { eventId: string; resolutionId: string };
  nodes: readonly { nodeId: string; eventId: string; resolutionId: string }[];
};

export type PresentationReactionChainPublicNodeEventLink = {
  nodeId: string;
  eventId: string;
  resolutionId: string;
};

/** A Group target-effect identity is the public tuple (interaction, Group frame, target). */
export type PresentationGroupTargetEffectScope = {
  semantics: "PROVEN";
  relation: "GROUP_TARGET_EFFECT";
  interactionId: string;
  groupFrameId: string;
  activeFrameId: string;
  checkpointId: string;
  presentationRevision: number;
  sourceId: string;
  cardKind: "RainingArrows" | "BarbarianInvasion";
  targetId: string;
  effectState: "ACTIVE" | "BLOCKED";
};

export type PresentationReactionChain = {
  semantics: "PROVEN";
  interactionId: string;
  frameId: string;
  rootCard: PresentationReactionChainRootCard | null;
  nodes: readonly PresentationReactionChainNode[];
  /** Present only when a Group Negation chain is proven to scope one target branch. */
  groupTargetEffectScope?: PresentationGroupTargetEffectScope;
  /** Exact public events for committed Negation nodes, independent of root-card scope. */
  publicNodeEventLinks?: readonly PresentationReactionChainPublicNodeEventLink[];
  /** Exact public timeline references for graph consumers; absent when any link is unproven. */
  publicEventLinks?: PresentationReactionChainPublicEventLinks;
  /** Current single-target root effect state; absent unless its public card chain is complete. */
  rootEffectState?: "ACTIVE" | "BLOCKED";
};

type PresentationRootActionBase = {
  semantics: "PROVEN";
  interactionId: string;
  rootFrameId: string;
  activeFrameId: string;
  checkpointId: string;
  presentationRevision: number;
  /** Public timeline identity for deduplicating the graph node from the reveal layer. */
  rootEventId: string;
  sourceId: string;
  targetId: string;
  cardKind: CardKind;
};

export type PresentationRootAction =
  | (PresentationRootActionBase & { action: "ATTACK" })
  | (PresentationRootActionBase & { action: "STRATAGEM"; cardKind: "Dismantle" | "Steal" });

/** Public proof that one submitted physical Dodge blocks one exact ordinary Attack target effect. */
export type PresentationAttackDodgeResponseProof = {
  semantics: "PROVEN";
  counterRelation: "BLOCKS_TARGET_EFFECT";
  interactionId: string;
  rootFrameId: string;
  rootEventId: string;
  rootResolutionId: string;
  rootSourceId: string;
  targetId: string;
  responseActorId: string;
  rootCardKind: "Attack";
  responseCardKind: "Dodge";
};

export type PresentationAttackDodgeResponse = PresentationAttackDodgeResponseProof & {
  responseEventId: string;
  responseResolutionId: string;
};

/** Server-authored public proof that one accepted Attack belongs to a Duel exchange. */
export type PresentationDuelAttackResponseProof = {
  semantics: "PROVEN";
  relation: "DUEL_EXCHANGE";
  interactionId: string;
  rootFrameId: string;
  rootEventId: string;
  rootResolutionId: string;
  rootSourceId: string;
  rootTargetId: string;
  ordinal: number;
  sourceId: string;
  targetId: string;
  decisionActorId: string;
  /** Public player who actually submitted/paid for the response, if delegated. */
  responseActorId: string;
  responseCardKind: "Attack";
};

export type PresentationDuelAttackResponse = PresentationDuelAttackResponseProof & {
  responseEventId: string;
  responseResolutionId: string;
};

export type PresentationDuelExchange = {
  semantics: "PROVEN";
  interactionId: string;
  rootFrameId: string;
  checkpointId: string;
  presentationRevision: number;
  root: { eventId: string; resolutionId: string; sourceId: string; targetId: string; cardKind: "Duel" };
  responseCount: number;
  responses: readonly PresentationDuelAttackResponse[];
  currentParticipantId: string;
  decisionActorId: string | null;
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
  rootEventId: string;
  rootResolutionId: string;
  effectState: "ACTIVE" | "BLOCKED";
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
  rootEventId: string;
  rootResolutionId: string;
  rootCardId: string;
  targetIds: readonly string[];
  currentParticipantId: string | null;
  currentEffectState?: "ACTIVE" | "BLOCKED";
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
  rootAction: PresentationRootAction | null;
  skillEffectAction: PresentationSkillEffectAction | null;
  skillEffectSettlements: readonly PresentationSkillEffectSettlement[];
  duelExchange: PresentationDuelExchange | null;
  selfTargetActions?: readonly PresentationSelfTargetAction[];
  dyingBarrier: PresentationDyingBarrier | null;
  reactionChain: PresentationReactionChain | null;
  negationSettlement: PresentationNegationSettlement | null;
  oathRecipientScope: PresentationOathRecipientScope | null;
  bumperHarvestProgress: PresentationBumperHarvestProgress | null;
  attackDodgeResponses?: readonly PresentationAttackDodgeResponse[];
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
    const progressVersionIsSupported = progress?.version === 1
      || progress?.version === 2 && Boolean(stringValue(progress.rootEventId)
        && stringValue(progress.rootResolutionId) && stringValue(progress.rootCardId));
    if (progressVersionIsSupported && progress.interactionId === envelope.interactionId
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
  if (item.kind === "target_card" && (item.cardKind === "Dismantle" || item.cardKind === "Steal")) {
    const sourceId = stringValue(item.sourceId);
    const targetId = stringValue(item.targetId);
    const expectedEffect = item.cardKind === "Dismantle" ? "Burning Bridges" : "Steal";
    const rootFrames = envelope.frames.filter(({ parentFrameId }) => parentFrameId == null);
    if (actorId === sourceId && sourceId && targetId && sourceId !== targetId
      && envelope.activeFrameId === activeFrame.frameId && envelope.checkpoint.frameId === activeFrame.frameId
      && envelope.checkpoint.stage === "SETTLEMENT" && activeFrame.stage === "SETTLEMENT"
      && activeFrame.parentFrameId == null && rootFrames.length === 1 && rootFrames[0].frameId === activeFrame.frameId
      && causal.frameId === activeFrame.frameId
      && activeFrame.origin.originSourceId === sourceId && activeFrame.origin.originEffect === expectedEffect
      && activeFrame.origin.originalTargetIds.length === 1 && activeFrame.origin.originalTargetIds[0] === targetId
      && activeFrame.current.currentSourceId === sourceId && activeFrame.current.currentEffect === expectedEffect
      && activeFrame.current.currentTargetIds.length === 1 && activeFrame.current.currentTargetIds[0] === targetId
      && activeFrame.current.resolvingPlayerId === sourceId) return sourceId;
    return null;
  }
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
  timeline: readonly PresentationV2Event[],
  reactionChain: PresentationReactionChain | null,
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
  const targetId = stringValue(continuation.effectTargetId);
  const rootResolutionId = stringValue(continuation.resolutionId);
  const chainDepth = continuation.chainDepth;
  const rootEventLink = rootResolutionId ? publicCardEventForResolution(timeline, rootResolutionId, "Oath") : null;
  const rootEvent = rootEventLink ? timeline.find((event) => event.id === rootEventLink.eventId) ?? null : null;
  const responseLinks = reactionChain?.publicNodeEventLinks;
  if (!sourceId || targetId !== sourceId || continuation.rootCardKind !== "Oath"
    || !rootResolutionId || !rootEvent?.id || rootEvent.resolutionId !== rootResolutionId
    || !reactionChain || reactionChain.semantics !== "PROVEN"
    || reactionChain.interactionId !== envelope?.interactionId || reactionChain.frameId !== activeFrame?.frameId
    || reactionChain.rootCard !== null || reactionChain.nodes.length !== chainDepth
    || !Array.isArray(responseLinks) || responseLinks.length !== reactionChain.nodes.length
    || typeof continuation.negated !== "boolean" || typeof chainDepth !== "number"
    || !Number.isSafeInteger(chainDepth) || chainDepth < 0
    || continuation.negated !== (chainDepth % 2 === 1)
    || !activeFrame || !rootFrame || rootFrame.frameId !== activeFrame.frameId
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

  for (let index = 0; index < reactionChain.nodes.length; index += 1) {
    const node = reactionChain.nodes[index];
    const link = responseLinks[index];
    if (!node || !link || link.nodeId !== node.nodeId || !link.eventId || !link.resolutionId
      || node.causedByNodeId !== (index === 0 ? null : reactionChain.nodes[index - 1]?.nodeId)
      || link.eventId === rootEvent.id || link.resolutionId.length === 0
      || link.resolutionId === rootResolutionId
      || responseLinks.slice(0, index).some((previous) => previous.eventId === link.eventId || previous.resolutionId === link.resolutionId)) return null;
  }

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
    rootEventId: rootEvent.id,
    rootResolutionId,
    effectState: continuation.negated ? "BLOCKED" : "ACTIVE",
    sourceId,
    recipientIds: recipients,
  };
}

function bumperHarvestProgressFor(
  envelope: CausalEnvelope | null,
  pending: unknown,
  scene: PresentationInteractionScene | null,
  timeline: readonly PresentationV2Event[],
): PresentationBumperHarvestProgress | null {
  const item = record(pending);
  const harvest = bumperHarvestPendingFrom(pending);
  const progress = record(harvest?.participantProgress);
  const causal = record(harvest?.causal);
  const rootFrameId = stringValue(progress?.rootFrameId);
  const sourceId = stringValue(harvest?.sourceId);
  const rootEventId = stringValue(progress?.rootEventId);
  const rootResolutionId = stringValue(progress?.rootResolutionId);
  const rootCardId = stringValue(progress?.rootCardId);
  const root = envelope?.frames.find((frame) => frame.frameId === rootFrameId) ?? null;
  const active = envelope?.frames.find((frame) => frame.frameId === envelope.activeFrameId) ?? null;
  const rootEventMatches = rootEventId ? timeline.filter((event) => event.id === rootEventId) : [];
  const rootEvent = rootEventMatches.length === 1 ? rootEventMatches[0] : null;
  const rootProof = record(rootEvent?.bumperHarvestRoot);
  const rootPhysicalCardEvents = rootCardId ? timeline.filter((event) => event.type === "card" && event.action === "play" && event.card?.id === rootCardId) : [];
  const storedParticipants = progress?.participants;
  if (!item || !harvest || !progress || progress.version !== 2 || !rootFrameId || !sourceId
    || !rootEventId || !rootResolutionId || !rootCardId || !rootEvent || rootPhysicalCardEvents.length !== 1 || rootPhysicalCardEvents[0] !== rootEvent
    || rootEvent.type !== "card" || rootEvent.action !== "play" || rootEvent.presentation === false
    || rootEvent.card?.kind !== "BumperHarvest" || rootEvent.card.id !== rootCardId || rootEvent.resolutionId !== rootResolutionId
    || rootProof?.semantics !== "PROVEN" || rootProof.sourceId !== sourceId || rootProof.cardId !== rootCardId
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
  let currentEffectState: PresentationBumperHarvestProgress["currentEffectState"];
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
    const negationHistory = continuation?.negationHistory ?? [];
    const chainDepth = continuation?.chainDepth;
    if (!Array.isArray(negationHistory) || !Number.isSafeInteger(chainDepth) || (chainDepth as number) < 0
      || (chainDepth as number) !== negationHistory.length || typeof continuation?.negated !== "boolean"
      || continuation.negated !== ((chainDepth as number) % 2 === 1)) return null;
    currentEffectState = continuation.negated ? "BLOCKED" : "ACTIVE";
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
    rootEventId,
    rootResolutionId,
    rootCardId,
    targetIds: [...root.origin.originalTargetIds],
    currentParticipantId,
    ...(currentEffectState ? { currentEffectState } : {}),
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

function groupTargetEffectScopeFor(
  envelope: CausalEnvelope | null,
  pending: unknown,
  scene: PresentationInteractionScene | null,
  groupValues: GroupProjectionValues | null,
  participantProgress: ReturnType<typeof groupParticipantProgress>,
): Omit<PresentationGroupTargetEffectScope, "effectState"> | null {
  const item = record(pending);
  const continuation = record(item?.continuation);
  const effect = record(continuation?.effect);
  const effectPending = record(effect?.pending);
  const nestedGroup = record(effectPending?.continuation);
  const group = typedGroupContinuation(pending);
  const groupCausal = record(group?.causal);
  const progress = record(group?.participantProgress);
  const responseCausal = record(item?.causal);
  const continuationCausal = record(continuation?.causal);
  const targetId = stringValue(continuation?.effectTargetId);
  const sourceId = stringValue(continuation?.sourceId);
  const root = groupValues?.groupFrame;
  const active = groupValues?.activeFrame;
  const groupCardName = groupValues && (groupValues.cardKind === "RainingArrows" || groupValues.cardKind === "BarbarianInvasion")
    ? CARD_DEFINITIONS[groupValues.cardKind].name
    : null;
  if (item?.kind !== "response" || continuation?.kind !== "negation" || effect?.kind !== "group"
    || effectPending?.kind !== "response" || nestedGroup?.kind !== "group" || group !== nestedGroup
    || !envelope || !scene || scene.semantics !== "PROVEN" || scene.stage !== "NEGATION"
    || scene.continuity.relation !== "SAME_FRAME" || !groupValues || !participantProgress
    || participantProgress.resolutionSemantics !== "GROUP"
    || !root || !active || root.frameId !== active.frameId || root.parentFrameId !== null
    || root.stage !== "NEGATION" || active.stage !== "NEGATION"
    || envelope.activeFrameId !== root.frameId || envelope.checkpoint.frameId !== root.frameId
    || envelope.checkpoint.stage !== "NEGATION"
    || scene.interactionId !== envelope.interactionId || scene.rootFrameId !== root.frameId
    || scene.activeFrameId !== root.frameId || scene.checkpointId !== envelope.checkpoint.checkpointId
    || scene.presentationRevision !== envelope.presentationRevision
    || responseCausal?.interactionId !== envelope.interactionId || responseCausal.frameId !== root.frameId
    || continuationCausal?.interactionId !== envelope.interactionId || continuationCausal.frameId !== root.frameId
    || groupCausal?.interactionId !== envelope.interactionId || groupCausal.frameId !== root.frameId
    || progress?.version !== 1 || progress.interactionId !== envelope.interactionId
    || progress.groupFrameId !== root.frameId || progress.resolutionSemantics !== "GROUP"
    || !targetId || !sourceId || continuation.effectTargetId !== targetId
    || groupValues.cardKind !== "RainingArrows" && groupValues.cardKind !== "BarbarianInvasion"
    || group.cardKind !== groupValues.cardKind || group.sourceId !== sourceId
    || root.origin.originEffect !== groupValues.cardKind || root.origin.originSourceId !== sourceId
    || root.current.currentSourceId !== sourceId || root.current.currentEffect !== groupCardName
    || root.current.currentTargetIds.length !== 1 || root.current.currentTargetIds[0] !== targetId
    || scene.sourceId !== sourceId || scene.activeSourceId !== sourceId
    || scene.activeTargetIds.length !== 1 || scene.activeTargetIds[0] !== targetId
    || scene.participantRoles.sourceId !== sourceId
    || !root.origin.originalTargetIds.includes(targetId)
    || participantProgress.participants.filter(({ status }) => status === "CURRENT" || status === "PAUSED").length !== 1
    || participantProgress.participants.find(({ playerId }) => playerId === targetId)?.status !== "CURRENT"
    || item.actorId !== active.current.resolvingPlayerId) return null;

  return {
    semantics: "PROVEN",
    relation: "GROUP_TARGET_EFFECT",
    interactionId: envelope.interactionId,
    groupFrameId: root.frameId,
    activeFrameId: active.frameId,
    checkpointId: envelope.checkpoint.checkpointId,
    presentationRevision: envelope.presentationRevision,
    sourceId,
    cardKind: groupValues.cardKind,
    targetId,
  };
}

function reactionChainFor(
  timeline: readonly PresentationV2Event[],
  envelope: CausalEnvelope | null,
  pending: unknown,
  scene: PresentationInteractionScene | null,
  bumperProgress: PresentationBumperHarvestProgress | null,
  groupValues: GroupProjectionValues | null,
  groupProgress: ReturnType<typeof groupParticipantProgress>,
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
  const groupTargetEffectScopeIdentity = effect?.kind === "group"
    ? groupTargetEffectScopeFor(envelope, pending, scene, groupValues, groupProgress)
    : null;
  if (effect?.kind === "group" && !groupTargetEffectScopeIdentity) return null;
  const rawHistory: unknown = continuation.negationHistory;
  if (rawHistory !== undefined && !Array.isArray(rawHistory)) return null;
  const history = (rawHistory ?? []) as unknown[];
  const nodeIds = new Set<string>();
  const physicalCardIds = new Set<string>();
  let previousNodeId: string | null = null;
  const nodes: PresentationReactionChainNode[] = [];
  const nodeEventLinks: Array<{ nodeId: string; eventId: string; resolutionId: string } | null> = [];
  const publicCardEventFor = (physicalCardId: string, cardKind: string) => {
    const matches = timeline.filter((candidate) => candidate.type === "card" && candidate.action === "play"
      && candidate.presentation !== false && candidate.card?.id === physicalCardId && candidate.card.kind === cardKind
      && typeof candidate.id === "string" && candidate.id.length > 0
      && typeof candidate.resolutionId === "string" && candidate.resolutionId.length > 0);
    if (matches.length !== 1 || timeline.filter((candidate) => candidate.id === matches[0].id).length !== 1) return null;
    return { eventId: matches[0].id, resolutionId: matches[0].resolutionId };
  };
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
    const publicEvent = publicCardEventFor(stored.physicalCardId, "Negation");
    nodeEventLinks.push(publicEvent ? { nodeId: stored.nodeId, ...publicEvent } : null);
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
  const heldRootCardIds = Array.isArray(continuation.heldCards)
    ? continuation.heldCards.flatMap((value) => {
      const card = record(value);
      const id = stringValue(card?.id);
      return card?.kind === rootCardKind && id ? [id] : [];
    })
    : [];
  const effectRootCardId = stringValue(effect?.cardId);
  const rootPhysicalCardId = heldRootCardIds.length === 1
    && (!effectRootCardId || effectRootCardId === heldRootCardIds[0])
    ? heldRootCardIds[0]
    : heldRootCardIds.length === 0 ? effectRootCardId : null;
  const rootEvent = rootCard && rootPhysicalCardId && expectedRootCardKind
    ? publicCardEventFor(rootPhysicalCardId, expectedRootCardKind)
    : null;
  const linkedNodeEvents = nodeEventLinks.filter((link): link is NonNullable<typeof link> => link !== null);
  const publicNodeEventIds = linkedNodeEvents.map(({ eventId }) => eventId);
  const publicNodeEventLinks = nodeEventLinks.length === nodes.length
    && linkedNodeEvents.length === nodes.length
    && new Set(publicNodeEventIds).size === publicNodeEventIds.length
    ? linkedNodeEvents
    : undefined;
  const allPublicEvents = rootEvent ? [rootEvent, ...linkedNodeEvents] : [];
  const eventIds = allPublicEvents.map(({ eventId }) => eventId);
  const publicEventLinks = rootEvent && nodeEventLinks.length === nodes.length && linkedNodeEvents.length === nodes.length
    && new Set(eventIds).size === eventIds.length
    ? { root: rootEvent, nodes: linkedNodeEvents }
    : undefined;
  const chainDepth = continuation.chainDepth;
  const rootEffectState = !bumperWindow && rootCard && publicEventLinks && typeof continuation.negated === "boolean"
    && typeof chainDepth === "number" && Number.isSafeInteger(chainDepth) && chainDepth >= 0
    && chainDepth === nodes.length && continuation.negated === (chainDepth % 2 === 1)
    ? continuation.negated ? "BLOCKED" as const : "ACTIVE" as const
    : undefined;
  const oathRootResolutionId = stringValue(continuation.resolutionId);
  const oathRootEventLink = effect?.kind === "oath" && rootCardKind === "Oath" && sourceId && sourceId === targetId
    && oathRootResolutionId
    ? publicCardEventForResolution(timeline, oathRootResolutionId, "Oath")
    : null;
  const oathRootFrame = envelope.frames.find(({ frameId }) => frameId === scene.rootFrameId);
  const oathChainStateIsProven = Boolean(effect?.kind === "oath" && oathRootEventLink
    && sourceId && targetId === sourceId && oathRootFrame?.frameId === frame.frameId
    && scene.continuity.relation === "ROOT_FRAME" && scene.rootFrameId === scene.activeFrameId
    && oathRootFrame.stage === "NEGATION" && oathRootFrame.parentFrameId == null
    && oathRootFrame.origin.originSourceId === sourceId && oathRootFrame.current.currentSourceId === sourceId
    && oathRootFrame.origin.originalTargetIds.length === 1 && oathRootFrame.origin.originalTargetIds[0] === sourceId
    && oathRootFrame.current.currentTargetIds.length === 1 && oathRootFrame.current.currentTargetIds[0] === sourceId
    && cardName !== null && oathRootFrame.origin.originEffect === cardName && oathRootFrame.current.currentEffect === cardName
    && scene.effect === cardName && continuation.rootCardKind === "Oath"
    && typeof continuation.negated === "boolean" && typeof chainDepth === "number"
    && Number.isSafeInteger(chainDepth) && chainDepth >= 0 && chainDepth === nodes.length
    && continuation.negated === (chainDepth % 2 === 1)
    && publicNodeEventLinks !== undefined && publicNodeEventLinks.length === nodes.length);
  const bumperChainStateIsProven = Boolean(bumperWindow && bumperProgress?.currentEffectState
    && effect?.kind === "harvest_target" && effect.pending?.participantProgress?.rootEventId === bumperProgress.rootEventId
    && effect.pending?.participantProgress?.rootResolutionId === bumperProgress.rootResolutionId
    && effect.pending?.participantProgress?.rootCardId === bumperProgress.rootCardId
    && continuation.effectTargetId === bumperProgress.currentParticipantId
    && typeof continuation.negated === "boolean" && typeof chainDepth === "number"
    && Number.isSafeInteger(chainDepth) && chainDepth >= 0 && chainDepth === nodes.length
    && continuation.negated === (chainDepth % 2 === 1)
    && bumperProgress.currentEffectState === (continuation.negated ? "BLOCKED" : "ACTIVE")
    && publicNodeEventLinks !== undefined && publicNodeEventLinks.length === nodes.length);
  const groupChainStateIsProven = groupTargetEffectScopeIdentity
    && typeof continuation.negated === "boolean"
    && typeof chainDepth === "number" && Number.isSafeInteger(chainDepth) && chainDepth >= 0
    && chainDepth === nodes.length
    && continuation.negated === (chainDepth % 2 === 1)
    && (nodes.length === 0 || publicNodeEventLinks !== undefined);
  const groupTargetEffectScope = groupTargetEffectScopeIdentity && groupChainStateIsProven
    ? {
      ...groupTargetEffectScopeIdentity,
      effectState: continuation.negated ? "BLOCKED" as const : "ACTIVE" as const,
    }
    : null;
  if (effect?.kind === "group" && !groupTargetEffectScope) return null;
  if (bumperWindow && !bumperChainStateIsProven) return null;
  return {
    semantics: "PROVEN", interactionId: scene.interactionId, frameId: scene.activeFrameId, rootCard, nodes,
    ...(groupTargetEffectScope ? { groupTargetEffectScope } : {}),
    ...(groupTargetEffectScope && publicNodeEventLinks ? { publicNodeEventLinks } : {}),
    ...(bumperChainStateIsProven && publicNodeEventLinks ? { publicNodeEventLinks } : {}),
    ...(oathChainStateIsProven && publicNodeEventLinks ? { publicNodeEventLinks } : {}),
    ...(publicEventLinks ? { publicEventLinks } : {}),
    ...(rootEffectState ? { rootEffectState } : {}),
  };
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
function publicCardEventForResolution(
  timeline: readonly PresentationV2Event[],
  resolutionId: string,
  cardKind: CardKind,
): { eventId: string; resolutionId: string } | null {
  const matches = timeline.filter((event) => event.type === "card" && event.action === "play"
    && event.presentation !== false && event.card?.kind === cardKind && event.resolutionId === resolutionId
    && typeof event.id === "string" && event.id.length > 0);
  if (matches.length !== 1 || timeline.filter((event) => event.id === matches[0].id).length !== 1) return null;
  return { eventId: matches[0].id, resolutionId };
}
function eventForContext(context: Context | null, timeline: readonly PresentationV2Event[], barrierId: string | null): PresentationV2Event | null {
  if (!context) return null;
  if (context.sequenceStartCardId) {
    const byCard = timeline.find((event) => event.presentation !== false && eventCardIds(event).includes(context.sequenceStartCardId as string));
    if (byCard) return byCard;
  }
  if (barrierId) return timeline.find((event) => event.id === barrierId && event.presentation !== false) ?? null;
  return null;
}

function singleTargetAttackRootActionFor(
  envelope: CausalEnvelope | null,
  scene: PresentationInteractionScene | null,
  pending: unknown,
  rootContext: Context | null,
  rootEvent: PresentationV2Event | null,
): PresentationRootAction | null {
  const item = record(pending);
  const continuation = record(item?.continuation);
  const causal = record(item?.causal);
  const continuationCausal = record(continuation?.causal);
  const sourceId = stringValue(continuation?.sourceId);
  const targetId = stringValue(continuation?.targetId);
  const sequenceStartCardId = stringValue(continuation?.sequenceStartCardId);
  const readyAfterEventId = stringValue(item?.readyAfterEventId);
  const frame = envelope?.frames.find(({ frameId }) => frameId === envelope.activeFrameId) ?? null;
  const rootFrames = envelope?.frames.filter(({ parentFrameId }) => parentFrameId == null) ?? [];
  const card = rootEvent?.card;

  if (item?.kind !== "response" || continuation?.kind !== "attack"
    || !envelope || !frame || rootFrames.length !== 1 || !scene
    || scene.semantics !== "PROVEN" || scene.continuity.relation !== "ROOT_FRAME"
    || scene.rootFrameId !== frame.frameId || scene.activeFrameId !== frame.frameId
    || scene.stage !== "ATTACK_RESPONSE" || frame.stage !== "ATTACK_RESPONSE"
    || frame.parentFrameId != null
    || envelope.checkpoint.frameId !== frame.frameId || envelope.checkpoint.stage !== frame.stage
    || causal?.interactionId !== envelope.interactionId || causal.frameId !== frame.frameId
    || continuationCausal?.interactionId !== envelope.interactionId || continuationCausal.frameId !== frame.frameId
    || !sourceId || !targetId || sourceId === targetId || item.actorId !== targetId
    || frame.origin.originSourceId !== sourceId || frame.current.currentSourceId !== sourceId
    || frame.current.currentEffect !== frame.origin.originEffect || scene.effect !== frame.origin.originEffect
    || frame.origin.originalTargetIds.length !== 1 || frame.origin.originalTargetIds[0] !== targetId
    || frame.current.currentTargetIds.length !== 1 || frame.current.currentTargetIds[0] !== targetId
    || frame.current.resolvingPlayerId !== targetId
    || scene.sourceId !== sourceId || scene.activeSourceId !== sourceId
    || scene.targetIds.length !== 1 || scene.targetIds[0] !== targetId
    || scene.activeTargetIds.length !== 1 || scene.activeTargetIds[0] !== targetId
    || scene.currentParticipantId !== targetId
    || scene.participantRoles.sourceId !== sourceId
    || scene.participantRoles.originalTargetIds.length !== 1 || scene.participantRoles.originalTargetIds[0] !== targetId
    || scene.participantRoles.activeTargetIds.length !== 1 || scene.participantRoles.activeTargetIds[0] !== targetId
    || scene.participantRoles.currentParticipantId !== targetId
    || scene.participantRoles.decisionActorId !== targetId || scene.participantRoles.activeResolverId !== targetId
    || scene.decisionActorId !== targetId || scene.activeResolverId !== targetId
    || rootContext?.kind !== "response" || rootContext.sourceId !== sourceId
    || rootContext.targetIds.length !== 1 || rootContext.targetIds[0] !== targetId || !sequenceStartCardId
    || !readyAfterEventId || rootEvent?.id !== readyAfterEventId
    || rootEvent.type !== "card" || rootEvent.presentation === false || rootEvent.action !== "play"
    || !card || card.id !== sequenceStartCardId || !CARD_KINDS.includes(card.kind as CardKind)) return null;

  return {
    semantics: "PROVEN",
    interactionId: envelope.interactionId,
    rootFrameId: frame.frameId,
    activeFrameId: frame.frameId,
    checkpointId: envelope.checkpoint.checkpointId,
    presentationRevision: envelope.presentationRevision,
    rootEventId: rootEvent.id,
    action: "ATTACK",
    sourceId,
    targetId,
    cardKind: card.kind as CardKind,
  };
}

function singleTargetTargetCardRootActionFor(
  envelope: CausalEnvelope | null,
  scene: PresentationInteractionScene | null,
  pending: unknown,
  timeline: readonly PresentationV2Event[],
  cardKind: "Dismantle" | "Steal",
): PresentationRootAction | null {
  const item = record(pending);
  const causal = record(item?.causal);
  const sourceId = stringValue(item?.sourceId);
  const actorId = stringValue(item?.actorId);
  const targetId = stringValue(item?.targetId);
  const heldCards = Array.isArray(item?.heldCards) ? item.heldCards.map(record) : [];
  const heldRootCards = heldCards.filter((heldCard) => heldCard?.kind === cardKind);
  const heldCard = heldRootCards.length === 1 ? heldRootCards[0] : null;
  const physicalCardId = stringValue(heldCard?.id);
  const effectName = cardKind === "Dismantle" ? "Burning Bridges" : "Steal";
  const frame = envelope?.frames.find(({ frameId }) => frameId === envelope.activeFrameId) ?? null;
  const rootFrames = envelope?.frames.filter(({ parentFrameId }) => parentFrameId == null) ?? [];
  if (item?.kind !== "target_card" || item.cardKind !== cardKind
    || !envelope || !frame || rootFrames.length !== 1 || !scene
    || scene.semantics !== "PROVEN" || scene.continuity.relation !== "ROOT_FRAME"
    || scene.rootFrameId !== frame.frameId || scene.activeFrameId !== frame.frameId
    || scene.stage !== "SETTLEMENT" || frame.stage !== "SETTLEMENT" || frame.parentFrameId != null
    || envelope.activeFrameId !== frame.frameId || envelope.checkpoint.frameId !== frame.frameId || envelope.checkpoint.stage !== "SETTLEMENT"
    || causal?.interactionId !== envelope.interactionId || causal.frameId !== frame.frameId
    || !sourceId || actorId !== sourceId || !targetId || sourceId === targetId
    || heldCard?.kind !== cardKind || !physicalCardId
    || frame.origin.originSourceId !== sourceId || frame.origin.originEffect !== effectName
    || frame.origin.originalTargetIds.length !== 1 || frame.origin.originalTargetIds[0] !== targetId
    || frame.current.currentSourceId !== sourceId || frame.current.currentEffect !== effectName
    || frame.current.currentTargetIds.length !== 1 || frame.current.currentTargetIds[0] !== targetId
    || frame.current.resolvingPlayerId !== sourceId
    || scene.effect !== effectName || scene.sourceId !== sourceId || scene.activeSourceId !== sourceId
    || scene.targetIds.length !== 1 || scene.targetIds[0] !== targetId
    || scene.activeTargetIds.length !== 1 || scene.activeTargetIds[0] !== targetId
    || scene.currentParticipantId !== targetId
    || scene.participantRoles.sourceId !== sourceId
    || scene.participantRoles.originalTargetIds.length !== 1 || scene.participantRoles.originalTargetIds[0] !== targetId
    || scene.participantRoles.activeTargetIds.length !== 1 || scene.participantRoles.activeTargetIds[0] !== targetId
    || scene.participantRoles.currentParticipantId !== targetId
    || scene.participantRoles.decisionActorId !== sourceId || scene.participantRoles.activeResolverId !== sourceId
    || scene.decisionActorId !== sourceId || scene.activeResolverId !== sourceId) return null;

  const rootEvents = timeline.filter((event) => event.presentation !== false && event.type === "card"
    && event.action === "play" && event.card?.id === physicalCardId && event.card.kind === cardKind);
  if (rootEvents.length !== 1 || timeline.filter((event) => event.id === rootEvents[0].id).length !== 1) return null;
  const rootEvent = rootEvents[0];
  return {
    semantics: "PROVEN",
    interactionId: envelope.interactionId,
    rootFrameId: frame.frameId,
    activeFrameId: frame.frameId,
    checkpointId: envelope.checkpoint.checkpointId,
    presentationRevision: envelope.presentationRevision,
    rootEventId: rootEvent.id,
    action: "STRATAGEM",
    sourceId,
    targetId,
    cardKind,
  };
}

function selfTargetActionsFor(timeline: readonly PresentationV2Event[]): PresentationSelfTargetAction[] {
  const eventIdCounts = new Map<string, number>();
  for (const event of timeline) {
    const eventId = stringValue(event.id);
    if (eventId) eventIdCounts.set(eventId, (eventIdCounts.get(eventId) ?? 0) + 1);
  }
  return timeline.flatMap((event) => {
    const proof = record(event.selfTargetAction);
    const card = record(event.card);
    const eventId = stringValue(event.id);
    const resolutionId = stringValue(event.resolutionId);
    const sourceId = stringValue(proof?.sourceId);
    const targetId = stringValue(proof?.targetId);
    if (!eventId || eventIdCounts.get(eventId) !== 1 || !resolutionId
      || event.type !== "card" || event.presentation === false || event.action !== "play"
      || event.playedAs !== undefined || card?.kind !== "Peach" || !stringValue(card.id)
      || proof?.semantics !== "PROVEN" || proof.cardKind !== "Peach"
      || !sourceId || sourceId !== targetId) return [];
    return [{ semantics: "PROVEN", rootEventId: eventId, resolutionId, sourceId, targetId, cardKind: "Peach" }];
  });
}

function skillEffectActionFor(input: PresentationV2Input): PresentationSkillEffectAction | null {
  const pending = record(input.pending);
  const continuation = record(pending?.continuation);
  const effectRoot = record(continuation?.effectRoot);
  const sourceId = stringValue(continuation?.sourceId);
  const targetId = stringValue(continuation?.targetId);
  const rootEventId = stringValue(effectRoot?.rootEventId);
  const barrierEventId = stringValue(input.currentAction?.presentation?.readyAfterEventId);
  const rootEvents = rootEventId ? input.timeline.filter((event) => event.id === rootEventId) : [];
  const barrierEvents = barrierEventId ? input.timeline.filter((event) => event.id === barrierEventId) : [];
  const rootEvent = rootEvents.length === 1 ? rootEvents[0] : null;
  const barrierEvent = barrierEvents.length === 1 ? barrierEvents[0] : null;
  const publicEffect = record(rootEvent?.publicSkillEffect);

  if (pending?.kind !== "trigger" || pending.event !== "hero_choice"
    || continuation?.kind !== "hero_choice_event"
    || effectRoot?.effectId !== "zhou_yu_fanjian"
    || (continuation.stage !== "suit" && continuation.stage !== "card")
    || input.currentAction?.kind !== "trigger" || !sourceId || !targetId
    || sourceId === targetId || pending.actorId !== targetId || input.currentAction.actorId !== targetId
    || !rootEventId || !rootEvent || rootEvent.type !== "message" || rootEvent.presentation === false
    || publicEffect?.effectId !== "zhou_yu_fanjian"
    || publicEffect.sourceId !== sourceId || publicEffect.targetId !== targetId
    || !barrierEventId || !barrierEvent || barrierEvent.presentation === false) return null;

  return { semantics: "PROVEN", effectId: "zhou_yu_fanjian", rootEventId, sourceId, targetId };
}

function skillEffectSettlementsFor(input: PresentationV2Input): PresentationSkillEffectSettlement[] {
  const eventIdCounts = new Map<string, number>();
  const rootIdCounts = new Map<string, number>();
  for (const event of input.timeline) {
    const eventId = stringValue(event.id);
    if (eventId) eventIdCounts.set(eventId, (eventIdCounts.get(eventId) ?? 0) + 1);
    const proof = record(event.publicSkillEffectSettlement);
    const rootEventId = stringValue(proof?.rootEventId);
    if (rootEventId) rootIdCounts.set(rootEventId, (rootIdCounts.get(rootEventId) ?? 0) + 1);
  }
  const pending = record(input.pending);
  const continuation = record(pending?.continuation);
  const effectRoot = record(continuation?.effectRoot);
  const activeRootEventId = pending?.kind === "trigger" && pending.event === "hero_choice"
    && continuation?.kind === "hero_choice_event" && effectRoot?.effectId === "zhou_yu_fanjian"
    ? stringValue(effectRoot.rootEventId)
    : null;

  return input.timeline.flatMap((event) => {
    const proof = record(event.publicSkillEffectSettlement);
    const eventId = stringValue(event.id);
    const rootEventId = stringValue(proof?.rootEventId);
    const sourceId = stringValue(proof?.sourceId);
    const targetId = stringValue(proof?.targetId);
    if (!eventId || eventIdCounts.get(eventId) !== 1 || !rootEventId || rootIdCounts.get(rootEventId) !== 1
      || !sourceId || !targetId || sourceId === targetId
      || proof?.semantics !== "PROVEN" || proof.effectId !== "zhou_yu_fanjian"
      || proof.outcome !== "SUITS_MATCHED" && proof.outcome !== "SUITS_DIFFERED"
      || event.type !== "message" || event.presentation === false || event.importance !== "essential" || event.finalResult !== true
      || activeRootEventId === rootEventId) return [];

    const rootEvents = input.timeline.filter((candidate) => candidate.id === rootEventId);
    const rootEvent = rootEvents.length === 1 ? rootEvents[0] : null;
    const publicEffect = record(rootEvent?.publicSkillEffect);
    if (!rootEvent || rootEvent.type !== "message" || rootEvent.presentation === false
      || publicEffect?.effectId !== "zhou_yu_fanjian"
      || publicEffect.sourceId !== sourceId || publicEffect.targetId !== targetId) return [];

    return [{
      semantics: "PROVEN",
      effectId: "zhou_yu_fanjian",
      rootEventId,
      sourceId,
      targetId,
      outcome: proof.outcome,
      eventId,
    }];
  });
}

function attackDodgeResponsesFor(timeline: readonly PresentationV2Event[]): PresentationAttackDodgeResponse[] {
  const eventCounts = new Map<string, number>();
  const eventsById = new Map<string, PresentationV2Event[]>();
  const cardIdCounts = new Map<string, number>();
  for (const event of timeline) {
    const eventId = stringValue(event.id);
    if (eventId) {
      eventCounts.set(eventId, (eventCounts.get(eventId) ?? 0) + 1);
      const matching = eventsById.get(eventId) ?? [];
      matching.push(event);
      eventsById.set(eventId, matching);
    }
    for (const cardId of eventCardIds(event)) cardIdCounts.set(cardId, (cardIdCounts.get(cardId) ?? 0) + 1);
  }
  return timeline.flatMap((event) => {
    const proof = record(event.attackDodgeResponse);
    if (!proof) return [];
    const eventId = stringValue(event.id);
    const responseResolutionId = stringValue(event.resolutionId);
    const rootEventId = stringValue(proof.rootEventId);
    const rootResolutionId = stringValue(proof.rootResolutionId);
    const interactionId = stringValue(proof.interactionId);
    const rootFrameId = stringValue(proof.rootFrameId);
    const rootSourceId = stringValue(proof.rootSourceId);
    const targetId = stringValue(proof.targetId);
    const responseActorId = stringValue(proof.responseActorId);
    const rootEvent = rootEventId && eventsById.get(rootEventId)?.length === 1 ? eventsById.get(rootEventId)?.[0] : null;
    if (!rootEventId || !rootEvent) return [];
    const rootCard = record(rootEvent?.card);
    const responseCard = record(event.card);
    const rootCardId = stringValue(rootCard?.id);
    const responseCardId = stringValue(responseCard?.id);
    if (!eventId || eventCounts.get(eventId) !== 1 || !responseResolutionId
      || event.type !== "card" || event.presentation === false || event.action !== "play" || event.playedAs !== undefined
      || responseCard?.kind !== "Dodge" || !responseCardId || cardIdCounts.get(responseCardId) !== 1
      || proof.semantics !== "PROVEN" || proof.counterRelation !== "BLOCKS_TARGET_EFFECT"
      || rootEvent.type !== "card" || rootEvent.presentation === false || rootEvent.action !== "play" || rootEvent.playedAs !== undefined
      || rootCard?.kind !== "Attack" || !rootCardId || cardIdCounts.get(rootCardId) !== 1
      || rootEvent.resolutionId !== rootResolutionId || responseResolutionId !== rootResolutionId
      || rootEventId === eventId || !rootResolutionId || !interactionId || !rootFrameId
      || !rootSourceId || !targetId || rootSourceId === targetId || responseActorId !== targetId
      || proof.rootCardKind !== "Attack" || proof.responseCardKind !== "Dodge") return [];
    return [{
      semantics: "PROVEN",
      counterRelation: "BLOCKS_TARGET_EFFECT",
      interactionId,
      rootFrameId,
      rootEventId,
      rootResolutionId,
      rootSourceId,
      targetId,
      responseActorId,
      rootCardKind: "Attack",
      responseCardKind: "Dodge",
      responseEventId: eventId,
      responseResolutionId,
    }];
  });
}

function duelExchangeFor(
  envelope: CausalEnvelope | null,
  scene: PresentationInteractionScene | null,
  pending: unknown,
  timeline: readonly PresentationV2Event[],
): PresentationDuelExchange | null {
  const item = record(pending);
  const continuation = record(item?.continuation);
  const causal = record(item?.causal);
  const continuationCausal = record(continuation?.causal);
  const sourceId = stringValue(continuation?.sourceId);
  const targetId = stringValue(continuation?.targetId);
  const currentOpponentId = stringValue(continuation?.opponentId);
  const responseCount = continuation?.attackResponseCount;
  const rootCards = Array.isArray(continuation?.damageCards)
    ? continuation.damageCards.map(record).filter((card): card is RecordLike => Boolean(card))
    : [];
  const rootCardsOfDuelKind = rootCards.filter((card) => card.kind === "Duel" && stringValue(card.id));
  const frame = envelope?.frames.find(({ frameId }) => frameId === envelope.activeFrameId) ?? null;
  const rootFrames = envelope?.frames.filter(({ parentFrameId }) => parentFrameId == null) ?? [];

  if (item?.kind !== "response" || continuation?.kind !== "duel"
    || !envelope || !frame || rootFrames.length !== 1 || frame.frameId !== rootFrames[0].frameId
    || frame.stage !== "DUEL_EXCHANGE" || envelope.checkpoint.frameId !== frame.frameId
    || envelope.checkpoint.stage !== "DUEL_EXCHANGE"
    || !Number.isSafeInteger(responseCount) || (responseCount as number) < 0
    || !sourceId || !targetId || sourceId === targetId || !currentOpponentId
    || !causal || causal.interactionId !== envelope.interactionId || causal.frameId !== frame.frameId
    || !continuationCausal || continuationCausal.interactionId !== envelope.interactionId || continuationCausal.frameId !== frame.frameId
    || !scene || scene.semantics !== "PROVEN" || scene.stage !== "DUEL_EXCHANGE"
    || scene.continuity.relation !== "ROOT_FRAME" || scene.rootFrameId !== frame.frameId || scene.activeFrameId !== frame.frameId
    || scene.interactionId !== envelope.interactionId || scene.sourceId !== sourceId || scene.activeSourceId !== sourceId
    || scene.effect?.toLowerCase() !== "duel"
    || frame.origin.originSourceId !== sourceId || frame.origin.originEffect.toLowerCase() !== "duel"
    || frame.origin.originalTargetIds.length !== 2 || !frame.origin.originalTargetIds.includes(targetId) || !frame.origin.originalTargetIds.includes(sourceId)
    || frame.current.currentSourceId !== sourceId || frame.current.currentEffect.toLowerCase() !== "duel"
    || frame.current.currentTargetIds.length !== 2
    || frame.current.currentTargetIds[0] !== scene.currentParticipantId
    || frame.current.currentTargetIds[1] !== currentOpponentId
    || frame.current.resolvingPlayerId !== scene.currentParticipantId
    || !scene.currentParticipantId || ![sourceId, targetId].includes(scene.currentParticipantId)
    || currentOpponentId !== (scene.currentParticipantId === sourceId ? targetId : sourceId)
    || scene.activeTargetIds.length !== frame.current.currentTargetIds.length
    || scene.activeTargetIds.some((id, index) => id !== frame.current.currentTargetIds[index])
    || scene.decisionActorId !== scene.currentParticipantId
    || scene.participantRoles.sourceId !== sourceId
    || !scene.participantRoles.originalTargetIds.includes(targetId) || !scene.participantRoles.originalTargetIds.includes(sourceId)
    || scene.participantRoles.currentParticipantId !== scene.currentParticipantId
    || scene.participantRoles.decisionActorId !== scene.currentParticipantId
    || rootCardsOfDuelKind.length !== 1
    || rootCards.length !== 1) return null;

  const rootCardId = stringValue(rootCardsOfDuelKind[0].id);
  if (!rootCardId) return null;
  const rootMatches = timeline.filter((event) => eventCardIds(event).includes(rootCardId));
  if (rootMatches.length !== 1) return null;
  const rootEvent = rootMatches[0];
  const rootCard = record(rootEvent.card);
  const rootResolutionId = stringValue(rootEvent.resolutionId);
  if (!rootResolutionId || !stringValue(rootEvent.id)
    || rootEvent.type !== "card" || rootEvent.presentation === false || rootEvent.action !== "play"
    || rootEvent.playedAs !== undefined || rootCard?.id !== rootCardId || rootCard.kind !== "Duel") return null;

  const eventIdCounts = new Map<string, number>();
  for (const event of timeline) {
    const eventId = stringValue(event.id);
    if (eventId) eventIdCounts.set(eventId, (eventIdCounts.get(eventId) ?? 0) + 1);
  }
  const candidateResponses = timeline.flatMap((event) => {
    const proof = record(event.duelAttackResponse);
    return proof && (proof.interactionId === envelope.interactionId || proof.rootEventId === rootEvent.id)
      ? [{ event, proof }]
      : [];
  });
  if (candidateResponses.length !== responseCount) return null;

  const responses: PresentationDuelAttackResponse[] = [];
  const responseEventIds = new Set<string>();
  const responseOrdinals = new Set<number>();
  for (const { event, proof } of candidateResponses) {
    const eventId = stringValue(event.id);
    const resolutionId = stringValue(event.resolutionId);
    const interactionId = stringValue(proof.interactionId);
    const rootFrameId = stringValue(proof.rootFrameId);
    const rootEventId = stringValue(proof.rootEventId);
    const proofRootResolutionId = stringValue(proof.rootResolutionId);
    const proofRootSourceId = stringValue(proof.rootSourceId);
    const proofRootTargetId = stringValue(proof.rootTargetId);
    const ordinal = proof.ordinal;
    const responseSourceId = stringValue(proof.sourceId);
    const responseTargetId = stringValue(proof.targetId);
    const decisionActorId = stringValue(proof.decisionActorId);
    const responseActorId = stringValue(proof.responseActorId);
    const responseCards = event.type === "card"
      ? [record(event.card)]
      : event.type === "cards" && Array.isArray(event.cards)
        ? event.cards.map(record)
        : [];
    const eventIsAttackResponse = (event.type === "card" || event.type === "cards")
      ? event.action === "play" && (event.playedAs === "attack" || responseCards.length > 0 && responseCards.every((card) => card?.kind === "Attack"))
      : event.type === "message" && event.effectNotice === true;
    if (!eventId || eventIdCounts.get(eventId) !== 1 || eventId === rootEvent.id
      || !resolutionId || resolutionId !== rootResolutionId || event.presentation === false || !eventIsAttackResponse
      || proof.semantics !== "PROVEN" || proof.relation !== "DUEL_EXCHANGE"
      || interactionId !== envelope.interactionId || rootFrameId !== frame.frameId
      || rootEventId !== rootEvent.id || proofRootResolutionId !== rootResolutionId
      || proofRootSourceId !== sourceId || proofRootTargetId !== targetId
      || !Number.isSafeInteger(ordinal) || (ordinal as number) < 1 || (ordinal as number) > responseCount
      || !responseSourceId || !responseTargetId || responseSourceId === responseTargetId
      || !decisionActorId || ![sourceId, targetId].includes(decisionActorId)
      || ![sourceId, targetId].includes(responseSourceId) || ![sourceId, targetId].includes(responseTargetId)
      || responseSourceId !== decisionActorId || !responseActorId
      || proof.responseCardKind !== "Attack"
      || responseEventIds.has(eventId) || responseOrdinals.has(ordinal as number)) return null;
    responseEventIds.add(eventId);
    responseOrdinals.add(ordinal as number);
    responses.push({
      semantics: "PROVEN",
      relation: "DUEL_EXCHANGE",
      interactionId,
      rootFrameId,
      rootEventId,
      rootResolutionId,
      rootSourceId: proofRootSourceId,
      rootTargetId: proofRootTargetId,
      ordinal: ordinal as number,
      sourceId: responseSourceId,
      targetId: responseTargetId,
      decisionActorId,
      responseActorId,
      responseCardKind: "Attack",
      responseEventId: eventId,
      responseResolutionId: resolutionId,
    });
  }
  responses.sort((left, right) => left.ordinal - right.ordinal);
  if (responses.some((response, index) => response.ordinal !== index + 1)) return null;

  return {
    semantics: "PROVEN",
    interactionId: envelope.interactionId,
    rootFrameId: frame.frameId,
    checkpointId: envelope.checkpoint.checkpointId,
    presentationRevision: envelope.presentationRevision,
    root: { eventId: rootEvent.id, resolutionId: rootResolutionId, sourceId, targetId, cardKind: "Duel" },
    responseCount: responseCount as number,
    responses,
    currentParticipantId: scene.currentParticipantId,
    decisionActorId: scene.decisionActorId,
  };
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
  const rootAction = singleTargetAttackRootActionFor(envelope, interactionScene, input.pending, root, rootEvent)
    ?? singleTargetTargetCardRootActionFor(envelope, interactionScene, input.pending, input.timeline, "Dismantle")
    ?? singleTargetTargetCardRootActionFor(envelope, interactionScene, input.pending, input.timeline, "Steal");
  const skillEffectAction = skillEffectActionFor(input);
  const skillEffectSettlements = skillEffectSettlementsFor(input);
  const duelExchange = duelExchangeFor(envelope, interactionScene, input.pending, input.timeline);
  const selfTargetActions = selfTargetActionsFor(input.timeline);
  const attackDodgeResponses = attackDodgeResponsesFor(input.timeline);
  const projectedBumperHarvestProgress = bumperHarvestProgressFor(envelope, input.pending, interactionScene, input.timeline);
  const projectedGroupParticipantProgress = groupParticipantProgress(envelope, group, groupValues, interactionScene);
  const dyingBarrier = dyingBarrierFor(envelope, input.pending);
  const reactionChain = reactionChainFor(input.timeline, envelope, input.pending, interactionScene, projectedBumperHarvestProgress, groupValues, projectedGroupParticipantProgress);
  const oathRecipientScope = oathRecipientScopeFor(input.pending, envelope, interactionScene, input.oathRecipientIds, input.timeline, reactionChain);
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
    rootAction,
    skillEffectAction,
    skillEffectSettlements,
    duelExchange,
    selfTargetActions,
    dyingBarrier,
    reactionChain,
    negationSettlement,
    ...(attackDodgeResponses.length ? { attackDodgeResponses } : {}),
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
