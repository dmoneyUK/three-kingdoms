import test from "node:test";
import assert from "node:assert/strict";
import { composePresentationSnapshot } from "../game/presentation-snapshot.ts";
import { projectPresentationV2 } from "../game/presentation-v2.ts";

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
    sourceId: "A",
    effect: "Attack",
    targetIds: ["B"],
    currentParticipantId: "B",
    decisionActorId: "B",
    activeResolverId: "B",
    activeSourceId: "A",
    activeTargetIds: ["B"],
    participantIds: [],
    participantRoles: {
      sourceId: "A",
      originalTargetIds: ["B"],
      activeTargetIds: ["B"],
      currentParticipantId: "B",
      decisionActorId: "B",
      activeResolverId: "B",
      parentParticipantId: null,
      participantIds: [],
    },
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
    ...overrides,
  };
}

function groupScene({ child = false, currentParticipantId = "B", effect = "Raining Arrows" } = {}) {
  const targetIds = ["B", "C", "D"];
  return scene({
    rootFrameId: "group-frame",
    activeFrameId: child ? "damage-frame" : "group-frame",
    parentFrameId: child ? "group-frame" : null,
    stage: child ? "DAMAGE" : "GROUP_RESOLUTION",
    effect,
    targetIds,
    currentParticipantId,
    activeTargetIds: [currentParticipantId],
    participantRoles: {
      sourceId: "A", originalTargetIds: targetIds, activeTargetIds: [currentParticipantId], currentParticipantId,
      decisionActorId: "C", activeResolverId: "C", parentParticipantId: currentParticipantId, participantIds: targetIds,
    },
    continuity: child ? { relation: "CHILD_FRAME", parentFrameId: "group-frame" } : { relation: "ROOT_FRAME", parentFrameId: null },
  });
}

function groupResolution(groupSceneValue, overrides = {}) {
  return {
    semantics: "PROVEN",
    interactionId: groupSceneValue.interactionId,
    groupFrameId: groupSceneValue.rootFrameId,
    activeFrameId: groupSceneValue.activeFrameId,
    parentFrameId: groupSceneValue.parentFrameId,
    checkpointId: groupSceneValue.checkpointId,
    presentationRevision: groupSceneValue.presentationRevision,
    stage: groupSceneValue.stage,
    cardKind: "RainingArrows",
    resolutionSemantics: "GROUP",
    effect: "Raining Arrows",
    sourceId: "A",
    targetIds: groupSceneValue.targetIds,
    currentParticipantId: "B",
    participantProgress: [
      { playerId: "B", order: 1, status: groupSceneValue.activeFrameId === groupSceneValue.rootFrameId ? "CURRENT" : "PAUSED" },
      { playerId: "C", order: 2, status: "PENDING" },
      { playerId: "D", order: 3, status: "RESOLVED" },
    ],
    ...overrides,
  };
}

function presentation(interactionScene, stableBoundary = coherentBoundary()) {
  return {
    interactionScene,
    stableBoundary,
    settlement: { eventId: "legacy-final", resolutionId: "legacy-resolution" },
    transitionEvents: [{ eventId: "legacy-transition", type: "card", resolutionId: "legacy-resolution" }],
  };
}

function coherentBoundary(overrides = {}) {
  return {
    kind: "CHOICE",
    interactionId: "interaction-1",
    checkpointId: "checkpoint-1",
    presentationRevision: 3,
    decisionActorId: "B",
    ...overrides,
  };
}

test("snapshot composes proven identity and public scene while keeping CurrentAction local", () => {
  const publicPresentation = presentation(scene());
  const acting = composePresentationSnapshot({ presentationV2: publicPresentation, currentAction: { kind: "response", actorId: "B" }, actionRevision: "action-a", viewerId: "B" });
  const waiting = composePresentationSnapshot({ presentationV2: publicPresentation, currentAction: { kind: "none", actorId: null }, actionRevision: "action-b", viewerId: "C" });

  assert.deepEqual(acting.identity, { interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3 });
  assert.deepEqual(acting.interaction, publicPresentation.interactionScene);
  assert.deepEqual(acting.stable, publicPresentation.stableBoundary);
  assert.deepEqual(acting.decision, { actorId: "B", stage: "ATTACK_RESPONSE" });
  assert.equal(acting.groupParticipantProgress, null);
  assert.deepEqual(acting.interaction, waiting.interaction, "public interaction is viewer-stable");
  assert.deepEqual(acting.identity, waiting.identity, "public identity is viewer-stable");
  assert.deepEqual(acting.stable, waiting.stable, "public boundary is viewer-stable");
  assert.notDeepEqual(acting.localControl, waiting.localControl, "only local control reflects entitlement/current action");
  assert.equal(acting.localControl.entitled, true);
  assert.equal(waiting.localControl.entitled, false);
  assert.equal(acting.settlement, null);
  assert.deepEqual(acting.transitionEvents, []);
});

