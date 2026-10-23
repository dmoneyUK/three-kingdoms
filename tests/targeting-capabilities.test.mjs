import test from "node:test";
import assert from "node:assert/strict";
import { canTargetCharacter } from "../game/capabilities/targeting.ts";
import { evaluatePlayTarget } from "../game/capabilities/play-target-eligibility.ts";

const context = (cardKind, targetHandCount, targetHero = "zhuge-liang") => ({ sourceId: "source", targetId: "target", targetHero, targetHandCount, cardKind });

test("Empty Fortress is live Attack and Duel target legality", () => {
  assert.equal(canTargetCharacter(context("Attack", 0)), false);
  assert.equal(canTargetCharacter(context("Attack", 1)), true);
  assert.equal(canTargetCharacter(context("Duel", 0)), false);
  assert.equal(canTargetCharacter(context("Duel", 1)), true);
  assert.equal(canTargetCharacter(context("Dismantle", 0)), true);
  assert.equal(canTargetCharacter(context("Attack", 0, "zhao-yun")), true);
});

const eligibilityPlayer = (id, seat, { hero = "cao-cao", hp = 4, handCount = 1, weapon, judgementCards = [], alive = true } = {}) => ({
  id, seat, hero, hp, alive, handCount, equipment: weapon ? { weapon: { id: `${id}-weapon`, kind: weapon, suit: "♠", rank: "A" } } : {}, judgementCards,
});
const playMode = (effectiveKind, cardId = `${effectiveKind}-physical`) => ({ mode: "card", cardId, effectiveKind });

test("play target evaluator uses live circular distance, effective weapon range, and target restrictions", () => {
  const players = [
    eligibilityPlayer("source", 0, { handCount: 2 }),
    eligibilityPlayer("near", 1),
    eligibilityPlayer("empty-fortress", 2, { hero: "zhuge-liang", handCount: 0 }),
    eligibilityPlayer("other", 3),
    eligibilityPlayer("last", 4),
  ];
  assert.deepEqual(evaluatePlayTarget(players, "source", "empty-fortress", playMode("Attack")), {
    eligible: false, rejection: { code: "OUT_OF_RANGE", distance: 2, range: 1 },
  });
  const ranged = players.map((player) => player.id === "source" ? eligibilityPlayer("source", 0, { handCount: 2, weapon: "GreenDragonBlade" }) : player);
  assert.deepEqual(evaluatePlayTarget(ranged, "source", "empty-fortress", playMode("Attack")), {
    eligible: false, rejection: { code: "TARGET_RESTRICTED" },
  });
  const withCard = ranged.map((player) => player.id === "empty-fortress" ? { ...player, handCount: 1 } : player);
  assert.deepEqual(evaluatePlayTarget(withCard, "source", "empty-fortress", playMode("Attack")), { eligible: true });
});

test("play target evaluator keeps Steal and Rations card range separate from Attack range and honors Wizardry", () => {
  const players = [
    eligibilityPlayer("source", 0, { hero: "cao-cao", weapon: "KirinBow" }),
    eligibilityPlayer("near", 1),
    eligibilityPlayer("far", 2),
    eligibilityPlayer("other", 3),
    eligibilityPlayer("last", 4),
  ];
  assert.deepEqual(evaluatePlayTarget(players, "source", "far", playMode("Steal")), {
    eligible: false, rejection: { code: "OUT_OF_RANGE", distance: 2, range: 1 },
  });
  assert.deepEqual(evaluatePlayTarget(players, "source", "far", playMode("RationsDepleted")), {
    eligible: false, rejection: { code: "OUT_OF_RANGE", distance: 2, range: 1 },
  });
  const wizard = players.map((player) => player.id === "source" ? { ...player, hero: "huang-yueying" } : player);
  assert.deepEqual(evaluatePlayTarget(wizard, "source", "far", playMode("Steal")), { eligible: true });
  assert.deepEqual(evaluatePlayTarget(wizard, "source", "far", playMode("RationsDepleted")), { eligible: true });
});

