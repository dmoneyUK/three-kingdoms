import test from "node:test";
import assert from "node:assert/strict";
import { collectPublicPresentationEventFacts, projectPublicPresentationSemantics, publicDecisionFromPresentationSnapshot, publicEventFactsFromPresentationV2, PUBLIC_PRESENTATION_EVENT_CATEGORIES, retainedPublicEventFromTimeline } from "../../game/presentation-semantics.ts";
import { appendSequencedLogRecord, publicEventSequencesFromLog } from "../../game/public-log-sequence.ts";

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

test("idle retention uses committed causal facts and stops at a later public action", () => {
  const checkpoint = identity(3);
  const committed = (id, order, category, extra = {}) => ({
    id, type: "message", presentation: true, publicSequence: order,
    publicFact: { semantics: "PROVEN", visibility: "PUBLIC", interactionId: checkpoint.interactionId,
      frameId: checkpoint.rootFrameId, committedIdentity: checkpoint, rootEventId: "root-card",
      category, actorId: "player-2", affectedPlayerIds: [], ...extra },
  });
  const damage = committed("damage", 10, "DAMAGE_APPLIED", { amount: 1 });
  const skill = committed("skill", 11, "SKILL_USED", { label: "Public skill", effect: { kind: "generic" } });
  const privateEvent = { ...committed("private", 12, "SKILL_USED"), presentation: false, privateToPlayerId: "player-2" };
  const retained = retainedPublicEventFromTimeline([damage, skill, privateEvent]);
  assert.equal(retained?.event.eventId, "skill");
  assert.deepEqual(retained?.facts.map((fact) => fact.eventId), ["damage", "skill"]);
  assert.equal(retainedPublicEventFromTimeline([damage, skill, { id: "new-action", type: "card", action: "play", presentation: true, publicSequence: 13 }]), null);
  assert.equal(retainedPublicEventFromTimeline([damage, { ...skill, publicFact: { ...skill.publicFact, committedIdentity: undefined } }]), null);
});

test("idle retention keeps a bounded public fact queue across causal roots in sequence order", () => {
  const earlierIdentity = { interactionId: "interaction-earlier", rootFrameId: "frame-earlier", checkpointId: "checkpoint-earlier", presentationRevision: 2 };
  const latestIdentity = { interactionId: "interaction-latest", rootFrameId: "frame-latest", checkpointId: "checkpoint-latest", presentationRevision: 1 };
  const committed = (id, order, currentIdentity, rootEventId, category, extra = {}) => ({
    id, type: "message", presentation: true, publicSequence: order,
    publicFact: { semantics: "PROVEN", visibility: "PUBLIC", interactionId: currentIdentity.interactionId,
      frameId: currentIdentity.rootFrameId, committedIdentity: currentIdentity, rootEventId,
      category, actorId: "player-1", affectedPlayerIds: ["player-1"], ...extra },
  });
  const earlier = committed("earlier-result", 20, earlierIdentity, "earlier-root", "EFFECT_APPLIED", {
    label: "Earlier result", effect: { kind: "judgement" },
  });
  const latest = committed("latest-draw", 25, latestIdentity, "latest-root", "EFFECT_APPLIED", {
    label: "Draw Phase", effect: { kind: "draw_phase" },
  });
  const privateEvent = { ...committed("private-result", 30, latestIdentity, "private-root", "EFFECT_APPLIED"),
    presentation: false, privateToPlayerId: "player-1" };

  const retained = retainedPublicEventFromTimeline([earlier, latest, privateEvent]);
  assert.equal(retained?.event.eventId, "latest-draw");
  assert.deepEqual(retained?.facts.map((fact) => fact.eventId), ["earlier-result", "latest-draw"]);
  assert.equal(retained?.facts[0].identity.interactionId, earlierIdentity.interactionId,
    "each retained fact keeps its own committed interaction identity");

  const burst = Array.from({ length: 40 }, (_, index) => {
    const currentIdentity = { interactionId: `interaction-${index}`, rootFrameId: `frame-${index}`,
      checkpointId: `checkpoint-${index}`, presentationRevision: 1 };
    return committed(`burst-${index}`, 100 + index, currentIdentity, `root-${index}`, "EFFECT_APPLIED");
  });
  const retainedBurst = retainedPublicEventFromTimeline(burst);
  assert.equal(retainedBurst?.facts.length, 32, "retention stays bounded");
  assert.equal(retainedBurst?.facts[0].eventId, "burst-8");
  assert.equal(retainedBurst?.event.eventId, "burst-39");
});

