"use client";

import { Component, FormEvent, PointerEvent as ReactPointerEvent, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cardDefinition, isAttackCard } from "../game/cards";
import type { Card, CardKind } from "../game/model";
import { STANDARD_PRESET_CARD_KINDS, TEST_HAND_PRESET_OPTIONS, testHandPresetFor, type TestHandPreset, type TestHandPresetId } from "../game/test-hand-presets";
import { baselineHand, updatePrivateHand } from "../game/private-hand.js";
import { getResponseOptions } from "../game/responses";
import { HEROES, type HeroSkill } from "../game/heroes";
import { normalizeRoomData } from "../game/room-safety.js";
import { canUseAction, type CurrentAction, type GameplayAction, type TriggerOptionView } from "../game/protocol.js";
import { latestPublicMessages } from "../game/messages.js";
import { canTargetCharacter } from "../game/capabilities/targeting";
import type { PresentationSnapshot, PresentationSnapshotDiaoChanSkillNotice, PresentationSnapshotPublicCardEffect, PresentationSnapshotLustDuelExchange } from "../game/presentation-snapshot";
import type { PresentationAttackDodgeResponse, PresentationAttackHitSettlementProof, PresentationBumperHarvestSettlementProof, PresentationDismantleSettlementProof, PresentationGroupSettlementProof, PresentationLustDuelAttackResponseProof, PresentationPublicCardEffectProof, PresentationSkillEffectSettlementProof, PresentationStealSettlementProof, PresentationV2 } from "../game/presentation-v2";
import { attackDodgeResponseEventMatchesProof } from "../game/presentation-v2";
import { attackDodgeResponseMatchesRoot, attackDodgeResponseProofKey, filterAttackDodgeResponseArrivalsForRoot, newlyObservedAttackDodgeResponseKeys, selectAttackDodgeResponseCandidate, type AttackDodgeResponseRootIdentity } from "../game/attack-dodge-response-selection";
import { attackDodgePublicActionEvents, attackDodgeSettlementSupersessionReason, attackHitSettlementSupersessionReason, parseRetiredAttackDodgeCompositionSnapshot, persistRetiredAttackDodgeComposition, retiredAttackDodgeCompositionServerSnapshot, retiredAttackDodgeCompositionStorageSnapshot, subscribeRetiredAttackDodgeComposition, type AttackDodgeSettlementHoldIdentity, type AttackHitSettlementHoldIdentity } from "../game/attack-dodge-settlement-lifecycle";
import { buildDyingHandoffView, buildInteractionStageView, buildPresentationClientView, buildPresentationDecisionStatus, buildReactionChainView, projectInteractionSeatRoles, type InteractionSeatSemanticRoles, type PresentationClientView } from "../game/presentation-client";
import { buildPresentationTransition, type PresentationTransitionKind } from "../game/presentation-transition";
import { buildLocalTargetSelectionView } from "../game/local-target-selection";
import { buildConsoleDecisionDisplay, type ConsoleDecisionKind, type ConsoleSelectionFact } from "../game/console-decision";
import { buildGroupScopePreview } from "../game/group-scope-preview";
import { derivePublicActivityStatus } from "../game/public-activity";
import { CardFace } from "./card-face";
import { CardDetailsPreview, type CardDetailsContext } from "./card-details-preview";
import { PublicCardDisplay, publicCardActionKey, type PublicCardDisplayAction } from "./public-card-display";
import { PublicActivityChip } from "./public-activity-chip";
import { beginAttackDodgeUxTraceSession, exportAttackDodgeUxTrace, getAttackDodgeUxTraceId, getAttackDodgeUxTraceServerSnapshot, isAttackDodgeUxTraceActive, recordAttackDodgeUxTrace, recordPublicGameRoomSnapshot, resumeAttackDodgeUxTraceSession, sanitizeAttackDodgeUxTraceData, stopAttackDodgeUxTrace, subscribeToAttackDodgeUxTraceActive } from "./attack-dodge-ux-trace";
import { BUILD_LABEL, BUILD_SHA } from "./build-info";

type Hero = { id: string; name: string; faction: string; hp: number; ability: string; skill?: string; skills?: readonly HeroSkill[] };
type ActiveSkillSelectionState = { revision: string; effectId: string; cardIds: string[]; targetIds: string[] };
type InspectorCardDetailDismissRef = { current: (() => boolean) | null };
type ActiveAttackDodgeSettlement = {
  eventId: string;
  proof: PresentationAttackDodgeResponse;
  action: PublicCardDisplayAction;
  lifecycle: AttackDodgeSettlementHoldIdentity;
  phase: "reading" | "exiting" | "complete";
  remainingMs: number;
};
type RetiredAttackDodgeComposition = { roomCode: string; eventIds: Set<string>; cardIds: Set<string> };
type AttackDodgeObservedProof = { roomCode: string; proofKey: string; responseEventId: string };
type ActivePublicNegationRead = { key: string; action: PublicCardDisplayAction; expiresAt: number; phase: "reading" | "elapsed" | "live" | "settlement-pending" | "exiting" };

function persistAttackDodgeSettlementRetirement(held: ActiveAttackDodgeSettlement): RetiredAttackDodgeComposition {
  let storage: Storage | null = null;
  try {
    if (typeof window !== "undefined") storage = window.localStorage;
  } catch { /* In-memory retirement remains available when persistent storage is blocked. */ }
  const eventIds = [held.lifecycle.rootEventId, held.lifecycle.responseEventId];
  const cardIds = [held.action.cardFace?.id, held.action.response?.cardFace?.id].filter((id): id is string => Boolean(id));
  const persisted = persistRetiredAttackDodgeComposition(storage, held.lifecycle.roomCode, eventIds, cardIds);
  return { roomCode: held.lifecycle.roomCode, eventIds: new Set(persisted.eventIds), cardIds: new Set(persisted.cardIds) };
}

function persistAttackHitSettlementRetirement(held: AttackHitSettlementHoldIdentity): RetiredAttackDodgeComposition {
  let storage: Storage | null = null;
  try {
    if (typeof window !== "undefined") storage = window.localStorage;
  } catch { /* In-memory retirement remains available when persistent storage is blocked. */ }
  const persisted = persistRetiredAttackDodgeComposition(storage, held.roomCode, [held.rootEventId, held.eventId], [held.rootCardId]);
  return { roomCode: held.roomCode, eventIds: new Set(persisted.eventIds), cardIds: new Set(persisted.cardIds) };
}

type LocalTargetFlow = "normal" | "serpent" | "active-skill" | "trigger" | "borrowed-sword";
type PresentationImportance = "essential" | "informational";
type PresentationEventMeta = { resolutionId?: string; importance?: PresentationImportance; finalResult?: boolean; playedAs?: "attack" | "dodge" | "peach"; effectNotice?: boolean; judgement?: boolean; initialDeal?: boolean; privateToPlayerId?: string; publicDiaoChanNotice?: unknown; lustDuelAttackResponse?: PresentationLustDuelAttackResponseProof; publicCardEffects?: readonly PresentationPublicCardEffectProof[]; publicSkillEffectSettlement?: PresentationSkillEffectSettlementProof; publicDismantleSettlement?: PresentationDismantleSettlementProof; publicStealSettlement?: PresentationStealSettlementProof; publicAttackHitSettlement?: PresentationAttackHitSettlementProof; publicGroupSettlement?: PresentationGroupSettlementProof; publicBumperHarvestSettlement?: PresentationBumperHarvestSettlementProof; bumperHarvestRoot?: { semantics: "PROVEN"; sourceId: string; cardId: string; interactionId?: string; rootFrameId?: string } };
type CardEvent = PresentationEventMeta & { id: string; player: string; target: string; card: Card; action?: "play" | "equip" | "activate" | "discard" | "gain" | "reveal" | "draw"; drawPlayerId?: string; presentation?: boolean };
type CardGroupEvent = PresentationEventMeta & { id: string; type: "cards"; player: string; target: string; cards: Card[]; action: "discard" | "reveal" | "play"; presentation?: boolean; message?: string };

type GameEvent = (CardEvent & { type: "card"; message?: string }) | CardGroupEvent | ({ type: "message"; id: string; message: string; drawPlayerId?: string; presentation?: boolean } & PresentationEventMeta);
type EffectNoticeState = { roomCode: string; viewerId: string; eventId: string; heading: string; message: string; exiting: boolean };

function attackDodgeProofKeysFromTimeline(timeline: readonly GameEvent[]): Set<string> {
  return new Set(timeline.flatMap((event) => {
    const proof = (event as GameEvent & { attackDodgeResponse?: unknown }).attackDodgeResponse;
    const key = attackDodgeResponseProofKey(proof);
    return key ? [key] : [];
  }));
}
type Player = { id: string; name: string; seat: number; hero: string | null; generalReady: boolean; ready: boolean; hp: number | null; maxHp: number | null; alive: boolean; connected: boolean; handCount: number; judgementCards: Card[]; equipmentCards: Card[]; attackRange: number; distance: number | null; isHost: boolean; isTestPlayer: boolean; role: string | null };
function diaoChanNoticeCopy(proof: PresentationSnapshotDiaoChanSkillNotice, players: readonly Player[]) {
  const owner = players.find((player) => player.id === proof.sourceId && player.hero === "diao-chan");
  if (!owner) return null;
  if (proof.effectId === "diao_chan_lust" && proof.notice === "ACTIVATION") {
    const first = players.find((player) => player.id === proof.firstParticipantId);
    const second = players.find((player) => player.id === proof.secondParticipantId);
    const firstActor = players.find((player) => player.id === proof.firstActorId);
    if (!first || !second || !firstActor) return null;
    return { heading: "LUST", message: `Diao Chan used Lust: ${first.name} and ${second.name} enter a Duel. ${firstActor.name} plays Attack first.` };
  }
  if (proof.effectId === "diao_chan_lust" && proof.notice === "DUEL_RESULT") {
    const failed = players.find((player) => player.id === proof.failedPlayerId);
    const damageSource = players.find((player) => player.id === proof.damageSourceId);
    if (!failed || !damageSource) return null;
    return { heading: "LUST · RESULT", message: proof.damageAmount === 0
      ? `${failed.name} failed to play Attack; Duel damage was prevented.`
      : `${failed.name} failed to play Attack; ${proof.damageAmount} Duel damage from ${damageSource.name} applies.` };
  }
  if (proof.effectId === "diao_chan_beauty_outshining_moon" && proof.notice === "ACTIVATION") {
    return { heading: "BEAUTY", message: "Diao Chan activated Beauty Outshining the Moon." };
  }
  if (proof.effectId === "diao_chan_beauty_outshining_moon" && proof.notice === "DRAWN" && proof.drawCount === 1) {
    return { heading: "BEAUTY RESULT", message: "Diao Chan used Beauty and drew 1 card." };
  }
  return null;
}
function diaoChanNoticeMatchesEvent(value: unknown, proof: PresentationSnapshotDiaoChanSkillNotice) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = { ...(value as Record<string, unknown>) };
  // The activation can remain a truthful standalone notice when its optional
  // cost relation fails validation. Ignore only that unproven relation field;
  // all actor, participant and first-actor facts must still match exactly.
  if (proof.effectId === "diao_chan_lust" && proof.notice === "ACTIVATION"
    && proof.costEventId === undefined && typeof actual.costEventId === "string") delete actual.costEventId;
  const expected = Object.fromEntries(Object.entries(proof).filter(([key]) => key !== "eventId"
    && !(key === "rootEventId" && proof.notice === "ACTIVATION" && proof.rootEventId === proof.eventId)));
  return Object.keys(actual).length === Object.keys(expected).length
    && Object.entries(expected).every(([key, fieldValue]) => actual[key] === fieldValue);
}
type LustActivationNotice = Extract<PresentationSnapshotDiaoChanSkillNotice, {
  effectId: "diao_chan_lust";
  notice: "ACTIVATION";
}>;
type VerifiedLustCostFrameProof = {
  activation: LustActivationNotice & { costEventId: string };
  activationEvent: Extract<GameEvent, { type: "message" }>;
  costEvent: CardEvent | CardGroupEvent;
  costCard: Card;
  owner: Player;
  firstParticipant: Player;
  secondParticipant: Player;
  firstActor: Player;
};
function verifiedLustCostFrameForEvent(
  timeline: readonly GameEvent[],
  notices: readonly PresentationSnapshotDiaoChanSkillNotice[],
  effects: readonly PresentationSnapshotPublicCardEffect[],
  players: readonly Player[],
  activationEventId?: string,
): VerifiedLustCostFrameProof | null {
  const activations = notices.filter((notice): notice is VerifiedLustCostFrameProof["activation"] =>
    notice.effectId === "diao_chan_lust" && notice.notice === "ACTIVATION" && Boolean(notice.costEventId)
      && (!activationEventId || notice.eventId === activationEventId));
  if (activations.length !== 1) return null;
  const activation = activations[0];
  const activationMatches = timeline.filter((event) => event.id === activation.eventId);
  const activationEvent = activationMatches.length === 1 && activationMatches[0].type === "message"
    ? activationMatches[0] : null;
  if (!activationEvent || activationEvent.presentation === false || activationEvent.privateToPlayerId
    || activationEvent.importance !== "essential"
    || !diaoChanNoticeMatchesEvent(activationEvent.publicDiaoChanNotice, activation)) return null;

  const costMatches = timeline.filter((event) => event.id === activation.costEventId);
  const costEvent = costMatches.length === 1 && (costMatches[0].type === "card" || costMatches[0].type === "cards")
    ? costMatches[0] : null;
  if (!costEvent || costEvent.presentation === false || costEvent.privateToPlayerId
    || costEvent.action !== "discard" || !costEvent.resolutionId) return null;
  const matchingEffects = effects.filter((effect) => effect.eventId === costEvent.id
    && effect.effectId === "diao_chan_lust" && effect.effectClass === "COST");
  const matchingRawEffects = (costEvent.publicCardEffects ?? []).filter((effect) =>
    effect.effectId === "diao_chan_lust" && effect.effectClass === "COST");
  if (matchingEffects.length !== 1 || matchingRawEffects.length !== 1) return null;
  const effect = matchingEffects[0];
  const rawEffect = matchingRawEffects[0];
  const costCards = costEvent.type === "card" ? [costEvent.card] : costEvent.cards;
  const [costCard] = costCards;
  const [material] = effect.materials;
  const [rawMaterial] = rawEffect.materials;
  const [projectedCard] = effect.cards;
  if (costCards.length !== 1 || !costCard || !material || !rawMaterial || !projectedCard
    || effect.activationEventId !== activation.eventId || rawEffect.activationEventId !== activation.eventId
    || effect.activationOwnerId !== activation.sourceId || rawEffect.activationOwnerId !== activation.sourceId
    || effect.outcome !== "DUEL_DECLARED" || rawEffect.outcome !== "DUEL_DECLARED"
    || effect.targetIds?.length !== 2 || rawEffect.targetIds?.length !== 2
    || effect.targetIds[0] !== activation.firstParticipantId || effect.targetIds[1] !== activation.secondParticipantId
    || rawEffect.targetIds[0] !== activation.firstParticipantId || rawEffect.targetIds[1] !== activation.secondParticipantId
    || effect.cards.length !== 1 || effect.materials.length !== 1 || rawEffect.materials.length !== 1
    || material.cardId !== costCard.id || rawMaterial.cardId !== costCard.id || projectedCard.id !== costCard.id
    || material.ownerId !== activation.sourceId || rawMaterial.ownerId !== activation.sourceId
    || (material.fromZone !== "HAND" && material.fromZone !== "EQUIPMENT")
    || rawMaterial.fromZone !== material.fromZone || material.toZone !== "DISCARD" || rawMaterial.toZone !== "DISCARD"
    || projectedCard.kind !== costCard.kind || projectedCard.suit !== costCard.suit || projectedCard.rank !== costCard.rank) return null;
  const owner = players.find((player) => player.id === activation.sourceId && player.hero === "diao-chan");
  const firstParticipant = players.find((player) => player.id === activation.firstParticipantId);
  const secondParticipant = players.find((player) => player.id === activation.secondParticipantId);
  const firstActor = players.find((player) => player.id === activation.firstActorId);
  if (!owner?.name || !firstParticipant?.name || !secondParticipant?.name || !firstActor?.name) return null;
  return { activation, activationEvent, costEvent, costCard, owner, firstParticipant, secondParticipant, firstActor };
}
type LocalTargetPreviewPresentation = { id: string; name: string; hero: Hero | null; hp: number | null; maxHp: number | null };
type LocalTargetPreviewSubmission = { targetId: string; presentationKey: string; actionRevision: string; currentActionKey: string };
type LocalOpponentInspectionPresentation = { id: string; name: string; hero: Hero | null; hp: number | null; maxHp: number | null; handCount: number; equipmentCards: Card[]; judgementCards: Card[] };
type Room = { responseCountdownVisibleAt?: number; actionRevision?: string; code: string; status: "lobby" | "heroes" | "started" | "finished" | "playing"; maxPlayers: number; isHost: boolean; isTestRoom: boolean; testHandPreset: (TestHandPreset & { revision: number }) | null; isTestController?: boolean; meId: string; myRole: string | null; myHeroOptions: Hero[]; players: Player[]; myHand: Card[]; turnSeat: number | null; phase: string | null; deckCount: number; discardTop: Card | null; log: string[]; timeline: GameEvent[]; isMyTurn: boolean; actionPlayerId: string | null; actionReason: string; isMyAction: boolean; presentationSnapshot: PresentationSnapshot | null; presentationV2?: PresentationV2 | null; pending: { kind: CurrentAction["kind"] } | null; currentAction: CurrentAction | null; pendingAttack: { sourceId: string; targetId: string; sequenceStartCardId?: string; deadline?: number } | null; pendingGreenDragon: { sourceId: string; targetId: string; actorId: string; sequenceStartCardId: string; deadline?: number } | null; pendingRockCleaving: { sourceId: string; targetId: string; actorId: string; deadline?: number } | null; pendingFrostSword: { sourceId: string; targetId: string; actorId: string; deadline?: number } | null; pendingDuel: { sourceId: string; targetId: string; actorId: string; opponentId: string; deadline?: number; attackResponseCount?: number; lust?: { rootEventId: string; ownerId: string; firstParticipantId: string; secondParticipantId: string; firstActorId: string } } | null; pendingGroup: { cardKind: "BarbarianInvasion" | "RainingArrows" | "SkyPiercingHalberdAttack"; sourceId: string; requiredKind: "Attack" | "Dodge" } | null; pendingNegation: { sourceId: string; actorId: string | null; effectTargetId: string; cardName: string; responseTarget?: string; latestNegationPlayerId?: string | null; latestNegationCardId?: string | null; chainDepth?: number; negated: boolean; deadline?: number; submitted?: boolean } | null; pendingHarvest: { sourceId: string; actorId: string; revealed: Card[]; choices: { cardId: string; playerId: string; playerName: string }[]; previewCardId: string | null; complete: boolean; countdownUntil: number } | null; pendingTargetCard: { sourceId: string; actorId: string; targetId: string; cardKind: "Dismantle" | "Steal" } | null; pendingBorrowedSword: { sourceId: string; targetId: string; actorId: string; holderId: string; stage: "choose_target" | "force_attack"; weaponId: string | null; eligibleTargetIds: string[] } | null; pendingDying: { sourceId: string; targetId: string; origin?: string | null; recoveryNeeded: number; deadline: number } | null };

export const HERO_ART_BY_ID: Record<string, string> = {
  "cao-cao": "/hero-cao-cao.jpg",
  "liu-bei": "/hero-liu-bei.jpg",
  "sun-quan": "/hero-sun-quan.jpg",
  "simayi": "/hero-sima-yi.jpg",
  "xiahou-dun": "/hero-xiahou-dun.jpg",
  "zhang-liao": "/hero-zhang-liao.jpg",
  "zhang-fei": "/hero-zhang-fei.jpg",
  "zhen-ji": "/hero-zhen-ji.jpg",
  "xu-chu": "/hero-xu-chu.jpg",
  "guo-jia": "/hero-guo-jia.jpg",
  "yue-jin": "/hero-yue-jin.jpg",
  "gongsun-zan": "/hero-gongsun-zan.jpg",
  "ma-chao": "/hero-ma-chao.jpg",
  "daqiao": "/hero-daqiao.jpg",
  "zhuge-liang": "/hero-zhuge-liang.jpg",
  "zhao-yun": "/hero-zhao-yun.jpg",
  "guan-yu": "/hero-guan-yu.jpg",
  "gan-ning": "/hero-gan-ning.jpg",
  "huang-gai": "/hero-huang-gai.jpg",
  "lü-meng": "/hero-lv-meng.jpg",
  "lady-gan": "/hero-lady-gan.jpg",
  "huang-yueying": "/hero-huang-yueying.jpg",
  "zhou-yu": "/hero-zhou-yu.jpg",
  "diao-chan": "/hero-diao-chan.jpg",
  "lü-bu": "/hero-lv-bu.jpg",
  "hua-tuo": "/hero-hua-tuo.jpg",
  huaxiong: "/hero-hua-xiong.jpg",
  "sun-shangxiang": "/hero-sun-shangxiang.jpg",
  "lu-xun": "/hero-lu-xun.jpg",
  "pan-feng": "/hero-pan-feng.jpg",
};

export function HeroPortrait({ hero }: { hero: Pick<Hero, "id" | "name"> }) {
  const initials = hero.name.split(" ").map((part) => part[0]).join("");
  const art = HERO_ART_BY_ID[hero.id];
  if (!art) return <span className="hero-art-fallback" data-hero-art-id={hero.id} aria-hidden="true">{initials}</span>;
  // Static public artwork is intentionally rendered directly so the same path
  // works in the Worker-backed build and in server-rendered test fixtures.
  // eslint-disable-next-line @next/next/no-img-element -- static local hero artwork
  return <img className="hero-art-image" data-hero-art-id={hero.id} src={art} alt="" aria-hidden="true" />;
}

export function hpDisplay(hp: number | null) { return hp !== null && hp <= 0 ? `${hp} HP` : "♥".repeat(Math.max(0, hp ?? 0)); }
export function calculateHandCardStep(handRailWidth: number, cardsOrCount: number | readonly string[], cardWidth = 68, minStep = 30) {
  const count = typeof cardsOrCount === "number" ? cardsOrCount : cardsOrCount.length;
  if (count <= 1 || handRailWidth <= 0) return cardWidth;
  const naturalStep = (handRailWidth - cardWidth) / (count - 1);
  return Math.min(cardWidth, Math.max(minStep, naturalStep));
}
function publicPlayerName(name: string) { return name; }
function delayUntil(deadline: number) { return Math.max(0, deadline - Date.now()); }
function suitColorClass(suit: Card["suit"]) { return suit === "♥" || suit === "♦" ? "red-suit" : "black-suit"; }

function pendingTimelineSequence(room: Room) {
  const sourceId = room.pendingTargetCard?.sourceId ?? room.pendingNegation?.sourceId ?? room.pendingDuel?.sourceId ?? room.pendingAttack?.sourceId ?? room.pendingGreenDragon?.sourceId ?? room.pendingRockCleaving?.sourceId ?? room.pendingFrostSword?.sourceId ?? room.pendingGroup?.sourceId;
  const source = room.players.find((player) => player.id === sourceId);
  if (!source) return [];
  const expectedName = room.pendingTargetCard ? cardDefinition(room.pendingTargetCard.cardKind).name : room.pendingNegation?.cardName ?? (room.pendingDuel ? "Duel" : room.pendingGroup ? room.pendingGroup.cardKind === "SkyPiercingHalberdAttack" ? "Attack" : cardDefinition(room.pendingGroup.cardKind).name : room.pendingAttack || room.pendingGreenDragon || room.pendingRockCleaving ? "Attack" : null);
  const sequenceStartCardId = room.pendingGreenDragon?.sequenceStartCardId || room.pendingRockCleaving?.sequenceStartCardId || room.pendingAttack?.sequenceStartCardId;
  const sourceName = publicPlayerName(source.name);
  const initiatingIndex = [...room.timeline].map((event, index) => ({ event, index })).reverse().find(({ event }) => sequenceStartCardId
    ? eventCards(event).some((card) => card.id === sequenceStartCardId)
    : event.type === "card" && event.action !== "gain" && event.action !== "reveal" && publicPlayerName(event.player) === sourceName && (!expectedName || cardDefinition(event.card.kind).name === expectedName))?.index ?? -1;
  if (initiatingIndex < 0) return [];
  return room.timeline.slice(initiatingIndex).filter((event) => event.presentation !== false);
}

function timelineSequenceFrom(room: Room, startId: string) {
  const startIndex = room.timeline.findIndex((event) => event.id === startId);
  return startIndex < 0 ? [] : room.timeline.slice(startIndex).filter((event) => event.presentation !== false);
}

function eventCards(event: GameEvent) { return event.type === "card" ? [event.card] : event.type === "cards" ? event.cards : []; }
function movesDirectlyToDiscard(event: GameEvent) {
  return event.type === "cards" ? event.action === "discard" : event.type === "card" ? event.action === "discard" || event.action === "reveal" : false;
}
function settlesInJudgement(event: GameEvent | null | undefined) {
  return Boolean(event && event.type === "card" && !event.playedAs && event.action === "play" && ["Overindulgence", "Lightning", "RationsDepleted"].includes(event.card.kind));
}
function retainsAtPlayer(event: GameEvent) {
  // Equipment is committed to the owner's rack by the API before its public
  // presentation is emitted. Keep the centre reveal, but do not also retain a
  // numbered copy in the settled sequence; that duplicate made an equipped
  // card appear to return to the player's hand before settling.
  return eventCards(event).length === 0 || (!movesDirectlyToDiscard(event) && !(event.type === "card" && (event.action === "gain" || event.action === "equip")));
}
function isJudgementReveal(event: GameEvent | null | undefined) {
  return Boolean(event && event.type === "card" && event.action === "reveal" && event.judgement);
}
function appendUniqueEvents(current: GameEvent[], incoming: GameEvent[]) {
  return incoming.reduce((events, event) => events.some((existing) => existing.id === event.id) ? events : [...events, event], current);
}
function eventImportance(event: GameEvent) { return event.importance ?? "informational"; }
function coalescePresentationQueue(current: GameEvent[], incoming: GameEvent[]) {
  const combined = appendUniqueEvents(current, incoming);
  const latestResolutionId = incoming.map((event) => event.resolutionId).filter(Boolean).at(-1);
  if (!latestResolutionId) return combined;
  return combined.filter((event) => event.resolutionId === latestResolutionId || eventImportance(event) === "essential" || event.finalResult === true);
}

const UI_TIMING = {
  roomPoll: 8000,
  activeGamePoll: 2000,
  activePoll: 1000,
  hiddenPoll: 60000,
  presenceHeartbeat: 60000,
  inactivityCheck: 60000,
  turnDrawStart: 100,
  playedCard: 4000,
  // Judgement cards need about two extra seconds for every seat to read the result.
  judgementCard: 4000,
  privateDraw: 3000,
  effectNotice: 2400,
  effectNoticeExit: 160,
  sequenceDiscard: 700,
  interactionSettlement: 600,
  interactionSettlementReduced: 120,
  interactionSettlementFade: 150,
  attackHitSettlementRead: 2_000,
  attackHitSettlementFade: 180,
  publicCounterRead: 3000,
  publicCardJourneyRead: 4_380,
  attackDodgeResultRead: 2_000,
  publicCounterSettlementConfirm: 120,
  publicCounterFade: 180,
} as const;
const NO_SKILL_EFFECT_SETTLEMENTS = [] as const;
const NO_DISMANTLE_SETTLEMENTS = [] as const;
const NO_STEAL_SETTLEMENTS = [] as const;
const NO_ATTACK_HIT_SETTLEMENTS = [] as const;
const EMPTY_STRING_SET: ReadonlySet<string> = new Set();

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // Development middleware can occasionally return a plain-text error page.
    // Never surface its implementation text as a JSON parsing failure in-game.
    throw new Error(response.status >= 500
      ? "The local game server had a temporary error. Please try again."
      : "The game server returned an invalid response. Please try again.");
  }
}

export default function Home() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pageVisible, setPageVisible] = useState(true);
  const [publicCounterReadUntil, setPublicCounterReadUntil] = useState(0);
  const stateEpoch = useRef(0);
  const mutationInFlight = useRef<string | null>(null);
  const latestAppliedMutation = useRef(0);
  const lastPublicCounterReadIdentity = useRef<string | null>(null);
  const testViewerIdRef = useRef<string | null>(null);
  const testViewerRoomCodeRef = useRef<string | null>(null);
  const testViewerRevisionRef = useRef(0);

  const fetchRoom = useCallback(async function fetchRoomRequest(roomCode: string, playerToken: string, quiet = false, requestedViewerId?: string) {
    if (testViewerRoomCodeRef.current !== roomCode) {
      testViewerRoomCodeRef.current = roomCode;
      testViewerIdRef.current = null;
      testViewerRevisionRef.current += 1;
    }
    const epoch = stateEpoch.current;
    const testViewerRevision = testViewerRevisionRef.current;
    const selectedTestViewerId = requestedViewerId ?? testViewerIdRef.current;
    const uxTraceId = getAttackDodgeUxTraceId();
    try {
      if (uxTraceId) recordAttackDodgeUxTrace("room-poll-request", { traceId: uxTraceId });
      const query = new URLSearchParams({ code: roomCode, token: playerToken });
      if (selectedTestViewerId) query.set("testViewerId", selectedTestViewerId);
      if (uxTraceId) query.set("uxTraceId", uxTraceId);
      const response = await fetch(`/api/rooms?${query.toString()}`, { cache: "no-store" });
      if (uxTraceId) recordAttackDodgeUxTrace("room-poll-response", { traceId: uxTraceId, status: response.status, ok: response.ok });
      if (!response.ok) throw new Error("Room is no longer available.");
      const rawData = await readApiJson<unknown>(response);
      let roomPayload = rawData;
      let serverDiagnostic: Record<string, unknown> | null = null;
      if (uxTraceId && rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
        const traceResponse = rawData as { room?: unknown; attackDodgeUxTrace?: Record<string, unknown> };
        if (traceResponse.attackDodgeUxTrace) {
          serverDiagnostic = traceResponse.attackDodgeUxTrace;
          roomPayload = traceResponse.room ?? rawData;
        }
      }
      const nextRoom = normalizeRoomData(roomPayload) as Room | null;
      if (!nextRoom || !nextRoom.meId) throw new Error("Your player session is no longer valid.");
      if (selectedTestViewerId && nextRoom.meId !== selectedTestViewerId) throw new Error("The selected test-player view is no longer available.");
      // Test controllers follow the server-selected seat while choosing
      // Generals, then start gameplay from HOST until a SWITCH button is
      // explicitly used. Do not let the default action-player projection
      // silently choose a gameplay perspective on a fresh/reloaded client.
      if (!selectedTestViewerId && nextRoom.isTestController && nextRoom.status !== "heroes") {
        const hostId = nextRoom.players.find((player) => player.isHost)?.id;
        if (hostId) {
          testViewerRoomCodeRef.current = nextRoom.code;
          testViewerIdRef.current = hostId;
          testViewerRevisionRef.current += 1;
          return fetchRoomRequest(roomCode, playerToken, quiet, hostId);
        }
      }
      if (serverDiagnostic) {
        recordAttackDodgeUxTrace("server-projection-evaluation", sanitizeAttackDodgeUxTraceData(
          serverDiagnostic,
          nextRoom.players.map((player) => player.name),
          nextRoom.code,
          [playerToken, ...nextRoom.myHand.map((card) => card.id)],
        ) as Record<string, unknown>);
      }
      recordPublicGameRoomSnapshot(nextRoom, "poll");
      if (nextRoom.status === "finished") stopAttackDodgeUxTrace("game-finished");
      if (epoch === stateEpoch.current && testViewerRevision === testViewerRevisionRef.current) {
        if (nextRoom.isTestController) {
          testViewerRoomCodeRef.current = nextRoom.code;
          testViewerIdRef.current = selectedTestViewerId ?? nextRoom.meId;
        } else {
          testViewerRoomCodeRef.current = nextRoom.code;
          testViewerIdRef.current = null;
        }
        setRoom(nextRoom as Room);
      }
      return true;
    } catch (cause) {
      if (uxTraceId) recordAttackDodgeUxTrace("room-poll-failure", { traceId: uxTraceId, kind: cause instanceof Error ? cause.name : "unknown" });
      if (cause instanceof Error && /Previous game data|no longer available|session is no longer valid/.test(cause.message)) {
        stopAttackDodgeUxTrace("room-session-unavailable");
        localStorage.removeItem("three-realms-session");
        if (epoch === stateEpoch.current) { setRoom(null); setCode(""); setToken(""); }
      }
      if (!quiet) setError(cause instanceof Error ? cause.message : "Could not reach the room.");
      return false;
    }
  }, []);

  const notePublicCounterReadVisible = useCallback((identity: string, durationMs = UI_TIMING.publicCounterRead, renew = false) => {
    if (!identity || (!renew && lastPublicCounterReadIdentity.current === identity)) return;
    lastPublicCounterReadIdentity.current = identity;
    setPublicCounterReadUntil((current) => Math.max(current, Date.now() + durationMs));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("three-realms-session");
    if (!saved) return;
    try {
      const session = JSON.parse(saved) as { code: string; token: string; name?: string };
      if (!/^[A-Z0-9]{5}$/.test(session.code) || !session.token) throw new Error("Invalid saved session");
      resumeAttackDodgeUxTraceSession();
      recordAttackDodgeUxTrace("saved-game-session-restored", { automaticRecording: true });
      const timer = setTimeout(() => { setToken(session.token); setCode(session.code); if (session.name) setName(session.name); void fetchRoom(session.code, session.token, true); }, 0);
      return () => clearTimeout(timer);
    } catch { localStorage.removeItem("three-realms-session"); }
  }, [fetchRoom]);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState !== "hidden");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  const roomCode = room?.code;
  useEffect(() => {
    if (!roomCode || !token || busy) return;
    const publicReadActive = publicCounterReadUntil > Date.now();
    const interval = !pageVisible ? UI_TIMING.hiddenPoll
      : room?.phase === "response" || room?.phase === "dying" || publicReadActive
        ? UI_TIMING.activePoll
        : room?.status === "playing" ? UI_TIMING.activeGamePoll : UI_TIMING.roomPoll;
    const timer = setInterval(() => fetchRoom(roomCode, token, true), interval);
    return () => clearInterval(timer);
  }, [roomCode, token, busy, pageVisible, fetchRoom, room?.phase, room?.status, publicCounterReadUntil]);
  useEffect(() => {
    if (!publicCounterReadUntil) return;
    const timer = setTimeout(() => setPublicCounterReadUntil((current) => current === publicCounterReadUntil ? 0 : current),
      Math.max(0, publicCounterReadUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [publicCounterReadUntil]);

  async function send(action: "create" | "join" | "start" | "add_test_players" | "enable_test_room" | "configure_test_hands" | "choose_hero" | "heartbeat" | "expire_inactive_room" | GameplayAction, extra: Record<string, unknown> = {}) {
    const backgroundPreview = action === "preview_harvest" || action === "heartbeat";
    const nonBlocking = backgroundPreview;
    const mutationKey = `${action}:${room?.actionRevision ?? room?.phase ?? "landing"}`;
    if (!nonBlocking && mutationInFlight.current === mutationKey) return false;
    if (!nonBlocking && mutationInFlight.current) return false;
    if (!nonBlocking) mutationInFlight.current = mutationKey;
    const epoch = nonBlocking ? stateEpoch.current : ++stateEpoch.current; const mutationSequence = nonBlocking ? latestAppliedMutation.current : epoch;
    if (action === "create" || action === "join") beginAttackDodgeUxTraceSession();
    const uxTraceId = getAttackDodgeUxTraceId();
    if (!nonBlocking) { setBusy(true); setBusyAction(action); setError(""); }
    try {
      if (action === "join") {
        const saved = localStorage.getItem("three-realms-session");
        try {
          const session = saved ? JSON.parse(saved) as { code?: string; token?: string } : null;
          if (session?.code === code && session.token && await fetchRoom(code, session.token, true)) return true;
        } catch { localStorage.removeItem("three-realms-session"); }
      }
      const context = room && !["create", "join", "start", "add_test_players", "enable_test_room", "configure_test_hands", "choose_hero", "heartbeat"].includes(action) ? { actionRevision: room.actionRevision ?? "", meId: room.meId, phase: room.phase, pendingKind: pendingKind(room), actorId: room.actionPlayerId, ...(room.currentAction?.negationWindowId ? { windowId: room.currentAction.negationWindowId } : {}) } : undefined;
      if (uxTraceId) recordAttackDodgeUxTrace("gameplay-action-request", { traceId: uxTraceId, action, hasRevisionContext: Boolean(context?.actionRevision) });
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, name, code, token, ...(context ? { context } : {}), ...(uxTraceId ? { uxTraceId } : {}), ...extra }) });
      const rawData = await readApiJson<{ error?: string; token?: string; room?: unknown; stale?: boolean; attackDodgeUxTrace?: Record<string, unknown> }>(response);
      if (uxTraceId) {
        recordAttackDodgeUxTrace("gameplay-action-response", {
          traceId: uxTraceId,
          action,
          status: response.status,
          ok: response.ok,
          stale: rawData.stale === true,
          roomReturned: Boolean(rawData.room),
          serverDiagnosticReturned: Boolean(rawData.attackDodgeUxTrace),
        });
        if (rawData.attackDodgeUxTrace) {
          const diagnosticStage = rawData.attackDodgeUxTrace.stage === "server-projection-after-play"
            ? "server-projection-after-play"
            : "server-proof-evaluation";
          recordAttackDodgeUxTrace(diagnosticStage, sanitizeAttackDodgeUxTraceData(
            rawData.attackDodgeUxTrace,
            room?.players.map((player) => player.name) ?? [],
            room?.code,
            [token, ...(room?.myHand.map((card) => card.id) ?? [])],
          ) as Record<string, unknown>);
        }
      }
      const data = { ...rawData, room: normalizeRoomData(rawData.room) as Room | null };
      const testHeroSelectionAdvances = room?.isTestController && room.status === "heroes"
        && data.room?.status === "heroes";
      const gameplayViewStartsForHost = room?.isTestController && room.status === "heroes"
        && data.room?.status === "playing"
        ? data.room.players.find((player) => player.isHost)?.id ?? null
        : null;
      const preservedTestViewerId = gameplayViewStartsForHost
        ?? (room?.isTestController && room.status !== "heroes" ? testViewerIdRef.current : null);
      if (testHeroSelectionAdvances && data.room) {
        testViewerRoomCodeRef.current = data.room.code;
        testViewerIdRef.current = data.room.meId;
      }
      if (gameplayViewStartsForHost && data.room) {
        testViewerRoomCodeRef.current = data.room.code;
        testViewerIdRef.current = gameplayViewStartsForHost;
        testViewerRevisionRef.current += 1;
      }
      const preserveTestViewer = Boolean(data.room && preservedTestViewerId);
      if (preserveTestViewer && data.room) {
        await fetchRoom(data.room.code, token, true, preservedTestViewerId!);
      }
      if (data.room && !preserveTestViewer) recordPublicGameRoomSnapshot(data.room, "action");
      if (data.room?.status === "finished") stopAttackDodgeUxTrace("game-finished");
      if (data.room && !preserveTestViewer && mutationSequence >= latestAppliedMutation.current && (nonBlocking || epoch === stateEpoch.current)) { latestAppliedMutation.current = Math.max(latestAppliedMutation.current, mutationSequence); setToken(data.token ?? token); setRoom(data.room); setCode(data.room.code); }
      if (!response.ok || action !== "heartbeat" && !data.room) throw new Error(data.error ?? "Something went wrong.");
      if (action === "heartbeat") return true;
      const nextToken = data.token ?? token;
      if (!preserveTestViewer && epoch === stateEpoch.current && mutationSequence >= latestAppliedMutation.current) { latestAppliedMutation.current = mutationSequence; setToken(nextToken); setRoom(data.room); setCode(data.room.code); }
      localStorage.setItem("three-realms-session", JSON.stringify({ code: data.room.code, token: nextToken, name: name.trim() }));
      return true;
    } catch (cause) {
      if (uxTraceId) recordAttackDodgeUxTrace("gameplay-action-failure", { traceId: uxTraceId, action, kind: cause instanceof Error ? cause.name : "unknown" });
      if (!backgroundPreview) setError(cause instanceof Error ? cause.message : "Something went wrong.");
      return false;
    }
    finally { if (!nonBlocking) { if (mutationInFlight.current === mutationKey) mutationInFlight.current = null; setBusy(false); setBusyAction(null); } }
  }

  async function switchTestViewer(playerId: string) {
    const targetPlayer = room?.players.find((player) => player.id === playerId);
    if (!room?.isTestController || !targetPlayer || (!targetPlayer.isTestPlayer && !targetPlayer.isHost) || targetPlayer.id === room.meId) return;
    testViewerRoomCodeRef.current = room.code;
    testViewerIdRef.current = playerId;
    testViewerRevisionRef.current += 1;
    await fetchRoom(room.code, token, true, playerId);
  }

  useEffect(() => {
    if (!roomCode || !token || !pageVisible || room?.isTestController) return;
    const timer = setInterval(() => { void send("heartbeat"); }, UI_TIMING.presenceHeartbeat);
    return () => clearInterval(timer);
  // Presence is independent of room mutations; it intentionally tracks only
  // this browser session and never makes normal GET polling write to D1.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, token, pageVisible, room?.isTestController]);

  useEffect(() => {
    if (!roomCode || !token) return;
    const checkForInactivity = () => { void fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "expire_inactive_room", code: roomCode, token }) }); };
    checkForInactivity();
    const timer = setInterval(checkForInactivity, UI_TIMING.inactivityCheck);
    return () => clearInterval(timer);
  }, [roomCode, token]);

  const harvestDeadline = room?.pendingHarvest?.complete ? room.pendingHarvest.countdownUntil : 0;
  const harvestRevision = room?.actionRevision ?? "";
  useEffect(() => {
    if (!roomCode || !token || !pageVisible || !harvestDeadline) return;
    const timer = setTimeout(() => { void send("advance_timers"); }, Math.max(0, harvestDeadline - Date.now()));
    return () => clearTimeout(timer);
  // Only the final result-hold deadline advances Harvest state. The active
  // chooser's 60-second timer is display-only and does not auto-select a card.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, token, pageVisible, harvestDeadline, harvestRevision]);
  const negationDeadline = room?.pendingNegation?.deadline ?? 0;
  useEffect(() => {
    if (!roomCode || !token || !pageVisible || !negationDeadline) return;
    const timer = setTimeout(() => { void send("advance_timers"); }, Math.max(0, negationDeadline - Date.now()));
    return () => clearTimeout(timer);
  // Any connected viewer may advance an expired Negation decision. The
  // server rechecks the capability and deadline before moving the chain.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, token, pageVisible, negationDeadline]);

  function leave() {
    stopAttackDodgeUxTrace("player-left-game");
    testViewerIdRef.current = null;
    testViewerRoomCodeRef.current = null;
    testViewerRevisionRef.current += 1;
    stateEpoch.current += 1; setRoom(null); setError(""); setPublicCounterReadUntil(0); lastPublicCounterReadIdentity.current = null;
  }

  const presentationView = room ? buildPresentationClientView(room.presentationSnapshot, room.meId) : null;

  if (room?.status === "started" || room?.status === "playing" || room?.status === "finished") return <GameRoomErrorBoundary room={room} onRecover={leave}><GameRoom room={room} presentationView={presentationView ?? buildPresentationClientView(null, null)} busy={busy} busyAction={busyAction} error={error} onAction={send} onLeave={leave} onPublicCounterReadVisible={notePublicCounterReadVisible} onSwitchTestViewer={switchTestViewer} /></GameRoomErrorBoundary>;
  if (room?.status === "heroes") return <HeroSelection room={room} busy={busy} error={error} onChoose={(heroId) => send("choose_hero", { heroId })} onLeave={leave} />;
  if (room) return <WaitingRoom room={room} busy={busy} error={error} onStart={() => send("start")} onAddTestPlayers={() => send("add_test_players")} onEnableTestRoom={() => send("enable_test_room")} onConfigureTestHands={(presetId, handsBySeat, expectedRevision) => send("configure_test_hands", { presetId, handsBySeat, expectedRevision })} onLeave={leave} />;

  return (
    <main className="landing-shell">
      <div className="mist mist-one" /><div className="mist mist-two" />
      <header className="landing-nav"><Brand /><span>CLASSIC HIDDEN-ROLE MODE</span></header>
      <section className="landing-grid">
        <div className="intro">
          <span className="eyebrow">A PRIVATE TABLE FOR FRIENDS</span>
          <h1>Strategy has<br /><em>four faces.</em></h1>
          <p>Rule the realm. Defend your lord. Overthrow the throne. Or outlive them all.</p>
          <div className="role-row"><Role title="Lord" glyph="主" /><Role title="Loyalist" glyph="忠" /><Role title="Rebel" glyph="反" /><Role title="Spy" glyph="内" /></div>
        </div>
        <div className="entry-card">
          <div className="entry-title"><span>ENTER THE REALM</span><small>4–8 players</small></div>
          <label className="test-player-name"><span>PLAYER NAME</span><input value={name} onChange={(event) => setName(event.target.value.slice(0, 20))} maxLength={20} placeholder="Enter your name" autoComplete="nickname" /></label>
          <button className="gold-button" disabled={busy || name.trim().length < 2} onClick={() => send("create")}>{busy ? "Preparing…" : "Host Game"}</button>
          <div className="divider"><span>OR JOIN A GAME</span></div>
          <form onSubmit={(event: FormEvent) => { event.preventDefault(); send("join"); }}>
            <label><span>ROOM CODE</span><input className="code-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))} maxLength={5} placeholder="ABCDE" autoCapitalize="characters" /></label>
            <button className="outline-button" disabled={busy || name.trim().length < 2 || code.length !== 5}>Join Game</button>
          </form>
          {error && <p className="error" role="alert">{error}</p>}
          <small className="privacy-note">Your secret role and player key stay private on this device.</small>
        </div>
      </section>
      <footer className="landing-foot"><span>THREE KINGDOMS</span><span>Original English adaptation · Classic social strategy</span></footer>
    </main>
  );
}

function Brand() { return <div className="brand"><span className="brand-mark">三</span><div><strong>Three Kingdoms</strong><small>Classic card game</small></div></div>; }
function Role({ title, glyph }: { title: string; glyph: string }) { return <div className="mini-role"><b>{glyph}</b><span>{title}</span></div>; }

type TestHandDraft = Record<number, Array<CardKind | "">>;

function testHandDraftFrom(preset: TestHandPreset | null): TestHandDraft {
  return Object.fromEntries(Object.entries(preset?.handsBySeat ?? {}).map(([seat, kinds]) => [Number(seat), [...kinds]]));
}

type WaitingRoomProps = {
  room: Room;
  busy: boolean;
  error: string;
  onStart: () => void;
  onAddTestPlayers: () => void;
  onEnableTestRoom: () => void;
  onConfigureTestHands: (presetId: TestHandPresetId, handsBySeat: Record<number, CardKind[]>, expectedRevision: number) => void;
  onLeave: () => void;
};

export function WaitingRoom(props: WaitingRoomProps) {
  const { room } = props;
  const key = `${room.code}:${room.isTestRoom ? "test" : "normal"}:${room.testHandPreset?.revision ?? 0}`;
  return <WaitingRoomEditor key={key} {...props} />;
}

function WaitingRoomEditor({ room, busy, error, onStart, onAddTestPlayers, onEnableTestRoom, onConfigureTestHands, onLeave }: WaitingRoomProps) {
  const share = async () => { await navigator.clipboard?.writeText(room.code); };
  const canStart = room.players.length >= 4 && room.players.length <= room.maxPlayers;
  const savedPreset = room.testHandPreset;
  const [selectedPreset, setSelectedPreset] = useState<TestHandPresetId>(savedPreset?.id ?? "random");
  const [customDraft, setCustomDraft] = useState<TestHandDraft>(() => testHandDraftFrom(savedPreset?.id === "custom" ? savedPreset : null));

  const customHands = Object.fromEntries(Object.entries(customDraft)
    .map(([seat, kinds]) => [Number(seat), kinds.filter((kind): kind is CardKind => Boolean(kind))])
    .filter(([, kinds]) => (kinds as CardKind[]).length > 0)) as Record<number, CardKind[]>;
  const handsForPreview = selectedPreset === "custom" ? customHands : testHandPresetFor(selectedPreset).handsBySeat;
  const savedCustomHands = savedPreset?.id === "custom" ? savedPreset.handsBySeat : {};
  const presetDirty = room.isTestRoom && (selectedPreset !== (savedPreset?.id ?? "random")
    || selectedPreset === "custom" && JSON.stringify(customHands) !== JSON.stringify(savedCustomHands));
  const handLabel = (kinds: CardKind[]) => kinds.map((kind) => cardDefinition(kind).name).join(" · ");
  const updateCustomCard = (seat: number, slot: number, value: string) => {
    setCustomDraft((current) => {
      const kinds = [...(current[seat] ?? [])];
      while (kinds.length <= slot) kinds.push("");
      kinds[slot] = value as CardKind | "";
      return { ...current, [seat]: kinds };
    });
  };
  const savePreset = () => onConfigureTestHands(selectedPreset, selectedPreset === "custom" ? customHands : testHandPresetFor(selectedPreset).handsBySeat, savedPreset?.revision ?? 0);

  return <main className="lobby-shell"><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b></div><button className="text-button" onClick={onLeave}>Leave room</button></header>
    <section className="lobby-content"><div className="lobby-heading"><span className="eyebrow">THE GENERALS ASSEMBLE</span><h1>Waiting room</h1>{room.isTestRoom && <span className="test-game-label">TEST GAME · HOST CONTROLLED</span>}<p>Share this code with your friends. The game can start when 4–8 players have joined.</p><button className="copy-code" onClick={share}><span>{room.code}</span><small>Tap to copy room code</small></button></div>
      <div className="seat-grid">{Array.from({ length: room.maxPlayers }, (_, seat) => { const player = room.players.find((item) => item.seat === seat); return <div className={`seat ${player ? "filled" : ""}`} key={seat}>{player ? <><span className="seat-number">{seat + 1}</span><div className="seal">{player.name[0].toUpperCase()}</div><b>{player.name}</b><small>{player.isHost ? "HOST" : player.isTestPlayer ? "TEST PLAYER" : "PLAYER"}</small></> : <><span className="seat-number">{seat + 1}</span><div className="empty-seal">+</div><b>Open seat</b><small>WAITING FOR PLAYER</small></>}</div>; })}</div>
      <div className="lobby-actions"><span>{room.players.length} / {room.maxPlayers} players</span><div className="host-actions">{room.isHost && <>{room.players.length < 4 && <button className="test-button" disabled={busy} onClick={onAddTestPlayers}>+ Add {4 - room.players.length} Test Player{4 - room.players.length === 1 ? "" : "s"}</button>}{!room.isTestRoom && <button className="test-mode-button" disabled={busy || !canStart} onClick={onEnableTestRoom}>Enable Test Game</button>}<button className="gold-button" disabled={busy || !canStart || room.isTestRoom && (!savedPreset || presetDirty)} onClick={onStart}>{busy ? "Preparing…" : room.players.length < 4 ? `Need ${4 - room.players.length} more` : "Start game"}</button></>}{!room.isHost && <p>Waiting for the host to start…</p>}</div></div>
      {room.isTestRoom && room.isHost && savedPreset && <section className="test-preset-panel" aria-label="Preset Hands configuration">
        <div className="test-preset-heading"><div><span className="eyebrow">HOST TEST CONTROLS</span><h2>Preset Hands</h2></div><span className="preset-revision">Saved · v{savedPreset.revision}</span></div>
        <label className="preset-select-label"><span>STARTING-HAND SCENARIO</span><select aria-label="Preset Hands" value={selectedPreset} disabled={busy} onChange={(event) => setSelectedPreset(event.target.value as TestHandPresetId)}>{TEST_HAND_PRESET_OPTIONS.map((option) => <option value={option.id} key={option.id}>{option.name}</option>)}</select></label>
        {selectedPreset === "custom" ? <div className="preset-seat-grid">{room.players.map((player) => <fieldset className="preset-seat" key={player.id}><legend>Seat {player.seat + 1} · {player.name}</legend>{Array.from({ length: 4 }, (_, slot) => <label key={slot}><span>Card {slot + 1}</span><select aria-label={`${player.name} starting card ${slot + 1}`} value={customDraft[player.seat]?.[slot] ?? ""} disabled={busy} onChange={(event) => updateCustomCard(player.seat, slot, event.target.value)}><option value="">Fill randomly</option>{STANDARD_PRESET_CARD_KINDS.map((kind) => <option value={kind} key={kind}>{cardDefinition(kind).name}</option>)}</select></label>)}</fieldset>)}</div>
          : <div className="preset-seat-grid preset-summary">{selectedPreset === "random" ? <p>All four opening cards per player are dealt randomly from the shuffled Standard deck.</p> : room.players.filter((player) => handsForPreview[player.seat]?.length).map((player) => <div className="preset-seat-summary" key={player.id}><b>Seat {player.seat + 1} · {player.name}</b><span>{handLabel(handsForPreview[player.seat] ?? [])}</span></div>)}</div>}
        <div className="preset-actions"><p>Specified cards keep their real Standard-deck suit, rank and physical ID. Unspecified slots are dealt randomly.</p><button className="test-button" disabled={busy || !presetDirty} onClick={savePreset}>{busy ? "Saving…" : "Save Preset"}</button></div>
      </section>}
      {room.isTestRoom && !room.isHost && <p className="test-room-note">This is a host-controlled TEST GAME. Starting-hand configuration is private to the host.</p>}
      {error && <p className="error" role="alert">{error}</p>}</section></main>;
}

export function HeroSelection({ room, busy, error, onChoose, onLeave }: { room: Room; busy: boolean; error: string; onChoose: (heroId: string) => void; onLeave: () => void }) {
  const [selected, setSelected] = useState(room.myHeroOptions[0]?.id ?? "");
  const [infoHero, setInfoHero] = useState<Hero | null>(null);
  const me = room.players.find((player) => player.id === room.meId);
  const roleLabel = room.myRole ?? "Role pending";
  const waiting = Boolean(me?.hero) || !room.isMyAction;
  const chosenCount = room.players.filter((player) => player.generalReady).length;
  const effectiveSelected = room.myHeroOptions.some((hero) => hero.id === selected) ? selected : room.myHeroOptions[0]?.id ?? "";
  const testHeroMode = room.isTestRoom && Boolean(room.isTestController);
  const selectedTestHero = room.myHeroOptions.find((hero) => hero.id === effectiveSelected) ?? null;
  const selector = room.players.find((player) => player.id === room.actionPlayerId);
  const waitingMessage = me?.hero ? `Waiting for the other players · ${chosenCount}/${room.players.length} ready` : `Waiting for ${selector?.name ?? "the current seat"} to choose · ${chosenCount}/${room.players.length} ready`;
  return <main className="hero-shell"><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b><span>Choose a hero</span></div><button className="text-button" onClick={onLeave}>Exit</button></header>
    <section className="hero-stage"><div className="hero-stage-head"><span className="eyebrow">{room.isTestController ? `TEST CONTROLLER · ${me?.name?.toUpperCase()}` : "GENERAL SELECTION"}</span><h1>{me?.hero ? "Your general is chosen" : room.isMyAction ? "Choose your general" : "Waiting for selection"}</h1><div className="hero-role-banner" role="status" aria-label={`Your secret role is ${roleLabel}`}><span>YOUR SECRET ROLE</span><strong>{roleLabel}</strong></div><p>{waiting ? waitingMessage : testHeroMode ? `Choose a specific hero for Seat ${(me?.seat ?? 0) + 1}. Each implemented Standard hero can be assigned once.` : room.myRole === "Lord" ? "As Lord, choose from five generals. Your identity will be visible at the table." : "Choose one of your three private candidates."}</p></div>
      {waiting ? <div className="chosen-wait"><div className="seal">{me?.hero ? "✓" : "…"}</div>{me?.hero && (() => { const chosenHero = heroDefinition(me.hero); return chosenHero ? <div className="chosen-hero-art" data-hero-id={chosenHero.id}><HeroPortrait hero={chosenHero} /></div> : null; })()}<b>{me?.hero ? heroName(me.hero) : `Waiting for ${selector?.name ?? "the current seat"}`}</b><span>{me?.hero ? "Locked in" : "Your private candidates are ready."}</span><div className="ready-list">{room.players.map((player) => <small key={player.id} className={player.generalReady ? "ready" : ""}>{player.name} {player.generalReady ? testHeroMode && player.hero ? `· ${heroName(player.hero)}` : "✓" : "…"}</small>)}</div></div> : testHeroMode ? <div className="test-hero-picker" data-testid="test-hero-picker"><label htmlFor="test-hero-choice"><span>HERO FOR SEAT {(me?.seat ?? 0) + 1} · {me?.name}</span><select id="test-hero-choice" aria-label={`Choose a test hero for ${me?.name ?? "this seat"}`} value={effectiveSelected} disabled={busy} onChange={(event) => setSelected(event.target.value)}>{room.myHeroOptions.map((hero) => <option value={hero.id} key={hero.id}>{hero.name} · {hero.faction}</option>)}</select></label>{selectedTestHero && <div className="test-hero-preview"><div className="test-hero-portrait" data-hero-id={selectedTestHero.id}><HeroPortrait hero={selectedTestHero} /></div><div className="test-hero-summary"><span>{selectedTestHero.faction} · {"♥".repeat(selectedTestHero.hp)} · {selectedTestHero.hp} HP</span><h2>{selectedTestHero.name}</h2><p>{heroSkillNames(selectedTestHero).join(" · ")}</p></div><button type="button" className="hero-info-button" aria-label={`View ${selectedTestHero.name} information`} onClick={() => setInfoHero(selectedTestHero)}>i</button></div>}<p className="test-hero-guidance">Only unused, implemented Standard heroes are offered. Confirm to assign this hero to the current test seat.</p></div> : <div className={`hero-choice-grid hero-choice-grid-${room.myHeroOptions.length}`}>{room.myHeroOptions.map((hero) => <div className={`hero-choice-wrap ${effectiveSelected === hero.id ? "selected" : ""}`} key={hero.id}><button type="button" aria-label={`Select ${hero.name}`} aria-pressed={effectiveSelected === hero.id} className={`hero-choice ${hero.faction.toLowerCase()} ${effectiveSelected === hero.id ? "selected" : ""}`} onClick={() => setSelected(hero.id)}><span className="faction">{hero.faction}</span><div className="hero-monogram" data-hero-id={hero.id}><HeroPortrait hero={hero} /></div><h2>{hero.name}</h2><span className="hero-hp">{"♥".repeat(hero.hp)}</span><p>{heroSkillNames(hero).join(" · ")}</p><i>{effectiveSelected === hero.id ? "SELECTED" : "CHOOSE"}</i></button><button type="button" className="hero-info-button" aria-label={`View ${hero.name} information`} onClick={() => setInfoHero(hero)}>i</button></div>)}</div>}
      {!waiting && <div className="hero-confirm"><span>{testHeroMode ? "Each hero can be assigned to one test seat only." : "General choices remain private until the match begins."}</span><button className="gold-button" disabled={busy || !effectiveSelected} onClick={() => onChoose(effectiveSelected)}>{busy ? "Locking in…" : `Confirm ${room.myHeroOptions.find((hero) => hero.id === effectiveSelected)?.name ?? "hero"}`}</button></div>}{error && <p className="error hero-error" role="alert">{error}</p>}{infoHero && <HeroInfoDialog hero={infoHero} onClose={() => setInfoHero(null)} />}
    </section></main>;
}

export function HeroInfoDialog({ hero, onClose }: { hero: Hero; onClose: () => void }) {
  const skills = hero.skills?.length ? hero.skills : [{ name: hero.skill ?? "Hero Skill", description: hero.ability }];
  return <div className="card-info-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}><section className="card-info-dialog hero-info-dialog" role="dialog" aria-modal="true" aria-labelledby="hero-info-title"><button type="button" className="card-info-close" onClick={onClose} aria-label="Close hero information">×</button><span>HERO INFORMATION</span><small>{hero.faction} · {"♥".repeat(hero.hp)} · {hero.hp} HP</small><h2 id="hero-info-title">{hero.name}</h2>{skills.map((skill) => <div className="hero-info-skill-block" key={skill.name}><strong className="hero-info-skill">{skill.name}</strong><p>{skill.description}</p></div>)}<em>Only you can see this information.</em></section></div>;
}

export function HeroDetailsPreview({ hero, currentHp, maximumHp, onClose }: { hero: Hero; currentHp: number | null; maximumHp: number | null; onClose: (restoreFocus?: boolean) => void }) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const skills = hero.skills?.length ? hero.skills : [{ name: hero.skill ?? "Hero Skill", description: hero.ability }];

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const dismissOutsideTap = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      // The battlefield stage has pointer-events:none outside its panel, so
      // dismissing here leaves the underlying gameplay control fully usable.
      onClose(false);
    };
    document.addEventListener("pointerdown", dismissOutsideTap);
    return () => document.removeEventListener("pointerdown", dismissOutsideTap);
  }, [onClose]);

  return <div className="card-details-stage hero-details-stage" data-hero-details-stage="true">
    <section ref={panelRef} className="hero-details-panel" role="dialog" aria-modal="false" aria-labelledby="hero-details-title">
      <header className="hero-details-heading">
        <span>HERO DETAILS</span>
        <button ref={closeButtonRef} type="button" className="card-info-close hero-details-close" onClick={() => onClose()} aria-label={`Close ${hero.name} details`}>×</button>
      </header>
      <div className="hero-details-profile">
        <div className="hero-details-art" role="img" aria-label={`${hero.name} portrait`} data-hero-id={hero.id}><HeroPortrait hero={hero} /></div>
        <div className="hero-details-identity">
          <h2 id="hero-details-title">{hero.name}</h2>
          <span>{hero.faction}</span>
          <strong>HP {currentHp ?? "—"}/{maximumHp ?? hero.hp}</strong>
        </div>
      </div>
      {/* The scrollable skills region needs keyboard focus to expose long descriptions. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="hero-details-skills" role="region" aria-label={`${hero.name} skills and descriptions`} tabIndex={0}>
        {skills.map((skill) => <section className="hero-details-skill" key={skill.name}>
          <h3>{skill.name}</h3>
          <p>{skill.description}</p>
        </section>)}
      </div>
    </section>
  </div>;
}

function heroName(id?: string | null) { return id ? id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") : "Unknown"; }
function heroSkillNames(hero: Pick<Hero, "id" | "skills">) { return hero.skills?.map((skill) => skill.name) ?? [heroSkillName(hero.id) ?? "Hero"]; }
function heroSkillName(id?: string | null) { return id ? HEROES.find((hero) => hero.id === id)?.skills[0]?.name ?? null : null; }
function conciseActionLabel(label: string) {
  return ({ "Play Attack": "Attack", "Play Dodge": "Dodge", "Play Negation": "Negate", "Use Serpent Spear": "Spear" } as Record<string, string>)[label] ?? label;
}
function heroDefinition(id?: string | null): Hero | null {
  const hero = HEROES.find((candidate) => candidate.id === id);
  return hero ? { id: hero.id, name: hero.name, faction: hero.faction, hp: hero.hp, ability: hero.ability, skills: hero.skills, skill: heroSkillName(hero.id) ?? undefined } : null;
}

type OpponentPlayerCardProps = {
  totalPlayers: number;
  player: Player;
  viewerId: string;
  playerHero: Hero | null;
  relativeIndex: number;
  isTurn: boolean;
  isSelectedTarget: boolean;
  isGroupPreview: boolean;
  interactionRoles: InteractionSeatSemanticRoles;
  targetSelectionActive: boolean;
  targetablePlayer: boolean;
  daqiaoDeflectionTargetMode: boolean;
  testViewerController: boolean;
  onTarget: () => void;
  onInspect: () => void;
  onSwitchTestViewer: (playerId: string) => void;
  judgementInFlight: ReadonlySet<string>;
  serpentSelected: string[];
  triggerResponse: boolean;
  triggerSelectionUsesCards: boolean;
  responseDecisionReady: boolean;
  triggerCardOption: TriggerOptionView | null;
  onToggleEquipment: (cardId: string) => void;
};

export function projectSideColumnSeat(totalPlayers: number, relativeIndex: number): { side: "left" | "right"; row: number; rowCount: number } | null {
  if (!Number.isInteger(totalPlayers) || !Number.isInteger(relativeIndex) || totalPlayers < 5 || totalPlayers > 10 || relativeIndex < 1 || relativeIndex >= totalPlayers) return null;
  const opponentCount = totalPlayers - 1;
  const rightCount = Math.ceil(opponentCount / 2);
  const leftCount = opponentCount - rightCount;
  return relativeIndex <= rightCount
    ? { side: "right", row: rightCount - relativeIndex + 1, rowCount: rightCount }
    : { side: "left", row: leftCount - (relativeIndex - rightCount) + 1, rowCount: rightCount };
}

function OpponentEquipmentGlyph({ slot }: { slot: LocalEquipmentSlot }) {
  if (slot === "weapon") return <svg viewBox="0 0 14 14" aria-hidden="true"><path d="m12.8 1.2-2.7.7-1.6 1.6 1.2 1.2-4.8 4.8-1.2-1.2-2.5 2.5 2.5 2.5 2.5-2.5L5 9.6l4.8-4.8L11 6l1.6-1.6.2-3.2Z" /></svg>;
  if (slot === "armor") return <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.2 12.2 3v3.8c0 2.8-2.4 4.9-5.2 6.4C4.2 11.7 1.8 9.6 1.8 6.8V3L7 1.2Z" /><path d="M4.5 4.2v3.2c0 1.2 1 2.2 2.5 3 1.5-.8 2.5-1.8 2.5-3V4.2" /></svg>;
  return <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1.2 11.7h11.4l-1-2.2.3-2-1.3-2-1.8-.5L7.4 7H5.1L3.8 4.2l-1.6.4.8 2.9-1.2 1.7Z" /><path d="M4 11.6v1.2m5.8-1.2v1.2" /></svg>;
}

function OpponentPlayerCard({ totalPlayers, player, playerHero, relativeIndex, isTurn, isSelectedTarget, isGroupPreview, interactionRoles, targetSelectionActive, targetablePlayer, daqiaoDeflectionTargetMode, testViewerController, onTarget, onInspect, onSwitchTestViewer, judgementInFlight }: OpponentPlayerCardProps) {
  const sideColumnSeat = projectSideColumnSeat(totalPlayers, relativeIndex);
  const equipmentBySlot = new Map<LocalEquipmentSlot, Card>();
  for (const equipment of player.equipmentCards) {
    const slot = cardDefinition(equipment.kind).equipmentSlot;
    if (slot) equipmentBySlot.set(slot, equipment);
  }
  const equipmentSummary = LOCAL_EQUIPMENT_SLOTS.flatMap(({ key, label }) => {
    const equipment = equipmentBySlot.get(key);
    return equipment ? [<span className="opponent-equipment-indicator" data-slot={key} data-equipment-id={equipment.id} data-card-kind={equipment.kind} role="img" aria-label={`${label} equipped: ${cardDefinition(equipment.kind).name}`} title={`${label}: ${cardDefinition(equipment.kind).name}`} key={key}><OpponentEquipmentGlyph slot={key} /></span>] : [];
  });
  const miniJudgement = player.judgementCards.map((judgement) => <span className="mini-zone-card judgement-mini" data-judgement-id={judgement.id} key={judgement.id} style={{ visibility: judgementInFlight.has(judgement.id) ? "hidden" : "visible" }}>
    <span><small>{judgement.rank}{judgement.suit}</small><b>{cardDefinition(judgement.kind).name}</b></span>
    <button type="button" className="zone-info-button" aria-label={`Inspect ${player.name} to explain ${cardDefinition(judgement.kind).name}`} onClick={(event) => { event.stopPropagation(); onInspect(); }}>i</button>
  </span>);
  const targetButtonDisabled = targetSelectionActive && (!targetablePlayer || !player.alive);
  const deflectionTargetSelectable = daqiaoDeflectionTargetMode && targetSelectionActive && targetablePlayer && player.alive;
  const targetButtonLabel = daqiaoDeflectionTargetMode && targetSelectionActive
    ? deflectionTargetSelectable
      ? `${isSelectedTarget ? "Deselect" : "Select"} ${player.name} as Deflection target`
      : `${player.name}, not an eligible Deflection target`
    : `${targetSelectionActive ? "Select" : "Inspect"} ${player.name}`;
  const interactionRoleNames = Object.entries(interactionRoles).filter(([, active]) => active).map(([role]) => role.replace(/^is/, "").replace(/([A-Z])/g, "-$1").toLowerCase()).join(" ");
  return <article className={`player-square opponent-player-card player-square-${relativeIndex} ${isTurn ? "turn-square" : ""} ${isSelectedTarget ? "selected-target" : ""} ${targetSelectionActive && targetablePlayer && player.alive ? "targetable-target" : ""} ${isGroupPreview ? "local-group-preview" : ""} ${interactionRoles.isInteractionSource ? "interaction-seat-source" : ""} ${interactionRoles.isOriginalTarget ? "interaction-seat-original-target" : ""} ${interactionRoles.isActiveTarget ? "interaction-seat-active-target" : ""} ${interactionRoles.isCurrentParticipant ? "interaction-seat-current-participant" : ""} ${interactionRoles.isDecisionActor ? "interaction-seat-decision-actor" : ""} ${interactionRoles.isActiveResolver ? "interaction-seat-active-resolver" : ""} ${interactionRoles.isViewerDecisionActor ? "interaction-seat-viewer-decision" : ""} ${!player.alive ? "defeated-square" : ""}`} data-side-column={sideColumnSeat?.side} data-side-row={sideColumnSeat?.row} style={sideColumnSeat ? { gridRow: sideColumnSeat.row } : undefined} data-player-anchor={player.id} data-target-selectable={targetSelectionActive && targetablePlayer && player.alive ? "true" : undefined} data-deflection-targetable={deflectionTargetSelectable ? "true" : undefined} data-local-group-preview={isGroupPreview ? "true" : undefined} data-interaction-roles={interactionRoleNames || undefined} data-interaction-source={interactionRoles.isInteractionSource ? "true" : undefined} data-interaction-original-target={interactionRoles.isOriginalTarget ? "true" : undefined} data-interaction-active-target={interactionRoles.isActiveTarget ? "true" : undefined} data-interaction-current-participant={interactionRoles.isCurrentParticipant ? "true" : undefined} data-interaction-decision-actor={interactionRoles.isDecisionActor ? "true" : undefined} data-interaction-active-resolver={interactionRoles.isActiveResolver ? "true" : undefined} data-interaction-viewer-decision={interactionRoles.isViewerDecisionActor ? "true" : undefined}>
    <div className="opponent-public-zones">
      <div className="player-hero-card opponent-hero-card">
        <button type="button" className="player-square-target opponent-hero-target" disabled={targetButtonDisabled} aria-label={targetButtonLabel} onClick={targetSelectionActive ? onTarget : onInspect}>
          {playerHero && <span className="player-square-portrait opponent-hero-portrait" data-hero-id={playerHero.id}><HeroPortrait hero={playerHero} /></span>}
        </button>
        <div className="opponent-hero-overlay">
          {targetSelectionActive
            ? <button type="button" className="opponent-hero-name opponent-hero-inspect-name" aria-label={`Inspect ${player.name}`} title={playerHero?.name ?? heroName(player.hero)} onClick={(event) => { event.stopPropagation(); onInspect(); }}>{playerHero?.name ?? heroName(player.hero)}</button>
            : <span className="opponent-hero-name" title={playerHero?.name ?? heroName(player.hero)}>{playerHero?.name ?? heroName(player.hero)}</span>}
          <span className="player-hp opponent-hp-badge">HP {player.hp ?? 0}/{player.maxHp ?? 0}</span>
          <span className="player-hearts">{hpDisplay(player.hp)}</span>
        </div>
        {playerHero && (player.isTestPlayer || player.isHost) && testViewerController && <button type="button" className="test-view-switch-button" data-testid={`test-view-switch-${player.id}`} data-test-viewer-id={player.id} aria-label={`Switch to ${player.name}`} title={`Switch to ${player.name}`} onClick={(event) => { event.stopPropagation(); onSwitchTestViewer(player.id); }}>SWITCH</button>}
      </div>
      <div className="opponent-player-name-strip">
        <span className="opponent-player-name" aria-label={player.name} title={player.name}>{player.name}</span>
      </div>
      <div className="opponent-equipment-summary" role="group" aria-label="Public Equipment" data-slot-count={equipmentSummary.length}>{equipmentSummary}</div>
      {player.judgementCards.length > 0 && <section className="opponent-judgement-zone" aria-label="Judgement Zone">
        <span className="opponent-zone-label">Judgement</span>
        <div className="opponent-judgement-cards">{miniJudgement}</div>
      </section>}
    </div>
  </article>;
}

function phaseName(phase?: string | null) { return phase?.startsWith("draw") ? "Draw Phase" : phase?.startsWith("play") ? "Play Phase" : phase === "discard" ? "Discard Phase" : phase === "response" ? "Response" : phase === "dying" ? "Dying Rescue" : phase === "resolving" ? "Resolving" : phase === "finished" ? "Finished" : ""; }

export function presentationViewKey(view: PresentationClientView) {
  return JSON.stringify([
    view.hasInteraction,
    view.interactionId,
    view.checkpointId,
    view.presentationRevision,
    view.rootFrameId,
    view.activeFrameId,
    view.parentFrameId,
    view.stage,
    view.stableKind,
    view.effect,
    view.sourceId,
    view.originalTargetIds,
    view.activeTargetIds,
    view.currentParticipantId,
    view.decisionActorId,
    view.activeResolverId,
    view.continuity.relation,
    // Root proof can advance while the Stage envelope stays unchanged. Treat
    // it as a new presentation so a submitted local target preview cannot
    // keep blocking the authoritative root composition.
    view.rootAction?.rootEventId ?? null,
  ]);
}

function currentActionViewKey(action: CurrentAction | null) {
  return JSON.stringify(action);
}

type TargetCardSelection = Extract<NonNullable<TriggerOptionView["selection"]>, { type: "target_cards" }>;
type PublicTargetCardSelection = Pick<TargetCardSelection, "targetId" | "min" | "max" | "eligibleKeys">;

function supportsAuthoritativeTargetCardSelection(selection: PublicTargetCardSelection, target: Player) {
  if (!target.alive || !Number.isInteger(target.handCount) || target.handCount < 0 || selection.min < 1 || selection.max < selection.min) return false;
  if (new Set(selection.eligibleKeys).size !== selection.eligibleKeys.length || selection.eligibleKeys.length < selection.min) return false;
  const publicIds = new Set([...target.equipmentCards, ...target.judgementCards].map((card) => card.id));
  const hasRandomHandZone = selection.eligibleKeys.includes("hand");
  const hasPositionedHandCards = selection.eligibleKeys.some((key) => /^hand:\d+$/.test(key));
  if (hasRandomHandZone && hasPositionedHandCards) return false;
  const handPositions = new Set<number>();
  return selection.eligibleKeys.every((key) => {
    if (key === "hand") return target.handCount > 0;
    const handPosition = /^hand:(0|[1-9]\d*)$/.exec(key);
    if (handPosition) {
      const index = Number(handPosition[1]);
      if (index >= target.handCount || handPositions.has(index)) return false;
      handPositions.add(index);
      return true;
    }
    return publicIds.has(key);
  });
}

function targetCardActionName(cardKind: "Dismantle" | "Steal") {
  return cardKind === "Dismantle" ? "Burning Bridge" : "Steal";
}

function supportsLocalEquipmentTargetSelection(selection: PublicTargetCardSelection, target: Player) {
  if (!target.alive || !Number.isInteger(selection.min) || !Number.isInteger(selection.max) || selection.min < 1 || selection.max < selection.min || selection.max > selection.eligibleKeys.length) return false;
  if (new Set(selection.eligibleKeys).size !== selection.eligibleKeys.length) return false;
  const equipmentIds = new Set(target.equipmentCards.map((card) => card.id));
  return selection.eligibleKeys.length >= selection.min && selection.eligibleKeys.every((key) => equipmentIds.has(key));
}

function OpponentPublicInspector({ player, judgementInFlight, onClose, nestedCardDetailDismissRef }: { player: LocalOpponentInspectionPresentation; judgementInFlight?: ReadonlySet<string>; onClose?: () => void; nestedCardDetailDismissRef?: InspectorCardDetailDismissRef }) {
  const [expandedSkillName, setExpandedSkillName] = useState<string | null>(null);
  const [selectedCardDetail, setSelectedCardDetail] = useState<Card | null>(null);
  const [skillDescriptionScrollable, setSkillDescriptionScrollable] = useState(false);
  const skillDescriptionRef = useRef<HTMLParagraphElement>(null);
  const cardRulesRef = useRef<HTMLParagraphElement>(null);
  const inspectDetailsRef = useRef<HTMLDivElement>(null);
  const cardDetailRef = useRef<Card | null>(null);
  const lastCardTriggerRef = useRef<HTMLButtonElement | null>(null);
  const priorSkillScrollTopRef = useRef(0);
  const priorDetailsScrollTopRef = useRef(0);
  const restoreSkillContextOnCloseRef = useRef(false);
  const previousCardDetailRef = useRef<Card | null>(null);
  const hero = player.hero;
  const skills = hero?.skills ?? [];
  const expandedSkill = skills.find((skill) => skill.name === expandedSkillName) ?? null;
  const baseId = `opponent-inspect-${player.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const detailsId = `${baseId}-details`;
  const selectedDetailKey = selectedCardDetail ? `card:${selectedCardDetail.id}` : expandedSkill ? `skill:${expandedSkill.name}` : null;
  const previousDetailKeyRef = useRef(selectedDetailKey);
  const openCardDetail = useCallback((card: Card, trigger: HTMLButtonElement) => {
    if (!cardDetailRef.current) {
      priorSkillScrollTopRef.current = skillDescriptionRef.current?.scrollTop ?? 0;
      priorDetailsScrollTopRef.current = inspectDetailsRef.current?.scrollTop ?? 0;
      restoreSkillContextOnCloseRef.current = true;
    }
    lastCardTriggerRef.current = trigger;
    cardDetailRef.current = card;
    setSelectedCardDetail(card);
  }, []);
  const closeCardDetail = useCallback(() => {
    if (!cardDetailRef.current) return false;
    cardDetailRef.current = null;
    restoreSkillContextOnCloseRef.current = true;
    setSelectedCardDetail(null);
    return true;
  }, []);
  const updateSkillDescriptionScrollable = useCallback(() => {
    const description = skillDescriptionRef.current;
    const scrollable = Boolean(description && description.scrollHeight > description.clientHeight + 1);
    setSkillDescriptionScrollable((current) => current === scrollable ? current : scrollable);
  }, []);
  useEffect(() => {
    if (!nestedCardDetailDismissRef) return;
    nestedCardDetailDismissRef.current = closeCardDetail;
    return () => {
      if (nestedCardDetailDismissRef.current === closeCardDetail) nestedCardDetailDismissRef.current = null;
    };
  }, [closeCardDetail, nestedCardDetailDismissRef]);
  useLayoutEffect(() => {
    const wasOpen = previousCardDetailRef.current !== null;
    previousCardDetailRef.current = selectedCardDetail;
    if (wasOpen && !selectedCardDetail && restoreSkillContextOnCloseRef.current) {
      restoreSkillContextOnCloseRef.current = false;
      previousDetailKeyRef.current = selectedDetailKey;
      if (expandedSkillName) {
        if (inspectDetailsRef.current) inspectDetailsRef.current.scrollTop = priorDetailsScrollTopRef.current;
        if (skillDescriptionRef.current) skillDescriptionRef.current.scrollTop = priorSkillScrollTopRef.current;
      }
      const trigger = lastCardTriggerRef.current;
      lastCardTriggerRef.current = null;
      trigger?.focus({ preventScroll: true });
      return;
    }
    if (previousDetailKeyRef.current !== selectedDetailKey) {
      previousDetailKeyRef.current = selectedDetailKey;
      if (inspectDetailsRef.current) inspectDetailsRef.current.scrollTop = 0;
      if (skillDescriptionRef.current) skillDescriptionRef.current.scrollTop = 0;
      if (cardRulesRef.current) cardRulesRef.current.scrollTop = 0;
    }
  }, [expandedSkillName, selectedCardDetail, selectedDetailKey]);
  useEffect(() => {
    const description = skillDescriptionRef.current;
    if (!description) return;
    const observer = new ResizeObserver(updateSkillDescriptionScrollable);
    observer.observe(description);
    if (description.parentElement) observer.observe(description.parentElement);
    const frame = requestAnimationFrame(updateSkillDescriptionScrollable);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [expandedSkill?.name, expandedSkill?.description, selectedCardDetail, updateSkillDescriptionScrollable]);
  const renderInspectionCard = (card: Card, { hidden = false, equipmentMiniature = false }: { hidden?: boolean; equipmentMiniature?: boolean } = {}) => {
    const selected = selectedCardDetail?.id === card.id;
    return <button key={card.id} type="button" className={`opponent-inspection-card${equipmentMiniature ? " opponent-inspection-equipment-card" : ""}`} style={{ visibility: hidden ? "hidden" : "visible" }} aria-label={`Explain ${cardDefinition(card.kind).name}`} aria-controls={detailsId} aria-pressed={selected} onClick={(event) => { event.stopPropagation(); openCardDetail(card, event.currentTarget); }}><CardFace card={card} /></button>;
  };
  return <section key={player.id} className="hero-focus hero-focus-inspect opponent-inspection-panel" role="dialog" aria-label={`${player.name} opponent inspection`} data-hero-focus-mode="INSPECT" data-inspect-player-id={player.id}>
    <div className="hero-focus-heading"><strong>{`INSPECT · ${player.name}`}</strong><button type="button" className="hero-focus-inspect-close" aria-label={`Close ${player.name} inspection`} onClick={onClose}>×</button></div>
    <div className="hero-focus-body">
      <span className={hero ? "hero-focus-portrait" : "hero-focus-portrait hero-focus-portrait-empty"} data-hero-id={hero?.id}>{hero ? <HeroPortrait hero={hero} /> : "?"}</span>
      <div className="hero-focus-identity">
        <div className="hero-focus-inspect-profile">
          <div className="hero-focus-identity-line">
            <span className="hero-focus-identity-hero">{hero?.name ?? "Unknown Hero"}</span>
            <div className="hero-focus-identity-stats"><small>HP {player.hp ?? "?"}/{player.maxHp ?? "?"}</small><small data-public-hand-count={player.handCount}>Hand · {player.handCount}</small></div>
          </div>
          <section className="opponent-inspection-zone hero-focus-inspect-public-skills" aria-label="Public Skills">
            <h3>Public Skills</h3>
            <div className="hero-focus-inspect-skills">{skills.length ? skills.map((skill) => {
              const expanded = expandedSkillName === skill.name && !selectedCardDetail;
              return <button type="button" className="hero-focus-inspect-skill" key={skill.name} aria-label={`Show ${skill.name} description`} aria-expanded={expanded} aria-pressed={expanded} aria-controls={detailsId} onClick={() => {
                setSkillDescriptionScrollable(false);
                if (cardDetailRef.current) {
                  cardDetailRef.current = null;
                  setSelectedCardDetail(null);
                  restoreSkillContextOnCloseRef.current = false;
                  lastCardTriggerRef.current = null;
                  setExpandedSkillName(skill.name);
                  return;
                }
                setExpandedSkillName(skill.name);
              }}>{skill.name}</button>;
            }) : <span className="opponent-inspection-empty">None</span>}</div>
          </section>
        </div>
        <div className="hero-focus-inspect-public-zones">
          <section className="opponent-inspection-zone" aria-label="Equipment"><h3>Equipment</h3><div className="opponent-inspection-card-row">{player.equipmentCards.length ? player.equipmentCards.map((card) => renderInspectionCard(card, { equipmentMiniature: true })) : <span className="opponent-inspection-empty">None</span>}</div></section>
          <section className="opponent-inspection-zone" aria-label="Judgement Zone"><h3>Judgement Zone</h3><div className="opponent-inspection-card-row">{player.judgementCards.length ? player.judgementCards.map((card) => renderInspectionCard(card, { hidden: judgementInFlight?.has(card.id) })) : <span className="opponent-inspection-empty">None</span>}</div></section>
        </div>
      </div>
    </div>
    <div ref={inspectDetailsRef} id={detailsId} className="hero-focus-inspect-details hero-focus-context">
      {selectedCardDetail ? (() => {
        const definition = cardDefinition(selectedCardDetail.kind);
        return <section className="hero-focus-inspect-card-detail" data-inspector-card-detail="true" aria-label={`${definition.name} public card explanation`}>
          <small className="hero-focus-inspect-detail-kicker">PUBLIC CARD DETAILS</small>
          <small className="hero-focus-inspect-card-metadata">{selectedCardDetail.rank}{selectedCardDetail.suit} · {definition.category.toUpperCase()} CARD</small>
          <h4 className="hero-focus-inspect-card-name">{definition.name}</h4>
          <p ref={cardRulesRef} className="hero-focus-inspect-card-rules">{definition.rules}</p>
        </section>;
      })() : expandedSkill && <>
        <section className="hero-focus-inspect-skill-detail" aria-label={`${expandedSkill.name} skill details`}>
          <small className="hero-focus-inspect-detail-kicker">HERO SKILL</small>
          <h4 className="hero-focus-inspect-skill-name">{expandedSkill.name}</h4>
          {skillDescriptionScrollable && <small className="hero-focus-inspect-scroll-hint" aria-hidden="true">Scroll to read the full skill</small>}
          <p ref={skillDescriptionRef} className="hero-focus-inspect-skill-description" id={`${baseId}-skill-${expandedSkill.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`} role="region" aria-label={`${expandedSkill.name} description`}>{expandedSkill.description}</p>
        </section>
      </>}
    </div>
  </section>;
}

export function InteractionStage({
  view,
  transitionKind = "NONE",
  resolvePlayerName,
  inspectPlayer = null,
  judgementInFlight,
  onCloseInspect,
  nestedCardDetailDismissRef,
}: {
  view: PresentationClientView;
  transitionKind?: PresentationTransitionKind;
  resolvePlayerName: (playerId: string) => string | null | undefined;
  inspectPlayer?: LocalOpponentInspectionPresentation | null;
  judgementInFlight?: ReadonlySet<string>;
  onCloseInspect?: () => void;
  nestedCardDetailDismissRef?: InspectorCardDetailDismissRef;
}) {
  if (inspectPlayer) {
    return <section className="interaction-stage interaction-stage-inspect-only" data-local-ui-mode="INSPECT" data-local-inspect-player-id={inspectPlayer.id}>
      <div className="opponent-inspection-layer">
        <div className="opponent-inspection-backdrop" aria-hidden="true" />
        <div className="opponent-inspection-floating-shell">
        <OpponentPublicInspector key={inspectPlayer.id} player={inspectPlayer} judgementInFlight={judgementInFlight} onClose={onCloseInspect} nestedCardDetailDismissRef={nestedCardDetailDismissRef} />
        </div>
      </div>
    </section>;
  }

  const stage = buildInteractionStageView(view, resolvePlayerName);
  const dyingHandoff = buildDyingHandoffView(stage);
  if (!dyingHandoff.visible) return null;
  return <section
    className="interaction-stage interaction-stage-dying"
    aria-label="Dying rescue handoff"
    data-interaction-id={stage.interactionId ?? undefined}
    data-checkpoint-id={stage.checkpointId ?? undefined}
    data-presentation-revision={stage.presentationRevision ?? undefined}
    data-stage="DYING"
    data-continuity={dyingHandoff.continuity.relation}
    data-parent-frame-id={dyingHandoff.parentFrameId ?? undefined}
    data-presentation-transition={transitionKind}
  >
    <p className="dying-handoff-compact" data-dying-handoff="proven" data-dying-player-id={dyingHandoff.dyingPlayer.id ?? undefined} data-dying-decision-actor-id={dyingHandoff.decisionActor.id ?? undefined} data-dying-resolver-id={dyingHandoff.activeResolver.id ?? undefined} data-dying-continuity={dyingHandoff.continuity.relation} data-dying-parent-frame-id={dyingHandoff.parentFrameId ?? undefined}>
      <strong>{dyingHandoff.dyingPlayer.name}</strong>
      <span>{dyingHandoff.statusLabel}</span>
      {dyingHandoff.decisionActor.id && <small>{dyingHandoff.decisionActor.name} decides</small>}
      <small>{dyingHandoff.guidance}</small>
    </p>
  </section>;
}

function createPresentationTransitionStore(initialView: PresentationClientView) {
  let previousView: PresentationClientView | null = null;
  let snapshot = buildPresentationTransition(null, initialView);
  const listeners = new Set<() => void>();
  return {
    accept(nextView: PresentationClientView) {
      if (nextView === previousView) return;
      snapshot = buildPresentationTransition(previousView, nextView);
      previousView = nextView;
      listeners.forEach((listener) => listener());
    },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export type DecisionPresentation = {
  phaseLabel: string;
  turnOwner: string;
  actionOwner: string;
  primaryStatus: string;
  supportingInstruction: string;
  isViewerRequiredActor: boolean;
  isWaiting: boolean;
  isResolving: boolean;
  isDecision: boolean;
  interaction?: {
    stage: PresentationClientView["stage"];
    sourceId: string | null;
    currentParticipantId: string | null;
    decisionActorId: string | null;
    activeResolverId: string | null;
    stableKind: PresentationClientView["stableKind"];
    isLocalDecisionActor: boolean;
    hasLocalControl: boolean;
  };
};

function projectedPlayerName(room: Pick<Room, "players">, playerId: string | null | undefined, fallback: string) {
  return room.players.find((player) => player.id === playerId)?.name ?? fallback;
}

function decisionLabel(action: CurrentAction, reason: string) {
  if (action.kind === "dying" || action.requirement === "peach") return "Play Peach";
  if (action.kind === "target_card") return "Choose a target card";
  if (action.kind === "borrowed_sword") return "Choose a target";
  if (action.kind === "deck_reorder") return "Reorder the deck";
  if (action.kind === "card_distribution") return "Assign the cards";
  if (action.kind === "trigger") {
    const labels = action.triggerOptions?.map((option) => option.label).filter(Boolean) ?? [];
    return labels.length === 1 ? labels[0] : "Choose an optional ability";
  }
  if (action.requirement === "dodge") return "Dodge the Attack";
  if (action.requirement === "attack") return "Play Attack";
  if (action.requirement === "negate") return "Play Negation";
  if (action.kind === "response") return "Choose a response";
  return reason || "Choose an action";
}

function decisionInstruction(action: CurrentAction, reason: string) {
  if (action.kind === "trigger") {
    const option = action.triggerOptions?.[0];
    if (option) return `Your action · Use ${option.label}${option.description ? `: ${option.description.replace(/[.!?]\s*$/, "")}` : ""}${action.declineAction === "decline_trigger" || action.legalActions.includes("decline_trigger") ? ", or skip" : ""}`;
  }
  return reason || "Make the required choice.";
}

function presentationStageLabel(stage: PresentationClientView["stage"]) {
  if (!stage) return "Active interaction";
  return stage.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ");
}

function buildPresentationDecisionPresentation(
  room: Pick<Room, "players" | "turnSeat" | "phase" | "status">,
  view: PresentationClientView,
): DecisionPresentation {
  const semantic = buildPresentationDecisionStatus(view);
  const turnOwner = projectedPlayerName(room, room.players.find((player) => player.seat === room.turnSeat)?.id, "The current player");
  const phaseLabel = phaseName(room.phase) || "Game state";
  const actionOwner = semantic.decisionActorId
    ? projectedPlayerName(room, semantic.decisionActorId, "the decision actor")
    : "the active interaction";
  const stageLabel = presentationStageLabel(semantic.stage);
  const currentParticipant = projectedPlayerName(room, semantic.currentParticipantId, "the current participant");
  const isWaiting = semantic.isDecision && !semantic.isLocalDecisionActor;
  const interaction = {
    stage: semantic.stage,
    sourceId: semantic.sourceId,
    currentParticipantId: semantic.currentParticipantId,
    decisionActorId: semantic.decisionActorId,
    activeResolverId: semantic.activeResolverId,
    stableKind: semantic.stableKind,
    isLocalDecisionActor: semantic.isLocalDecisionActor,
    hasLocalControl: semantic.hasLocalControl,
  };
  if (room.status === "finished") {
    return { phaseLabel, turnOwner, actionOwner, primaryStatus: "The match has ended", supportingInstruction: "", isViewerRequiredActor: false, isWaiting: false, isResolving: false, isDecision: false, interaction };
  }
  if (semantic.isDecision && semantic.isLocalDecisionActor) {
    return { phaseLabel, turnOwner, actionOwner, primaryStatus: stageLabel, supportingInstruction: `${stageLabel} · ${currentParticipant}`, isViewerRequiredActor: true, isWaiting: false, isResolving: false, isDecision: true, interaction };
  }
  if (isWaiting) {
    return { phaseLabel, turnOwner, actionOwner, primaryStatus: `WAITING FOR ${actionOwner.toUpperCase()}`, supportingInstruction: `${stageLabel} · ${currentParticipant}`, isViewerRequiredActor: false, isWaiting: true, isResolving: false, isDecision: true, interaction };
  }
  return { phaseLabel, turnOwner, actionOwner, primaryStatus: stageLabel, supportingInstruction: stageLabel, isViewerRequiredActor: false, isWaiting: false, isResolving: false, isDecision: false, interaction };
}

/**
 * Translate the authoritative room projection into presentation copy only.
 * This deliberately does not inspect cards, heroes, or client selections to
 * decide legality; controls continue to use the projected capabilities below.
 */
export function buildDecisionPresentation(room: Pick<Room, "players" | "meId" | "turnSeat" | "phase" | "status" | "actionPlayerId" | "actionReason" | "isMyAction" | "currentAction">, presentationView?: PresentationClientView): DecisionPresentation {
  if (presentationView?.hasInteraction) return buildPresentationDecisionPresentation(room, presentationView);
  const turnOwner = projectedPlayerName(room, room.players.find((player) => player.seat === room.turnSeat)?.id, "The current player");
  const action = room.currentAction;
  const actionOwner = projectedPlayerName(room, room.actionPlayerId ?? action?.actorId, "the acting player");
  const phaseLabel = phaseName(room.phase) || "Game state";
  const isResolving = room.phase === "resolving" || action?.kind === "none";
  const isDecision = Boolean(action && action.kind !== "turn" && action.kind !== "none" && action.actorId);
  const isViewerRequiredActor = Boolean(action && room.isMyAction && isDecision);
  const isWaiting = Boolean(isDecision && !isViewerRequiredActor);
  const reason = action?.reason || room.actionReason || "";

  if (room.status === "finished") {
    return { phaseLabel, turnOwner, actionOwner, primaryStatus: "The match has ended", supportingInstruction: "", isViewerRequiredActor: false, isWaiting: false, isResolving: false, isDecision: false };
  }
  if (isResolving) {
    return { phaseLabel, turnOwner, actionOwner, primaryStatus: "Resolving", supportingInstruction: reason || "The game is applying the current result.", isViewerRequiredActor: false, isWaiting: true, isResolving: true, isDecision: false };
  }
  if (isDecision && isViewerRequiredActor) {
    return { phaseLabel, turnOwner, actionOwner, primaryStatus: decisionLabel(action!, reason), supportingInstruction: decisionInstruction(action!, reason), isViewerRequiredActor: true, isWaiting: false, isResolving: false, isDecision: true };
  }
  if (isWaiting) {
    return { phaseLabel, turnOwner, actionOwner, primaryStatus: `WAITING FOR ${actionOwner.toUpperCase()}`, supportingInstruction: reason || "The current decision belongs to that player.", isViewerRequiredActor: false, isWaiting: true, isResolving: false, isDecision: true };
  }
  return { phaseLabel, turnOwner, actionOwner, primaryStatus: `${turnOwner}'s turn`, supportingInstruction: phaseLabel, isViewerRequiredActor: false, isWaiting: false, isResolving: false, isDecision: false };
}

function pendingKind(room: Room) { return room.pending?.kind ?? null; }

export class GameRoomErrorBoundary extends Component<{ room: Room; onRecover: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    const viewer = this.props.room.players.find((player) => player.id === this.props.room.meId);
    const action = this.props.room.currentAction;
    console.error("[GameRoom render failure]", {
      status: this.props.room.status,
      phase: this.props.room.phase,
      actionRevision: this.props.room.actionRevision ?? null,
      currentAction: {
        kind: action?.kind ?? null,
        requirement: action?.requirement ?? null,
        triggerEvent: action?.triggerEvent ?? null,
        actorId: action?.actorId ?? null,
      },
      heroId: viewer?.hero ?? null,
      activeSkillProviderIds: action?.triggerOptions?.map((option) => option.effectId) ?? [],
      pendingKind: pendingKind(this.props.room),
      error: { name: error.name, message: error.message, stack: error.stack ?? "" },
      componentStack: info.componentStack ?? "",
    });
    this.setState({ failed: true });
  }

  recover = () => {
    localStorage.removeItem("three-realms-session");
    this.props.onRecover();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="landing-shell"><section className="entry-card recovery-card"><span className="eyebrow">GAME SCREEN ERROR</span><h1>The game screen encountered an error.</h1><p>Your room is protected. Start a new game to continue.</p><button className="gold-button" onClick={this.recover}>Start a new game</button></section></main>;
  }
}

function Countdown({ durationMs, deadline = 0, visibleAt = 0, label = "Continuing in", responseTimer = false, compactEvent = false }: { durationMs: number; deadline?: number; visibleAt?: number; label?: string; responseTimer?: boolean; compactEvent?: boolean }) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [visible, setVisible] = useState(visibleAt === 0);
  useEffect(() => {
    const endAt = deadline > 0 ? deadline : Date.now() + durationMs;
    const update = () => { const now = Date.now(); setRemainingMs(Math.max(0, endAt - now)); setVisible(now >= visibleAt); };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [deadline, durationMs, visibleAt]);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const urgency = remainingSeconds <= 5 ? "critical" : remainingSeconds <= 10 ? "urgent" : "calm";
  const countdownLabel = responseTimer ? "Response Time" : label;
  if (!visible) return null;
  return <div className={`visible-countdown ${responseTimer ? "visible-countdown-response" : ""} ${compactEvent ? "visible-countdown-event" : ""}`} role={responseTimer || compactEvent ? "timer" : undefined} aria-label={`${countdownLabel} ${remainingSeconds} seconds`} data-countdown-urgency={responseTimer || compactEvent ? urgency : undefined}>
    {responseTimer ? <i className="countdown-hourglass" aria-hidden="true">⌛</i> : compactEvent ? null : <span>{countdownLabel}</span>}
    <b>{remainingSeconds}s</b>
  </div>;
}

function GameSystemMenu({ onLeave, messages, messagesCollapsed, onToggleMessages }: {
  onLeave: () => void;
  messages: readonly { id: string; message: string }[];
  messagesCollapsed: boolean;
  onToggleMessages: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [traceNotice, setTraceNotice] = useState("");
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmExit = () => {
    if (window.confirm("Exit this game?")) onLeave();
    else menuButtonRef.current?.focus();
  };
  const closeMenuOnEscape = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  };
  const downloadTrace = () => {
    const blob = new Blob([exportAttackDodgeUxTrace()], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `wtk-game-ux-trace-${new Date().toISOString().replaceAll(":", "-")}.json`;
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    setTraceNotice("Complete game UX trace downloaded to this device.");
  };

  return <div className="stage-system-menu" data-system-menu-placement="guidance">
    <div id="stage-system-menu-actions" className="stage-system-menu-actions" role="group" aria-label="System menu actions" hidden={!menuOpen}>
      <small className="stage-system-build-sha" data-build-sha={BUILD_SHA}><span>BUILD {BUILD_LABEL}</span><code>GitHub Actions SHA · {BUILD_SHA}</code></small>
      <aside className={`game-messages ${messagesCollapsed ? "collapsed" : ""}`} aria-label="Game Messages">
        <header><button type="button" className="stage-system-game-messages-toggle" onClick={onToggleMessages} aria-label={messagesCollapsed ? "Expand game messages" : "Collapse game messages"} aria-controls="stage-system-game-messages-list" aria-expanded={!messagesCollapsed}>
          <span>Game Messages</span><span aria-hidden="true">{messagesCollapsed ? "＋" : "−"}</span>
        </button></header>
        {!messagesCollapsed && <div id="stage-system-game-messages-list" className="stage-system-game-messages-list" aria-live="polite">{messages.length ? messages.map((entry, index) => <p className={index === messages.length - 1 ? "latest" : ""} key={entry.id}><span>{entry.message}</span></p>) : <p className="empty">No gameplay messages yet.</p>}</div>}
      </aside>
      <button type="button" className="stage-system-diagnostics" onClick={downloadTrace} onKeyDown={closeMenuOnEscape}>Download UX trace</button>
      {traceNotice && <small className="stage-system-diagnostics-status" role="status">{traceNotice}</small>}
      <button type="button" className="stage-system-exit" onClick={confirmExit} onKeyDown={closeMenuOnEscape}>Exit Game</button>
    </div>
    <button ref={menuButtonRef} type="button" className="stage-system-menu-trigger" aria-label="System menu" aria-expanded={menuOpen} aria-controls="stage-system-menu-actions" onClick={() => setMenuOpen((open) => !open)} onKeyDown={closeMenuOnEscape}><span aria-hidden="true">⚙︎</span></button>
  </div>;
}

function StageSystemCluster({ publicResponseTimerPending, responseTimer, eventTimer }: { publicResponseTimerPending: boolean; responseTimer?: ReactNode; eventTimer?: ReactNode }) {
  return <div className="stage-system-cluster" data-stage-system-cluster="true" data-public-response-timer-pending={publicResponseTimerPending ? "true" : undefined} role="group" aria-label="Game countdowns">
    {eventTimer}
    {responseTimer}
  </div>;
}

const LOCAL_EQUIPMENT_SLOTS = [
  { key: "weapon", label: "Weapon" },
  { key: "armor", label: "Armour" },
  { key: "defensiveHorse", label: "+1 Horse" },
  { key: "offensiveHorse", label: "-1 Horse" },
] as const;
type LocalEquipmentSlot = (typeof LOCAL_EQUIPMENT_SLOTS)[number]["key"];

type HeroSkillButtonModel = {
  name: string;
  description: string;
  enabled: boolean;
  active: boolean;
  passive?: boolean;
  onClick?: () => void;
};

type ActiveCardSkillSelection = {
  min: number;
  max: number;
  eligibleCardIds: string[];
  targetIds: string[];
  targetMin: number;
  targetMax: number;
};

// Active card skills share one client contract. Older providers, including
// Qixi, do not carry targetMin/targetMax because they always choose one
// target. Keep the intermediate activated state total: no render may depend
// on a property that is absent before the first card or target is selected.
export function normalizeActiveCardSkillSelection(selection: TriggerOptionView["selection"]): ActiveCardSkillSelection | null {
  if (selection?.type !== "cards") return null;
  const min = Number.isInteger(selection.min) ? selection.min : 1;
  const max = Number.isInteger(selection.max) ? selection.max : min;
  const targetMin = Number.isInteger(selection.targetMin) ? selection.targetMin : 1;
  const targetMax = Number.isInteger(selection.targetMax) ? selection.targetMax : targetMin;
  return {
    min,
    max,
    eligibleCardIds: Array.isArray(selection.eligibleCardIds) ? selection.eligibleCardIds : [],
    targetIds: Array.isArray(selection.targetIds) ? selection.targetIds : [],
    targetMin,
    targetMax,
  };
}

export function buildActiveSkillSubmission(effectId: string, selection: ActiveCardSkillSelection, state: ActiveSkillSelectionState) {
  const cardIds = state.cardIds.filter((id) => selection.eligibleCardIds.includes(id));
  const targetIds = state.targetIds.filter((id) => selection.targetIds.includes(id));
  const targetId = targetIds[0] ?? "";
  return { providerId: effectId, cardIds, ...(targetIds.length > 1 ? { targetIds } : targetId ? { targetId } : {}) };
}

// These are stable semantic capability IDs, not display-label matches. A
// missing entry intentionally leaves the metadata-backed skill visible but
// disabled until its existing projected capability is available.
export const HERO_SKILL_EFFECT_IDS: Record<string, Record<string, readonly string[]>> = {
  "cao-cao": { Treachery: ["cao_cao_jianxiong"], Entourage: ["cao_cao_hujia"] },
  simayi: { Retaliation: ["sima_yi_fankui"], Necromancy: ["sima_yi_guicai"] },
  "xiahou-dun": { Stauchness: ["xiahou_dun_ganglie"] },
  "zhang-liao": { Assault: ["zhang_liao_assault"] },
  "xu-chu": { "Bared Bodied": ["xu_chu_bared_bodied"] },
  "ma-chao": { Cavalry: ["ma_chao_cavalry"] },
  "guo-jia": { "Jealousy of God": ["guo_jia_jealousy_of_god"], Legacy: ["guo_jia_legacy"] },
  "zhen-ji": { "Godess of Luo River": ["zhen_ji_luoshen"] },
  "liu-bei": { Benevolence: ["liu_bei_rende"], Influencing: ["liu_bei_jijiang"] },
  "sun-quan": { Equilibrium: ["sun_quan_zhiheng"] },
  "gan-ning": { Ambushment: ["gan_ning_qixi"] },
  "lü-meng": { Composure: ["lu_meng_keji"] },
  "yue-jin": { Dauntless: ["yue_jin_dauntless"] },
  "zhou-yu": { Heroic: ["zhou_yu_yingzi"], "Sowing Distrust": ["zhou_yu_fanjian"] },
  "lu-xun": { "Second Wind": ["lu_xun_second_wind"] },
  daqiao: { Captivating: ["daqiao_captivating"], Deflection: ["daqiao_deflection"] },
  "diao-chan": { Lust: ["diao_chan_lust"], "Beauty Outshining the Moon": ["diao_chan_beauty_outshining_moon"] },
  "hua-tuo": { "Prodigal Healer": ["hua_tuo_prodigal_healer"] },
  "sun-shangxiang": { Betrothment: ["sun_shangxiang_betrothment"], Daredevil: ["sun_shangxiang_daredevil"] },
  "huang-yueying": { Cultivation: ["huang_yueying_cultivation"] },
  "huang-gai": { "Self Sacrifice": ["huang_gai_kurou"] },
  "zhuge-liang": { Stargazing: ["zhuge_liang_stargazing"] },
  "lady-gan": { "Divine Wisdom": ["lady_gan_divine_wisdom"], Prudence: ["lady_gan_prudence"] },
};

// These skills are stable, non-actionable entries in the Local Skills band.
// This is an explicit semantic registry, not a UI inference from description
// text. Skills with an authoritative CurrentAction option still use the
// existing actionable path below.
const LOCAL_DOCK_INLINE_TRIGGER_CHOICE_EFFECT_IDS = new Set(["hua_xiong_triumphant"]);

export const HERO_PASSIVE_SKILL_NAMES: Record<string, readonly string[]> = {
  "zhang-fei": ["Battle Cry"],
  "zhuge-liang": ["Empty Fortress Strategem"],
  "ma-chao": ["Horse Riding"],
  "huang-yueying": ["Wizardry"],
  "sun-quan": ["Deliverance"],
  "lu-xun": ["Modesty"],
  "lü-bu": ["Unrivaled"],
  huaxiong: ["Triumphant"],
  "gongsun-zan": ["Militia"],
  "pan-feng": ["Axe of Insanity"],
};

// Response capabilities are projected in currentAction.options rather than
// turn triggerOptions. Keep their stable provider IDs separate from the
// turn-skill map so the Skills panel can activate the legal response path
// without making the client infer capability legality.
export const HERO_SKILL_RESPONSE_IDS: Record<string, Record<string, readonly string[]>> = {
  "cao-cao": { Entourage: ["cao_cao_hujia"] },
  "liu-bei": { Influencing: ["liu_bei_jijiang"] },
  "zhen-ji": { "Empress Dowager": ["zhen_ji_black_card_dodge"] },
  "guan-yu": { "God of War": ["guan_yu_red_card_attack"] },
  "zhao-yun": { Braveheart: ["zhao_yun_dodge_as_attack", "zhao_yun_attack_as_dodge"] },
  "hua-tuo": { "First Aid": ["hua_tuo_first_aid"] },
};

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
  isGroupPreview?: boolean;
  preserveGuidanceHeight?: boolean;
  attackResponsePrompt?: boolean;
};

export function LocalPlayerDock({ player, hero, interactionRoles, guidance, children, heroSkillControl, selfTargetable, selfTargetSelected, onSelfTarget, onHeroInfo, onInfoCard, equipmentSelection = null, hiddenCardIds = new Set(), isGroupPreview = false, preserveGuidanceHeight = false, attackResponsePrompt = false }: LocalPlayerDockProps) {
  const dockRef = useRef<HTMLElement | null>(null);
  const guidanceHeightRef = useRef<number | null>(null);
  const preserveGuidanceHeightRef = useRef(preserveGuidanceHeight);
  const judgementRailRef = useRef<HTMLDivElement | null>(null);
  const [judgementRailWidth, setJudgementRailWidth] = useState(0);
  const [judgementCardWidth, setJudgementCardWidth] = useState(34);
  const equipmentBySlot = new Map<LocalEquipmentSlot, Card>();
  for (const equipment of player?.equipmentCards ?? []) {
    const slot = cardDefinition(equipment.kind).equipmentSlot;
    if (slot) equipmentBySlot.set(slot, equipment);
  }
  const slotLabel = (slot: LocalEquipmentSlot) => LOCAL_EQUIPMENT_SLOTS.find((entry) => entry.key === slot)?.label ?? slot;
  const judgementCards = player?.judgementCards ?? [];
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
  }, [player?.id]);
  useLayoutEffect(() => {
    preserveGuidanceHeightRef.current = preserveGuidanceHeight;
    const guidanceNode = dockRef.current?.querySelector<HTMLElement>(".console-guidance");
    if (!guidanceNode) return;
    const height = guidanceHeightRef.current;
    if (preserveGuidanceHeight && height !== null) guidanceNode.style.minHeight = `${height}px`;
    else guidanceNode.style.removeProperty("min-height");
  }, [preserveGuidanceHeight]);
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
  }, [player?.id]);
  const judgementCardLayout = useMemo(() => {
    const cardWidth = judgementCardWidth;
    const count = judgementCards.length;
    if (count <= 1) return { step: cardWidth, measured: judgementRailWidth > 0 };
    const naturalStep = (judgementRailWidth - cardWidth) / (count - 1);
    return { step: naturalStep >= cardWidth ? naturalStep : Math.max(12, naturalStep), measured: judgementRailWidth > 0 };
  }, [judgementCardWidth, judgementCards.length, judgementRailWidth]);
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
  const renderZoneCard = (card: Card, selected = false, selectable = false) => <div className={`local-zone-card ${suitColorClass(card.suit)} ${selected ? "selected-cost" : ""}`} key={card.id} data-equipment-id={cardDefinition(card.kind).equipmentSlot ? card.id : undefined} data-judgement-id={!cardDefinition(card.kind).equipmentSlot ? card.id : undefined} style={{ visibility: hiddenCardIds.has(card.id) ? "hidden" : "visible" }}>
    <CardFace card={card} />
    {selectable ? <button type="button" className="local-zone-card-button" aria-label={`Select ${cardDefinition(card.kind).name}`} aria-pressed={selected} disabled={!equipmentSelection || equipmentSelection.disabled || !equipmentSelection.eligibleIds.includes(card.id)} onClick={() => equipmentSelection?.onToggle(card.id)} /> : <button type="button" className="local-zone-card-button" aria-label={`Explain ${cardDefinition(card.kind).name}`} onClick={(event) => onInfoCard(card, event.currentTarget)} />}
    <button type="button" className="zone-info-button" aria-label={`Explain ${cardDefinition(card.kind).name}`} onClick={(event) => { event.stopPropagation(); onInfoCard(card, event.currentTarget); }}>i</button>
  </div>;
  return <section ref={dockRef} className={`local-player-dock${isGroupPreview ? " local-group-preview" : ""}${interactionRoleClasses ? ` ${interactionRoleClasses}` : ""}${attackResponsePrompt ? " local-dock-attack-response" : ""}`} data-player-anchor={player?.id ?? undefined} data-attack-response-prompt={attackResponsePrompt ? "true" : undefined} data-local-group-preview={isGroupPreview ? "true" : undefined} data-guidance-height-preserved={preserveGuidanceHeight ? "true" : undefined} data-interaction-roles={interactionRoleNames || undefined} data-interaction-source={interactionRoles.isInteractionSource ? "true" : undefined} data-interaction-original-target={interactionRoles.isOriginalTarget ? "true" : undefined} data-interaction-active-target={interactionRoles.isActiveTarget ? "true" : undefined} data-interaction-current-participant={interactionRoles.isCurrentParticipant ? "true" : undefined} data-interaction-decision-actor={interactionRoles.isDecisionActor ? "true" : undefined} data-interaction-active-resolver={interactionRoles.isActiveResolver ? "true" : undefined} data-interaction-viewer-decision={interactionRoles.isViewerDecisionActor ? "true" : undefined} aria-label="Your player area">
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
          ><span className="local-hero-portrait" data-hero-id={hero.id} aria-hidden="true"><HeroPortrait hero={hero} /><span className="local-hero-overlay"><span className="local-hero-label">{hero.name}</span><span className="local-hero-vitals"><strong className="local-hero-role">{player?.role ?? "Role pending"}</strong><span className="local-hero-hp">HP {player?.hp ?? 0}/{player?.maxHp ?? 0}</span><span className="local-hero-hearts">{hpDisplay(player?.hp ?? null)}</span></span></span></span></button>
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
        <div className="local-equipment-slots">{LOCAL_EQUIPMENT_SLOTS.map(({ key }) => { const card = equipmentBySlot.get(key); const selectable = Boolean(card && equipmentSelection); return <div className="local-equipment-slot" key={key} data-slot={key} aria-label={`${slotLabel(key)} slot`} role="group">{card ? renderZoneCard(card, equipmentSelection?.selectedIds.includes(card.id), selectable) : <span className="local-zone-empty" aria-label={`${slotLabel(key)} empty`}><span className="local-zone-empty-label">{slotLabel(key)}</span></span>}</div>; })}</div>
      </div>
    </div>
    {children}
  </section>;
}

type HandViewportCardPosition = { id: string; index: number; left: number; center: number; visible: boolean };
type HandViewportSnapshot = {
  viewerId: string | null;
  handKey: string;
  anchorId: string | null;
  anchorIndex: number;
  cards: HandViewportCardPosition[];
};

function captureHandViewportSnapshot(rail: HTMLElement, viewerId: string | null): HandViewportSnapshot {
  const viewport = rail.getBoundingClientRect();
  const cards = Array.from(rail.querySelectorAll<HTMLElement>("[data-hand-card-id]")).map((slot, index) => {
    const bounds = slot.getBoundingClientRect();
    return {
      id: slot.dataset.handCardId ?? "",
      index,
      left: bounds.left - viewport.left,
      center: (bounds.left + bounds.right) / 2 - viewport.left,
      visible: bounds.left < viewport.right && bounds.right > viewport.left,
    };
  });
  const viewportCenter = viewport.width / 2;
  const anchor = cards
    .filter((card) => card.visible)
    .map((card) => ({ card, distance: Math.abs(card.center - viewportCenter) }))
    .sort((left, right) => left.distance - right.distance || left.card.index - right.card.index)[0]?.card ?? null;
  return {
    viewerId,
    handKey: cards.map((card) => card.id).join("|"),
    anchorId: anchor?.id ?? null,
    anchorIndex: anchor?.index ?? 0,
    cards,
  };
}

export function GameRoom({ room, presentationView, busy, busyAction = null, error, onAction, onLeave, onPublicCounterReadVisible, onSwitchTestViewer = async () => undefined }: { room: Room; presentationView?: PresentationClientView; busy: boolean; busyAction?: string | null; error: string; onAction: (action: GameplayAction, extra?: Record<string, unknown>) => Promise<boolean>; onLeave: () => void; onPublicCounterReadVisible: (identity: string, durationMs?: number, renew?: boolean) => void; onSwitchTestViewer?: (playerId: string) => Promise<void> }) {
  const initialPendingSequence = pendingTimelineSequence(room);
  const clientPresentation = useMemo(() => presentationView ?? buildPresentationClientView(room.presentationSnapshot ?? null, room.meId), [presentationView, room.presentationSnapshot, room.meId]);
  const skillEffectSettlements = clientPresentation.skillEffectSettlements ?? NO_SKILL_EFFECT_SETTLEMENTS;
  const dismantleSettlements = clientPresentation.dismantleSettlements ?? NO_DISMANTLE_SETTLEMENTS;
  const stealSettlements = clientPresentation.stealSettlements ?? NO_STEAL_SETTLEMENTS;
  const attackHitSettlements = clientPresentation.attackHitSettlements ?? NO_ATTACK_HIT_SETTLEMENTS;
  const [presentationTransitionStore] = useState(() => createPresentationTransitionStore(clientPresentation));
  const presentationTransition = useSyncExternalStore(presentationTransitionStore.subscribe, presentationTransitionStore.getSnapshot, presentationTransitionStore.getSnapshot);
  useEffect(() => {
    presentationTransitionStore.accept(clientPresentation);
  }, [clientPresentation, presentationTransitionStore]);
  const [selected, setSelected] = useState(""); const [wushengMode, setWushengMode] = useState<"play" | "response" | null>(null); const [longdanMode, setLongdanMode] = useState<"play" | "response" | null>(null); const [targetIds, setTargetIds] = useState<string[]>([]); const [borrowedSwordTargetId, setBorrowedSwordTargetId] = useState(""); const target = targetIds[0] ?? "";
  const handRailRef = useRef<HTMLDivElement | null>(null);
  const handViewportSnapshotRef = useRef<HandViewportSnapshot | null>(null);
  const [handRailWidth, setHandRailWidth] = useState(0);
  const [harvestSelected, setHarvestSelected] = useState("");
  const queuedHarvestPreview = useRef<string | null>(null); const harvestPreviewInFlight = useRef(false);
  const [harvestSubmitting, setHarvestSubmitting] = useState<{ cardId: string; playerId: string; playerName: string } | null>(null);
  const [optimisticPlay, setOptimisticPlay] = useState<GameEvent | null>(null);
  const [serpentMode, setSerpentMode] = useState(false); const [serpentSelected, setSerpentSelected] = useState<string[]>([]);
  const [activeSkillSelectionState, setActiveSkillSelectionState] = useState<ActiveSkillSelectionState | null>(null);
  // A response provider is selected explicitly before its card cost is chosen.
  // This prevents the browser from guessing which capability owns a card when
  // more than one provider can legally consume it.
  const [responseProviderId, setResponseProviderId] = useState(""); const [kingSkillId, setKingSkillId] = useState("");
  const optimisticallyPresentedCards = useRef(new Set<string>());
  const [targetCardIndex, setTargetCardIndex] = useState<number | null>(null);
  const [targetCardZone, setTargetCardZone] = useState<"hand" | "equipment" | "judgement" | "">("");
  const [targetCardId, setTargetCardId] = useState("");
  const [triggerSelectedKeys, setTriggerSelectedKeys] = useState<string[]>([]);
  const targetCardSubmissionRef = useRef("");
  const targetCardPickerSubmissionRef = useRef("");
  const [triggerChoice, setTriggerChoice] = useState("");
  const [discardSelected, setDiscardSelected] = useState<string[]>([]); const automaticDraw = useRef("");
  // Equipment cost selections use the selected-cost visual state.
  // Equipment cost selection remains presentation-compatible with the compact
  // visible dock while preserving the existing card IDs and callbacks.
  // Legacy seat semantics retain presence-dot, started-player, and play-seat terminology.
  const [messagesCollapsed, setMessagesCollapsed] = useState(true);
  const attackDodgeUxTraceActive = useSyncExternalStore(
    subscribeToAttackDodgeUxTraceActive,
    isAttackDodgeUxTraceActive,
    getAttackDodgeUxTraceServerSnapshot,
  );
  const [effectNotices, setEffectNotices] = useState<EffectNoticeState[]>([]);
  const effectNotice = effectNotices[0] ?? null;
  const [infoCard, setInfoCard] = useState<Card | null>(null);
  const [infoCardContext, setInfoCardContext] = useState<CardDetailsContext>("private-hand");
  const [infoHero, setInfoHero] = useState<Hero | null>(null);
  const cardInfoReturnFocusRef = useRef<HTMLElement | null>(null);
  const heroInfoReturnFocusRef = useRef<HTMLElement | null>(null);
  const openCardDetails = useCallback((card: Card, context: CardDetailsContext, trigger?: HTMLElement | null) => {
    cardInfoReturnFocusRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    heroInfoReturnFocusRef.current = null;
    setInfoCardContext(context);
    setInfoHero(null);
    setInfoCard(card);
  }, []);
  const closeCardDetails = useCallback(() => {
    const trigger = cardInfoReturnFocusRef.current;
    cardInfoReturnFocusRef.current = null;
    setInfoCard(null);
    if (trigger?.isConnected) window.requestAnimationFrame(() => {
      if (trigger.isConnected) trigger.focus({ preventScroll: true });
    });
  }, []);
  const closeHeroDetails = useCallback((restoreFocus = true) => {
    const trigger = heroInfoReturnFocusRef.current;
    heroInfoReturnFocusRef.current = null;
    setInfoHero(null);
    if (restoreFocus && trigger?.isConnected) window.requestAnimationFrame(() => {
      if (trigger.isConnected) trigger.focus({ preventScroll: true });
    });
  }, []);
  const openHeroDetails = useCallback((hero: Hero, trigger: HTMLElement) => {
    if (infoHero?.id === hero.id) {
      closeHeroDetails();
      return;
    }
    heroInfoReturnFocusRef.current = trigger;
    cardInfoReturnFocusRef.current = null;
    setInfoCard(null);
    setInfoHero(hero);
  }, [closeHeroDetails, infoHero?.id]);
  const [expandedOpponentId, setExpandedOpponentId] = useState<string | null>(null);
  const nestedInspectorCardDetailDismissRef = useRef<(() => boolean) | null>(null);
  const [submittedTargetPreview, setSubmittedTargetPreview] = useState<LocalTargetPreviewSubmission | null>(null);
  const automaticResponseTimeout = useRef("");
  const automaticRescueSkip = useRef("");
  const [turnNotice, setTurnNotice] = useState(""); const onActionRef = useRef(onAction);
  const [privateDrawPresentation, setPrivateDrawPresentation] = useState<{ playerId: string; cards: Card[] }>({ playerId: room.meId, cards: [] });
  const privateDrawCards = useMemo(() => privateDrawPresentation.playerId === room.meId ? privateDrawPresentation.cards : [], [privateDrawPresentation, room.meId]);
  const hasInitialDeal = room.timeline.some((event) => event.type === "card" && event.initialDeal && event.drawPlayerId === room.meId);
  const knownHandCards = useRef(baselineHand(room.meId, hasInitialDeal ? [] : room.myHand, hasInitialDeal ? [] : room.timeline));
  const [eventQueue, setEventQueue] = useState<GameEvent[]>([]); const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null); const seenEvents = useRef(new Set((room.timeline ?? []).map((event) => event.id)));
  const effectNoticeScope = useRef(JSON.stringify([room.code, room.meId]));
  const seenDiaoChanNoticeEventIds = useRef(new Set((room.presentationSnapshot?.diaoChanSkillNotices ?? []).map((notice) => notice.eventId)));
  const [activeSkillEffectSettlement, setActiveSkillEffectSettlement] = useState<{ eventId: string; exiting: boolean } | null>(null);
  const [activeDismantleSettlement, setActiveDismantleSettlement] = useState<{ eventId: string; exiting: boolean; journeySettled: boolean } | null>(null);
  const [activeStealSettlement, setActiveStealSettlement] = useState<{ eventId: string; exiting: boolean } | null>(null);
  const [activeAttackHitSettlement, setActiveAttackHitSettlement] = useState<{ eventId: string; exiting: boolean; firstRenderedAt: number | null; lifecycle: AttackHitSettlementHoldIdentity } | null>(null);
  const [activeGroupSettlement, setActiveGroupSettlement] = useState<{ eventId: string; exiting: boolean } | null>(null);
  const [activeBumperHarvestSettlement, setActiveBumperHarvestSettlement] = useState<{ eventId: string; exiting: boolean } | null>(null);
  const [activeAttackDodgeSettlement, setActiveAttackDodgeSettlement] = useState<ActiveAttackDodgeSettlement | null>(null);
  const attackDodgeSettlementCapturedEventIds = useRef(new Set<string>());
  const [attackDodgeSettlementCapturedEventIdsSnapshot, setAttackDodgeSettlementCapturedEventIdsSnapshot] = useState<ReadonlySet<string>>(() => new Set());
  const attackDodgeSettlementRetirementLoggedEventIds = useRef(new Set<string>());
  const retiredAttackDodgeComposition = useRef<RetiredAttackDodgeComposition>({ roomCode: room.code, eventIds: new Set(), cardIds: new Set() });
  const [retiredAttackDodgeCompositionSnapshot, setRetiredAttackDodgeCompositionSnapshot] = useState<RetiredAttackDodgeComposition>(() => ({ roomCode: room.code, eventIds: new Set(), cardIds: new Set() }));
  const publishRetiredAttackDodgeComposition = useCallback((composition: RetiredAttackDodgeComposition) => {
    retiredAttackDodgeComposition.current = composition;
    setRetiredAttackDodgeCompositionSnapshot({
      roomCode: composition.roomCode,
      eventIds: new Set(composition.eventIds),
      cardIds: new Set(composition.cardIds),
    });
  }, []);
  const retiredAttackDodgeStorageRaw = useSyncExternalStore(
    useCallback((listener) => subscribeRetiredAttackDodgeComposition(room.code, listener), [room.code]),
    useCallback(() => retiredAttackDodgeCompositionStorageSnapshot(room.code), [room.code]),
    retiredAttackDodgeCompositionServerSnapshot,
  );
  const persistedAttackDodgeComposition = useMemo(
    () => parseRetiredAttackDodgeCompositionSnapshot(retiredAttackDodgeStorageRaw, room.code),
    [retiredAttackDodgeStorageRaw, room.code],
  );
  const persistedRetiredAttackDodgeEvents = useMemo(() => new Set(persistedAttackDodgeComposition.eventIds), [persistedAttackDodgeComposition]);
  const persistedRetiredAttackDodgeCards = useMemo(() => new Set(persistedAttackDodgeComposition.cardIds), [persistedAttackDodgeComposition]);
  const recordAttackHitSettlementRetirement = useCallback((hold: AttackHitSettlementHoldIdentity) => {
    const retired = persistAttackHitSettlementRetirement(hold);
    const prior = retiredAttackDodgeComposition.current.roomCode === hold.roomCode
      ? retiredAttackDodgeComposition.current
      : { roomCode: hold.roomCode, eventIds: new Set<string>(), cardIds: new Set<string>() };
    retired.eventIds.forEach((eventId) => prior.eventIds.add(eventId));
    retired.cardIds.forEach((cardId) => prior.cardIds.add(cardId));
    publishRetiredAttackDodgeComposition(prior);
  }, [publishRetiredAttackDodgeComposition]);
  const [newAttackDodgeResponseProofs, setNewAttackDodgeResponseProofs] = useState<AttackDodgeObservedProof[]>([]);
  const observedAttackDodgeProofs = useRef<{ roomCode: string; proofKeys: Set<string> } | null>(null);
  if (observedAttackDodgeProofs.current === null) {
    observedAttackDodgeProofs.current = { roomCode: room.code, proofKeys: attackDodgeProofKeysFromTimeline(room.timeline) };
  }
  const [activePublicNegationRead, setActivePublicNegationRead] = useState<ActivePublicNegationRead | null>(null);
  // Events already present when the screen mounts have no new animation to
  // wait for. New event IDs enter this set only after their presentation ends.
  const [presentedEventIds, setPresentedEventIds] = useState<Set<string>>(() => new Set((room.timeline ?? []).map((event) => event.id)));
  // The centre-to-seat card journey has its own lifecycle. The legacy event
  // queue may finish its two-second read before the authoritative response
  // projection is ready; that must not make the committed card look stale.
  const [publicCardJourneySeen, setPublicCardJourneySeen] = useState<{ roomCode: string; eventIds: Set<string> }>(() => ({
    roomCode: room.code,
    eventIds: new Set((room.timeline ?? []).map((event) => event.id)),
  }));
  const markPublicCardJourneyEventParked = useCallback((eventId: string) => {
    setPublicCardJourneySeen((current) => {
      const seen = current.roomCode === room.code
        ? current.eventIds
        : new Set((room.timeline ?? []).map((event) => event.id));
      if (current.roomCode === room.code && seen.has(eventId)) return current;
      return { roomCode: room.code, eventIds: new Set([...seen, eventId]) };
    });
  }, [room.code, room.timeline]);
  if (publicCardJourneySeen.roomCode !== room.code) {
    setPublicCardJourneySeen({ roomCode: room.code, eventIds: new Set((room.timeline ?? []).map((event) => event.id)) });
  }
  const publicCardJourneySeenEventIds = publicCardJourneySeen.roomCode === room.code
    ? publicCardJourneySeen.eventIds
    : new Set((room.timeline ?? []).map((event) => event.id));
  const [resolutionEvents, setResolutionEvents] = useState<GameEvent[]>(initialPendingSequence);
  const [resolutionClosing, setResolutionClosing] = useState(false);
  const [sequenceScopeStartId, setSequenceScopeStartId] = useState(initialPendingSequence[0]?.id ?? "");
  const resolutionRevision = useRef(0);
  const [processedTimelineKey, setProcessedTimelineKey] = useState(() => room.timeline.map((event) => event.id).join("|"));
  const card = room.myHand.find((item) => item.id === selected); const current = room.players.find((player) => player.seat === room.turnSeat); const actor = room.pendingNegation ? room.isMyAction ? room.players.find((player) => player.id === room.actionPlayerId) : undefined : room.players.find((player) => player.id === room.actionPlayerId); const me = room.players.find((player) => player.id === room.meId); const localHero = heroDefinition(me?.hero); const targetPlayer = room.players.find((player) => player.id === target); const pendingTargetPlayer = room.players.find((player) => player.id === room.pendingTargetCard?.targetId); const pickerTarget = pendingTargetPlayer ?? targetPlayer;
  const excessCards = Math.max(0, room.myHand.length - (me?.hp ?? 0));
  const myTableIndex = Math.max(0, room.players.findIndex((player) => player.id === room.meId));
  const canPlay = room.phase?.startsWith("play") && room.status === "playing";
  const canChooseHarvest = room.phase === "response" && Boolean(room.pendingHarvest) && !room.pendingHarvest?.complete && room.isMyAction;
  const canChooseTargetCard = room.phase === "response" && Boolean(room.pendingTargetCard) && room.isMyAction;
  const canChooseBorrowedSword = room.phase === "response" && room.isMyAction && room.pendingBorrowedSword?.stage === "choose_target";
  const pendingBorrowedSwordEligibleTargetIds = room.pendingBorrowedSword?.eligibleTargetIds;
  const borrowedSwordEligibleTargetIds = useMemo(() => pendingBorrowedSwordEligibleTargetIds ?? [], [pendingBorrowedSwordEligibleTargetIds]);
  // `currentAction` is the server's canonical response discriminator and
  // capability list. Legacy pending fields below only supply presentation
  // detail while the API migrates away from its compatibility projection.
  const responseType = room.isMyAction && !room.pendingHarvest && !room.pendingTargetCard && !canChooseBorrowedSword && room.currentAction?.kind !== "deck_reorder" && (room.phase === "response" || room.phase === "dying" && room.currentAction?.requirement)
    ? room.currentAction?.kind ?? null
    : null;
  const invalidResponseState = room.phase === "response" && room.isMyAction && room.currentAction?.kind !== "deck_reorder" && !room.pendingHarvest && !room.pendingTargetCard && !canChooseBorrowedSword && !responseType;
  // Canonical rooms project `response`; retain the legacy discriminators while
  // old saved rooms and compatibility tests are still supported. A trigger is
  // deliberately separate: it is not a semantic Attack/Dodge/Negation reply.
  // Basic Dying actions use give_peach/skip_rescue, not the ordinary respond
  // capability. Keep them on the rescue console so the exact server actions
  // remain visible and local Peach selection cannot become a fake response.
  const canRespond = responseType !== null && responseType !== "trigger" && responseType !== "dying";
  // Canonical trigger decisions render exclusively from currentAction. Legacy
  // pending projections are retained only so an old saved room can be read.
  // Canonical damage reactions are ordinary trigger decisions. The retained
  // legacy projection is presentation-only and never selects controls.
  const triggerResponse = room.currentAction?.kind === "trigger" && room.isMyAction;
  const responseTimerActive = canRespond && room.phase !== "dying" || triggerResponse;
  const semanticResponseOptions = room.currentAction?.options ?? [];
  const sharedNegationWindow = Boolean(room.currentAction?.negationWindowId);
  const genericResponse = canUseAction(room.currentAction, "respond");
  // CurrentAction opens time-sensitive responses independently of the visual
  // read barrier. The action kind and legal action list are server-authored;
  // this only prevents a still-revealing public card from hiding an already
  // authorized decision. Keep card selection narrower than decline so a
  // decline-only response never makes unrelated Hand cards selectable.
  const responseDecisionReady = Boolean(
    canRespond && (canUseAction(room.currentAction, "respond") || canUseAction(room.currentAction, "decline_response"))
    || triggerResponse && (canUseAction(room.currentAction, "trigger") || canUseAction(room.currentAction, "decline_trigger")),
  );
  const responseCardSelectionReady = Boolean(
    canRespond && canUseAction(room.currentAction, "respond")
    || triggerResponse && canUseAction(room.currentAction, "trigger"),
  );
  // Ordinary physical responses are implicit: their eligible cards are ready
  // to select immediately. Explicit abilities deliberately enter a provider
  // mode first so the player can choose (for example) Empress Dowager over a black
  // Dodge card instead of the client guessing their intent.
  const implicitResponseProvider = semanticResponseOptions.find((option) => option.activation === "implicit") ?? null;
  const selectedResponseProvider = semanticResponseOptions.find((option) => option.providerId === responseProviderId && option.activation === "explicit") ?? implicitResponseProvider;
  const responseSelection = selectedResponseProvider?.selection ?? null;
  const responseSelectionUsesCards = responseSelection?.type === "cards";
  const responseSelectionMax = responseSelectionUsesCards ? responseSelection.max : 0;
  const responseSelectedCardIds = responseSelectionMax === 1 ? selected ? [selected] : [] : serpentSelected;
  const responseSelectionComplete = Boolean(selectedResponseProvider && (responseSelectionUsesCards
    ? responseSelectedCardIds.length >= responseSelection.min && responseSelectedCardIds.length <= responseSelection.max
    : selectedResponseProvider.activation === "explicit" && responseProviderId === selectedResponseProvider.providerId));
  const triggerOptions = room.currentAction?.triggerOptions ?? [];
  const privateDistribution = room.currentAction?.kind === "card_distribution" && room.isMyAction ? room.currentAction.distribution ?? null : null;
  const privateDeckReorder = room.currentAction?.kind === "deck_reorder" && room.isMyAction ? room.currentAction.deckReorder ?? null : null;
  const heroSkillEffectIds = new Set(Object.values(HERO_SKILL_EFFECT_IDS[me?.hero ?? ""] ?? {}).flat());
  const activeSkillOptions = (room.currentAction?.kind === "turn" || room.currentAction?.kind === "trigger") && room.isMyAction
    ? triggerOptions.filter((option) => heroSkillEffectIds.has(option.effectId) && option.selection?.type !== "choice")
    : [];
  const canActivateDaqiaoDeflection = Boolean(
    me?.hero === "daqiao"
    && room.currentAction?.kind === "trigger"
    && room.currentAction.triggerEvent === "attack_targeted"
    && room.currentAction.actorId === room.meId
    && room.isMyAction
    && canUseAction(room.currentAction, "trigger")
    && activeSkillOptions.some((option) => option.effectId === "daqiao_deflection"),
  );
  const canActivateDaqiaoDeflectionDuringTimerStart = canActivateDaqiaoDeflection && busyAction === "start_response_timer";
  // Arming the authoritative response timer can briefly set busy. Deflection
  // only begins a local selection here; cost, target and submission remain
  // guarded by CurrentAction and its server-projected option.
  const activeSkillOption = activeSkillOptions.find((option) => option.effectId === kingSkillId) ?? null;
  const heroTriggerEffectIds = new Set(activeSkillOptions.map((option) => option.effectId).filter((effectId) => heroSkillEffectIds.has(effectId)));
  const activeSkillSelection = normalizeActiveCardSkillSelection(activeSkillOption?.selection ?? null);
  const activeSkillTargetSelection = activeSkillOption?.selection?.type === "target" ? activeSkillOption.selection : null;
  const activeActionRevision = room.actionRevision ?? "";
  const activeSkillStateIsCurrent = Boolean(activeSkillOption && activeSkillSelectionState?.revision === activeActionRevision && activeSkillSelectionState.effectId === activeSkillOption.effectId);
  const activeSkillSelectedCardIds = activeSkillSelection && activeSkillStateIsCurrent ? (activeSkillSelectionState?.cardIds ?? []).filter((id) => activeSkillSelection.eligibleCardIds.includes(id)) : [];
  const activeSkillTargetIds = activeSkillSelection?.targetIds ?? activeSkillTargetSelection?.targetIds ?? [];
  const activeSkillTargetMin = activeSkillSelection?.targetMin ?? (activeSkillTargetSelection?.min ?? 1);
  const activeSkillTargetMax = activeSkillSelection?.targetMax ?? (activeSkillTargetSelection?.max ?? 1);
  // Target selections belong to the projected semantic skill decision, not
  // necessarily to the Play Phase. Draw Phase triggers such as Assault must
  // use the same target controls without making ordinary card targeting
  // available outside Play Phase.
  const activeSkillTargetMode = Boolean(activeSkillOption && activeSkillStateIsCurrent && activeSkillTargetIds.length > 0);
  const activeSkillSelectedTargetIds = activeSkillStateIsCurrent ? (activeSkillSelectionState?.targetIds ?? []).filter((id) => activeSkillTargetIds.includes(id)) : [];
  const activeSkillTargetId = activeSkillSelectedTargetIds[0] ?? "";
  const lustLocalSelectionActive = Boolean(
    activeSkillOption?.effectId === "diao_chan_lust"
    && activeSkillSelection
    && activeSkillStateIsCurrent,
  );
  const lustTargetOrderText = lustLocalSelectionActive
    && activeSkillSelectedTargetIds.length === activeSkillTargetMin
    && activeSkillTargetMin === activeSkillTargetMax
    ? (() => {
      const firstName = room.players.find((player) => player.id === activeSkillSelectedTargetIds[0])?.name;
      const secondName = room.players.find((player) => player.id === activeSkillSelectedTargetIds[1])?.name;
      return firstName && secondName ? `Lust order: ${firstName} plays Attack first, then ${secondName}.` : "";
    })()
    : "";
  const daqiaoDeflectionSelectionActive = Boolean(
    activeSkillOption?.effectId === "daqiao_deflection"
    && activeSkillSelection
    && activeSkillStateIsCurrent
    && room.currentAction?.kind === "trigger"
    && room.currentAction.triggerEvent === "attack_targeted",
  );
  const daqiaoDeflectionCardCount = daqiaoDeflectionSelectionActive ? activeSkillSelectedCardIds.length : 0;
  const daqiaoDeflectionTargetCount = daqiaoDeflectionSelectionActive ? activeSkillSelectedTargetIds.length : 0;
  const daqiaoDeflectionReady = Boolean(
    daqiaoDeflectionSelectionActive
    && daqiaoDeflectionCardCount === 1
    && daqiaoDeflectionTargetCount === 1
    && canUseAction(room.currentAction, "trigger")
    && !busy,
  );
  const activeSkillComplete = Boolean(activeSkillOption && activeSkillStateIsCurrent && (activeSkillSelection ? activeSkillSelectedCardIds.length >= activeSkillSelection.min && activeSkillSelectedCardIds.length <= activeSkillSelection.max : activeSkillTargetSelection) && (activeSkillTargetIds.length === 0 || activeSkillSelectedTargetIds.length >= activeSkillTargetMin && activeSkillSelectedTargetIds.length <= activeSkillTargetMax));
  const activeSkillSubmission = activeSkillOption && activeSkillSelection && activeSkillStateIsCurrent && activeSkillSelectionState
    ? buildActiveSkillSubmission(activeSkillOption.effectId, activeSkillSelection, activeSkillSelectionState)
    : activeSkillOption && activeSkillStateIsCurrent
      ? { providerId: activeSkillOption.effectId, ...(activeSkillTargetSelection && activeSkillTargetMax > 1 ? { targetIds: activeSkillSelectedTargetIds } : activeSkillTargetId ? { targetId: activeSkillTargetId } : {}) }
      : null;
  const hasUnseenPresentations = room.timeline.some((event) => event.type !== "message" && event.presentation !== false && !presentedEventIds.has(event.id));
  const presentationBusy = Boolean(optimisticPlay || activeEvent || eventQueue.length || resolutionClosing || turnNotice || privateDrawCards.length || hasUnseenPresentations);
  // A target selection is already an explicit local boundary over the same
  // server-owned CurrentAction. A late card animation must not remove its
  // Confirm/Cancel controls after the player has selected legal Assault
  // targets; the server still revalidates the action and revision on submit.
  // A server-authorized response must not inherit visual presentation busy
  // state. Network `busy` still blocks duplicate submissions while a request
  // is in flight; turn actions remain presentation-gated below.
  const activeSkillSelectionBusy = Boolean(presentationBusy && !activeSkillTargetMode && !sharedNegationWindow && !responseDecisionReady);
  // CurrentAction owns whether this local card may be played. The helper only
  // mirrors the already-public scope rule for a selected, legal group card.
  const groupScopePreview = buildGroupScopePreview({
    cardKind: card?.kind,
    sourceId: room.meId,
    turnSeat: room.turnSeat,
    players: room.players,
    playAuthorized: Boolean(room.isMyTurn && room.isMyAction && canPlay && !busy && !presentationBusy && room.currentAction?.actorId === room.meId && canUseAction(room.currentAction, "play_card")),
  });
  const mandatoryChoiceTriggerOption = triggerOptions.find((option) => option.selection?.type === "choice" && option.allowDecline === false) ?? null;
  const genericChoiceTriggerOption = triggerOptions.find((option) => option.selection?.type === "choice" && !heroSkillEffectIds.has(option.effectId)) ?? null;
  const genericChoiceSelection = genericChoiceTriggerOption?.selection?.type === "choice" ? genericChoiceTriggerOption.selection : null;
  const inlineChoiceTriggerOption = genericChoiceTriggerOption
    && LOCAL_DOCK_INLINE_TRIGGER_CHOICE_EFFECT_IDS.has(genericChoiceTriggerOption.effectId)
    && genericChoiceSelection
    && genericChoiceTriggerOption.allowDecline !== false
    && genericChoiceSelection.eligibleHandKeys.length === 0
    && !Object.values(genericChoiceSelection.cardCountByChoice ?? {}).some((count) => count > 0)
    && !genericChoiceSelection.choices.some((choice) => choice.id === "discard" && genericChoiceSelection.cardCountByChoice?.[choice.id] === undefined)
    && genericChoiceSelection.choices.length > 0
    && canUseAction(room.currentAction, "trigger")
    && canUseAction(room.currentAction, "decline_trigger")
    ? genericChoiceTriggerOption
    : null;
  const genericTriggerOptions = triggerOptions.filter((option) =>
    (!heroTriggerEffectIds.has(option.effectId) || option.selection?.type === "choice")
    && option.effectId !== inlineChoiceTriggerOption?.effectId);
  const choiceTriggerOption = mandatoryChoiceTriggerOption ?? (inlineChoiceTriggerOption ? null : genericChoiceTriggerOption);
  const selectedTriggerOption = choiceTriggerOption ?? triggerOptions.find((option) => option.effectId === responseProviderId) ?? null;
  // Mapped Hero skills (such as Retaliation) must be activated from the
  // profile before their target-card picker appears. Supported effects route
  // from CurrentAction authority alone; the public display is not a second
  // eligibility requirement for the shared modal.
  const targetCardPickerOption = activeSkillOption?.selection?.type === "target_cards"
    ? activeSkillOption
    : triggerOptions.find((option) => option.selection?.type === "target_cards" && !heroTriggerEffectIds.has(option.effectId)) ?? null;
  const targetCardPickerSelection = targetCardPickerOption?.selection?.type === "target_cards" ? targetCardPickerOption.selection : null;
  const targetCardPickerTarget = targetCardPickerSelection ? room.players.find((player) => player.id === targetCardPickerSelection.targetId) ?? null : null;
  const targetCardPickerUsesUnifiedModal = Boolean(
    targetCardPickerOption
    && ["sima_yi_fankui", "frost_sword_damage_about_to_apply", "kirin_bow_damage_about_to_apply"].includes(targetCardPickerOption.effectId)
    && canUseAction(room.currentAction, "trigger")
    && targetCardPickerSelection
    && targetCardPickerSelection.targetId !== room.meId
    && targetCardPickerTarget
    && targetCardPickerTarget.id === targetCardPickerSelection.targetId
    && targetCardPickerTarget.alive
    && supportsAuthoritativeTargetCardSelection(targetCardPickerSelection, targetCardPickerTarget)
  );
  const pendingTargetCardAvailabilityKey = pickerTarget
    ? [pickerTarget.id, pickerTarget.handCount, ...pickerTarget.equipmentCards.map((card) => card.id), ...pickerTarget.judgementCards.map((card) => card.id)].join("|")
    : "";
  const pendingTargetCardProjection = room.currentAction?.targetCardSelection ?? null;
  const pendingTargetCardSelectableSelection: PublicTargetCardSelection | null = pendingTargetCardProjection
    ? { targetId: pendingTargetCardProjection.targetId, min: 1, max: 1, eligibleKeys: pendingTargetCardProjection.eligibleKeys }
    : null;
  const pendingTargetCardProjectionKey = pendingTargetCardProjection
    ? [room.actionRevision ?? "", pendingTargetCardProjection.targetId, ...pendingTargetCardProjection.eligibleKeys].join("\u001f")
    : "";
  const targetCardPickerSelectionKey = targetCardPickerSelection
    ? [room.actionRevision ?? "", targetCardPickerOption?.effectId ?? "", targetCardPickerSelection.targetId, targetCardPickerSelection.min, targetCardPickerSelection.max, ...targetCardPickerSelection.eligibleKeys].join("\u001f")
    : "";
  const targetCardPickerEligibleKeys = useMemo(() => targetCardPickerSelectionKey ? targetCardPickerSelectionKey.split("\u001f").slice(5) : [], [targetCardPickerSelectionKey]);
  const triggerCardOption = selectedTriggerOption?.selection?.type === "cards" ? selectedTriggerOption : null;
  const triggerSelection = selectedTriggerOption?.selection ?? null;
  const triggerSelectionUsesCards = triggerSelection?.type === "cards";
  const triggerSelectionUsesChoice = triggerSelection?.type === "choice";
  const triggerSelectionMax = triggerSelectionUsesCards ? triggerSelection.max : 0;
  const triggerSelectedCardIds = triggerSelectionMax === 1 ? (serpentSelected.length ? serpentSelected : selected ? [selected] : []) : serpentSelected;
  const triggerSelectionKeys = triggerSelectionUsesChoice ? triggerSelectedKeys : [];
  const triggerChoiceHandCount = triggerSelectionUsesChoice && triggerChoice ? triggerSelection.cardCountByChoice?.[triggerChoice] ?? (triggerChoice === "discard" ? 1 : 0) : 0;
  const triggerSelectionComplete = Boolean(triggerSelection && ((triggerSelectionUsesCards && triggerSelectedCardIds.length >= triggerSelection.min && triggerSelectedCardIds.length <= triggerSelection.max) || (triggerSelectionUsesChoice && triggerChoice && triggerSelectionKeys.length === triggerChoiceHandCount)));
  const selectedHandDetailsCardId = room.phase === "discard"
    ? discardSelected.at(-1) ?? ""
    : activeSkillSelection
      ? activeSkillStateIsCurrent ? activeSkillSelectedCardIds.at(-1) ?? "" : ""
      : triggerResponse
        ? triggerSelectionUsesCards ? triggerSelectedCardIds.at(-1) ?? "" : ""
        : canRespond && responseSelectionUsesCards
          ? responseSelectionMax > 1 ? responseSelectedCardIds.at(-1) ?? "" : selected
          : serpentMode ? serpentSelected.at(-1) ?? "" : selected;
  const selectedHandDetailsCard = selectedHandDetailsCardId
    ? room.myHand.find((item) => item.id === selectedHandDetailsCardId) ?? null
    : null;
  const responseReadyAfterEventId = room.currentAction?.presentation?.readyAfterEventId ?? null;
  const responseBarrierEvent = responseReadyAfterEventId ? room.timeline.find((event) => event.id === responseReadyAfterEventId) : null;
  // Keep the reveal barrier as presentation telemetry. CurrentAction, rather
  // than completion of the visual read, now decides when legal response
  // controls open.
  const responsePresentationReady = sharedNegationWindow
    || !responseReadyAfterEventId
    || responseBarrierEvent?.type === "message"
    || responseBarrierEvent?.importance === "informational"
    || presentedEventIds.has(responseReadyAfterEventId);
  const dyingFirstAidOption = semanticResponseOptions.find((option) => option.providerId === "hua_tuo_first_aid" && option.activation === "explicit") ?? null;
  const dyingFirstAidAvailable = Boolean(
    me?.hero === "hua-tuo"
    && room.phase === "dying"
    && room.currentAction?.kind === "dying"
    && room.currentAction.actorId === room.meId
    && room.isMyAction
    && canUseAction(room.currentAction, "respond")
    && responsePresentationReady
    && !busy
    && !presentationBusy
    && dyingFirstAidOption,
  );
  const dyingFirstAidSelectionActive = Boolean(dyingFirstAidAvailable && responseProviderId === "hua_tuo_first_aid" && selectedResponseProvider?.providerId === "hua_tuo_first_aid");
  const responseCardAllowed = (item: Card) => activeSkillSelection ? true : selectedResponseProvider?.selection?.type === "cards"
    ? selectedResponseProvider.selection.eligibleCardIds.includes(item.id)
    : triggerCardOption?.selection?.type === "cards" && triggerCardOption.selection.eligibleCardIds.includes(item.id);
  const responseCardSelectionActive = Boolean(responseCardSelectionReady || dyingFirstAidSelectionActive);
  const heroResponseEffectIds = new Set(Object.values(HERO_SKILL_RESPONSE_IDS[me?.hero ?? ""] ?? {}).flat());
  const genericResponseOptions = semanticResponseOptions.filter((option) => option.activation === "explicit" && !heroResponseEffectIds.has(option.providerId)).map((option) => ({ ...option, label: conciseActionLabel(option.label) }));
  const responseDamageAction = canUseAction(room.currentAction, "decline_response") ? "decline_response" as GameplayAction : canUseAction(room.currentAction, "skip_rescue") ? "skip_rescue" as GameplayAction : canUseAction(room.currentAction, "decline_trigger") ? "decline_trigger" as GameplayAction : null;
  const triggerDeclineAction = canUseAction(room.currentAction, "decline_trigger");
  const hasSerpentSpear = getResponseOptions({ hand: room.myHand, equipment: me?.equipmentCards ?? [], hero: me?.hero }, { kind: "attack" }).some((option) => option.providerId === "serpent_spear_attack");
  const playPhaseAttackCardIds = new Set(room.currentAction?.actorId === room.meId ? (room.currentAction.playPhaseActions ?? []).filter((action) => action.canPlayAs === "attack").map((action) => action.cardId) : []);
  const wushengResponseOption = room.currentAction?.options?.find((option) => option.providerId === "guan_yu_red_card_attack") ?? null;
  const canUseWushengInPlay = Boolean(room.currentAction?.actorId === room.meId && room.currentAction.canDeclareAttack === true && (room.currentAction.playPhaseActions ?? []).some((action) => action.canPlayAs === "attack"));
  const canUseWushengInResponse = Boolean(wushengResponseOption);
  const wushengEligibleCardIds = wushengMode === "response"
    ? new Set(wushengResponseOption?.selection?.type === "cards" ? wushengResponseOption.selection.eligibleCardIds : [])
    : playPhaseAttackCardIds;
  const longdanResponseOptions = room.currentAction?.options?.filter((option) => option.providerId === "zhao_yun_dodge_as_attack" || option.providerId === "zhao_yun_attack_as_dodge") ?? [];
  const longdanResponseOption = longdanResponseOptions.find((option) => option.providerId === responseProviderId) ?? longdanResponseOptions[0] ?? null;
  const longdanPlayCardIds = new Set((room.currentAction?.playPhaseActions ?? []).filter((action) => action.canPlayAs === "attack" && room.myHand.some((item) => item.id === action.cardId && item.kind === "Dodge")).map((action) => action.cardId));
  const canUseLongdanInPlay = Boolean(me?.hero === "zhao-yun" && room.currentAction?.actorId === room.meId && room.currentAction.canDeclareAttack === true && longdanPlayCardIds.size > 0);
  const longdanEligibleCardIds = longdanMode === "response"
    ? new Set(longdanResponseOption?.selection?.type === "cards" ? longdanResponseOption.selection.eligibleCardIds : [])
    : longdanPlayCardIds;
  const selectedCanPlayAsAttack = Boolean(card && (isAttackCard(card) || wushengMode === "play" && playPhaseAttackCardIds.has(card.id) || longdanMode === "play" && longdanPlayCardIds.has(card.id)));
  const canDeclareAttack = Boolean(room.currentAction?.canDeclareAttack);
  const borrowedSwordPlayTargetIds = card?.kind === "BorrowedSword" && room.currentAction?.actorId === room.meId
    ? room.currentAction.borrowedSwordTargets?.find((projection) => projection.cardId === card.id)?.targetIds ?? []
    : [];
  const halberdAttack = Boolean(canDeclareAttack && selectedCanPlayAsAttack && me?.equipmentCards.some((equipment) => equipment.kind === "SkyPiercingHalberd") && room.myHand.length === 1);
  const setTarget = (playerId: string) => {
    if (!playerId) {
      setTargetIds([]);
      if (activeSkillStateIsCurrent) setActiveSkillSelectionState((state) => state ? { ...state, targetIds: [] } : state);
      return;
    }
    if (triggerTargetMode && triggerTargetSelection) {
      setTargetIds((ids) => ids.includes(playerId)
        ? ids.filter((id) => id !== playerId)
        : triggerTargetMax === 1 ? [playerId] : ids.length < triggerTargetMax ? [...ids, playerId] : ids);
      return;
    }
    if (activeSkillStateIsCurrent) {
      if (daqiaoDeflectionSelectionActive && !activeSkillTargetIds.includes(playerId)) return;
      const max = activeSkillSelection?.targetMax ?? activeSkillTargetSelection?.max ?? 1;
      setActiveSkillSelectionState((state) => {
        if (!state) return state;
        const current = state.targetIds.filter((id) => activeSkillTargetIds.includes(id));
        const next = daqiaoDeflectionSelectionActive
          ? current.includes(playerId) ? [] : [playerId]
          : max > 1
            ? current.includes(playerId) ? current.filter((id) => id !== playerId) : current.length < max ? [...current, playerId] : current
            : [playerId];
        return { ...state, targetIds: next };
      });
      if (!daqiaoDeflectionSelectionActive) {
        setTargetIds((current) => max > 1 ? current.includes(playerId) ? current.filter((id) => id !== playerId) : current.length < max ? [...current, playerId] : current : [playerId]);
      }
      return;
    }
    setTargetIds((ids) => activeSkillTargetIds.length ? [playerId] : halberdAttack ? ids.includes(playerId) ? ids.filter((id) => id !== playerId) : ids.length < 3 ? [...ids, playerId] : ids : [playerId]);
  };
  const toggleActiveSkillCardSelection = (cardId: string) => setActiveSkillSelectionState((state) => {
    if (!state || !activeSkillStateIsCurrent || !activeSkillSelection?.eligibleCardIds.includes(cardId)) return state;
    const validIds = state.cardIds.filter((id) => activeSkillSelection.eligibleCardIds.includes(id));
    if (daqiaoDeflectionSelectionActive) {
      return { ...state, cardIds: validIds.includes(cardId) ? [] : [cardId] };
    }
    return validIds.includes(cardId)
      ? { ...state, cardIds: validIds.filter((id) => id !== cardId) }
      : validIds.length < activeSkillSelection.max ? { ...state, cardIds: [...validIds, cardId] } : { ...state, cardIds: validIds };
  });
  const attackTargetsValid = targetIds.length > 0 && targetIds.every((id) => room.players.some((player) => player.id === id && player.alive && player.id !== room.meId && (player.distance ?? 99) <= (me?.attackRange ?? 1)));
  const canFormSerpentAttack = hasSerpentSpear && room.myHand.length >= 2 && room.isMyTurn && canPlay && canDeclareAttack;
  const responseDeadline = room.currentAction?.deadline ?? room.pendingNegation?.deadline ?? room.pendingGreenDragon?.deadline ?? room.pendingRockCleaving?.deadline ?? room.pendingDuel?.deadline ?? room.pendingAttack?.deadline ?? 0;
  const canRescue = room.phase === "dying" && room.isMyAction;
  const rescueDecisionReady = canRescue && !presentationBusy;
  const responseCardDisabled = (item: Card) => responseCardSelectionActive && (busy || !responseCardAllowed(item))
    || rescueDecisionReady && !canRespond && !dyingFirstAidSelectionActive && item.kind !== "Peach";
  const timelineKey = room.timeline.map((event) => event.id).join("|");
  useLayoutEffect(() => {
    const rail = handRailRef.current;
    if (!rail) return;
    const updateWidth = () => setHandRailWidth(rail.clientWidth);
    updateWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }
    const observer = new ResizeObserver(updateWidth);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [room.meId]);
  const handCardKey = room.myHand.map((item) => item.id).join("|");
  const handCardLayout = useMemo(() => ({
    step: calculateHandCardStep(handRailWidth, handCardKey ? handCardKey.split("|") : []),
    measured: handRailWidth > 0,
  }), [handRailWidth, handCardKey]);
  const handOverflows = handRailWidth > 0 && room.myHand.length > 1
    && 68 + (room.myHand.length - 1) * handCardLayout.step > handRailWidth + 1;
  useLayoutEffect(() => {
    const rail = handRailRef.current;
    if (!rail) return;
    const previous = handViewportSnapshotRef.current;
    if (previous && previous.viewerId === room.meId && previous.handKey !== handCardKey) {
      const currentIds = new Set(handCardKey ? handCardKey.split("|") : []);
      const nearestByIndex = (cards: HandViewportCardPosition[]) => cards
        .filter((card) => currentIds.has(card.id))
        .sort((left, right) => Math.abs(left.index - previous.anchorIndex) - Math.abs(right.index - previous.anchorIndex) || left.index - right.index)[0];
      const anchor = previous.anchorId && currentIds.has(previous.anchorId)
        ? previous.cards.find((card) => card.id === previous.anchorId)
        : nearestByIndex(previous.cards.filter((card) => card.visible)) ?? nearestByIndex(previous.cards);
      const slot = anchor && Array.from(rail.querySelectorAll<HTMLElement>("[data-hand-card-id]"))
        .find((element) => element.dataset.handCardId === anchor.id);
      if (anchor && slot) {
        const viewport = rail.getBoundingClientRect();
        rail.scrollLeft += slot.getBoundingClientRect().left - (viewport.left + anchor.left);
      }
    }
    handViewportSnapshotRef.current = captureHandViewportSnapshot(rail, room.meId);
  }, [handCardKey, room.meId]);
  useLayoutEffect(() => {
    const rail = handRailRef.current;
    const selectedCard = rail?.querySelector<HTMLElement>(".card-slot.single-selected");
    if (!rail || !selectedCard) return;
    const viewport = rail.getBoundingClientRect();
    const cardBounds = selectedCard.getBoundingClientRect();
    // Reveal only the newly selected card, without resetting a user's pan on
    // unrelated room updates or while they browse away from that selection.
    if (cardBounds.left < viewport.left) rail.scrollLeft += cardBounds.left - viewport.left;
    else if (cardBounds.right > viewport.right) rail.scrollLeft += cardBounds.right - viewport.right;
  }, [selected, room.meId]);
  const gameMessages = useMemo(() => latestPublicMessages(room.timeline, describeEvent), [room.timeline]);
  // A response is one decision, even when it has several providers.  Do not
  // expose (or start timing) one provider before the preceding public effect
  // has finished presenting: every provider and the decline branch open
  // together once the decision is visible.
  const triggerTargetSelection = selectedTriggerOption?.selection?.type === "target"
    ? selectedTriggerOption.selection
    : selectedTriggerOption?.selection?.type === "cards" && selectedTriggerOption.selection.targetIds?.length
      ? { type: "target" as const, targetIds: selectedTriggerOption.selection.targetIds, min: 1, max: 1 }
      : null;
  const triggerTargetMin = triggerTargetSelection?.min ?? 1;
  const triggerTargetMax = triggerTargetSelection?.max ?? 1;
  const triggerTargetMode = Boolean(triggerResponse && responseDecisionReady && triggerTargetSelection && responseProviderId === selectedTriggerOption?.effectId);
  const borrowedSwordTargetSelectionActive = Boolean(canChooseBorrowedSword && !presentationBusy);
  const targetSelectionActive = Boolean(borrowedSwordTargetSelectionActive || triggerTargetMode || activeSkillTargetMode || room.isMyTurn && canPlay && (serpentMode || selectedCanPlayAsAttack || card && ["Dismantle", "Steal", "Duel", "BorrowedSword", "Overindulgence", "RationsDepleted"].includes(card.kind)));
  const triggerTargetComplete = Boolean(triggerTargetMode && targetIds.length >= triggerTargetMin && targetIds.length <= triggerTargetMax);
  const triggerSubmissionComplete = triggerSelectionComplete && (!triggerTargetSelection || triggerTargetComplete);
  const normalTargetSelectionActive = targetSelectionActive && !borrowedSwordTargetSelectionActive && !triggerTargetMode && !activeSkillTargetMode;
  const localTargetFlow: LocalTargetFlow | null = borrowedSwordTargetSelectionActive ? "borrowed-sword" : triggerTargetMode ? "trigger" : activeSkillTargetMode ? "active-skill" : serpentMode ? "serpent" : normalTargetSelectionActive ? "normal" : null;
  const localTargetIds = borrowedSwordTargetSelectionActive ? (borrowedSwordTargetId ? [borrowedSwordTargetId] : []) : triggerTargetMode ? targetIds : activeSkillTargetMode ? activeSkillSelectedTargetIds : targetIds;
  const localDockTargetIds = activeSkillTargetMode ? activeSkillTargetIds : triggerTargetMode ? triggerTargetSelection?.targetIds ?? [] : [];
  const localDockSelfTargetable = localDockTargetIds.includes(room.meId);
  const localDockSelfTargetSelected = localDockSelfTargetable && localTargetIds.includes(room.meId);
  const localTargetMin = borrowedSwordTargetSelectionActive ? 1 : triggerTargetMode ? triggerTargetMin : activeSkillTargetMode ? activeSkillTargetMin : 1;
  const localTargetMax = borrowedSwordTargetSelectionActive ? 1 : triggerTargetMode ? triggerTargetMax : activeSkillTargetMode ? activeSkillTargetMax : halberdAttack ? 3 : 1;
  const localTargetCanConfirm = borrowedSwordTargetSelectionActive ? Boolean(borrowedSwordTargetId) : triggerTargetMode ? triggerTargetComplete : activeSkillTargetMode ? activeSkillComplete : serpentMode ? serpentSelected.length === 2 && attackTargetsValid : selectedCanPlayAsAttack ? attackTargetsValid : Boolean(target);
  const localSelectionHasInput = localTargetFlow === "borrowed-sword"
    ? Boolean(borrowedSwordTargetId)
    : localTargetFlow === "trigger"
    ? Boolean(responseProviderId) || localTargetIds.length > 0 || triggerSelectedCardIds.length > 0 || triggerSelectionKeys.length > 0 || Boolean(triggerChoice)
    : localTargetFlow === "active-skill"
      ? activeSkillStateIsCurrent
      : localTargetFlow === "serpent"
        ? true
    : localTargetFlow === "normal"
          ? Boolean(selected) || localTargetIds.length > 0 || Boolean(wushengMode) || Boolean(longdanMode)
          : false;
  const localTargetSelection = buildLocalTargetSelectionView({
    selectionActive: targetSelectionActive,
    selectedTargetIds: localTargetIds,
    minTargetCount: localTargetMin,
    maxTargetCount: localTargetMax,
    canConfirm: localTargetCanConfirm,
    hasLocalInput: localSelectionHasInput,
  });
  const activeSkillConfirmEnabled = daqiaoDeflectionSelectionActive
    ? daqiaoDeflectionReady
    : Boolean(
      canUseAction(room.currentAction, "trigger")
      && activeSkillComplete
      && activeSkillSubmission
      && (!(activeSkillTargetSelection || Boolean(activeSkillSelection?.targetIds.length)) || localTargetSelection.canConfirm),
    );
  const selectedExternalPreviewId = localTargetSelection.selectionActive
    ? [...localTargetSelection.selectedTargetIds].reverse().find((id) => id !== room.meId) ?? null
    : null;
  const previewTargetId = selectedExternalPreviewId ?? submittedTargetPreview?.targetId ?? null;
  const previewTargetPlayer = previewTargetId
    ? room.players.find((player) => player.id === previewTargetId && player.id !== room.meId)
    : null;
  const targetPreviewPresentation: LocalTargetPreviewPresentation | null = previewTargetPlayer ? {
    id: previewTargetPlayer.id,
    name: previewTargetPlayer.name,
    hero: heroDefinition(previewTargetPlayer.hero),
    hp: previewTargetPlayer.hp,
    maxHp: previewTargetPlayer.maxHp,
  } : null;
  const inspectionPlayer = expandedOpponentId
    ? room.players.find((player) => player.id === expandedOpponentId && player.id !== room.meId)
    : null;
  const opponentInspectionPresentation: LocalOpponentInspectionPresentation | null = inspectionPlayer ? {
    id: inspectionPlayer.id,
    name: inspectionPlayer.name,
    hero: heroDefinition(inspectionPlayer.hero),
    hp: inspectionPlayer.hp,
    maxHp: inspectionPlayer.maxHp,
    handCount: inspectionPlayer.handCount,
    equipmentCards: inspectionPlayer.equipmentCards,
    judgementCards: inspectionPlayer.judgementCards,
  } : null;
  const lustFramePresentationBlocked = Boolean(targetPreviewPresentation || opponentInspectionPresentation || expandedOpponentId || groupScopePreview.active);
  const pendingTargetCardSelectableTarget = pickerTarget
    && pendingTargetCardSelectableSelection?.targetId === pickerTarget.id
    && pickerTarget.alive
    ? pickerTarget
    : null;
  const pendingTargetCardUsesUnifiedModal = Boolean(
    canChooseTargetCard
    && (room.pendingTargetCard?.cardKind === "Steal" || room.pendingTargetCard?.cardKind === "Dismantle")
  );
  const pendingTargetCardActionName = room.pendingTargetCard ? targetCardActionName(room.pendingTargetCard.cardKind) : null;
  const pendingTargetCardSelectedKey = targetCardZone === "hand" && targetCardIndex !== null
    ? `hand:${targetCardIndex}`
    : targetCardId;
  const pendingTargetCardSelectedKeys = pendingTargetCardSelectedKey ? [pendingTargetCardSelectedKey] : [];
  const submitWithLocalTargetPreview = async (submit: () => Promise<boolean>) => {
    const targetId = [...localTargetSelection.selectedTargetIds].reverse().find((id) => id !== room.meId);
    if (!targetId) {
      setExpandedOpponentId(null);
      return submit();
    }
    const submission: LocalTargetPreviewSubmission = {
      targetId,
      presentationKey: presentationViewKey(clientPresentation),
      actionRevision: room.actionRevision ?? "",
      currentActionKey: currentActionViewKey(room.currentAction),
    };
    setExpandedOpponentId(null);
    setSubmittedTargetPreview(submission);
    const accepted = await submit();
    if (!accepted) setSubmittedTargetPreview((current) => current === submission ? null : current);
    return accepted;
  };
  const triggerHasProviderCancelSurface = Boolean(triggerTargetMode && selectedTriggerOption && !heroTriggerEffectIds.has(selectedTriggerOption.effectId));
  const normalHasProviderCancelSurface = wushengMode === "play" || longdanMode === "play";
  const resetLocalTargetFlow = (flow: LocalTargetFlow) => {
    setExpandedOpponentId(null);
    setTargetIds([]);
    if (flow === "normal") {
      setSelected(""); setWushengMode(null); setLongdanMode(null);
      return;
    }
    if (flow === "serpent") {
      setSerpentMode(false); setSerpentSelected([]); setSelected("");
      return;
    }
    if (flow === "active-skill") {
      setKingSkillId(""); setActiveSkillSelectionState(null); setSelected("");
      return;
    }
    if (flow === "borrowed-sword") {
      setBorrowedSwordTargetId("");
      return;
    }
    setResponseProviderId(""); setSelected(""); setSerpentSelected([]); setTriggerSelectedKeys([]); setTriggerChoice("");
    setWushengMode(null); setLongdanMode(null); setSerpentMode(false);
  };
  const clearPendingTargetCardSelection = () => {
    setTargetCardIndex(null); setTargetCardZone(""); setTargetCardId("");
    targetCardSubmissionRef.current = "";
  };
  const togglePendingTargetCardSelection = (key: string) => {
    if (!pendingTargetCardSelectableSelection?.eligibleKeys.includes(key)) return;
    if (pendingTargetCardSelectedKeys.includes(key)) {
      clearPendingTargetCardSelection();
      return;
    }
    const handPosition = /^hand:(0|[1-9]\d*)$/.exec(key);
    if (handPosition) {
      setTargetCardZone("hand"); setTargetCardIndex(Number(handPosition[1])); setTargetCardId("");
      return;
    }
    if (pendingTargetCardSelectableTarget?.equipmentCards.some((card) => card.id === key)) {
      setTargetCardZone("equipment"); setTargetCardId(key); setTargetCardIndex(null);
      return;
    }
    if (pendingTargetCardSelectableTarget?.judgementCards.some((card) => card.id === key)) {
      setTargetCardZone("judgement"); setTargetCardId(key); setTargetCardIndex(null);
    }
  };
  const pendingTargetCardSelectionComplete = Boolean(
    canChooseTargetCard && pickerTarget && targetCardZone &&
    (targetCardZone === "hand" ? targetCardIndex !== null && targetCardIndex >= 0 && targetCardIndex < pickerTarget.handCount :
      targetCardId && (targetCardZone === "equipment" ? pickerTarget.equipmentCards.some((card) => card.id === targetCardId) : pickerTarget.judgementCards.some((card) => card.id === targetCardId))),
  );
  const confirmPendingTargetCard = async (projectedEligibleKeys?: readonly string[]) => {
    const selectedKey = targetCardZone === "hand" && targetCardIndex !== null ? `hand:${targetCardIndex}` : targetCardId;
    if (!pendingTargetCardSelectionComplete || projectedEligibleKeys && !projectedEligibleKeys.includes(selectedKey) || busy || !room.pendingTargetCard) return;
    const payload = { targetCardZone, ...(targetCardZone === "hand" ? { targetCardIndex } : { targetCardId }) };
    const submissionKey = `${room.actionRevision ?? ""}|${room.pendingTargetCard.targetId}|${JSON.stringify(payload)}`;
    if (targetCardSubmissionRef.current === submissionKey) return;
    targetCardSubmissionRef.current = submissionKey;
    const accepted = await onAction("choose_target_card", payload);
    if (!accepted) targetCardSubmissionRef.current = "";
  };
  const submitPendingTargetCardPicker = (keys: string[]) => {
    if (
      keys.length !== 1
      || keys[0] !== pendingTargetCardSelectedKey
      || !pendingTargetCardSelectableSelection?.eligibleKeys.includes(keys[0])
      || room.currentAction?.kind !== "target_card"
      || !canUseAction(room.currentAction, "choose_target_card")
    ) return;
    void confirmPendingTargetCard(pendingTargetCardSelectableSelection.eligibleKeys);
  };
  const cancelTargetCardPicker = () => {
    if (busy || presentationBusy && !responseDecisionReady) return;
    if (activeSkillOption?.selection?.type === "target_cards") resetLocalTargetFlow("active-skill");
    else { setTriggerSelectedKeys([]); targetCardPickerSubmissionRef.current = ""; }
  };
  const submitTargetCardPicker = async (keys: string[]) => {
    if (!targetCardPickerOption || !targetCardPickerSelection || busy || !responseDecisionReady || !canUseAction(room.currentAction, "trigger")) return;
    const selectedKeys = keys.filter((key) => targetCardPickerSelection.eligibleKeys.includes(key));
    if (selectedKeys.length !== keys.length || selectedKeys.length < targetCardPickerSelection.min || selectedKeys.length > targetCardPickerSelection.max) return;
    const submissionKey = `${room.actionRevision ?? ""}|${targetCardPickerOption.effectId}|${selectedKeys.join("|")}`;
    if (targetCardPickerSubmissionRef.current === submissionKey) return;
    targetCardPickerSubmissionRef.current = submissionKey;
    const accepted = await onAction("trigger", { providerId: targetCardPickerOption.effectId, cardKeys: selectedKeys });
    if (!accepted) targetCardPickerSubmissionRef.current = "";
  };
  const cancelLocalTargetSelection = () => {
    const responseTargetSelection = responseDecisionReady && (triggerResponse || canRespond)
      && (localTargetFlow === "trigger" || localTargetFlow === "active-skill");
    if (!localTargetSelection.selectionActive || !localTargetFlow || busy || presentationBusy && !responseTargetSelection && !(localTargetFlow === "active-skill" && daqiaoDeflectionSelectionActive)) return;
    resetLocalTargetFlow(localTargetFlow);
  };
  const canUseLongdanInResponse = Boolean(me?.hero === "zhao-yun" && responseDecisionReady && longdanResponseOptions.length > 0);
  const wushengButtonDisabled = busy || wushengMode === null && (!canUseWushengInPlay && !(responseDecisionReady && canUseWushengInResponse) || canUseWushengInPlay && presentationBusy);
  const longdanButtonDisabled = busy || longdanMode === null && (!canUseLongdanInPlay && !(responseDecisionReady && canUseLongdanInResponse) || canUseLongdanInPlay && presentationBusy);
  const heroSkillButtons: HeroSkillButtonModel[] = (localHero?.skills ?? []).map((skill) => {
    if (me?.hero === "zhuge-liang" && skill.name === "Stargazing" && privateDeckReorder) return {
      name: skill.name,
      description: skill.description,
      enabled: false,
      active: true,
    };
    if (me?.hero === "guan-yu" && skill.name === "God of War") return {
      name: skill.name,
      description: skill.description,
      enabled: !wushengButtonDisabled || Boolean(wushengMode),
      active: Boolean(wushengMode),
      onClick: () => {
        if (wushengMode === "play") { setWushengMode(null); setSelected(""); setTargetIds([]); return; }
        if (wushengMode === "response") { setWushengMode(null); setResponseProviderId(""); setSelected(""); setSerpentSelected([]); return; }
        if (canUseWushengInPlay) { setWushengMode("play"); setSerpentMode(false); setSelected(""); setTargetIds([]); return; }
        if (canUseWushengInResponse && wushengResponseOption) { setWushengMode("response"); setResponseProviderId(wushengResponseOption.providerId); setSelected(""); setSerpentSelected([]); }
      },
    };
    if (me?.hero === "zhao-yun" && skill.name === "Braveheart") return {
      name: skill.name,
      description: skill.description,
      enabled: !longdanButtonDisabled || Boolean(longdanMode),
      active: Boolean(longdanMode),
      onClick: () => {
        if (longdanMode === "play") { setLongdanMode(null); setSelected(""); setTargetIds([]); return; }
        if (longdanMode === "response") { setLongdanMode(null); setResponseProviderId(""); setSelected(""); setSerpentSelected([]); return; }
        if (canUseLongdanInPlay) { setLongdanMode("play"); setWushengMode(null); setSerpentMode(false); setSelected(""); setTargetIds([]); return; }
        if (canUseLongdanInResponse && longdanResponseOption) { setLongdanMode("response"); setResponseProviderId(longdanResponseOption.providerId); setSelected(""); setSerpentSelected([]); }
      },
    };
    const responseEffectIds = HERO_SKILL_RESPONSE_IDS[me?.hero ?? ""]?.[skill.name] ?? [];
    const responseOption = (responseDecisionReady || skill.name === "First Aid" && dyingFirstAidAvailable)
      ? semanticResponseOptions.find((option) => responseEffectIds.includes(option.providerId)) ?? null
      : null;
    if (responseOption) {
      const active = Boolean(responseOption && responseProviderId === responseOption.providerId);
      return {
        name: skill.name,
        description: skill.description,
        enabled: Boolean(responseOption) || active,
        active,
        onClick: () => {
          const selecting = Boolean(responseOption && responseProviderId !== responseOption.providerId);
          setResponseProviderId(selecting ? responseOption?.providerId ?? "" : "");
          setSelected(""); setSerpentSelected([]); setTargetIds([]); setSerpentMode(false); setWushengMode(null); setLongdanMode(null);
        },
      };
    }
    const effectIds = HERO_SKILL_EFFECT_IDS[me?.hero ?? ""]?.[skill.name] ?? [];
    const option = activeSkillOptions.find((candidate) => effectIds.includes(candidate.effectId));
    if (HERO_PASSIVE_SKILL_NAMES[me?.hero ?? ""]?.includes(skill.name) && !option) return {
      name: skill.name,
      description: skill.description,
      enabled: false,
      active: false,
      passive: true,
    };
    const active = Boolean(option && kingSkillId === option.effectId);
    return {
      name: skill.name,
      description: skill.description,
      enabled: Boolean(option),
      active,
      onClick: option ? () => {
        if (option.selection?.type === "cards" || option.selection?.type === "target" || option.selection?.type === "target_cards") {
          const activating = kingSkillId !== option.effectId;
          if (!activating && option.effectId === "diao_chan_lust") resetLocalTargetFlow("active-skill");
          else if (!activating && option.selection?.type === "target") {
            // Other target skills keep their explicit local Cancel surface.
            // Lust alone uses a second skill tap to clear its ordered choice.
            return;
          } else if (!activating && option.selection?.type === "cards") resetLocalTargetFlow("active-skill");
          else {
            setKingSkillId(activating ? option.effectId : "");
            setActiveSkillSelectionState(activating ? { revision: activeActionRevision, effectId: option.effectId, cardIds: [], targetIds: [] } : null);
          }
          setSerpentSelected([]); setSelected(""); setTargetIds([]); setTriggerSelectedKeys([]);
        } else void onAction("trigger", { providerId: option.effectId });
      } : undefined,
    };
  });
  const responseControlsDisabled = busy || !responseDecisionReady;
  const triggerControlsDisabled = responseControlsDisabled || !canUseAction(room.currentAction, "trigger");
  const physicalResponseControlsDisabled = responseControlsDisabled || !genericResponse;
  const sharedHarvestSelection = room.pendingHarvest?.previewCardId && room.pendingHarvest.availableIds.includes(room.pendingHarvest.previewCardId) ? room.pendingHarvest.previewCardId : "";
  const activeHarvestSelection = canChooseHarvest && room.pendingHarvest?.availableIds.includes(harvestSelected) ? harvestSelected : sharedHarvestSelection;
  const harvestSelectedCard = room.pendingHarvest?.revealed.find((choice) => choice.id === activeHarvestSelection);
  const lastTimelineId = room.timeline.at(-1)?.id ?? "start";
  const livePendingSequence = pendingTimelineSequence(room);
  const livePendingStartId = livePendingSequence[0]?.id ?? "";
  const effectiveSequenceStartId = livePendingStartId || sequenceScopeStartId;
  const scopedTimelineEvents = (effectiveSequenceStartId ? timelineSequenceFrom(room, effectiveSequenceStartId) : livePendingSequence).filter(retainsAtPlayer);
  const scopedEventIds = new Set(scopedTimelineEvents.map((event) => event.id));
  const scopedCardIds = new Set(scopedTimelineEvents.flatMap(eventCards).map((item) => item.id));
  const scopedLocalEvents = effectiveSequenceStartId ? resolutionEvents.filter((event) => scopedEventIds.has(event.id) || eventCards(event).some((item) => scopedCardIds.has(item.id)) || event.id === optimisticPlay?.id) : resolutionEvents;
  const sequenceEvents = [...scopedTimelineEvents, ...scopedLocalEvents].filter(retainsAtPlayer).filter((event, index, all) => all.findIndex((candidate) => candidate.id === event.id || event.type === "card" && candidate.type === "card" && candidate.card.id === event.card.id) === index);
  const displayedEvent = activeEvent ?? optimisticPlay;
  const processedEventIds = new Set(processedTimelineKey.split("|"));
  const pendingPresentationEvents = [optimisticPlay, activeEvent, ...eventQueue, ...room.timeline.filter((event) => !processedEventIds.has(event.id))].filter((event): event is GameEvent => Boolean(event));
  const judgementInFlight = new Set(pendingPresentationEvents.flatMap((event) => settlesInJudgement(event) ? [event.card.id] : []));
  const privateDrawVisible = privateDrawCards.length > 0 && !activeEvent && eventQueue.length === 0;
  const privateDrawTimer = privateDrawVisible
    ? <Countdown key={privateDrawCards.map((drawn) => drawn.id).join("-")} durationMs={UI_TIMING.privateDraw} label="Cards close in" compactEvent />
    : null;
  const publicResponseWindow = room.phase === "response" && responseDeadline > 0 && (room.currentAction?.kind === "response" || responseDecisionReady && Boolean(room.actionPlayerId));
  const seatCountdown = publicResponseWindow ? { kind: "response" as const, key: `response-${responseDeadline}`, durationMs: 0, deadline: responseDeadline, label: "Response Time" }
    : room.pendingHarvest?.countdownUntil ? { kind: "harvest" as const, playerId: room.pendingHarvest.actorId, key: `harvest-${room.pendingHarvest.actorId}-${room.pendingHarvest.countdownUntil}`, durationMs: 0, deadline: room.pendingHarvest.countdownUntil, label: room.pendingHarvest.complete ? "Closing" : "Choosing" }
    : rescueDecisionReady && room.pendingDying?.deadline ? { kind: "rescue" as const, playerId: room.actionPlayerId ?? room.meId, key: `rescue-${room.pendingDying.deadline}`, durationMs: 0, deadline: room.pendingDying.deadline, label: "Rescue" }
    : null;
  const harvestEventTimer = seatCountdown?.kind === "harvest"
    ? <Countdown key={seatCountdown.key} durationMs={seatCountdown.durationMs} deadline={seatCountdown.deadline} label={seatCountdown.label} compactEvent />
    : null;
  // Legacy seat positioning remains available through the "--countdown-x" and "--countdown-y" table tokens.
  useEffect(() => { onActionRef.current = onAction; }, [onAction]);
  useEffect(() => {
    const events = room.timeline.map((event) => ({
      id: event.id,
      drawPlayerId: event.type === "message" ? event.drawPlayerId : event.type === "card" && "drawPlayerId" in event && typeof event.drawPlayerId === "string" ? event.drawPlayerId : undefined,
      gainedCardIds: event.type === "card" && event.action === "gain" ? [event.card.id] : [],
    }));
    const result = updatePrivateHand(knownHandCards.current, room.meId, room.myHand, events);
    knownHandCards.current = result.baseline;
    if (result.switched) {
      setPrivateDrawPresentation({ playerId: room.meId, cards: [] });
      cardInfoReturnFocusRef.current = null;
      setInfoCard(null); setTriggerSelectedKeys([]);
      return;
    }
    if (result.drawn.length) setPrivateDrawPresentation({ playerId: room.meId, cards: result.drawn });
  }, [room.meId, room.myHand, room.timeline]);
  useEffect(() => {
    const noticeScopeKey = JSON.stringify([room.code, room.meId]);
    if (effectNoticeScope.current !== noticeScopeKey) {
      effectNoticeScope.current = noticeScopeKey;
      seenEvents.current = new Set((room.timeline ?? []).map((event) => event.id));
      seenDiaoChanNoticeEventIds.current = new Set((room.presentationSnapshot?.diaoChanSkillNotices ?? []).map((notice) => notice.eventId));
      setProcessedTimelineKey(timelineKey);
      setEffectNotices([]);
    }
    const fresh = (room.timeline ?? []).filter((event) => !seenEvents.current.has(event.id));
    fresh.forEach((event) => seenEvents.current.add(event.id));
    const freshSkillSettlements = fresh.flatMap((event) => {
      if (event.type !== "message") return [];
      const proofs = skillEffectSettlements.filter((proof) => proof.eventId === event.id);
      if (proofs.length !== 1) return [];
      const proof = proofs[0];
      const eventProof = event.publicSkillEffectSettlement;
      return eventProof?.semantics === proof.semantics && eventProof.effectId === proof.effectId
        && eventProof.rootEventId === proof.rootEventId && eventProof.sourceId === proof.sourceId
        && eventProof.targetId === proof.targetId && eventProof.outcome === proof.outcome
        ? [proof]
        : [];
    });
    if (freshSkillSettlements.length === 1) setActiveSkillEffectSettlement({ eventId: freshSkillSettlements[0].eventId, exiting: false });
    const freshDismantleSettlements = fresh.flatMap((event) => {
      if (event.type !== "card" || event.action !== "discard") return [];
      const proofs = dismantleSettlements.filter((proof) => proof.eventId === event.id);
      if (proofs.length !== 1) return [];
      const proof = proofs[0];
      const eventProof = event.publicDismantleSettlement;
      return eventProof?.semantics === proof.semantics && eventProof.rootEventId === proof.rootEventId
        && eventProof.rootResolutionId === proof.rootResolutionId && eventProof.sourceId === proof.sourceId
        && eventProof.targetId === proof.targetId && eventProof.outcome === proof.outcome
        ? [proof]
        : [];
    });
    if (freshDismantleSettlements.length === 1) setActiveDismantleSettlement({ eventId: freshDismantleSettlements[0].eventId, exiting: false, journeySettled: false });
    const freshStealSettlements = fresh.flatMap((event) => {
      if (event.type !== "message") return [];
      const proofs = stealSettlements.filter((proof) => proof.eventId === event.id);
      if (proofs.length !== 1) return [];
      const proof = proofs[0];
      const eventProof = event.publicStealSettlement;
      return eventProof?.semantics === proof.semantics && eventProof.rootEventId === proof.rootEventId
        && eventProof.rootResolutionId === proof.rootResolutionId && eventProof.sourceId === proof.sourceId
        && eventProof.targetId === proof.targetId && eventProof.outcome === proof.outcome
        ? [proof]
        : [];
    });
    if (freshStealSettlements.length === 1) setActiveStealSettlement({ eventId: freshStealSettlements[0].eventId, exiting: false });
    const freshAttackHitSettlements = fresh.flatMap((event) => {
      if (event.type !== "message") return [];
      const proofs = attackHitSettlements.filter((proof) => proof.eventId === event.id);
      if (proofs.length !== 1) return [];
      const proof = proofs[0];
      const eventProof = event.publicAttackHitSettlement;
      if (!eventProof || eventProof.semantics !== proof.semantics || eventProof.rootEventId !== proof.rootEventId || eventProof.rootResolutionId !== proof.rootResolutionId
        || eventProof.sourceId !== proof.sourceId || eventProof.targetId !== proof.targetId || eventProof.outcome !== proof.outcome
        || persistedRetiredAttackDodgeEvents.has(proof.eventId) || persistedRetiredAttackDodgeEvents.has(proof.rootEventId)) return [];
      const settlementEvents = room.timeline.filter((candidate) => candidate.id === proof.eventId);
      const rootEvents = room.timeline.filter((candidate) => candidate.id === proof.rootEventId);
      if (settlementEvents.length !== 1 || rootEvents.length !== 1 || rootEvents[0].type !== "card") return [];
      const settlementIndex = room.timeline.findIndex((candidate) => candidate.id === proof.eventId);
      const publicActionEventIds = attackDodgePublicActionEvents(room.timeline)
        .filter((candidate) => candidate.timelineIndex <= settlementIndex)
        .map((candidate) => candidate.eventId);
      return [{ proof, lifecycle: {
        roomCode: room.code,
        phase: room.phase,
        turnSeat: room.turnSeat,
        eventId: proof.eventId,
        rootEventId: proof.rootEventId,
        rootResolutionId: proof.rootResolutionId,
        rootCardId: rootEvents[0].card.id,
        targetId: proof.targetId,
        publicActionEventIds,
      } }];
    });
    if (freshAttackHitSettlements.length === 1) setActiveAttackHitSettlement({
      eventId: freshAttackHitSettlements[0].proof.eventId,
      exiting: false,
      firstRenderedAt: null,
      lifecycle: freshAttackHitSettlements[0].lifecycle,
    });
    const freshGroupSettlements = fresh.flatMap((event) => {
      if (event.type !== "message") return [];
      const proofs = clientPresentation.groupSettlements.filter((proof) => proof.eventId === event.id);
      if (proofs.length !== 1) return [];
      const proof = proofs[0];
      const eventProof = event.publicGroupSettlement;
      return eventProof?.semantics === proof.semantics && eventProof.rootEventId === proof.rootEventId
        && eventProof.rootResolutionId === proof.rootResolutionId && eventProof.interactionId === proof.interactionId
        && eventProof.groupFrameId === proof.groupFrameId && eventProof.sourceId === proof.sourceId
        && eventProof.cardKind === proof.cardKind
        && JSON.stringify(eventProof.participants) === JSON.stringify(proof.participants)
        ? [proof]
        : [];
    });
    if (freshGroupSettlements.length === 1) setActiveGroupSettlement({ eventId: freshGroupSettlements[0].eventId, exiting: false });
    const freshBumperHarvestSettlements = fresh.flatMap((event) => {
      if (event.type !== "message") return [];
      const proofs = clientPresentation.bumperHarvestSettlements.filter((proof) => proof.eventId === event.id);
      if (proofs.length !== 1) return [];
      const proof = proofs[0];
      const eventProof = event.publicBumperHarvestSettlement;
      return eventProof?.semantics === proof.semantics && eventProof.rootEventId === proof.rootEventId
        && eventProof.rootResolutionId === proof.rootResolutionId && eventProof.interactionId === proof.interactionId
        && eventProof.rootFrameId === proof.rootFrameId && eventProof.sourceId === proof.sourceId
        && JSON.stringify(eventProof.participants) === JSON.stringify(proof.participants)
        ? [proof]
        : [];
    });
    if (freshBumperHarvestSettlements.length === 1) setActiveBumperHarvestSettlement({ eventId: freshBumperHarvestSettlements[0].eventId, exiting: false });
    const effect = fresh.filter((event) => event.type === "message" && event.effectNotice === true
      && Boolean(event.id.trim()) && room.timeline.filter((candidate) => candidate.id === event.id).length === 1).at(-1);
    const projectedDiaoChanNotices = room.presentationSnapshot?.diaoChanSkillNotices ?? [];
    const queuedNotices = room.timeline.flatMap((event) => {
      if (event.type !== "message" || !event.id.trim()
        || room.timeline.filter((candidate) => candidate.id === event.id).length !== 1) return [];
      const proofs = projectedDiaoChanNotices.filter((proof) => proof.eventId === event.id);
      if (proofs.length === 1 && diaoChanNoticeMatchesEvent(event.publicDiaoChanNotice, proofs[0])
        && !seenDiaoChanNoticeEventIds.current.has(event.id)) {
        const committedLustFrame = proofs[0].effectId === "diao_chan_lust" && proofs[0].notice === "ACTIVATION"
          && !lustFramePresentationBlocked
          ? verifiedLustCostFrameForEvent(room.timeline, projectedDiaoChanNotices,
            room.presentationSnapshot?.publicCardEffects ?? [], room.players, event.id)
          : null;
        if (committedLustFrame) {
          seenDiaoChanNoticeEventIds.current.add(event.id);
          return [];
        }
        const copy = diaoChanNoticeCopy(proofs[0], room.players);
        if (copy) {
          seenDiaoChanNoticeEventIds.current.add(event.id);
          return [{ roomCode: room.code, viewerId: room.meId, eventId: event.id, ...copy, exiting: false }];
        }
      }
      return effect?.id === event.id ? [{ roomCode: room.code, viewerId: room.meId, eventId: event.id, heading: "EFFECT TRIGGERED", message: event.message, exiting: false }] : [];
    });
    if (queuedNotices.length) setEffectNotices((current) => {
      const known = new Set(current.map((notice) => notice.eventId));
      return [...current, ...queuedNotices.filter((notice) => !known.has(notice.eventId))];
    });
    const immediatelyPresented = new Set<string>();
    const visible = fresh.filter((event) => {
      if (event.presentation === false) return false;
      // Informational text is not a blocking visual presentation.
      if (event.type === "message") return false;
      if (event.type === "card" && optimisticallyPresentedCards.current.delete(event.card.id)) { immediatelyPresented.add(event.id); return false; }
      if (event.type === "cards" && event.action === "play") {
        const matched = event.cards.map((card) => optimisticallyPresentedCards.current.delete(card.id));
        if (matched.every(Boolean)) { immediatelyPresented.add(event.id); return false; }
      }
      return true;
    });
    if (immediatelyPresented.size) setPresentedEventIds((ids) => new Set([...ids, ...immediatelyPresented]));
    if (visible.length) {
      setResolutionClosing(false);
      const cardsArrived = visible.some((event) => eventCards(event).length > 0);
      if (cardsArrived) resolutionRevision.current += 1;
      const latestResolutionId = visible.map((event) => event.resolutionId).filter(Boolean).at(-1);
      if (latestResolutionId && activeEvent?.resolutionId && activeEvent.resolutionId !== latestResolutionId && eventImportance(activeEvent) === "informational") setActiveEvent(null);
      if (!optimisticPlay && !activeEvent && eventQueue.length === 0) {
        const first = visible[0];
        if (first) {
          setActiveEvent(first);
          if (retainsAtPlayer(first)) setResolutionEvents((events) => appendUniqueEvents(events, [first]));
        }
        setEventQueue(coalescePresentationQueue([], visible.slice(1)));
      } else setEventQueue((queue) => coalescePresentationQueue(queue, visible));
    }
    setProcessedTimelineKey(timelineKey);
  }, [room.timeline, timelineKey, room.code, room.meId, room.phase, room.turnSeat, room.status, room.players, room.presentationSnapshot?.diaoChanSkillNotices, room.presentationSnapshot?.publicCardEffects, lustFramePresentationBlocked, optimisticPlay, activeEvent, eventQueue.length, skillEffectSettlements, dismantleSettlements, stealSettlements, attackHitSettlements, persistedRetiredAttackDodgeEvents, clientPresentation.groupSettlements, clientPresentation.bumperHarvestSettlements]);
  const effectNoticeEventId = effectNotice?.eventId ?? "";
  const effectNoticeRoomCode = effectNotice?.roomCode ?? "";
  const effectNoticeViewerId = effectNotice?.viewerId ?? "";
  useEffect(() => {
    if (!effectNoticeEventId) return;
    if (effectNoticeRoomCode !== room.code || effectNoticeViewerId !== room.meId) return;
    const eventId = effectNoticeEventId;
    const roomCode = effectNoticeRoomCode;
    const viewerId = effectNoticeViewerId;
    const exitTimer = window.setTimeout(() => setEffectNotices((current) => current.map((notice) => notice.eventId === eventId
      && notice.roomCode === roomCode && notice.viewerId === viewerId ? { ...notice, exiting: true } : notice)),
    Math.max(0, UI_TIMING.effectNotice - UI_TIMING.effectNoticeExit));
    const removeTimer = window.setTimeout(() => setEffectNotices((current) => current[0]?.eventId === eventId
      && current[0]?.roomCode === roomCode && current[0]?.viewerId === viewerId ? current.slice(1) : current), UI_TIMING.effectNotice);
    return () => { window.clearTimeout(exitTimer); window.clearTimeout(removeTimer); };
  }, [effectNoticeEventId, effectNoticeRoomCode, effectNoticeViewerId, room.code, room.meId]);
  useEffect(() => { if (!optimisticPlay) return; const timer = setTimeout(() => setOptimisticPlay(null), UI_TIMING.playedCard); return () => clearTimeout(timer); }, [optimisticPlay]);
  useEffect(() => { if (!livePendingStartId || livePendingStartId === sequenceScopeStartId) return; const timer = setTimeout(() => setSequenceScopeStartId(livePendingStartId), 0); return () => clearTimeout(timer); }, [livePendingStartId, sequenceScopeStartId]);
  useEffect(() => { if (!harvestSubmitting || room.pendingHarvest?.actorId === harvestSubmitting.playerId && !room.pendingHarvest.choices.some((choice) => choice.cardId === harvestSubmitting.cardId && choice.playerId === harvestSubmitting.playerId)) return; const timer = setTimeout(() => setHarvestSubmitting(null), 0); return () => clearTimeout(timer); }, [harvestSubmitting, room.pendingHarvest]);
  useEffect(() => { const turnKey = `${room.turnSeat}-${lastTimelineId}`; if (room.status !== "playing" || !room.phase?.startsWith("draw") || !canUseAction(room.currentAction, "draw") || activeEvent || eventQueue.length || hasUnseenPresentations || privateDrawCards.length || automaticDraw.current === turnKey) return; const noticeTimer = setTimeout(() => setTurnNotice(`${current?.name ?? "Player"}'s turn`), 0); const drawTimer = setTimeout(() => { setTurnNotice(""); if (room.isMyTurn && automaticDraw.current !== turnKey && canUseAction(room.currentAction, "draw")) { automaticDraw.current = turnKey; onActionRef.current("draw"); } }, UI_TIMING.turnDrawStart); return () => { clearTimeout(noticeTimer); clearTimeout(drawTimer); }; }, [room.turnSeat, room.phase, room.status, room.isMyTurn, room.currentAction, current?.name, lastTimelineId, hasUnseenPresentations, activeEvent, eventQueue.length, privateDrawCards.length]);
  useEffect(() => { if (optimisticPlay || activeEvent || !eventQueue.length) return; const timer = setTimeout(() => { const next = eventQueue[0]; setActiveEvent(next); if (retainsAtPlayer(next)) setResolutionEvents((events) => appendUniqueEvents(events, [next])); setEventQueue((queue) => queue.slice(1)); }, 0); return () => clearTimeout(timer); }, [optimisticPlay, activeEvent, eventQueue]);
  useEffect(() => { if (!activeEvent) return; const displayTime = activeEvent.type === "card" || activeEvent.type === "cards" ? isJudgementReveal(activeEvent) ? UI_TIMING.judgementCard : UI_TIMING.playedCard : 0; const timer = setTimeout(() => { setPresentedEventIds((ids) => ids.has(activeEvent.id) ? ids : new Set([...ids, activeEvent.id])); setActiveEvent(null); }, displayTime); return () => clearTimeout(timer); }, [activeEvent]);
  useEffect(() => { const resolutionPending = room.phase === "response" || room.phase === "dying" || room.phase === "resolving"; if (optimisticPlay || activeEvent || eventQueue.length || hasUnseenPresentations || resolutionPending || resolutionClosing || !resolutionEvents.length) return; const timer = setTimeout(() => setResolutionClosing(true), 0); return () => clearTimeout(timer); }, [optimisticPlay, activeEvent, eventQueue.length, hasUnseenPresentations, room.phase, resolutionClosing, resolutionEvents.length]);
  useEffect(() => { if (!resolutionClosing) return; const closingRevision = resolutionRevision.current; const timer = setTimeout(() => { if (resolutionRevision.current !== closingRevision) { setResolutionClosing(false); return; } setResolutionEvents([]); setSequenceScopeStartId(""); setResolutionClosing(false); }, UI_TIMING.sequenceDiscard); return () => clearTimeout(timer); }, [resolutionClosing]);
  useEffect(() => { if (!privateDrawCards.length || activeEvent || eventQueue.length) return; const timer = setTimeout(() => setPrivateDrawPresentation({ playerId: room.meId, cards: [] }), UI_TIMING.privateDraw); return () => clearTimeout(timer); }, [privateDrawCards, room.meId, activeEvent, eventQueue.length]);
  useEffect(() => { if (!infoCard && !infoHero && !expandedOpponentId) return; const close = (event: KeyboardEvent) => { if (event.key !== "Escape") return; if (infoCard) { closeCardDetails(); return; } if (infoHero) { closeHeroDetails(); return; } if (nestedInspectorCardDetailDismissRef.current?.()) return; setExpandedOpponentId(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [infoCard, infoHero, expandedOpponentId, closeCardDetails, closeHeroDetails]);
  useEffect(() => { heroInfoReturnFocusRef.current = null; const timer = setTimeout(() => setInfoHero(null), 0); return () => clearTimeout(timer); }, [room.code, room.meId]);
  useEffect(() => { const timer = setTimeout(() => { setSelected(""); setKingSkillId(""); setActiveSkillSelectionState(null); setWushengMode(null); setLongdanMode(null); setTargetIds([]); setTargetCardIndex(null); setTargetCardZone(""); setTargetCardId(""); setDiscardSelected([]); setSerpentMode(false); setSerpentSelected([]); setResponseProviderId(""); }, 0); return () => clearTimeout(timer); }, [room.turnSeat, room.phase, room.meId]);
  // A response may advance to another decision without changing the turn,
  // phase, or acting seat. The authoritative revision identifies that new
  // decision and prevents a previous provider/cost from leaking into it.
  useEffect(() => { const timer = setTimeout(() => { setKingSkillId(""); setActiveSkillSelectionState(null); setWushengMode(null); setLongdanMode(null); setResponseProviderId(""); setSelected(""); setTargetIds([]); setBorrowedSwordTargetId(""); setTargetCardIndex(null); setTargetCardZone(""); setTargetCardId(""); setSerpentSelected([]); setTriggerSelectedKeys([]); setTriggerChoice(""); targetCardSubmissionRef.current = ""; targetCardPickerSubmissionRef.current = ""; }, 0); return () => clearTimeout(timer); }, [room.actionRevision]);
  useEffect(() => {
    if (!submittedTargetPreview) return;
    const presentationUnchanged = presentationViewKey(clientPresentation) === submittedTargetPreview.presentationKey;
    const actionUnchanged = (room.actionRevision ?? "") === submittedTargetPreview.actionRevision
      && currentActionViewKey(room.currentAction) === submittedTargetPreview.currentActionKey;
    if (presentationUnchanged && actionUnchanged) return;
    const timer = setTimeout(() => {
      setSubmittedTargetPreview((current) => current === submittedTargetPreview ? null : current);
    }, 0);
    return () => clearTimeout(timer);
  }, [submittedTargetPreview, clientPresentation, room.actionRevision, room.currentAction]);
  useEffect(() => {
    if (!canChooseTargetCard || !pickerTarget) return;
    const valid = targetCardZone === "hand"
      ? targetCardIndex !== null && targetCardIndex >= 0 && targetCardIndex < pickerTarget.handCount
      : targetCardZone === "equipment"
        ? Boolean(targetCardId && pickerTarget.equipmentCards.some((card) => card.id === targetCardId))
        : targetCardZone === "judgement"
          ? Boolean(targetCardId && pickerTarget.judgementCards.some((card) => card.id === targetCardId))
          : false;
    if (valid) return;
    if (targetCardZone || targetCardIndex !== null || targetCardId) {
      const timer = setTimeout(clearPendingTargetCardSelection, 0);
      return () => clearTimeout(timer);
    }
  }, [canChooseTargetCard, pendingTargetCardAvailabilityKey, pickerTarget, targetCardZone, targetCardIndex, targetCardId]);
  useEffect(() => {
    if (!canChooseTargetCard || !pendingTargetCardProjection) return;
    const selectedKey = targetCardZone === "hand" && targetCardIndex !== null ? `hand:${targetCardIndex}` : targetCardId;
    if (!selectedKey || pendingTargetCardProjection.eligibleKeys.includes(selectedKey)) return;
    const timer = setTimeout(clearPendingTargetCardSelection, 0);
    return () => clearTimeout(timer);
  }, [canChooseTargetCard, pendingTargetCardProjectionKey, pendingTargetCardProjection, targetCardZone, targetCardIndex, targetCardId]);
  useEffect(() => {
    if (!targetCardPickerSelectionKey) return;
    const timer = setTimeout(() => {
      setTriggerSelectedKeys((keys) => keys.filter((key) => targetCardPickerEligibleKeys.includes(key)));
      targetCardPickerSubmissionRef.current = "";
    }, 0);
    return () => clearTimeout(timer);
  }, [targetCardPickerEligibleKeys, targetCardPickerSelectionKey]);
  useEffect(() => {
    if (canChooseBorrowedSword && (!borrowedSwordTargetId || borrowedSwordEligibleTargetIds.includes(borrowedSwordTargetId))) return;
    if (!borrowedSwordTargetId) return;
    const timer = setTimeout(() => setBorrowedSwordTargetId(""), 0);
    return () => clearTimeout(timer);
  }, [canChooseBorrowedSword, borrowedSwordTargetId, borrowedSwordEligibleTargetIds]);
  useEffect(() => {
    if ((wushengMode === "play" && canUseWushengInPlay) || (wushengMode === "response" && canUseWushengInResponse)) return;
    if (wushengMode === null) return;
    const timer = setTimeout(() => { setWushengMode(null); if (!canUseWushengInResponse) setResponseProviderId(""); setSelected(""); setTargetIds([]); }, 0);
    return () => clearTimeout(timer);
  }, [wushengMode, canUseWushengInPlay, canUseWushengInResponse]);
  useEffect(() => {
    if ((longdanMode === "play" && canUseLongdanInPlay) || (longdanMode === "response" && canUseLongdanInResponse)) return;
    if (longdanMode === null) return;
    const timer = setTimeout(() => { setLongdanMode(null); if (!canUseLongdanInResponse) setResponseProviderId(""); setSelected(""); setTargetIds([]); }, 0);
    return () => clearTimeout(timer);
  }, [longdanMode, canUseLongdanInPlay, canUseLongdanInResponse]);
  useEffect(() => { if (!responseTimerActive || !responseDamageAction && !triggerResponse) { automaticResponseTimeout.current = ""; return; } if (busy || !responseDecisionReady) return; const key = room.actionRevision ?? `${room.actionPlayerId}-${room.currentAction?.kind ?? "response"}`; const startKey = `start-${key}`; const timerPrefix = `timer-${key}-`; if (automaticResponseTimeout.current !== startKey && !automaticResponseTimeout.current.startsWith(timerPrefix)) { automaticResponseTimeout.current = startKey; onActionRef.current("start_response_timer"); return; } if (responseDeadline <= 0) return; automaticResponseTimeout.current = `timer-${key}-${responseDeadline}`; const timer = setTimeout(() => { automaticResponseTimeout.current = `expired-${key}-${responseDeadline}`; if (!triggerResponse) { if (responseDamageAction) void onActionRef.current(responseDamageAction); return; } if (triggerDeclineAction) { void onActionRef.current("decline_trigger"); return; } if (mandatoryChoiceTriggerOption?.timeoutChoiceId) void onActionRef.current("trigger", { providerId: mandatoryChoiceTriggerOption.effectId, choice: mandatoryChoiceTriggerOption.timeoutChoiceId }); }, delayUntil(responseDeadline)); return () => clearTimeout(timer); }, [responseTimerActive, triggerResponse, triggerDeclineAction, mandatoryChoiceTriggerOption?.effectId, mandatoryChoiceTriggerOption?.timeoutChoiceId, busy, responseDecisionReady, responseDeadline, responseDamageAction, room.actionPlayerId, room.actionRevision, room.currentAction?.kind]);
  useEffect(() => { if (!canRescue) { automaticRescueSkip.current = ""; return; } if (busy || presentationBusy) return; const key = `${room.pendingDying?.targetId}-${room.actionPlayerId}`; const deadline = room.pendingDying?.deadline ?? 0; if (deadline <= 0) { const startKey = `start-${key}`; if (automaticRescueSkip.current !== startKey) { automaticRescueSkip.current = startKey; onActionRef.current("start_rescue_timer"); } return; } const timerKey = `timer-${key}-${deadline}`; if (automaticRescueSkip.current === timerKey) return; automaticRescueSkip.current = timerKey; const timer = setTimeout(() => { automaticRescueSkip.current = `skip-${key}`; onActionRef.current("skip_rescue"); }, Math.max(0, deadline - Date.now())); return () => clearTimeout(timer); }, [canRescue, busy, presentationBusy, room.pendingDying?.targetId, room.pendingDying?.deadline, room.actionPlayerId]);
  const publishHarvestPreview = async (cardId: string) => { queuedHarvestPreview.current = cardId; if (harvestPreviewInFlight.current) return; harvestPreviewInFlight.current = true; while (queuedHarvestPreview.current !== null) { const nextCardId = queuedHarvestPreview.current; queuedHarvestPreview.current = null; await onAction("preview_harvest", { cardId: nextCardId || null }); } harvestPreviewInFlight.current = false; };
  const submitResponseProvider = async (provider = selectedResponseProvider) => {
    if (!provider || !genericResponse || !me) return;
    const selection = provider.selection;
    const selectedIds = provider.providerId === selectedResponseProvider?.providerId ? responseSelectedCardIds : [];
    if (selection && (selectedIds.length < selection.min || selectedIds.length > selection.max || selectedIds.some((id) => !selection.eligibleCardIds.includes(id)))) return;
    const materials = selectedIds.map((id) => room.myHand.find((item) => item.id === id)).filter((item): item is Card => Boolean(item));
    if (materials.length !== selectedIds.length) return;
    const responseTarget = room.pendingDying ? room.players.find((player) => player.id === room.pendingDying?.targetId)?.name ?? me.name : room.pendingDuel ? room.players.find((player) => player.id === room.pendingDuel?.opponentId)?.name ?? me.name : me.name;
    const optimisticEvent: GameEvent | null = materials.length === 1
      ? { id: `optimistic-response-${provider.providerId}-${materials[0].id}`, type: "card", player: me.name, target: responseTarget, card: materials[0], action: "play", ...(provider.playedAs ? { playedAs: provider.playedAs } : {}) }
      : materials.length > 1
        ? { id: `optimistic-response-${provider.providerId}-${materials.map((item) => item.id).join("-")}`, type: "cards", player: me.name, target: responseTarget, cards: materials, action: "play" }
        : null;
    // A Negation submitted during the shared window is still a private intent.
    // Only the server-selected winner may create a public card presentation.
    const presentImmediately = Boolean(optimisticEvent && !room.currentAction?.negationWindowId && !optimisticPlay && !activeEvent && eventQueue.length === 0);
    if (presentImmediately && optimisticEvent) { resolutionRevision.current += 1; materials.forEach((item) => optimisticallyPresentedCards.current.add(item.id)); setResolutionClosing(false); setResolutionEvents((events) => appendUniqueEvents(events, [optimisticEvent])); setOptimisticPlay(optimisticEvent); }
    setResponseProviderId(""); setLongdanMode(null); setSelected(""); setSerpentSelected([]);
    const accepted = await onAction("respond", { providerId: provider.providerId, ...(selectedIds.length === 1 ? { cardId: selectedIds[0] } : selectedIds.length > 1 ? { cardIds: selectedIds } : {}) });
    if (!accepted && presentImmediately && optimisticEvent) { materials.forEach((item) => optimisticallyPresentedCards.current.delete(item.id)); setOptimisticPlay(null); setResolutionEvents((events) => events.filter((event) => event.id !== optimisticEvent.id)); }
  };
  const playSerpentAttack = async () => {
    if (!me || !canPlay || !canDeclareAttack || serpentSelected.length !== 2) return;
    const materials = serpentSelected.map((id) => room.myHand.find((item) => item.id === id)).filter((item): item is Card => Boolean(item));
    if (materials.length !== 2) return;
    const responseTarget = room.pendingDuel ? room.players.find((player) => player.id === room.pendingDuel?.opponentId)?.name ?? me.name : me.name;
    const displayTarget = canPlay ? targetPlayer?.name : responseTarget;
    if (canPlay && (!attackTargetsValid || !displayTarget)) return;
    const optimisticEvent: CardGroupEvent = { id: `optimistic-serpent-${materials.map((item) => item.id).join("-")}`, type: "cards", player: me.name, target: displayTarget ?? me.name, cards: materials, action: "play" };
    const presentImmediately = !optimisticPlay && !activeEvent && eventQueue.length === 0;
    if (presentImmediately) {
      resolutionRevision.current += 1;
      materials.forEach((item) => optimisticallyPresentedCards.current.add(item.id));
      setResolutionClosing(false); setResolutionEvents((events) => appendUniqueEvents(events, [optimisticEvent])); setOptimisticPlay(optimisticEvent);
    }
    const action = "serpent_spear_attack";
    setSerpentMode(false); setSerpentSelected([]); setSelected(""); setTargetIds([]);
    const accepted = await submitWithLocalTargetPreview(() => onAction(action, { cardIds: materials.map((item) => item.id), targetId: target }));
    if (!accepted && presentImmediately) {
      materials.forEach((item) => optimisticallyPresentedCards.current.delete(item.id));
      setOptimisticPlay(null); setResolutionEvents((events) => events.filter((event) => event.id !== optimisticEvent.id));
    }
  };
  const chooseBorrowedSwordTarget = (playerId: string) => { if (!borrowedSwordTargetSelectionActive || !borrowedSwordEligibleTargetIds.includes(playerId)) return; setBorrowedSwordTargetId((currentId) => currentId === playerId ? "" : playerId); };
  const confirmBorrowedSwordTarget = async () => {
    if (!borrowedSwordTargetSelectionActive || !borrowedSwordTargetId || !borrowedSwordEligibleTargetIds.includes(borrowedSwordTargetId)) return;
    const targetId = borrowedSwordTargetId;
    setBorrowedSwordTargetId("");
    await submitWithLocalTargetPreview(() => onAction("choose_borrowed_sword_target", { targetId }));
  };
  const play = async () => {
    if (!card || !me || (selectedCanPlayAsAttack && (!canDeclareAttack || !attackTargetsValid)) || card.kind === "BorrowedSword" && (!target || !borrowedSwordPlayTargetIds.includes(target))) return;
    const playedCard = card;
    const definition = cardDefinition(card.kind);
    const needsTarget = selectedCanPlayAsAttack || ["Dismantle", "Steal", "Duel", "Overindulgence", "RationsDepleted", "BorrowedSword"].includes(card.kind);
    const displayTarget = halberdAttack
      ? targetIds.map((id) => room.players.find((player) => player.id === id)?.name).filter(Boolean).join(", ")
      : targetPlayer?.name ?? (card.kind === "BumperHarvest" || card.kind === "Oath" ? "All living players" : card.kind === "BarbarianInvasion" || card.kind === "RainingArrows" ? "All other players" : me.name);
    const optimisticEvent: CardEvent & { type: "card" } = {
      id: `optimistic-${card.id}`,
      type: "card",
      player: me.name,
      target: displayTarget,
      card,
      action: definition.equipmentSlot && !selectedCanPlayAsAttack ? "equip" : "play",
      ...(selectedCanPlayAsAttack && !isAttackCard(card) ? { playedAs: "attack" } : {}),
    };
    resolutionRevision.current += 1;
    optimisticallyPresentedCards.current.add(playedCard.id);
    setResolutionClosing(false);
    setResolutionEvents(retainsAtPlayer(optimisticEvent) ? [optimisticEvent] : []);
    setOptimisticPlay(optimisticEvent);
    setSelected("");
    setTargetIds([]);
    const accepted = await submitWithLocalTargetPreview(() => onAction("play_card", {
      cardId: playedCard.id,
      ...(selectedCanPlayAsAttack ? { playAs: "attack" } : {}),
      ...(needsTarget ? { targetId: target, ...(halberdAttack ? { targetIds } : {}) } : {}),
    }));
    if (!accepted) {
      optimisticallyPresentedCards.current.delete(playedCard.id);
      setOptimisticPlay(null);
      setResolutionEvents([]);
    }
  };
  const decisionPresentation = buildDecisionPresentation(room, clientPresentation);
  const publicActivityStatus = derivePublicActivityStatus(room);
  const publicActivitySeatLayoutKey = room.players.map((player) => `${player.id}:${player.seat}`).join("|");
  const currentActionOwnedByViewer = Boolean(room.currentAction?.actorId === room.meId && room.isMyAction && room.currentAction.kind !== "none");
  const targetCardPickerSelectedKeys = targetCardPickerSelection
    ? triggerSelectedKeys.filter((key) => targetCardPickerSelection.eligibleKeys.includes(key))
    : [];
  const targetCardPickerSelectionComplete = Boolean(targetCardPickerSelection
    && targetCardPickerSelectedKeys.length >= targetCardPickerSelection.min
    && targetCardPickerSelectedKeys.length <= targetCardPickerSelection.max);
  const targetCardPickerInLocalDock = Boolean(
    triggerResponse
    && responseDecisionReady
    && canUseAction(room.currentAction, "trigger")
    && targetCardPickerOption
    && targetCardPickerSelection
    && targetCardPickerTarget
    && targetCardPickerSelection.targetId === room.meId
    && targetCardPickerTarget.id === room.meId
    && supportsLocalEquipmentTargetSelection(targetCardPickerSelection, targetCardPickerTarget)
    && !targetPreviewPresentation
    && !opponentInspectionPresentation,
  );
  const targetCardPickerInModal = Boolean(
    triggerResponse
    && responseDecisionReady
    && targetCardPickerOption
    && targetCardPickerSelection
    && targetCardPickerTarget
    && !targetCardPickerInLocalDock
    && !targetPreviewPresentation
    && !opponentInspectionPresentation,
  );
  const attackDodgePublicActions = useMemo(() => attackDodgePublicActionEvents(room.timeline), [room.timeline]);
  const currentAttackRoot = clientPresentation.rootAction?.action === "ATTACK" ? clientPresentation.rootAction : null;
  const currentAttackRootIdentity: AttackDodgeResponseRootIdentity | null = useMemo(() => currentAttackRoot
    ? {
      rootEventId: currentAttackRoot.rootEventId,
      interactionId: currentAttackRoot.interactionId,
      rootFrameId: currentAttackRoot.rootFrameId,
      sourceId: currentAttackRoot.sourceId,
      targetId: currentAttackRoot.targetId,
    }
    : null, [currentAttackRoot]);
  const attackDodgeLifecycleProgress = {
    roomCode: room.code,
    status: room.status,
    phase: room.phase,
    turnSeat: room.turnSeat,
    currentAction: room.currentAction ? {
      kind: room.currentAction.kind,
      triggerEvent: room.currentAction.triggerEvent ?? null,
    } : null,
    interaction: room.presentationSnapshot?.interaction ? {
      semantics: room.presentationSnapshot.interaction.semantics,
      interactionId: room.presentationSnapshot.interaction.interactionId,
      rootFrameId: room.presentationSnapshot.interaction.rootFrameId,
    } : null,
    liveRoots: currentAttackRoot ? [{
      semantics: currentAttackRoot.semantics,
      rootEventId: currentAttackRoot.rootEventId,
      interactionId: currentAttackRoot.interactionId,
      rootFrameId: currentAttackRoot.rootFrameId,
      sourceId: currentAttackRoot.sourceId,
      targetId: currentAttackRoot.targetId,
    }] : [],
    publicActionEvents: attackDodgePublicActions,
  };
  const attackDodgeResponseEvaluations = (clientPresentation.attackDodgeResponses ?? []).map((proof) => {
    const rootEvents = room.timeline.filter((event) => event.id === proof.rootEventId);
    const responseEvents = room.timeline.filter((event) => event.id === proof.responseEventId);
    const rootEvent = rootEvents.length === 1 ? rootEvents[0] : null;
    const responseEvent = responseEvents.length === 1 ? responseEvents[0] : null;
    const reasons: string[] = [];
    if (rootEvents.length !== 1) reasons.push(rootEvents.length === 0 ? "root-event-missing" : "root-event-duplicate");
    if (responseEvents.length !== 1) reasons.push(responseEvents.length === 0 ? "response-event-missing" : "response-event-duplicate");
    if (!rootEvent || rootEvent.type !== "card" || rootEvent.action !== "play") reasons.push("root-event-not-public-card-play");
    else {
      if (rootEvent.presentation === false) reasons.push("root-event-presentation-suppressed");
      if (rootEvent.playedAs === undefined ? rootEvent.card.kind !== "Attack" : rootEvent.playedAs !== "attack" || rootEvent.card.kind === "Attack") reasons.push("root-event-not-attack");
      if (rootEvent.resolutionId !== proof.rootResolutionId) reasons.push("root-resolution-mismatch");
    }
    if (!responseEvent || responseEvent.type !== "card" || responseEvent.action !== "play") reasons.push("response-event-not-public-card-play");
    else {
      if (responseEvent.presentation === false) reasons.push("response-event-presentation-suppressed");
      if (!attackDodgeResponseEventMatchesProof(proof, responseEvent)) reasons.push("response-event-physical-semantic-proof-mismatch");
      if (responseEvent.resolutionId !== proof.responseResolutionId) reasons.push("response-resolution-mismatch");
    }
    if (proof.counterRelation !== "BLOCKS_TARGET_EFFECT") reasons.push("counter-relation-mismatch");
    if (proof.responseActorId !== proof.targetId) reasons.push("responder-target-mismatch");
    let lifecycleRetirementReason: ReturnType<typeof attackDodgeSettlementSupersessionReason> = null;
    if (reasons.length === 0) {
      const responsePublicAction = attackDodgePublicActions.find((event) => event.eventId === proof.responseEventId);
      if (!responsePublicAction) {
        reasons.push("response-event-not-in-public-action-stream");
      } else {
        const hold: AttackDodgeSettlementHoldIdentity = {
          roomCode: room.code,
          phase: "response",
          turnSeat: proof.turnSeatAtCommit ?? null,
          rootEventId: proof.rootEventId,
          responseEventId: proof.responseEventId,
          interactionId: proof.interactionId,
          rootFrameId: proof.rootFrameId,
          sourceId: proof.rootSourceId,
          targetId: proof.targetId,
          publicActionEventIds: attackDodgePublicActions
            .filter((event) => event.timelineIndex <= responsePublicAction.timelineIndex)
            .map((event) => event.eventId),
        };
        lifecycleRetirementReason = attackDodgeSettlementSupersessionReason(hold, attackDodgeLifecycleProgress);
        if (lifecycleRetirementReason) reasons.push(`completed-display-retired:${lifecycleRetirementReason}`);
      }
    }
    return { proof, rootEvent, responseEvent, reasons, lifecycleRetirementReason };
  });
  const serverRetiredAttackDodgeEvents = new Set(attackDodgeResponseEvaluations
    .filter(({ lifecycleRetirementReason }) => lifecycleRetirementReason !== null)
    .flatMap(({ proof }) => [proof.rootEventId, proof.responseEventId]));
  const serverRetiredAttackDodgeCards = new Set(attackDodgeResponseEvaluations
    .filter(({ lifecycleRetirementReason }) => lifecycleRetirementReason !== null)
    .flatMap(({ rootEvent, responseEvent }) => [rootEvent, responseEvent]
      .flatMap((event) => event?.type === "card" ? [event.card.id] : [])));
  const attackDodgeResponseCandidates = attackDodgeResponseEvaluations.flatMap(({ proof, rootEvent, responseEvent, reasons }) =>
    reasons.length === 0 && rootEvent?.type === "card" && responseEvent?.type === "card"
      ? [{ proof, rootEvent, responseEvent }]
      : []);
  const attackDodgeHoldSupersessionReason = activeAttackDodgeSettlement
    ? attackDodgeSettlementSupersessionReason(activeAttackDodgeSettlement.lifecycle, attackDodgeLifecycleProgress)
    : null;
  const attackDodgeHoldSuperseded = Boolean(attackDodgeHoldSupersessionReason);
  const visibleActiveAttackDodgeSettlement = attackDodgeHoldSuperseded ? null : activeAttackDodgeSettlement;
  const currentAttackRootIdentityKey = currentAttackRootIdentity
    ? JSON.stringify([currentAttackRootIdentity.rootEventId, currentAttackRootIdentity.interactionId, currentAttackRootIdentity.rootFrameId, currentAttackRootIdentity.sourceId, currentAttackRootIdentity.targetId])
    : "";
  const attackDodgeResponsesForCurrentRoot = currentAttackRootIdentity
    ? attackDodgeResponseCandidates.filter(({ proof }) => attackDodgeResponseMatchesRoot(proof, currentAttackRootIdentity))
    : [];
  const activeAttackDodgeSettlementProofKey = visibleActiveAttackDodgeSettlement
    ? attackDodgeResponseProofKey(visibleActiveAttackDodgeSettlement.proof)
    : null;
  const attackDodgeResponsesForActiveSettlement = visibleActiveAttackDodgeSettlement
    ? attackDodgeResponseCandidates.filter(({ proof }) => attackDodgeResponseProofKey(proof) === activeAttackDodgeSettlementProofKey)
    : [];
  const completedAttackDodgeSettlementCandidate = visibleActiveAttackDodgeSettlement?.phase === "complete" && activeAttackDodgeSettlementProofKey
    ? attackDodgeResponseCandidates.find(({ proof }) => attackDodgeResponseProofKey(proof) === activeAttackDodgeSettlementProofKey) ?? null
    : null;
  useEffect(() => {
    const observation = observedAttackDodgeProofs.current;
    if (!observation) return;
    if (observation.roomCode !== room.code) {
      observation.roomCode = room.code;
      observation.proofKeys = attackDodgeProofKeysFromTimeline(room.timeline);
      setNewAttackDodgeResponseProofs((current) => current.length === 0 ? current : []);
      return;
    }

    const arrivals = newlyObservedAttackDodgeResponseKeys(attackDodgeResponseCandidates, observation.proofKeys);
    const currentRootProofKeys = currentAttackRootIdentity
      ? new Set(attackDodgeResponseCandidates.flatMap(({ proof }) => attackDodgeResponseMatchesRoot(proof, currentAttackRootIdentity)
        ? [attackDodgeResponseProofKey(proof) ?? ""]
        : []))
      : null;
    const eligibleArrivals = filterAttackDodgeResponseArrivalsForRoot(arrivals, attackDodgeResponseCandidates, currentAttackRootIdentity);
    setNewAttackDodgeResponseProofs((current) => {
      const retained = current.filter((entry) => entry.roomCode === room.code
        && !attackDodgeSettlementCapturedEventIdsSnapshot.has(entry.responseEventId)
        && (!currentRootProofKeys || currentRootProofKeys.has(entry.proofKey)));
      const next = [...retained, ...eligibleArrivals.map((arrival) => ({ ...arrival, roomCode: room.code }))];
      const unique = [...new Map(next.map((entry) => [entry.proofKey, entry])).values()];
      return unique.length === current.length && unique.every((entry, index) => entry.roomCode === current[index].roomCode
        && entry.proofKey === current[index].proofKey && entry.responseEventId === current[index].responseEventId)
        ? current
        : unique;
    });
  }, [room.code, currentAttackRootIdentityKey, currentAttackRootIdentity, room.timeline, attackDodgeResponseCandidates, attackDodgeSettlementCapturedEventIdsSnapshot]);
  const pendingAttackDodgeResponseProofKeys = newAttackDodgeResponseProofs
    .filter((entry) => entry.roomCode === room.code && !attackDodgeSettlementCapturedEventIdsSnapshot.has(entry.responseEventId))
    .map((entry) => entry.proofKey);
  const attackDodgeResponseSelection = selectAttackDodgeResponseCandidate(attackDodgeResponseCandidates, {
    currentRoot: currentAttackRootIdentity,
    heldProofKey: visibleActiveAttackDodgeSettlement?.phase === "complete" ? null : activeAttackDodgeSettlementProofKey,
    newlyObservedProofKeys: pendingAttackDodgeResponseProofKeys,
  });
  const attackDodgeResponseCandidate = attackDodgeResponseSelection.candidate;
  const attackDodgeCandidateSelectionReason = attackDodgeResponseSelection.reason;
  const attackDodgeCandidateWasRetired = Boolean(attackDodgeResponseCandidate
    && (persistedRetiredAttackDodgeEvents.has(attackDodgeResponseCandidate.proof.rootEventId)
      || persistedRetiredAttackDodgeEvents.has(attackDodgeResponseCandidate.proof.responseEventId)));
  const attackDodgeCandidateIsSupersededHold = Boolean(attackDodgeHoldSuperseded && attackDodgeResponseCandidate
    && activeAttackDodgeSettlement?.eventId === attackDodgeResponseCandidate.proof.responseEventId);
  const attackDodgeDisplayCandidate = attackDodgeCandidateIsSupersededHold
    || attackDodgeCandidateWasRetired
    || visibleActiveAttackDodgeSettlement?.phase === "complete"
      && attackDodgeResponseCandidate?.proof.responseEventId === visibleActiveAttackDodgeSettlement.eventId
    ? null
    : attackDodgeResponseCandidate;
  const duelExchangeDisplayCandidate = (() => {
    const exchange = clientPresentation.duelExchange;
    if (!exchange || exchange.semantics !== "PROVEN" || exchange.responseCount !== exchange.responses.length
      || exchange.root.cardKind !== "Duel" || exchange.root.sourceId === exchange.root.targetId) return null;
    const rootMatches = room.timeline.filter((event) => event.id === exchange.root.eventId);
    if (rootMatches.length !== 1) return null;
    const rootEvent = rootMatches[0];
    if (rootEvent.type !== "card" || rootEvent.action !== "play" || rootEvent.presentation === false
      || rootEvent.playedAs !== undefined || rootEvent.card.kind !== "Duel"
      || rootEvent.resolutionId !== exchange.root.resolutionId) return null;
    const source = room.players.find((player) => player.id === exchange.root.sourceId);
    const target = room.players.find((player) => player.id === exchange.root.targetId);
    if (!source?.name || !target?.name) return null;
    const responses = exchange.responses.flatMap((response, index) => {
      if (response.ordinal !== index + 1 || response.relation !== "DUEL_EXCHANGE"
        || response.rootEventId !== exchange.root.eventId || response.rootResolutionId !== exchange.root.resolutionId
        || response.rootSourceId !== exchange.root.sourceId || response.rootTargetId !== exchange.root.targetId
        || response.responseResolutionId !== exchange.root.resolutionId
        || response.responseCardKind !== "Attack" || response.sourceId !== response.decisionActorId
        || response.sourceId === response.targetId
        || ![exchange.root.sourceId, exchange.root.targetId].includes(response.sourceId)
        || ![exchange.root.sourceId, exchange.root.targetId].includes(response.targetId)) return [];
      const responseMatches = room.timeline.filter((event) => event.id === response.responseEventId);
      if (responseMatches.length !== 1) return [];
      const responseEvent = responseMatches[0];
      const eventProof = responseEvent.type === "card" ? responseEvent.duelAttackResponse : undefined;
      if (responseEvent.type !== "card" || responseEvent.action !== "play" || responseEvent.presentation === false
        || responseEvent.resolutionId !== response.responseResolutionId
        || responseEvent.card.kind !== "Attack" && responseEvent.playedAs?.toLowerCase() !== "attack"
        || !eventProof || eventProof.semantics !== "PROVEN" || eventProof.relation !== "DUEL_EXCHANGE"
        || eventProof.interactionId !== exchange.interactionId
        || eventProof.rootFrameId !== exchange.rootFrameId || eventProof.rootEventId !== exchange.root.eventId
        || eventProof.rootResolutionId !== exchange.root.resolutionId
        || eventProof.rootSourceId !== exchange.root.sourceId || eventProof.rootTargetId !== exchange.root.targetId
        || eventProof.ordinal !== response.ordinal || eventProof.sourceId !== response.sourceId
        || eventProof.targetId !== response.targetId || eventProof.decisionActorId !== response.decisionActorId
        || eventProof.responseActorId !== response.responseActorId || eventProof.responseCardKind !== "Attack") return [];
      const responseActor = room.players.find((player) => player.id === response.responseActorId);
      const decisionActor = room.players.find((player) => player.id === response.decisionActorId);
      const responseTarget = room.players.find((player) => player.id === response.targetId);
      if (!responseActor?.name || !decisionActor?.name || !responseTarget?.name) return [];
      return [{ response, responseEvent, responseActor, decisionActor, responseTarget }];
    });
    if (responses.length !== exchange.responseCount) return null;
    const latest = responses.at(-1) ?? null;
    return {
      exchange, rootEvent, source, target, responses,
      response: latest?.response ?? null,
      responseEvent: latest?.responseEvent ?? null,
      responseActor: latest?.responseActor ?? null,
      decisionActor: latest?.decisionActor ?? null,
      responseTarget: latest?.responseTarget ?? null,
    };
  })();
  const lustDuelExchangeDisplayCandidate = (() => {
    const exchange = clientPresentation.lustDuelExchange;
    if (!exchange || exchange.semantics !== "PROVEN" || exchange.responseCount !== exchange.responses.length
      || exchange.root.ownerId === exchange.root.firstParticipantId
      || exchange.root.ownerId === exchange.root.secondParticipantId
      || exchange.root.firstParticipantId === exchange.root.secondParticipantId) return null;
    const costFrame = verifiedLustCostFrameForEvent(room.timeline,
      room.presentationSnapshot?.diaoChanSkillNotices ?? [],
      room.presentationSnapshot?.publicCardEffects ?? [], room.players, exchange.root.activationEventId);
    if (!costFrame || costFrame.activation.eventId !== exchange.root.activationEventId
      || costFrame.activation.costEventId !== exchange.root.costEventId
      || costFrame.costEvent.id !== exchange.root.costEventId || costFrame.costCard.id !== exchange.root.costCardId
      || costFrame.owner.id !== exchange.root.ownerId
      || costFrame.firstParticipant.id !== exchange.root.firstParticipantId
      || costFrame.secondParticipant.id !== exchange.root.secondParticipantId
      || costFrame.firstActor.id !== exchange.root.firstActorId
      || costFrame.activationEvent.resolutionId !== exchange.root.activationResolutionId
      || costFrame.costEvent.resolutionId !== exchange.root.costResolutionId) return null;

    const responses = exchange.responses.flatMap((response, index) => {
      if (response.ordinal !== index + 1 || response.relation !== "LUST_DUEL_EXCHANGE"
        || response.activationEventId !== exchange.root.activationEventId
        || response.activationResolutionId !== exchange.root.activationResolutionId
        || response.costEventId !== exchange.root.costEventId || response.costCardId !== exchange.root.costCardId
        || response.ownerId !== exchange.root.ownerId
        || response.firstParticipantId !== exchange.root.firstParticipantId
        || response.secondParticipantId !== exchange.root.secondParticipantId
        || response.firstActorId !== exchange.root.firstActorId
        || response.responseResolutionId !== exchange.root.activationResolutionId
        || response.responseCardKind !== "Attack" || response.sourceId !== response.decisionActorId
        || response.sourceId === response.targetId
        || ![exchange.root.firstParticipantId, exchange.root.secondParticipantId].includes(response.sourceId)
        || ![exchange.root.firstParticipantId, exchange.root.secondParticipantId].includes(response.targetId)) return [];
      const responseMatches = room.timeline.filter((event) => event.id === response.responseEventId);
      if (responseMatches.length !== 1) return [];
      const responseEvent = responseMatches[0];
      const eventProof = responseEvent.lustDuelAttackResponse;
      const cardFaces = eventCards(responseEvent);
      const eventCardIds = cardFaces.map((card) => card.id);
      const proofMatchesEvent = Boolean(eventProof && eventProof.semantics === "PROVEN"
        && eventProof.relation === "LUST_DUEL_EXCHANGE"
        && eventProof.interactionId === exchange.interactionId && eventProof.rootFrameId === exchange.rootFrameId
        && eventProof.activationEventId === exchange.root.activationEventId
        && eventProof.activationResolutionId === exchange.root.activationResolutionId
        && eventProof.costEventId === exchange.root.costEventId && eventProof.costCardId === exchange.root.costCardId
        && eventProof.ownerId === exchange.root.ownerId
        && eventProof.firstParticipantId === exchange.root.firstParticipantId
        && eventProof.secondParticipantId === exchange.root.secondParticipantId
        && eventProof.firstActorId === exchange.root.firstActorId
        && eventProof.ordinal === response.ordinal && eventProof.sourceId === response.sourceId
        && eventProof.targetId === response.targetId && eventProof.decisionActorId === response.decisionActorId
        && eventProof.responseActorId === response.responseActorId
        && eventProof.responseCardKind === "Attack"
        && eventProof.responseCardIds.length === response.responseCardIds.length
        && eventProof.responseCardIds.every((id, cardIndex) => id === response.responseCardIds[cardIndex]));
      const isPublicPhysicalPlay = (responseEvent.type === "card" || responseEvent.type === "cards")
        && responseEvent.action === "play" && responseEvent.presentation !== false
        && responseEvent.resolutionId === response.responseResolutionId
        && eventCardIds.length === response.responseCardIds.length
        && eventCardIds.every((id, cardIndex) => id === response.responseCardIds[cardIndex]);
      const naturalAttack = isPublicPhysicalPlay && responseEvent.playedAs !== "attack"
        && cardFaces.length > 0 && cardFaces.every((card) => card.kind === "Attack");
      const convertedAttack = isPublicPhysicalPlay && responseEvent.playedAs === "attack"
        && room.presentationSnapshot?.publicCardEffects.some((effect) => effect.eventId === responseEvent.id
          && effect.effectClass === "CONVERSION" && effect.resultingCardKind === "Attack"
          && effect.activationOwnerId === response.responseActorId && effect.targetId === response.targetId
          && effect.materials.length === cardFaces.length
          && effect.materials.every((material, cardIndex) => material.cardId === cardFaces[cardIndex]?.id
            && material.ownerId === response.responseActorId && material.toZone === "DISCARD")) === true;
      const noCardAttackNotice = responseEvent.type === "message" && responseEvent.effectNotice === true
        && responseEvent.presentation !== false && response.responseCardIds.length === 0
        && responseEvent.resolutionId === response.responseResolutionId;
      const responseActor = room.players.find((player) => player.id === response.responseActorId);
      const responseTarget = room.players.find((player) => player.id === response.targetId);
      if (!proofMatchesEvent || !responseActor?.name || !responseTarget?.name
        || !naturalAttack && !convertedAttack && !noCardAttackNotice) return [];
      return [{ response, responseEvent, responseActor, responseTarget, cardFaces }];
    });
    if (responses.length !== exchange.responseCount) return null;
    let settlementNotice: Extract<PresentationSnapshotDiaoChanSkillNotice, { effectId: "diao_chan_lust"; notice: "DUEL_RESULT" }> | null = null;
    let settlementCopy: ReturnType<typeof diaoChanNoticeCopy> = null;
    if (exchange.settlement) {
      const candidateNotices = (room.presentationSnapshot?.diaoChanSkillNotices ?? []).filter((notice): notice is Extract<PresentationSnapshotDiaoChanSkillNotice, { effectId: "diao_chan_lust"; notice: "DUEL_RESULT" }> =>
        notice.effectId === "diao_chan_lust" && notice.notice === "DUEL_RESULT"
        && notice.eventId === exchange.settlement?.eventId);
      const result = candidateNotices.length === 1 ? candidateNotices[0] : null;
      const resultEvents = room.timeline.filter((event) => event.id === exchange.settlement?.eventId);
      const resultEvent = resultEvents.length === 1 ? resultEvents[0] : null;
      if (!result || !resultEvent || resultEvent.type !== "message" || resultEvent.finalResult !== true
        || result.interactionId !== exchange.interactionId || result.rootFrameId !== exchange.rootFrameId
        || result.rootEventId !== exchange.root.activationEventId || result.sourceId !== exchange.root.ownerId
        || result.firstParticipantId !== exchange.root.firstParticipantId
        || result.secondParticipantId !== exchange.root.secondParticipantId
        || result.firstActorId !== exchange.root.firstActorId || result.responseCount !== exchange.responseCount
        || result.settledAt !== exchange.settlement.settledAt
        || result.failedPlayerId !== exchange.settlement.failedPlayerId
        || result.damageSourceId !== exchange.settlement.damageSourceId
        || result.damageAmount !== exchange.settlement.damageAmount || result.outcome !== exchange.settlement.outcome
        || !diaoChanNoticeMatchesEvent(resultEvent.publicDiaoChanNotice, result)) return null;
      settlementNotice = result;
      settlementCopy = diaoChanNoticeCopy(result, room.players);
      if (!settlementCopy || exchange.settlement.readRemainingMs <= 0) return null;
    } else if (exchange.currentParticipantId === null || exchange.decisionActorId === null) return null;
    return { exchange, costFrame, responses, settlementNotice, settlementCopy };
  })();
  const singleTargetNegationProofCandidates = (() => {
    const negationStage = buildInteractionStageView(clientPresentation, (playerId) => room.players.find((player) => player.id === playerId)?.name ?? null);
    const chain = buildReactionChainView(negationStage);
    const root = chain?.root;
    const links = chain?.publicEventLinks;
    const rootCard = negationStage.reactionChainRootCard;
    const targetBindingIsProven = Boolean(rootCard && root && (rootCard.cardKind === "Duel"
      ? root.targets.length === 2 && root.targets[0]?.id === rootCard.targetId && root.targets[1]?.id === root.source.id
      : root.targets.length === 1 && root.targets[0]?.id === rootCard.targetId));
    if (!chain?.visible || !root || !links || !chain.interactionId || !root.cardKind || !rootCard
      || !root.source.id || !root.targets[0]?.id || !targetBindingIsProven
      || rootCard.sourceId !== root.source.id || !rootCard.targetId
      || chain.negationNodes.length !== links.nodes.length) return [];
    const expectedRootEffectState = chain.negationNodes.length % 2 === 0 ? "ACTIVE" : "BLOCKED";
    if (chain.rootEffectState !== expectedRootEffectState) return [];
    const rootEvents = room.timeline.filter((event) => event.id === links.root.eventId);
    if (rootEvents.length !== 1) return [];
    const rootEvent = rootEvents[0];
    if (rootEvent.type !== "card" || rootEvent.action !== "play" || rootEvent.presentation === false
      || rootEvent.playedAs !== undefined || rootEvent.card?.kind !== root.cardKind
      || rootEvent.resolutionId !== links.root.resolutionId) return [];
    const responseEventIds = new Set([rootEvent.id]);
    const responseCardIds = new Set([rootEvent.card.id]);
    const responseNodes = chain.negationNodes.flatMap((node, index) => {
      const responseLink = links.nodes[index];
      const expectedCounterTarget = index === 0
        ? node.counterTarget?.kind === "ROOT"
        : node.counterTarget?.kind === "NEGATION_NODE" && node.counterTarget.index === index - 1;
      const responseEvents = responseLink ? room.timeline.filter((event) => event.id === responseLink.eventId) : [];
      const responseEvent = responseEvents.length === 1 ? responseEvents[0] : null;
      const responseActor = node.actor.id ? room.players.find((player) => player.id === node.actor.id) : undefined;
      if (!responseLink || !expectedCounterTarget || !node.actor.known || !responseActor?.name || !responseEvent
        || node.eventId !== responseLink.eventId || node.resolutionId !== responseLink.resolutionId
        || responseEvent.type !== "card" || responseEvent.action !== "play" || responseEvent.presentation === false
        || responseEvent.playedAs !== undefined || responseEvent.card?.kind !== "Negation"
        || !responseEvent.card.id || responseEvent.player !== responseActor.name
        || responseEvent.resolutionId !== responseLink.resolutionId) return [];
      if (responseEventIds.has(responseEvent.id) || responseCardIds.has(responseEvent.card.id)) return [];
      responseEventIds.add(responseEvent.id);
      responseCardIds.add(responseEvent.card.id);
      return [{ node, event: responseEvent, actor: responseActor }];
    });
    if (responseNodes.length !== chain.negationNodes.length) return [];
    return [{ chain, root, rootEvent, responseNodes }];
  })();
  const singleTargetNegationProofCandidate = singleTargetNegationProofCandidates.length === 1
    ? singleTargetNegationProofCandidates[0]
    : null;
  const singleTargetNegationActionKey = singleTargetNegationProofCandidate
    ? [singleTargetNegationProofCandidate.chain.interactionId, singleTargetNegationProofCandidate.chain.publicEventLinks?.root.eventId, singleTargetNegationProofCandidate.chain.rootEffectState, ...singleTargetNegationProofCandidate.responseNodes.flatMap(({ event, node }) => [event.id, node.actor.id ?? ""])].join(":")
    : null;
  const duelNegationProofCandidate = singleTargetNegationProofCandidate
    && clientPresentation.stage === "NEGATION"
    && clientPresentation.hasInteraction
    && typeof clientPresentation.rootFrameId === "string"
    && singleTargetNegationProofCandidate.root.cardKind === "Duel"
    && singleTargetNegationProofCandidate.root.source.id === clientPresentation.sourceId
    && singleTargetNegationProofCandidate.root.targets[0]?.id === clientPresentation.currentParticipantId
    && clientPresentation.activeTargetIds.length === 1
    && singleTargetNegationProofCandidate.root.targets[0]?.id === clientPresentation.activeTargetIds[0]
    && clientPresentation.originalTargetIds.length === 2
    && clientPresentation.originalTargetIds[0] === singleTargetNegationProofCandidate.root.targets[0]?.id
    && clientPresentation.originalTargetIds[1] === singleTargetNegationProofCandidate.root.source.id
    && singleTargetNegationProofCandidate.rootEvent.card?.kind === "Duel"
    && singleTargetNegationProofCandidate.chain.interactionId === clientPresentation.interactionId
    && singleTargetNegationProofCandidate.chain.publicEventLinks?.root.eventId === singleTargetNegationProofCandidate.rootEvent.id
    ? singleTargetNegationProofCandidate
    : null;
  const oathSimultaneousRootCandidate = (() => {
    const scope = clientPresentation.oathRecipientScope;
    const chain = clientPresentation.reactionChain;
    if (!clientPresentation.hasInteraction || clientPresentation.stage !== "NEGATION" || !scope || !chain
      || scope.semantics !== "PROVEN" || scope.cardKind !== "Oath"
      || scope.interactionId !== clientPresentation.interactionId
      || scope.rootFrameId !== clientPresentation.rootFrameId || scope.activeFrameId !== clientPresentation.activeFrameId
      || scope.checkpointId !== clientPresentation.checkpointId || scope.presentationRevision !== clientPresentation.presentationRevision
      || scope.sourceId !== clientPresentation.sourceId || scope.effectState !== (chain.nodes.length % 2 === 0 ? "ACTIVE" : "BLOCKED")
      || chain.semantics !== "PROVEN" || chain.rootCard !== null
      || chain.interactionId !== scope.interactionId || chain.frameId !== scope.activeFrameId
      || !Array.isArray(scope.recipientIds) || !scope.recipientIds.length
      || new Set(scope.recipientIds).size !== scope.recipientIds.length
      || !Array.isArray(chain.nodes) || !Array.isArray(chain.publicNodeEventLinks)
      || chain.publicNodeEventLinks.length !== chain.nodes.length) return null;
    const rootMatches = room.timeline.filter((event) => event.id === scope.rootEventId);
    if (rootMatches.length !== 1) return null;
    const rootEvent = rootMatches[0];
    if (rootEvent.type !== "card" || rootEvent.action !== "play" || rootEvent.presentation === false
      || rootEvent.playedAs !== undefined || rootEvent.card?.kind !== "Oath"
      || rootEvent.resolutionId !== scope.rootResolutionId || !rootEvent.card.id) return null;
    const source = room.players.find((player) => player.id === scope.sourceId);
    if (!source?.name || rootEvent.player !== source.name) return null;
    const recipients = scope.recipientIds.map((playerId) => {
      const player = room.players.find((candidate) => candidate.id === playerId);
      return player?.name ? { playerId, playerName: player.name } : null;
    });
    if (recipients.some((recipient) => recipient === null)) return null;
    const responseEventIds = new Set([rootEvent.id]);
    const responseCardIds = new Set([rootEvent.card.id]);
    const responses = chain.nodes.map((node, index) => {
      const link = chain.publicNodeEventLinks?.[index];
      const matches = link ? room.timeline.filter((event) => event.id === link.eventId) : [];
      const event = matches.length === 1 ? matches[0] : null;
      const actor = room.players.find((player) => player.id === node.actorId);
      if (!link || link.nodeId !== node.nodeId || !event || !actor?.name
        || node.causedByNodeId !== (index === 0 ? null : chain.nodes[index - 1]?.nodeId)
        || event.type !== "card" || event.action !== "play" || event.presentation === false
        || event.playedAs !== undefined || event.card?.kind !== "Negation"
        || event.resolutionId !== link.resolutionId || event.id === rootEvent.id
        || event.resolutionId === scope.rootResolutionId || event.player !== actor.name || !event.card.id
        || responseEventIds.has(event.id) || responseCardIds.has(event.card.id)
        || chain.publicNodeEventLinks?.slice(0, index).some((previous) => previous.eventId === event.id || previous.resolutionId === event.resolutionId)) return null;
      responseEventIds.add(event.id);
      responseCardIds.add(event.card.id);
      return {
        index,
        ordinal: index + 1,
        eventId: event.id,
        actorId: actor.id,
        actorName: actor.name,
        cardFace: event.card,
        cardLabel: "NEGATION",
        ariaLabel: `${actor.name} played Negation to counter ${index === 0 ? "Oath of the Peach Garden" : `Negation ${index}`}`,
        counterTarget: index === 0 ? { kind: "ROOT" as const } : { kind: "RESPONSE" as const, index: index - 1 },
      };
    });
    if (responses.some((response) => response === null)) return null;
    return {
      scope,
      chain,
      rootEvent,
      source,
      recipients: recipients as { playerId: string; playerName: string }[],
      responses: responses as NonNullable<(typeof responses)[number]>[],
    };
  })();
  const bumperHarvestRootCandidate = (() => {
    const progress = clientPresentation.bumperHarvestProgress;
    const isSequentialScene = clientPresentation.stage === "SEQUENTIAL_CHOICE"
      && clientPresentation.continuity.relation === "ROOT_FRAME"
      && progress?.activeFrameId === progress?.rootFrameId;
    const isNegationScene = clientPresentation.stage === "NEGATION"
      && clientPresentation.continuity.relation === "CHILD_FRAME"
      && progress?.activeFrameId !== progress?.rootFrameId;
    if (!clientPresentation.hasInteraction || (!isSequentialScene && !isNegationScene)
      || !progress || progress.semantics !== "PROVEN"
      || progress.interactionId !== clientPresentation.interactionId
      || progress.rootFrameId !== clientPresentation.rootFrameId
      || progress.activeFrameId !== clientPresentation.activeFrameId
      || progress.checkpointId !== clientPresentation.checkpointId
      || progress.presentationRevision !== clientPresentation.presentationRevision
      || progress.sourceId !== clientPresentation.sourceId
      || !progress.rootEventId || !progress.rootResolutionId || !progress.rootCardId
      || !progress.targetIds.length || progress.targetIds.length !== progress.participants.length
      || new Set(progress.targetIds).size !== progress.targetIds.length
      || progress.currentParticipantId !== clientPresentation.currentParticipantId) return null;

    const currentParticipants = progress.participants.filter(({ status }) => status === "CURRENT");
    if (!progress.currentParticipantId || currentParticipants.length !== 1
      || currentParticipants[0].playerId !== progress.currentParticipantId
      || progress.participants.some((participant, index) => participant.playerId !== progress.targetIds[index]
        || participant.order !== index + 1)) return null;

    const rootMatches = room.timeline.filter((event) => event.id === progress.rootEventId);
    if (rootMatches.length !== 1) return null;
    const rootEvent = rootMatches[0];
    if (rootEvent.type !== "card" || rootEvent.action !== "play" || rootEvent.presentation === false
      || rootEvent.playedAs !== undefined || rootEvent.card?.kind !== "BumperHarvest"
      || rootEvent.card.id !== progress.rootCardId || rootEvent.resolutionId !== progress.rootResolutionId) return null;
    const source = room.players.find((player) => player.id === progress.sourceId);
    if (!source?.name || rootEvent.player !== source.name) return null;
    const targets = progress.participants.map((participant) => {
      const player = room.players.find((candidate) => candidate.id === participant.playerId);
      return player?.name ? { ...participant, playerName: player.name } : null;
    });
    if (targets.some((target) => target === null)) return null;

    let responses: { index: number; ordinal: number; eventId: string; actorId: string; actorName: string; cardFace: Card; cardLabel: string; ariaLabel: string; counterTarget: { kind: "ORDERED_TARGET_EFFECT"; targetId: string } | { kind: "RESPONSE"; index: number } }[] = [];
    if (isNegationScene) {
      const chain = clientPresentation.reactionChain;
      if (!chain || chain.semantics !== "PROVEN" || chain.rootCard !== null
        || chain.interactionId !== progress.interactionId || chain.frameId !== progress.activeFrameId
        || !Array.isArray(chain.nodes) || !Array.isArray(chain.publicNodeEventLinks)
        || chain.publicNodeEventLinks.length !== chain.nodes.length
        || progress.currentEffectState !== (chain.nodes.length % 2 === 0 ? "ACTIVE" : "BLOCKED")) return null;
      const responseEventIds = new Set([rootEvent.id]);
      const responseCardIds = new Set([rootEvent.card.id]);
      const mapped = chain.nodes.map((node, index) => {
        const link = chain.publicNodeEventLinks?.[index];
        const matches = link ? room.timeline.filter((event) => event.id === link.eventId) : [];
        const event = matches.length === 1 ? matches[0] : null;
        const actor = room.players.find((player) => player.id === node.actorId);
        const previousNodeId = index === 0 ? null : chain.nodes[index - 1]?.nodeId;
        if (!link || link.nodeId !== node.nodeId || node.eventId !== link.eventId || node.resolutionId !== link.resolutionId
          || node.frameId !== progress.activeFrameId
          || node.causedByNodeId !== previousNodeId || !event || !actor?.name
          || event.type !== "card" || event.action !== "play" || event.presentation === false
          || event.playedAs !== undefined || event.card?.kind !== "Negation"
          || !link.eventId || !link.resolutionId || !event.card.id || event.player !== actor.name
          || event.id === rootEvent.id || event.resolutionId !== link.resolutionId
          || responseEventIds.has(event.id) || responseCardIds.has(event.card.id)
          || chain.publicNodeEventLinks?.slice(0, index).some((previous) => previous.eventId === event.id || previous.resolutionId === event.resolutionId)) return null;
        responseEventIds.add(event.id);
        responseCardIds.add(event.card.id);
        return {
          index,
          ordinal: index + 1,
          eventId: event.id,
          actorId: actor.id,
          actorName: actor.name,
          cardFace: event.card,
          cardLabel: "NEGATION",
          ariaLabel: `${actor.name} played Negation to counter ${index === 0 ? `Bumper Harvest's effect on ${room.players.find((player) => player.id === progress.currentParticipantId)?.name ?? "the current participant"}` : `Negation ${index}`}`,
          counterTarget: index === 0
            ? { kind: "ORDERED_TARGET_EFFECT" as const, targetId: progress.currentParticipantId! }
            : { kind: "RESPONSE" as const, index: index - 1 },
        };
      });
      if (mapped.some((response) => response === null)) return null;
      responses = mapped as typeof responses;
    } else if (progress.currentEffectState !== undefined || clientPresentation.reactionChain !== null) {
      return null;
    }

    return {
      progress,
      rootEvent,
      source,
      targets: targets as NonNullable<(typeof targets)[number]>[],
      responses,
    };
  })();
  const halberdOrderedRootCandidate = (() => {
    const group = clientPresentation.groupResolution;
    const rootProof = group?.orderedAttackRoot;
    const isRootResponse = clientPresentation.stage === "GROUP_RESOLUTION"
      && clientPresentation.continuity.relation === "ROOT_FRAME";
    const isChildDying = clientPresentation.stage === "DYING"
      && clientPresentation.continuity.relation === "CHILD_FRAME";
    if (!clientPresentation.hasInteraction || (!isRootResponse && !isChildDying)
      || !group || group.cardKind !== "SkyPiercingHalberdAttack" || group.resolutionSemantics !== "ORDERED"
      || group.interactionId !== clientPresentation.interactionId
      || group.groupFrameId !== clientPresentation.rootFrameId
      || group.activeFrameId !== clientPresentation.activeFrameId
      || group.checkpointId !== clientPresentation.checkpointId
      || group.presentationRevision !== clientPresentation.presentationRevision
      || group.currentParticipantId !== clientPresentation.currentParticipantId
      || !clientPresentation.sourceId || !rootProof
      || rootProof.semantics !== "PROVEN" || rootProof.relation !== "ORDERED_ATTACK_ROOT"
      || rootProof.cardKind !== "Attack" || rootProof.resolutionSemantics !== "ORDERED"
      || rootProof.interactionId !== group.interactionId || rootProof.groupFrameId !== group.groupFrameId
      || rootProof.sourceId !== clientPresentation.sourceId
      || rootProof.targetIds.length !== group.targetIds.length
      || rootProof.targetIds.some((targetId, index) => targetId !== group.targetIds[index])) return null;

    if (clientPresentation.rootOrigin && (clientPresentation.rootOrigin.frameId !== group.groupFrameId
      || clientPresentation.rootOrigin.stage !== "GROUP_RESOLUTION"
      || clientPresentation.rootOrigin.effect !== "SkyPiercingHalberdAttack"
      || clientPresentation.rootOrigin.sourceId !== clientPresentation.sourceId
      || clientPresentation.rootOrigin.targetIds.length !== group.targetIds.length
      || clientPresentation.rootOrigin.targetIds.some((targetId, index) => targetId !== group.targetIds[index]))) return null;

    const activeStatus = isChildDying ? "PAUSED" : "CURRENT";
    const activeParticipants = group.participants.filter(({ status }) => status === "CURRENT" || status === "PAUSED");
    if (!group.targetIds.length || group.targetIds.length !== group.participants.length
      || new Set(group.targetIds).size !== group.targetIds.length
      || activeParticipants.length !== 1 || activeParticipants[0]?.status !== activeStatus
      || activeParticipants[0]?.playerId !== group.currentParticipantId
      || group.participants.some((participant, index) => participant.playerId !== group.targetIds[index]
        || participant.order !== index + 1)) return null;

    const rootEvents = room.timeline.filter((event) => event.id === rootProof.rootEventId);
    if (rootEvents.length !== 1) return null;
    const rootEvent = rootEvents[0];
    if (rootEvent.type !== "card" || rootEvent.action !== "play" || rootEvent.presentation === false
      || rootEvent.id !== rootProof.rootEventId || rootEvent.resolutionId !== rootProof.rootEventResolutionId
      || rootEvent.card?.id !== rootProof.rootCardId || rootEvent.card.kind !== rootProof.physicalCardKind
      || rootEvent.playedAs !== rootProof.playedAs) return null;
    const source = room.players.find((player) => player.id === rootProof.sourceId);
    if (!source?.name || rootEvent.player !== source.name) return null;
    const targets = group.participants.map((participant) => {
      const player = room.players.find(({ id }) => id === participant.playerId);
      return player?.name ? { ...participant, playerName: player.name } : null;
    });
    if (targets.some((target) => target === null)) return null;
    return {
      group,
      rootProof,
      rootEvent,
      source,
      targets: targets as NonNullable<(typeof targets)[number]>[],
    };
  })();
  const groupTargetBranchCandidate = (() => {
    const group = clientPresentation.groupResolution;
    const rootOrigin = clientPresentation.rootOrigin;
    const isRootGroupScene = clientPresentation.stage === "GROUP_RESOLUTION"
      && clientPresentation.continuity.relation === "ROOT_FRAME";
    const negationStage = clientPresentation.stage === "NEGATION"
      ? buildInteractionStageView(clientPresentation, (playerId) => room.players.find((player) => player.id === playerId)?.name ?? null)
      : null;
    const negationChain = negationStage ? buildReactionChainView(negationStage) : null;
    const groupTargetEffectScope = negationChain?.groupTargetEffectScope ?? null;
    const isGroupNegationScene = clientPresentation.stage === "NEGATION"
      && clientPresentation.continuity.relation === "SAME_FRAME"
      && groupTargetEffectScope !== null;
    if (!clientPresentation.hasInteraction || (!isRootGroupScene && !isGroupNegationScene)
      || !group || group.resolutionSemantics !== "GROUP"
      || (group.cardKind !== "RainingArrows" && group.cardKind !== "BarbarianInvasion")
      || group.interactionId !== clientPresentation.interactionId
      || group.groupFrameId !== clientPresentation.rootFrameId
      || group.activeFrameId !== clientPresentation.activeFrameId
      || group.activeFrameId !== group.groupFrameId
      || group.checkpointId !== clientPresentation.checkpointId
      || group.presentationRevision !== clientPresentation.presentationRevision
      || group.currentParticipantId !== clientPresentation.currentParticipantId
      || !clientPresentation.sourceId) return null;

    if (rootOrigin && (rootOrigin.frameId !== group.groupFrameId || rootOrigin.stage !== "GROUP_RESOLUTION"
      || rootOrigin.effect !== group.cardKind || rootOrigin.source.id !== clientPresentation.sourceId
      || !rootOrigin.source.known || rootOrigin.targets.length !== group.targetIds.length
      || rootOrigin.targets.some((target, index) => target.id !== group.targetIds[index]))) return null;

    if (isGroupNegationScene && (!negationChain?.visible
      || negationChain.interactionId !== group.interactionId
      || !negationChain.root || negationChain.root.cardKind !== null
      || negationChain.root?.source.id !== clientPresentation.sourceId
      || !negationChain.root.source.known
      || negationChain.root.targets.length !== group.targetIds.length
      || negationChain.root.targets.some((target, index) => target.id !== group.targetIds[index])
      || negationChain.rootEffectState !== null
      || groupTargetEffectScope?.interactionId !== group.interactionId
      || groupTargetEffectScope.groupFrameId !== group.groupFrameId
      || groupTargetEffectScope.activeFrameId !== group.activeFrameId
      || groupTargetEffectScope.checkpointId !== group.checkpointId
      || groupTargetEffectScope.presentationRevision !== group.presentationRevision
      || groupTargetEffectScope.sourceId !== clientPresentation.sourceId
      || groupTargetEffectScope.cardKind !== group.cardKind
      || !group.targetIds.includes(groupTargetEffectScope.targetId))) return null;

    const participants = group.participants;
    if (!group.targetIds.length || group.targetIds.length !== participants.length
      || clientPresentation.groupParticipantProgress.length !== participants.length
      || participants.filter(({ status }) => status === "CURRENT").length !== 1
      || participants.some((participant, index) => participant.playerId !== group.targetIds[index]
        || participant.order !== index + 1
        || participant.playerId !== clientPresentation.groupParticipantProgress[index]?.playerId
        || participant.status !== clientPresentation.groupParticipantProgress[index]?.status
        || participant.outcome !== clientPresentation.groupParticipantProgress[index]?.outcome)) return null;

    // The Group root proof joins the event to the exact server-held physical
    // card and root frame. Legacy Group continuations without that identity
    // remain fail-closed instead of guessing from a timeline position.
    const rootProof = group.rootCardProof;
    if (!rootProof || rootProof.semantics !== "PROVEN" || rootProof.interactionId !== group.interactionId
      || rootProof.groupFrameId !== group.groupFrameId || rootProof.sourceId !== clientPresentation.sourceId
      || rootProof.cardKind !== group.cardKind || rootProof.targetIds.length !== group.targetIds.length
      || rootProof.targetIds.some((targetId, index) => targetId !== group.targetIds[index])) return null;
    const rootEventId = rootProof.rootEventId;
    const rootEvents = room.timeline.filter((event) => event.id === rootEventId);
    if (rootEvents.length !== 1) return null;
    const rootEvent = rootEvents[0];
    if (rootEvent.type !== "card" || rootEvent.action !== "play" || rootEvent.presentation === false
      || rootEvent.playedAs !== undefined || rootEvent.card.kind !== group.cardKind
      || rootEvent.card.id !== rootProof.rootCardId || rootEvent.resolutionId !== rootProof.rootEventResolutionId) return null;
    const responseEventIds = new Set([rootEvent.id]);
    const responseCardIds = new Set([rootEvent.card.id]);
    const responses = isGroupNegationScene ? negationChain!.negationNodes.map((node, index) => {
      const responseEvent = node.eventId
        ? room.timeline.filter((event) => event.id === node.eventId)
        : [];
      const event = responseEvent.length === 1 ? responseEvent[0] : null;
      const expectedCounterTarget = index === 0
        ? node.counterTarget?.kind === "GROUP_TARGET_EFFECT"
          && node.counterTarget.targetId === groupTargetEffectScope!.targetId
        : node.counterTarget?.kind === "NEGATION_NODE" && node.counterTarget.index === index - 1;
      const actor = node.actor.id ? room.players.find((player) => player.id === node.actor.id) : null;
      if (!node.eventId || !node.resolutionId || !node.actor.known || !actor?.name || !expectedCounterTarget || !event
        || event.type !== "card" || event.action !== "play" || event.presentation === false
        || event.playedAs !== undefined || event.card?.kind !== "Negation"
        || !event.card.id || event.id !== node.eventId || event.resolutionId !== node.resolutionId
        || event.player !== actor.name || responseEventIds.has(event.id) || responseCardIds.has(event.card.id)) return null;
      responseEventIds.add(event.id);
      responseCardIds.add(event.card.id);
      return {
        index,
        ordinal: index + 1,
        eventId: node.eventId,
        actorId: actor.id,
        actorName: actor.name,
        cardFace: event.card,
        cardLabel: "NEGATION",
        ariaLabel: `${actor.name} played Negation to counter ${index === 0
          ? `${cardDefinition(group.cardKind).name} effect on ${room.players.find((player) => player.id === groupTargetEffectScope!.targetId)?.name ?? "the proven target"}`
          : `Negation ${index}`}`,
        counterTarget: index === 0
          ? { kind: "GROUP_TARGET_EFFECT" as const, targetId: groupTargetEffectScope!.targetId }
          : { kind: "RESPONSE" as const, index: index - 1 },
      };
    }) : [];
    if (isGroupNegationScene && (responses.length !== negationChain!.negationNodes.length || responses.some((response) => response === null))) return null;
    const source = room.players.find((player) => player.id === clientPresentation.sourceId);
    if (!source?.name || rootEvent.player !== source.name) return null;
    const targets = participants.map((participant) => {
      const player = room.players.find(({ id }) => id === participant.playerId);
      return player?.name ? { ...participant, playerName: player.name } : null;
    });
    if (targets.some((target) => target === null)) return null;
    return {
      group,
      rootEvent,
      source,
      targets: targets as NonNullable<(typeof targets)[number]>[],
      groupTargetEffectScope: isGroupNegationScene ? groupTargetEffectScope : null,
      responses: responses as NonNullable<(typeof responses)[number]>[],
    };
  })();
  const groupSettlementCandidate = (() => {
    const settlement = clientPresentation.groupSettlements.find((candidate) => candidate.eventId === activeGroupSettlement?.eventId);
    if (!settlement || settlement.semantics !== "PROVEN") return null;
    const rootEvents = room.timeline.filter((event) => event.id === settlement.rootEventId);
    const settlementEvents = room.timeline.filter((event) => event.id === settlement.eventId);
    if (rootEvents.length !== 1 || settlementEvents.length !== 1) return null;
    const rootEvent = rootEvents[0];
    const settlementEvent = settlementEvents[0];
    if (rootEvent.type !== "card" || rootEvent.action !== "play" || rootEvent.presentation === false
      || rootEvent.playedAs !== undefined || rootEvent.card.kind !== settlement.cardKind
      || rootEvent.resolutionId !== settlement.rootResolutionId
      || settlementEvent.type !== "message" || settlementEvent.presentation === false
      || settlementEvent.importance !== "essential" || settlementEvent.finalResult !== true
      || settlementEvent.resolutionId !== settlement.rootResolutionId
      || settlementEvent.publicGroupSettlement?.semantics !== settlement.semantics
      || settlementEvent.publicGroupSettlement.rootEventId !== settlement.rootEventId
      || settlementEvent.publicGroupSettlement.rootResolutionId !== settlement.rootResolutionId
      || settlementEvent.publicGroupSettlement.interactionId !== settlement.interactionId
      || settlementEvent.publicGroupSettlement.groupFrameId !== settlement.groupFrameId
      || settlementEvent.publicGroupSettlement.sourceId !== settlement.sourceId
      || settlementEvent.publicGroupSettlement.cardKind !== settlement.cardKind
      || JSON.stringify(settlementEvent.publicGroupSettlement.participants) !== JSON.stringify(settlement.participants)) return null;
    const source = room.players.find((player) => player.id === settlement.sourceId);
    if (!source?.name || rootEvent.player !== source.name) return null;
    const targets = settlement.participants.map((participant) => {
      const player = room.players.find(({ id }) => id === participant.playerId);
      return player?.name ? { ...participant, playerName: player.name } : null;
    });
    if (targets.some((target) => target === null)) return null;
    return {
      settlement,
      rootEvent,
      settlementEvent,
      source,
      targets: targets as NonNullable<(typeof targets)[number]>[],
      exiting: activeGroupSettlement?.exiting === true,
    };
  })();
  const bumperHarvestSettlementCandidate = (() => {
    const settlement = clientPresentation.bumperHarvestSettlements.find((candidate) => candidate.eventId === activeBumperHarvestSettlement?.eventId);
    if (!settlement || settlement.semantics !== "PROVEN") return null;
    const rootEvents = room.timeline.filter((event) => event.id === settlement.rootEventId);
    const settlementEvents = room.timeline.filter((event) => event.id === settlement.eventId);
    if (rootEvents.length !== 1 || settlementEvents.length !== 1) return null;
    const rootEvent = rootEvents[0];
    const settlementEvent = settlementEvents[0];
    const rootProof = rootEvent.type === "card" ? rootEvent.bumperHarvestRoot : null;
    const eventProof = settlementEvent.type === "message" ? settlementEvent.publicBumperHarvestSettlement : null;
    if (rootEvent.type !== "card" || rootEvent.action !== "play" || rootEvent.presentation === false
      || rootEvent.playedAs !== undefined || rootEvent.card.kind !== "BumperHarvest"
      || rootEvent.resolutionId !== settlement.rootResolutionId
      || rootProof?.semantics !== "PROVEN" || rootProof.sourceId !== settlement.sourceId || rootProof.cardId !== rootEvent.card.id
      || rootProof.interactionId !== settlement.interactionId || rootProof.rootFrameId !== settlement.rootFrameId
      || settlementEvent.type !== "message" || settlementEvent.presentation === false
      || settlementEvent.importance !== "essential" || settlementEvent.finalResult !== true
      || settlementEvent.resolutionId !== settlement.rootResolutionId
      || eventProof?.semantics !== settlement.semantics || eventProof.rootEventId !== settlement.rootEventId
      || eventProof.rootResolutionId !== settlement.rootResolutionId || eventProof.interactionId !== settlement.interactionId
      || eventProof.rootFrameId !== settlement.rootFrameId || eventProof.sourceId !== settlement.sourceId
      || JSON.stringify(eventProof.participants) !== JSON.stringify(settlement.participants)) return null;
    const source = room.players.find((player) => player.id === settlement.sourceId);
    if (!source?.name || rootEvent.player !== source.name) return null;
    const targets = settlement.participants.map((participant) => {
      const player = room.players.find(({ id }) => id === participant.playerId);
      return player?.name ? { ...participant, playerName: player.name } : null;
    });
    if (targets.some((target) => target === null)) return null;
    return {
      settlement,
      rootEvent,
      settlementEvent,
      source,
      targets: targets as NonNullable<(typeof targets)[number]>[],
      exiting: activeBumperHarvestSettlement?.exiting === true,
    };
  })();
  const rootAction = clientPresentation.rootAction;
  const rootActionName = rootAction?.action === "ATTACK" ? "Attack"
    : rootAction?.cardKind === "Dismantle" ? "Burning Bridge"
    : rootAction ? cardDefinition(rootAction.cardKind).name : null;
  // A server-proven public Dodge owns this exact Attack root's visual
  // lifecycle, including the end of its read window. Do not let the still-live
  // CurrentAction replace the public card display or resurrect a bare Attack.
  const attackDodgeResponseOwnsCurrentRoot = Boolean(attackDodgeResponseCandidate && rootAction?.action === "ATTACK"
    && rootAction.rootEventId === attackDodgeResponseCandidate.proof.rootEventId
    && rootAction.interactionId === attackDodgeResponseCandidate.proof.interactionId
    && rootAction.rootFrameId === attackDodgeResponseCandidate.proof.rootFrameId
    && rootAction.sourceId === attackDodgeResponseCandidate.proof.rootSourceId
    && rootAction.targetId === attackDodgeResponseCandidate.proof.targetId);
  const skillEffectActionCandidate = (() => {
    const action = clientPresentation.skillEffectAction;
    if (!action || action.semantics !== "PROVEN" || action.effectId !== "zhou_yu_fanjian"
      || action.sourceId === action.targetId) return null;
    const rootEvents = room.timeline.filter((event) => event.id === action.rootEventId);
    if (rootEvents.length !== 1) return null;
    const rootEvent = rootEvents[0];
    if (rootEvent.type !== "message" || rootEvent.presentation === false
      || rootEvent.publicSkillEffect?.effectId !== action.effectId
      || rootEvent.publicSkillEffect.sourceId !== action.sourceId
      || rootEvent.publicSkillEffect.targetId !== action.targetId) return null;
    const source = room.players.find((player) => player.id === action.sourceId);
    const target = room.players.find((player) => player.id === action.targetId);
    if (!source?.name || !target?.name) return null;
    return { action, rootEvent, source, target };
  })();
  const skillEffectSettlementCandidate = (() => {
    const settlement = skillEffectSettlements.find((candidate) => candidate.eventId === activeSkillEffectSettlement?.eventId);
    if (!settlement || settlement.semantics !== "PROVEN" || settlement.effectId !== "zhou_yu_fanjian") return null;
    const rootEvents = room.timeline.filter((event) => event.id === settlement.rootEventId);
    const settlementEvents = room.timeline.filter((event) => event.id === settlement.eventId);
    if (rootEvents.length !== 1 || settlementEvents.length !== 1) return null;
    const rootEvent = rootEvents[0];
    const settlementEvent = settlementEvents[0];
    if (rootEvent.type !== "message" || rootEvent.presentation === false
      || rootEvent.publicSkillEffect?.effectId !== settlement.effectId
      || rootEvent.publicSkillEffect.sourceId !== settlement.sourceId
      || rootEvent.publicSkillEffect.targetId !== settlement.targetId
      || settlementEvent.type !== "message" || settlementEvent.presentation === false
      || settlementEvent.importance !== "essential" || settlementEvent.finalResult !== true
      || settlementEvent.publicSkillEffectSettlement?.semantics !== settlement.semantics
      || settlementEvent.publicSkillEffectSettlement.effectId !== settlement.effectId
      || settlementEvent.publicSkillEffectSettlement.rootEventId !== settlement.rootEventId
      || settlementEvent.publicSkillEffectSettlement.sourceId !== settlement.sourceId
      || settlementEvent.publicSkillEffectSettlement.targetId !== settlement.targetId
      || settlementEvent.publicSkillEffectSettlement.outcome !== settlement.outcome) return null;
    const source = room.players.find((player) => player.id === settlement.sourceId);
    const target = room.players.find((player) => player.id === settlement.targetId);
    if (!source?.name || !target?.name) return null;
    return { action: settlement, rootEvent, settlementEvent, source, target, exiting: activeSkillEffectSettlement?.exiting === true };
  })();
  const dismantleSettlementCandidate = (() => {
    const settlement = dismantleSettlements.find((candidate) => candidate.eventId === activeDismantleSettlement?.eventId);
    if (!settlement || settlement.semantics !== "PROVEN" || settlement.outcome !== "DISMANTLE_RESOLVED") return null;
    const rootEvents = room.timeline.filter((event) => event.id === settlement.rootEventId);
    const settlementEvents = room.timeline.filter((event) => event.id === settlement.eventId);
    if (rootEvents.length !== 1 || settlementEvents.length !== 1) return null;
    const rootEvent = rootEvents[0];
    const settlementEvent = settlementEvents[0];
    if (rootEvent.type !== "card" || rootEvent.presentation === false || rootEvent.action !== "play"
      || rootEvent.card.kind !== "Dismantle" || rootEvent.resolutionId !== settlement.rootResolutionId
      || settlementEvent.type !== "card" || settlementEvent.presentation === false || settlementEvent.action !== "discard"
      || settlementEvent.importance !== "essential" || settlementEvent.finalResult !== true
      || settlementEvent.resolutionId !== settlement.rootResolutionId
      || settlementEvent.publicDismantleSettlement?.semantics !== settlement.semantics
      || settlementEvent.publicDismantleSettlement.rootEventId !== settlement.rootEventId
      || settlementEvent.publicDismantleSettlement.rootResolutionId !== settlement.rootResolutionId
      || settlementEvent.publicDismantleSettlement.sourceId !== settlement.sourceId
      || settlementEvent.publicDismantleSettlement.targetId !== settlement.targetId
      || settlementEvent.publicDismantleSettlement.outcome !== settlement.outcome) return null;
    const source = room.players.find((player) => player.id === settlement.sourceId);
    const target = room.players.find((player) => player.id === settlement.targetId);
    if (!source?.name || !target?.name || source.id === target.id) return null;
    return { action: settlement, rootEvent, settlementEvent, source, target, exiting: activeDismantleSettlement?.exiting === true };
  })();
  const stealSettlementCandidate = (() => {
    const settlement = stealSettlements.find((candidate) => candidate.eventId === activeStealSettlement?.eventId);
    if (!settlement || settlement.semantics !== "PROVEN" || settlement.outcome !== "STEAL_RESOLVED") return null;
    const rootEvents = room.timeline.filter((event) => event.id === settlement.rootEventId);
    const settlementEvents = room.timeline.filter((event) => event.id === settlement.eventId);
    if (rootEvents.length !== 1 || settlementEvents.length !== 1) return null;
    const rootEvent = rootEvents[0];
    const settlementEvent = settlementEvents[0];
    if (rootEvent.type !== "card" || rootEvent.presentation === false || rootEvent.action !== "play"
      || rootEvent.card.kind !== "Steal" || rootEvent.resolutionId !== settlement.rootResolutionId
      || settlementEvent.type !== "message" || settlementEvent.presentation === false
      || settlementEvent.importance !== "essential" || settlementEvent.finalResult !== true
      || settlementEvent.resolutionId !== settlement.rootResolutionId
      || settlementEvent.publicStealSettlement?.semantics !== settlement.semantics
      || settlementEvent.publicStealSettlement.rootEventId !== settlement.rootEventId
      || settlementEvent.publicStealSettlement.rootResolutionId !== settlement.rootResolutionId
      || settlementEvent.publicStealSettlement.sourceId !== settlement.sourceId
      || settlementEvent.publicStealSettlement.targetId !== settlement.targetId
      || settlementEvent.publicStealSettlement.outcome !== settlement.outcome) return null;
    const source = room.players.find((player) => player.id === settlement.sourceId);
    const target = room.players.find((player) => player.id === settlement.targetId);
    if (!source?.name || !target?.name || source.id === target.id) return null;
    return { action: settlement, rootEvent, settlementEvent, source, target, exiting: activeStealSettlement?.exiting === true };
  })();
  const attackHitSettlementRetirementReason = activeAttackHitSettlement
    ? attackHitSettlementSupersessionReason(activeAttackHitSettlement.lifecycle, {
      roomCode: room.code,
      status: room.status,
      phase: room.phase,
      turnSeat: room.turnSeat,
      currentAction: room.currentAction ? { kind: room.currentAction.kind, triggerEvent: room.currentAction.triggerEvent ?? null } : null,
      liveRootEventId: clientPresentation.rootAction?.rootEventId ?? null,
      publicActionEvents: attackDodgePublicActions,
    })
    : null;
  const attackHitSettlementSuperseded = Boolean(attackHitSettlementRetirementReason);
  const attackHitSettlementCandidate = (() => {
    if (attackHitSettlementSuperseded) return null;
    const settlement = attackHitSettlements.find((candidate) => candidate.eventId === activeAttackHitSettlement?.eventId);
    if (!settlement || settlement.semantics !== "PROVEN" || settlement.outcome !== "ATTACK_DAMAGE_APPLIED") return null;
    const rootEvents = room.timeline.filter((event) => event.id === settlement.rootEventId);
    const settlementEvents = room.timeline.filter((event) => event.id === settlement.eventId);
    if (rootEvents.length !== 1 || settlementEvents.length !== 1) return null;
    const rootEvent = rootEvents[0];
    const settlementEvent = settlementEvents[0];
    if (rootEvent.type !== "card" || rootEvent.presentation === false || rootEvent.action !== "play"
      || rootEvent.card.kind !== "Attack" || rootEvent.playedAs !== undefined
      || rootEvent.resolutionId !== settlement.rootResolutionId
      || settlementEvent.type !== "message" || settlementEvent.presentation === false
      || settlementEvent.importance !== "essential" || settlementEvent.finalResult !== true
      || settlementEvent.resolutionId !== settlement.rootResolutionId
      || settlementEvent.publicAttackHitSettlement?.semantics !== settlement.semantics
      || settlementEvent.publicAttackHitSettlement.rootEventId !== settlement.rootEventId
      || settlementEvent.publicAttackHitSettlement.rootResolutionId !== settlement.rootResolutionId
      || settlementEvent.publicAttackHitSettlement.sourceId !== settlement.sourceId
      || settlementEvent.publicAttackHitSettlement.targetId !== settlement.targetId
      || settlementEvent.publicAttackHitSettlement.outcome !== settlement.outcome) return null;
    const source = room.players.find((player) => player.id === settlement.sourceId);
    const target = room.players.find((player) => player.id === settlement.targetId);
    if (!source?.name || !target?.name || source.id === target.id) return null;
    return { action: settlement, rootEvent, settlementEvent, source, target, exiting: activeAttackHitSettlement?.exiting === true };
  })();
  const rootActionEvents = rootAction ? room.timeline.filter((event) => event.id === rootAction.rootEventId) : [];
  const rootActionEvent = rootAction ? rootActionEvents.length === 1 ? rootActionEvents[0] : null
    : oathSimultaneousRootCandidate?.rootEvent ?? bumperHarvestRootCandidate?.rootEvent ?? halberdOrderedRootCandidate?.rootEvent ?? groupTargetBranchCandidate?.rootEvent ?? skillEffectActionCandidate?.rootEvent ?? skillEffectSettlementCandidate?.rootEvent ?? dismantleSettlementCandidate?.rootEvent ?? stealSettlementCandidate?.rootEvent ?? attackHitSettlementCandidate?.rootEvent ?? duelExchangeDisplayCandidate?.rootEvent ?? attackDodgeDisplayCandidate?.rootEvent ?? singleTargetNegationProofCandidate?.rootEvent ?? groupSettlementCandidate?.rootEvent ?? null;
  const rootActionCardFace = rootAction && rootActionEvent?.type === "card"
    && rootActionEvent.id === rootAction.rootEventId && rootActionEvent.action === "play"
    && rootActionEvent.presentation !== false
    && rootActionEvent.card.kind === (rootAction.action === "ATTACK" ? rootAction.physicalCardKind : rootAction.cardKind)
    && rootActionEvent.playedAs === (rootAction.action === "ATTACK" ? rootAction.playedAs : undefined)
    ? rootActionEvent.card : null;
  const selfTargetCandidates = rootAction || oathSimultaneousRootCandidate || bumperHarvestRootCandidate || halberdOrderedRootCandidate || groupTargetBranchCandidate || skillEffectActionCandidate || skillEffectSettlementCandidate || dismantleSettlementCandidate || stealSettlementCandidate || attackHitSettlementCandidate || duelExchangeDisplayCandidate || attackDodgeDisplayCandidate || singleTargetNegationProofCandidate || groupSettlementCandidate ? [] : (clientPresentation.selfTargetActions ?? []).flatMap((action) => {
    const event = room.timeline.find((candidate) => candidate.id === action.rootEventId);
    if (!event || event.type !== "card" || event.action !== "play" || event.presentation === false
      || event.resolutionId !== action.resolutionId || event.card.kind !== action.cardKind
      || action.sourceId !== action.targetId) return [];
    const matchingSequenceEvents = sequenceEvents.filter((candidate) => eventCards(candidate).some((card) => card.id === event.card.id));
    if (matchingSequenceEvents.length !== 1) return [];
    const isDisplayedEvent = Boolean(displayedEvent && eventCards(displayedEvent).some((card) => card.id === event.card.id));
    const isSettledEvent = !displayedEvent && eventQueue.length === 0 && !hasUnseenPresentations;
    if (eventQueue.length > 0 || !isDisplayedEvent && !isSettledEvent) return [];
    const source = room.players.find((player) => player.id === action.sourceId);
    if (!source) return [];
    return [{ action, event, source }];
  });
  const selfTargetCandidate = selfTargetCandidates.length === 1 ? selfTargetCandidates[0] : null;
  const activeNegationReadIdentityMatches = Boolean(activePublicNegationRead
    && (!clientPresentation.interactionId || clientPresentation.interactionId === activePublicNegationRead.action.interactionId)
    && (!clientPresentation.rootFrameId || clientPresentation.rootFrameId === activePublicNegationRead.action.rootFrameId)
    && (!rootAction || rootAction.rootEventId === activePublicNegationRead.action.rootEventId));
  const activeNegationReadSettled = Boolean(activePublicNegationRead
    && room.presentationSnapshot?.interaction?.stage !== "NEGATION"
    && clientPresentation.negationSettlement?.semantics === "PROVEN"
    && clientPresentation.negationSettlement.interactionId === activePublicNegationRead.action.interactionId
    && clientPresentation.negationSettlement.rootFrameId === activePublicNegationRead.action.rootFrameId
    && clientPresentation.negationSettlement.rootCardKind === activePublicNegationRead.action.cardKind
    && clientPresentation.negationSettlement.sourceId === activePublicNegationRead.action.sourceId
    && clientPresentation.negationSettlement.targetId === activePublicNegationRead.action.targetId
    && room.timeline.some((event) => event.id === activePublicNegationRead.action.rootEventId
      && event.type === "card" && event.resolutionId === clientPresentation.negationSettlement?.resolutionId));
  const activeNegationReadStillLive = Boolean(activePublicNegationRead
    && room.presentationSnapshot?.interaction?.semantics === "PROVEN"
    && room.presentationSnapshot.interaction.stage === "NEGATION"
    && room.presentationSnapshot.interaction.interactionId === activePublicNegationRead.action.interactionId
    && room.presentationSnapshot.interaction.rootFrameId === activePublicNegationRead.action.rootFrameId
    && room.presentationSnapshot.reactionChain?.semantics === "PROVEN"
    && room.presentationSnapshot.reactionChain.interactionId === activePublicNegationRead.action.interactionId
    && room.presentationSnapshot.reactionChain.frameId === activePublicNegationRead.action.rootFrameId
    && room.presentationSnapshot.reactionChain.publicEventLinks?.root.eventId === activePublicNegationRead.action.rootEventId);
  const heldPublicNegationReadAction = activeNegationReadIdentityMatches && activePublicNegationRead
    && (activeNegationReadStillLive || activeNegationReadSettled)
    && !(activePublicNegationRead.action.cardKind === "Duel" && (duelNegationProofCandidate || duelExchangeDisplayCandidate))
    && (!singleTargetNegationActionKey || singleTargetNegationActionKey === activePublicNegationRead.key
      || activePublicNegationRead.action.cardKind === "Duel" && activePublicNegationRead.action.rootEventId === duelNegationProofCandidate?.rootEvent.id)
    ? {
      ...activePublicNegationRead.action,
      ...((activePublicNegationRead.action.motion?.type === "single-target" || activePublicNegationRead.action.motion?.type === "negation") && activeNegationReadSettled
        ? { phaseNotice: undefined }
        : {}),
      ...((activePublicNegationRead.action.motion?.type === "single-target" || activePublicNegationRead.action.motion?.type === "negation")
        && activeNegationReadSettled && clientPresentation.negationSettlement ? {
        settlement: {
          eventId: clientPresentation.negationSettlement.eventId,
          outcome: clientPresentation.negationSettlement.outcome,
          exiting: activePublicNegationRead.phase === "exiting",
        },
      } : {}),
      publicCounterRead: {
        eventId: activePublicNegationRead.action.publicCounterRead!.eventId,
        exiting: activePublicNegationRead.phase === "exiting" && activeNegationReadSettled,
      },
    }
    : null;
  const singleTargetNegationSettlement = (() => {
    const candidate = singleTargetNegationProofCandidate;
    const proof = clientPresentation.negationSettlement;
    if (!candidate || !proof || proof.semantics !== "PROVEN"
      || proof.interactionId !== candidate.chain.interactionId
      || proof.rootFrameId !== clientPresentation.rootFrameId
      || proof.rootCardKind !== candidate.root.cardKind
      || proof.sourceId !== candidate.root.source.id
      || proof.targetId !== candidate.root.targets[0]?.id) return null;
    const settlementEvents = room.timeline.filter((event) => event.id === proof.eventId);
    if (settlementEvents.length !== 1) return null;
    const event = settlementEvents[0];
    if (event.type !== "message" || event.presentation === false || event.resolutionId !== proof.resolutionId) return null;
    return { eventId: proof.eventId, outcome: proof.outcome };
  })();
  const singleTargetNegationResponses = singleTargetNegationProofCandidate?.responseNodes.map(({ event, node, actor }, index) => {
    const counterTarget = node.counterTarget;
    const counterLabel = counterTarget?.kind === "ROOT"
      ? cardDefinition(singleTargetNegationProofCandidate.root.cardKind!).name
      : `Negation ${index}`;
    return {
      eventId: event.id,
      ordinal: index + 1,
      actorId: node.actor.id!,
      actorName: actor.name,
      cardFace: event.card,
      ariaLabel: `${actor.name} played Negation to counter ${counterLabel}`,
    };
  }) ?? [];
  const singleTargetNegationUsesJourney = Boolean(singleTargetNegationProofCandidate
    && singleTargetNegationProofCandidate.root.cardKind !== "Duel"
    && !new Set<string>(["BarbarianInvasion", "RainingArrows", "Oath", "BumperHarvest"]).has(singleTargetNegationProofCandidate.root.cardKind!));
  const singleTargetNegationPublicAction: PublicCardDisplayAction | null = singleTargetNegationProofCandidate
    ? {
      key: singleTargetNegationActionKey ?? "public-negation-read",
      interactionId: singleTargetNegationProofCandidate.chain.interactionId,
      rootFrameId: clientPresentation.rootFrameId ?? undefined,
      rootEventId: singleTargetNegationProofCandidate.rootEvent.id,
      sourceId: singleTargetNegationProofCandidate.root.source.id!,
      targetId: singleTargetNegationProofCandidate.root.targets[0]!.id!,
      cardKind: singleTargetNegationProofCandidate.root.cardKind!,
      cardFace: singleTargetNegationProofCandidate.rootEvent.card,
      cardLabel: cardDefinition(singleTargetNegationProofCandidate.root.cardKind!).name.toUpperCase(),
      ariaLabel: `${singleTargetNegationProofCandidate.root.source.name} played ${cardDefinition(singleTargetNegationProofCandidate.root.cardKind!).name} targeting ${singleTargetNegationProofCandidate.root.targets[0]!.name}`,
      phaseNotice: singleTargetNegationUsesJourney
        ? singleTargetNegationSettlement ? undefined : singleTargetNegationResponses.length ? "NEGATION RESPONSE" : "NEGATION MAY BE PLAYED"
        : undefined,
      ...(singleTargetNegationUsesJourney ? {
        motion: {
          type: singleTargetNegationProofCandidate.root.cardKind === "Dismantle" ? "single-target" as const : "negation" as const,
          scopeKey: singleTargetNegationProofCandidate.root.cardKind === "Dismantle"
            ? [room.code, singleTargetNegationProofCandidate.rootEvent.id].join(":")
            : [room.code, singleTargetNegationProofCandidate.chain.interactionId, singleTargetNegationProofCandidate.rootEvent.id].join(":"),
          freshEventIds: [singleTargetNegationProofCandidate.rootEvent.id, ...singleTargetNegationResponses.map((response) => response.eventId)]
            .filter((eventId) => !publicCardJourneySeenEventIds.has(eventId)),
        },
      } : {}),
      ...(singleTargetNegationUsesJourney && singleTargetNegationSettlement ? {
        settlement: {
          ...singleTargetNegationSettlement,
          exiting: activePublicNegationRead?.key === singleTargetNegationActionKey
            && activePublicNegationRead.phase === "exiting" && activeNegationReadSettled,
        },
      } : {}),
      ...(singleTargetNegationResponses.length ? {
        publicCounterRead: {
          eventId: singleTargetNegationResponses.at(-1)!.eventId,
          exiting: activePublicNegationRead?.key === singleTargetNegationActionKey
            && activePublicNegationRead.phase === "exiting" && activeNegationReadSettled,
        },
        responses: singleTargetNegationResponses,
      } : {}),
    }
    : null;
  const duelNegationPublicAction: PublicCardDisplayAction | null = duelNegationProofCandidate
    ? {
      key: ["duel", duelNegationProofCandidate.chain.interactionId, clientPresentation.rootFrameId!,
        duelNegationProofCandidate.rootEvent.id, duelNegationProofCandidate.root.source.id!, duelNegationProofCandidate.root.targets[0]!.id!].join(":"),
      interactionId: duelNegationProofCandidate.chain.interactionId!,
      rootFrameId: clientPresentation.rootFrameId!,
      rootEventId: duelNegationProofCandidate.rootEvent.id,
      sourceId: duelNegationProofCandidate.root.source.id!,
      targetId: duelNegationProofCandidate.root.targets[0]!.id!,
      cardKind: "Duel",
      cardFace: duelNegationProofCandidate.rootEvent.card,
      cardLabel: "DUEL",
      ariaLabel: `${duelNegationProofCandidate.root.source.name} played Duel targeting ${duelNegationProofCandidate.root.targets[0]!.name}`,
      phaseNotice: duelNegationProofCandidate.responseNodes.length
        ? "NEGATION RESPONSE"
        : duelNegationProofCandidate.chain.rootEffectState === "BLOCKED" ? "DUEL NEGATED" : "NEGATION MAY BE PLAYED",
      motion: {
        type: "duel",
        scopeKey: [room.code, duelNegationProofCandidate.chain.interactionId, clientPresentation.rootFrameId!, duelNegationProofCandidate.rootEvent.id].join(":"),
        freshEventIds: [duelNegationProofCandidate.rootEvent.id, ...singleTargetNegationResponses.map((response) => response.eventId)]
          .filter((eventId) => !publicCardJourneySeenEventIds.has(eventId)),
      },
      ...(duelNegationProofCandidate.responseNodes.length ? {
        publicCounterRead: {
          eventId: duelNegationProofCandidate.responseNodes.at(-1)!.event.id,
          exiting: activePublicNegationRead?.action.rootEventId === duelNegationProofCandidate.rootEvent.id
            && activePublicNegationRead.phase === "exiting" && activeNegationReadSettled,
        },
      } : {}),
      ...(singleTargetNegationResponses.length ? { responses: singleTargetNegationResponses } : {}),
    }
    : null;
  const lustCostFrameCandidate = (() => {
    const notices = room.presentationSnapshot?.diaoChanSkillNotices ?? [];
    const settledRoots = new Set(notices.filter((notice) => notice.effectId === "diao_chan_lust" && notice.notice === "DUEL_RESULT")
      .map((notice) => notice.rootEventId));
    const unsettledActivations = notices.filter((notice) => notice.effectId === "diao_chan_lust"
      && notice.notice === "ACTIVATION" && !settledRoots.has(notice.eventId));
    const proved = unsettledActivations.flatMap((notice) => {
      const frame = verifiedLustCostFrameForEvent(room.timeline, notices,
        room.presentationSnapshot?.publicCardEffects ?? [], room.players, notice.eventId);
      return frame ? [frame] : [];
    });
    if (proved.length !== 1) return null;
    const frame = proved[0];
    const activeLust = room.pendingDuel?.lust;
    if (room.pendingDuel && (!activeLust || activeLust.rootEventId !== frame.activation.eventId)) return null;
    return frame;
  })();
  const lustCostFrameAction: PublicCardDisplayAction | null = lustCostFrameCandidate ? {
    key: ["lust-cost", lustCostFrameCandidate.activation.eventId, lustCostFrameCandidate.costEvent.id].join(":"),
    rootEventId: lustCostFrameCandidate.costEvent.id,
    sourceId: lustCostFrameCandidate.activation.sourceId,
    targetId: null,
    cardFace: lustCostFrameCandidate.costCard,
    cardLabel: "LUST COST",
    ariaLabel: `Diao Chan used Lust. ${lustCostFrameCandidate.firstParticipant.name} and ${lustCostFrameCandidate.secondParticipant.name} enter a Duel. ${lustCostFrameCandidate.firstActor.name} plays Attack first.`,
    motion: {
      type: "lust-cost",
      scopeKey: [room.code, lustCostFrameCandidate.activation.eventId, lustCostFrameCandidate.costEvent.id].join(":"),
      freshEventIds: publicCardJourneySeenEventIds.has(lustCostFrameCandidate.costEvent.id)
        ? [] : [lustCostFrameCandidate.costEvent.id],
    },
    lustCostFrame: {
      activationEventId: lustCostFrameCandidate.activation.eventId,
      title: "LUST",
      message: `Diao Chan used Lust: ${lustCostFrameCandidate.firstParticipant.name} and ${lustCostFrameCandidate.secondParticipant.name} enter a Duel; ${lustCostFrameCandidate.firstActor.name} plays Attack first.`,
      compactMessage: `Diao Chan used Lust: ${lustCostFrameCandidate.firstParticipant.hero ? heroName(lustCostFrameCandidate.firstParticipant.hero) : lustCostFrameCandidate.firstParticipant.name} and ${lustCostFrameCandidate.secondParticipant.hero ? heroName(lustCostFrameCandidate.secondParticipant.hero) : lustCostFrameCandidate.secondParticipant.name} enter a Duel; ${lustCostFrameCandidate.firstActor.hero ? heroName(lustCostFrameCandidate.firstActor.hero) : lustCostFrameCandidate.firstActor.name} plays Attack first.`,
    },
  } : null;
  const lustDuelPublicAction: PublicCardDisplayAction | null = lustDuelExchangeDisplayCandidate ? {
    key: ["lust-duel", lustDuelExchangeDisplayCandidate.exchange.interactionId,
      lustDuelExchangeDisplayCandidate.exchange.rootFrameId,
      lustDuelExchangeDisplayCandidate.exchange.root.activationEventId,
      lustDuelExchangeDisplayCandidate.exchange.root.costEventId].join(":"),
    interactionId: lustDuelExchangeDisplayCandidate.exchange.interactionId,
    rootFrameId: lustDuelExchangeDisplayCandidate.exchange.rootFrameId,
    rootEventId: lustDuelExchangeDisplayCandidate.exchange.root.costEventId,
    sourceId: lustDuelExchangeDisplayCandidate.exchange.root.ownerId,
    targetId: null,
    cardFace: lustDuelExchangeDisplayCandidate.costFrame.costCard,
    cardLabel: "LUST",
    ariaLabel: lustDuelExchangeDisplayCandidate.settlementCopy?.message
      ?? `Diao Chan used Lust: ${lustDuelExchangeDisplayCandidate.costFrame.firstParticipant.name} and ${lustDuelExchangeDisplayCandidate.costFrame.secondParticipant.name} enter a Duel; ${lustDuelExchangeDisplayCandidate.costFrame.firstActor.name} plays Attack first.`,
    publicNotice: lustDuelExchangeDisplayCandidate.settlementCopy?.message
      ?? (lustDuelExchangeDisplayCandidate.responses.at(-1)?.responseEvent.type === "message"
      ? lustDuelExchangeDisplayCandidate.responses.at(-1)?.responseActor.name + " provided an Attack in the Lust Duel."
      : undefined),
    motion: {
      type: "lust-duel",
      scopeKey: [room.code, lustDuelExchangeDisplayCandidate.exchange.interactionId,
        lustDuelExchangeDisplayCandidate.exchange.rootFrameId,
        lustDuelExchangeDisplayCandidate.exchange.root.activationEventId].join(":"),
      freshEventIds: [lustDuelExchangeDisplayCandidate.exchange.root.costEventId,
        ...lustDuelExchangeDisplayCandidate.responses.map(({ response }) => response.responseEventId)]
        .filter((eventId) => !publicCardJourneySeenEventIds.has(eventId)),
    },
    lustCostFrame: {
      activationEventId: lustDuelExchangeDisplayCandidate.exchange.root.activationEventId,
      title: "LUST",
      message: `Diao Chan used Lust: ${lustDuelExchangeDisplayCandidate.costFrame.firstParticipant.name} and ${lustDuelExchangeDisplayCandidate.costFrame.secondParticipant.name} enter a Duel; ${lustDuelExchangeDisplayCandidate.costFrame.firstActor.name} plays Attack first.`,
      compactMessage: `Lust Duel: ${lustDuelExchangeDisplayCandidate.costFrame.firstActor.hero ? heroName(lustDuelExchangeDisplayCandidate.costFrame.firstActor.hero) : lustDuelExchangeDisplayCandidate.costFrame.firstActor.name} plays Attack first.`,
    },
    ...(lustDuelExchangeDisplayCandidate.exchange.settlement ? {
      settlement: {
        eventId: lustDuelExchangeDisplayCandidate.exchange.settlement.eventId,
        outcome: lustDuelExchangeDisplayCandidate.exchange.settlement.outcome === "DAMAGE_APPLIED"
          ? "LUST_DUEL_DAMAGE_APPLIED" as const : "LUST_DUEL_DAMAGE_PREVENTED" as const,
        exiting: false,
        readRemainingMs: lustDuelExchangeDisplayCandidate.exchange.settlement.readRemainingMs,
      },
    } : {}),
    ...(lustDuelExchangeDisplayCandidate.responses.length ? {
      responses: lustDuelExchangeDisplayCandidate.responses.map(({ response, responseActor, responseTarget, cardFaces, responseEvent }) => ({
        eventId: response.responseEventId,
        ordinal: response.ordinal,
        actorId: response.responseActorId,
        actorName: responseActor.name,
        ...(cardFaces.length ? { cardFace: cardFaces[0], cardFaces } : {}),
        ...(responseEvent.playedAs?.toLowerCase() === "attack" && cardFaces.some((card) => card.kind !== "Attack")
          ? { semanticLabel: "AS ATTACK" }
          : {}),
        ariaLabel: `${responseActor.name} played Attack targeting ${responseTarget.name}`,
      })),
    } : {}),
  } : null;
  const singleTargetNegationOwnsRoot = Boolean(singleTargetNegationUsesJourney && singleTargetNegationProofCandidate
    && (!rootAction || rootAction.rootEventId === singleTargetNegationProofCandidate.rootEvent.id)
    && (clientPresentation.stage === "NEGATION" || singleTargetNegationProofCandidate.responseNodes.length > 0));
  const livePublicCardAction: PublicCardDisplayAction | null = heldPublicNegationReadAction
    ? heldPublicNegationReadAction
    : lustDuelPublicAction
    ? lustDuelPublicAction
    : lustCostFrameAction
    ? lustCostFrameAction
    : groupSettlementCandidate
    ? {
      key: ["group", groupSettlementCandidate.settlement.interactionId, groupSettlementCandidate.settlement.groupFrameId, groupSettlementCandidate.rootEvent.id].join(":"),
      rootEventId: groupSettlementCandidate.rootEvent.id,
      sourceId: groupSettlementCandidate.settlement.sourceId,
      targetId: null,
      cardFace: groupSettlementCandidate.rootEvent.card,
      cardKind: groupSettlementCandidate.settlement.cardKind,
      cardLabel: cardDefinition(groupSettlementCandidate.settlement.cardKind).name.toUpperCase(),
      ariaLabel: `${groupSettlementCandidate.source.name} played ${cardDefinition(groupSettlementCandidate.settlement.cardKind).name}. ${groupSettlementCandidate.targets.length} targets resolved.`,
      settlement: { eventId: groupSettlementCandidate.settlement.eventId, outcome: "GROUP_RESOLVED", exiting: groupSettlementCandidate.exiting },
    }
    : bumperHarvestSettlementCandidate
    ? {
      key: ["bumper-harvest", bumperHarvestSettlementCandidate.settlement.interactionId, bumperHarvestSettlementCandidate.settlement.rootFrameId, bumperHarvestSettlementCandidate.rootEvent.id].join(":"),
      rootEventId: bumperHarvestSettlementCandidate.rootEvent.id,
      sourceId: bumperHarvestSettlementCandidate.settlement.sourceId,
      targetId: null,
      cardFace: bumperHarvestSettlementCandidate.rootEvent.card,
      cardKind: "BumperHarvest",
      cardLabel: cardDefinition("BumperHarvest").name.toUpperCase(),
      ariaLabel: `${bumperHarvestSettlementCandidate.source.name} played Bumper Harvest. ${bumperHarvestSettlementCandidate.targets.length} choices resolved.`,
      settlement: { eventId: bumperHarvestSettlementCandidate.settlement.eventId, outcome: "BUMPER_HARVEST_RESOLVED", exiting: bumperHarvestSettlementCandidate.exiting },
    }
    : oathSimultaneousRootCandidate
    ? {
      key: ["oath", oathSimultaneousRootCandidate.scope.interactionId, oathSimultaneousRootCandidate.scope.rootFrameId, oathSimultaneousRootCandidate.rootEvent.id].join(":"),
      rootEventId: oathSimultaneousRootCandidate.rootEvent.id,
      sourceId: oathSimultaneousRootCandidate.scope.sourceId,
      targetId: null,
      cardFace: oathSimultaneousRootCandidate.rootEvent.card,
      cardKind: "Oath",
      cardLabel: cardDefinition("Oath").name.toUpperCase(),
      ariaLabel: `${oathSimultaneousRootCandidate.source.name} played Oath of the Peach Garden.`,
      phaseNotice: oathSimultaneousRootCandidate.responses.length ? "NEGATION RESPONSE" : "NEGATION MAY BE PLAYED",
      motion: {
        type: "negation",
        scopeKey: [room.code, oathSimultaneousRootCandidate.scope.interactionId, oathSimultaneousRootCandidate.rootEvent.id].join(":"),
        freshEventIds: [oathSimultaneousRootCandidate.rootEvent.id, ...oathSimultaneousRootCandidate.responses.map((response) => response.eventId)]
          .filter((eventId) => !publicCardJourneySeenEventIds.has(eventId)),
      },
      ...(oathSimultaneousRootCandidate.responses.length ? { responses: oathSimultaneousRootCandidate.responses } : {}),
    }
    : bumperHarvestRootCandidate
    ? {
      key: ["bumper-harvest", bumperHarvestRootCandidate.progress.interactionId, bumperHarvestRootCandidate.progress.rootFrameId, bumperHarvestRootCandidate.rootEvent.id].join(":"),
      rootEventId: bumperHarvestRootCandidate.rootEvent.id,
      sourceId: bumperHarvestRootCandidate.progress.sourceId,
      targetId: null,
      cardFace: bumperHarvestRootCandidate.rootEvent.card,
      ...(bumperHarvestRootCandidate.progress.currentEffectState !== undefined ? {
        phaseNotice: bumperHarvestRootCandidate.responses.length ? "NEGATION RESPONSE" : "NEGATION MAY BE PLAYED",
        motion: {
          type: "negation" as const,
          scopeKey: [room.code, bumperHarvestRootCandidate.progress.interactionId, bumperHarvestRootCandidate.rootEvent.id,
            bumperHarvestRootCandidate.progress.currentParticipantId ?? ""].join(":"),
          freshEventIds: [bumperHarvestRootCandidate.rootEvent.id, ...bumperHarvestRootCandidate.responses.map((response) => response.eventId)]
            .filter((eventId) => !publicCardJourneySeenEventIds.has(eventId)),
        },
        ...(bumperHarvestRootCandidate.responses.length ? { responses: bumperHarvestRootCandidate.responses } : {}),
      } : {}),
      cardKind: "BumperHarvest",
      cardLabel: cardDefinition("BumperHarvest").name.toUpperCase(),
      ariaLabel: `${bumperHarvestRootCandidate.source.name} played Bumper Harvest.`,
    }
    : halberdOrderedRootCandidate
    ? {
      key: ["halberd-ordered-attack", halberdOrderedRootCandidate.rootProof.interactionId, halberdOrderedRootCandidate.rootProof.groupFrameId, halberdOrderedRootCandidate.rootProof.rootEventId].join(":"),
      rootEventId: halberdOrderedRootCandidate.rootProof.rootEventId,
      interactionId: halberdOrderedRootCandidate.rootProof.interactionId,
      rootFrameId: halberdOrderedRootCandidate.rootProof.groupFrameId,
      sourceId: halberdOrderedRootCandidate.rootProof.sourceId,
      targetId: null,
      cardFace: halberdOrderedRootCandidate.rootEvent.card,
      cardKind: "Attack",
      ariaLabel: `${halberdOrderedRootCandidate.source.name} played Attack.`,
    }
    : groupTargetBranchCandidate
    ? {
      key: ["group", groupTargetBranchCandidate.group.interactionId, groupTargetBranchCandidate.group.groupFrameId, groupTargetBranchCandidate.rootEvent.id].join(":"),
      rootEventId: groupTargetBranchCandidate.rootEvent.id,
      sourceId: clientPresentation.sourceId!,
      targetId: null,
      cardFace: groupTargetBranchCandidate.rootEvent.card,
      ...(groupTargetBranchCandidate.groupTargetEffectScope ? {
        phaseNotice: groupTargetBranchCandidate.responses.length ? "NEGATION RESPONSE" : "NEGATION MAY BE PLAYED",
        motion: {
          type: "negation" as const,
          scopeKey: [room.code, groupTargetBranchCandidate.group.interactionId, groupTargetBranchCandidate.group.groupFrameId,
            groupTargetBranchCandidate.rootEvent.id, groupTargetBranchCandidate.groupTargetEffectScope.targetId].join(":"),
          freshEventIds: [groupTargetBranchCandidate.rootEvent.id, ...groupTargetBranchCandidate.responses.map((response) => response.eventId)]
            .filter((eventId) => !publicCardJourneySeenEventIds.has(eventId)),
        },
        ...(groupTargetBranchCandidate.responses.length ? { responses: groupTargetBranchCandidate.responses } : {}),
      } : {}),
      cardKind: groupTargetBranchCandidate.group.cardKind,
      cardLabel: cardDefinition(groupTargetBranchCandidate.group.cardKind).name.toUpperCase(),
      ariaLabel: `${groupTargetBranchCandidate.source.name} played ${cardDefinition(groupTargetBranchCandidate.group.cardKind).name}.`,
    }
    : skillEffectActionCandidate
    ? {
      key: ["effect", skillEffectActionCandidate.action.effectId, skillEffectActionCandidate.action.rootEventId, skillEffectActionCandidate.action.sourceId, skillEffectActionCandidate.action.targetId].join(":"),
      rootEventId: skillEffectActionCandidate.action.rootEventId,
      sourceId: skillEffectActionCandidate.action.sourceId,
      targetId: skillEffectActionCandidate.action.targetId,
      cardLabel: "SOWING DISTRUST",
      ariaLabel: `${skillEffectActionCandidate.source.name} used Sowing Distrust targeting ${skillEffectActionCandidate.target.name}`,
    }
    : skillEffectSettlementCandidate
    ? {
      key: ["effect", skillEffectSettlementCandidate.action.effectId, skillEffectSettlementCandidate.action.rootEventId, skillEffectSettlementCandidate.action.sourceId, skillEffectSettlementCandidate.action.targetId, "settled", skillEffectSettlementCandidate.action.eventId].join(":"),
      rootEventId: skillEffectSettlementCandidate.action.rootEventId,
      sourceId: skillEffectSettlementCandidate.action.sourceId,
      targetId: skillEffectSettlementCandidate.action.targetId,
      cardLabel: "SOWING DISTRUST",
      ariaLabel: `${skillEffectSettlementCandidate.source.name} used Sowing Distrust targeting ${skillEffectSettlementCandidate.target.name}. Resolved: ${skillEffectSettlementCandidate.action.outcome === "SUITS_MATCHED" ? "suits matched" : "suits differed"}`,
      settlement: { eventId: skillEffectSettlementCandidate.action.eventId, outcome: skillEffectSettlementCandidate.action.outcome, exiting: skillEffectSettlementCandidate.exiting },
    }
    : dismantleSettlementCandidate
    ? {
      key: ["dismantle-settlement", dismantleSettlementCandidate.action.rootEventId, dismantleSettlementCandidate.action.eventId].join(":"),
      rootEventId: dismantleSettlementCandidate.action.rootEventId,
      sourceId: dismantleSettlementCandidate.action.sourceId,
      targetId: dismantleSettlementCandidate.action.targetId,
      cardKind: "Dismantle",
      cardFace: dismantleSettlementCandidate.rootEvent.card,
      cardLabel: "BURNING BRIDGE",
      ariaLabel: `${dismantleSettlementCandidate.source.name} played Burning Bridge targeting ${dismantleSettlementCandidate.target.name}`,
      motion: {
        type: "single-target",
        scopeKey: [room.code, dismantleSettlementCandidate.action.rootEventId].join(":"),
        freshEventIds: publicCardJourneySeenEventIds.has(dismantleSettlementCandidate.action.rootEventId)
          ? []
          : [dismantleSettlementCandidate.action.rootEventId],
      },
      settlement: { eventId: dismantleSettlementCandidate.action.eventId, outcome: dismantleSettlementCandidate.action.outcome, exiting: dismantleSettlementCandidate.exiting },
    }
    : stealSettlementCandidate
    ? {
      key: ["steal-settlement", stealSettlementCandidate.action.rootEventId, stealSettlementCandidate.action.eventId].join(":"),
      rootEventId: stealSettlementCandidate.action.rootEventId,
      sourceId: stealSettlementCandidate.action.sourceId,
      targetId: stealSettlementCandidate.action.targetId,
      cardKind: "Steal",
      cardFace: stealSettlementCandidate.rootEvent.card,
      cardLabel: "STEAL",
      ariaLabel: `${stealSettlementCandidate.source.name} played Steal targeting ${stealSettlementCandidate.target.name}`,
      settlement: { eventId: stealSettlementCandidate.action.eventId, outcome: stealSettlementCandidate.action.outcome, exiting: stealSettlementCandidate.exiting },
    }
    : attackHitSettlementCandidate
    ? {
      key: ["attack-hit-settlement", attackHitSettlementCandidate.action.rootEventId, attackHitSettlementCandidate.action.eventId].join(":"),
      rootEventId: attackHitSettlementCandidate.action.rootEventId,
      sourceId: attackHitSettlementCandidate.action.sourceId,
      targetId: attackHitSettlementCandidate.action.targetId,
      cardKind: "Attack",
      cardFace: attackHitSettlementCandidate.rootEvent.card,
      cardLabel: "ATTACK",
      ariaLabel: `${attackHitSettlementCandidate.source.name} played Attack targeting ${attackHitSettlementCandidate.target.name}`,
      motion: {
        type: "attack-dodge",
        scopeKey: [room.code, attackHitSettlementCandidate.action.rootEventId].join(":"),
        rootFresh: !publicCardJourneySeenEventIds.has(attackHitSettlementCandidate.action.rootEventId),
        responseFresh: false,
        deflectionFresh: false,
      },
      settlement: { eventId: attackHitSettlementCandidate.action.eventId, outcome: attackHitSettlementCandidate.action.outcome, exiting: attackHitSettlementCandidate.exiting },
    }
    : duelNegationPublicAction && !duelExchangeDisplayCandidate
    ? duelNegationPublicAction
    : duelExchangeDisplayCandidate
    ? {
      key: ["duel", duelExchangeDisplayCandidate.exchange.interactionId, duelExchangeDisplayCandidate.exchange.rootFrameId, duelExchangeDisplayCandidate.exchange.root.eventId, duelExchangeDisplayCandidate.exchange.root.sourceId, duelExchangeDisplayCandidate.exchange.root.targetId].join(":"),
      interactionId: duelExchangeDisplayCandidate.exchange.interactionId,
      rootFrameId: duelExchangeDisplayCandidate.exchange.rootFrameId,
      rootEventId: duelExchangeDisplayCandidate.exchange.root.eventId,
      sourceId: duelExchangeDisplayCandidate.exchange.root.sourceId,
      targetId: duelExchangeDisplayCandidate.exchange.root.targetId,
      cardKind: "Duel",
      cardFace: duelExchangeDisplayCandidate.rootEvent.card,
      cardLabel: "DUEL",
      ariaLabel: `${duelExchangeDisplayCandidate.source.name} played Duel targeting ${duelExchangeDisplayCandidate.target.name}`,
      motion: {
        type: "duel",
        scopeKey: [room.code, duelExchangeDisplayCandidate.exchange.interactionId, duelExchangeDisplayCandidate.exchange.rootFrameId, duelExchangeDisplayCandidate.exchange.root.eventId].join(":"),
        freshEventIds: [
          duelExchangeDisplayCandidate.exchange.root.eventId,
          ...duelExchangeDisplayCandidate.responses.map(({ response }) => response.responseEventId),
        ].filter((eventId) => !publicCardJourneySeenEventIds.has(eventId)),
      },
      ...(duelExchangeDisplayCandidate.responses.length ? {
        responses: duelExchangeDisplayCandidate.responses.map(({ response, responseEvent, responseActor, responseTarget }) => ({
          eventId: response.responseEventId,
          ordinal: response.ordinal,
          actorId: response.responseActorId,
          actorName: responseActor.name,
          cardFace: responseEvent.card,
          ...(responseEvent.card.kind !== "Attack" && responseEvent.playedAs?.toLowerCase() === "attack"
            ? { semanticLabel: "AS ATTACK" }
            : {}),
          ariaLabel: `${responseActor.name} played Attack targeting ${responseTarget.name}`,
        })),
      } : {}),
    }
    : singleTargetNegationOwnsRoot
    ? singleTargetNegationPublicAction
    : rootAction && !attackDodgeResponseOwnsCurrentRoot
    ? !rootActionCardFace ? null : {
      key: publicCardActionKey(rootAction),
      interactionId: rootAction.interactionId,
      rootFrameId: rootAction.rootFrameId,
      rootEventId: rootAction.rootEventId,
      sourceId: rootAction.sourceId,
      targetId: rootAction.targetId,
      cardKind: rootAction.cardKind,
      cardFace: rootActionCardFace,
      cardLabel: rootActionName?.toUpperCase() ?? "ACTION",
      ariaLabel: `${room.players.find((player) => player.id === rootAction.sourceId)?.name ?? "Unknown player"} played ${rootActionName ?? "an action"}${rootAction.targetId ? ` targeting ${room.players.find((player) => player.id === rootAction.targetId)?.name ?? "the target"}` : ""}`,
      ...(rootAction.action === "ATTACK" ? {
        motion: {
          type: "attack-dodge" as const,
          scopeKey: [room.code, rootAction.rootEventId].join(":"),
          rootFresh: !publicCardJourneySeenEventIds.has(rootAction.rootEventId),
          responseFresh: false,
          deflectionFresh: false,
        },
        ...(rootAction.targetId === room.meId
          && room.currentAction?.kind === "response"
          && room.currentAction.requirement === "dodge"
          && room.currentAction.actorId === room.meId
          && canUseAction(room.currentAction, "respond")
          ? { publicNotice: `${room.players.find((player) => player.id === rootAction.sourceId)?.name ?? "A player"} played Attack on you. Dodge or Skip.` }
          : {}),
      } : rootAction.cardKind === "Dismantle" ? {
        motion: {
          type: "single-target" as const,
          scopeKey: [room.code, rootAction.rootEventId].join(":"),
          freshEventIds: publicCardJourneySeenEventIds.has(rootAction.rootEventId) ? [] : [rootAction.rootEventId],
        },
      } : {}),
    }
    : attackDodgeDisplayCandidate
      ? {
        key: [attackDodgeDisplayCandidate.proof.interactionId, attackDodgeDisplayCandidate.proof.rootFrameId, attackDodgeDisplayCandidate.proof.rootEventId, attackDodgeDisplayCandidate.proof.responseEventId].join(":"),
        interactionId: attackDodgeDisplayCandidate.proof.interactionId,
        rootFrameId: attackDodgeDisplayCandidate.proof.rootFrameId,
        rootEventId: attackDodgeDisplayCandidate.proof.rootEventId,
        sourceId: attackDodgeDisplayCandidate.proof.rootSourceId,
        targetId: attackDodgeDisplayCandidate.proof.targetId,
        cardKind: "Attack",
        cardFace: attackDodgeDisplayCandidate.rootEvent.card,
        cardLabel: "ATTACK",
        ariaLabel: `${room.players.find((player) => player.id === attackDodgeDisplayCandidate.proof.rootSourceId)?.name ?? "Unknown player"} played Attack targeting ${room.players.find((player) => player.id === attackDodgeDisplayCandidate.proof.targetId)?.name ?? "unknown player"}`,
        motion: {
          type: "attack-dodge",
          scopeKey: [room.code, attackDodgeDisplayCandidate.proof.rootEventId].join(":"),
          rootFresh: !publicCardJourneySeenEventIds.has(attackDodgeDisplayCandidate.proof.rootEventId),
          responseFresh: !publicCardJourneySeenEventIds.has(attackDodgeDisplayCandidate.proof.responseEventId),
          deflectionFresh: false,
        },
        settlement: {
          eventId: attackDodgeDisplayCandidate.proof.responseEventId,
          outcome: "ATTACK_BLOCKED_BY_DODGE",
          exiting: visibleActiveAttackDodgeSettlement?.eventId === attackDodgeDisplayCandidate.proof.responseEventId
            && visibleActiveAttackDodgeSettlement.phase === "exiting",
        },
        response: {
          eventId: attackDodgeDisplayCandidate.proof.responseEventId,
          actorId: attackDodgeDisplayCandidate.proof.responseActorId,
          actorName: room.players.find((player) => player.id === attackDodgeDisplayCandidate.proof.responseActorId)?.name ?? "Unknown player",
          cardFace: attackDodgeDisplayCandidate.responseEvent.card,
          semanticAction: "DODGE",
          ...(attackDodgeDisplayCandidate.proof.responsePhysicalCardKind === "Attack" && attackDodgeDisplayCandidate.proof.responsePlayedAs === "dodge"
            ? { semanticLabel: "AS DODGE" }
            : {}),
          ariaLabel: attackDodgeDisplayCandidate.proof.responsePhysicalCardKind === "Attack"
            ? `${room.players.find((player) => player.id === attackDodgeDisplayCandidate.proof.responseActorId)?.name ?? "Unknown player"} used Attack as Dodge against ${room.players.find((player) => player.id === attackDodgeDisplayCandidate.proof.rootSourceId)?.name ?? "Unknown player"}'s Attack on ${room.players.find((player) => player.id === attackDodgeDisplayCandidate.proof.targetId)?.name ?? "the target"}`
            : `${room.players.find((player) => player.id === attackDodgeDisplayCandidate.proof.responseActorId)?.name ?? "Unknown player"} played Dodge against ${room.players.find((player) => player.id === attackDodgeDisplayCandidate.proof.rootSourceId)?.name ?? "Unknown player"}'s Attack on ${room.players.find((player) => player.id === attackDodgeDisplayCandidate.proof.targetId)?.name ?? "the target"}`,
        },
      }
    : singleTargetNegationProofCandidate
      ? singleTargetNegationPublicAction
    : selfTargetCandidate
      ? {
        key: ["self", selfTargetCandidate.action.rootEventId, selfTargetCandidate.action.resolutionId, selfTargetCandidate.action.sourceId].join(":"),
        rootEventId: selfTargetCandidate.action.rootEventId,
        sourceId: selfTargetCandidate.action.sourceId,
        targetId: selfTargetCandidate.action.targetId,
        cardFace: selfTargetCandidate.event.card,
        cardKind: "Peach",
        cardLabel: "PEACH",
        ariaLabel: `${selfTargetCandidate.source.name} used Peach on self`,
      }
      : null;
  const heldAttackDodgeReadAction = visibleActiveAttackDodgeSettlement
    && visibleActiveAttackDodgeSettlement.phase !== "complete"
    && visibleActiveAttackDodgeSettlement.action.settlement?.eventId === visibleActiveAttackDodgeSettlement.eventId
    && visibleActiveAttackDodgeSettlement.action.response?.eventId === visibleActiveAttackDodgeSettlement.eventId
    ? {
      ...visibleActiveAttackDodgeSettlement.action,
      settlement: {
        ...visibleActiveAttackDodgeSettlement.action.settlement,
        exiting: visibleActiveAttackDodgeSettlement.phase === "exiting",
      },
    }
    : null;
  const selectedPublicCardAction: PublicCardDisplayAction | null = heldPublicNegationReadAction
    ?? heldAttackDodgeReadAction
    ?? livePublicCardAction;
  const deflectionForPublicAction = (action: PublicCardDisplayAction | null) => {
    if (!action || action.cardKind !== "Attack" || action.motion?.type !== "attack-dodge" || !action.targetId) return null;
    const proofs = clientPresentation.deflectionActions.filter((proof) => proof.semantics === "PROVEN"
      && proof.rootEventId === action.rootEventId
      && proof.sourceId === action.sourceId
      && proof.replacementTargetId === action.targetId
      && (!action.interactionId || proof.interactionId === action.interactionId)
      && (!action.rootFrameId || proof.rootFrameId === action.rootFrameId));
    if (proofs.length !== 1) return null;
    const proof = proofs[0];
    const rootEvents = room.timeline.filter((event) => event.id === proof.rootEventId);
    const costEvents = room.timeline.filter((event) => event.id === proof.eventId);
    if (rootEvents.length !== 1 || costEvents.length !== 1) return null;
    const rootEvent = rootEvents[0];
    const costEvent = costEvents[0];
    if (rootEvent.type !== "card" || rootEvent.action !== "play" || rootEvent.presentation === false
      || rootEvent.resolutionId !== proof.rootResolutionId
      || rootEvent.card.id !== proof.rootCardId
      || rootEvent.card.id !== action.cardFace?.id
      || rootEvent.card.kind !== "Attack" && rootEvent.playedAs?.toLowerCase() !== "attack"
      || costEvent.type !== "card" && costEvent.type !== "cards"
      || costEvent.action !== "discard" || costEvent.presentation === false
      || costEvent.resolutionId !== proof.rootResolutionId) return null;
    const costCards = eventCards(costEvent);
    const [costCard] = costCards;
    if (costCards.length !== 1 || !costCard
      || costCard.id !== proof.costCardId || costCard.kind !== proof.costCard.kind
      || costCard.suit !== proof.costCard.suit || costCard.rank !== proof.costCard.rank) return null;
    const actor = room.players.find((player) => player.id === proof.actorId);
    const replacement = room.players.find((player) => player.id === proof.replacementTargetId);
    if (!actor?.name || !replacement?.name || proof.actorId !== proof.originalTargetId
      || proof.actorId === proof.sourceId || proof.actorId === proof.replacementTargetId) return null;
    const publicNotice = `${actor.name} used Deflection, discarding ${cardDefinition(costCard.kind).name} and redirecting Attack to ${replacement.name}.`;
    return {
      eventId: proof.eventId,
      actorId: proof.actorId,
      actorName: actor.name,
      cardFace: proof.costCard,
      ariaLabel: publicNotice,
      publicNotice,
    };
  };
  const activeDeflectionAction = deflectionForPublicAction(selectedPublicCardAction);
  const publicCardDisplayAction: PublicCardDisplayAction | null = selectedPublicCardAction ? {
    ...selectedPublicCardAction,
    ...(selectedPublicCardAction.motion?.type === "attack-dodge" ? {
      motion: {
        ...selectedPublicCardAction.motion,
        deflectionFresh: Boolean(activeDeflectionAction && !publicCardJourneySeenEventIds.has(activeDeflectionAction.eventId)),
      },
    } : {}),
    deflection: activeDeflectionAction ?? undefined,
  } : null;
  const rootActionSource = publicCardDisplayAction ? room.players.find((player) => player.id === publicCardDisplayAction.sourceId) : null;
  const rootActionTarget = publicCardDisplayAction ? room.players.find((player) => player.id === publicCardDisplayAction.targetId) : null;
  const compactPublicPlayerNamesById = Object.fromEntries(room.players.flatMap((player) => player.hero
    ? [[player.id, heroName(player.hero)] as const]
    : []));
  const rootActionTemporarilyBlocked = Boolean(targetPreviewPresentation || opponentInspectionPresentation
    || targetCardPickerInModal && !skillEffectActionCandidate
    || expandedOpponentId || groupScopePreview.active);
  const publicCardDisplayEnabled = Boolean(publicCardDisplayAction && rootActionSource?.name
    && (publicCardDisplayAction.targetId === null || rootActionTarget?.name)
    && !rootActionTemporarilyBlocked);
  const publicCardDisplayReady = publicCardDisplayEnabled;
  const publicCardDisplayOwnsPresentation = Boolean(publicCardDisplayReady
    || publicCardDisplayAction?.motion?.type === "attack-dodge"
      && rootActionSource?.name
      && (publicCardDisplayAction.targetId === null || rootActionTarget?.name)
    || publicCardDisplayAction?.motion?.type === "duel" && rootActionSource?.name && rootActionTarget?.name
    || publicCardDisplayAction?.motion?.type === "lust-duel" && rootActionSource?.name
    || (publicCardDisplayAction?.motion?.type === "single-target" || publicCardDisplayAction?.motion?.type === "negation")
      && rootActionSource?.name
      && (publicCardDisplayAction.targetId === null || rootActionTarget?.name));
  const publicCardJourneyEventIds = publicCardDisplayAction?.motion?.type === "attack-dodge"
    ? [publicCardDisplayAction.rootEventId, publicCardDisplayAction.response?.eventId, publicCardDisplayAction.deflection?.eventId].filter((eventId): eventId is string => Boolean(eventId))
    : publicCardDisplayAction?.motion?.type === "single-target" || publicCardDisplayAction?.motion?.type === "negation"
      ? [publicCardDisplayAction.rootEventId, ...(publicCardDisplayAction.responses ?? []).map((response) => response.eventId)]
    : publicCardDisplayAction?.motion?.type === "lust-cost"
      ? [publicCardDisplayAction.rootEventId]
    : publicCardDisplayAction?.motion?.type === "duel" || publicCardDisplayAction?.motion?.type === "lust-duel"
      ? [publicCardDisplayAction.rootEventId, ...(publicCardDisplayAction.responses ?? []).map((response) => response.eventId)]
      : [];
  const publicCardJourneyEventIdKey = publicCardJourneyEventIds.join("|");
  useEffect(() => {
    if (!publicCardDisplayReady || !publicCardJourneyEventIdKey) return;
    if (publicCardDisplayAction?.motion) return;
    const eventIds = publicCardJourneyEventIdKey.split("|");
    const timer = window.setTimeout(() => {
      setPublicCardJourneySeen((current) => {
        const seen = current.roomCode === room.code
          ? current.eventIds
          : new Set((room.timeline ?? []).map((event) => event.id));
        if (current.roomCode === room.code && eventIds.every((eventId) => seen.has(eventId))) return current;
        return { roomCode: room.code, eventIds: new Set([...seen, ...eventIds]) };
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [room.code, room.timeline, publicCardDisplayAction?.motion?.type, publicCardDisplayReady, publicCardJourneyEventIdKey]);
  const duelJourneyOwnsRootAndAttacks = publicCardDisplayAction?.motion?.type === "duel"
    || publicCardDisplayAction?.motion?.type === "lust-duel";
  const publicDisplayOwnedEventIds = publicCardDisplayOwnsPresentation && publicCardDisplayAction
    ? [...new Set([
      publicCardDisplayAction.rootEventId,
      publicCardDisplayAction.lustCostFrame?.activationEventId,
      publicCardDisplayAction.settlement?.eventId,
      publicCardDisplayAction.deflection?.eventId,
      ...(!duelJourneyOwnsRootAndAttacks ? [publicCardDisplayAction.response?.eventId, publicCardDisplayAction.publicCounterRead?.eventId] : []),
      ...(publicCardDisplayAction.responses ?? [])
        .filter((response) => !duelJourneyOwnsRootAndAttacks || Number.isInteger(response.ordinal))
        .map((response) => response.eventId),
    ].filter((eventId): eventId is string => Boolean(eventId)))]
    : [];
  const publicDisplayOwnedPhysicalCardIds = new Set(publicCardDisplayOwnsPresentation && publicCardDisplayAction
    ? [
      publicCardDisplayAction.cardFace?.id,
      publicCardDisplayAction.deflection?.cardFace.id,
      ...(!duelJourneyOwnsRootAndAttacks ? [publicCardDisplayAction.response?.cardFace?.id] : []),
      ...(publicCardDisplayAction.responses ?? [])
        .filter((response) => !duelJourneyOwnsRootAndAttacks || Number.isInteger(response.ordinal))
        .flatMap((response) => (response.cardFaces ?? (response.cardFace ? [response.cardFace] : [])).map((card) => card.id)),
    ].filter((cardId): cardId is string => Boolean(cardId))
    : []);
  const activePublicCardSettlementEventId = publicCardDisplayAction?.settlement?.eventId ?? null;
  const activePublicCardSettlementExiting = publicCardDisplayAction?.settlement?.exiting === true;
  const visibleNegationReadAction = singleTargetNegationActionKey
    && (publicCardDisplayAction?.key === singleTargetNegationActionKey
      || publicCardDisplayAction?.cardKind === "Duel" && publicCardDisplayAction.rootEventId === duelNegationProofCandidate?.rootEvent.id)
    && publicCardDisplayAction.publicCounterRead?.eventId
    ? publicCardDisplayAction
    : null;
  const visibleNegationReadActionRef = useRef<PublicCardDisplayAction | null>(null);
  useEffect(() => {
    visibleNegationReadActionRef.current = visibleNegationReadAction;
  }, [visibleNegationReadAction]);
  const visibleNegationReadActionKey = visibleNegationReadAction?.key ?? null;
  useEffect(() => {
    if (!visibleNegationReadAction || activePublicNegationRead?.key !== visibleNegationReadAction.key
      || activePublicNegationRead.action.publicCounterRead?.eventId === visibleNegationReadAction.publicCounterRead?.eventId) return;
    const timer = window.setTimeout(() => {
      setActivePublicNegationRead((current) => current?.key === visibleNegationReadAction.key
        ? { ...current, action: visibleNegationReadAction }
        : current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activePublicNegationRead, visibleNegationReadAction]);
  const visibleNegationReadEventId = visibleNegationReadAction?.publicCounterRead?.eventId ?? null;
  useEffect(() => {
    if (!visibleNegationReadActionKey || !visibleNegationReadEventId || !publicCardDisplayReady
      || activePublicNegationRead?.key === visibleNegationReadActionKey) return;
    const timer = window.setTimeout(() => {
      const action = visibleNegationReadActionRef.current;
      if (!action || action.key !== visibleNegationReadActionKey
        || action.publicCounterRead?.eventId !== visibleNegationReadEventId) return;
      onPublicCounterReadVisible(`negation:${visibleNegationReadActionKey}:${visibleNegationReadEventId}`);
      const next: ActivePublicNegationRead = {
        key: visibleNegationReadActionKey,
        action,
        expiresAt: Date.now() + (action.motion?.type === "single-target" || action.motion?.type === "negation"
          ? Math.max(UI_TIMING.publicCounterRead,
            ((action.responses?.length ?? 0) + 1) * UI_TIMING.publicCardJourneyRead
              + UI_TIMING.publicCounterSettlementConfirm + UI_TIMING.publicCounterFade)
          : UI_TIMING.publicCounterRead),
        phase: "reading",
      };
      setActivePublicNegationRead((current) => current?.key === next.key ? current : next);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activePublicNegationRead?.key, onPublicCounterReadVisible, publicCardDisplayReady, visibleNegationReadActionKey, visibleNegationReadEventId]);
  useEffect(() => {
    if (!activePublicNegationRead) return;
    const activeKey = activePublicNegationRead.key;
    const activePhase = activePublicNegationRead.phase;
    if (!activeNegationReadIdentityMatches) {
      const timer = window.setTimeout(() => {
        setActivePublicNegationRead((current) => current?.key === activeKey ? null : current);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (activePhase === "elapsed" || activePhase === "live"
      || activePhase === "settlement-pending" || activePhase === "exiting") {
      if (!activeNegationReadSettled) {
        if (activePhase !== "live") {
          const timer = window.setTimeout(() => {
            setActivePublicNegationRead((current) => current?.key === activeKey && current.phase === activePhase
              ? { ...current, phase: "live" }
              : current);
          }, 0);
          return () => window.clearTimeout(timer);
        }
        return;
      }
      if (activePhase === "exiting" || activePhase === "settlement-pending") return;
      const timer = window.setTimeout(() => {
        setActivePublicNegationRead((current) => current?.key === activeKey && current.phase === activePhase
          ? { ...current, phase: "settlement-pending" }
          : current);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (activePhase !== "reading") return;
    const timer = window.setTimeout(() => {
      setActivePublicNegationRead((current) => current?.key === activeKey
        ? { ...current, phase: "elapsed" }
        : current);
    }, Math.max(0, activePublicNegationRead.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [activeNegationReadIdentityMatches, activeNegationReadSettled, activePublicNegationRead]);
  useEffect(() => {
    if (!activePublicNegationRead || activePublicNegationRead.phase !== "settlement-pending"
      || !activeNegationReadIdentityMatches || !activeNegationReadSettled) return;
    const timer = window.setTimeout(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setActivePublicNegationRead((current) => current?.key === activePublicNegationRead.key
        && current.phase === "settlement-pending"
        ? reducedMotion ? null : { ...current, phase: "exiting" }
        : current);
    }, UI_TIMING.publicCounterSettlementConfirm);
    return () => window.clearTimeout(timer);
  }, [activeNegationReadIdentityMatches, activeNegationReadSettled, activePublicNegationRead]);
  useEffect(() => {
    if (activePublicNegationRead?.phase !== "exiting" || !activeNegationReadSettled) return;
    const timer = window.setTimeout(() => setActivePublicNegationRead((current) => current?.key === activePublicNegationRead.key ? null : current), UI_TIMING.publicCounterFade);
    return () => window.clearTimeout(timer);
  }, [activeNegationReadSettled, activePublicNegationRead]);
  useEffect(() => {
    if (!activePublicCardSettlementEventId || !publicCardDisplayReady || activeSkillEffectSettlement?.eventId !== activePublicCardSettlementEventId || activeSkillEffectSettlement.exiting) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setActiveSkillEffectSettlement((current) => current?.eventId === activePublicCardSettlementEventId
        ? reducedMotion ? null : { ...current, exiting: true }
        : current);
    }, reducedMotion ? UI_TIMING.interactionSettlementReduced : UI_TIMING.interactionSettlement - UI_TIMING.interactionSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activePublicCardSettlementEventId, activeSkillEffectSettlement?.eventId, activeSkillEffectSettlement?.exiting, publicCardDisplayReady]);
  useEffect(() => {
    if (!activePublicCardSettlementExiting || !activePublicCardSettlementEventId || activeSkillEffectSettlement?.eventId !== activePublicCardSettlementEventId) return;
    const timer = window.setTimeout(() => setActiveSkillEffectSettlement((current) => current?.eventId === activePublicCardSettlementEventId ? null : current), UI_TIMING.interactionSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activePublicCardSettlementEventId, activePublicCardSettlementExiting, activeSkillEffectSettlement?.eventId]);
  const activeDismantleSettlementEventId = publicCardDisplayAction?.settlement?.outcome === "DISMANTLE_RESOLVED"
    ? publicCardDisplayAction.settlement.eventId
    : null;
  const activeDismantleSettlementExiting = publicCardDisplayAction?.settlement?.outcome === "DISMANTLE_RESOLVED"
    && publicCardDisplayAction.settlement.exiting;
  useEffect(() => {
    if (!activeDismantleSettlementEventId || !publicCardDisplayReady || !activeDismantleSettlement
      || activeDismantleSettlement.eventId !== activeDismantleSettlementEventId
      || !activeDismantleSettlement.journeySettled || activeDismantleSettlement.exiting) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setActiveDismantleSettlement((current) => current?.eventId === activeDismantleSettlementEventId
        ? reducedMotion ? null : { ...current, exiting: true }
        : current);
    }, reducedMotion ? UI_TIMING.interactionSettlementReduced : UI_TIMING.interactionSettlement - UI_TIMING.interactionSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activeDismantleSettlement?.eventId, activeDismantleSettlement?.exiting, activeDismantleSettlement?.journeySettled, activeDismantleSettlementEventId, publicCardDisplayReady]);
  useEffect(() => {
    if (!activeDismantleSettlementExiting || !activeDismantleSettlementEventId
      || activeDismantleSettlement?.eventId !== activeDismantleSettlementEventId) return;
    const timer = window.setTimeout(() => setActiveDismantleSettlement((current) => current?.eventId === activeDismantleSettlementEventId ? null : current), UI_TIMING.interactionSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activeDismantleSettlement?.eventId, activeDismantleSettlementExiting, activeDismantleSettlementEventId]);
  const activeStealSettlementEventId = publicCardDisplayAction?.settlement?.outcome === "STEAL_RESOLVED"
    ? publicCardDisplayAction.settlement.eventId
    : null;
  const activeStealSettlementExiting = publicCardDisplayAction?.settlement?.outcome === "STEAL_RESOLVED"
    && publicCardDisplayAction.settlement.exiting;
  useEffect(() => {
    if (!activeStealSettlementEventId || !publicCardDisplayReady
      || activeStealSettlement?.eventId !== activeStealSettlementEventId || activeStealSettlement.exiting) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setActiveStealSettlement((current) => current?.eventId === activeStealSettlementEventId
        ? reducedMotion ? null : { ...current, exiting: true }
        : current);
    }, reducedMotion ? UI_TIMING.interactionSettlementReduced : UI_TIMING.interactionSettlement - UI_TIMING.interactionSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activeStealSettlement?.eventId, activeStealSettlement?.exiting, activeStealSettlementEventId, publicCardDisplayReady]);
  useEffect(() => {
    if (!activeStealSettlementExiting || !activeStealSettlementEventId
      || activeStealSettlement?.eventId !== activeStealSettlementEventId) return;
    const timer = window.setTimeout(() => setActiveStealSettlement((current) => current?.eventId === activeStealSettlementEventId ? null : current), UI_TIMING.interactionSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activeStealSettlement?.eventId, activeStealSettlementExiting, activeStealSettlementEventId]);
  const activeAttackHitSettlementEventId = publicCardDisplayAction?.settlement?.outcome === "ATTACK_DAMAGE_APPLIED"
    ? publicCardDisplayAction.settlement.eventId
    : null;
  const activeAttackHitSettlementExiting = publicCardDisplayAction?.settlement?.outcome === "ATTACK_DAMAGE_APPLIED"
    && publicCardDisplayAction.settlement.exiting;
  useEffect(() => {
    if (!activeAttackHitSettlementEventId || activeAttackHitSettlement?.eventId !== activeAttackHitSettlementEventId
      || activeAttackHitSettlement.exiting || attackHitSettlementSuperseded) return;
    const resetVisibleHold = () => {
      if (activeAttackHitSettlement.firstRenderedAt === null) return;
      setActiveAttackHitSettlement((current) => current?.eventId === activeAttackHitSettlementEventId && !current.exiting
        ? { ...current, firstRenderedAt: null }
        : current);
    };
    if (!publicCardDisplayReady) {
      resetVisibleHold();
      return;
    }

    const hasVisibleSettlementComposition = () => {
      const display = [...document.querySelectorAll<HTMLElement>('[data-public-card-display="true"]')]
        .find((element) => element.dataset.publicCardSettlementEventId === activeAttackHitSettlementEventId);
      const primaryCard = display?.querySelector<HTMLElement>("[data-public-card-primary-card='true']");
      const cardFace = primaryCard?.querySelector<HTMLElement>(".played-card");
      const result = display?.querySelector<HTMLElement>('[data-public-card-result="ATTACK_DAMAGE_APPLIED"]');
      const visible = (element: Element | null | undefined) => {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
          && bounds.width > 0 && bounds.height > 0;
      };
      return display?.dataset.publicCardReady === "true"
        && display.dataset.publicCardRootEventId === activeAttackHitSettlement.lifecycle.rootEventId
        && display.dataset.publicCardTargetId === activeAttackHitSettlement.lifecycle.targetId
        && display.dataset.publicCardId === activeAttackHitSettlement.lifecycle.rootCardId
        && primaryCard?.dataset.publicCardJourneyPhase === "parked"
        && visible(cardFace) && visible(result);
    };

    let frameId = 0;
    let visibleSince = activeAttackHitSettlement.firstRenderedAt;
    let visibleFrames = visibleSince === null ? 0 : 2;
    const checkVisibleHold = (now: number) => {
      const visibleComposition = hasVisibleSettlementComposition();
      if (!visibleComposition) {
        visibleSince = null;
        visibleFrames = 0;
        resetVisibleHold();
        frameId = window.requestAnimationFrame(checkVisibleHold);
        return;
      }
      visibleFrames += 1;
      if (visibleSince === null && visibleFrames >= 2) {
        visibleSince = now;
        onPublicCounterReadVisible(`attack-hit:${activeAttackHitSettlementEventId}`, UI_TIMING.attackHitSettlementRead, true);
        setActiveAttackHitSettlement((current) => current?.eventId === activeAttackHitSettlementEventId
          && current.firstRenderedAt === null
          ? { ...current, firstRenderedAt: now }
          : current);
      }
      if (visibleSince !== null && now - visibleSince >= UI_TIMING.attackHitSettlementRead) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          recordAttackHitSettlementRetirement(activeAttackHitSettlement.lifecycle);
          setActiveAttackHitSettlement((current) => current?.eventId === activeAttackHitSettlementEventId ? null : current);
        } else {
          setActiveAttackHitSettlement((current) => current?.eventId === activeAttackHitSettlementEventId
            ? { ...current, exiting: true }
            : current);
        }
        return;
      }
      frameId = window.requestAnimationFrame(checkVisibleHold);
    };
    frameId = window.requestAnimationFrame(checkVisibleHold);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeAttackHitSettlement, activeAttackHitSettlementEventId, attackHitSettlementSuperseded, onPublicCounterReadVisible, recordAttackHitSettlementRetirement, publicCardDisplayReady]);
  useEffect(() => {
    if (!activeAttackHitSettlementExiting || !activeAttackHitSettlementEventId
      || activeAttackHitSettlement?.eventId !== activeAttackHitSettlementEventId) return;
    const timer = window.setTimeout(() => {
      recordAttackHitSettlementRetirement(activeAttackHitSettlement.lifecycle);
      setActiveAttackHitSettlement((current) => current?.eventId === activeAttackHitSettlementEventId ? null : current);
    }, UI_TIMING.attackHitSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activeAttackHitSettlement, activeAttackHitSettlementExiting, activeAttackHitSettlementEventId, recordAttackHitSettlementRetirement]);
  useEffect(() => {
    if (!activeAttackHitSettlement || !attackHitSettlementRetirementReason) return;
    // The candidate is already hidden by the render-time retirement reason;
    // persist that identity without causing a cascading state update here.
    recordAttackHitSettlementRetirement(activeAttackHitSettlement.lifecycle);
  }, [activeAttackHitSettlement, attackHitSettlementRetirementReason, recordAttackHitSettlementRetirement]);
  const activeGroupSettlementEventId = publicCardDisplayAction?.settlement?.outcome === "GROUP_RESOLVED"
    ? publicCardDisplayAction.settlement.eventId
    : null;
  const activeGroupSettlementExiting = publicCardDisplayAction?.settlement?.outcome === "GROUP_RESOLVED"
    && publicCardDisplayAction.settlement.exiting;
  useEffect(() => {
    if (!activeGroupSettlementEventId || !publicCardDisplayReady
      || activeGroupSettlement?.eventId !== activeGroupSettlementEventId || activeGroupSettlement.exiting) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setActiveGroupSettlement((current) => current?.eventId === activeGroupSettlementEventId
        ? reducedMotion ? null : { ...current, exiting: true }
        : current);
    }, reducedMotion ? UI_TIMING.interactionSettlementReduced : UI_TIMING.interactionSettlement - UI_TIMING.interactionSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activeGroupSettlement?.eventId, activeGroupSettlement?.exiting, activeGroupSettlementEventId, publicCardDisplayReady]);
  useEffect(() => {
    if (!activeGroupSettlementExiting || !activeGroupSettlementEventId
      || activeGroupSettlement?.eventId !== activeGroupSettlementEventId) return;
    const timer = window.setTimeout(() => setActiveGroupSettlement((current) => current?.eventId === activeGroupSettlementEventId ? null : current), UI_TIMING.interactionSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activeGroupSettlement?.eventId, activeGroupSettlementExiting, activeGroupSettlementEventId]);
  const activeBumperHarvestSettlementEventId = publicCardDisplayAction?.settlement?.outcome === "BUMPER_HARVEST_RESOLVED"
    ? publicCardDisplayAction.settlement.eventId
    : null;
  const activeBumperHarvestSettlementExiting = publicCardDisplayAction?.settlement?.outcome === "BUMPER_HARVEST_RESOLVED"
    && publicCardDisplayAction.settlement.exiting;
  useEffect(() => {
    if (!activeBumperHarvestSettlementEventId || !publicCardDisplayReady
      || activeBumperHarvestSettlement?.eventId !== activeBumperHarvestSettlementEventId || activeBumperHarvestSettlement.exiting) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setActiveBumperHarvestSettlement((current) => current?.eventId === activeBumperHarvestSettlementEventId
        ? reducedMotion ? null : { ...current, exiting: true }
        : current);
    }, reducedMotion ? UI_TIMING.interactionSettlementReduced : UI_TIMING.interactionSettlement - UI_TIMING.interactionSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activeBumperHarvestSettlement?.eventId, activeBumperHarvestSettlement?.exiting, activeBumperHarvestSettlementEventId, publicCardDisplayReady]);
  useEffect(() => {
    if (!activeBumperHarvestSettlementExiting || !activeBumperHarvestSettlementEventId
      || activeBumperHarvestSettlement?.eventId !== activeBumperHarvestSettlementEventId) return;
    const timer = window.setTimeout(() => setActiveBumperHarvestSettlement((current) => current?.eventId === activeBumperHarvestSettlementEventId ? null : current), UI_TIMING.interactionSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activeBumperHarvestSettlement?.eventId, activeBumperHarvestSettlementExiting, activeBumperHarvestSettlementEventId]);
  const activeAttackDodgeSettlementEventId = publicCardDisplayAction?.settlement?.outcome === "ATTACK_BLOCKED_BY_DODGE"
    ? publicCardDisplayAction.settlement.eventId
    : null;
  const activeAttackDodgeSettlementId = visibleActiveAttackDodgeSettlement?.eventId ?? null;
  const activeAttackDodgeSettlementPhase = visibleActiveAttackDodgeSettlement?.phase ?? null;
  const activeAttackDodgeSettlementRemainingMs = visibleActiveAttackDodgeSettlement?.remainingMs ?? null;
  const activeAttackDodgeSettlementReadingEventId = activeAttackDodgeSettlementPhase === "reading"
    ? activeAttackDodgeSettlementId
    : null;
  const activeAttackDodgeSettlementExitingEventId = activeAttackDodgeSettlementPhase === "exiting"
    ? activeAttackDodgeSettlementId
    : null;
  const attackDodgeSettlementAlreadyActive = activeAttackDodgeSettlementId === activeAttackDodgeSettlementEventId;
  const attackDodgeSettlementCaptureRejectionReasons = [
    !activeAttackDodgeSettlementEventId ? "no-blocked-by-dodge-settlement" : null,
    !publicCardDisplayReady ? "public-card-display-not-ready" : null,
    !publicCardDisplayAction?.response ? "public-response-card-missing" : null,
    publicCardDisplayAction?.response?.eventId !== activeAttackDodgeSettlementEventId ? "public-response-event-mismatch" : null,
    attackDodgeSettlementAlreadyActive ? "settlement-already-active" : null,
    activeAttackDodgeSettlementEventId && attackDodgeSettlementCapturedEventIdsSnapshot.has(activeAttackDodgeSettlementEventId) ? "settlement-event-already-captured" : null,
  ].filter((reason): reason is string => Boolean(reason));
  const publicCardDisplayResultReadRemainingMs = publicCardDisplayReady
    && visibleActiveAttackDodgeSettlement?.phase === "reading"
    && visibleActiveAttackDodgeSettlement.action.response?.eventId === visibleActiveAttackDodgeSettlement.eventId
    && publicCardDisplayAction?.response?.eventId === visibleActiveAttackDodgeSettlement.eventId
    ? visibleActiveAttackDodgeSettlement.remainingMs
    : null;
  useEffect(() => {
    const held = activeAttackDodgeSettlement;
    const reason = attackDodgeHoldSupersessionReason;
    if (!held || !reason || attackDodgeSettlementRetirementLoggedEventIds.current.has(held.eventId)) return;
    attackDodgeSettlementRetirementLoggedEventIds.current.add(held.eventId);
    const superseded = persistAttackDodgeSettlementRetirement(held);
    const priorComposition = retiredAttackDodgeComposition.current.roomCode === held.lifecycle.roomCode
      ? retiredAttackDodgeComposition.current
      : { roomCode: held.lifecycle.roomCode, eventIds: new Set<string>(), cardIds: new Set<string>() };
    superseded.eventIds.forEach((eventId) => priorComposition.eventIds.add(eventId));
    superseded.cardIds.forEach((cardId) => priorComposition.cardIds.add(cardId));
    publishRetiredAttackDodgeComposition(priorComposition);
    recordAttackDodgeUxTrace("attack-dodge-settlement-retired", {
      reason,
      rootEventId: held.lifecycle.rootEventId,
      responseEventId: held.lifecycle.responseEventId,
      roomPhase: room.phase,
      turnSeat: room.turnSeat,
      currentActionKind: room.currentAction?.kind ?? null,
      currentActionTriggerEvent: room.currentAction?.triggerEvent ?? null,
    });
  }, [activeAttackDodgeSettlement, attackDodgeHoldSupersessionReason, room.currentAction?.kind, room.currentAction?.triggerEvent, room.phase, room.turnSeat, publishRetiredAttackDodgeComposition]);
  useEffect(() => {
    const action = publicCardDisplayAction;
    const proof = attackDodgeDisplayCandidate?.proof;
    if (!activeAttackDodgeSettlementEventId || !publicCardDisplayReady
      || !action?.response || action.response.eventId !== activeAttackDodgeSettlementEventId
      || !proof || proof.responseEventId !== activeAttackDodgeSettlementEventId
      || persistedRetiredAttackDodgeEvents.has(proof.rootEventId)
      || persistedRetiredAttackDodgeEvents.has(proof.responseEventId)
      || attackDodgeSettlementAlreadyActive
      || attackDodgeSettlementCapturedEventIds.current.has(activeAttackDodgeSettlementEventId)) return;
    attackDodgeSettlementCapturedEventIds.current.add(activeAttackDodgeSettlementEventId);
    setAttackDodgeSettlementCapturedEventIdsSnapshot((current) => {
      if (current.has(activeAttackDodgeSettlementEventId)) return current;
      return new Set([...current, activeAttackDodgeSettlementEventId]);
    });
    const retired = retiredAttackDodgeComposition.current.roomCode === room.code
      ? retiredAttackDodgeComposition.current
      : { roomCode: room.code, eventIds: new Set<string>(), cardIds: new Set<string>() };
    retired.eventIds.add(proof.rootEventId);
    retired.eventIds.add(proof.responseEventId);
    if (action.cardFace?.id) retired.cardIds.add(action.cardFace.id);
    if (action.response.cardFace?.id) retired.cardIds.add(action.response.cardFace.id);
    publishRetiredAttackDodgeComposition(retired);
    setActiveAttackDodgeSettlement({
      eventId: activeAttackDodgeSettlementEventId,
      proof,
      action,
      lifecycle: {
        roomCode: room.code,
        phase: room.phase,
        turnSeat: room.turnSeat,
        rootEventId: proof.rootEventId,
        responseEventId: proof.responseEventId,
        interactionId: proof.interactionId,
        rootFrameId: proof.rootFrameId,
        sourceId: proof.rootSourceId,
        targetId: proof.targetId,
        publicActionEventIds: attackDodgePublicActions.map((event) => event.eventId),
      },
      phase: "reading",
      remainingMs: UI_TIMING.attackDodgeResultRead,
    });
  }, [attackDodgeDisplayCandidate, attackDodgeSettlementAlreadyActive, activeAttackDodgeSettlementEventId, attackDodgePublicActions, persistedRetiredAttackDodgeEvents, room.code, room.phase, room.turnSeat, publicCardDisplayAction, publicCardDisplayReady, publishRetiredAttackDodgeComposition]);
  useEffect(() => {
    if (!activeAttackDodgeSettlementReadingEventId || activeAttackDodgeSettlementRemainingMs === null || !publicCardDisplayReady) return;
    const held = visibleActiveAttackDodgeSettlement;
    const eventId = activeAttackDodgeSettlementReadingEventId;
    const remainingMs = activeAttackDodgeSettlementRemainingMs;
    let frameId = 0;
    let stableVisibleFrames = 0;
    let visibleSince: number | null = null;
    let timer: number | null = null;
    let elapsed = false;
    const visible = (element: Element | null | undefined) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
        && bounds.width > 0 && bounds.height > 0;
    };
    const hasVisibleResultCard = () => {
      const display = [...document.querySelectorAll<HTMLElement>('[data-public-card-display="true"]')]
        .find((element) => element.dataset.publicCardEventId === eventId);
      const primaryCard = display?.querySelector<HTMLElement>("[data-public-card-primary-card='true']");
      const cardFace = primaryCard?.querySelector<HTMLElement>(".played-card");
      const result = display?.querySelector<HTMLElement>('[data-public-card-result="ATTACK_BLOCKED_BY_DODGE"]');
      return display?.dataset.publicCardReady === "true"
        && display.dataset.publicCardSettlementEventId === eventId
        && display.dataset.publicCardSettlementOutcome === "ATTACK_BLOCKED_BY_DODGE"
        && display.dataset.publicCardRootEventId === held?.lifecycle.rootEventId
        && display.dataset.publicCardActorId === held?.proof.responseActorId
        && display.dataset.publicCardId === held?.action.response?.cardFace?.id
        && primaryCard?.dataset.publicCardJourneyPhase === "parked"
        && visible(cardFace) && visible(result);
    };
    const retire = () => {
      elapsed = true;
      if (held?.eventId === eventId && held.phase === "reading") {
        const retired = persistAttackDodgeSettlementRetirement(held);
        const composition = retiredAttackDodgeComposition.current.roomCode === held.lifecycle.roomCode
          ? retiredAttackDodgeComposition.current
          : { roomCode: held.lifecycle.roomCode, eventIds: new Set<string>(), cardIds: new Set<string>() };
        retired.eventIds.forEach((retiredEventId) => composition.eventIds.add(retiredEventId));
        retired.cardIds.forEach((retiredCardId) => composition.cardIds.add(retiredCardId));
        publishRetiredAttackDodgeComposition(composition);
      }
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setActiveAttackDodgeSettlement((current) => current?.eventId === eventId && current.phase === "reading"
        ? { ...current, phase: reducedMotion ? "complete" : "exiting", remainingMs: 0 }
        : current);
    };
    const checkVisibleComposition = (now: number) => {
      if (!hasVisibleResultCard()) {
        if (visibleSince !== null) {
          const visibleMs = now - visibleSince;
          visibleSince = null;
          stableVisibleFrames = 0;
          setActiveAttackDodgeSettlement((current) => current?.eventId === eventId && current.phase === "reading"
            ? { ...current, remainingMs: Math.max(0, current.remainingMs - visibleMs) }
            : current);
        }
        frameId = window.requestAnimationFrame(checkVisibleComposition);
        return;
      }
      stableVisibleFrames += 1;
      if (visibleSince === null && stableVisibleFrames >= 2) {
        visibleSince = now;
        onPublicCounterReadVisible(`attack-dodge:${eventId}`, remainingMs, true);
        timer = window.setTimeout(retire, Math.max(0, remainingMs));
      }
      frameId = window.requestAnimationFrame(checkVisibleComposition);
    };
    frameId = window.requestAnimationFrame(checkVisibleComposition);
    return () => {
      window.cancelAnimationFrame(frameId);
      if (timer !== null) window.clearTimeout(timer);
      if (visibleSince !== null && !elapsed) {
        const visibleMs = performance.now() - visibleSince;
        setActiveAttackDodgeSettlement((current) => current?.eventId === eventId && current.phase === "reading"
          ? { ...current, remainingMs: Math.max(0, current.remainingMs - visibleMs) }
          : current);
      }
    };
  }, [visibleActiveAttackDodgeSettlement, activeAttackDodgeSettlementReadingEventId, activeAttackDodgeSettlementRemainingMs, onPublicCounterReadVisible, publicCardDisplayReady, publishRetiredAttackDodgeComposition]);
  useEffect(() => {
    if (!activeAttackDodgeSettlementExitingEventId) return;
    const eventId = activeAttackDodgeSettlementExitingEventId;
    const timer = window.setTimeout(() => {
      setActiveAttackDodgeSettlement((current) => current?.eventId === eventId && current.phase === "exiting"
        ? { ...current, phase: "complete" }
        : current);
    }, UI_TIMING.publicCounterFade);
    return () => window.clearTimeout(timer);
  }, [activeAttackDodgeSettlementExitingEventId]);
  const completedAttackDodgeSequenceCandidate = visibleActiveAttackDodgeSettlement?.phase === "complete"
    && completedAttackDodgeSettlementCandidate?.proof.responseEventId === visibleActiveAttackDodgeSettlement.eventId
    ? completedAttackDodgeSettlementCandidate
    : null;
  const retiredAttackDodgeEvents = new Set([
    ...persistedRetiredAttackDodgeEvents,
    ...(retiredAttackDodgeCompositionSnapshot.roomCode === room.code ? retiredAttackDodgeCompositionSnapshot.eventIds : EMPTY_STRING_SET),
    ...serverRetiredAttackDodgeEvents,
    ...(attackHitSettlementSuperseded && activeAttackHitSettlement?.lifecycle.roomCode === room.code
      ? [activeAttackHitSettlement.lifecycle.rootEventId, activeAttackHitSettlement.lifecycle.eventId]
      : []),
    ...(attackDodgeHoldSuperseded && activeAttackDodgeSettlement?.lifecycle.roomCode === room.code
      ? [activeAttackDodgeSettlement.lifecycle.rootEventId, activeAttackDodgeSettlement.lifecycle.responseEventId]
      : []),
  ]);
  const retiredAttackDodgeCards = new Set([
    ...persistedRetiredAttackDodgeCards,
    ...(retiredAttackDodgeCompositionSnapshot.roomCode === room.code ? retiredAttackDodgeCompositionSnapshot.cardIds : EMPTY_STRING_SET),
    ...serverRetiredAttackDodgeCards,
    ...(attackHitSettlementSuperseded && activeAttackHitSettlement?.lifecycle.roomCode === room.code
      ? [activeAttackHitSettlement.lifecycle.rootCardId]
      : []),
    ...(attackDodgeHoldSuperseded && activeAttackDodgeSettlement?.lifecycle.roomCode === room.code
      ? [activeAttackDodgeSettlement.action.cardFace?.id, activeAttackDodgeSettlement.action.response?.cardFace?.id].filter((id): id is string => Boolean(id))
      : []),
  ]);
  const sequenceEventsWithoutRetiredAttackDodge = sequenceEvents.filter((event) =>
    !retiredAttackDodgeEvents.has(event.id)
    && !eventCards(event).some((card) => retiredAttackDodgeCards.has(card.id)));
  const completedAttackDodgeEventIds = new Set(completedAttackDodgeSequenceCandidate
    ? [completedAttackDodgeSequenceCandidate.proof.rootEventId, completedAttackDodgeSequenceCandidate.proof.responseEventId]
    : []);
  const completedAttackDodgeCardIds = new Set(completedAttackDodgeSequenceCandidate
    ? [completedAttackDodgeSequenceCandidate.rootEvent.card.id, completedAttackDodgeSequenceCandidate.responseEvent.card.id]
    : []);
  const sequenceOwnerEventIds = publicCardDisplayOwnsPresentation ? new Set(publicDisplayOwnedEventIds) : completedAttackDodgeEventIds;
  const sequenceOwnerCardIds = publicCardDisplayOwnsPresentation ? publicDisplayOwnedPhysicalCardIds : completedAttackDodgeCardIds;
  const displayedSequenceEvents = sequenceEventsWithoutRetiredAttackDodge.filter((event) =>
    !sequenceOwnerEventIds.has(event.id)
    && !eventCards(event).some((card) => sequenceOwnerCardIds.has(card.id)));
  const displayedEventOwnedByPublicCard = Boolean(publicCardDisplayOwnsPresentation && displayedEvent
    && (sequenceOwnerEventIds.has(displayedEvent.id)
      || eventCards(displayedEvent).some((card) => sequenceOwnerCardIds.has(card.id))));
  const displayedEventIsRetiredAttackDodge = Boolean(displayedEvent
    && (retiredAttackDodgeEvents.has(displayedEvent.id)
      || eventCards(displayedEvent).some((card) => retiredAttackDodgeCards.has(card.id))));
  const displayedTableEvent = displayedEventOwnedByPublicCard || displayedEventIsRetiredAttackDodge ? null : displayedEvent;
  const tablePresentationVisible = displayedSequenceEvents.length > 0 || Boolean(displayedTableEvent && eventCards(displayedTableEvent).length);
  const attackDodgeTraceSeat = (playerId: string | null | undefined) => playerId
    ? room.players.find((player) => player.id === playerId)?.seat ?? null
    : null;
  const summarizeAttackRoot = (action: PresentationClientView["rootAction"]) => action?.action === "ATTACK" ? {
    semantics: action.semantics,
    rootEventId: action.rootEventId,
    interactionId: action.interactionId,
    rootFrameId: action.rootFrameId,
    checkpointId: action.checkpointId,
    presentationRevision: action.presentationRevision,
    sourceSeat: attackDodgeTraceSeat(action.sourceId),
    targetSeat: attackDodgeTraceSeat(action.targetId),
    cardKind: action.cardKind,
    physicalCardKind: action.physicalCardKind,
    playedAs: action.playedAs ?? null,
  } : null;
  const recentAttackDodgeTimeline = attackDodgeUxTraceActive ? room.timeline.slice(-8).flatMap((event) => event.type === "card"
    && event.action === "play" && (event.card.kind === "Attack" || event.card.kind === "Dodge")
      ? [{ eventId: event.id, action: event.action, cardKind: event.card.kind, playedAs: event.playedAs ?? null,
        resolutionId: event.resolutionId ?? null, presentation: event.presentation !== false, presented: presentedEventIds.has(event.id) }]
      : []) : [];
  const recentAttackDodgeEventIds = new Set(recentAttackDodgeTimeline.map((event) => event.eventId));
  const traceRelevantAttackDodgeProofs = attackDodgeUxTraceActive
    ? attackDodgeResponseEvaluations.filter(({ proof }) =>
      currentAttackRoot?.rootEventId === proof.rootEventId
      || activeAttackDodgeSettlement?.eventId === proof.responseEventId
      || recentAttackDodgeEventIds.has(proof.rootEventId)
      || recentAttackDodgeEventIds.has(proof.responseEventId)).slice(-12)
    : [];
  const attackDodgeProofIsRecent = attackDodgeUxTraceActive && attackDodgeResponseEvaluations.some(({ proof }) =>
    currentAttackRoot?.rootEventId === proof.rootEventId
    || activeAttackDodgeSettlement?.eventId === proof.responseEventId
    || recentAttackDodgeEventIds.has(proof.rootEventId)
    || recentAttackDodgeEventIds.has(proof.responseEventId));
  const attackDodgeTraceRelevant = attackDodgeUxTraceActive && Boolean(room.pendingAttack
    || room.currentAction?.requirement === "attack" || room.currentAction?.requirement === "dodge"
    || clientPresentation.rootAction?.action === "ATTACK" || attackDodgeProofIsRecent
    || activeAttackDodgeSettlement || recentAttackDodgeTimeline.length);
  const attackDodgeTraceSnapshot = attackDodgeTraceRelevant ? {
    room: { status: room.status, phase: room.phase, turnSeat: room.turnSeat, viewerSeat: attackDodgeTraceSeat(room.meId) },
    currentAction: {
      kind: room.currentAction?.kind ?? null,
      requirement: room.currentAction?.requirement ?? null,
      actorSeat: attackDodgeTraceSeat(room.currentAction?.actorId),
      actorIsViewer: room.currentAction?.actorId === room.meId,
      deadlineAt: room.currentAction?.deadline ?? null,
    },
    pendingAttack: room.pendingAttack ? {
      sourceSeat: attackDodgeTraceSeat(room.pendingAttack.sourceId),
      targetSeat: attackDodgeTraceSeat(room.pendingAttack.targetId),
      deadlineAt: room.pendingAttack.deadline ?? null,
    } : null,
    presentation: {
      interaction: room.presentationSnapshot?.interaction ? {
        semantics: room.presentationSnapshot.interaction.semantics,
        stage: room.presentationSnapshot.interaction.stage,
        interactionId: room.presentationSnapshot.interaction.interactionId,
        rootFrameId: room.presentationSnapshot.interaction.rootFrameId,
        activeFrameId: room.presentationSnapshot.interaction.activeFrameId,
        checkpointId: room.presentationSnapshot.interaction.checkpointId,
        presentationRevision: room.presentationSnapshot.interaction.presentationRevision,
        sourceSeat: attackDodgeTraceSeat(room.presentationSnapshot.interaction.sourceId),
        currentParticipantSeat: attackDodgeTraceSeat(room.presentationSnapshot.interaction.currentParticipantId),
        decisionActorSeat: attackDodgeTraceSeat(room.presentationSnapshot.interaction.decisionActorId),
        targetSeats: room.presentationSnapshot.interaction.targetIds.map(attackDodgeTraceSeat),
      } : null,
      serverRootAction: summarizeAttackRoot(room.presentationSnapshot?.rootAction ?? null),
      clientRootAction: summarizeAttackRoot(clientPresentation.rootAction),
      serverDodgeProofCount: room.presentationSnapshot?.attackDodgeResponses?.length ?? 0,
      clientDodgeProofs: traceRelevantAttackDodgeProofs.map(({ proof }) => ({
        semantics: proof.semantics,
        rootEventId: proof.rootEventId,
        responseEventId: proof.responseEventId,
        rootResolutionId: proof.rootResolutionId,
        responseResolutionId: proof.responseResolutionId,
        interactionId: proof.interactionId,
        rootFrameId: proof.rootFrameId,
        sourceSeat: attackDodgeTraceSeat(proof.rootSourceId),
        targetSeat: attackDodgeTraceSeat(proof.targetId),
        responseActorSeat: attackDodgeTraceSeat(proof.responseActorId),
        relation: proof.counterRelation,
      })),
      validatedTimelineEvents: recentAttackDodgeTimeline,
    },
    proofEvaluation: {
      count: attackDodgeResponseEvaluations.length,
      validCount: attackDodgeResponseCandidates.length,
      evaluations: traceRelevantAttackDodgeProofs.map(({ proof, reasons }) => ({
        semantics: proof.semantics,
        rootEventId: proof.rootEventId,
        responseEventId: proof.responseEventId,
        rootResolutionId: proof.rootResolutionId,
        responseResolutionId: proof.responseResolutionId,
        interactionId: proof.interactionId,
        rootFrameId: proof.rootFrameId,
        reasons,
      })),
      liveRootMatchCount: attackDodgeResponsesForCurrentRoot.length,
      heldSettlementMatchCount: attackDodgeResponsesForActiveSettlement.length,
      selectedCandidateReason: attackDodgeCandidateSelectionReason,
      newlyObservedResponseEventIds: pendingAttackDodgeResponseProofKeys.flatMap((proofKey) => {
        const candidate = attackDodgeResponseCandidates.find(({ proof }) => attackDodgeResponseProofKey(proof) === proofKey);
        return candidate ? [candidate.proof.responseEventId] : [];
      }),
      capturedSettlementProof: activeAttackDodgeSettlement ? {
        responseEventId: activeAttackDodgeSettlement.proof.responseEventId,
        rootEventId: activeAttackDodgeSettlement.proof.rootEventId,
        rootResolutionId: activeAttackDodgeSettlement.proof.rootResolutionId,
        responseResolutionId: activeAttackDodgeSettlement.proof.responseResolutionId,
        interactionId: activeAttackDodgeSettlement.proof.interactionId,
        rootFrameId: activeAttackDodgeSettlement.proof.rootFrameId,
      } : null,
      selectedCandidateIdentity: attackDodgeResponseCandidate ? {
        responseEventId: attackDodgeResponseCandidate.proof.responseEventId,
        rootEventId: attackDodgeResponseCandidate.proof.rootEventId,
        rootResolutionId: attackDodgeResponseCandidate.proof.rootResolutionId,
        responseResolutionId: attackDodgeResponseCandidate.proof.responseResolutionId,
        interactionId: attackDodgeResponseCandidate.proof.interactionId,
        rootFrameId: attackDodgeResponseCandidate.proof.rootFrameId,
      } : null,
      proofCandidateSelected: Boolean(attackDodgeDisplayCandidate),
    },
    publicCardDisplay: {
      rootEventId: publicCardDisplayAction?.rootEventId ?? null,
      interactionId: publicCardDisplayAction?.interactionId ?? null,
      rootFrameId: publicCardDisplayAction?.rootFrameId ?? null,
      sourceSeat: attackDodgeTraceSeat(publicCardDisplayAction?.sourceId),
      targetSeat: attackDodgeTraceSeat(publicCardDisplayAction?.targetId),
      cardKind: publicCardDisplayAction?.cardKind ?? null,
      cardId: publicCardDisplayAction?.cardFace?.id ?? null,
      cardFaceKind: publicCardDisplayAction?.cardFace?.kind ?? null,
      responseEventId: publicCardDisplayAction?.response?.eventId ?? null,
      responseActorSeat: attackDodgeTraceSeat(publicCardDisplayAction?.response?.actorId),
      responseCardFaceKind: publicCardDisplayAction?.response?.cardFace?.kind ?? null,
      settlementOutcome: publicCardDisplayAction?.settlement?.outcome ?? null,
      enabled: publicCardDisplayEnabled,
      ready: publicCardDisplayReady,
      ownsPresentation: publicCardDisplayOwnsPresentation,
      ownedEventCount: publicDisplayOwnedEventIds.length,
      temporarilyBlockedBy: {
        targetPreview: Boolean(targetPreviewPresentation),
        opponentInspection: Boolean(opponentInspectionPresentation),
        targetCardPickerModal: targetCardPickerInModal,
        expandedOpponent: expandedOpponentId !== null,
        groupScopePreview: groupScopePreview.active,
      },
      legacySequenceEventCount: displayedSequenceEvents.length,
      legacyTablePresentationVisible: tablePresentationVisible,
    },
    hold: {
      eventId: activeAttackDodgeSettlement?.eventId ?? null,
      phase: activeAttackDodgeSettlement?.phase ?? null,
      remainingMs: activeAttackDodgeSettlement?.remainingMs ?? null,
      superseded: attackDodgeHoldSuperseded,
      retirementReason: attackDodgeHoldSupersessionReason,
      capturedEventCount: attackDodgeSettlementCapturedEventIdsSnapshot.size,
      settlementCaptureGate: {
        candidateEventId: activeAttackDodgeSettlementEventId,
        publicResponseEventId: publicCardDisplayAction?.response?.eventId ?? null,
        publicCardDisplayReady,
        alreadyActive: attackDodgeSettlementAlreadyActive,
        alreadyCaptured: Boolean(activeAttackDodgeSettlementEventId && attackDodgeSettlementCapturedEventIdsSnapshot.has(activeAttackDodgeSettlementEventId)),
        eligible: attackDodgeSettlementCaptureRejectionReasons.length === 0,
        rejectionReasons: attackDodgeSettlementCaptureRejectionReasons,
      },
      resultReadRemainingMs: publicCardDisplayResultReadRemainingMs,
      activeRootLifecycle: publicCardDisplayAction?.cardKind === "Attack" && !publicCardDisplayAction.response
        ? "server-public-attack-root"
        : null,
    },
  } : null;
  const attackDodgeTraceSnapshotJson = attackDodgeTraceSnapshot ? JSON.stringify(attackDodgeTraceSnapshot) : null;
  useEffect(() => {
    if (!attackDodgeTraceSnapshotJson) return;
    recordAttackDodgeUxTrace("pipeline-state", JSON.parse(attackDodgeTraceSnapshotJson) as Record<string, unknown>);
    const shell = document.querySelector<HTMLElement>(".game-shell");
    if (!shell) return;
    const shellRect = shell.getBoundingClientRect();
    const trackedSelector = [
      ".interaction-stage-inspect-only",
      ".opponent-inspection-floating-shell",
      ".table-resolution-layer",
      ".active-table-reveal",
      ".player-played-cards",
      ".table-played-card",
      ".public-card-display",
      ".public-card-display .played-card",
    ].join(",");
    const domNodes = Array.from(shell.querySelectorAll<HTMLElement | SVGElement>(trackedSelector)).slice(0, 64).map((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const safeAttributes = ["data-local-ui-mode", "data-local-inspect-player-id", "data-public-card-display", "data-public-card-ready", "data-public-card-event-id", "data-public-card-root-event-id", "data-public-card-id", "data-public-card-actor-id", "data-public-card-source-id", "data-public-card-target-id", "data-public-card-settlement-event-id", "data-public-card-settlement-outcome"];
      const attributes = Object.fromEntries(safeAttributes.flatMap((name) => {
        const value = element.getAttribute(name);
        return value === null ? [] : [[name, value]];
      }));
      return {
        index,
        classes: (element.getAttribute("class") ?? "").split(/\s+/u).filter(Boolean),
        attributes,
        rect: {
          left: Math.round((rect.left - shellRect.left) * 10) / 10,
          top: Math.round((rect.top - shellRect.top) * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        },
        connected: element.isConnected,
        clientRectCount: element.getClientRects().length,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
      };
    });
    const table = shell.querySelector<HTMLElement>(".play-table");
    recordAttackDodgeUxTrace("presentation-dom", {
      topology: table?.dataset.seatTopology ?? null,
      stageMounted: Boolean(shell.querySelector(".interaction-stage")),
      legacySequenceMounted: Boolean(shell.querySelector(".table-resolution-layer")),
      publicCardDisplayMounted: Boolean(shell.querySelector(".public-card-display")),
      nodes: domNodes,
    });
  }, [attackDodgeTraceSnapshotJson]);
  const localEquipmentSelection = activeSkillSelection
    ? { eligibleIds: activeSkillSelection.eligibleCardIds, selectedIds: activeSkillSelectedCardIds, max: activeSkillSelection.max, disabled: busy || presentationBusy && !responseCardSelectionReady, onToggle: toggleActiveSkillCardSelection }
    : targetCardPickerInLocalDock && targetCardPickerSelection && targetCardPickerTarget
      ? {
        eligibleIds: targetCardPickerSelection.eligibleKeys,
        selectedIds: targetCardPickerSelectedKeys,
        max: targetCardPickerSelection.max,
        disabled: responseControlsDisabled,
        onToggle: (cardId: string) => setTriggerSelectedKeys((keys) => {
          const equipmentIds = new Set(targetCardPickerTarget.equipmentCards.map((item) => item.id));
          if (!targetCardPickerSelection.eligibleKeys.includes(cardId) || !equipmentIds.has(cardId)) return keys;
          const validKeys = keys.filter((key) => targetCardPickerSelection.eligibleKeys.includes(key) && equipmentIds.has(key));
          return validKeys.includes(cardId) ? validKeys.filter((key) => key !== cardId) : validKeys.length < targetCardPickerSelection.max ? [...validKeys, cardId] : validKeys;
        }),
      }
      : triggerResponse && triggerSelectionUsesCards
        ? { eligibleIds: triggerCardOption?.selection?.type === "cards" ? triggerCardOption.selection.eligibleCardIds : [], selectedIds: triggerSelectedCardIds, max: triggerSelectionMax, disabled: busy || !responseDecisionReady, onToggle: (cardId: string) => setSerpentSelected((ids) => ids.includes(cardId) ? ids.filter((id) => id !== cardId) : ids.length < triggerSelectionMax ? [...ids, cardId] : ids) }
        : null;
  const consoleKind: ConsoleDecisionKind = canChooseTargetCard || targetCardPickerOption ? "target-card"
    : borrowedSwordTargetSelectionActive ? "borrowed-sword"
    : activeSkillSelection || activeSkillTargetSelection ? "active-skill"
    : triggerResponse ? "trigger"
    : canRespond ? (room.currentAction?.requirement === "dodge" ? "response" : room.currentAction?.requirement === "attack" ? "duel" : room.currentAction?.requirement === "negate" ? "judgement" : "response")
    : rescueDecisionReady ? "rescue"
    : canChooseHarvest || privateDistribution || privateDeckReorder ? "special"
    : room.isMyTurn && room.phase === "discard" ? "discard"
    : room.currentAction?.kind === "turn" && currentActionOwnedByViewer ? "turn"
    : room.currentAction?.kind === "none" || !room.currentAction ? "rest"
    : "waiting";
  const consoleSelection: ConsoleSelectionFact | undefined = daqiaoDeflectionSelectionActive
    ? { active: true, hasInput: daqiaoDeflectionCardCount > 0 || daqiaoDeflectionTargetCount > 0, count: daqiaoDeflectionCardCount + daqiaoDeflectionTargetCount, min: 2, max: 2, summary: "" }
    : lustLocalSelectionActive && activeSkillSelection
      ? { active: true, hasInput: activeSkillSelectedCardIds.length > 0 || activeSkillSelectedTargetIds.length > 0, count: activeSkillSelectedCardIds.length + activeSkillSelectedTargetIds.length, min: activeSkillSelection.min + activeSkillTargetMin, max: activeSkillSelection.max + activeSkillTargetMax, summary: "" }
    : localTargetSelection.selectionActive
      ? { active: true, hasInput: localTargetSelection.canCancel, count: localTargetSelection.selectedTargetIds.length, min: localTargetSelection.minTargetCount, max: localTargetSelection.maxTargetCount, summary: localTargetSelection.instruction }
    : activeSkillSelection && activeSkillStateIsCurrent
      ? { active: true, hasInput: activeSkillSelectedCardIds.length > 0 || activeSkillSelectedTargetIds.length > 0, count: activeSkillSelectedCardIds.length + activeSkillSelectedTargetIds.length, min: activeSkillSelection.min, max: activeSkillSelection.max, summary: `${activeSkillSelectedCardIds.length} card${activeSkillSelectedCardIds.length === 1 ? "" : "s"} selected` }
      : triggerSelection
        ? { active: true, hasInput: triggerSelectedCardIds.length > 0 || triggerSelectionKeys.length > 0 || Boolean(triggerChoice), count: triggerSelectedCardIds.length || triggerSelectionKeys.length, min: triggerSelectionUsesCards ? triggerSelection.min : triggerChoice ? triggerSelection.cardCountByChoice?.[triggerChoice] ?? 0 : 0, max: triggerSelectionUsesCards ? triggerSelection.max : triggerChoice ? triggerSelection.cardCountByChoice?.[triggerChoice] ?? 0 : 0, summary: `${triggerSelectedCardIds.length || triggerSelectionKeys.length} selected` }
    : !targetCardPickerUsesUnifiedModal && targetCardPickerOption && targetCardPickerSelection
        ? { active: true, hasInput: targetCardPickerSelectedKeys.length > 0, count: targetCardPickerSelectedKeys.length, min: targetCardPickerSelection.min, max: targetCardPickerSelection.max, summary: `${targetCardPickerSelectedKeys.length} card key${targetCardPickerSelectedKeys.length === 1 ? "" : "s"} selected` }
      : selectedResponseProvider?.selection?.type === "cards"
          ? { active: true, hasInput: responseSelectedCardIds.length > 0, count: responseSelectedCardIds.length, min: selectedResponseProvider.selection.min, max: selectedResponseProvider.selection.max, summary: `${responseSelectedCardIds.length} card${responseSelectedCardIds.length === 1 ? "" : "s"} selected` }
          : room.phase === "discard"
            ? { active: true, hasInput: discardSelected.length > 0, count: discardSelected.length, min: excessCards, max: excessCards, summary: `${discardSelected.length} of ${excessCards} selected` }
            : undefined;
  const consolePrimaryCandidates = [
    ...(borrowedSwordTargetSelectionActive && canUseAction(room.currentAction, "choose_borrowed_sword_target") ? [{ id: "borrowed-sword", label: "Confirm", enabled: localTargetSelection.canConfirm, priority: 80 }] : []),
    ...(activeSkillSelection || activeSkillTargetSelection ? [{ id: "active-skill", label: "Confirm", enabled: activeSkillConfirmEnabled, priority: 70 }] : []),
    ...(targetCardPickerInLocalDock ? [{ id: "target-card-picker", label: "Confirm", enabled: targetCardPickerSelectionComplete && !responseControlsDisabled, priority: 70 }] : []),
    ...(triggerResponse && canUseAction(room.currentAction, "trigger") && selectedTriggerOption?.selection?.type === "cards" ? [{ id: "trigger-cards", label: "Confirm", enabled: triggerSubmissionComplete, priority: 70 }] : []),
    ...(triggerResponse && canUseAction(room.currentAction, "trigger") && selectedTriggerOption?.selection?.type === "target" ? [{ id: "trigger-target", label: "Confirm", enabled: localTargetSelection.canConfirm, priority: 70 }] : []),
    ...(canRespond && selectedResponseProvider ? [{ id: "response", label: "Confirm", enabled: canUseAction(room.currentAction, "respond") && responseSelectionComplete, priority: 60 }] : []),
    ...(dyingFirstAidSelectionActive ? [{ id: "first-aid", label: "Confirm", enabled: canUseAction(room.currentAction, "respond") && responseSelectionComplete, priority: 65 }] : []),
    ...(rescueDecisionReady && !canRespond ? [{ id: "rescue", label: "Peach", enabled: canUseAction(room.currentAction, "give_peach") && card?.kind === "Peach", priority: 60 }] : []),
    ...(room.isMyTurn && room.phase === "discard" && currentActionOwnedByViewer ? [{ id: "discard", label: `Discard ${excessCards} selected`, enabled: canUseAction(room.currentAction, "discard_cards") && discardSelected.length === excessCards, priority: 60 }] : []),
    ...(room.isMyTurn && canPlay && currentActionOwnedByViewer ? [{ id: "turn", label: serpentMode ? "Form Attack" : normalTargetSelectionActive ? "Confirm" : "Play", enabled: (canUseAction(room.currentAction, "play_card") || canUseAction(room.currentAction, "serpent_spear_attack")) && (serpentMode ? canDeclareAttack && serpentSelected.length === 2 && attackTargetsValid : Boolean(card) && (!selectedCanPlayAsAttack || canDeclareAttack && attackTargetsValid) && (!(["Dodge", "Negation"].includes(card?.kind ?? "")) || selectedCanPlayAsAttack)), priority: 40 }] : []),
  ];
  const consoleIsDecisionActor = currentActionOwnedByViewer;
  const rainingArrowsDamageDecline = Boolean(
    currentActionOwnedByViewer
    && room.currentAction?.kind === "response"
    && room.currentAction.requirement === "dodge"
    && responseDamageAction === "decline_response"
    && clientPresentation.stage === "GROUP_RESOLUTION"
    && clientPresentation.groupResolution?.resolutionSemantics === "GROUP"
    && clientPresentation.groupResolution.cardKind === "RainingArrows"
    && clientPresentation.currentParticipantId === room.meId
    && clientPresentation.groupParticipantProgress.some((participant) =>
      participant.playerId === room.meId && (participant.status === "CURRENT" || participant.status === "PAUSED"),
    ),
  );
  const negationWindowSubmitted = sharedNegationWindow && room.pendingNegation?.submitted === true;
  const responseRequirementForDecline = room.currentAction?.requirement;
  // Require a proven damage-causing interaction; the available response cards do not define the decline's consequence.
  const groupDamageResponseDecline = (() => {
    const group = clientPresentation.groupResolution;
    const currentParticipant = group?.participants.find((participant) => participant.playerId === room.meId);
    if (!group || clientPresentation.stage !== "GROUP_RESOLUTION"
      || group.currentParticipantId !== room.meId
      || (currentParticipant?.status !== "CURRENT" && currentParticipant?.status !== "PAUSED")) return false;
    return (group.resolutionSemantics === "GROUP"
      && group.cardKind === "BarbarianInvasion"
      && responseRequirementForDecline === "attack")
      || (group.resolutionSemantics === "ORDERED"
        && group.cardKind === "SkyPiercingHalberdAttack"
        && responseRequirementForDecline === "attack");
  })();
  const attackDamageResponseDecline = Boolean(
    currentActionOwnedByViewer
    && room.currentAction?.kind === "response"
    && responseRequirementForDecline === "dodge"
    && canUseAction(room.currentAction, "decline_response")
    && clientPresentation.hasInteraction
    && clientPresentation.stage === "ATTACK_RESPONSE"
    && clientPresentation.currentParticipantId === room.meId
    && clientPresentation.activeTargetIds.includes(room.meId)
    && clientPresentation.rootAction?.semantics === "PROVEN"
    && clientPresentation.rootAction.action === "ATTACK"
    && clientPresentation.rootAction.targetId === room.meId,
  );
  const duelDamageResponseDecline = Boolean(
    currentActionOwnedByViewer
    && room.currentAction?.kind === "response"
    && responseRequirementForDecline === "attack"
    && canUseAction(room.currentAction, "decline_response")
    && clientPresentation.hasInteraction
    && clientPresentation.stage === "DUEL_EXCHANGE"
    && clientPresentation.duelExchange?.semantics === "PROVEN"
    && clientPresentation.duelExchange.currentParticipantId === room.meId,
  );
  const declineAcceptsDamage = Boolean(
    currentActionOwnedByViewer
    && room.currentAction?.kind === "response"
    && canUseAction(room.currentAction, "decline_response")
    && (attackDamageResponseDecline || duelDamageResponseDecline || rainingArrowsDamageDecline || groupDamageResponseDecline),
  );
  const responseDeclineLabel = declineAcceptsDamage ? "TAKE DAMAGE" : sharedNegationWindow ? "Pass" : "Skip";
  const rainingArrowsDodgeProviderCardIds = new Set(
    rainingArrowsDamageDecline
      && responseSelection?.type === "cards"
      && selectedResponseProvider?.satisfies === "dodge"
      ? responseSelection.eligibleCardIds
      : [],
  );
  const rainingArrowsHasHandDodgeProvider = Boolean(
    canRespond
    && responseDecisionReady
    && !triggerResponse
    && !activeSkillSelection
    && !activeSkillTargetSelection
    && !wushengMode
    && !longdanMode
    && room.myHand.some((item) => rainingArrowsDodgeProviderCardIds.has(item.id)),
  );
  const responseRequirement = room.currentAction?.requirement;
  const localSemanticResponseGuidance = Boolean(
    consoleIsDecisionActor
    && room.currentAction?.kind === "response"
    && canRespond
    && genericResponse
    && responseRequirement
    && semanticResponseOptions.some((option) => option.satisfies === responseRequirement),
  );
  const negationResponseGuidance = Boolean(
    localSemanticResponseGuidance
    && responseRequirement === "negate"
    && responseDamageAction === "decline_response"
  );
  const consoleAuthoritativeDecision = Boolean(room.currentAction && room.currentAction.kind !== "none" && (consoleIsDecisionActor || room.isMyTurn && room.currentAction.kind === "turn" && currentActionOwnedByViewer));
  const consoleInstruction = lustLocalSelectionActive && activeSkillSelection
    ? `Select ${activeSkillSelection.min} card${activeSkillSelection.min === 1 ? "" : "s"} and ${activeSkillTargetMin} Duel participant${activeSkillTargetMin === 1 ? "" : "s"}.`
    : sharedNegationWindow
    ? room.currentAction?.reason || "Negation response window"
    : negationResponseGuidance
      ? "Play Negation or Skip."
    : rainingArrowsDamageDecline
      ? "Respond to Raining Arrows."
    : consoleIsDecisionActor
    ? room.currentAction?.kind === "trigger" ? decisionInstruction(room.currentAction, room.currentAction.reason) : decisionPresentation.primaryStatus
    : decisionPresentation.isWaiting
      ? decisionPresentation.supportingInstruction
      : room.currentAction?.reason || decisionPresentation.supportingInstruction;
  const consoleDecline = responseDamageAction || triggerDeclineAction ? { label: responseDamageAction === "decline_response" ? responseDeclineLabel : "Skip", enabled: true } : null;
  const canClearTargetCardPickerSelection = Boolean(
    targetCardPickerOption
    && (!activeSkillOption || activeSkillOption.effectId !== targetCardPickerOption.effectId)
    && targetCardPickerSelectedKeys.length > 0,
  );
  const consoleSecondaryControls = [
    ...(genericTriggerOptions.map((option) => option.label)),
    ...(genericResponseOptions.map((option) => option.label)),
    ...(canFormSerpentAttack ? [serpentMode ? "Normal" : "Spear"] : []),
    ...(room.isMyTurn && canPlay ? ["End"] : []),
  ].filter((label, index, all) => Boolean(label) && all.indexOf(label) === index);
  const consoleLocalCancelVisible = !lustLocalSelectionActive && (
    localTargetSelection.canCancel && !triggerHasProviderCancelSurface && !normalHasProviderCancelSurface
    || Boolean(canChooseTargetCard && !pendingTargetCardUsesUnifiedModal)
    || canClearTargetCardPickerSelection
  );
  const consoleLocalCancelEnabled = !lustLocalSelectionActive && (
    localTargetSelection.canCancel
    || Boolean(canChooseTargetCard && !pendingTargetCardUsesUnifiedModal)
    || canClearTargetCardPickerSelection
  );
  const consoleDecision = buildConsoleDecisionDisplay({
    kind: consoleKind,
    instruction: consoleInstruction,
    viewerIsDecisionActor: consoleIsDecisionActor || consoleKind === "turn" && room.isMyTurn && currentActionOwnedByViewer,
    authoritativeDecision: consoleAuthoritativeDecision,
    busy: busy || activeSkillSelectionBusy,
    selection: consoleSelection,
    primaryCandidates: consolePrimaryCandidates,
    localCancel: { visible: consoleLocalCancelVisible, enabled: consoleLocalCancelEnabled },
    authoritativeDecline: consoleDecline,
    secondaryControls: consoleSecondaryControls,
  });
  const consolePrimaryId = consoleDecision.primary?.id ?? null;
  return <main className="game-shell" data-presentation-kind={clientPresentation.stableKind} data-presentation-has-interaction={clientPresentation.hasInteraction ? "true" : "false"} data-presentation-local-control={clientPresentation.hasLocalControl ? "true" : "false"} data-presentation-transition={presentationTransition.kind}><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b></div></header>
    <section className="action-strip" aria-label="Turn and decision ownership"><div className="action-step"><small>TURN OWNER</small><b>{decisionPresentation.turnOwner}</b></div><span className="action-arrow">→</span><div className="action-step"><small>PHASE</small><b>{decisionPresentation.phaseLabel}</b></div><span className="action-arrow">→</span><div className="action-step acting"><small>{decisionPresentation.isDecision ? "DECISION OWNER" : "CURRENT TURN"}</small><b>{decisionPresentation.actionOwner}{decisionPresentation.isViewerRequiredActor ? " · YOU" : ""}</b></div></section>
    <section className={`play-table ${displayedSequenceEvents.length > 0 ? "sequence-active" : ""} ${resolutionClosing ? "sequence-concluding" : ""}`} data-seat-topology={room.players.length >= 5 ? "side-column" : "top-row"}>
      <div className="interaction-safe-zone"><InteractionStage view={clientPresentation} transitionKind={presentationTransition.kind} resolvePlayerName={(playerId) => room.players.find((player) => player.id === playerId)?.name ?? null} inspectPlayer={opponentInspectionPresentation} judgementInFlight={judgementInFlight} onCloseInspect={() => setExpandedOpponentId(null)} nestedCardDetailDismissRef={nestedInspectorCardDetailDismissRef} /><StageSystemCluster
        publicResponseTimerPending={seatCountdown?.kind === "response"}
        responseTimer={seatCountdown?.kind === "response"
          ? <Countdown key={seatCountdown.key} visibleAt={room.phase === "response" ? room.responseCountdownVisibleAt : 0} durationMs={seatCountdown.durationMs} deadline={seatCountdown.deadline} label={seatCountdown.label} responseTimer />
          : null}
        eventTimer={<>{privateDrawTimer}{harvestEventTimer}</>}
      />
      {effectNotice && effectNotice.roomCode === room.code && effectNotice.viewerId === room.meId
        && !(publicCardDisplayReady && (publicCardDisplayAction?.motion?.type === "lust-cost" || publicCardDisplayAction?.motion?.type === "lust-duel")
          && (publicCardDisplayAction.lustCostFrame?.activationEventId === effectNotice.eventId
            || publicCardDisplayAction.settlement?.eventId === effectNotice.eventId))
        && <div key={effectNotice.eventId} className={`effect-notice${effectNotice.exiting ? " is-exiting" : ""}`} role="status" aria-live="polite" aria-atomic="true" data-effect-notice-event-id={effectNotice.eventId}><span>{effectNotice.heading}</span><b>{effectNotice.message}</b></div>}
      </div>
      {turnNotice && <div className="turn-notice" role="status"><span>TURN BEGINS</span><b>{turnNotice}</b></div>}
      {canChooseBorrowedSword && <div className="turn-notice borrowed-sword-notice" role="status"><span>BORROWED SWORD</span><b>{borrowedSwordTargetId ? "Target selected · confirm below" : "Choose a legal Attack target"}</b></div>}
      {privateDrawVisible && <div className="played-card-stage private-draw-stage" role="status"><div className="private-draw-content"><div className="card-action-title"><b>PRIVATE DRAW</b><span>Only you can see these cards</span></div><div className="private-draw-row" role="region" aria-label="Private drawn cards; scroll horizontally to view all" tabIndex={privateDrawCards.length > 3 ? 0 : undefined}>{privateDrawCards.map((drawn) => <CardFace card={drawn} key={drawn.id} />)}</div></div></div>}
      {privateDistribution && !presentationBusy && <PrivateCardDistributionDialog key={room.actionRevision} cards={privateDistribution.cards} players={room.players.filter((player) => privateDistribution.eligibleRecipientIds.includes(player.id) && player.alive)} disabled={busy} error={error} onSubmit={(assignments) => onAction("trigger", { providerId: "private_card_distribution", assignments })} />}
      {privateDeckReorder && <PrivateDeckReorderDialog key={room.actionRevision} cards={privateDeckReorder.cards} minTop={privateDeckReorder.minTop} maxTop={privateDeckReorder.maxTop} disabled={busy} error={error} onSubmit={(topCardIds, bottomCardIds) => onAction("trigger", { providerId: "private_deck_reorder", topCardIds, bottomCardIds })} />}
      {tablePresentationVisible && <TableResolutionSequence events={displayedSequenceEvents} activeEvent={displayedTableEvent} players={room.players} myTableIndex={myTableIndex} concluding={resolutionClosing} />}
      {room.pendingHarvest && !presentationBusy && <div className="game-event-stage harvest-choice-stage" role="dialog" aria-label="Bumper Harvest card choice"><div><span>BUMPER HARVEST</span><b>{room.pendingHarvest.complete ? "All choices complete" : harvestSubmitting ? "Your choice is submitted" : canChooseHarvest ? "Your turn — choose one card" : `${actor?.name ?? "The next player"} is choosing`}</b><small>{room.pendingHarvest.complete ? "The final shaded card remains visible before Bumper Harvest closes." : harvestSubmitting ? "Your card is shaded immediately while the next choice is prepared." : canChooseHarvest ? "Tap any available card to change your selection, then confirm. Selection changes are instant." : "Watch the current player's card rise, then become shaded when confirmed."}</small><div className="harvest-card-row">{room.pendingHarvest.revealed.map((choice) => { const takenBy = room.pendingHarvest?.choices.find((entry) => entry.cardId === choice.id); const submittedByMe = harvestSubmitting?.cardId === choice.id; const available = room.pendingHarvest?.availableIds.includes(choice.id); const awaitingConfirmation = !submittedByMe && activeHarvestSelection === choice.id; return <button type="button" className={`harvest-card-choice ${takenBy || submittedByMe ? "taken" : ""} ${awaitingConfirmation ? "pending-choice" : ""}`} disabled={!canChooseHarvest || Boolean(harvestSubmitting) || busy || !available} aria-pressed={awaitingConfirmation} aria-label={takenBy ? `${cardDefinition(choice.kind).name}, taken by ${takenBy.playerName}` : submittedByMe ? `${cardDefinition(choice.kind).name}, choice submitted by ${harvestSubmitting?.playerName ?? "ME"}` : `${cardDefinition(choice.kind).name}, ${awaitingConfirmation ? `selected by ${actor?.name ?? "current player"}, awaiting confirmation` : "available"}`} key={choice.id} onClick={() => { const nextCardId = activeHarvestSelection === choice.id ? "" : choice.id; setHarvestSelected(nextCardId); void publishHarvestPreview(nextCardId); }}><CardFace card={choice} />{takenBy && <strong className="harvest-taken-label">Taken by {takenBy.playerName}</strong>}{submittedByMe && !takenBy && <strong className="harvest-taken-label">Chosen by {harvestSubmitting?.playerName ?? "ME"}</strong>}{awaitingConfirmation && <strong className="harvest-pending-label">Selected by {actor?.name ?? "player"}</strong>}</button>; })}</div>{canChooseHarvest && (harvestSubmitting ? <div className="harvest-confirm-row"><small>Choice submitted · moving to the next player</small></div> : <div className="harvest-confirm-row"><small>{harvestSelectedCard ? `${cardDefinition(harvestSelectedCard.kind).name} selected` : "Select a card before confirming"}</small><button type="button" className="primary" disabled={busy || !harvestSelectedCard} onClick={async () => { if (!harvestSelectedCard || !me) return; const submission = { cardId: harvestSelectedCard.id, playerId: me.id, playerName: me.name }; queuedHarvestPreview.current = null; setHarvestSubmitting(submission); setHarvestSelected(""); const accepted = await onAction("choose_harvest", { cardId: submission.cardId }); if (!accepted) setHarvestSubmitting(null); }}>Confirm choice</button></div>)}</div></div>}
      <div className="play-center" aria-hidden="true"><div className="draw-stack" data-draw-anchor="true" /><div className="discard-stack" data-discard-anchor="true" /></div>
      {pendingTargetCardUsesUnifiedModal && pendingTargetCardSelectableSelection && pendingTargetCardSelectableTarget && supportsAuthoritativeTargetCardSelection(pendingTargetCardSelectableSelection, pendingTargetCardSelectableTarget) && room.pendingTargetCard && pendingTargetCardActionName && <TargetCardPicker option={null} presentationCopy={{ title: pendingTargetCardActionName, accessibleName: `${pendingTargetCardActionName} target card selection`, instruction: room.pendingTargetCard.cardKind === "Steal" ? "Choose 1 card to obtain" : "Choose 1 card to discard", actionLabel: `Use ${pendingTargetCardActionName}` }} selection={pendingTargetCardSelectableSelection} target={pendingTargetCardSelectableTarget} selectedKeys={pendingTargetCardSelectedKeys} disabled={busy || presentationBusy || !canUseAction(room.currentAction, "choose_target_card")} canDecline={false} showCancel error={error} onToggle={togglePendingTargetCardSelection} onUse={submitPendingTargetCardPicker} onCancel={clearPendingTargetCardSelection} onDecline={() => undefined} />}
      {targetCardPickerInModal && targetCardPickerOption && targetCardPickerSelection && targetCardPickerTarget && <TargetCardPicker option={targetCardPickerOption} selection={targetCardPickerSelection} target={targetCardPickerTarget} selectedKeys={triggerSelectedKeys} disabled={triggerControlsDisabled} canDecline={Boolean(consoleDecision.authoritativeDecline)} showCancel={targetCardPickerUsesUnifiedModal || consoleDecision.localCancel.visible && (!activeSkillOption || activeSkillOption.effectId !== targetCardPickerOption.effectId)} error={error} onToggle={(key) => setTriggerSelectedKeys((keys) => { const validKeys = keys.filter((selectedKey) => targetCardPickerSelection.eligibleKeys.includes(selectedKey)); return validKeys.includes(key) ? validKeys.filter((selectedKey) => selectedKey !== key) : validKeys.length < targetCardPickerSelection.max ? [...validKeys, key] : validKeys; })} onUse={submitTargetCardPicker} onCancel={cancelTargetCardPicker} onDecline={() => onAction("decline_trigger")} />}
      {triggerResponse && responseDecisionReady && choiceTriggerOption?.selection?.type === "choice" && <MandatoryChoiceDialog option={choiceTriggerOption} selection={choiceTriggerOption.selection} hand={room.myHand} selectedChoice={triggerChoice} selectedKeys={triggerSelectionKeys} disabled={triggerControlsDisabled} error={error} onChoice={(choice) => { setTriggerChoice(choice); setTriggerSelectedKeys([]); }} onToggle={(key) => { const validKeys = triggerSelectedKeys.filter((selectedKey) => choiceTriggerOption.selection?.type === "choice" && choiceTriggerOption.selection.eligibleHandKeys.includes(selectedKey)); const required = choiceTriggerOption.selection?.type === "choice" ? choiceTriggerOption.selection.cardCountByChoice?.[triggerChoice] ?? (triggerChoice === "discard" ? 1 : 0) : 0; setTriggerSelectedKeys(validKeys.includes(key) ? validKeys.filter((selectedKey) => selectedKey !== key) : validKeys.length < required ? [...validKeys, key] : validKeys); }} onConfirm={(choice, cardKeys) => onAction("trigger", { providerId: choiceTriggerOption.effectId, choice, ...(cardKeys.length ? { cardKeys } : {}) })} />}
      {room.status === "finished" && <div className="victory-banner"><span>MATCH COMPLETE</span><b>{room.log.at(-1)?.replace("! The match is over.", "")}</b><small>All roles are now revealed at the table.</small></div>}
      {groupScopePreview.active && <p className="group-scope-preview-label" data-group-scope-preview={groupScopePreview.cardKind ?? undefined} role="status">PREVIEW · {groupScopePreview.label}</p>}
      <div className="player-board" aria-label="Players" data-player-count={room.players.length} data-seat-topology={room.players.length >= 5 ? "side-column" : "top-row"}>
        {room.players.filter((player) => player.id !== room.meId).map((player) => {
          const index = room.players.findIndex((candidate) => candidate.id === player.id);
          const relativeIndex = (index - myTableIndex + room.players.length) % room.players.length;
          const selectedTargetCardKind = selectedCanPlayAsAttack ? "Attack" : card?.kind;
          const cardTargetLegal = Boolean(card && (card.kind === "BorrowedSword"
            ? borrowedSwordPlayTargetIds.includes(player.id)
            : selectedTargetCardKind && canTargetCharacter({ sourceId: room.meId, targetId: player.id, targetHero: player.hero, targetHandCount: player.handCount, cardKind: selectedTargetCardKind })));
          const targetablePlayer = Boolean(
            borrowedSwordTargetSelectionActive && borrowedSwordEligibleTargetIds.includes(player.id) && player.alive
            || activeSkillTargetMode && activeSkillTargetIds.includes(player.id) && player.alive
            || triggerTargetSelection?.targetIds.includes(player.id) && triggerTargetMode
            || serpentMode && canPlay
            || card && cardTargetLegal && (selectedCanPlayAsAttack || card.kind === "Dismantle" || card.kind === "Steal" || card.kind === "Duel" || card.kind === "BorrowedSword" || card.kind === "Overindulgence" || card.kind === "RationsDepleted"),
          );
          const interactionRoles = projectInteractionSeatRoles(clientPresentation, player.id);
          return <OpponentPlayerCard
            key={`square-${player.id}`}
            totalPlayers={room.players.length}
            player={player}
            viewerId={room.meId}
            playerHero={heroDefinition(player.hero)}
            relativeIndex={relativeIndex}
            isTurn={player.seat === room.turnSeat}
            isSelectedTarget={borrowedSwordTargetId === player.id || (daqiaoDeflectionSelectionActive ? activeSkillSelectedTargetIds.includes(player.id) : targetIds.includes(player.id))}
            isGroupPreview={groupScopePreview.affectedPlayerIds.includes(player.id)}
            interactionRoles={interactionRoles}
            targetSelectionActive={targetSelectionActive}
            targetablePlayer={targetablePlayer}
            daqiaoDeflectionTargetMode={daqiaoDeflectionSelectionActive}
            testViewerController={Boolean(room.isTestController)}
            onTarget={() => { if (borrowedSwordTargetSelectionActive) chooseBorrowedSwordTarget(player.id); else { setTarget(player.id); setTargetCardIndex(null); } if (!daqiaoDeflectionSelectionActive) setExpandedOpponentId(player.id); }}
            onInspect={() => setExpandedOpponentId(player.id)}
            onSwitchTestViewer={(playerId) => { void onSwitchTestViewer(playerId); }}
            judgementInFlight={judgementInFlight}
            serpentSelected={serpentSelected}
            triggerResponse={triggerResponse}
            triggerSelectionUsesCards={triggerSelectionUsesCards}
            responseDecisionReady={responseDecisionReady}
            triggerCardOption={triggerCardOption}
            onToggleEquipment={(cardId) => setSerpentSelected((ids) => ids.includes(cardId) ? ids.filter((id) => id !== cardId) : ids.length < (triggerResponse && triggerSelectionUsesCards ? triggerSelectionMax : 2) ? [...ids, cardId] : ids)}
          />;
        })}
      </div>
      {seatCountdown?.kind === "rescue" && <Countdown key={seatCountdown.key} visibleAt={room.phase === "response" ? room.responseCountdownVisibleAt : 0} durationMs={seatCountdown.durationMs} deadline={seatCountdown.deadline} label={seatCountdown.label} />}
      <PublicCardDisplay action={publicCardDisplayAction} enabled={publicCardDisplayEnabled} sourceName={rootActionSource?.name ?? null} targetName={rootActionTarget?.name ?? null} compactPlayerNamesById={compactPublicPlayerNamesById} roomCode={room.code} viewerId={room.meId} viewerSeat={me?.seat ?? null} resultReadRemainingMs={publicCardDisplayResultReadRemainingMs} onInspectCard={(card, trigger) => openCardDetails(card, "public-zone", trigger)} onJourneyEventParked={markPublicCardJourneyEventParked} onJourneySettled={(settlementEventId) => {
        setActiveDismantleSettlement((current) => current?.eventId === settlementEventId && !current.journeySettled
          ? { ...current, journeySettled: true }
          : current);
      }} />
      <PublicActivityChip status={publicActivityStatus} viewerId={room.meId} seatLayoutKey={publicActivitySeatLayoutKey} />
      {infoCard && <CardDetailsPreview card={infoCard} context={infoCardContext} onClose={closeCardDetails} />}
      {infoHero && me && <HeroDetailsPreview hero={infoHero} currentHp={me.hp} maximumHp={me.maxHp} onClose={closeHeroDetails} />}
    </section>
    <footer className="play-command">
    <LocalPlayerDock player={me} hero={localHero} selfTargetable={localDockSelfTargetable} selfTargetSelected={localDockSelfTargetSelected} onSelfTarget={() => { setExpandedOpponentId(null); setTarget(room.meId); setTargetCardIndex(null); }} isGroupPreview={groupScopePreview.affectedPlayerIds.includes(room.meId)} interactionRoles={projectInteractionSeatRoles(clientPresentation, room.meId)} onHeroInfo={openHeroDetails} onInfoCard={(card, trigger) => openCardDetails(card, "public-zone", trigger)} equipmentSelection={localEquipmentSelection} hiddenCardIds={judgementInFlight} attackResponsePrompt={Boolean(rootAction?.action === "ATTACK" && rootActionCardFace && rootAction.targetId === room.meId && room.currentAction?.kind === "response" && room.currentAction.requirement === "dodge" && room.currentAction.actorId === room.meId && canUseAction(room.currentAction, "respond"))} preserveGuidanceHeight={Boolean(activeAttackHitSettlement || attackHitSettlements.some((proof) => !processedEventIds.has(proof.eventId)) || activeGroupSettlement || clientPresentation.groupSettlements.some((proof) => !processedEventIds.has(proof.eventId)) || activeBumperHarvestSettlement || clientPresentation.bumperHarvestSettlements.some((proof) => !processedEventIds.has(proof.eventId)))}
      heroSkillControl={
        <section className="hero-skills local-hero-skills" aria-label="Available hero skills">
          {heroSkillButtons.map((skill) => skill.passive
            ? <div key={skill.name} className="hero-skill-button hero-skill-passive" role="group" aria-label={`${skill.name}, passive skill`}>{skill.name}</div>
            : <button type="button" key={skill.name} className={`hero-skill-button ${skill.active ? "active" : ""}`} aria-label={skill.name} aria-pressed={skill.active} title={skill.description} disabled={!skill.enabled || (busy && !(skill.name === "Deflection" && canActivateDaqiaoDeflectionDuringTimerStart)) || (presentationBusy && !responseDecisionReady && !skill.active && !(skill.name === "Deflection" && canActivateDaqiaoDeflection))} onClick={() => skill.onClick?.()}>{skill.active && (me?.hero === "guan-yu" || me?.hero === "zhao-yun") ? `Cancel ${skill.name}` : skill.name}</button>)}
        </section>
      } guidance={
        <div className="console-guidance" data-console-guidance="true">
          <div className="console-guidance-row">
            <div
              className={`decision-status ${consoleDecision.controlsVisible ? "decision-status-active" : ""}`}
              data-console-decision-kind={consoleDecision.kind}
              data-console-coherent={consoleDecision.coherent ? "true" : "false"}
              data-console-primary={consoleDecision.primary?.label ?? "none"}
              data-console-primary-enabled={consoleDecision.primary?.enabled ? "true" : "false"}
              data-console-selection-count={consoleDecision.selectionCount ?? undefined}
              data-console-local-cancel={consoleDecision.localCancel.visible ? "true" : "false"}
              data-console-authoritative-decline={consoleDecision.authoritativeDecline ? "true" : "false"}
              data-console-negation-window={sharedNegationWindow ? "true" : "false"}
              data-console-response-presentation-ready={responsePresentationReady ? "true" : "false"}
              data-console-response-decision-ready={responseDecisionReady ? "true" : "false"}
              data-console-presentation-busy={presentationBusy ? "true" : "false"}
              data-console-active-skill-selection-busy={activeSkillSelectionBusy ? "true" : "false"}
              data-console-network-busy={busy ? "true" : "false"}
              data-lust-local-selection={lustLocalSelectionActive ? "true" : undefined}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {!lustLocalSelectionActive && <small>{negationWindowSubmitted ? "RESPONSE SUBMITTED" : localSemanticResponseGuidance ? "YOUR RESPONSE" : consoleDecision.controlsVisible ? "YOUR DECISION" : decisionPresentation.isWaiting ? decisionPresentation.primaryStatus : "GAME STATUS"}</small>}
              <strong>{consoleDecision.instruction}</strong>
              {lustTargetOrderText && <em data-testid="lust-order-guidance">{lustTargetOrderText}</em>}
              {daqiaoDeflectionSelectionActive
                ? <div className="deflection-selection-guidance" data-testid="deflection-selection-guidance" role="group" aria-label="Deflection selections">
                  <span data-daqiao-selection="card">Discard card: {daqiaoDeflectionCardCount}/1 {daqiaoDeflectionCardCount === 1 ? "✓" : "— Select an eligible hand or equipment card"}</span>
                  <span data-daqiao-selection="target">Transfer target: {daqiaoDeflectionTargetCount}/1 {daqiaoDeflectionTargetCount === 1 ? "✓" : "— Tap an eligible hero portrait"}</span>
                  {daqiaoDeflectionCardCount === 1 && daqiaoDeflectionTargetCount === 1 && <strong>Ready to redirect Attack</strong>}
                </div>
                : !negationResponseGuidance && consoleDecision.selectionSummary && <em>{consoleDecision.selectionSummary}</em>}
              {consoleDecision.localCancel.visible && <span className="local-target-selection" data-local-target-selection="true">
                <b>{canClearTargetCardPickerSelection ? "CLEAR SELECTION" : "LOCAL CANCEL"}</b>
                <span>{canClearTargetCardPickerSelection ? "Remove your selected card." : "Change your selection before submitting."}</span>
              </span>}
            </div>
            <GameSystemMenu onLeave={onLeave} messages={gameMessages} messagesCollapsed={messagesCollapsed} onToggleMessages={() => setMessagesCollapsed((collapsed) => !collapsed)} />
          </div>
          {invalidResponseState && <p className="error" role="status">Waiting for the latest response state…</p>}
        </div>
      }>
        <div className="local-hand-section" data-raining-arrows-dodge-providers={rainingArrowsHasHandDodgeProvider ? "available" : undefined}>
          <div className="local-hand" data-card-origin-anchor={room.meId} aria-label="Your hand">{(() => {
            const multiSelectMode = room.phase === "discard" || Boolean(activeSkillSelection || serpentMode || responseSelectionMax > 1 || triggerSelectionMax > 1);
            const responseSelectionLimit = triggerResponse && triggerSelectionUsesCards ? triggerSelection.max : responseSelectionUsesCards ? responseSelection.max : 2;
            const toggleHandCard = (item: Card) => {
              const costSelection = serpentMode || canRespond && responseSelectionUsesCards && responseSelectionMax > 1 || triggerResponse && triggerSelectionUsesCards && triggerSelectionMax > 1;
              if (room.phase === "discard") setDiscardSelected((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : ids.length < excessCards ? [...ids, item.id] : ids);
              else if (activeSkillSelection) toggleActiveSkillCardSelection(item.id);
              else if (costSelection) setSerpentSelected((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : ids.length < responseSelectionLimit ? [...ids, item.id] : ids);
              else { setSelected((id) => id === item.id ? "" : item.id); setTarget(""); }
              setTargetCardIndex(null);
            };
            const renderHandCard = (item: Card, index: number) => {
              const definition = cardDefinition(item.kind);
              const costSelection = serpentMode || canRespond && responseSelectionUsesCards && responseSelectionMax > 1 || triggerResponse && triggerSelectionUsesCards && triggerSelectionMax > 1;
              const isSelected = room.phase === "discard" ? discardSelected.includes(item.id) : activeSkillSelection ? activeSkillSelectedCardIds.includes(item.id) : costSelection ? serpentSelected.includes(item.id) : selected === item.id;
              const singleSelected = !multiSelectMode && isSelected;
              const detailsSelected = selectedHandDetailsCard?.id === item.id;
              const maySelect = (room.isMyTurn && (canPlay || room.phase === "discard")) || responseCardSelectionReady || rescueDecisionReady;
              const skillModeCardDisabled = Boolean(activeSkillTargetSelection || wushengMode && !wushengEligibleCardIds.has(item.id) || longdanMode && !longdanEligibleCardIds.has(item.id) || activeSkillSelection && !activeSkillSelection.eligibleCardIds.includes(item.id));
              const skillModeEligible = wushengMode && wushengEligibleCardIds.has(item.id) || longdanMode && longdanEligibleCardIds.has(item.id) || activeSkillSelection?.eligibleCardIds.includes(item.id) === true;
              return <div className={`card-slot ${singleSelected ? "single-selected" : ""} ${detailsSelected ? "details-selected" : ""}`} data-hand-card-id={item.id} key={`rail-${item.id}`} style={{ marginLeft: index === 0 ? 0 : `${handCardLayout.step - 68}px` }}>
                {detailsSelected && <span className="hand-card-details-frame" aria-hidden="true" />}
                <div className="hand-card-visual">
                  <button disabled={!maySelect || skillModeCardDisabled || responseCardDisabled(item)} onClick={() => toggleHandCard(item)} className={`game-card ${item.kind.toLowerCase()} ${suitColorClass(item.suit)} ${isSelected ? "selected" : ""} ${skillModeEligible ? "hero-skill-eligible" : ""}`}>
                    <span className="corner">{item.rank}<i>{item.suit}</i></span><span className="card-name-mark">{definition.name}</span><strong>{definition.category} card</strong>
                  </button>
                </div>
                {selectedHandDetailsCard?.id === item.id && selectedHandDetailsCard && <button type="button" className="hand-card-details-action" data-testid="hand-card-details-action" aria-label={`Details for ${definition.name}`} onClick={(event) => openCardDetails(selectedHandDetailsCard, "private-hand", event.currentTarget)}>DETAILS</button>}
              </div>;
            };
            // The native scroll region needs keyboard focus; it has no custom selection role.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            return <div ref={handRailRef} onScroll={(event) => { handViewportSnapshotRef.current = captureHandViewportSnapshot(event.currentTarget, room.meId); }} className="local-hand-rail" data-hand-layout={handCardLayout.measured ? "measured" : "pending"} style={{ justifyContent: room.myHand.length === 1 ? "center" : "flex-start" }} data-hand-overflow={handOverflows ? "true" : "false"} tabIndex={handOverflows ? 0 : undefined} role="region" aria-label={handOverflows ? "Hand cards — scroll horizontally to browse" : "Hand cards"}>{room.myHand.map((item, index) => renderHandCard(item, index))}</div>;
          })()}</div>
        </div>
      <div className="turn-controls" data-console-surface="local-operation" aria-label="Local operation console">
        <div data-action-extras="true">
          {triggerResponse && responseDecisionReady && inlineChoiceTriggerOption?.selection?.type === "choice" && inlineChoiceTriggerOption.selection.choices.map((choice) => <button type="button" key={`${inlineChoiceTriggerOption.effectId}:${choice.id}`} className="serpent-control" data-trigger-choice-provider={inlineChoiceTriggerOption.effectId} data-trigger-choice-action={choice.id} aria-label={`${inlineChoiceTriggerOption.label}: ${choice.label}`} disabled={responseControlsDisabled || !canUseAction(room.currentAction, "trigger")} onClick={() => void onAction("trigger", { providerId: inlineChoiceTriggerOption.effectId, choice: choice.id })}>{choice.label}</button>)}
          {triggerResponse && genericTriggerOptions.map((option) => option.selection?.type === "target_cards" || option.selection?.type === "choice" && option.allowDecline === false ? null : option.selection ? <button key={option.effectId} className={`serpent-control ${responseProviderId === option.effectId ? "active" : ""}`} disabled={triggerControlsDisabled} onClick={() => { const active = responseProviderId === option.effectId; if (active) resetLocalTargetFlow("trigger"); else { setResponseProviderId(option.effectId); setSelected(""); setTargetIds([]); setSerpentSelected([]); setTriggerSelectedKeys([]); setTriggerChoice(""); } }}>{responseProviderId === option.effectId ? `Cancel ${option.label}` : option.selection.type === "target" ? `Use ${option.label}` : option.label}</button> : <button key={option.effectId} className="serpent-control" disabled={triggerControlsDisabled} onClick={() => onAction("trigger", { providerId: option.effectId })}>{`Use ${option.label}`}</button>)}
          {canRespond && genericResponse && semanticResponseOptions.length > 0 && genericResponseOptions.map((option) => option.selection ? <button key={option.providerId} className={`serpent-control ${responseProviderId === option.providerId ? "active" : ""}`} disabled={physicalResponseControlsDisabled} onClick={() => { const active = responseProviderId === option.providerId; setResponseProviderId(active ? "" : option.providerId); setSelected(""); setSerpentSelected([]); }}>{responseProviderId === option.providerId ? `Cancel ${option.label}` : option.label}</button> : <button key={option.providerId} className="serpent-control" disabled={physicalResponseControlsDisabled} onClick={() => submitResponseProvider(option)}>{busy ? "Resolving…" : option.label}</button>)}
          {room.isMyTurn && canPlay && consoleKind === "turn" && canFormSerpentAttack && <button className={`serpent-control ${serpentMode ? "active" : ""}`} onClick={() => { setSerpentMode((active) => !active); setSerpentSelected([]); setSelected(""); setTarget(""); }}>{serpentMode ? "Normal" : "Spear"}</button>}
        </div>
        <div data-action-slots="true">
          <div data-action-slot="cancel">
            {borrowedSwordTargetSelectionActive && consoleDecision.localCancel.visible && <button className="end local-target-cancel" disabled={busy || presentationBusy || !consoleDecision.localCancel.enabled} onClick={cancelLocalTargetSelection}>Cancel</button>}
            {targetCardPickerInLocalDock && canClearTargetCardPickerSelection && <button className="end local-target-cancel" disabled={responseControlsDisabled || !consoleDecision.localCancel.enabled} onClick={cancelTargetCardPicker}>Clear selection</button>}
            {triggerResponse && triggerTargetMode && consoleDecision.localCancel.visible && localTargetSelection.canCancel && !triggerHasProviderCancelSurface && <button className="end local-target-cancel" disabled={responseControlsDisabled || !consoleDecision.localCancel.enabled} onClick={cancelLocalTargetSelection}>Cancel</button>}
            {(activeSkillSelection || activeSkillTargetSelection) && activeSkillTargetMode && consoleDecision.localCancel.visible && localTargetSelection.canCancel && <button className="end local-target-cancel" disabled={busy || !consoleDecision.localCancel.enabled} onClick={cancelLocalTargetSelection}>Cancel</button>}
            {room.isMyTurn && canPlay && consoleKind === "turn" && normalTargetSelectionActive && consoleDecision.localCancel.visible && localTargetSelection.canCancel && !normalHasProviderCancelSurface && <button className="end local-target-cancel" disabled={busy || presentationBusy || !consoleDecision.localCancel.enabled} onClick={cancelLocalTargetSelection}>Cancel</button>}
          </div>
          <div data-action-slot="primary">
            {rescueDecisionReady && !canRespond && consolePrimaryId === "rescue" && <button className="primary" disabled={busy || card?.kind !== "Peach" || !consoleDecision.primary?.enabled} onClick={() => { if (card?.kind === "Peach") void onAction("give_peach", { cardId: card.id }); setSelected(""); }}>{busy ? "Playing…" : "Peach"}</button>}
            {dyingFirstAidSelectionActive && consolePrimaryId === "first-aid" && <button className="primary" disabled={busy || presentationBusy || !responseSelectionComplete || !canUseAction(room.currentAction, "respond") || !consoleDecision.primary?.enabled} onClick={() => void submitResponseProvider()}>{busy ? "Confirming…" : "Confirm"}</button>}
            {borrowedSwordTargetSelectionActive && consolePrimaryId === "borrowed-sword" && <button className="primary" disabled={busy || presentationBusy || !localTargetSelection.canConfirm || !consoleDecision.primary?.enabled} onClick={() => void confirmBorrowedSwordTarget()}>{busy ? "Confirming…" : "Confirm"}</button>}
            {targetCardPickerInLocalDock && consolePrimaryId === "target-card-picker" && <button className="primary" disabled={responseControlsDisabled || !targetCardPickerSelectionComplete || !consoleDecision.primary?.enabled} onClick={() => void submitTargetCardPicker(targetCardPickerSelectedKeys)}>{busy ? "Confirming…" : "Confirm"}</button>}
            {triggerResponse && selectedTriggerOption?.selection?.type === "cards" && consolePrimaryId === "trigger-cards" && <button className="primary" disabled={responseControlsDisabled || !triggerSubmissionComplete || !consoleDecision.primary?.enabled} onClick={() => submitWithLocalTargetPreview(() => onAction("trigger", { providerId: selectedTriggerOption.effectId, ...(triggerSelectedCardIds.length === 1 ? { cardId: triggerSelectedCardIds[0] } : { cardIds: triggerSelectedCardIds }), ...(triggerTargetSelection ? { targetId: targetIds[0] } : {}) }))}>Confirm</button>}
            {triggerResponse && selectedTriggerOption?.selection?.type === "target" && triggerTargetSelection && consolePrimaryId === "trigger-target" && <button className="primary" disabled={responseControlsDisabled || !localTargetSelection.canConfirm || !consoleDecision.primary?.enabled} onClick={() => submitWithLocalTargetPreview(() => onAction("trigger", { providerId: selectedTriggerOption.effectId, targetIds }))}>Confirm</button>}
            {(activeSkillSelection || activeSkillTargetSelection) && consolePrimaryId === "active-skill" && <button className="primary" disabled={busy || !activeSkillConfirmEnabled || !consoleDecision.primary?.enabled} onClick={() => activeSkillSubmission && submitWithLocalTargetPreview(() => onAction("trigger", activeSkillSubmission))}>Confirm</button>}
            {canRespond && genericResponse && semanticResponseOptions.length > 0 && selectedResponseProvider && consolePrimaryId === "response" && <button className="primary" disabled={responseControlsDisabled || !responseSelectionComplete || !consoleDecision.primary?.enabled} onClick={() => submitResponseProvider()}>{busy ? "Confirming…" : "Confirm"}</button>}
            {room.isMyTurn && room.phase === "discard" && consolePrimaryId === "discard" && <button className="primary" disabled={busy || discardSelected.length !== excessCards || !consoleDecision.primary?.enabled} onClick={() => onAction("discard_cards", { cardIds: discardSelected })}>{busy ? "Discarding…" : `Discard ${excessCards} selected`}</button>}
            {room.isMyTurn && canPlay && consoleKind === "turn" && consolePrimaryId === "turn" && <button className="primary" disabled={serpentMode ? busy || presentationBusy || !canDeclareAttack || serpentSelected.length !== 2 || !attackTargetsValid || !consoleDecision.primary?.enabled : busy || presentationBusy || !card || selectedCanPlayAsAttack && (!canDeclareAttack || !attackTargetsValid) || (["Dismantle", "Steal", "Duel", "Overindulgence", "RationsDepleted", "BorrowedSword"].includes(card.kind) && !target) || card?.kind === "BorrowedSword" && !borrowedSwordPlayTargetIds.includes(target) || !selectedCanPlayAsAttack && (card.kind === "Dodge" || card.kind === "Negation") || !consoleDecision.primary?.enabled} onClick={serpentMode ? playSerpentAttack : play}>{busy ? "Playing…" : serpentMode ? "Form Attack" : normalTargetSelectionActive ? "Confirm" : "Play"}</button>}
          </div>
          <div data-action-slot="decline">
            {rescueDecisionReady && !canRespond && consoleDecision.authoritativeDecline && <button className="end" disabled={busy || !consoleDecision.authoritativeDecline.enabled} onClick={() => { void onAction("skip_rescue"); setSelected(""); }}>{busy ? "Skipping…" : "Skip"}</button>}
            {triggerResponse && triggerDeclineAction && (!targetCardPickerInModal || targetCardPickerInLocalDock) && consoleDecision.authoritativeDecline && <button className="end" disabled={responseControlsDisabled || !consoleDecision.authoritativeDecline.enabled} onClick={() => onAction("decline_trigger")}>Skip</button>}
            {canRespond && consoleDecision.authoritativeDecline && <button className="end" disabled={responseControlsDisabled || !responseDamageAction || !consoleDecision.authoritativeDecline.enabled} onClick={() => responseDamageAction && onAction(responseDamageAction)}>{responseDeclineLabel}</button>}
            {room.isMyTurn && canPlay && consoleKind === "turn" && <button className="end" disabled={busy || presentationBusy} onClick={() => onAction("end_turn")}>{busy ? "Finishing…" : "End"}</button>}
          </div>
        </div>
      </div>
      </LocalPlayerDock>
    </footer>
  </main>;
}

type ChoiceTriggerSelection = Extract<NonNullable<TriggerOptionView["selection"]>, { type: "choice" }>;

type DeckZone = "unassigned" | "top" | "bottom";
type DeckArrangement = Record<DeckZone, string[]>;
type DeckDrag = {
  pointerId: number;
  pointerType: string;
  cardId: string;
  fromZone: DeckZone;
  fromIndex: number;
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
  width: number;
  height: number;
  left: number;
  top: number;
  active: boolean;
  targetZone: DeckZone | null;
  insertionIndex: number | null;
  sourceElement: HTMLElement;
};
type DeckEdgeScroll = { row: HTMLElement; zone: DeckZone; direction: -1 | 1; pointerId: number };

const DECK_ZONES: readonly DeckZone[] = ["unassigned", "top", "bottom"];
const DECK_ZONE_LABELS: Readonly<Record<DeckZone, string>> = {
  unassigned: "Revealed Cards",
  top: "Top of Deck",
  bottom: "Bottom of Deck",
};

function insertDeckCard(arrangement: DeckArrangement, cardId: string, destination: DeckZone, insertionIndex: number): DeckArrangement {
  const source = DECK_ZONES.find((zone) => arrangement[zone].includes(cardId));
  if (!source) return arrangement;
  const next: DeckArrangement = {
    unassigned: [...arrangement.unassigned],
    top: [...arrangement.top],
    bottom: [...arrangement.bottom],
  };
  next[source].splice(next[source].indexOf(cardId), 1);
  const target = next[destination];
  target.splice(Math.max(0, Math.min(insertionIndex, target.length)), 0, cardId);
  return next;
}

function zoneInsertionIndex(row: HTMLElement, cardId: string, pointerX: number): number {
  const items = [...row.querySelectorAll<HTMLElement>("[data-deck-card-id]")].filter((item) => item.dataset.deckCardId !== cardId);
  for (let index = 0; index < items.length; index += 1) {
    const bounds = items[index].getBoundingClientRect();
    if (pointerX < bounds.left + bounds.width / 2) return index;
  }
  return items.length;
}

function PrivateDeckReorderDialog({ cards, minTop, maxTop, disabled, error, onSubmit }: { cards: Card[]; minTop: number; maxTop: number; disabled: boolean; error: string; onSubmit: (topCardIds: string[], bottomCardIds: string[]) => void }) {
  const [arrangement, setArrangement] = useState<DeckArrangement>(() => ({ unassigned: cards.map((card) => card.id), top: [], bottom: [] }));
  const arrangementRef = useRef(arrangement);
  const [drag, setDrag] = useState<DeckDrag | null>(null);
  const dragRef = useRef<DeckDrag | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const edgeScrollRef = useRef<DeckEdgeScroll | null>(null);
  const edgeScrollIntervalRef = useRef<number | null>(null);
  const [edgeScrollZone, setEdgeScrollZone] = useState<DeckZone | null>(null);
  const [moveMenuCardId, setMoveMenuCardId] = useState<string | null>(null);
  const [focusCardId, setFocusCardId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const dialogRef = useRef<HTMLElement | null>(null);
  const moveButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const previousCardRectsRef = useRef(new Map<string, { left: number; top: number; zone: string | null }>());
  const held = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  useEffect(() => {
    const cancelOnLostCapture = (event: PointerEvent) => {
      const session = dragRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      edgeScrollRef.current = null;
      if (edgeScrollIntervalRef.current !== null) window.clearInterval(edgeScrollIntervalRef.current);
      edgeScrollIntervalRef.current = null;
      dragRef.current = null;
      setEdgeScrollZone(null);
      setDrag(null);
    };
    document.addEventListener("lostpointercapture", cancelOnLostCapture, true);
    return () => document.removeEventListener("lostpointercapture", cancelOnLostCapture, true);
  }, []);
  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  };
  const stopEdgeAutoScroll = () => {
    const wasActive = edgeScrollRef.current !== null;
    edgeScrollRef.current = null;
    if (edgeScrollIntervalRef.current !== null) window.clearInterval(edgeScrollIntervalRef.current);
    edgeScrollIntervalRef.current = null;
    if (wasActive) setEdgeScrollZone(null);
  };
  const releaseCapture = (session: DeckDrag) => {
    try {
      if (session.sourceElement.hasPointerCapture(session.pointerId)) session.sourceElement.releasePointerCapture(session.pointerId);
    } catch {
      // The browser may already have released capture after pointercancel.
    }
  };
  const clearDrag = (session: DeckDrag) => {
    clearHoldTimer();
    stopEdgeAutoScroll();
    if (dragRef.current?.pointerId === session.pointerId) dragRef.current = null;
    setDrag(null);
    releaseCapture(session);
  };
  const commitMove = (cardId: string, zone: DeckZone, index: number) => {
    const next = insertDeckCard(arrangementRef.current, cardId, zone, index);
    arrangementRef.current = next;
    setArrangement(next);
    setMoveMenuCardId(null);
    setFocusCardId(cardId);
    const card = held.get(cardId);
    const finalIndex = next[zone].indexOf(cardId);
    if (card && finalIndex >= 0) setAnnouncement(cardDefinition(card.kind).name + " moved to " + DECK_ZONE_LABELS[zone] + ", position " + (finalIndex + 1) + ".");
  };
  const locateDropTarget = (session: DeckDrag, clientX: number, clientY: number) => {
    const hit = document.elementFromPoint(clientX, clientY);
    const zoneElement = hit?.closest<HTMLElement>("[data-deck-zone]");
    if (!zoneElement || !dialogRef.current?.contains(zoneElement)) return null;
    const zone = zoneElement.dataset.deckZone as DeckZone | undefined;
    if (!zone || !DECK_ZONES.includes(zone)) return null;
    const row = zoneElement.querySelector<HTMLElement>("[data-deck-zone-items]");
    if (!row) return null;
    const bounds = row.getBoundingClientRect();
    const edgeDirection = row.scrollWidth <= row.clientWidth + 1 ? 0
      : clientX < bounds.left + 24 ? -1
        : clientX > bounds.right - 24 ? 1 : 0;
    return { zone, row, edgeDirection: edgeDirection as -1 | 0 | 1, index: zoneInsertionIndex(row, session.cardId, clientX) };
  };
  function scheduleEdgeAutoScroll(pointerId: number, row: HTMLElement, zone: DeckZone, direction: -1 | 1) {
    const activeEdge = edgeScrollRef.current;
    if (activeEdge?.pointerId === pointerId && activeEdge.row === row && activeEdge.zone === zone && activeEdge.direction === direction) return;
    stopEdgeAutoScroll();
    edgeScrollRef.current = { pointerId, row, zone, direction };
    setEdgeScrollZone(zone);
    edgeScrollIntervalRef.current = window.setInterval(() => {
      const edge = edgeScrollRef.current;
      const active = dragRef.current;
      if (!edge || edge.pointerId !== pointerId || !active || active.pointerId !== pointerId || !active.active) {
        stopEdgeAutoScroll();
        return;
      }
      const previous = edge.row.scrollLeft;
      edge.row.scrollLeft = Math.max(0, Math.min(edge.row.scrollWidth - edge.row.clientWidth, previous + edge.direction * 9));
      if (edge.row.scrollLeft === previous) {
        stopEdgeAutoScroll();
        return;
      }
      const next = {
        ...active,
        targetZone: edge.zone,
        insertionIndex: zoneInsertionIndex(edge.row, active.cardId, active.clientX),
      };
      dragRef.current = next;
      setDrag(next);
    }, 16);
  }
  function updateDragPosition(session: DeckDrag, clientX: number, clientY: number) {
    const width = Math.min(session.width, Math.max(0, window.innerWidth - 16));
    const left = Math.max(8, Math.min(clientX - width / 2, window.innerWidth - width - 8));
    let top = clientY - session.height - 18;
    if (top < 8) top = clientY + 18;
    top = Math.max(8, Math.min(top, window.innerHeight - session.height - 8));
    const target = locateDropTarget(session, clientX, clientY);
    const next = { ...session, clientX, clientY, left, top, targetZone: target?.zone ?? null, insertionIndex: target?.index ?? null };
    dragRef.current = next;
    setDrag(next);
    if (target?.edgeDirection) scheduleEdgeAutoScroll(session.pointerId, target.row, target.zone, target.edgeDirection);
    else stopEdgeAutoScroll();
  }
  const activateDrag = (session: DeckDrag) => {
    if (dragRef.current?.pointerId !== session.pointerId) return;
    const next = { ...session, active: true };
    dragRef.current = next;
    setDrag(next);
    const card = held.get(next.cardId);
    if (card) setAnnouncement("Picked up " + cardDefinition(card.kind).name + ". Move to a named zone, then release.");
  };
  const beginDrag = (event: ReactPointerEvent<HTMLElement>, cardId: string, zone: DeckZone, index: number) => {
    if (disabled || !event.isPrimary || event.button !== 0 || dragRef.current) return;
    const eventTarget = event.target as Element;
    if (event.pointerType === "touch" && !eventTarget.closest("[data-deck-touch-handle]")) return;
    if (event.pointerType !== "touch" && eventTarget.closest("button")) return;
    const face = event.currentTarget.matches(".deck-reorder-card-face")
      ? event.currentTarget
      : event.currentTarget.querySelector<HTMLElement>(".deck-reorder-card-face");
    const faceBounds = face?.getBoundingClientRect();
    if (!faceBounds) return;
    const session: DeckDrag = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      cardId,
      fromZone: zone,
      fromIndex: index,
      startX: event.clientX,
      startY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      width: faceBounds.width,
      height: faceBounds.height,
      left: Math.max(8, event.clientX - faceBounds.width / 2),
      top: Math.max(8, event.clientY - faceBounds.height - 18),
      active: false,
      targetZone: null,
      insertionIndex: null,
      sourceElement: event.currentTarget,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    dragRef.current = session;
    setMoveMenuCardId(null);
    if (event.pointerType === "touch") {
      holdTimerRef.current = window.setTimeout(() => activateDrag(session), 260);
    }
  };
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragRef.current;
    if (!session || event.pointerId !== session.pointerId) return;
    if (!session.active) {
      const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
      if (session.pointerType === "touch") {
        if (distance > 12) clearDrag(session);
        return;
      }
      if (distance < 5) return;
      activateDrag(session);
    }
    const active = dragRef.current;
    if (active?.pointerId === event.pointerId) updateDragPosition(active, event.clientX, event.clientY);
  };
  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const session = dragRef.current;
    if (!session || event.pointerId !== session.pointerId) return;
    clearHoldTimer();
    if (!cancelled && session.active) {
      const target = locateDropTarget(session, event.clientX, event.clientY);
      if (target) commitMove(session.cardId, target.zone, target.index);
      else {
        const card = held.get(session.cardId);
        if (card) setAnnouncement(cardDefinition(card.kind).name + " was not moved; its previous position is unchanged.");
      }
    }
    clearDrag(session);
  };
  const moveCardByMenu = (cardId: string, zone: DeckZone, index?: number) => {
    const current = arrangementRef.current;
    const source = DECK_ZONES.find((candidate) => current[candidate].includes(cardId));
    const insertionIndex = index ?? current[zone].length - (source === zone ? 1 : 0);
    commitMove(cardId, zone, insertionIndex);
  };
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusableSelector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
    const focusableElements = () => [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => element.getClientRects().length > 0);
    focusableElements()[0]?.focus();
    const containTabFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusables = focusableElements();
      if (!focusables.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const active = document.activeElement;
      const index = focusables.indexOf(active as HTMLElement);
      if (index < 0) {
        event.preventDefault();
        (event.shiftKey ? focusables[focusables.length - 1] : focusables[0]).focus();
      } else if (event.shiftKey && index === 0) {
        event.preventDefault();
        focusables[focusables.length - 1].focus();
      } else if (!event.shiftKey && index === focusables.length - 1) {
        event.preventDefault();
        focusables[0].focus();
      }
    };
    document.addEventListener("keydown", containTabFocus, true);
    return () => document.removeEventListener("keydown", containTabFocus, true);
  }, []);
  useLayoutEffect(() => {
    arrangementRef.current = arrangement;
    const elements = [...(dialogRef.current?.querySelectorAll<HTMLElement>("[data-deck-card-id]") ?? [])];
    const previousRects = previousCardRectsRef.current;
    const nextRects = new Map<string, { left: number; top: number }>();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const element of elements) {
      const id = element.dataset.deckCardId;
      if (!id) continue;
      const bounds = element.getBoundingClientRect();
      const zone = element.closest<HTMLElement>("[data-deck-zone]")?.dataset.deckZone ?? null;
      const previous = previousRects.get(id);
      if (!reduceMotion && previous && previous.zone === zone && zone !== "unassigned") {
        const deltaX = previous.left - bounds.left;
        const deltaY = previous.top - bounds.top;
        // Only animate horizontal reorders in assigned strips. Animating
        // center-row recentering or vertical flow changes can paint a card
        // across a neighbouring zone and steal the next touch hit.
        if (Math.abs(deltaX) > 1 && Math.abs(deltaY) <= 1) {
          element.animate([
            { transform: "translateX(" + deltaX + "px)" },
            { transform: "translateX(0)" },
          ], { duration: 170, easing: "cubic-bezier(.2,.8,.2,1)" });
        }
      }
      nextRects.set(id, { left: bounds.left, top: bounds.top, zone });
    }
    previousCardRectsRef.current = nextRects;
    if (!focusCardId) return;
    const frame = window.requestAnimationFrame(() => {
      moveButtonRefs.current.get(focusCardId)?.focus();
      setFocusCardId(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [arrangement, focusCardId]);
  useEffect(() => () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    if (edgeScrollIntervalRef.current !== null) window.clearInterval(edgeScrollIntervalRef.current);
    edgeScrollIntervalRef.current = null;
    edgeScrollRef.current = null;
  }, []);
  const arrangedCount = arrangement.top.length + arrangement.bottom.length;
  const everyCardExactlyOnce = (() => {
    const ids = [...arrangement.unassigned, ...arrangement.top, ...arrangement.bottom];
    return ids.length === cards.length && new Set(ids).size === cards.length && cards.every((card) => ids.includes(card.id));
  })();
  const complete = arrangement.unassigned.length === 0 && arrangement.top.length >= minTop
    && arrangement.top.length <= maxTop && arrangement.top.length + arrangement.bottom.length === cards.length
    && everyCardExactlyOnce;
  const renderCard = (id: string, zone: DeckZone, index: number, count: number) => {
    const card = held.get(id);
    if (!card) return null;
    const name = cardDefinition(card.kind).name;
    const menuId = "stargazing-card-menu-" + cards.findIndex((item) => item.id === id);
    const currentMenuOpen = moveMenuCardId === id;
    const zoneIds = arrangement[zone];
    const sourceIndex = zoneIds.indexOf(id);
    const appendIndex = (target: DeckZone) => arrangement[target].length - (target === zone ? 1 : 0);
    return <article className={"deck-reorder-card" + (drag?.active && drag.cardId === id ? " is-drag-source" : "")}
      role="listitem" key={id} data-deck-card-id={id} data-deck-zone-name={zone} data-order-index={index}
      data-dragging={drag?.active && drag.cardId === id ? "true" : "false"}
      aria-label={name + ", " + DECK_ZONE_LABELS[zone] + ", position " + (index + 1) + " of " + count}>
      <div className="deck-reorder-card-face" onPointerDown={(event) => beginDrag(event, id, zone, index)}
        onLostPointerCapture={(event) => finishPointer(event, true)}
        onDragStart={(event) => event.preventDefault()} data-deck-card-face={id}>
        <CardFace card={card} />
        <span className="deck-reorder-drag-grip" data-deck-touch-handle="true" aria-hidden="true">⠿</span>
      </div>
      <button ref={(node) => { if (node) moveButtonRefs.current.set(id, node); else moveButtonRefs.current.delete(id); }}
        type="button" className="deck-reorder-menu-toggle" disabled={disabled}
        aria-label={"Move " + name} aria-expanded={currentMenuOpen} aria-controls={menuId}
        onClick={() => setMoveMenuCardId(currentMenuOpen ? null : id)}>Move</button>
      {currentMenuOpen && <div className="deck-reorder-card-actions" id={menuId} role="group"
        aria-label={name + " move options"} data-deck-reorder-menu-for={id}>
        {zone !== "top" && <button type="button" disabled={disabled} onClick={() => moveCardByMenu(id, "top", appendIndex("top"))} aria-label={"Move " + name + " to top of deck"}>Top</button>}
        {zone !== "bottom" && <button type="button" disabled={disabled} onClick={() => moveCardByMenu(id, "bottom", appendIndex("bottom"))} aria-label={"Move " + name + " to bottom of deck"}>Bottom</button>}
        {zone !== "unassigned" && <button type="button" disabled={disabled} onClick={() => moveCardByMenu(id, "unassigned", arrangement.unassigned.length)} aria-label={"Return " + name + " to revealed cards"}>Return</button>}
        {(zone === "top" || zone === "bottom") && sourceIndex > 0 && <button type="button" disabled={disabled} onClick={() => moveCardByMenu(id, zone, sourceIndex - 1)} aria-label={"Move " + name + " earlier"}>Earlier</button>}
        {(zone === "top" || zone === "bottom") && sourceIndex >= 0 && sourceIndex < zoneIds.length - 1 && <button type="button" disabled={disabled} onClick={() => moveCardByMenu(id, zone, sourceIndex + 1)} aria-label={"Move " + name + " later"}>Later</button>}
      </div>}
    </article>;
  };
  const renderZoneItems = (zone: DeckZone) => {
    const ids = arrangement[zone];
    const edgeScrollActive = Boolean(drag?.active && drag.targetZone === zone && edgeScrollZone === zone);
    const activeTarget = drag?.active && drag.targetZone === zone ? drag.insertionIndex : null;
    const visualMarkerIndex = activeTarget === null ? null
      : activeTarget + (drag && drag.fromZone === zone && drag.fromIndex <= activeTarget ? 1 : 0);
    const children: ReactNode[] = [];
    for (let index = 0; index <= ids.length; index += 1) {
      if (visualMarkerIndex === index) children.push(<span className="deck-reorder-insertion-indicator"
        data-deck-insertion-indicator="true" data-insertion-index={activeTarget ?? undefined} aria-hidden="true" key={"marker-" + zone + "-" + index} />);
      if (index < ids.length) children.push(renderCard(ids[index], zone, index, ids.length) as ReactNode);
    }
    if (!ids.length) children.push(<span className="deck-reorder-drop-placeholder" key={"empty-" + zone}>{zone === "unassigned" ? "All revealed cards are arranged." : "Drop cards here"}</span>);
    return <div className="deck-reorder-card-row" role="list" aria-label={DECK_ZONE_LABELS[zone] + " order"}
      data-deck-zone-items="true" data-deck-reorder-sequence={zone} data-edge-scroll-active={edgeScrollActive ? "true" : "false"} key={"items-" + zone}>{children}</div>;
  };
  const renderZone = (zone: DeckZone) => {
    const ids = arrangement[zone];
    const orderHint = zone === "top" ? "Draws first →" : zone === "bottom" ? "After remaining deck →" : arrangement.unassigned.length + " left";
    const hint = ids.length > 4 ? orderHint + " · Swipe ↔" : orderHint;
    const isTarget = drag?.active && drag.targetZone === zone;
    return <section className={"deck-reorder-group deck-reorder-zone-" + zone + (ids.length ? " has-cards" : " is-empty") + (isTarget ? " is-drop-active" : "")}
      aria-label={DECK_ZONE_LABELS[zone]} data-deck-zone={zone}
      data-deck-sequence={zone === "unassigned" ? undefined : zone} data-card-count={ids.length}
      data-drop-eligible={drag?.active ? "true" : "false"} data-drop-active={isTarget ? "true" : "false"}>
      <header><strong>{zone === "unassigned" ? "REVEALED CARDS" : zone === "top" ? "TOP OF DECK" : "BOTTOM OF DECK"}</strong><span>{hint}</span></header>
      {renderZoneItems(zone)}
    </section>;
  };
  const cancelActiveDrag = () => {
    const session = dragRef.current;
    if (session) clearDrag(session);
  };
  return <div className="target-card-picker-overlay deck-reorder-overlay" role="presentation"
    onPointerMove={handlePointerMove} onPointerUp={(event) => finishPointer(event)} onPointerCancel={(event) => finishPointer(event, true)}
    onLostPointerCapture={(event) => finishPointer(event, true)}
    onKeyDown={(event) => { if (event.key === "Escape" && dragRef.current) { event.preventDefault(); cancelActiveDrag(); } else if (event.key === "Escape" && moveMenuCardId) { event.preventDefault(); setFocusCardId(moveMenuCardId); setMoveMenuCardId(null); } }}>
    <section ref={dialogRef} className="target-card-picker-panel choice-trigger-panel deck-reorder-panel" role="dialog" aria-modal="true" aria-label="Stargazing deck reorder" aria-describedby="stargazing-deck-instructions">
      <header><strong id="stargazing-deck-title">STARGAZING</strong><span id="stargazing-deck-instructions">Touch and hold the grip, then drag. Use each card’s Move menu for keyboard and screen-reader controls.</span></header>
      <div className="deck-reorder-sequences">
        {renderZone("top")}
        {renderZone("unassigned")}
        {renderZone("bottom")}
      </div>
      <div className="deck-reorder-progress" aria-live="polite" data-deck-reorder-progress="true">{arrangedCount} / {cards.length} arranged</div>
      <div className="target-card-picker-actions deck-reorder-completion"><button type="button" className="primary" data-deck-reorder-submit="true" disabled={disabled || !complete} onClick={() => onSubmit(arrangement.top, arrangement.bottom)}>COMPLETE STARGAZING</button></div>
      {error && <p className="error" role="alert">{error}</p>}
      <p className="deck-reorder-live" aria-live="polite" aria-atomic="true">{announcement}</p>
    </section>
    {drag?.active && held.get(drag.cardId) && <div className="deck-reorder-drag-preview" aria-hidden="true" data-deck-drag-preview={drag.cardId}
      style={{ left: drag.left, top: drag.top, width: drag.width, height: drag.height }}>
      <div className="deck-reorder-card-face"><CardFace card={held.get(drag.cardId)!} /></div>
    </div>}
  </div>;
}

function PrivateCardDistributionDialog({ cards, players, disabled, error, onSubmit }: { cards: Card[]; players: Player[]; disabled: boolean; error: string; onSubmit: (assignments: Array<{ cardId: string; recipientId: string }>) => void }) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const complete = cards.length > 0 && cards.every((card) => Boolean(assignments[card.id]));
  const submit = () => onSubmit(cards.map((card) => ({ cardId: card.id, recipientId: assignments[card.id] })));
  return <div className="target-card-picker-overlay" role="presentation"><section className="target-card-picker-panel choice-trigger-panel" role="dialog" aria-modal="true" aria-label="Legacy card distribution">
    <header><strong>LEGACY</strong><span>Look at the top 2 cards, then give each card to any living character.</span></header>
    <div className="legacy-distribution-row">{cards.map((card) => <div className="legacy-distribution-card" key={card.id}><CardFace card={card} /><label>Give this card to<select value={assignments[card.id] ?? ""} disabled={disabled} onChange={(event) => setAssignments((current) => ({ ...current, [card.id]: event.target.value }))}><option value="">Choose a hero</option>{players.map((player) => <option value={player.id} key={player.id}>{heroName(player.hero)}</option>)}</select></label></div>)}</div>
    <div className="target-card-picker-actions"><button type="button" className="primary" disabled={disabled || !complete} onClick={submit}>Distribute cards</button></div>
    {error && <p className="error" role="alert">{error}</p>}
  </section></div>;
}

export function MandatoryChoiceDialog({ option, selection, hand, selectedChoice, selectedKeys, disabled, error, onChoice, onToggle, onConfirm }: { option: TriggerOptionView; selection: ChoiceTriggerSelection; hand: Card[]; selectedChoice: string; selectedKeys: string[]; disabled: boolean; error: string; onChoice: (choice: string) => void; onToggle: (key: string) => void; onConfirm: (choice: string, cardKeys: string[]) => void }) {
  const validSelectedKeys = selectedKeys.filter((key) => selection.eligibleHandKeys.includes(key));
  const handKeys = selection.eligibleHandKeys
    .filter((key) => /^hand:\d+$/.test(key))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));
  const requiredHandCount = selectedChoice ? selection.cardCountByChoice?.[selectedChoice] ?? (selectedChoice === "discard" ? 1 : 0) : 0;
  const needsHandCard = requiredHandCount > 0;
  const complete = Boolean(selectedChoice && validSelectedKeys.length === requiredHandCount);
  const labelForChoice = (choice: { id: string; label: string }) => choice.label;
  return <div className="target-card-picker-overlay" role="presentation"><section className="target-card-picker-panel choice-trigger-panel" role="dialog" aria-modal="true" aria-label={`${option.label} decision`}>
    <header><strong>{option.label.toUpperCase()}</strong><span>{option.description ?? "Choose one:"}</span></header>
    <div className="choice-trigger-options">{selection.choices.map((choice) => <button type="button" key={choice.id} className={selectedChoice === choice.id ? "selected" : ""} disabled={disabled} aria-pressed={selectedChoice === choice.id} onClick={() => onChoice(choice.id)}>{labelForChoice(choice)}</button>)}</div>
    {needsHandCard && <><div className="target-card-picker-card-row choice-trigger-card-row" aria-label="Eligible hand cards">{handKeys.map((key) => { const index = Number(key.slice(5)); const card = hand[index]; if (!card) return null; const selected = validSelectedKeys.includes(key); return <button type="button" key={key} className={`target-card-picker-card ${selected ? "selected" : ""}`} disabled={disabled} aria-pressed={selected} aria-label={`${cardDefinition(card.kind).name} ${card.rank}${card.suit}`} onClick={() => onToggle(key)}><CardFace card={card} />{selected && <span className="target-card-picker-check" aria-hidden="true">✓</span>}</button>; })}</div><div className="target-card-picker-count" aria-live="polite">{validSelectedKeys.length} / {requiredHandCount} selected</div></>}
    <div className="target-card-picker-actions"><button type="button" className="primary" disabled={disabled || !complete} onClick={() => onConfirm(selectedChoice, validSelectedKeys)}>Confirm choice</button></div>
    {error && <p className="error" role="alert">{error}</p>}
  </section></div>;
}

function TargetCardPicker({ option, presentationCopy, selection, target, selectedKeys, disabled, canDecline, showCancel, error, onToggle, onUse, onCancel, onDecline }: { option: TriggerOptionView | null; presentationCopy?: { title: string; accessibleName: string; instruction: string; actionLabel: string }; selection: PublicTargetCardSelection; target: Player; selectedKeys: string[]; disabled: boolean; canDecline: boolean; showCancel: boolean; error: string; onToggle: (key: string) => void; onUse: (keys: string[]) => void; onCancel: () => void; onDecline: () => void }) {
  const validSelectedKeys = selectedKeys.filter((key) => selection.eligibleKeys.includes(key));
  const randomHandZone = selection.eligibleKeys.includes("hand");
  const handKeys = selection.eligibleKeys
    .filter((key) => /^hand:\d+$/.test(key))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));
  const eligiblePublicKeys = new Set(selection.eligibleKeys.filter((key) => key !== "hand" && !/^hand:\d+$/.test(key)));
  const publicCards = [
    ...target.equipmentCards.filter((item) => eligiblePublicKeys.has(item.id)).map((card) => ({ card, zone: "equipment" as const })),
    ...target.judgementCards.filter((item) => eligiblePublicKeys.has(item.id)).map((card) => ({ card, zone: "judgement" as const })),
  ];
  const items = [
    ...(randomHandZone ? [{ key: "hand", label: `Hand ×${target.handCount} · Random card`, hidden: true, randomHandZone: true, zone: "hand" as const, card: null }] : []),
    ...handKeys.map((key) => ({ key, label: `Hidden hand card ${Number(key.slice(5)) + 1}`, hidden: true, randomHandZone: false, zone: "hand-position" as const, card: null })),
    ...publicCards.map(({ card, zone }) => ({ key: card.id, label: `${zone === "equipment" ? "Equipment" : "Judgement"}: ${cardDefinition(card.kind).name}`, hidden: false, randomHandZone: false, zone, card })),
  ];
  const zones = [
    { id: "hand", title: `HAND · ${target.handCount}`, accessibleName: `Hand · ${target.handCount} cards`, items: items.filter((item) => item.zone === "hand" || item.zone === "hand-position") },
    { id: "equipment", title: "EQUIPMENT", accessibleName: "Equipment", items: items.filter((item) => item.zone === "equipment") },
    { id: "judgement", title: "JUDGMENT", accessibleName: "Judgment", items: items.filter((item) => item.zone === "judgement") },
  ].filter((zone) => zone.items.length > 0);
  const zoneComposition = zones.map((zone) => zone.id).join("-");
  const renderItem = (item: typeof items[number]) => {
    const selected = validSelectedKeys.includes(item.key);
    const atSelectionLimit = validSelectedKeys.length >= selection.max && !selected;
    return <button type="button" key={item.key} data-target-card-zone={item.zone} className={`target-card-picker-card ${item.hidden ? "concealed-card" : "equipment"} ${item.randomHandZone ? "random-hand-zone" : ""} ${selected ? "selected" : ""}`} disabled={disabled || atSelectionLimit} aria-pressed={selected} aria-label={item.label} onClick={() => onToggle(item.key)}>{item.randomHandZone ? <span className="concealed-hand-zone-content"><span className="target-card-picker-hand-backs" aria-hidden="true">{Array.from({ length: Math.min(target.handCount, 6) }, (_, index) => <span className="target-card-picker-hand-back" key={index}>?</span>)}{target.handCount > 6 && <span className="target-card-picker-hand-overflow">+{target.handCount - 6}</span>}</span><span className="target-card-picker-hand-copy">Random card</span></span> : item.hidden ? <span className="target-card-picker-hidden-glyph" aria-hidden="true">?</span> : item.card && <CardFace card={item.card} />}{selected && <span className="target-card-picker-check" aria-hidden="true">✓</span>}</button>;
  };
  const effectLabel = presentationCopy?.title ?? option?.label.replace(/^Use\s+/i, "") ?? "Target card selection";
  const amount = selection.min === selection.max ? `${selection.min}` : `${selection.min}–${selection.max}`;
  const subtitle = presentationCopy?.instruction ?? (option?.effectId === "sima_yi_fankui"
    ? "Choose 1 card to obtain"
    : option?.effectId === "frost_sword_damage_about_to_apply"
      ? `Choose ${amount} card${selection.max === 1 ? "" : "s"} to discard`
      : option?.effectId === "kirin_bow_damage_about_to_apply"
        ? "Choose 1 Mount to discard"
    : randomHandZone && selection.min === 1 && selection.max === 1
    ? "Choose where to obtain 1 card"
    : `Choose ${amount} eligible card${selection.max === 1 ? "" : "s"}`);
  const complete = validSelectedKeys.length >= selection.min && validSelectedKeys.length <= selection.max;
  return <div className="target-card-picker-overlay" role="presentation"><section className="target-card-picker-panel target-card-picker-panel--zones" role="dialog" aria-modal="true" aria-label={presentationCopy?.accessibleName ?? `${effectLabel} target card selection`}>
    <header><strong>{effectLabel.toUpperCase()}</strong><span>{subtitle}</span></header>
    <div className="target-card-picker-zones" data-zone-count={zones.length} data-zone-composition={zoneComposition}>
      {zones.map((zone) => <section className={`target-card-picker-zone target-card-picker-zone-${zone.id}`} aria-label={zone.accessibleName} key={zone.id}>
        <div className="target-card-picker-zone-heading"><h3>{zone.title}</h3>{zone.id === "hand" && handKeys.length > 4 && <span className="target-card-picker-zone-scroll-hint">Swipe to see all</span>}</div>
        <div className="target-card-picker-card-row" aria-label={`Eligible ${zone.accessibleName}`} data-hand-scrollable={zone.id === "hand" && handKeys.length > 4 ? "true" : undefined}>
          {zone.items.map(renderItem)}
        </div>
      </section>)}
    </div>
    <div className="target-card-picker-count" aria-live="polite">{validSelectedKeys.length} / {selection.max} selected</div>
    <div className="target-card-picker-actions">
      {showCancel && <button type="button" className="end" disabled={disabled} onClick={onCancel}>Cancel</button>}
      {canDecline && <button type="button" className="end" disabled={disabled} onClick={onDecline}>Skip</button>}
      <button type="button" className="primary" disabled={disabled || !complete} onClick={() => onUse(validSelectedKeys)}>{presentationCopy?.actionLabel ?? `Use ${effectLabel}`}</button>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
  </section></div>;
}

type TablePoint = { x: number; y: number };

function centerRelativeToTable(table: HTMLElement, element: HTMLElement): TablePoint {
  const tableRect = table.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2 - tableRect.left, y: rect.top + rect.height / 2 - tableRect.top };
}

function findAnchor(root: ParentNode, attribute: string, value: string): HTMLElement | null {
  const dataKey = attribute.slice(5).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return Array.from(root.querySelectorAll<HTMLElement>(`[${attribute}]`)).find((element) => element.dataset[dataKey] === value) ?? null;
}

function playerSettlementPoint(table: HTMLElement, anchor: HTMLElement): TablePoint {
  const tableRect = table.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const center = centerRelativeToTable(table, anchor);
  const tableCenterX = tableRect.width / 2;
  if (anchorRect.top >= tableRect.bottom - tableRect.height * .2) return { x: tableCenterX, y: anchorRect.top - tableRect.top - 42 };
  if (anchorRect.bottom <= tableRect.top + tableRect.height * .35) return { x: center.x, y: anchorRect.bottom - tableRect.top + 42 };
  return anchorRect.left + anchorRect.width / 2 < tableRect.left + tableCenterX
    ? { x: anchorRect.right - tableRect.left + 38, y: center.y }
    : { x: anchorRect.left - tableRect.left - 38, y: center.y };
}

function TableResolutionSequence({ events, activeEvent, players, myTableIndex, concluding }: { events: GameEvent[]; activeEvent: GameEvent | null; players: Player[]; myTableIndex: number; concluding: boolean }) {
  const cards = events.filter(retainsAtPlayer).flatMap((event) => event.type === "card" ? [{ event, card: event.card, key: event.id }] : event.type === "cards" ? event.cards.map((card) => ({ event, card, key: `${event.id}-${card.id}` })) : []);
  const cardPlayers = players.filter((player) => cards.some(({ event }) => !settlesInJudgement(event) && publicPlayerName(event.player) === publicPlayerName(player.name)));
  const activeCards = activeEvent?.type === "card" ? [activeEvent.card] : activeEvent?.type === "cards" ? activeEvent.cards : [];
  const activeCardIds = new Set(activeCards.map((card) => card.id));
  const equipmentFlightId = activeEvent?.type === "card" && activeEvent.action === "equip" && !activeEvent.playedAs ? activeEvent.card.id : null;
  const judgementFlightId = activeEvent && settlesInJudgement(activeEvent) ? activeEvent.card.id : null;
  const activePlayerId = activeEvent?.type === "card" || activeEvent?.type === "cards" ? players.find((player) => publicPlayerName(player.name) === publicPlayerName(activeEvent.player))?.id ?? "" : "";
  const cardPlayerIds = cardPlayers.map((player) => player.id).join("|");
  const directDiscard = Boolean(activeEvent && movesDirectlyToDiscard(activeEvent) && !events.some((event) => event.id === activeEvent.id));
  const revealRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const reveal = revealRef.current;
    const table = reveal?.closest<HTMLElement>(".play-table");
    const shell = table?.closest<HTMLElement>(".game-shell");
    if (!reveal || !table || !shell || !activePlayerId) return;
    const localPlayerId = players[myTableIndex]?.id;
    const source = activePlayerId === localPlayerId
      ? findAnchor(shell, "data-card-origin-anchor", activePlayerId) ?? findAnchor(shell, "data-player-anchor", activePlayerId)
      : findAnchor(shell, "data-player-anchor", activePlayerId);
    const destination = equipmentFlightId ? findAnchor(shell, "data-equipment-id", equipmentFlightId)
      : judgementFlightId ? findAnchor(shell, "data-judgement-id", judgementFlightId)
        : directDiscard ? findAnchor(shell, "data-discard-anchor", "true") : null;
    const face = reveal.querySelector<HTMLElement>(".played-card");
    if (!face) return;
    const measure = () => {
      const origin = source ? centerRelativeToTable(table, source) : { x: table.clientWidth / 2, y: table.clientHeight / 2 };
      reveal.style.setProperty("--origin-x", origin.x + "px");
      reveal.style.setProperty("--origin-y", origin.y + "px");
      if (equipmentFlightId || judgementFlightId) {
        const point = destination ? centerRelativeToTable(table, destination) : { x: table.clientWidth / 2, y: table.clientHeight / 2 };
        reveal.style.setProperty(equipmentFlightId ? "--equipment-x" : "--judgement-x", point.x + "px");
        reveal.style.setProperty(equipmentFlightId ? "--equipment-y" : "--judgement-y", point.y + "px");
        if (destination) {
          const rect = destination.getBoundingClientRect();
          reveal.style.setProperty(equipmentFlightId ? "--equipment-scale-x" : "--judgement-scale-x", String(rect.width / face.offsetWidth));
          reveal.style.setProperty(equipmentFlightId ? "--equipment-scale-y" : "--judgement-scale-y", String(rect.height / face.offsetHeight));
        }
      } else if (directDiscard) {
        const point = destination ? centerRelativeToTable(table, destination) : { x: table.clientWidth / 2, y: table.clientHeight / 2 };
        reveal.style.setProperty("--discard-x", point.x + "px");
        reveal.style.setProperty("--discard-y", point.y + "px");
      } else {
        const anchor = findAnchor(shell, "data-player-anchor", activePlayerId);
        const point = anchor ? playerSettlementPoint(table, anchor) : origin;
        reveal.style.setProperty("--settle-x", point.x + "px");
        reveal.style.setProperty("--settle-y", point.y + "px");
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    if (source) observer.observe(source);
    if (destination) observer.observe(destination);
    return () => observer.disconnect();
  }, [activeEvent?.id, activePlayerId, directDiscard, equipmentFlightId, judgementFlightId, myTableIndex, players]);
  useLayoutEffect(() => {
    const reveal = revealRef.current;
    const table = reveal?.closest<HTMLElement>(".play-table");
    const shell = table?.closest<HTMLElement>(".game-shell");
    if (!reveal || !table || !shell) return;
    const nodes = Array.from(reveal.querySelectorAll<HTMLElement>("[data-player-settlement-id]"));
    const anchors = nodes.map((node) => findAnchor(shell, "data-player-anchor", node.dataset.playerSettlementId ?? ""));
    const discard = findAnchor(shell, "data-discard-anchor", "true");
    const measure = () => nodes.forEach((node, index) => {
      const anchor = anchors[index];
      if (!anchor) return;
      const point = playerSettlementPoint(table, anchor);
      node.style.setProperty("--settle-x", point.x + "px");
      node.style.setProperty("--settle-y", point.y + "px");
      if (discard) {
        const discardPoint = centerRelativeToTable(table, discard);
        node.style.setProperty("--discard-x", discardPoint.x + "px");
        node.style.setProperty("--discard-y", discardPoint.y + "px");
      }
    });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    if (discard) observer.observe(discard);
    anchors.forEach((anchor) => { if (anchor) observer.observe(anchor); });
    return () => observer.disconnect();
  }, [cardPlayerIds, myTableIndex, players]);
  return <div className={`table-resolution-layer ${concluding ? "concluding" : ""}`} role="status">
    {activeCards.length > 0 && !concluding && <div ref={revealRef} className={`active-table-reveal ${equipmentFlightId ? "equipment-flight" : ""} ${judgementFlightId ? "judgement-flight" : ""} ${isJudgementReveal(activeEvent) ? "judgement-reveal" : ""} ${directDiscard ? "direct-discard" : ""}`} data-settlement-event-id={activeEvent?.id} key={activeEvent?.id}><div>{activeCards.map((shown) => <CardFace card={shown} key={shown.id} />)}</div></div>}
    {cardPlayers.map((player) => {
      const playerCards = cards.filter(({ event }) => !settlesInJudgement(event) && publicPlayerName(event.player) === publicPlayerName(player.name));
      const equipmentOnly = playerCards.every(({ event }) => event.type === "card" && event.action === "equip");
      return <div className={`player-played-cards ${equipmentOnly ? "equipment-only" : ""}`} data-player-settlement-id={player.id} key={player.id}><span>{publicPlayerName(player.name)}</span><div>{playerCards.map(({ event, card, key }, index) => activeCardIds.has(card.id) ? null : <div className="table-played-card settled" data-settlement-event-id={event.id} key={key}><em>{index + 1}</em><CardFace card={card} /></div>)}</div></div>;
    })}
  </div>;
}

function describeEvent(event: GameEvent) {
  if (event.type === "message") return event.message;
  if (event.type === "cards") {
    const cardNames = event.cards.map((card) => `${card.rank}${card.suit} ${cardDefinition(card.kind).name}`).join(", ");
    if (event.message) return event.message;
    if (event.action === "play") return `${event.player} discards ${cardNames} with Serpent Spear to form an Attack${event.target !== event.player ? ` on ${event.target}` : ""}.`;
    return event.action === "reveal" ? `${event.player} reveals ${cardNames} for Bumper Harvest.` : `${event.player} reveals and discards ${cardNames}.`;
  }
  if (event.playedAs === "attack") return `${event.player} uses ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name} as Attack${event.target !== event.player ? ` on ${event.target}` : ""}.`;
  if (event.playedAs === "dodge") return `${event.player} uses ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name} as Dodge${event.target !== event.player ? ` against ${event.target}` : ""}.`;
  if (event.action === "discard") return `${event.player} reveals and discards ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name}.`;
  if (event.action === "equip") return `${event.player} equips ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name}.`;
  if (event.action === "activate") return `${event.player} resolves ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name} from their Judgement Zone.`;
  if (event.action === "gain") return `${event.player} chooses ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name} from Bumper Harvest.`;
  if (event.action === "reveal") return `${event.player} reveals for judgement: ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name}.`;
  if (event.target === event.player && (isAttackCard(event.card) || event.card.kind === "Dodge")) return `${event.player} responds with ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name}.`;
  return event.message ?? `${event.player} plays ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name}${event.target !== event.player ? ` on ${event.target}` : ""}.`;
}
