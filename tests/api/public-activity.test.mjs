import test from "node:test";
import { viewerNegationAcknowledgement, triggerDecisionInstruction } from "../../game/console-decision.ts";
import assert from "node:assert/strict";
import { derivePublicActivityStatus, derivePublicInteractionNarration, derivePublicNegationNarration, formatCommittedPublicOutcome, isPublicInteractionOutcomeFact, PUBLIC_H4_FACT_CATEGORIES } from "../../game/public-activity.ts";
import { PUBLIC_PRESENTATION_EVENT_CATEGORIES } from "../../game/presentation-semantics.ts";

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
    bumperHarvestPicks: [],
    viewerNegationChoice,
    duelExchange,
    lustDuelExchange,
  };
}

function room(overrides = {}) {
  return { status: "playing", phase: "play", turnSeat: 0, players, presentationSnapshot: null, ...overrides };
}

function visibleActivityStatus(status) {
  const visible = { ...status };
  delete visible.textSegments;
  delete visible.headingSegments;
  delete visible.stageSegments;
  return visible;
}

const playerIds = (segments = []) => segments.filter((part) => part.kind === "player").map((part) => part.playerId);

function harvestSnapshot({ responseCount = 0, stage = "NEGATION", effectState = "ACTIVE", nextEffectKind, responseWindowOpen = true } = {}) {
  const interactionId = "harvest-interaction";
  const rootFrameId = "harvest-root-frame";
  const responseFrameId = "harvest-negation-frame";
  const activeFrameId = stage === "NEGATION" ? responseFrameId : rootFrameId;
  const checkpointId = `checkpoint-${stage}-${responseCount}`;
  const presentationRevision = responseCount + (stage === "NEGATION" ? 1 : 2);
  const identity = { interactionId, checkpointId, presentationRevision };
  const semanticIdentity = { ...identity, rootFrameId };
  const responses = [];
  const facts = [{
    semantics: "PROVEN", visibility: "PUBLIC", identity: semanticIdentity,
    eventId: "harvest-root-event", resolutionId: "harvest-root-resolution", order: 1,
    frameId: rootFrameId, rootEventId: "harvest-root-event", category: "CARD_PLAYED",
    actorId: "p1", affectedPlayerIds: ["p2", "p3"], label: "BumperHarvest",
    effect: { kind: "card_play", label: "BumperHarvest" },
  }];
  const nodes = [];
  for (let index = 0; index < responseCount; index++) {
    const actorId = index === 0 ? "p3" : "p4";
    const nodeId = `harvest-negation-node-${index + 1}`;
    const response = {
      semantics: "PROVEN", order: index + 1, interactionId, rootFrameId,
      rootEventId: "harvest-root-event", rootResolutionId: "harvest-root-resolution",
      rootCardId: "harvest-root-card", effectParticipantId: "p2", parentFrameId: rootFrameId,
      frameId: responseFrameId, nodeId, causedByNodeId: index === 0 ? null : nodes[index - 1].nodeId,
      actorId, cardId: `harvest-negation-card-${index + 1}`,
      eventId: `harvest-negation-event-${index + 1}`, resolutionId: `harvest-negation-resolution-${index + 1}`,
    };
    responses.push(response);
    nodes.push({ nodeId, interactionId, frameId: responseFrameId, causedByNodeId: response.causedByNodeId, actorId, kind: "CARD_PLAY", object: { type: "card", cardKind: "Negation" } });
    facts.push({
      semantics: "PROVEN", visibility: "PUBLIC", identity: semanticIdentity,
      eventId: response.eventId, resolutionId: response.resolutionId, order: index * 2 + 2,
      frameId: responseFrameId, parentFrameId: rootFrameId, rootEventId: "harvest-root-event",
      category: "CARD_PLAYED", actorId, affectedPlayerIds: ["p2"], label: "Negation",
      effect: { kind: "card_play", label: "Negation" },
    });
    facts.push({
      semantics: "PROVEN", visibility: "PUBLIC", identity: semanticIdentity,
      eventId: `harvest-negation-outcome-${index + 1}`, resolutionId: response.resolutionId, order: index * 2 + 3,
      frameId: responseFrameId, parentFrameId: rootFrameId, rootEventId: "harvest-root-event",
      category: index === 0 ? "EFFECT_CANCELLED" : "EFFECT_RESTORED", actorId, affectedPlayerIds: ["p2"],
      effect: { kind: index === 0 ? "cancel_effect" : "restore_effect", label: "BumperHarvest" },
    });
  }
  const decisionActorId = stage === "SEQUENTIAL_CHOICE" ? "p2" : null;
  const currentEffectState = stage === "NEGATION" ? effectState : undefined;
  const chain = stage === "NEGATION" ? {
    semantics: "PROVEN", interactionId, frameId: responseFrameId, rootCard: null, nodes,
    publicNodeEventLinks: responses.map((response) => ({ nodeId: response.nodeId, eventId: response.eventId, resolutionId: response.resolutionId })),
  } : null;
  return {
    identity,
    stable: { kind: stage === "NEGATION" ? "SPECIAL" : "CHOICE", interactionId, checkpointId, presentationRevision, decisionActorId },
    interaction: {
      semantics: "PROVEN", interactionId, rootFrameId, activeFrameId, parentFrameId: stage === "NEGATION" ? rootFrameId : null,
      checkpointId, presentationRevision, stage, sourceId: "p1", effect: "BumperHarvest", targetIds: ["p2", "p3"],
      currentParticipantId: "p2", decisionActorId, activeResolverId: decisionActorId,
      activeSourceId: "p1", activeTargetIds: ["p2"], participantIds: ["p1", "p2", "p3"],
      participantRoles: { sourceId: "p1", originalTargetIds: ["p2", "p3"], activeTargetIds: ["p2"], currentParticipantId: "p2", decisionActorId, activeResolverId: decisionActorId, parentParticipantId: null, participantIds: ["p1", "p2", "p3"] },
      continuity: { relation: stage === "NEGATION" ? "CHILD_FRAME" : "ROOT_FRAME", parentFrameId: stage === "NEGATION" ? rootFrameId : null },
    },
    publicNextDecision: {
      semantics: "PROVEN", visibility: "PUBLIC", identity: semanticIdentity,
      decisionId: `decision-${stage}-${responseCount}`, stage,
      stageLabel: stage === "NEGATION" ? "Negation" : "Sequential Choice",
      actorIds: decisionActorId ? [decisionActorId] : [],
      actionLabels: decisionActorId ? ["Choose one revealed card"] : ["Negation"],
      ...(stage === "NEGATION" ? { nextEffect: { kind: nextEffectKind ?? (effectState === "BLOCKED" ? "restore_effect" : "cancel_effect"), label: "BumperHarvest" } } : {}),
      responseWindowOpen: stage === "NEGATION" ? responseWindowOpen : false,
    },
    bumperHarvestProgress: {
      semantics: "PROVEN", interactionId, rootFrameId, activeFrameId, checkpointId, presentationRevision,
      sourceId: "p1", rootEventId: "harvest-root-event", rootResolutionId: "harvest-root-resolution",
      rootCardId: "harvest-root-card", targetIds: ["p2", "p3"], currentParticipantId: "p2",
      ...(currentEffectState ? { currentEffectState } : {}),
      participants: [
        { playerId: "p2", order: 1, status: "CURRENT" },
        { playerId: "p3", order: 2, status: "PENDING" },
      ],
      publicNegationResponses: responses,
    },
    publicEventFacts: facts,
    bumperHarvestPicks: [],
    reactionChain: chain,
    viewerNegationChoice: null,
  };
}

test("public activity uses the public turn seat and fails closed for an absent seat", () => {
  const turn = derivePublicActivityStatus(room({ turnSeat: 1 }));
  assert.deepEqual(visibleActivityStatus(turn), { kind: "turn", text: "Test Player 2's turn" });
  assert.deepEqual(playerIds(turn.textSegments), ["p2"]);
  assert.deepEqual(derivePublicActivityStatus(room({ turnSeat: 99 })), { kind: "none", text: "" });
});

test("public Draw Phase choice shows the turn and server-proven decision", () => {
  const current = snapshot({ stage: "SKILL_DECISION" });
  current.publicDrawPhaseDecision = { semantics: "PROVEN", visibility: "PUBLIC", actorId: "p1", actionLabels: ["Heroic"], allowSkip: true };
  const input = room({ phase: "response", presentationSnapshot: current });
  assert.deepEqual(visibleActivityStatus(derivePublicActivityStatus(input)), {
    kind: "response", text: "Test Player 1's turn", heading: "Test Player 1's turn",
    stage: "Waiting for Test Player 1 to use Heroic or Skip.",
  });
  const copy = derivePublicActivityStatus(input);
  assert.deepEqual(playerIds(copy.headingSegments), ["p1"]);
  assert.deepEqual(playerIds(copy.stageSegments), ["p1"]);
  assert.equal(derivePublicActivityStatus({ ...input, turnSeat: 1 }).kind, "none");
  assert.equal(derivePublicActivityStatus({ ...input, phase: "play" }).kind, "turn");
  current.publicDrawPhaseDecision.visibility = "REDACTED";
  assert.equal(derivePublicActivityStatus(input).kind, "none");
  current.publicDrawPhaseDecision = { semantics: "PROVEN", visibility: "PUBLIC", actorId: "p1", actionLabels: null, allowSkip: true };
  assert.equal(derivePublicActivityStatus(input).kind, "none", "malformed public projections fail closed");
});

test("public next-decision copy narrates a combined suit and hidden-card choice", () => {
  const current = snapshot({ stage: "SEQUENTIAL_CHOICE", actorId: "p2", stableKind: "CHOICE", actionLabels: ["Choose a suit and a card"] });
  current.publicNextDecision.stageLabel = "Skill decision";
  assert.deepEqual(visibleActivityStatus(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: current }))), {
    kind: "response",
    text: "Waiting for Test Player 2 to choose a suit and a card",
    heading: "Waiting for Test Player 2 to choose a suit and a card",
    stage: "Skill decision",
  });
  assert.deepEqual(playerIds(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: current })).textSegments), ["p2"]);
});

