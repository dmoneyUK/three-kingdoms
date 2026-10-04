import React from "react";
import { createRoot } from "react-dom/client";
import { GameRoom } from "../../app/page.tsx";
import { normalizeRoomData } from "../../game/room-safety.js";
import "../../app/globals.css";
import "../../app/sequence-overrides.css";

const HERO_IDS = [
  "cao-cao", "liu-bei", "sun-quan", "simayi", "xiahou-dun",
  "zhang-liao", "zhang-fei", "zhen-ji", "xu-chu", "guo-jia",
];

const card = (id, kind, suit = "♠", rank = "A") => ({ id, kind, suit, rank });

function semanticSnapshot({ state, playerIds, stage, sourceId, targetIds, decisionActorId, currentParticipantId = decisionActorId, activeResolverId = decisionActorId, viewerId = decisionActorId }) {
  const interactionId = `browser-${state}-interaction`;
  const rootFrameId = `browser-${state}-root`;
  const activeFrameId = `browser-${state}-active`;
  const checkpointId = `browser-${state}-checkpoint`;
  const participantIds = [...new Set([sourceId, ...targetIds, currentParticipantId, decisionActorId, activeResolverId].filter(Boolean))];
  const scene = {
    semantics: "PROVEN",
    interactionId,
    rootFrameId,
    activeFrameId,
    parentFrameId: null,
    checkpointId,
    presentationRevision: 1,
    stage,
    sourceId,
    effect: stage === "NEGATION" ? "Dismantle" : stage === "DUEL_EXCHANGE" ? "Duel" : stage === "DYING" ? "Attack" : stage === "GROUP_RESOLUTION" ? "Raining Arrows" : "Attack",
    targetIds,
    currentParticipantId,
    decisionActorId,
    activeResolverId,
    activeSourceId: sourceId,
    activeTargetIds: targetIds,
    participantIds,
    participantRoles: {
      sourceId,
      originalTargetIds: targetIds,
      activeTargetIds: targetIds,
      currentParticipantId,
      decisionActorId,
      activeResolverId,
      parentParticipantId: null,
      participantIds,
    },
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
  };
  return {
    identity: { interactionId, checkpointId, presentationRevision: 1 },
    stable: { kind: "CHOICE", interactionId, checkpointId, presentationRevision: 1, decisionActorId },
    interaction: scene,
    decision: { actorId: decisionActorId, stage },
    localControl: { source: "CurrentAction", actionRevision: `browser-${state}-action`, kind: state === "dying" ? "dying" : state === "confirm-cancel" ? "borrowed_sword" : state === "picker" || state === "confirm-cancel-skip" || state === "long-guidance" || state === "sun-shangxiang-daredevil" ? "trigger" : state === "duel" || state === "negation" || state === "confirm-skip" || state === "provider-extra" || state === "group-observer" ? "response" : "turn", actorId: decisionActorId, entitled: viewerId === decisionActorId },
    settlement: null,
    transitionEvents: [],
  };
}

