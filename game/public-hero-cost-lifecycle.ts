export type PublicHeroCostAnnouncementLifecycle =
  | { status: "active"; eventIndex: number }
  | { status: "read"; eventIndex: number }
  | { status: "superseded"; eventIndex: number; supersedingEventId: string }
  | { status: "unavailable" };

/**
 * Select whether an already-proved public Hero cost may still own the active
 * announcement. Timeline IDs are immutable committed events; the caller must
 * validate the candidate's card/effect proof before calling this helper.
 */
export function publicHeroCostAnnouncementLifecycle(input: {
  roomCode: string;
  candidateRoomCode: string;
  candidateEventId: string;
  timelineEventIds: readonly string[];
  retiredEventIds: ReadonlySet<string>;
  currentRootEventId?: string | null;
}): PublicHeroCostAnnouncementLifecycle {
  if (!input.roomCode || input.roomCode !== input.candidateRoomCode || !input.candidateEventId) {
    return { status: "unavailable" };
  }
  const candidateIndexes = input.timelineEventIds.flatMap((eventId, index) =>
    eventId === input.candidateEventId ? [index] : []);
  if (candidateIndexes.length !== 1) return { status: "unavailable" };
  const eventIndex = candidateIndexes[0];
  const currentRootEventId = input.currentRootEventId;
  if (currentRootEventId && currentRootEventId !== input.candidateEventId) {
    const rootIndexes = input.timelineEventIds.flatMap((eventId, index) =>
      eventId === currentRootEventId ? [index] : []);
    if (rootIndexes.length !== 1) return { status: "unavailable" };
    if (rootIndexes[0] > eventIndex) {
      return { status: "superseded", eventIndex, supersedingEventId: currentRootEventId };
    }
  }

  if (input.retiredEventIds.has(input.candidateEventId)) return { status: "read", eventIndex };

  return { status: "active", eventIndex };
}
