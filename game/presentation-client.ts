import { isGroupParticipantProgressOutcomeAllowed, type GroupParticipantProgressStatus, type HarvestParticipantProgressStatus } from "./pending";
import { CARD_KINDS, type CardKind } from "./model";
import { CARD_DEFINITIONS } from "./cards";
import { provenSelfTargetActions, type PresentationSnapshot, type PresentationSnapshotBumperHarvestProgress, type PresentationSnapshotGroupParticipantProgress, type PresentationSnapshotGroupProgress, type PresentationSnapshotOathRecipientScope, type PresentationSnapshotRootAction, type PresentationSnapshotSelfTargetAction } from "./presentation-snapshot";
import type {
  InteractionSceneContinuity,
  PresentationInteractionScene,
  PresentationStableBoundaryKind,
} from "./presentation-v2";

export type PresentationClientView = {
  hasInteraction: boolean;
  interactionId: string | null;
  checkpointId: string | null;
  presentationRevision: number | null;
  rootFrameId: string | null;
  activeFrameId: string | null;
  stage: PresentationInteractionScene["stage"];
  effect: string | null;
  sourceId: string | null;
  originalTargetIds: readonly string[];
  activeTargetIds: readonly string[];
  currentParticipantId: string | null;
  decisionActorId: string | null;
  activeResolverId: string | null;
  participantIds: readonly string[];
  groupResolution: PresentationSnapshotGroupProgress | null;
  groupParticipantProgress: readonly PresentationSnapshotGroupParticipantProgress[];
  oathRecipientScope: PresentationSnapshotOathRecipientScope | null;
  bumperHarvestProgress: PresentationSnapshotBumperHarvestProgress | null;
  reactionChain: PresentationSnapshot["reactionChain"];
  rootAction: PresentationSnapshotRootAction | null;
  selfTargetActions: readonly PresentationSnapshotSelfTargetAction[];
  negationSettlement?: PresentationSnapshot["settlement"];
  rootOrigin?: NonNullable<PresentationInteractionScene["rootOrigin"]>;
  continuity: InteractionSceneContinuity;
  parentFrameId: string | null;
  stableKind: PresentationStableBoundaryKind;
  isLocalDecisionActor: boolean;
  hasLocalControl: boolean;
  localActionRevision: string | null;
};

export type PresentationDecisionStatus = {
  hasInteraction: boolean;
  stableKind: PresentationStableBoundaryKind;
  stage: PresentationInteractionScene["stage"];
  sourceId: string | null;
  currentParticipantId: string | null;
  decisionActorId: string | null;
  activeResolverId: string | null;
  isDecision: boolean;
  isLocalDecisionActor: boolean;
  hasLocalControl: boolean;
};

export type PresentationDisplayIdentity = {
  id: string | null;
  name: string;
  known: boolean;
};

export type InteractionStageView = {
  visible: boolean;
  interactionId: string | null;
  rootFrameId: string | null;
  activeFrameId: string | null;
  checkpointId: string | null;
  presentationRevision: number | null;
  stage: PresentationInteractionScene["stage"];
  stageLabel: string;
  effect: string | null;
  source: PresentationDisplayIdentity;
  originalTargets: readonly PresentationDisplayIdentity[];
  activeTargets: readonly PresentationDisplayIdentity[];
  currentParticipant: PresentationDisplayIdentity;
  decisionActor: PresentationDisplayIdentity;
  activeResolver: PresentationDisplayIdentity;
  groupCardKind: PresentationSnapshotGroupProgress["cardKind"] | null;
  groupParticipantProgress: readonly PresentationSnapshotGroupParticipantProgress[];
  orderedTargetProgress: readonly PresentationSnapshotGroupParticipantProgress[];
  bumperHarvestProgress: PresentationSnapshotBumperHarvestProgress | null;
  reactionChainNegationNodes: readonly ReactionChainNegationNodeView[];
  reactionChainRootCard: NonNullable<PresentationSnapshot["reactionChain"]>["rootCard"];
  rootOrigin?: {
    frameId: string;
    stage: PresentationInteractionScene["stage"];
    source: PresentationDisplayIdentity;
    effect: string;
    targets: readonly PresentationDisplayIdentity[];
  };
  continuity: InteractionSceneContinuity;
  parentFrameId: string | null;
  stableKind: PresentationStableBoundaryKind;
  isViewerDecisionActor: boolean;
};

export type InteractionStageDisplayModel = {
  visible: boolean;
  focusLabel: string;
  source: PresentationDisplayIdentity;
  focusTarget: PresentationDisplayIdentity;
  currentParticipantPresentedInHeroFocus: boolean;
  targetSummary: string;
  activeScopeSummary: string | null;
  showDecision: boolean;
  decisionActor: PresentationDisplayIdentity;
  isViewerDecisionActor: boolean;
  showResolver: boolean;
  activeResolver: PresentationDisplayIdentity;
  showOriginalTargets: boolean;
  originalTargetSummary: string;
  nestedContext: string | null;
};

export type ReactionChainView = {
  visible: boolean;
  interactionId: string | null;
  negationNodes: readonly ReactionChainNegationNodeView[];
  root: {
    effect: string;
    cardKind: CardKind | null;
    source: PresentationDisplayIdentity;
    targets: readonly PresentationDisplayIdentity[];
  } | null;
  active: {
    label: string;
    decisionActor: PresentationDisplayIdentity;
    activeResolver: PresentationDisplayIdentity;
    relation: InteractionSceneContinuity["relation"];
  } | null;
};

