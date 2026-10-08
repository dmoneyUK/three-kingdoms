import type { CurrentAction } from "./protocol";
import { CARD_KINDS, type CardKind } from "./model";
import { isGroupParticipantProgressOutcomeAllowed, type GroupParticipantProgressOutcome, type GroupParticipantProgressStatus, type GroupResolutionSemantics, type HarvestParticipantProgressStatus } from "./pending";
import type {
  PresentationBumperHarvestProgress,
  PresentationInteractionScene,
  PresentationNegationSettlement,
  PresentationOathRecipientScope,
  PresentationReactionChain,
  PresentationReactionChainNode,
  PresentationRootAction,
  PresentationSelfTargetAction,
  PresentationStableBoundary,
  PresentationV2,
} from "./presentation-v2";

/** The only public identity a future presentation client may use. */
export type PresentationSnapshotIdentity = {
  interactionId: string;
  checkpointId: string;
  presentationRevision: number;
};

/** Public semantic data is copied from the accepted typed PresentationV2 scene. */
export type PresentationSnapshotInteraction = PresentationInteractionScene;

export type PresentationSnapshotDecision = {
  actorId: string | null;
  stage: PresentationInteractionScene["stage"];
};

/** Viewer-specific control reference; legal options remain on CurrentAction. */
export type PresentationSnapshotLocalControl = {
  source: "CurrentAction";
  actionRevision: string | null;
  kind: CurrentAction["kind"] | null;
  actorId: string | null;
  entitled: boolean;
};

export type PresentationSnapshotGroupParticipantProgress = {
  playerId: string;
  order: number;
  status: GroupParticipantProgressStatus;
  outcome?: GroupParticipantProgressOutcome;
};

export type PresentationSnapshotGroupProgress = {
  cardKind: "BarbarianInvasion" | "RainingArrows" | "SkyPiercingHalberdAttack";
  resolutionSemantics: GroupResolutionSemantics;
  interactionId: string;
  groupFrameId: string;
  activeFrameId: string;
  checkpointId: string;
  presentationRevision: number;
  targetIds: readonly string[];
  currentParticipantId: string;
  participants: readonly PresentationSnapshotGroupParticipantProgress[];
};

export type PresentationSnapshotOathRecipientScope = PresentationOathRecipientScope;
export type PresentationSnapshotBumperHarvestProgress = PresentationBumperHarvestProgress;
export type PresentationSnapshotRootAction = PresentationRootAction;
export type PresentationSnapshotSelfTargetAction = PresentationSelfTargetAction;

export type PresentationSnapshot = {
  identity: PresentationSnapshotIdentity | null;
  stable: PresentationStableBoundary;
  interaction: PresentationSnapshotInteraction | null;
  groupParticipantProgress: PresentationSnapshotGroupProgress | null;
  oathRecipientScope: PresentationSnapshotOathRecipientScope | null;
  bumperHarvestProgress: PresentationSnapshotBumperHarvestProgress | null;
  reactionChain: PresentationReactionChain | null;
  rootAction: PresentationSnapshotRootAction | null;
  selfTargetActions?: readonly PresentationSnapshotSelfTargetAction[];
  decision: PresentationSnapshotDecision | null;
  localControl: PresentationSnapshotLocalControl;
  /** Explicit public Negation disposition; legacy final-result hints never populate it. */
  settlement: PresentationNegationSettlement | null;
  /** Reserved until durable public transition occurrences are accepted. */
  transitionEvents: readonly [];
};

export type PresentationSnapshotInput = {
  presentationV2: PresentationV2;
  currentAction: Pick<CurrentAction, "kind" | "actorId"> | null;
  actionRevision: string | null;
  viewerId?: string | null;
};

const REST_BOUNDARY: PresentationStableBoundary = {
  kind: "REST",
  interactionId: null,
  checkpointId: null,
  presentationRevision: null,
  decisionActorId: null,
};

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

