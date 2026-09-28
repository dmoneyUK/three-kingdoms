import type { Card, GamePlayer } from "../model";
import { gongsunZanMilitia } from "./heroes/gongsun-zan-militia";
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
export const distanceModifierProviders: DistanceModifierProvider[] = [mountDistanceModifier, gongsunZanMilitia];

/** Test and future capability modules can add a narrowly scoped distance provider. */
export function registerDistanceModifier(provider: DistanceModifierProvider) {
  distanceModifierProviders.push(provider);
  return () => {
    const index = distanceModifierProviders.indexOf(provider);
    if (index >= 0) distanceModifierProviders.splice(index, 1);
  };
}

/** Resolves directional modifiers without changing raw seat distance. */
export function resolveEffectiveDistance<T extends DistancePlayer>(context: DistanceModifierContext<T>) {
  // distanceBetween() uses 99 for missing/dead endpoints. Preserve that
  // sentinel rather than allowing a modifier to turn it into a legal range.
  if (!Number.isFinite(context.rawDistance) || context.rawDistance >= 99) return context.rawDistance;
  const modifiers = distanceModifierProviders.reduce((total, provider) => {
    const result = provider.getModifier(context);
    return {
      outbound: total.outbound + (result?.outbound ?? 0),
      inbound: total.inbound + (result?.inbound ?? 0),
    };
  }, { outbound: 0, inbound: 0 });
  return Math.max(1, context.rawDistance + modifiers.outbound + modifiers.inbound);
}
