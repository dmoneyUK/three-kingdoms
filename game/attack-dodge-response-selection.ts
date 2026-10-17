import type { PresentationAttackDodgeResponse } from "./presentation-v2";

export type AttackDodgeResponseRootIdentity = {
  rootEventId: string;
  interactionId: string;
  rootFrameId: string;
  sourceId: string;
  targetId: string;
};

export type AttackDodgeResponseSelectionReason =
  | "matched-current-root"
  | "ambiguous-current-root-proof"
  | "live-root-has-no-matching-response"
  | "matched-held-settlement"
  | "ambiguous-held-settlement-proof"
  | "held-settlement-proof-unavailable"
  | "matched-new-public-response"
  | "new-public-response-proof-unavailable"
  | "ambiguous-new-public-responses"
  | "no-new-public-response";

export type AttackDodgeResponseSelection<T> = {
  candidate: T | null;
  reason: AttackDodgeResponseSelectionReason;
};

/** Stable local key for one exact server-proven public Dodge-to-Attack relation. */
export function attackDodgeResponseProofKey(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const proof = value as Partial<PresentationAttackDodgeResponse>;
  const fields = [
    proof.responseEventId,
    proof.responseResolutionId,
    proof.rootEventId,
    proof.rootResolutionId,
    proof.interactionId,
    proof.rootFrameId,
    proof.rootSourceId,
    proof.targetId,
    proof.responseActorId,
  ];
  if (proof.semantics !== "PROVEN" || proof.counterRelation !== "BLOCKS_TARGET_EFFECT"
    || proof.rootCardKind !== "Attack" || proof.responseCardKind !== "Dodge"
    || fields.some((field) => typeof field !== "string" || field.length === 0)) return null;
  return JSON.stringify(fields);
}

export function attackDodgeResponseMatchesRoot(
  proof: PresentationAttackDodgeResponse,
  root: AttackDodgeResponseRootIdentity,
): boolean {
  return proof.rootEventId === root.rootEventId
    && proof.interactionId === root.interactionId
    && proof.rootFrameId === root.rootFrameId
    && proof.rootSourceId === root.sourceId
    && proof.targetId === root.targetId;
}

/** A live Attack may retain only new responses proven against that exact root. */
export function filterAttackDodgeResponseArrivalsForRoot<T extends { proofKey: string }>(
  arrivals: readonly T[],
  candidates: readonly { proof: PresentationAttackDodgeResponse }[],
  root: AttackDodgeResponseRootIdentity | null,
): T[] {
  if (!root) return [...arrivals];
  const matchingProofKeys = new Set(candidates.flatMap(({ proof }) => attackDodgeResponseMatchesRoot(proof, root)
    ? [attackDodgeResponseProofKey(proof)]
    : []).filter((key): key is string => key !== null));
  return arrivals.filter(({ proofKey }) => matchingProofKeys.has(proofKey));
}

/**
 * Selects only a response tied to the current root, an exact held proof, or a
 * newly observed public proof. Historical proof count is never a selector.
 */
export function selectAttackDodgeResponseCandidate<T extends { proof: PresentationAttackDodgeResponse }>(
  candidates: readonly T[],
  options: {
    currentRoot?: AttackDodgeResponseRootIdentity | null;
    heldProofKey?: string | null;
    newlyObservedProofKeys?: readonly string[];
  } = {},
): AttackDodgeResponseSelection<T> {
  const currentRoot = options.currentRoot;
  if (currentRoot) {
    const matched = candidates.filter(({ proof }) => attackDodgeResponseMatchesRoot(proof, currentRoot));
    if (matched.length === 1) return { candidate: matched[0], reason: "matched-current-root" };
    if (matched.length > 1) return { candidate: null, reason: "ambiguous-current-root-proof" };
    return { candidate: null, reason: "live-root-has-no-matching-response" };
  }

  if (options.heldProofKey) {
    const matched = candidates.filter(({ proof }) => attackDodgeResponseProofKey(proof) === options.heldProofKey);
    if (matched.length === 1) return { candidate: matched[0], reason: "matched-held-settlement" };
    if (matched.length > 1) return { candidate: null, reason: "ambiguous-held-settlement-proof" };
    return { candidate: null, reason: "held-settlement-proof-unavailable" };
  }

  const newlyObservedProofKeys = options.newlyObservedProofKeys ?? [];
  if (newlyObservedProofKeys.length > 1) {
    return { candidate: null, reason: "ambiguous-new-public-responses" };
  }
  const newlyObservedProofKey = newlyObservedProofKeys[0];
  if (newlyObservedProofKey) {
    const matched = candidates.filter(({ proof }) => attackDodgeResponseProofKey(proof) === newlyObservedProofKey);
    if (matched.length === 1) return { candidate: matched[0], reason: "matched-new-public-response" };
    return { candidate: null, reason: "new-public-response-proof-unavailable" };
  }

  return { candidate: null, reason: "no-new-public-response" };
}

/** Returns validated proof identities not previously seen by this viewer session. */
export function newlyObservedAttackDodgeResponseKeys<T extends { proof: PresentationAttackDodgeResponse }>(
  candidates: readonly T[],
  seenProofKeys: Set<string>,
): Array<{ proofKey: string; responseEventId: string }> {
  const arrivals: Array<{ proofKey: string; responseEventId: string }> = [];
  for (const { proof } of candidates) {
    const proofKey = attackDodgeResponseProofKey(proof);
    if (!proofKey || seenProofKeys.has(proofKey)) continue;
    seenProofKeys.add(proofKey);
    arrivals.push({ proofKey, responseEventId: proof.responseEventId });
  }
  return arrivals;
}
