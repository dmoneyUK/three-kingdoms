export type PublicStageRect = { left: number; top: number; right: number; bottom: number };
export type PublicStageSize = { width: number; height: number };
export type PublicStageTableCoordinateSpace = {
  originLeft: number;
  originTop: number;
  borderLeft: number;
  borderTop: number;
  scaleX: number;
  scaleY: number;
};

export type PublicStageRevealIdentity = {
  roomId: string;
  rootEventId: string;
  interactionId: string;
  eventId: string;
  cardId: string;
  viewerId: string;
};

/** A static H4 may use the pending REVEAL anchor only for its exact live card scope. */
export function publicStageStaticAnnouncementMatchesReveal(input: {
  phase: "static" | "reveal" | "move" | "parked";
  expected: PublicStageRevealIdentity | null | undefined;
  actual: PublicStageRevealIdentity;
}): boolean {
  const expected = input.expected;
  return input.phase === "static" && Boolean(expected)
    && [expected!.roomId, expected!.rootEventId, expected!.interactionId, expected!.eventId,
      expected!.cardId, expected!.viewerId].every((value) => value.trim().length > 0)
    && expected!.roomId === input.actual.roomId
    && expected!.rootEventId === input.actual.rootEventId
    && expected!.interactionId === input.actual.interactionId
    && expected!.eventId === input.actual.eventId
    && expected!.cardId === input.actual.cardId
    && expected!.viewerId === input.actual.viewerId;
}

/** Checkpoint only the elapsed visible segment; hidden intervals are not charged. */
export function checkpointPublicStageVisibleHold(input: {
  elapsedMs: number;
  remainingMs: number;
  startedAtMs: number | null;
  nowMs: number;
}) {
  const segmentMs = input.startedAtMs === null ? 0 : Math.max(0, input.nowMs - input.startedAtMs);
  return {
    elapsedMs: Math.max(0, input.elapsedMs) + segmentMs,
    remainingMs: Math.max(0, input.remainingMs - segmentMs),
    segmentMs,
    startedAtMs: null,
  };
}

/** A visible hold completes only on its deadline while the current paint is safe. */
export function publicStageVisibleHoldCanComplete(input: {
  remainingMs: number;
  startedAtMs: number | null;
  nowMs: number;
  safePainted: boolean;
}): boolean {
  return input.safePainted && input.startedAtMs !== null
    && Math.max(0, input.nowMs - input.startedAtMs) >= Math.max(0, input.remainingMs);
}

/** Convert one client-space measurement to the .play-table padding-box space. */
export function publicStageRectToTableLocal(
  rect: PublicStageRect,
  space: PublicStageTableCoordinateSpace,
): PublicStageRect | null {
  if (!finiteRect(rect) || !validTableCoordinateSpace(space)) return null;
  const left = (rect.left - space.originLeft) / space.scaleX - space.borderLeft;
  const top = (rect.top - space.originTop) / space.scaleY - space.borderTop;
  const right = (rect.right - space.originLeft) / space.scaleX - space.borderLeft;
  const bottom = (rect.bottom - space.originTop) / space.scaleY - space.borderTop;
  const local = { left, top, right, bottom };
  return finiteRect(local) ? local : null;
}

/** Convert one .play-table-local measurement back to client space. */
export function publicStageRectFromTableLocal(
  rect: PublicStageRect,
  space: PublicStageTableCoordinateSpace,
): PublicStageRect | null {
  if (!finiteRect(rect) || !validTableCoordinateSpace(space)) return null;
  const left = space.originLeft + (rect.left + space.borderLeft) * space.scaleX;
  const top = space.originTop + (rect.top + space.borderTop) * space.scaleY;
  const right = space.originLeft + (rect.right + space.borderLeft) * space.scaleX;
  const bottom = space.originTop + (rect.bottom + space.borderTop) * space.scaleY;
  const client = { left, top, right, bottom };
  return finiteRect(client) ? client : null;
}

