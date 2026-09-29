import type { TargetLegalityCapability } from "../targeting";

/** Empty Fortress is a live target restriction for Attack and Duel only. */
export const zhugeLiangEmptyFortress: TargetLegalityCapability = {
  id: "zhuge_liang_empty_fortress",
  canTarget: ({ targetHero, targetHandCount, cardKind }) =>
    targetHero !== "zhuge-liang"
    || targetHandCount !== 0
    || (cardKind !== "Attack" && cardKind !== "Duel"),
};
