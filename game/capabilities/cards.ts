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
    return cards.length ? { provider: "card", providerId: "card", satisfies: "attack", label: "Play Attack", cards, selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) } } : null;
  },
  resolve: (context) => {
    const cards = context.hand.filter(isAttackCard);
    const selected = context.selection.cardIds ?? (context.selection.cardId ? [context.selection.cardId] : []);
    if (selected.length !== 1 || !cards.some((card) => card.id === selected[0])) return null;
    return { status: "satisfied", providerId: "card", satisfies: "attack", consumeCardIds: selected, resolution: "cards" };
  },
};

export const physicalDodgeProvider: ResponseProvider = {
  id: "card",
  satisfies: "dodge",
  activation: "implicit",
  getOption: (context) => {
    const cards = context.hand.filter((card) => card.kind === "Dodge");
    return cards.length ? { provider: "card", providerId: "card", satisfies: "dodge", label: "Play Dodge", cards, selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) } } : null;
  },
  resolve: (context) => {
    const cards = context.hand.filter((card) => card.kind === "Dodge");
    const selected = context.selection.cardIds ?? (context.selection.cardId ? [context.selection.cardId] : []);
    if (selected.length !== 1 || !cards.some((card) => card.id === selected[0])) return null;
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

export const physicalPeachProvider: ResponseProvider = {
  id: "card",
  satisfies: "peach",
  activation: "implicit",
  getOption: (context) => {
    const cards = context.hand.filter((card) => card.kind === "Peach");
    return cards.length ? { provider: "card", providerId: "card", satisfies: "peach", label: "Play Peach", cards, selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) }, playedAs: "peach" as const } : null;
  },
  resolve: (context) => {
    const card = selectedCard(context, context.hand.filter((item) => item.kind === "Peach"));
    return card ? { status: "satisfied", providerId: "card", satisfies: "peach", consumeCardIds: [card.id], resolution: "cards", playedAs: "peach" } : null;
  },
};
