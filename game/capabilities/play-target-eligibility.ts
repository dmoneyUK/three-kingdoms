import { cardDefinition } from "../cards";
import type { Card, CardKind, EquipmentZone, GamePlayer } from "../model";
import { effectiveDistanceBetween } from "../rules";
import { borrowedSwordLegality, type BorrowedSwordPlayer } from "./borrowed-sword";
import { isWithinRange } from "./range";
import { canTargetCharacter } from "./targeting";

export type PlayTargetEligibilityPlayer = GamePlayer & {
  hp?: number | null;
  handCount: number;
  equipment: EquipmentZone;
  judgementCards: Card[];
};

export type PlayTargetMode =
  | { mode: "card"; cardId: string; effectiveKind: CardKind }
  | { mode: "serpent_spear_attack"; effectiveKind: "Attack" };

export type PlayTargetRejection = {
  code: "OUT_OF_RANGE" | "TARGET_RESTRICTED" | "NO_TARGETABLE_CARDS" | "DUPLICATE_DELAYED_CARD" | "NOT_ELIGIBLE" | "ACTION_UNAVAILABLE";
  distance?: number;
  range?: number;
};

export type PlayTargetEvaluation = { eligible: true } | { eligible: false; rejection: PlayTargetRejection };

const TARGETED_CARD_KINDS = new Set<CardKind>([
  "Attack", "Dismantle", "Steal", "Duel", "Overindulgence", "RationsDepleted", "BorrowedSword",
]);

function allEquipment(player: PlayTargetEligibilityPlayer) {
  return Object.values(player.equipment).filter((card): card is Card => Boolean(card));
}

function targetableCardCount(player: PlayTargetEligibilityPlayer) {
  return player.handCount + allEquipment(player).length + player.judgementCards.length;
}

function rejected(code: PlayTargetRejection["code"], distance?: number, range?: number): PlayTargetEvaluation {
  return {
    eligible: false,
    rejection: {
      code,
      ...(distance === undefined ? {} : { distance }),
      ...(range === undefined ? {} : { range }),
    },
  };
}

function withinEffectiveRange(
  players: PlayTargetEligibilityPlayer[],
  source: PlayTargetEligibilityPlayer,
  target: PlayTargetEligibilityPlayer,
  effectiveKind: CardKind,
  ordinaryRange: number,
) {
  const distance = effectiveDistanceBetween(players, source.id, target.id, allEquipment);
  return {
    allowed: isWithinRange({ source, target, effectiveCardKind: effectiveKind, ordinaryRange, effectiveDistance: distance }),
    distance,
    range: ordinaryRange,
  };
}

/**
 * Shared server decision for target selection and final play submission.
 * This reports the existing rule verdict; it never grants an action or
 * replaces the submit handler's independent live-state check.
 */
export function evaluatePlayTarget(
  players: readonly PlayTargetEligibilityPlayer[],
  sourceId: string,
  targetId: string,
  mode: PlayTargetMode,
): PlayTargetEvaluation {
  const mutablePlayers = [...players].sort((left, right) => left.seat - right.seat);
  const source = mutablePlayers.find((player) => player.id === sourceId);
  const target = mutablePlayers.find((player) => player.id === targetId);
  if (!source || !target || !source.alive || !target.alive || source.id === target.id) return rejected("NOT_ELIGIBLE");

  if (mode.mode === "serpent_spear_attack"
    && (mode.effectiveKind !== "Attack" || source.equipment.weapon?.kind !== "SerpentSpear" || source.handCount < 2)) {
    return rejected("ACTION_UNAVAILABLE");
  }

  const kind = mode.effectiveKind;
  if (mode.mode === "card" && (!mode.cardId || !TARGETED_CARD_KINDS.has(kind))) return rejected("ACTION_UNAVAILABLE");
  if (mode.mode === "serpent_spear_attack" && kind !== "Attack") return rejected("ACTION_UNAVAILABLE");

  if (kind === "Attack") {
    const range = source.equipment.weapon ? cardDefinition(source.equipment.weapon.kind).attackRange ?? 1 : 1;
    const distance = effectiveDistanceBetween(mutablePlayers, source.id, target.id, allEquipment);
    if (!isWithinRange({ source, target, effectiveCardKind: kind, ordinaryRange: range, effectiveDistance: distance })) {
      return rejected("OUT_OF_RANGE", distance, range);
    }
    if (!canTargetCharacter({ sourceId, targetId, targetHero: target.hero, targetHandCount: target.handCount, cardKind: kind })) {
      return rejected("TARGET_RESTRICTED");
    }
    return { eligible: true };
  }

  if (kind === "Steal") {
    if (!canTargetCharacter({ sourceId, targetId, targetHero: target.hero, cardKind: kind })) return rejected("TARGET_RESTRICTED");
    const range = withinEffectiveRange(mutablePlayers, source, target, kind, 1);
    if (!range.allowed) return rejected("OUT_OF_RANGE", range.distance, range.range);
    if (targetableCardCount(target) === 0) return rejected("NO_TARGETABLE_CARDS");
    return { eligible: true };
  }

  if (kind === "RationsDepleted") {
    const range = withinEffectiveRange(mutablePlayers, source, target, kind, 1);
    if (!range.allowed) return rejected("OUT_OF_RANGE", range.distance, range.range);
    if (target.judgementCards.some((card) => card.kind === kind)) return rejected("DUPLICATE_DELAYED_CARD");
    return { eligible: true };
  }

  if (kind === "Overindulgence") {
    if (!canTargetCharacter({ sourceId, targetId, targetHero: target.hero, cardKind: kind })) return rejected("TARGET_RESTRICTED");
    if (target.judgementCards.some((card) => card.kind === kind)) return rejected("DUPLICATE_DELAYED_CARD");
    return { eligible: true };
  }

  if (kind === "Duel") {
    return canTargetCharacter({ sourceId, targetId, targetHero: target.hero, targetHandCount: target.handCount, cardKind: kind })
      ? { eligible: true }
      : rejected("TARGET_RESTRICTED");
  }

  if (kind === "Dismantle") return targetableCardCount(target) > 0 ? { eligible: true } : rejected("NO_TARGETABLE_CARDS");

  if (kind === "BorrowedSword") {
    const borrowedSwordPlayers = mutablePlayers as BorrowedSwordPlayer[];
    return borrowedSwordLegality(borrowedSwordPlayers, sourceId).eligibleHolderIds.includes(targetId)
      ? { eligible: true }
      : rejected("TARGET_RESTRICTED");
  }

  return rejected("ACTION_UNAVAILABLE");
}
