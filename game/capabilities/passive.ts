import type { Card } from "../model";
import { nioShieldAttackModifier } from "./equipment/nio-shield";

export type PassiveAttackContext = { targetEquipment: Card[]; attack: Card | null | undefined };
export type PassiveAttackResult = { prevented: boolean; reason: string };
export type PassiveAttackModifier = { id: string; applies: (context: PassiveAttackContext) => boolean; resolve: (context: PassiveAttackContext) => PassiveAttackResult };

const attackModifiers: PassiveAttackModifier[] = [nioShieldAttackModifier];

/** Applies passive Attack modifiers before a Dodge requirement is created. */
export function resolvePassiveAttackModifiers(context: PassiveAttackContext) {
  for (const modifier of attackModifiers) if (modifier.applies(context)) return modifier.resolve(context);
  return null;
}
