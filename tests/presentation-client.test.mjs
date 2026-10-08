import assert from "node:assert/strict";
import test from "node:test";
import { buildDyingHandoffView, buildInteractionStageDisplayModel, buildInteractionStageView, buildPresentationClientView, buildPresentationDecisionStatus, buildReactionChainView, projectInteractionSeatRoles } from "../game/presentation-client.ts";
import { buildPresentationTransition } from "../game/presentation-transition.ts";
import { buildHeroFocusView, projectHeroFocusForViewer, projectMediumSourceForViewer, projectGroupTargetScopeForViewer, projectOathRecipientScopeForStage, projectBumperHarvestStageCompositionForViewer } from "../game/hero-focus.ts";
import { buildDecisionPresentation } from "../app/page.tsx";

function scene(overrides = {}) {
  return {
    semantics: "PROVEN",
    interactionId: "interaction-1",
    rootFrameId: "root-frame",
    activeFrameId: "active-frame",
    parentFrameId: null,
    checkpointId: "checkpoint-1",
    presentationRevision: 3,
    stage: "ATTACK_RESPONSE",
    effect: "Attack",
    sourceId: "A",
    targetIds: ["B"],
    currentParticipantId: "B",
    decisionActorId: "B",
    activeResolverId: "A",
    activeSourceId: "A",
    activeTargetIds: ["B"],
    participantIds: ["A", "B"],
    participantRoles: {
      sourceId: "A",
      originalTargetIds: ["B"],
      activeTargetIds: ["B"],
      currentParticipantId: "B",
      decisionActorId: "B",
      activeResolverId: "A",
      parentParticipantId: null,
      participantIds: ["A", "B"],
    },
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  return {
    identity: { interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3 },
    stable: { kind: "CHOICE", interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3, decisionActorId: "B" },
    interaction: scene(),
    decision: { actorId: "B", stage: "ATTACK_RESPONSE" },
    localControl: { source: "CurrentAction", actionRevision: "action-1", kind: "response", actorId: "B", entitled: true },
    oathRecipientScope: null,
    reactionChain: null,
    settlement: null,
    transitionEvents: [],
    ...overrides,
  };
}

function negationSettlement(outcome = "ROOT_CANCELLED", overrides = {}) {
  return {
    semantics: "PROVEN", outcome, eventId: "settlement-event", interactionId: "interaction-1",
    rootFrameId: "root-frame", checkpointId: "settlement-checkpoint", presentationRevision: 3,
    resolutionId: "negation-resolution", rootCardKind: "Dismantle", sourceId: "A", targetId: "B",
    ...overrides,
  };
}

function groupProgressSnapshot({ child = false, outcome = null, cardKind = "RainingArrows" } = {}) {
  const targetIds = ["C", "B", "E", "D"];
  const effect = cardKind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows";
  const sceneValue = scene({
    rootFrameId: "group-frame",
    activeFrameId: child ? "damage-frame" : "group-frame",
    parentFrameId: child ? "group-frame" : null,
    stage: child ? "DAMAGE" : "GROUP_RESOLUTION",
    effect,
    targetIds,
    currentParticipantId: "B",
    activeTargetIds: ["B"],
    decisionActorId: "B",
    activeResolverId: "B",
    participantIds: ["A", ...targetIds],
    participantRoles: {
      sourceId: "A", originalTargetIds: targetIds, activeTargetIds: ["B"], currentParticipantId: "B",
      decisionActorId: "B", activeResolverId: "B", parentParticipantId: child ? "B" : null, participantIds: ["A", ...targetIds],
    },
    continuity: child ? { relation: "CHILD_FRAME", parentFrameId: "group-frame" } : { relation: "ROOT_FRAME", parentFrameId: null },
  });
  return snapshot({
    interaction: sceneValue,
    groupParticipantProgress: {
      cardKind,
      resolutionSemantics: "GROUP",
      interactionId: sceneValue.interactionId,
      groupFrameId: sceneValue.rootFrameId,
      activeFrameId: sceneValue.activeFrameId,
      checkpointId: sceneValue.checkpointId,
      presentationRevision: sceneValue.presentationRevision,
      targetIds,
      currentParticipantId: "B",
      participants: [
        { playerId: "C", order: 1, status: "RESOLVED", ...(outcome ? { outcome } : {}) },
        { playerId: "B", order: 2, status: child ? "PAUSED" : "CURRENT" },
        { playerId: "E", order: 3, status: "PENDING" },
        { playerId: "D", order: 4, status: "PENDING" },
      ],
    },
  });
}

function semanticView(sceneOverrides = {}, { stableKind = "CHOICE", localControl = {}, meId = "B" } = {}) {
  const interaction = scene(sceneOverrides);
  interaction.participantRoles = {
    ...interaction.participantRoles,
    sourceId: interaction.sourceId,
    originalTargetIds: interaction.targetIds,
    activeTargetIds: interaction.activeTargetIds,
    currentParticipantId: interaction.currentParticipantId,
    decisionActorId: interaction.decisionActorId,
    activeResolverId: interaction.activeResolverId,
    participantIds: interaction.participantIds,
    ...sceneOverrides.participantRoles,
  };
  const identity = {
    interactionId: interaction.interactionId,
    checkpointId: interaction.checkpointId,
    presentationRevision: interaction.presentationRevision,
  };
  return buildPresentationClientView(snapshot({
    identity,
    interaction,
    stable: { kind: stableKind, ...identity, decisionActorId: stableKind === "CHOICE" ? interaction.decisionActorId : null },
    decision: stableKind === "CHOICE" ? { actorId: interaction.decisionActorId, stage: interaction.stage } : null,
    localControl: { ...snapshot().localControl, ...localControl },
  }), meId);
}

function restView() {
  return buildPresentationClientView(snapshot({
    identity: null,
    interaction: null,
    decision: null,
    stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
  }), "B");
}

test("adapter maps coherent public CHOICE and source-owned roles without legal controls", () => {
  const view = buildPresentationClientView(snapshot(), "B");
  assert.deepEqual(view, {
    hasInteraction: true,
    interactionId: "interaction-1",
    checkpointId: "checkpoint-1",
    presentationRevision: 3,
    rootFrameId: "root-frame",
    activeFrameId: "active-frame",
    stage: "ATTACK_RESPONSE",
    effect: "Attack",
    sourceId: "A",
    originalTargetIds: ["B"],
    activeTargetIds: ["B"],
    currentParticipantId: "B",
    decisionActorId: "B",
    activeResolverId: "A",
    participantIds: ["A", "B"],
    groupResolution: null,
    groupParticipantProgress: [],
    oathRecipientScope: null,
    bumperHarvestProgress: null,
    reactionChain: null,
    rootAction: null,
    skillEffectAction: null,
    skillEffectSettlements: [],
    dismantleSettlements: [],
    stealSettlements: [],
    attackHitSettlements: [],
    duelExchange: null,
    selfTargetActions: [],
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
    parentFrameId: null,
    stableKind: "CHOICE",
    isLocalDecisionActor: true,
    hasLocalControl: true,
    localActionRevision: "action-1",
  });
  assert.equal("options" in view, false);
  assert.equal("legalActions" in view, false);
  assert.equal("providers" in view, false);
});

test("adapter keeps explicit self-target proof public across REST and viewer changes", () => {
  const selfTargetAction = {
    semantics: "PROVEN", rootEventId: "peach-event", resolutionId: "peach-resolution",
    sourceId: "A", targetId: "A", cardKind: "Peach",
  };
  const rest = snapshot({
    identity: null,
    interaction: null,
    decision: null,
    stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
    selfTargetActions: [selfTargetAction],
  });
  assert.deepEqual(buildPresentationClientView(rest, "A").selfTargetActions, [selfTargetAction]);
  assert.deepEqual(buildPresentationClientView(rest, "B").selfTargetActions, [selfTargetAction]);
  assert.deepEqual(buildPresentationClientView({ ...rest, selfTargetActions: [{ ...selfTargetAction, sourceId: "B" }] }, "B").selfTargetActions, []);
});

test("adapter carries submitted Attack/Dodge counter proof viewer-equally without adding controls", () => {
  const response = {
    semantics: "PROVEN", counterRelation: "BLOCKS_TARGET_EFFECT",
    interactionId: "attack-interaction", rootFrameId: "attack-frame",
    rootEventId: "attack-event", rootResolutionId: "attack-resolution",
    rootSourceId: "A", targetId: "B", responseActorId: "B",
    rootCardKind: "Attack", responseCardKind: "Dodge",
    responseEventId: "dodge-event", responseResolutionId: "attack-resolution",
  };
  const rest = snapshot({
    identity: null, interaction: null, decision: null,
    stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
    attackDodgeResponses: [response],
  });
  const acting = buildPresentationClientView(rest, "B");
  const observing = buildPresentationClientView(rest, "C");
  assert.deepEqual(acting.attackDodgeResponses, [response]);
  assert.deepEqual(observing.attackDodgeResponses, [response], "submitted public response is independent of viewer entitlement");
  assert.equal("options" in acting, false);
  assert.equal("legalActions" in acting, false);
  assert.deepEqual(buildPresentationClientView({ ...rest, attackDodgeResponses: [{ ...response, responseResolutionId: "stale-resolution" }] }, "B").attackDodgeResponses ?? [], []);
});

test("adapter carries a public Duel exchange while separating its decision actor from a delegated card submitter", () => {
  const interaction = scene({
    interactionId: "duel-interaction", rootFrameId: "duel-frame", activeFrameId: "duel-frame",
    checkpointId: "duel-checkpoint", presentationRevision: 4, stage: "DUEL_EXCHANGE",
    effect: "Duel", targetIds: ["B", "A"], sourceId: "A", activeSourceId: "A",
    currentParticipantId: "A", decisionActorId: "A", activeResolverId: "A", activeTargetIds: ["A", "B"],
    participantRoles: {
      sourceId: "A", originalTargetIds: ["B", "A"], activeTargetIds: ["A", "B"],
      currentParticipantId: "A", decisionActorId: "A", activeResolverId: "A",
      parentParticipantId: null, participantIds: [],
    },
  });
  const exchange = {
    semantics: "PROVEN", interactionId: "duel-interaction", rootFrameId: "duel-frame",
    checkpointId: "duel-checkpoint", presentationRevision: 4,
    root: { eventId: "duel-root-event", resolutionId: "duel-root-resolution", sourceId: "A", targetId: "B", cardKind: "Duel" },
    responseCount: 1,
    responses: [{
      semantics: "PROVEN", relation: "DUEL_EXCHANGE", interactionId: "duel-interaction", rootFrameId: "duel-frame",
      rootEventId: "duel-root-event", rootResolutionId: "duel-root-resolution", rootSourceId: "A", rootTargetId: "B",
      ordinal: 1, sourceId: "B", targetId: "A", decisionActorId: "B", responseActorId: "C", responseCardKind: "Attack",
      responseEventId: "duel-response-event", responseResolutionId: "duel-root-resolution",
    }],
    currentParticipantId: "A", decisionActorId: "A",
  };
  const identity = { interactionId: "duel-interaction", checkpointId: "duel-checkpoint", presentationRevision: 4 };
  const publicSnapshot = snapshot({
    identity, interaction,
    stable: { kind: "CHOICE", ...identity, decisionActorId: "A" },
    decision: { actorId: "A", stage: "DUEL_EXCHANGE" },
    duelExchange: exchange,
  });
  const acting = buildPresentationClientView(publicSnapshot, "A");
  const observing = buildPresentationClientView(publicSnapshot, "C");
  assert.deepEqual(acting.duelExchange, exchange);
  assert.deepEqual(observing.duelExchange, exchange, "the public exchange does not vary with viewer entitlement");
  assert.equal(acting.duelExchange.responses[0].decisionActorId, "B");
  assert.equal(acting.duelExchange.responses[0].responseActorId, "C");
  assert.equal("options" in acting, false);
  assert.equal("legalActions" in acting, false);
  assert.equal(buildPresentationClientView({ ...publicSnapshot, duelExchange: { ...exchange, currentParticipantId: "C" } }, "A").duelExchange, null);
});

test("adapter carries only a root action bound to the active public frame", () => {
  const interaction = scene({
    rootFrameId: "attack-frame",
    activeFrameId: "attack-frame",
    activeResolverId: "B",
    participantRoles: {
      sourceId: "A", originalTargetIds: ["B"], activeTargetIds: ["B"], currentParticipantId: "B",
      decisionActorId: "B", activeResolverId: "B", parentParticipantId: null, participantIds: ["A", "B"],
    },
  });
  const rootAction = {
    semantics: "PROVEN",
    interactionId: "interaction-1",
    rootFrameId: "attack-frame",
    activeFrameId: "attack-frame",
    checkpointId: "checkpoint-1",
    presentationRevision: 3,
    rootEventId: "public-attack-event",
    action: "ATTACK",
    sourceId: "A",
    targetId: "B",
    cardKind: "Attack",
  };
  const accepted = snapshot({ interaction, rootAction });
  const local = buildPresentationClientView(accepted, "B");
  const observer = buildPresentationClientView({
    ...accepted,
    localControl: { ...accepted.localControl, actorId: null, entitled: false },
  }, "C");
  assert.deepEqual(local.rootAction, rootAction);
  assert.deepEqual(observer.rootAction, rootAction, "public root action does not vary with viewer entitlement");

  for (const malformed of [
    { ...rootAction, interactionId: "stale-interaction" },
    { ...rootAction, rootFrameId: "other-frame" },
    { ...rootAction, sourceId: "B" },
    { ...rootAction, targetId: "A" },
    { ...rootAction, rootEventId: "" },
    { ...rootAction, cardKind: "unknown-card" },
  ]) {
    const view = buildPresentationClientView(snapshot({ interaction, rootAction: malformed }), "B");
    assert.equal(view.hasInteraction, true, "invalid root card proof does not erase an independently proven scene");
    assert.equal(view.rootAction, null, "mismatched root card proof fails closed");
  }
  assert.equal(buildPresentationClientView(snapshot({ interaction }), "B").rootAction, null, "absence of root action proof stays empty");
});

test("adapter carries ordered Bumper Harvest progress without exposing the private Negation scanner", () => {
  const targetIds = ["A", "B", "C"];
  const child = scene({
    rootFrameId: "harvest-root",
    activeFrameId: "harvest-negation",
    parentFrameId: "harvest-root",
    stage: "NEGATION",
    effect: "BumperHarvest",
    sourceId: "A",
    targetIds: ["B"],
    currentParticipantId: "B",
    decisionActorId: null,
    activeResolverId: null,
    activeSourceId: "A",
    activeTargetIds: ["B"],
    participantIds: [],
    participantRoles: {
      sourceId: "A", originalTargetIds: ["B"], activeTargetIds: ["B"], currentParticipantId: "B",
      decisionActorId: null, activeResolverId: null, parentParticipantId: null, participantIds: [],
    },
    rootOrigin: { frameId: "harvest-root", stage: "SEQUENTIAL_CHOICE", sourceId: "A", effect: "BumperHarvest", targetIds },
    continuity: { relation: "CHILD_FRAME", parentFrameId: "harvest-root" },
  });
  const progress = {
    semantics: "PROVEN",
    interactionId: "interaction-1",
    rootFrameId: "harvest-root",
    activeFrameId: "harvest-negation",
    checkpointId: "checkpoint-1",
    presentationRevision: 3,
    sourceId: "A",
    rootEventId: "bumper-root-event",
    rootResolutionId: "bumper-root-resolution",
    rootCardId: "bumper-root-card",
    targetIds,
    currentParticipantId: "B",
    currentEffectState: "BLOCKED",
    participants: [
      { playerId: "A", order: 1, status: "RESOLVED", outcome: "NEGATED" },
      { playerId: "B", order: 2, status: "CURRENT" },
      { playerId: "C", order: 3, status: "PENDING" },
    ],
  };
  const client = buildPresentationClientView(snapshot({
    interaction: child,
    stable: { kind: "SPECIAL", interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3, decisionActorId: null },
    decision: null,
    localControl: { source: "CurrentAction", actionRevision: "action-private", kind: "response", actorId: "C", entitled: true },
    bumperHarvestProgress: progress,
    reactionChain: {
      semantics: "PROVEN", interactionId: "interaction-1", frameId: "harvest-negation",
      rootCard: null,
      nodes: [{ nodeId: "submitted-negation", interactionId: "interaction-1", frameId: "harvest-negation", causedByNodeId: null, actorId: "A", kind: "CARD_PLAY", object: { type: "card", cardKind: "Negation" } }],
      publicNodeEventLinks: [{ nodeId: "submitted-negation", eventId: "negation-event", resolutionId: "negation-resolution" }],
    },
  }), "C");
  assert.equal(client.activeResolverId, null);
  assert.equal(client.decisionActorId, null);
  assert.equal(buildPresentationDecisionStatus(client).isLocalDecisionActor, false);
  assert.equal(client.hasLocalControl, true, "private control entitlement stays separate from public Stage roles");
  assert.deepEqual(client.bumperHarvestProgress?.participants.map(({ playerId, status, outcome }) => ({ playerId, status, outcome: outcome ?? null })), [
    { playerId: "A", status: "RESOLVED", outcome: "NEGATED" },
    { playerId: "B", status: "CURRENT", outcome: null },
    { playerId: "C", status: "PENDING", outcome: null },
  ]);
  const stage = buildInteractionStageView(client, (id) => id);
  assert.equal(stage.currentParticipant.id, "B");
  assert.equal(stage.decisionActor.id, null);
  assert.equal(stage.activeResolver.id, null);
  assert.equal(stage.bumperHarvestProgress?.currentParticipantId, "B");
  assert.deepEqual(stage.reactionChainNegationNodes.map(({ actor }) => actor.id), ["A"], "only the actually submitted public Negation node is displayed");

  const mismatched = buildPresentationClientView(snapshot({
    interaction: child,
    stable: { kind: "SPECIAL", interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3, decisionActorId: null },
    bumperHarvestProgress: { ...progress, targetIds: ["C", "B", "A"] },
  }), "C");
  assert.equal(mismatched.bumperHarvestProgress, null, "a reordered participant list fails closed in the client adapter");
});

test("adapter carries only a proven, linked Negation history without adding UI controls", () => {
  const rootFrameId = "negation-frame";
  const interaction = scene({ stage: "NEGATION", rootFrameId, activeFrameId: rootFrameId, effect: "Dismantle" });
  const reactionChain = {
    semantics: "PROVEN",
    interactionId: interaction.interactionId,
    frameId: rootFrameId,
    rootCard: { interactionId: interaction.interactionId, frameId: rootFrameId, sourceId: "A", targetId: "B", cardKind: "Dismantle" },
    nodes: [
      { nodeId: "negation-1", interactionId: interaction.interactionId, frameId: rootFrameId, causedByNodeId: null, actorId: "B", kind: "CARD_PLAY", object: { type: "card", cardKind: "Negation" } },
      { nodeId: "negation-2", interactionId: interaction.interactionId, frameId: rootFrameId, causedByNodeId: "negation-1", actorId: "A", kind: "CARD_PLAY", object: { type: "card", cardKind: "Negation" } },
    ],
    rootEffectState: "ACTIVE",
    publicEventLinks: {
      root: { eventId: "steal-event", resolutionId: "steal-resolution" },
      nodes: [
        { nodeId: "negation-1", eventId: "negation-event-1", resolutionId: "negation-resolution-1" },
        { nodeId: "negation-2", eventId: "negation-event-2", resolutionId: "negation-resolution-2" },
      ],
    },
  };
  const snapshotValue = snapshot({ interaction, reactionChain, decision: { actorId: "B", stage: "NEGATION" } });
  const acting = buildPresentationClientView(snapshotValue, "B");
  const observer = buildPresentationClientView({ ...snapshotValue, localControl: { ...snapshotValue.localControl, actorId: null, entitled: false } }, "C");
  assert.deepEqual(acting.reactionChain, reactionChain);
  assert.deepEqual(acting.reactionChain.publicEventLinks, reactionChain.publicEventLinks);
  assert.deepEqual(observer.reactionChain, acting.reactionChain, "public submitted actions stay viewer-equal");
  assert.equal("options" in acting, false);
  assert.equal("legalActions" in acting, false);
  const stage = buildInteractionStageView(acting, resolveDisplayName);
  assert.deepEqual(stage.reactionChainNegationNodes, [
    { eventId: "negation-event-1", resolutionId: "negation-resolution-1", actor: { id: "B", name: "Zhao Yun", known: true }, cardKind: "Negation", counterTarget: { kind: "ROOT" } },
    { eventId: "negation-event-2", resolutionId: "negation-resolution-2", actor: { id: "A", name: "Ma Chao", known: true }, cardKind: "Negation", counterTarget: { kind: "NEGATION_NODE", index: 0 } },
  ], "validated server causal links become display-safe counter targets without graph IDs");
  const chain = buildReactionChainView(stage);
  assert.deepEqual(chain.publicEventLinks, {
    root: reactionChain.publicEventLinks.root,
    nodes: reactionChain.publicEventLinks.nodes.map(({ eventId, resolutionId }) => ({ eventId, resolutionId })),
  });
  assert.equal(chain.rootEffectState, "ACTIVE");
  assert.deepEqual(chain.negationNodes.map(({ actor, cardKind }) => [actor.name, cardKind]), [
    ["Zhao Yun", "Negation"], ["Ma Chao", "Negation"],
  ], "the linked public order is retained for Stage rendering");
  assert.deepEqual(chain.negationNodes.map(({ counterTarget }) => counterTarget), [
    { kind: "ROOT" }, { kind: "NEGATION_NODE", index: 0 },
  ]);
  assert.equal(chain.root.cardKind, "Dismantle", "the proven logical card identity is available without inferring from its display name");
  const observerChain = buildReactionChainView(buildInteractionStageView(observer, resolveDisplayName));
  assert.deepEqual(observerChain.negationNodes, chain.negationNodes);
  assert.equal(JSON.stringify(chain).includes("negation-1"), false, "internal node IDs are not carried into the display model");
  assert.equal(JSON.stringify(chain).includes("physicalCardId"), false);
  assert.equal(JSON.stringify(chain).includes("CurrentAction"), false);

  for (const rootCard of [
    { ...reactionChain.rootCard, frameId: "other-frame" },
    { ...reactionChain.rootCard, interactionId: "other-interaction" },
    { ...reactionChain.rootCard, sourceId: "other-source" },
    { ...reactionChain.rootCard, targetId: "other-target" },
    { ...reactionChain.rootCard, cardKind: "unknown-card" },
  ]) {
    const unproven = buildPresentationClientView({ ...snapshotValue, reactionChain: { ...reactionChain, rootCard } }, "B");
    assert.equal(unproven.reactionChain?.rootCard, null, "mismatched or unknown root-card facts fail closed without discarding independent response history");
  }

  const malformed = buildPresentationClientView({
    ...snapshotValue,
    reactionChain: { ...reactionChain, nodes: [{ ...reactionChain.nodes[1], causedByNodeId: "missing-predecessor" }] },
  }, "B");
  assert.equal(malformed.reactionChain, null, "a broken predecessor link fails closed");

  for (const publicEventLinks of [
    { ...reactionChain.publicEventLinks, nodes: [{ ...reactionChain.publicEventLinks.nodes[0], nodeId: "other-node" }, reactionChain.publicEventLinks.nodes[1]] },
    { ...reactionChain.publicEventLinks, nodes: [reactionChain.publicEventLinks.nodes[0], { ...reactionChain.publicEventLinks.nodes[1], eventId: "negation-event-1" }] },
  ]) {
    const unlinked = buildPresentationClientView({ ...snapshotValue, reactionChain: { ...reactionChain, publicEventLinks } }, "B");
    assert.equal(unlinked.reactionChain?.publicEventLinks, undefined, "malformed public event links do not reach a graph consumer");
    assert.equal(unlinked.reactionChain?.rootEffectState, undefined, "root disposition is withheld with malformed card links");
    assert.deepEqual(buildReactionChainView(buildInteractionStageView(unlinked, resolveDisplayName)).publicEventLinks, null);
  }
  const invalidDisposition = buildPresentationClientView({ ...snapshotValue, reactionChain: { ...reactionChain, rootEffectState: "CANCELLED" } }, "B");
  assert.equal(invalidDisposition.reactionChain?.rootEffectState, undefined);
});

test("adapter preserves Group Negation target-effect scope only for the current public branch", () => {
  const base = groupProgressSnapshot();
  const interaction = {
    ...base.interaction,
    stage: "NEGATION",
    continuity: { relation: "SAME_FRAME", parentFrameId: null },
  };
  const scope = {
    semantics: "PROVEN",
    relation: "GROUP_TARGET_EFFECT",
    interactionId: interaction.interactionId,
    groupFrameId: interaction.rootFrameId,
    activeFrameId: interaction.activeFrameId,
    checkpointId: interaction.checkpointId,
    presentationRevision: interaction.presentationRevision,
    sourceId: "A",
    cardKind: "RainingArrows",
    targetId: "B",
    effectState: "ACTIVE",
  };
  const reactionChain = {
    semantics: "PROVEN", interactionId: interaction.interactionId, frameId: interaction.activeFrameId,
    rootCard: null,
    nodes: [
      { nodeId: "group-negation-1", interactionId: interaction.interactionId, frameId: interaction.activeFrameId, causedByNodeId: null, actorId: "A", kind: "CARD_PLAY", object: { type: "card", cardKind: "Negation" } },
      { nodeId: "group-negation-2", interactionId: interaction.interactionId, frameId: interaction.activeFrameId, causedByNodeId: "group-negation-1", actorId: "B", kind: "CARD_PLAY", object: { type: "card", cardKind: "Negation" } },
    ],
    groupTargetEffectScope: scope,
    publicEventLinks: {
      root: { eventId: "group-root-event", resolutionId: "group-root-resolution" },
      nodes: [
        { nodeId: "group-negation-1", eventId: "group-negation-event-1", resolutionId: "group-negation-resolution-1" },
        { nodeId: "group-negation-2", eventId: "group-negation-event-2", resolutionId: "group-negation-resolution-2" },
      ],
    },
    publicNodeEventLinks: [
      { nodeId: "group-negation-1", eventId: "group-negation-event-1", resolutionId: "group-negation-resolution-1" },
      { nodeId: "group-negation-2", eventId: "group-negation-event-2", resolutionId: "group-negation-resolution-2" },
    ],
  };
  const snapshotValue = snapshot({
    interaction,
    stable: { ...base.stable, decisionActorId: "B" },
    groupParticipantProgress: base.groupParticipantProgress,
    reactionChain,
    decision: { actorId: "B", stage: "NEGATION" },
  });
  const acting = buildPresentationClientView(snapshotValue, "B");
  const observer = buildPresentationClientView({
    ...snapshotValue,
    localControl: { ...snapshotValue.localControl, actorId: null, entitled: false },
  }, "C");
  assert.deepEqual(acting.reactionChain?.groupTargetEffectScope, scope);
  assert.deepEqual(observer.reactionChain?.groupTargetEffectScope, scope, "the public branch relation is viewer-equal");
  const stage = buildInteractionStageView(acting, resolveDisplayName);
  assert.deepEqual(stage.reactionChainGroupTargetEffectScope, scope);
  const chain = buildReactionChainView(stage);
  assert.deepEqual(chain.groupTargetEffectScope, scope);
  assert.deepEqual(chain.negationNodes.map(({ counterTarget }) => counterTarget), [
    { kind: "GROUP_TARGET_EFFECT", targetId: "B" },
    { kind: "NEGATION_NODE", index: 0 },
  ], "Group-root Negation nodes retain proven target-effect and nested-response counter links");

  for (const malformedScope of [undefined, { ...scope, targetId: "C" }, { ...scope, groupFrameId: "other-frame" }, { ...scope, presentationRevision: 4 }, { ...scope, effectState: "BLOCKED" }]) {
    const malformed = buildPresentationClientView({
      ...snapshotValue,
      reactionChain: { ...reactionChain, groupTargetEffectScope: malformedScope },
    }, "B");
    assert.equal(malformed.reactionChain, null, "missing or mismatched target-effect scope fails closed");
  }
});

test("adapter carries validated ordered Standard AOE progress through root and child frames", () => {
  for (const child of [false, true]) {
    const view = buildPresentationClientView(groupProgressSnapshot({ child }), "D");
    assert.equal(view.hasInteraction, true);
    assert.equal(view.groupResolution.resolutionSemantics, "GROUP");
    assert.deepEqual(view.groupParticipantProgress.map(({ playerId, order, status }) => ({ playerId, order, status })), [
      { playerId: "C", order: 1, status: "RESOLVED" },
      { playerId: "B", order: 2, status: child ? "PAUSED" : "CURRENT" },
      { playerId: "E", order: 3, status: "PENDING" },
      { playerId: "D", order: 4, status: "PENDING" },
    ]);
    const stage = buildInteractionStageView(view, resolveDisplayName);
    const focus = projectHeroFocusForViewer(stage, buildHeroFocusView(stage), "D");
    const source = projectMediumSourceForViewer(stage, focus, "D");
    const scope = projectGroupTargetScopeForViewer(stage, focus, source, "D");
    assert.equal(scope?.hasProgress, true);
    assert.equal(scope?.density, "compact");
    assert.deepEqual(scope?.players.map(({ id, order, status, isViewer }) => ({ id, order, status, isViewer })), [
      { id: "C", order: 1, status: "RESOLVED", isViewer: false },
      { id: "B", order: 2, status: child ? "PAUSED" : "CURRENT", isViewer: false },
      { id: "E", order: 3, status: "PENDING", isViewer: false },
      { id: "D", order: 4, status: "PENDING", isViewer: true },
    ]);
  }
});

test("adapter carries only a proven Raining Arrows Avoided outcome to the public participant scope", () => {
  const view = buildPresentationClientView(groupProgressSnapshot({ outcome: "AVOIDED" }), "D");
  assert.equal(view.groupParticipantProgress[0].outcome, "AVOIDED");
  const stage = buildInteractionStageView(view, resolveDisplayName);
  const focus = projectHeroFocusForViewer(stage, buildHeroFocusView(stage), "D");
  const source = projectMediumSourceForViewer(stage, focus, "D");
  const scope = projectGroupTargetScopeForViewer(stage, focus, source, "D");
  assert.equal(scope?.players[0].outcome, "AVOIDED");

  const currentOutcome = { ...view.groupParticipantProgress[0], status: "CURRENT" };
  const malformed = buildPresentationClientView(snapshot({
    groupParticipantProgress: { ...view.groupResolution, participants: [currentOutcome, ...view.groupParticipantProgress.slice(1)] },
  }), "D");
  assert.deepEqual(malformed.groupParticipantProgress, [], "an active participant cannot already have a completed outcome");
});

test("Oath recipient view preserves simultaneous projected membership without participant progress", () => {
  const interaction = scene({
    stage: "NEGATION",
    effect: "Oath of the Peach Garden",
    targetIds: ["A"],
    activeTargetIds: ["A"],
    currentParticipantId: null,
    decisionActorId: null,
    activeResolverId: null,
    participantIds: ["A", "B", "C"],
    participantRoles: {
      sourceId: "A", originalTargetIds: ["A"], activeTargetIds: ["A"], currentParticipantId: null,
      decisionActorId: null, activeResolverId: null, parentParticipantId: null, participantIds: ["A", "B", "C"],
    },
  });
  const oathRecipientScope = {
    semantics: "PROVEN",
    cardKind: "Oath",
    interactionId: interaction.interactionId,
    rootFrameId: interaction.rootFrameId,
    activeFrameId: interaction.activeFrameId,
    checkpointId: interaction.checkpointId,
    presentationRevision: interaction.presentationRevision,
    rootEventId: "oath-root-event",
    rootResolutionId: "oath-root-resolution",
    effectState: "ACTIVE",
    sourceId: "A",
    recipientIds: ["A", "C"],
  };
  const reactionChain = {
    semantics: "PROVEN",
    interactionId: interaction.interactionId,
    frameId: interaction.activeFrameId,
    rootCard: null,
    nodes: [],
    publicNodeEventLinks: [],
  };
  const client = buildPresentationClientView(snapshot({
    interaction,
    oathRecipientScope,
    reactionChain,
    stable: { ...snapshot().stable, decisionActorId: null },
    decision: null,
  }), "C");
  const stage = buildInteractionStageView(client, resolveDisplayName);
  const display = (id) => ({ name: displayNames[id] ?? null, heroId: id === "A" ? "ma-chao" : "cao-cao" });
  const projected = projectOathRecipientScopeForStage(stage, client.oathRecipientScope, "C", display);
  assert.deepEqual(projected, {
    density: "medium",
    recipients: [
      { id: "A", name: "Ma Chao", heroId: "ma-chao", isViewer: false },
      { id: "C", name: "Cao Cao", heroId: "cao-cao", isViewer: true },
    ],
  });
  assert.equal("currentParticipantId" in projected, false);
  assert.equal(projectOathRecipientScopeForStage(stage, { ...oathRecipientScope, sourceId: "B" }, "C", display), null);
  assert.equal(projectOathRecipientScopeForStage(stage, { ...oathRecipientScope, recipientIds: ["A", "A"] }, "C", display), null);
});

test("adapter carries only proven resolved Group damage outcomes", () => {
  const view = buildPresentationClientView(groupProgressSnapshot({ outcome: "DAMAGED" }), "D");
  assert.equal(view.groupParticipantProgress[0].outcome, "DAMAGED");
  const stage = buildInteractionStageView(view, resolveDisplayName);
  const focus = projectHeroFocusForViewer(stage, buildHeroFocusView(stage), "D");
  const source = projectMediumSourceForViewer(stage, focus, "D");
  assert.equal(projectGroupTargetScopeForViewer(stage, focus, source, "D")?.players[0].outcome, "DAMAGED");

  const barbarian = buildPresentationClientView(groupProgressSnapshot({ cardKind: "BarbarianInvasion", outcome: "DAMAGED" }), "D");
  assert.equal(barbarian.groupParticipantProgress[0].outcome, "DAMAGED");
  const barbarianAvoided = buildPresentationClientView(groupProgressSnapshot({ cardKind: "BarbarianInvasion", outcome: "AVOIDED" }), "D");
  assert.deepEqual(barbarianAvoided.groupParticipantProgress, [], "Barbarian Invasion cannot claim an Avoided outcome");

  for (const cardKind of ["RainingArrows", "BarbarianInvasion"]) {
    const negated = buildPresentationClientView(groupProgressSnapshot({ cardKind, outcome: "NEGATED" }), "D");
    assert.equal(negated.groupParticipantProgress[0].outcome, "NEGATED");
    const stage = buildInteractionStageView(negated, resolveDisplayName);
    const focus = projectHeroFocusForViewer(stage, buildHeroFocusView(stage), "D");
    const source = projectMediumSourceForViewer(stage, focus, "D");
    assert.equal(projectGroupTargetScopeForViewer(stage, focus, source, "D")?.players[0].outcome, "NEGATED");

    const defeated = buildPresentationClientView(groupProgressSnapshot({ cardKind, outcome: "DEFEATED" }), "D");
    assert.equal(defeated.groupParticipantProgress[0].outcome, "DEFEATED");
    const defeatedStage = buildInteractionStageView(defeated, resolveDisplayName);
    const defeatedFocus = projectHeroFocusForViewer(defeatedStage, buildHeroFocusView(defeatedStage), "D");
    const defeatedSource = projectMediumSourceForViewer(defeatedStage, defeatedFocus, "D");
    assert.equal(projectGroupTargetScopeForViewer(defeatedStage, defeatedFocus, defeatedSource, "D")?.players[0].outcome, "DEFEATED");
  }

  const activeOutcome = buildPresentationClientView(snapshot({
    groupParticipantProgress: {
      ...view.groupResolution,
      participants: [{ ...view.groupParticipantProgress[0], status: "PAUSED" }, ...view.groupParticipantProgress.slice(1)],
    },
  }), "D");
  assert.deepEqual(activeOutcome.groupParticipantProgress, [], "a paused participant cannot publish a completed damage outcome");
});

test("adapter carries explicit ORDERED Halberd progress without deriving it from seats", () => {
  const aoe = groupProgressSnapshot();
  const halberd = {
    ...aoe,
    interaction: scene({
      ...aoe.interaction,
      stage: "ATTACK_RESPONSE",
      effect: "Attack",
    }),
    groupParticipantProgress: {
      ...aoe.groupParticipantProgress,
      cardKind: "SkyPiercingHalberdAttack",
      resolutionSemantics: "ORDERED",
      targetIds: ["C", "B", "E", "D"],
    },
  };
  const view = buildPresentationClientView(halberd, "D");
  assert.equal(view.groupResolution.resolutionSemantics, "ORDERED");
  assert.deepEqual(view.groupResolution.participants.map(({ playerId, order }) => ({ playerId, order })), [
    { playerId: "C", order: 1 }, { playerId: "B", order: 2 }, { playerId: "E", order: 3 }, { playerId: "D", order: 4 },
  ]);
  assert.deepEqual(view.groupParticipantProgress, [], "ordered target state does not leak into the existing AOE Stage consumer");
  const stage = buildInteractionStageView(view, resolveDisplayName);
  assert.deepEqual(stage.groupParticipantProgress, []);
  assert.deepEqual(stage.orderedTargetProgress.map(({ playerId, order, status }) => ({ playerId, order, status })), [
    { playerId: "C", order: 1, status: "RESOLVED" },
    { playerId: "B", order: 2, status: "CURRENT" },
    { playerId: "E", order: 3, status: "PENDING" },
    { playerId: "D", order: 4, status: "PENDING" },
  ]);
  const focus = projectHeroFocusForViewer(stage, buildHeroFocusView(stage), "D");
  const source = projectMediumSourceForViewer(stage, focus, "D");
  const orderedScope = projectGroupTargetScopeForViewer(stage, focus, source, "D", resolveDisplayName);
  assert.equal(orderedScope?.resolutionSemantics, "ORDERED");
  assert.deepEqual(orderedScope?.players.map(({ id, order }) => ({ id, order })), [
    { id: "C", order: 1 }, { id: "B", order: 2 }, { id: "E", order: 3 }, { id: "D", order: 4 },
  ]);
});

test("adapter drops AOE progress when its frame, identity, scope, order, or status is incoherent", () => {
  const valid = groupProgressSnapshot();
  const progress = valid.groupParticipantProgress;
  const malformed = [
    { ...progress, cardKind: "UnknownGroup" },
    { ...progress, resolutionSemantics: "INVALID" },
    { ...progress, interactionId: "other-interaction" },
    { ...progress, groupFrameId: "other-root" },
    { ...progress, activeFrameId: "other-active" },
    { ...progress, targetIds: [...progress.targetIds].reverse() },
    { ...progress, participants: [...progress.participants].reverse() },
    { ...progress, participants: [{ ...progress.participants[0], status: "INVALID" }, ...progress.participants.slice(1)] },
    { ...progress, participants: [progress.participants[0], { ...progress.participants[1], outcome: "AVOIDED" }, ...progress.participants.slice(2)] },
  ];
  for (const groupParticipantProgress of malformed) {
    const view = buildPresentationClientView(snapshot({ groupParticipantProgress }), "D");
    assert.equal(view.hasInteraction, true, "unrelated public Stage remains available");
    assert.deepEqual(view.groupParticipantProgress, []);
  }
});

test("adapter exposes only identity-coherent Oath recipient scope and no invented participant progress", () => {
  const oathInteraction = scene({
    rootFrameId: "oath-frame",
    activeFrameId: "oath-frame",
    stage: "NEGATION",
    effect: "Oath of the Peach Garden",
  });
  const oathRecipientScope = {
    semantics: "PROVEN",
    cardKind: "Oath",
    interactionId: oathInteraction.interactionId,
    rootFrameId: oathInteraction.rootFrameId,
    activeFrameId: oathInteraction.activeFrameId,
    checkpointId: oathInteraction.checkpointId,
    presentationRevision: oathInteraction.presentationRevision,
    rootEventId: "oath-root-event",
    rootResolutionId: "oath-root-resolution",
    effectState: "ACTIVE",
    sourceId: oathInteraction.sourceId,
    recipientIds: ["A", "C"],
  };
  const reactionChain = {
    semantics: "PROVEN",
    interactionId: oathInteraction.interactionId,
    frameId: oathInteraction.activeFrameId,
    rootCard: null,
    nodes: [],
    publicNodeEventLinks: [],
  };
  const projected = buildPresentationClientView(snapshot({ interaction: oathInteraction, oathRecipientScope, reactionChain }), "B");
  assert.deepEqual(projected.oathRecipientScope, oathRecipientScope);
  assert.equal("currentParticipantId" in projected.oathRecipientScope, false);
  assert.deepEqual(buildPresentationClientView(snapshot({ interaction: oathInteraction, oathRecipientScope: { ...oathRecipientScope, interactionId: "stale" }, reactionChain }), "B").oathRecipientScope, null);
  assert.deepEqual(buildPresentationClientView(snapshot({ interaction: oathInteraction, oathRecipientScope: { ...oathRecipientScope, recipientIds: ["A", "A"] }, reactionChain }), "B").oathRecipientScope, null);
  assert.deepEqual(buildPresentationClientView(snapshot({ interaction: oathInteraction, oathRecipientScope, reactionChain: { ...reactionChain, publicNodeEventLinks: undefined } }), "B").oathRecipientScope, null);
});

test("Bumper Harvest composition consumes only the proven ordered root and keeps a source-viewer copy Dock-only", () => {
  const targetIds = ["A", "B", "C"];
  const interaction = scene({
    rootFrameId: "harvest-root",
    activeFrameId: "harvest-root",
    stage: "SEQUENTIAL_CHOICE",
    effect: "BumperHarvest",
    targetIds,
    currentParticipantId: "B",
    decisionActorId: "B",
    activeResolverId: "B",
    activeTargetIds: ["B"],
    participantIds: targetIds,
    participantRoles: {
      sourceId: "A", originalTargetIds: targetIds, activeTargetIds: ["B"], currentParticipantId: "B",
      decisionActorId: "B", activeResolverId: "B", parentParticipantId: null, participantIds: targetIds,
    },
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
  });
  const bumperHarvestProgress = {
    semantics: "PROVEN",
    interactionId: interaction.interactionId,
    rootFrameId: interaction.rootFrameId,
    activeFrameId: interaction.activeFrameId,
    checkpointId: interaction.checkpointId,
    presentationRevision: interaction.presentationRevision,
    sourceId: "A",
    rootEventId: "bumper-root-event",
    rootResolutionId: "bumper-root-resolution",
    rootCardId: "bumper-root-card",
    targetIds,
    currentParticipantId: "B",
    participants: [
      { playerId: "A", order: 1, status: "RESOLVED", outcome: "CHOSE_CARD" },
      { playerId: "B", order: 2, status: "CURRENT" },
      { playerId: "C", order: 3, status: "PENDING" },
    ],
  };
  const stable = { kind: "CHOICE", interactionId: interaction.interactionId, checkpointId: interaction.checkpointId, presentationRevision: 3, decisionActorId: "B" };
  const publicView = buildPresentationClientView(snapshot({ interaction, stable, decision: { actorId: "B", stage: "SEQUENTIAL_CHOICE" }, bumperHarvestProgress }), "A");
  const resolveDisplay = (id) => ({ name: `Player ${id}`, heroId: id === "A" ? "cao-cao" : "liu-bei" });
  const stage = buildInteractionStageView(publicView, (id) => `Player ${id}`);
  const composition = projectBumperHarvestStageCompositionForViewer(stage, "A", resolveDisplay);
  assert.ok(composition, JSON.stringify({ publicProgress: publicView.bumperHarvestProgress, stage }, null, 2));
  assert.equal(composition.source, null, "the source-viewer remains Dock-only");
  assert.deepEqual(composition.participants.map(({ id, order, status, outcome, isViewer }) => ({ id, order, status, outcome: outcome ?? null, isViewer })), [
    { id: "A", order: 1, status: "RESOLVED", outcome: "CHOSE_CARD", isViewer: true },
    { id: "B", order: 2, status: "CURRENT", outcome: null, isViewer: false },
    { id: "C", order: 3, status: "PENDING", outcome: null, isViewer: false },
  ]);
  assert.equal(composition.currentParticipantId, "B");

  const reorderedProgress = { ...bumperHarvestProgress, targetIds: [...targetIds].reverse() };
  const mismatchedStage = buildInteractionStageView(buildPresentationClientView(snapshot({ interaction, stable, bumperHarvestProgress: reorderedProgress }), "A"), (id) => `Player ${id}`);
  assert.equal(projectBumperHarvestStageCompositionForViewer(mismatchedStage, "A", resolveDisplay), null, "a scope/order mismatch cannot claim the compact composition");
});

test("adapter keeps the public scene viewer-equal while local entitlement changes", () => {
  const acting = buildPresentationClientView(snapshot(), "B");
  const uninvolved = buildPresentationClientView(snapshot({ localControl: { ...snapshot().localControl, actorId: null, entitled: false } }), "C");
  assert.deepEqual({
    interactionId: uninvolved.interactionId,
    checkpointId: uninvolved.checkpointId,
    stage: uninvolved.stage,
    sourceId: uninvolved.sourceId,
    originalTargetIds: uninvolved.originalTargetIds,
    activeTargetIds: uninvolved.activeTargetIds,
    decisionActorId: uninvolved.decisionActorId,
  }, {
    interactionId: acting.interactionId,
    checkpointId: acting.checkpointId,
    stage: acting.stage,
    sourceId: acting.sourceId,
    originalTargetIds: acting.originalTargetIds,
    activeTargetIds: acting.activeTargetIds,
    decisionActorId: acting.decisionActorId,
  });
  assert.equal(uninvolved.isLocalDecisionActor, false);
  assert.equal(uninvolved.hasLocalControl, false);
});

test("semantic transition classifier follows interaction, frame, focus, content hierarchy", () => {
  const base = semanticView();
  assert.equal(buildPresentationTransition(base, base).kind, "NONE");
  assert.equal(buildPresentationTransition(null, base).kind, "INTERACTION_TRANSITION");
  assert.equal(buildPresentationTransition(restView(), base).reason, "INTERACTION_STARTED");
  assert.equal(buildPresentationTransition(base, restView()).reason, "INTERACTION_ENDED");

  const content = semanticView({ checkpointId: "checkpoint-2", presentationRevision: 4 });
  const contentTransition = buildPresentationTransition(base, content);
  assert.equal(contentTransition.kind, "CONTENT_UPDATE");
  assert.equal(contentTransition.reason, "CHECKPOINT_CHANGED");
  const revisionOnly = semanticView({ presentationRevision: 4 });
  assert.equal(buildPresentationTransition(base, revisionOnly).reason, "PRESENTATION_REVISION_CHANGED");

  const duelResponder = semanticView({ stage: "DUEL_EXCHANGE", currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C" });
  assert.equal(buildPresentationTransition(semanticView({ stage: "DUEL_EXCHANGE" }), duelResponder).kind, "FOCUS_UPDATE");
  assert.equal(buildPresentationTransition(semanticView({ stage: "DUEL_EXCHANGE" }), duelResponder).reason, "CURRENT_PARTICIPANT_CHANGED");

  const groupStart = semanticView({ stage: "GROUP_RESOLUTION", activeFrameId: "group-frame", rootFrameId: "group-frame", activeTargetIds: ["B"], currentParticipantId: "B", decisionActorId: "B", activeResolverId: "B", participantIds: ["A", "B", "C"] });
  const groupNext = semanticView({ stage: "GROUP_RESOLUTION", activeFrameId: "group-frame", rootFrameId: "group-frame", activeTargetIds: ["C"], currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C", participantIds: ["A", "B", "C"] });
  assert.equal(buildPresentationTransition(groupStart, groupNext).kind, "FOCUS_UPDATE");
  assert.equal(buildPresentationTransition(groupStart, groupNext).reason, "CURRENT_PARTICIPANT_CHANGED");

  const negation = semanticView({ stage: "NEGATION", effect: "Dismantle", activeFrameId: "negation-frame", rootFrameId: "negation-frame", currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C" });
  const counterNegation = semanticView({ stage: "NEGATION", effect: "Dismantle", activeFrameId: "negation-frame", rootFrameId: "negation-frame", currentParticipantId: "B", decisionActorId: "B", activeResolverId: "B" });
  assert.equal(buildPresentationTransition(negation, counterNegation).kind, "FOCUS_UPDATE");

  const damage = semanticView({ stage: "DAMAGE", rootFrameId: "group-frame", activeFrameId: "damage-frame", parentFrameId: "group-frame", continuity: { relation: "CHILD_FRAME", parentFrameId: "group-frame" } });
  const dying = semanticView({ stage: "DYING", rootFrameId: "group-frame", activeFrameId: "dying-frame", parentFrameId: "damage-frame", continuity: { relation: "CHILD_FRAME", parentFrameId: "damage-frame" } });
  const resumed = semanticView({ stage: "GROUP_RESOLUTION", rootFrameId: "group-frame", activeFrameId: "group-frame", parentFrameId: null, continuity: { relation: "ROOT_FRAME", parentFrameId: null } });
  assert.equal(buildPresentationTransition(damage, dying).kind, "FRAME_TRANSITION");
  assert.equal(buildPresentationTransition(dying, resumed).kind, "FRAME_TRANSITION");

  const newInteraction = semanticView({ interactionId: "interaction-2", rootFrameId: "new-root", activeFrameId: "new-frame" });
  assert.equal(buildPresentationTransition(base, newInteraction).kind, "INTERACTION_TRANSITION");
  assert.equal(buildPresentationTransition(base, newInteraction).reason, "INTERACTION_CHANGED");
});

test("semantic transition classifier ignores private and legacy changes and fails closed", () => {
  const base = semanticView();
  const privateOnly = semanticView({}, { localControl: { actorId: "A", actionRevision: "private-2", entitled: false }, meId: "A" });
  assert.equal(buildPresentationTransition(base, privateOnly).kind, "NONE");

  const legacyOnly = buildPresentationClientView({
    ...snapshot(),
    pending: { kind: "dying", targetId: "C" },
    timeline: [{ id: "legacy" }],
    actionPlayerId: "C",
    turnSeat: 2,
    isMyTurn: true,
    currentAction: { actorId: "C", kind: "dying" },
    players: [{ id: "B", hp: 0 }],
    hand: [{ id: "private-card" }],
    localControl: { ...snapshot().localControl, actionRevision: "private-3", entitled: false, options: [{ providerId: "private-option" }] },
  }, "A");
  assert.equal(buildPresentationTransition(base, legacyOnly).kind, "NONE");

  const malformed = { ...base, activeFrameId: null };
  const failedClosed = buildPresentationTransition(base, malformed);
  assert.equal(failedClosed.kind, "NONE");
  assert.equal(failedClosed.previousInteractionId, null);
  assert.equal(failedClosed.nextInteractionId, null);
  assert.equal(buildPresentationTransition({ ...base, continuity: { relation: "UNPROVEN", parentFrameId: null } }, base).kind, "NONE");
});

test("adapter keeps local action revision but does not infer public interaction from identity-free REST", () => {
  const view = buildPresentationClientView(snapshot({
    identity: null,
    interaction: null,
    decision: null,
    stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
    localControl: { source: "CurrentAction", actionRevision: "turn-1", kind: "turn", actorId: "B", entitled: true },
  }), "B");
  assert.equal(view.hasInteraction, false);
  assert.deepEqual({
    interactionId: view.interactionId,
    checkpointId: view.checkpointId,
    presentationRevision: view.presentationRevision,
    stage: view.stage,
    sourceId: view.sourceId,
    originalTargetIds: view.originalTargetIds,
    activeTargetIds: view.activeTargetIds,
    currentParticipantId: view.currentParticipantId,
    decisionActorId: view.decisionActorId,
    activeResolverId: view.activeResolverId,
    participantIds: view.participantIds,
    stableKind: view.stableKind,
  }, {
    interactionId: null,
    checkpointId: null,
    presentationRevision: null,
    stage: null,
    sourceId: null,
    originalTargetIds: [],
    activeTargetIds: [],
    currentParticipantId: null,
    decisionActorId: null,
    activeResolverId: null,
    participantIds: [],
    stableKind: "REST",
  });
  assert.equal(view.hasLocalControl, true);
  assert.equal(view.localActionRevision, "turn-1");
});

test("typed Negation settlement is root-scoped and REST preserves outcome metadata without an active interaction", () => {
  const rootScene = scene({ rootFrameId: "root-frame", activeFrameId: "root-frame" });
  const restored = buildPresentationClientView(snapshot({
    interaction: rootScene,
    settlement: negationSettlement("ROOT_RESTORED"),
  }), "C");
  assert.equal(restored.negationSettlement?.outcome, "ROOT_RESTORED");

  const mismatchedRoot = buildPresentationClientView(snapshot({
    interaction: rootScene,
    settlement: negationSettlement("ROOT_RESTORED", { rootFrameId: "other-root" }),
  }), "C");
  assert.equal(mismatchedRoot.negationSettlement, undefined, "a settlement for another root cannot activate this Stage");

  const restSnapshot = snapshot({
    identity: null,
    interaction: null,
    decision: null,
    stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
    settlement: negationSettlement("ROOT_CANCELLED"),
  });
  assert.equal(buildPresentationClientView(restSnapshot, "C").negationSettlement?.outcome, "ROOT_CANCELLED");
  const restoredRestView = buildPresentationClientView({ ...restSnapshot, settlement: negationSettlement("ROOT_RESTORED") }, "C");
  assert.equal(restoredRestView.negationSettlement?.outcome, "ROOT_RESTORED", "validated settlement metadata survives the brief REST boundary");
  assert.equal(restoredRestView.hasInteraction, false, "settlement metadata alone does not claim an active interaction");
  assert.equal(restoredRestView.stableKind, "REST");
  assert.equal(restoredRestView.stage, null);
  assert.deepEqual(restoredRestView.activeTargetIds, []);
  assert.equal(buildPresentationClientView({ ...restSnapshot, settlement: negationSettlement("ROOT_CANCELLED", { rootCardKind: "Oath" }) }, "C").negationSettlement, undefined,
    "multi-target cards are not accepted by the single-target settlement view");
});

test("adapter exposes child-frame continuity without reconstructing a parent", () => {
  const view = buildPresentationClientView(snapshot({
    interaction: scene({ parentFrameId: "parent-frame", continuity: { relation: "CHILD_FRAME", parentFrameId: "parent-frame" } }),
  }), "C");
  assert.deepEqual(view.continuity, { relation: "CHILD_FRAME", parentFrameId: "parent-frame" });
  assert.equal(view.parentFrameId, "parent-frame");
});

test("adapter is deterministic, non-mutating, and independent of legacy compatibility data", () => {
  const input = snapshot({ pending: { kind: "response", actorId: "legacy" }, timeline: [{ id: "legacy-event" }], presentationV2: { stableBoundary: { kind: "SETTLEMENT" } } });
  const before = structuredClone(input);
  const first = buildPresentationClientView(input, "B");
  const second = buildPresentationClientView(input, "B");
  const legacyChanged = buildPresentationClientView({ ...input, pending: { kind: "dying", targetId: "other" }, timeline: [{ id: "different-event" }], presentationV2: { stableBoundary: { kind: "REST" } } }, "B");
  assert.deepEqual(second, first);
  assert.deepEqual(legacyChanged, first);
  assert.deepEqual(input, before);
});

test("adapter fails closed for partial authority instead of reconstructing it from fallbacks", () => {
  const partial = snapshot({
    interaction: { semantics: "PROVEN", interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3 },
    pending: { kind: "response", actorId: "B" },
    timeline: [{ id: "event-with-a-plausible-id" }],
    presentationV2: { interactionScene: scene() },
  });
  const view = buildPresentationClientView(partial, "B");
  assert.equal(view.hasInteraction, false);
  assert.equal(view.stableKind, "REST");
  assert.equal(view.interactionId, null);
  assert.deepEqual(view.originalTargetIds, []);
  assert.equal(view.isLocalDecisionActor, true, "private entitlement remains local without recreating public authority");
});

test("semantic seat roles preserve ordinary target-owned and source-owned ownership", () => {
  const ordinary = buildPresentationClientView(snapshot(), "B");
  assert.deepEqual(projectInteractionSeatRoles(ordinary, "A"), {
    isInteractionSource: true,
    isOriginalTarget: false,
    isActiveTarget: false,
    isCurrentParticipant: false,
    isDecisionActor: false,
    isActiveResolver: true,
    isViewerDecisionActor: false,
  });
  assert.deepEqual(projectInteractionSeatRoles(ordinary, "B"), {
    isInteractionSource: false,
    isOriginalTarget: true,
    isActiveTarget: true,
    isCurrentParticipant: true,
    isDecisionActor: true,
    isActiveResolver: false,
    isViewerDecisionActor: true,
  });

  const sourceOwned = buildPresentationClientView(snapshot({
    stable: { ...snapshot().stable, decisionActorId: "A" },
    interaction: scene({ decisionActorId: "A", activeResolverId: "B", participantRoles: { ...scene().participantRoles, decisionActorId: "A", activeResolverId: "B" } }),
    decision: { actorId: "A", stage: "ATTACK_RESPONSE" },
    localControl: { ...snapshot().localControl, actorId: "A", entitled: true },
  }), "A");
  assert.deepEqual(projectInteractionSeatRoles(sourceOwned, "A"), {
    isInteractionSource: true,
    isOriginalTarget: false,
    isActiveTarget: false,
    isCurrentParticipant: false,
    isDecisionActor: true,
    isActiveResolver: false,
    isViewerDecisionActor: true,
  });
  assert.deepEqual(projectInteractionSeatRoles(sourceOwned, "B"), {
    isInteractionSource: false,
    isOriginalTarget: true,
    isActiveTarget: true,
    isCurrentParticipant: true,
    isDecisionActor: false,
    isActiveResolver: true,
    isViewerDecisionActor: false,
  });
});

test("open Negation seat roles do not expose the private response actor or resolver", () => {
  const negation = buildPresentationClientView(snapshot({
    interaction: scene({ stage: "NEGATION", effect: "Dismantle", decisionActorId: "C", activeResolverId: "C", participantRoles: { ...scene().participantRoles, decisionActorId: "C", activeResolverId: "C" } }),
    stable: { ...snapshot().stable, decisionActorId: "C" },
    decision: { actorId: "C", stage: "NEGATION" },
    localControl: { ...snapshot().localControl, actorId: null, entitled: false },
  }), "A");
  assert.equal(projectInteractionSeatRoles(negation, "C").isDecisionActor, false);
  assert.equal(projectInteractionSeatRoles(negation, "C").isActiveResolver, false);
  assert.equal(projectInteractionSeatRoles(negation, "C").isViewerDecisionActor, false);
  assert.equal(projectInteractionSeatRoles(negation, "B").isActiveTarget, true);
});

test("semantic seat roles preserve Group/AOE, child-frame, Dying, and overlapping facts", () => {
  const group = buildPresentationClientView(snapshot({
    interaction: scene({ stage: "GROUP_RESOLUTION", targetIds: ["B", "C", "A"], activeTargetIds: ["C"], currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C", participantRoles: { ...scene().participantRoles, originalTargetIds: ["B", "C", "A"], activeTargetIds: ["C"], currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C", participantIds: ["A", "B", "C"] } }),
    stable: { ...snapshot().stable, decisionActorId: "C" },
    decision: { actorId: "C", stage: "GROUP_RESOLUTION" },
  }), "A");
  assert.deepEqual(projectInteractionSeatRoles(group, "B"), {
    isInteractionSource: false,
    isOriginalTarget: true,
    isActiveTarget: false,
    isCurrentParticipant: false,
    isDecisionActor: false,
    isActiveResolver: false,
    isViewerDecisionActor: false,
  });
  assert.deepEqual(projectInteractionSeatRoles(group, "C"), {
    isInteractionSource: false,
    isOriginalTarget: true,
    isActiveTarget: true,
    isCurrentParticipant: true,
    isDecisionActor: true,
    isActiveResolver: true,
    isViewerDecisionActor: false,
  });

  const childDying = buildPresentationClientView(snapshot({
    interaction: scene({ stage: "DYING", parentFrameId: "damage-frame", continuity: { relation: "CHILD_FRAME", parentFrameId: "damage-frame" }, currentParticipantId: "B", decisionActorId: "B", activeResolverId: "B", participantRoles: { ...scene().participantRoles, currentParticipantId: "B", decisionActorId: "B", activeResolverId: "B" } }),
    stable: { ...snapshot().stable, decisionActorId: "B" },
    decision: { actorId: "B", stage: "DYING" },
  }), "A");
  assert.equal(childDying.continuity.relation, "CHILD_FRAME");
  assert.equal(projectInteractionSeatRoles(childDying, "B").isCurrentParticipant, true);
  assert.equal(projectInteractionSeatRoles(childDying, "B").isDecisionActor, true);

  const overlap = buildPresentationClientView(snapshot({
    interaction: scene({ sourceId: "A", targetIds: ["A"], activeTargetIds: ["A"], currentParticipantId: "A", decisionActorId: "A", activeResolverId: "A", participantRoles: { ...scene().participantRoles, sourceId: "A", originalTargetIds: ["A"], activeTargetIds: ["A"], currentParticipantId: "A", decisionActorId: "A", activeResolverId: "A" } }),
    stable: { ...snapshot().stable, decisionActorId: "A" },
    decision: { actorId: "A", stage: "ATTACK_RESPONSE" },
    localControl: { ...snapshot().localControl, actorId: "A", entitled: true },
  }), "A");
  assert.deepEqual(projectInteractionSeatRoles(overlap, "A"), {
    isInteractionSource: true,
    isOriginalTarget: true,
    isActiveTarget: true,
    isCurrentParticipant: true,
    isDecisionActor: true,
    isActiveResolver: true,
    isViewerDecisionActor: true,
  });
});

test("semantic seat roles are viewer-equal, legacy-independent, and empty in REST", () => {
  const actingView = buildPresentationClientView(snapshot(), "B");
  const uninvolvedView = buildPresentationClientView(snapshot({ localControl: { ...snapshot().localControl, actorId: null, entitled: false } }), "C");
  for (const playerId of ["A", "B", "C"]) {
    const acting = projectInteractionSeatRoles(actingView, playerId);
    const uninvolved = projectInteractionSeatRoles(uninvolvedView, playerId);
    assert.deepEqual({ ...acting, isViewerDecisionActor: false }, { ...uninvolved, isViewerDecisionActor: false });
  }
  assert.equal(projectInteractionSeatRoles(actingView, "B").isViewerDecisionActor, true);
  assert.equal(projectInteractionSeatRoles(uninvolvedView, "B").isViewerDecisionActor, false);

  const legacyChanged = buildPresentationClientView(snapshot({ pending: { kind: "dying", targetId: "C" }, timeline: [{ id: "legacy-event" }], presentationV2: { stableBoundary: { kind: "REST" } }, currentAction: { actorId: "C" }, phase: "dying", actionPlayerId: "C", actionReason: "legacy" }), "B");
  assert.deepEqual(projectInteractionSeatRoles(legacyChanged, "A"), projectInteractionSeatRoles(actingView, "A"));
  assert.deepEqual(projectInteractionSeatRoles(legacyChanged, "B"), projectInteractionSeatRoles(actingView, "B"));

  const rest = buildPresentationClientView(snapshot({ identity: null, interaction: null, decision: null, stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null } }), "B");
  for (const playerId of ["A", "B", "C"]) assert.deepEqual(projectInteractionSeatRoles(rest, playerId), {
    isInteractionSource: false,
    isOriginalTarget: false,
    isActiveTarget: false,
    isCurrentParticipant: false,
    isDecisionActor: false,
    isActiveResolver: false,
    isViewerDecisionActor: false,
  });
});

function decisionRoom(overrides = {}) {
  return {
    players: [{ id: "source", name: "SOURCE", seat: 0 }, { id: "target", name: "TARGET", seat: 1 }],
    meId: "source",
    turnSeat: 0,
    phase: "response",
    status: "playing",
    actionPlayerId: "legacy-player",
    actionReason: "legacy reason",
    isMyAction: false,
    currentAction: { version: 3, kind: "response", actorId: "legacy-player", deadline: 0, reason: "legacy action", legalActions: ["respond"] },
    ...overrides,
  };
}

test("decision status preserves target-owned and source-owned public roles", () => {
  const targetOwned = buildPresentationClientView(snapshot({
    interaction: scene({ decisionActorId: "target", activeResolverId: "target", participantRoles: { ...scene().participantRoles, decisionActorId: "target", activeResolverId: "target" } }),
    stable: { ...snapshot().stable, decisionActorId: "target" },
    decision: { actorId: "target", stage: "ATTACK_RESPONSE" },
    localControl: { source: "CurrentAction", actionRevision: "target-action", kind: "response", actorId: "target", entitled: false },
  }), "source");
  const sourceOwned = buildPresentationClientView(snapshot({
    interaction: scene({ decisionActorId: "source", activeResolverId: "target", participantRoles: { ...scene().participantRoles, decisionActorId: "source", activeResolverId: "target" } }),
    stable: { ...snapshot().stable, decisionActorId: "source" },
    decision: { actorId: "source", stage: "ATTACK_RESPONSE" },
    localControl: { source: "CurrentAction", actionRevision: "source-action", kind: "trigger", actorId: "source", entitled: true },
  }), "source");

  const targetStatus = buildPresentationDecisionStatus(targetOwned);
  const sourceStatus = buildPresentationDecisionStatus(sourceOwned);
  assert.equal(targetStatus.decisionActorId, "target");
  assert.equal(targetStatus.activeResolverId, "target");
  assert.equal(targetStatus.isLocalDecisionActor, false);
  assert.equal(sourceStatus.decisionActorId, "source");
  assert.equal(sourceStatus.activeResolverId, "target");
  assert.equal(sourceStatus.isLocalDecisionActor, true);

  const sourcePresentation = buildDecisionPresentation(decisionRoom({ meId: "source" }), sourceOwned);
  const waitingPresentation = buildDecisionPresentation(decisionRoom({ meId: "target" }), buildPresentationClientView(snapshot({
    interaction: scene({ decisionActorId: "source", activeResolverId: "target", participantRoles: { ...scene().participantRoles, decisionActorId: "source", activeResolverId: "target" } }),
    stable: { ...snapshot().stable, decisionActorId: "source" },
    decision: { actorId: "source", stage: "ATTACK_RESPONSE" },
    localControl: { source: "CurrentAction", actionRevision: "source-action", kind: "trigger", actorId: "source", entitled: false },
  }), "target"));
  assert.equal(sourcePresentation.actionOwner, "SOURCE");
  assert.equal(waitingPresentation.actionOwner, "SOURCE");
  assert.equal(sourcePresentation.interaction?.decisionActorId, "source");
  assert.equal(sourcePresentation.interaction?.activeResolverId, "target");
  assert.equal(sourcePresentation.isViewerRequiredActor, true);
  assert.equal(waitingPresentation.isViewerRequiredActor, false);
});

test("active decision status ignores legacy ownership and reason fields", () => {
  const view = buildPresentationClientView(snapshot({
    interaction: scene({ decisionActorId: "B", activeResolverId: "A", participantRoles: { ...scene().participantRoles, decisionActorId: "B", activeResolverId: "A" } }),
    stable: { ...snapshot().stable, decisionActorId: "B" },
    localControl: { source: "CurrentAction", actionRevision: "fixed", kind: "response", actorId: "B", entitled: true },
  }), "B");
  const first = buildDecisionPresentation(decisionRoom({ actionPlayerId: "A", actionReason: "old one", currentAction: { version: 3, kind: "none", actorId: "A", deadline: 0, reason: "old action", legalActions: [] }, pending: { kind: "response" }, timeline: [{ id: "old" }], presentationV2: { stableBoundary: { kind: "REST" } } }), view);
  const second = buildDecisionPresentation(decisionRoom({ actionPlayerId: "B", actionReason: "different", currentAction: { version: 3, kind: "dying", actorId: "B", deadline: 0, reason: "different action", legalActions: [] }, pending: { kind: "dying" }, timeline: [{ id: "different" }], presentationV2: { stableBoundary: { kind: "SETTLEMENT" } } }), view);
  assert.deepEqual({
    actionOwner: first.actionOwner,
    primaryStatus: first.primaryStatus,
    isDecision: first.isDecision,
    isViewerRequiredActor: first.isViewerRequiredActor,
    interaction: first.interaction,
  }, {
    actionOwner: second.actionOwner,
    primaryStatus: second.primaryStatus,
    isDecision: second.isDecision,
    isViewerRequiredActor: second.isViewerRequiredActor,
    interaction: second.interaction,
  });
});

test("REST keeps legacy turn/status compatibility and missing player lookup is safe", () => {
  const rest = buildDecisionPresentation(decisionRoom({ actionPlayerId: "missing", actionReason: "Play cards", isMyAction: true, currentAction: { version: 3, kind: "turn", actorId: "missing", deadline: 0, reason: "Play cards", legalActions: ["play_card"] } }), buildPresentationClientView(snapshot({ identity: null, interaction: null, decision: null, stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null }, localControl: { source: "CurrentAction", actionRevision: "rest", kind: "turn", actorId: "missing", entitled: false } }), "source"));
  assert.equal(rest.actionOwner, "the acting player");
  assert.equal(rest.primaryStatus, "SOURCE's turn");
  const active = buildDecisionPresentation(decisionRoom(), buildPresentationClientView(snapshot({
    interaction: scene({ decisionActorId: "unknown", participantRoles: { ...scene().participantRoles, decisionActorId: "unknown" } }),
    stable: { ...snapshot().stable, decisionActorId: "unknown" },
    localControl: { source: "CurrentAction", actionRevision: "unknown", kind: "response", actorId: "unknown", entitled: false },
  }), "source"));
  assert.equal(active.actionOwner, "the decision actor");
});

const displayNames = {
  A: "Ma Chao",
  B: "Zhao Yun",
  C: "Cao Cao",
};
const resolveDisplayName = (id) => displayNames[id] ?? null;

test("Interaction Stage exposes target-owned Attack/Dodge context from the adapter", () => {
  const view = buildPresentationClientView(snapshot(), "B");
  const stage = buildInteractionStageView(view, resolveDisplayName);
  assert.equal(stage.visible, true);
  assert.equal(stage.stageLabel, "Attack Response");
  assert.deepEqual(stage.source, { id: "A", name: "Ma Chao", known: true });
  assert.deepEqual(stage.originalTargets, [{ id: "B", name: "Zhao Yun", known: true }]);
  assert.deepEqual(stage.activeTargets, [{ id: "B", name: "Zhao Yun", known: true }]);
  assert.deepEqual(stage.currentParticipant, { id: "B", name: "Zhao Yun", known: true });
  assert.deepEqual(stage.decisionActor, { id: "B", name: "Zhao Yun", known: true });
  assert.equal(stage.isViewerDecisionActor, true);
});

test("Interaction Stage preserves source-owned Ma Chao decision and resolver roles", () => {
  const view = buildPresentationClientView(snapshot({
    interaction: scene({ decisionActorId: "A", activeResolverId: "B", participantRoles: { ...scene().participantRoles, decisionActorId: "A", activeResolverId: "B" } }),
    stable: { ...snapshot().stable, decisionActorId: "A" },
    decision: { actorId: "A", stage: "ATTACK_RESPONSE" },
    localControl: { source: "CurrentAction", actionRevision: "ma-chao", kind: "trigger", actorId: "A", entitled: true },
  }), "A");
  const stage = buildInteractionStageView(view, resolveDisplayName);
  assert.equal(stage.decisionActor.id, "A");
  assert.equal(stage.decisionActor.name, "Ma Chao");
  assert.equal(stage.activeResolver.id, "B");
  assert.equal(stage.activeResolver.name, "Zhao Yun");
  assert.equal(stage.isViewerDecisionActor, true);
});

test("Interaction Stage renders Group participants and child Damage/Dying continuity semantically", () => {
  const group = buildPresentationClientView(snapshot({
    interaction: scene({ stage: "GROUP_RESOLUTION", targetIds: ["B", "C"], activeTargetIds: ["C"], currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C", participantIds: ["A", "B", "C"], participantRoles: { ...scene().participantRoles, originalTargetIds: ["B", "C"], activeTargetIds: ["C"], currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C", participantIds: ["A", "B", "C"] } }),
    stable: { ...snapshot().stable, decisionActorId: "C" },
    decision: { actorId: "C", stage: "GROUP_RESOLUTION" },
    localControl: { source: "CurrentAction", actionRevision: "group", kind: "response", actorId: "C", entitled: false },
  }), "A");
  const groupStage = buildInteractionStageView(group, resolveDisplayName);
  assert.deepEqual(groupStage.originalTargets.map((identity) => identity.id), ["B", "C"]);
  assert.deepEqual(groupStage.activeTargets.map((identity) => identity.id), ["C"]);
  assert.equal(groupStage.currentParticipant.id, "C");

  const child = buildPresentationClientView(snapshot({
    interaction: scene({ stage: "DAMAGE", parentFrameId: "group-frame", continuity: { relation: "CHILD_FRAME", parentFrameId: "group-frame" }, decisionActorId: "B", activeResolverId: "B", participantRoles: { ...scene().participantRoles, decisionActorId: "B", activeResolverId: "B" } }),
    stable: { ...snapshot().stable, decisionActorId: "B" },
    decision: { actorId: "B", stage: "DAMAGE" },
  }), "A");
  const childStage = buildInteractionStageView(child, resolveDisplayName);
  assert.equal(childStage.continuity.relation, "CHILD_FRAME");
  assert.equal(childStage.parentFrameId, "group-frame");

  const dying = buildInteractionStageView(buildPresentationClientView(snapshot({
    interaction: scene({ stage: "DYING", parentFrameId: "damage-frame", continuity: { relation: "CHILD_FRAME", parentFrameId: "damage-frame" }, decisionActorId: "B", activeResolverId: "B", participantRoles: { ...scene().participantRoles, decisionActorId: "B", activeResolverId: "B" } }),
    stable: { ...snapshot().stable, decisionActorId: "B" },
    decision: { actorId: "B", stage: "DYING" },
  }), "A"), resolveDisplayName);
  assert.equal(dying.stageLabel, "Dying");
  assert.equal(dying.parentFrameId, "damage-frame");
});

test("Interaction Stage resolves immutable root-origin identities from a proven child frame", () => {
  const rootOrigin = { frameId: "root-frame", stage: "NEGATION", sourceId: "A", effect: "Borrowed Sword", targetIds: ["B"] };
  const input = snapshot({
    interaction: scene({
      sourceId: "B",
      targetIds: ["C"],
      currentParticipantId: "C",
      decisionActorId: "B",
      activeResolverId: "B",
      participantRoles: { sourceId: "B", originalTargetIds: ["C"], activeTargetIds: ["C"], currentParticipantId: "C", decisionActorId: "B", activeResolverId: "B", parentParticipantId: null, participantIds: [] },
      parentFrameId: "root-frame",
      rootOrigin,
      continuity: { relation: "CHILD_FRAME", parentFrameId: "root-frame" },
    }),
    stable: { ...snapshot().stable, decisionActorId: "B" },
  });
  const view = buildPresentationClientView(input, "D");
  assert.deepEqual(view.rootOrigin, rootOrigin);
  const stage = buildInteractionStageView(view, resolveDisplayName);
  assert.deepEqual(stage.rootOrigin, {
    frameId: "root-frame",
    stage: "NEGATION",
    source: { id: "A", name: "Ma Chao", known: true },
    effect: "Borrowed Sword",
    targets: [{ id: "B", name: "Zhao Yun", known: true }],
  });

  const incoherent = buildPresentationClientView(snapshot({
    interaction: scene({ parentFrameId: "root-frame", rootOrigin: { ...rootOrigin, frameId: "other-frame" }, continuity: { relation: "CHILD_FRAME", parentFrameId: "root-frame" } }),
  }), "B");
  assert.equal(incoherent.hasInteraction, false, "a root-origin frame that disagrees with the typed root fails closed");
});

test("Interaction Stage public content is viewer-equal while only the local marker differs", () => {
  const acting = buildInteractionStageView(buildPresentationClientView(snapshot(), "B"), resolveDisplayName);
  const uninvolved = buildInteractionStageView(buildPresentationClientView(snapshot({ localControl: { ...snapshot().localControl, actorId: null, entitled: false } }), "C"), resolveDisplayName);
  assert.deepEqual({ ...acting, isViewerDecisionActor: undefined }, { ...uninvolved, isViewerDecisionActor: undefined });
  assert.equal(acting.isViewerDecisionActor, true);
  assert.equal(uninvolved.isViewerDecisionActor, false);
});

test("Interaction Stage uses neutral labels for missing names without changing IDs", () => {
  const stage = buildInteractionStageView(buildPresentationClientView(snapshot({
    interaction: scene({ sourceId: "missing-source", targetIds: ["missing-target"], activeTargetIds: ["missing-target"], currentParticipantId: "missing-target", decisionActorId: "missing-target", activeResolverId: "missing-resolver", participantRoles: { ...scene().participantRoles, sourceId: "missing-source", originalTargetIds: ["missing-target"], activeTargetIds: ["missing-target"], currentParticipantId: "missing-target", decisionActorId: "missing-target", activeResolverId: "missing-resolver" } }),
    stable: { ...snapshot().stable, decisionActorId: "missing-target" },
  }), "missing-viewer"), resolveDisplayName);
  assert.equal(stage.source.id, "missing-source");
  assert.equal(stage.source.name, "Unknown source");
  assert.equal(stage.currentParticipant.name, "Unknown participant");
  assert.equal(stage.decisionActor.name, "Unknown decision actor");
  assert.equal(stage.activeResolver.name, "Unknown resolver");
});

test("Interaction Stage is hidden for REST and independent of legacy room fields", () => {
  const rest = buildInteractionStageView(buildPresentationClientView(snapshot({ identity: null, interaction: null, decision: null, stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null } }), "B"), resolveDisplayName);
  assert.equal(rest.visible, false);

  const fixedView = buildPresentationClientView(snapshot(), "B");
  const roomA = { players: [{ id: "A", name: "Ma Chao" }, { id: "B", name: "Zhao Yun" }], pending: { kind: "response" }, timeline: [{ id: "old" }], presentationV2: { stableBoundary: { kind: "REST" } }, currentAction: { kind: "response" }, phase: "response", actionPlayerId: "A", actionReason: "old" };
  const roomB = { ...roomA, pending: { kind: "dying" }, timeline: [{ id: "new" }], presentationV2: { stableBoundary: { kind: "SETTLEMENT" } }, currentAction: { kind: "dying" }, phase: "dying", actionPlayerId: "B", actionReason: "new" };
  const renderWithLegacyRoom = (room) => buildInteractionStageView(fixedView, (id) => room.players.find((player) => player.id === id)?.name ?? null);
  assert.deepEqual(renderWithLegacyRoom(roomA), renderWithLegacyRoom(roomB));
});

test("Interaction Stage display hierarchy keeps ordinary target-owned CHOICE concise", () => {
  const stage = buildInteractionStageView(buildPresentationClientView(snapshot(), "B"), resolveDisplayName);
  const model = buildInteractionStageDisplayModel(stage, stage.currentParticipant.id);
  assert.equal(model.focusLabel, "Attack · Attack Response");
  assert.equal(model.focusTarget.name, "Zhao Yun");
  assert.equal(model.currentParticipantPresentedInHeroFocus, true);
  assert.equal(model.targetSummary, "Current participant: Zhao Yun");
  assert.equal(model.activeScopeSummary, null);
  assert.equal(model.showDecision, true);
  assert.equal(model.decisionActor.name, "Zhao Yun");
  assert.equal(model.showResolver, false, "ordinary target-owned CHOICE hides redundant resolver detail");
  assert.equal(model.showOriginalTargets, false);
  assert.equal(buildInteractionStageDisplayModel(stage, "another-player-id").currentParticipantPresentedInHeroFocus, false);
});

test("Interaction Stage display hierarchy preserves the source-owned resolver distinction", () => {
  const view = buildPresentationClientView(snapshot({
    interaction: scene({ decisionActorId: "A", activeResolverId: "B", participantRoles: { ...scene().participantRoles, decisionActorId: "A", activeResolverId: "B" } }),
    stable: { ...snapshot().stable, decisionActorId: "A" },
    decision: { actorId: "A", stage: "ATTACK_RESPONSE" },
    localControl: { ...snapshot().localControl, actorId: "A", entitled: true },
  }), "A");
  const model = buildInteractionStageDisplayModel(buildInteractionStageView(view, resolveDisplayName));
  assert.equal(model.showDecision, true);
  assert.equal(model.decisionActor.name, "Ma Chao");
  assert.equal(model.showResolver, true);
  assert.equal(model.activeResolver.name, "Zhao Yun");
  assert.equal(model.isViewerDecisionActor, true);
});

test("Interaction Stage display hierarchy keeps Group/AOE scope facts without ordinal progress", () => {
  const view = buildPresentationClientView(snapshot({
    interaction: scene({ stage: "GROUP_RESOLUTION", targetIds: ["B", "C", "A"], activeTargetIds: ["B", "C"], currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C", participantIds: ["A", "B", "C"], participantRoles: { ...scene().participantRoles, originalTargetIds: ["B", "C", "A"], activeTargetIds: ["B", "C"], currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C", participantIds: ["A", "B", "C"] } }),
    stable: { ...snapshot().stable, decisionActorId: "C" },
    decision: { actorId: "C", stage: "GROUP_RESOLUTION" },
  }), "A");
  const stage = buildInteractionStageView(view, resolveDisplayName);
  const model = buildInteractionStageDisplayModel(stage, stage.currentParticipant.id);
  assert.equal(model.focusTarget.name, "Cao Cao");
  assert.equal(model.currentParticipantPresentedInHeroFocus, true);
  assert.equal(model.activeScopeSummary, "Active scope: Zhao Yun, Cao Cao");
  assert.match(model.targetSummary, /Current participant: Cao Cao/);
  assert.match(model.targetSummary, /Active scope: Zhao Yun, Cao Cao/);
  assert.doesNotMatch(model.targetSummary, /Target \d+ of \d+/);
  assert.equal(model.showOriginalTargets, true);
  assert.match(model.originalTargetSummary, /Zhao Yun, Cao Cao, Ma Chao/);
  assert.equal(buildInteractionStageDisplayModel(stage, "another-player-id").currentParticipantPresentedInHeroFocus, false);
});

test("Interaction Stage metadata fails closed when no unique primary focus is proven", () => {
  const makeStage = (stageName, activeTargetIds) => {
    const participantRoles = {
      ...scene().participantRoles,
      originalTargetIds: activeTargetIds,
      activeTargetIds,
      currentParticipantId: null,
    };
    const view = buildPresentationClientView(snapshot({
      interaction: scene({ stage: stageName, targetIds: activeTargetIds, activeTargetIds, currentParticipantId: null, participantRoles }),
      decision: { actorId: "B", stage: stageName },
    }), "A");
    return buildInteractionStageView(view, resolveDisplayName);
  };

  const ambiguous = makeStage("GROUP_RESOLUTION", ["B", "C"]);
  const ambiguousModel = buildInteractionStageDisplayModel(ambiguous);
  assert.equal(ambiguousModel.focusTarget.id, null);
  assert.equal(ambiguousModel.focusTarget.name, "No proven focus");
  assert.match(ambiguousModel.targetSummary, /Active scope: Zhao Yun, Cao Cao/);
  assert.equal(buildHeroFocusView(ambiguous).primary, null);

  const soleTargetModel = buildInteractionStageDisplayModel(makeStage("GROUP_RESOLUTION", ["B"]));
  assert.equal(soleTargetModel.focusTarget.id, "B", "a unique non-Dying target remains a safe fallback");

  const dyingWithoutParticipant = { ...makeStage("GROUP_RESOLUTION", ["B"]), stage: "DYING" };
  const dyingModel = buildInteractionStageDisplayModel(dyingWithoutParticipant);
  assert.equal(dyingModel.focusTarget.id, null, "Dying does not borrow its focus from the target list");
  assert.equal(dyingModel.focusTarget.name, "No proven focus");
});

test("Interaction Stage never infers ordinal progress from target order or scope length", () => {
  const makeModel = (activeTargetIds, currentParticipantId = "C") => buildInteractionStageDisplayModel(buildInteractionStageView(buildPresentationClientView(snapshot({
    interaction: scene({ stage: "GROUP_RESOLUTION", targetIds: ["B", "C", "A"], activeTargetIds, currentParticipantId, decisionActorId: currentParticipantId, activeResolverId: currentParticipantId, participantIds: ["A", "B", "C"], participantRoles: { ...scene().participantRoles, originalTargetIds: ["B", "C", "A"], activeTargetIds, currentParticipantId, decisionActorId: currentParticipantId, activeResolverId: currentParticipantId, participantIds: ["A", "B", "C"] } }),
    stable: { ...snapshot().stable, decisionActorId: currentParticipantId },
    decision: { actorId: currentParticipantId, stage: "GROUP_RESOLUTION" },
  }), "A"), resolveDisplayName));

  const ordered = makeModel(["B", "C"]);
  const reordered = makeModel(["C", "B"]);
  const narrowed = makeModel(["C"]);
  for (const model of [ordered, reordered, narrowed]) {
    assert.doesNotMatch(model.targetSummary, /Target \d+ of \d+/);
    assert.doesNotMatch(model.targetSummary, /\b(?:completed|remaining|sequence|progress)\b/i);
  }
  assert.match(ordered.targetSummary, /Active scope: Zhao Yun, Cao Cao/);
  assert.match(reordered.targetSummary, /Active scope: Cao Cao, Zhao Yun/);
  assert.notEqual(ordered.targetSummary, reordered.targetSummary, "scope facts may preserve accepted array order without claiming ordinal progress");
  assert.match(narrowed.targetSummary, /Current participant: Cao Cao/);
  assert.doesNotMatch(narrowed.targetSummary, /\b(?:of|completed|remaining)\b/i);
});

test("Interaction Stage names only a proven, readable parent effect and never displays frame IDs", () => {
  const makeNestedModel = ({ rootFrameId = "group-frame", parentFrameId = rootFrameId, rootOrigin } = {}) => {
    const view = buildPresentationClientView(snapshot({
      interaction: scene({
        rootFrameId,
        activeFrameId: "damage-frame",
        parentFrameId,
        rootOrigin,
        stage: "DAMAGE",
        continuity: { relation: "CHILD_FRAME", parentFrameId },
        decisionActorId: "B",
        activeResolverId: "A",
        participantRoles: { ...scene().participantRoles, decisionActorId: "B", activeResolverId: "A" },
      }),
      stable: { ...snapshot().stable, decisionActorId: "B" },
      decision: { actorId: "B", stage: "DAMAGE" },
    }), "A");
    return buildInteractionStageDisplayModel(buildInteractionStageView(view, resolveDisplayName));
  };

  const unlabelled = makeNestedModel();
  assert.equal(unlabelled.nestedContext, null, "a proven frame ID alone is not player-facing copy");
  assert.equal(unlabelled.showResolver, true, "child frame can still clarify a distinct nested resolver");

  const namedParent = makeNestedModel({
    rootOrigin: { frameId: "group-frame", stage: "GROUP_RESOLUTION", sourceId: "A", effect: "RainingArrows", targetIds: ["B", "C"] },
  });
  assert.equal(namedParent.nestedContext, "During Raining Arrows");

  const unknownParentEffect = makeNestedModel({
    rootOrigin: { frameId: "group-frame", stage: "GROUP_RESOLUTION", sourceId: "A", effect: "engine-effect-17", targetIds: ["B"] },
  });
  assert.equal(unknownParentEffect.nestedContext, null, "unknown effect identifiers fail closed");

  const nonImmediateParent = makeNestedModel({
    rootFrameId: "root-frame",
    parentFrameId: "middle-frame",
    rootOrigin: { frameId: "root-frame", stage: "GROUP_RESOLUTION", sourceId: "A", effect: "RainingArrows", targetIds: ["B"] },
  });
  assert.equal(nonImmediateParent.nestedContext, null, "root origin is not presented as an immediate parent without an exact frame match");
});

test("Interaction Stage display model demotes only redundant original targets", () => {
  const same = buildInteractionStageDisplayModel(buildInteractionStageView(buildPresentationClientView(snapshot(), "B"), resolveDisplayName));
  assert.equal(same.showOriginalTargets, false);
  const changedView = buildPresentationClientView(snapshot({
    interaction: scene({ targetIds: ["B", "C"], activeTargetIds: ["C"], currentParticipantId: "C", participantRoles: { ...scene().participantRoles, originalTargetIds: ["B", "C"], activeTargetIds: ["C"], currentParticipantId: "C" } }),
  }), "B");
  const changed = buildInteractionStageDisplayModel(buildInteractionStageView(changedView, resolveDisplayName));
  assert.equal(changed.showOriginalTargets, true);
  assert.match(changed.originalTargetSummary, /Zhao Yun, Cao Cao/);
  assert.equal(changed.focusTarget.name, "Cao Cao");
});

test("Interaction Stage display model remains safe for long and missing names", () => {
  const view = buildPresentationClientView(snapshot({
    interaction: scene({ sourceId: "long", targetIds: ["missing"], activeTargetIds: ["missing"], currentParticipantId: "missing", participantRoles: { ...scene().participantRoles, sourceId: "long", originalTargetIds: ["missing"], activeTargetIds: ["missing"], currentParticipantId: "missing" } }),
  }), "viewer");
  const model = buildInteractionStageDisplayModel(buildInteractionStageView(view, (id) => id === "long" ? "A player with an intentionally very long display name" : null));
  assert.equal(model.source.known, true);
  assert.match(model.source.name, /intentionally very long/);
  assert.equal(model.focusTarget.name, "Unknown participant");
  assert.match(model.targetSummary, /Unknown participant/);
});

test("Interaction Stage display model is viewer-equal apart from the local marker", () => {
  const acting = buildInteractionStageDisplayModel(buildInteractionStageView(buildPresentationClientView(snapshot(), "B"), resolveDisplayName));
  const uninvolved = buildInteractionStageDisplayModel(buildInteractionStageView(buildPresentationClientView(snapshot({ localControl: { ...snapshot().localControl, actorId: null, entitled: false } }), "C"), resolveDisplayName));
  assert.deepEqual({ ...acting, isViewerDecisionActor: undefined }, { ...uninvolved, isViewerDecisionActor: undefined });
  assert.equal(acting.isViewerDecisionActor, true);
  assert.equal(uninvolved.isViewerDecisionActor, false);
});

test("Interaction Stage display model remains hidden for REST", () => {
  const model = buildInteractionStageDisplayModel(buildInteractionStageView(buildPresentationClientView(snapshot({ identity: null, interaction: null, decision: null, stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null } }), "B"), resolveDisplayName));
  assert.equal(model.visible, false);
});

