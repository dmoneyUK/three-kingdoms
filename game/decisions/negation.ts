import type { Card } from "../model";
import type { NegationPending } from "../pending";

type NegationActor = { id: string; name: string };

/** Applies one successful semantic Negation and nothing else. */
export function applySuccessfulNegation(pending: NegationPending, actor: NegationActor, consumedCards: Card[] = []): NegationPending {
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
