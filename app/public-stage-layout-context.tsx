"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { fixedPublicActivityBand, fixedPublicH4Band, measurePublicElementAtWidth } from "./public-upper-anchor";
import { isAttackDodgeUxTraceActive, recordAttackDodgeUxTrace } from "./attack-dodge-ux-trace";
import {
  calculatePublicStageLayout,
  publicStageBandClearance,
  publicStageFailedRevealMatchesScene,
  publicStageMeasuredBandClearanceSatisfied,
  publicStageRevealNeedsOwnedRemeasure,
  publicStageSceneMatchesCard,
  type PublicStageLayout,
  type PublicStagePhase,
  type PublicStageRect,
  type PublicStageStationarySurface,
} from "../game/public-stage-layout";

export type SharedPublicStageLayout = {
  layout: PublicStageLayout;
  revealReady: boolean;
  primaryEventId: string;
  primaryCardId: string;
  primaryOffset: { left: number; top: number };
  announcementEventId: string;
  announcementCopyKey: string;
  announcementAnchorEventId: string | null;
  tableRect: PublicStageRect;
};

const PublicStageLayoutContext = createContext<SharedPublicStageLayout | null>(null);
// Publish the measured scene synchronously with its DOM generation marker.
// React context remains the render subscription; scheduled consumers may read
// this same commit before that subscription has rerendered.
const committedLayouts = new WeakMap<HTMLElement, SharedPublicStageLayout>();
export function committedPublicStageLayout(table: HTMLElement): SharedPublicStageLayout | null {
  return committedLayouts.get(table) ?? null;
}

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

/** Measures the real union used by both shared placement and frame rendering.
 * The panel's box alone is insufficient when title/material children overflow
 * because of font metrics, transforms, or responsive wrapping. */
