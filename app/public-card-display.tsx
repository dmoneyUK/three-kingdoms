"use client";

import {
  publicH4CardFaceReference,
  publicH4CardKindReference,
  publicH4Copy,
  matchingPublicH4Segments,
  publicH4WidthLimit,
  type PublicH4Segment,
} from "../game/public-h4-copy";
import { fixedUpperHistoryAnnouncementAnchor, measuredPublicH4PaintRect, parkedCardSize, publicStationaryCardPlacement } from "./public-upper-anchor";

import { tableLocalPublicCorridorWidth } from "./public-corridor";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Card, CardKind } from "../game/model";
import type { PresentationSnapshotPublicCardEffect, PresentationSnapshotRootAction } from "../game/presentation-snapshot";
import type { PresentationTargetCardSettlementMovement } from "../game/presentation-v2";
import type { PublicInteractionNarration } from "../game/public-activity";
import type { PublicDiscardAnnouncement } from "./public-discard-transition";
import type { PublicDiscardSettlementCopy } from "./public-discard-settlement";
import { publicCardEffectFrameLayout, type PublicCardEffectFrameTitleLayout } from "../game/public-card-effect-frame-layout";
import {
  positionLabeledCardAboveBand,
  publicStageEffectFrameRevealTargetMatches,
  publicStageCoordinateFromTableLocal,
  publicStageJourneyPhaseReady,
  publicStageJourneyTargetReady,
  publicStagePrimaryOriginFromVisualRect,
  publicStageRectToTableLocal,
  publicStageRectFromTableLocal,
  publicStageCoordinateToTableLocal,
  publicStageLengthToTableLocal,
  publicStageRevealCanRetire,
  publicStageSceneMatchesCard,
  checkpointPublicStageVisibleHold,
  publicStageVisibleHoldCanComplete,
  publicStageStaticAnnouncementMatchesReveal,
  type PublicStageRevealIdentity,
  type PublicStageStationarySurface,
} from "../game/public-stage-layout";
import { cardDefinition } from "../game/cards";
import { publicAnnouncementEventCopyKey as buildPublicAnnouncementEventCopyKey, publicAnnouncementGeometryIdentity, publicAnnouncementGeometryKey, transitionPublicAnnouncementCopyLifecycle, type PublicAnnouncementCopyLifecycle, type PublicAnnouncementProtectedGeometry, type PublicAnnouncementSeatGeometry } from "../game/public-announcement";
import { compactLustDuelAttackMessage } from "./lust-public-copy";
import { CardFace } from "./card-face";
import { isAttackDodgeUxTraceActive, recordAttackDodgeUxTrace } from "./attack-dodge-ux-trace";
import {
  committedPublicStageLayout,
  canRetainPublicStageLayout,
  publicStageLayoutCandidateMatchesElement,
  sharedPublicStageMatchesElement,
  publicEffectFrameVisualFootprint,
  publicStageCoordinateSpaceForTable,
  usePublicStageCoordinates,
  usePublicStageLayout,
  type SharedPublicStageLayout,
} from "./public-stage-layout-context";

type PublicCardDisplayResponseNode = {
  eventId: string;
  /** One-based order from the validated Duel or Negation response proof. */
  ordinal?: number;
  actorId: string;
  actorName: string;
  targetName?: string;
  cardFace?: Card;
  cardFaces?: readonly Card[];
  publicNotice?: string;
  publicNoticeSegments?: readonly PublicH4Segment[];
  publicNoticeCompact?: string;
  publicCardEffectFrame?: PublicCardEffectFrameView;
  semanticLabel?: string;
  ariaLabel: string;
};

type PublicCardDisplayMotion = {
  type: "attack-dodge";
  /** Room and interaction identity keep retained card state isolated. */
  scopeKey: string;
  rootFresh: boolean;
  responseFresh: boolean;
  deflectionFresh: boolean;
} | {
  type: "negation" | "single-target";
  /** Stable across committed counters and settlement for this proven root. */
  scopeKey: string;
  freshEventIds: readonly string[];
} | {
  type: "group-root";
  /** Stable across every checkpoint of one proven physical Group root. */
  scopeKey: string;
  freshEventIds: readonly string[];
} | {
  type: "duel";
  /** Room and proven Duel identity keep retained card state isolated. */
  scopeKey: string;
  freshEventIds: readonly string[];
} | {
  type: "lust-duel";
  /** Stable generated-Duel identity, separate from a printed Duel CardFace. */
  scopeKey: string;
  freshEventIds: readonly string[];
} | {
  type: "lust-cost";
  /** The paired activation/cost IDs keep this public frame event-scoped. */
  scopeKey: string;
  freshEventIds: readonly string[];
} | {
  type: "zone-transition";
  /** Exact committed equipment event claim; it supplies the physical endpoint. */
  scopeKey: string;
  freshEventIds: readonly string[];
};

export type PublicNegationNarration = {
  rootLabel: string;
  eventId: string;
  latestCommittedEventId?: string;
  checkpointId?: string;
  phase: "WINDOW_OPEN" | "FINAL";
  rootEffectState: "ACTIVE" | "BLOCKED";
  headline: string;
  headlineSegments?: readonly PublicH4Segment[];
  compactHeadline: string;
  supportingMessage: string;
  compactSupportingMessage: string;
  accessibleLabel: string;
};

export type PublicCardAnnouncementIdentity = {
  presentationStage: string;
  serverRevision: number;
  selectedPresenterRevision: number | null;
  semanticOwner: string;
  interactionId: string;
  rootFrameId: string;
  checkpointId: string;
  latestPublicEventId: string;
  latestPublicActorId: string;
};

/**
 * Read-only, proof-backed public action facts used by public-card presenters.
 * Legal actions remain owned by CurrentAction.
 */
export type PublicCardDisplayAction = {
  key: string;
  rootEventId: string;
  cardFace?: Card;
  interactionId?: string;
  rootFrameId?: string;
  checkpointId?: string;
  presentationRevision?: number;
  /** Current server-proven public stage identity, separate from card motion and viewer layout. */
  publicAnnouncementIdentity?: PublicCardAnnouncementIdentity;
  sourceId: string;
  physicalActorId?: string;
  physicalActorName?: string;
  targetId: string | null;
  cardKind?: CardKind;
  cardLabel: string;
  /** Typed public count for an already-proven group outcome. */
  publicResolvedCount?: { count: number; noun: "targets" | "choices" };
  ariaLabel: string;
  publicNotice?: string;
  publicNoticeSegments?: readonly PublicH4Segment[];
  publicNoticeCompact?: string;
  publicNoticeEventId?: string;
  /** Canonical detail for this exact committed discard event/material set. */
  publicDiscardSettlement?: PublicDiscardSettlementCopy;
  /** Keep a proved historical CardFace while retiring its active announcement. */
  suppressAnnouncement?: boolean;
  /** True only when this action was built from the fully validated public Negation-chain proof. */
  showNegationChainOrdinals?: boolean;
  /** Shared, read-only H4 explanation derived only from a proven public reaction chain. */
  publicNegationNarration?: PublicNegationNarration;
  /** Shared H4 copy for the latest committed event in the current interaction. */
  publicInteractionNarration?: PublicInteractionNarration;
  /** Shared waiting label derived from the proven public LUST Duel actor. */
  publicActivityMessage?: string;
  /** Full accessible activity copy when a short stage label is shown visually. */
  publicActivityAccessibleMessage?: string;
  /** Public participant proven to be affected by the active Bumper Harvest Negation. */
  harvestEffectRecipient?: { participantId: string; participantName: string };
  motion?: PublicCardDisplayMotion;
  /** Narrow adapter for one exact committed equipment-zone destination. */
  zoneTransition?: {
    claimId: string;
    eventId: string;
    physicalCardId: string;
    ownerId: string;
    slot: "weapon" | "armor" | "offensiveHorse" | "defensiveHorse";
    h4EventId: string;
  };
  /** Retire after this renderer's safe, visible reveal hold; no seat-parking stage is required. */
  revealCompletionPolicy?: "visible-hold";
  settlement?: {
    eventId: string;
    /** Authenticated root proof used to match an actor-private Steal result. */
    rootResolutionId?: string;
    /** Identities copied from the validated public target-card settlement proof. */
    rootEventId?: string;
    sourceId?: string;
    targetId?: string;
    /** Verified resolution copy; does not create a physical card or animation. */
    publicOutcomeMessage?: string;
    outcome: "SUITS_MATCHED" | "SUITS_DIFFERED" | "ATTACK_BLOCKED_BY_DODGE" | "ATTACK_DAMAGE_APPLIED" | "DISMANTLE_RESOLVED" | "STEAL_RESOLVED" | "RETALIATION_RESOLVED" | "GROUP_RESOLVED" | "BUMPER_HARVEST_RESOLVED" | "ROOT_CANCELLED" | "ROOT_RESTORED" | "LUST_DUEL_DAMAGE_APPLIED" | "LUST_DUEL_DAMAGE_PREVENTED";
    exiting: boolean;
    /** Server-derived remaining portion of a proof-backed public-card read, when supplied. */
    readRemainingMs?: number;
    /** Validated source/destination facts for Steal and Burning Bridges. */
    targetCardMovement?: PresentationTargetCardSettlementMovement;
  };
  publicCounterRead?: { eventId: string; exiting: boolean };
  phaseNotice?: string;
  /** Previously committed, root-bound public Negation cards; these restore parked history only. */
  responseHistory?: readonly PublicCardDisplayResponseNode[];
  response?: {
    eventId: string;
    actorId: string;
    actorName: string;
    cardFace?: Card;
    ariaLabel: string;
    semanticAction?: "DODGE";
    semanticLabel?: string;
  };
  /** A proven Da Qiao discard cost, shown as a distinct physical public card. */
  deflection?: {
    eventId: string;
    actorId: string;
    actorName: string;
    cardFace: Card;
    ariaLabel: string;
    publicNotice: string;
  };
  lustCostFrame?: {
    activationEventId: string;
    title: string;
    message: string;
    accessibleMessage?: string;
    compactMessage?: string;
  };
  /** Validated public proof material for a shared A/C/E frame. */
  publicCardEffectFrame?: PublicCardEffectFrameView;
  responses?: readonly PublicCardDisplayResponseNode[];
};

/** Routes a proven physical public root through the shared Journey when a more specific Journey was not selected. */
export function publicCardMotionForCommittedCard(
  action: Pick<PublicCardDisplayAction, "rootEventId" | "cardFace" | "motion">,
  roomCode: string,
  seenEventIds: ReadonlySet<string>,
  hasDedicatedZoneOwner = false,
): PublicCardDisplayAction["motion"] | null {
  if (action.motion) return action.motion;
  if (!action.cardFace || hasDedicatedZoneOwner) return null;
  return {
    type: "single-target",
    scopeKey: [roomCode, "public-physical-card", action.rootEventId].join(":"),
    freshEventIds: seenEventIds.has(action.rootEventId) ? [] : [action.rootEventId],
  };
}

/**
 * Keeps the renderer owner stable while a proven Steal/Dismantle root moves
 * through Negation, target choice, and settlement presentation wrappers.
 */
export function publicCardJourneyOwnershipIdentity(
  action: PublicCardDisplayAction,
  roomCode: string,
): string {
  const scope = action.motion?.scopeKey ?? action.interactionId ?? action.rootEventId;
  return [roomCode, "public-journey-root", scope, action.rootEventId, action.cardFace?.id ?? "", action.sourceId].join("\u001f");
}

const publicCardEffectFrameViewBrand: unique symbol = Symbol("validatedPublicCardEffectFrameView");

export type PublicCardEffectFrameView = {
  [publicCardEffectFrameViewBrand]: true;
  eventId: string;
  activationEventId?: string;
  /** Server-proven causal parent; H4 facts for this exact root may share the frame owner. */
  rootEventId?: string;
  rootResolutionId?: string;
  effectId: string;
  effectClass: "COST" | "CONVERSION" | "EFFECT" | "JUDGEMENT";
  activationOwnerId: string;
  activationOwnerName: string;
  title: string;
  titleParts?: { skillName: string; effectLabel?: string };
  titlePresentation?: PublicCardEffectFrameTitleLayout["titlePresentation"];
  showMaterialCount?: boolean;
  /** A deterministic preference relative to the shared Effect Frame lane center. */
  preferredLaneTopOffset?: number;
  materials: readonly { card: Card; ownerId: string | null; ownerName?: string }[];
  accessibleLabel: string;
};

/** Converts the already-validated public snapshot proof into immutable renderer input. */
export function createPublicCardEffectFrameView(
  effect: PresentationSnapshotPublicCardEffect,
  copy: {
    title: string;
    titleParts?: { skillName: string; effectLabel?: string };
    titlePresentation?: PublicCardEffectFrameTitleLayout["titlePresentation"];
    showMaterialCount?: boolean;
    preferredLaneTopOffset?: number;
    accessibleLabel: string;
    activationOwnerName: string;
    ownerNamesById: Readonly<Record<string, string>>;
  },
): PublicCardEffectFrameView | null {
  const classIsSupported = effect.effectClass === "COST" || effect.effectClass === "CONVERSION"
    || effect.effectClass === "EFFECT" || effect.effectClass === "JUDGEMENT";
  const cards = Array.isArray(effect.cards) ? effect.cards : [];
  const materials = Array.isArray(effect.materials) ? effect.materials : [];
  const hasRootIdentity = Boolean(effect.rootEventId) === Boolean(effect.rootResolutionId);
  const normalizedTitleParts = copy.titleParts && {
    skillName: copy.titleParts.skillName.trim(),
    ...(copy.titleParts.effectLabel?.trim() ? { effectLabel: copy.titleParts.effectLabel.trim() } : {}),
  };
  const titlePartsMatch = !normalizedTitleParts
    || `${normalizedTitleParts.skillName}${normalizedTitleParts.effectLabel ? ` · ${normalizedTitleParts.effectLabel}` : ""}` === copy.title.trim();
  if (effect.semantics !== "PROVEN" || !effect.eventId || !effect.activationOwnerId || !classIsSupported || !hasRootIdentity
    || !copy.title.trim() || copy.title.length > 40 || !copy.accessibleLabel.trim() || copy.accessibleLabel.length > 240
    || copy.titlePresentation !== undefined && copy.titlePresentation !== "compact-single-line"
    || copy.showMaterialCount !== undefined && typeof copy.showMaterialCount !== "boolean"
    || copy.preferredLaneTopOffset !== undefined && !Number.isFinite(copy.preferredLaneTopOffset)
    || normalizedTitleParts && !normalizedTitleParts.skillName || !titlePartsMatch
    || !copy.activationOwnerName.trim() || !cards.length || cards.length !== materials.length
    || new Set(cards.map((card) => card.id)).size !== cards.length
    || materials.some((material, index) => !material.cardId || material.cardId !== cards[index]?.id
      || material.ownerId !== null && !copy.ownerNamesById[material.ownerId]?.trim())
    || effect.activationEventId === effect.eventId) return null;
  const suitNames: Record<Card["suit"], string> = { "♥": "Hearts", "♦": "Diamonds", "♣": "Clubs", "♠": "Spades" };
  const materialsAccessibleLabel = cards.map((card, index) => {
    const material = materials[index];
    const ownerName = material.ownerId ? copy.ownerNamesById[material.ownerId] : null;
    return `${ownerName ? `${ownerName}'s ` : "Public-source "}${cardDefinition(card.kind).name}, ${card.rank} of ${suitNames[card.suit]}`;
  }).join("; ");
  return {
    [publicCardEffectFrameViewBrand]: true,
    eventId: effect.eventId,
    ...(effect.activationEventId ? { activationEventId: effect.activationEventId } : {}),
    ...(effect.rootEventId && effect.rootResolutionId ? {
      rootEventId: effect.rootEventId,
      rootResolutionId: effect.rootResolutionId,
    } : {}),
    effectId: effect.effectId,
    effectClass: effect.effectClass,
    activationOwnerId: effect.activationOwnerId,
    activationOwnerName: copy.activationOwnerName,
    title: copy.title.trim(),
    ...(normalizedTitleParts ? { titleParts: normalizedTitleParts } : {}),
    ...(copy.titlePresentation ? { titlePresentation: copy.titlePresentation } : {}),
    ...(copy.showMaterialCount !== undefined ? { showMaterialCount: copy.showMaterialCount } : {}),
    ...(copy.preferredLaneTopOffset !== undefined ? { preferredLaneTopOffset: copy.preferredLaneTopOffset } : {}),
    materials: cards.map((card, index) => ({
      card,
      ownerId: materials[index].ownerId,
      ...(materials[index].ownerId ? { ownerName: copy.ownerNamesById[materials[index].ownerId!] } : {}),
    })),
    accessibleLabel: `${copy.title.trim()} ${effect.effectClass.toLowerCase()} frame. Material cards: ${materialsAccessibleLabel}. ${copy.accessibleLabel.trim()}`,
  };
}

/** Renders the public title using the layout already validated for this Frame. */
export function PublicCardEffectFrameTitle({ frame, lustCostFrame = false }: {
  frame: PublicCardEffectFrameView;
  lustCostFrame?: boolean;
}) {
  return <strong className={`public-card-effect-frame-title${lustCostFrame ? " public-card-lust-cost-frame-title" : ""}${frame.titlePresentation === "compact-single-line" ? " is-compact-single-line" : ""}`}>
    {frame.titlePresentation === "compact-single-line"
      ? <span className="public-card-effect-frame-title-line">{frame.title}</span>
      : frame.titleParts ? <>
      <span className="public-card-effect-frame-title-line">
        {frame.titleParts.skillName}{frame.titleParts.effectLabel ? <span className="public-card-effect-frame-title-separator">{" · "}</span> : null}
      </span>
      {frame.titleParts.effectLabel
        ? <span className="public-card-effect-frame-title-line is-effect">{frame.titleParts.effectLabel}</span>
        : null}
    </> : <span className="public-card-effect-frame-title-line">{frame.title}</span>}
  </strong>;
}

export function PublicCardEffectFrameMaterialCount({ frame, materialCount }: {
  frame: PublicCardEffectFrameView;
  materialCount: number;
}) {
  return materialCount > 1 && frame.showMaterialCount !== false
    ? <small className="public-card-effect-frame-count">{materialCount} MATERIAL CARDS</small>
    : null;
}

/** A public, proof-backed event with no physical card face or card anchor. */
export type PublicSkillEventAnnouncement = {
  semantics: "PROVEN";
  kind: "SKILL_OUTCOME";
  eventId: string;
  publicSequence?: number;
  rootEventId: string;
  sourceId: string;
  proofEventId: string;
  phase: "ACTIVATION" | "DRAWN";
  heading: string;
  message: string;
  segments?: readonly PublicH4Segment[];
  exiting: boolean;
};

type CardRect = { left: number; top: number; width: number; height: number };

type JourneyCard = {
  eventId: string;
  actorId: string;
  actorName: string;
  cardFace: Card;
  cardFaces?: readonly Card[];
  /** Public material context retained for this physical event through parking. */
  parkedPublicEffect?: {
    placement: "above-pac";
    ownerId: string;
    cardId: string;
    title: string;
  };
  ariaLabel: string;
  publicNotice?: string;
  publicNoticeSegments?: readonly PublicH4Segment[];
  publicNoticeCompact?: string;
  publicCardEffectFrame?: PublicCardEffectFrameView;
  semanticLabel?: string;
  role: "root" | "response" | "deflection";
  globalOrdinal?: number;
  phase: "queued" | "reveal" | "move" | "parked";
  rect: CardRect;
  target: CardRect;
  revealStartedAtMs?: number | null;
  revealStartedAtIso?: string | null;
  revealElapsedMs?: number;
  revealRemainingMs?: number;
  moveStartedAtMs?: number | null;
  moveRemainingMs?: number;
  awaitingParkingTarget?: boolean;
  /** Viewer whose geometry last proved this card's author parking slot. */
  parkingTargetViewerId?: string;
  layoutChangeReason?: string;
  /** Keep one unresolved actor placement from hiding unrelated public cards. */
  layoutPending?: boolean;
};
type JourneyState = {
  scopeKey: string;
  viewerId: string;
  cards: JourneyCard[];
  center: CardRect | null;
  suppressTransitions: boolean;
  layoutPending: boolean;
  framePlacementUnavailable?: boolean;
};
type AttackDodgeJourneyLifecycle = {
  phase: "reveal" | "move" | "parked";
  revealStartedAtMs: number | null;
  revealStartedAtIso: string | null;
  revealElapsedMs: number;
  revealRemainingMs: number;
};

const attackDodgeJourneyLifecycles = new Map<string, AttackDodgeJourneyLifecycle>();
const MAX_RETAINED_ATTACK_DODGE_JOURNEYS = 256;

function PublicJourneyCard({
  card,
  parkingTargetKnown = true,
  preservePendingParking = false,
  visualPlacementUnavailable = false,
  authorReservation,
  className = "",
  size,
  primary = false,
  parkingSide,
  showOrdinal = false,
  ordinalContext,
  harvestHistory = false,
  passive = false,
  harvestRootParked = false,
  lustCostFrame,
  publicCardEffectFrame,
  sharedStageIdentity,
  allowPendingVerifiedReveal = false,
  parkedEffectLabel,
  onInspectCard,
}: {
  card: JourneyCard;
  parkingTargetKnown?: boolean;
  preservePendingParking?: boolean;
  visualPlacementUnavailable?: boolean;
  authorReservation?: CardRect | null;
  className?: string;
  size: string;
  primary?: boolean;
  parkingSide?: string;
  showOrdinal?: boolean;
  ordinalContext?: "negation-chain" | "duel";
  harvestHistory?: boolean;
  passive?: boolean;
  harvestRootParked?: boolean;
  lustCostFrame?: PublicCardDisplayAction["lustCostFrame"];
  publicCardEffectFrame?: PublicCardEffectFrameView;
  sharedStageIdentity?: { roomId: string; scopeId: string; interactionId?: string | null; viewerId: string };
  allowPendingVerifiedReveal?: boolean;
  parkedEffectLabel?: string;
  onInspectCard?: (card: Card, trigger: HTMLButtonElement) => void;
}) {
  const sharedPublicStage = usePublicStageLayout();
  const coordinateSpace = usePublicStageCoordinates();
  const sharesCurrentStageIdentity = Boolean(sharedPublicStage && primary && !visualPlacementUnavailable
    && sharedStageIdentity
    && publicStageSceneMatchesCard(sharedPublicStage.layout.scene, {
      ...sharedStageIdentity,
      eventId: card.eventId,
      cardId: card.cardFace.id,
      phase: card.phase.toUpperCase() as "REVEAL" | "MOVE" | "PARKED",
    }));
  const usesSharedRevealLayout = sharesCurrentStageIdentity && card.phase === "reveal";
  const pendingVerifiedRevealLayout = Boolean(allowPendingVerifiedReveal && primary && usesSharedRevealLayout
    && !sharedPublicStage?.revealReady && publicCardEffectFrame
    && publicCardEffectFrame.effectId === "sima_yi_guicai" && publicCardEffectFrame.effectClass === "JUDGEMENT"
    && publicCardEffectFrame.eventId === card.eventId
    && publicCardEffectFrame.materials.length === 1
    && publicCardEffectFrame.materials[0]?.card.id === card.cardFace.id
    && publicStageEffectFrameRevealTargetMatches({
      layout: sharedPublicStage?.layout,
      roomId: sharedStageIdentity!.roomId,
      rootEventId: sharedStageIdentity!.scopeId,
      interactionId: sharedStageIdentity!.interactionId,
      eventId: card.eventId,
      cardId: card.cardFace.id,
      viewerId: sharedStageIdentity!.viewerId,
      primaryEventId: sharedPublicStage?.primaryEventId ?? "",
      primaryCardId: sharedPublicStage?.primaryCardId ?? "",
      announcementEventId: sharedPublicStage?.announcementEventId ?? "",
      announcementAnchorEventId: sharedPublicStage?.announcementAnchorEventId ?? null,
    }));
  const journeyLeft = usesSharedRevealLayout && sharedPublicStage
    ? sharedPublicStage.layout.card.left - sharedPublicStage.primaryOffset.left
    : card.rect.left;
  const journeyTop = usesSharedRevealLayout && sharedPublicStage
    ? sharedPublicStage.layout.card.top - sharedPublicStage.primaryOffset.top
    : card.rect.top;
  const tableLocalCardRect = coordinateSpace ? publicStageRectToTableLocal({
    left: journeyLeft,
    top: journeyTop,
    right: journeyLeft + card.rect.width,
    bottom: journeyTop + card.rect.height,
  }, coordinateSpace) : null;
  const usesTableLocalPosition = card.phase === "reveal";
  const localCardRect = usesTableLocalPosition ? tableLocalCardRect : null;
  const placementUnavailable = visualPlacementUnavailable
    || !parkingTargetKnown && card.phase === "parked" && !preservePendingParking;
  const sharedRevealReadinessPending = Boolean(primary && card.phase === "reveal" && sharedStageIdentity
    && (!sharesCurrentStageIdentity || !sharedPublicStage?.revealReady));
  const positionUnavailable = placementUnavailable || (sharedRevealReadinessPending && !pendingVerifiedRevealLayout)
    || usesTableLocalPosition && !localCardRect;
  const inspectable = !positionUnavailable && !passive && card.phase === "parked" && Boolean(onInspectCard);
  const publicFrameAccessible = !positionUnavailable && Boolean(publicCardEffectFrame && card.phase !== "move");
  const frameMaterials = publicCardEffectFrame?.materials ?? [];
  const frameLayout = publicCardEffectFrame && typeof window !== "undefined"
    ? publicCardEffectFrameLayout(frameMaterials.length, window.innerWidth, window.innerHeight, publicCardEffectFrame)
    : null;
  // publicCardEffectFrameLayout returns CSS dimensions, already in the same
  // local coordinate space as the positioned CardFace. Only measured DOMRects
  // are converted through the table scale; dividing these values again would
  // shrink the authored Frame geometry under a transformed ancestor.
  const renderedFrameLayout = frameLayout;
  const physicalCards = card.cardFaces ?? [card.cardFace];
  const definition = cardDefinition(card.cardFace.kind);
  const groupDescription = physicalCards.map((face) => {
    const cardDefinitionForFace = cardDefinition(face.kind);
    return `${cardDefinitionForFace.name} ${face.rank}${face.suit}`;
  }).join(", ");
  const publicOrdinalLabel = card.globalOrdinal === undefined ? ""
    : ordinalContext === "negation-chain" ? `, Negation chain step ${card.globalOrdinal}`
      : ordinalContext === "duel" ? `, Duel event ${card.globalOrdinal}`
        : `, public card chain step ${card.globalOrdinal}`;
  const accessibleName = inspectable
    ? publicCardEffectFrame
      ? `View public ${publicCardEffectFrame.accessibleLabel}. Parked cards: ${groupDescription}.`
      : `View public ${card.actorName}'s ${physicalCards.length > 1 ? `${physicalCards.length}-card group` : definition.name} card details, ${groupDescription}${publicOrdinalLabel}`
    : publicFrameAccessible ? publicCardEffectFrame?.accessibleLabel : undefined;
  return <button
    type="button"
    role={publicFrameAccessible && !inspectable ? "group" : undefined}
    className={`public-card-journey-card ${card.phase === "reveal" ? "is-revealing" : ""} ${card.phase === "move" ? "is-moving" : ""} ${card.phase === "parked" ? "is-parked" : ""} ${card.layoutPending ? "is-layout-pending" : ""} ${harvestHistory && card.phase === "parked" ? "is-harvest-history-parked" : ""} ${passive ? "is-harvest-history-passive" : ""} ${className} ${lustCostFrame ? "is-lust-cost" : ""} ${publicCardEffectFrame ? "is-public-effect-frame" : ""} ${inspectable ? "is-inspectable" : ""}`}
    disabled={!inspectable && !publicFrameAccessible}
    tabIndex={inspectable ? 0 : -1}
    aria-hidden={positionUnavailable ? true : inspectable || publicFrameAccessible ? undefined : true}
    aria-label={accessibleName}
    onClick={inspectable ? (event) => {
      const requestedCardId = (event.target as HTMLElement).closest<HTMLElement>("[data-public-card-effect-frame-card-id]")?.dataset.publicCardEffectFrameCardId;
      const inspectedCard = physicalCards.find((face) => face.id === requestedCardId) ?? card.cardFace;
      onInspectCard?.(inspectedCard, event.currentTarget);
    } : undefined}
    data-public-card-journey-event-id={card.eventId}
    data-public-card-journey-actor-id={card.actorId}
    data-public-card-journey-card-id={card.cardFace.id}
    data-public-zone-transition-event-id={action.zoneTransition?.eventId === card.eventId ? card.eventId : undefined}
    data-public-zone-transition-card-id={action.zoneTransition?.physicalCardId === card.cardFace.id ? card.cardFace.id : undefined}
    data-public-zone-transition-destination={action.zoneTransition?.eventId === card.eventId ? "EQUIPMENT" : undefined}
    data-public-zone-transition-owner-id={action.zoneTransition?.ownerId}
    data-public-zone-transition-slot={action.zoneTransition?.slot}
    data-public-card-journey-card-ids={(card.cardFaces ?? [card.cardFace]).map((face) => face.id).join(",")}
    data-public-card-journey-role={card.role}
    data-public-card-journey-preserve-authentic-position={preservePendingParking ? "true" : undefined}
    data-public-card-journey-author-reservation={authorReservation ? "true" : undefined}
    data-public-card-journey-author-reservation-left={authorReservation?.left}
    data-public-card-journey-author-reservation-top={authorReservation?.top}
    data-public-card-journey-author-reservation-width={authorReservation?.width}
    data-public-card-journey-author-reservation-height={authorReservation?.height}
    data-public-card-harvest-history-parked={harvestHistory && card.phase === "parked" ? "true" : undefined}
    data-public-card-compact-response={(harvestHistory || card.role === "response") && card.rect.width < parkedCardSize().width ? "true" : undefined}
    data-harvest-root-parked={harvestRootParked ? "true" : undefined}
    data-public-card-journey-phase={card.phase}
    data-public-card-journey-size={size}
    data-public-card-journey-layout-pending={card.layoutPending ? "true" : "false"}
    data-public-card-reveal-readiness={primary && card.phase === "reveal" && sharedStageIdentity
      ? sharesCurrentStageIdentity && sharedPublicStage?.revealReady ? "ready" : "pending" : undefined}
    data-public-card-journey-layout-reason={card.layoutChangeReason}
    data-public-card-journey-effect-parking-placement={card.parkedPublicEffect?.placement}
    data-public-card-journey-effect-parking-owner-id={card.parkedPublicEffect?.ownerId}
    data-public-card-journey-reveal-started-at={card.revealStartedAtIso ?? undefined}
    data-public-card-journey-target-left={parkingTargetKnown ? card.target.left : undefined}
    data-public-card-journey-target-top={parkingTargetKnown ? card.target.top : undefined}
    data-public-card-journey-target-width={parkingTargetKnown ? card.target.width : undefined}
    data-public-card-journey-target-height={parkingTargetKnown ? card.target.height : undefined}
    data-public-card-primary-card={primary ? "true" : undefined}
    data-public-stage-layout-identity={sharesCurrentStageIdentity ? sharedPublicStage?.layout.identity : undefined}
    data-public-card-journey-parking-side={parkingSide}
    data-public-card-journey-ordinal={card.globalOrdinal}
    data-public-card-inspectable={inspectable ? "true" : "false"}
    data-public-card-copy-anchor-event-id={card.eventId}
    style={{
      left: localCardRect?.left ?? journeyLeft,
      top: localCardRect?.top ?? journeyTop,
      width: localCardRect ? localCardRect.right - localCardRect.left : card.rect.width,
      height: localCardRect ? localCardRect.bottom - localCardRect.top : card.rect.height,
      ["--public-card-journey-move-duration"]: `${Math.max(0, Math.round(card.moveRemainingMs ?? MOVE_DURATION_MS))}ms`,
      ...(positionUnavailable ? { visibility: "hidden", pointerEvents: "none" } : {}),
    } as CSSProperties}
  >
    {publicCardEffectFrame && renderedFrameLayout && card.phase !== "parked" && <span
      className={`public-card-effect-frame-panel public-card-lust-cost-frame-panel${card.phase === "move" ? " is-moving" : ""}`}
      aria-hidden="true"
      data-public-card-frame-kind={publicCardEffectFrame.effectId === "diao_chan_lust" ? "DIAO_CHAN_LUST_COST" : publicCardEffectFrame.effectClass}
      data-public-card-frame-class={publicCardEffectFrame.effectClass}
      data-public-card-frame-effect-id={publicCardEffectFrame.effectId}
      data-public-card-frame-activation-owner-id={publicCardEffectFrame.activationOwnerId}
      data-public-card-frame-material-owner-ids={frameMaterials.map((material) => material.ownerId ?? "deck").join(",")}
      data-public-card-frame-material-card-ids={frameMaterials.map((material) => material.card.id).join(",")}
      data-public-card-frame-material-count={frameMaterials.length}
      data-public-card-frame-event-id={publicCardEffectFrame.activationEventId ?? publicCardEffectFrame.eventId}
      data-public-card-frame-card-event-id={card.eventId}
      data-public-card-frame-preferred-lane-top-offset={publicCardEffectFrame.preferredLaneTopOffset ?? 0}
      data-public-card-frame-root-event-id={publicCardEffectFrame.rootEventId}
      data-public-card-frame-root-resolution-id={publicCardEffectFrame.rootResolutionId}
      style={{
        left: -renderedFrameLayout.cardOffsetLeft,
        top: -renderedFrameLayout.cardOffsetTop,
        width: renderedFrameLayout.frameWidth,
        height: renderedFrameLayout.frameHeight,
        transform: `scale(${(localCardRect ? localCardRect.right - localCardRect.left : card.rect.width) / REVEAL_CARD.width})`,
        transformOrigin: `${renderedFrameLayout.cardOffsetLeft}px ${renderedFrameLayout.cardOffsetTop}px`,
        opacity: card.phase === "move" ? 0 : 1,
      }}
    >
      <PublicCardEffectFrameTitle frame={publicCardEffectFrame} lustCostFrame={Boolean(lustCostFrame)} />
      <PublicCardEffectFrameMaterialCount frame={publicCardEffectFrame} materialCount={frameMaterials.length} />
      <span
        className="public-card-effect-frame-materials"
        data-public-card-frame-grid-columns={renderedFrameLayout.columns}
        style={{
          left: renderedFrameLayout.cardOffsetLeft,
          top: renderedFrameLayout.cardOffsetTop,
          width: renderedFrameLayout.gridWidth,
          height: renderedFrameLayout.gridHeight,
          gridTemplateColumns: `repeat(${renderedFrameLayout.columns}, minmax(0, 1fr))`,
          gridAutoRows: renderedFrameLayout.cardHeight,
          columnGap: renderedFrameLayout.gap,
          rowGap: renderedFrameLayout.gap,
        }}
      >
        {frameMaterials.map(({ card: face, ownerId }, index) => <span
          className="public-card-effect-frame-material"
          key={face.id}
          data-public-card-effect-frame-material-owner-id={ownerId ?? "deck"}
          data-public-card-effect-frame-material-index={index}
        ><CardFace card={face} publicEffectFrameCardId={face.id} /></span>)}
      </span>
    </span>}
    {card.cardFaces && card.cardFaces.length > 1
      ? <span className="public-card-duel-physical-group">
        {card.cardFaces.map((face, index) => <span
          className="public-card-duel-physical-face"
          key={face.id}
          data-public-card-effect-frame-card-id={face.id}
          style={{ left: `calc(50% + ${(index - (card.cardFaces!.length - 1) / 2) * 6}px)`, zIndex: index + 1 }}
        ><CardFace card={face} /></span>)}
      </span>
      : <CardFace card={card.cardFace} publicEffectFrameCardId={publicCardEffectFrame ? card.cardFace.id : undefined} />}
    {(publicCardEffectFrame?.title ?? parkedEffectLabel) && card.phase === "parked" && <small className="public-card-lust-cost-parked">{publicCardEffectFrame?.title ?? parkedEffectLabel}</small>}
    {card.semanticLabel && <small className="public-card-journey-semantic">{card.semanticLabel}</small>}
    {showOrdinal && card.globalOrdinal !== undefined && <small className="public-card-journey-ordinal" aria-hidden="true">#{card.globalOrdinal}</small>}
  </button>;
}

function attackDodgeJourneyLifecycleKey(roomCode: string, rootEventId: string, scopeKey: string, eventId: string) {
  return `${roomCode}|${rootEventId}|${scopeKey}|${eventId}`;
}

function rememberAttackDodgeJourneyLifecycle(key: string, lifecycle: AttackDodgeJourneyLifecycle) {
  attackDodgeJourneyLifecycles.delete(key);
  attackDodgeJourneyLifecycles.set(key, lifecycle);
  while (attackDodgeJourneyLifecycles.size > MAX_RETAINED_ATTACK_DODGE_JOURNEYS) {
    const oldestKey = attackDodgeJourneyLifecycles.keys().next().value;
    if (!oldestKey) break;
    attackDodgeJourneyLifecycles.delete(oldestKey);
  }
}

function cardRectsMatch(left: CardRect | null, right: CardRect | null) {
  if (!left || !right) return left === right;
  const epsilon = 0.25;
  return Math.abs(left.left - right.left) < epsilon
    && Math.abs(left.top - right.top) < epsilon
    && Math.abs(left.width - right.width) < epsilon
    && Math.abs(left.height - right.height) < epsilon;
}

function journeyGeometryMatches(left: JourneyState, right: JourneyState) {
  return left.scopeKey === right.scopeKey
    && cardRectsMatch(left.center, right.center)
    && left.cards.length === right.cards.length
    && left.cards.every((card, index) => {
      const other = right.cards[index];
      return card.eventId === other.eventId
        && card.phase === other.phase
        && cardRectsMatch(card.rect, other.rect)
        && cardRectsMatch(card.target, other.target);
    });
}

function withFirstQueuedAttackDodgeReveal(cards: JourneyCard[], center: CardRect): JourneyCard[] {
  if (cards.some((card) => card.phase === "reveal" || card.phase === "move")) return cards;
  const firstQueuedIndex = cards.findIndex((card) => card.phase === "queued");
  if (firstQueuedIndex < 0) return cards;
  return cards.map((card, index) => index === firstQueuedIndex
    ? {
      ...card,
      phase: "reveal" as const,
      rect: center,
      revealStartedAtMs: null,
      revealStartedAtIso: null,
      revealElapsedMs: 0,
      revealRemainingMs: STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
    }
    : card);
}

// Single-target and Attack/Dodge use standard Hand-card proportions; Duel uses
// the larger family-specific reveal before shrinking to its parked history.
// Match the mobile Hand CardFace dimensions so the centre reveal is plainly
// readable before it shrinks to the 48×72 parked thumbnail.
const REVEAL_CARD = { width: 90, height: 135 };
const DUEL_REVEAL_CARD = { width: 90, height: 135 };
const HARVEST_MOBILE_RESPONSE_CARD = { width: 32, height: 48 };
const PUBLIC_CARD_ANNOUNCEMENT_MAX_WIDTH = 520;
const PUBLIC_CARD_ANNOUNCEMENT_GAP = 7;
const STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS = 4000;
const DUEL_REVEAL_HOLD_MS = 4000;
const MOVE_DURATION_MS = 380;

export function shouldDirectParkPublicJourney(
  action: PublicCardDisplayAction,
  role: JourneyCard["role"],
  hasProvenParkingTarget: boolean,
  phoneViewport: boolean,
): boolean {
  return phoneViewport
    && hasProvenParkingTarget
    && (role === "root" || role === "response")
    && action.motion?.type !== "zone-transition"
    && action.cardFace?.kind !== "BumperHarvest"
    && !action.publicCardEffectFrame
    && !action.lustCostFrame
    && action.motion?.type !== "lust-cost";
}

function directParkPublicJourneyOnPhone(
  action: PublicCardDisplayAction,
  role: JourneyCard["role"],
  hasProvenParkingTarget: boolean,
): boolean {
  return shouldDirectParkPublicJourney(action, role, hasProvenParkingTarget,
    typeof window !== "undefined" && window.matchMedia("(max-width: 520px)").matches);
}

function boundCardRect(left: number, top: number, width: number, height: number): CardRect {
  const maxLeft = Math.max(8, window.innerWidth - width - 8);
  const maxTop = Math.max(8, window.innerHeight - height - 8);
  return {
    left: Math.min(maxLeft, Math.max(8, left)),
    top: Math.min(maxTop, Math.max(8, top)),
    width,
    height,
  };
}

type BattlefieldCenterCardSafety = {
  stationarySurface?: PublicStageStationarySurface;
  preferredEffectFrameTopOffset?: number;
};

function committedEquipmentSlotTarget(action: PublicCardDisplayAction, event: JourneyCard): CardRect | null {
  const claim = action.zoneTransition;
  if (!claim || claim.eventId !== event.eventId || claim.physicalCardId !== event.cardFace.id
    || event.actorId !== action.sourceId) return null;
  const slot = [...document.querySelectorAll<HTMLElement>("[data-player-equipment-slot-owner][data-slot]")]
    .find((candidate) => candidate.dataset.playerEquipmentSlotOwner === claim.ownerId
      && candidate.dataset.slot === claim.slot);
  if (!slot || ![...slot.querySelectorAll<HTMLElement>("[data-equipment-id]")]
    .some((face) => face.dataset.equipmentId === claim.physicalCardId)) return null;
  const rect = slot.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function battlefieldCenterCard(
  size: { width: number; height: number } = REVEAL_CARD,
  safety: BattlefieldCenterCardSafety = {},
): CardRect | null {
  const table = document.querySelector<HTMLElement>(".play-table");
  const coordinates = table ? publicStageCoordinateSpaceForTable(table) : null;
  if (!table || !coordinates) return null;
  const placement = publicStationaryCardPlacement(table, size, coordinates,
    safety.stationarySurface === "effect-frame" ? safety.preferredEffectFrameTopOffset ?? 0 : 0);
  if (!placement) return null;
  const { clientRect } = placement;
  return { left: clientRect.left, top: clientRect.top, width: size.width, height: size.height };
}

/** Full-size public reveal placement at the canonical nominal table-local centre. */
export function stationaryBattlefieldCardRect(size: { width: number; height: number }) {
  return battlefieldCenterCard(size);
}

function battlefieldPublicEffectFrameCard(): CardRect | null;
function battlefieldPublicEffectFrameCard(frame: PublicCardEffectFrameView): CardRect | null;
function battlefieldPublicEffectFrameCard(frame?: PublicCardEffectFrameView): CardRect | null {
  const table = document.querySelector<HTMLElement>(".play-table");
  const frameLayout = publicCardEffectFrameLayout(frame?.materials.length ?? 1, window.innerWidth, window.innerHeight, frame);
  const expectedCardIds = frame?.materials.map(({ card }) => card.id).join(",") ?? "";
  const expectedOwnerIds = frame?.materials.map(({ ownerId }) => ownerId ?? "deck").join(",") ?? "";
  const renderedFrame = frame && table
    ? [...table.querySelectorAll<HTMLElement>(".public-card-effect-frame-panel")].find((element) =>
      element.closest<HTMLElement>(".public-card-journey-card")?.dataset.publicCardJourneyEventId === frame.eventId
      && element.closest<HTMLElement>(".public-card-journey-card")?.dataset.publicCardJourneyCardIds === expectedCardIds
      && element.dataset.publicCardFrameEffectId === frame.effectId
      && element.dataset.publicCardFrameEventId === (frame.activationEventId ?? frame.eventId)
      && element.dataset.publicCardFrameCardEventId === frame.eventId
      && (element.dataset.publicCardFrameRootEventId ?? "") === (frame.rootEventId ?? "")
      && (element.dataset.publicCardFrameRootResolutionId ?? "") === (frame.rootResolutionId ?? "")
      && element.dataset.publicCardFrameMaterialCardIds === expectedCardIds
      && element.dataset.publicCardFrameMaterialOwnerIds === expectedOwnerIds)
    : undefined;
  const primary = renderedFrame?.closest<HTMLElement>(".public-card-journey-card");
  const renderedFootprint = primary && renderedFrame
    ? publicEffectFrameVisualFootprint(primary)
    : null;
  // Once the committed frame exists, an incomplete DOM footprint is not a
  // license to position from only its panel or first material. Wait for the
  // validated complete title + all physical material faces instead.
  if (renderedFrame && !renderedFootprint) return null;
  const renderedFrameRect = renderedFrame?.getBoundingClientRect();
  const renderedCard = frame && renderedFrame
    ? [...renderedFrame.querySelectorAll<HTMLElement>("[data-public-card-effect-frame-card-id]")]
      .find((element) => element.dataset.publicCardEffectFrameCardId === frame.materials[0]?.card.id)
    : undefined;
  const renderedCardRect = renderedCard?.getBoundingClientRect();
  const measuredRects = [renderedFrameRect, renderedCardRect]
    .filter((rect): rect is DOMRect => Boolean(rect && rect.width > 0 && rect.height > 0));
  const measuredFrame = renderedFootprint?.rect ?? (measuredRects.length > 0 ? {
    left: Math.min(...measuredRects.map((rect) => rect.left)),
    top: Math.min(...measuredRects.map((rect) => rect.top)),
    right: Math.max(...measuredRects.map((rect) => rect.right)),
    bottom: Math.max(...measuredRects.map((rect) => rect.bottom)),
  } : null);
  const frameWidth = measuredFrame ? measuredFrame.right - measuredFrame.left : frameLayout.frameWidth;
  const frameHeight = measuredFrame ? measuredFrame.bottom - measuredFrame.top : frameLayout.frameHeight;
  const cardOffsetLeft = measuredFrame && renderedCardRect
    ? renderedCardRect.left - measuredFrame.left : frameLayout.cardOffsetLeft;
  const cardOffsetTop = measuredFrame && renderedCardRect
    ? renderedCardRect.top - measuredFrame.top : frameLayout.cardOffsetTop;
  const canonicalFrame = battlefieldCenterCard({ width: frameWidth, height: frameHeight }, {
    stationarySurface: "effect-frame",
    preferredEffectFrameTopOffset: frame?.preferredLaneTopOffset ?? 0,
  });
  if (!canonicalFrame) return null;
  return {
    left: canonicalFrame.left + cardOffsetLeft,
    top: canonicalFrame.top + cardOffsetTop,
    width: REVEAL_CARD.width,
    height: REVEAL_CARD.height,
  };
}

function effectFramePrimaryRectFromSharedLayout(
  shared: SharedPublicStageLayout | null,
  input: { roomId: string; rootEventId: string; interactionId?: string | null; eventId: string; cardId: string; viewerId: string },
): CardRect | null {
  if (!shared || !publicStageEffectFrameRevealTargetMatches({
    layout: shared.layout,
    roomId: input.roomId,
    rootEventId: input.rootEventId,
    interactionId: input.interactionId,
    eventId: input.eventId,
    cardId: input.cardId,
    viewerId: input.viewerId,
    primaryEventId: shared.primaryEventId,
    primaryCardId: shared.primaryCardId,
    announcementEventId: shared.announcementEventId,
    announcementAnchorEventId: shared.announcementAnchorEventId,
  })) return null;
  const primaryOrigin = publicStagePrimaryOriginFromVisualRect(shared.layout.card, shared.primaryOffset);
  if (!primaryOrigin) return null;
  return {
    left: primaryOrigin.left,
    top: primaryOrigin.top,
    width: REVEAL_CARD.width,
    height: REVEAL_CARD.height,
  };
}

function publicStageRejectedEffectFrame(frame: PublicCardEffectFrameView, input: {
  roomId: string;
  rootEventId: string;
  interactionId?: string | null;
  viewerId: string;
}): boolean {
  const table = document.querySelector<HTMLElement>(".play-table");
  if (!table || table.dataset.publicStageLayoutStatus !== "unavailable"
    || table.dataset.publicStageLayoutPhase !== "reveal") return false;
  try {
    const failure = JSON.parse(table.dataset.publicStageLayoutFailure ?? "null") as {
      roomId?: string; rootEventId?: string; scopeId?: string; interactionId?: string | null;
      eventId?: string; cardId?: string; viewerId?: string; phase?: string;
    } | null;
    return Boolean(failure
      && failure.roomId === input.roomId
      && (failure.rootEventId ?? failure.scopeId) === input.rootEventId
      && (failure.interactionId ?? null) === (input.interactionId ?? null)
      && failure.eventId === frame.eventId
      && failure.cardId === frame.materials[0]?.card.id
      && failure.viewerId === input.viewerId
      && failure.phase === "REVEAL");
  } catch {
    return false;
  }
}

function isKirinBowPublicEffectFrame(frame?: PublicCardEffectFrameView): frame is PublicCardEffectFrameView {
  return frame?.effectId === "kirin_bow_damage_about_to_apply";
}

function battlefieldLustCostCard(): CardRect | null {
  return battlefieldPublicEffectFrameCard();
}

function battlefieldPublicEffectFrame(card: CardRect, frame?: PublicCardEffectFrameView): CardRect {
  const layout = publicCardEffectFrameLayout(frame?.materials.length ?? 1, window.innerWidth, window.innerHeight, frame);
  return {
    left: card.left - layout.cardOffsetLeft,
    top: card.top - layout.cardOffsetTop,
    width: layout.frameWidth,
    height: layout.frameHeight,
  };
}

function battlefieldLustDuelAnnouncementAnchor(card: CardRect): CardRect {
  return battlefieldPublicEffectFrame(card);
}

function hasPaintedLargePublicEffectFrame(
  eventId: string,
  frame: PublicCardEffectFrameView,
  identity: { roomId: string; rootEventId: string; interactionId?: string | null; viewerId: string },
  element: HTMLElement,
  onFailure?: (reason: string) => void,
  allowPendingSameEventLayout = false,
): boolean {
  const fail = (reason: string) => {
    onFailure?.(reason);
    return false;
  };
  const paintEnabledThroughAncestors = (node: HTMLElement) => {
    for (let current: HTMLElement | null = node; current; current = current.parentElement) {
      const style = window.getComputedStyle(current);
      if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse"
        || Number(style.opacity) <= 0 || style.contentVisibility === "hidden") return false;
    }
    return node.isConnected && node.getClientRects().length > 0;
  };
  const table = element.closest<HTMLElement>(".play-table");
  if (!table) return fail("missing-play-table");
  const shared = committedPublicStageLayout(table);
  if (!shared) return fail("missing-shared-layout");
  if (!shared.revealReady && !allowPendingSameEventLayout) return fail("shared-reveal-not-ready");
  const expectedCardIds = frame.materials.map(({ card }) => card.id).join(",");
  const expectedOwnerIds = frame.materials.map(({ ownerId }) => ownerId ?? "deck").join(",");
  const panels = [...element.querySelectorAll<HTMLElement>(".public-card-effect-frame-panel")];
  const panel = panels.length === 1 ? panels[0] : null;
  const primaryStyle = window.getComputedStyle(element);
  const footprint = panel ? publicEffectFrameVisualFootprint(element) : null;
  const display = element.closest<HTMLElement>(".public-card-display");
  const announcement = display && shared ? [...display.querySelectorAll<HTMLElement>("[data-public-card-announcement='true']")]
    .find((candidate) => candidate.dataset.publicCardAnnouncementEventId === shared?.announcementEventId
      && (candidate.dataset.publicCardAnnouncementCopyKey ?? "") === shared.announcementCopyKey) : null;
  if (!panel || !footprint
    || !display || !announcement
    || frame.eventId !== eventId
    || element.dataset.publicCardJourneyEventId !== eventId
    || element.dataset.publicCardJourneyCardIds !== expectedCardIds
    || panel.dataset.publicCardFrameEffectId !== frame.effectId
    || panel.dataset.publicCardFrameEventId !== (frame.activationEventId ?? frame.eventId)
    || panel.dataset.publicCardFrameCardEventId !== frame.eventId
    || (panel.dataset.publicCardFrameRootEventId ?? "") !== (frame.rootEventId ?? "")
    || (panel.dataset.publicCardFrameRootResolutionId ?? "") !== (frame.rootResolutionId ?? "")
    || panel.dataset.publicCardFrameMaterialCardIds !== expectedCardIds
    || panel.dataset.publicCardFrameMaterialOwnerIds !== expectedOwnerIds
    || Number(panel.dataset.publicCardFrameMaterialCount) !== frame.materials.length
    || !publicStageEffectFrameRevealTargetMatches({
      layout: shared.layout,
      roomId: identity.roomId,
      rootEventId: identity.rootEventId,
      interactionId: identity.interactionId,
      eventId: frame.eventId,
      cardId: frame.materials[0]?.card.id ?? "",
      viewerId: identity.viewerId,
      primaryEventId: shared.primaryEventId,
      primaryCardId: shared.primaryCardId,
      announcementEventId: shared.announcementEventId,
      announcementAnchorEventId: shared.announcementAnchorEventId,
    })) return fail("frame-or-h4-public-identity-mismatch");

  const primaryRect = element.getBoundingClientRect();
  const visualRect = footprint.rect;
  const layoutCard = shared.layout.card;
  const announcementStyle = window.getComputedStyle(announcement);
  const announcementPaint = measuredPublicH4PaintRect(announcement);
  const tableRect = table.getBoundingClientRect();
  const tableCoordinates = publicStageCoordinateSpaceForTable(table);
  const localPrimaryRect = tableCoordinates ? publicStageRectToTableLocal({
    left: primaryRect.left, top: primaryRect.top, right: primaryRect.right, bottom: primaryRect.bottom,
  }, tableCoordinates) : null;
  const withinOnePixel = (left: number, right: number) => Math.abs(left - right) <= 1;
  const consoleGuidance = document.querySelector<HTMLElement>(".local-player-dock .console-guidance");
  if (!consoleGuidance) return fail("missing-console-boundary");
  const consoleStyle = window.getComputedStyle(consoleGuidance);
  const consoleRect = consoleGuidance.getBoundingClientRect();
  if (consoleStyle.display === "none" || consoleStyle.visibility === "hidden" || Number(consoleStyle.opacity) <= 0
    || consoleRect.width <= 0 || consoleRect.height <= 0) return fail("console-boundary-not-paint-enabled");
  const consoleTop = consoleRect.top;
  if (!element.isConnected || element.getClientRects().length === 0
    || primaryStyle.display === "none" || primaryStyle.visibility === "hidden" || Number(primaryStyle.opacity) <= 0
    || !paintEnabledThroughAncestors(element) || !paintEnabledThroughAncestors(panel)) {
    return fail("frame-not-paint-enabled");
  }
  if (!announcement.isConnected || announcement.getClientRects().length === 0
    || announcementStyle.display === "none" || announcementStyle.visibility === "hidden"
    || Number(announcementStyle.opacity) <= 0 || !announcementPaint
    || !paintEnabledThroughAncestors(announcement)) return fail("matching-h4-not-paint-enabled");
  if (!localPrimaryRect
    || !withinOnePixel(localPrimaryRect.right - localPrimaryRect.left, REVEAL_CARD.width)
    || !withinOnePixel(localPrimaryRect.bottom - localPrimaryRect.top, REVEAL_CARD.height)) {
    return fail("card-face-size-mismatch");
  }
  if (!withinOnePixel(visualRect.left, layoutCard.left) || !withinOnePixel(visualRect.top, layoutCard.top)
    || !withinOnePixel(visualRect.right, layoutCard.right) || !withinOnePixel(visualRect.bottom, layoutCard.bottom)) {
    return fail("frame-not-at-canonical-anchor");
  }
  if (visualRect.left < tableRect.left || visualRect.right > tableRect.right
    || visualRect.top < tableRect.top || visualRect.bottom > Math.min(tableRect.bottom, consoleTop)) return fail("frame-outside-safe-scene");
  return true;
}

type PublicCardPaintIdentity = {
  roomId: string;
  rootEventId: string;
  interactionId?: string | null;
  viewerId: string;
  allowPendingSameEventLayout?: boolean;
  requireVisibleH4?: { eventId: string; owner: string };
} | {
  viewerId: string;
  requireVisibleH4: { eventId: string; owner: string };
};

function hasPaintedLargePublicCard(
  eventId: string,
  size: Pick<CardRect, "width" | "height">,
  effectFrame?: PublicCardEffectFrameView,
  identity?: PublicCardPaintIdentity,
  onFailure?: (reason: string) => void,
) {
  const elements = [...document.querySelectorAll<HTMLElement>("[data-public-card-journey-event-id]")]
    .filter((candidate) => candidate.dataset.publicCardJourneyEventId === eventId);
  if (elements.length !== 1) {
    onFailure?.(elements.length === 0 ? "missing-card-node" : "ambiguous-card-nodes");
    return false;
  }
  const element = elements[0];
  if (effectFrame) return Boolean(identity && "roomId" in identity
    && hasPaintedLargePublicEffectFrame(eventId, effectFrame, identity, element, onFailure, identity.allowPendingSameEventLayout === true));
  const face = element?.querySelector<HTMLElement>(".played-card");
  const rect = element?.getBoundingClientRect();
  const table = element?.closest<HTMLElement>(".play-table");
  const coordinates = table ? publicStageCoordinateSpaceForTable(table) : null;
  const localRect = rect && coordinates ? publicStageRectToTableLocal({
    left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
  }, coordinates) : null;
  const elementStyle = element ? window.getComputedStyle(element) : null;
  const faceStyle = face ? window.getComputedStyle(face) : null;
  const matchingH4 = identity?.requireVisibleH4
    ? [...document.querySelectorAll<HTMLElement>("[data-public-h4-event-id]")].filter((candidate) =>
      candidate.dataset.publicH4EventId === identity.requireVisibleH4?.eventId
      && candidate.dataset.publicH4Owner === identity.requireVisibleH4.owner
      && candidate.dataset.publicCardAnnouncementDelivery === "VISIBLE"
      && candidate.isConnected && candidate.getClientRects().length > 0
      && paintEnabledThroughAncestors(candidate)
      && window.getComputedStyle(candidate).visibility !== "hidden"
      && window.getComputedStyle(candidate).display !== "none"
      && Number(window.getComputedStyle(candidate).opacity) > 0).length === 1
    : true;
  const painted = Boolean(element && face && rect && elementStyle && faceStyle && matchingH4
    && element.isConnected && element.getClientRects().length > 0
    && elementStyle.display !== "none" && elementStyle.visibility !== "hidden" && Number(elementStyle.opacity) > 0
    && faceStyle.display !== "none" && faceStyle.visibility !== "hidden" && Number(faceStyle.opacity) > 0
    && Boolean(localRect)
    && Math.abs((localRect?.right ?? 0) - (localRect?.left ?? 0) - size.width) < 1
    && Math.abs((localRect?.bottom ?? 0) - (localRect?.top ?? 0) - size.height) < 1);
  if (!painted) onFailure?.(matchingH4 ? "card-face-not-paint-enabled" : "matching-h4-not-paint-enabled");
  return painted;
}

function observeUntilPublicCardFirstPaint(table: HTMLElement | null, check: () => boolean): () => void {
  let stopped = false;
  let scheduled = false;
  let firstFrame = 0;
  let secondFrame = 0;
  const observedSizes = new Set<Element>();
  const relevantSelector = ".public-card-display, .public-card-journey-card, .public-card-effect-frame-panel, .public-card-display-journey-copy, [data-public-activity-chip='true'], .console-guidance";
  const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => schedule());
  const observeCurrentNodes = () => {
    if (!table || !resizeObserver) return;
    const nodes: Element[] = [table, ...table.querySelectorAll(relevantSelector)];
    for (const node of nodes) {
      if (observedSizes.has(node)) continue;
      observedSizes.add(node);
      resizeObserver.observe(node);
    }
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (firstFrame) window.cancelAnimationFrame(firstFrame);
    if (secondFrame) window.cancelAnimationFrame(secondFrame);
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
    window.removeEventListener("resize", schedule);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
  const runCheck = () => {
    scheduled = false;
    if (stopped || document.visibilityState !== "visible") return;
    if (check()) stop();
  };
  function schedule() {
    if (stopped || scheduled) return;
    scheduled = true;
    observeCurrentNodes();
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(runCheck);
    });
  }
  function onVisibilityChange() {
    if (document.visibilityState === "visible") schedule();
  }
  const mutationObserver = typeof MutationObserver === "undefined" || !table ? null : new MutationObserver((records) => {
    const relevant = records.some((record) => {
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      if (target === table) {
        if (record.type === "attributes") return ["data-public-stage-layout-status", "data-public-stage-layout-phase", "data-public-stage-layout-identity"].includes(record.attributeName ?? "");
        return [...record.addedNodes, ...record.removedNodes].some((node) => node instanceof Element
          && (node.matches(relevantSelector) || Boolean(node.querySelector(relevantSelector))));
      }
      return Boolean(target?.closest(relevantSelector));
    });
    if (!relevant) return;
    observeCurrentNodes();
    schedule();
  });
  observeCurrentNodes();
  mutationObserver?.observe(table!, { attributes: true, childList: true, subtree: true, characterData: true });
  window.addEventListener("resize", schedule);
  document.addEventListener("visibilitychange", onVisibilityChange);
  schedule();
  return stop;
}

function renderedJourneyCardRect(eventId: string): CardRect | null {
  const element = [...document.querySelectorAll<HTMLElement>("[data-public-card-journey-event-id]")]
    .find((candidate) => candidate.dataset.publicCardJourneyEventId === eventId);
  const rect = element?.getBoundingClientRect();
  return rect && rect.width > 0 && rect.height > 0
    ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    : null;
}

function actorParkedCard(actorId: string, cardIndex = 0, preferLocalAuthorDock = false): CardRect | null {
  const actorAnchors = [...document.querySelectorAll<HTMLElement>("[data-player-anchor]")]
    .filter((candidate) => candidate.dataset.playerAnchor === actorId);
  const visible = (candidate: HTMLElement) => {
    const rect = candidate.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const anchor = (preferLocalAuthorDock
    ? actorAnchors.find((candidate) => candidate.classList.contains("local-player-dock") && visible(candidate))
    : null)
    ?? actorAnchors.find(visible);
  if (!anchor) return null;
  const bounds = anchor.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return null;

  if (anchor.classList.contains("local-player-dock")) {
    return boundCardRect(bounds.left + 8 + cardIndex * (parkedCardSize().width + 6), bounds.top - parkedCardSize().height - 6, parkedCardSize().width, parkedCardSize().height);
  }

  const table = document.querySelector<HTMLElement>(".play-table");
  const board = document.querySelector<HTMLElement>(".player-board");
  const tableBounds = table?.getBoundingClientRect();
  const boardBounds = board?.getBoundingClientRect();
  const boardCenterX = boardBounds ? boardBounds.left + boardBounds.width / 2 : window.innerWidth / 2;
  const boardCenterY = boardBounds ? boardBounds.top + boardBounds.height / 2 : window.innerHeight / 2;
  const anchorCenterX = bounds.left + bounds.width / 2;
  const anchorCenterY = bounds.top + bounds.height / 2;
  const isUpperSeat = tableBounds ? anchorCenterY < tableBounds.top + tableBounds.height * 0.38 : anchorCenterY < boardCenterY;

  if (isUpperSeat) {
    const topGap = window.matchMedia("(max-width: 700px)").matches ? 0 : 6;
    return boundCardRect(anchorCenterX - parkedCardSize().width / 2 + cardIndex * (parkedCardSize().width + 6), bounds.bottom + topGap, parkedCardSize().width, parkedCardSize().height);
  }

  if (Math.abs(anchorCenterX - boardCenterX) > Math.abs(anchorCenterY - boardCenterY)) {
    const facesCenterFromLeft = anchorCenterX < boardCenterX;
    const left = facesCenterFromLeft
      ? bounds.right + 6 + cardIndex * (parkedCardSize().width + 6)
      : bounds.left - parkedCardSize().width - 6 - cardIndex * (parkedCardSize().width + 6);
    return boundCardRect(left, anchorCenterY - parkedCardSize().height / 2, parkedCardSize().width, parkedCardSize().height);
  }

  return boundCardRect(anchorCenterX - parkedCardSize().width / 2 + cardIndex * (parkedCardSize().width + 6), bounds.top - parkedCardSize().height - 6, parkedCardSize().width, parkedCardSize().height);
}

type SeatHistoryCardParking = { rect: CardRect; side: "local" | "top" | "left" | "right" };

const parkedEffectLabelMetricCache = new WeakMap<HTMLElement, Map<string, { left: number; top: number; right: number; bottom: number }>>();

type SeatHistoryCardParkingOptions = {
  cardSize?: Pick<CardRect, "width" | "height">;
  sameAuthorRects?: readonly CardRect[];
  extendNegationChainCollisionSlots?: boolean;
  onPlacementFailure?: (detail: Record<string, unknown>) => void;
  anchorLocalHero?: boolean;
  preferLocalAuthorDock?: boolean;
  protectSingleTargetControls?: boolean;
  avoidAuthorSeat?: boolean;
  protectInteractionControls?: boolean;
  allowStatusOverParked?: boolean;
  allowHarvestPoolOverlap?: boolean;
  allowAuthorPortraitEdgeOverlap?: boolean;
  preserveAuthorControls?: boolean;
  keepHarvestResponseNearAuthor?: boolean;
  placeKirinMaterialAbovePacReserve?: boolean;
  parkedEffectLabel?: string;
};

function measureParkedEffectLabelOffset(
  table: HTMLElement,
  cardSize: Pick<CardRect, "width" | "height">,
  labelText: string,
): { left: number; top: number; right: number; bottom: number } | null {
  if (!labelText.trim()) return null;
  const cacheKey = [labelText, cardSize.width, cardSize.height, window.innerWidth, window.innerHeight,
    table.closest<HTMLElement>(".game-shell")?.className ?? ""].join(":");
  const tableCache = parkedEffectLabelMetricCache.get(table) ?? new Map();
  parkedEffectLabelMetricCache.set(table, tableCache);
  const cached = tableCache.get(cacheKey);
  if (cached) return cached;
  const card = document.createElement("button");
  card.className = "public-card-journey-card is-parked is-public-effect-frame";
  card.dataset.publicCardJourneyPhase = "parked";
  card.dataset.publicCardJourneySize = "thumbnail";
  card.dataset.publicLayoutProbe = "true";
  card.setAttribute("aria-hidden", "true");
  card.inert = true;
  card.style.cssText = `position:absolute!important;left:-10000px!important;top:0!important;width:${cardSize.width}px!important;height:${cardSize.height}px!important;box-sizing:border-box!important;padding:0!important;border:0!important;margin:0!important;transform:none!important;transition:none!important;overflow:visible!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important`;
  const label = document.createElement("small");
  label.className = "public-card-lust-cost-parked";
  label.textContent = labelText;
  card.append(label);
  table.append(card);
  const cardRect = card.getBoundingClientRect();
  const labelRect = label.getBoundingClientRect();
  card.remove();
  if (cardRect.width <= 0 || cardRect.height <= 0 || labelRect.width <= 0 || labelRect.height <= 0) return null;
  const offset = {
    left: labelRect.left - cardRect.left,
    top: labelRect.top - cardRect.top,
    right: labelRect.right - cardRect.left,
    bottom: labelRect.bottom - cardRect.top,
  };
  tableCache.set(cacheKey, offset);
  return offset;
}

function seatHistoryParkingProtectedSelectors(options: SeatHistoryCardParkingOptions) {
  if (!options.protectInteractionControls) return [];
  return [
    ".console-guidance", ".decision-status", ".public-card-display-journey-copy", "[data-public-card-announcement='true']",
    ...(options.allowStatusOverParked ? [] : [".public-activity-chip", "[data-public-activity-chip]"]),
    ".visible-countdown", ".stage-system-cluster",
    ".local-judgement-cards",
    ".local-dock-zones", ".local-status-panel", ".local-equipment-panel", ".local-hand-section",
    ".local-hand-rail [data-hand-card-id]", ".local-hand-rail button", ".turn-controls", ".turn-controls button",
    // The picker stage measures the real root/author reservation and moves
    // itself around that geometry. Making the author solver also avoid the
    // panel creates a two-way layout dependency and can invalidate both slots.
    ...(options.protectSingleTargetControls ? [".opponent-inspection-floating-shell", ".target-card-picker-panel"] : []),
    ...(options.allowHarvestPoolOverlap ? [
      // The panel itself is a soft overlay for a parked Harvest history mini.
      // Keep the real choice faces and their Info/selection controls as hard
      // obstacles for any part of the miniature that remains visible.
      ".harvest-card-choice", ".harvest-card-select", ".harvest-card-info", ".card-pool-decision-footer button", ".harvest-confirm-row button",
    ] : [
      ".harvest-choice-panel", ".harvest-choice-heading",
      ".harvest-card-choice", ".harvest-card-select", ".harvest-card-info", ".card-pool-decision-footer button", ".harvest-confirm-row button",
    ]),
    ...(options.preserveAuthorControls ? [
      ".test-view-switch-button", ".opponent-seat-inspect-button", ".opponent-player-name",
      ".opponent-player-name-strip", ".opponent-status-equipment-strip", ".opponent-hp-chip",
      ".opponent-equipment-summary",
    ] : []),
  ];
}

function clippedElementBounds(element: HTMLElement): DOMRect | null {
  const bounds = element.getBoundingClientRect();
  let left = bounds.left;
  let right = bounds.right;
  let top = bounds.top;
  let bottom = bounds.bottom;
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const style = window.getComputedStyle(parent);
    const parentRect = parent.getBoundingClientRect();
    const contentLeft = parentRect.left + parent.clientLeft;
    const contentTop = parentRect.top + parent.clientTop;
    if (style.overflowX !== "visible") {
      left = Math.max(left, contentLeft);
      right = Math.min(right, contentLeft + parent.clientWidth);
    }
    if (style.overflowY !== "visible") {
      top = Math.max(top, contentTop);
      bottom = Math.min(bottom, contentTop + parent.clientHeight);
    }
    if (right <= left || bottom <= top) return null;
  }
  return new DOMRect(left, top, right - left, bottom - top);
}

function seatHistoryCardParking(
  actorId: string,
  actorIndex: number,
  occupied: readonly CardRect[],
  options: SeatHistoryCardParkingOptions = {},
): SeatHistoryCardParking | null {
  const reportEarlyFailure = (reason: string, detail: Record<string, unknown> = {}) => {
    options.onPlacementFailure?.({ actorId, reason, ...detail });
  };
  const actorAnchors = [...document.querySelectorAll<HTMLElement>("[data-player-anchor]")]
    .filter((candidate) => candidate.dataset.playerAnchor === actorId);
  // The switched viewer remains represented in the opponent-seat DOM while
  // also appearing in the local dock. Public cards authored by that viewer
  // belong beside the live local Hero, not the stale opponent-seat copy.
  const visibleAnchor = actorAnchors.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  const preferredLocalDock = options.anchorLocalHero || options.preferLocalAuthorDock
    ? actorAnchors.find((candidate) => candidate.classList.contains("local-player-dock") && (() => {
      const rect = candidate.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })())
    : null;
  const anchor = preferredLocalDock
    ?? (options.anchorLocalHero
      ? actorAnchors.find((candidate) => candidate.classList.contains("local-player-dock"))
      : null)
    ?? visibleAnchor;
  const table = document.querySelector<HTMLElement>(".play-table");
  if (!anchor || !table) {
    reportEarlyFailure("author-anchor-or-table-missing", { actorAnchorCount: actorAnchors.length, hasTable: Boolean(table) });
    return null;
  }
  const seat = anchor.getBoundingClientRect();
  const tableRect = table.getBoundingClientRect();
  if (seat.width <= 0 || seat.height <= 0 || tableRect.width <= 0 || tableRect.height <= 0) {
    reportEarlyFailure("author-anchor-or-table-has-no-size", { actorRect: { left: seat.left, top: seat.top, width: seat.width, height: seat.height }, tableRect: { left: tableRect.left, top: tableRect.top, width: tableRect.width, height: tableRect.height } });
    return null;
  }
  const cardSize = options.cardSize ?? parkedCardSize();
  const isLocalAnchor = anchor.classList.contains("local-player-dock");
  if (options.protectInteractionControls && options.anchorLocalHero) {
    const authorHero = anchor.querySelector<HTMLElement>(isLocalAnchor ? ".local-hero-card" : ".opponent-hero-card");
    if (!authorHero) {
      reportEarlyFailure("author-hero-missing", { isLocalAnchor, anchorClass: anchor.className });
      return null;
    }
    const heroRect = authorHero.getBoundingClientRect();
    if (heroRect.width <= 0 || heroRect.height <= 0) {
      reportEarlyFailure("author-hero-has-no-size", { isLocalAnchor, heroRect: { left: heroRect.left, top: heroRect.top, width: heroRect.width, height: heroRect.height } });
      return null;
    }
    // Opponent Hero portraits end above their HP/equipment strip. Keep parked
    // Harvest cards clear of the complete seat, not just the portrait image.
    const authorSeatRect = options.avoidAuthorSeat && !isLocalAnchor ? seat : null;
    const identity = isLocalAnchor ? anchor.querySelector<HTMLElement>(".local-dock-identity") : null;
    const identityRect = identity?.getBoundingClientRect() ?? null;
    const protectedSelectors = seatHistoryParkingProtectedSelectors(options);
    const obstacleDetails = protectedSelectors.flatMap((selector) => [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && clippedElementBounds(element) !== null;
      })
      .flatMap((element) => {
        const rect = clippedElementBounds(element);
        return rect ? [{ selector, rect }] : [];
      }));
    const obstacles = obstacleDetails.map(({ rect }) => rect);
    const harvestPoolOverlayRects = options.allowHarvestPoolOverlap
      ? [...table.querySelectorAll<HTMLElement>(".harvest-choice-panel")]
        .flatMap((element) => {
          const style = window.getComputedStyle(element);
          const rect = style.display !== "none" && style.visibility !== "hidden" ? clippedElementBounds(element) : null;
          return rect ? [rect] : [];
        })
      : [];
    const otherAnchors = [...document.querySelectorAll<HTMLElement>("[data-player-anchor]")]
      .filter((candidate) => candidate !== anchor && candidate.dataset.playerAnchor !== actorId)
      .map((candidate) => candidate.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);
    const gap = 6;
    const heroCenterX = heroRect.left + heroRect.width / 2;
    const heroCenterY = heroRect.top + heroRect.height / 2;
    const harvestResponse = options.keepHarvestResponseNearAuthor === true;
    const harvestHistory = options.anchorLocalHero === true && options.protectInteractionControls === true;
    const compactFivePlayerPhone = window.matchMedia("(max-width: 520px)").matches
      && Boolean(document.querySelector<HTMLElement>(".player-board[data-player-count='5']"));
    const cascade = harvestResponse ? 0 : actorIndex * (cardSize.height + gap);
    const inViewport = (candidate: CardRect) => candidate.left >= 2
      && candidate.left + candidate.width <= window.innerWidth - 2
      && candidate.top >= 2
      && candidate.top + candidate.height <= window.innerHeight - 2;
    const visibleFront = (candidate: CardRect): { rect: CardRect; poolOccludedTail: number } | null => {
      const pool = harvestPoolOverlayRects.find((rect) => rectsOverlap(candidate, rect));
      if (!pool) return { rect: candidate, poolOccludedTail: 0 };
      const poolCoversCardWidth = pool.left <= candidate.left + 1 && pool.right >= candidate.left + candidate.width - 1;
      const visibleHeight = Math.min(candidate.height, pool.top - candidate.top);
      // The ordinal badge lives in the top 16px of a parked mini. Only accept
      // a pool overlap when that complete head stays visibly above the panel.
      if (!poolCoversCardWidth || visibleHeight < 16) return null;
      return {
        rect: { ...candidate, height: visibleHeight },
        poolOccludedTail: Math.max(0, candidate.height - visibleHeight),
      };
    };
    const isFree = (candidate: CardRect) => {
      const visible = visibleFront(candidate);
      if (!visible) return false;
      const seatClearance = window.matchMedia("(max-width: 700px)").matches && candidate.top >= seat.bottom - 0.5 ? 0 : 2;
      return inViewport(candidate)
        && !rectsOverlap(heroRect, visible.rect, seatClearance)
        && (!authorSeatRect || !rectsOverlap(authorSeatRect, visible.rect, seatClearance))
        && !occupied.some((rect) => rectsOverlap(rect, candidate, 2))
        && obstacles.every((rect) => !rectsOverlap(rect, visible.rect, 2))
        && otherAnchors.every((rect) => !rectsOverlap(rect, visible.rect, 2));
    };
    if (options.placeKirinMaterialAbovePacReserve) {
      const consoleGuidance = document.querySelector<HTMLElement>(".local-player-dock .console-guidance");
      const pacBand = consoleGuidance ? fixedPublicActivityBand(table, consoleGuidance,
        table.querySelector<HTMLElement>("[data-public-activity-chip='true']")) : null;
      const labelOffset = pacBand && options.parkedEffectLabel?.trim()
        ? measureParkedEffectLabelOffset(table, cardSize, options.parkedEffectLabel)
        : null;
      const placement = pacBand && labelOffset ? positionLabeledCardAboveBand({
        centerX: heroCenterX,
        bandTop: pacBand.top,
        card: cardSize,
        label: labelOffset,
        gap: 8,
      }) : null;
      const kirinMini = placement ? {
        left: placement.card.left,
        top: placement.card.top,
        width: placement.card.right - placement.card.left,
        height: placement.card.bottom - placement.card.top,
      } : null;
      const labeledFootprint = placement ? {
        left: placement.footprint.left,
        top: placement.footprint.top,
        width: placement.footprint.right - placement.footprint.left,
        height: placement.footprint.bottom - placement.footprint.top,
      } : null;
      if (!isLocalAnchor || !pacBand || !kirinMini || !labeledFootprint
        || labeledFootprint.left < tableRect.left + 8
        || labeledFootprint.left + labeledFootprint.width > tableRect.right - 8
        || labeledFootprint.top < tableRect.top + 8 || labeledFootprint.top + labeledFootprint.height > pacBand.top - 8
        || !isFree(labeledFootprint)) {
        reportEarlyFailure("kirin-material-no-safe-pac-reserve-slot", {
          pacReserve: pacBand, candidate: kirinMini, labeledFootprint, labelOffset,
          consoleGuidance: consoleGuidance ? (() => { const rect = consoleGuidance.getBoundingClientRect(); return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }; })() : null,
        });
        return null;
      }
      return { rect: kirinMini, side: "local" };
    }
    const belowSeatCandidates = (left: number): CardRect[] => {
      const firstTop = seat.bottom + (window.matchMedia("(max-width: 700px)").matches ? 0 : gap) + cascade;
      const tops = new Set([firstTop]);
      // A response mini must stay visibly attached to its real author. Do not
      // keep walking below obstacles (especially the Harvest pool), where a
      // technically clear slot becomes a misleading distant parking location.
      if (!options.keepHarvestResponseNearAuthor) {
        obstacles
          .filter((rect) => rect.right > left && rect.left < left + cardSize.width)
          .forEach((rect) => {
            const top = rect.bottom + gap + cascade;
            if (top > firstTop) tops.add(top);
          });
      }
      return [...tops].sort((a, b) => a - b).map((top) => ({ left, top, ...cardSize }));
    };
    const compactFivePlayerInnerLaneCandidates = (left: number): CardRect[] => {
      const centerTop = seat.top + (seat.height - cardSize.height) / 2;
      const tops = new Set([centerTop]);
      const announcementRects = [...document.querySelectorAll<HTMLElement>("[data-public-card-announcement='true']")]
        .flatMap((element) => {
          const style = window.getComputedStyle(element);
          const rect = style.display !== "none" && style.visibility !== "hidden" ? clippedElementBounds(element) : null;
          return rect ? [rect] : [];
        });
      obstacles.forEach((rect) => {
        const laneSharesObstacleColumn = left < rect.right + 2
          && left + cardSize.width > rect.left - 2;
        if (!laneSharesObstacleColumn) return;
        tops.add(rect.top - cardSize.height - gap);
        tops.add(rect.bottom + gap);
      });
      announcementRects.forEach((rect) => {
        const laneSharesAnnouncementColumn = left < rect.right + 2
          && left + cardSize.width > rect.left - 2;
        if (laneSharesAnnouncementColumn) tops.add(rect.top - cardSize.height - (gap - 2));
      });
      return [...tops]
        .sort((first, second) => Math.abs(first - centerTop) - Math.abs(second - centerTop))
        .map((top) => ({ left, top, ...cardSize }));
    };
    const candidates: CardRect[] = [];
    const topSeatHarvestCandidates = (firstTop: number): CardRect[] => {
      const minLeft = Math.max(2, seat.left + 2);
      const maxLeft = Math.min(window.innerWidth - cardSize.width - 2, seat.right - cardSize.width - 2);
      if (maxLeft < minLeft) return [];
      const lefts: number[] = [];
      const addLeft = (left: number) => {
        if (left < minLeft || left > maxLeft || lefts.some((value) => Math.abs(value - left) < 1)) return;
        lefts.push(left);
      };
      // Keep repeat plays in one horizontal row and fill the nearest free
      // column beside this author's existing real cards first.
      for (const authorCard of options.sameAuthorRects ?? []) {
        addLeft(authorCard.left + authorCard.width + gap);
        addLeft(authorCard.left - cardSize.width - gap);
      }
      const centered = Math.max(minLeft, Math.min(maxLeft, heroCenterX - cardSize.width / 2));
      addLeft(centered);
      for (let column = 1; column <= 4; column += 1) {
        addLeft(centered + column * (cardSize.width + gap));
        addLeft(centered - column * (cardSize.width + gap));
      }
      return lefts.map((left) => ({ left, top: firstTop, ...cardSize }));
    };
    if (harvestResponse && options.sameAuthorRects?.length) {
      const authorCards = [...options.sameAuthorRects].sort((first, second) =>
        Math.hypot(first.left + first.width / 2 - heroCenterX, first.top + first.height / 2 - heroCenterY)
        - Math.hypot(second.left + second.width / 2 - heroCenterX, second.top + second.height / 2 - heroCenterY));
      for (const authorCard of authorCards) {
        for (let column = 1; column <= 4; column += 1) {
          candidates.push(
            { left: authorCard.left + authorCard.width + gap + (column - 1) * (cardSize.width + gap), top: authorCard.top + (authorCard.height - cardSize.height) / 2, ...cardSize },
            { left: authorCard.left - cardSize.width - gap - (column - 1) * (cardSize.width + gap), top: authorCard.top + (authorCard.height - cardSize.height) / 2, ...cardSize },
          );
        }
      }
      // If the root/past response row is blocked by the public pool, stay in a
      // bounded horizontal band beside the true portrait. Control DOMRects
      // below continue to reject the name, HP, SWITCH and equipment regions.
      candidates.push(
        { left: heroRect.right + gap, top: heroCenterY - cardSize.height / 2, ...cardSize },
        { left: heroRect.left - cardSize.width - gap, top: heroCenterY - cardSize.height / 2, ...cardSize },
      );
    }
    if (isLocalAnchor) {
      // The local identity column is the only free area alongside the full-size
      // Hero on short phones. Use it only when the genuine thumbnail fits; the
      // Hero and the Hand/action rows keep their normal size and position.
      if (identityRect) {
        const belowHero: CardRect = {
          left: heroCenterX - cardSize.width / 2,
          top: heroRect.bottom + gap + cascade,
          ...cardSize,
        };
        if (belowHero.left >= identityRect.left + 2
          && belowHero.left + belowHero.width <= identityRect.right - 2
          && belowHero.top >= identityRect.top + 2
          && belowHero.top + belowHero.height <= identityRect.bottom - 2) candidates.push(belowHero);
      }
      candidates.push(
        { left: heroRect.right + gap, top: heroCenterY - cardSize.height / 2, ...cardSize },
        { left: heroRect.left - cardSize.width - gap, top: heroCenterY - cardSize.height / 2, ...cardSize },
        { left: heroCenterX - cardSize.width / 2, top: heroRect.top - cardSize.height - gap, ...cardSize },
        // A short phone can leave no full card-sized gap beside the local
        // portrait. In that case use the nearest lower battlefield edge,
        // aligned to the live Hero rather than a fixed viewport corner.
        { left: heroCenterX - cardSize.width / 2, top: tableRect.bottom - cardSize.height - gap, ...cardSize },
      );
    } else {
      const side = anchor.dataset.sideColumn;
      const isTopSeat = !side && heroRect.top + heroRect.height / 2 < tableRect.top + tableRect.height * 0.38;
      if (side === "left") {
        candidates.push(
          ...(options.avoidAuthorSeat ? [
            ...(compactFivePlayerPhone && harvestHistory
              ? compactFivePlayerInnerLaneCandidates(seat.right + 2 + cascade)
              : [{ left: seat.right + gap + cascade, top: seat.top + (seat.height - cardSize.height) / 2, ...cardSize }]),
            ...belowSeatCandidates(heroCenterX - cardSize.width / 2),
          ] : [
            { left: heroRect.right + gap + cascade, top: heroCenterY - cardSize.height / 2, ...cardSize },
            { left: heroCenterX - cardSize.width / 2, top: heroRect.bottom + gap, ...cardSize },
          ]),
          { left: heroCenterX - cardSize.width / 2, top: options.avoidAuthorSeat ? seat.top - cardSize.height - gap : heroRect.top - cardSize.height - gap, ...cardSize },
        );
      } else if (side === "right") {
        candidates.push(
          ...(options.avoidAuthorSeat ? [
            ...(compactFivePlayerPhone && harvestHistory
              ? compactFivePlayerInnerLaneCandidates(seat.left - cardSize.width - 2 - cascade)
              : [{ left: seat.left - cardSize.width - gap - cascade, top: seat.top + (seat.height - cardSize.height) / 2, ...cardSize }]),
            ...belowSeatCandidates(heroCenterX - cardSize.width / 2),
          ] : [
            { left: heroRect.left - cardSize.width - gap - cascade, top: heroCenterY - cardSize.height / 2, ...cardSize },
            { left: heroCenterX - cardSize.width / 2, top: heroRect.bottom + gap, ...cardSize },
          ]),
          { left: heroCenterX - cardSize.width / 2, top: options.avoidAuthorSeat ? seat.top - cardSize.height - gap : heroRect.top - cardSize.height - gap, ...cardSize },
        );
      } else if (isTopSeat) {
        const belowSeatLeft = heroCenterX - cardSize.width / 2;
        candidates.push(
          // Harvest history parks immediately below the whole top Seat. The
          // pool may cover only the lower tail after a measured 16px head and
          // its ordinal remain visible; do not walk the mini to a distant row.
          ...(harvestHistory
            ? topSeatHarvestCandidates(seat.bottom + gap)
            : options.avoidAuthorSeat
            ? belowSeatCandidates(belowSeatLeft)
            : [{ left: belowSeatLeft, top: heroRect.bottom + gap + cascade, ...cardSize }]),
          ...(!harvestHistory ? [
            { left: heroRect.right + gap, top: heroCenterY - cardSize.height / 2, ...cardSize },
            { left: heroRect.left - cardSize.width - gap, top: heroCenterY - cardSize.height / 2, ...cardSize },
            { left: heroCenterX - cardSize.width / 2, top: heroRect.top - cardSize.height - gap, ...cardSize },
          ] : []),
        );
      } else {
        candidates.push(
          ...(options.avoidAuthorSeat
            ? belowSeatCandidates(heroCenterX - cardSize.width / 2)
            : [{ left: heroCenterX - cardSize.width / 2, top: heroRect.bottom + gap + cascade, ...cardSize }]),
          { left: heroCenterX - cardSize.width / 2, top: options.avoidAuthorSeat ? seat.top - cardSize.height - gap : heroRect.top - cardSize.height - gap, ...cardSize },
          { left: heroRect.right + gap, top: heroCenterY - cardSize.height / 2, ...cardSize },
          { left: heroRect.left - cardSize.width - gap, top: heroCenterY - cardSize.height / 2, ...cardSize },
        );
      }
    }
    const parking = candidates.find(isFree);
    let localPortraitFallbackAudit: Record<string, unknown> = {
      attempted: false,
      isLocalAnchor,
      harvestHistory,
      compactFivePlayerPhone,
    };
    if (!parking && isLocalAnchor && harvestHistory && compactFivePlayerPhone) {
      // On short five-player phones, the public table, guidance strip and
      // fixed action row can leave no full 32×48 pocket around the local Dock
      // Hero. Keep the genuine mini attached to its real author inside the
      // portrait's artwork area as a final floating-overlay fallback; preserve
      // the Hero face, Info target, name, role and HP hit regions.
      const localPortrait = anchor.querySelector<HTMLElement>(".local-hero-portrait");
      const localPortraitRect = localPortrait?.getBoundingClientRect();
      localPortraitFallbackAudit = {
        attempted: true,
        isLocalAnchor,
        harvestHistory,
        compactFivePlayerPhone,
        localPortraitRect: localPortraitRect ? { left: localPortraitRect.left, top: localPortraitRect.top, right: localPortraitRect.right, bottom: localPortraitRect.bottom, width: localPortraitRect.width, height: localPortraitRect.height } : null,
      };
      if (localPortraitRect && localPortraitRect.width >= cardSize.width + 4
        && localPortraitRect.height >= cardSize.height + 4) {
        const protectedHeroContent = [...anchor.querySelectorAll<HTMLElement>(
          ".local-hero-label, .local-hero-vitals, .local-hero-info-button",
        )].map((element) => element.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
        const artCandidates: CardRect[] = [
          { left: localPortraitRect.left + 2, top: localPortraitRect.top + 2, ...cardSize },
          { left: localPortraitRect.right - cardSize.width - 2, top: localPortraitRect.top + 2, ...cardSize },
        ];
        const artCandidateAudit: Record<string, unknown>[] = [];
        const artParking = artCandidates.find((candidate) => {
          const visible = visibleFront(candidate);
          const withinPortrait = candidate.left >= localPortraitRect.left + 1
            && candidate.top >= localPortraitRect.top + 1
            && candidate.left + candidate.width <= localPortraitRect.right - 1
            && candidate.top + candidate.height <= localPortraitRect.bottom - 1;
          const heroContentClear = protectedHeroContent.every((rect) => !rectsOverlap(rect, candidate, 2));
          const unoccupied = !occupied.some((rect) => rectsOverlap(rect, candidate, 2));
          const obstacleClear = obstacles.every((rect) => !rectsOverlap(rect, visible?.rect ?? candidate, 2));
          const otherSeatsClear = otherAnchors.every((rect) => !rectsOverlap(rect, visible?.rect ?? candidate, 2));
          artCandidateAudit.push({ candidate, visible: visible?.rect ?? null, withinPortrait, inViewport: inViewport(candidate), heroContentClear, unoccupied, obstacleClear, otherSeatsClear });
          return visible && withinPortrait && inViewport(candidate)
            && protectedHeroContent.every((rect) => !rectsOverlap(rect, candidate, 2))
            && !occupied.some((rect) => rectsOverlap(rect, candidate, 2))
            && obstacles.every((rect) => !rectsOverlap(rect, visible.rect, 2))
            && otherAnchors.every((rect) => !rectsOverlap(rect, visible.rect, 2));
        });
        localPortraitFallbackAudit = { ...localPortraitFallbackAudit, artCandidateAudit };
        if (artParking) return { rect: artParking, side: "local" };
      }
    }
    let portraitEdgeCandidates: CardRect[] = [];
    const topSeatHarvestHistory = harvestHistory && !isLocalAnchor && !anchor.dataset.sideColumn
      && heroRect.top + heroRect.height / 2 < tableRect.top + tableRect.height * 0.38;
    if (!parking && options.allowAuthorPortraitEdgeOverlap && !isLocalAnchor && !topSeatHarvestHistory) {
      // Harvest responses still need an author-relative home when the pool and
      // H4 consume every clear pocket. Permit only a thin overlap on the
      // decorative portrait edge; keep the name, HP, SWITCH, Inspector,
      // equipment, judgement Info, other Seats and action controls untouched.
      const portrait = anchor.querySelector<HTMLElement>(".opponent-hero-portrait");
      const portraitRect = portrait?.getBoundingClientRect();
      if (portraitRect && portraitRect.width > 0 && portraitRect.height > 0) {
        const edgeOverlap = 6;
        const intersection = (first: CardRect | DOMRect, second: CardRect | DOMRect) => {
          const width = Math.max(0, Math.min(first.left + first.width, second.left + second.width) - Math.max(first.left, second.left));
          const height = Math.max(0, Math.min(first.top + first.height, second.top + second.height) - Math.max(first.top, second.top));
          return { width, height, area: width * height };
        };
        const portraitCenterX = portraitRect.left + portraitRect.width / 2;
        const portraitCenterY = portraitRect.top + portraitRect.height / 2;
        const edgeCandidates: CardRect[] = [
          { left: portraitRect.left - cardSize.width + edgeOverlap, top: portraitCenterY - cardSize.height / 2, ...cardSize },
          { left: portraitRect.right - edgeOverlap, top: portraitCenterY - cardSize.height / 2, ...cardSize },
          { left: portraitCenterX - cardSize.width / 2, top: portraitRect.top - cardSize.height + edgeOverlap, ...cardSize },
          { left: portraitCenterX - cardSize.width / 2, top: portraitRect.bottom - edgeOverlap, ...cardSize },
        ];
        portraitEdgeCandidates = edgeCandidates;
        edgeCandidates.sort((first, second) =>
          Math.hypot(first.left + first.width / 2 - heroCenterX, first.top + first.height / 2 - heroCenterY)
          - Math.hypot(second.left + second.width / 2 - heroCenterX, second.top + second.height / 2 - heroCenterY));
        const edgeParking = edgeCandidates.find((candidate) => {
          const portraitOverlap = intersection(candidate, portraitRect);
          const heroOverlap = intersection(candidate, heroRect);
          const seatOverlap = authorSeatRect ? intersection(candidate, authorSeatRect) : { area: 0, width: 0, height: 0 };
          const thinPortraitEdge = portraitOverlap.area > 0
            && (portraitOverlap.width <= edgeOverlap + 0.5 || portraitOverlap.height <= edgeOverlap + 0.5);
          return inViewport(candidate)
            && thinPortraitEdge
            && heroOverlap.area <= portraitOverlap.area + 0.5
            && seatOverlap.area <= portraitOverlap.area + 0.5
            && !occupied.some((rect) => rectsOverlap(rect, candidate, 2))
            && obstacles.every((rect) => !rectsOverlap(rect, candidate, 2))
            && otherAnchors.every((rect) => !rectsOverlap(rect, candidate, 2));
        });
        if (edgeParking) {
          const parkingSide = anchor.dataset.sideColumn === "left" ? "left" : anchor.dataset.sideColumn === "right" ? "right" : "top";
          return { rect: edgeParking, side: parkingSide };
        }
      }
    }
    if (!parking) {
      if (harvestResponse || harvestHistory) {
        const rectRecord = (rect: CardRect | DOMRect) => ({
          left: Math.round(rect.left * 10) / 10,
          top: Math.round(rect.top * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        });
        const candidateFailures = [...candidates, ...portraitEdgeCandidates].slice(0, 40).map((candidate) => {
          const visible = visibleFront(candidate);
          return {
            candidateRect: rectRecord(candidate),
            visibleFrontRect: visible ? rectRecord(visible.rect) : null,
            poolOccludedTailPx: visible?.poolOccludedTail ?? null,
            blockingRects: [
              ...(!inViewport(candidate) ? [{ kind: "viewport", rect: rectRecord({ left: 2, top: 2, width: window.innerWidth - 4, height: window.innerHeight - 4 }) }] : []),
              ...(!visible && harvestPoolOverlayRects.length ? [{ kind: "harvest-pool-peek-under-16px", rect: rectRecord(harvestPoolOverlayRects[0]) }] : []),
              ...(visible && rectsOverlap(heroRect, visible.rect, 2) ? [{ kind: "actor-hero", rect: rectRecord(heroRect) }] : []),
              ...(visible && authorSeatRect && rectsOverlap(authorSeatRect, visible.rect, 2) ? [{ kind: "actor-seat", rect: rectRecord(authorSeatRect) }] : []),
              ...occupied.filter((rect) => rectsOverlap(rect, candidate, 2)).map((rect) => ({ kind: "measured-card", rect: rectRecord(rect) })),
              ...obstacleDetails.filter(({ rect }) => visible && rectsOverlap(rect, visible.rect, 2)).map(({ selector, rect }) => ({ kind: selector, rect: rectRecord(rect) })),
              ...otherAnchors.filter((rect) => visible && rectsOverlap(rect, visible.rect, 2)).map((rect) => ({ kind: "other-player-seat", rect: rectRecord(rect) })),
            ],
          };
        });
        options.onPlacementFailure?.({
          actorId,
          actorRect: rectRecord(seat),
          heroRect: rectRecord(heroRect),
          cardSize,
          harvestPoolOverlayRects: harvestPoolOverlayRects.map(rectRecord),
          minimumVisiblePoolPeekPx: 16,
          occupiedAuthorRects: (options.sameAuthorRects ?? []).map(rectRecord),
          localPortraitFallbackAudit,
          candidateFailures,
        });
      }
      return null;
    }
    const parkingSide = isLocalAnchor ? "local" : anchor.dataset.sideColumn === "left" ? "left" : anchor.dataset.sideColumn === "right" ? "right" : "top";
    return { rect: parking, side: parkingSide };
  }
  const dock = document.querySelector<HTMLElement>(".local-player-dock")?.getBoundingClientRect() ?? null;
  const seatCenterX = seat.left + seat.width / 2;
  const seatCenterY = seat.top + seat.height / 2;
  const gap = 6;
  const safeTop = Math.max(4, tableRect.top + 4);
  const safeBottom = Math.min(window.innerHeight - cardSize.height - 4, tableRect.bottom - cardSize.height - 4, dock?.top ? dock.top - cardSize.height - 4 : window.innerHeight - cardSize.height - 4);
  let side: SeatHistoryCardParking["side"];
  let baseLeft: number;
  let baseTop: number;
  let direction = 1;
  if (isLocalAnchor && options.anchorLocalHero) {
    const hero = anchor.querySelector<HTMLElement>(".local-hero-card");
    const identity = anchor.querySelector<HTMLElement>(".local-dock-identity");
    if (!hero || !identity) return null;
    const heroRect = hero.getBoundingClientRect();
    const identityRect = identity.getBoundingClientRect();
    const identityStyle = window.getComputedStyle(identity);
    const insetLeft = (Number.parseFloat(identityStyle.borderLeftWidth) || 0) + (Number.parseFloat(identityStyle.paddingLeft) || 0);
    const insetRight = (Number.parseFloat(identityStyle.borderRightWidth) || 0) + (Number.parseFloat(identityStyle.paddingRight) || 0);
    const contentLeft = identityRect.left + insetLeft;
    const contentRight = identityRect.right - insetRight;
    const contentWidth = contentRight - contentLeft;
    const columns = Math.max(1, Math.floor((contentWidth + gap) / (cardSize.width + gap)));
    const protectedSelectors = seatHistoryParkingProtectedSelectors(options);
    const obstacles = protectedSelectors.flatMap((selector) => [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      })
      .map((element) => element.getBoundingClientRect()));
    const otherAnchors = [...document.querySelectorAll<HTMLElement>("[data-player-anchor]")]
      .filter((candidate) => candidate !== anchor && candidate.dataset.playerAnchor !== actorId)
      .map((candidate) => candidate.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);
    const fitsViewport = (candidate: CardRect) => candidate.left >= 4
      && candidate.left + candidate.width <= window.innerWidth - 4
      && candidate.top >= 4
      && candidate.top + candidate.height <= window.innerHeight - 4;
    const avoidsAuthorAndObstacles = (candidate: CardRect) => fitsViewport(candidate)
      && !occupied.some((rect) => rectsOverlap(rect, candidate, 4))
      && !rectsOverlap(heroRect, candidate, 2)
      && obstacles.every((obstacle) => !rectsOverlap(candidate, obstacle, 2))
      && otherAnchors.every((obstacle) => !rectsOverlap(candidate, obstacle, 2));
    const heroCenterX = heroRect.left + heroRect.width / 2;
    const heroCenterY = heroRect.top + heroRect.height / 2;
    const sideCandidates: CardRect[] = [
      { left: heroRect.right + gap, top: heroCenterY - cardSize.height / 2, ...cardSize },
      { left: heroRect.left - cardSize.width - gap, top: heroCenterY - cardSize.height / 2, ...cardSize },
      { left: heroCenterX - cardSize.width / 2, top: heroRect.top - cardSize.height - gap, ...cardSize },
      { left: heroCenterX - cardSize.width / 2, top: heroRect.bottom + gap, ...cardSize },
    ];
    const safeSide = sideCandidates.find(avoidsAuthorAndObstacles);
    if (safeSide) return { rect: safeSide, side: "local" };

    // When the local identity column has enough room below its portrait, center
    // one physical card under that portrait and keep the whole action tray free.
    const row = Math.floor(actorIndex / columns);
    const column = actorIndex % columns;
    const rowWidth = Math.min(columns, Math.max(1, actorIndex + 1)) * cardSize.width
      + Math.max(0, Math.min(columns, actorIndex + 1) - 1) * gap;
    const rowLeft = Math.max(contentLeft, Math.min(contentRight - rowWidth, heroCenterX - rowWidth / 2));
    const underHero: CardRect = {
      left: rowLeft + column * (cardSize.width + gap),
      top: heroRect.bottom + gap + row * (cardSize.height + gap),
      ...cardSize,
    };
    if (underHero.left >= contentLeft - 0.5 && underHero.left + underHero.width <= contentRight + 0.5
      && avoidsAuthorAndObstacles(underHero)) {
      return { rect: underHero, side: "local" };
    }

    // On taller phones the local action tray can begin before a 48×72 card
    // clears the portrait. Use the nearest safe bottom-edge pocket in the
    // battlefield, aligned to the same real Hero. Never move it to a fixed
    // viewport corner or over the accepted H4/pool/control rectangles.
    const fieldLeft = Math.max(4, tableRect.left + 4);
    const fieldRight = Math.min(window.innerWidth - 4, tableRect.right - 4);
    const fieldTop = tableRect.bottom - cardSize.height - 4;
    if (fieldTop >= tableRect.top + 4 && fieldRight - fieldLeft >= cardSize.width) {
      const maxLeft = fieldRight - cardSize.width;
      const preferredLeft = Math.max(fieldLeft, Math.min(maxLeft, heroCenterX - cardSize.width / 2));
      const maxOffset = Math.ceil((maxLeft - fieldLeft) / (cardSize.width + gap));
      const offsets = [0, ...Array.from({ length: maxOffset }, (_, index) => [-(index + 1), index + 1]).flat()];
      const fieldCandidates = offsets.map((offset) => ({
        left: Math.max(fieldLeft, Math.min(maxLeft, preferredLeft + offset * (cardSize.width + gap))),
        top: fieldTop,
        ...cardSize,
      })).sort((first, second) => Math.abs(first.left - preferredLeft) - Math.abs(second.left - preferredLeft));
      const safeField = fieldCandidates.find((candidate) => avoidsAuthorAndObstacles(candidate)
        && candidate.top >= tableRect.top + 4
        && candidate.top + candidate.height <= tableRect.bottom - 2);
      if (safeField) return { rect: safeField, side: "local" };
    }
    return null;
  } else if (isLocalAnchor) {
    side = "local";
    baseLeft = seat.left + 8;
    baseTop = seat.top - cardSize.height - gap;
  } else {
    const edgeDistances = [
      { side: "top" as const, value: Math.abs(seatCenterY - tableRect.top) },
      { side: "left" as const, value: Math.abs(seatCenterX - tableRect.left) },
      { side: "right" as const, value: Math.abs(tableRect.right - seatCenterX) },
    ].sort((a, b) => a.value - b.value);
    side = edgeDistances[0].side;
    if (side === "top") {
      baseLeft = seatCenterX - cardSize.width / 2;
      baseTop = seat.bottom + (window.matchMedia("(max-width: 700px)").matches ? 0 : gap);
    } else if (side === "left") {
      baseLeft = seat.right + gap;
      baseTop = seatCenterY - cardSize.height / 2;
    } else {
      baseLeft = seat.left - cardSize.width - gap;
      baseTop = seatCenterY - cardSize.height / 2;
      direction = -1;
    }
  }

  // Top-row opponent histories descend below their Hero; side and local
  // histories progress horizontally toward the battlefield interior.
  const horizontalProgression = side !== "top";
  const progressionStride = horizontalProgression ? cardSize.width + gap : cardSize.height + gap;
  const perpendicularStride = horizontalProgression ? cardSize.height + gap : cardSize.width + gap;
  const preferred = {
    left: baseLeft + (horizontalProgression ? direction * actorIndex * progressionStride : 0),
    top: baseTop + (horizontalProgression ? 0 : actorIndex * progressionStride),
    ...cardSize,
  };
  const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6];
  const candidates = offsets.map((offset) => ({
    left: preferred.left + (horizontalProgression ? 0 : offset * perpendicularStride),
    top: preferred.top + (horizontalProgression ? offset * perpendicularStride : 0),
    ...cardSize,
  }));
  if (options.extendNegationChainCollisionSlots) {
    const extended: CardRect[] = [];
    const maxColumns = Math.max(0, Math.ceil(tableRect.width / (cardSize.width + gap)));
    const maxRows = Math.max(0, Math.ceil((safeBottom - safeTop) / (cardSize.height + gap)));
    if (side === "top") {
      const horizontalOffsets = [0, ...Array.from({ length: maxColumns }, (_, index) => [index + 1, -(index + 1)]).flat()];
      const rowsBelowAuthor = Math.max(0, Math.floor((safeBottom - preferred.top) / (cardSize.height + gap)));
      for (let row = 1; row <= rowsBelowAuthor; row += 1) {
        for (const column of horizontalOffsets) {
          extended.push({
            left: preferred.left + column * (cardSize.width + gap),
            top: preferred.top + row * (cardSize.height + gap),
            ...cardSize,
          });
        }
      }
    } else if (side === "left" || side === "right") {
      const verticalOffsets = [0, ...Array.from({ length: maxRows }, (_, index) => [index + 1, -(index + 1)]).flat()];
      for (let column = -maxColumns; column <= maxColumns; column += 1) {
        for (const row of verticalOffsets) {
          if (!column && !row) continue;
          extended.push({
            left: preferred.left + direction * column * (cardSize.width + gap),
            top: preferred.top + row * (cardSize.height + gap),
            ...cardSize,
          });
        }
      }
      // When repeated authors exhaust the regular 78px grid, align another
      // card in the same narrow seat-front lane to an occupied card edge.
      // This keeps the public card close to its real author while preserving
      // the measured 6px gap; the common safety predicate below still rejects
      // any edge that would intersect a card, seat, or viewport boundary.
      const seatFrontLeft = side === "left"
        ? seat.right + gap
        : seat.left - cardSize.width - gap;
      const edgeAlignedTops = occupied.flatMap((rect) => [
        rect.top + rect.height + gap,
        rect.top - cardSize.height - gap,
      ]);
      for (const top of edgeAlignedTops) {
        extended.push({ left: seatFrontLeft, top, ...cardSize });
      }
    }
    extended.sort((first, second) => {
      const distance = (candidate: CardRect) => Math.hypot(
        Math.max(seat.left - candidate.left - candidate.width, candidate.left - seat.right, 0),
        Math.max(seat.top - candidate.top - candidate.height, candidate.top - seat.bottom, 0),
      );
      return distance(first) - distance(second);
    });
    candidates.push(...extended);
  }
  const anchors = [...document.querySelectorAll<HTMLElement>("[data-player-anchor]")]
    .filter((candidate) => candidate !== anchor && candidate.dataset.playerAnchor !== actorId)
    .map((candidate) => candidate.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  const localAnchor = side === "local";
  const protectedSelectors = seatHistoryParkingProtectedSelectors(options);
  const protectedObstacles = protectedSelectors.flatMap((selector) => [...document.querySelectorAll<HTMLElement>(selector)]
    .filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && clippedElementBounds(element) !== null;
    })
    .map((element) => clippedElementBounds(element))
    .filter((rect): rect is DOMRect => rect !== null));
  if (options.protectInteractionControls && side === "top") {
    const horizontalSlots = new Set([
      ...candidates.map((candidate) => candidate.left),
      // The compact Harvest pool leaves exact 48px side gutters at common
      // phone widths. They sit outside the table's decorative frame but
      // inside the viewport; reserve the 2px gutter on both sides so a real
      // response card can remain below its top-row author without covering
      // any pool card or Info control.
      2,
      window.innerWidth - cardSize.width - 2,
      tableRect.left + 8,
      tableRect.right - cardSize.width - 8,
      ...protectedObstacles.flatMap((obstacle) => [
        obstacle.left - cardSize.width - 2,
        obstacle.right + 2,
      ]),
    ]);
    const verticalSlots = new Set([
      preferred.top,
      ...protectedObstacles.flatMap((obstacle) => [
        obstacle.bottom + 2,
        obstacle.top - cardSize.height - 2,
      ]),
    ]);
    for (let top = preferred.top + cardSize.height + gap; top <= safeBottom; top += cardSize.height + gap) {
      verticalSlots.add(top);
    }
    const actorCenterX = seat.left + seat.width / 2;
    const actorCenterY = seat.top + seat.height / 2;
    const extended = [...horizontalSlots].flatMap((left) => [...verticalSlots].map((top) => ({
      left,
      top,
      ...cardSize,
    }))).filter((candidate) => candidate.top >= preferred.top - 0.5);
    candidates.push(...extended);
    candidates.sort((first, second) => {
      const firstDistance = Math.hypot(first.left + first.width / 2 - actorCenterX, first.top + first.height / 2 - actorCenterY);
      const secondDistance = Math.hypot(second.left + second.width / 2 - actorCenterX, second.top + second.height / 2 - actorCenterY);
      return firstDistance - secondDistance;
    });
  }
  const topPhoneEdgeCorridor = options.protectInteractionControls && side === "top";
  const candidateSafety = (candidate: CardRect) => ({
    horizontalBounds: candidate.left >= (topPhoneEdgeCorridor ? 2 : Math.max(4, localAnchor ? 0 : tableRect.left + 4))
      && candidate.left + candidate.width <= (topPhoneEdgeCorridor
        ? window.innerWidth - 2
        : Math.min(window.innerWidth - 4, localAnchor ? window.innerWidth - 4 : tableRect.right - 4)),
    verticalBounds: candidate.top >= (localAnchor ? 4 : safeTop)
      && candidate.top <= (localAnchor ? window.innerHeight - cardSize.height - 4 : safeBottom),
    actorSeat: (!(options.extendNegationChainCollisionSlots || options.protectInteractionControls)
      || !rectsOverlap(candidate, seat, side === "top" && window.matchMedia("(max-width: 700px)").matches ? 0 : 2)),
    occupiedCards: occupied.filter((rect) => rectsOverlap(rect, new DOMRect(candidate.left, candidate.top, candidate.width, candidate.height), 4)),
    otherSeats: anchors.filter((obstacle) => rectsOverlap(candidate, obstacle, 3)),
    protectedObstacles: protectedObstacles.filter((obstacle) => rectsOverlap(candidate, obstacle, 2)),
  });
  const isSafeCandidate = (candidate: CardRect) => {
    const safety = candidateSafety(candidate);
    return safety.horizontalBounds
      && safety.verticalBounds
      && safety.actorSeat
      && safety.occupiedCards.length === 0
      && safety.otherSeats.length === 0
      && safety.protectedObstacles.length === 0;
  };
  const safe = candidates.find(isSafeCandidate);
  if (safe) return { rect: safe, side };
  if (options.protectInteractionControls) return null;
  // Preserve the seat-front anchor as the deterministic final fallback. This
  // is used only when every bounded collision-safe slot is occupied.
  return { rect: boundCardRect(preferred.left, preferred.top, cardSize.width, cardSize.height), side };
}

function rectsOverlap(a: CardRect, b: CardRect | DOMRect, gap = 0) {
  return a.left < b.left + b.width + gap && a.left + a.width > b.left - gap
    && a.top < b.top + b.height + gap && a.top + a.height > b.top - gap;
}

function settlementLabel(action: PublicCardDisplayAction, targetName: string | null) {
  switch (action.settlement?.outcome) {
    case "ATTACK_DAMAGE_APPLIED": return `TAKE DAMAGE · ${targetName ?? "target"}`;
    case "ATTACK_BLOCKED_BY_DODGE": return "ATTACK BLOCKED BY DODGE";
    case "SUITS_MATCHED": return "SUITS MATCHED";
    case "SUITS_DIFFERED": return "SUITS DIFFERED";
    case "DISMANTLE_RESOLVED": return "BURNING BRIDGE RESOLVED";
    case "STEAL_RESOLVED": return "STEAL RESOLVED";
    case "RETALIATION_RESOLVED": return "RETALIATION RESOLVED";
    case "GROUP_RESOLVED": return "GROUP EFFECT RESOLVED";
    case "BUMPER_HARVEST_RESOLVED": return "BUMPER HARVEST RESOLVED";
    case "LUST_DUEL_DAMAGE_APPLIED":
    case "LUST_DUEL_DAMAGE_PREVENTED": return action.publicNotice ?? "LUST DUEL RESOLVED";
    case "ROOT_CANCELLED": return "EFFECT NEGATED";
    case "ROOT_RESTORED": return "EFFECT RESTORED";
    default: return null;
  }
}

export function publicCardAnnouncement(
  action: PublicCardDisplayAction,
  _notice: string,
  actorName: string | null,
  sourceName: string | null,
  targetName: string | null,
) {
  const outcome = action.settlement?.outcome;
  const source = sourceName ?? "A player";
  const target = targetName ?? "the target";
  const actor = actorName ?? targetName ?? "The target";
  const publicCardKind = action.cardKind ?? action.cardFace?.kind;
  const cardName = publicCardKind ? publicH4CardKindReference(publicCardKind) : "a card";
  const targetCardMovement = action.settlement?.targetCardMovement;
  const targetCardSourceZone = targetCardMovement?.sourceZone === "hand" ? "Hand"
    : targetCardMovement?.sourceZone === "equipment" ? "Equipment"
      : targetCardMovement?.sourceZone === "judgement" ? "Judgement" : null;
  const targetCardFace = targetCardMovement?.affectedCardFace;
  const targetCardName = targetCardFace
    ? publicH4CardFaceReference(targetCardFace) ?? "a public card"
    : "one card";
  const dismantleFaceCopy = publicDismantleCardFaceCopy(action, sourceName, targetName, action.settlement?.eventId);

  if ((action.cardKind === "BumperHarvest" || action.cardFace?.kind === "BumperHarvest")
    && action.motion?.type === "negation" && !action.publicNegationNarration) {
    return `${source} played ${publicH4CardKindReference("BumperHarvest")}.`;
  }

  switch (outcome) {
    case "ATTACK_DAMAGE_APPLIED":
      return targetName ? `${targetName} took damage from ${source}'s ${publicH4CardKindReference("Attack")}.`
        : `${source} resolved ${publicH4CardKindReference("Attack")}.`;
    case "ATTACK_BLOCKED_BY_DODGE":
      return action.response?.semanticLabel === "AS DODGE"
        ? `${actor} used ${publicH4CardKindReference("Attack")} as ${publicH4CardKindReference("Dodge")} against ${source}'s ${publicH4CardKindReference("Attack")}.`
        : `${actor} played ${publicH4CardKindReference("Dodge")} against ${source}'s ${publicH4CardKindReference("Attack")}.`;
    case "SUITS_MATCHED":
    case "SUITS_DIFFERED":
      return publicCardKind
        ? `${source} used ${cardName} on ${target}; suits ${outcome === "SUITS_MATCHED" ? "matched" : "differed"}.`
        : action.ariaLabel;
    case "GROUP_RESOLVED":
    case "BUMPER_HARVEST_RESOLVED": {
      if (!publicCardKind) return "A public group effect resolved.";
      const resolved = action.publicResolvedCount;
      const resolutionCopy = resolved && Number.isSafeInteger(resolved.count) && resolved.count >= 0
        ? `. ${resolved.count} ${resolved.noun} resolved.` : ".";
      return `${source} played ${cardName}${resolutionCopy}`;
    }
    case "DISMANTLE_RESOLVED":
      return dismantleFaceCopy?.message ?? `${source} resolved ${cardName} on ${target}.`;
    case "STEAL_RESOLVED":
      if (targetCardMovement?.destinationZone === "hand"
        && targetCardMovement.destinationOwnerId === action.sourceId
        && action.targetId !== null
        && (targetCardMovement.sourceZone === "judgement"
          ? targetCardMovement.affectedCardOwnerId === null
          : targetCardMovement.affectedCardOwnerId === action.targetId)) {
        if (targetCardMovement.sourceZone === "hand" && !targetCardFace) {
          return `${source} took 1 hidden card from ${target} (Hand).`;
        }
        if ((targetCardMovement.sourceZone === "equipment" || targetCardMovement.sourceZone === "judgement")
          && targetCardFace) {
          return `${source} took ${targetCardName} from ${target} (${targetCardSourceZone}).`;
        }
      }
      return `${source} resolved ${cardName} on ${target}.`;
    case "ROOT_CANCELLED":
      return `${actor}'s ${publicH4CardKindReference("Negation")} cancelled ${source}'s ${cardName}${targetName ? ` on ${targetName}` : ""}.`;
    case "ROOT_RESTORED":
      return `${actor}'s ${publicH4CardKindReference("Negation")} restored ${source}'s ${cardName}${targetName ? ` on ${targetName}` : ""}.`;
    default:
      return settlementLabel(action, targetName) ?? (publicCardKind
        ? targetName ? `${source} played ${cardName} on ${targetName}.` : `${source} played ${cardName}.`
        : "A public effect resolved.");
  }
}

function publicTargetCardSettlementAccessibleLabel(
  action: PublicCardDisplayAction,
  sourceName: string | null,
  targetName: string | null,
) {
  const movement = action.settlement?.targetCardMovement;
  const source = sourceName ?? "A player";
  const target = targetName ?? "the target";
  const face = movement?.affectedCardFace;
  const faceDescription = face ? publicH4CardFaceReference(face) : null;
  const zone = movement?.sourceZone === "hand" ? "Hand"
    : movement?.sourceZone === "equipment" ? "Equipment"
      : movement?.sourceZone === "judgement" ? "Judgement" : null;

  if (action.settlement?.outcome === "DISMANTLE_RESOLVED"
    && action.targetId !== null
    && action.settlement.eventId
    && (!action.publicNoticeEventId || action.publicNoticeEventId === action.settlement.eventId)
    && zone
    && movement?.destinationZone === "discard"
    && movement.destinationOwnerId === null
    && movement.affectedCardOwnerId === (movement.sourceZone === "judgement" ? null : action.targetId)
    && face?.id
    && (face.suit === "♠" || face.suit === "♥" || face.suit === "♦" || face.suit === "♣")
    && faceDescription) {
    return `${source} discarded ${faceDescription} from ${target}'s ${zone} to the discard pile.`;
  }

  if (action.settlement?.outcome !== "STEAL_RESOLVED"
    || action.targetId === null
    || movement?.destinationZone !== "hand"
    || movement.destinationOwnerId !== action.sourceId
    || !zone
    || movement.affectedCardOwnerId !== (movement.sourceZone === "judgement" ? null : action.targetId)) return undefined;

  if (movement.sourceZone === "hand" && !faceDescription) {
    return `${source} took one concealed card from ${target}'s Hand into ${source}'s Hand. The stolen card identity is not public.`;
  }
  if ((movement.sourceZone === "equipment" || movement.sourceZone === "judgement") && faceDescription) {
    return `${source} took ${faceDescription} from ${target}'s ${zone} into ${source}'s Hand.`;
  }
  return undefined;
}

type CompactPublicPlayerNames = Readonly<Record<string, string>>;

type DisplayedPublicCardAnnouncement = {
  message: string;
  segments?: readonly PublicH4Segment[];
  supporting: string;
  eventId: string;
  latestCommittedEventId?: string;
  checkpointId?: string;
  phase?: PublicNegationNarration["phase"];
  rootEffectState?: PublicNegationNarration["rootEffectState"];
  accessibleLabel?: string;
  dismantleCardFace?: PublicDismantleCardFaceCopy;
};

/** Render only producer-verified names whose segment text matches this exact copy. */
export function PublicH4Text({ message, segments }: {
  message: string;
  segments?: readonly PublicH4Segment[];
}) {
  const parts = matchingPublicH4Segments(message, segments);
  return parts
    ? <>{parts.map((part, index) => part.kind === "player"
      ? <span key={index} className="message-player-name public-h4-player" data-player-id={part.playerId} data-public-player-id={part.playerId}>{part.text}</span>
      : <span key={index}>{part.text}</span>)}</>
    : message;
}

type PublicDismantleCardFaceCopy = {
  settlementEventId: string;
  cardId: string;
  message: string;
  prefix: string;
  prefixSegments?: readonly PublicH4Segment[];
  suit: string;
  rank?: string;
  name: string;
  suffix: string;
  suffixSegments?: readonly PublicH4Segment[];
};

/** The physical discard face stays one authentic element between verified H4 fragments. */
export function PublicDismantleCardFaceH4({ copy }: { copy: PublicDismantleCardFaceCopy }) {
  return <>
    <PublicH4Text message={copy.prefix} segments={copy.prefixSegments} />
    <span
      className="public-dismantle-card-face"
      data-settlement-event-id={copy.settlementEventId}
      data-card-id={copy.cardId}
      aria-hidden="true"
    >
      {"["}
      <span className={`public-dismantle-card-suit-rank ${copy.suit === "♥" || copy.suit === "♦" ? "is-red" : "is-black"}`}>
        {copy.rank}{copy.suit}
      </span>
      <strong className="public-dismantle-card-name">{copy.name}</strong>
      {"]"}
    </span>
    <PublicH4Text message={copy.suffix} segments={copy.suffixSegments} />
  </>;
}

function verifiedAnnouncementSegments(
  message: string,
  narrationSegments?: readonly PublicH4Segment[],
  suppliedSegments?: readonly PublicH4Segment[],
) {
  return matchingPublicH4Segments(message, narrationSegments)
    ?? matchingPublicH4Segments(message, suppliedSegments);
}

type PublicCardAnnouncementCopy = {
  message: string;
  segments?: readonly PublicH4Segment[];
  compactMessage?: string;
  accessibleLabel?: string;
  dismantleCardFace?: PublicDismantleCardFaceCopy;
};

function publicDismantleCardFaceCopy(
  action: PublicCardDisplayAction,
  sourceName: string | null,
  targetName: string | null,
  eventId?: string,
): PublicDismantleCardFaceCopy | undefined {
  const settlement = action.settlement;
  const movement = settlement?.targetCardMovement;
  const face = movement?.affectedCardFace;
  const validZones = movement?.sourceZone === "hand" || movement?.sourceZone === "equipment" || movement?.sourceZone === "judgement";
  const validSuit = face?.suit === "♠" || face?.suit === "♥" || face?.suit === "♦" || face?.suit === "♣";
  if (action.cardKind !== "Dismantle"
    || settlement?.outcome !== "DISMANTLE_RESOLVED"
    || !settlement.eventId
    || settlement.rootEventId !== action.rootEventId
    || !settlement.rootResolutionId
    || settlement.sourceId !== action.sourceId
    || settlement.targetId !== action.targetId
    || eventId !== settlement.eventId
    || action.publicNoticeEventId && action.publicNoticeEventId !== settlement.eventId
    || action.targetId === null
    || !validZones
    || movement?.destinationZone !== "discard"
    || movement.destinationOwnerId !== null
    || movement.affectedCardOwnerId !== (movement.sourceZone === "judgement" ? null : action.targetId)
    || !face?.id
    || !validSuit) return undefined;
  const rank = typeof face.rank === "string" && face.rank.trim() ? face.rank.trim() : undefined;
  const name = cardDefinition(face.kind).name;
  const source = sourceName ?? "A player";
  const target = targetName ?? "the target";
  const zone = movement.sourceZone === "hand" ? "Hand" : movement.sourceZone === "equipment" ? "Equipment" : "Judgement";
  const prefix = `${source} discarded `;
  const suffix = ` from ${target} (${zone}).`;
  const faceReference = publicH4CardFaceReference(face);
  if (!faceReference) return undefined;
  const message = `${prefix}${faceReference}${suffix}`;
  const prefixCopy = sourceName && settlement.sourceId === action.sourceId
    ? publicH4Copy([{ id: settlement.sourceId, name: sourceName }, " discarded "])
    : undefined;
  const suffixCopy = targetName && settlement.targetId === action.targetId
    ? publicH4Copy([" from ", { id: settlement.targetId, name: targetName }, ` (${zone}).`])
    : undefined;
  return {
    settlementEventId: settlement.eventId,
    cardId: face.id,
    message,
    prefix,
    ...(matchingPublicH4Segments(prefix, prefixCopy?.segments) ? { prefixSegments: prefixCopy!.segments } : {}),
    suit: face.suit,
    ...(rank ? { rank } : {}),
    name,
    suffix,
    ...(matchingPublicH4Segments(suffix, suffixCopy?.segments) ? { suffixSegments: suffixCopy!.segments } : {}),
  };
}

function publicSettlementCardFaceId(action: PublicCardDisplayAction, dismantleFaceCopy?: PublicDismantleCardFaceCopy) {
  if (action.settlement?.outcome === "DISMANTLE_RESOLVED") return dismantleFaceCopy?.cardId;
  if (action.settlement?.outcome === "STEAL_RESOLVED" && action.settlement.targetCardMovement?.sourceZone === "hand") return undefined;
  return action.settlement?.targetCardMovement?.affectedCardFace?.id;
}

function publicCardPlayerSegments(action: PublicCardDisplayAction, message: string,
  actorId: string, actorName: string | null, sourceName: string | null, targetName: string | null) {
  const source = sourceName ? { id: action.sourceId, name: sourceName } : null;
  const target = targetName && action.targetId ? { id: action.targetId, name: targetName } : null;
  const actor = actorName && actorId ? { id: actorId, name: actorName } : null;
  const sentences: ReturnType<typeof publicH4Copy>[] = [];
  if (source) {
    const publicCardKind = action.cardKind ?? action.cardFace?.kind;
    const typedCardName = publicCardKind ? publicH4CardKindReference(publicCardKind) : "a card";
    sentences.push(publicH4Copy([source, " played ", typedCardName, "."]));
    if (target) {
      sentences.push(publicH4Copy([source, " played ", typedCardName, " on ", target, "."]));
      sentences.push(publicH4Copy([source, " played ", typedCardName, " targeting ", target, "."]));
      if (action.settlement?.outcome === "ATTACK_DAMAGE_APPLIED")
        sentences.push(publicH4Copy([target, " took damage from ", source, "'s ", publicH4CardKindReference("Attack"), "."]));
    }
    if (actor && action.settlement?.outcome === "ATTACK_BLOCKED_BY_DODGE")
      sentences.push(publicH4Copy([actor, action.response?.semanticLabel === "AS DODGE"
        ? ` used ${publicH4CardKindReference("Attack")} as ${publicH4CardKindReference("Dodge")} against `
        : ` played ${publicH4CardKindReference("Dodge")} against `, source, "'s ", publicH4CardKindReference("Attack"), "."]));
  }
  return sentences.find((copy) => copy.message === message)?.segments;
}

export function publicCardAnnouncementCopy(
  action: PublicCardDisplayAction,
  notice: string,
  actorName: string | null,
  actorId: string,
  sourceName: string | null,
  targetName: string | null,
  compactPlayerNamesById: CompactPublicPlayerNames,
  eventId?: string,
): PublicCardAnnouncementCopy {
  const dismantleFace = publicDismantleCardFaceCopy(action, sourceName, targetName, eventId);
  if (action.publicDiscardSettlement && action.publicDiscardSettlement.eventId === eventId) {
    return {
      message: action.publicDiscardSettlement.headline,
      segments: matchingPublicH4Segments(action.publicDiscardSettlement.headline, action.publicDiscardSettlement.segments),
      compactMessage: action.publicDiscardSettlement.headline,
      accessibleLabel: action.publicDiscardSettlement.accessibleLabel,
      ...(dismantleFace ? { dismantleCardFace: dismantleFace } : {}),
    };
  }
  if (dismantleFace) {
    return {
      message: dismantleFace.message,
      accessibleLabel: publicTargetCardSettlementAccessibleLabel(action, sourceName, targetName),
      dismantleCardFace: dismantleFace,
    };
  }
  const blockedAttackCopy = action.settlement?.outcome === "ATTACK_BLOCKED_BY_DODGE"
    && action.settlement.publicOutcomeMessage && action.sourceId && sourceName
    && action.targetId && targetName && action.response?.actorId && action.response.actorName
    ? publicH4Copy([
      { id: action.sourceId, name: sourceName }, "'s ", publicH4CardKindReference("Attack"), " on ",
      { id: action.targetId, name: targetName }, " was blocked by ",
      { id: action.response.actorId, name: action.response.actorName }, "'s ", publicH4CardKindReference("Dodge"), ".",
    ])
    : undefined;
  if (blockedAttackCopy && blockedAttackCopy.message === action.settlement?.publicOutcomeMessage) {
    return {
      message: blockedAttackCopy.message,
      segments: blockedAttackCopy.segments,
      compactMessage: blockedAttackCopy.message,
      accessibleLabel: blockedAttackCopy.message,
    };
  }
  const sameEventConversionCopy = action.publicCardEffectFrame?.effectClass === "CONVERSION"
    && action.publicCardEffectFrame.eventId === eventId
    && Boolean(action.publicNotice)
    && (!action.publicInteractionNarration
      || action.publicInteractionNarration.eventId === action.publicCardEffectFrame.eventId);
  if (action.publicInteractionNarration && !sameEventConversionCopy) {
    return {
      message: action.publicInteractionNarration.headline,
      segments: action.publicInteractionNarration.headlineSegments,
      compactMessage: action.publicInteractionNarration.compactHeadline,
      accessibleLabel: action.publicInteractionNarration.accessibleLabel,
    };
  }
  if ((action.motion?.type === "lust-cost" || action.motion?.type === "lust-duel") && action.lustCostFrame) {
    if (action.motion.type === "lust-duel" && action.settlement) {
      const message = action.publicNotice ?? action.ariaLabel;
      return { message, compactMessage: action.publicNoticeCompact, accessibleLabel: message };
    }
    const responseByEvent = action.motion.type === "lust-duel" && eventId
      ? action.responses?.filter((entry) => entry.eventId === eventId && entry.actorId === actorId) ?? []
      : [];
    const responseByNotice = action.motion.type === "lust-duel"
      ? action.responses?.filter((entry) => entry.ariaLabel === notice && entry.actorId === actorId) ?? []
      : [];
    const response = responseByEvent.length === 1 ? responseByEvent[0]
      : responseByEvent.length === 0 && responseByNotice.length === 1 ? responseByNotice[0]
        : undefined;
    if (response) {
      const responseActorName = response.actorName ?? actorName ?? compactPlayerNamesById[actorId] ?? null;
      if (response.targetName) {
        const compact = compactLustDuelAttackMessage(responseActorName, response.targetName);
        return { message: notice, segments: matchingPublicH4Segments(notice, response.publicNoticeSegments), compactMessage: response.publicNoticeCompact ?? compact ?? notice, accessibleLabel: notice };
      }
      return { message: notice, segments: matchingPublicH4Segments(notice, response.publicNoticeSegments), compactMessage: response.publicNoticeCompact, accessibleLabel: notice };
    }
    return {
      message: action.lustCostFrame.message,
      compactMessage: action.lustCostFrame.compactMessage,
      accessibleLabel: action.lustCostFrame.accessibleMessage ?? action.lustCostFrame.message,
    };
  }
  if (action.motion?.type === "duel" && action.publicNotice) {
    return {
      message: action.publicNotice,
      segments: matchingPublicH4Segments(action.publicNotice, action.publicNoticeSegments),
      compactMessage: action.publicNoticeCompact,
      accessibleLabel: action.publicNotice,
    };
  }
  if (action.publicCardEffectFrame && action.publicNotice
    && (action.publicCardEffectFrame.effectClass !== "CONVERSION"
      || action.publicCardEffectFrame.eventId === eventId)) {
    const compactMessage = action.publicNoticeCompact?.trim();
    return {
      message: action.publicNotice,
      segments: matchingPublicH4Segments(action.publicNotice, action.publicNoticeSegments),
      compactMessage: compactMessage && compactMessage !== action.publicNotice ? compactMessage : undefined,
      accessibleLabel: action.publicCardEffectFrame.accessibleLabel,
    };
  }
  const message = publicCardAnnouncement(action, notice, actorName, sourceName, targetName);
  const compactMessage = publicCardAnnouncement(
    action,
    notice,
    compactPlayerNamesById[actorId] ?? actorName,
    compactPlayerNamesById[action.sourceId] ?? sourceName,
    action.targetId ? compactPlayerNamesById[action.targetId] ?? targetName : targetName,
  );
  const explicitCompactMessage = action.publicNoticeCompact?.trim();
  const selectedCompactMessage = explicitCompactMessage || compactMessage;
  const accessibleLabel = publicTargetCardSettlementAccessibleLabel(action, sourceName, targetName);
  return {
    message,
    segments: publicCardPlayerSegments(action, message, actorId, actorName, sourceName, targetName),
    compactMessage: selectedCompactMessage === message ? undefined : selectedCompactMessage,
    ...(accessibleLabel ? { accessibleLabel } : {}),
  };
}

function publicNegationNarrationOwnsCopy(action: PublicCardDisplayAction): boolean {
  const narration = action.publicNegationNarration;
  return Boolean(narration && !(
    action.publicCardEffectFrame?.effectClass === "CONVERSION"
      && action.publicCardEffectFrame.eventId === action.rootEventId
      && narration.eventId === action.rootEventId
  ));
}

export function publicCardCommittedFactCopy(
  action: PublicCardDisplayAction,
  copy: PublicCardAnnouncementCopy,
): PublicCardAnnouncementCopy {
  const narration = action.publicNegationNarration;
  const negationNarrationOwnsCopy = publicNegationNarrationOwnsCopy(action);
  const normalize = (message: string | undefined) => message?.trim()
    .replace(/\.\s+Play Dodge or Skip\.$/i, ".")
    .replace(/\.\s+(Resolved:)/i, "; $1")
    .replace(/\.\s+(\d+\s+(?:targets|choices) resolved\.)/i, "; $1");
  return narration && !copy.dismantleCardFace && negationNarrationOwnsCopy ? {
    message: narration.headline,
    ...(matchingPublicH4Segments(narration.headline, narration.headlineSegments)
      ? { segments: narration.headlineSegments } : {}),
    compactMessage: narration.compactHeadline,
    accessibleLabel: narration.accessibleLabel,
  } : {
    ...copy,
    message: normalize(copy.message) ?? copy.message,
    compactMessage: normalize(copy.compactMessage),
  };
}

type PublicCardAnnouncementBand = {
  left: number;
  top: number;
  width: number;
  centerX: number;
  centerY: number;
  centerCardRect: CardRect;
  verticalMode: "above" | "below";
};

const publicCardAnnouncementBands = new Map<string, PublicCardAnnouncementBand>();

const announcementMeasurementStyleProperties = [
  "display", "box-sizing", "flex-direction", "align-items", "justify-content", "gap",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
  "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "border-radius",
  "background-color", "box-shadow", "color", "font-family", "font-size", "font-weight", "font-style",
  "line-height", "letter-spacing", "text-align", "text-transform", "text-indent", "white-space",
  "overflow", "overflow-wrap", "word-break", "text-overflow", "max-width", "min-height",
  "-webkit-box-orient", "-webkit-line-clamp",
] as const;

function copyAnnouncementMeasurementStyles(source: HTMLElement, target: HTMLElement) {
  const computed = window.getComputedStyle(source);
  for (const property of announcementMeasurementStyleProperties) {
    const value = computed.getPropertyValue(property);
    if (value) target.style.setProperty(property, value);
  }
}

function setAnnouncementMessageTextOnMeasurementClone(
  element: HTMLElement,
  message: string,
  dismantleCardFace?: PublicDismantleCardFaceCopy,
  segments?: readonly PublicH4Segment[],
) {
  if (!element.closest("[data-h4-measurement-copy='true']")) {
    throw new Error("H4 candidate text may only be changed on a detached measurement copy.");
  }
  if (!dismantleCardFace || dismantleCardFace.message !== message) {
    const parts = matchingPublicH4Segments(message, segments);
    if (parts) {
      element.replaceChildren(...parts.map((part) => {
        if (part.kind === "text") return document.createTextNode(part.text);
        const name = document.createElement("span");
        name.className = "message-player-name public-h4-player";
        name.dataset.playerId = part.playerId;
        name.dataset.publicPlayerId = part.playerId;
        name.textContent = part.text;
        return name;
      }));
    } else if (element.textContent !== message || element.querySelector(".public-h4-player")) element.textContent = message;
    return;
  }
  const face = document.createElement("span");
  face.className = "public-dismantle-card-face";
  face.dataset.settlementEventId = dismantleCardFace.settlementEventId;
  face.dataset.cardId = dismantleCardFace.cardId;
  face.setAttribute("aria-hidden", "true");
  const suitRank = document.createElement("span");
  suitRank.className = `public-dismantle-card-suit-rank ${dismantleCardFace.suit === "♥" || dismantleCardFace.suit === "♦" ? "is-red" : "is-black"}`;
  suitRank.textContent = `${dismantleCardFace.suit}${dismantleCardFace.rank ?? ""}`;
  const name = document.createElement("strong");
  name.className = "public-dismantle-card-name";
  name.textContent = dismantleCardFace.name;
  face.append(suitRank, name);
  const appendText = (messagePart: string, segments?: readonly PublicH4Segment[]) => {
    const parts = matchingPublicH4Segments(messagePart, segments);
    if (!parts) {
      element.append(document.createTextNode(messagePart));
      return;
    }
    for (const part of parts) {
      if (part.kind === "text") {
        element.append(document.createTextNode(part.text));
        continue;
      }
      const name = document.createElement("span");
      name.className = "message-player-name public-h4-player";
      name.dataset.playerId = part.playerId;
      name.dataset.publicPlayerId = part.playerId;
      name.textContent = part.text;
      element.append(name);
    }
  };
  element.replaceChildren();
  appendText(dismantleCardFace.prefix, dismantleCardFace.prefixSegments);
  element.append(face);
  appendText(dismantleCardFace.suffix, dismantleCardFace.suffixSegments);
}

function measureAnnouncementCopy(
  copy: HTMLElement,
  message: string,
  supporting: string,
  dismantleCardFace?: PublicDismantleCardFaceCopy,
  segments?: readonly PublicH4Segment[],
) {
  const measurementCopy = copy.cloneNode(true) as HTMLElement;
  measurementCopy.dataset.h4MeasurementCopy = "true";
  measurementCopy.setAttribute("aria-hidden", "true");
  measurementCopy.inert = true;
  const sourceElements = [copy, ...Array.from(copy.querySelectorAll<HTMLElement>("*"))];
  const measurementElements = [measurementCopy, ...Array.from(measurementCopy.querySelectorAll<HTMLElement>("*"))];
  sourceElements.forEach((source, index) => {
    const target = measurementElements[index];
    if (target) copyAnnouncementMeasurementStyles(source, target);
  });

  const width = copy.getBoundingClientRect().width;
  Object.assign(measurementCopy.style, {
    position: "fixed",
    left: "-10000px",
    top: "0px",
    right: "auto",
    bottom: "auto",
    width: `${width}px`,
    height: "auto",
    maxHeight: "none",
    visibility: "hidden",
    pointerEvents: "none",
    zIndex: "-1",
    translate: "none",
  });

  const sourceText = copy.querySelector<HTMLElement>("b");
  const measurementText = measurementCopy.querySelector<HTMLElement>("b");
  const measurementSupport = measurementCopy.querySelector<HTMLElement>(".public-negation-narration-support");
  if (measurementText) setAnnouncementMessageTextOnMeasurementClone(measurementText, message, dismantleCardFace, segments);
  if (measurementSupport) measurementSupport.textContent = supporting;

  // Candidate text may create new semantic spans. Apply the resolved style of
  // its matching React-rendered template node so the detached copy measures the
  // same typography without changing any live React-owned H4 child.
  if (sourceText && measurementText) {
    const sourceTextElements = [sourceText, ...Array.from(sourceText.querySelectorAll<HTMLElement>("*"))];
    for (const target of Array.from(measurementText.querySelectorAll<HTMLElement>("*"))) {
      const source = sourceTextElements.find((candidate) => candidate.tagName === target.tagName
        && candidate.className === target.className);
      if (source) copyAnnouncementMeasurementStyles(source, target);
    }
  }

  document.body.append(measurementCopy);
  try {
    const rect = measurementCopy.getBoundingClientRect();
    const linesFor = (element: HTMLElement | null) => {
      if (!element || !element.textContent?.trim()) return 0;
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length;
    };
    return {
      height: rect.height,
      lines: linesFor(measurementText) + linesFor(measurementSupport),
    };
  } finally {
    measurementCopy.remove();
  }
}

function rememberPublicCardAnnouncementBand(key: string, band: PublicCardAnnouncementBand) {
  publicCardAnnouncementBands.delete(key);
  publicCardAnnouncementBands.set(key, band);
  while (publicCardAnnouncementBands.size > 128) {
    const oldest = publicCardAnnouncementBands.keys().next().value;
    if (oldest === undefined) break;
    publicCardAnnouncementBands.delete(oldest);
  }
}

function publicCardAnnouncementPlacementKey(action: PublicCardDisplayAction, roomCode?: string) {
  const scope = action.motion?.scopeKey ?? action.interactionId ?? action.rootEventId;
  return `${roomCode ?? "room"}:${scope}`;
}

function publicCardAnnouncementCopyKey(
  action: PublicCardDisplayAction,
  eventId: string,
  actorId: string,
  roomCode: string,
) {
  const narration = action.publicNegationNarration;
  const identity = action.publicAnnouncementIdentity;
  const checkpointEventId = identity?.latestPublicEventId
    ?? (narration?.phase === "FINAL" ? narration.eventId : narration?.latestCommittedEventId)
    ?? action.settlement?.eventId
    ?? eventId;
  const proofEventId = identity?.checkpointId
    ?? narration?.checkpointId
    ?? action.publicCardEffectFrame?.eventId
    ?? action.settlement?.eventId
    ?? eventId;
  return buildPublicAnnouncementEventCopyKey({
    roomCode,
    rootEventId: action.rootEventId,
    checkpointEventId,
    proofEventId,
    actorId: identity?.latestPublicActorId ?? actorId,
    actionClass: action.publicCardEffectFrame?.effectId ?? action.cardKind ?? action.motion?.type ?? action.cardLabel,
    presentationRevision: identity?.serverRevision ?? action.presentationRevision,
    presentationStage: identity?.presentationStage ?? narration?.phase ?? null,
    serverRevision: identity?.serverRevision ?? null,
    semanticOwner: identity?.semanticOwner ?? narration?.phase ?? null,
    interactionId: identity?.interactionId ?? action.interactionId ?? null,
    rootFrameId: identity?.rootFrameId ?? action.rootFrameId ?? null,
    authoritativeCheckpointId: identity?.checkpointId ?? action.checkpointId ?? narration?.checkpointId ?? null,
    latestPublicEventId: identity?.latestPublicEventId
      ?? (narration?.phase === "FINAL" ? narration.eventId
        : narration?.latestCommittedEventId ?? narration?.eventId)
      ?? action.response?.eventId
      ?? action.responses?.at(-1)?.eventId
      ?? eventId,
  });
}

function publicCardAnnouncementLifecycleStage(action: PublicCardDisplayAction): "ACTIVE" | "READING" {
  return action.settlement || action.publicCounterRead ? "READING" : "ACTIVE";
}

function publicAnnouncementTraceHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function PublicCardAnnouncement({
  eventId,
  h4Owner,
  h4PublicSequence,
  anchorEventId,
  stagePrimaryEventId,
  eventCopyKey,
  announcementIdentity,
  geometryKey,
  publicSequenceForEvent,
  copyLifecycleStage,
  placementKey,
  viewerLayoutKey,
  phase,
  heading,
  message,
  segments,
  compactMessage,
  accessibleLabel,
  dismantleCardFace,
  supportingMessage,
  compactSupportingMessage,
  presentationNarration,
  negationNarration,
  pendingRevealIdentity,
  fallbackCardRect,
  phaseNotice,
  outcome,
  negationWaiting = false,
  stableCenterAnchor = false,
  keepCenterAnchorClear = false,
  stableHarvestAnchor = false,
  ignoreJourneyLayoutPending = false,
  clearCenterAnchorWhenParked = false,
  viewerGeometryReady = true,
  preferredVerticalMode,
  privateDrawAware = false,
  protectFirstParkedMiniature = false,
}: {
  eventId: string;
  h4Owner: "PublicCardDisplay" | "PublicInteractionAnnouncementLayer" | "PublicDiscardAnnouncementLayer" | "PublicSkillEventAnnouncementLayer";
  h4PublicSequence?: number;
  publicSequenceForEvent?: (eventId: string) => number | undefined;
  anchorEventId?: string | null;
  stagePrimaryEventId?: string | null;
  eventCopyKey: string;
  announcementIdentity?: PublicCardAnnouncementIdentity;
  geometryKey: string;
  copyLifecycleStage: "ACTIVE" | "READING";
  placementKey: string;
  viewerLayoutKey: string;
  phase: JourneyCard["phase"] | "static";
  heading?: string;
  message: string;
  segments?: readonly PublicH4Segment[];
  compactMessage?: string;
  accessibleLabel?: string;
  dismantleCardFace?: PublicDismantleCardFaceCopy;
  supportingMessage?: string;
  compactSupportingMessage?: string;
  presentationNarration?: PublicNegationNarration | PublicInteractionNarration;
  negationNarration?: PublicNegationNarration;
  pendingRevealIdentity?: PublicStageRevealIdentity | null;
  fallbackCardRect: CardRect | null;
  phaseNotice?: string;
  outcome?: NonNullable<PublicCardDisplayAction["settlement"]>["outcome"];
  negationWaiting?: boolean;
  stableCenterAnchor?: boolean;
  keepCenterAnchorClear?: boolean;
  stableHarvestAnchor?: boolean;
  ignoreJourneyLayoutPending?: boolean;
  clearCenterAnchorWhenParked?: boolean;
  viewerGeometryReady?: boolean;
  preferredVerticalMode?: "above" | "below";
  privateDrawAware?: boolean;
  protectFirstParkedMiniature?: boolean;
}) {
  const sharedPublicStage = usePublicStageLayout();
  const copyRef = useRef<HTMLDivElement>(null);
  const lastH4TraceSignatureRef = useRef("");
  const h4TraceCountRef = useRef(0);
  const measuredCenterRef = useRef<{ bandKey: string; rect: CardRect } | null>(null);
  const placementGenerationRef = useRef(0);
  const deliveryRef = useRef<{ eventCopyKey: string; stage: "COMMITTED" | "PENDING_PLACEMENT" | "VISIBLE" | "SUPERSEDED" | "RETIRED" }>({
    eventCopyKey,
    stage: "COMMITTED",
  });
  const lastValidPlacementRef = useRef<{
    geometryIdentity: string;
    layoutEpoch: string;
    viewerLayoutKey: string;
    eventCopyKey: string;
    copySignature: string;
    left: number;
    top: number;
    width: number;
    height: number;
    compact: boolean;
    message: string;
    supporting: string;
  } | null>(null);
  const placementFailureRef = useRef<{ identity: string; layoutEpoch: string; startedAt: number } | null>(null);
  const copyLifecycleRef = useRef<PublicAnnouncementCopyLifecycle>({ eventCopyKey: "", stage: "UNSEEN" });
  const lastGeometryKeyRef = useRef("");
  const initialNarration = presentationNarration ?? negationNarration;
  const initialMessage = initialNarration?.headline ?? message;
  const [displayedCopy, setDisplayedCopy] = useState<DisplayedPublicCardAnnouncement>(() => ({
    message: initialMessage,
    supporting: presentationNarration?.supportingMessage ?? negationNarration?.supportingMessage ?? supportingMessage ?? "",
    eventId: presentationNarration?.eventId ?? negationNarration?.eventId ?? eventId,
    latestCommittedEventId: presentationNarration?.latestCommittedEventId ?? negationNarration?.latestCommittedEventId,
    checkpointId: presentationNarration?.checkpointId ?? negationNarration?.checkpointId,
    phase: presentationNarration?.phase ?? negationNarration?.phase,
    rootEffectState: presentationNarration?.rootEffectState ?? negationNarration?.rootEffectState,
    accessibleLabel: accessibleLabel ?? presentationNarration?.accessibleLabel ?? negationNarration?.accessibleLabel,
    dismantleCardFace,
    segments: verifiedAnnouncementSegments(initialMessage, initialNarration?.headlineSegments, segments),
  }));
  const displayedCopyRef = useRef(displayedCopy);
  useLayoutEffect(() => () => {
    copyLifecycleRef.current = transitionPublicAnnouncementCopyLifecycle(copyLifecycleRef.current, null);
    if (copyRef.current) copyRef.current.dataset.publicCardAnnouncementDelivery = "RETIRED";
    deliveryRef.current = { ...deliveryRef.current, stage: "RETIRED" };
  }, []);
  const fallbackLeft = fallbackCardRect?.left;
  const fallbackTop = fallbackCardRect?.top;
  const fallbackWidth = fallbackCardRect?.width;
  const fallbackHeight = fallbackCardRect?.height;
  const stableFallbackCardRect = useMemo(() => fallbackLeft === undefined || fallbackTop === undefined
    || fallbackWidth === undefined || fallbackHeight === undefined
    ? null
    : { left: fallbackLeft, top: fallbackTop, width: fallbackWidth, height: fallbackHeight },
  [fallbackHeight, fallbackLeft, fallbackTop, fallbackWidth]);
  const latestInputs = {
    eventId, anchorEventId, eventCopyKey, announcementIdentity, geometryKey, copyLifecycleStage, placementKey, viewerLayoutKey,
    phase, heading, message, compactMessage, accessibleLabel, dismantleCardFace, segments, supportingMessage, compactSupportingMessage,
    presentationNarration, negationNarration, fallbackCardRect: stableFallbackCardRect, phaseNotice, outcome, negationWaiting,
    pendingRevealIdentity,
    stableCenterAnchor, keepCenterAnchorClear, stableHarvestAnchor, ignoreJourneyLayoutPending, clearCenterAnchorWhenParked,
    viewerGeometryReady, preferredVerticalMode, privateDrawAware, protectFirstParkedMiniature,
  };
  const latestInputsRef = useRef(latestInputs);
  const placementInputKey = JSON.stringify(latestInputs);
  const schedulePlacementRef = useRef<(() => void) | null>(null);
  const reportH4Placement = useCallback((input: {
    geometryEpoch: string | null;
    obstacleIds: readonly string[];
    decision: "reuse" | "reflow" | "hide";
    reason: string;
    compact: boolean | null;
    rect: { left: number; top: number; width: number; height: number } | null;
    visible: boolean;
    text?: string;
  }) => {
    if (!isAttackDodgeUxTraceActive()) return;
    const current = latestInputsRef.current;
    const identity = current.announcementIdentity;
    const narration = current.presentationNarration ?? current.negationNarration;
    const isH4 = Boolean(narration || current.negationWaiting
      || current.phaseNotice?.toUpperCase().includes("NEGATION")
      || ["NEGATION", "NEGATION_SETTLEMENT", "DUEL_EXCHANGE"].includes(identity?.semanticOwner ?? ""));
    if (!isH4) return;
    const text = input.text ?? narration?.headline ?? current.message;
    const geometryEpoch = input.geometryEpoch;
    const data = {
      presentationStage: identity?.presentationStage ?? narration?.phase ?? null,
      serverRevision: identity?.serverRevision ?? null,
      selectedPresenterRevision: identity?.selectedPresenterRevision ?? null,
      h4SemanticOwner: identity?.semanticOwner ?? narration?.phase ?? null,
      h4EventCopyKey: current.eventCopyKey,
      h4TextVersion: publicAnnouncementTraceHash(text),
      h4Compact: input.compact,
      h4Rect: input.rect ? {
        left: Math.round(input.rect.left * 2) / 2,
        top: Math.round(input.rect.top * 2) / 2,
        width: Math.round(input.rect.width * 2) / 2,
        height: Math.round(input.rect.height * 2) / 2,
      } : null,
      h4Visibility: input.visible ? "visible" : "hidden",
      geometryEpoch,
      actualObstacleIds: [...input.obstacleIds].sort(),
      placementDecision: input.decision,
      placementReason: input.reason,
    };
    const signature = JSON.stringify(data);
    if (signature === lastH4TraceSignatureRef.current || h4TraceCountRef.current >= 32) return;
    lastH4TraceSignatureRef.current = signature;
    h4TraceCountRef.current += 1;
    recordAttackDodgeUxTrace("h4-public-announcement-placement", data);
  }, []);

  useLayoutEffect(() => {
    const placementGeneration = ++placementGenerationRef.current;
    const copy = copyRef.current;
    const display = copy?.closest<HTMLElement>(".public-card-display");
    if (!copy || !display) return;
    const geometryChanged = Boolean(lastGeometryKeyRef.current && lastGeometryKeyRef.current !== geometryKey);
    if (geometryChanged && copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
    if (geometryChanged) lastGeometryKeyRef.current = geometryKey;

    const copyAnchorEventId = anchorEventId === null ? "" : anchorEventId ?? eventId;
    const getAnchor = () => {
      if (!copyAnchorEventId) return null;
      const table = display.closest<HTMLElement>(".play-table");
      return (table ? Array.from(table.querySelectorAll<HTMLElement>("[data-public-card-copy-anchor-event-id]")) : [])
        .find((element) => element !== copy && element.dataset.publicCardCopyAnchorEventId === copyAnchorEventId) ?? null;
    };
    const toCardRect = (rect: DOMRect): CardRect => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let anchorObserver: MutationObserver | null = null;
    let frame = 0;
    let placementFailureTimer: number | null = null;
    let revealAnchorFollowTimer: number | null = null;
    let currentGeometryIdentity = "";
    let currentTableCoordinates: ReturnType<typeof publicStageCoordinateSpaceForTable> = null;
    const clientCardRectToTableLocal = (rect: CardRect): CardRect | null => {
      if (!currentTableCoordinates) return null;
      const local = publicStageRectToTableLocal({
        left: rect.left, top: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height,
      }, currentTableCoordinates);
      return local ? { left: local.left, top: local.top, width: local.right - local.left, height: local.bottom - local.top } : null;
    };
    const tableLocalCardRectToClient = (rect: CardRect): CardRect | null => {
      if (!currentTableCoordinates) return null;
      const client = publicStageRectFromTableLocal({
        left: rect.left, top: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height,
      }, currentTableCoordinates);
      return client ? { left: client.left, top: client.top, width: client.right - client.left, height: client.bottom - client.top } : null;
    };
    const lastValidPlacementInClientSpace = () => {
      const placement = lastValidPlacementRef.current;
      const rect = placement ? tableLocalCardRectToClient(placement) : null;
      return placement && rect ? { ...placement, ...rect } : null;
    };
    const passiveStationaryReveal = phase === "reveal";
    const protectedSelectors = [".opponent-player-card", ".player-square", ".player-board-status", ".visible-countdown", ".stage-system-cluster", ".public-activity-chip", ".harvest-choice-panel", ".local-player-dock", ".local-hand-rail", ".console-guidance", ...(privateDrawAware ? [".private-draw-row"] : []), ...(protectFirstParkedMiniature && !passiveStationaryReveal ? ['.public-card-journey-card[data-public-card-journey-phase="parked"]'] : [])].join(", ");
    const setData = (name: string, value: string | undefined) => {
      const current = copy.getAttribute(name);
      if (value === undefined) {
        if (current !== null) copy.removeAttribute(name);
      } else if (current !== value) copy.setAttribute(name, value);
    };
    const setDelivery = (stage: typeof deliveryRef.current.stage, nextEventCopyKey = latestInputsRef.current.eventCopyKey) => {
      const previous = deliveryRef.current;
      if (previous.eventCopyKey && previous.eventCopyKey !== nextEventCopyKey) {
        setData("data-public-card-announcement-superseded-event-key", previous.eventCopyKey);
      }
      deliveryRef.current = { eventCopyKey: nextEventCopyKey, stage };
      setData("data-public-card-announcement-delivery", stage);
    };
    const setPx = (property: "left" | "top" | "width", value: number) => {
      const table = display.closest<HTMLElement>(".play-table");
      const coordinates = table ? publicStageCoordinateSpaceForTable(table) : null;
      const localValue = coordinates ? property === "width"
        ? publicStageLengthToTableLocal(value, "x", coordinates)
        : publicStageCoordinateToTableLocal(value, property === "left" ? "x" : "y", coordinates)
        : null;
      if (localValue === null) return;
      const current = Number.parseFloat(copy.style[property]);
      if (!Number.isFinite(current) || Math.abs(current - localValue) > 1) copy.style[property] = `${localValue}px`;
    };
    const commitDisplayedCopy = (next: DisplayedPublicCardAnnouncement) => {
      const previous = displayedCopyRef.current!;
      if (previous.message === next.message
        && previous.supporting === next.supporting
        && previous.eventId === next.eventId
        && previous.latestCommittedEventId === next.latestCommittedEventId
        && previous.checkpointId === next.checkpointId
        && previous.phase === next.phase
        && previous.rootEffectState === next.rootEffectState
        && previous.accessibleLabel === next.accessibleLabel
        && JSON.stringify(previous.segments) === JSON.stringify(next.segments)
        && JSON.stringify(previous.dismantleCardFace) === JSON.stringify(next.dismantleCardFace)) return;
      displayedCopyRef.current = next;
      setDisplayedCopy(next);
    };

    const notePlacementFailure = (layoutEpoch: string) => {
      const now = performance.now();
      const failure = placementFailureRef.current;
      if (!failure || failure.identity !== currentGeometryIdentity || failure.layoutEpoch !== layoutEpoch) {
        placementFailureRef.current = { identity: currentGeometryIdentity, layoutEpoch, startedAt: now };
        if (placementFailureTimer === null) {
          placementFailureTimer = window.setTimeout(() => {
            placementFailureTimer = null;
            schedule();
          }, 520);
        }
        return false;
      }
      if (now - failure.startedAt > 500) {
        if (copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
        setDelivery("PENDING_PLACEMENT");
        setData("data-public-card-announcement-stability", "hidden-after-sustained-placement-failure");
        return true;
      }
      return false;
    };

    const retainLastValidPlacement = (layoutEpoch: string) => {
      const previous = lastValidPlacementInClientSpace();
      const sustainedFailure = notePlacementFailure(layoutEpoch);
      if (sustainedFailure || !previous || previous.geometryIdentity !== currentGeometryIdentity
        || previous.layoutEpoch !== layoutEpoch) return false;
      const setPx = (property: "left" | "top" | "width", value: number) => {
        const current = Number.parseFloat(copy.style[property]);
        if (!Number.isFinite(current) || Math.abs(current - value) > 1) copy.style[property] = `${value}px`;
      };
      setPx("left", previous.left);
      setPx("top", previous.top);
      setPx("width", previous.width);
      if (copy.getBoundingClientRect().height > previous.height + 1) return false;
      setData("data-public-card-announcement-compact", previous.compact ? "true" : undefined);
      setData("data-public-card-announcement-stability", "retained-same-viewer-geometry");
      if (copy.style.visibility !== "visible") copy.style.visibility = "visible";
      return true;
    };

    const place = () => {
      if (placementGeneration !== placementGenerationRef.current) return;
      const currentEventCopyKey = latestInputsRef.current.eventCopyKey;
      const eventChanged = deliveryRef.current.eventCopyKey !== currentEventCopyKey;
      if (eventChanged) setDelivery("COMMITTED", currentEventCopyKey);
      if (eventChanged || copy.style.visibility !== "visible") setDelivery("PENDING_PLACEMENT", currentEventCopyKey);
      const {
        eventId, eventCopyKey, geometryKey, viewerLayoutKey, phase, message, compactMessage,
        heading,
        accessibleLabel, supportingMessage, compactSupportingMessage, presentationNarration, negationNarration,
        pendingRevealIdentity,
        fallbackCardRect: currentFallbackCardRect, outcome, stableCenterAnchor,
        keepCenterAnchorClear, stableHarvestAnchor, ignoreJourneyLayoutPending, viewerGeometryReady, preferredVerticalMode,
    privateDrawAware, protectFirstParkedMiniature, dismantleCardFace, segments,
      } = latestInputsRef.current;
      const copySignature = JSON.stringify([
        eventCopyKey, heading, message, compactMessage, accessibleLabel, dismantleCardFace, segments, supportingMessage, compactSupportingMessage,
      ]);
      const narration = presentationNarration ?? negationNarration;
      const hasNegationNarration = Boolean(negationNarration);
      const narrationEventId = narration?.eventId;
      const narrationLatestCommittedEventId = narration?.latestCommittedEventId;
      const narrationCheckpointId = narration?.checkpointId;
      const narrationPhase = narration?.phase;
      const narrationRootEffectState = narration?.rootEffectState;
      const narrationAccessibleLabel = accessibleLabel ?? narration?.accessibleLabel;
      const incomingMessage = narration?.headline ?? message;
      const incomingDisplayedCopy: DisplayedPublicCardAnnouncement = {
        message: incomingMessage,
        supporting: narration?.supportingMessage ?? supportingMessage ?? "",
        eventId: narrationEventId ?? eventId,
        latestCommittedEventId: narrationLatestCommittedEventId,
        checkpointId: narrationCheckpointId,
        phase: narrationPhase,
        rootEffectState: narrationRootEffectState,
        accessibleLabel: narrationAccessibleLabel,
        dismantleCardFace,
        segments: verifiedAnnouncementSegments(incomingMessage, narration?.headlineSegments, segments),
      };
      commitDisplayedCopy(incomingDisplayedCopy);
      const sharedTable = display.closest<HTMLElement>(".play-table");
      const currentSharedStage = sharedTable ? committedPublicStageLayout(sharedTable) ?? sharedPublicStage : sharedPublicStage;
      const sharedPlacementIsCurrent = Boolean(!protectFirstParkedMiniature && currentSharedStage
        && sharedTable
        && (sharedPublicStageMatchesElement(sharedTable, currentSharedStage)
          || canRetainPublicStageLayout(sharedTable, currentSharedStage))
        && currentSharedStage.announcementEventId === copy.dataset.publicCardAnnouncementEventId
        && currentSharedStage.layout.scene.scopeId === display.dataset.publicCardRootEventId
        && currentSharedStage.layout.scene.viewerId === display.dataset.publicCardViewerId
        && display.dataset.publicCardLayoutViewerId === display.dataset.publicCardViewerId);
      if (sharedPlacementIsCurrent && currentSharedStage) {
        const rect = currentSharedStage.layout.announcement;
        setPx("left", rect.left);
        setPx("top", rect.top);
        setPx("width", rect.right - rect.left);
        setData("data-public-stage-layout-identity", currentSharedStage.layout.identity);
        setData("data-public-card-announcement-placement", `shared-${currentSharedStage.layout.scene.phase.toLowerCase()}`);
        setData("data-public-card-announcement-positioned", "true");
        const sharedUpper = sharedTable ? fixedUpperHistoryAnnouncementAnchor(sharedTable) : null;
        const matchesUpper = sharedUpper && Math.abs(sharedUpper.top - rect.top) <= 0.5;
        const sharedCoordinates = sharedTable ? publicStageCoordinateSpaceForTable(sharedTable) : null;
        const sharedUpperLocalTop = matchesUpper && sharedCoordinates
          ? publicStageCoordinateToTableLocal(rect.top, "y", sharedCoordinates) : null;
        setData("data-public-card-announcement-fixed-upper", matchesUpper ? "true" : undefined);
        setData("data-public-card-announcement-fixed-upper-top", sharedUpperLocalTop === null ? undefined : `${Math.round(sharedUpperLocalTop * 2) / 2}`);
        setData("data-public-card-announcement-width", `${Math.round(rect.right - rect.left)}`);
        const text = copy.querySelector("b");
        if (text) {
          const range = document.createRange();
          range.selectNodeContents(text);
          const lines = new Set([...range.getClientRects()].map((line) => Math.round(line.top)));
          setData("data-public-card-announcement-lines", `${Math.max(1, lines.size)}`);
        }
        if (copy.style.visibility !== "visible") copy.style.visibility = "visible";
        setDelivery("VISIBLE", currentEventCopyKey);
        reportH4Placement({
          geometryEpoch: currentSharedStage.layout.identity,
          obstacleIds: [],
          decision: "reflow",
          reason: `shared-public-stage-layout-${currentSharedStage.layout.scene.phase.toLowerCase()}`,
          compact: copy.dataset.publicCardAnnouncementCompact === "true",
          rect: { left: rect.left, top: rect.top, width: rect.right - rect.left, height: rect.bottom - rect.top },
          visible: true,
          text: copy.textContent ?? "",
        });
        return;
      }
      const sharedStageCandidate = Boolean(!protectFirstParkedMiniature && sharedTable
        && publicStageLayoutCandidateMatchesElement(sharedTable, {
          scopeId: display.dataset.publicCardRootEventId ?? "",
          viewerId: display.dataset.publicCardViewerId ?? "",
          interactionId: display.dataset.publicCardInteractionId,
          eventIds: [
            copy.dataset.publicCardAnnouncementEventId ?? "",
            copy.dataset.publicCardAnnouncementAnchorEventId ?? "",
          ],
        }));
      const pendingRevealCardNodes = pendingRevealIdentity && sharedTable
        ? [...sharedTable.querySelectorAll<HTMLElement>("[data-public-card-journey-event-id]")].filter((candidate) =>
          candidate.dataset.publicCardJourneyEventId === pendingRevealIdentity.eventId
          && candidate.dataset.publicCardJourneyCardId === pendingRevealIdentity.cardId)
        : [];
      const pendingRevealCard = pendingRevealCardNodes?.length === 1 ? pendingRevealCardNodes[0] : null;
      const pendingRevealFrame = pendingRevealCard?.querySelector<HTMLElement>(".public-card-effect-frame-panel") ?? null;
      const pendingStaticRevealMatches = Boolean(pendingRevealIdentity && pendingRevealFrame
        && publicStageStaticAnnouncementMatchesReveal({
          phase,
          expected: pendingRevealIdentity,
          actual: {
            roomId: display.dataset.publicCardRoomId ?? "",
            rootEventId: display.dataset.publicCardRootEventId ?? "",
            interactionId: display.dataset.publicCardInteractionId ?? "",
            eventId: copy.dataset.publicCardAnnouncementEventId ?? "",
            cardId: pendingRevealCard?.dataset.publicCardJourneyCardId ?? "",
            viewerId: display.dataset.publicCardViewerId ?? "",
          },
        })
        && display.dataset.publicCardEventId === pendingRevealIdentity.eventId
        && display.dataset.publicCardViewerId === display.dataset.publicCardLayoutViewerId
        && pendingRevealCard?.dataset.publicCardJourneyPhase === "reveal"
        && pendingRevealFrame.dataset.publicCardFrameEffectId === "sima_yi_guicai"
        && pendingRevealFrame.dataset.publicCardFrameClass === "JUDGEMENT"
        && pendingRevealFrame.dataset.publicCardFrameCardEventId === pendingRevealIdentity.eventId
        && pendingRevealFrame.dataset.publicCardFrameMaterialCardIds === pendingRevealIdentity.cardId);
      const sharedPendingReveal = phase === "reveal" || phase === "move" || pendingStaticRevealMatches;
      if (sharedStageCandidate && sharedTable && sharedPendingReveal) {
        // Keep the independently anchored factual H4 paint-enabled while the
        // same-event shared card geometry is being measured. Passive card/H4
        // intersections and parked-slot reservations never suppress copy.
        const tableBounds = sharedTable.getBoundingClientRect();
        const upper = fixedUpperHistoryAnnouncementAnchor(sharedTable);
        const band = fixedPublicH4Band(sharedTable);
        const safeLeft = tableBounds.left + 8;
        const safeRight = tableBounds.right - 8;
        const width = Math.max(1, Math.min(band?.width ?? tableBounds.width - 16, safeRight - safeLeft));
        const left = band && width >= band.width - 1 ? band.left : (safeLeft + safeRight - width) / 2;
        const top = upper?.top ?? band?.top ?? tableBounds.top + 8;
        setPx("left", left);
        setPx("top", top);
        setPx("width", width);
        if (pendingStaticRevealMatches) {
          const rect = copy.getBoundingClientRect();
          const wrapper = sharedTable.querySelector<HTMLElement>(".battlefield-choice-stage.stauchness-choice-stage[data-stauchness-choice='true']");
          const panel = wrapper?.querySelector<HTMLElement>(".stauchness-choice-panel") ?? null;
          const consoleTop = document.querySelector<HTMLElement>(".local-player-dock .console-guidance")?.getBoundingClientRect().top ?? tableBounds.bottom;
          const controls = [...sharedTable.querySelectorAll<HTMLElement>(".opponent-player-card[data-player-anchor], .player-square, .public-activity-chip, [data-public-activity-chip], .visible-countdown, .stage-system-cluster, .card-pool-target-stage, .battlefield-choice-stage, .opponent-inspection-floating-shell")]
            .filter((element) => element !== wrapper);
          if (panel && !controls.includes(panel)) controls.push(panel);
          const collides = (element: HTMLElement) => {
            const style = window.getComputedStyle(element);
            const other = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
              && other.width > 0 && other.height > 0
              && rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top;
          };
          const safeUpper = Boolean(upper && rect.left >= safeLeft - 0.5 && rect.right <= safeRight + 0.5
            && rect.top >= tableBounds.top && rect.bottom <= Math.min(tableBounds.bottom, consoleTop)
            && upper.slots.every(({ rect: slot }) => rect.right <= slot.left || rect.left >= slot.left + slot.width
              || rect.bottom <= slot.top || rect.top >= slot.top + slot.height)
            && !controls.some(collides));
          if (!safeUpper) {
            if (copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
            setDelivery("PENDING_PLACEMENT", currentEventCopyKey);
            setData("data-public-card-announcement-placement", undefined);
            setData("data-public-card-announcement-positioned", undefined);
            setData("data-public-card-announcement-stability", "verified-reveal-awaiting-hard-safe-upper-anchor");
            reportH4Placement({ geometryEpoch: null, obstacleIds: ["actual-choice-or-control"], decision: "hide",
              reason: "verified-replacement-upper-anchor-blocked-by-real-control", compact: null,
              rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, visible: false,
              text: copy.textContent ?? "" });
            return;
          }
        }
        if (copy.style.visibility !== "visible") copy.style.visibility = "visible";
        setData("data-public-stage-layout-identity", undefined);
        setData("data-public-card-announcement-positioned", "true");
        setData("data-public-card-announcement-fixed-upper", "true");
        const sharedCoordinates = publicStageCoordinateSpaceForTable(sharedTable);
        const topLocal = sharedCoordinates ? publicStageCoordinateToTableLocal(top, "y", sharedCoordinates) : null;
        setData("data-public-card-announcement-fixed-upper-top", topLocal === null ? undefined : `${Math.round(topLocal * 2) / 2}`);
        setData("data-public-card-announcement-width", `${Math.round(width)}`);
        setData("data-public-card-announcement-placement", "independent-upper-anchor-shared-pending");
        setData("data-public-card-announcement-stability", "canonical-anchor-during-shared-measurement");
        setDelivery("VISIBLE", currentEventCopyKey);
        const rect = copy.getBoundingClientRect();
        reportH4Placement({
          geometryEpoch: null, obstacleIds: [], decision: "reuse", reason: "canonical-upper-anchor-shared-layout-pending",
          compact: copy.dataset.publicCardAnnouncementCompact === "true",
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, visible: true,
        });
        return;
      }
      if (sharedStageCandidate && sharedTable && copy.style.visibility === "visible") {
        // A measured viewport reflow can briefly outpace the shared context.
        // Keep the same committed copy visible only after validating its new
        // upper anchor, the current real card and every visible control.
        const upper = fixedUpperHistoryAnnouncementAnchor(sharedTable);
        const tableBounds = sharedTable.getBoundingClientRect();
        const safeLeft = tableBounds.left + 8;
        const safeRight = tableBounds.right - 8;
        const width = Math.min(copy.getBoundingClientRect().width, safeRight - safeLeft);
        if (upper && width > 0) {
          setPx("left", (safeLeft + safeRight - width) / 2);
          setPx("top", upper.top);
          setPx("width", width);
          const rect = copy.getBoundingClientRect();
          const wrapper = pendingStaticRevealMatches
            ? sharedTable.querySelector<HTMLElement>(".battlefield-choice-stage.stauchness-choice-stage[data-stauchness-choice='true']")
            : null;
          const controls = [...sharedTable.querySelectorAll<HTMLElement>(".opponent-player-card[data-player-anchor], .player-square, .public-activity-chip, [data-public-activity-chip], .visible-countdown, .stage-system-cluster, .card-pool-target-stage, .battlefield-choice-stage, .opponent-inspection-floating-shell")]
            .filter((element) => element !== wrapper);
          const choicePanel = wrapper?.querySelector<HTMLElement>(".stauchness-choice-panel");
          if (choicePanel && !controls.includes(choicePanel)) controls.push(choicePanel);
          const collision = (element: HTMLElement) => {
            const style = window.getComputedStyle(element);
            const other = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && other.width > 0 && other.height > 0
              && rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top;
          };
          const tableBottom = tableBounds.bottom;
          const consoleTop = document.querySelector<HTMLElement>(".local-player-dock .console-guidance")?.getBoundingClientRect().top ?? tableBottom;
          const safePaint = rect.top >= tableBounds.top && rect.bottom <= Math.min(tableBottom, consoleTop)
            && upper.slots.every(({ rect: slot }) => rect.right <= slot.left || rect.left >= slot.left + slot.width
              || rect.bottom <= slot.top || rect.top >= slot.top + slot.height);
          if (rect.left >= safeLeft - 0.5 && rect.right <= safeRight + 0.5 && safePaint && !controls.some(collision)) {
            setData("data-public-card-announcement-positioned", "true");
            setData("data-public-card-announcement-fixed-upper", "true");
            const tableCoordinates = publicStageCoordinateSpaceForTable(sharedTable);
            const topLocal = tableCoordinates ? publicStageCoordinateToTableLocal(upper.top, "y", tableCoordinates) : null;
            setData("data-public-card-announcement-fixed-upper-top", topLocal === null ? undefined : `${Math.round(topLocal * 2) / 2}`);
            setData("data-public-card-announcement-width", `${Math.round(rect.width)}`);
            setData("data-public-card-announcement-placement", "measured-upper-reflow");
            setDelivery("VISIBLE", currentEventCopyKey);
            reportH4Placement({ geometryEpoch: null, obstacleIds: [], decision: "reuse", reason: "measured-upper-reflow-before-shared-generation", compact: null,
              rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, visible: true });
            return;
          }
        }
      }
      if (sharedStageCandidate) {
        // The provider publishes a new generation before React delivers its
        // matching context value. Never expose the prior H4 placement or fall
        // back to an independent solver during that short mismatch window.
        if (copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
        setDelivery("PENDING_PLACEMENT", currentEventCopyKey);
        setData("data-public-stage-layout-identity", undefined);
        setData("data-public-card-announcement-placement", undefined);
        setData("data-public-card-announcement-positioned", undefined);
        setData("data-public-card-announcement-stability", "awaiting-current-shared-stage-layout");
        reportH4Placement({
          geometryEpoch: null,
          obstacleIds: [],
          decision: "hide",
          reason: "awaiting-current-shared-stage-layout-generation",
          compact: null,
          rect: null,
          visible: false,
          text: copy.textContent ?? "",
        });
        return;
      }
      setData("data-public-stage-layout-identity", undefined);
      setData("data-public-card-announcement-placement", undefined);
      const anchor = getAnchor();
      const actualRect = anchor?.getBoundingClientRect();
      const table = display.closest<HTMLElement>(".play-table");
      const tableRect = table?.getBoundingClientRect() ?? null;
      const tableCoordinates = table ? publicStageCoordinateSpaceForTable(table) : null;
      if (!table || !tableRect || !tableCoordinates) {
        if (copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
        setDelivery("PENDING_PLACEMENT", currentEventCopyKey);
        reportH4Placement({
          geometryEpoch: null, obstacleIds: [], decision: "hide", reason: "play-table-unmeasurable; recover-on-table-mount-or-resize",
          compact: null, rect: null, visible: false,
        });
        return;
      }
      currentTableCoordinates = tableCoordinates;
      const localRect = (rect: { left: number; top: number; right: number; bottom: number }) =>
        publicStageRectToTableLocal(rect, tableCoordinates) ?? rect;
      const localTableRect = localRect(tableRect);
      const upperHistoryAnchor = fixedUpperHistoryAnnouncementAnchor(table);
      const fixedUpperTop = upperHistoryAnchor?.top ?? null;
      const fixedUpperLocalTop = fixedUpperTop === null
        ? null : publicStageCoordinateToTableLocal(fixedUpperTop, "y", tableCoordinates);
      setData("data-public-card-announcement-fixed-upper", fixedUpperTop === null ? undefined : "true");
      setData("data-public-card-announcement-fixed-upper-top", fixedUpperLocalTop === null ? undefined : `${Math.round(fixedUpperLocalTop * 2) / 2}`);
      // An announcement band and its measured centre card belong to the
      // viewer's current battlefield geometry. Reuse them across semantic
      // checkpoints only while that geometry remains materially unchanged.
      // A phone resize can shorten the battlefield by 100px while the old
      // centre remains barely inside safeBottom; keeping that band would hide
      // the next two-line public result behind the Local Player Dock.
      const layoutEpoch = `${Math.round(tableRect.width / tableCoordinates.scaleX)}:${Math.round(tableRect.height / tableCoordinates.scaleY)}`;
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const geometryNumber = (value: number) => Math.round(value * 2) / 2;
      const shell = display.closest<HTMLElement>(".game-shell") ?? document;
      const playerAnchorGeometry: PublicAnnouncementSeatGeometry[] = [...shell.querySelectorAll<HTMLElement>("[data-player-anchor]")]
        .flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) return [];
          return [{
            anchorId: element.dataset.playerAnchor ?? "",
            rect: (() => {
              const local = localRect(rect);
              return {
                left: geometryNumber(local.left), top: geometryNumber(local.top),
                right: geometryNumber(local.right), bottom: geometryNumber(local.bottom),
              };
            })(),
          }];
        })
        .sort((left, right) => left.anchorId.localeCompare(right.anchorId)
          || left.rect.left - right.rect.left || left.rect.top - right.rect.top);
      const isLargeRevealAnchor = phase === "reveal" && !stableCenterAnchor
        && actualRect && actualRect.width > 0 && actualRect.height > 0;
      const obstacles: Array<{ element: HTMLElement | null; rect: DOMRect }> = [...document.querySelectorAll<HTMLElement>(
        [".opponent-player-card", ".player-square", ".player-board-status", ".visible-countdown", ".stage-system-cluster", ".public-activity-chip", ...(fixedUpperTop === null ? [".harvest-choice-panel"] : []), ".local-player-dock", ".local-hand-rail", ".console-guidance", ...(privateDrawAware ? [".private-draw-row"] : [])].join(", "),
      )].flatMap((element) => {
        const parked = element.closest<HTMLElement>('[data-public-card-journey-phase="parked"]');
        const parkedBounds = parked?.getBoundingClientRect();
        if (parkedBounds && parkedBounds.width <= 70 && parkedBounds.height <= 110) return [];
        if (element === anchor || element === copy
          || element.dataset.publicCardCopyAnchorEventId === copyAnchorEventId
          || element.contains(copy)) return [];
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0
          ? []
          : [{ element, rect }];
      });
      if (!passiveStationaryReveal) for (const slot of upperHistoryAnchor?.slots ?? []) {
        const rect = slot.rect;
        obstacles.push({ element: slot.element, rect: new DOMRect(rect.left, rect.top, rect.width, rect.height) });
      }
      const protectedGeometry: PublicAnnouncementProtectedGeometry[] = obstacles.map(({ element, rect }) => {
        const local = localRect(rect);
        return {
          kind: element?.className?.toString() ?? "journey-target",
          identity: element?.dataset.publicCardCopyAnchorEventId ?? element?.dataset.playerAnchor ?? "",
          rect: {
            left: geometryNumber(local.left), top: geometryNumber(local.top),
            right: geometryNumber(local.right), bottom: geometryNumber(local.bottom),
          },
        };
      }).sort((left, right) => left.kind.localeCompare(right.kind)
        || left.identity.localeCompare(right.identity)
        || left.rect.left - right.rect.left || left.rect.top - right.rect.top);
      const actualObstacleIds = protectedGeometry.map(({ kind, identity }) => identity ? `${kind}:${identity}` : kind).sort();
      const anchorLocalRect = actualRect && actualRect.width > 0 && actualRect.height > 0 ? localRect(actualRect) : null;
      const anchorGeometry = anchorLocalRect ? {
        left: geometryNumber(anchorLocalRect.left), top: geometryNumber(anchorLocalRect.top),
        right: geometryNumber(anchorLocalRect.right), bottom: geometryNumber(anchorLocalRect.bottom),
      } : null;
      currentGeometryIdentity = publicAnnouncementGeometryIdentity({
        viewerKey: geometryKey,
        layoutRevision: `${viewerLayoutKey}:${layoutEpoch}`,
        viewport: localTableRect,
        table: localTableRect,
        seats: playerAnchorGeometry,
        anchor: anchorGeometry,
        protectedRects: protectedGeometry,
      });
      setData("data-public-card-announcement-geometry-key", currentGeometryIdentity);
      // The H4 band belongs to this viewer's battlefield and seat geometry,
      // not to a moving CardFace, event copy, timer or private card journey.
      const bandKey = `${publicAnnouncementGeometryIdentity({
        viewerKey: geometryKey,
        layoutRevision: `${viewerLayoutKey}:${layoutEpoch}`,
        viewport: localTableRect,
        table: localTableRect,
        seats: playerAnchorGeometry,
        anchor: null,
        protectedRects: [],
      })}:${stableHarvestAnchor ? "harvest" : "public"}${fixedUpperLocalTop === null ? "" : `:upper-${Math.round(fixedUpperLocalTop * 2) / 2}`}`;
      const geometryEpoch = `${layoutEpoch}:${publicAnnouncementTraceHash(currentGeometryIdentity)}`;
      if (!viewerGeometryReady && fixedUpperTop === null) {
        if (copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
        setDelivery("PENDING_PLACEMENT", currentEventCopyKey);
        setData("data-public-card-announcement-stability", "waiting-current-viewer-geometry");
        reportH4Placement({
          geometryEpoch, obstacleIds: actualObstacleIds, decision: "hide", reason: "viewer-seat-geometry-not-ready; recover-on-current-viewer-geometry",
          compact: null, rect: null, visible: false,
        });
        return;
      }
      if (!ignoreJourneyLayoutPending && display.dataset.publicCardLayoutPending === "true") {
        const retained = retainLastValidPlacement(layoutEpoch);
        if (!retained && copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
        setDelivery(retained ? "VISIBLE" : "PENDING_PLACEMENT", currentEventCopyKey);
        const previous = lastValidPlacementInClientSpace();
        reportH4Placement({
          geometryEpoch, obstacleIds: actualObstacleIds, decision: retained ? "reuse" : "hide",
          reason: retained ? "journey-layout-pending; retained-same-geometry-placement-until-layout-settles"
            : "journey-layout-pending; recover-on-journey-layout-settle",
          compact: retained ? previous?.compact ?? null : null,
          rect: retained && previous ? { left: previous.left, top: previous.top, width: previous.width, height: previous.height } : null,
          visible: retained,
        });
        return;
      }
      const safeLeft = tableRect.left + 8;
      const safeRight = tableRect.right - 8;
      const safeTop = tableRect.top + 8;
      const safeBottom = Math.min(tableRect.bottom - 8,
        document.querySelector<HTMLElement>(".local-player-dock .console-guidance")?.getBoundingClientRect().top ?? tableRect.bottom);
      const terminalLustResult = outcome === "LUST_DUEL_DAMAGE_APPLIED" || outcome === "LUST_DUEL_DAMAGE_PREVENTED";
      const lustDisplayAllowsNameWrapping = display.dataset.publicCardMotion === "lust-cost"
        || display.dataset.publicCardMotion === "lust-duel";
      const mobileLustFrame = !terminalLustResult && lustDisplayAllowsNameWrapping && viewportWidth <= 480;
      const compactMobileLustFrame = mobileLustFrame && (document.documentElement.clientHeight || window.innerHeight) <= 860;
      const availableAnnouncementWidth = mobileLustFrame
        ? Math.min(PUBLIC_CARD_ANNOUNCEMENT_MAX_WIDTH, viewportWidth - 16)
        : PUBLIC_CARD_ANNOUNCEMENT_MAX_WIDTH;
      const cachedBand = fixedUpperTop === null ? publicCardAnnouncementBands.get(bandKey) : undefined;
      const existingBandPosition = cachedBand ? tableLocalCardRectToClient({
        left: cachedBand.left, top: cachedBand.top, width: cachedBand.width, height: 1,
      }) : null;
      const existingBand = cachedBand && existingBandPosition
        ? {
          ...cachedBand,
          left: existingBandPosition.left,
          top: existingBandPosition.top,
          width: existingBandPosition.width,
          centerX: publicStageCoordinateFromTableLocal(cachedBand.centerX, "x", tableCoordinates) ?? existingBandPosition.left + existingBandPosition.width / 2,
          centerY: publicStageCoordinateFromTableLocal(cachedBand.centerY, "y", tableCoordinates) ?? existingBandPosition.top,
          centerCardRect: tableLocalCardRectToClient(cachedBand.centerCardRect) ?? cachedBand.centerCardRect,
        }
        : undefined;
      const defaultCenterY = stableHarvestAnchor
        ? tableRect.top + tableRect.height * 0.3
        : tableRect.top + tableRect.height * 0.45;
      const initialCopyHeight = copy.getBoundingClientRect().height;
      const stableCenterY = fixedUpperTop === null
        ? existingBand?.centerY ?? defaultCenterY
        : fixedUpperTop + initialCopyHeight / 2;
      // Reserve one fixed H4 stage band so text length and countdown mounting
      // cannot alter its width or horizontal center.
      const h4CorridorBand = { top: stableCenterY - 64, bottom: stableCenterY + 64 };
      const h4CorridorTopLocal = publicStageCoordinateToTableLocal(h4CorridorBand.top, "y", tableCoordinates);
      const h4CorridorBottomLocal = publicStageCoordinateToTableLocal(h4CorridorBand.bottom, "y", tableCoordinates);
      const corridorWidth = h4CorridorTopLocal !== null && h4CorridorBottomLocal !== null
        ? tableLocalPublicCorridorWidth(table, { top: h4CorridorTopLocal, bottom: h4CorridorBottomLocal })
        : Math.max(1, table.clientWidth - 16);
      const localSafeWidth = (safeRight - safeLeft) / tableCoordinates.scaleX;
      const maxWidth = Math.max(1, Math.min(
        corridorWidth,
        availableAnnouncementWidth,
        publicH4WidthLimit(viewportWidth, corridorWidth, localSafeWidth),
        localSafeWidth,
      ));
      const harvestPool = stableHarvestAnchor
        ? display.closest<HTMLElement>(".play-table")?.querySelector<HTMLElement>(".harvest-choice-panel") ?? null
        : null;
      const harvestPoolBounds = harvestPool?.getBoundingClientRect();
      const stableHarvestPoolRect = harvestPoolBounds && harvestPoolBounds.width > 0 && harvestPoolBounds.height > 0
        ? toCardRect(harvestPoolBounds)
        : null;
      let centerCardRect = stableHarvestAnchor
        ? stableHarvestPoolRect
        : isLargeRevealAnchor ? toCardRect(actualRect) : null;
      if (centerCardRect) {
        const localCenter = clientCardRectToTableLocal(centerCardRect);
        if (localCenter) measuredCenterRef.current = { bandKey, rect: localCenter };
      }
      if (!centerCardRect && measuredCenterRef.current?.bandKey === bandKey) {
        centerCardRect = tableLocalCardRectToClient(measuredCenterRef.current.rect);
      }
      if (!centerCardRect && currentFallbackCardRect) centerCardRect = currentFallbackCardRect;
      if (!centerCardRect) {
        centerCardRect = {
          left: tableRect.left + tableRect.width / 2,
          top: tableRect.top + tableRect.height * 0.45,
          width: 0,
          height: 0,
        };
      }
      // Keep the previous LUST card frame as the announcement's positional
      // anchor, but stop treating that old frame as occupied once the final
      // result has no card left in REVEAL or MOVE. Every physical card is then
      // parked by its real seat and independently reserved as an obstacle.
      // Public REVEAL and authentic PARKED miniatures remain allowed beneath
      // H4. A centre frame explicitly marked to stay clear remains protected.
      // A fixed-upper result can outlive its explicitly identified reveal.
      // Once that actual anchor is gone, its cached rectangle is no longer a
      // live obstacle; still protect every current Seat, miniature and control.
      // Only the matching committed Hand-to-Hand reveal may cross H4 in
      // flight. Its stationary centre remains a protected card rectangle.
      const handReveal = protectFirstParkedMiniature && anchor
        ? anchor.closest<HTMLElement>(".public-hand-transfer") : null;
      const handAnimation = handReveal?.getAnimations().find((animation) =>
        "animationName" in animation && animation.animationName === "revealedCardToHand");
      const timing = handAnimation?.effect?.getComputedTiming();
      const progress = timing?.progress;
      const isHandRevealFlight = Boolean(handReveal && (handReveal.classList.contains("public-hand-transfer-preflight")
        || (typeof progress === "number" && (progress < 0.08 || progress > 0.92))));
      const centerCardStillOccupiesStage = !passiveStationaryReveal && keepCenterAnchorClear && !isHandRevealFlight
        && !(protectFirstParkedMiniature && Boolean(copyAnchorEventId) && !anchor && !currentFallbackCardRect);

      const gap = upperHistoryAnchor && window.matchMedia("(max-width: 700px)").matches
        ? 3 : PUBLIC_CARD_ANNOUNCEMENT_GAP;
      const obstacleClearance = (element: HTMLElement | null) => Boolean(upperHistoryAnchor) && window.matchMedia("(max-width: 700px)").matches
        && upperHistoryAnchor?.slots.some((slot) => slot.element === element) ? 0
        : privateDrawAware && element?.matches(".private-draw-row")
        ? 10
        : compactMobileLustFrame && element?.matches(".public-activity-chip") ? 6
          : element?.matches(".opponent-player-card, .player-square") ? 0 : 2;
      const overlapsObstacle = (rect: DOMRect, element: HTMLElement | null, obstacleRect: DOMRect) =>
        rectsOverlap(toCardRect(rect), obstacleRect, obstacleClearance(element));
      const privateDrawObstacle = privateDrawAware
        ? obstacles.find(({ element }) => element?.matches(".private-draw-row")) ?? null
        : null;
      const staysAbovePrivateDraw = (top: number, height: number) => !privateDrawObstacle
        || top + height + 10 <= privateDrawObstacle.rect.top;
      const previousPlacement = lastValidPlacementInClientSpace();
      const sameCopyAndGeometry = previousPlacement?.eventCopyKey === eventCopyKey
        && previousPlacement.copySignature === copySignature
        && previousPlacement.geometryIdentity === currentGeometryIdentity
        && previousPlacement.layoutEpoch === layoutEpoch
        && previousPlacement.viewerLayoutKey === viewerLayoutKey;
      if (sameCopyAndGeometry && previousPlacement
        && (fixedUpperTop === null || Math.abs(previousPlacement.top - fixedUpperTop) <= 1)) {
        const measuredHeight = measureAnnouncementCopy(
          copy,
          previousPlacement.message,
          previousPlacement.supporting,
          incomingDisplayedCopy.dismantleCardFace,
          incomingDisplayedCopy.segments,
        ).height;
        const previousRect = new DOMRect(previousPlacement.left, previousPlacement.top, previousPlacement.width, measuredHeight);
        const overlapsCurrentCard = (phase === "reveal" || stableCenterAnchor || keepCenterAnchorClear)
          && centerCardStillOccupiesStage && rectsOverlap(toCardRect(previousRect), centerCardRect, gap);
        const blockingObstacle = obstacles.find(({ element, rect }) => element !== anchor
          && overlapsObstacle(previousRect, element, rect));
        const safelyReusable = previousPlacement.left >= safeLeft
          && previousPlacement.left + previousPlacement.width <= safeRight
          && previousPlacement.top >= safeTop
          && previousPlacement.top + measuredHeight <= safeBottom
          && measuredHeight <= previousPlacement.height + 1
          && !overlapsCurrentCard && !blockingObstacle
          && staysAbovePrivateDraw(previousPlacement.top, measuredHeight);
        if (safelyReusable) {
          setPx("left", previousPlacement.left);
          setPx("top", previousPlacement.top);
          setPx("width", previousPlacement.width);
          commitDisplayedCopy({
            ...incomingDisplayedCopy,
            message: previousPlacement.message,
            supporting: previousPlacement.supporting,
            segments: verifiedAnnouncementSegments(previousPlacement.message, narration?.headlineSegments, incomingDisplayedCopy.segments),
          });
          setData("data-public-card-announcement-compact", previousPlacement.compact ? "true" : undefined);
          setData("data-public-card-announcement-width", `${Math.round(previousPlacement.width)}`);
          setData("data-public-card-announcement-positioned", "true");
          setData("data-public-card-announcement-stability", "reused-same-event-geometry-obstacles");
          if (copy.style.visibility !== "visible") copy.style.visibility = "visible";
          setDelivery("VISIBLE", currentEventCopyKey);
          placementFailureRef.current = null;
          if (placementFailureTimer !== null) {
            window.clearTimeout(placementFailureTimer);
            placementFailureTimer = null;
          }
          reportH4Placement({
            geometryEpoch, obstacleIds: actualObstacleIds, decision: "reuse", reason: "same-copy-geometry-and-obstacles-remain-collision-free",
            compact: previousPlacement.compact,
            rect: { left: previousPlacement.left, top: previousPlacement.top, width: previousPlacement.width, height: measuredHeight },
            visible: true, text: previousPlacement.message,
          });
          return;
        }
      }
      const narrationCenterX = (safeLeft + safeRight) / 2;
      const targetCenterX = narrationCenterX;
      const centerOffsets = [0];
      const measuredCopyHeight = copy.getBoundingClientRect().height;
      const existingBandCenterY = existingBand?.centerY ?? stableCenterY;
      const existingBandTop = existingBandCenterY === null ? null : existingBandCenterY - measuredCopyHeight / 2;
      const existingBandRect = existingBand
        ? new DOMRect(existingBand.left, existingBandTop ?? existingBand.top, existingBand.width, measuredCopyHeight)
        : null;
      const existingBandOverlapsObstacle = existingBandRect && obstacles.some(({ element, rect }) =>
        element !== anchor && overlapsObstacle(existingBandRect, element, rect));
      const existingBandFitsCurrentStage = existingBand && existingBandTop !== null
        && !existingBandOverlapsObstacle
        && existingBandTop >= safeTop
        && existingBandTop + measuredCopyHeight <= safeBottom;
      const existingBandHasCurrentVerticalRoom = existingBandCenterY !== null
        && existingBandCenterY - measuredCopyHeight / 2 >= safeTop
        && existingBandCenterY + measuredCopyHeight / 2 <= safeBottom;
      const reusableBand = existingBandFitsCurrentStage && existingBand && existingBandTop !== null
        ? { ...existingBand, top: existingBandTop }
        : null;
      // Even when the previous box is temporarily blocked by a moving card,
      // search around its established centre first. Falling straight back to
      // the reveal-card side can move the shared H4 narration across the table.
      // A viewport/layout change can shrink the battlefield while leaving its
      // old centre technically inside the safe bounds. Do not treat that
      // clipped band as reusable: the next copy would be forced into a box
      // that no longer fits above the Local Player Dock.
      const placementBand = fixedUpperTop !== null
        ? {
          left: targetCenterX - maxWidth / 2,
          top: fixedUpperTop,
          width: maxWidth,
          centerX: targetCenterX,
          centerY: fixedUpperTop + measuredCopyHeight / 2,
          centerCardRect,
          verticalMode: "above" as const,
        }
        : reusableBand ?? (existingBand && existingBandHasCurrentVerticalRoom
        ? existingBand
        : {
          left: targetCenterX - maxWidth / 2,
          top: stableCenterY - measuredCopyHeight / 2,
          width: maxWidth,
          centerX: targetCenterX,
          centerY: stableCenterY,
          centerCardRect,
          verticalMode: preferredVerticalMode ?? "above",
        });
      const canonicalCenterX = targetCenterX;
      const widths = [maxWidth];
      // LUST participant names are identity, not expendable copy. Let their
      // measured text grow naturally; safe bounds and obstacle checks below
      // still reject any placement that would cover a Seat or the Dock.
      const maxTextLines = Number.POSITIVE_INFINITY;
      const announcementOptions = [{ message, supporting: supportingMessage ?? "", compact: false }];
      const setAnnouncementMeasureMode = (compact: boolean, width: number) => {
        setPx("width", width);
        setData("data-public-card-announcement-compact", compact ? "true" : undefined);
        setData("data-public-card-announcement-tight-copy", hasNegationNarration && width <= 224 ? "true" : undefined);
        setData("data-public-card-announcement-width", `${Math.round(width)}`);
      };
      let measuredTextLines = 0;
      const textLines = () => measuredTextLines;
      const measureOption = (option: (typeof announcementOptions)[number]) => {
        const measured = measureAnnouncementCopy(
          copy,
          option.message,
          option.supporting,
          incomingDisplayedCopy.dismantleCardFace,
          incomingDisplayedCopy.segments,
        );
        measuredTextLines = measured.lines;
        return measured.height;
      };
      let selected: { left: number; top: number; width: number; height: number; lines: number; message: string; supporting: string; compact: boolean } | null = null;
      let verticalMode: "above" | "below" = fixedUpperTop !== null ? "above" : preferredVerticalMode ?? (placementBand && centerCardStillOccupiesStage
        ? placementBand.centerY >= centerCardRect.top + centerCardRect.height / 2 ? "below" : "above"
        : placementBand?.verticalMode ?? "above");
      // Keep the established H4 centre within its accepted 16px vertical
      // tolerance while allowing a small obstacle-clearing adjustment. A
      // narrow phone can otherwise have no legal fit between parked history
      // cards and the activity chip even though the band has safe room nearby.
      const topOffsets = fixedUpperTop !== null ? [0] : placementBand
        ? [0, -2, 2, -4, 4, -6, 6, -8, 8, -10, 10, -12, 12, -14, 14, -16, 16]
        : [0, -1, 1, -2, 2, -4, 4, -8, 8, -12, 12, -16, 16];
      const considerCandidate = (
        option: (typeof announcementOptions)[number],
        width: number,
        height: number,
        centerOffset: number,
        top: number,
        allowBandEscape = false,
      ) => {
        if (fixedUpperTop !== null && Math.abs(top - fixedUpperTop) > 0.5) return false;
        const centeredLeft = canonicalCenterX + centerOffset - width / 2;
        if (centeredLeft < safeLeft || centeredLeft + width > safeRight) return false;
        if (fixedUpperTop === null && placementBand && !allowBandEscape && Math.abs(top + height / 2 - placementBand.centerY) > 16) return false;
        if (top < safeTop || top + height > safeBottom || !staysAbovePrivateDraw(top, height)) return false;
        const clearsCenterCard = (!isLargeRevealAnchor && !stableCenterAnchor && !keepCenterAnchorClear) || !centerCardStillOccupiesStage
          || (allowBandEscape
            ? top >= centerCardRect.top + centerCardRect.height + gap - 0.5
              || top + height + gap <= centerCardRect.top + 0.5
            : verticalMode === "below"
              ? top >= centerCardRect.top + centerCardRect.height + gap - 0.5
              : top + height + gap <= centerCardRect.top + 0.5);
        if (!clearsCenterCard) return false;
        const rect = new DOMRect(centeredLeft, top, width, height);
        const lines = textLines();
        if (lines > maxTextLines || obstacles.some(({ element, rect: obstacleRect }) => element !== anchor
          && overlapsObstacle(rect, element, obstacleRect))) return false;
        selected = { left: centeredLeft, top, width, height: rect.height, lines, message: option.message, supporting: option.supporting, compact: option.compact };
        if (allowBandEscape && centerCardStillOccupiesStage) {
          verticalMode = top >= centerCardRect.top + centerCardRect.height + gap - 0.5 ? "below" : "above";
        }
        return true;
      };
      if (hasNegationNarration && placementBand) {
        // For stage narration, find the nearest safe vertical band first,
        // then use a narrower/mobile copy or a small horizontal adjustment.
        // Searching each width's full vertical range first caused the same
        // H4 caption to jump above a revealed card and below its parked mini.
        for (const offset of topOffsets) {
          for (const option of announcementOptions) {
            for (const width of widths) {
              setAnnouncementMeasureMode(option.compact, width);
              setPx("width", width);
              const height = measureOption(option);
              const top = fixedUpperTop ?? placementBand.centerY - height / 2 + offset;
              for (const centerOffset of centerOffsets) {
                if (considerCandidate(option, width, height, centerOffset, top)) break;
              }
              if (selected) break;
            }
            if (selected) break;
          }
          if (selected) break;
        }
      } else {
        for (const option of announcementOptions) {
          for (const width of widths) {
            setAnnouncementMeasureMode(option.compact, width);
            setPx("width", width);
            const height = measureOption(option);
            const baseTop = fixedUpperTop ?? (placementBand
              ? placementBand.centerY - height / 2
              : verticalMode === "below"
                ? centerCardRect.top + centerCardRect.height + gap
                : centerCardRect.top - height - gap);
            for (const centerOffset of centerOffsets) {
              for (const offset of topOffsets) {
                if (considerCandidate(option, width, height, centerOffset, baseTop + offset)) break;
              }
              if (selected) break;
            }
            if (selected) break;
          }
          if (selected) break;
        }
      }

      const previousCopy = lastValidPlacementInClientSpace();
      const previousCopyRect = previousCopy
        ? new DOMRect(previousCopy.left, previousCopy.top, previousCopy.width, previousCopy.height)
        : null;
      const priorBandOverlapsProtectedCenter = keepCenterAnchorClear && (
        Boolean(existingBandRect && rectsOverlap(existingBandRect, centerCardRect, gap))
        || Boolean(previousCopyRect && rectsOverlap(previousCopyRect, centerCardRect, gap))
      );
      const canReflowCurrentBand = (!lastValidPlacementRef.current
        || lastValidPlacementRef.current.viewerLayoutKey !== viewerLayoutKey
        || lastValidPlacementRef.current.layoutEpoch !== layoutEpoch);
      if (!selected && fixedUpperTop === null && (stableCenterAnchor || (hasNegationNarration && canReflowCurrentBand)
        || priorBandOverlapsProtectedCenter)) {
        // Keep the previous H4 position and preferred side when either fits.
        // A layout change or a protected centre-card collision can invalidate
        // that baseline; then search the current safe area around the frame.
        // Protected Seat, Dock, Hand and control rects still apply.
        for (const option of announcementOptions) {
          for (const width of widths) {
            setAnnouncementMeasureMode(option.compact, width);
            setPx("width", width);
            const height = measureOption(option);
            const preferredTop = placementBand
              ? placementBand.centerY - height / 2
              : verticalMode === "below"
                ? centerCardRect.top + centerCardRect.height + gap
                : centerCardRect.top - height - gap;
            const preferredCenterY = placementBand?.centerY ?? preferredTop + height / 2;
            const candidateTops = new Set<number>([
              preferredTop,
              safeTop,
              safeBottom - height,
              centerCardRect.top - height - gap,
              centerCardRect.top + centerCardRect.height + gap,
            ]);
            for (let top = safeTop; top + height <= safeBottom; top += 2) candidateTops.add(top);
            for (const { rect } of obstacles) {
              candidateTops.add(rect.top - height - gap);
              candidateTops.add(rect.bottom + gap);
            }
            const orderedTops = [...candidateTops]
              .filter((top) => Number.isFinite(top) && top >= safeTop && top + height <= safeBottom)
              .sort((first, second) => Math.abs(first + height / 2 - preferredCenterY)
                - Math.abs(second + height / 2 - preferredCenterY));
            for (const top of orderedTops) {
              for (const centerOffset of centerOffsets) {
                if (considerCandidate(option, width, height, centerOffset, top, true)) break;
              }
              if (selected) break;
            }
            if (selected) break;
          }
          if (selected) break;
        }
      }

      if (!selected && fixedUpperTop === null && !placementBand && centerCardStillOccupiesStage) {
        // A constrained short battlefield can place its one stable band just
        // below the reveal card. Skip every real or projected owner-card slot.
        const compactOption = announcementOptions.find((option) => option.compact) ?? announcementOptions[0];
        if (compactOption) {
          for (const width of widths) {
            setAnnouncementMeasureMode(compactOption.compact, width);
            setPx("width", width);
            const height = measureOption(compactOption);
            for (const centerOffset of centerOffsets) {
              const left = canonicalCenterX + centerOffset - width / 2;
              if (left < safeLeft || left + width > safeRight) continue;
              const belowCandidates = [
                centerCardRect.top + centerCardRect.height + gap,
                ...obstacles.map(({ rect }) => rect.bottom + gap),
              ].filter((top) => Number.isFinite(top) && top >= safeTop && staysAbovePrivateDraw(top, height))
                .sort((first, second) => first - second);
              for (const belowTop of belowCandidates) {
                if (belowTop + height > safeBottom) continue;
                const cardObstacle = new DOMRect(centerCardRect.left, centerCardRect.top, centerCardRect.width, centerCardRect.height);
                const candidateRect = new DOMRect(left, belowTop, width, height);
                if (rectsOverlap(candidateRect, cardObstacle, gap)) continue;
                const rect = new DOMRect(left, belowTop, width, height);
                const lines = textLines();
                const hasObstacleCollision = obstacles.some(({ element, rect: obstacleRect }) => element !== anchor
                  && overlapsObstacle(rect, element, obstacleRect));
                if (lines <= maxTextLines && !hasObstacleCollision) {
                  selected = { left, top: belowTop, width, height: rect.height, lines, message: compactOption.message, supporting: compactOption.supporting, compact: compactOption.compact };
                  verticalMode = "below";
                  break;
                }
              }
              if (selected) break;
            }
            if (selected) break;
          }
        }
      }

      if (!selected) {
        for (const option of announcementOptions) {
          for (const width of widths) {
            setAnnouncementMeasureMode(option.compact, width);
            setPx("width", width);
            const height = measureOption(option);
            const preferredTop = fixedUpperTop ?? (placementBand
              ? placementBand.centerY - height / 2
              : verticalMode === "below"
                ? centerCardRect.top + centerCardRect.height + gap
                : centerCardRect.top - height - gap);
            for (const centerOffset of centerOffsets) {
              const left = canonicalCenterX + centerOffset - width / 2;
              if (left < safeLeft || left + width > safeRight) continue;
              const candidateTops = new Set<number>(fixedUpperTop !== null ? [fixedUpperTop] : placementBand ? [preferredTop] : [
                safeTop,
                preferredTop,
                safeBottom - height,
                centerCardRect.top - height - gap,
                centerCardRect.top + centerCardRect.height + gap,
              ]);
              if (!placementBand && fixedUpperTop === null) {
                for (let top = safeTop; top + height <= safeBottom; top += 2) candidateTops.add(top);
                for (const { element, rect } of obstacles) {
                  const clearance = obstacleClearance(element);
                  candidateTops.add(rect.top - height - clearance);
                  candidateTops.add(rect.bottom + clearance);
                }
              }
              const orderedTops = [...candidateTops]
                .filter((top) => Number.isFinite(top) && top >= safeTop && top + height <= safeBottom && staysAbovePrivateDraw(top, height))
                .sort((first, second) => Math.abs(first - preferredTop) - Math.abs(second - preferredTop));
              for (const top of orderedTops) {
                if (fixedUpperTop === null && placementBand && Math.abs(top + height / 2 - placementBand.centerY) > 16) continue;
                const rect = new DOMRect(left, top, width, height);
                const lines = textLines();
                const centerCardOverlap = centerCardStillOccupiesStage
                  && rectsOverlap(toCardRect(rect), centerCardRect, gap);
                const hasObstacleCollision = obstacles.some(({ element, rect: obstacleRect }) =>
                  overlapsObstacle(rect, element, obstacleRect));
                if (lines <= maxTextLines && !centerCardOverlap && !hasObstacleCollision) {
                  selected = { left, top, width, height: rect.height, lines, message: option.message, supporting: option.supporting, compact: option.compact };
                  verticalMode = top + height + gap <= centerCardRect.top ? "above" : "below";
                  break;
                }
              }
              if (selected) break;
            }
            if (selected) break;
          }
          if (selected) break;
        }
      }

      if (!selected) {
        const previous = lastValidPlacementInClientSpace();
        if (previous?.geometryIdentity === currentGeometryIdentity) setPx("width", previous.width);
        const retained = retainLastValidPlacement(layoutEpoch);
        if (!retained && copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
        setDelivery(retained ? "VISIBLE" : "PENDING_PLACEMENT", currentEventCopyKey);
        setData("data-public-card-announcement-fallback", "true");
        const blockedPreviousBand = previous && obstacles.find(({ element, rect }) => element !== anchor
          && overlapsObstacle(new DOMRect(previous.left, previous.top, previous.width, previous.height), element, rect));
        const blockerId = blockedPreviousBand?.element
          ? `${blockedPreviousBand.element.className?.toString() ?? "obstacle"}:${blockedPreviousBand.element.dataset.publicCardCopyAnchorEventId ?? blockedPreviousBand.element.dataset.playerAnchor ?? "present"}`
          : null;
        reportH4Placement({
          geometryEpoch, obstacleIds: actualObstacleIds, decision: retained ? "reuse" : "hide",
          reason: retained ? "new-candidate-unavailable; retained-prior-safe-band-until-next-layout-change"
            : blockerId ? `prior-band-blocked-by-${blockerId}; recover-on-obstacle-or-geometry-change`
              : "no-safe-collision-free-placement; recover-on-material-geometry-or-obstacle-change",
          compact: retained ? previous?.compact ?? null : null,
          rect: retained && previous ? { left: previous.left, top: previous.top, width: previous.width, height: previous.height } : null,
          visible: retained, text: incomingDisplayedCopy.message,
        });
        return;
      }
      if (stableHarvestAnchor) {
        const parkedMiniOverlaps = [...display.querySelectorAll<HTMLElement>("[data-public-card-harvest-history-parked='true']")]
          .filter((mini) => {
            const style = window.getComputedStyle(mini);
            const rect = mini.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0
              && rectsOverlap(selected!, rect, 0);
          });
        setData("data-public-card-announcement-harvest-mini-overlap-count", parkedMiniOverlaps.length ? `${parkedMiniOverlaps.length}` : undefined);
      }
      placementFailureRef.current = null;
      if (placementFailureTimer !== null) {
        window.clearTimeout(placementFailureTimer);
        placementFailureTimer = null;
      }
      setData("data-public-card-announcement-fallback", undefined);
      setPx("left", selected.left);
      setPx("top", selected.top);
      setPx("width", selected.width);
      const selectedLocal = clientCardRectToTableLocal({
        left: selected.left, top: selected.top, width: selected.width, height: selected.height,
      });
      const centerCardLocal = clientCardRectToTableLocal(centerCardRect);
      if (selectedLocal && centerCardLocal) {
        const localCenterX = hasNegationNarration && placementBand
          ? publicStageCoordinateToTableLocal(placementBand.centerX, "x", tableCoordinates)
          : selectedLocal.left + selectedLocal.width / 2;
        const localCenterY = fixedUpperTop !== null ? selectedLocal.top + selectedLocal.height / 2
          : hasNegationNarration && placementBand
            ? publicStageCoordinateToTableLocal(placementBand.centerY, "y", tableCoordinates)
            : selectedLocal.top + selectedLocal.height / 2;
        if (localCenterX !== null && localCenterY !== null) {
          rememberPublicCardAnnouncementBand(bandKey, {
            left: selectedLocal.left,
            top: selectedLocal.top,
            width: selectedLocal.width,
            centerX: localCenterX,
            centerY: localCenterY,
            centerCardRect: centerCardLocal,
            verticalMode,
          });
        }
      }
      const nextDisplayedCopy: DisplayedPublicCardAnnouncement = {
        message: selected.message,
        supporting: selected.supporting,
        eventId: narrationEventId ?? eventId,
        latestCommittedEventId: narrationLatestCommittedEventId,
        checkpointId: narrationCheckpointId,
        phase: narrationPhase,
        rootEffectState: narrationRootEffectState,
        accessibleLabel: narrationAccessibleLabel,
        dismantleCardFace: incomingDisplayedCopy.dismantleCardFace,
        segments: verifiedAnnouncementSegments(selected.message, narration?.headlineSegments, incomingDisplayedCopy.segments),
      };
      commitDisplayedCopy(nextDisplayedCopy);
      const previous = lastValidPlacementInClientSpace();
      const sameBand = previous?.geometryIdentity === currentGeometryIdentity
        && previous.layoutEpoch === layoutEpoch
        && Math.abs(previous.left - selected.left) <= 1
        && Math.abs(previous.top - selected.top) <= 1
        && Math.abs(previous.width - selected.width) <= 1;
      setData("data-public-card-announcement-compact", selected.compact ? "true" : undefined);
      setData("data-public-card-announcement-tight-copy", hasNegationNarration && selected.width <= 224 ? "true" : undefined);
      setData("data-public-card-announcement-width", `${Math.round(selected.width)}`);
      setData("data-public-card-announcement-lines", `${selected.lines}`);
      setData("data-public-card-announcement-positioned", "true");
      setData("data-public-card-announcement-placement", verticalMode === "above" ? "center-band-above" : "center-band-below");
      setData("data-public-card-announcement-stability", undefined);
      if (copy.style.visibility !== "visible") copy.style.visibility = "visible";
      setDelivery("VISIBLE", currentEventCopyKey);
      reportH4Placement({
        geometryEpoch, obstacleIds: actualObstacleIds,
        decision: sameBand ? "reuse" : "reflow",
        reason: fixedUpperTop !== null ? sameBand ? "fixed-upper-first-history-slot-band-reused" : "fixed-upper-first-history-slot-reservation"
          : sameBand ? "existing-safe-band-remains-valid-for-current-copy"
          : previous ? "material-geometry-or-obstacle-change-required-safe-reflow" : "initial-safe-placement",
        compact: selected.compact,
        rect: { left: selected.left, top: selected.top, width: selected.width, height: selected.height },
        visible: true, text: selected.message,
      });
      lastGeometryKeyRef.current = geometryKey;
      const selectedInTableLocal = clientCardRectToTableLocal({
        left: selected.left, top: selected.top, width: selected.width, height: selected.height,
      });
      if (!selectedInTableLocal) {
        if (copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
        setDelivery("PENDING_PLACEMENT", currentEventCopyKey);
        return;
      }
      lastValidPlacementRef.current = {
        geometryIdentity: currentGeometryIdentity,
        layoutEpoch,
        viewerLayoutKey,
        eventCopyKey,
        copySignature,
        ...selectedInTableLocal,
        compact: selected.compact,
        message: selected.message,
        supporting: selected.supporting,
      };
      placementFailureRef.current = null;
    };
    const schedule = () => {
      if (placementGeneration !== placementGenerationRef.current) return;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        place();
      });
    };
    schedulePlacementRef.current = schedule;
    // Resolve the new viewer geometry in the same layout commit, before paint.
    // The solver still hides the announcement if the new bounds are unsafe.
    if (geometryChanged && protectFirstParkedMiniature) place();
    const anchor = getAnchor();
    anchorObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(schedule);
    if (anchor) anchorObserver?.observe(anchor, { attributes: true, attributeFilter: ["style", "data-harvest-root-parked"] });
    const revealTransfer = anchor?.closest<HTMLElement>(".public-hand-transfer") ?? null;
    if (revealTransfer && phase === "reveal") {
      const followDeadline = performance.now() + 5_000;
      const followRevealAnchor = () => {
        if (placementGeneration !== placementGenerationRef.current) return;
        schedule();
        const animationRunning = revealTransfer.getAnimations().some((animation) => animation.playState === "running" || animation.playState === "pending");
        if (animationRunning && performance.now() < followDeadline) {
          revealAnchorFollowTimer = window.setTimeout(followRevealAnchor, 80);
        }
      };
      revealAnchorFollowTimer = window.setTimeout(followRevealAnchor, 0);
    }
    const harvestStage = display.closest<HTMLElement>(".play-table")?.querySelector<HTMLElement>(".harvest-choice-stage");
    if (harvestStage) anchorObserver?.observe(harvestStage, { attributes: true, attributeFilter: ["style"], childList: stableHarvestAnchor, subtree: stableHarvestAnchor });
    anchorObserver?.observe(display, { attributes: true, attributeFilter: ["data-public-card-layout-pending"] });
    const onResize = schedule;
    schedule();
    window.addEventListener("resize", onResize);
    resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onResize);
    const table = display.closest<HTMLElement>(".play-table");
    const playerBoard = document.querySelector<HTMLElement>(".player-board");
    if (table) resizeObserver?.observe(table);
    if (playerBoard) resizeObserver?.observe(playerBoard);
    for (const element of document.querySelectorAll<HTMLElement>(protectedSelectors)) resizeObserver?.observe(element);
    if (stableHarvestAnchor) {
      const harvestPool = table?.querySelector<HTMLElement>(".harvest-choice-panel");
      if (harvestPool) resizeObserver?.observe(harvestPool);
    }
    if ((privateDrawAware || protectFirstParkedMiniature) && typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver((records) => {
        const affectsPrivateDraw = privateDrawAware && records.some((record) => {
          const target = record.target instanceof Element ? record.target : record.target.parentElement;
          if (target?.closest(".public-skill-event-announcement")) return false;
          if (target?.closest(".private-draw-row")) return true;
          return [...record.addedNodes, ...record.removedNodes].some((node) => node instanceof Element
            && (node.matches(".private-draw-row") || Boolean(node.querySelector(".private-draw-row"))));
        });
        const affectsParkedCard = protectFirstParkedMiniature && records.some((record) => {
          const target = record.target instanceof Element ? record.target : record.target.parentElement;
          return Boolean(target?.closest(".public-card-journey-card")
            || [...record.addedNodes, ...record.removedNodes].some((node) => node instanceof Element
              && (node.matches(".public-card-journey-card") || Boolean(node.querySelector(".public-card-journey-card")))));
        });
        if (!affectsPrivateDraw && !affectsParkedCard) return;
        if (privateDrawAware) for (const element of document.querySelectorAll<HTMLElement>(".private-draw-row")) resizeObserver?.observe(element);
        if (protectFirstParkedMiniature) for (const element of document.querySelectorAll<HTMLElement>('.public-card-journey-card[data-public-card-journey-phase="queued"], .public-card-journey-card[data-public-card-journey-phase="reveal"], .public-card-journey-card[data-public-card-journey-phase="move"], .public-card-journey-card[data-public-card-journey-phase="parked"]')) resizeObserver?.observe(element);
        schedule();
      });
      // Observe only actual private-draw changes; rewriting this live region's
      // own text must not schedule another placement pass.
      mutationObserver.observe(display.closest<HTMLElement>(".game-shell") ?? document.body, {
        attributes: protectFirstParkedMiniature,
        attributeFilter: protectFirstParkedMiniature ? ["style", "data-public-card-journey-phase", "data-public-card-journey-target-left", "data-public-card-journey-target-top", "data-public-card-journey-target-width", "data-public-card-journey-target-height", "data-public-card-journey-author-reservation-left", "data-public-card-journey-author-reservation-top", "data-public-card-journey-author-reservation-width", "data-public-card-journey-author-reservation-height"] : undefined,
        childList: true,
        subtree: true,
      });
    }

    return () => {
      if (placementGeneration === placementGenerationRef.current) placementGenerationRef.current += 1;
      if (schedulePlacementRef.current === schedule) schedulePlacementRef.current = null;
      window.removeEventListener("resize", onResize);
      if (placementFailureTimer !== null) window.clearTimeout(placementFailureTimer);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      anchorObserver?.disconnect();
      if (revealAnchorFollowTimer !== null) window.clearTimeout(revealAnchorFollowTimer);
      window.cancelAnimationFrame(frame);
    };
  }, [anchorEventId, eventCopyKey, eventId, geometryKey, privateDrawAware, protectFirstParkedMiniature, reportH4Placement, sharedPublicStage, stableHarvestAnchor]);

  useLayoutEffect(() => {
    latestInputsRef.current = latestInputs;
  });

  useLayoutEffect(() => {
    const inputs = latestInputsRef.current;
    const lifecycle = transitionPublicAnnouncementCopyLifecycle(copyLifecycleRef.current, {
      eventCopyKey: inputs.eventCopyKey,
      stage: inputs.copyLifecycleStage,
    });
    copyLifecycleRef.current = lifecycle;
    const copy = copyRef.current;
    if (copy && copy.dataset.publicCardAnnouncementLifecycle !== lifecycle.stage) {
      copy.dataset.publicCardAnnouncementLifecycle = lifecycle.stage;
    }
    schedulePlacementRef.current?.();
  }, [placementInputKey]);

  return <div
    ref={copyRef}
    className={`public-card-display-copy public-card-display-journey-copy${negationWaiting ? " is-negation-waiting" : ""}${negationNarration ? " is-negation-narration" : ""}${heading ? " public-event-announcement-copy" : ""}`}
    role="status"
    aria-live="polite"
    aria-atomic="true"
    data-public-card-announcement="true"
    data-public-card-announcement-delivery="COMMITTED"
    data-public-h4-event-id={displayedCopy.eventId}
    data-public-h4-public-sequence={Number.isSafeInteger(h4PublicSequence) ? h4PublicSequence : publicSequenceForEvent?.(displayedCopy.eventId)}
    data-public-h4-owner={h4Owner}
    data-public-card-announcement-key={displayedCopy.eventId}
    data-public-card-announcement-copy-key={eventCopyKey}
    data-public-card-announcement-geometry-key={geometryKey}
    data-public-card-announcement-event-id={displayedCopy.eventId}
    data-public-card-stage-primary-event-id={stagePrimaryEventId ?? undefined}
    data-public-card-announcement-anchor-event-id={anchorEventId === null ? undefined : anchorEventId ?? eventId}
    data-public-negation-latest-event-id={displayedCopy.latestCommittedEventId}
    data-public-negation-checkpoint-id={displayedCopy.checkpointId}
    data-public-negation-phase={displayedCopy.phase}
    data-public-negation-effect-state={displayedCopy.rootEffectState}
    data-public-card-copy-anchor-event-id={anchorEventId === null ? undefined : anchorEventId ?? eventId}
    data-public-card-phase-notice={phaseNotice}
    data-public-card-result={outcome}
    style={{ top: 0, left: 0, visibility: "hidden" }}
  >
    {heading && <span className="public-event-announcement-heading">{heading}</span>}
    <b aria-label={displayedCopy.accessibleLabel ?? displayedCopy.message}>
      {displayedCopy.dismantleCardFace && displayedCopy.dismantleCardFace.message === displayedCopy.message
        ? <PublicDismantleCardFaceH4 copy={displayedCopy.dismantleCardFace} />
        : <PublicH4Text message={displayedCopy.message} segments={displayedCopy.segments} />}
    </b>
    {displayedCopy.supporting && <span className="public-card-announcement-support public-negation-narration-support" aria-hidden="true">{displayedCopy.supporting}</span>}
  </div>;
}

export function PublicSkillEventAnnouncementLayer({
  announcement,
  roomCode,
  viewerId,
}: {
  announcement: PublicSkillEventAnnouncement;
  roomCode: string;
  viewerId: string;
}) {
  return <section
    className={`public-card-display public-card-display-journey public-skill-event-announcement${announcement.exiting ? " is-exiting" : ""}`}
    data-public-skill-event-announcement="true"
    data-public-event-semantics={announcement.semantics}
    data-public-event-kind={announcement.kind}
    data-public-event-id={announcement.eventId}
    data-public-event-root-id={announcement.rootEventId}
    data-public-event-source-id={announcement.sourceId}
    data-public-event-proof-id={announcement.proofEventId}
    data-public-event-phase={announcement.phase}
  >
    <PublicCardAnnouncement
      eventId={announcement.eventId}
      h4Owner="PublicSkillEventAnnouncementLayer"
      h4PublicSequence={announcement.publicSequence}
      anchorEventId={null}
      eventCopyKey={buildPublicAnnouncementEventCopyKey({
        roomCode,
        rootEventId: announcement.rootEventId,
        checkpointEventId: announcement.eventId,
        proofEventId: announcement.proofEventId,
        actorId: announcement.sourceId,
        actionClass: `skill:${announcement.kind}`,
      })}
      geometryKey={publicAnnouncementGeometryKey(roomCode, viewerId)}
      copyLifecycleStage={announcement.exiting ? "READING" : "ACTIVE"}
      placementKey={`${roomCode}:public-skill-event-band`}
      viewerLayoutKey={viewerId}
      phase="static"
      heading={announcement.heading}
      message={announcement.message}
      segments={announcement.segments}
      fallbackCardRect={null}
      stableCenterAnchor
      privateDrawAware
    />
  </section>;
}

/** H4 for a proven outcome whose originating physical-card journey has ended. */
export function PublicInteractionAnnouncementLayer({
  narration,
  roomCode,
  viewerId,
  anchorEventId = null,
  protectFirstParkedMiniature = false,
  keepCenterAnchorClear = false,
  preferredVerticalMode,
}: {
  narration: PublicInteractionNarration;
  roomCode: string;
  viewerId: string;
  anchorEventId?: string | null;
  protectFirstParkedMiniature?: boolean;
  keepCenterAnchorClear?: boolean;
  preferredVerticalMode?: "above" | "below";
}) {
  const [expiredEventId, setExpiredEventId] = useState<string | null>(null);
  useEffect(() => {
    if (!narration.readDurationMs) return;
    const eventId = narration.eventId;
    const timer = window.setTimeout(() => setExpiredEventId(eventId), narration.readDurationMs);
    return () => window.clearTimeout(timer);
  }, [narration.eventId, narration.readDurationMs]);
  if (narration.readDurationMs && expiredEventId === narration.eventId) return null;
  return <section className="public-card-display public-card-display-journey public-interaction-event-announcement"
    data-public-interaction-event-id={narration.eventId} data-public-event-root-id={narration.rootEventId}>
    <PublicCardAnnouncement
      eventId={narration.eventId}
      h4Owner="PublicInteractionAnnouncementLayer"
      h4PublicSequence={narration.publicSequence}
      anchorEventId={anchorEventId}
      eventCopyKey={buildPublicAnnouncementEventCopyKey({
        roomCode, rootEventId: narration.rootEventId, checkpointEventId: narration.eventId,
        proofEventId: narration.eventId, actorId: narration.actorId ?? "public", actionClass: "interaction-outcome",
        interactionId: narration.interactionId, rootFrameId: narration.rootFrameId,
      })}
      geometryKey={publicAnnouncementGeometryKey(roomCode, viewerId)}
      copyLifecycleStage="ACTIVE"
      placementKey={`${roomCode}:public-interaction-event-band`}
      viewerLayoutKey={viewerId}
      phase={anchorEventId ? "reveal" : "static"}
      message={narration.headline}
      segments={narration.headlineSegments}
      compactMessage={narration.compactHeadline}
      accessibleLabel={narration.accessibleLabel}
      presentationNarration={narration}
      supportingMessage={narration.supportingMessage}
      compactSupportingMessage={narration.compactSupportingMessage}
      fallbackCardRect={null}
      stableCenterAnchor={!anchorEventId}
      keepCenterAnchorClear={keepCenterAnchorClear}
      preferredVerticalMode={preferredVerticalMode}
      protectFirstParkedMiniature={protectFirstParkedMiniature}
      ignoreJourneyLayoutPending
    />
  </section>;
}

/** H4 for a newer, server-proven public discard that supersedes an older result. */
export function PublicDiscardAnnouncementLayer({ announcement, roomCode, viewerId }: {
  announcement: PublicDiscardAnnouncement;
  roomCode: string;
  viewerId: string;
}) {
  return <section className="public-card-display public-card-display-journey public-interaction-event-announcement public-discard-announcement"
    data-public-discard-announcement-event-id={announcement.eventId}
    data-public-discard-announcement-card-ids={announcement.cards?.map((card) => card.id).join(",") ?? ""}
    data-public-discard-announcement-card-count={announcement.count}>
    <PublicCardAnnouncement
      eventId={announcement.eventId}
      h4Owner="PublicDiscardAnnouncementLayer"
      h4PublicSequence={announcement.order}
      anchorEventId={null}
      eventCopyKey={buildPublicAnnouncementEventCopyKey({
        roomCode,
        rootEventId: announcement.eventId,
        checkpointEventId: announcement.eventId,
        proofEventId: announcement.eventId,
        actorId: announcement.actorId,
        actionClass: "committed-public-discard",
      })}
      geometryKey={publicAnnouncementGeometryKey(roomCode, viewerId)}
      copyLifecycleStage="ACTIVE"
      placementKey={`${roomCode}:public-discard-announcement`}
      viewerLayoutKey={viewerId}
      phase="static"
      message={announcement.headline}
      segments={announcement.segments}
      compactMessage={announcement.headline}
      accessibleLabel={announcement.accessibleLabel}
      fallbackCardRect={null}
      stableCenterAnchor
      ignoreJourneyLayoutPending
    />
  </section>;
}

function AttackDodgeCardJourney({
  action,
  enabled,
  sourceName,
  targetName,
  compactPlayerNamesById,
  roomCode,
  viewerId,
  publicSequenceForEvent,
  onInspectCard,
  onJourneyEventParked,
}: {
  action: PublicCardDisplayAction;
  enabled: boolean;
  sourceName: string | null;
  targetName: string | null;
  compactPlayerNamesById: CompactPublicPlayerNames;
  roomCode: string;
  viewerId: string;
  publicSequenceForEvent?: (eventId: string) => number | undefined;
  onInspectCard?: (card: Card, trigger: HTMLButtonElement) => void;
  onJourneyEventParked?: (eventId: string) => void;
}) {
  const scopeKey = action.motion?.scopeKey ?? action.rootEventId;
  const [journey, setJourney] = useState<JourneyState>({ scopeKey: "", viewerId: "", cards: [], center: null, suppressTransitions: false, layoutPending: false });
  const journeyRef = useRef(journey);
  const actionRef = useRef(action);
  const sourceNameRef = useRef(sourceName);
  const mountedRef = useRef(false);
  const enabledRef = useRef(enabled);
  const documentVisibleRef = useRef(true);
  const parkedNotifiedEventIdsRef = useRef(new Set<string>());
  const traceSignaturesRef = useRef(new Map<string, string>());
  const [documentVisible, setDocumentVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  const hasAttackDodgeMotion = action.motion?.type === "attack-dodge";
  const attackDodgeMotion = action.motion?.type === "attack-dodge" ? action.motion : null;
  const eventSignature = `${action.rootEventId}|${action.response?.eventId ?? ""}|${action.deflection?.eventId ?? ""}|${attackDodgeMotion?.rootFresh ? "new-root" : "parked-root"}|${attackDodgeMotion?.responseFresh ? "new-response" : "parked-response"}|${attackDodgeMotion?.deflectionFresh ? "new-deflection" : "parked-deflection"}`;
  const latestResponse = action.response ?? null;
  const latestDeflection = action.deflection ?? null;
  const publicEffectFrameOwnsAnnouncementAnchor = Boolean(action.publicCardEffectFrame
    && [action.rootEventId, action.response?.eventId].includes(action.publicCardEffectFrame.eventId));
  const activeJourneyCard = journey.cards.find((card) => card.phase === "reveal")
    ?? [...journey.cards].reverse().find((card) => card.phase === "move")
    ?? [...journey.cards].reverse().find((card) => card.phase !== "queued")
    ?? null;
  const activeCard = activeJourneyCard?.cardFace ?? latestResponse?.cardFace ?? latestDeflection?.cardFace ?? action.cardFace ?? null;
  const activeEventId = activeJourneyCard?.eventId ?? latestResponse?.eventId ?? latestDeflection?.eventId ?? action.rootEventId;
  const activeActorId = activeJourneyCard?.actorId ?? latestResponse?.actorId ?? latestDeflection?.actorId ?? action.sourceId;
  const activeNotice = activeJourneyCard?.ariaLabel ?? latestResponse?.ariaLabel ?? latestDeflection?.publicNotice ?? action.publicNotice ?? action.ariaLabel;
  const activePhase = activeJourneyCard?.phase ?? null;
  const activeActorName = activeJourneyCard?.actorName ?? latestResponse?.actorName ?? latestDeflection?.actorName ?? sourceName;
  const activeRevealStartedAtMs = activeJourneyCard?.revealStartedAtMs ?? null;
  const activeRevealRemainingMs = activeJourneyCard?.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS;
  const settledOutcomeMessage = activeJourneyCard?.phase === "parked"
    && activeJourneyCard.eventId === action.response?.eventId
    ? action.settlement?.publicOutcomeMessage : undefined;
  const publicNarration = settledOutcomeMessage && action.publicInteractionNarration
    ? { ...action.publicInteractionNarration, headline: settledOutcomeMessage,
      compactHeadline: settledOutcomeMessage, accessibleLabel: settledOutcomeMessage }
    : action.publicInteractionNarration;
  const announcementAction = publicNarration ? { ...action, publicInteractionNarration: publicNarration } : action;
  const announcementCopy = publicCardAnnouncementCopy(announcementAction, activeNotice, activeActorName, activeActorId, sourceName, targetName, compactPlayerNamesById, activeEventId);
  const committedFactCopy = publicCardCommittedFactCopy(announcementAction, announcementCopy);
  const negationNarration = action.publicNegationNarration;
  const announcementPhaseNotice = action.settlement || action.publicInteractionNarration || negationNarration ? undefined : action.phaseNotice;
  const announcement = committedFactCopy.message;
  const compactAnnouncement = committedFactCopy.compactMessage;

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useLayoutEffect(() => {
    actionRef.current = action;
    sourceNameRef.current = sourceName;
  }, [action, sourceName]);

  useLayoutEffect(() => {
    journeyRef.current = journey;
  }, [journey]);

  useLayoutEffect(() => {
    enabledRef.current = enabled;
    documentVisibleRef.current = documentVisible;
  }, [enabled, documentVisible]);

  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    updateVisibility();
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useLayoutEffect(() => {
    const currentAction = actionRef.current;
    const currentSourceName = sourceNameRef.current;
    const motion = currentAction.motion?.type === "attack-dodge" ? currentAction.motion : null;
    if (!enabled || !motion) return;
    const publicFrameJourneyEventIds = [currentAction.rootEventId, currentAction.response?.eventId].filter(Boolean);
    const currentPublicFrame = currentAction.publicCardEffectFrame && publicFrameJourneyEventIds.includes(currentAction.publicCardEffectFrame.eventId)
      ? currentAction.publicCardEffectFrame : undefined;
    const center = currentPublicFrame
      ? battlefieldPublicEffectFrameCard(currentPublicFrame)
      : battlefieldCenterCard(REVEAL_CARD);
    const previousState = journeyRef.current;
    const sameInteraction = previousState.scopeKey === scopeKey;
    const pendingRevealCenter = center ?? (sameInteraction ? previousState.center : null);
    if (!pendingRevealCenter) return;
    const centerPlacementUnavailable = center === null && currentAction.cardFace !== undefined;
    const viewerChanged = sameInteraction && previousState.viewerId !== viewerId;
    const previous = sameInteraction ? previousState.cards : [];
    const root = currentAction.cardFace && currentSourceName ? [{
      eventId: currentAction.rootEventId,
      actorId: currentAction.physicalActorId ?? currentAction.sourceId,
      actorName: currentAction.physicalActorName ?? currentSourceName,
      cardFace: currentAction.cardFace,
      ariaLabel: currentAction.ariaLabel,
      semanticLabel: undefined,
      role: "root" as const,
      reveal: motion.rootFresh,
    }] : [];
    const response = currentAction.response?.cardFace ? [{
      eventId: currentAction.response.eventId,
      actorId: currentAction.response.actorId,
      actorName: currentAction.response.actorName,
      cardFace: currentAction.response.cardFace,
      ariaLabel: currentAction.response.ariaLabel,
      semanticLabel: currentAction.response.semanticLabel,
      role: "response" as const,
      reveal: motion.responseFresh,
    }] : [];
    const deflection = currentAction.deflection ? [{
      eventId: currentAction.deflection.eventId,
      actorId: currentAction.deflection.actorId,
      actorName: currentAction.deflection.actorName,
      cardFace: currentAction.deflection.cardFace,
      ariaLabel: currentAction.deflection.ariaLabel,
      semanticLabel: "DEFLECTION",
      role: "deflection" as const,
      reveal: motion.deflectionFresh,
    }] : [];
    const incoming = [...root, ...response, ...deflection];
    const priorEventIds = new Set(previous.map((card) => card.eventId));
    const newCommittedResponses = incoming.filter((candidate) => candidate.role !== "root"
      && candidate.reveal && !priorEventIds.has(candidate.eventId));
    const latestNewResponseEventId = newCommittedResponses.at(-1)?.eventId ?? null;
    const newestFreshEventId = [...incoming].reverse().find((candidate) => candidate.reveal)?.eventId ?? null;
    const nextCards = incoming.map((candidate) => {
      const prior = previous.find((card) => card.eventId === candidate.eventId);
      const target = actorParkedCard(candidate.actorId);
      const parkedTarget = target ?? center ?? pendingRevealCenter;
      if (prior) {
        if (viewerChanged) {
          const phase = prior.phase === "move" ? "parked" as const : prior.phase;
          return {
            ...prior,
            actorId: candidate.actorId,
            actorName: candidate.actorName,
            cardFace: candidate.cardFace,
            ariaLabel: candidate.ariaLabel,
            semanticLabel: candidate.semanticLabel,
            phase,
            target: parkedTarget,
            rect: phase === "parked" ? parkedTarget : phase === "reveal" ? center ?? prior.rect : prior.rect,
            moveStartedAtMs: null,
            layoutPending: centerPlacementUnavailable && phase === "reveal" || phase === "parked" && !target,
            layoutChangeReason: "viewer-switch",
          };
        }
        if (latestNewResponseEventId && prior.eventId !== latestNewResponseEventId && prior.phase === "reveal") {
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const elapsed = prior.revealStartedAtMs == null ? 0 : Math.max(0, performance.now() - prior.revealStartedAtMs);
          const directPark = directParkPublicJourneyOnPhone(currentAction, prior.role, Boolean(target));
          rememberAttackDodgeJourneyLifecycle(
            attackDodgeJourneyLifecycleKey(roomCode, currentAction.rootEventId, scopeKey, prior.eventId),
            {
              phase: !target || reducedMotion || directPark ? "parked" : "move",
              revealStartedAtMs: null,
              revealStartedAtIso: prior.revealStartedAtIso ?? null,
              revealElapsedMs: (prior.revealElapsedMs ?? 0) + elapsed,
              revealRemainingMs: 0,
            },
          );
          return {
            ...prior,
            actorId: candidate.actorId,
            actorName: candidate.actorName,
            cardFace: candidate.cardFace,
            ariaLabel: candidate.ariaLabel,
            semanticLabel: candidate.semanticLabel,
            phase: !target || reducedMotion || directPark ? "parked" as const : "move" as const,
            target: parkedTarget,
            rect: parkedTarget,
            revealStartedAtMs: null,
            revealElapsedMs: (prior.revealElapsedMs ?? 0) + elapsed,
            revealRemainingMs: 0,
            moveStartedAtMs: !target || reducedMotion || directPark ? null : performance.now(),
            layoutPending: !target,
            layoutChangeReason: !target ? "author-parking-unavailable-awaiting-remeasure"
              : directPark ? "interrupted-response-direct-phone-parking"
                : reducedMotion ? "interrupted-response-reduced-motion" : "interrupted-by-new-committed-response",
          };
        }
        return {
          ...prior,
          actorId: candidate.actorId,
          actorName: candidate.actorName,
          cardFace: candidate.cardFace,
          ariaLabel: candidate.ariaLabel,
          semanticLabel: candidate.semanticLabel,
          target: parkedTarget,
          rect: prior.phase === "parked" ? parkedTarget : prior.phase === "reveal" ? center ?? prior.rect : prior.rect,
          layoutPending: prior.phase === "parked" && !target,
        };
      }
      const showCenterReveal = candidate.reveal && Boolean(target);
      const lifecycleKey = attackDodgeJourneyLifecycleKey(roomCode, currentAction.rootEventId, scopeKey, candidate.eventId);
      const retained = showCenterReveal ? attackDodgeJourneyLifecycles.get(lifecycleKey) : undefined;
      const retainedReveal = retained?.phase === "reveal";
      const selectedForCenter = newestFreshEventId === candidate.eventId;
      const phase: JourneyCard["phase"] = retainedReveal
        ? selectedForCenter || !latestNewResponseEventId ? "reveal" : "parked"
        : retained?.phase === "parked" || retained?.phase === "move"
          ? "parked"
          : showCenterReveal && selectedForCenter ? "reveal" : "parked";
      if (retained?.phase === "move") {
        rememberAttackDodgeJourneyLifecycle(lifecycleKey, { ...retained, phase: "parked", revealStartedAtMs: null, revealRemainingMs: 0 });
      }
      const next: JourneyCard = {
        eventId: candidate.eventId,
        actorId: candidate.actorId,
        actorName: candidate.actorName,
        cardFace: candidate.cardFace,
        ariaLabel: candidate.ariaLabel,
        semanticLabel: candidate.semanticLabel,
        role: candidate.role,
        phase,
        rect: phase === "reveal" ? center ?? pendingRevealCenter : parkedTarget,
        target: parkedTarget,
        revealStartedAtMs: retainedReveal ? retained.revealStartedAtMs : retained?.revealStartedAtMs ?? null,
        revealStartedAtIso: retained?.revealStartedAtIso ?? null,
        revealElapsedMs: retained?.revealElapsedMs ?? 0,
        revealRemainingMs: retained?.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
        moveStartedAtMs: null,
        layoutPending: centerPlacementUnavailable && phase === "reveal" || phase === "parked" && !target,
        layoutChangeReason: phase === "reveal"
          ? "public-event-committed"
          : latestNewResponseEventId && candidate.role !== "root"
            ? "superseded-by-newer-committed-response"
            : retained ? "public-event-restored" : "historical-card-restored",
      };
      return next;
    });
    const presentEventIds = new Set(nextCards.map((card) => card.eventId));
    for (const previouslyProvenCard of previous) {
      if (presentEventIds.has(previouslyProvenCard.eventId)) continue;
      const measuredTarget = actorParkedCard(previouslyProvenCard.actorId);
      const target = measuredTarget ?? previouslyProvenCard.target;
      if (latestNewResponseEventId && previouslyProvenCard.phase === "reveal") {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const elapsed = previouslyProvenCard.revealStartedAtMs == null ? 0 : Math.max(0, performance.now() - previouslyProvenCard.revealStartedAtMs);
        const directPark = directParkPublicJourneyOnPhone(currentAction, previouslyProvenCard.role, Boolean(measuredTarget));
        rememberAttackDodgeJourneyLifecycle(
          attackDodgeJourneyLifecycleKey(roomCode, currentAction.rootEventId, scopeKey, previouslyProvenCard.eventId),
          {
            phase: !measuredTarget || reducedMotion || directPark ? "parked" : "move",
            revealStartedAtMs: null,
            revealStartedAtIso: previouslyProvenCard.revealStartedAtIso ?? null,
            revealElapsedMs: (previouslyProvenCard.revealElapsedMs ?? 0) + elapsed,
            revealRemainingMs: 0,
          },
        );
        nextCards.push({
          ...previouslyProvenCard,
          phase: !measuredTarget || reducedMotion || directPark ? "parked" : "move",
          target,
          rect: target,
          revealStartedAtMs: null,
          revealElapsedMs: (previouslyProvenCard.revealElapsedMs ?? 0) + elapsed,
          revealRemainingMs: 0,
          moveStartedAtMs: !measuredTarget || reducedMotion || directPark ? null : performance.now(),
          layoutPending: !measuredTarget,
          layoutChangeReason: !measuredTarget ? "author-parking-unavailable-awaiting-remeasure"
            : directPark ? "interrupted-response-direct-phone-parking"
              : reducedMotion ? "interrupted-response-reduced-motion" : "interrupted-by-new-committed-response",
        });
      } else {
        nextCards.push({
          ...previouslyProvenCard,
          target,
          rect: previouslyProvenCard.phase === "parked" ? target : previouslyProvenCard.rect,
          layoutPending: previouslyProvenCard.phase === "parked" && !measuredTarget,
        });
      }
    }
    const roleOrder: Record<JourneyCard["role"], number> = { root: 0, response: 1, deflection: 2 };
    nextCards.sort((left, right) => roleOrder[left.role] - roleOrder[right.role]);
    const framePlacementUnavailable = centerPlacementUnavailable
      && nextCards.some((card) => card.phase === "reveal");
    const presentationCards = framePlacementUnavailable
      ? nextCards.map((card) => card.phase === "reveal"
        ? { ...card, layoutPending: true, layoutChangeReason: "fixed-public-bands-awaiting-safe-geometry" }
        : card)
      : nextCards;
    const layoutPending = framePlacementUnavailable || presentationCards.some((card) => card.layoutPending);
    const nextState: JourneyState = {
      scopeKey,
      viewerId,
      cards: presentationCards,
      center: center ?? (framePlacementUnavailable ? pendingRevealCenter : center),
      suppressTransitions: viewerChanged || previousState.suppressTransitions || previousState.layoutPending || layoutPending,
      layoutPending,
      framePlacementUnavailable,
    };
    journeyRef.current = nextState;
    setJourney(nextState);
  }, [enabled, scopeKey, eventSignature, viewerId]);

  useEffect(() => {
    if (!enabled || !documentVisible || journey.scopeKey !== scopeKey
      || journey.framePlacementUnavailable || !activeJourneyCard || activePhase !== "reveal" || activeRevealStartedAtMs !== null) return;
    let firstFrame = 0;
    let secondFrame = 0;
    const tryMarkFirstPaint = () => {
      if (!enabledRef.current || !documentVisibleRef.current || document.visibilityState !== "visible") return;
      if (!hasPaintedLargePublicCard(activeJourneyCard.eventId, REVEAL_CARD)) {
        firstFrame = window.requestAnimationFrame(tryMarkFirstPaint);
        return;
      }
      const startedAtMs = performance.now();
      const startedAtIso = new Date().toISOString();
      rememberAttackDodgeJourneyLifecycle(
        attackDodgeJourneyLifecycleKey(roomCode, action.rootEventId, scopeKey, activeJourneyCard.eventId),
        {
          phase: "reveal",
          revealStartedAtMs: startedAtMs,
          revealStartedAtIso: activeJourneyCard.revealStartedAtIso ?? startedAtIso,
          revealElapsedMs: activeJourneyCard.revealElapsedMs ?? 0,
          revealRemainingMs: activeJourneyCard.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
        },
      );
      setJourney((current) => {
        const card = current.cards.find((candidate) => candidate.eventId === activeJourneyCard.eventId);
        if (current.scopeKey !== scopeKey || !card || card.phase !== "reveal" || card.revealStartedAtMs != null) return current;
        const next = {
          ...current,
          cards: current.cards.map((candidate) => candidate.eventId === card.eventId
            ? { ...candidate, revealStartedAtMs: startedAtMs, revealStartedAtIso: candidate.revealStartedAtIso ?? startedAtIso, layoutChangeReason: "centre-card-presented" }
            : candidate),
        };
        journeyRef.current = next;
        return next;
      });
    };
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(tryMarkFirstPaint);
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [enabled, documentVisible, journey.framePlacementUnavailable, journey.scopeKey, scopeKey, activeJourneyCard?.eventId, activePhase, activeRevealStartedAtMs]);

  useEffect(() => {
    if (!enabled || !documentVisible || journey.scopeKey !== scopeKey || !activeJourneyCard || !activePhase) return;
    const eventId = activeJourneyCard.eventId;
    if (activePhase === "reveal" && activeRevealStartedAtMs === null) return;
    const startedAtMs = activePhase === "reveal" ? activeRevealStartedAtMs : null;
    const delay = activePhase === "reveal"
      ? Math.max(0, activeRevealRemainingMs - (performance.now() - (startedAtMs ?? performance.now())))
      : MOVE_DURATION_MS;
    const timer = window.setTimeout(() => {
      const current = journeyRef.current;
      const currentCard = current.cards.find((candidate) => candidate.eventId === eventId);
      if (current.scopeKey !== scopeKey || !currentCard || currentCard.phase !== activePhase) return;
      let cards = current.cards.map((candidate) => {
        if (candidate.eventId !== eventId) return candidate;
        if (activePhase === "reveal") {
          const visibleSegmentMs = Math.max(0, performance.now() - (startedAtMs ?? performance.now()));
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const directPark = directParkPublicJourneyOnPhone(actionRef.current, currentCard.role,
            !currentCard.layoutPending && currentCard.target.width > 0 && currentCard.target.height > 0);
          const shouldMove = !reducedMotion && !current.layoutPending && !directPark;
          const transitioned: JourneyCard = {
            ...candidate,
            phase: shouldMove ? "move" as const : "parked" as const,
            rect: candidate.target,
            revealStartedAtMs: null,
            revealElapsedMs: Math.max(STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS, (candidate.revealElapsedMs ?? 0) + visibleSegmentMs),
            revealRemainingMs: 0,
            moveStartedAtMs: shouldMove ? performance.now() : null,
            layoutChangeReason: shouldMove ? "four-second-reveal-complete"
              : current.layoutPending ? "reveal-complete-awaiting-seat-anchor"
                : directPark ? "four-second-reveal-complete-direct-phone-parking"
                  : "four-second-reveal-complete-reduced-motion",
          };
          rememberAttackDodgeJourneyLifecycle(attackDodgeJourneyLifecycleKey(roomCode, actionRef.current.rootEventId, scopeKey, eventId), {
            phase: transitioned.phase,
            revealStartedAtMs: null,
            revealStartedAtIso: transitioned.revealStartedAtIso ?? null,
            revealElapsedMs: transitioned.revealElapsedMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
            revealRemainingMs: 0,
          });
          return transitioned;
        }
        const parked: JourneyCard = { ...candidate, phase: "parked", rect: candidate.target, moveStartedAtMs: null, layoutChangeReason: "380ms-seat-parking-complete" };
        rememberAttackDodgeJourneyLifecycle(attackDodgeJourneyLifecycleKey(roomCode, actionRef.current.rootEventId, scopeKey, eventId), {
          phase: "parked",
          revealStartedAtMs: null,
          revealStartedAtIso: parked.revealStartedAtIso ?? null,
          revealElapsedMs: parked.revealElapsedMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
          revealRemainingMs: 0,
        });
        return parked;
      });
      if (activePhase === "move" || cards.every((card) => card.phase !== "reveal" && card.phase !== "move")) {
        if (current.center) cards = withFirstQueuedAttackDodgeReveal(cards, current.center);
      }
      const next = { ...current, cards };
      journeyRef.current = next;
      setJourney(next);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      const shouldPause = !enabledRef.current || !documentVisibleRef.current || !mountedRef.current;
      if (!shouldPause) return;
      const current = journeyRef.current;
      const currentCard = current.cards.find((candidate) => candidate.eventId === eventId);
      if (current.scopeKey !== scopeKey || !currentCard) return;
      if (activePhase === "move" && currentCard.phase === "move") {
        const parked = { ...currentCard, phase: "parked" as const, rect: currentCard.target };
        rememberAttackDodgeJourneyLifecycle(attackDodgeJourneyLifecycleKey(roomCode, actionRef.current.rootEventId, scopeKey, eventId), {
          phase: "parked",
          revealStartedAtMs: null,
          revealStartedAtIso: parked.revealStartedAtIso ?? null,
          revealElapsedMs: parked.revealElapsedMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
          revealRemainingMs: 0,
        });
        if (!mountedRef.current) return;
        const next = { ...current, cards: current.cards.map((card) => card.eventId === eventId ? parked : card) };
        journeyRef.current = next;
        setJourney(next);
        return;
      }
      if (activePhase !== "reveal" || startedAtMs === null || currentCard.phase !== "reveal"
        || currentCard.revealStartedAtMs !== startedAtMs) return;
      const visibleSegmentMs = Math.max(0, performance.now() - startedAtMs);
      const nextCard = {
        ...currentCard,
        revealStartedAtMs: null,
        revealRemainingMs: Math.max(0, (currentCard.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS) - visibleSegmentMs),
        revealElapsedMs: (currentCard.revealElapsedMs ?? 0) + visibleSegmentMs,
      };
      rememberAttackDodgeJourneyLifecycle(attackDodgeJourneyLifecycleKey(roomCode, actionRef.current.rootEventId, scopeKey, eventId), {
        phase: "reveal",
        revealStartedAtMs: null,
        revealStartedAtIso: nextCard.revealStartedAtIso ?? null,
        revealElapsedMs: nextCard.revealElapsedMs ?? 0,
        revealRemainingMs: nextCard.revealRemainingMs ?? 0,
      });
      if (!mountedRef.current) return;
      const next = { ...current, cards: current.cards.map((card) => card.eventId === eventId ? nextCard : card) };
      journeyRef.current = next;
      setJourney(next);
    };
  }, [enabled, documentVisible, journey.scopeKey, scopeKey, activeJourneyCard?.eventId, activePhase, activeRevealStartedAtMs, activeRevealRemainingMs]);

  const movingCardSignature = journey.cards
    .filter((card) => card.phase === "move")
    .map((card) => `${card.eventId}:${card.moveStartedAtMs ?? ""}`)
    .join("|");
  useEffect(() => {
    if (!journey.scopeKey || journey.scopeKey !== scopeKey || !movingCardSignature) return;
    const timers = journey.cards.filter((card) => card.phase === "move").map((card) => {
      const startedAtMs = card.moveStartedAtMs ?? performance.now();
      const delay = Math.max(0, MOVE_DURATION_MS - Math.max(0, performance.now() - startedAtMs));
      return window.setTimeout(() => {
        const current = journeyRef.current;
        const currentCard = current.cards.find((candidate) => candidate.eventId === card.eventId);
        if (current.scopeKey !== scopeKey || !currentCard || currentCard.phase !== "move") return;
        const parked: JourneyCard = { ...currentCard, phase: "parked", rect: currentCard.target, moveStartedAtMs: null, layoutChangeReason: "380ms-seat-parking-complete" };
        rememberAttackDodgeJourneyLifecycle(attackDodgeJourneyLifecycleKey(roomCode, actionRef.current.rootEventId, scopeKey, card.eventId), {
          phase: "parked",
          revealStartedAtMs: null,
          revealStartedAtIso: parked.revealStartedAtIso ?? null,
          revealElapsedMs: parked.revealElapsedMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
          revealRemainingMs: 0,
        });
        const next = { ...current, cards: current.cards.map((candidate) => candidate.eventId === card.eventId ? parked : candidate) };
        journeyRef.current = next;
        setJourney(next);
      }, delay);
    });
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      const shouldPark = !enabledRef.current || !documentVisibleRef.current || !mountedRef.current;
      if (!shouldPark) return;
      const current = journeyRef.current;
      if (current.scopeKey !== scopeKey) return;
      const moving = current.cards.filter((card) => card.phase === "move");
      if (moving.length === 0) return;
      const movedIds = new Set(moving.map((card) => card.eventId));
      for (const card of moving) {
        rememberAttackDodgeJourneyLifecycle(attackDodgeJourneyLifecycleKey(roomCode, actionRef.current.rootEventId, scopeKey, card.eventId), {
          phase: "parked",
          revealStartedAtMs: null,
          revealStartedAtIso: card.revealStartedAtIso ?? null,
          revealElapsedMs: card.revealElapsedMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
          revealRemainingMs: 0,
        });
      }
      if (!mountedRef.current) return;
      const next = {
        ...current,
        cards: current.cards.map((card) => movedIds.has(card.eventId)
          ? { ...card, phase: "parked" as const, rect: card.target, moveStartedAtMs: null }
          : card),
      };
      journeyRef.current = next;
      setJourney(next);
    };
  }, [enabled, documentVisible, journey.scopeKey, movingCardSignature, roomCode, scopeKey, viewerId]);

  useEffect(() => {
    if (!enabled || journey.layoutPending || journey.scopeKey !== scopeKey) return;
    for (const card of journey.cards) {
      if (card.phase !== "parked" || parkedNotifiedEventIdsRef.current.has(card.eventId)) continue;
      parkedNotifiedEventIdsRef.current.add(card.eventId);
      onJourneyEventParked?.(card.eventId);
    }
  }, [enabled, journey.layoutPending, journey.scopeKey, journey.cards, scopeKey, onJourneyEventParked]);

  useEffect(() => {
    if (!enabled || journey.scopeKey !== scopeKey) return;
    const record = () => {
      const elements = [...document.querySelectorAll<HTMLElement>("[data-public-card-journey-event-id]")];
      for (const card of journey.cards) {
        if (card.phase === "queued") continue;
        const element = elements.find((candidate) => candidate.dataset.publicCardJourneyEventId === card.eventId);
        const bounds = element?.getBoundingClientRect();
        const actualRect = bounds ? {
          left: Math.round(bounds.left * 10) / 10,
          top: Math.round(bounds.top * 10) / 10,
          width: Math.round(bounds.width * 10) / 10,
          height: Math.round(bounds.height * 10) / 10,
        } : card.rect;
        const targetRect = { ...card.target, left: Math.round(card.target.left * 10) / 10, top: Math.round(card.target.top * 10) / 10 };
        const revealElapsedMs = card.phase === "reveal" && card.revealStartedAtMs !== null && card.revealStartedAtMs !== undefined
          ? (card.revealElapsedMs ?? 0) + Math.max(0, performance.now() - card.revealStartedAtMs)
          : card.revealElapsedMs ?? 0;
        const roundedElapsedMs = Math.round(revealElapsedMs);
        const signature = JSON.stringify([card.phase, actualRect, targetRect, viewerId, card.revealStartedAtIso, roundedElapsedMs]);
        if (traceSignaturesRef.current.get(card.eventId) === signature) continue;
        traceSignaturesRef.current.set(card.eventId, signature);
        recordAttackDodgeUxTrace("public-card-journey", {
          rendererKind: "attack-dodge-journey",
          motionType: action.motion?.type ?? null,
          interactionId: action.interactionId ?? null,
          rootEventId: action.rootEventId,
          rootFrameId: action.rootFrameId ?? null,
          checkpointId: action.checkpointId ?? null,
          presentationRevision: action.presentationRevision ?? null,
          revealDurationMs: STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
          moveDurationMs: MOVE_DURATION_MS,
          eventId: card.eventId,
          publicActorId: card.actorId,
          publicViewerId: viewerId,
          publicCardId: card.cardFace.id,
          interactionTargetId: action.targetId,
          cardKind: card.cardFace.kind,
          visualPhase: card.phase.toUpperCase(),
          actualCardRect: actualRect,
          targetParkingRect: targetRect,
          revealStartedAt: card.revealStartedAtIso ?? null,
          revealElapsedMs: roundedElapsedMs,
          layoutChangeReason: card.phase === "reveal"
            ? card.layoutChangeReason ?? "full-size-centre-reveal"
            : card.layoutChangeReason ?? (card.phase === "move" ? "four-second-reveal-complete" : "seat-parking-complete"),
        });
      }
    };
    record();
    if (!journey.cards.some((card) => card.phase === "reveal" || card.phase === "move")) return;
    const interval = window.setInterval(record, 500);
    return () => window.clearInterval(interval);
  }, [action.targetId, enabled, journey.scopeKey, journey.cards, scopeKey, viewerId]);

  useLayoutEffect(() => {
    if (!enabled || !hasAttackDodgeMotion || journey.scopeKey !== scopeKey) return;
    let observer: ResizeObserver | null = null;
    let reflowFrame = 0;
    let previousLayoutSignature = "";
    let stableLayoutFrames = 0;
    let sampledLayoutFrames = 0;
    let committedGeometrySignature = "";
    const observedAnchors = new WeakSet<Element>();
    const observePlayerAnchors = () => {
      const announcements = isKirinBowPublicEffectFrame(actionRef.current.publicCardEffectFrame)
        ? [...document.querySelectorAll<HTMLElement>("[data-public-card-announcement='true']")]
        : [];
      [...document.querySelectorAll<HTMLElement>("[data-player-anchor]"), ...announcements].forEach((anchor) => {
        if (observedAnchors.has(anchor)) return;
        observedAnchors.add(anchor);
        observer?.observe(anchor);
      });
    };
    const reposition = () => {
      const currentAction = actionRef.current;
      const current = journeyRef.current;
      const center = currentAction.publicCardEffectFrame?.eventId === currentAction.rootEventId
        ? battlefieldPublicEffectFrameCard(currentAction.publicCardEffectFrame)
        : battlefieldCenterCard(REVEAL_CARD);
      const framePlacementUnavailable = center === null && current.cards.some((card) => card.phase === "reveal");
      const pendingCenter = center ?? current.center;
      if (!pendingCenter) return;
      const next = {
        ...current,
        center: center ?? (framePlacementUnavailable ? pendingCenter : center),
        framePlacementUnavailable,
        suppressTransitions: true,
        cards: current.cards.map((card) => {
          const target = actorParkedCard(card.actorId);
          if (target) return {
            ...card,
            phase: card.phase === "move" ? "parked" as const : card.phase,
            target,
            rect: card.phase === "reveal" ? center ?? card.rect : target,
            moveStartedAtMs: null,
            layoutPending: framePlacementUnavailable && card.eventId === currentAction.publicCardEffectFrame?.eventId
              || false,
            layoutChangeReason: framePlacementUnavailable && card.eventId === currentAction.publicCardEffectFrame?.eventId
              ? "public-effect-frame-awaiting-h4-safe-geometry" : "viewport-or-seat-anchor-reflow",
          };
          return {
            ...card,
            phase: card.phase === "move" ? "parked" as const : card.phase,
            layoutPending: framePlacementUnavailable && card.eventId === currentAction.publicCardEffectFrame?.eventId
              || card.phase === "parked" || card.phase === "move",
            layoutChangeReason: "viewport-or-seat-anchor-reflow",
          };
        }),
      };
      next.layoutPending = framePlacementUnavailable || next.cards.some((card) => card.layoutPending);
      if (journeyGeometryMatches(current, next) && !current.layoutPending && !next.layoutPending) return;
      journeyRef.current = next;
      setJourney(next);
    };
    const readGeometrySignature = () => {
      const table = document.querySelector<HTMLElement>(".play-table");
      const coordinates = table ? publicStageCoordinateSpaceForTable(table) : null;
      const anchors = [
        ...document.querySelectorAll<HTMLElement>("[data-player-anchor]"),
        ...(isKirinBowPublicEffectFrame(actionRef.current.publicCardEffectFrame)
          ? [...document.querySelectorAll<HTMLElement>("[data-public-card-announcement='true']")]
          : []),
      ];
      return [table?.clientWidth ?? 0, table?.clientHeight ?? 0,
        ...anchors.flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const local = coordinates ? publicStageRectToTableLocal(rect, coordinates) : null;
          const geometry = local ?? rect;
          return [element.dataset.playerAnchor ?? "", element.className,
            geometry.left, geometry.top, geometry.right, geometry.bottom];
        })].map((value) => typeof value === "number" ? Math.round(value * 2) / 2 : value).join(":");
    };
    committedGeometrySignature = readGeometrySignature();
    const scheduleReposition = (force = false) => {
      const requestedSignature = readGeometrySignature();
      if (!force && requestedSignature === committedGeometrySignature) return;
      committedGeometrySignature = requestedSignature;
      window.cancelAnimationFrame(reflowFrame);
      const current = journeyRef.current;
      if (current.scopeKey === scopeKey && !current.layoutPending) {
        const pending: JourneyState = {
          ...current,
          suppressTransitions: true,
          layoutPending: true,
          cards: current.cards.map((card) => card.phase === "move"
            ? { ...card, phase: "parked", rect: card.target, moveStartedAtMs: null, layoutPending: true, layoutChangeReason: "layout-epoch-pending" }
            : card.phase === "parked" ? { ...card, layoutPending: true, layoutChangeReason: "layout-epoch-pending" }
            : card),
        };
        journeyRef.current = pending;
        setJourney(pending);
      }
      previousLayoutSignature = "";
      stableLayoutFrames = 0;
      sampledLayoutFrames = 0;
      const repositionAfterLayoutSettles = () => {
        const signature = readGeometrySignature();
        stableLayoutFrames = signature === previousLayoutSignature ? stableLayoutFrames + 1 : 0;
        previousLayoutSignature = signature;
        sampledLayoutFrames += 1;
        if (stableLayoutFrames < 2 && sampledLayoutFrames < 120) {
          reflowFrame = window.requestAnimationFrame(repositionAfterLayoutSettles);
          return;
        }
        reflowFrame = 0;
        committedGeometrySignature = signature;
        reposition();
      };
      reflowFrame = window.requestAnimationFrame(repositionAfterLayoutSettles);
    };
    observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => scheduleReposition());
    const shell = document.querySelector<HTMLElement>(".game-shell");
    if (shell) observer?.observe(shell);
    observePlayerAnchors();
    const mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver((records) => {
      const watchesKirinAnnouncement = isKirinBowPublicEffectFrame(actionRef.current.publicCardEffectFrame);
      const containsRelevantAnchor = (node: Node) => node instanceof Element
        && (node.matches(watchesKirinAnnouncement
          ? "[data-player-anchor], [data-public-card-announcement='true']" : "[data-player-anchor]")
          || Boolean(node.querySelector(watchesKirinAnnouncement
            ? "[data-player-anchor], [data-public-card-announcement='true']" : "[data-player-anchor]")));
      const kirinAnnouncementChanged = watchesKirinAnnouncement
        && records.some((record) => record.type === "attributes"
          ? record.target instanceof Element && record.target.matches("[data-public-card-announcement='true']")
          : [...record.addedNodes, ...record.removedNodes].some(containsRelevantAnchor));
      const anchorsChanged = records.some((record) => record.type === "attributes"
        ? record.target instanceof Element && record.target.matches("[data-player-anchor]")
        : [...record.addedNodes, ...record.removedNodes].some(containsRelevantAnchor));
      if (anchorsChanged || kirinAnnouncementChanged) {
        observePlayerAnchors();
        scheduleReposition();
      }
    });
    if (shell) mutationObserver?.observe(shell, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-player-anchor", "style", "data-public-card-announcement-positioned",
        "data-public-card-announcement-fixed-upper", "data-public-card-announcement-lines"],
    });
    scheduleReposition(true);
    return () => {
      observer?.disconnect();
      mutationObserver?.disconnect();
      window.cancelAnimationFrame(reflowFrame);
    };
  }, [action.publicCardEffectFrame?.effectId, enabled, hasAttackDodgeMotion, journey.scopeKey, scopeKey]);

  useEffect(() => {
    if (!journey.suppressTransitions || journey.layoutPending || journey.scopeKey !== scopeKey) return;
    const frame = window.requestAnimationFrame(() => setJourney((current) => {
      if (current.scopeKey !== scopeKey || current.layoutPending || !current.suppressTransitions) return current;
      const next = { ...current, suppressTransitions: false };
      journeyRef.current = next;
      return next;
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [journey.layoutPending, journey.scopeKey, journey.suppressTransitions, scopeKey]);

  if (!enabled || !sourceName || journey.scopeKey !== scopeKey || !journey.center && !journey.framePlacementUnavailable) return null;
  const cards = journey.cards;
  const viewerLayoutPending = journey.scopeKey === scopeKey && journey.viewerId !== viewerId;
  return <section
    className={`public-card-display public-card-display-journey${action.settlement?.exiting || action.publicCounterRead?.exiting ? " is-exiting" : ""}${journey.suppressTransitions ? " is-reflowing" : ""}${journey.layoutPending ? " is-layout-pending" : ""}${viewerLayoutPending ? " is-viewer-layout-pending" : ""}`}
    data-public-card-display="true"
    data-public-card-renderer-kind="attack-dodge-journey"
    data-public-card-ready="true"
    data-public-card-visual-phase={activePhase?.toUpperCase() ?? undefined}
    data-public-card-motion="attack-dodge"
    data-public-card-viewer-id={viewerId}
    data-public-card-layout-viewer-id={journey.viewerId || undefined}
    data-public-card-layout-pending={journey.layoutPending || viewerLayoutPending ? "true" : "false"}
    data-public-card-effect-frame-placement={journey.framePlacementUnavailable ? "no-fit-awaiting-safe-geometry" : undefined}
    data-public-card-interaction-id={action.interactionId ?? undefined}
    data-public-card-root-frame-id={action.rootFrameId ?? undefined}
    data-public-card-checkpoint-id={action.checkpointId ?? undefined}
    data-public-card-presentation-revision={action.presentationRevision ?? undefined}
    data-public-card-event-id={activeEventId}
    data-public-card-root-event-id={action.rootEventId}
    data-public-card-id={activeCard?.id}
    data-public-card-actor-id={activeActorId}
    data-public-card-active-event-kind={activeJourneyCard?.role ?? (latestResponse ? "response" : latestDeflection ? "deflection" : "root")}
    data-public-card-source-id={action.sourceId}
    data-public-card-target-id={action.targetId ?? undefined}
    data-public-card-settlement-event-id={action.settlement?.eventId}
    data-public-card-settlement-outcome={action.settlement?.outcome}
    data-public-card-deflection-event-id={latestDeflection?.eventId}
  >
    {cards.filter((card) => card.phase !== "queued").map((card) => {
      const isCurrent = card.eventId === activeEventId;
      const isHistorical = Boolean(latestResponse && card.role === "root" && card.phase === "parked");
      return <PublicJourneyCard
        key={card.eventId}
        card={card}
        sharedStageIdentity={{ roomId: roomCode, scopeId: action.rootEventId, interactionId: action.interactionId, viewerId }}
        visualPlacementUnavailable={Boolean(journey.framePlacementUnavailable
          && card.phase === "reveal"
          && (!action.publicCardEffectFrame || card.eventId === action.publicCardEffectFrame.eventId))}
        onInspectCard={onInspectCard}
        size={card.rect.width < REVEAL_CARD.width ? "thumbnail" : "reveal"}
        className={`${isCurrent ? "is-current" : ""} ${isHistorical ? "is-prior" : ""} ${card.role === "deflection" ? "is-deflection" : ""}`}
        primary={isCurrent}
        publicCardEffectFrame={card.eventId === action.publicCardEffectFrame?.eventId
          ? action.publicCardEffectFrame : undefined}
      />;
    })}
    <PublicCardAnnouncement
      eventId={negationNarration?.eventId ?? action.publicInteractionNarration?.eventId ?? activeEventId}
      h4Owner="PublicCardDisplay"
      h4PublicSequence={negationNarration?.publicSequence ?? action.publicInteractionNarration?.publicSequence}
      publicSequenceForEvent={publicSequenceForEvent}
      eventCopyKey={publicCardAnnouncementCopyKey(action, negationNarration?.eventId ?? action.publicInteractionNarration?.eventId ?? activeEventId, negationNarration?.actorId ?? action.publicInteractionNarration?.actorId ?? activeActorId, roomCode)}
      announcementIdentity={action.publicAnnouncementIdentity}
      geometryKey={publicAnnouncementGeometryKey(roomCode, viewerId)}
      copyLifecycleStage={publicCardAnnouncementLifecycleStage(action)}
      placementKey={publicCardAnnouncementPlacementKey(action, roomCode)}
      viewerLayoutKey={viewerId}
      anchorEventId={publicEffectFrameOwnsAnnouncementAnchor ? null : activeEventId}
      phase={publicEffectFrameOwnsAnnouncementAnchor ? "static" : activeJourneyCard?.phase ?? "static"}
      message={announcement}
      segments={committedFactCopy.segments}
      compactMessage={compactAnnouncement}
      accessibleLabel={committedFactCopy.accessibleLabel}
      presentationNarration={negationNarration ? undefined : publicNarration}
      negationNarration={negationNarration}
      fallbackCardRect={journey.framePlacementUnavailable ? null : publicEffectFrameOwnsAnnouncementAnchor && journey.center && action.publicCardEffectFrame
        ? battlefieldPublicEffectFrame(journey.center, action.publicCardEffectFrame) : journey.center}
      ignoreJourneyLayoutPending
      keepCenterAnchorClear={publicEffectFrameOwnsAnnouncementAnchor && !journey.framePlacementUnavailable}
      stableCenterAnchor={publicEffectFrameOwnsAnnouncementAnchor && !journey.framePlacementUnavailable}
      preferredVerticalMode={publicEffectFrameOwnsAnnouncementAnchor ? "above" : undefined}
      phaseNotice={announcementPhaseNotice}
      outcome={action.settlement?.outcome}
      negationWaiting={Boolean(negationNarration || announcementPhaseNotice?.includes("NEGATION"))}
    />
  </section>;
}

function withFirstQueuedSingleTargetReveal(cards: SingleTargetJourneyCard[], center: CardRect | null) {
  if (!center || cards.some((card) => card.phase === "reveal" || card.phase === "move")) return cards;
  const firstQueuedIndex = cards.findIndex((card) => card.phase === "queued");
  if (firstQueuedIndex < 0) return cards;
  return cards.map((card, index) => index === firstQueuedIndex
    ? { ...card, phase: "reveal" as const, rect: center }
    : card);
}

function singleTargetJourneyEvents(action: PublicCardDisplayAction, sourceName: string | null): JourneyCard[] {
  const events: JourneyCard[] = [];
  const frame = action.publicCardEffectFrame?.eventId === action.rootEventId
    ? action.publicCardEffectFrame : null;
  const frameMaterials = frame?.materials ?? [];
  const frameOwnerId = frameMaterials[0]?.ownerId ?? null;
  const frameOwnerIsConsistent = frameMaterials.length > 0
    && frameMaterials.every((material) => material.ownerId === frameOwnerId)
    && frameOwnerId !== null;
  const frameCards = frameOwnerIsConsistent ? frameMaterials.map((material) => material.card) : [];
  const frameActorId = frameOwnerIsConsistent ? frameOwnerId : action.sourceId;
  const frameActorName = frameOwnerIsConsistent
    ? frameMaterials[0]?.ownerName ?? (frameActorId === action.sourceId ? sourceName : "")
    : sourceName;
  const rootCards = frameCards.length ? frameCards : action.cardFace ? [action.cardFace] : [];
  const parkedPublicEffectMaterial = frame?.effectId === "kirin_bow_damage_about_to_apply"
    ? frame.materials.find((material) => material.card.id === rootCards[0]?.id && material.ownerId === frameActorId)
    : undefined;
  if (rootCards.length && frameActorName) events.push({
    eventId: action.rootEventId,
    actorId: frameActorId,
    actorName: frameActorName,
    cardFace: rootCards[0],
    cardFaces: rootCards,
    ...(parkedPublicEffectMaterial ? { parkedPublicEffect: {
      placement: "above-pac" as const,
      ownerId: frameActorId,
      cardId: parkedPublicEffectMaterial.card.id,
      title: frame!.title,
    } } : {}),
    ariaLabel: action.ariaLabel,
    role: "root",
    globalOrdinal: 1,
    phase: "parked",
    rect: { left: 0, top: 0, ...parkedCardSize() },
    target: { left: 0, top: 0, ...parkedCardSize() },
  });
  const responseByEventId = new Map<string, PublicCardDisplayResponseNode>();
  for (const response of action.responseHistory ?? []) responseByEventId.set(response.eventId, response);
  for (const response of action.responses ?? []) {
    const prior = responseByEventId.get(response.eventId);
    responseByEventId.set(response.eventId, prior
      ? { ...response, ordinal: prior.ordinal ?? response.ordinal }
      : response);
  }
  for (const response of responseByEventId.values()) {
    const cardFaces = response.cardFaces ?? (response.cardFace ? [response.cardFace] : []);
    if (!cardFaces.length || !Number.isInteger(response.ordinal) || !response.ordinal || response.ordinal < 1) continue;
    events.push({
      eventId: response.eventId,
      actorId: response.actorId,
      actorName: response.actorName,
      cardFace: cardFaces[0],
      cardFaces,
      ariaLabel: response.ariaLabel,
      semanticLabel: response.semanticLabel,
      role: "response",
      globalOrdinal: response.ordinal + 1,
      phase: "parked",
      rect: { left: 0, top: 0, ...parkedCardSize() },
      target: { left: 0, top: 0, ...parkedCardSize() },
    });
  }
  return events.sort((left, right) => (left.globalOrdinal ?? 0) - (right.globalOrdinal ?? 0));
}

type SingleTargetJourneyMotion = Extract<PublicCardDisplayMotion, { type: "negation" | "single-target" | "group-root" | "lust-cost" | "zone-transition" }>;

function singleTargetJourneyMotion(motion: PublicCardDisplayMotion | undefined): SingleTargetJourneyMotion | null {
  return motion?.type === "negation" || motion?.type === "single-target"
    || motion?.type === "group-root" || motion?.type === "lust-cost" || motion?.type === "zone-transition"
    ? motion
    : null;
}

function verifiedGuicaiVisibleHold(action: PublicCardDisplayAction, eventId: string, cardId: string): boolean {
  const frame = action.publicCardEffectFrame;
  return action.revealCompletionPolicy === "visible-hold" && action.rootEventId === eventId
    && action.cardFace?.id === cardId && frame?.effectId === "sima_yi_guicai"
    && frame.effectClass === "JUDGEMENT" && frame.eventId === eventId
    && frame.materials.length === 1 && frame.materials[0]?.card.id === cardId;
}

function requiresPublicH4VisibleHold(action: PublicCardDisplayAction, eventId: string, cardId: string): boolean {
  const claim = action.zoneTransition;
  return verifiedGuicaiVisibleHold(action, eventId, cardId)
    || action.revealCompletionPolicy === "visible-hold" && action.rootEventId === eventId
      && action.cardFace?.id === cardId && claim?.eventId === eventId
      && claim.physicalCardId === cardId && claim.h4EventId === eventId;
}

function hasExactZoneTransitionClaim(action: PublicCardDisplayAction, eventId: string, cardId: string): boolean {
  const claim = action.zoneTransition;
  return action.motion?.type === "zone-transition" && action.rootEventId === eventId
    && action.cardFace?.id === cardId && Boolean(claim?.claimId && claim.eventId === eventId
      && claim.physicalCardId === cardId && claim.h4EventId === eventId && claim.ownerId && claim.slot);
}

function zoneTransitionPaintIdentity(action: PublicCardDisplayAction, viewerId: string, eventId: string) {
  const claim = action.zoneTransition;
  if (!claim || claim.eventId !== eventId || claim.h4EventId !== eventId || claim.physicalCardId !== action.cardFace?.id) return undefined;
  return {
    viewerId,
    requireVisibleH4: { eventId: claim.h4EventId, owner: "PublicCardDisplay" },
  };
}

function singleTargetParkingOptions(
  action: PublicCardDisplayAction,
  event: JourneyCard,
  harvestPoolVisible: boolean,
  extendNegationChainCollisionSlots = action.showNegationChainOrdinals === true,
  viewerId?: string,
): SeatHistoryCardParkingOptions {
  const harvest = action.cardFace?.kind === "BumperHarvest";
  const compactHarvestMini = harvest
    && typeof window !== "undefined" && window.matchMedia("(max-width: 520px)").matches;
  return {
    extendNegationChainCollisionSlots,
    // This measures the destination of an already-proven physical history
    // card, not the enlarged live reveal. The public status paints above it.
    allowStatusOverParked: Boolean(event.eventId && event.cardFace.id),
    ...(action.publicCardEffectFrame?.effectId === "hua_tuo_prodigal_healer" ? { avoidAuthorSeat: true } : {}),
    // All parked Harvest history (root and committed responses) uses the
    // same footprint. The 90×135 reveal remains a separate live phase.
    cardSize: compactHarvestMini ? HARVEST_MOBILE_RESPONSE_CARD : parkedCardSize(),
    ...(event.parkedPublicEffect?.placement === "above-pac"
      && event.parkedPublicEffect.cardId === event.cardFace.id
      && event.parkedPublicEffect.ownerId === event.actorId
      && event.actorId === viewerId
      ? { placeKirinMaterialAbovePacReserve: true, anchorLocalHero: true, preferLocalAuthorDock: true,
        protectInteractionControls: true, preserveAuthorControls: true, parkedEffectLabel: event.parkedPublicEffect.title }
      : {}),
    ...(harvest ? {
      anchorLocalHero: true,
      avoidAuthorSeat: event.role !== "response",
      protectInteractionControls: true,
      allowHarvestPoolOverlap: harvestPoolVisible,
      allowAuthorPortraitEdgeOverlap: event.role === "response",
      preserveAuthorControls: event.role === "response",
      keepHarvestResponseNearAuthor: event.role === "response",
    } : {}),
  };
}

function preserveGroupRootJourneyEvents(
  incoming: readonly JourneyCard[],
  previous: readonly SingleTargetJourneyCard[],
): JourneyCard[] {
  const incomingIds = new Set(incoming.map((event) => event.eventId));
  const root = incoming.filter((event) => event.role === "root");
  const newResponses = incoming.filter((event) => event.role !== "root");
  const retained = previous.filter((event) => !incomingIds.has(event.eventId));
  return [...root, ...retained, ...newResponses].sort((left, right) =>
    (left.globalOrdinal ?? 0) - (right.globalOrdinal ?? 0));
}

function SingleTargetCardJourney({
  action,
  enabled,
  suppressAnnouncement = false,
  retainHarvestHistory = false,
  protectFirstParkedMiniature = false,
  responseHistoryOwnership = [],
  harvestChoiceActive,
  harvestPoolReadOnly,
  sourceName,
  targetName,
  compactPlayerNamesById,
  roomCode,
  viewerId,
  publicSequenceForEvent,
  onInspectCard,
  onJourneySettled,
  onJourneyEventParked,
  onJourneyRevealCompleted,
  onJourneyOwnershipChange,
}: {
  action: PublicCardDisplayAction;
  enabled: boolean;
  suppressAnnouncement?: boolean;
  retainHarvestHistory?: boolean;
  protectFirstParkedMiniature?: boolean;
  responseHistoryOwnership?: readonly { eventId: string; cardIds: readonly string[] }[];
  harvestChoiceActive: boolean;
  harvestPoolReadOnly: boolean;
  sourceName: string | null;
  targetName: string | null;
  compactPlayerNamesById: CompactPublicPlayerNames;
  roomCode: string;
  viewerId: string;
  publicSequenceForEvent?: (eventId: string) => number | undefined;
  onInspectCard?: (card: Card, trigger: HTMLButtonElement) => void;
  onJourneySettled?: (settlementEventId: string) => void;
  onJourneyEventParked?: (eventId: string, equipmentClaim?: NonNullable<PublicCardDisplayAction["zoneTransition"]>) => void;
  onJourneyRevealCompleted?: (eventId: string, physicalCardId: string) => void;
  onJourneyOwnershipChange?: (
    roomCode: string,
    actionKey: string,
    ownerViewerId: string,
    scopeGeneration: string,
    ready: boolean,
    cards: readonly { eventId: string; cardIds: readonly string[] }[],
  ) => void;
}) {
  const motion = singleTargetJourneyMotion(action.motion);
  const isBumperHarvest = action.cardFace?.kind === "BumperHarvest";
  const showNegationChainOrdinals = Boolean(action.showNegationChainOrdinals
    && action.interactionId
    && (motion?.type === "negation" || motion?.type === "single-target"));
  const harvestPoolVisible = isBumperHarvest && (harvestPoolReadOnly || harvestChoiceActive);
  const harvestRootPoolVisible = harvestPoolReadOnly && isBumperHarvest;
  const harvestPoolAboveRoot = harvestPoolVisible;
  const historyOnly = Boolean(retainHarvestHistory && isBumperHarvest && !enabled);
  const responseHistoryEventIds = new Set((action.responseHistory ?? []).map((response) => response.eventId));
  const activeResponseEventIds = new Set((action.responses ?? []).map((response) => response.eventId));
  const responseHistoryOwnershipByEventId = new Map(responseHistoryOwnership.map((response) => [response.eventId, new Set(response.cardIds)]));
  const scopeKey = motion?.scopeKey ?? action.rootEventId;
  const ownershipIdentity = publicCardJourneyOwnershipIdentity(action, roomCode);
  // The shared measured layout is the final placement authority for a proven
  // complete Effect Frame. A later successful shared measurement must be able
  // to recover an earlier local no-fit result without weakening its identity.
  const sharedPublicStage = usePublicStageLayout();
  const [journey, setJourney] = useState<SingleTargetJourneyState>({ scopeKey: "", viewerId: "", harvestPoolReadOnly: false, showNegationChainOrdinals: false, cards: [], center: null, suppressTransitions: false, layoutPending: false });
  const retainSingleTargetJourney = motion?.type === "single-target"
    && (action.cardKind === "Steal" || action.cardKind === "Dismantle")
    && journey.scopeKey === scopeKey
    && journey.cards.some((card) => card.role === "root" && card.eventId === action.rootEventId
      && card.cardFace.id === action.cardFace?.id && card.actorId === action.sourceId);
  const journeyEnabled = (enabled || historyOnly || retainSingleTargetJourney)
    && (motion?.type !== "zone-transition" || hasExactZoneTransitionClaim(action, action.rootEventId, action.cardFace?.id ?? ""));
  const journeyRef = useRef(journey);
  const actionRef = useRef(action);
  const sourceNameRef = useRef(sourceName);
  const viewerIdRef = useRef(viewerId);
  const mountedRef = useRef(false);
  const enabledRef = useRef(journeyEnabled);
  const documentVisibleRef = useRef(true);
  const [documentVisible, setDocumentVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  const notifiedSettlementEventIdRef = useRef<string | null>(null);
  const parkedNotifiedEventIdsRef = useRef(new Set<string>());
  const completedRevealNotifiedKeysRef = useRef(new Set<string>());
  const traceSignaturesRef = useRef(new Map<string, string>());
  const parkingFailureSignaturesRef = useRef(new Map<string, string>());
  const notifyRevealCompletedOnce = useCallback((eventId: string, physicalCardId: string) => {
    const completionKey = `${roomCode}\u001f${viewerId}\u001f${eventId}\u001f${physicalCardId}`;
    if (completedRevealNotifiedKeysRef.current.has(completionKey)) return;
    completedRevealNotifiedKeysRef.current.add(completionKey);
    if (completedRevealNotifiedKeysRef.current.size > 500) {
      const oldest = completedRevealNotifiedKeysRef.current.values().next().value;
      if (oldest) completedRevealNotifiedKeysRef.current.delete(oldest);
    }
    if (actionRef.current.motion?.type !== "zone-transition") onJourneyRevealCompleted?.(eventId, physicalCardId);
  }, [onJourneyRevealCompleted, roomCode, viewerId]);
  const placementFailureReporter = useCallback((event: JourneyCard): SeatHistoryCardParkingOptions => {
    const currentAction = actionRef.current;
    const harvestFailure = isBumperHarvest && (event.role === "root" || event.role === "response");
    const singleTargetRootFailure = event.role === "root"
      && (currentAction.cardKind === "Steal" || currentAction.cardKind === "Dismantle");
    const committedEffectFrameFailure = Boolean(event.parkedPublicEffect
      && event.parkedPublicEffect.cardId === event.cardFace.id
      && event.parkedPublicEffect.ownerId === event.actorId);
    return {
      onPlacementFailure: harvestFailure || singleTargetRootFailure || committedEffectFrameFailure
        ? (detail: Record<string, unknown>) => {
          const currentViewerId = viewerIdRef.current;
          const latestAction = actionRef.current;
          const key = `${currentViewerId}:${event.eventId}`;
          const signature = JSON.stringify(detail);
          if (parkingFailureSignaturesRef.current.get(key) === signature) return;
          parkingFailureSignaturesRef.current.set(key, signature);
          recordAttackDodgeUxTrace(harvestFailure ? "harvest-history-parking-failure"
            : singleTargetRootFailure ? "single-target-root-parking-failure" : "public-effect-frame-parking-failure", {
            interactionId: latestAction.interactionId ?? null,
            rootEventId: latestAction.rootEventId,
            eventId: event.eventId,
            publicActorId: event.actorId,
            publicViewerId: currentViewerId,
            publicCardId: event.cardFace.id,
            ...detail,
          });
        }
        : undefined,
    };
  }, [isBumperHarvest]);
  const incoming = singleTargetJourneyEvents(action, sourceName);
  const journeyEvents = motion?.type === "group-root" && journey.scopeKey === scopeKey
    ? preserveGroupRootJourneyEvents(incoming, journey.cards)
    : incoming;
  const eventSignature = journeyEvents.map((event) => `${event.eventId}:${event.actorId}:${event.cardFace.id}`).join(",");
  const publicEffectFrameSignature = action.publicCardEffectFrame
    ? JSON.stringify([
      action.publicCardEffectFrame.effectId,
      action.publicCardEffectFrame.eventId,
      action.publicCardEffectFrame.title,
      action.publicCardEffectFrame.materials.map(({ card, ownerId }) => [card.id, ownerId]),
    ])
    : "";
  const freshSignature = motion?.freshEventIds.join(",") ?? "";

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useLayoutEffect(() => {
    actionRef.current = action;
    sourceNameRef.current = sourceName;
    viewerIdRef.current = viewerId;
  }, [action, sourceName, viewerId]);
  useLayoutEffect(() => {
    journeyRef.current = journey;
  }, [journey]);
  useLayoutEffect(() => {
    enabledRef.current = journeyEnabled;
    documentVisibleRef.current = documentVisible;
  }, [documentVisible, journeyEnabled]);
  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    updateVisibility();
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useLayoutEffect(() => {
    const currentAction = actionRef.current;
    const currentMotion = singleTargetJourneyMotion(currentAction.motion);
    const currentSourceName = sourceNameRef.current;
    if (!journeyEnabled || !currentMotion || !currentSourceName) return;
    const previous = journeyRef.current;
    const stationaryCenter = battlefieldCenterCard(REVEAL_CARD);
    const sharedFrameCenter = currentAction.publicCardEffectFrame
      ? effectFramePrimaryRectFromSharedLayout(sharedPublicStage, {
        roomId: roomCode,
        rootEventId: currentAction.rootEventId,
        interactionId: currentAction.interactionId,
        eventId: currentAction.publicCardEffectFrame.eventId,
        cardId: currentAction.publicCardEffectFrame.materials[0]?.card.id ?? "",
        viewerId: viewerIdRef.current,
      })
      : null;
    const sharedFrameRejected = Boolean(currentAction.publicCardEffectFrame
      && publicStageRejectedEffectFrame(currentAction.publicCardEffectFrame, {
        roomId: roomCode,
        rootEventId: currentAction.rootEventId,
        interactionId: currentAction.interactionId,
        viewerId: viewerIdRef.current,
      }));
    const center = sharedFrameCenter ?? (currentAction.publicCardEffectFrame
      ? sharedFrameRejected ? null : battlefieldPublicEffectFrameCard(currentAction.publicCardEffectFrame)
      : currentMotion.type === "lust-cost" && currentAction.lustCostFrame
        ? battlefieldLustCostCard()
        : currentMotion.type === "zone-transition"
          ? battlefieldCenterCard(REVEAL_CARD, { stationarySurface: "card" })
          : stationaryCenter);
    const sameInteraction = previous.scopeKey === scopeKey;
    const pendingCenter = center ?? (sameInteraction ? previous.center : null);
    if (!pendingCenter) return;
    const frameCenterUnavailable = center === null && journeyEvents.length > 0;
    const viewerChanged = sameInteraction && previous.viewerId !== viewerId;
    const hasNegationChainParking = currentAction.showNegationChainOrdinals === true
      || journeyEvents.some((event) => event.role === "response" && (event.globalOrdinal ?? 0) > 1);
    const ordinalLayoutChanged = sameInteraction && previous.showNegationChainOrdinals !== hasNegationChainParking;
    const harvestLayoutChanged = sameInteraction && previous.harvestPoolReadOnly !== harvestPoolReadOnly;
    const priorById = new Map(previous.cards.map((card) => [card.eventId, card]));
    const fresh = new Set(currentMotion.freshEventIds);
    const latestFreshEventId = [...journeyEvents].reverse()
      .find((event) => fresh.has(event.eventId))?.eventId ?? null;
    const latestFreshResponseEventId = [...journeyEvents].reverse()
      .find((event) => event.role === "response" && fresh.has(event.eventId) && !priorById.has(event.eventId))?.eventId ?? null;
    const occupied: CardRect[] = [];
    const measuredRectsByActor = new Map<string, CardRect[]>();
    const actorIndexes = new Map<string, number>();
    const measuredTargetEventIds = new Set<string>();
    const cards = journeyEvents.map((event) => {
      const old = priorById.get(event.eventId);
      const parkedPublicEffect = event.parkedPublicEffect
        ?? (old?.parkedPublicEffect?.cardId === event.cardFace.id ? old.parkedPublicEffect : undefined);
      const parkingEvent = parkedPublicEffect
        ? { ...event, actorId: parkedPublicEffect.ownerId, parkedPublicEffect }
        : event;
      const actorIndex = actorIndexes.get(parkingEvent.actorId) ?? 0;
      actorIndexes.set(parkingEvent.actorId, actorIndex + 1);
      const localAuthor = parkingEvent.actorId === viewerId
        && (currentAction.cardKind === "Steal" || currentAction.cardKind === "Dismantle");
      const parkingOptions = {
        ...singleTargetParkingOptions(action, parkingEvent, harvestPoolAboveRoot, hasNegationChainParking, viewerId),
        ...(parkingEvent.actorId === viewerId ? { preferLocalAuthorDock: true } : {}),
        ...(localAuthor ? { anchorLocalHero: true, protectInteractionControls: true, protectSingleTargetControls: true } : {}),
        sameAuthorRects: measuredRectsByActor.get(parkingEvent.actorId) ?? [],
        ...placementFailureReporter(event),
      };
      const measuredTarget = currentAction.zoneTransition
        ? committedEquipmentSlotTarget(currentAction, event)
        : (old && !viewerChanged && !harvestLayoutChanged && !ordinalLayoutChanged && !hasNegationChainParking && !previous.layoutPending && !parkingOptions.protectInteractionControls
        ? old.target
        : seatHistoryCardParking(parkingEvent.actorId, actorIndex, occupied, parkingOptions)?.rect
          ?? (!parkingOptions.protectInteractionControls
            ? actorParkedCard(parkingEvent.actorId, actorIndex, parkingEvent.actorId === viewerId)
            : null));
      const parkedSize = parkingOptions.cardSize ?? parkedCardSize();
      // Retain the last real author target while a same-viewer measurement is
      // pending. A first-time missing target remains an unproven centre-sized
      // placeholder and is never treated as a valid parked position.
      const target = measuredTarget ?? old?.target ?? { left: pendingCenter.left, top: pendingCenter.top, ...parkedSize };
      if (measuredTarget) {
        parkingFailureSignaturesRef.current.delete(`${viewerIdRef.current}:${event.eventId}`);
        measuredTargetEventIds.add(event.eventId);
        occupied.push(measuredTarget);
        measuredRectsByActor.set(parkingEvent.actorId, [...(measuredRectsByActor.get(parkingEvent.actorId) ?? []), measuredTarget]);
      }
      if (old && !viewerChanged) {
        const now = performance.now();
        const moveTargetChanged = old.phase === "move" && Boolean(measuredTarget) && !cardRectsMatch(old.target, target);
        const moveElapsedMs = old.phase === "move" && old.moveStartedAtMs != null
          ? Math.max(0, now - old.moveStartedAtMs)
          : 0;
        const moveRemainingMs = old.phase === "move"
          ? Math.max(0, (old.moveRemainingMs ?? MOVE_DURATION_MS) - moveElapsedMs)
          : old.moveRemainingMs;
        if (old.awaitingParkingTarget && measuredTarget) {
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const directPark = directParkPublicJourneyOnPhone(currentAction, event.role, true);
          return {
            ...event,
            ...old,
            parkedPublicEffect,
            actorName: event.actorName,
            cardFace: event.cardFace,
            ariaLabel: event.ariaLabel,
            semanticLabel: event.semanticLabel,
            phase: reducedMotion || directPark ? "parked" : "move",
            rect: target,
            target,
            revealStartedAtMs: null,
            revealRemainingMs: 0,
            moveStartedAtMs: reducedMotion || directPark ? null : now,
            moveRemainingMs: reducedMotion || directPark ? 0 : MOVE_DURATION_MS,
            awaitingParkingTarget: false,
            parkingTargetViewerId: viewerId,
            layoutPending: false,
            layoutChangeReason: directPark ? "author-parking-anchor-recovered-direct-phone-parking"
              : reducedMotion ? "four-second-reveal-complete-reduced-motion" : "author-parking-anchor-recovered",
          };
        }
        if (latestFreshResponseEventId && event.eventId !== latestFreshResponseEventId && old.phase === "reveal") {
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const directPark = directParkPublicJourneyOnPhone(currentAction, event.role, Boolean(measuredTarget));
          return {
            ...event,
            ...old,
            parkedPublicEffect,
            actorName: event.actorName,
            cardFace: event.cardFace,
            ariaLabel: event.ariaLabel,
            semanticLabel: event.semanticLabel,
            phase: reducedMotion || directPark || !measuredTarget ? "parked" : "move",
            rect: target,
            moveStartedAtMs: reducedMotion || directPark || !measuredTarget ? null : now,
            moveRemainingMs: reducedMotion || directPark || !measuredTarget ? 0 : MOVE_DURATION_MS,
            awaitingParkingTarget: false,
            revealStartedAtMs: null,
            revealRemainingMs: 0,
            target,
            parkingTargetViewerId: measuredTarget ? viewerId : old.parkingTargetViewerId,
            layoutPending: !measuredTarget,
            layoutChangeReason: !measuredTarget ? "author-parking-unavailable-awaiting-remeasure"
              : directPark ? "interrupted-response-direct-phone-parking"
                : reducedMotion ? "interrupted-response-reduced-motion" : "interrupted-by-new-committed-response",
          };
        }
        return {
          ...event,
          ...old,
          parkedPublicEffect,
          actorName: event.actorName,
          cardFace: event.cardFace,
          ariaLabel: event.ariaLabel,
          semanticLabel: event.semanticLabel,
          rect: moveTargetChanged ? target
            : old.phase === "move" && !measuredTarget ? renderedJourneyCardRect(old.eventId) ?? old.rect
              : old.phase === "parked" ? target : old.phase === "reveal" ? center ?? old.rect : old.rect,
          target,
          parkingTargetViewerId: measuredTarget ? viewerId : old.parkingTargetViewerId,
          ...(old.phase === "move" && !measuredTarget ? {
            moveStartedAtMs: null,
            moveRemainingMs,
          } : moveTargetChanged ? {
            moveStartedAtMs: now,
            moveRemainingMs,
            layoutChangeReason: "move-rebased-to-updated-author-target",
          } : {}),
          layoutPending: !measuredTarget,
          ...(moveTargetChanged || old.phase === "move" && !measuredTarget ? {}
            : { layoutChangeReason: measuredTarget ? old.layoutChangeReason : "author-parking-unavailable-awaiting-remeasure" }),
        };
      }
      if (old && viewerChanged) {
        const phase: SingleTargetJourneyPhase = old.phase;
        return {
          ...event,
          ...old,
          parkedPublicEffect,
          actorName: event.actorName,
          cardFace: event.cardFace,
          ariaLabel: event.ariaLabel,
          semanticLabel: event.semanticLabel,
          phase,
          rect: phase === "parked" ? target : phase === "reveal" ? center ?? old.rect : old.rect,
          target,
          parkingTargetViewerId: measuredTarget ? viewerId : old.parkingTargetViewerId,
          moveStartedAtMs: phase === "move" && measuredTarget
            ? old.moveStartedAtMs ?? performance.now()
            : phase === "move" ? null : old.moveStartedAtMs,
          layoutPending: !measuredTarget,
          layoutChangeReason: measuredTarget ? "viewer-switch" : "viewer-switch-awaiting-author-anchor",
        };
      }
      const phase: SingleTargetJourneyPhase = !old && fresh.has(event.eventId) && event.eventId === latestFreshEventId ? "reveal" : "parked";
      return {
        ...event,
        phase,
        rect: phase === "parked" ? target : center ?? pendingCenter,
        target,
        parkingTargetViewerId: measuredTarget ? viewerId : undefined,
        revealStartedAtMs: null,
        revealStartedAtIso: null,
        revealElapsedMs: 0,
        revealRemainingMs: STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
        moveStartedAtMs: null,
        layoutPending: !measuredTarget,
        layoutChangeReason: phase === "reveal"
          ? "public-event-committed"
          : !measuredTarget
            ? "author-parking-unavailable-awaiting-remeasure"
          : latestFreshResponseEventId && event.eventId !== latestFreshResponseEventId
            ? "superseded-by-newer-committed-response"
            : "public-event-restored",
      };
    });
    const framePlacementUnavailable = frameCenterUnavailable && cards.some((card) =>
      card.eventId === currentAction.publicCardEffectFrame?.eventId && card.phase === "reveal");
    const presentationCards = framePlacementUnavailable
      ? cards.map((card) => card.eventId === currentAction.publicCardEffectFrame?.eventId && card.phase === "reveal"
        ? { ...card, layoutPending: true, layoutChangeReason: "public-effect-frame-awaiting-h4-safe-geometry" }
        : card)
      : cards;
    const layoutPending = framePlacementUnavailable || center === null
      || presentationCards.some((card) => !measuredTargetEventIds.has(card.eventId));
    const presentedCards = historyOnly
      ? presentationCards.map((card) => ({
        ...card,
        phase: "parked" as const,
        rect: card.target,
        revealStartedAtMs: null,
        revealRemainingMs: 0,
        moveStartedAtMs: null,
        layoutChangeReason: card.layoutPending ? "inspector-history-retained-awaiting-author-anchor" : "inspector-history-retained",
      }))
      : viewerChanged || !center ? presentationCards : withFirstQueuedSingleTargetReveal(presentationCards, center);
    const next: SingleTargetJourneyState = {
      scopeKey,
      viewerId,
      harvestPoolReadOnly,
      showNegationChainOrdinals: hasNegationChainParking,
      cards: presentedCards,
      center: center ?? (framePlacementUnavailable ? pendingCenter : null),
      suppressTransitions: viewerChanged || harvestLayoutChanged || ordinalLayoutChanged || hasNegationChainParking || previous.suppressTransitions,
      layoutPending,
      framePlacementUnavailable,
    };
    journeyRef.current = next;
    setJourney(next);
  }, [enabled, journeyEnabled, historyOnly, harvestChoiceActive, harvestPoolAboveRoot, harvestRootPoolVisible, harvestPoolReadOnly, action.showNegationChainOrdinals, scopeKey, eventSignature, publicEffectFrameSignature, freshSignature, viewerId, sharedPublicStage?.layout.identity, sharedPublicStage?.revealReady, placementFailureReporter]);

  useEffect(() => {
    if (!journey.suppressTransitions || journey.scopeKey !== scopeKey) return;
    const frame = window.requestAnimationFrame(() => setJourney((current) => {
      if (current.scopeKey !== scopeKey || !current.suppressTransitions) return current;
      const next = { ...current, suppressTransitions: false };
      journeyRef.current = next;
      return next;
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [journey.layoutPending, journey.scopeKey, journey.suppressTransitions, scopeKey]);

  const activeCard = journey.cards.find((card) => card.phase === "reveal")
    ?? [...journey.cards].reverse().find((card) => card.phase === "move")
    ?? null;
  const activeEventId = activeCard?.eventId
    ?? [...journey.cards].reverse().find((card) => card.phase !== "queued")?.eventId
    ?? action.rootEventId;
  const primaryJourneyCard = journey.cards.find((card) => card.eventId === activeEventId);
  const primaryNonRevealTargetReady = Boolean(primaryJourneyCard
    && (primaryJourneyCard.phase === "move" || primaryJourneyCard.phase === "parked")
    && !primaryJourneyCard.layoutPending
    && publicStageJourneyTargetReady({
      viewerId,
      targetViewerId: primaryJourneyCard.parkingTargetViewerId,
      target: {
        left: primaryJourneyCard.target.left,
        top: primaryJourneyCard.target.top,
        right: primaryJourneyCard.target.left + primaryJourneyCard.target.width,
        bottom: primaryJourneyCard.target.top + primaryJourneyCard.target.height,
      },
    }));
  // The latest H4 fact can be a pick without owning a physical card Journey.
  // Associate it with this viewer's proven root/response only for stage layout.
  const harvestStagePrimaryEventId = harvestPoolVisible
    && action.cardKind === "BumperHarvest" && Boolean(action.interactionId)
    && journey.scopeKey === scopeKey && journey.viewerId === viewerId
    && journey.cards.some((card) => card.role === "root"
      && card.eventId === action.rootEventId && card.actorId === action.sourceId
      && card.cardFace.id === action.cardFace?.id)
    && primaryJourneyCard && primaryJourneyCard.eventId === activeEventId
    && incoming.some((card) => card.eventId === primaryJourneyCard.eventId
      && card.actorId === primaryJourneyCard.actorId && card.cardFace.id === primaryJourneyCard.cardFace.id)
    ? primaryJourneyCard.eventId
    : undefined;
  // Shared H4/PAC placement belongs to the current primary card. An unrelated
  // older parked author's unmeasured Seat may keep that one miniature hidden,
  // but it must not make an otherwise measured current public stage disappear.
  const primaryStageGeometryReady = primaryJourneyCard?.phase === "reveal"
    ? journey.center !== null
    : primaryNonRevealTargetReady;
  const sharedStageLayoutPending = !primaryJourneyCard || primaryJourneyCard.layoutPending || !primaryStageGeometryReady;
  const activePhase = activeCard?.phase ?? null;
  useEffect(() => {
    if (!journeyEnabled || !documentVisible || journey.scopeKey !== scopeKey || !activeCard || !activePhase) return;
    const timers = journey.cards.flatMap((card) => {
      if (card.phase === "reveal" && card.revealStartedAtMs != null) {
        const delay = Math.max(0, (card.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS)
          - Math.max(0, performance.now() - card.revealStartedAtMs));
        return [window.setTimeout(() => {
          if (!mountedRef.current) return;
          const current = journeyRef.current;
          const completedCard = current.cards.find((candidate) => candidate.eventId === card.eventId);
          if (current.scopeKey !== scopeKey || current.viewerId !== viewerIdRef.current || current.viewerId !== viewerId
            || !completedCard || completedCard.phase !== "reveal"
            || completedCard.revealStartedAtMs !== card.revealStartedAtMs) return;
          const latestAction = actionRef.current;
          const requiresVisibleH4Hold = requiresPublicH4VisibleHold(latestAction, completedCard.eventId, completedCard.cardFace.id);
          const completesAtVisibleHold = verifiedGuicaiVisibleHold(latestAction, completedCard.eventId, completedCard.cardFace.id);
          const expectedFrame = latestAction.publicCardEffectFrame?.eventId === completedCard.eventId
            ? latestAction.publicCardEffectFrame : undefined;
          const requiredH4Identity = zoneTransitionPaintIdentity(latestAction, current.viewerId, completedCard.eventId);
          const currentPaintEnabled = expectedFrame
            ? hasPaintedLargePublicCard(completedCard.eventId, REVEAL_CARD, expectedFrame, {
              roomId: roomCode,
              rootEventId: latestAction.rootEventId,
              interactionId: latestAction.interactionId,
              viewerId: current.viewerId,
              allowPendingSameEventLayout: completesAtVisibleHold,
            })
            : hasPaintedLargePublicCard(completedCard.eventId, REVEAL_CARD, undefined, requiredH4Identity);
          const safePainted = currentPaintEnabled && document.visibilityState === "visible" && documentVisibleRef.current;
          const now = performance.now();
          const visibleHoldComplete = requiresVisibleH4Hold && publicStageVisibleHoldCanComplete({
            remainingMs: completedCard.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
            startedAtMs: completedCard.revealStartedAtMs ?? null,
            nowMs: now,
            safePainted,
          });
          const canRetireReveal = publicStageRevealCanRetire({
            phase: "REVEAL",
            layoutPending: completesAtVisibleHold ? false : completedCard.layoutPending === true,
            safePainted,
            viewerId: current.viewerId,
            parkingTargetViewerId: completedCard.parkingTargetViewerId,
            parkingTarget: completedCard.target,
            requireParkingTarget: !completesAtVisibleHold,
          });
          if (completesAtVisibleHold && visibleHoldComplete && canRetireReveal) {
            notifyRevealCompletedOnce(completedCard.eventId, completedCard.cardFace.id);
            return;
          }
          setJourney((current) => {
            const currentCard = current.cards.find((candidate) => candidate.eventId === card.eventId);
            if (current.scopeKey !== scopeKey || !currentCard || currentCard.phase !== "reveal"
              || currentCard.revealStartedAtMs !== card.revealStartedAtMs) return current;
            const currentCanRetireReveal = publicStageRevealCanRetire({
              phase: "REVEAL",
              layoutPending: completesAtVisibleHold ? false : currentCard.layoutPending === true,
              safePainted,
              viewerId: current.viewerId,
              parkingTargetViewerId: currentCard.parkingTargetViewerId,
              parkingTarget: currentCard.target,
              requireParkingTarget: !completesAtVisibleHold,
            });
            if (!currentCanRetireReveal || requiresVisibleH4Hold && !visibleHoldComplete) {
              const visibleHoldCheckpoint = requiresVisibleH4Hold ? checkpointPublicStageVisibleHold({
                elapsedMs: currentCard.revealElapsedMs ?? 0,
                remainingMs: currentCard.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
                startedAtMs: currentCard.revealStartedAtMs ?? null,
                nowMs: now,
              }) : null;
              const cards = current.cards.map((candidate) => candidate.eventId === card.eventId
                ? {
                  ...candidate,
                  revealStartedAtMs: null,
                  revealElapsedMs: visibleHoldCheckpoint?.elapsedMs
                    ?? (candidate.revealElapsedMs ?? 0) + Math.max(0, now - (candidate.revealStartedAtMs ?? now)),
                  revealRemainingMs: visibleHoldCheckpoint?.remainingMs ?? 0,
                  awaitingParkingTarget: !completesAtVisibleHold && safePainted && currentCard.layoutPending,
                  layoutPending: candidate.layoutPending || !safePainted
                    || !completesAtVisibleHold && safePainted && candidate.parkingTargetViewerId !== current.viewerId,
                  layoutChangeReason: !safePainted ? requiresVisibleH4Hold
                    ? "visible-hold-paused-awaiting-matching-frame-and-h4"
                    : "reveal-complete-awaiting-safe-effect-frame-paint"
                    : completesAtVisibleHold ? "visible-hold-paused-awaiting-completion-check"
                      : "reveal-complete-awaiting-safe-author-slot",
                }
                : candidate);
              const next = { ...current, cards };
              journeyRef.current = next;
              return next;
            }
            const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const directPark = directParkPublicJourneyOnPhone(actionRef.current, currentCard.role,
              !currentCard.layoutPending && currentCard.target.width > 0 && currentCard.target.height > 0);
            const shouldMove = !reducedMotion && !currentCard.layoutPending && !directPark;
            const cards = current.cards.map((candidate) => candidate.eventId === card.eventId
              ? {
                ...candidate,
                phase: shouldMove ? "move" as const : "parked" as const,
                rect: candidate.target,
                revealStartedAtMs: null,
                revealElapsedMs: (candidate.revealElapsedMs ?? 0) + Math.max(0, now - (candidate.revealStartedAtMs ?? now)),
                revealRemainingMs: 0,
                moveStartedAtMs: shouldMove ? now : null,
                moveRemainingMs: shouldMove ? MOVE_DURATION_MS : undefined,
                awaitingParkingTarget: false,
                layoutChangeReason: currentCard.layoutPending ? "reveal-complete-awaiting-seat-anchor"
                  : directPark ? "four-second-reveal-complete-direct-phone-parking"
                    : reducedMotion ? "four-second-reveal-complete-reduced-motion" : "four-second-reveal-complete",
              }
              : candidate);
            const next = { ...current, cards };
            journeyRef.current = next;
            return next;
          });
          if (canRetireReveal) {
            notifyRevealCompletedOnce(completedCard.eventId, completedCard.cardFace.id);
          }
        }, delay)];
      }
      if (card.phase === "move") {
        if (card.layoutPending) return [];
        if (card.moveStartedAtMs == null) {
          const now = performance.now();
          setJourney((current) => {
            if (current.scopeKey !== scopeKey) return current;
            const cards = current.cards.map((candidate) => candidate.eventId === card.eventId
              && candidate.phase === "move" && candidate.moveStartedAtMs == null && !candidate.layoutPending
              ? {
                ...candidate,
                rect: candidate.target,
                moveStartedAtMs: now,
                moveRemainingMs: (candidate.moveRemainingMs ?? 0) > 0 ? candidate.moveRemainingMs : MOVE_DURATION_MS,
              }
              : candidate);
            const next = { ...current, cards };
            journeyRef.current = next;
            return next;
          });
          return [];
        }
        const startedAt = card.moveStartedAtMs;
        const delay = Math.max(0, (card.moveRemainingMs ?? MOVE_DURATION_MS) - Math.max(0, performance.now() - startedAt));
        return [window.setTimeout(() => {
          if (!mountedRef.current) return;
          setJourney((current) => {
            const currentCard = current.cards.find((candidate) => candidate.eventId === card.eventId);
            if (current.scopeKey !== scopeKey || !currentCard || currentCard.phase !== "move") return current;
            const cards = current.cards.map((candidate) => candidate.eventId === card.eventId
              ? { ...candidate, phase: "parked" as const, rect: candidate.target, moveStartedAtMs: null, moveRemainingMs: 0, layoutChangeReason: "380ms-seat-parking-complete" }
              : candidate);
            const next = { ...current, cards };
            journeyRef.current = next;
            return next;
          });
        }, delay)];
      }
      return [];
    });
    const initialHoldAction = actionRef.current;
    const initialHoldCard = initialHoldAction.revealCompletionPolicy === "visible-hold"
      ? journey.cards.find((card) => card.eventId === initialHoldAction.rootEventId
        && card.cardFace.id === initialHoldAction.cardFace?.id && card.phase === "reveal")
      : null;
    const initialHoldStartedAtMs = initialHoldCard?.revealStartedAtMs ?? null;
    const holdTable = initialHoldCard ? document.querySelector<HTMLElement>(".play-table") : null;
    const pauseVisibleHoldIfUnpainted = () => {
      const latestAction = actionRef.current;
      if (!initialHoldCard || !requiresPublicH4VisibleHold(latestAction, initialHoldCard.eventId, initialHoldCard.cardFace.id)) return;
      const current = journeyRef.current;
      const card = current.scopeKey === scopeKey ? current.cards.find((candidate) => candidate.eventId === latestAction.rootEventId
        && candidate.cardFace.id === latestAction.cardFace?.id && candidate.phase === "reveal") : null;
      if (!card || card.revealStartedAtMs == null || card.revealStartedAtMs !== initialHoldStartedAtMs) return;
      const guicai = verifiedGuicaiVisibleHold(latestAction, card.eventId, card.cardFace.id);
      const painted = guicai && latestAction.publicCardEffectFrame
        ? hasPaintedLargePublicCard(card.eventId, REVEAL_CARD, latestAction.publicCardEffectFrame, {
          roomId: roomCode, rootEventId: latestAction.rootEventId, interactionId: latestAction.interactionId,
          viewerId: current.viewerId, allowPendingSameEventLayout: true,
        })
        : hasPaintedLargePublicCard(card.eventId, REVEAL_CARD, undefined,
          zoneTransitionPaintIdentity(latestAction, current.viewerId, card.eventId));
      if (painted && document.visibilityState === "visible" && documentVisibleRef.current) return;
      const now = performance.now();
      setJourney((latest) => {
        const currentCard = latest.scopeKey === scopeKey ? latest.cards.find((candidate) => candidate.eventId === card.eventId
          && candidate.cardFace.id === card.cardFace.id && candidate.phase === "reveal") : null;
        if (!currentCard || currentCard.revealStartedAtMs == null
          || currentCard.revealStartedAtMs !== initialHoldStartedAtMs) return latest;
        const checkpoint = checkpointPublicStageVisibleHold({
          elapsedMs: currentCard.revealElapsedMs ?? 0,
          remainingMs: currentCard.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
          startedAtMs: currentCard.revealStartedAtMs,
          nowMs: now,
        });
        const next = { ...latest, cards: latest.cards.map((candidate) => candidate.eventId === currentCard.eventId
          ? { ...candidate, revealStartedAtMs: null, revealElapsedMs: checkpoint.elapsedMs,
            revealRemainingMs: checkpoint.remainingMs, layoutChangeReason: "visible-hold-paused-until-matching-frame-and-h4-return" }
          : candidate) };
        journeyRef.current = next;
        return next;
      });
    };
    const holdMutationObserver = initialHoldCard && holdTable && typeof MutationObserver !== "undefined"
      ? new MutationObserver(pauseVisibleHoldIfUnpainted) : null;
    if (initialHoldCard && holdTable && initialHoldCard.revealStartedAtMs != null) {
      holdMutationObserver?.observe(holdTable, {
        attributes: true,
        attributeFilter: ["style", "class", "data-public-stage-layout-status", "data-public-stage-layout-identity",
          "data-public-card-announcement-delivery", "data-public-card-announcement-positioned", "data-public-card-journey-layout-pending"],
        childList: true,
        subtree: true,
      });
    }
    const holdResizeObserver = initialHoldCard && holdTable && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(pauseVisibleHoldIfUnpainted) : null;
    if (initialHoldCard && holdTable && initialHoldCard.revealStartedAtMs != null) {
      holdResizeObserver?.observe(holdTable);
      for (const element of holdTable.querySelectorAll<HTMLElement>(`[data-public-card-journey-event-id]`)) {
        if (element.dataset.publicCardJourneyEventId === initialHoldCard.eventId) holdResizeObserver?.observe(element);
      }
      for (const element of holdTable.querySelectorAll<HTMLElement>(`[data-public-card-announcement='true']`)) {
        if (element.dataset.publicCardAnnouncementEventId === initialHoldCard.eventId) holdResizeObserver?.observe(element);
      }
    }
    if (initialHoldCard?.revealStartedAtMs != null) {
      document.addEventListener("visibilitychange", pauseVisibleHoldIfUnpainted);
      window.addEventListener("resize", pauseVisibleHoldIfUnpainted);
    }
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      holdMutationObserver?.disconnect();
      holdResizeObserver?.disconnect();
      if (initialHoldCard?.revealStartedAtMs != null) {
        document.removeEventListener("visibilitychange", pauseVisibleHoldIfUnpainted);
        window.removeEventListener("resize", pauseVisibleHoldIfUnpainted);
      }
      const latestAction = actionRef.current;
      const current = journeyRef.current;
      const visibleHoldCard = latestAction.revealCompletionPolicy === "visible-hold"
        && requiresPublicH4VisibleHold(latestAction, latestAction.rootEventId, latestAction.cardFace?.id ?? "")
        ? current.cards.find((card) => card.eventId === latestAction.rootEventId
          && card.cardFace.id === latestAction.cardFace?.id && card.phase === "reveal")
        : null;
      const visibleHoldGuicai = Boolean(visibleHoldCard && verifiedGuicaiVisibleHold(latestAction, visibleHoldCard.eventId, visibleHoldCard.cardFace.id));
      const visibleHoldPainted = Boolean(visibleHoldCard && (visibleHoldGuicai && latestAction.publicCardEffectFrame
        ? hasPaintedLargePublicCard(visibleHoldCard.eventId, REVEAL_CARD, latestAction.publicCardEffectFrame, {
          roomId: roomCode, rootEventId: latestAction.rootEventId, interactionId: latestAction.interactionId,
          viewerId: current.viewerId, allowPendingSameEventLayout: true,
        })
        : hasPaintedLargePublicCard(visibleHoldCard.eventId, REVEAL_CARD, undefined,
          zoneTransitionPaintIdentity(latestAction, current.viewerId, visibleHoldCard.eventId))));
      const shouldPause = !enabledRef.current || !documentVisibleRef.current || document.visibilityState !== "visible"
        || Boolean(visibleHoldCard && !visibleHoldPainted);
      if (!shouldPause) return;
      if (current.scopeKey !== scopeKey) return;
      const now = performance.now();
      let changed = false;
      const cards = current.cards.map((card) => {
        if (card.phase === "reveal" && card.revealStartedAtMs != null) {
          changed = true;
          const isVisibleHold = requiresPublicH4VisibleHold(latestAction, card.eventId, card.cardFace.id);
          const checkpoint = isVisibleHold ? checkpointPublicStageVisibleHold({
            elapsedMs: card.revealElapsedMs ?? 0,
            remainingMs: card.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
            startedAtMs: card.revealStartedAtMs,
            nowMs: now,
          }) : null;
          const elapsed = Math.max(0, now - card.revealStartedAtMs);
          return {
            ...card,
            revealStartedAtMs: null,
            revealElapsedMs: checkpoint?.elapsedMs ?? (card.revealElapsedMs ?? 0) + elapsed,
            revealRemainingMs: checkpoint?.remainingMs ?? Math.max(0, (card.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS) - elapsed),
            layoutChangeReason: isVisibleHold ? "visible-hold-paused-until-matching-frame-and-h4-return" : card.layoutChangeReason,
          };
        }
        if (card.phase === "move") {
          changed = true;
          const elapsed = card.moveStartedAtMs == null ? 0 : Math.max(0, now - card.moveStartedAtMs);
          const painted = renderedJourneyCardRect(card.eventId);
          return {
            ...card,
            rect: painted ?? card.rect,
            moveStartedAtMs: null,
            moveRemainingMs: Math.max(0, (card.moveRemainingMs ?? MOVE_DURATION_MS) - elapsed),
            layoutChangeReason: "view-hidden-or-temporarily-disabled",
          };
        }
        return card;
      });
      if (!changed) return;
      const next = { ...current, cards };
      journeyRef.current = next;
      if (mountedRef.current) setJourney(next);
    };
  }, [journeyEnabled, documentVisible, journey.cards, journey.scopeKey, scopeKey, activeCard?.eventId, activePhase,
    roomCode, viewerId, action.publicCardEffectFrame?.eventId, action.zoneTransition?.claimId, action.rootEventId, action.interactionId,
    sharedPublicStage?.layout.identity, sharedPublicStage?.revealReady, notifyRevealCompletedOnce]);

  useEffect(() => {
    if (!journeyEnabled || !documentVisible || journey.scopeKey !== scopeKey || !journey.center || !activeCard || activeCard.phase !== "reveal"
      || activeCard.revealStartedAtMs != null || activeCard.awaitingParkingTarget) return;
    let lastFailureSignature = "";
    const table = document.querySelector<HTMLElement>(".play-table");
    const checkFirstPaint = () => {
      const latestAction = actionRef.current;
      const expectedFrame = latestAction.publicCardEffectFrame?.eventId === activeCard.eventId
        ? latestAction.publicCardEffectFrame : undefined;
      const allowPendingVerifiedReveal = latestAction.revealCompletionPolicy === "visible-hold"
        && verifiedGuicaiVisibleHold(latestAction, activeCard.eventId, activeCard.cardFace.id);
      const requiredH4Identity = zoneTransitionPaintIdentity(latestAction, viewerIdRef.current, activeCard.eventId);
      let failureReason = "card-face-not-paint-enabled";
      const safePainted = expectedFrame
        ? hasPaintedLargePublicCard(activeCard.eventId, REVEAL_CARD, expectedFrame, {
          roomId: roomCode,
          rootEventId: latestAction.rootEventId,
          interactionId: latestAction.interactionId,
          viewerId: viewerIdRef.current,
          allowPendingSameEventLayout: allowPendingVerifiedReveal,
        }, (reason) => { failureReason = reason; })
        : hasPaintedLargePublicCard(activeCard.eventId, REVEAL_CARD, undefined, requiredH4Identity,
          (reason) => { failureReason = reason; });
      if (!documentVisibleRef.current || document.visibilityState !== "visible") return false;
      if (!safePainted) {
        const shared = table ? committedPublicStageLayout(table) : null;
        const primary = table ? [...table.querySelectorAll<HTMLElement>("[data-public-card-journey-event-id]")]
          .find((candidate) => candidate.dataset.publicCardJourneyEventId === activeCard.eventId) : null;
        const footprint = primary && expectedFrame ? publicEffectFrameVisualFootprint(primary) : null;
        const announcement = shared && table ? [...table.querySelectorAll<HTMLElement>("[data-public-card-announcement='true']")]
          .find((candidate) => candidate.dataset.publicCardAnnouncementEventId === shared.announcementEventId
            && (candidate.dataset.publicCardAnnouncementCopyKey ?? "") === shared.announcementCopyKey) : null;
        const activity = table?.querySelector<HTMLElement>("[data-public-activity-chip='true']") ?? null;
        const activityStyle = activity ? window.getComputedStyle(activity) : null;
        const activityRect = activity?.getBoundingClientRect();
        const signature = JSON.stringify([failureReason, shared?.layout.identity ?? null, shared?.revealReady ?? false,
          primary?.style.visibility ?? null, footprint?.rect ?? null, announcement?.style.visibility ?? null]);
        if (isAttackDodgeUxTraceActive() && signature !== lastFailureSignature) {
          lastFailureSignature = signature;
          recordAttackDodgeUxTrace("public-stage-reveal-first-paint", {
            reason: failureReason,
            eventId: activeCard.eventId,
            viewerId: viewerIdRef.current,
            sharedIdentity: shared?.layout.identity ?? null,
            revealReady: shared?.revealReady ?? false,
            frame: footprint?.rect ?? (primary ? roundedRect(primary.getBoundingClientRect()) : null),
            target: shared?.layout.card ?? null,
            h4Visible: Boolean(announcement && visibleForMeasure(announcement)),
            pacVisible: Boolean(activity && activityStyle && activityRect && activityStyle.display !== "none"
              && activityStyle.visibility !== "hidden" && Number(activityStyle.opacity) > 0),
            pacActual: activity && activityStyle && activityRect && activityStyle.display !== "none"
              && activityStyle.visibility !== "hidden" && Number(activityStyle.opacity) > 0 ? roundedRect(activityRect) : null,
            pacTarget: shared?.layout.activity ?? null,
            timerStatus: activeCard.revealStartedAtMs === null ? "not-started" : "running",
            remainingMs: activeCard.revealRemainingMs ?? null,
          });
        }
        return false;
      }
      const startedAt = performance.now();
      const startedAtIso = new Date().toISOString();
      setJourney((current) => {
        const card = current.cards.find((candidate) => candidate.eventId === activeCard.eventId);
        if (current.scopeKey !== scopeKey || !card || card.phase !== "reveal" || card.revealStartedAtMs != null || card.awaitingParkingTarget) return current;
        const cards = current.cards.map((candidate) => candidate.eventId === card.eventId
          ? { ...candidate, revealStartedAtMs: startedAt, revealStartedAtIso: candidate.revealStartedAtIso ?? startedAtIso, layoutChangeReason: "centre-card-presented" }
          : candidate);
        const next = { ...current, cards };
        journeyRef.current = next;
        return next;
      });
      if (isAttackDodgeUxTraceActive()) recordAttackDodgeUxTrace("public-stage-reveal-first-paint", {
        reason: "paint-enabled-clock-started", eventId: activeCard.eventId, viewerId: viewerIdRef.current,
        sharedIdentity: table ? committedPublicStageLayout(table)?.layout.identity ?? null : null,
        timerStatus: "start-requested", remainingMs: activeCard.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
      });
      return true;
    };
    return observeUntilPublicCardFirstPaint(table, checkFirstPaint);
  }, [journeyEnabled, documentVisible, journey.center, journey.scopeKey, scopeKey, activeCard?.eventId, activeCard?.phase,
    activeCard?.revealStartedAtMs, activeCard?.awaitingParkingTarget, action.publicCardEffectFrame?.eventId,
    action.rootEventId, action.interactionId, roomCode, viewerId, sharedPublicStage?.layout.identity, sharedPublicStage?.revealReady]);

  const hasLocalKirinMaterialParking = journey.cards.some((card) => card.actorId === viewerId
    && card.parkedPublicEffect?.placement === "above-pac");

  useLayoutEffect(() => {
    if (!journeyEnabled || journey.scopeKey !== scopeKey) return;
    let resizeFrame = 0;
    let previousSampleSignature = "";
    let committedLayoutSignature = "";
    let pendingLayoutSignature = "";
    let stableFrames = 0;
    let sampledFrames = 0;
    let layoutObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let announcementObserver: MutationObserver | null = null;
    let placementRetryTimer = 0;
    let placementRetryAttempts = 0;
    const watchesKirinAnnouncement = action.publicCardEffectFrame?.effectId === "kirin_bow_damage_about_to_apply"
      || hasLocalKirinMaterialParking;
    const parkingSelectors = () => {
      const action = actionRef.current;
      if (action.zoneTransition) return ["[data-player-equipment-slot-owner][data-slot]"];
      const isSingleTarget = action.cardKind === "Steal" || action.cardKind === "Dismantle";
      const selectors = seatHistoryParkingProtectedSelectors({
        protectInteractionControls: isSingleTarget,
        protectSingleTargetControls: isSingleTarget,
      });
      return watchesKirinAnnouncement ? [...selectors, ".public-activity-chip"] : selectors;
    };
    const layoutElements = () => [...new Set([
      document.querySelector<HTMLElement>(".play-table"),
      document.querySelector<HTMLElement>(".player-board"),
      ...document.querySelectorAll<HTMLElement>("[data-player-anchor]"),
      ...(actionRef.current.zoneTransition
        ? [...document.querySelectorAll<HTMLElement>("[data-player-equipment-slot-owner][data-slot]")]
        : []),
      ...(isBumperHarvest || watchesKirinAnnouncement
        ? [...document.querySelectorAll<HTMLElement>("[data-public-card-announcement='true']")] : []),
      ...parkingSelectors().flatMap((selector) => [...document.querySelectorAll<HTMLElement>(selector)]),
    ].filter((element): element is HTMLElement => Boolean(element)))];
    const readLayoutSignature = () => {
      const table = document.querySelector<HTMLElement>(".play-table");
      const coordinates = table ? publicStageCoordinateSpaceForTable(table) : null;
      return [
        table?.clientWidth ?? 0,
        table?.clientHeight ?? 0,
        ...layoutElements().flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const local = coordinates ? publicStageRectToTableLocal(rect, coordinates) : null;
          const geometry = local ?? rect;
          return [element.dataset.playerAnchor ?? "", element.dataset.playerEquipmentSlotOwner ?? "", element.dataset.slot ?? "", element.className, element.dataset.sideColumn ?? "",
            geometry.left, geometry.top, geometry.right - geometry.left, geometry.bottom - geometry.top]
            .map((value) => typeof value === "number" ? Math.round(value * 2) / 2 : value);
        }),
      ].join(":");
    };
    committedLayoutSignature = readLayoutSignature();
    const observeLayout = () => { for (const element of layoutElements()) layoutObserver?.observe(element); };
    const reflow = (force = false) => {
      const requestedSignature = readLayoutSignature();
      if (!force && (requestedSignature === committedLayoutSignature || requestedSignature === pendingLayoutSignature)) return;
      pendingLayoutSignature = requestedSignature;
      window.cancelAnimationFrame(resizeFrame);
      stableFrames = 0;
      sampledFrames = 0;
      previousSampleSignature = "";
      const measureWhenSettled = () => {
        const layoutSignature = readLayoutSignature();
        if (layoutSignature !== pendingLayoutSignature) {
          pendingLayoutSignature = layoutSignature;
          stableFrames = 0;
          previousSampleSignature = "";
        }
        stableFrames = layoutSignature === previousSampleSignature ? stableFrames + 1 : 0;
        previousSampleSignature = layoutSignature;
        sampledFrames += 1;
        if (stableFrames < 1 && sampledFrames < 120) {
          resizeFrame = window.requestAnimationFrame(measureWhenSettled);
          return;
        }
        resizeFrame = 0;
        const current = journeyRef.current;
        if (current.scopeKey !== scopeKey) return;
        const currentAction = actionRef.current;
        const currentMotion = singleTargetJourneyMotion(currentAction.motion);
        const stationaryCenter = battlefieldCenterCard(REVEAL_CARD);
        const sharedFrameCenter = currentAction.publicCardEffectFrame
          ? effectFramePrimaryRectFromSharedLayout(sharedPublicStage, {
            roomId: roomCode,
            rootEventId: currentAction.rootEventId,
            interactionId: currentAction.interactionId,
            eventId: currentAction.publicCardEffectFrame.eventId,
            cardId: currentAction.publicCardEffectFrame.materials[0]?.card.id ?? "",
            viewerId: viewerIdRef.current,
          })
          : null;
        const sharedFrameRejected = Boolean(currentAction.publicCardEffectFrame
          && publicStageRejectedEffectFrame(currentAction.publicCardEffectFrame, {
            roomId: roomCode,
            rootEventId: currentAction.rootEventId,
            interactionId: currentAction.interactionId,
            viewerId: viewerIdRef.current,
          }));
        const center = sharedFrameCenter ?? (currentAction.publicCardEffectFrame
          ? sharedFrameRejected ? null : battlefieldPublicEffectFrameCard(currentAction.publicCardEffectFrame)
        : currentMotion?.type === "lust-cost" && currentAction.lustCostFrame
            ? battlefieldLustCostCard()
          : currentMotion?.type === "zone-transition"
            ? battlefieldCenterCard(REVEAL_CARD, { stationarySurface: "card" })
            : stationaryCenter);
        const framePlacementUnavailable = center === null && current.cards.some((card) => card.phase === "reveal");
        const pendingCenter = center ?? current.center;
        if (!pendingCenter) return;
        const occupied: CardRect[] = [];
        const measuredRectsByActor = new Map<string, CardRect[]>();
        const actorIndexes = new Map<string, number>();
        const measuredTargets = new Map<string, CardRect>();
        const revealPaintResults = new Map<string, boolean>();
        const cards = current.cards.map((card) => {
          const actorIndex = actorIndexes.get(card.actorId) ?? 0;
          actorIndexes.set(card.actorId, actorIndex + 1);
          const localAuthor = card.actorId === viewerIdRef.current
            && (currentAction.cardKind === "Steal" || currentAction.cardKind === "Dismantle");
          const parkingOptions = {
            ...singleTargetParkingOptions(currentAction, card, harvestPoolAboveRoot, undefined, viewerIdRef.current),
            ...(card.actorId === viewerIdRef.current ? { preferLocalAuthorDock: true } : {}),
            ...(localAuthor ? { anchorLocalHero: true, protectInteractionControls: true, protectSingleTargetControls: true } : {}),
            sameAuthorRects: measuredRectsByActor.get(card.actorId) ?? [],
            ...placementFailureReporter(card),
          };
          const measuredTarget = currentAction.zoneTransition
            ? committedEquipmentSlotTarget(currentAction, card)
            : seatHistoryCardParking(card.actorId, actorIndex, occupied, parkingOptions)?.rect;
          const parkedSize = parkingOptions.cardSize ?? parkedCardSize();
          const renderedRect = card.phase === "move" ? renderedJourneyCardRect(card.eventId) : null;
          const target = measuredTarget
            ?? (card.phase === "move" ? renderedRect ?? card.rect : { left: card.target.left, top: card.target.top, ...parkedSize });
          if (measuredTarget) {
            parkingFailureSignaturesRef.current.delete(`${viewerIdRef.current}:${card.eventId}`);
            measuredTargets.set(card.eventId, measuredTarget);
            occupied.push(measuredTarget);
            measuredRectsByActor.set(card.actorId, [...(measuredRectsByActor.get(card.actorId) ?? []), measuredTarget]);
          }
          const now = performance.now();
          const moveElapsedMs = card.moveStartedAtMs == null ? 0 : Math.max(0, now - card.moveStartedAtMs);
          const moveRemainingMs = card.phase === "move"
            ? Math.max(0, (card.moveRemainingMs ?? MOVE_DURATION_MS) - moveElapsedMs)
            : card.moveRemainingMs;
          const expectedFrame = currentAction.publicCardEffectFrame?.eventId === card.eventId
            ? currentAction.publicCardEffectFrame : undefined;
          const safeRevealPainted = card.phase === "reveal" && expectedFrame
            ? hasPaintedLargePublicCard(card.eventId, REVEAL_CARD, expectedFrame, {
              roomId: roomCode,
              rootEventId: currentAction.rootEventId,
              interactionId: currentAction.interactionId,
              viewerId: viewerIdRef.current,
            })
            : card.phase === "reveal"
              ? hasPaintedLargePublicCard(card.eventId, REVEAL_CARD, undefined,
                zoneTransitionPaintIdentity(currentAction, viewerIdRef.current, card.eventId))
              : true;
          if (card.phase === "reveal") revealPaintResults.set(card.eventId, safeRevealPainted);
          const phaseReady = publicStageJourneyPhaseReady({
            phase: card.phase === "move" ? "MOVE" : card.phase === "parked" ? "PARKED" : "REVEAL",
            viewerId: viewerIdRef.current,
            targetViewerId: measuredTarget ? viewerIdRef.current : null,
            target: measuredTarget ? {
              left: measuredTarget.left,
              top: measuredTarget.top,
              right: measuredTarget.left + measuredTarget.width,
              bottom: measuredTarget.top + measuredTarget.height,
            } : null,
            revealCenterAvailable: card.phase !== "reveal" || center !== null && !framePlacementUnavailable,
            revealPainted: safeRevealPainted,
          });
          const waitingRevealWithTarget = card.phase === "reveal" && card.awaitingParkingTarget
            && Boolean(measuredTarget) && center !== null && !framePlacementUnavailable && safeRevealPainted;
          const reducedMotion = waitingRevealWithTarget && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          return {
            ...card,
            parkingTargetViewerId: measuredTarget ? viewerIdRef.current : card.parkingTargetViewerId,
            phase: waitingRevealWithTarget ? reducedMotion ? "parked" as const : "move" as const : card.phase,
            target,
            rect: waitingRevealWithTarget ? target
            : card.phase === "reveal" ? center ?? card.rect
              : card.phase === "move" ? measuredTarget ? target : renderedRect ?? card.rect
                : measuredTarget ? target : card.rect,
            moveStartedAtMs: card.phase !== "move" ? card.moveStartedAtMs
              : measuredTarget ? now
                : null,
            moveRemainingMs: card.phase !== "move" ? card.moveRemainingMs
              : moveRemainingMs,
            ...(waitingRevealWithTarget ? {
              awaitingParkingTarget: false,
              moveStartedAtMs: reducedMotion ? null : now,
              moveRemainingMs: reducedMotion ? 0 : MOVE_DURATION_MS,
            } : {}),
            layoutPending: !phaseReady,
            layoutChangeReason: waitingRevealWithTarget
              ? reducedMotion ? "four-second-reveal-complete-reduced-motion" : "author-parking-anchor-recovered"
              : measuredTarget ? "viewport-resize-author-anchor-measured" : "author-parking-unavailable-awaiting-remeasure",
          };
        });
        const layoutPending = cards.some((card) => card.layoutPending);
        if (layoutPending && sampledFrames < 8) {
          resizeFrame = window.requestAnimationFrame(measureWhenSettled);
          return;
        }
        committedLayoutSignature = layoutSignature;
        pendingLayoutSignature = "";
        const unchanged = Boolean(current.center && center && cardRectsMatch(current.center, center))
          && cards.length === current.cards.length
          && current.layoutPending === layoutPending
          && cards.every((card, index) => card.eventId === current.cards[index].eventId
            && card.phase === current.cards[index].phase
            && cardRectsMatch(card.rect, current.cards[index].rect)
            && cardRectsMatch(card.target, current.cards[index].target));
        if (unchanged) return;
        const next = {
          ...current,
          center: center ?? (framePlacementUnavailable ? pendingCenter : null),
          cards: framePlacementUnavailable ? cards.map((card) => card.eventId === currentAction.publicCardEffectFrame?.eventId
            && card.phase === "reveal"
            ? { ...card, layoutPending: true, layoutChangeReason: "public-effect-frame-awaiting-h4-safe-geometry" }
            : card) : cards,
          suppressTransitions: true,
          layoutPending,
          framePlacementUnavailable,
        };
        journeyRef.current = next;
        setJourney(next);
        for (const card of current.cards) {
          const nextCard = next.cards.find((candidate) => candidate.eventId === card.eventId);
          const expectedFrame = currentAction.publicCardEffectFrame?.eventId === card.eventId
            ? currentAction.publicCardEffectFrame : undefined;
          const revealHoldComplete = card.phase === "reveal" && card.awaitingParkingTarget
            && (card.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS) <= 0
            && (card.revealElapsedMs ?? 0) >= STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS - 1;
          if (!revealHoldComplete || !nextCard || nextCard.layoutPending
            || nextCard.phase !== "move" && nextCard.phase !== "parked") continue;
          const safelyPainted = expectedFrame ? revealPaintResults.get(card.eventId) === true : true;
          if (safelyPainted) notifyRevealCompletedOnce(card.eventId, card.cardFace.id);
        }
      };
      resizeFrame = window.requestAnimationFrame(measureWhenSettled);
    };
    if (journey.layoutPending) {
      const schedulePlacementRetry = () => {
        placementRetryTimer = window.setTimeout(() => {
          const latest = journeyRef.current;
          if (latest.scopeKey !== scopeKey || !latest.layoutPending || placementRetryAttempts >= 5) return;
          placementRetryAttempts += 1;
          reflow(true);
          if (placementRetryAttempts < 5) schedulePlacementRetry();
        }, 2400);
      };
      schedulePlacementRetry();
    }
    layoutObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => reflow());
    observeLayout();
    const shell = document.querySelector<HTMLElement>(".game-shell");
    mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver((records) => {
      const relevantSelectors = ["[data-player-anchor]", "[data-equipment-id]", ...parkingSelectors(),
        ...(watchesKirinAnnouncement ? ["[data-public-card-announcement='true']"] : [])];
      const containsRelevantLayout = (node: Node) => node instanceof Element
        && (relevantSelectors.some((selector) => node.matches(selector) || Boolean(node.querySelector(selector))));
      if (records.some((record) => record.type === "attributes"
        ? record.target instanceof Element && containsRelevantLayout(record.target)
        : [...record.addedNodes, ...record.removedNodes].some(containsRelevantLayout))) {
        observeLayout();
        reflow();
      }
    });
    if (shell) mutationObserver?.observe(shell, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-player-anchor", "class", "style", "hidden"] });
    if ((isBumperHarvest || watchesKirinAnnouncement) && typeof MutationObserver !== "undefined") {
      const announcementLayoutSignature = () => [...document.querySelectorAll<HTMLElement>("[data-public-card-announcement='true']")]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return [style.display, style.visibility, rect.left, rect.top, rect.width, rect.height]
            .map((value) => typeof value === "number" ? Math.round(value * 2) / 2 : value)
            .join(":");
        }).join("|");
      let previousAnnouncementSignature = announcementLayoutSignature();
      announcementObserver = new MutationObserver(() => {
        const nextSignature = announcementLayoutSignature();
        if (nextSignature === previousAnnouncementSignature) return;
        previousAnnouncementSignature = nextSignature;
        reflow();
      });
      for (const announcement of document.querySelectorAll<HTMLElement>("[data-public-card-announcement='true']")) {
        announcementObserver.observe(announcement, { attributes: true, attributeFilter: ["style"] });
      }
    }
    return () => {
      layoutObserver?.disconnect();
      mutationObserver?.disconnect();
      announcementObserver?.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      window.clearTimeout(placementRetryTimer);
    };
  }, [action.publicCardEffectFrame?.effectId, journeyEnabled, harvestChoiceActive, harvestPoolAboveRoot, harvestRootPoolVisible, harvestPoolReadOnly, isBumperHarvest, journey.layoutPending, journey.scopeKey, hasLocalKirinMaterialParking, scopeKey, sharedPublicStage?.layout.identity, sharedPublicStage?.revealReady, placementFailureReporter, notifyRevealCompletedOnce]);

  const currentCard = activeCard ?? journey.cards.find((card) => card.eventId === activeEventId) ?? null;
  const allParked = !journey.layoutPending && journey.cards.length > 0 && journey.cards.every((card) => card.phase === "parked");
  // A viewer switch changes the seat projection before the layout effect has
  // measured the new author's anchor. Never paint a previous viewer's card
  // coordinates against the new roster, even for one rendered frame.
  const viewerLayoutPending = journey.scopeKey === scopeKey && journey.viewerId !== viewerId;
  const publicCopyViewerGeometryReady = journey.scopeKey === scopeKey
    && journey.viewerId === viewerId
    && (primaryJourneyCard?.phase === "move" || primaryJourneyCard?.phase === "parked"
      ? primaryNonRevealTargetReady : journey.center !== null);
  useLayoutEffect(() => {
    const historyCards = [...document.querySelectorAll<HTMLElement>(".public-card-display-journey.is-harvest-history-passive [data-public-card-harvest-history-parked='true']")];
    for (const card of historyCards) {
      card.style.removeProperty("--harvest-inspector-peek-x");
      card.style.removeProperty("--harvest-inspector-peek-y");
      delete card.dataset.publicCardHarvestHistoryPeek;
    }
    if (!historyOnly) return;
    const inspector = document.querySelector<HTMLElement>(".opponent-inspection-floating-shell");
    const inspectorRect = inspector?.getBoundingClientRect();
    if (!inspectorRect || inspectorRect.width <= 0 || inspectorRect.height <= 0) return;
    const protectedRects = [...document.querySelectorAll<HTMLElement>([
      ".opponent-player-card", ".player-square", ".visible-countdown", ".stage-system-cluster",
      ".public-activity-chip", ".harvest-choice-panel", ".public-card-display-journey-copy",
      ".local-player-dock", ".local-hand-rail", ".test-view-switch-button", ".opponent-seat-inspect-button",
      ".opponent-player-name-strip", ".opponent-status-equipment-strip", ".opponent-hp-chip",
    ].join(", "))]
      .filter((element) => element !== inspector && !inspector.contains(element))
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);
    const intersectionArea = (first: DOMRect | { left: number; top: number; width: number; height: number }, second: DOMRect) =>
      Math.max(0, Math.min(first.left + first.width, second.right) - Math.max(first.left, second.left))
      * Math.max(0, Math.min(first.top + first.height, second.bottom) - Math.max(first.top, second.top));
    for (const card of historyCards) {
      const rect = card.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || intersectionArea(rect, inspectorRect) <= 0) continue;
      const leftFirst = rect.left + rect.width / 2 < inspectorRect.left + inspectorRect.width / 2;
      const aboveFirst = rect.top + rect.height / 2 < inspectorRect.top + inspectorRect.height / 2;
      const offsets = [
        ...(leftFirst ? [{ x: -8, y: 0 }, { x: 8, y: 0 }] : [{ x: 8, y: 0 }, { x: -8, y: 0 }]),
        ...(aboveFirst ? [{ x: 0, y: -8 }, { x: 0, y: 8 }] : [{ x: 0, y: 8 }, { x: 0, y: -8 }]),
      ];
      const baseVisibleArea = rect.width * rect.height - intersectionArea(rect, inspectorRect);
      const best = offsets.map((offset) => ({
        ...offset,
        rect: { left: rect.left + offset.x, top: rect.top + offset.y, width: rect.width, height: rect.height },
      })).filter(({ rect: candidate }) => candidate.left >= 2 && candidate.top >= 2
        && candidate.left + candidate.width <= window.innerWidth - 2
        && candidate.top + candidate.height <= window.innerHeight - 2
        && protectedRects.every((obstacle) => !rectsOverlap(candidate, obstacle, 1)))
        .map((candidate) => ({ ...candidate, visibleArea: rect.width * rect.height - intersectionArea(candidate.rect, inspectorRect) }))
        .sort((first, second) => second.visibleArea - first.visibleArea)[0];
      if (!best || best.visibleArea <= baseVisibleArea + 1) continue;
      card.style.setProperty("--harvest-inspector-peek-x", `${best.x}px`);
      card.style.setProperty("--harvest-inspector-peek-y", `${best.y}px`);
      card.dataset.publicCardHarvestHistoryPeek = `${best.x},${best.y}`;
    }
    return () => {
      for (const card of historyCards) {
        card.style.removeProperty("--harvest-inspector-peek-x");
        card.style.removeProperty("--harvest-inspector-peek-y");
        delete card.dataset.publicCardHarvestHistoryPeek;
      }
    };
  }, [historyOnly, journey.cards, viewerId]);
  useEffect(() => {
    if (!journeyEnabled || journey.scopeKey !== scopeKey) return;
    for (const card of journey.cards) {
      if (card.phase !== "parked" || card.layoutPending || parkedNotifiedEventIdsRef.current.has(card.eventId)) continue;
      parkedNotifiedEventIdsRef.current.add(card.eventId);
      onJourneyEventParked?.(card.eventId,
        action.zoneTransition?.eventId === card.eventId ? action.zoneTransition : undefined);
    }
  }, [journeyEnabled, journey.cards, journey.layoutPending, journey.scopeKey, onJourneyEventParked, scopeKey]);
  useEffect(() => {
    if (!journeyEnabled || journey.scopeKey !== scopeKey) return;
    const record = () => {
      const elements = [...document.querySelectorAll<HTMLElement>("[data-public-card-journey-event-id]")];
      for (const card of journey.cards) {
        if (card.phase === "queued") continue;
        const element = elements.find((candidate) => candidate.dataset.publicCardJourneyEventId === card.eventId);
        const rect = element?.getBoundingClientRect();
        const actorAnchors = [...document.querySelectorAll<HTMLElement>("[data-player-anchor]")]
          .filter((candidate) => candidate.dataset.playerAnchor === card.actorId);
        const playerAnchor = actorAnchors.find((candidate) => candidate.classList.contains("local-player-dock"))
          ?? actorAnchors.find((candidate) => {
            const anchorRect = candidate.getBoundingClientRect();
            return anchorRect.width > 0 && anchorRect.height > 0;
          });
        const anchor = playerAnchor?.querySelector<HTMLElement>(".local-hero-card, .opponent-hero-target, .opponent-hero-card") ?? playerAnchor;
        const anchorBounds = anchor?.getBoundingClientRect();
        const anchorRect = anchorBounds ? {
          left: Math.round(anchorBounds.left * 10) / 10,
          top: Math.round(anchorBounds.top * 10) / 10,
          width: Math.round(anchorBounds.width * 10) / 10,
          height: Math.round(anchorBounds.height * 10) / 10,
        } : null;
        const actualCardRect = rect && (!card.layoutPending || card.phase === "reveal") ? {
          left: Math.round(rect.left * 10) / 10,
          top: Math.round(rect.top * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        } : null;
        const targetParkingRect = card.layoutPending ? null : {
          left: Math.round(card.target.left * 10) / 10,
          top: Math.round(card.target.top * 10) / 10,
          width: card.target.width,
          height: card.target.height,
        };
        const revealElapsedMs = card.phase === "reveal" && card.revealStartedAtMs != null
          ? (card.revealElapsedMs ?? 0) + Math.max(0, performance.now() - card.revealStartedAtMs)
          : card.revealElapsedMs ?? 0;
        const roundedElapsedMs = Math.round(revealElapsedMs);
        const pendingLayout = Boolean(card.layoutPending || viewerLayoutPending);
        const signature = JSON.stringify([card.phase, actualCardRect, targetParkingRect, viewerId, journey.viewerId, anchorRect, pendingLayout, card.revealStartedAtIso, roundedElapsedMs, card.layoutChangeReason]);
        if (traceSignaturesRef.current.get(card.eventId) === signature) continue;
        traceSignaturesRef.current.set(card.eventId, signature);
        recordAttackDodgeUxTrace("public-card-journey", {
          rendererKind: "single-target-journey",
          motionType: motion?.type ?? null,
          interactionId: action.interactionId ?? null,
          rootEventId: action.rootEventId,
          rootFrameId: action.rootFrameId ?? null,
          checkpointId: action.checkpointId ?? null,
          presentationRevision: action.presentationRevision ?? null,
          revealDurationMs: STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
          moveDurationMs: MOVE_DURATION_MS,
          eventId: card.eventId,
          publicActorId: card.actorId,
          publicViewerId: viewerId,
          layoutViewerId: journey.viewerId,
          anchorId: playerAnchor?.dataset.playerAnchor ?? null,
          anchorKind: playerAnchor?.classList.contains("local-player-dock") ? "local-hero" : playerAnchor ? "opponent-seat" : null,
          anchorRect,
          pendingLayout,
          cardLayoutPending: Boolean(card.layoutPending),
          publicCardId: card.cardFace.id,
          interactionTargetId: action.targetId,
          cardKind: card.cardFace.kind,
          visualPhase: card.phase.toUpperCase(),
          cardRect: actualCardRect,
          actualCardRect,
          targetParkingRect,
          revealStartedAt: card.revealStartedAtIso ?? null,
          revealElapsedMs: roundedElapsedMs,
          layoutChangeReason: card.layoutChangeReason ?? (card.phase === "reveal"
            ? "full-size-centre-reveal"
            : card.phase === "move" ? "four-second-reveal-complete" : "seat-parking-complete"),
        });
      }
    };
    record();
    if (!journey.cards.some((card) => card.phase === "reveal" || card.phase === "move")) return;
    const interval = window.setInterval(record, 500);
    return () => window.clearInterval(interval);
  }, [action.targetId, journeyEnabled, journey.cards, journey.layoutPending, journey.scopeKey, journey.viewerId, scopeKey, viewerId, viewerLayoutPending]);
  const currentPublicCard = currentCard?.cardFace ?? action.cardFace ?? null;
  const groupRootStageOwnsCopy = motion?.type === "group-root" && !action.phaseNotice?.includes("NEGATION");
  const groupRootCenterIsStillOccupied = motion?.type === "group-root"
    && journey.cards.some((card) => card.phase === "reveal" || card.phase === "move");
  const announcementAnchorCard = groupRootStageOwnsCopy
    ? journey.cards.find((card) => card.eventId === action.rootEventId) ?? currentCard
    : currentCard;
  const dismantleSettlementAnnouncementEventId = action.settlement?.outcome === "DISMANTLE_RESOLVED"
    ? action.settlement.eventId
    : null;
  const announcementEventId = groupRootStageOwnsCopy
    ? action.settlement?.eventId ?? action.rootEventId
    : dismantleSettlementAnnouncementEventId ?? activeEventId;
  const publicEffectFrameOwnsAnnouncementAnchor = (action.publicCardEffectFrame?.effectId === "hua_tuo_prodigal_healer"
    || action.publicCardEffectFrame?.effectId === "hua_tuo_first_aid"
    || action.publicCardEffectFrame?.effectId === "gan_ning_qixi"
    || action.publicCardEffectFrame?.effectId === "yue_jin_dauntless"
    || action.publicCardEffectFrame?.effectId === "lady_gan_divine_wisdom"
    || action.publicCardEffectFrame?.effectId === "sun_quan_zhiheng"
    || action.publicCardEffectFrame?.effectId === "sun_shangxiang_betrothment"
    || action.publicCardEffectFrame?.effectId === "sima_yi_guicai"
    || action.publicCardEffectFrame?.effectId === "serpent_spear_attack") && motion?.type !== "lust-cost";
  const currentNotice = groupRootStageOwnsCopy
    ? action.ariaLabel
    : currentCard?.ariaLabel ?? action.publicNotice ?? action.ariaLabel;
  const announcementCopy = publicCardAnnouncementCopy(
    action,
    currentNotice,
    groupRootStageOwnsCopy ? sourceName : currentCard?.actorName ?? sourceName,
    groupRootStageOwnsCopy ? action.sourceId : currentCard?.actorId ?? action.sourceId,
    sourceName,
    targetName,
    compactPlayerNamesById,
    announcementEventId,
  );
  const negationNarration = action.publicNegationNarration;
  const negationNarrationOwnsCopy = publicNegationNarrationOwnsCopy(action);
  const committedFactCopy = publicCardCommittedFactCopy(action, announcementCopy);
  const interactionNarrationOwnsCopy = Boolean(action.publicInteractionNarration
    && committedFactCopy.message === action.publicInteractionNarration.headline);
  const dismantleFaceCopy = committedFactCopy.dismantleCardFace;
  const displayedAnnouncementEventId = dismantleFaceCopy?.settlementEventId
    ?? negationNarration?.eventId ?? action.publicInteractionNarration?.eventId ?? announcementEventId;
  const announcement = committedFactCopy.message;
  const compactAnnouncement = committedFactCopy.compactMessage;
  useEffect(() => {
    const settlementEventId = action.settlement?.eventId;
    if (!journeyEnabled || journey.scopeKey !== scopeKey || !allParked || !settlementEventId
      || notifiedSettlementEventIdRef.current === settlementEventId) return;
    notifiedSettlementEventIdRef.current = settlementEventId;
    onJourneySettled?.(settlementEventId);
  }, [action.settlement?.eventId, allParked, journeyEnabled, journey.scopeKey, onJourneySettled, scopeKey]);
  const ownershipCards = [
    ...journey.cards.filter((card) => card.phase !== "queued").map((card) => ({
    eventId: card.eventId,
    cardIds: (card.cardFaces ?? [card.cardFace]).map((face) => face.id).sort(),
    })),
  ].sort((left, right) => left.eventId.localeCompare(right.eventId));
  const ownershipCardsSignature = JSON.stringify(ownershipCards);
  const ownershipScopeKey = Boolean(sourceName) && journey.scopeKey === scopeKey
    && ownershipCards.length > 0
    ? [ownershipIdentity, scopeKey].join("\u001f")
    : null;
  const ownershipScopeGeneration = ownershipScopeKey ? [ownershipScopeKey, viewerId].join("\u001f") : null;
  const lastPublishedOwnershipRef = useRef<{ generation: string; signature: string } | null>(null);
  useLayoutEffect(() => {
    if (!ownershipScopeKey || !ownershipScopeGeneration) return;
    const previous = lastPublishedOwnershipRef.current;
    if (previous?.generation === ownershipScopeGeneration && previous.signature === ownershipCardsSignature) return;
    lastPublishedOwnershipRef.current = { generation: ownershipScopeGeneration, signature: ownershipCardsSignature };
    // Ownership is a semantic event/card fact. Geometry can temporarily be
    // pending without changing the Journey owner.
    onJourneyOwnershipChange?.(roomCode, ownershipIdentity, viewerId, ownershipScopeGeneration, true, ownershipCards);
  }, [onJourneyOwnershipChange, ownershipCards, ownershipCardsSignature, ownershipIdentity, ownershipScopeGeneration, ownershipScopeKey, roomCode, viewerId]);
  useLayoutEffect(() => {
    if (!ownershipScopeKey || !ownershipScopeGeneration) return;
    return () => {
      if (lastPublishedOwnershipRef.current?.generation !== ownershipScopeGeneration) return;
      lastPublishedOwnershipRef.current = null;
      onJourneyOwnershipChange?.(roomCode, ownershipIdentity, viewerId, ownershipScopeGeneration, false, []);
    };
  }, [onJourneyOwnershipChange, ownershipIdentity, ownershipScopeGeneration, ownershipScopeKey, roomCode, viewerId]);
  if (!journeyEnabled || !sourceName || journey.scopeKey !== scopeKey
    || !journey.center && !journey.framePlacementUnavailable && !primaryNonRevealTargetReady) return null;
  return <section
    className={`public-card-display public-card-display-journey${harvestPoolAboveRoot ? " is-harvest-pool-active" : ""}${historyOnly ? " is-harvest-history-passive" : ""}${showNegationChainOrdinals ? " is-negation-chain-ordinal" : ""}${action.settlement?.exiting || action.publicCounterRead?.exiting ? " is-exiting" : ""}${journey.suppressTransitions ? " is-reflowing" : ""}${journey.layoutPending ? " is-layout-pending" : ""}${viewerLayoutPending ? " is-viewer-layout-pending" : ""}`}
    data-public-card-display="true"
    data-public-card-renderer-kind="single-target-journey"
    data-public-card-ready="true"
    data-public-card-action-key={action.key}
    data-public-card-room-id={roomCode}
    data-public-card-interaction-id={action.interactionId ?? undefined}
    data-public-card-motion={motion?.type ?? "single-target"}
    data-public-card-kind={action.cardKind}
    data-public-card-viewer-id={viewerId}
    data-public-card-layout-pending={sharedStageLayoutPending || viewerLayoutPending ? "true" : "false"}
    data-public-card-effect-frame-placement={journey.framePlacementUnavailable ? "no-fit-awaiting-safe-geometry" : undefined}
    data-public-card-layout-viewer-id={journey.viewerId || undefined}
    data-public-card-harvest-active={harvestRootPoolVisible ? "true" : undefined}
    data-public-card-harvest-history-passive={historyOnly ? "true" : undefined}
    data-public-card-ordinal-context={showNegationChainOrdinals ? "negation-chain" : undefined}
    data-public-card-event-id={activeEventId}
    data-public-card-root-event-id={action.rootEventId}
    data-public-card-root-card-id={action.cardFace?.id}
    data-public-card-id={currentPublicCard?.id}
    data-public-card-actor-id={currentCard?.actorId ?? action.sourceId}
    data-public-card-source-id={action.sourceId}
    data-public-card-target-id={action.targetId ?? undefined}
    data-public-card-negation-outcome={(motion?.type === "negation" || showNegationChainOrdinals) && allParked ? action.settlement?.outcome : undefined}
    data-public-card-settlement-outcome={allParked ? action.settlement?.outcome : undefined}
    data-public-card-settlement-event-id={action.settlement?.eventId}
    data-public-card-settlement-source-zone={allParked ? action.settlement?.targetCardMovement?.sourceZone : undefined}
    data-public-card-settlement-destination-zone={allParked ? action.settlement?.targetCardMovement?.destinationZone : undefined}
    data-public-card-settlement-affected-card-owner-id={allParked ? action.settlement?.targetCardMovement?.affectedCardOwnerId ?? "none" : undefined}
    data-public-card-settlement-destination-owner-id={allParked ? action.settlement?.targetCardMovement?.destinationOwnerId ?? "none" : undefined}
    data-public-card-settlement-card-id={allParked ? publicSettlementCardFaceId(action, dismantleFaceCopy) : undefined}
  >
    {journey.cards.filter((card) => card.phase !== "queued").map((card) => {
      const isCurrent = card.eventId === activeEventId;
      const responseHistoryOwnedCardIds = responseHistoryOwnershipByEventId.get(card.eventId);
      const responseCardIds = card.cardFaces ?? [card.cardFace];
      const responseHistoryOwnershipAcknowledged = Boolean(responseHistoryOwnedCardIds
        && responseCardIds.length > 0
        && responseCardIds.every((face) => responseHistoryOwnedCardIds.has(face.id)));
      const responseHistoryOwnerPending = isBumperHarvest
        && card.role === "response"
        && responseHistoryEventIds.has(card.eventId)
        && !activeResponseEventIds.has(card.eventId)
        && !responseHistoryOwnershipAcknowledged;
      const singleTargetRoot = motion?.type === "single-target"
        && (action.cardKind === "Steal" || action.cardKind === "Dismantle")
        && card.role === "root"
        && card.eventId === action.rootEventId
        && card.actorId === action.sourceId
        && card.cardFace.id === action.cardFace?.id;
      const authorReservation = singleTargetRoot && card.parkingTargetViewerId === viewerId
        ? card.target
        : null;
      return <PublicJourneyCard
        key={card.eventId}
        card={card}
        sharedStageIdentity={{ roomId: roomCode, scopeId: action.rootEventId, interactionId: action.interactionId, viewerId }}
        visualPlacementUnavailable={Boolean(journey.framePlacementUnavailable
          && card.eventId === action.publicCardEffectFrame?.eventId && card.phase === "reveal")}
        parkingTargetKnown={!card.layoutPending}
        preservePendingParking={Boolean(singleTargetRoot && card.phase === "parked" && card.layoutPending
          && card.parkingTargetViewerId === viewerId && !viewerLayoutPending)}
        authorReservation={authorReservation}
        onInspectCard={historyOnly ? undefined : onInspectCard}
        size={card.rect.width < REVEAL_CARD.width ? "thumbnail" : "reveal"}
        className={`${isCurrent ? "is-current" : "is-prior"}${responseHistoryOwnerPending ? " is-response-history-owner-pending" : ""}`}
        primary={isCurrent}
        showOrdinal={showNegationChainOrdinals || isBumperHarvest && card.phase === "parked"}
        ordinalContext={showNegationChainOrdinals ? "negation-chain" : undefined}
        harvestHistory={isBumperHarvest}
        passive={historyOnly}
        harvestRootParked={(harvestRootPoolVisible || harvestChoiceActive && isBumperHarvest)
          && card.role === "root" && card.phase === "parked"}
        lustCostFrame={action.motion?.type === "lust-cost" && card.role === "root" ? action.lustCostFrame : undefined}
        publicCardEffectFrame={card.role === "root" && card.eventId === action.publicCardEffectFrame?.eventId
          ? action.publicCardEffectFrame : undefined}
        allowPendingVerifiedReveal={action.revealCompletionPolicy === "visible-hold"
          && action.publicCardEffectFrame?.effectId === "sima_yi_guicai"
          && action.publicCardEffectFrame.effectClass === "JUDGEMENT"
          && action.rootEventId === card.eventId && card.phase === "reveal"
          && action.cardFace?.id === card.cardFace.id
          && action.publicCardEffectFrame.eventId === card.eventId
          && action.publicCardEffectFrame.materials.length === 1
          && action.publicCardEffectFrame.materials[0]?.card.id === card.cardFace.id}
        parkedEffectLabel={card.actorId === viewerId ? card.parkedPublicEffect?.title : undefined}
      />;
    })}
    <ol className="duel-public-card-history-accessible" aria-label={showNegationChainOrdinals ? "Chronological Negation chain history" : "Chronological public card history"}>
      {incoming.map((event) => <li key={event.eventId} value={showNegationChainOrdinals || isBumperHarvest ? event.globalOrdinal : undefined}>
        {showNegationChainOrdinals
          ? `Negation chain step ${event.globalOrdinal}: ${event.ariaLabel}`
          : isBumperHarvest ? `Public card event ${event.globalOrdinal}: ${event.ariaLabel}` : event.ariaLabel}
      </li>)}
    </ol>
    {!historyOnly && !suppressAnnouncement && <PublicCardAnnouncement
      stagePrimaryEventId={harvestStagePrimaryEventId}
      h4Owner="PublicCardDisplay"
      h4PublicSequence={negationNarration?.publicSequence ?? action.publicInteractionNarration?.publicSequence}
      publicSequenceForEvent={publicSequenceForEvent}
      eventId={dismantleFaceCopy?.settlementEventId ?? negationNarration?.eventId ?? action.publicInteractionNarration?.eventId ?? (motion?.type === "lust-cost" && action.lustCostFrame ? action.lustCostFrame.activationEventId : announcementEventId)}
      pendingRevealIdentity={action.publicCardEffectFrame?.effectId === "sima_yi_guicai"
        && action.publicCardEffectFrame.effectClass === "JUDGEMENT"
        && action.publicCardEffectFrame.materials.length === 1
        && action.publicCardEffectFrame.eventId === activeCard?.eventId
        && action.publicCardEffectFrame.materials[0]?.card.id === activeCard?.cardFace.id
        && activeCard?.phase === "reveal"
        && displayedAnnouncementEventId === activeCard.eventId
        && action.rootEventId === activeCard.eventId
        && Boolean(action.interactionId)
        ? {
          roomId: roomCode,
          rootEventId: action.rootEventId,
          interactionId: action.interactionId!,
          eventId: activeCard.eventId,
          cardId: activeCard.cardFace.id,
          viewerId,
        }
        : undefined}
      eventCopyKey={publicCardAnnouncementCopyKey(
        action,
        displayedAnnouncementEventId,
        negationNarration?.actorId ?? action.publicInteractionNarration?.actorId ?? (groupRootStageOwnsCopy ? action.sourceId : currentCard?.actorId ?? action.sourceId),
        roomCode,
      )}
      announcementIdentity={action.publicAnnouncementIdentity}
      geometryKey={publicAnnouncementGeometryKey(roomCode, viewerId)}
      copyLifecycleStage={publicCardAnnouncementLifecycleStage(action)}
      placementKey={`${publicCardAnnouncementPlacementKey(action)}${harvestPoolVisible ? ":harvest-public-pool" : ""}`}
      viewerLayoutKey={harvestPoolVisible ? "public-harvest" : viewerId}
      anchorEventId={harvestPoolVisible || groupRootStageOwnsCopy
        ? null
        : dismantleFaceCopy ? activeEventId
          : publicEffectFrameOwnsAnnouncementAnchor ? null : activeEventId}
      phase={harvestPoolVisible || publicEffectFrameOwnsAnnouncementAnchor ? "static" : announcementAnchorCard?.phase ?? "static"}
      message={announcement}
      segments={committedFactCopy.segments}
      compactMessage={compactAnnouncement}
      accessibleLabel={committedFactCopy.accessibleLabel}
      dismantleCardFace={dismantleFaceCopy}
      supportingMessage={dismantleFaceCopy || !negationNarrationOwnsCopy ? undefined : negationNarration?.supportingMessage}
      compactSupportingMessage={dismantleFaceCopy || !negationNarrationOwnsCopy ? undefined : negationNarration?.compactSupportingMessage}
      presentationNarration={dismantleFaceCopy || !interactionNarrationOwnsCopy ? undefined : action.publicInteractionNarration}
      negationNarration={dismantleFaceCopy || !negationNarrationOwnsCopy ? undefined : negationNarration}
      fallbackCardRect={journey.framePlacementUnavailable ? null : harvestPoolVisible
        ? journey.center
      : motion?.type === "lust-cost" && journey.center
        ? battlefieldLustDuelAnnouncementAnchor(journey.center)
        : publicEffectFrameOwnsAnnouncementAnchor && journey.center && action.publicCardEffectFrame
          ? battlefieldPublicEffectFrame(journey.center, action.publicCardEffectFrame)
        : motion?.type === "group-root" && !groupRootCenterIsStillOccupied ? undefined : journey.center}
      phaseNotice={negationNarration || action.publicInteractionNarration ? undefined : action.phaseNotice}
      outcome={allParked ? action.settlement?.outcome : undefined}
      negationWaiting={Boolean(!dismantleFaceCopy && (negationNarration || !action.publicInteractionNarration && action.phaseNotice?.includes("NEGATION")))}
      stableCenterAnchor={motion?.type === "lust-cost"}
      keepCenterAnchorClear={publicEffectFrameOwnsAnnouncementAnchor && !journey.framePlacementUnavailable}
      stableHarvestAnchor={harvestPoolVisible}
      protectFirstParkedMiniature={protectFirstParkedMiniature}
      // The banner validates current-viewer geometry independently; thumbnail
      // parking must not hide this separately placeable public announcement.
      ignoreJourneyLayoutPending
      viewerGeometryReady={publicCopyViewerGeometryReady}
      preferredVerticalMode={harvestPoolVisible || publicEffectFrameOwnsAnnouncementAnchor ? "above" : motion?.type === "lust-cost" ? "below" : undefined}
    />}
  </section>;
}

type DuelJourneyEvent = Pick<JourneyCard,
  "eventId" | "actorId" | "actorName" | "cardFace" | "cardFaces" | "ariaLabel" | "publicNotice"
  | "publicNoticeSegments" | "publicNoticeCompact" | "publicCardEffectFrame" | "role" | "semanticLabel" | "globalOrdinal"
>;
type DuelJourneyPhase = "queued" | "reveal" | "move" | "parked";
type DuelJourneyCard = DuelJourneyEvent & {
  phase: DuelJourneyPhase;
  rect: CardRect;
  target: CardRect;
  parkingSide: SeatHistoryCardParking["side"];
  revealStartedAtMs: number | null;
  revealStartedAtIso: string | null;
  revealElapsedMs: number;
  revealRemainingMs: number;
  moveStartedAtMs: number | null;
  layoutPending: boolean;
  layoutChangeReason: string;
};
type DuelJourneyState = {
  scopeKey: string;
  viewerId: string;
  viewerSeat: number | null;
  cards: DuelJourneyCard[];
  center: CardRect | null;
  suppressTransitions: boolean;
  layoutPending: boolean;
};
type SingleTargetJourneyPhase = "queued" | "reveal" | "move" | "parked";
type SingleTargetJourneyCard = Omit<JourneyCard, "phase"> & {
  phase: SingleTargetJourneyPhase;
};
type SingleTargetJourneyState = {
  scopeKey: string;
  viewerId: string;
  harvestPoolReadOnly: boolean;
  showNegationChainOrdinals: boolean;
  cards: SingleTargetJourneyCard[];
  center: CardRect | null;
  suppressTransitions: boolean;
  layoutPending: boolean;
  framePlacementUnavailable?: boolean;
};

function duelJourneyEvents(action: PublicCardDisplayAction, sourceName: string | null): DuelJourneyEvent[] {
  const events: DuelJourneyEvent[] = [];
  if (action.cardFace && sourceName) events.push({
    eventId: action.rootEventId,
    actorId: action.sourceId,
    actorName: sourceName,
    cardFace: action.cardFace,
    cardFaces: [action.cardFace],
    ...(action.publicCardEffectFrame?.eventId === action.rootEventId ? { publicCardEffectFrame: action.publicCardEffectFrame } : {}),
    ...(action.publicNoticeEventId === action.rootEventId && action.publicNotice ? {
      publicNotice: action.publicNotice,
      ...(action.publicNoticeSegments ? { publicNoticeSegments: action.publicNoticeSegments } : {}),
      ...(action.publicNoticeCompact ? { publicNoticeCompact: action.publicNoticeCompact } : {}),
    } : {}),
    ariaLabel: action.ariaLabel,
    role: "root",
    globalOrdinal: 1,
  });
  for (const response of action.responses ?? []) {
    const cardFaces = response.cardFaces ?? (response.cardFace ? [response.cardFace] : []);
    if (!cardFaces.length || !Number.isInteger(response.ordinal) || !response.ordinal || response.ordinal < 1) continue;
    events.push({
      eventId: response.eventId,
      actorId: response.actorId,
      actorName: response.actorName,
      cardFace: cardFaces[0],
      cardFaces,
      ...(response.publicCardEffectFrame ? { publicCardEffectFrame: response.publicCardEffectFrame } : {}),
      ...(response.publicNotice ? { publicNotice: response.publicNotice } : {}),
      ...(response.publicNoticeSegments ? { publicNoticeSegments: response.publicNoticeSegments } : {}),
      ...(response.publicNoticeCompact ? { publicNoticeCompact: response.publicNoticeCompact } : {}),
      ariaLabel: response.ariaLabel,
      role: "response",
      globalOrdinal: response.ordinal + 1,
      ...(response.semanticLabel ? { semanticLabel: response.semanticLabel } : {}),
    });
  }
  return events.sort((a, b) => (a.globalOrdinal ?? 0) - (b.globalOrdinal ?? 0));
}

function duelParkingTargets(events: readonly DuelJourneyEvent[], existing: readonly DuelJourneyCard[] = []) {
  const priorById = new Map(existing.map((card) => [card.eventId, card]));
  const occupied: CardRect[] = [];
  const actorCounts = new Map<string, number>();
  const targets = new Map<string, SeatHistoryCardParking>();
  for (const event of events) {
    const previous = priorById.get(event.eventId);
    if (previous) {
      targets.set(event.eventId, { rect: previous.target, side: previous.parkingSide });
      occupied.push(previous.target);
      actorCounts.set(event.actorId, (actorCounts.get(event.actorId) ?? 0) + 1);
      continue;
    }
    const actorIndex = actorCounts.get(event.actorId) ?? 0;
    const target = seatHistoryCardParking(event.actorId, actorIndex, occupied);
    if (target) {
      targets.set(event.eventId, target);
      occupied.push(target.rect);
    }
    actorCounts.set(event.actorId, actorIndex + 1);
  }
  return targets;
}

function withFirstQueuedDuelReveal(cards: DuelJourneyCard[], center: CardRect, reason: string) {
  if (cards.some((card) => card.phase === "reveal" || card.phase === "move")) return cards;
  const next = cards.findIndex((card) => card.phase === "queued");
  if (next < 0) return cards;
  return cards.map((card, index) => index === next
    ? { ...card, phase: "reveal", rect: center, revealStartedAtMs: null, revealStartedAtIso: null, layoutChangeReason: reason }
    : card);
}

/**
 * A Duel's validated public event history is rendered once, with each card
 * parked in a fixed seat-front slot computed from its actual author anchor.
 */
function DuelCardJourney({
  action,
  enabled,
  suppressAnnouncement = false,
  retainHistoryDuringInspection = false,
  sourceName,
  targetName,
  compactPlayerNamesById,
  roomCode,
  viewerId,
  publicSequenceForEvent,
  viewerSeat,
  resultReadRemainingMs,
  onInspectCard,
  onJourneyEventParked,
}: {
  action: PublicCardDisplayAction;
  enabled: boolean;
  suppressAnnouncement?: boolean;
  retainHistoryDuringInspection?: boolean;
  sourceName: string | null;
  targetName: string | null;
  compactPlayerNamesById: CompactPublicPlayerNames;
  roomCode: string;
  viewerId: string;
  publicSequenceForEvent?: (eventId: string) => number | undefined;
  viewerSeat: number | null;
  resultReadRemainingMs: number | null;
  onInspectCard?: (card: Card, trigger: HTMLButtonElement) => void;
  onJourneyEventParked?: (eventId: string) => void;
}) {
  const scopeKey = action.motion?.type === "duel" || action.motion?.type === "lust-duel" ? action.motion.scopeKey : action.rootEventId;
  const [journey, setJourney] = useState<DuelJourneyState>({ scopeKey: "", viewerId: "", viewerSeat: null, cards: [], center: null, suppressTransitions: false, layoutPending: false });
  const [settledLustFrameViewerKey, setSettledLustFrameViewerKey] = useState("");
  const [expiredLustSettlementEventId, setExpiredLustSettlementEventId] = useState<string | null>(null);
  const [firstVisibleLustSettlement, setFirstVisibleLustSettlement] = useState<{ eventId: string; visibleAt: number } | null>(null);
  const journeyRef = useRef(journey);
  const journeyDisplayRef = useRef<HTMLElement | null>(null);
  const paintedLustSettlementRef = useRef<{ eventId: string; visibleAt: number } | null>(null);
  const actionRef = useRef(action);
  const sourceNameRef = useRef(sourceName);
  const mountedRef = useRef(false);
  const enabledRef = useRef(enabled);
  const documentVisibleRef = useRef(true);
  const [documentVisible, setDocumentVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  const traceSignaturesRef = useRef(new Map<string, string>());
  const parkedNotifiedEventIdsRef = useRef(new Set<string>());

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useLayoutEffect(() => {
    actionRef.current = action;
    sourceNameRef.current = sourceName;
  }, [action, sourceName]);

  useLayoutEffect(() => {
    journeyRef.current = journey;
  }, [journey]);
  useLayoutEffect(() => {
    enabledRef.current = enabled;
    documentVisibleRef.current = documentVisible;
  }, [enabled, documentVisible]);
  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    updateVisibility();
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);
  useEffect(() => {
    const settlement = action.motion?.type === "lust-duel" ? action.settlement : undefined;
    if (!settlement || !enabled || journey.scopeKey !== scopeKey) return;
    const display = journeyDisplayRef.current;
    if (!display) return;
    let firstFrame = 0;
    let secondFrame = 0;
    const copyIsPaintedVisible = () => {
      const copy = display.querySelector<HTMLElement>("[data-public-card-announcement='true']");
      if (!copy || display.dataset.publicCardSettlementEventId !== settlement.eventId
        || copy.dataset.publicCardAnnouncementPositioned !== "true"
        || copy.dataset.publicCardAnnouncementFallback === "true"
        || copy.dataset.publicCardResult !== settlement.outcome
        || document.visibilityState !== "visible") return false;
      for (let element: HTMLElement | null = copy; element; element = element.parentElement) {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility !== "visible" || Number(style.opacity) <= 0) return false;
        if (element === display) break;
      }
      const rect = copy.getBoundingClientRect();
      const table = display.closest<HTMLElement>(".play-table");
      const tableRect = table?.getBoundingClientRect();
      return Boolean(tableRect && rect.width > 0 && rect.height > 0
        && rect.right > tableRect.left && rect.left < tableRect.right
        && rect.bottom > tableRect.top && rect.top < tableRect.bottom);
    };
    const recordFirstPaint = () => {
      if (paintedLustSettlementRef.current?.eventId === settlement.eventId || !copyIsPaintedVisible()) return;
      const visibleAt = performance.now();
      const firstVisible = { eventId: settlement.eventId, visibleAt };
      paintedLustSettlementRef.current = firstVisible;
      setFirstVisibleLustSettlement(firstVisible);
      observer.disconnect();
    };
    const schedulePaintCheck = () => {
      if (firstFrame || secondFrame) return;
      firstFrame = window.requestAnimationFrame(() => {
        firstFrame = 0;
        secondFrame = window.requestAnimationFrame(() => {
          secondFrame = 0;
          recordFirstPaint();
        });
      });
    };
    const observer = new MutationObserver(schedulePaintCheck);
    observer.observe(display, {
      attributes: true,
      attributeFilter: ["class", "data-public-card-layout-pending", "data-public-card-announcement-positioned", "data-public-card-announcement-fallback", "data-public-card-result", "style"],
      childList: true,
      subtree: true,
    });
    schedulePaintCheck();
    document.addEventListener("visibilitychange", schedulePaintCheck);
    window.addEventListener("resize", schedulePaintCheck);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", schedulePaintCheck);
      window.removeEventListener("resize", schedulePaintCheck);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [action.motion?.type, action.settlement?.eventId, action.settlement?.outcome, enabled, journey.scopeKey, scopeKey]);
  useEffect(() => {
    const settlement = action.motion?.type === "lust-duel" ? action.settlement : undefined;
    const firstVisible = firstVisibleLustSettlement;
    if (!settlement || firstVisible?.eventId !== settlement.eventId
      || settlement.eventId === expiredLustSettlementEventId) return;
    const remainingMs = Math.max(0, 2000 - Math.max(0, performance.now() - firstVisible.visibleAt));
    const timer = window.setTimeout(() => setExpiredLustSettlementEventId(settlement.eventId), remainingMs);
    return () => window.clearTimeout(timer);
  }, [action.motion?.type, action.settlement?.eventId, expiredLustSettlementEventId, firstVisibleLustSettlement]);

  const incoming = duelJourneyEvents(action, sourceName);
  const responseSignature = incoming.map((event) => `${event.eventId}:${event.globalOrdinal ?? 0}:${event.publicCardEffectFrame?.eventId ?? ""}:${event.publicCardEffectFrame?.materials.map(({ card }) => card.id).join(",") ?? ""}`).join(";");
  const freshSignature = action.motion?.type === "duel" || action.motion?.type === "lust-duel" ? [...action.motion.freshEventIds].join(",") : "";
  const historyOnly = !enabled && retainHistoryDuringInspection;
  const journeyEnabled = enabled || historyOnly;
  useLayoutEffect(() => {
    const currentAction = actionRef.current;
    const currentMotion = currentAction.motion;
    const currentSourceName = sourceNameRef.current;
    if (!journeyEnabled || currentMotion?.type !== "duel" && currentMotion?.type !== "lust-duel" || !currentSourceName) return;

    const events = duelJourneyEvents(currentAction, currentSourceName);
    const fresh = new Set(currentMotion.freshEventIds);
    const latestFreshEvent = [...events].reverse().find((event) => fresh.has(event.eventId) && event.cardFace) ?? null;
    const latestFreshFrame = latestFreshEvent?.publicCardEffectFrame;
    const lustRootIsCurrent = latestFreshEvent?.role === "root"
      || (!latestFreshEvent && events.at(-1)?.role === "root");
    const center = latestFreshFrame
      ? battlefieldPublicEffectFrameCard(latestFreshFrame)
      : currentAction.publicCardEffectFrame && currentMotion.type === "lust-duel" && lustRootIsCurrent
      ? battlefieldPublicEffectFrameCard(currentAction.publicCardEffectFrame)
      : currentMotion.type === "lust-duel" && currentAction.lustCostFrame && lustRootIsCurrent
        ? battlefieldLustCostCard()
        : battlefieldCenterCard(DUEL_REVEAL_CARD);
    const previous = journeyRef.current;
    const sameInteraction = previous.scopeKey === scopeKey;
    const stationaryCenter = center ?? (sameInteraction ? previous.center : null);
    if (!stationaryCenter) return;
    const viewerChanged = sameInteraction && previous.viewerId !== viewerId;
    const preserveTargets = sameInteraction && !viewerChanged;
    const priorById = new Map(previous.cards.map((card) => [card.eventId, card]));
    const latestFreshEventId = latestFreshEvent?.eventId ?? null;
    const targets = duelParkingTargets(events, preserveTargets ? previous.cards : []);
    const measuredTargetEventIds = new Set(targets.keys());
    const cards = events.flatMap((event) => {
      const old = priorById.get(event.eventId);
      const target = targets.get(event.eventId) ?? {
        rect: old?.target ?? stationaryCenter,
        side: old?.parkingSide ?? "top" as const,
      };
      if (old && preserveTargets) {
        const updated: DuelJourneyCard = {
          ...old,
          actorName: event.actorName,
          cardFace: event.cardFace,
          cardFaces: event.cardFaces,
          ariaLabel: event.ariaLabel,
          publicNotice: event.publicNotice,
          publicNoticeSegments: event.publicNoticeSegments,
          publicNoticeCompact: event.publicNoticeCompact,
          publicCardEffectFrame: event.publicCardEffectFrame,
          semanticLabel: event.semanticLabel,
          globalOrdinal: event.globalOrdinal,
          layoutPending: old.phase === "parked" && !actorParkedCard(event.actorId),
        };
        if (latestFreshEventId && old.eventId !== latestFreshEventId && old.phase === "reveal") {
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const measuredTarget = actorParkedCard(event.actorId);
          const elapsed = old.revealStartedAtMs == null ? 0 : Math.max(0, performance.now() - old.revealStartedAtMs);
          return [{
            ...updated,
            phase: !measuredTarget || reducedMotion ? "parked" : "move",
            rect: target.rect,
            target: target.rect,
            parkingSide: target.side,
            revealStartedAtMs: null,
            revealElapsedMs: (old.revealElapsedMs ?? 0) + elapsed,
            moveStartedAtMs: !measuredTarget || reducedMotion ? null : performance.now(),
            revealRemainingMs: 0,
            layoutPending: !measuredTarget,
            layoutChangeReason: "interrupted-by-new-committed-response",
          }];
        }
        return [updated];
      }
      if (old && viewerChanged) {
        const phase: DuelJourneyPhase = old.phase === "move" ? "parked" : old.phase;
        const hasMeasuredTarget = measuredTargetEventIds.has(event.eventId);
        return [{
          ...event,
          phase,
          rect: phase === "parked" ? target.rect : phase === "reveal" ? stationaryCenter : old.rect,
          target: target.rect,
          parkingSide: target.side,
          revealStartedAtMs: old.revealStartedAtMs,
          revealStartedAtIso: old.revealStartedAtIso,
          revealElapsedMs: old.revealElapsedMs ?? 0,
          revealRemainingMs: old.revealRemainingMs,
          moveStartedAtMs: null,
          layoutPending: phase === "parked" && !hasMeasuredTarget,
          layoutChangeReason: "viewer-switch",
        }];
      }
      const phase = fresh.has(event.eventId) && event.eventId === latestFreshEventId ? "reveal" as const : "parked" as const;
      const hasMeasuredTarget = measuredTargetEventIds.has(event.eventId);
      return [{
        ...event,
        phase,
        rect: phase === "reveal" ? stationaryCenter : target.rect,
        target: target.rect,
        parkingSide: target.side,
        revealStartedAtMs: null,
        revealStartedAtIso: null,
        revealElapsedMs: 0,
        revealRemainingMs: STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
        moveStartedAtMs: null,
        layoutPending: phase === "parked" && !hasMeasuredTarget,
        layoutChangeReason: phase === "reveal" ? "public-event-committed" : viewerChanged ? "viewer-switch" : "public-event-restored",
      }];
    }).sort((a, b) => (a.globalOrdinal ?? 0) - (b.globalOrdinal ?? 0));
    const cardsWithReveal = viewerChanged ? cards : withFirstQueuedDuelReveal(cards, stationaryCenter, "public-event-committed");
    const layoutPending = cardsWithReveal.some((card) => card.layoutPending);
    const next: DuelJourneyState = {
      scopeKey,
      viewerId,
      viewerSeat,
      cards: cardsWithReveal,
      center: stationaryCenter,
      suppressTransitions: viewerChanged || previous.suppressTransitions || previous.layoutPending || layoutPending,
      layoutPending,
    };
    journeyRef.current = next;
    setJourney(next);
  }, [journeyEnabled, scopeKey, responseSignature, freshSignature, viewerId, viewerSeat]);

  const activeCard = journey.cards.find((card) => card.phase === "reveal")
    ?? [...journey.cards].reverse().find((card) => card.phase === "move")
    ?? null;
  const activeCardEventId = activeCard?.eventId ?? null;
  const activeCardPhase = activeCard?.phase ?? null;
  const activeCardRevealStartedAtMs = activeCard?.revealStartedAtMs ?? null;
  useEffect(() => {
    if (!enabled || !documentVisible || journey.scopeKey !== scopeKey || !activeCardEventId || activeCardPhase !== "reveal" || activeCardRevealStartedAtMs !== null) return;
    let lastFailureReason = "";
    const table = document.querySelector<HTMLElement>(".play-table");
    return observeUntilPublicCardFirstPaint(table, () => {
      let failureReason = "card-face-not-paint-enabled";
      const painted = hasPaintedLargePublicCard(activeCardEventId, DUEL_REVEAL_CARD, undefined, undefined,
        (reason) => { failureReason = reason; });
      if (!documentVisibleRef.current || document.visibilityState !== "visible") return false;
      if (!painted) {
        if (isAttackDodgeUxTraceActive() && failureReason !== lastFailureReason) {
          lastFailureReason = failureReason;
          recordAttackDodgeUxTrace("public-stage-reveal-first-paint", {
            reason: failureReason, eventId: activeCardEventId, timerStatus: "not-started", revealKind: "duel",
          });
        }
        return false;
      }
      const startedAtMs = performance.now();
      const startedAtIso = new Date().toISOString();
      setJourney((current) => {
        const card = current.cards.find((candidate) => candidate.eventId === activeCardEventId);
        if (current.scopeKey !== scopeKey || !card || card.phase !== "reveal" || card.revealStartedAtMs !== null) return current;
        const next = {
          ...current,
          cards: current.cards.map((candidate) => candidate.eventId === card.eventId
            ? { ...candidate, revealStartedAtMs: startedAtMs, revealStartedAtIso: startedAtIso, layoutChangeReason: "centre-card-presented" }
            : candidate),
        };
        journeyRef.current = next;
        return next;
      });
      if (isAttackDodgeUxTraceActive()) recordAttackDodgeUxTrace("public-stage-reveal-first-paint", {
        reason: "paint-enabled-clock-started", eventId: activeCardEventId, timerStatus: "start-requested", revealKind: "duel",
      });
      return true;
    });
  }, [enabled, documentVisible, scopeKey, journey.scopeKey, activeCardEventId, activeCardPhase, activeCardRevealStartedAtMs]);

  const timerEventId = activeCard?.eventId ?? null;
  const timerPhase = activeCard?.phase ?? null;
  const revealStartedAtMs = activeCard?.revealStartedAtMs ?? null;
  useEffect(() => {
    if (!enabled || !documentVisible || journey.scopeKey !== scopeKey || !timerEventId || timerPhase !== "reveal" || revealStartedAtMs === null) return;
    const activeCardSnapshot = journey.cards.find((card) => card.eventId === timerEventId);
    const delay = Math.max(0, (activeCardSnapshot?.revealRemainingMs ?? DUEL_REVEAL_HOLD_MS)
      - (performance.now() - revealStartedAtMs));
    const timer = window.setTimeout(() => {
      if (!mountedRef.current) return;
      setJourney((current) => {
        const card = current.cards.find((candidate) => candidate.eventId === timerEventId);
        if (current.scopeKey !== scopeKey || !card || card.phase !== "reveal") return current;
        const now = performance.now();
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const cards = current.cards.map((candidate) => candidate.eventId === timerEventId
          ? {
            ...candidate,
            phase: !reducedMotion && !current.layoutPending ? "move" as const : "parked" as const,
            rect: candidate.target,
            revealElapsedMs: (candidate.revealElapsedMs ?? 0) + Math.max(0, now - (candidate.revealStartedAtMs ?? now)),
            revealStartedAtMs: null,
            revealRemainingMs: 0,
            moveStartedAtMs: !reducedMotion && !current.layoutPending ? now : null,
            layoutChangeReason: current.layoutPending ? "reveal-complete-awaiting-seat-anchor"
              : reducedMotion ? "four-second-reveal-complete-reduced-motion" : "four-second-reveal-complete",
          }
          : candidate);
        const next = { ...current, cards };
        journeyRef.current = next;
        return next;
      });
    }, delay);
    return () => {
      window.clearTimeout(timer);
      const shouldPause = !enabledRef.current || !documentVisibleRef.current || document.visibilityState !== "visible";
      if (!shouldPause) return;
      const current = journeyRef.current;
      if (current.scopeKey !== scopeKey) return;
      const card = current.cards.find((candidate) => candidate.eventId === timerEventId);
      if (!card || card.phase !== "reveal" || card.revealStartedAtMs !== revealStartedAtMs) return;
      const elapsed = Math.max(0, performance.now() - revealStartedAtMs);
      const cards = current.cards.map((candidate) => candidate.eventId === timerEventId
        ? {
          ...candidate,
          revealStartedAtMs: null,
          revealElapsedMs: (candidate.revealElapsedMs ?? 0) + elapsed,
          revealRemainingMs: Math.max(0, (candidate.revealRemainingMs ?? DUEL_REVEAL_HOLD_MS) - elapsed),
        }
        : candidate);
      const next = { ...current, cards };
      journeyRef.current = next;
      if (mountedRef.current) setJourney(next);
    };
  }, [enabled, documentVisible, scopeKey, journey.scopeKey, timerEventId, timerPhase, revealStartedAtMs]);

  const duelMovingSignature = journey.cards.filter((card) => card.phase === "move")
    .map((card) => `${card.eventId}:${card.moveStartedAtMs ?? ""}`).join("|");
  useEffect(() => {
    if (!enabled || !documentVisible || journey.scopeKey !== scopeKey || !duelMovingSignature) return;
    const timers = journey.cards.filter((card) => card.phase === "move").map((card) => {
      const startedAt = card.moveStartedAtMs ?? performance.now();
      const delay = Math.max(0, MOVE_DURATION_MS - Math.max(0, performance.now() - startedAt));
      return window.setTimeout(() => {
        if (!mountedRef.current) return;
        setJourney((current) => {
          const moving = current.cards.find((candidate) => candidate.eventId === card.eventId);
          if (current.scopeKey !== scopeKey || !moving || moving.phase !== "move") return current;
          const cards = current.cards.map((candidate) => candidate.eventId === card.eventId
            ? { ...candidate, phase: "parked" as const, rect: candidate.target, moveStartedAtMs: null, layoutChangeReason: "380ms-seat-parking-complete" }
            : candidate);
          const next = { ...current, cards };
          journeyRef.current = next;
          return next;
        });
      }, delay);
    });
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      const shouldPark = !enabledRef.current || !documentVisibleRef.current || document.visibilityState !== "visible";
      if (!shouldPark) return;
      const current = journeyRef.current;
      if (current.scopeKey !== scopeKey || !current.cards.some((card) => card.phase === "move")) return;
      const cards = current.cards.map((card) => card.phase === "move"
        ? { ...card, phase: "parked" as const, rect: card.target, moveStartedAtMs: null, layoutChangeReason: "view-hidden-or-temporarily-disabled" }
        : card);
      const next = { ...current, cards };
      journeyRef.current = next;
      if (mountedRef.current) setJourney(next);
    };
  }, [enabled, documentVisible, duelMovingSignature, journey.scopeKey, journey.cards, scopeKey]);

  useEffect(() => {
    if (!enabled || journey.layoutPending || journey.scopeKey !== scopeKey) return;
    for (const card of journey.cards) {
      if (card.phase !== "parked" || parkedNotifiedEventIdsRef.current.has(card.eventId)) continue;
      parkedNotifiedEventIdsRef.current.add(card.eventId);
      onJourneyEventParked?.(card.eventId);
    }
  }, [enabled, journey.cards, journey.layoutPending, journey.scopeKey, onJourneyEventParked, scopeKey]);

  useLayoutEffect(() => {
    if (!journeyEnabled || journey.scopeKey !== scopeKey) return;
    let frame = 0;
    let attempts = 0;
    let stableFrames = 0;
    let previousLayout = "";
    const measureSettledLustFrame = () => {
      attempts += 1;
      const layoutElements = [
        document.querySelector<HTMLElement>(".play-table"),
        ...document.querySelectorAll<HTMLElement>("[data-player-anchor]"),
      ].filter((element): element is HTMLElement => Boolean(element));
      const layout = [window.innerWidth, window.innerHeight, ...layoutElements.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        return [rect.left, rect.top, rect.width, rect.height].map((value) => Math.round(value * 2) / 2);
      })].join(":");
      stableFrames = layout === previousLayout ? stableFrames + 1 : 0;
      previousLayout = layout;
      if ((layoutElements.length < 2 || stableFrames < 2) && attempts < 30) {
        frame = window.requestAnimationFrame(measureSettledLustFrame);
        return;
      }

      const currentAction = actionRef.current;
      const currentMotion = currentAction.motion;
      if (currentMotion?.type !== "lust-duel" || !currentAction.lustCostFrame) return;
      const events = duelJourneyEvents(currentAction, sourceNameRef.current);
      const fresh = new Set(currentMotion.freshEventIds);
      const latestFreshEvent = [...events].reverse().find((event) => fresh.has(event.eventId) && event.cardFace);
      const lastEvent = events.at(-1);
      const currentRootEvent = latestFreshEvent?.role === "root"
        ? latestFreshEvent
        : !latestFreshEvent && lastEvent?.role === "root" ? lastEvent : null;
      if (!currentRootEvent) return;
      const center = currentAction.publicCardEffectFrame
        ? battlefieldPublicEffectFrameCard(currentAction.publicCardEffectFrame)
        : battlefieldLustCostCard();
      setSettledLustFrameViewerKey(`${scopeKey}:${viewerId}`);
      setJourney((current) => {
        if (current.scopeKey !== scopeKey || !current.cards.some((card) => card.eventId === currentRootEvent.eventId && card.phase === "reveal")) return current;
        if (current.center && cardRectsMatch(current.center, center)) return current;
        const cards = current.cards.map((card) => card.eventId === currentRootEvent.eventId && card.phase === "reveal"
          ? { ...card, rect: center, layoutChangeReason: "settled-lust-cost-frame-layout" }
          : card);
        const next = { ...current, center, cards, suppressTransitions: true };
        journeyRef.current = next;
        return next;
      });
    };
    frame = window.requestAnimationFrame(measureSettledLustFrame);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [action.lustCostFrame?.activationEventId, action.motion?.type, journeyEnabled, freshSignature, journey.scopeKey, scopeKey, viewerId]);

  useLayoutEffect(() => {
    if (!journeyEnabled || journey.scopeKey !== scopeKey) return;
    let resizeFrame = 0;
    let sampledFrames = 0;
    let stableFrames = 0;
    let layoutRun = 0;
    let previousLayout = "";
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    const observedElements = new WeakSet<Element>();
    let committedLayoutSignature = "";
    const readLayoutSignature = () => {
      const elements = [
        document.querySelector<HTMLElement>(".play-table"),
        document.querySelector<HTMLElement>(".player-board"),
        document.querySelector<HTMLElement>(".local-player-dock"),
        ...document.querySelectorAll<HTMLElement>("[data-player-anchor]"),
      ].filter((element): element is HTMLElement => Boolean(element));
      const table = elements.find((element) => element.matches(".play-table")) ?? null;
      const coordinates = table ? publicStageCoordinateSpaceForTable(table) : null;
      return [table?.clientWidth ?? 0, table?.clientHeight ?? 0,
        ...elements.flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const local = coordinates ? publicStageRectToTableLocal(rect, coordinates) : null;
          const geometry = local ?? rect;
          return [element.dataset.playerAnchor ?? "", element.className,
            geometry.left, geometry.top, geometry.right, geometry.bottom]
            .map((value) => typeof value === "number" ? Math.round(value * 2) / 2 : value);
        })].join(":");
    };
    committedLayoutSignature = readLayoutSignature();
    const observeLayout = () => {
      const elements = [
        document.querySelector<HTMLElement>(".play-table"),
        document.querySelector<HTMLElement>(".player-board"),
        document.querySelector<HTMLElement>(".local-player-dock"),
        ...document.querySelectorAll<HTMLElement>("[data-player-anchor]"),
      ];
      for (const element of elements) {
        if (!element || observedElements.has(element)) continue;
        observedElements.add(element);
        resizeObserver?.observe(element);
      }
    };
    const markLayoutPending = () => setJourney((current) => {
      if (current.scopeKey !== scopeKey || current.layoutPending) return current;
      const next: DuelJourneyState = {
        ...current,
        suppressTransitions: true,
        layoutPending: true,
        cards: current.cards.map((card) => card.phase === "move"
          ? { ...card, phase: "parked", rect: card.target, moveStartedAtMs: null, layoutPending: true, layoutChangeReason: "layout-epoch-pending" }
          : card.phase === "parked" ? { ...card, layoutPending: true, layoutChangeReason: "layout-epoch-pending" } : card),
      };
      journeyRef.current = next;
      return next;
    });
    const repositionAfterLayoutSettles = () => {
      const requestedSignature = readLayoutSignature();
      if (requestedSignature === committedLayoutSignature) return;
      committedLayoutSignature = requestedSignature;
      const currentLayoutRun = ++layoutRun;
      window.cancelAnimationFrame(resizeFrame);
      sampledFrames = 0;
      stableFrames = 0;
      previousLayout = "";
      markLayoutPending();
      const measure = () => {
        if (currentLayoutRun !== layoutRun) return;
        sampledFrames += 1;
        const signature = readLayoutSignature();
        stableFrames = signature === previousLayout ? stableFrames + 1 : 0;
        previousLayout = signature;
        if (stableFrames < 2 && sampledFrames < 120) {
          resizeFrame = window.requestAnimationFrame(measure);
          return;
        }
        resizeFrame = 0;
        committedLayoutSignature = signature;
        const currentAction = actionRef.current;
        const currentMotion = currentAction.motion;
        const events = duelJourneyEvents(currentAction, sourceNameRef.current);
        const fresh = new Set(currentMotion?.type === "duel" || currentMotion?.type === "lust-duel" ? currentMotion.freshEventIds : []);
        const latestFreshEvent = [...events].reverse().find((event) => fresh.has(event.eventId) && event.cardFace) ?? null;
        const latestFreshFrame = latestFreshEvent?.publicCardEffectFrame;
        const lustRootIsCurrent = latestFreshEvent?.role === "root"
          || (!latestFreshEvent && events.at(-1)?.role === "root");
        const center = latestFreshFrame
          ? battlefieldPublicEffectFrameCard(latestFreshFrame)
          : currentAction.publicCardEffectFrame && currentMotion?.type === "lust-duel" && lustRootIsCurrent
          ? battlefieldPublicEffectFrameCard(currentAction.publicCardEffectFrame)
          : currentMotion?.type === "lust-duel" && currentAction.lustCostFrame && lustRootIsCurrent
            ? battlefieldLustCostCard()
            : battlefieldCenterCard(DUEL_REVEAL_CARD);
        const targets = duelParkingTargets(events);
        setJourney((current) => {
          if (current.scopeKey !== scopeKey || currentLayoutRun !== layoutRun) return current;
          const cards = current.cards.map((card) => {
            const target = targets.get(card.eventId);
            const phase = card.phase === "move" ? "parked" as const : card.phase;
            return {
              ...card,
              phase,
              target: target?.rect ?? card.target,
              parkingSide: target?.side ?? card.parkingSide,
              rect: phase === "reveal" ? center : phase === "parked" && target ? target.rect : card.rect,
              moveStartedAtMs: phase === "parked" ? null : card.moveStartedAtMs,
              layoutPending: phase === "parked" && !target,
              layoutChangeReason: "viewport-or-seat-anchor-reflow",
            };
          });
          const layoutPending = cards.some((card) => card.layoutPending);
          const next: DuelJourneyState = { ...current, cards, center, suppressTransitions: true, layoutPending };
          journeyRef.current = next;
          return next;
        });
        if (currentLayoutRun === layoutRun && sampledFrames < 120 && events.some((event) => !targets.has(event.eventId))) {
          resizeFrame = window.requestAnimationFrame(measure);
        }
      };
      resizeFrame = window.requestAnimationFrame(measure);
    };
    resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(repositionAfterLayoutSettles);
    observeLayout();
    const shell = document.querySelector<HTMLElement>(".game-shell");
    mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver((records) => {
      const hasAnchorChange = records.some((record) => record.type === "attributes"
        || [...record.addedNodes, ...record.removedNodes].some((node) => node instanceof Element
          && (node.matches("[data-player-anchor]") || Boolean(node.querySelector("[data-player-anchor]")))));
      if (!hasAnchorChange) return;
      observeLayout();
      repositionAfterLayoutSettles();
    });
    if (shell) mutationObserver?.observe(shell, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-player-anchor"] });
    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.cancelAnimationFrame(resizeFrame);
    };
  }, [journeyEnabled, journey.scopeKey, scopeKey]);

  useEffect(() => {
    if (!journey.suppressTransitions || journey.layoutPending || journey.scopeKey !== scopeKey) return;
    const frame = window.requestAnimationFrame(() => setJourney((current) => {
      if (current.scopeKey !== scopeKey || current.layoutPending || !current.suppressTransitions) return current;
      const next = { ...current, suppressTransitions: false };
      journeyRef.current = next;
      return next;
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [journey.layoutPending, journey.suppressTransitions, journey.scopeKey, scopeKey]);

  const latestResponse = action.responses?.at(-1) ?? null;
  const activeEvent = activeCard
    ?? [...journey.cards].reverse().find((card) => card.phase !== "queued")
    ?? journey.cards.find((card) => card.eventId === action.rootEventId)
    ?? null;
  const activeEventId = activeEvent?.eventId ?? action.rootEventId;
  const activePublicEffectFrame = activeEvent?.publicCardEffectFrame
    ?? (activeEventId === action.publicCardEffectFrame?.eventId ? action.publicCardEffectFrame : undefined);
  const announcementEventId = activePublicEffectFrame ? activeEventId : action.publicNoticeEventId ?? activeEventId;
  const currentPublicCard = activeEvent?.cardFace ?? latestResponse?.cardFace ?? action.cardFace ?? null;
  const activeActorId = activeEvent?.actorId ?? latestResponse?.actorId ?? action.sourceId;
  const activeMessage = activeEvent?.publicNotice ?? activeEvent?.ariaLabel ?? latestResponse?.publicNotice ?? latestResponse?.ariaLabel ?? action.publicNotice ?? action.ariaLabel;
  const activeAnnouncementAction = activePublicEffectFrame ? {
    ...action,
    publicCardEffectFrame: activePublicEffectFrame,
    publicNotice: activeEvent?.publicNotice ?? latestResponse?.publicNotice ?? activeMessage,
    publicNoticeSegments: activeEvent?.publicNoticeSegments ?? latestResponse?.publicNoticeSegments,
    publicNoticeCompact: activeEvent?.publicNoticeCompact ?? latestResponse?.publicNoticeCompact,
    publicNoticeEventId: activeEventId,
    ariaLabel: activeMessage,
    publicInteractionNarration: action.publicInteractionNarration?.eventId === activeEventId
      ? action.publicInteractionNarration : undefined,
  } : action;
  const announcementCopy = publicCardAnnouncementCopy(activeAnnouncementAction, activeMessage, activeEvent?.actorName ?? latestResponse?.actorName ?? sourceName, activeActorId, sourceName, targetName, compactPlayerNamesById, announcementEventId);
  const negationNarration = action.publicNegationNarration;
  const committedFactCopy = publicCardCommittedFactCopy(activeAnnouncementAction, announcementCopy);
  const announcement = committedFactCopy.message;
  const compactAnnouncement = committedFactCopy.compactMessage;
  const parkedHistoryCards = journey.cards.filter((card) => card.phase === "parked");
  const viewerLayoutPending = journey.scopeKey === scopeKey && journey.viewerId !== viewerId;

  useEffect(() => {
    if (!enabled || journey.scopeKey !== scopeKey) return;
    const record = () => {
      const elements = [...document.querySelectorAll<HTMLElement>("[data-public-card-journey-event-id]")];
      for (const card of journey.cards) {
        if (card.phase === "queued") continue;
        const element = elements.find((candidate) => candidate.dataset.publicCardJourneyEventId === card.eventId);
        const rect = element?.getBoundingClientRect();
        const actualRect = rect ? {
          left: Math.round(rect.left * 10) / 10,
          top: Math.round(rect.top * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        } : card.rect;
        const targetRect = {
          left: Math.round(card.target.left * 10) / 10,
          top: Math.round(card.target.top * 10) / 10,
          width: card.target.width,
          height: card.target.height,
        };
        const revealElapsedMs = Math.round((card.revealElapsedMs ?? 0) + (card.phase === "reveal" && card.revealStartedAtMs !== null
          ? Math.max(0, performance.now() - card.revealStartedAtMs)
          : 0));
        const signature = JSON.stringify([card.phase, actualRect, targetRect, viewerId, card.layoutChangeReason, card.revealStartedAtIso, revealElapsedMs]);
        if (traceSignaturesRef.current.get(card.eventId) === signature) continue;
        traceSignaturesRef.current.set(card.eventId, signature);
        recordAttackDodgeUxTrace("public-card-journey", {
          rendererKind: "duel-journey",
          motionType: action.motion?.type ?? null,
          interactionId: action.interactionId ?? null,
          rootEventId: action.rootEventId,
          rootFrameId: action.rootFrameId ?? null,
          checkpointId: action.checkpointId ?? null,
          presentationRevision: action.presentationRevision ?? null,
          revealDurationMs: DUEL_REVEAL_HOLD_MS,
          moveDurationMs: MOVE_DURATION_MS,
          eventId: card.eventId,
          publicActorId: card.actorId,
          publicViewerId: viewerId,
          publicCardId: card.cardFace.id,
          interactionTargetId: action.targetId,
          viewerSeat,
          cardKind: card.cardFace.kind,
          visualPhase: card.phase.toUpperCase(),
          actualCardRect: actualRect,
          targetParkingRect: targetRect,
          revealStartedAt: card.revealStartedAtIso,
          revealElapsedMs,
          layoutChangeReason: card.layoutChangeReason,
        });
      }
    };
    record();
    if (!journey.cards.some((card) => card.phase === "reveal" || card.phase === "move")) return;
    const interval = window.setInterval(record, 500);
    return () => window.clearInterval(interval);
  }, [action.targetId, enabled, scopeKey, journey.scopeKey, journey.cards, viewerId, viewerSeat]);

  const lustSettlementExpired = action.motion?.type === "lust-duel" && action.settlement
    && action.settlement.eventId === expiredLustSettlementEventId;
  const awaitingLustFrameLayout = action.motion?.type === "lust-duel" && Boolean(action.lustCostFrame)
    && incoming.at(-1)?.role === "root" && settledLustFrameViewerKey !== `${scopeKey}:${viewerId}`;
  if (!journeyEnabled || !sourceName || journey.scopeKey !== scopeKey
    || (!journey.center && !historyOnly)
    || lustSettlementExpired && !historyOnly
    || awaitingLustFrameLayout && !historyOnly) return null;

  if (historyOnly) {
    if (!parkedHistoryCards.length) return null;
    const latestParkedCard = parkedHistoryCards.at(-1)!;
    return <section
      className={`public-card-display public-card-display-journey is-duel-inspection-history${journey.suppressTransitions ? " is-reflowing" : ""}${journey.layoutPending ? " is-layout-pending" : ""}${viewerLayoutPending ? " is-viewer-layout-pending" : ""}`}
      data-public-card-display="true"
      data-public-card-renderer-kind="duel-journey"
      data-public-card-ready="true"
      data-public-card-inspection-history="true"
      data-public-card-motion={action.motion?.type === "lust-duel" ? "lust-duel" : "duel"}
      data-public-card-viewer-id={viewerId}
      data-public-card-layout-viewer-id={journey.viewerId || undefined}
      data-public-card-layout-pending={journey.layoutPending || viewerLayoutPending ? "true" : "false"}
      data-public-card-interaction-id={action.interactionId ?? undefined}
      data-public-card-root-frame-id={action.rootFrameId ?? undefined}
      data-public-card-checkpoint-id={action.checkpointId ?? undefined}
      data-public-card-presentation-revision={action.presentationRevision ?? undefined}
      data-public-card-event-id={latestParkedCard.eventId}
      data-public-card-root-event-id={action.rootEventId}
      data-public-card-id={latestParkedCard.cardFace.id}
      data-public-card-actor-id={latestParkedCard.actorId}
      data-public-card-source-id={action.sourceId}
      data-public-card-target-id={action.targetId ?? undefined}
      data-public-card-inspection-history-count={parkedHistoryCards.length}
    >
      {parkedHistoryCards.map((card) => <PublicJourneyCard
        key={card.eventId}
        card={card}
        size="thumbnail"
        className={`public-card-duel-parked-card is-inspection-history-card ${card.role === "root" ? "is-duel-root" : "is-duel-response"}`}
        parkingSide={card.parkingSide}
        showOrdinal
        ordinalContext="duel"
        lustCostFrame={action.motion?.type === "lust-duel" && card.role === "root" ? action.lustCostFrame : undefined}
        publicCardEffectFrame={card.publicCardEffectFrame
          ?? (card.role === "root" && card.eventId === action.publicCardEffectFrame?.eventId ? action.publicCardEffectFrame : undefined)}
      />)}
      <ol className="duel-public-card-history-accessible" aria-label="Chronological Duel card history">
        {parkedHistoryCards.map((card, index) => <li key={card.eventId} value={card.globalOrdinal ?? index + 1}>
          Duel event {card.globalOrdinal ?? index + 1}: {card.ariaLabel}
        </li>)}
      </ol>
    </section>;
  }

  return <section
    ref={journeyDisplayRef}
    className={`public-card-display public-card-display-journey${action.settlement?.exiting || action.publicCounterRead?.exiting ? " is-exiting" : ""}${journey.suppressTransitions ? " is-reflowing" : ""}${journey.layoutPending ? " is-layout-pending" : ""}${viewerLayoutPending ? " is-viewer-layout-pending" : ""}`}
    data-public-card-display="true"
    data-public-card-renderer-kind="duel-journey"
    data-public-card-ready="true"
    data-public-card-motion={action.motion?.type === "lust-duel" ? "lust-duel" : "duel"}
    data-public-card-has-activity-message={action.publicActivityMessage ? "true" : undefined}
    data-public-card-viewer-id={viewerId}
    data-public-card-layout-viewer-id={journey.viewerId || undefined}
    data-public-card-layout-pending={journey.layoutPending || viewerLayoutPending ? "true" : "false"}
    data-public-card-interaction-id={action.interactionId ?? undefined}
    data-public-card-root-frame-id={action.rootFrameId ?? undefined}
    data-public-card-checkpoint-id={action.checkpointId ?? undefined}
    data-public-card-presentation-revision={action.presentationRevision ?? undefined}
    data-public-card-event-id={activeEventId}
    data-public-card-root-event-id={action.rootEventId}
    data-public-card-id={currentPublicCard?.id}
    data-public-card-actor-id={activeActorId}
    data-public-card-source-id={action.sourceId}
    data-public-card-target-id={action.targetId ?? undefined}
    data-public-card-settlement-event-id={action.settlement?.eventId}
    data-public-card-settlement-outcome={action.settlement?.outcome}
    data-public-card-result-remaining-ms={action.settlement?.readRemainingMs ?? resultReadRemainingMs ?? undefined}
  >
    {journey.cards.filter((card) => card.phase !== "queued").map((card) => <PublicJourneyCard
      key={card.eventId}
      card={card}
      sharedStageIdentity={{ roomId: roomCode, scopeId: action.rootEventId, interactionId: action.interactionId, viewerId }}
      onInspectCard={onInspectCard}
      size={card.phase === "reveal" || card.phase === "move" && card.rect.width >= DUEL_REVEAL_CARD.width ? "duel-reveal" : "thumbnail"}
      className={`public-card-duel-parked-card ${card.phase === "parked" && card.eventId !== activeEventId ? "is-prior" : ""} ${card.eventId === activeEventId ? "is-current" : ""} ${card.role === "root" ? "is-duel-root" : "is-duel-response"}`}
      primary={card.eventId === activeEventId}
      parkingSide={card.parkingSide}
      showOrdinal
      ordinalContext="duel"
      lustCostFrame={action.motion?.type === "lust-duel" && card.role === "root" ? action.lustCostFrame : undefined}
      publicCardEffectFrame={card.publicCardEffectFrame
        ?? (card.role === "root" && card.eventId === action.publicCardEffectFrame?.eventId ? action.publicCardEffectFrame : undefined)}
    />)}
    <ol className="duel-public-card-history-accessible" aria-label="Chronological Duel card history">
      {incoming.map((event) => <li key={event.eventId} value={event.globalOrdinal}>
        Duel event {event.globalOrdinal}: {event.ariaLabel}
      </li>)}
    </ol>
    {!suppressAnnouncement && !action.suppressAnnouncement && <PublicCardAnnouncement
      eventId={negationNarration?.eventId ?? action.publicInteractionNarration?.eventId ?? (action.motion?.type === "lust-duel" && announcementEventId === action.rootEventId && activeCard?.role === "root" && action.lustCostFrame
        ? action.lustCostFrame.activationEventId : announcementEventId)}
      h4Owner="PublicCardDisplay"
      h4PublicSequence={negationNarration?.publicSequence ?? activeAnnouncementAction.publicInteractionNarration?.publicSequence}
      publicSequenceForEvent={publicSequenceForEvent}
      eventCopyKey={publicCardAnnouncementCopyKey(
        activeAnnouncementAction,
        negationNarration?.eventId ?? action.publicInteractionNarration?.eventId ?? (action.motion?.type === "lust-duel" && announcementEventId === action.rootEventId && activeCard?.role === "root" && action.lustCostFrame
          ? action.lustCostFrame.activationEventId : announcementEventId),
        negationNarration?.actorId ?? action.publicInteractionNarration?.actorId ?? activeActorId,
        roomCode,
      )}
      announcementIdentity={action.publicAnnouncementIdentity}
      geometryKey={publicAnnouncementGeometryKey(roomCode, viewerId)}
      copyLifecycleStage={publicCardAnnouncementLifecycleStage(activeAnnouncementAction)}
      // A new public response card needs a freshly measured H4 position. Reusing
      // the order caption's band can trap a longer response copy against the
      // newly centred card and hide it on short phones.
      placementKey={`${publicCardAnnouncementPlacementKey(activeAnnouncementAction)}${action.motion?.type === "lust-duel" || activePublicEffectFrame ? `:${activeEventId}` : ""}`}
      viewerLayoutKey={viewerId}
      anchorEventId={announcementEventId}
      phase={activeEvent?.phase ?? "static"}
      message={announcement}
      segments={committedFactCopy.segments}
      compactMessage={compactAnnouncement}
      accessibleLabel={committedFactCopy.accessibleLabel}
      supportingMessage={negationNarration?.supportingMessage}
      compactSupportingMessage={negationNarration?.compactSupportingMessage}
      presentationNarration={negationNarration ? undefined : activeAnnouncementAction.publicInteractionNarration}
      negationNarration={negationNarration}
      fallbackCardRect={activePublicEffectFrame && journey.center
        ? battlefieldPublicEffectFrame(journey.center, activePublicEffectFrame)
        : action.motion?.type === "lust-duel" && action.lustCostFrame
          ? battlefieldLustDuelAnnouncementAnchor(journey.center) : journey.center}
      phaseNotice={negationNarration || activeAnnouncementAction.publicInteractionNarration ? undefined : action.phaseNotice}
      outcome={action.settlement?.outcome}
      negationWaiting={Boolean(negationNarration || !action.publicInteractionNarration && action.phaseNotice?.includes("NEGATION"))}
      stableCenterAnchor={action.motion?.type === "lust-duel" || Boolean(activePublicEffectFrame)}
      keepCenterAnchorClear={action.motion?.type === "duel" || Boolean(activePublicEffectFrame)}
      protectFirstParkedMiniature={action.motion?.type === "duel"}
      preferredVerticalMode={activePublicEffectFrame ? "above" : action.motion?.type === "lust-duel" ? "below" : undefined}
      ignoreJourneyLayoutPending
      clearCenterAnchorWhenParked={action.motion?.type === "duel" && (action.publicNoticeEventId !== undefined || Boolean(activePublicEffectFrame))}
    />}
  </section>;
}

export function publicCardActionKey(action: PresentationSnapshotRootAction): string {
  return [action.interactionId, action.rootFrameId, action.checkpointId, action.presentationRevision, action.rootEventId, action.sourceId, action.targetId].join(":");
}

export function PublicCardDisplay({
  action,
  enabled,
  suppressAnnouncement = false,
  retainHarvestHistory = false,
  retainDuelHistoryDuringInspection = false,
  protectFirstParkedMiniature = false,
  harvestChoiceActive = false,
  harvestPoolReadOnly = false,
  sourceName,
  targetName,
  compactPlayerNamesById,
  roomCode,
  viewerId,
  publicSequenceForEvent,
  viewerSeat,
  resultReadRemainingMs = null,
  responseHistoryOwnership = [],
  onInspectCard,
  onJourneyEventParked,
  onJourneyRevealCompleted,
  onJourneySettled,
  onJourneyOwnershipChange,
}: {
  action: PublicCardDisplayAction | null;
  enabled: boolean;
  suppressAnnouncement?: boolean;
  retainHarvestHistory?: boolean;
  retainDuelHistoryDuringInspection?: boolean;
  protectFirstParkedMiniature?: boolean;
  harvestChoiceActive?: boolean;
  harvestPoolReadOnly?: boolean;
  sourceName: string | null;
  targetName: string | null;
  compactPlayerNamesById: CompactPublicPlayerNames;
  roomCode: string;
  viewerId: string;
  publicSequenceForEvent?: (eventId: string) => number | undefined;
  viewerSeat: number | null;
  resultReadRemainingMs?: number | null;
  responseHistoryOwnership?: readonly { eventId: string; cardIds: readonly string[] }[];
  onInspectCard?: (card: Card, trigger: HTMLButtonElement) => void;
  onJourneyEventParked?: (eventId: string, equipmentClaim?: NonNullable<PublicCardDisplayAction["zoneTransition"]>) => void;
  onJourneyRevealCompleted?: (eventId: string, physicalCardId: string) => void;
  onJourneySettled?: (settlementEventId: string) => void;
  onJourneyOwnershipChange?: (
    roomCode: string,
    actionKey: string,
    ownerViewerId: string,
    scopeGeneration: string,
    ready: boolean,
    cards: readonly { eventId: string; cardIds: readonly string[] }[],
  ) => void;
}) {
  if (!action) return null;
  if (action.motion?.type === "attack-dodge") {
    return <AttackDodgeCardJourney action={action} enabled={enabled} sourceName={sourceName} targetName={targetName} compactPlayerNamesById={compactPlayerNamesById} roomCode={roomCode} viewerId={viewerId} publicSequenceForEvent={publicSequenceForEvent} resultReadRemainingMs={resultReadRemainingMs} onInspectCard={onInspectCard} onJourneyEventParked={onJourneyEventParked} />;
  }
  if (action.motion?.type === "single-target" || action.motion?.type === "negation"
    || action.motion?.type === "group-root" || action.motion?.type === "lust-cost"
    || action.motion?.type === "zone-transition") {
    return <SingleTargetCardJourney action={action} enabled={enabled} suppressAnnouncement={suppressAnnouncement || action.suppressAnnouncement === true} retainHarvestHistory={retainHarvestHistory} protectFirstParkedMiniature={protectFirstParkedMiniature} responseHistoryOwnership={responseHistoryOwnership} harvestChoiceActive={harvestChoiceActive} harvestPoolReadOnly={harvestPoolReadOnly} sourceName={sourceName} targetName={targetName} compactPlayerNamesById={compactPlayerNamesById} roomCode={roomCode} viewerId={viewerId} publicSequenceForEvent={publicSequenceForEvent} onInspectCard={onInspectCard} onJourneySettled={onJourneySettled} onJourneyEventParked={onJourneyEventParked} onJourneyRevealCompleted={onJourneyRevealCompleted} onJourneyOwnershipChange={onJourneyOwnershipChange} />;
  }
  if (action.motion?.type === "duel" || action.motion?.type === "lust-duel") {
    return <DuelCardJourney action={action} enabled={enabled} suppressAnnouncement={suppressAnnouncement || action.suppressAnnouncement === true} retainHistoryDuringInspection={retainDuelHistoryDuringInspection} sourceName={sourceName} targetName={targetName} compactPlayerNamesById={compactPlayerNamesById} roomCode={roomCode} viewerId={viewerId} viewerSeat={viewerSeat} resultReadRemainingMs={resultReadRemainingMs} publicSequenceForEvent={publicSequenceForEvent} onInspectCard={onInspectCard} onJourneyEventParked={onJourneyEventParked} />;
  }
  return null;
}
