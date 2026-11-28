import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createPublicCardEffectFrameView } from "../app/public-card-display.tsx";
import { canonicalPublicDiscardTransitionOwnerCandidate, resolveCanonicalPublicDiscardPresentation, selectCanonicalPublicDiscardRenderOwner } from "../app/public-discard-presentation-owner.ts";
import { verifiedRockCleavingAxeCostFrameForEvent, verifiedStauchnessCostFrameForEvent } from "../app/page.tsx";
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

test("canonical discard factory builds one proof-bound Frame Action and copy before cursor ownership", () => {
  const cards = [
    { id: "frame-card-1", kind: "Attack", rank: "8", suit: "♠" },
    { id: "frame-card-2", kind: "Peach", rank: "Q", suit: "♥" },
  ];
  const eventId = "frame-discard";
  const effect = {
    semantics: "PROVEN", eventId, effectClass: "COST", activationOwnerId: axeOwner.id,
    rootEventId: "root-attack", rootResolutionId: "root-resolution",
    materials: cards.map((card) => ({ cardId: card.id, ownerId: axeOwner.id, fromZone: "HAND", toZone: "DISCARD" })),
    cards,
  };
  const settlement = {
    semantics: "PROVEN", visibility: "PUBLIC", eventId, order: 12, rootEventId: "root-attack",
    resolutionId: "root-resolution", activationOwnerId: axeOwner.id, affectedPlayerIds: [axeOwner.id],
    source: { kind: "equipment", label: "Rock Cleaving Axe", providerId: "rock_cleaving_axe" }, mode: "cost",
    materials: cards.map((card) => ({ card, physicalCardId: card.id, ownerId: axeOwner.id, fromZone: "HAND", toZone: "DISCARD" })),
    presentation: "eligible",
  };
  const copy = { eventId, order: 12, cards: cards.map((card) => ({ ...card, name: card.kind })), headline: "Canonical discard copy.", accessibleLabel: "Canonical discard copy." };
  const seed = {
    effect, key: "axe-cost", sourceId: axeOwner.id, targetId: null, cardLabel: "ROCK CLEAVING AXE · FORCE HIT",
    visualTitle: "ROCK CLEAVING AXE · FORCE HIT", motionScopeKey: "axe-cost", freshEventIds: [eventId],
    ownerNamesById: { [axeOwner.id]: axeOwner.name },
  };
  const presentationsByEvent = new Map([[eventId, { settlement, copy }]]);
  const select = (overrides = {}) => resolveCanonicalPublicDiscardPresentation({
    cursorEventId: eventId, heroActions: [], effectFrameSeeds: [seed], timelineEventIds: [eventId], effects: [effect],
    presentationsByEvent, journeySeenEventIds: new Set(), presentedTransitionEventIds: new Set(), ...overrides,
  });
  const selected = select();
  const owner = selected.owner;
  assert.equal(owner?.descriptor.eventId, eventId);
  assert.deepEqual(owner?.descriptor.orderedPhysicalCardIds, cards.map((card) => card.id));
  assert.equal(owner?.kind, "effect-frame");
  assert.equal(owner?.action, selected.actionOwner);
  assert.equal(owner?.action.publicNotice, copy.headline);
  assert.equal(owner?.action.ariaLabel, copy.accessibleLabel);
  assert.ok(owner?.action.publicCardEffectFrame.accessibleLabel.endsWith(copy.accessibleLabel));
  assert.equal(owner?.descriptor.visualRole, "effect-frame");
  assert.equal(owner?.descriptor.visualTitle, "ROCK CLEAVING AXE · FORCE HIT");
  assert.deepEqual(owner?.descriptor.orderedPhysicalCardIds, cards.map((card) => card.id));
  assert.deepEqual(owner?.descriptor.lifecycle, { fresh: true, seen: false, phase: "ACTIVE_CURSOR" });
  assert.equal(selected.latestNonDiscardHeroAction, null);

  assert.equal(select({ effectFrameSeeds: [seed, seed] }).owner, null, "duplicate exact event owners fail closed");
  assert.equal(select({ excludedEventIds: new Set([eventId]) }).owner, null, "excluded public outcomes cannot create a discard owner");
  assert.equal(select({ effects: [{ ...effect, materials: [...effect.materials].reverse() }] }).owner, null,
    "reordered projected proof cannot claim the canonical renderer");
  assert.equal(select({ presentationsByEvent: new Map([[eventId, { settlement: {
    ...settlement, materials: settlement.materials.map((material) => ({ ...material, ownerId: damageSource.id })),
  }, copy }]]) }).owner, null, "a mismatched material owner fails closed");
  assert.equal(resolveCanonicalPublicDiscardPresentation({
    cursorEventId: "later-event", heroActions: [], effectFrameSeeds: [seed], timelineEventIds: [eventId, "later-event"],
    effects: [effect], presentationsByEvent, journeySeenEventIds: new Set(), presentedTransitionEventIds: new Set(),
  }).owner, null, "an older discard does not claim a later cursor");
  assert.equal(resolveCanonicalPublicDiscardPresentation({
    cursorEventId: eventId, heroActions: [], effectFrameSeeds: [seed], timelineEventIds: [eventId],
    effects: [{ ...effect, effectClass: "CONVERSION" }], presentationsByEvent, journeySeenEventIds: new Set(), presentedTransitionEventIds: new Set(),
  }).owner, null, "conversion materials remain outside canonical discard routing");

  const descriptor = { eventId, orderedPhysicalCardIds: cards.map((card) => card.id) };
  const ordinaryOwner = { kind: "ordinary-transition" };
  const frameRenderOwner = { kind: "effect-frame" };
  assert.equal(selectCanonicalPublicDiscardRenderOwner(eventId, [
    { ...descriptor, owner: ordinaryOwner }, { ...descriptor, owner: frameRenderOwner },
  ]), frameRenderOwner, "the proven effect-frame role outranks its passive transition candidate");
  assert.equal(selectCanonicalPublicDiscardRenderOwner(eventId, [
    { ...descriptor, owner: frameRenderOwner }, { ...descriptor, owner: frameRenderOwner },
  ]), null, "two owners at the same visual role remain ambiguous");
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
  const selectedDismantle = resolveCanonicalPublicDiscardPresentation({
    cursorEventId: eventId, heroActions: [], effectFrameSeeds: [], nonHeroAction: dismantleAction,
    timelineEventIds: [eventId], effects: [], presentationsByEvent: new Map([[eventId, { settlement: dismantleSettlement, copy }]]),
    journeySeenEventIds: new Set(), presentedTransitionEventIds: new Set(),
  });
  assert.equal(selectedDismantle.owner?.kind, "dismantle-adapter");
  assert.equal(selectedDismantle.owner?.action.publicDiscardSettlement, copy);
  assert.equal(selectedDismantle.owner?.descriptor.visualTitle, "BURNING BRIDGE");
  assert.equal(selectedDismantle.nonDiscardAction, null,
    "Dismantle's root action is not passed as a competing second discard renderer");
  assert.equal(resolveCanonicalPublicDiscardPresentation({
    cursorEventId: eventId, heroActions: [], effectFrameSeeds: [], nonHeroAction: dismantleAction,
    timelineEventIds: [eventId], effects: [], presentationsByEvent: new Map([[eventId, { settlement: { ...dismantleSettlement, eventId: "other-event" }, copy }]]),
    journeySeenEventIds: new Set(), presentedTransitionEventIds: new Set(),
  }).owner, null, "mismatched normalized settlement cannot claim the Dismantle adapter");
});


