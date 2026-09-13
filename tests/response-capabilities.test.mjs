import assert from "node:assert/strict";
import test from "node:test";
import { getResponseOptions, registerResponseProvider, responseOptions, selectResponse } from "../game/responses.ts";
import { resolveResponseDecision, responseDecisionFor } from "../game/response-decision.ts";
import { resolvePassiveAttackModifiers } from "../game/capabilities/passive.ts";
import { getTriggeredEffects, registerTriggeredEffect, resolveTriggeredEffect } from "../game/capabilities/triggers.ts";
import { continueTriggerEvent } from "../game/decisions/triggers.ts";

const card = (kind, id) => ({ kind, id, suit: "♠", rank: "A" });

test("capability discovery exposes semantic Dodge and Attack providers", () => {
  const dodge = getResponseOptions({ hand: [card("Dodge", "dodge-1")], equipment: [card("EightTrigrams", "trigrams")], hero: null }, { kind: "dodge", sourceId: "p1", targetId: "p2" });
  assert.deepEqual(dodge.map((option) => option.providerId), ["card", "eight_trigrams_dodge"]);
  assert.equal(dodge[0].selection?.type, "cards");
  assert.equal(dodge[1].selection, null);

  const attack = getResponseOptions({ hand: [card("Peach", "peach-1"), card("Dodge", "dodge-2")], equipment: [card("SerpentSpear", "spear")], hero: null }, { kind: "attack", context: "barbarian_invasion" });
  assert.deepEqual(attack.map((option) => option.providerId), ["serpent_spear_attack"]);
  assert.deepEqual(attack[0].selection?.eligibleCardIds, ["peach-1", "dodge-2"]);
});

test("legacy response helpers remain compatible while using semantic providers", () => {
  const context = { hand: [card("Dodge", "dodge-1"), card("Dodge", "dodge-2")], equipment: [], hero: null };
  assert.equal(responseOptions(context, "Dodge").length, 2);
  assert.equal(selectResponse(context, "Dodge", "dodge-2", undefined)?.cards[0].id, "dodge-2");
});

test("new hero providers can discover and execute without editing core response code", () => {
  const unregister = registerResponseProvider({
    id: "test_hero_black_dodge",
    satisfies: "dodge",
    activation: "explicit",
    getOption: (context) => context.hero === "test-hero"
      ? { provider: "test_hero_black_dodge", providerId: "test_hero_black_dodge", satisfies: "dodge", label: "Use Hero Skill", cards: [], selection: null }
      : null,
    resolve: () => ({ status: "satisfied", providerId: "test_hero_black_dodge", satisfies: "dodge", resolution: "cards" }),
  });
  try {
    const options = getResponseOptions({ hand: [], equipment: [], hero: "test-hero" }, { kind: "dodge" });
    assert.deepEqual(options.find((option) => option.providerId === "test_hero_black_dodge")?.activation, "explicit");
    const pending = { kind: "attack", sourceId: "p1", targetId: "p2", actorId: "p2", resumePhase: "play", reason: "Dodge", deadline: 0 };
    assert.deepEqual(resolveResponseDecision(pending, { hand: [], equipment: [], hero: "test-hero" }, "test_hero_black_dodge", {}), { status: "satisfied", providerId: "test_hero_black_dodge", satisfies: "dodge", resolution: "cards" });
  } finally {
    unregister();
  }
});

