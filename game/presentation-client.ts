import type { PresentationSnapshot } from "./presentation-snapshot";
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
  stage: PresentationInteractionScene["stage"];
  sourceId: string | null;
  originalTargetIds: readonly string[];
  activeTargetIds: readonly string[];
  currentParticipantId: string | null;
  decisionActorId: string | null;
  activeResolverId: string | null;
  participantIds: readonly string[];
  continuity: InteractionSceneContinuity;
  parentFrameId: string | null;
  stableKind: PresentationStableBoundaryKind;
  isLocalDecisionActor: boolean;
  hasLocalControl: boolean;
  localActionRevision: string | null;
};

const REST_CONTINUITY: InteractionSceneContinuity = {
  relation: "UNPROVEN",
  parentFrameId: null,
};

function restView(snapshot: PresentationSnapshot | null, meId: string | null): PresentationClientView {
  const localControl = snapshot?.localControl;
  const hasLocalControl = Boolean(localControl?.entitled && localControl.actorId && localControl.actorId === meId);
  return {
    hasInteraction: false,
    interactionId: null,
    checkpointId: null,
    presentationRevision: null,
    stage: null,
    sourceId: null,
    originalTargetIds: [],
    activeTargetIds: [],
    currentParticipantId: null,
    decisionActorId: null,
    activeResolverId: null,
    participantIds: [],
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

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isString);
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
  return {
    hasInteraction: true,
    interactionId: snapshot.identity?.interactionId ?? null,
    checkpointId: snapshot.identity?.checkpointId ?? null,
    presentationRevision: snapshot.identity?.presentationRevision ?? null,
    stage: scene.stage,
    sourceId: roles.sourceId,
    originalTargetIds: [...roles.originalTargetIds],
    activeTargetIds: [...roles.activeTargetIds],
    currentParticipantId: roles.currentParticipantId,
    decisionActorId: snapshot.stable.decisionActorId,
    activeResolverId: roles.activeResolverId,
    participantIds: [...roles.participantIds],
    continuity: { ...scene.continuity },
    parentFrameId: scene.parentFrameId,
    stableKind: snapshot.stable.kind,
    isLocalDecisionActor: hasLocalControl,
    hasLocalControl,
    localActionRevision: snapshot.localControl.actionRevision,
  };
}
