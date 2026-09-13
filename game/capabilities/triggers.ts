import type { Card } from "../model";
import { greenDragonBladeDodgedAttackTrigger } from "./equipment/green-dragon-blade";

export type TriggerEvent = "attack_dodged";
export type TriggerContext = { event: TriggerEvent; sourceEquipment: Card[]; sourceHand?: Card[] };
export type TriggerSelection = { cardId?: unknown; cardIds?: unknown };
export type TriggerOption = { effectId: string; label: string; selection: { type: "cards"; min: number; max: number; eligibleCardIds: string[] } | null };
export type TriggerExecution = { status: "resolved"; effectId: string; consumeCardIds?: string[] };
export type TriggeredEffect = {
  id: string;
  event: TriggerEvent;
  getOption: (context: TriggerContext) => TriggerOption | null;
  resolve: (context: TriggerContext, selection: TriggerSelection) => TriggerExecution | null;
};

const triggers: TriggeredEffect[] = [greenDragonBladeDodgedAttackTrigger];

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
