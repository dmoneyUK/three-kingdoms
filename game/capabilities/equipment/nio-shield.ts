import type { PassiveAttackModifier } from "../passive";

export const nioShieldAttackModifier: PassiveAttackModifier = {
  id: "nio_shield_black_attack_immunity",
  applies: ({ targetEquipment, attack }) => targetEquipment.some((card) => card.kind === "NioShield") && Boolean(attack && (attack.suit === "♠" || attack.suit === "♣")),
  resolve: () => ({ prevented: true, reason: "Nio Shield" }),
};
