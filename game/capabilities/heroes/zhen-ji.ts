import type { ResponseProvider } from "../../responses";

/** Qingguo: Zhen Ji may use one black hand card as a Dodge response. */
export const zhenJiBlackCardDodgeProvider: ResponseProvider = {
  id: "zhen_ji_black_card_dodge",
  satisfies: "dodge",
  activation: "explicit",
  getOption: (context) => {
    if (context.hero !== "zhen-ji") return null;
    const cards = context.hand.filter((card) => card.suit === "♠" || card.suit === "♣");
    return cards.length
      ? { provider: "zhen_ji_black_card_dodge", providerId: "zhen_ji_black_card_dodge", satisfies: "dodge", label: "Use Qingguo as Dodge", cards, selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) } }
      : null;
  },
  resolve: (context) => {
    const cardId = context.selection.cardId ?? (context.selection.cardIds?.length === 1 ? context.selection.cardIds[0] : "");
    const card = context.hand.find((item) => item.id === cardId && (item.suit === "♠" || item.suit === "♣"));
    return card ? { status: "satisfied", providerId: "zhen_ji_black_card_dodge", satisfies: "dodge", consumeCardIds: [card.id], resolution: "cards" } : null;
  },
};
