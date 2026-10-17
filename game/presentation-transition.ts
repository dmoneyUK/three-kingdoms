import type { PresentationClientView } from "./presentation-client";

/** Public transition classes, ordered from weakest to strongest. */
export type PresentationTransitionKind =
  | "CONTENT_UPDATE"
  | "FOCUS_UPDATE"
  | "FRAME_TRANSITION"
  | "INTERACTION_TRANSITION"
  | "NONE";

export type PresentationTransitionReason =
  | "INTERACTION_STARTED"
  | "INTERACTION_ENDED"
  | "INTERACTION_CHANGED"
  | "ACTIVE_FRAME_CHANGED"
  | "ROOT_FRAME_CHANGED"
  | "PARENT_FRAME_CHANGED"
  | "CONTINUITY_CHANGED"
  | "STAGE_CHANGED"
  | "CURRENT_PARTICIPANT_CHANGED"
  | "ACTIVE_SCOPE_CHANGED"
  | "DECISION_ACTOR_CHANGED"
  | "ACTIVE_RESOLVER_CHANGED"
  | "PUBLIC_SOURCE_CHANGED"
  | "PUBLIC_SCOPE_CHANGED"
  | "STABLE_BOUNDARY_CHANGED"
  | "CHECKPOINT_CHANGED"
  | "PRESENTATION_REVISION_CHANGED"
  | "EFFECT_CHANGED"
  | null;

/**
 * A bounded comparison of two accepted public semantic views. It deliberately
 * contains no local entitlement, CurrentAction, timeline, or gameplay data.
 */
export type PresentationTransition = {
  kind: PresentationTransitionKind;
  reason: PresentationTransitionReason;
  previousInteractionId: string | null;
  nextInteractionId: string | null;
  previousRootFrameId: string | null;
  nextRootFrameId: string | null;
  previousActiveFrameId: string | null;
  nextActiveFrameId: string | null;
  previousParentFrameId: string | null;
  nextParentFrameId: string | null;
  previousStage: PresentationClientView["stage"];
  nextStage: PresentationClientView["stage"];
  previousContinuity: PresentationClientView["continuity"];
  nextContinuity: PresentationClientView["continuity"];
  previousCheckpointId: string | null;
  nextCheckpointId: string | null;
  previousPresentationRevision: number | null;
  nextPresentationRevision: number | null;
};

const REST_CONTINUITY: PresentationClientView["continuity"] = {
  relation: "UNPROVEN",
  parentFrameId: null,
};

type SemanticView = PresentationClientView;

function restView(): SemanticView {
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
    isLocalDecisionActor: false,
    hasLocalControl: false,
    localActionRevision: null,
  };
}

function emptyTransition(): PresentationTransition {
  return {
    kind: "NONE",
    reason: null,
    previousInteractionId: null,
    nextInteractionId: null,
    previousRootFrameId: null,
    nextRootFrameId: null,
    previousActiveFrameId: null,
    nextActiveFrameId: null,
    previousParentFrameId: null,
    nextParentFrameId: null,
    previousStage: null,
    nextStage: null,
    previousContinuity: REST_CONTINUITY,
    nextContinuity: REST_CONTINUITY,
    previousCheckpointId: null,
    nextCheckpointId: null,
    previousPresentationRevision: null,
    nextPresentationRevision: null,
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isString);
}

function isContinuity(value: unknown): value is SemanticView["continuity"] {
  if (!value || typeof value !== "object") return false;
  const continuity = value as Partial<SemanticView["continuity"]>;
  return (continuity.relation === "ROOT_FRAME"
    || continuity.relation === "SAME_FRAME"
    || continuity.relation === "CHILD_FRAME")
    && isStringOrNull(continuity.parentFrameId)
    && (continuity.relation !== "CHILD_FRAME" || isString(continuity.parentFrameId));
}

function isRestView(view: SemanticView): boolean {
  const continuity = view.continuity;
  return view.hasInteraction === false
    && view.stableKind === "REST"
    && view.interactionId === null
    && view.checkpointId === null
    && view.presentationRevision === null
    && view.rootFrameId === null
    && view.activeFrameId === null
    && view.stage === null
    && view.sourceId === null
    && view.effect === null
    && isStringArray(view.originalTargetIds)
    && view.originalTargetIds.length === 0
    && isStringArray(view.activeTargetIds)
    && view.activeTargetIds.length === 0
    && view.currentParticipantId === null
    && view.decisionActorId === null
    && view.activeResolverId === null
    && isStringArray(view.participantIds)
    && view.participantIds.length === 0
    && view.parentFrameId === null
    && Boolean(continuity)
    && continuity.relation === "UNPROVEN"
    && continuity.parentFrameId === null;
}

