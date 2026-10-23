"use client";

import type { Card } from "../game/model";
import { CardFace } from "./card-face";

/** A card face whose identity is already proven public by the caller's projection. */
export type PublicCardPoolChoice = {
  type: "public-card";
  publicCardFace: Card;
  cardName: string;
  state: "available" | "taken" | "selected" | "unavailable";
  accessibleLabel: string;
  statusLabel?: string;
  selectDisabled?: boolean;
};

type SharedProps = {
  title: string;
  instruction: string;
  accessibilityLabel: string;
  rowAccessibilityLabel: string;
  choices: readonly PublicCardPoolChoice[];
  scrollHint?: string;
  onInfo: (card: Card, trigger: HTMLButtonElement) => void;
};

type ReadOnlyProps = SharedProps & {
  mode: "public-readonly";
};

type ActorSelectProps = SharedProps & {
  mode: "actor-select";
  selectionCount: string;
  confirmDisabled: boolean;
  onToggle: (cardId: string) => void;
  onConfirm: () => void;
};

export type CardPoolPanelProps = ReadOnlyProps | ActorSelectProps;

/**
 * Shared one-row public card pool and pinned action footer.
 * The Harvest adapter supplies only already-public faces and server-authorized
 * callbacks; this presentation component does not derive legality or submit.
 */
export function CardPoolPanel(props: CardPoolPanelProps) {
  const actorSelect = props.mode === "actor-select";
  return <section
    className={`card-pool-panel card-pool-panel--${props.mode} harvest-choice-panel${actorSelect ? " harvest-choice-panel--actor" : ""}`}
    data-choice-mode={props.mode}
    aria-label={props.accessibilityLabel}
  >
    <header className="card-pool-panel__heading harvest-choice-heading">
      <b className="card-pool-panel__title">{props.title}</b>
      <span className="card-pool-panel__instruction">{props.instruction}</span>
    </header>
    <div
      className="card-pool-panel__row harvest-card-row"
      role="region"
      aria-label={props.rowAccessibilityLabel}
      tabIndex={props.choices.length > 1 ? 0 : undefined}
    >
      {props.choices.map((choice) => <div
        className={`card-pool-panel__choice harvest-card-choice${choice.state === "taken" ? " is-taken taken" : ""}${choice.state === "selected" ? " is-selected pending-choice" : ""}`}
        data-harvest-card-id={choice.publicCardFace.id}
        data-harvest-card-state={choice.state}
        key={choice.publicCardFace.id}
      >
        <CardFace card={choice.publicCardFace} harvestChoice />
        {actorSelect && <button
          type="button"
          className="card-pool-panel__select harvest-card-select"
          disabled={Boolean(choice.selectDisabled)}
          aria-pressed={choice.state === "selected"}
          aria-label={choice.accessibleLabel}
          onClick={() => props.onToggle(choice.publicCardFace.id)}
        />}
        {!actorSelect && <span className="card-pool-panel__status harvest-availability-label">{choice.statusLabel}</span>}
        {choice.state === "selected" && <span className="card-pool-panel__selected harvest-pending-label">Selected</span>}
        <button
          type="button"
          className="card-pool-panel__info harvest-card-info"
          aria-label={`Details for ${choice.cardName}`}
          title={`Details for ${choice.cardName}`}
          onClick={(event) => props.onInfo(choice.publicCardFace, event.currentTarget)}
        >i</button>
      </div>)}
    </div>
    {props.scrollHint && <span className="card-pool-panel__scroll-hint harvest-scroll-hint" aria-hidden="true">{props.scrollHint}</span>}
    {actorSelect && <footer className="card-pool-panel__footer harvest-confirm-row">
      <span className="card-pool-panel__selection-count harvest-selection-count" aria-live="polite">{props.selectionCount}</span>
      <button type="button" className="primary card-pool-panel__confirm" disabled={props.confirmDisabled} onClick={props.onConfirm}>Confirm choice</button>
    </footer>}
  </section>;
}
