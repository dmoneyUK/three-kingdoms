import test from "node:test";
import assert from "node:assert/strict";
import { isOrdinaryTurnActionAuthorized } from "../game/ordinary-turn-action.ts";

const actions = ["play_card", "serpent_spear_attack", "trigger", "end_turn"];

function authorizedInput(overrides = {}) {
  return {
    status: "playing",
    phase: "play",
    isMyTurn: true,
    isMyAction: true,
    viewerId: "player-1",
    currentAction: { kind: "turn", actorId: "player-1", legalActions: [...actions] },
    ...overrides,
  };
}

test("ordinary turn actions require the exact fresh server-owned turn action", () => {
  for (const action of actions) assert.equal(isOrdinaryTurnActionAuthorized(authorizedInput(), action), true, `${action} is permitted when CurrentAction permits it`);

  const denied = [
    [{ status: "heroes" }, "play_card"],
    [{ phase: "draw" }, "play_card"],
    [{ phase: "discard" }, "play_card"],
    [{ phase: "response" }, "trigger"],
    [{ isMyTurn: false }, "play_card"],
    [{ isMyAction: false }, "end_turn"],
    [{ viewerId: "player-2" }, "play_card"],
    [{ currentAction: { kind: "response", actorId: "player-1", legalActions: [...actions] } }, "play_card"],
    [{ currentAction: { kind: "turn", actorId: "player-2", legalActions: [...actions] } }, "end_turn"],
    [{ currentAction: { kind: "turn", actorId: "player-1", legalActions: ["draw"] } }, "play_card"],
  ];
  for (const [overrides, action] of denied) assert.equal(isOrdinaryTurnActionAuthorized(authorizedInput(overrides), action), false, `${action} is denied for ${JSON.stringify(overrides)}`);
});
