import test from "node:test";
import { strict as assert } from "node:assert";
import { assessRoleAction, filterAndRankRoleActions } from "../ai/role-target-policy.ts";

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
