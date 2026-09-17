import assert from "node:assert/strict";
import test from "node:test";
import { latestPublicMessages } from "../game/messages.js";

const describe = (event) => event.message ?? `${event.player} plays ${event.card}`;

test("game messages retain public history, rich card descriptions, and privacy", () => {
  const timeline = Array.from({ length: 12 }, (_, index) => ({ id: `event-${index}`, type: "message", message: `Message ${index}` }));
  assert.deepEqual(latestPublicMessages(timeline, describe).map((entry) => entry.message), Array.from({ length: 10 }, (_, index) => `Message ${index + 2}`));
  const cardTimeline = [{ id: "equip-1", type: "card", action: "equip", player: "ME", card: { rank: "2", suit: "♠", kind: "EightTrigrams" } }];
  const describeCard = (event) => event.action === "equip" ? `${event.player} equips ${event.card.rank}${event.card.suit} Eight Trigrams Formation.` : "";
  assert.deepEqual(latestPublicMessages(cardTimeline, describeCard).map((entry) => entry.message), ["ME equips 2♠ Eight Trigrams Formation."]);
  const mixed = [{ id: "card-1", type: "card", player: "A", card: "Attack" }, { id: "message-1", type: "message", message: "A plays Attack on B" }, { id: "message-1", type: "message", message: "A plays Attack on B" }, { id: "private-1", type: "message", message: "B draws two cards", drawPlayerId: "b" }];
  assert.deepEqual(latestPublicMessages(mixed, describe).map((entry) => entry.id), ["card-1", "message-1"]);
});
