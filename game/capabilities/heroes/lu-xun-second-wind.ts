import type { TriggeredEffect } from "../triggers";

/** Lu Xun's optional trigger after a qualifying transition to an empty hand. */
export const luXunSecondWindTrigger: TriggeredEffect = {
  id: "lu_xun_second_wind",
  event: "hand_lost",
  getOption: (context) => context.hero === "lu-xun" && context.playerId && context.sourceHand?.length === 0 && (context.lostCards?.length ?? 0) > 0
    ? {
      effectId: "lu_xun_second_wind",
      label: "Second Wind — draw 1 card",
      description: "You may draw 1 card when you lose your last hand card.",
      selection: null,
    }
    : null,
  resolve: (context) => context.hero === "lu-xun" && context.playerId && context.sourceHand?.length === 0 && (context.lostCards?.length ?? 0) > 0
    ? { status: "resolved", effectId: "lu_xun_second_wind", outcome: { kind: "draw_cards", amount: 1 } }
    : null,
};