test("snapshot copies explicit self-target actions independently of an interaction scene", () => {
  const selfTargetAction = {
    semantics: "PROVEN", rootEventId: "peach-event", resolutionId: "peach-resolution",
    sourceId: "A", targetId: "A", cardKind: "Peach",
  };
  const publicPresentation = {
    interactionScene: null,
    stableBoundary: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
    selfTargetActions: [selfTargetAction],
  };
  const acting = composePresentationSnapshot({ presentationV2: publicPresentation, currentAction: { kind: "turn", actorId: "A" }, actionRevision: "action-a", viewerId: "A" });
  const waiting = composePresentationSnapshot({ presentationV2: publicPresentation, currentAction: { kind: "none", actorId: null }, actionRevision: "action-b", viewerId: "B" });
  assert.deepEqual(acting.selfTargetActions, [selfTargetAction]);
  assert.deepEqual(waiting.selfTargetActions, [selfTargetAction], "public self-target proof is viewer-equal");
  assert.deepEqual(composePresentationSnapshot({
    presentationV2: { ...publicPresentation, selfTargetActions: [selfTargetAction, { ...selfTargetAction, sourceId: "B" }] },
    currentAction: null, actionRevision: "action-c", viewerId: "B",
  }).selfTargetActions, [selfTargetAction], "malformed records are removed without discarding the valid public proof");
});

test("snapshot carries typed Attack/Dodge counter proof identically for acting and observing viewers", () => {
  const response = {
    semantics: "PROVEN", counterRelation: "BLOCKS_TARGET_EFFECT",
    interactionId: "attack-interaction", rootFrameId: "attack-frame",
    rootEventId: "attack-event", rootResolutionId: "attack-resolution",
    rootSourceId: "A", targetId: "B", responseActorId: "B",
    rootCardKind: "Attack", responseCardKind: "Dodge",
    responseEventId: "dodge-event", responseResolutionId: "attack-resolution",
  };
  const publicPresentation = {
    interactionScene: null,
    stableBoundary: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
    attackDodgeResponses: [response],
  };
  const acting = composePresentationSnapshot({ presentationV2: publicPresentation, currentAction: { kind: "turn", actorId: "A" }, actionRevision: "action-a", viewerId: "A" });
  const observing = composePresentationSnapshot({ presentationV2: publicPresentation, currentAction: { kind: "none", actorId: null }, actionRevision: "action-b", viewerId: "C" });
  assert.deepEqual(acting.attackDodgeResponses, [response]);
  assert.deepEqual(observing.attackDodgeResponses, [response], "public counter proof is viewer-equal");
  assert.equal(JSON.stringify(acting.attackDodgeResponses).includes("physical-card"), false);
  assert.deepEqual(composePresentationSnapshot({
    presentationV2: { ...publicPresentation, attackDodgeResponses: [response, { ...response, responseActorId: "A" }, { ...response, responseEventId: "dodge-event" }] },
    currentAction: null, actionRevision: "action-c", viewerId: "C",
  }).attackDodgeResponses, [], "malformed and duplicate response identity is dropped");
});

