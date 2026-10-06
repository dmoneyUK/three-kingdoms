import type { Card } from "./model";
import type { ActionRequirement } from "./responses";
import type { JudgementPurpose } from "./decisions/judgement";
import type { DamageCause } from "./capabilities/damage-modifiers";
import type { TriggerEvent } from "./capabilities/triggers";
import type { CausalContext } from "./causal-context";
import type { CausalFrame, CausalFrameCurrent } from "./presentation-causality";

export type CausalFields = { causal?: CausalContext };

/** The one persisted decision in a room, independent of HTTP and D1. */
export type AttackOrigin = "card" | "serpent_spear" | "green_dragon" | "halberd" | "duel" | "triggered" | "borrowed_sword";
export type AttackDeclaration = { sourceId: string; targetId: string; origin: AttackOrigin; physicalCards: Card[]; attackCard?: Card; ignoresArmor?: boolean; requiredDodgeCount?: number; dodgeSuppressed?: boolean; sequenceStartCardId: string; resumePhase: string; resumePlayerId?: string; resolutionId?: string } & CausalFields;
export type HarvestChoice = { cardId: string; playerId: string; playerName: string };
export type HarvestParticipantProgressStatus = "PENDING" | "CURRENT" | "RESOLVED" | "NO_LONGER_APPLICABLE";
export type HarvestParticipantProgressOutcome = "CHOSE_CARD" | "NEGATED";
export type HarvestParticipantProgress = {
  version: 1;
  interactionId: string;
  rootFrameId: string;
  currentParticipantId: string | null;
  participants: Array<{ playerId: string; status: HarvestParticipantProgressStatus; outcome?: HarvestParticipantProgressOutcome }>;
};
export type HarvestPending = CausalFields & { kind: "harvest"; sourceId: string; actorId: string; remainingIds: string[]; revealed: Card[]; availableIds?: string[]; choices?: HarvestChoice[]; participantProgress?: HarvestParticipantProgress; previewCardId?: string; completeAt?: number; resumePhase: string; reason: string; heldCards?: Card[] };
export type TargetCardPending = { kind: "target_card"; sourceId: string; actorId: string; targetId: string; cardKind: "Dismantle" | "Steal"; resumePhase: string; reason: string; heldCards?: Card[] };
export type BorrowedSwordPending = CausalFields & { kind: "borrowed_sword"; sourceId: string; actorId: string; targetId: string; holderId: string; resumePhase: string; reason: string; deadline?: number; weaponId?: string; stage: "choose_target" | "force_attack" };
export type BorrowedSwordAttackContinuation = CausalFields & { kind: "borrowed_sword_attack"; sourceId: string; holderId: string; targetId: string; resumePhase: string; resumePlayerId: string; weaponId: string; origin: "borrowed_sword" };
export type DeferredStratagem =
  | { kind: "draw_two"; cardId: string } | { kind: "oath" } | { kind: "harvest"; chooserIds: string[] } | { kind: "harvest_target"; pending: HarvestPending } | { kind: "borrowed_sword"; targetId: string }
  | { kind: "dismantle"; targetId: string } | { kind: "steal"; targetId: string } | { kind: "duel"; pending: ResponsePending } | { kind: "group"; pending: GroupResponsePending }
  | { kind: "overindulgence"; targetId: string; cardId: string } | { kind: "lightning"; targetId: string; cardId: string } | { kind: "rations_depleted"; targetId: string; cardId: string } | { kind: "judgement"; targetId: string; cardId: string; causalResume?: JudgementNegationCausalResume };
export type JudgementNegationCausalResume =
  | { kind: "root" }
  | { kind: "parent"; stage: CausalFrame["stage"]; current: CausalFrameCurrent };