test("public PAC names the proven Stauchness consequence chooser without exposing the private selection", () => {
  const current = snapshot({ stage: "SEQUENTIAL_CHOICE", actorId: "p2", stableKind: "CHOICE" });
  current.publicNextDecision.stageLabel = "Stauchness consequence choice";
  current.publicNextDecision.actionLabels = [];
  const views = players.map((viewer) => derivePublicActivityStatus(room({
    phase: "response", presentationSnapshot: current, viewerId: viewer.id,
    currentAction: { actorId: viewer.id, triggerSelectedKeys: viewer.id === "p2" ? ["hand:0", "hand:1"] : [] },
  })));
  assert.ok(views.every((view) => JSON.stringify(view) === JSON.stringify(views[0])));
  assert.equal(views[0].text, "Waiting for Test Player 2 to choose a Stauchness consequence.");
  assert.deepEqual(playerIds(views[0].textSegments), ["p2"]);
  assert.doesNotMatch(JSON.stringify(views[0]), /hand:0|hand:1|triggerSelectedKeys|discard_two|take_damage/);
});

test("shared-window PAC exposes only the public requester identity consistently across viewers", () => {
  const current = snapshot({ stage: "ENTOURAGE", actorId: null, stableKind: "SPECIAL" });
  current.sharedResponseWindow = {
    semantics: "PROVEN", windowId: "window-public-copy", mode: "ENTOURAGE_DODGE", requesterId: "p2", targetId: "p2",
    openedAt: 100, deadline: 8100, stage: "COLLECTING", eligiblePlayerIds: ["private-helper"], submissions: [{ cardIds: ["secret-card"] }],
  };
  const views = players.map((player) => derivePublicActivityStatus(room({
    phase: "response", presentationSnapshot: current, viewerId: player.id,
    currentAction: { actorId: player.id, sharedWindow: { locked: player.id === "p3", choice: "intent", cardIds: ["private-card"] } },
  })));
  assert.ok(views.every((view) => JSON.stringify(view) === JSON.stringify(views[0])));
  assert.equal(views[0].text, "Waiting for Wei Dodge responses for Test Player 2.");
  assert.deepEqual(playerIds(views[0].textSegments), ["p2"]);
  assert.doesNotMatch(JSON.stringify(views[0]), /private-helper|secret-card|private-card|submissions|eligiblePlayerIds/);
});

test("Borrowed Sword PAC names only its proven chooser and holder", () => {
  const current = snapshot({ stage: "BORROWED_SWORD_TARGET_CHOICE", actorId: "p3", stableKind: "CHOICE", effect: "BorrowedSword" });
  current.publicNextDecision.stageLabel = "Borrowed Sword target choice";
  const status = derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: current }));
  assert.equal(status.text, "Waiting for Test Player 3 to choose Test Player 2's Attack target.");
  assert.deepEqual(playerIds(status.textSegments), ["p3", "p2"]);
});

test("PAC follows the exact committed Judgement event and ignores stale or mismatched stage facts", () => {
  const identity = { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 };
  const judgementFact = {
    semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: "judgement-reveal", rootEventId: "overindulgence-play",
    order: 2, category: "EFFECT_APPLIED", actorId: "p2", affectedPlayerIds: ["p2"], label: "Overindulgence",
    outcomeLabel: "Da Qiao revealed A♠ Duel for Overindulgence.", effect: { kind: "judgement", label: "Overindulgence" },
  };
  const judgementSnapshot = snapshot({ stage: "JUDGEMENT", actorId: null, stableKind: "REST", publicEventFacts: [judgementFact] });
  const input = room({ phase: "resolving", presentationSnapshot: judgementSnapshot, activePublicJudgementEventId: "judgement-reveal" });
  assert.deepEqual(visibleActivityStatus(derivePublicActivityStatus(input)), {
    kind: "judgement", text: "Test Player 2 is judging Overindulgence.", heading: "Test Player 2 is judging Overindulgence.",
  });
  assert.equal(derivePublicActivityStatus({ ...input, activePublicJudgementEventId: "stale-reveal" }).kind, "none");
  assert.equal(derivePublicActivityStatus({ ...input,
    presentationSnapshot: { ...judgementSnapshot, interaction: { ...judgementSnapshot.interaction, stage: "SETTLEMENT" } },
  }).kind, "none", "an earlier Judgement fact must not override a newer server stage");
  assert.equal(derivePublicActivityStatus({ ...input, phase: "discard" }).kind, "judgement",
    "the exact public reveal stays aligned with H4/PAC until it stops being the active event");
  assert.deepEqual(visibleActivityStatus(derivePublicActivityStatus({ ...input, phase: "discard", activePublicJudgementEventId: null })), {
    kind: "discard", text: "Waiting for Test Player 1 to discard cards.", heading: "Waiting for Test Player 1 to discard cards.",
  }, "server Discard Phase takes over after the prior reveal is no longer active");
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
  assert.deepEqual(visibleActivityStatus(before), {
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

test("Bumper Harvest H4 and PAC follow committed recipient Negation facts through the real pick stage", () => {
  const initial = harvestSnapshot();
  const initialH4 = derivePublicNegationNarration({ snapshot: initial, players, rootEventId: "harvest-root-event" });
  assert.equal(initialH4?.headline, "Test Player 1 played [Bumper Harvest].");
  assert.deepEqual(playerIds(initialH4?.headlineSegments), ["p1"]);
  assert.equal(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: initial })).stage,
    "Negation can prevent Test Player 2 from picking.");

  const cancelled = harvestSnapshot({ responseCount: 1, effectState: "BLOCKED", nextEffectKind: "restore_effect" });
  const cancelledH4 = derivePublicNegationNarration({ snapshot: cancelled, players, rootEventId: "harvest-root-event" });
  assert.equal(cancelledH4?.headline, "Test Player 3's [Negation] blocks Test Player 2's pick.");
  assert.deepEqual(playerIds(cancelledH4?.headlineSegments), ["p3", "p2"]);
  assert.equal(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: cancelled })).stage,
    "Another Negation can restore Test Player 2's pick.");

  const restored = harvestSnapshot({ responseCount: 2, effectState: "ACTIVE", nextEffectKind: "cancel_effect" });
  const restoredH4 = derivePublicNegationNarration({ snapshot: restored, players, rootEventId: "harvest-root-event" });
  assert.equal(restoredH4?.headline,
    "Test Player 4 counters Test Player 3's [Negation]. Test Player 2's pick is restored.");
  assert.deepEqual(playerIds(restoredH4?.headlineSegments), ["p4", "p3", "p2"]);
  assert.equal(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: restored })).stage,
    "Another Negation can prevent Test Player 2 from picking.");

  const picking = harvestSnapshot({ responseCount: 2, stage: "SEQUENTIAL_CHOICE" });
  assert.equal(derivePublicNegationNarration({ snapshot: picking, players, rootEventId: "harvest-root-event" })?.headline,
    restoredH4?.headline);
  assert.deepEqual(visibleActivityStatus(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: picking }))), {
    kind: "response", text: "Waiting for Test Player 2 to pick a card", heading: "Waiting for Test Player 2 to pick a card",
  });
  const pickedCard = {
    semantics: "PROVEN", visibility: "PUBLIC",
    identity: { ...picking.identity, rootFrameId: "harvest-root-frame" },
    eventId: "harvest-picked-card", resolutionId: "harvest-pick-resolution", order: 6,
    frameId: "harvest-root-frame", parentFrameId: undefined, rootEventId: "harvest-root-event",
    category: "CARD_OBTAINED", actorId: "p2", affectedPlayerIds: ["p2"], label: "Dodge",
    effect: { kind: "obtain_card", label: "Dodge" },
  };
  assert.equal(derivePublicNegationNarration({
    snapshot: { ...picking, publicEventFacts: [...picking.publicEventFacts, pickedCard] },
    players, rootEventId: "harvest-root-event",
  }), null, "a later public card receipt retires the earlier Negation H4");
});

test("a committed public Harvest pick owns the newest H4 through the next Negation window", () => {
  const base = harvestSnapshot({ stage: "NEGATION", responseCount: 2, effectState: "ACTIVE", nextEffectKind: "cancel_effect" });
  const chosenCard = {
    semantics: "PROVEN", visibility: "PUBLIC",
    identity: { ...base.publicEventFacts[0].identity },
    eventId: "harvest-choice-commit", resolutionId: "harvest-root-resolution", order: 6,
    frameId: "harvest-root-frame", rootEventId: "harvest-root-event",
    category: "CARD_OBTAINED", actorId: "p2", affectedPlayerIds: ["p2"], label: "Overindulgence",
    outcomeLabel: "Test Player 2 took 6♠ Overindulgence from Bumper Harvest",
    effect: { kind: "bumper_harvest_pick", label: "Bumper Harvest" },
  };
  const pick = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: chosenCard.eventId, order: chosenCard.order,
    actorId: chosenCard.actorId, rootEventId: chosenCard.rootEventId, chosenCardId: "public-overindulgence-6-spade",
    chosenFace: { kind: "Overindulgence", suit: "♠", rank: "6" },
    committedIdentity: { ...chosenCard.identity },
  };
  chosenCard.bumperHarvestPick = pick;
  const snapshotWithPick = { ...base, publicEventFacts: [...base.publicEventFacts, chosenCard], bumperHarvestPicks: [pick] };
  const narration = derivePublicNegationNarration({ snapshot: snapshotWithPick, players, rootEventId: "harvest-root-event" });
  assert.equal(narration?.headline, "Test Player 2 took [6♠ Overindulgence] from [Bumper Harvest].");
  assert.deepEqual(playerIds(narration?.headlineSegments), ["p2"]);
  assert.equal(narration?.eventId, chosenCard.eventId);
  assert.equal(narration?.phase, "WINDOW_OPEN");
  assert.equal(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: snapshotWithPick })).stage,
    "Another Negation can prevent Test Player 2 from picking.",
  "the public next action describes the current open response independently of the committed-pick H4");

  const staleMismatchedPick = { ...chosenCard, rootEventId: "another-root" };
  assert.notEqual(derivePublicNegationNarration({
    snapshot: { ...base, publicEventFacts: [...base.publicEventFacts, staleMismatchedPick], bumperHarvestPicks: [{ ...pick, rootEventId: "another-root" }] },
    players, rootEventId: "harvest-root-event",
  })?.headline, staleMismatchedPick.outcomeLabel + ".");
  const privateLikePick = { ...chosenCard, visibility: "LOCAL" };
  assert.notEqual(derivePublicNegationNarration({
    snapshot: { ...base, publicEventFacts: [...base.publicEventFacts, privateLikePick], bumperHarvestPicks: [{ ...pick, visibility: "LOCAL" }] },
    players, rootEventId: "harvest-root-event",
  })?.headline, privateLikePick.outcomeLabel + ".");
});