test("Reaction Chain projects only a proven Negation root and active response", () => {
  const negationSnapshot = snapshot({
    interaction: scene({ stage: "NEGATION", effect: "Dismantle", activeResolverId: "B" }),
    decision: { actorId: "B", stage: "NEGATION" },
  });
  const chain = buildReactionChainView(buildInteractionStageView(buildPresentationClientView(negationSnapshot, "B"), resolveDisplayName));
  assert.deepEqual(chain, {
    visible: true,
    interactionId: "interaction-1",
    negationNodes: [],
    publicEventLinks: null,
    rootEffectState: null,
    groupTargetEffectScope: null,
    root: {
      effect: "Dismantle",
      cardKind: null,
      source: { id: "A", name: "Ma Chao", known: true },
      targets: [{ id: "B", name: "Zhao Yun", known: true }],
    },
    active: {
      label: "Negation response",
      decisionActor: { id: "B", name: "Zhao Yun", known: true },
      activeResolver: { id: "A", name: "Ma Chao", known: true },
      relation: "ROOT_FRAME",
    },
  });
});

test("Reaction Chain stays viewer-equal and cannot derive counter history from local control", () => {
  const negation = snapshot({ interaction: scene({ stage: "NEGATION", effect: "Dismantle", activeResolverId: "B" }), decision: { actorId: "B", stage: "NEGATION" } });
  const acting = buildReactionChainView(buildInteractionStageView(buildPresentationClientView(negation, "B"), resolveDisplayName));
  const waiting = buildReactionChainView(buildInteractionStageView(buildPresentationClientView({ ...negation, localControl: { ...negation.localControl, actorId: null, entitled: false } }, "C"), resolveDisplayName));
  assert.deepEqual(waiting, acting);
  assert.equal("history" in acting, false);
  assert.equal(JSON.stringify(acting).includes("CurrentAction"), false);
});

