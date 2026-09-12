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
  getOption: (context) => {
    const cards = context.hand.filter(isAttackCard);
    return cards.length ? { provider: "card", providerId: "card", satisfies: "attack", label: "Play Attack", cards, selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) } } : null;
  },
  resolve: (context) => {
    const card = selectedCard(context, context.hand.filter(isAttackCard));
    if (!card) return null;
    return context.pendingKind === "group" ? { action: "respond_group" } : context.pendingKind === "duel" ? { action: "respond_duel" } : null;
  },
};

export const physicalDodgeProvider: ResponseProvider = {
  id: "card",
  satisfies: "dodge",
  getOption: (context) => {
    const cards = context.hand.filter((card) => card.kind === "Dodge");
    return cards.length ? { provider: "card", providerId: "card", satisfies: "dodge", label: "Play Dodge", cards, selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) } } : null;
  },
  resolve: (context) => {
    const card = selectedCard(context, context.hand.filter((card) => card.kind === "Dodge"));
    if (!card) return null;
    return context.pendingKind === "attack" ? { action: "respond_dodge" } : context.pendingKind === "group" ? { action: "respond_group" } : null;
  },
};

export const physicalNegationProvider: ResponseProvider = {
  id: "negation_card",
  satisfies: "negate",
  getOption: (context) => {
    const cards = context.hand.filter((card) => card.kind === "Negation");
    return cards.length ? { provider: "negation_card", providerId: "negation_card", satisfies: "negate", label: "Play Negation", cards, selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) } } : null;
  },
  resolve: (context) => selectedCard(context, context.hand.filter((card) => card.kind === "Negation")) && context.pendingKind === "negation" ? { action: "respond_negation" } : null,
};
