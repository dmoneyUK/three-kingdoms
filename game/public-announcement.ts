export type PublicAnnouncementCandidate<T> = {
  value: T;
  rootEventId: string;
  checkpointEventId: string;
  priority: number;
  active?: boolean;
  supersedeOnNewerPublicPlay?: boolean;
};

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
  ]);
}

export function publicAnnouncementGeometryKey(roomCode: string, viewerId: string): string {
  return JSON.stringify([roomCode, viewerId]);
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
