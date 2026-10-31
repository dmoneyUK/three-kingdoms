import test from "node:test";
import { viewerNegationAcknowledgement, triggerDecisionInstruction } from "../../game/console-decision.ts";
import assert from "node:assert/strict";
import { derivePublicActivityStatus, derivePublicInteractionNarration, derivePublicNegationNarration } from "../../game/public-activity.ts";

const players = [
  { id: "p1", name: "Test Player 1", seat: 0, alive: true },
  { id: "p2", name: "Test Player 2", seat: 1, alive: true },
  { id: "p3", name: "Test Player 3", seat: 2, alive: true },
  { id: "p4", name: "Test Player 4", seat: 3, alive: true },
];

function snapshot({ stage, actorId = null, stableKind = actorId ? "CHOICE" : "SPECIAL", effect = null, duelExchange = null, lustDuelExchange = null, semantics = "PROVEN", nextEffect, publicEventFacts = [], viewerNegationChoice = null, actionLabels } = {}) {
  return {
    identity: { interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 1 },
    stable: { kind: stableKind, interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 1, decisionActorId: actorId },
    interaction: { semantics, interactionId: "interaction-1", rootFrameId: "root-1", activeFrameId: "root-1", parentFrameId: null, checkpointId: "checkpoint-1", presentationRevision: 1, stage, sourceId: "p1", effect, targetIds: ["p2"], currentParticipantId: actorId, decisionActorId: actorId, activeResolverId: null, activeSourceId: "p1", activeTargetIds: ["p2"], participantIds: ["p1", "p2"], participantRoles: { sourceId: "p1", originalTargetIds: ["p2"], activeTargetIds: ["p2"], currentParticipantId: actorId, decisionActorId: actorId, activeResolverId: null, parentParticipantId: null, participantIds: ["p1", "p2"] }, continuity: { relation: "ROOT_FRAME", parentFrameId: null } },
    publicNextDecision: {
      semantics: "PROVEN",
      visibility: "PUBLIC",
      identity: { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 },
      decisionId: "decision-1",
      stage,
      stageLabel: stage === "NEGATION" ? "Negation" : "Duel Exchange",
      actorIds: stableKind === "CHOICE" && actorId ? [actorId] : [],
      actionLabels: actionLabels ?? (stage === "NEGATION" ? ["Negation"] : []),
      ...(stage === "NEGATION" ? { nextEffect: nextEffect ?? { kind: "cancel_effect", label: effect ?? "the current effect" } } : {}),
      responseWindowOpen: true,
    },
    publicEventFacts,
    viewerNegationChoice,
    duelExchange,
    lustDuelExchange,
  };
}

function room(overrides = {}) {
  return { status: "playing", phase: "play", turnSeat: 0, players, presentationSnapshot: null, ...overrides };
}

test("public activity uses the public turn seat and fails closed for an absent seat", () => {
  assert.deepEqual(derivePublicActivityStatus(room({ turnSeat: 1 })), { kind: "turn", text: "Test Player 2's turn" });
  assert.deepEqual(derivePublicActivityStatus(room({ turnSeat: 99 })), { kind: "resolving", text: "Resolving…" });
});

test("shared Negation wording is identical and ignores viewer-private submission state", () => {
  const publicSnapshot = snapshot({ stage: "NEGATION", actorId: null, stableKind: "SPECIAL", effect: "DrawTwo" });
  const base = room({ phase: "response", presentationSnapshot: publicSnapshot });
  const before = derivePublicActivityStatus(base);
  const afterSomeViewerSubmitted = derivePublicActivityStatus({
    ...base,
    pendingNegation: { submitted: true, submitterId: "p1", responseCount: 1 },
    currentAction: { actorId: "p3", reason: "private provider details" },
  });
  assert.deepEqual(before, {
    kind: "negation",
    text: "Waiting for counter responses",
    stage: "Negation can cancel the Something Out of Nothing effect on Test Player 2.",
  });
  assert.deepEqual(afterSomeViewerSubmitted, before);
});

test("Negation PAC names only the publicly proven effect and counter direction", () => {
  const initial = snapshot({ stage: "NEGATION", effect: "Duel" });
  assert.equal(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: initial })).stage,
    "Negation can cancel the Duel effect on Test Player 2.");

  const countered = snapshot({
    stage: "NEGATION",
    effect: "Duel",
    nextEffect: { kind: "restore_effect", label: "Duel" },
    publicEventFacts: [{
      semantics: "PROVEN", visibility: "PUBLIC",
      identity: { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 },
      eventId: "negation-1", rootEventId: "root-1-event", order: 2,
      category: "EFFECT_CANCELLED", actorId: "p3", affectedPlayerIds: ["p2"],
    }],
  });
  assert.equal(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: countered })).stage,
    "Another Negation can restore the Duel effect on Test Player 2.");

  const unprovenDirection = snapshot({ stage: "NEGATION", effect: "Duel", nextEffect: { kind: "unknown" } });
  assert.equal(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: unprovenDirection })).stage,
    "A Negation response is available.");
});

