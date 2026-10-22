"use client";

import { useLayoutEffect, useRef } from "react";
import type { PublicActivityStatus } from "../game/public-activity";

const SAFE_OBSTACLES = [
  ".opponent-player-card[data-player-anchor]",
  ".player-square",
  ".player-board-status",
  ".visible-countdown",
  ".stage-system-cluster",
  ".hero-focus",
  ".opponent-inspection-floating-shell",
  ".card-details-panel",
  ".hero-details-panel",
  ".interaction-stage-dying",
  ".dying-handoff-compact",
  ".public-card-display-journey-copy",
  ".public-card-journey-card",
  ".public-card-duel-parked-card",
  ".public-card-display-static-card > .played-card",
  ".effect-notice",
  ".turn-notice",
  ".played-card-stage .played-card",
  ".game-event-stage > div",
  ".harvest-choice-stage > div",
  ".victory-banner",
  ".table-resolution-layer .played-card",
  "[data-public-frame]",
].join(",");

type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type ProtectedRect = Rect & { sources: string[] };

const COLLISION_GAP = 6;
const CANDIDATE_EPSILON = 0.5;

function intersects(left: Rect, right: Rect, gap = 6): boolean {
  return left.left < right.right + gap && left.right + gap > right.left
    && left.top < right.bottom + gap && left.bottom + gap > right.top;
}

function visibleRect(element: HTMLElement): DOMRect | null {
  if (!element.isConnected) return null;
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return null;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? rect : null;
}

function protectedRects(table: HTMLElement): ProtectedRect[] {
  const tableRect = table.getBoundingClientRect();
  const elements = [...document.querySelectorAll<HTMLElement>(SAFE_OBSTACLES)];
  const rectsByGeometry = new Map<string, ProtectedRect>();
  const add = (rect: Rect, source: string) => {
    const normalized: Rect = {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
    const rounded = (value: number) => Math.round(value * 2) / 2;
    const key = [normalized.left, normalized.top, normalized.right, normalized.bottom].map(rounded).join(":");
    const existing = rectsByGeometry.get(key);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      return;
    }
    rectsByGeometry.set(key, { ...normalized, sources: [source] });
  };
  for (const element of elements) {
    if (table.contains(element) === false && element.closest(".play-table") !== table) continue;
    const rect = visibleRect(element);
    if (rect && rect.right > tableRect.left && rect.left < tableRect.right
      && rect.bottom > tableRect.top && rect.top < tableRect.bottom) {
      const classNames = typeof element.className === "string" ? element.className.trim().replace(/\s+/g, ".") : "";
      add(rect, `actual:${element.tagName.toLowerCase()}${classNames ? `.${classNames}` : ""}`);
    }

    // Public journey cards expose their server-derived final owner anchor.
    // Reserve it as soon as the card is mounted so the chip will not jump as
    // that genuine card moves from its centre reveal to the Seat/Dock.
    const target = {
      left: Number(element.dataset.publicCardJourneyTargetLeft),
      top: Number(element.dataset.publicCardJourneyTargetTop),
      width: Number(element.dataset.publicCardJourneyTargetWidth),
      height: Number(element.dataset.publicCardJourneyTargetHeight),
    };
    if (Object.values(target).every(Number.isFinite) && target.width > 0 && target.height > 0) {
      const classNames = typeof element.className === "string" ? element.className.trim().replace(/\s+/g, ".") : "";
      add({ ...target, right: target.left + target.width, bottom: target.top + target.height }, `projected-final:${element.tagName.toLowerCase()}${classNames ? `.${classNames}` : ""}`);
    }
  }
  return [...rectsByGeometry.values()];
}

