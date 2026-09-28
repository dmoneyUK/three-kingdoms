import test from "node:test";
import assert from "node:assert/strict";
import { distanceBetween, effectiveDistanceBetween } from "../game/rules.ts";

function player(id, seat, hero = null, hp = 4) {
  return { id, seat, hero, hp, alive: true };
}

function distance(players, sourceId, targetId, equipment = new Map()) {
  return effectiveDistanceBetween(players, sourceId, targetId, (entry) => equipment.get(entry.id) ?? []);
}

test("raw circular distance remains independent from directional capabilities", () => {
  const players = [player("gongsun", 0, "gongsun-zan"), player("alice", 1), player("bob", 2), player("carol", 3)];
  assert.equal(distanceBetween(players, "gongsun", "bob"), 2);
  assert.equal(distance(players, "gongsun", "bob"), 1);
  assert.equal(distance(players, "bob", "gongsun"), 2);
});

test("Militia uses the live HP boundary and direction", () => {
  const gongsun = player("gongsun", 0, "gongsun-zan", 4);
  const target = player("target", 2);
  const players = [gongsun, player("left", 1), target, player("right", 3)];

  assert.equal(distance(players, "gongsun", "target"), 1, "4 HP gives outbound -1");
  gongsun.hp = 3;
  assert.equal(distance(players, "gongsun", "target"), 1, "3 HP gives outbound -1");
  assert.equal(distance(players, "target", "gongsun"), 2, "healthy Gongsun does not modify inbound distance");
  gongsun.hp = 2;
  assert.equal(distance(players, "gongsun", "target"), 2, "2 HP removes outbound reduction");
  assert.equal(distance(players, "target", "gongsun"), 3, "2 HP gives inbound +1");
  gongsun.hp = 1;
  assert.equal(distance(players, "target", "gongsun"), 3, "1 HP gives inbound +1");
});

test("Militia changes immediately when HP crosses 2 and recovers back", () => {
  const gongsun = player("gongsun", 0, "gongsun-zan", 3);
  const target = player("target", 2);
  const players = [gongsun, player("left", 1), target, player("right", 3)];

  assert.equal(distance(players, "gongsun", "target"), 1);
  gongsun.hp = 2;
  assert.equal(distance(players, "gongsun", "target"), 2);
  assert.equal(distance(players, "target", "gongsun"), 3);
  gongsun.hp = 3;
  assert.equal(distance(players, "gongsun", "target"), 1);
  assert.equal(distance(players, "target", "gongsun"), 2);
});

test("effective distance clamps at 1 and preserves dead-player sentinel", () => {
  const players = [player("gongsun", 0, "gongsun-zan", 4), player("target", 1)];
  const equipment = new Map([["gongsun", [{ kind: "RedHare" }]]]);
  assert.equal(distance(players, "gongsun", "target", equipment), 1, "stacked outbound reductions clamp at 1");
  players[1].alive = false;
  assert.equal(distance(players, "gongsun", "target", equipment), 99, "dead targets retain the existing sentinel");
});

test("Militia composes with offensive and defensive horses", () => {
  const gongsun = player("gongsun", 0, "gongsun-zan", 4);
  const target = player("target", 2);
  const players = [gongsun, player("left", 1), target, player("right", 3)];
  const equipment = new Map([
    ["gongsun", [{ kind: "FerganaSteed" }]],
    ["target", [{ kind: "Shadowrunner" }]],
  ]);

  assert.equal(distance(players, "gongsun", "target", equipment), 1, "healthy outbound Militia and offensive horse compose with inbound target horse");
  assert.equal(distance(players, "target", "gongsun", equipment), 2, "target defensive horse and healthy Gongsun do not alter the reverse direction");
  gongsun.hp = 2;
  assert.equal(distance(players, "gongsun", "target", equipment), 2, "low-HP inbound Militia does not alter outbound distance");
  assert.equal(distance(players, "target", "gongsun", equipment), 3, "low-HP Militia composes with target defensive horse");
});

test("non-Gongsun heroes retain existing distance behavior", () => {
  const players = [player("source", 0, "cao-cao"), player("left", 1), player("target", 2), player("right", 3)];
  assert.equal(distance(players, "source", "target"), 2);
  assert.equal(distance(players, "target", "source"), 2);
});
