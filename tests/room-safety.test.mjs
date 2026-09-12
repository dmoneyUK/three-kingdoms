import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRoomData, normalizeTimeline } from "../game/room-safety.js";

test("normalizes valid room data and timeline events", () => {
  const room = normalizeRoomData({ code: "SAFE1", status: "playing", players: [{ id: "p1", name: "ME" }, null], myHand: [{ id: "c1", kind: "Attack", suit: "♠", rank: "A" }], timeline: [{ type: "message", id: "m1", message: "Ready" }] });
  assert.equal(room.players.length, 1);
  assert.equal(room.myHand[0].id, "c1");
  assert.equal(room.timeline[0].type, "message");
});

test("drops null and incomplete timeline entries without throwing", () => {
  const timeline = normalizeTimeline([null, undefined, { type: "card", card: null }, { type: "cards", cards: [null] }, { type: "message", message: "Safe" }]);
  assert.deepEqual(timeline.map((event) => event.type), ["message"]);
});

test("handles missing optional collections and empty arrays", () => {
  const room = normalizeRoomData({ code: "SAFE1", status: "lobby", players: [], myHand: [], timeline: [] });
  assert.deepEqual(room.players, []);
  assert.deepEqual(room.myHand, []);
  assert.deepEqual(room.timeline, []);
});

test("rejects a malformed room payload while preserving valid room items", () => {
  assert.equal(normalizeRoomData(null), null);
  const room = normalizeRoomData({ code: "SAFE1", status: "playing", players: [null, { id: "p1", name: "ME" }], myHand: [null], timeline: [{ type: "message", message: "ok" }, { type: "card" }] });
  assert.deepEqual(room.players.map((player) => player.id), ["p1"]);
  assert.equal(room.myHand.length, 0);
  assert.equal(room.timeline.length, 1);
});

test("normalizes the canonical current action without trusting unknown legal actions", () => {
  const room = normalizeRoomData({
    code: "ACT01", status: "playing", players: [], myHand: [], timeline: [], log: [], myHeroOptions: [],
    pending: { kind: "attack" },
    currentAction: { version: 1, kind: "attack", actorId: "p1", deadline: 123, reason: "Dodge or take damage", legalActions: ["respond_dodge", "take_damage", "invent_action"] },
  });
  assert.deepEqual(room?.pending, { kind: "attack" });
  assert.deepEqual(room?.currentAction?.legalActions, ["respond_dodge", "take_damage"]);
});
