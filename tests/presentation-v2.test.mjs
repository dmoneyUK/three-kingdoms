import test from "node:test";
import assert from "node:assert/strict";
import { presentationBarrierState, projectPresentationV2 } from "../game/presentation-v2.ts";

const card = (id, kind = "Attack") => ({ id, kind });
const event = (id, resolutionId, extra = {}) => ({ id, type: "card", player: "A", target: "B", card: card(`${id}-card`), resolutionId, importance: "essential", ...extra });
const action = ({ actorId = "B", kind = "response", reason = "Choose the response", revision = "revision-1", resolutionId = "r1", readyAfterEventId = "attack-event", deadline = 0, declineAction = "decline_response" } = {}) => ({
  version: 3, kind, actorId, reason, deadline, declineAction,
  presentation: { resolutionId, readyAfterEventId },
  actionRevision: revision,
});

function point(label, pending, currentAction, timeline, expected) {
  return { label, pending, currentAction, timeline, expected };
}

const attack = { kind: "response", actorId: "B", requirement: { kind: "dodge", sourceId: "A", targetId: "B" }, reason: "Respond to Attack", resolutionId: "r1", readyAfterEventId: "attack-event", continuation: { kind: "attack", sourceId: "A", targetId: "B", sequenceStartCardId: "attack-card", resumePhase: "play", resolutionId: "r1" } };
const damage = { kind: "trigger", actorId: "B", event: "damage_about_to_apply", reason: "Damage may be modified", resolutionId: "r1", readyAfterEventId: "damage-event", continuation: { kind: "damage_about_to_apply_event", sourceId: "A", targetId: "B", sequenceStartCardId: "attack-card", resumePhase: "play", resolutionId: "r1" } };

const flows = [
  {
    name: "A Attack -> Dodge -> settlement",
    points: [
      point("dodge decision", attack, action(), [event("attack-event", "r1")], { kind: "attack", source: "A", targets: ["B"], actor: "B" }),
      point("settlement", null, action({ kind: "turn", actorId: "A", reason: "Play cards or finish the Play Phase", declineAction: undefined }), [event("attack-event", "r1"), event("dodge-event", "r1", { card: card("dodge-card", "Dodge") }), event("settlement-event", "r1", { finalResult: true })], { kind: null, source: null, targets: [], actor: "A" }),
    ],
  },
  {
    name: "B Attack -> no Dodge -> Damage",
    points: [
      point("damage decision", damage, action({ actorId: "B", reason: "Damage is about to apply" }), [event("attack-event", "r1"), event("damage-event", "r1")], { kind: "damage_about_to_apply_event", source: "A", targets: ["B"], actor: "B" }),
      point("damage trigger", { ...damage, continuation: { kind: "damage_suffered_event", sourceId: "A", targetId: "B", amount: 1, stage: "reaction", sequenceStartCardId: "attack-card", resolutionId: "r1" } }, action({ actorId: "B", reason: "Damage suffered" }), [event("attack-event", "r1"), event("damage-event", "r1")], { kind: "damage_suffered_event", source: "A", targets: ["B"], actor: "B" }),
    ],
  },
  {
    name: "C Damage -> Dying -> Peach -> survive/defeat",
    points: [
      point("dying rescue", { kind: "dying", actorId: "C", sourceId: "A", targetId: "B", deadline: 30000, reason: "Rescue B", resumeTrigger: { kind: "damage_suffered_event", sourceId: "A", targetId: "B", amount: 1, stage: "reaction", resolutionId: "r1" } }, action({ kind: "dying", actorId: "C", reason: "Rescue B", resolutionId: null, readyAfterEventId: null, declineAction: "skip_rescue", deadline: 30000 }), [event("damage-event", "r1"), event("dying-event", "r1")], { kind: "dying", source: "A", targets: ["B"], actor: "C", parentKind: "damage_suffered_event" }),
      point("defeat settlement", null, action({ kind: "none", actorId: null, reason: "Waiting for the next legal action", resolutionId: null, readyAfterEventId: null, declineAction: undefined }), [event("damage-event", "r1"), event("defeat-event", "r1", { finalResult: true })], { kind: null, source: null, targets: [], actor: null }),
    ],
  },
  {
    name: "D AOE -> response -> damage -> resume -> next participant",
    points: [
      point("AOE participant", { kind: "response", actorId: "B", reason: "Respond to Raining Arrows", resolutionId: "r2", continuation: { kind: "group", cardKind: "RainingArrows", sourceId: "A", remainingIds: ["C", "D"], requiredKind: "dodge", resolutionId: "r2" } }, action({ actorId: "B", resolutionId: "r2", readyAfterEventId: "aoe-event" }), [event("aoe-event", "r2")], { kind: "group", source: "A", targets: [], actor: "B" }),
      point("nested group damage", { kind: "trigger", actorId: "B", event: "damage_suffered", reason: "Damage suffered", resolutionId: "r2", continuation: { kind: "damage_suffered_event", sourceId: "A", targetId: "B", amount: 1, stage: "reaction", resolutionId: "r2", resumeGroup: { kind: "response", actorId: "B", continuation: { kind: "group", cardKind: "RainingArrows", sourceId: "A", remainingIds: ["C", "D"], resolutionId: "r2" } } } }, action({ actorId: "B", resolutionId: "r2", readyAfterEventId: "damage-event" }), [event("aoe-event", "r2"), event("damage-event", "r2")], { kind: "damage_suffered_event", source: "A", targets: ["B"], actor: "B", parentKind: "response" }),
    ],
  },
  {
    name: "E Duel alternating Attack responses",
    points: [
      point("duel response", { kind: "response", actorId: "B", reason: "Respond to Duel", resolutionId: "r3", continuation: { kind: "duel", sourceId: "A", targetId: "B", opponentId: "B", resumePhase: "play", resolutionId: "r3" } }, action({ actorId: "B", reason: "Play Attack for Duel", resolutionId: "r3" }), [event("duel-event", "r3")], { kind: "duel", source: "A", targets: ["B"], actor: "B" }),
    ],
  },
  {
    name: "F Negation -> counter-Negation -> resume/cancel",
    points: [
      point("negation", { kind: "response", actorId: "B", reason: "Play Negation or pass", resolutionId: "r4", continuation: { kind: "negation", sourceId: "A", effectTargetId: "C", cardName: "Dismantle", remainingIds: ["C"], negated: false, resolutionId: "r4", effect: { kind: "dismantle", targetId: "C" } } }, action({ actorId: "B", reason: "Play Negation or pass", resolutionId: "r4" }), [event("stratagem-event", "r4")], { kind: "negation", source: "A", targets: ["C"], actor: "B" }),
      point("counter", { kind: "response", actorId: "C", reason: "Play Negation on B's Negation", resolutionId: "r4", continuation: { kind: "negation", sourceId: "A", effectTargetId: "C", cardName: "Dismantle", remainingIds: [], negated: true, resolutionId: "r4", effect: { kind: "dismantle", targetId: "C" } } }, action({ actorId: "C", reason: "Play Negation on B's Negation", resolutionId: "r4" }), [event("stratagem-event", "r4"), event("negation-event", "r4")], { kind: "negation", source: "A", targets: ["C"], actor: "C" }),
    ],
  },
  {
    name: "G Borrowed Sword -> forced Attack -> response/damage -> resume",
    points: [
      point("forced attack response", { kind: "response", actorId: "C", reason: "Respond to forced Attack", resolutionId: "r5", continuation: { kind: "borrowed_sword_attack", sourceId: "A", holderId: "B", targetId: "C", resumePhase: "play", resumePlayerId: "A", weaponId: "weapon", origin: "borrowed_sword" } }, action({ actorId: "C", reason: "Play Dodge or take damage", resolutionId: "r5" }), [event("borrowed-event", "r5"), event("forced-attack-event", "r5")], { kind: "borrowed_sword_attack", source: "A", targets: ["C"], actor: "C" }),
    ],
  },
  {
    name: "H Judgement -> modifier/replacement -> result -> resume",
    points: [
      point("judgement modifier", { kind: "trigger", actorId: "A", event: "judgement_revealed", reason: "Modify the Judgement", resolutionId: "r6", continuation: { kind: "judgement_revealed_event", judgement: { targetId: "B", revealedEventId: "judgement-event", resolutionId: "r6", resume: { kind: "delayed", targetId: "B" } } } }, action({ kind: "trigger", actorId: "A", reason: "Modify the Judgement", resolutionId: "r6", readyAfterEventId: "judgement-event", declineAction: "decline_trigger" }), [event("judgement-event", "r6", { judgement: true })], { kind: "judgement_revealed_event", source: null, targets: ["B"], actor: "A", parentKind: "delayed" }),
      point("judgement result", { kind: "trigger", actorId: "B", event: "judgement_effective", reason: "Judgement result", resolutionId: "r6", continuation: { kind: "judgement_effective_event", finalCard: card("replacement", "Dodge"), result: "satisfied", judgement: { targetId: "B", revealedEventId: "judgement-event", resolutionId: "r6", resume: { kind: "delayed", targetId: "B" } } } }, action({ kind: "trigger", actorId: "B", reason: "Judgement result", resolutionId: "r6", readyAfterEventId: "judgement-result", declineAction: "decline_trigger" }), [event("judgement-event", "r6", { judgement: true }), event("judgement-result", "r6", { finalResult: true })], { kind: "judgement_effective_event", source: null, targets: ["B"], actor: "B", parentKind: "delayed" }),
    ],
  },
  {
    name: "I Damage trigger -> secondary effect -> nested damage -> resume",
    points: [
      point("secondary damage trigger", { kind: "trigger", actorId: "B", event: "damage_suffered", reason: "Resolve damage reaction", resolutionId: "r7", continuation: { kind: "damage_suffered_event", sourceId: "A", targetId: "B", amount: 1, stage: "secondary", secondaryEffectId: "secondary", resolutionId: "r7", resumeDamageSuffered: { kind: "damage_suffered_event", sourceId: "A", targetId: "B", amount: 1, stage: "reaction", resolutionId: "r7" } } }, action({ kind: "trigger", actorId: "B", reason: "Resolve damage reaction", resolutionId: "r7", readyAfterEventId: "secondary-event", declineAction: "decline_trigger" }), [event("damage-event", "r7"), event("secondary-event", "r7")], { kind: "damage_suffered_event", source: "A", targets: ["B"], actor: "B", parentKind: "damage_suffered_event" }),
    ],
  },
];

