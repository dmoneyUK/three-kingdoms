import {
  matchingVerifiedPlayerCopySegments,
  verifiedPlayerCopy,
  type VerifiedPlayerCopyPart,
  type VerifiedPlayerCopySegment,
} from "./verified-player-copy";

/** Backward-compatible H4 aliases for the shared verified-player copy type. */
export type PublicH4Segment = VerifiedPlayerCopySegment;
export function publicH4Copy(parts: readonly (string | { id: string; name: string })[]) {
  return verifiedPlayerCopy(parts satisfies readonly VerifiedPlayerCopyPart[]);
}
export function matchingPublicH4Segments(message: string, segments?: readonly PublicH4Segment[]) {
  return matchingVerifiedPlayerCopySegments(message, segments);
}
export function publicH4WidthLimit(viewportWidth: number, corridorWidth: number, safeWidth: number) {
  return Math.max(1, Math.min(corridorWidth, safeWidth,
    viewportWidth <= 520 ? 340 : 520, viewportWidth - (viewportWidth <= 520 ? 32 : 16)));
}
