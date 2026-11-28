import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
    [{ phase: "draw" }, "trigger"],
    [{ isMyTurn: false }, "play_card"],
    [{ isMyAction: false }, "end_turn"],
    [{ viewerId: "player-2" }, "play_card"],
    [{ currentAction: { kind: "response", actorId: "player-1", legalActions: [...actions] } }, "play_card"],
    [{ currentAction: { kind: "turn", actorId: "player-2", legalActions: [...actions] } }, "end_turn"],
    [{ currentAction: { kind: "turn", actorId: "player-1", legalActions: ["draw"] } }, "play_card"],
  ];
  for (const [overrides, action] of denied) assert.equal(isOrdinaryTurnActionAuthorized(authorizedInput(overrides), action), false, `${action} is denied for ${JSON.stringify(overrides)}`);
});

test("server-authorized trigger selections remain available before ordinary Play", () => {
  const input = authorizedInput({
    phase: "draw",
    isMyTurn: false,
    currentAction: { kind: "trigger", actorId: "player-1", legalActions: ["trigger", "decline_trigger"] },
  });
  assert.equal(isOrdinaryTurnActionAuthorized(input, "trigger"), true);
  for (const action of ["play_card", "serpent_spear_attack", "end_turn"]) {
    assert.equal(isOrdinaryTurnActionAuthorized(input, action), false, `${action} remains blocked during an authorized pre-Play trigger`);
  }
  assert.equal(isOrdinaryTurnActionAuthorized({ ...input, currentAction: { ...input.currentAction, legalActions: ["decline_trigger"] } }, "trigger"), false, "a trigger without server-authorized trigger action stays disabled");
});

test("ordinary action controls and handlers use per-action CurrentAction authority", () => {
  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bcanPlay\b/, "phase-only canPlay must not remain as client authority");
  assert.match(source, /const isPlayPhaseForDisplay =/, "phase state may remain only under an explicit display name");
  assert.match(source, /const ordinaryTurnPlayAuthorized = ordinaryTurnActionAuthorized\("play_card"\)/);
  assert.match(source, /const ordinaryTurnSerpentAuthorized = ordinaryTurnActionAuthorized\("serpent_spear_attack"\)/);
  assert.match(source, /const ordinaryTurnEndAuthorized = ordinaryTurnActionAuthorized\("end_turn"\)/);
  assert.match(source, /const targetEligibilityActionAvailable = serpentMode\s*\?\s*ordinaryTurnSerpentAuthorized\s*:\s*Boolean\(card && ordinaryTurnPlayAuthorized\)/);
  assert.match(source, /if \(!ordinaryTurnActionAuthorized\("play_card"\) \|\| !card/);
  assert.match(source, /if \(!me \|\| !ordinaryTurnActionAuthorized\("serpent_spear_attack"\)/);
  assert.match(source, /ordinaryTurnCardActionAuthorized && consoleKind === "turn" && consolePrimaryId === "turn"/);
  assert.match(source, /ordinaryTurnEndAuthorized && consoleKind === "turn"/);
});