/** Only effect-resumption data belongs in a canonical response continuation. */
export type AttackContinuation = { kind: "attack"; sourceId: string; targetId: string; resumePhase?: string; resumePlayerId?: string; sequenceStartCardId?: string; origin?: AttackOrigin; physicalCardId?: string; physicalSuit?: string; damageCards?: Card[]; ignoresArmor?: boolean; requiredDodgeCount?: number; resolutionId?: string } & CausalFields;
export type InfluencingAttackContinuation = { kind: "influencing_attack"; sourceId: string; targetId: string; resumePhase: string; sequenceStartCardId: string; origin: "triggered" } & CausalFields;
export type GroupParticipantProgressStatus = "PENDING" | "CURRENT" | "PAUSED" | "RESOLVED" | "NO_LONGER_APPLICABLE";
export type GroupParticipantProgressOutcome = "AVOIDED" | "DAMAGED" | "NEGATED" | "DEFEATED";
export type GroupResolutionSemantics = "GROUP" | "ORDERED";
export type GroupParticipantProgress = {
  version: 1;
  interactionId: string;
  groupFrameId: string;
  resolutionSemantics: GroupResolutionSemantics;
  participants: Array<{ playerId: string; status: GroupParticipantProgressStatus; outcome?: GroupParticipantProgressOutcome }>;
};
export type GroupContinuation = {
  kind: "group";
  cardKind: "BarbarianInvasion" | "RainingArrows" | "SkyPiercingHalberdAttack";
  sourceId: string;
  remainingIds: string[];
  requiredKind: "Attack" | "Dodge";
  resumePhase: string;
  heldCards?: Card[];
  damageCards?: Card[];
  physicalSuit?: Card["suit"];
  sequenceStartCardId?: string;
  resolutionId?: string;
  participantProgress?: GroupParticipantProgress;
  /** Server-only marker consumed when the matching paused participant resolves. */
  pendingDamageParticipantId?: string;
} & CausalFields;
export function isGroupParticipantProgressOutcomeAllowed(
  cardKind: GroupContinuation["cardKind"],
  resolutionSemantics: GroupResolutionSemantics,
  status: GroupParticipantProgressStatus,
  outcome: GroupParticipantProgressOutcome,
): boolean {
  if (resolutionSemantics !== "GROUP" || status !== "RESOLVED") return false;
  if (outcome === "AVOIDED") return cardKind === "RainingArrows";
  if (outcome === "DAMAGED") return cardKind === "RainingArrows" || cardKind === "BarbarianInvasion";
  if (outcome === "NEGATED") return cardKind === "RainingArrows" || cardKind === "BarbarianInvasion";
  if (outcome === "DEFEATED") return cardKind === "RainingArrows" || cardKind === "BarbarianInvasion";
  return false;
}
export type DuelContinuation = { kind: "duel"; sourceId: string; targetId: string; opponentId: string; resumePhase: string; resumePlayerId?: string; damageCards?: Card[]; requiredAttackCount?: number; wushuangPlayerId?: string } & CausalFields;
export type NegationHistoryRecord = {
  nodeId: string;
  interactionId: string;
  frameId: string;
  causedByNodeId: string | null;
  actorId: string;
  physicalCardId: string;
  kind: "NEGATION_CARD";
};
export type NegationContinuation = { kind: "negation"; sourceId: string; remainingIds: string[]; negated: boolean; cardName: string; effectTargetId: string; resumePhase: string; effect: DeferredStratagem; heldCards?: Card[]; responseTarget?: string; latestNegationPlayerId?: string; latestNegationCardId?: string; chainDepth?: number; resolutionId?: string; negationHistory?: NegationHistoryRecord[] } & CausalFields;
export type ResponseContinuation = AttackContinuation | InfluencingAttackContinuation | GroupContinuation | DuelContinuation | NegationContinuation | BorrowedSwordAttackContinuation;

/**
 * The canonical persisted decision for a player who must satisfy a semantic
 * requirement. Its continuation deliberately remains small and domain-shaped:
 * it contains only what Attack, Duel, Group, or Negation needs to resume.
 */
