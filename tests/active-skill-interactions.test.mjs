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
  ];
  return normalizeRoomData({
    code: `INTERACTION-${skill.effectId}`, status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [], players,
    myHand: skill.cardIds.map((id, index) => card(id, index % 2 ? "Dodge" : "Attack", index % 2 ? "♣" : "♠")), turnSeat: 0, phase: "play", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play cards or use a hero skill", isMyAction: true,
    currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play cards or use a hero skill", legalActions: ["trigger"], triggerOptions: [{ effectId: skill.effectId, label: skill.label, selection: { type: "cards", min: skill.min, max: skill.max, eligibleCardIds: skill.cardIds, targetIds: skill.targetIds, targetMin: skill.targetMin, targetMax: skill.targetMax } }] },
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
