import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePublicDiscardSettlements,
  publicDiscardSettlementCopy,
  publicDiscardSettlementForMaterials,
} from "../app/public-discard-settlement.ts";

const actorId = "player-1";
const ownerId = "player-2";
const face = (id, kind, rank = "K", suit = "♠") => ({ id, kind, rank, suit });
const hand = (ownerId) => ({ zone: "HAND", ownerId });
const equipment = (ownerId, slot) => ({ zone: "EQUIPMENT", ownerId, slot });
const discard = { zone: "DISCARD", ownerId: null };
const players = [{ id: actorId, name: "Player One" }, { id: ownerId, name: "Player Two" }];

function transition(eventId, rootEventId, cardId, from) {
  return { semantics: "PROVEN", visibility: "PUBLIC", eventId, sourceEventId: eventId, rootEventId, physicalCardId: cardId, from, to: discard };
}

function publicFact(eventId, changes, rootEventId = eventId, source = { kind: "other", label: "Discard" }) {
  return {
    semantics: "PROVEN", visibility: "PUBLIC", eventId, order: 8, rootEventId,
    identity: { interactionId: "interaction-1", rootFrameId: "frame-1", checkpointId: "checkpoint-1", presentationRevision: 1 },
    committedIdentity: { interactionId: "interaction-1", rootFrameId: "frame-1", checkpointId: "checkpoint-1", presentationRevision: 1 },
    frameId: "frame-1", category: "CARD_DISCARDED", actorId, affectedPlayerIds: [ownerId],
    committedOutcome: { source, changes },
  };
}

function normalize({ event, effects = [], dismantles = [], facts = [] }) {
  return normalizePublicDiscardSettlements({ timeline: event, publicCardEffects: effects, dismantleSettlements: dismantles, publicEventFacts: facts });
}

function effectEvent({ id = "effect-event", action = "discard", effectId = "xiahou_dun_ganglie", effectClass = "COST", materials, cards, source = { kind: "skill", label: "Stauchness", providerId: effectId }, activationOwnerId = actorId, rootEventId = "attack-root", resolutionId = "resolution-1", outcome = "SOURCE_DISCARDED_TWO" }) {
  const proof = {
    semantics: "PROVEN", effectId, effectClass, eventId: id, activationOwnerId,
    materials, source, rootEventId, rootResolutionId: resolutionId, targetId: ownerId, outcome,
    cards,
  };
  const rawProof = { ...proof };
  const root = { id: rootEventId, type: "card", action: "play", resolutionId, presentation: true, publicSequence: 1, card: face("attack-root-card", "Attack", "6", "♥"), actorId };
  const event = { id, type: cards.length === 1 ? "card" : "cards", action, resolutionId, actorId: activationOwnerId, presentation: true, publicSequence: 2,
    ...(cards.length === 1 ? { card: cards[0] } : { cards }), publicCardEffects: [rawProof] };
  return { event: [root, event], proof };
}

test("ordinary committed equipment replacement retains exact slot, source, order and owner copy", () => {
  const card = face("mount", "FerganaSteed");
  const event = {
    id: "replacement-event", type: "card", action: "discard", actorId,
    publicSequence: 8, resolutionId: "resolution-1", presentation: true, card,
    publicZoneTransition: transition("replacement-event", "equip-root", card.id, equipment(actorId, "offensiveHorse")),
    publicDiscardContext: { semantics: "PROVEN", eventId: "replacement-event", mode: "equipment-replacement", source: { kind: "equipment", label: "Equipment replacement" }, activationOwnerId: actorId, rootEventId: "equip-root" },
  };
  const root = { id: "equip-root", type: "card", action: "equip", resolutionId: "resolution-1", presentation: true, publicSequence: 7, card: face("new-weapon", "KirinBow") };
  const [settlement] = normalize({ event: [root, event] });
  assert.equal(settlement.presentation, "eligible");
  assert.equal(settlement.mode, "equipment-replacement");
  assert.equal(settlement.rootEventId, "equip-root");
  assert.equal(settlement.materials[0].fromSlot, "offensiveHorse");
  assert.equal(publicDiscardSettlementCopy({ settlement, players }).headline,
    "Player One lost 1 Equipment card during replacement: K♠ Fergana Steed.");
});

