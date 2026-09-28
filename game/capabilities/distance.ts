import type { Card, GamePlayer } from "../model";
import { gongsunZanMilitia } from "./heroes/gongsun-zan-militia";
import { maChaoHorseRiding } from "./heroes/ma-chao-horse-riding";
import { mountDistanceModifier } from "./equipment/distance";

export type DistancePlayer = GamePlayer & { hp?: number | null };
export type DistanceModifierContext<T extends DistancePlayer = DistancePlayer> = {
  source: T;
  target: T;
  rawDistance: number;
  sourceEquipment: Card[];
  targetEquipment: Card[];
};
export type DistanceModifierResult = { outbound?: number; inbound?: number };
export type DistanceModifierProvider = {
  id: string;
  getModifier: (context: DistanceModifierContext) => DistanceModifierResult | null;
};

/** Bounded providers for effective character-to-character distance. */
export const distanceModifierProviders: readonly DistanceModifierProvider[] = [mountDistanceModifier, gongsunZanMilitia, maChaoHorseRiding];

/** Resolves directional modifiers without changing raw seat distance. */
export function resolveEffectiveDistance<T extends DistancePlayer>(context: DistanceModifierContext<T>) {
  // distanceBetween() uses 99 for missing/dead endpoints. Preserve that
  // sentinel rather than allowing a modifier to turn it into a legal range.
  if (!Number.isFinite(context.rawDistance) || context.rawDistance >= 99) return context.rawDistance;
  // Self-distance is a structural property of the seat graph, not a legal
  // character range. Providers must never turn it into 1 (or another value).
  if (context.rawDistance === 0) return 0;
  const modifiers = distanceModifierProviders.reduce((total, provider) => {
    const result = provider.getModifier(context);
    return {
      outbound: total.outbound + (result?.outbound ?? 0),
      inbound: total.inbound + (result?.inbound ?? 0),
    };
  }, { outbound: 0, inbound: 0 });
  return Math.max(1, context.rawDistance + modifiers.outbound + modifiers.inbound);
}