test("play target evaluator preserves HP-dependent effective distance modifiers", () => {
  const players = [
    eligibilityPlayer("source", 0, { hero: "gongsun-zan", hp: 4 }),
    eligibilityPlayer("near", 1),
    eligibilityPlayer("far", 2),
    eligibilityPlayer("other", 3),
    eligibilityPlayer("last", 4),
  ];
  assert.deepEqual(evaluatePlayTarget(players, "source", "far", playMode("Attack")), { eligible: true }, "healthy Militia reduces the raw distance from 2 to 1");
  const lowHpSource = players.map((player) => player.id === "source" ? { ...player, hp: 2 } : player);
  assert.deepEqual(evaluatePlayTarget(lowHpSource, "source", "far", playMode("Attack")), {
    eligible: false, rejection: { code: "OUT_OF_RANGE", distance: 2, range: 1 },
  }, "low HP disables Gongsun Zan's outbound distance reduction");
  const lowHpTarget = players.map((player) => player.id === "source"
    ? { ...player, hero: "cao-cao" }
    : player.id === "far" ? { ...player, hero: "gongsun-zan", hp: 2 } : player);
  assert.deepEqual(evaluatePlayTarget(lowHpTarget, "source", "far", playMode("Attack")), {
    eligible: false, rejection: { code: "OUT_OF_RANGE", distance: 3, range: 1 },
  }, "low HP Gongsun Zan increases incoming effective distance");
});

test("play target evaluator reports card-specific restrictions and does not range-limit Duel or Dismantle", () => {
  const players = [
    eligibilityPlayer("source", 0),
    eligibilityPlayer("near", 1),
    eligibilityPlayer("zhuge", 2, { hero: "zhuge-liang", handCount: 0 }),
    eligibilityPlayer("lu-xun", 3, { hero: "lu-xun", handCount: 1 }),
    eligibilityPlayer("last", 4),
  ];
  assert.deepEqual(evaluatePlayTarget(players, "source", "zhuge", playMode("Duel")), { eligible: false, rejection: { code: "TARGET_RESTRICTED" } });
  const zhugeHasCard = players.map((player) => player.id === "zhuge" ? { ...player, handCount: 1 } : player);
  assert.deepEqual(evaluatePlayTarget(zhugeHasCard, "source", "zhuge", playMode("Duel")), { eligible: true });
  assert.deepEqual(evaluatePlayTarget(players, "source", "lu-xun", playMode("Steal")), { eligible: false, rejection: { code: "TARGET_RESTRICTED" } });
  assert.deepEqual(evaluatePlayTarget(players, "source", "zhuge", playMode("Dismantle")), { eligible: false, rejection: { code: "NO_TARGETABLE_CARDS" } });
  assert.deepEqual(evaluatePlayTarget(players, "source", "lu-xun", playMode("Dismantle")), { eligible: true });
});

test("play target evaluator catches duplicate delayed cards and validates Borrowed Sword and virtual Serpent Spear", () => {
  const players = [
    eligibilityPlayer("source", 0, { handCount: 2 }),
    eligibilityPlayer("near", 1, { weapon: "BlueSteelSword", judgementCards: [{ id: "old-rations", kind: "RationsDepleted", suit: "♠", rank: "3" }] }),
    eligibilityPlayer("far", 2, { judgementCards: [{ id: "old-overindulgence", kind: "Overindulgence", suit: "♠", rank: "2" }] }),
    eligibilityPlayer("other", 3),
    eligibilityPlayer("last", 4),
  ];
  assert.deepEqual(evaluatePlayTarget(players, "source", "far", playMode("Overindulgence")), { eligible: false, rejection: { code: "DUPLICATE_DELAYED_CARD" } });
  assert.deepEqual(evaluatePlayTarget(players, "source", "near", playMode("RationsDepleted")), { eligible: false, rejection: { code: "DUPLICATE_DELAYED_CARD" } });
  assert.deepEqual(evaluatePlayTarget(players, "source", "far", playMode("BorrowedSword")), { eligible: false, rejection: { code: "TARGET_RESTRICTED" } });
  assert.deepEqual(evaluatePlayTarget(players, "source", "near", playMode("BorrowedSword")), { eligible: true });
  assert.deepEqual(evaluatePlayTarget(players, "source", "near", { mode: "serpent_spear_attack", effectiveKind: "Attack" }), { eligible: false, rejection: { code: "ACTION_UNAVAILABLE" } });
  const spear = players.map((player) => player.id === "source" ? eligibilityPlayer("source", 0, { handCount: 2, weapon: "SerpentSpear" }) : player);
  assert.deepEqual(evaluatePlayTarget(spear, "source", "near", { mode: "serpent_spear_attack", effectiveKind: "Attack" }), { eligible: true });
});