test("snapshot admits only a root- and scene-bound Duel exchange and strips extra card identity fields", () => {
  const interaction = scene({
    interactionId: "duel-interaction", rootFrameId: "duel-frame", activeFrameId: "duel-frame",
    checkpointId: "duel-checkpoint", presentationRevision: 4, stage: "DUEL_EXCHANGE",
    sourceId: "A", effect: "Duel", targetIds: ["B", "A"], currentParticipantId: "A",
    decisionActorId: "A", activeResolverId: "A", activeSourceId: "A", activeTargetIds: ["A", "B"],
    participantRoles: {
      sourceId: "A", originalTargetIds: ["B", "A"], activeTargetIds: ["A", "B"], currentParticipantId: "A",
      decisionActorId: "A", activeResolverId: "A", parentParticipantId: null, participantIds: [],
    },
  });
  const response = {
    semantics: "PROVEN", relation: "DUEL_EXCHANGE", interactionId: "duel-interaction", rootFrameId: "duel-frame",
    rootEventId: "duel-root-event", rootResolutionId: "duel-root-resolution", rootSourceId: "A", rootTargetId: "B",
    ordinal: 1, sourceId: "B", targetId: "A", decisionActorId: "B", responseActorId: "C", responseCardKind: "Attack",
    responseEventId: "duel-response-event", responseResolutionId: "duel-root-resolution",
    physicalCardId: "private-duel-response-card",
  };
  const exchange = {
    semantics: "PROVEN", interactionId: "duel-interaction", rootFrameId: "duel-frame",
    checkpointId: "duel-checkpoint", presentationRevision: 4,
    root: { eventId: "duel-root-event", resolutionId: "duel-root-resolution", sourceId: "A", targetId: "B", cardKind: "Duel", physicalCardId: "private-duel-root-card" },
    responseCount: 1, responses: [response], currentParticipantId: "A", decisionActorId: "A",
  };
  const boundary = coherentBoundary({ interactionId: "duel-interaction", checkpointId: "duel-checkpoint", presentationRevision: 4, decisionActorId: "A" });
  const publicPresentation = { ...presentation(interaction, boundary), duelExchange: exchange };
  const acting = composePresentationSnapshot({ presentationV2: publicPresentation, currentAction: { kind: "response", actorId: "A" }, actionRevision: "duel-a", viewerId: "A" });
  const observing = composePresentationSnapshot({ presentationV2: publicPresentation, currentAction: { kind: "none", actorId: null }, actionRevision: "duel-b", viewerId: "C" });
  assert.deepEqual(acting.duelExchange, observing.duelExchange, "public Duel proof remains viewer-equal");
  assert.equal(acting.duelExchange?.responses[0].responseActorId, "C", "the public submitter is distinct from the semantic Duel decision actor");
  assert.equal(JSON.stringify(acting.duelExchange).includes("private-duel-"), false, "unknown physical-card identity fields are not copied into the public snapshot");

  for (const malformed of [
    { ...exchange, root: { ...exchange.root, eventId: "other-root-event" } },
    { ...exchange, currentParticipantId: "B" },
    { ...exchange, responses: [{ ...response, sourceId: "A", decisionActorId: "B" }] },
    { ...exchange, responses: [response, { ...response }] },
  ]) {
    const result = composePresentationSnapshot({
      presentationV2: { ...publicPresentation, duelExchange: malformed },
      currentAction: { kind: "response", actorId: "A" }, actionRevision: "duel-invalid", viewerId: "A",
    });
    assert.equal(result.identity?.interactionId, "duel-interaction", "unrelated public scene authority remains usable");
    assert.equal(result.duelExchange, null, "an inconsistent Duel exchange is withheld as a whole");
  }
});