test("local Negation Pass and intent acknowledgements are current-window and viewer-private", () => {
  const publicSnapshot = snapshot({ stage: "NEGATION", effect: "Duel" });
  const common = room({ phase: "response", presentationSnapshot: publicSnapshot, currentViewerNegationWindowId: "window-1" });
  assert.equal(derivePublicActivityStatus(common).text, "Waiting for counter responses");

  const intentView = { ...publicSnapshot, viewerNegationChoice: { windowId: "window-1", locked: true, choice: "negation_intent" } };
  const passView = { ...publicSnapshot, viewerNegationChoice: { windowId: "window-1", locked: true, choice: "pass" } };
  assert.equal(derivePublicActivityStatus({ ...common, presentationSnapshot: intentView }).text, "Waiting for counter responses");
  assert.equal(viewerNegationAcknowledgement(intentView, "window-1", "response"), "You chose to play Negation. Waiting for the other players.");
  assert.equal(derivePublicActivityStatus({ ...common, presentationSnapshot: passView }).text, "Waiting for counter responses");
  assert.equal(viewerNegationAcknowledgement(passView, "window-1", "response"), "You passed. Waiting for the other players.");
  assert.equal(viewerNegationAcknowledgement(publicSnapshot, "window-1", "response"), null);
  assert.equal(viewerNegationAcknowledgement(intentView, "window-2", "response"), null);
  assert.equal(viewerNegationAcknowledgement(intentView, "window-1", "play"), null);
  assert.equal(viewerNegationAcknowledgement({ ...intentView, identity: { ...intentView.identity, checkpointId: "stale" } }, "window-1", "response"), null);
  assert.equal(triggerDecisionInstruction("Treachery", "Obtain the card that caused the damage, if it is still available.", true), "Use Treachery to obtain the card that caused the damage, or Skip.");
  assert.match(triggerDecisionInstruction("Unknown skill", "Select two cards.", true), /Select two cards, or Skip/);

  const staleIntent = { ...intentView, viewerNegationChoice: { ...intentView.viewerNegationChoice, windowId: "old-window" } };
  assert.equal(derivePublicActivityStatus({ ...common, presentationSnapshot: staleIntent }).text, "Waiting for counter responses");
});

test("H4 follows only the committed current-root Negation fact chain", () => {
  const identity = { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 };
  const fact = (eventId, order, category, actorId, affectedPlayerIds, extra = {}) => ({
    semantics: "PROVEN", visibility: "PUBLIC", identity, eventId, order,
    rootEventId: "root-event", category, actorId, affectedPlayerIds, ...extra,
  });
  const root = fact("root-event", 1, "CARD_PLAYED", "p1", ["p2"], {
    label: "Duel", effect: { kind: "card_play", label: "Duel" },
  });
  const first = fact("negation-1", 2, "EFFECT_CANCELLED", "p3", ["p2"], {
    label: "Negation", effect: { kind: "cancel_effect", label: "Duel" },
  });
  const second = fact("negation-2", 3, "EFFECT_RESTORED", "p4", ["p2"], {
    label: "Negation", effect: { kind: "restore_effect", label: "Duel" },
  });
  const third = fact("negation-3", 4, "EFFECT_CANCELLED", "p1", ["p2"], {
    label: "Negation", effect: { kind: "cancel_effect", label: "Duel" },
  });
  const baseSnapshot = snapshot({ stage: "NEGATION", effect: "Duel" });
  const withFacts = (publicEventFacts) => ({
    ...baseSnapshot,
    publicEventFacts,
    interaction: { ...baseSnapshot.interaction, activeTargetIds: ["p2"] },
  });

  const firstCopy = derivePublicNegationNarration({ snapshot: withFacts([root, first]), players, rootEventId: "root-event" });
  assert.equal(firstCopy?.headline, "Test Player 3's Negation cancels Test Player 1's Duel effect on Test Player 2.");
  const secondCopy = derivePublicNegationNarration({ snapshot: withFacts([root, first, second]), players, rootEventId: "root-event" });
  assert.equal(secondCopy?.headline, "Test Player 4 counters Test Player 3's Negation. The Duel effect on Test Player 2 is restored.");
  const thirdCopy = derivePublicNegationNarration({ snapshot: withFacts([root, first, second, third]), players, rootEventId: "root-event" });
  assert.equal(thirdCopy?.headline, "Test Player 1 counters Test Player 4's Negation. The Duel effect on Test Player 2 is cancelled.");

  const wrongRoot = { ...third, rootEventId: "another-root" };
  assert.equal(derivePublicNegationNarration({ snapshot: withFacts([root, wrongRoot]), players, rootEventId: "root-event" })?.headline,
    "Test Player 1 played Duel targeting Test Player 2.");
});

