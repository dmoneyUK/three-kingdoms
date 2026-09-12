import type { Card } from "./model";

/** The one persisted decision in a room, independent of HTTP and D1. */
export type AttackOrigin = "card" | "serpent_spear" | "green_dragon" | "halberd" | "duel";
export type AttackDeclaration = { sourceId: string; targetId: string; origin: AttackOrigin; physicalCards: Card[]; attackCard?: Card; sequenceStartCardId: string; resumePhase: string };
export type AttackPending = { kind: "attack"; sourceId: string; targetId: string; actorId: string; resumePhase?: string; sequenceStartCardId?: string; reason: string; deadline?: number; origin?: AttackOrigin; physicalCardId?: string; physicalSuit?: string };
export type GreenDragonPending = { kind: "green_dragon"; sourceId: string; targetId: string; actorId: string; resumePhase: string; sequenceStartCardId: string; reason: string; deadline?: number };
export type RockCleavingPending = { kind: "rock_cleaving"; sourceId: string; targetId: string; actorId: string; resumePhase: string; sequenceStartCardId: string; reason: string; deadline?: number };
export type FrostSwordPending = { kind: "frost_sword"; sourceId: string; targetId: string; actorId: string; resumePhase: string; sequenceStartCardId: string; reason: string; deadline?: number };
export type DuelPending = { kind: "duel"; sourceId: string; targetId: string; actorId: string; opponentId: string; resumePhase: string; reason: string; deadline?: number };
export type GroupPending = { kind: "group"; cardKind: "BarbarianInvasion" | "RainingArrows" | "SkyPiercingHalberdAttack"; sourceId: string; actorId: string; remainingIds: string[]; requiredKind: "Attack" | "Dodge"; resumePhase: string; reason: string; deadline?: number; heldCards?: Card[] };
export type HarvestChoice = { cardId: string; playerId: string; playerName: string };
export type HarvestPending = { kind: "harvest"; sourceId: string; actorId: string; remainingIds: string[]; revealed: Card[]; availableIds?: string[]; choices?: HarvestChoice[]; previewCardId?: string; botAdvanceAt?: number; completeAt?: number; resumePhase: string; reason: string; heldCards?: Card[] };
export type TargetCardPending = { kind: "target_card"; sourceId: string; actorId: string; targetId: string; cardKind: "Dismantle" | "Steal"; resumePhase: string; reason: string; heldCards?: Card[] };
export type DeferredStratagem =
  | { kind: "draw_two"; cardId: string } | { kind: "oath" } | { kind: "harvest"; chooserIds: string[] } | { kind: "harvest_target"; pending: HarvestPending }
  | { kind: "dismantle"; targetId: string } | { kind: "steal"; targetId: string } | { kind: "duel"; pending: DuelPending } | { kind: "group"; pending: GroupPending }
  | { kind: "overindulgence"; targetId: string; cardId: string } | { kind: "lightning"; targetId: string; cardId: string } | { kind: "rations_depleted"; targetId: string; cardId: string } | { kind: "judgement"; targetId: string; cardId: string };
export type NegationPending = { kind: "negation"; sourceId: string; actorId: string; remainingIds: string[]; negated: boolean; cardName: string; effectTargetId: string; resumePhase: string; effect: DeferredStratagem; reason: string; heldCards?: Card[]; deadline?: number; responseTarget?: string; latestNegationPlayerId?: string; latestNegationCardId?: string; chainDepth?: number };
export type DyingPending = { kind: "dying"; sourceId: string | null; targetId: string; actorId: string; remainingIds: string[]; deadline: number; resumePlayerId: string; resumePhase?: string; resumePending?: GroupPending; reason: string };
export type Pending = AttackPending | GreenDragonPending | RockCleavingPending | FrostSwordPending | DuelPending | GroupPending | HarvestPending | TargetCardPending | NegationPending | DyingPending;
