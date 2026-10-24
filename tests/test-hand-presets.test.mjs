import assert from "node:assert/strict";
import test from "node:test";
import {
  isTestHandPresetId,
  testHandPresetFor,
  TEST_HAND_PRESET_OPTIONS,
  validateStoredTestHandPreset,
  validateTestHandPreset,
} from "../game/test-hand-presets.ts";

test("test-hand options remove Attack presets and include Dismantle/Steal", () => {
  assert.deepEqual(TEST_HAND_PRESET_OPTIONS.map(({ id }) => id), ["random", "dismantle_steal", "duel_chain", "custom"]);
  assert.equal(isTestHandPresetId("attack_dodge"), false);
  assert.equal(isTestHandPresetId("attack_negation"), false);
  assert.equal(validateTestHandPreset({ id: "attack_dodge" }).preset, null);
  assert.equal(validateTestHandPreset({ id: "attack_negation" }).preset, null);
});

test("Dismantle/Steal preset gives each of five seats both cards, a weapon, and a delayed Stratagem", () => {
  const preset = testHandPresetFor("dismantle_steal");
  const weaponKinds = new Set(["ZhugeCrossbow", "BlueSteelSword", "YinYangSwords", "FrostSword", "RockCleavingAxe"]);
  for (let seat = 0; seat < 5; seat += 1) {
    const hand = preset.handsBySeat[seat];
    assert.ok(hand.includes("Dismantle"), `seat ${seat + 1} has Dismantle`);
    assert.ok(hand.includes("Steal"), `seat ${seat + 1} has Steal`);
    assert.equal(hand.filter((kind) => weaponKinds.has(kind)).length, 1, `seat ${seat + 1} has one weapon`);
    assert.equal(hand.filter((kind) => kind === "Lightning" || kind === "Overindulgence").length, 1, `seat ${seat + 1} has Lightning or Overindulgence`);
    assert.equal(hand.length, 4);
  }
  assert.equal(validateTestHandPreset(preset).error, null, "all specified physical cards fit the Standard deck");
});

test("persisted removed presets safely fall back to random hands", () => {
  for (const id of ["attack_dodge", "attack_negation"]) {
    const result = validateStoredTestHandPreset({ id, handsBySeat: { 0: ["Attack", "Dodge"] } }, new Set([0, 1, 2, 3]));
    assert.equal(result.error, null);
    assert.deepEqual(result.preset, { id: "random", handsBySeat: {} });
  }
});