test("Dismantle proof normalizes the exact committed face while previously-read Judgement stays excluded", () => {
  const discarded = face("dismantled-card", "Attack", "2", "♣");
  const root = { id: "dismantle-root", type: "card", action: "play", resolutionId: "resolution-1", presentation: true, publicSequence: 1, card: face("dismantle", "Dismantle") };
  const proof = {
    semantics: "PROVEN", rootEventId: root.id, rootResolutionId: root.resolutionId, sourceId: actorId, targetId: ownerId,
    outcome: "DISMANTLE_RESOLVED", sourceZone: "hand", affectedCardOwnerId: ownerId, destinationZone: "discard", destinationOwnerId: null,
    affectedCardFace: discarded,
  };
  const event = { id: "dismantle-result", type: "card", action: "discard", finalResult: true, resolutionId: root.resolutionId,
    actorId: ownerId, publicSequence: 2, presentation: true, card: discarded, publicDismantleSettlement: proof };
  const [settlement] = normalize({ event: [root, event], dismantles: [{ ...proof, eventId: event.id }] });
  assert.equal(settlement.presentation, "eligible");
  assert.equal(settlement.mode, "direct");
  assert.equal(settlement.materials[0].ownerId, ownerId);
  assert.match(publicDiscardSettlementCopy({ settlement, players }).headline, /Player One used Burning Bridges to discard Player Two’s 2♣ Attack\./);

  const judgement = face("judgement-card", "Lightning", "A", "♠");
  const judgementProof = { ...proof, sourceZone: "judgement", affectedCardOwnerId: null, affectedCardFace: judgement };
  const judgementEvent = { ...event, id: "judgement-result", card: judgement, publicDismantleSettlement: judgementProof };
  const [excludedJudgement] = normalize({ event: [root, judgementEvent], dismantles: [{ ...judgementProof, eventId: judgementEvent.id }] });
  assert.equal(excludedJudgement.presentation, "excluded");
  assert.equal(excludedJudgement.exclusionReason, "previously-read-judgement");
});

test("COST recorded as play is a discard; already-presented follow-up Attack is excluded by typed effect class", () => {
  const costCard = face("axe-cost", "Dodge", "8", "♠");
  const costMaterials = [{ cardId: costCard.id, ownerId: actorId, fromZone: "HAND", toZone: "DISCARD" }];
  const cost = effectEvent({ id: "axe-cost-event", action: "play", effectId: "rock_cleaving_axe_attack_dodged", effectClass: "COST",
    materials: costMaterials, cards: [costCard], source: { kind: "equipment", label: "Rock Cleaving Axe", providerId: "rock_cleaving_axe_attack_dodged" },
    activationOwnerId: actorId, outcome: "FORCED_HIT" });
  const [axe] = normalize({ event: cost.event, effects: [cost.proof] });
  assert.equal(axe.presentation, "eligible");
  assert.equal(axe.mode, "cost");
  assert.equal(axe.source.label, "Rock Cleaving Axe");
  assert.match(publicDiscardSettlementCopy({ settlement: axe, players }).headline, /used Rock Cleaving Axe and discarded 1 card: 8♠ Dodge\./);

  const attack = face("follow-up-attack", "Attack", "Q", "♥");
  const effect = effectEvent({ id: "green-dragon-attack", action: "play", effectId: "green_dragon_blade_attack_dodged", effectClass: "EFFECT",
    materials: [{ cardId: attack.id, ownerId: actorId, fromZone: "HAND", toZone: "DISCARD" }], cards: [attack],
    source: { kind: "equipment", label: "Green Dragon Blade" }, outcome: "FOLLOW_UP_ATTACK_PLAYED" });
  const [excludedAttack] = normalize({ event: effect.event, effects: [effect.proof] });
  assert.equal(excludedAttack.presentation, "excluded");
  assert.equal(excludedAttack.exclusionReason, "already-presented-play");
});