test("Reaction Chain fails closed outside a proven Negation scene", () => {
  const attack = buildReactionChainView(buildInteractionStageView(buildPresentationClientView(snapshot(), "B"), resolveDisplayName));
  const malformed = buildReactionChainView(buildInteractionStageView(buildPresentationClientView(snapshot({ interaction: scene({ stage: "NEGATION", effect: null }) }), "B"), resolveDisplayName));
  assert.deepEqual(attack, { visible: false, interactionId: null, negationNodes: [], publicEventLinks: null, rootEffectState: null, groupTargetEffectScope: null, root: null, active: null });
  assert.deepEqual(malformed, { visible: false, interactionId: null, negationNodes: [], publicEventLinks: null, rootEffectState: null, groupTargetEffectScope: null, root: null, active: null });
});

test("Dying handoff keeps the dying participant public and the rescue actor bounded", () => {
  const dying = snapshot({
    interaction: scene({ stage: "DYING", effect: "Attack", currentParticipantId: "B", decisionActorId: "C", activeResolverId: "C", targetIds: ["B"], activeTargetIds: ["B"], participantIds: ["A", "B", "C"], participantRoles: { ...scene().participantRoles, originalTargetIds: ["B"], activeTargetIds: ["B"], currentParticipantId: "B", decisionActorId: "C", activeResolverId: "C", participantIds: ["A", "B", "C"] } }),
    stable: { ...snapshot().stable, decisionActorId: "C" },
    decision: { actorId: "C", stage: "DYING" },
  });
  const stage = buildInteractionStageView(buildPresentationClientView(dying, "C"), (id) => displayNames[id] ?? null);
  const handoff = buildDyingHandoffView(stage);
  assert.equal(handoff.visible, true);
  assert.equal(handoff.dyingPlayer.id, "B");
  assert.equal(handoff.decisionActor.id, "C");
  assert.equal(handoff.activeResolver.id, "C");
  assert.equal(handoff.statusLabel, "Rescue decision");
  assert.equal(handoff.continuity.relation, "ROOT_FRAME");
  assert.equal("cardId" in handoff, false);
  assert.equal("providerId" in handoff, false);

  const child = snapshot({
    interaction: scene({ stage: "DYING", parentFrameId: "duel-frame", continuity: { relation: "CHILD_FRAME", parentFrameId: "duel-frame" }, currentParticipantId: "B", decisionActorId: "C", activeResolverId: "C", participantRoles: { ...scene().participantRoles, currentParticipantId: "B", decisionActorId: "C", activeResolverId: "C" } }),
    stable: { ...snapshot().stable, decisionActorId: "C" },
    decision: { actorId: "C", stage: "DYING" },
  });
  const childHandoff = buildDyingHandoffView(buildInteractionStageView(buildPresentationClientView(child, "A"), (id) => displayNames[id] ?? null));
  assert.equal(childHandoff.visible, true);
  assert.equal(childHandoff.dyingPlayer.id, "B");
  assert.deepEqual(childHandoff.continuity, { relation: "CHILD_FRAME", parentFrameId: "duel-frame" });
  assert.equal(childHandoff.parentFrameId, "duel-frame");
});