export function publicStageCoordinateToTableLocal(
  value: number,
  axis: "x" | "y",
  space: PublicStageTableCoordinateSpace,
): number | null {
  if (!Number.isFinite(value) || !validTableCoordinateSpace(space)) return null;
  return axis === "x"
    ? (value - space.originLeft) / space.scaleX - space.borderLeft
    : (value - space.originTop) / space.scaleY - space.borderTop;
}

export function publicStageCoordinateFromTableLocal(
  value: number,
  axis: "x" | "y",
  space: PublicStageTableCoordinateSpace,
): number | null {
  if (!Number.isFinite(value) || !validTableCoordinateSpace(space)) return null;
  return axis === "x"
    ? space.originLeft + (value + space.borderLeft) * space.scaleX
    : space.originTop + (value + space.borderTop) * space.scaleY;
}

export function publicStageLengthToTableLocal(
  value: number,
  axis: "x" | "y",
  space: PublicStageTableCoordinateSpace,
): number | null {
  if (!Number.isFinite(value) || value <= 0 || !validTableCoordinateSpace(space)) return null;
  return value / (axis === "x" ? space.scaleX : space.scaleY);
}

function validTableCoordinateSpace(space: PublicStageTableCoordinateSpace): boolean {
  return [space.originLeft, space.originTop, space.borderLeft, space.borderTop, space.scaleX, space.scaleY]
    .every(Number.isFinite) && space.borderLeft >= 0 && space.borderTop >= 0
    && space.scaleX > 0 && space.scaleY > 0;
}

export type PublicStagePhase = "REVEAL" | "MOVE" | "PARKED";
export type PublicStageStationarySurface = "card" | "effect-frame";
export type PublicStageH4Geometry = {
  /** Fixed, message-independent band used to position passive public reveals. */
  reserve: PublicStageRect;
  /** The full painted H4 bounds at its fixed anchor; it may cover a passive reveal. */
  paint: PublicStageRect;
  overlapPolicy: "PASSIVE_REVEAL_FOREGROUND";
};

export const PUBLIC_STAGE_CARD_BAND_CLEARANCE_PX = 8;
export const PUBLIC_STAGE_EFFECT_FRAME_BAND_CLEARANCE_PX = 5;

export function publicStageBandClearance(surface: PublicStageStationarySurface = "card") {
  return surface === "effect-frame"
    ? PUBLIC_STAGE_EFFECT_FRAME_BAND_CLEARANCE_PX
    : PUBLIC_STAGE_CARD_BAND_CLEARANCE_PX;
}

/** Preferred top for a complete passive Effect Frame centered in the fixed
 * H4-to-PAC display lane. The inputs are nominal reserves, never live copy. */
export function publicStationaryLanePreferredTop(
  h4Reserve: PublicStageRect,
  pacReserve: PublicStageRect,
  frameHeight: number,
  preferredTopOffset = 0,
): number | null {
  if (!finiteRect(h4Reserve) || !finiteRect(pacReserve)
    || !Number.isFinite(frameHeight) || frameHeight <= 0
    || !Number.isFinite(preferredTopOffset)) return null;
  return (h4Reserve.bottom + pacReserve.top - frameHeight) / 2 + preferredTopOffset;
}

/** Check actual measured bands against a stationary public visual. The caller
 * supplies both visible copy and fixed reserves when present; an absent PAC is
 * represented by its fixed reserve alone. This comparison has no layout
 * tolerance: a measured 4.9px gap must not satisfy a 5px requirement. */
export function publicStageMeasuredBandClearanceSatisfied(input: {
  visual: PublicStageRect;
  upperBands: readonly PublicStageRect[];
  lowerBands: readonly PublicStageRect[];
  minimumGap: number;
}): boolean {
  return finiteRect(input.visual)
    && Number.isFinite(input.minimumGap) && input.minimumGap >= 0
    && input.upperBands.length > 0 && input.upperBands.every((band) => finiteRect(band)
      && input.visual.top - band.bottom >= input.minimumGap)
    && input.lowerBands.length > 0 && input.lowerBands.every((band) => finiteRect(band)
      && band.top - input.visual.bottom >= input.minimumGap);
}

/** Readiness is phase-specific: only REVEAL needs a painted centre frame.
 * MOVE and PARKED need the current viewer's measured author target, not the
 * already-retired REVEAL DOM/layout. */
