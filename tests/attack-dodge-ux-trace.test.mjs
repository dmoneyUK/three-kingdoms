import assert from "node:assert/strict";
import test from "node:test";
import {
  beginAttackDodgeUxTraceSession,
  exportAttackDodgeUxTrace,
  isAttackDodgeUxTraceActive,
  recordAttackDodgeUxTrace,
  sanitizeAttackDodgeUxTraceData,
  stopAttackDodgeUxTrace,
  summarizePublicGameRoom,
} from "../app/attack-dodge-ux-trace.ts";

test("game trace records public hero/skill and causal context without private identities", () => {
  const summary = summarizePublicGameRoom({
    code: "AB123",
    meId: "private-player-id-1",
    status: "playing",
    phase: "response",
    turnSeat: 1,
    pending: { kind: "trigger" },
    pendingAttack: { sourceId: "private-player-id-1", targetId: "private-player-id-2", sequenceStartCardId: "physical-attack-id" },
    currentAction: {
      kind: "trigger",
      requirement: "decline_trigger",
      triggerEvent: "attack_targeted",
      actorId: "private-player-id-2",
      triggerOptions: [{ effectId: "private-provider", eligibleCardIds: ["private-card-id"] }],
    },
    players: [
      { id: "private-player-id-1", name: "account-alpha", seat: 0, hero: "cao-cao", hp: 4, maxHp: 4, alive: true, role: "Lord", handCount: 3, equipmentCards: [{ id: "equip-private-id", kind: "SerpentSpear" }], judgementCards: [] },
      { id: "private-player-id-2", name: "account-beta", seat: 1, hero: "daqiao", hp: 3, maxHp: 3, alive: true, role: "Spy", handCount: 2, equipmentCards: [], judgementCards: [] },
    ],
    timeline: [
      { id: "public-attack-event", type: "card", action: "play", player: "account-alpha", target: "account-beta", card: { id: "physical-attack-id", kind: "Attack", rank: "K", suit: "♠" }, presentation: true, message: "account-alpha attacks account-beta in AB123" },
      { id: "private-draw-event", type: "card", action: "draw", player: "account-beta", card: { id: "private-card-id", kind: "Peach", rank: "A", suit: "♥" }, presentation: false },
      { id: "ambiguous-draw-event", type: "card", action: "draw", player: "account-beta", card: { id: "another-private-card-id", kind: "secret-drawn-kind", rank: "A", suit: "♥" }, presentation: true },
    ],
    presentationSnapshot: {
      interaction: { semantics: "ATTACK", stage: "ATTACK_RESPONSE", sourceId: "private-player-id-1", currentParticipantId: "private-player-id-2", decisionActorId: "private-player-id-2", targetIds: ["private-player-id-2"], interactionId: "interaction-1", rootFrameId: "frame-1" },
      rootAction: { action: "ATTACK", semantics: "PROVEN", rootEventId: "public-attack-event", sourceId: "private-player-id-1", targetId: "private-player-id-2", cardKind: "Attack" },
      attackDodgeResponses: [],
    },
  });
  const serialized = JSON.stringify(summary);
  assert.equal(serialized.includes("account-alpha"), false);
  assert.equal(serialized.includes("account-beta"), false);
  assert.equal(serialized.includes("AB123"), false);
  assert.equal(serialized.includes("private-player-id"), false);
  assert.equal(serialized.includes("physical-attack-id"), false);
  assert.equal(serialized.includes("private-card-id"), false);
  assert.equal(serialized.includes("another-private-card-id"), false);
  assert.equal(serialized.includes("secret-drawn-kind"), false);
  assert.equal(serialized.includes("equip-private-id"), false);
  assert.equal(serialized.includes("triggerOptions"), false);
  assert.equal(serialized.includes("private-draw-event"), false);
  assert.equal(serialized.includes("rank"), false);
  assert.equal(serialized.includes("suit"), false);
  assert.equal(serialized.includes("Cao Cao"), true);
  assert.equal(serialized.includes("Da Qiao"), true);
  assert.equal(serialized.includes("Deflection"), true);
  assert.deepEqual(summary.publicEvents[0], {
    eventId: "public-attack-event",
    type: "card",
    action: "play",
    actorSeat: 0,
    targetSeat: 1,
    cardKind: "Attack",
    cardKinds: [],
    playedAs: null,
    resolutionId: null,
    importance: null,
    finalResult: null,
    publicMessage: "Seat 0 attacks Seat 1 in [room]",
  });
  assert.equal(summary.publicEvents[1].cardKind, null, "even a mislabelled public draw event cannot leak the drawn identity");
});

test("server diagnostics redact player, room, private-card and legal-option fields", () => {
  const safe = sanitizeAttackDodgeUxTraceData({
    traceId: "trace-12345678",
    rootEventId: "public-event-1",
    playerName: "account-alpha",
    sourceId: "private-player-id",
    roomCode: "AB123",
    hand: [{ kind: "Dodge" }],
    sequenceStartCardId: "private-card-id",
    triggerOptions: [{ effectId: "secret" }],
    detail: "account-alpha played in AB123 with another-private-card-id and bearer-token",
  }, ["account-alpha"], "AB123", ["another-private-card-id", "bearer-token"]);
  const serialized = JSON.stringify(safe);
  assert.equal(serialized.includes("account-alpha"), false);
  assert.equal(serialized.includes("private-player-id"), false);
  assert.equal(serialized.includes("AB123"), false);
  assert.equal(serialized.includes("private-card-id"), false);
  assert.equal(serialized.includes("another-private-card-id"), false);
  assert.equal(serialized.includes("bearer-token"), false);
  assert.equal(serialized.includes("triggerOptions"), false);
  assert.equal(serialized.includes("public-event-1"), true);
  assert.equal(serialized.includes("[player]"), true);
  assert.equal(serialized.includes("[room]"), true);
});

test("automatic trace survives a new game session and stops only at game boundary", () => {
  const values = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
    innerWidth: 390,
    innerHeight: 844,
    devicePixelRatio: 3,
    visualViewport: null,
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
  };
  globalThis.document = { visibilityState: "visible", addEventListener: () => {} };

  const firstSessionId = beginAttackDodgeUxTraceSession();
  assert.ok(firstSessionId);
  assert.equal(isAttackDodgeUxTraceActive(), true);
  recordAttackDodgeUxTrace("test-proof-stage", { eventId: "public-event-1" });
  stopAttackDodgeUxTrace("game-finished");
  assert.equal(isAttackDodgeUxTraceActive(), false);

  const secondSessionId = beginAttackDodgeUxTraceSession();
  assert.ok(secondSessionId);
  assert.notEqual(secondSessionId, firstSessionId);
  recordAttackDodgeUxTrace("second-game-stage", { phase: "play" });
  stopAttackDodgeUxTrace("player-left-game");

  const trace = JSON.parse(exportAttackDodgeUxTrace());
  assert.equal(trace.schema, "wtk-game-ux-trace");
  assert.equal(trace.version, 2);
  assert.equal(trace.environment.buildSha.length > 0, true);
  assert.equal(trace.entries.some((entry) => entry.stage === "test-proof-stage" && entry.sessionId === firstSessionId), true);
  assert.equal(trace.entries.some((entry) => entry.stage === "second-game-stage" && entry.sessionId === secondSessionId), true);
  assert.equal(values.get("wtk.game-ux-trace.active.v2"), "false");
  delete globalThis.window;
  delete globalThis.document;
});
