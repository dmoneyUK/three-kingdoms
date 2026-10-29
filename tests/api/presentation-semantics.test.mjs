import test from "node:test";
import assert from "node:assert/strict";
import { collectPublicPresentationEventFacts, projectPublicPresentationSemantics, publicDecisionFromPresentationSnapshot } from "../../game/presentation-semantics.ts";

const identity = (revision = 1, checkpointId = `checkpoint-${revision}`) => ({
  interactionId: "interaction-1",
  rootFrameId: "root-1",
  checkpointId,
  presentationRevision: revision,
});

const event = (overrides = {}) => ({
  semantics: "PROVEN",
  visibility: "PUBLIC",
  identity: identity(),
  eventId: "event-1",
  order: 1,
  category: "CARD_PLAYED",
  actorId: "player-1",
  affectedPlayerIds: ["player-2"],
  label: "A public action occurred.",
  ...overrides,
});

const decision = (checkpoint = identity()) => ({
  semantics: "PROVEN",
  visibility: "PUBLIC",
  identity: checkpoint,
  decisionId: `decision-${checkpoint.checkpointId}`,
  stage: "RESPONSE",
  stageLabel: "Response",
  actorIds: ["player-2"],
  actionLabels: ["Play a counter", "Pass"],
  responseWindowOpen: true,
});

test("public semantic projection fails closed for empty, stale, private, and unproven facts", () => {
  const empty = projectPublicPresentationSemantics({ identity: null, events: [], nextDecision: null });
  assert.deepEqual(empty, { identity: null, event: null, events: [], nextDecision: null, viewerNegationChoice: null });

  const current = identity(4);
  const projected = projectPublicPresentationSemantics({
    identity: current,
    events: [
      event({ eventId: "old-root", identity: { ...identity(1, "old-interaction-checkpoint"), interactionId: "old-interaction" }, order: 1 }),
      event({ eventId: "unproven", semantics: "UNPROVEN", identity: current, order: 2 }),
      event({ eventId: "private", visibility: "LOCAL", identity: current, order: 3 }),
      event({ eventId: "future", identity: identity(5), order: 4 }),
    ],
    nextDecision: { ...decision(current), visibility: "LOCAL" },
  });

  assert.equal(projected.event, null);
  assert.equal(projected.nextDecision, null);
});

test("root and counter events preserve generic order through cancel and restore stages", () => {
  const root = event({ eventId: "root-event", order: 1, identity: identity(1), category: "CARD_PLAYED" });
  const firstCounter = event({ eventId: "counter-1", order: 2, identity: identity(2), category: "EFFECT_CANCELLED", label: "A public effect was cancelled." });
  const secondCounter = event({ eventId: "counter-2", order: 3, identity: identity(3), category: "EFFECT_RESTORED", label: "A public effect was restored." });

  for (const [revision, expectedEvent, nextLabel] of [
    [1, root, "A counter can cancel the effect."],
    [2, firstCounter, "Another counter can restore the effect."],
    [3, secondCounter, "Another counter can cancel the effect."],
  ]) {
    const current = identity(revision);
    const projected = projectPublicPresentationSemantics({
      identity: current,
      events: [root, firstCounter, secondCounter],
      nextDecision: { ...decision(current), actionLabels: [nextLabel] },
    });
    assert.equal(projected.event?.eventId, expectedEvent.eventId);
    assert.equal(projected.event?.category, expectedEvent.category);
    assert.deepEqual(projected.nextDecision?.actionLabels, [nextLabel]);
  }
});

test("a phase change retains the last public event while replacing the exact next decision", () => {
  const lastEvent = event({ eventId: "damage-event", order: 3, identity: identity(3), category: "DAMAGE_APPLIED" });
  const current = identity(4, "skill-checkpoint");
  const projected = projectPublicPresentationSemantics({
    identity: current,
    events: [lastEvent],
    nextDecision: { ...decision(current), stageLabel: "Optional choice", actorIds: ["player-3"], actionLabels: ["Use an option", "Skip"] },
  });

  assert.equal(projected.event?.eventId, "damage-event");
  assert.deepEqual(projected.nextDecision, {
    ...decision(current),
    stageLabel: "Optional choice",
    actorIds: ["player-3"],
    actionLabels: ["Use an option", "Skip"],
  });
});

