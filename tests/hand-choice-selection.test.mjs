import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHandChoiceKeys, projectEligibleHandChoices, toggleHandChoiceKey } from "../app/hand-choice-selection.ts";

test("projects only valid server hand positions onto the authenticated viewer hand", () => {
  assert.deepEqual(projectEligibleHandChoices(
    ["hand:1", "hand:0", "hand:1", "hand:01", "hand:4", "equipment:0"],
    [{ id: "private-peach" }, { id: "private-dodge" }],
  ), [
    { key: "hand:1", cardId: "private-dodge" },
    { key: "hand:0", cardId: "private-peach" },
  ]);
});

test("normalizes stale and duplicate keys while preserving the viewer's selection order", () => {
  assert.deepEqual(normalizeHandChoiceKeys(
    ["hand:1", "stale", "hand:0", "hand:1"],
    ["hand:0", "hand:1"],
  ), ["hand:1", "hand:0"]);
});

test("toggles eligible hand choices, permits retap deselection, and caps selection at the required count", () => {
  const eligible = ["hand:0", "hand:1", "hand:2"];
  let selected = toggleHandChoiceKey([], "hand:0", eligible, 2);
  selected = toggleHandChoiceKey(selected, "hand:1", eligible, 2);
  assert.deepEqual(selected, ["hand:0", "hand:1"]);
  assert.deepEqual(toggleHandChoiceKey(selected, "hand:2", eligible, 2), selected);
  assert.deepEqual(toggleHandChoiceKey(selected, "hand:0", eligible, 2), ["hand:1"]);
  assert.deepEqual(toggleHandChoiceKey(selected, "hand:9", eligible, 2), selected);
});
