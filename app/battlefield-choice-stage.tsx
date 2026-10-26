"use client";

import { forwardRef, useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef, type CSSProperties, type ReactNode } from "react";

export type BattlefieldChoiceRect = Pick<DOMRect, "left" | "top" | "right" | "bottom" | "width" | "height">;

export type BattlefieldChoiceInsets = { left: number; right: number; width?: number };

type BattlefieldChoiceStageProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "className" | "style" | "title"> & {
  className: string;
  mode: "public-readonly" | "actor-select" | "actor-target-select" | "target-readonly";
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
  centralTargetLayout?: boolean;
  rootEventId?: string;
};

type ScheduledBattlefieldFrame = { kind: "animation"; id: number } | { kind: "timeout"; id: ReturnType<typeof setTimeout> };

/** Measures the shared panel and places it in Harvest's current safe battlefield corridor. */
export function useBattlefieldChoicePlacement({ enabled, playerCount, placementKey, centralTargetLayout = false, rootEventId }: BattlefieldChoicePlacementOptions) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [top, setTop] = useState<number | null>(null);
  const [insets, setInsets] = useState<BattlefieldChoiceInsets | null>(null);
  const [ready, setReady] = useState(false);
  const [rootCardOverlap, setRootCardOverlap] = useState(false);
  const insetsRef = useRef<BattlefieldChoiceInsets | null>(null);

  useLayoutEffect(() => {
    insetsRef.current = insets;
  }, [insets]);

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
        insetsRef.current = null;
        setReady(false);
        setRootCardOverlap(false);
      });
      return () => cancelFrame(resetFrame);
    }
    const stage = ref.current;
    const table = stage?.closest<HTMLElement>(".play-table");
    if (!stage || !table) return;
    const resetFrame = centralTargetLayout ? scheduleFrame(() => {
      setTop(null);
      setInsets(null);
      insetsRef.current = null;
      setReady(false);
      setRootCardOverlap(false);
    }) : null;
    let frame: ScheduledBattlefieldFrame | null = null;
    const observed = new Set<Element>();
    let observer: ResizeObserver | null = null;
    const targetCardSelect = stage.dataset.choiceMode === "actor-target-select";
    const targetCardReadOnly = stage.dataset.choiceMode === "target-readonly";
    const authorReservationSelector = ".public-card-journey-card[data-public-card-journey-author-reservation='true']";
    const targetWidthProbe = centralTargetLayout ? document.createElement("div") : null;
    if (targetWidthProbe) {
      targetWidthProbe.style.cssText = "position:absolute;left:-10000px;top:0;height:0;visibility:hidden;pointer-events:none;contain:layout;";
      document.body.append(targetWidthProbe);
    }
    const protectedSelectors = [
      ".player-board > .opponent-player-card",
      ".public-card-display-journey-copy",
      ...(targetCardSelect || targetCardReadOnly ? [
        centralTargetLayout ? ".public-card-journey-card" : ".public-card-journey-card.is-current",
        authorReservationSelector,
      ] : []),
      ".public-activity-chip",
      "[data-public-activity-chip]",
      ".visible-countdown",
      ".stage-system-cluster",
      ...(!(targetCardSelect || targetCardReadOnly) ? [".opponent-inspection-floating-shell"] : []),
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
        const measureAuthorReservationRects = () => [...table.querySelectorAll<HTMLElement>(authorReservationSelector)]
          .map((element) => {
            const left = Number(element.dataset.publicCardJourneyAuthorReservationLeft);
            const top = Number(element.dataset.publicCardJourneyAuthorReservationTop);
            const width = Number(element.dataset.publicCardJourneyAuthorReservationWidth);
            const height = Number(element.dataset.publicCardJourneyAuthorReservationHeight);
            return [left, top, width, height].every(Number.isFinite) && width > 0 && height > 0
              ? new DOMRect(left, top, width, height)
              : null;
          })
          .filter((rect): rect is DOMRect => Boolean(rect));
        const mobileCentralTarget = centralTargetLayout && (targetCardSelect || targetCardReadOnly) && window.matchMedia("(max-width: 520px)").matches;
        if (mobileCentralTarget) {
          const board = table.querySelector<HTMLElement>(".player-board");
          const leftSeats = [...(board?.querySelectorAll<HTMLElement>(":scope > [data-side-column='left']") ?? [])]
            .map((seat) => seat.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
          const rightSeats = [...(board?.querySelectorAll<HTMLElement>(":scope > [data-side-column='right']") ?? [])]
            .map((seat) => seat.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
          const actualLeft = Math.max(tableRect.left + 8, ...leftSeats.map((rect) => rect.right + 8));
          const actualRight = Math.min(tableRect.right - 8, ...rightSeats.map((rect) => rect.left - 8));
          const resolveLength = (property: string) => {
            if (!targetWidthProbe) return 0;
            targetWidthProbe.style.width = window.getComputedStyle(table).getPropertyValue(property).trim();
            return targetWidthProbe.getBoundingClientRect().width;
          };
          const virtualBoardInset = resolveLength("--target-pool-side-seat-inset");
          const virtualSeatWidth = resolveLength("--target-pool-side-seat-width");
          const eightSeatEdge = tableRect.width * 0.15 + virtualBoardInset * 0.7 + virtualSeatWidth * 0.5 + 8;
          const eightSeatSafeWidth = Math.max(0, tableRect.width - eightSeatEdge * 2);
          const laneWidth = Math.max(0, actualRight - actualLeft);
          const poolWidth = Math.min(eightSeatSafeWidth, laneWidth);
          if (poolWidth <= 0) {
            setTop(null);
            setInsets(null);
            insetsRef.current = null;
            setReady(false);
            setRootCardOverlap(false);
            return;
          }
          const laneCenter = (actualLeft + actualRight) / 2;
          const left = Math.max(actualLeft, Math.min(actualRight - poolWidth, laneCenter - poolWidth / 2));
          const nextInsets = {
            left: Math.round((left - tableRect.left) * 2) / 2,
            right: Math.round((tableRect.right - left - poolWidth) * 2) / 2,
            width: Math.round(poolWidth * 2) / 2,
          };
          const currentInsets = insetsRef.current;
          if (currentInsets?.left !== nextInsets.left || currentInsets.right !== nextInsets.right || currentInsets.width !== nextInsets.width) {
            insetsRef.current = nextInsets;
            setInsets(nextInsets);
            setTop(null);
            setReady(false);
            setRootCardOverlap(false);
            return;
          }

          const obstacles = [...new Set(protectedSelectors.flatMap((selector) => [...document.querySelectorAll<HTMLElement>(selector)]))]
            .filter((element) => element !== stage && !stage.contains(element))
            .filter((element) => !element.matches(".public-card-display-journey-copy, .public-activity-chip, [data-public-activity-chip]"))
            .map((element) => ({ element, rect: element.getBoundingClientRect() }))
            .filter(({ element, rect }) => {
              const style = window.getComputedStyle(element);
              return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0
                && panelRect.left < rect.right + margin && panelRect.right > rect.left - margin;
            });
          // A moving root may still be at centre. Reserve its measured final
          // author mini as well, so the pool can use the remaining lane without
          // asking the author-placement solver to dodge the pool in return.
          const authorReservationRects = measureAuthorReservationRects();
          const obstacleRects = [...obstacles.map(({ rect }) => rect), ...authorReservationRects];
          const visualViewport = window.visualViewport;
          const viewportBottom = Math.min(window.innerHeight, (visualViewport?.offsetTop ?? 0) + (visualViewport?.height ?? window.innerHeight));
          const safePlacement = {
            table: tableRect,
            panel: panelRect,
            obstacles: obstacleRects,
            viewportHeight: viewportBottom,
            margin,
          };
          const safeTop = findBattlefieldChoiceSafeTopOffset(safePlacement);
          const mergedCopyFallbackTop = safeTop === null
            ? findBattlefieldChoiceSafeTopOffset({
              ...safePlacement,
              obstacles: [
                ...obstacles.filter(({ element }) => !(
                rootEventId
                && element.matches(".public-card-journey-card[data-public-card-journey-role='root']")
                && element.dataset.publicCardJourneyEventId === rootEventId
                )).map(({ rect }) => rect),
                ...authorReservationRects,
              ],
            })
            : null;
          const resolvedTop = safeTop ?? mergedCopyFallbackTop;
          const rootCard = rootEventId
            ? obstacles.find(({ element }) => element.matches(".public-card-journey-card[data-public-card-journey-role='root']")
              && element.dataset.publicCardJourneyEventId === rootEventId)
            : undefined;
          const resolvedPanelTop = resolvedTop === null ? null : tableRect.top + resolvedTop;
          const overlapsRootCard = Boolean(rootCard && resolvedPanelTop !== null
            && panelRect.left < rootCard.rect.right && panelRect.right > rootCard.rect.left
            && resolvedPanelTop < rootCard.rect.bottom && resolvedPanelTop + panelRect.height > rootCard.rect.top);
          setTop((current) => current === resolvedTop ? current : resolvedTop);
          setReady(resolvedTop !== null);
          setRootCardOverlap(overlapsRootCard);
          return;
        }

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
          obstacles: [...obstacles.map(({ rect }) => rect), ...measureAuthorReservationRects()],
          viewportHeight: window.innerHeight,
          margin,
        });
        setTop((current) => current === offset ? current : offset);
        setReady(true);
        setRootCardOverlap(false);
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
    const inspectorOnlyMutation = (record: MutationRecord) => {
      if (!(targetCardSelect || targetCardReadOnly)) return false;
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      if (target?.closest(".interaction-stage-inspect-only, .opponent-inspection-floating-shell")) return true;
      if (record.type === "childList" && target?.classList.contains("interaction-safe-zone")) {
        const changedElements = [...record.addedNodes, ...record.removedNodes].filter((node): node is Element => node instanceof Element);
        if (changedElements.length > 0 && changedElements.every((node) => node.matches(".interaction-stage-inspect-only"))) return true;
      }
      if (record.type === "attributes" && record.attributeName === "aria-pressed" && target?.matches(".opponent-seat-inspect-button")) return true;
      if (record.type === "attributes" && record.attributeName === "class" && target?.matches(".opponent-player-card")) {
        const withoutInspectorState = (value: string) => value.split(/\s+/).filter((token) => token && token !== "is-inspected").sort().join(" ");
        return withoutInspectorState(record.oldValue ?? "") === withoutInspectorState(target.className);
      }
      return false;
    };
    const mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver((records) => {
      if ((targetCardSelect || targetCardReadOnly) && records.every(inspectorOnlyMutation)) return;
      observeLayout();
      measure();
    });
    observeLayout();
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    table.addEventListener("transitionend", measure);
    table.addEventListener("animationend", measure);
    mutationObserver?.observe(table, { attributes: true, attributeOldValue: true, childList: true, subtree: true, characterData: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      table.removeEventListener("transitionend", measure);
      table.removeEventListener("animationend", measure);
      observer?.disconnect();
      mutationObserver?.disconnect();
      cancelFrame(frame);
      cancelFrame(resetFrame);
      targetWidthProbe?.remove();
    };
  }, [centralTargetLayout, enabled, playerCount, placementKey, rootEventId]);

  return { ref, top, insets, ready, rootCardOverlap };
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

/** Returns a safe table-relative top, or null when the measured panel cannot fit. */
export function findBattlefieldChoiceSafeTopOffset({
  table,
  panel,
  obstacles,
  viewportHeight,
  margin = 6,
}: VerticalPlacementInput): number | null {
  const minimumTop = Math.max(table.top + margin, margin);
  const maximumTop = Math.min(table.bottom, viewportHeight) - panel.height - margin;
  if (maximumTop < minimumTop) return null;
  let safeRanges = [{ minimum: minimumTop, maximum: maximumTop }];
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
  const desiredTop = minimumTop + Math.max(0, maximumTop - minimumTop) / 2;
  const nearestSafeTop = safeRanges
    .map((range) => Math.max(range.minimum, Math.min(range.maximum, desiredTop)))
    .sort((first, second) => Math.abs(first - desiredTop) - Math.abs(second - desiredTop))[0];
  return nearestSafeTop === undefined ? null : Math.round(nearestSafeTop - table.top);
}

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
