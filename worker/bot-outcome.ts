/**
 * Server-only result contract for the compact Bot executor.
 *
 * This module deliberately contains no room, card, role, token or viewer
 * projection data.  The scheduler uses the correlation fields and the
 * canonical commit proof to decide whether a leased work item may be acked.
 */

export type BotCommitKind = "transition" | "shared_submission" | "checkpoint" | "terminal";
export type BotCommitReference = { kind: "event" | "checkpoint" | "submission" | "row"; id: string };

export type BotCommitProof = {
  source: "canonical_executor";
  roomId: string;
  decisionId: string;
  actorId: string;
  actionRevision: string;
  commitKind: BotCommitKind;
  reference: BotCommitReference;
};

export type BotActionOutcomeBase = {
  decisionId: string;
  actorId: string;
  actionRevision: string;
};

export type BotActionOutcome = BotActionOutcomeBase & (
  | {
    kind: "committed";
    commitProof: BotCommitProof;
    nextActionRevision?: string;
  }
  | { kind: "waiting_for_human" }
  | { kind: "stale"; reason: "revision_changed" | "duplicate" | "window_changed" }
  | { kind: "unsupported"; reason: string }
  | {
    kind: "failed";
    errorCode: "dispatch_error" | "dispatch_rejected" | "canonical_rejected" | "malformed_result";
    retryable: boolean;
  }
);

export function isBotActionOutcome(value: unknown): value is BotActionOutcome {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.decisionId !== "string" || typeof candidate.actorId !== "string"
    || typeof candidate.actionRevision !== "string" || typeof candidate.kind !== "string") return false;
  if (candidate.kind === "waiting_for_human") return true;
  if (candidate.kind === "unsupported") return typeof candidate.reason === "string" && candidate.reason.length > 0;
  if (candidate.kind === "stale") return ["revision_changed", "duplicate", "window_changed"].includes(String(candidate.reason));
  if (candidate.kind === "failed") return ["dispatch_error", "dispatch_rejected", "canonical_rejected", "malformed_result"].includes(String(candidate.errorCode))
    && typeof candidate.retryable === "boolean";
  if (candidate.kind !== "committed") return false;
  const proof = candidate.commitProof;
  return Boolean(proof && typeof proof === "object" && !Array.isArray(proof)
    && (proof as Record<string, unknown>).source === "canonical_executor"
    && typeof (proof as Record<string, unknown>).roomId === "string"
    && typeof (proof as Record<string, unknown>).decisionId === "string"
    && typeof (proof as Record<string, unknown>).actorId === "string"
    && typeof (proof as Record<string, unknown>).actionRevision === "string"
    && ["transition", "shared_submission", "checkpoint", "terminal"].includes(String((proof as Record<string, unknown>).commitKind))
    && Boolean((proof as Record<string, unknown>).reference && typeof (proof as Record<string, unknown>).reference === "object"
      && ["event", "checkpoint", "submission", "row"].includes(String(((proof as Record<string, unknown>).reference as Record<string, unknown>).kind))
      && typeof ((proof as Record<string, unknown>).reference as Record<string, unknown>).id === "string"
      && ((proof as Record<string, unknown>).reference as Record<string, unknown>).id));
}

export function outcomeCorrelationMatches(outcome: BotActionOutcome, expected: BotActionOutcomeBase) {
  return outcome.decisionId === expected.decisionId
    && outcome.actorId === expected.actorId
    && outcome.actionRevision === expected.actionRevision;
}

export function botCommitKindForAction(action: string, terminal = false): BotCommitKind {
  if (terminal) return "terminal";
  if (["respond", "decline_response", "give_peach", "skip_rescue"].includes(action)) return "shared_submission";
  if (action === "draw") return "checkpoint";
  return "transition";
}
