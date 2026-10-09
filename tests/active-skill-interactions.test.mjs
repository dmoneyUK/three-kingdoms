import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { GameRoom, GameRoomErrorBoundary, HERO_PASSIVE_SKILL_NAMES, HERO_SKILL_EFFECT_IDS, HERO_SKILL_RESPONSE_IDS } from "../app/page.tsx";
import { normalizeRoomData } from "../game/room-safety.js";
import { buildPresentationClientView } from "../game/presentation-client.ts";
import { buildGroupScopePreview } from "../game/group-scope-preview.ts";
import { IMPLEMENTED_STANDARD_HEROES } from "../game/heroes.ts";

const card = (id, kind = "Attack", suit = "♠") => ({ id, kind, suit, rank: "A" });

function installRenderEnvironment() {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = { addEventListener: () => {}, removeEventListener: () => {}, setInterval, clearInterval };
  globalThis.document = { visibilityState: "visible", addEventListener: () => {}, removeEventListener: () => {} };
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => "" });
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.localStorage = { removeItem: () => {} };
}

test("implemented Hero skills all have an explicit Local Skills control category", () => {
  const conversionSkills = new Set(["guan-yu:God of War", "zhao-yun:Braveheart"]);
  const roster = new Map(IMPLEMENTED_STANDARD_HEROES.map((hero) => [hero.id, new Set(hero.skills.map((skill) => skill.name))]));

  for (const [registryName, registry] of [
    ["active trigger", HERO_SKILL_EFFECT_IDS],
    ["response", HERO_SKILL_RESPONSE_IDS],
  ]) {
    for (const [heroId, skills] of Object.entries(registry)) {
      assert.ok(roster.has(heroId), `${registryName} registry references non-implemented Hero ${heroId}`);
      for (const [skillName, providerIds] of Object.entries(skills)) {
        assert.ok(roster.get(heroId).has(skillName), `${registryName} registry references unknown skill ${heroId}/${skillName}`);
        assert.ok(providerIds.length > 0, `${registryName} registry has no authority ID for ${heroId}/${skillName}`);
      }
    }
  }
  for (const [heroId, skillNames] of Object.entries(HERO_PASSIVE_SKILL_NAMES)) {
    assert.ok(roster.has(heroId), `passive registry references non-implemented Hero ${heroId}`);
    for (const skillName of skillNames) assert.ok(roster.get(heroId).has(skillName), `passive registry references unknown skill ${heroId}/${skillName}`);
  }

  for (const hero of IMPLEMENTED_STANDARD_HEROES) {
    for (const skill of hero.skills) {
      const key = `${hero.id}:${skill.name}`;
      const categories = [
        (HERO_SKILL_EFFECT_IDS[hero.id]?.[skill.name]?.length ?? 0) > 0 && "active trigger",
        (HERO_SKILL_RESPONSE_IDS[hero.id]?.[skill.name]?.length ?? 0) > 0 && "response",
        HERO_PASSIVE_SKILL_NAMES[hero.id]?.includes(skill.name) && "passive",
        conversionSkills.has(key) && "authoritative card conversion",
      ].filter(Boolean);
      assert.ok(categories.length > 0, `${key} has no Local Skills category`);
      if (HERO_PASSIVE_SKILL_NAMES[hero.id]?.includes(skill.name)) {
        assert.deepEqual(categories, ["passive"], `${key} must not be falsely registered as an actionable local skill`);
      }
    }
  }
});

