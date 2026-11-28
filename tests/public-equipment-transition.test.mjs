import assert from "node:assert/strict";
import test from "node:test";
import {
  publicEquipmentArrivalCompletionMatches,
  publicEquipmentCardDisplayAction,
  routePublicEquipmentTransition,
} from "../app/public-equipment-transition.ts";
import { routePublicDiscardTransition } from "../app/public-discard-transition.ts";

const oldWeapon = { id: "old-physical-weapon", kind: "FrostSword", suit: "♠", rank: "5" };
const newWeapon = { id: "new-physical-weapon", kind: "BlueSteelSword", suit: "♦", rank: "A" };
const ownerId = "owner-player-id";

function fact(eventId, order, rootEventId, category, identity = {}) {
  return {
    semantics: "PROVEN", visibility: "PUBLIC",
    identity: {
      interactionId: "equip-interaction", rootFrameId: "equip-root-frame",
      checkpointId: "equip-checkpoint", presentationRevision: 2, ...identity,
    },
    eventId, order, rootEventId, category, actorId: ownerId, affectedPlayerIds: [ownerId],
  };
}

function restSnapshot(retainedEvent, retainedFacts) {
  return {
    identity: null,
    stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
    interaction: null,
    publicEventFacts: [],
    retainedPublicEvent: retainedEvent,
    retainedPublicEventFacts: retainedFacts,
  };
}

function clientView(viewerId = "viewer-1") {
  return { hasInteraction: false, interactionId: null, checkpointId: null, presentationRevision: null, rootFrameId: null, viewerId };
}

function route(event, players, snapshot, view = clientView(), retiredTransitionIds = [], committedPublicFact) {
  return routePublicEquipmentTransition({
    event, players, snapshot, clientView: view, roomCode: "ROOM", viewerId: view.viewerId ?? "viewer-1", retiredTransitionIds,
    committedPublicFact,
    existingOwners: event.card ? [{ eventId: event.id, physicalCardId: event.card.id, owner: "PriorRenderer" }] : [],
  });
}

test("an equipped physical card routes once only after the actual server slot contains it", () => {
  const equipFact = fact("equip-event", 11, "equip-event", "CARD_EQUIPPED");
  const laterFact = fact("later-event", 12, "later-event", "CARD_PLAYED", {
    interactionId: "later-interaction", rootFrameId: "later-root-frame", checkpointId: "later-checkpoint", presentationRevision: 3,
  });
  const snapshot = restSnapshot(laterFact, [laterFact]);
  const event = {
    id: "equip-event", type: "card", action: "equip", actorId: ownerId,
    card: newWeapon, presentation: true, publicSequence: 11,
  };
  const players = [{ id: ownerId, equipmentCards: [newWeapon] }];
  const first = route(event, players, snapshot, clientView(), [], equipFact);
  const polled = route(event, players, snapshot, clientView(), [], equipFact);
  assert.equal(first.kind, "zone-transition");
  assert.equal(first.claimedBy, "PublicCardDisplay");
  assert.equal(first.physicalCardId, newWeapon.id);
  assert.equal(first.ownerId, ownerId);
  assert.equal(first.slot, "weapon");
  assert.equal(first.claimId, polled.claimId, "polling preserves the same event claim");
  const narration = {
    eventId: event.id, rootEventId: event.id, interactionId: equipFact.identity.interactionId,
    rootFrameId: equipFact.identity.rootFrameId, actorId: ownerId,
    headline: "Owner equipped [Blue Steel Sword].", compactHeadline: "Owner equipped [Blue Steel Sword].",
    accessibleLabel: "Owner equipped Blue Steel Sword.",
  };
  const action = publicEquipmentCardDisplayAction({
    event, route: first, fact: equipFact, narration, roomCode: "ROOM", viewerId: "viewer-1", seenEventIds: new Set(),
  });
  assert.equal(action?.motion?.type, "zone-transition");
  assert.equal(action?.cardFace.id, newWeapon.id);
  assert.equal(action?.publicNoticeEventId, event.id);
  assert.equal(action?.visibleHoldPolicy?.identity.viewerId, "viewer-1");
  assert.equal(action?.visibleHoldPolicy?.identity.h4EventId, event.id);
  assert.deepEqual(action?.visibleHoldPolicy?.completion, {
    kind: "EQUIPMENT_ARRIVAL", claimId: action?.zoneTransition.claimId, eventId: event.id,
    physicalCardId: newWeapon.id, ownerId: event.actorId, destination: "EQUIPMENT", slot: "weapon",
  });
  assert.equal(action?.zoneTransition.h4EventId, event.id);
  assert.equal(publicEquipmentArrivalCompletionMatches({ route: first, claim: action.zoneTransition, roomCode: "ROOM", viewerId: "viewer-1" }), true);
  assert.equal(publicEquipmentArrivalCompletionMatches({ route: first, claim: action.zoneTransition, roomCode: "OTHER", viewerId: "viewer-1" }), false);
  assert.deepEqual(route(event, [{ id: ownerId, equipmentCards: [] }], snapshot, clientView(), [], equipFact), {
    kind: "blocked-invalid-proof", reason: "zone-proof-mismatch",
  }, "a missing or already-replaced slot cannot be treated as an arrival");
  assert.deepEqual(route(event, players, snapshot, clientView(), [event.id], equipFact), {
    kind: "no-public-card-action", reason: "replayed-transition",
  });
  assert.deepEqual(route(event, players, snapshot), {
    kind: "blocked-invalid-proof", reason: "missing-public-fact",
  }, "without the immutable queued fact the later snapshot cannot guess the old event");
  const conflictingFact = { ...equipFact, label: "Different equipment" };
  assert.deepEqual(route(event, players, restSnapshot(equipFact, [equipFact]), clientView(), [], conflictingFact), {
    kind: "blocked-invalid-proof", reason: "conflicting-public-facts",
  }, "a queued fact cannot override contradictory committed public semantics");
});