test("Stauchness keeps its true activator separate from two exact discarded Hand cards", () => {
  const cards = [face("attack-card", "Attack", "8", "♠"), face("peach-card", "Peach", "Q", "♥")];
  const eventId = "stauchness-event";
  const proof = {
    semantics: "PROVEN", effectId: "xiahou_dun_ganglie", effectClass: "COST", eventId, activationOwnerId: actorId,
    materials: cards.map((card) => ({ cardId: card.id, ownerId: ownerId, fromZone: "HAND", toZone: "DISCARD" })),
    source: { kind: "skill", label: "Stauchness", providerId: "xiahou_dun_ganglie" }, rootEventId: "attack-root", rootResolutionId: "resolution-1",
    targetId: ownerId, outcome: "SOURCE_DISCARDED_TWO", cards,
  };
  const root = { id: "attack-root", type: "card", action: "play", resolutionId: "resolution-1", presentation: true, publicSequence: 1, card: face("root-attack", "Attack") };
  const event = { id: eventId, type: "cards", action: "discard", resolutionId: "resolution-1", actorId, presentation: true,
    publicSequence: 2, cards, publicCardEffects: [{ ...proof }], publicZoneTransitions: cards.map((card) => transition(eventId, root.id, card.id, hand(ownerId))) };
  const fact = publicFact(eventId, [{ kind: "CARD_DISCARDED", playerId: ownerId, amount: 2, fromZone: "HAND", toZone: "DISCARD" }], root.id,
    { kind: "skill", label: "Stauchness" });
  const [settlement] = normalize({ event: [root, event], effects: [proof], facts: [fact] });
  assert.equal(settlement.presentation, "eligible");
  assert.equal(settlement.mode, "forced");
  assert.equal(settlement.interactionId, fact.identity.interactionId);
  assert.equal(settlement.frameId, fact.identity.rootFrameId);
  assert.deepEqual(settlement.materials.map(({ card }) => card.id), cards.map(({ id }) => id));
  assert.match(publicDiscardSettlementCopy({ settlement, players }).headline,
    /Player One used Stauchness, causing Player Two to discard 2 cards: 8♠ Attack · Q♥ Peach\./);
});

test("renderer match requires the exact event and complete ordered physical material set", () => {
  const cards = [face("first", "Attack", "8", "♠"), face("second", "Peach", "Q", "♥")];
  const proof = {
    semantics: "PROVEN", effectId: "xiahou_dun_ganglie", effectClass: "COST", eventId: "stauchness-event", activationOwnerId: actorId,
    materials: cards.map((card) => ({ cardId: card.id, ownerId, fromZone: "HAND", toZone: "DISCARD" })),
    source: { kind: "skill", label: "Stauchness", providerId: "xiahou_dun_ganglie" }, rootEventId: "attack-root", rootResolutionId: "resolution-1",
    targetId: ownerId, outcome: "SOURCE_DISCARDED_TWO", cards,
  };
  const root = { id: "attack-root", type: "card", action: "play", resolutionId: "resolution-1", presentation: true, publicSequence: 1, card: face("root", "Attack") };
  const event = { id: "stauchness-event", type: "cards", action: "discard", resolutionId: "resolution-1", actorId, presentation: true,
    publicSequence: 2, cards, publicCardEffects: [{ ...proof }], publicZoneTransitions: cards.map((card) => transition("stauchness-event", root.id, card.id, hand(ownerId))) };
  const [settlement] = normalize({ event: [root, event], effects: [proof] });
  assert.equal(publicDiscardSettlementForMaterials({ settlements: [settlement], eventId: event.id, physicalCardIds: ["first", "second"] }), settlement);
  assert.equal(publicDiscardSettlementForMaterials({ settlements: [settlement], eventId: event.id, physicalCardIds: ["second", "first"] }), null);
  assert.equal(publicDiscardSettlementForMaterials({ settlements: [settlement], eventId: event.id, physicalCardIds: ["first"] }), null);
  assert.equal(publicDiscardSettlementForMaterials({ settlements: [settlement], eventId: "other-event", physicalCardIds: ["first", "second"] }), null);
});