test("idle retention covers every generic public event category without weakening physical card proofs", () => {
  const checkpoint = identity(3, "category-retention-checkpoint");
  const genericCategories = PUBLIC_PRESENTATION_EVENT_CATEGORIES.filter((category) => category !== "CARD_EQUIPPED");
  for (const [index, category] of genericCategories.entries()) {
    const timelineEvent = {
      id: `retained-${category}`, type: "message", presentation: true, publicSequence: 100 + index,
      actorId: "player-1",
      publicFact: { semantics: "PROVEN", visibility: "PUBLIC", interactionId: checkpoint.interactionId,
        frameId: checkpoint.rootFrameId, committedIdentity: checkpoint, rootEventId: "public-root",
        category, actorId: "player-1", affectedPlayerIds: category === "CARD_DISCARDED" ? ["player-1"] : [], label: "Public result",
        ...(category === "CARD_DISCARDED" ? { committedOutcome: { source: { kind: "skill", label: "Public result" }, changes: [
          { kind: "CARD_DISCARDED", playerId: "player-1", amount: 2, fromZone: "HAND", toZone: "DISCARD" },
        ] } } : {}) },
    };
    const retained = retainedPublicEventFromTimeline([timelineEvent]);
    assert.equal(retained?.event.eventId, timelineEvent.id, `${category} remains visible in the at-rest public queue`);
    assert.equal(retained?.event.category, category);
    if (category === "CARD_DISCARDED") {
      const active = collectPublicPresentationEventFacts({
        timeline: [timelineEvent], identity: checkpoint,
        frames: [{ frameId: checkpoint.rootFrameId, parentFrameId: null }], rootEventId: "public-root",
      });
      assert.equal(active[0]?.committedOutcome?.changes[0]?.kind, "CARD_DISCARDED",
        "a public count proof remains visible without exposing the discarded physical card identity");
    }
  }

  const unprovenDiscard = {
    id: "unproven-discard", type: "card", action: "discard", presentation: true, publicSequence: 200,
    actorId: "player-1", card: { id: "real-card", kind: "Attack", suit: "♠", rank: "7" },
    publicFact: { semantics: "PROVEN", visibility: "PUBLIC", interactionId: checkpoint.interactionId,
      frameId: checkpoint.rootFrameId, committedIdentity: checkpoint, rootEventId: "unproven-discard",
      category: "CARD_DISCARDED", actorId: "player-1", affectedPlayerIds: ["player-1"] },
  };
  assert.equal(retainedPublicEventFromTimeline([unprovenDiscard]), null,
    "CARD_DISCARDED still requires its exact public zone-transition proof");
  assert.deepEqual(collectPublicPresentationEventFacts({
    timeline: [{ ...unprovenDiscard, publicFact: undefined }], identity: checkpoint,
    frames: [{ frameId: checkpoint.rootFrameId, parentFrameId: null }], rootEventId: unprovenDiscard.id,
  }), [], "the active projection also rejects an unproven discard fallback");

  const provenDiscard = {
    id: "proven-discard", type: "card", action: "discard", presentation: true, publicSequence: 201,
    actorId: "player-1", card: { id: "public-card", kind: "Attack", suit: "♠", rank: "7" },
    publicZoneTransition: { semantics: "PROVEN", visibility: "PUBLIC", eventId: "proven-discard", physicalCardId: "public-card",
      from: { zone: "HAND", ownerId: "player-1" }, to: { zone: "DISCARD", ownerId: null } },
    publicFact: { semantics: "PROVEN", visibility: "PUBLIC", interactionId: checkpoint.interactionId,
      frameId: checkpoint.rootFrameId, committedIdentity: checkpoint, rootEventId: "proven-discard",
      category: "CARD_DISCARDED", actorId: "player-1", affectedPlayerIds: ["player-1"] },
  };
  assert.equal(retainedPublicEventFromTimeline([provenDiscard])?.event.eventId, provenDiscard.id,
    "the physical discard owner remains valid when the true public card-zone transition is proven");
});