test("snapshot keeps Negation public event links only when they align with the proven chain", () => {
  const frameId = "root-negation-frame";
  const interaction = scene({ stage: "NEGATION", rootFrameId: frameId, activeFrameId: frameId, effect: "Steal", decisionActorId: "C", activeResolverId: "C" });
  const reactionChain = {
    semantics: "PROVEN", interactionId: interaction.interactionId, frameId,
    rootCard: { interactionId: interaction.interactionId, frameId, sourceId: "A", targetId: "B", cardKind: "Steal" },
    nodes: [{ nodeId: "negation-1", interactionId: interaction.interactionId, frameId, causedByNodeId: null, actorId: "C", kind: "CARD_PLAY", object: { type: "card", cardKind: "Negation" } }],
    rootEffectState: "BLOCKED",
    publicEventLinks: {
      root: { eventId: "steal-event", resolutionId: "steal-resolution" },
      nodes: [{ nodeId: "negation-1", eventId: "negation-event", resolutionId: "negation-resolution" }],
    },
  };
  const publicPresentation = { ...presentation(interaction, coherentBoundary({ decisionActorId: "C" })), reactionChain };
  const snapshotValue = composePresentationSnapshot({ presentationV2: publicPresentation, currentAction: { kind: "response", actorId: "C" }, actionRevision: "negation", viewerId: "C" });
  assert.deepEqual(snapshotValue.reactionChain?.publicEventLinks, reactionChain.publicEventLinks);
  assert.equal(snapshotValue.reactionChain?.rootEffectState, "BLOCKED");
  assert.deepEqual(composePresentationSnapshot({
    presentationV2: { ...publicPresentation, reactionChain: { ...reactionChain, publicEventLinks: { ...reactionChain.publicEventLinks, nodes: [{ ...reactionChain.publicEventLinks.nodes[0], nodeId: "unlinked-node" }] } } },
    currentAction: { kind: "response", actorId: "C" }, actionRevision: "negation", viewerId: "C",
  }).reactionChain?.publicEventLinks, undefined, "a response event link for another semantic node is withheld");
  assert.deepEqual(composePresentationSnapshot({
    presentationV2: { ...publicPresentation, reactionChain: { ...reactionChain, publicEventLinks: { ...reactionChain.publicEventLinks, nodes: [{ ...reactionChain.publicEventLinks.nodes[0], eventId: "steal-event" }] } } },
    currentAction: { kind: "response", actorId: "C" }, actionRevision: "negation", viewerId: "C",
  }).reactionChain?.publicEventLinks, undefined, "one public event cannot identify both the root and a response");
  const malformedDisposition = composePresentationSnapshot({
    presentationV2: { ...publicPresentation, reactionChain: { ...reactionChain, rootEffectState: "CANCELLED" } },
    currentAction: { kind: "response", actorId: "C" }, actionRevision: "negation", viewerId: "C",
  }).reactionChain;
  assert.equal(malformedDisposition?.rootEffectState, undefined, "unknown root disposition labels are not accepted");
  assert.equal(composePresentationSnapshot({
    presentationV2: { ...publicPresentation, reactionChain: { ...reactionChain, publicEventLinks: undefined } },
    currentAction: { kind: "response", actorId: "C" }, actionRevision: "negation", viewerId: "C",
  }).reactionChain?.rootEffectState, undefined, "root disposition is withheld when exact public card links are absent");
});

test("snapshot carries only Group Negation scope bound to the active target effect", () => {
  const baseScene = groupScene();
  const interaction = {
    ...baseScene,
    stage: "NEGATION",
    continuity: { relation: "SAME_FRAME", parentFrameId: null },
  };
  const targetEffectScope = {
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
    rootCard: null, nodes: [], groupTargetEffectScope: targetEffectScope,
  };
  const publicPresentation = {
    ...presentation(interaction, coherentBoundary({ decisionActorId: "B" })),
    groupResolution: groupResolution(interaction),
    reactionChain,
  };
  const compose = (chain) => composePresentationSnapshot({
    presentationV2: { ...publicPresentation, reactionChain: chain },
    currentAction: { kind: "response", actorId: "B" },
    actionRevision: "group-negation",
    viewerId: "C",
  });
  const valid = compose(reactionChain);
  assert.deepEqual(valid.reactionChain?.groupTargetEffectScope, targetEffectScope);

  for (const malformed of [
    { ...targetEffectScope, targetId: "C" },
    { ...targetEffectScope, groupFrameId: "other-frame" },
    { ...targetEffectScope, activeFrameId: "child-frame" },
    { ...targetEffectScope, checkpointId: "other-checkpoint" },
    { ...targetEffectScope, presentationRevision: targetEffectScope.presentationRevision + 1 },
    { ...targetEffectScope, sourceId: "other-source" },
    { ...targetEffectScope, cardKind: "BarbarianInvasion" },
    { ...targetEffectScope, effectState: "BLOCKED" },
  ]) {
    assert.equal(compose({ ...reactionChain, groupTargetEffectScope: malformed }).reactionChain, null,
      "a target/frame/checkpoint/revision/source/card mismatch withholds the reaction chain");
  }
  assert.equal(compose({ ...reactionChain, groupTargetEffectScope: undefined }).reactionChain, null,
    "a Group Negation chain without target-effect scope fails closed");
});

