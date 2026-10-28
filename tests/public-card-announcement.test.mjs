import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publicCardAnnouncement, publicCardJourneyOwnershipIdentity } from "../app/public-card-display.tsx";
import { duelNegationFinalCopy, negationEffectCopy } from "../app/negation-effect-copy.ts";
import {
  canClearPublicJourneyOwnership,
  publicAnnouncementEventCopyKey,
  publicAnnouncementGeometryIdentity,
  publicAnnouncementGeometryKey,
  selectPublicAnnouncementCandidate,
  transitionPublicAnnouncementCopyLifecycle,
} from "../game/public-announcement.ts";
import { duelExchangeAttackNarration, selectDuelPublicStageOwner } from "../game/duel-public-stage-owner.ts";
import {
  compactLustDuelAttackMessage,
  compactLustDuelOrderMessage,
  compactLustDuelResultMessage,
} from "../app/lust-public-copy.ts";

const action = (overrides = {}) => ({
  key: "test-action",
  rootEventId: "root-event",
  sourceId: "source",
  targetId: "target",
  cardLabel: "ATTACK",
  ariaLabel: "Source played Attack targeting Target",
  ...overrides,
});

function duelStageFacts({ stage = "NEGATION", revision = 6, checkpointId = "negation-6", responseCount = 0 } = {}) {
  const responseEventIds = Array.from({ length: responseCount }, (_, index) => "negation-" + (index + 1));
  const responseActorIds = Array.from({ length: responseCount }, (_, index) => index % 2 === 0 ? "p2" : "p1");
  const rootEventId = "duel-root";
  const identity = { interactionId: "duel-i1", checkpointId, presentationRevision: revision };
  const interaction = {
    semantics: "PROVEN", interactionId: identity.interactionId, rootFrameId: "duel-frame", activeFrameId: "duel-frame",
    checkpointId, presentationRevision: revision, stage, sourceId: "p1", targetIds: ["p1", "p2"],
    currentParticipantId: "p2", participantIds: ["p1", "p2"],
  };
  const negationProof = stage === "NEGATION" ? {
    semantics: "PROVEN", interactionId: identity.interactionId, rootFrameId: "duel-frame", checkpointId,
    presentationRevision: revision, rootEventId, publicEventId: responseEventIds.at(-1) ?? rootEventId,
    sourceId: "p1", targetId: "p2", responseEventIds, responseActorIds,
  } : null;
  return { identity, interaction, rootEventId, negationProof, settlementProof: null, exchangeProof: null };
}

test("Duel H4 owner follows the proven stage across root and linked Negation responses", () => {
  for (const responseCount of [0, 1, 2, 3]) {
    const selected = selectDuelPublicStageOwner(duelStageFacts({ responseCount }));
    assert.equal(selected.stageOwner, "NEGATION");
    assert.equal(selected.announcement, "NEGATION_OPEN");
    assert.equal(selected.semanticCopyIdentity, [
      "duel-i1", "duel-frame", "negation-6", "6", "NEGATION",
      responseCount ? "negation-" + responseCount : "duel-root",
    ].join(":"));
  }
});

test("Duel H4 stage ownership is viewer-independent and rejects stale or unrelated Negation proof", () => {
  const current = duelStageFacts({ responseCount: 2 });
  const selected = selectDuelPublicStageOwner(current);
  assert.deepEqual(selectDuelPublicStageOwner({ ...current }), selected);

  assert.equal(selectDuelPublicStageOwner({
    ...current,
    identity: { ...current.identity, checkpointId: "negation-7", presentationRevision: 7 },
    interaction: { ...current.interaction, checkpointId: "negation-7", presentationRevision: 7 },
  }).stageOwner, null);
  assert.equal(selectDuelPublicStageOwner({ ...current, negationProof: null }).stageOwner, null);
  assert.equal(selectDuelPublicStageOwner({
    ...current,
    negationProof: { ...current.negationProof, rootEventId: "unrelated-duel" },
  }).stageOwner, null);
  assert.equal(selectDuelPublicStageOwner({
    ...current,
    negationProof: { ...current.negationProof, responseActorIds: ["p9", "p1"] },
  }).stageOwner, null);
  assert.equal(selectDuelPublicStageOwner({
    ...current,
    settlementProof: {
      semantics: "PROVEN", outcome: "ROOT_CANCELLED", interactionId: "duel-i1", rootFrameId: "duel-frame",
      checkpointId: "negation-6", presentationRevision: 6, eventId: "cancel-event", rootEventId: "duel-root",
      rootCardKind: "Duel", sourceId: "p1", targetId: "p2",
    },
  }).stageOwner, null);
});

