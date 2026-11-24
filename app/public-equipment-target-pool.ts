import type { Card } from "../game/model";

export type EquipmentTargetSelection = {
  targetId: string;
  min: number;
  max: number;
  eligibleKeys: readonly string[];
};

export type PublicEquipmentOwner = {
  id: string;
  equipmentCards: readonly Card[];
};

export type ScopedPublicEquipmentPool = {
  eligibleKeys: string[];
  publicTarget: {
    handCount: 0;
    equipmentCards: Card[];
    judgementCards: [];
  };
};

/**
 * Project a server-authorized, equipment-only target selection into the
 * smallest truthful public pool. Every returned face keeps its physical card
 * identity; unrelated equipment and all non-equipment zones are excluded.
 */
export function projectPublicEquipmentTargetPool(
  selection: EquipmentTargetSelection,
  target: PublicEquipmentOwner,
): ScopedPublicEquipmentPool | null {
  if (selection.targetId !== target.id || selection.min !== 1 || selection.max !== 1) return null;
  if (selection.eligibleKeys.length === 0 || new Set(selection.eligibleKeys).size !== selection.eligibleKeys.length) return null;

  const cardsById = new Map<string, Card>();
  for (const card of target.equipmentCards) {
    if (cardsById.has(card.id)) return null;
    cardsById.set(card.id, card);
  }

  const equipmentCards = selection.eligibleKeys.map((key) => cardsById.get(key));
  if (equipmentCards.some((card) => !card)) return null;
  const provenCards = equipmentCards as Card[];

  return {
    eligibleKeys: [...selection.eligibleKeys],
    publicTarget: { handCount: 0, equipmentCards: provenCards, judgementCards: [] },
  };
}
