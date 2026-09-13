import type { Card } from "./model";
import type { ActionRequirement } from "./responses";
import type { TriggerEvent } from "./capabilities/triggers";

/** The one persisted decision in a room, independent of HTTP and D1. */
export type AttackOrigin = "card" | "serpent_spear" | "green_dragon" | "halberd" | "duel";
export type AttackDeclaration = { sourceId: string; targetId: string; origin: AttackOrigin; physicalCards: Card[]; attackCard?: Card; sequenceStartCardId: string; resumePhase: string };
export type AttackPending = { kind: "attack"; sourceId: string; targetId: string; actorId: string; resumePhase?: string; sequenceStartCardId?: string; reason: string; deadline?: number; origin?: AttackOrigin; physicalCardId?: string; physicalSuit?: string };
export type GreenDragonPending = { kind: "green_dragon"; sourceId: string; targetId: string; actorId: string; resumePhase: string; sequenceStartCardId: string; reason: string; deadline?: number; triggerId?: string; readyAfterEventId?: string };
export type RockCleavingPending = { kind: "rock_cleaving"; sourceId: string; targetId: string; actorId: string; resumePhase: string; sequenceStartCardId: string; reason: string; deadline?: number; triggerId?: string; readyAfterEventId?: string };
export type FrostSwordPending = { kind: "frost_sword"; sourceId: string; targetId: string; actorId: string; resumePhase: string; sequenceStartCardId: string; reason: string; deadline?: number; triggerId?: string; readyAfterEventId?: string };
export type DuelPending = { kind: "duel"; sourceId: string; targetId: string; actorId: string; opponentId: string; resumePhase: string; reason: string; deadline?: number };
export type GroupPending = { kind: "group"; cardKind: "BarbarianInvasion" | "RainingArrows" | "SkyPiercingHalberdAttack"; sourceId: string; actorId: string; remainingIds: string[]; requiredKind: "Attack" | "Dodge"; resumePhase: string; reason: string; deadline?: number; heldCards?: Card[]; resolutionId?: string };
export type HarvestChoice = { cardId: string; playerId: string; playerName: string };
export type HarvestPending = { kind: "harvest"; sourceId: string; actorId: string; remainingIds: string[]; revealed: Card[]; availableIds?: string[]; choices?: HarvestChoice[]; previewCardId?: string; botAdvanceAt?: number; completeAt?: number; resumePhase: string; reason: string; heldCards?: Card[] };
export type TargetCardPending = { kind: "target_card"; sourceId: string; actorId: string; targetId: string; cardKind: "Dismantle" | "Steal"; resumePhase: string; reason: string; heldCards?: Card[] };
export type DeferredStratagem =
  | { kind: "draw_two"; cardId: string } | { kind: "oath" } | { kind: "harvest"; chooserIds: string[] } | { kind: "harvest_target"; pending: HarvestPending }
  | { kind: "dismantle"; targetId: string } | { kind: "steal"; targetId: string } | { kind: "duel"; pending: DuelPending } | { kind: "group"; pending: GroupPending }
  | { kind: "overindulgence"; targetId: string; cardId: string } | { kind: "lightning"; targetId: string; cardId: string } | { kind: "rations_depleted"; targetId: string; cardId: string } | { kind: "judgement"; targetId: string; cardId: string };
export type NegationPending = { kind: "negation"; sourceId: string; actorId: string; remainingIds: string[]; negated: boolean; cardName: string; effectTargetId: string; resumePhase: string; effect: DeferredStratagem; reason: string; heldCards?: Card[]; deadline?: number; responseTarget?: string; latestNegationPlayerId?: string; latestNegationCardId?: string; chainDepth?: number; resolutionId?: string };
export type ResponseContinuation = AttackPending | GroupPending | DuelPending | NegationPending;

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
  continuation: ResponseContinuation;
};
export type TriggerContinuation = GreenDragonPending | RockCleavingPending | FrostSwordPending;

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
  continuation: TriggerContinuation;
};
export type DyingPending = { kind: "dying"; sourceId: string | null; targetId: string; actorId: string; remainingIds: string[]; deadline: number; resumePlayerId: string; resumePhase?: string; resumePending?: GroupPending; reason: string };
export type Pending = AttackPending | GreenDragonPending | RockCleavingPending | FrostSwordPending | DuelPending | GroupPending | HarvestPending | TargetCardPending | NegationPending | ResponsePending | TriggerPending | DyingPending;

