import assert from "node:assert/strict";
import test from "node:test";
import { routePublicDiscardTransition } from "../app/public-discard-transition.ts";

const actorId = "player-1";
const discard = { zone: "DISCARD", ownerId: null };

function transition(eventId, physicalCardId, from) {
  return {
    semantics: "PROVEN", visibility: "PUBLIC", eventId, sourceEventId: eventId,
    rootEventId: eventId, physicalCardId, from, to: discard,
  };
}

function setup({ cards, transitions, eventType = "cards", overrides = {} }) {
  const event = {
    id: "committed-discard", type: eventType, action: "discard", actorId,
    publicSequence: 18, presentation: true, ...(eventType === "card" ? { card: cards[0] } : { cards }),
    publicZoneTransitions: transitions, ...overrides,
  };
  return {
    event, timeline: [event], roomCode: "ROOM", viewerId: "viewer-2",
  };
}

test("committed public discard routes every exact card from its server-proven source to Discard", () => {
  const cards = [
    { id: "hand-card", kind: "Attack" },
    { id: "weapon-card", kind: "FrostSword" },
    { id: "judgement-card", kind: "Lightning" },
  ];
  const input = setup({
    cards,
    transitions: [
      transition("committed-discard", "hand-card", { zone: "HAND", ownerId: actorId }),
      transition("committed-discard", "weapon-card", { zone: "EQUIPMENT", ownerId: actorId, slot: "weapon" }),
      transition("committed-discard", "judgement-card", { zone: "JUDGEMENT", ownerId: actorId }),
    ],
  });
  const route = routePublicDiscardTransition(input);
  assert.equal(route.kind, "public-discard-transition");
  assert.equal(route.eventId, input.event.id);
  assert.deepEqual(route.transitions.map(({ physicalCardId }) => physicalCardId), cards.map(({ id }) => id));
  assert.deepEqual(route.transitions.map(({ to }) => to), [discard, discard, discard]);
});

test("single public discard routes and replayed events do not claim twice", () => {
  const card = { id: "single-card", kind: "Peach" };
  const input = setup({
    cards: [card], eventType: "card",
    transitions: [transition("committed-discard", card.id, { zone: "HAND", ownerId: actorId })],
  });
  assert.equal(routePublicDiscardTransition(input).kind, "public-discard-transition");
  assert.equal(routePublicDiscardTransition({ ...input, retiredTransitionIds: [input.event.id] }), null);
});

test("a committed play root is not double-claimed by the generic discard route", () => {
  const card = { id: "played-root", kind: "Duel" };
  const input = setup({
    cards: [card], eventType: "card",
    transitions: [transition("committed-discard", card.id, { zone: "HAND", ownerId: actorId })],
    overrides: { action: "play" },
  });
  assert.equal(routePublicDiscardTransition(input), null,
    "E15 stays with its current public root Journey; M4 must not claim the same CardFace again");
});

test("private, Dismantle, R4-owned, mismatched, duplicate, or incomplete proof fails closed", () => {
  const card = { id: "physical-card", kind: "Attack" };
  const validTransition = transition("committed-discard", card.id, { zone: "HAND", ownerId: actorId });
  const valid = setup({ cards: [card], transitions: [validTransition] });
  assert.equal(routePublicDiscardTransition({ ...valid, event: { ...valid.event, privateToPlayerId: actorId }, timeline: [{ ...valid.event, privateToPlayerId: actorId }] }), null);
  assert.equal(routePublicDiscardTransition({ ...valid, event: { ...valid.event, publicDismantleSettlement: { semantics: "PROVEN" } }, timeline: [{ ...valid.event, publicDismantleSettlement: { semantics: "PROVEN" } }] }), null);
  assert.equal(routePublicDiscardTransition({ ...valid, event: { ...valid.event, publicCardEffects: [{ semantics: "PROVEN" }] }, timeline: [{ ...valid.event, publicCardEffects: [{ semantics: "PROVEN" }] }] }), null);
  assert.equal(routePublicDiscardTransition(setup({ cards: [card], transitions: [transition("wrong-event", card.id, { zone: "HAND", ownerId: actorId })] })), null);
  assert.equal(routePublicDiscardTransition(setup({ cards: [card], transitions: [transition("committed-discard", card.id, { zone: "HAND", ownerId: "other-player" })] })), null);
  assert.equal(routePublicDiscardTransition(setup({ cards: [card], transitions: [validTransition, validTransition] })), null);
  assert.equal(routePublicDiscardTransition(setup({ cards: [card], transitions: [null] })), null);
  assert.equal(routePublicDiscardTransition(setup({ cards: [null], transitions: [validTransition] })), null);
  assert.equal(routePublicDiscardTransition(setup({ cards: [card], transitions: [transition("committed-discard", card.id, { zone: "EQUIPMENT", ownerId: actorId })] })), null);
  assert.equal(routePublicDiscardTransition(setup({ cards: [card], transitions: [] })), null);
});

test("timeline identity must match the active event's actor, sequence, and physical cards", () => {
  const card = { id: "physical-card", kind: "Attack" };
  const input = setup({ cards: [card], transitions: [transition("committed-discard", card.id, { zone: "HAND", ownerId: actorId })] });
  const mismatch = { ...input.event, cards: [{ id: "different-card", kind: "Peach" }] };
  assert.equal(routePublicDiscardTransition({ ...input, timeline: [mismatch] }), null);
  const duplicate = { ...input.event };
  assert.equal(routePublicDiscardTransition({ ...input, timeline: [input.event, duplicate] }), null);
});