test("Bumper Harvest public copy fails closed for missing outcome proof and ignores private viewer choices", () => {
  const committed = harvestSnapshot({ responseCount: 1, effectState: "BLOCKED", nextEffectKind: "restore_effect" });
  const hiddenOutcome = { ...committed, publicEventFacts: committed.publicEventFacts.filter((fact) => fact.category !== "EFFECT_CANCELLED") };
  assert.equal(derivePublicNegationNarration({ snapshot: hiddenOutcome, players, rootEventId: "harvest-root-event" })?.headline,
    "Test Player 1 played [Bumper Harvest].");
  const baseStatus = derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: hiddenOutcome }));
  assert.equal(baseStatus.stage, "Waiting for Negation responses");
  for (const choice of ["pass", "negation_intent"]) {
    const viewerSnapshot = { ...committed, viewerNegationChoice: { windowId: "private-window", locked: true, choice } };
    assert.deepEqual(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: viewerSnapshot })),
      derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: committed })));
    assert.doesNotMatch(JSON.stringify(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: viewerSnapshot }))),
      /private-window|negation_intent|cardId|card-1/);
  }
  const stale = { ...committed, interaction: { ...committed.interaction, presentationRevision: 99 } };
  assert.equal(derivePublicNegationNarration({ snapshot: stale, players, rootEventId: "harvest-root-event" }), null);
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
  assert.equal(triggerDecisionInstruction("Use Frost Sword", undefined, true), "Use Frost Sword, or Skip.");
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
  assert.equal(firstCopy?.headline, "Test Player 3's [Negation] cancels Test Player 1's [Duel] effect on Test Player 2.");
  assert.deepEqual(playerIds(firstCopy?.headlineSegments), ["p3", "p1", "p2"]);
  const secondCopy = derivePublicNegationNarration({ snapshot: withFacts([root, first, second]), players, rootEventId: "root-event" });
  assert.equal(secondCopy?.headline, "Test Player 4 counters Test Player 3's [Negation]. The [Duel] effect on Test Player 2 is restored.");
  assert.deepEqual(playerIds(secondCopy?.headlineSegments), ["p4", "p3", "p2"]);
  const thirdCopy = derivePublicNegationNarration({ snapshot: withFacts([root, first, second, third]), players, rootEventId: "root-event" });
  assert.equal(thirdCopy?.headline, "Test Player 1 counters Test Player 4's [Negation]. The [Duel] effect on Test Player 2 is cancelled.");
  assert.deepEqual(playerIds(thirdCopy?.headlineSegments), ["p1", "p4", "p2"]);
  assert.equal(secondCopy?.headlineSegments?.map(({ text }) => text).join(""), secondCopy?.headline);

  const duplicateVisibleNames = players.map((player) => ["p1", "p2", "p3"].includes(player.id)
    ? { ...player, name: "Same Name" } : player);
  const duplicateCopy = derivePublicNegationNarration({
    snapshot: withFacts([root, first]), players: duplicateVisibleNames, rootEventId: "root-event",
  });
  assert.equal(duplicateCopy?.headline, "Same Name's [Negation] cancels [Duel] effect on Same Name.");
  assert.deepEqual(playerIds(duplicateCopy?.headlineSegments), ["p3", "p2"]);
  const missingTargetCopy = derivePublicNegationNarration({
    snapshot: withFacts([root, first]), players: players.filter((player) => player.id !== "p2"), rootEventId: "root-event",
  });
  assert.equal(missingTargetCopy?.headline, "Test Player 3's [Negation] cancels Test Player 1's [Duel] effect.");
  assert.deepEqual(playerIds(missingTargetCopy?.headlineSegments), ["p3", "p1"]);

  const wrongRoot = { ...third, rootEventId: "another-root" };
  assert.equal(derivePublicNegationNarration({ snapshot: withFacts([root, wrongRoot]), players, rootEventId: "root-event" })?.headline,
    "Test Player 1 played [Duel] targeting Test Player 2.");
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
  const expected = "Test Player 3's [Negation] cancels Test Player 1's [Duel] effect on Test Player 2.";
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
  })?.headline, "Test Player 1 played [Duel] targeting Test Player 2.");
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
    };
    for (const view of views) {
      assert.deepEqual(visibleActivityStatus(view), expected);
      assert.doesNotMatch(JSON.stringify(view), /hand|equipment|judgement|candidate|eligible|index|cardId/i);
    }
  }
});

test("target-card choice progress is absent before Negation settles and fails closed on inconsistent public state", () => {
  const pendingTargetCard = { kind: "target_card", sourceId: "p1", actorId: "p1", targetId: "p2", cardKind: "Steal" };
  assert.equal(derivePublicActivityStatus(room({ phase: "response", pendingTargetCard: null })).kind, "none");
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
  assert.deepEqual(visibleActivityStatus(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: publicSnapshot }))), {
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
  assert.deepEqual(visibleActivityStatus(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: mismatchedProof }))), {
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
  assert.deepEqual(visibleActivityStatus(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: publicSnapshot }))), {
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
  assert.deepEqual(visibleActivityStatus(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: staleCheckpoint }))), {
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
  assert.deepEqual(visibleActivityStatus(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: mismatchedActor }))), {
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
  assert.deepEqual(visibleActivityStatus(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: publicSnapshot }))), {
    kind: "response",
    text: "Waiting for Test Player 2 to play Attack or take damage",
    heading: "Waiting for Test Player 2 to play Attack or take damage",
    stage: "Duel Exchange",
  });
});

test("unproven response and shared Negation actor details are never published", () => {
  const unproven = snapshot({ stage: "DUEL_EXCHANGE", actorId: "p2", effect: "Duel", semantics: "UNPROVEN" });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: unproven })), { kind: "none", text: "" });

  const secretNegationActor = snapshot({ stage: "NEGATION", actorId: "p2", stableKind: "SPECIAL", effect: "Duel" });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: secretNegationActor })), { kind: "none", text: "" });
});

test("settling phases do not reuse a stale publicly proven actor", () => {
  const priorDuel = snapshot({
    stage: "DUEL_EXCHANGE",
    actorId: "p2",
    effect: "Duel",
    duelExchange: { semantics: "PROVEN", decisionActorId: "p2", currentParticipantId: "p2" },
  });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "resolving", presentationSnapshot: priorDuel })), {
    kind: "none",
    text: "",
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
  const damageNarration = derivePublicInteractionNarration(input([root, damage]));
  assert.equal(damageNarration?.headline, "Test Player 1 dealt 1 damage to Test Player 2.");
  assert.deepEqual(playerIds(damageNarration?.headlineSegments), ["p1", "p2"]);
  const actorOnlyDamage = fact("actor-only-damage", 2, "DAMAGE_APPLIED", { actorId: "p1", amount: 1 });
  const actorOnlyNarration = derivePublicInteractionNarration(input([root, actorOnlyDamage]));
  assert.equal(actorOnlyNarration?.headline, "Test Player 1 dealt 1 damage.");
  assert.deepEqual(playerIds(actorOnlyNarration?.headlineSegments), ["p1"]);
  const burningBridges = fact("burning-bridges", 1, "CARD_PLAYED", {
    actorId: "p3", affectedPlayerIds: ["p2"], label: "Burning Bridges",
  });
  const burningNarration = derivePublicInteractionNarration(input([burningBridges]));
  assert.equal(burningNarration?.headline, "Test Player 3 played [Burning Bridges] targeting Test Player 2.");
  assert.deepEqual(playerIds(burningNarration?.headlineSegments), ["p3", "p2"]);
  const missingTarget = derivePublicInteractionNarration(input([{ ...burningBridges, affectedPlayerIds: ["unverified-target"] }]));
  assert.equal(missingTarget?.headline, "Test Player 3 played [Burning Bridges].");
  assert.deepEqual(playerIds(missingTarget?.headlineSegments), ["p3"], "unknown IDs never receive a manufactured player-name span");
  const duplicateNameNarration = derivePublicInteractionNarration({
    ...input([burningBridges]),
    players: players.map((player) => player.id === "p3" || player.id === "p2" ? { ...player, name: "Same Name" } : player),
  });
  assert.equal(duplicateNameNarration?.headline, "Same Name played [Burning Bridges] targeting Same Name.");
  assert.deepEqual(playerIds(duplicateNameNarration?.headlineSegments), ["p3", "p2"], "identical visible names retain their distinct authoritative IDs");
  const fanjianActivation = fact("fanjian-activation", 2, "SKILL_USED", {
    actorId: "p1", affectedPlayerIds: ["p2"], label: "Sowing Distrust", effect: { kind: "targeted_skill" },
  });
  const fanjianNarration = derivePublicInteractionNarration(input([root, fanjianActivation]));
  assert.equal(fanjianNarration?.headline, "Test Player 1 used Sowing Distrust on Test Player 2.");
  assert.deepEqual(playerIds(fanjianNarration?.headlineSegments), ["p1", "p2"]);
  // A Skip adds no skill fact, including when a later decision uses the same causal root.
  assert.equal(derivePublicInteractionNarration(input([root, damage]))?.eventId, "damage");
  const hidden = fact("hidden", 3, "SKILL_USED", { actorId: "p2", affectedPlayerIds: ["p1"], label: "Retaliation", outcomeLabel: "obtained one card", effect: { kind: "gain_target_card" } });
  assert.equal(derivePublicInteractionNarration(input([root, damage, hidden]))?.headline,
    "Test Player 2 used Retaliation and obtained one card from Test Player 1.");
  assert.deepEqual(playerIds(derivePublicInteractionNarration(input([root, damage, hidden]))?.headlineSegments), ["p2", "p1"]);
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
  const zoneTransition = fact("zone-transition", 5, "STAGE_COMPLETED", { actorId: "p2", effect: { kind: "public_zone_transition" } });
  const restAfterZoneTransition = { ...rest, retainedPublicEvent: zoneTransition, retainedPublicEventFacts: [damage, visible, zoneTransition] };
  assert.equal(derivePublicInteractionNarration({ ...input([]), snapshot: restAfterZoneTransition })?.eventId, "visible",
    "a proof-only zone transition must not replace the last truthful H4 narration");
  assert.equal(derivePublicInteractionNarration({ ...input([]), snapshot: rest, interactionId: "new-interaction" }), null);
  assert.equal(derivePublicInteractionNarration(input([root, hidden]))?.headline, "Test Player 2 used Retaliation and obtained one card from Test Player 1.");
  const generic = fact("generic", 4, "SKILL_USED", { actorId: "p2", label: "New ability", outcomeLabel: "resolved a public effect", effect: { kind: "generic_effect" } });
  assert.equal(derivePublicInteractionNarration(input([root, generic]))?.headline, "Test Player 2 used New ability and resolved a public effect.");
  const noDamageRest = { ...rest, retainedPublicEvent: generic, retainedPublicEventFacts: [generic] };
  assert.equal(derivePublicInteractionNarration({ ...input([]), snapshot: noDamageRest })?.eventId, "generic");
  const independent = { ...generic, eventId: "standalone", rootEventId: "standalone" };
  assert.equal(derivePublicInteractionNarration({ ...input([independent]), rootEventId: "standalone" })?.eventId, "standalone");
});