for (const flow of flows) {
  test(`characterizes ${flow.name}`, () => {
    for (const fixture of flow.points) {
      const projected = projectPresentationV2({
        pending: fixture.pending,
        currentAction: fixture.currentAction,
        actionRevision: fixture.currentAction.actionRevision,
        timeline: fixture.timeline,
      });
      const active = projected.activeContext;
      assert.equal(projected.decision?.actorId, fixture.currentAction.actorId, `${flow.name}: ${fixture.label} actor`);
      assert.equal(projected.decision?.kind, fixture.currentAction.kind, `${flow.name}: ${fixture.label} kind`);
      assert.equal(fixture.currentAction.reason.length > 0, true, `${flow.name}: ${fixture.label} authoritative reason`);
      assert.equal(fixture.currentAction.declineAction === undefined || typeof fixture.currentAction.declineAction === "string", true, `${flow.name}: ${fixture.label} authoritative decline action`);
      assert.equal(typeof fixture.pending?.kind === "string" || fixture.pending === null, true, `${flow.name}: ${fixture.label} authoritative pending kind`);
      assert.equal(projected.decision?.actionRevision, fixture.currentAction.actionRevision, `${flow.name}: ${fixture.label} revision`);
      assert.equal(projected.decision?.resolutionId, fixture.currentAction.presentation.resolutionId, `${flow.name}: ${fixture.label} resolution`);
      assert.equal(projected.decision?.readyAfterEventId, fixture.currentAction.presentation.readyAfterEventId, `${flow.name}: ${fixture.label} barrier`);
      assert.equal(projected.decision?.deadline, fixture.currentAction.deadline, `${flow.name}: ${fixture.label} deadline`);
      assert.equal(projected.rootContext?.sourceId ?? null, fixture.expected.source, `${flow.name}: ${fixture.label} source`);
      assert.deepEqual(projected.rootContext?.originalTargetIds ?? [], fixture.expected.originalTargets ?? [], `${flow.name}: ${fixture.label} original target is explicit-only`);
      assert.deepEqual(active?.currentTargetIds ?? [], fixture.expected.targets, `${flow.name}: ${fixture.label} current target`);
      assert.equal(active?.kind ?? null, fixture.expected.kind, `${flow.name}: ${fixture.label} continuation`);
      if (fixture.expected.parentKind) assert.equal(projected.parentContext?.kind ?? null, fixture.expected.parentKind === "response" && flow.name.startsWith("D ") ? "group" : fixture.expected.parentKind, `${flow.name}: ${fixture.label} parent context`);
      assert.equal(projected.decision?.actorId ?? null, fixture.expected.actor, `${flow.name}: ${fixture.label} resolving actor`);
      assert.equal(projected.transitionEvents.every((item) => fixture.timeline.some((candidate) => candidate.id === item.eventId)), true, `${flow.name}: ${fixture.label} event references are from supplied history`);
      assert.equal("options" in (projected.decision ?? {}), false, `${flow.name}: legality remains in CurrentAction`);
      assert.deepEqual(projectPresentationV2({ pending: fixture.pending, currentAction: fixture.currentAction, actionRevision: fixture.currentAction.actionRevision, timeline: fixture.timeline }), projected, `${flow.name}: deterministic`);
    }
  });
}

test("single-target Negation exposes only an authoritative root card identity", () => {
  const interactionId = "root-card-interaction";
  const frameId = "root-negation-frame";
  const causal = { interactionId, frameId };
  const baseFrame = {
    frameId,
    parentFrameId: null,
    stage: "NEGATION",
    origin: { originSourceId: "A", originEffect: "Burning Bridges", originalTargetIds: ["C"] },
    current: { currentSourceId: "A", currentEffect: "Burning Bridges", currentTargetIds: ["C"], resolvingPlayerId: "B" },
  };
  const baseContinuation = {
    kind: "negation",
    sourceId: "A",
    effectTargetId: "C",
    rootCardKind: "Dismantle",
    cardName: "Burning Bridges",
    remainingIds: [],
    negated: false,
    effect: { kind: "dismantle", targetId: "C" },
    causal,
  };
  const project = ({ continuation = {}, frame = {}, responseFrameId = frameId } = {}) => projectPresentationV2({
    pending: {
      kind: "response", actorId: "B", causal: { interactionId, frameId: responseFrameId },
      continuation: { ...baseContinuation, ...continuation },
    },
    currentAction: action({ actorId: "B" }),
    actionRevision: "root-card-action",
    timeline: [],
    causalEnvelope: {
      version: 1,
      interactionId,
      frames: [{ ...baseFrame, ...frame }],
      activeFrameId: frameId,
      checkpoint: { checkpointId: "root-card-checkpoint", frameId, stage: "NEGATION" },
      presentationRevision: 1,
    },
  });

  const proven = project();
  assert.deepEqual(proven.reactionChain?.rootCard, {
    interactionId,
    frameId,
    sourceId: "A",
    targetId: "C",
    cardKind: "Dismantle",
  }, "Dismantle remains typed even though its public display name is Burning Bridges");

  assert.equal(project({ continuation: { rootCardKind: undefined } }).reactionChain?.rootCard, null, "legacy/missing card proof fails closed");
  assert.equal(project({ continuation: { rootCardKind: "Steal" } }).reactionChain?.rootCard, null, "card/effect mismatch fails closed");
  assert.equal(project({ continuation: { sourceId: "other-source" } }).reactionChain?.rootCard, null, "source mismatch fails closed");
  assert.equal(project({ continuation: { effectTargetId: "other-target" } }).reactionChain?.rootCard, null, "target mismatch fails closed");
  assert.equal(project({ frame: { current: { ...baseFrame.current, currentSourceId: "other-source" } } }).reactionChain?.rootCard, null, "frame/source mismatch fails closed");
  assert.equal(project({ frame: { current: { ...baseFrame.current, currentEffect: "Steal" } } }).reactionChain?.rootCard, null, "root-frame effect mismatch fails closed without mapping display names to card kinds");
  assert.equal(project({ frame: { origin: { ...baseFrame.origin, originalTargetIds: ["other-target"] } } }).reactionChain?.rootCard, null, "frame/target mismatch fails closed");
  assert.equal(project({ continuation: { causal: { interactionId, frameId: "other-frame" } } }).reactionChain, null, "continuation frame mismatch rejects the chain");
  assert.equal(project({ continuation: { effect: { kind: "oath" }, rootCardKind: "Oath" } }).reactionChain?.rootCard, null, "multi-target Oath does not use the single-target root contract");
  assert.equal(project({ continuation: { effect: { kind: "group", pending: {} }, rootCardKind: "BarbarianInvasion" } }).reactionChain, null, "an unproven Group target-effect association withholds the reaction chain");
});

test("single-target Negation event links bind exact public card events without copying physical card IDs", () => {
  const interactionId = "steal-negation-interaction";
  const frameId = "steal-negation-frame";
  const rootCardId = "private-steal-card";
  const negationCardId = "private-negation-card";
  const secondNegationCardId = "private-second-negation-card";
  const rootEvent = { id: "public-steal-event", type: "card", action: "play", presentation: true, resolutionId: "steal-resolution", card: card(rootCardId, "Steal") };
  const negationEvent = { id: "public-negation-event", type: "card", action: "play", presentation: true, resolutionId: "negation-resolution", card: card(negationCardId, "Negation") };
  const secondNegationEvent = { id: "public-second-negation-event", type: "card", action: "play", presentation: true, resolutionId: "second-negation-resolution", card: card(secondNegationCardId, "Negation") };
  const frame = {
    frameId,
    parentFrameId: null,
    stage: "NEGATION",
    origin: { originSourceId: "A", originEffect: "Steal", originalTargetIds: ["C"] },
    current: { currentSourceId: "A", currentEffect: "Steal", currentTargetIds: ["C"], resolvingPlayerId: "C" },
  };
  const pending = {
    kind: "response", actorId: "C", causal: { interactionId, frameId },
    continuation: {
      kind: "negation", sourceId: "A", effectTargetId: "C", rootCardKind: "Steal", cardName: "Steal", negated: true, chainDepth: 1,
      remainingIds: [], effect: { kind: "steal", targetId: "C" },
      heldCards: [card(rootCardId, "Steal"), card(negationCardId, "Negation")],
      negationHistory: [{ nodeId: "negation-node-1", interactionId, frameId, causedByNodeId: null, actorId: "B", physicalCardId: negationCardId, kind: "NEGATION_CARD" }],
      causal: { interactionId, frameId },
    },
  };
  const project = (timeline, continuationOverrides = {}) => projectPresentationV2({
    pending: { ...pending, continuation: { ...pending.continuation, ...continuationOverrides } },
    currentAction: action({ actorId: "C", resolutionId: "negation-resolution" }),
    actionRevision: "steal-negation-revision",
    timeline,
    causalEnvelope: {
      version: 1, interactionId, frames: [frame], activeFrameId: frameId,
      checkpoint: { checkpointId: "steal-negation-checkpoint", frameId, stage: "NEGATION" }, presentationRevision: 2,
    },
  });

  const linked = project([rootEvent, negationEvent]).reactionChain;
  assert.deepEqual(linked?.publicEventLinks, {
    root: { eventId: rootEvent.id, resolutionId: rootEvent.resolutionId },
    nodes: [{ nodeId: "negation-node-1", eventId: negationEvent.id, resolutionId: negationEvent.resolutionId }],
  });
  assert.equal(linked?.rootEffectState, "BLOCKED", "the active Negation continuation owns the blocked root state");
  assert.equal(JSON.stringify(linked.publicEventLinks).includes(rootCardId), false);
  assert.equal(JSON.stringify(linked.publicEventLinks).includes(negationCardId), false);
  assert.equal(project([rootEvent]).reactionChain?.publicEventLinks, undefined, "a missing response event withholds the entire graph-link proof");
  assert.equal(project([{ ...rootEvent, id: "duplicate-root-event" }, rootEvent, negationEvent]).reactionChain?.publicEventLinks, undefined, "duplicate physical-card event matches fail closed");
  assert.equal(project([rootEvent, negationEvent, { ...negationEvent, id: "duplicate-negation-event" }]).reactionChain?.publicEventLinks, undefined, "duplicate response-card event matches fail closed");
  assert.equal(project([rootEvent, { ...negationEvent, card: card(negationCardId, "Dodge") }]).reactionChain?.publicEventLinks, undefined, "a non-Negation event cannot satisfy a Negation node");

  const opened = project([rootEvent], { negated: false, chainDepth: 0, negationHistory: [], heldCards: [card(rootCardId, "Steal")] }).reactionChain;
  assert.equal(opened?.rootEffectState, "ACTIVE", "an untouched single-target root is active");
  const countered = project([rootEvent, negationEvent, secondNegationEvent], {
    negated: false,
    chainDepth: 2,
    negationHistory: [
      pending.continuation.negationHistory[0],
      { ...pending.continuation.negationHistory[0], nodeId: "negation-node-2", causedByNodeId: "negation-node-1", actorId: "D", physicalCardId: secondNegationCardId },
    ],
    heldCards: [card(rootCardId, "Steal"), card(negationCardId, "Negation"), card(secondNegationCardId, "Negation")],
  }).reactionChain;
  assert.equal(countered?.rootEffectState, "ACTIVE", "a server-authoritative counter-Negation restores the root");
  assert.equal(countered?.publicEventLinks?.nodes.length, 2);
  assert.equal(project([rootEvent, negationEvent], { negated: false, chainDepth: 1 }).reactionChain?.rootEffectState, undefined, "incoherent server state fails closed rather than deriving parity from the public chain");
  assert.equal(project([rootEvent], { negated: true, chainDepth: 1, negationHistory: [], heldCards: [card(rootCardId, "Steal")] }).reactionChain?.rootEffectState, undefined, "an unlinked provider response does not expose a root disposition");
});

