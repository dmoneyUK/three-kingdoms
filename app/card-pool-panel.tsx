"use client";

import type { Card } from "../game/model";
import { cardDefinition } from "../game/cards";
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
};

type PublicPoolProps = SharedProps & {
  rowAccessibilityLabel: string;
  choices: readonly PublicCardPoolChoice[];
  scrollHint?: string;
  onInfo: (card: Card, trigger: HTMLButtonElement) => void;
};

type ReadOnlyProps = PublicPoolProps & {
  mode: "public-readonly";
};

type ActorSelectProps = PublicPoolProps & {
  mode: "actor-select";
  selectionCount: string;
  confirmDisabled: boolean;
  onToggle: (cardId: string) => void;
  onConfirm: () => void;
};

export type TargetCardPoolChoice =
  | {
    type: "public-card";
    eligibleKey: string;
    publicCardFace: Card;
    cardName: string;
    accessibleLabel: string;
    state: "available" | "selected";
    selectDisabled?: boolean;
  }
  | {
    type: "concealed-position";
    opaqueKey: string;
    accessibleLabel: string;
    position: number;
    state: "available" | "selected";
    selectDisabled?: boolean;
  }
  | {
    type: "random-hand-zone";
    opaqueKey: "hand";
    accessibleLabel: string;
    totalPublicHandCount: number;
    state: "available" | "selected";
    selectDisabled?: boolean;
  };

export type TargetCardPoolZone = {
  id: "hand" | "equipment" | "judgement";
  title: string;
  accessibleName: string;
  choices: readonly TargetCardPoolChoice[];
};

type TargetSelectProps = SharedProps & {
  mode: "actor-target-select";
  zones: readonly TargetCardPoolZone[];
  activeZone: TargetCardPoolZone["id"];
  onActiveZoneChange: (zone: TargetCardPoolZone["id"]) => void;
  selectionCount: string;
  selectedZoneMessage?: string;
  actionLabel: string;
  disabled: boolean;
  confirmDisabled: boolean;
  error?: string;
  onToggle: (eligibleKey: string) => void;
  onConfirm: () => void;
  onInfo: (card: Card, trigger: HTMLButtonElement) => void;
};

export type PublicTargetPoolView = {
  handCount: number;
  equipmentCards: readonly Card[];
  judgementCards: readonly Card[];
};

type TargetReadOnlyProps = SharedProps & {
  mode: "target-readonly";
  publicTarget: PublicTargetPoolView;
};

export type CardPoolPanelProps = ReadOnlyProps | ActorSelectProps | TargetSelectProps | TargetReadOnlyProps;

/**
 * Shared one-row public card pool and pinned action footer.
 * The Harvest adapter supplies only already-public faces and server-authorized
 * callbacks; this presentation component does not derive legality or submit.
 */
