"use client";

import { useLayoutEffect, useRef } from "react";
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

function placeNearPlayerSeat(chip: HTMLElement, table: HTMLElement, playerId: string): boolean {
  const seat = [...table.querySelectorAll<HTMLElement>(".opponent-player-card[data-player-anchor]")]
    .find((candidate) => candidate.dataset.playerAnchor === playerId);
  const seatRect = seat && visibleRect(seat);
  if (!seatRect) return false;

  const tableRect = table.getBoundingClientRect();
  const width = chip.offsetWidth;
  const height = chip.offsetHeight;
  const visualViewport = window.visualViewport;
  const viewportTop = Math.max(0, visualViewport?.offsetTop ?? 0);
  const viewportBottom = Math.min(window.innerHeight, (visualViewport?.offsetTop ?? 0) + (visualViewport?.height ?? window.innerHeight));
  const leftBound = Math.max(tableRect.left + 8, 8);
  const rightBound = Math.min(tableRect.right - 8, window.innerWidth - 8);
  const minCenter = leftBound + width / 2;
  const maxCenter = rightBound - width / 2;
  if (width <= 0 || height <= 0 || minCenter > maxCenter) return false;

  const seatCenter = seatRect.left + seatRect.width / 2;
  const center = Math.max(minCenter, Math.min(maxCenter, seatCenter));
  const candidates = [
    ...[COLLISION_GAP, COLLISION_GAP + 12, COLLISION_GAP + 24, COLLISION_GAP + 36]
      .map((offset) => ({ center, top: seatRect.bottom + offset })),
    { center, top: seatRect.top - height - COLLISION_GAP },
  ];
  const obstacles = protectedRects(table);
  for (const candidate of candidates) {
    const rect = {
      left: candidate.center - width / 2,
      top: candidate.top,
      right: candidate.center + width / 2,
      bottom: candidate.top + height,
      width,
      height,
    };
    if (rect.left < leftBound || rect.right > rightBound
      || rect.top < tableRect.top + 4 || rect.top < viewportTop + 4
      || rect.bottom > Math.min(tableRect.bottom - 4, viewportBottom - 4)
      || obstacles.some((obstacle) => intersects(rect, obstacle, ACTIVITY_CHIP_GAP))) continue;

    chip.style.left = `${rect.left - tableRect.left}px`;
    chip.style.top = `${rect.top - tableRect.top}px`;
    chip.style.visibility = "visible";
    chip.dataset.publicActivityLayout = "target-seat-adjacent";
    return true;
  }
  return false;
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
  anchorPlayerId: string | undefined,
  allowUpperSafeBand: boolean,
  statusKind: PublicActivityStatus["kind"],
  statusStage: string | undefined,
  viewerId: string,
  seatLayoutKey: string,
  previousMemory: PlacementMemory | null,
): PlacementMemory {
  const tableRect = table.getBoundingClientRect();
  const width = chip.offsetWidth;
  const height = chip.offsetHeight;
  const visualViewport = window.visualViewport;
  const viewportTop = Math.max(0, visualViewport?.offsetTop ?? 0);
  const viewportBottom = Math.min(window.innerHeight, (visualViewport?.offsetTop ?? 0) + (visualViewport?.height ?? window.innerHeight));
  const leftBound = Math.max(tableRect.left + 8, 8);
  const rightBound = Math.min(tableRect.right - 8, window.innerWidth - 8);
  const lowerBandTop = Math.max(tableRect.top + (allowUpperSafeBand ? 8 : tableRect.height * 0.58), viewportTop + 8);
  const bottom = Math.min(tableRect.bottom - 8, viewportBottom - 8);
  const firstTop = bottom - height;
  const obstacles = protectedRects(table);
  const candidateRegion = {
    left: leftBound,
    top: lowerBandTop,
    right: rightBound,
    bottom,
    width: Math.max(0, rightBound - leftBound),
    height: Math.max(0, bottom - lowerBandTop),
  };
  const relevantObstacles = allowUpperSafeBand || anchorPlayerId || harvestPoolReadOnly
    ? obstacles
    : obstacles.filter((obstacle) => intersects(obstacle, candidateRegion, ACTIVITY_CHIP_GAP));
  const placementContext = {
    table: rectSummary(tableRect),
    viewport: { width: window.innerWidth, height: window.innerHeight, top: viewportTop, bottom: viewportBottom },
    chip: { width, height },
    statusKind,
    statusStage: statusStage ?? null,
    anchorPlayerId: anchorPlayerId ?? null,
    harvestPoolReadOnly,
    allowUpperSafeBand,
    viewerId,
    seatLayoutKey,
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
      safeBounds: { left: leftBound, right: rightBound, lowerBandTop, bottom },
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
  const currentMinTop = allowUpperSafeBand || anchorPlayerId || harvestPoolReadOnly ? tableRect.top + 4 : lowerBandTop;
  const currentIsSafe = currentRect && currentRect.left >= leftBound && currentRect.right <= rightBound
    && currentRect.top >= currentMinTop && currentRect.bottom <= bottom
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

  if (anchorPlayerId && placeNearPlayerSeat(chip, table, anchorPlayerId)) {
    return finishTrace("placed:target-seat-adjacent", { rect: rectSummary(visibleRect(chip)) }, "safe-target-seat-anchor");
  }

  if (width <= 0 || height <= 0 || rightBound - leftBound < width || firstTop < lowerBandTop) {
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
    ...obstacleEdgeTops.map((top) => firstTop - top),
  ].map((step) => Math.round(step * 100) / 100))]
    .filter((step) => {
      const top = firstTop - step;
      return top >= lowerBandTop && top + height <= bottom;
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
    chip.dataset.publicActivityLayout = `${verticalStep === 0 ? "bottom" : "lower-band"}-${horizontalOffset === 0 ? "center" : horizontalOffset < 0 ? "left" : "right"}`;
    return finishTrace("placed", candidateRecord, verticalStep === 0 && horizontalOffset === 0
      ? "centered-slot-safe"
      : "center-blocked-minimal-translation-safe");
  }

  chip.style.visibility = "hidden";
  chip.dataset.publicActivityLayout = "hidden";
  return finishTrace("hidden:no-safe-candidate", undefined, "no-collision-free-candidate");
}

export function PublicActivityChip({ status, viewerId, seatLayoutKey, harvestPoolReadOnly = false }: {
  status: PublicActivityStatus;
  viewerId: string;
  seatLayoutKey: string;
  harvestPoolReadOnly?: boolean;
}) {
  const chipRef = useRef<HTMLDivElement>(null);
  const placementMemoryRef = useRef<PlacementMemory | null>(null);

  useLayoutEffect(() => {
    const chip = chipRef.current;
    const table = chip?.closest<HTMLElement>(".play-table");
    if (!chip || !table) return;
    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        placementMemoryRef.current = placeChip(
          chip,
          table,
          harvestPoolReadOnly,
          status.anchorPlayerId,
          status.kind === "target-card-choice",
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
  }, [harvestPoolReadOnly, status.anchorPlayerId, status.kind, status.stage, status.text, viewerId, seatLayoutKey]);

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