type LegacyResponsePending = AttackPending | GroupPending | DuelPending | NegationPending;

function requirementForLegacyResponse(pending: LegacyResponsePending): ActionRequirement {
  switch (pending.kind) {
    case "attack": return { kind: "dodge", sourceId: pending.sourceId, targetId: pending.targetId };
    case "group": return { kind: pending.requiredKind === "Attack" ? "attack" : "dodge", sourceId: pending.sourceId, actorId: pending.actorId, context: pending.requiredKind === "Attack" ? "barbarian_invasion" : undefined };
    case "duel": return { kind: "attack", sourceId: pending.sourceId, actorId: pending.actorId, context: "duel" };
    case "negation": return { kind: "negate", sourceId: pending.sourceId, targetId: pending.effectTargetId };
  }
}

/** Converts legacy saved state into the canonical decision shape. */
export function asResponsePending(pending: Pending | null | undefined): ResponsePending | null {
  if (!pending) return null;
  if (pending.kind === "response") return pending;
  if (!["attack", "group", "duel", "negation"].includes(pending.kind)) return null;
  const continuation = pending as LegacyResponsePending;
  return {
    kind: "response",
    actorId: continuation.actorId,
    requirement: requirementForLegacyResponse(continuation),
    reason: continuation.reason,
    deadline: continuation.deadline,
    resolutionId: continuation.resolutionId,
    continuation,
  };
}

/** Lets compatibility resolvers consume a canonical persisted decision. */
export function asLegacyResponsePending(pending: unknown): Pending | unknown {
  if (!pending || typeof pending !== "object" || (pending as { kind?: unknown }).kind !== "response") return pending;
  const response = pending as ResponsePending;
  const continuation = response.continuation;
  return {
    ...continuation,
    actorId: response.actorId,
    reason: response.reason,
    ...(response.deadline === undefined ? {} : { deadline: response.deadline }),
    ...(response.resolutionId === undefined ? {} : { resolutionId: response.resolutionId }),
  };
}

type LegacyTriggerPending = GreenDragonPending | RockCleavingPending | FrostSwordPending;
function triggerEventFor(pending: LegacyTriggerPending): TriggerEvent {
  return pending.kind === "frost_sword" ? "damage_about_to_apply" : "attack_dodged";
}

/** Converts legacy weapon-specific trigger state into one semantic trigger decision. */
export function asTriggerPending(pending: Pending | null | undefined): TriggerPending | null {
  if (!pending) return null;
  if (pending.kind === "trigger") return pending;
  if (!["green_dragon", "rock_cleaving", "frost_sword"].includes(pending.kind)) return null;
  const continuation = pending as LegacyTriggerPending;
  return {
    kind: "trigger",
    actorId: continuation.actorId,
    event: triggerEventFor(continuation),
    reason: continuation.reason,
    deadline: continuation.deadline,
    readyAfterEventId: continuation.readyAfterEventId,
    continuation,
  };
}

/** Lets existing effect resolvers read a trigger continuation during migration. */
export function asLegacyTriggerPending(pending: unknown): Pending | unknown {
  if (!pending || typeof pending !== "object" || (pending as { kind?: unknown }).kind !== "trigger") return pending;
  const trigger = pending as TriggerPending;
  return {
    ...trigger.continuation,
    actorId: trigger.actorId,
    reason: trigger.reason,
    ...(trigger.deadline === undefined ? {} : { deadline: trigger.deadline }),
    ...(trigger.resolutionId === undefined ? {} : { resolutionId: trigger.resolutionId }),
    ...(trigger.readyAfterEventId === undefined ? {} : { readyAfterEventId: trigger.readyAfterEventId }),
  };
}

/** Serializes all new semantic response decisions in their canonical form. */
export function serializePending(pending: unknown) {
  return JSON.stringify(asResponsePending(pending as Pending | null | undefined) ?? asTriggerPending(pending as Pending | null | undefined) ?? pending);
}
