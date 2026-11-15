/** Common mechanics for simultaneous private responses. No card or skill rules live here. */
export type PrivateWindowSubmission =
  | { kind: "pass" }
  | { kind: "intent"; providerId: string; cardIds: string[] };
export type SharedResponseWindow = { windowId: string; openedAt: number; deadline: number };
export type WindowSettlementLease = { state: "CLAIMED"; claimId: string; leaseUntil: number };
export type PrivateWindowSubmissionRow = { player_id: string; submission_json: string; created_at: number };
export const SHARED_RESPONSE_WINDOW_MS = 8_000;
export const SHARED_RESPONSE_SETTLEMENT_LEASE_MS = 30_000;

export function parsePrivateWindowSubmission(value: string): PrivateWindowSubmission | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const submission = parsed as Record<string, unknown>;
    if (submission.kind === "pass") return { kind: "pass" };
    if (submission.kind !== "intent" || typeof submission.providerId !== "string" || !submission.providerId.trim()
      || !Array.isArray(submission.cardIds) || submission.cardIds.some((id) => typeof id !== "string" || !id)
      || new Set(submission.cardIds).size !== submission.cardIds.length) return null;
    return { kind: "intent", providerId: submission.providerId, cardIds: [...submission.cardIds] as string[] };
  } catch { return null; }
}

/** Policies supply their frozen participants; private availability never removes a participant. */
export function allWindowParticipantsSubmitted(
  participantIds: readonly string[], deadline: number, rows: readonly PrivateWindowSubmissionRow[],
): boolean {
  if (!participantIds.length) return false;
  const submitted = new Set(rows.filter((row) => row.created_at < deadline
    && parsePrivateWindowSubmission(row.submission_json) !== null).map((row) => row.player_id));
  return participantIds.every((id) => submitted.has(id));
}

export function canClaimResponseWindow(
  window: SharedResponseWindow & { settlement?: WindowSettlementLease },
  phase: string, now: number, allExplicit: boolean,
): boolean {
  if (phase === "response") return now >= window.deadline || allExplicit;
  return phase === "resolving" && (!window.settlement || window.settlement.leaseUntil <= now);
}

/** Priority is policy-owned; arrival order never changes the supplied authoritative order. */
export function orderedWindowIntents(
  priorityIds: readonly string[], deadline: number, rows: readonly PrivateWindowSubmissionRow[],
): { playerId: string; submission: Extract<PrivateWindowSubmission, { kind: "intent" }> }[] {
  const byPlayer = new Map(rows.map((row) => [row.player_id, row]));
  return priorityIds.flatMap((playerId) => {
    const row = byPlayer.get(playerId);
    if (!row || row.created_at >= deadline) return [];
    const submission = parsePrivateWindowSubmission(row.submission_json);
    return submission?.kind === "intent" ? [{ playerId, submission }] : [];
  });
}

/** Domain adapters revalidate each candidate; arbitration returns at most one. */
export async function selectFirstValidIntent<T>(priorityIds: readonly string[], deadline: number,
  rows: readonly PrivateWindowSubmissionRow[], validate: (playerId: string, submission: Extract<PrivateWindowSubmission, { kind: "intent" }>) => Promise<T | null>): Promise<T | null> {
  for (const candidate of orderedWindowIntents(priorityIds, deadline, rows)) {
    const result = await validate(candidate.playerId, candidate.submission);
    if (result !== null) return result;
  }
  return null;
}
