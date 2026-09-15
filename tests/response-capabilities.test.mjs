import assert from "node:assert/strict";
import test from "node:test";
import { getResponseOptions, registerResponseProvider, responseOptions, selectResponse } from "../game/responses.ts";
import { resolveResponseDecision, responseDecisionFor } from "../game/response-decision.ts";
import { applySuccessfulNegation } from "../game/decisions/negation.ts";
import { resolvePassiveAttackModifiers } from "../game/capabilities/passive.ts";
import { getTriggeredEffects, registerTriggeredEffect, resolveTriggeredEffect } from "../game/capabilities/triggers.ts";
import { continueTriggerEvent, chooseBotTrigger, createTriggerDecision, resumeTriggerContinuation } from "../game/decisions/triggers.ts";
import { applyResponseSatisfied, applyResponseDeclined, resolveResponseJudgement } from "../game/decisions/responses.ts";
import { normalizeLegacyResponseAction } from "../game/compat/legacy-actions.ts";
import { readFile } from "node:fs/promises";
import { registerTestSemanticCapabilities, testSemanticResponseProviders, testSemanticTriggers } from "../game/capabilities/test-fixtures.ts";

const card = (kind, id) => ({ kind, id, suit: "♠", rank: "A" });

test("production registries exclude synthetic semantic capabilities", () => {
  const responseOptions = getResponseOptions({ hand: [], equipment: [], hero: "test-hero" }, { kind: "attack" });
  const triggerOptions = getTriggeredEffects({ event: "attack_dodged", sourceEquipment: [card("Test", "test-trigger-a")] });
  assert.deepEqual(responseOptions, []);
  assert.deepEqual(triggerOptions, []);
  assert.equal(testSemanticResponseProviders.length, 3);
  assert.equal(testSemanticTriggers.length, 4);
});

test("isolated capability setup registers and cleans up synthetic providers", () => {
  const unregister = registerTestSemanticCapabilities();
  try {
    assert.deepEqual(getResponseOptions({ hand: [], equipment: [], hero: "test-hero" }, { kind: "attack" }).map((option) => option.providerId), ["test_semantic_attack"]);
    assert.deepEqual(getTriggeredEffects({ event: "attack_dodged", sourceEquipment: [card("Test", "test-trigger-a")] }).map((option) => option.effectId), ["test_attack_dodged_a"]);
  } finally {
    unregister();
  }
  assert.deepEqual(getResponseOptions({ hand: [], equipment: [], hero: "test-hero" }, { kind: "attack" }), []);
  assert.deepEqual(getTriggeredEffects({ event: "attack_dodged", sourceEquipment: [card("Test", "test-trigger-a")] }), []);
});

test("capability discovery exposes semantic Dodge and Attack providers", () => {
  const dodge = getResponseOptions({ hand: [card("Dodge", "dodge-1")], equipment: [card("EightTrigrams", "trigrams")], hero: null }, { kind: "dodge", sourceId: "p1", targetId: "p2" });
  assert.deepEqual(dodge.map((option) => option.providerId), ["card", "eight_trigrams_dodge"]);
  assert.equal(dodge[0].selection?.type, "cards");
  assert.equal(dodge[1].selection, null);

  const attack = getResponseOptions({ hand: [card("Peach", "peach-1"), card("Dodge", "dodge-2")], equipment: [card("SerpentSpear", "spear")], hero: null }, { kind: "attack", context: "barbarian_invasion" });
  assert.deepEqual(attack.map((option) => option.providerId), ["serpent_spear_attack"]);
  assert.deepEqual(attack[0].selection?.eligibleCardIds, ["peach-1", "dodge-2"]);
});

test("Negation scheduling can discover a non-card provider", () => {
  const unregister = registerResponseProvider({
    id: "test_hero_negate",
    satisfies: "negate",
    activation: "explicit",
    getOption: () => ({ provider: "test_hero", providerId: "test_hero_negate", satisfies: "negate", label: "Use test Negate", cards: [], selection: null }),
    resolve: () => ({ status: "satisfied", providerId: "test_hero_negate", satisfies: "negate" }),
  });
  try {
    const options = getResponseOptions({ hand: [], equipment: [], hero: "test-hero" }, { kind: "negate", sourceId: "p1", targetId: "p2" });
    assert.equal(options.find((option) => option.providerId === "test_hero_negate")?.providerId, "test_hero_negate");
  } finally {
    unregister();
  }
});

