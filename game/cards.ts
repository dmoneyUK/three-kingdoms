import type { Card, CardKind, CardSuit } from "./model";

export type CardDefinition = {
  kind: CardKind;
  name: string;
  glyph: string;
  category: "basic" | "tactic";
  target: "self" | "opponent" | "response";
  description: string;
};

export const CARD_DEFINITIONS: Record<CardKind, CardDefinition> = {
  Strike: { kind: "Strike", name: "Strike", glyph: "⚔", category: "basic", target: "opponent", description: "Range 1 · deal 1 damage" },
  Dodge: { kind: "Dodge", name: "Dodge", glyph: "盾", category: "basic", target: "response", description: "Play only when targeted" },
  Peach: { kind: "Peach", name: "Peach", glyph: "桃", category: "basic", target: "self", description: "Recover 1 HP" },
  DrawTwo: { kind: "DrawTwo", name: "Draw Two", glyph: "策", category: "tactic", target: "self", description: "Draw 2 cards" },
};

// Standard-card core plus the first tactic card. Counts are explicit so the
// test suite can protect deck composition while more classic cards are added.
export const DECK_COUNTS: Record<CardKind, number> = {
  Strike: 30,
  Dodge: 15,
  Peach: 8,
  DrawTwo: 4,
};

export function cardDefinition(kind: CardKind) {
  return CARD_DEFINITIONS[kind];
}

export function makeDeck(random: () => number = Math.random): Card[] {
  const suits: CardSuit[] = ["♥", "♦", "♣", "♠"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const kinds = CARD_KINDS_IN_DECK.flatMap((kind) => Array<CardKind>(DECK_COUNTS[kind]).fill(kind));
  const deck = kinds.map((kind, index) => ({ id: crypto.randomUUID(), kind, suit: suits[index % suits.length], rank: ranks[index % ranks.length] }));
  for (let index = deck.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [deck[index], deck[swap]] = [deck[swap], deck[index]];
  }
  return deck;
}

const CARD_KINDS_IN_DECK = Object.keys(DECK_COUNTS) as CardKind[];

