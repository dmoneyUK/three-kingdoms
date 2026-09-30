import type { TriggeredEffect } from "../triggers";

/** Beauty Outshining the Moon belongs only to Diao Chan's own turn-end. */
export const diaoChanBeautyTrigger: TriggeredEffect = {
  id: "diao_chan_beauty_outshining_moon",
  event: "turn_end",
  getOption: (context) => context.hero === "diao-chan" && context.playerId && context.playerId === context.targetId
    ? { effectId: "diao_chan_beauty_outshining_moon", label: "Beauty Outshining the Moon", description: "Draw 1 card at the end of your turn.", selection: null, allowDecline: true }
    : null,
  resolve: (context) => context.hero === "diao-chan" && context.playerId && context.playerId === context.targetId
    ? { status: "resolved", effectId: "diao_chan_beauty_outshining_moon", outcome: { kind: "draw_cards", amount: 1 } }
    : null,
};
