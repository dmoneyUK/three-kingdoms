import test from "node:test";
import assert from "node:assert/strict";
import { canTargetCharacter } from "../game/capabilities/targeting.ts";

const context = (cardKind, targetHandCount, targetHero = "zhuge-liang") => ({ sourceId: "source", targetId: "target", targetHero, targetHandCount, cardKind });

test("Empty Fortress is live Attack and Duel target legality", () => {
  assert.equal(canTargetCharacter(context("Attack", 0)), false);
  assert.equal(canTargetCharacter(context("Attack", 1)), true);
  assert.equal(canTargetCharacter(context("Duel", 0)), false);
  assert.equal(canTargetCharacter(context("Duel", 1)), true);
  assert.equal(canTargetCharacter(context("Dismantle", 0)), true);
  assert.equal(canTargetCharacter(context("Attack", 0, "zhao-yun")), true);
});