test("ordinary self-target Peach proof requires an explicit, unique public play event", () => {
  const proof = { semantics: "PROVEN", sourceId: "A", targetId: "A", cardKind: "Peach" };
  const selfPeach = event("self-peach-event", "self-peach-resolution", {
    player: "A", target: "A", action: "play", card: card("self-peach-card", "Peach"),
    selfTargetAction: proof,
  });
  const project = (timeline) => projectPresentationV2({ pending: null, currentAction: null, actionRevision: "rest", timeline });
  assert.deepEqual(project([selfPeach]).selfTargetActions, [{
    semantics: "PROVEN", rootEventId: "self-peach-event", resolutionId: "self-peach-resolution",
    sourceId: "A", targetId: "A", cardKind: "Peach",
  }]);

  for (const invalid of [
    { ...selfPeach, selfTargetAction: undefined },
    { ...selfPeach, presentation: false },
    { ...selfPeach, playedAs: "peach" },
    { ...selfPeach, playedAs: "attack" },
    { ...selfPeach, card: card("not-peach-card", "Attack") },
    { ...selfPeach, selfTargetAction: { ...proof, targetId: "B" } },
    { ...selfPeach, selfTargetAction: { ...proof, sourceId: "" } },
    { ...selfPeach, resolutionId: "" },
    { ...selfPeach, selfTargetAction: { ...proof, semantics: "INFERRED" } },
  ]) {
    assert.deepEqual(project([invalid]).selfTargetActions, [], "missing or mismatched public proof fails closed");
  }
  assert.deepEqual(project([selfPeach, { ...selfPeach }]).selfTargetActions, [], "duplicate event identity is ambiguous");
});

test("Attack/Dodge counter proof links one submitted physical Dodge to its exact Attack target effect", () => {
  const root = event("attack-root-event", "attack-resolution", {
    player: "A", target: "B", action: "play", card: card("attack-physical-card", "Attack"),
  });
  const proof = {
    semantics: "PROVEN", counterRelation: "BLOCKS_TARGET_EFFECT",
    interactionId: "attack-interaction", rootFrameId: "attack-frame",
    rootEventId: root.id, rootResolutionId: root.resolutionId,
    rootSourceId: "A", targetId: "B", responseActorId: "B",
    rootCardKind: "Attack", responseCardKind: "Dodge",
  };
  const dodge = event("dodge-response-event", root.resolutionId, {
    player: "B", target: "A", action: "play", card: card("dodge-physical-card", "Dodge"),
    attackDodgeResponse: proof,
  });
  const project = (timeline) => projectPresentationV2({ pending: null, currentAction: null, actionRevision: "settled", timeline });

  assert.deepEqual(project([root]).attackDodgeResponses ?? [], [], "there is no Dodge response node before submission");
  const expected = [{
    ...proof,
    responseEventId: dodge.id,
    responseResolutionId: dodge.resolutionId,
  }];
  assert.deepEqual(project([root, dodge]).attackDodgeResponses, expected);

  for (const invalid of [
    { timeline: [dodge], label: "missing root event" },
    { timeline: [root, { ...dodge, attackDodgeResponse: { ...proof, rootResolutionId: "stale-resolution" } }], label: "mismatched root resolution" },
    { timeline: [root, { ...dodge, resolutionId: "other-resolution" }], label: "response belongs to another resolution" },
    { timeline: [root, { ...dodge, playedAs: "dodge" }], label: "converted response is not a physical Dodge" },
    { timeline: [root, { ...dodge, card: card("dodge-physical-card", "Attack") }], label: "wrong response card kind" },
    { timeline: [root, { ...dodge, attackDodgeResponse: { ...proof, responseActorId: "A" } }], label: "response actor differs from target" },
    { timeline: [root, { ...dodge, attackDodgeResponse: { ...proof, targetId: "A" } }], label: "self-target relation is invalid for ordinary Attack" },
    { timeline: [root, { ...root }, dodge], label: "duplicate root event identity" },
    { timeline: [root, { ...event("other-event", "other-resolution", { card: card("attack-physical-card", "Dodge") }) }, dodge], label: "duplicate physical card identity" },
    { timeline: [root, dodge, { ...dodge }], label: "duplicate response event identity" },
  ]) {
    assert.deepEqual(project(invalid.timeline).attackDodgeResponses ?? [], [], `${invalid.label} fails closed`);
  }
});

test("Duel exchange links one persistent root to only submitted server-directed Attack responses", () => {
  const root = event("duel-root-event", "duel-root-resolution", {
    player: "A", target: "B", action: "play", card: card("private-duel-root-card", "Duel"),
  });
  const responseProof = {
    semantics: "PROVEN", relation: "DUEL_EXCHANGE",
    interactionId: "duel-interaction", rootFrameId: "duel-frame",
    rootEventId: root.id, rootResolutionId: root.resolutionId,
    rootSourceId: "A", rootTargetId: "B", ordinal: 1,
    sourceId: "B", targetId: "A", decisionActorId: "B", responseActorId: "B", responseCardKind: "Attack",
  };
  const response = event("duel-attack-event", root.resolutionId, {
    player: "B", target: "A", action: "play", card: card("private-duel-attack-card", "Attack"), duelAttackResponse: responseProof,
  });
  const causalEnvelope = (participant, opponent, revision) => ({
    version: 1,
    interactionId: "duel-interaction",
    frames: [{
      frameId: "duel-frame", parentFrameId: null, stage: "DUEL_EXCHANGE",
      origin: { originSourceId: "A", originEffect: "duel", originalTargetIds: ["B", "A"] },
      current: { currentSourceId: "A", currentEffect: "duel", currentTargetIds: [participant, opponent], resolvingPlayerId: participant },
    }],
    activeFrameId: "duel-frame",
    checkpoint: { checkpointId: `duel-checkpoint-${revision}`, frameId: "duel-frame", stage: "DUEL_EXCHANGE" },
    presentationRevision: revision,
  });
  const pending = (actorId, opponentId, attackResponseCount) => ({
    kind: "response", actorId, resolutionId: root.resolutionId, readyAfterEventId: root.id,
    causal: { interactionId: "duel-interaction", frameId: "duel-frame" },
    continuation: {
      kind: "duel", sourceId: "A", targetId: "B", opponentId, resumePhase: "play",
      damageCards: [{ id: "private-duel-root-card", kind: "Duel" }], attackResponseCount,
      causal: { interactionId: "duel-interaction", frameId: "duel-frame" },
    },
  });
  const project = (participant, opponent, count, revision, timeline) => projectPresentationV2({
    pending: pending(participant, opponent, count),
    currentAction: action({ actorId: participant, resolutionId: root.resolutionId, readyAfterEventId: timeline.at(-1)?.id }),
    actionRevision: `duel-action-${revision}`,
    timeline,
    causalEnvelope: causalEnvelope(participant, opponent, revision),
  });

  const open = project("B", "A", 0, 0, [root]);
  assert.deepEqual(open.duelExchange, {
    semantics: "PROVEN", interactionId: "duel-interaction", rootFrameId: "duel-frame",
    checkpointId: "duel-checkpoint-0", presentationRevision: 0,
    root: { eventId: root.id, resolutionId: root.resolutionId, sourceId: "A", targetId: "B", cardKind: "Duel" },
    responseCount: 0, responses: [], currentParticipantId: "B", decisionActorId: "B",
  }, "an open response window contains no fabricated Attack response");

  const answered = project("A", "B", 1, 1, [root, response]);
  assert.deepEqual(answered.duelExchange?.responses, [{
    ...responseProof, responseEventId: response.id, responseResolutionId: response.resolutionId,
  }]);
  assert.equal(answered.duelExchange?.root.eventId, open.duelExchange.root.eventId, "the root remains stable through the server handoff");
  assert.equal(JSON.stringify(answered.duelExchange).includes("private-duel-root-card"), false);
  assert.equal(JSON.stringify(answered.duelExchange).includes("private-duel-attack-card"), false);

  for (const invalid of [
    { timeline: [root], count: undefined, label: "legacy continuation has no authoritative response count" },
    { timeline: [response], count: 1, label: "missing root event" },
    { timeline: [root, response], count: 2, label: "missing submitted response link" },
    { timeline: [root, { ...response, resolutionId: "stale-resolution" }], count: 1, label: "response is linked to a stale resolution" },
    { timeline: [root, { ...response, duelAttackResponse: { ...responseProof, rootEventId: "another-root" } }], count: 1, label: "mismatched root link" },
    { timeline: [root, { ...response, duelAttackResponse: { ...responseProof, targetId: "C" } }], count: 1, label: "response target outside Duel" },
    { timeline: [root, { ...response, card: card("not-an-attack", "Dodge") }], count: 1, label: "linked event is not an Attack" },
    { timeline: [root, { ...response, duelAttackResponse: { ...responseProof, responseActorId: undefined } }], count: 1, label: "missing public submitter identity" },
    { timeline: [root, response, { ...response, id: "duel-attack-event-2", duelAttackResponse: { ...responseProof } }], count: 2, label: "duplicate response ordinal" },
    { timeline: [root, response, { ...response }], count: 1, label: "duplicate response event identity" },
  ]) {
    assert.equal(project("A", "B", invalid.count, 1, invalid.timeline).duelExchange, null, `${invalid.label} fails closed`);
  }
});

