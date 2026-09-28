import type { TriggeredEffect } from "../triggers";

const id = "ma_chao_cavalry";

/** Cavalry is a source-owned optional attack_targeted Judgement. */
export const maChaoCavalryTrigger: TriggeredEffect = {
  id,
  event: "attack_targeted",
  getActorId: (context) => context.sourceId,
  getOption: (context) => context.event === "attack_targeted" && context.hero === "ma-chao"
    ? { effectId: id, label: "Cavalry — enter Judgement", description: "If the Judgement card is red, the target cannot use Dodge for this Attack.", selection: null, allowDecline: true }
    : null,
  resolve: (context) => context.event === "attack_targeted" && context.hero === "ma-chao"
    ? { status: "resolved", effectId: id, outcome: { kind: "judgement" } }
    : null,
};
