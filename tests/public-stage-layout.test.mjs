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

test("REVEAL anchors the shared PAC to the measured Console top without moving H4 or the full card over it", () => {
  const consoleTop = 482;
  const result = calculatePublicStageLayout(input({
    viewport: { left: 0, top: 0, right: 390, bottom: 700 },
    table: { left: 0, top: 0, right: 390, bottom: 470 },
    activityBottom: consoleTop,
    preferredCard: { left: 150, top: 250 },
    obstacles: [{ id: "console-guidance", rect: { left: 0, top: consoleTop, right: 390, bottom: 560 } }],
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  const { announcement, card, activity } = result.layout;
  assert.equal(activity.bottom, consoleTop);
  assert.equal((activity.left + activity.right) / 2, 195);
  assert.ok(activity.top - card.bottom >= 8);
  assert.ok(announcement.bottom <= card.top);
  assert.equal(activity.bottom > 470, true, "PAC uses the real gap below the battlefield border");
  assert.equal(activity.top < 560 && activity.bottom > consoleTop, false);
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

test("impossible reveal geometry fails closed", () => {
  const impossible = calculatePublicStageLayout(input({
    table: { left: 0, top: 0, right: 150, bottom: 180 },
  }));
  assert.deepEqual(impossible, {
    status: "unavailable",
    identity: JSON.stringify(["room-1", "root-event-1", null, "event-1", "card-1", "viewer-1", "REVEAL", 1]),
    reason: "NO_SAFE_STACK",
  });
});

test("MOVE preserves the validated reveal H4 band until the card leaves its 380ms route", () => {
  const card = { left: 150, top: 350, right: 180, bottom: 395 };
  const activity = { left: 85, top: 700, right: 305, bottom: 744 };
  const route = { left: 18, top: 182, right: 180, bottom: 395 };
  const announcement = { left: 75, top: 310, right: 315, bottom: 362 };
  const countdown = { left: 340, top: 370, right: 380, bottom: 410 };
  const result = calculatePublicStageLayout(input({
    scene: { ...scene, phase: "MOVE", generation: 2 },
    card: { width: 30, height: 45 },
    obstacles: [{ id: "primary-card-move-path", rect: route }, { id: "countdown", rect: countdown }],
    phaseRects: { card, activity, announcement },
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  assert.equal(result.layout.scene.phase, "MOVE");
  assert.deepEqual(result.layout.card, card);
  assert.deepEqual(result.layout.activity, activity);
  assert.deepEqual(result.layout.announcement, announcement);
  assert.equal(result.layout.announcement.left < route.right && result.layout.announcement.right > route.left
    && result.layout.announcement.top < route.bottom && result.layout.announcement.bottom > route.top, true);
  assert.equal(result.layout.announcement.left < activity.right && result.layout.announcement.right > activity.left
    && result.layout.announcement.top < activity.bottom && result.layout.announcement.bottom > activity.top, false);
  assert.equal(result.layout.announcement.left < countdown.right && result.layout.announcement.right > countdown.left
    && result.layout.announcement.top < countdown.bottom && result.layout.announcement.bottom > countdown.top, false);
});

test("MOVE keeps PAC on the measured Console seam while the physical card follows its route", () => {
  const consoleTop = 482;
  const card = { left: 150, top: 350, right: 180, bottom: 395 };
  const activity = { left: 85, top: 700, right: 305, bottom: 744 };
  const route = { left: 18, top: 182, right: 180, bottom: 395 };
  const announcement = { left: 75, top: 310, right: 315, bottom: 362 };
  const result = calculatePublicStageLayout(input({
    scene: { ...scene, phase: "MOVE", generation: 2 },
    viewport: { left: 0, top: 0, right: 390, bottom: 700 },
    table: { left: 0, top: 0, right: 390, bottom: 470 },
    activityBottom: consoleTop,
    card: { width: 30, height: 45 },
    obstacles: [
      { id: "primary-card-move-path", rect: route },
      { id: "console-guidance", rect: { left: 0, top: consoleTop, right: 390, bottom: 560 } },
    ],
    phaseRects: { card, activity, announcement },
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  assert.deepEqual(result.layout.card, card);
  assert.deepEqual(result.layout.announcement, announcement);
  assert.equal(result.layout.activity.bottom, consoleTop);
  assert.ok(result.layout.activity.top - result.layout.card.bottom >= 8);
});

test("PARKED returns H4 to the safe stage centre without moving the authentic card or PAC", () => {
  const card = { left: 14, top: 158, right: 44, bottom: 203 };
  const activity = { left: 85, top: 700, right: 305, bottom: 744 };
  const table = { left: 8, top: 100, right: 382, bottom: 780 };
  const result = calculatePublicStageLayout(input({
    scene: { ...scene, phase: "PARKED", generation: 3 },
    card: { width: 30, height: 45 },
    table,
    phaseRects: { card, activity },
    obstacles: [{ id: "seat", rect: { left: 8, top: 154, right: 192, bottom: 286 } }],
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  assert.equal(result.layout.scene.phase, "PARKED");
  assert.deepEqual(result.layout.card, card);
  assert.deepEqual(result.layout.activity, activity);
  const h4CenterY = (result.layout.announcement.top + result.layout.announcement.bottom) / 2;
  assert.ok(Math.abs(h4CenterY - (table.top + table.bottom) / 2) <= 8);
  for (const obstacle of [...result.layout.protectedRects, { id: "parked-card", rect: card }, { id: "pac", rect: activity }]) {
    assert.equal(result.layout.announcement.left < obstacle.rect.right && result.layout.announcement.right > obstacle.rect.left
      && result.layout.announcement.top < obstacle.rect.bottom && result.layout.announcement.bottom > obstacle.rect.top, false);
  }
});

test("PARKED repositions an unplaced PAC away from Seats into the lower battlefield", () => {
  const card = { left: 35, top: 105, right: 75, bottom: 165 };
  const seats = { left: 8, top: 0, right: 382, bottom: 94 };
  const result = calculatePublicStageLayout(input({
    scene: { ...scene, phase: "PARKED", generation: 3 },
    viewport: { left: 0, top: 0, right: 390, bottom: 700 },
    table: { left: 0, top: 0, right: 390, bottom: 460 },
    card: { width: 40, height: 60 },
    activity: { width: 340, height: 44 },
    phaseRects: { card, activity: { left: 0, top: 0, right: 340, bottom: 44 } },
    obstacles: [{ id: "seats", rect: seats }],
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  assert.deepEqual(result.layout.card, card);
  assert.ok(result.layout.activity.top >= seats.bottom);
  assert.ok(result.layout.activity.bottom <= result.layout.safeBounds.bottom);
  assert.ok(result.layout.activity.top > result.layout.announcement.bottom);
});

test("PARKED centres PAC even when it covers the real parked miniature", () => {
  const card = { left: 32, top: 384, right: 80, bottom: 456 };
  const result = calculatePublicStageLayout(input({
    scene: { ...scene, phase: "PARKED", generation: 4 },
    viewport: { left: 0, top: 0, right: 390, bottom: 700 },
    table: { left: 0, top: 0, right: 390, bottom: 460 },
    activityBottom: 480,
    card: { width: 48, height: 72 },
    activity: { width: 340, height: 44 },
    phaseRects: { card, activity: { left: 0, top: 0, right: 340, bottom: 44 } },
    obstacles: [{ id: "seats", rect: { left: 8, top: 0, right: 382, bottom: 94 } }],
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  assert.equal((result.layout.activity.left + result.layout.activity.right) / 2, 195);
  assert.equal(result.layout.activity.bottom, 480);
  assert.ok(result.layout.activity.left < card.right && result.layout.activity.right > card.left);
  assert.ok(result.layout.activity.top < card.bottom && result.layout.activity.bottom > card.top);
  assert.deepEqual(result.layout.card, card);
});

test("short mobile stage fits a measured wrapped announcement beside the full card", () => {
  const result = calculatePublicStageLayout(input({
    viewport: { left: 0, top: 0, right: 390, bottom: 700 },
    table: { left: 0, top: 0, right: 390, bottom: 360 },
    preferredCard: { left: 110, top: 100 },
    card: { width: 168, height: 190 },
    announcement: { width: 366, height: 48 },
    compactAnnouncement: { width: 198, height: 100 },
    activity: { width: 340, height: 57 },
    obstacles: [{ id: "seats", rect: { left: 0, top: 0, right: 390, bottom: 94 } }],
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  const { card, announcement, activity, variant } = result.layout;
  assert.equal(variant, "compact-split");
  assert.equal(card.right - card.left, 168);
  assert.ok(card.right <= announcement.left || announcement.right <= card.left);
  assert.ok(activity.top >= card.bottom + 8);
  assert.equal((activity.left + activity.right) / 2, 195);
  assert.ok(card.top >= 94 && activity.bottom <= result.layout.safeBounds.bottom);
});
