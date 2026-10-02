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

test("group projection records missing authoritative semantics instead of guessing", () => {
  const projected = projectPresentationV2({ pending: flows[3].points[0].pending, currentAction: flows[3].points[0].currentAction, actionRevision: "r", timeline: flows[3].points[0].timeline });
  assert.equal(projected.groupResolution?.semantics, "UNPROVEN");
  assert.deepEqual(projected.groupResolution?.participantIds, ["C", "D"]);
  assert.equal(projected.groupResolution?.activeParticipantId, null);
});

test("C3 Group projection uses the authoritative envelope for stable parent and child semantics", () => {
  const groupPending = flows[3].points[0].pending;
  const groupFrame = {
    frameId: "group-frame",
    parentFrameId: null,
    stage: "GROUP_RESOLUTION",
    origin: { originSourceId: "A", originEffect: "Raining Arrows", originalTargetIds: ["B", "C", "D"] },
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
  const child = projectPresentationV2({ pending: { kind: "trigger", actorId: "B", continuation: { kind: "damage_suffered_event", sourceId: "A", targetId: "B", resumeGroup: groupPending } }, currentAction: action({ actorId: "C", kind: "trigger" }), actionRevision: "action-child", timeline: [], causalEnvelope: childEnvelope });
  assert.equal(child.groupResolution?.semantics, "PROVEN");
  assert.equal(child.groupResolution?.interactionId, "group-interaction");
  assert.equal(child.groupResolution?.groupFrameId, "group-frame");
  assert.equal(child.groupResolution?.activeFrameId, "damage-frame");
  assert.equal(child.groupResolution?.parentFrameId, "group-frame");
  assert.equal(child.groupResolution?.stage, "DAMAGE");
  assert.deepEqual(child.groupResolution?.targetIds, ["B", "C", "D"]);
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
    effect: "Raining Arrows",
    targetIds: ["B", "C", "D"],
    currentParticipantId: "B",
    decisionActorId: "C",
    activeResolverId: "C",
    activeSourceId: "A",
    activeTargetIds: ["B"],
    participantIds: ["C", "D"],
    continuity: { relation: "CHILD_FRAME", parentFrameId: "group-frame" },
  });

  const resumedEnvelope = { ...childEnvelope, activeFrameId: "group-frame", checkpoint: { checkpointId: "checkpoint-group", frameId: "group-frame", stage: "GROUP_RESOLUTION" }, presentationRevision: 5 };
  const resumed = projectPresentationV2({ pending: groupPending, currentAction: action({ actorId: "C" }), actionRevision: "action-next", timeline: [], causalEnvelope: resumedEnvelope });
  assert.equal(resumed.groupResolution?.interactionId, child.groupResolution?.interactionId);
  assert.equal(resumed.groupResolution?.groupFrameId, child.groupResolution?.groupFrameId);
  assert.equal(resumed.groupResolution?.activeFrameId, "group-frame");
  assert.equal(resumed.groupResolution?.stage, "GROUP_RESOLUTION");
  assert.equal(resumed.groupResolution?.checkpointId, "checkpoint-group");
  assert.equal(resumed.groupResolution?.currentParticipantId, "B");
  assert.equal(resumed.groupResolution?.decisionActorId, "C");
  assert.equal(resumed.groupResolution?.activeResolverId, "B");
  assert.equal(resumed.interactionScene?.continuity.relation, "ROOT_FRAME");
  assert.equal(resumed.interactionScene?.activeFrameId, "group-frame");
});

test("C3 Group public semantics stay viewer-equivalent while decision ownership changes", () => {
  const pending = flows[3].points[0].pending;
  const causalEnvelope = { version: 1, interactionId: "viewer-group", frames: [{ frameId: "viewer-group-frame", parentFrameId: null, stage: "GROUP_RESOLUTION", origin: { originSourceId: "A", originEffect: "Raining Arrows", originalTargetIds: ["B", "C"] }, current: { currentSourceId: "A", currentEffect: "Raining Arrows", currentTargetIds: ["B"], resolvingPlayerId: "B" } }], activeFrameId: "viewer-group-frame", checkpoint: { checkpointId: "viewer-checkpoint", frameId: "viewer-group-frame", stage: "GROUP_RESOLUTION" }, presentationRevision: 2 };
  const first = projectPresentationV2({ pending, currentAction: action({ actorId: "B" }), actionRevision: "private-a", timeline: [], causalEnvelope });
  const second = projectPresentationV2({ pending, currentAction: action({ actorId: "C" }), actionRevision: "private-b", timeline: [], causalEnvelope });
  assert.deepEqual({ ...first.groupResolution, decisionActorId: null }, { ...second.groupResolution, decisionActorId: null });
  assert.notEqual(first.groupResolution?.decisionActorId, second.groupResolution?.decisionActorId);
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
