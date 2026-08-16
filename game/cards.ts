import type { Card, CardKind, CardSuit } from "./model";

export type CardDefinition = {
  kind: CardKind;
  name: string;
  category: "basic" | "tactic";
  target: "self" | "opponent" | "response";
  description: string;
  rules: string;
};

export const CARD_DEFINITIONS: Record<CardKind, CardDefinition> = {
  Attack: { kind: "Attack", name: "Attack", category: "basic", target: "opponent", description: "Range 1 · deal 1 damage", rules: "During your Play Phase, choose one living player within attack range. They must play Dodge or take 1 damage. Normally, you may play one Attack per turn." },
  Dodge: { kind: "Dodge", name: "Dodge", category: "basic", target: "response", description: "Play only when targeted", rules: "Play Dodge only when you are the current target of an Attack. It prevents that Attack from dealing damage." },
  Peach: { kind: "Peach", name: "Peach", category: "basic", target: "self", description: "Recover 1 HP", rules: "During your Play Phase, recover 1 HP if you are injured. During a Dying rescue, play Peach on the dying player to restore them to 1 HP." },
  DrawTwo: { kind: "DrawTwo", name: "Draw2", category: "tactic", target: "self", description: "Draw 2 cards", rules: "During your Play Phase, draw 2 cards. The cards drawn are visible only to you." },
  Dismantle: { kind: "Dismantle", name: "Dismantle", category: "tactic", target: "opponent", description: "Discard 1 card from another player", rules: "During your Play Phase, choose any other player who has hand cards, then choose one hidden card position. That card is revealed and discarded." },
  // Compatibility for games created before the English card name was corrected.
  Strike: { kind: "Strike", name: "Attack", category: "basic", target: "opponent", description: "Range 1 · deal 1 damage", rules: "During your Play Phase, choose one living player within attack range. They must play Dodge or take 1 damage. Normally, you may play one Attack per turn." },
};

// Standard-card core plus the first tactic card. Counts are explicit so the
// test suite can protect deck composition while more classic cards are added.
export const DECK_COUNTS: Partial<Record<CardKind, number>> = {
  Attack: 30,
  Dodge: 15,
  Peach: 8,
  DrawTwo: 4,
  Dismantle: 6,
};

export function cardDefinition(kind: CardKind) {
  return CARD_DEFINITIONS[kind];
}

export function isAttackCard(card: Pick<Card, "kind">) {
  return card.kind === "Attack" || card.kind === "Strike";
}

export function makeDeck(random: () => number = Math.random): Card[] {
  const suits: CardSuit[] = ["♥", "♦", "♣", "♠"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const kinds = CARD_KINDS_IN_DECK.flatMap((kind) => Array<CardKind>(DECK_COUNTS[kind] ?? 0).fill(kind));
  const deck = kinds.map((kind, index) => ({ id: crypto.randomUUID(), kind, suit: suits[index % suits.length], rank: ranks[index % ranks.length] }));
  for (let index = deck.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [deck[index], deck[swap]] = [deck[swap], deck[index]];
  }
  return deck;
}

const CARD_KINDS_IN_DECK = Object.keys(DECK_COUNTS) as CardKind[];
