import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createPublicCardEffectFrameView } from "../app/public-card-display.tsx";
import { canonicalPublicDiscardActionOwnerCandidate, canonicalPublicDiscardTransitionOwnerCandidate, publicDiscardActionCandidate } from "../app/public-discard-presentation-owner.ts";
import { attachCanonicalPublicDiscardCopy, verifiedRockCleavingAxeCostFrameForEvent, verifiedStauchnessCostFrameForEvent } from "../app/page.tsx";
import { selectCanonicalPublicDiscardOwner, selectPublicCardActionForCursor } from "../game/public-announcement.ts";

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

test("the canonical discard descriptor has one exact event and ordered-material owner", () => {
  const dueCost = { rootEventId: "cost-event" };
  const descriptor = {
    eventId: "cost-event", orderedPhysicalCardIds: ["cost-1", "cost-2"], owner: dueCost,
  };
  assert.equal(selectCanonicalPublicDiscardOwner("cost-event", [descriptor]), dueCost,
    "the validated exact discard event owns its canonical presentation");
  assert.equal(selectCanonicalPublicDiscardOwner("later-attack", [descriptor]), null,
    "a later Attack cannot steal or resurrect the earlier discard owner");
  assert.equal(selectCanonicalPublicDiscardOwner("cost-event", [descriptor, descriptor]), null,
    "duplicate same-event owners fail closed");
  assert.equal(selectCanonicalPublicDiscardOwner("cost-event", [{ ...descriptor, orderedPhysicalCardIds: [] }]), null,
    "an owner without physical material identity fails closed");
  assert.equal(selectCanonicalPublicDiscardOwner("cost-event", [{ ...descriptor, orderedPhysicalCardIds: ["cost-1", "cost-1"] }]), null,
    "duplicate physical identities fail closed");
  assert.equal(selectCanonicalPublicDiscardOwner(null, [descriptor]), null);
});

