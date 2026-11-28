import type { CSSProperties } from "react";
import { cardDefinition } from "../../../game/cards";
import type { Card } from "../../../game/model";
import type { TriggerOptionView } from "../../../game/protocol.js";
import type { InteractionSeatSemanticRoles } from "../../../game/presentation-client";
import { HeroPortrait } from "./hero-portrait";
import { LOCAL_EQUIPMENT_SLOTS, type LocalEquipmentSlot } from "./equipment-slots";
import type { Hero, Player } from "./player-types";

type OpponentPlayerCardProps = {
  totalPlayers: number;
  player: Player;
  viewerId: string;
  playerHero: Hero | null;
  relativeIndex: number;
  mobileSeatRing: { enabled: boolean; topCapacity: number; boardWidth: number; seatWidth: number; seatHeight: number; gap: number; leftInset: number; topStep: number };
  isTurn: boolean;
  isSelectedTarget: boolean;
  isGroupPreview: boolean;
  interactionRoles: InteractionSeatSemanticRoles;
  targetSelectionActive: boolean;
  showSeparateInspectAffordance: boolean;
  targetAttemptEnabled: boolean;
  targetAttemptDescription: string | null;
  isInspected: boolean;
  targetablePlayer: boolean;
  daqiaoDeflectionTargetMode: boolean;
  testViewerController: boolean;
  onTarget: (trigger?: HTMLButtonElement | null) => void;
  onInspect: (trigger?: HTMLButtonElement | null) => void;
  onSwitchTestViewer: (playerId: string) => void;
  judgementInFlight: ReadonlySet<string>;
  serpentSelected: string[];
  triggerResponse: boolean;
  triggerSelectionUsesCards: boolean;
  responseDecisionReady: boolean;
  triggerCardOption: TriggerOptionView | null;
  onToggleEquipment: (cardId: string) => void;
};

export function projectSideColumnSeat(totalPlayers: number, relativeIndex: number, options: { topCapacity?: number } = {}): { side: "left" | "right" | "top"; row: number; rowCount: number; topIndex?: number; topCount?: number } | null {
  if (!Number.isInteger(totalPlayers) || !Number.isInteger(relativeIndex) || totalPlayers < 5 || totalPlayers > 10 || relativeIndex < 1 || relativeIndex >= totalPlayers) return null;
  const opponentCount = totalPlayers - 1;
  const requestedTopCapacity = Number.isFinite(options.topCapacity) ? Math.trunc(options.topCapacity ?? 0) : 0;
  const topCount = Math.max(0, Math.min(opponentCount, totalPlayers === 7 ? 4 : totalPlayers === 8 ? 5 : opponentCount, requestedTopCapacity));
  const sideCount = opponentCount - topCount;
  const leftCount = Math.floor(sideCount / 2);
  const rightCount = sideCount - leftCount;
  const rowCount = Math.max(leftCount, rightCount);

  // Walk the visual ring from the local viewer: left-bottom upward, across
  // the top from left to right, then down the right edge toward the viewer.
  if (relativeIndex <= leftCount) {
    return { side: "left", row: rowCount - relativeIndex + 1, rowCount, topCount };
  }
  if (relativeIndex <= leftCount + topCount) {
    return { side: "top", row: 0, rowCount: 0, topIndex: relativeIndex - leftCount - 1, topCount };
  }
  return { side: "right", row: relativeIndex - leftCount - topCount, rowCount, topCount };
}

function OpponentEquipmentGlyph({ slot }: { slot: LocalEquipmentSlot }) {
  if (slot === "weapon") return <svg viewBox="0 0 18 18" aria-hidden="true" data-equipment-glyph="sword">
    <path data-sword-part="blade" d="M7.2 7.7 16 1.4 17.6.6l-.4 1.9-7.1 7.9Z" />
    <path data-sword-groove="true" d="m9 8.7 7-6.4" fill="none" stroke="#70552d" strokeWidth=".8" strokeLinecap="round" />
    <path data-sword-part="crossguard" d="m6.3 6.3 6.2 6.2-1.2 1.2-6.2-6.2Z" />
    <path data-sword-part="grip" d="m7.1 9.1 1.5 1.5-3.7 3.7-1.5-1.5Z" />
    <circle data-sword-part="pommel" cx="3.2" cy="15" r="1.2" />
  </svg>;
  if (slot === "armor") return <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.2 12.2 3v3.8c0 2.8-2.4 4.9-5.2 6.4C4.2 11.7 1.8 9.6 1.8 6.8V3L7 1.2Z" /><path d="M4.5 4.2v3.2c0 1.2 1 2.2 2.5 3 1.5-.8 2.5-1.8 2.5-3V4.2" /></svg>;
  return <span className="opponent-equipment-horse-mark" aria-hidden="true">{slot === "defensiveHorse" ? "+1" : "−1"}</span>;
}

