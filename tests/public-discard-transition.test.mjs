import assert from "node:assert/strict";
import test from "node:test";
import { publicDiscardAnnouncement, routePublicDiscardTransition } from "../app/public-discard-transition.ts";
import { layoutPublicResultCards } from "../app/public-result-layout.ts";

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

test("discard H4 lists every committed physical card in order and falls back to count-only for incomplete identity", () => {
  const cards = [
    { id: "first-attack", kind: "Attack", rank: "A", suit: "♠" },
    { id: "second-attack", kind: "Attack", rank: "A", suit: "♠" },
    { id: "peach", kind: "Peach", rank: "10", suit: "♥" },
  ];
  const input = setup({ cards, transitions: cards.map((card) => transition("committed-discard", card.id, { zone: "HAND", ownerId: actorId })) });
  const route = routePublicDiscardTransition(input);
  const announcement = publicDiscardAnnouncement({ event: input.event, route, players: [{ id: actorId, name: "Player One" }] });
  assert.deepEqual(announcement.cards, [
    { id: "first-attack", name: "Attack", rank: "A", suit: "♠" },
    { id: "second-attack", name: "Attack", rank: "A", suit: "♠" },
    { id: "peach", name: "Peach", rank: "10", suit: "♥" },
  ]);
  assert.equal(announcement.headline, "Player One discarded 3 cards: A♠ Attack · A♠ Attack · 10♥ Peach.");

  const incompleteCards = [{ id: "unknown-face", kind: "Attack" }];
  const incomplete = setup({ cards: incompleteCards, eventType: "card", transitions: [transition("committed-discard", "unknown-face", { zone: "HAND", ownerId: actorId })] });
  const fallback = publicDiscardAnnouncement({ event: incomplete.event, route: routePublicDiscardTransition(incomplete), players: [{ id: actorId, name: "Player One" }] });
  assert.equal(fallback.headline, "Player One discarded 1 card.");
  assert.equal(fallback.cards, null);
});

test("complete discard H4 retains exact rank, suit, name, identity and order for one and seven cards", () => {
  const ranks = ["A", "2", "3", "4", "5", "6", "7"];
  const suits = ["♠", "♣", "♥", "♦", "♠", "♣", "♥"];
  for (const count of [1, 7]) {
    const cards = Array.from({ length: count }, (_, index) => ({
      id: `card-${index}`, kind: index % 2 ? "Attack" : "Dodge", rank: ranks[index], suit: suits[index],
    }));
    const input = setup({ cards, eventType: count === 1 ? "card" : "cards",
      transitions: cards.map((card) => transition("committed-discard", card.id, { zone: "HAND", ownerId: actorId })) });
    const route = routePublicDiscardTransition(input);
    const announcement = publicDiscardAnnouncement({ event: input.event, route, players: [{ id: actorId, name: "Player One" }] });
    assert.deepEqual(announcement.cards, cards.map((card) => ({ id: card.id, name: card.kind, rank: card.rank, suit: card.suit })));
    assert.match(announcement.headline, new RegExp(`discarded ${count} ${count === 1 ? "card" : "cards"}:`));
  }
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
  const cards = [{ id: "first-card", kind: "Attack" }, { id: "second-card", kind: "Peach" }];
  const transitions = cards.map((card) => transition("committed-discard", card.id, { zone: "HAND", ownerId: actorId }));
  const input = setup({ cards, transitions });
  const mismatch = { ...input.event, cards: [{ id: "different-card", kind: "Peach" }] };
  assert.equal(routePublicDiscardTransition({ ...input, timeline: [mismatch] }), null);
  const reorderedEvent = { ...input.event, cards: [...cards].reverse() };
  assert.equal(routePublicDiscardTransition({ ...input, timeline: [reorderedEvent] }), null,
    "the active event and authoritative timeline must agree on card order");
  assert.equal(routePublicDiscardTransition({ ...input, event: reorderedEvent, timeline: [reorderedEvent] }), null,
    "H4 card order must match the same committed event's physical card order");
  const reorderedTransitions = { ...input.event, publicZoneTransitions: [...transitions].reverse() };
  assert.equal(routePublicDiscardTransition({ ...input, event: reorderedTransitions, timeline: [reorderedTransitions] }), null,
    "the displayed CardFace group must retain the committed order too");
  const duplicate = { ...input.event };
  assert.equal(routePublicDiscardTransition({ ...input, timeline: [input.event, duplicate] }), null);
});

test("3–5 committed discard cards fit in one neutral presentation row without collisions", () => {
  const obstacles = [
    { left: 0, top: 0, right: 390, bottom: 96 },
    { left: 35, top: 400, right: 355, bottom: 448 },
    { left: 145, top: 490, right: 245, bottom: 535 },
  ];
  for (const count of [3, 4, 5]) {
    const layout = layoutPublicResultCards(count, { width: 390, height: 560 }, obstacles);
    assert.ok(layout, `${count} cards should fit around phone seats, H4 and PAC`);
    assert.equal(layout.rows, 1);
    assert.equal(layout.placements.length, count);
    assert.ok(layout.placements.every(({ centerX, centerY }) => centerX >= layout.cardWidth / 2
      && centerX + layout.cardWidth / 2 <= 390
      && centerY >= layout.cardHeight / 2 && centerY + layout.cardHeight / 2 <= 560));
    for (let first = 0; first < count; first += 1) for (let second = first + 1; second < count; second += 1) {
      const a = layout.placements[first];
      const b = layout.placements[second];
      const overlaps = Math.abs(a.centerX - b.centerX) < layout.cardWidth
        && Math.abs(a.centerY - b.centerY) < layout.cardHeight;
      assert.equal(overlaps, false, `${count} card positions must not overlap`);
    }
    for (const { centerX, centerY } of layout.placements) {
      const box = { left: centerX - layout.cardWidth / 2, right: centerX + layout.cardWidth / 2,
        top: centerY - layout.cardHeight / 2, bottom: centerY + layout.cardHeight / 2 };
      assert.equal(obstacles.some((obstacle) => box.left < obstacle.right && box.right > obstacle.left
        && box.top < obstacle.bottom && box.bottom > obstacle.top), false,
      `${count} card positions must avoid Seats, H4 and PAC`);
    }
  }
});

test("larger committed discard groups use two rows while keeping all cards inside the measured table", () => {
  const layout = layoutPublicResultCards(8, { width: 390, height: 560 }, [
    { left: 0, top: 0, right: 390, bottom: 92 },
    { left: 20, top: 490, right: 370, bottom: 550 },
  ]);
  assert.ok(layout);
  assert.equal(layout.rows, 2);
  assert.equal(layout.placements.length, 8);
  assert.ok(layout.placements.every(({ centerX, centerY }) => centerX - layout.cardWidth / 2 >= 0
    && centerX + layout.cardWidth / 2 <= 390
    && centerY - layout.cardHeight / 2 >= 0 && centerY + layout.cardHeight / 2 <= 560));
});
