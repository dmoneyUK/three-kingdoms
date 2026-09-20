import { isAttackCard } from "../cards";
import type { Card } from "../model";
import type { ResponseProvider } from "../responses";

function selectedCard(context: Parameters<ResponseProvider["resolve"]>[0], cards: Card[]) {
  const cardId = context.selection.cardId ?? (context.selection.cardIds?.length === 1 ? context.selection.cardIds[0] : "");
  return cards.find((card) => card.id === cardId) ?? null;
}

export const physicalAttackProvider: ResponseProvider = {
  id: "card",
  satisfies: "attack",
  activation: "implicit",
  getOption: (context) => {
    const cards = context.hand.filter(isAttackCard);
    const count = context.requirement.count ?? 1;
    return cards.length >= count ? { provider: "card", providerId: "card", satisfies: "attack", label: count === 1 ? "Play Attack" : `Play ${count} Attacks`, cards, selection: { type: "cards", min: count, max: count, eligibleCardIds: cards.map((card) => card.id) } } : null;
  },
  resolve: (context) => {
    const cards = context.hand.filter(isAttackCard);
    const selected = context.selection.cardIds ?? (context.selection.cardId ? [context.selection.cardId] : []);
    const count = context.requirement.count ?? 1;
    if (selected.length !== count || new Set(selected).size !== selected.length || selected.some((id) => !cards.some((card) => card.id === id))) return null;
    return { status: "satisfied", providerId: "card", satisfies: "attack", consumeCardIds: selected, resolution: "cards" };
  },
};

export const physicalDodgeProvider: ResponseProvider = {
  id: "card",
  satisfies: "dodge",
  activation: "implicit",
  getOption: (context) => {
    const cards = context.hand.filter((card) => card.kind === "Dodge");
    const count = context.requirement.count ?? 1;
    return cards.length >= count ? { provider: "card", providerId: "card", satisfies: "dodge", label: count === 1 ? "Play Dodge" : `Play ${count} Dodges`, cards, selection: { type: "cards", min: count, max: count, eligibleCardIds: cards.map((card) => card.id) } } : null;
  },
  resolve: (context) => {
    const cards = context.hand.filter((card) => card.kind === "Dodge");
    const selected = context.selection.cardIds ?? (context.selection.cardId ? [context.selection.cardId] : []);
    const count = context.requirement.count ?? 1;
    if (selected.length !== count || new Set(selected).size !== selected.length || selected.some((id) => !cards.some((card) => card.id === id))) return null;
    return { status: "satisfied", providerId: "card", satisfies: "dodge", consumeCardIds: selected, resolution: "cards" };
  },
};

export const physicalNegationProvider: ResponseProvider = {
  id: "negation_card",
  satisfies: "negate",
  activation: "implicit",
  getOption: (context) => {
    const cards = context.hand.filter((card) => card.kind === "Negation");
    return cards.length ? { provider: "negation_card", providerId: "negation_card", satisfies: "negate", label: "Play Negation", cards, selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) } } : null;
  },
  resolve: (context) => {
    const card = selectedCard(context, context.hand.filter((item) => item.kind === "Negation"));
    return card ? { status: "satisfied", providerId: "negation_card", satisfies: "negate", consumeCardIds: [card.id], resolution: "cards" } : null;
  },
};