test("committed target-choice H4 styles only server-proven player identities", () => {
  const identity = { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 };
  const root = { semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: "root-event", order: 1,
    rootEventId: "root-event", category: "CARD_PLAYED", actorId: "p3", affectedPlayerIds: ["p2"], label: "Borrowed Sword" };
  const chooser = { id: "p3", name: "Zoë 王", seat: 2, alive: true };
  const target = { id: "p1", name: "O’Neil", seat: 0, alive: true };
  const holder = { id: "p2", name: "D'Souza", seat: 1, alive: true };
  const segments = [
    { kind: "text", text: "chose " },
    { kind: "player", playerId: target.id, text: target.name },
    { kind: "text", text: " as " },
    { kind: "player", playerId: holder.id, text: holder.name },
    { kind: "text", text: "'s Attack target" },
  ];
  const choice = { semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: "target-choice", order: 2,
    rootEventId: "root-event", category: "EFFECT_APPLIED", actorId: chooser.id, affectedPlayerIds: [target.id],
    outcomeLabel: `chose ${target.name} as ${holder.name}'s Attack target`, outcomeCopySegments: segments,
    effect: { kind: "target_choice" } };
  const narrate = (fact, roster = [chooser, target, holder]) => derivePublicInteractionNarration({
    snapshot: snapshot({ stage: "FORCED_ACTION", actorId: holder.id, publicEventFacts: [root, fact] }),
    players: roster, rootEventId: "root-event", interactionId: identity.interactionId, rootFrameId: identity.rootFrameId,
  });

  const result = narrate(choice);
  assert.equal(result?.headline, "Zoë 王 chose O’Neil as D'Souza's Attack target.");
  assert.deepEqual(playerIds(result?.headlineSegments), ["p3", "p1", "p2"]);
  assert.equal(result?.headlineSegments.map((part) => part.text).join(""), result?.headline);
  assert.equal(result?.accessibleLabel, result?.headline);

  const duplicateNames = [chooser, target, holder].map((player) => ({ ...player, name: "Shared Name" }));
  const duplicateChoice = { ...choice,
    outcomeLabel: "chose Shared Name as Shared Name's Attack target",
    outcomeCopySegments: segments.map((part) => part.kind === "player" ? { ...part, text: "Shared Name" } : part),
  };
  const duplicateResult = narrate(duplicateChoice, duplicateNames);
  assert.equal(duplicateResult?.headline, "Shared Name chose Shared Name as Shared Name's Attack target.");
  assert.deepEqual(playerIds(duplicateResult?.headlineSegments), ["p3", "p1", "p2"], "equal display names retain their distinct server identities");

  const changedRoster = [chooser, { ...target, name: "Changed Target" }, holder];
  const changedResult = narrate(choice, changedRoster);
  assert.equal(changedResult?.headline, "Zoë 王 chose O’Neil as D'Souza's Attack target.");
  assert.deepEqual(playerIds(changedResult?.headlineSegments), ["p3"], "a name mismatch falls back to plain committed outcome text");

  for (const { fact, roster } of [
    { fact: { ...choice, outcomeCopySegments: undefined }, roster: [chooser, target, holder] },
    { fact: { ...choice, outcomeCopySegments: segments.map((part) => part.kind === "player" && part.playerId === target.id
      ? { ...part, playerId: "p4" } : part) }, roster: [chooser, target, holder, { id: "p4", name: target.name, seat: 3, alive: true }] },
  ]) {
    const fallback = narrate(fact, roster);
    assert.equal(fallback?.headline, "Zoë 王 chose O’Neil as D'Souza's Attack target.");
    assert.deepEqual(playerIds(fallback?.headlineSegments), ["p3"], "missing or inconsistent identity proof never styles the referenced name");
    assert.equal(fallback?.accessibleLabel, fallback?.headline);
  }
});

test("H4 selects the exact active Judgement event, then its committed result", () => {
  const identity = { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 };
  const root = { semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: "overindulgence-play", order: 1,
    rootEventId: "overindulgence-play", category: "CARD_PLAYED", actorId: "p1", affectedPlayerIds: ["p2"],
    label: "Overindulgence", effect: { kind: "card_play", label: "Overindulgence" } };
  const reveal = { ...root, eventId: "judgement-reveal", order: 2, category: "EFFECT_APPLIED", actorId: "p2",
    outcomeLabel: "Da Qiao revealed A♠ Duel for Overindulgence.", effect: { kind: "judgement", label: "Overindulgence" } };
  const result = { ...reveal, eventId: "judgement-result", order: 3,
    outcomeLabel: "Da Qiao revealed 2♣ Attack. The result is not a Heart, so the Play Phase is skipped. Overindulgence ends." };
  const snapshotWithFacts = snapshot({ stage: "JUDGEMENT", actorId: null, stableKind: "REST", publicEventFacts: [root, reveal, result] });
  const input = { snapshot: snapshotWithFacts, players, rootEventId: root.eventId,
    interactionId: identity.interactionId, rootFrameId: identity.rootFrameId };
  assert.equal(derivePublicInteractionNarration({ ...input, eventId: reveal.eventId })?.headline,
    "Da Qiao revealed A♠ Duel for Overindulgence.");
  assert.equal(derivePublicInteractionNarration({ ...input, eventId: result.eventId })?.headline,
    "Da Qiao revealed 2♣ Attack. The result is not a Heart, so the Play Phase is skipped. Overindulgence ends.");
});

test("Equipment H4 uses the exact committed owner and card name for active and retained snapshots", () => {
  const identity = { interactionId: "interaction-1", rootFrameId: "root-1",
    checkpointId: "checkpoint-1", presentationRevision: 1 };
  const equip = {
    semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: "frost-equip-event", order: 7,
    rootEventId: "frost-equip-event", category: "CARD_EQUIPPED", actorId: "p1", affectedPlayerIds: ["p1"],
    label: "Frost Sword", effect: { kind: "equipment_play", label: "Frost Sword" },
  };
  const input = (state) => ({ snapshot: state, players, rootEventId: equip.rootEventId,
    interactionId: identity.interactionId, rootFrameId: identity.rootFrameId });
  const active = derivePublicInteractionNarration(input(snapshot({ stage: "SETTLEMENT", actorId: null,
    stableKind: "REST", publicEventFacts: [equip] })));
  assert.equal(active?.headline, "Test Player 1 equipped [Frost Sword].");
  assert.deepEqual(playerIds(active?.headlineSegments), ["p1"]);
  assert.equal(active?.eventId, equip.eventId);
  assert.equal(active?.readDurationMs, 4_000);

  const retainedSnapshot = { identity: null, interaction: null, stable: { kind: "REST" },
    retainedPublicEvent: equip, retainedPublicEventFacts: [equip], publicEventFacts: [] };
  const retained = derivePublicInteractionNarration(input(retainedSnapshot));
  assert.equal(retained?.headline, active?.headline);
  assert.equal(retained?.eventId, active?.eventId);
  assert.equal(retained?.readDurationMs, 4_000);
  assert.equal(derivePublicInteractionNarration({ ...input(retainedSnapshot), interactionId: "different-interaction" }), null);
});

