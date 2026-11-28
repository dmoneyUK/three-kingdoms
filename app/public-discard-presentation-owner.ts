import type { CanonicalPublicDiscardOwnerCandidate } from "../game/public-announcement";
import type { PresentationSnapshotPublicCardEffect } from "../game/presentation-snapshot";
import { publicDiscardSettlementForMaterials, type CanonicalPublicDiscardSettlement, type PublicDiscardSettlementCopy } from "./public-discard-settlement";
import type { PublicDiscardTransitionRoute } from "./public-discard-transition";
import type { PublicCardDisplayAction } from "./public-card-display";

export type CanonicalPublicDiscardLifecycle = {
  fresh: boolean;
  seen: boolean;
  phase: "ACTIVE_CURSOR" | "QUEUED_CURSOR";
};

export type CanonicalPublicDiscardDescriptor = {
  eventId: string;
  order: number;
  orderedPhysicalCardIds: readonly string[];
  materials: readonly {
    physicalCardId: string;
    ownerId: string | null;
    fromZone: CanonicalPublicDiscardSettlement["materials"][number]["fromZone"];
    toZone: "DISCARD";
  }[];
  identity: {
    rootEventId?: string;
    resolutionId?: string;
    interactionId?: string;
    frameId?: string;
    activationOwnerId?: string;
  };
  affectedPlayerIds: readonly string[];
  source: CanonicalPublicDiscardSettlement["source"];
  destination: { zone: "DISCARD"; ownerId: null };
  visualRole: "ordinary-transition" | "dismantle-adapter" | "effect-frame";
  visualTitle: string;
  lifecycle: CanonicalPublicDiscardLifecycle;
};

export type CanonicalPublicDiscardRenderOwner =
  | { kind: "effect-frame" | "dismantle-adapter"; action: PublicCardDisplayAction; descriptor: CanonicalPublicDiscardDescriptor }
  | { kind: "ordinary-transition"; route: PublicDiscardTransitionRoute; descriptor: CanonicalPublicDiscardDescriptor };

export type CanonicalPublicDiscardPresentation = {
  settlement: CanonicalPublicDiscardSettlement;
  copy: PublicDiscardSettlementCopy;
};

export type CanonicalPublicDiscardPresentationSelection = {
  owner: CanonicalPublicDiscardRenderOwner | null;
  actionOwner: PublicCardDisplayAction | null;
  nonDiscardAction: PublicCardDisplayAction | null;
  latestNonDiscardHeroAction: PublicCardDisplayAction | null;
};

/** Prefer the most specific already-proven visual role; duplicate owners at that role fail closed. */
export function selectCanonicalPublicDiscardRenderOwner(
  cursorEventId: string | null | undefined,
  candidates: readonly (CanonicalPublicDiscardOwnerCandidate<CanonicalPublicDiscardRenderOwner> | null | undefined)[],
): CanonicalPublicDiscardRenderOwner | null {
  if (!cursorEventId) return null;
  const due = candidates.filter((candidate): candidate is CanonicalPublicDiscardOwnerCandidate<CanonicalPublicDiscardRenderOwner> => candidate !== null
    && candidate !== undefined && candidate.eventId === cursorEventId
    && candidate.orderedPhysicalCardIds.length > 0
    && candidate.orderedPhysicalCardIds.every((id) => typeof id === "string" && id.trim().length > 0)
    && new Set(candidate.orderedPhysicalCardIds).size === candidate.orderedPhysicalCardIds.length);
  for (const kind of ["effect-frame", "dismantle-adapter", "ordinary-transition"] as const) {
    const roleOwners = due.filter((candidate) => candidate.owner.kind === kind);
    if (roleOwners.length > 0) return roleOwners.length === 1 ? roleOwners[0].owner : null;
  }
  return null;
}