function placeChip(chip: HTMLElement, table: HTMLElement, harvestPoolReadOnly: boolean): void {
  const tableRect = table.getBoundingClientRect();
  const width = chip.offsetWidth;
  const height = chip.offsetHeight;
  const visualViewport = window.visualViewport;
  const viewportTop = Math.max(0, visualViewport?.offsetTop ?? 0);
  const viewportBottom = Math.min(window.innerHeight, (visualViewport?.offsetTop ?? 0) + (visualViewport?.height ?? window.innerHeight));
  const leftBound = Math.max(tableRect.left + 8, 8);
  const rightBound = Math.min(tableRect.right - 8, window.innerWidth - 8);
  const lowerBandTop = Math.max(tableRect.top + tableRect.height * 0.58, viewportTop + 8);
  const bottom = Math.min(tableRect.bottom - 8, viewportBottom - 8);
  const firstTop = bottom - height;
  const obstacles = protectedRects(table);
  const trace = new URLSearchParams(window.location.search).get("publicActivityChipDiagnostics") === "1"
    ? {
      measuredAt: performance.now(),
      table: { left: tableRect.left, top: tableRect.top, right: tableRect.right, bottom: tableRect.bottom, width: tableRect.width, height: tableRect.height },
      chip: { width, height },
      safeBounds: { left: leftBound, right: rightBound, lowerBandTop, bottom },
      obstacles: obstacles.map(({ sources, ...rect }) => ({ ...rect, sources })),
      candidates: [] as Array<Record<string, unknown>>,
    }
    : null;
  const finishTrace = (outcome: string, chosen?: Record<string, unknown>) => {
    if (trace) console.info("[U13-B-G activity-chip placement]", { ...trace, outcome, chosen });
  };

  if (harvestPoolReadOnly) {
    const root = table.querySelector<HTMLElement>("[data-harvest-root-parked='true']");
    const timer = table.querySelector<HTMLElement>(".stage-system-cluster .visible-countdown-event");
    const rootRect = root?.getBoundingClientRect();
    const timerRect = timer ? visibleRect(timer) : null;
    const laneLeft = rootRect?.right !== undefined ? rootRect.right + COLLISION_GAP : leftBound;
    const laneRight = timerRect ? timerRect.left - COLLISION_GAP : rightBound;
    const railTop = rootRect?.top ?? firstTop;
    const candidate = {
      left: laneLeft,
      top: railTop,
      right: laneLeft + width,
      bottom: railTop + height,
      width,
      height,
    };
    const insideSafeArea = laneLeft >= leftBound && candidate.right <= rightBound
      && laneRight - laneLeft >= width && railTop >= viewportTop + 4
      && candidate.bottom <= bottom;
    const collisions = obstacles.filter((obstacle) => intersects(candidate, obstacle));
    if (rootRect && insideSafeArea && collisions.length === 0) {
      chip.style.left = `${candidate.left - tableRect.left}px`;
      chip.style.top = `${candidate.top - tableRect.top}px`;
      chip.style.visibility = "visible";
      chip.dataset.publicActivityLayout = "harvest-root-rail";
      finishTrace("placed:harvest-root-rail", {
        rect: candidate,
        root: { left: rootRect.left, top: rootRect.top, right: rootRect.right, bottom: rootRect.bottom },
        timer: timerRect ? { left: timerRect.left, top: timerRect.top, right: timerRect.right, bottom: timerRect.bottom } : null,
      });
      return;
    }
  }

  if (width <= 0 || height <= 0 || rightBound - leftBound < width || firstTop < lowerBandTop) {
    chip.style.visibility = "hidden";
    chip.dataset.publicActivityLayout = "hidden";
    finishTrace("hidden:insufficient-safe-area");
    return;
  }

  const preferredCenter = tableRect.left + tableRect.width / 2;
  const verticalSteps = [0, height + 8, (height + 8) * 2];
  const minCenter = leftBound + width / 2;
  const maxCenter = rightBound - width / 2;
  const placements: Array<{ center: number; top: number; verticalStep: number }> = [];
  for (const verticalStep of verticalSteps) {
    const top = firstTop - verticalStep;
    if (top < lowerBandTop) {
      trace?.candidates.push({
        verticalStep,
        horizontalOffset: 0,
        rect: { left: preferredCenter - width / 2, top, right: preferredCenter + width / 2, bottom: top + height, width, height },
        accepted: false,
        rejectedBy: [{ reason: "outside-safe-lower-bound", lowerBandTop }],
      });
      continue;
    }
    const relevantObstacles = obstacles.filter((obstacle) =>
      top < obstacle.bottom + COLLISION_GAP && top + height + COLLISION_GAP > obstacle.top);
    const rawCenters = [preferredCenter];
    for (const obstacle of relevantObstacles) {
      rawCenters.push(
        obstacle.left - width / 2 - COLLISION_GAP - CANDIDATE_EPSILON,
        obstacle.right + width / 2 + COLLISION_GAP + CANDIDATE_EPSILON,
      );
    }
    const candidates = [...new Set(rawCenters.map((center) => {
      const clamped = Math.max(minCenter, Math.min(maxCenter, center));
      return Math.round(clamped * 100) / 100;
    }))];
    for (const center of candidates) placements.push({ center, top, verticalStep });
  }

  placements.sort((left, right) => {
    const leftOffset = left.center - preferredCenter;
    const rightOffset = right.center - preferredCenter;
    const leftDistance = Math.hypot(leftOffset, left.verticalStep);
    const rightDistance = Math.hypot(rightOffset, right.verticalStep);
    return leftDistance - rightDistance
      || left.verticalStep - right.verticalStep
      || Math.abs(leftOffset) - Math.abs(rightOffset)
      || left.center - right.center;
  });

  for (const placement of placements) {
    const { center, top, verticalStep } = placement;
    const candidate = {
      left: center - width / 2,
      top,
      right: center + width / 2,
      bottom: top + height,
      width,
      height,
    };
    const collisions = obstacles.filter((obstacle) => intersects(candidate, obstacle));
    const horizontalOffset = Math.round((center - preferredCenter) * 10) / 10;
    const candidateRecord = {
      verticalStep,
      horizontalOffset,
      rect: candidate,
      accepted: collisions.length === 0,
      rejectedBy: collisions.map(({ sources, ...rect }) => ({ ...rect, sources })),
    };
    trace?.candidates.push(candidateRecord);
    if (collisions.length > 0) continue;
    chip.style.left = `${candidate.left - tableRect.left}px`;
    chip.style.top = `${candidate.top - tableRect.top}px`;
    chip.style.visibility = "visible";
    chip.dataset.publicActivityLayout = `${verticalStep === 0 ? "bottom" : "lower-band"}-${horizontalOffset === 0 ? "center" : horizontalOffset < 0 ? "left" : "right"}`;
    finishTrace("placed", candidateRecord);
    return;
  }

  chip.style.visibility = "hidden";
  chip.dataset.publicActivityLayout = "hidden";
  finishTrace("hidden:no-safe-candidate");
}