test("committed damage survives a child decision and a committed skill fact replaces it", () => {
  const current = identity(2, "skill-choice");
  const frames = [
    { frameId: "root-1", parentFrameId: null, origin: { originSourceId: "player-1", originalTargetIds: ["player-2"] } },
    { frameId: "child-1", parentFrameId: "root-1", origin: { originSourceId: "player-1", originalTargetIds: ["player-2"] } },
  ];
  const timeline = [
    { id: "root-card", type: "card", action: "play", presentation: true, appendOrder: 10, card: { id: "physical-card", kind: "Attack" } },
    { id: "damage", type: "message", presentation: true, appendOrder: 20, publicFact: {
      semantics: "PROVEN", visibility: "PUBLIC", interactionId: current.interactionId,
      frameId: "root-1", category: "DAMAGE_APPLIED", actorId: "player-1", affectedPlayerIds: ["player-2"], amount: 1,
    } },
    { id: "private", type: "message", presentation: false, appendOrder: 25, publicFact: {
      semantics: "PROVEN", visibility: "PUBLIC", interactionId: current.interactionId,
      frameId: "child-1", category: "SKILL_USED",
    } },
    { id: "skill", type: "message", presentation: true, appendOrder: 30, publicFact: {
      semantics: "PROVEN", visibility: "PUBLIC", interactionId: current.interactionId,
      frameId: "child-1", parentFrameId: "root-1", rootEventId: "root-card",
      category: "SKILL_USED", actorId: "player-2", affectedPlayerIds: ["player-2"],
      effect: { kind: "recover" }, amount: 1,
    } },
  ];
  const facts = collectPublicPresentationEventFacts({ timeline, identity: current, frames, rootEventId: "root-card" });
  assert.deepEqual(facts.map(({ eventId, category, order }) => [eventId, category, order]), [
    ["root-card", "CARD_PLAYED", 10], ["damage", "DAMAGE_APPLIED", 20], ["skill", "SKILL_USED", 30],
  ]);
  assert.equal(facts[2].rootEventId, "root-card");
  assert.equal(facts[2].parentFrameId, "root-1");
  assert.deepEqual(facts[2].effect, { kind: "recover" });
  const projected = projectPublicPresentationSemantics({
    identity: current,
    events: facts.map((fact) => ({ ...fact, identity: current })),
    nextDecision: { ...decision(current), stage: "DAMAGE", stageLabel: "Skill decision", actorIds: ["player-2"] },
  });
  assert.equal(projected.event?.eventId, "skill");
  assert.equal(projected.event?.effect?.kind, "recover");
});

test("public event fact ordering requires the server append order", () => {
  const current = identity();
  const frames = [{ frameId: "root-1", parentFrameId: null, origin: { originSourceId: "player-1", originalTargetIds: [] } }];
  const timeline = [
    { id: "ordered", type: "message", appendOrder: 5, publicFact: {
      semantics: "PROVEN", visibility: "PUBLIC", interactionId: current.interactionId,
      frameId: "root-1", category: "DAMAGE_APPLIED", affectedPlayerIds: [],
    } },
    { id: "missing-order", type: "message", publicFact: {
      semantics: "PROVEN", visibility: "PUBLIC", interactionId: current.interactionId,
      frameId: "root-1", category: "SKILL_USED", affectedPlayerIds: [],
    } },
  ];
  const facts = collectPublicPresentationEventFacts({ timeline, identity: current, frames, rootEventId: null });
  assert.deepEqual(facts.map(({ eventId, order }) => [eventId, order]), [["ordered", 5]]);
});

test("Skip adds no public skill event and keeps the prior damage event", () => {
  const current = identity(3, "next-choice");
  const damage = event({ eventId: "damage", category: "DAMAGE_APPLIED", order: 20, identity: identity(2, "damage-stage") });
  const projected = projectPublicPresentationSemantics({
    identity: current,
    events: [damage],
    nextDecision: { ...decision(current), stageLabel: "Next decision", actorIds: ["player-3"] },
  });
  assert.equal(projected.event?.eventId, "damage");
  assert.equal(projected.event?.category, "DAMAGE_APPLIED");
});

test("a second nested skill decision advances its actor without losing the root cause", () => {
  const firstStage = identity(2, "first-skill");
  const secondStage = identity(3, "second-skill");
  const frames = [
    { frameId: "root-1", parentFrameId: null, origin: { originSourceId: "player-1", originalTargetIds: ["player-2"] } },
    { frameId: "damage-1", parentFrameId: "root-1", origin: { originSourceId: "player-1", originalTargetIds: ["player-2"] } },
    { frameId: "skill-2", parentFrameId: "damage-1", origin: { originSourceId: "player-1", originalTargetIds: ["player-2"] } },
  ];
  const timeline = [
    { id: "damage", type: "message", appendOrder: 10, publicFact: {
      semantics: "PROVEN", visibility: "PUBLIC", interactionId: firstStage.interactionId,
      frameId: "damage-1", parentFrameId: "root-1", rootEventId: "root-card",
      category: "DAMAGE_APPLIED", actorId: "player-1", affectedPlayerIds: ["player-2"], amount: 1,
    } },
    { id: "first-skill", type: "message", appendOrder: 20, publicFact: {
      semantics: "PROVEN", visibility: "PUBLIC", interactionId: firstStage.interactionId,
      frameId: "skill-2", parentFrameId: "damage-1", rootEventId: "root-card",
      category: "SKILL_USED", actorId: "player-2", affectedPlayerIds: ["player-2"], effect: { kind: "recover" },
    } },
  ];
  const facts = collectPublicPresentationEventFacts({ timeline, identity: secondStage, frames, rootEventId: "root-card" });
  const projected = projectPublicPresentationSemantics({
    identity: secondStage,
    events: facts.map((fact) => ({ ...fact, identity: secondStage })),
    nextDecision: { ...decision(secondStage), stage: "DAMAGE", stageLabel: "Skill decision", actorIds: ["player-3"], actionLabels: ["Use an option", "Skip"] },
  });
  assert.equal(projected.event?.eventId, "first-skill");
  assert.equal(projected.event?.rootEventId, "root-card");
  assert.equal(projected.event?.parentFrameId, "damage-1");
  assert.deepEqual(projected.nextDecision?.actorIds, ["player-3"]);
});

