import type { TriggerContext, TriggeredEffect } from "../triggers";

function recoverableDamageCardIds(context: TriggerContext) {
  const damageIds = context.damageCards?.map((card) => card.id) ?? [];
  const recoverableIds = context.recoverableDamageCardIds ?? [];
  if (!damageIds.length || damageIds.some((id) => !id) || new Set(damageIds).size !== damageIds.length) return [];
  if (recoverableIds.length !== damageIds.length || damageIds.some((id, index) => recoverableIds[index] !== id)) return [];
  return damageIds;
}

/** Treachery obtains the card(s) that caused Cao Cao's damage when available. */
export const caoCaoJianxiongTrigger: TriggeredEffect = {
  id: "cao_cao_jianxiong",
  event: "damage_suffered",
  getOption(context) {
    if (context.event !== "damage_suffered" || context.targetHero !== "cao-cao" || !context.targetId || !recoverableDamageCardIds(context).length || context.judgementCard) return null;
    return { effectId: "cao_cao_jianxiong", label: "Treachery", description: "Obtain the card that caused the damage, if it is still available.", selection: null };
  },
  resolve(context) {
    const option = caoCaoJianxiongTrigger.getOption(context);
    const cardIds = recoverableDamageCardIds(context);
    return option && context.targetId && cardIds.length
      ? { status: "resolved", effectId: "cao_cao_jianxiong", outcome: { kind: "gain_damage_cards", targetId: context.targetId, cardIds } }
      : null;
  },
};
