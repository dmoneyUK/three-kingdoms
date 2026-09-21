/** Semantic causes that can be modified before one physical damage event settles. */
export type DamageCause = "attack" | "duel" | "other";

export type DamageModifierContext = {
  sourceId?: string | null;
  sourceHero?: string | null;
  cause: DamageCause;
  baseAmount: number;
  turnState: { turnPlayerId?: string; baredBodiedActive?: boolean };
};

/** Resolves turn-scoped damage modifiers without splitting the damage event. */
export function resolveDamageModifiers({ sourceId, sourceHero, cause, baseAmount, turnState }: DamageModifierContext) {
  if (sourceHero === "xu-chu" && sourceId && turnState.turnPlayerId === sourceId && turnState.baredBodiedActive && (cause === "attack" || cause === "duel")) {
    return baseAmount + 1;
  }
  return baseAmount;
}
