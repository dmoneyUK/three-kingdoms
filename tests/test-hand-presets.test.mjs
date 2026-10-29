import assert from "node:assert/strict";
import test from "node:test";
import {
  isTestHandPresetId,
  testHandPresetCompatibilityError,
  testHandPresetFor,
  TEST_HAND_PRESET_OPTIONS,
  validateStoredTestHandPreset,
  validateTestHandPreset,
} from "../game/test-hand-presets.ts";

test("test-hand options remove Attack presets and include Dismantle/Steal", () => {
  assert.deepEqual(TEST_HAND_PRESET_OPTIONS.map(({ id }) => id), ["random", "dismantle_steal", "steal_dismantle_negation", "duel_chain", "group_stratagem_negation", "harvest_negation_chain", "custom"]);
  assert.equal(isTestHandPresetId("attack_dodge"), false);
  assert.equal(isTestHandPresetId("attack_negation"), false);
  assert.equal(isTestHandPresetId("steal_dismantle_negation"), true);
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

test("Negation kit gives each of four seats one targeted card, Negation, gear, and delayed Stratagem", () => {
  const seats = [0, 1, 2, 3];
  const preset = testHandPresetFor("steal_dismantle_negation");
  const gearKinds = new Set(["ZhugeCrossbow", "NioShield", "BlueSteelSword", "YinYangSwords"]);
  for (const seat of seats) {
    const hand = preset.handsBySeat[seat];
    assert.equal(Number(hand.includes("Dismantle")) + Number(hand.includes("Steal")), 1, `seat ${seat + 1} has exactly one targeted card`);
    assert.equal(hand.filter((kind) => kind === "Negation").length, 1, `seat ${seat + 1} has one Negation`);
    assert.equal(hand.filter((kind) => gearKinds.has(kind)).length, 1, `seat ${seat + 1} has one weapon or shield`);
    assert.equal(hand.filter((kind) => kind === "Lightning" || kind === "Overindulgence").length, 1, `seat ${seat + 1} has one delayed Stratagem`);
    assert.equal(hand.length, 4);
  }
  assert.equal(Object.values(preset.handsBySeat).flat().filter((kind) => kind === "Negation").length, 4);
  assert.equal(validateTestHandPreset(preset, new Set(seats)).error, null, "all assigned cards are real copies from the Standard deck");
  assert.equal(testHandPresetCompatibilityError(preset.id, new Set([0, 1, 2, 3])), null);
  assert.match(testHandPresetCompatibilityError(preset.id, new Set([0, 1, 2, 3, 4])), /exactly four players/);
  assert.match(validateTestHandPreset(preset, new Set([0, 1, 2, 3, 4])).error, /exactly four players/);
});

test("Negation kit follows four current seat numbers and stays editable if the lobby roster changes", () => {
  const seats = [1, 2, 5, 7];
  const preset = testHandPresetFor("steal_dismantle_negation", seats);
  assert.deepEqual(Object.keys(preset.handsBySeat), seats.map(String));
  assert.equal(validateTestHandPreset(preset, new Set(seats)).error, null);
  const stored = validateStoredTestHandPreset(preset, new Set([1, 2, 5, 7, 8]));
  assert.equal(stored.error, null);
  assert.deepEqual(Object.keys(stored.preset.handsBySeat), seats.map(String));
});

test("Duel test preset gives the first three seats Duel and all four seats Negation", () => {
  const seats = [0, 1, 2, 3];
  const preset = testHandPresetFor("duel_chain");
  assert.deepEqual(preset.handsBySeat, {
    0: ["Duel", "Negation", "Attack", "Dodge"],
    1: ["Duel", "Negation", "Attack", "Dodge"],
    2: ["Duel", "Negation", "Attack", "Dodge"],
    3: ["Negation", "Attack", "Attack", "Dodge"],
  });
  const allKinds = Object.values(preset.handsBySeat).flat();
  assert.equal(allKinds.filter((kind) => kind === "Duel").length, 3);
  assert.equal(allKinds.filter((kind) => kind === "Negation").length, 4);
  assert.ok(Object.values(preset.handsBySeat).every((hand) => hand.includes("Attack") && hand.includes("Dodge")));
  assert.equal(validateTestHandPreset(preset, new Set(seats)).error, null, "the assignments use the real Standard deck copies");
  assert.equal(testHandPresetCompatibilityError(preset.id, new Set(seats)), null);
  assert.match(testHandPresetCompatibilityError(preset.id, new Set([0, 1, 2, 3, 4])), /exactly four players/);
  assert.match(validateTestHandPreset(preset, new Set([0, 1, 2, 3, 4])).error, /exactly four players/);

  const sparseSeats = [1, 2, 5, 7];
  const sparsePreset = testHandPresetFor("duel_chain", sparseSeats);
  assert.deepEqual(Object.keys(sparsePreset.handsBySeat), sparseSeats.map(String));
  assert.deepEqual(Object.values(sparsePreset.handsBySeat), Object.values(preset.handsBySeat));
  const stored = validateStoredTestHandPreset(sparsePreset, new Set(sparseSeats));
  assert.equal(stored.error, null);
  assert.deepEqual(stored.preset, sparsePreset);
});

test("group and Harvest scenarios provide distinct Stratagem roots with all four real Negations", () => {
  const scenarios = [
    {
      id: "group_stratagem_negation",
      roots: ["BarbarianInvasion", "RainingArrows"],
    },
    {
      id: "harvest_negation_chain",
      roots: ["BumperHarvest", "Dismantle", "Steal", "Duel"],
    },
  ];
  const seats = [0, 1, 2, 3];

  for (const { id, roots } of scenarios) {
    const preset = testHandPresetFor(id);
    const allKinds = Object.values(preset.handsBySeat).flat();
    assert.equal(allKinds.filter((kind) => kind === "Negation").length, 4, `${id} assigns all four Standard Negations`);
    assert.deepEqual(Object.values(preset.handsBySeat).map((hand) => hand.filter((kind) => kind === "Negation").length), [1, 1, 1, 1]);
    for (const root of roots) assert.ok(allKinds.includes(root), `${id} includes ${root}`);
    assert.ok(Object.values(preset.handsBySeat).every((hand) => hand.length === 4));
    assert.equal(validateTestHandPreset(preset, new Set(seats)).error, null, `${id} uses only available Standard copies`);
    assert.equal(testHandPresetCompatibilityError(id, new Set(seats)), null);
    assert.match(testHandPresetCompatibilityError(id, new Set([0, 1, 2, 3, 4])), /exactly four players/);
    assert.match(validateTestHandPreset(preset, new Set([0, 1, 2, 3, 4])).error, /exactly four players/);

    const sparseSeats = [1, 2, 5, 7];
    const sparsePreset = testHandPresetFor(id, sparseSeats);
    assert.deepEqual(Object.keys(sparsePreset.handsBySeat), sparseSeats.map(String));
    assert.deepEqual(Object.values(sparsePreset.handsBySeat), Object.values(preset.handsBySeat));
    const stored = validateStoredTestHandPreset(sparsePreset, new Set([1, 2, 5, 7, 8]));
    assert.equal(stored.error, null);
    assert.deepEqual(stored.preset, sparsePreset, `${id} remains editable when the lobby roster changes`);
  }
});

test("persisted removed presets safely fall back to random hands", () => {
  for (const id of ["attack_dodge", "attack_negation"]) {
    const result = validateStoredTestHandPreset({ id, handsBySeat: { 0: ["Attack", "Dodge"] } }, new Set([0, 1, 2, 3]));
    assert.equal(result.error, null);
    assert.deepEqual(result.preset, { id: "random", handsBySeat: {} });
  }
});