test("H4 keeps a proven committed Negation when PAC advances and ignores private viewer choice", () => {
  const identity = { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "fact-checkpoint", presentationRevision: 4 };
  const root = {
    semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: "root-event", rootEventId: "root-event", order: 1,
    category: "CARD_PLAYED", actorId: "p1", affectedPlayerIds: ["p2"], label: "Duel",
    effect: { kind: "card_play", label: "Duel" },
  };
  const cancelled = {
    semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: "cancel-event", rootEventId: "root-event", order: 2,
    category: "EFFECT_CANCELLED", actorId: "p3", affectedPlayerIds: ["p2"], label: "Negation",
    effect: { kind: "cancel_effect", label: "Duel" },
  };
  const base = snapshot({ stage: "NEGATION", publicEventFacts: [root, cancelled] });
  const advancedPac = {
    ...base,
    publicNextDecision: {
      ...base.publicNextDecision,
      identity: { ...base.publicNextDecision.identity, checkpointId: "later-decision", presentationRevision: 5 },
    },
  };
  const pass = { ...advancedPac, viewerNegationChoice: { windowId: "window-1", locked: true, choice: "pass" } };
  const intent = { ...advancedPac, viewerNegationChoice: { windowId: "window-1", locked: true, choice: "negation_intent" } };
  const expected = "Test Player 3's Negation cancels Test Player 1's Duel effect on Test Player 2.";
  for (const view of [advancedPac, pass, intent]) {
    const narration = derivePublicNegationNarration({ snapshot: view, players, rootEventId: "root-event" });
    assert.equal(narration?.headline, expected);
    assert.equal(narration?.eventId, "cancel-event");
    assert.equal(narration?.checkpointId, "fact-checkpoint");
  }
  assert.equal(derivePublicNegationNarration({
    snapshot: { ...base, publicEventFacts: [root, { ...cancelled, visibility: "PRIVATE" }] },
    players,
    rootEventId: "root-event",
  })?.headline, "Test Player 1 played Duel targeting Test Player 2.");
});

test("target-card choice progress is identical across viewers and exposes no selection details", () => {
  for (const cardKind of ["Steal", "Dismantle"]) {
    const pendingTargetCard = {
      kind: "target_card",
      sourceId: "p1",
      actorId: "p1",
      targetId: "p2",
      cardKind,
    };
    const views = players.map((_, viewerIndex) => derivePublicActivityStatus(room({
      phase: "response",
      pendingTargetCard,
      // Viewer-specific fields are intentionally not inputs to this shared projection.
      meId: `p${viewerIndex + 1}`,
      isMyAction: viewerIndex === 0,
    })));
    const expected = {
      kind: "target-card-choice",
      text: "Waiting for Test Player 1 to choose a card from Test Player 2.",
      anchorPlayerId: "p2",
    };
    for (const view of views) {
      assert.deepEqual(view, expected);
      assert.doesNotMatch(JSON.stringify(view), /hand|equipment|judgement|candidate|eligible|index|cardId/i);
    }
  }
});

test("target-card choice progress is absent before Negation settles and fails closed on inconsistent public state", () => {
  const pendingTargetCard = { kind: "target_card", sourceId: "p1", actorId: "p1", targetId: "p2", cardKind: "Steal" };
  assert.equal(derivePublicActivityStatus(room({ phase: "response", pendingTargetCard: null })).kind, "resolving");
  assert.notEqual(derivePublicActivityStatus(room({ phase: "response", pendingTargetCard: { ...pendingTargetCard, targetId: "p1" } })).kind, "target-card-choice");
  assert.notEqual(derivePublicActivityStatus(room({ phase: "response", pendingTargetCard: { ...pendingTargetCard, kind: "unknown" } })).kind, "target-card-choice");
  assert.notEqual(derivePublicActivityStatus(room({ phase: "play", pendingTargetCard })).kind, "target-card-choice");

  const negationSnapshot = snapshot({ stage: "NEGATION", actorId: null, stableKind: "SPECIAL", effect: "Steal" });
  assert.equal(derivePublicActivityStatus(room({ phase: "response", pendingTargetCard, presentationSnapshot: negationSnapshot })).kind, "negation");
});

