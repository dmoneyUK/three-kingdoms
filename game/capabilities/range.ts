import type { CardKind, GamePlayer } from "../model";
import { huangYueyingWizardry } from "./heroes/huang-yueying-wizardry";

export type RangeContext<T extends GamePlayer = GamePlayer> = {
  source: T;
  target: T;
  effectiveCardKind: CardKind;
  effectiveDistance: number;
  ordinaryRange: number;
};
export type RangeCapability = {
  id: string;
  ignoresRange: (context: RangeContext) => boolean;
};

const rangeCapabilities: readonly RangeCapability[] = [huangYueyingWizardry];

/** Range is independent from card-specific target restrictions. */
export function isWithinRange<T extends GamePlayer>(context: RangeContext<T>) {
  return rangeCapabilities.some((capability) => capability.ignoresRange(context)) || context.effectiveDistance <= context.ordinaryRange;
}
