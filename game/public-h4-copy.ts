/** Structured narration is assembled by producers with already-proven IDs.
 * It is never reconstructed by searching arbitrary prose for player names. */
export type PublicH4Segment = { kind: "text"; text: string }
  | { kind: "player"; playerId: string; text: string };
export function publicH4Copy(parts: readonly (string | { id: string; name: string })[]) {
  const segments: PublicH4Segment[] = parts.map((part) => typeof part === "string"
    ? { kind: "text", text: part } : { kind: "player", playerId: part.id, text: part.name });
  return { message: segments.map((part) => part.text).join(""), segments };
}
export function matchingPublicH4Segments(message: string, segments?: readonly PublicH4Segment[]) {
  return segments?.length && segments.every((part) => typeof part.text === "string"
    && (part.kind === "text" || part.kind === "player" && part.playerId.length > 0))
    && segments.map((part) => part.text).join("") === message ? segments : undefined;
}
export function publicH4WidthLimit(viewportWidth: number, corridorWidth: number, safeWidth: number) {
  return Math.max(1, Math.min(corridorWidth, safeWidth,
    viewportWidth <= 520 ? 340 : 520, viewportWidth - (viewportWidth <= 520 ? 32 : 16)));
}
