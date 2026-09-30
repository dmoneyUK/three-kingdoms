import type { Card } from "../model";
import type { DamageCause } from "./damage-modifiers";
import { greenDragonBladeDodgedAttackTrigger } from "./equipment/green-dragon-blade";
import { rockCleavingAxeDodgedAttackTrigger } from "./equipment/rock-cleaving-axe";
import { frostSwordDamageAboutToApplyTrigger } from "./equipment/frost-sword";
import { kirinBowDamageAboutToApplyTrigger } from "./equipment/kirin-bow";
import { yinYangSwordsAttackTargeted } from "./equipment/yin-yang-swords";
import { zhenJiLuoshenTrigger } from "./heroes/zhen-ji-luoshen";
import { simaYiGuicaiTrigger } from "./heroes/sima-yi-guicai";
import { simaYiFankuiTrigger } from "./heroes/sima-yi-fankui";
import { xiahouDunGanglieTrigger } from "./heroes/xiahou-dun-ganglie";
import { caoCaoJianxiongTrigger } from "./heroes/cao-cao-jianxiong";
import { zhouYuYingziTrigger } from "./heroes/zhou-yu-yingzi";
import { luXunSecondWindTrigger } from "./heroes/lu-xun-second-wind";
import { luMengComposureTrigger } from "./heroes/lu-meng-composure";
import { zhangLiaoAssaultTrigger } from "./heroes/zhang-liao-assault";
import { xuChuBaredBodiedTrigger } from "./heroes/xu-chu-bared-bodied";
import { guoJiaJealousyOfGodTrigger, guoJiaLegacyTrigger } from "./heroes/guo-jia";
import { maChaoCavalryTrigger } from "./heroes/ma-chao-cavalry";
import { daQiaoDeflectionTrigger } from "./heroes/daqiao-deflection";
import { zhugeLiangStargazingTrigger } from "./heroes/zhuge-liang-stargazing";
import { huangYueyingCultivationTrigger } from "./heroes/huang-yueying-cultivation";
import { ladyGanDivineWisdomTrigger, ladyGanPrudenceTrigger } from "./heroes/lady-gan";
import { sunShangxiangDaredevilTrigger } from "./heroes/sun-shangxiang-daredevil";
import { diaoChanBeautyTrigger } from "./heroes/diao-chan";
import { huaXiongTriumphantTrigger } from "./heroes/hua-xiong-triumphant";
import { panFengAxeOfInsanityTrigger } from "./heroes/pan-feng-axe";

export type TriggerEvent = "turn_start" | "turn_end" | "draw_phase" | "discard_phase" | "judgement_revealed" | "judgement_effective" | "attack_targeted" | "attack_dodged" | "damage_about_to_apply" | "damage_suffered" | "hero_choice" | "hand_lost" | "equipment_lost" | "stratagem_used" | "hp_recovered";
/**
 * The event context is deliberately capability-neutral. Providers decide which
 * source/target cards they can use; orchestration only knows the domain event.
 */
export type TriggerContext = { event: TriggerEvent; sourceId?: string; sourceEquipment: Card[]; sourceHand?: Card[]; sourceJudgement?: Card[]; sourceCards?: Card[]; damageCards?: Card[]; damageCause?: DamageCause; physicalSuit?: Card["suit"]; lostCards?: Card[]; attackUsed?: boolean; targetId?: string; targetIds?: string[]; targetHand?: Card[]; targetEquipment?: Card[]; sourceGender?: "male" | "female" | null; targetGender?: "male" | "female" | null; sourceHero?: string | null; sourceHp?: number; sourceMaxHp?: number; targetHp?: number; turnPlayerId?: string; playPhase?: boolean; skillState?: Record<string, unknown>; playerId?: string; hero?: string | null; targetHero?: string | null; damageAmount?: number; amountRecovered?: number; recoveryReason?: string; judgementCard?: Card; judgementPurpose?: "luoshen" | "overindulgence" | "rations_depleted" | "lightning" | "eight_trigrams" | "ganglie" | "cavalry"; effectiveCard?: Card; heroChoiceStage?: "suit" | "card"; heroChoiceGuess?: string; turnEndStage?: "activation" | "equipment" };
export type TriggerSelection = { cardId?: unknown; cardIds?: unknown; cardKeys?: unknown; targetId?: unknown; targetIds?: unknown; choice?: unknown };
export type TriggerSelectionConstraint =
  | { type: "cards"; min: number; max: number; eligibleCardIds: string[]; targetIds?: string[]; targetMin?: number; targetMax?: number }
  | { type: "target"; targetIds: string[]; min?: number; max?: number }
  | { type: "target_cards"; targetId: string; min: number; max: number; eligibleKeys: string[] }
  | { type: "choice"; choices: { id: string; label: string }[]; eligibleHandKeys: string[]; cardCountByChoice?: Record<string, number> };
