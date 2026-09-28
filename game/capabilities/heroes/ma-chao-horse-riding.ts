import type { DistanceModifierProvider } from "../distance";

/** Horse Riding reduces only Ma Chao's outbound distance. */
export const maChaoHorseRiding: DistanceModifierProvider = {
  id: "ma_chao_horse_riding",
  getModifier: ({ source }) => ({ outbound: source.hero === "ma-chao" ? -1 : 0 }),
};