export function publicStageJourneyPhaseReady(input: {
  phase: PublicStagePhase;
  viewerId: string;
  targetViewerId?: string | null;
  target: PublicStageRect | null | undefined;
  revealCenterAvailable: boolean;
  revealPainted: boolean;
}): boolean {
  if (!publicStageJourneyTargetReady(input)) {
    return false;
  }
  return input.phase !== "REVEAL" || input.revealCenterAvailable && input.revealPainted;
}

/** A MOVE/PARKED visual may proceed only with this viewer's measured target. */
export function publicStageJourneyTargetReady(input: {
  viewerId: string;
  targetViewerId?: string | null;
  target: PublicStageRect | null | undefined;
}): boolean {
  return Boolean(input.viewerId.trim()
    && input.targetViewerId === input.viewerId
    && finiteRect(input.target ?? { left: 0, top: 0, right: 0, bottom: 0 }));
}

/** Re-measure only the same current REVEAL while its measured placement is pending paint. */
export function publicStageRevealNeedsOwnedRemeasure(input: {
  phase?: PublicStagePhase | null;
  revealReady?: boolean;
  identityMatches: boolean;
}): boolean {
  return input.phase === "REVEAL" && input.revealReady === false && input.identityMatches;
}

/** Positions a card and its measured attached label above a reserved band. */
export function positionLabeledCardAboveBand(input: {
  centerX: number;
  bandTop: number;
  card: PublicStageSize;
  label: PublicStageRect;
  gap?: number;
}): { card: PublicStageRect; footprint: PublicStageRect } | null {
  const { centerX, bandTop, card, label } = input;
  const gap = input.gap ?? 8;
  if (![centerX, bandTop, gap, label.left, label.top, label.right, label.bottom].every(Number.isFinite)
    || !finiteSize(card) || label.right <= label.left || label.bottom <= label.top || gap < 0) return null;
  const left = centerX - card.width / 2;
  const labelBottom = Math.max(card.height, label.bottom);
  const top = bandTop - gap - labelBottom;
  const footprintLeft = left + Math.min(0, label.left);
  const footprintTop = top + Math.min(0, label.top);
  const footprintRight = left + Math.max(card.width, label.right);
  const footprintBottom = top + labelBottom;
  return {
    card: { left, top, right: left + card.width, bottom: top + card.height },
    footprint: { left: footprintLeft, top: footprintTop, right: footprintRight, bottom: footprintBottom },
  };
}

/** A layout identity is valid only when every field comes from proven public state. */
export type PublicStageScene = {
  semantics: "PROVEN";
  roomId: string;
  scopeId: string;
  interactionId?: string | null;
  eventId: string;
  cardId: string;
  viewerId: string;
  phase: PublicStagePhase;
  generation: number;
};

/** A failed REVEAL may be remeasured only while every proven scene identity still matches. */
export function publicStageFailedRevealMatchesScene(input: {
  failure: {
    phase?: string;
    roomId?: string;
    rootEventId?: string;
    scopeId?: string;
    interactionId?: string | null;
    eventId?: string;
    cardId?: string;
    viewerId?: string;
  } | null | undefined;
  scene: Pick<PublicStageScene, "roomId" | "scopeId" | "interactionId" | "eventId" | "cardId" | "viewerId" | "phase">;
}): boolean {
  const { failure, scene } = input;
  return Boolean(failure
    && failure.phase === "REVEAL" && scene.phase === "REVEAL"
    && failure.roomId === scene.roomId
    && (failure.rootEventId ?? failure.scopeId) === scene.scopeId
    && (failure.interactionId ?? null) === (scene.interactionId ?? null)
    && failure.eventId === scene.eventId
    && failure.cardId === scene.cardId
    && failure.viewerId === scene.viewerId);
}

