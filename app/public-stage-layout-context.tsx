"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  calculatePublicStageLayout,
  type PublicStageLayout,
  type PublicStageRect,
} from "../game/public-stage-layout";

export type SharedPublicStageLayout = {
  layout: PublicStageLayout;
  primaryEventId: string;
  primaryCardId: string;
  primaryOffset: { left: number; top: number };
  announcementEventId: string;
  announcementAnchorEventId: string | null;
  tableRect: PublicStageRect;
};

const PublicStageLayoutContext = createContext<SharedPublicStageLayout | null>(null);

export function usePublicStageLayout() {
  return useContext(PublicStageLayoutContext);
}

function rectOf(element: Element): PublicStageRect {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

function visibleForMeasure(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && rect.width > 0 && rect.height > 0;
}

function visibleObstacle(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0
    && visibleForMeasure(element);
}

function roundedRect(rect: PublicStageRect) {
  return [rect.left, rect.top, rect.right, rect.bottom].map((value) => Math.round(value * 2) / 2);
}

function sameSnapshot(left: SharedPublicStageLayout | null, right: SharedPublicStageLayout | null) {
  return left === right || Boolean(left && right && JSON.stringify(left) === JSON.stringify(right));
}

function setData(element: HTMLElement, key: string, value: string | undefined) {
  if (value === undefined) {
    if (element.hasAttribute(key)) element.removeAttribute(key);
  } else if (element.getAttribute(key) !== value) {
    element.setAttribute(key, value);
  }
}

function clearCountdownLayoutMetadata(table: HTMLElement) {
  table.querySelectorAll<HTMLElement>(".visible-countdown").forEach((countdown) => {
    setData(countdown, "data-public-stage-layout-identity", undefined);
    setData(countdown, "data-public-stage-layout-protected-rect", undefined);
  });
}

const PROTECTED_SELECTORS = [
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
  ".card-pool-target-stage",
  ".battlefield-choice-stage",
  ".local-player-dock",
  ".local-hand-rail",
  ".local-hand",
  ".console-guidance",
].join(",");

export function PublicStageLayoutProvider({
  roomId,
  scopeId,
  viewerId,
  interactionId,
  children,
}: {
  roomId: string;
  scopeId: string | null;
  viewerId: string;
  interactionId: string | null;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<SharedPublicStageLayout | null>(null);
  const snapshotRef = useRef<SharedPublicStageLayout | null>(null);
  const generationRef = useRef({ sceneKey: "", geometrySignature: "", generation: 0 });
  const movePathRef = useRef<{ sceneKey: string; rect: PublicStageRect } | null>(null);

  useLayoutEffect(() => {
    const table = scopeId
      ? [...document.querySelectorAll<HTMLElement>(".play-table")]
        .find((candidate) => candidate.dataset.publicStageLayoutScope === scopeId) ?? null
      : null;
    if (!table) return;
    let frame = 0;
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);

    const clear = () => {
      generationRef.current = { ...generationRef.current, sceneKey: "", geometrySignature: "" };
      movePathRef.current = null;
      clearCountdownLayoutMetadata(table);
      snapshotRef.current = null;
      setData(table, "data-public-stage-layout-status", undefined);
      setData(table, "data-public-stage-layout-phase", undefined);
      setData(table, "data-public-stage-layout-failure", undefined);
      setData(table, "data-public-stage-layout-identity", undefined);
      setSnapshot((current) => current === null ? current : null);
    };

    const measure = () => {
      frame = 0;
      if (!scopeId || !roomId || !viewerId) {
        clear();
        return;
      }
      const display = [...table.querySelectorAll<HTMLElement>(
        '.public-card-display[data-public-card-display="true"]',
      )].find((candidate) => candidate.dataset.publicCardRootEventId === scopeId
        && (!interactionId || candidate.dataset.publicCardInteractionId === interactionId)
        && candidate.dataset.publicCardViewerId === viewerId
        && candidate.dataset.publicCardLayoutViewerId === viewerId
        && candidate.dataset.publicCardLayoutPending !== "true");
      if (!display) {
        clear();
        return;
      }

      const primaryCards = [...display.querySelectorAll<HTMLElement>(
        '.public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="reveal"], .public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="move"], .public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="parked"]',
      )].filter((card) => (card.dataset.publicCardJourneyPhase !== "reveal"
          || ["reveal", "duel-reveal"].includes(card.dataset.publicCardJourneySize ?? ""))
        && visibleForMeasure(card));
      if (primaryCards.length !== 1) {
        clear();
        return;
      }
      const primary = primaryCards[0];
      const phaseName = primary.dataset.publicCardJourneyPhase?.toUpperCase();
      if (phaseName !== "REVEAL" && phaseName !== "MOVE" && phaseName !== "PARKED") {
        clear();
        return;
      }
      const phase = phaseName;
      const eventId = primary.dataset.publicCardJourneyEventId ?? "";
      const cardId = primary.dataset.publicCardJourneyCardId ?? "";
      const cardSceneKey = JSON.stringify([roomId, scopeId, interactionId, eventId, cardId, viewerId]);
      const primaryRect = primary.getBoundingClientRect();
      if (!eventId || !cardId || primaryRect.width <= 0 || primaryRect.height <= 0) {
        clear();
        return;
      }

      const frameRects = phase === "REVEAL"
        ? [...primary.querySelectorAll<HTMLElement>(".public-card-effect-frame-panel")]
          .filter(visibleForMeasure).map((element) => element.getBoundingClientRect())
        : [];
      const visualPrimary = frameRects.reduce((rect, frameRect) => ({
        left: Math.min(rect.left, frameRect.left),
        top: Math.min(rect.top, frameRect.top),
        right: Math.max(rect.right, frameRect.right),
        bottom: Math.max(rect.bottom, frameRect.bottom),
      }), { left: primaryRect.left, top: primaryRect.top, right: primaryRect.right, bottom: primaryRect.bottom });
      const primaryOffset = { left: visualPrimary.left - primaryRect.left, top: visualPrimary.top - primaryRect.top };

      const announcements = [...display.querySelectorAll<HTMLElement>("[data-public-card-announcement='true']")]
        .filter((announcement) => announcement.dataset.publicCardAnnouncementEventId === eventId
          || announcement.dataset.publicCardAnnouncementAnchorEventId === eventId);
      const chip = table.querySelector<HTMLElement>("[data-public-activity-chip='true']");
      if (announcements.length !== 1 || !chip) {
        clear();
        return;
      }
      const announcement = announcements[0];
      // Measure both widths before publishing a single shared generation. The
      // H4 may already be compact from the previous frame, so measure its
      // stylesheet width independently instead of feeding that back as normal.
      const savedWidth = announcement.style.width;
      announcement.style.removeProperty("width");
      const announcementRect = announcement.getBoundingClientRect();
      announcement.style.width = savedWidth;
      const activityRect = chip.getBoundingClientRect();
      const measuredSize = (rect: { width: number; height: number }) => ({ width: rect.width, height: rect.height });
      if (announcementRect.width <= 0 || announcementRect.height <= 0
        || activityRect.width <= 0 || activityRect.height <= 0) {
        clear();
        return;
      }

      const visualViewport = window.visualViewport;
      const viewport = {
        left: visualViewport?.offsetLeft ?? 0,
        top: visualViewport?.offsetTop ?? 0,
        right: (visualViewport?.offsetLeft ?? 0) + (visualViewport?.width ?? window.innerWidth),
        bottom: (visualViewport?.offsetTop ?? 0) + (visualViewport?.height ?? window.innerHeight),
      };
      const tableBounds = rectOf(table);
      const obstacles = [...document.querySelectorAll<HTMLElement>(PROTECTED_SELECTORS)]
        .filter((element) => element !== primary && element !== announcement && element !== chip
          && !primary.contains(element) && !announcement.contains(element) && !chip.contains(element)
          && visibleObstacle(element))
        .map((element, index) => ({
          id: element.dataset.playerAnchor || element.id || String(element.className).slice(0, 48) + ":" + index,
          rect: rectOf(element),
        }));
      const cardSize = { width: visualPrimary.right - visualPrimary.left, height: visualPrimary.bottom - visualPrimary.top };
      const measuredCardRect = { left: visualPrimary.left, top: visualPrimary.top, right: visualPrimary.right, bottom: visualPrimary.bottom };
      const phaseRects = phase === "REVEAL" ? undefined : {
        card: rectOf(primary),
        activity: rectOf(chip),
        ...(phase === "MOVE" ? { announcement: rectOf(announcement) } : {}),
      };
      let moveTarget: PublicStageRect | null = null;
      let movePath: PublicStageRect | null = null;
      if (phase === "MOVE") {
        const targetValues = ["Left", "Top", "Width", "Height"].map((suffix) => Number(primary.dataset[`publicCardJourneyTarget${suffix}`]));
        if (targetValues.some((value) => !Number.isFinite(value)) || targetValues[2] <= 0 || targetValues[3] <= 0) {
          setData(table, "data-public-stage-layout-status", "unavailable");
          setData(table, "data-public-stage-layout-phase", phase.toLowerCase());
          setData(table, "data-public-stage-layout-identity", undefined);
          setData(table, "data-public-stage-layout-failure", JSON.stringify({ reason: "MOVE_TARGET_UNPROVEN", card: roundedRect(measuredCardRect) }));
          snapshotRef.current = null;
          setSnapshot((current) => current === null ? current : null);
          return;
        }
        const [left, top, width, height] = targetValues;
        const target = {
          left,
          top,
          right: left + width,
          bottom: top + height,
        };
        moveTarget = target;
        if (movePathRef.current?.sceneKey !== cardSceneKey) {
          const previous = snapshotRef.current;
          const previousReveal = previous?.layout.scene.phase === "REVEAL"
            && previous.layout.scene.roomId === roomId
            && previous.layout.scene.scopeId === scopeId
            && previous.layout.scene.interactionId === interactionId
            && previous.layout.scene.eventId === eventId
            && previous.layout.scene.cardId === cardId
            && previous.layout.scene.viewerId === viewerId
            ? previous.layout.card
            : phaseRects!.card;
          movePathRef.current = {
            sceneKey: cardSceneKey,
            rect: {
              left: Math.min(previousReveal.left, target.left),
              top: Math.min(previousReveal.top, target.top),
              right: Math.max(previousReveal.right, target.right),
              bottom: Math.max(previousReveal.bottom, target.bottom),
            },
          };
        }
        movePath = movePathRef.current.rect;
        obstacles.push({ id: "primary-card-move-path", rect: movePath });
        const previous = snapshotRef.current;
        if (previous?.layout.scene.roomId === roomId
          && previous.layout.scene.scopeId === scopeId
          && previous.layout.scene.interactionId === interactionId
          && previous.layout.scene.eventId === eventId
          && previous.layout.scene.cardId === cardId
          && previous.layout.scene.viewerId === viewerId
          && ["REVEAL", "MOVE"].includes(previous.layout.scene.phase)) {
          phaseRects!.announcement = previous.layout.announcement;
        }
      } else {
        movePathRef.current = null;
      }
      const sceneKey = JSON.stringify([roomId, scopeId, interactionId, eventId, cardId, viewerId, phase]);
      const signatureCardRect = phase === "MOVE" && movePath ? movePath : measuredCardRect;
      const signatureCardSize = phase === "MOVE" && moveTarget
        ? { width: moveTarget.right - moveTarget.left, height: moveTarget.bottom - moveTarget.top }
        : cardSize;
      const geometrySignature = JSON.stringify({
        phase,
        viewport: roundedRect(viewport),
        table: roundedRect(tableBounds),
        primary: signatureCardSize,
        // REVEAL may move once from its preferred anchor to the shared safe
        // stack. That owned placement must not mint a second generation.
        primaryRect: phase === "REVEAL" ? null : roundedRect(signatureCardRect),
        primaryOffset: phase === "MOVE" ? { left: 0, top: 0 } : primaryOffset,
        announcement: measuredSize(announcementRect),
        activity: measuredSize(activityRect),
        obstacles: obstacles.map(({ id, rect }) => [id, roundedRect(rect)])
          .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
      });
      const generationState = generationRef.current;
      const generation = generationState.generation + Number(
        generationState.sceneKey !== sceneKey || generationState.geometrySignature !== geometrySignature,
      );
      const nextGeneration = Math.max(1, generation);
      generationRef.current = { sceneKey, geometrySignature, generation: nextGeneration };

      const scene = { semantics: "PROVEN" as const, roomId, scopeId, interactionId, eventId, cardId, viewerId, phase, generation: nextGeneration };
      const safeLeft = Math.max(viewport.left, tableBounds.left) + 8;
      const safeRight = Math.min(viewport.right, tableBounds.right) - 8;
      const safeTop = Math.max(viewport.top, tableBounds.top) + 8;
      const safeBottom = Math.min(viewport.bottom, tableBounds.bottom) - 8;
      const compactWidth = safeRight - safeLeft - cardSize.width - 8;
      let compactAnnouncement: { width: number; height: number } | undefined;
      if (phase === "REVEAL" && compactWidth >= 120) {
        announcement.style.width = `${compactWidth}px`;
        const compactRect = announcement.getBoundingClientRect();
        compactAnnouncement = measuredSize(compactRect);
        announcement.style.width = savedWidth;
      }
      const result = calculatePublicStageLayout({
        scene,
        viewport,
        table: tableBounds,
        preferredCard: {
          left: Math.max(safeLeft, Math.min(safeRight - cardSize.width, visualPrimary.left)),
          top: Math.max(safeTop, Math.min(safeBottom - cardSize.height, visualPrimary.top)),
        },
        card: cardSize,
        announcement: measuredSize(announcementRect),
        compactAnnouncement,
        activity: measuredSize(activityRect),
        obstacles,
        phaseRects,
      });
      if (result.status !== "placed") {
        generationRef.current = { ...generationRef.current, sceneKey: "", geometrySignature: "" };
        clearCountdownLayoutMetadata(table);
        setData(table, "data-public-stage-layout-status", "unavailable");
        setData(table, "data-public-stage-layout-phase", phase.toLowerCase());
        setData(table, "data-public-stage-layout-identity", undefined);
        setData(table, "data-public-stage-layout-failure", JSON.stringify({
          reason: result.reason,
          viewport: roundedRect(viewport),
          table: roundedRect(tableBounds),
          primary: roundedRect(visualPrimary),
          announcement: roundedRect(rectOf(announcement)),
          compactAnnouncement,
          activity: roundedRect(rectOf(chip)),
          obstacles: obstacles.map(({ id, rect }) => ({ id, rect: roundedRect(rect) })),
        }));
        snapshotRef.current = null;
        setSnapshot((current) => current === null ? current : null);
        return;
      }

      const next: SharedPublicStageLayout = {
        layout: result.layout,
        primaryEventId: eventId,
        primaryCardId: cardId,
        primaryOffset,
        announcementEventId: announcement.dataset.publicCardAnnouncementEventId ?? "",
        announcementAnchorEventId: announcement.dataset.publicCardAnnouncementAnchorEventId || null,
        tableRect: tableBounds,
      };
      const protectedRectByValue = new Set(result.layout.protectedRects.map(({ rect }) => JSON.stringify(roundedRect(rect))));
      table.querySelectorAll<HTMLElement>(".visible-countdown").forEach((countdown) => {
        const measured = JSON.stringify(roundedRect(rectOf(countdown)));
        if (!visibleObstacle(countdown) || !protectedRectByValue.has(measured)) {
          setData(countdown, "data-public-stage-layout-identity", undefined);
          setData(countdown, "data-public-stage-layout-protected-rect", undefined);
          return;
        }
        setData(countdown, "data-public-stage-layout-identity", result.layout.identity);
        setData(countdown, "data-public-stage-layout-protected-rect", measured);
      });
      setData(table, "data-public-stage-layout-status", `shared-${phase.toLowerCase()}`);
      setData(table, "data-public-stage-layout-phase", phase.toLowerCase());
      setData(table, "data-public-stage-layout-variant", result.layout.variant);
      setData(table, "data-public-stage-layout-identity", result.layout.identity);
      setData(table, "data-public-stage-layout-failure", undefined);
      snapshotRef.current = next;
      setSnapshot((current) => sameSnapshot(current, next) ? current : next);
      resizeObserver?.disconnect();
      for (const element of [table, display, ...(phase === "MOVE" ? [] : [primary]), announcement, chip,
        ...document.querySelectorAll<HTMLElement>(PROTECTED_SELECTORS)]) resizeObserver?.observe(element);
    };
    function schedule() {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    }

    const ownedGeometryElement = (target: Node) => {
      const element = target instanceof HTMLElement ? target : target.parentElement;
      return Boolean(element && (element.matches(
        '.public-card-journey-card[data-public-card-primary-card="true"], [data-public-card-announcement="true"], [data-public-activity-chip="true"]',
      )));
    };
    const mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver((records) => {
      if (records.some((record) => {
        if (record.type === "attributes" && record.target === table
          && ["data-public-stage-layout-status", "data-public-stage-layout-phase", "data-public-stage-layout-identity", "data-public-stage-layout-failure"].includes(record.attributeName ?? "")) return false;
        if (record.type === "attributes" && record.attributeName?.startsWith("data-public-stage-layout-")
          && record.target !== table) return false;
        if (record.type === "attributes" && record.attributeName === "style" && ownedGeometryElement(record.target)) return false;
        return true;
      })) schedule();
    });
    mutationObserver?.observe(table, { attributes: true, childList: true, characterData: true, subtree: true });
    const onResize = () => schedule();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);
    measure();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      clearCountdownLayoutMetadata(table);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
      setData(table, "data-public-stage-layout-status", undefined);
      setData(table, "data-public-stage-layout-phase", undefined);
      setData(table, "data-public-stage-layout-failure", undefined);
      setData(table, "data-public-stage-layout-identity", undefined);
    };
  }, [interactionId, roomId, scopeId, viewerId]);

  const currentSnapshot = snapshot?.layout.scene.roomId === roomId
    && snapshot.layout.scene.scopeId === scopeId
    && snapshot.layout.scene.viewerId === viewerId
    && snapshot.layout.scene.interactionId === interactionId
    ? snapshot : null;
  return <PublicStageLayoutContext.Provider value={currentSnapshot}>{children}</PublicStageLayoutContext.Provider>;
}