export function PublicActivityChip({ status, viewerId, seatLayoutKey, harvestPoolReadOnly = false }: {
  status: PublicActivityStatus;
  viewerId: string;
  seatLayoutKey: string;
  harvestPoolReadOnly?: boolean;
}) {
  const chipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const chip = chipRef.current;
    const table = chip?.closest<HTMLElement>(".play-table");
    if (!chip || !table) return;
    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => placeChip(chip, table, harvestPoolReadOnly));
    };
    const relevantMutation = (node: Node): boolean => {
      const element = node instanceof HTMLElement ? node : node.parentElement;
      return Boolean(element && (element.matches(SAFE_OBSTACLES)
        || element.querySelector(SAFE_OBSTACLES)
        || element.matches("[data-player-count], [data-seat-topology]")));
    };
    const mutationObserver = new MutationObserver((records) => {
      if (records.some((record) => record.type === "attributes"
        || [...record.addedNodes, ...record.removedNodes].some(relevantMutation))) schedule();
    });
    mutationObserver.observe(table, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "data-player-count",
        "data-seat-topology",
        "data-public-card-journey-target-left",
        "data-public-card-journey-target-top",
        "data-public-card-layout-pending",
      ],
    });
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resizeObserver?.observe(table);
    resizeObserver?.observe(chip);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    schedule();

    return () => {
      window.cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [harvestPoolReadOnly, status.kind, status.text, viewerId, seatLayoutKey]);

  return <div
    ref={chipRef}
    className="public-activity-chip"
    data-public-activity-chip="true"
    data-public-activity-kind={status.kind}
    data-public-activity-layout="pending"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    aria-label={status.text}
    style={{ visibility: "hidden" }}
  >
    <strong data-public-activity-heading="true">{status.heading ?? status.text}</strong>
    {status.stage && <small data-public-activity-stage="true">{status.stage}</small>}
  </div>;
}
