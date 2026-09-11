import assert from "node:assert/strict";
import test from "node:test";
import { baselineHand, updatePrivateHand } from "../game/private-hand.js";

const card = (id) => ({ id, kind: "Attack", suit: "♠", rank: "A" });
test("perspective changes baseline existing hands without a draw, including returning to ME", () => {
  let previous = baselineHand("me", [card("a")], []);
  for (const [playerId, hand] of [["p1", [card("b"), card("c")]], ["p2", [card("d")]], ["me", [card("a"), card("e")]]]) {
    const result = updatePrivateHand(previous, playerId, hand, [{ id: `draw-${playerId}`, drawPlayerId: playerId }]);
    assert.equal(result.switched, true); assert.deepEqual(result.drawn, []);
    assert.deepEqual([...result.baseline.cardIds], hand.map((item) => item.id)); previous = result.baseline;
  }
});
test("only new same-player draw events present cards; polling, gains and opponent draws do not", () => {
  let previous = baselineHand("me", [card("a")], []);
  let result = updatePrivateHand(previous, "me", [card("a"), card("stolen")], [{ id: "gain", gainedCardIds: ["stolen"] }]);
  assert.deepEqual(result.drawn, []); previous = result.baseline;
  const events = [{ id: "gain", gainedCardIds: ["stolen"] }, { id: "draw", drawPlayerId: "me" }];
  const hand = [card("a"), card("stolen"), card("draw1"), card("draw2")];
  result = updatePrivateHand(previous, "me", hand, events);
  assert.deepEqual(result.drawn.map((item) => item.id), ["draw1", "draw2"]);
  result = updatePrivateHand(result.baseline, "me", hand, events); assert.deepEqual(result.drawn, []);
  result = updatePrivateHand(result.baseline, "me", [...hand, card("other-gain")], [...events, { id: "opponent-draw", drawPlayerId: "p1" }]);
  assert.deepEqual(result.drawn, []);
});
test("a returned and redrawn physical card can be presented again; historical draws do not replay", () => {
  const events = [{ id: "old-draw", drawPlayerId: "me" }];
  let previous = baselineHand("me", [card("a")], events);
  let result = updatePrivateHand(previous, "me", [], events); previous = result.baseline;
  result = updatePrivateHand(previous, "me", [card("a")], [...events, { id: "new-draw", drawPlayerId: "me" }]);
  assert.deepEqual(result.drawn.map((item) => item.id), ["a"]);
  assert.deepEqual(updatePrivateHand(baselineHand("me", [card("a")], events), "me", [card("a")], events).drawn, []);
});
