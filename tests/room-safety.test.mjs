import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRoomData, normalizeTimeline } from "../game/room-safety.js";

test("normalizes valid room data and timeline events", () => {
  const room = normalizeRoomData({ code: "SAFE1", status: "playing", players: [{ id: "p1", name: "ME" }, null], myHand: [{ id: "c1", kind: "Attack", suit: "♠", rank: "A" }], timeline: [{ type: "message", id: "m1", message: "Ready" }, { type: "card", id: "w1", player: "ME", target: "P2", action: "play", playedAs: "attack", card: { id: "red-peach", kind: "Peach", suit: "♥", rank: "A" } }, { type: "card", id: "j1", player: "ME", target: "ME", action: "reveal", judgement: true, card: { id: "judgement-card", kind: "Dodge", suit: "♣", rank: "7" } }] });
  assert.equal(room.players.length, 1);
  assert.equal(room.myHand[0].id, "c1");
  assert.equal(room.timeline[0].type, "message");
  assert.equal(room.timeline[1].playedAs, "attack");
  assert.equal(room.timeline[2].judgement, true);
  const longdan = normalizeRoomData({ code: "SAFE2", status: "playing", players: [], myHand: [], timeline: [{ type: "card", id: "d1", player: "ME", target: "P2", action: "play", playedAs: "dodge", card: { id: "attack-card", kind: "Attack", suit: "♠", rank: "A" } }], currentAction: { version: 3, kind: "response", actorId: "p1", deadline: 0, reason: "Dodge", legalActions: ["respond"], requirement: "dodge", options: [{ providerId: "zhao_yun_attack_as_dodge", satisfies: "dodge", activation: "explicit", label: "Use Braveheart as Dodge", playedAs: "dodge", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["attack-card"] } }] } });
  assert.equal(longdan.timeline[0].playedAs, "dodge");
  assert.equal(longdan.currentAction.options[0].playedAs, "dodge");
});

test("drops null and incomplete timeline entries without throwing", () => {
  const timeline = normalizeTimeline([null, undefined, { type: "card", card: null }, { type: "cards", cards: [null] }, { type: "message", message: "Safe" }]);
  assert.deepEqual(timeline.map((event) => event.type), ["message"]);
});

test("preserves only the privacy-safe Dismantle settlement proof fields", () => {
  const proof = {
    semantics: "PROVEN", rootEventId: "dismantle-root-event", rootResolutionId: "dismantle-resolution",
    sourceId: "source", targetId: "target", outcome: "DISMANTLE_RESOLVED", selectedCardId: "hidden-card-id",
  };
  const event = normalizeTimeline([{
    type: "card", id: "dismantle-settlement-event", player: "TARGET", target: "TARGET", action: "discard",
    importance: "essential", finalResult: true, resolutionId: "dismantle-resolution",
    publicDismantleSettlement: proof,
    card: { id: "discarded-card-id", kind: "Peach", suit: "♥", rank: "3" },
  }])[0];
  assert.deepEqual(event.publicDismantleSettlement, {
    semantics: "PROVEN", rootEventId: "dismantle-root-event", rootResolutionId: "dismantle-resolution",
    sourceId: "source", targetId: "target", outcome: "DISMANTLE_RESOLVED",
  });
  assert.equal(JSON.stringify(event.publicDismantleSettlement).includes("hidden-card-id"), false);
  assert.equal(normalizeTimeline([{ ...event, publicDismantleSettlement: { ...proof, outcome: "STEAL_RESOLVED" } }])[0].publicDismantleSettlement, undefined);
});

test("preserves only the privacy-safe Steal settlement proof fields", () => {
  const proof = {
    semantics: "PROVEN", rootEventId: "steal-root-event", rootResolutionId: "steal-resolution",
    sourceId: "source", targetId: "target", outcome: "STEAL_RESOLVED", acquiredCardId: "hidden-card-id",
  };
  const event = normalizeTimeline([{
    type: "message", id: "steal-settlement-event", message: "Steal resolved.", presentation: true,
    importance: "essential", finalResult: true, resolutionId: "steal-resolution",
    publicStealSettlement: proof,
  }])[0];
  assert.deepEqual(event.publicStealSettlement, {
    semantics: "PROVEN", rootEventId: "steal-root-event", rootResolutionId: "steal-resolution",
    sourceId: "source", targetId: "target", outcome: "STEAL_RESOLVED",
  });
  assert.equal(JSON.stringify(event.publicStealSettlement).includes("hidden-card-id"), false);
  assert.equal(normalizeTimeline([{ ...event, publicStealSettlement: { ...proof, outcome: "DISMANTLE_RESOLVED" } }])[0].publicStealSettlement, undefined);
});