test("Dying handoff is viewer-equal, neutral without a proven choice, and fails closed without a subject", () => {
  const base = snapshot({
    interaction: scene({ stage: "DYING", currentParticipantId: "B", decisionActorId: "C", activeResolverId: "C", participantRoles: { ...scene().participantRoles, currentParticipantId: "B", decisionActorId: "C", activeResolverId: "C" } }),
    stable: { ...snapshot().stable, decisionActorId: "C" },
    decision: { actorId: "C", stage: "DYING" },
  });
  const acting = buildDyingHandoffView(buildInteractionStageView(buildPresentationClientView(base, "C"), resolveDisplayName));
  const observer = buildDyingHandoffView(buildInteractionStageView(buildPresentationClientView({ ...base, localControl: { ...base.localControl, actorId: null, entitled: false } }, "A"), resolveDisplayName));
  assert.deepEqual(observer, acting);

  const resolving = buildDyingHandoffView(buildInteractionStageView(buildPresentationClientView({ ...base, stable: { ...base.stable, kind: "SETTLEMENT", decisionActorId: null }, decision: null, interaction: { ...base.interaction, decisionActorId: null, participantRoles: { ...base.interaction.participantRoles, decisionActorId: null } } }, "A"), resolveDisplayName));
  assert.equal(resolving.visible, false, "reserved SETTLEMENT authority fails closed to REST");
  assert.equal(resolving.decisionActor.id, null);
  assert.equal(resolving.dyingPlayer.id, null, "reserved SETTLEMENT does not retain a Dying subject");

  const missingSubject = buildDyingHandoffView(buildInteractionStageView(buildPresentationClientView({ ...base, interaction: { ...base.interaction, currentParticipantId: null, participantRoles: { ...base.interaction.participantRoles, currentParticipantId: null } } }, "A"), resolveDisplayName));
  assert.equal(missingSubject.visible, false);
});