export function provenSelfTargetActions(value: unknown): PresentationSnapshotSelfTargetAction[] {
  if (!Array.isArray(value)) return [];
  const actions = value.filter((candidate): candidate is PresentationSnapshotSelfTargetAction => Boolean(candidate && typeof candidate === "object" && !Array.isArray(candidate)
    && (candidate as PresentationSnapshotSelfTargetAction).semantics === "PROVEN"
    && nonEmptyString((candidate as PresentationSnapshotSelfTargetAction).rootEventId)
    && nonEmptyString((candidate as PresentationSnapshotSelfTargetAction).resolutionId)
    && nonEmptyString((candidate as PresentationSnapshotSelfTargetAction).sourceId)
    && (candidate as PresentationSnapshotSelfTargetAction).sourceId === (candidate as PresentationSnapshotSelfTargetAction).targetId
    && (candidate as PresentationSnapshotSelfTargetAction).cardKind === "Peach"));
  const counts = new Map<string, number>();
  actions.forEach((action) => counts.set(action.rootEventId, (counts.get(action.rootEventId) ?? 0) + 1));
  return actions.filter((action) => counts.get(action.rootEventId) === 1).map((action) => ({
    semantics: "PROVEN",
    rootEventId: action.rootEventId,
    resolutionId: action.resolutionId,
    sourceId: action.sourceId,
    targetId: action.targetId,
    cardKind: "Peach",
  }));
}

function isProvenScene(scene: PresentationInteractionScene | null): scene is PresentationInteractionScene {
  return Boolean(
    scene?.semantics === "PROVEN"
      && typeof scene.interactionId === "string"
      && typeof scene.rootFrameId === "string"
      && typeof scene.activeFrameId === "string"
      && typeof scene.checkpointId === "string"
      && Number.isInteger(scene.presentationRevision)
      && scene.presentationRevision >= 0
      && scene.stage,
  );
}

function provenNegationSettlement(value: PresentationNegationSettlement | null | undefined): PresentationNegationSettlement | null {
  if (!value || value.semantics !== "PROVEN"
    || value.outcome !== "ROOT_CANCELLED" && value.outcome !== "ROOT_RESTORED"
    || !nonEmptyString(value.eventId) || !nonEmptyString(value.interactionId) || !nonEmptyString(value.rootFrameId)
    || !nonEmptyString(value.checkpointId) || !nonNegativeInteger(value.presentationRevision)
    || !nonEmptyString(value.resolutionId) || !CARD_KINDS.includes(value.rootCardKind)
    || !nonEmptyString(value.sourceId) || !nonEmptyString(value.targetId)) return null;
  return {
    semantics: "PROVEN",
    outcome: value.outcome,
    eventId: value.eventId,
    interactionId: value.interactionId,
    rootFrameId: value.rootFrameId,
    checkpointId: value.checkpointId,
    presentationRevision: value.presentationRevision,
    resolutionId: value.resolutionId,
    rootCardKind: value.rootCardKind,
    sourceId: value.sourceId,
    targetId: value.targetId,
  };
}

function identityFor(scene: PresentationInteractionScene): PresentationSnapshotIdentity {
  return {
    interactionId: scene.interactionId as string,
    checkpointId: scene.checkpointId as string,
    presentationRevision: scene.presentationRevision as number,
  };
}

function stableFor(
  boundary: PresentationStableBoundary,
  identity: PresentationSnapshotIdentity,
  decisionActorId: string | null,
): PresentationStableBoundary {
  // SETTLEMENT is a reserved type only. Legacy finalResult/barrier data must
  // never make it reachable in the authoritative snapshot.
  if (boundary.kind === "SETTLEMENT") return REST_BOUNDARY;
  if (boundary.kind === "REST") return REST_BOUNDARY;
  if (boundary.interactionId !== identity.interactionId
    || boundary.checkpointId !== identity.checkpointId
    || boundary.presentationRevision !== identity.presentationRevision) return REST_BOUNDARY;
  return {
    kind: boundary.kind,
    interactionId: identity.interactionId,
    checkpointId: identity.checkpointId,
    presentationRevision: identity.presentationRevision,
    decisionActorId: boundary.kind === "CHOICE" ? decisionActorId : null,
  };
}

