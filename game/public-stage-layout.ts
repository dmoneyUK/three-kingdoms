export type PublicStageRect = { left: number; top: number; right: number; bottom: number };
export type PublicStageSize = { width: number; height: number };
export type PublicStagePhase = "REVEAL" | "MOVE" | "PARKED";

/** A layout identity is valid only when every field comes from proven public state. */
export type PublicStageScene = {
  semantics: "PROVEN";
  roomId: string;
  interactionId: string;
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
  announcementCardGap?: number;
  cardActivityGap?: number;
};

export type PublicStageLayout = {
  identity: string;
  generation: number;
  scene: PublicStageScene;
  safeBounds: PublicStageRect;
  announcement: PublicStageRect;
  card: PublicStageRect;
  activity: PublicStageRect;
  cardActivityGap: number;
};

export type PublicStageLayoutResult =
  | { status: "placed"; layout: PublicStageLayout }
  | { status: "unavailable"; identity: string | null; reason: "UNPROVEN_SCENE" | "INVALID_GEOMETRY" | "PHASE_NOT_REVEAL" | "NO_SAFE_STACK" };

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
    || [scene.roomId, scene.interactionId, scene.eventId, scene.cardId, scene.viewerId]
      .some((value) => typeof value !== "string" || !value.trim())
    || !["REVEAL", "MOVE", "PARKED"].includes(scene.phase)
    || !Number.isInteger(scene.generation) || scene.generation < 0) return null;
  return JSON.stringify([
    scene.roomId,
    scene.interactionId,
    scene.eventId,
    scene.cardId,
    scene.viewerId,
    scene.phase,
    scene.generation,
  ]);
}

/**
 * Finds one nearest collision-free H4 → full CardFace → PAC stack for a real
 * REVEAL. All dimensions and obstacles are measured inputs; card/effect names
 * do not affect placement. An unavailable result means the caller must not
 * claim that this stack fits.
 */
export function calculatePublicStageLayout(input: PublicStageLayoutInput): PublicStageLayoutResult {
  const identity = publicStageSceneIdentity(input.scene);
  if (!identity) return { status: "unavailable", identity: null, reason: "UNPROVEN_SCENE" };
  if (input.scene.phase !== "REVEAL") return { status: "unavailable", identity, reason: "PHASE_NOT_REVEAL" };

  const { viewport, table, card, announcement, activity } = input;
  const announcementCardGap = input.announcementCardGap ?? 8;
  const cardActivityGap = input.cardActivityGap ?? 8;
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

  const safeBounds: PublicStageRect = {
    left: Math.max(viewport.left, table.left) + 8,
    top: Math.max(viewport.top, table.top) + 8,
    right: Math.min(viewport.right, table.right) - 8,
    bottom: Math.min(viewport.bottom, table.bottom) - 8,
  };
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
        announcement: announcementRect,
        card: cardRect,
        activity: activityRect,
        cardActivityGap: activityRect.top - cardRect.bottom,
      },
    };
  }

  return { status: "unavailable", identity, reason: "NO_SAFE_STACK" };
}