/** Validate only the public semantic contract; malformed pairs fail closed. */
function isAcceptedSemanticView(view: PresentationClientView | null): view is SemanticView {
  if (!view || typeof view !== "object") return false;
  if (isRestView(view)) return true;
  if (view.hasInteraction !== true
    || view.stableKind === "REST"
    || view.stableKind === "SETTLEMENT"
    || (view.stableKind !== "CHOICE" && view.stableKind !== "SPECIAL")
    || !isString(view.interactionId)
    || !isString(view.checkpointId)
    || !Number.isInteger(view.presentationRevision)
    || (view.presentationRevision as number) < 0
    || !isString(view.rootFrameId)
    || !isString(view.activeFrameId)
    || !isString(view.stage)
    || !isStringOrNull(view.parentFrameId)
    || !isStringOrNull(view.sourceId)
    || !isStringOrNull(view.effect)
    || !isStringOrNull(view.currentParticipantId)
    || !isStringOrNull(view.decisionActorId)
    || !isStringOrNull(view.activeResolverId)
    || !isStringArray(view.originalTargetIds)
    || !isStringArray(view.activeTargetIds)
    || !isStringArray(view.participantIds)
    || !isContinuity(view.continuity)
    || view.continuity.parentFrameId !== view.parentFrameId
    || view.stableKind === "CHOICE" && !isString(view.decisionActorId)
    || view.stableKind === "SPECIAL" && view.decisionActorId !== null) return false;
  return true;
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function describePair(previous: SemanticView, next: SemanticView): PresentationTransition {
  return {
    ...emptyTransition(),
    previousInteractionId: previous.interactionId,
    nextInteractionId: next.interactionId,
    previousRootFrameId: previous.rootFrameId,
    nextRootFrameId: next.rootFrameId,
    previousActiveFrameId: previous.activeFrameId,
    nextActiveFrameId: next.activeFrameId,
    previousParentFrameId: previous.parentFrameId,
    nextParentFrameId: next.parentFrameId,
    previousStage: previous.stage,
    nextStage: next.stage,
    previousContinuity: { ...previous.continuity },
    nextContinuity: { ...next.continuity },
    previousCheckpointId: previous.checkpointId,
    nextCheckpointId: next.checkpointId,
    previousPresentationRevision: previous.presentationRevision,
    nextPresentationRevision: next.presentationRevision,
  };
}

function withClass(
  transition: PresentationTransition,
  kind: PresentationTransitionKind,
  reason: Exclude<PresentationTransitionReason, null>,
): PresentationTransition {
  return { ...transition, kind, reason };
}

/**
 * Classify one immediately previous accepted public view against the next.
 * The hierarchy is intentionally encoded in comparison order so weaker
 * checkpoint/content changes cannot mask frame, focus, or interaction change.
 */
export function buildPresentationTransition(
  previous: PresentationClientView | null,
  next: PresentationClientView | null,
): PresentationTransition {
  const previousView = previous ?? restView();
  const nextView = next ?? restView();
  if (!isAcceptedSemanticView(previousView) || !isAcceptedSemanticView(nextView)) return emptyTransition();

  const transition = describePair(previousView, nextView);
  const previousActive = previousView.hasInteraction;
  const nextActive = nextView.hasInteraction;
  if (!previousActive && nextActive) return withClass(transition, "INTERACTION_TRANSITION", "INTERACTION_STARTED");
  if (previousActive && !nextActive) return withClass(transition, "INTERACTION_TRANSITION", "INTERACTION_ENDED");
  if (!previousActive && !nextActive) return transition;
  if (previousView.interactionId !== nextView.interactionId) return withClass(transition, "INTERACTION_TRANSITION", "INTERACTION_CHANGED");

  if (previousView.activeFrameId !== nextView.activeFrameId) return withClass(transition, "FRAME_TRANSITION", "ACTIVE_FRAME_CHANGED");
  if (previousView.rootFrameId !== nextView.rootFrameId) return withClass(transition, "FRAME_TRANSITION", "ROOT_FRAME_CHANGED");
  if (previousView.parentFrameId !== nextView.parentFrameId) return withClass(transition, "FRAME_TRANSITION", "PARENT_FRAME_CHANGED");
  if (previousView.continuity.relation !== nextView.continuity.relation
    || previousView.continuity.parentFrameId !== nextView.continuity.parentFrameId) return withClass(transition, "FRAME_TRANSITION", "CONTINUITY_CHANGED");
  if (previousView.stage !== nextView.stage) return withClass(transition, "FRAME_TRANSITION", "STAGE_CHANGED");

  if (previousView.currentParticipantId !== nextView.currentParticipantId) return withClass(transition, "FOCUS_UPDATE", "CURRENT_PARTICIPANT_CHANGED");
  if (!sameIds(previousView.activeTargetIds, nextView.activeTargetIds)) return withClass(transition, "FOCUS_UPDATE", "ACTIVE_SCOPE_CHANGED");
  if (previousView.decisionActorId !== nextView.decisionActorId) return withClass(transition, "FOCUS_UPDATE", "DECISION_ACTOR_CHANGED");
  if (previousView.activeResolverId !== nextView.activeResolverId) return withClass(transition, "FOCUS_UPDATE", "ACTIVE_RESOLVER_CHANGED");
  if (previousView.sourceId !== nextView.sourceId) return withClass(transition, "FOCUS_UPDATE", "PUBLIC_SOURCE_CHANGED");
  if (!sameIds(previousView.originalTargetIds, nextView.originalTargetIds)
    || !sameIds(previousView.participantIds, nextView.participantIds)) return withClass(transition, "FOCUS_UPDATE", "PUBLIC_SCOPE_CHANGED");
  if (previousView.stableKind !== nextView.stableKind) return withClass(transition, "FOCUS_UPDATE", "STABLE_BOUNDARY_CHANGED");

  if (previousView.checkpointId !== nextView.checkpointId) return withClass(transition, "CONTENT_UPDATE", "CHECKPOINT_CHANGED");
  if (previousView.presentationRevision !== nextView.presentationRevision) return withClass(transition, "CONTENT_UPDATE", "PRESENTATION_REVISION_CHANGED");
  if (previousView.effect !== nextView.effect) return withClass(transition, "CONTENT_UPDATE", "EFFECT_CHANGED");
  return transition;
}
