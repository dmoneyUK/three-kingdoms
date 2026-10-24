"use client";

import { forwardRef, useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef, type CSSProperties, type ReactNode } from "react";

export type BattlefieldChoiceRect = Pick<DOMRect, "left" | "top" | "right" | "bottom" | "width" | "height">;

export type BattlefieldChoiceInsets = { left: number; right: number };

type BattlefieldChoiceStageProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "className" | "style" | "title"> & {
  className: string;
  mode: "public-readonly" | "actor-select" | "actor-target-select";
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

type BattlefieldChoicePlacementOptions = {
  enabled: boolean;
  playerCount: number;
  placementKey: string;
};

type ScheduledBattlefieldFrame = { kind: "animation"; id: number } | { kind: "timeout"; id: ReturnType<typeof setTimeout> };

/** Measures the shared panel and places it in Harvest's current safe battlefield corridor. */
export function useBattlefieldChoicePlacement({ enabled, playerCount, placementKey }: BattlefieldChoicePlacementOptions) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [top, setTop] = useState<number | null>(null);
  const [insets, setInsets] = useState<BattlefieldChoiceInsets | null>(null);

  useLayoutEffect(() => {
    const scheduleFrame = (callback: FrameRequestCallback): ScheduledBattlefieldFrame => typeof window.requestAnimationFrame === "function"
      ? { kind: "animation", id: window.requestAnimationFrame(callback) }
      : { kind: "timeout", id: globalThis.setTimeout(() => callback(Date.now()), 0) };
    const cancelFrame = (frame: ScheduledBattlefieldFrame | null) => {
      if (!frame) return;
      if (frame.kind === "animation") {
        if (typeof window.cancelAnimationFrame === "function") window.cancelAnimationFrame(frame.id);
      } else globalThis.clearTimeout(frame.id);
    };
    if (!enabled) {
      const resetFrame = scheduleFrame(() => {
        setTop(null);
        setInsets(null);
      });
      return () => cancelFrame(resetFrame);
    }
    const stage = ref.current;
    const table = stage?.closest<HTMLElement>(".play-table");
    if (!stage || !table) return;
    let frame: ScheduledBattlefieldFrame | null = null;
    const observed = new Set<Element>();
    let observer: ResizeObserver | null = null;
    const targetCardSelect = stage.dataset.choiceMode === "actor-target-select";
    const protectedSelectors = [
      ".player-board > .opponent-player-card",
      ".public-card-display-journey-copy",
      ...(targetCardSelect ? [".public-card-journey-card.is-current"] : []),
      ".public-activity-chip",
      "[data-public-activity-chip]",
      ".visible-countdown",
      ".stage-system-cluster",
      ".opponent-inspection-floating-shell",
      ".local-player-dock",
      ".local-hand-section",
      ".turn-controls",
    ];
    const measure = () => {
      cancelFrame(frame);
      frame = scheduleFrame(() => {
        const tableRect = table.getBoundingClientRect();
        const panel = stage.querySelector<HTMLElement>(".card-pool-panel, .harvest-choice-panel");
        if (!panel || tableRect.width <= 0 || tableRect.height <= 0) return;
        const panelRect = panel.getBoundingClientRect();
        if (panelRect.width <= 0 || panelRect.height <= 0) return;

        const margin = 6;
        const actorSelect = stage.dataset.choiceMode === "actor-select" || stage.dataset.choiceMode === "actor-target-select";
        const compactFiveSeatPhoneActor = playerCount === 5
          && window.matchMedia("(max-width: 400px)").matches
          && actorSelect;
        if (compactFiveSeatPhoneActor) {
          const board = table.querySelector<HTMLElement>(".player-board[data-player-count='5']");
          const leftSeats = [...(board?.querySelectorAll<HTMLElement>(":scope > [data-side-column='left']") ?? [])]
            .map((seat) => seat.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
          const rightSeats = [...(board?.querySelectorAll<HTMLElement>(":scope > [data-side-column='right']") ?? [])]
            .map((seat) => seat.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
          const timer = table.querySelector<HTMLElement>(".stage-system-cluster .visible-countdown-event");
          const timerRect = timer?.getBoundingClientRect();
          const timerStyle = timer ? window.getComputedStyle(timer) : null;
          const timerVisible = Boolean(timerRect && timerStyle?.display !== "none" && timerStyle?.visibility !== "hidden"
            && timerRect.width > 0 && timerRect.height > 0);
          const requiredButton = panel.querySelector<HTMLElement>(".card-pool-panel__footer > .primary, .harvest-confirm-row > .primary");
          const footer = panel.querySelector<HTMLElement>(".card-pool-panel__footer, .harvest-confirm-row");
          const panelStyle = window.getComputedStyle(panel);
          const footerStyle = footer ? window.getComputedStyle(footer) : null;
          const cssPixels = (value: string | undefined) => Number.parseFloat(value ?? "0") || 0;
          const requiredWidth = requiredButton && footerStyle
            ? cssPixels(window.getComputedStyle(requiredButton).minWidth)
              + cssPixels(footerStyle.columnGap || footerStyle.gap)
              + cssPixels(footerStyle.paddingLeft) + cssPixels(footerStyle.paddingRight)
              + cssPixels(panelStyle.paddingLeft) + cssPixels(panelStyle.paddingRight)
              + cssPixels(panelStyle.borderLeftWidth) + cssPixels(panelStyle.borderRightWidth)
            : Number.POSITIVE_INFINITY;
          const nextInsets = chooseBattlefieldChoiceInsets({
            table: tableRect,
            leftSeats,
            rightSeats,
            timer: timerVisible ? timerRect! : null,
            requiredWidth,
            margin,
          });
          setInsets((current) => current?.left === nextInsets?.left && current?.right === nextInsets?.right ? current : nextInsets);
        } else {
          setInsets((current) => current ? null : current);
        }

        const obstacles = [...new Set(protectedSelectors.flatMap((selector) => [...document.querySelectorAll<HTMLElement>(selector)]))]
          .filter((element) => element !== stage && !stage.contains(element))
          .map((element) => ({ element, rect: element.getBoundingClientRect() }))
          .filter(({ element, rect }) => {
            const style = window.getComputedStyle(element);
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0
              && panelRect.left < rect.right + margin && panelRect.right > rect.left - margin;
          });
        const offset = chooseBattlefieldChoiceTopOffset({
          table: tableRect,
          panel: panelRect,
          obstacles: obstacles.map(({ rect }) => rect),
          viewportHeight: window.innerHeight,
          margin,
        });
        setTop((current) => current === offset ? current : offset);
      });
    };
    const observeLayout = () => {
      const nodes = [table, stage, stage.querySelector(".card-pool-panel, .harvest-choice-panel"),
        ...protectedSelectors.flatMap((selector) => [...document.querySelectorAll(selector)])];
      for (const node of nodes) {
        if (!node || observed.has(node)) continue;
        observed.add(node);
        observer?.observe(node);
      }
    };
    observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    const mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
      observeLayout();
      measure();
    });
    observeLayout();
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    mutationObserver?.observe(table, { attributes: true, childList: true, subtree: true, characterData: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      observer?.disconnect();
      mutationObserver?.disconnect();
      cancelFrame(frame);
    };
  }, [enabled, playerCount, placementKey]);

  return { ref, top, insets };
}

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
