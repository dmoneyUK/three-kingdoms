"use client";

import { useEffect, useRef } from "react";
import { cardDefinition } from "../game/cards";
import type { Card } from "../game/model";
import { CardFace } from "./card-face";

export type CardDetailsContext = "private-hand" | "public-zone";

export function CardDetailsPreview({
  card,
  context,
  onClose,
}: {
  card: Card;
  context: CardDetailsContext;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const definition = cardDefinition(card.kind);

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, []);

  return <div className="card-details-stage" data-card-details-stage="true">
    <section
      className="card-details-panel"
      role="dialog"
      aria-labelledby="card-details-title"
      data-card-details-context={context}
      data-card-details-card-id={card.id}
    >
      <button ref={closeButtonRef} type="button" className="card-info-close card-details-close" onClick={onClose} aria-label="Close card details">×</button>
      <header className="card-details-heading">
        <span>CARD DETAILS</span>
        <small>{context === "public-zone" ? "PUBLIC CARD" : "PRIVATE TO YOU"}</small>
      </header>
      <div className="card-details-body">
        <div className="card-details-illustration" aria-label={`${card.rank} ${card.suit}, ${definition.name}`}>
          <CardFace card={card} />
        </div>
        <div className="card-details-copy">
          <h2 id="card-details-title">{definition.name}</h2>
          <small>{card.rank}{card.suit} · {definition.category} card</small>
          <textarea className="card-details-rules" aria-label={`Canonical rules for ${definition.name}`} readOnly value={definition.rules} />
        </div>
      </div>
    </section>
  </div>;
}