function activeSkillRoom(skill) {
  const players = [
    { id: "p1", name: "ACTIVE HERO", seat: 0, hero: skill.hero, hp: skill.hero === "sun-shangxiang" ? 3 : 4, maxHp: skill.hero === "sun-shangxiang" ? 3 : 4, alive: true, connected: true, handCount: skill.cardIds.length, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
    { id: "p2", name: "TARGET ONE", seat: 1, hero: "liu-bei", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    { id: "p3", name: "TARGET TWO", seat: 2, hero: "sun-quan", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Spy" },
    ...(skill.extraPlayer ? [{ id: skill.extraPlayer.id, name: skill.extraPlayer.name, seat: 3, hero: "cao-cao", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" }] : []),
  ];
  const selection = skill.selectionType === "target"
    ? { type: "target", targetIds: skill.targetIds, min: skill.targetMin, max: skill.targetMax }
    : { type: "cards", min: skill.min, max: skill.max, eligibleCardIds: skill.cardIds, targetIds: skill.targetIds, targetMin: skill.targetMin, targetMax: skill.targetMax };
  return normalizeRoomData({
    code: `INTERACTION-${skill.effectId}`, status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [], players,
    myHand: skill.cardIds.map((id, index) => card(id, index % 2 ? "Dodge" : "Attack", index % 2 ? "♣" : "♠")), turnSeat: 0, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play cards or use a hero skill", isMyAction: true,
    actionRevision: "interaction-revision", phase: skill.phase ?? "play",
    currentAction: { version: 3, kind: skill.triggerEvent ? "trigger" : "turn", actorId: "p1", deadline: 0, reason: skill.triggerEvent ? "Choose a trigger" : "Play cards or use a hero skill", legalActions: ["trigger", "decline_trigger"], ...(skill.triggerEvent ? { triggerEvent: skill.triggerEvent } : {}), triggerOptions: [{ effectId: skill.effectId, label: skill.label, selection }] },
  });
}

function normalHalberdTargetRoom() {
  return normalizeRoomData({
    code: "HALBERD-TARGET-UI", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [
      { id: "p1", name: "ATTACKER", seat: 0, hero: "zhang-fei", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [{ id: "halberd", kind: "SkyPiercingHalberd", suit: "♠", rank: "Q" }], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "FIRST TARGET", seat: 1, hero: "liu-bei", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
      { id: "p3", name: "SECOND TARGET", seat: 2, hero: "sun-quan", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Spy" },
    ],
    myHand: [card("halberd-attack", "Attack")], turnSeat: 0, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play a card", isMyAction: true,
    actionRevision: "halberd-target-revision", phase: "play", currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play a card", legalActions: ["play_card"], canDeclareAttack: true, playPhaseActions: [{ cardId: "halberd-attack", canPlayAs: "attack" }] },
  });
}

function normalWushengTargetRoom() {
  return normalizeRoomData({
    code: "WUSHENG-TARGET-UI", status: "playing", maxPlayers: 2, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [
      { id: "p1", name: "GUAN YU", seat: 0, hero: "guan-yu", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "TARGET", seat: 1, hero: "liu-bei", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: [{ id: "wusheng-card", kind: "Dodge", suit: "♥", rank: "Q" }], turnSeat: 0, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play a card", isMyAction: true,
    actionRevision: "wusheng-target-revision", phase: "play", currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play a card", legalActions: ["play_card"], canDeclareAttack: true, playPhaseActions: [{ cardId: "wusheng-card", canPlayAs: "attack" }] },
  });
}

function serpentTargetRoom() {
  return normalizeRoomData({
    code: "SERPENT-TARGET-UI", status: "playing", maxPlayers: 2, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [
      { id: "p1", name: "ATTACKER", seat: 0, hero: "zhang-fei", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 2, equipmentCards: [{ id: "serpent-spear", kind: "SerpentSpear", suit: "♠", rank: "Q" }], judgementCards: [], attackRange: 3, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "TARGET", seat: 1, hero: "liu-bei", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: [card("serpent-cost-one", "Peach"), card("serpent-cost-two", "Dodge")], turnSeat: 0, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play a card", isMyAction: true,
    actionRevision: "serpent-target-revision", phase: "play", currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play a card", legalActions: ["play_card"], canDeclareAttack: true, playPhaseActions: [] },
  });
}

function borrowedSwordTargetRoom() {
  return normalizeRoomData({
    code: "BORROWED-SWORD-TARGET-UI", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [
      { id: "p1", name: "SOURCE", seat: 0, hero: "cao-cao", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "WEAPON HOLDER", seat: 1, hero: "zhang-fei", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [{ id: "borrowed-weapon", kind: "GreenDragonBlade", suit: "♠", rank: "Q" }], judgementCards: [], attackRange: 3, distance: 1, isHost: false, role: "Rebel" },
      { id: "p3", name: "LEGAL TARGET", seat: 2, hero: "liu-bei", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Spy" },
      { id: "p4", name: "DEFEATED TARGET", seat: 3, hero: "sun-quan", hp: 0, maxHp: 4, alive: false, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: [], turnSeat: 0, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Choose a target for Borrowed Sword", isMyAction: true,
    actionRevision: "borrowed-sword-target-revision", phase: "response", currentAction: { version: 3, kind: "borrowed_sword", actorId: "p1", deadline: 0, reason: "Choose a target for the forced Attack", legalActions: ["choose_borrowed_sword_target"] },
    pendingBorrowedSword: { kind: "borrowed_sword", sourceId: "p1", actorId: "p1", targetId: "p2", holderId: "p2", stage: "choose_target", weaponId: "borrowed-weapon", eligibleTargetIds: ["p3"] },
  });
}

function pendingTargetCardRoom(actionRevision = "target-card-revision", { handCount = 2, cardKind = "Dismantle", withFocusProjection = false, focusTarget = true, eligibleKeys } = {}) {
  const handKeys = Array.from({ length: handCount }, (_, index) => `hand:${index}`);
  const projectedKeys = eligibleKeys ?? [...handKeys, "target-armor", "target-judgement"];
  const activeTargetIds = focusTarget ? ["p2"] : [];
  const interaction = {
    semantics: "PROVEN", interactionId: "target-card-interaction", rootFrameId: "target-card-frame", activeFrameId: "target-card-frame", parentFrameId: null,
    checkpointId: `target-card-checkpoint-${actionRevision}`, presentationRevision: 1, stage: "ATTACK_RESPONSE", sourceId: "p1", effect: cardKind,
    targetIds: ["p2"], currentParticipantId: focusTarget ? "p2" : "p1", decisionActorId: "p1", activeResolverId: "p1", activeSourceId: "p1", activeTargetIds, participantIds: ["p1", "p2"],
    participantRoles: { sourceId: "p1", originalTargetIds: ["p2"], activeTargetIds, currentParticipantId: focusTarget ? "p2" : "p1", decisionActorId: "p1", activeResolverId: "p1", parentParticipantId: null, participantIds: ["p1", "p2"] },
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
  };
  const presentationSnapshot = {
    identity: { interactionId: interaction.interactionId, checkpointId: interaction.checkpointId, presentationRevision: 1 },
    stable: { kind: "CHOICE", interactionId: interaction.interactionId, checkpointId: interaction.checkpointId, presentationRevision: 1, decisionActorId: "p1" },
    interaction, decision: { actorId: "p1", stage: "ATTACK_RESPONSE" },
    localControl: { source: "CurrentAction", actionRevision, kind: "target_card", actorId: "p1", entitled: true },
    settlement: null, transitionEvents: [],
  };
  return normalizeRoomData({
    code: "TARGET-CARD-CONTINUATION-UI", status: "playing", maxPlayers: 2, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [
      { id: "p1", name: "SOURCE", seat: 0, hero: "gan-ning", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "TARGET", seat: 1, hero: "liu-bei", hp: 4, maxHp: 4, alive: true, connected: true, handCount, equipmentCards: [{ id: "target-armor", kind: "NioShield", suit: "♣", rank: "2" }], judgementCards: [card("target-judgement", "Lightning", "♥")], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: [card("source-card", cardKind)], turnSeat: 0, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Choose a target card", isMyAction: true,
    actionRevision, phase: "response", presentationSnapshot: withFocusProjection ? presentationSnapshot : null, pending: { kind: "target_card" }, currentAction: { version: 3, kind: "target_card", actorId: "p1", deadline: 0, reason: "Choose a target card", legalActions: ["choose_target_card"], ...(withFocusProjection ? { targetCardSelection: { targetId: "p2", eligibleKeys: projectedKeys } } : {}) },
    pendingTargetCard: { kind: "target_card", sourceId: "p1", actorId: "p1", targetId: "p2", cardKind },
  });
}

function triggerRoom({ meId = "p1", hero = "huang-yueying", playerName = "HUANG YUEYING", code = "CULTIVATION-UI", triggerOptions = [{ effectId: "huang_yueying_cultivation", label: "Cultivation", description: "Draw 1 card after using a Stratagem.", selection: null }], pendingNegation = null, currentAction = {} } = {}) {
  const players = [
    { id: "p1", name: playerName, seat: 0, hero, hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
    { id: "p2", name: "TARGET", seat: 1, hero: "liu-bei", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
  ];
  return normalizeRoomData({
    code, status: "playing", maxPlayers: 2, isHost: meId === "p1", isTestController: false, meId, myRole: meId === "p1" ? "Lord" : "Rebel", myHeroOptions: [], players,
    myHand: meId === "p1" ? [card("cultivation-card", "Dismantle")] : [card("target-card", "Peach")], turnSeat: 0, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Cultivation follows the Stratagem use", isMyAction: meId === "p1",
    actionRevision: "cultivation-ui-revision", phase: "response", pendingNegation, currentAction: {
      version: 3, kind: "trigger", actorId: "p1", deadline: 0, reason: "Choose a trigger", legalActions: ["trigger", "decline_trigger"], triggerEvent: "stratagem_used", triggerOptions, ...currentAction,
    },
  });
}

function deflectionRoom({ equipment = false, triggerOptions } = {}) {
  const cost = card(equipment ? "deflection-equipment" : "deflection-hand", equipment ? "NioShield" : "Peach", equipment ? "♣" : "♦");
  const ineligible = card("deflection-ineligible", "Attack", "♠");
  const players = [
    { id: "p1", name: "DA QIAO", seat: 0, hero: "daqiao", hp: 3, maxHp: 3, alive: true, connected: true, handCount: equipment ? 0 : 2, equipmentCards: equipment ? [cost] : [], judgementCards: [], attackRange: 1, distance: 1, isHost: true, role: "Lord" },
    { id: "p2", name: "ATTACKER", seat: 1, hero: "cao-cao", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: false, role: "Rebel" },
    { id: "p3", name: "LEGAL TARGET", seat: 2, hero: "liu-bei", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Spy" },
    { id: "p4", name: "OUT OF WINDOW", seat: 3, hero: "sun-quan", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
  ];
  const selection = { type: "cards", min: 1, max: 1, eligibleCardIds: [cost.id], targetIds: ["p3"], targetMin: 1, targetMax: 1 };
  return normalizeRoomData({
    code: `DEFLECTION-${equipment ? "EQUIPMENT" : "HAND"}`, status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [], players,
    myHand: equipment ? [] : [cost, ineligible], turnSeat: 1, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Da Qiao may use Deflection", isMyAction: true,
    actionRevision: "deflection-ui-revision", phase: "response", currentAction: { version: 3, kind: "trigger", actorId: "p1", deadline: 0, reason: "Da Qiao may use Deflection, or skip", legalActions: ["trigger", "decline_trigger"], triggerEvent: "attack_targeted", triggerOptions: triggerOptions ?? [{ effectId: "daqiao_deflection", label: "Deflection", description: "Discard 1 card to transfer this Attack.", allowDecline: true, selection }] },
  });
}

function retaliationRoom(actionRevision = "retaliation-ui-revision") {
  const players = [
    { id: "p1", name: "SIMA YI", seat: 0, hero: "simayi", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
    { id: "p2", name: "SOURCE", seat: 1, hero: "cao-cao", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
  ];
  return normalizeRoomData({
    code: "RETALIATION-UI", status: "playing", maxPlayers: 2, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [], players,
    myHand: [], turnSeat: 1, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Sima Yi may use Retaliation, or skip", isMyAction: true,
    actionRevision, phase: "response", currentAction: {
      version: 3, kind: "trigger", actorId: "p1", deadline: 0, reason: "Sima Yi may use Retaliation, or skip", legalActions: ["trigger", "decline_trigger"], triggerEvent: "damage_suffered",
      triggerOptions: [{ effectId: "sima_yi_fankui", label: "Retaliation", description: "Obtain one card from the damage source.", allowDecline: true, selection: { type: "target_cards", targetId: "p2", min: 1, max: 1, eligibleKeys: ["hand"] } }],
    },
  });
}

async function gameTree(skill, onAction) {
  const room = activeSkillRoom(skill);
  let actionCalls = [];
  const action = async (...args) => { actionCalls.push(args); onAction?.(args); return true; };
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  return { renderer, actionCalls };
}

function buttons(renderer, props) { return renderer.root.findAllByType("button").filter((button) => Object.entries(props).every(([key, value]) => button.props[key] === value)); }
function button(renderer, props) { const matches = buttons(renderer, props); assert.equal(matches.length, 1, `expected one button ${JSON.stringify(props)}, got ${matches.length}; buttons=${renderer.root.findAllByType("button").map((entry) => String(entry.props.children)).join(" | ")}`); return matches[0]; }
function nodeWith(renderer, prop, value) { const matches = renderer.root.findAll((node) => node.props?.[prop] === value); assert.equal(matches.length, 1, `expected one node ${prop}=${value}, got ${matches.length}`); return matches[0]; }
function seatAnchorIds(renderer) { return [...new Set(renderer.root.findAll((node) => typeof node.props?.["data-player-anchor"] === "string").map((node) => node.props["data-player-anchor"]))].sort(); }
function handCardButton(renderer, cardId) { return nodeWith(renderer, "data-hand-card-id", cardId).findAllByType("button")[0]; }
function targetButton(renderer, playerId) { return nodeWith(renderer, "data-player-anchor", playerId).findAllByType("button")[0]; }
function text(renderer, value) { return renderer.root.findAll((node) => typeof node.props?.children === "string" && node.props.children === value); }
function buttonsContaining(renderer, value) { return renderer.root.findAllByType("button").filter((node) => String(node.props.children).includes(value)); }
function consoleButtons(renderer) { return nodeWith(renderer, "data-console-surface", "local-operation").findAllByType("button"); }
function consoleButtonsByClass(renderer, className) { return consoleButtons(renderer).filter((node) => node.props.className === className); }
function renderedNodeText(node) { return typeof node === "string" || typeof node === "number" ? String(node) : (node?.children ?? []).map(renderedNodeText).join(""); }
function statusText(renderer) { return renderer.root.findAll((node) => node.props?.role === "status").map(renderedNodeText).join(" "); }
function assertOnlyDeflectionProfile(renderer) {
  const matches = buttonsContaining(renderer, "Deflection");
  assert.equal(matches.length, 1, `expected only the profile Deflection control, got ${matches.map((node) => String(node.props.children)).join(" | ")}`);
  assert.equal(matches[0].props["aria-label"], "Deflection");
}
function recoveryRendered(renderer) { return text(renderer, "GAME SCREEN ERROR").length > 0 || text(renderer, "Previous game data is no longer compatible.").length > 0; }

function groupScopeRoom(cardKind, { actionRevision = `${cardKind}-scope-1`, presentationSnapshot = null } = {}) {
  return normalizeRoomData({
    code: `GROUP-SCOPE-${cardKind}`, status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [
      { id: "p1", name: "SOURCE", seat: 0, hero: "cao-cao", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "WOUNDED", seat: 1, hero: "liu-bei", hp: 2, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
      { id: "p3", name: "FULL", seat: 2, hero: "sun-quan", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Spy" },
      { id: "p4", name: "DEFEATED", seat: 3, hero: "zhang-fei", hp: 0, maxHp: 4, alive: false, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: [card(`${cardKind}-card`, cardKind)], turnSeat: 0, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play a card", isMyAction: true,
    actionRevision, phase: "play", presentationSnapshot, currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play a card", legalActions: ["play_card"] },
  });
}

function groupPresentationView() {
  return {
    ...buildPresentationClientView(null, "p1"),
    hasInteraction: true,
    interactionId: "real-group",
    checkpointId: "real-checkpoint",
    presentationRevision: 1,
    stage: "AWAITING_RESPONSE",
    effect: "GROUP",
    sourceId: "p1",
    originalTargetIds: ["p2", "p3"],
    activeTargetIds: ["p2"],
    currentParticipantId: "p2",
    decisionActorId: "p2",
    activeResolverId: null,
    participantIds: ["p2", "p3"],
    groupParticipantProgress: [],
    groupSettlements: [],
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
    parentFrameId: null,
    stableKind: "DECISION",
    isLocalDecisionActor: false,
    hasLocalControl: false,
    localActionRevision: null,
  };
}

function duelResponseRoom({ meId = "p2", actorId = "p2", actionRevision = "duel-response-1", presentationSnapshot } = {}) {
  const otherId = actorId === "p1" ? "p2" : "p1";
  const attack = card("duel-response-attack", "Attack");
  const interaction = {
    semantics: "PROVEN", interactionId: "duel-interaction", rootFrameId: "duel-frame", activeFrameId: "duel-frame", parentFrameId: null,
    checkpointId: `duel-checkpoint-${actionRevision}`, presentationRevision: actorId === "p2" ? 1 : 2, stage: "DUEL_EXCHANGE", sourceId: "p1", effect: "duel",
    targetIds: ["p2", "p1"], currentParticipantId: actorId, decisionActorId: actorId, activeResolverId: actorId, activeSourceId: "p1", activeTargetIds: [actorId, otherId], participantIds: [],
    participantRoles: { sourceId: "p1", originalTargetIds: ["p2", "p1"], activeTargetIds: [actorId, otherId], currentParticipantId: actorId, decisionActorId: actorId, activeResolverId: actorId, parentParticipantId: null, participantIds: [] },
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
  };
  const snapshot = presentationSnapshot ?? {
    identity: { interactionId: interaction.interactionId, checkpointId: interaction.checkpointId, presentationRevision: interaction.presentationRevision },
    stable: { kind: "CHOICE", interactionId: interaction.interactionId, checkpointId: interaction.checkpointId, presentationRevision: interaction.presentationRevision, decisionActorId: actorId },
    interaction,
    decision: { actorId, stage: "DUEL_EXCHANGE" },
    localControl: { source: "CurrentAction", actionRevision, kind: "response", actorId, entitled: meId === actorId },
    settlement: null, transitionEvents: [],
  };
  return normalizeRoomData({
    code: `DUEL-RESPONSE-${meId}-${actorId}-${actionRevision}`, status: "playing", maxPlayers: 2, isHost: meId === "p1", isTestController: true, meId, myRole: meId === "p1" ? "Lord" : "Rebel", myHeroOptions: [],
    players: [
      { id: "p1", name: "SOURCE", seat: 0, hero: "cao-cao", hp: 4, maxHp: 4, alive: true, connected: true, handCount: meId === "p1" ? 1 : 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "DUELIST", seat: 1, hero: "liu-bei", hp: 4, maxHp: 4, alive: true, connected: true, handCount: meId === "p2" ? 1 : 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: meId === actorId ? [attack] : [], turnSeat: 0, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: actorId, actionReason: "Respond to Duel: select Attack or take 1 damage", isMyAction: meId === actorId,
    actionRevision, phase: "response", presentationSnapshot: snapshot, pendingDuel: { sourceId: "p1", targetId: "p2", actorId, opponentId: otherId },
    currentAction: { version: 3, kind: "response", actorId, deadline: 0, reason: "Respond to Duel: select Attack or take 1 damage", legalActions: ["respond", "decline_response"], declineAction: "decline_response", requirement: "attack", ...(meId === actorId ? { options: [{ providerId: "card", satisfies: "attack", label: "Attack", description: "Play Attack", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [attack.id] } }] } : {}) },
  });
}

function judgementReplacementRoom({ meId = "p2", actorId = "p2", actionRevision = "judgement-reveal-1", triggerEvent = "judgement_revealed", includeReveal = true } = {}) {
  const revealed = card("judgement-revealed", "Dodge", "♠");
  const replacement = card("judgement-replacement", "Peach", "♥");
  const interaction = {
    semantics: "PROVEN", interactionId: "judgement-interaction", rootFrameId: "judgement-frame", activeFrameId: "judgement-frame", parentFrameId: null,
    checkpointId: `judgement-checkpoint-${actionRevision}`, presentationRevision: actorId === "p2" ? 1 : 2, stage: "JUDGEMENT", sourceId: "p1", effect: "Overindulgence",
    targetIds: ["p1"], currentParticipantId: "p1", decisionActorId: actorId, activeResolverId: actorId, activeSourceId: "p1", activeTargetIds: ["p1"], participantIds: [],
    participantRoles: { sourceId: "p1", originalTargetIds: ["p1"], activeTargetIds: ["p1"], currentParticipantId: "p1", decisionActorId: actorId, activeResolverId: actorId, parentParticipantId: null, participantIds: [] },
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
  };
  const snapshot = {
    identity: { interactionId: interaction.interactionId, checkpointId: interaction.checkpointId, presentationRevision: interaction.presentationRevision },
    stable: { kind: "CHOICE", interactionId: interaction.interactionId, checkpointId: interaction.checkpointId, presentationRevision: interaction.presentationRevision, decisionActorId: actorId },
    interaction,
    decision: { actorId, stage: "JUDGEMENT" },
    localControl: { source: "CurrentAction", actionRevision, kind: "trigger", actorId, entitled: meId === actorId },
    settlement: null, transitionEvents: [],
  };
  return normalizeRoomData({
    code: `JUDGEMENT-${meId}-${actorId}-${actionRevision}`, status: "playing", maxPlayers: 2, isHost: meId === "p1", isTestController: true, meId, myRole: meId === "p1" ? "Lord" : "Rebel", myHeroOptions: [],
    players: [
      { id: "p1", name: "SUBJECT", seat: 0, hero: "guo-jia", hp: 3, maxHp: 4, alive: true, connected: true, handCount: meId === "p1" ? 1 : 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "SIMA YI", seat: 1, hero: "simayi", hp: 3, maxHp: 3, alive: true, connected: true, handCount: meId === "p2" ? 1 : 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: meId === "p2" ? [replacement] : [], turnSeat: 0, deckCount: 20, discardTop: null,
    log: [], timeline: includeReveal ? [{ id: "judgement-reveal-event", type: "card", player: "SUBJECT", target: "SUBJECT", card: revealed, action: "reveal", judgement: true, resolutionId: "judgement-resolution" }] : [],
    isMyTurn: false, actionPlayerId: actorId, actionReason: `${actorId === "p2" ? "Sima Yi may replace the Judgement" : "Subject resolves the Judgement"}`, isMyAction: meId === actorId,
    actionRevision, phase: "response", presentationSnapshot: snapshot, pending: { kind: "trigger" },
    currentAction: { version: 3, kind: "trigger", actorId, deadline: 0, reason: `${actorId === "p2" ? "Sima Yi may replace the Judgement, or decline" : "Resolve the Judgement"}`, legalActions: actorId === meId ? ["trigger", "decline_trigger"] : [], triggerEvent, ...(actorId === "p2" && meId === actorId ? { triggerOptions: [{ effectId: "sima_yi_guicai", label: "Necromancy", description: "Replace the revealed Judgement card.", allowDecline: true, selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [replacement.id] } }] } : {}), presentation: { readyAfterEventId: includeReveal ? "judgement-reveal-event" : null, resolutionId: "judgement-resolution" } },
  });
}

function negationReactionRoom({ meId = "p2", actorId = "p2", actionRevision = "negation-response-1", presentationSnapshot } = {}) {
  const negation = card("negation-private", "Negation", "♣");
  const interaction = {
    semantics: "PROVEN", interactionId: "negation-interaction", rootFrameId: "negation-frame", activeFrameId: "negation-frame", parentFrameId: null,
    checkpointId: `negation-checkpoint-${actionRevision}`, presentationRevision: actorId === "p2" ? 1 : 2, stage: "NEGATION", sourceId: "p1", effect: "Dismantle",
    targetIds: ["p3"], currentParticipantId: "p3", decisionActorId: actorId, activeResolverId: actorId, activeSourceId: "p1", activeTargetIds: ["p3"], participantIds: [],
    participantRoles: { sourceId: "p1", originalTargetIds: ["p3"], activeTargetIds: ["p3"], currentParticipantId: "p3", decisionActorId: actorId, activeResolverId: actorId, parentParticipantId: null, participantIds: [] },
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
  };
  const snapshot = presentationSnapshot ?? {
    identity: { interactionId: interaction.interactionId, checkpointId: interaction.checkpointId, presentationRevision: interaction.presentationRevision },
    stable: { kind: "CHOICE", interactionId: interaction.interactionId, checkpointId: interaction.checkpointId, presentationRevision: interaction.presentationRevision, decisionActorId: actorId },
    interaction, decision: { actorId, stage: "NEGATION" },
    localControl: { source: "CurrentAction", actionRevision, kind: "response", actorId, entitled: meId === actorId }, settlement: null, transitionEvents: [],
  };
  return normalizeRoomData({
    code: `NEGATION-${meId}-${actorId}-${actionRevision}`, status: "playing", maxPlayers: 3, isHost: meId === "p1", isTestController: true, meId, myRole: meId === "p1" ? "Lord" : "Rebel", myHeroOptions: [],
    players: [
      { id: "p1", name: "SOURCE", seat: 0, hero: "cao-cao", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "RESPONDER", seat: 1, hero: "simayi", hp: 3, maxHp: 3, alive: true, connected: true, handCount: meId === "p2" ? 1 : 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
      { id: "p3", name: "TARGET", seat: 2, hero: "liu-bei", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Spy" },
    ],
    myHand: meId === actorId ? [negation] : [], turnSeat: 0, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: actorId, actionReason: "legacy Negation owner", isMyAction: meId === actorId,
    actionRevision, phase: "response", presentationSnapshot: snapshot, pendingNegation: { sourceId: "p1", actorId, effectTargetId: "p3", cardName: "Dismantle", latestNegationPlayerId: "forged-provider", latestNegationCardId: "forged-card", chainDepth: 99, negated: false },
    currentAction: { version: 3, kind: "response", actorId, deadline: 0, reason: "Play Negation", legalActions: meId === actorId ? ["respond", "decline_response"] : [], declineAction: "decline_response", requirement: "negate", ...(meId === actorId ? { options: [{ providerId: "negation_card", satisfies: "negate", label: "Negation", description: "Play Negation", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [negation.id] } }] } : {}) },
  });
}

function dyingRescueRoom({ meId = "p3", actorId = "p3", actionRevision = "dying-rescue-1", continuity = "ROOT_FRAME", parentFrameId = null } = {}) {
  const peach = card("dying-peach", "Peach", "♥");
  const interaction = {
    semantics: "PROVEN", interactionId: "dying-interaction", rootFrameId: "attack-frame", activeFrameId: "dying-frame", parentFrameId,
    checkpointId: `dying-checkpoint-${actionRevision}`, presentationRevision: actorId === "p3" ? 1 : 2, stage: "DYING", sourceId: "p1", effect: "Attack",
    targetIds: ["p2"], currentParticipantId: "p2", decisionActorId: actorId, activeResolverId: actorId, activeSourceId: "p1", activeTargetIds: ["p2"], participantIds: ["p1", "p2", "p3"],
    participantRoles: { sourceId: "p1", originalTargetIds: ["p2"], activeTargetIds: ["p2"], currentParticipantId: "p2", decisionActorId: actorId, activeResolverId: actorId, parentParticipantId: null, participantIds: ["p1", "p2", "p3"] },
    continuity: { relation: continuity, parentFrameId },
  };
  const snapshot = {
    identity: { interactionId: interaction.interactionId, checkpointId: interaction.checkpointId, presentationRevision: interaction.presentationRevision },
    stable: { kind: "CHOICE", interactionId: interaction.interactionId, checkpointId: interaction.checkpointId, presentationRevision: interaction.presentationRevision, decisionActorId: actorId },
    interaction, decision: { actorId, stage: "DYING" },
    localControl: { source: "CurrentAction", actionRevision, kind: "dying", actorId, entitled: meId === actorId }, settlement: null, transitionEvents: [],
  };
  return normalizeRoomData({
    code: `DYING-${meId}-${actorId}-${actionRevision}`, status: "playing", maxPlayers: 3, isHost: meId === "p1", isTestController: true, meId, myRole: meId === "p1" ? "Lord" : "Rebel", myHeroOptions: [],
    players: [
      { id: "p1", name: "SOURCE", seat: 0, hero: "cao-cao", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "DYING TARGET", seat: 1, hero: "liu-bei", hp: 0, maxHp: 4, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
      { id: "p3", name: "RESCUER", seat: 2, hero: "sun-quan", hp: 4, maxHp: 4, alive: true, connected: true, handCount: meId === actorId ? 1 : 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Spy" },
    ],
    myHand: meId === actorId ? [peach] : [], turnSeat: 0, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: actorId, actionReason: "Choose Peach or skip rescue", isMyAction: meId === actorId,
    actionRevision, phase: "dying", presentationSnapshot: snapshot, pendingDying: { kind: "dying", sourceId: "p1", targetId: "p2", origin: "Attack", recoveryNeeded: 1, deadline: Date.now() + 60_000 },
    currentAction: { version: 3, kind: "dying", actorId, deadline: 0, reason: "Choose Peach or skip rescue", legalActions: meId === actorId ? ["give_peach", "skip_rescue"] : [], declineAction: "skip_rescue", requirement: "peach", ...(meId === actorId ? { options: [{ providerId: "card", satisfies: "peach", label: "Peach", description: "Give Peach to the dying player.", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [peach.id] } }] } : {}) },
  });
}

installRenderEnvironment();

test("normal deferred multi-target selection is local until ordered Confirm", async () => {
  const room = normalHalberdTargetRoom();
  const actionCalls = [];
  const { renderer } = await (async () => {
    let mounted;
    await act(async () => { mounted = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async (...args) => { actionCalls.push(args); return true; }, onLeave: () => {} }))); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    return { renderer: mounted };
  })();
  assert.equal(consoleButtonsByClass(renderer, "primary").length, 1, "ordinary turn exposes one footer primary");
  assert.equal(consoleButtons(renderer).filter((node) => node.props.children === "End").length, 1, "ordinary turn retains independent End");
  assert.equal(consoleButtons(renderer).filter((node) => node.props.children === "Confirm").length, 0, "ordinary turn does not expose a response Confirm");
  await act(async () => { handCardButton(renderer, "halberd-attack").props.onClick(); });
  await act(async () => { button(renderer, { "aria-label": "Select FIRST TARGET" }).props.onClick(); });
  assert.equal(actionCalls.length, 0, "normal seat selection remains local");
  await act(async () => { button(renderer, { "aria-label": "Select FIRST TARGET" }).props.onClick(); });
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("selected-target"), false, "deselecting before Confirm is local");
  assert.equal(actionCalls.length, 0);
  await act(async () => { button(renderer, { "aria-label": "Select FIRST TARGET" }).props.onClick(); });
  await act(async () => { button(renderer, { "aria-label": "Select SECOND TARGET" }).props.onClick(); });
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, false);
  await act(async () => { button(renderer, { children: "Cancel" }).props.onClick(); });
  assert.equal(actionCalls.length, 0, "Halberd Cancel sends no action");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("selected-target"), false);
  assert.equal(nodeWith(renderer, "data-player-anchor", "p3").props.className.includes("selected-target"), false);
  assert.equal(handCardButton(renderer, "halberd-attack").props.className.includes("selected"), false, "Halberd Cancel clears the card selection");
  await act(async () => { handCardButton(renderer, "halberd-attack").props.onClick(); });
  await act(async () => { button(renderer, { "aria-label": "Select FIRST TARGET" }).props.onClick(); });
  await act(async () => { button(renderer, { "aria-label": "Select SECOND TARGET" }).props.onClick(); });
  await act(async () => { button(renderer, { children: "Confirm" }).props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["play_card", { cardId: "halberd-attack", playAs: "attack", targetId: "p2", targetIds: ["p2", "p3"] }]);
  await act(async () => { renderer.unmount(); });
});

test("converted Attack Cancel clears Wusheng mode, card, and target without acting", async () => {
  const room = normalWushengTargetRoom();
  const actionCalls = [];
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async (...args) => { actionCalls.push(args); return true; }, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { button(renderer, { "aria-label": "God of War" }).props.onClick(); });
  await act(async () => { handCardButton(renderer, "wusheng-card").props.onClick(); });
  await act(async () => { button(renderer, { "aria-label": "Select TARGET" }).props.onClick(); });
  assert.equal(buttonsContaining(renderer, "Cancel").length, 1);
  await act(async () => { buttonsContaining(renderer, "Cancel God of War")[0].props.onClick(); });
  assert.equal(actionCalls.length, 0);
  assert.equal(button(renderer, { "aria-label": "God of War" }).props["aria-pressed"], false);
  assert.equal(handCardButton(renderer, "wusheng-card").props.className.includes("selected"), false);
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("selected-target"), false);
  await act(async () => { renderer.unmount(); });
});

test("Serpent Spear Cancel clears mode, both cost cards, and target", async () => {
  const room = serpentTargetRoom();
  const actionCalls = [];
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async (...args) => { actionCalls.push(args); return true; }, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { button(renderer, { children: "Spear" }).props.onClick(); });
  await act(async () => { handCardButton(renderer, "serpent-cost-one").props.onClick(); });
  await act(async () => { handCardButton(renderer, "serpent-cost-two").props.onClick(); });
  await act(async () => { button(renderer, { "aria-label": "Select TARGET" }).props.onClick(); });
  assert.equal(buttonsContaining(renderer, "Cancel").length, 1);
  await act(async () => { button(renderer, { children: "Cancel" }).props.onClick(); });
  const actionCountBeforeCancel = actionCalls.length;
  assert.equal(actionCountBeforeCancel, 0);
  assert.equal(button(renderer, { children: "Spear" }).props.className.includes("active"), false);
  assert.equal(handCardButton(renderer, "serpent-cost-one").props.className.includes("selected"), false);
  assert.equal(handCardButton(renderer, "serpent-cost-two").props.className.includes("selected"), false);
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("selected-target"), false);
  await act(async () => { renderer.unmount(); });
});

test("Borrowed Sword target selection stays local until Confirm and preserves the action contract", async () => {
  const room = borrowedSwordTargetRoom();
  const actionCalls = [];
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async (...args) => { actionCalls.push(args); return true; }, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const presentationBefore = { kind: renderer.root.findByType("main").props["data-presentation-kind"], interaction: renderer.root.findByType("main").props["data-presentation-has-interaction"], local: renderer.root.findByType("main").props["data-presentation-local-control"] };
  assert.equal(targetButton(renderer, "p3").props.disabled, false, "server-projected eligible target is selectable");
  assert.equal(targetButton(renderer, "p2").props.disabled, true, "the weapon holder is not a legal forced-Attack target");
  assert.equal(targetButton(renderer, "p4").props.disabled, true, "defeated target remains unavailable");
  assert.equal(buttonsContaining(renderer, "Skip").length, 0, "the server exposes no separate skip for this action");
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, true);
  assert.equal(buttonsContaining(renderer, "Cancel").length, 0, "local Cancel is hidden until a local selection exists");
  await act(async () => { targetButton(renderer, "p3").props.onClick(); });
  assert.equal(actionCalls.length, 0, "Borrowed Sword target click is local");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p3").props.className.includes("selected-target"), true, "local target is amber-selected");
  assert.equal(buttonsContaining(renderer, "Cancel").length, 1, "local Cancel follows the console model after local input");
  assert.deepEqual({ kind: renderer.root.findByType("main").props["data-presentation-kind"], interaction: renderer.root.findByType("main").props["data-presentation-has-interaction"], local: renderer.root.findByType("main").props["data-presentation-local-control"] }, presentationBefore, "local selection does not change public presentation attributes");
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, false);
  await act(async () => { button(renderer, { children: "Cancel" }).props.onClick(); });
  assert.equal(actionCalls.length, 0, "Borrowed Sword Cancel sends no action");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p3").props.className.includes("selected-target"), false);
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, true);
  await act(async () => { targetButton(renderer, "p3").props.onClick(); });
  await act(async () => { button(renderer, { children: "Confirm" }).props.onClick(); });
  assert.deepEqual(actionCalls, [["choose_borrowed_sword_target", { targetId: "p3" }]], "Confirm preserves the existing action and payload exactly");
  await act(async () => { renderer.unmount(); });
});

test("Borrowed Sword local target clears when the authoritative revision changes", async () => {
  const room = borrowedSwordTargetRoom();
  const action = async () => true;
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { targetButton(renderer, "p3").props.onClick(); });
  assert.equal(nodeWith(renderer, "data-player-anchor", "p3").props.className.includes("selected-target"), true);
  const revisedRoom = { ...room, actionRevision: "borrowed-sword-target-revision-2" };
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: revisedRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: revisedRoom, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(nodeWith(renderer, "data-player-anchor", "p3").props.className.includes("selected-target"), false, "stale revision clears the local target");
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, true);
  await act(async () => { renderer.unmount(); });
});

test("pending Dismantle modal keeps opaque selection local across Use and Cancel", async () => {
  const room = pendingTargetCardRoom("target-card-revision", { withFocusProjection: true });
  const actionCalls = [];
  const action = async (...args) => { actionCalls.push(args); return true; };
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const mainBefore = { kind: renderer.root.findByType("main").props["data-presentation-kind"], interaction: renderer.root.findByType("main").props["data-presentation-has-interaction"], local: renderer.root.findByType("main").props["data-presentation-local-control"] };
  const publicRolesBefore = nodeWith(renderer, "data-player-anchor", "p2").props["data-interaction-roles"];
  assert.ok(renderer.root.findByProps({ role: "dialog", "aria-label": "Burning Bridge target card selection" }));
  assert.equal(button(renderer, { "aria-label": "Hidden hand card 1" }).props["aria-pressed"], false);
  assert.equal(button(renderer, { children: "Use Burning Bridge" }).props.disabled, true, "the effect-specific action waits for an eligible selection");
  assert.equal(consoleButtonsByClass(renderer, "primary").length, 0, "dialog-owned target-card submission is not duplicated in the footer");
  await act(async () => { button(renderer, { "aria-label": "Hidden hand card 1" }).props.onClick(); });
  assert.equal(actionCalls.length, 0, "private hand-card selection sends no action");
  assert.equal(button(renderer, { "aria-label": "Hidden hand card 1" }).props["aria-pressed"], true);
  assert.deepEqual({ kind: renderer.root.findByType("main").props["data-presentation-kind"], interaction: renderer.root.findByType("main").props["data-presentation-has-interaction"], local: renderer.root.findByType("main").props["data-presentation-local-control"] }, mainBefore, "local private selection does not alter public presentation attributes");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props["data-interaction-roles"], publicRolesBefore, "private card selection does not change public seat roles");
  assert.equal(button(renderer, { children: "Use Burning Bridge" }).props.disabled, false);
  await act(async () => { button(renderer, { children: "Cancel" }).props.onClick(); });
  assert.equal(actionCalls.length, 0, "Cancel sends neither gameplay nor decline action");
  assert.equal(button(renderer, { "aria-label": "Hidden hand card 1" }).props["aria-pressed"], false, "Cancel clears the opaque card selection");
  assert.equal(button(renderer, { children: "Use Burning Bridge" }).props.disabled, true);
  await act(async () => { button(renderer, { "aria-label": "Equipment: Nio Shield" }).props.onClick(); });
  await act(async () => { button(renderer, { children: "Use Burning Bridge" }).props.onClick(); });
  assert.deepEqual(actionCalls, [["choose_target_card", { targetCardZone: "equipment", targetCardId: "target-armor" }]], "Confirm preserves the existing action and payload exactly once");
  await act(async () => { renderer.unmount(); });
});

for (const cardKind of ["Steal", "Dismantle"]) {
test(`${cardKind} pending card choice uses the shared modal without duplicate Local Dock controls`, async () => {
    const room = pendingTargetCardRoom("target-card-focus", { cardKind, withFocusProjection: true });
    const actionName = cardKind === "Dismantle" ? "Burning Bridge" : cardKind;
    const title = cardKind === "Dismantle" ? "BURNING BRIDGE" : "STEAL";
    const instruction = cardKind === "Dismantle" ? "Choose 1 card to discard" : "Choose 1 card to obtain";
    const useLabel = `Use ${actionName}`;
    const actionCalls = [];
    let renderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async (...args) => { actionCalls.push(args); return true; }, onLeave: () => {} }))); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    const modal = renderer.root.findByProps({ role: "dialog", "aria-label": `${actionName} target card selection` });
    assert.ok(modal, "the proven external choice uses the shared accessible modal");
    assert.equal(text(renderer, title).length, 1);
    assert.equal(text(renderer, instruction).length, 1);
    assert.equal(renderer.root.findAll((node) => node.props?.role === "dialog").length, 1);
    assert.equal(renderer.root.findAll((node) => node.props?.["data-hero-focus-mode"] === "SELECTABLE DETAIL").length, 0, "the choice is not duplicated in Hero Focus");
    assert.equal(button(renderer, { "aria-label": "Hidden hand card 1" }).props["data-target-card-zone"], "hand-position");
    assert.equal(button(renderer, { "aria-label": "Judgement: Lightning" }).props["data-target-card-zone"], "judgement");
    assert.equal(button(renderer, { "aria-label": "Equipment: Nio Shield" }).props["data-target-card-zone"], "equipment");
    assert.equal(button(renderer, { children: useLabel }).props.disabled, true, "modal confirmation waits for one eligible selection");
    assert.equal(buttons(renderer, { children: "Confirm" }).length, 0, "no duplicate footer Confirm is rendered");
    assert.equal(consoleButtons(renderer).filter((node) => node.props.children === "Cancel").length, 0, "no duplicate footer Cancel is rendered");
    assert.equal(button(renderer, { children: "Cancel" }).props.disabled, false, "modal owns local cancellation");

    const stageBefore = renderer.root.findByProps({ className: "interaction-stage" }).props["data-presentation-revision"];
    await act(async () => { button(renderer, { "aria-label": "Hidden hand card 1" }).props.onClick(); });
    assert.equal(actionCalls.length, 0, "hidden-position selection remains local");
    assert.equal(button(renderer, { "aria-label": "Hidden hand card 1" }).props["aria-pressed"], true);
    assert.equal(button(renderer, { children: useLabel }).props.disabled, false);
    assert.equal(renderer.root.findByProps({ className: "interaction-stage" }).props["data-presentation-revision"], stageBefore, "private choice does not mutate public presentation");

    await act(async () => { button(renderer, { children: "Cancel" }).props.onClick(); });
    assert.equal(actionCalls.length, 0, "modal Cancel remains local");
    assert.equal(button(renderer, { "aria-label": "Hidden hand card 1" }).props["aria-pressed"], false);
    await act(async () => { button(renderer, { "aria-label": "Equipment: Nio Shield" }).props.onClick(); });
    await act(async () => { button(renderer, { children: useLabel }).props.onClick(); });
    assert.deepEqual(actionCalls, [["choose_target_card", { targetCardZone: "equipment", targetCardId: "target-armor" }]], "modal action keeps the existing public-card payload exactly once");
    assert.equal(text(renderer, "target-armor").length, 0, "physical object IDs are not rendered as player-facing text");
    await act(async () => { renderer.unmount(); });
});
}

test("pending target-card routing requires valid CurrentAction authority but not Stage Hero Focus", async () => {
  const cases = [
    { room: pendingTargetCardRoom(), modal: false, label: "missing target-card projection" },
    { room: pendingTargetCardRoom("target-card-unfocused", { withFocusProjection: true, focusTarget: false }), modal: true, label: "valid authority without external Hero Focus" },
    { room: pendingTargetCardRoom("target-card-invalid-key", { withFocusProjection: true, eligibleKeys: ["hand:99"] }), modal: false, label: "invalid eligible position" },
  ];
  for (const { room, modal, label } of cases) {
    let renderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    assert.equal(renderer.root.findAll((node) => node.props?.role === "dialog" && node.props?.className?.includes("target-card-picker")).length, modal ? 1 : 0, `${label}: only valid server-projected eligibility reaches the unified modal`);
    assert.equal(renderer.root.findAll((node) => node.props?.className?.includes("table-hidden-card-picker")).length, 0, `${label}: no unrelated legacy picker is restored as fallback`);
    assert.equal(renderer.root.findAll((node) => node.props?.["data-hero-focus-mode"] === "SELECTABLE DETAIL").length, 0, `${label}: selection does not fall back to Hero Focus`);
    if (!modal) assert.equal(renderer.root.findAll((node) => node.props?.["aria-label"]?.startsWith("Hidden hand card")).length, 0, `${label}: missing/invalid authority fails closed`);
    await act(async () => { renderer.unmount(); });
  }
});

test("target-card trigger picker adds local Cancel while preserving Skip and opaque keys", async () => {
  const room = triggerRoom({ triggerOptions: [{ effectId: "future_target_cards", label: "Future Target Cards", selection: { type: "target_cards", targetId: "p2", min: 1, max: 2, eligibleKeys: ["hand:0", "not-eligible"] } }] });
  const actionCalls = [];
  const action = async (...args) => { actionCalls.push(args); return true; };
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const actionCountBeforeSelection = actionCalls.length;
  assert.equal(buttonsContaining(renderer, "Cancel").length, 1, "one picker-local Cancel surface is shown");
  assert.equal(buttonsContaining(renderer, "Skip").length, 1, "Skip remains the separate authoritative action");
  assert.equal(consoleButtonsByClass(renderer, "primary").length, 0, "dialog-owned target-card trigger submission is not duplicated in the footer");
  assert.equal(button(renderer, { children: "Use Future Target Cards" }).props.disabled, true);
  await act(async () => { button(renderer, { "aria-label": "Hidden hand card 1" }).props.onClick(); });
  assert.equal(actionCalls.length, actionCountBeforeSelection, "target-card trigger selection sends no action");
  assert.equal(button(renderer, { "aria-label": "Hidden hand card 1" }).props["aria-pressed"], true);
  await act(async () => { button(renderer, { children: "Cancel" }).props.onClick(); });
  assert.equal(actionCalls.length, actionCountBeforeSelection, "picker Cancel does not decline the trigger");
  assert.equal(button(renderer, { "aria-label": "Hidden hand card 1" }).props["aria-pressed"], false, "picker Cancel clears the full local attempt");
  await act(async () => { button(renderer, { "aria-label": "Hidden hand card 1" }).props.onClick(); });
  await act(async () => { button(renderer, { children: "Use Future Target Cards" }).props.onClick(); });
  assert.deepEqual(actionCalls.filter(([actionName]) => actionName === "trigger"), [["trigger", { providerId: "future_target_cards", cardKeys: ["hand:0"] }]], "Confirm preserves the semantic trigger payload exactly once");
  assert.equal(renderer.root.findAll((node) => typeof node.props?.children === "string" && node.props.children.includes("hand:0")).length, 0, "opaque key is not rendered as public text");
  await act(async () => { renderer.unmount(); });
});

test("pending target-card selection clears when authoritative availability changes", async () => {
  const room = pendingTargetCardRoom("target-card-revision", { withFocusProjection: true });
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { button(renderer, { "aria-label": "Hidden hand card 2" }).props.onClick(); });
  assert.equal(button(renderer, { "aria-label": "Hidden hand card 2" }).props["aria-pressed"], true);
  const changed = pendingTargetCardRoom(room.actionRevision, { handCount: 1, withFocusProjection: true });
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: changed, onRecover: () => {} }, React.createElement(GameRoom, { room: changed, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(button(renderer, { "aria-label": "Hidden hand card 1" }).props["aria-pressed"], false, "availability change clears stale opaque selection");
  assert.equal(button(renderer, { children: "Use Burning Bridge" }).props.disabled, true);
  await act(async () => { renderer.unmount(); });
});

test("generic trigger Cancel clears provider and target without replacing Skip", async () => {
  const room = { ...triggerRoom({ triggerOptions: [{ effectId: "future_target", label: "Future Target", selection: { type: "target", targetIds: ["p2"], min: 1, max: 1 } }] }), isMyTurn: true };
  const actionCalls = [];
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async (...args) => { actionCalls.push(args); return true; }, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(consoleButtonsByClass(renderer, "primary").length, 0, "a stale isMyTurn flag cannot expose a turn footer primary during a trigger");
  assert.equal(consoleButtons(renderer).filter((node) => node.props.children === "End").length, 0, "trigger owns the footer instead of stale End");
  await act(async () => { button(renderer, { children: "Use Future Target" }).props.onClick(); });
  await act(async () => { button(renderer, { "aria-label": "Select TARGET" }).props.onClick(); });
  assert.equal(buttonsContaining(renderer, "Cancel").length, 1, "the provider-owned Cancel is the only cancel surface");
  const actionCountBeforeCancel = actionCalls.length;
  await act(async () => { buttonsContaining(renderer, "Cancel")[0].props.onClick(); });
  assert.equal(actionCalls.length, actionCountBeforeCancel, "provider Cancel does not submit or decline");
  assert.equal(button(renderer, { children: "Use Future Target" }).props.disabled, false, "the trigger can restart after Cancel");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("selected-target"), false);
  assert.equal(button(renderer, { children: "Skip" }).props.disabled, false, "Skip remains authoritative and separate");
  await act(async () => { renderer.unmount(); });
});

const activeSkills = [
  { hero: "liu-bei", effectId: "liu_bei_rende", label: "Benevolence", skill: "Benevolence", cardIds: ["rende-card"], targetIds: ["p2"], min: 1, max: 2, targetMin: 1, targetMax: 1 },
  { hero: "gan-ning", effectId: "gan_ning_qixi", label: "Ambushment", skill: "Ambushment", cardIds: ["qixi-black"], targetIds: ["p2"], min: 1, max: 1, targetMin: 1, targetMax: 1 },
  { hero: "diao-chan", effectId: "diao_chan_lust", label: "Lust", skill: "Lust", cardIds: ["lust-card"], targetIds: ["p2", "p3"], min: 1, max: 1, targetMin: 2, targetMax: 2 },
  { hero: "hua-tuo", effectId: "hua_tuo_prodigal_healer", label: "Prodigal Healer", skill: "Prodigal Healer", cardIds: ["hua-card"], targetIds: ["p2"], min: 1, max: 1, targetMin: 1, targetMax: 1 },
  { hero: "sun-shangxiang", effectId: "sun_shangxiang_betrothment", label: "Betrothment", skill: "Betrothment", cardIds: ["sun-card-a", "sun-card-b"], targetIds: ["p2"], min: 2, max: 2, targetMin: 1, targetMax: 1 },
];

for (const skill of activeSkills) {
  test(`${skill.label} survives click, selection, cancel, re-entry, and submission`, async () => {
    const { renderer, actionCalls } = await gameTree(skill);
    const skillButton = () => button(renderer, { "aria-label": skill.skill });
    const useButton = () => button(renderer, { children: "Confirm" });

    await act(async () => { skillButton().props.onClick(); });
    assert.equal(recoveryRendered(renderer), false, `${skill.label} must survive activation rerender`);
    assert.equal(useButton().props.disabled, true, `${skill.label} cannot submit empty selection`);
    assert.equal(handCardButton(renderer, skill.cardIds[0]).props.disabled, false, `${skill.label} card is selectable`);
    for (const targetId of skill.targetIds) assert.equal(targetButton(renderer, targetId).props.disabled, false, `${skill.label} target ${targetId} is selectable`);

    await act(async () => { skillButton().props.onClick(); });
    assert.equal(recoveryRendered(renderer), false, `${skill.label} cancel must not crash`);
    await act(async () => { skillButton().props.onClick(); });
    assert.equal(useButton().props.disabled, true, `${skill.label} re-entry resets empty selection`);

    for (const cardId of skill.cardIds) await act(async () => { handCardButton(renderer, cardId).props.onClick(); });
    for (const targetId of skill.targetIds) await act(async () => { targetButton(renderer, targetId).props.onClick(); });
    assert.equal(useButton().props.disabled, false, `${skill.label} enables only after required selection`);
    if (skill.effectId === "diao_chan_lust") {
      assert.match(statusText(renderer), /Lust order: TARGET ONE plays Attack first, then TARGET TWO\./, "Diao Chan Lust keeps its target-order guidance");
      assert.equal(buttonsContaining(renderer, "Cancel").length, 1, "Diao Chan Lust keeps local Cancel with its guidance");
    }
    const actionCountBeforeCancel = actionCalls.length;
    await act(async () => { button(renderer, { children: "Cancel" }).props.onClick(); });
    assert.equal(actionCalls.length, actionCountBeforeCancel, `${skill.label} Cancel sends no action`);
    assert.equal(button(renderer, { "aria-label": skill.skill }).props["aria-pressed"], false, `${skill.label} Cancel exits the active local skill flow`);
    for (const cardId of skill.cardIds) assert.equal(handCardButton(renderer, cardId).props.className.includes("selected"), false, `${skill.label} Cancel clears the selected card`);
    for (const targetId of skill.targetIds) assert.equal(nodeWith(renderer, "data-player-anchor", targetId).props.className.includes("selected-target"), false, `${skill.label} Cancel clears the selected target`);
    await act(async () => { skillButton().props.onClick(); });
    for (const cardId of skill.cardIds) await act(async () => { handCardButton(renderer, cardId).props.onClick(); });
    for (const targetId of skill.targetIds) await act(async () => { targetButton(renderer, targetId).props.onClick(); });
    assert.equal(useButton().props.disabled, false, `${skill.label} can restart after complete Cancel`);
    await act(async () => { useButton().props.onClick(); });

    assert.deepEqual(actionCalls.at(-1), ["trigger", { providerId: skill.effectId, cardIds: skill.cardIds, ...(skill.targetIds.length > 1 ? { targetIds: skill.targetIds } : { targetId: skill.targetIds[0] }) }]);
    assert.equal(recoveryRendered(renderer), false, `${skill.label} submission must not activate recovery UI`);
    await act(async () => { renderer.unmount(); });
  });
}

test("Zhang Liao Assault uses generic target controls during the Draw Phase", async () => {
  const skill = { hero: "zhang-liao", effectId: "zhang_liao_assault", label: "Assault", skill: "Assault", cardIds: [], targetIds: ["p2", "p3"], targetMin: 1, targetMax: 2, selectionType: "target", phase: "draw", triggerEvent: "draw_phase", extraPlayer: { id: "p4", name: "INVALID TARGET" } };
  const { renderer, actionCalls } = await gameTree(skill);
  const skillButton = () => button(renderer, { "aria-label": "Assault" });
  const useButton = () => button(renderer, { children: "Confirm" });

  assert.equal(button(renderer, { "aria-label": "Inspect TARGET ONE" }).props.disabled, false, "inactive Assault preserves inspection controls");
  await act(async () => { button(renderer, { "aria-label": "Inspect TARGET ONE" }).props.onClick(); });
  assert.equal(renderer.root.findAllByProps({ role: "dialog" }).length, 1, "inactive opponent hero click opens inspection");
  await act(async () => { renderer.root.findByProps({ "aria-label": "Close TARGET ONE inspection" }).props.onClick(); });

  await act(async () => { skillButton().props.onClick(); });
  assert.equal(button(renderer, { "aria-label": "Select TARGET ONE" }).props.disabled, false);
  assert.equal(button(renderer, { "aria-label": "Select TARGET TWO" }).props.disabled, false);
  assert.equal(button(renderer, { "aria-label": "Select INVALID TARGET" }).props.disabled, true, "non-eligible targets remain disabled");
  assert.equal(renderer.root.findAllByProps({ role: "dialog" }).length, 0, "target mode does not open inspection");

  await act(async () => { button(renderer, { "aria-label": "Select TARGET ONE" }).props.onClick(); });
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("selected-target"), true);
  assert.equal(useButton().props.disabled, false, "one Assault target enables submission");
  await act(async () => { skillButton().props.onClick(); });
  assert.equal(skillButton().props["aria-pressed"], true, "the skill button is not a second local Cancel surface");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("selected-target"), true, "the second skill click preserves the local target");
  const actionCountAfterSelection = actionCalls.length;
  await act(async () => { button(renderer, { children: "Cancel" }).props.onClick(); });
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("selected-target"), false, "Cancel clears the local amber target");
  assert.equal(actionCalls.length, actionCountAfterSelection, "local Cancel does not submit a gameplay action");
  await act(async () => { skillButton().props.onClick(); });
  await act(async () => { button(renderer, { "aria-label": "Select TARGET ONE" }).props.onClick(); });
  assert.equal(useButton().props.disabled, false, "the target can be reselected after local Cancel");
  await act(async () => { button(renderer, { "aria-label": "Select TARGET TWO" }).props.onClick(); });
  assert.equal(nodeWith(renderer, "data-player-anchor", "p3").props.className.includes("selected-target"), true);
  assert.equal(button(renderer, { "aria-label": "Select INVALID TARGET" }).props.disabled, true);
  assert.doesNotMatch(statusText(renderer), /Lust order/, "Zhang Liao Assault never renders Diao Chan Lust guidance");
  assert.equal(useButton().props.disabled, false, "two Assault targets keep Confirm enabled");
  await act(async () => { useButton().props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["trigger", { providerId: "zhang_liao_assault", targetIds: ["p2", "p3"] }]);

  await act(async () => { button(renderer, { children: "Cancel" }).props.onClick(); });
  assert.equal(button(renderer, { "aria-label": "Inspect TARGET ONE" }).props.disabled, false, "explicit Cancel exits target mode");
  await act(async () => { skillButton().props.onClick(); });
  assert.equal(useButton().props.disabled, true, "reactivation resets target selection");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("selected-target"), false);
  await act(async () => { renderer.unmount(); });
});

test("Quick Test projected Zhang Liao seat keeps Assault Confirm available", async () => {
  const skill = { hero: "zhang-liao", effectId: "zhang_liao_assault", label: "Assault", skill: "Assault", cardIds: [], targetIds: ["p2", "p3"], targetMin: 1, targetMax: 2, selectionType: "target", phase: "draw", triggerEvent: "draw_phase" };
  const room = activeSkillRoom(skill);
  assert.equal(room.isTestController, true, "the mounted regression uses the shared Quick Test controller");
  assert.equal(room.meId, "p1", "the projected controller seat is Zhang Liao");
  assert.equal(room.isMyAction, true, "the projected Zhang Liao seat owns the current decision");
  const actionCalls = [];
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async (...args) => { actionCalls.push(args); return true; }, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const assault = button(renderer, { "aria-label": "Assault" });
  assert.equal(assault.props.disabled, false);
  await act(async () => { assault.props.onClick(); });
  await act(async () => { targetButton(renderer, "p2").props.onClick(); });
  await act(async () => { targetButton(renderer, "p3").props.onClick(); });
  nodeWith(renderer, "data-console-surface", "local-operation");
  const consoleDecision = nodeWith(renderer, "data-console-primary", "Confirm");
  assert.equal(consoleDecision.props["data-console-primary-enabled"], "true");
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, false);
  await act(async () => { button(renderer, { children: "Confirm" }).props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["trigger", { providerId: "zhang_liao_assault", targetIds: ["p2", "p3"] }]);
  await act(async () => { renderer.unmount(); });
});

test("Zhang Liao Assault keeps Confirm visible when a late presentation is still settling", async () => {
  const skill = { hero: "zhang-liao", effectId: "zhang_liao_assault", label: "Assault", skill: "Assault", cardIds: [], targetIds: ["p2", "p3"], targetMin: 1, targetMax: 2, selectionType: "target", phase: "draw", triggerEvent: "draw_phase" };
  const room = activeSkillRoom(skill);
  const actionCalls = [];
  const useButton = (tree) => button(tree, { children: "Confirm" });
  const action = async (...args) => { actionCalls.push(args); return true; };
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { button(renderer, { "aria-label": "Assault" }).props.onClick(); });
  await act(async () => { button(renderer, { "aria-label": "Select TARGET ONE" }).props.onClick(); });
  await act(async () => { button(renderer, { "aria-label": "Select TARGET TWO" }).props.onClick(); });
  const actionCountBeforeLatePresentation = actionCalls.length;

  const lateCard = { type: "card", id: "late-assault-presentation", player: "ACTIVE HERO", target: "TARGET ONE", action: "play", card: card("late-assault-card", "Attack") };
  const lateRoom = normalizeRoomData({ ...room, timeline: [lateCard] });
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: lateRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: lateRoom, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

  assert.equal(useButton(renderer).props.disabled, false, "a late presentation cannot hide or disable Assault Confirm");
  assert.equal(actionCalls.length, actionCountBeforeLatePresentation, "a late presentation has not emitted a gameplay action");
  await act(async () => { renderer.unmount(); });
});

test("Cultivation trigger has a routed skill control, generic prompt, and continuation-safe UI", async () => {
    const room = triggerRoom();
    let actionCalls = [];
    const onAction = async (...args) => { actionCalls.push(args); return true; };
    let renderer;
    await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction, onLeave: () => {} }))); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    const cultivation = button(renderer, { "aria-label": "Cultivation" });
    assert.equal(cultivation.props.disabled, false, "Cultivation exposes a Skills-panel control");
    assert.equal(text(renderer, "Your action · Use Cultivation: Draw 1 card after using a Stratagem, or skip").length, 1, "Cultivation uses the trigger-specific prompt");
    assert.equal(button(renderer, { children: "Skip" }).props.disabled, false, "Cultivation keeps the optional skip action");
    await act(async () => { cultivation.props.onClick(); });
    assert.deepEqual(actionCalls.at(-1), ["trigger", { providerId: "huang_yueying_cultivation" }]);

    let skipRenderer;
    const skipRoom = triggerRoom();
    await act(async () => { skipRenderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room: skipRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: skipRoom, busy: false, error: "", onAction, onLeave: () => {} }))); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    await act(async () => { button(skipRenderer, { children: "Skip" }).props.onClick(); });
    assert.deepEqual(actionCalls.at(-1), ["decline_trigger"]);

    const opponentRoom = triggerRoom({ meId: "p2", triggerOptions: [] });
    let opponentRenderer;
    await act(async () => { opponentRenderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room: opponentRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: opponentRoom, busy: false, error: "", onAction, onLeave: () => {} }))); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    assert.equal(opponentRenderer.root.findAll((node) => typeof node.props?.children === "string" && node.props.children.includes("WAITING FOR HUANG YUEYING")).length, 1, "opponent waits for the trigger actor");
    assert.equal(opponentRenderer.root.findAll((node) => typeof node.props?.children === "string" && node.props.children.includes("Waiting for the target to answer the attacker")).length, 0, "the Attack fallback prompt is absent");
    assert.equal(opponentRenderer.root.findAll((node) => typeof node.props?.children === "string" && node.props.children.includes("Use Cultivation")).length, 0, "Cultivation remains private");
    assert.equal(opponentRoom.actionPlayerId, "p1");
    assert.equal(opponentRoom.currentAction.actorId, "p1");

    const continuationRoom = normalizeRoomData({ ...room, isMyAction: false, actionPlayerId: "p2", currentAction: { version: 3, kind: "response", actorId: "p2", deadline: 0, reason: "Negation window", requirement: "negate", legalActions: ["respond", "decline_response"], options: [], triggerOptions: [] }, pendingNegation: { kind: "negation", actorId: "p2", responseTarget: "Stratagem's effect on TARGET", cardName: "Stratagem" }, phase: "response" });
    await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: continuationRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: continuationRoom, busy: false, error: "", onAction, onLeave: () => {} }))); });
    assert.ok(renderer.root.findAll((node) => typeof node.props?.children === "string" && node.props.children.includes("Negation window")).length >= 1, "the original continuation remains visible after Cultivation");
    await act(async () => { renderer.unmount(); skipRenderer.unmount(); opponentRenderer.unmount(); });
});