test("generic response submission is derived from a live requirement and provider", () => {
  const pending = { kind: "attack", sourceId: "p1", targetId: "p2", actorId: "p2", resumePhase: "play", reason: "Dodge", deadline: 0 };
  const decision = responseDecisionFor(pending, { hand: [card("Dodge", "dodge-1")], equipment: [card("EightTrigrams", "trigrams")], hero: null });
  assert.equal(decision?.requirement, "dodge");
  assert.deepEqual(decision?.options.map((option) => option.providerId), ["card", "eight_trigrams_dodge"]);
  assert.deepEqual(resolveResponseDecision(pending, { hand: [card("Dodge", "dodge-1")], equipment: [card("EightTrigrams", "trigrams")], hero: null }, "card", { cardId: "dodge-1" }), { status: "satisfied", providerId: "card", satisfies: "dodge", consumeCardIds: ["dodge-1"], resolution: "cards" });
  const judgement = resolveResponseDecision(pending, { hand: [card("Dodge", "dodge-1")], equipment: [card("EightTrigrams", "trigrams")], hero: null }, "eight_trigrams_dodge", {});
  assert.equal(judgement?.status, "requires_resolution");
  assert.equal(judgement?.resolution.kind, "judgement");
  assert.equal(judgement?.resolution.succeeds(card("Peach", "red")), false);
  assert.equal(judgement?.resolution.succeeds({ ...card("Peach", "red"), suit: "♥" }), true);
  assert.equal(resolveResponseDecision(pending, { hand: [card("Dodge", "dodge-1")], equipment: [card("EightTrigrams", "trigrams")], hero: null }, "invented_provider", {}), null);
});

test("response discovery rejects more than one implicit provider", () => {
  const unregister = registerResponseProvider({
    id: "test_second_implicit_dodge",
    satisfies: "dodge",
    activation: "implicit",
    getOption: () => ({ provider: "test_second_implicit_dodge", providerId: "test_second_implicit_dodge", satisfies: "dodge", label: "Second default", cards: [], selection: null }),
    resolve: () => ({ status: "satisfied", providerId: "test_second_implicit_dodge", satisfies: "dodge", resolution: "cards" }),
  });
  try {
    assert.throws(() => getResponseOptions({ hand: [card("Dodge", "dodge-1")], equipment: [], hero: null }, { kind: "dodge" }), /more than one implicit provider/);
  } finally {
    unregister();
  }
});

test("Zhen Ji's black-card Dodge is a provider with a semantic card cost", () => {
  const blackPeach = { ...card("Peach", "black-peach"), suit: "♠" };
  const options = getResponseOptions({ hand: [blackPeach], equipment: [], hero: "zhen-ji" }, { kind: "dodge" });
  assert.deepEqual(options.map((option) => option.providerId), ["zhen_ji_black_card_dodge"]);
  assert.deepEqual(resolveResponseDecision({ kind: "attack", sourceId: "p1", targetId: "p2", actorId: "p2", resumePhase: "play", reason: "Dodge" }, { hand: [blackPeach], equipment: [], hero: "zhen-ji" }, "zhen_ji_black_card_dodge", { cardId: blackPeach.id }), { status: "satisfied", providerId: "zhen_ji_black_card_dodge", satisfies: "dodge", consumeCardIds: [blackPeach.id], resolution: "cards" });
});