function descriptorFor(input: {
  settlement: CanonicalPublicDiscardSettlement;
  visualRole: CanonicalPublicDiscardDescriptor["visualRole"];
  visualTitle: string;
  lifecycle: CanonicalPublicDiscardLifecycle;
}): CanonicalPublicDiscardDescriptor {
  const { settlement } = input;
  return {
    eventId: settlement.eventId,
    order: settlement.order,
    orderedPhysicalCardIds: settlement.materials.map((material) => material.physicalCardId),
    materials: settlement.materials.map((material) => ({
      physicalCardId: material.physicalCardId,
      ownerId: material.ownerId,
      fromZone: material.fromZone,
      toZone: material.toZone,
    })),
    identity: {
      ...(settlement.rootEventId ? { rootEventId: settlement.rootEventId } : {}),
      ...(settlement.resolutionId ? { resolutionId: settlement.resolutionId } : {}),
      ...(settlement.interactionId ? { interactionId: settlement.interactionId } : {}),
      ...(settlement.frameId ? { frameId: settlement.frameId } : {}),
      ...(settlement.activationOwnerId ? { activationOwnerId: settlement.activationOwnerId } : {}),
    },
    affectedPlayerIds: settlement.affectedPlayerIds,
    source: settlement.source,
    destination: { zone: "DISCARD", ownerId: null },
    visualRole: input.visualRole,
    visualTitle: input.visualTitle,
    lifecycle: input.lifecycle,
  };
}

export function publicDiscardActionCandidate(
  action: PublicCardDisplayAction,
  effects: readonly PresentationSnapshotPublicCardEffect[],
  excludedPresentationEventIds: ReadonlySet<string> = new Set(),
): boolean {
  const movement = action.settlement?.outcome === "DISMANTLE_RESOLVED"
    ? action.settlement.targetCardMovement : undefined;
  // Dismantle's root CardFace is still an ordinary action. Its separate target
  // discard is owned by the Dismantle adapter, never by this Action fallback.
  if (movement?.destinationZone === "discard") return false;
  if (action.publicDiscardSettlement) return true;
  const frame = action.publicCardEffectFrame;
  if (!frame) return false;
  const candidateEventIds = new Set([
    frame.eventId,
    action.settlement?.eventId,
    action.rootEventId,
  ].filter((eventId): eventId is string => Boolean(eventId)));
  return effects.some((effect) => candidateEventIds.has(effect.eventId)
    && effect.effectClass !== "CONVERSION" && effect.effectClass !== "JUDGEMENT"
    && !excludedPresentationEventIds.has(effect.eventId)
    && effect.materials.some((material) => material.toZone === "DISCARD"));
}

