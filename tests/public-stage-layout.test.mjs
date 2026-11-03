import test from "node:test";
import assert from "node:assert/strict";
import { calculatePublicStageLayout, publicStageSceneIdentity } from "../game/public-stage-layout.ts";

const scene = {
  semantics: "PROVEN",
  roomId: "room-1",
  scopeId: "root-event-1",
  interactionId: null,
  eventId: "event-1",
  cardId: "card-1",
  viewerId: "viewer-1",
  phase: "REVEAL",
  generation: 1,
};

function input(overrides = {}) {
  return {
    scene,
    viewport: { left: 0, top: 0, right: 390, bottom: 844 },
    table: { left: 8, top: 100, right: 382, bottom: 780 },
    preferredCard: { left: 150, top: 350 },
    card: { width: 90, height: 135 },
    announcement: { width: 240, height: 52 },
    activity: { width: 220, height: 44 },
    obstacles: [],
    ...overrides,
  };
}

test("public stage identity is scoped to proven event, physical card, viewer, phase and generation", () => {
  const identity = publicStageSceneIdentity(scene);
  assert.ok(identity);
  for (const change of [
    { eventId: "event-2" },
    { cardId: "card-2" },
    { viewerId: "viewer-2" },
    { phase: "MOVE" },
    { generation: 2 },
  ]) assert.notEqual(publicStageSceneIdentity({ ...scene, ...change }), identity);
  assert.equal(publicStageSceneIdentity({ ...scene, semantics: "INFERRED" }), null);
  assert.equal(publicStageSceneIdentity({ ...scene, cardId: "" }), null);
  assert.notEqual(publicStageSceneIdentity({ ...scene, scopeId: "root-event-2" }), identity);
});

test("reveal layout keeps H4, full-size card and PAC in order with the measured minimum gap", () => {
  const result = calculatePublicStageLayout(input());
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  const { announcement, card, activity } = result.layout;
  assert.ok(announcement.bottom <= card.top);
  assert.ok(card.bottom <= activity.top);
  assert.ok(activity.top - card.bottom >= 8);
  assert.deepEqual([card.right - card.left, card.bottom - card.top], [90, 135]);
  for (const rect of [announcement, card, activity]) {
    assert.ok(rect.left >= result.layout.safeBounds.left);
    assert.ok(rect.right <= result.layout.safeBounds.right);
    assert.ok(rect.top >= result.layout.safeBounds.top);
    assert.ok(rect.bottom <= result.layout.safeBounds.bottom);
  }
});

test("obstacle reflow avoids the obstacle without resizing or reordering the reveal", () => {
  const obstacle = { id: "countdown", rect: { left: 132, top: 310, right: 258, bottom: 374 } };
  const result = calculatePublicStageLayout(input({ obstacles: [obstacle] }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  for (const rect of [result.layout.announcement, result.layout.card, result.layout.activity]) {
    assert.equal(rect.left < obstacle.rect.right && rect.right > obstacle.rect.left
      && rect.top < obstacle.rect.bottom && rect.bottom > obstacle.rect.top, false);
  }
  assert.ok(result.layout.announcement.bottom <= result.layout.card.top);
  assert.ok(result.layout.card.bottom <= result.layout.activity.top);
  assert.deepEqual([result.layout.card.right - result.layout.card.left, result.layout.card.bottom - result.layout.card.top], [90, 135]);
  assert.deepEqual(result.layout.protectedRects, [obstacle]);
});

test("impossible measured geometry and non-reveal phases fail closed", () => {
  const impossible = calculatePublicStageLayout(input({
    table: { left: 0, top: 0, right: 150, bottom: 180 },
  }));
  assert.deepEqual(impossible, {
    status: "unavailable",
    identity: JSON.stringify(["room-1", "root-event-1", null, "event-1", "card-1", "viewer-1", "REVEAL", 1]),
    reason: "NO_SAFE_STACK",
  });
  const parked = calculatePublicStageLayout(input({ scene: { ...scene, phase: "PARKED" } }));
  assert.equal(parked.status, "unavailable");
  assert.equal(parked.reason, "PHASE_NOT_REVEAL");
});