test("group projection records missing authoritative semantics instead of guessing", () => {
  const projected = projectPresentationV2({ pending: flows[3].points[0].pending, currentAction: flows[3].points[0].currentAction, actionRevision: "r", timeline: flows[3].points[0].timeline });
  assert.equal(projected.groupResolution?.semantics, "UNPROVEN");
  assert.deepEqual(projected.groupResolution?.participantIds, ["C", "D"]);
  assert.equal(projected.groupResolution?.activeParticipantId, null);
});

test("C3 Group projection uses the authoritative envelope for stable parent and child semantics", () => {
  const groupPending = {
    ...flows[3].points[0].pending,
    causal: { interactionId: "group-interaction", frameId: "group-frame" },
    continuation: {
      ...flows[3].points[0].pending.continuation,
      causal: { interactionId: "group-interaction", frameId: "group-frame" },
      participantProgress: {
        version: 1,
        interactionId: "group-interaction",
        groupFrameId: "group-frame",
        resolutionSemantics: "GROUP",
        participants: [
          { playerId: "B", status: "PAUSED" },
          { playerId: "C", status: "PENDING" },
          { playerId: "D", status: "PENDING" },
        ],
      },
    },
  };
  const groupFrame = {
    frameId: "group-frame",
    parentFrameId: null,
    stage: "GROUP_RESOLUTION",
    origin: { originSourceId: "A", originEffect: "RainingArrows", originalTargetIds: ["B", "C", "D"] },
    current: { currentSourceId: "A", currentEffect: "Raining Arrows", currentTargetIds: ["B"], resolvingPlayerId: "B" },
  };
  const damageFrame = {
    frameId: "damage-frame",
    parentFrameId: "group-frame",
    stage: "DAMAGE",
    origin: { originSourceId: "A", originEffect: "Raining Arrows", originalTargetIds: ["B"] },
    current: { currentSourceId: "A", currentEffect: "damage", currentTargetIds: ["B"], resolvingPlayerId: "C" },
  };
  const childEnvelope = { version: 1, interactionId: "group-interaction", frames: [groupFrame, damageFrame], activeFrameId: "damage-frame", checkpoint: { checkpointId: "checkpoint-damage", frameId: "damage-frame", stage: "DAMAGE" }, presentationRevision: 4 };
  const child = projectPresentationV2({ pending: { kind: "trigger", actorId: "C", causal: { interactionId: "group-interaction", frameId: "damage-frame" }, continuation: { kind: "damage_suffered_event", sourceId: "A", targetId: "B", causal: { interactionId: "group-interaction", frameId: "damage-frame" }, resumeGroup: groupPending } }, currentAction: action({ actorId: "C", kind: "trigger" }), actionRevision: "action-child", timeline: [], causalEnvelope: childEnvelope });
  assert.equal(child.groupResolution?.semantics, "PROVEN");
  assert.equal(child.groupResolution?.resolutionSemantics, "GROUP");
  assert.equal(child.groupResolution?.interactionId, "group-interaction");
  assert.equal(child.groupResolution?.groupFrameId, "group-frame");
  assert.equal(child.groupResolution?.activeFrameId, "damage-frame");
  assert.equal(child.groupResolution?.parentFrameId, "group-frame");
  assert.equal(child.groupResolution?.stage, "DAMAGE");
  assert.deepEqual(child.groupResolution?.targetIds, ["B", "C", "D"]);
  assert.deepEqual(child.groupResolution?.participantProgress, [
    { playerId: "B", order: 1, status: "PAUSED" },
    { playerId: "C", order: 2, status: "PENDING" },
    { playerId: "D", order: 3, status: "PENDING" },
  ]);
  assert.equal(child.groupResolution?.currentParticipantId, "B");
  assert.equal(child.groupResolution?.decisionActorId, "C");
  assert.equal(child.groupResolution?.activeResolverId, "C");
  assert.deepEqual(child.groupResolution?.activeTargetIds, ["B"]);
  assert.deepEqual(child.interactionScene, {
    semantics: "PROVEN",
    interactionId: "group-interaction",
    rootFrameId: "group-frame",
    activeFrameId: "damage-frame",
    parentFrameId: "group-frame",
    checkpointId: "checkpoint-damage",
    presentationRevision: 4,
    stage: "DAMAGE",
    sourceId: "A",
    effect: "RainingArrows",
    targetIds: ["B", "C", "D"],
    currentParticipantId: "B",
    decisionActorId: "C",
    activeResolverId: "C",
    activeSourceId: "A",
    activeTargetIds: ["B"],
    participantIds: ["C", "D"],
    participantRoles: { sourceId: "A", originalTargetIds: ["B", "C", "D"], activeTargetIds: ["B"], currentParticipantId: "B", decisionActorId: "C", activeResolverId: "C", parentParticipantId: "B", participantIds: ["C", "D"] },
    rootOrigin: { frameId: "group-frame", stage: "GROUP_RESOLUTION", sourceId: "A", effect: "RainingArrows", targetIds: ["B", "C", "D"] },
    continuity: { relation: "CHILD_FRAME", parentFrameId: "group-frame" },
  });

  const resumedEnvelope = { ...childEnvelope, activeFrameId: "group-frame", checkpoint: { checkpointId: "checkpoint-group", frameId: "group-frame", stage: "GROUP_RESOLUTION" }, presentationRevision: 5 };
  const resumedPending = {
    ...groupPending,
    continuation: {
      ...groupPending.continuation,
      participantProgress: {
        ...groupPending.continuation.participantProgress,
        participants: [
          { playerId: "B", status: "CURRENT" },
          { playerId: "C", status: "PENDING" },
          { playerId: "D", status: "PENDING" },
        ],
      },
    },
  };
  const resumed = projectPresentationV2({ pending: resumedPending, currentAction: action({ actorId: "C" }), actionRevision: "action-next", timeline: [], causalEnvelope: resumedEnvelope });
  assert.equal(resumed.groupResolution?.interactionId, child.groupResolution?.interactionId);
  assert.equal(resumed.groupResolution?.resolutionSemantics, "GROUP");
  assert.equal(resumed.groupResolution?.groupFrameId, child.groupResolution?.groupFrameId);
  assert.equal(resumed.groupResolution?.activeFrameId, "group-frame");
  assert.equal(resumed.groupResolution?.stage, "GROUP_RESOLUTION");
  assert.equal(resumed.groupResolution?.checkpointId, "checkpoint-group");
  assert.equal(resumed.groupResolution?.currentParticipantId, "B");
  assert.equal(resumed.groupResolution?.decisionActorId, "B");
  assert.equal(resumed.groupResolution?.activeResolverId, "B");
  assert.deepEqual(resumed.groupResolution?.participantProgress, [
    { playerId: "B", order: 1, status: "CURRENT" },
    { playerId: "C", order: 2, status: "PENDING" },
    { playerId: "D", order: 3, status: "PENDING" },
  ]);
  assert.equal(resumed.interactionScene?.continuity.relation, "ROOT_FRAME");
  assert.equal(resumed.interactionScene?.activeFrameId, "group-frame");
});

