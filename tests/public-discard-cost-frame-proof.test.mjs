import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createPublicCardEffectFrameView } from "../app/public-card-display.tsx";
import { attachCanonicalPublicDiscardCopy, verifiedRockCleavingAxeCostFrameForEvent, verifiedStauchnessCostFrameForEvent } from "../app/page.tsx";
import { selectPublicCardActionAtCursor, selectPublicCardActionForCursor } from "../game/public-announcement.ts";

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
    accessibleLabel: "Verified public cost materials.",
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

test("stale cursor-bound cost frames cannot re-enter through the latest hero fallback", () => {
  const costAction = { rootEventId: "cost-event", checkpointEventId: "cost-event" };
  const unrelatedHeroAction = { rootEventId: "hero-event", checkpointEventId: "hero-event" };
  const select = (cursorEventId, latestHeroAction) => selectPublicCardActionForCursor({
    cursorEvent: cursorEventId ? { id: cursorEventId } : null,
    cursorActions: [costAction],
    latestHeroAction,
    checkpointEventId: (action) => action.checkpointEventId,
    timelineEventIds: ["cost-event", "hero-event"],
  });

  assert.equal(select("cost-event", costAction).cursorOwnedAction, costAction,
    "the exact committed cost event owns its presentation cursor");
  assert.equal(select("older-event", costAction).latestAction, null,
    "an old cost frame cannot be resurrected after the cursor advances");
  assert.equal(select("older-event", unrelatedHeroAction).latestAction, unrelatedHeroAction,
    "ordinary latest hero announcements keep their existing fallback");
});

test("Stauchness cost proof retains both real Hand faces without producing a competing H4 copy", () => {
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
  assert.equal("h4Copy" in proof, false, "proof validation no longer formats a second H4 sentence");
  assert.deepEqual(proof.costCards.map(({ id }) => id), stauchnessCards.map(({ id }) => id));
  assert.equal(proof.effect.interactionId, effect.interactionId);
  assert.equal(proof.effect.rootFrameId, effect.rootFrameId);

  const frame = frameFor(proof, { [xiahou.id]: xiahou.name, [damageSource.id]: damageSource.name });
  assert.ok(frame);
  assert.deepEqual(frame.materials.map(({ card, ownerId }) => [card.id, ownerId]),
    stauchnessCards.map((card) => [card.id, damageSource.id]));
});

test("Axe COST recorded as play retains both ordered materials without guessing a copy", () => {
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
  assert.equal("h4Copy" in proof, false, "proof validation leaves copy ownership to the canonical settlement");
  const frame = frameFor(proof, { [axeOwner.id]: axeOwner.name, [damageSource.id]: damageSource.name });
  assert.ok(frame);
  assert.deepEqual(frame.materials.map(({ card, ownerId }) => [card.id, ownerId]),
    axeCards.map((card) => [card.id, axeOwner.id]));
});

test("the exact canonical discard copy is attached before H4 and Frame consume the action", () => {
  const headline = "Xiahou Dun used Stauchness, causing Damage Source to discard 2 cards: [8♠ Attack] · [Q♥ Peach].";
  const segments = [{ kind: "text", text: headline }];
  const copy = { eventId: "stauchness-cost", order: 2, cards: stauchnessCards.map((card) => ({ ...card, name: card.kind })), headline,
    segments, accessibleLabel: headline };
  const settlement = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: "stauchness-cost", order: 2,
    affectedPlayerIds: [damageSource.id], source: { kind: "skill", label: "Stauchness" }, mode: "forced",
    materials: stauchnessCards.map((card) => ({ card, physicalCardId: card.id, ownerId: damageSource.id, fromZone: "HAND", toZone: "DISCARD" })),
    presentation: "eligible",
  };
  const presentations = new Map([[settlement.eventId, { settlement, copy }]]);
  const oldCopy = "Xiahou Dun caused Damage Source to discard 2 cards.";
  const action = {
    key: "stauchness-cost", rootEventId: "stauchness-cost", publicNotice: oldCopy, ariaLabel: oldCopy,
    publicCardEffectFrame: { eventId: "stauchness-cost", materials: stauchnessCards.map((card) => ({ card, ownerId: damageSource.id })), accessibleLabel: oldCopy },
  };

  const canonical = attachCanonicalPublicDiscardCopy(action, presentations);
  assert.equal(canonical.publicNotice, headline);
  assert.equal(canonical.ariaLabel, headline);
  assert.equal(canonical.publicNoticeSegments, segments);
  assert.equal(canonical.publicDiscardSettlement, copy);
  assert.equal(canonical.publicCardEffectFrame.accessibleLabel, headline);
  assert.equal(attachCanonicalPublicDiscardCopy({ ...action, publicCardEffectFrame: {
    ...action.publicCardEffectFrame, materials: [...action.publicCardEffectFrame.materials].reverse(),
  } }, presentations).publicNotice, oldCopy, "wrong material order does not receive another event's canonical copy");
});

test("discard proof and selected actions have one copy source, before cursor selection", () => {
  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const proofBuilders = source.slice(source.indexOf("type VerifiedStauchnessCostFrameProof"), source.indexOf("type VerifiedKirinBowEffectFrameProof"));
  assert.doesNotMatch(proofBuilders, /h4Copy|publicH4Copy\(/);
  assert.doesNotMatch(source, /selectedPublicDiscardSettlement/);
  assert.match(source, /const stauchnessCostFrameAction = withCanonicalPublicDiscardCopy\(/);
  assert.match(source, /const rockCleavingAxeCostFrameAction = withCanonicalPublicDiscardCopy\(/);
  assert.match(source, /const latestHeroPublicCardEffectFrameAction = withCanonicalPublicDiscardCopy\(/);
  assert.match(source, /const nonHeroLivePublicCardAction = withCanonicalPublicDiscardCopy\(/);
  assert.match(source, /canonicalPublicDiscardPresentationByEvent\.get\(currentInteractionFact\.eventId\)\?\.copy/,
    "the current shared H4 receives the canonical copy only for its exact committed discard event");
  assert.match(source, /const publicCardActionCursorSelection = selectPublicCardActionForCursor/);
});