test("Diao Chan Beauty uses exactly one routed profile control and remains disabled when unavailable", async () => {
  const beautyOption = { effectId: "diao_chan_beauty_outshining_moon", label: "Beauty Outshining the Moon", selection: null };
  const room = triggerRoom({ hero: "diao-chan", playerName: "DIAO CHAN", code: "BEAUTY-UI", triggerOptions: [beautyOption], currentAction: { triggerEvent: "turn_end" } });
  const actionCalls = [];
  const onAction = async (...args) => { actionCalls.push(args); return true; };
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

  const beautyButtons = buttonsContaining(renderer, "Beauty Outshining the Moon");
  assert.equal(beautyButtons.length, 1, "Beauty has only one rendered control");
  assert.equal(beautyButtons[0].props["aria-label"], "Beauty Outshining the Moon");
  assert.equal(beautyButtons[0].props.disabled, false, "Beauty is enabled during its turn-end trigger");
  assert.equal(buttonsContaining(renderer, "Use Beauty Outshining the Moon").length, 0, "Beauty is not duplicated in generic trigger controls");
  assert.equal(button(renderer, { children: "Skip" }).props.disabled, false, "optional Beauty keeps Skip available");
  await act(async () => { beautyButtons[0].props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["trigger", { providerId: "diao_chan_beauty_outshining_moon" }]);

  const unavailableRoom = triggerRoom({ hero: "diao-chan", playerName: "DIAO CHAN", code: "BEAUTY-UI-INACTIVE", triggerOptions: [], currentAction: { triggerEvent: "turn_end" } });
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: unavailableRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: unavailableRoom, busy: false, error: "", onAction, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const inactiveBeauty = button(renderer, { "aria-label": "Beauty Outshining the Moon" });
  assert.equal(inactiveBeauty.props.disabled, true, "Beauty remains visible but disabled when unavailable");
  await act(async () => { renderer.unmount(); });
});

test("an unmapped future trigger remains available through generic trigger controls", async () => {
  const room = triggerRoom({ triggerOptions: [{ effectId: "future_trigger", label: "Future Trigger", selection: null }] });
  const actionCalls = [];
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async (...args) => { actionCalls.push(args); return true; }, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const future = button(renderer, { children: "Use Future Trigger" });
  assert.equal(future.props.disabled, false);
  await act(async () => { future.props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["trigger", { providerId: "future_trigger" }]);
  await act(async () => { renderer.unmount(); });
});

test("an unmapped attack_targeted trigger stays generic beside mapped Da Qiao Deflection", async () => {
  const room = deflectionRoom({ triggerOptions: [
    { effectId: "daqiao_deflection", label: "Deflection", description: "Discard 1 card to transfer this Attack.", allowDecline: true, selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["deflection-hand"], targetIds: ["p3"], targetMin: 1, targetMax: 1 } },
    { effectId: "future_attack_targeted", label: "Future Attack Trigger", description: "Synthetic unmapped attack-targeted provider." },
  ] });
  const actionCalls = [];
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async (...args) => { actionCalls.push(args); return true; }, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

  assertOnlyDeflectionProfile(renderer);
  assert.equal(button(renderer, { "aria-label": "Deflection" }).props.disabled, false);
  const future = button(renderer, { children: "Use Future Attack Trigger" });
  assert.equal(future.props.disabled, false);
  assert.equal(buttonsContaining(renderer, "Future Attack Trigger").length, 1, "the unmapped attack_targeted provider uses the generic trigger control");
  await act(async () => { future.props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["trigger", { providerId: "future_attack_targeted" }]);
  assertOnlyDeflectionProfile(renderer);
  await act(async () => { renderer.unmount(); });
});

test("Da Qiao Deflection is one mounted hero control with shared card/target selection", async () => {
  const room = deflectionRoom();
  const actionCalls = [];
  const action = async (...args) => { actionCalls.push(args); return true; };
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

  assert.equal(recoveryRendered(renderer), false);
  assertOnlyDeflectionProfile(renderer);
  const profileButton = button(renderer, { "aria-label": "Deflection" });
  assert.equal(profileButton.props.disabled, false);
  assert.equal(button(renderer, { children: "Skip" }).props.disabled, false);
  assert.equal(renderer.root.findAllByProps({ children: "Confirm" }).length, 0);
  assert.equal(renderer.root.findAllByProps({ "aria-label": "Select ATTACKER" }).length, 0);
  assert.equal(renderer.root.findAllByProps({ "aria-label": "Select LEGAL TARGET" }).length, 0);

  await act(async () => { profileButton.props.onClick(); });
  assert.equal(recoveryRendered(renderer), false);
  assertOnlyDeflectionProfile(renderer);
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, true, "Confirm is disabled before selecting a cost and target");
  assert.equal(handCardButton(renderer, "deflection-hand").props.disabled, false);
  assert.equal(handCardButton(renderer, "deflection-ineligible").props.disabled, true, "unprojected cards remain disabled");
  assert.equal(button(renderer, { "aria-label": "Select ATTACKER" }).props.disabled, true);
  assert.equal(button(renderer, { "aria-label": "Select LEGAL TARGET" }).props.disabled, false);
  assert.equal(button(renderer, { "aria-label": "Select OUT OF WINDOW" }).props.disabled, true);
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, true);

  await act(async () => { handCardButton(renderer, "deflection-hand").props.onClick(); });
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, true, "Confirm stays disabled with only the cost selected");
  await act(async () => { button(renderer, { "aria-label": "Select LEGAL TARGET" }).props.onClick(); });
  assert.equal(nodeWith(renderer, "data-player-anchor", "p3").props.className.includes("selected-target"), true);
  assertOnlyDeflectionProfile(renderer);
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, false);
  const actionCountBeforeTargetCancel = actionCalls.length;
  await act(async () => { button(renderer, { children: "Cancel" }).props.onClick(); });
  assert.equal(nodeWith(renderer, "data-player-anchor", "p3").props.className.includes("selected-target"), false, "trigger Cancel clears the local target");
  assert.equal(handCardButton(renderer, "deflection-hand").props.className.includes("selected"), false, "trigger Cancel clears the local cost card");
  assert.equal(actionCalls.length, actionCountBeforeTargetCancel, "trigger Cancel does not decline the trigger");
  await act(async () => { button(renderer, { "aria-label": "Deflection" }).props.onClick(); });
  await act(async () => { handCardButton(renderer, "deflection-hand").props.onClick(); });
  await act(async () => { button(renderer, { "aria-label": "Select LEGAL TARGET" }).props.onClick(); });
  await act(async () => { button(renderer, { children: "Confirm" }).props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["trigger", { providerId: "daqiao_deflection", cardIds: ["deflection-hand"], targetId: "p3" }]);
  assert.equal(recoveryRendered(renderer), false);

  await act(async () => { renderer.unmount(); });
});