function currentActionFor(state, actorId, handCardId) {
  if (state === "sun-shangxiang-daredevil") return {
    version: 3, kind: "trigger", actorId, deadline: 0, reason: "Draw two cards after losing equipment, or skip", legalActions: ["trigger", "decline_trigger"], declineAction: "decline_trigger",
    triggerOptions: [{ effectId: "sun_shangxiang_daredevil", label: "Daredevil", allowDecline: true }],
  };
  if (state === "sun-shangxiang-inactive") return currentActionFor("normal", actorId, handCardId);
  if (state === "confirm-cancel") return { version: 3, kind: "borrowed_sword", actorId, deadline: 0, reason: "Choose a target for the forced Attack", legalActions: ["choose_borrowed_sword_target"] };
  if (state === "confirm-cancel-skip" || state === "long-guidance") return {
    version: 3, kind: "trigger", actorId, deadline: 0, reason: "Choose one living opponent for Assault", legalActions: ["trigger", "decline_trigger"], declineAction: "decline_trigger",
    triggerOptions: [{ effectId: "zhang_liao_assault", label: "Assault", description: state === "long-guidance" ? "Choose one living opponent within the projected legal target set, review the selected target and any selected cost cards, then confirm the Assault effect; cancel the local selection to choose a different opponent before submitting." : "Choose one living opponent", selection: { type: "target", targetIds: ["p2", "p3"], min: 1, max: 1 } }],
  };
  if (state === "provider-extra") return { version: 3, kind: "response", actorId, deadline: 0, reason: "Choose an Attack response provider", legalActions: ["respond", "decline_response"], requirement: "attack", options: [{ providerId: "browser_explicit_attack", label: "Alternate Attack", satisfies: "attack", activation: "explicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [handCardId] } }] };
  if (state === "group-observer") {
    return {
      version: 3,
      kind: "response",
      actorId,
      deadline: 0,
      reason: "Waiting for the current Raining Arrows participant",
      legalActions: [],
    };
  }
  if (state === "normal" || state === "interaction" || state === "group" || state === "turn-play-end") {
    return {
      version: 3,
      kind: "turn",
      actorId,
      deadline: 0,
      reason: "Play cards",
      legalActions: ["play_card", "end_turn"],
      canDeclareAttack: true,
    };
  }
  if (state === "duel") {
    return {
      version: 3,
      kind: "response",
      actorId,
      deadline: 0,
      reason: "Respond to Duel",
      legalActions: ["respond", "decline_response"],
      requirement: "attack",
      options: [{ providerId: "attack_card", label: "Attack", satisfies: "attack", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [handCardId] } }],
    };
  }
  if (state === "negation" || state === "confirm-skip") {
    return {
      version: 3,
      kind: "response",
      actorId,
      deadline: 0,
      reason: "Play Negation to cancel Dismantle, or pass",
      legalActions: ["respond", "decline_response"],
      requirement: "negate",
      options: [{ providerId: "negation_card", label: "Negation", satisfies: "negate", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [handCardId] } }],
    };
  }
  if (state === "picker") {
    return {
      version: 3,
      kind: "trigger",
      actorId,
      deadline: 0,
      reason: "Choose a target card",
      legalActions: ["trigger", "decline_trigger"],
      triggerOptions: [{ effectId: "browser-target-card", label: "Retaliation", selection: { type: "target_cards", targetId: "p1", min: 1, max: 1, eligibleKeys: ["hand:0", "hand:1"] } }],
      declineAction: "decline_trigger",
    };
  }
  return {
    version: 3,
    kind: "dying",
    actorId,
    deadline: 0,
    reason: "Decide whether to give Peach",
    legalActions: ["give_peach", "skip_rescue"],
    requirement: "peach",
    options: [{ providerId: "peach_card", label: "Peach", satisfies: "peach", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [handCardId] } }],
  };
}