test("AOE participant progress fails closed on scope, identity, ordering, or status mismatch", () => {
  const point = flows[3].points[0];
  const causal = { interactionId: "progress-interaction", frameId: "progress-group-frame" };
  const progress = {
    version: 1,
    interactionId: causal.interactionId,
    groupFrameId: causal.frameId,
    resolutionSemantics: "GROUP",
    participants: [
      { playerId: "B", status: "CURRENT" },
      { playerId: "C", status: "PENDING" },
      { playerId: "D", status: "PENDING" },
    ],
  };
  const pending = {
    ...point.pending,
    causal,
    continuation: { ...point.pending.continuation, causal, participantProgress: progress },
  };
  const frame = {
    frameId: causal.frameId,
    parentFrameId: null,
    stage: "GROUP_RESOLUTION",
    origin: { originSourceId: "A", originEffect: "RainingArrows", originalTargetIds: ["B", "C", "D"] },
    current: { currentSourceId: "A", currentEffect: "RainingArrows", currentTargetIds: ["B"], resolvingPlayerId: "B" },
  };
  const causalEnvelope = { version: 1, interactionId: causal.interactionId, frames: [frame], activeFrameId: frame.frameId, checkpoint: { checkpointId: "progress-checkpoint", frameId: frame.frameId, stage: frame.stage }, presentationRevision: 1 };
  const project = (candidate, envelope = causalEnvelope) => projectPresentationV2({ pending: candidate, currentAction: point.currentAction, actionRevision: "progress", timeline: [], causalEnvelope: envelope });
  assert.deepEqual(project(pending).groupResolution?.participantProgress, [
    { playerId: "B", order: 1, status: "CURRENT" },
    { playerId: "C", order: 2, status: "PENDING" },
    { playerId: "D", order: 3, status: "PENDING" },
  ]);
  const avoided = {
    ...pending,
    continuation: {
      ...pending.continuation,
      participantProgress: {
        ...progress,
        participants: [progress.participants[0], progress.participants[1], { playerId: "D", status: "RESOLVED", outcome: "AVOIDED" }],
      },
    },
  };
  assert.deepEqual(project(avoided).groupResolution?.participantProgress, [
    { playerId: "B", order: 1, status: "CURRENT" },
    { playerId: "C", order: 2, status: "PENDING" },
    { playerId: "D", order: 3, status: "RESOLVED", outcome: "AVOIDED" },
  ]);
  const damaged = {
    ...pending,
    continuation: {
      ...pending.continuation,
      participantProgress: {
        ...progress,
        participants: [progress.participants[0], progress.participants[1], { playerId: "D", status: "RESOLVED", outcome: "DAMAGED" }],
      },
    },
  };
  assert.deepEqual(project(damaged).groupResolution?.participantProgress, [
    { playerId: "B", order: 1, status: "CURRENT" },
    { playerId: "C", order: 2, status: "PENDING" },
    { playerId: "D", order: 3, status: "RESOLVED", outcome: "DAMAGED" },
  ]);
  const rainingNegated = {
    ...pending,
    continuation: {
      ...pending.continuation,
      participantProgress: {
        ...progress,
        participants: [progress.participants[0], progress.participants[1], { playerId: "D", status: "RESOLVED", outcome: "NEGATED" }],
      },
    },
  };
  assert.deepEqual(project(rainingNegated).groupResolution?.participantProgress, [
    { playerId: "B", order: 1, status: "CURRENT" },
    { playerId: "C", order: 2, status: "PENDING" },
    { playerId: "D", order: 3, status: "RESOLVED", outcome: "NEGATED" },
  ]);
  const rainingDefeated = {
    ...pending,
    continuation: {
      ...pending.continuation,
      participantProgress: {
        ...progress,
        participants: [progress.participants[0], progress.participants[1], { playerId: "D", status: "RESOLVED", outcome: "DEFEATED" }],
      },
    },
  };
  assert.deepEqual(project(rainingDefeated).groupResolution?.participantProgress, [
    { playerId: "B", order: 1, status: "CURRENT" },
    { playerId: "C", order: 2, status: "PENDING" },
    { playerId: "D", order: 3, status: "RESOLVED", outcome: "DEFEATED" },
  ]);
  const barbarianFrame = {
    ...frame,
    origin: { ...frame.origin, originEffect: "BarbarianInvasion" },
    current: { ...frame.current, currentEffect: "BarbarianInvasion" },
  };
  const barbarianEnvelope = { ...causalEnvelope, frames: [barbarianFrame] };
  const barbarianProgress = {
    ...progress,
    participants: [progress.participants[0], progress.participants[1], { playerId: "D", status: "RESOLVED", outcome: "DAMAGED" }],
  };
  const barbarian = {
    ...pending,
    continuation: { ...pending.continuation, cardKind: "BarbarianInvasion", requiredKind: "Attack", participantProgress: barbarianProgress },
  };
  assert.deepEqual(project(barbarian, barbarianEnvelope).groupResolution?.participantProgress, [
    { playerId: "B", order: 1, status: "CURRENT" },
    { playerId: "C", order: 2, status: "PENDING" },
    { playerId: "D", order: 3, status: "RESOLVED", outcome: "DAMAGED" },
  ]);
  const barbarianNegated = {
    ...barbarian,
    continuation: {
      ...barbarian.continuation,
      participantProgress: {
        ...barbarianProgress,
        participants: [progress.participants[0], progress.participants[1], { playerId: "D", status: "RESOLVED", outcome: "NEGATED" }],
      },
    },
  };
  assert.deepEqual(project(barbarianNegated, barbarianEnvelope).groupResolution?.participantProgress, [
    { playerId: "B", order: 1, status: "CURRENT" },
    { playerId: "C", order: 2, status: "PENDING" },
    { playerId: "D", order: 3, status: "RESOLVED", outcome: "NEGATED" },
  ]);
  const barbarianDefeated = {
    ...barbarian,
    continuation: {
      ...barbarian.continuation,
      participantProgress: {
        ...barbarianProgress,
        participants: [progress.participants[0], progress.participants[1], { playerId: "D", status: "RESOLVED", outcome: "DEFEATED" }],
      },
    },
  };
  assert.deepEqual(project(barbarianDefeated, barbarianEnvelope).groupResolution?.participantProgress, [
    { playerId: "B", order: 1, status: "CURRENT" },
    { playerId: "C", order: 2, status: "PENDING" },
    { playerId: "D", order: 3, status: "RESOLVED", outcome: "DEFEATED" },
  ]);
  const barbarianAvoided = {
    ...barbarian,
    continuation: {
      ...barbarian.continuation,
      participantProgress: {
        ...barbarianProgress,
        participants: [progress.participants[0], progress.participants[1], { playerId: "D", status: "RESOLVED", outcome: "AVOIDED" }],
      },
    },
  };
  assert.equal(project(barbarianAvoided, barbarianEnvelope).groupResolution?.participantProgress, null, "Barbarian Invasion cannot claim an Avoided outcome");
  assert.equal(project(pending).groupResolution?.resolutionSemantics, "GROUP");
  for (const invalidParticipant of [
    { playerId: "B", status: "CURRENT", outcome: "AVOIDED" },
    { playerId: "B", status: "CURRENT", outcome: "DAMAGED" },
    { playerId: "C", status: "PENDING", outcome: "AVOIDED" },
    { playerId: "C", status: "PENDING", outcome: "DAMAGED" },
    { playerId: "B", status: "CURRENT", outcome: "NEGATED" },
    { playerId: "C", status: "PENDING", outcome: "NEGATED" },
    { playerId: "B", status: "CURRENT", outcome: "DEFEATED" },
    { playerId: "C", status: "PENDING", outcome: "DEFEATED" },
  ]) {
    const participants = [progress.participants[0], progress.participants[1], progress.participants[2]];
    participants[invalidParticipant.playerId === "B" ? 0 : 1] = invalidParticipant;
    assert.equal(project({ ...pending, continuation: { ...pending.continuation, participantProgress: { ...progress, participants } } }).groupResolution?.participantProgress, null);
  }
  assert.equal(project({ ...pending, continuation: { ...pending.continuation, participantProgress: { ...progress, groupFrameId: "other-frame" } } }).groupResolution?.participantProgress, null);
  assert.equal(project({ ...pending, continuation: { ...pending.continuation, participantProgress: { ...progress, participants: [...progress.participants].reverse() } } }).groupResolution?.participantProgress, null);
  assert.equal(project({ ...pending, continuation: { ...pending.continuation, participantProgress: { ...progress, participants: progress.participants.slice(0, 2) } } }).groupResolution?.participantProgress, null);
  assert.equal(project({ ...pending, continuation: { ...pending.continuation, participantProgress: { ...progress, participants: [{ playerId: "B", status: "CURRENT" }, { playerId: "C", status: "BOGUS" }, progress.participants[2]] } } }).groupResolution?.participantProgress, null);
  assert.equal(project({ ...pending, continuation: { ...pending.continuation, participantProgress: { ...progress, resolutionSemantics: "INVALID" } } }).groupResolution?.participantProgress, null);
  assert.equal(project({ ...pending, continuation: { ...pending.continuation, participantProgress: undefined } }).groupResolution?.participantProgress, null);
  assert.equal(project(pending, { ...causalEnvelope, interactionId: "different-interaction" }).groupResolution?.participantProgress, null);

  const halberdPending = {
    ...pending,
    continuation: {
      ...pending.continuation,
      cardKind: "SkyPiercingHalberdAttack",
      participantProgress: { ...progress, resolutionSemantics: "ORDERED" },
    },
  };
  const halberdFrame = {
    ...frame,
    origin: { ...frame.origin, originEffect: "SkyPiercingHalberdAttack" },
    current: { ...frame.current, currentEffect: "SkyPiercingHalberdAttack" },
  };
  const ordered = projectPresentationV2({
    pending: halberdPending,
    currentAction: point.currentAction,
    actionRevision: "halberd-ordered",
    timeline: [],
    causalEnvelope: { ...causalEnvelope, frames: [halberdFrame] },
  });
  assert.equal(ordered.groupResolution?.resolutionSemantics, "ORDERED");
  assert.deepEqual(ordered.groupResolution?.participantProgress, [
    { playerId: "B", order: 1, status: "CURRENT" },
    { playerId: "C", order: 2, status: "PENDING" },
    { playerId: "D", order: 3, status: "PENDING" },
  ]);
  const halberdWithOutcome = projectPresentationV2({
    pending: { ...halberdPending, continuation: { ...halberdPending.continuation, participantProgress: { ...progress, resolutionSemantics: "ORDERED", participants: [progress.participants[0], progress.participants[1], { playerId: "D", status: "RESOLVED", outcome: "AVOIDED" }] } } },
    currentAction: point.currentAction,
    actionRevision: "halberd-outcome-invalid",
    timeline: [],
    causalEnvelope: { ...causalEnvelope, frames: [halberdFrame] },
  });
  assert.equal(halberdWithOutcome.groupResolution?.participantProgress, null, "Raining Arrows outcomes cannot be attached to ordered Halberd progress");
  const halberdWithNegatedOutcome = projectPresentationV2({
    pending: { ...halberdPending, continuation: { ...halberdPending.continuation, participantProgress: { ...progress, resolutionSemantics: "ORDERED", participants: [progress.participants[0], progress.participants[1], { playerId: "D", status: "RESOLVED", outcome: "NEGATED" }] } } },
    currentAction: point.currentAction,
    actionRevision: "halberd-negated-outcome-invalid",
    timeline: [],
    causalEnvelope: { ...causalEnvelope, frames: [halberdFrame] },
  });
  assert.equal(halberdWithNegatedOutcome.groupResolution?.participantProgress, null, "Negated cannot be attached to ordered Halberd progress");
  const guessed = projectPresentationV2({
    pending: { ...halberdPending, continuation: { ...halberdPending.continuation, participantProgress: { ...progress, resolutionSemantics: undefined } } },
    currentAction: point.currentAction,
    actionRevision: "halberd-unproven-order",
    timeline: [],
    causalEnvelope: { ...causalEnvelope, frames: [halberdFrame] },
  });
  assert.equal(guessed.groupResolution?.participantProgress, null, "Halberd target order is not inferred when Engine-owned semantics are absent");
});

test("C5 does not infer Group authority from arbitrary nested data or frame stage", () => {
  const pending = {
    kind: "trigger",
    actorId: "B",
    continuation: {
      kind: "damage_suffered_event",
      sourceId: "A",
      targetId: "B",
      resumeGroup: { kind: "response", actorId: "B", continuation: { kind: "group", cardKind: "RainingArrows", sourceId: "A", remainingIds: ["C"] } },
    },
  };
  const envelope = {
    version: 1,
    interactionId: "strict-group",
    frames: [{ frameId: "group-frame", parentFrameId: null, stage: "GROUP_RESOLUTION", origin: { originSourceId: "A", originEffect: "Raining Arrows", originalTargetIds: ["B", "C"] }, current: { currentSourceId: "A", currentEffect: "Raining Arrows", currentTargetIds: ["B"], resolvingPlayerId: "B" } }],
    activeFrameId: "group-frame",
    checkpoint: { checkpointId: "strict-checkpoint", frameId: "group-frame", stage: "GROUP_RESOLUTION" },
    presentationRevision: 1,
  };
  const projected = projectPresentationV2({ pending, currentAction: action(), actionRevision: "strict", timeline: [], causalEnvelope: envelope });
  assert.equal(projected.groupResolution?.semantics, "UNPROVEN");
  assert.equal(projected.interactionScene?.semantics, "UNPROVEN");
  assert.deepEqual(projected.interactionScene?.participantRoles, { sourceId: null, originalTargetIds: [], activeTargetIds: [], currentParticipantId: null, decisionActorId: null, activeResolverId: null, parentParticipantId: null, participantIds: [] });
});

