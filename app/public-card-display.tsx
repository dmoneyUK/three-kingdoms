"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Card, CardKind } from "../game/model";
import type { PresentationSnapshotRootAction } from "../game/presentation-snapshot";
import { cardDefinition } from "../game/cards";
import { CardFace } from "./card-face";
import { recordAttackDodgeUxTrace } from "./attack-dodge-ux-trace";

type PublicCardDisplayResponseNode = {
  eventId: string;
  /** Duel Attack ordinal supplied by the validated server proof. */
  ordinal?: number;
  actorId: string;
  actorName: string;
  cardFace?: Card;
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
  type: "duel";
  /** Room and proven Duel identity keep retained card state isolated. */
  scopeKey: string;
  freshEventIds: readonly string[];
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
  sourceId: string;
  targetId: string | null;
  cardKind?: CardKind;
  cardLabel: string;
  ariaLabel: string;
  publicNotice?: string;
  motion?: PublicCardDisplayMotion;
  settlement?: {
    eventId: string;
    outcome: "SUITS_MATCHED" | "SUITS_DIFFERED" | "ATTACK_BLOCKED_BY_DODGE" | "ATTACK_DAMAGE_APPLIED" | "DISMANTLE_RESOLVED" | "STEAL_RESOLVED" | "GROUP_RESOLVED" | "BUMPER_HARVEST_RESOLVED" | "ROOT_CANCELLED" | "ROOT_RESTORED";
    exiting: boolean;
  };
  publicCounterRead?: { eventId: string; exiting: boolean };
  phaseNotice?: string;
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
  responses?: readonly PublicCardDisplayResponseNode[];
};

type CardRect = { left: number; top: number; width: number; height: number };
type JourneyCard = {
  eventId: string;
  actorId: string;
  actorName: string;
  cardFace: Card;
  ariaLabel: string;
  semanticLabel?: string;
  role: "root" | "response" | "deflection";
  globalOrdinal?: number;
  phase: "reveal" | "move" | "parked";
  rect: CardRect;
  target: CardRect;
};
type JourneyState = { scopeKey: string; cards: JourneyCard[]; center: CardRect | null };

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

// Single-target and Attack/Dodge use standard Hand-card proportions; Duel uses
// the larger family-specific reveal before shrinking to its parked history.
const REVEAL_CARD = { width: 60, height: 90 };
const DUEL_REVEAL_CARD = { width: 90, height: 135 };
const PARKED_CARD = { width: 48, height: 72 };
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

