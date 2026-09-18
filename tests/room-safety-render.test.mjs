import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GameRoom, MandatoryChoiceDialog } from "../app/page.tsx";
import { normalizeRoomData } from "../game/room-safety.js";

const card = (id, kind = "Attack") => ({ id, kind, suit: "♠", rank: "A" });

test("normalized malformed and unknown response states render safely", () => {
  const room = normalizeRoomData({
    code: "SAFE1", status: "playing", maxPlayers: 4, isHost: true, isTestController: false, meId: "p1", myRole: "Lord", myHeroOptions: null,
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: null, judgementCards: [null, card("judgement")], attackRange: 1, distance: null, isHost: true, role: "Lord" }, null],
    myHand: [card("hand"), { ...card("red-hand"), suit: "♥" }], turnSeat: 0, phase: "play", deckCount: 40, discardTop: null, log: null,
    timeline: [null, { type: "card", card: null }, { type: "message", message: "Safe" }],
    pendingAttack: null, pendingGreenDragon: { kind: "green_dragon", sourceId: "p1" }, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null,
    pendingGroup: null, pendingNegation: null, pendingHarvest: { kind: "harvest", revealed: [null, card("revealed")], choices: null }, pendingTargetCard: null, pendingDying: null,
  });
  assert.ok(room);
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(html, /game-exit/);
  assert.match(html, /Attack/);
  assert.match(html, /class="game-card attack black-suit/);
  assert.match(html, /class="game-card attack red-suit/);
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

  const longdanPlayRoom = normalizeRoomData({
    code: "SAFE-LONGDAN-PLAY", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhao-yun", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 2, equipmentCards: [card("weapon", "BlueSteelSword")], judgementCards: [], attackRange: 2, distance: null, isHost: true, role: "Lord" }],
    myHand: [card("longdan-dodge", "Dodge"), card("longdan-attack", "Attack")], turnSeat: 0, phase: "play", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play cards", isMyAction: true,
    currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play cards", legalActions: ["play_card"], canDeclareAttack: true, playPhaseActions: [{ cardId: "longdan-dodge", canPlayAs: "attack" }] },
  });
  const longdanPlayHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: longdanPlayRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(longdanPlayHtml, />LONGDAN<\/button>/);
  assert.match(longdanPlayHtml, /class="game-card dodge black-suit/);

  const longdanResponseRoom = normalizeRoomData({
    code: "SAFE-LONGDAN-RESPONSE", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhao-yun", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" }],
    myHand: [card("longdan-response-attack", "Attack")], turnSeat: null, phase: "response", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Dodge or take damage", isMyAction: true,
    pending: { kind: "response" }, currentAction: { version: 3, kind: "response", actorId: "p1", deadline: 0, reason: "Dodge or take damage", legalActions: ["respond", "decline_response"], requirement: "dodge", options: [{ providerId: "card", satisfies: "dodge", activation: "implicit", label: "Play Dodge", selection: null }, { providerId: "zhao_yun_attack_as_dodge", satisfies: "dodge", activation: "explicit", label: "Use Longdan as Dodge", playedAs: "dodge", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["longdan-response-attack"] } }] },
  });
  const longdanResponseHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: longdanResponseRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(longdanResponseHtml, />LONGDAN<\/button>/);
  assert.doesNotMatch(longdanResponseHtml, /Use Longdan as Dodge/);

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
  assert.equal((pickerHtml.match(/class="target-card-picker-card concealed-card/g) ?? []).length, 4, "hidden hand buttons use the picker-specific concealed-card class");
  assert.doesNotMatch(pickerHtml, /class="target-card-picker-card hidden(?:\s|[^"]*")/, "hidden hand buttons do not use Tailwind's standalone hidden class");
  assert.match(pickerHtml, /aria-label="Nio Shield/);
  assert.doesNotMatch(pickerHtml, /aria-label="not-eligible"/);

  const choicePayload = {
    code: "SAFE-CHOICE", status: "playing", maxPlayers: 4, isHost: false, isTestController: true, meId: "p2", myRole: "Rebel", myHeroOptions: [],
    players: [
      { id: "p1", name: "ATTACKER", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "TARGET", seat: 1, hero: "zhen-ji", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 2, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: [card("target-hand-0"), card("target-hand-1")], turnSeat: 0, phase: "response", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p2", actionReason: "Choose how to resolve Yin-Yang Swords", isMyAction: true,
    pending: { kind: "trigger" }, currentAction: { version: 3, kind: "trigger", actorId: "p2", deadline: 0, reason: "Choose how to resolve Yin-Yang Swords", legalActions: ["trigger"], triggerEvent: "attack_targeted", triggerOptions: [{ effectId: "yin_yang_swords_attack_targeted", label: "Yin-Yang Swords", allowDecline: false, timeoutChoiceId: "draw", selection: { type: "choice", choices: [{ id: "discard", label: "Discard 1 hand card" }, { id: "draw", label: "Allow attacker to draw 1 card" }], eligibleHandKeys: ["hand:0", "hand:1"] } }] },
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null, pendingNegation: null, pendingHarvest: null, pendingTargetCard: null, pendingBorrowedSword: null, pendingDying: null,
  };
  const choiceRoom = normalizeRoomData(choicePayload);
  const choiceHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: choiceRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(choiceHtml, /class="target-card-picker-panel choice-trigger-panel/);
  assert.match(choiceHtml, /YIN-YANG SWORDS/);
  assert.match(choiceHtml, /Discard 1 hand card/);
  assert.match(choiceHtml, /Keep hand — attacker draws 1 card/);
  assert.doesNotMatch(choiceHtml, /aria-label="Hidden hand card \d+"/, "hand cards stay hidden until discard is chosen");
  assert.doesNotMatch(choiceHtml, />Yin-Yang Swords<\/button>/, "mandatory choices open without a trigger activation button");
  assert.doesNotMatch(choiceHtml, /Skip reaction/, "mandatory Yin-Yang choice has no Skip reaction");

  const discardChoiceHtml = renderToStaticMarkup(React.createElement(MandatoryChoiceDialog, {
    option: choicePayload.currentAction.triggerOptions[0], selection: choicePayload.currentAction.triggerOptions[0].selection, selectedChoice: "discard", selectedKeys: [], disabled: false, busy: false, error: "",
    onChoice: () => {}, onToggle: () => {}, onConfirm: () => {},
  }));
  assert.equal((discardChoiceHtml.match(/aria-label="Hidden hand card \d+"/g) ?? []).length, 2, "mandatory discard choice uses readable concealed hand cards");

  const noHandRoom = normalizeRoomData({
    ...choicePayload,
    code: "SAFE-CHOICE-NO-HAND",
    players: choicePayload.players.map((player) => player.id === "p2" ? { ...player, handCount: 0 } : player),
    myHand: [],
    currentAction: { ...choicePayload.currentAction, triggerOptions: [{ ...choicePayload.currentAction.triggerOptions[0], selection: { type: "choice", choices: [{ id: "draw", label: "Allow attacker to draw 1 card" }], eligibleHandKeys: [] } }] },
  });
  const noHandHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: noHandRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(noHandHtml, /Keep hand — attacker draws 1 card/);
  assert.doesNotMatch(noHandHtml, /Discard 1 hand card/);
  assert.doesNotMatch(noHandHtml, /Hidden hand card/);
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
