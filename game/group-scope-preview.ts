import type { CardKind, GamePlayer } from "./model";
import { playersInTurnOrder } from "./rules";

export type GroupScopePreview = {
  active: boolean;
  cardKind: "Oath" | "BumperHarvest" | "BarbarianInvasion" | "RainingArrows" | null;
  affectedPlayerIds: readonly string[];
  label: string | null;
};

type GroupScopePreviewPlayer = GamePlayer & { hp: number | null; maxHp: number | null };
const INACTIVE_PREVIEW: GroupScopePreview = { active: false, cardKind: null, affectedPlayerIds: [], label: null };

// A read-only mirror of the public, pre-resolution participant construction
// in the play route. It never creates targets or reads pending presentation.
export function buildGroupScopePreview({ cardKind, sourceId, turnSeat, players, playAuthorized }: { cardKind: CardKind | null | undefined; sourceId: string; turnSeat: number | null; players: readonly GroupScopePreviewPlayer[]; playAuthorized: boolean }): GroupScopePreview {
  if (!playAuthorized || turnSeat === null || !cardKind) return INACTIVE_PREVIEW;
  if (cardKind !== "Oath" && cardKind !== "BumperHarvest" && cardKind !== "BarbarianInvasion" && cardKind !== "RainingArrows") return INACTIVE_PREVIEW;
  const playersInOrder = playersInTurnOrder([...players], turnSeat);
  const affectedPlayerIds = cardKind === "Oath"
    ? playersInOrder.filter((player) => (player.hp ?? 0) < (player.maxHp ?? 0)).map((player) => player.id)
    : cardKind === "BumperHarvest"
      ? playersInOrder.map((player) => player.id)
      : playersInOrder.filter((player) => player.id !== sourceId).map((player) => player.id);
  return { active: true, cardKind, affectedPlayerIds, label: cardKind === "Oath" ? "WOUNDED CHARACTERS" : cardKind === "BumperHarvest" ? "ALL LIVING CHARACTERS" : "ALL OTHER LIVING CHARACTERS" };
}
