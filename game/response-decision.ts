import { asResponsePending, type Pending } from "./pending";
import { getResponseOptions, resolveResponseProvider, type ResponseActivation, type ResponseContext, type ResponseSelectionInput } from "./responses";

export type ResponseDecision = {
  requirement: "attack" | "dodge" | "negate";
  options: {
    providerId: string;
    satisfies: "attack" | "dodge" | "negate";
    activation: ResponseActivation;
    label: string;
    selection: { type: "cards"; min: number; max: number; eligibleCardIds: string[] } | null;
  }[];
  declineAction: "decline_response";
};

/**
 * Produces the private, derived choices for one semantic response. The pending
 * state remains the authority for what is required; this module only discovers
 * how the current actor can satisfy it right now.
 */
export function responseDecisionFor(pending: Pending | null, context: ResponseContext | undefined): ResponseDecision | null {
  const response = asResponsePending(pending);
  if (!response || !context) return null;
  const { requirement } = response;
  return { requirement: requirement.kind, options: getResponseOptions({ ...context, requirement }, requirement).map(({ providerId, satisfies, activation, label, selection }) => ({ providerId, satisfies, activation, label, selection })), declineAction: "decline_response" };
}

/** Resolves a selected provider after recomputing it from live server state. */
export function resolveResponseDecision(pending: Pending | null, context: ResponseContext | undefined, providerId: unknown, selection: ResponseSelectionInput) {
  const response = asResponsePending(pending);
  if (!response || !context) return null;
  const cardId = typeof selection.cardId === "string" ? selection.cardId : undefined;
  const cardIds = Array.isArray(selection.cardIds) && selection.cardIds.every((id) => typeof id === "string") ? selection.cardIds : undefined;
  return resolveResponseProvider(providerId, { ...context, requirement: response.requirement, pendingKind: response.continuation.kind, selection: { cardId, cardIds } });
}
