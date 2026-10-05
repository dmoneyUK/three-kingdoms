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
  root: {
    effect: string;
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
    return { visible: false, interactionId: null, root: null, active: null };
  }
  return {
    visible: true,
    interactionId: stage.interactionId,
    root: {
      effect: stage.effect,
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
  const nestedContext = stage.continuity.relation === "CHILD_FRAME"
    ? `Nested effect${stage.parentFrameId ? ` · parent frame ${stage.parentFrameId}` : ""}`
    : null;
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