test("C5 leaves a Group child parent participant null when no parent proof exists", () => {
  const groupFrame = { frameId: "parent-group", parentFrameId: null, stage: "GROUP_RESOLUTION", origin: { originSourceId: "A", originEffect: "Raining Arrows", originalTargetIds: ["B", "C"] }, current: { currentSourceId: "A", currentEffect: "Raining Arrows", currentTargetIds: ["B", "C"], resolvingPlayerId: "B" } };
  const damageFrame = { frameId: "child-damage", parentFrameId: "parent-group", stage: "DAMAGE", origin: { originSourceId: "A", originEffect: "Raining Arrows", originalTargetIds: ["B"] }, current: { currentSourceId: "A", currentEffect: "damage", currentTargetIds: ["B"], resolvingPlayerId: "C" } };
  const causalEnvelope = { version: 1, interactionId: "no-parent-proof", frames: [groupFrame, damageFrame], activeFrameId: "child-damage", checkpoint: { checkpointId: "child-checkpoint", frameId: "child-damage", stage: "DAMAGE" }, presentationRevision: 1 };
  const groupPending = { kind: "response", actorId: "B", causal: { interactionId: "no-parent-proof", frameId: "parent-group" }, continuation: { kind: "group", cardKind: "RainingArrows", sourceId: "A", remainingIds: ["C"], causal: { interactionId: "no-parent-proof", frameId: "parent-group" } } };
  const projected = projectPresentationV2({ pending: { kind: "trigger", actorId: "C", causal: { interactionId: "no-parent-proof", frameId: "child-damage" }, continuation: { kind: "damage_suffered_event", sourceId: "A", targetId: "B", causal: { interactionId: "no-parent-proof", frameId: "child-damage" }, resumeGroup: groupPending } }, currentAction: action({ actorId: "B" }), actionRevision: "no-parent-proof", timeline: [], causalEnvelope });
  assert.equal(projected.interactionScene?.semantics, "PROVEN");
  assert.equal(projected.interactionScene?.currentParticipantId, "B");
  assert.equal(projected.interactionScene?.participantRoles.parentParticipantId, null);
});

function provenBoundaryEnvelope(stage = "ATTACK_RESPONSE", current = { currentSourceId: "A", currentEffect: "Attack", currentTargetIds: ["B"], resolvingPlayerId: "B" }) {
  const frame = { frameId: "stable-frame", parentFrameId: null, stage, origin: { originSourceId: "A", originEffect: stage, originalTargetIds: ["B"] }, current };
  return { version: 1, interactionId: "stable-interaction", frames: [frame], activeFrameId: frame.frameId, checkpoint: { checkpointId: "stable-checkpoint", frameId: frame.frameId, stage }, presentationRevision: 9 };
}

function sourceOwnedAttackTargetedPending({ actorId = "A", sourceId = "A", targetId = "B", eventName = "attack_targeted", continuationKind = "attack_targeted_event", causal = { interactionId: "stable-interaction", frameId: "stable-frame" }, declarationCausal = causal, continuationCausal = causal } = {}) {
  return {
    kind: "trigger",
    event: eventName,
    actorId,
    causal,
    continuation: {
      kind: continuationKind,
      causal: continuationCausal,
      declaration: {
        sourceId,
        targetId,
        origin: "card",
        physicalCards: [],
        sequenceStartCardId: "attack-card",
        resumePhase: "play",
        causal: declarationCausal,
      },
    },
  };
}

test("C7-03 proves a source-owned Attack-targeted trigger without replacing the frame resolver", () => {
  const projected = projectPresentationV2({
    pending: sourceOwnedAttackTargetedPending(),
    currentAction: action({ actorId: "A", kind: "trigger" }),
    actionRevision: "source-owned-trigger",
    timeline: [],
    causalEnvelope: provenBoundaryEnvelope(),
  });
  assert.equal(projected.interactionScene?.semantics, "PROVEN");
  assert.equal(projected.interactionScene?.decisionActorId, "A");
  assert.equal(projected.interactionScene?.activeResolverId, "B");
  assert.deepEqual(projected.stableBoundary, { kind: "CHOICE", interactionId: "stable-interaction", checkpointId: "stable-checkpoint", presentationRevision: 9, decisionActorId: "A" });
});

test("C7-03 source-owned trigger proof fails closed for every malformed or substituted link", () => {
  const base = { interactionId: "stable-interaction", frameId: "stable-frame" };
  const cases = [
    ["missing causal link", sourceOwnedAttackTargetedPending({ causal: null }), provenBoundaryEnvelope()],
    ["wrong interactionId", sourceOwnedAttackTargetedPending({ causal: { ...base, interactionId: "other-interaction" } }), provenBoundaryEnvelope()],
    ["wrong frameId", sourceOwnedAttackTargetedPending({ causal: { ...base, frameId: "other-frame" } }), provenBoundaryEnvelope()],
    ["unsupported continuation/event", sourceOwnedAttackTargetedPending({ eventName: "unsupported_event", continuationKind: "unsupported_event" }), provenBoundaryEnvelope()],
    ["arbitrary substituted actor", sourceOwnedAttackTargetedPending({ actorId: "C" }), provenBoundaryEnvelope()],
    ["malformed checkpoint/frame coherence", sourceOwnedAttackTargetedPending(), { ...provenBoundaryEnvelope(), checkpoint: { checkpointId: "other-checkpoint", frameId: "other-frame", stage: "ATTACK_RESPONSE" } }],
    ["wrong active-frame stage", sourceOwnedAttackTargetedPending(), provenBoundaryEnvelope("JUDGEMENT")],
    ["wrong active-frame resolver", sourceOwnedAttackTargetedPending(), provenBoundaryEnvelope("ATTACK_RESPONSE", { currentSourceId: "A", currentEffect: "Attack", currentTargetIds: ["B"], resolvingPlayerId: "C" })],
    ["substituted actor and declaration source", sourceOwnedAttackTargetedPending({ actorId: "C", sourceId: "C" }), provenBoundaryEnvelope()],
    ["substituted declaration target", sourceOwnedAttackTargetedPending({ targetId: "C" }), provenBoundaryEnvelope()],
  ];
  for (const [label, pending, causalEnvelope] of cases) {
    const projected = projectPresentationV2({
      pending,
      currentAction: action({ actorId: "A", kind: "trigger" }),
      actionRevision: `source-owned-${label}`,
      timeline: [],
      causalEnvelope,
    });
    assert.equal(projected.interactionScene?.decisionActorId, null, `${label}: no semantic actor`);
    assert.deepEqual(projected.stableBoundary, { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null }, `${label}: fail-closed boundary`);
  }
});

test("C5-03 classifies a proven semantic response as CHOICE independently of viewer controls", () => {
  const pending = { ...attack, causal: { interactionId: "stable-interaction", frameId: "stable-frame" } };
  const envelope = provenBoundaryEnvelope();
  const acting = projectPresentationV2({ pending, currentAction: action({ actorId: "B" }), actionRevision: "choice-a", timeline: [], causalEnvelope: envelope });
  const waiting = projectPresentationV2({ pending, currentAction: action({ actorId: "C" }), actionRevision: "choice-b" , timeline: [], causalEnvelope: envelope });
  assert.deepEqual(acting.stableBoundary, { kind: "CHOICE", interactionId: "stable-interaction", checkpointId: "stable-checkpoint", presentationRevision: 9, decisionActorId: "B" });
  assert.deepEqual(waiting.stableBoundary, acting.stableBoundary);
  assert.notEqual(acting.decision?.actorId, waiting.decision?.actorId);
});

test("C5-03 keeps a proven non-blocking Judgement context as SPECIAL", () => {
  const projected = projectPresentationV2({ pending: null, currentAction: null, actionRevision: "special", timeline: [], causalEnvelope: provenBoundaryEnvelope("JUDGEMENT") });
  assert.deepEqual(projected.stableBoundary, { kind: "SPECIAL", interactionId: "stable-interaction", checkpointId: "stable-checkpoint", presentationRevision: 9, decisionActorId: null });
});

test("C5-03 does not upgrade a cleared timeline settlement into causal SETTLEMENT", () => {
  const projected = projectPresentationV2({ pending: null, currentAction: action({ kind: "none", actorId: null, readyAfterEventId: "settlement-event", declineAction: undefined }), actionRevision: "settled", timeline: [event("settlement-event", "r1", { finalResult: true })] });
  assert.deepEqual(projected.settlement, { eventId: "settlement-event", resolutionId: "r1" });
  assert.deepEqual(projected.stableBoundary, { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null });
});

test("C5-03 keeps settlement descriptive when viewer control selects a final-result event", () => {
  const timeline = [event("settlement-event", "r1", { finalResult: true })];
  const envelope = provenBoundaryEnvelope();
  const withBarrier = projectPresentationV2({ pending: null, currentAction: action({ kind: "none", actorId: null, readyAfterEventId: "settlement-event", declineAction: undefined }), actionRevision: "settled-a", timeline, causalEnvelope: envelope });
  const withoutBarrier = projectPresentationV2({ pending: null, currentAction: action({ kind: "none", actorId: null, readyAfterEventId: null, declineAction: undefined }), actionRevision: "settled-b", timeline, causalEnvelope: envelope });
  assert.deepEqual(withBarrier.settlement, { eventId: "settlement-event", resolutionId: "r1" });
  assert.equal(withoutBarrier.settlement, null);
  assert.deepEqual(withBarrier.stableBoundary, { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null });
  assert.deepEqual(withBarrier.stableBoundary, withoutBarrier.stableBoundary);
});

test("C5-03 rejects an unlinked Borrowed Sword Pending as SPECIAL", () => {
  const projected = projectPresentationV2({
    pending: { kind: "response", actorId: "B", causal: { interactionId: "other-interaction", frameId: "other-frame" }, continuation: { kind: "borrowed_sword_attack", sourceId: "A", targetId: "C" } },
    currentAction: action({ actorId: "C" }),
    actionRevision: "borrowed-unlinked",
    timeline: [],
    causalEnvelope: provenBoundaryEnvelope(),
  });
  assert.equal(projected.interactionScene?.semantics, "PROVEN");
  assert.equal(projected.interactionScene?.decisionActorId, null);
  assert.deepEqual(projected.stableBoundary, { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null });
});

test("C5-03 fails closed to identity-free REST for an incoherent Dying authority", () => {
  const dying = { kind: "dying", actorId: "C", sourceId: "A", targetId: "B", causal: { interactionId: "stable-interaction", frameId: "wrong-frame" } };
  const projected = projectPresentationV2({ pending: dying, currentAction: action({ kind: "dying", actorId: "C", readyAfterEventId: null, resolutionId: null }), actionRevision: "dying-mismatch", timeline: [], causalEnvelope: provenBoundaryEnvelope("DYING", { currentSourceId: "A", currentEffect: "damage", currentTargetIds: ["B"], resolvingPlayerId: "B" }) });
  assert.equal(projected.dyingBarrier?.semantics, "UNPROVEN");
  assert.deepEqual(projected.stableBoundary, { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null });
});