function battlefieldCenterCard(size: { width: number; height: number } = REVEAL_CARD): CardRect {
  const table = document.querySelector<HTMLElement>(".play-table");
  if (!table) return boundCardRect((window.innerWidth - size.width) / 2, (window.innerHeight - size.height) / 2, size.width, size.height);
  const bounds = table.getBoundingClientRect();
  const preferredTop = bounds.top + bounds.height * 0.5 - size.height / 2;
  const preferredLeft = bounds.left + (bounds.width - size.width) / 2;
  const obstacles = [...document.querySelectorAll<HTMLElement>(
    ".opponent-player-card[data-player-anchor], .player-board-status, .visible-countdown",
  )].map((element) => element.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
  const offsets: Array<[number, number]> = [
    [0, 0], [0, -40], [0, 40], [0, -80], [0, 80], [0, -120], [0, 120],
    [-105, 0], [105, 0], [-105, -50], [105, -50], [-105, 50], [105, 50],
  ];
  const safe = offsets.map(([x, y]) => ({
    left: preferredLeft + x,
    top: preferredTop + y,
    width: size.width,
    height: size.height,
  })).find((candidate) => candidate.left >= bounds.left + 8
    && candidate.left + candidate.width <= bounds.right - 8
    && candidate.top >= bounds.top + 8
    && candidate.top + candidate.height <= bounds.bottom - 8
    && candidate.left >= 8
    && candidate.left + candidate.width <= window.innerWidth - 8
    && candidate.top >= 8
    && candidate.top + candidate.height <= window.innerHeight - 8
    && obstacles.every((obstacle) => candidate.left + candidate.width + 8 <= obstacle.left
      || candidate.left - 8 >= obstacle.right
      || candidate.top + candidate.height + 8 <= obstacle.top
      || candidate.top - 8 >= obstacle.bottom));
  return safe ?? boundCardRect(preferredLeft, preferredTop, size.width, size.height);
}

function actorParkedCard(actorId: string, cardIndex = 0): CardRect | null {
  const anchor = [...document.querySelectorAll<HTMLElement>("[data-player-anchor]")]
    .find((candidate) => candidate.dataset.playerAnchor === actorId);
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

function seatHistoryCardParking(actorId: string, actorIndex: number, occupied: readonly CardRect[]): SeatHistoryCardParking | null {
  const anchor = [...document.querySelectorAll<HTMLElement>("[data-player-anchor]")]
    .find((candidate) => candidate.dataset.playerAnchor === actorId);
  const table = document.querySelector<HTMLElement>(".play-table");
  if (!anchor || !table) return null;
  const seat = anchor.getBoundingClientRect();
  const tableRect = table.getBoundingClientRect();
  if (seat.width <= 0 || seat.height <= 0 || tableRect.width <= 0 || tableRect.height <= 0) return null;
  const dock = document.querySelector<HTMLElement>(".local-player-dock")?.getBoundingClientRect() ?? null;
  const seatCenterX = seat.left + seat.width / 2;
  const seatCenterY = seat.top + seat.height / 2;
  const gap = 6;
  const safeTop = Math.max(4, tableRect.top + 4);
  const safeBottom = Math.min(window.innerHeight - PARKED_CARD.height - 4, tableRect.bottom - PARKED_CARD.height - 4, dock?.top ? dock.top - PARKED_CARD.height - 4 : window.innerHeight - PARKED_CARD.height - 4);
  let side: SeatHistoryCardParking["side"];
  let baseLeft: number;
  let baseTop: number;
  let direction = 1;
  if (anchor.classList.contains("local-player-dock")) {
    side = "local";
    baseLeft = seat.left + 8;
    baseTop = seat.top - PARKED_CARD.height - 6;
  } else {
    const edgeDistances = [
      { side: "top" as const, value: Math.abs(seatCenterY - tableRect.top) },
      { side: "left" as const, value: Math.abs(seatCenterX - tableRect.left) },
      { side: "right" as const, value: Math.abs(tableRect.right - seatCenterX) },
    ].sort((a, b) => a.value - b.value);
    side = edgeDistances[0].side;
    if (side === "top") {
      baseLeft = seatCenterX - PARKED_CARD.width / 2;
      baseTop = seat.bottom + gap;
    } else if (side === "left") {
      baseLeft = seat.right + gap;
      baseTop = seatCenterY - PARKED_CARD.height / 2;
    } else {
      baseLeft = seat.left - PARKED_CARD.width - gap;
      baseTop = seatCenterY - PARKED_CARD.height / 2;
      direction = -1;
    }
  }

  // Top-row opponent histories descend below their Hero; side and local
  // histories progress horizontally toward the battlefield interior.
  const horizontalProgression = side !== "top";
  const progressionStride = horizontalProgression ? PARKED_CARD.width + gap : PARKED_CARD.height + gap;
  const perpendicularStride = horizontalProgression ? PARKED_CARD.height + gap : PARKED_CARD.width + gap;
  const preferred = {
    left: baseLeft + (horizontalProgression ? direction * actorIndex * progressionStride : 0),
    top: baseTop + (horizontalProgression ? 0 : actorIndex * progressionStride),
    ...PARKED_CARD,
  };
  const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6];
  const candidates = offsets.map((offset) => ({
    left: preferred.left + (horizontalProgression ? 0 : offset * perpendicularStride),
    top: preferred.top + (horizontalProgression ? offset * perpendicularStride : 0),
    ...PARKED_CARD,
  }));
  const anchors = [...document.querySelectorAll<HTMLElement>("[data-player-anchor]")]
    .filter((candidate) => candidate !== anchor)
    .map((candidate) => candidate.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  const localAnchor = side === "local";
  const safe = candidates.find((candidate) => candidate.left >= Math.max(4, localAnchor ? 0 : tableRect.left + 4)
    && candidate.left + candidate.width <= Math.min(window.innerWidth - 4, localAnchor ? window.innerWidth - 4 : tableRect.right - 4)
    && candidate.top >= (localAnchor ? 4 : safeTop)
    && candidate.top <= (localAnchor ? window.innerHeight - PARKED_CARD.height - 4 : safeBottom)
    && !occupied.some((rect) => rectsOverlap(rect, new DOMRect(candidate.left, candidate.top, candidate.width, candidate.height), 4))
    && anchors.every((obstacle) => !rectsOverlap(candidate, obstacle, 3)));
  if (safe) return { rect: safe, side };
  // Preserve the seat-front anchor as the deterministic final fallback. This
  // is used only when every bounded collision-safe slot is occupied.
  return { rect: boundCardRect(preferred.left, preferred.top, PARKED_CARD.width, PARKED_CARD.height), side };
}

function rectsOverlap(a: CardRect, b: DOMRect, gap = 0) {
  return a.left < b.right + gap && a.left + a.width > b.left - gap
    && a.top < b.bottom + gap && a.top + a.height > b.top - gap;
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
    case "ROOT_CANCELLED": return "EFFECT NEGATED";
    case "ROOT_RESTORED": return "EFFECT RESTORED";
    default: return null;
  }
}

function AttackDodgeCardJourney({
  action,
  enabled,
  sourceName,
  targetName,
  resultReadRemainingMs,
}: {
  action: PublicCardDisplayAction;
  enabled: boolean;
  sourceName: string | null;
  targetName: string | null;
  resultReadRemainingMs: number | null;
}) {
  const scopeKey = action.motion?.scopeKey ?? action.rootEventId;
  const [journey, setJourney] = useState<JourneyState>({ scopeKey: "", cards: [], center: null });
  const journeyRef = useRef(journey);
  const actionRef = useRef(action);
  const sourceNameRef = useRef(sourceName);
  const mountedRef = useRef(false);
  const hasAttackDodgeMotion = action.motion?.type === "attack-dodge";
  const attackDodgeMotion = action.motion?.type === "attack-dodge" ? action.motion : null;
  const eventSignature = `${action.rootEventId}|${action.response?.eventId ?? ""}|${action.deflection?.eventId ?? ""}|${attackDodgeMotion?.rootFresh ? "new-root" : "parked-root"}|${attackDodgeMotion?.responseFresh ? "new-response" : "parked-response"}|${attackDodgeMotion?.deflectionFresh ? "new-deflection" : "parked-deflection"}`;
  const latestResponse = action.response ?? null;
  const latestDeflection = action.deflection ?? null;
  const activeCard = latestResponse?.cardFace ?? latestDeflection?.cardFace ?? action.cardFace ?? null;
  const activeEventId = latestResponse?.eventId ?? latestDeflection?.eventId ?? action.rootEventId;
  const activeActorId = latestResponse?.actorId ?? latestDeflection?.actorId ?? action.sourceId;
  const result = settlementLabel(action, targetName);
  const activeLabel = latestResponse?.semanticLabel
    ?? (latestResponse?.semanticAction === "DODGE" ? "DODGE" : latestDeflection ? "DEFLECTION" : action.cardLabel);
  const activeAriaLabel = latestResponse?.ariaLabel ?? latestDeflection?.ariaLabel ?? action.ariaLabel;
  const activeNotice = latestResponse?.ariaLabel ?? latestDeflection?.publicNotice ?? action.publicNotice ?? action.ariaLabel;

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
    const currentAction = actionRef.current;
    const currentSourceName = sourceNameRef.current;
    const motion = currentAction.motion?.type === "attack-dodge" ? currentAction.motion : null;
    if (!enabled || !motion) return;
    const center = battlefieldCenterCard();
    const previous = journeyRef.current.scopeKey === scopeKey ? journeyRef.current.cards : [];
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
    const additions: JourneyCard[] = [];
    const clearCenterEvents: string[] = [];
    const nextCards = incoming.map((candidate) => {
      const prior = previous.find((card) => card.eventId === candidate.eventId);
      const target = actorParkedCard(candidate.actorId);
      const parkedTarget = target ?? center;
      if (prior) {
        const moveRootOutOfCenter = candidate.role === "root" && response.length > 0 && prior.phase === "reveal";
        if (moveRootOutOfCenter) clearCenterEvents.push(candidate.eventId);
        return {
          ...prior,
          actorId: candidate.actorId,
          actorName: candidate.actorName,
          cardFace: candidate.cardFace,
          ariaLabel: candidate.ariaLabel,
          semanticLabel: candidate.semanticLabel,
          phase: moveRootOutOfCenter ? "move" as const : prior.phase,
          target: parkedTarget,
          rect: moveRootOutOfCenter || prior.phase === "parked" ? parkedTarget : prior.phase === "reveal" ? center : prior.rect,
        };
      }
      const showCenterReveal = candidate.reveal && Boolean(target);
      const next: JourneyCard = {
        eventId: candidate.eventId,
        actorId: candidate.actorId,
        actorName: candidate.actorName,
        cardFace: candidate.cardFace,
        ariaLabel: candidate.ariaLabel,
        semanticLabel: candidate.semanticLabel,
        role: candidate.role,
        phase: showCenterReveal ? "reveal" : "parked",
        rect: showCenterReveal ? center : parkedTarget,
        target: parkedTarget,
      };
      if (showCenterReveal) additions.push(next);
      return next;
    });
    const nextState = { scopeKey, cards: nextCards, center };
    journeyRef.current = nextState;
    setJourney(nextState);

    for (const eventId of clearCenterEvents) {
      window.setTimeout(() => {
        if (!mountedRef.current) return;
        setJourney((current) => {
          if (current.scopeKey !== scopeKey) return current;
          return {
            ...current,
            cards: current.cards.map((card) => card.eventId === eventId && card.phase === "move"
              ? { ...card, phase: "parked", rect: card.target }
              : card),
          };
        });
      }, MOVE_DURATION_MS + 30);
    }

    for (const addition of additions) {
      window.setTimeout(() => {
        if (!mountedRef.current) return;
        setJourney((current) => {
          if (current.scopeKey !== scopeKey) return current;
          const moving = {
            ...current,
            cards: current.cards.map((card) => card.eventId === addition.eventId && card.phase === "reveal"
              ? { ...card, phase: "move" as const, rect: card.target }
              : card),
          };
          return moving;
        });
        window.setTimeout(() => {
          if (!mountedRef.current) return;
          setJourney((current) => {
            if (current.scopeKey !== scopeKey) return current;
            const parked = {
              ...current,
              cards: current.cards.map((card) => card.eventId === addition.eventId && card.phase === "move"
                ? { ...card, phase: "parked", rect: card.target }
                : card),
            };
            return parked;
          });
        }, MOVE_DURATION_MS + 30);
      }, STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS);
    }
  }, [enabled, scopeKey, eventSignature]);

  useLayoutEffect(() => {
    if (!enabled || !hasAttackDodgeMotion || journey.scopeKey !== scopeKey) return;
    let observer: ResizeObserver | null = null;
    const observedAnchors = new WeakSet<Element>();
    const observePlayerAnchors = () => {
      document.querySelectorAll<HTMLElement>("[data-player-anchor]").forEach((anchor) => {
        if (observedAnchors.has(anchor)) return;
        observedAnchors.add(anchor);
        observer?.observe(anchor);
      });
    };
    const reposition = () => {
      const center = battlefieldCenterCard();
      const next = {
        ...journeyRef.current,
        center,
        cards: journeyRef.current.cards.map((card) => {
          const target = actorParkedCard(card.actorId) ?? center;
          return {
            ...card,
            target,
            rect: card.phase === "reveal" ? center : card.phase === "parked" ? target : card.rect,
          };
        }),
      };
      if (journeyGeometryMatches(journeyRef.current, next)) return;
      journeyRef.current = next;
      setJourney(next);
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", reposition);
    observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(reposition);
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
        reposition();
      }
    });
    if (shell) mutationObserver?.observe(shell, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-player-anchor"],
    });
    reposition();
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      viewport?.removeEventListener("resize", reposition);
      observer?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [enabled, hasAttackDodgeMotion, journey.scopeKey, scopeKey]);

  if (!enabled || !sourceName || journey.scopeKey !== scopeKey || !journey.center) return null;
  const cards = journey.cards;
  const copyTop = journey.center.top + REVEAL_CARD.height + 7;
  return <section
    className={`public-card-display public-card-display-journey${action.settlement?.exiting || action.publicCounterRead?.exiting ? " is-exiting" : ""}`}
    role="status"
    aria-live="polite"
    aria-atomic="false"
    aria-label={activeAriaLabel}
    data-public-card-display="true"
    data-public-card-ready="true"
    data-public-card-motion="attack-dodge"
    data-public-card-event-id={activeEventId}
    data-public-card-root-event-id={action.rootEventId}
    data-public-card-id={activeCard?.id}
    data-public-card-actor-id={activeActorId}
    data-public-card-active-event-kind={latestResponse ? "response" : latestDeflection ? "deflection" : "root"}
    data-public-card-source-id={action.sourceId}
    data-public-card-target-id={action.targetId ?? undefined}
    data-public-card-settlement-event-id={action.settlement?.eventId}
    data-public-card-settlement-outcome={action.settlement?.outcome}
    data-public-card-deflection-event-id={latestDeflection?.eventId}
    data-public-card-result-remaining-ms={resultReadRemainingMs ?? undefined}
  >
    {cards.map((card) => {
      const isCurrent = card.eventId === activeEventId;
      const isHistorical = Boolean(latestResponse && card.role === "root");
      return <div
        key={card.eventId}
        className={`public-card-journey-card ${card.phase === "reveal" ? "is-revealing" : ""} ${card.phase === "move" ? "is-moving" : "is-parked"} ${isCurrent ? "is-current" : ""} ${isHistorical ? "is-prior" : ""} ${card.role === "deflection" ? "is-deflection" : ""}`}
        data-public-card-journey-event-id={card.eventId}
        data-public-card-journey-actor-id={card.actorId}
        data-public-card-journey-card-id={card.cardFace.id}
        data-public-card-journey-role={card.role}
        data-public-card-journey-phase={card.phase}
        data-public-card-journey-size={card.rect.width < REVEAL_CARD.width ? "thumbnail" : "reveal"}
        data-public-card-journey-target-left={card.target.left}
        data-public-card-journey-target-top={card.target.top}
        data-public-card-journey-target-width={card.target.width}
        data-public-card-journey-target-height={card.target.height}
        data-public-card-primary-card={isCurrent ? "true" : undefined}
        aria-hidden="true"
        style={{ left: card.rect.left, top: card.rect.top, width: card.rect.width, height: card.rect.height }}
      >
        <CardFace card={card.cardFace} />
        {card.semanticLabel && <small className="public-card-journey-semantic">{card.semanticLabel}</small>}
      </div>;
    })}
    <div className="public-card-display-copy public-card-display-journey-copy" style={{ top: copyTop }}>
      <small>{activeLabel}</small>
      <b>{activeNotice}</b>
      {action.phaseNotice && <span>{action.phaseNotice}</span>}
      {result && <strong data-public-card-result={action.settlement?.outcome}>{result}</strong>}
    </div>
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
  if (action.cardFace && sourceName) events.push({
    eventId: action.rootEventId,
    actorId: action.sourceId,
    actorName: sourceName,
    cardFace: action.cardFace,
    ariaLabel: action.ariaLabel,
    role: "root",
    phase: "parked",
    rect: { left: 0, top: 0, ...PARKED_CARD },
    target: { left: 0, top: 0, ...PARKED_CARD },
  });
  for (const response of action.responses ?? []) {
    if (!response.cardFace) continue;
    events.push({
      eventId: response.eventId,
      actorId: response.actorId,
      actorName: response.actorName,
      cardFace: response.cardFace,
      ariaLabel: response.ariaLabel,
      semanticLabel: response.semanticLabel,
      role: "response",
      phase: "parked",
      rect: { left: 0, top: 0, ...PARKED_CARD },
      target: { left: 0, top: 0, ...PARKED_CARD },
    });
  }
  return events;
}

