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
  onClose: (restoreFocus?: boolean) => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const definition = cardDefinition(card.kind);

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const dismissOutsideTap = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      // The stage passes pointer events through outside the panel. Closing on
      // pointerdown keeps the underlying game control's click available.
      onClose(false);
    };
    document.addEventListener("pointerdown", dismissOutsideTap);
    return () => document.removeEventListener("pointerdown", dismissOutsideTap);
  }, [onClose]);

  return <div className="card-details-stage" data-card-details-stage="true">
    <section
      ref={panelRef}
      className="card-details-panel"
      role="dialog"
      aria-labelledby="card-details-title"
      aria-describedby="card-details-context"
      data-card-details-context={context}
      data-card-details-card-id={card.id}
    >
      <button ref={closeButtonRef} type="button" className="card-info-close card-details-close" onClick={onClose} aria-label="Close card details">×</button>
      <h2 className="card-details-sr-only" id="card-details-title">{definition.name}, {card.rank}{card.suit}</h2>
      <p className="card-details-sr-only" id="card-details-context">{context === "public-zone" ? "Public card details." : "Private card details, visible only to you."}</p>
      <div className="card-details-body">
        <div className="card-details-illustration" role="img" aria-label={`${card.rank} ${card.suit}, ${definition.name}`}>
          <CardFace card={card} />
        </div>
        <div className="card-details-copy">
          <textarea
            className="card-details-rules"
            aria-label={`Canonical rules for ${definition.name}`}
            readOnly
            rows={Math.min(8, Math.max(4, Math.ceil(definition.rules.length / 42)))}
            value={definition.rules}
          />
        </div>
      </div>
    </section>
  </div>;
}