test("Hero Focus selects only accepted current-participant or sole-active-target semantics", () => {
  const display = (id) => ({ name: displayNames[id] ?? null, heroId: id === "A" ? "ma-chao" : id === "B" ? "zhao-yun" : id === "C" ? "cao-cao" : null, heroName: id === "A" ? "Ma Chao" : id === "B" ? "Zhao Yun" : id === "C" ? "Cao Cao" : null, hp: 4, maxHp: 4 });
  const focusFrom = (view) => buildHeroFocusView(buildInteractionStageView(view, resolveDisplayName), display);

  const ordinary = focusFrom(buildPresentationClientView(snapshot(), "B"));
  assert.deepEqual(ordinary.primary, { id: "B", name: "Zhao Yun", known: true, heroId: "zhao-yun", heroName: "Zhao Yun", hp: 4, maxHp: 4 });
  assert.equal(ordinary.roleLabel, "CURRENT PARTICIPANT");
  assert.equal(ordinary.source.id, "A");

  const sourceOwned = focusFrom(buildPresentationClientView(snapshot({
    interaction: scene({ decisionActorId: "A", activeResolverId: "B", participantRoles: { ...scene().participantRoles, decisionActorId: "A", activeResolverId: "B" } }),
    stable: { ...snapshot().stable, decisionActorId: "A" },
    decision: { actorId: "A", stage: "ATTACK_RESPONSE" },
  }), "A"));
  assert.equal(sourceOwned.primary?.id, "B", "source-owned decision still focuses the current target participant");
  assert.equal(sourceOwned.roleLabel, "CURRENT PARTICIPANT");
  assert.equal(sourceOwned.source.id, "A");

  const group = focusFrom(buildPresentationClientView(snapshot({
    interaction: scene({ stage: "GROUP_RESOLUTION", targetIds: ["B", "C"], activeTargetIds: ["B", "C"], currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C", participantIds: ["A", "B", "C"], participantRoles: { ...scene().participantRoles, originalTargetIds: ["B", "C"], activeTargetIds: ["B", "C"], currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C", participantIds: ["A", "B", "C"] } }),
    stable: { ...snapshot().stable, decisionActorId: "C" },
    decision: { actorId: "C", stage: "GROUP_RESOLUTION" },
  }), "A"));
  assert.equal(group.primary?.id, "C", "Group focus follows the proven current participant");

  const ambiguous = focusFrom(buildPresentationClientView(snapshot({
    interaction: scene({ targetIds: ["B", "C"], activeTargetIds: ["B", "C"], currentParticipantId: null, decisionActorId: "A", activeResolverId: "A", participantIds: ["A", "B", "C"], participantRoles: { ...scene().participantRoles, originalTargetIds: ["B", "C"], activeTargetIds: ["B", "C"], currentParticipantId: null, decisionActorId: "A", activeResolverId: "A", participantIds: ["A", "B", "C"] } }),
    stable: { ...snapshot().stable, decisionActorId: "A" },
    decision: { actorId: "A", stage: "GROUP_RESOLUTION" },
  }), "A"));
  assert.equal(ambiguous.primary, null, "multiple active targets without a current participant do not guess");
  assert.equal(ambiguous.roleLabel, null);

  const soleTarget = focusFrom(buildPresentationClientView(snapshot({
    interaction: scene({ targetIds: ["C"], activeTargetIds: ["C"], currentParticipantId: null, decisionActorId: "A", activeResolverId: "A", participantIds: ["A", "C"], participantRoles: { ...scene().participantRoles, originalTargetIds: ["C"], activeTargetIds: ["C"], currentParticipantId: null, decisionActorId: "A", activeResolverId: "A", participantIds: ["A", "C"] } }),
    stable: { ...snapshot().stable, decisionActorId: "A" },
    decision: { actorId: "A", stage: "ATTACK_RESPONSE" },
  }), "A"));
  assert.equal(soleTarget.primary?.id, "C");
  assert.equal(soleTarget.roleLabel, "CURRENT TARGET");

  const child = focusFrom(buildPresentationClientView(snapshot({
    interaction: scene({ stage: "DAMAGE", parentFrameId: "group-frame", continuity: { relation: "CHILD_FRAME", parentFrameId: "group-frame" }, decisionActorId: "B", activeResolverId: "B", participantRoles: { ...scene().participantRoles, decisionActorId: "B", activeResolverId: "B" } }),
    stable: { ...snapshot().stable, decisionActorId: "B" },
    decision: { actorId: "B", stage: "DAMAGE" },
  }), "A"));
  assert.equal(child.primary?.id, "B");
  assert.equal(child.nestedContext, null, "Hero Focus does not expose an unlabelled parent frame ID");

  const dying = focusFrom(buildPresentationClientView(snapshot({
    interaction: scene({ stage: "DYING", currentParticipantId: "B", decisionActorId: "B", activeResolverId: "B", participantRoles: { ...scene().participantRoles, currentParticipantId: "B", decisionActorId: "B", activeResolverId: "B" } }),
    stable: { ...snapshot().stable, decisionActorId: "B" },
    decision: { actorId: "B", stage: "DYING" },
  }), "A"));
  assert.equal(dying.primary?.id, "B");
  assert.equal(dying.roleLabel, "DYING PLAYER");
  const dyingWithoutParticipant = focusFrom(buildPresentationClientView(snapshot({
    interaction: scene({ stage: "DYING", currentParticipantId: null, activeTargetIds: ["B"], decisionActorId: "C", activeResolverId: "C", participantRoles: { ...scene().participantRoles, currentParticipantId: null, activeTargetIds: ["B"], decisionActorId: "C", activeResolverId: "C" } }),
    stable: { ...snapshot().stable, decisionActorId: "C" },
    decision: { actorId: "C", stage: "DYING" },
  }), "A"));
  assert.equal(dyingWithoutParticipant.primary, null, "Dying never guesses a subject from the active-target list");
  assert.equal(dyingWithoutParticipant.visible, true);

  const acting = focusFrom(buildPresentationClientView(snapshot(), "B"));
  const uninvolved = focusFrom(buildPresentationClientView(snapshot({ localControl: { ...snapshot().localControl, actorId: null, entitled: false } }), "C"));
  assert.deepEqual(acting, uninvolved, "Hero Focus public content is viewer-equal");
  const legacyChanged = focusFrom(buildPresentationClientView(snapshot({ pending: { kind: "dying", targetId: "C" }, timeline: [{ id: "legacy-event" }], presentationV2: { stableBoundary: { kind: "REST" } }, currentAction: { actorId: "C" }, phase: "dying", actionPlayerId: "C", actionReason: "legacy" }), "B"));
  assert.deepEqual(legacyChanged, acting, "legacy Pending/timeline/presentationV2/CurrentAction fields cannot change fixed semantic focus");

  const missing = buildHeroFocusView(buildInteractionStageView(buildPresentationClientView(snapshot({
    interaction: scene({ currentParticipantId: "missing", targetIds: ["missing"], activeTargetIds: ["missing"], decisionActorId: "missing", participantRoles: { ...scene().participantRoles, originalTargetIds: ["missing"], activeTargetIds: ["missing"], currentParticipantId: "missing", decisionActorId: "missing" } }),
    stable: { ...snapshot().stable, decisionActorId: "missing" },
    decision: { actorId: "missing", stage: "ATTACK_RESPONSE" },
  }), "viewer"), () => null), () => null);
  assert.deepEqual(missing.primary, { id: "missing", name: "Unknown participant", known: false, heroId: null, heroName: null, hp: null, maxHp: null });

  const rest = buildHeroFocusView(buildInteractionStageView(buildPresentationClientView(snapshot({ identity: null, interaction: null, decision: null, stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null } }), "B"), resolveDisplayName));
  assert.equal(rest.visible, false);
  assert.equal(rest.primary, null);
  assert.equal("hand" in ordinary, false, "Hero Focus has no private hand or card projection");
});