test("Sima Yi Retaliation activates before opening target-card selection", async () => {
  const room = retaliationRoom();
  const actionCalls = [];
  const action = async (...args) => { actionCalls.push(args); return true; };
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

  const skillButton = () => button(renderer, { "aria-label": "Retaliation" });
  const picker = () => renderer.root.findAllByProps({ "aria-label": "Retaliation target card selection" });
  assert.equal(skillButton().props.disabled, false);
  assert.equal(skillButton().props["aria-pressed"], false);
  assert.equal(picker().length, 0, "Retaliation does not open its picker before activation");
  assert.equal(button(renderer, { children: "Skip" }).props.disabled, false);
  assert.equal(actionCalls.filter(([actionName]) => actionName === "trigger").length, 0, "Retaliation does not submit before activation");

  await act(async () => { skillButton().props.onClick(); });
  assert.equal(skillButton().props["aria-pressed"], true);
  assert.equal(picker().length, 1, "activating Retaliation opens the picker");
  assert.equal(actionCalls.filter(([actionName]) => actionName === "trigger").length, 0, "activation does not submit the trigger");

  const eligibleCard = button(renderer, { "data-target-card-zone": "hand" });
  assert.equal(eligibleCard.props["aria-pressed"], false);
  await act(async () => { eligibleCard.props.onClick(); });
  assert.equal(button(renderer, { children: "Use Retaliation" }).props.disabled, false);

  await act(async () => { skillButton().props.onClick(); });
  assert.equal(picker().length, 0, "clicking active Retaliation cancels the picker");
  await act(async () => { skillButton().props.onClick(); });
  assert.equal(picker().length, 1);
  assert.equal(button(renderer, { "data-target-card-zone": "hand" }).props["aria-pressed"], false, "re-entry clears selected zones");

  await act(async () => { button(renderer, { "data-target-card-zone": "hand" }).props.onClick(); });
  const revisedRoom = retaliationRoom("retaliation-ui-revision-2");
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: revisedRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: revisedRoom, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(picker().length, 0, "a new action revision clears active Retaliation");
  await act(async () => { skillButton().props.onClick(); });
  assert.equal(button(renderer, { "data-target-card-zone": "hand" }).props["aria-pressed"], false, "a new action revision clears stale selection");
  await act(async () => { button(renderer, { "data-target-card-zone": "hand" }).props.onClick(); });
  await act(async () => { button(renderer, { children: "Use Retaliation" }).props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["trigger", { providerId: "sima_yi_fankui", cardKeys: ["hand"] }]);

  const skipRendererRoom = retaliationRoom("retaliation-ui-skip");
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: skipRendererRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: skipRendererRoom, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { button(renderer, { children: "Skip" }).props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["decline_trigger"]);
  assert.equal(picker().length, 0, "Skip does not open Retaliation selection");
  await act(async () => { renderer.unmount(); });
});

test("Da Qiao Deflection can select projected Equipment and resets stale selection state", async () => {
  const room = deflectionRoom({ equipment: true });
  const actionCalls = [];
  const action = async (...args) => { actionCalls.push(args); return true; };
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { button(renderer, { "aria-label": "Deflection" }).props.onClick(); });
  const equipmentButton = nodeWith(renderer, "data-equipment-id", "deflection-equipment").findAllByType("button").find((entry) => entry.props.className.includes("local-zone-card-button"));
  assert.ok(equipmentButton, "the projected Equipment card is mounted as a selectable cost");
  assert.equal(equipmentButton.props.disabled, false);
  assert.equal(renderer.root.findAllByProps({ "data-hand-card-id": "deflection-equipment" }).length, 0);
  await act(async () => { equipmentButton.props.onClick(); });
  await act(async () => { button(renderer, { "aria-label": "Select LEGAL TARGET" }).props.onClick(); });
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, false);
  await act(async () => { button(renderer, { "aria-label": "Deflection" }).props.onClick(); });
  assert.equal(renderer.root.findAllByProps({ children: "Confirm" }).length, 0, "cancelling clears the shared selection mode");
  await act(async () => { button(renderer, { "aria-label": "Deflection" }).props.onClick(); });
  assertOnlyDeflectionProfile(renderer);
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, true, "re-entry starts with no stale cost or target");
  await act(async () => { button(renderer, { children: "Skip" }).props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["decline_trigger"]);
  assert.equal(recoveryRendered(renderer), false);

  const reloaded = normalizeRoomData({ ...room, actionRevision: "deflection-ui-revision-2" });
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: reloaded, onRecover: () => {} }, React.createElement(GameRoom, { room: reloaded, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(renderer.root.findAllByProps({ children: "Confirm" }).length, 0, "a new action revision cannot reuse the old selection");
  await act(async () => { button(renderer, { "aria-label": "Deflection" }).props.onClick(); });
  assertOnlyDeflectionProfile(renderer);
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, true);
  await act(async () => { renderer.unmount(); });
});

