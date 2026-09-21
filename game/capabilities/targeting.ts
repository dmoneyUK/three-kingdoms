import type { CardKind } from "../model";
import { luXunModesty } from "./heroes/lu-xun-modesty";

export type TargetLegalityContext = {
  sourceId: string;
  targetId: string;
  targetHero?: string | null;
  cardKind: CardKind;
};

export type TargetLegalityCapability = {
  id: string;
  canTarget: (context: TargetLegalityContext) => boolean;
};

const targetLegalityCapabilities: readonly TargetLegalityCapability[] = [luXunModesty];

/** Returns whether every active passive target restriction permits this target. */
export function canTargetCharacter(context: TargetLegalityContext) {
  return targetLegalityCapabilities.every((capability) => capability.canTarget(context));
}
