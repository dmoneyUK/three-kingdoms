import test from "node:test";
import assert from "node:assert/strict";
import { derivePublicActivityStatus } from "../../game/public-activity.ts";

const players = [
  { id: "p1", name: "Test Player 1", seat: 0, alive: true },
  { id: "p2", name: "Test Player 2", seat: 1, alive: true },
  { id: "p3", name: "Test Player 3", seat: 2, alive: true },
  { id: "p4", name: "Test Player 4", seat: 3, alive: true },
];

function snapshot({ stage, actorId = null, stableKind = actorId ? "CHOICE" : "SPECIAL", effect = null, duelExchange = null, semantics = "PROVEN" } = {}) {
  return {
    stable: { kind: stableKind, interactionId: "interaction-1", checkpointId: "checkpoint-1", presentationRevision: 1, decisionActorId: actorId },
    interaction: { semantics, interactionId: "interaction-1", rootFrameId: "root-1", activeFrameId: "root-1", parentFrameId: null, checkpointId: "checkpoint-1", presentationRevision: 1, stage, sourceId: "p1", effect, targetIds: ["p2"], currentParticipantId: actorId, decisionActorId: actorId, activeResolverId: null, activeSourceId: "p1", activeTargetIds: ["p2"], participantIds: ["p1", "p2"], participantRoles: { sourceId: "p1", originalTargetIds: ["p2"], activeTargetIds: ["p2"], currentParticipantId: actorId, decisionActorId: actorId, activeResolverId: null, parentParticipantId: null, participantIds: ["p1", "p2"] }, continuity: { relation: "ROOT_FRAME", parentFrameId: null } },
    duelExchange,
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
  assert.deepEqual(before, { kind: "negation", text: "Waiting for Negation responses" });
  assert.deepEqual(afterSomeViewerSubmitted, before);
});

test("Duel responder is named only from matching proven public actor fields", () => {
  const publicSnapshot = snapshot({
    stage: "DUEL_EXCHANGE",
    actorId: "p2",
    effect: "Duel",
    duelExchange: { semantics: "PROVEN", decisionActorId: "p2", currentParticipantId: "p2" },
  });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: publicSnapshot })), {
    kind: "duel",
    text: "Waiting for Test Player 2 · Duel",
  });

  const mismatchedProof = snapshot({
    stage: "DUEL_EXCHANGE",
    actorId: "p2",
    effect: "Duel",
    duelExchange: { semantics: "PROVEN", decisionActorId: "p3", currentParticipantId: "p3" },
  });
  assert.deepEqual(derivePublicActivityStatus(room({ phase: "response", presentationSnapshot: mismatchedProof })), { kind: "resolving", text: "Resolving…" });
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
