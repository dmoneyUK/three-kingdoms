import assert from "node:assert/strict";
import test from "node:test";
import { getAttackCardProvider, getPlayPhaseActions, getResponseOptions, registerResponseProvider } from "../game/responses.ts";
import { resolveResponseDecision } from "../game/response-decision.ts";
import { applySuccessfulNegation } from "../game/decisions/negation.ts";
import { resolvePassiveAttackModifiers } from "../game/capabilities/passive.ts";
import { canUseUnlimitedAttacks } from "../game/capabilities/attack-use-limit.ts";
import { getTriggeredEffects, registerTriggeredEffect, resolveTriggeredEffect } from "../game/capabilities/triggers.ts";
import { continueTriggerEvent, createTriggerDecision, resumeTriggerContinuation } from "../game/decisions/triggers.ts";
import { applyResponseSatisfied, applyResponseDeclined, resolveResponseJudgement } from "../game/decisions/responses.ts";
import { registerTestSemanticCapabilities, testSemanticResponseProviders, testSemanticTriggers } from "../game/capabilities/test-fixtures.ts";
import { heroGender } from "../game/heroes.ts";
import { canDeclareAttack, playPhaseAfterAttack } from "../game/rules.ts";
import { getActiveHeroSkillOptions, resolveActiveHeroSkill } from "../game/capabilities/heroes/kings.ts";
import { resolveDamageModifiers } from "../game/capabilities/damage-modifiers.ts";
import { responseCostActor, semanticResponseActor } from "../game/response-identity.ts";

const card = (kind, id) => ({ kind, id, suit: "♠", rank: "A" });

test("delegated responses keep semantic and cost actors distinct", () => {
  const response = {
    kind: "response",
    actorId: "shu-provider",
    delegation: { kind: "attack", requesterId: "liu-bei", providerId: "liu_bei_jijiang", remainingActorIds: [] },
    requirement: { kind: "attack", sourceId: "cao-cao", actorId: "shu-provider" },
    reason: "Provide Attack",
    continuation: { kind: "duel", sourceId: "cao-cao", targetId: "liu-bei", opponentId: "cao-cao", resumePhase: "play" },
  };
  assert.equal(semanticResponseActor(response), "liu-bei");
  assert.equal(responseCostActor(response), "shu-provider");
  assert.equal(semanticResponseActor({ ...response, delegation: undefined }), "shu-provider");
  assert.equal(responseCostActor({ ...response, delegation: undefined }), "shu-provider");
});

test("Liu Bei Influencing is Lord-only and follows the normal Attack-use projection", () => {
  const base = { playerId: "liu", hero: "liu-bei", hand: [], equipment: [], livingTargetIds: ["target"], attackTargetIds: ["target"], influencingAvailable: true, skillState: {} };
  assert.equal(getActiveHeroSkillOptions({ ...base, role: "Lord", canDeclareAttack: true }).some((option) => option.effectId === "liu_bei_jijiang"), true);
  assert.equal(getActiveHeroSkillOptions({ ...base, role: "Lord", canDeclareAttack: false }).some((option) => option.effectId === "liu_bei_jijiang"), false);
  assert.equal(getActiveHeroSkillOptions({ ...base, role: "Loyalist", canDeclareAttack: true }).some((option) => option.effectId === "liu_bei_jijiang"), false);
  assert.equal(getResponseOptions({ hero: "liu-bei", role: "Loyalist", hand: [], equipment: [], delegates: [{ id: "shu", hero: "guan-yu", hand: [], equipment: [] }] }, { kind: "attack" }).some((option) => option.providerId === "liu_bei_jijiang"), false);
  assert.equal(getResponseOptions({ hero: "liu-bei", role: "Lord", hand: [], equipment: [], delegates: [{ id: "shu", hero: "guan-yu", hand: [], equipment: [] }] }, { kind: "attack" }).some((option) => option.providerId === "liu_bei_jijiang"), true);
});

