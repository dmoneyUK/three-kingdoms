export type PublicAnnouncementCandidate<T> = {
  value: T;
  rootEventId: string;
  checkpointEventId: string;
  priority: number;
  active?: boolean;
  supersedeOnNewerPublicPlay?: boolean;
};

export type CanonicalPublicDiscardOwnerCandidate<T> = {
  /** The exact server-committed discard event, not its parent play or later result. */
  eventId: string;
  /** Ordered physical material identity from the normalized public settlement. */
  orderedPhysicalCardIds: readonly string[];
  owner: T;
};

/**
 * Select one already proof-normalized discard presentation owner at its exact
 * committed event cursor. Ambiguous or malformed ownership fails closed.
 */
export function selectCanonicalPublicDiscardOwner<T>(
  cursorEventId: string | null | undefined,
  candidates: readonly (CanonicalPublicDiscardOwnerCandidate<T> | null | undefined)[],
): T | null {
  if (!cursorEventId) return null;
  const due = candidates.filter((candidate): candidate is CanonicalPublicDiscardOwnerCandidate<T> => candidate !== null
    && candidate !== undefined && candidate.eventId === cursorEventId
    && candidate.orderedPhysicalCardIds.length > 0
    && candidate.orderedPhysicalCardIds.every((id) => typeof id === "string" && id.trim().length > 0)
    && new Set(candidate.orderedPhysicalCardIds).size === candidate.orderedPhysicalCardIds.length);
  return due.length === 1 ? due[0].owner : null;
}

/**
 * Selects a committed card presentation at the active event cursor, then
 * falls back to timeline-ranked non-discard public announcement candidates.
 * Canonical discard ownership is resolved separately from a verified event
 * plus ordered material descriptor and can never re-enter this fallback.
 */
export function selectPublicCardActionForCursor<T extends { rootEventId: string }>(input: {
  cursorEvent?: { id: string } | null;
  canonicalDiscardOwner?: T | null;
  nonHeroAction?: T | null;
  latestHeroAction?: T | null;
  checkpointEventId: (action: T) => string;
  timelineEventIds: readonly string[];
  laterPublicPlayEventIds?: readonly string[];
}): { cursorOwnedAction: T | null; latestAction: T | null } {
  if (input.canonicalDiscardOwner) {
    return { cursorOwnedAction: input.canonicalDiscardOwner, latestAction: input.canonicalDiscardOwner };
  }

  const candidates: PublicAnnouncementCandidate<T>[] = [];
  if (input.nonHeroAction) candidates.push({
    value: input.nonHeroAction,
    rootEventId: input.nonHeroAction.rootEventId,
    checkpointEventId: input.checkpointEventId(input.nonHeroAction),
    priority: 2,
  });
  if (input.latestHeroAction) candidates.push({
    value: input.latestHeroAction,
    rootEventId: input.latestHeroAction.rootEventId,
    checkpointEventId: input.checkpointEventId(input.latestHeroAction),
    priority: 1,
    supersedeOnNewerPublicPlay: true,
  });

  return {
    cursorOwnedAction: null,
    latestAction: selectPublicAnnouncementCandidate(candidates, input.timelineEventIds, input.laterPublicPlayEventIds),
  };
}

/**
 * Select one already proof-built public announcement candidate. Both its
 * physical root and semantic checkpoint must occur exactly once in the
 * committed timeline. Newer checkpoints win; priority only resolves ties.
 */
export function selectPublicAnnouncementCandidate<T>(
  candidates: readonly PublicAnnouncementCandidate<T>[],
  timelineEventIds: readonly string[],
  publicPlayEventIds: readonly string[] = [],
): T | null {
  const indexesByEventId = new Map<string, number[]>();
  timelineEventIds.forEach((eventId, index) => {
    const indexes = indexesByEventId.get(eventId) ?? [];
    indexes.push(index);
    indexesByEventId.set(eventId, indexes);
  });

  const uniqueIndex = (eventId: string) => {
    const indexes = indexesByEventId.get(eventId);
    return indexes?.length === 1 ? indexes[0] : null;
  };

  const eligible = candidates.flatMap((candidate) => {
    if (candidate.active === false || !candidate.rootEventId || !candidate.checkpointEventId) return [];
    const rootIndex = uniqueIndex(candidate.rootEventId);
    const checkpointIndex = uniqueIndex(candidate.checkpointEventId);
    if (rootIndex === null || checkpointIndex === null || checkpointIndex < rootIndex) return [];

    if (candidate.supersedeOnNewerPublicPlay && publicPlayEventIds.some((eventId) => {
      const playIndex = uniqueIndex(eventId);
      return playIndex !== null && playIndex > checkpointIndex;
    })) return [];

    return [{ candidate, rootIndex, checkpointIndex }];
  });

  eligible.sort((left, right) => right.checkpointIndex - left.checkpointIndex
    || right.candidate.priority - left.candidate.priority
    || right.rootIndex - left.rootIndex);
  return eligible[0]?.candidate.value ?? null;
}

