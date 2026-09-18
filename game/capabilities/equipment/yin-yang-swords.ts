import type { TriggerExecution, TriggerOption, TriggerContext } from "../triggers";

const id = "yin_yang_swords_attack_targeted";
export const yinYangSwordsAttackTargeted = {
  id,
  event: "attack_targeted" as const,
  getOption(context: TriggerContext): TriggerOption | null {
    if (context.event !== "attack_targeted" || !context.sourceEquipment.some((card) => card.kind === "YinYangSwords")) return null;
    if (!context.sourceGender || !context.targetGender || context.sourceGender === context.targetGender) return null;
    const choices = [{ id: "draw", label: "Allow attacker to draw 1 card" }];
    if ((context.targetHand?.length ?? 0) > 0) choices.unshift({ id: "discard", label: "Discard 1 hand card" });
    return { effectId: id, label: "Yin-Yang Swords", allowDecline: false, timeoutChoiceId: "draw", selection: { type: "choice", choices, eligibleHandKeys: (context.targetHand ?? []).map((_, index) => `hand:${index}`) } };
  },
  resolve(context: TriggerContext, selection: { choice?: unknown; cardKeys?: unknown }): TriggerExecution | null {
    const option = yinYangSwordsAttackTargeted.getOption(context); const choice = String(selection.choice ?? "");
    if (!option || !option.selection || !option.selection.choices.some((entry) => entry.id === choice)) return null;
    if (choice === "draw") return { status: "resolved", effectId: this.id, outcome: { kind: "attacker_draw" } };
    if (!Array.isArray(selection.cardKeys) || selection.cardKeys.length !== 1 || typeof selection.cardKeys[0] !== "string") return null;
    const key = selection.cardKeys[0] as string; const match = /^hand:(\d+)$/.exec(key); const index = match ? Number(match[1]) : -1;
    if (index < 0 || !context.targetHand?.[index]) return null;
    return { status: "resolved", effectId: id, outcome: { kind: "target_discard", targetCardId: context.targetHand[index].id } };
  },
};
