"use client";

import { useLayoutEffect, useRef } from "react";
import { publicCorridorWidth } from "./public-corridor";
import type { PublicActivityStatus } from "../game/public-activity";
import { isAttackDodgeUxTraceActive, recordAttackDodgeUxTrace } from "./attack-dodge-ux-trace";

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
  ".target-card-picker-panel",
  ".public-card-journey-card",
  ".public-card-duel-parked-card",
  ".public-card-display-static-card > .played-card",
  ".effect-notice",
  ".turn-notice",
  ".played-card-stage .played-card",
  ".game-event-stage > div",
  ".harvest-choice-stage > div",
  ".harvest-choice-panel",
  ".victory-banner",
  ".table-resolution-layer .played-card",
  "[data-public-frame]",
  ".local-player-dock",
  ".local-hand-rail",
  ".local-hand",
  ".console-guidance",
  "[data-public-activity-hit-target='true']",
].join(",");
const EXTERNAL_ACTION_OBSTACLES = ".local-player-dock, .local-hand-rail, .local-hand, .console-guidance, [data-public-activity-hit-target='true']";

type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type ProtectedRect = Rect & { sources: string[]; ids: string[] };
type PlacementMemory = {
  inputKey: string;
  reuseKey: string;
  geometryEpoch: number;
  rect: Rect | null;
  visible: boolean;
  layout: string;
  reason: string;
  traceCount: number;
  lastTraceSignature: string;
};

const COLLISION_GAP = 6;
const ACTIVITY_CHIP_GAP = 2;
const CANDIDATE_EPSILON = 0.5;

export function fixedLowerActivityEdge(tableBottom: number, viewportBottom: number) {
  return Math.min(tableBottom - 8, viewportBottom - 8);
}

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
    const id = `${source}@${key}`;
    const existing = rectsByGeometry.get(key);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      if (!existing.ids.includes(id)) existing.ids.push(id);
      return;
    }
    rectsByGeometry.set(key, { ...normalized, sources: [source], ids: [id] });
  };
  for (const element of elements) {
    const insideTable = table.contains(element) || element.closest(".play-table") === table;
    if (!insideTable && !element.matches(EXTERNAL_ACTION_OBSTACLES)) continue;
    const rect = visibleRect(element);
    const parked = element.closest<HTMLElement>('[data-public-card-journey-phase="parked"], .table-played-card.settled');
    const parkedRect = parked ? visibleRect(parked) : null;
    const parkedThumbnail = Boolean(parkedRect && parkedRect.width <= 70 && parkedRect.height <= 110);
    if (!parkedThumbnail && rect && rect.right > tableRect.left && rect.left < tableRect.right
      && rect.bottom > tableRect.top && rect.top < tableRect.bottom) {
      const classNames = typeof element.className === "string" ? element.className.trim().replace(/\s+/g, ".") : "";
      add(rect, `actual:${element.tagName.toLowerCase()}${classNames ? `.${classNames}` : ""}`);
    }

    // A projected owner anchor is a parked thumbnail, which may sit beneath
    // PAC. Still protect an unexpectedly full-sized projected destination.
    const target = {
      left: Number(element.dataset.publicCardJourneyTargetLeft),
      top: Number(element.dataset.publicCardJourneyTargetTop),
      width: Number(element.dataset.publicCardJourneyTargetWidth),
      height: Number(element.dataset.publicCardJourneyTargetHeight),
    };
    if (Object.values(target).every(Number.isFinite) && target.width > 0 && target.height > 0
      && (target.width > 70 || target.height > 110)) {
      const classNames = typeof element.className === "string" ? element.className.trim().replace(/\s+/g, ".") : "";
      add({ ...target, right: target.left + target.width, bottom: target.top + target.height }, `projected-final:${element.tagName.toLowerCase()}${classNames ? `.${classNames}` : ""}`);
    }
  }
  return [...rectsByGeometry.values()];
}

function rectSummary(rect: Rect | DOMRect | null | undefined): Rect | null {
  if (!rect) return null;
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    left: round(rect.left),
    top: round(rect.top),
    right: round(rect.right),
    bottom: round(rect.bottom),
    width: round(rect.width),
    height: round(rect.height),
  };
}

function sameRect(left: Rect | null, right: Rect | null): boolean {
  if (!left || !right) return left === right;
  return [left.left - right.left, left.top - right.top, left.right - right.right, left.bottom - right.bottom]
    .every((difference) => Math.abs(difference) <= 0.5);
}

