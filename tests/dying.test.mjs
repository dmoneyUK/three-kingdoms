import assert from "node:assert/strict";
import test from "node:test";
import { applyDamage, applyRecovery, isDying, recoveryNeeded } from "../game/match/dying.js";

test("pure Dying HP rules preserve negative damage and require recovery to reach one", () => {
  assert.equal(applyDamage(1, 1), 0);
  assert.equal(applyDamage(1, 2), -1);
  assert.equal(applyDamage(1, 3), -2);
  assert.equal(isDying(-2), true);
  assert.equal(recoveryNeeded(-2), 3);
  assert.equal(applyRecovery(-2), -1);
  assert.equal(applyRecovery(-1), 0);
  assert.equal(applyRecovery(0), 1);
  assert.equal(isDying(1), false);
});