test("discard proof and selected actions have one copy source, before cursor selection", () => {
  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const ownerSource = readFileSync(new URL("../app/public-discard-presentation-owner.ts", import.meta.url), "utf8");
  const proofBuilders = source.slice(source.indexOf("type VerifiedStauchnessCostFrameProof"), source.indexOf("type VerifiedKirinBowEffectFrameProof"));
  assert.doesNotMatch(proofBuilders, /h4Copy|publicH4Copy\(/);
  assert.doesNotMatch(source, /selectedPublicDiscardSettlement|canonicalDiscardFallbackAction|cursorActions:\s*\[stauchnessCostFrameAction/);
  assert.match(ownerSource, /function canonicalEffectFrameAction\(/);
  assert.doesNotMatch(ownerSource, /publicDiscardActionCandidate|canonicalPublicDiscardActionOwnerCandidate/);
  assert.doesNotMatch(source, /attachCanonicalPublicDiscardCopy|withCanonicalPublicDiscardCopy/);
  assert.match(source, /resolveCanonicalPublicDiscardPresentation\(/,
    "the pure shared resolver keeps discard ownership analysis outside the React Hook control-flow graph");
  assert.match(source, /const canonicalDiscardEffectFrameSeeds = \[[\s\S]*?stauchnessCostFrameSeed,[\s\S]*?rockCleavingAxeCostFrameSeed,[\s\S]*?kirinBowDamageFrameSeed \?\? kirinBowEffectFrameSeed,[\s\S]*?frostSwordEffectFrameSeed/,
    "Stauchness, Axe, Kirin and Frost enter the shared canonical seed/factory route");
  assert.doesNotMatch(source, /(?:prodigalHealer|divineWisdom|dauntless|betrothment|equilibrium|stauchness|rockCleavingAxe|kirinBow|frostSword|yinYangSwords)\w*FrameAction\s*:/,
    "individual discard skills no longer build independent Frame Actions");
  assert.match(ownerSource, /selectCanonicalPublicDiscardRenderOwner\(/,
    "the shared router selects one exact proof-bound render role before visual rendering");
  assert.match(ownerSource, /latestNonDiscardHeroAction/,
    "discard candidates are retired from the latest-Hero fallback");
  assert.match(source, /canonicalPublicDiscardPresentationByEvent\.get\(currentInteractionFact\.eventId\)\?\.copy/,
    "the current shared H4 receives canonical copy only for its exact committed discard event");
  assert.match(source, /const publicCardActionCursorSelection = selectPublicCardActionForCursor/);
  assert.match(ownerSource, /seed\.ownerNamesById\[effect\.activationOwnerId\]/,
    "shared frame construction uses the verified owner's public name, not its internal ID");
  assert.match(ownerSource, /isDismantleDiscard/,
    "Dismantle target discard ownership is routed independently from its real root CardFace");
});
