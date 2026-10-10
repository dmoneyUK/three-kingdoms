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
import {
  attackDodgePublicActionEvents,
  attackDodgeSettlementSupersessionReason,
  persistRetiredAttackDodgeComposition,
  readRetiredAttackDodgeComposition,
  retiredAttackDodgeCompositionStorageSnapshot,
  subscribeRetiredAttackDodgeComposition,
} from "../game/attack-dodge-settlement-lifecycle.ts";

const settlementHold = {
  roomCode: "ROOM1",
  phase: "play-struck",
  turnSeat: 0,
  rootEventId: "attack-root",
  responseEventId: "dodge-response",
  interactionId: "interaction-1",
  rootFrameId: "root-frame-1",
  sourceId: "source-player",
  targetId: "target-player",
  publicActionEventIds: ["attack-root", "dodge-response"],
};

function settlementRoom(overrides = {}) {
  return {
    roomCode: "ROOM1",
    status: "playing",
    phase: "play-struck",
    turnSeat: 0,
    currentAction: { kind: "turn" },
    interaction: null,
    liveRoots: [],
    publicActionEvents: [],
    ...overrides,
  };
}

test("completed Attack/Dodge holds ignore polling and same-root causal updates", () => {
  assert.equal(attackDodgeSettlementSupersessionReason(settlementHold, settlementRoom()), null);
  assert.equal(attackDodgeSettlementSupersessionReason(settlementHold, settlementRoom({
    interaction: { semantics: "PROVEN", interactionId: "interaction-1", rootFrameId: "root-frame-1" },
    publicActionEvents: [{ eventId: "same-root-trigger", rootEventId: "attack-root", interactionId: "interaction-1", rootFrameId: "root-frame-1" }],
  })), null);
  assert.equal(attackDodgeSettlementSupersessionReason(settlementHold, settlementRoom({
    liveRoots: [{ semantics: "PROVEN", rootEventId: "attack-root", interactionId: "interaction-1", rootFrameId: "root-frame-1", sourceId: "source-player", targetId: "target-player" }],
  })), null);
});

test("same-root Duel, Negation, and AOE public continuations do not retire a held graph", () => {
  for (const proofKey of ["duelAttackResponse", "negationSettlement", "publicGroupSettlement"]) {
    const publicActionEvents = attackDodgePublicActionEvents([{
      id: `${proofKey}-continuation`, type: "message", [proofKey]: {
        rootEventId: settlementHold.rootEventId,
        interactionId: settlementHold.interactionId,
        rootFrameId: settlementHold.rootFrameId,
      },
    }]);
    assert.equal(attackDodgeSettlementSupersessionReason(settlementHold, settlementRoom({ publicActionEvents })), null, proofKey);
  }
  const privateSelectionEvents = attackDodgePublicActionEvents([
    { id: "private-dodge-selection", type: "card", action: "draw", presentation: false },
  ]);
  assert.equal(attackDodgeSettlementSupersessionReason(settlementHold, settlementRoom({
    currentAction: { kind: "response" }, publicActionEvents: privateSelectionEvents,
  })), null, "private Dodge selection is not an independent public action");
});

test("completed Attack/Dodge holds retire on authoritative action and turn boundaries", () => {
  assert.equal(attackDodgeSettlementSupersessionReason(settlementHold, settlementRoom({
    publicActionEvents: [{ eventId: "next-public-play" }],
  })), "new-public-action");
  assert.equal(attackDodgeSettlementSupersessionReason(settlementHold, settlementRoom({ turnSeat: 1 })), "turn-advanced");
  assert.equal(attackDodgeSettlementSupersessionReason(settlementHold, settlementRoom({ phase: "discard" })), "discard-phase");
  assert.equal(attackDodgeSettlementSupersessionReason(settlementHold, settlementRoom({
    currentAction: { kind: "trigger", triggerEvent: "turn_end" },
  })), "turn-ending-trigger");
  assert.equal(attackDodgeSettlementSupersessionReason(settlementHold, settlementRoom({
    phase: "resolving", currentAction: { kind: "none" },
  })), "turn-ending-resolution");
  assert.equal(attackDodgeSettlementSupersessionReason(settlementHold, settlementRoom({ roomCode: "ROOM2" })), "room-changed");
  assert.equal(attackDodgeSettlementSupersessionReason(settlementHold, settlementRoom({ status: "finished" })), "game-ended");
  assert.equal(attackDodgeSettlementSupersessionReason(settlementHold, settlementRoom({
    liveRoots: [{ semantics: "PROVEN", rootEventId: "next-attack", interactionId: "interaction-2", rootFrameId: "root-frame-2", sourceId: "source-player", targetId: "target-player" }],
  })), "different-live-root");
});

