export type PublicStageRect = { left: number; top: number; right: number; bottom: number };
export type PublicStageSize = { width: number; height: number };
export type PublicStagePhase = "REVEAL" | "MOVE" | "PARKED";
export type PublicStageStationarySurface = "card" | "effect-frame";

export const PUBLIC_STAGE_CARD_BAND_CLEARANCE_PX = 8;
export const PUBLIC_STAGE_EFFECT_FRAME_BAND_CLEARANCE_PX = 5;

export function publicStageBandClearance(surface: PublicStageStationarySurface = "card") {
  return surface === "effect-frame"
    ? PUBLIC_STAGE_EFFECT_FRAME_BAND_CLEARANCE_PX
    : PUBLIC_STAGE_CARD_BAND_CLEARANCE_PX;
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
  compactAnnouncement?: PublicStageSize;
  obstacles: readonly { id: string; rect: PublicStageRect }[];
  /** Exact proof for the owner-approved Harvest root-under-same-pool overlap. */
  harvestRootPoolOverlap?: {
    semantics: "PROVEN";
    scopeId: string;
    rootEventId: string;
    interactionId: string;
    eventId: string;
    cardId: string;
    poolRootEventId: string;
    phase: "REVEAL" | "MOVE";
  };
  phaseRects?: { card: PublicStageRect; activity: PublicStageRect; announcement?: PublicStageRect };
  upperH4?: { top: number; reservedHeight: number; gap: number };
  /** Permanent message-free H4/PAC reservations used for stationary reveals. */
  fixedBands?: { h4: PublicStageRect; pac: PublicStageRect };
  /** Set only when the primary visual is a validated, complete public Effect Frame. */
  stationarySurface?: PublicStageStationarySurface;
  announcementCardGap?: number;
  cardActivityGap?: number;
};

export type PublicStageLayout = {
  identity: string;
  variant: "stack" | "compact-split" | "fixed-bands" | "move" | "parked";
  generation: number;
  scene: PublicStageScene;
  safeBounds: PublicStageRect;
  protectedRects: readonly { id: string; rect: PublicStageRect }[];
  announcement: PublicStageRect;
  card: PublicStageRect;
  activity: PublicStageRect;
  cardActivityGap: number;
};

export type PublicStageLayoutResult =
  | { status: "placed"; layout: PublicStageLayout }
  | { status: "unavailable"; identity: string | null; reason: "UNPROVEN_SCENE" | "INVALID_GEOMETRY" | "NO_SAFE_STACK" | "NO_SAFE_STAGE_BAND" };

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
}): boolean {
  return input.phase === "REVEAL"
    && !input.layoutPending
    && input.safePainted
    && Boolean(input.viewerId.trim())
    && input.parkingTargetViewerId === input.viewerId
    && finiteSize(input.parkingTarget ?? { width: 0, height: 0 });
}

/**
 * Finds the shared collision-free placement for one proven public-card phase.
 * REVEAL uses H4 → full CardFace → PAC. MOVE/PARKED preserve the measured card
 * and PAC positions and reflow only H4 around their actual protected bounds.
 * Card/effect names never affect placement; unavailable means no fit is claimed.
 */
