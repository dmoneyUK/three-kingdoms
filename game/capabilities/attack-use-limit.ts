import type { Card } from "../model";

export type AttackUseLimitContext = { hero?: string | null; equipment: Card[] };
export type AttackUseLimitProvider = { id: string; canUseUnlimitedAttacks: (context: AttackUseLimitContext) => boolean };

/** Providers for the normal Play Phase Attack-use limit. */
export const attackUseLimitProviders: AttackUseLimitProvider[] = [
  { id: "zhang_fei_paoxiao", canUseUnlimitedAttacks: (context) => context.hero === "zhang-fei" },
  { id: "zhuge_crossbow_unlimited_attacks", canUseUnlimitedAttacks: (context) => context.equipment.some((card) => card.kind === "ZhugeCrossbow") },
];

export function canUseUnlimitedAttacks(context: AttackUseLimitContext) {
  return attackUseLimitProviders.some((provider) => provider.canUseUnlimitedAttacks(context));
}
