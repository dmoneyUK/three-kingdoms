import { cardDefinition } from "../cards";
import type { Card, EquipmentZone, GamePlayer } from "../model";
import { effectiveDistanceBetween } from "../rules";
import { canTargetCharacter } from "./targeting";

export type BorrowedSwordPlayer = GamePlayer & {
  handCount: number;
  equipment: EquipmentZone;
};

export type BorrowedSwordLegality = {
  eligibleHolderIds: string[];
  forcedTargetIdsByHolderId: Record<string, string[]>;
};

/**
 * Resolves Borrowed Sword as a complete executable path: the chosen character
 * must hold a Weapon and have at least one legal Attack target. The source is
 * a valid forced target when the holder can legally Attack them.
 */
export function borrowedSwordLegality(players: BorrowedSwordPlayer[], sourceId: string): BorrowedSwordLegality {
  const source = players.find((player) => player.id === sourceId && Boolean(player.alive));
  if (!source) return { eligibleHolderIds: [], forcedTargetIdsByHolderId: {} };

  const paths = players.flatMap((holder) => {
    const weapon = holder.equipment.weapon;
    if (!holder.alive || holder.id === source.id || !weapon) return [];
    const attackRange = cardDefinition(weapon.kind).attackRange ?? 1;
    const forcedTargetIds = players.filter((target) => {
      if (!target.alive || target.id === holder.id) return false;
      const distance = effectiveDistanceBetween(players, holder.id, target.id, (player) =>
        Object.values(player.equipment).filter((card): card is Card => Boolean(card)),
      );
      return distance <= attackRange && canTargetCharacter({
        sourceId: holder.id,
        targetId: target.id,
        targetHero: target.hero,
        targetHandCount: target.handCount,
        cardKind: "Attack",
      });
    }).map((target) => target.id);
    return forcedTargetIds.length ? [{ holderId: holder.id, forcedTargetIds }] : [];
  });

  return {
    eligibleHolderIds: paths.map((path) => path.holderId),
    forcedTargetIdsByHolderId: Object.fromEntries(paths.map((path) => [path.holderId, path.forcedTargetIds])),
  };
}