test("single-target Negation settlement requires a typed, root-bound public occurrence", () => {
  const envelope = {
    version: 1,
    interactionId: "interaction-negation",
    frames: [{
      frameId: "root-negation-frame", parentFrameId: null, stage: "NEGATION",
      origin: { originSourceId: "A", originEffect: "Dismantle", originalTargetIds: ["B"] },
      current: { currentSourceId: "A", currentEffect: "Dismantle", currentTargetIds: ["B"], resolvingPlayerId: "B" },
    }],
    activeFrameId: "root-negation-frame",
    checkpoint: { checkpointId: "settlement-checkpoint", frameId: "root-negation-frame", stage: "NEGATION" },
    presentationRevision: 5,
  };
  const proof = {
    semantics: "PROVEN", outcome: "ROOT_CANCELLED", interactionId: "interaction-negation",
    rootFrameId: "root-negation-frame", checkpointId: "settlement-checkpoint", presentationRevision: 5,
    resolutionId: "resolution-negation", rootCardKind: "Dismantle", sourceId: "A", targetId: "B",
  };
  const event = {
    id: "negation-settlement-event", type: "message", message: "root disposition",
    resolutionId: "resolution-negation", importance: "essential", negationSettlement: proof,
  };
  const projected = projectPresentationV2({ pending: null, currentAction: null, actionRevision: "settled", timeline: [event], causalEnvelope: envelope });
  assert.deepEqual(projected.negationSettlement, { ...proof, eventId: event.id });
  const local = composePresentationSnapshot({ presentationV2: projected, currentAction: null, actionRevision: "settled", viewerId: "A" });
  const observer = composePresentationSnapshot({ presentationV2: projected, currentAction: null, actionRevision: "other", viewerId: "C" });
  assert.deepEqual(local.settlement, { ...proof, eventId: event.id });
  assert.deepEqual(observer.settlement, local.settlement, "public settlement is viewer-equal");
  assert.equal(JSON.stringify(local.settlement).includes("physical"), false, "settlement exposes no physical card identity");

  for (const mismatch of [
    { event: { ...event, resolutionId: "different-resolution" } },
    { envelope: { ...envelope, interactionId: "different-interaction" } },
    { proof: { ...proof, rootFrameId: "different-root" } },
    { proof: { ...proof, sourceId: "different-source" } },
    { proof: { ...proof, targetId: "different-target" } },
  ]) {
    const invalidEvent = { ...event, ...(mismatch.event ?? {}), negationSettlement: mismatch.proof ?? proof };
    const invalidEnvelope = mismatch.envelope ?? envelope;
    assert.equal(projectPresentationV2({ pending: null, currentAction: null, actionRevision: "settled", timeline: [invalidEvent], causalEnvelope: invalidEnvelope }).negationSettlement, null);
  }

  const legacyFinalResult = projectPresentationV2({
    pending: null, currentAction: null, actionRevision: "settled",
    timeline: [{ ...event, negationSettlement: undefined, finalResult: true }], causalEnvelope: envelope,
  });
  assert.equal(legacyFinalResult.negationSettlement, null, "legacy result flags and text cannot manufacture Negation outcome");
  const openNegation = projectPresentationV2({
    pending: { kind: "response", continuation: { kind: "negation" } }, currentAction: null, actionRevision: "open",
    timeline: [event], causalEnvelope: envelope,
  });
  assert.equal(openNegation.negationSettlement, null, "an open Negation decision cannot expose a stale settlement");
});

