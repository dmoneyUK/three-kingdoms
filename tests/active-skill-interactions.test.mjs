import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { GameRoom, GameRoomErrorBoundary } from "../app/page.tsx";
import { normalizeRoomData } from "../game/room-safety.js";

const card = (id, kind = "Attack", suit = "♠") => ({ id, kind, suit, rank: "A" });

function installRenderEnvironment() {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = { addEventListener: () => {}, removeEventListener: () => {}, setInterval, clearInterval };
  globalThis.document = { visibilityState: "visible", addEventListener: () => {}, removeEventListener: () => {} };
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => "" });
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.localStorage = { removeItem: () => {} };
}

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

function triggerRoom({ meId = "p1", triggerOptions = [{ effectId: "huang_yueying_cultivation", label: "Cultivation", description: "Draw 1 card after using a Stratagem.", selection: null }], pendingNegation = null, currentAction = {} } = {}) {
  const players = [
    { id: "p1", name: "HUANG YUEYING", seat: 0, hero: "huang-yueying", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
    { id: "p2", name: "TARGET", seat: 1, hero: "liu-bei", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
  ];
  return normalizeRoomData({
    code: "CULTIVATION-UI", status: "playing", maxPlayers: 2, isHost: meId === "p1", isTestController: false, meId, myRole: meId === "p1" ? "Lord" : "Rebel", myHeroOptions: [], players,
    myHand: meId === "p1" ? [card("cultivation-card", "Dismantle")] : [card("target-card", "Peach")], turnSeat: 0, deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Cultivation follows the Stratagem use", isMyAction: meId === "p1",
    actionRevision: "cultivation-ui-revision", phase: "response", pendingNegation, currentAction: {
      version: 3, kind: "trigger", actorId: "p1", deadline: 0, reason: "Choose a trigger", legalActions: ["trigger", "decline_trigger"], triggerEvent: "stratagem_used", triggerOptions, ...currentAction,
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
function handCardButton(renderer, cardId) { return nodeWith(renderer, "data-hand-card-id", cardId).findAllByType("button")[0]; }
function targetButton(renderer, playerId) { return nodeWith(renderer, "data-player-anchor", playerId).findAllByType("button")[0]; }
function text(renderer, value) { return renderer.root.findAll((node) => typeof node.props?.children === "string" && node.props.children === value); }
function recoveryRendered(renderer) { return text(renderer, "GAME SCREEN ERROR").length > 0 || text(renderer, "Previous game data is no longer compatible.").length > 0; }

installRenderEnvironment();

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
    const useButton = () => button(renderer, { children: `Use ${skill.label}` });

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
  const useButton = () => button(renderer, { children: "Use Assault" });

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
  await act(async () => { button(renderer, { "aria-label": "Select TARGET TWO" }).props.onClick(); });
  assert.equal(nodeWith(renderer, "data-player-anchor", "p3").props.className.includes("selected-target"), true);
  assert.equal(button(renderer, { "aria-label": "Select INVALID TARGET" }).props.disabled, true);
  await act(async () => { useButton().props.onClick(); });
  assert.deepEqual(actionCalls.at(-1), ["trigger", { providerId: "zhang_liao_assault", targetIds: ["p2", "p3"] }]);

  await act(async () => { skillButton().props.onClick(); });
  assert.equal(button(renderer, { "aria-label": "Inspect TARGET ONE" }).props.disabled, false, "cancel exits target mode");
  await act(async () => { skillButton().props.onClick(); });
  assert.equal(useButton().props.disabled, true, "re-entering Assault resets target selection");
  assert.equal(nodeWith(renderer, "data-player-anchor", "p2").props.className.includes("selected-target"), false);
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
    assert.equal(opponentRenderer.root.findAll((node) => typeof node.props?.children === "string" && node.props.children.includes("Waiting for HUANG YUEYING to decide")).length, 1, "opponent waits for the trigger actor");
    assert.equal(opponentRenderer.root.findAll((node) => typeof node.props?.children === "string" && node.props.children.includes("Waiting for the target to answer the attacker")).length, 0, "the Attack fallback prompt is absent");
    assert.equal(opponentRenderer.root.findAll((node) => typeof node.props?.children === "string" && node.props.children.includes("Use Cultivation")).length, 0, "Cultivation remains private");
    assert.equal(opponentRoom.actionPlayerId, "p1");
    assert.equal(opponentRoom.currentAction.actorId, "p1");

    const continuationRoom = normalizeRoomData({ ...room, isMyAction: false, actionPlayerId: "p2", currentAction: { version: 3, kind: "response", actorId: "p2", deadline: 0, reason: "Negation window", requirement: "negate", legalActions: ["respond", "decline_response"], options: [], triggerOptions: [] }, pendingNegation: { kind: "negation", actorId: "p2", responseTarget: "Stratagem's effect on TARGET", cardName: "Stratagem" }, phase: "response" });
    await act(async () => { renderer.update(React.createElement(GameRoomErrorBoundary, { room: continuationRoom, onRecover: () => {} }, React.createElement(GameRoom, { room: continuationRoom, busy: false, error: "", onAction, onLeave: () => {} }))); });
    assert.ok(renderer.root.findAll((node) => typeof node.props?.children === "string" && node.props.children.includes("Waiting for Negation")).length >= 1, "the original continuation remains visible after Cultivation");
    await act(async () => { renderer.unmount(); skipRenderer.unmount(); opponentRenderer.unmount(); });
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
