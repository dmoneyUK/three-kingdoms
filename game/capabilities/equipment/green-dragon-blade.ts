import { isAttackCard } from "../../cards";
import type { TriggeredEffect } from "../triggers";

export const greenDragonBladeDodgedAttackTrigger: TriggeredEffect = {
  id: "green_dragon_blade_attack_dodged",
  event: "attack_dodged",
  getOption: (context) => {
    const attacks = (context.sourceHand ?? []).filter(isAttackCard);
    return context.sourceEquipment.some((card) => card.kind === "GreenDragonBlade") && attacks.length
      ? { effectId: "green_dragon_blade_attack_dodged", label: "Use Green Dragon Blade", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: attacks.map((card) => card.id) } }
      : null;
  },
  resolve: (context, selection) => {
    const cardId = typeof selection.cardId === "string" ? selection.cardId : "";
    const attack = (context.sourceHand ?? []).find((card) => card.id === cardId && isAttackCard(card));
    return attack ? { status: "resolved", effectId: "green_dragon_blade_attack_dodged", consumeCardIds: [attack.id] } : null;
  },
};
