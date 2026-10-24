import test from "node:test";
import assert from "node:assert/strict";
import { publicHeroCostAnnouncementLifecycle } from "../game/public-hero-cost-lifecycle.ts";

const lifecycle = ({ timelineEventIds, retiredEventIds = new Set(), currentRootEventId = null, candidateRoomCode = "ROOM" }) =>
  publicHeroCostAnnouncementLifecycle({
    roomCode: "ROOM",
    candidateRoomCode,
    candidateEventId: "hua-cost",
    timelineEventIds,
    retiredEventIds,
    currentRootEventId,
  });

test("a fresh proved Hero cost may announce until read or superseded by a newer public root", () => {
  assert.deepEqual(lifecycle({ timelineEventIds: ["hua-cost"] }), { status: "active", eventIndex: 0 });
  assert.deepEqual(lifecycle({ timelineEventIds: ["hua-cost"], retiredEventIds: new Set(["hua-cost"]) }), {
    status: "read", eventIndex: 0,
  });
  assert.deepEqual(lifecycle({ timelineEventIds: ["hua-cost", "attack-root"], currentRootEventId: "attack-root" }), {
    status: "superseded", eventIndex: 0, supersedingEventId: "attack-root",
  });
  assert.deepEqual(lifecycle({
    timelineEventIds: ["hua-cost", "attack-root"], retiredEventIds: new Set(["hua-cost"]), currentRootEventId: "attack-root",
  }), {
    status: "superseded", eventIndex: 0, supersedingEventId: "attack-root",
  });
});

test("old, same-event and unavailable roots cannot retire a fresher cost or revive duplicate proof", () => {
  assert.deepEqual(lifecycle({ timelineEventIds: ["old-root", "hua-cost"], currentRootEventId: "old-root" }), {
    status: "active", eventIndex: 1,
  });
  assert.deepEqual(lifecycle({ timelineEventIds: ["hua-cost"], currentRootEventId: "hua-cost" }), {
    status: "active", eventIndex: 0,
  });
  assert.deepEqual(lifecycle({ timelineEventIds: ["hua-cost", "hua-cost"] }), { status: "unavailable" });
  assert.deepEqual(lifecycle({ timelineEventIds: ["hua-cost"], candidateRoomCode: "OTHER" }), { status: "unavailable" });
  assert.deepEqual(lifecycle({ timelineEventIds: ["hua-cost"], currentRootEventId: "missing-root" }), { status: "unavailable" });
});
