"use client";

import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties, type ReactNode } from "react";

export type BattlefieldChoiceRect = Pick<DOMRect, "left" | "top" | "right" | "bottom" | "width" | "height">;

export type BattlefieldChoiceInsets = { left: number; right: number };

type BattlefieldChoiceStageProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "className" | "style" | "title"> & {
  className: string;
  mode: "public-readonly" | "actor-select";
  accessibilityLabel?: string;
  title?: string;
  instruction?: string;
  style?: CSSProperties;
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

/** Nonmodal, presentational outer stage for measured battlefield choices. */
export const BattlefieldChoiceStage = forwardRef<HTMLDivElement, BattlefieldChoiceStageProps>(function BattlefieldChoiceStage({
  className,
  mode,
  accessibilityLabel,
  title,
  instruction,
  style,
  header,
  children,
  footer,
  ...attributes
}, ref) {
  const label = accessibilityLabel ?? ([title, instruction].filter(Boolean).join(". ") || attributes["aria-label"]);
  return <div
    {...attributes}
    ref={ref}
    className={`battlefield-choice-stage ${className}`}
    data-choice-mode={mode}
    role="region"
    aria-label={label || undefined}
    style={style}
  >
    {header}
    {children}
    {footer}
  </div>;
});

type SideLanePlacementInput = {
  table: BattlefieldChoiceRect;
  leftSeats: readonly BattlefieldChoiceRect[];
  rightSeats: readonly BattlefieldChoiceRect[];
  timer: BattlefieldChoiceRect | null;
  requiredWidth: number;
  margin?: number;
};

/** Selects the existing five-seat phone lane without measuring DOM in React. */
export function chooseBattlefieldChoiceInsets({
  table,
  leftSeats,
  rightSeats,
  timer,
  requiredWidth,
  margin = 6,
}: SideLanePlacementInput): BattlefieldChoiceInsets | null {
  const leftBoundary = Math.max(table.left + 8, ...leftSeats.map((rect) => rect.right + margin));
  const rightBoundary = Math.min(table.right - 8, ...rightSeats.map((rect) => rect.left - margin));
  const leftOfTimer = timer ? Math.min(rightBoundary, timer.left - margin - 1) : rightBoundary;
  const rightOfTimer = timer ? Math.max(leftBoundary, timer.right + margin + 1) : leftBoundary;
  const lanes = [
    { left: leftBoundary, right: leftOfTimer },
    { left: rightOfTimer, right: rightBoundary },
  ].filter((lane) => lane.right - lane.left > 0);
  const lane = lanes.sort((first, second) => (second.right - second.left) - (first.right - first.left))
    .find((candidate) => candidate.right - candidate.left >= requiredWidth);
  return lane ? {
    left: Math.round((lane.left - table.left) * 2) / 2,
    right: Math.round((table.right - lane.right) * 2) / 2,
  } : null;
}

type VerticalPlacementInput = {
  table: BattlefieldChoiceRect;
  panel: BattlefieldChoiceRect;
  obstacles: readonly BattlefieldChoiceRect[];
  viewportHeight: number;
  margin?: number;
};

/** Reuses Harvest's current safe-range and least-overlap fallback verbatim. */
export function chooseBattlefieldChoiceTopOffset({
  table,
  panel,
  obstacles,
  viewportHeight,
  margin = 6,
}: VerticalPlacementInput): number {
  const minimumTop = Math.max(table.top + margin, margin);
  const maximumTop = Math.min(table.bottom, viewportHeight) - panel.height - margin;
  const desiredTop = minimumTop + Math.max(0, maximumTop - minimumTop) / 2;
  let safeRanges = maximumTop >= minimumTop ? [{ minimum: minimumTop, maximum: maximumTop }] : [];
  for (const rect of obstacles) {
    const blockedMinimum = rect.top - panel.height - margin;
    const blockedMaximum = rect.bottom + margin;
    safeRanges = safeRanges.flatMap((range) => {
      if (blockedMaximum <= range.minimum || blockedMinimum >= range.maximum) return [range];
      return [
        ...(range.minimum < blockedMinimum ? [{ minimum: range.minimum, maximum: Math.min(range.maximum, blockedMinimum) }] : []),
        ...(range.maximum > blockedMaximum ? [{ minimum: Math.max(range.minimum, blockedMaximum), maximum: range.maximum }] : []),
      ];
    }).filter((range) => range.maximum >= range.minimum);
  }

  const nearestSafeTop = safeRanges
    .map((range) => Math.max(range.minimum, Math.min(range.maximum, desiredTop)))
    .sort((first, second) => Math.abs(first - desiredTop) - Math.abs(second - desiredTop))[0];
  let top = nearestSafeTop;
  if (top === undefined) {
    const viewportMaximumTop = Math.max(margin, viewportHeight - panel.height - margin);
    const candidates = [
      minimumTop,
      maximumTop,
      desiredTop,
      table.top + (table.height - panel.height) / 2,
      ...obstacles.flatMap((rect) => [
        rect.top - panel.height - margin,
        rect.bottom + margin,
      ]),
    ].filter(Number.isFinite)
      .map((candidate) => Math.max(margin, Math.min(viewportMaximumTop, candidate)));
    const overlapArea = (candidateTop: number) => obstacles.reduce((total, rect) => {
      const width = Math.max(0, Math.min(panel.right, rect.right) - Math.max(panel.left, rect.left));
      const height = Math.max(0, Math.min(candidateTop + panel.height, rect.bottom) - Math.max(candidateTop, rect.top));
      const weight = rect.width > 0 && rect.height > 0 ? 1 : 0;
      return total + width * height * weight;
    }, 0) + (Math.max(0, table.top - candidateTop)
      + Math.max(0, candidateTop + panel.height - table.bottom)) * panel.width * 2;
    top = candidates.sort((first, second) => overlapArea(first) - overlapArea(second)
      || Math.abs(first - desiredTop) - Math.abs(second - desiredTop))[0];
  }
  if (top === undefined) top = Math.max(margin, Math.min(viewportHeight - panel.height - margin, desiredTop));
  return Math.round(top - table.top);
}
