import type { Pending } from "./pending";
import { getResponseOptions, resolveResponseProvider, type ActionRequirement, type ResponseContext, type ResponseSelectionInput } from "./responses";

export type ResponseDecision = {
  requirement: "attack" | "dodge" | "negate";
  options: {
    providerId: string;
    satisfies: "attack" | "dodge" | "negate";
    label: string;
    selection: { type: "cards"; min: number; max: number; eligibleCardIds: string[] } | null;
  }[];
  declineAction: "pass_negation" | "take_damage" | "take_group_damage" | "take_duel_damage";
};

/**
 * Produces the private, derived choices for one semantic response. The pending
 * state remains the authority for what is required; this module only discovers
 * how the current actor can satisfy it right now.
 */
export function responseDecisionFor(pending: Pending | null, context: ResponseContext | undefined): ResponseDecision | null {
  const requirement = requirementForPending(pending);
  if (!pending || !context || !requirement) return null;
  let declineAction: ResponseDecision["declineAction"] | null = null;
  if (pending.kind === "negation") declineAction = "pass_negation";
  if (pending.kind === "attack") declineAction = "take_damage";
  if (pending.kind === "group") declineAction = "take_group_damage";
  if (pending.kind === "duel") declineAction = "take_duel_damage";
  if (!declineAction) return null;
  return { requirement: requirement.kind, options: getResponseOptions({ ...context, requirement }, requirement).map(({ providerId, satisfies, label, selection }) => ({ providerId, satisfies, label, selection })), declineAction };
}

export function requirementForPending(pending: Pending | null): ActionRequirement | null {
  if (!pending) return null;
  if (pending.kind === "negation") return { kind: "negate", sourceId: pending.sourceId, targetId: pending.effectTargetId };
  let requirement: ActionRequirement | null = null;
  if (pending.kind === "attack") requirement = { kind: "dodge", sourceId: pending.sourceId, targetId: pending.targetId };
  if (pending.kind === "group") requirement = { kind: pending.requiredKind === "Attack" ? "attack" : "dodge", sourceId: pending.sourceId, actorId: pending.actorId, context: pending.requiredKind === "Attack" ? "barbarian_invasion" : undefined };
  if (pending.kind === "duel") requirement = { kind: "attack", sourceId: pending.sourceId, actorId: pending.actorId, context: "duel" };
  return requirement;
}

/** Resolves a selected provider after recomputing it from live server state. */
export function resolveResponseDecision(pending: Pending | null, context: ResponseContext | undefined, providerId: unknown, selection: ResponseSelectionInput) {
  const requirement = requirementForPending(pending);
  if (!pending || !context || !requirement || !["attack", "group", "duel", "negation"].includes(pending.kind)) return null;
  const cardId = typeof selection.cardId === "string" ? selection.cardId : undefined;
  const cardIds = Array.isArray(selection.cardIds) && selection.cardIds.every((id) => typeof id === "string") ? selection.cardIds : undefined;
  return resolveResponseProvider(providerId, { ...context, requirement, pendingKind: pending.kind, selection: { cardId, cardIds } });
}
