"use client";

import { useRef, useState } from "react";
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
  publicTarget: PublicTargetPoolView;
  zones: readonly TargetCardPoolZone[];
  selectionCount: string;
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
  const actorTargetProps = props.mode === "actor-target-select" ? props : null;
  const targetReadOnly = props.mode === "target-readonly";
  const targetPublicZonesRef = useRef<HTMLDivElement | null>(null);
  const [activeTargetZoneId, setActiveTargetZoneId] = useState<TargetCardPoolZone["id"]>("hand");
  const targetPublicProps = actorTargetProps ?? (targetReadOnly ? props : null);
  const activeTargetZone = actorTargetProps?.zones.find((zone) => zone.id === activeTargetZoneId)
    ?? actorTargetProps?.zones[0]
    ?? null;
  const focusTargetZone = (zone: TargetCardPoolZone) => {
    setActiveTargetZoneId(zone.id);
    const row = targetPublicZonesRef.current;
    const target = row?.querySelector<HTMLElement>(`[data-target-card-public-zone="${zone.id}"]`);
    if (!row || !target) return;
    const rowRect = row.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    row.scrollTo({
      left: row.scrollLeft + targetRect.left - rowRect.left,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };
  const targetChoices = actorTargetProps?.zones.flatMap((zone) => zone.choices) ?? [];
  const handChoicesByPosition = new Map(targetChoices.flatMap((choice) => choice.type === "concealed-position"
    ? [[choice.position, choice] as const]
    : []));
  const randomHandChoice = targetChoices.find((choice) => choice.type === "random-hand-zone");
  const randomHandSelected = randomHandChoice?.state === "selected";
  const publicChoicesById = new Map(targetChoices.flatMap((choice) => choice.type === "public-card"
    ? [[choice.eligibleKey, choice] as const]
    : []));
  const targetPublicHandCount = targetPublicProps && Number.isFinite(targetPublicProps.publicTarget.handCount)
    ? Math.max(0, Math.floor(targetPublicProps.publicTarget.handCount))
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
    {targetPublicProps && <>
    <div
      ref={targetPublicZonesRef}
      id="card-pool-target-public-zones"
      className="card-pool-panel__target-public-zones"
      role={actorTargetProps ? "tabpanel" : "group"}
      aria-label="Public target card zones"
      aria-labelledby={activeTargetZone ? `card-pool-target-tab-${activeTargetZone.id}` : undefined}
      data-target-card-public-zones="true"
    >
      <div
        className="card-pool-panel__target-public-zone card-pool-panel__target-public-hand"
        data-target-card-public-zone="hand"
        aria-label={`Hand: ${targetPublicHandCount} face-down cards`}
      >
        <b className="card-pool-panel__target-public-zone-title">HAND · {targetPublicHandCount}</b>
        {targetPublicHandCount > 0
          ? <span className={`card-pool-panel__target-public-backs${randomHandSelected ? " pending-choice" : ""}`}>
            {Array.from({ length: targetPublicHandCount }, (_, index) => {
              const choice = handChoicesByPosition.get(index);
              const selected = choice?.state === "selected";
              const choiceKey = choice?.type === "concealed-position" ? choice.opaqueKey : null;
              return <span className={`card-pool-panel__target-public-position${selected ? " pending-choice" : ""}`} key={index}>
                <i className="card-pool-panel__target-public-back" aria-hidden="true" />
                {actorTargetProps && choice && choiceKey && <button
                  type="button"
                  className="card-pool-panel__target-select card-pool-panel__target-public-select harvest-card-select"
                  disabled={props.disabled || Boolean(choice.selectDisabled)}
                  aria-pressed={selected}
                  aria-label={choice.accessibleLabel}
                  onClick={() => actorTargetProps.onToggle(choiceKey)}
                />}
                {actorTargetProps && selected && <span className="card-pool-panel__target-selected" aria-hidden="true">✓</span>}
              </span>;
            })}
            {actorTargetProps && randomHandChoice && <button
              type="button"
              className="card-pool-panel__target-select card-pool-panel__target-public-select card-pool-panel__target-public-random-select harvest-card-select"
              disabled={props.disabled || Boolean(randomHandChoice.selectDisabled)}
              aria-pressed={randomHandSelected}
              aria-label={randomHandChoice.accessibleLabel}
              onClick={() => actorTargetProps.onToggle(randomHandChoice.opaqueKey)}
            />}
            {actorTargetProps && randomHandSelected && <span className="card-pool-panel__target-selected" aria-hidden="true">✓</span>}
          </span>
          : <span className="card-pool-panel__target-public-empty">0 cards</span>}
      </div>
      {([
        { id: "equipment", title: "EQUIPMENT", cards: targetPublicProps.publicTarget.equipmentCards },
        { id: "judgement", title: "JUDGEMENT", cards: targetPublicProps.publicTarget.judgementCards },
      ] as const).filter((zone) => zone.cards.length > 0).map((zone) => <div
        className="card-pool-panel__target-public-zone"
        data-target-card-public-zone={zone.id}
        aria-label={`${zone.title}: ${zone.cards.length} public cards`}
        key={zone.id}
      >
        <b className="card-pool-panel__target-public-zone-title">{zone.title} · {zone.cards.length}</b>
        <div className="card-pool-panel__target-public-faces">
          {zone.cards.map((card) => {
            const choice = publicChoicesById.get(card.id);
            const selected = choice?.state === "selected";
            return <div
            className={`card-pool-panel__target-public-face${selected ? " pending-choice" : ""}`}
            aria-label={`Public ${zone.id}: ${cardDefinition(card.kind).name}`}
            key={card.id}
          >
            <CardFace card={card} />
            {actorTargetProps && choice && <>
              <button
                type="button"
                className="card-pool-panel__target-select card-pool-panel__target-public-select harvest-card-select"
                disabled={props.disabled || Boolean(choice.selectDisabled)}
                aria-pressed={selected}
                aria-label={choice.accessibleLabel}
                onClick={() => actorTargetProps.onToggle(choice.eligibleKey)}
              />
              {selected && <span className="card-pool-panel__target-selected" aria-hidden="true">✓</span>}
              <button
                type="button"
                className="card-pool-panel__target-info harvest-card-info"
                aria-label={`Card details: ${choice.accessibleLabel}`}
                title={`Card details: ${choice.accessibleLabel}`}
                onClick={(event) => { event.stopPropagation(); actorTargetProps.onInfo(choice.publicCardFace, event.currentTarget); }}
              >i</button>
            </>}
          </div>;
          })}
        </div>
      </div>)}
    </div>
      {actorTargetProps && actorTargetProps.zones.length > 1 && <div className="card-pool-panel__tabs" role="tablist" aria-label="Eligible card zones">
        {actorTargetProps.zones.map((zone) => <button
          key={zone.id}
          id={`card-pool-target-tab-${zone.id}`}
          type="button"
          role="tab"
          aria-selected={zone.id === activeTargetZone?.id}
          aria-controls="card-pool-target-public-zones"
          className="card-pool-panel__tab"
          onClick={() => focusTargetZone(zone)}
        >{zone.title}</button>)}
      </div>}
      {actorTargetProps && <>
        <footer className="card-pool-panel__footer harvest-confirm-row">
          <span className="card-pool-panel__selection-count harvest-selection-count" aria-live="polite">{actorTargetProps.selectionCount}</span>
          <button type="button" className="primary card-pool-panel__confirm" disabled={actorTargetProps.confirmDisabled} onClick={actorTargetProps.onConfirm}>{actorTargetProps.actionLabel}</button>
        </footer>
        {actorTargetProps.error && <p className="card-pool-panel__error error" role="alert">{actorTargetProps.error}</p>}
      </>}
    </>}
  </section>;
}
