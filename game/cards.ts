import type { Card, CardKind, CardSuit } from "./model";

export type CardDefinition = {
  kind: CardKind;
  name: string;
  product: "standard" | "endless-legends";
  category: "basic" | "stratagem" | "equipment";
  target: "self" | "opponent" | "all-opponents" | "response";
  equipmentSlot?: "weapon";
  attackRange?: number;
  description: string;
  rules: string;
  officialCardId: number;
};

// YOKA Games' official English WTK card catalogue is the source of truth for
// player-facing card names, categories, and effect summaries.
export const OFFICIAL_WTK_CARD_CATALOGUE = "https://wtkgames.com/gameCard/";

export const CARD_DEFINITIONS: Record<CardKind, CardDefinition> = {
  Attack: { kind: "Attack", name: "Attack", product: "standard", category: "basic", target: "opponent", description: "Range 1 · deal 1 damage", rules: "During your Play Phase, target a character within your attack range. They must play Dodge or take 1 damage. Normally, you may use one Attack per turn.", officialCardId: 173 },
  Dodge: { kind: "Dodge", name: "Dodge", product: "standard", category: "basic", target: "response", description: "Avoid an Attack", rules: "Play Dodge when you are targeted by an Attack. That Attack deals no damage to you.", officialCardId: 56 },
  Peach: { kind: "Peach", name: "Peach", product: "standard", category: "basic", target: "self", description: "Recover 1 HP", rules: "During your Play Phase, use Peach to recover 1 HP when you are wounded. When a character is Dying, Peach may instead rescue that character by restoring 1 HP.", officialCardId: 171 },
  DrawTwo: { kind: "DrawTwo", name: "Something Out of Nothing", product: "standard", category: "stratagem", target: "self", description: "Draw 2 cards", rules: "During your Play Phase, play this card to draw 2 cards.", officialCardId: 184 },
  Dismantle: { kind: "Dismantle", name: "Burning Bridges", product: "standard", category: "stratagem", target: "opponent", description: "Discard 1 of another player's cards", rules: "During your Play Phase, target another character. Discard 1 card from their hand, Equipment Zone, or Judgement Zone.", officialCardId: 174 },
  Steal: { kind: "Steal", name: "Steal", product: "standard", category: "stratagem", target: "opponent", description: "Range 1 · obtain 1 card", rules: "During your Play Phase, target another character within distance 1. Obtain 1 card from their hand, Equipment Zone, or Judgement Zone.", officialCardId: 189 },
  Duel: { kind: "Duel", name: "Duel", product: "standard", category: "stratagem", target: "opponent", description: "Alternate playing Attack", rules: "During your Play Phase, target another character. Starting with the target, you alternate playing Attack cards. The first player who does not play Attack takes 1 damage from the other duelist.", officialCardId: 185 },
  Oath: { kind: "Oath", name: "Oath of the Peach Garden", product: "standard", category: "stratagem", target: "self", description: "All wounded players recover 1 HP", rules: "During your Play Phase, use this card on all wounded living characters, including yourself. Each affected character recovers 1 HP.", officialCardId: 81 },
  BarbarianInvasion: { kind: "BarbarianInvasion", name: "Barbarian Invasion", product: "standard", category: "stratagem", target: "all-opponents", description: "Each opponent must play Attack", rules: "During your Play Phase, use this card on all other living characters. In turn order, each target must play an Attack or take 1 damage.", officialCardId: 178 },
  RainingArrows: { kind: "RainingArrows", name: "Raining Arrows", product: "standard", category: "stratagem", target: "all-opponents", description: "Each opponent must play Dodge", rules: "During your Play Phase, use this card on all other living characters. In turn order, each target must play a Dodge or take 1 damage.", officialCardId: 183 },
  BumperHarvest: { kind: "BumperHarvest", name: "Bumper Harvest", product: "standard", category: "stratagem", target: "self", description: "Reveal 1 card per player · choose in turn", rules: "During your Play Phase, use this card on all living characters, including yourself. Reveal cards from the top of the deck equal to the number of living players. Starting with you and continuing in turn order, each player chooses 1 revealed card to obtain. Negation cancels Bumper Harvest only for the affected player; the remaining players continue in order and any card left over is discarded when the sequence ends.", officialCardId: 57 },
  Negation: { kind: "Negation", name: "Negation", product: "standard", category: "stratagem", target: "response", description: "Cancel a stratagem effect", rules: "Before a stratagem takes effect on one target, play Negation to cancel that effect. Another Negation may be played to cancel the previous Negation.", officialCardId: 108 },
  Overindulgence: { kind: "Overindulgence", name: "Overindulgence", product: "standard", category: "stratagem", target: "opponent", description: "Delayed · may skip Play Phase", rules: "During your Play Phase, place this card in another character's Judgement Zone. At the start of that character's turn, reveal a judgement card. If it is not a Heart, that character skips their Play Phase. Discard Overindulgence after it resolves.", officialCardId: 177 },
  Lightning: { kind: "Lightning", name: "Lightning", product: "standard", category: "stratagem", target: "self", description: "Delayed · 3 thunder damage or transfer", rules: "During your Play Phase, place Lightning in your Judgement Zone. During your next Judgement Phase, reveal a judgement card. If it is a Spade from 2 through 9, take 3 thunder damage and discard Lightning. Otherwise, pass Lightning to the next living character's Judgement Zone.", officialCardId: 107 },
  ZhugeCrossbow: { kind: "ZhugeCrossbow", name: "Zhuge Crossbow", product: "standard", category: "equipment", target: "self", equipmentSlot: "weapon", attackRange: 1, description: "Weapon · range 1", rules: "Equip this weapon during your Play Phase. While it remains in your Equipment Zone, you may use an unlimited number of Attack cards during each of your turns. Zhuge Crossbow has an Attack Range of 1.", officialCardId: 175 },
  GreenDragonBlade: { kind: "GreenDragonBlade", name: "Green Dragon Blade", product: "standard", category: "equipment", target: "self", equipmentSlot: "weapon", attackRange: 3, description: "Weapon · range 3", rules: "Equip this weapon during your Play Phase. When your Attack is blocked by Dodge, you may immediately play another Attack against the same target. Green Dragon Blade has an Attack Range of 3.", officialCardId: 180 },
  SerpentSpear: { kind: "SerpentSpear", name: "Serpent Spear", product: "standard", category: "equipment", target: "self", equipmentSlot: "weapon", attackRange: 3, description: "Weapon · range 3", rules: "Equip this weapon during your Play Phase. While it remains in your Equipment Zone, you may discard 2 cards from your hand to form an Attack. Serpent Spear has an Attack Range of 3.", officialCardId: 181 },
  RationsDepleted: { kind: "RationsDepleted", name: "Rations Depleted", product: "endless-legends", category: "stratagem", target: "opponent", description: "Range 1 · may skip Draw Phase", rules: "During your Play Phase, place this card in the Judgement Zone of another character within distance 1. At the start of that character's turn, reveal a judgement card. If it is not a Club, that character skips their Draw Phase. Discard Rations Depleted after it resolves.", officialCardId: 199 },
  // Compatibility for games created before the English card name was corrected.
  Strike: { kind: "Strike", name: "Attack", product: "standard", category: "basic", target: "opponent", description: "Range 1 · deal 1 damage", rules: "During your Play Phase, target a character within your attack range. They must play Dodge or take 1 damage. Normally, you may use one Attack per turn.", officialCardId: 173 },
};

