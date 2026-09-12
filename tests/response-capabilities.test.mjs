import assert from "node:assert/strict";
import test from "node:test";
import { getResponseOptions, registerResponseProvider, responseOptions, selectResponse } from "../game/responses.ts";
import { resolveResponseDecision, responseDecisionFor } from "../game/response-decision.ts";
import { resolvePassiveAttackModifiers } from "../game/capabilities/passive.ts";
import { getTriggeredEffects } from "../game/capabilities/triggers.ts";

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
    getOption: (context) => context.hero === "test-hero"
      ? { provider: "test_hero_black_dodge", providerId: "test_hero_black_dodge", satisfies: "dodge", label: "Use Hero Skill", cards: [], selection: null }
      : null,
    resolve: (context) => context.pendingKind === "attack" ? { action: "respond_dodge" } : null,
  });
  try {
    const options = getResponseOptions({ hand: [], equipment: [], hero: "test-hero" }, { kind: "dodge" });
    assert.ok(options.some((option) => option.providerId === "test_hero_black_dodge"));
    const pending = { kind: "attack", sourceId: "p1", targetId: "p2", actorId: "p2", resumePhase: "play", reason: "Dodge", deadline: 0 };
    assert.deepEqual(resolveResponseDecision(pending, { hand: [], equipment: [], hero: "test-hero" }, "test_hero_black_dodge", {}), { action: "respond_dodge" });
  } finally {
    unregister();
  }
});

test("generic response submission is derived from a live requirement and provider", () => {
  const pending = { kind: "attack", sourceId: "p1", targetId: "p2", actorId: "p2", resumePhase: "play", reason: "Dodge", deadline: 0 };
  const decision = responseDecisionFor(pending, { hand: [card("Dodge", "dodge-1")], equipment: [card("EightTrigrams", "trigrams")], hero: null });
  assert.equal(decision?.requirement, "dodge");
  assert.deepEqual(decision?.options.map((option) => option.providerId), ["card", "eight_trigrams_dodge"]);
  assert.deepEqual(resolveResponseDecision(pending, { hand: [card("Dodge", "dodge-1")], equipment: [card("EightTrigrams", "trigrams")], hero: null }, "card", { cardId: "dodge-1" }), { action: "respond_dodge" });
  assert.deepEqual(resolveResponseDecision(pending, { hand: [card("Dodge", "dodge-1")], equipment: [card("EightTrigrams", "trigrams")], hero: null }, "eight_trigrams_dodge", {}), { action: "respond_eight_trigrams" });
  assert.equal(resolveResponseDecision(pending, { hand: [card("Dodge", "dodge-1")], equipment: [card("EightTrigrams", "trigrams")], hero: null }, "invented_provider", {}), null);
});

test("passive and triggered equipment capabilities are discovered outside the route", () => {
  assert.deepEqual(resolvePassiveAttackModifiers({ targetEquipment: [card("NioShield", "shield")], attack: { ...card("Attack", "black-attack"), suit: "♠" } }), { prevented: true, reason: "Nio Shield" });
  assert.equal(resolvePassiveAttackModifiers({ targetEquipment: [card("NioShield", "shield")], attack: { ...card("Attack", "red-attack"), suit: "♥" } }), null);
  assert.deepEqual(getTriggeredEffects({ event: "attack_dodged", sourceEquipment: [card("GreenDragonBlade", "dragon")] }), [{ effectId: "green_dragon_blade_attack_dodged", label: "Use Green Dragon Blade" }]);
});
