import type { Pending } from "./pending";
import { getResponseOptions, resolveResponseProvider, type ResponseActivation, type ResponseContext, type ResponseSelectionInput } from "./responses";
import type { ActionRequirement } from "./responses";

export type ResponseDecision = {
  requirement: ActionRequirement["kind"];
  options: {
    providerId: string;
    satisfies: ActionRequirement["kind"];
    activation: ResponseActivation;
    label: string;
    selection: { type: "cards"; min: number; max: number; eligibleCardIds: string[] } | null;
    playedAs?: "attack" | "dodge" | "peach";
  }[];
  declineAction: "decline_response" | "skip_rescue";
};

function requirementFor(pending: Pending): ActionRequirement | null {
  if (pending.kind === "response") return pending.requirement;
  if (pending.kind === "dying") return { kind: "peach", sourceId: pending.sourceId ?? undefined, targetId: pending.targetId };
  return null;
}

/**
 * Produces the private, derived choices for one semantic response. The pending
 * state remains the authority for what is required; this module only discovers
 * how the current actor can satisfy it right now.
 */
export function responseDecisionFor(pending: Pending | null, context: ResponseContext | undefined): ResponseDecision | null {
  const response = pending?.kind === "response" ? pending : null;
  const requirement = pending ? requirementFor(pending) : null;
  if (!pending || !requirement || !context) return null;
  return { requirement: requirement.kind, options: getResponseOptions({ ...context, requirement }, requirement)
    .filter((option) => !response?.disabledProviderIds?.includes(option.providerId))
    .map(({ providerId, satisfies, activation, label, selection, playedAs }) => ({ providerId, satisfies, activation, label, selection, ...(playedAs ? { playedAs } : {}) })), declineAction: pending.kind === "dying" ? "skip_rescue" : "decline_response" };
}

/** Resolves a selected provider after recomputing it from live server state. */
export function resolveResponseDecision(pending: Pending | null, context: ResponseContext | undefined, providerId: unknown, selection: ResponseSelectionInput) {
  const response = pending?.kind === "response" ? pending : null;
  const requirement = pending ? requirementFor(pending) : null;
  if (!pending || !requirement || !context) return null;
  if (typeof providerId === "string" && response?.disabledProviderIds?.includes(providerId)) return null;
  const cardId = typeof selection.cardId === "string" ? selection.cardId : undefined;
  const cardIds = Array.isArray(selection.cardIds) && selection.cardIds.every((id) => typeof id === "string") ? selection.cardIds : undefined;
  return resolveResponseProvider(providerId, { ...context, requirement, pendingKind: response?.continuation.kind ?? "dying", selection: { cardId, cardIds } });
}
