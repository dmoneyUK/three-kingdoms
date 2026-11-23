import test from "node:test";
import { strict as assert } from "node:assert";
import { assessRoleAction, filterAndRankRoleActions } from "../ai/role-target-policy.ts";
import { recentTargetPressure } from "../ai/target-pressure.ts";

const lord = "public-lord";
const actor = "bot-actor";
const ally = "unknown-seat";

function context(actorRole, livingPlayerIds = [lord, actor, "seat-2", "seat-3"]) {
  return { actorId: actor, actorRole, publicLordId: livingPlayerIds.includes(lord) ? lord : null, livingPlayerIds };
}

test("Loyalist blocks hostile Lord targets and harmful group or delayed cards, while allowing support", () => {
  const loyalist = context("Loyalist");
  assert.equal(assessRoleAction(loyalist, { disposition: "hostile", targetIds: [lord] }).reason, "loyalist_protect_lord");
  assert.equal(assessRoleAction(loyalist, { disposition: "hostile", targetIds: [ally] }).allowed, true);
  assert.equal(assessRoleAction(loyalist, { disposition: "hostile", targetIds: [ally, lord] }).reason, "loyalist_protect_lord",
    "a multi-target action is blocked when any target is the Lord");
  assert.equal(assessRoleAction(loyalist, { disposition: "hostile", targetIds: ["seat-2", "seat-3"] }).allowed, true,
    "the otherwise comparable all-non-Lord target set remains available");
  assert.equal(assessRoleAction(loyalist, { disposition: "global_harm", mayAffectLord: true }).reason, "loyalist_aoe_endangers_lord");
  assert.equal(assessRoleAction(loyalist, { disposition: "delayed_harm", mayAffectLord: true }).reason, "loyalist_aoe_endangers_lord");
  assert.equal(assessRoleAction(loyalist, { disposition: "helpful", targetIds: [lord] }).allowed, true);
  assert.equal(assessRoleAction(loyalist, { disposition: "unknown", targetIds: [lord] }).reason, "unknown_harm_requires_review");
  assert.equal(assessRoleAction(loyalist, { disposition: "unknown", mayAffectLord: true }).reason, "unknown_harm_requires_review",
    "an unclassified effect with unknown scope fails closed while the Lord is alive");
  assert.equal(assessRoleAction(loyalist, { disposition: "neutral", targetIds: [lord] }).allowed, true);
  assert.equal(assessRoleAction(context("Loyalist", [actor, "seat-2", "seat-3"]), {
    disposition: "hostile", targetIds: [lord],
  }).allowed, true, "the guard stops once the public Lord is no longer alive");
});

test("Rebel prioritizes the public Lord only among comparable hostile candidates", () => {
  const rebel = context("Rebel");
  const ranked = filterAndRankRoleActions(rebel, [
    { value: "attack-other", intent: { disposition: "hostile", targetIds: [ally], comparisonKey: "Attack:1" } },
    { value: "draw", intent: { disposition: "helpful", comparisonKey: "DrawTwo:1" } },
    { value: "attack-lord", intent: { disposition: "hostile", targetIds: [lord], comparisonKey: "Attack:1" } },
  ]);
  assert.deepEqual(ranked.allowed, ["attack-lord", "draw", "attack-other"]);
  assert.equal(ranked.allowed.includes("attack-other"), true, "other legal targets remain available");
  assert.deepEqual(filterAndRankRoleActions(rebel, [
    { value: "only-in-range", intent: { disposition: "hostile", targetIds: [ally], comparisonKey: "Attack:1" } },
  ]).allowed, ["only-in-range"], "when the Lord is absent from canonical eligible targets, other targets remain selectable");
});

test("Renegade delays Lord harm with more than two living seats but may fight the final Lord duel", () => {
  assert.equal(assessRoleAction(context("Renegade"), { disposition: "hostile", targetIds: [lord] }).reason, "renegade_delay_lord");
  assert.equal(assessRoleAction(context("Renegade", [lord, actor]), {
    disposition: "hostile", targetIds: [lord],
  }).allowed, true);
  assert.equal(assessRoleAction(context("Renegade"), { disposition: "hostile", targetIds: [ally] }).allowed, true);
});

test("a forced harmful response reports an authority gap instead of inventing a safe target", () => {
  assert.equal(assessRoleAction(context("Loyalist"), {
    disposition: "hostile", targetIds: [lord], forced: true,
  }).reason, "authority_gap_forced_harm");
  assert.deepEqual(filterAndRankRoleActions(context("Loyalist"), [
    { value: "forced-attack", intent: { disposition: "hostile", targetIds: [lord], forced: true } },
    { value: "canonical-decline", intent: { disposition: "neutral" } },
  ]).allowed, ["canonical-decline"], "an already offered decline remains the safe fallback");
});

