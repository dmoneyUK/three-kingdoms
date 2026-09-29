import type { CardKind } from "../model";
import { luXunModesty } from "./heroes/lu-xun-modesty";
import { zhugeLiangEmptyFortress } from "./heroes/zhuge-liang-empty-fortress";

export type TargetLegalityContext = {
  sourceId: string;
  targetId: string;
  targetHero?: string | null;
  targetHandCount?: number;
  cardKind: CardKind;
};

export type TargetLegalityCapability = {
  id: string;
  canTarget: (context: TargetLegalityContext) => boolean;
};

const targetLegalityCapabilities: readonly TargetLegalityCapability[] = [luXunModesty, zhugeLiangEmptyFortress];

/** Returns whether every active passive target restriction permits this target. */
export function canTargetCharacter(context: TargetLegalityContext) {
  return targetLegalityCapabilities.every((capability) => capability.canTarget(context));
}
