export type EffectNoticeQueueEntry = {
  roomCode: string;
  viewerId: string;
  eventId: string;
  heading: string;
  message: string;
  exiting: boolean;
  beautyRootEventId?: string;
  beautySourceId?: string;
  beautyProofEventId?: string;
  beautyPhase?: "ACTIVATION" | "DRAWN";
};

/**
 * Keep a Beauty activation and its proven draw result in one queue slot.
 * The root event remains the stable notice identity while proofEventId tracks
 * the newest public proof, allowing the visible notice timer to restart on an
 * in-place upgrade without announcing a second queue item.
 */
export function mergeEffectNoticeQueue(
  current: readonly EffectNoticeQueueEntry[],
  incoming: readonly EffectNoticeQueueEntry[],
): EffectNoticeQueueEntry[] {
  const next = [...current];
  for (const candidate of incoming) {
    if (candidate.beautyRootEventId) {
      const existingIndex = next.findIndex((notice) => notice.roomCode === candidate.roomCode
        && notice.viewerId === candidate.viewerId
        && notice.beautyRootEventId === candidate.beautyRootEventId
        && notice.beautySourceId === candidate.beautySourceId);
      if (existingIndex >= 0) {
        const existing = next[existingIndex];
        if (existing.beautyPhase === "ACTIVATION" && candidate.beautyPhase === "DRAWN") {
          next[existingIndex] = {
            ...existing,
            heading: candidate.heading,
            message: candidate.message,
            beautyProofEventId: candidate.beautyProofEventId,
            beautyPhase: "DRAWN",
            exiting: false,
          };
        }
        continue;
      }
    }

    const alreadyQueued = next.some((notice) => notice.roomCode === candidate.roomCode
      && notice.viewerId === candidate.viewerId && notice.eventId === candidate.eventId);
    if (!alreadyQueued) next.push(candidate);
  }
  return next;
}