test("preserves only the privacy-safe direct Attack hit settlement fields", () => {
  const proof = {
    semantics: "PROVEN", rootEventId: "attack-root-event", rootResolutionId: "attack-resolution",
    sourceId: "source", targetId: "target", outcome: "ATTACK_DAMAGE_APPLIED", physicalCardId: "private-card-id",
  };
  const event = normalizeTimeline([{
    type: "message", id: "attack-hit-event", message: "TARGET takes 1 damage.", presentation: true,
    importance: "essential", finalResult: true, resolutionId: "attack-resolution",
    publicAttackHitSettlement: proof,
  }])[0];
  assert.deepEqual(event.publicAttackHitSettlement, {
    semantics: "PROVEN", rootEventId: "attack-root-event", rootResolutionId: "attack-resolution",
    sourceId: "source", targetId: "target", outcome: "ATTACK_DAMAGE_APPLIED",
  });
  assert.equal(JSON.stringify(event.publicAttackHitSettlement).includes("private-card-id"), false);
  assert.equal(normalizeTimeline([{ ...event, publicAttackHitSettlement: { ...proof, outcome: "ATTACK_BLOCKED_BY_DODGE" } }])[0].publicAttackHitSettlement, undefined);
});

test("preserves only ordered public Raining Arrows settlement fields", () => {
  const proof = {
    semantics: "PROVEN",
    rootEventId: "raining-root-event",
    rootResolutionId: "raining-resolution",
    interactionId: "raining-interaction",
    groupFrameId: "raining-frame",
    sourceId: "source",
    cardKind: "RainingArrows",
    participants: [
      { playerId: "first", order: 1, status: "RESOLVED", outcome: "AVOIDED", privateCardId: "hidden" },
      { playerId: "second", order: 2, status: "NO_LONGER_APPLICABLE" },
    ],
    privateResolverOrder: ["secret"],
  };
  const event = normalizeTimeline([{
    type: "message", id: "raining-settlement-event", message: "Raining Arrows finishes resolving.",
    importance: "essential", finalResult: true, resolutionId: "raining-resolution",
    publicRainingArrowsSettlement: proof,
  }])[0];
  assert.deepEqual(event.publicRainingArrowsSettlement, {
    semantics: "PROVEN",
    rootEventId: "raining-root-event",
    rootResolutionId: "raining-resolution",
    interactionId: "raining-interaction",
    groupFrameId: "raining-frame",
    sourceId: "source",
    cardKind: "RainingArrows",
    participants: [
      { playerId: "first", order: 1, status: "RESOLVED", outcome: "AVOIDED" },
      { playerId: "second", order: 2, status: "NO_LONGER_APPLICABLE" },
    ],
  });
  assert.equal(JSON.stringify(event.publicRainingArrowsSettlement).includes("hidden"), false);
  assert.equal(JSON.stringify(event.publicRainingArrowsSettlement).includes("privateResolverOrder"), false);
  assert.equal(normalizeTimeline([{ ...event, publicRainingArrowsSettlement: { ...proof, cardKind: "BarbarianInvasion" } }])[0].publicRainingArrowsSettlement, undefined);
});

test("handles missing collections and rejects malformed items while preserving valid data", () => {
  const empty = normalizeRoomData({ code: "SAFE1", status: "lobby", players: [], myHand: [], timeline: [] });
  assert.deepEqual(empty.players, []); assert.deepEqual(empty.myHand, []); assert.deepEqual(empty.timeline, []);
  assert.equal(normalizeRoomData(null), null);
  const room = normalizeRoomData({ code: "SAFE1", status: "playing", players: [null, { id: "p1", name: "ME" }], myHand: [null], timeline: [{ type: "message", message: "ok" }, { type: "card" }] });
  assert.deepEqual(room.players.map((player) => player.id), ["p1"]);
  assert.equal(room.myHand.length, 0);
  assert.equal(room.timeline.length, 1);
});