test("C5 keeps legacy context precedence separate from the causal semantic core", () => {
  const projected = projectPresentationV2({
    pending: { kind: "response", actorId: "B", continuation: { kind: "attack", sourceId: "A", targetId: "B" } },
    currentAction: action({ actorId: "B" }),
    actionRevision: "precedence",
    timeline: [],
    causalEnvelope: {
      version: 1,
      interactionId: "precedence-interaction",
      frames: [{ frameId: "precedence-frame", parentFrameId: null, stage: "ATTACK_RESPONSE", origin: { originSourceId: "Z", originEffect: "Attack", originalTargetIds: ["C"] }, current: { currentSourceId: "Z", currentEffect: "Attack", currentTargetIds: ["D"], resolvingPlayerId: "B" } }],
      activeFrameId: "precedence-frame",
      checkpoint: { checkpointId: "precedence-checkpoint", frameId: "precedence-frame", stage: "ATTACK_RESPONSE" },
      presentationRevision: 2,
    },
  });
  assert.equal(projected.rootContext?.sourceId, "Z", "root causal source is envelope-owned");
  assert.deepEqual(projected.rootContext?.originalTargetIds, ["C"], "root causal targets are envelope-owned");
  assert.equal(projected.activeContext?.sourceId, "A", "legacy active source keeps Pending-first compatibility");
  assert.deepEqual(projected.activeContext?.currentTargetIds, ["B"], "legacy active targets keep Pending-first compatibility");
  assert.equal(projected.interactionScene?.sourceId, "Z", "typed semantic source is envelope-owned");
  assert.deepEqual(projected.interactionScene?.targetIds, ["C"]);
  assert.deepEqual(projected.interactionScene?.activeTargetIds, ["D"]);
});

test("C5 public participant roles ignore viewer CurrentAction actor changes", () => {
  const causalEnvelope = { version: 1, interactionId: "viewer-group", frames: [{ frameId: "viewer-group-frame", parentFrameId: null, stage: "GROUP_RESOLUTION", origin: { originSourceId: "A", originEffect: "Raining Arrows", originalTargetIds: ["B", "C"] }, current: { currentSourceId: "A", currentEffect: "Raining Arrows", currentTargetIds: ["B"], resolvingPlayerId: "B" } }], activeFrameId: "viewer-group-frame", checkpoint: { checkpointId: "viewer-checkpoint", frameId: "viewer-group-frame", stage: "GROUP_RESOLUTION" }, presentationRevision: 2 };
  const pending = { ...flows[3].points[0].pending, causal: { interactionId: "viewer-group", frameId: "viewer-group-frame" }, continuation: { ...flows[3].points[0].pending.continuation, causal: { interactionId: "viewer-group", frameId: "viewer-group-frame" } } };
  const first = projectPresentationV2({ pending, currentAction: action({ actorId: "B" }), actionRevision: "private-a", timeline: [], causalEnvelope });
  const second = projectPresentationV2({ pending, currentAction: action({ actorId: "C" }), actionRevision: "private-b", timeline: [], causalEnvelope });
  assert.equal(first.interactionScene?.decisionActorId, "B");
  assert.deepEqual(first.interactionScene?.participantRoles, second.interactionScene?.participantRoles);
  assert.deepEqual(first.groupResolution, second.groupResolution);
  assert.equal(JSON.stringify(first.groupResolution).includes("eligible"), false);
});

test("C3-02-FIX1 fails closed when the checkpoint belongs to another frame", () => {
  const pending = flows[3].points[0].pending;
  const groupFrame = { frameId: "group-frame", parentFrameId: null, stage: "GROUP_RESOLUTION", origin: { originSourceId: "A", originEffect: "Raining Arrows", originalTargetIds: ["B", "C"] }, current: { currentSourceId: "A", currentEffect: "Raining Arrows", currentTargetIds: ["B"], resolvingPlayerId: "B" } };
  const damageFrame = { frameId: "damage-frame", parentFrameId: "group-frame", stage: "DAMAGE", origin: { originSourceId: "A", originEffect: "Raining Arrows", originalTargetIds: ["B"], originRef: { interactionId: "mismatch-interaction", frameId: "group-frame" } }, current: { currentSourceId: "A", currentEffect: "damage", currentTargetIds: ["B"], resolvingPlayerId: "C" } };
  const base = { version: 1, interactionId: "mismatch-interaction", frames: [groupFrame, damageFrame], activeFrameId: "damage-frame", checkpoint: { checkpointId: "checkpoint-group", frameId: "group-frame", stage: "GROUP_RESOLUTION" }, presentationRevision: 7 };
  const mismatchedFrame = projectPresentationV2({ pending, currentAction: action({ actorId: "C" }), actionRevision: "mismatch-frame", timeline: [], causalEnvelope: base });
  assert.equal(mismatchedFrame.interactionScene?.semantics, "UNPROVEN");
  assert.equal(mismatchedFrame.interactionScene?.interactionId, null);
  assert.equal(mismatchedFrame.interactionScene?.activeFrameId, null);
  assert.equal(mismatchedFrame.interactionScene?.checkpointId, null);
  assert.equal(mismatchedFrame.groupResolution?.semantics, "UNPROVEN");

  const mismatchedStage = projectPresentationV2({ pending, currentAction: action({ actorId: "C" }), actionRevision: "mismatch-stage", timeline: [], causalEnvelope: { ...base, checkpoint: { checkpointId: "checkpoint-stage", frameId: "damage-frame", stage: "GROUP_RESOLUTION" } } });
  assert.equal(mismatchedStage.interactionScene?.semantics, "UNPROVEN");
  assert.equal(mismatchedStage.interactionScene?.interactionId, null);
  assert.equal(mismatchedStage.interactionScene?.checkpointId, null);
});

test("C3-03 generic scene projects non-Group causal frame semantics", () => {
  const frame = {
    frameId: "attack-frame",
    parentFrameId: null,
    stage: "ATTACK_RESPONSE",
    origin: { originSourceId: "A", originEffect: "Attack", originalTargetIds: ["B"] },
    current: { currentSourceId: "A", currentEffect: "Attack", currentTargetIds: ["B"], resolvingPlayerId: "B" },
  };
  const projected = projectPresentationV2({
    pending: { kind: "response", actorId: "B", causal: { interactionId: "attack-interaction", frameId: "attack-frame" }, continuation: { kind: "attack", sourceId: "A", targetId: "B", causal: { interactionId: "attack-interaction", frameId: "attack-frame" } } },
    currentAction: action({ actorId: "B" }), actionRevision: "attack-scene", timeline: [],
    causalEnvelope: { version: 1, interactionId: "attack-interaction", frames: [frame], activeFrameId: frame.frameId, checkpoint: { checkpointId: "attack-checkpoint", frameId: frame.frameId, stage: frame.stage }, presentationRevision: 3 },
  });
  assert.equal(projected.groupResolution, null);
  assert.deepEqual(projected.interactionScene, {
    semantics: "PROVEN", interactionId: "attack-interaction", rootFrameId: "attack-frame", activeFrameId: "attack-frame", parentFrameId: null,
    checkpointId: "attack-checkpoint", presentationRevision: 3, stage: "ATTACK_RESPONSE", sourceId: "A", effect: "Attack", targetIds: ["B"],
    currentParticipantId: "B", decisionActorId: "B", activeResolverId: "B", activeSourceId: "A", activeTargetIds: ["B"], participantIds: [],
    participantRoles: { sourceId: "A", originalTargetIds: ["B"], activeTargetIds: ["B"], currentParticipantId: "B", decisionActorId: "B", activeResolverId: "B", parentParticipantId: null, participantIds: [] },
    continuity: { relation: "ROOT_FRAME", parentFrameId: null },
  });
});

test("C4-01 projects a proven Dying barrier from causal authority and public Pending actor", () => {
  const frame = {
    frameId: "dying-frame",
    parentFrameId: "damage-frame",
    stage: "DYING",
    origin: { originSourceId: "A", originEffect: "Attack", originalTargetIds: ["B"] },
    current: { currentSourceId: "A", currentEffect: "damage", currentTargetIds: ["B"], resolvingPlayerId: "C" },
  };
  const envelope = { version: 1, interactionId: "dying-interaction", frames: [
    { frameId: "damage-frame", parentFrameId: null, stage: "DAMAGE", origin: frame.origin, current: frame.current },
    frame,
  ], activeFrameId: frame.frameId, checkpoint: { checkpointId: "dying-checkpoint", frameId: frame.frameId, stage: frame.stage }, presentationRevision: 8 };
  const projected = projectPresentationV2({
    pending: { kind: "dying", actorId: "C", targetId: "B", sourceId: "A", causal: { interactionId: "dying-interaction", frameId: "dying-frame" } },
    currentAction: action({ kind: "dying", actorId: null }), actionRevision: "dying-revision", timeline: [], causalEnvelope: envelope,
  });
  assert.deepEqual(projected.dyingBarrier, {
    semantics: "PROVEN", interactionId: "dying-interaction", rootFrameId: "damage-frame", activeFrameId: "dying-frame", parentFrameId: "damage-frame",
    checkpointId: "dying-checkpoint", presentationRevision: 8, stage: "DYING", dyingPlayerId: "B", rescuerId: "C", decisionActorId: "C", state: "RESCUE_CHOICE",
  });
  assert.equal(projected.interactionScene?.decisionActorId, "C");
  const incoherent = projectPresentationV2({
    pending: { kind: "dying", actorId: "C", targetId: "B", sourceId: "A", causal: { interactionId: "wrong", frameId: "dying-frame" } },
    currentAction: action({ kind: "dying", actorId: null }), actionRevision: "dying-bad", timeline: [], causalEnvelope: envelope,
  });
  assert.equal(incoherent.dyingBarrier?.semantics, "UNPROVEN");
  assert.equal(incoherent.dyingBarrier?.interactionId, null);
  assert.equal(incoherent.dyingBarrier?.decisionActorId, null);
  assert.equal(incoherent.interactionScene?.decisionActorId, null, "generic scene shares the fail-closed Dying proof");
  const resolverMismatch = projectPresentationV2({
    pending: { kind: "dying", actorId: "C", targetId: "B", sourceId: "A", causal: { interactionId: "dying-interaction", frameId: "dying-frame" } },
    currentAction: action({ kind: "dying", actorId: null }), actionRevision: "dying-resolver-mismatch", timeline: [],
    causalEnvelope: { ...envelope, frames: envelope.frames.map((candidate) => candidate.frameId === "dying-frame" ? { ...candidate, current: { ...candidate.current, resolvingPlayerId: "D" } } : candidate) },
  });
  assert.equal(resolverMismatch.dyingBarrier?.semantics, "UNPROVEN");
  assert.equal(resolverMismatch.interactionScene?.decisionActorId, null);
});

