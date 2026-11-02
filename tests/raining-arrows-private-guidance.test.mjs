import assert from "node:assert/strict";
import test from "node:test";
import { rainingArrowsPrivateGuidance } from "../game/raining-arrows-private-guidance.ts";

function currentAction({ legalActions, options = [], kind = "response", requirement = "dodge", reason = "Respond to Raining Arrows" }) {
  return { version: 3, kind, actorId: "p1", deadline: 0, reason, legalActions, requirement, options };
}

const actorContext = { viewerIsDecisionActor: true, provenCurrentRainingArrowsParticipant: true };

test("ordinary server-projected Dodge and decline get the exact private Raining Arrows guidance", () => {
  const instruction = rainingArrowsPrivateGuidance({
    ...actorContext,
    currentAction: currentAction({
      legalActions: ["respond", "decline_response"],
      options: [{ providerId: "card", label: "Play Dodge", satisfies: "dodge", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["private-dodge-id"] } }],
    }),
  });
  assert.equal(instruction, "Play Dodge to avoid Raining Arrows, or choose TAKE DAMAGE.");
});

test("decline-only response says no Dodge is available", () => {
  assert.equal(rainingArrowsPrivateGuidance({
    ...actorContext,
    currentAction: currentAction({ legalActions: ["decline_response"] }),
  }), "No Dodge response available. Choose TAKE DAMAGE to continue.");
});

test("skill/provider response is identified by its authoritative CurrentAction label", () => {
  assert.equal(rainingArrowsPrivateGuidance({
    ...actorContext,
    currentAction: currentAction({
      legalActions: ["respond"],
      options: [{ providerId: "eight_trigrams_dodge", label: "Use Eight Trigrams", satisfies: "dodge", activation: "explicit", selection: null }],
    }),
  }), "Raining Arrows response available: Use Eight Trigrams.");
});

test("a legal skill/provider and decline are both identified without promising the skill outcome", () => {
  assert.equal(rainingArrowsPrivateGuidance({
    ...actorContext,
    currentAction: currentAction({
      legalActions: ["respond", "decline_response"],
      options: [{ providerId: "eight_trigrams_dodge", label: "Use Eight Trigrams", satisfies: "dodge", activation: "explicit", selection: null }],
    }),
  }), "Raining Arrows response available: Use Eight Trigrams. You can also choose TAKE DAMAGE.");
});

test("response options do not imply a legal Dodge without the server respond action", () => {
  assert.equal(rainingArrowsPrivateGuidance({
    ...actorContext,
    currentAction: currentAction({
      legalActions: ["decline_response"],
      options: [{ providerId: "card", label: "Play Dodge", satisfies: "dodge", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["stale-private-card"] } }],
    }),
  }), "No Dodge response available. Choose TAKE DAMAGE to continue.");
});

test("private guidance fails closed for other viewers, stale stages, wrong requirement, and invalid providers", () => {
  const valid = currentAction({
    legalActions: ["respond", "decline_response"],
    options: [{ providerId: "empty-provider", label: "Use skill", satisfies: "dodge", activation: "explicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [] } }],
  });
  assert.equal(rainingArrowsPrivateGuidance({ ...actorContext, viewerIsDecisionActor: false, currentAction: valid }), null);
  assert.equal(rainingArrowsPrivateGuidance({ ...actorContext, provenCurrentRainingArrowsParticipant: false, currentAction: currentAction({ legalActions: ["respond"], reason: "Respond to Raining Arrows" }) }), "Respond to Raining Arrows");
  assert.equal(rainingArrowsPrivateGuidance({ ...actorContext, currentAction: currentAction({ legalActions: ["respond"], kind: "none" }) }), null);
  assert.equal(rainingArrowsPrivateGuidance({ ...actorContext, currentAction: currentAction({ legalActions: ["respond"], requirement: "attack" }) }), null);
  assert.equal(rainingArrowsPrivateGuidance({ ...actorContext, currentAction: valid }), "No Dodge response available. Choose TAKE DAMAGE to continue.");
});
