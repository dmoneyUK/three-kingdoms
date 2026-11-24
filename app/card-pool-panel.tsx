"use client";

import { useEffect, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode, type RefCallback } from "react";
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
  confirmPending?: boolean;
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
  selectionControls?: ReactNode;
  scrollHint?: string;
  handCountHeading?: string;
  handRailDescription?: string;
  selectionCount: string;
  confirmAccessibleLabel: string;
  confirmPending?: boolean;
  skipAction?: { disabled: boolean; pending?: boolean; accessibleLabel: string; onClick: () => void };
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

type CardPoolMiniFaceProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  card: Card;
  variant?: "standard" | "compact-target";
  children?: ReactNode;
};

/** Shared physical CardFace used for compact public target zones and private
 * deck ordering. This component owns only neutral card appearance; callers
 * retain their own selection and drag controls. */
export function CardPoolMiniFace({ card, variant = "standard", className = "", children, ...attributes }: CardPoolMiniFaceProps) {
  const classes = `card-pool-mini-face${variant === "compact-target" ? " card-pool-mini-face--compact-target" : ""}${className ? ` ${className}` : ""}`;
  return <div {...attributes} className={classes}>
    <CardFace card={card} />
    {children}
  </div>;
}

export type CardPoolDecisionButtonAction = {
  accessibleLabel: string;
  disabled: boolean;
  pending?: boolean;
  onClick: () => void;
};

export function CardPoolDecisionFooter({
  selectionCount,
  confirmAction,
  skipAction,
  cancelAction,
  className = "",
}: {
  selectionCount?: string;
  confirmAction: CardPoolDecisionButtonAction;
  skipAction?: CardPoolDecisionButtonAction;
  cancelAction?: { accessibleLabel?: string; disabled: boolean; onClick: () => void };
  className?: string;
}) {
  const hasSelectionCount = Boolean(selectionCount?.trim());
  return <footer
    className={`card-pool-panel__footer card-pool-decision-footer${className ? ` ${className}` : ""}`}
    data-pool-action-footer="true"
    data-skip-visible={skipAction ? "true" : undefined}
  >
    {hasSelectionCount && <span className="card-pool-decision-footer__count" aria-live="polite">{selectionCount}</span>}
    <div className="card-pool-decision-footer__actions">
      {cancelAction && <button
        type="button"
        className="end card-pool-decision-footer__cancel"
        aria-label={cancelAction.accessibleLabel ?? "Cancel card selection"}
        disabled={cancelAction.disabled}
        onClick={cancelAction.onClick}
      >Cancel</button>}
      <div className="card-pool-decision-footer__pair" data-action-count={skipAction ? "2" : "1"}>
        {skipAction && <button
          type="button"
          className="end card-pool-decision-footer__button card-pool-decision-footer__skip wtk-card-pool-action--skip"
          data-pool-action="skip"
          aria-label={skipAction.accessibleLabel}
          disabled={skipAction.disabled}
          onClick={skipAction.onClick}
        >{skipAction.pending ? "Skipping…" : "Skip"}</button>}
        <button
          type="button"
          className="primary card-pool-panel__confirm card-pool-decision-footer__button card-pool-decision-footer__confirm wtk-card-pool-action--confirm"
          data-pool-action="confirm"
          aria-label={confirmAction.accessibleLabel}
          disabled={confirmAction.disabled}
          onClick={confirmAction.onClick}
        >{confirmAction.pending ? "Confirming…" : "Confirm"}</button>
      </div>
    </div>
  </footer>;
}

