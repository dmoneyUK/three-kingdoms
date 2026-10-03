import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalTargetSelectionView } from "../game/local-target-selection.ts";

test("local target selection keeps deferred confirmation separate from local choice", () => {
  const empty = buildLocalTargetSelectionView({ selectionActive: true, selectedTargetIds: [], minTargetCount: 1, maxTargetCount: 1, canConfirm: false, hasLocalInput: false });
  assert.equal(empty.canConfirm, false);
  assert.equal(empty.canCancel, false);
  assert.match(empty.instruction, /1 target/);

  const selected = buildLocalTargetSelectionView({ selectionActive: true, selectedTargetIds: ["p2"], minTargetCount: 1, maxTargetCount: 1, canConfirm: true, hasLocalInput: true });
  assert.equal(selected.canConfirm, true);
  assert.equal(selected.canCancel, true);
  assert.deepEqual(selected.selectedTargetIds, ["p2"]);
});

test("local target selection preserves ordered multi-target IDs and does not invent legality", () => {
  const view = buildLocalTargetSelectionView({ selectionActive: true, selectedTargetIds: ["p2", "p3"], minTargetCount: 2, maxTargetCount: 2, canConfirm: false, hasLocalInput: true, instruction: "Choose the targets in effect order" });
  assert.deepEqual(view.selectedTargetIds, ["p2", "p3"]);
  assert.equal(view.canConfirm, false, "the existing caller constraint remains authoritative");
  assert.equal(view.instruction, "Choose the targets in effect order");
});

test("inactive local target selection has no public-control affordances", () => {
  const view = buildLocalTargetSelectionView({ selectionActive: false, selectedTargetIds: [], minTargetCount: 1, maxTargetCount: 1, canConfirm: true, hasLocalInput: true });
  assert.equal(view.selectionActive, false);
  assert.equal(view.canConfirm, false);
  assert.equal(view.canCancel, false);
});