test("proven Duel settlement may own final copy, but proven exchange retires H4", () => {
  const exchange = {
    semantics: "PROVEN", interactionId: "duel-i1", rootFrameId: "duel-frame", checkpointId: "exchange-7",
    presentationRevision: 7, rootEventId: "duel-root", sourceId: "p1", targetId: "p2", currentParticipantId: "p1",
    decisionActorId: "p1", responseEventIds: ["attack-1"], responseActorIds: ["p1"],
  };
  const settlementProof = {
    semantics: "PROVEN", outcome: "ROOT_RESTORED", interactionId: "duel-i1", rootFrameId: "duel-frame",
    checkpointId: "negation-6", presentationRevision: 6, eventId: "settled-6", rootEventId: "duel-root",
    rootCardKind: "Duel", sourceId: "p1", targetId: "p2",
  };
  const settlementBase = duelStageFacts({ stage: "SETTLEMENT", revision: 7, checkpointId: "settlement-7" });
  const settlementState = {
    ...settlementBase,
    interaction: { ...settlementBase.interaction, currentParticipantId: null },
    settlementProof,
  };
  const finalOwner = selectDuelPublicStageOwner(settlementState);
  assert.equal(finalOwner.stageOwner, "NEGATION_SETTLEMENT");
  assert.equal(finalOwner.announcement, "NEGATION_FINAL");

  const exchangeBase = duelStageFacts({ stage: "DUEL_EXCHANGE", revision: 7, checkpointId: "exchange-7" });
  const exchangeState = {
    ...exchangeBase,
    interaction: { ...exchangeBase.interaction, currentParticipantId: "p1" },
    settlementProof,
    exchangeProof: exchange,
  };
  const exchangeOwner = selectDuelPublicStageOwner(exchangeState);
  assert.equal(exchangeOwner.stageOwner, "DUEL_EXCHANGE");
  assert.equal(exchangeOwner.announcement, null);
  assert.match(exchangeOwner.semanticCopyIdentity, /DUEL_EXCHANGE:attack-1$/);
  assert.equal(selectDuelPublicStageOwner({ ...exchangeState, settlementProof: null }).announcement, null);
  assert.equal(selectDuelPublicStageOwner({
    ...exchangeState,
    settlementProof: { ...settlementProof, outcome: "ROOT_CANCELLED" },
  }).stageOwner, null);
});