export function useHorizontalOverflow<T extends HTMLElement>(measurementKey: string): readonly [RefCallback<T>, boolean] {
  const [element, setElement] = useState<T | null>(null);
  const [measurement, setMeasurement] = useState<{ element: T; key: string; overflowing: boolean } | null>(null);
  const overflowing = measurement?.element === element && measurement.key === measurementKey ? measurement.overflowing : false;
  useEffect(() => {
    if (!element) return;
    let frame: number | null = null;
    const measure = () => {
      if (typeof window === "undefined") return;
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setMeasurement({ element, key: measurementKey, overflowing: element.scrollWidth > element.clientWidth + 1 });
      });
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    if (typeof HTMLElement !== "undefined" && element.firstElementChild instanceof HTMLElement) observer?.observe(element.firstElementChild);
    if (typeof window !== "undefined") window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", measure);
        if (frame !== null) window.cancelAnimationFrame(frame);
      }
    };
  }, [element, measurementKey]);
  return [setElement, overflowing] as const;
}

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
  const targetPublicProps = actorTargetProps ?? (targetReadOnly ? props : null);
  const targetPublicHandCount = targetPublicProps && Number.isFinite(targetPublicProps.publicTarget.handCount)
    ? Math.max(0, Math.floor(targetPublicProps.publicTarget.handCount))
    : 0;
  const targetZoneTabs: Array<{ id: TargetCardPoolZone["id"]; label: string; count: number }> = targetPublicProps
    ? [
      { id: "hand", label: "Hand", count: targetPublicHandCount },
      { id: "equipment", label: "Equipment", count: targetPublicProps.publicTarget.equipmentCards.length },
      { id: "judgement", label: "Judgement", count: targetPublicProps.publicTarget.judgementCards.length },
    ]
    : [];
  const populatedTargetZoneTabs = targetZoneTabs.filter((zone) => zone.count > 0);
  const showActorTargetZoneTabs = Boolean(actorTargetProps && populatedTargetZoneTabs.length > 1);
  const firstPopulatedTargetZoneId = populatedTargetZoneTabs[0]?.id ?? "hand";
  const [activeTargetZoneId, setActiveTargetZoneId] = useState<TargetCardPoolZone["id"]>(firstPopulatedTargetZoneId);
  const activeTargetZoneTab = targetZoneTabs.find((zone) => zone.id === activeTargetZoneId && zone.count > 0)
    ?? targetZoneTabs.find((zone) => zone.count > 0)
    ?? targetZoneTabs[0]
    ?? { id: "hand" as const, label: "Hand", count: 0 };
  const activeTargetZone = actorTargetProps?.zones.find((zone) => zone.id === activeTargetZoneTab.id) ?? null;
  const selectedTargetZone = actorTargetProps?.zones.find((zone) => zone.choices.some((choice) => choice.state === "selected")) ?? null;
  const selectedZoneMessage = selectedTargetZone && selectedTargetZone.id !== activeTargetZone?.id
    ? `Selection retained · ${selectedTargetZone.title}`
    : null;
  const focusTargetZone = (zoneId: TargetCardPoolZone["id"], tablist?: HTMLDivElement) => {
    setActiveTargetZoneId(zoneId);
    tablist?.querySelector<HTMLButtonElement>(`#card-pool-target-tab-${zoneId}`)?.focus();
  };
  const handleTargetZoneTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const availableZones = targetZoneTabs.filter((zone) => zone.count > 0);
    if (availableZones.length === 0) return;
    const currentIndex = Math.max(0, availableZones.findIndex((zone) => zone.id === activeTargetZoneTab.id));
    const nextIndex = event.key === "ArrowRight"
      ? (currentIndex + 1) % availableZones.length
      : event.key === "ArrowLeft"
        ? (currentIndex - 1 + availableZones.length) % availableZones.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? availableZones.length - 1
            : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    focusTargetZone(availableZones[nextIndex].id, event.currentTarget);
  };
  const targetChoices = actorTargetProps?.zones.flatMap((zone) => zone.choices) ?? [];
  const publicPoolChoiceCount = props.mode === "actor-select" || props.mode === "public-readonly" ? props.choices.length : 0;
  const [publicPoolRowRef, publicPoolRowOverflowing] = useHorizontalOverflow<HTMLDivElement>(`${props.mode}:public:${publicPoolChoiceCount}`);
  const [targetZoneOverflowRef, targetZoneOverflowing] = useHorizontalOverflow<HTMLSpanElement>(`${props.mode}:target:${activeTargetZoneTab.id}:${targetPublicHandCount}:${actorTargetProps?.publicTarget.equipmentCards.length ?? 0}:${actorTargetProps?.publicTarget.judgementCards.length ?? 0}`);
  const handChoicesByPosition = new Map(targetChoices.flatMap((choice) => choice.type === "concealed-position"
    ? [[choice.position, choice] as const]
    : []));
  const randomHandChoice = targetChoices.find((choice) => choice.type === "random-hand-zone");
  const randomHandSelected = randomHandChoice?.state === "selected";
  const publicChoicesById = new Map(targetChoices.flatMap((choice) => choice.type === "public-card"
    ? [[choice.eligibleKey, choice] as const]
    : []));
  const publicZonesToRender = targetPublicProps ? [
    { id: "equipment" as const, label: "EQUIPMENT", cards: targetPublicProps.publicTarget.equipmentCards },
    { id: "judgement" as const, label: "JUDGEMENT", cards: targetPublicProps.publicTarget.judgementCards },
  ].filter((zone) => targetReadOnly ? zone.cards.length > 0 : zone.id === activeTargetZoneTab.id) : [];
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
        ref={publicPoolRowRef}
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
          {(!actorSelect || choice.state === "taken") && <span className="card-pool-panel__status harvest-availability-label">{choice.statusLabel}</span>}
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
      {props.scrollHint && publicPoolRowOverflowing && <span className="card-pool-panel__scroll-hint harvest-scroll-hint" aria-hidden="true">{props.scrollHint}</span>}
      {actorSelect && <CardPoolDecisionFooter
        selectionCount={props.selectionCount}
        confirmAction={{ accessibleLabel: "Confirm Bumper Harvest choice", disabled: props.confirmDisabled, pending: props.confirmPending, onClick: props.onConfirm }}
      />}
    </>}
    {targetPublicProps && <>
    {actorTargetProps?.selectionControls}
    {showActorTargetZoneTabs && <div className="card-pool-panel__tabs" role="tablist" aria-label="Target card zones" tabIndex={-1} onKeyDown={handleTargetZoneTabKeyDown}>
      {populatedTargetZoneTabs.map((zone) => <button
        key={zone.id}
        id={`card-pool-target-tab-${zone.id}`}
        type="button"
        role="tab"
        aria-label={`${zone.label} (${zone.count})`}
        aria-selected={zone.id === activeTargetZoneTab.id}
        aria-controls="card-pool-target-public-zones"
        tabIndex={zone.count > 0 && zone.id === activeTargetZoneTab.id ? 0 : -1}
        disabled={zone.count === 0}
        className="card-pool-panel__tab"
        onClick={() => focusTargetZone(zone.id)}
      >{zone.label} ({zone.count})</button>)}
    </div>}
    <div
      id="card-pool-target-public-zones"
      className="card-pool-panel__target-public-zones"
      role={actorTargetProps && showActorTargetZoneTabs ? "tabpanel" : "group"}
      aria-label={actorTargetProps ? `${activeTargetZoneTab.label}: ${activeTargetZoneTab.count} cards` : "Public target card zones"}
      aria-labelledby={actorTargetProps && showActorTargetZoneTabs ? `card-pool-target-tab-${activeTargetZoneTab.id}` : undefined}
      data-target-card-public-zones="true"
      data-active-zone={actorTargetProps ? activeTargetZoneTab.id : undefined}
    >
      {(!actorTargetProps || activeTargetZoneTab.id === "hand") && <div
        className="card-pool-panel__target-public-zone card-pool-panel__target-public-hand"
        data-target-card-public-zone="hand"
        role={actorTargetProps?.handRailDescription ? "group" : undefined}
        aria-label={`Hand: ${targetPublicHandCount} face-down cards`}
        aria-description={actorTargetProps?.handRailDescription}
      >
        {(!actorTargetProps || !showActorTargetZoneTabs) && <b className="card-pool-panel__target-public-zone-title">{actorTargetProps?.handCountHeading ?? `HAND · ${targetPublicHandCount}`}</b>}
        {actorTargetProps?.scrollHint && targetZoneOverflowing && <small className="card-pool-panel__scroll-hint" aria-hidden="true">{actorTargetProps.scrollHint}</small>}
        {targetPublicHandCount > 0
          ? <span ref={actorTargetProps ? targetZoneOverflowRef : undefined} className={`card-pool-panel__target-public-backs${randomHandSelected ? " pending-choice" : ""}`} data-hand-scrollable={targetPublicHandCount > 4 ? "true" : undefined}>
            {Array.from({ length: targetPublicHandCount }, (_, index) => {
              const choice = handChoicesByPosition.get(index);
              const selected = choice?.state === "selected";
              const choiceKey = choice?.type === "concealed-position" ? choice.opaqueKey : null;
              return <span className={`card-pool-panel__target-public-position${selected ? " pending-choice" : ""}`} key={index}>
                <i className="card-pool-panel__target-public-back" aria-hidden="true" />
                {actorTargetProps && choice && choiceKey && <button
                  type="button"
                  className="card-pool-panel__target-select card-pool-panel__target-public-select harvest-card-select"
                  disabled={actorTargetProps.disabled || Boolean(choice.selectDisabled)}
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
              disabled={actorTargetProps.disabled || Boolean(randomHandChoice.selectDisabled)}
              aria-pressed={randomHandSelected}
              aria-label={randomHandChoice.accessibleLabel}
              onClick={() => actorTargetProps.onToggle(randomHandChoice.opaqueKey)}
            />}
            {actorTargetProps && randomHandSelected && <span className="card-pool-panel__target-selected" aria-hidden="true">✓</span>}
          </span>
          : <span className="card-pool-panel__target-public-empty">0 cards</span>}
      </div>}
      {publicZonesToRender.map((zone) => <div
        className="card-pool-panel__target-public-zone"
        data-target-card-public-zone={zone.id}
        aria-label={`${zone.label}: ${zone.cards.length} public cards`}
        key={zone.id}
      >
        {(!actorTargetProps || !showActorTargetZoneTabs) && <b className="card-pool-panel__target-public-zone-title">{zone.label} · {zone.cards.length}</b>}
        {zone.cards.length > 0 ? <div className="card-pool-panel__target-public-faces">
          {zone.cards.map((card) => {
            const choice = publicChoicesById.get(card.id);
            const selected = choice?.state === "selected";
            return <CardPoolMiniFace
              card={card}
              variant={actorTargetProps ? "compact-target" : "standard"}
              className={`card-pool-panel__target-public-face${selected ? " pending-choice" : ""}`}
              aria-label={`Public ${zone.id}: ${cardDefinition(card.kind).name}`}
              data-public-card-id={card.id}
              key={card.id}
            >
              {actorTargetProps && choice && <>
                <button
                  type="button"
                  className="card-pool-panel__target-select card-pool-panel__target-public-select harvest-card-select"
                  disabled={actorTargetProps.disabled || Boolean(choice.selectDisabled)}
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
            </CardPoolMiniFace>;
          })}
        </div> : <span className="card-pool-panel__target-public-empty">0 cards</span>}
      </div>)}
    </div>
      {actorTargetProps && <p className={`card-pool-panel__selected-zone${selectedZoneMessage ? "" : " is-empty"}`} role="status" aria-hidden={selectedZoneMessage ? undefined : "true"}>{selectedZoneMessage ?? ""}</p>}
      {actorTargetProps && <>
        <CardPoolDecisionFooter
          selectionCount={actorTargetProps.selectionCount}
          confirmAction={{ accessibleLabel: actorTargetProps.confirmAccessibleLabel, disabled: actorTargetProps.confirmDisabled, pending: actorTargetProps.confirmPending, onClick: actorTargetProps.onConfirm }}
          skipAction={actorTargetProps.skipAction}
        />
        {actorTargetProps.error && <p className="card-pool-panel__error error" role="alert">{actorTargetProps.error}</p>}
      </>}
    </>}
  </section>;
}
