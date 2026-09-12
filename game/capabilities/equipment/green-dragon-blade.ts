import type { TriggeredEffect } from "../triggers";

export const greenDragonBladeDodgedAttackTrigger: TriggeredEffect = {
  id: "green_dragon_blade_attack_dodged",
  event: "attack_dodged",
  getOption: (context) => context.sourceEquipment.some((card) => card.kind === "GreenDragonBlade")
    ? { effectId: "green_dragon_blade_attack_dodged", label: "Use Green Dragon Blade" }
    : null,
};
