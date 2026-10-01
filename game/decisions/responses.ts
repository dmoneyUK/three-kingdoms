import type { Card } from "../model";
import type { ResponseExecution } from "../responses";
import { resolveJudgement, type JudgementResolution } from "./judgement";
import type { ResponsePending } from "../pending";
import { semanticResponseActor } from "../response-identity";

export type ResponseApplication = {
  continuation: ResponsePending["continuation"];
  consumeCardIds: string[];
};

export type ResponseJudgementResult = {
  status: "satisfied" | "unsatisfied";
  card?: Card;
  rule: JudgementResolution;
};

/** Returns the same semantic response decision when another response remains. */
export function responseAfterSemanticSuccess(pending: ResponsePending): ResponsePending | null {
  if (pending.requirement.kind !== "attack" && pending.requirement.kind !== "dodge") return null;
  const remaining = (pending.requirement.count ?? 1) - 1;
  if (remaining <= 0) return null;
  return {
    ...pending,
    actorId: semanticResponseActor(pending),
    requirement: { ...pending.requirement, count: remaining },
    delegation: undefined,
    deadline: 0,
    readyAfterEventId: undefined,
  };
}

/** Performs only the secondary response judgement; continuation consequences stay outside this operation. */
export function resolveResponseJudgement(card: Card | undefined, rule: JudgementResolution): ResponseJudgementResult {
  const result = resolveJudgement(card, rule);
  return { status: result.status, ...(result.finalCard ? { card: result.finalCard } : {}), rule };
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