export type ResponsePending = CausalFields & {
  kind: "response";
  actorId: string;
  requirement: ActionRequirement;
  reason: string;
  deadline?: number;
  resolutionId?: string;
  readyAfterEventId?: string;
  disabledProviderIds?: string[];
  delegation?: { kind: "attack" | "dodge"; requesterId: string; providerId: string; remainingActorIds: string[] };
  continuation: ResponseContinuation;
};
export type GroupResponsePending = Omit<ResponsePending, "continuation"> & { continuation: GroupContinuation };
/** Effect-resumption data for new canonical trigger decisions. */
export type AttackDodgedTriggerContinuation = CausalFields & {
  kind: "attack_dodged_event";
  sourceId: string;
  targetId: string;
  resumePhase: string;
  resumePlayerId?: string;
  sequenceStartCardId: string;
  origin?: AttackOrigin;
  resolutionId?: string;
};
export type AttackTargetedTriggerContinuation = CausalFields & {
  kind: "attack_targeted_event";
  declaration: AttackDeclaration;
  group?: GroupResponsePending;
  resolvedEffectIds?: string[];
};
export type DamageAboutToApplyTriggerContinuation = CausalFields & {
  kind: "damage_about_to_apply_event";
  sourceId: string;
  targetId: string;
  resumePhase: string;
  resumePlayerId?: string;
  sequenceStartCardId: string;
  origin?: AttackOrigin;
  physicalSuit?: Card["suit"];
};
export type DamageSufferedTriggerContinuation = CausalFields & {
  kind: "damage_suffered_event";
  sourceId?: string;
  targetId: string;
  amount: number;
  damagePointIndex?: number;
  damagePointCount?: number;
  damageCards?: Card[];
  resumePhase: string;
  resumePlayerId?: string;
  sequenceStartCardId: string;
  origin?: AttackOrigin;
  damageCause?: DamageCause;
  physicalSuit?: Card["suit"];
  stage: "reaction" | "secondary";
  /** Provider currently completing a provider-owned secondary flow. */
  secondaryEffectId?: string;
  /** Optional providers already resolved for this one damage event. */
  resolvedEffectIds?: string[];
  /** Per-point providers reset after each point of one damage event. */
  resolvedDamagePointEffectIds?: string[];
  /** Resume a suspended Group/AOE after this damage event is exhausted. */
  resumeGroup?: GroupResponsePending;
  /** Resume an enclosing sourced-damage event after nested damage resolves. */
  resumeDamageSuffered?: DamageSufferedTriggerContinuation;
  /** Resume the persisted turn-end lifecycle after all damage reactions settle. */
  resumeTurnEnd?: TurnEndTriggerContinuation;
  judgementCard?: Card;
  resolutionId?: string;
};
export type CardDistributionPending = CausalFields & {
  kind: "card_distribution";
  actorId: string;
  cards: Card[];
  eligibleRecipientIds: string[];
  resumeDamageSuffered: DamageSufferedTriggerContinuation;
  reason: string;
  deadline?: number;
  resolutionId?: string;
};
/** A private, exact-card deck partition decision. The held cards are removed
 * from the draw deck until the actor submits both ordered partitions. */
export type DeckReorderPending = {
  kind: "deck_reorder";
  actorId: string;
  cards: Card[];
  minTop: number;
  maxTop: number;
  resumePhase: string;
  reason: string;
  deadline?: number;
};
export type TurnStartTriggerContinuation = CausalFields & {
  kind: "turn_start_event";
  playerId: string;
  resolvedEffectIds?: string[];
};
export type DrawPhaseTriggerContinuation = {
  kind: "draw_phase_event";
  playerId: string;
  resumePhase: string;
  additionalCards?: number;
};
export type DiscardPhaseTriggerContinuation = {
  kind: "discard_phase_event";
  playerId: string;
  attackUsed: boolean;
};
export type TurnEndTriggerContinuation = {
  kind: "turn_end_event";
  endingPlayerId: string;
  endingSeat: number;
  stage: "activation" | "equipment";
  sourceId?: string;
  targetId?: string;
  resolvedEffectIds?: string[];
};
export type JudgementResponseResume = {
  kind: "response";
  actorId: string;
  requirement: ActionRequirement;
  reason: string;
  providerId?: string;
  resolutionId?: string;
  disabledProviderIds?: string[];
  delegation?: ResponsePending["delegation"];
  continuation: ResponseContinuation;
};
export type DamageSufferedJudgementResume = { kind: "damage_suffered"; continuation: DamageSufferedTriggerContinuation };
export type JudgementContinuation = CausalFields & {
  targetId: string;
  purpose: JudgementPurpose;
  revealedCard: Card;
  revealedEventId?: string;
  resume: { kind: "luoshen"; playerId: string } | { kind: "delayed"; targetId: string; delayedCard: Card; remainingDelayedCards: Card[]; resumePhase: string } | { kind: "attack_targeted"; declaration: AttackDeclaration; group?: GroupResponsePending } | JudgementResponseResume | DamageSufferedJudgementResume;
  resolutionId?: string;
};
export type JudgementRevealedTriggerContinuation = {
  kind: "judgement_revealed_event";
  judgement: JudgementContinuation;
};
export type JudgementEffectiveTriggerContinuation = {
  kind: "judgement_effective_event";
  judgement: JudgementContinuation;
  finalCard: Card;
  result: "satisfied" | "unsatisfied";
};
export type HeroChoiceTriggerContinuation = {
  kind: "hero_choice_event";
  sourceId: string;
  targetId: string;
  stage: "suit" | "card";
  guess?: string;
  resumePhase: string;
};
export type HandLossTriggerContinuation = {
  kind: "hand_loss_event";
  playerId: string;
  lostCards: Card[];
  resumePhase: string;
  resumeTurnSeat: number | null;
  resumePending?: Pending;
};
export type EquipmentLostRecord = { playerId: string; lostCards: Card[]; reason?: string };
export type EquipmentLostResume =
  | { kind: "phase"; phase: string; playerId?: string; handLoss?: { playerId: string; beforeHand: Card[] } }
  | { kind: "lust_duel"; ownerId: string; firstId: string; secondId: string; resumePhase: string; handLoss?: { playerId: string; beforeHand: Card[] } }
  | { kind: "attack_targeted"; continuation: AttackTargetedTriggerContinuation; handLoss?: { playerId: string; beforeHand: Card[] } }
  | { kind: "attack_dodged"; continuation: AttackDodgedTriggerContinuation; handLoss?: { playerId: string; beforeHand: Card[] } }
  | { kind: "forced_damage"; sourceId: string; targetId: string; amount: number; resumePhase: string; resumePlayerId?: string; sequenceStartCardId: string; origin?: AttackOrigin; damageCards?: Card[]; label: string; damageDescription?: string; handLoss?: { playerId: string; beforeHand: Card[] } }
  | { kind: "turn_end"; continuation: TurnEndTriggerContinuation; handLoss?: { playerId: string; beforeHand: Card[] } }
  | { kind: "damage_about_to_apply"; continuation: DamageAboutToApplyTriggerContinuation; handLoss?: { playerId: string; beforeHand: Card[] } }
  | { kind: "damage_suffered"; continuation: DamageSufferedTriggerContinuation; handLoss?: { playerId: string; beforeHand: Card[] } };
