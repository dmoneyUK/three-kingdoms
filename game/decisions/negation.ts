import type { Card } from "../model";
import type { NegationContinuation } from "../pending";

type NegationActor = { id: string; name: string };

/** Applies one successful semantic Negation and nothing else. */
export function applySuccessfulNegation(pending: NegationContinuation, actor: NegationActor, consumedCards: Card[] = []): NegationContinuation {
  return {
    ...pending,
    readyAfterEventId: undefined,
    negated: !pending.negated,
    latestNegationPlayerId: actor.id,
    latestNegationCardId: consumedCards[0]?.id,
    chainDepth: (pending.chainDepth ?? 0) + 1,
    responseTarget: `${actor.name}'s Negation`,
    ...(pending.heldCards && consumedCards.length ? { heldCards: [...pending.heldCards, ...consumedCards] } : {}),
  };
}