test("a replacement carries the exact old Equipment from its slot to public Discard", () => {
  const identity = { interactionId: "replace-interaction", rootFrameId: "replace-root", checkpointId: "replace-checkpoint", presentationRevision: 3 };
  const oldDiscardOutcome = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: "replacement-discard", rootEventId: "replacement-equip",
    identity, category: "CARD_DISCARDED", actorId: ownerId, affectedPlayerIds: [ownerId],
    changes: [{ kind: "CARD_DISCARDED", playerId: ownerId, amount: 1, fromZone: "EQUIPMENT", toZone: "DISCARD" }],
  };
  const replacementEquipOutcome = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: "replacement-equip", rootEventId: "replacement-equip",
    identity, category: "CARD_EQUIPPED", actorId: ownerId, affectedPlayerIds: [ownerId],
    source: { kind: "card", label: "Blue Steel Sword" },
    changes: [
      { kind: "CARD_DISCARDED", playerId: ownerId, amount: 1, fromZone: "EQUIPMENT", toZone: "DISCARD" },
      { kind: "CARD_EQUIPPED", playerId: ownerId, amount: 1, fromZone: "HAND", toZone: "EQUIPMENT" },
    ],
  };
  const oldDiscardFact = {
    ...fact("replacement-discard", 10, "replacement-equip", "CARD_DISCARDED", identity),
    label: "Frost Sword", effect: { kind: "equipment_replaced", label: "Frost Sword" }, committedOutcome: oldDiscardOutcome,
  };
  const replacementEquipFact = {
    ...fact("replacement-equip", 11, "replacement-equip", "CARD_EQUIPPED", identity),
    label: "Blue Steel Sword", effect: { kind: "equipment_play", label: "Blue Steel Sword" },
    committedOutcome: replacementEquipOutcome,
  };
  const oldDiscardPublicFact = {
    ...oldDiscardFact, interactionId: identity.interactionId, committedIdentity: identity,
  };
  const replacementEquipPublicFact = {
    ...replacementEquipFact, interactionId: identity.interactionId, committedIdentity: identity,
  };
  const replacementEquipEvent = {
    id: "replacement-equip", type: "card", action: "equip", actorId: ownerId,
    card: newWeapon, presentation: true, publicSequence: 11, publicFact: replacementEquipPublicFact,
  };
  const event = {
    id: "replacement-discard", type: "card", action: "discard", actorId: ownerId,
    card: oldWeapon, presentation: true, publicSequence: 10,
    publicFact: oldDiscardPublicFact,
    publicZoneTransition: {
      semantics: "PROVEN", visibility: "PUBLIC", eventId: "replacement-discard", sourceEventId: "replacement-discard",
      rootEventId: "replacement-equip", physicalCardId: oldWeapon.id,
      from: { zone: "EQUIPMENT", ownerId, slot: "weapon" },
      to: { zone: "DISCARD", ownerId: null },
    },
  };
  const timeline = [event, replacementEquipEvent];
  const result = routePublicDiscardTransition({ event, timeline, roomCode: "ROOM", viewerId: "viewer-1" });
  assert.equal(result.kind, "public-discard-transition");
  assert.equal(result.transitions[0].physicalCardId, oldWeapon.id);
  assert.deepEqual(result.transitions[0].from, { zone: "EQUIPMENT", ownerId, slot: "weapon" });
  assert.equal(routePublicDiscardTransition({
    event,
    timeline: [{ ...event, publicZoneTransition: { ...event.publicZoneTransition, semantics: "INFERRED" } }, replacementEquipEvent],
    roomCode: "ROOM", viewerId: "viewer-1",
  }), null, "an unproven Equipment exit cannot claim the old physical card");
});

test("private refusal receipts and unproven Dismantle results never enter the M2 public route", () => {
  const equipFact = fact("equip-event", 11, "equip-event", "CARD_EQUIPPED");
  const snapshot = restSnapshot(equipFact, [equipFact]);
  const players = [{ id: ownerId, equipmentCards: [newWeapon] }];
  assert.equal(route({
    id: "private-refusal-receipt", type: "card", action: "gain", actorId: ownerId,
    card: oldWeapon, presentation: false, privateToPlayerId: ownerId,
  }, players, snapshot), null);
  assert.equal(route({
    id: "dismantle-result", type: "card", action: "discard", actorId: ownerId,
    card: oldWeapon, presentation: true, publicSequence: 12,
  }, players, snapshot), null);
  const dismantleFact = { ...fact("dismantle-result", 12, "dismantle-root", "CARD_DISCARDED"), effect: { kind: "dismantle_discard" } };
  const dismantleSnapshot = restSnapshot(dismantleFact, [dismantleFact]);
  assert.equal(route({
    id: "dismantle-result", type: "card", action: "discard", actorId: ownerId,
    card: oldWeapon, presentation: true, publicSequence: 12,
    publicFact: { category: "CARD_DISCARDED", effect: { kind: "dismantle_discard" } },
    publicZoneTransition: {
      semantics: "PROVEN", visibility: "PUBLIC", eventId: "dismantle-result", physicalCardId: oldWeapon.id,
      from: { zone: "EQUIPMENT", ownerId, slot: "weapon" },
      to: { zone: "DISCARD", ownerId: null },
    },
  }, players, dismantleSnapshot), null, "even an exact Equipment exit cannot create a second Dismantle result face");
});
