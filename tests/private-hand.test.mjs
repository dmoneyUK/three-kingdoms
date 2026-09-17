import assert from "node:assert/strict";
import test from "node:test";
import { baselineHand, updatePrivateHand } from "../game/private-hand.js";

const card = (id) => ({ id, kind: "Attack", suit: "♠", rank: "A" });

test("private hand baselines, draw presentation, and redraw identity", () => {
  let previous = baselineHand("me", [card("a")], []);
  for (const [playerId, hand] of [["p1", [card("b"), card("c")]], ["p2", [card("d")]], ["me", [card("a"), card("e")]]]) {
    const result = updatePrivateHand(previous, playerId, hand, [{ id: `draw-${playerId}`, drawPlayerId: playerId }]);
    assert.equal(result.switched, true); assert.deepEqual(result.drawn, []); assert.deepEqual([...result.baseline.cardIds], hand.map((item) => item.id)); previous = result.baseline;
  }
  let result = updatePrivateHand(previous, "me", [card("a"), card("stolen")], [{ id: "gain", gainedCardIds: ["stolen"] }]);
  assert.deepEqual(result.drawn, []); previous = result.baseline;
  const events = [{ id: "gain", gainedCardIds: ["stolen"] }, { id: "draw", drawPlayerId: "me" }];
  const hand = [card("a"), card("stolen"), card("draw1"), card("draw2")];
  result = updatePrivateHand(previous, "me", hand, events); assert.deepEqual(result.drawn.map((item) => item.id), ["draw1", "draw2"]);
  result = updatePrivateHand(result.baseline, "me", hand, events); assert.deepEqual(result.drawn, []);
  result = updatePrivateHand(result.baseline, "me", [...hand, card("other-gain")], [...events, { id: "opponent-draw", drawPlayerId: "p1" }]); assert.deepEqual(result.drawn, []);
  const oldEvents = [{ id: "old-draw", drawPlayerId: "me" }];
  previous = baselineHand("me", [card("a")], oldEvents); result = updatePrivateHand(previous, "me", [], oldEvents); previous = result.baseline;
  result = updatePrivateHand(previous, "me", [card("a")], [...oldEvents, { id: "new-draw", drawPlayerId: "me" }]); assert.deepEqual(result.drawn.map((item) => item.id), ["a"]);
  assert.deepEqual(updatePrivateHand(baselineHand("me", [card("a")], oldEvents), "me", [card("a")], oldEvents).drawn, []);
});