function SingleTargetCardJourney({
  action,
  enabled,
  sourceName,
  targetName,
  viewerId,
  resultReadRemainingMs,
  onJourneySettled,
}: {
  action: PublicCardDisplayAction;
  enabled: boolean;
  sourceName: string | null;
  targetName: string | null;
  viewerId: string;
  resultReadRemainingMs: number | null;
  onJourneySettled?: (settlementEventId: string) => void;
}) {
  const motion = action.motion?.type === "negation" || action.motion?.type === "single-target" ? action.motion : null;
  const scopeKey = motion?.scopeKey ?? action.rootEventId;
  const [journey, setJourney] = useState<SingleTargetJourneyState>({ scopeKey: "", viewerId: "", cards: [], center: null });
  const journeyRef = useRef(journey);
  const actionRef = useRef(action);
  const sourceNameRef = useRef(sourceName);
  const mountedRef = useRef(false);
  const notifiedSettlementEventIdRef = useRef<string | null>(null);
  const incoming = singleTargetJourneyEvents(action, sourceName);
  const eventSignature = incoming.map((event) => `${event.eventId}:${event.actorId}:${event.cardFace.id}`).join(",");
  const freshSignature = motion?.freshEventIds.join(",") ?? "";

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
    const currentAction = actionRef.current;
    const currentMotion = currentAction.motion?.type === "negation" || currentAction.motion?.type === "single-target" ? currentAction.motion : null;
    const currentSourceName = sourceNameRef.current;
    if (!enabled || !currentMotion || !currentSourceName) return;
    const center = battlefieldCenterCard();
    const previous = journeyRef.current;
    const sameInteraction = previous.scopeKey === scopeKey;
    const viewerChanged = sameInteraction && previous.viewerId !== viewerId;
    const priorById = new Map(previous.cards.map((card) => [card.eventId, card]));
    const fresh = new Set(currentMotion.freshEventIds);
    const occupied: CardRect[] = [];
    const actorIndexes = new Map<string, number>();
    const cards = singleTargetJourneyEvents(currentAction, currentSourceName).map((event) => {
      const old = priorById.get(event.eventId);
      const actorIndex = actorIndexes.get(event.actorId) ?? 0;
      actorIndexes.set(event.actorId, actorIndex + 1);
      const target = old && !viewerChanged
        ? old.target
        : seatHistoryCardParking(event.actorId, actorIndex, occupied)?.rect
          ?? actorParkedCard(event.actorId, actorIndex)
          ?? center;
      occupied.push(target);
      if (old && !viewerChanged) return {
        ...event,
        ...old,
        actorName: event.actorName,
        cardFace: event.cardFace,
        ariaLabel: event.ariaLabel,
        semanticLabel: event.semanticLabel,
        target,
      };
      const phase: SingleTargetJourneyPhase = old ? "parked" : fresh.has(event.eventId) ? "queued" : "parked";
      return { ...event, phase, rect: phase === "parked" ? target : center, target };
    });
    const next: SingleTargetJourneyState = {
      scopeKey,
      viewerId,
      cards: withFirstQueuedSingleTargetReveal(cards, center),
      center,
    };
    journeyRef.current = next;
    setJourney(next);
  }, [enabled, scopeKey, eventSignature, freshSignature, viewerId]);

  const activeCard = journey.cards.find((card) => card.phase === "reveal" || card.phase === "move") ?? null;
  const activeEventId = activeCard?.eventId
    ?? [...journey.cards].reverse().find((card) => card.phase !== "queued")?.eventId
    ?? action.rootEventId;
  const activePhase = activeCard?.phase ?? null;
  useEffect(() => {
    if (!enabled || journey.scopeKey !== scopeKey || !activeCard || !activePhase) return;
    const delay = activePhase === "reveal" ? STANDARD_PUBLIC_CARD_REVEAL_HOLD_MS : MOVE_DURATION_MS;
    const timer = window.setTimeout(() => {
      if (!mountedRef.current) return;
      setJourney((current) => {
        const card = current.cards.find((candidate) => candidate.eventId === activeCard.eventId);
        if (current.scopeKey !== scopeKey || !card || card.phase !== activePhase) return current;
        const cards = current.cards.map((candidate) => candidate.eventId === card.eventId
          ? activePhase === "reveal"
            ? { ...candidate, phase: "move" as const, rect: candidate.target }
            : { ...candidate, phase: "parked" as const, rect: candidate.target }
          : candidate);
        const next = { ...current, cards: activePhase === "move" ? withFirstQueuedSingleTargetReveal(cards, current.center) : cards };
        journeyRef.current = next;
        return next;
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [enabled, journey.scopeKey, scopeKey, activeCard?.eventId, activePhase]);

  useLayoutEffect(() => {
    if (!enabled || journey.scopeKey !== scopeKey) return;
    const reflow = () => {
      const current = journeyRef.current;
      if (current.scopeKey !== scopeKey) return;
      const center = battlefieldCenterCard();
      const occupied: CardRect[] = [];
      const actorIndexes = new Map<string, number>();
      const cards = current.cards.map((card) => {
        const actorIndex = actorIndexes.get(card.actorId) ?? 0;
        actorIndexes.set(card.actorId, actorIndex + 1);
        const target = seatHistoryCardParking(card.actorId, actorIndex, occupied)?.rect
          ?? actorParkedCard(card.actorId, actorIndex)
          ?? card.target;
        occupied.push(target);
        const phase = card.phase === "move" ? "parked" as const : card.phase;
        return { ...card, phase, target, rect: phase === "reveal" ? center : phase === "parked" ? target : card.rect };
      });
      const unchanged = current.center && cardRectsMatch(current.center, center)
        && cards.length === current.cards.length
        && cards.every((card, index) => card.eventId === current.cards[index].eventId
          && card.phase === current.cards[index].phase
          && cardRectsMatch(card.rect, current.cards[index].rect)
          && cardRectsMatch(card.target, current.cards[index].target));
      if (unchanged) return;
      const next = { ...current, center, cards: withFirstQueuedSingleTargetReveal(cards, center) };
      journeyRef.current = next;
      setJourney(next);
    };
    window.addEventListener("resize", reflow);
    window.visualViewport?.addEventListener("resize", reflow);
    return () => {
      window.removeEventListener("resize", reflow);
      window.visualViewport?.removeEventListener("resize", reflow);
    };
  }, [enabled, journey.scopeKey, scopeKey]);

  const currentCard = activeCard ?? journey.cards.find((card) => card.eventId === activeEventId) ?? null;
  const allParked = journey.cards.length > 0 && journey.cards.every((card) => card.phase === "parked");
  const currentPublicCard = currentCard?.cardFace ?? action.cardFace ?? null;
  const currentLabel = currentCard?.semanticLabel ?? (currentPublicCard ? cardDefinition(currentPublicCard.kind).name.toUpperCase() : action.cardLabel);
  const currentNotice = currentCard?.ariaLabel ?? action.publicNotice ?? action.ariaLabel;
  const result = allParked ? settlementLabel(action, targetName) : null;
  const copyTop = journey.center ? journey.center.top + REVEAL_CARD.height + 7 : 0;
  useEffect(() => {
    const settlementEventId = action.settlement?.eventId;
    if (!enabled || journey.scopeKey !== scopeKey || !allParked || !settlementEventId
      || notifiedSettlementEventIdRef.current === settlementEventId) return;
    notifiedSettlementEventIdRef.current = settlementEventId;
    onJourneySettled?.(settlementEventId);
  }, [action.settlement?.eventId, allParked, enabled, journey.scopeKey, onJourneySettled, scopeKey]);
  if (!enabled || !sourceName || journey.scopeKey !== scopeKey || !journey.center) return null;
  return <section
    className={`public-card-display public-card-display-journey${action.settlement?.exiting || action.publicCounterRead?.exiting ? " is-exiting" : ""}`}
    role="status"
    aria-live="polite"
    aria-atomic="false"
    aria-label={currentCard?.ariaLabel ?? action.ariaLabel}
    data-public-card-display="true"
    data-public-card-ready="true"
    data-public-card-motion={motion?.type ?? "single-target"}
    data-public-card-viewer-id={viewerId}
    data-public-card-event-id={activeEventId}
    data-public-card-root-event-id={action.rootEventId}
    data-public-card-id={currentPublicCard?.id}
    data-public-card-actor-id={currentCard?.actorId ?? action.sourceId}
    data-public-card-source-id={action.sourceId}
    data-public-card-target-id={action.targetId ?? undefined}
    data-public-card-negation-outcome={motion?.type === "negation" && allParked ? action.settlement?.outcome : undefined}
    data-public-card-settlement-outcome={allParked ? action.settlement?.outcome : undefined}
    data-public-card-settlement-event-id={action.settlement?.eventId}
    data-public-card-result-remaining-ms={resultReadRemainingMs ?? undefined}
  >
    {journey.cards.filter((card) => card.phase !== "queued").map((card) => {
      const isCurrent = card.eventId === activeEventId;
      return <div
        key={card.eventId}
        className={`public-card-journey-card ${card.phase === "reveal" ? "is-revealing" : ""} ${card.phase === "move" ? "is-moving" : "is-parked"} ${isCurrent ? "is-current" : "is-prior"}`}
        data-public-card-journey-event-id={card.eventId}
        data-public-card-journey-actor-id={card.actorId}
        data-public-card-journey-card-id={card.cardFace.id}
        data-public-card-journey-role={card.role}
        data-public-card-journey-phase={card.phase}
        data-public-card-journey-size={card.rect.width < REVEAL_CARD.width ? "thumbnail" : "reveal"}
        data-public-card-journey-target-left={card.target.left}
        data-public-card-journey-target-top={card.target.top}
        data-public-card-primary-card={isCurrent ? "true" : undefined}
        aria-hidden="true"
        style={{ left: card.rect.left, top: card.rect.top, width: card.rect.width, height: card.rect.height }}
      >
        <CardFace card={card.cardFace} />
      </div>;
    })}
    <div className={`public-card-display-copy public-card-display-journey-copy${action.phaseNotice?.includes("NEGATION") ? " is-negation-waiting" : ""}`} style={{ top: copyTop }}>
      <small>{currentLabel}</small>
      <b>{currentNotice}</b>
      {action.phaseNotice && <span data-public-card-phase-notice="true">{action.phaseNotice}</span>}
      {result && <strong data-public-card-result={action.settlement?.outcome}>{result}</strong>}
    </div>
  </section>;
}

type DuelJourneyEvent = Pick<JourneyCard,
  "eventId" | "actorId" | "actorName" | "cardFace" | "ariaLabel" | "role" | "semanticLabel" | "globalOrdinal"
>;
type DuelJourneyPhase = "queued" | "reveal" | "move" | "parked";
type DuelJourneyCard = DuelJourneyEvent & {
  phase: DuelJourneyPhase;
  rect: CardRect;
  target: CardRect;
  parkingSide: SeatHistoryCardParking["side"];
  revealStartedAtMs: number | null;
  revealStartedAtIso: string | null;
  layoutChangeReason: string;
};
type DuelJourneyState = {
  scopeKey: string;
  viewerId: string;
  viewerSeat: number | null;
  cards: DuelJourneyCard[];
  center: CardRect | null;
  suppressTransitions: boolean;
};
type SingleTargetJourneyPhase = "queued" | "reveal" | "move" | "parked";
type SingleTargetJourneyCard = Omit<JourneyCard, "phase"> & {
  phase: SingleTargetJourneyPhase;
};
type SingleTargetJourneyState = {
  scopeKey: string;
  viewerId: string;
  cards: SingleTargetJourneyCard[];
  center: CardRect | null;
};

function duelJourneyEvents(action: PublicCardDisplayAction, sourceName: string | null): DuelJourneyEvent[] {
  const events: DuelJourneyEvent[] = [];
  if (action.cardFace && sourceName) events.push({
    eventId: action.rootEventId,
    actorId: action.sourceId,
    actorName: sourceName,
    cardFace: action.cardFace,
    ariaLabel: action.ariaLabel,
    role: "root",
    globalOrdinal: 1,
  });
  for (const response of action.responses ?? []) {
    if (!response.cardFace || !Number.isInteger(response.ordinal) || !response.ordinal || response.ordinal < 1) continue;
    events.push({
      eventId: response.eventId,
      actorId: response.actorId,
      actorName: response.actorName,
      cardFace: response.cardFace,
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
  sourceName,
  targetName,
  viewerId,
  viewerSeat,
  resultReadRemainingMs,
}: {
  action: PublicCardDisplayAction;
  enabled: boolean;
  sourceName: string | null;
  targetName: string | null;
  viewerId: string;
  viewerSeat: number | null;
  resultReadRemainingMs: number | null;
}) {
  const scopeKey = action.motion?.type === "duel" ? action.motion.scopeKey : action.rootEventId;
  const [journey, setJourney] = useState<DuelJourneyState>({ scopeKey: "", viewerId: "", viewerSeat: null, cards: [], center: null, suppressTransitions: false });
  const journeyRef = useRef(journey);
  const actionRef = useRef(action);
  const sourceNameRef = useRef(sourceName);
  const mountedRef = useRef(false);
  const traceSignaturesRef = useRef(new Map<string, string>());

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

  const incoming = duelJourneyEvents(action, sourceName);
  const responseSignature = incoming.map((event) => `${event.eventId}:${event.globalOrdinal ?? 0}`).join(",");
  const freshSignature = action.motion?.type === "duel" ? [...action.motion.freshEventIds].join(",") : "";
  useLayoutEffect(() => {
    const currentAction = actionRef.current;
    const currentMotion = currentAction.motion;
    const currentSourceName = sourceNameRef.current;
    if (!enabled || currentMotion?.type !== "duel" || !currentSourceName) return;

    const center = battlefieldCenterCard(DUEL_REVEAL_CARD);
    const events = duelJourneyEvents(currentAction, currentSourceName);
    const fresh = new Set(currentMotion.freshEventIds);
    const previous = journeyRef.current;
    const sameInteraction = previous.scopeKey === scopeKey;
    const viewerChanged = sameInteraction && previous.viewerId !== viewerId;
    const preserveTargets = sameInteraction && !viewerChanged;
    const priorById = new Map(previous.cards.map((card) => [card.eventId, card]));
    const targets = duelParkingTargets(events, preserveTargets ? previous.cards : []);
    const cards = events.flatMap((event) => {
      const old = priorById.get(event.eventId);
      const target = targets.get(event.eventId);
      if (!target) return [];
      if (old && preserveTargets) {
        return [{
          ...old,
          actorName: event.actorName,
          cardFace: event.cardFace,
          ariaLabel: event.ariaLabel,
          semanticLabel: event.semanticLabel,
          globalOrdinal: event.globalOrdinal,
        }];
      }
      if (old && viewerChanged) {
        return [{
          ...event,
          phase: "parked" as const,
          rect: target.rect,
          target: target.rect,
          parkingSide: target.side,
          revealStartedAtMs: old.revealStartedAtMs,
          revealStartedAtIso: old.revealStartedAtIso,
          layoutChangeReason: "viewer-switch",
        }];
      }
      const phase = fresh.has(event.eventId) ? "queued" as const : "parked" as const;
      return [{
        ...event,
        phase,
        rect: target.rect,
        target: target.rect,
        parkingSide: target.side,
        revealStartedAtMs: null,
        revealStartedAtIso: null,
        layoutChangeReason: sameInteraction ? "public-event-committed" : viewerChanged ? "viewer-switch" : "public-event-restored",
      }];
    }).sort((a, b) => (a.globalOrdinal ?? 0) - (b.globalOrdinal ?? 0));
    const cardsWithReveal = withFirstQueuedDuelReveal(cards, center, viewerChanged ? "viewer-switch-new-public-event" : "public-event-committed");
    const next: DuelJourneyState = {
      scopeKey,
      viewerId,
      viewerSeat,
      cards: cardsWithReveal,
      center,
      suppressTransitions: viewerChanged,
    };
    journeyRef.current = next;
    setJourney(next);
  }, [enabled, scopeKey, responseSignature, freshSignature, viewerId, viewerSeat]);

  const activeCard = journey.cards.find((card) => card.phase === "reveal" || card.phase === "move") ?? null;
  const activeCardEventId = activeCard?.eventId ?? null;
  const activeCardPhase = activeCard?.phase ?? null;
  const activeCardRevealStartedAtMs = activeCard?.revealStartedAtMs ?? null;
  useEffect(() => {
    if (!enabled || journey.scopeKey !== scopeKey || !activeCardEventId || activeCardPhase !== "reveal" || activeCardRevealStartedAtMs !== null) return;
    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
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
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [enabled, scopeKey, journey.scopeKey, activeCardEventId, activeCardPhase, activeCardRevealStartedAtMs]);

  const timerEventId = activeCard?.eventId ?? null;
  const timerPhase = activeCard?.phase ?? null;
  const revealStartedAtMs = activeCard?.revealStartedAtMs ?? null;
  useEffect(() => {
    if (!enabled || journey.scopeKey !== scopeKey || !timerEventId || !timerPhase) return;
    if (timerPhase === "reveal" && revealStartedAtMs === null) return;
    const delay = timerPhase === "reveal"
      ? Math.max(0, DUEL_REVEAL_HOLD_MS - (performance.now() - (revealStartedAtMs ?? performance.now())))
      : MOVE_DURATION_MS;
    const timer = window.setTimeout(() => {
      if (!mountedRef.current) return;
      setJourney((current) => {
        const card = current.cards.find((candidate) => candidate.eventId === timerEventId);
        if (current.scopeKey !== scopeKey || !card || card.phase !== timerPhase) return current;
        let cards = current.cards.map((candidate) => candidate.eventId === timerEventId
          ? timerPhase === "reveal"
            ? { ...candidate, phase: "move" as const, rect: candidate.target, layoutChangeReason: "three-second-reveal-complete" }
            : { ...candidate, phase: "parked" as const, rect: candidate.target, layoutChangeReason: "380ms-seat-parking-complete" }
          : candidate);
        if (timerPhase === "move" && current.center) cards = withFirstQueuedDuelReveal(cards, current.center, "next-public-card-committed");
        const next = { ...current, cards };
        journeyRef.current = next;
        return next;
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [enabled, scopeKey, journey.scopeKey, timerEventId, timerPhase, revealStartedAtMs]);

  useLayoutEffect(() => {
    if (!enabled || journey.scopeKey !== scopeKey) return;
    let resizeFrame = 0;
    let settleFrame = 0;
    let releaseFrame = 0;
    let lastViewport = `${window.innerWidth}:${window.innerHeight}:${window.visualViewport?.width ?? 0}:${window.visualViewport?.height ?? 0}:${window.visualViewport?.scale ?? 1}`;
    const repositionAfterViewportSettles = () => {
      window.cancelAnimationFrame(resizeFrame);
      window.cancelAnimationFrame(settleFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        settleFrame = window.requestAnimationFrame(() => {
          const viewportSignature = `${window.innerWidth}:${window.innerHeight}:${window.visualViewport?.width ?? 0}:${window.visualViewport?.height ?? 0}:${window.visualViewport?.scale ?? 1}`;
          if (viewportSignature === lastViewport) return;
          lastViewport = viewportSignature;
          const center = battlefieldCenterCard(DUEL_REVEAL_CARD);
          setJourney((current) => {
            if (current.scopeKey !== scopeKey) return current;
            const events = duelJourneyEvents(actionRef.current, sourceNameRef.current);
            const targets = duelParkingTargets(events);
            let cards = current.cards.map((card) => {
              const target = targets.get(card.eventId);
              if (!target) return card;
              if (card.phase === "move") return { ...card, phase: "parked" as const, target: target.rect, rect: target.rect, parkingSide: target.side, layoutChangeReason: "viewport-resize" };
              return {
                ...card,
                target: target.rect,
                parkingSide: target.side,
                rect: card.phase === "reveal" ? center : card.phase === "parked" ? target.rect : card.rect,
                layoutChangeReason: "viewport-resize",
              };
            });
            cards = withFirstQueuedDuelReveal(cards, center, "viewport-resize-new-public-event");
            const next = { ...current, cards, center, suppressTransitions: true };
            journeyRef.current = next;
            return next;
          });
          releaseFrame = window.requestAnimationFrame(() => setJourney((current) => {
            if (current.scopeKey !== scopeKey || !current.suppressTransitions) return current;
            const next = { ...current, suppressTransitions: false };
            journeyRef.current = next;
            return next;
          }));
        });
      });
    };
    // Window/visualViewport resize is the only reflow authority. DOM observers
    // made banners and history growth move already parked cards.
    window.addEventListener("resize", repositionAfterViewportSettles);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", repositionAfterViewportSettles);
    return () => {
      window.removeEventListener("resize", repositionAfterViewportSettles);
      viewport?.removeEventListener("resize", repositionAfterViewportSettles);
      window.cancelAnimationFrame(resizeFrame);
      window.cancelAnimationFrame(settleFrame);
      window.cancelAnimationFrame(releaseFrame);
    };
  }, [enabled, journey.scopeKey, scopeKey]);

  useEffect(() => {
    if (!journey.suppressTransitions || journey.scopeKey !== scopeKey) return;
    const frame = window.requestAnimationFrame(() => setJourney((current) => {
      if (current.scopeKey !== scopeKey || !current.suppressTransitions) return current;
      const next = { ...current, suppressTransitions: false };
      journeyRef.current = next;
      return next;
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [journey.suppressTransitions, journey.scopeKey, scopeKey]);

  const latestResponse = action.responses?.at(-1) ?? null;
  const activeEvent = activeCard
    ?? [...journey.cards].reverse().find((card) => card.phase !== "queued")
    ?? journey.cards.find((card) => card.eventId === action.rootEventId)
    ?? null;
  const activeEventId = activeEvent?.eventId ?? action.rootEventId;
  const currentPublicCard = activeEvent?.cardFace ?? latestResponse?.cardFace ?? action.cardFace ?? null;
  const activeActorId = activeEvent?.actorId ?? latestResponse?.actorId ?? action.sourceId;
  const activeLabel = activeEvent?.semanticLabel
    ?? latestResponse?.semanticLabel
    ?? (currentPublicCard ? cardDefinition(currentPublicCard.kind).name.toUpperCase() : action.cardLabel);
  const activeMessage = activeEvent?.ariaLabel ?? latestResponse?.ariaLabel ?? action.publicNotice ?? action.ariaLabel;
  const copyTop = (journey.center?.top ?? 0) + DUEL_REVEAL_CARD.height + 7;

  useEffect(() => {
    if (!enabled || journey.scopeKey !== scopeKey) return;
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
      const signature = JSON.stringify([card.phase, actualRect, targetRect, viewerId, card.layoutChangeReason, card.revealStartedAtMs]);
      if (traceSignaturesRef.current.get(card.eventId) === signature) continue;
      traceSignaturesRef.current.set(card.eventId, signature);
      recordAttackDodgeUxTrace("public-card-journey", {
        eventId: card.eventId,
        publicActorId: card.actorId,
        publicViewerId: viewerId,
        viewerSeat,
        cardKind: card.cardFace.kind,
        visualPhase: card.phase.toUpperCase(),
        actualCardRect: actualRect,
        targetParkingRect: targetRect,
        revealStartedAt: card.revealStartedAtIso,
        revealElapsedMs: card.revealStartedAtMs === null ? 0 : Math.max(0, Math.round(performance.now() - card.revealStartedAtMs)),
        layoutChangeReason: card.layoutChangeReason,
      });
    }
  }, [enabled, scopeKey, journey.scopeKey, journey.cards, viewerId, viewerSeat]);

  if (!enabled || !sourceName || journey.scopeKey !== scopeKey || !journey.center) return null;

  return <section
    className={`public-card-display public-card-display-journey${action.settlement?.exiting || action.publicCounterRead?.exiting ? " is-exiting" : ""}${journey.suppressTransitions ? " is-reflowing" : ""}`}
    role="status"
    aria-live="polite"
    aria-atomic="false"
    aria-label={activeEvent?.ariaLabel ?? latestResponse?.ariaLabel ?? action.ariaLabel}
    data-public-card-display="true"
    data-public-card-ready="true"
    data-public-card-motion="duel"
    data-public-card-viewer-id={viewerId}
    data-public-card-event-id={activeEventId}
    data-public-card-root-event-id={action.rootEventId}
    data-public-card-id={currentPublicCard?.id}
    data-public-card-actor-id={activeActorId}
    data-public-card-source-id={action.sourceId}
    data-public-card-target-id={action.targetId ?? undefined}
    data-public-card-settlement-event-id={action.settlement?.eventId}
    data-public-card-settlement-outcome={action.settlement?.outcome}
    data-public-card-result-remaining-ms={resultReadRemainingMs ?? undefined}
  >
    {journey.cards.filter((card) => card.phase !== "queued").map((card) => <div
      key={card.eventId}
      className={`public-card-journey-card public-card-duel-parked-card ${card.phase === "reveal" ? "is-revealing" : ""} ${card.phase === "move" ? "is-moving" : "is-parked"} ${card.phase === "parked" && card.eventId !== activeEventId ? "is-prior" : ""} ${card.eventId === activeEventId ? "is-current" : ""} ${card.role === "root" ? "is-duel-root" : "is-duel-response"}`}
      data-public-card-journey-event-id={card.eventId}
      data-public-card-journey-actor-id={card.actorId}
      data-public-card-journey-card-id={card.cardFace.id}
      data-public-card-journey-phase={card.phase}
      data-public-card-journey-size={card.phase === "reveal" || card.phase === "move" && card.rect.width >= DUEL_REVEAL_CARD.width ? "duel-reveal" : "thumbnail"}
      data-public-card-journey-ordinal={card.globalOrdinal}
      data-public-card-journey-parking-side={card.parkingSide}
      data-public-card-journey-layout-reason={card.layoutChangeReason}
      data-public-card-journey-reveal-started-at={card.revealStartedAtIso ?? undefined}
      data-public-card-journey-reveal-started-ms={card.revealStartedAtMs ?? undefined}
      data-public-card-journey-target-left={card.target.left}
      data-public-card-journey-target-top={card.target.top}
      data-public-card-journey-target-width={card.target.width}
      data-public-card-journey-target-height={card.target.height}
      data-public-card-primary-card={card.eventId === activeEventId ? "true" : undefined}
      aria-hidden="true"
      style={{ left: card.rect.left, top: card.rect.top, width: card.rect.width, height: card.rect.height }}
    >
      <CardFace card={card.cardFace} />
      {card.semanticLabel && <small className="public-card-journey-semantic">{card.semanticLabel}</small>}
      <small className="public-card-journey-ordinal" aria-label={`Duel event ${card.globalOrdinal}`}>#{card.globalOrdinal}</small>
    </div>)}
    <ol className="duel-public-card-history-accessible" aria-label="Chronological Duel card history">
      {incoming.map((event) => <li key={event.eventId} value={event.globalOrdinal}>
        Duel event {event.globalOrdinal}: {event.ariaLabel}
      </li>)}
    </ol>
    <div className={`public-card-display-copy public-card-display-journey-copy${action.phaseNotice?.includes("NEGATION") ? " is-negation-waiting" : ""}`} style={{ top: copyTop }} data-public-card-phase-notice={action.phaseNotice ?? undefined}>
      <small>{activeLabel}</small>
      <b>{activeMessage}</b>
      {action.phaseNotice && <span>{action.phaseNotice}</span>}
      {settlementLabel(action, targetName) && <strong data-public-card-result={action.settlement?.outcome}>{settlementLabel(action, targetName)}</strong>}
    </div>
  </section>;
}

export function publicCardActionKey(action: PresentationSnapshotRootAction): string {
  return [action.interactionId, action.rootFrameId, action.checkpointId, action.presentationRevision, action.rootEventId, action.sourceId, action.targetId].join(":");
}

export function PublicCardDisplay({
  action,
  enabled,
  sourceName,
  targetName,
  viewerId,
  viewerSeat,
  resultReadRemainingMs = null,
  onJourneySettled,
}: {
  action: PublicCardDisplayAction | null;
  enabled: boolean;
  sourceName: string | null;
  targetName: string | null;
  viewerId: string;
  viewerSeat: number | null;
  resultReadRemainingMs?: number | null;
  onJourneySettled?: (settlementEventId: string) => void;
}) {
  if (!action) return null;
  if (action.motion?.type === "attack-dodge") {
    return <AttackDodgeCardJourney action={action} enabled={enabled} sourceName={sourceName} targetName={targetName} resultReadRemainingMs={resultReadRemainingMs} />;
  }
  if (action.motion?.type === "single-target" || action.motion?.type === "negation") {
    return <SingleTargetCardJourney action={action} enabled={enabled} sourceName={sourceName} targetName={targetName} viewerId={viewerId} resultReadRemainingMs={resultReadRemainingMs} onJourneySettled={onJourneySettled} />;
  }
  if (action.motion?.type === "duel") {
    return <DuelCardJourney action={action} enabled={enabled} sourceName={sourceName} targetName={targetName} viewerId={viewerId} viewerSeat={viewerSeat} resultReadRemainingMs={resultReadRemainingMs} />;
  }
  if (!enabled || !sourceName) return null;
  const latestResponse = action.response ?? action.responses?.at(-1) ?? null;
  const card = latestResponse?.cardFace ?? action.cardFace ?? null;
  const eventId = latestResponse?.eventId ?? action.rootEventId;
  const actorId = latestResponse?.actorId ?? action.sourceId;
  const label = latestResponse?.semanticAction === "DODGE"
    ? latestResponse.semanticLabel ?? "DODGE"
    : card ? cardDefinition(card.kind).name.toUpperCase() : action.cardLabel;
  const result = settlementLabel(action, targetName);
  return <section
    className={`public-card-display${action.settlement?.exiting || action.publicCounterRead?.exiting ? " is-exiting" : ""}`}
    role="status"
    aria-live="polite"
    aria-atomic="true"
    aria-label={latestResponse?.ariaLabel ?? action.ariaLabel}
    data-public-card-display="true"
    data-public-card-ready="true"
    data-public-card-event-id={eventId}
    data-public-card-root-event-id={action.rootEventId}
    data-public-card-id={card?.id}
    data-public-card-actor-id={actorId}
    data-public-card-source-id={action.sourceId}
    data-public-card-target-id={action.targetId ?? undefined}
    data-public-card-settlement-event-id={action.settlement?.eventId}
    data-public-card-settlement-outcome={action.settlement?.outcome}
    data-public-card-result-remaining-ms={resultReadRemainingMs ?? undefined}
  >
    {card && <CardFace card={card} />}
    <div className="public-card-display-copy">
      <small>{label}</small>
      <b>{latestResponse ? latestResponse.ariaLabel : action.ariaLabel}</b>
      {action.phaseNotice && <span>{action.phaseNotice}</span>}
      {result && <strong data-public-card-result={action.settlement?.outcome}>{result}</strong>}
    </div>
  </section>;
}
