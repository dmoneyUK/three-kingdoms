import assert from "node:assert/strict";
import test from "node:test";
import { projectPublicEquipmentTargetPool } from "../app/public-equipment-target-pool.ts";

const card = (id, kind) => ({ id, kind, suit: "♣", rank: "5" });

const selection = (overrides = {}) => ({
  targetId: "target",
  min: 1,
  max: 1,
  eligibleKeys: ["mount-a", "mount-b"],
  ...overrides,
});

const target = (overrides = {}) => ({
  id: "target",
  equipmentCards: [card("mount-a", "FerganaSteed"), card("unrelated-armor", "NioShield"), card("mount-b", "Shadowrunner")],
  ...overrides,
});

test("equipment pool projection keeps only current-action eligible physical cards", () => {
  const result = projectPublicEquipmentTargetPool(selection(), target());
  assert.ok(result);
  assert.deepEqual(result.eligibleKeys, ["mount-a", "mount-b"]);
  assert.deepEqual(result.publicTarget, {
    handCount: 0,
    equipmentCards: [target().equipmentCards[0], target().equipmentCards[2]],
    judgementCards: [],
  });
  assert.equal(result.publicTarget.equipmentCards[0].id, "mount-a");
  assert.equal(result.publicTarget.equipmentCards[1].id, "mount-b");
});

test("equipment pool fails closed on stale, duplicate, non-equipment, or non-one-card authority", () => {
  assert.equal(projectPublicEquipmentTargetPool(selection({ targetId: "other" }), target()), null);
  assert.equal(projectPublicEquipmentTargetPool(selection({ eligibleKeys: ["mount-a", "mount-a"] }), target()), null);
  assert.equal(projectPublicEquipmentTargetPool(selection({ eligibleKeys: ["mount-a", "hand:0"] }), target()), null);
  assert.equal(projectPublicEquipmentTargetPool(selection({ eligibleKeys: ["not-public"] }), target()), null);
  assert.equal(projectPublicEquipmentTargetPool(selection({ min: 2, max: 2 }), target()), null);
  assert.equal(projectPublicEquipmentTargetPool(selection(), target({ equipmentCards: [card("mount-a", "FerganaSteed"), card("mount-a", "Shadowrunner")] })), null);
});