test("Duel Attack narration requires the latest response and next actor on the same proven checkpoint", () => {
  const identity = { interactionId: "duel-i1", checkpointId: "exchange-8", presentationRevision: 8 };
  const interaction = {
    semantics: "PROVEN", interactionId: "duel-i1", rootFrameId: "duel-frame", activeFrameId: "duel-frame",
    checkpointId: "exchange-8", presentationRevision: 8, stage: "DUEL_EXCHANGE", sourceId: "p1",
    currentParticipantId: "p1", decisionActorId: "p1", targetIds: ["p1", "p2"], participantIds: [],
  };
  const response = {
    semantics: "PROVEN", relation: "DUEL_EXCHANGE", interactionId: "duel-i1", rootFrameId: "duel-frame",
    rootEventId: "duel-root", responseEventId: "attack-1", sourceId: "p2", targetId: "p1",
    decisionActorId: "p2", responseActorId: "p2", responseCardKind: "Attack",
  };
  const exchange = {
    semantics: "PROVEN", interactionId: "duel-i1", rootFrameId: "duel-frame", rootEventId: "duel-root",
    rootResolutionId: "resolution-1", sourceId: "p1", targetId: "p2", checkpointId: "exchange-8",
    presentationRevision: 8, responseCount: 1, currentParticipantId: "p1", decisionActorId: "p1", responses: [response],
  };
  const input = {
    stageOwner: "DUEL_EXCHANGE", identity, interaction, rootEventId: "duel-root", exchange,
    players: [{ id: "p1", name: "Test Player 1" }, { id: "p2", name: "Test Player 2" }],
  };

  assert.deepEqual(duelExchangeAttackNarration(input), {
    eventId: "attack-1", actorId: "p2",
    message: "Test Player 2 answered the Duel with Attack. Test Player 1 must answer with Attack.",
    compactMessage: "Test Player 2 answered Duel; Test Player 1 must answer with Attack.",
  });
  assert.equal(duelExchangeAttackNarration({
    ...input,
    interaction: { ...interaction, targetIds: ["p1"] },
  }), null);
  assert.equal(duelExchangeAttackNarration({ ...input, exchange: { ...exchange, responses: [], responseCount: 0 } }), null);
  assert.equal(duelExchangeAttackNarration({
    ...input,
    identity: { ...identity, checkpointId: "exchange-9", presentationRevision: 9 },
    interaction: { ...interaction, checkpointId: "exchange-9", presentationRevision: 9 },
  }), null);
  assert.equal(duelExchangeAttackNarration({
    ...input,
    interaction: { ...interaction, currentParticipantId: "p2", decisionActorId: "p2" },
  }), null);
  assert.equal(duelExchangeAttackNarration({ ...input, stageOwner: null }), null);
  assert.equal(duelExchangeAttackNarration({
    ...input,
    players: [{ id: "p1", name: "Test Player 1" }],
  }), null);
});

test("public announcement arbitration uses unique committed checkpoints and retires older Hero copy", () => {
  const attack = { id: "attack-root", name: "Attack" };
  const oldHero = { id: "hero-cost", name: "Hero cost" };
  const nonHero = { id: "active-response", name: "Current response" };
  const timeline = ["hero-cost", "attack-root", "active-response"];

  assert.equal(selectPublicAnnouncementCandidate([
    { value: oldHero, rootEventId: "hero-cost", checkpointEventId: "hero-cost", priority: 1, supersedeOnNewerPublicPlay: true },
    { value: attack, rootEventId: "attack-root", checkpointEventId: "attack-root", priority: 2 },
  ], timeline, ["attack-root"]), attack);

  assert.equal(selectPublicAnnouncementCandidate([
    { value: oldHero, rootEventId: "hero-cost", checkpointEventId: "hero-cost", priority: 1, supersedeOnNewerPublicPlay: true },
  ], timeline, ["attack-root"]), null);

  assert.equal(selectPublicAnnouncementCandidate([
    { value: nonHero, rootEventId: "attack-root", checkpointEventId: "active-response", priority: 2 },
    { value: attack, rootEventId: "attack-root", checkpointEventId: "attack-root", priority: 9 },
  ], timeline), nonHero);

  assert.equal(selectPublicAnnouncementCandidate([
    { value: attack, rootEventId: "missing-root", checkpointEventId: "attack-root", priority: 1 },
    { value: oldHero, rootEventId: "hero-cost", checkpointEventId: "hero-cost", priority: 1 },
  ], [...timeline, "hero-cost"]), null);
});