/** Resolve all canonical discard display ownership outside the React render path. */
export function resolveCanonicalPublicDiscardPresentation(input: {
  cursorEventId?: string | null;
  heroActions: readonly PublicCardDisplayAction[];
  nonHeroAction?: PublicCardDisplayAction | null;
  timelineEventIds: readonly string[];
  effects: readonly PresentationSnapshotPublicCardEffect[];
  excludedEventIds?: ReadonlySet<string>;
  presentationsByEvent: ReadonlyMap<string, CanonicalPublicDiscardPresentation>;
  journeySeenEventIds: ReadonlySet<string>;
  presentedTransitionEventIds: ReadonlySet<string>;
  activeTransition?: PublicDiscardTransitionRoute | null;
}): CanonicalPublicDiscardPresentationSelection {
  const excludedEventIds = input.excludedEventIds ?? new Set<string>();
  const isDismantleDiscard = (action: PublicCardDisplayAction) => action.settlement?.outcome === "DISMANTLE_RESOLVED"
    && action.settlement.targetCardMovement?.destinationZone === "discard";
  const isDiscardAction = (action: PublicCardDisplayAction) => isDismantleDiscard(action)
    || publicDiscardActionCandidate(action, input.effects, excludedEventIds);
  const discardHeroActions = input.heroActions.filter(isDiscardAction);
  const nonDiscardHeroActions = input.heroActions.filter((action) => !isDiscardAction(action));
  const latestNonDiscardHeroAction = nonDiscardHeroActions.reduce<PublicCardDisplayAction | null>((latest, action) => {
    if (!latest) return action;
    return input.timelineEventIds.indexOf(action.rootEventId) > input.timelineEventIds.indexOf(latest.rootEventId) ? action : latest;
  }, null);
  const nonHeroIsDiscard = input.nonHeroAction ? isDiscardAction(input.nonHeroAction) : false;
  const discardActions = [...discardHeroActions, ...(nonHeroIsDiscard && input.nonHeroAction ? [input.nonHeroAction] : [])];
  const cursorEventId = input.cursorEventId ?? null;
  const candidates = discardActions.flatMap((action) => {
    const eventId = action.publicCardEffectFrame?.eventId ?? action.settlement?.eventId;
    const presentation = eventId ? input.presentationsByEvent.get(eventId) : undefined;
    if (!eventId || !presentation) return [];
    const seen = input.journeySeenEventIds.has(eventId)
      || Boolean(action.rootEventId && input.journeySeenEventIds.has(action.rootEventId));
    const motion = action.motion;
    const freshEventIds = motion && "freshEventIds" in motion ? motion.freshEventIds : [];
    const lifecycle: CanonicalPublicDiscardLifecycle = {
      fresh: !seen && Boolean(freshEventIds?.includes(eventId)
        || action.rootEventId && freshEventIds?.includes(action.rootEventId)),
      seen,
      phase: cursorEventId === eventId ? "ACTIVE_CURSOR" : "QUEUED_CURSOR",
    };
    const candidate = canonicalPublicDiscardActionOwnerCandidate(action, presentation.settlement, presentation.copy,
      input.effects, lifecycle);
    return candidate ? [candidate] : [];
  });
  const transition = input.activeTransition;
  const transitionCandidate = transition
    ? canonicalPublicDiscardTransitionOwnerCandidate(transition, input.presentationsByEvent.get(transition.eventId)?.settlement, {
      fresh: !input.presentedTransitionEventIds.has(transition.eventId),
      seen: input.presentedTransitionEventIds.has(transition.eventId),
      phase: cursorEventId === transition.eventId ? "ACTIVE_CURSOR" : "QUEUED_CURSOR",
    })
    : null;
  const owner = selectCanonicalPublicDiscardRenderOwner(cursorEventId, [...candidates, transitionCandidate]);
  const actionOwner = owner?.kind === "effect-frame" || owner?.kind === "dismantle-adapter" ? owner.action : null;
  return {
    owner,
    actionOwner,
    nonDiscardAction: nonHeroIsDiscard ? null : input.nonHeroAction ?? null,
    latestNonDiscardHeroAction,
  };
}

