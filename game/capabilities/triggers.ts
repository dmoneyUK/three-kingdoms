import type { Card } from "../model";
import { greenDragonBladeDodgedAttackTrigger } from "./equipment/green-dragon-blade";
import { rockCleavingAxeDodgedAttackTrigger } from "./equipment/rock-cleaving-axe";
import { frostSwordDamageAboutToApplyTrigger } from "./equipment/frost-sword";
import { testSemanticTriggers } from "./test-fixtures";

export type TriggerEvent = "attack_dodged" | "damage_about_to_apply";
/**
 * The event context is deliberately capability-neutral. Providers decide which
 * source/target cards they can use; orchestration only knows the domain event.
 */
export type TriggerContext = { event: TriggerEvent; sourceEquipment: Card[]; sourceHand?: Card[]; sourceCards?: Card[]; targetId?: string; targetHand?: Card[]; targetEquipment?: Card[] };
export type TriggerSelection = { cardId?: unknown; cardIds?: unknown; cardKeys?: unknown };
export type TriggerSelectionConstraint =
  | { type: "cards"; min: number; max: number; eligibleCardIds: string[] }
  | { type: "target_cards"; targetId: string; min: number; max: number; eligibleKeys: string[] };
export type TriggerOption = { effectId: string; label: string; selection: TriggerSelectionConstraint | null };
/**
 * Providers describe the semantic consequence of accepting their option. The
 * decision engine may branch on this small domain vocabulary, never on a
 * weapon or hero provider ID.
 */
export type TriggerExecution =
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "follow_up_attack"; attackCardId: string } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "force_damage"; amount: number; consumeCardIds: string[] } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "prevent_damage"; targetCardIds: string[] } }
  | { status: "resolved"; effectId: string; presentation?: TriggerPresentation; outcome: { kind: "continue_event" } };
export type TriggerPresentation = { label: string };
export type TriggeredEffect = {
  id: string;
  event: TriggerEvent;
  getOption: (context: TriggerContext) => TriggerOption | null;
  resolve: (context: TriggerContext, selection: TriggerSelection) => TriggerExecution | null;
};

const triggers: TriggeredEffect[] = [greenDragonBladeDodgedAttackTrigger, rockCleavingAxeDodgedAttackTrigger, frostSwordDamageAboutToApplyTrigger, ...testSemanticTriggers];

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