test("group card scope preview is local, rule-derived, and does not become target selection", async () => {
  const actionCalls = [];
  const action = async (...args) => { actionCalls.push(args); return false; };
  let room = groupScopeRoom("Oath");
  let renderer;
  const render = async (nextRoom, busy = false, presentationView) => {
    room = nextRoom;
    await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, presentationView, busy, error: "", onAction: action, onLeave: () => {} }))); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  };
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

  await act(async () => { handCardButton(renderer, "Oath-card").props.onClick(); });
  assert.equal(nodeWith(renderer, "data-player-anchor", "p1").props["data-local-group-preview"], "true", "Oath includes the wounded local player");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props["data-local-group-preview"], "true", "Oath includes wounded opponents");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p3").props["data-local-group-preview"], undefined, "Oath excludes full-health players");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p4").props["data-local-group-preview"], undefined, "Oath excludes defeated players");
  assert.equal(nodeWith(renderer, "data-group-scope-preview", "Oath").props.children.join(""), "PREVIEW · WOUNDED CHARACTERS");
  assert.equal(button(renderer, { "aria-label": "Inspect WOUNDED" }).props.disabled, false, "scope decoration does not create a target control");
  await act(async () => { button(renderer, { "aria-label": "Inspect WOUNDED" }).props.onClick(); });
  assert.equal(actionCalls.length, 0, "selecting or inspecting preview scope sends no action");
  await act(async () => { handCardButton(renderer, "Oath-card").props.onClick(); });
  assert.equal(renderer.root.findAllByProps({ "data-group-scope-preview": "Oath" }).length, 0, "deselect clears local scope preview");

  await render(groupScopeRoom("BumperHarvest"));
  await act(async () => { handCardButton(renderer, "BumperHarvest-card").props.onClick(); });
  assert.deepEqual(["p1", "p2", "p3"].map((id) => nodeWith(renderer, "data-player-anchor", id).props["data-local-group-preview"]), ["true", "true", "true"], "Bumper Harvest previews every living player in turn order");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p4").props["data-local-group-preview"], undefined);

  await render(groupScopeRoom("BarbarianInvasion"), false, groupPresentationView());
  await act(async () => { handCardButton(renderer, "BarbarianInvasion-card").props.onClick(); });
  assert.equal(nodeWith(renderer, "data-player-anchor", "p1").props["data-local-group-preview"], undefined, "group attacks exclude their source");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props["data-local-group-preview"], "true");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p3").props["data-local-group-preview"], "true");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("interaction-seat-current-participant"), true, "public interaction semantics remain independently visible");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("local-group-preview"), true, "local preview can overlap without replacing public semantics");
  assert.equal(button(renderer, { children: "Play" }).props.disabled, false);
  await act(async () => { button(renderer, { children: "Play" }).props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["play_card", { cardId: "BarbarianInvasion-card" }], "group play payload contains no invented target IDs");

  await render(groupScopeRoom("RainingArrows", { actionRevision: "raining-stale" }));
  await act(async () => { handCardButton(renderer, "RainingArrows-card").props.onClick(); });
  assert.equal(renderer.root.findAllByProps({ "data-group-scope-preview": "RainingArrows" }).length, 1);
  const stale = normalizeRoomData({ ...room, actionRevision: "raining-response", phase: "response", isMyTurn: false, isMyAction: false, currentAction: { version: 3, kind: "response", actorId: "p2", deadline: 0, reason: "Respond", legalActions: ["respond"] }, myHand: [] });
  await render(stale);
  assert.equal(renderer.root.findAllByProps({ "data-group-scope-preview": "RainingArrows" }).length, 0, "new authoritative action state clears the local preview");

  await render(groupScopeRoom("RainingArrows"), true);
  await act(async () => { handCardButton(renderer, "RainingArrows-card").props.onClick(); });
  assert.equal(renderer.root.findAllByProps({ "data-group-scope-preview": "RainingArrows" }).length, 0, "busy presentation suppresses a stale local preview");
  await act(async () => { renderer.unmount(); });
});

