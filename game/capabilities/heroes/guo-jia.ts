import type { TriggeredEffect } from "../triggers";

/** Jealousy of God obtains the final effective Judgement card, after replacement and result evaluation. */
export const guoJiaJealousyOfGodTrigger: TriggeredEffect = {
  id: "guo_jia_jealousy_of_god",
  event: "judgement_effective",
  getOption: (context) => context.hero === "guo-jia" && context.playerId && context.judgementCard
    ? {
      effectId: "guo_jia_jealousy_of_god",
      label: "Jealousy of God",
      description: "Obtain this Judgment card.",
      selection: null,
      allowDecline: true,
    }
    : null,
  resolve: (context) => context.hero === "guo-jia" && context.playerId && context.judgementCard
    ? { status: "resolved", effectId: "guo_jia_jealousy_of_god", outcome: { kind: "obtain_judgement_card", playerId: context.playerId, cardId: context.judgementCard.id } }
    : null,
};

/** Legacy is repeated for each point in one settled damage event. */
export const guoJiaLegacyTrigger: TriggeredEffect = {
  id: "guo_jia_legacy",
  event: "damage_suffered",
  repeatPerDamagePoint: true,
  getOption: (context) => context.targetHero === "guo-jia" && !context.judgementCard
    ? {
      effectId: "guo_jia_legacy",
      label: "Legacy",
      description: "Look at the top 2 cards, then give them to living character(s).",
      selection: null,
      allowDecline: true,
    }
    : null,
  resolve: (context) => context.targetHero === "guo-jia" && context.targetId && !context.judgementCard
    ? { status: "resolved", effectId: "guo_jia_legacy", outcome: { kind: "legacy_distribution", playerId: context.targetId } }
    : null,
};
