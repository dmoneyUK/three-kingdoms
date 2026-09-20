import type { TriggeredEffect, TriggerContext } from "../triggers";

const id = "sima_yi_fankui";

function eligibleKeys(context: TriggerContext) {
  return [
    ...(context.sourceHand ?? []).map((_, index) => `hand:${index}`),
    ...(context.sourceEquipment ?? []).map((card) => card.id),
    ...(context.sourceJudgement ?? []).map((card) => card.id),
  ];
}

/** Retaliation/Fankui obtains one card from the damage source's Playing Area. */
export const simaYiFankuiTrigger: TriggeredEffect = {
  id,
  event: "damage_suffered",
  getOption(context) {
    if (context.event !== "damage_suffered" || context.targetHero !== "simayi" || !context.sourceId || context.judgementCard) return null;
    const keys = eligibleKeys(context);
    return keys.length
      ? { effectId: id, label: "Retaliation", selection: { type: "target_cards", targetId: context.sourceId, min: 1, max: 1, eligibleKeys: keys } }
      : null;
  },
  resolve(context, selection) {
    const option = simaYiFankuiTrigger.getOption(context);
    if (!option || !context.sourceId || !context.targetId || !Array.isArray(selection.cardKeys) || selection.cardKeys.length !== 1 || typeof selection.cardKeys[0] !== "string") return null;
    const targetCardKey = selection.cardKeys[0];
    if (!option.selection || option.selection.type !== "target_cards" || !option.selection.eligibleKeys.includes(targetCardKey)) return null;
    return { status: "resolved", effectId: id, outcome: { kind: "gain_target_card", sourceId: context.sourceId, targetId: context.targetId, targetCardKey } };
  },
};
