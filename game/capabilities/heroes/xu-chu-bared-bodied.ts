import type { TriggeredEffect } from "../triggers";

/** Bared Bodied is an optional modifier for Xu Zhu's normal Draw Phase only. */
export const xuChuBaredBodiedTrigger: TriggeredEffect = {
  id: "xu_chu_bared_bodied",
  event: "draw_phase",
  getOption: (context) => context.hero === "xu-chu"
    ? {
      effectId: "xu_chu_bared_bodied",
      label: "Bared Bodied",
      description: "Draw 1 fewer card this Draw Phase. Your Attack and Duel damage deals +1 damage this turn.",
      selection: null,
      allowDecline: true,
    }
    : null,
  resolve: (context) => context.hero === "xu-chu"
    ? { status: "resolved", effectId: "xu_chu_bared_bodied", outcome: { kind: "draw_phase_modifier", amount: -1, modifierId: "bared_bodied" } }
    : null,
};