/** Build the display owner only when an existing adapter matches the full normalized discard proof. */
export function canonicalPublicDiscardActionOwnerCandidate(
  action: PublicCardDisplayAction,
  settlement: CanonicalPublicDiscardSettlement | undefined,
  copy: PublicDiscardSettlementCopy | undefined,
  effects: readonly PresentationSnapshotPublicCardEffect[],
  lifecycle: CanonicalPublicDiscardLifecycle,
): CanonicalPublicDiscardOwnerCandidate<CanonicalPublicDiscardRenderOwner> | null {
  const frame = action.publicCardEffectFrame;
  const movement = action.settlement?.outcome === "DISMANTLE_RESOLVED"
    ? action.settlement.targetCardMovement : undefined;
  const eventId = frame?.eventId ?? (movement?.destinationZone === "discard" ? action.settlement?.eventId : undefined);
  const orderedPhysicalCardIds = frame?.materials.map((material) => material.card.id)
    ?? (movement?.destinationZone === "discard" && movement.affectedCardFace?.id ? [movement.affectedCardFace.id] : []);
  if (!eventId || !settlement || !copy || !action.publicDiscardSettlement
    || action.publicDiscardSettlement.eventId !== copy.eventId || action.publicDiscardSettlement.order !== copy.order
    || action.publicDiscardSettlement.headline !== copy.headline
    || copy.eventId !== eventId || settlement.eventId !== eventId
    || publicDiscardSettlementForMaterials({ settlements: [settlement], eventId, physicalCardIds: orderedPhysicalCardIds }) !== settlement) return null;

  if (frame) {
    const matchingEffects = effects.filter((effect) => effect.eventId === eventId);
    if (matchingEffects.length !== 1) return null;
    const effect = matchingEffects[0];
    if (effect.semantics !== "PROVEN" || effect.eventId !== settlement.eventId
      || effect.effectClass === "CONVERSION" || effect.effectClass === "JUDGEMENT"
      || effect.materials.length !== settlement.materials.length
      || frame.materials.length !== settlement.materials.length
      || effect.activationOwnerId !== frame.activationOwnerId
      || settlement.activationOwnerId && frame.activationOwnerId !== settlement.activationOwnerId
      || settlement.rootEventId && frame.rootEventId !== settlement.rootEventId
      || settlement.resolutionId && frame.rootResolutionId !== settlement.resolutionId
      || settlement.interactionId && (action.interactionId !== settlement.interactionId
        || effect.interactionId !== undefined && effect.interactionId !== settlement.interactionId)
      || settlement.frameId && (action.rootFrameId !== settlement.frameId
        || effect.rootFrameId !== undefined && effect.rootFrameId !== settlement.frameId)
      || effect.source && (effect.source.kind !== settlement.source.kind
        || effect.source.label !== settlement.source.label || effect.source.providerId !== settlement.source.providerId)
      || effect.materials.some((material, index) => material.toZone !== "DISCARD"
        || material.cardId !== settlement.materials[index]?.physicalCardId
        || material.cardId !== frame.materials[index]?.card.id
        || material.ownerId !== settlement.materials[index]?.ownerId
        || material.ownerId !== frame.materials[index]?.ownerId
        || material.fromZone !== settlement.materials[index]?.fromZone)) return null;
    const descriptor = descriptorFor({ settlement, visualRole: "effect-frame", visualTitle: frame.title, lifecycle });
    return { eventId, orderedPhysicalCardIds, owner: { kind: "effect-frame", action, descriptor } };
  }

  const dismantle = action.settlement;
  if (movement?.destinationZone !== "discard" || !movement.affectedCardFace
    || movement.destinationOwnerId !== null
    || settlement.source.providerId !== "dismantle" || settlement.materials.length !== 1
    || movement.affectedCardFace.id !== settlement.materials[0]?.physicalCardId
    || movement.affectedCardOwnerId !== settlement.materials[0]?.ownerId
    || movement.sourceZone.toUpperCase() !== settlement.materials[0]?.fromZone
    || settlement.materials[0]?.toZone !== "DISCARD"
    || dismantle?.eventId !== eventId
    || settlement.rootEventId && dismantle.rootEventId !== settlement.rootEventId
    || settlement.resolutionId && dismantle.rootResolutionId !== settlement.resolutionId
    || settlement.activationOwnerId && (dismantle.sourceId !== settlement.activationOwnerId || action.sourceId !== settlement.activationOwnerId)
    || dismantle.targetId && !settlement.affectedPlayerIds.includes(dismantle.targetId)
    || settlement.interactionId && action.interactionId !== settlement.interactionId
    || settlement.frameId && action.rootFrameId !== settlement.frameId) return null;
  const descriptor = descriptorFor({ settlement, visualRole: "dismantle-adapter", visualTitle: action.cardLabel, lifecycle });
  return { eventId, orderedPhysicalCardIds, owner: { kind: "dismantle-adapter", action, descriptor } };
}

export function canonicalPublicDiscardTransitionOwnerCandidate(
  route: PublicDiscardTransitionRoute,
  settlement: CanonicalPublicDiscardSettlement | undefined,
  lifecycle: CanonicalPublicDiscardLifecycle,
): CanonicalPublicDiscardOwnerCandidate<CanonicalPublicDiscardRenderOwner> | null {
  const orderedPhysicalCardIds = route.transitions.map((transition) => transition.physicalCardId);
  if (!settlement || publicDiscardSettlementForMaterials({
    settlements: [settlement], eventId: route.eventId, physicalCardIds: orderedPhysicalCardIds,
  }) !== settlement || settlement.materials.some((material, index) => {
    const transition = route.transitions[index];
    return !transition || transition.physicalCardId !== material.physicalCardId
      || transition.from.ownerId !== material.ownerId
      || transition.from.zone !== material.fromZone
      || material.toZone !== "DISCARD";
  })) return null;
  const descriptor = descriptorFor({ settlement, visualRole: "ordinary-transition", visualTitle: "PUBLIC DISCARD", lifecycle });
  return { eventId: route.eventId, orderedPhysicalCardIds, owner: { kind: "ordinary-transition", route, descriptor } };
}
