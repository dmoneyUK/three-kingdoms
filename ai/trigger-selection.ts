import type { TriggerOption } from "../game/capabilities/triggers";

type TriggerChoice = {
  providerId: string;
  cardId?: string;
  cardIds?: string[];
  targetId?: string;
  targetIds?: string[];
  cardKeys?: string[];
  choice?: string;
};

function takeOffered(ids: readonly string[], min: number, max: number) {
  if (!Number.isSafeInteger(min) || min < 0 || !Number.isSafeInteger(max) || max < min) return null;
  const distinct = [...new Set(ids.filter(Boolean))];
  return distinct.length >= min ? distinct.slice(0, min) : null;
}

/** Builds payloads from an actor-private option. Hidden target cards remain opaque keys. */
export function botTriggerChoices(option: TriggerOption, ownCards: ReadonlySet<string>): TriggerChoice[] {
  const { selection, effectId: providerId } = option;
  if (!selection) return [{ providerId }];
  switch (selection.type) {
    case "cards": {
      const cardIds = takeOffered(selection.eligibleCardIds.filter((id) => ownCards.has(id)).sort(), selection.min, selection.max);
      const targetIds = selection.targetIds
        ? takeOffered(selection.targetIds, selection.targetMin ?? 1, selection.targetMax ?? 1)
        : [];
      if (!cardIds || !targetIds) return [];
      return [{ providerId, cardIds, ...(cardIds.length === 1 ? { cardId: cardIds[0] } : {}),
        ...(targetIds.length ? { targetIds, ...(targetIds.length === 1 ? { targetId: targetIds[0] } : {}) } : {}) }];
    }
    case "target": {
      const targetIds = takeOffered(selection.targetIds, selection.min ?? 1, selection.max ?? 1);
      return targetIds ? [{ providerId, targetIds, ...(targetIds.length === 1 ? { targetId: targetIds[0] } : {}) }] : [];
    }
    case "target_cards": {
      const cardKeys = takeOffered(selection.eligibleKeys, selection.min, selection.max);
      return cardKeys ? [{ providerId, cardKeys }] : [];
    }
    case "choice":
      return selection.choices.flatMap(({ id }) => {
        const count = selection.cardCountByChoice?.[id] ?? 0;
        const cardKeys = takeOffered(selection.eligibleHandKeys, count, count);
        return cardKeys ? [{ providerId, choice: id, cardKeys }] : [];
      });
    case "choice_and_target_cards": {
      const cardKeys = takeOffered(selection.eligibleKeys, selection.min, selection.max);
      return cardKeys ? selection.choices.map(({ id }) => ({ providerId, choice: id, cardKeys })) : [];
    }
  }
}