export function publicEffectFrameVisualFootprint(primary: HTMLElement): {
  rect: PublicStageRect;
  primaryOffset: { left: number; top: number };
} | null {
  const panels = [...primary.querySelectorAll<HTMLElement>(".public-card-effect-frame-panel")]
    .filter(visibleForMeasure);
  if (panels.length !== 1) return null;
  const panel = panels[0];
  const eventId = primary.dataset.publicCardJourneyEventId ?? "";
  const journeyCardIds = (primary.dataset.publicCardJourneyCardIds ?? "").split(",").filter(Boolean);
  const materialCardIds = (panel.dataset.publicCardFrameMaterialCardIds ?? "").split(",").filter(Boolean);
  const materialNodes = [...panel.querySelectorAll<HTMLElement>("[data-public-card-effect-frame-card-id]")];
  const titleNodes = [...panel.querySelectorAll<HTMLElement>(".public-card-effect-frame-title")];
  const renderedMaterialIds = materialNodes.map((element) => element.dataset.publicCardEffectFrameCardId ?? "");
  const materialCount = Number(panel.dataset.publicCardFrameMaterialCount);
  if (!eventId || panel.dataset.publicCardFrameCardEventId !== eventId
    || journeyCardIds.length === 0
    || materialCount !== materialCardIds.length || materialCount !== materialNodes.length
    || titleNodes.length !== 1 || !visibleForMeasure(titleNodes[0])
    || materialNodes.some((element) => !visibleForMeasure(element))
    || materialCardIds.some((id, index) => id !== journeyCardIds[index] || id !== renderedMaterialIds[index])) return null;
  const elements = [panel,
    ...panel.querySelectorAll<HTMLElement>([
      ".public-card-effect-frame-title",
      ".public-card-effect-frame-material",
      ".public-card-effect-frame-materials",
      ".public-card-effect-frame-count",
      "[data-public-card-effect-frame-card-id]",
    ].join(",")),
  ].filter(visibleForMeasure);
  if (elements.length === 0) return null;
  const rects = elements.map((element) => element.getBoundingClientRect());
  const rect = {
    left: Math.min(...rects.map((item) => item.left)),
    top: Math.min(...rects.map((item) => item.top)),
    right: Math.max(...rects.map((item) => item.right)),
    bottom: Math.max(...rects.map((item) => item.bottom)),
  };
  if (![rect.left, rect.top, rect.right, rect.bottom].every(Number.isFinite)
    || rect.right <= rect.left || rect.bottom <= rect.top) return null;
  const primaryRect = primary.getBoundingClientRect();
  if (primaryRect.width <= 0 || primaryRect.height <= 0) return null;
  return { rect, primaryOffset: { left: rect.left - primaryRect.left, top: rect.top - primaryRect.top } };
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
  const traceSignatureRef = useRef("");
  const unavailableObservationKeyRef = useRef("");

  useLayoutEffect(() => {
    const table = scopeId
      ? [...document.querySelectorAll<HTMLElement>(".play-table")]
        .find((candidate) => candidate.dataset.publicStageLayoutScope === scopeId) ?? null
      : null;
    if (!table) return;
    let frame = 0;
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);

    const clear = () => {
      if (snapshotRef.current && canRetainPublicStageLayout(table, snapshotRef.current)) return;
      resizeObserver?.disconnect();
      unavailableObservationKeyRef.current = "";
      generationRef.current = { ...generationRef.current, sceneKey: "", geometrySignature: "" };
      movePathRef.current = null;
      clearCountdownLayoutMetadata(table);
      snapshotRef.current = null;
      committedLayouts.delete(table);
      setData(table, "data-public-stage-layout-status", undefined);
      setData(table, "data-public-stage-layout-phase", undefined);
      setData(table, "data-public-stage-layout-failure", undefined);
      setData(table, "data-public-stage-layout-identity", undefined);
      setSnapshot((current) => current === null ? current : null);
    };

    const observeUnavailableGeometry = (key: string, elements: readonly (HTMLElement | null | undefined)[]) => {
      if (!resizeObserver || unavailableObservationKeyRef.current === key) return;
      resizeObserver.disconnect();
      for (const element of new Set(elements.filter((candidate): candidate is HTMLElement => Boolean(candidate?.isConnected)))) {
        resizeObserver.observe(element);
      }
      unavailableObservationKeyRef.current = key;
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
        && candidate.dataset.publicCardLayoutViewerId === viewerId);
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
      const phase = phaseName as PublicStagePhase;
      if (display.dataset.publicCardLayoutPending === "true" && phase !== "REVEAL") {
        clear();
        return;
      }
      const eventId = primary.dataset.publicCardJourneyEventId ?? "";
      const cardId = primary.dataset.publicCardJourneyCardId ?? "";
      const cardSceneKey = JSON.stringify([roomId, scopeId, interactionId, eventId, cardId, viewerId]);
      const primaryRect = primary.getBoundingClientRect();
      if (!eventId || !cardId || primaryRect.width <= 0 || primaryRect.height <= 0) {
        clear();
        return;
      }

      const framePanels = phase === "REVEAL"
        ? [...primary.querySelectorAll<HTMLElement>(".public-card-effect-frame-panel")].filter(visibleForMeasure)
        : [];
      const frameFootprint = framePanels.length === 1 ? publicEffectFrameVisualFootprint(primary) : null;
      if (framePanels.length > 0 && !frameFootprint) {
        observeUnavailableGeometry(JSON.stringify([roomId, scopeId, interactionId, eventId, cardId, viewerId, "frame-footprint"]), [
          table, display, primary, ...framePanels,
          ...display.querySelectorAll<HTMLElement>("[data-public-card-announcement='true']"),
          table.querySelector<HTMLElement>("[data-public-activity-chip='true']"),
          ...document.querySelectorAll<HTMLElement>(PROTECTED_SELECTORS),
        ]);
        setData(table, "data-public-stage-layout-status", "unavailable");
        setData(table, "data-public-stage-layout-phase", phase.toLowerCase());
        setData(table, "data-public-stage-layout-identity", undefined);
        setData(table, "data-public-stage-layout-failure", JSON.stringify({
          reason: framePanels.length === 1 ? "EFFECT_FRAME_FOOTPRINT_UNAVAILABLE" : "MULTIPLE_EFFECT_FRAME_PANELS",
          roomId, rootEventId: scopeId, scopeId, interactionId, eventId, cardId, viewerId, phase,
          generation: generationRef.current.generation,
        }));
        snapshotRef.current = null;
        committedLayouts.delete(table);
        setSnapshot((current) => current === null ? current : null);
        return;
      }
      const visualPrimary = frameFootprint
        ? frameFootprint.rect
        : { left: primaryRect.left, top: primaryRect.top, right: primaryRect.right, bottom: primaryRect.bottom };
      const primaryOffset = frameFootprint?.primaryOffset
        ?? { left: visualPrimary.left - primaryRect.left, top: visualPrimary.top - primaryRect.top };

      const announcements = [...display.querySelectorAll<HTMLElement>("[data-public-card-announcement='true']")]
        .filter((announcement) => announcement.dataset.publicCardAnnouncementEventId === eventId
          || announcement.dataset.publicCardAnnouncementAnchorEventId === eventId
          || (display.dataset.publicCardKind === "BumperHarvest"
            && Boolean(interactionId)
            && announcement.dataset.publicCardStagePrimaryEventId === eventId));
      const chip = table.querySelector<HTMLElement>("[data-public-activity-chip='true']");
      const announcement = announcements.length === 1 ? announcements[0] : null;
      if (announcements.length > 1 || phase !== "REVEAL" && (!announcement || !chip)) {
        clear();
        return;
      }
      if (frameFootprint && !announcement) {
        observeUnavailableGeometry(JSON.stringify([roomId, scopeId, interactionId, eventId, cardId, viewerId, "public-bands"]), [
          table, display, primary, announcement, chip,
          ...document.querySelectorAll<HTMLElement>(PROTECTED_SELECTORS),
        ]);
        setData(table, "data-public-stage-layout-status", "unavailable");
        setData(table, "data-public-stage-layout-phase", phase.toLowerCase());
        setData(table, "data-public-stage-layout-identity", undefined);
        setData(table, "data-public-stage-layout-failure", JSON.stringify({
          reason: "EFFECT_FRAME_PUBLIC_BANDS_UNAVAILABLE",
          roomId, rootEventId: scopeId, scopeId, interactionId, eventId, cardId, viewerId, phase,
          frame: roundedRect(frameFootprint.rect),
          hasMatchingH4: Boolean(announcement),
          pac: chip ? roundedRect(rectOf(chip)) : null,
        }));
        snapshotRef.current = null;
        committedLayouts.delete(table);
        setSnapshot((current) => current === null ? current : null);
        return;
      }
      const consoleGuidance = document.querySelector<HTMLElement>(".local-player-dock .console-guidance");
      if (!consoleGuidance || !visibleObstacle(consoleGuidance)) {
        clear();
        return;
      }
      const consoleBounds = rectOf(consoleGuidance);
      let h4Band = fixedPublicH4Band(table, announcement);
      let pacBand = fixedPublicActivityBand(table, consoleGuidance, chip);
      if (!h4Band || !pacBand) {
        clear();
        return;
      }
      // Measure clones at canonical widths so React-owned H4/PAC nodes are
      // never temporarily restyled. With no copy mounted, reserve geometry only.
      const measuredAnnouncement = announcement
        ? measurePublicElementAtWidth(table, announcement, h4Band.width)
        : null;
      h4Band = fixedPublicH4Band(table, announcement, measuredAnnouncement?.height ?? 0) ?? h4Band;
      const measuredFullActivity = chip
        ? measurePublicElementAtWidth(table, chip, pacBand.width)
        : null;
      pacBand = fixedPublicActivityBand(table, consoleGuidance, chip, measuredFullActivity?.height ?? 0) ?? pacBand;
      const announcementRect = new DOMRect(h4Band.left, h4Band.top, h4Band.width,
        measuredAnnouncement?.height ?? h4Band.height);
      const activityHeight = measuredFullActivity?.height ?? pacBand.height;
      const activityRect = new DOMRect(pacBand.left, pacBand.bottom - activityHeight, pacBand.width, activityHeight);
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
      const stationarySurface: PublicStageStationarySurface = phase === "REVEAL" && frameFootprint
        ? "effect-frame" : "card";
      const upperH4 = {
        top: h4Band.top,
        reservedHeight: h4Band.height,
        gap: stationarySurface === "effect-frame" ? publicStageBandClearance(stationarySurface) : 4,
      };
      const harvestPoolWrapper = [...table.querySelectorAll<HTMLElement>(".battlefield-choice-stage")]
        .find((element) => element.dataset.harvestRootEventId === scopeId) ?? null;
      const harvestPoolPanel = harvestPoolWrapper?.querySelector<HTMLElement>(".harvest-choice-panel") ?? null;
      const harvestRootPoolOverlap = Boolean(harvestPoolWrapper && harvestPoolPanel && visibleObstacle(harvestPoolPanel)
        && display.dataset.publicCardKind === "BumperHarvest"
        && display.dataset.publicCardHarvestActive === "true"
        && display.dataset.publicCardRootEventId === scopeId
        && display.dataset.publicCardRootCardId === cardId
        && display.dataset.publicCardInteractionId === interactionId
        && primary.dataset.publicCardJourneyRole === "root"
        && primary.dataset.publicCardJourneyEventId === scopeId
        && primary.dataset.publicCardJourneyCardId === cardId
        && (phase === "REVEAL" || phase === "MOVE"));
      const obstacles = [...document.querySelectorAll<HTMLElement>(PROTECTED_SELECTORS)]
        .filter((element) => element !== primary && element !== announcement && element !== chip
          && !(harvestRootPoolOverlap && element === harvestPoolWrapper)
          && !primary.contains(element) && (!announcement || !announcement.contains(element)) && (!chip || !chip.contains(element))
          && visibleObstacle(element))
        .map((element, index) => ({
          id: harvestRootPoolOverlap && element === harvestPoolPanel
            ? "harvest-choice-panel"
            : element.dataset.playerAnchor || element.id || String(element.className).slice(0, 48) + ":" + index,
          rect: rectOf(element),
        }));
      if (harvestRootPoolOverlap && harvestPoolPanel && !obstacles.some(({ id }) => id === "harvest-choice-panel")) {
        obstacles.push({ id: "harvest-choice-panel", rect: rectOf(harvestPoolPanel) });
      }
      const cardSize = { width: visualPrimary.right - visualPrimary.left, height: visualPrimary.bottom - visualPrimary.top };
      const measuredCardRect = { left: visualPrimary.left, top: visualPrimary.top, right: visualPrimary.right, bottom: visualPrimary.bottom };
      const phaseRects = phase === "REVEAL" ? undefined : {
        card: rectOf(primary),
        activity: chip ? rectOf(chip) : {
          left: pacBand.left, top: pacBand.top, right: pacBand.right, bottom: pacBand.bottom,
        },
        ...(phase === "MOVE" ? { announcement: rectOf(announcement!) } : {}),
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
        consoleGuidance: roundedRect(consoleBounds),
        upperH4,
        primary: signatureCardSize,
        // REVEAL may move once from its preferred anchor to the shared safe
        // stack. That owned placement must not mint a second generation.
        primaryRect: phase === "REVEAL" ? null : roundedRect(signatureCardRect),
        primaryOffset: phase === "MOVE" ? { left: 0, top: 0 } : primaryOffset,
        // H4 copy can grow downwards without creating a new physical card
        // generation; its reserved maximum is stable for this geometry.
        announcement: upperH4 ? { width: announcementRect.width, height: upperH4.reservedHeight } : measuredSize(announcementRect),
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
      const safeBottom = Math.min(viewport.bottom, consoleBounds.top);
      const compactWidth = safeRight - safeLeft - cardSize.width - 8;
      let compactAnnouncement: { width: number; height: number } | undefined;
      if (phase === "REVEAL" && announcement && compactWidth >= 120) {
        const savedWidth = announcement.style.width;
        announcement.style.width = `${compactWidth}px`;
        try {
          const compactRect = announcement.getBoundingClientRect();
          compactAnnouncement = measuredSize(compactRect);
        } finally {
          announcement.style.width = savedWidth;
        }
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
        upperH4,
        announcement: measuredSize(announcementRect),
        compactAnnouncement,
        activity: measuredSize(activityRect),
        activityBottom: consoleBounds.top,
        obstacles,
        stationarySurface,
        fixedBands: phase === "REVEAL" ? { h4: h4Band, pac: pacBand } : undefined,
        ...(harvestRootPoolOverlap ? { harvestRootPoolOverlap: {
          semantics: "PROVEN" as const,
          scopeId,
          rootEventId: display.dataset.publicCardRootEventId!,
          interactionId: display.dataset.publicCardInteractionId!,
          eventId,
          cardId,
          poolRootEventId: harvestPoolWrapper?.dataset.harvestRootEventId ?? "",
          phase: phase as "REVEAL" | "MOVE",
        } } : {}),
        phaseRects,
      });
      if (result.status !== "placed") {
        if (snapshotRef.current && canRetainPublicStageLayout(table, snapshotRef.current)) return;
        observeUnavailableGeometry(JSON.stringify([roomId, scopeId, interactionId, eventId, cardId, viewerId, phase]), [
          table, display, primary, announcement, chip,
          ...document.querySelectorAll<HTMLElement>(PROTECTED_SELECTORS),
        ]);
        if (isAttackDodgeUxTraceActive()) {
          const signature = `${eventId}:${viewerId}:${phase}:${result.reason}`;
          if (signature !== traceSignatureRef.current) {
            traceSignatureRef.current = signature;
            recordAttackDodgeUxTrace("public-stage-layout-transition", {
              reason: result.reason, rootEventId: scopeId, eventId, publicCardId: cardId,
              viewerId, layoutViewerId: display.dataset.publicCardLayoutViewerId, phase,
              generation: nextGeneration, identity: snapshotRef.current?.layout.identity ?? null,
              candidate: roundedRect(visualPrimary), lastSafe: snapshotRef.current?.layout ?? null,
              blockers: obstacles.map(({ id, rect }) => ({ id, rect: roundedRect(rect) })),
            });
          }
        }
        generationRef.current = { ...generationRef.current, sceneKey: "", geometrySignature: "" };
        clearCountdownLayoutMetadata(table);
        setData(table, "data-public-stage-layout-status", "unavailable");
        setData(table, "data-public-stage-layout-phase", phase.toLowerCase());
        setData(table, "data-public-stage-layout-identity", undefined);
        setData(table, "data-public-stage-layout-failure", JSON.stringify({
          reason: result.reason,
          roomId, rootEventId: scopeId, scopeId, interactionId, eventId, cardId, viewerId, phase,
          stationarySurface,
          bandClearance: publicStageBandClearance(stationarySurface),
          h4Reserve: roundedRect(h4Band),
          pacReserve: roundedRect(pacBand),
          availableLaneHeight: Math.max(0, pacBand.top - h4Band.bottom),
          requiredLaneHeight: cardSize.height + 2 * publicStageBandClearance(stationarySurface),
          actualTopClearance: visualPrimary.top - h4Band.bottom,
          actualBottomClearance: pacBand.top - visualPrimary.bottom,
          viewport: roundedRect(viewport),
          table: roundedRect(tableBounds),
          consoleGuidance: roundedRect(consoleBounds),
          primary: roundedRect(visualPrimary),
          announcement: roundedRect(announcementRect),
          compactAnnouncement,
          activity: chip ? roundedRect(rectOf(chip)) : null,
          obstacles: obstacles.map(({ id, rect }) => ({ id, rect: roundedRect(rect) })),
        }));
        snapshotRef.current = null;
        committedLayouts.delete(table);
        setSnapshot((current) => current === null ? current : null);
        return;
      }

      if (isAttackDodgeUxTraceActive()) {
        const signature = `${eventId}:${viewerId}:${phase}:${result.layout.identity}`;
        if (signature !== traceSignatureRef.current) {
          traceSignatureRef.current = signature;
          recordAttackDodgeUxTrace("public-stage-layout-transition", {
            reason: "placed", rootEventId: scopeId, eventId, publicCardId: cardId,
            viewerId, layoutViewerId: display.dataset.publicCardLayoutViewerId,
            phase, generation: result.layout.generation, identity: result.layout.identity,
            variant: result.layout.variant, announcement: result.layout.announcement,
            activity: result.layout.activity, card: result.layout.card,
          });
        }
      }
      const next: SharedPublicStageLayout = {
        layout: result.layout,
        revealReady: phase !== "REVEAL" || (!frameFootprint && !announcement) || (() => {
          if (frameFootprint && !announcement) return false;
          const cardReady = !frameFootprint || (
            Math.abs(visualPrimary.left - result.layout.card.left) <= 1
            && Math.abs(visualPrimary.top - result.layout.card.top) <= 1
            && Math.abs(visualPrimary.right - result.layout.card.right) <= 1
            && Math.abs(visualPrimary.bottom - result.layout.card.bottom) <= 1
          );
          if (!cardReady) return false;
          const announcementReady = !announcement || (() => {
            const style = window.getComputedStyle(announcement);
            const rect = announcement.getBoundingClientRect();
            const target = result.layout.announcement;
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
              && announcement.dataset.publicCardAnnouncementPositioned === "true"
              && Math.abs(rect.left - target.left) <= 1
              && Math.abs(rect.top - target.top) <= 1
              && Math.abs(rect.width - (target.right - target.left)) <= 1
              && rect.height <= target.bottom - target.top + 1
              && rect.bottom <= h4Band.bottom + 1;
          })();
          if (!announcementReady) return false;
          if (!frameFootprint) return true;
          if (chip) {
            const style = window.getComputedStyle(chip);
            const rect = chip.getBoundingClientRect();
            const target = result.layout.activity;
            // A mounted PAC remains subject to its visible, shared safe rect;
            // absence is allowed because pacBand continues reserving the lane.
            if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) <= 0
              || rect.left < target.left - 1 || rect.right > target.right + 1
              || rect.top < target.top - 1 || rect.bottom > target.bottom + 1) return false;
          }
          const visibleH4 = announcement!.getBoundingClientRect();
          const mountedPac = chip ? rectOf(chip) : null;
          return publicStageMeasuredBandClearanceSatisfied({
            visual: frameFootprint.rect,
            upperBands: [
              { left: h4Band.left, top: h4Band.top, right: h4Band.right, bottom: h4Band.bottom },
              rectOf(announcement!),
            ],
            lowerBands: [
              { left: pacBand.left, top: pacBand.top, right: pacBand.right, bottom: pacBand.bottom },
              ...(mountedPac ? [mountedPac] : []),
            ],
            minimumGap: publicStageBandClearance("effect-frame"),
          }) && visibleH4.width > 0 && visibleH4.height > 0;
        })(),
        primaryEventId: eventId,
        primaryCardId: cardId,
        primaryOffset,
        announcementEventId: announcement?.dataset.publicCardAnnouncementEventId ?? "",
        announcementCopyKey: announcement?.dataset.publicCardAnnouncementCopyKey ?? "",
        announcementAnchorEventId: announcement?.dataset.publicCardAnnouncementAnchorEventId || null,
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
      committedLayouts.set(table, next);
      setData(table, "data-public-stage-layout-status", `shared-${phase.toLowerCase()}`);
      setData(table, "data-public-stage-layout-phase", phase.toLowerCase());
      setData(table, "data-public-stage-layout-variant", result.layout.variant);
      setData(table, "data-public-stage-layout-identity", result.layout.identity);
      setData(table, "data-public-stage-layout-failure", undefined);
      unavailableObservationKeyRef.current = "";
      snapshotRef.current = next;
      setSnapshot((current) => sameSnapshot(current, next) ? current : next);
      resizeObserver?.disconnect();
      for (const element of [table, display, ...(phase === "MOVE" ? [] : [primary]), announcement, chip,
        ...document.querySelectorAll<HTMLElement>(PROTECTED_SELECTORS)].filter((candidate): candidate is HTMLElement => Boolean(candidate))) resizeObserver?.observe(element);
    };
    function schedule() {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    }

    const ownedGeometryElement = (target: Node): HTMLElement | null => {
      const element = target instanceof HTMLElement ? target : target.parentElement;
      return element?.matches(
        '.public-card-journey-card[data-public-card-primary-card="true"], [data-public-card-announcement="true"], [data-public-activity-chip="true"]',
      ) ? element : null;
    };
    const isUnavailableCurrentRevealGeometry = (target: Node) => {
      const element = ownedGeometryElement(target);
      if (!element) return false;
      let failure: {
        phase?: string; roomId?: string; rootEventId?: string; scopeId?: string;
        interactionId?: string | null; eventId?: string; cardId?: string; viewerId?: string;
      } | null = null;
      try {
        failure = JSON.parse(table.dataset.publicStageLayoutFailure ?? "null") as typeof failure;
      } catch {
        return false;
      }
      if (!failure?.eventId || !failure.cardId || !publicStageFailedRevealMatchesScene({
        failure,
        scene: { roomId, scopeId, interactionId, eventId: failure.eventId, cardId: failure.cardId, viewerId, phase: "REVEAL" },
      })) return false;
      if (element.matches('[data-public-activity-chip="true"]')) {
        return element === table.querySelector<HTMLElement>('[data-public-activity-chip="true"]');
      }
      const display = element.closest<HTMLElement>(".public-card-display");
      if (!display || display.dataset.publicCardRootEventId !== scopeId
        || (display.dataset.publicCardInteractionId ?? null) !== interactionId
        || display.dataset.publicCardViewerId !== viewerId
        || display.dataset.publicCardLayoutViewerId !== viewerId) return false;
      if (element.matches('.public-card-journey-card[data-public-card-primary-card="true"]')) {
        return element.dataset.publicCardJourneyEventId === failure.eventId
          && element.dataset.publicCardJourneyCardId === failure.cardId
          && element.dataset.publicCardJourneyPhase === "reveal";
      }
      return element.matches('[data-public-card-announcement="true"]')
        && (element.dataset.publicCardAnnouncementEventId === failure.eventId
          || element.dataset.publicCardAnnouncementAnchorEventId === failure.eventId);
    };
    const isPendingCurrentRevealPlacement = (target: Node) => {
      const pending = snapshotRef.current;
      const scene = pending?.layout.scene;
      const element = ownedGeometryElement(target);
      if (!pending || !scene || !element) return false;
      const identityMatches = scene.roomId === roomId && scene.scopeId === scopeId
        && (scene.interactionId ?? null) === interactionId && scene.viewerId === viewerId;
      if (!publicStageRevealNeedsOwnedRemeasure({
        phase: scene.phase,
        revealReady: pending.revealReady,
        identityMatches,
      })) return false;

      if (element.matches('[data-public-activity-chip="true"]')) {
        return element === table.querySelector<HTMLElement>('[data-public-activity-chip="true"]');
      }
      const display = element.closest<HTMLElement>(".public-card-display");
      if (!display || display.dataset.publicCardRootEventId !== scene.scopeId
        || (display.dataset.publicCardInteractionId ?? null) !== (scene.interactionId ?? null)
        || display.dataset.publicCardViewerId !== scene.viewerId
        || display.dataset.publicCardLayoutViewerId !== scene.viewerId) return false;
      if (element.matches('.public-card-journey-card[data-public-card-primary-card="true"]')) {
        return element.dataset.publicCardJourneyEventId === pending.primaryEventId
          && element.dataset.publicCardJourneyCardId === pending.primaryCardId
          && element.dataset.publicCardJourneyPhase === "reveal";
      }
      return element.dataset.publicCardAnnouncementEventId === pending.primaryEventId
        || element.dataset.publicCardAnnouncementAnchorEventId === pending.primaryEventId;
    };
    const mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver((records) => {
      if (records.some((record) => {
        if (record.type === "attributes" && record.target === table
          && ["data-public-stage-layout-status", "data-public-stage-layout-phase", "data-public-stage-layout-identity", "data-public-stage-layout-failure"].includes(record.attributeName ?? "")) return false;
        if (record.type === "attributes" && record.attributeName?.startsWith("data-public-stage-layout-")
          && record.target !== table) return false;
        if (record.type === "attributes" && record.attributeName === "style" && ownedGeometryElement(record.target)) {
          // The first shared layout moves the real card and H4 to the measured
          // target. Re-measure that same proven REVEAL once those React-owned
          // styles land, otherwise revealReady can stay false forever because
          // the measurement observer intentionally ignores owned style writes.
          return isPendingCurrentRevealPlacement(record.target) || isUnavailableCurrentRevealGeometry(record.target);
        }
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
      unavailableObservationKeyRef.current = "";
      clearCountdownLayoutMetadata(table);
      committedLayouts.delete(table);
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


/** Retain only a previously committed, same-event/viewer pair which is still
 * safe against current DOM geometry. Never carry state across viewer changes. */
export function canRetainPublicStageLayout(table: HTMLElement, shared: SharedPublicStageLayout): boolean {
  const scene = shared.layout.scene;
  if (table.dataset.publicStageLayoutScope !== scene.scopeId) return false;
  const cards = [...table.querySelectorAll<HTMLElement>('.public-card-journey-card[data-public-card-primary-card="true"]')];
  const card = cards.find((el) => el.dataset.publicCardJourneyEventId === shared.primaryEventId
    && el.dataset.publicCardJourneyCardId === shared.primaryCardId);
  const display = card?.closest<HTMLElement>('.public-card-display');
  if (!card || !display || display.dataset.publicCardRootEventId !== scene.scopeId
    || display.dataset.publicCardViewerId !== scene.viewerId
    || display.dataset.publicCardLayoutViewerId !== scene.viewerId
    || (display.dataset.publicCardInteractionId ?? null) !== scene.interactionId) return false;
  const h4 = [...display.querySelectorAll<HTMLElement>('[data-public-card-announcement="true"]')]
    .find((el) => el.dataset.publicCardAnnouncementEventId === shared.announcementEventId
      && (el.dataset.publicCardAnnouncementCopyKey ?? "") === shared.announcementCopyKey);
  const pac = table.querySelector<HTMLElement>('[data-public-activity-chip="true"]');
  const consoleGuidance = document.querySelector<HTMLElement>(".local-player-dock .console-guidance");
  const effectFrameReveal = scene.phase === "REVEAL"
    && Boolean(card.querySelector(".public-card-effect-frame-panel"));
  const missingPacEffectReveal = effectFrameReveal && !pac;
  if (!h4 || (!pac && !missingPacEffectReveal) || !consoleGuidance || !visibleObstacle(consoleGuidance)) return false;
  const pacBand = fixedPublicActivityBand(table, consoleGuidance, pac);
  const h4Band = fixedPublicH4Band(table, h4);
  if (!pacBand || !h4Band) return false;
  const h4Rect = rectOf(h4);
  const pacRect = pac ? rectOf(pac) : {
    left: pacBand.left, top: pacBand.top, right: pacBand.right, bottom: pacBand.bottom,
  };
  const rects = [h4Rect, pacRect];
  const saved = [shared.layout.announcement, shared.layout.activity];
  const intersects = (a: PublicStageRect, b: PublicStageRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const within = (r: PublicStageRect, bounds: PublicStageRect) => r.left >= bounds.left - 1 && r.right <= bounds.right + 1 && r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1;
  const liveBounds = rectOf(table);
  const consoleBounds = rectOf(consoleGuidance);
  const pacVisibleAndSafe = !pac || visibleObstacle(pac)
    && Math.abs(pacRect.bottom - consoleBounds.top) <= 2
    && pacRect.left >= liveBounds.left - 1 && pacRect.right <= liveBounds.right + 1
    && pacRect.top >= Math.max(liveBounds.top, pacBand.top) - 1 && pacRect.bottom <= consoleBounds.top + 2
    && pacRect.left >= pacBand.left - 1 && pacRect.right <= pacBand.right + 1;
  const pacReserveMatches = pac
    ? [pacRect.left - saved[1].left, pacRect.top - saved[1].top,
      (pacRect.right - pacRect.left) - (saved[1].right - saved[1].left),
      (pacRect.bottom - pacRect.top) - (saved[1].bottom - saved[1].top)].every((value) => Math.abs(value) <= 1)
    : Math.abs(pacBand.left - saved[1].left) <= 1
      && Math.abs(pacBand.right - saved[1].right) <= 1
      && Math.abs(pacBand.bottom - saved[1].bottom) <= 2
      && pacBand.top <= saved[1].top + 1;
  const h4Matches = [h4Rect.left - saved[0].left, h4Rect.top - saved[0].top,
    (h4Rect.right - h4Rect.left) - (saved[0].right - saved[0].left),
    (h4Rect.bottom - h4Rect.top) - (saved[0].bottom - saved[0].top)].every((value) => Math.abs(value) <= 1);
  const currentFrame = effectFrameReveal ? publicEffectFrameVisualFootprint(card) : null;
  const retainedFrameClearance = !effectFrameReveal || Boolean(currentFrame
    && publicStageMeasuredBandClearanceSatisfied({
      visual: currentFrame.rect,
      upperBands: [h4Band, h4Rect],
      lowerBands: [pacBand, ...(pac ? [pacRect] : [])],
      minimumGap: publicStageBandClearance("effect-frame"),
    })
    && Math.abs(currentFrame.rect.left - shared.layout.card.left) <= 1
    && Math.abs(currentFrame.rect.top - shared.layout.card.top) <= 1
    && Math.abs(currentFrame.rect.right - shared.layout.card.right) <= 1
    && Math.abs(currentFrame.rect.bottom - shared.layout.card.bottom) <= 1);
  if (!within(h4Rect, liveBounds) || !pacVisibleAndSafe
    || Math.abs(pacBand.bottom - consoleBounds.top) > 2
    || !h4Matches || !pacReserveMatches || !retainedFrameClearance
    || intersects(h4Band, pacBand) || intersects(h4Rect, pacRect)) return false;
  const obstacles = [...document.querySelectorAll<HTMLElement>(PROTECTED_SELECTORS)]
    .filter((el) => el !== card && el !== h4 && el !== pac && !card.contains(el) && visibleObstacle(el))
    .map(rectOf);
  if (effectFrameReveal && currentFrame) obstacles.push(currentFrame.rect);
  if (card.dataset.publicCardJourneyPhase !== 'parked') {
    obstacles.push(rectOf(card));
    card.querySelectorAll<HTMLElement>('.public-card-effect-frame-panel').forEach((el) => {
      if (visibleForMeasure(el)) obstacles.push(rectOf(el));
    });
  }
  return !(effectFrameReveal && obstacles.some((obstacle) => intersects(h4Band, obstacle)))
    && !rects.some((rect) => obstacles.some((obstacle) => intersects(rect, obstacle)));
}

/**
 * Allow PAC to keep the same proven scene while its lower edge is reflowed to
 * the live Console. This is intentionally separate from retaining a complete
 * shared layout: the card/H4 geometry may need a new generation, while the
 * prior PAC can remain visible if its current destination is still safe.
 */
export function canPlaceRetainedPublicActivity(
  table: HTMLElement,
  shared: SharedPublicStageLayout,
  activity: PublicStageRect,
): boolean {
  const scene = shared.layout.scene;
  if (table.dataset.publicStageLayoutScope !== scene.scopeId) return false;
  const card = [...table.querySelectorAll<HTMLElement>(
    '.public-card-journey-card[data-public-card-primary-card="true"]',
  )].find((el) => el.dataset.publicCardJourneyEventId === shared.primaryEventId
    && el.dataset.publicCardJourneyCardId === shared.primaryCardId);
  const display = card?.closest<HTMLElement>(".public-card-display");
  if (!card || !display || display.dataset.publicCardRootEventId !== scene.scopeId
    || display.dataset.publicCardViewerId !== scene.viewerId
    || display.dataset.publicCardLayoutViewerId !== scene.viewerId
    || (display.dataset.publicCardInteractionId ?? null) !== scene.interactionId) return false;

  // A newer active card in this interaction owns the stage now. Never keep a
  // prior card's PAC placement across that real semantic handoff.
  const activeCards = [...table.querySelectorAll<HTMLElement>(
    '.public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="reveal"], .public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="move"]',
  )].filter((candidate) => {
    const owner = candidate.closest<HTMLElement>(".public-card-display");
    return owner?.dataset.publicCardRootEventId === scene.scopeId
      && owner.dataset.publicCardViewerId === scene.viewerId
      && owner.dataset.publicCardLayoutViewerId === scene.viewerId
      && (!scene.interactionId || owner.dataset.publicCardInteractionId === scene.interactionId);
  });
  if (activeCards.some((candidate) => candidate !== card)) return false;

  const h4 = [...display.querySelectorAll<HTMLElement>('[data-public-card-announcement="true"]')]
    .find((el) => el.dataset.publicCardAnnouncementEventId === shared.announcementEventId
      && (el.dataset.publicCardAnnouncementCopyKey ?? "") === shared.announcementCopyKey);
  const pac = table.querySelector<HTMLElement>('[data-public-activity-chip="true"]');
  const consoleGuidance = document.querySelector<HTMLElement>(".local-player-dock .console-guidance");
  if (!h4 || !pac || !consoleGuidance || !visibleObstacle(consoleGuidance)) return false;

  const tableBounds = rectOf(table);
  const h4Bounds = rectOf(h4);
  const consoleBounds = rectOf(consoleGuidance);
  const activityBounds = activity;
  const intersects = (left: PublicStageRect, right: PublicStageRect) => left.left < right.right
    && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
  const viewportLeft = Math.max(0, window.visualViewport?.offsetLeft ?? 0);
  const viewportTop = Math.max(0, window.visualViewport?.offsetTop ?? 0);
  const viewportRight = Math.min(window.innerWidth, viewportLeft + (window.visualViewport?.width ?? window.innerWidth));
  const viewportBottom = Math.min(window.innerHeight, viewportTop + (window.visualViewport?.height ?? window.innerHeight));
  const activityInsideStageCorridor = activityBounds.left >= Math.max(tableBounds.left, viewportLeft) + 1
    && activityBounds.right <= Math.min(tableBounds.right, viewportRight) - 1
    && activityBounds.top >= Math.max(tableBounds.top, viewportTop) + 1
    && activityBounds.bottom <= Math.min(viewportBottom, consoleBounds.top) + 1;
  const h4InsideTable = h4Bounds.left >= tableBounds.left - 1 && h4Bounds.right <= tableBounds.right + 1
    && h4Bounds.top >= tableBounds.top - 1 && h4Bounds.bottom <= tableBounds.bottom + 1;
  if (!activityInsideStageCorridor || !h4InsideTable
    || Math.abs(activityBounds.bottom - consoleBounds.top) > 2
    || intersects(h4Bounds, activityBounds)) return false;

  const obstacles = [...document.querySelectorAll<HTMLElement>(PROTECTED_SELECTORS)]
    .filter((element) => element !== card && element !== h4 && element !== pac
      && !card.contains(element) && visibleObstacle(element))
    .map(rectOf);
  if (card.dataset.publicCardJourneyPhase !== "parked") {
    obstacles.push(rectOf(card));
    card.querySelectorAll<HTMLElement>(".public-card-effect-frame-panel").forEach((element) => {
      if (visibleForMeasure(element)) obstacles.push(rectOf(element));
    });
  }
  return !obstacles.some((obstacle) => intersects(activityBounds, obstacle));
}

export function sharedPublicStageMatchesElement(table: HTMLElement, shared: SharedPublicStageLayout): boolean {
  if (table.dataset.publicStageLayoutIdentity !== shared.layout.identity
    || table.dataset.publicStageLayoutPhase !== shared.layout.scene.phase.toLowerCase()) return false;
  const h4 = shared.announcementEventId ? [...table.querySelectorAll<HTMLElement>('[data-public-card-announcement="true"]')]
    .find((el) => el.dataset.publicCardAnnouncementEventId === shared.announcementEventId
      && (el.dataset.publicCardAnnouncementCopyKey ?? "") === shared.announcementCopyKey) : null;
  const pac = table.querySelector<HTMLElement>('[data-public-activity-chip="true"]');
  const consoleGuidance = document.querySelector<HTMLElement>(".local-player-dock .console-guidance");
  if (!consoleGuidance || !visibleObstacle(consoleGuidance)
    || shared.layout.scene.phase !== "REVEAL" && (!h4 || !pac)) return false;
  const consoleTop = consoleGuidance.getBoundingClientRect().top;
  // Validate generation ownership before consumers apply the published rects.
  // Requiring the H4/PAC to already match those rects here deadlocks first
  // placement: the consumers hide both elements until this predicate succeeds.
  if (Math.abs(shared.layout.activity.bottom - consoleTop) > 2
    || h4 && (h4.dataset.publicCardAnnouncementEventId !== shared.announcementEventId
      || (h4.dataset.publicCardAnnouncementCopyKey ?? "") !== shared.announcementCopyKey)) return false;
  return [...table.querySelectorAll<HTMLElement>(
    '.public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="reveal"], .public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="move"], .public-card-journey-card[data-public-card-primary-card="true"][data-public-card-journey-phase="parked"]',
  )].some((card) => card.dataset.publicCardJourneyEventId === shared.primaryEventId
    && card.dataset.publicCardJourneyCardId === shared.primaryCardId
    && card.dataset.publicCardJourneyPhase?.toUpperCase() === shared.layout.scene.phase
    && card.dataset.publicStageLayoutIdentity === shared.layout.identity
    && (shared.layout.scene.phase !== "REVEAL" || ["reveal", "duel-reveal"].includes(card.dataset.publicCardJourneySize ?? ""))
    && (() => {
      const display = card.closest<HTMLElement>(".public-card-display");
      return Boolean(display
        && display.dataset.publicCardLayoutViewerId === shared.layout.scene.viewerId
        && publicStageSceneMatchesCard(shared.layout.scene, {
          roomId: shared.layout.scene.roomId,
          scopeId: display.dataset.publicCardRootEventId ?? "",
          interactionId: display.dataset.publicCardInteractionId ?? null,
          eventId: card.dataset.publicCardJourneyEventId ?? "",
          cardId: card.dataset.publicCardJourneyCardId ?? "",
          viewerId: display.dataset.publicCardViewerId ?? "",
          phase: shared.layout.scene.phase,
        })
        && (shared.layout.scene.phase === "REVEAL" || display.dataset.publicCardLayoutPending !== "true"));
    })());
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
