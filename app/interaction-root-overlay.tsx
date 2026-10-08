"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { PresentationSnapshotRootAction } from "../game/presentation-snapshot";

type Point = { x: number; y: number };
type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type RootActionLayout = {
  width: number;
  height: number;
  card: Rect;
  sourcePath: string;
  targetPath: string;
};

function relativeRect(element: HTMLElement, root: DOMRect): Rect {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left - root.left,
    top: rect.top - root.top,
    right: rect.right - root.left,
    bottom: rect.bottom - root.top,
    width: rect.width,
    height: rect.height,
  };
}

function center(rect: Rect): Point { return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; }

function rectangleEdge(rect: Rect, toward: Point): Point {
  const origin = center(rect);
  const dx = toward.x - origin.x;
  const dy = toward.y - origin.y;
  if (dx === 0 && dy === 0) return origin;
  const xScale = dx === 0 ? Number.POSITIVE_INFINITY : rect.width / 2 / Math.abs(dx);
  const yScale = dy === 0 ? Number.POSITIVE_INFINITY : rect.height / 2 / Math.abs(dy);
  const scale = Math.min(xScale, yScale);
  return { x: origin.x + dx * scale, y: origin.y + dy * scale };
}

function pathBetween(start: Point, end: Point, curve: number): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const control = {
    x: (start.x + end.x) / 2 - dy / length * curve,
    y: (start.y + end.y) / 2 + dx / length * curve,
  };
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

function overlaps(left: Rect, right: Rect, padding = 0): boolean {
  return left.left < right.right + padding && left.right > right.left - padding
    && left.top < right.bottom + padding && left.bottom > right.top - padding;
}

function layoutRootAction(shell: HTMLElement, cardElement: HTMLElement, action: Pick<PresentationSnapshotRootAction, "sourceId" | "targetId">): RootActionLayout | null {
  const table = shell.querySelector<HTMLElement>(".play-table");
  const shellBounds = shell.getBoundingClientRect();
  const cardBounds = cardElement.getBoundingClientRect();
  if (!table || shellBounds.width <= 0 || shellBounds.height <= 0 || cardBounds.width <= 0 || cardBounds.height <= 0) return null;

  const anchorFor = (playerId: string) => {
    const matches = Array.from(shell.querySelectorAll<HTMLElement>("[data-player-anchor]"))
      .filter((anchor) => anchor.dataset.playerAnchor === playerId);
    return matches.length === 1 ? matches[0] : null;
  };
  const sourceElement = anchorFor(action.sourceId);
  const targetElement = anchorFor(action.targetId);
  if (!sourceElement || !targetElement || sourceElement === targetElement) return null;
  const sourceBounds = sourceElement.getBoundingClientRect();
  const targetBounds = targetElement.getBoundingClientRect();
  if (!sourceElement.isConnected || !targetElement.isConnected
    || sourceElement.getClientRects().length !== 1 || targetElement.getClientRects().length !== 1
    || sourceBounds.width <= 0 || sourceBounds.height <= 0
    || targetBounds.width <= 0 || targetBounds.height <= 0) return null;

  const tableRect = relativeRect(table, shellBounds);
  const sourceRect = relativeRect(sourceElement, shellBounds);
  const targetRect = relativeRect(targetElement, shellBounds);
  const cardWidth = cardBounds.width;
  const cardHeight = cardBounds.height;
  const margin = 12;
  if (tableRect.width < cardWidth + margin * 2 || tableRect.height < cardHeight + margin * 2) return null;

  const sourceCenter = center(sourceRect);
  const targetCenter = center(targetRect);
  const lineX = targetCenter.x - sourceCenter.x;
  const lineY = targetCenter.y - sourceCenter.y;
  const lineLength = Math.hypot(lineX, lineY) || 1;
  const normal = { x: -lineY / lineLength, y: lineX / lineLength };
  const sourceBiasedFraction = .36;
  const preferred = {
    x: sourceCenter.x + lineX * sourceBiasedFraction,
    y: sourceCenter.y + lineY * sourceBiasedFraction,
  };
  const lateralDistance = Math.min(92, Math.max(42, Math.min(tableRect.width, tableRect.height) * .14));
  const candidateCenters = [
    ...[.28, .36, .44, .52].flatMap((fraction) => [0, -lateralDistance, lateralDistance, -lateralDistance * 1.65, lateralDistance * 1.65].map((offset) => ({
      x: sourceCenter.x + lineX * fraction + normal.x * offset,
      y: sourceCenter.y + lineY * fraction + normal.y * offset,
      fraction,
      offset,
    }))),
  ];
  const obstacles = [
    ...Array.from(shell.querySelectorAll<HTMLElement>("[data-player-anchor]")),
    ...Array.from(shell.querySelectorAll<HTMLElement>(".play-center, .stage-system-cluster, .game-messages, .game-exit")),
  ].filter((element) => element.getClientRects().length > 0)
    .map((element) => relativeRect(element, shellBounds));

  const candidates = candidateCenters.flatMap((candidate) => {
    const left = Math.max(tableRect.left + margin, Math.min(candidate.x - cardWidth / 2, tableRect.right - margin - cardWidth));
    const top = Math.max(tableRect.top + margin, Math.min(candidate.y - cardHeight / 2, tableRect.bottom - margin - cardHeight));
    const card: Rect = { left, top, right: left + cardWidth, bottom: top + cardHeight, width: cardWidth, height: cardHeight };
    if (obstacles.some((obstacle) => overlaps(card, obstacle, 8))) return [];
    const distance = Math.hypot(left + cardWidth / 2 - preferred.x, top + cardHeight / 2 - preferred.y);
    return [{ card, score: distance + Math.abs(candidate.fraction - sourceBiasedFraction) * 80 + Math.abs(candidate.offset) * .12 }];
  }).sort((left, right) => left.score - right.score);
  const card = candidates[0]?.card;
  if (!card) return null;

  const cardCenter = center(card);
  const sourceStart = rectangleEdge(sourceRect, cardCenter);
  const sourceEnd = rectangleEdge(card, sourceCenter);
  const targetStart = rectangleEdge(card, targetCenter);
  const targetEnd = rectangleEdge(targetRect, cardCenter);
  return {
    width: shellBounds.width,
    height: shellBounds.height,
    card,
    sourcePath: pathBetween(sourceStart, sourceEnd, Math.min(24, lineLength * .035)),
    targetPath: pathBetween(targetStart, targetEnd, Math.min(34, lineLength * .05)),
  };
}

