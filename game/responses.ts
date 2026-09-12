import { isAttackCard } from "./cards";
import type { Card } from "./model";

export type ResponseKind = "Attack" | "Dodge";
export type ResponseContext = { hand: Card[]; equipment: Card[]; hero?: string | null };
export type SemanticAction = "attack" | "dodge" | "damage" | "recover" | "draw" | "discard" | "negate" | "judgement" | "gain_card" | "lose_card";
export type ActionRequirement =
  | { kind: "dodge"; sourceId?: string; targetId?: string; attack?: unknown }
  | { kind: "attack"; sourceId?: string; actorId?: string; context?: "duel" | "barbarian_invasion" | "green_dragon" };
export type ResponseSelection = { type: "cards"; min: number; max: number; eligibleCardIds: string[] } | null;
export type CapabilityContext = ResponseContext & { requirement: ActionRequirement };
export type ResponseOption = { provider: string; providerId: string; satisfies: "attack" | "dodge"; label: string; cards: Card[]; selection: ResponseSelection };
export type ResponseProvider = { id: string; satisfies: "attack" | "dodge"; getOption: (context: CapabilityContext) => ResponseOption | null };
// Add implemented conversion skills here together with their cost/selection
// resolver. Unimplemented hero text and passive immunities are not responses.
const providers: ResponseProvider[] = [
  {
    id: "card",
    satisfies: "attack",
    getOption: (context) => {
      const cards = context.hand.filter(isAttackCard);
      return cards.length ? { provider: "card", providerId: "card", satisfies: "attack", label: "Play Attack", cards, selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) } } : null;
    },
  },
  {
    id: "card",
    satisfies: "dodge",
    getOption: (context) => {
      const cards = context.hand.filter((card) => card.kind === "Dodge");
      return cards.length ? { provider: "card", providerId: "card", satisfies: "dodge", label: "Play Dodge", cards, selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) } } : null;
    },
  },
  {
    id: "eight_trigrams_dodge",
    satisfies: "dodge",
    getOption: (context) => context.equipment.some((card) => card.kind === "EightTrigrams")
      ? { provider: "eight_trigrams", providerId: "eight_trigrams_dodge", satisfies: "dodge", label: "Use Eight Trigrams", cards: [], selection: null }
      : null,
  },
  {
    id: "serpent_spear_attack",
    satisfies: "attack",
    getOption: (context) => context.equipment.some((card) => card.kind === "SerpentSpear") && context.hand.length >= 2
      ? { provider: "serpent_spear", providerId: "serpent_spear_attack", satisfies: "attack", label: "Use Serpent Spear", cards: context.hand.slice(0, 2), selection: { type: "cards", min: 2, max: 2, eligibleCardIds: context.hand.map((card) => card.id) } }
      : null,
  },
];

export function registerResponseProvider(provider: ResponseProvider) {
  providers.push(provider);
  return () => {
    const index = providers.indexOf(provider);
    if (index >= 0) providers.splice(index, 1);
  };
}

export function getResponseOptions(context: CapabilityContext, requirement: ActionRequirement) {
  const satisfies = requirement.kind;
  return providers.filter((provider) => provider.satisfies === satisfies).map((provider) => provider.getOption(context)).filter((option): option is ResponseOption => Boolean(option));
}

export function responseOptions(context: ResponseContext, kind: ResponseKind) {
  return getResponseOptions({ ...context, requirement: { kind: kind === "Attack" ? "attack" : "dodge" } }, { kind: kind === "Attack" ? "attack" : "dodge" }).flatMap((option) => option.provider === "card"
    ? option.cards.map((card) => ({ ...option, cards: [card], selection: { type: "cards" as const, min: 1, max: 1, eligibleCardIds: [card.id] } }))
    : [option]);
}
export function canRespondWithAttack(context: ResponseContext) { return responseOptions(context, "Attack").length > 0; }
export function canRespondWithDodge(context: ResponseContext) { return responseOptions(context, "Dodge").length > 0; }
export function selectResponse(context: ResponseContext, kind: ResponseKind, cardId: unknown, cardIds: unknown): ResponseOption | undefined {
  const options = responseOptions(context, kind);
  if (cardId) return options.find((option) => option.provider === "card" && option.cards.some((card) => card.id === cardId));
  if (!Array.isArray(cardIds) || cardIds.length !== 2 || new Set(cardIds).size !== 2) return;
  const cards = cardIds.map((id) => context.hand.find((card) => card.id === id));
  if (options.some((option) => option.provider === "serpent_spear") && cards.every((card): card is Card => Boolean(card))) return { provider: "serpent_spear", cards };
}
