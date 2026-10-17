import type { Card } from "../model";
import type { NegationContinuation, NegationHistoryRecord } from "../pending";
import type { CausalEnvelope } from "../presentation-causality";

type NegationActor = { id: string; name: string };

function provenNegationFrame(pending: NegationContinuation, actor: NegationActor, envelope: CausalEnvelope | null) {
  const causal = pending.causal;
  if (!causal || !envelope || causal.interactionId !== envelope.interactionId || causal.frameId !== envelope.activeFrameId
    || envelope.checkpoint.frameId !== causal.frameId || envelope.checkpoint.stage !== "NEGATION") return null;
  const frame = envelope.frames.find(({ frameId }) => frameId === causal.frameId);
  if (!frame || frame.stage !== "NEGATION" || frame.current.resolvingPlayerId !== actor.id) return null;
  return { interactionId: causal.interactionId, frameId: causal.frameId };
}

function validNegationHistory(value: unknown, interactionId: string, frameId: string): value is NegationHistoryRecord[] {
  if (!Array.isArray(value)) return false;
  const nodeIds = new Set<string>();
  const physicalCardIds = new Set<string>();
  let previousNodeId: string | null = null;
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const node = item as Partial<NegationHistoryRecord>;
    if (typeof node.nodeId !== "string" || !node.nodeId
      || node.interactionId !== interactionId || node.frameId !== frameId
      || node.causedByNodeId !== previousNodeId
      || typeof node.actorId !== "string" || !node.actorId
      || typeof node.physicalCardId !== "string" || !node.physicalCardId
      || node.kind !== "NEGATION_CARD"
      || nodeIds.has(node.nodeId) || physicalCardIds.has(node.physicalCardId)) return false;
    nodeIds.add(node.nodeId);
    physicalCardIds.add(node.physicalCardId);
    previousNodeId = node.nodeId;
  }
  return true;
}

/** Applies one successful semantic Negation and nothing else. */
export function applySuccessfulNegation(
  pending: NegationContinuation,
  actor: NegationActor,
  consumedCards: Card[] = [],
  causalEnvelope: CausalEnvelope | null = null,
): NegationContinuation {
  const continuation = { ...pending } as NegationContinuation & { readyAfterEventId?: string };
  delete continuation.readyAfterEventId;
  const causal = pending.causal;
  const identity = causal?.interactionId && causal.frameId
    ? { interactionId: causal.interactionId, frameId: causal.frameId }
    : null;
  const historyValue: unknown = pending.negationHistory;
  const historyIsValid = Boolean(identity && validNegationHistory(historyValue, identity.interactionId, identity.frameId));
  if (historyValue !== undefined && !historyIsValid) delete continuation.negationHistory;
  if (consumedCards.length === 1 && consumedCards[0]?.kind === "Negation") {
    const proven = provenNegationFrame(pending, actor, causalEnvelope);
    if (proven && identity && proven.interactionId === identity.interactionId && proven.frameId === identity.frameId
      && (historyValue === undefined || historyIsValid)) {
      const history = historyIsValid ? [...pending.negationHistory!] : [];
      const previousNodeId = history.at(-1)?.nodeId ?? null;
      history.push({
        nodeId: `${proven.interactionId}:${proven.frameId}:negation:${history.length + 1}`,
        interactionId: proven.interactionId,
        frameId: proven.frameId,
        causedByNodeId: previousNodeId,
        actorId: actor.id,
        physicalCardId: consumedCards[0].id,
        kind: "NEGATION_CARD",
      });
      continuation.negationHistory = history;
    }
  }
  return {
    ...continuation,
    negated: !continuation.negated,
    latestNegationPlayerId: actor.id,
    latestNegationCardId: consumedCards[0]?.id,
    chainDepth: (continuation.chainDepth ?? 0) + 1,
    responseTarget: `${actor.name}'s Negation`,
    ...(continuation.heldCards && consumedCards.length ? { heldCards: [...continuation.heldCards, ...consumedCards] } : {}),
  };
}
