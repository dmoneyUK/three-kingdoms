import type { Card } from "../model";
import { shuffle } from "../cards";

/** The small serializable domain of Judgements currently implemented. */
export type JudgementPurpose = "luoshen" | "overindulgence" | "rations_depleted" | "lightning" | "eight_trigrams" | "ganglie";

/** The semantic interpretation of the final card in a Judgement. */
export type JudgementResolution = {
  kind: "judgement";
  purpose: JudgementPurpose;
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

export function judgementSucceeds(purpose: JudgementPurpose, card: Card | undefined) {
  if (!card) return false;
  if (purpose === "luoshen") return card.suit === "♠" || card.suit === "♣";
  if (purpose === "overindulgence") return card.suit === "♥";
  if (purpose === "rations_depleted") return card.suit === "♣";
  if (purpose === "lightning") {
    const rank = Number(card.rank);
    return card.suit === "♠" && rank >= 2 && rank <= 9;
  }
  if (purpose === "ganglie") return card.suit !== "♥";
  return card.suit === "♥" || card.suit === "♦";
}

export function judgementResolutionFor(purpose: JudgementPurpose): JudgementResolution {
  if (purpose === "luoshen") return { kind: "judgement", purpose, label: "Luoshen", successText: "The black result is obtained and Luoshen may be used again.", failureText: "The result is red, so Luoshen ends." };
  if (purpose === "overindulgence") return { kind: "judgement", purpose, label: "Overindulgence", successText: "The Heart result allows the Play Phase.", failureText: "The result is not a Heart, so the Play Phase is skipped." };
  if (purpose === "rations_depleted") return { kind: "judgement", purpose, label: "Rations Depleted", successText: "The Club result allows the Draw Phase.", failureText: "The result is not a Club, so the Draw Phase is skipped." };
  if (purpose === "lightning") return { kind: "judgement", purpose, label: "Lightning", successText: "Lightning strikes for 3 thunder damage.", failureText: "Lightning misses and transfers to the next eligible Judgement Zone." };
  if (purpose === "ganglie") return { kind: "judgement", purpose, label: "Stauchness", successText: "The result is not a Heart; the source must choose a consequence.", failureText: "The Heart result means Stauchness has no effect." };
  return { kind: "judgement", purpose, label: "Eight Trigrams Formation", successText: "The red result counts as Dodge.", failureText: "The result does not satisfy Dodge." };
}

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
    status: judgementSucceeds(rule.purpose, finalCard) ? "satisfied" : "unsatisfied",
    ...(revealedCard ? { revealedCard } : {}),
    ...(finalCard ? { finalCard } : {}),
    rule,
  };
}