test("PAC uses the snapshot's identity-matched public decision actor, independent of provider proof", () => {
  const publicSnapshot = snapshot({
    stage: "DUEL_EXCHANGE",
    actorId: "p2",
    effect: "Duel",
    duelExchange: { semantics: "PROVEN", decisionActorId: "p2", currentParticipantId: "p2" },
  });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: publicSnapshot })), {
    kind: "response",
    text: "Waiting for Test Player 2",
    heading: "Waiting for Test Player 2",
    stage: "Duel Exchange",
  });

  const mismatchedProof = snapshot({
    stage: "DUEL_EXCHANGE",
    actorId: "p2",
    effect: "Duel",
    duelExchange: { semantics: "PROVEN", decisionActorId: "p3", currentParticipantId: "p3" },
  });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: mismatchedProof })), {
    kind: "response",
    text: "Waiting for Test Player 2",
    heading: "Waiting for Test Player 2",
    stage: "Duel Exchange",
  });
});

test("PAC stage and actor come from the current snapshot, not provider-specific Duel exchange projections", () => {
  const generatedExchange = {
    semantics: "PROVEN",
    interactionId: "interaction-1",
    rootFrameId: "root-1",
    checkpointId: "checkpoint-1",
    presentationRevision: 1,
    currentParticipantId: "p2",
    decisionActorId: "p2",
  };
  const publicSnapshot = snapshot({ stage: "DUEL_EXCHANGE", actorId: "p2", effect: "Duel", lustDuelExchange: generatedExchange });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: publicSnapshot })), {
    kind: "response",
    text: "Waiting for Test Player 2",
    heading: "Waiting for Test Player 2",
    stage: "Duel Exchange",
  });

  const staleCheckpoint = snapshot({
    stage: "DUEL_EXCHANGE",
    actorId: "p2",
    effect: "Duel",
    lustDuelExchange: { ...generatedExchange, checkpointId: "old-checkpoint" },
  });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: staleCheckpoint })), {
    kind: "response",
    text: "Waiting for Test Player 2",
    heading: "Waiting for Test Player 2",
    stage: "Duel Exchange",
  });

  const mismatchedActor = snapshot({
    stage: "DUEL_EXCHANGE",
    actorId: "p2",
    effect: "Duel",
    lustDuelExchange: { ...generatedExchange, currentParticipantId: "p3", decisionActorId: "p3" },
  });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: mismatchedActor })), {
    kind: "response",
    text: "Waiting for Test Player 2",
    heading: "Waiting for Test Player 2",
    stage: "Duel Exchange",
  });
});

test("PAC announces the publicly proven required response and outcome", () => {
  const publicSnapshot = snapshot({
    stage: "DUEL_EXCHANGE",
    actorId: "p2",
    actionLabels: ["Attack", "take damage"],
  });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: publicSnapshot })), {
    kind: "response",
    text: "Waiting for Test Player 2 to play Attack or take damage",
    heading: "Waiting for Test Player 2 to play Attack or take damage",
    stage: "Duel Exchange",
  });
});

test("unproven response and shared Negation actor details are never published", () => {
  const unproven = snapshot({ stage: "DUEL_EXCHANGE", actorId: "p2", effect: "Duel", semantics: "UNPROVEN" });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: unproven })), { kind: "resolving", text: "Resolving…" });

  const secretNegationActor = snapshot({ stage: "NEGATION", actorId: "p2", stableKind: "SPECIAL", effect: "Duel" });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: secretNegationActor })), { kind: "resolving", text: "Resolving…" });
});

test("settling phases do not reuse a stale publicly proven actor", () => {
  const priorDuel = snapshot({
    stage: "DUEL_EXCHANGE",
    actorId: "p2",
    effect: "Duel",
    duelExchange: { semantics: "PROVEN", decisionActorId: "p2", currentParticipantId: "p2" },
  });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "resolving", presentationSnapshot: priorDuel })), {
    kind: "resolving",
    text: "Resolving…",
  });
});

test("finished room never retains a stale public player turn", () => {
  assert.deepEqual(derivePublicActivityStatus(room({ status: "finished", phase: "finished", turnSeat: 0 })), { kind: "finished", text: "Match complete" });
});

