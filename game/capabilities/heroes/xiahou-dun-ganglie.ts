import type { TriggeredEffect, TriggerExecution, TriggerOption, TriggerContext } from "../triggers";

const id = "xiahou_dun_ganglie";

/** Stauchness/Ganglie: the post-damage provider owns its optional reaction and source consequence. */
export const xiahouDunGanglieTrigger: TriggeredEffect = {
  id,
  event: "damage_suffered",
  getOption(context: TriggerContext): TriggerOption | null {
    if (context.event !== "damage_suffered" || context.targetHero !== "xiahou-dun" || !context.sourceId) return null;
    if (!context.judgementCard) return { effectId: id, label: "Use Stauchness", selection: null };
    if (context.judgementPurpose !== "ganglie" || context.judgementCard.suit === "♥") return null;
    const choices = [{ id: "take_damage", label: "Take 1 damage from Xiahou Dun" }];
    if ((context.sourceHand?.length ?? 0) >= 2) choices.unshift({ id: "discard_two", label: "Discard 2 hand cards" });
    return {
      effectId: id,
      label: "Stauchness",
      allowDecline: false,
      timeoutChoiceId: "take_damage",
      selection: {
        type: "choice",
        choices,
        eligibleHandKeys: (context.sourceHand ?? []).map((_, index) => `hand:${index}`),
        cardCountByChoice: { discard_two: 2 },
      },
    };
  },
  resolve(context: TriggerContext, selection: { choice?: unknown; cardKeys?: unknown }): TriggerExecution | null {
    const option = xiahouDunGanglieTrigger.getOption(context);
    if (!option) return null;
    if (!context.judgementCard) return selection.choice === undefined && selection.cardKeys === undefined
      ? { status: "resolved", effectId: id, outcome: { kind: "judgement" } }
      : null;
    const choice = String(selection.choice ?? "");
    if (!option.selection || option.selection.type !== "choice" || !option.selection.choices.some((entry) => entry.id === choice)) return null;
    if (choice === "take_damage") return { status: "resolved", effectId: id, outcome: { kind: "damage_player", targetId: context.sourceId, amount: 1 } };
    if (choice !== "discard_two" || !Array.isArray(selection.cardKeys) || selection.cardKeys.length !== 2 || new Set(selection.cardKeys).size !== 2 || selection.cardKeys.some((key) => typeof key !== "string")) return null;
    const ids = selection.cardKeys as string[];
    const selected = ids.map((key) => /^hand:(\d+)$/.exec(key)).map((match) => match ? Number(match[1]) : -1);
    if (selected.some((index) => index < 0 || !context.sourceHand?.[index])) return null;
    return { status: "resolved", effectId: id, outcome: { kind: "discard_cards", targetId: context.sourceId, targetCardIds: selected.map((index) => context.sourceHand![index].id) } };
  },
};
