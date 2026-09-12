import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GameRoom } from "../app/page.tsx";
import { normalizeRoomData } from "../game/room-safety.js";

const card = (id, kind = "Attack") => ({ id, kind, suit: "♠", rank: "A" });

test("normalized malformed room state renders through GameRoom", () => {
  const room = normalizeRoomData({
    code: "SAFE1", status: "playing", maxPlayers: 4, isHost: true, isTestController: false, meId: "p1", myRole: "Lord", myHeroOptions: null,
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: null, judgementCards: [null, card("judgement")], attackRange: 1, distance: null, isHost: true, role: "Lord" }, null],
    myHand: [card("hand"), null], turnSeat: 0, phase: "play", deckCount: 40, discardTop: null, log: null,
    timeline: [null, { type: "card", card: null }, { type: "message", message: "Safe" }],
    pendingAttack: null, pendingGreenDragon: { kind: "green_dragon", sourceId: "p1" }, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null,
    pendingGroup: null, pendingNegation: null, pendingHarvest: { kind: "harvest", revealed: [null, card("revealed")], choices: null }, pendingTargetCard: null, pendingDying: null,
  });
  assert.ok(room);
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(html, /TURN OWNER/);
  assert.match(html, /Attack/);
  assert.doesNotMatch(html, /Cannot read properties of null/);
});

test("unknown response state never renders a generic damage action", () => {
  const room = normalizeRoomData({
    code: "SAFE2", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" }],
    myHand: [], turnSeat: 0, phase: "response", deckCount: 0, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Waiting", isMyAction: true,
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null, pendingNegation: null, pendingHarvest: null, pendingTargetCard: null, pendingDying: null,
  });
  assert.ok(room);
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.doesNotMatch(html, /Skip · take 1 damage/);
  assert.match(html, /Waiting for the latest response state/);
});

test("a normalized Negation response retains its legal controls", () => {
  const room = normalizeRoomData({
    code: "SAFE3", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" }],
    myHand: [card("negation", "Negation")], turnSeat: 0, phase: "response", deckCount: 0, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play Negation or pass", isMyAction: true,
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null,
    pendingNegation: { kind: "negation", sourceId: "p1", actorId: "p1", effectTargetId: "p1", cardName: "Something Out of Nothing", responseTarget: "Something Out of Nothing's effect on ME", negated: false, deadline: 0 },
    pendingHarvest: null, pendingTargetCard: null, pendingDying: null,
  });
  assert.ok(room?.pendingNegation, "the normalizer must keep a valid public Negation DTO");
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(html, /Play Negation/);
  assert.match(html, /Skip response/);
  assert.doesNotMatch(html, /Waiting for the latest response state/);
});