test("group scope preview helper uses only public living-state and turn order", () => {
  const players = [
    { id: "p1", seat: 2, alive: true, hp: 2, maxHp: 4 },
    { id: "p2", seat: 3, alive: true, hp: 4, maxHp: 4 },
    { id: "p3", seat: 0, alive: false, hp: 0, maxHp: 4 },
    { id: "p4", seat: 1, alive: true, hp: 1, maxHp: 4 },
  ];
  assert.deepEqual(buildGroupScopePreview({ cardKind: "BumperHarvest", sourceId: "p1", turnSeat: 2, players, playAuthorized: true }).affectedPlayerIds, ["p1", "p2", "p4"]);
  assert.deepEqual(buildGroupScopePreview({ cardKind: "RainingArrows", sourceId: "p1", turnSeat: 2, players, playAuthorized: true }).affectedPlayerIds, ["p2", "p4"]);
  assert.deepEqual(buildGroupScopePreview({ cardKind: "Oath", sourceId: "p1", turnSeat: 2, players, playAuthorized: true }).affectedPlayerIds, ["p1", "p4"]);
  assert.equal(buildGroupScopePreview({ cardKind: "Oath", sourceId: "p1", turnSeat: 2, players, playAuthorized: false }).active, false);
});

test("mounted Duel response follows the semantic actor for controls and Hero Focus", async () => {
  const room = duelResponseRoom();
  const actionCalls = [];
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async (...args) => { actionCalls.push(args); return true; }, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.deepEqual(seatAnchorIds(renderer), ["p1", "p2"], "Duel focus uses the existing stable seat anchors");
  assert.equal(renderer.root.findByProps({ "data-stage": "DUEL_EXCHANGE" }).props["data-continuity"], "ROOT_FRAME");
  assert.equal(renderer.root.findByProps({ "data-hero-focus-player-id": "p1" }).props["data-hero-focus-role"], "Target", "the local Duel actor stays in the dock while the unique external counterpart is focused");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("interaction-seat-decision-actor"), true);
  assert.equal(buttonsContaining(renderer, "Skip").length, 1, "the acting Duel seat receives one authoritative Skip");
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, true, "Confirm waits for the local Attack selection");
  await act(async () => { handCardButton(renderer, "duel-response-attack").props.onClick(); });
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, false);
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("selected-target"), false, "local card selection cannot overwrite public seat semantics");
  await act(async () => { button(renderer, { children: "Confirm" }).props.onClick(); });
  assert.deepEqual(actionCalls.filter(([name]) => name === "respond").at(-1), ["respond", { providerId: "card", cardId: "duel-response-attack" }], "the response console preserves the semantic protocol payload");
  await act(async () => { renderer.unmount(); });
});