export type PublicStageLayoutInput = {
  scene: PublicStageScene;
  viewport: PublicStageRect;
  table: PublicStageRect;
  preferredCard: Pick<PublicStageRect, "left" | "top">;
  card: PublicStageSize;
  announcement: PublicStageSize;
  activity: PublicStageSize;
  /** Measured top edge of the real Local Console guidance panel. */
  activityBottom?: number;
  obstacles: readonly { id: string; rect: PublicStageRect }[];
  phaseRects?: { card: PublicStageRect; activity: PublicStageRect; announcement?: PublicStageRect };
  upperH4?: PublicStageH4Geometry & { gap: number };
  /** Permanent message-free H4/PAC reservations used for stationary reveals. */
  fixedBands?: { h4: PublicStageH4Geometry; pac: PublicStageRect };
  /** Set only when the primary visual is a validated, complete public Effect Frame. */
  stationarySurface?: PublicStageStationarySurface;
  announcementCardGap?: number;
};

export type PublicStageLayout = {
  identity: string;
  variant: "stack" | "fixed-bands" | "move" | "parked";
  generation: number;
  scene: PublicStageScene;
  safeBounds: PublicStageRect;
  protectedRects: readonly { id: string; rect: PublicStageRect }[];
  announcement: PublicStageRect;
  card: PublicStageRect;
  activity: PublicStageRect;
};

export type PublicStageLayoutResult =
  | { status: "placed"; layout: PublicStageLayout }
  | { status: "unavailable"; identity: string | null; reason: "UNPROVEN_SCENE" | "INVALID_GEOMETRY" | "NO_SAFE_STAGE_BAND" };

function finiteRect(rect: PublicStageRect): boolean {
  return rect !== null && typeof rect === "object"
    && [rect.left, rect.top, rect.right, rect.bottom].every(Number.isFinite)
    && rect.right > rect.left && rect.bottom > rect.top;
}

function finiteSize(size: PublicStageSize): boolean {
  return size !== null && typeof size === "object"
    && Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0;
}

function makeRect(centerX: number, top: number, size: PublicStageSize): PublicStageRect {
  const left = centerX - size.width / 2;
  return { left, top, right: left + size.width, bottom: top + size.height };
}

function overlaps(left: PublicStageRect, right: PublicStageRect): boolean {
  return left.left < right.right && left.right > right.left
    && left.top < right.bottom && left.bottom > right.top;
}

/** H4 may cover part of a passive CardFace, but never its entire visible surface. */
export function publicStageHasVisibleAreaAfterForegroundOverlay(visual: PublicStageRect, overlay: PublicStageRect): boolean {
  if (!finiteRect(visual) || !finiteRect(overlay)) return false;
  const intersectionWidth = Math.max(0, Math.min(visual.right, overlay.right) - Math.max(visual.left, overlay.left));
  const intersectionHeight = Math.max(0, Math.min(visual.bottom, overlay.bottom) - Math.max(visual.top, overlay.top));
  return visual.right - visual.left > intersectionWidth || visual.bottom - visual.top > intersectionHeight;
}

/**
 * Produces a stable identity for one proven physical public-card scene.
 * Viewer, phase and layout generation are part of the key, so an old viewer's
 * or old phase's geometry cannot be reused for a new scene.
 */
export function publicStageSceneIdentity(scene: PublicStageScene | null | undefined): string | null {
  if (!scene || scene.semantics !== "PROVEN"
    || [scene.roomId, scene.scopeId, scene.eventId, scene.cardId, scene.viewerId]
      .some((value) => typeof value !== "string" || !value.trim())
    || scene.interactionId !== undefined && scene.interactionId !== null
      && (typeof scene.interactionId !== "string" || !scene.interactionId.trim())
    || !["REVEAL", "MOVE", "PARKED"].includes(scene.phase)
    || !Number.isInteger(scene.generation) || scene.generation < 0) return null;
  return JSON.stringify([
    scene.roomId,
    scene.scopeId,
    scene.interactionId ?? null,
    scene.eventId,
    scene.cardId,
    scene.viewerId,
    scene.phase,
    scene.generation,
  ]);
}

/** Match one authentic card/reveal against the full committed shared scene.
 * Consumers use this same identity before moving or exposing the CardFace. */
