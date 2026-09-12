import assert from "node:assert/strict";
import test from "node:test";
import { getResponseOptions, registerResponseProvider, responseOptions, selectResponse } from "../game/responses.ts";
import { canonicalResponseAction, responseDecisionFor } from "../game/response-decision.ts";

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

test("new hero or equipment providers can be registered without editing response discovery", () => {
  const unregister = registerResponseProvider({
    id: "test_hero_black_dodge",
    satisfies: "dodge",
    getOption: (context) => context.hero === "test-hero"
      ? { provider: "test_hero_black_dodge", providerId: "test_hero_black_dodge", satisfies: "dodge", label: "Use Hero Skill", cards: [], selection: null }
      : null,
  });
  try {
    const options = getResponseOptions({ hand: [], equipment: [], hero: "test-hero" }, { kind: "dodge" });
    assert.ok(options.some((option) => option.providerId === "test_hero_black_dodge"));
  } finally {
    unregister();
  }
});

test("generic response submission is derived from a live requirement and provider", () => {
  const pending = { kind: "attack", sourceId: "p1", targetId: "p2", actorId: "p2", resumePhase: "play", reason: "Dodge", deadline: 0 };
  const decision = responseDecisionFor(pending, { hand: [card("Dodge", "dodge-1")], equipment: [card("EightTrigrams", "trigrams")], hero: null });
  assert.equal(decision?.requirement, "dodge");
  assert.deepEqual(decision?.options.map((option) => option.providerId), ["card", "eight_trigrams_dodge"]);
  assert.equal(canonicalResponseAction(pending, decision, "card"), "respond_dodge");
  assert.equal(canonicalResponseAction(pending, decision, "eight_trigrams_dodge"), "respond_eight_trigrams");
  assert.equal(canonicalResponseAction(pending, decision, "invented_provider"), null);
});