export function calculatePublicStageLayout(input: PublicStageLayoutInput): PublicStageLayoutResult {
  const identity = publicStageSceneIdentity(input.scene);
  if (!identity) return { status: "unavailable", identity: null, reason: "UNPROVEN_SCENE" };

  const { viewport, table, card, announcement, activity } = input;
  const announcementCardGap = input.announcementCardGap ?? 8;
  // One extra CSS pixel absorbs subpixel offsets in CardFace/Frame rendering,
  // so the measured browser gap still meets the approved 8px minimum.
  const cardActivityGap = input.cardActivityGap ?? 9;
  if (!finiteRect(viewport) || !finiteRect(table)
    || !finiteSize(card) || !finiteSize(announcement) || !finiteSize(activity)
    || input.activityBottom !== undefined && !Number.isFinite(input.activityBottom)
    || !Number.isFinite(input.preferredCard.left) || !Number.isFinite(input.preferredCard.top)
    || !Number.isFinite(announcementCardGap) || announcementCardGap < 0
    || !Number.isFinite(cardActivityGap) || cardActivityGap < 8
    || !Array.isArray(input.obstacles)
    || input.obstacles.some((obstacle) => !obstacle || typeof obstacle.id !== "string"
      || !obstacle.id.trim() || !finiteRect(obstacle.rect))) {
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
  const rootPoolProof = input.harvestRootPoolOverlap;
  const mayCoverHarvestPool = Boolean(rootPoolProof?.semantics === "PROVEN"
    && (input.scene.phase === "REVEAL" || input.scene.phase === "MOVE")
    && rootPoolProof.phase === input.scene.phase
    && rootPoolProof.scopeId === input.scene.scopeId
    && rootPoolProof.rootEventId === input.scene.scopeId
    && rootPoolProof.poolRootEventId === input.scene.scopeId
    && rootPoolProof.eventId === input.scene.eventId
    && rootPoolProof.eventId === rootPoolProof.rootEventId
    && rootPoolProof.cardId === input.scene.cardId
    && Boolean(input.scene.interactionId)
    && rootPoolProof.interactionId === input.scene.interactionId);
  const cardObstacles = input.obstacles.filter(({ id }) => !(mayCoverHarvestPool && id === "harvest-choice-panel"));
  const safeBounds: PublicStageRect = {
    left: Math.max(viewport.left, table.left) + 8,
    top: Math.max(viewport.top, table.top) + 8,
    right: Math.min(viewport.right, table.right) - 8,
    // The PAC may use the measured gap below the battlefield border so its
    // lower edge can meet the Console guidance border exactly.
    bottom: activityBottom,
  };
  if (safeBounds.right <= safeBounds.left || safeBounds.bottom <= safeBounds.top) {
    return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
  }
  const anchoredActivity = makeRect(
    (safeBounds.left + safeBounds.right) / 2,
    safeBounds.bottom - activity.height,
    activity,
  );
  if (input.scene.phase === "REVEAL" && input.fixedBands) {
    const { h4, pac } = input.fixedBands;
    const bandClearance = publicStageBandClearance(input.stationarySurface);
    if (!finiteRect(h4) || !finiteRect(pac) || h4.left < safeBounds.left || h4.right > safeBounds.right
      || pac.left < safeBounds.left || pac.right > safeBounds.right
      || pac.bottom > activityBottom + 2 || pac.bottom < activityBottom - 2
      || h4.bottom >= pac.top) {
      return { status: "unavailable", identity, reason: "INVALID_GEOMETRY" };
    }
    const centerX = (safeBounds.left + safeBounds.right) / 2;
    const announcementRect = makeRect(centerX, h4.top, announcement);
    const activityRect = makeRect(centerX, activityBottom - activity.height, activity);
    const laneTop = Math.max(safeBounds.top, h4.bottom + bandClearance);
    const laneBottom = Math.min(safeBounds.bottom, pac.top - bandClearance);
    const minLeft = safeBounds.left;
    const maxLeft = safeBounds.right - card.width;
    const maxTop = laneBottom - card.height;
    if (maxLeft < minLeft || maxTop < laneTop
      || announcementRect.left < safeBounds.left || announcementRect.right > safeBounds.right
      || announcement.height > h4.bottom - h4.top
      || activityRect.top < pac.top || activityRect.bottom > pac.bottom + 2) {
      return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
    }
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const preferredLeft = clamp(centerX - card.width / 2, minLeft, maxLeft);
    const preferredTop = laneTop + (laneBottom - laneTop - card.height) / 2;
    const lefts = new Set([preferredLeft]);
    const tops = new Set([preferredTop]);
    for (const { rect } of cardObstacles) {
      lefts.add(clamp(rect.left - card.width - 8, minLeft, maxLeft));
      lefts.add(clamp(rect.right + 8, minLeft, maxLeft));
      tops.add(clamp(rect.top - card.height - 8, laneTop, maxTop));
      tops.add(clamp(rect.bottom + 8, laneTop, maxTop));
    }
    const candidates = [...lefts].flatMap((left) => [...tops].map((top) => ({
      left, top, right: left + card.width, bottom: top + card.height,
      distance: Math.abs(left - preferredLeft) + Math.abs(top - preferredTop),
    }))).sort((left, right) => left.distance - right.distance || left.top - right.top || left.left - right.left);
    const cardRect = candidates.find((candidate) => candidate.left >= minLeft && candidate.right <= safeBounds.right
      && candidate.top >= laneTop && candidate.bottom <= laneBottom
      && !cardObstacles.some((obstacle) => overlaps(candidate, obstacle.rect)));
    if (!cardRect) return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
    return { status: "placed", layout: { identity, variant: "fixed-bands", generation: input.scene.generation,
      scene: input.scene, safeBounds,
      protectedRects: input.obstacles.map(({ id, rect }) => ({ id, rect: { ...rect } })),
      announcement: announcementRect, card: { left: cardRect.left, top: cardRect.top, right: cardRect.right, bottom: cardRect.bottom },
      activity: activityRect, cardActivityGap: activityRect.top - cardRect.bottom } };
  }
  if (input.upperH4) {
    const { top, reservedHeight, gap } = input.upperH4;
    const effectFrameClearance = input.stationarySurface === "effect-frame"
      ? publicStageBandClearance(input.stationarySurface)
      : null;
    if (![top, reservedHeight, gap].every(Number.isFinite) || reservedHeight < announcement.height || gap < 0) {
      return { status: "unavailable", identity, reason: "INVALID_GEOMETRY" };
    }
    const centerX = (safeBounds.left + safeBounds.right) / 2;
    const h4 = makeRect(centerX, top, announcement);
    const activityRect = input.scene.phase === "REVEAL" || input.activityBottom !== undefined ? anchoredActivity : input.phaseRects!.activity;
    const cardRect = input.scene.phase === "REVEAL"
      ? makeRect(centerX, top + reservedHeight + (effectFrameClearance ?? gap), card)
      : input.phaseRects!.card;
    const stageRects = input.scene.phase === "REVEAL" ? [h4, cardRect, activityRect] : [h4, activityRect];
    if (stageRects.some((rect, index) => rect.left < safeBounds.left || rect.right > safeBounds.right || rect.top < safeBounds.top || rect.bottom > safeBounds.bottom
      || (input.scene.phase === "REVEAL" && index === 1 ? cardObstacles : input.obstacles).some((obstacle) => overlaps(rect, obstacle.rect)))
      || overlaps(h4, activityRect) || input.scene.phase === "REVEAL" && (overlaps(h4, cardRect)
        || cardRect.bottom + (effectFrameClearance ?? cardActivityGap) > activityRect.top)) {
      return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
    }
    return { status: "placed", layout: { identity, variant: input.scene.phase === "REVEAL" ? "stack" : input.scene.phase === "MOVE" ? "move" : "parked", generation: input.scene.generation, scene: input.scene, safeBounds,
      protectedRects: input.obstacles.map(({ id, rect }) => ({ id, rect: { ...rect } })), announcement: h4, card: { ...cardRect }, activity: { ...activityRect }, cardActivityGap: activityRect.top - cardRect.bottom } };
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
          cardActivityGap: phaseRects.activity.top - phaseRects.card.bottom,
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
          cardActivityGap: activityRect.top - phaseRects.card.bottom,
        },
      };
    }
    return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
  }

  const stackWidth = Math.max(card.width, announcement.width, activity.width);
  const minCenterX = safeBounds.left + stackWidth / 2;
  const maxCenterX = safeBounds.right - stackWidth / 2;
  const minCardTop = safeBounds.top + announcement.height + announcementCardGap;
  const activityRect = anchoredActivity;
  const maxCardTop = activityRect.top - card.height - cardActivityGap;
  const stackPossible = maxCenterX >= minCenterX && maxCardTop >= minCardTop;

  const preferredCenterX = input.preferredCard.left + card.width / 2;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const centers = new Set<number>([
    clamp(preferredCenterX, minCenterX, maxCenterX),
    minCenterX,
    maxCenterX,
  ]);
  const tops = new Set<number>([maxCardTop]);
  for (const obstacle of cardObstacles) {
    centers.add(clamp(obstacle.rect.left - stackWidth / 2, minCenterX, maxCenterX));
    centers.add(clamp(obstacle.rect.right + stackWidth / 2, minCenterX, maxCenterX));
    // Keep H4 and the genuine card together above or below each blocker; PAC
    // stays on its independent, measured Console seam.
    tops.add(clamp(obstacle.rect.top - card.height, minCardTop, maxCardTop));
    tops.add(clamp(obstacle.rect.bottom + announcementCardGap + announcement.height, minCardTop, maxCardTop));
  }

  const candidates = [...centers].flatMap((centerX) => [...tops].map((cardTop) => ({
    centerX,
    cardTop,
    distance: Math.abs(centerX - preferredCenterX) + Math.abs(cardTop - maxCardTop),
  }))).sort((left, right) => left.distance - right.distance
    || left.cardTop - right.cardTop || left.centerX - right.centerX);

  for (const candidate of stackPossible ? candidates : []) {
    const cardRect = makeRect(candidate.centerX, candidate.cardTop, card);
    const announcementRect = makeRect(candidate.centerX, cardRect.top - announcementCardGap - announcement.height, announcement);
    const stackRects = [announcementRect, cardRect, activityRect];
    if (stackRects.some((rect) => rect.left < safeBounds.left || rect.right > safeBounds.right
      || rect.top < safeBounds.top || rect.bottom > safeBounds.bottom)) continue;
    if (stackRects.some((rect, index) => (index === 1 ? cardObstacles : input.obstacles)
      .some((obstacle) => overlaps(rect, obstacle.rect)))) continue;
    return {
      status: "placed",
      layout: {
        identity,
        variant: "stack",
        generation: input.scene.generation,
        scene: input.scene,
        safeBounds,
        protectedRects: input.obstacles.map(({ id, rect }) => ({ id, rect: { ...rect } })),
        announcement: announcementRect,
        card: cardRect,
        activity: activityRect,
        cardActivityGap: activityRect.top - cardRect.bottom,
      },
    };
  }

  // When the full stack cannot fit, place the full card and a measured,
  // wrapped H4 side by side; the PAC remains centred underneath both.
  const compact = input.compactAnnouncement;
  if (compact && finiteSize(compact)) {
    const center = (safeBounds.left + safeBounds.right) / 2;
    const gap = Math.max(8, announcementCardGap);
    const rowWidth = card.width + gap + compact.width;
    const rowHeight = Math.max(card.height, compact.height);
    // Reserve a six-pixel edge on short stages; the measured Dock remains a
    // hard obstacle and the full card-to-PAC gap remains at least eight.
    const compactBounds = { ...safeBounds, bottom: safeBounds.bottom + 2 };
    const compactActivityGap = Math.max(8, cardActivityGap - 1);
    const rowLeft = center - rowWidth / 2;
    const minTop = safeBounds.top;
    const maxTop = activityRect.top - rowHeight - compactActivityGap;
    if (rowLeft >= safeBounds.left && rowLeft + rowWidth <= safeBounds.right
      && activity.width <= safeBounds.right - safeBounds.left && maxTop >= minTop) {
      const rowTops = new Set([maxTop]);
      for (const { rect } of input.obstacles) {
        rowTops.add(clamp(rect.bottom + gap, minTop, maxTop));
        rowTops.add(clamp(rect.top - gap - rowHeight - compactActivityGap - activity.height, minTop, maxTop));
      }
      for (const top of [...rowTops].sort((a, b) => b - a)) {
        for (const cardOnLeft of [true, false]) {
          const cardLeft = rowLeft + (cardOnLeft ? 0 : compact.width + gap);
          const announcementLeft = rowLeft + (cardOnLeft ? card.width + gap : 0);
          const cardRect = makeRect(cardLeft + card.width / 2, top, card);
          const announcementRect = makeRect(announcementLeft + compact.width / 2, top, compact);
          if (cardObstacles.some((obstacle) => overlaps(cardRect, obstacle.rect))
            || [announcementRect, activityRect].some((rect) =>
              input.obstacles.some((obstacle) => overlaps(rect, obstacle.rect)))) continue;
          return { status: "placed", layout: {
            identity, variant: "compact-split", generation: input.scene.generation,
            scene: input.scene, safeBounds: compactBounds,
            protectedRects: input.obstacles.map(({ id, rect }) => ({ id, rect: { ...rect } })),
            announcement: announcementRect, card: cardRect, activity: activityRect,
            cardActivityGap: activityRect.top - cardRect.bottom,
          } };
        }
      }
    }
  }
  return { status: "unavailable", identity, reason: "NO_SAFE_STACK" };
}