export function publicAnnouncementEventCopyKey(input: {
  roomCode: string;
  rootEventId: string;
  checkpointEventId: string;
  proofEventId: string;
  actorId: string;
  actionClass: string;
  presentationRevision?: number | string;
  presentationStage?: string | null;
  serverRevision?: number | string | null;
  semanticOwner?: string | null;
  interactionId?: string | null;
  rootFrameId?: string | null;
  authoritativeCheckpointId?: string | null;
  latestPublicEventId?: string | null;
}): string {
  if ([input.roomCode, input.rootEventId, input.checkpointEventId, input.proofEventId, input.actorId, input.actionClass]
    .some((value) => !value.trim())) return "";
  return JSON.stringify([
    input.roomCode,
    input.rootEventId,
    input.checkpointEventId,
    input.proofEventId,
    input.actorId,
    input.actionClass,
    input.presentationRevision ?? "",
    input.presentationStage ?? "",
    input.serverRevision ?? "",
    input.semanticOwner ?? "",
    input.interactionId ?? "",
    input.rootFrameId ?? "",
    input.authoritativeCheckpointId ?? "",
    input.latestPublicEventId ?? "",
  ]);
}

export function publicAnnouncementGeometryKey(roomCode: string, viewerId: string): string {
  return JSON.stringify([roomCode, viewerId]);
}

export type PublicAnnouncementRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type PublicAnnouncementSeatGeometry = {
  anchorId: string;
  rect: PublicAnnouncementRect;
};

export type PublicAnnouncementProtectedGeometry = {
  kind: string;
  identity: string;
  rect: PublicAnnouncementRect;
};

/**
 * Identifies the current viewer's measured layout, not just its viewer ID.
 * Equivalent measurements are stable; a viewport, table, seat, anchor, or
 * protected-obstacle change invalidates any cached announcement placement.
 */
export function publicAnnouncementGeometryIdentity(input: {
  viewerKey: string;
  layoutRevision: string;
  viewport: PublicAnnouncementRect;
  table: PublicAnnouncementRect;
  seats: readonly PublicAnnouncementSeatGeometry[];
  anchor: PublicAnnouncementRect | null;
  protectedRects: readonly PublicAnnouncementProtectedGeometry[];
}): string {
  if (!input.viewerKey.trim()) return "";
  const rectKey = (rect: PublicAnnouncementRect | null) => rect
    ? [rect.left, rect.top, rect.right, rect.bottom]
    : null;
  const seats = [...input.seats]
    .sort((left, right) => left.anchorId.localeCompare(right.anchorId)
      || JSON.stringify(rectKey(left.rect)).localeCompare(JSON.stringify(rectKey(right.rect))))
    .map(({ anchorId, rect }) => [anchorId, rectKey(rect)]);
  const protectedRects = [...input.protectedRects]
    .sort((left, right) => left.kind.localeCompare(right.kind)
      || left.identity.localeCompare(right.identity)
      || JSON.stringify(rectKey(left.rect)).localeCompare(JSON.stringify(rectKey(right.rect))))
    .map(({ kind, identity, rect }) => [kind, identity, rectKey(rect)]);
  return JSON.stringify({
    viewerKey: input.viewerKey,
    layoutRevision: input.layoutRevision,
    viewport: rectKey(input.viewport),
    table: rectKey(input.table),
    seats,
    anchor: rectKey(input.anchor),
    protectedRects,
  });
}

export function canClearPublicJourneyOwnership(current: {
  roomCode: string;
  viewerId: string;
  actionKey: string;
  scopeGeneration: string;
}, cleanup: {
  roomCode: string;
  viewerId: string;
  actionKey: string;
  scopeGeneration: string;
}): boolean {
  return current.roomCode === cleanup.roomCode
    && current.viewerId === cleanup.viewerId
    && current.actionKey === cleanup.actionKey
    && current.scopeGeneration === cleanup.scopeGeneration;
}

export type PublicAnnouncementCopyStage = "UNSEEN" | "ACTIVE" | "READING" | "RETIRED";

export type PublicAnnouncementCopyLifecycle = {
  eventCopyKey: string;
  stage: PublicAnnouncementCopyStage;
};

/** Advances only from proof-backed copy changes; READING cannot regress to ACTIVE. */
export function transitionPublicAnnouncementCopyLifecycle(
  previous: PublicAnnouncementCopyLifecycle,
  next: { eventCopyKey: string; stage: "ACTIVE" | "READING" } | null,
): PublicAnnouncementCopyLifecycle {
  if (!next) {
    return previous.eventCopyKey ? { ...previous, stage: "RETIRED" } : previous;
  }
  if (!next.eventCopyKey) return previous;
  if (previous.eventCopyKey !== next.eventCopyKey || previous.stage === "UNSEEN" || previous.stage === "RETIRED") {
    return { eventCopyKey: next.eventCopyKey, stage: next.stage };
  }
  if (previous.stage === "READING" && next.stage === "ACTIVE") return previous;
  return { eventCopyKey: next.eventCopyKey, stage: next.stage };
}
