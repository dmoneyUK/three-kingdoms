import { isAttackCard } from "./cards";
import type { Card } from "./model";

export type ResponseKind = "Attack" | "Dodge";
export type ResponseContext = { hand: Card[]; equipment: Card[]; hero?: string | null };
type ResponseOption = { provider: string; cards: Card[] };
// Add implemented conversion skills here together with their cost/selection
// resolver. Unimplemented hero text and passive immunities are not responses.
const providers = [
  { id: "card", choices: (context: ResponseContext, kind: ResponseKind): ResponseOption[] => context.hand.filter((card) => kind === "Attack" ? isAttackCard(card) : card.kind === "Dodge").map((card) => ({ provider: "card", cards: [card] })) },
  { id: "serpent_spear", choices: (context: ResponseContext, kind: ResponseKind): ResponseOption[] => kind === "Attack" && context.equipment.some((card) => card.kind === "SerpentSpear") && context.hand.length >= 2 ? [{ provider: "serpent_spear", cards: context.hand.slice(0, 2) }] : [] },
];
export function responseOptions(context: ResponseContext, kind: ResponseKind) {
  return providers.flatMap((provider) => provider.choices(context, kind));
}
export function canRespondWithAttack(context: ResponseContext) { return responseOptions(context, "Attack").length > 0; }
export function canRespondWithDodge(context: ResponseContext) { return responseOptions(context, "Dodge").length > 0; }
export function selectResponse(context: ResponseContext, kind: ResponseKind, cardId: unknown, cardIds: unknown): ResponseOption | undefined {
  const options = responseOptions(context, kind);
  if (cardId) return options.find((option) => option.provider === "card" && option.cards[0].id === cardId);
  if (!Array.isArray(cardIds) || cardIds.length !== 2 || new Set(cardIds).size !== 2) return;
  const cards = cardIds.map((id) => context.hand.find((card) => card.id === id));
  if (options.some((option) => option.provider === "serpent_spear") && cards.every((card): card is Card => Boolean(card))) return { provider: "serpent_spear", cards };
}
