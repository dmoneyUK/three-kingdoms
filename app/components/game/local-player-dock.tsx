import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { cardDefinition } from "../../../game/cards";
import type { Card } from "../../../game/model";
import type { InteractionSeatSemanticRoles } from "../../../game/presentation-client";
import { CardFace } from "../../card-face";
import { HeroPortrait } from "./hero-portrait";
import { suitColorClass } from "./card-suit-style";
import { LOCAL_EQUIPMENT_SLOTS, type LocalEquipmentSlot } from "./equipment-slots";
import type { Hero, Player } from "./player-types";

type LocalPlayerDockProps = {
  player: Player | null;
  hero: Hero | null;
  interactionRoles: InteractionSeatSemanticRoles;
  guidance: ReactNode;
  children: ReactNode;
  heroSkillControl?: ReactNode;
  selfTargetable: boolean;
  selfTargetSelected: boolean;
  onSelfTarget: () => void;
  onHeroInfo: (hero: Hero, trigger: HTMLElement) => void;
  onInfoCard: (card: Card, trigger: HTMLElement) => void;
  equipmentSelection?: { eligibleIds: string[]; selectedIds: string[]; max: number; disabled: boolean; onToggle: (cardId: string) => void } | null;
  hiddenCardIds?: ReadonlySet<string>;
  equipmentArrivalPendingIds?: ReadonlySet<string>;
  isGroupPreview?: boolean;
  preserveGuidanceHeight?: boolean;
  attackResponsePrompt?: boolean;
};

type LocalPlayerDockLayout = {
  dockRef: RefObject<HTMLElement | null>;
  judgementRailRef: RefObject<HTMLDivElement | null>;
  judgementCardWidth: number;
  judgementCardLayout: { step: number; measured: boolean };
};

