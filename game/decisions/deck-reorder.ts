import type { Card } from "../model";

/** Stargazing's authoritative character-count rule. */
export function deckReorderCount(characterCount: number) {
  return Math.min(5, Math.max(0, Math.floor(characterCount)));
}

/** The top list is next-to-draw first; the bottom list is top-to-bottom. */
export function rebuildDeckForReorder(remainingDeck: Card[], held: Card[], topCardIds: string[], bottomCardIds: string[]) {
  const heldById = new Map(held.map((card) => [card.id, card]));
  const submitted = [...topCardIds, ...bottomCardIds];
  if (heldById.size !== held.length || submitted.length !== held.length || new Set(submitted).size !== held.length || submitted.some((id) => !heldById.has(id)) || held.some((card) => !submitted.includes(card.id))) return null;
  return [...topCardIds.map((id) => heldById.get(id)!), ...remainingDeck, ...bottomCardIds.map((id) => heldById.get(id)!)];
}