test("snapshot forwards only identity- and ordered-scope-coherent Standard AOE progress", () => {
  for (const child of [false, true]) {
    const interaction = groupScene({ child });
    const projected = composePresentationSnapshot({
      presentationV2: { ...presentation(interaction), groupResolution: groupResolution(interaction, { participantProgress: [
        { playerId: "B", order: 1, status: child ? "PAUSED" : "CURRENT" },
        { playerId: "C", order: 2, status: "PENDING" },
        { playerId: "D", order: 3, status: "RESOLVED", outcome: "AVOIDED" },
      ] }) },
      currentAction: { kind: "response", actorId: "C" },
      actionRevision: `aoe-${child}`,
      viewerId: "C",
    });
    assert.deepEqual(projected.groupParticipantProgress, {
      cardKind: "RainingArrows",
      resolutionSemantics: "GROUP",
      interactionId: interaction.interactionId,
      groupFrameId: interaction.rootFrameId,
      activeFrameId: interaction.activeFrameId,
      checkpointId: interaction.checkpointId,
      presentationRevision: interaction.presentationRevision,
      targetIds: ["B", "C", "D"],
      currentParticipantId: "B",
      participants: [
        { playerId: "B", order: 1, status: child ? "PAUSED" : "CURRENT" },
        { playerId: "C", order: 2, status: "PENDING" },
        { playerId: "D", order: 3, status: "RESOLVED", outcome: "AVOIDED" },
      ],
    });
  }
});

test("snapshot admits only identity-coherent simultaneous Oath recipient scope", () => {
  const interaction = scene({
    rootFrameId: "oath-frame",
    activeFrameId: "oath-frame",
    stage: "NEGATION",
    effect: "Oath of the Peach Garden",
  });
  const oathRecipientScope = {
    semantics: "PROVEN",
    cardKind: "Oath",
    interactionId: interaction.interactionId,
    rootFrameId: interaction.rootFrameId,
    activeFrameId: interaction.activeFrameId,
    checkpointId: interaction.checkpointId,
    presentationRevision: interaction.presentationRevision,
    sourceId: interaction.sourceId,
    recipientIds: ["A", "C"],
  };
  const accepted = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), oathRecipientScope },
    currentAction: { kind: "response", actorId: "B" },
    actionRevision: "oath-1",
    viewerId: "B",
  });
  assert.deepEqual(accepted.oathRecipientScope, oathRecipientScope);

  const mismatched = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), oathRecipientScope: { ...oathRecipientScope, activeFrameId: "other-frame" } },
    currentAction: { kind: "response", actorId: "B" },
    actionRevision: "oath-2",
    viewerId: "B",
  });
  assert.equal(mismatched.oathRecipientScope, null, "a scope from another frame fails closed without discarding unrelated proven authority");
  assert.equal(mismatched.interaction?.semantics, "PROVEN");
});

test("snapshot preserves explicit ORDERED Halberd semantics and target order", () => {
  const interaction = groupScene();
  const orderedGroup = groupResolution(interaction, {
    cardKind: "SkyPiercingHalberdAttack",
    effect: "Attack",
    resolutionSemantics: "ORDERED",
  });
  const snapshot = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: orderedGroup },
    currentAction: { kind: "response", actorId: "B" },
    actionRevision: "halberd-ordered",
    viewerId: "B",
  });
  assert.equal(snapshot.groupParticipantProgress?.resolutionSemantics, "ORDERED");
  assert.deepEqual(snapshot.groupParticipantProgress?.targetIds, ["B", "C", "D"]);
  assert.deepEqual(snapshot.groupParticipantProgress?.participants.map(({ playerId, order }) => ({ playerId, order })), [
    { playerId: "B", order: 1 }, { playerId: "C", order: 2 }, { playerId: "D", order: 3 },
  ]);
});

test("snapshot drops AOE progress on root identity, order, participant, or status mismatch", () => {
  const interaction = groupScene();
  const base = groupResolution(interaction);
  const malformed = [
    { ...base, interactionId: "other-interaction" },
    { ...base, groupFrameId: "other-frame" },
    { ...base, targetIds: ["C", "B", "D"] },
    { ...base, resolutionSemantics: "INVALID" },
    { ...base, participantProgress: [...base.participantProgress].reverse() },
    { ...base, participantProgress: [{ ...base.participantProgress[0], status: "INVALID" }, ...base.participantProgress.slice(1)] },
    { ...base, participantProgress: [{ ...base.participantProgress[0], outcome: "AVOIDED" }, ...base.participantProgress.slice(1)] },
    { ...base, participantProgress: [{ ...base.participantProgress[0], outcome: "DAMAGED" }, ...base.participantProgress.slice(1)] },
    { ...base, participantProgress: [...base.participantProgress.slice(0, 1), { ...base.participantProgress[1], outcome: "AVOIDED" }, ...base.participantProgress.slice(2)] },
    { ...base, participantProgress: [...base.participantProgress.slice(0, 1), { ...base.participantProgress[1], outcome: "DAMAGED" }, ...base.participantProgress.slice(2)] },
    { ...base, currentParticipantId: "C" },
  ];
  for (const group of malformed) {
    const snapshot = composePresentationSnapshot({
      presentationV2: { ...presentation(interaction), groupResolution: group },
      currentAction: { kind: "response", actorId: "B" },
      actionRevision: "malformed-aoe",
      viewerId: "B",
    });
    assert.equal(snapshot.identity?.interactionId, interaction.interactionId, "unrelated public scene remains usable");
    assert.equal(snapshot.groupParticipantProgress, null);
  }
});