test("Xu Zhu Bared Bodied is a reusable Draw Phase modifier and semantic damage modifier", () => {
  const context = { event: "draw_phase", sourceEquipment: [], sourceHand: [], playerId: "xu", hero: "xu-chu" };
  assert.deepEqual(getTriggeredEffects(context), [{ effectId: "xu_chu_bared_bodied", label: "Bared Bodied", description: "Draw 1 fewer card this Draw Phase. Your Attack and Duel damage deals +1 damage this turn.", selection: null, allowDecline: true }]);
  assert.deepEqual(resolveTriggeredEffect("xu_chu_bared_bodied", context, {}).outcome, { kind: "draw_phase_modifier", amount: -1, modifierId: "bared_bodied" });
  const active = { turnPlayerId: "xu", baredBodiedActive: true };
  assert.equal(resolveDamageModifiers({ sourceId: "xu", sourceHero: "xu-chu", cause: "attack", baseAmount: 1, turnState: active }), 2);
  assert.equal(resolveDamageModifiers({ sourceId: "xu", sourceHero: "xu-chu", cause: "duel", baseAmount: 1, turnState: active }), 2);
  assert.equal(resolveDamageModifiers({ sourceId: "xu", sourceHero: "xu-chu", cause: "attack", baseAmount: 1, turnState: active }), 2, "the modifier is not consumed");
  assert.equal(resolveDamageModifiers({ sourceId: "xu", sourceHero: "xu-chu", cause: "other", baseAmount: 1, turnState: active }), 1);
  assert.equal(resolveDamageModifiers({ sourceId: "other", sourceHero: "xu-chu", cause: "attack", baseAmount: 1, turnState: active }), 1);
  assert.equal(resolveDamageModifiers({ sourceId: "xu", sourceHero: "xu-chu", cause: "attack", baseAmount: 1, turnState: { turnPlayerId: "other", baredBodiedActive: true } }), 1);
});

test("Wu and Qun hero capabilities project their private costs and Wushuang multiplicity", () => {
  const black = card("Peach", "qixi-black");
  const borrowedSword = { ...card("BorrowedSword", "qixi-borrowed"), suit: "♣" };
  const redCard = { ...card("Peach", "qixi-red"), suit: "♥" };
  const targets = ["target"];
  const qixi = getActiveHeroSkillOptions({ playerId: "source", hero: "gan-ning", hand: [black], livingTargetIds: targets, skillState: {} });
  assert.equal(qixi[0].effectId, "gan_ning_qixi");
  assert.deepEqual(resolveActiveHeroSkill("gan_ning_qixi", { playerId: "source", hero: "gan-ning", hand: [black], livingTargetIds: targets, skillState: {} }, { cardIds: [black.id], targetId: "target" })?.outcome, { kind: "dismantle", sourceId: "source", targetId: "target", cardIds: [black.id] });
  const qixiBlackHand = getActiveHeroSkillOptions({ playerId: "source", hero: "gan-ning", hand: [borrowedSword, redCard], livingTargetIds: targets, targetableTargetIds: targets, skillState: {} })[0];
  assert.deepEqual(qixiBlackHand.selection, { type: "cards", min: 1, max: 1, eligibleCardIds: [borrowedSword.id], targetIds: targets });
  assert.deepEqual(resolveActiveHeroSkill("gan_ning_qixi", { playerId: "source", hero: "gan-ning", hand: [borrowedSword], livingTargetIds: targets, targetableTargetIds: targets, skillState: {} }, { cardIds: [borrowedSword.id], targetId: "target" })?.outcome, { kind: "dismantle", sourceId: "source", targetId: "target", cardIds: [borrowedSword.id] });
  assert.equal(getActiveHeroSkillOptions({ playerId: "source", hero: "gan-ning", hand: [black], livingTargetIds: targets, targetableTargetIds: [], skillState: {} }).length, 0, "Ambushment is not projected without a target that has an affectable card");
  assert.equal(getActiveHeroSkillOptions({ playerId: "source", hero: "huang-gai", hand: [], livingTargetIds: targets, skillState: {} })[0].effectId, "huang_gai_kurou");
  const fanjian = getActiveHeroSkillOptions({ playerId: "source", hero: "zhou-yu", hand: [black], livingTargetIds: targets, skillState: {} })[0];
  assert.equal(fanjian.effectId, "zhou_yu_fanjian"); assert.deepEqual(fanjian.selection, { type: "target", targetIds: targets });
  assert.deepEqual(resolveActiveHeroSkill("zhou_yu_fanjian", { playerId: "source", hero: "zhou-yu", hand: [black], livingTargetIds: targets, skillState: {} }, { targetId: "target" })?.outcome, { kind: "fanjian", sourceId: "source", targetId: "target" });
  const yingziContext = { event: "draw_phase", sourceEquipment: [], sourceHand: [], playerId: "source", hero: "zhou-yu" };
  assert.deepEqual(getTriggeredEffects(yingziContext), [{ effectId: "zhou_yu_yingzi", label: "Heroic", description: "Draw one additional card this Draw Phase.", selection: null, allowDecline: true }]);
  assert.deepEqual(resolveTriggeredEffect("zhou_yu_yingzi", yingziContext, {}).outcome, { kind: "draw_phase_modifier", amount: 1 });
  assert.equal(getResponseOptions({ hand: [card("Dodge", "dodge-a"), card("Dodge", "dodge-b")], equipment: [], hero: null }, { kind: "dodge", count: 2 })[0].selection.min, 2);
  assert.equal(getResponseOptions({ hand: [card("Dodge", "dodge-a")], equipment: [], hero: null }, { kind: "dodge", count: 2 }).length, 0);
});

