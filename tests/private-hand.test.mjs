import assert from "node:assert/strict";
import test from "node:test";
import { baselineHand, pendingPrivateHandCardIds, updatePrivateHand } from "../game/private-hand.js";

const card = (id) => ({ id, kind: "Attack", suit: "♠", rank: "A" });
const arrival = (eventId, playerId, cardId, { now = 10_000, initialDeal = false, sourceZone = "deck", overrides = {} } = {}) => ({
  id: eventId,
  type: "card",
  presentation: false,
  action: sourceZone === "deck" ? "draw" : "gain",
  card: card(cardId),
  privateToPlayerId: playerId,
  ...(initialDeal ? { initialDeal: true } : {}),
  privateHandTransfer: {
    semantics: "PRIVATE_PROVEN",
    transferId: eventId,
    cardId,
    recipientId: playerId,
    sourceZone,
    destinationZone: "hand",
    committedAt: now - 100,
    revealUntil: now + 2_900,
    ...overrides,
  },
});

test("a newly committed transfer is shown once and the receipt is tied to its real Hand card", () => {
  const previous = baselineHand("me", [card("old")], [], { now: 10_000 });
  const events = [arrival("gain-1", "me", "transferred", { now: 10_000, sourceZone: "hand" })];
  let result = updatePrivateHand(previous, "me", [card("old"), card("transferred")], events, { now: 10_000 });
  assert.deepEqual(result.drawn.map((item) => item.id), ["transferred"]);
  assert.deepEqual(result.presentedTransferIds, ["gain-1"]);
  result = updatePrivateHand(result.baseline, "me", [card("old"), card("transferred")], events, { now: 10_000 });
  assert.deepEqual(result.drawn, [], "polling the same committed transfer cannot show it twice");
});

test("a refresh baseline admits only unseen, still-current recipient arrivals", () => {
  const now = 10_000;
  const events = [
    arrival("fresh", "me", "fresh-card", { now }),
    arrival("expired", "me", "old-card", { now: now - 10_000 }),
    arrival("already-seen", "me", "seen-card", { now }),
  ];
  const previous = baselineHand("me", [card("old-card"), card("seen-card")], events, { now, seenTransferIds: new Set(["already-seen"]) });
  const result = updatePrivateHand(previous, "me", [card("old-card"), card("seen-card"), card("fresh-card")], events, { now, seenTransferIds: new Set(["already-seen"]) });
  assert.deepEqual(result.drawn.map((item) => item.id), ["fresh-card"]);
  assert.deepEqual(result.presentedTransferIds, ["fresh"]);
});

test("TEST SWITCH establishes a seat-private baseline and only preserves live initial-deal handling", () => {
  const previous = baselineHand("p1", [card("p1-old")], [], { now: 10_000 });
  const events = [
    arrival("p2-gain", "p2", "p2-gained", { now: 10_000, sourceZone: "equipment" }),
    arrival("p2-deal", "p2", "p2-dealt", { now: 10_000, initialDeal: true }),
  ];
  const result = updatePrivateHand(previous, "p2", [card("p2-old"), card("p2-gained"), card("p2-dealt")], events, { now: 10_000 });
  assert.equal(result.switched, true);
  assert.deepEqual(result.drawn.map((item) => item.id), ["p2-dealt"]);
  assert.deepEqual(result.ignoredTransferIds, ["p2-gain"]);
  assert.deepEqual([...result.baseline.cardIds], ["p2-old", "p2-gained", "p2-dealt"]);
  const nextPoll = updatePrivateHand(result.baseline, "p2", [card("p2-old"), card("p2-gained"), card("p2-dealt")], events, { now: 10_100 });
  assert.deepEqual(nextPoll.drawn, [], "the new seat does not replay a pre-switch committed gain on its next poll");
  assert.deepEqual(nextPoll.baseline.presentedTransferIds, ["p2-gain", "p2-deal"]);
});

test("pending private arrivals stay out of the Hand rail until their CardFace stage or expiry", () => {
  const now = 10_000;
  const events = [
    arrival("active", "me", "active-card", { now }),
    arrival("expired", "me", "expired-card", { now: now - 10_000 }),
    arrival("other-viewer", "p2", "other-card", { now }),
  ];
  assert.deepEqual([...pendingPrivateHandCardIds("me", [card("active-card"), card("expired-card"), card("other-card")], events, { now })], ["active-card"]);
  assert.deepEqual([...pendingPrivateHandCardIds("me", [card("active-card")], events, { now, seenTransferIds: new Set(["active"]) })], []);
});

test("unproven, mismatched, duplicate, and nonrecipient transfers fail closed", () => {
  const previous = baselineHand("me", [], [], { now: 10_000 });
  const valid = arrival("same", "me", "one", { now: 10_000 });
  const mismatched = arrival("wrong-card", "me", "two", { now: 10_000, overrides: { cardId: "different" } });
  const unproven = { ...arrival("unproven", "me", "three", { now: 10_000 }), privateHandTransfer: { semantics: "UNPROVEN" } };
  const other = arrival("other-seat", "p2", "four", { now: 10_000 });
  const duplicateCard = arrival("duplicate", "me", "one", { now: 10_000 });
  const result = updatePrivateHand(previous, "me", [card("one"), card("two"), card("three"), card("four")], [valid, mismatched, unproven, other, duplicateCard], { now: 10_000 });
  assert.deepEqual(result.drawn.map((item) => item.id), ["one"]);
  assert.deepEqual(result.presentedTransferIds, ["same"]);
});

test("an initial-deal event stays seat scoped and expires instead of replaying on refresh", () => {
  const now = 10_000;
  const deal = arrival("deal-me", "me", "opening", { now, initialDeal: true });
  const previous = baselineHand("me", [card("opening")], [deal], { now: now + 5_000 });
  const stale = updatePrivateHand(previous, "me", [card("opening")], [deal], { now: now + 5_000 });
  assert.deepEqual(stale.drawn, []);
  const otherSeat = updatePrivateHand(previous, "p2", [card("p2-opening")], [deal], { now });
  assert.equal(otherSeat.switched, true);
  assert.deepEqual(otherSeat.drawn, []);
});
