import assert from "node:assert/strict";
import test from "node:test";
import { botTriggerChoices } from "../ai/trigger-selection.ts";

const own = new Set(["own-b", "own-a"]);
const choices = (selection) => botTriggerChoices({ effectId: "canonical", selection }, own);

test("Bot trigger selection uses exact offered card and target counts", () => {
  assert.deepEqual(choices(null), [{ providerId: "canonical" }]);
  assert.deepEqual(choices({
    type: "cards", min: 2, max: 2, eligibleCardIds: ["not-owned", "own-b", "own-a"],
    targetIds: ["second", "first"], targetMin: 2, targetMax: 2,
  }), [{ providerId: "canonical", cardIds: ["own-a", "own-b"], targetIds: ["second", "first"] }]);
  assert.deepEqual(choices({ type: "target", targetIds: ["valid"] }),
    [{ providerId: "canonical", targetId: "valid", targetIds: ["valid"] }]);
  assert.deepEqual(choices({ type: "cards", min: 2, max: 2, eligibleCardIds: ["own-a", "not-owned"] }), []);
});

test("mandatory choice costs and target-hand indexes stay authoritative", () => {
  assert.deepEqual(choices({ type: "choice", choices: [{ id: "discard" }, { id: "damage" }],
    eligibleHandKeys: ["hand:0"], cardCountByChoice: { discard: 2 } }),
  [{ providerId: "canonical", choice: "damage", cardKeys: [] }]);
  assert.deepEqual(choices({ type: "target_cards", targetId: "enemy", min: 1, max: 1, eligibleKeys: ["hand:2"] }),
    [{ providerId: "canonical", cardKeys: ["hand:2"] }]);
  assert.deepEqual(choices({ type: "choice_and_target_cards", targetId: "enemy", min: 1, max: 1,
    eligibleKeys: ["hand:0"], choices: [{ id: "suit" }] }),
  [{ providerId: "canonical", choice: "suit", cardKeys: ["hand:0"] }]);
});
