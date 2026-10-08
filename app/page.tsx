"use client";

import { Component, FormEvent, PointerEvent as ReactPointerEvent, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cardDefinition, isAttackCard } from "../game/cards";
import type { Card, CardKind } from "../game/model";
import { baselineHand, updatePrivateHand } from "../game/private-hand.js";
import { getResponseOptions } from "../game/responses";
import { HEROES, type HeroSkill } from "../game/heroes";
import { normalizeRoomData } from "../game/room-safety.js";
import { canUseAction, type CurrentAction, type GameplayAction, type TriggerOptionView } from "../game/protocol.js";
import { latestPublicMessages } from "../game/messages.js";
import { canTargetCharacter } from "../game/capabilities/targeting";
import type { PresentationSnapshot } from "../game/presentation-snapshot";
import type { PresentationSkillEffectSettlementProof, PresentationV2 } from "../game/presentation-v2";
import { buildDyingHandoffView, buildInteractionStageDisplayModel, buildInteractionStageView, buildPresentationClientView, buildPresentationDecisionStatus, buildReactionChainView, isProvenBorrowedSwordForcedAttack, projectInteractionSeatRoles, type InteractionSeatSemanticRoles, type PresentationClientView } from "../game/presentation-client";
import { buildPresentationTransition, type PresentationTransition, type PresentationTransitionKind } from "../game/presentation-transition";
import { buildHeroFocusView, projectHeroFocusForViewer, projectMediumSourceForViewer, projectGroupSourceForViewer, projectGroupTargetScopeForViewer, projectOathRecipientScopeForStage, projectBumperHarvestStageCompositionForViewer, type BumperHarvestStageCompositionView, type GroupSourceView, type GroupTargetScopeView, type HeroFocusPlayerDisplay, type HeroFocusView, type MediumParticipantView, type OathRecipientScopeView } from "../game/hero-focus";
import { buildLocalTargetSelectionView } from "../game/local-target-selection";
import { buildConsoleDecisionDisplay, type ConsoleDecisionKind, type ConsoleSelectionFact } from "../game/console-decision";
import { buildGroupScopePreview } from "../game/group-scope-preview";
import { InteractionRootOverlay, interactionRootActionKey, type InteractionRootOverlayAction } from "./interaction-root-overlay";

type Hero = { id: string; name: string; faction: string; hp: number; ability: string; skill?: string; skills?: readonly HeroSkill[] };
type ActiveSkillSelectionState = { revision: string; effectId: string; cardIds: string[]; targetIds: string[] };
type ActiveAttackDodgeSettlement = { eventId: string; phase: "exiting" | "complete" };
type RootActionOverlayLayoutReadiness = { key: string; state: "measuring" | "ready" | "unavailable" } | null;
type LocalTargetFlow = "normal" | "serpent" | "active-skill" | "trigger" | "borrowed-sword";
type PresentationImportance = "essential" | "informational";
type PresentationEventMeta = { resolutionId?: string; importance?: PresentationImportance; finalResult?: boolean; playedAs?: "attack" | "dodge" | "peach"; effectNotice?: boolean; judgement?: boolean; initialDeal?: boolean; publicSkillEffectSettlement?: PresentationSkillEffectSettlementProof };
type CardEvent = PresentationEventMeta & { id: string; player: string; target: string; card: Card; action?: "play" | "equip" | "activate" | "discard" | "gain" | "reveal" | "draw"; drawPlayerId?: string; presentation?: boolean };
type CardGroupEvent = PresentationEventMeta & { id: string; type: "cards"; player: string; target: string; cards: Card[]; action: "discard" | "reveal" | "play"; presentation?: boolean; message?: string };