export type TriggerOption = { effectId: string; label: string; description?: string; selection: TriggerSelectionConstraint | null; allowDecline?: boolean; timeoutChoiceId?: string };
export function triggerAllowsDecline(option: Pick<TriggerOption, "allowDecline">) {
  return option.allowDecline !== false;
}
/**
 * Providers describe the semantic consequence of accepting their option. The
 * decision engine may branch on this small domain vocabulary, never on a
 * weapon or hero provider ID.
 */
type TriggerExecutionOutcome =
  | { kind: "follow_up_attack"; attackCardId: string }
  | { kind: "force_damage"; amount: number; consumeCardIds: string[] }
  | { kind: "prevent_damage"; targetCardIds: string[] }
  | { kind: "target_discard"; targetCardId: string }
  | { kind: "discard_cards"; targetId: string; targetCardIds: string[] }
  | { kind: "damage_player"; targetId: string; amount: number }
  | { kind: "attacker_draw" }
  | { kind: "judgement" }
  | { kind: "deck_reorder" }
  | { kind: "judgement_replacement"; cardId: string }
  | { kind: "obtain_judgement_card"; playerId: string; cardId: string }
  | { kind: "legacy_distribution"; playerId: string }
  | { kind: "gain_target_card"; sourceId: string; targetId: string; targetCardKey: string }
  | { kind: "gain_damage_cards"; targetId: string; cardIds: string[] }
  | { kind: "fanjian_guess"; targetId: string; guess: string }
  | { kind: "fanjian_card"; sourceId: string; targetId: string; targetCardKey: string }
  | { kind: "draw_phase_modifier"; amount: number; modifierId?: string }
  | { kind: "draw_phase_replacement"; targetIds: string[] }
  | { kind: "draw_cards"; amount: number }
  | { kind: "recover_player"; playerId: string; amount: number }
  | { kind: "draw_target_cards"; targetId: string }
  | { kind: "discard_all_hand_recover"; playerId: string }
  | { kind: "skip_discard" }
  | { kind: "redirect_attack"; targetId: string; discardCardId: string }
  | { kind: "continue_event" }
  | { kind: "lose_hp"; playerId: string; amount: number };
export type TriggerExecution = { status: "resolved"; effectId: string; presentation?: TriggerPresentation; stateUpdate?: { key: string; value: boolean }; outcome: TriggerExecutionOutcome };
export type TriggerPresentation = { label: string };
export type TriggeredEffect = {
  id: string;
  event: TriggerEvent;
  getOption: (context: TriggerContext) => TriggerOption | null;
  resolve: (context: TriggerContext, selection: TriggerSelection) => TriggerExecution | null;
  /** The player who owns this event option; omitted when the event actor is the owner. */
  getActorId?: (context: TriggerContext) => string | null | undefined;
  /** A provider with this flag may be offered once for each point of one damage event. */
  repeatPerDamagePoint?: boolean;
};

