import type { Card } from "../model";
import type { NegationContinuation } from "../pending";

type NegationActor = { id: string; name: string };

/** Applies one successful semantic Negation and nothing else. */
export function applySuccessfulNegation(pending: NegationContinuation, actor: NegationActor, consumedCards: Card[] = []): NegationContinuation {
  const continuation = { ...pending } as NegationContinuation & { readyAfterEventId?: string };
  delete continuation.readyAfterEventId;
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
