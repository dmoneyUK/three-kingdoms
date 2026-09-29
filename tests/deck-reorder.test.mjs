import test from "node:test";
import assert from "node:assert/strict";
import { deckReorderCount, rebuildDeckForReorder } from "../game/decisions/deck-reorder.ts";

const card = (id) => ({ id, kind: "Attack", suit: "♠", rank: "A" });

test("Stargazing uses total character count capped at five", () => {
  assert.deepEqual([4, 5, 6, 7, 8].map(deckReorderCount), [4, 5, 5, 5, 5]);
});

test("deck reorder places top cards next-to-draw and bottom cards last", () => {
  const held = [card("A"), card("B"), card("C"), card("D")];
  const rebuilt = rebuildDeckForReorder([card("E"), card("F"), card("G")], held, ["C", "A"], ["D", "B"]);
  assert.deepEqual(rebuilt.map((item) => item.id), ["C", "A", "E", "F", "G", "D", "B"]);
  assert.deepEqual(rebuildDeckForReorder([], held, [], ["A", "B", "C", "D"]).map((item) => item.id), ["A", "B", "C", "D"]);
  assert.deepEqual(rebuildDeckForReorder([], held, ["D", "C", "B", "A"], []).map((item) => item.id), ["D", "C", "B", "A"]);
});

test("deck reorder rejects duplicate, missing, and foreign physical IDs", () => {
  const held = [card("A"), card("B")];
  assert.equal(rebuildDeckForReorder([], held, ["A", "A"], []), null);
  assert.equal(rebuildDeckForReorder([], held, ["A"], []), null);
  assert.equal(rebuildDeckForReorder([], held, ["A", "X"], []), null);
});