test("Guan Yu Wusheng provides only eligible red hand cards as semantic Attack", () => {
  const redPeach = { ...card("Peach", "red-peach"), suit: "♥" };
  const redEquipment = { ...card("ZhugeCrossbow", "red-equipment"), suit: "♦" };
  const blackAttack = card("Attack", "black-attack");
  const context = { hand: [redPeach, blackAttack], equipment: [redEquipment], hero: "guan-yu" };
  const options = getResponseOptions(context, { kind: "attack" });
  assert.deepEqual(options.map((option) => option.providerId), ["card", "guan_yu_red_card_attack"]);
  assert.deepEqual(options[1].selection?.eligibleCardIds, ["red-peach"]);
  assert.equal(getAttackCardProvider(context, redPeach.id)?.providerId, "guan_yu_red_card_attack");
  assert.equal(getAttackCardProvider(context, redEquipment.id), undefined);
  assert.equal(getResponseOptions({ hand: [redPeach], equipment: [], hero: "zhang-fei" }, { kind: "attack" }).length, 0);
  const pending = { kind: "response", actorId: "p2", requirement: { kind: "attack", sourceId: "p1", actorId: "p2", context: "duel" }, reason: "Attack", continuation: { kind: "duel", sourceId: "p1", targetId: "p2", opponentId: "p1", resumePhase: "play" } };
  assert.deepEqual(resolveResponseDecision(pending, context, "guan_yu_red_card_attack", { cardId: "red-peach" }), { status: "satisfied", providerId: "guan_yu_red_card_attack", satisfies: "attack", consumeCardIds: ["red-peach"], resolution: "cards", playedAs: "attack" });
  assert.equal(resolveResponseDecision(pending, { ...context, hand: [blackAttack] }, "guan_yu_red_card_attack", { cardId: "red-peach" }), null);

  const longdanDodge = card("Dodge", "longdan-dodge");
  const longdanAttack = card("Attack", "longdan-attack");
  const longdanEquipment = card("BlueSteelSword", "longdan-equipment");
  const longdanContext = { hand: [longdanDodge, longdanAttack], equipment: [longdanEquipment], hero: "zhao-yun" };
  assert.deepEqual(getResponseOptions(longdanContext, { kind: "attack" }).map((option) => ({ providerId: option.providerId, eligible: option.selection?.eligibleCardIds, playedAs: option.playedAs })), [
    { providerId: "card", eligible: [longdanAttack.id], playedAs: undefined },
    { providerId: "zhao_yun_dodge_as_attack", eligible: [longdanDodge.id], playedAs: "attack" },
  ]);
  assert.deepEqual(getResponseOptions({ ...longdanContext, hand: [longdanAttack] }, { kind: "dodge" }).map((option) => ({ providerId: option.providerId, eligible: option.selection?.eligibleCardIds, playedAs: option.playedAs })), [
    { providerId: "zhao_yun_attack_as_dodge", eligible: [longdanAttack.id], playedAs: "dodge" },
  ]);
  assert.deepEqual(getResponseOptions({ ...longdanContext, hand: [longdanDodge] }, { kind: "dodge" }).map((option) => ({ providerId: option.providerId, activation: option.activation, playedAs: option.playedAs })), [
    { providerId: "card", activation: "implicit", playedAs: undefined },
  ]);
  assert.equal(getAttackCardProvider(longdanContext, longdanDodge.id)?.providerId, "zhao_yun_dodge_as_attack");
  assert.equal(getAttackCardProvider({ ...longdanContext, hand: [], equipment: [longdanDodge] }, longdanDodge.id), undefined);
  assert.deepEqual(resolveResponseDecision({ kind: "response", actorId: "p2", requirement: { kind: "dodge", sourceId: "p1", targetId: "p2" }, reason: "Dodge", continuation: { kind: "attack", sourceId: "p1", targetId: "p2", resumePhase: "play" } }, { ...longdanContext, hand: [longdanAttack] }, "zhao_yun_attack_as_dodge", { cardId: longdanAttack.id }), { status: "satisfied", providerId: "zhao_yun_attack_as_dodge", satisfies: "dodge", consumeCardIds: [longdanAttack.id], resolution: "cards", playedAs: "dodge" });
});

