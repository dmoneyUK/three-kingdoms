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
  assert.equal(project({ ...pending, continuation: { ...pending.continuation, participantProgress: { ...progress, groupFrameId: "other-frame" } } }).groupResolution?.participantProgress, null);
  assert.equal(project({ ...pending, continuation: { ...pending.continuation, participantProgress: { ...progress, participants: [...progress.participants].reverse() } } }).groupResolution?.participantProgress, null);
  assert.equal(project({ ...pending, continuation: { ...pending.continuation, participantProgress: { ...progress, participants: progress.participants.slice(0, 2) } } }).groupResolution?.participantProgress, null);
  assert.equal(project({ ...pending, continuation: { ...pending.continuation, participantProgress: { ...progress, participants: [{ playerId: "B", status: "CURRENT" }, { playerId: "C", status: "BOGUS" }, progress.participants[2]] } } }).groupResolution?.participantProgress, null);
  assert.equal(project({ ...pending, continuation: { ...pending.continuation, participantProgress: undefined } }).groupResolution?.participantProgress, null);
  assert.equal(project(pending, { ...causalEnvelope, interactionId: "different-interaction" }).groupResolution?.participantProgress, null);
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
