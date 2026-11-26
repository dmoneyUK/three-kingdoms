import type { BotPolicy } from "../ai/decision-router";
import type { BotSchedulerDiagnosticContext } from "./bot-diagnostics";
import type { BotActionOutcome, BotActionOutcomeBase, BotCommitProof } from "./bot-outcome";
import { createBotRuntimeCounters, type BotRuntimeCounters } from "./bot-runtime-counters";

const BOT_ACTION_CAPABILITY = Symbol("server-owned-bot-action");

export type BotActionPrincipalInput = {
  roomId: string;
  botId: string;
  actionRevision: string;
  decisionId: string;
  diagnostics?: BotSchedulerDiagnosticContext;
  mockPolicy?: BotPolicy;
  runtimeCounters?: BotRuntimeCounters;
};

export type BotActionPrincipal = BotActionPrincipalInput & {
  readonly [BOT_ACTION_CAPABILITY]: true;
};

/**
 * Private, in-process completion channel.  It is intentionally held in a
 * WeakMap rather than on the request body/principal so a public HTTP caller
 * cannot select compact mode or forge a completion proof.
 */
export type BotExecutionContext = {
  readonly correlation: BotActionOutcomeBase;
  /** Opaque per-dispatch capability used only by nested in-process projections. */
  readonly projectionToken: string;
  outcome?: BotActionOutcome;
  commit?: BotCommitProof;
  readonly diagnosticsDetailEnabled?: boolean;
  readonly runtimeCounters: BotRuntimeCounters;
};

const EXECUTION_CONTEXTS = new WeakMap<object, BotExecutionContext>();

export function createBotActionPrincipal(input: BotActionPrincipalInput): BotActionPrincipal {
  const principal = {
    roomId: input.roomId,
    botId: input.botId,
    actionRevision: input.actionRevision,
    decisionId: input.decisionId,
    ...(input.diagnostics ? { diagnostics: input.diagnostics } : {}),
    ...(input.mockPolicy ? { mockPolicy: input.mockPolicy } : {}),
    [BOT_ACTION_CAPABILITY]: true as const,
  };
  return Object.freeze(principal) as BotActionPrincipal;
}

export function createBotExecutionContext(correlation: BotActionOutcomeBase, diagnosticsDetailEnabled = false, runtimeCounters?: BotRuntimeCounters): BotExecutionContext {
  return { correlation, projectionToken: crypto.randomUUID(), diagnosticsDetailEnabled, runtimeCounters: runtimeCounters ?? createBotRuntimeCounters() };
}

export function attachBotExecutionContext(principal: BotActionPrincipal, context: BotExecutionContext) {
  EXECUTION_CONTEXTS.set(principal, context);
  return principal;
}

export function getBotExecutionContext(value: unknown): BotExecutionContext | null {
  return value && typeof value === "object" ? EXECUTION_CONTEXTS.get(value) ?? null : null;
}

export function recordBotOutcome(context: BotExecutionContext, outcome: BotActionOutcome) {
  context.outcome = outcome;
}

export function recordBotCommit(context: BotExecutionContext, proof: BotCommitProof) {
  context.commit = proof;
}

export function isBotActionPrincipal(value: unknown): value is BotActionPrincipal {
  if (!value || typeof value !== "object") return false;
  const principal = value as Partial<BotActionPrincipal>;
  return principal[BOT_ACTION_CAPABILITY] === true
    && typeof principal.roomId === "string"
    && typeof principal.botId === "string"
    && typeof principal.actionRevision === "string"
    && typeof principal.decisionId === "string";
}
