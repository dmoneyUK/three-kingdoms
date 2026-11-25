import test from "node:test";
import assert from "node:assert/strict";
import { classifyBotCycle, classifyRejoinCheckpoint, extendProgressDeadline } from "./staging-room-reconnect-logic.mjs";

const expectedBotNames = ["BOT 2", "BOT 3", "BOT 4"];
const hostId = "host";
const baseRoom = {
  status: "playing",
  phase: "draw",
  players: [{ id: hostId, alive: true }],
  currentAction: { kind: "turn", actorId: "bot-3", legalActions: ["draw"] },
};

test("extends a bounded smoke wait only after authoritative progress", () => {
  const startedAt = 1_000;
  const initialDeadline = startedAt + 600_000;
  assert.equal(extendProgressDeadline({
    startedAt,
    now: startedAt + 30_000,
    deadline: initialDeadline,
    progressTimeoutMs: 180_000,
    maxTimeoutMs: 900_000,
  }), initialDeadline, "early progress does not inflate the normal budget");
  assert.equal(extendProgressDeadline({
    startedAt,
    now: startedAt + 600_000,
    deadline: initialDeadline,
    progressTimeoutMs: 180_000,
    maxTimeoutMs: 900_000,
  }), startedAt + 780_000, "progress near the deadline grants one bounded progress window");
  assert.equal(extendProgressDeadline({
    startedAt,
    now: startedAt + 840_000,
    deadline: startedAt + 780_000,
    progressTimeoutMs: 180_000,
    maxTimeoutMs: 900_000,
  }), startedAt + 900_000, "repeated progress never exceeds the hard cap");
});

test("accepts a complete Bot cycle", () => {
  assert.deepEqual(classifyBotCycle({
    room: baseRoom,
    hostId,
    completedBotNames: expectedBotNames,
    expectedBotNames,
  }), { ok: true, outcome: "all_bot_turns_completed" });
});

test("accepts a host defeat after meaningful Bot progress without inventing a turn-end log", () => {
  assert.deepEqual(classifyBotCycle({
    room: { ...baseRoom, players: [{ id: hostId, alive: false }] },
    hostId,
    completedBotNames: ["BOT 2", "BOT 3"],
    expectedBotNames,
  }), { ok: true, outcome: "host_defeated_after_bot_progress" });
});

test("accepts only an unlocked canonical human Dying decision", () => {
  const room = {
    ...baseRoom,
    phase: "dying",
    currentAction: { kind: "dying", actorId: hostId, legalActions: ["give_peach", "skip_rescue"] },
  };
  assert.deepEqual(classifyBotCycle({ room, hostId, completedBotNames: ["BOT 2"], expectedBotNames }), {
    ok: true,
    outcome: "human_dying_response",
  });
  assert.equal(classifyBotCycle({
    room: { ...room, currentAction: { ...room.currentAction, sharedWindow: { locked: true } } },
    hostId,
    completedBotNames: ["BOT 2"],
    expectedBotNames,
  }).ok, false);
});

test("does not accept a Bot draw stall or a bare unresolved Dying state", () => {
  assert.equal(classifyBotCycle({
    room: baseRoom,
    hostId,
    completedBotNames: ["BOT 2"],
    expectedBotNames,
  }).ok, false);
  assert.equal(classifyBotCycle({
    room: { ...baseRoom, phase: "dying", currentAction: { kind: "dying", actorId: "bot-4", legalActions: ["skip_rescue"] } },
    hostId,
    completedBotNames: ["BOT 2"],
    expectedBotNames,
  }).ok, false);
  assert.equal(classifyBotCycle({
    room: baseRoom,
    hostId,
    completedBotNames: [],
    expectedBotNames,
  }).outcome, "no_meaningful_bot_progress");
});

test("classifies a fresh host Dodge after the previous all-Bot outcome", () => {
  const room = {
    ...baseRoom,
    phase: "response",
    actionRevision: "opaque-revision-2",
    currentAction: { kind: "response", actorId: hostId, requirement: "dodge", legalActions: ["respond", "decline_response"] },
  };
  assert.deepEqual(classifyRejoinCheckpoint({ room, hostId }), { ok: true, outcome: "human_response" });
});

test("does not accept a newer Bot draw, then accepts the later host response", () => {
  const botDraw = {
    ...baseRoom,
    actionRevision: "opaque-revision-bot",
    currentAction: { kind: "turn", actorId: "bot-4", legalActions: ["draw"] },
  };
  assert.deepEqual(classifyRejoinCheckpoint({ room: botDraw, hostId }), { ok: false, outcome: "not_host_action" });
  const hostResponse = {
    ...botDraw,
    phase: "response",
    actionRevision: "opaque-revision-host",
    currentAction: { kind: "response", actorId: hostId, requirement: "dodge", legalActions: ["respond", "decline_response"] },
  };
  assert.deepEqual(classifyRejoinCheckpoint({ room: hostResponse, hostId }), { ok: true, outcome: "human_response" });
});

test("rejects locked shared, Negation and unsupported/error Bot states", () => {
  const response = { ...baseRoom, phase: "response", currentAction: { kind: "response", actorId: hostId, legalActions: ["respond", "decline_response"] } };
  assert.deepEqual(classifyRejoinCheckpoint({
    room: { ...response, currentAction: { ...response.currentAction, sharedWindow: { windowId: "shared-1", locked: true, choice: "intent" } } },
    hostId,
  }), { ok: false, outcome: "locked_shared_or_negation" });
  assert.deepEqual(classifyRejoinCheckpoint({
    room: { ...response, currentAction: { ...response.currentAction, negationWindowId: "negation-1" } },
    hostId,
  }), { ok: false, outcome: "locked_shared_or_negation" });
  assert.deepEqual(classifyRejoinCheckpoint({
    room: { ...response, players: [{ id: hostId, alive: true }, { id: "bot-2", isBot: true, botStatus: "unsupported" }] },
    hostId,
  }), { ok: false, outcome: "unsupported_bot_state" });
  assert.deepEqual(classifyRejoinCheckpoint({
    room: { ...response, players: [{ id: hostId, alive: true }, { id: "bot-2", isBot: true, botStatus: "error" }] },
    hostId,
  }), { ok: false, outcome: "unsupported_bot_state" });
});

test("accepts terminal or defeated state, but rejects another actor and empty actions", () => {
  assert.deepEqual(classifyRejoinCheckpoint({ room: { ...baseRoom, status: "finished" }, hostId }), { ok: true, outcome: "finished" });
  assert.deepEqual(classifyRejoinCheckpoint({ room: { ...baseRoom, players: [{ id: hostId, alive: false }] }, hostId }), { ok: true, outcome: "host_defeated" });
  assert.deepEqual(classifyRejoinCheckpoint({ room: baseRoom, hostId }), { ok: false, outcome: "not_host_action" });
  assert.deepEqual(classifyRejoinCheckpoint({
    room: { ...baseRoom, currentAction: { kind: "turn", actorId: hostId, legalActions: [] } },
    hostId,
  }), { ok: false, outcome: "empty_or_unsupported_host_action" });
});

test("preserves an opaque host checkpoint without consuming or rewriting it", () => {
  const room = {
    ...baseRoom,
    actionRevision: "opaque-revision-retained",
    phase: "response",
    currentAction: { kind: "response", actorId: hostId, legalActions: ["respond", "decline_response"] },
  };
  const before = structuredClone(room);
  assert.deepEqual(classifyRejoinCheckpoint({ room, hostId }), { ok: true, outcome: "human_response" });
  assert.deepEqual(room, before);
  assert.equal(room.actionRevision, "opaque-revision-retained");
});