test("settlement action identity extraction ignores messages and private draws", () => {
  assert.deepEqual(attackDodgePublicActionEvents([
    { id: "informational-message", type: "message", message: "A player acted." },
    { id: "private-draw", type: "card", action: "draw", presentation: false },
    { id: "next-attack", type: "card", action: "play", presentation: true },
    { id: "discard-event", type: "cards", action: "discard", presentation: true },
    { id: "linked-proof", type: "message", attackDodgeResponse: { rootEventId: "attack-root", interactionId: "interaction-1", rootFrameId: "root-frame-1" } },
  ]), [
    { eventId: "next-attack", timelineIndex: 2 },
    { eventId: "discard-event", timelineIndex: 3 },
    { eventId: "linked-proof", timelineIndex: 4, rootEventId: "attack-root", interactionId: "interaction-1", rootFrameId: "root-frame-1" },
  ]);
});

test("a later public action or server read deadline retires an Attack/Dodge for a fresh viewer", () => {
  const events = attackDodgePublicActionEvents([
    { id: "older-action", type: "card", action: "play", presentation: true },
    { id: "attack-root", type: "card", action: "play", presentation: true },
    { id: "dodge-response", type: "card", action: "play", presentation: true },
    { id: "next-equipment", type: "card", action: "equip", presentation: true },
  ]);
  const response = events.find((event) => event.eventId === "dodge-response");
  assert.ok(response);
  const hold = {
    ...settlementHold,
    displayExpiresAtMs: 20_000,
    publicActionEventIds: events.filter((event) => event.timelineIndex <= response.timelineIndex).map((event) => event.eventId),
  };
  assert.equal(attackDodgeSettlementSupersessionReason(hold, settlementRoom({
    nowMs: 19_999,
    publicActionEvents: events,
  })), "new-public-action");
  assert.equal(attackDodgeSettlementSupersessionReason(hold, settlementRoom({ nowMs: 20_000 })), "public-read-window-expired");
});

test("retired public Attack/Dodge identities survive refresh without crossing rooms", () => {
  const values = new Map();
  let storeNotifications = 0;
  const unsubscribe = subscribeRetiredAttackDodgeComposition("ROOM1", () => { storeNotifications += 1; });
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.deepEqual(persistRetiredAttackDodgeComposition(storage, "ROOM1", ["attack-root", "dodge-response"], ["attack-card", "dodge-card"]), {
    roomCode: "ROOM1", eventIds: ["attack-root", "dodge-response"], cardIds: ["attack-card", "dodge-card"],
  });
  assert.deepEqual(persistRetiredAttackDodgeComposition(storage, "ROOM1", ["next-attack", "attack-root"], ["next-card"]), {
    roomCode: "ROOM1", eventIds: ["attack-root", "dodge-response", "next-attack"], cardIds: ["attack-card", "dodge-card", "next-card"],
  });
  assert.deepEqual(readRetiredAttackDodgeComposition(storage, "ROOM1"), {
    roomCode: "ROOM1", eventIds: ["attack-root", "dodge-response", "next-attack"], cardIds: ["attack-card", "dodge-card", "next-card"],
  });
  assert.deepEqual(readRetiredAttackDodgeComposition(storage, "ROOM2"), {
    roomCode: "ROOM2", eventIds: [], cardIds: [],
  });
  assert.equal(storeNotifications, 2, "same-tab persistence notifies the external-store subscriber");
  assert.equal(typeof retiredAttackDodgeCompositionStorageSnapshot("ROOM1"), "string");
  unsubscribe();
});

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
