import type { Card } from "./model";
import type { ActionRequirement } from "./responses";
import type { JudgementPurpose } from "./decisions/judgement";
import type { TriggerEvent } from "./capabilities/triggers";

/** The one persisted decision in a room, independent of HTTP and D1. */
export type AttackOrigin = "card" | "serpent_spear" | "green_dragon" | "halberd" | "duel" | "triggered" | "borrowed_sword";
export type AttackDeclaration = { sourceId: string; targetId: string; origin: AttackOrigin; physicalCards: Card[]; attackCard?: Card; ignoresArmor?: boolean; sequenceStartCardId: string; resumePhase: string; resumePlayerId?: string; resolutionId?: string };
export type HarvestChoice = { cardId: string; playerId: string; playerName: string };
export type HarvestPending = { kind: "harvest"; sourceId: string; actorId: string; remainingIds: string[]; revealed: Card[]; availableIds?: string[]; choices?: HarvestChoice[]; previewCardId?: string; completeAt?: number; resumePhase: string; reason: string; heldCards?: Card[] };
export type TargetCardPending = { kind: "target_card"; sourceId: string; actorId: string; targetId: string; cardKind: "Dismantle" | "Steal"; resumePhase: string; reason: string; heldCards?: Card[] };
export type BorrowedSwordPending = { kind: "borrowed_sword"; sourceId: string; actorId: string; targetId: string; holderId: string; resumePhase: string; reason: string; deadline?: number; weaponId?: string; stage: "choose_target" | "force_attack" };
export type BorrowedSwordAttackContinuation = { kind: "borrowed_sword_attack"; sourceId: string; holderId: string; targetId: string; resumePhase: string; resumePlayerId: string; weaponId: string; origin: "borrowed_sword" };
export type DeferredStratagem =
  | { kind: "draw_two"; cardId: string } | { kind: "oath" } | { kind: "harvest"; chooserIds: string[] } | { kind: "harvest_target"; pending: HarvestPending } | { kind: "borrowed_sword"; targetId: string }
  | { kind: "dismantle"; targetId: string } | { kind: "steal"; targetId: string } | { kind: "duel"; pending: ResponsePending } | { kind: "group"; pending: GroupResponsePending }
  | { kind: "overindulgence"; targetId: string; cardId: string } | { kind: "lightning"; targetId: string; cardId: string } | { kind: "rations_depleted"; targetId: string; cardId: string } | { kind: "judgement"; targetId: string; cardId: string };
/** Only effect-resumption data belongs in a canonical response continuation. */
export type AttackContinuation = { kind: "attack"; sourceId: string; targetId: string; resumePhase?: string; resumePlayerId?: string; sequenceStartCardId?: string; origin?: AttackOrigin; physicalCardId?: string; physicalSuit?: string; ignoresArmor?: boolean; resolutionId?: string };
export type GroupContinuation = { kind: "group"; cardKind: "BarbarianInvasion" | "RainingArrows" | "SkyPiercingHalberdAttack"; sourceId: string; remainingIds: string[]; requiredKind: "Attack" | "Dodge"; resumePhase: string; heldCards?: Card[]; resolutionId?: string };
export type DuelContinuation = { kind: "duel"; sourceId: string; targetId: string; opponentId: string; resumePhase: string };
export type NegationContinuation = { kind: "negation"; sourceId: string; remainingIds: string[]; negated: boolean; cardName: string; effectTargetId: string; resumePhase: string; effect: DeferredStratagem; heldCards?: Card[]; responseTarget?: string; latestNegationPlayerId?: string; latestNegationCardId?: string; chainDepth?: number; resolutionId?: string };
export type ResponseContinuation = AttackContinuation | GroupContinuation | DuelContinuation | NegationContinuation | BorrowedSwordAttackContinuation;

/**
 * The canonical persisted decision for a player who must satisfy a semantic
 * requirement. Its continuation deliberately remains small and domain-shaped:
 * it contains only what Attack, Duel, Group, or Negation needs to resume.
 */
