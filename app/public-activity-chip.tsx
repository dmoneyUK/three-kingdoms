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

function protectedRects(table: HTMLElement): Rect[] {
  const tableRect = table.getBoundingClientRect();
  const elements = [...document.querySelectorAll<HTMLElement>(SAFE_OBSTACLES)];
  const rects: Rect[] = [];
  for (const element of elements) {
    if (table.contains(element) === false && element.closest(".play-table") !== table) continue;
    const rect = visibleRect(element);
    if (rect && rect.right > tableRect.left && rect.left < tableRect.right
      && rect.bottom > tableRect.top && rect.top < tableRect.bottom) {
      rects.push(rect);
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
      rects.push({ ...target, right: target.left + target.width, bottom: target.top + target.height });
    }
  }
  return rects;
}

function placeChip(chip: HTMLElement, table: HTMLElement): void {
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

  if (width <= 0 || height <= 0 || rightBound - leftBound < width || firstTop < lowerBandTop) {
    chip.style.visibility = "hidden";
    chip.dataset.publicActivityLayout = "hidden";
    return;
  }

  const preferredCenter = tableRect.left + tableRect.width / 2;
  const maxHorizontalOffset = Math.max(0, (rightBound - leftBound - width) / 2);
  const horizontalStep = width / 2 + 10;
  const offsets = [0];
  for (let offset = horizontalStep; offset < maxHorizontalOffset; offset += horizontalStep) offsets.push(-offset, offset);
  if (maxHorizontalOffset > 0 && !offsets.some((offset) => Math.abs(Math.abs(offset) - maxHorizontalOffset) < 1)) {
    offsets.push(-maxHorizontalOffset, maxHorizontalOffset);
  }

  const verticalSteps = [0, height + 8, (height + 8) * 2];
  for (const verticalStep of verticalSteps) {
    const top = firstTop - verticalStep;
    if (top < lowerBandTop) continue;
    for (const offset of offsets) {
      const center = Math.max(leftBound + width / 2, Math.min(rightBound - width / 2, preferredCenter + offset));
      const candidate = {
        left: center - width / 2,
        top,
        right: center + width / 2,
        bottom: top + height,
        width,
        height,
      };
      if (obstacles.some((obstacle) => intersects(candidate, obstacle))) continue;
      chip.style.left = `${candidate.left - tableRect.left}px`;
      chip.style.top = `${candidate.top - tableRect.top}px`;
      chip.style.visibility = "visible";
      const horizontal = Math.round(center - preferredCenter);
      chip.dataset.publicActivityLayout = `${verticalStep === 0 ? "bottom" : "lower-band"}-${horizontal === 0 ? "center" : horizontal < 0 ? "left" : "right"}`;
      return;
    }
  }

  chip.style.visibility = "hidden";
  chip.dataset.publicActivityLayout = "hidden";
}

export function PublicActivityChip({ status, viewerId, seatLayoutKey }: {
  status: PublicActivityStatus;
  viewerId: string;
  seatLayoutKey: string;
}) {
  const chipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const chip = chipRef.current;
    const table = chip?.closest<HTMLElement>(".play-table");
    if (!chip || !table) return;
    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => placeChip(chip, table));
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
      attributeFilter: ["data-player-count", "data-seat-topology"],
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
  }, [status.kind, status.text, viewerId, seatLayoutKey]);

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
  >{status.text}</div>;
}
