export type ViewerHandCardIdentity = { id: string };

export type ProjectedHandChoice = {
  key: string;
  cardId: string;
};

const HAND_POSITION_KEY = /^hand:(0|[1-9]\d*)$/;

/** Map server-authorized opaque hand positions onto this viewer's private hand only. */
export function projectEligibleHandChoices(
  eligibleKeys: readonly string[],
  hand: readonly ViewerHandCardIdentity[],
): ProjectedHandChoice[] {
  const seenKeys = new Set<string>();
  const seenCardIds = new Set<string>();
  const projected: ProjectedHandChoice[] = [];

  for (const key of eligibleKeys) {
    const match = HAND_POSITION_KEY.exec(key);
    if (!match || seenKeys.has(key)) continue;
    const index = Number(match[1]);
    if (!Number.isSafeInteger(index)) continue;
    const cardId = hand[index]?.id;
    if (typeof cardId !== "string" || !cardId || seenCardIds.has(cardId)) continue;
    seenKeys.add(key);
    seenCardIds.add(cardId);
    projected.push({ key, cardId });
  }
  return projected;
}

export function normalizeHandChoiceKeys(
  selectedKeys: readonly string[],
  eligibleKeys: readonly string[],
): string[] {
  const eligible = new Set(eligibleKeys);
  const seen = new Set<string>();
  return selectedKeys.filter((key) => {
    if (!eligible.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function toggleHandChoiceKey(
  selectedKeys: readonly string[],
  key: string,
  eligibleKeys: readonly string[],
  maximum: number,
): string[] {
  const selected = normalizeHandChoiceKeys(selectedKeys, eligibleKeys);
  if (!eligibleKeys.includes(key)) return selected;
  if (selected.includes(key)) return selected.filter((candidate) => candidate !== key);
  return selected.length < Math.max(0, maximum) ? [...selected, key] : selected;
}