test("generic H4 retains damage through Skip and formats committed public or hidden skill outcomes", () => {
  const identity = { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 };
  const fact = (eventId, order, category, extra = {}) => ({
    semantics: "PROVEN", visibility: "PUBLIC", identity, eventId, order, rootEventId: "root-event",
    category, affectedPlayerIds: [], ...extra,
  });
  const root = fact("root-event", 1, "CARD_PLAYED", { actorId: "p1" });
  const damage = fact("damage", 2, "DAMAGE_APPLIED", { actorId: "p1", affectedPlayerIds: ["p2"], amount: 1 });
  const input = (facts) => ({ snapshot: snapshot({ stage: "DAMAGE", actorId: "p2", publicEventFacts: facts }),
    players, rootEventId: "root-event", interactionId: "interaction-1", rootFrameId: "root-1" });
  assert.equal(derivePublicInteractionNarration(input([root, damage]))?.headline, "Test Player 1 dealt 1 damage to Test Player 2.");
  // A Skip adds no skill fact, including when a later decision uses the same causal root.
  assert.equal(derivePublicInteractionNarration(input([root, damage]))?.eventId, "damage");
  const hidden = fact("hidden", 3, "SKILL_USED", { actorId: "p2", affectedPlayerIds: ["p1"], label: "Retaliation", outcomeLabel: "obtained one card", effect: { kind: "gain_target_card" } });
  assert.equal(derivePublicInteractionNarration(input([root, damage, hidden]))?.headline,
    "Test Player 2 used Retaliation and obtained one card from Test Player 1.");
  const visible = { ...hidden, eventId: "visible", effect: { kind: "gain_target_card", label: "Nio Shield" } };
  assert.equal(derivePublicInteractionNarration(input([root, damage, visible]))?.headline,
    "Test Player 2 used Retaliation and obtained one card from Test Player 1.");
  const treachery = fact("treachery-result", 4, "SKILL_USED", {
    actorId: "p2", label: "Treachery", effect: { kind: "gain_damage_cards" },
  });
  assert.equal(derivePublicInteractionNarration(input([root, damage, treachery]))?.headline,
    "Test Player 2 used Treachery and obtained the card that caused the damage.");
  const longSkillResult = fact("long-skill-result", 4, "SKILL_USED", {
    actorId: "p2", label: "Shielding Formation",
    outcomeLabel: "prevented damage to Test Player 1 after the public judgement resolved",
    effect: { kind: "generic_effect" },
  });
  assert.equal(derivePublicInteractionNarration(input([root, damage, longSkillResult]))?.headline,
    "Test Player 2 used Shielding Formation and prevented damage to Test Player 1 after the public judgement resolved.");
  for (const [label, outcome] of [["Legacy", "began a card distribution"], ["Synthetic provider", "resolved a public effect"]]) {
    const skill = fact(`skill-${label}`, 4, "SKILL_USED", { actorId: "p2", label, outcomeLabel: outcome, effect: { kind: "generic_effect" } });
    assert.equal(derivePublicInteractionNarration(input([root, damage, hidden, skill]))?.headline,
      `Test Player 2 used ${label} and ${outcome}.`);
  }
  const rest = { ...snapshot({ stage: "DAMAGE" }), identity: null, interaction: null, stable: { kind: "REST" },
    retainedPublicEvent: visible, retainedPublicEventFacts: [damage, visible] };
  assert.equal(derivePublicInteractionNarration({ ...input([]), snapshot: rest })?.eventId, "visible");
  assert.equal(derivePublicInteractionNarration({ ...input([]), snapshot: rest, interactionId: "new-interaction" }), null);
  assert.equal(derivePublicInteractionNarration(input([root, hidden]))?.headline, "Test Player 2 used Retaliation and obtained one card from Test Player 1.");
  const generic = fact("generic", 4, "SKILL_USED", { actorId: "p2", label: "New ability", outcomeLabel: "resolved a public effect", effect: { kind: "generic_effect" } });
  assert.equal(derivePublicInteractionNarration(input([root, generic]))?.headline, "Test Player 2 used New ability and resolved a public effect.");
  const noDamageRest = { ...rest, retainedPublicEvent: generic, retainedPublicEventFacts: [generic] };
  assert.equal(derivePublicInteractionNarration({ ...input([]), snapshot: noDamageRest })?.eventId, "generic");
  const independent = { ...generic, eventId: "standalone", rootEventId: "standalone" };
  assert.equal(derivePublicInteractionNarration({ ...input([independent]), rootEventId: "standalone" })?.eventId, "standalone");
});
