import type { CardKind, CardRank, CardSuit } from "./model";

export type PhysicalCardSpec = { kind: CardKind; suit: CardSuit; rank: CardRank };
const specs: PhysicalCardSpec[] = [];
function add(kind: CardKind, suit: CardSuit, ranks: string) {
  for (const rank of ranks.split(" ")) specs.push({ kind, suit, rank: rank as CardRank });
}

// Resolved physical Standard + four EX deck. See the source audit in the
// manifest: Kirin Bow 5 ♥, Fergana Steed K ♠, Lightning Q ♥ (EX).
add("Attack", "♠", "7 8 8 9 9 10 10"); add("Attack", "♥", "10 10 J"); add("Attack", "♣", "2 3 4 5 6 7 8 8 9 9 10 10 J J"); add("Attack", "♦", "6 7 8 9 10 K");
add("Dodge", "♥", "2 2 K"); add("Dodge", "♦", "2 2 3 4 5 6 7 8 9 10 J J"); add("Peach", "♥", "3 4 6 7 8 9 Q"); add("Peach", "♦", "Q");
add("Duel", "♠", "A"); add("Duel", "♣", "A"); add("Duel", "♦", "A"); add("Dismantle", "♠", "3 4 Q"); add("Dismantle", "♥", "Q"); add("Dismantle", "♣", "3 4");
add("Steal", "♠", "3 4 J"); add("Steal", "♦", "3 4"); add("DrawTwo", "♥", "7 8 9 J"); add("BarbarianInvasion", "♠", "7 K"); add("BarbarianInvasion", "♣", "7"); add("RainingArrows", "♥", "A"); add("Oath", "♥", "A"); add("BumperHarvest", "♥", "3 4"); add("BorrowedSword", "♣", "Q K");
add("Negation", "♠", "J"); add("Negation", "♣", "Q K"); add("Negation", "♦", "Q"); add("Overindulgence", "♠", "6"); add("Overindulgence", "♥", "6"); add("Overindulgence", "♣", "6"); add("Lightning", "♠", "A"); add("Lightning", "♥", "Q");
add("ZhugeCrossbow", "♣", "A"); add("ZhugeCrossbow", "♦", "A"); add("BlueSteelSword", "♠", "6"); add("YinYangSwords", "♠", "2"); add("FrostSword", "♠", "2"); add("GreenDragonBlade", "♠", "5"); add("SerpentSpear", "♠", "Q"); add("RockCleavingAxe", "♦", "5"); add("SkyPiercingHalberd", "♦", "Q"); add("KirinBow", "♥", "5");
add("EightTrigrams", "♠", "2"); add("EightTrigrams", "♣", "2"); add("NioShield", "♣", "2"); add("Shadowrunner", "♠", "5"); add("HexMark", "♣", "5"); add("YellowHoofedFlyingLightning", "♥", "K"); add("RedHare", "♥", "5"); add("PurpleBay", "♦", "K"); add("FerganaSteed", "♠", "K");

if (specs.length !== 108) throw new Error(`Standard physical deck has ${specs.length} cards, expected 108.`);
export const STANDARD_108_DECK: readonly PhysicalCardSpec[] = Object.freeze(specs);
export const STANDARD_DECK_COUNTS: Partial<Record<CardKind, number>> = Object.freeze(STANDARD_108_DECK.reduce((counts, card) => { counts[card.kind] = (counts[card.kind] ?? 0) + 1; return counts; }, {} as Partial<Record<CardKind, number>>));