test("announcement copy identity is viewer-independent while geometry identity is viewer-scoped", () => {
  const identity = {
    roomCode: "ROOM",
    rootEventId: "root",
    checkpointEventId: "response-1",
    proofEventId: "response-1",
    actorId: "player-2",
    actionClass: "single-target",
  };
  assert.equal(publicAnnouncementEventCopyKey(identity), publicAnnouncementEventCopyKey(identity));
  assert.notEqual(publicAnnouncementGeometryKey("ROOM", "player-1"), publicAnnouncementGeometryKey("ROOM", "player-2"));
  assert.notEqual(publicAnnouncementEventCopyKey(identity), publicAnnouncementEventCopyKey({ ...identity, checkpointEventId: "response-2", proofEventId: "response-2" }));

  const authoritativeNegation = {
    ...identity,
    presentationStage: "NEGATION",
    serverRevision: 6,
    semanticOwner: "NEGATION",
    interactionId: "duel-interaction",
    rootFrameId: "duel-frame",
    authoritativeCheckpointId: "negation-checkpoint-6",
    latestPublicEventId: "negation-response-2",
  };
  assert.notEqual(publicAnnouncementEventCopyKey(authoritativeNegation), publicAnnouncementEventCopyKey({
    ...authoritativeNegation,
    presentationStage: "DUEL_EXCHANGE",
    semanticOwner: "DUEL_EXCHANGE",
  }));
  assert.notEqual(publicAnnouncementEventCopyKey(authoritativeNegation), publicAnnouncementEventCopyKey({
    ...authoritativeNegation,
    serverRevision: 7,
    authoritativeCheckpointId: "duel-exchange-checkpoint-7",
    latestPublicEventId: "duel-attack-1",
  }));
  assert.notEqual(publicAnnouncementEventCopyKey(authoritativeNegation), publicAnnouncementEventCopyKey({
    ...authoritativeNegation,
    latestPublicEventId: "negation-settlement-final",
  }));
});

test("measured announcement geometry identity is stable per viewer and invalidates on layout changes", () => {
  const base = {
    viewerKey: publicAnnouncementGeometryKey("ROOM", "viewer-1"),
    layoutRevision: "viewer-1:0:144:384:768",
    viewport: { left: 0, top: 0, right: 390, bottom: 844 },
    table: { left: 8, top: 148, right: 382, bottom: 780 },
    seats: [
      { anchorId: "viewer-2", rect: { left: 12, top: 160, right: 128, bottom: 272 } },
      { anchorId: "viewer-1", rect: { left: 140, top: 160, right: 250, bottom: 272 } },
    ],
    anchor: { left: 164, top: 404, right: 226, bottom: 496 },
    protectedRects: [
      { kind: "visible-countdown", identity: "", rect: { left: 300, top: 712, right: 370, bottom: 760 } },
    ],
  };
  const identity = publicAnnouncementGeometryIdentity(base);
  assert.equal(publicAnnouncementGeometryIdentity({ ...base, seats: [...base.seats].reverse() }), identity);
  assert.notEqual(publicAnnouncementGeometryIdentity({
    ...base,
    viewerKey: publicAnnouncementGeometryKey("ROOM", "viewer-2"),
  }), identity);
  assert.notEqual(publicAnnouncementGeometryIdentity({
    ...base,
    layoutRevision: "viewer-1:0:144:384:720",
  }), identity);
  assert.notEqual(publicAnnouncementGeometryIdentity({
    ...base,
    viewport: { ...base.viewport, bottom: 700 },
  }), identity);
  assert.notEqual(publicAnnouncementGeometryIdentity({
    ...base,
    protectedRects: [{ ...base.protectedRects[0], rect: { ...base.protectedRects[0].rect, top: 690 } }],
  }), identity);
});

test("announcement copy lifecycle advances UNSEEN to ACTIVE to READING to RETIRED without regression", () => {
  let state = { eventCopyKey: "", stage: "UNSEEN" };
  state = transitionPublicAnnouncementCopyLifecycle(state, { eventCopyKey: "root:response-1", stage: "ACTIVE" });
  assert.deepEqual(state, { eventCopyKey: "root:response-1", stage: "ACTIVE" });
  state = transitionPublicAnnouncementCopyLifecycle(state, { eventCopyKey: "root:response-1", stage: "READING" });
  assert.deepEqual(state, { eventCopyKey: "root:response-1", stage: "READING" });
  state = transitionPublicAnnouncementCopyLifecycle(state, { eventCopyKey: "root:response-1", stage: "ACTIVE" });
  assert.deepEqual(state, { eventCopyKey: "root:response-1", stage: "READING" });
  state = transitionPublicAnnouncementCopyLifecycle(state, null);
  assert.deepEqual(state, { eventCopyKey: "root:response-1", stage: "RETIRED" });
});