function useLocalPlayerDockLayout(input: { playerId?: string; preserveGuidanceHeight: boolean; judgementCardCount: number }): LocalPlayerDockLayout {
  const dockRef = useRef<HTMLElement | null>(null);
  const guidanceHeightRef = useRef<number | null>(null);
  const preserveGuidanceHeightRef = useRef(input.preserveGuidanceHeight);
  const judgementRailRef = useRef<HTMLDivElement | null>(null);
  const [judgementRailWidth, setJudgementRailWidth] = useState(0);
  const [judgementCardWidth, setJudgementCardWidth] = useState(34);
  useLayoutEffect(() => {
    const rail = judgementRailRef.current;
    if (!rail) return;
    const updateWidth = () => {
      const configuredWidth = Number.parseFloat(getComputedStyle(rail).getPropertyValue("--zone-card-width"));
      setJudgementRailWidth(rail.clientWidth);
      if (Number.isFinite(configuredWidth) && configuredWidth > 0) setJudgementCardWidth(configuredWidth);
    };
    updateWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }
    const observer = new ResizeObserver(updateWidth);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [input.playerId]);
  useLayoutEffect(() => {
    preserveGuidanceHeightRef.current = input.preserveGuidanceHeight;
    const guidanceNode = dockRef.current?.querySelector<HTMLElement>(".console-guidance");
    if (!guidanceNode) return;
    const height = guidanceHeightRef.current;
    if (input.preserveGuidanceHeight && height !== null) guidanceNode.style.minHeight = `${height}px`;
    else guidanceNode.style.removeProperty("min-height");
  }, [input.preserveGuidanceHeight]);
  useLayoutEffect(() => {
    const guidanceNode = dockRef.current?.querySelector<HTMLElement>(".console-guidance");
    if (!guidanceNode) return;
    const measure = () => {
      if (preserveGuidanceHeightRef.current) return;
      const height = guidanceNode.getBoundingClientRect().height;
      if (height > 0) guidanceHeightRef.current = height;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(guidanceNode);
    return () => observer.disconnect();
  }, [input.playerId]);
  const judgementCardLayout = useMemo(() => {
    const cardWidth = judgementCardWidth;
    const count = input.judgementCardCount;
    if (count <= 1) return { step: cardWidth, measured: judgementRailWidth > 0 };
    const naturalStep = (judgementRailWidth - cardWidth) / (count - 1);
    return { step: naturalStep >= cardWidth ? naturalStep : Math.max(12, naturalStep), measured: judgementRailWidth > 0 };
  }, [input.judgementCardCount, judgementCardWidth, judgementRailWidth]);
  return { dockRef, judgementRailRef, judgementCardWidth, judgementCardLayout };
}

export function LocalPlayerDock(props: LocalPlayerDockProps) {
  const layout = useLocalPlayerDockLayout({
    playerId: props.player?.id,
    preserveGuidanceHeight: props.preserveGuidanceHeight ?? false,
    judgementCardCount: props.player?.judgementCards?.length ?? 0,
  });
  return <LocalPlayerDockView {...props} layout={layout} />;
}

function LocalPlayerDockView({ player, hero, interactionRoles, guidance, children, heroSkillControl, selfTargetable, selfTargetSelected, onSelfTarget, onHeroInfo, onInfoCard, equipmentSelection = null, hiddenCardIds = new Set(), equipmentArrivalPendingIds = new Set(), isGroupPreview = false, preserveGuidanceHeight = false, attackResponsePrompt = false, layout }: LocalPlayerDockProps & { layout: LocalPlayerDockLayout }) {
  const { dockRef, judgementRailRef, judgementCardWidth, judgementCardLayout } = layout;
  const equipmentBySlot = new Map<LocalEquipmentSlot, Card>();
  for (const equipment of player?.equipmentCards ?? []) {
    const slot = cardDefinition(equipment.kind).equipmentSlot;
    if (slot) equipmentBySlot.set(slot, equipment);
  }
  const slotLabel = (slot: LocalEquipmentSlot) => LOCAL_EQUIPMENT_SLOTS.find((entry) => entry.key === slot)?.label ?? slot;
  const judgementCards = player?.judgementCards ?? [];
  const fallbackSkills = hero?.skills?.length ? hero.skills : hero ? [{ name: hero.skill ?? "Hero Skill", description: hero.ability }] : [];
  const interactionRoleNames = Object.entries(interactionRoles).filter(([, active]) => active).map(([role]) => role.replace(/^is/, "").replace(/([A-Z])/g, "-$1").toLowerCase()).join(" ");
  const interactionRoleClasses = [
    interactionRoles.isInteractionSource ? "interaction-seat-source" : "",
    interactionRoles.isOriginalTarget ? "interaction-seat-original-target" : "",
    interactionRoles.isActiveTarget ? "interaction-seat-active-target" : "",
    interactionRoles.isCurrentParticipant ? "interaction-seat-current-participant" : "",
    interactionRoles.isDecisionActor ? "interaction-seat-decision-actor" : "",
    interactionRoles.isActiveResolver ? "interaction-seat-active-resolver" : "",
    interactionRoles.isViewerDecisionActor ? "interaction-seat-viewer-decision" : "",
  ].filter(Boolean).join(" ");
  const renderZoneCard = (card: Card, selected = false, selectable = false) => {
    const definition = cardDefinition(card.kind);
    const isEquipment = Boolean(definition.equipmentSlot);
    const equipmentArrivalPending = isEquipment && equipmentArrivalPendingIds.has(card.id);
    const inspect = (trigger: HTMLButtonElement) => onInfoCard(card, trigger);
    return <div className={`local-zone-card ${suitColorClass(card.suit)} ${selectable ? "local-zone-card-selectable" : ""} ${selected ? "selected-cost" : ""}${equipmentArrivalPending ? " equipment-arrival-pending" : ""}`} key={card.id} data-equipment-id={isEquipment ? card.id : undefined} data-equipment-arrival-pending={equipmentArrivalPending ? "true" : undefined} data-judgement-id={!isEquipment ? card.id : undefined} style={{ visibility: hiddenCardIds.has(card.id) ? "hidden" : "visible" }}>
      <CardFace card={card} />
      {selectable
        ? <button type="button" className="local-zone-card-button" aria-label={`Select ${definition.name}`} aria-pressed={selected} disabled={!equipmentSelection || equipmentSelection.disabled || !equipmentSelection.eligibleIds.includes(card.id)} onClick={() => equipmentSelection?.onToggle(card.id)} />
        : <button type="button" className="local-zone-card-button" aria-label={isEquipment ? `View ${definition.name} details` : `Explain ${definition.name}`} onClick={(event) => inspect(event.currentTarget)} />}
      {isEquipment
        ? selectable && <button type="button" className="local-equipment-inspect-button" aria-label={`View ${definition.name} details without selecting`} title={`View ${definition.name} details without selecting`} onClick={(event) => { event.stopPropagation(); inspect(event.currentTarget); }} />
        : <button type="button" className="zone-info-button" aria-label={`Explain ${definition.name}`} onClick={(event) => { event.stopPropagation(); inspect(event.currentTarget); }}>i</button>}
    </div>;
  };
  return <section ref={dockRef} className={`local-player-dock${isGroupPreview ? " local-group-preview" : ""}${interactionRoleClasses ? ` ${interactionRoleClasses}` : ""}${attackResponsePrompt ? " local-dock-attack-response" : ""}`} data-player-anchor={player?.id ?? undefined} data-attack-response-prompt={attackResponsePrompt ? "true" : undefined} data-local-group-preview={isGroupPreview ? "true" : undefined} data-guidance-height-preserved={preserveGuidanceHeight ? "true" : undefined} data-interaction-roles={interactionRoleNames || undefined} data-interaction-source={interactionRoles.isInteractionSource ? "true" : undefined} data-interaction-original-target={interactionRoles.isOriginalTarget ? "true" : undefined} data-interaction-active-target={interactionRoles.isActiveTarget ? "true" : undefined} data-interaction-current-participant={interactionRoles.isCurrentParticipant ? "true" : undefined} data-interaction-decision-actor={interactionRoles.isDecisionActor ? "true" : undefined} data-interaction-active-resolver={interactionRoles.isActiveResolver ? "true" : undefined} data-interaction-viewer-decision={interactionRoles.isViewerDecisionActor ? "true" : undefined} aria-label="Your player area" tabIndex={-1}>
    {guidance}
    <div className="local-dock-identity">
      <div className="local-hero-anchor">
        {hero ? <>
          <button
            type="button"
            className={`local-hero-card${selfTargetable ? " targetable-target" : ""}${selfTargetSelected ? " selected-target" : ""}`}
            aria-label={selfTargetable ? `Select ${player?.name ?? "your character"}` : `Explain ${hero.name}`}
            aria-pressed={selfTargetable ? selfTargetSelected : undefined}
            onClick={(event) => selfTargetable ? onSelfTarget() : onHeroInfo(hero, event.currentTarget)}
          ><span className="local-hero-portrait" data-hero-id={hero.id} aria-hidden="true"><HeroPortrait hero={hero} /></span></button>
          <div className="local-hero-identity-footer" aria-label="Your role and health">
            <span className="local-hero-role" aria-label={player?.role ? `Role: ${player.role}` : "Role pending"}>{player?.role ?? "Role pending"}</span>
            <span className="local-hero-hp" aria-label={`HP ${player?.hp ?? 0} of ${player?.maxHp ?? 0}`}>HP {player?.hp ?? 0}/{player?.maxHp ?? 0}</span>
          </div>
          {selfTargetable && <button type="button" className="hero-card-info-button local-hero-info-button" aria-label={`View ${hero.name} details`} onClick={(event) => { event.stopPropagation(); onHeroInfo(hero, event.currentTarget); }}><span aria-hidden="true">i</span></button>}
        </> : <div className="local-hero-card local-hero-card-empty" aria-label="Hero not selected"><span className="local-hero-portrait" aria-hidden="true"><span className="local-hero-label">HERO</span></span></div>}
        {judgementCards.length > 0 && <div ref={judgementRailRef} className="local-judgement-cards local-judgement-overlay" data-judgement-layout={judgementCardLayout.measured ? "measured" : "pending"} style={{ justifyContent: judgementCards.length === 1 ? "center" : "flex-start" }} role="group" aria-label="Persistent Judgement cards">
          {judgementCards.map((card, index) => <div className="local-judgement-card-slot" key={card.id} style={{ marginLeft: index === 0 ? 0 : `${judgementCardLayout.step - judgementCardWidth}px` }}>{renderZoneCard(card)}</div>)}
        </div>}
      </div>
    </div>
    <div className="local-dock-zones" aria-label="Your status and equipment zones">
      <div className="local-status-panel" aria-label="Hero skills">{heroSkillControl ?? <section className="hero-skills local-hero-skills" aria-label="Hero skills">{fallbackSkills.map((skill) => <button type="button" className="hero-skill-button" key={skill.name} title={skill.description} disabled>{skill.name}</button>)}</section>}</div>
      <div className="local-equipment-panel" aria-label="Equipment">
        <div className="local-equipment-slots">{LOCAL_EQUIPMENT_SLOTS.map(({ key }) => { const card = equipmentBySlot.get(key); const selectable = Boolean(card && equipmentSelection); return <div className="local-equipment-slot" key={key} data-slot={key} data-player-equipment-slot-owner={player?.id ?? undefined} aria-label={`${slotLabel(key)} slot`} role="group">{card ? renderZoneCard(card, equipmentSelection?.selectedIds.includes(card.id), selectable) : <span className="local-zone-empty" aria-label={`${slotLabel(key)} empty`}><span className="local-zone-empty-label">{slotLabel(key)}</span></span>}</div>; })}</div>
      </div>
    </div>
    {children}
  </section>;
}