test("public facts and next decision are identical across viewers; local Pass/intent stays isolated", () => {
  const current = identity(2, "negation-window");
  const eventFact = event({ eventId: "counter-event", order: 42, category: "EFFECT_CANCELLED", identity: current });
  const next = { ...decision(current), stage: "NEGATION", stageLabel: "Negation", actorIds: [], actionLabels: [], responseWindowOpen: true };
  const viewerPass = projectPublicPresentationSemantics({
    identity: current, events: [eventFact], nextDecision: next,
    viewerNegationChoice: { windowId: "window-1", locked: true, choice: "pass" },
  });
  const viewerIntent = projectPublicPresentationSemantics({
    identity: current, events: [eventFact], nextDecision: next,
    viewerNegationChoice: { windowId: "window-1", locked: true, choice: "negation_intent" },
  });
  assert.deepEqual({ event: viewerPass.event, next: viewerPass.nextDecision }, { event: viewerIntent.event, next: viewerIntent.nextDecision });
  assert.equal(viewerPass.viewerNegationChoice?.choice, "pass");
  assert.equal(viewerIntent.viewerNegationChoice?.choice, "negation_intent");
  assert.equal(projectPublicPresentationSemantics({
    identity: current, events: [eventFact], nextDecision: next, viewerNegationChoice: null,
  }).viewerNegationChoice, null);
});

test("stale public next decision does not override the snapshot stage", () => {
  const current = identity(4, "current-stage");
  assert.equal(publicDecisionFromPresentationSnapshot({
    identity: { interactionId: current.interactionId, checkpointId: current.checkpointId, presentationRevision: current.presentationRevision },
    interaction: { semantics: "PROVEN", ...current },
    stable: { kind: "CHOICE", interactionId: current.interactionId, checkpointId: current.checkpointId, presentationRevision: current.presentationRevision },
    publicNextDecision: { ...decision(identity(3, "old-stage")), stage: "RESPONSE" },
  }), null);
});

test("redacted next decision cannot carry actor, action, effect, or response-window leakage", () => {
  const current = identity(5, "private-stage");
  const redacted = {
    semantics: "PROVEN",
    visibility: "REDACTED",
    identity: current,
    decisionId: "private-decision",
    stage: "DAMAGE",
    stageLabel: "Resolving…",
    actorIds: [],
    actionLabels: [],
    responseWindowOpen: null,
  };
  const accepted = projectPublicPresentationSemantics({ identity: current, events: [], nextDecision: redacted });
  assert.equal(accepted.nextDecision?.visibility, "REDACTED");
  assert.equal(accepted.nextDecision?.stageLabel, "Resolving…");

  const leaked = projectPublicPresentationSemantics({
    identity: current,
    events: [],
    nextDecision: { ...redacted, actorIds: ["player-secret"] },
  });
  assert.equal(leaked.nextDecision, null);
});

test("an unknown provider can publish a synthetic public skill event without display-specific registration", () => {
  const current = identity();
  const syntheticSkill = event({
    eventId: "synthetic-skill-event",
    category: "SKILL_USED",
    label: "The Cartographer used Quiet Mapping.",
    outcomeLabel: "A public card was gained.",
  });
  const projected = projectPublicPresentationSemantics({
    identity: current,
    events: [syntheticSkill],
    nextDecision: decision(current),
  });

  assert.equal(projected.event?.eventId, "synthetic-skill-event");
  assert.equal(projected.event?.category, "SKILL_USED");
  assert.equal(projected.event?.outcomeLabel, "A public card was gained.");
});

test("ambiguous public event ordering is not assigned a false latest owner", () => {
  const current = identity();
  const projected = projectPublicPresentationSemantics({
    identity: current,
    events: [event({ eventId: "one" }), event({ eventId: "two" })],
    nextDecision: decision(current),
  });
  assert.equal(projected.event, null);
});
