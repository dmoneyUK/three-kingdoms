import assert from "node:assert/strict";
import test from "node:test";
import { DECK_COUNTS, makeDeck } from "../game/cards.ts";

const composition = (deck) => deck.map(({ kind, suit, rank }) => `${kind}|${suit}|${rank}`).sort();
const countBy = (deck, field) => Object.fromEntries([...new Set(deck.map((card) => card[field]))].map((value) => [value, deck.filter((card) => card[field] === value).length]));

test("Standard physical deck is exactly 108 cards and preserves its manifest", () => {
  const first = makeDeck(() => 0.1);
  const second = makeDeck(() => 0.9);
  assert.equal(first.length, 108);
  assert.equal(new Set(first.map((card) => card.id)).size, 108);
  assert.deepEqual(countBy(first, "suit"), { "♠": 27, "♥": 27, "♣": 27, "♦": 27 });
  const categories = first.reduce((counts, card) => { const category = ["Attack", "Dodge", "Peach"].includes(card.kind) ? "Basic" : ["ZhugeCrossbow", "BlueSteelSword", "YinYangSwords", "GreenDragonBlade", "SerpentSpear", "RockCleavingAxe", "SkyPiercingHalberd", "KirinBow", "FrostSword", "NioShield", "EightTrigrams", "Shadowrunner", "HexMark", "YellowHoofedFlyingLightning", "RedHare", "PurpleBay", "FerganaSteed"].includes(card.kind) ? "Equipment" : "Stratagem"; counts[category] = (counts[category] ?? 0) + 1; return counts; }, {});
  assert.deepEqual(categories, { Basic: 53, Stratagem: 36, Equipment: 19 });
  for (const [kind, quantity] of Object.entries(DECK_COUNTS)) assert.equal(first.filter((card) => card.kind === kind).length, quantity, kind);
  for (const kind of ["Shadowrunner", "HexMark", "YellowHoofedFlyingLightning", "RedHare", "PurpleBay", "FerganaSteed"]) assert.equal(first.filter((card) => card.kind === kind).length, 1, kind);
  assert.equal(first.some((card) => ["OffensiveHorse", "DefensiveHorse", "RationsDepleted", "Strike"].includes(card.kind)), false);
  assert.deepEqual(composition(first), composition(second));
  assert.notDeepEqual(first.map(({ kind, suit, rank }) => `${kind}|${suit}|${rank}`), second.map(({ kind, suit, rank }) => `${kind}|${suit}|${rank}`));
  assert.deepEqual(first.filter((card) => card.kind === "KirinBow").map(({ suit, rank }) => [suit, rank]), [["♥", "5"]]);
  assert.deepEqual(first.filter((card) => card.kind === "FerganaSteed").map(({ suit, rank }) => [suit, rank]), [["♠", "K"]]);
  assert.deepEqual(first.filter((card) => card.kind === "Lightning").map(({ suit, rank }) => [suit, rank]).sort(), [["♠", "A"], ["♥", "Q"]]);
});
