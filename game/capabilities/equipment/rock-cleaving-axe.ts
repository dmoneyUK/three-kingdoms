import type { TriggeredEffect } from "../triggers";

/** Rock Cleaving Axe may pay any two current hand/equipment cards after Dodge. */
export const rockCleavingAxeDodgedAttackTrigger: TriggeredEffect = {
  id: "rock_cleaving_axe_attack_dodged",
  event: "attack_dodged",
  getOption: (context) => {
    const cards = context.sourceCards ?? [...(context.sourceHand ?? []), ...context.sourceEquipment];
    return context.sourceEquipment.some((card) => card.kind === "RockCleavingAxe") && cards.length >= 2
      ? { effectId: "rock_cleaving_axe_attack_dodged", label: "Use Rock Cleaving Axe", selection: { type: "cards", min: 2, max: 2, eligibleCardIds: cards.map((card) => card.id) } }
      : null;
  },
  resolve: (context, selection) => {
    const ids = Array.isArray(selection.cardIds) ? selection.cardIds.filter((id): id is string => typeof id === "string") : [];
    if (ids.length !== 2 || new Set(ids).size !== 2) return null;
    const available = context.sourceCards ?? [...(context.sourceHand ?? []), ...context.sourceEquipment];
    const cards = ids.map((id) => available.find((card) => card.id === id));
    return cards.every((card): card is NonNullable<typeof card> => Boolean(card))
      ? { status: "resolved", effectId: "rock_cleaving_axe_attack_dodged", outcome: { kind: "force_damage", amount: 1, consumeCardIds: ids } }
      : null;
  },
};