const GROUP_CURRENT_EFFECT_LABELS: Readonly<Record<string, string>> = {
  BarbarianInvasion: cardDefinition("BarbarianInvasion").name,
  "Barbarian Invasion": cardDefinition("BarbarianInvasion").name,
  RainingArrows: cardDefinition("RainingArrows").name,
  "Raining Arrows": cardDefinition("RainingArrows").name,
  SkyPiercingHalberdAttack: "Attack",
};
type GameEvent = (CardEvent & { type: "card"; message?: string }) | CardGroupEvent | ({ type: "message"; id: string; message: string; drawPlayerId?: string; presentation?: boolean } & PresentationEventMeta);
type Player = { id: string; name: string; seat: number; hero: string | null; generalReady: boolean; ready: boolean; hp: number | null; maxHp: number | null; alive: boolean; connected: boolean; handCount: number; judgementCards: Card[]; equipmentCards: Card[]; attackRange: number; distance: number | null; isHost: boolean; role: string | null };
type LocalTargetPreviewPresentation = { id: string; name: string; hero: Hero | null; hp: number | null; maxHp: number | null };
type LocalTargetPreviewSubmission = { targetId: string; presentationKey: string; actionRevision: string; currentActionKey: string };
type LocalOpponentInspectionPresentation = { id: string; name: string; hero: Hero | null; hp: number | null; maxHp: number | null; handCount: number; equipmentCards: Card[]; judgementCards: Card[] };
type Room = { responseCountdownVisibleAt?: number; actionRevision?: string; code: string; status: "lobby" | "heroes" | "started" | "finished" | "playing"; maxPlayers: number; isHost: boolean; isTestController?: boolean; meId: string; myRole: string | null; myHeroOptions: Hero[]; players: Player[]; myHand: Card[]; turnSeat: number | null; phase: string | null; deckCount: number; discardTop: Card | null; log: string[]; timeline: GameEvent[]; isMyTurn: boolean; actionPlayerId: string | null; actionReason: string; isMyAction: boolean; presentationSnapshot: PresentationSnapshot | null; presentationV2?: PresentationV2 | null; pending: { kind: CurrentAction["kind"] } | null; currentAction: CurrentAction | null; pendingAttack: { sourceId: string; targetId: string; sequenceStartCardId?: string; deadline?: number } | null; pendingGreenDragon: { sourceId: string; targetId: string; actorId: string; sequenceStartCardId: string; deadline?: number } | null; pendingRockCleaving: { sourceId: string; targetId: string; actorId: string; sequenceStartCardId: string; deadline?: number } | null; pendingFrostSword: { sourceId: string; targetId: string; actorId: string; deadline?: number } | null; pendingDuel: { sourceId: string; targetId: string; actorId: string; opponentId: string; deadline?: number } | null; pendingGroup: { cardKind: "BarbarianInvasion" | "RainingArrows" | "SkyPiercingHalberdAttack"; sourceId: string; requiredKind: "Attack" | "Dodge" } | null; pendingNegation: { sourceId: string; actorId: string | null; effectTargetId: string; cardName: string; responseTarget?: string; latestNegationPlayerId?: string | null; latestNegationCardId?: string | null; chainDepth?: number; negated: boolean; deadline?: number } | null; pendingHarvest: { sourceId: string; actorId: string; revealed: Card[]; choices: { cardId: string; playerId: string; playerName: string }[]; previewCardId: string | null; complete: boolean; countdownUntil: number } | null; pendingTargetCard: { sourceId: string; actorId: string; targetId: string; cardKind: "Dismantle" | "Steal" } | null; pendingBorrowedSword: { sourceId: string; targetId: string; actorId: string; holderId: string; stage: "choose_target" | "force_attack"; weaponId: string | null; eligibleTargetIds: string[] } | null; pendingDying: { sourceId: string; targetId: string; origin?: string | null; recoveryNeeded: number; deadline: number } | null };

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
  activePoll: 1000,
  hiddenPoll: 60000,
  presenceHeartbeat: 60000,
  inactivityCheck: 60000,
  turnDrawStart: 100,
  playedCard: 2000,
  // Judgement cards need about two extra seconds for every seat to read the result.
  judgementCard: 4000,
  privateDraw: 3000,
  effectNotice: 2400,
  sequenceDiscard: 700,
  interactionSettlement: 600,
  interactionSettlementReduced: 120,
  interactionSettlementFade: 150,
} as const;
const NO_SKILL_EFFECT_SETTLEMENTS = [] as const;

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
  const [error, setError] = useState("");
  const [pageVisible, setPageVisible] = useState(true);
  const stateEpoch = useRef(0);
  const mutationInFlight = useRef<string | null>(null);
  const latestAppliedMutation = useRef(0);

  const fetchRoom = useCallback(async (roomCode: string, playerToken: string, quiet = false) => {
    const epoch = stateEpoch.current;
    try {
      const response = await fetch(`/api/rooms?code=${roomCode}&token=${playerToken}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Room is no longer available.");
      const nextRoom = normalizeRoomData(await readApiJson(response)) as Room | null;
      if (!nextRoom || !nextRoom.meId) throw new Error("Your player session is no longer valid.");
      if (epoch === stateEpoch.current) setRoom(nextRoom as Room);
      return true;
    } catch (cause) {
      if (cause instanceof Error && /Previous game data|no longer available|session is no longer valid/.test(cause.message)) {
        localStorage.removeItem("three-realms-session");
        if (epoch === stateEpoch.current) { setRoom(null); setCode(""); setToken(""); }
      }
      if (!quiet) setError(cause instanceof Error ? cause.message : "Could not reach the room.");
      return false;
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("three-realms-session");
    if (!saved) return;
    try {
      const session = JSON.parse(saved) as { code: string; token: string; name?: string };
      if (!/^[A-Z0-9]{5}$/.test(session.code) || !session.token) throw new Error("Invalid saved session");
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
    const interval = !pageVisible ? UI_TIMING.hiddenPoll : room?.phase === "response" || room?.phase === "dying" ? UI_TIMING.activePoll : UI_TIMING.roomPoll;
    const timer = setInterval(() => fetchRoom(roomCode, token, true), interval);
    return () => clearInterval(timer);
  }, [roomCode, token, busy, pageVisible, fetchRoom, room?.phase]);

  async function send(action: "create" | "join" | "start" | "add_test_players" | "choose_hero" | "heartbeat" | "expire_inactive_room" | GameplayAction, extra: Record<string, unknown> = {}) {
    const backgroundPreview = action === "preview_harvest" || action === "heartbeat";
    const nonBlocking = backgroundPreview;
    const mutationKey = `${action}:${room?.actionRevision ?? room?.phase ?? "landing"}`;
    if (!nonBlocking && mutationInFlight.current === mutationKey) return false;
    if (!nonBlocking && mutationInFlight.current) return false;
    if (!nonBlocking) mutationInFlight.current = mutationKey;
    const epoch = nonBlocking ? stateEpoch.current : ++stateEpoch.current; const mutationSequence = nonBlocking ? latestAppliedMutation.current : epoch;
    if (!nonBlocking) { setBusy(true); setError(""); }
    try {
      if (action === "join") {
        const saved = localStorage.getItem("three-realms-session");
        try {
          const session = saved ? JSON.parse(saved) as { code?: string; token?: string } : null;
          if (session?.code === code && session.token && await fetchRoom(code, session.token, true)) return true;
        } catch { localStorage.removeItem("three-realms-session"); }
      }
      const context = room && !["create", "join", "start", "add_test_players", "choose_hero", "heartbeat"].includes(action) ? { actionRevision: room.actionRevision ?? "", meId: room.meId, phase: room.phase, pendingKind: pendingKind(room), actorId: room.actionPlayerId } : undefined;
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, name, code, token, ...(context ? { context } : {}), ...extra }) });
      const rawData = await readApiJson<{ error?: string; token?: string; room?: unknown }>(response);
      const data = { ...rawData, room: normalizeRoomData(rawData.room) as Room | null };
      if (data.room && mutationSequence >= latestAppliedMutation.current && (nonBlocking || epoch === stateEpoch.current)) { latestAppliedMutation.current = Math.max(latestAppliedMutation.current, mutationSequence); setToken(data.token ?? token); setRoom(data.room); setCode(data.room.code); }
      if (!response.ok || action !== "heartbeat" && !data.room) throw new Error(data.error ?? "Something went wrong.");
      if (action === "heartbeat") return true;
      const nextToken = data.token ?? token;
      if (epoch === stateEpoch.current && mutationSequence >= latestAppliedMutation.current) { latestAppliedMutation.current = mutationSequence; setToken(nextToken); setRoom(data.room); setCode(data.room.code); }
      localStorage.setItem("three-realms-session", JSON.stringify({ code: data.room.code, token: nextToken, name: name.trim() }));
      return true;
    } catch (cause) { if (!backgroundPreview) setError(cause instanceof Error ? cause.message : "Something went wrong."); return false; }
    finally { if (!nonBlocking) { if (mutationInFlight.current === mutationKey) mutationInFlight.current = null; setBusy(false); } }
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
    stateEpoch.current += 1; setRoom(null); setError("");
  }

  const presentationView = room ? buildPresentationClientView(room.presentationSnapshot, room.meId) : null;

  if (room?.status === "started" || room?.status === "playing" || room?.status === "finished") return <GameRoomErrorBoundary room={room} onRecover={leave}><GameRoom room={room} presentationView={presentationView ?? buildPresentationClientView(null, null)} busy={busy} error={error} onAction={send} onLeave={leave} /></GameRoomErrorBoundary>;
  if (room?.status === "heroes") return <HeroSelection room={room} busy={busy} error={error} onChoose={(heroId) => send("choose_hero", { heroId })} onLeave={leave} />;
  if (room) return <WaitingRoom room={room} busy={busy} error={error} onStart={() => send("start")} onAddTestPlayers={() => send("add_test_players")} onLeave={leave} />;

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

export function WaitingRoom({ room, busy, error, onStart, onAddTestPlayers, onLeave }: { room: Room; busy: boolean; error: string; onStart: () => void; onAddTestPlayers: () => void; onLeave: () => void }) {
  const share = async () => { await navigator.clipboard?.writeText(room.code); };
  const canStart = room.players.length >= 4 && room.players.length <= room.maxPlayers;
  return <main className="lobby-shell"><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b></div><button className="text-button" onClick={onLeave}>Leave room</button></header>
      <section className="lobby-content"><div className="lobby-heading"><span className="eyebrow">THE GENERALS ASSEMBLE</span><h1>Waiting room</h1><p>Share this code with your friends. The game can start when 4–8 players have joined.</p><button className="copy-code" onClick={share}><span>{room.code}</span><small>Tap to copy room code</small></button></div>
      <div className="seat-grid">{Array.from({ length: room.maxPlayers }, (_, seat) => { const player = room.players.find((item) => item.seat === seat); return <div className={`seat ${player ? "filled" : ""}`} key={seat}>{player ? <><span className="seat-number">{seat + 1}</span><div className="seal">{player.name[0].toUpperCase()}</div><b>{player.name}</b><small>{player.isHost ? "HOST" : "PLAYER"}</small></> : <><span className="seat-number">{seat + 1}</span><div className="empty-seal">+</div><b>Open seat</b><small>WAITING FOR PLAYER</small></>}</div>; })}</div>
      <div className="lobby-actions"><span>{room.players.length} / {room.maxPlayers} players</span><div className="host-actions">{room.isHost && <>{room.players.length < 4 && <button className="test-button" disabled={busy} onClick={onAddTestPlayers}>+ Add {4 - room.players.length} Test Player{4 - room.players.length === 1 ? "" : "s"}</button>}<button className="gold-button" disabled={busy || !canStart} onClick={onStart}>{busy ? "Preparing…" : room.players.length < 4 ? `Need ${4 - room.players.length} more` : "Start game"}</button></>}{!room.isHost && <p>Waiting for the host to start…</p>}</div></div>{error && <p className="error" role="alert">{error}</p>}</section></main>;
}

export function HeroSelection({ room, busy, error, onChoose, onLeave }: { room: Room; busy: boolean; error: string; onChoose: (heroId: string) => void; onLeave: () => void }) {
  const [selected, setSelected] = useState(room.myHeroOptions[0]?.id ?? "");
  const [infoHero, setInfoHero] = useState<Hero | null>(null);
  const me = room.players.find((player) => player.id === room.meId);
  const roleLabel = room.myRole ?? "Role pending";
  const waiting = Boolean(me?.hero) || !room.isMyAction;
  const chosenCount = room.players.filter((player) => player.generalReady).length;
  const effectiveSelected = room.myHeroOptions.some((hero) => hero.id === selected) ? selected : room.myHeroOptions[0]?.id ?? "";
  const selector = room.players.find((player) => player.id === room.actionPlayerId);
  const waitingMessage = me?.hero ? `Waiting for the other players · ${chosenCount}/${room.players.length} ready` : `Waiting for ${selector?.name ?? "the current seat"} to choose · ${chosenCount}/${room.players.length} ready`;
  return <main className="hero-shell"><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b><span>Choose a hero</span></div><button className="text-button" onClick={onLeave}>Exit</button></header>
    <section className="hero-stage"><div className="hero-stage-head"><span className="eyebrow">{room.isTestController ? `TEST CONTROLLER · ${me?.name?.toUpperCase()}` : "GENERAL SELECTION"}</span><h1>{me?.hero ? "Your general is chosen" : room.isMyAction ? "Choose your general" : "Waiting for selection"}</h1><div className="hero-role-banner" role="status" aria-label={`Your secret role is ${roleLabel}`}><span>YOUR SECRET ROLE</span><strong>{roleLabel}</strong></div><p>{waiting ? waitingMessage : room.myRole === "Lord" ? "As Lord, choose from five generals. Your identity will be visible at the table." : "Choose one of your three private candidates."}</p></div>
      {waiting ? <div className="chosen-wait"><div className="seal">{me?.hero ? "✓" : "…"}</div>{me?.hero && (() => { const chosenHero = heroDefinition(me.hero); return chosenHero ? <div className="chosen-hero-art" data-hero-id={chosenHero.id}><HeroPortrait hero={chosenHero} /></div> : null; })()}<b>{me?.hero ? heroName(me.hero) : `Waiting for ${selector?.name ?? "the current seat"}`}</b><span>{me?.hero ? "Locked in" : "Your private candidates are ready."}</span><div className="ready-list">{room.players.map((player) => <small key={player.id} className={player.generalReady ? "ready" : ""}>{player.name} {player.generalReady ? "✓" : "…"}</small>)}</div></div> : <div className={`hero-choice-grid hero-choice-grid-${room.myHeroOptions.length}`}>{room.myHeroOptions.map((hero) => <div className={`hero-choice-wrap ${effectiveSelected === hero.id ? "selected" : ""}`} key={hero.id}><button type="button" aria-label={`Select ${hero.name}`} aria-pressed={effectiveSelected === hero.id} className={`hero-choice ${hero.faction.toLowerCase()} ${effectiveSelected === hero.id ? "selected" : ""}`} onClick={() => setSelected(hero.id)}><span className="faction">{hero.faction}</span><div className="hero-monogram" data-hero-id={hero.id}><HeroPortrait hero={hero} /></div><h2>{hero.name}</h2><span className="hero-hp">{"♥".repeat(hero.hp)}</span><p>{heroSkillNames(hero).join(" · ")}</p><i>{effectiveSelected === hero.id ? "SELECTED" : "CHOOSE"}</i></button><button type="button" className="hero-info-button" aria-label={`View ${hero.name} information`} onClick={() => setInfoHero(hero)}>i</button></div>)}</div>}
      {!waiting && <div className="hero-confirm"><span>General choices remain private until the match begins.</span><button className="gold-button" disabled={busy || !effectiveSelected} onClick={() => onChoose(effectiveSelected)}>{busy ? "Locking in…" : `Confirm ${room.myHeroOptions.find((hero) => hero.id === effectiveSelected)?.name ?? "hero"}`}</button></div>}{error && <p className="error hero-error" role="alert">{error}</p>}{infoHero && <HeroInfoDialog hero={infoHero} onClose={() => setInfoHero(null)} />}
    </section></main>;
}

export function HeroInfoDialog({ hero, onClose }: { hero: Hero; onClose: () => void }) {
  const skills = hero.skills?.length ? hero.skills : [{ name: hero.skill ?? "Hero Skill", description: hero.ability }];
  return <div className="card-info-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}><section className="card-info-dialog hero-info-dialog" role="dialog" aria-modal="true" aria-labelledby="hero-info-title"><button type="button" className="card-info-close" onClick={onClose} aria-label="Close hero information">×</button><span>HERO INFORMATION</span><small>{hero.faction} · {"♥".repeat(hero.hp)} · {hero.hp} HP</small><h2 id="hero-info-title">{hero.name}</h2>{skills.map((skill) => <div className="hero-info-skill-block" key={skill.name}><strong className="hero-info-skill">{skill.name}</strong><p>{skill.description}</p></div>)}<em>Only you can see this information.</em></section></div>;
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
  isActionPlayer: boolean;
  isSelectedTarget: boolean;
  isGroupPreview: boolean;
  interactionRoles: InteractionSeatSemanticRoles;
  targetSelectionActive: boolean;
  targetablePlayer: boolean;
  onTarget: () => void;
  onInspect: () => void;
  onHeroInfo: (hero: Hero) => void;
  onInfoCard: (card: Card) => void;
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

function OpponentPlayerCard({ totalPlayers, player, playerHero, relativeIndex, isTurn, isActionPlayer, isSelectedTarget, isGroupPreview, interactionRoles, targetSelectionActive, targetablePlayer, onTarget, onInspect, onHeroInfo, onInfoCard, judgementInFlight }: OpponentPlayerCardProps) {
  const sideColumnSeat = projectSideColumnSeat(totalPlayers, relativeIndex);
  const fourPlayerTopRow = totalPlayers === 4;
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
    <button type="button" className="zone-info-button" aria-label={`Explain ${cardDefinition(judgement.kind).name}`} onClick={(event) => { event.stopPropagation(); onInfoCard(judgement); }}>i</button>
  </span>);
  const targetButtonDisabled = targetSelectionActive && (!targetablePlayer || !player.alive);
  const interactionRoleNames = Object.entries(interactionRoles).filter(([, active]) => active).map(([role]) => role.replace(/^is/, "").replace(/([A-Z])/g, "-$1").toLowerCase()).join(" ");
  return <article className={`player-square opponent-player-card player-square-${relativeIndex} ${isTurn ? "turn-square" : ""} ${isActionPlayer ? "action-square" : ""} ${isSelectedTarget ? "selected-target" : ""} ${isGroupPreview ? "local-group-preview" : ""} ${interactionRoles.isInteractionSource ? "interaction-seat-source" : ""} ${interactionRoles.isOriginalTarget ? "interaction-seat-original-target" : ""} ${interactionRoles.isActiveTarget ? "interaction-seat-active-target" : ""} ${interactionRoles.isCurrentParticipant ? "interaction-seat-current-participant" : ""} ${interactionRoles.isDecisionActor ? "interaction-seat-decision-actor" : ""} ${interactionRoles.isActiveResolver ? "interaction-seat-active-resolver" : ""} ${interactionRoles.isViewerDecisionActor ? "interaction-seat-viewer-decision" : ""} ${!player.alive ? "defeated-square" : ""}`} data-side-column={sideColumnSeat?.side} data-side-row={sideColumnSeat?.row} style={sideColumnSeat ? { gridRow: sideColumnSeat.row } : undefined} data-player-anchor={player.id} data-local-group-preview={isGroupPreview ? "true" : undefined} data-interaction-roles={interactionRoleNames || undefined} data-interaction-source={interactionRoles.isInteractionSource ? "true" : undefined} data-interaction-original-target={interactionRoles.isOriginalTarget ? "true" : undefined} data-interaction-active-target={interactionRoles.isActiveTarget ? "true" : undefined} data-interaction-current-participant={interactionRoles.isCurrentParticipant ? "true" : undefined} data-interaction-decision-actor={interactionRoles.isDecisionActor ? "true" : undefined} data-interaction-active-resolver={interactionRoles.isActiveResolver ? "true" : undefined} data-interaction-viewer-decision={interactionRoles.isViewerDecisionActor ? "true" : undefined}>
    <div className="opponent-public-zones">
      <div className="player-hero-card opponent-hero-card">
        <button type="button" className="player-square-target opponent-hero-target" disabled={targetButtonDisabled} aria-label={`${targetSelectionActive ? "Select" : "Inspect"} ${player.name}`} onClick={targetSelectionActive ? onTarget : onInspect}>
          {playerHero && <span className="player-square-portrait opponent-hero-portrait" data-hero-id={playerHero.id}><HeroPortrait hero={playerHero} /></span>}
          <span className="opponent-hero-overlay">
            <span className="opponent-player-name">{player.name}</span>
            <strong className="opponent-hero-name">{playerHero?.name ?? heroName(player.hero)}</strong>
            <span className="player-hp">HP {player.hp ?? 0}/{player.maxHp ?? 0}</span>
            <span className="player-hearts">{hpDisplay(player.hp)}</span>
          </span>
        </button>
        {!fourPlayerTopRow && equipmentSummary.length > 0 && <div className="opponent-equipment-summary" role="group" aria-label="Public Equipment">{equipmentSummary}</div>}
        {playerHero && <button type="button" className="hero-card-info-button" aria-label={targetSelectionActive ? `Inspect ${player.name}` : `Explain ${playerHero.name}`} onClick={() => targetSelectionActive ? onInspect() : onHeroInfo(playerHero)}>i</button>}
      </div>
      {player.judgementCards.length > 0 && <section className="opponent-judgement-zone" aria-label="Judgement Zone">
        <span className="opponent-zone-label">Judgement</span>
        <div className="opponent-judgement-cards">{miniJudgement}</div>
      </section>}
    </div>
    <div className="opponent-hand-footer">
      <span className="player-hand-label">Hand cards</span>
      {fourPlayerTopRow && equipmentSummary.length > 0 && <div className="opponent-equipment-summary" role="group" aria-label="Public Equipment">{equipmentSummary}</div>}
      <strong className="player-hand-count">{player.handCount}</strong>
    </div>
  </article>;
}

function groupParticipantStatusLabel(status: PresentationClientView["groupParticipantProgress"][number]["status"]): string {
  switch (status) {
    case "CURRENT": return "Current";
    case "PAUSED": return "Paused";
    case "RESOLVED": return "Resolved";
    case "NO_LONGER_APPLICABLE": return "Not applicable";
    default: return "Pending";
  }
}

function groupParticipantOutcomeLabel(outcome: PresentationClientView["groupParticipantProgress"][number]["outcome"] | null): string | null {
  return outcome === "AVOIDED" ? "Avoided" : outcome === "DAMAGED" ? "Damaged" : outcome === "NEGATED" ? "Negated" : outcome === "DEFEATED" ? "Defeated" : null;
}

function groupParticipantOutcomeMarker(outcome: PresentationClientView["groupParticipantProgress"][number]["outcome"] | null): string | null {
  return outcome === "AVOIDED" ? "✓" : outcome === "DAMAGED" ? "−♥" : outcome === "NEGATED" ? "⊘" : outcome === "DEFEATED" ? "✕" : null;
}

function phaseName(phase?: string | null) { return phase?.startsWith("draw") ? "Draw Phase" : phase?.startsWith("play") ? "Play Phase" : phase === "discard" ? "Discard Phase" : phase === "response" ? "Response" : phase === "dying" ? "Dying Rescue" : phase === "resolving" ? "Resolving" : phase === "finished" ? "Finished" : ""; }

function presentationViewKey(view: PresentationClientView) {
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
  ]);
}

function currentActionViewKey(action: CurrentAction | null) {
  return JSON.stringify(action);
}

type TargetCardSelection = Extract<NonNullable<TriggerOptionView["selection"]>, { type: "target_cards" }>;
type HeroFocusTargetCardSelection = Pick<TargetCardSelection, "targetId" | "min" | "max" | "eligibleKeys">;
type TargetCardSelectableDetail = {
  label: string;
  selection: HeroFocusTargetCardSelection;
  target: Player;
  selectedKeys: string[];
  disabled: boolean;
  onToggle: (key: string) => void;
};

function supportsAuthoritativeTargetCardSelection(selection: HeroFocusTargetCardSelection, target: Player) {
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

function supportsLocalEquipmentSelectableDetail(selection: HeroFocusTargetCardSelection, target: Player) {
  if (!target.alive || !Number.isInteger(selection.min) || !Number.isInteger(selection.max) || selection.min < 1 || selection.max < selection.min || selection.max > selection.eligibleKeys.length) return false;
  if (new Set(selection.eligibleKeys).size !== selection.eligibleKeys.length) return false;
  const equipmentIds = new Set(target.equipmentCards.map((card) => card.id));
  return selection.eligibleKeys.length >= selection.min && selection.eligibleKeys.every((key) => equipmentIds.has(key));
}

function hasProvenExternalHeroFocusTarget(view: PresentationClientView, viewerId: string | null, targetId: string, players: Player[]) {
  const byId = new Map(players.map((player) => [player.id, player]));
  const resolvePlayerName = (playerId: string) => byId.get(playerId)?.name ?? null;
  const resolvePlayerDisplay = (playerId: string): HeroFocusPlayerDisplay | null => {
    const player = byId.get(playerId);
    if (!player) return null;
    const hero = heroDefinition(player.hero);
    return { name: player.name, heroId: hero?.id ?? player.hero, heroName: hero?.name ?? (player.hero ? heroName(player.hero) : null), hp: player.hp, maxHp: player.maxHp };
  };
  const stage = buildInteractionStageView(view, resolvePlayerName);
  const focus = projectHeroFocusForViewer(stage, buildHeroFocusView(stage, resolvePlayerDisplay), viewerId, resolvePlayerDisplay);
  const display = buildInteractionStageDisplayModel(
    stage,
    focus.roleLabel === "CURRENT PARTICIPANT" ? focus.primary?.id ?? null : null,
  );
  return display.visible && focus.visible && targetId !== viewerId && focus.primary?.id === targetId;
}

function HeroFocus({ view, showSource = true, previewPlayer = null, inspectPlayer = null, selectableDetail = null, hideArchitecturalLabel = false, roleLabelOverride = null, groupParticipantProgress = null, judgementInFlight, onCloseInspect, onHeroInfo, onInfoCard }: { view: HeroFocusView; showSource?: boolean; previewPlayer?: LocalTargetPreviewPresentation | null; inspectPlayer?: LocalOpponentInspectionPresentation | null; selectableDetail?: TargetCardSelectableDetail | null; hideArchitecturalLabel?: boolean; roleLabelOverride?: string | null; groupParticipantProgress?: PresentationClientView["groupParticipantProgress"][number] | null; judgementInFlight?: ReadonlySet<string>; onCloseInspect?: () => void; onHeroInfo?: (hero: Hero) => void; onInfoCard?: (card: Card) => void }) {
  if (inspectPlayer) {
    const inspectedHero = inspectPlayer.hero;
    const publicSkills = inspectedHero?.skills ?? [];
    const renderInspectionCard = (card: Card, hidden = false) => <button key={card.id} type="button" className="opponent-inspection-card" style={{ visibility: hidden ? "hidden" : "visible" }} aria-label={`Explain ${cardDefinition(card.kind).name}`} onClick={(event) => { event.stopPropagation(); onInfoCard?.(card); }}><CardFace card={card} /></button>;
    const heroName = inspectedHero?.name ?? "Unknown Hero";
    return <div className="hero-focus hero-focus-inspect opponent-inspection-panel" role="dialog" aria-label={`${inspectPlayer.name} opponent inspection`} data-hero-focus-mode="INSPECT" data-inspect-player-id={inspectPlayer.id}>
      <div className="hero-focus-heading"><strong>{`INSPECT · ${inspectPlayer.name}`}</strong><button type="button" className="hero-focus-inspect-close" aria-label={`Close ${inspectPlayer.name} inspection`} onClick={onCloseInspect}>×</button></div>
      <div className="hero-focus-body">
        <span className={inspectedHero ? "hero-focus-portrait" : "hero-focus-portrait hero-focus-portrait-empty"} data-hero-id={inspectedHero?.id}>{inspectedHero ? <HeroPortrait hero={inspectedHero} /> : "?"}</span>
        <div className="hero-focus-identity">
          <b>{inspectPlayer.name}</b><span>{heroName}</span><small>HP {inspectPlayer.hp ?? "?"}/{inspectPlayer.maxHp ?? "?"} · {hpDisplay(inspectPlayer.hp)}</small>
          {inspectedHero && <button type="button" className="hero-focus-inspect-explain" aria-label={`Explain ${inspectedHero.name}`} onClick={() => onHeroInfo?.(inspectedHero)}>Explain Hero</button>}
        </div>
      </div>
      <div className="hero-focus-inspect-details hero-focus-context">
        <section className="opponent-inspection-zone hero-focus-inspect-public-skills" aria-label="Public Skills">
          <h3>Public Skills</h3>
          <div className="hero-focus-inspect-skills">{publicSkills.length ? publicSkills.map((skill) => <button type="button" className="hero-focus-inspect-skill" key={skill.name} aria-label={`Explain ${skill.name}`} onClick={() => inspectedHero && onHeroInfo?.(inspectedHero)}>{skill.name}</button>) : <span className="opponent-inspection-empty">None</span>}</div>
        </section>
        <div className="hero-focus-inspect-public-zones">
          <section className="opponent-inspection-zone" aria-label="Equipment"><h3>Equipment</h3><div className="opponent-inspection-card-row">{inspectPlayer.equipmentCards.length ? inspectPlayer.equipmentCards.map((card) => renderInspectionCard(card)) : <span className="opponent-inspection-empty">None</span>}</div></section>
          <section className="opponent-inspection-zone" aria-label="Judgement Zone"><h3>Judgement Zone</h3><div className="opponent-inspection-card-row">{inspectPlayer.judgementCards.length ? inspectPlayer.judgementCards.map((card) => renderInspectionCard(card, judgementInFlight?.has(card.id))) : <span className="opponent-inspection-empty">None</span>}</div></section>
          <section className="opponent-inspection-zone" aria-label="Concealed Hand" data-concealed-hand-count={inspectPlayer.handCount}><h3>Hand · {inspectPlayer.handCount}</h3><div className="hero-focus-inspect-hand" aria-label={`${inspectPlayer.handCount} concealed hand cards`}><span className="hero-focus-inspect-hand-backs" aria-hidden="true">{Array.from({ length: Math.min(3, inspectPlayer.handCount) }, (_, index) => <i key={index} />)}</span><strong>{inspectPlayer.handCount} {inspectPlayer.handCount === 1 ? "card" : "cards"}</strong></div></section>
        </div>
      </div>
    </div>;
  }
  if (previewPlayer) {
    const previewHeroName = previewPlayer.hero?.name ?? "Unknown Hero";
    return <div className="hero-focus hero-focus-preview" aria-label={`Preview target ${previewPlayer.name}`} data-hero-focus-mode="PREVIEW" data-preview-player-id={previewPlayer.id}>
      <div className="hero-focus-heading"><strong>PREVIEW TARGET</strong></div>
      <div className="hero-focus-body">
        <span className={previewPlayer.hero ? "hero-focus-portrait" : "hero-focus-portrait hero-focus-portrait-empty"} data-hero-id={previewPlayer.hero?.id}>{previewPlayer.hero ? <HeroPortrait hero={previewPlayer.hero} /> : "?"}</span>
        <div className="hero-focus-identity"><b>{previewPlayer.name}</b><span>{previewHeroName}</span><small>HP {previewPlayer.hp ?? "?"}/{previewPlayer.maxHp ?? "?"}</small></div>
      </div>
      <small className="hero-focus-context">UNSUBMITTED TARGET · LOCAL PREVIEW</small>
    </div>;
  }
  if (!view.visible || !view.primary) return null;
  const hero = heroDefinition(view.primary.heroId);
  const heroName = view.primary.heroName ?? hero?.name ?? null;
  const hp = view.primary.hp !== null || view.primary.maxHp !== null ? `HP ${view.primary.hp ?? "?"}/${view.primary.maxHp ?? "?"}` : null;
  const matchingSelectableDetail = selectableDetail?.selection.targetId === view.primary.id && selectableDetail.target.id === view.primary.id ? selectableDetail : null;
  return <div className="hero-focus" aria-label={hideArchitecturalLabel ? roleLabelOverride ?? "Target" : "Hero Focus"} data-hero-focus="true" data-hero-focus-player-id={view.primary.id} data-hero-focus-role={roleLabelOverride ?? view.roleLabel ?? undefined} data-hero-focus-source-id={view.source.id ?? undefined} data-hero-focus-known={view.primary.known ? "true" : "false"} data-hero-focus-mode={matchingSelectableDetail ? "SELECTABLE DETAIL" : undefined} data-group-participant-status={groupParticipantProgress?.status} data-group-participant-order={groupParticipantProgress?.order}>
    <div className="hero-focus-heading">{!hideArchitecturalLabel && <span>HERO FOCUS</span>}<strong>{roleLabelOverride ?? view.roleLabel}</strong>{groupParticipantProgress && <small className="hero-focus-group-status" aria-label={`Participant ${groupParticipantProgress.order}: ${groupParticipantStatusLabel(groupParticipantProgress.status)}`}>{groupParticipantStatusLabel(groupParticipantProgress.status)}</small>}</div>
    <div className="hero-focus-body">
      <span className={hero ? "hero-focus-portrait" : "hero-focus-portrait hero-focus-portrait-empty"} data-hero-id={view.primary.heroId ?? undefined}>{hero ? <HeroPortrait hero={hero} /> : "?"}</span>
      <div className="hero-focus-identity"><b>{view.primary.name}</b>{heroName && <span>{heroName}</span>}{hp && <small>{hp}</small>}</div>
      {showSource && view.source.id && view.source.id !== view.primary.id && <small className="hero-focus-source">SOURCE · {view.source.name}</small>}
    </div>
    {view.nestedContext && <small className="hero-focus-context">{view.nestedContext}</small>}
    {matchingSelectableDetail && <TargetCardSelectableDetailView {...matchingSelectableDetail} />}
  </div>;
}

function MediumParticipantCard({ view }: { view: MediumParticipantView }) {
  const hero = heroDefinition(view.player.heroId);
  const heroName = view.player.heroName ?? hero?.name ?? null;
  const hp = view.player.hp !== null || view.player.maxHp !== null ? `HP ${view.player.hp ?? "?"}/${view.player.maxHp ?? "?"}` : null;
  return <div className="medium-participant-card" data-medium-participant="source" data-medium-participant-player-id={view.player.id} data-medium-participant-known={view.player.known ? "true" : "false"}>
    <span className="medium-participant-role">{view.roleLabel}</span>
    <span className={hero ? "medium-participant-portrait" : "medium-participant-portrait medium-participant-portrait-empty"} data-hero-id={view.player.heroId ?? undefined}>{hero ? <HeroPortrait hero={hero} /> : "?"}</span>
    <div className="medium-participant-identity"><b>{view.player.name}</b>{heroName && <span>{heroName}</span>}{hp && <small>{hp}</small>}</div>
  </div>;
}

function SingleTargetNegationSource({ view }: { view: MediumParticipantView }) {
  const hero = heroDefinition(view.player.heroId);
  return <div className="medium-participant-card single-target-negation-source" data-negation-source="proven" data-negation-source-player-id={view.player.id} data-negation-source-known={view.player.known ? "true" : "false"} aria-label={`Source: ${view.player.name}`}>
    <span className={hero ? "medium-participant-portrait" : "medium-participant-portrait medium-participant-portrait-empty"} data-hero-id={view.player.heroId ?? undefined}>{hero ? <HeroPortrait hero={hero} /> : "?"}</span>
    <div className="medium-participant-identity"><b>{view.player.name}</b></div>
  </div>;
}

type SingleTargetNegationParticipantIdentity = { id: string; name: string; heroId: string | null };

function SingleTargetNegationParticipant({ identity, participantRole }: { identity: SingleTargetNegationParticipantIdentity; participantRole: "source" | "target" }) {
  const hero = heroDefinition(identity.heroId);
  return <div className="single-target-negation-participant" data-negation-causal-participant={participantRole} data-negation-participant-id={identity.id}>
    <span className={hero ? "single-target-negation-portrait" : "single-target-negation-portrait is-empty"} data-hero-id={identity.heroId ?? undefined}>{hero ? <HeroPortrait hero={hero} /> : "?"}</span>
    <b>{identity.name}</b>
  </div>;
}

type StageActionCardKind = NonNullable<PresentationClientView["groupResolution"]>["cardKind"] | CardKind;
type GroupReactionNode = ReturnType<typeof buildReactionChainView>["negationNodes"][number];

const STAGE_ACTION_CARD_ART: Readonly<Partial<Record<StageActionCardKind, string>>> = {
  BarbarianInvasion: "/barbarian-invasion-card.jpg",
  BorrowedSword: "/borrowed-sword-card.jpg",
  BumperHarvest: "/bumper-harvest-card.jpg",
  DrawTwo: "/something-out-of-nothing-card.jpg",
  Dismantle: "/burning-bridges-card.jpg",
  Duel: "/duel-card.jpg",
  Lightning: "/lightning-card.jpg",
  Oath: "/oath-card.jpg",
  Overindulgence: "/overindulgence-card.jpg",
  RainingArrows: "/raining-arrows-card.jpg",
  SkyPiercingHalberdAttack: "/sky-piercing-halberd-card.jpg",
  Steal: "/steal-card.jpg",
  Negation: "/negation-card.jpg",
};

function StageSource({ view, family }: { view: GroupSourceView; family: "group" | "oath" | "bumper-harvest" }) {
  const hero = heroDefinition(view.heroId);
  return <div className={`group-stage-source${family === "oath" ? " oath-stage-source" : ""}${family === "bumper-harvest" ? " bumper-harvest-stage-source" : ""}`} data-group-source={family === "group" ? "proven" : undefined} data-group-source-player-id={family === "group" ? view.id : undefined} data-oath-source={family === "oath" ? "proven" : undefined} data-oath-source-player-id={family === "oath" ? view.id : undefined} data-bumper-harvest-source={family === "bumper-harvest" ? "proven" : undefined} data-bumper-harvest-source-player-id={family === "bumper-harvest" ? view.id : undefined} aria-label={`Source: ${view.name}`}>
    <span className={hero ? "group-stage-source-portrait" : "group-stage-source-portrait group-stage-source-portrait-empty"} data-hero-id={view.heroId ?? undefined}>{hero ? <HeroPortrait hero={hero} /> : "?"}</span>
    <b>{view.name}</b>
  </div>;
}

function StageActionCard({ kind, active, root = false, singleTargetNegationRoot = false, cancelledRoot = false }: { kind: StageActionCardKind; active: boolean; root?: boolean; singleTargetNegationRoot?: boolean; cancelledRoot?: boolean }) {
  const name = cardDefinition(kind).name;
  const artwork = STAGE_ACTION_CARD_ART[kind];
  return <div className={`group-stage-card${root ? " group-stage-card-root" : " group-stage-card-negation"}${kind === "Oath" ? " oath-stage-card" : ""}${kind === "BumperHarvest" ? " bumper-harvest-stage-card" : ""}${active ? " is-active" : " is-context"}`} role="img" aria-label={`${name}${root ? cancelledRoot ? ", cancelled root action" : active ? ", active root action" : ", root action context" : active ? ", active response head" : ", public response"}`} data-action-card-kind={kind} data-single-target-negation-root={singleTargetNegationRoot ? "true" : undefined} data-negation-root-cancelled={cancelledRoot ? "true" : undefined} data-group-root-action={root && kind !== "Oath" && kind !== "BumperHarvest" ? kind : undefined} data-oath-root-action={root && kind === "Oath" ? "Oath" : undefined} data-bumper-harvest-root-action={root && kind === "BumperHarvest" ? "BumperHarvest" : undefined} data-active-head={active ? "true" : "false"}>
    <span className="group-stage-card-art" style={artwork ? { backgroundImage: `url("${artwork}")` } : undefined} aria-hidden="true" />
    <b>{name}</b>
    {cancelledRoot && <span className="single-target-negation-cancelled-mark" aria-hidden="true">⊘</span>}
  </div>;
}

function SingleTargetNegationCausalComposition({ source, target, cardKind, rootActive, cancelled = false, negationNodes }: { source: SingleTargetNegationParticipantIdentity; target: SingleTargetNegationParticipantIdentity; cardKind: CardKind; rootActive: boolean; cancelled?: boolean; negationNodes: readonly GroupReactionNode[] }) {
  const selfTarget = source.id === target.id;
  const visibleNegationNodes = negationNodes.slice(-2);
  const collapsedNegationCount = negationNodes.length - visibleNegationNodes.length;
  return <div className="single-target-negation-composition" data-single-target-negation-causal-spine="proven" data-negation-self-target={selfTarget ? "true" : "false"}>
    <SingleTargetNegationParticipant identity={source} participantRole="source" />
    <span className="single-target-negation-causal-arrow" aria-hidden="true">↓</span>
    <div className="single-target-negation-root-slot" data-single-target-negation-root-slot="true">
      <StageActionCard kind={cardKind} active={rootActive} root singleTargetNegationRoot cancelledRoot={cancelled} />
      {visibleNegationNodes.length > 0 && <div className="single-target-negation-response-branch" data-public-negation-branch="proven" data-public-negation-count={negationNodes.length} data-visible-public-negation-count={visibleNegationNodes.length} data-collapsed-public-negation-count={collapsedNegationCount}>
        <span className="single-target-negation-branch-connector" aria-hidden="true" />
        {collapsedNegationCount > 0 && <span className="single-target-negation-collapsed-history" data-collapsed-negation-count={collapsedNegationCount} aria-label={`${collapsedNegationCount} earlier public Negation cards collapsed`}>+{collapsedNegationCount}</span>}
        <ol className="single-target-negation-response-list" aria-label="Public Negation responses">
          {visibleNegationNodes.map((node, index) => {
            const active = index === visibleNegationNodes.length - 1;
            return <li className="single-target-negation-response-node" key={node.actor.id ? `${node.actor.id}-${negationNodes.length - visibleNegationNodes.length + index}` : `unknown-${index}`} data-public-negation-node-actor-id={node.actor.id ?? undefined} data-active-head={active ? "true" : "false"} aria-label={`Negation publicly played by ${node.actor.name}${active ? ", current active response" : ", previous public response"}`}>
              <StageActionCard kind={node.cardKind} active={active} />
              <b data-public-negation-actor={node.actor.id ?? undefined}>{node.actor.name}</b>
            </li>;
          })}
        </ol>
      </div>}
    </div>
    {selfTarget
      ? <span className="single-target-negation-self-return" role="img" data-self-return-relationship="true" aria-label={`Returns to ${source.name}`} />
      : <><span className="single-target-negation-causal-arrow" aria-hidden="true">↓</span><SingleTargetNegationParticipant identity={target} participantRole="target" /></>}
  </div>;
}

function SingleTargetNegationParticipantCardHistory({ cardKind, rootActive, cancelled = false, negationNodes }: { cardKind: CardKind; rootActive: boolean; cancelled?: boolean; negationNodes: readonly GroupReactionNode[] }) {
  const visibleNodes = negationNodes.slice(-2);
  const collapsedNodeCount = negationNodes.length - visibleNodes.length;
  return <div className="single-target-negation-participant-card-history" data-single-target-negation-cards="proven" data-public-negation-count={negationNodes.length}>
    <StageActionCard kind={cardKind} active={rootActive} root singleTargetNegationRoot cancelledRoot={cancelled} />
    {visibleNodes.length > 0 && <div className="single-target-negation-participant-response-branch" data-public-negation-branch="proven" data-public-negation-count={negationNodes.length} data-visible-public-negation-count={visibleNodes.length} data-collapsed-public-negation-count={collapsedNodeCount}>
      <span className="single-target-negation-branch-connector" aria-hidden="true" />
      {collapsedNodeCount > 0 && <span className="single-target-negation-collapsed-history" data-collapsed-negation-count={collapsedNodeCount} aria-label={`${collapsedNodeCount} earlier public Negation cards collapsed`}>+{collapsedNodeCount}</span>}
      <ol className="single-target-negation-response-list" aria-label="Public Negation responses">
        {visibleNodes.map((node, index) => {
          const active = index === visibleNodes.length - 1;
          return <li className="single-target-negation-response-node" key={node.actor.id ? `${node.actor.id}-${negationNodes.length - visibleNodes.length + index}` : `unknown-${index}`} data-public-negation-node-actor-id={node.actor.id ?? undefined} data-active-head={active ? "true" : "false"} aria-label={`Negation publicly played by ${node.actor.name}${active ? ", current active response" : ", previous public response"}`}>
            <StageActionCard kind={node.cardKind} active={active} />
            <b data-public-negation-actor={node.actor.id ?? undefined}>{node.actor.name}</b>
          </li>;
        })}
      </ol>
    </div>}
  </div>;
}

function compactGroupParticipantMarker(status: NonNullable<GroupTargetScopeView["players"][number]["status"]>, outcome: GroupTargetScopeView["players"][number]["outcome"]): string {
  const outcomeMarker = groupParticipantOutcomeMarker(outcome ?? null);
  if (outcomeMarker) return outcomeMarker;
  switch (status) {
    case "CURRENT": return "▶";
    case "PAUSED": return "Ⅱ";
    case "RESOLVED": return "✓";
    case "NO_LONGER_APPLICABLE": return "—";
    default: return "·";
  }
}

function GroupTargetScope({ view, compact = false }: { view: GroupTargetScopeView; compact?: boolean }) {
  const isGroup = view.resolutionSemantics === "GROUP";
  const isOrdered = view.resolutionSemantics === "ORDERED";
  const isCompactGroup = compact && isGroup;
  const targetStripRef = useRef<HTMLDivElement>(null);
  const currentTargetRef = useRef<HTMLDivElement>(null);
  const currentParticipantId = view.players.find((player) => player.status === "CURRENT" || player.status === "PAUSED")?.id ?? null;
  useLayoutEffect(() => {
    if (!isCompactGroup || !targetStripRef.current || !currentTargetRef.current) return;
    const rail = targetStripRef.current;
    const target = currentTargetRef.current;
    const railBounds = rail.getBoundingClientRect();
    const targetBounds = target.getBoundingClientRect();
    if (targetBounds.left < railBounds.left) rail.scrollLeft -= railBounds.left - targetBounds.left;
    else if (targetBounds.right > railBounds.right) rail.scrollLeft += targetBounds.right - railBounds.right;
  }, [isCompactGroup, currentParticipantId]);
  return <section className={`group-target-scope${isCompactGroup ? " group-target-strip" : ""}`} aria-label={isCompactGroup ? "Group Target Strip" : isGroup ? "AOE Participant Progress" : isOrdered ? "Ordered Target Progress" : "Original target scope"} data-group-target-scope={isOrdered ? undefined : "original"} data-target-progress-scope={isOrdered ? "ordered" : undefined} data-participant-density={view.density} data-group-progress={isGroup ? "proven" : undefined} data-target-progress={isOrdered ? "proven" : undefined}>
    {!isCompactGroup && <header>{isGroup ? "AOE PARTICIPANTS" : isOrdered ? "TARGET PROGRESS" : "ORIGINAL TARGET SCOPE"}</header>}
    <div className="group-target-cards" ref={isCompactGroup ? targetStripRef : undefined}>
      {view.players.map((player) => {
        const hero = heroDefinition(player.heroId);
        const outcomeLabel = groupParticipantOutcomeLabel(player.outcome ?? null);
        const outcomeMarker = groupParticipantOutcomeMarker(player.outcome ?? null);
        const status = player.status;
        const statusLabel = status ? groupParticipantStatusLabel(status) : null;
        const marker = isCompactGroup && status ? compactGroupParticipantMarker(status, player.outcome) : null;
        return <div className={`group-target-card${player.isViewer ? " group-target-card-viewer" : ""}${isCompactGroup ? " group-target-card-compact" : ""}`} key={player.id} ref={isCompactGroup && (status === "CURRENT" || status === "PAUSED") ? currentTargetRef : undefined} data-group-target-id={isOrdered ? undefined : player.id} data-target-id={isOrdered ? player.id : undefined} data-group-participant-order={isGroup ? player.order ?? undefined : undefined} data-target-order={isOrdered ? player.order ?? undefined : undefined} data-participant-status={player.status ?? undefined} data-participant-outcome={player.outcome ?? undefined}>
          {!player.isViewer && <span className="group-target-portrait">{hero ? <HeroPortrait hero={hero} /> : "?"}</span>}
          <div className="group-target-identity">{isOrdered && player.order !== null && <small className="ordered-target-number">Target {player.order}</small>}<b>{player.isViewer ? "You" : player.name}</b>{!isCompactGroup && !player.isViewer && view.density === "medium" && player.heroName && <span>{player.heroName}</span>}{!isCompactGroup && !player.isViewer && player.hp !== null && <small>HP {player.hp}{player.maxHp !== null ? `/${player.maxHp}` : ""}</small>}{statusLabel && <span className={`group-target-status${status ? ` status-${status.toLowerCase().replaceAll("_", "-")}` : ""}${isCompactGroup ? " group-target-status-compact" : ""}`} data-group-outcome-marker={player.outcome ?? undefined} aria-label={`Status: ${statusLabel}${outcomeLabel ? `; Outcome: ${outcomeLabel}` : ""}`}>{isCompactGroup && marker ? <span aria-hidden="true">{marker}</span> : outcomeMarker ? <span aria-hidden="true">{outcomeMarker}</span> : statusLabel}</span>}</div>
        </div>;
      })}
    </div>
  </section>;
}

function GroupInteractionComposition({ source, rootKind, rootActive, negationNodes, interactionId, targetScope }: { source: GroupSourceView | null; rootKind: NonNullable<PresentationClientView["groupResolution"]>["cardKind"]; rootActive: boolean; negationNodes: readonly GroupReactionNode[]; interactionId: string | null; targetScope: GroupTargetScopeView }) {
  const visibleNodes = negationNodes.slice(-2);
  const collapsedNodeCount = negationNodes.length - visibleNodes.length;
  return <div className="interaction-stage-body group-stage-body" data-group-composition="proven">
    <div className="group-stage-composition">
      {source && <><StageSource view={source} family="group" /><span className="group-stage-causal-arrow" aria-hidden="true">↓</span></>}
      <div className="group-stage-root-row" data-group-root-row="true">
        <StageActionCard kind={rootKind} active={rootActive} root />
        {visibleNodes.length > 0 && <div className="group-negation-branch-anchor">
          <span className="group-negation-branch-connector" aria-hidden="true" />
          <ol className="group-negation-branch" aria-label="AOE Negation Response" data-reaction-chain="proven" data-group-negation="true" data-reaction-interaction-id={interactionId ?? undefined}>
            {collapsedNodeCount > 0 && <li className="group-negation-collapsed" aria-label={`${collapsedNodeCount} earlier public Negation cards collapsed`}><span aria-hidden="true">+{collapsedNodeCount}</span></li>}
            {visibleNodes.map((node, index) => {
              const active = index === visibleNodes.length - 1;
              return <li className="group-negation-branch-node" key={`${node.actor.id ?? "unknown"}-${negationNodes.length - visibleNodes.length + index}`} data-reaction-node="negation" data-active-head={active ? "true" : "false"} aria-label={`${node.cardKind} publicly played by ${node.actor.name}${active ? ", current response head" : ""}`}>
                <StageActionCard kind={node.cardKind} active={active} />
              </li>;
            })}
          </ol>
        </div>}
      </div>
      <span className="group-stage-causal-arrow" aria-hidden="true">↓</span>
      <GroupTargetScope view={targetScope} compact />
    </div>
  </div>;
}

function OathRecipientStrip({ view }: { view: OathRecipientScopeView }) {
  return <section className="oath-recipient-scope" aria-label="Oath Recipient Scope" data-oath-recipient-scope="proven" data-recipient-density={view.density}>
    <div className="oath-recipient-track">
      {view.recipients.length === 0
        ? <span className="oath-empty-recipient" data-oath-empty-recipient="true">No wounded characters</span>
        : view.recipients.map((recipient) => {
          const hero = heroDefinition(recipient.heroId);
          return <div className={`oath-recipient-marker${recipient.isViewer ? " is-viewer" : ""}`} key={recipient.id} data-oath-recipient-id={recipient.id} aria-label={`Oath recipient: ${recipient.isViewer ? "You" : recipient.name}`}>
            {!recipient.isViewer && <span className={hero ? "oath-recipient-portrait" : "oath-recipient-portrait oath-recipient-portrait-empty"} data-hero-id={recipient.heroId ?? undefined}>{hero ? <HeroPortrait hero={hero} /> : "?"}</span>}
            <b>{recipient.isViewer ? "You" : recipient.name}</b>
          </div>;
        })}
    </div>
  </section>;
}

function OathInteractionComposition({ source, recipients, negationNodes, interactionId }: { source: GroupSourceView | null; recipients: OathRecipientScopeView; negationNodes: readonly GroupReactionNode[]; interactionId: string | null }) {
  const visibleNodes = negationNodes.slice(-2);
  const collapsedNodeCount = negationNodes.length - visibleNodes.length;
  return <div className="interaction-stage-body oath-stage-body" data-oath-stage-body="true">
    <div className="oath-stage-composition" data-oath-composition="proven">
      {source && <><StageSource view={source} family="oath" /><span className="group-stage-causal-arrow" aria-hidden="true">↓</span></>}
      <div className="group-stage-root-row oath-stage-root-row" data-oath-root-row="true">
        <StageActionCard kind="Oath" active={visibleNodes.length === 0} root />
        {visibleNodes.length > 0 && <div className="group-negation-branch-anchor oath-negation-branch-anchor">
          <span className="group-negation-branch-connector" aria-hidden="true" />
          <ol className="group-negation-branch oath-negation-branch" aria-label="Oath Negation Response" data-oath-negation-branch="proven" data-reaction-interaction-id={interactionId ?? undefined}>
            {collapsedNodeCount > 0 && <li className="group-negation-collapsed" aria-label={`${collapsedNodeCount} earlier public Negation cards collapsed`}><span aria-hidden="true">+{collapsedNodeCount}</span></li>}
            {visibleNodes.map((node, index) => {
              const active = index === visibleNodes.length - 1;
              return <li className="group-negation-branch-node" key={`${node.actor.id ?? "unknown"}-${negationNodes.length - visibleNodes.length + index}`} data-oath-negation-node="true" data-active-head={active ? "true" : "false"} aria-label={`${node.cardKind} publicly played by ${node.actor.name}${active ? ", current response head" : ""}`}>
                <StageActionCard kind={node.cardKind} active={active} />
              </li>;
            })}
          </ol>
        </div>}
      </div>
      <span className="group-stage-causal-arrow" aria-hidden="true">↓</span>
      <OathRecipientStrip view={recipients} />
    </div>
  </div>;
}

function bumperHarvestParticipantStatusLabel(status: BumperHarvestStageCompositionView["participants"][number]["status"], outcome?: BumperHarvestStageCompositionView["participants"][number]["outcome"]) {
  if (status === "CURRENT") return "Current chooser";
  if (status === "PENDING") return "Waiting";
  if (status === "NO_LONGER_APPLICABLE") return "No longer applicable";
  return outcome === "NEGATED" ? "Negated" : "Chose a card";
}

function bumperHarvestParticipantMarker(status: BumperHarvestStageCompositionView["participants"][number]["status"], outcome?: BumperHarvestStageCompositionView["participants"][number]["outcome"]) {
  if (status === "CURRENT") return "▶";
  if (status === "PENDING") return "·";
  if (status === "NO_LONGER_APPLICABLE") return "—";
  return outcome === "NEGATED" ? "⊘" : "✓";
}

function BumperHarvestParticipantStrip({ view }: { view: BumperHarvestStageCompositionView }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!trackRef.current || !currentRef.current) return;
    const track = trackRef.current;
    const current = currentRef.current;
    const trackBounds = track.getBoundingClientRect();
    const currentBounds = current.getBoundingClientRect();
    if (currentBounds.left < trackBounds.left) track.scrollLeft -= trackBounds.left - currentBounds.left;
    else if (currentBounds.right > trackBounds.right) track.scrollLeft += currentBounds.right - trackBounds.right;
  }, [view.currentParticipantId]);
  return <section className="bumper-harvest-participant-strip" aria-label="Bumper Harvest participants" data-bumper-harvest-participants="proven" data-participant-density={view.density}>
    <div className="bumper-harvest-participant-track" ref={trackRef}>
      {view.participants.map((participant) => {
        const hero = heroDefinition(participant.heroId);
        const label = bumperHarvestParticipantStatusLabel(participant.status, participant.outcome);
        const current = participant.status === "CURRENT";
        return <div className={`bumper-harvest-participant${participant.isViewer ? " is-viewer" : ""}`} key={participant.id} ref={current ? currentRef : undefined} data-bumper-harvest-participant-id={participant.id} data-participant-order={participant.order} data-participant-status={participant.status} data-participant-outcome={participant.outcome} aria-label={`${participant.order}. ${participant.isViewer ? "You" : participant.name}; ${label}`}>
          {!participant.isViewer && <span className={hero ? "bumper-harvest-participant-portrait" : "bumper-harvest-participant-portrait bumper-harvest-participant-portrait-empty"} data-hero-id={participant.heroId ?? undefined}>{hero ? <HeroPortrait hero={hero} /> : "?"}</span>}
          <b>{participant.isViewer ? "You" : participant.name}</b>
          <span className="bumper-harvest-participant-status" aria-hidden="true">{bumperHarvestParticipantMarker(participant.status, participant.outcome)}</span>
        </div>;
      })}
    </div>
  </section>;
}

function BumperHarvestInteractionComposition({ source, view, rootActive, negationNodes, interactionId }: { source: GroupSourceView | null; view: BumperHarvestStageCompositionView; rootActive: boolean; negationNodes: readonly GroupReactionNode[]; interactionId: string | null }) {
  const visibleNodes = negationNodes.slice(-2);
  const collapsedNodeCount = negationNodes.length - visibleNodes.length;
  return <div className="interaction-stage-body bumper-harvest-stage-body" data-bumper-harvest-stage-body="true">
    <div className="bumper-harvest-stage-composition" data-bumper-harvest-composition="proven">
      {source && <><StageSource view={source} family="bumper-harvest" /><span className="group-stage-causal-arrow" aria-hidden="true">↓</span></>}
      <div className="group-stage-root-row bumper-harvest-root-row" data-bumper-harvest-root-row="true">
        <StageActionCard kind="BumperHarvest" active={rootActive} root />
        {visibleNodes.length > 0 && <div className="group-negation-branch-anchor bumper-harvest-negation-branch-anchor">
          <span className="group-negation-branch-connector" aria-hidden="true" />
          <ol className="group-negation-branch bumper-harvest-negation-branch" aria-label="Bumper Harvest Negation Response" data-bumper-harvest-negation-branch="proven" data-reaction-interaction-id={interactionId ?? undefined}>
            {collapsedNodeCount > 0 && <li className="group-negation-collapsed" aria-label={`${collapsedNodeCount} earlier public Negation cards collapsed`}><span aria-hidden="true">+{collapsedNodeCount}</span></li>}
            {visibleNodes.map((node, index) => {
              const active = index === visibleNodes.length - 1;
              return <li className="group-negation-branch-node" key={`${node.actor.id ?? "unknown"}-${negationNodes.length - visibleNodes.length + index}`} data-bumper-harvest-negation-node="true" data-active-head={active ? "true" : "false"} aria-label={`${node.cardKind} publicly played by ${node.actor.name}${active ? ", current response head" : ""}`}>
                <StageActionCard kind={node.cardKind} active={active} />
              </li>;
            })}
          </ol>
        </div>}
      </div>
      <span className="group-stage-causal-arrow" aria-hidden="true">↓</span>
      <BumperHarvestParticipantStrip view={view} />
    </div>
  </div>;
}

export function InteractionStage({ view, viewerId, transitionKind = "NONE", transition = null, topRowMode = false, resolvePlayerName, resolvePlayerDisplay, previewPlayer = null, previewSubmission = null, inspectPlayer = null, selectableDetail = null, judgementInFlight, onCloseInspect, onHeroInfo, onInfoCard }: { view: PresentationClientView; viewerId: string | null; transitionKind?: PresentationTransitionKind; transition?: PresentationTransition | null; topRowMode?: boolean; resolvePlayerName: (playerId: string) => string | null | undefined; resolvePlayerDisplay?: (playerId: string) => HeroFocusPlayerDisplay | null | undefined; previewPlayer?: LocalTargetPreviewPresentation | null; previewSubmission?: LocalTargetPreviewSubmission | null; inspectPlayer?: LocalOpponentInspectionPresentation | null; selectableDetail?: TargetCardSelectableDetail | null; judgementInFlight?: ReadonlySet<string>; onCloseInspect?: () => void; onHeroInfo?: (hero: Hero) => void; onInfoCard?: (card: Card) => void }) {
  const stage = buildInteractionStageView(view, resolvePlayerName);
  const borrowedSwordForcedAttack = isProvenBorrowedSwordForcedAttack(stage);
  const dyingHandoff = buildDyingHandoffView(stage);
  const reactionChain = buildReactionChainView(stage);
  const publicHeroFocus = buildHeroFocusView(stage, resolvePlayerDisplay);
  const heroFocus = projectHeroFocusForViewer(stage, publicHeroFocus, viewerId, resolvePlayerDisplay);
  const display = buildInteractionStageDisplayModel(
    stage,
    heroFocus.roleLabel === "CURRENT PARTICIPANT" ? heroFocus.primary?.id ?? null : null,
  );
  const authoritativePreviewFocus = Boolean(previewPlayer
    && previewSubmission?.targetId === previewPlayer.id
    && previewSubmission.presentationKey !== presentationViewKey(view)
    && display.visible
    && (display.focusTarget.id === previewPlayer.id || heroFocus.primary?.id === previewPlayer.id));
  const localPreviewPlayer = authoritativePreviewFocus ? null : previewPlayer;
  const hasLocalPreview = localPreviewPlayer !== null;
  const hasLocalInspect = inspectPlayer !== null;
  const hasLocalFocus = hasLocalPreview || hasLocalInspect;
  const focusSelectableDetail = selectableDetail
    && !hasLocalFocus
    && display.visible
    && heroFocus.visible
    && selectableDetail.selection.targetId === heroFocus.primary?.id
    && selectableDetail.target.id === heroFocus.primary?.id
    && selectableDetail.target.id !== viewerId
    ? selectableDetail
    : null;
  const isOpenNegationResponse = display.visible && stage.stage === "NEGATION";
  const mediumSource = projectMediumSourceForViewer(stage, heroFocus, viewerId, resolvePlayerDisplay);
  const groupTargetScope = projectGroupTargetScopeForViewer(stage, heroFocus, mediumSource, viewerId, resolvePlayerDisplay);
  const oathRecipientScope = projectOathRecipientScopeForStage(stage, view.oathRecipientScope, viewerId, resolvePlayerDisplay);
  const bumperHarvestCompositionView = projectBumperHarvestStageCompositionForViewer(stage, viewerId, resolvePlayerDisplay);
  const negationSettlement = view.negationSettlement ?? null;
  const settlementMatchesScene = Boolean(display.visible
    && negationSettlement
    && negationSettlement.interactionId === stage.interactionId
    && negationSettlement.rootFrameId === stage.rootFrameId
    && negationSettlement.rootFrameId === stage.activeFrameId
    && stage.continuity.relation === "ROOT_FRAME"
    && stage.source.id === negationSettlement.sourceId
    && stage.originalTargets.length === 1
    && stage.originalTargets[0]?.id === negationSettlement.targetId
    && stage.originalTargets[0]?.known);
  const settlementRootTarget = settlementMatchesScene ? stage.originalTargets[0] : null;
  const settlementRootCard = settlementMatchesScene && negationSettlement
    ? {
      interactionId: negationSettlement.interactionId,
      frameId: negationSettlement.rootFrameId,
      sourceId: negationSettlement.sourceId,
      targetId: negationSettlement.targetId,
      cardKind: negationSettlement.rootCardKind,
    }
    : null;
  const isProvenGroupNegation = isOpenNegationResponse && groupTargetScope?.resolutionSemantics === "GROUP";
  const groupSource = projectGroupSourceForViewer(stage, viewerId, resolvePlayerDisplay);
  const pausedGroupParticipants = groupTargetScope?.resolutionSemantics === "GROUP"
    ? groupTargetScope.players.filter((participant) => participant.status === "PAUSED")
    : [];
  const isProvenGroupChildDamage = Boolean(display.visible
    && stage.stage === "DAMAGE"
    && stage.continuity.relation === "CHILD_FRAME"
    && stage.rootOrigin?.frameId === stage.rootFrameId
    && stage.rootOrigin.stage === "GROUP_RESOLUTION"
    && stage.rootOrigin.effect === stage.groupCardKind
    && stage.rootOrigin.source.id === stage.source.id
    && stage.rootOrigin.source.known
    && stage.source.id
    && stage.source.known
    && stage.groupCardKind
    && groupTargetScope?.resolutionSemantics === "GROUP"
    && stage.rootOrigin.targets.length === groupTargetScope.players.length
    && stage.rootOrigin.targets.every((target, index) => target.id === groupTargetScope.players[index]?.id)
    && pausedGroupParticipants.length === 1
    && pausedGroupParticipants[0]?.id === stage.currentParticipant.id);
  const isProvenGroupComposition = Boolean(groupTargetScope?.resolutionSemantics === "GROUP"
    && stage.groupCardKind
    && stage.source.id
    && stage.source.known
    && (stage.stage === "GROUP_RESOLUTION" || isProvenGroupNegation || isProvenGroupChildDamage));
  const groupNegationNodes = isProvenGroupComposition && isProvenGroupNegation ? reactionChain.negationNodes : [];
  const isProvenOathComposition = Boolean(display.visible
    && stage.stage === "NEGATION"
    && stage.effect === "Oath of the Peach Garden"
    && oathRecipientScope
    && stage.source.id
    && stage.source.known);
  const oathSource = isProvenOathComposition && stage.source.id && stage.source.id !== viewerId
    ? { id: stage.source.id, name: stage.source.name, heroId: resolvePlayerDisplay?.(stage.source.id)?.heroId ?? null }
    : null;
  const oathNegationNodes = isProvenOathComposition && reactionChain.interactionId === stage.interactionId
    ? reactionChain.negationNodes
    : [];
  const isProvenBumperHarvestComposition = Boolean(display.visible
    && bumperHarvestCompositionView
    && stage.bumperHarvestProgress?.semantics === "PROVEN"
    && (stage.stage === "SEQUENTIAL_CHOICE" || stage.stage === "NEGATION"));
  const isProvenSingleTargetNegationWindow = Boolean(isOpenNegationResponse
    && !isProvenGroupComposition && !isProvenOathComposition && !isProvenBumperHarvestComposition
    && reactionChain.visible && reactionChain.interactionId === stage.interactionId && reactionChain.root
    && stage.source.id && stage.source.known
    && stage.originalTargets.length === 1 && stage.activeTargets.length === 1
    && stage.originalTargets[0]?.id && stage.originalTargets[0].known
    && stage.activeTargets[0]?.id === stage.originalTargets[0].id && stage.activeTargets[0].known
    && reactionChain.root.source.id === stage.source.id && reactionChain.root.source.known
    && reactionChain.root.targets.length === 1
    && reactionChain.root.targets[0]?.id === stage.activeTargets[0].id);
  const isProvenSingleTargetNegation = isProvenSingleTargetNegationWindow || settlementMatchesScene;
  const singleTargetNegationRootCard = settlementRootCard ?? stage.reactionChainRootCard;
  const singleTargetNegationRootTarget = settlementRootTarget ?? stage.activeTargets[0] ?? null;
  const singleTargetNegationRootTargetDisplay = singleTargetNegationRootTarget?.id
    ? resolvePlayerDisplay?.(singleTargetNegationRootTarget.id) ?? null
    : null;
  const isProvenSingleTargetNegationRootProof = Boolean(isProvenSingleTargetNegation
    && singleTargetNegationRootCard
    && singleTargetNegationRootCard.interactionId === stage.interactionId
    && singleTargetNegationRootCard.frameId === stage.activeFrameId
    && stage.rootFrameId === stage.activeFrameId
    && stage.continuity.relation === "ROOT_FRAME"
    && singleTargetNegationRootCard.sourceId === stage.source.id
    && singleTargetNegationRootCard.targetId === singleTargetNegationRootTarget?.id
    && (settlementMatchesScene || singleTargetNegationRootCard.cardKind === reactionChain.root?.cardKind));
  const isProvenSingleTargetNegationRoot = Boolean(isProvenSingleTargetNegationRootProof
    && stage.source.id !== viewerId
    && singleTargetNegationRootTarget?.id !== viewerId);
  const singleTargetNegationVisibleNodes = settlementMatchesScene ? [] : reactionChain.negationNodes.slice(-2);
  const isProvenSingleTargetNegationPublicBranch = Boolean(isProvenSingleTargetNegationRootProof
    && !settlementMatchesScene
    && !hasLocalFocus
    && singleTargetNegationVisibleNodes.length > 0
    && singleTargetNegationVisibleNodes.every((node) => node.cardKind === "Negation" && node.actor.id && node.actor.known));
  const isProvenSingleTargetObserverPublicBranch = isProvenSingleTargetNegationPublicBranch && isProvenSingleTargetNegationRoot;
  const isProvenSingleTargetNegationFirstBranch = isProvenSingleTargetNegationPublicBranch && reactionChain.negationNodes.length === 1;
  const isProvenSingleTargetNegationCounterBranch = isProvenSingleTargetNegationPublicBranch && reactionChain.negationNodes.length >= 2;
  const isProvenSingleTargetOpenComposition = Boolean(isProvenSingleTargetNegationRoot
    && !settlementMatchesScene
    && reactionChain.negationNodes.length === 0
    && !hasLocalFocus);
  const standaloneCancelledSettlement = !display.visible && !hasLocalFocus
    && transition?.kind === "INTERACTION_TRANSITION"
    && transition.reason === "INTERACTION_ENDED"
    && transition.previousInteractionId === negationSettlement?.interactionId
    && transition.previousRootFrameId === negationSettlement?.rootFrameId
    && negationSettlement?.outcome === "ROOT_CANCELLED"
    && negationSettlement.sourceId !== viewerId
    && negationSettlement.targetId !== viewerId
    && Object.hasOwn(STAGE_ACTION_CARD_ART, negationSettlement.rootCardKind)
    ? negationSettlement
    : null;
  const standaloneRestoredSettlement = !display.visible && !hasLocalFocus
    && transition?.kind === "INTERACTION_TRANSITION"
    && transition.reason === "INTERACTION_ENDED"
    && transition.previousInteractionId === negationSettlement?.interactionId
    && transition.previousRootFrameId === negationSettlement?.rootFrameId
    && negationSettlement?.outcome === "ROOT_RESTORED"
    && Object.hasOwn(STAGE_ACTION_CARD_ART, negationSettlement.rootCardKind)
    ? negationSettlement
    : null;
  const settlementDisplayIdentity = (playerId: string): SingleTargetNegationParticipantIdentity | null => {
    const player = resolvePlayerDisplay?.(playerId);
    const name = player?.name?.trim() || resolvePlayerName(playerId)?.trim();
    return name ? { id: playerId, name, heroId: player?.heroId ?? null } : null;
  };
  const standaloneSettlementSource = standaloneCancelledSettlement
    ? settlementDisplayIdentity(standaloneCancelledSettlement.sourceId)
    : null;
  const standaloneSettlementTarget = standaloneCancelledSettlement
    ? settlementDisplayIdentity(standaloneCancelledSettlement.targetId)
    : null;
  const isProvenStandaloneCancelledSettlement = Boolean(standaloneCancelledSettlement
    && standaloneSettlementSource && standaloneSettlementTarget);
  const isProvenStandaloneRestoredSettlement = Boolean(standaloneRestoredSettlement);
  const isProvenSingleTargetNegationSettlement = Boolean(isProvenSingleTargetNegationRoot
    && settlementMatchesScene && negationSettlement && !hasLocalFocus);
  const isProvenSingleTargetParticipantCardLane = Boolean(isProvenSingleTargetNegationRootProof
    && !hasLocalFocus
    && (stage.source.id === viewerId || singleTargetNegationRootTarget?.id === viewerId));
  const isProvenSingleTargetParticipantOpen = Boolean(isProvenSingleTargetParticipantCardLane
    && !settlementMatchesScene
    && reactionChain.negationNodes.length === 0);
  const isProvenSingleTargetParticipantSettlement = Boolean(isProvenSingleTargetParticipantCardLane
    && settlementMatchesScene && negationSettlement);
  const standaloneSettlementRootCard = isProvenStandaloneCancelledSettlement && standaloneCancelledSettlement
    ? {
      interactionId: standaloneCancelledSettlement.interactionId,
      frameId: standaloneCancelledSettlement.rootFrameId,
      sourceId: standaloneCancelledSettlement.sourceId,
      targetId: standaloneCancelledSettlement.targetId,
      cardKind: standaloneCancelledSettlement.rootCardKind,
    }
    : null;
  const standaloneRestoredRootCard = isProvenStandaloneRestoredSettlement && standaloneRestoredSettlement
    ? {
      interactionId: standaloneRestoredSettlement.interactionId,
      frameId: standaloneRestoredSettlement.rootFrameId,
      sourceId: standaloneRestoredSettlement.sourceId,
      targetId: standaloneRestoredSettlement.targetId,
      cardKind: standaloneRestoredSettlement.rootCardKind,
    }
    : null;
  const renderedSingleTargetNegationRootCard = singleTargetNegationRootCard ?? standaloneSettlementRootCard ?? standaloneRestoredRootCard;
  const isProvenSingleTargetCausalComposition = isProvenSingleTargetOpenComposition
    || isProvenSingleTargetObserverPublicBranch
    || isProvenSingleTargetNegationSettlement
    || isProvenStandaloneCancelledSettlement;
  const singleTargetNegationRootActive = isProvenSingleTargetNegationSettlement
    || isProvenSingleTargetParticipantSettlement
    ? negationSettlement?.outcome === "ROOT_RESTORED"
    : isProvenSingleTargetOpenComposition || isProvenSingleTargetParticipantOpen || isProvenStandaloneRestoredSettlement;
  const singleTargetNegationRootCancelled = (isProvenSingleTargetCausalComposition || isProvenSingleTargetParticipantCardLane)
    && negationSettlement?.outcome === "ROOT_CANCELLED";
  const singleTargetNegationSettlementOutcome = isProvenSingleTargetCausalComposition || isProvenSingleTargetParticipantCardLane || isProvenStandaloneRestoredSettlement
    ? negationSettlement?.outcome ?? null
    : null;
  const singleTargetNegationSource: SingleTargetNegationParticipantIdentity | null = isProvenStandaloneCancelledSettlement
    ? standaloneSettlementSource
    : isProvenSingleTargetCausalComposition && stage.source.id
      ? { id: stage.source.id, name: stage.source.name, heroId: resolvePlayerDisplay?.(stage.source.id)?.heroId ?? null }
      : null;
  const singleTargetNegationTarget: SingleTargetNegationParticipantIdentity | null = isProvenStandaloneCancelledSettlement
    ? standaloneSettlementTarget
    : isProvenSingleTargetCausalComposition && singleTargetNegationRootTarget?.id
      ? { id: singleTargetNegationRootTarget.id, name: singleTargetNegationRootTarget.name, heroId: singleTargetNegationRootTargetDisplay?.heroId ?? null }
      : null;
  const bumperHarvestNegationNodes = isProvenBumperHarvestComposition && stage.stage === "NEGATION"
    && reactionChain.interactionId === stage.interactionId
    ? reactionChain.negationNodes
    : [];
  const currentParticipantProgress = [...stage.groupParticipantProgress, ...(stage.orderedTargetProgress ?? [])]
    .find((participant) => participant.playerId === stage.currentParticipant.id) ?? null;
  const focusGroupParticipantProgress = currentParticipantProgress?.playerId === heroFocus.primary?.id ? currentParticipantProgress : null;
  const localFocusPlayerId = inspectPlayer?.id ?? localPreviewPlayer?.id;
  const showMediumSource = Boolean(mediumSource && mediumSource.player.id !== localFocusPlayerId && !hasLocalInspect);
  const publicEffectLabel = stage.effect?.trim() || null;
  const groupCurrentEffectLabel = publicEffectLabel ? GROUP_CURRENT_EFFECT_LABELS[publicEffectLabel] ?? null : null;
  const displayEffectLabel = stage.stage === "GROUP_RESOLUTION"
    ? groupCurrentEffectLabel
    : stage.effect === "borrowed_sword_attack" ? "Attack" : publicEffectLabel;
  const duelParticipantIsActive = Boolean(stage.currentParticipant.id
    && stage.activeTargets.some((target) => target.id === stage.currentParticipant.id));
  const hasSingleTargetCurrentEffect = (stage.stage === "ATTACK_RESPONSE" || stage.stage === "NEGATION")
    && stage.activeTargets.length === 1
    && (stage.stage !== "ATTACK_RESPONSE"
      || !stage.currentParticipant.id
      || stage.currentParticipant.id === stage.activeTargets[0]?.id);
  const hasProvenDuelCurrentEffect = stage.stage === "DUEL_EXCHANGE"
    && publicEffectLabel?.toLowerCase() === "duel"
    && duelParticipantIsActive;
  const hasProvenJudgementCurrentEffect = stage.stage === "JUDGEMENT"
    && Boolean(stage.source.id && publicEffectLabel)
    && stage.activeTargets.length === 1
    && Boolean(stage.currentParticipant.id)
    && stage.currentParticipant.id === stage.activeTargets[0]?.id;
  const hasProvenDyingCurrentEffect = stage.stage === "DYING"
    && dyingHandoff.visible
    && Boolean(stage.source.id && publicEffectLabel)
    && stage.activeTargets.length === 1
    && stage.activeTargets[0]?.id === dyingHandoff.dyingPlayer.id;
  const hasProvenGroupCurrentEffect = (stage.stage === "GROUP_RESOLUTION"
    || stage.stage === "NEGATION" && groupTargetScope?.resolutionSemantics === "GROUP")
    && Boolean(groupCurrentEffectLabel && stage.source.id && stage.source.known)
    && Boolean(stage.currentParticipant.id && stage.currentParticipant.known)
    && stage.activeTargets.some((target) => target.id === stage.currentParticipant.id);
  const hasSupportedCurrentEffect = hasSingleTargetCurrentEffect || hasProvenDuelCurrentEffect || hasProvenJudgementCurrentEffect || hasProvenDyingCurrentEffect || hasProvenGroupCurrentEffect;
  const currentEffect = display.visible && displayEffectLabel && hasSupportedCurrentEffect
    ? stage.stage === "DUEL_EXCHANGE" ? "Duel" : displayEffectLabel
    : null;
  const judgementParticipantInDock = Boolean(currentEffect
    && stage.stage === "JUDGEMENT"
    && stage.currentParticipant.id
    && stage.currentParticipant.id === viewerId);
  const judgementSourceAlreadyPresented = Boolean(currentEffect
    && stage.stage === "JUDGEMENT"
    && stage.source.id
    && (stage.source.id === viewerId || stage.source.id === heroFocus.primary?.id));
  const currentEffectConnectsToFocus = Boolean(currentEffect
    && !hasLocalFocus
    && heroFocus.primary?.id
    && stage.activeTargets.some((target) => target.id === heroFocus.primary?.id));
  const connectedCurrentEffectFocusIsVisible = currentEffectConnectsToFocus && heroFocus.visible;
  const decisionActorAlreadyFocused = Boolean(display.decisionActor.id
    && (heroFocus.visible && display.decisionActor.id === heroFocus.primary?.id
      || showMediumSource && display.decisionActor.id === mediumSource?.player.id));
  const reactionDecisionActorAlreadyFocused = Boolean(connectedCurrentEffectFocusIsVisible
    && reactionChain.active?.decisionActor.id
    && reactionChain.active.decisionActor.id === heroFocus.primary?.id);
  const duelSummaryParticipant = currentEffect === "Duel"
    && stage.activeTargets.length === 2
    && stage.source.id
    && stage.activeTargets.some((participant) => participant.id === stage.source.id)
    ? stage.activeTargets.find((participant) => participant.id !== stage.source.id) ?? null
    : null;
  const currentEffectSummary = borrowedSwordForcedAttack
    ? `${stage.rootOrigin!.source.name}'s Borrowed Sword forces ${stage.source.name} to Attack ${stage.activeTargets[0]!.name}.`
    : currentEffect === "Duel"
    ? connectedCurrentEffectFocusIsVisible
      && stage.source.id
      && stage.source.known
      && duelSummaryParticipant?.id
      && duelSummaryParticipant.known
      ? `Duel between ${stage.source.name} and ${duelSummaryParticipant.name} is in progress.`
      : null
    : currentEffect && stage.stage === "GROUP_RESOLUTION"
      ? stage.source.id
        && stage.source.known
        && stage.currentParticipant.id
        && stage.currentParticipant.known
        && (stage.currentParticipant.id === viewerId
          ? !hasLocalFocus
          : connectedCurrentEffectFocusIsVisible && heroFocus.primary?.id === stage.currentParticipant.id)
        ? `${stage.source.name} used ${currentEffect}. It is now resolving for ${stage.currentParticipant.id === viewerId ? "you" : stage.currentParticipant.name}.`
        : null
    : currentEffect && stage.stage === "JUDGEMENT"
      ? !hasLocalFocus && stage.currentParticipant.known
        ? `Judgement for ${stage.currentParticipant.name} is resolving.`
        : null
    : connectedCurrentEffectFocusIsVisible
      && stage.source.id
      && stage.source.known
      && currentEffect
      && heroFocus.primary?.id
      && heroFocus.primary.known
      ? `${stage.source.name} used ${currentEffect} on ${heroFocus.primary.name}.`
      : null;
  const dyingSourceAlreadyVisible = Boolean(dyingHandoff.visible && stage.source.id && (
    mediumSource?.player.id === stage.source.id
    || (heroFocus.primary?.id && heroFocus.primary.id !== stage.source.id && heroFocus.source.id === stage.source.id)
  ));
  const dyingFocusAlreadyVisible = Boolean(dyingHandoff.visible && display.focusTarget.id && (
    heroFocus.primary?.id === display.focusTarget.id
    || dyingHandoff.dyingPlayer.id === display.focusTarget.id
  ));
  const showRoleSummary = display.visible && !isOpenNegationResponse && !judgementParticipantInDock && (hasLocalFocus || !(dyingSourceAlreadyVisible && dyingFocusAlreadyVisible));
  const nonDyingSourceAlreadyVisible = Boolean(!hasLocalFocus && !dyingHandoff.visible && stage.source.id && (
    judgementSourceAlreadyPresented
    || (showMediumSource && mediumSource?.player.id === stage.source.id)
    || (!mediumSource
      && heroFocus.visible
      && heroFocus.primary?.id
      && heroFocus.primary.id !== stage.source.id
      && heroFocus.source.id === stage.source.id)
  ));
  const showSourceSummary = showRoleSummary && !nonDyingSourceAlreadyVisible;
  const focusIdentityAlreadyVisible = !hasLocalFocus && currentEffectConnectsToFocus && Boolean(display.focusTarget.id && (
    (heroFocus.visible && heroFocus.primary?.id === display.focusTarget.id)
    || (showMediumSource && mediumSource?.player.id === display.focusTarget.id)
    || (!showMediumSource && heroFocus.visible && heroFocus.source.id === display.focusTarget.id)
  ));
  const showDecisionSummary = display.showDecision && !isOpenNegationResponse && !decisionActorAlreadyFocused && display.decisionActor.id !== viewerId && !(currentEffect && display.isViewerDecisionActor) && !(dyingHandoff.visible
    && display.decisionActor.id
    && dyingHandoff.decisionActor.id === display.decisionActor.id);
  const showResolverSummary = display.showResolver && !isOpenNegationResponse && !(dyingHandoff.visible
    && display.activeResolver.id
    && dyingHandoff.activeResolver.id === display.activeResolver.id);
  const showNestedContextSummary = Boolean(display.nestedContext)
    && !(heroFocus.visible && heroFocus.primary && heroFocus.nestedContext === display.nestedContext);
  const showFocusSummary = showRoleSummary
    && (!display.currentParticipantPresentedInHeroFocus || hasLocalFocus)
    && display.focusTarget.id !== viewerId
    && !focusIdentityAlreadyVisible;
  const showActiveScopeSummary = showRoleSummary
    && display.currentParticipantPresentedInHeroFocus
    && !(currentEffect && stage.stage === "GROUP_RESOLUTION")
    && Boolean(display.activeScopeSummary);
  const showRoleMetadata = showSourceSummary || showFocusSummary || showActiveScopeSummary;
  const hasMultipleRoleSummaries = showSourceSummary && (showFocusSummary || showActiveScopeSummary);
  const showMetadataContext = !isOpenNegationResponse && (showDecisionSummary
    || showResolverSummary
    || display.showOriginalTargets
    || showNestedContextSummary);
  const showMetadataRegion = showRoleMetadata || showMetadataContext;
  const showViewerDecisionMarker = !isOpenNegationResponse
    && !hasLocalFocus
    && display.isViewerDecisionActor
    && !currentEffect;
  const hideStageArchitecturalChrome = display.visible || hasLocalFocus;
  const playerFacingHeroFocusRole = heroFocus.roleLabel === "SOURCE"
    ? "Source"
    : heroFocus.roleLabel === "CURRENT TARGET" || heroFocus.roleLabel === "CURRENT PARTICIPANT"
      ? "Target"
      : heroFocus.roleLabel === "DYING PLAYER"
        ? "DYING PLAYER"
        : null;
  const singleTargetParticipantIsTarget = isProvenSingleTargetParticipantCardLane
    && singleTargetNegationRootTarget?.id === viewerId;
  const renderedHeroFocus = <HeroFocus view={heroFocus} showSource={!showMediumSource && heroFocus.source.id !== viewerId} previewPlayer={localPreviewPlayer} selectableDetail={focusSelectableDetail} hideArchitecturalLabel={hideStageArchitecturalChrome} roleLabelOverride={hideStageArchitecturalChrome ? playerFacingHeroFocusRole : null} groupParticipantProgress={focusGroupParticipantProgress} judgementInFlight={judgementInFlight} onCloseInspect={onCloseInspect} onHeroInfo={onHeroInfo} onInfoCard={onInfoCard} />;
  if (!display.visible && !hasLocalFocus && !isProvenStandaloneCancelledSettlement && !isProvenStandaloneRestoredSettlement) return null;
  return <section className="interaction-stage" aria-label={isProvenSingleTargetCausalComposition || isProvenSingleTargetParticipantCardLane || isProvenStandaloneRestoredSettlement ? "Interaction Stage" : isOpenNegationResponse ? "Negation Response" : "Interaction Stage"} data-interaction-id={display.visible ? stage.interactionId ?? undefined : standaloneCancelledSettlement?.interactionId ?? standaloneRestoredSettlement?.interactionId} data-checkpoint-id={display.visible ? stage.checkpointId ?? undefined : standaloneCancelledSettlement?.checkpointId ?? standaloneRestoredSettlement?.checkpointId} data-presentation-revision={display.visible ? stage.presentationRevision ?? undefined : standaloneCancelledSettlement?.presentationRevision ?? standaloneRestoredSettlement?.presentationRevision} data-stage={display.visible ? stage.stage ?? undefined : undefined} data-stable-kind={display.visible ? stage.stableKind : undefined} data-continuity={display.visible ? stage.continuity.relation : undefined} data-parent-frame-id={display.visible ? stage.parentFrameId ?? undefined : undefined} data-current-effect={isProvenGroupComposition || isProvenOathComposition || isProvenBumperHarvestComposition || isProvenSingleTargetCausalComposition || isProvenSingleTargetParticipantCardLane || isProvenStandaloneRestoredSettlement ? undefined : currentEffect ?? undefined} data-borrowed-sword-forced-attack={borrowedSwordForcedAttack ? "true" : undefined} data-presentation-transition={display.visible ? transitionKind : "NONE"} data-local-ui-mode={hasLocalInspect ? "INSPECT" : hasLocalPreview ? "PREVIEW" : undefined} data-local-inspect-player-id={inspectPlayer?.id} data-local-preview-player-id={!hasLocalInspect ? localPreviewPlayer?.id : undefined} data-group-negation={isProvenGroupNegation ? "true" : undefined} data-group-composition={isProvenGroupComposition ? "true" : undefined} data-oath-composition={isProvenOathComposition ? "true" : undefined} data-bumper-harvest-composition={isProvenBumperHarvestComposition ? "true" : undefined} data-single-target-negation-composition={isProvenSingleTargetCausalComposition ? "proven" : undefined} data-single-target-negation-participant-lane={isProvenSingleTargetParticipantCardLane ? "proven" : undefined} data-negation-restored-root-card={isProvenStandaloneRestoredSettlement ? "proven" : undefined} data-negation-settlement={singleTargetNegationSettlementOutcome ?? undefined} data-negation-open-composition={isProvenSingleTargetOpenComposition || isProvenSingleTargetParticipantOpen ? "proven" : undefined} data-negation-first-branch-composition={isProvenSingleTargetNegationFirstBranch ? "proven" : undefined} data-negation-counter-branch-composition={isProvenSingleTargetNegationCounterBranch ? "proven" : undefined}>
    {!hasLocalInspect && !isProvenGroupComposition && !isProvenOathComposition && !isProvenBumperHarvestComposition && !isProvenSingleTargetCausalComposition && !isProvenSingleTargetParticipantCardLane && !isProvenStandaloneRestoredSettlement && <header>{!hideStageArchitecturalChrome
      ? <span>INTERACTION STAGE</span>
      : stage.stage === "DYING" && <span className="interaction-stage-visually-hidden">INTERACTION STAGE</span>}<strong>{hasLocalInspect ? `INSPECT · ${inspectPlayer.name}` : hasLocalPreview ? `PREVIEW · ${localPreviewPlayer.name}` : currentEffect && isOpenNegationResponse ? "NEGATION RESPONSE" : currentEffect && stage.stage === "DYING" ? display.focusLabel : currentEffect ? stage.stageLabel : display.focusLabel}</strong>{showViewerDecisionMarker && <em>YOUR DECISION</em>}</header>}
    {!isProvenGroupComposition && !isProvenOathComposition && !isProvenBumperHarvestComposition && !isProvenSingleTargetCausalComposition && !isProvenSingleTargetParticipantCardLane && !isProvenStandaloneRestoredSettlement && currentEffectSummary && <p className="interaction-stage-event-summary" data-stage-event-summary="proven">{currentEffectSummary}</p>}
    {isProvenGroupComposition && groupTargetScope && stage.groupCardKind
      ? <GroupInteractionComposition source={groupSource} rootKind={stage.groupCardKind} rootActive={groupNegationNodes.length === 0} negationNodes={groupNegationNodes} interactionId={reactionChain.interactionId} targetScope={groupTargetScope} />
      : isProvenOathComposition && oathRecipientScope
        ? <OathInteractionComposition source={oathSource} recipients={oathRecipientScope} negationNodes={oathNegationNodes} interactionId={reactionChain.interactionId} />
      : isProvenBumperHarvestComposition && bumperHarvestCompositionView
        ? <BumperHarvestInteractionComposition source={bumperHarvestCompositionView.source} view={bumperHarvestCompositionView} rootActive={bumperHarvestCompositionView.currentParticipantId !== null && bumperHarvestNegationNodes.length === 0} negationNodes={bumperHarvestNegationNodes} interactionId={stage.interactionId} />
      : isProvenSingleTargetCausalComposition && singleTargetNegationSource && singleTargetNegationTarget && renderedSingleTargetNegationRootCard
        ? <div className="interaction-stage-body single-target-negation-body"><div className="interaction-stage-hero-region"><SingleTargetNegationCausalComposition source={singleTargetNegationSource} target={singleTargetNegationTarget} cardKind={renderedSingleTargetNegationRootCard.cardKind} rootActive={singleTargetNegationRootActive} cancelled={singleTargetNegationRootCancelled} negationNodes={isProvenSingleTargetObserverPublicBranch ? reactionChain.negationNodes : []} /></div></div>
      : isProvenStandaloneRestoredSettlement && renderedSingleTargetNegationRootCard
        ? <div className="single-target-negation-restored-settlement" data-restored-root-card="proven"><StageActionCard kind={renderedSingleTargetNegationRootCard.cardKind} active root singleTargetNegationRoot /></div>
      : <div className="interaction-stage-body">
      <div className="interaction-stage-hero-region">
        {showMediumSource && mediumSource && (isProvenSingleTargetNegation
          ? <SingleTargetNegationSource view={mediumSource} />
          : <MediumParticipantCard view={mediumSource} />)}
        {showMediumSource && mediumSource && <span className="medium-participant-arrow" data-medium-source-arrow="true" aria-hidden="true">{topRowMode ? "→" : "↓"}</span>}
        <div className={`interaction-stage-current-effect-flow${currentEffect ? currentEffectConnectsToFocus || singleTargetParticipantIsTarget ? " is-connected" : " is-unlinked" : " is-empty"}${isProvenSingleTargetParticipantCardLane ? " is-negation-participant-lane" : ""}`}>
          {singleTargetParticipantIsTarget && renderedHeroFocus}
          {currentEffect && isProvenSingleTargetParticipantCardLane && renderedSingleTargetNegationRootCard && <SingleTargetNegationParticipantCardHistory cardKind={renderedSingleTargetNegationRootCard.cardKind} rootActive={singleTargetNegationRootActive} cancelled={singleTargetNegationRootCancelled} negationNodes={isProvenSingleTargetNegationPublicBranch ? reactionChain.negationNodes : []} />}
          {currentEffect && !isProvenSingleTargetParticipantCardLane && <section className="interaction-stage-current-effect" role="group" aria-label="Current Effect" data-current-effect-label={currentEffect}><small>{isOpenNegationResponse ? "EFFECT" : "CURRENT EFFECT"}</small><strong>{currentEffect}</strong></section>}
          {(currentEffectConnectsToFocus || singleTargetParticipantIsTarget) && <span className={`current-effect-arrow${topRowMode ? " top-row-arrow" : " side-column-arrow"}`} aria-hidden="true">{topRowMode ? "→" : "↓"}</span>}
          {!singleTargetParticipantIsTarget && renderedHeroFocus}
        </div>
        {groupTargetScope && <GroupTargetScope view={groupTargetScope} />}
      </div>
      <div className="interaction-stage-event-region">
        {dyingHandoff.visible && <section className="dying-handoff" aria-label="Dying Rescue Handoff" data-dying-handoff="proven" data-dying-player-id={dyingHandoff.dyingPlayer.id ?? undefined} data-dying-decision-actor-id={dyingHandoff.decisionActor.id ?? undefined} data-dying-resolver-id={dyingHandoff.activeResolver.id ?? undefined} data-dying-continuity={dyingHandoff.continuity.relation} data-dying-parent-frame-id={dyingHandoff.parentFrameId ?? undefined}>
          <header><span>DYING / RESCUE</span><strong>{dyingHandoff.statusLabel}</strong><small>SERVER-AUTHORIZED HANDOFF</small></header>
          <div className="dying-handoff-grid">
            <span><small>DYING PLAYER</small><b>{dyingHandoff.dyingPlayer.name}</b></span>
            {dyingHandoff.decisionActor.id && <span><small>DECISION</small><b>{dyingHandoff.decisionActor.name}</b></span>}
            {dyingHandoff.activeResolver.id && <span><small>RESOLVER</small><b>{dyingHandoff.activeResolver.name}</b></span>}
          </div>
          <small className="dying-handoff-guidance">{dyingHandoff.guidance}</small>
        </section>}
        {!isProvenBumperHarvestComposition && !isProvenSingleTargetCausalComposition && !isProvenSingleTargetParticipantCardLane && reactionChain.visible && reactionChain.root && reactionChain.active && (!isProvenGroupNegation || reactionChain.negationNodes.length > 0) && <section className={`reaction-chain${isProvenGroupNegation ? " reaction-chain-group" : ""}`} aria-label={isProvenGroupNegation ? "AOE Negation Response" : "Reaction Chain"} data-reaction-chain="proven" data-group-negation={isProvenGroupNegation ? "true" : undefined} data-reaction-interaction-id={reactionChain.interactionId ?? undefined}>
          <header><span>REACTION CHAIN</span></header>
          <ol>
            {!isProvenGroupNegation && <li data-reaction-node="root"><small>{isOpenNegationResponse ? "ORIGINAL EFFECT" : "ROOT EFFECT"}</small><b>{reactionChain.root.effect}</b><span>{reactionChain.root.source.name}{reactionChain.root.targets.length ? ` → ${reactionChain.root.targets.map((target) => target.name).join(", ")}` : ""}</span></li>}
            {reactionChain.negationNodes.map((node, index) => <li data-reaction-node="negation" key={`${node.actor.id ?? "unknown"}-${index}`} aria-label={`${node.actor.name} played ${node.cardKind}`}><small>NEGATION {index + 1}</small><b>{node.cardKind}</b><span>{node.actor.name} played this card.</span></li>)}
            <li data-reaction-node="active" data-reaction-relation={reactionChain.active.relation} data-negation-window-state={isOpenNegationResponse ? "open" : undefined}>
              <small>{isOpenNegationResponse ? "NEGATION WINDOW" : "ACTIVE RESPONSE"}</small>
              {isOpenNegationResponse
                ? <><b data-stage-meta-role="scope">A Negation may be played now.</b><span>Waiting for response...</span></>
                : <><b>{reactionChain.active.label}</b>{reactionChain.active.decisionActor.id && !reactionDecisionActorAlreadyFocused && <span data-stage-meta-role="decision">DECISION · {reactionChain.active.decisionActor.name}</span>}</>}
            </li>
          </ol>
        </section>}
      </div>
      {showMetadataRegion && <div className="interaction-stage-meta-region">
        {!isOpenNegationResponse && showRoleMetadata && <div className={`interaction-stage-focus${hasMultipleRoleSummaries ? "" : " interaction-stage-focus--single"}`}>
          {showSourceSummary && <div data-stage-meta-role="source"><small>SOURCE</small><b>{display.source.name}</b></div>}
          {showFocusSummary && <div data-stage-meta-role={display.focusTarget.id ? "focus" : "scope"}><small>{display.focusTarget.id ? "FOCUS" : "SCOPE"}</small><b>{display.focusTarget.name}</b><em>{display.targetSummary}</em></div>}
          {showActiveScopeSummary && <div data-stage-meta-role="active-scope"><small>ACTIVE SCOPE</small><em>{display.activeScopeSummary}</em></div>}
        </div>}
        {!isOpenNegationResponse && showMetadataContext && <div className="interaction-stage-context">
          {showDecisionSummary && <span data-stage-meta-role="decision"><small>DECISION</small><b>{display.decisionActor.name}</b></span>}
          {showResolverSummary && <span><small>RESOLVER</small><b>{display.activeResolver.name}</b></span>}
          {display.showOriginalTargets && <span><small>ORIGINAL SCOPE</small><b>{display.originalTargetSummary}</b></span>}
          {showNestedContextSummary && <span><small>CONTEXT</small><b>{display.nestedContext}</b></span>}
        </div>}
      </div>}
    </div>}
    {hasLocalInspect && inspectPlayer && <div className="opponent-inspection-layer">
      <div className="opponent-inspection-backdrop" aria-hidden="true" />
      <div className="opponent-inspection-floating-shell">
        <HeroFocus view={heroFocus} inspectPlayer={inspectPlayer} judgementInFlight={judgementInFlight} onCloseInspect={onCloseInspect} onHeroInfo={onHeroInfo} onInfoCard={onInfoCard} />
      </div>
    </div>}
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

function StageSystemCluster({ responseTimer, eventTimer, onLeave }: { responseTimer?: ReactNode; eventTimer?: ReactNode; onLeave: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
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

  return <div className="stage-system-cluster" data-stage-system-cluster="true">
    {responseTimer}
    {eventTimer}
    <div className="stage-system-menu">
      <div id="stage-system-menu-actions" className="stage-system-menu-actions" role="group" aria-label="System menu actions" hidden={!menuOpen}>
        <button type="button" className="stage-system-exit" onClick={confirmExit} onKeyDown={closeMenuOnEscape}>Exit Game</button>
      </div>
      <button ref={menuButtonRef} type="button" className="stage-system-menu-trigger" aria-label="System menu" aria-expanded={menuOpen} aria-controls="stage-system-menu-actions" onClick={() => setMenuOpen((open) => !open)} onKeyDown={closeMenuOnEscape}>☰</button>
    </div>
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
  onHeroInfo: (hero: Hero) => void;
  onInfoCard: (card: Card) => void;
  equipmentSelection?: { eligibleIds: string[]; selectedIds: string[]; max: number; disabled: boolean; onToggle: (cardId: string) => void } | null;
  hiddenCardIds?: ReadonlySet<string>;
  isGroupPreview?: boolean;
};

export function LocalPlayerDock({ player, hero, interactionRoles, guidance, children, heroSkillControl, selfTargetable, selfTargetSelected, onSelfTarget, onHeroInfo, onInfoCard, equipmentSelection = null, hiddenCardIds = new Set(), isGroupPreview = false }: LocalPlayerDockProps) {
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
    {selectable ? <button type="button" className="local-zone-card-button" aria-label={`Select ${cardDefinition(card.kind).name}`} aria-pressed={selected} disabled={!equipmentSelection || equipmentSelection.disabled || !equipmentSelection.eligibleIds.includes(card.id)} onClick={() => equipmentSelection?.onToggle(card.id)} /> : <button type="button" className="local-zone-card-button" aria-label={`Explain ${cardDefinition(card.kind).name}`} onClick={() => onInfoCard(card)} />}
    <button type="button" className="zone-info-button" aria-label={`Explain ${cardDefinition(card.kind).name}`} onClick={(event) => { event.stopPropagation(); onInfoCard(card); }}>i</button>
  </div>;
  return <section className={`local-player-dock${isGroupPreview ? " local-group-preview" : ""}${interactionRoleClasses ? ` ${interactionRoleClasses}` : ""}`} data-player-anchor={player?.id ?? undefined} data-local-group-preview={isGroupPreview ? "true" : undefined} data-interaction-roles={interactionRoleNames || undefined} data-interaction-source={interactionRoles.isInteractionSource ? "true" : undefined} data-interaction-original-target={interactionRoles.isOriginalTarget ? "true" : undefined} data-interaction-active-target={interactionRoles.isActiveTarget ? "true" : undefined} data-interaction-current-participant={interactionRoles.isCurrentParticipant ? "true" : undefined} data-interaction-decision-actor={interactionRoles.isDecisionActor ? "true" : undefined} data-interaction-active-resolver={interactionRoles.isActiveResolver ? "true" : undefined} data-interaction-viewer-decision={interactionRoles.isViewerDecisionActor ? "true" : undefined} aria-label="Your player area">
    {guidance}
    <div className="local-dock-identity">
      <div className="local-hero-anchor">
        {hero ? <>
          <button
            type="button"
            className={`local-hero-card${selfTargetable ? " targetable-target" : ""}${selfTargetSelected ? " selected-target" : ""}`}
            aria-label={selfTargetable ? `Select ${player?.name ?? "your character"}` : `Explain ${hero.name}`}
            aria-pressed={selfTargetable ? selfTargetSelected : undefined}
            onClick={() => selfTargetable ? onSelfTarget() : onHeroInfo(hero)}
          ><span className="local-hero-portrait" data-hero-id={hero.id} aria-hidden="true"><HeroPortrait hero={hero} /><span className="local-hero-overlay"><span className="local-hero-label">{hero.name}</span><span className="local-hero-vitals"><strong className="local-hero-role">{player?.role ?? "Role pending"}</strong><span className="local-hero-hp">HP {player?.hp ?? 0}/{player?.maxHp ?? 0}</span><span className="local-hero-hearts">{hpDisplay(player?.hp ?? null)}</span></span></span></span></button>
          {selfTargetable && <button type="button" className="hero-card-info-button local-hero-info-button" aria-label={`Explain ${hero.name}`} onClick={(event) => { event.stopPropagation(); onHeroInfo(hero); }}>i</button>}
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

export function GameRoom({ room, presentationView, busy, error, onAction, onLeave }: { room: Room; presentationView?: PresentationClientView; busy: boolean; error: string; onAction: (action: GameplayAction, extra?: Record<string, unknown>) => Promise<boolean>; onLeave: () => void }) {
  const initialPendingSequence = pendingTimelineSequence(room);
  const initialHeldCardIds = new Set(initialPendingSequence.flatMap(eventCards).map((item) => item.id));
  const clientPresentation = useMemo(() => presentationView ?? buildPresentationClientView(room.presentationSnapshot ?? null, room.meId), [presentationView, room.presentationSnapshot, room.meId]);
  const skillEffectSettlements = clientPresentation.skillEffectSettlements ?? NO_SKILL_EFFECT_SETTLEMENTS;
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
  const [rootActionOverlayLayoutReadiness, setRootActionOverlayLayoutReadiness] = useState<RootActionOverlayLayoutReadiness>(null);
  const onRootActionOverlayLayoutReadinessChange = useCallback((next: RootActionOverlayLayoutReadiness) => {
    setRootActionOverlayLayoutReadiness((current) => current?.key === next?.key && current?.state === next?.state ? current : next);
  }, []);
  const [effectNotice, setEffectNotice] = useState<string | null>(null);
  const [infoCard, setInfoCard] = useState<Card | null>(null);
  const [infoHero, setInfoHero] = useState<Hero | null>(null);
  const [expandedOpponentId, setExpandedOpponentId] = useState<string | null>(null);
  const [submittedTargetPreview, setSubmittedTargetPreview] = useState<LocalTargetPreviewSubmission | null>(null);
  const automaticResponseTimeout = useRef("");
  const automaticRescueSkip = useRef("");
  const [turnNotice, setTurnNotice] = useState(""); const onActionRef = useRef(onAction);
  const [privateDrawPresentation, setPrivateDrawPresentation] = useState<{ playerId: string; cards: Card[] }>({ playerId: room.meId, cards: [] });
  const privateDrawCards = useMemo(() => privateDrawPresentation.playerId === room.meId ? privateDrawPresentation.cards : [], [privateDrawPresentation, room.meId]);
  const hasInitialDeal = room.timeline.some((event) => event.type === "card" && event.initialDeal && event.drawPlayerId === room.meId);
  const knownHandCards = useRef(baselineHand(room.meId, hasInitialDeal ? [] : room.myHand, hasInitialDeal ? [] : room.timeline));
  const [eventQueue, setEventQueue] = useState<GameEvent[]>([]); const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null); const seenEvents = useRef(new Set((room.timeline ?? []).map((event) => event.id)));
  const [activeSkillEffectSettlement, setActiveSkillEffectSettlement] = useState<{ eventId: string; exiting: boolean } | null>(null);
  const [activeAttackDodgeSettlement, setActiveAttackDodgeSettlement] = useState<ActiveAttackDodgeSettlement | null>(null);
  const attackDodgeSettlementTimerEventId = useRef<string | null>(null);
  // Events already present when the screen mounts have no new animation to
  // wait for. New event IDs enter this set only after their presentation ends.
  const [presentedEventIds, setPresentedEventIds] = useState<Set<string>>(() => new Set((room.timeline ?? []).map((event) => event.id)));
  const [resolutionEvents, setResolutionEvents] = useState<GameEvent[]>(initialPendingSequence);
  const [resolutionClosing, setResolutionClosing] = useState(false);
  const [sequenceScopeStartId, setSequenceScopeStartId] = useState(initialPendingSequence[0]?.id ?? "");
  const resolutionRevision = useRef(0);
  const [visibleDiscardTop, setVisibleDiscardTop] = useState<Card | null>(() => room.discardTop && initialHeldCardIds.has(room.discardTop.id) ? null : room.discardTop);
  const latestDiscardTop = useRef(room.discardTop);
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
  const genericResponse = canUseAction(room.currentAction, "respond");
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
  const activeSkillSelectionBusy = Boolean(presentationBusy && !activeSkillTargetMode);
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
  // profile before their target-card picker appears. Supported §4C effects
  // route from CurrentAction authority alone; Stage Hero Focus is not a second
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
  const pendingTargetCardSelectableSelection: HeroFocusTargetCardSelection | null = pendingTargetCardProjection
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
  const responseReadyAfterEventId = room.currentAction?.presentation?.readyAfterEventId ?? null;
  const responseBarrierEvent = responseReadyAfterEventId ? room.timeline.find((event) => event.id === responseReadyAfterEventId) : null;
  const responsePresentationReady = !responseReadyAfterEventId
    || responseBarrierEvent?.type === "message"
    || responseBarrierEvent?.importance === "informational"
    || presentedEventIds.has(responseReadyAfterEventId);
  const responseDecisionReady = (canRespond || triggerResponse) && responsePresentationReady;
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
  const responseCardSelectionActive = Boolean(responseDecisionReady && (canRespond || triggerResponse) || dyingFirstAidSelectionActive);
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
      const max = activeSkillSelection?.targetMax ?? activeSkillTargetSelection?.max ?? 1;
      setActiveSkillSelectionState((state) => {
        if (!state) return state;
        const current = state.targetIds.filter((id) => activeSkillTargetIds.includes(id));
        const next = max > 1
          ? current.includes(playerId) ? current.filter((id) => id !== playerId) : current.length < max ? [...current, playerId] : current
          : [playerId];
        return { ...state, targetIds: next };
      });
      setTargetIds((current) => max > 1 ? current.includes(playerId) ? current.filter((id) => id !== playerId) : current.length < max ? [...current, playerId] : current : [playerId]);
      return;
    }
    setTargetIds((ids) => activeSkillTargetIds.length ? [playerId] : halberdAttack ? ids.includes(playerId) ? ids.filter((id) => id !== playerId) : ids.length < 3 ? [...ids, playerId] : ids : [playerId]);
  };
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
    if (busy || presentationBusy) return;
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
    if (!localTargetSelection.selectionActive || !localTargetFlow || busy || presentationBusy) return;
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
          // Target skills have an explicit local Cancel surface once a target
          // is selected. Do not make a second click on the skill itself an
          // ambiguous second cancellation of that local choice.
          if (!activating && option.selection?.type === "target") return;
          if (!activating && (option.selection?.type === "cards" || option.selection?.type === "target")) resetLocalTargetFlow("active-skill");
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
  useEffect(() => { latestDiscardTop.current = room.discardTop; }, [room.discardTop]);
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
      setInfoCard(null); setTriggerSelectedKeys([]);
      return;
    }
    if (result.drawn.length) setPrivateDrawPresentation({ playerId: room.meId, cards: result.drawn });
  }, [room.meId, room.myHand, room.timeline]);
  useEffect(() => {
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
    const effect = fresh.find((event) => event.type === "message" && event.effectNotice);
    if (effect?.type === "message") {
      setEffectNotice(effect.message);
      const timer = setTimeout(() => setEffectNotice((current) => current === effect.message ? null : current), UI_TIMING.effectNotice);
      void timer;
    }
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
  }, [room.timeline, timelineKey, optimisticPlay, activeEvent, eventQueue.length, skillEffectSettlements]);
  useEffect(() => { if (!optimisticPlay) return; const timer = setTimeout(() => setOptimisticPlay(null), UI_TIMING.playedCard); return () => clearTimeout(timer); }, [optimisticPlay]);
  useEffect(() => { if (!livePendingStartId || livePendingStartId === sequenceScopeStartId) return; const timer = setTimeout(() => setSequenceScopeStartId(livePendingStartId), 0); return () => clearTimeout(timer); }, [livePendingStartId, sequenceScopeStartId]);
  useEffect(() => { if (!harvestSubmitting || room.pendingHarvest?.actorId === harvestSubmitting.playerId && !room.pendingHarvest.choices.some((choice) => choice.cardId === harvestSubmitting.cardId && choice.playerId === harvestSubmitting.playerId)) return; const timer = setTimeout(() => setHarvestSubmitting(null), 0); return () => clearTimeout(timer); }, [harvestSubmitting, room.pendingHarvest]);
  useEffect(() => { const turnKey = `${room.turnSeat}-${lastTimelineId}`; if (room.status !== "playing" || !room.phase?.startsWith("draw") || !canUseAction(room.currentAction, "draw") || activeEvent || eventQueue.length || hasUnseenPresentations || privateDrawCards.length || automaticDraw.current === turnKey) return; const noticeTimer = setTimeout(() => setTurnNotice(`${current?.name ?? "Player"}'s turn`), 0); const drawTimer = setTimeout(() => { setTurnNotice(""); if (room.isMyTurn && automaticDraw.current !== turnKey && canUseAction(room.currentAction, "draw")) { automaticDraw.current = turnKey; onActionRef.current("draw"); } }, UI_TIMING.turnDrawStart); return () => { clearTimeout(noticeTimer); clearTimeout(drawTimer); }; }, [room.turnSeat, room.phase, room.status, room.isMyTurn, room.currentAction, current?.name, lastTimelineId, hasUnseenPresentations, activeEvent, eventQueue.length, privateDrawCards.length]);
  useEffect(() => { if (optimisticPlay || activeEvent || !eventQueue.length) return; const timer = setTimeout(() => { const next = eventQueue[0]; setActiveEvent(next); if (retainsAtPlayer(next)) setResolutionEvents((events) => appendUniqueEvents(events, [next])); setEventQueue((queue) => queue.slice(1)); }, 0); return () => clearTimeout(timer); }, [optimisticPlay, activeEvent, eventQueue]);
  useEffect(() => { if (!activeEvent) return; const displayTime = activeEvent.type === "card" || activeEvent.type === "cards" ? isJudgementReveal(activeEvent) ? UI_TIMING.judgementCard : UI_TIMING.playedCard : 0; const timer = setTimeout(() => { if (movesDirectlyToDiscard(activeEvent)) setVisibleDiscardTop(latestDiscardTop.current); setPresentedEventIds((ids) => ids.has(activeEvent.id) ? ids : new Set([...ids, activeEvent.id])); setActiveEvent(null); }, displayTime); return () => clearTimeout(timer); }, [activeEvent]);
  useEffect(() => { const resolutionPending = room.phase === "response" || room.phase === "dying" || room.phase === "resolving"; if (optimisticPlay || activeEvent || eventQueue.length || hasUnseenPresentations || resolutionPending || resolutionClosing || !resolutionEvents.length) return; const timer = setTimeout(() => setResolutionClosing(true), 0); return () => clearTimeout(timer); }, [optimisticPlay, activeEvent, eventQueue.length, hasUnseenPresentations, room.phase, resolutionClosing, resolutionEvents.length]);
  useEffect(() => { if (!resolutionClosing) return; const closingRevision = resolutionRevision.current; const timer = setTimeout(() => { if (resolutionRevision.current !== closingRevision) { setResolutionClosing(false); return; } setResolutionEvents([]); setSequenceScopeStartId(""); setResolutionClosing(false); }, UI_TIMING.sequenceDiscard); return () => clearTimeout(timer); }, [resolutionClosing]);
  useEffect(() => { const resolutionPending = room.phase === "response" || room.phase === "dying" || room.phase === "resolving"; if (sequenceEvents.length || optimisticPlay || activeEvent || eventQueue.length || hasUnseenPresentations || resolutionPending || resolutionClosing) return; const timer = setTimeout(() => setVisibleDiscardTop(room.discardTop), 0); return () => clearTimeout(timer); }, [room.discardTop, room.phase, sequenceEvents.length, optimisticPlay, activeEvent, eventQueue.length, hasUnseenPresentations, resolutionClosing]);
  useEffect(() => { if (!privateDrawCards.length || activeEvent || eventQueue.length) return; const timer = setTimeout(() => setPrivateDrawPresentation({ playerId: room.meId, cards: [] }), UI_TIMING.privateDraw); return () => clearTimeout(timer); }, [privateDrawCards, room.meId, activeEvent, eventQueue.length]);
  useEffect(() => { if (!infoCard && !infoHero && !expandedOpponentId) return; const close = (event: KeyboardEvent) => { if (event.key !== "Escape") return; if (infoCard || infoHero) { setInfoCard(null); setInfoHero(null); return; } setExpandedOpponentId(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [infoCard, infoHero, expandedOpponentId]);
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
    const presentImmediately = Boolean(optimisticEvent && !optimisticPlay && !activeEvent && eventQueue.length === 0);
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
  const currentActionOwnedByViewer = Boolean(room.currentAction?.actorId === room.meId && room.isMyAction && room.currentAction.kind !== "none");
  const targetCardPickerSelectedKeys = targetCardPickerSelection
    ? triggerSelectedKeys.filter((key) => targetCardPickerSelection.eligibleKeys.includes(key))
    : [];
  const targetCardPickerSelectionComplete = Boolean(targetCardPickerSelection
    && targetCardPickerSelectedKeys.length >= targetCardPickerSelection.min
    && targetCardPickerSelectedKeys.length <= targetCardPickerSelection.max);
  const targetCardPickerInHeroFocus = Boolean(
    !targetCardPickerUsesUnifiedModal
    && triggerResponse
    && responseDecisionReady
    && targetCardPickerOption
    && targetCardPickerSelection
    && targetCardPickerTarget
    && targetCardPickerTarget.id === targetCardPickerSelection.targetId
    && supportsAuthoritativeTargetCardSelection(targetCardPickerSelection, targetCardPickerTarget)
    && !targetPreviewPresentation
    && !opponentInspectionPresentation
    && hasProvenExternalHeroFocusTarget(clientPresentation, room.meId, targetCardPickerSelection.targetId, room.players),
  );
  const targetCardPickerInLocalDock = Boolean(
    triggerResponse
    && responseDecisionReady
    && canUseAction(room.currentAction, "trigger")
    && targetCardPickerOption
    && targetCardPickerSelection
    && targetCardPickerTarget
    && targetCardPickerSelection.targetId === room.meId
    && targetCardPickerTarget.id === room.meId
    && supportsLocalEquipmentSelectableDetail(targetCardPickerSelection, targetCardPickerTarget)
    && !targetPreviewPresentation
    && !opponentInspectionPresentation,
  );
  const targetCardPickerSelectableDetail: TargetCardSelectableDetail | null = targetCardPickerInHeroFocus && targetCardPickerOption && targetCardPickerSelection && targetCardPickerTarget
    ? {
      label: targetCardPickerOption.label,
      selection: targetCardPickerSelection,
      target: targetCardPickerTarget,
      selectedKeys: targetCardPickerSelectedKeys,
      disabled: responseControlsDisabled,
      onToggle: (key) => setTriggerSelectedKeys((keys) => {
        const validKeys = keys.filter((selectedKey) => targetCardPickerSelection.eligibleKeys.includes(selectedKey));
        return validKeys.includes(key) ? validKeys.filter((selectedKey) => selectedKey !== key) : validKeys.length < targetCardPickerSelection.max ? [...validKeys, key] : validKeys;
      }),
    }
    : null;
  const attackDodgeResponseCandidates = (clientPresentation.attackDodgeResponses ?? []).flatMap((proof) => {
    const rootEvents = room.timeline.filter((event) => event.id === proof.rootEventId);
    const responseEvents = room.timeline.filter((event) => event.id === proof.responseEventId);
    const rootSequenceEvents = sequenceEvents.filter((event) => event.id === proof.rootEventId);
    const responseSequenceEvents = sequenceEvents.filter((event) => event.id === proof.responseEventId);
    if (rootEvents.length !== 1 || responseEvents.length !== 1 || rootSequenceEvents.length !== 1 || responseSequenceEvents.length !== 1) return [];
    const rootEvent = rootEvents[0];
    const responseEvent = responseEvents[0];
    if (rootEvent.type !== "card" || responseEvent.type !== "card"
      || rootEvent.action !== "play" || responseEvent.action !== "play"
      || rootEvent.presentation === false || responseEvent.presentation === false
      || rootEvent.playedAs !== undefined || responseEvent.playedAs !== undefined
      || rootEvent.card.kind !== "Attack" || responseEvent.card.kind !== "Dodge"
      || rootEvent.resolutionId !== proof.rootResolutionId || responseEvent.resolutionId !== proof.responseResolutionId
      || proof.responseActorId !== proof.targetId) return [];
    return [{ proof, rootEvent, responseEvent }];
  });
  const attackDodgeResponseCandidate = attackDodgeResponseCandidates.length === 1 ? attackDodgeResponseCandidates[0] : null;
  const attackDodgeGraphCandidate = activeAttackDodgeSettlement?.phase === "complete"
    && attackDodgeResponseCandidate?.proof.responseEventId === activeAttackDodgeSettlement.eventId
    ? null
    : attackDodgeResponseCandidate;
  const duelExchangeGraphCandidate = (() => {
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
    const response = exchange.responses.at(-1) ?? null;
    if (!response) return { exchange, rootEvent, source, target, response: null, responseEvent: null, responseActor: null, decisionActor: null, responseTarget: null };
    if (response.ordinal !== exchange.responseCount || response.relation !== "DUEL_EXCHANGE"
      || response.rootEventId !== exchange.root.eventId || response.rootResolutionId !== exchange.root.resolutionId
      || response.rootSourceId !== exchange.root.sourceId || response.rootTargetId !== exchange.root.targetId
      || response.responseCardKind !== "Attack" || response.sourceId !== response.decisionActorId
      || response.sourceId === response.targetId
      || ![exchange.root.sourceId, exchange.root.targetId].includes(response.sourceId)
      || ![exchange.root.sourceId, exchange.root.targetId].includes(response.targetId)) return null;
    const responseMatches = room.timeline.filter((event) => event.id === response.responseEventId);
    if (responseMatches.length !== 1) return null;
    const responseEvent = responseMatches[0];
    const eventProof = responseEvent.type === "card" ? responseEvent.duelAttackResponse : undefined;
    if (responseEvent.type !== "card" || responseEvent.action !== "play" || responseEvent.presentation === false
      || responseEvent.resolutionId !== response.responseResolutionId
      || responseEvent.card.kind !== "Attack" && responseEvent.playedAs?.toLowerCase() !== "attack"
      || !eventProof || eventProof.interactionId !== exchange.interactionId
      || eventProof.rootFrameId !== exchange.rootFrameId || eventProof.rootEventId !== exchange.root.eventId
      || eventProof.rootResolutionId !== exchange.root.resolutionId
      || eventProof.rootSourceId !== exchange.root.sourceId || eventProof.rootTargetId !== exchange.root.targetId
      || eventProof.ordinal !== response.ordinal || eventProof.sourceId !== response.sourceId
      || eventProof.targetId !== response.targetId || eventProof.decisionActorId !== response.decisionActorId
      || eventProof.responseActorId !== response.responseActorId || eventProof.responseCardKind !== "Attack") return null;
    const responseActor = room.players.find((player) => player.id === response.responseActorId);
    const decisionActor = room.players.find((player) => player.id === response.decisionActorId);
    const responseTarget = room.players.find((player) => player.id === response.targetId);
    if (!responseActor?.name || !decisionActor?.name || !responseTarget?.name) return null;
    return { exchange, rootEvent, source, target, response, responseEvent, responseActor, decisionActor, responseTarget };
  })();
  const singleTargetNegationGraphCandidates = (() => {
    const negationStage = buildInteractionStageView(clientPresentation, (playerId) => room.players.find((player) => player.id === playerId)?.name ?? null);
    const chain = buildReactionChainView(negationStage);
    const root = chain?.root;
    const links = chain?.publicEventLinks;
    if (!chain?.visible || !root || !links || !chain.interactionId || !root.cardKind
      || !root.source.id || root.targets.length !== 1 || !root.targets[0]?.id
      || chain.negationNodes.length !== links.nodes.length) return [];
    const expectedRootEffectState = chain.negationNodes.length % 2 === 0 ? "ACTIVE" : "BLOCKED";
    if (chain.rootEffectState !== expectedRootEffectState) return [];
    const rootEvents = room.timeline.filter((event) => event.id === links.root.eventId);
    if (rootEvents.length !== 1) return [];
    const rootEvent = rootEvents[0];
    if (rootEvent.type !== "card" || rootEvent.action !== "play" || rootEvent.presentation === false
      || rootEvent.playedAs !== undefined || rootEvent.card?.kind !== root.cardKind
      || rootEvent.resolutionId !== links.root.resolutionId) return [];
    const responseNodes = chain.negationNodes.flatMap((node, index) => {
      const responseLink = links.nodes[index];
      const expectedCounterTarget = index === 0
        ? node.counterTarget?.kind === "ROOT"
        : node.counterTarget?.kind === "NEGATION_NODE" && node.counterTarget.index === index - 1;
      const responseEvents = responseLink ? room.timeline.filter((event) => event.id === responseLink.eventId) : [];
      const responseEvent = responseEvents.length === 1 ? responseEvents[0] : null;
      if (!responseLink || !expectedCounterTarget || !node.actor.id || !responseEvent
        || responseEvent.type !== "card" || responseEvent.action !== "play" || responseEvent.presentation === false
        || responseEvent.playedAs !== undefined || responseEvent.card?.kind !== "Negation"
        || responseEvent.resolutionId !== responseLink.resolutionId) return [];
      return [{ node, event: responseEvent }];
    });
    if (responseNodes.length !== chain.negationNodes.length) return [];
    return [{ chain, root, rootEvent, responseNodes }];
  })();
  const singleTargetNegationGraphCandidate = singleTargetNegationGraphCandidates.length === 1
    ? singleTargetNegationGraphCandidates[0]
    : null;
  const oathSimultaneousRootGraphCandidate = (() => {
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
      || rootEvent.resolutionId !== scope.rootResolutionId) return null;
    const source = room.players.find((player) => player.id === scope.sourceId);
    if (!source?.name) return null;
    const recipients = scope.recipientIds.map((playerId) => {
      const player = room.players.find((candidate) => candidate.id === playerId);
      return player?.name ? { playerId, playerName: player.name } : null;
    });
    if (recipients.some((recipient) => recipient === null)) return null;
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
        || event.resolutionId === scope.rootResolutionId
        || chain.publicNodeEventLinks?.slice(0, index).some((previous) => previous.eventId === event.id || previous.resolutionId === event.resolutionId)) return null;
      return {
        index,
        eventId: event.id,
        actorId: actor.id,
        actorName: actor.name,
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
  const bumperHarvestRootGraphCandidate = (() => {
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
    if (!source?.name) return null;
    const targets = progress.participants.map((participant) => {
      const player = room.players.find((candidate) => candidate.id === participant.playerId);
      return player?.name ? { ...participant, playerName: player.name } : null;
    });
    if (targets.some((target) => target === null)) return null;

    let responses: { index: number; eventId: string; actorId: string; actorName: string; cardLabel: string; ariaLabel: string; counterTarget: { kind: "ORDERED_TARGET_EFFECT"; targetId: string } | { kind: "RESPONSE"; index: number } }[] = [];
    if (isNegationScene) {
      const chain = clientPresentation.reactionChain;
      if (!chain || chain.semantics !== "PROVEN" || chain.rootCard !== null
        || chain.interactionId !== progress.interactionId || chain.frameId !== progress.activeFrameId
        || !Array.isArray(chain.nodes) || !Array.isArray(chain.publicNodeEventLinks)
        || chain.publicNodeEventLinks.length !== chain.nodes.length
        || progress.currentEffectState !== (chain.nodes.length % 2 === 0 ? "ACTIVE" : "BLOCKED")) return null;
      const mapped = chain.nodes.map((node, index) => {
        const link = chain.publicNodeEventLinks?.[index];
        const matches = link ? room.timeline.filter((event) => event.id === link.eventId) : [];
        const event = matches.length === 1 ? matches[0] : null;
        const actor = room.players.find((player) => player.id === node.actorId);
        const previousNodeId = index === 0 ? null : chain.nodes[index - 1]?.nodeId;
        if (!link || link.nodeId !== node.nodeId || node.frameId !== progress.activeFrameId
          || node.causedByNodeId !== previousNodeId || !event || !actor?.name
          || event.type !== "card" || event.action !== "play" || event.presentation === false
          || event.playedAs !== undefined || event.card?.kind !== "Negation"
          || !link.eventId || !link.resolutionId || event.id === rootEvent.id
          || event.resolutionId !== link.resolutionId
          || chain.publicNodeEventLinks?.slice(0, index).some((previous) => previous.eventId === event.id || previous.resolutionId === event.resolutionId)) return null;
        return {
          index,
          eventId: event.id,
          actorId: actor.id,
          actorName: actor.name,
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
  const groupTargetBranchGraphCandidate = (() => {
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

    // The group projection proves source, target set and participant state.
    // The compatibility rootContext contributes only a timeline identity; it
    // is accepted only when that exact public event is the played physical
    // root card named by the independently validated Group projection.
    const rootEventId = room.presentationV2?.rootContext?.eventId;
    if (!rootEventId) return null;
    const rootEvents = room.timeline.filter((event) => event.id === rootEventId);
    if (rootEvents.length !== 1) return null;
    const rootEvent = rootEvents[0];
    if (rootEvent.type !== "card" || rootEvent.action !== "play" || rootEvent.presentation === false
      || rootEvent.playedAs !== undefined || rootEvent.card.kind !== group.cardKind) return null;
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
      if (!node.eventId || !node.resolutionId || !actor?.name || !expectedCounterTarget || !event
        || event.type !== "card" || event.action !== "play" || event.presentation === false
        || event.playedAs !== undefined || event.card?.kind !== "Negation"
        || event.resolutionId !== node.resolutionId || event.player !== actor.name) return null;
      return {
        index,
        eventId: node.eventId,
        actorId: actor.id,
        actorName: actor.name,
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
    if (!source?.name) return null;
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
  const rootAction = clientPresentation.rootAction;
  const rootActionName = rootAction?.action === "ATTACK" ? "Attack"
    : rootAction?.cardKind === "Dismantle" ? "Burning Bridge"
      : rootAction ? cardDefinition(rootAction.cardKind).name : null;
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
  const rootActionEvent = rootAction ? room.timeline.find((event) => event.id === rootAction.rootEventId)
    : oathSimultaneousRootGraphCandidate?.rootEvent ?? bumperHarvestRootGraphCandidate?.rootEvent ?? groupTargetBranchGraphCandidate?.rootEvent ?? skillEffectActionCandidate?.rootEvent ?? skillEffectSettlementCandidate?.rootEvent ?? duelExchangeGraphCandidate?.rootEvent ?? attackDodgeGraphCandidate?.rootEvent ?? singleTargetNegationGraphCandidate?.rootEvent ?? null;
  const selfTargetCandidates = rootAction || oathSimultaneousRootGraphCandidate || bumperHarvestRootGraphCandidate || groupTargetBranchGraphCandidate || skillEffectActionCandidate || duelExchangeGraphCandidate || attackDodgeGraphCandidate || singleTargetNegationGraphCandidate ? [] : (clientPresentation.selfTargetActions ?? []).flatMap((action) => {
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
  const rootActionOverlayAction: InteractionRootOverlayAction | null = oathSimultaneousRootGraphCandidate
    ? {
      key: ["oath", oathSimultaneousRootGraphCandidate.scope.interactionId, oathSimultaneousRootGraphCandidate.scope.rootFrameId, oathSimultaneousRootGraphCandidate.rootEvent.id].join(":"),
      rootEventId: oathSimultaneousRootGraphCandidate.rootEvent.id,
      rootPlacementKey: ["oath-root", oathSimultaneousRootGraphCandidate.scope.interactionId, oathSimultaneousRootGraphCandidate.scope.rootFrameId, oathSimultaneousRootGraphCandidate.rootEvent.id].join(":"),
      sourceId: oathSimultaneousRootGraphCandidate.scope.sourceId,
      targetId: null,
      simultaneousTargets: oathSimultaneousRootGraphCandidate.recipients,
      cardKind: "Oath",
      cardLabel: cardDefinition("Oath").name.toUpperCase(),
      ariaLabel: `${oathSimultaneousRootGraphCandidate.source.name} played Oath of the Peach Garden. Simultaneous recovery recipients: ${oathSimultaneousRootGraphCandidate.recipients.map((target) => target.playerName).join(", ")}.`,
      mode: "simultaneous",
      compactRoot: true,
      rootEffectState: oathSimultaneousRootGraphCandidate.scope.effectState,
      ...(oathSimultaneousRootGraphCandidate.responses.length ? { responses: oathSimultaneousRootGraphCandidate.responses } : {}),
    }
    : bumperHarvestRootGraphCandidate
    ? {
      key: ["bumper-harvest", bumperHarvestRootGraphCandidate.progress.interactionId, bumperHarvestRootGraphCandidate.progress.rootFrameId, bumperHarvestRootGraphCandidate.rootEvent.id].join(":"),
      rootEventId: bumperHarvestRootGraphCandidate.rootEvent.id,
      rootPlacementKey: ["bumper-harvest-root", bumperHarvestRootGraphCandidate.progress.interactionId, bumperHarvestRootGraphCandidate.progress.rootFrameId, bumperHarvestRootGraphCandidate.rootEvent.id].join(":"),
      sourceId: bumperHarvestRootGraphCandidate.progress.sourceId,
      targetId: null,
      orderedTargets: bumperHarvestRootGraphCandidate.targets,
      ...(bumperHarvestRootGraphCandidate.progress.currentEffectState ? {
        orderedTargetEffectState: {
          targetId: bumperHarvestRootGraphCandidate.progress.currentParticipantId!,
          state: bumperHarvestRootGraphCandidate.progress.currentEffectState,
        },
        responses: bumperHarvestRootGraphCandidate.responses,
      } : {}),
      cardKind: "BumperHarvest",
      cardLabel: cardDefinition("BumperHarvest").name.toUpperCase(),
      ariaLabel: `${bumperHarvestRootGraphCandidate.source.name} played Bumper Harvest. ${bumperHarvestRootGraphCandidate.targets.map((target) => `${target.order}. ${target.playerName}: ${target.status}${target.outcome ? `, ${target.outcome}` : ""}`).join(". ")}`,
      mode: "targeted",
      compactRoot: true,
    }
    : groupTargetBranchGraphCandidate
    ? {
      key: ["group", groupTargetBranchGraphCandidate.group.interactionId, groupTargetBranchGraphCandidate.group.groupFrameId, groupTargetBranchGraphCandidate.rootEvent.id].join(":"),
      rootEventId: groupTargetBranchGraphCandidate.rootEvent.id,
      rootPlacementKey: ["group-root", groupTargetBranchGraphCandidate.group.interactionId, groupTargetBranchGraphCandidate.group.groupFrameId, groupTargetBranchGraphCandidate.rootEvent.id].join(":"),
      sourceId: clientPresentation.sourceId!,
      targetId: groupTargetBranchGraphCandidate.targets[0].playerId,
      groupTargets: groupTargetBranchGraphCandidate.targets,
      ...(groupTargetBranchGraphCandidate.groupTargetEffectScope ? {
        groupTargetEffectState: {
          targetId: groupTargetBranchGraphCandidate.groupTargetEffectScope.targetId,
          state: groupTargetBranchGraphCandidate.groupTargetEffectScope.effectState,
        },
        responses: groupTargetBranchGraphCandidate.responses,
      } : {}),
      cardKind: groupTargetBranchGraphCandidate.group.cardKind,
      cardLabel: cardDefinition(groupTargetBranchGraphCandidate.group.cardKind).name.toUpperCase(),
      ariaLabel: `${groupTargetBranchGraphCandidate.source.name} played ${cardDefinition(groupTargetBranchGraphCandidate.group.cardKind).name}. ${groupTargetBranchGraphCandidate.targets.map((target) => `${target.playerName}: ${groupParticipantStatusLabel(target.status)}${target.outcome ? `, ${groupParticipantOutcomeLabel(target.outcome)}` : ""}`).join(". ")}`,
      mode: "targeted",
      compactRoot: true,
    }
    : skillEffectActionCandidate
    ? {
      key: ["effect", skillEffectActionCandidate.action.effectId, skillEffectActionCandidate.action.rootEventId, skillEffectActionCandidate.action.sourceId, skillEffectActionCandidate.action.targetId].join(":"),
      rootPlacementKey: ["effect-root", skillEffectActionCandidate.action.rootEventId].join(":"),
      rootEventId: skillEffectActionCandidate.action.rootEventId,
      sourceId: skillEffectActionCandidate.action.sourceId,
      targetId: skillEffectActionCandidate.action.targetId,
      nodeType: "EFFECT",
      effectId: skillEffectActionCandidate.action.effectId,
      cardLabel: "SOWING DISTRUST",
      ariaLabel: `${skillEffectActionCandidate.source.name} used Sowing Distrust targeting ${skillEffectActionCandidate.target.name}`,
      mode: "targeted",
      compactRoot: true,
    }
    : skillEffectSettlementCandidate
    ? {
      key: ["effect", skillEffectSettlementCandidate.action.effectId, skillEffectSettlementCandidate.action.rootEventId, skillEffectSettlementCandidate.action.sourceId, skillEffectSettlementCandidate.action.targetId, "settled", skillEffectSettlementCandidate.action.eventId].join(":"),
      rootPlacementKey: ["effect-root", skillEffectSettlementCandidate.action.rootEventId].join(":"),
      rootEventId: skillEffectSettlementCandidate.action.rootEventId,
      sourceId: skillEffectSettlementCandidate.action.sourceId,
      targetId: skillEffectSettlementCandidate.action.targetId,
      nodeType: "EFFECT",
      effectId: skillEffectSettlementCandidate.action.effectId,
      cardLabel: "SOWING DISTRUST",
      ariaLabel: `${skillEffectSettlementCandidate.source.name} used Sowing Distrust targeting ${skillEffectSettlementCandidate.target.name}. Resolved: ${skillEffectSettlementCandidate.action.outcome === "SUITS_MATCHED" ? "suits matched" : "suits differed"}`,
      mode: "targeted",
      compactRoot: true,
      settlement: { eventId: skillEffectSettlementCandidate.action.eventId, outcome: skillEffectSettlementCandidate.action.outcome, exiting: skillEffectSettlementCandidate.exiting },
    }
    : duelExchangeGraphCandidate
    ? {
      key: ["duel", duelExchangeGraphCandidate.exchange.interactionId, duelExchangeGraphCandidate.exchange.rootFrameId, duelExchangeGraphCandidate.exchange.root.eventId, duelExchangeGraphCandidate.exchange.root.sourceId, duelExchangeGraphCandidate.exchange.root.targetId].join(":"),
      rootEventId: duelExchangeGraphCandidate.exchange.root.eventId,
      sourceId: duelExchangeGraphCandidate.exchange.root.sourceId,
      targetId: duelExchangeGraphCandidate.exchange.root.targetId,
      cardKind: "Duel",
      cardLabel: "DUEL",
      ariaLabel: `${duelExchangeGraphCandidate.source.name} played Duel targeting ${duelExchangeGraphCandidate.target.name}`,
      mode: "targeted",
      compactRoot: true,
      ...(duelExchangeGraphCandidate.response && duelExchangeGraphCandidate.responseEvent && duelExchangeGraphCandidate.responseActor && duelExchangeGraphCandidate.decisionActor && duelExchangeGraphCandidate.responseTarget ? {
        response: {
          eventId: duelExchangeGraphCandidate.response.responseEventId,
          actorId: duelExchangeGraphCandidate.response.responseActorId,
          actorName: duelExchangeGraphCandidate.responseActor.name,
          decisionActorId: duelExchangeGraphCandidate.response.decisionActorId,
          targetId: duelExchangeGraphCandidate.response.targetId,
          cardLabel: "ATTACK",
          ariaLabel: duelExchangeGraphCandidate.response.responseActorId === duelExchangeGraphCandidate.response.decisionActorId
            ? `${duelExchangeGraphCandidate.responseActor.name} played Attack targeting ${duelExchangeGraphCandidate.responseTarget.name} in ${duelExchangeGraphCandidate.source.name}'s Duel against ${duelExchangeGraphCandidate.target.name}`
            : `${duelExchangeGraphCandidate.responseActor.name} provided Attack for ${duelExchangeGraphCandidate.decisionActor.name}, targeting ${duelExchangeGraphCandidate.responseTarget.name}, in ${duelExchangeGraphCandidate.source.name}'s Duel against ${duelExchangeGraphCandidate.target.name}`,
        },
      } : {}),
    }
    : rootAction
    ? {
      key: interactionRootActionKey(rootAction),
      rootEventId: rootAction.rootEventId,
      sourceId: rootAction.sourceId,
      targetId: rootAction.targetId,
      cardKind: rootAction.cardKind,
      cardLabel: rootActionName?.toUpperCase() ?? "ACTION",
      ariaLabel: `${room.players.find((player) => player.id === rootAction.sourceId)?.name ?? "Unknown player"} played ${rootActionName ?? "an action"} targeting ${room.players.find((player) => player.id === rootAction.targetId)?.name ?? "unknown player"}`,
      mode: "targeted",
    }
    : attackDodgeGraphCandidate
      ? {
        key: [attackDodgeGraphCandidate.proof.interactionId, attackDodgeGraphCandidate.proof.rootFrameId, attackDodgeGraphCandidate.proof.rootEventId, attackDodgeGraphCandidate.proof.responseEventId].join(":"),
        rootEventId: attackDodgeGraphCandidate.proof.rootEventId,
        sourceId: attackDodgeGraphCandidate.proof.rootSourceId,
        targetId: attackDodgeGraphCandidate.proof.targetId,
        cardKind: "Attack",
        cardLabel: "ATTACK",
        ariaLabel: `${room.players.find((player) => player.id === attackDodgeGraphCandidate.proof.rootSourceId)?.name ?? "Unknown player"} played Attack targeting ${room.players.find((player) => player.id === attackDodgeGraphCandidate.proof.targetId)?.name ?? "unknown player"}`,
        mode: "targeted",
        settlement: {
          eventId: attackDodgeGraphCandidate.proof.responseEventId,
          outcome: "ATTACK_BLOCKED_BY_DODGE",
          exiting: activeAttackDodgeSettlement?.eventId === attackDodgeGraphCandidate.proof.responseEventId
            && activeAttackDodgeSettlement.phase === "exiting",
        },
        response: {
          eventId: attackDodgeGraphCandidate.proof.responseEventId,
          actorId: attackDodgeGraphCandidate.proof.responseActorId,
          actorName: room.players.find((player) => player.id === attackDodgeGraphCandidate.proof.responseActorId)?.name ?? "Unknown player",
          cardLabel: "DODGE",
          ariaLabel: `${room.players.find((player) => player.id === attackDodgeGraphCandidate.proof.responseActorId)?.name ?? "Unknown player"} played Dodge to block ${room.players.find((player) => player.id === attackDodgeGraphCandidate.proof.rootSourceId)?.name ?? "Unknown player"}'s Attack against ${room.players.find((player) => player.id === attackDodgeGraphCandidate.proof.targetId)?.name ?? "an opponent"}`,
        },
      }
    : singleTargetNegationGraphCandidate
      ? {
        key: [singleTargetNegationGraphCandidate.chain.interactionId, singleTargetNegationGraphCandidate.chain.publicEventLinks?.root.eventId, singleTargetNegationGraphCandidate.chain.rootEffectState, ...singleTargetNegationGraphCandidate.responseNodes.flatMap(({ event, node }) => [event.id, node.actor.id ?? ""])].join(":"),
        rootEventId: singleTargetNegationGraphCandidate.rootEvent.id,
        sourceId: singleTargetNegationGraphCandidate.root.source.id!,
        targetId: singleTargetNegationGraphCandidate.root.targets[0]!.id!,
        cardKind: singleTargetNegationGraphCandidate.root.cardKind!,
        cardLabel: cardDefinition(singleTargetNegationGraphCandidate.root.cardKind!).name.toUpperCase(),
        ariaLabel: `${singleTargetNegationGraphCandidate.root.source.name} played ${cardDefinition(singleTargetNegationGraphCandidate.root.cardKind!).name} targeting ${singleTargetNegationGraphCandidate.root.targets[0]!.name}`,
        mode: "targeted",
        rootEffectState: singleTargetNegationGraphCandidate.chain.rootEffectState ?? undefined,
        ...(singleTargetNegationGraphCandidate.responseNodes.length ? {
          responses: singleTargetNegationGraphCandidate.responseNodes.map(({ event, node }, index) => {
            const counterTarget = node.counterTarget;
            const counterLabel = counterTarget?.kind === "ROOT"
              ? cardDefinition(singleTargetNegationGraphCandidate.root.cardKind!).name
              : `Negation ${index}`;
            return {
              index,
              eventId: event.id,
              actorId: node.actor.id!,
              actorName: node.actor.name,
              cardLabel: "NEGATION",
              ariaLabel: `${node.actor.name} played Negation to counter ${counterLabel}`,
              counterTarget: counterTarget?.kind === "ROOT"
                ? { kind: "ROOT" as const }
                : { kind: "RESPONSE" as const, index: counterTarget?.index ?? -1 },
            };
          }),
        } : {}),
      }
    : selfTargetCandidate
      ? {
        key: ["self", selfTargetCandidate.action.rootEventId, selfTargetCandidate.action.resolutionId, selfTargetCandidate.action.sourceId].join(":"),
        rootEventId: selfTargetCandidate.action.rootEventId,
        sourceId: selfTargetCandidate.action.sourceId,
        targetId: selfTargetCandidate.action.targetId,
        cardKind: "Peach",
        cardLabel: "PEACH",
        ariaLabel: `${selfTargetCandidate.source.name} used Peach on self`,
        mode: "self-target",
      }
      : null;
  const rootActionSource = rootActionOverlayAction ? room.players.find((player) => player.id === rootActionOverlayAction.sourceId) : null;
  const rootActionTarget = rootActionOverlayAction ? room.players.find((player) => player.id === rootActionOverlayAction.targetId) : null;
  const rootActionTemporarilyBlocked = Boolean(targetPreviewPresentation || opponentInspectionPresentation
    || targetCardPickerSelectableDetail && !skillEffectActionCandidate
    || expandedOpponentId || groupScopePreview.active);
  const rootActionAwaitingReveal = Boolean(
    !attackDodgeGraphCandidate && rootAction && rootAction.action !== "ATTACK" && (optimisticPlay || activeEvent || eventQueue.length || hasUnseenPresentations)
    || groupTargetBranchGraphCandidate && (optimisticPlay || activeEvent || eventQueue.length || hasUnseenPresentations)
    || oathSimultaneousRootGraphCandidate && (optimisticPlay || activeEvent || eventQueue.length || hasUnseenPresentations)
    || bumperHarvestRootGraphCandidate && (optimisticPlay || activeEvent || eventQueue.length || hasUnseenPresentations)
    || skillEffectActionCandidate && (optimisticPlay || activeEvent || eventQueue.length || hasUnseenPresentations)
    || skillEffectSettlementCandidate && (optimisticPlay || activeEvent || eventQueue.length || hasUnseenPresentations)
    || singleTargetNegationGraphCandidate && (optimisticPlay || activeEvent || eventQueue.length || hasUnseenPresentations),
  );
  const rootGroupTargetNamesKnown = Boolean(rootActionOverlayAction?.groupTargets?.length
    && rootActionOverlayAction.groupTargets.every((target) => target.playerName));
  const rootOrderedTargetNamesKnown = Boolean(rootActionOverlayAction?.orderedTargets?.length
    && rootActionOverlayAction.orderedTargets.every((target) => target.playerName));
  const rootSimultaneousTargetNamesKnown = Boolean(rootActionOverlayAction?.simultaneousTargets?.length
    && rootActionOverlayAction.simultaneousTargets.every((target) => target.playerName));
  const rootActionOverlayEnabled = Boolean(rootActionOverlayAction && rootActionSource?.name
    && (rootGroupTargetNamesKnown || rootOrderedTargetNamesKnown || rootSimultaneousTargetNamesKnown || rootActionOverlayAction.mode === "self-target" || rootActionTarget?.name)
    && !rootActionTemporarilyBlocked && !rootActionAwaitingReveal);
  const rootActionLayoutState = rootActionOverlayAction && rootActionOverlayLayoutReadiness?.key === rootActionOverlayAction.key
    ? rootActionOverlayLayoutReadiness.state
    : null;
  const rootActionOverlayGraphReady = Boolean(rootActionOverlayEnabled && rootActionLayoutState === "ready");
  const rootActionOverlayMeasuring = Boolean(rootActionOverlayEnabled && (rootActionLayoutState === null || rootActionLayoutState === "measuring"));
  const rootActionOverlayGeometryUnavailable = Boolean(rootActionOverlayEnabled && rootActionLayoutState === "unavailable");
  // Keep the current Stage/reveal composition intact until geometry is proven.
  // The graph and its removal of legacy composition switch in the same render;
  // if measurement fails, the legacy presentation remains the safe fallback.
  const rootActionOverlayVisible = rootActionOverlayGraphReady;
  const rootActionOverlayOwnsComposition = rootActionOverlayGraphReady;
  const rootActionOverlayDisplayMode = rootActionOverlayGraphReady ? "graph" : rootActionOverlayMeasuring ? "measuring" : "fallback";
  const rootActionOverlayFallbackReason = rootActionOverlayDisplayMode !== "fallback" ? undefined
    : !rootActionOverlayAction ? "no-proven-root"
      : rootActionAwaitingReveal ? "awaiting-public-reveal"
        : rootActionTemporarilyBlocked ? "local-presentation-precedence"
          : !rootActionOverlayEnabled ? "overlay-prerequisite-unavailable"
            : rootActionOverlayGeometryUnavailable ? "geometry-unavailable" : undefined;
  const activeOverlaySettlementEventId = rootActionOverlayAction?.settlement?.eventId ?? null;
  const activeOverlaySettlementExiting = rootActionOverlayAction?.settlement?.exiting === true;
  useEffect(() => {
    if (!activeOverlaySettlementEventId || !rootActionOverlayGraphReady || activeSkillEffectSettlement?.eventId !== activeOverlaySettlementEventId || activeSkillEffectSettlement.exiting) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setActiveSkillEffectSettlement((current) => current?.eventId === activeOverlaySettlementEventId
        ? reducedMotion ? null : { ...current, exiting: true }
        : current);
    }, reducedMotion ? UI_TIMING.interactionSettlementReduced : UI_TIMING.interactionSettlement - UI_TIMING.interactionSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activeOverlaySettlementEventId, activeSkillEffectSettlement?.eventId, activeSkillEffectSettlement?.exiting, rootActionOverlayGraphReady]);
  useEffect(() => {
    if (!activeOverlaySettlementExiting || !activeOverlaySettlementEventId || activeSkillEffectSettlement?.eventId !== activeOverlaySettlementEventId) return;
    const timer = window.setTimeout(() => setActiveSkillEffectSettlement((current) => current?.eventId === activeOverlaySettlementEventId ? null : current), UI_TIMING.interactionSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activeOverlaySettlementEventId, activeOverlaySettlementExiting, activeSkillEffectSettlement?.eventId]);
  const activeAttackDodgeSettlementEventId = rootActionOverlayAction?.settlement?.outcome === "ATTACK_BLOCKED_BY_DODGE"
    ? rootActionOverlayAction.settlement.eventId
    : null;
  useEffect(() => {
    if (!activeAttackDodgeSettlementEventId || !rootActionOverlayGraphReady
      || activeAttackDodgeSettlement?.eventId === activeAttackDodgeSettlementEventId
      || attackDodgeSettlementTimerEventId.current === activeAttackDodgeSettlementEventId) return;
    attackDodgeSettlementTimerEventId.current = activeAttackDodgeSettlementEventId;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setActiveAttackDodgeSettlement({ eventId: activeAttackDodgeSettlementEventId, phase: reducedMotion ? "complete" : "exiting" });
    }, reducedMotion ? UI_TIMING.interactionSettlementReduced : UI_TIMING.interactionSettlement - UI_TIMING.interactionSettlementFade);
    return () => {
      window.clearTimeout(timer);
      if (attackDodgeSettlementTimerEventId.current === activeAttackDodgeSettlementEventId) attackDodgeSettlementTimerEventId.current = null;
    };
  }, [activeAttackDodgeSettlement?.eventId, activeAttackDodgeSettlementEventId, rootActionOverlayGraphReady]);
  useEffect(() => {
    if (activeAttackDodgeSettlement?.phase !== "exiting") return;
    const timer = window.setTimeout(() => {
      setActiveAttackDodgeSettlement((current) => current?.eventId === activeAttackDodgeSettlement.eventId && current.phase === "exiting"
        ? { ...current, phase: "complete" }
        : current);
    }, UI_TIMING.interactionSettlementFade);
    return () => window.clearTimeout(timer);
  }, [activeAttackDodgeSettlement?.eventId, activeAttackDodgeSettlement?.phase]);
  const rootActionCardId = rootActionEvent?.type === "card" ? rootActionEvent.card.id
    : selfTargetCandidate?.event.card.id ?? null;
  const duelExchangeEventIds = new Set(duelExchangeGraphCandidate
    ? [duelExchangeGraphCandidate.exchange.root.eventId, ...duelExchangeGraphCandidate.exchange.responses.map((response) => response.responseEventId)]
    : []);
  const completedAttackDodgeSequenceCandidate = activeAttackDodgeSettlement?.phase === "complete"
    && attackDodgeResponseCandidate?.proof.responseEventId === activeAttackDodgeSettlement.eventId
    ? attackDodgeResponseCandidate
    : null;
  const displayedSequenceEvents = rootActionOverlayOwnsComposition && rootActionOverlayAction
    ? sequenceEvents.filter((event) => event.id !== rootActionOverlayAction.rootEventId
      && event.id !== rootActionOverlayAction.response?.eventId
      && !duelExchangeEventIds.has(event.id)
      && (!rootActionCardId || !eventCards(event).some((card) => card.id === rootActionCardId))
      && (!attackDodgeResponseCandidate || !eventCards(event).some((card) => card.id === attackDodgeResponseCandidate.responseEvent.card.id))
      && (!singleTargetNegationGraphCandidate?.responseEvent || !eventCards(event).some((card) => card.id === singleTargetNegationGraphCandidate.responseEvent!.card.id))
      && !bumperHarvestRootGraphCandidate?.responses.some((response) => event.id === response.eventId || eventCards(event).some((card) => card.id === room.timeline.find((candidate) => candidate.id === response.eventId)?.card?.id))
      && !oathSimultaneousRootGraphCandidate?.responses.some((response) => event.id === response.eventId || eventCards(event).some((card) => card.id === room.timeline.find((candidate) => candidate.id === response.eventId)?.card?.id)))
    : completedAttackDodgeSequenceCandidate
      ? sequenceEvents.filter((event) => event.id !== completedAttackDodgeSequenceCandidate.proof.rootEventId
        && event.id !== completedAttackDodgeSequenceCandidate.proof.responseEventId
        && !eventCards(event).some((card) => card.id === completedAttackDodgeSequenceCandidate.rootEvent.card.id
          || card.id === completedAttackDodgeSequenceCandidate.responseEvent.card.id))
    : sequenceEvents;
  const activeRootSelfTargetEvent = rootActionOverlayOwnsComposition && rootActionOverlayAction?.mode === "self-target"
    && rootActionCardId && displayedEvent && eventCards(displayedEvent).some((card) => card.id === rootActionCardId);
  const activeRootAttackEvent = rootActionOverlayOwnsComposition && rootActionOverlayAction?.cardKind === "Attack" && rootActionCardId && displayedEvent
    && eventCards(displayedEvent).some((card) => card.id === rootActionCardId);
  const activeRootResponseEvent = rootActionOverlayOwnsComposition && rootActionOverlayAction?.response && displayedEvent
    && (displayedEvent.id === rootActionOverlayAction.response.eventId
      || duelExchangeGraphCandidate?.responseEvent && displayedEvent.id === duelExchangeGraphCandidate.responseEvent.id
      || attackDodgeGraphCandidate && eventCards(displayedEvent).some((card) => card.id === attackDodgeGraphCandidate.responseEvent.card.id)
      || singleTargetNegationGraphCandidate?.responseEvent && eventCards(displayedEvent).some((card) => card.id === singleTargetNegationGraphCandidate.responseEvent.card.id));
  const completedAttackDodgeResponseEvent = completedAttackDodgeSequenceCandidate && displayedEvent
    && eventCards(displayedEvent).some((card) => card.id === completedAttackDodgeSequenceCandidate.responseEvent.card.id);
  const displayedTableEvent = activeRootAttackEvent || activeRootSelfTargetEvent || activeRootResponseEvent || completedAttackDodgeResponseEvent ? null : displayedEvent;
  const tablePresentationVisible = displayedSequenceEvents.length > 0 || Boolean(displayedTableEvent && eventCards(displayedTableEvent).length);
  const localEquipmentSelection = activeSkillSelection
    ? { eligibleIds: activeSkillSelection.eligibleCardIds, selectedIds: activeSkillSelectedCardIds, max: activeSkillSelection.max, disabled: busy || presentationBusy, onToggle: (cardId: string) => setActiveSkillSelectionState((state) => { if (!state || !activeSkillStateIsCurrent) return state; const validIds = state.cardIds.filter((id) => activeSkillSelection.eligibleCardIds.includes(id)); return validIds.includes(cardId) ? { ...state, cardIds: validIds.filter((id) => id !== cardId) } : validIds.length < activeSkillSelection.max ? { ...state, cardIds: [...validIds, cardId] } : { ...state, cardIds: validIds }; }) }
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
  const consoleSelection: ConsoleSelectionFact | undefined = localTargetSelection.selectionActive
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
    ...(activeSkillSelection || activeSkillTargetSelection ? [{ id: "active-skill", label: "Confirm", enabled: canUseAction(room.currentAction, "trigger") && Boolean(activeSkillComplete && activeSkillSubmission && (!activeSkillTargetSelection || localTargetSelection.canConfirm)), priority: 70 }] : []),
    ...(targetCardPickerInHeroFocus || targetCardPickerInLocalDock ? [{ id: "target-card-picker", label: "Confirm", enabled: targetCardPickerSelectionComplete && !responseControlsDisabled, priority: 70 }] : []),
    ...(triggerResponse && canUseAction(room.currentAction, "trigger") && selectedTriggerOption?.selection?.type === "cards" ? [{ id: "trigger-cards", label: "Confirm", enabled: triggerSubmissionComplete, priority: 70 }] : []),
    ...(triggerResponse && canUseAction(room.currentAction, "trigger") && selectedTriggerOption?.selection?.type === "target" ? [{ id: "trigger-target", label: "Confirm", enabled: localTargetSelection.canConfirm, priority: 70 }] : []),
    ...(canRespond && selectedResponseProvider ? [{ id: "response", label: "Confirm", enabled: canUseAction(room.currentAction, "respond") && responseSelectionComplete, priority: 60 }] : []),
    ...(dyingFirstAidSelectionActive ? [{ id: "first-aid", label: "Confirm", enabled: canUseAction(room.currentAction, "respond") && responseSelectionComplete, priority: 65 }] : []),
    ...(rescueDecisionReady && !canRespond ? [{ id: "rescue", label: "Peach", enabled: canUseAction(room.currentAction, "give_peach") && card?.kind === "Peach", priority: 60 }] : []),
    ...(room.isMyTurn && room.phase === "discard" && currentActionOwnedByViewer ? [{ id: "discard", label: `Discard ${excessCards} selected`, enabled: canUseAction(room.currentAction, "discard_cards") && discardSelected.length === excessCards, priority: 60 }] : []),
    ...(room.isMyTurn && canPlay && currentActionOwnedByViewer ? [{ id: "turn", label: serpentMode ? "Form Attack" : normalTargetSelectionActive ? "Confirm" : "Play", enabled: (canUseAction(room.currentAction, "play_card") || canUseAction(room.currentAction, "serpent_spear_attack")) && (serpentMode ? canDeclareAttack && serpentSelected.length === 2 && attackTargetsValid : Boolean(card) && (!selectedCanPlayAsAttack || canDeclareAttack && attackTargetsValid) && !(["Dodge", "Negation"].includes(card?.kind ?? ""))), priority: 40 }] : []),
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
  const responseDeclineLabel = rainingArrowsDamageDecline ? "TAKE DAMAGE" : "Skip";
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
  const consoleInstruction = negationResponseGuidance
    ? "Play Negation or Skip."
    : rainingArrowsDamageDecline
      ? "Respond to Raining Arrows."
    : consoleIsDecisionActor
    ? room.currentAction?.kind === "trigger" ? decisionInstruction(room.currentAction, room.currentAction.reason) : decisionPresentation.primaryStatus
    : decisionPresentation.isWaiting
      ? decisionPresentation.supportingInstruction
      : room.currentAction?.reason || decisionPresentation.supportingInstruction;
  const consoleDecline = responseDamageAction || triggerDeclineAction ? { label: responseDamageAction === "decline_response" ? responseDeclineLabel : "Skip", enabled: true } : null;
  const consoleSecondaryControls = [
    ...(genericTriggerOptions.map((option) => option.label)),
    ...(genericResponseOptions.map((option) => option.label)),
    ...(canFormSerpentAttack ? [serpentMode ? "Normal" : "Spear"] : []),
    ...(room.isMyTurn && canPlay ? ["End"] : []),
  ].filter((label, index, all) => Boolean(label) && all.indexOf(label) === index);
  const consoleDecision = buildConsoleDecisionDisplay({
    kind: consoleKind,
    instruction: consoleInstruction,
    viewerIsDecisionActor: consoleIsDecisionActor || consoleKind === "turn" && room.isMyTurn && currentActionOwnedByViewer,
    authoritativeDecision: consoleAuthoritativeDecision,
    busy: busy || activeSkillSelectionBusy,
    selection: consoleSelection,
    primaryCandidates: consolePrimaryCandidates,
    localCancel: { visible: localTargetSelection.canCancel && !triggerHasProviderCancelSurface && !normalHasProviderCancelSurface || Boolean(canChooseTargetCard && !pendingTargetCardUsesUnifiedModal || targetCardPickerOption && (!activeSkillOption || activeSkillOption.effectId !== targetCardPickerOption.effectId)), enabled: localTargetSelection.canCancel || Boolean(canChooseTargetCard && !pendingTargetCardUsesUnifiedModal) || Boolean(targetCardPickerOption) },
    authoritativeDecline: consoleDecline,
    secondaryControls: consoleSecondaryControls,
  });
  const consolePrimaryId = consoleDecision.primary?.id ?? null;
  return <main className="game-shell" data-presentation-kind={clientPresentation.stableKind} data-presentation-has-interaction={clientPresentation.hasInteraction ? "true" : "false"} data-presentation-local-control={clientPresentation.hasLocalControl ? "true" : "false"} data-presentation-transition={presentationTransition.kind}><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b></div></header>
    <section className="action-strip" aria-label="Turn and decision ownership"><div className="action-step"><small>TURN OWNER</small><b>{decisionPresentation.turnOwner}</b></div><span className="action-arrow">→</span><div className="action-step"><small>PHASE</small><b>{decisionPresentation.phaseLabel}</b></div><span className="action-arrow">→</span><div className="action-step acting"><small>{decisionPresentation.isDecision ? "DECISION OWNER" : "CURRENT TURN"}</small><b>{decisionPresentation.actionOwner}{decisionPresentation.isViewerRequiredActor ? " · YOU" : ""}</b></div></section>
    <section className={`play-table ${displayedSequenceEvents.length > 0 ? "sequence-active" : ""} ${resolutionClosing ? "sequence-concluding" : ""}`} data-seat-topology={room.players.length >= 5 ? "side-column" : "top-row"}>
      <div className="interaction-safe-zone">{!rootActionOverlayVisible && <InteractionStage view={clientPresentation} viewerId={room.meId} topRowMode={room.players.length <= 4} transitionKind={presentationTransition.kind} transition={presentationTransition} resolvePlayerName={(playerId) => room.players.find((player) => player.id === playerId)?.name ?? null} resolvePlayerDisplay={(playerId) => {
        const player = room.players.find((candidate) => candidate.id === playerId);
        if (!player) return null;
        const hero = heroDefinition(player.hero);
        return { name: player.name, heroId: hero?.id ?? player.hero, heroName: hero?.name ?? (player.hero ? heroName(player.hero) : null), hp: player.hp, maxHp: player.maxHp };
      }} previewPlayer={targetPreviewPresentation} previewSubmission={submittedTargetPreview} inspectPlayer={opponentInspectionPresentation} selectableDetail={targetCardPickerSelectableDetail} judgementInFlight={judgementInFlight} onCloseInspect={() => setExpandedOpponentId(null)} onHeroInfo={setInfoHero} onInfoCard={setInfoCard} />}<StageSystemCluster onLeave={onLeave} responseTimer={seatCountdown?.kind === "response" ? <Countdown key={seatCountdown.key} visibleAt={room.phase === "response" ? room.responseCountdownVisibleAt : 0} durationMs={seatCountdown.durationMs} deadline={seatCountdown.deadline} label={seatCountdown.label} responseTimer /> : null} eventTimer={<>{privateDrawTimer}{harvestEventTimer}</>} /></div>
      <aside className={`game-messages ${messagesCollapsed ? "collapsed" : ""}`} aria-label="Game Messages"><header><button type="button" onClick={() => setMessagesCollapsed((collapsed) => !collapsed)} aria-label={messagesCollapsed ? "Expand game messages" : "Collapse game messages"} aria-expanded={!messagesCollapsed}>{messagesCollapsed ? "▣" : "—"}</button></header>{!messagesCollapsed && <div aria-live="polite">{gameMessages.length ? gameMessages.map((entry, index) => <p className={index === gameMessages.length - 1 ? "latest" : ""} key={entry.id}><span>{entry.message}</span></p>) : <p className="empty">No gameplay messages yet.</p>}</div>}</aside>
      {turnNotice && <div className="turn-notice" role="status"><span>TURN BEGINS</span><b>{turnNotice}</b></div>}
      {effectNotice && <div className="turn-notice effect-notice" role="status"><span>EFFECT TRIGGERED</span><b>{effectNotice}</b></div>}
      {canChooseBorrowedSword && <div className="turn-notice borrowed-sword-notice" role="status"><span>BORROWED SWORD</span><b>{borrowedSwordTargetId ? "Target selected · confirm below" : "Choose a legal Attack target"}</b></div>}
      {privateDrawVisible && <div className="played-card-stage private-draw-stage" role="status"><div className="private-draw-content"><div className="card-action-title"><b>PRIVATE DRAW</b><span>Only you can see these cards</span></div><div className="private-draw-row" role="region" aria-label="Private drawn cards; scroll horizontally to view all" tabIndex={privateDrawCards.length > 3 ? 0 : undefined}>{privateDrawCards.map((drawn) => <CardFace card={drawn} key={drawn.id} />)}</div></div></div>}
      {privateDistribution && !presentationBusy && <PrivateCardDistributionDialog key={room.actionRevision} cards={privateDistribution.cards} players={room.players.filter((player) => privateDistribution.eligibleRecipientIds.includes(player.id) && player.alive)} disabled={busy} error={error} onSubmit={(assignments) => onAction("trigger", { providerId: "private_card_distribution", assignments })} />}
      {privateDeckReorder && <PrivateDeckReorderDialog key={room.actionRevision} cards={privateDeckReorder.cards} minTop={privateDeckReorder.minTop} maxTop={privateDeckReorder.maxTop} disabled={busy} error={error} onSubmit={(topCardIds, bottomCardIds) => onAction("trigger", { providerId: "private_deck_reorder", topCardIds, bottomCardIds })} />}
      {tablePresentationVisible && <TableResolutionSequence events={displayedSequenceEvents} activeEvent={displayedTableEvent} players={room.players} myTableIndex={myTableIndex} concluding={resolutionClosing} />}
      {room.pendingHarvest && !presentationBusy && <div className="game-event-stage harvest-choice-stage" role="dialog" aria-label="Bumper Harvest card choice"><div><span>BUMPER HARVEST</span><b>{room.pendingHarvest.complete ? "All choices complete" : harvestSubmitting ? "Your choice is submitted" : canChooseHarvest ? "Your turn — choose one card" : `${actor?.name ?? "The next player"} is choosing`}</b><small>{room.pendingHarvest.complete ? "The final shaded card remains visible before Bumper Harvest closes." : harvestSubmitting ? "Your card is shaded immediately while the next choice is prepared." : canChooseHarvest ? "Tap any available card to change your selection, then confirm. Selection changes are instant." : "Watch the current player's card rise, then become shaded when confirmed."}</small><div className="harvest-card-row">{room.pendingHarvest.revealed.map((choice) => { const takenBy = room.pendingHarvest?.choices.find((entry) => entry.cardId === choice.id); const submittedByMe = harvestSubmitting?.cardId === choice.id; const available = room.pendingHarvest?.availableIds.includes(choice.id); const awaitingConfirmation = !submittedByMe && activeHarvestSelection === choice.id; return <button type="button" className={`harvest-card-choice ${takenBy || submittedByMe ? "taken" : ""} ${awaitingConfirmation ? "pending-choice" : ""}`} disabled={!canChooseHarvest || Boolean(harvestSubmitting) || busy || !available} aria-pressed={awaitingConfirmation} aria-label={takenBy ? `${cardDefinition(choice.kind).name}, taken by ${takenBy.playerName}` : submittedByMe ? `${cardDefinition(choice.kind).name}, choice submitted by ${harvestSubmitting?.playerName ?? "ME"}` : `${cardDefinition(choice.kind).name}, ${awaitingConfirmation ? `selected by ${actor?.name ?? "current player"}, awaiting confirmation` : "available"}`} key={choice.id} onClick={() => { const nextCardId = activeHarvestSelection === choice.id ? "" : choice.id; setHarvestSelected(nextCardId); void publishHarvestPreview(nextCardId); }}><CardFace card={choice} />{takenBy && <strong className="harvest-taken-label">Taken by {takenBy.playerName}</strong>}{submittedByMe && !takenBy && <strong className="harvest-taken-label">Chosen by {harvestSubmitting?.playerName ?? "ME"}</strong>}{awaitingConfirmation && <strong className="harvest-pending-label">Selected by {actor?.name ?? "player"}</strong>}</button>; })}</div>{canChooseHarvest && (harvestSubmitting ? <div className="harvest-confirm-row"><small>Choice submitted · moving to the next player</small></div> : <div className="harvest-confirm-row"><small>{harvestSelectedCard ? `${cardDefinition(harvestSelectedCard.kind).name} selected` : "Select a card before confirming"}</small><button type="button" className="primary" disabled={busy || !harvestSelectedCard} onClick={async () => { if (!harvestSelectedCard || !me) return; const submission = { cardId: harvestSelectedCard.id, playerId: me.id, playerName: me.name }; queuedHarvestPreview.current = null; setHarvestSubmitting(submission); setHarvestSelected(""); const accepted = await onAction("choose_harvest", { cardId: submission.cardId }); if (!accepted) setHarvestSubmitting(null); }}>Confirm choice</button></div>)}</div></div>}
      <div className="play-center" aria-label="Card piles"><div className="draw-stack" data-draw-anchor="true" aria-label={`Draw pile, ${room.deckCount} cards`}><b>{room.deckCount}</b><span>DECK</span></div><div className="discard-stack" data-discard-anchor="true" data-discard-kind={visibleDiscardTop?.kind} aria-label={visibleDiscardTop ? `Discard pile, ${cardDefinition(visibleDiscardTop.kind).name}` : "Discard pile, empty"}>{visibleDiscardTop ? <CardFace card={visibleDiscardTop} /> : <b className="discard-empty">—</b>}<span>DISCARD</span></div></div>
      {pendingTargetCardUsesUnifiedModal && pendingTargetCardSelectableSelection && pendingTargetCardSelectableTarget && supportsAuthoritativeTargetCardSelection(pendingTargetCardSelectableSelection, pendingTargetCardSelectableTarget) && room.pendingTargetCard && pendingTargetCardActionName && <TargetCardPicker option={null} presentationCopy={{ title: pendingTargetCardActionName, accessibleName: `${pendingTargetCardActionName} target card selection`, instruction: room.pendingTargetCard.cardKind === "Steal" ? "Choose 1 card to obtain" : "Choose 1 card to discard", actionLabel: `Use ${pendingTargetCardActionName}` }} selection={pendingTargetCardSelectableSelection} target={pendingTargetCardSelectableTarget} selectedKeys={pendingTargetCardSelectedKeys} disabled={busy || presentationBusy || !canUseAction(room.currentAction, "choose_target_card")} canDecline={false} showCancel error={error} onToggle={togglePendingTargetCardSelection} onUse={submitPendingTargetCardPicker} onCancel={clearPendingTargetCardSelection} onDecline={() => undefined} />}
      {triggerResponse && responseDecisionReady && targetCardPickerOption && targetCardPickerSelection && targetCardPickerTarget && !targetCardPickerInHeroFocus && !targetCardPickerInLocalDock && <TargetCardPicker option={targetCardPickerOption} selection={targetCardPickerSelection} target={targetCardPickerTarget} selectedKeys={triggerSelectedKeys} disabled={responseControlsDisabled} canDecline={Boolean(consoleDecision.authoritativeDecline)} showCancel={targetCardPickerUsesUnifiedModal || consoleDecision.localCancel.visible && (!activeSkillOption || activeSkillOption.effectId !== targetCardPickerOption.effectId)} error={error} onToggle={(key) => setTriggerSelectedKeys((keys) => { const validKeys = keys.filter((selectedKey) => targetCardPickerSelection.eligibleKeys.includes(selectedKey)); return validKeys.includes(key) ? validKeys.filter((selectedKey) => selectedKey !== key) : validKeys.length < targetCardPickerSelection.max ? [...validKeys, key] : validKeys; })} onUse={submitTargetCardPicker} onCancel={cancelTargetCardPicker} onDecline={() => onAction("decline_trigger")} />}
      {triggerResponse && responseDecisionReady && choiceTriggerOption?.selection?.type === "choice" && <MandatoryChoiceDialog option={choiceTriggerOption} selection={choiceTriggerOption.selection} hand={room.myHand} selectedChoice={triggerChoice} selectedKeys={triggerSelectionKeys} disabled={responseControlsDisabled} error={error} onChoice={(choice) => { setTriggerChoice(choice); setTriggerSelectedKeys([]); }} onToggle={(key) => { const validKeys = triggerSelectedKeys.filter((selectedKey) => choiceTriggerOption.selection?.type === "choice" && choiceTriggerOption.selection.eligibleHandKeys.includes(selectedKey)); const required = choiceTriggerOption.selection?.type === "choice" ? choiceTriggerOption.selection.cardCountByChoice?.[triggerChoice] ?? (triggerChoice === "discard" ? 1 : 0) : 0; setTriggerSelectedKeys(validKeys.includes(key) ? validKeys.filter((selectedKey) => selectedKey !== key) : validKeys.length < required ? [...validKeys, key] : validKeys); }} onConfirm={(choice, cardKeys) => onAction("trigger", { providerId: choiceTriggerOption.effectId, choice, ...(cardKeys.length ? { cardKeys } : {}) })} />}
      {room.status === "finished" && <div className="victory-banner"><span>MATCH COMPLETE</span><b>{room.log.at(-1)?.replace("! The match is over.", "")}</b><small>All roles are now revealed at the table.</small></div>}
      {groupScopePreview.active && <p className="group-scope-preview-label" data-group-scope-preview={groupScopePreview.cardKind ?? undefined} role="status">PREVIEW · {groupScopePreview.label}</p>}
      <div className="player-board" aria-label="Players" data-player-count={room.players.length} data-seat-topology={room.players.length >= 5 ? "side-column" : "top-row"}>{room.players.filter((player) => player.id !== room.meId).map((player) => { const index = room.players.findIndex((candidate) => candidate.id === player.id); const relativeIndex = (index - myTableIndex + room.players.length) % room.players.length; const selectedTargetCardKind = selectedCanPlayAsAttack ? "Attack" : card?.kind; const cardTargetLegal = Boolean(card && (card.kind === "BorrowedSword" ? borrowedSwordPlayTargetIds.includes(player.id) : selectedTargetCardKind && canTargetCharacter({ sourceId: room.meId, targetId: player.id, targetHero: player.hero, targetHandCount: player.handCount, cardKind: selectedTargetCardKind }))); const targetablePlayer = Boolean((borrowedSwordTargetSelectionActive && borrowedSwordEligibleTargetIds.includes(player.id) && player.alive) || (activeSkillTargetMode && activeSkillTargetIds.includes(player.id) && player.alive) || (triggerTargetSelection?.targetIds.includes(player.id) && triggerTargetMode) || (serpentMode && canPlay) || (card && cardTargetLegal && (selectedCanPlayAsAttack || card.kind === "Dismantle" || card.kind === "Steal" || card.kind === "Duel" || card.kind === "BorrowedSword" || card.kind === "Overindulgence" || card.kind === "RationsDepleted"))); return <OpponentPlayerCard key={`square-${player.id}`} totalPlayers={room.players.length} player={player} viewerId={room.meId} playerHero={heroDefinition(player.hero)} relativeIndex={relativeIndex} isTurn={player.seat === room.turnSeat} isActionPlayer={clientPresentation.stage !== "NEGATION" && player.id === room.actionPlayerId} isSelectedTarget={borrowedSwordTargetId === player.id || targetIds.includes(player.id)} isGroupPreview={groupScopePreview.affectedPlayerIds.includes(player.id)} interactionRoles={projectInteractionSeatRoles(clientPresentation, player.id)} targetSelectionActive={targetSelectionActive} targetablePlayer={targetablePlayer} onTarget={() => { if (borrowedSwordTargetSelectionActive) chooseBorrowedSwordTarget(player.id); else { setTarget(player.id); setTargetCardIndex(null); } }} onInspect={() => setExpandedOpponentId((currentId) => currentId === player.id ? null : player.id)} onHeroInfo={setInfoHero} onInfoCard={setInfoCard} judgementInFlight={judgementInFlight} serpentSelected={serpentSelected} triggerResponse={triggerResponse} triggerSelectionUsesCards={triggerSelectionUsesCards} responseDecisionReady={responseDecisionReady} triggerCardOption={triggerCardOption} onToggleEquipment={(cardId) => setSerpentSelected((ids) => ids.includes(cardId) ? ids.filter((id) => id !== cardId) : ids.length < (triggerResponse && triggerSelectionUsesCards ? triggerSelectionMax : 2) ? [...ids, cardId] : ids)} />; })}</div>
      {seatCountdown?.kind === "rescue" && <Countdown key={seatCountdown.key} visibleAt={room.phase === "response" ? room.responseCountdownVisibleAt : 0} durationMs={seatCountdown.durationMs} deadline={seatCountdown.deadline} label={seatCountdown.label} />}
    </section>
    <InteractionRootOverlay action={rootActionOverlayAction} enabled={rootActionOverlayEnabled} sourceName={rootActionSource?.name ?? null} targetName={rootActionTarget?.name ?? null} displayMode={rootActionOverlayDisplayMode} layoutReadiness={rootActionLayoutState} fallbackReason={rootActionOverlayFallbackReason} onLayoutReadinessChange={onRootActionOverlayLayoutReadinessChange} />
    <footer className="play-command">
    <LocalPlayerDock player={me} hero={localHero} selfTargetable={localDockSelfTargetable} selfTargetSelected={localDockSelfTargetSelected} onSelfTarget={() => { setTarget(room.meId); setTargetCardIndex(null); }} isGroupPreview={groupScopePreview.affectedPlayerIds.includes(room.meId)} interactionRoles={projectInteractionSeatRoles(clientPresentation, room.meId)} onHeroInfo={setInfoHero} onInfoCard={setInfoCard} equipmentSelection={localEquipmentSelection} hiddenCardIds={judgementInFlight}
      heroSkillControl={
        <section className="hero-skills local-hero-skills" aria-label="Available hero skills">
          {heroSkillButtons.map((skill) => skill.passive
            ? <div key={skill.name} className="hero-skill-button hero-skill-passive" role="group" aria-label={`${skill.name}, passive skill`}>{skill.name}</div>
            : <button type="button" key={skill.name} className={`hero-skill-button ${skill.active ? "active" : ""}`} aria-label={skill.name} aria-pressed={skill.active} title={skill.description} disabled={!skill.enabled || busy || presentationBusy && !skill.active} onClick={() => skill.onClick?.()}>{skill.active && (me?.hero === "guan-yu" || me?.hero === "zhao-yun") ? `Cancel ${skill.name}` : skill.name}</button>)}
        </section>
      } guidance={
        <div className="console-guidance" data-console-guidance="true">
          <div className={`decision-status ${consoleDecision.controlsVisible ? "decision-status-active" : ""}`} data-console-decision-kind={consoleDecision.kind} data-console-coherent={consoleDecision.coherent ? "true" : "false"} data-console-primary={consoleDecision.primary?.label ?? "none"} data-console-primary-enabled={consoleDecision.primary?.enabled ? "true" : "false"} data-console-selection-count={consoleDecision.selectionCount ?? undefined} data-console-local-cancel={consoleDecision.localCancel.visible ? "true" : "false"} data-console-authoritative-decline={consoleDecision.authoritativeDecline ? "true" : "false"} role="status" aria-live="polite" aria-atomic="true"><small>{localSemanticResponseGuidance ? "YOUR RESPONSE" : consoleDecision.controlsVisible ? "YOUR DECISION" : decisionPresentation.isWaiting ? decisionPresentation.primaryStatus : "GAME STATUS"}</small><strong>{consoleDecision.instruction}</strong>{!negationResponseGuidance && consoleDecision.selectionSummary && <em>{consoleDecision.selectionSummary}</em>}{consoleDecision.localCancel.visible && <span className="local-target-selection" data-local-target-selection="true"><b>LOCAL CANCEL</b><span>Change your selection before submitting.</span></span>}</div>
          {invalidResponseState && <p className="error" role="status">Waiting for the latest response state…</p>}
          {(activeSkillSelection || activeSkillTargetSelection) && activeSkillOption?.effectId === "diao_chan_lust" && activeSkillSelectedTargetIds.length > 1 && <small role="status">Lust order: {room.players.find((player) => player.id === activeSkillSelectedTargetIds[0])?.name} plays Attack first, then {room.players.find((player) => player.id === activeSkillSelectedTargetIds[1])?.name}.</small>}
        </div>
      }>
        <div className="local-hand-section" data-raining-arrows-dodge-providers={rainingArrowsHasHandDodgeProvider ? "available" : undefined}>
          <div className="local-hand" data-card-origin-anchor={room.meId} aria-label="Your hand">{(() => {
            const multiSelectMode = room.phase === "discard" || Boolean(activeSkillSelection || serpentMode || responseSelectionMax > 1 || triggerSelectionMax > 1);
            const responseSelectionLimit = triggerResponse && triggerSelectionUsesCards ? triggerSelection.max : responseSelectionUsesCards ? responseSelection.max : 2;
            const toggleHandCard = (item: Card) => {
              const costSelection = serpentMode || canRespond && responseSelectionUsesCards && responseSelectionMax > 1 || triggerResponse && triggerSelectionUsesCards && triggerSelectionMax > 1;
              if (room.phase === "discard") setDiscardSelected((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : ids.length < excessCards ? [...ids, item.id] : ids);
              else if (activeSkillSelection) setActiveSkillSelectionState((state) => {
                if (!state || !activeSkillStateIsCurrent) return state;
                const validIds = state.cardIds.filter((id) => activeSkillSelection.eligibleCardIds.includes(id));
                return validIds.includes(item.id) ? { ...state, cardIds: validIds.filter((id) => id !== item.id) } : validIds.length < activeSkillSelection.max ? { ...state, cardIds: [...validIds, item.id] } : { ...state, cardIds: validIds };
              });
              else if (costSelection) setSerpentSelected((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : ids.length < responseSelectionLimit ? [...ids, item.id] : ids);
              else { setSelected((id) => id === item.id ? "" : item.id); setTarget(""); }
              setTargetCardIndex(null);
            };
            const renderHandCard = (item: Card, index: number) => {
              const definition = cardDefinition(item.kind);
              const costSelection = serpentMode || canRespond && responseSelectionUsesCards && responseSelectionMax > 1 || triggerResponse && triggerSelectionUsesCards && triggerSelectionMax > 1;
              const isSelected = room.phase === "discard" ? discardSelected.includes(item.id) : activeSkillSelection ? activeSkillSelectedCardIds.includes(item.id) : costSelection ? serpentSelected.includes(item.id) : selected === item.id;
              const singleSelected = !multiSelectMode && isSelected;
              const maySelect = (room.isMyTurn && (canPlay || room.phase === "discard")) || responseDecisionReady || rescueDecisionReady;
              const skillModeCardDisabled = Boolean(activeSkillTargetSelection || wushengMode && !wushengEligibleCardIds.has(item.id) || longdanMode && !longdanEligibleCardIds.has(item.id) || activeSkillSelection && !activeSkillSelection.eligibleCardIds.includes(item.id));
              const skillModeEligible = wushengMode && wushengEligibleCardIds.has(item.id) || longdanMode && longdanEligibleCardIds.has(item.id) || activeSkillSelection?.eligibleCardIds.includes(item.id) === true;
              return <div className={`card-slot ${singleSelected ? "single-selected" : ""}`} data-hand-card-id={item.id} key={`rail-${item.id}`} style={{ marginLeft: index === 0 ? 0 : `${handCardLayout.step - 68}px` }}>
                <div className="hand-card-visual">
                  <button disabled={!maySelect || skillModeCardDisabled || responseCardDisabled(item)} onClick={() => toggleHandCard(item)} className={`game-card ${item.kind.toLowerCase()} ${suitColorClass(item.suit)} ${isSelected ? "selected" : ""} ${skillModeEligible ? "hero-skill-eligible" : ""}`}>
                    <span className="corner">{item.rank}<i>{item.suit}</i></span><span className="card-name-mark">{definition.name}</span><strong>{definition.category} card</strong>
                  </button>
                  <button type="button" className="card-info-button" aria-label={`Explain ${definition.name}`} onClick={(event) => { event.stopPropagation(); setInfoCard(item); }}>i</button>
                </div>
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
          {triggerResponse && genericTriggerOptions.map((option) => option.selection?.type === "target_cards" || option.selection?.type === "choice" && option.allowDecline === false ? null : option.selection ? <button key={option.effectId} className={`serpent-control ${responseProviderId === option.effectId ? "active" : ""}`} disabled={responseControlsDisabled} onClick={() => { const active = responseProviderId === option.effectId; if (active) resetLocalTargetFlow("trigger"); else { setResponseProviderId(option.effectId); setSelected(""); setTargetIds([]); setSerpentSelected([]); setTriggerSelectedKeys([]); setTriggerChoice(""); } }}>{responseProviderId === option.effectId ? `Cancel ${option.label}` : option.selection.type === "target" ? `Use ${option.label}` : option.label}</button> : <button key={option.effectId} className="serpent-control" disabled={responseControlsDisabled} onClick={() => onAction("trigger", { providerId: option.effectId })}>{`Use ${option.label}`}</button>)}
          {canRespond && genericResponse && semanticResponseOptions.length > 0 && genericResponseOptions.map((option) => option.selection ? <button key={option.providerId} className={`serpent-control ${responseProviderId === option.providerId ? "active" : ""}`} disabled={responseControlsDisabled} onClick={() => { const active = responseProviderId === option.providerId; setResponseProviderId(active ? "" : option.providerId); setSelected(""); setSerpentSelected([]); }}>{responseProviderId === option.providerId ? `Cancel ${option.label}` : option.label}</button> : <button key={option.providerId} className="serpent-control" disabled={responseControlsDisabled} onClick={() => submitResponseProvider(option)}>{busy ? "Resolving…" : option.label}</button>)}
          {room.isMyTurn && canPlay && consoleKind === "turn" && canFormSerpentAttack && <button className={`serpent-control ${serpentMode ? "active" : ""}`} onClick={() => { setSerpentMode((active) => !active); setSerpentSelected([]); setSelected(""); setTarget(""); }}>{serpentMode ? "Normal" : "Spear"}</button>}
        </div>
        <div data-action-slots="true">
          <div data-action-slot="cancel">
            {borrowedSwordTargetSelectionActive && consoleDecision.localCancel.visible && <button className="end local-target-cancel" disabled={busy || presentationBusy || !consoleDecision.localCancel.enabled} onClick={cancelLocalTargetSelection}>Cancel</button>}
            {(targetCardPickerInHeroFocus || targetCardPickerInLocalDock) && consoleDecision.localCancel.visible && (!activeSkillOption || activeSkillOption.effectId !== targetCardPickerOption?.effectId) && <button className="end local-target-cancel" disabled={responseControlsDisabled || !consoleDecision.localCancel.enabled} onClick={cancelTargetCardPicker}>Cancel</button>}
            {triggerResponse && triggerTargetMode && consoleDecision.localCancel.visible && localTargetSelection.canCancel && !triggerHasProviderCancelSurface && <button className="end local-target-cancel" disabled={responseControlsDisabled || !consoleDecision.localCancel.enabled} onClick={cancelLocalTargetSelection}>Cancel</button>}
            {(activeSkillSelection || activeSkillTargetSelection) && activeSkillTargetMode && consoleDecision.localCancel.visible && localTargetSelection.canCancel && <button className="end local-target-cancel" disabled={busy || !consoleDecision.localCancel.enabled} onClick={cancelLocalTargetSelection}>Cancel</button>}
            {room.isMyTurn && canPlay && consoleKind === "turn" && normalTargetSelectionActive && consoleDecision.localCancel.visible && localTargetSelection.canCancel && !normalHasProviderCancelSurface && <button className="end local-target-cancel" disabled={busy || presentationBusy || !consoleDecision.localCancel.enabled} onClick={cancelLocalTargetSelection}>Cancel</button>}
          </div>
          <div data-action-slot="primary">
            {rescueDecisionReady && !canRespond && consolePrimaryId === "rescue" && <button className="primary" disabled={busy || card?.kind !== "Peach" || !consoleDecision.primary?.enabled} onClick={() => { if (card?.kind === "Peach") void onAction("give_peach", { cardId: card.id }); setSelected(""); }}>{busy ? "Playing…" : "Peach"}</button>}
            {dyingFirstAidSelectionActive && consolePrimaryId === "first-aid" && <button className="primary" disabled={busy || presentationBusy || !responseSelectionComplete || !canUseAction(room.currentAction, "respond") || !consoleDecision.primary?.enabled} onClick={() => void submitResponseProvider()}>{busy ? "Confirming…" : "Confirm"}</button>}
            {borrowedSwordTargetSelectionActive && consolePrimaryId === "borrowed-sword" && <button className="primary" disabled={busy || presentationBusy || !localTargetSelection.canConfirm || !consoleDecision.primary?.enabled} onClick={() => void confirmBorrowedSwordTarget()}>{busy ? "Confirming…" : "Confirm"}</button>}
            {(targetCardPickerInHeroFocus || targetCardPickerInLocalDock) && consolePrimaryId === "target-card-picker" && <button className="primary" disabled={responseControlsDisabled || !targetCardPickerSelectionComplete || !consoleDecision.primary?.enabled} onClick={() => void submitTargetCardPicker(targetCardPickerSelectedKeys)}>{busy ? "Confirming…" : "Confirm"}</button>}
            {triggerResponse && selectedTriggerOption?.selection?.type === "cards" && consolePrimaryId === "trigger-cards" && <button className="primary" disabled={responseControlsDisabled || !triggerSubmissionComplete || !consoleDecision.primary?.enabled} onClick={() => submitWithLocalTargetPreview(() => onAction("trigger", { providerId: selectedTriggerOption.effectId, ...(triggerSelectedCardIds.length === 1 ? { cardId: triggerSelectedCardIds[0] } : { cardIds: triggerSelectedCardIds }), ...(triggerTargetSelection ? { targetId: targetIds[0] } : {}) }))}>Confirm</button>}
            {triggerResponse && selectedTriggerOption?.selection?.type === "target" && triggerTargetSelection && consolePrimaryId === "trigger-target" && <button className="primary" disabled={responseControlsDisabled || !localTargetSelection.canConfirm || !consoleDecision.primary?.enabled} onClick={() => submitWithLocalTargetPreview(() => onAction("trigger", { providerId: selectedTriggerOption.effectId, targetIds }))}>Confirm</button>}
            {(activeSkillSelection || activeSkillTargetSelection) && consolePrimaryId === "active-skill" && <button className="primary" disabled={busy || !localTargetSelection.canConfirm && Boolean(activeSkillTargetSelection || activeSkillSelection?.targetIds.length) || !activeSkillComplete || !activeSkillSubmission || !consoleDecision.primary?.enabled} onClick={() => activeSkillSubmission && submitWithLocalTargetPreview(() => onAction("trigger", activeSkillSubmission))}>Confirm</button>}
            {canRespond && genericResponse && semanticResponseOptions.length > 0 && selectedResponseProvider && consolePrimaryId === "response" && <button className="primary" disabled={responseControlsDisabled || !responseSelectionComplete || !consoleDecision.primary?.enabled} onClick={() => submitResponseProvider()}>{busy ? "Confirming…" : "Confirm"}</button>}
            {room.isMyTurn && room.phase === "discard" && consolePrimaryId === "discard" && <button className="primary" disabled={busy || discardSelected.length !== excessCards || !consoleDecision.primary?.enabled} onClick={() => onAction("discard_cards", { cardIds: discardSelected })}>{busy ? "Discarding…" : `Discard ${excessCards} selected`}</button>}
            {room.isMyTurn && canPlay && consoleKind === "turn" && consolePrimaryId === "turn" && <button className="primary" disabled={serpentMode ? busy || presentationBusy || !canDeclareAttack || serpentSelected.length !== 2 || !attackTargetsValid || !consoleDecision.primary?.enabled : busy || presentationBusy || !card || selectedCanPlayAsAttack && (!canDeclareAttack || !attackTargetsValid) || (["Dismantle", "Steal", "Duel", "Overindulgence", "RationsDepleted", "BorrowedSword"].includes(card.kind) && !target) || card?.kind === "BorrowedSword" && !borrowedSwordPlayTargetIds.includes(target) || !selectedCanPlayAsAttack && (card.kind === "Dodge" || card.kind === "Negation") || !consoleDecision.primary?.enabled} onClick={serpentMode ? playSerpentAttack : play}>{busy ? "Playing…" : serpentMode ? "Form Attack" : normalTargetSelectionActive ? "Confirm" : "Play"}</button>}
          </div>
          <div data-action-slot="decline">
            {rescueDecisionReady && !canRespond && consoleDecision.authoritativeDecline && <button className="end" disabled={busy || !consoleDecision.authoritativeDecline.enabled} onClick={() => { void onAction("skip_rescue"); setSelected(""); }}>{busy ? "Skipping…" : "Skip"}</button>}
            {triggerResponse && triggerDeclineAction && (!targetCardPickerOption || targetCardPickerInHeroFocus || targetCardPickerInLocalDock) && consoleDecision.authoritativeDecline && <button className="end" disabled={responseControlsDisabled || !consoleDecision.authoritativeDecline.enabled} onClick={() => onAction("decline_trigger")}>Skip</button>}
            {canRespond && consoleDecision.authoritativeDecline && <button className="end" disabled={responseControlsDisabled || !responseDamageAction || !consoleDecision.authoritativeDecline.enabled} onClick={() => responseDamageAction && onAction(responseDamageAction)}>{responseDeclineLabel}</button>}
            {room.isMyTurn && canPlay && consoleKind === "turn" && <button className="end" disabled={busy || presentationBusy} onClick={() => onAction("end_turn")}>{busy ? "Finishing…" : "End"}</button>}
          </div>
        </div>
      </div>
      </LocalPlayerDock>
    </footer>
    {infoCard && <div className="card-info-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setInfoCard(null)}><section className="card-info-dialog" role="dialog" aria-modal="true" aria-labelledby="card-info-title"><button type="button" className="card-info-close" onClick={() => setInfoCard(null)} aria-label="Close card explanation">×</button><span>PRIVATE CARD INFORMATION</span><small>{infoCard.rank}{infoCard.suit} · {cardDefinition(infoCard.kind).category} card</small><h2 id="card-info-title">{cardDefinition(infoCard.kind).name}</h2><p>{cardDefinition(infoCard.kind).rules}</p><em>Only you can see this explanation.</em></section></div>}{infoHero && <HeroInfoDialog hero={infoHero} onClose={() => setInfoHero(null)} />}
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

function TargetCardPicker({ option, presentationCopy, selection, target, selectedKeys, disabled, canDecline, showCancel, error, onToggle, onUse, onCancel, onDecline }: { option: TriggerOptionView | null; presentationCopy?: { title: string; accessibleName: string; instruction: string; actionLabel: string }; selection: HeroFocusTargetCardSelection; target: Player; selectedKeys: string[]; disabled: boolean; canDecline: boolean; showCancel: boolean; error: string; onToggle: (key: string) => void; onUse: (keys: string[]) => void; onCancel: () => void; onDecline: () => void }) {
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

function TargetCardSelectableDetailView({ label, selection, target, selectedKeys, disabled, onToggle }: TargetCardSelectableDetail) {
  const validSelectedKeys = selectedKeys.filter((key) => selection.eligibleKeys.includes(key));
  const randomHandZone = selection.eligibleKeys.includes("hand");
  const handPositionKeys = selection.eligibleKeys
    .filter((key) => /^hand:\d+$/.test(key))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));
  const eligiblePublicKeys = new Set(selection.eligibleKeys.filter((key) => key !== "hand"));
  const publicCards = [
    ...target.equipmentCards.filter((item) => eligiblePublicKeys.has(item.id)).map((card) => ({ card, zone: "equipment" as const })),
    ...target.judgementCards.filter((item) => eligiblePublicKeys.has(item.id)).map((card) => ({ card, zone: "judgement" as const })),
  ];
  const items = [
    ...(randomHandZone ? [{ key: "hand", label: `Hand ×${target.handCount} · Random card`, hidden: true, randomHandZone: true, zone: "hand" as const, card: null }] : []),
    ...handPositionKeys.map((key) => ({ key, label: `Hidden hand card ${Number(key.slice(5)) + 1}`, hidden: true, randomHandZone: false, zone: "hand-position" as const, card: null })),
    ...publicCards.map(({ card, zone }) => ({ key: card.id, label: `${zone === "equipment" ? "Equipment" : "Judgement"}: ${cardDefinition(card.kind).name}`, hidden: false, randomHandZone: false, zone, card })),
  ];
  const effectLabel = label.replace(/^Use\s+/i, "");
  const amount = selection.min === selection.max ? `${selection.min}` : `${selection.min}–${selection.max}`;
  const subtitle = randomHandZone && selection.min === 1 && selection.max === 1
    ? "Choose where to obtain 1 card"
    : `Choose ${amount} card${selection.max === 1 ? "" : "s"}${handPositionKeys.length > 0 ? ` · Hand ×${target.handCount}` : ""}`;
  return <section className="hero-focus-selectable-detail" role="group" aria-label={`${effectLabel} selection`} data-selectable-detail="true">
    <header><span>{effectLabel}</span><small>{subtitle}</small></header>
    <div className="target-card-picker-card-row hero-focus-selectable-detail-row" aria-label="Eligible target objects">
      {items.map((item) => <button type="button" key={item.key} data-target-card-zone={item.zone} className={`target-card-picker-card ${item.hidden ? "concealed-card" : "equipment"} ${item.randomHandZone ? "random-hand-zone" : ""} ${validSelectedKeys.includes(item.key) ? "selected" : ""}`} disabled={disabled} aria-pressed={validSelectedKeys.includes(item.key)} aria-label={item.label} onClick={() => onToggle(item.key)}>{item.randomHandZone ? <span className="concealed-hand-zone-content"><span className="target-card-picker-hand-label">Hand ×{target.handCount}</span><span className="target-card-picker-hand-backs" aria-hidden="true">{Array.from({ length: Math.min(target.handCount, 6) }, (_, index) => <span className="target-card-picker-hand-back" key={index}>?</span>)}{target.handCount > 6 && <span className="target-card-picker-hand-overflow">+{target.handCount - 6}</span>}</span><span className="target-card-picker-hand-copy">Random card</span></span> : item.hidden ? <span className="target-card-picker-hidden-glyph" aria-hidden="true">?</span> : item.card && <><CardFace card={item.card} /><span className="hero-focus-selectable-public-card-label"><small>{item.zone === "equipment" ? "Equipment" : "Judgement"}</small><strong>{cardDefinition(item.card.kind).name}</strong></span></>}{validSelectedKeys.includes(item.key) && <span className="target-card-picker-check" aria-hidden="true">✓</span>}</button>)}
    </div>
    <div className="target-card-picker-count" aria-live="polite">{validSelectedKeys.length} / {selection.max} selected</div>
  </section>;
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
    {activeCards.length > 0 && !concluding && <div ref={revealRef} className={`active-table-reveal ${equipmentFlightId ? "equipment-flight" : ""} ${judgementFlightId ? "judgement-flight" : ""} ${isJudgementReveal(activeEvent) ? "judgement-reveal" : ""} ${directDiscard ? "direct-discard" : ""}`} key={activeEvent?.id}><div>{activeCards.map((shown) => <CardFace card={shown} key={shown.id} />)}</div></div>}
    {cardPlayers.map((player) => {
      const playerCards = cards.filter(({ event }) => !settlesInJudgement(event) && publicPlayerName(event.player) === publicPlayerName(player.name));
      const equipmentOnly = playerCards.every(({ event }) => event.type === "card" && event.action === "equip");
      return <div className={`player-played-cards ${equipmentOnly ? "equipment-only" : ""}`} data-player-settlement-id={player.id} key={player.id}><span>{publicPlayerName(player.name)}</span><div>{playerCards.map(({ card, key }, index) => activeCardIds.has(card.id) ? null : <div className="table-played-card settled" key={key}><em>{index + 1}</em><CardFace card={card} /></div>)}</div></div>;
    })}
  </div>;
}

function CardFace({ card }: { card: Card }) {
  const definition = cardDefinition(card.kind);
  return <div className={`played-card ${card.kind.toLowerCase()} ${suitColorClass(card.suit)}`}><i>{card.rank}<small>{card.suit}</small></i><b className="card-name-mark">{definition.name}</b><strong>{definition.category} card</strong></div>;
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