export type ReactionChainNegationNodeView = {
  actor: PresentationDisplayIdentity;
  cardKind: "Negation";
};

export type DyingHandoffView = {
  visible: boolean;
  dyingPlayer: PresentationDisplayIdentity;
  decisionActor: PresentationDisplayIdentity;
  activeResolver: PresentationDisplayIdentity;
  statusLabel: string;
  guidance: string;
  continuity: InteractionSceneContinuity;
  parentFrameId: string | null;
};

export type InteractionSeatSemanticRoles = {
  isInteractionSource: boolean;
  isOriginalTarget: boolean;
  isActiveTarget: boolean;
  isCurrentParticipant: boolean;
  isDecisionActor: boolean;
  isActiveResolver: boolean;
  isViewerDecisionActor: boolean;
};

export type PresentationPlayerNameResolver = (playerId: string) => string | null | undefined;

const REST_CONTINUITY: InteractionSceneContinuity = {
  relation: "UNPROVEN",
  parentFrameId: null,
};

function restView(snapshot: PresentationSnapshot | null, meId: string | null): PresentationClientView {
  const localControl = snapshot?.localControl;
  const hasLocalControl = Boolean(localControl?.entitled && localControl.actorId && localControl.actorId === meId);
  const settlement = snapshot?.settlement ?? null;
  const negationSettlement = validNegationSettlement(settlement)
    ? settlement
    : null;
  return {
    hasInteraction: false,
    interactionId: null,
    checkpointId: null,
    presentationRevision: null,
    rootFrameId: null,
    activeFrameId: null,
    stage: null,
    effect: null,
    sourceId: null,
    originalTargetIds: [],
    activeTargetIds: [],
    currentParticipantId: null,
    decisionActorId: null,
    activeResolverId: null,
    participantIds: [],
    groupResolution: null,
    groupParticipantProgress: [],
    oathRecipientScope: null,
    bumperHarvestProgress: null,
    reactionChain: null,
    rootAction: null,
    selfTargetActions: provenSelfTargetActions(snapshot?.selfTargetActions),
    ...(negationSettlement ? { negationSettlement } : {}),
    continuity: REST_CONTINUITY,
    parentFrameId: null,
    stableKind: "REST",
    isLocalDecisionActor: hasLocalControl,
    hasLocalControl,
    localActionRevision: localControl?.actionRevision ?? null,
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

const SINGLE_TARGET_NEGATION_ROOT_KINDS = new Set<CardKind>([
  "DrawTwo", "Dismantle", "Steal", "Duel", "Overindulgence", "Lightning", "RationsDepleted", "BorrowedSword",
]);

function validNegationSettlement(value: unknown): value is NonNullable<PresentationSnapshot["settlement"]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const settlement = value as Partial<NonNullable<PresentationSnapshot["settlement"]>>;
  return settlement.semantics === "PROVEN"
    && (settlement.outcome === "ROOT_CANCELLED" || settlement.outcome === "ROOT_RESTORED")
    && isString(settlement.eventId)
    && isString(settlement.interactionId)
    && isString(settlement.rootFrameId)
    && isString(settlement.checkpointId)
    && isInteger(settlement.presentationRevision)
    && isString(settlement.resolutionId)
    && typeof settlement.rootCardKind === "string"
    && CARD_KINDS.includes(settlement.rootCardKind as CardKind)
    && SINGLE_TARGET_NEGATION_ROOT_KINDS.has(settlement.rootCardKind as CardKind)
    && isString(settlement.sourceId)
    && isString(settlement.targetId);
}

function negationSettlementForScene(
  snapshot: PresentationSnapshot,
  scene: PresentationInteractionScene,
): PresentationSnapshot["settlement"] {
  const settlement = snapshot.settlement;
  if (!validNegationSettlement(settlement)
    || settlement.interactionId !== scene.interactionId
    || settlement.rootFrameId !== scene.rootFrameId
    || settlement.rootFrameId !== scene.activeFrameId
    || scene.continuity.relation !== "ROOT_FRAME"
    || settlement.presentationRevision > scene.presentationRevision
    || settlement.sourceId !== scene.participantRoles.sourceId
    || scene.participantRoles.originalTargetIds.length !== 1
    || settlement.targetId !== scene.participantRoles.originalTargetIds[0]) return null;
  return settlement;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isString);
}