function browserRoom({ state, count }) {
  const playerIds = Array.from({ length: count }, (_, index) => `p${index + 1}`);
  const meId = state === "group-observer" ? "p3" : state === "duel" || state === "negation" || state === "confirm-skip" || state === "picker" ? "p2" : state === "dying" ? "p3" : "p1";
  const actorId = state === "group-observer" ? "p1" : state === "dying" ? "p3" : meId;
  const hand = state === "group-observer"
    ? []
    : state === "duel"
    ? [card("browser-attack", "Attack", "♠")]
    : state === "negation" || state === "confirm-skip"
      ? [card("browser-negation", "Negation", "♣")]
      : state === "dying"
        ? [card("browser-peach", "Peach", "♥")]
        : state === "group"
          ? [card("browser-raining-arrows", "RainingArrows", "♥")]
          : [card("browser-attack", "Attack", "♠"), card("browser-peach", "Peach", "♥")];
  const targets = state === "group-observer" ? ["p1", "p2", "p3"] : state === "dying" ? ["p2"] : state === "group" ? playerIds.filter((id) => id !== "p1") : [state === "duel" || state === "negation" || state === "confirm-skip" ? "p1" : "p2"];
  const stage = state === "duel" ? "DUEL_EXCHANGE" : state === "negation" || state === "confirm-skip" ? "NEGATION" : state === "dying" ? "DYING" : state === "group" || state === "group-observer" ? "GROUP_RESOLUTION" : "ATTACK_RESPONSE";
  const currentAction = state === "rest" ? null : currentActionFor(state, actorId, hand[0]?.id ?? "");
  const presentationSnapshot = state === "rest" ? null : semanticSnapshot({ state, playerIds, stage, sourceId: state === "group-observer" ? "p4" : "p1", targetIds: targets, currentParticipantId: state === "group-observer" ? "p1" : state === "dying" ? "p2" : actorId, decisionActorId: actorId, activeResolverId: actorId, viewerId: meId });
  const players = playerIds.map((id, index) => ({
    id,
    name: `Player ${index + 1}`,
    seat: index,
    hero: index === 0 && state.startsWith("sun-shangxiang-") ? "sun-shangxiang" : index === 0 && (state === "confirm-cancel-skip" || state === "long-guidance") ? "zhang-liao" : HERO_IDS[index],
    generalReady: true,
    ready: true,
    hp: 4,
    maxHp: 4,
    alive: true,
    connected: true,
    handCount: id === meId ? hand.length : 2,
    judgementCards: state === "rest" && id === "p3" ? [card("browser-lightning", "Lightning", "♥", "Q")] : [],
    equipmentCards: state === "rest" && id === "p2" ? [card("browser-zhuge-crossbow", "ZhugeCrossbow", "♦", "A")] : [],
    attackRange: 1,
    distance: id === meId ? null : 1,
    isHost: index === 0,
    role: index === 0 ? "Lord" : "Rebel",
  }));
  const pendingDying = state === "dying" ? { kind: "dying", sourceId: "p1", targetId: "p2", origin: "Attack", recoveryNeeded: 1, deadline: Date.now() + 60_000 } : null;
  return normalizeRoomData({
    code: `UI19${String(count).padStart(2, "0")}`,
    status: "playing",
    maxPlayers: count,
    isHost: true,
    isTestController: true,
    meId,
    myRole: "Lord",
    myHeroOptions: [],
    players,
    myHand: hand,
    turnSeat: state === "group-observer" ? 3 : state === "dying" ? 1 : 0,
    phase: state === "dying" ? "dying" : state === "rest" || state === "group" || state === "normal" || state === "interaction" || state === "turn-play-end" || state === "sun-shangxiang-inactive" ? "play" : "response",
    deckCount: 20,
    discardTop: null,
    log: [],
    timeline: [],
    isMyTurn: state === "normal" || state === "interaction" || state === "group" || state === "turn-play-end" || state === "sun-shangxiang-inactive",
    actionPlayerId: currentAction?.actorId ?? null,
    actionReason: currentAction?.reason ?? "Waiting for the next legal action",
    isMyAction: Boolean(currentAction?.actorId === meId),
    actionRevision: `browser-${state}-action`,
    presentationSnapshot,
    currentAction,
    pending: currentAction ? { kind: currentAction.kind } : null,
    pendingAttack: null,
    pendingGreenDragon: null,
    pendingRockCleaving: null,
    pendingFrostSword: null,
    pendingDuel: state === "duel" ? { kind: "duel", sourceId: "p1", targetId: "p2", actorId: "p2", opponentId: "p1", deadline: 0 } : null,
    pendingGroup: state === "group-observer" ? { kind: "group", cardKind: "RainingArrows", sourceId: "p4", requiredKind: "Dodge" } : state === "group" ? { kind: "group", cardKind: "RainingArrows", sourceId: "p1", requiredKind: "Dodge" } : null,
    pendingNegation: state === "negation" || state === "confirm-skip" ? { kind: "negation", sourceId: "p1", actorId: "p2", effectTargetId: "p1", cardName: "Dismantle", negated: false, deadline: 0 } : null,
    pendingHarvest: null,
    pendingTargetCard: null,
    pendingBorrowedSword: state === "confirm-cancel" ? { kind: "borrowed_sword", sourceId: "p1", targetId: "p2", actorId: "p1", holderId: "p2", stage: "choose_target", weaponId: "browser-weapon", eligibleTargetIds: ["p3"] } : null,
    pendingDying,
  });
}

function readFixture() {
  const params = new URLSearchParams(window.location.search);
  const state = params.get("state") || "normal";
  const count = Math.min(10, Math.max(2, Number(params.get("count") || 4)));
  return { state, count };
}

const { state, count } = readFixture();
const root = createRoot(document.getElementById("root"));
window.__browserActions = [];
root.render(<GameRoom room={browserRoom({ state, count })} busy={false} error="" onAction={async (action, extra) => { window.__browserActions.push({ action, extra }); return true; }} onLeave={() => {}} />);
