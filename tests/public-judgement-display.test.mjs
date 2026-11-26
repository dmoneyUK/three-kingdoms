import assert from "node:assert/strict";
import test from "node:test";
import {
  publicActionAnnouncementOverride,
  publicInteractionNarrationBelongsToAction,
  publicInteractionNarrationWithJudgement,
  publicJudgementNarrationBelongsToAction,
  publicJudgementNarrationForPresentation,
  publicJudgementPresentationAtCursor,
  publicJudgementReplacementFrameMatches,
} from "../game/public-judgement-presentation.ts";

const original = {
  semantics: "PROVEN", visibility: "PUBLIC", judgementId: "judgement-1", eventId: "judgement-1", order: 10,
  phase: "ORIGINAL", status: "PROVISIONAL", targetId: "target-1", judgingPlayerId: "target-1",
  purpose: "eight_trigrams", continuationKind: "response", resolutionId: "resolution-1",
  causal: { interactionId: "interaction-1", frameId: "judgement-frame-1", parentFrameId: "attack-frame-1" },
  originalCard: { id: "original-card", kind: "Dodge", rank: "7", suit: "♣" },
  effectiveCard: { id: "original-card", kind: "Dodge", rank: "7", suit: "♣" },
  judgementStatus: "unsatisfied", copy: { message: "TARGET used Eight Trigrams Formation. Judgement: 7♣.", segments: [] },
};
const replacement = {
  ...original,
  eventId: "replacement-event", order: 11, phase: "REPLACEMENT", status: "FINAL",
  effectiveCard: { id: "replacement-card", kind: "Peach", rank: "7", suit: "♥" },
  judgementStatus: "satisfied",
  replacement: {
    eventId: "replacement-event", actorId: "sima-yi", materialOwnerId: "sima-yi",
    physicalCardId: "replacement-card", fromZone: "HAND", toZone: "JUDGEMENT", effectId: "sima_yi_guicai",
  },
  copy: { message: "TARGET used Eight Trigrams Formation. Judgement: 7♣.\nSIMA YI used Necromancy to replace the Judgement card with 7♥. Match.", segments: [] },
};

test("Judgement H4 follows the public event cursor and never jumps to a same-poll replacement", () => {
  assert.equal(publicJudgementPresentationAtCursor([original, replacement], { eventId: "judgement-1", order: 10 }), original);
  assert.equal(publicJudgementPresentationAtCursor([original, replacement], { eventId: "replacement-event", order: 11 }), replacement);
  assert.equal(publicJudgementPresentationAtCursor([original, replacement], { eventId: "next-message", order: 12 }), replacement);
  assert.equal(publicJudgementPresentationAtCursor([original, replacement], { eventId: "before-judgement", order: 9 }), null);
  assert.equal(publicJudgementPresentationAtCursor([original, replacement, replacement], { eventId: "replacement-event", order: 11 }), null);
});

test("canonical Judgement H4 preserves exact copy, public event identity and only proven causal IDs", () => {
  const narration = publicJudgementNarrationForPresentation(replacement);
  assert.equal(narration.eventId, "replacement-event");
  assert.equal(narration.rootEventId, "judgement-1");
  assert.equal(narration.interactionId, "interaction-1");
  assert.equal(narration.rootFrameId, "judgement-frame-1");
  assert.equal(narration.headline, replacement.copy.message);
  assert.equal(narration.accessibleLabel, replacement.copy.message);
  assert.equal(narration.phase, "FINAL");
  const noCausal = publicJudgementNarrationForPresentation({ ...original, causal: undefined });
  assert.equal(noCausal.interactionId, undefined);
  assert.equal(noCausal.rootFrameId, undefined);
});

test("only the exact committed replacement Effect Frame can own the replacement H4", () => {
  const proof = {
    presentation: replacement,
    actionEventId: "replacement-event",
    actionCardId: "replacement-card",
    actionActorId: "sima-yi",
    actionTargetId: "target-1",
    actionInteractionId: "interaction-1",
    actionRootFrameId: "judgement-frame-1",
    frameEventId: "replacement-event",
    frameRootEventId: "judgement-1",
    frameResolutionId: "resolution-1",
    frameEffectId: "sima_yi_guicai",
    frameEffectClass: "JUDGEMENT",
    frameActivationOwnerId: "sima-yi",
    frameMaterialCardIds: ["replacement-card"],
  };
  assert.equal(publicJudgementReplacementFrameMatches(proof), true);
  for (const change of [
    { actionEventId: "another-event" },
    { actionCardId: "another-card" },
    { actionActorId: "another-player" },
    { actionTargetId: "another-player" },
    { actionInteractionId: "another-interaction" },
    { actionRootFrameId: "another-frame" },
    { frameRootEventId: "another-judgement" },
    { frameResolutionId: "another-resolution" },
    { frameEffectClass: "COST" },
    { frameMaterialCardIds: ["replacement-card", "extra-card"] },
  ]) assert.equal(publicJudgementReplacementFrameMatches({ ...proof, ...change }), false);
});

test("replacement narration follows the newest public stage and only its exact Effect Frame", () => {
  const narration = publicJudgementNarrationForPresentation(replacement);
  const laterStage = { ...narration, eventId: "later-public-stage", publicSequence: 12 };
  assert.equal(publicInteractionNarrationWithJudgement(laterStage, narration), laterStage);
  assert.equal(publicInteractionNarrationWithJudgement(laterStage, narration, true), narration,
    "a same-resolution terminal Judgement fact cannot replace the canonical original/replacement H4");
  assert.equal(publicInteractionNarrationWithJudgement(narration, null), narration);

  const action = {
    rootEventId: "replacement-event",
    cardFace: { id: "replacement-card" },
    sourceId: "sima-yi",
    targetId: "target-1",
    interactionId: "interaction-1",
    rootFrameId: "judgement-frame-1",
    publicCardEffectFrame: {
      eventId: "replacement-event", rootEventId: "judgement-1", rootResolutionId: "resolution-1",
      effectId: "sima_yi_guicai", effectClass: "JUDGEMENT", activationOwnerId: "sima-yi",
      materials: [{ card: { id: "replacement-card" } }],
    },
  };
  assert.equal(publicJudgementNarrationBelongsToAction({
    presentation: replacement, narration, action,
  }), true);
  assert.equal(publicInteractionNarrationBelongsToAction({
    judgementNarrationBelongsToAction: true, narration, action,
    activeJudgementRevealRoute: false, currentInteractionEffectKind: "judgement",
  }), true);
  assert.equal(publicInteractionNarrationBelongsToAction({
    judgementNarrationBelongsToAction: false, narration, action: { ...action, interactionId: "wrong-interaction" },
    activeJudgementRevealRoute: false,
  }), false);
  assert.equal(publicJudgementNarrationBelongsToAction({
    presentation: replacement, narration,
    action: { ...action, cardFace: { id: "different-card" } },
  }), false);

  assert.deepEqual(publicActionAnnouncementOverride({
    action, judgementNarrationBelongsToAction: false,
    interactionNarrationBelongsToAction: false, narration, effectFrameOwnsInteractionRoot: false,
  }), { suppressAnnouncement: true });
  assert.deepEqual(publicActionAnnouncementOverride({
    action, judgementNarrationBelongsToAction: true,
    interactionNarrationBelongsToAction: true, narration, effectFrameOwnsInteractionRoot: true,
  }), { publicInteractionNarration: narration, suppressAnnouncement: false });
});
