import type { ResponseExecution } from "../responses";
import type { ResponsePending } from "../pending";

export type ResponseApplication = {
  continuation: ResponsePending["continuation"];
  consumeCardIds: string[];
};

/**
 * Canonical response transition boundary. Providers only report the semantic
 * requirement they satisfied; continuation-specific code resumes the effect
 * without inspecting the provider identity.
 */
export function applyResponseSatisfied(
  pending: ResponsePending,
  execution: ResponseExecution,
): ResponseApplication | null {
  if (execution.status !== "satisfied" || execution.satisfies !== pending.requirement.kind) return null;
  return {
    continuation: pending.continuation,
    consumeCardIds: execution.consumeCardIds ?? [],
  };
}

/** Canonical decline transition. The continuation decides what failure means. */
export function applyResponseDeclined(pending: ResponsePending) {
  return { continuation: pending.continuation };
}