function groupParticipantProgressFor(
  presentationV2: PresentationV2,
  scene: PresentationInteractionScene,
  identity: PresentationSnapshotIdentity,
): PresentationSnapshotGroupProgress | null {
  const group = presentationV2.groupResolution;
  const targetIds = scene.targetIds;
  const progress = group?.participantProgress;
  const resolutionSemantics = group?.resolutionSemantics;
  if (!group || group.semantics !== "PROVEN"
    || (group.cardKind !== "BarbarianInvasion" && group.cardKind !== "RainingArrows" && group.cardKind !== "SkyPiercingHalberdAttack")
    || (resolutionSemantics !== "GROUP" && resolutionSemantics !== "ORDERED")
    || !group.interactionId || !group.groupFrameId || !group.activeFrameId || !group.checkpointId || !group.currentParticipantId
    || !targetIds.length || !progress?.length
    || group.interactionId !== identity.interactionId
    || group.groupFrameId !== scene.rootFrameId
    || group.activeFrameId !== scene.activeFrameId
    || group.checkpointId !== identity.checkpointId
    || group.presentationRevision !== identity.presentationRevision
    || group.stage !== scene.stage
    || group.sourceId !== scene.sourceId
    || group.currentParticipantId !== scene.currentParticipantId
    || !sameIds(group.targetIds, targetIds)
    || !sameIds(scene.participantRoles.originalTargetIds, targetIds)
    || progress.length !== targetIds.length) return null;

  const validStatuses = new Set<GroupParticipantProgressStatus>(["PENDING", "CURRENT", "PAUSED", "RESOLVED", "NO_LONGER_APPLICABLE"]);
  const copied: PresentationSnapshotGroupParticipantProgress[] = [];
  for (let index = 0; index < targetIds.length; index++) {
    const participant = progress[index];
    if (!participant || participant.playerId !== targetIds[index] || participant.order !== index + 1 || !validStatuses.has(participant.status)) return null;
    if (participant.outcome !== undefined && !isGroupParticipantProgressOutcomeAllowed(group.cardKind, resolutionSemantics, participant.status, participant.outcome)) return null;
    copied.push({ playerId: participant.playerId, order: participant.order, status: participant.status, ...(participant.outcome === "AVOIDED" || participant.outcome === "DAMAGED" || participant.outcome === "NEGATED" || participant.outcome === "DEFEATED" ? { outcome: participant.outcome } : {}) });
  }

  const active = copied.filter(({ status }) => status === "CURRENT" || status === "PAUSED");
  if (active.length !== 1 || active[0]?.playerId !== group.currentParticipantId) return null;
  if (group.activeFrameId === group.groupFrameId) {
    if (active[0].status !== "CURRENT") return null;
  } else if (active[0].status !== "PAUSED" || scene.continuity.relation !== "CHILD_FRAME") {
    return null;
  }
  return {
    cardKind: group.cardKind,
    resolutionSemantics: group.resolutionSemantics,
    interactionId: group.interactionId,
    groupFrameId: group.groupFrameId,
    activeFrameId: group.activeFrameId,
    checkpointId: group.checkpointId,
    presentationRevision: group.presentationRevision,
    targetIds: [...targetIds],
    currentParticipantId: group.currentParticipantId,
    participants: copied,
  };
}

function oathRecipientScopeFor(
  presentationV2: PresentationV2,
  scene: PresentationInteractionScene,
  identity: PresentationSnapshotIdentity,
): PresentationSnapshotOathRecipientScope | null {
  const scope = presentationV2.oathRecipientScope;
  if (!scope || scope.semantics !== "PROVEN" || scope.cardKind !== "Oath"
    || scene.stage !== "NEGATION" || !scene.sourceId
    || scope.interactionId !== identity.interactionId
    || scope.interactionId !== scene.interactionId
    || scope.rootFrameId !== scene.rootFrameId
    || scope.activeFrameId !== scene.activeFrameId
    || scope.checkpointId !== identity.checkpointId
    || scope.presentationRevision !== identity.presentationRevision
    || scope.sourceId !== scene.sourceId || scope.sourceId !== scene.participantRoles.sourceId
    || !Array.isArray(scope.recipientIds)) return null;
  const seen = new Set<string>();
  for (const recipientId of scope.recipientIds) {
    if (typeof recipientId !== "string" || recipientId.length === 0 || seen.has(recipientId)) return null;
    seen.add(recipientId);
  }
  return { ...scope, recipientIds: [...scope.recipientIds] };
}

