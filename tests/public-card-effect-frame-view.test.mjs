import test from "node:test";
import assert from "node:assert/strict";
import { createPublicCardEffectFrameView } from "../app/public-card-display.tsx";

const card = (id) => ({ id, kind: "Attack", suit: "♠", rank: "7" });
const effect = (overrides = {}) => ({
  semantics: "PROVEN",
  effectId: "frost_sword_damage_about_to_apply",
  effectClass: "EFFECT",
  eventId: "frost-material-event",
  activationOwnerId: "attacker",
  materials: [
    { cardId: "target-card-1", ownerId: "target", fromZone: "HAND", toZone: "DISCARD" },
    { cardId: "target-card-2", ownerId: "target", fromZone: "EQUIPMENT", toZone: "DISCARD" },
  ],
  cards: [card("target-card-1"), card("target-card-2")],
  rootEventId: "attack-event",
  rootResolutionId: "attack-resolution",
  outcome: "DAMAGE_PREVENTED",
  ...overrides,
});
const copy = {
  title: "FROST SWORD",
  accessibleLabel: "Frost Sword discarded two cards from Target and prevented damage.",
  activationOwnerName: "Attacker",
  ownerNamesById: { attacker: "Attacker", target: "Target" },
};

test("public effect frame factory preserves true activation and material owners and all genuine faces", () => {
  const frame = createPublicCardEffectFrameView(effect(), copy);
  assert.ok(frame);
  assert.equal(frame.activationOwnerId, "attacker");
  assert.deepEqual(frame.materials.map(({ ownerId, ownerName, card: materialCard }) => ({
    ownerId, ownerName, id: materialCard.id,
  })), [
    { ownerId: "target", ownerName: "Target", id: "target-card-1" },
    { ownerId: "target", ownerName: "Target", id: "target-card-2" },
  ]);
  assert.match(frame.accessibleLabel, /FROST SWORD effect frame/);
  assert.match(frame.accessibleLabel, /Target's Attack, 7 of Spades/);
  assert.equal((frame.accessibleLabel.match(/Target's Attack, 7 of Spades/g) ?? []).length, 2);
});

test("public effect frame factory fails closed on identity, ownership-name, and class errors", () => {
  assert.equal(createPublicCardEffectFrameView(effect({ cards: [card("wrong-card"), card("target-card-2")] }), copy), null);
  assert.equal(createPublicCardEffectFrameView(effect(), { ...copy, ownerNamesById: { attacker: "Attacker" } }), null);
  assert.equal(createPublicCardEffectFrameView(effect({ effectClass: "PRIVATE" }), copy), null);
});