const hostile = (id, comparisonKey = "Attack:1", extra = {}) => ({
  value: id, intent: { disposition: "hostile", targetIds: [id], comparisonKey, ...extra },
});
const targetRecord = (id, turnEpoch, targetIds, extra = {}) => `@card:${JSON.stringify({
  id, botTargetPressure: { turnEpoch, targetIds }, ...extra,
})}`;

test("pressure counts each committed public choice once and expires after four turns", () => {
  const event = targetRecord("first", 7, [ally, ally, lord]);
  const log = [targetRecord("old", 6, [ally]), event, event,
    targetRecord("now", 10, [ally]), targetRecord("future", 11, [ally]),
    targetRecord("private", 9, [ally], { privateToPlayerId: ally }),
    targetRecord("hidden", 9, [ally], { presentation: false }),
    '@card:{"id":"normal-response","action":"play"}'];
  assert.deepEqual([...recentTargetPressure(JSON.stringify(log), 10)], [[ally, 2], [lord, 1]]);
  assert.deepEqual([...recentTargetPressure(JSON.stringify(log), 14)], [[ally, 1]], "turns 11 through 14 are now current");
  assert.deepEqual([...recentTargetPressure(JSON.stringify([event, ...Array(200).fill("old prose")]), 10)], []);
  assert.equal(recentTargetPressure("invalid", 10).size, 0);
});

test("three comparable Bot decisions distribute pressure and preserve comparable tactic ordering", () => {
  const ids = [ally, "seat-2", "seat-3"];
  const log = [];
  for (const [index, kind] of ["Attack:1", "Dismantle:1", "Attack:borrowed_sword"].entries()) {
    const options = ids.map((id) => hostile(id, kind, kind.endsWith("borrowed_sword") ? { forced: true, targetDiscretion: true } : {}));
    const pressure = recentTargetPressure(JSON.stringify(log), index + 1);
    const [chosen] = filterAndRankRoleActions(context("Lord"), options, { seed: `match:bot-${index}`, recentPressure: pressure }).allowed;
    assert.equal(pressure.get(chosen) ?? 0, 0);
    log.push(targetRecord(`play-${index}`, index + 1, [chosen]));
  }
  const finalPressure = recentTargetPressure(JSON.stringify(log), 3);
  assert.deepEqual(ids.map((id) => finalPressure.get(id)), [1, 1, 1]);
  const choices = [hostile(ally), hostile(lord), hostile("seat-2", "Steal:1")];
  const pressedLord = { seed: "match", recentPressure: new Map([[lord, 10]]) };
  assert.deepEqual(filterAndRankRoleActions(context("Rebel"), choices, pressedLord).allowed, [lord, ally, "seat-2"]);
  assert.deepEqual(filterAndRankRoleActions(context("Loyalist"), choices, pressedLord).allowed, [ally, "seat-2"]);
  assert.deepEqual(filterAndRankRoleActions(context("Lord"), [hostile(lord)], pressedLord).allowed, [lord]);
  const forced = [hostile(lord, "Attack:forced", { forced: true }), hostile(ally, "Attack:forced", { forced: true })];
  assert.deepEqual(filterAndRankRoleActions(context("Lord"), forced, pressedLord).allowed, [lord, ally]);
});

test("equivalent target ranking ignores seat and controller order and repeats across retries", () => {
  const ids = [ally, "seat-2", "seat-3"];
  const wins = new Map(ids.map((id) => [id, 0]));
  for (let match = 0; match < 120; match++) {
    const targeting = { seed: `match-${match}|actor|first-play`, recentPressure: new Map() };
    const bySeat = ids.map((id) => hostile(id));
    const expected = filterAndRankRoleActions(context("Lord"), bySeat, targeting).allowed;
    const rotated = [...bySeat.slice(1), bySeat[0]];
    const controllerSwap = rotated.map((entry, index) => ({ ...entry, isHuman: index === 1, isHost: index === 1 }));
    assert.deepEqual(filterAndRankRoleActions(context("Lord"), controllerSwap, targeting).allowed, expected);
    assert.deepEqual(filterAndRankRoleActions(context("Lord"), bySeat, targeting).allowed, expected);
    wins.set(expected[0], wins.get(expected[0]) + 1);
  }
  for (const total of wins.values()) assert.ok(total >= 25 && total <= 55, JSON.stringify([...wins]));
});
