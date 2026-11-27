import {
  matchingVerifiedPlayerCopySegments,
  verifiedPlayerCopy,
  type VerifiedPlayerCopyPart,
  type VerifiedPlayerCopySegment,
} from "./verified-player-copy";
import { CARD_DEFINITIONS } from "./cards";
import { CARD_KINDS, type CardKind, type CardRank, type CardSuit } from "./model";

/** Backward-compatible H4 aliases for the shared verified-player copy type. */
export type PublicH4Segment = VerifiedPlayerCopySegment;

const CARD_RANKS = new Set<CardRank>(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]);
const CARD_SUITS = new Set<CardSuit>(["♥", "♦", "♣", "♠"]);

/** A canonical H4 card-name token from an already typed card kind. */
export function publicH4CardKindReference(kind: CardKind): string {
  return `[${CARD_DEFINITIONS[kind].name}]`;
}

/** Shared preformatted kind tokens for large render functions and non-H4 callers. */
export const PUBLIC_H4_CARD_KIND_REFERENCES = Object.freeze(
  Object.fromEntries(CARD_KINDS.map((kind) => [kind, publicH4CardKindReference(kind)])) as Record<CardKind, string>,
);

/** A canonical H4 face token from an already verified public physical face. */
type PublicH4CardFace =
  | { kind: CardKind; rank: CardRank; suit: CardSuit }
  | { name: string; rank: CardRank; suit: CardSuit };

export function publicH4CardFaceReference(face: PublicH4CardFace | null | undefined): string | null;
export function publicH4CardFaceReference(face: PublicH4CardFace | null | undefined, fallback: string): string;
export function publicH4CardFaceReference(
  face: PublicH4CardFace | null | undefined,
  fallback?: string,
): string | null {
  if (!face || !CARD_RANKS.has(face.rank) || !CARD_SUITS.has(face.suit)) return fallback ?? null;
  const definition = "kind" in face
    ? CARD_KINDS.includes(face.kind) ? CARD_DEFINITIONS[face.kind] : null
    : CARD_KINDS.map((kind) => CARD_DEFINITIONS[kind]).find((candidate) => candidate.name === face.name) ?? null;
  return definition ? `[${face.rank}${face.suit} ${definition.name}]` : fallback ?? null;
}

/** Judgement H4s retain their existing rank/suit-only information. */
export function publicH4RankSuitReference(rank: CardRank, suit: CardSuit): string | null;
export function publicH4RankSuitReference(rank: CardRank, suit: CardSuit, fallback: string): string;
export function publicH4RankSuitReference(rank: CardRank, suit: CardSuit, fallback?: string): string | null {
  if (!CARD_RANKS.has(rank) || !CARD_SUITS.has(suit)) return fallback ?? null;
  return `[${rank}${suit}]`;
}

/**
 * Formats a name-only card source only when its structured source kind proves
 * it is a card and the label is an exact canonical card name. Skill labels and
 * arbitrary prose are intentionally left untouched.
 */
export function publicH4CardSourceReference(
  source: { kind: "card" | "equipment"; label?: string },
): string | null {
  if (!source.label) return null;
  const kind = CARD_KINDS.find((candidate) => candidate === source.label);
  const definition = kind ? CARD_DEFINITIONS[kind] : CARD_KINDS.map((candidate) => CARD_DEFINITIONS[candidate])
    .find((candidate) => candidate.name === source.label);
  if (source.kind === "equipment" && definition?.category !== "equipment") return null;
  return definition ? publicH4CardKindReference(definition.kind) : null;
}

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