test("public Equipment facts require a committed real equip and never infer a play from an unproven equip", () => {
  const checkpoint = identity(2, "equipment-checkpoint");
  const equip = {
    id: "equip-event", type: "card", action: "equip", presentation: true, publicSequence: 20,
    actorId: "player-1", card: { id: "real-frost-sword", kind: "FrostSword", suit: "♠", rank: "A" },
    publicFact: { semantics: "PROVEN", visibility: "PUBLIC", interactionId: checkpoint.interactionId,
      frameId: checkpoint.rootFrameId, rootEventId: "equip-event", category: "CARD_EQUIPPED",
      actorId: "player-1", affectedPlayerIds: ["player-1"], label: "Frost Sword",
      effect: { kind: "equipment_play", label: "Frost Sword" }, committedIdentity: checkpoint },
  };
  const frames = [{ frameId: checkpoint.rootFrameId, parentFrameId: null,
    origin: { originSourceId: "player-1", originalTargetIds: ["player-1"] } }];
  const active = collectPublicPresentationEventFacts({ timeline: [equip], identity: checkpoint, frames, rootEventId: equip.id });
  assert.equal(active.length, 1);
  assert.equal(active[0].category, "CARD_EQUIPPED");
  assert.equal(active[0].eventId, equip.id);

  const retained = retainedPublicEventFromTimeline([equip]);
  assert.equal(retained?.event.category, "CARD_EQUIPPED");
  assert.equal(retained?.event.actorId, "player-1");
  assert.equal(retained?.event.label, "Frost Sword");
  assert.deepEqual(retained?.facts.map((fact) => fact.eventId), [equip.id]);

  const invalid = [
    { ...equip, publicFact: { ...equip.publicFact, label: "A weapon" } },
    { ...equip, publicFact: { ...equip.publicFact, effect: { kind: "unknown", label: "Frost Sword" } } },
    { ...equip, publicFact: { ...equip.publicFact, actorId: "player-2" } },
    { ...equip, publicFact: { ...equip.publicFact, affectedPlayerIds: ["player-1", "player-2"] } },
    { ...equip, publicFact: { ...equip.publicFact, rootEventId: "another-event" } },
    { ...equip, card: { ...equip.card, kind: "Attack" } },
    { ...equip, privateToPlayerId: "player-1" },
    { ...equip, presentation: false },
  ];
  for (const candidate of invalid) assert.equal(retainedPublicEventFromTimeline([candidate]), null);
  assert.deepEqual(collectPublicPresentationEventFacts({
    timeline: [{ ...equip, publicFact: undefined }], identity: checkpoint, frames, rootEventId: equip.id,
  }), [], "a public equip without causal event proof must not become a generic CARD_PLAYED fact");
  assert.equal(retainedPublicEventFromTimeline([{
    id: "unproven-equip", type: "card", action: "equip", presentation: true, publicSequence: 21,
    actorId: "player-1", card: equip.card,
  }]), null, "an unproven later equip supersedes older retained results without inventing H4");
});

