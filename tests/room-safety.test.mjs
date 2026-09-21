import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRoomData, normalizeTimeline } from "../game/room-safety.js";

test("normalizes valid room data and timeline events", () => {
  const room = normalizeRoomData({ code: "SAFE1", status: "playing", players: [{ id: "p1", name: "ME" }, null], myHand: [{ id: "c1", kind: "Attack", suit: "♠", rank: "A" }], timeline: [{ type: "message", id: "m1", message: "Ready" }, { type: "card", id: "w1", player: "ME", target: "P2", action: "play", playedAs: "attack", card: { id: "red-peach", kind: "Peach", suit: "♥", rank: "A" } }, { type: "card", id: "j1", player: "ME", target: "ME", action: "reveal", judgement: true, card: { id: "judgement-card", kind: "Dodge", suit: "♣", rank: "7" } }] });
  assert.equal(room.players.length, 1);
  assert.equal(room.myHand[0].id, "c1");
  assert.equal(room.timeline[0].type, "message");
  assert.equal(room.timeline[1].playedAs, "attack");
  assert.equal(room.timeline[2].judgement, true);
  const longdan = normalizeRoomData({ code: "SAFE2", status: "playing", players: [], myHand: [], timeline: [{ type: "card", id: "d1", player: "ME", target: "P2", action: "play", playedAs: "dodge", card: { id: "attack-card", kind: "Attack", suit: "♠", rank: "A" } }], currentAction: { version: 3, kind: "response", actorId: "p1", deadline: 0, reason: "Dodge", legalActions: ["respond"], requirement: "dodge", options: [{ providerId: "zhao_yun_attack_as_dodge", satisfies: "dodge", activation: "explicit", label: "Use Longdan as Dodge", playedAs: "dodge", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["attack-card"] } }] } });
  assert.equal(longdan.timeline[0].playedAs, "dodge");
  assert.equal(longdan.currentAction.options[0].playedAs, "dodge");
});

test("drops null and incomplete timeline entries without throwing", () => {
  const timeline = normalizeTimeline([null, undefined, { type: "card", card: null }, { type: "cards", cards: [null] }, { type: "message", message: "Safe" }]);
  assert.deepEqual(timeline.map((event) => event.type), ["message"]);
});

test("handles missing collections and rejects malformed items while preserving valid data", () => {
  const empty = normalizeRoomData({ code: "SAFE1", status: "lobby", players: [], myHand: [], timeline: [] });
  assert.deepEqual(empty.players, []); assert.deepEqual(empty.myHand, []); assert.deepEqual(empty.timeline, []);
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
    currentAction: { version: 1, kind: "attack", actorId: "p1", deadline: 123, reason: "Dodge or take damage", legalActions: ["respond", "respond", "decline_response", "invent_action"], playPhaseActions: [{ cardId: "red-peach", canPlayAs: "attack" }, { cardId: "red-peach", canPlayAs: "attack" }, { cardId: "bad", canPlayAs: "dodge" }], triggerEvent: "attack_targeted", triggerOptions: [{ effectId: "yin_yang_swords_attack_targeted", label: "Yin-Yang Swords", allowDecline: false, timeoutChoiceId: "draw", selection: { type: "choice", choices: [{ id: "discard", label: "Discard 1 hand card" }, { id: "draw", label: "Allow attacker to draw 1 card" }, { id: 4, label: "bad" }], eligibleHandKeys: ["hand:0", 4] } }, { effectId: "gan_ning_qixi", label: "Qixi", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["borrowed-sword"], targetIds: ["target"] } }], requirement: "dodge", options: [{ providerId: "card", satisfies: "dodge", label: "Play Dodge", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["dodge-1", 9] } }, { providerId: 9, satisfies: "dodge", label: "Invalid", selection: null }] },
  });
  assert.deepEqual(room?.pending, { kind: "attack" });
  assert.deepEqual(room?.currentAction?.legalActions, ["respond", "respond", "decline_response"]);
  assert.deepEqual(room?.currentAction?.options, [{ providerId: "card", satisfies: "dodge", activation: "implicit", label: "Play Dodge", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["dodge-1"] } }]);
  assert.deepEqual(room?.currentAction?.playPhaseActions, [{ cardId: "red-peach", canPlayAs: "attack" }]);
  assert.equal(room?.currentAction?.triggerEvent, "attack_targeted");
  assert.deepEqual(room?.currentAction?.triggerOptions, [{ effectId: "yin_yang_swords_attack_targeted", label: "Yin-Yang Swords", allowDecline: false, timeoutChoiceId: "draw", selection: { type: "choice", choices: [{ id: "discard", label: "Discard 1 hand card" }, { id: "draw", label: "Allow attacker to draw 1 card" }], eligibleHandKeys: ["hand:0"] } }, { effectId: "gan_ning_qixi", label: "Qixi", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["borrowed-sword"], targetIds: ["target"] } }]);
});
