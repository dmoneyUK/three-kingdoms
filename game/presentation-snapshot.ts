import type { CurrentAction } from "./protocol";
import type {
  PresentationInteractionScene,
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

export type PresentationSnapshot = {
  identity: PresentationSnapshotIdentity | null;
  stable: PresentationStableBoundary;
  interaction: PresentationSnapshotInteraction | null;
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
