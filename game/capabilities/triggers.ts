import type { Card } from "../model";
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

export type TriggerEvent = "turn_start" | "judgement_revealed" | "attack_targeted" | "attack_dodged" | "damage_about_to_apply" | "damage_suffered" | "hero_choice";
/**
 * The event context is deliberately capability-neutral. Providers decide which
 * source/target cards they can use; orchestration only knows the domain event.
 */
export type TriggerContext = { event: TriggerEvent; sourceId?: string; sourceEquipment: Card[]; sourceHand?: Card[]; sourceJudgement?: Card[]; sourceCards?: Card[]; damageCards?: Card[]; targetId?: string; targetHand?: Card[]; targetEquipment?: Card[]; sourceGender?: "male" | "female" | null; targetGender?: "male" | "female" | null; playerId?: string; hero?: string | null; targetHero?: string | null; damageAmount?: number; judgementCard?: Card; judgementPurpose?: "luoshen" | "overindulgence" | "rations_depleted" | "lightning" | "eight_trigrams" | "ganglie"; heroChoiceCard?: Card };
export type TriggerSelection = { cardId?: unknown; cardIds?: unknown; cardKeys?: unknown; choice?: unknown };
export type TriggerSelectionConstraint =
  | { type: "cards"; min: number; max: number; eligibleCardIds: string[]; targetIds?: string[] }
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
export type TriggerExecution =
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "follow_up_attack"; attackCardId: string } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "force_damage"; amount: number; consumeCardIds: string[] } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "prevent_damage"; targetCardIds: string[] } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "target_discard"; targetCardId: string } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "discard_cards"; targetId: string; targetCardIds: string[] } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "damage_player"; targetId: string; amount: number } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "attacker_draw" } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "judgement" } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "judgement_replacement"; cardId: string } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "gain_target_card"; sourceId: string; targetId: string; targetCardKey: string } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "gain_damage_cards"; targetId: string; cardIds: string[] } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "fanjian_choice"; targetId: string; guess: string; correct: boolean } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "continue_event" } };
export type TriggerPresentation = { label: string };
export type TriggeredEffect = {
  id: string;
  event: TriggerEvent;
  getOption: (context: TriggerContext) => TriggerOption | null;
  resolve: (context: TriggerContext, selection: TriggerSelection) => TriggerExecution | null;
};

const zhouYuFanjianChoice: TriggeredEffect = {
  id: "zhou_yu_fanjian_choice",
  event: "hero_choice",
  getOption: (context) => context.heroChoiceCard ? {
    effectId: "zhou_yu_fanjian_choice",
    label: "Guess the suit",
    description: "Choose the suit of Zhou Yu's concealed card.",
    allowDecline: false,
    selection: { type: "choice", choices: [{ id: "♥", label: "Heart ♥" }, { id: "♦", label: "Diamond ♦" }, { id: "♣", label: "Club ♣" }, { id: "♠", label: "Spade ♠" }], eligibleHandKeys: [] },
  } : null,
  resolve: (context, selection) => {
    if (!context.heroChoiceCard || typeof selection.choice !== "string" || !["♥", "♦", "♣", "♠"].includes(selection.choice)) return null;
    return { status: "resolved", effectId: "zhou_yu_fanjian_choice", outcome: { kind: "fanjian_choice", targetId: context.targetId ?? "", guess: selection.choice, correct: selection.choice === context.heroChoiceCard.suit } };
  },
};

const triggers: TriggeredEffect[] = [zhouYuFanjianChoice, zhenJiLuoshenTrigger, simaYiGuicaiTrigger, simaYiFankuiTrigger, caoCaoJianxiongTrigger, xiahouDunGanglieTrigger, yinYangSwordsAttackTargeted, greenDragonBladeDodgedAttackTrigger, rockCleavingAxeDodgedAttackTrigger, frostSwordDamageAboutToApplyTrigger, kirinBowDamageAboutToApplyTrigger];

/** Test and future capability modules can extend an event without route edits. */
export function registerTriggeredEffect(effect: TriggeredEffect) {
  triggers.push(effect);
  return () => {
    const index = triggers.indexOf(effect);
    if (index >= 0) triggers.splice(index, 1);
  };
}

/** Returns triggered effects supplied by the relevant equipped/hero capabilities. */
export function getTriggeredEffects(context: TriggerContext, resolvedEffectIds: readonly string[] = []) {
  const resolved = new Set(resolvedEffectIds);
  return triggers.filter((trigger) => trigger.event === context.event && !resolved.has(trigger.id)).map((trigger) => trigger.getOption(context)).filter((option): option is TriggerOption => Boolean(option));
}

/** Revalidates a selected triggered effect against the live source state. */
export function resolveTriggeredEffect(effectId: unknown, context: TriggerContext, selection: TriggerSelection) {
  if (typeof effectId !== "string") return null;
  const trigger = triggers.find((candidate) => candidate.id === effectId && candidate.event === context.event);
  if (!trigger || !trigger.getOption(context)) return null;
  return trigger.resolve(context, selection);
}