export type ResponsePending = {
  kind: "response";
  actorId: string;
  requirement: ActionRequirement;
  reason: string;
  deadline?: number;
  resolutionId?: string;
  readyAfterEventId?: string;
  continuation: ResponseContinuation;
};
export type GroupResponsePending = Omit<ResponsePending, "continuation"> & { continuation: GroupContinuation };
/** Effect-resumption data for new canonical trigger decisions. */
export type AttackDodgedTriggerContinuation = {
  kind: "attack_dodged_event";
  sourceId: string;
  targetId: string;
  resumePhase: string;
  resumePlayerId?: string;
  sequenceStartCardId: string;
  origin?: AttackOrigin;
  resolutionId?: string;
};
export type AttackTargetedTriggerContinuation = {
  kind: "attack_targeted_event";
  declaration: AttackDeclaration;
  group?: GroupResponsePending;
};
export type DamageAboutToApplyTriggerContinuation = {
  kind: "damage_about_to_apply_event";
  sourceId: string;
  targetId: string;
  resumePhase: string;
  resumePlayerId?: string;
  sequenceStartCardId: string;
  origin?: AttackOrigin;
};
export type DamageSufferedTriggerContinuation = {
  kind: "damage_suffered_event";
  sourceId: string;
  targetId: string;
  amount: number;
  resumePhase: string;
  resumePlayerId?: string;
  sequenceStartCardId: string;
  origin?: AttackOrigin;
  stage: "reaction" | "source_choice";
  judgementCard?: Card;
  resolutionId?: string;
};
export type TurnStartTriggerContinuation = {
  kind: "turn_start_event";
  playerId: string;
};
export type JudgementResponseResume = {
  kind: "response";
  actorId: string;
  requirement: ActionRequirement;
  reason: string;
  resolutionId?: string;
  continuation: ResponseContinuation;
};
export type DamageSufferedJudgementResume = { kind: "damage_suffered"; continuation: DamageSufferedTriggerContinuation };
export type JudgementContinuation = {
  targetId: string;
  purpose: JudgementPurpose;
  revealedCard: Card;
  revealedEventId?: string;
  resume: { kind: "luoshen"; playerId: string } | { kind: "delayed"; targetId: string; delayedCard: Card; remainingDelayedCards: Card[]; resumePhase: string } | JudgementResponseResume | DamageSufferedJudgementResume;
  resolutionId?: string;
};
export type JudgementRevealedTriggerContinuation = {
  kind: "judgement_revealed_event";
  judgement: JudgementContinuation;
};
export type TriggerContinuation = AttackTargetedTriggerContinuation | AttackDodgedTriggerContinuation | DamageAboutToApplyTriggerContinuation | DamageSufferedTriggerContinuation | TurnStartTriggerContinuation | JudgementRevealedTriggerContinuation;

/** A capability reaction to an already-established domain event. */
export type TriggerPending = {
  kind: "trigger";
  actorId: string;
  event: TriggerEvent;
  reason: string;
  deadline?: number;
  resolutionId?: string;
  /** Exact public presentation event that must finish before this decision opens. */
  readyAfterEventId?: string;
  /** Optional effects already resolved for this one domain event. */
  resolvedEffectIds?: string[];
  continuation: TriggerContinuation;
};
export type DyingPending = { kind: "dying"; sourceId: string | null; targetId: string; actorId: string; remainingIds: string[]; deadline: number; resumePlayerId: string; resumePhase?: string; resumePending?: GroupResponsePending; origin?: AttackOrigin; reason: string };
export type Pending = HarvestPending | TargetCardPending | BorrowedSwordPending | ResponsePending | TriggerPending | DyingPending;

export function asTriggerPending(pending: Pending | null | undefined): TriggerPending | null {
  return pending?.kind === "trigger" ? pending : null;
}

/** Serializes all new semantic response decisions in their canonical form. */
export function serializePending(pending: unknown) {
  return JSON.stringify(pending);
}
