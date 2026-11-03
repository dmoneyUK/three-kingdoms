export type PublicStageRect = { left: number; top: number; right: number; bottom: number };
export type PublicStageSize = { width: number; height: number };
export type PublicStagePhase = "REVEAL" | "MOVE" | "PARKED";

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
  obstacles: readonly { id: string; rect: PublicStageRect }[];
  phaseRects?: { card: PublicStageRect; activity: PublicStageRect; announcement?: PublicStageRect };
  announcementCardGap?: number;
  cardActivityGap?: number;
};

export type PublicStageLayout = {
  identity: string;
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

  const safeBounds: PublicStageRect = {
    left: Math.max(viewport.left, table.left) + 8,
    top: Math.max(viewport.top, table.top) + 8,
    right: Math.min(viewport.right, table.right) - 8,
    bottom: Math.min(viewport.bottom, table.bottom) - 8,
  };
  if (input.scene.phase !== "REVEAL") {
    const phaseRects = input.phaseRects!;
    const gap = Math.max(8, announcementCardGap);
    if (input.scene.phase === "MOVE") {
      // The 380ms physical-card transition can cross the entire narrow mobile
      // stage. Keep the already-safe reveal band until departure completes;
      // PARKED computes a fresh centre band after the card reaches its author.
      const announcementRect = phaseRects.announcement!;
      const stationaryObstacles = [
        ...input.obstacles.filter(({ id }) => id !== "primary-card-move-path"),
        { id: "public-activity", rect: phaseRects.activity },
      ];
      if (announcementRect.left < safeBounds.left || announcementRect.right > safeBounds.right
        || announcementRect.top < safeBounds.top || announcementRect.bottom > safeBounds.bottom
        || stationaryObstacles.some(({ rect }) => overlaps(announcementRect, rect))) {
        return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
      }
      return {
        status: "placed",
        layout: {
          identity,
          generation: input.scene.generation,
          scene: input.scene,
          safeBounds,
          protectedRects: stationaryObstacles.map(({ id, rect }) => ({ id, rect: { ...rect } })),
          announcement: { ...announcementRect },
          card: { ...phaseRects.card },
          activity: { ...phaseRects.activity },
          cardActivityGap: phaseRects.activity.top - phaseRects.card.bottom,
        },
      };
    }
    const centerX = (safeBounds.left + safeBounds.right) / 2;
    const centerY = (safeBounds.top + safeBounds.bottom) / 2;
    const activityObstacles = [...input.obstacles, { id: "primary-card", rect: phaseRects.card }];
    const activityFits = (rect: PublicStageRect) => rect.left >= safeBounds.left && rect.right <= safeBounds.right
      && rect.top >= safeBounds.top && rect.bottom <= safeBounds.bottom
      && !activityObstacles.some((obstacle) => overlaps(rect, obstacle.rect));
    let activityRect = phaseRects.activity;
    if (!activityFits(activityRect)) {
      // A newly mounted PAC can have a measurable but unpositioned (0, 0)
      // rectangle. Never publish that rectangle as a safe parked layout.
      const minCenter = safeBounds.left + activity.width / 2;
      const maxCenter = safeBounds.right - activity.width / 2;
      const maxTop = safeBounds.bottom - activity.height;
      if (maxCenter < minCenter || maxTop < safeBounds.top) {
        return { status: "unavailable", identity, reason: "NO_SAFE_STAGE_BAND" };
      }
      const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
      const centers = new Set([clamp(centerX, minCenter, maxCenter)]);
      const tops = new Set([maxTop]);
      for (const { rect } of activityObstacles) {
        centers.add(clamp(rect.left - 2 - activity.width / 2, minCenter, maxCenter));
        centers.add(clamp(rect.right + 2 + activity.width / 2, minCenter, maxCenter));
        tops.add(clamp(rect.top - 2 - activity.height, safeBounds.top, maxTop));
        tops.add(clamp(rect.bottom + 2, safeBounds.top, maxTop));
      }
      const candidates = [...tops].flatMap((top) => [...centers].map((candidateCenter) => ({ top, center: candidateCenter })))
        .sort((left, right) => right.top - left.top || Math.abs(left.center - centerX) - Math.abs(right.center - centerX));
      const safeActivity = candidates.map(({ center, top }) => makeRect(center, top, activity)).find(activityFits);
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
  const maxCardTop = safeBounds.bottom - card.height - cardActivityGap - activity.height;
  if (maxCenterX < minCenterX || maxCardTop < minCardTop) {
    return { status: "unavailable", identity, reason: "NO_SAFE_STACK" };
  }

  const preferredCenterX = input.preferredCard.left + card.width / 2;
  const preferredCardTop = input.preferredCard.top;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const centers = new Set<number>([
    clamp(preferredCenterX, minCenterX, maxCenterX),
    minCenterX,
    maxCenterX,
  ]);
  const tops = new Set<number>([
    clamp(preferredCardTop, minCardTop, maxCardTop),
    minCardTop,
    maxCardTop,
  ]);
  for (const obstacle of input.obstacles) {
    centers.add(clamp(obstacle.rect.left - stackWidth / 2, minCenterX, maxCenterX));
    centers.add(clamp(obstacle.rect.right + stackWidth / 2, minCenterX, maxCenterX));
    // Keep the complete stack above the obstacle: its lowest edge is the PAC.
    tops.add(clamp(
      obstacle.rect.top - announcementCardGap - card.height - cardActivityGap - activity.height,
      minCardTop,
      maxCardTop,
    ));
    // Keep the complete stack below the obstacle: its highest edge is H4.
    tops.add(clamp(obstacle.rect.bottom + announcementCardGap + announcement.height + announcementCardGap, minCardTop, maxCardTop));
  }

  const candidates = [...centers].flatMap((centerX) => [...tops].map((cardTop) => ({
    centerX,
    cardTop,
    distance: Math.abs(centerX - preferredCenterX) + Math.abs(cardTop - preferredCardTop),
  }))).sort((left, right) => left.distance - right.distance
    || left.cardTop - right.cardTop || left.centerX - right.centerX);

  for (const candidate of candidates) {
    const cardRect = makeRect(candidate.centerX, candidate.cardTop, card);
    const announcementRect = makeRect(candidate.centerX, cardRect.top - announcementCardGap - announcement.height, announcement);
    const activityRect = makeRect(candidate.centerX, cardRect.bottom + cardActivityGap, activity);
    const stackRects = [announcementRect, cardRect, activityRect];
    if (stackRects.some((rect) => rect.left < safeBounds.left || rect.right > safeBounds.right
      || rect.top < safeBounds.top || rect.bottom > safeBounds.bottom)) continue;
    if (stackRects.some((rect) => input.obstacles.some((obstacle) => overlaps(rect, obstacle.rect)))) continue;
    return {
      status: "placed",
      layout: {
        identity,
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

  return { status: "unavailable", identity, reason: "NO_SAFE_STACK" };
}
