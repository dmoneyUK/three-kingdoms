import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GameRoom } from "../app/page.tsx";
import { normalizeRoomData } from "../game/room-safety.js";

const card = (id, kind = "Attack") => ({ id, kind, suit: "♠", rank: "A" });

test("normalized malformed and unknown response states render safely", () => {
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
  assert.match(html, /game-exit/);
  assert.match(html, /Attack/);
  assert.doesNotMatch(html, /Cannot read properties of null/);
  const waitingRoom = normalizeRoomData({
    code: "SAFE2", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" }],
    myHand: [], turnSeat: 0, phase: "response", deckCount: 0, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Waiting", isMyAction: true,
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null, pendingNegation: null, pendingHarvest: null, pendingTargetCard: null, pendingDying: null,
  });
  assert.ok(waitingRoom);
  const waitingHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: waitingRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.doesNotMatch(waitingHtml, /Skip · take 1 damage/);
  assert.match(waitingHtml, /Waiting for the latest response state/);

  const pickerRoom = normalizeRoomData({
    code: "SAFE-PICKER", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [
      { id: "p1", name: "ME", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "TARGET", seat: 1, hero: "guan-yu", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 0, equipmentCards: [card("armor", "NioShield")], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: [], turnSeat: null, phase: "response", deckCount: 0, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Use Frost Sword", isMyAction: true,
    pending: { kind: "trigger" }, currentAction: { version: 3, kind: "trigger", actorId: "p1", deadline: 0, reason: "Use Frost Sword", legalActions: ["trigger", "decline_trigger"], triggerEvent: "damage_about_to_apply", triggerOptions: [{ effectId: "frost_sword_damage_about_to_apply", label: "Use Frost Sword", selection: { type: "target_cards", targetId: "p2", min: 1, max: 2, eligibleKeys: ["hand:3", "hand:0", "hand:1", "hand:2", "not-eligible", "armor"] } }], declineAction: "decline_trigger" },
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null, pendingNegation: null, pendingHarvest: null, pendingTargetCard: null, pendingBorrowedSword: null, pendingDying: null,
  });
  const pickerHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: pickerRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.equal((pickerHtml.match(/aria-label="Hidden hand card \d+"/g) ?? []).length, 4, "target_cards renders every eligible hidden hand key without using handCount");
  assert.match(pickerHtml, /aria-label="Nio Shield/);
  assert.doesNotMatch(pickerHtml, /not-eligible/);
});

test("a normalized Negation response retains its legal controls", () => {
  const room = normalizeRoomData({
    code: "SAFE3", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" }],
    myHand: [card("negation", "Negation")], turnSeat: 0, phase: "response", deckCount: 0, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play Negation or pass", isMyAction: true,
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null,
    pending: { kind: "negation" }, currentAction: { version: 1, kind: "negation", actorId: "p1", deadline: 0, reason: "Play Negation or pass", legalActions: ["respond", "decline_response"] },
    pendingNegation: { kind: "negation", sourceId: "p1", actorId: "p1", effectTargetId: "p1", cardName: "Something Out of Nothing", responseTarget: "Something Out of Nothing's effect on ME", negated: false, deadline: 0 },
    pendingHarvest: null, pendingTargetCard: null, pendingDying: null,
  });
  assert.ok(room?.pendingNegation, "the normalizer must keep a valid public Negation DTO");
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(html, /Play Negation/);
  assert.match(html, /Skip response/);
  assert.doesNotMatch(html, /Waiting for the latest response state/);
});