test("committed own-hand equipment H4 names only the proven item and replacement", () => {
  const identity = { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 };
  const makeEquip = (name, { eventId = `equip-${name}`, rootEventId = eventId, order = 1, changes } = {}) => {
    const outcome = {
      semantics: "PROVEN", visibility: "PUBLIC", eventId, identity, order, rootEventId, frameId: identity.rootFrameId,
      category: "CARD_EQUIPPED", actorId: "p1", affectedPlayerIds: ["p1"], source: { kind: "card", label: name },
      changes: changes ?? [{ kind: "CARD_EQUIPPED", playerId: "p1", amount: 1, fromZone: "HAND", toZone: "EQUIPMENT" }],
    };
    const fact = {
      ...outcome, label: name, effect: { kind: "equipment_play", label: name }, committedOutcome: outcome,
    };
    return { outcome, fact };
  };

  for (const [slot, name] of [["weapon", "Frost Sword"], ["armor", "Eight Trigrams Formation"], ["mount", "Shadowrunner"]]) {
    const { outcome, fact } = makeEquip(name);
  assert.equal(formatCommittedPublicOutcome(outcome, players, [fact]), `Test Player 1 equipped [${name}].`,
      `${slot} copy uses the same category-based proof path`);
    const narration = derivePublicInteractionNarration({
      snapshot: snapshot({ stage: "SETTLEMENT", publicEventFacts: [fact] }), players,
      rootEventId: fact.rootEventId, interactionId: identity.interactionId, rootFrameId: identity.rootFrameId,
      eventId: fact.eventId,
    });
    assert.equal(narration?.headline, `Test Player 1 equipped [${name}].`);
    assert.equal(narration?.headlineSegments?.map((segment) => segment.text).join(""), narration?.headline);
    assert.deepEqual(playerIds(narration?.headlineSegments), ["p1"]);
  }

  const { outcome: replacing, fact: equipFact } = makeEquip("Blue Steel Sword", {
    eventId: "equip-replacement", order: 2,
    changes: [
      { kind: "CARD_DISCARDED", playerId: "p1", amount: 1, fromZone: "EQUIPMENT", toZone: "DISCARD" },
      { kind: "CARD_EQUIPPED", playerId: "p1", amount: 1, fromZone: "HAND", toZone: "EQUIPMENT" },
    ],
  });
  const oldEquipmentFact = {
    semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: "replacement-discard", order: 1,
    rootEventId: "equip-replacement", frameId: identity.rootFrameId, category: "CARD_DISCARDED", actorId: "p1",
    affectedPlayerIds: ["p1"], label: "Frost Sword", effect: { kind: "equipment_replaced", label: "Frost Sword" },
  };
  assert.equal(formatCommittedPublicOutcome(replacing, players, [oldEquipmentFact, equipFact]),
    "Test Player 1 equipped [Blue Steel Sword], replacing [Frost Sword].");
  assert.equal(formatCommittedPublicOutcome(replacing, players, [equipFact]),
    "Test Player 1 equipped [Blue Steel Sword], replacing 1 item.",
    "replacement count remains truthful when old public identity is unavailable");
  assert.equal(formatCommittedPublicOutcome(replacing, players, [
    { ...oldEquipmentFact, rootEventId: "unrelated-root" }, equipFact,
  ]), "Test Player 1 equipped [Blue Steel Sword], replacing 1 item.",
  "an unrelated discard cannot supply the old Equipment name");
  assert.equal(formatCommittedPublicOutcome(replacing, players, [
    { ...oldEquipmentFact, actorId: "p2", affectedPlayerIds: ["p2"] }, equipFact,
  ]), "Test Player 1 equipped [Blue Steel Sword], replacing 1 item.",
  "a different player's discarded Equipment cannot supply the old name");

  const { outcome: ordinary, fact: ordinaryFact } = makeEquip("Eight Trigrams Formation");
  assert.equal(formatCommittedPublicOutcome(ordinary, players, [
    { ...ordinaryFact, label: "Unrelated source", effect: { kind: "equipment_play", label: "Unrelated source" } },
  ]), "Test Player 1 [Eight Trigrams Formation]: Test Player 1 equipped 1 item.",
  "source label mismatch retains the truthful generic fallback");
  const mismatchedOwner = {
    ...ordinary,
    changes: [{ kind: "CARD_EQUIPPED", playerId: "p2", amount: 1, fromZone: "HAND", toZone: "EQUIPMENT" }],
  };
  assert.equal(formatCommittedPublicOutcome(mismatchedOwner, players, [ordinaryFact]),
    "Test Player 1 [Eight Trigrams Formation]: Test Player 2 equipped 1 item.",
    "actor and equipment owner must agree before using concise copy");
});

test("Entourage PAC follows only the current public helper checkpoint and H4 reports committed invocation", () => {
  const current = snapshot({ stage: "ATTACK_RESPONSE", actorId: "p3", effect: "Attack" });
  const identity = { ...current.identity, rootFrameId: "root-1" };
  current.entourageDecision = { semantics: "PROVEN", providerId: "cao_cao_hujia", invocationEventId: "invoke", requesterId: "p2", requesterHeroId: "cao-cao", requesterRole: "Lord", rootEventId: "attack", rootCardId: "card", rootResolutionId: "res", sourceId: "p1", interactionId: "interaction-1", rootFrameId: "root-1", committedIdentity: identity, helperActorId: "p3", helperHeroId: "simayi", stage: "ATTACK_RESPONSE", identity };
  current.publicNextDecision.stageLabel = "Entourage";
  current.publicNextDecision.actionLabels = ["Dodge", "Decline"];
  const input = { status: "playing", phase: "response", turnSeat: 0, players, presentationSnapshot: current };
  assert.equal(derivePublicActivityStatus(input).text, "Waiting for Test Player 3 to provide Dodge for Test Player 2.");
  for (const key of ["requesterId", "helperActorId", "rootFrameId"]) {
    const changed = structuredClone(current); changed.entourageDecision[key] = "wrong";
    assert.notEqual(derivePublicActivityStatus({ ...input, presentationSnapshot: changed }).text, "Waiting for Test Player 3 to provide Dodge for Test Player 2.");
  }
  const stale = structuredClone(current); stale.entourageDecision.identity.presentationRevision++;
  assert.notEqual(derivePublicActivityStatus({ ...input, presentationSnapshot: stale }).text, "Waiting for Test Player 3 to provide Dodge for Test Player 2.");
  current.publicEventFacts = [{ semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: "invoke", order: 2, frameId: "root-1", rootEventId: "attack", category: "SKILL_USED", actorId: "p2", affectedPlayerIds: ["p2"], label: "Entourage", effect: { kind: "entourage_invocation" } }];
  const narration = () => derivePublicInteractionNarration({ snapshot: current, players, rootEventId: "attack", interactionId: "interaction-1", rootFrameId: "root-1" });
  assert.equal(narration().headline, "Test Player 2 (Cao Cao) used Entourage.");
  current.publicEventFacts.push({ ...current.publicEventFacts[0], eventId: "decline", order: 3, category: "ACTION_DECLINED", actorId: "p3", effect: { kind: "entourage_declined" } });
  assert.equal(narration().headline, "Test Player 3 declined Entourage for Test Player 2.");
  current.publicEventFacts.push({ ...current.publicEventFacts[0], eventId: "dodge", order: 4, category: "EFFECT_APPLIED", actorId: "p4", effect: { kind: "entourage_dodge" }, outcomeLabel: "played Dodge for Test Player 2 using Entourage" });
  assert.equal(narration().headline, "Test Player 4 played Dodge for Test Player 2 using Entourage.");
});


test("proven Attack/AOE requirements clear after the response and fail closed across viewers", () => {
  for (const [stage, effect, required] of [["ATTACK_RESPONSE", "Attack", "Dodge"], ["GROUP_RESOLUTION", "BarbarianInvasion", "Attack"]]) {
    const current = snapshot({ stage, actorId: "p2", effect, actionLabels: [required, "take damage"] });
    const input = room({ phase: "response", presentationSnapshot: current });
    assert.equal(derivePublicActivityStatus(input).text, `Waiting for Test Player 2 to play ${required} or take damage.`);
    for (const viewer of players) {
      assert.deepEqual(derivePublicActivityStatus({ ...input, viewerId: viewer.id }), derivePublicActivityStatus(input));
    }
    const closed = { ...current, publicNextDecision: null };
    assert.deepEqual(derivePublicActivityStatus({ ...input, presentationSnapshot: closed }), { kind: "none", text: "" });
    const stale = { ...current, publicNextDecision: { ...current.publicNextDecision, identity: { ...current.publicNextDecision.identity, checkpointId: "old" } } };
    assert.deepEqual(derivePublicActivityStatus({ ...input, presentationSnapshot: stale }), { kind: "none", text: "" });
  }
});

test("a closed Negation window cannot announce another counter opportunity", () => {
  const current = harvestSnapshot({ responseWindowOpen: false });
  const result = derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: current }));
  assert.equal(result.kind, "none");
});

test("committed public outcome copy reports actual mixed HP and card deltas generically", () => {
  const outcome = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: "event-1", identity: {
      interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1,
    }, order: 3, rootEventId: "root-event", frameId: "root-1", category: "SKILL_USED",
    actorId: "p1", affectedPlayerIds: ["p1", "p2"], source: { kind: "skill", label: "Self Sacrifice" }, changes: [
      { kind: "HP_COST_LOST", playerId: "p1", amount: 1 },
      { kind: "CARD_DRAWN", playerId: "p1", amount: 2, fromZone: "DECK", toZone: "HAND" },
      { kind: "CARD_TRANSFERRED", fromPlayerId: "p1", toPlayerId: "p2", amount: 1, fromZone: "HAND", toZone: "HAND" },
    ],
  };
  assert.equal(formatCommittedPublicOutcome(outcome, players),
    "Test Player 1 Self Sacrifice: Test Player 1 paid 1 HP as a cost; Test Player 1 drew 2 cards; Test Player 2 received 1 card from Test Player 1.");
  assert.equal(formatCommittedPublicOutcome({ ...outcome, source: { kind: "skill", label: "Axe of Insanity" }, changes: [
    { kind: "HP_LOST_TO_EFFECT", playerId: "p1", amount: 1 },
  ] }, players),
  "Test Player 1 Axe of Insanity: Test Player 1 lost 1 HP to an effect.",
  "non-damage HP loss stays distinct from HP costs and damage");
  assert.equal(formatCommittedPublicOutcome({ ...outcome, source: { kind: "skill", label: "Equilibrium" }, changes: [
    { kind: "CARD_DISCARDED", playerId: "p1", amount: 1, fromZone: "HAND", toZone: "DISCARD" },
    { kind: "CARD_DISCARDED", playerId: "p1", amount: 1, fromZone: "EQUIPMENT", toZone: "DISCARD" },
    { kind: "CARD_DRAWN", playerId: "p1", amount: 2, fromZone: "DECK", toZone: "HAND" },
  ] }, players),
  "Test Player 1 Equilibrium: Test Player 1 discarded 2 cards; Test Player 1 drew 2 cards.",
  "one public count can combine matching changes while the proof retains their distinct source zones");
  assert.equal(formatCommittedPublicOutcome({ ...outcome, changes: [{ ...outcome.changes[1], playerId: "unknown-player" }] }, players), null,
    "copy fails closed when a public participant name cannot be verified");
});