function reactionChainForSnapshot(
  snapshot: PresentationSnapshot,
  scene: PresentationInteractionScene,
): PresentationSnapshot["reactionChain"] {
  const chain = snapshot.reactionChain;
  const identity = snapshot.identity;
  if (!chain || !identity || scene.stage !== "NEGATION" || chain.semantics !== "PROVEN"
    || chain.interactionId !== identity.interactionId || chain.interactionId !== scene.interactionId
    || chain.frameId !== scene.activeFrameId || !Array.isArray(chain.nodes)) return null;

  const nodes: NonNullable<PresentationSnapshot["reactionChain"]>["nodes"][number][] = [];
  const nodeIds = new Set<string>();
  let previousNodeId: string | null = null;
  for (const value of chain.nodes) {
    if (!value || typeof value !== "object") return null;
    const node = value as NonNullable<PresentationSnapshot["reactionChain"]>["nodes"][number];
    if (!isString(node.nodeId) || node.interactionId !== identity.interactionId || node.frameId !== scene.activeFrameId
      || node.causedByNodeId !== previousNodeId || !isString(node.actorId)
      || node.kind !== "CARD_PLAY" || node.object?.type !== "card" || node.object.cardKind !== "Negation"
      || nodeIds.has(node.nodeId)) return null;
    nodeIds.add(node.nodeId);
    previousNodeId = node.nodeId;
    nodes.push({
      nodeId: node.nodeId,
      interactionId: node.interactionId,
      frameId: node.frameId,
      causedByNodeId: node.causedByNodeId,
      actorId: node.actorId,
      kind: "CARD_PLAY",
      object: { type: "card", cardKind: "Negation" },
    });
  }
  const rawRootCard: unknown = (chain as { rootCard?: unknown }).rootCard;
  let rootCard: NonNullable<PresentationSnapshot["reactionChain"]>["rootCard"] = null;
  if (rawRootCard && typeof rawRootCard === "object" && !Array.isArray(rawRootCard)) {
    const candidate = rawRootCard as Record<string, unknown>;
    const targetId = scene.targetIds.length === 1 ? scene.targetIds[0] : null;
    if (candidate.interactionId === identity.interactionId
      && candidate.frameId === scene.rootFrameId && candidate.frameId === scene.activeFrameId
      && scene.rootFrameId === scene.activeFrameId && scene.continuity.relation === "ROOT_FRAME"
      && typeof candidate.sourceId === "string" && candidate.sourceId === scene.sourceId && candidate.sourceId === scene.activeSourceId
      && typeof candidate.targetId === "string" && candidate.targetId === targetId
      && scene.activeTargetIds.length === 1 && scene.activeTargetIds[0] === targetId
      && typeof candidate.cardKind === "string" && CARD_KINDS.includes(candidate.cardKind as CardKind)) {
      rootCard = {
        interactionId: identity.interactionId,
        frameId: scene.activeFrameId as string,
        sourceId: candidate.sourceId,
        targetId: candidate.targetId,
        cardKind: candidate.cardKind as CardKind,
      };
    }
  }
  return { semantics: "PROVEN", interactionId: identity.interactionId, frameId: scene.activeFrameId, rootCard, nodes };
}

function groupProgressForSnapshot(
  snapshot: PresentationSnapshot,
  scene: PresentationInteractionScene,
): PresentationSnapshotGroupProgress | null {
  const progress = snapshot.groupParticipantProgress;
  const identity = snapshot.identity;
  if (!progress || !identity || !Array.isArray(progress.targetIds) || !Array.isArray(progress.participants)) return null;
  const resolutionSemantics = progress.resolutionSemantics;
  if ((progress.cardKind !== "BarbarianInvasion" && progress.cardKind !== "RainingArrows" && progress.cardKind !== "SkyPiercingHalberdAttack")
    || (resolutionSemantics !== "GROUP" && resolutionSemantics !== "ORDERED")
    || progress.interactionId !== identity.interactionId
    || progress.groupFrameId !== scene.rootFrameId
    || progress.activeFrameId !== scene.activeFrameId
    || progress.checkpointId !== identity.checkpointId
    || progress.presentationRevision !== identity.presentationRevision
    || progress.currentParticipantId !== scene.currentParticipantId
    || !isStringArray(progress.targetIds)
    || !isStringArray(scene.targetIds)
    || !sameStringIds(progress.targetIds, scene.targetIds)
    || !sameStringIds(scene.participantRoles.originalTargetIds, scene.targetIds)
    || progress.participants.length !== scene.targetIds.length) return null;

  const validStatuses = new Set<GroupParticipantProgressStatus>(["PENDING", "CURRENT", "PAUSED", "RESOLVED", "NO_LONGER_APPLICABLE"]);
  const participants: PresentationSnapshotGroupParticipantProgress[] = [];
  for (let index = 0; index < scene.targetIds.length; index++) {
    const participant = progress.participants[index];
    if (!participant || participant.playerId !== scene.targetIds[index] || participant.order !== index + 1 || !validStatuses.has(participant.status)) return null;
    if (participant.outcome !== undefined && !isGroupParticipantProgressOutcomeAllowed(progress.cardKind, resolutionSemantics, participant.status, participant.outcome)) return null;
    participants.push({ playerId: participant.playerId, order: participant.order, status: participant.status, ...(participant.outcome === "AVOIDED" || participant.outcome === "DAMAGED" || participant.outcome === "NEGATED" || participant.outcome === "DEFEATED" ? { outcome: participant.outcome } : {}) });
  }

  const active = participants.filter(({ status }) => status === "CURRENT" || status === "PAUSED");
  if (active.length !== 1 || active[0]?.playerId !== progress.currentParticipantId) return null;
  if (progress.activeFrameId === progress.groupFrameId) {
    if (active[0].status !== "CURRENT") return null;
  } else if (active[0].status !== "PAUSED" || scene.continuity.relation !== "CHILD_FRAME") {
    return null;
  }
  return { ...progress, targetIds: [...progress.targetIds], participants };
}