export function sharedPublicStageMatchesElement(table: HTMLElement, shared: SharedPublicStageLayout): boolean {
  if (table.dataset.publicStageLayoutIdentity !== shared.layout.identity
    || table.dataset.publicStageLayoutPhase !== shared.layout.scene.phase.toLowerCase()) return false;
  return [...table.querySelectorAll<HTMLElement>(
    '.public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="reveal"], .public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="move"], .public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="parked"]',
  )].some((card) => card.dataset.publicCardJourneyEventId === shared.primaryEventId
    && card.dataset.publicCardJourneyCardId === shared.primaryCardId
    && card.dataset.publicCardJourneyPhase?.toUpperCase() === shared.layout.scene.phase
    && (shared.layout.scene.phase !== "REVEAL" || ["reveal", "duel-reveal"].includes(card.dataset.publicCardJourneySize ?? ""))
    && card.closest<HTMLElement>(".public-card-display")?.dataset.publicCardRootEventId === shared.layout.scene.scopeId
    && (!shared.layout.scene.interactionId
      || card.closest<HTMLElement>(".public-card-display")?.dataset.publicCardInteractionId === shared.layout.scene.interactionId)
    && card.closest<HTMLElement>(".public-card-display")?.dataset.publicCardViewerId === shared.layout.scene.viewerId
    && card.closest<HTMLElement>(".public-card-display")?.dataset.publicCardLayoutViewerId === shared.layout.scene.viewerId
    && card.closest<HTMLElement>(".public-card-display")?.dataset.publicCardLayoutPending !== "true");
}

export function publicStageLayoutCandidateMatchesElement(table: HTMLElement, criteria: {
  scopeId: string;
  viewerId: string;
  interactionId?: string | null;
  eventIds?: readonly string[];
}): boolean {
  if (!criteria.scopeId || table.dataset.publicStageLayoutScope !== criteria.scopeId) return false;
  const eventIds = criteria.eventIds ? new Set(criteria.eventIds.filter(Boolean)) : null;
  return [...table.querySelectorAll<HTMLElement>(
    '.public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="reveal"], .public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="move"], .public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="parked"]',
  )].some((card) => {
    const display = card.closest<HTMLElement>(".public-card-display");
    return Boolean(display
      && (!eventIds || eventIds.has(card.dataset.publicCardJourneyEventId ?? ""))
      && display.dataset.publicCardRootEventId === criteria.scopeId
      && display.dataset.publicCardViewerId === criteria.viewerId
      && display.dataset.publicCardLayoutViewerId === criteria.viewerId
      && (criteria.interactionId === undefined || criteria.interactionId === null
        || display.dataset.publicCardInteractionId === criteria.interactionId));
  });
}