// WTK Standard only. Expansion definitions may remain above for saved-game
// compatibility, but only cards listed here enter new games or quick-test hands.
export const DECK_COUNTS: Partial<Record<CardKind, number>> = {
  Attack: 30,
  Dodge: 15,
  Peach: 8,
  DrawTwo: 4,
  Dismantle: 6,
  Steal: 5,
  Duel: 3,
  Oath: 1,
  BarbarianInvasion: 3,
  RainingArrows: 1,
  BumperHarvest: 2,
  Negation: 3,
  Overindulgence: 2,
  Lightning: 2,
  ZhugeCrossbow: 2,
  GreenDragonBlade: 1,
  SerpentSpear: 1,
};

export const DECK_CARD_KINDS = Object.keys(DECK_COUNTS) as CardKind[];

export function cardDefinition(kind: CardKind) {
  return CARD_DEFINITIONS[kind];
}

export function isAttackCard(card: Pick<Card, "kind">) {
  return card.kind === "Attack" || card.kind === "Strike";
}

export function makeDeck(random: () => number = Math.random): Card[] {
  const suits: CardSuit[] = ["♥", "♦", "♣", "♠"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const kinds = DECK_CARD_KINDS.flatMap((kind) => Array<CardKind>(DECK_COUNTS[kind] ?? 0).fill(kind));
  const deck = kinds.map((kind, index) => ({ id: crypto.randomUUID(), kind, suit: suits[index % suits.length], rank: ranks[index % ranks.length] }));
  for (let index = deck.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [deck[index], deck[swap]] = [deck[swap], deck[index]];
  }
  return deck;
}
