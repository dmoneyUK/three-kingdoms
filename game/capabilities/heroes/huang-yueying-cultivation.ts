import { cardDefinition } from "../../cards";
import type { TriggeredEffect } from "../triggers";

/** Cultivation reacts once to the generic effective-card-use boundary. */
export const huangYueyingCultivationTrigger: TriggeredEffect = {
  id: "huang_yueying_cultivation",
  event: "stratagem_used",
  getOption: (context) => context.hero === "huang-yueying" && context.effectiveCard && cardDefinition(context.effectiveCard.kind).category === "stratagem"
    ? { effectId: "huang_yueying_cultivation", label: "Cultivation", description: "Draw 1 card after using a Stratagem.", selection: null, allowDecline: true }
    : null,
  resolve: (context) => context.hero === "huang-yueying" && context.effectiveCard && cardDefinition(context.effectiveCard.kind).category === "stratagem"
    ? { status: "resolved", effectId: "huang_yueying_cultivation", outcome: { kind: "draw_cards", amount: 1 } }
    : null,
};