test("stale ownership cleanup cannot clear a newer viewer or scope generation", () => {
  const current = { roomCode: "ROOM", viewerId: "viewer-2", actionKey: "root", scopeGeneration: "root:viewer-2" };
  assert.equal(canClearPublicJourneyOwnership(current, { ...current, viewerId: "viewer-1", scopeGeneration: "root:viewer-1" }), false);
  assert.equal(canClearPublicJourneyOwnership(current, { ...current, scopeGeneration: "older-generation" }), false);
  assert.equal(canClearPublicJourneyOwnership(current, current), true);
});

test("T3 single-target root ownership survives Negation, target choice, and settlement wrappers", () => {
  const root = action({
    key: "negation-read:root",
    cardKind: "Steal",
    cardFace: { id: "physical-steal-card", kind: "Steal", suit: "♠", rank: "7" },
    motion: { type: "single-target", scopeKey: "room:root-event", freshEventIds: ["root-event"] },
  });
  const settlement = {
    ...root,
    key: "steal-settlement:root-event:settlement-event",
    motion: { type: "single-target", scopeKey: "room:root-event", freshEventIds: [] },
    settlement: { eventId: "settlement-event", outcome: "STEAL_RESOLVED", exiting: false },
  };

  const owner = publicCardJourneyOwnershipIdentity(root, "ROOM");
  assert.equal(publicCardJourneyOwnershipIdentity(settlement, "ROOM"), owner);
  assert.notEqual(publicCardJourneyOwnershipIdentity({ ...settlement, rootEventId: "next-root" }, "ROOM"), owner);
  assert.notEqual(publicCardJourneyOwnershipIdentity({ ...settlement, cardFace: { ...root.cardFace, id: "other-physical-card" } }, "ROOM"), owner);
  assert.notEqual(publicCardJourneyOwnershipIdentity({ ...settlement, sourceId: "other-author" }, "ROOM"), owner);
});

test("LUST compact copy preserves full player identities and follows the proven actor id", () => {
  const first = { id: "participant-3", name: "Test Player 3" };
  const second = { id: "participant-4", name: "Test Player 4" };
  assert.equal(compactLustDuelOrderMessage(first, second, first), "Test Player 3 first\nTest Player 4 second");
  assert.equal(compactLustDuelOrderMessage(first, second, second), "Test Player 3 second\nTest Player 4 first");
  assert.equal(compactLustDuelOrderMessage(
    { id: "one", name: "玩家姓名特别特别特别长测试乙甲乙丙丁" },
    { id: "two", name: "測試玩家4號辛壬癸甲乙丙丁戊" },
    { id: "one", name: "玩家姓名特别特别特别长测试乙甲乙丙丁" },
  ), "玩家姓名特别特别特别长测试乙甲乙丙丁 first\n測試玩家4號辛壬癸甲乙丙丁戊 second");
  assert.equal(compactLustDuelOrderMessage(first, second, { id: "unproven", name: "Unknown" }), null);
  assert.equal(compactLustDuelAttackMessage("玩家姓名特别特别特别长测试乙", "Test Player 4"), "玩家姓名特别特别特别长测试乙 attacks Test Player 4");
  assert.equal(compactLustDuelResultMessage("玩家姓名特别特别特别长测试乙", "Test Player 4", 1), "Duel: 玩家姓名特别特别特别长测试乙 failed Attack; 1 damage from Test Player 4.");
});

