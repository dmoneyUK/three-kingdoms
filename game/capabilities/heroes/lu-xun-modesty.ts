import type { TargetLegalityCapability } from "../targeting";

/** Lu Xun's Modesty is a passive target restriction, not a card-specific route rule. */
export const luXunModesty: TargetLegalityCapability = {
  id: "lu_xun_modesty",
  canTarget: ({ targetHero, cardKind }) => targetHero !== "lu-xun" || (cardKind !== "Steal" && cardKind !== "Overindulgence"),
};
