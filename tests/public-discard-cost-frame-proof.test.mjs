import assert from "node:assert/strict";
import test from "node:test";
import { createPublicCardEffectFrameView } from "../app/public-card-display.tsx";
import { verifiedRockCleavingAxeCostFrameForEvent, verifiedStauchnessCostFrameForEvent } from "../app/page.tsx";
import { selectPublicCardActionAtCursor } from "../game/public-announcement.ts";

const axeOwner = { id: "axe-owner", name: "Axe Owner" };
const xiahou = { id: "xiahou", name: "Xiahou Dun", hero: "xiahou-dun" };
const damageSource = { id: "damage-source", name: "Damage Source" };
const axeCards = [
  { id: "axe-card-1", kind: "Peach", rank: "A", suit: "♥" },
  { id: "axe-card-2", kind: "Dodge", rank: "2", suit: "♣" },
];
const stauchnessCards = [
  { id: "stauchness-card-1", kind: "Attack", rank: "8", suit: "♠" },
  { id: "stauchness-card-2", kind: "Peach", rank: "Q", suit: "♥" },
];

function frameFor(proof, ownerNamesById) {
  return createPublicCardEffectFrameView(proof.effect, {
    title: proof.effect.effectId === "xiahou_dun_ganglie" ? "STAUCHNESS" : "ROCK CLEAVING AXE · FORCE HIT",
    accessibleLabel: proof.h4Copy.message,
    activationOwnerName: proof.activationOwner.name,
    ownerNamesById,
  });
}

test("only a unique cost-frame action for the current committed event owns the cursor", () => {
  const retainedDodge = { rootEventId: "dodge-event" };
  const dueCost = { rootEventId: "cost-event" };
  assert.equal(selectPublicCardActionAtCursor("cost-event", [retainedDodge, dueCost]), dueCost);
  assert.equal(selectPublicCardActionAtCursor("later-event", [retainedDodge, dueCost]), null);
  assert.equal(selectPublicCardActionAtCursor("cost-event", [dueCost, { rootEventId: "cost-event" }]), null,
    "ambiguous duplicate owners fail closed");
  assert.equal(selectPublicCardActionAtCursor(null, [dueCost]), null);
});

test("Stauchness cost proof retains both real Hand faces and names both in H4", () => {
  const effect = {
    semantics: "PROVEN", eventId: "stauchness-cost", effectId: "xiahou_dun_ganglie", effectClass: "COST",
    interactionId: "stauchness-interaction", rootFrameId: "stauchness-frame",
    activationOwnerId: xiahou.id, targetId: damageSource.id, outcome: "SOURCE_DISCARDED_TWO",
    rootEventId: "damage-root", rootResolutionId: "damage-resolution", cards: stauchnessCards,
    materials: stauchnessCards.map((card) => ({ cardId: card.id, ownerId: damageSource.id, fromZone: "HAND", toZone: "DISCARD" })),
  };
  const costEvent = {
    id: effect.eventId, type: "cards", action: "discard", resolutionId: "cost-resolution",
    cards: stauchnessCards, player: damageSource.name, target: damageSource.name, publicCardEffects: [effect],
  };
  const rootEvent = {
    id: "damage-root", type: "card", action: "play", resolutionId: "damage-resolution",
    card: { id: "damage-attack", kind: "Attack", rank: "4", suit: "♦" },
    player: damageSource.name, target: xiahou.name,
  };
  const proof = verifiedStauchnessCostFrameForEvent(
    [rootEvent, costEvent], [effect], [xiahou, damageSource], costEvent.id,
  );

  assert.ok(proof);
  assert.equal(proof.h4Copy.message,
    "Xiahou Dun used Stauchness, causing Damage Source to discard 2 cards: [8♠ Attack] · [Q♥ Peach].");
  assert.deepEqual(proof.h4Copy.segments.filter((part) => part.kind === "player").map((part) => part.playerId),
    [xiahou.id, damageSource.id]);
  assert.equal(proof.effect.interactionId, effect.interactionId);
  assert.equal(proof.effect.rootFrameId, effect.rootFrameId);

  const frame = frameFor(proof, { [xiahou.id]: xiahou.name, [damageSource.id]: damageSource.name });
  assert.ok(frame);
  assert.deepEqual(frame.materials.map(({ card, ownerId }) => [card.id, ownerId]),
    stauchnessCards.map((card) => [card.id, damageSource.id]));
});

test("Axe COST recorded as play retains both ordered materials and truthful H4", () => {
  const effect = {
    semantics: "PROVEN", eventId: "axe-cost", effectId: "rock_cleaving_axe_attack_dodged", effectClass: "COST",
    interactionId: "axe-interaction", rootFrameId: "axe-frame",
    activationOwnerId: axeOwner.id, targetId: damageSource.id, outcome: "FORCED_HIT",
    rootEventId: "axe-attack-root", rootResolutionId: "attack-resolution", cards: axeCards,
    materials: axeCards.map((card) => ({ cardId: card.id, ownerId: axeOwner.id, fromZone: "HAND", toZone: "DISCARD" })),
  };
  const costEvent = {
    id: effect.eventId, type: "cards", action: "play", resolutionId: "cost-resolution",
    cards: axeCards, player: axeOwner.name, target: damageSource.name, publicCardEffects: [effect],
  };
  const rootEvent = {
    id: "axe-attack-root", type: "card", action: "play", resolutionId: "attack-resolution",
    card: { id: "attack-card", kind: "Attack", rank: "7", suit: "♠" },
    player: axeOwner.name, target: damageSource.name,
  };
  const proof = verifiedRockCleavingAxeCostFrameForEvent(
    [rootEvent, costEvent], [effect], [axeOwner, damageSource], costEvent.id,
  );

  assert.ok(proof);
  assert.equal(proof.h4Copy.message,
    "Axe Owner used [Rock Cleaving Axe] and discarded 2 cards: [A♥ Peach] · [2♣ Dodge].");
  assert.doesNotMatch(proof.h4Copy.message, /took damage|damage applied/i);
  const frame = frameFor(proof, { [axeOwner.id]: axeOwner.name, [damageSource.id]: damageSource.name });
  assert.ok(frame);
  assert.deepEqual(frame.materials.map(({ card, ownerId }) => [card.id, ownerId]),
    axeCards.map((card) => [card.id, axeOwner.id]));
});