function bumperHarvestProgressFor(
  presentationV2: PresentationV2,
  scene: PresentationInteractionScene,
  identity: PresentationSnapshotIdentity,
  stable: PresentationStableBoundary,
): PresentationSnapshotBumperHarvestProgress | null {
  const progress = presentationV2.bumperHarvestProgress;
  if (!progress || progress.semantics !== "PROVEN" || !Array.isArray(progress.targetIds) || !Array.isArray(progress.participants)
    || !progress.interactionId || !progress.rootFrameId || !progress.activeFrameId || !progress.checkpointId
    || progress.interactionId !== identity.interactionId || progress.interactionId !== scene.interactionId
    || progress.rootFrameId !== scene.rootFrameId || progress.activeFrameId !== scene.activeFrameId
    || progress.checkpointId !== identity.checkpointId || progress.presentationRevision !== identity.presentationRevision
    || progress.sourceId !== scene.sourceId || !progress.targetIds.length
    || new Set(progress.targetIds).size !== progress.targetIds.length
    || progress.participants.length !== progress.targetIds.length) return null;

  const rootRelation = scene.continuity.relation === "ROOT_FRAME" && progress.activeFrameId === progress.rootFrameId;
  const childRelation = scene.continuity.relation === "CHILD_FRAME" && progress.activeFrameId !== progress.rootFrameId;
  if (!rootRelation && !childRelation) return null;
  const semanticTargets = rootRelation ? scene.targetIds : scene.rootOrigin?.targetIds;
  if (!semanticTargets || !sameIds(progress.targetIds, semanticTargets)
    || !sameIds(scene.participantRoles.originalTargetIds, scene.targetIds)) return null;
  if (rootRelation && scene.stage !== "SEQUENTIAL_CHOICE"
    || childRelation && (scene.stage !== "NEGATION" || !scene.rootOrigin
      || scene.rootOrigin.frameId !== progress.rootFrameId || scene.rootOrigin.effect !== "BumperHarvest"
      || !sameIds(progress.targetIds, scene.rootOrigin.targetIds)
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
    if (current.length || stable.kind !== "SPECIAL" || childRelation || scene.currentParticipantId !== null) return null;
  } else if (current.length !== 1 || current[0].playerId !== progress.currentParticipantId
    || scene.currentParticipantId !== progress.currentParticipantId) return null;
  if (rootRelation && progress.currentParticipantId
    && (stable.kind !== "CHOICE" || stable.decisionActorId !== progress.currentParticipantId)) return null;
  if (childRelation && stable.kind !== "SPECIAL") return null;

  return { ...progress, targetIds: [...progress.targetIds], participants };
}

function reactionChainFor(
  presentationV2: PresentationV2,
  scene: PresentationInteractionScene,
  identity: PresentationSnapshotIdentity,
): PresentationReactionChain | null {
  const chain = presentationV2.reactionChain;
  if (scene.stage !== "NEGATION" || !chain || chain.semantics !== "PROVEN"
    || chain.interactionId !== identity.interactionId || chain.interactionId !== scene.interactionId
    || chain.frameId !== scene.activeFrameId
    || !Array.isArray(chain.nodes)) return null;

  const nodes: PresentationReactionChainNode[] = [];
  const nodeIds = new Set<string>();
  let previousNodeId: string | null = null;
  for (const value of chain.nodes) {
    if (!value || typeof value !== "object") return null;
    const node = value as PresentationReactionChainNode;
    if (typeof node.nodeId !== "string" || !node.nodeId
      || node.interactionId !== identity.interactionId || node.frameId !== scene.activeFrameId
      || node.causedByNodeId !== previousNodeId
      || typeof node.actorId !== "string" || !node.actorId
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
  let rootCard: NonNullable<PresentationReactionChain["rootCard"]> | null = null;
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

function rootActionFor(
  presentationV2: PresentationV2,
  scene: PresentationInteractionScene,
  identity: PresentationSnapshotIdentity,
  stable: PresentationStableBoundary,
): PresentationSnapshotRootAction | null {
  const action = presentationV2.rootAction;
  if (!action || action.semantics !== "PROVEN" || action.action !== "ATTACK"
    || stable.kind !== "CHOICE"
    || action.interactionId !== identity.interactionId
    || action.interactionId !== scene.interactionId
    || action.rootFrameId !== scene.rootFrameId
    || action.activeFrameId !== scene.activeFrameId
    || action.checkpointId !== identity.checkpointId
    || action.presentationRevision !== identity.presentationRevision
    || !nonEmptyString(action.rootEventId)
    || scene.continuity.relation !== "ROOT_FRAME"
    || scene.rootFrameId !== scene.activeFrameId
    || scene.stage !== "ATTACK_RESPONSE"
    || !nonEmptyString(action.sourceId) || action.sourceId === action.targetId
    || action.sourceId !== scene.sourceId || action.sourceId !== scene.activeSourceId
    || !nonEmptyString(action.targetId)
    || scene.targetIds.length !== 1 || scene.targetIds[0] !== action.targetId
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

function sameIds(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

type PublicAuthority = {
  scene: PresentationInteractionScene;
  identity: PresentationSnapshotIdentity;
  stable: PresentationStableBoundary;
};

/** Admit public authority as one coherent unit; never repair a mismatch. */
function coherentPublicAuthority(presentationV2: PresentationV2): PublicAuthority | null {
  const scene = isProvenScene(presentationV2.interactionScene) ? presentationV2.interactionScene : null;
  if (!scene) return null;
  const identity = identityFor(scene);
  const boundary = presentationV2.stableBoundary;
  if (boundary.kind === "REST" || boundary.kind === "SETTLEMENT"
    || boundary.interactionId !== identity.interactionId
    || boundary.checkpointId !== identity.checkpointId
    || boundary.presentationRevision !== identity.presentationRevision
    || boundary.kind === "CHOICE" && boundary.decisionActorId !== scene.decisionActorId) return null;
  return { scene, identity, stable: stableFor(boundary, identity, scene.decisionActorId) };
}

/**
 * Pure composition of accepted public presentation authority and the local
 * CurrentAction reference. It performs no gameplay, DB, timeline, or ID work.
 */
export function composePresentationSnapshot(input: PresentationSnapshotInput): PresentationSnapshot {
  const authority = coherentPublicAuthority(input.presentationV2);
  return {
    identity: authority?.identity ?? null,
    stable: authority?.stable ?? REST_BOUNDARY,
    interaction: authority?.scene ?? null,
    groupParticipantProgress: authority ? groupParticipantProgressFor(input.presentationV2, authority.scene, authority.identity) : null,
    oathRecipientScope: authority ? oathRecipientScopeFor(input.presentationV2, authority.scene, authority.identity) : null,
    bumperHarvestProgress: authority ? bumperHarvestProgressFor(input.presentationV2, authority.scene, authority.identity, authority.stable) : null,
    reactionChain: authority ? reactionChainFor(input.presentationV2, authority.scene, authority.identity) : null,
    rootAction: authority ? rootActionFor(input.presentationV2, authority.scene, authority.identity, authority.stable) : null,
    selfTargetActions: provenSelfTargetActions(input.presentationV2.selfTargetActions),
    decision: authority && authority.stable.kind === "CHOICE"
      ? { actorId: authority.scene.decisionActorId, stage: authority.scene.stage }
      : null,
    localControl: {
      source: "CurrentAction",
      actionRevision: input.actionRevision,
      kind: input.currentAction?.kind ?? null,
      actorId: input.currentAction?.actorId ?? null,
      entitled: Boolean(input.viewerId && input.currentAction?.actorId === input.viewerId),
    },
    settlement: provenNegationSettlement(input.presentationV2.negationSettlement),
    transitionEvents: [],
  };
}

export const projectPresentationSnapshot = composePresentationSnapshot;
