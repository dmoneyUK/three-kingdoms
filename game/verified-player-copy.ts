/**
 * A message may highlight player names only when its producer already has the
 * authoritative player identity. Callers build these parts beside the
 * original copy; this module never searches prose for names.
 */
export type VerifiedPlayerCopySegment =
  | { kind: "text"; text: string }
  | { kind: "player"; playerId: string; text: string };

export type VerifiedPlayerCopyPart = string | { id: string; name: string };

export type VerifiedPlayerCopy = {
  message: string;
  segments: VerifiedPlayerCopySegment[];
};

export function verifiedPlayerCopy(parts: readonly VerifiedPlayerCopyPart[]): VerifiedPlayerCopy {
  const segments: VerifiedPlayerCopySegment[] = parts.map((part) => typeof part === "string"
    ? { kind: "text", text: part }
    : { kind: "player", playerId: part.id, text: part.name });
  return { message: segments.map((part) => part.text).join(""), segments };
}

export function matchingVerifiedPlayerCopySegments(
  message: string,
  segments?: readonly VerifiedPlayerCopySegment[],
): readonly VerifiedPlayerCopySegment[] | undefined {
  return segments?.length && segments.every((part) => typeof part.text === "string"
    && (part.kind === "text" || part.kind === "player" && typeof part.playerId === "string" && part.playerId.length > 0))
    && segments.map((part) => part.text).join("") === message ? segments : undefined;
}