test("Bumper Harvest pick facts require the one committed public root, reveal, chooser and face", () => {
  const checkpoint = identity(3, "harvest-choice-checkpoint");
  const rootEvent = {
    id: "harvest-root-event", type: "card", action: "play", presentation: true,
    publicSequence: 1, resolutionId: "harvest-root-resolution",
    card: { id: "harvest-root-card", kind: "BumperHarvest", suit: "♣", rank: "7" },
    bumperHarvestRoot: { semantics: "PROVEN", sourceId: "p1", cardId: "harvest-root-card",
      interactionId: checkpoint.interactionId, rootFrameId: checkpoint.rootFrameId },
  };
  const chosen = { id: "revealed-card-1", kind: "Overindulgence", suit: "♠", rank: "6" };
  const revealEvent = {
    id: "harvest-reveal-event", type: "cards", action: "reveal", presentation: false,
    resolutionId: rootEvent.resolutionId, cards: [chosen],
  };
  const outcomeLabel = "Test Player 2 took 6♠ Overindulgence from Bumper Harvest";
  const proof = {
    semantics: "PROVEN", eventId: "harvest-pick-event", interactionId: checkpoint.interactionId,
    rootFrameId: checkpoint.rootFrameId, rootEventId: rootEvent.id,
    rootResolutionId: rootEvent.resolutionId, rootCardId: rootEvent.card.id,
    revealEventId: revealEvent.id, sourceId: "p1", actorId: "p2", card: chosen,
  };
  const pickEvent = {
    id: proof.eventId, type: "message", message: outcomeLabel, presentation: true,
    publicSequence: 3, resolutionId: rootEvent.resolutionId, actorId: "p2",
    publicFact: {
      semantics: "PROVEN", visibility: "PUBLIC", interactionId: checkpoint.interactionId,
      frameId: checkpoint.rootFrameId, rootEventId: rootEvent.id, category: "CARD_OBTAINED",
      actorId: "p2", affectedPlayerIds: ["p2"], label: "Overindulgence", outcomeLabel,
      effect: { kind: "bumper_harvest_pick", label: "Bumper Harvest" },
      bumperHarvestPickProof: proof,
      committedIdentity: checkpoint,
    },
  };
  const frames = [{ frameId: checkpoint.rootFrameId, parentFrameId: null,
    origin: { originSourceId: "p1", originEffect: "BumperHarvest", originalTargetIds: ["p1", "p2", "p3", "p4"] } }];
  const project = (timeline, supportingPublicEvents = []) => collectPublicPresentationEventFacts({
    timeline, supportingPublicEvents, identity: checkpoint, frames, rootEventId: rootEvent.id,
  });
  const valid = project([rootEvent, revealEvent, pickEvent]).find((fact) => fact.eventId === pickEvent.id);
  assert.equal(valid?.category, "CARD_OBTAINED");
  assert.equal(valid?.outcomeLabel, outcomeLabel);
  assert.equal(valid?.effect?.kind, "bumper_harvest_pick");
  assert.deepEqual(valid?.bumperHarvestPick, {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: pickEvent.id, order: 3,
    actorId: "p2", rootEventId: rootEvent.id, chosenCardId: chosen.id,
    chosenFace: { kind: chosen.kind, suit: chosen.suit, rank: chosen.rank },
    committedIdentity: checkpoint,
  });
  assert.equal(Object.hasOwn(valid ?? {}, "bumperHarvestPickProof"), false, "internal proof is not copied into the public snapshot");
  const projectedFromDisplayEvents = project([rootEvent, pickEvent], [revealEvent])
    .find((fact) => fact.eventId === pickEvent.id);
  assert.equal(projectedFromDisplayEvents?.outcomeLabel, outcomeLabel,
    "a non-presented but public reveal may prove the face without becoming a display event");
  assert.equal(project([rootEvent, pickEvent]).some((fact) => fact.eventId === pickEvent.id), false,
    "a pick fact fails closed when its supporting public reveal is absent");

  const invalidTimelines = [
    [rootEvent, revealEvent, pickEvent, { ...pickEvent }],
    [rootEvent, revealEvent, { ...pickEvent, publicFact: { ...pickEvent.publicFact,
      bumperHarvestPickProof: { ...proof, actorId: "p3" } } }],
    [rootEvent, { ...revealEvent, cards: [{ ...chosen, id: "different-card" }] }, pickEvent],
    [rootEvent, revealEvent, { ...pickEvent, actorId: "p3" }],
    [rootEvent, revealEvent, { ...pickEvent, publicFact: { ...pickEvent.publicFact,
      rootEventId: "other-root" } }],
    [rootEvent, revealEvent, { ...pickEvent, message: "A different public result." }],
    [rootEvent, revealEvent, { ...pickEvent, publicFact: { ...pickEvent.publicFact,
      bumperHarvestPickProof: { ...proof, revealEventId: "missing-reveal" } } }],
  ];
  for (const timeline of invalidTimelines) {
    assert.equal(project(timeline).some((fact) => fact.eventId === pickEvent.id && fact.effect?.kind === "bumper_harvest_pick"),
      false, "a duplicate or mismatched commitment cannot publish a Harvest pick fact");
  }
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
    { id: "root-card", type: "card", action: "play", presentation: true, appendOrder: 10, publicSequence: 10, card: { id: "physical-card", kind: "Attack" } },
    { id: "damage", type: "message", presentation: true, appendOrder: 20, publicSequence: 20, publicFact: {
      semantics: "PROVEN", visibility: "PUBLIC", interactionId: current.interactionId,
      frameId: "root-1", category: "DAMAGE_APPLIED", actorId: "player-1", affectedPlayerIds: ["player-2"], amount: 1,
    } },
    { id: "private", type: "message", presentation: false, appendOrder: 25, publicFact: {
      semantics: "PROVEN", visibility: "PUBLIC", interactionId: current.interactionId,
      frameId: "child-1", category: "SKILL_USED",
    } },
    { id: "skill", type: "message", presentation: true, appendOrder: 30, publicSequence: 30, publicFact: {
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

test("public event fact ordering requires a persisted public ordinal, not a rolling append index", () => {
  const current = identity();
  const frames = [{ frameId: "root-1", parentFrameId: null, origin: { originSourceId: "player-1", originalTargetIds: [] } }];
  const timeline = [
    { id: "ordered", type: "message", appendOrder: 500, publicSequence: 5, publicFact: {
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

test("durable public ordinals keep retained event order stable across the 200-record rolling window", () => {
  const current = identity();
  const frames = [{ frameId: "root-1", parentFrameId: null, origin: { originSourceId: "player-1", originalTargetIds: [] } }];
  const entries = Array.from({ length: 220 }, (_, index) => {
    const publicSequence = index + 1;
    return `@event:${JSON.stringify({
      id: `public-${publicSequence}`,
      message: "A committed public event.",
      presentation: true,
      publicSequence,
      publicSequenceWatermark: publicSequence,
      publicFact: {
        semantics: "PROVEN", visibility: "PUBLIC", interactionId: current.interactionId,
        frameId: "root-1", category: "DAMAGE_APPLIED", actorId: "player-1", affectedPlayerIds: [],
      },
    })}`;
  });
  const factsFor = (log) => {
    const publicSequences = publicEventSequencesFromLog(log);
    const timeline = log.map((entry, appendOrder) => {
      const fields = JSON.parse(entry.slice("@event:".length));
      delete fields.publicSequence;
      delete fields.publicSequenceWatermark;
      const publicSequence = publicSequences?.get(fields.id);
      return { ...fields, type: "message", appendOrder, ...(publicSequence !== undefined ? { publicSequence } : {}) };
    });
    return collectPublicPresentationEventFacts({
      timeline,
      identity: current,
      frames,
      rootEventId: null,
    });
  };
  const beforeTrim = factsFor(entries);
  const afterTrim = factsFor(entries.slice(-200));
  const retainedIds = ["public-30", "public-180", "public-220"];
  const orderById = (facts) => Object.fromEntries(facts.filter((fact) => retainedIds.includes(fact.eventId)).map(({ eventId, order }) => [eventId, order]));

  assert.deepEqual(orderById(beforeTrim), { "public-30": 30, "public-180": 180, "public-220": 220 });
  assert.deepEqual(orderById(afterTrim), orderById(beforeTrim));
  assert.equal(afterTrim.at(-1)?.eventId, "public-220");
});

test("structured log appends carry a private watermark without counting private records", () => {
  let log = appendSequencedLogRecord([], "@event:", { id: "public-first", message: "First.", presentation: true });
  for (let index = 0; index < 205; index++) {
    log = index % 2 === 0
      ? appendSequencedLogRecord(log, "@history:", { id: `history-${index}`, message: "Private history is not a public event." })
      : appendSequencedLogRecord(log, "@card:", { id: `private-${index}`, presentation: false, privateToPlayerId: "viewer-1", card: { id: `card-${index}` } });
  }
  const retainedPrivateRecords = log.flatMap((entry) => {
    const prefix = ["@event:", "@card:", "@cards:", "@history:"].find((candidate) => entry.startsWith(candidate));
    return prefix ? [{ prefix, ...JSON.parse(entry.slice(prefix.length)) }] : [];
  });
  assert.equal(log.length, 200);
  assert.ok(retainedPrivateRecords.every((entry) => entry.publicSequenceWatermark === 1));
  assert.ok(retainedPrivateRecords.every((entry) => !Object.hasOwn(entry, "publicSequence")));

  log = appendSequencedLogRecord(log, "@event:", { id: "public-second", message: "Second.", presentation: true });
  const sequences = publicEventSequencesFromLog(log);
  assert.equal(sequences?.get("public-second"), 2, "205 private/history records do not advance the public ordinal");
  assert.equal(sequences?.has("private-1"), false, "private event identities never enter the public order projection");
});

test("legacy structured records bootstrap additively and mixed sequence metadata fails closed", () => {
  const legacyValues = Array.from({ length: 200 }, (_, index) => {
    if (index === 0 || index % 50 === 0 || index === 199) {
      return { prefix: "@event:", value: { id: `legacy-public-${index}`, message: `Keep public text ${index}.`, resolutionId: `resolution-${index}`, presentation: true } };
    }
    if (index === 1) {
      return { prefix: "@card:", value: { id: "legacy-private", action: "draw", presentation: false, privateToPlayerId: "viewer-1", card: { id: "secret-card" } } };
    }
    return { prefix: "@history:", value: { id: `legacy-history-${index}`, message: `Keep history ${index}.`, presentation: false } };
  });
  const legacy = legacyValues.map(({ prefix, value }) => `${prefix}${JSON.stringify(value)}`);
  const bootstrapped = appendSequencedLogRecord(legacy, "@history:", { id: "new-history", message: "New history." });
  const read = (entry) => {
    const prefix = ["@event:", "@card:", "@cards:", "@history:"].find((candidate) => entry.startsWith(candidate));
    return { prefix, value: JSON.parse(entry.slice(prefix.length)) };
  };
  for (const original of legacyValues.slice(1)) {
    const retained = bootstrapped.map(read).find((entry) => entry.value.id === original.value.id);
    assert.ok(retained, `retained legacy record ${original.value.id} remains present`);
    const originalFields = { ...retained.value };
    delete originalFields.publicSequenceWatermark;
    delete originalFields.publicSequence;
    assert.deepEqual(originalFields, original.value, "bootstrap changes only additive sequence metadata");
  }
  const bootstrappedSequences = publicEventSequencesFromLog(bootstrapped);
  assert.equal(bootstrappedSequences?.get("legacy-public-50"), 2);
  assert.equal(bootstrappedSequences?.get("legacy-public-199"), 5);
  const retainedPrivateCard = bootstrapped.map(read).find((entry) => entry.value.id === "legacy-private");
  assert.ok(retainedPrivateCard);
  assert.equal(Object.hasOwn(retainedPrivateCard.value, "publicSequence"), false, "private cards do not receive public ordinals");

  const trimmed = appendSequencedLogRecord(bootstrapped, "@event:", { id: "new-public", message: "Next event.", presentation: true });
  const trimmedSequences = publicEventSequencesFromLog(trimmed);
  for (const id of ["legacy-public-50", "legacy-public-100", "legacy-public-150", "legacy-public-199"]) {
    assert.equal(trimmedSequences?.get(id), bootstrappedSequences?.get(id), `${id} keeps its public order after a later trim`);
  }
  assert.equal(trimmedSequences?.get("new-public"), 6);

  const partial = [
    `@event:${JSON.stringify({ id: "sequenced", presentation: true, publicSequence: 1, publicSequenceWatermark: 1 })}`,
    legacy[2],
  ];
  assert.equal(publicEventSequencesFromLog(partial), null);
  assert.throws(() => appendSequencedLogRecord(partial, "@event:", { id: "next", presentation: true }), /ROOM_LOG_PUBLIC_SEQUENCE_INVALID/);
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
    { id: "damage", type: "message", appendOrder: 10, publicSequence: 10, publicFact: {
      semantics: "PROVEN", visibility: "PUBLIC", interactionId: firstStage.interactionId,
      frameId: "damage-1", parentFrameId: "root-1", rootEventId: "root-card",
      category: "DAMAGE_APPLIED", actorId: "player-1", affectedPlayerIds: ["player-2"], amount: 1,
    } },
    { id: "first-skill", type: "message", appendOrder: 20, publicSequence: 20, publicFact: {
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

test("committed public outcomes bind only to a unique public event, causal identity and exact public participants", () => {
  const committedIdentity = identity(3, "committed-checkpoint");
  const currentIdentity = identity(4, "current-checkpoint");
  const timelineEvent = {
    id: "outcome-event", type: "message", presentation: true, publicSequence: 24, actorId: "p1",
    publicFact: {
      semantics: "PROVEN", visibility: "PUBLIC", interactionId: committedIdentity.interactionId,
      frameId: committedIdentity.rootFrameId, rootEventId: "outcome-event", category: "SKILL_USED",
      actorId: "p1", affectedPlayerIds: ["p1"], label: "Self Sacrifice", committedIdentity,
      committedOutcome: { source: { kind: "skill", label: "Self Sacrifice" }, changes: [
        { kind: "HP_COST_LOST", playerId: "p1", amount: 1 },
        { kind: "CARD_DRAWN", playerId: "p1", amount: 2, fromZone: "DECK", toZone: "HAND" },
      ] },
    },
  };
  const project = (timeline = [timelineEvent]) => collectPublicPresentationEventFacts({
    timeline, identity: currentIdentity,
    frames: [{ frameId: currentIdentity.rootFrameId, parentFrameId: null }], rootEventId: timelineEvent.id,
  });
  const fact = project()[0];
  assert.equal(fact.committedOutcome?.eventId, timelineEvent.id);
  assert.equal(fact.committedOutcome?.order, timelineEvent.publicSequence);
  assert.deepEqual(fact.committedOutcome?.identity, committedIdentity);
  assert.deepEqual(fact.committedOutcome?.changes.map(({ kind, amount }) => [kind, amount]), [
    ["HP_COST_LOST", 1], ["CARD_DRAWN", 2],
  ]);

  const projected = projectPublicPresentationSemantics({
    identity: currentIdentity,
    events: [{ ...fact, identity: currentIdentity }],
    nextDecision: null,
  });
  assert.equal(projected.event?.committedOutcome?.eventId, timelineEvent.id);

  const fromPresentationV2 = publicEventFactsFromPresentationV2([{
    ...fact,
    interactionId: currentIdentity.interactionId,
    committedOutcome: fact.committedOutcome,
  }], currentIdentity, [{ frameId: currentIdentity.rootFrameId, parentFrameId: null }]);
  assert.equal(fromPresentationV2[0]?.committedOutcome?.eventId, timelineEvent.id,
    "the V2 projection retains the validated committed outcome for H4 consumption");
  const withoutOutcome = { ...fact };
  delete withoutOutcome.committedOutcome;
  assert.deepEqual(publicEventFactsFromPresentationV2([{
    ...withoutOutcome,
    interactionId: currentIdentity.interactionId,
    category: "CARD_DISCARDED",
  }], currentIdentity, [{ frameId: currentIdentity.rootFrameId, parentFrameId: null }]), [],
  "V2 cannot promote a discard count without either its shared committed result or the separate physical-zone owner");

  const retained = retainedPublicEventFromTimeline([timelineEvent]);
  assert.equal(retained?.event.committedOutcome?.order, timelineEvent.publicSequence);

  const invalidDrafts = [
    { ...timelineEvent.publicFact.committedOutcome, changes: [{ kind: "CARD_DRAWN", playerId: "p1", amount: -1, fromZone: "DECK", toZone: "HAND" }] },
    { ...timelineEvent.publicFact.committedOutcome, changes: [{ kind: "CARD_DRAWN", playerId: "p1", amount: 1.5, fromZone: "DECK", toZone: "HAND" }] },
    { ...timelineEvent.publicFact.committedOutcome, changes: [{ kind: "CARD_DRAWN", playerId: "p1", amount: 1, fromZone: "DECK", toZone: "HAND", cardId: "hidden-card-id" }] },
    { ...timelineEvent.publicFact.committedOutcome, changes: [{ kind: "CARD_DRAWN", playerId: "p2", amount: 2, fromZone: "DECK", toZone: "HAND" }] },
    { ...timelineEvent.publicFact.committedOutcome, source: { kind: "hero_skill", label: "Self Sacrifice" } },
    { ...timelineEvent.publicFact.committedOutcome, source: { kind: "skill", label: "Hidden card identity" } },
    { ...timelineEvent.publicFact.committedOutcome, visibility: "PRIVATE" },
  ];
  for (const committedOutcome of invalidDrafts) {
    const [invalid] = project([{ ...timelineEvent, publicFact: { ...timelineEvent.publicFact, committedOutcome } }]);
    assert.equal(invalid?.committedOutcome, undefined, "malformed, private, or misattributed change does not become a public outcome");
  }

  const forgedBoundOutcome = { ...fact.committedOutcome, eventId: "forged-event-id" };
  const [forged] = project([{ ...timelineEvent, publicFact: { ...timelineEvent.publicFact, committedOutcome: forgedBoundOutcome } }]);
  assert.equal(forged?.committedOutcome, undefined, "stored identity cannot override the persisted event identity");
  const forgedIdentity = { ...fact.committedOutcome, identity: { ...committedIdentity, checkpointId: "forged-checkpoint" } };
  const [forgedCheckpoint] = project([{ ...timelineEvent, publicFact: { ...timelineEvent.publicFact, committedOutcome: forgedIdentity } }]);
  assert.equal(forgedCheckpoint?.committedOutcome, undefined, "a nested outcome cannot replace the causal checkpoint");

  const staleIdentityEvent = { ...timelineEvent, publicFact: { ...timelineEvent.publicFact,
    committedIdentity: { ...committedIdentity, interactionId: "older-interaction" } } };
  assert.equal(project([staleIdentityEvent])[0]?.committedOutcome, undefined, "an outcome from a different interaction is stale");
  const futureIdentityEvent = { ...timelineEvent, publicFact: { ...timelineEvent.publicFact,
    committedIdentity: { ...committedIdentity, presentationRevision: currentIdentity.presentationRevision + 1 } } };
  assert.equal(project([futureIdentityEvent])[0]?.committedOutcome, undefined, "future checkpoints cannot prove a past committed outcome");
  const duplicated = project([timelineEvent, { ...timelineEvent }]);
  assert.equal(duplicated.every((entry) => entry.committedOutcome === undefined), true, "duplicate event ID and sequence cannot own an outcome");
  assert.deepEqual(project([{ ...timelineEvent, privateToPlayerId: "p1" }]), [], "viewer-private records never become public outcomes");
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
