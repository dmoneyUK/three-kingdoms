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
 * Borrowed Sword may target any other living Weapon holder. The forced Attack
 * target list is separate: when it is empty, resolution follows the card's
 * fallback and the source obtains the holder's Weapon.
 */
export function borrowedSwordLegality(players: BorrowedSwordPlayer[], sourceId: string): BorrowedSwordLegality {
  const source = players.find((player) => player.id === sourceId && Boolean(player.alive));
  if (!source) return { eligibleHolderIds: [], forcedTargetIdsByHolderId: {} };

  const eligibleHolderIds: string[] = [];
  const forcedTargetIdsByHolderId: Record<string, string[]> = {};
  for (const holder of players) {
    const weapon = holder.equipment.weapon;
    if (!holder.alive || holder.id === source.id || !weapon) continue;
    eligibleHolderIds.push(holder.id);
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
    forcedTargetIdsByHolderId[holder.id] = forcedTargetIds;
  }

  return { eligibleHolderIds, forcedTargetIdsByHolderId };
}
