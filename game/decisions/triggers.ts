import type { TriggerExecution, TriggerOption } from "../capabilities/triggers";
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

/** Deterministic bot policy: choose the first legal option; target-card costs use the first keys. */
export function chooseBotTrigger(options: readonly TriggerOption[]) {
  const option = options[0];
  if (!option) return null;
  if (!option.selection) return { providerId: option.effectId };
  if (option.selection.type === "cards") {
    const ids = option.selection.eligibleCardIds.slice(0, option.selection.max);
    return ids.length === 1 ? { providerId: option.effectId, cardId: ids[0] } : { providerId: option.effectId, cardIds: ids };
  }
  return { providerId: option.effectId, cardKeys: option.selection.eligibleKeys.slice(0, option.selection.max) };
}