test("public battle announcements keep proof-backed event meaning in concise copy", () => {
  assert.equal(publicCardAnnouncement(
    action(), "Source played Attack targeting Target", "Source", "Source", "Target",
  ), "Source played Attack on Target.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "DUEL" }), "Source played Duel targeting Target", "Source", "Source", "Target",
  ), "Source played Duel on Target.");

  assert.equal(publicCardAnnouncement(
    action({ settlement: { eventId: "dodge-event", outcome: "ATTACK_BLOCKED_BY_DODGE", exiting: false } }),
    "Target played Dodge against Source's Attack", "Target", "Source", "Target",
  ), "Target played Dodge against Source's Attack.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "NEGATION" }), "Counter played Negation to counter Duel", "Counter", "Source", "Target",
  ), "Counter played Negation against Duel.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "BURNING BRIDGE", settlement: { eventId: "settlement", outcome: "DISMANTLE_RESOLVED", exiting: false } }),
    "Source played Burning Bridge targeting Target", "Source", "Source", "Target",
  ), "Source resolved Burning Bridge on Target.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "STEAL", settlement: {
      eventId: "steal-hand", outcome: "STEAL_RESOLVED", exiting: false,
      targetCardMovement: { sourceZone: "hand", affectedCardOwnerId: "target", destinationZone: "hand", destinationOwnerId: "source" },
    } }),
    "Source played Steal targeting Target", "Source", "Source", "Target",
  ), "Source took 1 hidden card from Target (Hand).");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "STEAL", settlement: {
      eventId: "steal-equipment", outcome: "STEAL_RESOLVED", exiting: false,
      targetCardMovement: {
        sourceZone: "equipment", affectedCardOwnerId: "target", destinationZone: "hand", destinationOwnerId: "source",
        affectedCardFace: { id: "public-equipment", kind: "ZhugeCrossbow", suit: "♦", rank: "A" },
      },
    } }),
    "Source played Steal targeting Target", "Source", "Source", "Target",
  ), "Source took Zhuge Crossbow from Target (Equipment).");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "STEAL", settlement: {
      eventId: "steal-judgement", outcome: "STEAL_RESOLVED", exiting: false,
      targetCardMovement: {
        sourceZone: "judgement", affectedCardOwnerId: null, destinationZone: "hand", destinationOwnerId: "source",
        affectedCardFace: { id: "public-judgement", kind: "Lightning", suit: "♣", rank: "K" },
      },
    } }),
    "Source played Steal targeting Target", "Source", "Source", "Target",
  ), "Source took Lightning from Target (Judgement).");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "STEAL", settlement: {
      eventId: "steal-mismatched-judgement", outcome: "STEAL_RESOLVED", exiting: false,
      targetCardMovement: {
        sourceZone: "judgement", affectedCardOwnerId: "target", destinationZone: "hand", destinationOwnerId: "source",
        affectedCardFace: { id: "unproven-judgement", kind: "Lightning", suit: "♣", rank: "K" },
      },
    } }),
    "Source played Steal targeting Target", "Source", "Source", "Target",
  ), "Source resolved Steal on Target.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "STEAL", settlement: {
      eventId: "steal-mismatched-hand", outcome: "STEAL_RESOLVED", exiting: false,
      targetCardMovement: {
        sourceZone: "hand", affectedCardOwnerId: "target", destinationZone: "hand", destinationOwnerId: "source",
        affectedCardFace: { id: "must-stay-private", kind: "Peach", suit: "♥", rank: "7" },
      },
    } }),
    "Source played Steal targeting Target", "Source", "Source", "Target",
  ), "Source resolved Steal on Target.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "STEAL", settlement: { eventId: "cancelled-steal", outcome: "ROOT_CANCELLED", exiting: false } }),
    "Source played Steal targeting Target", "Counter", "Source", "Target",
  ), "Counter's Negation cancelled Source's Steal on Target.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "BURNING BRIDGE", settlement: {
      eventId: "dismantle-hand", outcome: "DISMANTLE_RESOLVED", exiting: false,
      targetCardMovement: {
        sourceZone: "hand", affectedCardOwnerId: "target", destinationZone: "discard", destinationOwnerId: null,
        affectedCardFace: { id: "discarded-card", kind: "Peach", suit: "♥", rank: "3" },
      },
    } }),
    "Source played Burning Bridge targeting Target", "Source", "Source", "Target",
  ), "Source discarded Peach from Target (Hand).");

  for (const [zone, cardFace, ownerId] of [
    ["equipment", { id: "discarded-equipment", kind: "NioShield", suit: "♠", rank: "2" }, "target"],
    ["judgement", { id: "discarded-judgement", kind: "Lightning", suit: "♦", rank: "A" }, null],
  ]) {
    assert.equal(publicCardAnnouncement(
      action({ cardLabel: "BURNING BRIDGE", settlement: {
        eventId: `dismantle-${zone}`, outcome: "DISMANTLE_RESOLVED", exiting: false,
        targetCardMovement: {
          sourceZone: zone, affectedCardOwnerId: ownerId, destinationZone: "discard", destinationOwnerId: null,
          affectedCardFace: cardFace,
        },
      } }),
      "Source played Burning Bridge targeting Target", "Source", "Source", "Target",
    ), `Source discarded ${zone === "equipment" ? "Nio Shield" : "Lightning"} from Target (${zone === "judgement" ? "Judgement" : "Equipment"}).`);
  }

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "RAINING ARROWS", ariaLabel: "Source played Raining Arrows. 4 targets resolved.", settlement: { eventId: "settlement", outcome: "GROUP_RESOLVED", exiting: false } }),
    "Source played Raining Arrows. 4 targets resolved.", "Source", "Source", null,
  ), "Source played Raining Arrows; 4 targets resolved.");

  assert.equal(publicCardAnnouncement(
    action({ cardLabel: "SOWING DISTRUST", settlement: { eventId: "settlement", outcome: "SUITS_MATCHED", exiting: false } }),
    "Source used Sowing Distrust targeting Target. Resolved: suits matched", "Source", "Source", "Target",
  ), "Source used Sowing Distrust on Target; suits matched.");

  assert.equal(publicCardAnnouncement(
    action(), "Target used Deflection, discarding Dodge and redirecting Attack to Third.", "Target", "Source", "Third",
  ), "Deflection: Target redirected Attack to Third; discarded Dodge.");
});