export function CardPoolPanel(props: CardPoolPanelProps) {
  const actorSelect = props.mode === "actor-select";
  const targetSelect = props.mode === "actor-target-select";
  const targetReadOnly = props.mode === "target-readonly";
  const targetReadOnlyHandCount = targetReadOnly && Number.isFinite(props.publicTarget.handCount)
    ? Math.max(0, Math.floor(props.publicTarget.handCount))
    : 0;
  return <section
    className={`card-pool-panel card-pool-panel--${props.mode} harvest-choice-panel${actorSelect || targetSelect ? " harvest-choice-panel--actor" : ""}`}
    data-choice-mode={props.mode}
    data-target-card-pool-readonly={targetReadOnly ? "true" : undefined}
    aria-label={props.accessibilityLabel}
  >
    <header className="card-pool-panel__heading harvest-choice-heading">
      <b className="card-pool-panel__title">{props.title}</b>
      <span className="card-pool-panel__instruction">{props.instruction}</span>
      {targetReadOnly && <small className="card-pool-panel__readonly-label">PUBLIC · READ ONLY</small>}
    </header>
    {!targetSelect && !targetReadOnly && <>
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
    </>}
    {targetSelect && (() => {
      const activeZone = props.zones.find((zone) => zone.id === props.activeZone) ?? props.zones[0];
      if (!activeZone) return null;
      const selectedZone = props.zones.find((zone) => zone.choices.some((choice) => choice.state === "selected"));
      return <>
        {props.zones.length > 1 && <div className="card-pool-panel__tabs" role="tablist" aria-label="Eligible card zones">
          {props.zones.map((zone) => <button
            key={zone.id}
            id={`card-pool-tab-${zone.id}`}
            type="button"
            role="tab"
            aria-selected={zone.id === activeZone.id}
            aria-controls="card-pool-target-row"
            className="card-pool-panel__tab"
            onClick={() => props.onActiveZoneChange(zone.id)}
          >{zone.title}</button>)}
        </div>}
        {selectedZone && selectedZone.id !== activeZone.id && props.selectedZoneMessage && <p className="card-pool-panel__selected-zone" role="status">{props.selectedZoneMessage}</p>}
        <div id="card-pool-target-row" className="card-pool-panel__tabpanel" role="tabpanel" aria-label={activeZone.accessibleName}>
          <div className="card-pool-panel__target-row harvest-card-row" role="region" aria-label={`Eligible ${activeZone.accessibleName}`} tabIndex={activeZone.choices.length > 1 ? 0 : undefined}>
            {activeZone.choices.map((choice) => {
              const key = choice.type === "public-card" ? choice.eligibleKey : choice.opaqueKey;
              const selected = choice.state === "selected";
              const disabled = props.disabled || Boolean(choice.selectDisabled);
              return <div className={`card-pool-panel__target-choice harvest-card-choice${selected ? " pending-choice" : ""}`} data-choice-key-type={choice.type} key={key}>
                {choice.type === "public-card" && <CardFace card={choice.publicCardFace} harvestChoice />}
                {choice.type === "concealed-position" && <span className="card-pool-panel__concealed" aria-hidden="true"><b>?</b><small>HAND {choice.position + 1}</small></span>}
                {choice.type === "random-hand-zone" && <span className="card-pool-panel__random-hand" aria-hidden="true"><b>?</b><small>Random card</small><small>Hand ×{choice.totalPublicHandCount}</small></span>}
                <button type="button" className="card-pool-panel__target-select harvest-card-select" disabled={disabled} aria-pressed={selected} aria-label={choice.accessibleLabel} onClick={() => props.onToggle(key)} />
                {selected && <span className="card-pool-panel__target-selected" aria-hidden="true">✓</span>}
                {choice.type === "public-card" && <button
                  type="button"
                  className="card-pool-panel__target-info harvest-card-info"
                  aria-label={`Card details: ${choice.accessibleLabel}`}
                  title={`Card details: ${choice.accessibleLabel}`}
                  onClick={(event) => { event.stopPropagation(); props.onInfo(choice.publicCardFace, event.currentTarget); }}
                >i</button>}
              </div>;
            })}
          </div>
        </div>
        <footer className="card-pool-panel__footer harvest-confirm-row">
          <span className="card-pool-panel__selection-count harvest-selection-count" aria-live="polite">{props.selectionCount}</span>
          <button type="button" className="primary card-pool-panel__confirm" disabled={props.confirmDisabled} onClick={props.onConfirm}>{props.actionLabel}</button>
        </footer>
        {props.error && <p className="card-pool-panel__error error" role="alert">{props.error}</p>}
      </>;
    })()}
    {targetReadOnly && <div className="card-pool-panel__target-public-zones" role="group" aria-label="Public target card zones">
      <div
        className="card-pool-panel__target-public-zone card-pool-panel__target-public-hand"
        data-target-card-public-zone="hand"
        aria-label={`Hand: ${targetReadOnlyHandCount} face-down cards`}
      >
        <b className="card-pool-panel__target-public-zone-title">HAND · {targetReadOnlyHandCount}</b>
        {targetReadOnlyHandCount > 0
          ? <span className="card-pool-panel__target-public-backs" aria-hidden="true">
            {Array.from({ length: Math.min(targetReadOnlyHandCount, 5) }, (_, index) =>
              <i className="card-pool-panel__target-public-back" key={index} />)}
            {targetReadOnlyHandCount > 5 && <small>+{targetReadOnlyHandCount - 5}</small>}
          </span>
          : <span className="card-pool-panel__target-public-empty">0 cards</span>}
      </div>
      {([
        { id: "equipment", title: "EQUIPMENT", cards: props.publicTarget.equipmentCards },
        { id: "judgement", title: "JUDGEMENT", cards: props.publicTarget.judgementCards },
      ] as const).filter((zone) => zone.cards.length > 0).map((zone) => <div
        className="card-pool-panel__target-public-zone"
        data-target-card-public-zone={zone.id}
        aria-label={`${zone.title}: ${zone.cards.length} public cards`}
        key={zone.id}
      >
        <b className="card-pool-panel__target-public-zone-title">{zone.title} · {zone.cards.length}</b>
        <div className="card-pool-panel__target-public-faces">
          {zone.cards.map((card) => <div
            className="card-pool-panel__target-public-face"
            aria-label={`Public ${zone.id}: ${cardDefinition(card.kind).name}`}
            key={card.id}
          ><CardFace card={card} /></div>)}
        </div>
      </div>)}
    </div>}
  </section>;
}
