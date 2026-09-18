import type { Card } from "../model";
import { shuffle } from "../cards";

/** The semantic interpretation of the final card in a Judgement. */
export type JudgementResolution = {
  kind: "judgement";
  succeeds: (card: Card | undefined) => boolean;
  label: string;
  successText: string;
  failureText: string;
};

export type JudgementResult = {
  status: "satisfied" | "unsatisfied";
  revealedCard?: Card;
  finalCard?: Card;
  rule: JudgementResolution;
};

/**
 * Starts a real Judgement by taking exactly one card from the draw source.
 * The caller owns the destination of the final card; this helper only owns
 * deck/discard movement and existing reshuffle behaviour.
 */
export function drawJudgementCard(deck: Card[], discard: Card[]) {
  let nextDeck = [...deck];
  let nextDiscard = [...discard];
  let reshuffled = false;
  if (!nextDeck.length && nextDiscard.length) {
    nextDeck = shuffle(nextDiscard);
    nextDiscard = [];
    reshuffled = true;
  }
  return { deck: nextDeck, discard: nextDiscard, card: nextDeck.shift(), reshuffled };
}

/**
 * Completes the semantic Judgement after any replacement/modification step.
 * `finalCard` defaults to the revealed card, so future Judgement-changing
 * skills can replace it without creating a second Judgement engine.
 */
export function resolveJudgement(revealedCard: Card | undefined, rule: JudgementResolution, finalCard = revealedCard): JudgementResult {
  return {
    status: rule.succeeds(finalCard) ? "satisfied" : "unsatisfied",
    ...(revealedCard ? { revealedCard } : {}),
    ...(finalCard ? { finalCard } : {}),
    rule,
  };
}