test("an empty same-resolution completion cannot erase a proven Stauchness result, while a newer resolution wins", () => {
  const identity = { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 };
  const root = {
    semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: "stauchness-root", order: 1,
    rootEventId: "stauchness-root", frameId: "root-1", category: "CARD_PLAYED", actorId: "p1",
    affectedPlayerIds: ["p2"], label: "Attack",
  };
  const result = {
    semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: "stauchness-result", resolutionId: "resolution-1", order: 2,
    rootEventId: "stauchness-root", frameId: "root-1", category: "EFFECT_APPLIED", actorId: "p2",
    affectedPlayerIds: ["p1", "p2"], label: "Stauchness", effect: { kind: "skill_result", label: "Stauchness" },
    committedOutcome: {
      semantics: "PROVEN", visibility: "PUBLIC", eventId: "stauchness-result", identity, resolutionId: "resolution-1", order: 2,
      rootEventId: "stauchness-root", frameId: "root-1", category: "EFFECT_APPLIED", actorId: "p2", affectedPlayerIds: ["p1", "p2"],
      source: { kind: "skill", label: "Stauchness" },
      changes: [{ kind: "CARD_DISCARDED", playerId: "p1", amount: 2, fromZone: "HAND", toZone: "DISCARD" }],
    },
  };
  const emptyCompletion = {
    ...result, eventId: "stauchness-empty-completion", order: 3,
    committedOutcome: undefined, outcomeLabel: undefined, effect: { kind: "generic_completion" },
  };
  const input = {
    players, rootEventId: "stauchness-root", interactionId: identity.interactionId, rootFrameId: identity.rootFrameId,
  };
  const sameResolution = derivePublicInteractionNarration({
    ...input,
    snapshot: snapshot({ stage: "SETTLEMENT", publicEventFacts: [root, result, emptyCompletion] }),
    eventId: emptyCompletion.eventId,
  });
  assert.equal(sameResolution?.eventId, result.eventId);
  assert.equal(sameResolution?.headline, "Test Player 2 used Stauchness, causing Test Player 1 to discard 2 Hand cards.");

  const damageResult = {
    ...result, eventId: "stauchness-damage", resolutionId: "resolution-damage", order: 2,
    category: "DAMAGE_APPLIED", actorId: "p2", affectedPlayerIds: ["p1"], amount: 1,
    committedOutcome: {
      ...result.committedOutcome,
      eventId: "stauchness-damage", resolutionId: "resolution-damage", order: 2,
      category: "DAMAGE_APPLIED", actorId: "p2", affectedPlayerIds: ["p1"],
      source: { kind: "damage", label: "Stauchness" },
      changes: [{ kind: "DAMAGE_APPLIED", playerId: "p1", amount: 1 }],
    },
  };
  const damageNarration = derivePublicInteractionNarration({
    ...input,
    snapshot: snapshot({ stage: "SETTLEMENT", publicEventFacts: [root, damageResult] }),
    eventId: damageResult.eventId,
  });
  assert.equal(damageNarration?.headline, "Test Player 2 used Stauchness, causing Test Player 1 to lose 1 HP.");

  const prevented = {
    ...result, eventId: "stauchness-prevented", resolutionId: "resolution-prevented", order: 2,
    category: "DAMAGE_PREVENTED", amount: 0, affectedPlayerIds: ["p1"], committedOutcome: undefined,
    effect: { kind: "damage_prevented", label: "Stauchness" },
  };
  const preventedNarration = derivePublicInteractionNarration({
    ...input,
    snapshot: snapshot({ stage: "SETTLEMENT", publicEventFacts: [root, prevented] }),
    eventId: prevented.eventId,
  });
  assert.equal(preventedNarration?.headline, "Test Player 2 used Stauchness, but damage to Test Player 1 was prevented.");
  assert.doesNotMatch(preventedNarration?.headline ?? "", /1 damage/,
    "a prevented result never claims the intended one damage was applied");

  const independent = {
    ...emptyCompletion, eventId: "new-independent-completion", resolutionId: "resolution-2", order: 4,
    outcomeLabel: "completed a separate effect", label: "Separate effect",
  };
  const newerResolution = derivePublicInteractionNarration({
    ...input,
    snapshot: snapshot({ stage: "SETTLEMENT", publicEventFacts: [root, result, emptyCompletion, independent] }),
    eventId: independent.eventId,
  });
  assert.equal(newerResolution?.eventId, independent.eventId);
  assert.equal(newerResolution?.headline, "Test Player 2 completed a separate effect.");
});

test("committed H4 uses natural damage copy and preserves verified source punctuation across other public deltas", () => {
  const identity = { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 };
  const cases = [
    ["HP_COST_LOST", { kind: "HP_COST_LOST", playerId: "p1", amount: 1 }, "Test Player 1 paid 1 HP as a cost.", ["p1", "p1"]],
    ["HP_LOST_TO_EFFECT", { kind: "HP_LOST_TO_EFFECT", playerId: "p1", amount: 1 }, "Test Player 1 lost 1 HP to an effect.", ["p1", "p1"]],
    ["DAMAGE_APPLIED", { kind: "DAMAGE_APPLIED", playerId: "p2", amount: 1 }, "Test Player 1 dealt 1 damage to Test Player 2.", ["p1", "p2"]],
    ["HP_RECOVERED", { kind: "HP_RECOVERED", playerId: "p1", amount: 1 }, "Test Player 1 recovered 1 HP.", ["p1", "p1"]],
    ["CARD_DRAWN", { kind: "CARD_DRAWN", playerId: "p1", amount: 1 }, "Test Player 1 drew 1 card.", ["p1", "p1"]],
    ["CARD_DISCARDED", { kind: "CARD_DISCARDED", playerId: "p1", amount: 1 }, "Test Player 1 discarded 1 card.", ["p1", "p1"]],
    ["CARD_GAINED", { kind: "CARD_GAINED", playerId: "p1", amount: 1 }, "Test Player 1 gained 1 card.", ["p1", "p1"]],
    ["CARD_EQUIPPED", { kind: "CARD_EQUIPPED", playerId: "p1", amount: 1 }, "Test Player 1 equipped 1 item.", ["p1", "p1"]],
    ["CARD_UNEQUIPPED", { kind: "CARD_UNEQUIPPED", playerId: "p1", amount: 1 }, "Test Player 1 unequipped 1 item.", ["p1", "p1"]],
    ["CARD_TRANSFERRED", { kind: "CARD_TRANSFERRED", fromPlayerId: "p1", toPlayerId: "p2", amount: 1 }, "Test Player 2 received 1 card from Test Player 1.", ["p1", "p2", "p1"]],
  ];

  for (const [kind, change, detail, expectedPlayerIds] of cases) {
    const eventId = `committed-${kind}`;
    const committedOutcome = {
      semantics: "PROVEN", visibility: "PUBLIC", eventId, identity, order: 1,
      rootEventId: "root-event", frameId: "root-1", category: "EFFECT_APPLIED", actorId: "p1",
      affectedPlayerIds: ["p1", "p2"], source: { kind: "skill", label: "Verified Source" }, changes: [change],
    };
    const fact = {
      semantics: "PROVEN", visibility: "PUBLIC", identity, eventId, order: 1,
      rootEventId: "root-event", frameId: "root-1", category: "EFFECT_APPLIED", actorId: "p1",
      affectedPlayerIds: ["p1", "p2"], committedOutcome,
    };
    const narration = derivePublicInteractionNarration({
      snapshot: snapshot({ stage: "SETTLEMENT", publicEventFacts: [fact] }),
      players, rootEventId: "root-event", interactionId: identity.interactionId, rootFrameId: identity.rootFrameId,
    });
    const expected = kind === "DAMAGE_APPLIED" ? detail : `Test Player 1 Verified Source: ${detail}`;
    assert.equal(narration?.headline, expected, `${kind} uses the common H4 source separator`);
    assert.equal(narration?.headlineSegments?.map((segment) => segment.text).join(""), expected,
      `${kind} typed fragments exactly reconstruct the rendered H4`);
    assert.deepEqual(playerIds(narration?.headlineSegments), expectedPlayerIds, `${kind} retains verified player IDs`);
  }

  const base = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: "source-fallback", identity, order: 1,
    rootEventId: "root-event", frameId: "root-1", category: "EFFECT_APPLIED",
    source: { kind: "skill", label: "Kirin Bow — source detail" },
    changes: [{ kind: "CARD_EQUIPPED", playerId: "p1", amount: 1 }],
  };
  assert.equal(formatCommittedPublicOutcome({ ...base, actorId: "p1" }, players),
    "Test Player 1 Kirin Bow — source detail: Test Player 1 equipped 1 item.");
  assert.equal(formatCommittedPublicOutcome({ ...base, actorId: "p1", source: { kind: "skill" } }, players),
    "Test Player 1 equipped 1 item.");
  assert.equal(formatCommittedPublicOutcome({ ...base, actorId: undefined }, players),
    "Kirin Bow — source detail: Test Player 1 equipped 1 item.");
  assert.equal(formatCommittedPublicOutcome({ ...base, actorId: undefined, source: { kind: "skill" } }, players),
    "Test Player 1 equipped 1 item.");

  const punctuatedPlayers = [{ ...players[0], name: "A—B" }, ...players.slice(1)];
  const punctuatedOutcome = {
    ...base, eventId: "punctuated-name", rootEventId: "punctuated-name", actorId: "p1",
    source: { kind: "equipment", label: "Kirin Bow — source detail" },
  };
  const punctuatedFact = { ...punctuatedOutcome, affectedPlayerIds: ["p1"], committedOutcome: punctuatedOutcome };
  const punctuated = derivePublicInteractionNarration({
    snapshot: snapshot({ stage: "SETTLEMENT", publicEventFacts: [punctuatedFact] }),
    players: punctuatedPlayers, rootEventId: punctuatedOutcome.rootEventId,
    interactionId: identity.interactionId, rootFrameId: identity.rootFrameId,
  });
  assert.equal(punctuated?.headline, "A—B an effect: A—B equipped 1 item.");
  assert.equal(punctuated?.headlineSegments?.map((segment) => segment.text).join(""), punctuated?.headline);
  assert.deepEqual(playerIds(punctuated?.headlineSegments), ["p1", "p1"]);
  assert.equal(formatCommittedPublicOutcome({ ...base, semantics: "UNPROVEN" }, players), null);
  assert.equal(formatCommittedPublicOutcome({ ...base, visibility: "PRIVATE" }, players), null);
});