test("normalizes the canonical current action without trusting unknown legal actions", () => {
  const room = normalizeRoomData({
    code: "ACT01", status: "playing", players: [], myHand: [], timeline: [], log: [], myHeroOptions: [],
    pending: { kind: "attack" },
    currentAction: { version: 1, kind: "attack", actorId: "p1", deadline: 123, reason: "Dodge or take damage", legalActions: ["respond", "respond", "decline_response", "invent_action"], playPhaseActions: [{ cardId: "red-peach", canPlayAs: "attack" }, { cardId: "red-peach", canPlayAs: "attack" }, { cardId: "bad", canPlayAs: "dodge" }], borrowedSwordTargets: [{ cardId: "borrowed-card", targetIds: ["legal-holder", 8, "legal-holder"] }, { cardId: 3, targetIds: ["ignored"] }], triggerEvent: "attack_targeted", triggerOptions: [{ effectId: "yin_yang_swords_attack_targeted", label: "Yin-Yang Swords", allowDecline: false, timeoutChoiceId: "draw", selection: { type: "choice", choices: [{ id: "discard", label: "Discard 1 hand card" }, { id: "draw", label: "Allow attacker to draw 1 card" }, { id: 4, label: "bad" }], eligibleHandKeys: ["hand:0", 4] } }, { effectId: "gan_ning_qixi", label: "Ambushment", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["borrowed-sword"], targetIds: ["target"] } }], requirement: "dodge", options: [{ providerId: "card", satisfies: "dodge", label: "Play Dodge", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["dodge-1", 9] } }, { providerId: 9, satisfies: "dodge", label: "Invalid", selection: null }] },
  });
  assert.deepEqual(room?.pending, { kind: "attack" });
  assert.deepEqual(room?.currentAction?.legalActions, ["respond", "respond", "decline_response"]);
  assert.deepEqual(room?.currentAction?.options, [{ providerId: "card", satisfies: "dodge", activation: "implicit", label: "Play Dodge", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["dodge-1"] } }]);
  assert.deepEqual(room?.currentAction?.playPhaseActions, [{ cardId: "red-peach", canPlayAs: "attack" }]);
  assert.deepEqual(room?.currentAction?.borrowedSwordTargets, [{ cardId: "borrowed-card", targetIds: ["legal-holder", "legal-holder"] }]);
  assert.equal(room?.currentAction?.triggerEvent, "attack_targeted");
  assert.deepEqual(room?.currentAction?.triggerOptions, [{ effectId: "yin_yang_swords_attack_targeted", label: "Yin-Yang Swords", allowDecline: false, timeoutChoiceId: "draw", selection: { type: "choice", choices: [{ id: "discard", label: "Discard 1 hand card" }, { id: "draw", label: "Allow attacker to draw 1 card" }], eligibleHandKeys: ["hand:0"] } }, { effectId: "gan_ning_qixi", label: "Ambushment", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["borrowed-sword"], targetIds: ["target"] } }]);
});

test("preserves only a well-formed actor-owned target-card eligibility projection", () => {
  const normalizeAction = (currentAction) => normalizeRoomData({
    code: "TARGET-CARD-AUTHORITY", status: "playing", players: [], myHand: [], timeline: [], currentAction,
  })?.currentAction;
  const valid = {
    version: 3, kind: "target_card", actorId: "p1", deadline: 0, reason: "Choose a card",
    legalActions: ["choose_target_card"],
    targetCardSelection: { targetId: "p2", eligibleKeys: ["hand:0", "public-card"] },
  };

  assert.deepEqual(normalizeAction(valid)?.targetCardSelection, valid.targetCardSelection);
  assert.equal(normalizeAction({ ...valid, actorId: null })?.targetCardSelection, undefined);
  assert.equal(normalizeAction({ ...valid, kind: "response" })?.targetCardSelection, undefined);
  assert.equal(normalizeAction({ ...valid, legalActions: [] })?.targetCardSelection, undefined);
  assert.equal(normalizeAction({ ...valid, targetCardSelection: { targetId: "p2", eligibleKeys: ["hand:0", null] } })?.targetCardSelection, undefined);
  assert.equal(normalizeAction({ ...valid, targetCardSelection: { targetId: "", eligibleKeys: ["hand:0"] } })?.targetCardSelection, undefined);
});