test("NEG-COPY-1 explains each proven Duel and Harvest counter effect", () => {
  for (const kind of ["Duel", "BumperHarvest"]) {
    const base = { kind, sourceName: "JD", targetName: "Test Player 2" };
    const cases = [
      [{ ...base, responseCount: 0, effectState: "ACTIVE" }, kind === "Duel"
        ? ["JD played Duel against Test Player 2.", "Negation can cancel the Duel."]
        : ["Test Player 2's turn to pick a card.", "Negation can prevent Test Player 2 from picking."]],
      [{ ...base, responseCount: 1, effectState: "BLOCKED", actorName: "Player 3" }, kind === "Duel"
        ? ["Player 3's Negation cancels JD's Duel.", "Another Negation can restore the Duel."]
        : ["Player 3's Negation blocks Test Player 2's pick.", "Another Negation can restore Test Player 2's pick."]],
      [{ ...base, responseCount: 2, effectState: "ACTIVE", actorName: "JD", counteredActorName: "Player 3" }, kind === "Duel"
        ? ["JD counters Player 3's Negation. The Duel is restored.", "Another Negation can cancel the Duel."]
        : ["JD counters Player 3's Negation. Test Player 2's pick is restored.", "Another Negation can block Test Player 2's pick."]],
      [{ ...base, responseCount: 3, effectState: "BLOCKED", actorName: "Player 4", counteredActorName: "JD" }, kind === "Duel"
        ? ["Player 4 counters JD's Negation. The Duel is cancelled.", "Another Negation can restore the Duel."]
        : ["Player 4 counters JD's Negation. Test Player 2's pick is blocked.", "Another Negation can restore Test Player 2's pick."]],
    ];
    for (const [input, expected] of cases) {
      const copy = negationEffectCopy(input);
      assert.deepEqual([copy?.headline, copy?.supporting], expected);
      assert.doesNotMatch(`${copy.headline} ${copy.supporting}`, /currently|\bagain\b|\bnow\b|response open|not yet resolved|Negation open|Another Negation is possible/i);
    }
    assert.equal(negationEffectCopy({ ...base, responseCount: 2, effectState: "ACTIVE", actorName: "JD" }), null);
    assert.equal(negationEffectCopy({ ...base, targetName: "", responseCount: 0, effectState: "ACTIVE" }), null);
  }
  assert.equal(duelNegationFinalCopy("ROOT_CANCELLED"), "The Duel is cancelled.");
  assert.equal(duelNegationFinalCopy("ROOT_RESTORED"), "The Duel takes effect.");
});

