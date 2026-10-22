import { cardDefinition } from "../game/cards";
import type { Card } from "../game/model";

function suitColorClass(suit: Card["suit"]) {
  return suit === "♥" || suit === "♦" ? "red-suit" : "black-suit";
}

export function CardFace({ card, settlementCardId, harvestChoice = false }: { card: Card; settlementCardId?: string; harvestChoice?: boolean }) {
  const definition = cardDefinition(card.kind);
  // This single long word cannot fit a phone Harvest card face at the
  // established readable type size. Add a discretionary hyphen at a natural
  // break only in the compact public choice pool; the card's semantic name
  // and all accessible action labels continue to use the unmodified name.
  const displayName = harvestChoice && card.kind === "Overindulgence"
    ? "Overindul\u00adgence"
    : definition.name;
  return <div className={`played-card ${card.kind.toLowerCase()} ${suitColorClass(card.suit)}`} data-settlement-card-id={settlementCardId}>
    <i>{card.rank}<small>{card.suit}</small></i>
    <b className="card-name-mark">{displayName}</b>
    <strong>{definition.category} card</strong>
  </div>;
}
