import type { DistanceModifierProvider } from "../distance";

/** Militia is derived from Gongsun Zan's live HP; no mode is persisted. */
export const gongsunZanMilitia: DistanceModifierProvider = {
  id: "gongsun_zan_militia",
  getModifier: ({ source, target }) => ({
    outbound: source.hero === "gongsun-zan" && source.hp !== null && source.hp !== undefined
      ? source.hp > 2 ? -1 : 0
      : 0,
    inbound: target.hero === "gongsun-zan" && target.hp !== null && target.hp !== undefined
      ? target.hp <= 2 ? 1 : 0
      : 0,
  }),
};
