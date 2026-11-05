import assert from "node:assert/strict";
import test from "node:test";
import { derivePrivateResponseGuidance } from "../game/private-response-guidance.ts";

function currentAction({ actorId = "p1", legalActions, options = [], requirement = "dodge", reason = "Respond to group effect" }) {
  return { version: 3, kind: "response", actorId, deadline: 0, reason, legalActions, requirement, options };
}

function publicScene({ cardKind = "RainingArrows", currentParticipantId = "p1", stage = "GROUP_RESOLUTION", interactionId = "group-1", groupInteractionId = interactionId, status = "CURRENT", hasInteraction = true } = {}) {
  return {
    hasInteraction,
    interactionId,
    stage,
    currentParticipantId,
    groupResolution: {
      cardKind,
      resolutionSemantics: "GROUP",
      interactionId: groupInteractionId,
      currentParticipantId,
      participants: [{ playerId: currentParticipantId, order: 1, status }],
    },
  };
}

const actorId = "p1";
const guidance = (action, scene = publicScene(), viewerIsDecisionActor = true) => derivePrivateResponseGuidance({
  currentAction: action,
  viewerId: actorId,
  viewerIsDecisionActor,
  publicScene: scene,
});

test("physical Dodge keeps the accepted Raining Arrows guidance", () => {
  assert.equal(guidance(currentAction({
    legalActions: ["respond", "decline_response"],
    options: [{ providerId: "card", label: "Play Dodge", satisfies: "dodge", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["private-dodge-id"] } }],
  })), "Play Dodge to avoid Raining Arrows, or choose TAKE DAMAGE.");
  assert.equal(guidance(currentAction({
    legalActions: ["respond"],
    options: [{ providerId: "card", label: "Play Dodge", satisfies: "dodge", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["private-dodge-id"] } }],
  })), "Play Dodge to respond to Raining Arrows.");
});

test("physical Attack explains the active Barbarian Invasion response and legal decline", () => {
  assert.equal(guidance(currentAction({
    legalActions: ["respond", "decline_response"],
    requirement: "attack",
    options: [{ providerId: "card", label: "Play Attack", satisfies: "attack", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["private-attack-id"] } }],
  }), publicScene({ cardKind: "BarbarianInvasion" })), "Play Attack against Barbarian Invasion, or choose TAKE DAMAGE.");
});

test("decline-only Attack and Dodge explain the missing response without inventing availability", () => {
  assert.equal(guidance(currentAction({ legalActions: ["decline_response"], requirement: "attack" }), publicScene({ cardKind: "BarbarianInvasion" })), "No Attack response available. Choose TAKE DAMAGE to continue.");
  assert.equal(guidance(currentAction({ legalActions: ["decline_response"] })), "No Dodge response available. Choose TAKE DAMAGE to continue.");
});

test("provider copy comes from authoritative CurrentAction options", () => {
  assert.equal(guidance(currentAction({
    legalActions: ["respond"],
    options: [{ providerId: "eight_trigrams_dodge", label: "Use Eight Trigrams", satisfies: "dodge", activation: "explicit", selection: null }],
  })), "Raining Arrows response available: Use Eight Trigrams.");
});

test("provider and decline are described only when both are server-legal", () => {
  assert.equal(guidance(currentAction({
    legalActions: ["respond", "decline_response"],
    requirement: "attack",
    options: [{ providerId: "cao_cao_hujia", label: "Ask for Attack", satisfies: "attack", activation: "explicit", selection: null }],
  }), publicScene({ cardKind: "BarbarianInvasion" })), "Barbarian Invasion response available: Ask for Attack. You can also choose TAKE DAMAGE.");
});

test("a response option cannot override missing legal respond action or empty eligible cards", () => {
  assert.equal(guidance(currentAction({
    legalActions: ["decline_response"],
    options: [{ providerId: "card", label: "Play Dodge", satisfies: "dodge", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["stale-private-id"] } }],
  })), "No Dodge response available. Choose TAKE DAMAGE to continue.");
  assert.equal(guidance(currentAction({
    legalActions: ["respond", "decline_response"],
    options: [{ providerId: "empty", label: "Use skill", satisfies: "dodge", activation: "explicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [] } }],
  })), "No Dodge response available. Choose TAKE DAMAGE to continue.");
});

test("private response guidance fails closed for observers, stale group scenes, and mismatched actors", () => {
  const action = currentAction({ legalActions: ["respond", "decline_response"] });
  assert.equal(guidance(action, publicScene(), false), null);
  assert.equal(guidance(action, publicScene({ stage: "REST" })), null);
  assert.equal(guidance(action, publicScene({ hasInteraction: false })), null);
  assert.equal(guidance(action, publicScene({ interactionId: "new-group", groupInteractionId: "old-group" })), null);
  assert.equal(guidance(action, publicScene({ currentParticipantId: "p2" })), null);
  assert.equal(guidance(currentAction({ actorId: "p2", legalActions: ["respond", "decline_response"] })), null);
  assert.equal(guidance(currentAction({ legalActions: ["respond"], requirement: "negate" })), null);
});

test("paused participant response retains the same active causal group guidance", () => {
  assert.equal(guidance(currentAction({ legalActions: ["respond"], requirement: "attack", options: [{ providerId: "card", label: "Play Attack", satisfies: "attack", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["attack-id"] } }] }), publicScene({ cardKind: "BarbarianInvasion", status: "PAUSED" })), "Play Attack against Barbarian Invasion.");
});