test("the exact active canonical cost owner precedes later non-discard fallback actions", () => {
  const costAction = { rootEventId: "cost-event", checkpointEventId: "cost-event" };
  const newerAttackAction = { rootEventId: "attack-event", checkpointEventId: "attack-event" };
  const select = (cursorEventId, canonicalDiscardOwner) => selectPublicCardActionForCursor({
    cursorEvent: cursorEventId ? { id: cursorEventId } : null,
    canonicalDiscardOwner,
    latestHeroAction: newerAttackAction,
    checkpointEventId: (action) => action.checkpointEventId,
    timelineEventIds: ["cost-event", "attack-event"],
  });

  assert.equal(select("cost-event", costAction).cursorOwnedAction, costAction,
    "an exact active verified discard stays visible before a later public Attack");
  assert.equal(select("attack-event", null).latestAction, newerAttackAction,
    "after the discard cursor advances, the genuine later non-discard action resumes");
  assert.equal(select("cost-event", null).latestAction, newerAttackAction,
    "the discard cannot silently enter the non-discard fallback without a canonical owner");
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

test("effect-frame discard owner requires exact proof, ordered materials and owners", () => {
  const cards = [
    { id: "frame-card-1", kind: "Attack", rank: "8", suit: "♠" },
    { id: "frame-card-2", kind: "Peach", rank: "Q", suit: "♥" },
  ];
  const eventId = "frame-discard";
  const effect = {
    semantics: "PROVEN", eventId, effectClass: "COST", activationOwnerId: axeOwner.id,
    rootEventId: "root-attack", rootResolutionId: "root-resolution",
    materials: cards.map((card) => ({ cardId: card.id, ownerId: axeOwner.id, fromZone: "HAND", toZone: "DISCARD" })),
  };
  const settlement = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId, order: 12, rootEventId: "root-attack",
    resolutionId: "root-resolution", activationOwnerId: axeOwner.id, affectedPlayerIds: [axeOwner.id],
    source: { kind: "equipment", label: "Rock Cleaving Axe", providerId: "rock_cleaving_axe" }, mode: "cost",
    materials: cards.map((card) => ({ card, physicalCardId: card.id, ownerId: axeOwner.id, fromZone: "HAND", toZone: "DISCARD" })),
    presentation: "eligible",
  };
  const copy = { eventId, order: 12, cards: cards.map((card) => ({ ...card, name: card.kind })), headline: "Canonical discard copy.", accessibleLabel: "Canonical discard copy." };
  const frameAction = {
    rootEventId: eventId, publicDiscardSettlement: copy, cardLabel: "ROCK CLEAVING AXE · FORCE HIT",
    publicCardEffectFrame: {
      eventId, rootEventId: "root-attack", rootResolutionId: "root-resolution", activationOwnerId: axeOwner.id,
      title: "ROCK CLEAVING AXE · FORCE HIT",
      materials: cards.map((card) => ({ card, ownerId: axeOwner.id })),
    },
  };
  const lifecycle = { fresh: true, seen: false, phase: "ACTIVE_CURSOR" };

  const owner = canonicalPublicDiscardActionOwnerCandidate(frameAction, settlement, copy, [effect], lifecycle);
  assert.equal(owner?.eventId, eventId);
  assert.deepEqual(owner?.orderedPhysicalCardIds, cards.map((card) => card.id));
  assert.equal(owner?.owner.kind, "effect-frame");
  assert.equal(owner?.owner.action, frameAction);
  assert.equal(owner?.owner.descriptor.visualRole, "effect-frame");
  assert.equal(owner?.owner.descriptor.visualTitle, "ROCK CLEAVING AXE · FORCE HIT");
  assert.deepEqual(owner?.owner.descriptor.orderedPhysicalCardIds, cards.map((card) => card.id));
  assert.deepEqual(owner?.owner.descriptor.lifecycle, lifecycle);
  assert.equal(publicDiscardActionCandidate({ ...frameAction, publicDiscardSettlement: undefined }, [effect]), true,
    "a committed discard remains excluded from non-discard fallback even when normalized proof is unavailable");
  assert.equal(publicDiscardActionCandidate({ ...frameAction, publicDiscardSettlement: undefined }, [
    { ...effect, effectClass: "CONVERSION" },
  ]), false, "conversion materials retain their existing response renderer");
  assert.equal(publicDiscardActionCandidate({ ...frameAction, publicDiscardSettlement: undefined }, [effect], new Set([eventId])), false,
    "a normalized excluded play does not become a new discard presentation");
  assert.equal(canonicalPublicDiscardActionOwnerCandidate({ ...frameAction, publicDiscardSettlement: undefined }, settlement, copy, [effect], lifecycle), null);
  assert.equal(canonicalPublicDiscardActionOwnerCandidate(frameAction, settlement, copy, [{ ...effect, materials: [...effect.materials].reverse() }], lifecycle), null,
    "reordered raw proof cannot claim the canonical renderer");
  assert.equal(canonicalPublicDiscardActionOwnerCandidate(frameAction, { ...settlement, materials: settlement.materials.map((material) => ({ ...material, ownerId: damageSource.id })) }, copy, [effect], lifecycle), null,
    "a mismatched material owner fails closed");
  assert.equal(canonicalPublicDiscardActionOwnerCandidate(frameAction, { ...settlement, source: { ...settlement.source, providerId: "unexpected" } }, copy, [
    { ...effect, source: { kind: "equipment", label: "Rock Cleaving Axe", providerId: "rock_cleaving_axe" } },
  ], lifecycle), null, "a different committed effect source cannot claim the descriptor");
});

test("ordinary discard and verified Dismantle use the shared owner descriptor", () => {
  const card = { id: "discard-card", kind: "Dodge", rank: "3", suit: "♣" };
  const eventId = "discard-event";
  const settlement = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId, order: 5, affectedPlayerIds: [damageSource.id],
    source: { kind: "card", label: "Dismantle", providerId: "dismantle" }, mode: "direct",
    materials: [{ card, physicalCardId: card.id, ownerId: damageSource.id, fromZone: "HAND", toZone: "DISCARD" }],
    presentation: "eligible",
  };
  const route = { eventId, transitions: [{ physicalCardId: card.id, from: { zone: "HAND", ownerId: damageSource.id }, to: { zone: "DISCARD", ownerId: null } }] };
  const lifecycle = { fresh: true, seen: false, phase: "ACTIVE_CURSOR" };
  const transitionOwner = canonicalPublicDiscardTransitionOwnerCandidate(route, settlement, lifecycle);
  assert.equal(transitionOwner?.owner.kind, "ordinary-transition");
  assert.equal(transitionOwner?.owner.route, route);
  assert.equal(transitionOwner?.owner.descriptor.visualRole, "ordinary-transition");
  assert.deepEqual(transitionOwner?.owner.descriptor.lifecycle, lifecycle);
  assert.equal(canonicalPublicDiscardTransitionOwnerCandidate({ ...route, transitions: [{
    ...route.transitions[0], from: { zone: "HAND", ownerId: axeOwner.id },
  }] }, settlement, lifecycle), null, "a mismatched source owner cannot claim the ordinary transition");

  const copy = { eventId, order: 5, cards: [{ ...card, name: card.kind }], headline: "Dismantle copy.", accessibleLabel: "Dismantle copy." };
  const dismantleAction = {
    rootEventId: "dismantle-root", publicDiscardSettlement: copy, cardLabel: "BURNING BRIDGE",
    sourceId: axeOwner.id, targetId: damageSource.id,
    settlement: { eventId, rootEventId: "dismantle-root", rootResolutionId: "dismantle-resolution",
      sourceId: axeOwner.id, targetId: damageSource.id, outcome: "DISMANTLE_RESOLVED", exiting: false,
      targetCardMovement: { sourceZone: "hand", affectedCardOwnerId: damageSource.id, destinationZone: "discard", destinationOwnerId: null, affectedCardFace: card } },
  };
  const dismantleSettlement = { ...settlement, rootEventId: "dismantle-root", resolutionId: "dismantle-resolution", activationOwnerId: axeOwner.id };
  const dismantleOwner = canonicalPublicDiscardActionOwnerCandidate(dismantleAction, dismantleSettlement, copy, [], lifecycle);
  assert.equal(dismantleOwner?.owner.kind, "dismantle-adapter");
  assert.equal(dismantleOwner?.owner.action, dismantleAction);
  assert.equal(dismantleOwner?.owner.descriptor.visualTitle, "BURNING BRIDGE");
  assert.equal(publicDiscardActionCandidate({ ...dismantleAction, publicDiscardSettlement: undefined }, []), false,
    "the Dismantle root card remains an ordinary action while its target face uses the separate adapter");
  assert.equal(publicDiscardActionCandidate(dismantleAction, []), false,
    "attaching canonical target copy does not turn the Dismantle root action into a second discard renderer");
  assert.equal(canonicalPublicDiscardActionOwnerCandidate(dismantleAction, { ...dismantleSettlement, eventId: "other-event" }, copy, [], lifecycle), null);
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
  const ownerSource = readFileSync(new URL("../app/public-discard-presentation-owner.ts", import.meta.url), "utf8");
  const proofBuilders = source.slice(source.indexOf("type VerifiedStauchnessCostFrameProof"), source.indexOf("type VerifiedKirinBowEffectFrameProof"));
  assert.doesNotMatch(proofBuilders, /h4Copy|publicH4Copy\(/);
  assert.doesNotMatch(source, /selectedPublicDiscardSettlement|canonicalDiscardFallbackAction|cursorActions:\s*\[stauchnessCostFrameAction/);
  assert.match(ownerSource, /export function canonicalPublicDiscardActionOwnerCandidate\(/);
  assert.match(source, /const heroPublicDiscardActionCandidates = heroPublicCardEffectFrameActionCandidates/);
  assert.match(source, /const heroPublicCardEffectFrameActionCandidates = \[[\s\S]*?stauchnessCostFrameAction,[\s\S]*?rockCleavingAxeCostFrameAction,[\s\S]*?kirinBowDamageFrameAction \?\? kirinBowEffectFrameAction,[\s\S]*?frostSwordEffectFrameAction/,
    "Stauchness, Axe, Kirin and Frost use the same canonical candidate/owner route");
  assert.match(source, /selectCanonicalPublicDiscardOwner\(/,
    "the shared router selects one exact proof-bound owner before visual rendering");
  assert.match(source, /const latestHeroPublicCardEffectFrameAction = heroPublicCardEffectFrameActionCandidates[\s\S]*?filter\(\(action\) => !publicDiscardActionCandidate/,
    "discard candidates are retired from the latest-Hero fallback");
  assert.match(source, /canonicalPublicDiscardPresentationByEvent\.get\(currentInteractionFact\.eventId\)\?\.copy/,
    "the current shared H4 receives canonical copy only for its exact committed discard event");
  assert.match(source, /const publicCardActionCursorSelection = selectPublicCardActionForCursor/);
  assert.match(source, /ownerNamesById\[input\.effect\.activationOwnerId\]/,
    "shared frame construction uses the verified owner's public name, not its internal ID");
  assert.match(source, /nonHeroActionHasDismantleDiscard/,
    "Dismantle target discard ownership is routed independently from its real root CardFace");
});
