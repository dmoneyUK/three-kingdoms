import assert from "node:assert/strict";
import test from "node:test";
import { latestPublicMessages } from "../game/messages.js";

const describe = (event) => event.message ?? `${event.player} plays ${event.card}`;

test("game messages retain the latest five public timeline entries", () => {
  const timeline = Array.from({ length: 12 }, (_, index) => ({ id: `event-${index}`, type: "message", message: `Message ${index}` }));
  assert.deepEqual(latestPublicMessages(timeline, describe).map((entry) => entry.message), Array.from({ length: 5 }, (_, index) => `Message ${index + 7}`));
});

test("game messages deduplicate polling and omit private draw messages", () => {
  const timeline = [
    { id: "card-1", type: "card", player: "A", card: "Attack" },
    { id: "message-1", type: "message", message: "A plays Attack on B" },
    { id: "message-1", type: "message", message: "A plays Attack on B" },
    { id: "private-1", type: "message", message: "B draws two cards", drawPlayerId: "b" },
  ];
  assert.deepEqual(latestPublicMessages(timeline, describe).map((entry) => entry.id), ["card-1", "message-1"]);
});
