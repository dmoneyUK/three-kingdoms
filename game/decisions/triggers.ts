import type { TriggerExecution } from "../capabilities/triggers";
import type { TriggerPending } from "../pending";

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
  if (execution.outcome !== "continue_event") return null;
  return {
    ...pending,
    resolvedEffectIds: [...new Set([...(pending.resolvedEffectIds ?? []), execution.effectId])],
    ...(deadline === undefined ? {} : { deadline }),
  };
}