test("Play Phase virtual Attack projection is explicit and shares Wusheng eligibility", () => {
  const redPeach = { ...card("Peach", "play-peach"), suit: "♥" };
  const redDodge = { ...card("Dodge", "play-dodge"), suit: "♦" };
  const redNegation = { ...card("Negation", "play-negation"), suit: "♥" };
  const redEquipment = { ...card("ZhugeCrossbow", "play-equipment"), suit: "♦" };
  const blackPeach = card("Peach", "play-black");
  const context = { hand: [redPeach, redDodge, redNegation, redEquipment, blackPeach], equipment: [], hero: "guan-yu" };
  assert.deepEqual(getPlayPhaseActions(context), [
    { cardId: redPeach.id, canPlayAs: "attack" },
    { cardId: redDodge.id, canPlayAs: "attack" },
    { cardId: redNegation.id, canPlayAs: "attack" },
    { cardId: redEquipment.id, canPlayAs: "attack" },
  ]);
  assert.deepEqual(getPlayPhaseActions({ ...context, hero: "zhen-ji" }), []);
  assert.deepEqual(getPlayPhaseActions({ ...context, hand: [redPeach], equipment: [redEquipment] }), [{ cardId: redPeach.id, canPlayAs: "attack" }]);

  const longdanDodge = card("Dodge", "longdan-play-dodge");
  const longdanAttack = card("Attack", "longdan-play-attack");
  const longdanWeapon = card("BlueSteelSword", "longdan-play-weapon");
  const longdanContext = { hand: [longdanDodge, longdanAttack], equipment: [longdanWeapon], hero: "zhao-yun" };
  assert.deepEqual(getPlayPhaseActions(longdanContext), [{ cardId: longdanDodge.id, canPlayAs: "attack" }]);
  assert.equal(getAttackCardProvider(longdanContext, longdanWeapon.id), undefined, "equipped cards cannot be Longdan costs");
});

test("synthetic capability registration is isolated and cleans up", () => {
  const options = getResponseOptions({ hand: [], equipment: [], hero: "test-hero" }, { kind: "attack" });
  const triggerOptions = getTriggeredEffects({ event: "attack_dodged", sourceEquipment: [card("Test", "test-trigger-a")] });
  assert.deepEqual(options, []);
  assert.deepEqual(triggerOptions, []);
  assert.equal(testSemanticResponseProviders.length, 3);
  assert.equal(testSemanticTriggers.length, 4);
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
  assert.deepEqual(resolveResponseDecision({ kind: "response", actorId: "p2", requirement: { kind: "dodge", sourceId: "p1", targetId: "p2" }, reason: "Dodge", continuation: { kind: "attack", sourceId: "p1", targetId: "p2", resumePhase: "play" } }, { hand: [blackPeach], equipment: [], hero: "zhen-ji" }, "zhen_ji_black_card_dodge", { cardId: blackPeach.id }), { status: "satisfied", providerId: "zhen_ji_black_card_dodge", satisfies: "dodge", consumeCardIds: [blackPeach.id], resolution: "cards" });
});

