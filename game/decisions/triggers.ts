import type { TriggerExecution } from "../capabilities/triggers";
import type { TriggerPending } from "../pending";

export type TriggerResume =
  | { kind: "reopen"; pending: TriggerPending }
  | { kind: "resume"; continuation: TriggerPending["continuation"] };

/** Creates the canonical event-shaped optional-reaction decision. */
export function createTriggerDecision(
  event: TriggerPending["event"],
  actorId: string,
  continuation: TriggerPending["continuation"],
  reason: string,
  deadline = 0,
  readyAfterEventId?: string,
): TriggerPending {
  return { kind: "trigger", event, actorId, continuation, reason, deadline, ...(readyAfterEventId ? { readyAfterEventId } : {}) };
}

/**
 * Keeps a domain event open after a provider completed a non-terminal optional
 * reaction. This is deliberately provider-agnostic: only the semantic outcome
 * determines whether the event continues.
 */
export function continueTriggerEvent(
  pending: TriggerPending,
  execution: TriggerExecution,
  deadline?: number,
): TriggerPending | null {
  if (execution.outcome.kind !== "continue_event") return null;
  return {
    ...pending,
    resolvedEffectIds: [...new Set([...(pending.resolvedEffectIds ?? []), execution.effectId])],
    // Reopening is a new visible decision. The orchestration layer must bind
    // it to the presentation event explaining the newly available options.
    readyAfterEventId: undefined,
    ...(deadline === undefined ? {} : { deadline }),
  };
}

/** Applies the semantic result and tells the caller whether to reopen the event or resume it. */
export function resumeTriggerContinuation(
  pending: TriggerPending,
  execution: TriggerExecution,
  remaining: boolean,
  deadline?: number,
): TriggerResume | null {
  if (execution.outcome.kind !== "continue_event") return null;
  const next = continueTriggerEvent(pending, execution, deadline);
  if (!next) return null;
  return remaining ? { kind: "reopen", pending: next } : { kind: "resume", continuation: next.continuation };
}