test("viewer Hero Focus projection uses only one uniquely-proven external source or active target", () => {
  const display = (id) => ({ name: displayNames[id] ?? null, heroId: id === "A" ? "ma-chao" : id === "B" ? "zhao-yun" : id === "C" ? "cao-cao" : null, heroName: id === "A" ? "Ma Chao" : id === "B" ? "Zhao Yun" : id === "C" ? "Cao Cao" : null, hp: 4, maxHp: 4 });
  const projectionFrom = (sceneOverrides, viewerId, displayResolver = display) => {
    const stage = buildInteractionStageView(semanticView(sceneOverrides, { meId: viewerId }), resolveDisplayName);
    const publicFocus = buildHeroFocusView(stage, display);
    return { stage, publicFocus, projected: projectHeroFocusForViewer(stage, publicFocus, viewerId, displayResolver) };
  };

  const external = projectionFrom({}, "A");
  assert.equal(external.publicFocus.primary?.id, "B");
  assert.strictEqual(external.projected, external.publicFocus, "an external public primary is returned unchanged");

  const viewerSource = projectionFrom({ currentParticipantId: "A", decisionActorId: "A", activeResolverId: "A" }, "A");
  assert.equal(viewerSource.publicFocus.primary?.id, "A");
  assert.equal(viewerSource.projected.primary?.id, "B");
  assert.equal(viewerSource.projected.roleLabel, "CURRENT TARGET");

  const viewerTarget = projectionFrom({}, "B");
  assert.equal(viewerTarget.publicFocus.primary?.id, "B");
  assert.equal(viewerTarget.projected.primary?.id, "A");
  assert.equal(viewerTarget.projected.roleLabel, "SOURCE");

  const duplicateIdentity = projectionFrom({ sourceId: "B", targetIds: ["B"], activeTargetIds: ["B"], currentParticipantId: "A", decisionActorId: "A", activeResolverId: "A" }, "A");
  assert.equal(duplicateIdentity.projected.primary?.id, "B", "the same source/target ID is rendered only once");
  assert.equal(duplicateIdentity.projected.roleLabel, "CURRENT TARGET", "active-target role wins when the unique ID has both proven roles");

  const ambiguous = projectionFrom({ sourceId: "B", targetIds: ["C"], activeTargetIds: ["C"], currentParticipantId: "A", decisionActorId: "A", activeResolverId: "A", participantIds: ["A", "B", "C"] }, "A");
  assert.equal(ambiguous.projected.primary, null, "multiple unique external candidates fail closed");
  assert.equal(ambiguous.projected.roleLabel, null);

  const localOnly = projectionFrom({ sourceId: "A", targetIds: ["A"], activeTargetIds: ["A"], currentParticipantId: "A", decisionActorId: "A", activeResolverId: "A", participantIds: ["A"] }, "A");
  assert.equal(localOnly.projected.primary, null, "no external candidate fails closed");

  const unknown = projectionFrom({ sourceId: "A", targetIds: ["missing"], activeTargetIds: ["missing"], currentParticipantId: "A", decisionActorId: "A", activeResolverId: "A", participantIds: ["A", "missing"] }, "A", (id) => id === "C" ? display("C") : null);
  assert.deepEqual(unknown.projected.primary, { id: "missing", name: "Unknown target", known: false, heroId: null, heroName: null, hp: null, maxHp: null });
  assert.equal(unknown.projected.roleLabel, "CURRENT TARGET");
});

