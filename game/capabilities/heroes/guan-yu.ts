import type { ResponseProvider } from "../../responses";

const isRed = (suit: string) => suit === "♥" || suit === "♦";

/** Wusheng: a red suited hand card may be used or played as an Attack. */
export const guanYuRedCardAttackProvider: ResponseProvider = {
  id: "guan_yu_red_card_attack",
  satisfies: "attack",
  activation: "explicit",
  getOption: (context) => {
    if (context.hero !== "guan-yu") return null;
    const cards = context.hand.filter((card) => isRed(card.suit));
    return cards.length
      ? { provider: "guan_yu", providerId: "guan_yu_red_card_attack", satisfies: "attack", label: "Use Wusheng as Attack", cards, selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) } }
      : null;
  },
  resolve: (context) => {
    if (context.hero !== "guan-yu") return null;
    const cardId = context.selection.cardId ?? (context.selection.cardIds?.length === 1 ? context.selection.cardIds[0] : "");
    const card = context.hand.find((item) => item.id === cardId && isRed(item.suit));
    return card ? { status: "satisfied", providerId: "guan_yu_red_card_attack", satisfies: "attack", consumeCardIds: [card.id], resolution: "cards" } : null;
  },
};
