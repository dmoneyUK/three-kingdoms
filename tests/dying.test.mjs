import assert from "node:assert/strict";
import test from "node:test";
import { applyDamage, applyRecovery, isDying, recoveryNeeded } from "../game/match/dying.js";
import { determineDefeatContinuation } from "../game/match/continuation.ts";
import { determineMatchOutcome } from "../game/match/outcome.ts";

test("pure Dying HP rules preserve negative damage and require recovery to reach one", () => {
  assert.equal(applyDamage(1, 1), 0);
  assert.equal(applyDamage(1, 2), -1);
  assert.equal(applyDamage(1, 3), -2);
  assert.equal(isDying(-2), true);
  assert.equal(recoveryNeeded(-2), 3);
  assert.equal(applyRecovery(-2), -1);
  assert.equal(applyRecovery(-1), 0);
  assert.equal(applyRecovery(0), 1);
  assert.equal(isDying(1), false);
});

test("pure match outcomes use persisted Renegade compatibility but player-facing Traitor semantics", () => {
  const players = [
    { id: "lord", seat: 0, role: "Lord", alive: 0 },
    { id: "rebel", seat: 1, role: "Rebel", alive: 0 },
    { id: "traitor", seat: 2, role: "Renegade", alive: 1 },
  ];
  assert.equal(determineMatchOutcome(players), "traitor");
  assert.equal(determineMatchOutcome(players.map((player) => player.id === "traitor" ? { ...player, alive: 0 } : { ...player, alive: player.id === "lord" ? 1 : player.alive })), "lord_loyalist");
  assert.equal(determineMatchOutcome(players.map((player) => ({ ...player, alive: 1 }))), null);
  assert.equal(determineMatchOutcome(players.map((player) => player.id === "lord" ? { ...player, alive: 0 } : player.id === "traitor" ? { ...player, alive: 0 } : { ...player, alive: 1 })), "rebel");
  assert.equal(determineMatchOutcome(players.map((player) => ({ ...player, alive: player.id === "lord" ? 1 : 0 }))), "lord_loyalist");
});

test("defeat continuation chooses terminal state before group, resume, or next living turn", () => {
  const players = [
    { id: "lord", seat: 0, role: "Lord", alive: 1 },
    { id: "rebel", seat: 1, role: "Rebel", alive: 1 },
    { id: "dead", seat: 2, role: "Loyalist", alive: 0 },
  ];
  assert.deepEqual(determineDefeatContinuation({ players, turnSeat: 2, resumePlayerId: "dead", hasGroupContinuation: true }), { kind: "advance_turn", nextSeat: 0 });
  assert.deepEqual(determineDefeatContinuation({ players, turnSeat: 0, resumePlayerId: "lord", hasGroupContinuation: true }), { kind: "resume_group" });
  assert.deepEqual(determineDefeatContinuation({ players, turnSeat: 0, resumePlayerId: "lord", hasGroupContinuation: false }), { kind: "resume_effect" });
  assert.deepEqual(determineDefeatContinuation({ players: players.map((player) => player.id === "rebel" ? { ...player, alive: 0 } : player), turnSeat: 0, resumePlayerId: "lord", hasGroupContinuation: false }), { kind: "finish", outcome: "lord_loyalist" });
});