export function publicStageSceneMatchesCard(scene: PublicStageScene | null | undefined, card: {
  roomId: string;
  scopeId: string;
  interactionId?: string | null;
  eventId: string;
  cardId: string;
  viewerId: string;
  phase: PublicStagePhase;
}): boolean {
  return publicStageSceneIdentity(scene) !== null
    && scene!.roomId === card.roomId
    && scene!.scopeId === card.scopeId
    && (scene!.interactionId ?? null) === (card.interactionId ?? null)
    && scene!.eventId === card.eventId
    && scene!.cardId === card.cardId
    && scene!.viewerId === card.viewerId
    && scene!.phase === card.phase;
}

/** Maps the measured shared visual union back to its real primary card anchor. */
export function publicStagePrimaryOriginFromVisualRect(
  visual: PublicStageRect,
  primaryOffset: { left: number; top: number },
): { left: number; top: number } | null {
  if (!finiteRect(visual) || !Number.isFinite(primaryOffset.left) || !Number.isFinite(primaryOffset.top)) return null;
  const left = visual.left - primaryOffset.left;
  const top = visual.top - primaryOffset.top;
  return Number.isFinite(left) && Number.isFinite(top) ? { left, top } : null;
}

/**
 * Validates the measured target for a complete public Effect Frame.
 * The target may be consumed while the frame is still moving into place:
 * `revealReady` is a paint confirmation, so requiring it before applying the
 * target would prevent the DOM from ever reaching the position that makes it
 * ready. Proof identity and the matching H4 owner remain mandatory here.
 */
export function publicStageEffectFrameRevealTargetMatches(input: {
  layout: PublicStageLayout | null | undefined;
  roomId: string;
  rootEventId: string;
  interactionId?: string | null;
  eventId: string;
  cardId: string;
  viewerId: string;
  primaryEventId: string;
  primaryCardId: string;
  announcementEventId: string;
  announcementAnchorEventId: string | null;
}): boolean {
  const layout = input.layout;
  return Boolean(layout
    && layout.variant === "fixed-bands"
    && input.primaryEventId === input.eventId
    && input.primaryCardId === input.cardId
    && (input.announcementEventId === input.eventId || input.announcementAnchorEventId === input.eventId)
    && publicStageSceneMatchesCard(layout.scene, {
      roomId: input.roomId,
      scopeId: input.rootEventId,
      interactionId: input.interactionId,
      eventId: input.eventId,
      cardId: input.cardId,
      viewerId: input.viewerId,
      phase: "REVEAL",
    }));
}

/** A reveal may retire only after its real safe paint and measured viewer target. */
export function publicStageRevealCanRetire(input: {
  phase: PublicStagePhase;
  layoutPending: boolean;
  safePainted: boolean;
  viewerId: string;
  parkingTargetViewerId?: string | null;
  parkingTarget: Pick<PublicStageSize, "width" | "height"> | null | undefined;
  /** Some verified reveals finish in the centre and have no seat-parking stage. */
  requireParkingTarget?: boolean;
}): boolean {
  return input.phase === "REVEAL"
    && !input.layoutPending
    && input.safePainted
    && Boolean(input.viewerId.trim())
    && (input.requireParkingTarget === false
      || input.parkingTargetViewerId === input.viewerId
        && finiteSize(input.parkingTarget ?? { width: 0, height: 0 }));
}

/**
 * Places one proven public-card phase. Passive REVEAL keeps its canonical
 * nominal anchor and layers independently over surrounding components.
 * MOVE/PARKED preserve their measured endpoints and protect real interactive
 * geometry. Card/effect names never affect placement.
 */
