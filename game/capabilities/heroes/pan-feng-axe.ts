import type { TriggerContext, TriggerExecution, TriggerOption, TriggerSelection, TriggeredEffect } from "../triggers";

const id = "pan_feng_axe_of_insanity";

/**
 * Axe of Insanity is a mandatory source-owned post-damage effect.  The
 * damage event has already been applied when this provider is discovered, so
 * targetHp is the authoritative post-damage value.
 */
export const panFengAxeOfInsanityTrigger: TriggeredEffect = {
  id,
  event: "damage_suffered",
  getActorId: (context: TriggerContext) => context.sourceId,
  getOption(context: TriggerContext): TriggerOption | null {
    if (
      context.event !== "damage_suffered"
      || context.sourceHero !== "pan-feng"
      || !context.sourceId
      || !context.targetId
      || context.sourceId === context.targetId
      || context.damageCause !== "attack"
      || (context.damageAmount ?? 0) <= 0
      || !context.playPhase
      || context.skillState?.axeOfInsanityUsed === true
      || context.sourceHp === undefined
      || context.targetHp === undefined
    ) return null;

    const draws = context.targetHp < context.sourceHp;
    return {
      effectId: id,
      label: draws ? "Axe of Insanity — Draw 2 cards" : "Axe of Insanity — Lose 1 HP",
      description: draws
        ? "The damaged character has less HP than Pan Feng; draw 2 cards."
        : "The damaged character has equal or greater HP than Pan Feng; lose 1 HP.",
      allowDecline: false,
      selection: null,
    };
  },
  resolve(context: TriggerContext, selection: TriggerSelection): TriggerExecution | null {
    const option = panFengAxeOfInsanityTrigger.getOption(context);
    if (!option || selection.cardId !== undefined || selection.cardIds !== undefined || selection.cardKeys !== undefined || selection.targetId !== undefined || selection.targetIds !== undefined || selection.choice !== undefined) return null;
    const draws = context.targetHp! < context.sourceHp!;
    return draws
      ? { status: "resolved", effectId: id, stateUpdate: { key: "axeOfInsanityUsed", value: true }, outcome: { kind: "draw_cards", amount: 2 } }
      : { status: "resolved", effectId: id, stateUpdate: { key: "axeOfInsanityUsed", value: true }, outcome: { kind: "lose_hp", playerId: context.sourceId!, amount: 1 } };
  },
};
