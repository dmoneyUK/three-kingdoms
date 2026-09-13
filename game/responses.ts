import type { Card } from "./model";
import { physicalAttackProvider, physicalDodgeProvider, physicalNegationProvider } from "./capabilities/cards";
import { eightTrigramsDodgeProvider } from "./capabilities/equipment/eight-trigrams";
import { serpentSpearAttackProvider } from "./capabilities/equipment/serpent-spear";
import { zhenJiBlackCardDodgeProvider } from "./capabilities/heroes/zhen-ji";

export type ResponseKind = "Attack" | "Dodge";
export type ResponseContext = { hand: Card[]; equipment: Card[]; hero?: string | null };
export type SemanticAction = "attack" | "dodge" | "damage" | "recover" | "draw" | "discard" | "negate" | "judgement" | "gain_card" | "lose_card";
export type ActionRequirement =
  | { kind: "dodge"; sourceId?: string; targetId?: string; attack?: unknown }
  | { kind: "attack"; sourceId?: string; actorId?: string; context?: "duel" | "barbarian_invasion" | "green_dragon" }
  | { kind: "negate"; sourceId?: string; targetId?: string };
export type ResponseSelection = { type: "cards"; min: number; max: number; eligibleCardIds: string[] } | null;
export type CapabilityContext = ResponseContext & { requirement: ActionRequirement };
export type ResponseActivation = "implicit" | "explicit";
export type ResponseOption = { provider: string; providerId: string; satisfies: "attack" | "dodge" | "negate"; activation: ResponseActivation; label: string; cards: Card[]; selection: ResponseSelection };
export type ResponseProviderOption = Omit<ResponseOption, "activation">;
export type ResponseSelectionInput = { cardId?: unknown; cardIds?: unknown };
/** A provider reports the semantic result and costs, never an HTTP action. */
export type ResponseExecution = {
  status: "satisfied";
  providerId: string;
  satisfies: "attack" | "dodge" | "negate";
  consumeCardIds?: string[];
  resolution?: "cards" | "judgement";
};
export type ResponseExecutionContext = CapabilityContext & { pendingKind: "attack" | "group" | "duel" | "negation"; selection: { cardId?: string; cardIds?: string[] } };
export type ResponseProvider = { id: string; satisfies: "attack" | "dodge" | "negate"; activation: ResponseActivation; getOption: (context: CapabilityContext) => ResponseProviderOption | null; resolve: (context: ResponseExecutionContext) => ResponseExecution | null };

// Providers own their availability and resolver choice. The engine only asks
// the currently valid provider to satisfy an abstract requirement.
const providers: ResponseProvider[] = [
  physicalAttackProvider, physicalDodgeProvider, physicalNegationProvider,
  eightTrigramsDodgeProvider, serpentSpearAttackProvider, zhenJiBlackCardDodgeProvider,
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
  return providers.filter((provider) => provider.satisfies === satisfies).flatMap((provider) => {
    const option = provider.getOption(context);
    return option ? [{ ...option, activation: provider.activation }] : [];
  });
}

export function resolveResponseProvider(providerId: unknown, context: ResponseExecutionContext) {
  if (typeof providerId !== "string") return null;
  const provider = providers.find((candidate) => candidate.id === providerId && candidate.satisfies === context.requirement.kind);
  if (!provider || !provider.getOption(context)) return null;
  return provider.resolve(context);
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
