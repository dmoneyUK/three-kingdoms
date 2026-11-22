import { cardDefinition } from "../game/cards";
import type { Card } from "../game/model";

function suitColorClass(suit: Card["suit"]) {
  return suit === "♥" || suit === "♦" ? "red-suit" : "black-suit";
}

export function CardRankSuit({ card, hand = false }: { card: Pick<Card, "rank" | "suit">; hand?: boolean }) {
  return hand
    ? <span className="corner card-rank-suit">{card.rank}<i className="card-rank-suit-glyph">{card.suit}</i></span>
    : <i className="card-rank-suit">{card.rank}<small className="card-rank-suit-glyph">{card.suit}</small></i>;
}

export function CardFace({ card, settlementCardId, harvestChoice = false, publicEffectFrameCardId }: { card: Card; settlementCardId?: string; harvestChoice?: boolean; publicEffectFrameCardId?: string }) {
  const definition = cardDefinition(card.kind);
  // This single long word cannot fit a phone Harvest card face at the
  // established readable type size. Add a discretionary hyphen at a natural
  // break only in the compact public choice pool; the card's semantic name
  // and all accessible action labels continue to use the unmodified name.
  const displayName = harvestChoice && card.kind === "Overindulgence"
    ? "Overindul\u00adgence"
    : definition.name;
  return <div className={`played-card ${card.kind.toLowerCase()} ${suitColorClass(card.suit)}`} data-card-title-fit={definition.name.length > 20 ? "long" : undefined} data-settlement-card-id={settlementCardId} data-public-card-effect-frame-card-id={publicEffectFrameCardId}>
    <CardRankSuit card={card} />
    <b className="card-name-mark">{displayName}</b>
    <strong>{definition.category} card</strong>
  </div>;
}
