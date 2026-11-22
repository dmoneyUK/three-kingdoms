import test from "node:test";
import assert from "node:assert/strict";
import {
  latestProvenPublicEventSequence,
  publicDismantleSettlementIdentityFromEvent,
  publicDismantleSettlementRetirementKey,
  publicDismantleSettlementRetirementReason,
} from "../game/public-target-card-settlement-lifecycle.ts";

const identity = {
  roomCode: "ROOM",
  eventId: "dismantle-settlement",
  rootEventId: "dismantle-root",
  actionRevision: "revision-5",
  turnSeat: 0,
  sourceSeat: 0,
  publicSequence: 18,
};

const progress = (patch = {}) => ({
  roomCode: "ROOM",
  status: "playing",
  actionRevision: "revision-5",
  turnSeat: 0,
  liveRootEventId: null,
  latestPublicSequence: 18,
  ...patch,
});

test("a currently-owned result survives temporary H4 occlusion", () => {
  // Visibility is intentionally absent from server ownership. The rendered
  // H4 read timer pauses while hidden and resumes when the same owner returns.
  assert.equal(publicDismantleSettlementRetirementReason(identity, progress()), null);
});

test("a genuine next turn retires the result even when the successor root is null", () => {
  assert.equal(publicDismantleSettlementRetirementReason(identity, progress({ turnSeat: 1 })), "turn-advanced");
});

test("a later proven public fact or Discard sequence retires the old result", () => {
  assert.equal(publicDismantleSettlementRetirementReason(identity, progress({ latestPublicSequence: 19 })), "newer-public-event");
});

test("server action advancement and a different live root retire the result", () => {
  assert.equal(publicDismantleSettlementRetirementReason(identity, progress({ actionRevision: "revision-6" })), "action-advanced");
  assert.equal(publicDismantleSettlementRetirementReason(identity, progress({ liveRootEventId: "new-root" })), "different-live-root");
});

test("a late observer cannot activate a settlement after its source turn has advanced", () => {
  const lateIdentity = { ...identity, turnSeat: 1 };
  assert.equal(publicDismantleSettlementRetirementReason(lateIdentity, progress({ turnSeat: 1 })), "turn-advanced");
});

test("a retired event stays retired across an older poll or duplicate read", () => {
  assert.equal(publicDismantleSettlementRetirementReason(identity, progress(), new Set([publicDismantleSettlementRetirementKey(identity)])), "already-retired");
});

test("settlement identity requires a public committed event in the source player's turn", () => {
  const input = {
    roomCode: "ROOM", eventId: identity.eventId, rootEventId: identity.rootEventId,
    actionRevision: "revision-5", turnSeat: 0, sourceSeat: 0, status: "playing",
    event: { id: identity.eventId, type: "card", action: "discard", publicSequence: 18 },
  };
  assert.deepEqual(publicDismantleSettlementIdentityFromEvent(input), identity);
  assert.equal(publicDismantleSettlementIdentityFromEvent({ ...input, turnSeat: 1 }), null);
  assert.equal(publicDismantleSettlementIdentityFromEvent({ ...input, event: { ...input.event, privateToPlayerId: "viewer" } }), null);
});

test("only validated public facts, public card actions and proven discard transitions advance ownership", () => {
  const timeline = [
    { id: "settlement", type: "card", action: "discard", publicSequence: 18 },
    { id: "private-tail", type: "message", publicSequence: 99, privateToPlayerId: "viewer" },
    { id: "public-play", type: "card", action: "play", card: { id: "physical-card" }, publicSequence: 20 },
    { id: "discard", type: "cards", action: "discard", cards: [{ id: "discarded-card" }], publicSequence: 21 },
    { id: "unproven-tail", type: "message", publicSequence: 100 },
  ];
  const latest = latestProvenPublicEventSequence({
    timeline,
    publicOutcomeFacts: [
      { semantics: "PROVEN", visibility: "PUBLIC", eventId: "public-play", order: 20, rootEventId: "root" },
      { semantics: "PRIVATE", visibility: "PUBLIC", eventId: "unproven-tail", order: 100, rootEventId: "root" },
    ],
    validatedPublicDiscardEventIds: new Set(["discard"]),
    validatedPublicSettlementEventIds: new Set(["settlement"]),
  });
  assert.equal(latest, 21);
});

test("duplicate or out-of-order server events cannot claim public ownership", () => {
  const latest = latestProvenPublicEventSequence({
    timeline: [
      { id: "duplicate", type: "card", action: "play", card: { id: "card-a" }, publicSequence: 80 },
      { id: "duplicate", type: "card", action: "play", card: { id: "card-b" }, publicSequence: 81 },
      { id: "fact-mismatch", type: "message", publicSequence: 90 },
    ],
    publicOutcomeFacts: [{ semantics: "PROVEN", visibility: "PUBLIC", eventId: "fact-mismatch", order: 89, rootEventId: "root" }],
    validatedPublicDiscardEventIds: new Set(),
    validatedPublicSettlementEventIds: new Set(),
  });
  assert.equal(latest, null);
});