test("Bumper Harvest announcement fails closed without a proven narration", () => {
  const harvestAction = action({
    targetId: null,
    cardFace: { id: "harvest-root", kind: "BumperHarvest" },
    cardLabel: "BUMPER HARVEST",
    ariaLabel: "JD played Bumper Harvest.",
    phaseNotice: "NEGATION MAY BE PLAYED",
    motion: { type: "negation", scopeKey: "room:harvest", freshEventIds: ["root-event"] },
    harvestEffectRecipient: { participantId: "chooser-3", participantName: "Test Player 3" },
  });
  assert.equal(publicCardAnnouncement(
    harvestAction, harvestAction.ariaLabel, "JD", "JD", null,
  ), "Negation may be played.");
  assert.equal(publicCardAnnouncement(
    { ...harvestAction, harvestEffectRecipient: { participantId: "source", participantName: "JD" } },
    harvestAction.ariaLabel, "JD", "JD", null,
  ), "Negation may be played.");

  const unprovenHarvest = { ...harvestAction, harvestEffectRecipient: undefined };
  assert.equal(publicCardAnnouncement(
    unprovenHarvest, unprovenHarvest.ariaLabel, "JD", "JD", null,
  ), "Negation may be played.");

  const firstNegation = {
    ...harvestAction,
    responses: [{ eventId: "negation-event", ordinal: 1, actorId: "responder-4", actorName: "Test Player 4" }],
  };
  assert.equal(publicCardAnnouncement(
    firstNegation,
    "Test Player 4 played Negation to counter Bumper Harvest's effect on Test Player 3",
    "Test Player 4", "JD", null,
  ), "Negation was played.");
  assert.equal(publicCardAnnouncement(
    { ...firstNegation, harvestEffectRecipient: undefined },
    "Test Player 4 played Negation to counter Bumper Harvest's effect on Test Player 3",
    "Test Player 4", "JD", null,
  ), "Negation was played.");

  const counterNotice = "Test Player 2 played Negation to counter Negation 1";
  assert.equal(publicCardAnnouncement(
    { ...firstNegation, responses: [firstNegation.responses[0], { eventId: "counter-event", ordinal: 2, actorId: "responder-2", actorName: "Test Player 2" }] },
    counterNotice, "Test Player 2", "JD", null,
  ), "Negation was played.");
  const proven = { ...firstNegation, publicNegationNarration: { headline: "Test Player 4's Negation blocks Test Player 3's pick." } };
  assert.equal(publicCardAnnouncement(proven, "", "Test Player 4", "JD", null), "Test Player 4's Negation blocks Test Player 3's pick.");
  assert.equal(publicCardAnnouncement({ ...firstNegation, settlement: { eventId: "settled", outcome: "ROOT_CANCELLED", exiting: false } }, "", "Test Player 4", "JD", null), "Bumper Harvest response resolved.");
});

test("public announcement typography is readable and never truncates its verified sentence", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const announcement = css.match(/\.public-card-display-journey-copy\{([^}]+)\}/)?.[1] ?? "";
  const text = css.match(/^\.public-card-display-journey-copy>b\{([^}]+)\}/m)?.[1] ?? "";
  assert.match(announcement, /520px/);
  assert.match(text, /font:600 15px\/1\.2 Arial,sans-serif/);
  assert.match(text, /letter-spacing:\.01em/);
  assert.doesNotMatch(text, /line-clamp|overflow:hidden/);
  assert.match(css, /\.public-card-display-journey\[data-public-card-motion="lust-cost"\]>.public-card-display-journey-copy>b,\.public-card-display-journey\[data-public-card-motion="lust-duel"\]>.public-card-display-journey-copy>b\{white-space:pre-line\}/);
  assert.match(css, /\.public-card-display-journey\[data-public-card-motion="lust-cost"\][^}]*overflow:visible[^}]*-webkit-line-clamp:unset/);
  assert.doesNotMatch(css, /public-card-display-journey-copy\.is-condensed/);
});