test("committed H4 names proven actions and reports only actual public outcomes", () => {
  const identity = { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 };
  const root = {
    semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: "root-event", order: 1,
    rootEventId: "root-event", frameId: "root-1", category: "CARD_PLAYED", actorId: "p1",
    affectedPlayerIds: ["p2"], label: "Attack", effect: { kind: "card_play", label: "Attack" },
  };
  const narrationFor = (eventId, source, changes, options = {}) => {
    const actorId = Object.prototype.hasOwnProperty.call(options, "actorId") ? options.actorId : "p1";
    const affectedPlayerIds = options.affectedPlayerIds ?? ["p2"];
    const category = options.category ?? "EFFECT_APPLIED";
    const label = options.label ?? source.label;
    const committedOutcome = {
      semantics: "PROVEN", visibility: "PUBLIC", eventId, identity, order: 2,
      rootEventId: "root-event", frameId: "root-1", category, actorId, affectedPlayerIds, source, changes,
    };
    const fact = { ...committedOutcome, label, committedOutcome };
    return derivePublicInteractionNarration({
      snapshot: snapshot({ stage: "SETTLEMENT", stableKind: "REST", actorId: null, publicEventFacts: [root, fact] }),
      players, rootEventId: "root-event", interactionId: identity.interactionId,
      rootFrameId: identity.rootFrameId, eventId,
    });
  };

  const attack = narrationFor("attack-damage", { kind: "damage", label: "Attack" }, [
    { kind: "DAMAGE_APPLIED", playerId: "p2", amount: 1 },
  ], { category: "DAMAGE_APPLIED" });
  assert.equal(attack?.headline, "Test Player 1 dealt 1 damage to Test Player 2 with [Attack].");
  assert.deepEqual(playerIds(attack?.headlineSegments), ["p1", "p2"]);

  const multipleDamage = narrationFor("multiple-damage", { kind: "damage", label: "Raining Arrows" }, [
    { kind: "DAMAGE_APPLIED", playerId: "p2", amount: 1 },
    { kind: "DAMAGE_APPLIED", playerId: "p3", amount: 2 },
  ], { affectedPlayerIds: ["p2", "p3"], category: "DAMAGE_APPLIED" });
  assert.equal(multipleDamage?.headline, "Test Player 1 dealt 1 damage to Test Player 2 and 2 damage to Test Player 3.");
  assert.deepEqual(playerIds(multipleDamage?.headlineSegments), ["p1", "p2", "p3"]);

  const duel = narrationFor("duel-damage", { kind: "damage", label: "Duel damage" }, [
    { kind: "DAMAGE_APPLIED", playerId: "p1", amount: 1 },
  ], { actorId: "p2", affectedPlayerIds: ["p1"], category: "DAMAGE_APPLIED" });
  assert.equal(duel?.headline, "Test Player 2 dealt 1 damage to Test Player 1.",
    "a Duel name is omitted when neither a typed source kind nor a matching root proves it");

  const typedDuel = narrationFor("typed-duel-damage", { kind: "damage", label: "Duel damage", cardKind: "Duel" }, [
    { kind: "DAMAGE_APPLIED", playerId: "p1", amount: 1 },
  ], { actorId: "p2", affectedPlayerIds: ["p1"], category: "DAMAGE_APPLIED" });
  assert.equal(typedDuel?.headline, "Test Player 2 dealt 1 damage to Test Player 1 with [Duel].",
    "a server-proven logical Duel damage source is named without requiring a physical Duel card");

  const lightning = narrationFor("lightning-damage", { kind: "damage", label: "Lightning" }, [
    { kind: "DAMAGE_APPLIED", playerId: "p2", amount: 3 },
  ], { actorId: undefined, affectedPlayerIds: ["p2"], category: "DAMAGE_APPLIED" });
  assert.equal(lightning?.headline, "Test Player 2 took 3 damage.",
    "environmental damage names its source without inventing a dealer");

  const skillDamage = narrationFor("sowing-distrust-damage", { kind: "damage", label: "Sowing Distrust" }, [
    { kind: "DAMAGE_APPLIED", playerId: "p2", amount: 1 },
  ], { category: "DAMAGE_APPLIED" });
  assert.equal(skillDamage?.headline, "Test Player 1 dealt 1 damage to Test Player 2.");

  const unknownSourceDamage = narrationFor("unknown-source-damage", { kind: "damage", label: "Damage" }, [
    { kind: "DAMAGE_APPLIED", playerId: "p2", amount: 1 },
  ], { actorId: undefined, affectedPlayerIds: ["p2"], category: "DAMAGE_APPLIED" });
  assert.equal(unknownSourceDamage?.headline, "Test Player 2 took 1 damage.");
  assert.deepEqual(playerIds(unknownSourceDamage?.headlineSegments), ["p2"]);

  const unprojectedActorDamage = narrationFor("unprojected-actor-damage", { kind: "damage", label: "Attack" }, [
    { kind: "DAMAGE_APPLIED", playerId: "p2", amount: 1 },
  ], { actorId: "unprojected-actor", affectedPlayerIds: ["p2"], category: "DAMAGE_APPLIED" });
  assert.equal(unprojectedActorDamage?.headline, "Test Player 2 took 1 damage.",
    "an unknown source projection does not suppress a proven public target result");
  assert.deepEqual(playerIds(unprojectedActorDamage?.headlineSegments), ["p2"]);

  const mixedDamage = narrationFor("mixed-damage", { kind: "damage", label: "Damage" }, [
    { kind: "DAMAGE_APPLIED", playerId: "p2", amount: 1 },
    { kind: "CARD_DRAWN", playerId: "p1", amount: 1 },
  ], { affectedPlayerIds: ["p2", "p1"] });
  assert.equal(mixedDamage?.headline,
    "Test Player 1 dealt 1 damage to Test Player 2; Test Player 1 drew 1 card.",
    "mixed results describe damage naturally and do not present generic Damage as an action");
  assert.deepEqual(playerIds(mixedDamage?.headlineSegments), ["p1", "p2", "p1"]);
  assert.doesNotMatch(mixedDamage?.headline ?? "", /Damage:|to damage/);

  const mixedSourcedDamage = narrationFor("mixed-sourced-damage", { kind: "skill", label: "Verified Skill" }, [
    { kind: "DAMAGE_APPLIED", playerId: "p2", amount: 1 },
    { kind: "CARD_DRAWN", playerId: "p1", amount: 1 },
  ], { affectedPlayerIds: ["p2", "p1"] });
  assert.equal(mixedSourcedDamage?.headline,
    "Test Player 1 Verified Skill: dealt 1 damage to Test Player 2; Test Player 1 drew 1 card.",
    "a separately proven skill source stays visible alongside the natural damage result");

  const mixedDamageWithoutActor = narrationFor("mixed-damage-without-actor", { kind: "damage", label: "Damage" }, [
    { kind: "DAMAGE_APPLIED", playerId: "p2", amount: 1 },
    { kind: "HP_RECOVERED", playerId: "p3", amount: 1 },
  ], { actorId: undefined, affectedPlayerIds: ["p2", "p3"] });
  assert.equal(mixedDamageWithoutActor?.headline,
    "Test Player 2 took 1 damage; Test Player 3 recovered 1 HP.",
    "a mixed public result remains truthful when its source actor is not proven");
  assert.deepEqual(playerIds(mixedDamageWithoutActor?.headlineSegments), ["p2", "p3"]);

  const hpCost = narrationFor("hp-cost", { kind: "skill", label: "Self Sacrifice" }, [
    { kind: "HP_COST_LOST", playerId: "p1", amount: 1 },
  ], { affectedPlayerIds: ["p1"] });
  assert.equal(hpCost?.headline, "Test Player 1 Self Sacrifice: Test Player 1 paid 1 HP as a cost.");
  assert.doesNotMatch(hpCost?.headline ?? "", /dealt .* damage/);

  const unattributedHpLoss = narrationFor("unattributed-hp-loss", { kind: "other" }, [
    { kind: "HP_LOST_TO_EFFECT", playerId: "p2", amount: 1 },
  ], { actorId: undefined, affectedPlayerIds: ["p2"] });
  assert.equal(unattributedHpLoss?.headline, "Test Player 2 lost 1 HP.");
  assert.deepEqual(playerIds(unattributedHpLoss?.headlineSegments), ["p2"]);

  const oath = narrationFor("oath-recovery", { kind: "card", label: "Oath of the Peach Garden" }, [
    { kind: "HP_RECOVERED", playerId: "p2", amount: 1 },
  ], { affectedPlayerIds: ["p2"], label: "Oath of the Peach Garden" });
  assert.equal(oath?.headline, "Test Player 1 played [Oath of the Peach Garden]. Test Player 2 recovered 1 HP.");
  assert.deepEqual(playerIds(oath?.headlineSegments), ["p1", "p2"]);

  const oathMany = narrationFor("oath-multiple-recovery", { kind: "card", label: "Oath of the Peach Garden" }, [
    { kind: "HP_RECOVERED", playerId: "p1", amount: 1 },
    { kind: "HP_RECOVERED", playerId: "p2", amount: 1 },
    { kind: "HP_RECOVERED", playerId: "p3", amount: 1 },
  ], { affectedPlayerIds: ["p1", "p2", "p3"], label: "Oath of the Peach Garden" });
  assert.equal(oathMany?.headline, "Test Player 1 played [Oath of the Peach Garden]. Test Player 1, Test Player 2 and Test Player 3 each recovered 1 HP.");
  assert.deepEqual(playerIds(oathMany?.headlineSegments), ["p1", "p1", "p2", "p3"]);

  const frostSword = narrationFor("frost-sword-discard", { kind: "equipment", label: "Frost Sword" }, [
    { kind: "CARD_DISCARDED", playerId: "p2", amount: 1, fromZone: "HAND", toZone: "DISCARD" },
    { kind: "CARD_DISCARDED", playerId: "p2", amount: 1, fromZone: "EQUIPMENT", toZone: "DISCARD" },
  ], { affectedPlayerIds: ["p2"], label: "Frost Sword" });
  assert.equal(frostSword?.headline, "Test Player 1 used [Frost Sword] to discard 2 cards from Test Player 2.");
  assert.deepEqual(playerIds(frostSword?.headlineSegments), ["p1", "p2"]);

  const unprovenFrostActor = narrationFor("frost-sword-unknown-actor", { kind: "equipment", label: "Frost Sword" }, [
    { kind: "CARD_DISCARDED", playerId: "p2", amount: 2, fromZone: "HAND", toZone: "DISCARD" },
  ], { actorId: undefined, affectedPlayerIds: ["p2"] });
  assert.equal(unprovenFrostActor?.headline, "2 cards were discarded from Test Player 2.");
  assert.deepEqual(playerIds(unprovenFrostActor?.headlineSegments), ["p2"]);

  const plainRecovery = narrationFor("unattributed-recovery", { kind: "recovery", label: "Recovery" }, [
    { kind: "HP_RECOVERED", playerId: "p2", amount: 1 },
  ], { actorId: undefined, affectedPlayerIds: ["p2"] });
  assert.equal(plainRecovery?.headline, "Test Player 2 recovered 1 HP.");
  assert.deepEqual(playerIds(plainRecovery?.headlineSegments), ["p2"]);

  const preventedFact = {
    ...root, eventId: "damage-prevented", order: 2, category: "DAMAGE_PREVENTED", amount: 0,
    label: "Frost Sword", effect: { kind: "damage_prevented", label: "Frost Sword" },
  };
  const prevented = derivePublicInteractionNarration({
    snapshot: snapshot({ stage: "SETTLEMENT", stableKind: "REST", actorId: null, publicEventFacts: [root, preventedFact] }),
    players, rootEventId: "root-event", interactionId: identity.interactionId,
    rootFrameId: identity.rootFrameId, eventId: preventedFact.eventId,
  });
  assert.equal(prevented?.headline, "Test Player 1 prevented damage to Test Player 2.");
  assert.doesNotMatch(prevented?.headline ?? "", /dealt .* damage/);
});

