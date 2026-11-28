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