test("legacy response helpers remain compatible while using semantic providers", () => {
  const context = { hand: [card("Dodge", "dodge-1"), card("Dodge", "dodge-2")], equipment: [], hero: null };
  assert.equal(responseOptions(context, "Dodge").length, 2);
  assert.equal(selectResponse(context, "Dodge", "dodge-2", undefined)?.cards[0].id, "dodge-2");
});

test("legacy response requests normalize once to semantic providers", () => {
  assert.deepEqual(normalizeLegacyResponseAction("respond_dodge"), { action: "respond", providerId: "card" });
  assert.deepEqual(normalizeLegacyResponseAction("respond_negation"), { action: "respond", providerId: "negation_card" });
  assert.deepEqual(normalizeLegacyResponseAction("respond_group", ["a", "b"]), { action: "respond", providerId: "serpent_spear_attack" });
  assert.deepEqual(normalizeLegacyResponseAction("pass_negation"), { action: "decline_response" });
});

test("generic decision modules do not encode equipment or hero provider IDs", async () => {
  const [responses, triggers] = await Promise.all([
    readFile(new URL("../game/decisions/responses.ts", import.meta.url), "utf8"),
    readFile(new URL("../game/decisions/triggers.ts", import.meta.url), "utf8"),
  ]);
  const orchestration = `${responses}\n${triggers}`;
  assert.doesNotMatch(orchestration, /eight_trigrams|serpent_spear|green_dragon|rock_cleaving|frost_sword|qingguo/i);
});