test("passive and triggered equipment capabilities are discovered outside the route", () => {
  const ordinary = { id: "ordinary", seat: 0, alive: true, hero: "cao-cao", equipment: [] };
  const crossbow = { ...ordinary, equipment: [card("ZhugeCrossbow", "limit-crossbow")] };
  const zhangFei = { ...ordinary, hero: "zhang-fei" };
  assert.equal(canUseUnlimitedAttacks({ hero: ordinary.hero, equipment: ordinary.equipment }), false);
  assert.equal(canUseUnlimitedAttacks({ hero: zhangFei.hero, equipment: zhangFei.equipment }), true);
  assert.equal(canUseUnlimitedAttacks({ hero: ordinary.hero, equipment: crossbow.equipment }), true);
  assert.equal(canUseUnlimitedAttacks({ hero: zhangFei.hero, equipment: crossbow.equipment }), true);
  assert.equal(playPhaseAfterAttack({ hero: ordinary.hero, equipment: ordinary.equipment }), "play-struck");
  assert.equal(playPhaseAfterAttack({ hero: zhangFei.hero, equipment: zhangFei.equipment }), "play");
  assert.equal(playPhaseAfterAttack({ hero: ordinary.hero, equipment: crossbow.equipment }), "play");
  assert.equal(canDeclareAttack(ordinary, "play-struck"), false);
  assert.equal(canDeclareAttack(zhangFei, "play-struck"), true);
  assert.equal(canDeclareAttack(crossbow, "play-struck"), true);
  assert.equal(canDeclareAttack({ ...crossbow, equipment: [] }, "play-struck"), false, "removing Crossbow restores the normal limit");

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

  const kirinContext = { event: "damage_about_to_apply", targetId: "target", sourceEquipment: [card("KirinBow", "kirin")], targetEquipment: [card("OffensiveHorse", "offensive"), card("NioShield", "armor"), card("DefensiveHorse", "defensive")] };
  assert.deepEqual(getTriggeredEffects(kirinContext), [{ effectId: "kirin_bow_damage_about_to_apply", label: "Use Kirin Bow", selection: { type: "target_cards", targetId: "target", min: 1, max: 1, eligibleKeys: ["offensive", "defensive"] } }]);
  assert.deepEqual(resolveTriggeredEffect("kirin_bow_damage_about_to_apply", kirinContext, { cardKeys: ["defensive"] }), { status: "resolved", effectId: "kirin_bow_damage_about_to_apply", outcome: { kind: "target_discard", targetCardId: "defensive" } });
  assert.equal(getTriggeredEffects({ ...kirinContext, targetEquipment: [card("NioShield", "armor")] }).length, 0);
});

test("Sima Yi Retaliation projects only source Playing Area cards and consumes its event identity", () => {
  const hidden = card("Peach", "source-hidden");
  const equipment = card("NioShield", "source-equipment");
  const judgement = card("Lightning", "source-judgement");
  const context = {
    event: "damage_suffered",
    sourceId: "source",
    sourceHand: [hidden],
    sourceEquipment: [equipment],
    sourceJudgement: [judgement],
    targetId: "sima",
    targetHero: "simayi",
    damageAmount: 2,
  };
  assert.deepEqual(getTriggeredEffects(context), [{ effectId: "sima_yi_fankui", label: "Retaliation", selection: { type: "target_cards", targetId: "source", min: 1, max: 1, eligibleKeys: ["hand:0", equipment.id, judgement.id] } }]);
  assert.deepEqual(resolveTriggeredEffect("sima_yi_fankui", context, { cardKeys: ["hand:0"] })?.outcome, { kind: "gain_target_card", sourceId: "source", targetId: "sima", targetCardKey: "hand:0" });
  assert.equal(getTriggeredEffects(context, ["sima_yi_fankui"]).length, 0);
  assert.equal(getTriggeredEffects({ ...context, sourceHand: [], sourceEquipment: [], sourceJudgement: [] }).length, 0);
  assert.equal(getTriggeredEffects({ ...context, targetHero: "cao-cao" }).length, 0);
  assert.equal(getTriggeredEffects({ ...context, judgementCard: card("Judge", "revealed") }).length, 0, "provider-owned secondary Judgement choices do not reopen Retaliation");
});