test("Medium Source projection requires a proven external source beside an active-target focus", () => {
  const display = (id) => ({ name: displayNames[id] ?? null, heroId: id === "A" ? "ma-chao" : id === "B" ? "zhao-yun" : id === "C" ? "cao-cao" : null, heroName: id === "A" ? "Ma Chao" : id === "B" ? "Zhao Yun" : id === "C" ? "Cao Cao" : null, hp: 4, maxHp: 4 });
  const mediumFrom = (sceneOverrides, viewerId = "C", displayResolver = display) => {
    const stage = buildInteractionStageView(semanticView(sceneOverrides, { meId: viewerId }), resolveDisplayName);
    const publicFocus = buildHeroFocusView(stage, display);
    const projectedFocus = projectHeroFocusForViewer(stage, publicFocus, viewerId, displayResolver);
    return { stage, projectedFocus, medium: projectMediumSourceForViewer(stage, projectedFocus, viewerId, displayResolver) };
  };

  const externalPair = mediumFrom({ participantIds: ["A", "B", "C"] });
  assert.deepEqual(externalPair.medium, {
    player: { id: "A", name: "Ma Chao", known: true, heroId: "ma-chao", heroName: "Ma Chao", hp: 4, maxHp: 4 },
    roleLabel: "SOURCE",
  });

  assert.equal(mediumFrom({}, "A").medium, null, "the viewer remains only in LocalPlayerDock when they are the source");

  const nonTargetPrimary = mediumFrom({ currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C", participantIds: ["A", "B", "C"] }, "D");
  assert.equal(nonTargetPrimary.projectedFocus.primary?.id, "C");
  assert.deepEqual(nonTargetPrimary.stage.activeTargets.map((target) => target.id), ["B"]);
  assert.equal(nonTargetPrimary.medium, null, "a current participant outside activeTargets is not a target focus");

  assert.equal(mediumFrom({ sourceId: "A", targetIds: ["A"], activeTargetIds: ["A"], currentParticipantId: "A", decisionActorId: "A", activeResolverId: "A", participantIds: ["A"] }).medium, null, "the source cannot be the primary card");
  assert.equal(mediumFrom({ sourceId: "B", targetIds: ["B"], activeTargetIds: ["B"], currentParticipantId: "B", decisionActorId: "B", activeResolverId: "B", participantIds: ["B"] }).medium, null, "a self-effect does not duplicate one identity");
  assert.equal(mediumFrom({ sourceId: null }).medium, null, "missing source authority does not guess a source");

  const unknownSource = mediumFrom({ sourceId: "Z", targetIds: ["B"], activeTargetIds: ["B"], currentParticipantId: "B", decisionActorId: "B", activeResolverId: "B", participantIds: ["Z", "B"] }, "C", (id) => id === "B" ? display("B") : null);
  assert.deepEqual(unknownSource.medium, {
    player: { id: "Z", name: "Unknown source", known: false, heroId: null, heroName: null, hp: null, maxHp: null },
    roleLabel: "SOURCE",
  }, "unknown public decoration keeps the proven ID without substituting another participant");

  const hiddenView = buildPresentationClientView(snapshot({ identity: null, interaction: null, decision: null, stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null } }), "C");
  const hiddenStage = buildInteractionStageView(hiddenView, resolveDisplayName);
  const hiddenFocus = buildHeroFocusView(hiddenStage, display);
  assert.equal(projectMediumSourceForViewer(hiddenStage, hiddenFocus, "C", display), null, "REST is not a source presentation");
});

test("Group scope density decorates only proven historical targets without progress or eligibility", () => {
  const project = (ids, overrides = {}, viewerId = "D") => {
    const stage = buildInteractionStageView(semanticView({ stage: "GROUP_RESOLUTION", targetIds: ids, ...overrides }, { meId: viewerId }), resolveDisplayName);
    const focus = projectHeroFocusForViewer(stage, buildHeroFocusView(stage), viewerId);
    const source = projectMediumSourceForViewer(stage, focus, viewerId);
    return projectGroupTargetScopeForViewer(stage, focus, source, viewerId);
  };
  assert.equal(project(["B"]), null, "sole target is already the primary");
  assert.deepEqual(project(["B", "C"])?.players.map(p => p.id), ["C"]);
  assert.equal(project(["B", "C", "E"])?.density, "medium");
  const dense = project(["B", "C", "E", "F", "D", "B"]);
  assert.equal(dense?.density, "medium", "density follows the three rendered secondary cards after viewer/primary exclusions");
  assert.deepEqual(dense?.players.map(p => p.id), ["C", "E", "F"], "viewer/primary/duplicate excluded");
  assert.deepEqual(project(["C", "E", "F", "B"])?.players.map(p => p.id), ["C", "E", "F"]);
  const sourceExcluded = project(["A", "B", "C", "D", "E"]);
  assert.equal(sourceExcluded?.density, "medium", "source, primary, and viewer do not inflate the rendered participant count");
  assert.deepEqual(sourceExcluded?.players.map(p => p.id), ["C", "E"]);
  const fourRendered = project(["A", "B", "C", "E", "F", "G", "D"]);
  assert.equal(fourRendered?.density, "compact", "four rendered secondary cards use compact density");
  assert.equal(fourRendered?.players.length, 4);
  assert.equal(dense?.hasProgress, false);
  assert.ok(dense?.players.every((player) => player.order === null && player.status === null), "historical scope receives no inferred order or status");
  assert.deepEqual(project(["B", "C"], { activeTargetIds: ["B"], participantIds: [] }), project(["B", "C"], { activeTargetIds: ["B"], participantIds: ["C", "B"] }), "remaining scope does not manufacture progress");
  assert.deepEqual(project(["B", "C"], { decisionActorId: "C", activeResolverId: "C" })?.players.map(p => p.id), ["C"], "decision role does not create target membership");
  assert.equal(project(["B", "C"], { stage: "NEGATION" }), null, "do not infer Group during other stages");
  const unknown = project(["B", "missing"]);
  assert.equal(unknown?.players[0].id, "missing");
  assert.equal(unknown?.players[0].heroId, null);
  assert.doesNotMatch(JSON.stringify(dense), /completed|remaining|pending|resolved|outcome|eligible|legal/i);
  const ambiguous = project(["B", "C"], { currentParticipantId: null, activeTargetIds: ["B", "C"] });
  assert.deepEqual(ambiguous?.players.map(p => p.id), ["B", "C"], "ambiguous focus does not choose first target");
  const rest = buildInteractionStageView(buildPresentationClientView(null, "D"), resolveDisplayName);
  assert.equal(projectGroupTargetScopeForViewer(rest, buildHeroFocusView(rest), null, "D"), null);
});