test("canonical room orchestration discovers damage triggers generically", async () => {
  const route = await readFile(new URL("../app/api/rooms/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(route, /frostSwordTriggerOption\s*\(/);
  assert.match(route, /function resolveAttackDamageAboutToApply/);
  assert.match(route, /const options = damageTriggerOptions\(source, target\)/);
  assert.doesNotMatch(route, /frostSwordTriggerContext|frostSwordTriggerOption/);
  assert.equal((route.match(/resolveAttackDamageAboutToApply\(/g) ?? []).length >= 4, true);
  assert.doesNotMatch(route, /Serpent Spear Attack would damage/);
  assert.doesNotMatch(route, /applyFollowUpAttackOutcome[\s\S]{0,1200}damageTriggerOptions/);
  assert.doesNotMatch(route, /Green Dragon Blade follow-up Attack/);
  assert.match(route, /effectId === "frost_sword_damage_about_to_apply"/);
  assert.match(route, /advances to the next target[\s\S]*withPresentationBarrier\(next/);
  assert.doesNotMatch(route, /withPresentationBarrier\([^\n]*,\s*log\s*\)/);
  assert.match(route, /function withPresentationBarrier<[\s\S]*eventId: string/);
  assert.doesNotMatch(route, /eventId \?\? latestDecisionPresentationEventId/);
  assert.match(route, /legacyPendingNeedsBarrierRecovery/);
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
  assert.deepEqual(resolveTriggeredEffect("green_dragon_blade_attack_dodged", { event: "attack_dodged", sourceEquipment: [card("GreenDragonBlade", "dragon")], sourceHand }, { cardId: "follow-up" }), { status: "resolved", effectId: "green_dragon_blade_attack_dodged", outcome: { kind: "follow_up_attack", attackCardId: "follow-up" } });

  const axeCards = [card("Peach", "axe-one"), card("RockCleavingAxe", "axe")];
  assert.deepEqual(getTriggeredEffects({ event: "attack_dodged", sourceEquipment: [axeCards[1]], sourceCards: axeCards }), [{ effectId: "rock_cleaving_axe_attack_dodged", label: "Use Rock Cleaving Axe", selection: { type: "cards", min: 2, max: 2, eligibleCardIds: ["axe-one", "axe"] } }]);
  assert.deepEqual(resolveTriggeredEffect("rock_cleaving_axe_attack_dodged", { event: "attack_dodged", sourceEquipment: [axeCards[1]], sourceCards: axeCards }, { cardIds: ["axe-one", "axe"] }), { status: "resolved", effectId: "rock_cleaving_axe_attack_dodged", outcome: { kind: "force_damage", amount: 1, consumeCardIds: ["axe-one", "axe"] } });

  const targetHand = [card("Peach", "frost-hand")];
  const targetEquipment = [card("NioShield", "frost-armor")];
  const frostContext = { event: "damage_about_to_apply", targetId: "target", sourceEquipment: [card("FrostSword", "frost")], targetHand, targetEquipment };
  assert.deepEqual(getTriggeredEffects(frostContext), [{ effectId: "frost_sword_damage_about_to_apply", label: "Use Frost Sword", selection: { type: "target_cards", targetId: "target", min: 1, max: 2, eligibleKeys: ["hand:0", "frost-armor"] } }]);
  assert.deepEqual(resolveTriggeredEffect("frost_sword_damage_about_to_apply", frostContext, { cardKeys: ["hand:0", "frost-armor"] }), { status: "resolved", effectId: "frost_sword_damage_about_to_apply", outcome: { kind: "prevent_damage", targetCardIds: ["frost-hand", "frost-armor"] } });
});

test("multiple event triggers are projected without route-level provider selection", () => {
  const unregisterFirst = registerTriggeredEffect({
    id: "test_first_dodged_trigger",
    event: "attack_dodged",
    getOption: () => ({ effectId: "test_first_dodged_trigger", label: "First test reaction", selection: null }),
    resolve: () => ({ status: "resolved", effectId: "test_first_dodged_trigger", outcome: { kind: "continue_event" } }),
  });
  const unregisterSecond = registerTriggeredEffect({
    id: "test_second_dodged_trigger",
    event: "attack_dodged",
    getOption: () => ({ effectId: "test_second_dodged_trigger", label: "Second test reaction", selection: null }),
    resolve: () => ({ status: "resolved", effectId: "test_second_dodged_trigger", outcome: { kind: "continue_event" } }),
  });
  try {
    const context = { event: "attack_dodged", sourceEquipment: [], sourceHand: [] };
    assert.deepEqual(getTriggeredEffects(context).slice(-2).map((option) => option.effectId), ["test_first_dodged_trigger", "test_second_dodged_trigger"]);
    assert.deepEqual(resolveTriggeredEffect("test_second_dodged_trigger", context, {}), { status: "resolved", effectId: "test_second_dodged_trigger", outcome: { kind: "continue_event" } });
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
  assert.deepEqual(continueTriggerEvent(pending, { status: "resolved", effectId: "test_reaction", outcome: { kind: "continue_event" } }, 42)?.resolvedEffectIds, ["test_reaction"]);
  assert.equal(continueTriggerEvent(pending, { status: "resolved", effectId: "terminal", outcome: { kind: "force_damage", amount: 1, consumeCardIds: ["a", "b"] } }), null);
});

test("semantic trigger continuation reopens remaining reactions and resumes exhausted events", () => {
  const pending = createTriggerDecision("attack_dodged", "source", { kind: "attack_dodged_event", sourceId: "source", targetId: "target", resumePhase: "play", sequenceStartCardId: "attack" }, "Optional reactions", 10, "event-1");
  const first = { status: "resolved", effectId: "synthetic-a", outcome: { kind: "continue_event" } };
  const reopened = resumeTriggerContinuation(pending, first, true, 20);
  assert.equal(reopened?.kind, "reopen");
  assert.deepEqual(reopened?.pending.resolvedEffectIds, ["synthetic-a"]);
  assert.equal(reopened?.pending.readyAfterEventId, undefined, "reopening clears the old barrier so orchestration can bind the new event");

  const exhausted = resumeTriggerContinuation(reopened.pending, { status: "resolved", effectId: "synthetic-b", outcome: { kind: "continue_event" } }, false, 30);
  assert.equal(exhausted?.kind, "resume");
  assert.equal(exhausted?.continuation.kind, "attack_dodged_event");

  const damagePending = createTriggerDecision("damage_about_to_apply", "source", { kind: "damage_about_to_apply_event", sourceId: "source", targetId: "target", resumePhase: "play", sequenceStartCardId: "attack" }, "Optional damage reactions", 10, "damage-event-1");
  const damageResume = resumeTriggerContinuation(damagePending, { status: "resolved", effectId: "synthetic-damage", outcome: { kind: "continue_event" } }, false, 30);
  assert.equal(damageResume?.kind, "resume");
  assert.equal(damageResume?.continuation.kind, "damage_about_to_apply_event");
});

test("bot trigger selection honors generic card and target-card maxima", () => {
  assert.deepEqual(chooseBotTrigger([{ effectId: "cards", label: "Cards", selection: { type: "cards", min: 2, max: 2, eligibleCardIds: ["a", "b", "c"] } }]), { providerId: "cards", cardIds: ["a", "b"] });
  assert.deepEqual(chooseBotTrigger([{ effectId: "target", label: "Target", selection: { type: "target_cards", targetId: "p2", min: 1, max: 1, eligibleKeys: ["hand:0", "equipment:armor"] } }]), { providerId: "target", cardKeys: ["hand:0"] });
});

test("canonical response outcomes preserve semantic continuation without provider dispatch", () => {
  const pending = {
    kind: "response",
    actorId: "target",
    requirement: { kind: "dodge", sourceId: "source", targetId: "target" },
    reason: "Attack response",
    continuation: { kind: "attack", sourceId: "source", targetId: "target", resumePhase: "play" },
  };
  for (const consumeCardIds of [[], ["dodge-1"], ["dodge-1", "dodge-2"]]) {
    const execution = { status: "satisfied", satisfies: "dodge", consumeCardIds };
    assert.deepEqual(applyResponseSatisfied(pending, execution), { continuation: pending.continuation, consumeCardIds });
  }
  assert.deepEqual(applyResponseDeclined(pending), { continuation: pending.continuation });
});

test("successful Negation has one canonical parity/depth transition", () => {
  const pending = { kind: "negation", sourceId: "source", actorId: "actor", remainingIds: [], negated: false, cardName: "Dismantle", effectTargetId: "target", resumePhase: "play", effect: { kind: "judgement", targetId: "target", cardId: "delay" }, reason: "respond", chainDepth: 0 };
  const first = applySuccessfulNegation(pending, { id: "first", name: "First" });
  assert.equal(first.negated, true); assert.equal(first.chainDepth, 1); assert.equal(first.latestNegationPlayerId, "first");
  const second = applySuccessfulNegation({ ...first, actorId: "second", chainDepth: 1 }, { id: "second", name: "Second" });
  assert.equal(second.negated, false); assert.equal(second.chainDepth, 2); assert.equal(second.latestNegationPlayerId, "second");
});

test("successful Negation never repairs or infers chain depth from stale fields", () => {
  const pending = { kind: "negation", sourceId: "source", actorId: "actor", remainingIds: [], negated: true, cardName: "Dismantle", effectTargetId: "target", resumePhase: "play", effect: { kind: "judgement", targetId: "target", cardId: "delay" }, reason: "respond", chainDepth: 0, latestNegationPlayerId: "stale" };
  const transitioned = applySuccessfulNegation(pending, { id: "actor", name: "Actor" });
  assert.equal(transitioned.chainDepth, 1); assert.equal(transitioned.negated, false);
});

test("human, bot, and Judgement Negation continuations share the same semantic fields", () => {
  const pending = { kind: "negation", sourceId: "source", actorId: "actor", remainingIds: ["next"], negated: false, cardName: "Dismantle", effectTargetId: "target", resumePhase: "play", effect: { kind: "judgement", targetId: "target", cardId: "delay" }, reason: "respond", chainDepth: 0 };
  const actor = { id: "actor", name: "Actor" };
  const negationCard = card("Negation", "negation-card");
  const human = applySuccessfulNegation(pending, actor, [negationCard]);
  const bot = applySuccessfulNegation(pending, actor, [negationCard]);
  const judgement = applySuccessfulNegation(pending, actor);
  const semantic = (state) => ({ negated: state.negated, latestNegationPlayerId: state.latestNegationPlayerId, chainDepth: state.chainDepth, responseTarget: state.responseTarget });
  assert.deepEqual(semantic(human), { negated: true, latestNegationPlayerId: "actor", chainDepth: 1, responseTarget: "Actor's Negation" });
  assert.deepEqual(semantic(bot), semantic(human));
  assert.deepEqual(semantic(judgement), semantic(human));
});

test("successful Judgement Negation carries transitioned state across both responder outcomes", async () => {
  const route = await readFile(new URL("../app/api/rooms/route.ts", import.meta.url), "utf8");
  const branchStart = route.indexOf("async function applyNegationResponseOutcome");
  const branchEnd = route.indexOf("async function applyResponseOutcome", branchStart);
  const branch = route.slice(branchStart, branchEnd);
  assert.match(branch, /playersWithNegateProvider\(players, nextAliveSeat\(players, actor\.seat\), negationRequirement\(transitioned\)\)/);
  assert.match(branch, /phase = 'resolving', pending_json = \?, deck_json = \?, discard_json = \?, log_json = \?/);
  assert.match(branch, /\.bind\(serializePending\(transitioned\), JSON\.stringify\(judged\.deck\), JSON\.stringify\(judged\.discard\), JSON\.stringify\(nextLog\), room\.id\)/);

  const pending = { kind: "negation", sourceId: "source", actorId: "actor", remainingIds: [], negated: false, cardName: "Overindulgence", effectTargetId: "target", resumePhase: "draw", effect: { kind: "judgement", targetId: "target", cardId: "delayed" }, reason: "respond", chainDepth: 0 };
  const rule = { kind: "judgement", label: "red Judgement", succeeds: (judged) => judged?.suit === "♥", successText: "succeeds", failureText: "fails" };
  const judged = resolveResponseJudgement({ ...card("Dodge", "red-judgement"), suit: "♥" }, rule);
  assert.equal(judged.status, "satisfied");
  const transitioned = applySuccessfulNegation(pending, { id: "actor", name: "Actor" });
  const withAnotherResponder = { ...transitioned, actorId: "next", remainingIds: [] };
  assert.equal(withAnotherResponder.actorId, "next");
  assert.deepEqual({ negated: withAnotherResponder.negated, chainDepth: withAnotherResponder.chainDepth, latestNegationPlayerId: withAnotherResponder.latestNegationPlayerId }, { negated: true, chainDepth: 1, latestNegationPlayerId: "actor" });
  const resolverInputWhenNoResponder = transitioned;
  assert.equal(resolverInputWhenNoResponder.negated, true);
  assert.equal(resolverInputWhenNoResponder.chainDepth, 1);
  assert.equal(resolverInputWhenNoResponder.latestNegationPlayerId, "actor");
});

test("secondary Judgement produces one semantic outcome for every response continuation", () => {
  const rule = { kind: "judgement", label: "red Judgement", succeeds: (judged) => judged?.suit === "♥", successText: "succeeds", failureText: "fails" };
  const continuations = ["attack", "group", "duel", "negation"];
  for (const kind of continuations) {
    const pending = { kind: "response", actorId: "p2", requirement: { kind: "dodge", sourceId: "p1", targetId: "p2" }, reason: "response", continuation: { kind } };
    assert.equal(resolveResponseJudgement({ ...card("Peach", `${kind}-red`), suit: "♥" }, rule).status, "satisfied");
    assert.equal(resolveResponseJudgement(card("Peach", `${kind}-black`), rule).status, "unsatisfied");
    assert.equal(applyResponseDeclined(pending).continuation.kind, kind);
  }
});