export function calculatePublicStageLayout(input: PublicStageLayoutInput): PublicStageLayoutResult {
  const identity = publicStageSceneIdentity(input.scene);
  if (!identity) return { status: "unavailable", identity: null, reason: "UNPROVEN_SCENE" };

  const { viewport, table, card, announcement, activity } = input;
  const announcementCardGap = input.announcementCardGap ?? 8;
  if (!finiteRect(viewport) || !finiteRect(table)
    || !finiteSize(card) || !finiteSize(announcement) || !finiteSize(activity)
    || input.activityBottom !== undefined && !Number.isFinite(input.activityBottom)
    || !Number.isFinite(input.preferredCard.left) || !Number.isFinite(input.preferredCard.top)
    || !Number.isFinite(announcementCardGap) || announcementCardGap < 0
    || input.scene.phase !== "REVEAL" && (!Array.isArray(input.obstacles)
      || input.obstacles.some((obstacle) => !obstacle || typeof obstacle.id !== "string"
        || !obstacle.id.trim() || !finiteRect(obstacle.rect)))) {
    return { status: "unavailable", identity, reason: "INVALID_GEOMETRY" };
  }
  if (input.scene.phase !== "REVEAL" && (!input.phaseRects
    || !finiteRect(input.phaseRects.card) || !finiteRect(input.phaseRects.activity))) {
    return { status: "unavailable", identity, reason: "INVALID_GEOMETRY" };
  }
  if (input.scene.phase === "MOVE" && (!input.phaseRects?.announcement || !finiteRect(input.phaseRects.announcement))) {
    return { status: "unavailable", identity, reason: "INVALID_GEOMETRY" };
  }

  const activityBottom = Math.min(viewport.bottom, input.activityBottom ?? Math.min(viewport.bottom, table.bottom) - 8);
  const safeBounds: PublicStageRect = input.scene.phase === "REVEAL"
    ? { ...table }
    : {
      left: Math.max(viewport.left, table.left) + 8,
      top: Math.max(viewport.top, table.top) + 8,
      right: Math.min(viewport.right, table.right) - 8,
      // The PAC may use the measured gap below the battlefield border so its
      // lower edge can meet the Console guidance border exactly.
      bottom: activityBottom,
    };
  if (input.scene.phase !== "REVEAL" && (safeBounds.right <= safeBounds.left || safeBounds.bottom <= safeBounds.top)) {
    return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
  }
  const anchoredActivity = makeRect(
    (safeBounds.left + safeBounds.right) / 2,
    safeBounds.bottom - activity.height,
    activity,
  );
  if (input.scene.phase === "REVEAL" && input.fixedBands) {
    const { h4 } = input.fixedBands;
    if (!finiteRect(h4.reserve) || !finiteRect(h4.paint) || !finiteRect(input.fixedBands.pac)) {
      return { status: "unavailable", identity, reason: "INVALID_GEOMETRY" };
    }
    // H4/PAC are independently painted foreground layers. Their nominal or
    // actual rectangles are useful for placement and diagnostics, but never
    // veto a proven passive reveal, including when the layers intersect.
    const announcementRect = finiteRect(h4.paint) ? h4.paint
      : finiteRect(h4.reserve) ? h4.reserve
        : makeRect((safeBounds.left + safeBounds.right) / 2, safeBounds.top, input.announcement);
    const centerX = (table.left + table.right) / 2;
    const activityRect = makeRect(centerX, activityBottom - activity.height, activity);
    // Keep the existing canonical card position. H4/PAC reserves and preferred
    // clearance are placement guides, not hard gates for a committed reveal.
    const cardRect = {
      left: input.preferredCard.left,
      top: input.preferredCard.top,
      right: input.preferredCard.left + card.width,
      bottom: input.preferredCard.top + card.height,
    };
    if (!finiteRect(cardRect) || !finiteRect(activityRect)) {
      return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
    }
    return { status: "placed", layout: { identity, variant: "fixed-bands", generation: input.scene.generation,
      scene: input.scene, safeBounds,
      protectedRects: [],
      announcement: announcementRect, card: cardRect, activity: activityRect } };
  }
  if (input.upperH4) {
    const { reserve, paint: h4Paint, gap, overlapPolicy } = input.upperH4;
    if (input.scene.phase === "REVEAL") {
      if (!finiteRect(reserve) || !finiteRect(h4Paint)) {
        return { status: "unavailable", identity, reason: "INVALID_GEOMETRY" };
      }
      const announcementRect = finiteRect(h4Paint) ? h4Paint
        : finiteRect(reserve) ? reserve
          : makeRect((safeBounds.left + safeBounds.right) / 2, safeBounds.top, input.announcement);
      const activityRect = makeRect((table.left + table.right) / 2, activityBottom - activity.height, activity);
      const cardRect = {
        left: input.preferredCard.left,
        top: input.preferredCard.top,
        right: input.preferredCard.left + card.width,
        bottom: input.preferredCard.top + card.height,
      };
      if (!finiteRect(cardRect) || !finiteRect(activityRect)) {
        return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
      }
      return { status: "placed", layout: { identity, variant: "stack", generation: input.scene.generation,
        scene: input.scene, safeBounds,
        protectedRects: [],
        announcement: announcementRect, card: cardRect, activity: activityRect } };
    }
    const reservedHeight = finiteRect(reserve) ? reserve.bottom - reserve.top : Number.NaN;
    if (overlapPolicy !== "PASSIVE_REVEAL_FOREGROUND"
      || !finiteRect(reserve) || !finiteRect(h4Paint)
      || Math.abs(h4Paint.left - reserve.left) > 1
      || Math.abs(h4Paint.right - reserve.right) > 1
      || Math.abs(h4Paint.top - reserve.top) > 1
      || ![reservedHeight, gap].every(Number.isFinite) || gap < 0) {
      return { status: "unavailable", identity, reason: "INVALID_GEOMETRY" };
    }
    const h4 = h4Paint;
    const activityRect = input.activityBottom !== undefined ? anchoredActivity : input.phaseRects!.activity;
    const cardRect = input.phaseRects!.card;
    const stageRects = [h4, activityRect];
    if (stageRects.some((rect) => rect.left < safeBounds.left || rect.right > safeBounds.right || rect.top < safeBounds.top || rect.bottom > safeBounds.bottom
      || input.obstacles.some((obstacle) => overlaps(rect, obstacle.rect)))
      || overlaps(h4, activityRect)) {
      return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
    }
    return { status: "placed", layout: { identity, variant: input.scene.phase === "MOVE" ? "move" : "parked", generation: input.scene.generation, scene: input.scene, safeBounds,
      protectedRects: input.obstacles.map(({ id, rect }) => ({ id, rect: { ...rect } })), announcement: h4, card: { ...cardRect }, activity: { ...activityRect } } };
  }
  if (input.scene.phase !== "REVEAL") {
    const phaseRects = input.phaseRects!;
    const gap = Math.max(8, announcementCardGap);
    const moveActivityRect = input.activityBottom === undefined ? phaseRects.activity : anchoredActivity;
    if (input.scene.phase === "MOVE") {
      // The 380ms physical-card transition can cross the entire narrow mobile
      // stage. Keep the already-safe reveal band until departure completes;
      // PARKED computes a fresh centre band after the card reaches its author.
      const announcementRect = phaseRects.announcement!;
      const stationaryObstacles = [
        ...input.obstacles.filter(({ id }) => id !== "primary-card-move-path"),
        { id: "public-activity", rect: moveActivityRect },
      ];
      if (announcementRect.left < safeBounds.left || announcementRect.right > safeBounds.right
        || announcementRect.top < safeBounds.top || announcementRect.bottom > safeBounds.bottom
        || moveActivityRect.left < safeBounds.left || moveActivityRect.right > safeBounds.right
        || moveActivityRect.top < safeBounds.top
        || input.activityBottom !== undefined && Math.abs(moveActivityRect.bottom - safeBounds.bottom) > 2
        || input.obstacles.filter(({ id }) => id !== "primary-card-move-path")
          .some(({ rect }) => overlaps(moveActivityRect, rect))
        || stationaryObstacles.some(({ rect }) => overlaps(announcementRect, rect))) {
        return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
      }
      return {
        status: "placed",
        layout: {
          identity,
          variant: "move",
          generation: input.scene.generation,
          scene: input.scene,
          safeBounds,
          protectedRects: stationaryObstacles.map(({ id, rect }) => ({ id, rect: { ...rect } })),
          announcement: { ...announcementRect },
          card: { ...phaseRects.card },
          activity: { ...moveActivityRect },
        },
      };
    }
    const centerX = (safeBounds.left + safeBounds.right) / 2;
    const centerY = (Math.max(viewport.top, table.top) + Math.min(viewport.bottom, table.bottom)) / 2;
    // The parked miniature is a soft layer: the centred public status may
    // cover it, while actual Seats, controls and timers remain protected.
    const activityObstacles = input.obstacles;
    const activityFits = (rect: PublicStageRect) => rect.left >= safeBounds.left && rect.right <= safeBounds.right
      && rect.top >= safeBounds.top && rect.bottom <= safeBounds.bottom
      && !activityObstacles.some((obstacle) => overlaps(rect, obstacle.rect));
    let activityRect = input.activityBottom === undefined
      ? makeRect(centerX, phaseRects.activity.top, activity)
      : anchoredActivity;
    if (!activityFits(activityRect)) {
      if (input.activityBottom !== undefined) {
        return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
      }
      // A newly mounted PAC can have a measurable but unpositioned (0, 0)
      // rectangle. Never publish that rectangle as a safe parked layout.
      const minCenter = safeBounds.left + activity.width / 2;
      const maxCenter = safeBounds.right - activity.width / 2;
      const maxTop = safeBounds.bottom - activity.height;
      if (maxCenter < minCenter || maxTop < safeBounds.top) {
        return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
      }
      const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
      const tops = new Set([maxTop]);
      for (const { rect } of activityObstacles) {
        tops.add(clamp(rect.top - 2 - activity.height, safeBounds.top, maxTop));
        tops.add(clamp(rect.bottom + 2, safeBounds.top, maxTop));
      }
      const safeActivity = [...tops].sort((left, right) => right - left)
        .map((top) => makeRect(centerX, top, activity)).find(activityFits);
      if (!safeActivity) return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
      activityRect = safeActivity;
    }
    const obstacles = [
      ...input.obstacles,
      { id: "primary-card", rect: phaseRects.card },
      { id: "public-activity", rect: activityRect },
    ];
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const minCenterX = safeBounds.left + announcement.width / 2;
    const maxCenterX = safeBounds.right - announcement.width / 2;
    const minTop = safeBounds.top;
    const maxTop = safeBounds.bottom - announcement.height;
    if (maxCenterX < minCenterX || maxTop < minTop) {
      return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
    }
    const centers = new Set([clamp(centerX, minCenterX, maxCenterX)]);
    const tops = new Set([clamp(centerY - announcement.height / 2, minTop, maxTop)]);
    for (const { rect } of obstacles) {
      centers.add(clamp(rect.left - gap - announcement.width / 2, minCenterX, maxCenterX));
      centers.add(clamp(rect.right + gap + announcement.width / 2, minCenterX, maxCenterX));
      tops.add(clamp(rect.top - gap - announcement.height, minTop, maxTop));
      tops.add(clamp(rect.bottom + gap, minTop, maxTop));
    }
    const candidates = [...centers].flatMap((candidateX) => [...tops].map((candidateTop) => ({
      centerX: candidateX,
      top: candidateTop,
      distance: Math.abs(candidateX - centerX) + Math.abs(candidateTop + announcement.height / 2 - centerY),
    }))).sort((left, right) => left.distance - right.distance || left.top - right.top || left.centerX - right.centerX);
    for (const candidate of candidates) {
      const announcementRect = makeRect(candidate.centerX, candidate.top, announcement);
      if (announcementRect.left < safeBounds.left || announcementRect.right > safeBounds.right
        || announcementRect.top < safeBounds.top || announcementRect.bottom > safeBounds.bottom
        || obstacles.some(({ rect }) => overlaps(announcementRect, rect))) continue;
      return {
        status: "placed",
        layout: {
          identity,
          variant: "parked",
          generation: input.scene.generation,
          scene: input.scene,
          safeBounds,
          protectedRects: obstacles.map(({ id, rect }) => ({ id, rect: { ...rect } })),
          announcement: announcementRect,
          card: { ...phaseRects.card },
          activity: { ...activityRect },
        },
      };
    }
    return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
  }

  // REVEAL requires the canonical fixed-band target above; there is no
  // collision-search or alternate-layout fallback for passive presentation.
  return { status: "unavailable", identity, reason: "INVALID_GEOMETRY" };
}
