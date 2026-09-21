import type { TriggeredEffect } from "../triggers";

/** Yingzi is an optional modifier for Zhou Yu's normal Draw Phase only. */
export const zhouYuYingziTrigger: TriggeredEffect = {
  id: "zhou_yu_yingzi",
  event: "draw_phase",
  getOption: (context) => context.hero === "zhou-yu"
    ? { effectId: "zhou_yu_yingzi", label: "Yingzi", description: "Draw one additional card this Draw Phase.", selection: null, allowDecline: true }
    : null,
  resolve: (context) => context.hero === "zhou-yu"
    ? { status: "resolved", effectId: "zhou_yu_yingzi", outcome: { kind: "draw_phase_modifier", amount: 1 } }
    : null,
};
