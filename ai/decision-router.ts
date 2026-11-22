import { botChoice, type BotAuthority, type BotChoice, type BotChoiceDetails, type BotChoiceKind, type BotObservation } from "./bot-observation";

export type BotPolicy = (observation: BotObservation, signal: AbortSignal) => Promise<unknown>;
export type BotDecisionPlan<T> = Readonly<{ kind: BotChoiceKind; payload: T; details?: BotChoiceDetails }>;
export type BotPolicyFailure = "unsupported" | "invalid" | "stale" | "timeout" | "incomplete" | "refusal" | "rate_limited" | "server_error";

export class BotPolicyError extends Error {
  constructor(readonly code: BotPolicyFailure) {
    super(code);
  }
}

export function* chooseExact<T>(values: readonly T[], count: number, start = 0, picked: readonly T[] = []): Generator<readonly T[]> {
  if (!Number.isSafeInteger(count) || count < 0 || count > values.length - start) return;
  if (count === 0) {
    yield picked;
    return;
  }
  for (let index = start; index <= values.length - count; index++) {
    yield* chooseExact(values, count - 1, index + 1, [...picked, values[index]]);
  }
}

function sameAuthority(expected: BotAuthority, latest: BotAuthority) {
  return latest.decisionConsumed === false && latest.actorId === expected.actorId
    && latest.decisionId === expected.decisionId && latest.actionRevision === expected.actionRevision;
}

export function openBotDecision<T>(authority: BotAuthority, plans: readonly BotDecisionPlan<T>[]) {
  const entries = new Map<string, T>();
  const choices = plans.length <= 256 ? plans.map(({ kind, payload, details }) => {
    const choice = botChoice(crypto.randomUUID(), kind, details);
    entries.set(choice.id, structuredClone(payload));
    return choice;
  }) : [];
  let used = false;
  return Object.freeze({
    choices: Object.freeze(choices),
    resolve(id: string, latest: BotAuthority): T | null {
      if (used || authority.decisionConsumed || !sameAuthority(authority, latest) || !entries.has(id)) return null;
      used = true;
      return entries.get(id) ?? null;
    },
  });
}

function readSelection(reply: unknown, observation: BotObservation): string | null {
  if (!reply || typeof reply !== "object" || Array.isArray(reply)) return null;
  const value = reply as Record<string, unknown>;
  if (Object.keys(value).length !== 4 || value.observationVersion !== 2 || value.decisionId !== observation.decisionId
    || typeof value.selectedCandidateId !== "string" || typeof value.reason !== "string" || value.reason.length > 240) return null;
  return observation.choices.some(({ id }) => id === value.selectedCandidateId) ? value.selectedCandidateId : null;
}

export function policyForBotDispatch(aiEnabled: string | undefined, injectedPolicy?: BotPolicy): BotPolicy | undefined {
  return aiEnabled === "true" ? injectedPolicy : undefined;
}

export async function selectBotChoice(
  choices: readonly BotChoice[], observation: BotObservation | null, policy?: BotPolicy, timeoutMs = 750,
): Promise<{ id: string } | { error: BotPolicyFailure }> {
  const first = choices[0];
  if (!first) return { error: "unsupported" };
  if (choices.length === 1 || !policy) return { id: first.id };
  if (!observation || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10_000) return { error: "invalid" };
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new BotPolicyError("timeout"));
        controller.abort();
      }, timeoutMs);
    });
    const result = await Promise.race([policy(observation, controller.signal), timeout]);
    const id = readSelection(result, observation);
    return id ? { id } : { error: "invalid" };
  } catch (error) {
    return { error: error instanceof BotPolicyError ? error.code : "invalid" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
