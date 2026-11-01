import assert from "node:assert/strict";
import test from "node:test";
import { routePublicEquipmentTransition } from "../app/public-equipment-transition.ts";

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

function route(event, players, snapshot, view = clientView(), retiredTransitionIds = []) {
  return routePublicEquipmentTransition({
    event, players, snapshot, clientView: view, roomCode: "ROOM", viewerId: view.viewerId ?? "viewer-1", retiredTransitionIds,
    existingOwners: event.card ? [{ eventId: event.id, physicalCardId: event.card.id, owner: "TableResolutionSequence" }] : [],
  });
}

test("an equipped physical card routes once only after the actual server slot contains it", () => {
  const equipFact = fact("equip-event", 11, "equip-event", "CARD_EQUIPPED");
  const snapshot = restSnapshot(equipFact, [equipFact]);
  const event = {
    id: "equip-event", type: "card", action: "equip", actorId: ownerId,
    card: newWeapon, presentation: true, publicSequence: 11,
  };
  const players = [{ id: ownerId, equipmentCards: [newWeapon] }];
  const first = route(event, players, snapshot);
  const polled = route(event, players, snapshot);
  assert.equal(first.kind, "zone-transition");
  assert.equal(first.claimedBy, "PublicPhysicalCardTransition");
  assert.equal(first.physicalCardId, newWeapon.id);
  assert.equal(first.ownerId, ownerId);
  assert.equal(first.slot, "weapon");
  assert.equal(first.claimId, polled.claimId, "polling preserves the same event claim");
  assert.deepEqual(route(event, [{ id: ownerId, equipmentCards: [] }], snapshot), {
    kind: "blocked-invalid-proof", reason: "zone-proof-mismatch",
  }, "a missing or already-replaced slot cannot be treated as an arrival");
  assert.deepEqual(route(event, players, snapshot, clientView(), [event.id]), {
    kind: "no-public-card-action", reason: "replayed-transition",
  });
});

test("a replacement carries the exact old Equipment from its slot to public Discard", () => {
  const oldDiscardFact = { ...fact("replacement-discard", 10, "replacement-equip", "CARD_DISCARDED"), effect: { kind: "equipment_replaced", label: "Frost Sword" } };
  const replacementEquipFact = fact("replacement-equip", 11, "replacement-equip", "CARD_EQUIPPED");
  const snapshot = restSnapshot(replacementEquipFact, [oldDiscardFact, replacementEquipFact]);
  const event = {
    id: "replacement-discard", type: "card", action: "discard", actorId: ownerId,
    card: oldWeapon, presentation: true, publicSequence: 10,
    publicFact: { category: "CARD_DISCARDED", effect: { kind: "equipment_replaced" } },
    publicZoneTransition: {
      semantics: "PROVEN", visibility: "PUBLIC", eventId: "replacement-discard", physicalCardId: oldWeapon.id,
      from: { zone: "EQUIPMENT", ownerId, slot: "weapon" },
      to: { zone: "DISCARD", ownerId: null },
    },
  };
  const result = route(event, [{ id: ownerId, equipmentCards: [newWeapon] }], snapshot);
  assert.equal(result.kind, "zone-transition");
  assert.equal(result.destination, "DISCARD");
  assert.equal(result.physicalCardId, oldWeapon.id);
  assert.deepEqual(result.from, { zone: "EQUIPMENT", ownerId, slot: "weapon" });
  assert.deepEqual(route(event, [{ id: ownerId, equipmentCards: [oldWeapon, newWeapon] }], snapshot), null,
    "an old Equipment still present in its slot cannot claim an exit");
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
