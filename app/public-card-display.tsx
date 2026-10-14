"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Card, CardKind } from "../game/model";
import type { PresentationSnapshotRootAction } from "../game/presentation-snapshot";
import { cardDefinition } from "../game/cards";
import { CardFace } from "./card-face";

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
    outcome: "SUITS_MATCHED" | "SUITS_DIFFERED" | "ATTACK_BLOCKED_BY_DODGE" | "ATTACK_DAMAGE_APPLIED" | "DISMANTLE_RESOLVED" | "STEAL_RESOLVED" | "GROUP_RESOLVED" | "BUMPER_HARVEST_RESOLVED";
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
  role: "root" | "response";
  globalOrdinal?: number;
  phase: "reveal" | "move" | "parked";
  rect: CardRect;
  target: CardRect;
};
type JourneyState = { scopeKey: string; cards: JourneyCard[]; center: CardRect | null };

// Match the mobile Hand-card footprint; the parked card then scales down by
// the same ratio for both its frame and its rank/suit corner.
const REVEAL_CARD = { width: 60, height: 90 };
const PARKED_CARD = { width: 48, height: 72 };
const DUEL_CARD = { width: 48, height: 72 };
const REVEAL_HOLD_MS = 4000;
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

function battlefieldCenterCard(): CardRect {
  const table = document.querySelector<HTMLElement>(".play-table");
  if (!table) return boundCardRect((window.innerWidth - REVEAL_CARD.width) / 2, (window.innerHeight - REVEAL_CARD.height) / 2, REVEAL_CARD.width, REVEAL_CARD.height);
  const bounds = table.getBoundingClientRect();
  const preferredTop = bounds.top + bounds.height * 0.5 - REVEAL_CARD.height / 2;
  const preferredLeft = bounds.left + (bounds.width - REVEAL_CARD.width) / 2;
  const obstacles = [...document.querySelectorAll<HTMLElement>(
    ".opponent-player-card[data-player-anchor], .draw-stack, .discard-stack, .player-board-status, .visible-countdown, .public-card-duel-history",
  )].map((element) => element.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
  const offsets: Array<[number, number]> = [
    [0, 0], [0, -40], [0, 40], [0, -80], [0, 80], [0, -120], [0, 120],
    [-105, 0], [105, 0], [-105, -50], [105, -50], [-105, 50], [105, 50],
  ];
  const safe = offsets.map(([x, y]) => ({
    left: preferredLeft + x,
    top: preferredTop + y,
    width: REVEAL_CARD.width,
    height: REVEAL_CARD.height,
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
  return safe ?? boundCardRect(preferredLeft, preferredTop, REVEAL_CARD.width, REVEAL_CARD.height);
}

function actorParkedCard(actorId: string): CardRect | null {
  const anchor = [...document.querySelectorAll<HTMLElement>("[data-player-anchor]")]
    .find((candidate) => candidate.dataset.playerAnchor === actorId);
  if (!anchor) return null;
  const bounds = anchor.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return null;

  if (anchor.classList.contains("local-player-dock")) {
    return boundCardRect(bounds.left + (bounds.width - PARKED_CARD.width) / 2, bounds.top - PARKED_CARD.height - 8, PARKED_CARD.width, PARKED_CARD.height);
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
    return boundCardRect(anchorCenterX - PARKED_CARD.width / 2, bounds.bottom + 7, PARKED_CARD.width, PARKED_CARD.height);
  }

  if (Math.abs(anchorCenterX - boardCenterX) > Math.abs(anchorCenterY - boardCenterY)) {
    const facesCenterFromLeft = anchorCenterX < boardCenterX;
    const left = facesCenterFromLeft ? bounds.right + 7 : bounds.left - PARKED_CARD.width - 7;
    return boundCardRect(left, anchorCenterY - PARKED_CARD.height / 2, PARKED_CARD.width, PARKED_CARD.height);
  }

  return boundCardRect(anchorCenterX - PARKED_CARD.width / 2, bounds.top - PARKED_CARD.height - 7, PARKED_CARD.width, PARKED_CARD.height);
}

type DuelHistoryOrientation = "vertical" | "horizontal";
type DuelHistorySide = "local" | "top" | "left" | "right";
type DuelHistoryViewport = { orientation: DuelHistoryOrientation; side: DuelHistorySide; rect: CardRect };

function rectsOverlap(a: CardRect, b: DOMRect, gap = 0) {
  return a.left < b.right + gap && a.left + a.width > b.left - gap
    && a.top < b.bottom + gap && a.top + a.height > b.top - gap;
}

/**
 * Measure an actor-owned, collision-bounded scroll viewport from the rendered
 * Seat/Dock. No seat number, turn order, or player name participates in layout.
 */
function duelHistoryViewport(actorId: string): DuelHistoryViewport | null {
  const anchor = [...document.querySelectorAll<HTMLElement>("[data-player-anchor]")]
    .find((candidate) => candidate.dataset.playerAnchor === actorId);
  const table = document.querySelector<HTMLElement>(".play-table");
  if (!anchor || !table) return null;
  const seat = anchor.getBoundingClientRect();
  const tableRect = table.getBoundingClientRect();
  if (seat.width <= 0 || seat.height <= 0 || tableRect.width <= 0 || tableRect.height <= 0) return null;
  const dock = document.querySelector<HTMLElement>(".local-player-dock")?.getBoundingClientRect() ?? null;
  const board = document.querySelector<HTMLElement>(".player-board")?.getBoundingClientRect() ?? tableRect;
  const centerX = board.left + board.width / 2;
  const obstacles = [...document.querySelectorAll<HTMLElement>(
    ".opponent-player-card[data-player-anchor], .draw-stack, .discard-stack, .player-board-status, .visible-countdown, .public-card-display-journey-copy",
  )].filter((element) => element !== anchor)
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  const insideTable = (rect: CardRect) => rect.left >= tableRect.left + 4
    && rect.left + rect.width <= tableRect.right - 4
    && rect.top >= tableRect.top + 4
    && rect.top + rect.height <= Math.min(tableRect.bottom - 4, dock?.top ? dock.top - 4 : window.innerHeight - 4);

  if (anchor.classList.contains("local-player-dock")) {
    const width = Math.max(DUEL_CARD.width, Math.min(tableRect.width - 16, window.innerWidth - 16));
    const left = Math.max(tableRect.left + 8, Math.min(window.innerWidth - width - 8, tableRect.left + (tableRect.width - width) / 2));
    const preferredTop = Math.min(dock?.top ?? tableRect.bottom, tableRect.bottom) - DUEL_CARD.height - 8;
    const offsets = [0, -DUEL_CARD.height - 6, -2 * (DUEL_CARD.height + 6), -3 * (DUEL_CARD.height + 6), -4 * (DUEL_CARD.height + 6)];
    for (const offset of offsets) {
      const rect = { left, top: preferredTop + offset, width, height: DUEL_CARD.height };
      if (insideTable(rect) && obstacles.every((obstacle) => !rectsOverlap(rect, obstacle, 5))) {
        return { orientation: "horizontal", side: "local", rect };
      }
    }
    return { orientation: "horizontal", side: "local", rect: boundCardRect(left, preferredTop, width, DUEL_CARD.height) };
  }

  const centerSeatX = seat.left + seat.width / 2;
  const centerY = seat.top + seat.height / 2;
  const topDistance = Math.abs(centerY - tableRect.top);
  const leftDistance = Math.abs(centerSeatX - tableRect.left);
  const rightDistance = Math.abs(tableRect.right - centerSeatX);
  const isTopSeat = topDistance <= leftDistance && topDistance <= rightDistance;

  if (isTopSeat) {
    const preferredLeft = seat.left + (seat.width - DUEL_CARD.width) / 2;
    const xOffsets = [0, -(DUEL_CARD.width + 7), DUEL_CARD.width + 7, -2 * (DUEL_CARD.width + 7), 2 * (DUEL_CARD.width + 7)];
    const safeBottom = Math.min(tableRect.bottom - 8, dock?.top ? dock.top - 8 : window.innerHeight - 8);
    const options = xOffsets.flatMap((offset, preference) => {
      const left = Math.max(tableRect.left + 8, Math.min(tableRect.right - DUEL_CARD.width - 8, preferredLeft + offset));
      const top = seat.bottom + 6;
      const blockingTop = obstacles
        .filter((obstacle) => obstacle.left < left + DUEL_CARD.width + 5 && obstacle.right > left - 5 && obstacle.bottom > top)
        .map((obstacle) => obstacle.top - 6)
        .filter((bottom) => bottom > top)
        .reduce((nearest, bottom) => Math.min(nearest, bottom), safeBottom);
      const height = Math.min(safeBottom, blockingTop) - top;
      if (height < DUEL_CARD.height) return [];
      return [{ preference, rect: { left, top, width: DUEL_CARD.width, height } }];
    });
    options.sort((a, b) => a.preference - b.preference);
    const rect = options[0]?.rect;
    if (rect) return { orientation: "vertical", side: "top", rect };
    return {
      orientation: "vertical",
      side: "top",
      rect: { left: preferredLeft, top: Math.min(safeBottom - DUEL_CARD.height, seat.bottom + 6), width: DUEL_CARD.width, height: DUEL_CARD.height },
    };
  }

  const onLeft = seat.left + seat.width / 2 < centerX;
  const side = onLeft ? "left" : "right";
  const centerGap = REVEAL_CARD.width / 2 + 8;
  const left = onLeft ? seat.right + 6 : centerX + centerGap;
  const right = onLeft ? centerX - centerGap : seat.left - 6;
  const width = Math.max(DUEL_CARD.width, right - left);
  const x = onLeft ? left : right - width;
  const safeTop = tableRect.top + 8;
  const safeBottom = Math.min(tableRect.bottom - DUEL_CARD.height - 8, dock?.top ? dock.top - DUEL_CARD.height - 8 : window.innerHeight - DUEL_CARD.height - 8);
  const yOffsets = [0, -DUEL_CARD.height - 8, DUEL_CARD.height + 8, -2 * (DUEL_CARD.height + 8), 2 * (DUEL_CARD.height + 8), -3 * (DUEL_CARD.height + 8), 3 * (DUEL_CARD.height + 8)];
  for (const offset of yOffsets) {
    const top = Math.max(safeTop, Math.min(safeBottom, centerY - DUEL_CARD.height / 2 + offset));
    const rect = { left: x, top, width, height: DUEL_CARD.height };
    if (insideTable(rect) && obstacles.every((obstacle) => !rectsOverlap(rect, obstacle, 5))) {
      return { orientation: "horizontal", side, rect };
    }
  }
  return {
    orientation: "horizontal",
    side,
    rect: { left: x, top: Math.max(safeTop, Math.min(safeBottom, centerY - DUEL_CARD.height / 2)), width, height: DUEL_CARD.height },
  };
}

function duelHistorySlotRect(eventId: string): CardRect | null {
  const slot = [...document.querySelectorAll<HTMLElement>("[data-duel-history-slot-event-id]")]
    .find((candidate) => candidate.dataset.duelHistorySlotEventId === eventId);
  if (!slot) return null;
  const bounds = slot.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  return boundCardRect(bounds.left, bounds.top, DUEL_CARD.width, DUEL_CARD.height);
}

function ensureDuelHistorySlotVisible(eventId: string) {
  const slot = [...document.querySelectorAll<HTMLElement>("[data-duel-history-slot-event-id]")]
    .find((candidate) => candidate.dataset.duelHistorySlotEventId === eventId);
  slot?.scrollIntoView({ block: "nearest", inline: "nearest" });
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
  const eventSignature = `${action.rootEventId}|${action.response?.eventId ?? ""}|${action.motion?.rootFresh ? "new-root" : "parked-root"}|${action.motion?.responseFresh ? "new-response" : "parked-response"}`;
  const latestResponse = action.response ?? null;
  const activeCard = latestResponse?.cardFace ?? action.cardFace ?? null;
  const activeEventId = latestResponse?.eventId ?? action.rootEventId;
  const activeActorId = latestResponse?.actorId ?? action.sourceId;
  const result = settlementLabel(action, targetName);
  const activeLabel = latestResponse?.semanticLabel
    ?? (latestResponse?.semanticAction === "DODGE" ? "DODGE" : action.cardLabel);

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
    if (!enabled || !currentAction.motion) return;
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
      reveal: currentAction.motion.rootFresh,
    }] : [];
    const response = currentAction.response?.cardFace ? [{
      eventId: currentAction.response.eventId,
      actorId: currentAction.response.actorId,
      actorName: currentAction.response.actorName,
      cardFace: currentAction.response.cardFace,
      ariaLabel: currentAction.response.ariaLabel,
      semanticLabel: currentAction.response.semanticLabel,
      role: "response" as const,
      reveal: currentAction.motion.responseFresh,
    }] : [];
    const incoming = [...root, ...response];
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
      }, REVEAL_HOLD_MS);
    }
  }, [enabled, scopeKey, eventSignature]);

  useLayoutEffect(() => {
    if (!enabled || !hasAttackDodgeMotion || journey.scopeKey !== scopeKey) return;
    let observer: ResizeObserver | null = null;
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
      journeyRef.current = next;
      setJourney(next);
      document.querySelectorAll<HTMLElement>("[data-player-anchor]").forEach((anchor) => observer?.observe(anchor));
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", reposition);
    observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(reposition);
    const shell = document.querySelector<HTMLElement>(".game-shell");
    if (shell) observer?.observe(shell);
    document.querySelectorAll<HTMLElement>("[data-player-anchor]").forEach((anchor) => observer?.observe(anchor));
    const mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(reposition);
    if (shell) mutationObserver?.observe(shell, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-player-anchor"] });
    relayout();
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
    aria-label={latestResponse?.ariaLabel ?? action.ariaLabel}
    data-public-card-display="true"
    data-public-card-ready="true"
    data-public-card-motion="attack-dodge"
    data-public-card-event-id={activeEventId}
    data-public-card-root-event-id={action.rootEventId}
    data-public-card-id={activeCard?.id}
    data-public-card-actor-id={activeActorId}
    data-public-card-source-id={action.sourceId}
    data-public-card-target-id={action.targetId ?? undefined}
    data-public-card-settlement-event-id={action.settlement?.eventId}
    data-public-card-settlement-outcome={action.settlement?.outcome}
    data-public-card-result-remaining-ms={resultReadRemainingMs ?? undefined}
  >
    {cards.map((card) => {
      const isCurrent = card.eventId === activeEventId;
      const isHistorical = Boolean(latestResponse && card.role === "root");
      return <div
        key={card.eventId}
        className={`public-card-journey-card ${card.phase === "reveal" ? "is-revealing" : ""} ${card.phase === "move" ? "is-moving" : "is-parked"} ${isCurrent ? "is-current" : ""} ${isHistorical ? "is-prior" : ""}`}
        data-public-card-journey-event-id={card.eventId}
        data-public-card-journey-actor-id={card.actorId}
        data-public-card-journey-card-id={card.cardFace.id}
        data-public-card-journey-phase={card.phase}
        data-public-card-journey-size={card.rect.width < REVEAL_CARD.width ? "thumbnail" : "reveal"}
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
      <b>{action.publicNotice ?? latestResponse?.ariaLabel ?? action.ariaLabel}</b>
      {action.phaseNotice && <span>{action.phaseNotice}</span>}
      {result && <strong data-public-card-result={action.settlement?.outcome}>{result}</strong>}
    </div>
  </section>;
}

type DuelJourneyEvent = Pick<JourneyCard,
  "eventId" | "actorId" | "actorName" | "cardFace" | "ariaLabel" | "role" | "semanticLabel" | "globalOrdinal"
>;
type DuelJourneyState = {
  scopeKey: string;
  cards: JourneyCard[];
  active: JourneyCard | null;
  queue: DuelJourneyEvent[];
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

function parkedDuelCard(event: DuelJourneyEvent, center: CardRect): JourneyCard {
  return { ...event, phase: "parked", rect: center, target: center };
}

function revealingDuelCard(event: DuelJourneyEvent, center: CardRect): JourneyCard {
  const target = duelHistorySlotRect(event.eventId) ?? center;
  return { ...event, phase: "reveal", rect: center, target };
}

function completeDuelJourneyEvent(state: DuelJourneyState, eventId: string): DuelJourneyState {
  const active = state.active;
  if (!active || active.eventId !== eventId || !state.center) return state;
  const parked = { ...active, phase: "parked" as const, rect: active.target };
  const cards = [...state.cards.filter((card) => card.eventId !== active.eventId), parked]
    .sort((a, b) => (a.globalOrdinal ?? 0) - (b.globalOrdinal ?? 0));
  const [nextEvent, ...queue] = state.queue;
  return {
    ...state,
    cards,
    active: nextEvent ? revealingDuelCard(nextEvent, state.center) : null,
    queue,
  };
}

/**
 * A Duel is presented as one chronological history partitioned into the
 * actual authors' measured Seat/Dock regions. The validated server proof
 * supplies each event, author and ordinal; React only measures placement.
 */
function DuelCardJourney({
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
  const scopeKey = action.motion?.type === "duel" ? action.motion.scopeKey : action.rootEventId;
  const [journey, setJourney] = useState<DuelJourneyState>({ scopeKey: "", cards: [], active: null, queue: [], center: null });
  const [historyLayoutRevision, setHistoryLayoutRevision] = useState(0);
  const journeyRef = useRef(journey);
  const actionRef = useRef(action);
  const sourceNameRef = useRef(sourceName);
  const mountedRef = useRef(false);

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

    const center = battlefieldCenterCard();
    const events = duelJourneyEvents(currentAction, currentSourceName);

    const fresh = new Set(currentMotion.freshEventIds);
    const previous = journeyRef.current;
    let next: DuelJourneyState;
    if (previous.scopeKey !== scopeKey) {
      const parked = events.filter((event) => !fresh.has(event.eventId))
        .map((event) => parkedDuelCard(event, center));
      const queue = events.filter((event) => fresh.has(event.eventId));
      const [first, ...remaining] = queue;
      next = {
        scopeKey,
        cards: parked,
        active: first ? revealingDuelCard(first, center) : null,
        queue: remaining,
        center,
      };
    } else {
      const known = new Set([
        ...previous.cards.map((card) => card.eventId),
        ...(previous.active ? [previous.active.eventId] : []),
        ...previous.queue.map((event) => event.eventId),
      ]);
      const additions = events.filter((event) => fresh.has(event.eventId) && !known.has(event.eventId));
      const queue = [...previous.queue, ...additions]
        .sort((a, b) => (a.globalOrdinal ?? 0) - (b.globalOrdinal ?? 0));
      const missingParked = events.filter((event) => !fresh.has(event.eventId) && !known.has(event.eventId));
      const cards = [...previous.cards, ...missingParked.map((event) => parkedDuelCard(event, center))]
        .filter((card, index, all) => all.findIndex((candidate) => candidate.eventId === card.eventId) === index)
        .sort((a, b) => (a.globalOrdinal ?? 0) - (b.globalOrdinal ?? 0));
      let active = previous.active;
      let remaining = queue;
      if (!active && remaining.length) {
        const [first, ...tail] = remaining;
        active = revealingDuelCard(first, center);
        remaining = tail;
      }
      next = { ...previous, center, cards, active, queue: remaining };
    }
    journeyRef.current = next;
    setJourney(next);
  }, [enabled, scopeKey, responseSignature, freshSignature]);

  useLayoutEffect(() => {
    if (!enabled || journey.scopeKey !== scopeKey) return;
    const frame = window.requestAnimationFrame(() => {
      const current = journeyRef.current;
      if (current.scopeKey !== scopeKey) return;
      const events = duelJourneyEvents(actionRef.current, sourceNameRef.current);
      const latestByActor = new Map<string, DuelJourneyEvent>();
      for (const event of events) latestByActor.set(event.actorId, event);
      latestByActor.forEach((event) => ensureDuelHistorySlotVisible(event.eventId));
      if (current.active) ensureDuelHistorySlotVisible(current.active.eventId);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [enabled, scopeKey, journey.scopeKey, responseSignature, freshSignature]);

  const timerEventId = journey.active?.eventId ?? null;
  const timerPhase = journey.active?.phase ?? null;
  useEffect(() => {
    if (!enabled || journey.scopeKey !== scopeKey || !timerEventId || !timerPhase) return;
    const timer = window.setTimeout(() => {
      if (!mountedRef.current) return;
      if (timerPhase === "reveal") {
        const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        ensureDuelHistorySlotVisible(timerEventId);
        setJourney((current) => {
          const currentActive = current.active;
          if (current.scopeKey !== scopeKey || !currentActive || currentActive.eventId !== timerEventId || currentActive.phase !== "reveal") return current;
          const center = current.center ?? currentActive.rect;
          const target = duelHistorySlotRect(timerEventId) ?? {
            left: center.left + (center.width - DUEL_CARD.width) / 2,
            top: center.top + (center.height - DUEL_CARD.height) / 2,
            ...DUEL_CARD,
          };
          if (reducedMotion) return completeDuelJourneyEvent({
            ...current,
            active: { ...currentActive, target, rect: target },
          }, timerEventId);
          return { ...current, active: { ...currentActive, phase: "move", target, rect: target } };
        });
      } else if (timerPhase === "move") {
        setJourney((current) => completeDuelJourneyEvent(current, timerEventId));
      }
    }, timerPhase === "reveal" ? REVEAL_HOLD_MS : MOVE_DURATION_MS + 30);
    return () => window.clearTimeout(timer);
  }, [enabled, scopeKey, journey.scopeKey, timerEventId, timerPhase]);

  useLayoutEffect(() => {
    if (!enabled || journey.scopeKey !== scopeKey) return;
    let observer: ResizeObserver | null = null;
    const reposition = () => {
      const center = battlefieldCenterCard();
      setJourney((current) => {
        if (current.scopeKey !== scopeKey) return current;
        if (current.active) ensureDuelHistorySlotVisible(current.active.eventId);
        const updateActive = (card: JourneyCard): JourneyCard => {
          if (card.phase === "reveal") return { ...card, rect: center };
          const target = duelHistorySlotRect(card.eventId) ?? card.target;
          return { ...card, target, rect: target };
        };
        const cards = current.cards;
        const active = current.active ? updateActive(current.active) : null;
        const unchangedRect = (a: CardRect | null, b: CardRect | null) => a === b || Boolean(a && b
          && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height);
        const sameCard = (a: JourneyCard, b: JourneyCard) => unchangedRect(a.rect, b.rect) && unchangedRect(a.target, b.target);
        if (unchangedRect(current.center, center)
          && (!active || current.active && sameCard(active, current.active))) return current;
        return { ...current, center, cards, active };
      });
      document.querySelectorAll<HTMLElement>("[data-player-anchor], [data-duel-history-actor-id]").forEach((anchor) => observer?.observe(anchor));
    };
    const relayout = () => {
      setHistoryLayoutRevision((revision) => revision + 1);
      reposition();
    };
    window.addEventListener("scroll", reposition, true);
    const viewport = window.visualViewport;
    window.addEventListener("resize", relayout);
    viewport?.addEventListener("resize", relayout);
    observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(relayout);
    const shell = document.querySelector<HTMLElement>(".game-shell");
    if (shell) observer?.observe(shell);
    document.querySelectorAll<HTMLElement>("[data-player-anchor], [data-duel-history-actor-id]").forEach((anchor) => observer?.observe(anchor));
    const mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(relayout);
    if (shell) mutationObserver?.observe(shell, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-player-anchor"] });
    return () => {
      window.removeEventListener("resize", relayout);
      window.removeEventListener("scroll", reposition, true);
      viewport?.removeEventListener("resize", relayout);
      observer?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [enabled, journey.scopeKey, scopeKey]);

  if (!enabled || !sourceName || journey.scopeKey !== scopeKey || !journey.center) return null;
  const eventsByActor = new Map<string, DuelJourneyEvent[]>();
  for (const event of incoming) eventsByActor.set(event.actorId, [...(eventsByActor.get(event.actorId) ?? []), event]);
  const parkedByEventId = new Map(journey.cards.map((card) => [card.eventId, card]));
  const latestResponse = action.responses?.at(-1) ?? null;
  const activeEvent = journey.active;
  const activeEventId = activeEvent?.eventId ?? latestResponse?.eventId ?? action.rootEventId;
  const activeCard = activeEvent?.cardFace ?? latestResponse?.cardFace ?? action.cardFace ?? null;
  const activeActorId = activeEvent?.actorId ?? latestResponse?.actorId ?? action.sourceId;
  const activeLabel = activeEvent?.semanticLabel
    ?? latestResponse?.semanticLabel
    ?? (activeCard ? cardDefinition(activeCard.kind).name.toUpperCase() : action.cardLabel);
  const activeMessage = activeEvent?.ariaLabel ?? latestResponse?.ariaLabel ?? action.publicNotice ?? action.ariaLabel;
  const copyTop = journey.center.top + REVEAL_CARD.height + 7;
  return <section
    className={`public-card-display public-card-display-journey${action.settlement?.exiting || action.publicCounterRead?.exiting ? " is-exiting" : ""}`}
    role="status"
    aria-live="polite"
    aria-atomic="false"
    aria-label={activeEvent?.ariaLabel ?? latestResponse?.ariaLabel ?? action.ariaLabel}
    data-public-card-display="true"
    data-public-card-ready="true"
    data-public-card-motion="duel"
    data-duel-history-layout-revision={historyLayoutRevision}
    data-public-card-event-id={activeEventId}
    data-public-card-root-event-id={action.rootEventId}
    data-public-card-id={activeCard?.id}
    data-public-card-actor-id={activeActorId}
    data-public-card-source-id={action.sourceId}
    data-public-card-target-id={action.targetId ?? undefined}
    data-public-card-settlement-event-id={action.settlement?.eventId}
    data-public-card-settlement-outcome={action.settlement?.outcome}
    data-public-card-result-remaining-ms={resultReadRemainingMs ?? undefined}
  >
    {[...eventsByActor.entries()].map(([actorId, events]) => {
      const layout = duelHistoryViewport(actorId);
      if (!layout) return null;
      return <div
        key={actorId}
        className="public-card-duel-history"
        data-duel-history-actor-id={actorId}
        data-duel-history-side={layout.side}
        data-duel-history-orientation={layout.orientation}
        data-duel-history-count={events.length}
        role="region"
        tabIndex={0}
        aria-label={`${events[0]?.actorName ?? "Player"} Duel card history, ${events.length} committed card${events.length === 1 ? "" : "s"}`}
        style={{ left: layout.rect.left, top: layout.rect.top, width: layout.rect.width, height: layout.rect.height }}
      >
        <div className={`public-card-duel-history-content is-${layout.orientation}`}>
          {events.map((event) => {
            const parked = parkedByEventId.get(event.eventId);
            return <div
              key={event.eventId}
              className="public-card-duel-history-slot"
              data-duel-history-slot-event-id={event.eventId}
              data-duel-history-slot-ordinal={event.globalOrdinal}
              aria-hidden="true"
            >
              {parked && <div
                className={`public-card-journey-card public-card-duel-history-card is-parked is-prior ${parked.role === "root" ? "is-duel-root" : "is-duel-response"}`}
                data-public-card-journey-event-id={parked.eventId}
                data-public-card-journey-actor-id={parked.actorId}
                data-public-card-journey-card-id={parked.cardFace.id}
                data-public-card-journey-phase="parked"
                data-public-card-journey-size="thumbnail"
                data-public-card-journey-ordinal={parked.globalOrdinal}
                aria-hidden="true"
              >
                <CardFace card={parked.cardFace} />
                {parked.semanticLabel && <small className="public-card-journey-semantic">{parked.semanticLabel}</small>}
                <small className="public-card-journey-ordinal" aria-label={`Duel event ${parked.globalOrdinal}`}>#{parked.globalOrdinal}</small>
              </div>}
            </div>;
          })}
        </div>
      </div>;
    })}
    {journey.active && <div
      key={journey.active.eventId}
      className={`public-card-journey-card public-card-duel-history-card ${journey.active.phase === "reveal" ? "is-revealing" : "is-moving"} is-current`}
      data-public-card-journey-event-id={journey.active.eventId}
      data-public-card-journey-actor-id={journey.active.actorId}
      data-public-card-journey-card-id={journey.active.cardFace.id}
      data-public-card-journey-phase={journey.active.phase}
      data-public-card-journey-size={journey.active.rect.width < REVEAL_CARD.width ? "thumbnail" : "reveal"}
      data-public-card-journey-ordinal={journey.active.globalOrdinal}
      data-public-card-primary-card="true"
      aria-hidden="true"
      style={{ left: journey.active.rect.left, top: journey.active.rect.top, width: journey.active.rect.width, height: journey.active.rect.height }}
    >
      <CardFace card={journey.active.cardFace} />
      {journey.active.semanticLabel && <small className="public-card-journey-semantic">{journey.active.semanticLabel}</small>}
      <small className="public-card-journey-ordinal" aria-label={`Duel event ${journey.active.globalOrdinal}`}>#{journey.active.globalOrdinal}</small>
    </div>}
    <ol className="public-card-duel-history-accessible" aria-label="Chronological Duel card history">
      {incoming.map((event) => <li key={event.eventId} value={event.globalOrdinal}>
        Duel event {event.globalOrdinal}: {event.ariaLabel}
      </li>)}
    </ol>
    <div className="public-card-display-copy public-card-display-journey-copy" style={{ top: copyTop }}>
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
  resultReadRemainingMs = null,
}: {
  action: PublicCardDisplayAction | null;
  enabled: boolean;
  sourceName: string | null;
  targetName: string | null;
  resultReadRemainingMs?: number | null;
}) {
  if (!action) return null;
  if (action.motion?.type === "attack-dodge") {
    return <AttackDodgeCardJourney action={action} enabled={enabled} sourceName={sourceName} targetName={targetName} resultReadRemainingMs={resultReadRemainingMs} />;
  }
  if (action.motion?.type === "duel") {
    return <DuelCardJourney action={action} enabled={enabled} sourceName={sourceName} targetName={targetName} resultReadRemainingMs={resultReadRemainingMs} />;
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