test("Yin-Yang Swords is a target-owned attack_targeted capability with live legal choices", () => {
  const context = { event: "attack_targeted", sourceEquipment: [card("YinYangSwords", "yy")], sourceGender: heroGender("zhang-fei"), targetGender: heroGender("zhen-ji"), targetId: "target", targetHand: [card("Peach", "hidden")], targetEquipment: [] };
  assert.deepEqual(getTriggeredEffects(context), [{ effectId: "yin_yang_swords_attack_targeted", label: "Yin-Yang Swords", allowDecline: false, timeoutChoiceId: "draw", selection: { type: "choice", choices: [{ id: "discard", label: "Discard 1 hand card" }, { id: "draw", label: "Allow attacker to draw 1 card" }], eligibleHandKeys: ["hand:0"] } }]);
  assert.deepEqual(resolveTriggeredEffect("yin_yang_swords_attack_targeted", context, { choice: "discard", cardKeys: ["hand:0"] })?.outcome, { kind: "target_discard", targetCardId: "hidden" });
  assert.deepEqual(getTriggeredEffects({ ...context, targetHand: [] })[0].selection, { type: "choice", choices: [{ id: "draw", label: "Allow attacker to draw 1 card" }], eligibleHandKeys: [] });
  assert.equal(getTriggeredEffects({ ...context, sourceGender: "female" }).length, 0);
});

