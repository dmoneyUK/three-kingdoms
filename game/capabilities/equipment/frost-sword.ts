import type { TriggeredEffect } from "../triggers";

/** Frost Sword replaces imminent damage with discarding one or two target Hand/Equipment cards. */
export const frostSwordDamageAboutToApplyTrigger: TriggeredEffect = {
  id: "frost_sword_damage_about_to_apply",
  event: "damage_about_to_apply",
  getOption: (context) => {
    if (!context.sourceEquipment.some((card) => card.kind === "FrostSword")) return null;
    const handKeys = (context.targetHand ?? []).map((_, index) => `hand:${index}`);
    const equipmentIds = (context.targetEquipment ?? []).map((card) => card.id);
    const eligibleCardIds = [...handKeys, ...equipmentIds];
    return eligibleCardIds.length
      ? { effectId: "frost_sword_damage_about_to_apply", label: "Use Frost Sword", selection: { type: "target_cards", targetId: context.targetId ?? "", min: 1, max: 2, eligibleKeys: eligibleCardIds } }
      : null;
  },
  resolve: (context, selection) => {
    const keys = Array.isArray(selection.cardKeys) ? selection.cardKeys.filter((key): key is string => typeof key === "string") : [];
    if (keys.length < 1 || keys.length > 2 || new Set(keys).size !== keys.length) return null;
    const hand = context.targetHand ?? [];
    const equipment = context.targetEquipment ?? [];
    const cards = keys.map((key) => key.startsWith("hand:") ? hand[Number(key.slice(5))] : equipment.find((card) => card.id === key));
    return cards.every((card): card is NonNullable<typeof card> => Boolean(card))
      ? { status: "resolved", effectId: "frost_sword_damage_about_to_apply", outcome: { kind: "prevent_damage", targetCardIds: cards.map((card) => card.id) } }
      : null;
  },
};
