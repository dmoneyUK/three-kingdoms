import type { CanonicalPublicDiscardOwnerCandidate } from "../game/public-announcement";
import type { PresentationSnapshotPublicCardEffect } from "../game/presentation-snapshot";
import { publicDiscardSettlementForMaterials, type CanonicalPublicDiscardSettlement, type PublicDiscardSettlementCopy } from "./public-discard-settlement";
import type { PublicDiscardTransitionRoute } from "./public-discard-transition";
import { createPublicCardEffectFrameView, type PublicCardDisplayAction } from "./public-card-display";

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

/** Declarative visual metadata; the canonical proof/copy factory owns Action construction. */
export type CanonicalPublicDiscardEffectFrameSeed = {
  effect: PresentationSnapshotPublicCardEffect;
  key: string;
  sourceId: string;
  targetId: string | null;
  cardLabel: string;
  visualTitle: string;
  motionScopeKey: string;
  freshEventIds: readonly string[];
  ownerNamesById: Readonly<Record<string, string>>;
  interactionId?: string;
  rootFrameId?: string;
  titlePresentation?: "compact-single-line";
  showMaterialCount?: boolean;
  preferredLaneTopOffset?: number;
  suppressAnnouncement?: boolean;
  motion?: PublicCardDisplayAction["motion"];
  lustCostFrame?: PublicCardDisplayAction["lustCostFrame"];
  relatedDamageSettlement?: NonNullable<PublicCardDisplayAction["settlement"]>;
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

function canonicalEffectFrameAction(
  seed: CanonicalPublicDiscardEffectFrameSeed,
  presentation: CanonicalPublicDiscardPresentation | undefined,
): PublicCardDisplayAction | null {
  const { effect } = seed;
  const settlement = presentation?.settlement;
  const copy = presentation?.copy;
  const materialIds = effect.materials.map((material) => material.cardId);
  if (!settlement || !copy || effect.semantics !== "PROVEN"
    || (effect.effectClass !== "COST" && effect.effectClass !== "EFFECT")
    || !effect.eventId || effect.eventId !== settlement.eventId || effect.eventId !== copy.eventId
    || settlement.semantics !== "PROVEN" || settlement.visibility !== "PUBLIC" || settlement.presentation !== "eligible"
    || materialIds.length === 0 || new Set(materialIds).size !== materialIds.length
    || effect.cards.length !== materialIds.length || effect.materials.length !== settlement.materials.length
    || publicDiscardSettlementForMaterials({ settlements: [settlement], eventId: effect.eventId, physicalCardIds: materialIds }) !== settlement
    || effect.materials.some((material, index) => material.toZone !== "DISCARD"
      || material.cardId !== effect.cards[index]?.id
      || material.cardId !== settlement.materials[index]?.physicalCardId
      || material.ownerId !== settlement.materials[index]?.ownerId
      || material.fromZone !== settlement.materials[index]?.fromZone)
    || settlement.activationOwnerId && effect.activationOwnerId !== settlement.activationOwnerId
    || settlement.rootEventId && effect.rootEventId !== settlement.rootEventId
    || settlement.resolutionId && effect.rootResolutionId !== settlement.resolutionId
    || settlement.interactionId && effect.interactionId && effect.interactionId !== settlement.interactionId
    || settlement.frameId && effect.rootFrameId && effect.rootFrameId !== settlement.frameId
    || effect.source && (effect.source.kind !== settlement.source.kind
      || effect.source.label !== settlement.source.label || effect.source.providerId !== settlement.source.providerId)
    || seed.sourceId !== effect.activationOwnerId && !effect.materials.some((material) => material.ownerId === seed.sourceId)
    || seed.targetId !== null && seed.targetId !== effect.targetId
    || seed.relatedDamageSettlement && (seed.relatedDamageSettlement.outcome !== "ATTACK_DAMAGE_APPLIED"
      || seed.relatedDamageSettlement.eventId === effect.eventId)
    || seed.motion && seed.motion.type !== "single-target" && seed.motion.type !== "lust-cost"
    || !seed.key.trim() || !seed.cardLabel.trim() || !seed.visualTitle.trim() || !seed.motionScopeKey.trim()) return null;
  const activationOwnerName = seed.ownerNamesById[effect.activationOwnerId];
  if (!activationOwnerName) return null;
  const frame = createPublicCardEffectFrameView(effect, {
    title: seed.visualTitle,
    ...(seed.titlePresentation ? { titlePresentation: seed.titlePresentation } : {}),
    ...(seed.showMaterialCount !== undefined ? { showMaterialCount: seed.showMaterialCount } : {}),
    ...(seed.preferredLaneTopOffset !== undefined ? { preferredLaneTopOffset: seed.preferredLaneTopOffset } : {}),
    accessibleLabel: copy.accessibleLabel,
    activationOwnerName,
    ownerNamesById: seed.ownerNamesById,
  });
  if (!frame || !effect.cards[0]) return null;
  return {
    key: seed.key,
    rootEventId: effect.eventId,
    ...(seed.interactionId ?? effect.interactionId ?? settlement.interactionId
      ? { interactionId: seed.interactionId ?? effect.interactionId ?? settlement.interactionId } : {}),
    ...(seed.rootFrameId ?? effect.rootFrameId ?? settlement.frameId
      ? { rootFrameId: seed.rootFrameId ?? effect.rootFrameId ?? settlement.frameId } : {}),
    sourceId: seed.sourceId,
    targetId: seed.targetId,
    cardFace: effect.cards[0],
    cardLabel: seed.cardLabel,
    ariaLabel: copy.accessibleLabel,
    publicNotice: copy.headline,
    publicNoticeSegments: copy.segments,
    publicNoticeCompact: copy.headline,
    publicNoticeEventId: copy.eventId,
    publicDiscardSettlement: copy,
    ...(seed.suppressAnnouncement ? { suppressAnnouncement: true } : {}),
    motion: seed.motion ?? { type: "single-target", scopeKey: seed.motionScopeKey, freshEventIds: seed.freshEventIds },
    ...(seed.lustCostFrame ? { lustCostFrame: seed.lustCostFrame } : {}),
    ...(seed.relatedDamageSettlement ? { settlement: seed.relatedDamageSettlement } : {}),
    publicCardEffectFrame: frame,
  };
}

function canonicalDismantleAction(
  action: PublicCardDisplayAction | null | undefined,
  presentation: CanonicalPublicDiscardPresentation | undefined,
): PublicCardDisplayAction | null {
  const movement = action?.settlement?.outcome === "DISMANTLE_RESOLVED"
    ? action.settlement.targetCardMovement : undefined;
  const settlement = presentation?.settlement;
  const copy = presentation?.copy;
  const eventId = action?.settlement?.eventId;
  const cardId = movement?.affectedCardFace?.id;
  if (!action || movement?.destinationZone !== "discard" || movement.destinationOwnerId !== null
    || !settlement || !copy || !eventId || eventId !== settlement.eventId || eventId !== copy.eventId || !cardId
    || settlement.source.providerId !== "dismantle" || settlement.materials.length !== 1
    || publicDiscardSettlementForMaterials({ settlements: [settlement], eventId, physicalCardIds: [cardId] }) !== settlement
    || movement.affectedCardOwnerId !== settlement.materials[0]?.ownerId
    || movement.sourceZone.toUpperCase() !== settlement.materials[0]?.fromZone) return null;
  return {
    ...action,
    interactionId: action.interactionId ?? settlement.interactionId,
    rootFrameId: action.rootFrameId ?? settlement.frameId,
    ariaLabel: copy.accessibleLabel,
    publicNotice: copy.headline,
    publicNoticeSegments: copy.segments,
    publicNoticeCompact: copy.headline,
    publicNoticeEventId: copy.eventId,
    publicDiscardSettlement: copy,
  };
}

/** Resolve all canonical discard display ownership outside the React render path. */
export function resolveCanonicalPublicDiscardPresentation(input: {
  cursorEventId?: string | null;
  heroActions: readonly PublicCardDisplayAction[];
  effectFrameSeeds: readonly CanonicalPublicDiscardEffectFrameSeed[];
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
  const isDismantleDiscard = (action: PublicCardDisplayAction | null) => action?.settlement?.outcome === "DISMANTLE_RESOLVED"
    && action.settlement.targetCardMovement?.destinationZone === "discard";
  const latestNonDiscardHeroAction = input.heroActions.reduce<PublicCardDisplayAction | null>((latest, action) => {
    if (!latest) return action;
    return input.timelineEventIds.indexOf(action.rootEventId) > input.timelineEventIds.indexOf(latest.rootEventId) ? action : latest;
  }, null);
  const nonHeroIsDiscard = isDismantleDiscard(input.nonHeroAction ?? null);
  const cursorEventId = input.cursorEventId ?? null;
  const effectCandidates = input.effectFrameSeeds.flatMap((seed) => {
    const eventId = seed.effect.eventId;
    const presentation = input.presentationsByEvent.get(eventId);
    const matchingEffects = input.effects.filter((effect) => effect.eventId === eventId);
    if (!eventId || excludedEventIds.has(eventId) || matchingEffects.length !== 1 || matchingEffects[0] !== seed.effect) return [];
    const action = canonicalEffectFrameAction(seed, presentation);
    if (!action) return [];
    const seen = input.journeySeenEventIds.has(eventId) || input.journeySeenEventIds.has(action.rootEventId);
    const lifecycle: CanonicalPublicDiscardLifecycle = {
      fresh: !seen && seed.freshEventIds.includes(eventId),
      seen,
      phase: cursorEventId === eventId ? "ACTIVE_CURSOR" : "QUEUED_CURSOR",
    };
    const settlement = presentation?.settlement;
    if (!settlement || !presentation) return [];
    const descriptor = descriptorFor({ settlement, visualRole: "effect-frame", visualTitle: seed.visualTitle, lifecycle });
    return [{ eventId, orderedPhysicalCardIds: descriptor.orderedPhysicalCardIds, owner: { kind: "effect-frame" as const, action, descriptor } }];
  });
  const dismantlePresentation = input.nonHeroAction?.settlement?.eventId
    ? input.presentationsByEvent.get(input.nonHeroAction.settlement.eventId) : undefined;
  const dismantleAction = nonHeroIsDiscard ? canonicalDismantleAction(input.nonHeroAction, dismantlePresentation) : null;
  const dismantleEventId = dismantleAction?.settlement?.eventId;
  const dismantleSettlement = dismantleEventId ? dismantlePresentation?.settlement : undefined;
  const dismantleMovement = dismantleAction?.settlement?.outcome === "DISMANTLE_RESOLVED"
    ? dismantleAction.settlement.targetCardMovement : undefined;
  const dismantleCardId = dismantleMovement?.affectedCardFace?.id;
  const dismantleCandidate = dismantleAction && dismantleSettlement && dismantleCardId
    && dismantleMovement?.affectedCardFace && dismantleMovement.destinationZone === "discard"
    && dismantleSettlement.source.providerId === "dismantle"
    && dismantleSettlement.materials[0]?.physicalCardId === dismantleCardId
    && dismantleSettlement.materials[0]?.ownerId === dismantleMovement.affectedCardOwnerId
    && dismantleSettlement.materials[0]?.fromZone === dismantleMovement.sourceZone.toUpperCase()
    ? {
      eventId: dismantleEventId!,
      orderedPhysicalCardIds: [dismantleCardId],
      owner: {
        kind: "dismantle-adapter" as const,
        action: dismantleAction,
        descriptor: descriptorFor({
          settlement: dismantleSettlement,
          visualRole: "dismantle-adapter",
          visualTitle: dismantleAction.cardLabel,
          lifecycle: {
            fresh: !input.journeySeenEventIds.has(dismantleEventId!) && Boolean(dismantleAction.motion?.freshEventIds.includes(dismantleEventId!)),
            seen: input.journeySeenEventIds.has(dismantleEventId!),
            phase: cursorEventId === dismantleEventId ? "ACTIVE_CURSOR" as const : "QUEUED_CURSOR" as const,
          },
        }),
      },
    }
    : null;
  const transition = input.activeTransition;
  const transitionCandidate = transition
    ? canonicalPublicDiscardTransitionOwnerCandidate(transition, input.presentationsByEvent.get(transition.eventId)?.settlement, {
      fresh: !input.presentedTransitionEventIds.has(transition.eventId),
      seen: input.presentedTransitionEventIds.has(transition.eventId),
      phase: cursorEventId === transition.eventId ? "ACTIVE_CURSOR" : "QUEUED_CURSOR",
    })
    : null;
  const owner = selectCanonicalPublicDiscardRenderOwner(cursorEventId, [...effectCandidates, dismantleCandidate, transitionCandidate]);
  const actionOwner = owner?.kind === "effect-frame" || owner?.kind === "dismantle-adapter" ? owner.action : null;
  return {
    owner,
    actionOwner,
    nonDiscardAction: nonHeroIsDiscard ? null : input.nonHeroAction ?? null,
    latestNonDiscardHeroAction,
  };
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