test("an empty same-resolution completion keeps the latest specific committed outcome", () => {
  const identity = { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 };
  const root = { semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: "root-event", order: 1,
    rootEventId: "root-event", frameId: "root-1", category: "CARD_PLAYED", actorId: "p1", affectedPlayerIds: ["p2"] };
  const outcome = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: "damage-result", identity, order: 2,
    rootEventId: "root-event", frameId: "root-1", resolutionId: "resolution-1", category: "DAMAGE_APPLIED",
    actorId: "p1", affectedPlayerIds: ["p2"], source: { kind: "damage", label: "Damage" },
    changes: [{ kind: "DAMAGE_APPLIED", playerId: "p2", amount: 1 }],
  };
  const result = { ...outcome, committedOutcome: outcome };
  const completion = { ...root, eventId: "empty-completion", order: 3, resolutionId: "resolution-1",
    category: "EFFECT_APPLIED", committedOutcome: undefined, outcomeLabel: undefined };
  const narration = derivePublicInteractionNarration({
    snapshot: snapshot({ stage: "SETTLEMENT", stableKind: "REST", actorId: null, publicEventFacts: [root, result, completion] }),
    players, rootEventId: "root-event", interactionId: identity.interactionId, rootFrameId: identity.rootFrameId,
    eventId: completion.eventId,
  });
  assert.equal(narration?.eventId, result.eventId);
  assert.equal(narration?.headline, "Test Player 1 dealt 1 damage to Test Player 2.");
});

test("committed HP, draw, discard, recovery and transfer results own the shared H4 in active and retained views", () => {
  const semanticIdentity = { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 };
  const root = {
    semantics: "PROVEN", visibility: "PUBLIC", identity: semanticIdentity,
    eventId: "root-event", order: 1, rootEventId: "root-event", category: "CARD_PLAYED",
    actorId: "p1", affectedPlayerIds: ["p2"], label: "Sowing Distrust", effect: { kind: "card_play", label: "Sowing Distrust" },
  };
  const outcome = {
    semantics: "PROVEN", visibility: "PUBLIC", identity: semanticIdentity,
    eventId: "result-event", order: 2, rootEventId: "root-event", frameId: "root-1", category: "CARD_DISCARDED",
    actorId: "p2", affectedPlayerIds: ["p1", "p2"], label: "Sowing Distrust", effect: { kind: "skill_result" },
    committedOutcome: {
      semantics: "PROVEN", visibility: "PUBLIC", eventId: "result-event", identity: semanticIdentity, order: 2,
      rootEventId: "root-event", frameId: "root-1", category: "CARD_DISCARDED", actorId: "p2", affectedPlayerIds: ["p1", "p2"],
      source: { kind: "skill", label: "Sowing Distrust" },
      changes: [
        { kind: "CARD_DISCARDED", playerId: "p1", amount: 1, fromZone: "HAND", toZone: "DISCARD" },
        { kind: "DAMAGE_APPLIED", playerId: "p2", amount: 1 },
        { kind: "CARD_DRAWN", playerId: "p2", amount: 2, fromZone: "DECK", toZone: "HAND" },
        { kind: "HP_RECOVERED", playerId: "p2", amount: 1 },
        { kind: "CARD_TRANSFERRED", fromPlayerId: "p1", toPlayerId: "p2", amount: 1, fromZone: "HAND", toZone: "HAND" },
      ],
    },
  };
  const expected = "Test Player 2 Sowing Distrust: Test Player 1 discarded 1 card; Test Player 2 took 1 damage; Test Player 2 drew 2 cards; Test Player 2 recovered 1 HP; Test Player 2 received 1 card from Test Player 1.";
  const input = { players, rootEventId: root.eventId, interactionId: semanticIdentity.interactionId, rootFrameId: semanticIdentity.rootFrameId };
  const active = derivePublicInteractionNarration({ ...input,
    snapshot: snapshot({ stage: "SETTLEMENT", actorId: null, publicEventFacts: [root, outcome] }),
  });
  assert.equal(active?.eventId, outcome.eventId);
  assert.equal(active?.headline, expected);
  assert.equal(active?.compactHeadline, expected);
  assert.deepEqual(playerIds(active?.headlineSegments), ["p2", "p1", "p2", "p2", "p2", "p2", "p1"]);

  const canonicalCopy = {
    eventId: outcome.eventId,
    headline: "Test Player 2 caused Test Player 1 to discard [8♠ Attack], then the committed outcomes were retained.",
    segments: [
      { kind: "player", playerId: "p2", text: "Test Player 2" },
      { kind: "text", text: " caused " },
      { kind: "player", playerId: "p1", text: "Test Player 1" },
      { kind: "text", text: " to discard [8♠ Attack], then the committed outcomes were retained." },
    ],
  };
  const canonicalActive = derivePublicInteractionNarration({
    ...input,
    snapshot: snapshot({ stage: "SETTLEMENT", actorId: null, publicEventFacts: [root, outcome] }),
    canonicalDiscardCopy: canonicalCopy,
  });
  assert.equal(canonicalActive?.headline, canonicalCopy.headline,
    "a verified same-event discard copy replaces the competing generic count-only committed-result sentence");
  assert.deepEqual(playerIds(canonicalActive?.headlineSegments), ["p2", "p1"],
    "canonical player spans remain typed for the shared H4");
  const staleCanonical = derivePublicInteractionNarration({
    ...input,
    snapshot: snapshot({ stage: "SETTLEMENT", actorId: null, publicEventFacts: [root, outcome] }),
    canonicalDiscardCopy: { ...canonicalCopy, eventId: "stale-event" },
  });
  assert.equal(staleCanonical?.headline, expected,
    "a copy for another event cannot replace the committed outcome");

  const retained = derivePublicInteractionNarration({ ...input, snapshot: {
    identity: null, interaction: null, stable: { kind: "REST" }, publicEventFacts: [],
    retainedPublicEvent: outcome, retainedPublicEventFacts: [root, outcome],
  } });
  assert.equal(retained?.eventId, outcome.eventId);
  assert.equal(retained?.headline, expected);
  assert.doesNotMatch(retained?.headline ?? "", /private-card-id|suit|rank/i);
});

test("every validated public event category has a shared H4 candidate and truthful narration", () => {
  assert.deepEqual([...PUBLIC_H4_FACT_CATEGORIES].sort(), [...PUBLIC_PRESENTATION_EVENT_CATEGORIES].sort());
  const identity = { interactionId: "interaction-1", rootFrameId: "root-1", checkpointId: "checkpoint-1", presentationRevision: 1 };
  for (const [index, category] of PUBLIC_PRESENTATION_EVENT_CATEGORIES.entries()) {
    const fact = {
      semantics: "PROVEN", visibility: "PUBLIC", identity,
      eventId: `category-${category}`, order: index + 1, frameId: identity.rootFrameId,
      rootEventId: `category-${category}`, category, actorId: "p1", affectedPlayerIds: ["p2"],
      label: "Public action", amount: 2,
      ...(category === "STAGE_COMPLETED" ? { outcomeLabel: "completed the public stage" } : {}),
      ...(category === "ACTION_DECLINED" ? { effect: { kind: "generic_decline" } } : {}),
    };
    assert.equal(isPublicInteractionOutcomeFact(fact), true, `${category} enters the shared H4 candidate predicate`);
    const narration = derivePublicInteractionNarration({
      snapshot: snapshot({ stage: "SETTLEMENT", actorId: null, publicEventFacts: [fact] }),
      players, rootEventId: fact.rootEventId, interactionId: identity.interactionId, rootFrameId: identity.rootFrameId,
    });
    assert.equal(narration?.eventId, fact.eventId, `${category} receives one committed public narration`);
    assert.ok(narration?.headline.trim(), `${category} has non-empty H4 copy`);
  }
});
