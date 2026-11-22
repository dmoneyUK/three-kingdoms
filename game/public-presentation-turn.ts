export type PublicPresentationTurnScope = {
  epoch: number;
  startPublicSequence: number | null;
  retireAll?: boolean;
};

export type PublicPresentationTurnEvent = {
  presentation?: boolean;
  privateToPlayerId?: string;
  publicSequence?: number;
};

export type PublicPresentationTurnViewer = {
  roomCode: string;
  viewerId: string;
  scope: PublicPresentationTurnScope;
};

/**
 * Keep the complete server timeline intact while limiting ephemeral public
 * presentation to events committed after the authoritative current-turn
 * boundary. Private/non-presentational records retain their existing rules.
 */
export function publicPresentationTimelineForTurn<T extends PublicPresentationTurnEvent>(
  events: readonly T[],
  scope: PublicPresentationTurnScope,
): T[] {
  const keepNonPublicPresentation = (event: T) => event.presentation === false || typeof event.privateToPlayerId === "string";
  if (!Number.isSafeInteger(scope.epoch) || scope.epoch < 0) return events.filter(keepNonPublicPresentation);
  if (scope.epoch === 0 && !scope.retireAll) return [...events];

  return events.filter((event) => {
    if (keepNonPublicPresentation(event)) return true;
    if (scope.retireAll) return false;
    return Number.isSafeInteger(scope.startPublicSequence)
      && Number.isSafeInteger(event.publicSequence)
      && (event.publicSequence as number) > (scope.startPublicSequence as number);
  });
}

/** Reject delayed room reads that would roll one viewer back to an older turn. */
export function shouldAcceptPublicPresentationTurn(
  current: PublicPresentationTurnViewer | null,
  incoming: PublicPresentationTurnViewer,
): boolean {
  if (!incoming.roomCode || !incoming.viewerId || !Number.isSafeInteger(incoming.scope.epoch)
    || incoming.scope.epoch < 0) return false;
  if (!current || current.roomCode !== incoming.roomCode || current.viewerId !== incoming.viewerId) return true;
  if (!Number.isSafeInteger(current.scope.epoch) || incoming.scope.epoch < current.scope.epoch) return false;
  if (incoming.scope.epoch > current.scope.epoch) return true;
  if (current.scope.retireAll && !incoming.scope.retireAll) return false;

  const currentSequence = current.scope.startPublicSequence;
  const incomingSequence = incoming.scope.startPublicSequence;
  if (Number.isSafeInteger(currentSequence) && !Number.isSafeInteger(incomingSequence)) return false;
  return !Number.isSafeInteger(currentSequence) || !Number.isSafeInteger(incomingSequence)
    || (incomingSequence as number) >= (currentSequence as number);
}
