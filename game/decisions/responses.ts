import type { Card } from "../model";
import type { ResponseExecution, JudgementResolution } from "../responses";
import type { ResponsePending } from "../pending";

export type ResponseApplication = {
  continuation: ResponsePending["continuation"];
  consumeCardIds: string[];
};

export type ResponseJudgementResult = {
  status: "satisfied" | "unsatisfied";
  card?: Card;
  rule: JudgementResolution;
};

/** Performs only the secondary response judgement; continuation consequences stay outside this operation. */
export function resolveResponseJudgement(card: Card | undefined, rule: JudgementResolution): ResponseJudgementResult {
  return { status: rule.succeeds(card) ? "satisfied" : "unsatisfied", ...(card ? { card } : {}), rule };
}

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
