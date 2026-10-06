import type { CurrentAction } from "./protocol";
import { isGroupParticipantProgressOutcomeAllowed, type GroupParticipantProgressOutcome, type GroupParticipantProgressStatus, type GroupResolutionSemantics } from "./pending";
import type {
  PresentationInteractionScene,
  PresentationReactionChain,
  PresentationReactionChainNode,
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

export type PresentationSnapshot = {
  identity: PresentationSnapshotIdentity | null;
  stable: PresentationStableBoundary;
  interaction: PresentationSnapshotInteraction | null;
  groupParticipantProgress: PresentationSnapshotGroupProgress | null;
  reactionChain: PresentationReactionChain | null;
  decision: PresentationSnapshotDecision | null;
  localControl: PresentationSnapshotLocalControl;
  /** Reserved until a durable public settlement occurrence is accepted. */
  settlement: null;
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
    copied.push({ playerId: participant.playerId, order: participant.order, status: participant.status, ...(participant.outcome === "AVOIDED" || participant.outcome === "DAMAGED" || participant.outcome === "NEGATED" ? { outcome: participant.outcome } : {}) });
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
  return { semantics: "PROVEN", interactionId: identity.interactionId, frameId: scene.activeFrameId, nodes };
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
    reactionChain: authority ? reactionChainFor(input.presentationV2, authority.scene, authority.identity) : null,
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
    settlement: null,
    transitionEvents: [],
  };
}

export const projectPresentationSnapshot = composePresentationSnapshot;