test("canonical discard copy appends other committed changes without repeating the discard count", () => {
  const cards = [face("paid-peach", "Peach", "7", "♥"), face("paid-dodge", "Dodge", "7", "♣")];
  const { event, proof } = effectEvent({ id: "stauchness-event", materials: cards.map((card) => ({ cardId: card.id, ownerId, fromZone: "HAND", toZone: "DISCARD" })), cards });
  const fact = publicFact("stauchness-event", [
    { kind: "CARD_DISCARDED", playerId: ownerId, amount: 2, fromZone: "HAND", toZone: "DISCARD" },
    { kind: "HP_RECOVERED", playerId: actorId, amount: 1 },
  ], "attack-root", { kind: "skill", label: "Stauchness" });
  const [settlement] = normalize({ event, effects: [proof], facts: [fact] });
  const copy = publicDiscardSettlementCopy({ settlement, players, committedOutcome: {
    semantics: "PROVEN", visibility: "PUBLIC", eventId: settlement.eventId,
    identity: { interactionId: "interaction-1", rootFrameId: "frame-1", checkpointId: "checkpoint-1", presentationRevision: 1 },
    order: settlement.order, rootEventId: settlement.rootEventId, frameId: "frame-1", category: "CARD_DISCARDED",
    source: { kind: "skill", label: "Stauchness" }, actorId, affectedPlayerIds: [ownerId],
    changes: [
      { kind: "CARD_DISCARDED", playerId: ownerId, amount: 2, fromZone: "HAND", toZone: "DISCARD" },
      { kind: "HP_RECOVERED", playerId: actorId, amount: 1 },
    ],
  } });
  assert.equal(copy.headline, "Player One used Stauchness, causing Player Two to discard 2 cards: 7♥ Peach · 7♣ Dodge. Player One recovered 1 HP.");
  assert.equal(copy.segments.map((segment) => segment.text).join(""), copy.headline);
});

test("Kirin Bow retains the actual Mount identity, owner, slot and discard outcome independently of Attack damage", () => {
  const mount = face("real-mount", "FerganaSteed", "K", "♠");
  const eventId = "kirin-discard";
  const proof = {
    semantics: "PROVEN", effectId: "kirin_bow_damage_about_to_apply", effectClass: "EFFECT", eventId,
    activationOwnerId: actorId, materials: [{ cardId: mount.id, ownerId: ownerId, fromZone: "EQUIPMENT", toZone: "DISCARD" }],
    source: { kind: "equipment", label: "Kirin Bow", providerId: "kirin_bow_damage_about_to_apply" },
    rootEventId: "attack-root", rootResolutionId: "resolution-1", targetId: ownerId, outcome: "MOUNT_DISCARDED_DAMAGE_CONTINUES", cards: [mount],
  };
  const root = { id: "attack-root", type: "card", action: "play", resolutionId: "resolution-1", presentation: true, publicSequence: 1, card: face("attack", "Attack") };
  const event = { id: eventId, type: "card", action: "discard", resolutionId: "resolution-1", actorId, presentation: true, publicSequence: 2,
    card: mount, publicCardEffects: [{ ...proof }], publicZoneTransitions: [transition(eventId, root.id, mount.id, equipment(ownerId, "offensiveHorse"))] };
  const fact = publicFact(eventId, [{ kind: "CARD_DISCARDED", playerId: ownerId, amount: 1, fromZone: "EQUIPMENT", toZone: "DISCARD" }], root.id,
    { kind: "equipment", label: "Kirin Bow" });
  const [settlement] = normalize({ event: [root, event], effects: [proof], facts: [fact] });
  assert.equal(settlement.presentation, "eligible");
  assert.equal(settlement.materials[0].card.id, "real-mount");
  assert.equal(settlement.materials[0].ownerId, ownerId);
  assert.equal(settlement.materials[0].fromSlot, "offensiveHorse");
  assert.match(publicDiscardSettlementCopy({ settlement, players }).headline,
    /Player One used Kirin Bow to discard Player Two’s K♠ Fergana Steed\./);
  assert.deepEqual(settlement.materials[0].card, mount);
});