export function OpponentPlayerCard({ totalPlayers, player, playerHero, relativeIndex, mobileSeatRing, isTurn, isSelectedTarget, isGroupPreview, interactionRoles, targetSelectionActive, showSeparateInspectAffordance, targetAttemptEnabled, targetAttemptDescription, isInspected, targetablePlayer, daqiaoDeflectionTargetMode, testViewerController, onTarget, onInspect, onSwitchTestViewer, judgementInFlight }: OpponentPlayerCardProps) {
  const sideColumnSeat = projectSideColumnSeat(totalPlayers, relativeIndex, {
    topCapacity: mobileSeatRing.enabled ? mobileSeatRing.topCapacity : 0,
  });
  const seatPlacementStyle: CSSProperties | undefined = sideColumnSeat
    ? sideColumnSeat.side === "top"
      ? {
        left: `${mobileSeatRing.leftInset + (sideColumnSeat.topIndex ?? 0) * mobileSeatRing.topStep}px`,
        top: "0px",
        width: mobileSeatRing.seatWidth,
        height: mobileSeatRing.seatHeight,
        gridRow: "1",
        gridColumn: "1 / -1",
        transform: "none",
      }
      : { gridRow: sideColumnSeat.row + (mobileSeatRing.enabled && (sideColumnSeat.topCount ?? 0) > 0 ? 1 : 0) }
    : undefined;
  const equipmentBySlot = new Map<LocalEquipmentSlot, Card>();
  for (const equipment of player.equipmentCards) {
    const slot = cardDefinition(equipment.kind).equipmentSlot;
    if (slot) equipmentBySlot.set(slot, equipment);
  }
  const equipmentSummary = LOCAL_EQUIPMENT_SLOTS.map(({ key, label }) => {
    const equipment = equipmentBySlot.get(key);
    if (!equipment) return <span className="opponent-equipment-slot is-empty" data-slot={key} data-player-equipment-slot-owner={player.id} data-occupied="false" aria-hidden="true" key={key} />;
    const equipmentName = cardDefinition(equipment.kind).name;
    const accessibleSlotLabel = key === "defensiveHorse" ? "Plus-one horse" : key === "offensiveHorse" ? "Minus-one horse" : label;
    return <span className="opponent-equipment-slot is-occupied" data-slot={key} data-player-equipment-slot-owner={player.id} data-occupied="true" key={key}><span className="opponent-equipment-indicator" data-slot={key} data-equipment-id={equipment.id} data-card-kind={equipment.kind} role="img" aria-label={`${accessibleSlotLabel} equipped: ${equipmentName}`} title={`${label}: ${equipmentName}`}><OpponentEquipmentGlyph slot={key} /></span></span>;
  });
  const visibleJudgement = player.judgementCards.filter((card) => !judgementInFlight.has(card.id));
  const visibleJudgementCount = visibleJudgement.length;
  const judgementIndicators = visibleJudgement.map((judgement) => <span
    className="opponent-judgement-indicator" data-judgement-id={judgement.id} data-card-kind={judgement.kind}
    key={judgement.id}
    role="img" aria-label={`${cardDefinition(judgement.kind).name} in ${player.name}'s Judgement zone`}
    title={cardDefinition(judgement.kind).name}>
    {judgement.kind === "Lightning" ? "⚡" : judgement.kind === "Overindulgence"
      ? <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h10l-1 4a4 4 0 0 1-3.5 3v3h3v2h-7v-2h3V9A4 4 0 0 1 4 6L3 2Z" fill="currentColor" /></svg>
      : "◆"}
  </span>);
  const targetButtonDisabled = targetSelectionActive && !targetAttemptEnabled && (!targetablePlayer || !player.alive);
  const seatInspectorActive = targetSelectionActive && showSeparateInspectAffordance;
  const deflectionTargetSelectable = daqiaoDeflectionTargetMode && targetSelectionActive && targetablePlayer && player.alive;
  const targetButtonLabel = targetAttemptEnabled && !targetablePlayer
    ? `Check ${player.name}${targetAttemptDescription ? ` — ${targetAttemptDescription}` : ""}`
    : daqiaoDeflectionTargetMode && targetSelectionActive
    ? deflectionTargetSelectable
      ? `${isSelectedTarget ? "Deselect" : "Select"} ${player.name} as Deflection target`
      : `${player.name}, not an eligible Deflection target`
    : `${targetSelectionActive ? "Select" : "Inspect"} ${player.name}`;
  const interactionRoleNames = Object.entries(interactionRoles).filter(([, active]) => active).map(([role]) => role.replace(/^is/, "").replace(/([A-Z])/g, "-$1").toLowerCase()).join(" ");
  return <article className={`player-square opponent-player-card player-square-${relativeIndex} ${isTurn ? "turn-square" : ""} ${isSelectedTarget ? "selected-target" : ""} ${targetSelectionActive && targetablePlayer && player.alive ? "targetable-target" : ""} ${isGroupPreview ? "local-group-preview" : ""} ${interactionRoles.isInteractionSource ? "interaction-seat-source" : ""} ${interactionRoles.isOriginalTarget ? "interaction-seat-original-target" : ""} ${interactionRoles.isActiveTarget ? "interaction-seat-active-target" : ""} ${interactionRoles.isCurrentParticipant ? "interaction-seat-current-participant" : ""} ${interactionRoles.isDecisionActor ? "interaction-seat-decision-actor" : ""} ${interactionRoles.isActiveResolver ? "interaction-seat-active-resolver" : ""} ${interactionRoles.isViewerDecisionActor ? "interaction-seat-viewer-decision" : ""} ${!player.alive ? "defeated-square" : ""}`} data-side-column={sideColumnSeat?.side} data-side-row={sideColumnSeat?.row} data-top-seat-index={sideColumnSeat?.topIndex} data-top-seat-count={sideColumnSeat?.topCount} style={seatPlacementStyle} data-player-anchor={player.id} data-target-selectable={targetSelectionActive && targetablePlayer && player.alive ? "true" : undefined} data-deflection-targetable={deflectionTargetSelectable ? "true" : undefined} data-local-group-preview={isGroupPreview ? "true" : undefined} data-interaction-roles={interactionRoleNames || undefined} data-interaction-source={interactionRoles.isInteractionSource ? "true" : undefined} data-interaction-original-target={interactionRoles.isOriginalTarget ? "true" : undefined} data-interaction-active-target={interactionRoles.isActiveTarget ? "true" : undefined} data-interaction-current-participant={interactionRoles.isCurrentParticipant ? "true" : undefined} data-interaction-decision-actor={interactionRoles.isDecisionActor ? "true" : undefined} data-interaction-active-resolver={interactionRoles.isActiveResolver ? "true" : undefined} data-interaction-viewer-decision={interactionRoles.isViewerDecisionActor ? "true" : undefined}>
      <div className="opponent-public-zones">
      <div className={`player-hero-card opponent-hero-card${seatInspectorActive ? " is-targeting-with-seat-inspector" : ""}`}>
        {playerHero && <span className="player-square-portrait opponent-hero-portrait" data-hero-id={playerHero.id} aria-hidden="true"><HeroPortrait hero={playerHero} /></span>}
        <button type="button" className="player-square-target opponent-hero-target" disabled={targetButtonDisabled} aria-label={targetButtonLabel} aria-pressed={targetSelectionActive ? isSelectedTarget : isInspected} aria-expanded={isInspected} onClick={(event) => {
          const trigger = event?.currentTarget ?? null;
          return targetSelectionActive ? onTarget(trigger) : onInspect(trigger);
        }} />
        <div className="opponent-hero-overlay">
          {!seatInspectorActive && <span className="opponent-player-name" aria-label={player.name} title={player.name}>{player.name}</span>}
        </div>
        {playerHero && (player.isTestPlayer || player.isHost) && testViewerController && <button type="button" className="test-view-switch-button" data-testid={`test-view-switch-${player.id}`} data-test-viewer-id={player.id} aria-label={`Switch to ${player.name}`} title={`Switch to ${player.name}`} onClick={(event) => { event.stopPropagation(); onSwitchTestViewer(player.id); }}>SWITCH</button>}
      </div>
      <div className={`opponent-status-equipment-strip${seatInspectorActive ? " has-seat-inspector" : ""}`}>
        <span className="opponent-hp-chip" aria-label={`HP ${player.hp ?? 0} of ${player.maxHp ?? 0}`}>HP {player.hp ?? 0}/{player.maxHp ?? 0}</span>
        {visibleJudgementCount > 0 && <div className="opponent-judgement-status" data-judgement-owner-id={player.id} data-multiple={visibleJudgementCount > 1 ? "true" : undefined} role="group" aria-label={`${player.name} Judgement zone`}>
          <span className="opponent-judgement-indicators">{judgementIndicators}</span>
          {visibleJudgementCount > 1 && <span className="opponent-judgement-overflow" role="img" aria-label={`${visibleJudgementCount} Judgement cards; inspect ${player.name} for details`}>{visibleJudgementCount}</span>}
        </div>}
        <div className="opponent-equipment-summary" role="group" aria-label="Public Equipment" data-slot-count={equipmentBySlot.size}>{equipmentSummary}</div>
        {seatInspectorActive && <button type="button" className="opponent-hero-inspect-name opponent-seat-inspect-button" aria-label={`Inspect ${player.name}`} aria-pressed={isInspected} aria-expanded={isInspected} title={`Inspect ${player.name}`} onClick={(event) => { event.stopPropagation(); onInspect(event.currentTarget); }}><span className="opponent-player-name" aria-hidden="true">{player.name}</span></button>}
      </div>
    </div>
  </article>;
}
