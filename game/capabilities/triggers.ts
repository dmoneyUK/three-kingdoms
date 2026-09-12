import type { Card } from "../model";
import { greenDragonBladeDodgedAttackTrigger } from "./equipment/green-dragon-blade";

export type TriggerEvent = "attack_dodged";
export type TriggerContext = { event: TriggerEvent; sourceEquipment: Card[] };
export type TriggerOption = { effectId: string; label: string };
export type TriggeredEffect = { id: string; event: TriggerEvent; getOption: (context: TriggerContext) => TriggerOption | null };

const triggers: TriggeredEffect[] = [greenDragonBladeDodgedAttackTrigger];

/** Returns triggered effects supplied by the relevant equipped/hero capabilities. */
export function getTriggeredEffects(context: TriggerContext) {
  return triggers.filter((trigger) => trigger.event === context.event).map((trigger) => trigger.getOption(context)).filter((option): option is TriggerOption => Boolean(option));
}