test("Dauntless COST and target Equipment EFFECT normalize as separate truthful discard stages", () => {
  const costCard = face("dauntless-cost", "Dodge", "4", "♦");
  const cost = effectEvent({ id: "dauntless-cost-event", action: "discard", effectId: "yue_jin_dauntless", effectClass: "COST",
    materials: [{ cardId: costCard.id, ownerId: actorId, fromZone: "HAND", toZone: "DISCARD" }], cards: [costCard],
    source: { kind: "skill", label: "Dauntless", providerId: "yue_jin_dauntless" }, activationOwnerId: actorId, outcome: "ACTIVATION_COST" });
  const [costSettlement] = normalize({ event: cost.event, effects: [cost.proof] });
  assert.equal(costSettlement.presentation, "eligible");
  assert.equal(costSettlement.mode, "cost");
  assert.match(publicDiscardSettlementCopy({ settlement: costSettlement, players }).headline,
    /Player One used Dauntless and discarded 1 card: 4♦ Dodge\./);

  const equipmentCard = face("dauntless-target-equipment", "FerganaSteed", "K", "♠");
  const targetDiscard = effectEvent({ id: "dauntless-effect-event", action: "discard", effectId: "yue_jin_dauntless", effectClass: "EFFECT",
    materials: [{ cardId: equipmentCard.id, ownerId, fromZone: "EQUIPMENT", toZone: "DISCARD" }], cards: [equipmentCard],
    source: { kind: "skill", label: "Dauntless", providerId: "yue_jin_dauntless" }, activationOwnerId: actorId,
    outcome: "DAMAGE_PREVENTED" });
  const [effectSettlement] = normalize({ event: targetDiscard.event, effects: [targetDiscard.proof] });
  assert.equal(effectSettlement.presentation, "eligible");
  assert.equal(effectSettlement.mode, "effect");
  assert.match(publicDiscardSettlementCopy({ settlement: effectSettlement, players }).headline,
    /Player One used Dauntless to discard Player Two’s K♠ Fergana Steed\./);
});

test("conversion and Judgement effects never create a second discard reveal", () => {
  const converted = face("serpent-material", "Dodge", "J", "♣");
  const conversion = effectEvent({ id: "conversion-event", action: "play", effectId: "serpent_spear_attack", effectClass: "CONVERSION",
    materials: [{ cardId: converted.id, ownerId: actorId, fromZone: "HAND", toZone: "DISCARD" }], cards: [converted],
    source: { kind: "equipment", label: "Serpent Spear" }, outcome: "AS_ATTACK" });
  const [excludedConversion] = normalize({ event: conversion.event, effects: [conversion.proof] });
  assert.equal(excludedConversion.presentation, "excluded");
  assert.equal(excludedConversion.exclusionReason, "conversion");

  const judgement = effectEvent({ id: "judgement-event", action: "reveal", effectId: "sima_yi_guicai", effectClass: "JUDGEMENT",
    materials: [{ cardId: converted.id, ownerId: actorId, fromZone: "HAND", toZone: "DISCARD" }], cards: [converted],
    source: { kind: "skill", label: "Necromancy" }, outcome: "REPLACED_JUDGEMENT" });
  const [excludedJudgement] = normalize({ event: judgement.event, effects: [judgement.proof] });
  assert.equal(excludedJudgement.presentation, "excluded");
  assert.equal(excludedJudgement.exclusionReason, "judgement");
});

test("private, duplicate, mismatched-source, wrong-root and ambiguous-order proofs fail closed", () => {
  const card = face("public-card", "Attack", "3", "♦");
  const base = {
    id: "direct-discard", type: "card", action: "discard", actorId: ownerId, publicSequence: 7, resolutionId: "r1", presentation: true,
    card, publicZoneTransitions: [transition("direct-discard", "direct-discard", card.id, hand(ownerId))],
  };
  assert.equal(normalize({ event: [{ ...base, privateToPlayerId: ownerId }] }).length, 0);
  assert.equal(normalize({ event: [base, { ...base }] }).length, 0);
  const wrongSource = { ...base, publicZoneTransitions: [transition(base.id, base.id, card.id, equipment(ownerId, "weapon"))] };
  assert.equal(normalize({ event: [wrongSource], facts: [publicFact(base.id, [
    { kind: "CARD_DISCARDED", playerId: ownerId, amount: 1, fromZone: "HAND", toZone: "DISCARD" },
  ])] }).length, 0, "the committed zone count must match the physical transition source");
  assert.equal(normalize({ event: [{ ...base, publicZoneTransitions: [transition(base.id, "missing-root", card.id, hand(ownerId))] }] }).length, 0);
  assert.equal(normalize({ event: [base, { ...base, id: "second-event", publicSequence: base.publicSequence }] }).length, 0);
  assert.equal(normalize({ event: [{ ...base, publicDiscardContext: { semantics: "PROVEN", eventId: base.id, mode: "self", source: { kind: "phase", label: "Discard phase" }, activationOwnerId: actorId } }] }).length, 0,
    "an ordinary self-discard context cannot relabel another player's physical discard");
});

