"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Card, CardKind } from "../game/model";
import type { PresentationSnapshotPublicCardEffect, PresentationSnapshotRootAction } from "../game/presentation-snapshot";
import type { PresentationTargetCardSettlementMovement } from "../game/presentation-v2";
import { publicCardEffectFrameLayout } from "../game/public-card-effect-frame-layout";
import { cardDefinition } from "../game/cards";
import { publicAnnouncementEventCopyKey as buildPublicAnnouncementEventCopyKey, publicAnnouncementGeometryIdentity, publicAnnouncementGeometryKey, transitionPublicAnnouncementCopyLifecycle, type PublicAnnouncementCopyLifecycle, type PublicAnnouncementProtectedGeometry, type PublicAnnouncementSeatGeometry } from "../game/public-announcement";
import { compactLustDuelAttackMessage } from "./lust-public-copy";
import { CardFace } from "./card-face";
import { recordAttackDodgeUxTrace } from "./attack-dodge-ux-trace";

type PublicCardDisplayResponseNode = {
  eventId: string;
  /** One-based order from the validated Duel or Negation response proof. */
  ordinal?: number;
  actorId: string;
  actorName: string;
  targetName?: string;
  cardFace?: Card;
  cardFaces?: readonly Card[];
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
};

export type PublicNegationNarration = {
  rootLabel: string;
  eventId: string;
  latestCommittedEventId?: string;
  checkpointId?: string;
  phase: "WINDOW_OPEN" | "FINAL";
  rootEffectState: "ACTIVE" | "BLOCKED";
  headline: string;
  compactHeadline: string;
  supportingMessage: string;
  compactSupportingMessage: string;
  accessibleLabel: string;
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
  sourceId: string;
  targetId: string | null;
  cardKind?: CardKind;
  cardLabel: string;
  ariaLabel: string;
  publicNotice?: string;
  publicNoticeCompact?: string;
  /** Keep a proved historical CardFace while retiring its active announcement. */
  suppressAnnouncement?: boolean;
  /** True only when this action was built from the fully validated public Negation-chain proof. */
  showNegationChainOrdinals?: boolean;
  /** Shared, read-only H4 explanation derived only from a proven public reaction chain. */
  publicNegationNarration?: PublicNegationNarration;
  /** Shared waiting label derived from the proven public LUST Duel actor. */
  publicActivityMessage?: string;
  /** Full accessible activity copy when a short stage label is shown visually. */
  publicActivityAccessibleMessage?: string;
  /** Public participant proven to be affected by the active Bumper Harvest Negation. */
  harvestEffectRecipient?: { participantId: string; participantName: string };
  motion?: PublicCardDisplayMotion;
  settlement?: {
    eventId: string;
    outcome: "SUITS_MATCHED" | "SUITS_DIFFERED" | "ATTACK_BLOCKED_BY_DODGE" | "ATTACK_DAMAGE_APPLIED" | "DISMANTLE_RESOLVED" | "STEAL_RESOLVED" | "GROUP_RESOLVED" | "BUMPER_HARVEST_RESOLVED" | "ROOT_CANCELLED" | "ROOT_RESTORED" | "LUST_DUEL_DAMAGE_APPLIED" | "LUST_DUEL_DAMAGE_PREVENTED";
    exiting: boolean;
    /** Server-derived remaining portion of a proof-backed public-card read, when supplied. */
    readRemainingMs?: number;
    /** Show the proven selected-card result only after its root journey has parked. */
    targetCardResultActive?: boolean;
    /** Per-viewer performance time when the selected card and result copy became readable. */
    targetCardResultReadStartedAtMs?: number;
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

type ViewerPrivateStealResult = {
  semantics: "PRIVATE_PROVEN";
  roomCode: string;
  eventId: string;
  rootEventId: string;
  rootResolutionId: string;
  sourceId: string;
  targetId: string;
  sourceZone: "hand";
  card: Card;
};

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
  effectId: string;
  effectClass: "COST" | "CONVERSION" | "EFFECT" | "JUDGEMENT";
  activationOwnerId: string;
  activationOwnerName: string;
  title: string;
  materials: readonly { card: Card; ownerId: string | null; ownerName?: string }[];
  accessibleLabel: string;
};

/** Converts the already-validated public snapshot proof into immutable renderer input. */
export function createPublicCardEffectFrameView(
  effect: PresentationSnapshotPublicCardEffect,
  copy: { title: string; accessibleLabel: string; activationOwnerName: string; ownerNamesById: Readonly<Record<string, string>> },
): PublicCardEffectFrameView | null {
  const classIsSupported = effect.effectClass === "COST" || effect.effectClass === "CONVERSION"
    || effect.effectClass === "EFFECT" || effect.effectClass === "JUDGEMENT";
  const cards = Array.isArray(effect.cards) ? effect.cards : [];
  const materials = Array.isArray(effect.materials) ? effect.materials : [];
  if (effect.semantics !== "PROVEN" || !effect.eventId || !effect.activationOwnerId || !classIsSupported
    || !copy.title.trim() || copy.title.length > 40 || !copy.accessibleLabel.trim() || copy.accessibleLabel.length > 240
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
    effectId: effect.effectId,
    effectClass: effect.effectClass,
    activationOwnerId: effect.activationOwnerId,
    activationOwnerName: copy.activationOwnerName,
    title: copy.title.trim(),
    materials: cards.map((card, index) => ({
      card,
      ownerId: materials[index].ownerId,
      ...(materials[index].ownerId ? { ownerName: copy.ownerNamesById[materials[index].ownerId!] } : {}),
    })),
    accessibleLabel: `${copy.title.trim()} ${effect.effectClass.toLowerCase()} frame. Material cards: ${materialsAccessibleLabel}. ${copy.accessibleLabel.trim()}`,
  };
}

/** A public, proof-backed event with no physical card face or card anchor. */
export type PublicSkillEventAnnouncement = {
  semantics: "PROVEN";
  kind: "SKILL_OUTCOME";
  eventId: string;
  rootEventId: string;
  sourceId: string;
  proofEventId: string;
  phase: "ACTIVATION" | "DRAWN";
  heading: string;
  message: string;
  exiting: boolean;
};

type CardRect = { left: number; top: number; width: number; height: number };
type JourneyCard = {
  eventId: string;
  actorId: string;
  actorName: string;
  cardFace: Card;
  cardFaces?: readonly Card[];
  ariaLabel: string;
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
  onInspectCard,
}: {
  card: JourneyCard;
  parkingTargetKnown?: boolean;
  preservePendingParking?: boolean;
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
  onInspectCard?: (card: Card, trigger: HTMLButtonElement) => void;
}) {
  const placementUnavailable = !parkingTargetKnown && card.phase === "parked" && !preservePendingParking;
  const inspectable = !placementUnavailable && !passive && card.phase === "parked" && Boolean(onInspectCard);
  const publicFrameAccessible = !placementUnavailable && Boolean(publicCardEffectFrame && card.phase !== "move");
  const frameMaterials = publicCardEffectFrame?.materials ?? [];
  const frameLayout = publicCardEffectFrame && typeof window !== "undefined"
    ? publicCardEffectFrameLayout(frameMaterials.length, window.innerWidth, window.innerHeight)
    : null;
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
    className={`public-card-journey-card ${card.phase === "reveal" ? "is-revealing" : ""} ${card.phase === "move" ? "is-moving" : "is-parked"} ${card.layoutPending ? "is-layout-pending" : ""} ${harvestHistory && card.phase === "parked" ? "is-harvest-history-parked" : ""} ${passive ? "is-harvest-history-passive" : ""} ${className} ${lustCostFrame ? "is-lust-cost" : ""} ${publicCardEffectFrame ? "is-public-effect-frame" : ""} ${inspectable ? "is-inspectable" : ""}`}
    disabled={!inspectable && !publicFrameAccessible}
    tabIndex={inspectable ? 0 : -1}
    aria-hidden={placementUnavailable ? true : inspectable || publicFrameAccessible ? undefined : true}
    aria-label={accessibleName}
    onClick={inspectable ? (event) => {
      const requestedCardId = (event.target as HTMLElement).closest<HTMLElement>("[data-public-card-effect-frame-card-id]")?.dataset.publicCardEffectFrameCardId;
      const inspectedCard = physicalCards.find((face) => face.id === requestedCardId) ?? card.cardFace;
      onInspectCard?.(inspectedCard, event.currentTarget);
    } : undefined}
    data-public-card-journey-event-id={card.eventId}
    data-public-card-journey-actor-id={card.actorId}
    data-public-card-journey-card-id={card.cardFace.id}
    data-public-card-journey-card-ids={(card.cardFaces ?? [card.cardFace]).map((face) => face.id).join(",")}
    data-public-card-journey-role={card.role}
    data-public-card-journey-preserve-authentic-position={preservePendingParking ? "true" : undefined}
    data-public-card-journey-author-reservation={authorReservation ? "true" : undefined}
    data-public-card-journey-author-reservation-left={authorReservation?.left}
    data-public-card-journey-author-reservation-top={authorReservation?.top}
    data-public-card-journey-author-reservation-width={authorReservation?.width}
    data-public-card-journey-author-reservation-height={authorReservation?.height}
    data-public-card-harvest-history-parked={harvestHistory && card.phase === "parked" ? "true" : undefined}
    data-public-card-compact-response={(harvestHistory || card.role === "response") && card.rect.width < PARKED_CARD.width ? "true" : undefined}
    data-harvest-root-parked={harvestRootParked ? "true" : undefined}
    data-public-card-journey-phase={card.phase}
    data-public-card-journey-size={size}
    data-public-card-journey-layout-pending={card.layoutPending ? "true" : "false"}
    data-public-card-journey-layout-reason={card.layoutChangeReason}
    data-public-card-journey-reveal-started-at={card.revealStartedAtIso ?? undefined}
    data-public-card-journey-target-left={parkingTargetKnown ? card.target.left : undefined}
    data-public-card-journey-target-top={parkingTargetKnown ? card.target.top : undefined}
    data-public-card-journey-target-width={parkingTargetKnown ? card.target.width : undefined}
    data-public-card-journey-target-height={parkingTargetKnown ? card.target.height : undefined}
    data-public-card-primary-card={primary ? "true" : undefined}
    data-public-card-journey-parking-side={parkingSide}
    data-public-card-journey-ordinal={card.globalOrdinal}
    data-public-card-inspectable={inspectable ? "true" : "false"}
    data-public-card-copy-anchor-event-id={card.eventId}
    style={{
      left: card.rect.left,
      top: card.rect.top,
      width: card.rect.width,
      height: card.rect.height,
      ["--public-card-journey-move-duration"]: `${Math.max(0, Math.round(card.moveRemainingMs ?? MOVE_DURATION_MS))}ms`,
      ...(placementUnavailable ? { visibility: "hidden", pointerEvents: "none" } : {}),
    } as CSSProperties}
  >
    {publicCardEffectFrame && frameLayout && card.phase !== "parked" && <span
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
      style={{
        left: -frameLayout.cardOffsetLeft,
        top: -frameLayout.cardOffsetTop,
        width: frameLayout.frameWidth,
        height: frameLayout.frameHeight,
        transform: `scale(${card.rect.width / REVEAL_CARD.width})`,
        transformOrigin: `${frameLayout.cardOffsetLeft}px ${frameLayout.cardOffsetTop}px`,
        opacity: card.phase === "move" ? 0 : 1,
      }}
    >
      <strong className="public-card-effect-frame-title public-card-lust-cost-frame-title">{publicCardEffectFrame.title}</strong>
      {frameMaterials.length > 1 && <small className="public-card-effect-frame-count">{frameMaterials.length} MATERIAL CARDS</small>}
      <span
        className="public-card-effect-frame-materials"
        data-public-card-frame-grid-columns={frameLayout.columns}
        style={{
          left: frameLayout.cardOffsetLeft,
          top: frameLayout.cardOffsetTop,
          width: frameLayout.gridWidth,
          height: frameLayout.gridHeight,
          gridTemplateColumns: `repeat(${frameLayout.columns}, minmax(0, 1fr))`,
          gridAutoRows: frameLayout.cardHeight,
          gap: frameLayout.gap,
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
    {publicCardEffectFrame && card.phase === "parked" && <small className="public-card-lust-cost-parked">{publicCardEffectFrame.title}</small>}
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
const PARKED_CARD = { width: 48, height: 72 };
const HARVEST_MOBILE_RESPONSE_CARD = { width: 32, height: 48 };
const PUBLIC_CARD_ANNOUNCEMENT_MAX_WIDTH = 520;
// Two 15px mobile lines at 1.2 line-height plus 4px vertical padding and
// borders. Used only before the mounted announcement can be measured.
const PUBLIC_CARD_ANNOUNCEMENT_HEIGHT = 46;
// A single 15px line plus mobile padding and borders, used to reserve a
// compact-copy position when the full sentence cannot fit above the card.
const COMPACT_PUBLIC_CARD_ANNOUNCEMENT_HEIGHT = 32;
const PUBLIC_CARD_ANNOUNCEMENT_GAP = 7;
const STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS = 4000;
const DUEL_REVEAL_HOLD_MS = 4000;
const MOVE_DURATION_MS = 380;

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

function battlefieldCenterCard(
  size: { width: number; height: number } = REVEAL_CARD,
  safety: { reserveSeatHistoryDepth?: number; reservePlayerIds?: readonly string[] } = {},
): CardRect {
  const table = document.querySelector<HTMLElement>(".play-table");
  if (!table) return boundCardRect((window.innerWidth - size.width) / 2, (window.innerHeight - size.height) / 2, size.width, size.height);
  const bounds = table.getBoundingClientRect();
  const preferredTop = bounds.top + bounds.height * 0.5 - size.height / 2;
  const preferredLeft = bounds.left + (bounds.width - size.width) / 2;
  const obstacles = [...document.querySelectorAll<HTMLElement>(
    ".opponent-player-card[data-player-anchor], .player-square, .player-board-status, .visible-countdown, .stage-system-cluster",
  )].map((element) => element.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
  const playerIds = new Set(safety.reservePlayerIds ?? []);
  if (safety.reserveSeatHistoryDepth && safety.reserveSeatHistoryDepth > 0) {
    document.querySelectorAll<HTMLElement>("[data-player-anchor]").forEach((anchor) => {
      if (anchor.dataset.playerAnchor) playerIds.add(anchor.dataset.playerAnchor);
    });
  }
  const historyDepth = Math.max(0, Math.floor(safety.reserveSeatHistoryDepth ?? (playerIds.size ? 1 : 0)));
  for (const playerId of playerIds) {
    for (let cardIndex = 0; cardIndex < historyDepth; cardIndex += 1) {
      const reserved = seatHistoryCardParking(playerId, cardIndex, [])?.rect;
      if (reserved) obstacles.push(new DOMRect(reserved.left, reserved.top, reserved.width, reserved.height));
    }
  }
  const announcementWidth = Math.min(PUBLIC_CARD_ANNOUNCEMENT_MAX_WIDTH, window.innerWidth - 16, bounds.width - 16);
  const offsets: Array<[number, number]> = [[0, 0]];
  for (let distance = 8; distance <= 200; distance += 8) {
    offsets.push([0, -distance], [0, distance]);
  }
  for (const distance of [24, 48, 72, 96, 120, 144, 168, 192]) {
    offsets.push([-distance, 0], [distance, 0], [-distance, -24], [distance, -24], [-distance, 24], [distance, 24]);
  }
  const candidates = offsets.map(([x, y]) => ({
    left: preferredLeft + x,
    top: preferredTop + y,
    width: size.width,
    height: size.height,
  }));
  // Eight-pixel stepping can miss the only safe fit on short screens by a
  // fraction of a pixel: the full sentence may fit below the Hero row while
  // the next stepped card position falls just past the battlefield's bottom.
  // Add exact card positions derived from obstacle edges so the announcement
  // can clear those edges without forcing the layout into its overlap fallback.
  const boundaryCandidateTops = obstacles.flatMap((obstacle) => [
    obstacle.bottom + PUBLIC_CARD_ANNOUNCEMENT_HEIGHT + PUBLIC_CARD_ANNOUNCEMENT_GAP + 2,
    obstacle.bottom + COMPACT_PUBLIC_CARD_ANNOUNCEMENT_HEIGHT + PUBLIC_CARD_ANNOUNCEMENT_GAP + 2,
    obstacle.top - size.height - 8,
  ]);
  for (const top of boundaryCandidateTops) {
    if (candidates.some((candidate) => Math.abs(candidate.top - top) < 0.5 && candidate.left === preferredLeft)) continue;
    candidates.push({ left: preferredLeft, top, width: size.width, height: size.height });
  }
  const cardFits = (candidate: CardRect) => candidate.left >= bounds.left + 8
      && candidate.left + candidate.width <= bounds.right - 8
      && candidate.top >= bounds.top + 8
      && candidate.top + candidate.height <= bounds.bottom
      && candidate.left >= 8
      && candidate.left + candidate.width <= window.innerWidth - 8
      && candidate.top >= 8
      && candidate.top + candidate.height <= window.innerHeight - 8
      && obstacles.every((obstacle) => candidate.left + candidate.width + 8 <= obstacle.left
        || candidate.left - 8 >= obstacle.right
        || candidate.top + candidate.height + 8 <= obstacle.top
        || candidate.top - 8 >= obstacle.bottom);
  const fitsFullWidthAnnouncement = (candidate: CardRect, height: number) => {
    const announcement = {
      left: candidate.left + candidate.width / 2 - announcementWidth / 2,
      top: candidate.top - height - PUBLIC_CARD_ANNOUNCEMENT_GAP,
      width: announcementWidth,
      height,
    };
    return announcement.left >= bounds.left + 8
      && announcement.left + announcement.width <= bounds.right - 8
      && announcement.top >= bounds.top + 8
      && announcement.left >= 8
      && announcement.left + announcement.width <= window.innerWidth - 8
      && obstacles.every((obstacle) => !rectsOverlap(announcement, obstacle, 2));
  };
  const safe = candidates.find((candidate) => cardFits(candidate)
      && fitsFullWidthAnnouncement(candidate, PUBLIC_CARD_ANNOUNCEMENT_HEIGHT))
    ?? candidates.find((candidate) => cardFits(candidate)
      && fitsFullWidthAnnouncement(candidate, COMPACT_PUBLIC_CARD_ANNOUNCEMENT_HEIGHT))
    ?? candidates.find(cardFits);
  return safe ?? boundCardRect(preferredLeft, preferredTop, size.width, size.height);
}

function battlefieldPublicEffectFrameCard(materialCount = 1): CardRect {
  const table = document.querySelector<HTMLElement>(".play-table");
  const bounds = table?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
  const safeLeft = Math.max(8, bounds.left + 8);
  const safeRight = Math.min(window.innerWidth - 8, bounds.right - 8);
  const frameLayout = publicCardEffectFrameLayout(materialCount, window.innerWidth, window.innerHeight);
  const frameWidth = Math.max(1, Math.min(frameLayout.frameWidth, safeRight - safeLeft));
  const safeTop = Math.max(8, bounds.top + 8);
  const safeBottom = Math.min(window.innerHeight - 8, bounds.bottom - 2);
  const maxFrameLeft = Math.max(safeLeft, safeRight - frameWidth);
  const frameLeft = Math.max(safeLeft, Math.min(maxFrameLeft, bounds.left + (bounds.width - frameWidth) / 2));
  const announcementGap = PUBLIC_CARD_ANNOUNCEMENT_GAP;
  const announcementHeight = 50;
  const frameHeight = frameLayout.frameHeight;
  const maxFrameTop = safeBottom - frameHeight - announcementGap - announcementHeight;
  const preferredTop = bounds.top + (bounds.height - frameHeight) / 2;
  const obstacleElements = [...document.querySelectorAll<HTMLElement>(
    ".opponent-player-card[data-player-anchor], .player-square, .player-square-target, .play-seat, .player-board-status, .visible-countdown, .stage-system-cluster, .local-player-dock, .console-guidance, .public-activity-chip",
  )];
  const topSeatBottom = table?.dataset.seatTopology === "top-row"
    ? [...document.querySelectorAll<HTMLElement>(".opponent-player-card[data-player-anchor]")].reduce((bottom, element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0
        ? bottom : Math.max(bottom, rect.bottom);
    }, bounds.top)
    : bounds.top;
  const minimumFrameTop = Math.max(safeTop, topSeatBottom + 8);
  const obstacles = obstacleElements.flatMap((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0
      || rect.width <= 0 || rect.height <= 0 ? [] : [rect];
  });
  const candidateTops = [preferredTop, ...obstacles.flatMap((obstacle) => [
    obstacle.bottom + 8,
    obstacle.top - frameHeight - 8,
  ])];
  for (let distance = 8; distance <= 200; distance += 8) {
    candidateTops.push(preferredTop - distance, preferredTop + distance);
  }
  const legalFrameTops = [...new Set(candidateTops)]
    .filter((top) => top >= minimumFrameTop && top <= maxFrameTop)
    .sort((left, right) => Math.abs(left - preferredTop) - Math.abs(right - preferredTop));
  const selectedFrameTop = legalFrameTops.find((top) => {
      const frameRect = { left: frameLeft, top, width: frameWidth, height: frameHeight };
      return obstacles.every((obstacle) => !rectsOverlap(frameRect, obstacle, 1));
    });
  const frameTop = selectedFrameTop ?? Math.max(minimumFrameTop, Math.min(maxFrameTop, preferredTop));
  return {
    left: frameLeft + frameLayout.cardOffsetLeft,
    top: frameTop + frameLayout.cardOffsetTop,
    width: REVEAL_CARD.width,
    height: REVEAL_CARD.height,
  };
}

function battlefieldLustCostCard(): CardRect {
  return battlefieldPublicEffectFrameCard(1);
}

function battlefieldPublicEffectFrame(card: CardRect, materialCount = 1): CardRect {
  const layout = publicCardEffectFrameLayout(materialCount, window.innerWidth, window.innerHeight);
  return {
    left: card.left - layout.cardOffsetLeft,
    top: card.top - layout.cardOffsetTop,
    width: layout.frameWidth,
    height: layout.frameHeight,
  };
}

function battlefieldLustDuelAnnouncementAnchor(card: CardRect): CardRect {
  return battlefieldPublicEffectFrame(card, 1);
}

function hasPaintedLargePublicCard(eventId: string, size: Pick<CardRect, "width" | "height">) {
  const element = [...document.querySelectorAll<HTMLElement>("[data-public-card-journey-event-id]")]
    .find((candidate) => candidate.dataset.publicCardJourneyEventId === eventId);
  const face = element?.querySelector<HTMLElement>(".played-card");
  const rect = element?.getBoundingClientRect();
  const elementStyle = element ? window.getComputedStyle(element) : null;
  const faceStyle = face ? window.getComputedStyle(face) : null;
  return Boolean(element && face && rect && elementStyle && faceStyle
    && element.isConnected && element.getClientRects().length > 0
    && elementStyle.display !== "none" && elementStyle.visibility !== "hidden" && Number(elementStyle.opacity) > 0
    && faceStyle.display !== "none" && faceStyle.visibility !== "hidden" && Number(faceStyle.opacity) > 0
    && Math.abs(rect.width - size.width) < 1 && Math.abs(rect.height - size.height) < 1
    && rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight);
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
    return boundCardRect(bounds.left + 8 + cardIndex * (PARKED_CARD.width + 6), bounds.top - PARKED_CARD.height - 6, PARKED_CARD.width, PARKED_CARD.height);
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
    return boundCardRect(anchorCenterX - PARKED_CARD.width / 2 + cardIndex * (PARKED_CARD.width + 6), bounds.bottom + 6, PARKED_CARD.width, PARKED_CARD.height);
  }

  if (Math.abs(anchorCenterX - boardCenterX) > Math.abs(anchorCenterY - boardCenterY)) {
    const facesCenterFromLeft = anchorCenterX < boardCenterX;
    const left = facesCenterFromLeft
      ? bounds.right + 6 + cardIndex * (PARKED_CARD.width + 6)
      : bounds.left - PARKED_CARD.width - 6 - cardIndex * (PARKED_CARD.width + 6);
    return boundCardRect(left, anchorCenterY - PARKED_CARD.height / 2, PARKED_CARD.width, PARKED_CARD.height);
  }

  return boundCardRect(anchorCenterX - PARKED_CARD.width / 2 + cardIndex * (PARKED_CARD.width + 6), bounds.top - PARKED_CARD.height - 6, PARKED_CARD.width, PARKED_CARD.height);
}

type SeatHistoryCardParking = { rect: CardRect; side: "local" | "top" | "left" | "right" };

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
  allowHarvestPoolOverlap?: boolean;
  allowAuthorPortraitEdgeOverlap?: boolean;
  preserveAuthorControls?: boolean;
  keepHarvestResponseNearAuthor?: boolean;
};

function seatHistoryParkingProtectedSelectors(options: SeatHistoryCardParkingOptions) {
  if (!options.protectInteractionControls) return [];
  return [
    ".console-guidance", ".decision-status", ".public-card-display-journey-copy", "[data-public-card-announcement='true']",
    ".public-activity-chip", "[data-public-activity-chip]", ".visible-countdown", ".stage-system-cluster",
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
      ".harvest-card-choice", ".harvest-card-select", ".harvest-card-info", ".harvest-confirm-row button",
    ] : [
      ".harvest-choice-panel", ".harvest-choice-heading",
      ".harvest-card-choice", ".harvest-card-select", ".harvest-card-info", ".harvest-confirm-row button",
    ]),
    ...(options.preserveAuthorControls ? [
      ".test-view-switch-button", ".opponent-seat-inspect-button", ".opponent-player-name",
      ".opponent-player-name-strip", ".opponent-status-equipment-strip", ".opponent-hp-chip",
      ".opponent-equipment-summary", ".opponent-judgement-zone", ".opponent-judgement-cards",
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
  const cardSize = options.cardSize ?? PARKED_CARD;
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
      return inViewport(candidate)
        && !rectsOverlap(heroRect, visible.rect, 2)
        && (!authorSeatRect || !rectsOverlap(authorSeatRect, visible.rect, 2))
        && !occupied.some((rect) => rectsOverlap(rect, candidate, 2))
        && obstacles.every((rect) => !rectsOverlap(rect, visible.rect, 2))
        && otherAnchors.every((rect) => !rectsOverlap(rect, visible.rect, 2));
    };
    const belowSeatCandidates = (left: number): CardRect[] => {
      const firstTop = seat.bottom + gap + cascade;
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
      baseTop = seat.bottom + gap;
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
      || !rectsOverlap(candidate, seat, 2)),
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

type TargetCardResultPlacementDiagnostic = {
  result: { left: number; top: number; width: number; height: number };
  blockers: Array<{ selector: string; left: number; top: number; width: number; height: number }>;
};
type TargetCardResultPlacement = {
  eventId: string;
  left: number;
  top: number;
  limited: boolean;
  limitationReason?: string;
  diagnostic?: TargetCardResultPlacementDiagnostic;
};

function measureTargetCardResultPlacement(element: HTMLElement, center: CardRect): Omit<TargetCardResultPlacement, "eventId"> {
  const result = element.getBoundingClientRect();
  const table = document.querySelector<HTMLElement>(".play-table");
  const dock = document.querySelector<HTMLElement>(".local-player-dock");
  const tableBounds = table?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
  const resultWidth = result.width || Math.min(window.innerWidth * 0.9, 360);
  const resultHeight = result.height || 220;
  const mobile = window.innerWidth <= 480;
  const protectedSelectors = [
    ".player-board [data-player-anchor]",
    ".visible-countdown",
    ".stage-system-cluster",
    ".public-activity-chip",
    ".public-card-journey-card",
    ".card-pool-target-stage",
    ".opponent-inspection-floating-shell",
    ".card-details-panel",
    ".hero-details-panel",
    ".local-player-dock",
  ];
  const diagnosticRect = (rect: DOMRect | CardRect) => ({
    left: Math.round(rect.left * 10) / 10,
    top: Math.round(rect.top * 10) / 10,
    width: Math.round(rect.width * 10) / 10,
    height: Math.round(rect.height * 10) / 10,
  });
  const preferredTop = mobile
    ? center.top - Math.min(70, Math.max(40, Math.round(window.innerHeight * 0.065)))
    : center.top;
  const minLeft = Math.max(8, tableBounds.left + 8);
  const maxLeft = Math.min(window.innerWidth - resultWidth - 8, tableBounds.right - resultWidth - 8);
  const centeredLeft = center.left + center.width / 2 - resultWidth / 2;
  const hasHorizontalSpace = maxLeft >= minLeft;
  const viewportMaxLeft = Math.max(8, window.innerWidth - resultWidth - 8);
  const left = hasHorizontalSpace
    ? Math.max(minLeft, Math.min(maxLeft, centeredLeft))
    : Math.max(8, Math.min(viewportMaxLeft, centeredLeft));
  if (!mobile) return {
    left,
    top: center.top,
    limited: !hasHorizontalSpace,
    ...(hasHorizontalSpace ? {} : {
      limitationReason: "no-horizontal-safe-corridor",
      diagnostic: { result: diagnosticRect({ left, top: center.top, width: resultWidth, height: resultHeight }), blockers: [] },
    }),
  };

  const dockTop = dock?.getBoundingClientRect().top ?? window.innerHeight;
  const minTop = Math.max(8, tableBounds.top + 8);
  const maxTop = Math.min(
    window.innerHeight - resultHeight - 8,
    tableBounds.bottom - resultHeight - 8,
    dockTop - resultHeight - 12,
  );
  const hasVerticalSpace = maxTop >= minTop;
  const fallbackMinTop = 8;
  const fallbackMaxTop = Math.max(fallbackMinTop, window.innerHeight - resultHeight - 8);
  const low = hasVerticalSpace ? minTop : fallbackMinTop;
  const high = hasVerticalSpace ? maxTop : fallbackMaxTop;
  const clampedPreferred = Math.max(low, Math.min(high, preferredTop));
  const candidates = new Set<number>([low, high, clampedPreferred]);
  for (let top = low; top <= high; top += 8) candidates.add(top);

  const obstacles = [...document.querySelectorAll<HTMLElement>(protectedSelectors.join(","))].flatMap((element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) <= 0.01
      || rect.width <= 0 || rect.height <= 0) return [];
    const selector = protectedSelectors.find((candidate) => element.matches(candidate)) ?? "protected-surface";
    return [{ selector, rect }];
  });
  for (const obstacle of obstacles) {
    for (const edge of [obstacle.rect.bottom + 12, obstacle.rect.top - resultHeight - 12]) {
      if (edge >= low && edge <= high) candidates.add(edge);
    }
  }

  const ranked = [...candidates].map((top) => ({
    top,
    rect: { left, top, width: resultWidth, height: resultHeight },
    overlapCount: obstacles.reduce((count, obstacle) => count + (rectsOverlap({ left, top, width: resultWidth, height: resultHeight }, obstacle.rect, 12) ? 1 : 0), 0),
    distance: Math.abs(top - preferredTop),
  })).sort((a, b) => a.overlapCount - b.overlapCount || a.distance - b.distance);
  const clear = ranked.find((candidate) => candidate.overlapCount === 0);
  const selected = clear ?? ranked[0];
  const selectedTop = selected?.top ?? clampedPreferred;
  const selectedRect = { left, top: selectedTop, width: resultWidth, height: resultHeight };
  const blockingRects = obstacles
    .filter((obstacle) => rectsOverlap(selectedRect, obstacle.rect, 12))
    .map((obstacle) => ({ selector: obstacle.selector, ...diagnosticRect(obstacle.rect) }));
  const limitationReasons = [
    !hasHorizontalSpace ? "no-horizontal-safe-corridor" : null,
    !hasVerticalSpace ? "no-vertical-safe-corridor" : null,
    !clear ? "protected-surface-overlap" : null,
  ].filter((reason): reason is string => Boolean(reason));
  const limited = limitationReasons.length > 0;
  return {
    left,
    top: selectedTop,
    limited,
    ...(limited ? {
      limitationReason: limitationReasons.join(","),
      diagnostic: { result: diagnosticRect(selectedRect), blockers: blockingRects },
    } : {}),
  };
}

function settlementLabel(action: PublicCardDisplayAction, targetName: string | null) {
  switch (action.settlement?.outcome) {
    case "ATTACK_DAMAGE_APPLIED": return `TAKE DAMAGE · ${targetName ?? "target"}`;
    case "ATTACK_BLOCKED_BY_DODGE": return "ATTACK BLOCKED BY DODGE";
    case "SUITS_MATCHED": return "SUITS MATCHED";
    case "SUITS_DIFFERED": return "SUITS DIFFERED";
    case "DISMANTLE_RESOLVED": return "BURNING BRIDGE RESOLVED";
    case "STEAL_RESOLVED": return "STEAL RESOLVED";
    case "GROUP_RESOLVED": return "GROUP EFFECT RESOLVED";
    case "BUMPER_HARVEST_RESOLVED": return "BUMPER HARVEST RESOLVED";
    case "LUST_DUEL_DAMAGE_APPLIED":
    case "LUST_DUEL_DAMAGE_PREVENTED": return action.publicNotice ?? "LUST DUEL RESOLVED";
    case "ROOT_CANCELLED": return "EFFECT NEGATED";
    case "ROOT_RESTORED": return "EFFECT RESTORED";
    default: return null;
  }
}

function compactPublicNotice(notice: string, actorName: string | null) {
  const negation = notice.trim().match(/^.+? played Negation to counter (.+?)[.!?]?$/i);
  if (negation) return `${actorName ?? "A player"} played Negation against ${negation[1]}.`;

  const deflection = notice.trim().match(/^.+? used Deflection, discarding (.+?) and redirecting Attack to (.+?)[.!?]?$/i);
  if (deflection) return `Deflection: ${actorName ?? "A player"} redirected Attack to ${deflection[2]}; discarded ${deflection[1]}.`;

  const playedTarget = notice.trim().match(/^.+? played (.+?) targeting (.+?)[.!?]?$/i);
  if (playedTarget) return `${actorName ?? "A player"} played ${playedTarget[1]} on ${playedTarget[2]}.`;

  const usedTarget = notice.trim().match(/^.+? used (.+?) targeting (.+?)[.!?]?$/i);
  if (usedTarget) return `${actorName ?? "A player"} used ${usedTarget[1]} on ${usedTarget[2]}.`;

  return notice.trim();
}

function isHarvestNegationPresentation(action: PublicCardDisplayAction) {
  return !action.settlement
    && action.motion?.type === "negation"
    && action.cardFace?.kind === "BumperHarvest"
}

type HarvestNegationTarget =
  | { kind: "harvest-effect"; recipientName: string }
  | { kind: "negation-response"; actorName: string };

/** The next counter target, using only the current proof-backed public chain. */
export function harvestNegationTarget(action: PublicCardDisplayAction): HarvestNegationTarget | null {
  if (!isHarvestNegationPresentation(action)) return null;
  const responses = action.responses ?? [];
  if (responses.length > 0) {
    const latestActorName = responses.at(-1)?.actorName?.trim();
    return latestActorName ? { kind: "negation-response", actorName: latestActorName } : null;
  }
  const recipient = action.harvestEffectRecipient;
  return recipient?.participantId && recipient.participantName.trim()
    ? { kind: "harvest-effect", recipientName: recipient.participantName.trim() }
    : null;
}

/** Local response wording for the same public counter-target model as H4. */
export function harvestNegationDecisionCopy(action: PublicCardDisplayAction) {
  const target = harvestNegationTarget(action);
  if (!target) return "Negation response open · Play / Pass";
  return target.kind === "harvest-effect"
    ? `Cancel Harvest for ${target.recipientName} · Negation / Pass`
    : `Counter ${target.actorName}'s Negation · Play / Pass`;
}

function bumperHarvestNegationCopy(
  action: PublicCardDisplayAction,
  compact = false,
) {
  const responses = action.responses ?? [];
  const target = harvestNegationTarget(action);
  if (!target) return responses.length > 0 ? "Negation response open." : "Negation available.";
  if (target.kind === "harvest-effect") return compact
    ? `Cancel Harvest for ${target.recipientName}?`
    : `Negation: Cancel Harvest for ${target.recipientName}?`;
  return `Counter ${target.actorName}'s Negation?`;
}

export function publicCardAnnouncement(
  action: PublicCardDisplayAction,
  notice: string,
  actorName: string | null,
  sourceName: string | null,
  targetName: string | null,
) {
  const outcome = action.settlement?.outcome;
  const source = sourceName ?? "A player";
  const target = targetName ?? "the target";
  const actor = actorName ?? targetName ?? "The target";
  const cardName = action.cardLabel.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  const targetCardMovement = action.settlement?.targetCardMovement;
  const targetCardSourceZone = targetCardMovement?.sourceZone === "hand" ? "Hand"
    : targetCardMovement?.sourceZone === "equipment" ? "Equipment"
      : targetCardMovement?.sourceZone === "judgement" ? "Judgement" : null;
  const targetCardFace = targetCardMovement?.affectedCardFace;
  const targetCardName = targetCardFace
    ? cardDefinition(targetCardFace.kind).name
    : "one card";

  if (isHarvestNegationPresentation(action)) return bumperHarvestNegationCopy(action);

  switch (outcome) {
    case "ATTACK_DAMAGE_APPLIED":
      return targetName ? `${targetName} took damage from ${source}'s Attack.` : notice;
    case "ATTACK_BLOCKED_BY_DODGE":
      return action.response?.semanticLabel === "AS DODGE"
        ? `${actor} used Attack as Dodge against ${source}'s Attack.`
        : `${actor} played Dodge against ${source}'s Attack.`;
    case "SUITS_MATCHED":
    case "SUITS_DIFFERED":
      return `${source} used ${cardName} on ${target}; suits ${outcome === "SUITS_MATCHED" ? "matched" : "differed"}.`;
    case "GROUP_RESOLVED":
    case "BUMPER_HARVEST_RESOLVED": {
      const count = action.ariaLabel.match(/(\d+)\s+(targets|choices) resolved/i);
      return count
        ? `${source} played ${cardName}; ${count[1]} ${count[2].toLowerCase()} resolved.`
        : compactPublicNotice(action.ariaLabel, actorName);
    }
    case "DISMANTLE_RESOLVED":
      if (targetCardMovement?.destinationZone === "discard"
        && targetCardMovement.destinationOwnerId === null
        && targetCardSourceZone
        && action.targetId !== null
        && targetCardMovement.affectedCardOwnerId === (targetCardMovement.sourceZone === "judgement" ? null : action.targetId)
        && targetCardFace) {
        return `${source} discarded ${targetCardName} from ${target} (${targetCardSourceZone}).`;
      }
      return `${source} resolved ${cardName} on ${target}.`;
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
      return `${actor}'s Negation cancelled ${source}'s ${cardName}${targetName ? ` on ${targetName}` : ""}.`;
    case "ROOT_RESTORED":
      return `${actor}'s Negation restored ${source}'s ${cardName}${targetName ? ` on ${targetName}` : ""}.`;
    default:
      return settlementLabel(action, targetName) ?? compactPublicNotice(notice, actorName);
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
  const faceDescription = face ? `${cardDefinition(face.kind).name} (${face.rank}${face.suit})` : null;
  const zone = movement?.sourceZone === "hand" ? "Hand"
    : movement?.sourceZone === "equipment" ? "Equipment"
      : movement?.sourceZone === "judgement" ? "Judgement" : null;

  if (action.settlement?.outcome === "DISMANTLE_RESOLVED"
    && action.targetId !== null
    && zone
    && movement?.destinationZone === "discard"
    && movement.destinationOwnerId === null
    && movement.affectedCardOwnerId === (movement.sourceZone === "judgement" ? null : action.targetId)
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

function publicCardPhaseClause(phaseNotice: string | undefined) {
  if (!phaseNotice) return null;
  if (phaseNotice.includes("NEGATION MAY BE PLAYED")) return "Negation can be played";
  if (phaseNotice.includes("NEGATION RESPONSE")) return "a Negation response is open";
  if (phaseNotice.includes("DUEL NEGATED")) return "the Duel was negated";
  return null;
}

type CompactPublicPlayerNames = Readonly<Record<string, string>>;

type DisplayedPublicCardAnnouncement = {
  message: string;
  supporting: string;
  eventId: string;
  latestCommittedEventId?: string;
  checkpointId?: string;
  phase?: PublicNegationNarration["phase"];
  rootEffectState?: PublicNegationNarration["rootEffectState"];
  accessibleLabel?: string;
};

type PublicCardAnnouncementCopy = {
  message: string;
  compactMessage?: string;
  accessibleLabel?: string;
};

function publicCardAnnouncementCopy(
  action: PublicCardDisplayAction,
  notice: string,
  actorName: string | null,
  actorId: string,
  sourceName: string | null,
  targetName: string | null,
  compactPlayerNamesById: CompactPublicPlayerNames,
  eventId?: string,
): PublicCardAnnouncementCopy {
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
        return { message: notice, compactMessage: compact ?? notice, accessibleLabel: notice };
      }
      const compact = compactPublicNotice(notice, responseActorName);
      return { message: notice, compactMessage: compact === notice ? undefined : compact, accessibleLabel: notice };
    }
    return {
      message: action.lustCostFrame.message,
      compactMessage: action.lustCostFrame.compactMessage,
      accessibleLabel: action.lustCostFrame.accessibleMessage ?? action.lustCostFrame.message,
    };
  }
  if (isHarvestNegationPresentation(action)) {
    const message = bumperHarvestNegationCopy(action);
    const compactMessage = bumperHarvestNegationCopy(action, true);
    return { message, compactMessage: compactMessage === message ? undefined : compactMessage };
  }
  if (action.publicCardEffectFrame && action.publicNotice) {
    const compactMessage = action.publicNoticeCompact?.trim();
    return {
      message: action.publicNotice,
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
    compactMessage: selectedCompactMessage === message ? undefined : selectedCompactMessage,
    ...(accessibleLabel ? { accessibleLabel } : {}),
  };
}

function withPublicCardPhaseNotice(message: string, phaseNotice: string | undefined, compact = false) {
  const concise = message.trim()
    .replace(/\.\s+Play Dodge or Skip\.$/i, ".")
    .replace(/\.\s+(Resolved:)/i, "; $1")
    .replace(/\.\s+(\d+\s+(?:targets|choices) resolved\.)/i, "; $1");
  const clause = publicCardPhaseClause(phaseNotice);
  if (!clause) return concise;
  if (compact && phaseNotice?.includes("NEGATION")) {
    const phase = phaseNotice.includes("NEGATION MAY BE PLAYED") ? "Negation available" : "Negation open";
    const targetAction = concise.match(/^(.*?) played (.*?) (?:on|targeting) (.*?)[.!?]*$/i);
    if (targetAction) return `${targetAction[1]}: ${targetAction[2]} on ${targetAction[3]} · ${phase}`;
    const counterAction = concise.match(/^(.*?) played Negation against (.*?)[.!?]*$/i);
    if (counterAction) return `${counterAction[1]}: Negation vs ${counterAction[2]} · ${phase}`;
  }
  return `${concise.replace(/[.!?]+$/, "")}; ${clause}.`;
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
  const checkpointEventId = action.publicNegationNarration?.latestCommittedEventId
    ?? action.settlement?.eventId
    ?? eventId;
  const proofEventId = action.publicNegationNarration?.checkpointId
    ?? action.publicCardEffectFrame?.eventId
    ?? action.settlement?.eventId
    ?? eventId;
  return buildPublicAnnouncementEventCopyKey({
    roomCode,
    rootEventId: action.rootEventId,
    checkpointEventId,
    proofEventId,
    actorId,
    actionClass: action.publicCardEffectFrame?.effectId ?? action.cardKind ?? action.motion?.type ?? action.cardLabel,
    presentationRevision: action.presentationRevision,
  });
}

function publicCardAnnouncementLifecycleStage(action: PublicCardDisplayAction): "ACTIVE" | "READING" {
  return action.settlement || action.publicCounterRead ? "READING" : "ACTIVE";
}

function appendAnnouncementContext(label: string | undefined, context: string | undefined) {
  const supporting = context?.trim();
  if (!supporting) return label;
  const primary = label?.trim().replace(/[.!?]+$/, "");
  return primary ? `${primary}. ${supporting}` : supporting;
}

function PublicCardAnnouncement({
  eventId,
  anchorEventId,
  eventCopyKey,
  geometryKey,
  copyLifecycleStage,
  placementKey,
  viewerLayoutKey,
  phase,
  heading,
  message,
  compactMessage,
  accessibleLabel,
  supportingMessage,
  compactSupportingMessage,
  negationNarration,
  fallbackCardRect,
  phaseNotice,
  outcome,
  negationWaiting = false,
  stableCenterAnchor = false,
  keepCenterAnchorClear = false,
  stableHarvestAnchor = false,
  ignoreJourneyLayoutPending = false,
  viewerGeometryReady = true,
  preferredVerticalMode,
  privateDrawAware = false,
}: {
  eventId: string;
  anchorEventId?: string | null;
  eventCopyKey: string;
  geometryKey: string;
  copyLifecycleStage: "ACTIVE" | "READING";
  placementKey: string;
  viewerLayoutKey: string;
  phase: JourneyCard["phase"] | "static";
  heading?: string;
  message: string;
  compactMessage?: string;
  accessibleLabel?: string;
  supportingMessage?: string;
  compactSupportingMessage?: string;
  negationNarration?: PublicNegationNarration;
  fallbackCardRect: CardRect | null;
  phaseNotice?: string;
  outcome?: NonNullable<PublicCardDisplayAction["settlement"]>["outcome"];
  negationWaiting?: boolean;
  stableCenterAnchor?: boolean;
  keepCenterAnchorClear?: boolean;
  stableHarvestAnchor?: boolean;
  ignoreJourneyLayoutPending?: boolean;
  viewerGeometryReady?: boolean;
  preferredVerticalMode?: "above" | "below";
  privateDrawAware?: boolean;
}) {
  const copyRef = useRef<HTMLDivElement>(null);
  const measuredCenterRef = useRef<{ bandKey: string; rect: CardRect } | null>(null);
  const placementGenerationRef = useRef(0);
  const lastValidPlacementRef = useRef<{
    geometryIdentity: string;
    layoutEpoch: string;
    viewerLayoutKey: string;
    left: number;
    top: number;
    width: number;
    height: number;
    compact: boolean;
  } | null>(null);
  const placementFailureRef = useRef<{ identity: string; layoutEpoch: string; startedAt: number } | null>(null);
  const copyLifecycleRef = useRef<PublicAnnouncementCopyLifecycle>({ eventCopyKey: "", stage: "UNSEEN" });
  const lastGeometryKeyRef = useRef("");
  const [displayedCopy, setDisplayedCopy] = useState<DisplayedPublicCardAnnouncement>(() => ({
    message: negationNarration?.headline ?? message,
    supporting: negationNarration?.supportingMessage ?? supportingMessage ?? "",
    eventId: negationNarration?.eventId ?? eventId,
    latestCommittedEventId: negationNarration?.latestCommittedEventId,
    checkpointId: negationNarration?.checkpointId,
    phase: negationNarration?.phase,
    rootEffectState: negationNarration?.rootEffectState,
    accessibleLabel: accessibleLabel ?? negationNarration?.accessibleLabel,
  }));
  const displayedCopyRef = useRef(displayedCopy);
  useLayoutEffect(() => () => {
    copyLifecycleRef.current = transitionPublicAnnouncementCopyLifecycle(copyLifecycleRef.current, null);
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
    eventId, anchorEventId, eventCopyKey, geometryKey, copyLifecycleStage, placementKey, viewerLayoutKey,
    phase, heading, message, compactMessage, accessibleLabel, supportingMessage, compactSupportingMessage,
    negationNarration, fallbackCardRect: stableFallbackCardRect, phaseNotice, outcome, negationWaiting,
    stableCenterAnchor, keepCenterAnchorClear, stableHarvestAnchor, ignoreJourneyLayoutPending,
    viewerGeometryReady, preferredVerticalMode, privateDrawAware,
  };
  const latestInputsRef = useRef(latestInputs);
  const placementInputKey = JSON.stringify(latestInputs);
  const schedulePlacementRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const placementGeneration = ++placementGenerationRef.current;
    const copy = copyRef.current;
    const display = copy?.closest<HTMLElement>(".public-card-display");
    if (!copy || !display) return;
    const geometryChanged = Boolean(lastGeometryKeyRef.current && lastGeometryKeyRef.current !== geometryKey);
    if (geometryChanged && copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
    if (geometryChanged) lastGeometryKeyRef.current = geometryKey;

    const copyAnchorEventId = anchorEventId === null ? "" : anchorEventId ?? eventId;
    const getAnchor = () => copyAnchorEventId
      ? Array.from(display.querySelectorAll<HTMLElement>("[data-public-card-copy-anchor-event-id]"))
        .find((element) => element !== copy && element.dataset.publicCardCopyAnchorEventId === copyAnchorEventId) ?? null
      : null;
    const toCardRect = (rect: DOMRect): CardRect => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let anchorObserver: MutationObserver | null = null;
    let frame = 0;
    let placementFailureTimer: number | null = null;
    let currentGeometryIdentity = "";
    const protectedSelectors = [".opponent-player-card", ".player-square", ".player-board-status", ".visible-countdown", ".stage-system-cluster", ".public-activity-chip", ".harvest-choice-panel", ".local-player-dock", ".local-hand-rail", ".console-guidance", ...(privateDrawAware ? [".private-draw-content"] : [])].join(", ");
    const setData = (name: string, value: string | undefined) => {
      const current = copy.getAttribute(name);
      if (value === undefined) {
        if (current !== null) copy.removeAttribute(name);
      } else if (current !== value) copy.setAttribute(name, value);
    };
    const setPx = (property: "left" | "top" | "width", value: number) => {
      const current = Number.parseFloat(copy.style[property]);
      if (!Number.isFinite(current) || Math.abs(current - value) > 1) copy.style[property] = `${value}px`;
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
        && previous.accessibleLabel === next.accessibleLabel) return;
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
        setData("data-public-card-announcement-stability", "hidden-after-sustained-placement-failure");
        return true;
      }
      return false;
    };

    const retainLastValidPlacement = (layoutEpoch: string) => {
      const previous = lastValidPlacementRef.current;
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
      const {
        eventId, geometryKey, placementKey, viewerLayoutKey, phase, message, compactMessage,
        accessibleLabel, supportingMessage, compactSupportingMessage, negationNarration,
        fallbackCardRect: currentFallbackCardRect, outcome, negationWaiting, stableCenterAnchor,
        keepCenterAnchorClear, stableHarvestAnchor, ignoreJourneyLayoutPending, viewerGeometryReady, preferredVerticalMode,
        privateDrawAware,
      } = latestInputsRef.current;
      const hasNegationNarration = Boolean(negationNarration);
      const narrationEventId = negationNarration?.eventId;
      const narrationLatestCommittedEventId = negationNarration?.latestCommittedEventId;
      const narrationCheckpointId = negationNarration?.checkpointId;
      const narrationPhase = negationNarration?.phase;
      const narrationRootEffectState = negationNarration?.rootEffectState;
      const narrationAccessibleLabel = accessibleLabel ?? negationNarration?.accessibleLabel;
      const incomingDisplayedCopy: DisplayedPublicCardAnnouncement = {
        message: negationNarration?.headline ?? message,
        supporting: negationNarration?.supportingMessage ?? supportingMessage ?? "",
        eventId: narrationEventId ?? eventId,
        latestCommittedEventId: narrationLatestCommittedEventId,
        checkpointId: narrationCheckpointId,
        phase: narrationPhase,
        rootEffectState: narrationRootEffectState,
        accessibleLabel: narrationAccessibleLabel,
      };
      commitDisplayedCopy(incomingDisplayedCopy);
      const currentDisplayedCopy = displayedCopyRef.current!;
      const anchor = getAnchor();
      const actualRect = anchor?.getBoundingClientRect();
      const tableRect = display.closest<HTMLElement>(".play-table")?.getBoundingClientRect() ?? null;
      if (!tableRect) {
        if (copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
        return;
      }
      // An announcement band and its measured centre card belong to the
      // viewer's current battlefield geometry. Reuse them across semantic
      // checkpoints only while that geometry remains materially unchanged.
      // A phone resize can shorten the battlefield by 100px while the old
      // centre remains barely inside safeBottom; keeping that band would hide
      // the next two-line public result behind the Local Player Dock.
      const layoutEpoch = [tableRect.left, tableRect.top, tableRect.width, tableRect.height]
        .map((value) => Math.round(value / 24) * 24)
        .join(":");
      const visualViewport = window.visualViewport;
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportRight = viewportLeft + (visualViewport?.width ?? viewportWidth);
      const viewportBottom = viewportTop + (visualViewport?.height ?? window.innerHeight);
      const geometryNumber = (value: number) => Math.round(value * 2) / 2;
      const shell = display.closest<HTMLElement>(".game-shell") ?? document;
      const playerAnchorGeometry: PublicAnnouncementSeatGeometry[] = [...shell.querySelectorAll<HTMLElement>("[data-player-anchor]")]
        .flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) return [];
          return [{
            anchorId: element.dataset.playerAnchor ?? "",
            rect: {
              left: geometryNumber(rect.left), top: geometryNumber(rect.top),
              right: geometryNumber(rect.right), bottom: geometryNumber(rect.bottom),
            },
          }];
        })
        .sort((left, right) => left.anchorId.localeCompare(right.anchorId)
          || left.rect.left - right.rect.left || left.rect.top - right.rect.top);
      const isLargeRevealAnchor = phase === "reveal" && !stableCenterAnchor
        && actualRect && actualRect.width > 0 && actualRect.height > 0;
      const obstacles: Array<{ element: HTMLElement | null; rect: DOMRect }> = [...document.querySelectorAll<HTMLElement>(
        [".opponent-player-card", ".player-square", ".player-board-status", ".visible-countdown", ".stage-system-cluster", ".public-activity-chip", ".harvest-choice-panel", ".local-player-dock", ".local-hand-rail", ".console-guidance", ...(stableHarvestAnchor ? [] : ["[data-public-card-copy-anchor-event-id]"]), ...(privateDrawAware ? [".private-draw-content"] : [])].join(", "),
      )].flatMap((element) => {
        if (element === anchor || element === copy
          || element.dataset.publicCardCopyAnchorEventId === copyAnchorEventId
          || element.contains(copy)) return [];
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0
          ? []
          : [{ element, rect }];
      });
      const anchorTarget = anchor ? {
        left: Number(anchor.dataset.publicCardJourneyTargetLeft),
        top: Number(anchor.dataset.publicCardJourneyTargetTop),
        width: Number(anchor.dataset.publicCardJourneyTargetWidth),
        height: Number(anchor.dataset.publicCardJourneyTargetHeight),
      } : null;
      if (!isLargeRevealAnchor && anchorTarget && Object.values(anchorTarget).every(Number.isFinite)
        && anchorTarget.width > 0 && anchorTarget.height > 0) {
        obstacles.push({
          element: null,
          rect: new DOMRect(anchorTarget.left, anchorTarget.top, anchorTarget.width, anchorTarget.height),
        });
      }
      const protectedGeometry: PublicAnnouncementProtectedGeometry[] = obstacles.map(({ element, rect }) => ({
        kind: element?.className?.toString() ?? "journey-target",
        identity: element?.dataset.publicCardCopyAnchorEventId ?? element?.dataset.playerAnchor ?? "",
        rect: {
          left: geometryNumber(rect.left), top: geometryNumber(rect.top),
          right: geometryNumber(rect.right), bottom: geometryNumber(rect.bottom),
        },
      })).sort((left, right) => left.kind.localeCompare(right.kind)
        || left.identity.localeCompare(right.identity)
        || left.rect.left - right.rect.left || left.rect.top - right.rect.top);
      const anchorGeometry = actualRect && actualRect.width > 0 && actualRect.height > 0
        ? {
          left: geometryNumber(actualRect.left), top: geometryNumber(actualRect.top),
          right: geometryNumber(actualRect.right), bottom: geometryNumber(actualRect.bottom),
        }
        : null;
      currentGeometryIdentity = publicAnnouncementGeometryIdentity({
        viewerKey: geometryKey,
        layoutRevision: `${viewerLayoutKey}:${layoutEpoch}`,
        viewport: {
          left: geometryNumber(viewportLeft), top: geometryNumber(viewportTop),
          right: geometryNumber(viewportRight), bottom: geometryNumber(viewportBottom),
        },
        table: {
          left: geometryNumber(tableRect.left), top: geometryNumber(tableRect.top),
          right: geometryNumber(tableRect.right), bottom: geometryNumber(tableRect.bottom),
        },
        seats: playerAnchorGeometry,
        anchor: anchorGeometry,
        protectedRects: protectedGeometry,
      });
      setData("data-public-card-announcement-geometry-key", currentGeometryIdentity);
      const bandKey = `${currentGeometryIdentity}:${viewerLayoutKey}:${placementKey}:${layoutEpoch}`;
      if (!viewerGeometryReady) {
        if (copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
        setData("data-public-card-announcement-stability", "waiting-current-viewer-geometry");
        return;
      }
      if (!ignoreJourneyLayoutPending && display.dataset.publicCardLayoutPending === "true") {
        if (!retainLastValidPlacement(layoutEpoch) && copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
        return;
      }
      const safeLeft = Math.max(viewportLeft + 8, tableRect.left + 8);
      const safeRight = Math.min(viewportRight - 8, tableRect.right - 8);
      const safeTop = Math.max(8, viewportTop + 4, tableRect.top + 8);
      const safeBottom = Math.min(viewportBottom - 8, tableRect.bottom - 2);
      const terminalLustResult = outcome === "LUST_DUEL_DAMAGE_APPLIED" || outcome === "LUST_DUEL_DAMAGE_PREVENTED";
      const lustDisplayAllowsNameWrapping = display.dataset.publicCardMotion === "lust-cost"
        || display.dataset.publicCardMotion === "lust-duel";
      const mobileLustFrame = !terminalLustResult && lustDisplayAllowsNameWrapping && viewportWidth <= 480;
      const compactMobileLustFrame = mobileLustFrame && viewportBottom - viewportTop <= 860;
      const availableAnnouncementWidth = mobileLustFrame
        ? Math.min(PUBLIC_CARD_ANNOUNCEMENT_MAX_WIDTH, viewportWidth - 16)
        : PUBLIC_CARD_ANNOUNCEMENT_MAX_WIDTH;
      const maxWidth = Math.max(1, Math.min(
        availableAnnouncementWidth,
        negationWaiting ? 420 : PUBLIC_CARD_ANNOUNCEMENT_MAX_WIDTH,
        viewportWidth - 16,
        safeRight - safeLeft,
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
      if (centerCardRect) measuredCenterRef.current = { bandKey, rect: centerCardRect };
      if (!centerCardRect && measuredCenterRef.current?.bandKey === bandKey) centerCardRect = measuredCenterRef.current.rect;
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
      const terminalLustStageCleared = terminalLustResult
        && !display.querySelector('[data-public-card-journey-phase="reveal"], [data-public-card-journey-phase="move"]');
      const centerCardStillOccupiesStage = centerCardRect.height > 0 && !terminalLustStageCleared;

      const gap = PUBLIC_CARD_ANNOUNCEMENT_GAP;
      const obstacleClearance = (element: HTMLElement | null) => privateDrawAware && element?.matches(".private-draw-content")
        ? 10
        : compactMobileLustFrame && element?.matches(".public-activity-chip") ? 6
          : element?.matches(".opponent-player-card, .player-square") ? 0 : 2;
      const overlapsObstacle = (rect: DOMRect, element: HTMLElement | null, obstacleRect: DOMRect) =>
        rectsOverlap(toCardRect(rect), obstacleRect, obstacleClearance(element));
      const privateDrawObstacle = privateDrawAware
        ? obstacles.find(({ element }) => element?.matches(".private-draw-content")) ?? null
        : null;
      const staysAbovePrivateDraw = (top: number, height: number) => !privateDrawObstacle
        || top + height + 10 <= privateDrawObstacle.rect.top;
      const revealedCenterX = centerCardRect.width > 0
        ? centerCardRect.left + centerCardRect.width / 2
        : tableRect.left + tableRect.width / 2;
      // Side-seat layouts can be wider than a narrow phone's visible board.
      // Keep this one shared narration centred in the visible safe corridor;
      // the physical reveal card still uses its own unchanged measured rect.
      const narrationCenterX = (safeLeft + safeRight) / 2;
      const targetCenterX = hasNegationNarration ? narrationCenterX : revealedCenterX;
      const centerOffsets = hasNegationNarration ? [0, -4, 4, -8, 8, -12, 12] : [0];
      const existingBand = publicCardAnnouncementBands.get(bandKey);
      const measuredCopyHeight = copy.getBoundingClientRect().height;
      const existingBandCenterY = existingBand?.centerY ?? (existingBand ? existingBand.top + measuredCopyHeight / 2 : null);
      const existingBandTop = existingBandCenterY === null ? null : existingBandCenterY - measuredCopyHeight / 2;
      const existingBandRect = existingBand
        ? new DOMRect(existingBand.left, existingBandTop ?? existingBand.top, existingBand.width, measuredCopyHeight)
        : null;
      const existingBandOverlapsProtectedCenter = (phase === "reveal" || stableCenterAnchor || keepCenterAnchorClear)
        && existingBandRect && centerCardStillOccupiesStage
        && rectsOverlap(toCardRect(existingBandRect), centerCardRect, gap);
      const existingBandOverlapsObstacle = existingBandRect && obstacles.some(({ element, rect }) =>
        element !== anchor && overlapsObstacle(existingBandRect, element, rect));
      const existingBandFitsCurrentStage = existingBand && existingBandTop !== null
        && !existingBandOverlapsProtectedCenter
        && !existingBandOverlapsObstacle
        && Math.abs(existingBand.centerX - targetCenterX) <= 12
        && (!stableHarvestAnchor || Math.abs(existingBandTop + measuredCopyHeight + gap - centerCardRect.top) <= 16)
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
      const placementBand = reusableBand ?? (existingBand
        && !existingBandOverlapsProtectedCenter
        && !existingBandOverlapsObstacle
        && Math.abs(existingBand.centerX - targetCenterX) <= 12
        && existingBandHasCurrentVerticalRoom
        ? existingBand
        : null);
      const canonicalCenterX = placementBand?.centerX ?? targetCenterX;
      const widths = [...new Set([placementBand?.width, maxWidth, 500, 480, 456, 440, 420, 400, 380, 360, 340, 320, 300, 280, 260, 240, 224, 208, 200, 192, 184, 176, 168, 160]
        .filter((width): width is number => typeof width === "number")
        .map((width) => Math.min(width, maxWidth)))]
        .filter((width) => width > 0)
        .sort((left, right) => right - left);
      // Preserve the narration's established center through settlement, but
      // let the terminal result reclaim the available phone width. Reusing
      // the earlier compact order-line width can make the longer, final
      // outcome unnecessarily narrow and harder to read.
      if (placementBand && !terminalLustResult) {
        const reusableWidth = widths.indexOf(Math.min(placementBand.width, maxWidth));
        if (reusableWidth > 0) widths.unshift(widths.splice(reusableWidth, 1)[0]);
      }
      const textElement = copy.querySelector<HTMLElement>("b");
      const supportElement = copy.querySelector<HTMLElement>(".public-negation-narration-support");
      // LUST participant names are identity, not expendable copy. Let their
      // measured text grow naturally; safe bounds and obstacle checks below
      // still reject any placement that would cover a Seat or the Dock.
      const maxTextLines = lustDisplayAllowsNameWrapping ? Number.POSITIVE_INFINITY : hasNegationNarration ? 3 : 2;
      const compactDiffers = Boolean((compactMessage && compactMessage !== message)
        || compactSupportingMessage !== supportingMessage);
      const announcementOptions = [
        { message, supporting: supportingMessage ?? "", compact: false },
        ...(compactDiffers ? [{ message: compactMessage ?? message, supporting: compactSupportingMessage ?? supportingMessage ?? "", compact: true }] : []),
      ];
      if ((mobileLustFrame || window.innerHeight <= 740) && compactDiffers) {
        const compactIndex = announcementOptions.findIndex((option) => option.compact);
        if (compactIndex > 0) announcementOptions.unshift(announcementOptions.splice(compactIndex, 1)[0]);
      }
      const setAnnouncementMeasureMode = (compact: boolean, width: number) => {
        setPx("width", width);
        setData("data-public-card-announcement-compact", compact ? "true" : undefined);
        setData("data-public-card-announcement-tight-copy", hasNegationNarration && width <= 224 ? "true" : undefined);
        if (mobileLustFrame && textElement) {
          setData("data-public-card-announcement-long-names", undefined);
          const range = document.createRange();
          range.selectNodeContents(textElement);
          const lineTops = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0)
            .reduce((tops, rect) => {
              if (!tops.some((top) => Math.abs(top - rect.top) <= 1)) tops.push(rect.top);
              return tops;
            }, [] as number[]);
          if (lineTops.length > 2) setData("data-public-card-announcement-long-names", "true");
        } else setData("data-public-card-announcement-long-names", undefined);
        setData("data-public-card-announcement-width", `${Math.round(width)}`);
      };
      const textLines = () => {
        const linesFor = (element: HTMLElement | null) => {
          if (!element || !element.textContent?.trim()) return 0;
          const range = document.createRange();
          range.selectNodeContents(element);
          return range.getClientRects().length;
        };
        return linesFor(textElement) + linesFor(supportElement);
      };
      if (compactDiffers && textElement) {
        setPx("width", maxWidth);
        setAnnouncementMeasureMode(false, maxWidth);
        textElement.textContent = message;
        if (supportElement) supportElement.textContent = supportingMessage ?? "";
        if (textLines() > maxTextLines) {
          const compactIndex = announcementOptions.findIndex((option) => option.compact);
          if (compactIndex > 0) announcementOptions.unshift(announcementOptions.splice(compactIndex, 1)[0]);
        }
      }
      const sameDisplayedNarration = hasNegationNarration
        && currentDisplayedCopy.eventId === narrationEventId
        && currentDisplayedCopy.latestCommittedEventId === narrationLatestCommittedEventId
        && currentDisplayedCopy.checkpointId === narrationCheckpointId
        && currentDisplayedCopy.phase === narrationPhase
        && currentDisplayedCopy.rootEffectState === narrationRootEffectState;
      if (sameDisplayedNarration) {
        const currentOptionIndex = announcementOptions.findIndex((option) =>
          option.message === currentDisplayedCopy.message && option.supporting === currentDisplayedCopy.supporting);
        if (currentOptionIndex > 0) announcementOptions.unshift(announcementOptions.splice(currentOptionIndex, 1)[0]);
      }
      let selected: { left: number; top: number; width: number; height: number; lines: number; message: string; supporting: string; compact: boolean } | null = null;
      let verticalMode: "above" | "below" = placementBand && centerCardStillOccupiesStage
        ? placementBand.centerY >= centerCardRect.top + centerCardRect.height / 2 ? "below" : "above"
        : placementBand?.verticalMode ?? preferredVerticalMode ?? "above";
      // Keep the established H4 centre within its accepted 16px vertical
      // tolerance while allowing a small obstacle-clearing adjustment. A
      // narrow phone can otherwise have no legal fit between parked history
      // cards and the activity chip even though the band has safe room nearby.
      const topOffsets = placementBand
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
        const centeredLeft = canonicalCenterX + centerOffset - width / 2;
        if (centeredLeft < safeLeft || centeredLeft + width > safeRight) return false;
        if (placementBand && !allowBandEscape && Math.abs(top + height / 2 - placementBand.centerY) > 16) return false;
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
            if (textElement) textElement.textContent = option.message;
            if (supportElement) supportElement.textContent = option.supporting;
            for (const width of widths) {
              setAnnouncementMeasureMode(option.compact, width);
              setPx("width", width);
              const height = copy.getBoundingClientRect().height;
              const top = placementBand.centerY - height / 2 + offset;
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
          if (textElement) textElement.textContent = option.message;
          if (supportElement) supportElement.textContent = option.supporting;
          for (const width of widths) {
            setAnnouncementMeasureMode(option.compact, width);
            setPx("width", width);
            const height = copy.getBoundingClientRect().height;
            const baseTop = placementBand
              ? placementBand.centerY - height / 2
              : verticalMode === "below"
                ? centerCardRect.top + centerCardRect.height + gap
                : centerCardRect.top - height - gap;
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

      const canReflowNegationBand = hasNegationNarration
        && (!lastValidPlacementRef.current
          || lastValidPlacementRef.current.viewerLayoutKey !== viewerLayoutKey
          || lastValidPlacementRef.current.layoutEpoch !== layoutEpoch);
      if (!selected && (stableCenterAnchor || canReflowNegationBand)) {
        // Keep the previous H4 position and preferred side when either fits.
        // If a TEST SWITCH or material table resize invalidates that baseline,
        // search the current viewer's safe area on both sides of the center
        // card. Protected Seat, Dock, Hand and control rects still apply.
        for (const option of announcementOptions) {
          if (textElement) textElement.textContent = option.message;
          if (supportElement) supportElement.textContent = option.supporting;
          for (const width of widths) {
            setAnnouncementMeasureMode(option.compact, width);
            setPx("width", width);
            const height = copy.getBoundingClientRect().height;
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

      if (!selected && !placementBand && centerCardStillOccupiesStage) {
        // A constrained short battlefield can place its one stable band just
        // below the reveal card. Skip every real or projected owner-card slot.
        const compactOption = announcementOptions.find((option) => option.compact) ?? announcementOptions[0];
        if (compactOption) {
          if (textElement) textElement.textContent = compactOption.message;
          if (supportElement) supportElement.textContent = compactOption.supporting;
          for (const width of widths) {
            setAnnouncementMeasureMode(compactOption.compact, width);
            setPx("width", width);
            const height = copy.getBoundingClientRect().height;
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
          if (textElement) textElement.textContent = option.message;
          if (supportElement) supportElement.textContent = option.supporting;
          for (const width of widths) {
            setAnnouncementMeasureMode(option.compact, width);
            setPx("width", width);
            const height = copy.getBoundingClientRect().height;
            const preferredTop = placementBand
              ? placementBand.centerY - height / 2
              : verticalMode === "below"
                ? centerCardRect.top + centerCardRect.height + gap
                : centerCardRect.top - height - gap;
            for (const centerOffset of centerOffsets) {
              const left = canonicalCenterX + centerOffset - width / 2;
              if (left < safeLeft || left + width > safeRight) continue;
              const candidateTops = new Set<number>(placementBand ? [preferredTop] : [
                safeTop,
                preferredTop,
                safeBottom - height,
                centerCardRect.top - height - gap,
                centerCardRect.top + centerCardRect.height + gap,
              ]);
              if (!placementBand) {
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
                if (placementBand && Math.abs(top + height / 2 - placementBand.centerY) > 16) continue;
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
        const textElement = copy.querySelector<HTMLElement>("b");
        const supportElement = copy.querySelector<HTMLElement>(".public-negation-narration-support");
        if (textElement && textElement.textContent !== incomingDisplayedCopy.message) textElement.textContent = incomingDisplayedCopy.message;
        if (supportElement && supportElement.textContent !== incomingDisplayedCopy.supporting) supportElement.textContent = incomingDisplayedCopy.supporting;
        const previous = lastValidPlacementRef.current;
        if (previous?.geometryIdentity === currentGeometryIdentity) setPx("width", previous.width);
        if (!retainLastValidPlacement(layoutEpoch) && copy.style.visibility !== "hidden") copy.style.visibility = "hidden";
        setData("data-public-card-announcement-fallback", "true");
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
      rememberPublicCardAnnouncementBand(bandKey, {
        left: selected.left,
        top: selected.top,
        width: selected.width,
        centerX: hasNegationNarration && placementBand ? placementBand.centerX : selected.left + selected.width / 2,
        centerY: hasNegationNarration && placementBand ? placementBand.centerY : selected.top + selected.height / 2,
        centerCardRect,
        verticalMode,
      });
      const nextDisplayedCopy: DisplayedPublicCardAnnouncement = {
        message: selected.message,
        supporting: selected.supporting,
        eventId: narrationEventId ?? eventId,
        latestCommittedEventId: narrationLatestCommittedEventId,
        checkpointId: narrationCheckpointId,
        phase: narrationPhase,
        rootEffectState: narrationRootEffectState,
        accessibleLabel: narrationAccessibleLabel,
      };
      commitDisplayedCopy(nextDisplayedCopy);
      setData("data-public-card-announcement-compact", selected.compact ? "true" : undefined);
      setData("data-public-card-announcement-tight-copy", hasNegationNarration && selected.width <= 224 ? "true" : undefined);
      setData("data-public-card-announcement-width", `${Math.round(selected.width)}`);
      setData("data-public-card-announcement-lines", `${selected.lines}`);
      setData("data-public-card-announcement-positioned", "true");
      setData("data-public-card-announcement-placement", verticalMode === "above" ? "center-band-above" : "center-band-below");
      setData("data-public-card-announcement-stability", undefined);
      if (copy.style.visibility !== "visible") copy.style.visibility = "visible";
      lastGeometryKeyRef.current = geometryKey;
      lastValidPlacementRef.current = {
        geometryIdentity: currentGeometryIdentity,
        layoutEpoch,
        viewerLayoutKey,
        left: selected.left,
        top: selected.top,
        width: selected.width,
        height: selected.height,
        compact: selected.compact,
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
    const anchor = getAnchor();
    anchorObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(schedule);
    if (anchor) anchorObserver?.observe(anchor, { attributes: true, attributeFilter: ["style", "data-harvest-root-parked"] });
    const harvestStage = display.closest<HTMLElement>(".play-table")?.querySelector<HTMLElement>(".harvest-choice-stage");
    if (harvestStage) anchorObserver?.observe(harvestStage, { attributes: true, attributeFilter: ["style"], childList: stableHarvestAnchor, subtree: stableHarvestAnchor });
    anchorObserver?.observe(display, { attributes: true, attributeFilter: ["data-public-card-layout-pending"] });
    const onResize = schedule;
    schedule();
    window.addEventListener("resize", onResize);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", onResize);
    viewport?.addEventListener("scroll", onResize);
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
    if (privateDrawAware && typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver((records) => {
        const affectsPrivateDraw = records.some((record) => {
          const target = record.target instanceof Element ? record.target : record.target.parentElement;
          if (target?.closest(".public-skill-event-announcement")) return false;
          if (target?.closest(".private-draw-content")) return true;
          return [...record.addedNodes, ...record.removedNodes].some((node) => node instanceof Element
            && (node.matches(".private-draw-content") || Boolean(node.querySelector(".private-draw-content"))));
        });
        if (!affectsPrivateDraw) return;
        for (const element of document.querySelectorAll<HTMLElement>(".private-draw-content")) resizeObserver?.observe(element);
        schedule();
      });
      // Observe only actual private-draw changes; rewriting this live region's
      // own text must not schedule another placement pass.
      mutationObserver.observe(display.closest<HTMLElement>(".game-shell") ?? document.body, { childList: true, subtree: true });
    }

    return () => {
      if (placementGeneration === placementGenerationRef.current) placementGenerationRef.current += 1;
      if (schedulePlacementRef.current === schedule) schedulePlacementRef.current = null;
      window.removeEventListener("resize", onResize);
      viewport?.removeEventListener("resize", onResize);
      viewport?.removeEventListener("scroll", onResize);
      if (placementFailureTimer !== null) window.clearTimeout(placementFailureTimer);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      anchorObserver?.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [anchorEventId, eventId, geometryKey, privateDrawAware, stableHarvestAnchor]);

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
    data-public-card-announcement-key={displayedCopy.eventId}
    data-public-card-announcement-copy-key={eventCopyKey}
    data-public-card-announcement-geometry-key={geometryKey}
    data-public-card-announcement-event-id={displayedCopy.eventId}
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
    <b aria-label={displayedCopy.accessibleLabel ?? displayedCopy.message}>{displayedCopy.message}</b>
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
      fallbackCardRect={null}
      stableCenterAnchor
      privateDrawAware
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
  resultReadRemainingMs,
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
  resultReadRemainingMs: number | null;
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
  const announcementCopy = publicCardAnnouncementCopy(action, activeNotice, activeActorName, activeActorId, sourceName, targetName, compactPlayerNamesById, activeEventId);
  const announcement = withPublicCardPhaseNotice(announcementCopy.message, action.settlement ? undefined : action.phaseNotice);
  const compactAnnouncement = announcementCopy.compactMessage || (!action.settlement && action.phaseNotice?.includes("NEGATION"))
    ? withPublicCardPhaseNotice(announcementCopy.compactMessage ?? announcementCopy.message, action.settlement ? undefined : action.phaseNotice, true)
    : undefined;

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
    const center = currentAction.publicCardEffectFrame && publicFrameJourneyEventIds.includes(currentAction.publicCardEffectFrame.eventId)
      ? battlefieldPublicEffectFrameCard(currentAction.publicCardEffectFrame.materials.length)
      : battlefieldCenterCard(REVEAL_CARD, { reservePlayerIds: [currentAction.sourceId, currentAction.targetId].filter((id): id is string => Boolean(id)) });
    const previousState = journeyRef.current;
    const sameInteraction = previousState.scopeKey === scopeKey;
    const viewerChanged = sameInteraction && previousState.viewerId !== viewerId;
    const previous = sameInteraction ? previousState.cards : [];
    const root = currentAction.cardFace && currentSourceName ? [{
      eventId: currentAction.rootEventId,
      actorId: currentAction.sourceId,
      actorName: currentSourceName,
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
      const parkedTarget = target ?? center;
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
            rect: phase === "parked" ? parkedTarget : phase === "reveal" ? center : prior.rect,
            moveStartedAtMs: null,
            layoutPending: phase === "parked" && !target,
            layoutChangeReason: "viewer-switch",
          };
        }
        if (latestNewResponseEventId && prior.eventId !== latestNewResponseEventId && prior.phase === "reveal") {
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const elapsed = prior.revealStartedAtMs == null ? 0 : Math.max(0, performance.now() - prior.revealStartedAtMs);
          rememberAttackDodgeJourneyLifecycle(
            attackDodgeJourneyLifecycleKey(roomCode, currentAction.rootEventId, scopeKey, prior.eventId),
            {
              phase: !target || reducedMotion ? "parked" : "move",
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
            phase: !target || reducedMotion ? "parked" as const : "move" as const,
            target: parkedTarget,
            rect: parkedTarget,
            revealStartedAtMs: null,
            revealElapsedMs: (prior.revealElapsedMs ?? 0) + elapsed,
            revealRemainingMs: 0,
            moveStartedAtMs: !target || reducedMotion ? null : performance.now(),
            layoutPending: !target,
            layoutChangeReason: measuredTarget ? "interrupted-by-new-committed-response" : "author-parking-unavailable-awaiting-remeasure",
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
          rect: prior.phase === "parked" ? parkedTarget : prior.phase === "reveal" ? center : prior.rect,
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
        rect: phase === "reveal" ? center : parkedTarget,
        target: parkedTarget,
        revealStartedAtMs: retainedReveal ? retained.revealStartedAtMs : retained?.revealStartedAtMs ?? null,
        revealStartedAtIso: retained?.revealStartedAtIso ?? null,
        revealElapsedMs: retained?.revealElapsedMs ?? 0,
        revealRemainingMs: retained?.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS,
        moveStartedAtMs: null,
        layoutPending: phase === "parked" && !target,
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
        rememberAttackDodgeJourneyLifecycle(
          attackDodgeJourneyLifecycleKey(roomCode, currentAction.rootEventId, scopeKey, previouslyProvenCard.eventId),
          {
            phase: !measuredTarget || reducedMotion ? "parked" : "move",
            revealStartedAtMs: null,
            revealStartedAtIso: previouslyProvenCard.revealStartedAtIso ?? null,
            revealElapsedMs: (previouslyProvenCard.revealElapsedMs ?? 0) + elapsed,
            revealRemainingMs: 0,
          },
        );
        nextCards.push({
          ...previouslyProvenCard,
          phase: !measuredTarget || reducedMotion ? "parked" : "move",
          target,
          rect: target,
          revealStartedAtMs: null,
          revealElapsedMs: (previouslyProvenCard.revealElapsedMs ?? 0) + elapsed,
          revealRemainingMs: 0,
          moveStartedAtMs: !measuredTarget || reducedMotion ? null : performance.now(),
          layoutPending: !measuredTarget,
          layoutChangeReason: measuredTarget ? "interrupted-by-new-committed-response" : "author-parking-unavailable-awaiting-remeasure",
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
    const layoutPending = nextCards.some((card) => card.layoutPending);
    const nextState: JourneyState = {
      scopeKey,
      viewerId,
      cards: nextCards,
      center,
      suppressTransitions: viewerChanged || previousState.suppressTransitions || previousState.layoutPending || layoutPending,
      layoutPending,
    };
    journeyRef.current = nextState;
    setJourney(nextState);
  }, [enabled, scopeKey, eventSignature, viewerId]);

  useEffect(() => {
    if (!enabled || !documentVisible || journey.scopeKey !== scopeKey
      || !activeJourneyCard || activePhase !== "reveal" || activeRevealStartedAtMs !== null) return;
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
  }, [enabled, documentVisible, journey.scopeKey, scopeKey, activeJourneyCard?.eventId, activePhase, activeRevealStartedAtMs]);

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
          const shouldMove = !reducedMotion && !current.layoutPending;
          const transitioned: JourneyCard = {
            ...candidate,
            phase: shouldMove ? "move" as const : "parked" as const,
            rect: candidate.target,
            revealStartedAtMs: null,
            revealElapsedMs: Math.max(STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS, (candidate.revealElapsedMs ?? 0) + visibleSegmentMs),
            revealRemainingMs: 0,
            moveStartedAtMs: shouldMove ? performance.now() : null,
            layoutChangeReason: shouldMove ? "four-second-reveal-complete" : current.layoutPending
              ? "reveal-complete-awaiting-seat-anchor" : "four-second-reveal-complete-reduced-motion",
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
        cards = withFirstQueuedAttackDodgeReveal(cards, current.center ?? battlefieldCenterCard());
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
    const observedAnchors = new WeakSet<Element>();
    const observePlayerAnchors = () => {
      document.querySelectorAll<HTMLElement>("[data-player-anchor]").forEach((anchor) => {
        if (observedAnchors.has(anchor)) return;
        observedAnchors.add(anchor);
        observer?.observe(anchor);
      });
    };
    const reposition = () => {
      const currentAction = actionRef.current;
      const current = journeyRef.current;
      const center = currentAction.publicCardEffectFrame?.eventId === currentAction.rootEventId
        ? battlefieldPublicEffectFrameCard(currentAction.publicCardEffectFrame.materials.length)
        : battlefieldCenterCard(REVEAL_CARD, { reservePlayerIds: [currentAction.sourceId, currentAction.targetId].filter((id): id is string => Boolean(id)) });
      const next = {
        ...current,
        center,
        suppressTransitions: true,
        layoutPending: false,
        cards: current.cards.map((card) => {
          const target = actorParkedCard(card.actorId);
          if (target) return {
            ...card,
            phase: card.phase === "move" ? "parked" as const : card.phase,
            target,
            rect: card.phase === "reveal" ? center : target,
            moveStartedAtMs: null,
            layoutPending: false,
            layoutChangeReason: "viewport-or-seat-anchor-reflow",
          };
          return {
            ...card,
            phase: card.phase === "move" ? "parked" as const : card.phase,
            layoutPending: card.phase === "parked" || card.phase === "move",
            layoutChangeReason: "viewport-or-seat-anchor-reflow",
          };
        }),
      };
      next.layoutPending = next.cards.some((card) => card.layoutPending);
      if (journeyGeometryMatches(current, next) && !current.layoutPending && !next.layoutPending) return;
      journeyRef.current = next;
      setJourney(next);
    };
    const scheduleReposition = () => {
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
        const table = document.querySelector<HTMLElement>(".play-table");
        const anchors = [...document.querySelectorAll<HTMLElement>("[data-player-anchor]")];
        const signature = [window.innerWidth, window.innerHeight, window.visualViewport?.width ?? 0, window.visualViewport?.height ?? 0,
          ...(table ? [table] : []), ...anchors].flatMap((elementOrValue) => {
          if (typeof elementOrValue === "number") return [elementOrValue];
          const rect = elementOrValue.getBoundingClientRect();
          return [rect.left, rect.top, rect.width, rect.height];
        }).map((value) => Math.round(value * 2) / 2).join(":");
        stableLayoutFrames = signature === previousLayoutSignature ? stableLayoutFrames + 1 : 0;
        previousLayoutSignature = signature;
        sampledLayoutFrames += 1;
        if (stableLayoutFrames < 2 && sampledLayoutFrames < 120) {
          reflowFrame = window.requestAnimationFrame(repositionAfterLayoutSettles);
          return;
        }
        reflowFrame = 0;
        reposition();
      };
      reflowFrame = window.requestAnimationFrame(repositionAfterLayoutSettles);
    };
    window.addEventListener("resize", scheduleReposition);
    window.addEventListener("scroll", scheduleReposition, true);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", scheduleReposition);
    observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleReposition);
    const shell = document.querySelector<HTMLElement>(".game-shell");
    if (shell) observer?.observe(shell);
    observePlayerAnchors();
    const mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver((records) => {
      const containsPlayerAnchor = (node: Node) => node instanceof Element
        && (node.matches("[data-player-anchor]") || Boolean(node.querySelector("[data-player-anchor]")));
      const anchorsChanged = records.some((record) => record.type === "attributes"
        || [...record.addedNodes, ...record.removedNodes].some(containsPlayerAnchor));
      if (anchorsChanged) {
        observePlayerAnchors();
        scheduleReposition();
      }
    });
    if (shell) mutationObserver?.observe(shell, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-player-anchor"],
    });
    scheduleReposition();
    return () => {
      window.removeEventListener("resize", scheduleReposition);
      window.removeEventListener("scroll", scheduleReposition, true);
      viewport?.removeEventListener("resize", scheduleReposition);
      observer?.disconnect();
      mutationObserver?.disconnect();
      window.cancelAnimationFrame(reflowFrame);
    };
  }, [enabled, hasAttackDodgeMotion, journey.scopeKey, scopeKey]);

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

  if (!enabled || !sourceName || journey.scopeKey !== scopeKey || !journey.center) return null;
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
    data-public-card-result-remaining-ms={resultReadRemainingMs ?? undefined}
  >
    {cards.filter((card) => card.phase !== "queued").map((card) => {
      const isCurrent = card.eventId === activeEventId;
      const isHistorical = Boolean(latestResponse && card.role === "root" && card.phase === "parked");
      return <PublicJourneyCard
        key={card.eventId}
        card={card}
        onInspectCard={onInspectCard}
        size={card.rect.width < REVEAL_CARD.width ? "thumbnail" : "reveal"}
        className={`${isCurrent ? "is-current" : ""} ${isHistorical ? "is-prior" : ""} ${card.role === "deflection" ? "is-deflection" : ""}`}
        primary={isCurrent}
        publicCardEffectFrame={card.eventId === action.publicCardEffectFrame?.eventId
          ? action.publicCardEffectFrame : undefined}
      />;
    })}
    <PublicCardAnnouncement
      eventId={activeEventId}
      eventCopyKey={publicCardAnnouncementCopyKey(action, activeEventId, activeActorId, roomCode)}
      geometryKey={publicAnnouncementGeometryKey(roomCode, viewerId)}
      copyLifecycleStage={publicCardAnnouncementLifecycleStage(action)}
      placementKey={publicCardAnnouncementPlacementKey(action, roomCode)}
      viewerLayoutKey={viewerId}
      anchorEventId={publicEffectFrameOwnsAnnouncementAnchor ? null : activeEventId}
      phase={publicEffectFrameOwnsAnnouncementAnchor ? "static" : activeJourneyCard?.phase ?? "static"}
      message={announcement}
      compactMessage={compactAnnouncement}
      accessibleLabel={announcementCopy.accessibleLabel}
      fallbackCardRect={publicEffectFrameOwnsAnnouncementAnchor && journey.center && action.publicCardEffectFrame
        ? battlefieldPublicEffectFrame(journey.center, action.publicCardEffectFrame.materials.length) : journey.center}
      keepCenterAnchorClear={publicEffectFrameOwnsAnnouncementAnchor}
      stableCenterAnchor={publicEffectFrameOwnsAnnouncementAnchor}
      preferredVerticalMode={publicEffectFrameOwnsAnnouncementAnchor ? "above" : undefined}
      phaseNotice={action.phaseNotice}
      outcome={action.settlement?.outcome}
      negationWaiting={Boolean(action.phaseNotice?.includes("NEGATION"))}
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
  if (rootCards.length && frameActorName) events.push({
    eventId: action.rootEventId,
    actorId: frameActorId,
    actorName: frameActorName,
    cardFace: rootCards[0],
    cardFaces: rootCards,
    ariaLabel: action.ariaLabel,
    role: "root",
    globalOrdinal: 1,
    phase: "parked",
    rect: { left: 0, top: 0, ...PARKED_CARD },
    target: { left: 0, top: 0, ...PARKED_CARD },
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
      rect: { left: 0, top: 0, ...PARKED_CARD },
      target: { left: 0, top: 0, ...PARKED_CARD },
    });
  }
  return events.sort((left, right) => (left.globalOrdinal ?? 0) - (right.globalOrdinal ?? 0));
}

type SingleTargetJourneyMotion = Extract<PublicCardDisplayMotion, { type: "negation" | "single-target" | "group-root" | "lust-cost" }>;

function singleTargetJourneyMotion(motion: PublicCardDisplayMotion | undefined): SingleTargetJourneyMotion | null {
  return motion?.type === "negation" || motion?.type === "single-target"
    || motion?.type === "group-root" || motion?.type === "lust-cost"
    ? motion
    : null;
}

function singleTargetParkingOptions(
  action: PublicCardDisplayAction,
  event: JourneyCard,
  harvestPoolVisible: boolean,
  extendNegationChainCollisionSlots = action.showNegationChainOrdinals === true,
): SeatHistoryCardParkingOptions {
  const harvest = action.cardFace?.kind === "BumperHarvest";
  const compactHarvestMini = harvest
    && typeof window !== "undefined" && window.matchMedia("(max-width: 520px)").matches;
  return {
    extendNegationChainCollisionSlots,
    ...(action.publicCardEffectFrame?.effectId === "hua_tuo_prodigal_healer" ? { avoidAuthorSeat: true } : {}),
    // All parked Harvest history (root and committed responses) uses the
    // same footprint. The 90×135 reveal remains a separate live phase.
    cardSize: compactHarvestMini ? HARVEST_MOBILE_RESPONSE_CARD : PARKED_CARD,
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
  responseHistoryOwnership = [],
  harvestChoiceActive,
  harvestPoolReadOnly,
  sourceName,
  targetName,
  compactPlayerNamesById,
  roomCode,
  viewerId,
  privateStealResult,
  resultReadRemainingMs,
  onInspectCard,
  onJourneySettled,
  onJourneyEventParked,
  onJourneyOwnershipChange,
}: {
  action: PublicCardDisplayAction;
  enabled: boolean;
  suppressAnnouncement?: boolean;
  retainHarvestHistory?: boolean;
  responseHistoryOwnership?: readonly { eventId: string; cardIds: readonly string[] }[];
  harvestChoiceActive: boolean;
  harvestPoolReadOnly: boolean;
  sourceName: string | null;
  targetName: string | null;
  compactPlayerNamesById: CompactPublicPlayerNames;
  roomCode: string;
  viewerId: string;
  privateStealResult?: ViewerPrivateStealResult | null;
  resultReadRemainingMs: number | null;
  onInspectCard?: (card: Card, trigger: HTMLButtonElement) => void;
  onJourneySettled?: (settlementEventId: string) => void;
  onJourneyEventParked?: (eventId: string) => void;
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
  const [journey, setJourney] = useState<SingleTargetJourneyState>({ scopeKey: "", viewerId: "", harvestPoolReadOnly: false, showNegationChainOrdinals: false, cards: [], center: null, suppressTransitions: false, layoutPending: false });
  const retainSingleTargetJourney = motion?.type === "single-target"
    && (action.cardKind === "Steal" || action.cardKind === "Dismantle")
    && journey.scopeKey === scopeKey
    && journey.cards.some((card) => card.role === "root" && card.eventId === action.rootEventId
      && card.cardFace.id === action.cardFace?.id && card.actorId === action.sourceId);
  const journeyEnabled = enabled || historyOnly || retainSingleTargetJourney;
  const journeyRef = useRef(journey);
  const actionRef = useRef(action);
  const sourceNameRef = useRef(sourceName);
  const viewerIdRef = useRef(viewerId);
  const mountedRef = useRef(false);
  const enabledRef = useRef(journeyEnabled);
  const documentVisibleRef = useRef(true);
  const [documentVisible, setDocumentVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  const notifiedSettlementEventIdRef = useRef<string | null>(null);
  const targetCardResultRef = useRef<HTMLDivElement | null>(null);
  const [targetCardResultPlacement, setTargetCardResultPlacement] = useState<TargetCardResultPlacement | null>(null);
  const parkedNotifiedEventIdsRef = useRef(new Set<string>());
  const traceSignaturesRef = useRef(new Map<string, string>());
  const parkingFailureSignaturesRef = useRef(new Map<string, string>());
  const placementFailureReporter = useCallback((event: JourneyCard): SeatHistoryCardParkingOptions => {
    const currentAction = actionRef.current;
    const harvestFailure = isBumperHarvest && (event.role === "root" || event.role === "response");
    const singleTargetRootFailure = event.role === "root"
      && (currentAction.cardKind === "Steal" || currentAction.cardKind === "Dismantle");
    return {
      onPlacementFailure: harvestFailure || singleTargetRootFailure
        ? (detail: Record<string, unknown>) => {
          const currentViewerId = viewerIdRef.current;
          const latestAction = actionRef.current;
          const key = `${currentViewerId}:${event.eventId}`;
          const signature = JSON.stringify(detail);
          if (parkingFailureSignaturesRef.current.get(key) === signature) return;
          parkingFailureSignaturesRef.current.set(key, signature);
          recordAttackDodgeUxTrace(harvestFailure ? "harvest-history-parking-failure" : "single-target-root-parking-failure", {
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
    const center = currentAction.publicCardEffectFrame
      ? battlefieldPublicEffectFrameCard(currentAction.publicCardEffectFrame.materials.length)
      : currentMotion.type === "lust-cost" && currentAction.lustCostFrame
        ? battlefieldLustCostCard()
      : battlefieldCenterCard(REVEAL_CARD, currentAction.showNegationChainOrdinals === true
        || currentMotion.type === "negation" || currentMotion.type === "group-root"
        ? { reserveSeatHistoryDepth: 2 }
        : { reservePlayerIds: [currentAction.sourceId, currentAction.targetId].filter((id): id is string => Boolean(id)) });
    const previous = journeyRef.current;
    const sameInteraction = previous.scopeKey === scopeKey;
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
      const actorIndex = actorIndexes.get(event.actorId) ?? 0;
      actorIndexes.set(event.actorId, actorIndex + 1);
      const localAuthor = event.actorId === viewerId
        && (currentAction.cardKind === "Steal" || currentAction.cardKind === "Dismantle");
      const parkingOptions = {
        ...singleTargetParkingOptions(action, event, harvestPoolAboveRoot, hasNegationChainParking),
        ...(event.actorId === viewerId ? { preferLocalAuthorDock: true } : {}),
        ...(localAuthor ? { anchorLocalHero: true, protectInteractionControls: true, protectSingleTargetControls: true } : {}),
        sameAuthorRects: measuredRectsByActor.get(event.actorId) ?? [],
        ...placementFailureReporter(event),
      };
      const measuredTarget = (old && !viewerChanged && !harvestLayoutChanged && !ordinalLayoutChanged && !hasNegationChainParking && !previous.layoutPending && !parkingOptions.protectInteractionControls
        ? old.target
        : seatHistoryCardParking(event.actorId, actorIndex, occupied, parkingOptions)?.rect
          ?? (!parkingOptions.protectInteractionControls
            ? actorParkedCard(event.actorId, actorIndex, event.actorId === viewerId)
            : null));
      const parkedSize = parkingOptions.cardSize ?? PARKED_CARD;
      // Retain the last real author target while a same-viewer measurement is
      // pending. A first-time missing target remains an unproven centre-sized
      // placeholder and is never treated as a valid parked position.
      const target = measuredTarget ?? old?.target ?? { left: center.left, top: center.top, ...parkedSize };
      if (measuredTarget) {
        parkingFailureSignaturesRef.current.delete(`${viewerIdRef.current}:${event.eventId}`);
        measuredTargetEventIds.add(event.eventId);
        occupied.push(measuredTarget);
        measuredRectsByActor.set(event.actorId, [...(measuredRectsByActor.get(event.actorId) ?? []), measuredTarget]);
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
          return {
            ...event,
            ...old,
            actorName: event.actorName,
            cardFace: event.cardFace,
            ariaLabel: event.ariaLabel,
            semanticLabel: event.semanticLabel,
            phase: reducedMotion ? "parked" : "move",
            rect: target,
            target,
            revealStartedAtMs: null,
            revealRemainingMs: 0,
            moveStartedAtMs: reducedMotion ? null : now,
            moveRemainingMs: reducedMotion ? 0 : MOVE_DURATION_MS,
            awaitingParkingTarget: false,
            parkingTargetViewerId: viewerId,
            layoutPending: false,
            layoutChangeReason: reducedMotion ? "four-second-reveal-complete-reduced-motion" : "author-parking-anchor-recovered",
          };
        }
        if (latestFreshResponseEventId && event.eventId !== latestFreshResponseEventId && old.phase === "reveal") {
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          return {
            ...event,
            ...old,
            actorName: event.actorName,
            cardFace: event.cardFace,
            ariaLabel: event.ariaLabel,
            semanticLabel: event.semanticLabel,
            phase: reducedMotion ? "parked" : "move",
            rect: target,
            moveStartedAtMs: reducedMotion ? null : now,
            moveRemainingMs: reducedMotion ? 0 : MOVE_DURATION_MS,
            awaitingParkingTarget: false,
            revealStartedAtMs: null,
            revealRemainingMs: 0,
            target,
            parkingTargetViewerId: measuredTarget ? viewerId : old.parkingTargetViewerId,
            layoutPending: !measuredTarget,
            layoutChangeReason: "interrupted-by-new-committed-response",
          };
        }
        return {
          ...event,
          ...old,
          actorName: event.actorName,
          cardFace: event.cardFace,
          ariaLabel: event.ariaLabel,
          semanticLabel: event.semanticLabel,
          rect: moveTargetChanged ? target
            : old.phase === "move" && !measuredTarget ? renderedJourneyCardRect(old.eventId) ?? old.rect
              : old.phase === "parked" ? target : old.phase === "reveal" ? center : old.rect,
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
          actorName: event.actorName,
          cardFace: event.cardFace,
          ariaLabel: event.ariaLabel,
          semanticLabel: event.semanticLabel,
          phase,
          rect: phase === "parked" ? target : phase === "reveal" ? center : old.rect,
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
        rect: phase === "parked" ? target : center,
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
    const layoutPending = cards.some((card) => !measuredTargetEventIds.has(card.eventId));
    const presentedCards = historyOnly
      ? cards.map((card) => ({
        ...card,
        phase: "parked" as const,
        rect: card.target,
        revealStartedAtMs: null,
        revealRemainingMs: 0,
        moveStartedAtMs: null,
        layoutChangeReason: card.layoutPending ? "inspector-history-retained-awaiting-author-anchor" : "inspector-history-retained",
      }))
      : viewerChanged ? cards : withFirstQueuedSingleTargetReveal(cards, center);
    const next: SingleTargetJourneyState = {
      scopeKey,
      viewerId,
      harvestPoolReadOnly,
      showNegationChainOrdinals: hasNegationChainParking,
      cards: presentedCards,
      center,
      suppressTransitions: viewerChanged || harvestLayoutChanged || ordinalLayoutChanged || hasNegationChainParking || previous.suppressTransitions,
      layoutPending,
    };
    journeyRef.current = next;
    setJourney(next);
  }, [enabled, journeyEnabled, historyOnly, harvestChoiceActive, harvestPoolAboveRoot, harvestRootPoolVisible, harvestPoolReadOnly, action.showNegationChainOrdinals, scopeKey, eventSignature, freshSignature, viewerId, placementFailureReporter]);

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
  const activePhase = activeCard?.phase ?? null;
  useEffect(() => {
    if (!journeyEnabled || !documentVisible || journey.scopeKey !== scopeKey || !activeCard || !activePhase) return;
    const timers = journey.cards.flatMap((card) => {
      if (card.phase === "reveal" && card.revealStartedAtMs != null) {
        const delay = Math.max(0, (card.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS)
          - Math.max(0, performance.now() - card.revealStartedAtMs));
        return [window.setTimeout(() => {
          if (!mountedRef.current) return;
          setJourney((current) => {
            const currentCard = current.cards.find((candidate) => candidate.eventId === card.eventId);
            if (current.scopeKey !== scopeKey || !currentCard || currentCard.phase !== "reveal") return current;
            const now = performance.now();
            if (currentCard.layoutPending) {
              const cards = current.cards.map((candidate) => candidate.eventId === card.eventId
                ? {
                  ...candidate,
                  revealStartedAtMs: null,
                  revealElapsedMs: (candidate.revealElapsedMs ?? 0) + Math.max(0, now - (candidate.revealStartedAtMs ?? now)),
                  revealRemainingMs: 0,
                  awaitingParkingTarget: true,
                  layoutChangeReason: "reveal-complete-awaiting-safe-author-slot",
                }
                : candidate);
              const next = { ...current, cards };
              journeyRef.current = next;
              return next;
            }
            const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const shouldMove = !reducedMotion && !currentCard.layoutPending;
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
                  : reducedMotion ? "four-second-reveal-complete-reduced-motion" : "four-second-reveal-complete",
              }
              : candidate);
            const next = { ...current, cards };
            journeyRef.current = next;
            return next;
          });
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
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      const shouldPause = !enabledRef.current || !documentVisibleRef.current || document.visibilityState !== "visible";
      if (!shouldPause) return;
      const current = journeyRef.current;
      if (current.scopeKey !== scopeKey) return;
      const now = performance.now();
      let changed = false;
      const cards = current.cards.map((card) => {
        if (card.phase === "reveal" && card.revealStartedAtMs != null) {
          changed = true;
          const elapsed = Math.max(0, now - card.revealStartedAtMs);
          return {
            ...card,
            revealStartedAtMs: null,
            revealElapsedMs: (card.revealElapsedMs ?? 0) + elapsed,
            revealRemainingMs: Math.max(0, (card.revealRemainingMs ?? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS) - elapsed),
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
  }, [journeyEnabled, documentVisible, journey.cards, journey.scopeKey, scopeKey, activeCard?.eventId, activePhase]);

  useEffect(() => {
    if (!journeyEnabled || !documentVisible || journey.scopeKey !== scopeKey || !activeCard || activeCard.phase !== "reveal"
      || activeCard.revealStartedAtMs != null || activeCard.awaitingParkingTarget) return;
    let firstFrame = 0;
    let secondFrame = 0;
    const markFirstPaint = () => {
      if (!documentVisibleRef.current || document.visibilityState !== "visible" || !hasPaintedLargePublicCard(activeCard.eventId, REVEAL_CARD)) {
        firstFrame = window.requestAnimationFrame(markFirstPaint);
        return;
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
    };
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(markFirstPaint);
    });
    return () => { window.cancelAnimationFrame(firstFrame); window.cancelAnimationFrame(secondFrame); };
  }, [journeyEnabled, documentVisible, journey.scopeKey, scopeKey, activeCard?.eventId, activeCard?.phase, activeCard?.revealStartedAtMs, activeCard?.awaitingParkingTarget]);

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
    const parkingSelectors = () => {
      const action = actionRef.current;
      const isSingleTarget = action.cardKind === "Steal" || action.cardKind === "Dismantle";
      return seatHistoryParkingProtectedSelectors({
        protectInteractionControls: isSingleTarget,
        protectSingleTargetControls: isSingleTarget,
      });
    };
    const layoutElements = () => [...new Set([
      document.querySelector<HTMLElement>(".play-table"),
      document.querySelector<HTMLElement>(".player-board"),
      ...document.querySelectorAll<HTMLElement>("[data-player-anchor]"),
      ...(isBumperHarvest ? [...document.querySelectorAll<HTMLElement>("[data-public-card-announcement='true']")] : []),
      ...parkingSelectors().flatMap((selector) => [...document.querySelectorAll<HTMLElement>(selector)]),
    ].filter((element): element is HTMLElement => Boolean(element)))];
    const readLayoutSignature = () => [
      window.innerWidth,
      window.innerHeight,
      window.visualViewport?.width ?? 0,
      window.visualViewport?.height ?? 0,
      window.visualViewport?.offsetLeft ?? 0,
      window.visualViewport?.offsetTop ?? 0,
      window.visualViewport?.scale ?? 1,
      ...layoutElements().flatMap((element) => {
        const rect = element.getBoundingClientRect();
        return [element.dataset.playerAnchor ?? "", element.className, element.dataset.sideColumn ?? "",
          rect.left, rect.top, rect.width, rect.height]
          .map((value) => typeof value === "number" ? Math.round(value * 2) / 2 : value);
      }),
    ].join(":");
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
        const center = currentAction.publicCardEffectFrame
          ? battlefieldPublicEffectFrameCard(currentAction.publicCardEffectFrame.materials.length)
          : currentMotion?.type === "lust-cost" && currentAction.lustCostFrame
            ? battlefieldLustCostCard()
            : battlefieldCenterCard(REVEAL_CARD, currentAction.showNegationChainOrdinals === true
              || currentMotion?.type === "negation" || currentMotion?.type === "group-root"
            ? { reserveSeatHistoryDepth: 2 }
            : { reservePlayerIds: [currentAction.sourceId, currentAction.targetId].filter((id): id is string => Boolean(id)) });
        const occupied: CardRect[] = [];
        const measuredRectsByActor = new Map<string, CardRect[]>();
        const actorIndexes = new Map<string, number>();
        const measuredTargets = new Map<string, CardRect>();
        const cards = current.cards.map((card) => {
          const actorIndex = actorIndexes.get(card.actorId) ?? 0;
          actorIndexes.set(card.actorId, actorIndex + 1);
          const localAuthor = card.actorId === viewerIdRef.current
            && (currentAction.cardKind === "Steal" || currentAction.cardKind === "Dismantle");
          const parkingOptions = {
            ...singleTargetParkingOptions(currentAction, card, harvestPoolAboveRoot),
            ...(card.actorId === viewerIdRef.current ? { preferLocalAuthorDock: true } : {}),
            ...(localAuthor ? { anchorLocalHero: true, protectInteractionControls: true, protectSingleTargetControls: true } : {}),
            sameAuthorRects: measuredRectsByActor.get(card.actorId) ?? [],
            ...placementFailureReporter(card),
          };
          const measuredTarget = seatHistoryCardParking(
            card.actorId,
            actorIndex,
            occupied,
            parkingOptions,
          )?.rect;
          const parkedSize = parkingOptions.cardSize ?? PARKED_CARD;
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
          const waitingRevealWithTarget = card.phase === "reveal" && card.awaitingParkingTarget && Boolean(measuredTarget);
          const reducedMotion = waitingRevealWithTarget && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          return {
            ...card,
            parkingTargetViewerId: measuredTarget ? viewerIdRef.current : card.parkingTargetViewerId,
            phase: waitingRevealWithTarget ? reducedMotion ? "parked" as const : "move" as const : card.phase,
            target,
            rect: waitingRevealWithTarget ? target
              : card.phase === "reveal" ? center
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
            layoutPending: !measuredTarget,
            layoutChangeReason: waitingRevealWithTarget
              ? reducedMotion ? "four-second-reveal-complete-reduced-motion" : "author-parking-anchor-recovered"
              : measuredTarget ? "viewport-resize-author-anchor-measured" : "author-parking-unavailable-awaiting-remeasure",
          };
        });
        const layoutPending = cards.some((card) => !measuredTargets.has(card.eventId));
        if (layoutPending && sampledFrames < 8) {
          resizeFrame = window.requestAnimationFrame(measureWhenSettled);
          return;
        }
        committedLayoutSignature = layoutSignature;
        pendingLayoutSignature = "";
        const unchanged = current.center && cardRectsMatch(current.center, center)
          && cards.length === current.cards.length
          && current.layoutPending === layoutPending
          && cards.every((card, index) => card.eventId === current.cards[index].eventId
            && card.phase === current.cards[index].phase
            && cardRectsMatch(card.rect, current.cards[index].rect)
            && cardRectsMatch(card.target, current.cards[index].target));
        if (unchanged) return;
        const next = { ...current, center, cards, suppressTransitions: true, layoutPending };
        journeyRef.current = next;
        setJourney(next);
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
      const relevantSelectors = ["[data-player-anchor]", ...parkingSelectors()];
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
    if (isBumperHarvest && typeof MutationObserver !== "undefined") {
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
    const onViewportResize = () => reflow();
    window.addEventListener("resize", onViewportResize);
    window.visualViewport?.addEventListener("resize", onViewportResize);
    return () => {
      window.removeEventListener("resize", onViewportResize);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
      layoutObserver?.disconnect();
      mutationObserver?.disconnect();
      announcementObserver?.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      window.clearTimeout(placementRetryTimer);
    };
  }, [journeyEnabled, harvestChoiceActive, harvestPoolAboveRoot, harvestRootPoolVisible, harvestPoolReadOnly, isBumperHarvest, journey.layoutPending, journey.scopeKey, scopeKey, placementFailureReporter]);

  const currentCard = activeCard ?? journey.cards.find((card) => card.eventId === activeEventId) ?? null;
  const allParked = !journey.layoutPending && journey.cards.length > 0 && journey.cards.every((card) => card.phase === "parked");
  // A viewer switch changes the seat projection before the layout effect has
  // measured the new author's anchor. Never paint a previous viewer's card
  // coordinates against the new roster, even for one rendered frame.
  const viewerLayoutPending = journey.scopeKey === scopeKey && journey.viewerId !== viewerId;
  const publicCopyViewerGeometryReady = journey.scopeKey === scopeKey
    && journey.viewerId === viewerId
    && journey.center !== null;
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
      onJourneyEventParked?.(card.eventId);
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
  const announcementEventId = groupRootStageOwnsCopy
    ? action.settlement?.eventId ?? action.rootEventId
    : activeEventId;
  const publicEffectFrameOwnsAnnouncementAnchor = (action.publicCardEffectFrame?.effectId === "hua_tuo_prodigal_healer"
    || action.publicCardEffectFrame?.effectId === "hua_tuo_first_aid"
    || action.publicCardEffectFrame?.effectId === "gan_ning_qixi"
    || action.publicCardEffectFrame?.effectId === "yue_jin_dauntless"
    || action.publicCardEffectFrame?.effectId === "lady_gan_divine_wisdom"
    || action.publicCardEffectFrame?.effectId === "sun_quan_zhiheng"
    || action.publicCardEffectFrame?.effectId === "sun_shangxiang_betrothment"
    || action.publicCardEffectFrame?.effectId === "sima_yi_guicai") && motion?.type !== "lust-cost";
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
  );
  const harvestNegationPresentation = isHarvestNegationPresentation(action);
  const negationNarration = harvestNegationPresentation ? undefined : action.publicNegationNarration;
  const announcementPhaseNotice = action.settlement || harvestNegationPresentation
    ? undefined
    : action.phaseNotice;
  const announcement = negationNarration?.headline ?? withPublicCardPhaseNotice(announcementCopy.message, announcementPhaseNotice);
  const compactAnnouncement = negationNarration?.compactHeadline ?? ((announcementCopy.compactMessage || (!action.settlement && !harvestNegationPresentation && action.phaseNotice?.includes("NEGATION")))
    ? withPublicCardPhaseNotice(announcementCopy.compactMessage ?? announcementCopy.message, announcementPhaseNotice, true)
    : undefined);
  const targetCardMovement = action.settlement?.targetCardMovement;
  const publicTargetCardResultFace = targetCardMovement?.affectedCardFace;
  const privateTargetCardResultFace = action.settlement?.outcome === "STEAL_RESOLVED"
    && targetCardMovement?.sourceZone === "hand"
    && privateStealResult?.semantics === "PRIVATE_PROVEN"
    && privateStealResult.roomCode === roomCode
    && privateStealResult.eventId === action.settlement.eventId
    && privateStealResult.rootEventId === action.rootEventId
    && privateStealResult.rootResolutionId === action.settlement.rootResolutionId
    && privateStealResult.sourceId === action.sourceId
    && action.targetId !== null
    && privateStealResult.targetId === action.targetId
    && privateStealResult.sourceZone === "hand"
    && viewerId === action.sourceId
    ? privateStealResult.card
    : undefined;
  const targetCardResultFace = publicTargetCardResultFace ?? privateTargetCardResultFace;
  const targetCardResultProofValid = action.settlement?.outcome === "DISMANTLE_RESOLVED"
    ? targetCardMovement?.destinationZone === "discard"
      && targetCardMovement.destinationOwnerId === null
      && action.targetId !== null
      && targetCardMovement.affectedCardOwnerId === (targetCardMovement.sourceZone === "judgement" ? null : action.targetId)
      && Boolean(targetCardResultFace)
    : action.settlement?.outcome === "STEAL_RESOLVED"
      && targetCardMovement?.destinationZone === "hand"
      && targetCardMovement.destinationOwnerId === action.sourceId
      && action.targetId !== null
      && (targetCardMovement.sourceZone === "hand"
        ? !publicTargetCardResultFace && targetCardMovement.affectedCardOwnerId === action.targetId
        : (targetCardMovement.sourceZone === "equipment" || targetCardMovement.sourceZone === "judgement")
          && Boolean(publicTargetCardResultFace)
          && (targetCardMovement.sourceZone === "judgement"
            ? targetCardMovement.affectedCardOwnerId === null
            : targetCardMovement.affectedCardOwnerId === action.targetId));
  const targetCardResultActive = Boolean(action.settlement?.targetCardResultActive
    && targetCardResultProofValid && allParked && !viewerLayoutPending);
  const targetCardResultEventId = action.settlement?.eventId ?? null;
  const targetCardResultCenter = journey.center;
  const currentTargetCardResultPlacement = targetCardResultPlacement?.eventId === targetCardResultEventId
    ? targetCardResultPlacement
    : null;
  const fallbackResultLift = typeof window !== "undefined" && window.innerWidth <= 480
    ? Math.min(70, Math.max(40, Math.round(window.innerHeight * 0.065)))
    : 0;
  const resultViewportWidth = typeof window === "undefined" ? 360 : window.innerWidth;
  const fallbackResultWidth = Math.min(resultViewportWidth * 0.9, 360);
  const fallbackResultLeft = targetCardResultCenter
    ? Math.max(8, Math.min(resultViewportWidth - fallbackResultWidth - 8,
      targetCardResultCenter.left + targetCardResultCenter.width / 2 - fallbackResultWidth / 2))
    : 8;
  useLayoutEffect(() => {
    if (!targetCardResultActive || !targetCardResultEventId || !targetCardResultCenter) return;
    const element = targetCardResultRef.current;
    if (!element) return;
    let frame = 0;
    const protectedSelector = [
      ".player-board [data-player-anchor]",
      ".visible-countdown",
      ".stage-system-cluster",
      ".public-activity-chip",
      ".public-card-journey-card",
      ".card-pool-target-stage",
      ".opponent-inspection-floating-shell",
      ".card-details-panel",
      ".hero-details-panel",
      ".local-player-dock",
    ].join(",");
    let observer: ResizeObserver | null = null;
    const observeProtectedSurfaces = () => {
      document.querySelectorAll<HTMLElement>(protectedSelector).forEach((target) => observer?.observe(target));
    };
    const measure = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        observeProtectedSurfaces();
        const next = measureTargetCardResultPlacement(element, targetCardResultCenter);
        setTargetCardResultPlacement((current) => current?.eventId === targetCardResultEventId
          && Math.abs(current.left - next.left) < 0.5
          && Math.abs(current.top - next.top) < 0.5
          && current.limited === next.limited
          && current.limitationReason === next.limitationReason
          && JSON.stringify(current.diagnostic) === JSON.stringify(next.diagnostic)
          ? current
          : { ...next, eventId: targetCardResultEventId });
      });
    };
    observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    const table = document.querySelector<HTMLElement>(".play-table");
    const dock = document.querySelector<HTMLElement>(".local-player-dock");
    const board = table?.querySelector<HTMLElement>(".player-board");
    [element, table, dock, table?.querySelector<HTMLElement>(".stage-system-cluster"), table?.querySelector<HTMLElement>(".public-activity-chip")]
      .filter((target): target is HTMLElement => Boolean(target))
      .forEach((target) => observer?.observe(target));
    observeProtectedSurfaces();
    const boardObserver = typeof MutationObserver === "undefined" || !board
      ? null
      : new MutationObserver(measure);
    boardObserver?.observe(board!, { attributes: true, childList: true, subtree: true, attributeFilter: ["class", "style", "data-player-anchor"] });
    const overlayObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver((records) => {
      const changedProtectedSurface = records.some((record) => {
        if (record.type === "attributes" && record.target instanceof HTMLElement) {
          return record.target.matches(protectedSelector) || Boolean(record.target.closest(protectedSelector));
        }
        return [...record.addedNodes, ...record.removedNodes].some((node) => node instanceof HTMLElement
          && (node.matches(protectedSelector) || Boolean(node.querySelector(protectedSelector))));
      });
      if (changedProtectedSurface) measure();
    });
    overlayObserver?.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style", "aria-hidden", "hidden"],
      childList: true,
      subtree: true,
    });
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      boardObserver?.disconnect();
      overlayObserver?.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, [targetCardResultActive, targetCardResultCenter, targetCardResultEventId]);
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
    ...(targetCardResultActive && targetCardResultFace && action.settlement?.eventId
      ? [{ eventId: action.settlement.eventId, cardIds: [targetCardResultFace.id] }]
      : []),
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
    // pending without transferring ownership to the legacy sequence renderer.
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
  if (!journeyEnabled || !sourceName || journey.scopeKey !== scopeKey || !journey.center) return null;
  return <section
    className={`public-card-display public-card-display-journey${harvestPoolAboveRoot ? " is-harvest-pool-active" : ""}${historyOnly ? " is-harvest-history-passive" : ""}${showNegationChainOrdinals ? " is-negation-chain-ordinal" : ""}${action.settlement?.exiting || action.publicCounterRead?.exiting ? " is-exiting" : ""}${journey.suppressTransitions ? " is-reflowing" : ""}${journey.layoutPending ? " is-layout-pending" : ""}${viewerLayoutPending ? " is-viewer-layout-pending" : ""}`}
    data-public-card-display="true"
    data-public-card-renderer-kind="single-target-journey"
    data-public-card-ready="true"
    data-public-card-action-key={action.key}
    data-public-card-motion={motion?.type ?? "single-target"}
    data-public-card-viewer-id={viewerId}
    data-public-card-layout-pending={journey.layoutPending || viewerLayoutPending ? "true" : "false"}
    data-public-card-layout-viewer-id={journey.viewerId || undefined}
    data-public-card-harvest-active={harvestRootPoolVisible ? "true" : undefined}
    data-public-card-harvest-history-passive={historyOnly ? "true" : undefined}
    data-public-card-ordinal-context={showNegationChainOrdinals ? "negation-chain" : undefined}
    data-public-card-event-id={activeEventId}
    data-public-card-root-event-id={action.rootEventId}
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
    data-public-card-settlement-card-id={allParked ? action.settlement?.targetCardMovement?.affectedCardFace?.id : undefined}
    data-public-card-target-result-active={targetCardResultActive ? "true" : undefined}
    data-public-card-target-result-read-started-at-ms={targetCardResultActive ? action.settlement?.targetCardResultReadStartedAtMs : undefined}
    data-public-card-result-remaining-ms={resultReadRemainingMs ?? undefined}
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
      />;
    })}
    <ol className="duel-public-card-history-accessible" aria-label={showNegationChainOrdinals ? "Chronological Negation chain history" : "Chronological public card history"}>
      {incoming.map((event) => <li key={event.eventId} value={showNegationChainOrdinals || isBumperHarvest ? event.globalOrdinal : undefined}>
        {showNegationChainOrdinals
          ? `Negation chain step ${event.globalOrdinal}: ${event.ariaLabel}`
          : isBumperHarvest ? `Public card event ${event.globalOrdinal}: ${event.ariaLabel}` : event.ariaLabel}
      </li>)}
    </ol>
    {targetCardResultActive && action.settlement?.eventId && <div
      ref={targetCardResultRef}
      className="public-target-card-result"
      role="status"
      aria-live="polite"
      aria-label={announcementCopy.accessibleLabel ?? announcementCopy.message}
      data-public-card-target-result="true"
      data-public-card-target-result-event-id={action.settlement.eventId}
      data-public-card-target-result-placement-ready={currentTargetCardResultPlacement ? "true" : "false"}
      data-public-card-target-result-placement-limited={currentTargetCardResultPlacement?.limited ? "true" : undefined}
      data-public-card-target-result-placement-reason={currentTargetCardResultPlacement?.limitationReason}
      data-public-card-target-result-placement-geometry={currentTargetCardResultPlacement?.diagnostic
        ? JSON.stringify(currentTargetCardResultPlacement.diagnostic)
        : undefined}
      data-public-card-target-result-placement-offset-px={targetCardResultCenter
        ? Math.round((currentTargetCardResultPlacement?.top ?? targetCardResultCenter.top - fallbackResultLift) - targetCardResultCenter.top)
        : undefined}
      style={{
        left: `${currentTargetCardResultPlacement?.left ?? fallbackResultLeft}px`,
        top: `${currentTargetCardResultPlacement?.top ?? journey.center.top - fallbackResultLift}px`,
      }}
    >
      <div
        className="public-target-card-result__card"
        data-public-card-target-result-card-event-id={action.settlement.eventId}
        data-public-card-target-result-card-id={targetCardResultFace?.id}
        aria-hidden={targetCardResultFace ? undefined : true}
      >
        {targetCardResultFace
          ? <CardFace card={targetCardResultFace} settlementCardId={targetCardResultFace.id} />
          : <span className="public-target-card-result__back" />}
      </div>
      <p
        className="public-target-card-result__copy"
        data-public-card-target-result-copy-event-id={action.settlement.eventId}
      >{announcementCopy.message}</p>
    </div>}
    {!historyOnly && !suppressAnnouncement && !targetCardResultActive && <PublicCardAnnouncement
      eventId={negationNarration?.eventId ?? (motion?.type === "lust-cost" && action.lustCostFrame ? action.lustCostFrame.activationEventId : announcementEventId)}
      eventCopyKey={publicCardAnnouncementCopyKey(
        action,
        negationNarration?.eventId ?? (motion?.type === "lust-cost" && action.lustCostFrame ? action.lustCostFrame.activationEventId : announcementEventId),
        groupRootStageOwnsCopy ? action.sourceId : currentCard?.actorId ?? action.sourceId,
        roomCode,
      )}
      geometryKey={publicAnnouncementGeometryKey(roomCode, viewerId)}
      copyLifecycleStage={publicCardAnnouncementLifecycleStage(action)}
      placementKey={`${publicCardAnnouncementPlacementKey(action)}${harvestPoolVisible ? ":harvest-public-pool" : ""}`}
      viewerLayoutKey={harvestPoolVisible ? "public-harvest" : viewerId}
      anchorEventId={harvestPoolVisible || groupRootStageOwnsCopy || publicEffectFrameOwnsAnnouncementAnchor ? null : activeEventId}
      phase={harvestPoolVisible || publicEffectFrameOwnsAnnouncementAnchor ? "static" : announcementAnchorCard?.phase ?? "static"}
      message={announcement}
      compactMessage={compactAnnouncement}
      accessibleLabel={action.publicActivityMessage && motion?.type === "lust-cost"
        ? appendAnnouncementContext(announcementCopy.accessibleLabel ?? announcementCopy.message,
          action.publicActivityAccessibleMessage ?? action.publicActivityMessage)
        : announcementCopy.accessibleLabel}
      supportingMessage={negationNarration?.supportingMessage ?? (motion?.type === "lust-cost" ? action.publicActivityMessage : undefined)}
      compactSupportingMessage={negationNarration?.compactSupportingMessage ?? (motion?.type === "lust-cost" ? action.publicActivityMessage : undefined)}
      negationNarration={negationNarration}
      fallbackCardRect={harvestPoolVisible
        ? journey.center
      : motion?.type === "lust-cost" && journey.center
        ? battlefieldLustDuelAnnouncementAnchor(journey.center)
        : publicEffectFrameOwnsAnnouncementAnchor && journey.center && action.publicCardEffectFrame
          ? battlefieldPublicEffectFrame(journey.center, action.publicCardEffectFrame.materials.length)
        : motion?.type === "group-root" && !groupRootCenterIsStillOccupied ? undefined : journey.center}
      phaseNotice={negationNarration ? undefined : action.phaseNotice}
      outcome={allParked ? action.settlement?.outcome : undefined}
      negationWaiting={Boolean(negationNarration || action.phaseNotice?.includes("NEGATION"))}
      stableCenterAnchor={motion?.type === "lust-cost"}
      keepCenterAnchorClear={publicEffectFrameOwnsAnnouncementAnchor}
      stableHarvestAnchor={harvestPoolVisible}
      // The banner validates current-viewer geometry independently; thumbnail
      // parking must not hide this separately placeable public announcement.
      ignoreJourneyLayoutPending
      viewerGeometryReady={publicCopyViewerGeometryReady}
      preferredVerticalMode={harvestPoolVisible || publicEffectFrameOwnsAnnouncementAnchor ? "above" : motion?.type === "lust-cost" ? "below" : undefined}
    />}
  </section>;
}

type DuelJourneyEvent = Pick<JourneyCard,
  "eventId" | "actorId" | "actorName" | "cardFace" | "cardFaces" | "ariaLabel" | "role" | "semanticLabel" | "globalOrdinal"
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
};

function duelJourneyEvents(action: PublicCardDisplayAction, sourceName: string | null): DuelJourneyEvent[] {
  const events: DuelJourneyEvent[] = [];
  if (action.cardFace && sourceName) events.push({
    eventId: action.rootEventId,
    actorId: action.sourceId,
    actorName: sourceName,
    cardFace: action.cardFace,
    cardFaces: [action.cardFace],
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
  retainHistoryDuringInspection = false,
  sourceName,
  targetName,
  compactPlayerNamesById,
  roomCode,
  viewerId,
  viewerSeat,
  resultReadRemainingMs,
  onInspectCard,
  onJourneyEventParked,
}: {
  action: PublicCardDisplayAction;
  enabled: boolean;
  retainHistoryDuringInspection?: boolean;
  sourceName: string | null;
  targetName: string | null;
  compactPlayerNamesById: CompactPublicPlayerNames;
  roomCode: string;
  viewerId: string;
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
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const right = left + (viewport?.width ?? window.innerWidth);
      const bottom = top + (viewport?.height ?? window.innerHeight);
      return rect.width > 0 && rect.height > 0 && rect.right > left && rect.left < right
        && rect.bottom > top && rect.top < bottom;
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
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", schedulePaintCheck);
    viewport?.addEventListener("scroll", schedulePaintCheck);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", schedulePaintCheck);
      window.removeEventListener("resize", schedulePaintCheck);
      viewport?.removeEventListener("resize", schedulePaintCheck);
      viewport?.removeEventListener("scroll", schedulePaintCheck);
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
  const responseSignature = incoming.map((event) => `${event.eventId}:${event.globalOrdinal ?? 0}`).join(",");
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
    const lustRootIsCurrent = latestFreshEvent?.role === "root"
      || (!latestFreshEvent && events.at(-1)?.role === "root");
    const center = currentAction.publicCardEffectFrame && currentMotion.type === "lust-duel" && lustRootIsCurrent
      ? battlefieldPublicEffectFrameCard(currentAction.publicCardEffectFrame.materials.length)
      : currentMotion.type === "lust-duel" && currentAction.lustCostFrame && lustRootIsCurrent
        ? battlefieldLustCostCard()
      : battlefieldCenterCard(DUEL_REVEAL_CARD, { reservePlayerIds: [currentAction.sourceId, currentAction.targetId].filter((id): id is string => Boolean(id)) });
    const previous = journeyRef.current;
    const sameInteraction = previous.scopeKey === scopeKey;
    const viewerChanged = sameInteraction && previous.viewerId !== viewerId;
    const preserveTargets = sameInteraction && !viewerChanged;
    const priorById = new Map(previous.cards.map((card) => [card.eventId, card]));
    const latestFreshEventId = latestFreshEvent?.eventId ?? null;
    const targets = duelParkingTargets(events, preserveTargets ? previous.cards : []);
    const measuredTargetEventIds = new Set(targets.keys());
    const cards = events.flatMap((event) => {
      const old = priorById.get(event.eventId);
      const target = targets.get(event.eventId) ?? {
        rect: old?.target ?? center,
        side: old?.parkingSide ?? "top" as const,
      };
      if (old && preserveTargets) {
        const updated: DuelJourneyCard = {
          ...old,
          actorName: event.actorName,
          cardFace: event.cardFace,
          ariaLabel: event.ariaLabel,
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
          rect: phase === "parked" ? target.rect : phase === "reveal" ? center : old.rect,
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
        rect: phase === "reveal" ? center : target.rect,
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
    const cardsWithReveal = viewerChanged ? cards : withFirstQueuedDuelReveal(cards, center, "public-event-committed");
    const layoutPending = cardsWithReveal.some((card) => card.layoutPending);
    const next: DuelJourneyState = {
      scopeKey,
      viewerId,
      viewerSeat,
      cards: cardsWithReveal,
      center,
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
    let firstFrame = 0;
    let secondFrame = 0;
    const markFirstPaint = () => {
      if (!documentVisibleRef.current || document.visibilityState !== "visible" || !hasPaintedLargePublicCard(activeCardEventId, DUEL_REVEAL_CARD)) {
        firstFrame = window.requestAnimationFrame(markFirstPaint);
        return;
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
    };
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(markFirstPaint);
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
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
        ? battlefieldPublicEffectFrameCard(currentAction.publicCardEffectFrame.materials.length)
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
    const readLayoutSignature = () => {
      const elements = [
        document.querySelector<HTMLElement>(".play-table"),
        document.querySelector<HTMLElement>(".player-board"),
        document.querySelector<HTMLElement>(".local-player-dock"),
        ...document.querySelectorAll<HTMLElement>("[data-player-anchor]"),
      ].filter((element): element is HTMLElement => Boolean(element));
      return [window.innerWidth, window.innerHeight, window.visualViewport?.width ?? 0,
        window.visualViewport?.height ?? 0, window.visualViewport?.scale ?? 1,
        ...elements.flatMap((element) => {
          const rect = element.getBoundingClientRect();
          return [rect.left, rect.top, rect.width, rect.height].map((value) => Math.round(value * 2) / 2);
        })].join(":");
    };
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
        const currentAction = actionRef.current;
        const currentMotion = currentAction.motion;
        const events = duelJourneyEvents(currentAction, sourceNameRef.current);
        const fresh = new Set(currentMotion?.type === "duel" || currentMotion?.type === "lust-duel" ? currentMotion.freshEventIds : []);
        const latestFreshEvent = [...events].reverse().find((event) => fresh.has(event.eventId) && event.cardFace) ?? null;
        const lustRootIsCurrent = latestFreshEvent?.role === "root"
          || (!latestFreshEvent && events.at(-1)?.role === "root");
        const center = currentAction.publicCardEffectFrame && currentMotion?.type === "lust-duel" && lustRootIsCurrent
          ? battlefieldPublicEffectFrameCard(currentAction.publicCardEffectFrame.materials.length)
          : currentMotion?.type === "lust-duel" && currentAction.lustCostFrame && lustRootIsCurrent
            ? battlefieldLustCostCard()
          : battlefieldCenterCard(DUEL_REVEAL_CARD, { reservePlayerIds: [currentAction.sourceId, currentAction.targetId].filter((id): id is string => Boolean(id)) });
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
    window.addEventListener("resize", repositionAfterLayoutSettles);
    window.addEventListener("scroll", repositionAfterLayoutSettles, true);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", repositionAfterLayoutSettles);
    return () => {
      window.removeEventListener("resize", repositionAfterLayoutSettles);
      window.removeEventListener("scroll", repositionAfterLayoutSettles, true);
      viewport?.removeEventListener("resize", repositionAfterLayoutSettles);
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
  const currentPublicCard = activeEvent?.cardFace ?? latestResponse?.cardFace ?? action.cardFace ?? null;
  const activeActorId = activeEvent?.actorId ?? latestResponse?.actorId ?? action.sourceId;
  const activeMessage = activeEvent?.ariaLabel ?? latestResponse?.ariaLabel ?? action.publicNotice ?? action.ariaLabel;
  const announcementCopy = publicCardAnnouncementCopy(action, activeMessage, activeEvent?.actorName ?? latestResponse?.actorName ?? sourceName, activeActorId, sourceName, targetName, compactPlayerNamesById, activeEventId);
  const negationNarration = action.publicNegationNarration;
  const announcement = negationNarration?.headline ?? withPublicCardPhaseNotice(announcementCopy.message, action.settlement ? undefined : action.phaseNotice);
  const compactAnnouncement = negationNarration?.compactHeadline ?? ((announcementCopy.compactMessage || (!action.settlement && action.phaseNotice?.includes("NEGATION")))
    ? withPublicCardPhaseNotice(announcementCopy.compactMessage ?? announcementCopy.message, action.settlement ? undefined : action.phaseNotice, true)
    : undefined);
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
        publicCardEffectFrame={card.role === "root" && card.eventId === action.publicCardEffectFrame?.eventId
          ? action.publicCardEffectFrame : undefined}
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
      onInspectCard={onInspectCard}
      size={card.phase === "reveal" || card.phase === "move" && card.rect.width >= DUEL_REVEAL_CARD.width ? "duel-reveal" : "thumbnail"}
      className={`public-card-duel-parked-card ${card.phase === "parked" && card.eventId !== activeEventId ? "is-prior" : ""} ${card.eventId === activeEventId ? "is-current" : ""} ${card.role === "root" ? "is-duel-root" : "is-duel-response"}`}
      primary={card.eventId === activeEventId}
      parkingSide={card.parkingSide}
      showOrdinal
      ordinalContext="duel"
      lustCostFrame={action.motion?.type === "lust-duel" && card.role === "root" ? action.lustCostFrame : undefined}
      publicCardEffectFrame={card.role === "root" && card.eventId === action.publicCardEffectFrame?.eventId
        ? action.publicCardEffectFrame : undefined}
    />)}
    <ol className="duel-public-card-history-accessible" aria-label="Chronological Duel card history">
      {incoming.map((event) => <li key={event.eventId} value={event.globalOrdinal}>
        Duel event {event.globalOrdinal}: {event.ariaLabel}
      </li>)}
    </ol>
    <PublicCardAnnouncement
      eventId={negationNarration?.eventId ?? (action.motion?.type === "lust-duel" && activeEventId === action.rootEventId && activeCard?.role === "root" && action.lustCostFrame
        ? action.lustCostFrame.activationEventId : activeEventId)}
      eventCopyKey={publicCardAnnouncementCopyKey(
        action,
        negationNarration?.eventId ?? (action.motion?.type === "lust-duel" && activeEventId === action.rootEventId && activeCard?.role === "root" && action.lustCostFrame
          ? action.lustCostFrame.activationEventId : activeEventId),
        activeActorId,
        roomCode,
      )}
      geometryKey={publicAnnouncementGeometryKey(roomCode, viewerId)}
      copyLifecycleStage={publicCardAnnouncementLifecycleStage(action)}
      // A new public response card needs a freshly measured H4 position. Reusing
      // the order caption's band can trap a longer response copy against the
      // newly centred card and hide it on short phones.
      placementKey={`${publicCardAnnouncementPlacementKey(action)}${action.motion?.type === "lust-duel" ? `:${activeEventId}` : ""}`}
      viewerLayoutKey={viewerId}
      anchorEventId={activeEventId}
      phase={activeEvent?.phase ?? "static"}
      message={announcement}
      compactMessage={compactAnnouncement}
      accessibleLabel={action.publicActivityMessage && action.motion?.type === "lust-duel"
        ? appendAnnouncementContext(announcementCopy.accessibleLabel ?? announcementCopy.message,
          action.publicActivityAccessibleMessage ?? action.publicActivityMessage)
        : announcementCopy.accessibleLabel}
      supportingMessage={negationNarration?.supportingMessage ?? (action.motion?.type === "lust-duel" ? action.publicActivityMessage : undefined)}
      compactSupportingMessage={negationNarration?.compactSupportingMessage ?? (action.motion?.type === "lust-duel" ? action.publicActivityMessage : undefined)}
      negationNarration={negationNarration}
      fallbackCardRect={action.motion?.type === "lust-duel" && action.lustCostFrame
        ? battlefieldLustDuelAnnouncementAnchor(journey.center) : journey.center}
      phaseNotice={negationNarration ? undefined : action.phaseNotice}
      outcome={action.settlement?.outcome}
      negationWaiting={Boolean(negationNarration || action.phaseNotice?.includes("NEGATION"))}
      stableCenterAnchor={action.motion?.type === "lust-duel"}
      preferredVerticalMode={action.motion?.type === "lust-duel" ? "below" : undefined}
      ignoreJourneyLayoutPending={Boolean(negationNarration)}
    />
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
  harvestChoiceActive = false,
  harvestPoolReadOnly = false,
  sourceName,
  targetName,
  compactPlayerNamesById,
  roomCode,
  viewerId,
  viewerSeat,
  privateStealResult,
  resultReadRemainingMs = null,
  responseHistoryOwnership = [],
  onInspectCard,
  onJourneyEventParked,
  onJourneySettled,
  onJourneyOwnershipChange,
}: {
  action: PublicCardDisplayAction | null;
  enabled: boolean;
  suppressAnnouncement?: boolean;
  retainHarvestHistory?: boolean;
  retainDuelHistoryDuringInspection?: boolean;
  harvestChoiceActive?: boolean;
  harvestPoolReadOnly?: boolean;
  sourceName: string | null;
  targetName: string | null;
  compactPlayerNamesById: CompactPublicPlayerNames;
  roomCode: string;
  viewerId: string;
  viewerSeat: number | null;
  privateStealResult?: ViewerPrivateStealResult | null;
  resultReadRemainingMs?: number | null;
  responseHistoryOwnership?: readonly { eventId: string; cardIds: readonly string[] }[];
  onInspectCard?: (card: Card, trigger: HTMLButtonElement) => void;
  onJourneyEventParked?: (eventId: string) => void;
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
    return <AttackDodgeCardJourney action={action} enabled={enabled} sourceName={sourceName} targetName={targetName} compactPlayerNamesById={compactPlayerNamesById} roomCode={roomCode} viewerId={viewerId} resultReadRemainingMs={resultReadRemainingMs} onInspectCard={onInspectCard} onJourneyEventParked={onJourneyEventParked} />;
  }
  if (action.motion?.type === "single-target" || action.motion?.type === "negation"
    || action.motion?.type === "group-root" || action.motion?.type === "lust-cost") {
    return <SingleTargetCardJourney action={action} enabled={enabled} suppressAnnouncement={suppressAnnouncement || action.suppressAnnouncement === true} retainHarvestHistory={retainHarvestHistory} responseHistoryOwnership={responseHistoryOwnership} harvestChoiceActive={harvestChoiceActive} harvestPoolReadOnly={harvestPoolReadOnly} sourceName={sourceName} targetName={targetName} compactPlayerNamesById={compactPlayerNamesById} roomCode={roomCode} viewerId={viewerId} privateStealResult={privateStealResult} resultReadRemainingMs={resultReadRemainingMs} onInspectCard={onInspectCard} onJourneySettled={onJourneySettled} onJourneyEventParked={onJourneyEventParked} onJourneyOwnershipChange={onJourneyOwnershipChange} />;
  }
  if (action.motion?.type === "duel" || action.motion?.type === "lust-duel") {
    return <DuelCardJourney action={action} enabled={enabled} retainHistoryDuringInspection={retainDuelHistoryDuringInspection} sourceName={sourceName} targetName={targetName} compactPlayerNamesById={compactPlayerNamesById} roomCode={roomCode} viewerId={viewerId} viewerSeat={viewerSeat} resultReadRemainingMs={resultReadRemainingMs} onInspectCard={onInspectCard} onJourneyEventParked={onJourneyEventParked} />;
  }
  if (!enabled || !sourceName) return null;
  const latestResponse = action.response ?? action.responses?.at(-1) ?? null;
  const card = latestResponse?.cardFace ?? action.cardFace ?? null;
  const eventId = latestResponse?.eventId ?? action.rootEventId;
  const actorId = latestResponse?.actorId ?? action.sourceId;
  const notice = latestResponse?.ariaLabel ?? action.publicNotice ?? action.ariaLabel;
  const announcementCopy = publicCardAnnouncementCopy(action, notice, latestResponse?.actorName ?? sourceName, actorId, sourceName, targetName, compactPlayerNamesById, eventId);
  const announcement = withPublicCardPhaseNotice(announcementCopy.message, action.settlement ? undefined : action.phaseNotice);
  const compactAnnouncement = announcementCopy.compactMessage || (!action.settlement && action.phaseNotice?.includes("NEGATION"))
    ? withPublicCardPhaseNotice(announcementCopy.compactMessage ?? announcementCopy.message, action.settlement ? undefined : action.phaseNotice, true)
    : undefined;
  const harvestRootParked = harvestChoiceActive && card?.kind === "BumperHarvest";
  return <section
    className={`public-card-display${action.settlement?.exiting || action.publicCounterRead?.exiting ? " is-exiting" : ""}${harvestRootParked ? " public-card-display-harvest-active" : ""}`}
    data-public-card-display="true"
    data-public-card-renderer-kind="static-fallback"
    data-public-card-ready="true"
    data-public-card-visual-phase="STATIC"
    data-public-card-motion={action.motion?.type ?? undefined}
    data-public-card-viewer-id={viewerId}
    data-public-card-event-id={eventId}
    data-public-card-root-event-id={action.rootEventId}
    data-public-card-interaction-id={action.interactionId ?? undefined}
    data-public-card-root-frame-id={action.rootFrameId ?? undefined}
    data-public-card-checkpoint-id={action.checkpointId ?? undefined}
    data-public-card-presentation-revision={action.presentationRevision ?? undefined}
    data-public-card-id={card?.id}
    data-public-card-kind={card?.kind}
    data-public-card-harvest-active={harvestRootParked ? "true" : undefined}
    data-public-card-actor-id={actorId}
    data-public-card-source-id={action.sourceId}
    data-public-card-target-id={action.targetId ?? undefined}
    data-public-card-settlement-event-id={action.settlement?.eventId}
    data-public-card-settlement-outcome={action.settlement?.outcome}
    data-public-card-settlement-source-zone={action.settlement?.targetCardMovement?.sourceZone}
    data-public-card-settlement-destination-zone={action.settlement?.targetCardMovement?.destinationZone}
    data-public-card-settlement-affected-card-owner-id={action.settlement?.targetCardMovement ? action.settlement.targetCardMovement.affectedCardOwnerId ?? "none" : undefined}
    data-public-card-settlement-destination-owner-id={action.settlement?.targetCardMovement ? action.settlement.targetCardMovement.destinationOwnerId ?? "none" : undefined}
    data-public-card-settlement-card-id={action.settlement?.targetCardMovement?.affectedCardFace?.id}
    data-public-card-result-remaining-ms={resultReadRemainingMs ?? undefined}
  >
    {card && <div className="public-card-display-static-card" data-public-card-copy-anchor-event-id={eventId} data-public-card-static-event-id={eventId} data-public-card-static-card-id={card.id} data-harvest-root-parked={harvestRootParked ? "true" : undefined}><CardFace card={card} /></div>}
    {!suppressAnnouncement && !action.suppressAnnouncement && <PublicCardAnnouncement
      eventId={eventId}
      eventCopyKey={publicCardAnnouncementCopyKey(action, eventId, actorId, roomCode)}
      geometryKey={publicAnnouncementGeometryKey(roomCode, viewerId)}
      copyLifecycleStage={publicCardAnnouncementLifecycleStage(action)}
      placementKey={publicCardAnnouncementPlacementKey(action, roomCode)}
      viewerLayoutKey={viewerId}
      phase="static"
      message={announcement}
      compactMessage={compactAnnouncement}
      accessibleLabel={announcementCopy.accessibleLabel}
      fallbackCardRect={null}
      phaseNotice={action.phaseNotice}
      outcome={action.settlement?.outcome}
      negationWaiting={Boolean(action.phaseNotice?.includes("NEGATION"))}
    />}
  </section>;
}
