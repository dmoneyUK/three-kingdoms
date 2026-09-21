import type { TriggeredEffect } from "../triggers";

/** Godess of Luo River is a turn-start trigger; the route owns the shared Judgement pipeline. */
export const zhenJiLuoshenTrigger: TriggeredEffect = {
  id: "zhen_ji_luoshen",
  event: "turn_start",
  getOption: (context) => context.hero === "zhen-ji"
    ? { effectId: "zhen_ji_luoshen", label: "Godess of Luo River", selection: null, allowDecline: true }
    : null,
  resolve: (context) => context.hero === "zhen-ji"
    ? { status: "resolved", effectId: "zhen_ji_luoshen", outcome: { kind: "judgement" } }
    : null,
};