test("snapshot preserves only a resolved Raining Arrows Damaged outcome", () => {
  const interaction = groupScene({ currentParticipantId: "C" });
  const base = groupResolution(interaction, { currentParticipantId: "C", participantProgress: [
    { playerId: "B", order: 1, status: "RESOLVED", outcome: "DAMAGED" },
    { playerId: "C", order: 2, status: "CURRENT" },
    { playerId: "D", order: 3, status: "PENDING" },
  ] });
  const projected = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: base },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "resolved-damage-outcome",
    viewerId: "C",
  });
  assert.equal(projected.groupParticipantProgress?.participants[0].outcome, "DAMAGED");

  const malformed = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [{ ...base.participantProgress[0], status: "PAUSED" }, ...base.participantProgress.slice(1)] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "unresolved-damage-outcome",
    viewerId: "C",
  });
  assert.equal(malformed.groupParticipantProgress, null, "unresolved damage is not a public outcome");

  const negated = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "NEGATED" },
      ...base.participantProgress.slice(1),
    ] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "resolved-negated-outcome",
    viewerId: "C",
  });
  assert.equal(negated.groupParticipantProgress?.participants[0].outcome, "NEGATED");

  const defeated = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "DEFEATED" },
      ...base.participantProgress.slice(1),
    ] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "resolved-defeated-outcome",
    viewerId: "C",
  });
  assert.equal(defeated.groupParticipantProgress?.participants[0].outcome, "DEFEATED");

  const unresolvedNegated = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [
      { playerId: "B", order: 1, status: "PAUSED", outcome: "NEGATED" },
      ...base.participantProgress.slice(1),
    ] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "unresolved-negated-outcome",
    viewerId: "C",
  });
  assert.equal(unresolvedNegated.groupParticipantProgress, null, "an unresolved Negation cannot publish an outcome");
});

test("snapshot preserves resolved Barbarian Invasion damage but rejects avoidance", () => {
  const interaction = groupScene({ currentParticipantId: "C", effect: "Barbarian Invasion" });
  const base = groupResolution(interaction, {
    cardKind: "BarbarianInvasion",
    effect: "Barbarian Invasion",
    currentParticipantId: "C",
    participantProgress: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "DAMAGED" },
      { playerId: "C", order: 2, status: "CURRENT" },
      { playerId: "D", order: 3, status: "PENDING" },
    ],
  });
  const projected = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: base },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "barbarian-damage-outcome",
    viewerId: "C",
  });
  assert.equal(projected.groupParticipantProgress?.cardKind, "BarbarianInvasion");
  assert.equal(projected.groupParticipantProgress?.participants[0].outcome, "DAMAGED");

  const malformed = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "AVOIDED" },
      ...base.participantProgress.slice(1),
    ] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "barbarian-avoidance-outcome",
    viewerId: "C",
  });
  assert.equal(malformed.groupParticipantProgress, null, "Barbarian Invasion cannot claim an Avoided outcome");

  const negated = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "NEGATED" },
      ...base.participantProgress.slice(1),
    ] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "barbarian-negated-outcome",
    viewerId: "C",
  });
  assert.equal(negated.groupParticipantProgress?.participants[0].outcome, "NEGATED");

  const defeated = composePresentationSnapshot({
    presentationV2: { ...presentation(interaction), groupResolution: { ...base, participantProgress: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "DEFEATED" },
      ...base.participantProgress.slice(1),
    ] } },
    currentAction: { kind: "response", actorId: "C" },
    actionRevision: "barbarian-defeated-outcome",
    viewerId: "C",
  });
  assert.equal(defeated.groupParticipantProgress?.participants[0].outcome, "DEFEATED");
});

