"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Card, CardKind } from "../game/model";
import type { PresentationSnapshotRootAction } from "../game/presentation-snapshot";
import { cardDefinition } from "../game/cards";
import { CardFace } from "./card-face";

type PublicCardDisplayResponseNode = {
  eventId: string;
  actorId: string;
  actorName: string;
  cardFace?: Card;
  ariaLabel: string;
};

type PublicCardDisplayMotion = {
  type: "attack-dodge";
  /** Room and interaction identity keep retained card state isolated. */
  scopeKey: string;
  rootFresh: boolean;
  responseFresh: boolean;
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
  phase: "reveal" | "move" | "parked";
  rect: CardRect;
  target: CardRect;
};
type JourneyState = { scopeKey: string; cards: JourneyCard[]; center: CardRect | null };

const REVEAL_CARD = { width: 60, height: 90 };
const PARKED_CARD = { width: 48, height: 72 };
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
  const obstacles = [...table.querySelectorAll<HTMLElement>(
    ".opponent-player-card[data-player-anchor], .draw-stack, .discard-stack, .player-board-status, .visible-countdown",
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
