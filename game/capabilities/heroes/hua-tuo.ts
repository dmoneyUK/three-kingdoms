import type { ResponseProvider } from "../../responses";

/** First Aid is a semantic Peach provider; Dying does not identify Hua Tuo. */
export const huaTuoFirstAidProvider: ResponseProvider = {
  id: "hua_tuo_first_aid",
  satisfies: "peach",
  activation: "explicit",
  getOption: (context) => {
    const cards = context.hero === "hua-tuo" && context.turnPlayerId !== undefined && context.turnPlayerId !== context.playerId
      ? context.hand.filter((card) => card.kind !== "Peach" && (card.suit === "♥" || card.suit === "♦"))
      : [];
    return cards.length ? {
      provider: "hua_tuo_first_aid",
      providerId: "hua_tuo_first_aid",
      satisfies: "peach" as const,
      label: "Use a red card as Peach (First Aid)",
      cards,
      selection: { type: "cards" as const, min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) },
      playedAs: "peach" as const,
    } : null;
  },
  resolve: (context) => {
    const option = huaTuoFirstAidProvider.getOption(context);
    const selected = context.selection.cardIds ?? (context.selection.cardId ? [context.selection.cardId] : []);
    if (!option || selected.length !== 1 || selected.some((id) => !option.selection?.eligibleCardIds.includes(id))) return null;
    return { status: "satisfied", providerId: "hua_tuo_first_aid", satisfies: "peach", consumeCardIds: selected, resolution: "cards", playedAs: "peach" };
  },
};
