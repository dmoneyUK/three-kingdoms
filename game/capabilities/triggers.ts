import type { Card } from "../model";
import { greenDragonBladeDodgedAttackTrigger } from "./equipment/green-dragon-blade";
import { rockCleavingAxeDodgedAttackTrigger } from "./equipment/rock-cleaving-axe";
import { frostSwordDamageAboutToApplyTrigger } from "./equipment/frost-sword";

export type TriggerEvent = "attack_dodged" | "damage_about_to_apply";
export type TriggerContext = { event: TriggerEvent; sourceEquipment: Card[]; sourceHand?: Card[]; sourceCards?: Card[]; targetHand?: Card[]; targetEquipment?: Card[] };
export type TriggerSelection = { cardId?: unknown; cardIds?: unknown; cardKeys?: unknown };
export type TriggerSelectionConstraint = { type: "cards" | "target_cards"; min: number; max: number; eligibleCardIds: string[] };
export type TriggerOption = { effectId: string; label: string; selection: TriggerSelectionConstraint | null };
export type TriggerExecution = { status: "resolved"; effectId: string; consumeCardIds?: string[]; targetCardIds?: string[] };
export type TriggeredEffect = {
  id: string;
  event: TriggerEvent;
  getOption: (context: TriggerContext) => TriggerOption | null;
  resolve: (context: TriggerContext, selection: TriggerSelection) => TriggerExecution | null;
};

const triggers: TriggeredEffect[] = [greenDragonBladeDodgedAttackTrigger, rockCleavingAxeDodgedAttackTrigger, frostSwordDamageAboutToApplyTrigger];

/** Returns triggered effects supplied by the relevant equipped/hero capabilities. */
export function getTriggeredEffects(context: TriggerContext) {
  return triggers.filter((trigger) => trigger.event === context.event).map((trigger) => trigger.getOption(context)).filter((option): option is TriggerOption => Boolean(option));
}

/** Revalidates a selected triggered effect against the live source state. */
export function resolveTriggeredEffect(effectId: unknown, context: TriggerContext, selection: TriggerSelection) {
  if (typeof effectId !== "string") return null;
  const trigger = triggers.find((candidate) => candidate.id === effectId && candidate.event === context.event);
  if (!trigger || !trigger.getOption(context)) return null;
  return trigger.resolve(context, selection);
}