test("passive and triggered equipment capabilities are discovered outside the route", () => {
  assert.deepEqual(resolvePassiveAttackModifiers({ targetEquipment: [card("NioShield", "shield")], attack: { ...card("Attack", "black-attack"), suit: "♠" } }), { prevented: true, reason: "Nio Shield" });
  assert.equal(resolvePassiveAttackModifiers({ targetEquipment: [card("NioShield", "shield")], attack: { ...card("Attack", "red-attack"), suit: "♥" } }), null);
  const sourceHand = [card("Attack", "follow-up")];
  assert.deepEqual(getTriggeredEffects({ event: "attack_dodged", sourceEquipment: [card("GreenDragonBlade", "dragon")], sourceHand }), [{ effectId: "green_dragon_blade_attack_dodged", label: "Use Green Dragon Blade", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["follow-up"] } }]);
  assert.deepEqual(resolveTriggeredEffect("green_dragon_blade_attack_dodged", { event: "attack_dodged", sourceEquipment: [card("GreenDragonBlade", "dragon")], sourceHand }, { cardId: "follow-up" }), { status: "resolved", effectId: "green_dragon_blade_attack_dodged", outcome: "follow_up_attack", consumeCardIds: ["follow-up"] });

  const axeCards = [card("Peach", "axe-one"), card("RockCleavingAxe", "axe")];
  assert.deepEqual(getTriggeredEffects({ event: "attack_dodged", sourceEquipment: [axeCards[1]], sourceCards: axeCards }), [{ effectId: "rock_cleaving_axe_attack_dodged", label: "Use Rock Cleaving Axe", selection: { type: "cards", min: 2, max: 2, eligibleCardIds: ["axe-one", "axe"] } }]);
  assert.deepEqual(resolveTriggeredEffect("rock_cleaving_axe_attack_dodged", { event: "attack_dodged", sourceEquipment: [axeCards[1]], sourceCards: axeCards }, { cardIds: ["axe-one", "axe"] }), { status: "resolved", effectId: "rock_cleaving_axe_attack_dodged", outcome: "force_damage", consumeCardIds: ["axe-one", "axe"] });

  const targetHand = [card("Peach", "frost-hand")];
  const targetEquipment = [card("NioShield", "frost-armor")];
  const frostContext = { event: "damage_about_to_apply", sourceEquipment: [card("FrostSword", "frost")], targetHand, targetEquipment };
  assert.deepEqual(getTriggeredEffects(frostContext), [{ effectId: "frost_sword_damage_about_to_apply", label: "Use Frost Sword", selection: { type: "target_cards", min: 1, max: 2, eligibleCardIds: ["hand:0", "frost-armor"] } }]);
  assert.deepEqual(resolveTriggeredEffect("frost_sword_damage_about_to_apply", frostContext, { cardKeys: ["hand:0", "frost-armor"] }), { status: "resolved", effectId: "frost_sword_damage_about_to_apply", outcome: "prevent_damage", targetCardIds: ["frost-hand", "frost-armor"] });
});

test("multiple event triggers are projected without route-level provider selection", () => {
  const unregisterFirst = registerTriggeredEffect({
    id: "test_first_dodged_trigger",
    event: "attack_dodged",
    getOption: () => ({ effectId: "test_first_dodged_trigger", label: "First test reaction", selection: null }),
    resolve: () => ({ status: "resolved", effectId: "test_first_dodged_trigger", outcome: "continue_event" }),
  });
  const unregisterSecond = registerTriggeredEffect({
    id: "test_second_dodged_trigger",
    event: "attack_dodged",
    getOption: () => ({ effectId: "test_second_dodged_trigger", label: "Second test reaction", selection: null }),
    resolve: () => ({ status: "resolved", effectId: "test_second_dodged_trigger", outcome: "continue_event" }),
  });
  try {
    const context = { event: "attack_dodged", sourceEquipment: [], sourceHand: [] };
    assert.deepEqual(getTriggeredEffects(context).slice(-2).map((option) => option.effectId), ["test_first_dodged_trigger", "test_second_dodged_trigger"]);
    assert.deepEqual(resolveTriggeredEffect("test_second_dodged_trigger", context, {}), { status: "resolved", effectId: "test_second_dodged_trigger", outcome: "continue_event" });
    assert.ok(!getTriggeredEffects(context, ["test_first_dodged_trigger"]).some((option) => option.effectId === "test_first_dodged_trigger"));
  } finally {
    unregisterSecond();
    unregisterFirst();
  }
});

test("a non-terminal trigger outcome reopens the event without naming its provider", () => {
  const pending = {
    kind: "trigger",
    actorId: "source",
    event: "attack_dodged",
    reason: "Optional reactions",
    continuation: { kind: "green_dragon", sourceId: "source", targetId: "target", actorId: "source", resumePhase: "play", sequenceStartCardId: "attack", reason: "legacy continuation" },
  };
  assert.deepEqual(continueTriggerEvent(pending, { status: "resolved", effectId: "test_reaction", outcome: "continue_event" }, 42)?.resolvedEffectIds, ["test_reaction"]);
  assert.equal(continueTriggerEvent(pending, { status: "resolved", effectId: "terminal", outcome: "force_damage" }), null);
});