test("a mismatched specialised proof falls back to the independently proven public zone transition", () => {
  const equipmentCard = face("discarded-equipment", "FerganaSteed", "K", "♠");
  const eventId = "equipment-discard-with-stale-effect";
  const effect = {
    semantics: "PROVEN", effectId: "yue_jin_dauntless", effectClass: "COST", eventId,
    activationOwnerId: ownerId,
    materials: [{ cardId: equipmentCard.id, ownerId, fromZone: "HAND", toZone: "DISCARD" }],
    source: { kind: "skill", label: "Dauntless", providerId: "yue_jin_dauntless" },
    targetId: ownerId, outcome: "ACTIVATION_COST", cards: [equipmentCard],
  };
  const effectEvent = {
    id: eventId, type: "card", action: "discard", actorId: ownerId, resolutionId: "resolution-1",
    publicSequence: 1, presentation: true, card: equipmentCard, publicCardEffects: [effect],
    publicZoneTransitions: [transition(eventId, eventId, equipmentCard.id, equipment(ownerId, "weapon"))],
  };
  const dismantledCard = face("discarded-hand-card", "Peach", "Q", "♥");
  const dismantleId = "discard-with-unusable-dismantle-proof";
  const dismantle = {
    semantics: "PROVEN", eventId: dismantleId, rootEventId: dismantleId, rootResolutionId: "resolution-2",
    sourceId: actorId, targetId: ownerId, outcome: "DISMANTLE_RESOLVED", sourceZone: "unknown",
    affectedCardOwnerId: ownerId, destinationZone: "discard", destinationOwnerId: null,
    affectedCardFace: dismantledCard,
  };
  const dismantleEvent = {
    id: dismantleId, type: "card", action: "discard", finalResult: true, actorId: ownerId,
    resolutionId: "resolution-2", publicSequence: 2, presentation: true, card: dismantledCard,
    publicDismantleSettlement: dismantle,
    publicZoneTransition: transition(dismantleId, dismantleId, dismantledCard.id, hand(ownerId)),
  };

  const settlements = normalize({ event: [effectEvent, dismantleEvent], effects: [effect], dismantles: [dismantle] });
  assert.equal(settlements.length, 2);
  assert.deepEqual(settlements.map((settlement) => settlement.presentation), ["eligible", "eligible"]);
  assert.deepEqual(settlements.map((settlement) => settlement.materials[0].physicalCardId), [equipmentCard.id, dismantledCard.id]);
  assert.equal(publicDiscardSettlementCopy({ settlement: settlements[0], players }).headline,
    "Player Two discarded 1 card: K♠ Fergana Steed.");
  assert.equal(publicDiscardSettlementCopy({ settlement: settlements[1], players }).headline,
    "Player Two discarded 1 card: Q♥ Peach.");
});

test("malformed optional discard context degrades to truthful anonymous copy and retains each material owner", () => {
  const cards = [face("same-print-one", "Attack", "7", "♠"), face("same-print-two", "Attack", "7", "♠")];
  const eventId = "multi-owner-discard";
  const event = {
    id: eventId, type: "cards", action: "discard", actorId, publicSequence: 12, presentation: true, cards,
    publicDiscardContext: { semantics: "UNPROVEN", eventId, mode: "self", source: { kind: "phase", label: "Discard phase" } },
    publicZoneTransitions: cards.map((card, index) => transition(eventId, eventId, card.id, hand(index === 0 ? actorId : ownerId))),
  };
  const [settlement] = normalize({ event: [event] });
  assert.equal(settlement.presentation, "eligible");
  assert.deepEqual(settlement.materials.map((material) => material.ownerId), [actorId, ownerId]);
  assert.deepEqual(settlement.materials.map((material) => material.physicalCardId), cards.map((card) => card.id));
  assert.equal(publicDiscardSettlementCopy({ settlement, players }).headline,
    "Publicly discarded 2 cards: 7♠ Attack · 7♠ Attack.");
});