test("mounted Duel response keeps private controls and public focus viewer-equal", async () => {
  const room = duelResponseRoom({ meId: "p1", actorId: "p2" });
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(renderer.root.findByProps({ "data-hero-focus-player-id": "p2" }).props["data-hero-focus-role"], "Target");
  assert.equal(buttonsContaining(renderer, "Confirm").length, 0, "a non-actor cannot see private response controls");
  assert.equal(buttonsContaining(renderer, "Skip").length, 0, "a non-actor cannot submit the authoritative decline");
  assert.equal(renderer.root.findAllByProps({ "data-hand-card-id": "duel-response-attack" }).length, 0, "the response hand remains private to the acting viewer");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("interaction-seat-decision-actor"), true);
  await act(async () => { renderer.unmount(); });
});

test("mounted Duel response keeps legal cards unselectable while an authoritative request is busy", async () => {
  const room = duelResponseRoom();
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: true, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(handCardButton(renderer, "duel-response-attack").props.disabled, true, "the response card cannot race a busy deadline/action update");
  assert.equal(consoleButtonsByClass(renderer, "primary")[0].props.disabled, true);
  await act(async () => { renderer.unmount(); });
});

test("mounted Duel response clears local selection when the server revision hands off", async () => {
  let room = duelResponseRoom();
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { handCardButton(renderer, "duel-response-attack").props.onClick(); });
  assert.equal(handCardButton(renderer, "duel-response-attack").props.className.includes("selected"), true);
  room = duelResponseRoom({ actorId: "p1", actionRevision: "duel-response-2" });
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.deepEqual(seatAnchorIds(renderer), ["p1", "p2"], "responder handoff keeps seat order and count stable");
  assert.equal(renderer.root.findByProps({ "data-hero-focus-player-id": "p1" }).props["data-hero-focus-role"], "Target");
  assert.equal(buttonsContaining(renderer, "Confirm").length, 0, "the previous local Confirm is removed after handoff");
  assert.equal(buttonsContaining(renderer, "Skip").length, 0, "the previous local Skip is removed after handoff");
  await act(async () => { renderer.unmount(); });
});

test("mounted Duel semantics ignore legacy action owner and turn fields", async () => {
  const base = duelResponseRoom();
  const room = { ...base, actionPlayerId: "p1", actionReason: "legacy owner", turnSeat: 1, isMyTurn: true };
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(renderer.root.findByProps({ "data-stage": "DUEL_EXCHANGE" }).props["data-presentation-revision"], 1);
  assert.equal(renderer.root.findByProps({ "data-hero-focus-player-id": "p1" }).props["data-hero-focus-role"], "Target");
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, true, "CurrentAction still owns the local response console");
  assert.equal(buttonsContaining(renderer, "Skip").length, 1);
  await act(async () => { renderer.unmount(); });
});

test("GameRoom does not calculate a Duel next responder on the client", () => {
  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /nextDuel(?:Response|Responder)|pendingDuel\.opponentId\s*[?:].*actorId/, "Duel alternation remains a server Pending/continuation concern");
});

