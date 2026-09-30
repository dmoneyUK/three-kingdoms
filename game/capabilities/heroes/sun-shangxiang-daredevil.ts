import type { TriggeredEffect } from "../triggers";

/** Daredevil observes the semantic Equipment-zone exit, regardless of destination. */
export const sunShangxiangDaredevilTrigger: TriggeredEffect = {
  id: "sun_shangxiang_daredevil",
  event: "equipment_lost",
  getOption: (context) => context.hero === "sun-shangxiang" && (context.lostCards?.length ?? 0) === 1
    ? { effectId: "sun_shangxiang_daredevil", label: "Daredevil", description: "Draw 2 cards after losing an equipped Equipment.", selection: null, allowDecline: true }
    : null,
  resolve: (context) => context.hero === "sun-shangxiang" && (context.lostCards?.length ?? 0) === 1
    ? { status: "resolved", effectId: "sun_shangxiang_daredevil", outcome: { kind: "draw_cards", amount: 2 } }
    : null,
};