function placeChip(
  chip: HTMLElement,
  table: HTMLElement,
  harvestPoolReadOnly: boolean,
  fixedLowerCenter: boolean,
  statusKind: PublicActivityStatus["kind"],
  statusStage: string | undefined,
  viewerId: string,
  seatLayoutKey: string,
  previousMemory: PlacementMemory | null,
): PlacementMemory {
  const tableRect = table.getBoundingClientRect();
  const visualViewport = window.visualViewport;
  const viewportTop = Math.max(0, visualViewport?.offsetTop ?? 0);
  const viewportBottom = Math.min(window.innerHeight, (visualViewport?.offsetTop ?? 0) + (visualViewport?.height ?? window.innerHeight));
  const leftBound = Math.max(tableRect.left + 8, 8);
  const rightBound = Math.min(tableRect.right - 8, window.innerWidth - 8);
  const upperBandTop = Math.max(tableRect.top + 8, viewportTop + 8);
  const lowerBandTop = Math.max(tableRect.top + tableRect.height * 0.58, viewportTop + 8);
  const bottom = Math.min(tableRect.bottom - 8, viewportBottom - 8);
  // Keep the lower edge attached to the battlefield. The compact countdown
  // occupies a separate right-side lane; its real measured rectangle remains
  // in protectedRects() and is checked below instead of reserving its height
  // across the entire PAC width.
  const fixedLowerEdge = fixedLowerActivityEdge(tableRect.bottom, viewportBottom);
  const fixedBand = {
    top: Math.max(tableRect.top + 8, viewportTop + 8, fixedLowerEdge - 112),
    bottom: fixedLowerEdge,
  };
  const fixedWidth = Math.min(340, Math.max(0, rightBound - leftBound));
  chip.style.width = `${fixedLowerCenter
    ? fixedWidth
    : publicCorridorWidth(table, { top: lowerBandTop, bottom }, 340, { reserveTimer: false })}px`;
  const width = chip.offsetWidth;
  const height = chip.offsetHeight;
  const placementBottom = fixedLowerCenter ? fixedLowerEdge : bottom;
  const placementTop = fixedLowerCenter ? fixedBand.top : lowerBandTop;
  const firstTop = placementBottom - height;
  const obstacles = protectedRects(table);
  const candidateRegion = {
    left: leftBound,
    top: placementTop,
    right: rightBound,
    bottom: placementBottom,
    width: Math.max(0, rightBound - leftBound),
    height: Math.max(0, placementBottom - placementTop),
  };
  const relevantObstacles = fixedLowerCenter || harvestPoolReadOnly
    ? obstacles
    : obstacles.filter((obstacle) => intersects(obstacle, candidateRegion, ACTIVITY_CHIP_GAP));
  const placementContext = {
    table: rectSummary(tableRect),
    viewport: { width: window.innerWidth, height: window.innerHeight, top: viewportTop, bottom: viewportBottom },
    chip: { width, height },
    statusKind,
    statusStage: statusStage ?? null,
    harvestPoolReadOnly,
    fixedLowerCenter,
    viewerId: fixedLowerCenter ? null : viewerId,
    seatLayoutKey: fixedLowerCenter ? null : seatLayoutKey,
  };
  const obstacleSignature = relevantObstacles.map(({ left, top, right, bottom: obstacleBottom, ids }) => ({
      rect: [left, top, right, obstacleBottom].map((value) => Math.round(value * 2) / 2),
      ids: [...ids].sort(),
    })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const inputKey = JSON.stringify({ ...placementContext, obstacles: obstacleSignature });
  const preferredCenter = tableRect.left + tableRect.width / 2;
  const centeredCandidate = width > 0 && height > 0
    ? {
      left: preferredCenter - width / 2,
      top: firstTop,
      right: preferredCenter + width / 2,
      bottom: firstTop + height,
      width,
      height,
    }
    : null;
  const centerCollisionIds = centeredCandidate
    ? obstacles.filter((obstacle) => intersects(centeredCandidate, obstacle, ACTIVITY_CHIP_GAP)).flatMap(({ ids }) => ids).sort()
    : [];
  const previousPlacementCollisionIds = previousMemory?.rect
    ? obstacles.filter((obstacle) => intersects(previousMemory.rect!, obstacle, ACTIVITY_CHIP_GAP)).flatMap(({ ids }) => ids).sort()
    : [];
  const reuseKey = JSON.stringify({ placementContext, centerCollisionIds, previousPlacementCollisionIds });
  const geometryEpoch = !previousMemory ? 1
    : previousMemory.reuseKey === reuseKey ? previousMemory.geometryEpoch : previousMemory.geometryEpoch + 1;
  const diagnosticsEnabled = new URLSearchParams(window.location.search).get("publicActivityChipDiagnostics") === "1";
  const traceEnabled = diagnosticsEnabled || isAttackDodgeUxTraceActive();
  const trace = traceEnabled
    ? {
      measuredAt: performance.now(),
      table: rectSummary(tableRect),
      chip: { width, height },
      activityChipGap: ACTIVITY_CHIP_GAP,
      safeBounds: { left: leftBound, right: rightBound, lowerBandTop: placementTop, bottom: placementBottom },
      obstacles: obstacles.slice(0, 64).map(({ sources, ids, ...rect }) => ({ ...rect, sources, ids })),
      candidates: [] as Array<Record<string, unknown>>,
    }
    : null;
  const finishTrace = (outcome: string, chosen?: Record<string, unknown>, reason = outcome): PlacementMemory => {
    const visible = Boolean(visibleRect(chip));
    const chosenRect = rectSummary(visibleRect(chip));
    const chosenCollisionIds = chosenRect
      ? obstacles.filter((obstacle) => intersects(chosenRect, obstacle, ACTIVITY_CHIP_GAP)).flatMap(({ ids }) => ids).sort()
      : [];
    const reused = outcome === "reused" || outcome === "reused:hidden";
    const decision = reused ? "reuse" : visible ? "reflow" : "hide";
    let nextMemory: PlacementMemory = {
      inputKey,
      reuseKey,
      geometryEpoch,
      rect: chosenRect,
      visible,
      layout: chip.dataset.publicActivityLayout ?? (visible ? "placed" : "hidden"),
      reason,
      traceCount: previousMemory?.traceCount ?? 0,
      lastTraceSignature: previousMemory?.lastTraceSignature ?? "",
    };
    if (trace) {
      const data = {
        ...trace,
        outcome,
        chosen,
        statusKind,
        decision,
        placementReason: reason,
        geometryEpoch,
        previousRect: previousMemory?.rect ?? null,
        centeredCandidateRect: rectSummary(centeredCandidate),
        chosenRect,
        actualObstacleIds: obstacles.flatMap((obstacle) => obstacle.ids.filter((id) => id.startsWith("actual:"))).sort().slice(0, 64),
        projectedObstacleIds: obstacles.flatMap((obstacle) => obstacle.ids.filter((id) => id.startsWith("projected-final:"))).sort().slice(0, 64),
        centerCollisionIds: centeredCandidate
          ? obstacles.filter((obstacle) => intersects(centeredCandidate, obstacle, ACTIVITY_CHIP_GAP)).flatMap(({ ids }) => ids).sort()
          : [],
        chosenCollisionIds,
        rejectedCandidates: trace.candidates.filter((candidate) => candidate.accepted === false).slice(0, 20),
        visibility: visible ? "visible" : "hidden",
      };
      const signature = JSON.stringify({ ...data, measuredAt: 0 });
      const withinTraceLimit = nextMemory.traceCount < 32;
      if (withinTraceLimit && signature !== nextMemory.lastTraceSignature) {
        if (isAttackDodgeUxTraceActive()) recordAttackDodgeUxTrace("public-activity-chip-placement", data);
        if (diagnosticsEnabled) console.info("[U13-B-G activity-chip placement]", data);
        nextMemory = { ...nextMemory, traceCount: nextMemory.traceCount + 1, lastTraceSignature: signature };
      }
    }
    return nextMemory;
  };

  const currentRect = rectSummary(visibleRect(chip));
  const currentMinTop = fixedLowerCenter ? fixedBand.top : lowerBandTop;
  const currentIsSafe = currentRect && currentRect.left >= leftBound && currentRect.right <= rightBound
    && currentRect.top >= currentMinTop && currentRect.bottom <= placementBottom
    && !obstacles.some((obstacle) => intersects(currentRect, obstacle, ACTIVITY_CHIP_GAP));
  if (previousMemory?.reuseKey === reuseKey) {
    if (previousMemory.visible && currentIsSafe && sameRect(previousMemory.rect, currentRect)) {
      return finishTrace("reused", { rect: currentRect, horizontalOffset: Math.round((currentRect.left + currentRect.width / 2 - preferredCenter) * 10) / 10 }, "same-inputs-still-safe");
    }
    if (!previousMemory.visible && !currentRect && chip.style.visibility === "hidden") {
      return finishTrace("reused:hidden", undefined, "same-inputs-still-no-safe-location");
    }
  }

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
      return finishTrace("placed:harvest-root-rail", {
        rect: candidate,
        root: { left: rootRect.left, top: rootRect.top, right: rootRect.right, bottom: rootRect.bottom },
        timer: timerRect ? { left: timerRect.left, top: timerRect.top, right: timerRect.right, bottom: timerRect.bottom } : null,
      }, "safe-harvest-root-rail");
    }
  }

  if (fixedLowerCenter) {
    const rect = {
      left: tableRect.left + (tableRect.width - width) / 2,
      top: fixedLowerEdge - height,
      right: tableRect.left + (tableRect.width + width) / 2,
      bottom: fixedLowerEdge,
      width,
      height,
    };
    const blockers = obstacles.filter((obstacle) => intersects(rect, obstacle, ACTIVITY_CHIP_GAP));
    const outOfBounds = rect.left < leftBound || rect.right > rightBound
      || rect.top < fixedBand.top || rect.bottom > bottom;
    chip.style.left = `${rect.left - tableRect.left}px`;
    chip.style.top = `${rect.top - tableRect.top}px`;
    chip.style.visibility = "visible";
    chip.dataset.publicActivityLayout = blockers.length || outOfBounds ? "fixed-lower-center-blocked" : "fixed-lower-center";
    chip.dataset.publicActivityPlacementBlockers = [
      ...blockers.flatMap(({ ids }) => ids),
      ...(outOfBounds ? ["fixed-lower-center-out-of-bounds"] : []),
    ].join("|") || undefined;
    return finishTrace(blockers.length || outOfBounds ? "placed:fixed-lower-center-blocked" : "placed:fixed-lower-center",
      { rect, blockers: blockers.flatMap(({ ids }) => ids), outOfBounds },
      blockers.length || outOfBounds ? "fixed-lower-center-protected-area-collision" : "fixed-lower-center");
  }

  if (width <= 0 || height <= 0 || rightBound - leftBound < width || firstTop < upperBandTop) {
    chip.style.visibility = "hidden";
    chip.dataset.publicActivityLayout = "hidden";
    return finishTrace("hidden:insufficient-safe-area", undefined, "safe-area-too-small");
  }

  const regularVerticalSteps = [0, height + 8, (height + 8) * 2];
  const obstacleEdgeTops = obstacles.flatMap((obstacle) => [
    obstacle.top - height - ACTIVITY_CHIP_GAP - CANDIDATE_EPSILON,
    obstacle.bottom + ACTIVITY_CHIP_GAP + CANDIDATE_EPSILON,
  ]);
  const verticalSteps = [...new Set([
    ...regularVerticalSteps,
    firstTop - lowerBandTop,
    firstTop - upperBandTop,
    ...obstacleEdgeTops.map((top) => firstTop - top),
  ].map((step) => Math.round(step * 100) / 100))]
    .filter((step) => {
      const top = firstTop - step;
      return top >= upperBandTop && top + height <= bottom;
    });
  const minCenter = leftBound + width / 2;
  const maxCenter = rightBound - width / 2;
  const placements: Array<{ center: number; top: number; verticalStep: number }> = [];
  for (const verticalStep of verticalSteps) {
    const top = firstTop - verticalStep;
    const relevantObstacles = obstacles.filter((obstacle) =>
      top < obstacle.bottom + ACTIVITY_CHIP_GAP && top + height + ACTIVITY_CHIP_GAP > obstacle.top);
    const rawCenters = [preferredCenter];
    for (const obstacle of relevantObstacles) {
      rawCenters.push(
        obstacle.left - width / 2 - ACTIVITY_CHIP_GAP - CANDIDATE_EPSILON,
        obstacle.right + width / 2 + ACTIVITY_CHIP_GAP + CANDIDATE_EPSILON,
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
    return Number(left.top < lowerBandTop) - Number(right.top < lowerBandTop)
      || Math.abs(leftOffset) - Math.abs(rightOffset)
      || left.verticalStep - right.verticalStep
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
    const collisions = obstacles.filter((obstacle) => intersects(candidate, obstacle, ACTIVITY_CHIP_GAP));
    const horizontalOffset = Math.round((center - preferredCenter) * 10) / 10;
    const candidateRecord = {
      verticalStep,
      horizontalOffset,
      rect: candidate,
      accepted: collisions.length === 0,
      collisionIds: collisions.flatMap(({ ids }) => ids).sort(),
      rejectedBy: collisions.map(({ sources, ids, ...rect }) => ({ ...rect, sources, ids })),
    };
    if (trace && trace.candidates.length < 64) trace.candidates.push(candidateRecord);
    if (collisions.length > 0) continue;
    chip.style.left = `${candidate.left - tableRect.left}px`;
    chip.style.top = `${candidate.top - tableRect.top}px`;
    chip.style.visibility = "visible";
    chip.dataset.publicActivityLayout = `${top < lowerBandTop ? "upper-band" : verticalStep === 0 ? "bottom" : "lower-band"}-${horizontalOffset === 0 ? "center" : horizontalOffset < 0 ? "left" : "right"}`;
    return finishTrace("placed", candidateRecord, horizontalOffset === 0
      ? "centered-slot-safe"
      : "center-blocked-minimal-translation-safe");
  }

  chip.style.visibility = "hidden";
  chip.dataset.publicActivityLayout = "hidden";
  return finishTrace("hidden:no-safe-candidate", undefined, "no-collision-free-candidate");
}

export function PublicActivityChip({ status, viewerId, seatLayoutKey, harvestPoolReadOnly = false, stableLowerCenter = false }: {
  status: PublicActivityStatus;
  viewerId: string;
  seatLayoutKey: string;
  harvestPoolReadOnly?: boolean;
  stableLowerCenter?: boolean;
}) {
  const chipRef = useRef<HTMLDivElement>(null);
  const placementMemoryRef = useRef<PlacementMemory | null>(null);
  const stableLowerCenterLatchRef = useRef(false);

  useLayoutEffect(() => {
    const chip = chipRef.current;
    const table = chip?.closest<HTMLElement>(".play-table");
    if (!chip || !table) return;
    if (stableLowerCenter || status.kind === "target-card-choice") stableLowerCenterLatchRef.current = true;
    else if (status.kind !== "turn") stableLowerCenterLatchRef.current = false;
    const useFixedLowerCenter = stableLowerCenter || status.kind === "target-card-choice"
      || status.kind === "turn" && stableLowerCenterLatchRef.current;
    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        placementMemoryRef.current = placeChip(
          chip,
          table,
          harvestPoolReadOnly,
          useFixedLowerCenter,
          status.kind,
          status.stage,
          viewerId,
          seatLayoutKey,
          placementMemoryRef.current,
        );
      });
    };
    const relevantMutation = (node: Node): boolean => {
      const element = node instanceof HTMLElement ? node : node.parentElement;
      return Boolean(element && (element.matches(SAFE_OBSTACLES)
        || element.querySelector(SAFE_OBSTACLES)
        || element.matches("[data-player-count], [data-seat-topology]")));
    };
    const mutationObserver = new MutationObserver((records) => {
      if (records.some((record) => {
        if (record.type === "attributes") {
          if (record.attributeName !== "style") return true;
          return record.target !== chip && relevantMutation(record.target);
        }
        return [...record.addedNodes, ...record.removedNodes].some(relevantMutation);
      })) schedule();
    });
    const mutationObserverOptions: MutationObserverInit = {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        // Protected obstacles enter/leave their collision geometry through
        // state classes (for example, a centred reveal becoming a parked mini).
        "class",
        "style",
        "data-player-count",
        "data-seat-topology",
        "data-public-card-journey-target-left",
        "data-public-card-journey-target-top",
        "data-public-card-layout-pending",
        "data-public-activity-hit-target",
      ],
    };
    mutationObserver.observe(table, mutationObserverOptions);
    const externalObstacles = [...document.querySelectorAll<HTMLElement>(EXTERNAL_ACTION_OBSTACLES)];
    for (const obstacle of externalObstacles) mutationObserver.observe(obstacle, mutationObserverOptions);
    const harvestStage = table.querySelector<HTMLElement>(".harvest-choice-stage");
    const harvestPanel = harvestStage?.querySelector<HTMLElement>(".harvest-choice-panel");
    const harvestLayoutObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(schedule);
    if (harvestStage) harvestLayoutObserver?.observe(harvestStage, { attributes: true, attributeFilter: ["style"] });
    if (harvestPanel) harvestLayoutObserver?.observe(harvestPanel, { attributes: true, attributeFilter: ["style"] });
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resizeObserver?.observe(table);
    resizeObserver?.observe(chip);
    for (const obstacle of externalObstacles) resizeObserver?.observe(obstacle);
    if (harvestPanel) resizeObserver?.observe(harvestPanel);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    schedule();

    return () => {
      window.cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      harvestLayoutObserver?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [harvestPoolReadOnly, status.kind, status.stage, status.text, stableLowerCenter, viewerId, seatLayoutKey]);

  return <div
    ref={chipRef}
    className="public-activity-chip"
    data-public-activity-chip="true"
    data-public-activity-kind={status.kind}
    data-public-activity-layout="pending"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    aria-label={[status.text, status.stage].filter(Boolean).join(" ")}
    style={{ visibility: "hidden" }}
  >
    <strong data-public-activity-heading="true">{status.heading ?? status.text}</strong>
    {status.stage && <small data-public-activity-stage="true">{status.stage}</small>}
  </div>;
}
