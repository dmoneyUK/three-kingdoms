import { cardDefinition } from "../game/cards";
import type { Card } from "../game/model";

function suitColorClass(suit: Card["suit"]) {
  return suit === "♥" || suit === "♦" ? "red-suit" : "black-suit";
}

export function CardFace({ card }: { card: Card }) {
  const definition = cardDefinition(card.kind);
  return <div className={`played-card ${card.kind.toLowerCase()} ${suitColorClass(card.suit)}`}>
    <i>{card.rank}<small>{card.suit}</small></i>
    <b className="card-name-mark">{definition.name}</b>
    <strong>{definition.category} card</strong>
  </div>;
}