test("Blue Steel Sword suppresses Armor effects and Armor-based Dodge alternatives for its Attack", () => {
  const blueSteel = card("BlueSteelSword", "blue-steel");
  const shield = card("NioShield", "nio-shield");
  const attack = { ...card("Attack", "blue-attack"), suit: "♠" };
  assert.equal(resolvePassiveAttackModifiers({ targetEquipment: [shield], sourceEquipment: [blueSteel], attack }), null);
  assert.deepEqual(getResponseOptions({ hand: [], equipment: [card("EightTrigrams", "trigrams")], hero: null }, { kind: "dodge", sourceId: "source", targetId: "target", attack: { cardId: attack.id, suit: attack.suit, ignoresArmor: true } }), []);
  assert.deepEqual(getResponseOptions({ hand: [], equipment: [card("EightTrigrams", "trigrams")], hero: null }, { kind: "dodge", sourceId: "source", targetId: "target", attack: { cardId: attack.id, suit: attack.suit } }).map((option) => option.providerId), ["eight_trigrams_dodge"]);
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

test("damage_suffered keeps unresolved providers available after one resolves", () => {
  const unregisterFirst = registerTriggeredEffect({
    id: "test_first_damage_suffered_trigger",
    event: "damage_suffered",
    getOption: () => ({ effectId: "test_first_damage_suffered_trigger", label: "First damage reaction", selection: null }),
    resolve: () => ({ status: "resolved", effectId: "test_first_damage_suffered_trigger", outcome: { kind: "continue_event" } }),
  });
  const unregisterSecond = registerTriggeredEffect({
    id: "test_second_damage_suffered_trigger",
    event: "damage_suffered",
    getOption: () => ({ effectId: "test_second_damage_suffered_trigger", label: "Second damage reaction", selection: null }),
    resolve: () => ({ status: "resolved", effectId: "test_second_damage_suffered_trigger", outcome: { kind: "continue_event" } }),
  });
  try {
    const context = { event: "damage_suffered", sourceId: "source", sourceEquipment: [], targetId: "target", targetHero: "cao-cao" };
    assert.deepEqual(getTriggeredEffects(context).slice(-2).map((option) => option.effectId), ["test_first_damage_suffered_trigger", "test_second_damage_suffered_trigger"]);
    assert.deepEqual(getTriggeredEffects(context, ["test_first_damage_suffered_trigger"]).slice(-2).map((option) => option.effectId), ["test_second_damage_suffered_trigger"]);
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
  const pending = { kind: "negation", sourceId: "source", remainingIds: [], negated: false, cardName: "Dismantle", effectTargetId: "target", resumePhase: "play", effect: { kind: "judgement", targetId: "target", cardId: "delay" }, chainDepth: 0, readyAfterEventId: "old-barrier" };
  const first = applySuccessfulNegation(pending, { id: "first", name: "First" });
  assert.equal(first.negated, true); assert.equal(first.chainDepth, 1); assert.equal(first.latestNegationPlayerId, "first");
  assert.equal(first.readyAfterEventId, undefined, "continuation transitions do not own presentation metadata");
  const second = applySuccessfulNegation({ ...first, chainDepth: 1 }, { id: "second", name: "Second" });
  assert.equal(second.negated, false); assert.equal(second.chainDepth, 2); assert.equal(second.latestNegationPlayerId, "second");
});

test("successful Negation never repairs or infers chain depth from stale fields", () => {
  const pending = { kind: "negation", sourceId: "source", remainingIds: [], negated: true, cardName: "Dismantle", effectTargetId: "target", resumePhase: "play", effect: { kind: "judgement", targetId: "target", cardId: "delay" }, chainDepth: 0, latestNegationPlayerId: "stale" };
  const transitioned = applySuccessfulNegation(pending, { id: "actor", name: "Actor" });
  assert.equal(transitioned.chainDepth, 1); assert.equal(transitioned.negated, false);
});

test("successful Judgement Negation carries transitioned state across both responder outcomes", () => {

  const pending = { kind: "negation", sourceId: "source", remainingIds: [], negated: false, cardName: "Overindulgence", effectTargetId: "target", resumePhase: "draw", effect: { kind: "judgement", targetId: "target", cardId: "delayed" }, chainDepth: 0 };
  const rule = { kind: "judgement", purpose: "overindulgence", label: "red Judgement", successText: "succeeds", failureText: "fails" };
  const judged = resolveResponseJudgement({ ...card("Dodge", "red-judgement"), suit: "♥" }, rule);
  assert.equal(judged.status, "satisfied");
  const transitioned = applySuccessfulNegation(pending, { id: "actor", name: "Actor" });
  const withAnotherResponder = { ...transitioned, remainingIds: [] };
  assert.deepEqual({ negated: withAnotherResponder.negated, chainDepth: withAnotherResponder.chainDepth, latestNegationPlayerId: withAnotherResponder.latestNegationPlayerId }, { negated: true, chainDepth: 1, latestNegationPlayerId: "actor" });
  const resolverInputWhenNoResponder = transitioned;
  assert.equal(resolverInputWhenNoResponder.negated, true);
  assert.equal(resolverInputWhenNoResponder.chainDepth, 1);
  assert.equal(resolverInputWhenNoResponder.latestNegationPlayerId, "actor");
});

test("secondary Judgement produces one semantic outcome for every response continuation", () => {
  const rule = { kind: "judgement", purpose: "overindulgence", label: "red Judgement", successText: "succeeds", failureText: "fails" };
  const continuations = ["attack", "group", "duel", "negation"];
  for (const kind of continuations) {
    const pending = { kind: "response", actorId: "p2", requirement: { kind: "dodge", sourceId: "p1", targetId: "p2" }, reason: "response", continuation: { kind } };
    assert.equal(resolveResponseJudgement({ ...card("Peach", `${kind}-red`), suit: "♥" }, rule).status, "satisfied");
    assert.equal(resolveResponseJudgement(card("Peach", `${kind}-black`), rule).status, "unsatisfied");
    assert.equal(applyResponseDeclined(pending).continuation.kind, kind);
  }
});