test("source identity and actual committed discard counts must agree before formatting", () => {
  const card = face("discarded", "Attack", "5", "♥");
  const event = { id: "fact-discard", type: "card", action: "discard", actorId: ownerId, publicSequence: 3,
    presentation: true, card, publicZoneTransitions: [transition("fact-discard", "fact-discard", card.id, hand(ownerId))] };
  const mismatch = publicFact(event.id, [{ kind: "CARD_DISCARDED", playerId: actorId, amount: 1, fromZone: "HAND", toZone: "DISCARD" }]);
  assert.equal(normalize({ event: [event], facts: [mismatch] }).length, 0);

  const duplicateFact = publicFact(event.id, [{ kind: "CARD_DISCARDED", playerId: ownerId, amount: 2, fromZone: "HAND", toZone: "DISCARD" }]);
  assert.equal(normalize({ event: [event], facts: [duplicateFact] }).length, 0);
});

test("unknown card identity remains count-only and multiple material owners never get guessed", () => {
  const unknown = { id: "unknown-card", kind: "Attack" };
  const event = { id: "unknown-face", type: "card", action: "discard", actorId: ownerId, publicSequence: 3, presentation: true,
    card: unknown, publicZoneTransitions: [transition("unknown-face", "unknown-face", unknown.id, hand(ownerId))] };
  const [settlement] = normalize({ event: [event] });
  assert.ok(settlement);
  const countOnly = publicDiscardSettlementCopy({ settlement, players });
  assert.equal(countOnly.cards, null);
  assert.equal(countOnly.headline, "Player Two discarded 1 card.");

  const cards = [face("one", "Attack", "2", "♥"), face("two", "Peach", "3", "♣")];
  const proof = {
    semantics: "PROVEN", effectId: "xiahou_dun_ganglie", effectClass: "COST", eventId: "mixed-owner-event", activationOwnerId: actorId,
    materials: cards.map((card, index) => ({ cardId: card.id, ownerId: index ? ownerId : actorId, fromZone: "HAND", toZone: "DISCARD" })),
    source: { kind: "skill", label: "Stauchness" }, cards,
  };
  const raw = { ...proof };
  const mixed = { id: proof.eventId, type: "cards", action: "discard", actorId, publicSequence: 4, presentation: true, cards,
    publicCardEffects: [raw] };
  const [multiOwner] = normalize({ event: [mixed], effects: [proof] });
  assert.equal(multiOwner.presentation, "eligible");
  assert.equal(publicDiscardSettlementCopy({ settlement: multiOwner, players }).headline,
    "Publicly discarded 2 cards: 2♥ Attack · 3♣ Peach.");
});

test("large voluntary discards preserve every distinct physical ID and avoid guessing an unproven actor", () => {
  const cards = [
    face("same-printed-card-1", "Attack", "7", "♠"), face("same-printed-card-2", "Attack", "7", "♠"),
    face("discard-3", "Dodge", "2", "♣"), face("discard-4", "Peach", "Q", "♥"),
    face("discard-5", "Dismantle", "A", "♦"), face("discard-6", "FrostSword", "5", "♠"),
    face("discard-7", "Lightning", "K", "♣"),
  ];
  const eventId = "seven-card-discard";
  const event = { id: eventId, type: "cards", action: "discard", actorId: ownerId, publicSequence: 11, presentation: true,
    cards, publicDiscardContext: { semantics: "PROVEN", eventId, mode: "self", source: { kind: "phase", label: "Discard phase" }, activationOwnerId: ownerId },
    publicZoneTransitions: cards.map((card) => transition(eventId, eventId, card.id, hand(ownerId))) };
  const [settlement] = normalize({ event: [event] });
  assert.equal(settlement.presentation, "eligible");
  assert.deepEqual(settlement.materials.map((material) => material.physicalCardId), cards.map((card) => card.id));
  assert.equal(publicDiscardSettlementCopy({ settlement, players }).cards.length, 7);

  const missingActor = effectEvent({ id: "unresolved-actor-discard", action: "discard", effectId: "xiahou_dun_ganglie", effectClass: "COST",
    materials: [{ cardId: cards[0].id, ownerId, fromZone: "HAND", toZone: "DISCARD" }], cards: [cards[0]],
    source: { kind: "skill", label: "Unresolved skill" }, activationOwnerId: "not-in-public-player-list", outcome: "COMMITTED" });
  const [unresolved] = normalize({ event: missingActor.event, effects: [missingActor.proof] });
  assert.equal(publicDiscardSettlementCopy({ settlement: unresolved, players }).headline,
    "Publicly discarded 1 card from Player Two: 7♠ Attack.");
});