const zhouYuFanjianChoice: TriggeredEffect = {
  id: "zhou_yu_fanjian_choice",
  event: "hero_choice",
  getOption: (context) => context.heroChoiceStage === "suit" ? {
    effectId: "zhou_yu_fanjian_choice",
    label: "Sowing Distrust — choose a suit",
    description: "Choose the suit before taking an unknown card from Zhou Yu's hand.",
    allowDecline: false,
    selection: { type: "choice", choices: [{ id: "♥", label: "♥ Heart" }, { id: "♦", label: "♦ Diamond" }, { id: "♣", label: "♣ Club" }, { id: "♠", label: "♠ Spade" }], eligibleHandKeys: [] },
  } : context.heroChoiceStage === "card" && context.sourceId && context.sourceHand?.length ? {
    effectId: "zhou_yu_fanjian_choice",
    label: "Sowing Distrust — choose a hidden card",
    description: "Choose one anonymous card from Zhou Yu's hand.",
    allowDecline: false,
    selection: { type: "target_cards", targetId: context.sourceId, min: 1, max: 1, eligibleKeys: context.sourceHand.map((_, index) => `hand:${index}`) },
  } : null,
  resolve: (context, selection) => {
    if (context.heroChoiceStage === "suit" && typeof selection.choice === "string" && ["♥", "♦", "♣", "♠"].includes(selection.choice)) {
      return { status: "resolved", effectId: "zhou_yu_fanjian_choice", outcome: { kind: "fanjian_guess", targetId: context.targetId ?? "", guess: selection.choice } };
    }
    if (context.heroChoiceStage === "card" && context.sourceId && context.targetId && Array.isArray(selection.cardKeys) && selection.cardKeys.length === 1 && typeof selection.cardKeys[0] === "string" && /^hand:\d+$/.test(selection.cardKeys[0])) {
      const index = Number(selection.cardKeys[0].slice(5));
      if (Number.isInteger(index) && index >= 0 && index < (context.sourceHand?.length ?? 0)) return { status: "resolved", effectId: "zhou_yu_fanjian_choice", outcome: { kind: "fanjian_card", sourceId: context.sourceId, targetId: context.targetId, targetCardKey: selection.cardKeys[0] } };
    }
    return null;
  },
};

import { yueJinDauntlessTrigger } from "./heroes/yue-jin-dauntless";

const triggers: TriggeredEffect[] = [zhouYuFanjianChoice, zhouYuYingziTrigger, zhangLiaoAssaultTrigger, xuChuBaredBodiedTrigger, luXunSecondWindTrigger, luMengComposureTrigger, yueJinDauntlessTrigger, diaoChanBeautyTrigger, zhenJiLuoshenTrigger, zhugeLiangStargazingTrigger, huangYueyingCultivationTrigger, ladyGanDivineWisdomTrigger, ladyGanPrudenceTrigger, sunShangxiangDaredevilTrigger, simaYiGuicaiTrigger, guoJiaJealousyOfGodTrigger, guoJiaLegacyTrigger, caoCaoJianxiongTrigger, simaYiFankuiTrigger, xiahouDunGanglieTrigger, maChaoCavalryTrigger, daQiaoDeflectionTrigger, yinYangSwordsAttackTargeted, greenDragonBladeDodgedAttackTrigger, rockCleavingAxeDodgedAttackTrigger, frostSwordDamageAboutToApplyTrigger, kirinBowDamageAboutToApplyTrigger, huaXiongTriumphantTrigger, panFengAxeOfInsanityTrigger];

/** Test and future capability modules can extend an event without route edits. */
export function registerTriggeredEffect(effect: TriggeredEffect) {
  triggers.push(effect);
  return () => {
    const index = triggers.indexOf(effect);
    if (index >= 0) triggers.splice(index, 1);
  };
}

/** Returns triggered effects supplied by the relevant equipped/hero capabilities. */
export function getTriggeredEffects(context: TriggerContext, resolvedEffectIds: readonly string[] = [], resolvedDamagePointEffectIds: readonly string[] = []) {
  const resolved = new Set(resolvedEffectIds);
  const resolvedPoint = new Set(resolvedDamagePointEffectIds);
  return triggers.filter((trigger) => trigger.event === context.event && !(trigger.repeatPerDamagePoint ? resolvedPoint : resolved).has(trigger.id)).map((trigger) => trigger.getOption(context)).filter((option): option is TriggerOption => Boolean(option));
}

/** Revalidates a selected triggered effect against the live source state. */
export function resolveTriggeredEffect(effectId: unknown, context: TriggerContext, selection: TriggerSelection) {
  if (typeof effectId !== "string") return null;
  const trigger = triggers.find((candidate) => candidate.id === effectId && candidate.event === context.event);
  if (!trigger || !trigger.getOption(context)) return null;
  return trigger.resolve(context, selection);
}

/** Resolves event ownership without exposing provider-specific routing to the API. */
export function triggerActorId(effectId: string, context: TriggerContext) {
  const trigger = triggers.find((candidate) => candidate.id === effectId && candidate.event === context.event);
  return trigger?.getActorId?.(context) ?? null;
}

/** Returns whether a damage trigger is intentionally repeated per damage point. */
export function triggerRepeatsPerDamagePoint(effectId: string, event: TriggerEvent = "damage_suffered") {
  return triggers.find((candidate) => candidate.id === effectId && candidate.event === event)?.repeatPerDamagePoint ?? false;
}