function oathRecipientScopeForSnapshot(
  snapshot: PresentationSnapshot,
  scene: PresentationInteractionScene,
): PresentationSnapshotOathRecipientScope | null {
  const scope = snapshot.oathRecipientScope;
  const identity = snapshot.identity;
  if (!scope || !identity || scope.semantics !== "PROVEN" || scope.cardKind !== "Oath"
    || scene.stage !== "NEGATION" || !isString(scene.sourceId)
    || scope.interactionId !== identity.interactionId || scope.interactionId !== scene.interactionId
    || scope.rootFrameId !== scene.rootFrameId || scope.activeFrameId !== scene.activeFrameId
    || scope.checkpointId !== identity.checkpointId || scope.presentationRevision !== identity.presentationRevision
    || scope.sourceId !== scene.sourceId || scope.sourceId !== scene.participantRoles.sourceId
    || !Array.isArray(scope.recipientIds)) return null;
  const seen = new Set<string>();
  for (const recipientId of scope.recipientIds) {
    if (!isString(recipientId) || seen.has(recipientId)) return null;
    seen.add(recipientId);
  }
  return { ...scope, recipientIds: [...scope.recipientIds] };
}

function bumperHarvestProgressForSnapshot(
  snapshot: PresentationSnapshot,
  scene: PresentationInteractionScene,
): PresentationSnapshotBumperHarvestProgress | null {
  const progress = snapshot.bumperHarvestProgress;
  const identity = snapshot.identity;
  if (!progress || !identity || progress.semantics !== "PROVEN"
    || !isStringArray(progress.targetIds) || !Array.isArray(progress.participants)
    || progress.interactionId !== identity.interactionId || progress.interactionId !== scene.interactionId
    || progress.rootFrameId !== scene.rootFrameId || progress.activeFrameId !== scene.activeFrameId
    || progress.checkpointId !== identity.checkpointId || progress.presentationRevision !== identity.presentationRevision
    || progress.sourceId !== scene.sourceId || !progress.targetIds.length
    || new Set(progress.targetIds).size !== progress.targetIds.length
    || progress.participants.length !== progress.targetIds.length) return null;
  const rootRelation = scene.continuity.relation === "ROOT_FRAME" && progress.activeFrameId === progress.rootFrameId;
  const childRelation = scene.continuity.relation === "CHILD_FRAME" && progress.activeFrameId !== progress.rootFrameId;
  const semanticTargets = rootRelation ? scene.targetIds : scene.rootOrigin?.targetIds;
  if ((!rootRelation && !childRelation) || !semanticTargets || !sameStringIds(progress.targetIds, semanticTargets)) return null;
  if (rootRelation && scene.stage !== "SEQUENTIAL_CHOICE"
    || childRelation && (scene.stage !== "NEGATION" || !scene.rootOrigin
      || scene.rootOrigin.frameId !== progress.rootFrameId || scene.rootOrigin.effect !== "BumperHarvest"
      || scene.decisionActorId !== null || scene.activeResolverId !== null)) return null;

  const validStatuses = new Set<HarvestParticipantProgressStatus>(["PENDING", "CURRENT", "RESOLVED", "NO_LONGER_APPLICABLE"]);
  const participants: PresentationSnapshotBumperHarvestProgress["participants"][number][] = [];
  for (let index = 0; index < progress.targetIds.length; index++) {
    const participant = progress.participants[index];
    if (!participant || participant.playerId !== progress.targetIds[index] || participant.order !== index + 1
      || !validStatuses.has(participant.status)) return null;
    if (participant.status === "RESOLVED") {
      if (participant.outcome !== "CHOSE_CARD" && participant.outcome !== "NEGATED") return null;
    } else if (participant.outcome !== undefined) return null;
    participants.push({ playerId: participant.playerId, order: index + 1, status: participant.status, ...(participant.outcome === "CHOSE_CARD" || participant.outcome === "NEGATED" ? { outcome: participant.outcome } : {}) });
  }
  const current = participants.filter(({ status }) => status === "CURRENT");
  if (progress.currentParticipantId === null) {
    if (current.length || snapshot.stable.kind !== "SPECIAL" || childRelation || scene.currentParticipantId !== null) return null;
  } else if (current.length !== 1 || current[0].playerId !== progress.currentParticipantId
    || scene.currentParticipantId !== progress.currentParticipantId) return null;
  if (rootRelation && progress.currentParticipantId
    && (snapshot.stable.kind !== "CHOICE" || snapshot.stable.decisionActorId !== progress.currentParticipantId)) return null;
  if (childRelation && snapshot.stable.kind !== "SPECIAL") return null;
  return { ...progress, targetIds: [...progress.targetIds], participants };
}

