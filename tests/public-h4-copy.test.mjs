import assert from "node:assert/strict";
import test from "node:test";
import {
  publicH4CardFaceReference,
  publicH4CardKindReference,
  publicH4CardSourceReference,
  publicH4Copy,
  publicH4RankSuitReference,
  PUBLIC_H4_CARD_KIND_REFERENCES,
} from "../game/public-h4-copy.ts";

test("typed H4 formatters emit canonical physical, name-only, and Judgement references", () => {
  const cases = [
    ["physical Attack face", () => publicH4CardFaceReference({ kind: "Attack", rank: "8", suit: "♠" }), "[8♠ Attack]"],
    ["physical equipment face", () => publicH4CardFaceReference({ kind: "FerganaSteed", rank: "K", suit: "♠" }), "[K♠ Fergana Steed]"],
    ["card kind", () => publicH4CardKindReference("FrostSword"), "[Frost Sword]"],
    ["shared kind token", () => PUBLIC_H4_CARD_KIND_REFERENCES.FrostSword, "[Frost Sword]"],
    ["rank and suit only", () => publicH4RankSuitReference("Q", "♥"), "[Q♥]"],
  ];
  for (const [label, format, expected] of cases) assert.equal(format(), expected, label);
});

test("name-only source references require card or equipment provenance and an exact canonical label", () => {
  assert.equal(publicH4CardSourceReference({ kind: "equipment", label: "Kirin Bow" }), "[Kirin Bow]");
  assert.equal(publicH4CardSourceReference({ kind: "card", label: "Burning Bridges" }), "[Burning Bridges]");
  assert.equal(publicH4CardSourceReference({ kind: "card", label: "BumperHarvest" }), "[Bumper Harvest]");
  assert.equal(publicH4CardSourceReference({ kind: "equipment", label: "Attack" }), null);
  assert.equal(publicH4CardSourceReference({ kind: "card", label: "[Attack]" }), null);
  assert.equal(publicH4CardSourceReference({ kind: "equipment", label: "Alice's hidden card" }), null);
  assert.equal(publicH4CardSourceReference({ kind: "card" }), null);
  assert.equal(publicH4CardFaceReference({ name: "unverified card", rank: "2", suit: "♣" }), null);
  assert.equal(publicH4RankSuitReference("Z", "♠"), null);
});

test("formatted H4 card tokens preserve player identity spans and untouched prose", () => {
  const copy = publicH4Copy([
    { id: "actor-id", name: "Attack" },
    " used ",
    publicH4CardKindReference("Negation"),
    " to cancel ",
    publicH4CardFaceReference({ kind: "Dismantle", rank: "J", suit: "♦" }) ?? "a card",
    ". Stauchness was not used.",
  ]);
  assert.equal(copy.message, "Attack used [Negation] to cancel [J♦ Burning Bridges]. Stauchness was not used.");
  assert.deepEqual(copy.segments.filter((part) => part.kind === "player"), [
    { kind: "player", playerId: "actor-id", text: "Attack" },
  ]);
  assert.equal(copy.segments.map((part) => part.text).join(""), copy.message);
  assert.equal((copy.message.match(/\[[^\]]+\]/g) ?? []).length, 2);
});
