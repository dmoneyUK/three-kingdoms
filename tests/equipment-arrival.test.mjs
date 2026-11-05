import assert from "node:assert/strict";
import { test } from "node:test";
import { equipmentArrivalIdentity, pendingEquipmentArrivalIdentities } from "../game/equipment-arrival.js";

const bow = { id: "physical-kirin-bow", kind: "KirinBow", suit: "♠", rank: "7" };
const owner = { id: "owner-player-id", equipmentCards: [bow] };
const observer = { id: "observer-player-id", equipmentCards: [] };
const committedEquip = { id: "equip-event-id", type: "card", action: "equip", actorId: owner.id, card: bow, presentation: true };

test("equipment arrival identity uses the committed physical card and server actor ID", () => {
  assert.deepEqual(equipmentArrivalIdentity(committedEquip, [owner, observer]), {
    eventId: "equip-event-id",
    cardId: bow.id,
    ownerId: owner.id,
    slot: "weapon",
  });
});

test("legacy equipment event resolves only from unique physical ownership, never names", () => {
  const legacyEvent = { ...committedEquip, player: "Same visible name" };
  delete legacyEvent.actorId;
  assert.equal(equipmentArrivalIdentity(legacyEvent, [owner, observer])?.ownerId, owner.id);
  assert.equal(equipmentArrivalIdentity(legacyEvent, [owner, { ...observer, equipmentCards: [bow] }]), null);
  assert.equal(equipmentArrivalIdentity({ ...legacyEvent, actorId: "unknown-player" }, [owner, observer]), null);
  assert.equal(equipmentArrivalIdentity(committedEquip, [{ ...owner, equipmentCards: [] }, { ...observer, equipmentCards: [bow] }]), null, "a committed event cannot target a different current owner");
});

test("only a new public equip event gates its own card miniature", () => {
  const alreadyPresented = pendingEquipmentArrivalIdentities([committedEquip], [owner, observer], new Set([committedEquip.id]));
  assert.deepEqual(alreadyPresented, []);
  const privateEvent = { ...committedEquip, id: "private-equip", presentation: false };
  const convertedEvent = { ...committedEquip, id: "converted-equip", playedAs: "attack" };
  const optimistic = { ...committedEquip, id: `optimistic-${bow.id}`, actorId: undefined };
  const pending = pendingEquipmentArrivalIdentities([null, {}, { id: null }, optimistic, committedEquip, privateEvent, convertedEvent], [owner, observer], new Set());
  assert.deepEqual(pending, [{ eventId: committedEquip.id, cardId: bow.id, ownerId: owner.id, slot: "weapon" }]);
  assert.deepEqual(pendingEquipmentArrivalIdentities([optimistic], [owner, observer], new Set()), [], "an optimistic event cannot own or release the committed arrival gate");
  assert.deepEqual(pendingEquipmentArrivalIdentities([committedEquip], [{ ...owner, equipmentCards: [] }, observer], new Set()), [], "a replaced card no longer has a miniature to gate");
});

test("arrival identity maps Armor and both Horse slots from card definitions", () => {
  for (const [kind, slot] of [["NioShield", "armor"], ["Shadowrunner", "defensiveHorse"], ["RedHare", "offensiveHorse"]]) {
    const equipment = { id: `physical-${kind}`, kind, suit: "♠", rank: "5" };
    const event = { ...committedEquip, id: `equip-${kind}`, card: equipment };
    assert.deepEqual(equipmentArrivalIdentity(event, [{ ...owner, equipmentCards: [equipment] }, observer]), {
      eventId: event.id,
      cardId: equipment.id,
      ownerId: owner.id,
      slot,
    });
  }
});