export type EquipmentLostTriggerContinuation = {
  kind: "equipment_lost_event";
  loss: EquipmentLostRecord;
  remaining: EquipmentLostRecord[];
  resume: EquipmentLostResume;
};
export type StratagemUsedTriggerContinuation = {
  kind: "stratagem_used_event";
  sourceId: string;
  physicalCardId: string;
  physicalCardWasDiscarded?: boolean;
  effectiveCard: Card;
  targetName: string;
  effectTargetId: string;
  effect: DeferredStratagem;
  resume: "negation" | "direct";
  resumePhase: string;
};
export type RecoveryRecord = { playerId: string; amountRecovered: number; sourceId?: string; reason?: string };
export type RecoveryResume =
  | { kind: "phase"; phase: string; playerId?: string; handLoss?: { playerId: string; beforeHand: Card[] } }
  | { kind: "turn_start"; continuation: TurnStartTriggerContinuation }
  | { kind: "dying"; pending: DyingPending }
  | { kind: "damage_suffered"; continuation: DamageSufferedTriggerContinuation };
export type HpRecoveredTriggerContinuation = {
  kind: "hp_recovered_event";
  recovery: RecoveryRecord;
  remaining: RecoveryRecord[];
  resolvedEffectIds?: string[];
  resume: RecoveryResume;
};
export type TriggerContinuation = AttackTargetedTriggerContinuation | AttackDodgedTriggerContinuation | DamageAboutToApplyTriggerContinuation | DamageSufferedTriggerContinuation | TurnStartTriggerContinuation | DrawPhaseTriggerContinuation | DiscardPhaseTriggerContinuation | TurnEndTriggerContinuation | JudgementRevealedTriggerContinuation | JudgementEffectiveTriggerContinuation | HeroChoiceTriggerContinuation | HandLossTriggerContinuation | EquipmentLostTriggerContinuation | StratagemUsedTriggerContinuation | HpRecoveredTriggerContinuation;

/** A capability reaction to an already-established domain event. */
export type TriggerPending = CausalFields & {
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
export type DyingResumeEffect = { kind: "draw_cards"; playerId: string; amount: number; label: string };
export type DyingPending = CausalFields & { kind: "dying"; sourceId: string | null; targetId: string; actorId: string; remainingIds: string[]; deadline: number; resumePlayerId: string; resumePhase?: string; resumePending?: GroupResponsePending; resumeTrigger?: DamageSufferedTriggerContinuation; resumeEffect?: DyingResumeEffect; origin?: AttackOrigin; reason: string };
export type Pending = HarvestPending | TargetCardPending | BorrowedSwordPending | CardDistributionPending | DeckReorderPending | ResponsePending | TriggerPending | DyingPending;

export function asTriggerPending(pending: Pending | null | undefined): TriggerPending | null {
  return pending?.kind === "trigger" ? pending : null;
}

/** Serializes all new semantic response decisions in their canonical form. */
export function serializePending(pending: unknown) {
  return JSON.stringify(pending);
}