export function interactionRootActionKey(action: PresentationSnapshotRootAction): string {
  return [action.interactionId, action.rootFrameId, action.checkpointId, action.presentationRevision, action.rootEventId, action.sourceId, action.targetId].join(":");
}

export function InteractionRootOverlay({
  action,
  enabled,
  sourceName,
  targetName,
  onReadyChange,
}: {
  action: PresentationSnapshotRootAction | null;
  enabled: boolean;
  sourceName: string | null;
  targetName: string | null;
  onReadyChange: (key: string | null) => void;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<RootActionLayout | null>(null);
  const key = action ? interactionRootActionKey(action) : null;
  const sourceId = action?.sourceId ?? null;
  const targetId = action?.targetId ?? null;
  const markerId = key ? `root-target-arrow-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}` : "root-target-arrow";

  useLayoutEffect(() => {
    const layer = layerRef.current;
    const card = cardRef.current;
    const shell = layer?.closest<HTMLElement>(".game-shell");
    if (!enabled || !sourceId || !targetId || !key || !layer || !card || !shell) {
      setLayout(null);
      onReadyChange(null);
      return;
    }

    const measure = () => {
      const nextLayout = layoutRootAction(shell, card, { sourceId, targetId });
      setLayout((current) => {
        if (!nextLayout || !current) return nextLayout;
        const unchanged = Math.abs(current.width - nextLayout.width) < .5
          && Math.abs(current.height - nextLayout.height) < .5
          && Math.abs(current.card.left - nextLayout.card.left) < .5
          && Math.abs(current.card.top - nextLayout.card.top) < .5
          && current.sourcePath === nextLayout.sourcePath && current.targetPath === nextLayout.targetPath;
        return unchanged ? current : nextLayout;
      });
      onReadyChange(nextLayout ? key : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    const table = shell.querySelector<HTMLElement>(".play-table");
    if (table) observer.observe(table);
    shell.querySelectorAll<HTMLElement>("[data-player-anchor], .play-center, .stage-system-cluster").forEach((element) => observer.observe(element));
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      onReadyChange(null);
    };
  }, [enabled, key, onReadyChange, sourceId, targetId]);

  if (!action) return null;
  const visible = enabled && Boolean(layout) && Boolean(sourceName && targetName);
  return <div
    ref={layerRef}
    className="interaction-root-overlay"
    data-root-action-overlay="true"
    data-root-action-ready={visible ? "true" : "false"}
    data-root-action-event-id={action.rootEventId}
    data-root-action-source-id={action.sourceId}
    data-root-action-target-id={action.targetId}
    aria-hidden={!visible}
    style={{ visibility: visible ? "visible" : "hidden" }}
  >
    {layout && <svg className="interaction-root-connectors" width="100%" height="100%" viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0 0 L8 4 L0 8 Z" />
        </marker>
      </defs>
      <path className="interaction-root-source-tether" data-root-action-edge="source" d={layout.sourcePath} />
      <path className="interaction-root-target-arrow" data-root-action-edge="target" d={layout.targetPath} markerEnd={`url(#${markerId})`} />
    </svg>}
    <div
      ref={cardRef}
      className="interaction-root-action-card"
      data-root-action-card="true"
      data-root-action-card-kind={action.cardKind}
      role="img"
      aria-label={`${sourceName ?? "Unknown player"} played Attack targeting ${targetName ?? "unknown player"}`}
      style={layout ? { left: layout.card.left, top: layout.card.top, transform: "none" } : undefined}
    >
      <small>ROOT ACTION</small>
      <strong>ATTACK</strong>
    </div>
  </div>;
}