test("cardKind on a single-target continuation does not create groupResolution", () => {
  const fixture = flows[0].points[0];
  const projected = projectPresentationV2({
    pending: { ...fixture.pending, continuation: { ...fixture.pending.continuation, cardKind: "Slash" } },
    currentAction: fixture.currentAction,
    actionRevision: "r",
    timeline: fixture.timeline,
  });
  assert.equal(projected.groupResolution, null);
  assert.equal(projected.interactionScene, null);
});

test("root target comes from a typed declaration and stays separate from a redirected active target", () => {
  const projected = projectPresentationV2({
    pending: {
      kind: "response",
      actorId: "D",
      declaration: { sourceId: "A", targetId: "B", sequenceStartCardId: "attack-card" },
      continuation: { kind: "attack", sourceId: "A", targetId: "D", sequenceStartCardId: "attack-card" },
    },
    currentAction: action({ actorId: "D" }),
    actionRevision: "redirect",
    timeline: [event("attack-event", "r1", { card: card("attack-card") })],
  });
  assert.deepEqual(projected.rootContext?.originalTargetIds, ["B"]);
  assert.deepEqual(projected.activeContext?.currentTargetIds, ["D"]);
});

test("transition references exclude unrelated same-resolution history", () => {
  const fixture = flows[0].points[0];
  const projected = projectPresentationV2({
    pending: fixture.pending,
    currentAction: fixture.currentAction,
    actionRevision: "r",
    timeline: [event("old-unrelated", "r1"), event("attack-event", "r1", { card: card("attack-card") }), event("later-unrelated", "r1")],
  });
  assert.deepEqual(projected.transitionEvents.map((item) => item.eventId), ["attack-event"]);
});

test("viewer projections keep public causal facts equivalent and keep private controls out", () => {
  const fixture = flows[0].points[0];
  const first = projectPresentationV2({ pending: fixture.pending, currentAction: { ...fixture.currentAction, actorId: "B" }, actionRevision: "same", timeline: fixture.timeline });
  const second = projectPresentationV2({ pending: fixture.pending, currentAction: { ...fixture.currentAction, actorId: "C", reason: "Waiting for B", presentation: { ...fixture.currentAction.presentation, resolutionId: "r1" } }, actionRevision: "same", timeline: fixture.timeline });
  assert.deepEqual({ rootContext: first.rootContext, activeContext: first.activeContext, parentContext: first.parentContext, participants: first.participants, groupResolution: first.groupResolution, transitionEvents: first.transitionEvents }, { rootContext: second.rootContext, activeContext: second.activeContext, parentContext: second.parentContext, participants: second.participants, groupResolution: second.groupResolution, transitionEvents: second.transitionEvents });
  assert.notEqual(first.decision?.actorId, second.decision?.actorId);
  assert.equal(JSON.stringify(first).includes("eligibleCardIds"), false);
});

test("actionRevision changes do not define presentation scene identity", () => {
  const fixture = flows[5].points[0];
  const first = projectPresentationV2({ pending: fixture.pending, currentAction: fixture.currentAction, actionRevision: "revision-a", timeline: fixture.timeline });
  const second = projectPresentationV2({ pending: fixture.pending, currentAction: fixture.currentAction, actionRevision: "revision-b", timeline: fixture.timeline });
  assert.deepEqual(first.rootContext, second.rootContext);
  assert.deepEqual(first.activeContext, second.activeContext);
  assert.notEqual(first.decision?.actionRevision, second.decision?.actionRevision);
});

test("current barrier/timer behaviour is characterized without adding a timer to the projector", () => {
  const delayed = { currentAction: { deadline: 0, presentation: { resolutionId: "r1", readyAfterEventId: "attack-event" } }, timeline: [event("attack-event", "r1")] };
  assert.deepEqual(presentationBarrierState(delayed), { barrierId: "attack-event", barrierOpen: false, deadline: 0, deadlineStarted: false, expired: false });
  const armedBeforeBarrier = presentationBarrierState({ ...delayed, currentAction: { ...delayed.currentAction, deadline: 10_000 }, presentedEventIds: new Set(), now: 1_000 });
  assert.equal(armedBeforeBarrier.barrierOpen, false);
  assert.equal(armedBeforeBarrier.deadlineStarted, true);
  assert.equal(armedBeforeBarrier.expired, false);
  const openAfterPresentation = presentationBarrierState({ ...delayed, currentAction: { ...delayed.currentAction, deadline: 10_000 }, presentedEventIds: new Set(["attack-event"]), now: 1_000 });
  assert.equal(openAfterPresentation.barrierOpen, true);
  const reconnect = presentationBarrierState({ ...delayed, currentAction: { ...delayed.currentAction, deadline: 10_000 }, presentedEventIds: new Set(), now: 1_000 });
  assert.equal(reconnect.barrierOpen, false, "a reconnect does not claim the event was presented");
  assert.equal(presentationBarrierState({ ...delayed, currentAction: { ...delayed.currentAction, deadline: 10_000 }, presentedEventIds: new Set(["attack-event"]), now: 10_001 }).expired, true);
  const informational = presentationBarrierState({ currentAction: delayed.currentAction, timeline: [{ ...event("message-event", "r1"), type: "message", importance: "informational" }], presentedEventIds: new Set(), now: 1_000 });
  assert.equal(informational.barrierOpen, false, "a missing barrier reference remains closed");
  const messageBarrier = presentationBarrierState({ currentAction: { ...delayed.currentAction, presentation: { ...delayed.currentAction.presentation, readyAfterEventId: "message-event" } }, timeline: [{ ...event("message-event", "r1"), type: "message", importance: "informational" }], now: 1_000 });
  assert.equal(messageBarrier.barrierOpen, true);
});

test("reduced motion and fast-forward remain client presentation concerns", () => {
  const fixture = flows[0].points[0];
  const projected = projectPresentationV2({ pending: fixture.pending, currentAction: fixture.currentAction, actionRevision: "r", timeline: fixture.timeline });
  assert.equal("timer" in projected, false);
  assert.equal("reducedMotion" in projected, false);
  assert.deepEqual(projected.transitionEvents.map((item) => item.eventId), ["attack-event"]);
});

test("C6 keeps reserved SETTLEMENT out of every current projector boundary", () => {
  const finalResultTimeline = [event("settlement-event", "r1", { finalResult: true })];
  const cases = [
    { pending: null, currentAction: action({ kind: "none", actorId: null, resolutionId: null, readyAfterEventId: null, declineAction: undefined }) },
    { pending: null, currentAction: action({ kind: "turn", actorId: "A", declineAction: undefined }) },
    { pending: flows[0].points[0].pending, currentAction: flows[0].points[0].currentAction },
    { pending: flows[7].points[1].pending, currentAction: flows[7].points[1].currentAction },
  ];
  for (const fixture of cases) {
    const projected = projectPresentationV2({ ...fixture, actionRevision: "c6-guard", timeline: finalResultTimeline });
    assert.notEqual(projected.stableBoundary.kind, "SETTLEMENT");
  }
});

test("Raining Arrows settlement projection requires one exact root and complete ordered terminal progress", () => {
  const proof = {
    semantics: "PROVEN",
    rootEventId: "raining-root-event",
    rootResolutionId: "raining-root-resolution",
    interactionId: "raining-interaction",
    groupFrameId: "raining-group-frame",
    sourceId: "A",
    cardKind: "RainingArrows",
    participants: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "AVOIDED", internalNote: "must not copy" },
      { playerId: "C", order: 2, status: "RESOLVED", outcome: "DAMAGED" },
      { playerId: "D", order: 3, status: "NO_LONGER_APPLICABLE" },
    ],
  };
  const timeline = [
    { type: "card", id: "raining-root-event", player: "SOURCE", action: "play", resolutionId: "raining-root-resolution", card: { id: "physical-raining-card", kind: "RainingArrows" } },
    { type: "message", id: "raining-settlement-event", message: "Raining Arrows finishes resolving.", importance: "essential", finalResult: true, resolutionId: "raining-root-resolution", publicRainingArrowsSettlement: proof },
  ];
  const project = (events = timeline) => projectPresentationV2({ pending: null, currentAction: null, actionRevision: "settled", timeline: events });
  const projected = project();
  assert.deepEqual(projected.rainingArrowsSettlements, [{
    semantics: "PROVEN",
    eventId: "raining-settlement-event",
    rootEventId: "raining-root-event",
    rootResolutionId: "raining-root-resolution",
    interactionId: "raining-interaction",
    groupFrameId: "raining-group-frame",
    sourceId: "A",
    cardKind: "RainingArrows",
    participants: [
      { playerId: "B", order: 1, status: "RESOLVED", outcome: "AVOIDED" },
      { playerId: "C", order: 2, status: "RESOLVED", outcome: "DAMAGED" },
      { playerId: "D", order: 3, status: "NO_LONGER_APPLICABLE" },
    ],
  }]);
  assert.equal(JSON.stringify(projected.rainingArrowsSettlements).includes("physical-raining-card"), false);
  assert.equal(JSON.stringify(projected.rainingArrowsSettlements).includes("internalNote"), false);

  for (const [label, malformed] of [
    ["pending participant", { ...proof, participants: [{ ...proof.participants[0], status: "PENDING" }, ...proof.participants.slice(1)] }],
    ["duplicate participant", { ...proof, participants: [proof.participants[0], { ...proof.participants[1], playerId: "B" }, proof.participants[2]] }],
    ["out-of-order targets", { ...proof, participants: [...proof.participants].reverse() }],
    ["outcome on inapplicable participant", { ...proof, participants: [...proof.participants.slice(0, 2), { ...proof.participants[2], outcome: "DEFEATED" }] }],
    ["wrong card kind", { ...proof, cardKind: "BarbarianInvasion" }],
  ]) {
    const events = timeline.map((event) => event.id === "raining-settlement-event" ? { ...event, publicRainingArrowsSettlement: malformed } : event);
    assert.deepEqual(project(events).rainingArrowsSettlements, [], `${label} fails closed`);
  }
  assert.deepEqual(project([...timeline, { ...timeline[0] }]).rainingArrowsSettlements, [], "ambiguous physical root fails closed");
  assert.deepEqual(project(timeline.map((event) => event.id === "raining-settlement-event" ? { ...event, resolutionId: "stale-resolution" } : event)).rainingArrowsSettlements, [], "stale settlement resolution fails closed");
});