function sameStringIds(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function presentationStageLabel(stage: PresentationInteractionScene["stage"]): string {
  if (!stage) return "Active interaction";
  return stage.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ");
}

function displayIdentity(
  id: string | null,
  fallback: string,
  resolvePlayerName: PresentationPlayerNameResolver,
): PresentationDisplayIdentity {
  const resolved = id ? resolvePlayerName(id)?.trim() : "";
  return { id, name: resolved || fallback, known: Boolean(resolved) };
}

function isContinuity(value: unknown): value is InteractionSceneContinuity {
  if (!value || typeof value !== "object") return false;
  const continuity = value as Partial<InteractionSceneContinuity>;
  return (continuity.relation === "UNPROVEN"
    || continuity.relation === "ROOT_FRAME"
    || continuity.relation === "SAME_FRAME"
    || continuity.relation === "CHILD_FRAME")
    && (continuity.parentFrameId === null || isString(continuity.parentFrameId));
}

function isRootOrigin(value: unknown, scene: PresentationInteractionScene): value is NonNullable<PresentationInteractionScene["rootOrigin"]> {
  if (!value || typeof value !== "object") return false;
  const origin = value as Partial<NonNullable<PresentationInteractionScene["rootOrigin"]>>;
  return scene.continuity.relation === "CHILD_FRAME"
    && isString(scene.rootFrameId)
    && origin.frameId === scene.rootFrameId
    && origin.frameId !== scene.activeFrameId
    && isString(origin.stage)
    && (origin.sourceId === null || isString(origin.sourceId))
    && isString(origin.effect)
    && isStringArray(origin.targetIds);
}

/**
 * The adapter only consumes the typed snapshot authority. It deliberately
 * does not accept room compatibility fields, CurrentAction payloads, or
 * timeline data as inputs or fallbacks.
 */
function isCoherentSnapshot(snapshot: PresentationSnapshot | null): snapshot is PresentationSnapshot {
  if (!snapshot || typeof snapshot !== "object") return false;
  const identity = snapshot.identity;
  const scene = snapshot.interaction;
  const stable = snapshot.stable;
  if (!identity || !scene || scene.semantics !== "PROVEN" || !stable) return false;
  if (!isString(identity.interactionId) || !isString(identity.checkpointId) || !isInteger(identity.presentationRevision)) return false;
  if (scene.interactionId !== identity.interactionId
    || scene.checkpointId !== identity.checkpointId
    || scene.presentationRevision !== identity.presentationRevision
    || !isString(scene.activeFrameId)
    || !isString(scene.rootFrameId)
    || !isString(scene.stage)
    || !isStringArray(scene.targetIds)
    || !isStringArray(scene.activeTargetIds)
    || !isStringArray(scene.participantIds)
    || !isContinuity(scene.continuity)) return false;
  if (scene.rootOrigin !== undefined && scene.rootOrigin !== null && !isRootOrigin(scene.rootOrigin, scene)) return false;
  if (stable.kind === "REST" || stable.kind === "SETTLEMENT"
    || stable.interactionId !== identity.interactionId
    || stable.checkpointId !== identity.checkpointId
    || stable.presentationRevision !== identity.presentationRevision) return false;
  if (stable.kind === "CHOICE" && stable.decisionActorId !== scene.decisionActorId) return false;
  if (stable.kind !== "CHOICE" && stable.decisionActorId !== null) return false;
  const roles = scene.participantRoles;
  return Boolean(roles)
    && (roles.sourceId === null || isString(roles.sourceId))
    && isStringArray(roles.originalTargetIds)
    && isStringArray(roles.activeTargetIds)
    && (roles.currentParticipantId === null || isString(roles.currentParticipantId))
    && (roles.decisionActorId === null || isString(roles.decisionActorId))
    && (roles.activeResolverId === null || isString(roles.activeResolverId))
    && isStringArray(roles.participantIds);
}

function rootActionForSnapshot(
  snapshot: PresentationSnapshot,
  scene: PresentationInteractionScene,
): PresentationSnapshotRootAction | null {
  const action = snapshot.rootAction;
  const identity = snapshot.identity;
  if (!action || !identity || action.semantics !== "PROVEN" || action.action !== "ATTACK"
    || snapshot.stable.kind !== "CHOICE"
    || action.interactionId !== identity.interactionId || action.interactionId !== scene.interactionId
    || action.rootFrameId !== scene.rootFrameId || action.activeFrameId !== scene.activeFrameId
    || action.checkpointId !== identity.checkpointId || action.presentationRevision !== identity.presentationRevision
    || !isString(action.rootEventId)
    || scene.continuity.relation !== "ROOT_FRAME" || scene.rootFrameId !== scene.activeFrameId
    || scene.stage !== "ATTACK_RESPONSE"
    || !isString(action.sourceId) || action.sourceId === action.targetId
    || action.sourceId !== scene.sourceId || action.sourceId !== scene.activeSourceId
    || !isString(action.targetId) || scene.targetIds.length !== 1 || scene.targetIds[0] !== action.targetId
    || scene.activeTargetIds.length !== 1 || scene.activeTargetIds[0] !== action.targetId
    || scene.currentParticipantId !== action.targetId
    || scene.participantRoles.sourceId !== action.sourceId
    || scene.participantRoles.originalTargetIds.length !== 1 || scene.participantRoles.originalTargetIds[0] !== action.targetId
    || scene.participantRoles.activeTargetIds.length !== 1 || scene.participantRoles.activeTargetIds[0] !== action.targetId
    || scene.participantRoles.currentParticipantId !== action.targetId
    || scene.participantRoles.decisionActorId !== action.targetId || scene.participantRoles.activeResolverId !== action.targetId
    || scene.decisionActorId !== action.targetId || scene.activeResolverId !== action.targetId
    || !CARD_KINDS.includes(action.cardKind)) return null;
  return {
    semantics: "PROVEN",
    interactionId: identity.interactionId,
    rootFrameId: action.rootFrameId,
    activeFrameId: action.activeFrameId,
    checkpointId: identity.checkpointId,
    presentationRevision: identity.presentationRevision,
    rootEventId: action.rootEventId,
    action: action.action,
    sourceId: action.sourceId,
    targetId: action.targetId,
    cardKind: action.cardKind,
  };
}

export function buildPresentationClientView(
  snapshot: PresentationSnapshot | null,
  meId: string | null,
): PresentationClientView {
  if (!isCoherentSnapshot(snapshot)) return restView(snapshot, meId);

  const scene = snapshot.interaction;
  const roles = scene.participantRoles;
  const hasLocalControl = Boolean(snapshot.localControl.entitled
    && snapshot.localControl.actorId
    && snapshot.localControl.actorId === meId);
  const groupProgress = groupProgressForSnapshot(snapshot, scene);
  const oathScope = oathRecipientScopeForSnapshot(snapshot, scene);
  const bumperHarvestProgress = bumperHarvestProgressForSnapshot(snapshot, scene);
  const negationSettlement = negationSettlementForScene(snapshot, scene);
  const rootAction = rootActionForSnapshot(snapshot, scene);
  return {
    hasInteraction: true,
    interactionId: snapshot.identity?.interactionId ?? null,
    checkpointId: snapshot.identity?.checkpointId ?? null,
    presentationRevision: snapshot.identity?.presentationRevision ?? null,
    rootFrameId: scene.rootFrameId,
    activeFrameId: scene.activeFrameId,
    stage: scene.stage,
    effect: scene.effect,
    sourceId: roles.sourceId,
    originalTargetIds: [...roles.originalTargetIds],
    activeTargetIds: [...roles.activeTargetIds],
    currentParticipantId: roles.currentParticipantId,
    decisionActorId: snapshot.stable.decisionActorId,
    activeResolverId: roles.activeResolverId,
    participantIds: [...roles.participantIds],
    groupResolution: groupProgress,
    groupParticipantProgress: groupProgress?.resolutionSemantics === "GROUP" ? groupProgress.participants : [],
    oathRecipientScope: oathScope,
    bumperHarvestProgress,
    reactionChain: reactionChainForSnapshot(snapshot, scene),
    rootAction,
    selfTargetActions: provenSelfTargetActions(snapshot.selfTargetActions),
    ...(negationSettlement ? { negationSettlement } : {}),
    ...(scene.rootOrigin ? { rootOrigin: { ...scene.rootOrigin, targetIds: [...scene.rootOrigin.targetIds] } } : {}),
    continuity: { ...scene.continuity },
    parentFrameId: scene.parentFrameId,
    stableKind: snapshot.stable.kind,
    isLocalDecisionActor: hasLocalControl,
    hasLocalControl,
    localActionRevision: snapshot.localControl.actionRevision,
  };
}

/**
 * Pure semantic slice for the existing status strip. Display code may resolve
 * these IDs to names, but it must not replace decisionActorId with the active
 * resolver or rediscover ownership from compatibility room fields.
 */
export function buildPresentationDecisionStatus(view: PresentationClientView): PresentationDecisionStatus {
  const isDecision = view.hasInteraction && view.stableKind === "CHOICE" && Boolean(view.decisionActorId);
  return {
    hasInteraction: view.hasInteraction,
    stableKind: view.stableKind,
    stage: view.stage,
    sourceId: view.sourceId,
    currentParticipantId: view.currentParticipantId,
    decisionActorId: view.decisionActorId,
    activeResolverId: view.activeResolverId,
    isDecision,
    isLocalDecisionActor: isDecision && view.isLocalDecisionActor,
    hasLocalControl: view.hasLocalControl,
  };
}

/**
 * Project only the accepted public interaction roles onto one existing seat.
 * Local entitlement is used solely for the viewer marker on the decision
 * actor; every other role comes from the viewer-equal public client view.
 */
export function projectInteractionSeatRoles(
  view: PresentationClientView,
  playerId: string,
): InteractionSeatSemanticRoles {
  const visible = view.hasInteraction && Boolean(playerId);
  // NEGATION is an open response window: the current private scan/response
  // actor and resolver must not be disclosed through another player's seat.
  const namesPublicDecisionActor = view.stage !== "NEGATION";
  const isDecisionActor = visible && namesPublicDecisionActor && view.stableKind === "CHOICE" && view.decisionActorId === playerId;
  return {
    isInteractionSource: visible && view.sourceId === playerId,
    isOriginalTarget: visible && view.originalTargetIds.includes(playerId),
    isActiveTarget: visible && view.activeTargetIds.includes(playerId),
    isCurrentParticipant: visible && view.currentParticipantId === playerId,
    isDecisionActor,
    isActiveResolver: visible && namesPublicDecisionActor && view.activeResolverId === playerId,
    isViewerDecisionActor: isDecisionActor && view.isLocalDecisionActor,
  };
}

/**
 * Build the read-only Interaction Stage model. Public IDs are selected from
 * the adapter before names are resolved, and unknown names never substitute a
 * different participant or role.
 */
export function buildInteractionStageView(
  view: PresentationClientView,
  resolvePlayerName: PresentationPlayerNameResolver,
): InteractionStageView {
  const source = displayIdentity(view.sourceId, "Unknown source", resolvePlayerName);
  const originalTargets = view.originalTargetIds.map((id) => displayIdentity(id, "Unknown target", resolvePlayerName));
  const activeTargets = view.activeTargetIds.map((id) => displayIdentity(id, "Unknown target", resolvePlayerName));
  const currentParticipant = displayIdentity(view.currentParticipantId, "Unknown participant", resolvePlayerName);
  const decisionActor = displayIdentity(view.decisionActorId, "Unknown decision actor", resolvePlayerName);
  const activeResolver = displayIdentity(view.activeResolverId, "Unknown resolver", resolvePlayerName);
  return {
    visible: view.hasInteraction,
    interactionId: view.interactionId,
    rootFrameId: view.rootFrameId,
    activeFrameId: view.activeFrameId,
    checkpointId: view.checkpointId,
    presentationRevision: view.presentationRevision,
    stage: view.stage,
    stageLabel: presentationStageLabel(view.stage),
    effect: view.effect,
    source,
    originalTargets,
    activeTargets,
    currentParticipant,
    decisionActor,
    activeResolver,
    groupCardKind: view.groupResolution?.resolutionSemantics === "GROUP" ? view.groupResolution.cardKind : null,
    groupParticipantProgress: view.groupParticipantProgress.map((participant) => ({ ...participant })),
    orderedTargetProgress: view.groupResolution?.cardKind === "SkyPiercingHalberdAttack"
      && view.groupResolution.resolutionSemantics === "ORDERED"
      ? view.groupResolution.participants.map((participant) => ({ ...participant }))
      : [],
    bumperHarvestProgress: view.bumperHarvestProgress ? {
      ...view.bumperHarvestProgress,
      targetIds: [...view.bumperHarvestProgress.targetIds],
      participants: view.bumperHarvestProgress.participants.map((participant) => ({ ...participant })),
    } : null,
    reactionChainNegationNodes: view.stage === "NEGATION"
      ? (view.reactionChain?.nodes ?? []).map((node) => ({
        actor: displayIdentity(node.actorId, "Unknown player", resolvePlayerName),
        cardKind: "Negation" as const,
      }))
      : [],
    reactionChainRootCard: view.stage === "NEGATION" ? view.reactionChain?.rootCard ?? null : null,
    ...(view.rootOrigin ? {
      rootOrigin: {
        frameId: view.rootOrigin.frameId,
        stage: view.rootOrigin.stage,
        source: displayIdentity(view.rootOrigin.sourceId, "Unknown source", resolvePlayerName),
        effect: view.rootOrigin.effect,
        targets: view.rootOrigin.targetIds.map((id) => displayIdentity(id, "Unknown target", resolvePlayerName)),
      },
    } : {}),
    continuity: { ...view.continuity },
    parentFrameId: view.parentFrameId,
    stableKind: view.stableKind,
    isViewerDecisionActor: view.hasInteraction
      && view.stableKind === "CHOICE"
      && Boolean(view.decisionActorId)
      && view.isLocalDecisionActor,
  };
}

/**
 * The reaction chain is deliberately bounded to facts in the public typed
 * scene: a Negation root and its active response window. The snapshot does
 * not preserve an independently proven history for counter providers or
 * declines, so this model must not manufacture intermediate nodes from
 * timelines, compatibility fields, revisions, or CurrentAction.
 */
export function buildReactionChainView(stage: InteractionStageView): ReactionChainView {
  if (!stage.visible || stage.stage !== "NEGATION" || !stage.effect || !stage.source.id) {
    return { visible: false, interactionId: null, negationNodes: [], root: null, active: null };
  }
  return {
    visible: true,
    interactionId: stage.interactionId,
    negationNodes: stage.reactionChainNegationNodes.map((node) => ({ ...node, actor: { ...node.actor } })),
    root: {
      effect: stage.effect,
      cardKind: stage.reactionChainRootCard?.cardKind ?? null,
      source: stage.source,
      targets: stage.originalTargets,
    },
    active: {
      label: "Negation response",
      decisionActor: stage.stableKind === "CHOICE" ? stage.decisionActor : { id: null, name: "No proven responder", known: false },
      activeResolver: stage.activeResolver,
      relation: stage.continuity.relation,
    },
  };
}

/**
 * Keep the public Dying handoff bounded to the proven Interaction Stage. The
 * local console still owns Peach/provider controls; this model intentionally
 * has no card, provider, action, or rescue-order fields.
 */
export function buildDyingHandoffView(stage: InteractionStageView): DyingHandoffView {
  const hiddenIdentity = { id: null, name: "No proven decision actor", known: false };
  if (!stage.visible || stage.stage !== "DYING" || !stage.currentParticipant.id) {
    return {
      visible: false,
      dyingPlayer: stage.currentParticipant,
      decisionActor: hiddenIdentity,
      activeResolver: stage.activeResolver,
      statusLabel: "Dying rescue",
      guidance: "Rescue controls stay in the local console.",
      continuity: { ...stage.continuity },
      parentFrameId: stage.parentFrameId,
    };
  }
  return {
    visible: true,
    dyingPlayer: stage.currentParticipant,
    decisionActor: stage.stableKind === "CHOICE" ? stage.decisionActor : hiddenIdentity,
    activeResolver: stage.activeResolver,
    statusLabel: "Rescue decision",
    guidance: "Rescue controls stay in the local console.",
    continuity: { ...stage.continuity },
    parentFrameId: stage.parentFrameId,
  };
}

function sameIds(left: readonly PresentationDisplayIdentity[], right: readonly PresentationDisplayIdentity[]) {
  return left.length === right.length && left.every((identity, index) => identity.id === right[index]?.id);
}

function displayNames(identities: readonly PresentationDisplayIdentity[], emptyLabel: string) {
  return identities.length ? identities.map((identity) => identity.name).join(", ") : emptyLabel;
}

export function isProvenBorrowedSwordForcedAttack(stage: InteractionStageView): boolean {
  return Boolean(stage.visible
    && stage.stage === "ATTACK_RESPONSE"
    && stage.effect === "borrowed_sword_attack"
    && stage.continuity.relation === "CHILD_FRAME"
    && stage.rootOrigin
    && stage.rootOrigin.frameId === stage.parentFrameId
    && stage.rootOrigin.effect.trim().toLowerCase() === "borrowed sword"
    && stage.rootOrigin.source.id
    && stage.rootOrigin.source.known
    && stage.rootOrigin.source.id !== stage.source.id
    && stage.rootOrigin.targets.length === 1
    && stage.rootOrigin.targets[0]?.id === stage.source.id
    && stage.source.id
    && stage.source.known
    && stage.activeTargets.length === 1
    && stage.activeTargets[0]?.id
    && stage.activeTargets[0].id !== stage.source.id
    && stage.activeTargets[0].known
    && stage.currentParticipant.id === stage.activeTargets[0].id);
}

export function buildNestedEffectContext(stage: InteractionStageView): string | null {
  if (stage.continuity.relation !== "CHILD_FRAME") return null;
  if (stage.stage === "ATTACK_RESPONSE" && stage.effect === "borrowed_sword_attack") return null;
  const parentFrameId = stage.parentFrameId;
  const rootOrigin = stage.rootOrigin;
  if (!parentFrameId || stage.continuity.parentFrameId !== parentFrameId || rootOrigin?.frameId !== parentFrameId) return null;

  const normalizedEffect = rootOrigin.effect.trim().toLowerCase();
  const parentEffect = Object.values(CARD_DEFINITIONS).find((definition) =>
    definition.kind.toLowerCase() === normalizedEffect || definition.name.toLowerCase() === normalizedEffect,
  );
  return parentEffect ? `During ${parentEffect.name}` : null;
}

/**
 * Establish the player-facing hierarchy without changing the underlying
 * semantic fields retained by InteractionStageView.
 */
export function buildInteractionStageDisplayModel(stage: InteractionStageView, presentedCurrentParticipantId: string | null = null): InteractionStageDisplayModel {
  const currentParticipant = stage.currentParticipant.id ? stage.currentParticipant : null;
  const soleActiveTarget = stage.stage !== "DYING"
    && !currentParticipant
    && stage.activeTargets.length === 1
    && stage.activeTargets[0]?.id
    ? stage.activeTargets[0]
    : null;
  const activeTarget = currentParticipant ?? soleActiveTarget ?? {
    id: null,
    name: stage.activeTargets.length > 0 ? "No proven focus" : "No active target",
    known: false,
  };
  const sourceOwned = Boolean(stage.source.id && stage.source.id === stage.decisionActor.id);
  const showResolver = Boolean(stage.activeResolver.id
    && stage.activeResolver.id !== stage.decisionActor.id
    && (sourceOwned || stage.continuity.relation === "CHILD_FRAME"));
  const targetSummary = stage.currentParticipant.id
    ? `Current participant: ${stage.currentParticipant.name}${stage.activeTargets.length > 1
      ? ` · Active scope: ${displayNames(stage.activeTargets, "No active target")}`
      : ""}`
    : `Active scope: ${displayNames(stage.activeTargets, "No active target")}`;
  const currentParticipantPresentedInHeroFocus = Boolean(stage.currentParticipant.id
    && stage.currentParticipant.id === presentedCurrentParticipantId);
  const activeScopeSummary = stage.activeTargets.length > 1
    ? `Active scope: ${displayNames(stage.activeTargets, "No active target")}`
    : null;
  const showOriginalTargets = !sameIds(stage.originalTargets, stage.activeTargets);
  const nestedContext = buildNestedEffectContext(stage);
  return {
    visible: stage.visible,
    focusLabel: stage.stage === "DYING"
      ? "Dying · Rescue"
      : stage.effect ? `${stage.effect} · ${stage.stageLabel}` : stage.stageLabel,
    source: stage.source,
    focusTarget: activeTarget,
    currentParticipantPresentedInHeroFocus,
    targetSummary,
    activeScopeSummary,
    showDecision: stage.stableKind === "CHOICE" && Boolean(stage.decisionActor.id),
    decisionActor: stage.decisionActor,
    isViewerDecisionActor: stage.isViewerDecisionActor,
    showResolver,
    activeResolver: stage.activeResolver,
    showOriginalTargets,
    originalTargetSummary: `Original targets: ${displayNames(stage.originalTargets, "None")}`,
    nestedContext,
  };
}
