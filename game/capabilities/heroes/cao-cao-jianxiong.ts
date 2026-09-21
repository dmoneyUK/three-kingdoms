import type { TriggeredEffect } from "../triggers";

/** Treachery obtains the card(s) that caused Cao Cao's damage when available. */
export const caoCaoJianxiongTrigger: TriggeredEffect = {
  id: "cao_cao_jianxiong",
  event: "damage_suffered",
  getOption(context) {
    if (context.event !== "damage_suffered" || context.targetHero !== "cao-cao" || !context.targetId || !context.damageCards?.length || context.judgementCard) return null;
    return { effectId: "cao_cao_jianxiong", label: "Treachery", description: "Obtain the card that caused the damage, if it is still available.", selection: null };
  },
  resolve(context) {
    const option = caoCaoJianxiongTrigger.getOption(context);
    return option && context.targetId && context.damageCards?.length
      ? { status: "resolved", effectId: "cao_cao_jianxiong", outcome: { kind: "gain_damage_cards", targetId: context.targetId, cardIds: context.damageCards.map((card) => card.id) } }
      : null;
  },
};
