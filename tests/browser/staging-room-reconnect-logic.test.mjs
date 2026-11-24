import test from "node:test";
import assert from "node:assert/strict";
import { classifyBotCycle, extendProgressDeadline } from "./staging-room-reconnect-logic.mjs";

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