test("mounted Negation chain is public-only while response selection remains local until Confirm", async () => {
  const room = negationReactionRoom();
  const actionCalls = [];
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async (...args) => { actionCalls.push(args); return true; }, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const chain = renderer.root.findByProps({ "data-reaction-chain": "proven" });
  assert.equal(chain.props["data-reaction-interaction-id"], "negation-interaction");
  assert.equal(renderer.root.findAllByProps({ "data-reaction-node": "root" }).length, 1);
  assert.equal(renderer.root.findAllByProps({ "data-reaction-node": "active" }).length, 1);
  assert.equal(renderer.root.findByProps({ "data-reaction-node": "active" }).props["data-reaction-relation"], "ROOT_FRAME");
  assert.equal(JSON.stringify(renderer.toJSON()).includes("forged-provider"), false, "compatibility counter fields cannot create a public node");
  await act(async () => { handCardButton(renderer, "negation-private").props.onClick(); });
  assert.equal(actionCalls.some(([actionName]) => actionName === "respond"), false, "selecting Negation is local");
  await act(async () => { button(renderer, { children: "Confirm" }).props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["respond", { providerId: "negation_card", cardId: "negation-private" }]);
  await act(async () => { renderer.unmount(); });
});

test("mounted Negation keeps chain viewer-equal, private controls hidden, and stale selection cleared", async () => {
  const actorRoom = negationReactionRoom();
  const observerRoom = negationReactionRoom({ meId: "p1", actorId: "p2" });
  let actor;
  let observer;
  await act(async () => { actor = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room: actorRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: actorRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { observer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room: observerRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: observerRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(actor.root.findAllByProps({ "data-reaction-chain": "proven" }).length, 1);
  assert.equal(observer.root.findAllByProps({ "data-reaction-chain": "proven" }).length, 1);
  assert.equal(JSON.stringify(actor.toJSON()).match(/REACTION CHAIN[\s\S]*?ACTIVE RESPONSE/)?.[0], JSON.stringify(observer.toJSON()).match(/REACTION CHAIN[\s\S]*?ACTIVE RESPONSE/)?.[0], "the chain itself is viewer-equal");
  assert.equal(observer.root.findAllByProps({ "data-hand-card-id": "negation-private" }).length, 0);
  assert.equal(buttonsContaining(observer, "Confirm").length, 0);
  assert.equal(buttonsContaining(observer, "Skip").length, 0);
  await act(async () => { handCardButton(actor, "negation-private").props.onClick(); });
  assert.equal(button(actor, { children: "Confirm" }).props.disabled, false);
  const nextRoom = negationReactionRoom({ actorId: "p1", actionRevision: "negation-response-2" });
  await act(async () => { actor.update(React.createElement(GameRoomErrorBoundary, { room: nextRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: nextRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(actor.root.findAllByProps({ "data-hand-card-id": "negation-private" }).length, 0, "revision/actor change clears the private card selection");
  assert.equal(buttonsContaining(actor, "Confirm").length, 0);
  await act(async () => { actor.unmount(); observer.unmount(); });
});

test("mounted Dying handoff keeps the dying player focused while Peach stays local until submit", async () => {
  const actionCalls = [];
  const actorRoom = dyingRescueRoom();
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room: actorRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: actorRoom, busy: false, error: "", onAction: async (...args) => { actionCalls.push(args); return true; }, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

  const handoff = renderer.root.findByProps({ "data-dying-handoff": "proven" });
  assert.equal(handoff.props["data-dying-player-id"], "p2");
  assert.equal(handoff.props["data-dying-decision-actor-id"], "p3");
  assert.equal(renderer.root.findByProps({ "data-hero-focus-player-id": "p2" }).props["data-hero-focus-role"], "DYING PLAYER");
  assert.equal(renderer.root.findByProps({ "data-stage": "DYING" }).findAllByType("button").length, 0, "public Dying stage has no rescue controls");
  assert.equal(button(renderer, { children: "Peach" }).props.disabled, true, "Peach requires a local card selection");
  assert.equal(buttonsContaining(renderer, "Skip").length, 1);

  await act(async () => { handCardButton(renderer, "dying-peach").props.onClick(); });
  assert.equal(actionCalls.length, 0, "selecting Peach is local preview only");
  assert.equal(button(renderer, { children: "Peach" }).props.disabled, false);
  await act(async () => { button(renderer, { children: "Peach" }).props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["give_peach", { cardId: "dying-peach" }]);
  await act(async () => { button(renderer, { children: "Skip" }).props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["skip_rescue"]);
  await act(async () => { renderer.unmount(); });
});

test("mounted GameRoom exposes semantic transition hooks without animation or private promotion", async () => {
  const initial = dyingRescueRoom();
  const rest = { ...initial, presentationSnapshot: null };
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room: rest, onRecover: () => {} }, React.createElement(GameRoom, { room: rest, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: initial, onRecover: () => {} }, React.createElement(GameRoom, { room: initial, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  assert.equal(renderer.root.findByType("main").props["data-presentation-transition"], "INTERACTION_TRANSITION");
  assert.equal(renderer.root.findByProps({ "data-stage": "DYING" }).props["data-presentation-transition"], "INTERACTION_TRANSITION");

  const privateOnly = { ...initial, presentationSnapshot: { ...initial.presentationSnapshot, localControl: { ...initial.presentationSnapshot.localControl, actorId: "p1", actionRevision: "private-only", entitled: false } } };
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: privateOnly, onRecover: () => {} }, React.createElement(GameRoom, { room: privateOnly, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  assert.equal(renderer.root.findByType("main").props["data-presentation-transition"], "NONE");

  const content = dyingRescueRoom({ actionRevision: "dying-rescue-2" });
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: content, onRecover: () => {} }, React.createElement(GameRoom, { room: content, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  assert.equal(renderer.root.findByType("main").props["data-presentation-transition"], "CONTENT_UPDATE");
  await act(async () => { renderer.unmount(); });
});

test("mounted Dying scene is viewer-equal, preserves child context, and hides rescue privacy from non-actors", async () => {
  const actorRoom = dyingRescueRoom({ continuity: "CHILD_FRAME", parentFrameId: "duel-frame" });
  const observerRoom = dyingRescueRoom({ meId: "p1", actorId: "p3", continuity: "CHILD_FRAME", parentFrameId: "duel-frame" });
  let actor;
  let observer;
  await act(async () => { actor = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room: actorRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: actorRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { observer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room: observerRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: observerRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(actor.root.findByProps({ "data-dying-handoff": "proven" }).props["data-dying-continuity"], "CHILD_FRAME");
  assert.equal(actor.root.findByProps({ "data-dying-handoff": "proven" }).props["data-dying-parent-frame-id"], "duel-frame");
  assert.equal(actor.root.findByProps({ "data-hero-focus-player-id": "p2" }).props["data-hero-focus-role"], "DYING PLAYER");
  assert.equal(observer.root.findByProps({ "data-dying-handoff": "proven" }).props["data-dying-decision-actor-id"], "p3");
  assert.equal(observer.root.findByProps({ "data-hero-focus-player-id": "p2" }).props["data-hero-focus-role"], "DYING PLAYER");
  assert.equal(observer.root.findAllByProps({ "data-hand-card-id": "dying-peach" }).length, 0);
  assert.equal(buttonsContaining(observer, "Peach").length, 0);
  assert.equal(buttonsContaining(observer, "Skip").length, 0);
  assert.deepEqual(seatAnchorIds(actor), seatAnchorIds(observer));
  await act(async () => { actor.unmount(); observer.unmount(); });
});

test("mounted Dying handoff follows the server actor revision and ignores legacy focus fields", async () => {
  const initial = dyingRescueRoom();
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room: initial, onRecover: () => {} }, React.createElement(GameRoom, { room: initial, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { handCardButton(renderer, "dying-peach").props.onClick(); });
  const handedOff = dyingRescueRoom({ actorId: "p1", actionRevision: "dying-rescue-2", meId: "p3" });
  const legacyMutated = { ...handedOff, actionPlayerId: "p3", actionReason: "legacy owner", turnSeat: 2, isMyTurn: true, players: handedOff.players.map((player) => player.id === "p2" ? { ...player, hp: 4 } : player), timeline: [{ id: "legacy-dying", type: "message", player: "legacy", target: "legacy", message: "legacy" }] };
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: legacyMutated, onRecover: () => {} }, React.createElement(GameRoom, { room: legacyMutated, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(renderer.root.findByProps({ "data-dying-handoff": "proven" }).props["data-dying-decision-actor-id"], "p1");
  assert.equal(renderer.root.findByProps({ "data-hero-focus-player-id": "p2" }).props["data-hero-focus-role"], "DYING PLAYER");
  assert.equal(renderer.root.findAllByProps({ "data-hand-card-id": "dying-peach" }).length, 0, "actor handoff removes the stale private card");
  assert.equal(buttonsContaining(renderer, "Peach").length, 0);
  assert.equal(buttonsContaining(renderer, "Skip").length, 0);
  assert.deepEqual(seatAnchorIds(renderer), ["p1", "p2", "p3"]);
  await act(async () => { renderer.unmount(); });
});

test("mounted Judgement replacement keeps subject focus public and replacement controls local", async () => {
  let room = judgementReplacementRoom();
  const actionCalls = [];
  let renderer;
  const action = async (...args) => { actionCalls.push(args); return true; };
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(renderer.root.findByProps({ "data-stage": "JUDGEMENT" }).props["data-continuity"], "ROOT_FRAME");
  assert.equal(renderer.root.findByProps({ "data-hero-focus-player-id": "p1" }).props["data-hero-focus-role"], "Target", "Hero Focus follows the Judgement subject without exposing architectural role text");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("interaction-seat-decision-actor"), true);
  assert.equal(button(renderer, { "aria-label": "Necromancy" }).props.disabled, false);
  assert.equal(buttonsContaining(renderer, "Skip").length, 1);
  assert.equal(buttonsContaining(renderer, "Confirm").length, 0, "replacement selection is not submitted on skill activation");
  await act(async () => { button(renderer, { "aria-label": "Necromancy" }).props.onClick(); });
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, true);
  assert.equal(actionCalls.filter(([actionName]) => actionName === "trigger").length, 0, "activating replacement remains local");
  await act(async () => { handCardButton(renderer, "judgement-replacement").props.onClick(); });
  assert.equal(button(renderer, { children: "Confirm" }).props.disabled, false);
  await act(async () => { button(renderer, { children: "Confirm" }).props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["trigger", { providerId: "sima_yi_guicai", cardIds: ["judgement-replacement"] }]);

  room = judgementReplacementRoom({ actorId: "p1", actionRevision: "judgement-effective-2", triggerEvent: "judgement_effective" });
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: action, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(renderer.root.findByProps({ "data-hero-focus-player-id": "p1" }).props["data-hero-focus-role"], "Target");
  assert.equal(button(renderer, { "aria-label": "Necromancy" }).props.disabled, true, "the old replacement provider is disabled after the authoritative actor changes");
  assert.equal(buttonsContaining(renderer, "Confirm").length, 0);
  assert.equal(buttonsContaining(renderer, "Skip").length, 0);
  await act(async () => { renderer.unmount(); });
});

test("mounted Judgement keeps public focus viewer-equal without leaking replacement identity", async () => {
  const room = judgementReplacementRoom({ meId: "p1", actorId: "p2" });
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room, onRecover: () => {} }, React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(renderer.root.findAllByProps({ "data-hero-focus": "true" }).length, 0, "the viewer's hero is not duplicated centrally when no unique external source is available");
  assert.equal(renderer.root.findAllByProps({ "data-hand-card-id": "judgement-replacement" }).length, 0, "replacement candidates remain private to Sima Yi");
  assert.equal(buttonsContaining(renderer, "Necromancy").length, 0);
  assert.equal(buttonsContaining(renderer, "Confirm").length, 0);
  assert.equal(buttonsContaining(renderer, "Skip").length, 0);
  const rendered = JSON.stringify(renderer.toJSON());
  assert.equal(rendered.includes("judgement-replacement"), false);
  assert.equal(room.timeline.some((event) => event.type === "card" && event.action === "reveal" && event.card.id === "judgement-revealed"), true, "the server-authorized public reveal remains in the viewer projection");
  await act(async () => { renderer.unmount(); });
});

test("mounted Judgement focus and controls ignore legacy owners and require an authorized reveal event", async () => {
  const legacy = { ...judgementReplacementRoom(), actionPlayerId: "p1", actionReason: "legacy owner", turnSeat: 1, isMyTurn: true };
  let renderer;
  await act(async () => { renderer = TestRenderer.create(React.createElement(GameRoomErrorBoundary, { room: legacy, onRecover: () => {} }, React.createElement(GameRoom, { room: legacy, busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(button(renderer, { "aria-label": "Necromancy" }).props.disabled, false);
  assert.equal(renderer.root.findByProps({ "data-hero-focus-player-id": "p1" }).props["data-hero-focus-role"], "Target");
  await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: judgementReplacementRoom({ includeReveal: false }), onRecover: () => {} }, React.createElement(GameRoom, { room: judgementReplacementRoom({ includeReveal: false }), busy: false, error: "", onAction: async () => true, onLeave: () => {} }))); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(renderer.root.findAllByProps({ "data-stage": "JUDGEMENT" }).length, 1, "semantic stage may remain public from the proven snapshot");
  assert.equal(JSON.stringify(renderer.toJSON()).includes("Dodge"), false, "no revealed card is rendered without the server reveal event");
  await act(async () => { renderer.unmount(); });
});