test("snapshot fails closed for malformed or absent public causal proof", () => {
  const malformed = composePresentationSnapshot({
    presentationV2: presentation(scene({ checkpointId: null }), { kind: "SETTLEMENT", interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3, decisionActorId: null }),
    currentAction: { kind: "none", actorId: null },
    actionRevision: "legacy-action",
    viewerId: "B",
  });
  const absent = composePresentationSnapshot({
    presentationV2: presentation(null, { kind: "SETTLEMENT", interactionId: "legacy", checkpointId: "legacy", presentationRevision: 99, decisionActorId: null }),
    currentAction: { kind: "none", actorId: null },
    actionRevision: "legacy-action",
    viewerId: "B",
  });

  for (const snapshot of [malformed, absent]) {
    assert.equal(snapshot.identity, null);
    assert.equal(snapshot.interaction, null);
    assert.equal(snapshot.decision, null);
    assert.deepEqual(snapshot.stable, { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null });
    assert.equal(snapshot.settlement, null, "legacy settlement cannot become authoritative");
    assert.deepEqual(snapshot.transitionEvents, [], "legacy transition events remain reserved");
  }
});

test("snapshot fails closed atomically for every scene-boundary coherence mismatch", () => {
  const cases = [
    ["interaction", { interactionId: "other-interaction" }],
    ["checkpoint", { checkpointId: "other-checkpoint" }],
    ["revision", { presentationRevision: 4 }],
    ["choice actor", { decisionActorId: "C" }],
    ["REST", { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null }],
    ["SETTLEMENT", { kind: "SETTLEMENT", interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 3, decisionActorId: "B" }],
  ];
  for (const [label, boundary] of cases) {
    const snapshot = composePresentationSnapshot({
      presentationV2: presentation(scene(), boundary),
      currentAction: { kind: "response", actorId: "B" },
      actionRevision: `local-${label}`,
      viewerId: "B",
    });
    assert.equal(snapshot.identity, null, `${label}: identity`);
    assert.equal(snapshot.interaction, null, `${label}: interaction`);
    assert.equal(snapshot.decision, null, `${label}: decision`);
    assert.deepEqual(snapshot.stable, { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null }, `${label}: stable`);
    assert.equal(snapshot.settlement, null, `${label}: settlement`);
    assert.deepEqual(snapshot.transitionEvents, [], `${label}: transition events`);
    assert.equal(snapshot.localControl.entitled, true, `${label}: local control remains local only`);
    assert.equal(snapshot.localControl.actionRevision, `local-${label}`, `${label}: local control cannot recreate public identity`);
  }
});

test("snapshot repeated reads are pure and do not change identity or revision", () => {
  const input = {
    presentationV2: presentation(scene()),
    currentAction: { kind: "response", actorId: "B" },
    actionRevision: "same-action",
    viewerId: "B",
  };
  const before = structuredClone(input);
  const first = composePresentationSnapshot(input);
  const second = composePresentationSnapshot(input);
  assert.deepEqual(second, first);
  assert.deepEqual(input, before, "composition does not mutate authoritative inputs");
});

test("localControl remains a thin viewer-private reference and never carries legal controls", () => {
  const snapshot = composePresentationSnapshot({
    presentationV2: presentation(scene()),
    currentAction: { kind: "response", actorId: "B" },
    actionRevision: "action-reference",
    viewerId: "B",
  });

  assert.deepEqual(Object.keys(snapshot.localControl).sort(), ["actionRevision", "actorId", "entitled", "kind", "source"]);
  assert.deepEqual(snapshot.localControl, {
    source: "CurrentAction",
    actionRevision: "action-reference",
    kind: "response",
    actorId: "B",
    entitled: true,
  });
  assert.equal("options" in snapshot.localControl, false);
  assert.equal("legalActions" in snapshot.localControl, false);
  assert.equal("cards" in snapshot.localControl, false);
  assert.equal("providers" in snapshot.localControl, false);
});
