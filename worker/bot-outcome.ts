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

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function nonPlaceholderString(value: unknown): value is string {
  return nonEmptyString(value) && !["unknown", "unresolved", "missing", "null", "undefined"].includes(value.trim().toLowerCase());
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const keys = Object.keys(value).sort();
  return keys.length === allowed.length && keys.every((key, index) => key === [...allowed].sort()[index]);
}

function validCorrelation(candidate: Record<string, unknown>) {
  return nonPlaceholderString(candidate.decisionId) && nonPlaceholderString(candidate.actorId)
    && nonPlaceholderString(candidate.actionRevision);
}

function validCommitProof(value: unknown, outer: Record<string, unknown>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proof = value as Record<string, unknown>;
  if (!exactKeys(proof, ["source", "roomId", "decisionId", "actorId", "actionRevision", "commitKind", "reference"])) return false;
  if (proof.source !== "canonical_executor" || !nonPlaceholderString(proof.roomId)
    || !nonPlaceholderString(proof.decisionId) || !nonPlaceholderString(proof.actorId)
    || !nonPlaceholderString(proof.actionRevision)
    || proof.decisionId !== outer.decisionId || proof.actorId !== outer.actorId
    || proof.actionRevision !== outer.actionRevision
    || !["transition", "shared_submission", "checkpoint", "terminal"].includes(String(proof.commitKind))) return false;
  if (!proof.reference || typeof proof.reference !== "object" || Array.isArray(proof.reference)) return false;
  const reference = proof.reference as Record<string, unknown>;
  return exactKeys(reference, ["kind", "id"])
    && ["event", "checkpoint", "submission", "row"].includes(String(reference.kind))
    && nonPlaceholderString(reference.id);
}

export function isBotActionOutcome(value: unknown): value is BotActionOutcome {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (!validCorrelation(candidate) || typeof candidate.kind !== "string") return false;
  if (candidate.kind === "waiting_for_human") return exactKeys(candidate, ["decisionId", "actorId", "actionRevision", "kind"]);
  if (candidate.kind === "unsupported") return exactKeys(candidate, ["decisionId", "actorId", "actionRevision", "kind", "reason"])
    && nonEmptyString(candidate.reason);
  if (candidate.kind === "stale") return exactKeys(candidate, ["decisionId", "actorId", "actionRevision", "kind", "reason"])
    && ["revision_changed", "duplicate", "window_changed"].includes(String(candidate.reason));
  if (candidate.kind === "failed") return exactKeys(candidate, ["decisionId", "actorId", "actionRevision", "kind", "errorCode", "retryable"])
    && ["dispatch_error", "dispatch_rejected", "canonical_rejected", "malformed_result"].includes(String(candidate.errorCode))
    && typeof candidate.retryable === "boolean";
  if (candidate.kind !== "committed") return false;
  if (!exactKeys(candidate, ["decisionId", "actorId", "actionRevision", "kind", "commitProof", "nextActionRevision"])) {
    // nextActionRevision is optional, so accept the five-key committed shape as
    // well while still rejecting every other field.
    if (!exactKeys(candidate, ["decisionId", "actorId", "actionRevision", "kind", "commitProof"])) return false;
  }
  return (candidate.nextActionRevision === undefined || nonPlaceholderString(candidate.nextActionRevision))
    && validCommitProof(candidate.commitProof, candidate);
}

export function outcomeCorrelationMatches(outcome: BotActionOutcome, expected: BotActionOutcomeBase) {
  return outcome.decisionId === expected.decisionId
    && outcome.actorId === expected.actorId
    && outcome.actionRevision === expected.actionRevision;
}
