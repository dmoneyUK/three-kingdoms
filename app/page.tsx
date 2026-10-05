"use client";

import { Component, FormEvent, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cardDefinition, isAttackCard } from "../game/cards";
import type { Card } from "../game/model";
import { baselineHand, updatePrivateHand } from "../game/private-hand.js";
import { getResponseOptions } from "../game/responses";
import { HEROES, type HeroSkill } from "../game/heroes";
import { normalizeRoomData } from "../game/room-safety.js";
import { canUseAction, type CurrentAction, type GameplayAction, type TriggerOptionView } from "../game/protocol.js";
import { latestPublicMessages } from "../game/messages.js";
import { canTargetCharacter } from "../game/capabilities/targeting";
import type { PresentationSnapshot } from "../game/presentation-snapshot";
import type { PresentationV2 } from "../game/presentation-v2";
import { buildDyingHandoffView, buildInteractionStageDisplayModel, buildInteractionStageView, buildPresentationClientView, buildPresentationDecisionStatus, buildReactionChainView, projectInteractionSeatRoles, type InteractionSeatSemanticRoles, type PresentationClientView } from "../game/presentation-client";
import { buildPresentationTransition, type PresentationTransitionKind } from "../game/presentation-transition";
import { buildHeroFocusView, projectHeroFocusForViewer, projectMediumSourceForViewer, projectGroupTargetScopeForViewer, type HeroFocusPlayerDisplay, type HeroFocusView, type MediumParticipantView } from "../game/hero-focus";
import { buildLocalTargetSelectionView } from "../game/local-target-selection";
import { buildConsoleDecisionDisplay, type ConsoleDecisionKind, type ConsoleSelectionFact } from "../game/console-decision";
import { buildGroupScopePreview } from "../game/group-scope-preview";

type Hero = { id: string; name: string; faction: string; hp: number; ability: string; skill?: string; skills?: readonly HeroSkill[] };
type ActiveSkillSelectionState = { revision: string; effectId: string; cardIds: string[]; targetIds: string[] };
type LocalTargetFlow = "normal" | "serpent" | "active-skill" | "trigger" | "borrowed-sword";
type PresentationImportance = "essential" | "informational";
type PresentationEventMeta = { resolutionId?: string; importance?: PresentationImportance; finalResult?: boolean; playedAs?: "attack" | "dodge" | "peach"; effectNotice?: boolean; judgement?: boolean; initialDeal?: boolean };
type CardEvent = PresentationEventMeta & { id: string; player: string; target: string; card: Card; action?: "play" | "equip" | "activate" | "discard" | "gain" | "reveal" | "draw"; drawPlayerId?: string; presentation?: boolean };
type CardGroupEvent = PresentationEventMeta & { id: string; type: "cards"; player: string; target: string; cards: Card[]; action: "discard" | "reveal" | "play"; presentation?: boolean; message?: string };
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
} as const;

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

  const harvestDeadline = room?.pendingHarvest?.countdownUntil ?? 0;
  const harvestRevision = room?.actionRevision ?? "";
  useEffect(() => {
    if (!roomCode || !token || !pageVisible || !harvestDeadline) return;
    const timer = setTimeout(() => { void send("advance_timers"); }, Math.max(0, harvestDeadline - Date.now()));
    return () => clearTimeout(timer);
  // The authoritative deadline is supplied by the server. Polling remains a
  // one-second fallback for another viewer, but only this explicit action may
  // advance timer-driven Harvest state.
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

function HeroFocus({ view, showSource = true, previewPlayer = null, inspectPlayer = null, hideArchitecturalLabel = false, roleLabelOverride = null, judgementInFlight, onCloseInspect, onHeroInfo, onInfoCard }: { view: HeroFocusView; showSource?: boolean; previewPlayer?: LocalTargetPreviewPresentation | null; inspectPlayer?: LocalOpponentInspectionPresentation | null; hideArchitecturalLabel?: boolean; roleLabelOverride?: string | null; judgementInFlight?: ReadonlySet<string>; onCloseInspect?: () => void; onHeroInfo?: (hero: Hero) => void; onInfoCard?: (card: Card) => void }) {
  if (inspectPlayer) {
    const inspectedHero = inspectPlayer.hero;
    const publicSkills = inspectedHero?.skills ?? [];
    const renderInspectionCard = (card: Card, hidden = false) => <button key={card.id} type="button" className="opponent-inspection-card" style={{ visibility: hidden ? "hidden" : "visible" }} aria-label={`Explain ${cardDefinition(card.kind).name}`} onClick={(event) => { event.stopPropagation(); onInfoCard?.(card); }}><CardFace card={card} /></button>;
    const heroName = inspectedHero?.name ?? "Unknown Hero";
    return <div className="hero-focus hero-focus-inspect opponent-inspection-panel" role="dialog" aria-label={`${inspectPlayer.name} opponent inspection`} data-hero-focus-mode="INSPECT" data-inspect-player-id={inspectPlayer.id}>
      <div className="hero-focus-heading"><span>HERO FOCUS</span><strong>INSPECT</strong><button type="button" className="hero-focus-inspect-close" aria-label={`Close ${inspectPlayer.name} inspection`} onClick={onCloseInspect}>×</button></div>
      <div className="hero-focus-body">
        <span className={inspectedHero ? "hero-focus-portrait" : "hero-focus-portrait hero-focus-portrait-empty"} data-hero-id={inspectedHero?.id}>{inspectedHero ? <HeroPortrait hero={inspectedHero} /> : "?"}</span>
        <div className="hero-focus-identity"><b>{inspectPlayer.name}</b><span>{heroName}</span><small>HP {inspectPlayer.hp ?? "?"}/{inspectPlayer.maxHp ?? "?"} · {hpDisplay(inspectPlayer.hp)}</small>{inspectedHero && <button type="button" className="hero-focus-inspect-explain" aria-label={`Explain ${inspectedHero.name}`} onClick={() => onHeroInfo?.(inspectedHero)}>Explain Hero</button>}</div>
      </div>
      <div className="hero-focus-inspect-details hero-focus-context">
        <section className="opponent-inspection-zone" aria-label="Public Skills"><h3>Public Skills</h3><div className="hero-focus-inspect-skills">{publicSkills.length ? publicSkills.map((skill) => <button type="button" className="hero-focus-inspect-skill" key={skill.name} aria-label={`Explain ${skill.name}`} onClick={() => inspectedHero && onHeroInfo?.(inspectedHero)}>{skill.name}</button>) : <span className="opponent-inspection-empty">None</span>}</div></section>
        <section className="opponent-inspection-zone" aria-label="Equipment"><h3>Equipment</h3><div className="opponent-inspection-card-row">{inspectPlayer.equipmentCards.length ? inspectPlayer.equipmentCards.map((card) => renderInspectionCard(card)) : <span className="opponent-inspection-empty">None</span>}</div></section>
        <section className="opponent-inspection-zone" aria-label="Judgement Zone"><h3>Judgement Zone</h3><div className="opponent-inspection-card-row">{inspectPlayer.judgementCards.length ? inspectPlayer.judgementCards.map((card) => renderInspectionCard(card, judgementInFlight?.has(card.id))) : <span className="opponent-inspection-empty">None</span>}</div></section>
        <section className="opponent-inspection-zone" aria-label="Concealed Hand" data-concealed-hand-count={inspectPlayer.handCount}><h3>Hand · {inspectPlayer.handCount}</h3><div className="hero-focus-inspect-hand" aria-label={`${inspectPlayer.handCount} concealed hand cards`}><span className="hero-focus-inspect-hand-backs" aria-hidden="true">{Array.from({ length: Math.min(3, inspectPlayer.handCount) }, (_, index) => <i key={index} />)}</span><strong>{inspectPlayer.handCount} {inspectPlayer.handCount === 1 ? "card" : "cards"}</strong></div></section>
      </div>
    </div>;
  }
  if (previewPlayer) {
    const previewHeroName = previewPlayer.hero?.name ?? "Unknown Hero";
    return <div className="hero-focus hero-focus-preview" aria-label={`Preview target ${previewPlayer.name}`} data-hero-focus-mode="PREVIEW" data-preview-player-id={previewPlayer.id}>
      <div className="hero-focus-heading"><span>HERO FOCUS</span><strong>PREVIEW TARGET</strong></div>
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
  return <div className="hero-focus" aria-label={hideArchitecturalLabel ? roleLabelOverride ?? "Target" : "Hero Focus"} data-hero-focus="true" data-hero-focus-player-id={view.primary.id} data-hero-focus-role={roleLabelOverride ?? view.roleLabel ?? undefined} data-hero-focus-source-id={view.source.id ?? undefined} data-hero-focus-known={view.primary.known ? "true" : "false"}>
    <div className="hero-focus-heading">{!hideArchitecturalLabel && <span>HERO FOCUS</span>}<strong>{roleLabelOverride ?? view.roleLabel}</strong></div>
    <div className="hero-focus-body">
      <span className={hero ? "hero-focus-portrait" : "hero-focus-portrait hero-focus-portrait-empty"} data-hero-id={view.primary.heroId ?? undefined}>{hero ? <HeroPortrait hero={hero} /> : "?"}</span>
      <div className="hero-focus-identity"><b>{view.primary.name}</b>{heroName && <span>{heroName}</span>}{hp && <small>{hp}</small>}</div>
      {showSource && view.source.id && view.source.id !== view.primary.id && <small className="hero-focus-source">SOURCE · {view.source.name}</small>}
    </div>
    {view.nestedContext && <small className="hero-focus-context">{view.nestedContext}</small>}
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

export function InteractionStage({ view, viewerId, transitionKind = "NONE", topRowMode = false, resolvePlayerName, resolvePlayerDisplay, previewPlayer = null, previewSubmission = null, inspectPlayer = null, judgementInFlight, onCloseInspect, onHeroInfo, onInfoCard }: { view: PresentationClientView; viewerId: string | null; transitionKind?: PresentationTransitionKind; topRowMode?: boolean; resolvePlayerName: (playerId: string) => string | null | undefined; resolvePlayerDisplay?: (playerId: string) => HeroFocusPlayerDisplay | null | undefined; previewPlayer?: LocalTargetPreviewPresentation | null; previewSubmission?: LocalTargetPreviewSubmission | null; inspectPlayer?: LocalOpponentInspectionPresentation | null; judgementInFlight?: ReadonlySet<string>; onCloseInspect?: () => void; onHeroInfo?: (hero: Hero) => void; onInfoCard?: (card: Card) => void }) {
  const stage = buildInteractionStageView(view, resolvePlayerName);
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
  const isOpenNegationResponse = display.visible && stage.stage === "NEGATION";
  const mediumSource = projectMediumSourceForViewer(stage, heroFocus, viewerId, resolvePlayerDisplay);
  const groupTargetScope = projectGroupTargetScopeForViewer(stage, heroFocus, mediumSource, viewerId, resolvePlayerDisplay);
  const localFocusPlayerId = inspectPlayer?.id ?? localPreviewPlayer?.id;
  const showMediumSource = Boolean(mediumSource && mediumSource.player.id !== localFocusPlayerId && !hasLocalInspect);
  const currentEffect = display.visible
    && (stage.stage === "ATTACK_RESPONSE" || stage.stage === "NEGATION")
    && stage.activeTargets.length === 1
    ? stage.effect?.trim() || null
    : null;
  const currentEffectConnectsToFocus = Boolean(currentEffect
    && !hasLocalFocus
    && heroFocus.primary?.id
    && stage.activeTargets.some((target) => target.id === heroFocus.primary?.id));
  const dyingSourceAlreadyVisible = Boolean(dyingHandoff.visible && stage.source.id && (
    mediumSource?.player.id === stage.source.id
    || (heroFocus.primary?.id && heroFocus.primary.id !== stage.source.id && heroFocus.source.id === stage.source.id)
  ));
  const dyingFocusAlreadyVisible = Boolean(dyingHandoff.visible && display.focusTarget.id && (
    heroFocus.primary?.id === display.focusTarget.id
    || dyingHandoff.dyingPlayer.id === display.focusTarget.id
  ));
  const showRoleSummary = display.visible && !isOpenNegationResponse && (hasLocalFocus || !(dyingSourceAlreadyVisible && dyingFocusAlreadyVisible));
  const nonDyingSourceAlreadyVisible = Boolean(!hasLocalFocus && !dyingHandoff.visible && stage.source.id && (
    showMediumSource && mediumSource?.player.id === stage.source.id
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
  const showDecisionSummary = display.showDecision && !isOpenNegationResponse && !(currentEffect && display.isViewerDecisionActor) && !(dyingHandoff.visible
    && display.decisionActor.id
    && dyingHandoff.decisionActor.id === display.decisionActor.id);
  const showResolverSummary = display.showResolver && !isOpenNegationResponse && !(dyingHandoff.visible
    && display.activeResolver.id
    && dyingHandoff.activeResolver.id === display.activeResolver.id);
  const showNestedContextSummary = Boolean(display.nestedContext)
    && !(dyingHandoff.visible && heroFocus.primary && heroFocus.nestedContext === display.nestedContext);
  const showFocusSummary = showRoleSummary
    && (!display.currentParticipantPresentedInHeroFocus || hasLocalFocus)
    && !focusIdentityAlreadyVisible;
  const showActiveScopeSummary = showRoleSummary
    && display.currentParticipantPresentedInHeroFocus
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
  if (!display.visible && !hasLocalFocus) return null;
  return <section className="interaction-stage" aria-label={isOpenNegationResponse ? "Negation Response" : "Interaction Stage"} data-interaction-id={display.visible ? stage.interactionId ?? undefined : undefined} data-checkpoint-id={display.visible ? stage.checkpointId ?? undefined : undefined} data-presentation-revision={display.visible ? stage.presentationRevision ?? undefined : undefined} data-stage={display.visible ? stage.stage ?? undefined : undefined} data-stable-kind={display.visible ? stage.stableKind : undefined} data-continuity={display.visible ? stage.continuity.relation : undefined} data-parent-frame-id={display.visible ? stage.parentFrameId ?? undefined : undefined} data-current-effect={currentEffect ?? undefined} data-presentation-transition={display.visible ? transitionKind : "NONE"} data-local-ui-mode={hasLocalInspect ? "INSPECT" : hasLocalPreview ? "PREVIEW" : undefined} data-local-inspect-player-id={inspectPlayer?.id} data-local-preview-player-id={!hasLocalInspect ? localPreviewPlayer?.id : undefined}>
    <header>{!isOpenNegationResponse && <span>INTERACTION STAGE</span>}<strong>{hasLocalInspect ? `INSPECT · ${inspectPlayer.name}` : hasLocalPreview ? `PREVIEW · ${localPreviewPlayer.name}` : currentEffect && isOpenNegationResponse ? "NEGATION RESPONSE" : currentEffect ? stage.stageLabel : display.focusLabel}</strong>{showViewerDecisionMarker && <em>YOUR DECISION</em>}</header>
    <div className="interaction-stage-body">
      <div className="interaction-stage-hero-region">
        {showMediumSource && mediumSource && <MediumParticipantCard view={mediumSource} />}
        {showMediumSource && mediumSource && <span className="medium-participant-arrow" data-medium-source-arrow="true" aria-hidden="true">{topRowMode ? "→" : "↓"}</span>}
        <div className={`interaction-stage-current-effect-flow${currentEffect ? currentEffectConnectsToFocus ? " is-connected" : " is-unlinked" : " is-empty"}`}>
          {currentEffect && <section className="interaction-stage-current-effect" role="group" aria-label="Current Effect" data-current-effect-label={currentEffect}><small>{isOpenNegationResponse ? "EFFECT" : "CURRENT EFFECT"}</small><strong>{currentEffect}</strong></section>}
          {currentEffectConnectsToFocus && <span className={`current-effect-arrow${topRowMode ? " top-row-arrow" : " side-column-arrow"}`} aria-hidden="true">{topRowMode ? "→" : "↓"}</span>}
          <HeroFocus view={heroFocus} showSource={!showMediumSource} previewPlayer={localPreviewPlayer} inspectPlayer={inspectPlayer} hideArchitecturalLabel={isOpenNegationResponse} roleLabelOverride={isOpenNegationResponse ? "Target" : null} judgementInFlight={judgementInFlight} onCloseInspect={onCloseInspect} onHeroInfo={onHeroInfo} onInfoCard={onInfoCard} />
        </div>
        {groupTargetScope && <section className="group-target-scope" aria-label="Original target scope" data-group-target-scope="original" data-participant-density={groupTargetScope.density}>
          <header>ORIGINAL TARGET SCOPE</header>
          <div className="group-target-cards">
            {groupTargetScope.players.map((player) => {
              const hero = heroDefinition(player.heroId);
              return <div className="group-target-card" key={player.id} data-group-target-id={player.id}>
                <span className="group-target-portrait">{hero ? <HeroPortrait hero={hero} /> : "?"}</span>
                <div className="group-target-identity"><b>{player.name}</b>{groupTargetScope.density === "medium" && player.heroName && <span>{player.heroName}</span>}{player.hp !== null && <small>HP {player.hp}{player.maxHp !== null ? `/${player.maxHp}` : ""}</small>}</div>
              </div>;
            })}
          </div>
        </section>}
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
        {reactionChain.visible && reactionChain.root && reactionChain.active && <section className="reaction-chain" aria-label="Reaction Chain" data-reaction-chain="proven" data-reaction-interaction-id={reactionChain.interactionId ?? undefined}>
          <header><span>REACTION CHAIN</span></header>
          <ol>
            <li data-reaction-node="root"><small>{isOpenNegationResponse ? "ORIGINAL EFFECT" : "ROOT EFFECT"}</small><b>{reactionChain.root.effect}</b><span>{reactionChain.root.source.name} → {reactionChain.root.targets.length ? reactionChain.root.targets.map((target) => target.name).join(", ") : "No proven target"}</span></li>
            <li data-reaction-node="active" data-reaction-relation={reactionChain.active.relation} data-negation-window-state={isOpenNegationResponse ? "open" : undefined}>
              <small>{isOpenNegationResponse ? "NEGATION WINDOW" : "ACTIVE RESPONSE"}</small>
              {isOpenNegationResponse
                ? <><b data-stage-meta-role="scope">A Negation may be played now.</b><span>Waiting for response...</span></>
                : <><b>{reactionChain.active.label}</b>{reactionChain.active.decisionActor.id && <span>DECISION · {reactionChain.active.decisionActor.name}</span>}</>}
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
          {showDecisionSummary && <span><small>DECISION</small><b>{display.decisionActor.name}</b></span>}
          {showResolverSummary && <span><small>RESOLVER</small><b>{display.activeResolver.name}</b></span>}
          {display.showOriginalTargets && <span><small>ORIGINAL SCOPE</small><b>{display.originalTargetSummary}</b></span>}
          {showNestedContextSummary && <span><small>CONTEXT</small><b>{display.nestedContext}</b></span>}
        </div>}
      </div>}
    </div>
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

function Countdown({ durationMs, deadline = 0, visibleAt = 0, label = "Continuing in" }: { durationMs: number; deadline?: number; visibleAt?: number; label?: string }) {
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
  if (!visible) return null;
  return <div className="visible-countdown" aria-label={`${label} ${remainingSeconds} seconds`}><span>{label}</span><b>{remainingSeconds}s</b></div>;
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
  "guo-jia": { "Jealousy of God": ["guo_jia_jealousy_of_god"], Legacy: ["guo_jia_legacy"] },
  "zhen-ji": { "Godess of Luo River": ["zhen_ji_luoshen"] },
  "liu-bei": { Benevolence: ["liu_bei_rende"], Influencing: ["liu_bei_jijiang"] },
  "sun-quan": { Equilibrium: ["sun_quan_zhiheng"], Deliverance: ["sun_quan_jiuyuan"] },
  "gan-ning": { Ambushment: ["gan_ning_qixi"] },
  "lu-meng": { Composure: ["lu_meng_keji"] },
  "yue-jin": { Dauntless: ["yue_jin_dauntless"] },
  "zhou-yu": { Heroic: ["zhou_yu_yingzi"], "Sowing Distrust": ["zhou_yu_fanjian"] },
  "lu-xun": { "Second Wind": ["lu_xun_second_wind"] },
  daqiao: { Captivating: ["daqiao_captivating"], Deflection: ["daqiao_deflection"] },
  "diao-chan": { Lust: ["diao_chan_lust"], "Beauty Outshining the Moon": ["diao_chan_beauty_outshining_moon"] },
  "hua-tuo": { "Prodigal Healer": ["hua_tuo_prodigal_healer"] },
  "sun-shangxiang": { Betrothment: ["sun_shangxiang_betrothment"], Daredevil: ["sun_shangxiang_daredevil"] },
  "huang-yueying": { Cultivation: ["huang_yueying_cultivation"] },
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
    {selectable ? <button type="button" className="local-zone-card-button" aria-label={`Select ${cardDefinition(card.kind).name}`} disabled={!equipmentSelection || equipmentSelection.disabled || !equipmentSelection.eligibleIds.includes(card.id)} onClick={() => equipmentSelection?.onToggle(card.id)} /> : <button type="button" className="local-zone-card-button" aria-label={`Explain ${cardDefinition(card.kind).name}`} onClick={() => onInfoCard(card)} />}
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
  const targetTableIndex = pickerTarget ? room.players.findIndex((player) => player.id === pickerTarget.id) : -1;
  const targetRelativeIndex = targetTableIndex >= 0 ? (targetTableIndex - myTableIndex + room.players.length) % room.players.length : 0;
  const targetAngle = 180 + (360 / room.players.length) * targetRelativeIndex;
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
  const choiceTriggerOption = mandatoryChoiceTriggerOption ?? triggerOptions.find((option) => option.selection?.type === "choice") ?? null;
  const selectedTriggerOption = choiceTriggerOption ?? triggerOptions.find((option) => option.effectId === responseProviderId) ?? null;
  // Mapped hero skills (such as Retaliation) must be activated from the
  // profile before their target-card picker appears. Unmapped semantic
  // providers retain the generic picker path for equipment and future
  // effects that have no Skills-panel control.
  const targetCardPickerOption = activeSkillOption?.selection?.type === "target_cards"
    ? activeSkillOption
    : triggerOptions.find((option) => option.selection?.type === "target_cards" && !heroTriggerEffectIds.has(option.effectId)) ?? null;
  const targetCardPickerSelection = targetCardPickerOption?.selection?.type === "target_cards" ? targetCardPickerOption.selection : null;
  const targetCardPickerTarget = targetCardPickerSelection ? room.players.find((player) => player.id === targetCardPickerSelection.targetId) ?? null : null;
  const pendingTargetCardAvailabilityKey = pickerTarget
    ? [pickerTarget.id, pickerTarget.handCount, ...pickerTarget.equipmentCards.map((card) => card.id), ...pickerTarget.judgementCards.map((card) => card.id)].join("|")
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
  const localEquipmentSelection = activeSkillSelection
    ? { eligibleIds: activeSkillSelection.eligibleCardIds, selectedIds: activeSkillSelectedCardIds, max: activeSkillSelection.max, disabled: busy || presentationBusy, onToggle: (cardId: string) => setActiveSkillSelectionState((state) => { if (!state || !activeSkillStateIsCurrent) return state; const validIds = state.cardIds.filter((id) => activeSkillSelection.eligibleCardIds.includes(id)); return validIds.includes(cardId) ? { ...state, cardIds: validIds.filter((id) => id !== cardId) } : validIds.length < activeSkillSelection.max ? { ...state, cardIds: [...validIds, cardId] } : { ...state, cardIds: validIds }; }) }
    : triggerResponse && triggerSelectionUsesCards
      ? { eligibleIds: triggerCardOption?.selection?.type === "cards" ? triggerCardOption.selection.eligibleCardIds : [], selectedIds: triggerSelectedCardIds, max: triggerSelectionMax, disabled: busy || !responseDecisionReady, onToggle: (cardId: string) => setSerpentSelected((ids) => ids.includes(cardId) ? ids.filter((id) => id !== cardId) : ids.length < triggerSelectionMax ? [...ids, cardId] : ids) }
      : null;
  const responseCardAllowed = (item: Card) => activeSkillSelection ? true : selectedResponseProvider?.selection?.type === "cards"
    ? selectedResponseProvider.selection.eligibleCardIds.includes(item.id)
    : triggerCardOption?.selection?.type === "cards" && triggerCardOption.selection.eligibleCardIds.includes(item.id);
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
  const pendingTargetCardSelectionComplete = Boolean(
    canChooseTargetCard && pickerTarget && targetCardZone &&
    (targetCardZone === "hand" ? targetCardIndex !== null && targetCardIndex >= 0 && targetCardIndex < pickerTarget.handCount :
      targetCardId && (targetCardZone === "equipment" ? pickerTarget.equipmentCards.some((card) => card.id === targetCardId) : pickerTarget.judgementCards.some((card) => card.id === targetCardId))),
  );
  const confirmPendingTargetCard = async () => {
    if (!pendingTargetCardSelectionComplete || busy || !room.pendingTargetCard) return;
    const payload = { targetCardZone, ...(targetCardZone === "hand" ? { targetCardIndex } : { targetCardId }) };
    const submissionKey = `${room.actionRevision ?? ""}|${room.pendingTargetCard.targetId}|${JSON.stringify(payload)}`;
    if (targetCardSubmissionRef.current === submissionKey) return;
    targetCardSubmissionRef.current = submissionKey;
    const accepted = await onAction("choose_target_card", payload);
    if (!accepted) targetCardSubmissionRef.current = "";
  };
  const cancelTargetCardPicker = () => {
    if (busy || presentationBusy) return;
    if (activeSkillOption?.selection?.type === "target_cards") resetLocalTargetFlow("active-skill");
    else { setTriggerSelectedKeys([]); targetCardPickerSubmissionRef.current = ""; }
  };
  const cancelLocalTargetSelection = () => {
    if (!localTargetSelection.selectionActive || !localTargetFlow || busy || presentationBusy) return;
    resetLocalTargetFlow(localTargetFlow);
  };
  const canUseLongdanInResponse = Boolean(me?.hero === "zhao-yun" && responseDecisionReady && longdanResponseOptions.length > 0);
  const wushengButtonDisabled = busy || wushengMode === null && (!canUseWushengInPlay && !(responseDecisionReady && canUseWushengInResponse) || canUseWushengInPlay && presentationBusy);
  const longdanButtonDisabled = busy || longdanMode === null && (!canUseLongdanInPlay && !(responseDecisionReady && canUseLongdanInResponse) || canUseLongdanInPlay && presentationBusy);
  const heroSkillButtons: HeroSkillButtonModel[] = (localHero?.skills ?? []).map((skill) => {
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
    const responseOption = responseDecisionReady ? semanticResponseOptions.find((option) => responseEffectIds.includes(option.providerId)) ?? null : null;
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
  const rescueDecisionReady = canRescue && !presentationBusy;
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
  const tablePresentationVisible = sequenceEvents.length > 0 || Boolean(displayedEvent && eventCards(displayedEvent).length);
  const seatCountdown = room.phase === "response" && responseDecisionReady && room.actionPlayerId && responseDeadline > 0 ? { playerId: room.actionPlayerId, key: `response-${room.actionPlayerId}-${responseDeadline}`, durationMs: 0, deadline: responseDeadline, label: "Respond" }
    : room.pendingHarvest?.countdownUntil ? { playerId: room.pendingHarvest.actorId, key: `harvest-${room.pendingHarvest.actorId}-${room.pendingHarvest.countdownUntil}`, durationMs: 0, deadline: room.pendingHarvest.countdownUntil, label: room.pendingHarvest.complete ? "Closing" : "Choosing" }
    : rescueDecisionReady && room.pendingDying?.deadline ? { playerId: room.actionPlayerId ?? room.meId, key: `rescue-${room.pendingDying.deadline}`, durationMs: 0, deadline: room.pendingDying.deadline, label: "Rescue" }
    : null;
  // Seat countdown ownership remains keyed by seatCountdown?.playerId === player.id.
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
  }, [room.timeline, timelineKey, optimisticPlay, activeEvent, eventQueue.length]);
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
    : targetCardPickerOption && targetCardPickerSelection
      ? { active: true, hasInput: triggerSelectedKeys.length > 0, count: triggerSelectedKeys.length, min: targetCardPickerSelection.min, max: targetCardPickerSelection.max, summary: `${triggerSelectedKeys.length} card key${triggerSelectedKeys.length === 1 ? "" : "s"} selected` }
      : selectedResponseProvider?.selection?.type === "cards"
          ? { active: true, hasInput: responseSelectedCardIds.length > 0, count: responseSelectedCardIds.length, min: selectedResponseProvider.selection.min, max: selectedResponseProvider.selection.max, summary: `${responseSelectedCardIds.length} card${responseSelectedCardIds.length === 1 ? "" : "s"} selected` }
          : room.phase === "discard"
            ? { active: true, hasInput: discardSelected.length > 0, count: discardSelected.length, min: excessCards, max: excessCards, summary: `${discardSelected.length} of ${excessCards} selected` }
            : undefined;
  const consolePrimaryCandidates = [
    ...(borrowedSwordTargetSelectionActive && canUseAction(room.currentAction, "choose_borrowed_sword_target") ? [{ id: "borrowed-sword", label: "Confirm", enabled: localTargetSelection.canConfirm, priority: 80 }] : []),
    ...(activeSkillSelection || activeSkillTargetSelection ? [{ id: "active-skill", label: "Confirm", enabled: canUseAction(room.currentAction, "trigger") && Boolean(activeSkillComplete && activeSkillSubmission && (!activeSkillTargetSelection || localTargetSelection.canConfirm)), priority: 70 }] : []),
    ...(triggerResponse && canUseAction(room.currentAction, "trigger") && selectedTriggerOption?.selection?.type === "cards" ? [{ id: "trigger-cards", label: "Confirm", enabled: triggerSubmissionComplete, priority: 70 }] : []),
    ...(triggerResponse && canUseAction(room.currentAction, "trigger") && selectedTriggerOption?.selection?.type === "target" ? [{ id: "trigger-target", label: "Confirm", enabled: localTargetSelection.canConfirm, priority: 70 }] : []),
    ...(canRespond && selectedResponseProvider ? [{ id: "response", label: "Confirm", enabled: canUseAction(room.currentAction, "respond") && responseSelectionComplete, priority: 60 }] : []),
    ...(rescueDecisionReady && !canRespond ? [{ id: "rescue", label: "Peach", enabled: canUseAction(room.currentAction, "give_peach") && card?.kind === "Peach", priority: 60 }] : []),
    ...(room.isMyTurn && room.phase === "discard" && currentActionOwnedByViewer ? [{ id: "discard", label: `Discard ${excessCards} selected`, enabled: canUseAction(room.currentAction, "discard_cards") && discardSelected.length === excessCards, priority: 60 }] : []),
    ...(room.isMyTurn && canPlay && currentActionOwnedByViewer ? [{ id: "turn", label: serpentMode ? "Form Attack" : normalTargetSelectionActive ? "Confirm" : "Play", enabled: (canUseAction(room.currentAction, "play_card") || canUseAction(room.currentAction, "serpent_spear_attack")) && (serpentMode ? canDeclareAttack && serpentSelected.length === 2 && attackTargetsValid : Boolean(card) && (!selectedCanPlayAsAttack || canDeclareAttack && attackTargetsValid) && !(["Dodge", "Negation"].includes(card?.kind ?? ""))), priority: 40 }] : []),
  ];
  const consoleIsDecisionActor = currentActionOwnedByViewer;
  const consoleAuthoritativeDecision = Boolean(room.currentAction && room.currentAction.kind !== "none" && (consoleIsDecisionActor || room.isMyTurn && room.currentAction.kind === "turn" && currentActionOwnedByViewer));
  const consoleInstruction = consoleIsDecisionActor
    ? room.currentAction?.kind === "trigger" ? decisionInstruction(room.currentAction, room.currentAction.reason) : decisionPresentation.primaryStatus
    : decisionPresentation.isWaiting
      ? decisionPresentation.supportingInstruction
      : room.currentAction?.reason || decisionPresentation.supportingInstruction;
  const consoleDecline = responseDamageAction || triggerDeclineAction ? { label: "Skip", enabled: true } : null;
  const consoleSecondaryControls = [
    ...(triggerOptions.filter((option) => !heroTriggerEffectIds.has(option.effectId) || option.selection?.type === "choice").map((option) => option.label)),
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
    localCancel: { visible: localTargetSelection.canCancel && !triggerHasProviderCancelSurface && !normalHasProviderCancelSurface || Boolean(canChooseTargetCard || targetCardPickerOption && (!activeSkillOption || activeSkillOption.effectId !== targetCardPickerOption.effectId)), enabled: localTargetSelection.canCancel || canChooseTargetCard || Boolean(targetCardPickerOption) },
    authoritativeDecline: consoleDecline,
    secondaryControls: consoleSecondaryControls,
  });
  const consolePrimaryId = consoleDecision.primary?.id ?? null;
  return <main className="game-shell" data-presentation-kind={clientPresentation.stableKind} data-presentation-has-interaction={clientPresentation.hasInteraction ? "true" : "false"} data-presentation-local-control={clientPresentation.hasLocalControl ? "true" : "false"} data-presentation-transition={presentationTransition.kind}><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b></div><div className="top-actions"><button className="text-button" onClick={onLeave}>Exit</button></div></header>
    <section className="action-strip" aria-label="Turn and decision ownership"><div className="action-step"><small>TURN OWNER</small><b>{decisionPresentation.turnOwner}</b></div><span className="action-arrow">→</span><div className="action-step"><small>PHASE</small><b>{decisionPresentation.phaseLabel}</b></div><span className="action-arrow">→</span><div className="action-step acting"><small>{decisionPresentation.isDecision ? "DECISION OWNER" : "CURRENT TURN"}</small><b>{decisionPresentation.actionOwner}{decisionPresentation.isViewerRequiredActor ? " · YOU" : ""}</b></div></section>
    <section className={`play-table ${sequenceEvents.length > 0 ? "sequence-active" : ""} ${resolutionClosing ? "sequence-concluding" : ""}`} data-seat-topology={room.players.length >= 5 ? "side-column" : "top-row"}>
      <div className="interaction-safe-zone"><InteractionStage view={clientPresentation} viewerId={room.meId} topRowMode={room.players.length <= 4} transitionKind={presentationTransition.kind} resolvePlayerName={(playerId) => room.players.find((player) => player.id === playerId)?.name ?? null} resolvePlayerDisplay={(playerId) => {
        const player = room.players.find((candidate) => candidate.id === playerId);
        if (!player) return null;
        const hero = heroDefinition(player.hero);
        return { name: player.name, heroId: hero?.id ?? player.hero, heroName: hero?.name ?? (player.hero ? heroName(player.hero) : null), hp: player.hp, maxHp: player.maxHp };
      }} previewPlayer={targetPreviewPresentation} previewSubmission={submittedTargetPreview} inspectPlayer={opponentInspectionPresentation} judgementInFlight={judgementInFlight} onCloseInspect={() => setExpandedOpponentId(null)} onHeroInfo={setInfoHero} onInfoCard={setInfoCard} /></div>
      <aside className={`game-messages ${messagesCollapsed ? "collapsed" : ""}`} aria-label="Game Messages"><header><button type="button" onClick={() => setMessagesCollapsed((collapsed) => !collapsed)} aria-label={messagesCollapsed ? "Expand game messages" : "Collapse game messages"} aria-expanded={!messagesCollapsed}>{messagesCollapsed ? "▣" : "—"}</button></header>{!messagesCollapsed && <div aria-live="polite">{gameMessages.length ? gameMessages.map((entry, index) => <p className={index === gameMessages.length - 1 ? "latest" : ""} key={entry.id}><span>{entry.message}</span></p>) : <p className="empty">No gameplay messages yet.</p>}</div>}</aside>
      <button type="button" className="game-exit" onClick={onLeave}>Exit</button>
      {turnNotice && <div className="turn-notice" role="status"><span>TURN BEGINS</span><b>{turnNotice}</b></div>}
      {effectNotice && <div className="turn-notice effect-notice" role="status"><span>EFFECT TRIGGERED</span><b>{effectNotice}</b></div>}
      {canChooseBorrowedSword && <div className="turn-notice borrowed-sword-notice" role="status"><span>BORROWED SWORD</span><b>{borrowedSwordTargetId ? "Target selected · confirm below" : "Choose a legal Attack target"}</b></div>}
      {privateDrawCards.length > 0 && !activeEvent && eventQueue.length === 0 && <div className="played-card-stage private-draw-stage" role="status"><Countdown key={privateDrawCards.map((drawn) => drawn.id).join("-")} durationMs={UI_TIMING.privateDraw} label="Cards close in" /><div className="card-action-title"><b>PRIVATE DRAW</b><span>Only you can see these cards</span></div><div className="private-draw-row">{privateDrawCards.map((drawn) => <CardFace card={drawn} key={drawn.id} />)}</div></div>}
      {privateDistribution && !presentationBusy && <PrivateCardDistributionDialog key={room.actionRevision} cards={privateDistribution.cards} players={room.players.filter((player) => privateDistribution.eligibleRecipientIds.includes(player.id) && player.alive)} disabled={busy} error={error} onSubmit={(assignments) => onAction("trigger", { providerId: "private_card_distribution", assignments })} />}
      {privateDeckReorder && <PrivateDeckReorderDialog key={room.actionRevision} cards={privateDeckReorder.cards} minTop={privateDeckReorder.minTop} maxTop={privateDeckReorder.maxTop} disabled={busy} error={error} onSubmit={(topCardIds, bottomCardIds) => onAction("trigger", { providerId: "private_deck_reorder", topCardIds, bottomCardIds })} />}
      {tablePresentationVisible && <TableResolutionSequence events={sequenceEvents} activeEvent={displayedEvent} players={room.players} myTableIndex={myTableIndex} concluding={resolutionClosing} />}
      {room.pendingHarvest && !presentationBusy && <div className="game-event-stage harvest-choice-stage" role="dialog" aria-label="Bumper Harvest card choice"><div><span>BUMPER HARVEST</span><b>{room.pendingHarvest.complete ? "All choices complete" : harvestSubmitting ? "Your choice is submitted" : canChooseHarvest ? "Your turn — choose one card" : `${actor?.name ?? "The next player"} is choosing`}</b><small>{room.pendingHarvest.complete ? "The final shaded card remains visible before Bumper Harvest closes." : harvestSubmitting ? "Your card is shaded immediately while the next choice is prepared." : canChooseHarvest ? "Tap any available card to change your selection, then confirm. Selection changes are instant." : "Watch the current player's card rise, then become shaded when confirmed."}</small><div className="harvest-card-row">{room.pendingHarvest.revealed.map((choice) => { const takenBy = room.pendingHarvest?.choices.find((entry) => entry.cardId === choice.id); const submittedByMe = harvestSubmitting?.cardId === choice.id; const available = room.pendingHarvest?.availableIds.includes(choice.id); const awaitingConfirmation = !submittedByMe && activeHarvestSelection === choice.id; return <button type="button" className={`harvest-card-choice ${takenBy || submittedByMe ? "taken" : ""} ${awaitingConfirmation ? "pending-choice" : ""}`} disabled={!canChooseHarvest || Boolean(harvestSubmitting) || busy || !available} aria-pressed={awaitingConfirmation} aria-label={takenBy ? `${cardDefinition(choice.kind).name}, taken by ${takenBy.playerName}` : submittedByMe ? `${cardDefinition(choice.kind).name}, choice submitted by ${harvestSubmitting?.playerName ?? "ME"}` : `${cardDefinition(choice.kind).name}, ${awaitingConfirmation ? `selected by ${actor?.name ?? "current player"}, awaiting confirmation` : "available"}`} key={choice.id} onClick={() => { const nextCardId = activeHarvestSelection === choice.id ? "" : choice.id; setHarvestSelected(nextCardId); void publishHarvestPreview(nextCardId); }}><CardFace card={choice} />{takenBy && <strong className="harvest-taken-label">Taken by {takenBy.playerName}</strong>}{submittedByMe && !takenBy && <strong className="harvest-taken-label">Chosen by {harvestSubmitting?.playerName ?? "ME"}</strong>}{awaitingConfirmation && <strong className="harvest-pending-label">Selected by {actor?.name ?? "player"}</strong>}</button>; })}</div>{canChooseHarvest && (harvestSubmitting ? <div className="harvest-confirm-row"><small>Choice submitted · moving to the next player</small></div> : <div className="harvest-confirm-row"><small>{harvestSelectedCard ? `${cardDefinition(harvestSelectedCard.kind).name} selected` : "Select a card before confirming"}</small><button type="button" className="primary" disabled={busy || !harvestSelectedCard} onClick={async () => { if (!harvestSelectedCard || !me) return; const submission = { cardId: harvestSelectedCard.id, playerId: me.id, playerName: me.name }; queuedHarvestPreview.current = null; setHarvestSubmitting(submission); setHarvestSelected(""); const accepted = await onAction("choose_harvest", { cardId: submission.cardId }); if (!accepted) setHarvestSubmitting(null); }}>Confirm choice</button></div>)}</div></div>}
      <div className="play-center" aria-label="Card piles"><div className="draw-stack" data-draw-anchor="true" aria-label={`Draw pile, ${room.deckCount} cards`}><b>{room.deckCount}</b><span>DECK</span></div><div className="discard-stack" data-discard-anchor="true" data-discard-kind={visibleDiscardTop?.kind} aria-label={visibleDiscardTop ? `Discard pile, ${cardDefinition(visibleDiscardTop.kind).name}` : "Discard pile, empty"}>{visibleDiscardTop ? <CardFace card={visibleDiscardTop} /> : <b className="discard-empty">—</b>}<span>DISCARD</span></div></div>
      {canChooseTargetCard && pickerTarget && <div className="hidden-card-picker table-hidden-card-picker target-card-picker" style={{ "--angle": `${targetAngle}deg` } as React.CSSProperties} role="dialog" aria-modal="true" aria-label={`Choose one current card from ${pickerTarget.name}`}><span>{pickerTarget.name}&apos;s cards</span>{pickerTarget.handCount > 0 && <section><small>Hand</small><div>{Array.from({ length: pickerTarget.handCount }, (_, index) => <button type="button" aria-label={`Hidden hand card ${index + 1}`} className={targetCardZone === "hand" && targetCardIndex === index ? "selected" : ""} aria-pressed={targetCardZone === "hand" && targetCardIndex === index} key={index} onClick={() => { setTargetCardZone("hand"); setTargetCardIndex(index); setTargetCardId(""); }}>?</button>)}</div></section>}{pickerTarget.equipmentCards.length > 0 && <section><small>Equipment</small><div>{pickerTarget.equipmentCards.map((item) => <button type="button" className={targetCardZone === "equipment" && targetCardId === item.id ? "selected named" : "named"} aria-pressed={targetCardZone === "equipment" && targetCardId === item.id} key={item.id} onClick={() => { setTargetCardZone("equipment"); setTargetCardId(item.id); setTargetCardIndex(null); }}>{cardDefinition(item.kind).name}</button>)}</div></section>}{pickerTarget.judgementCards.length > 0 && <section><small>Judgement</small><div>{pickerTarget.judgementCards.map((item) => <button type="button" className={targetCardZone === "judgement" && targetCardId === item.id ? "selected named" : "named"} aria-pressed={targetCardZone === "judgement" && targetCardId === item.id} key={item.id} onClick={() => { setTargetCardZone("judgement"); setTargetCardId(item.id); setTargetCardIndex(null); }}>{cardDefinition(item.kind).name}</button>)}</div></section>}<div className="target-picker-actions">{consoleDecision.localCancel.visible && <button className="end" disabled={busy || presentationBusy || !consoleDecision.localCancel.enabled} onClick={clearPendingTargetCardSelection}>Cancel</button>}<button className="primary" disabled={busy || !pendingTargetCardSelectionComplete} onClick={() => void confirmPendingTargetCard()}>{busy ? "Resolving…" : room.pendingTargetCard?.cardKind === "Steal" ? "Obtain selected" : "Discard selected"}</button></div>{error && <p className="error" role="alert">{error}</p>}</div>}
      {triggerResponse && responseDecisionReady && targetCardPickerOption && targetCardPickerSelection && targetCardPickerTarget && <TargetCardPicker option={targetCardPickerOption} selection={targetCardPickerSelection} target={targetCardPickerTarget} selectedKeys={triggerSelectedKeys} disabled={responseControlsDisabled} canDecline={Boolean(consoleDecision.authoritativeDecline)} showCancel={consoleDecision.localCancel.visible && (!activeSkillOption || activeSkillOption.effectId !== targetCardPickerOption.effectId)} error={error} onToggle={(key) => setTriggerSelectedKeys((keys) => { const validKeys = keys.filter((selectedKey) => targetCardPickerSelection.eligibleKeys.includes(selectedKey)); return validKeys.includes(key) ? validKeys.filter((selectedKey) => selectedKey !== key) : validKeys.length < targetCardPickerSelection.max ? [...validKeys, key] : validKeys; })} onUse={async (keys) => { const submissionKey = `${room.actionRevision ?? ""}|${targetCardPickerOption.effectId}|${keys.join("|")}`; if (targetCardPickerSubmissionRef.current === submissionKey) return; targetCardPickerSubmissionRef.current = submissionKey; const accepted = await onAction("trigger", { providerId: targetCardPickerOption.effectId, cardKeys: keys }); if (!accepted) targetCardPickerSubmissionRef.current = ""; }} onCancel={cancelTargetCardPicker} onDecline={() => onAction("decline_trigger")} />}
      {triggerResponse && responseDecisionReady && choiceTriggerOption?.selection?.type === "choice" && <MandatoryChoiceDialog option={choiceTriggerOption} selection={choiceTriggerOption.selection} hand={room.myHand} selectedChoice={triggerChoice} selectedKeys={triggerSelectionKeys} disabled={responseControlsDisabled} error={error} onChoice={(choice) => { setTriggerChoice(choice); setTriggerSelectedKeys([]); }} onToggle={(key) => { const validKeys = triggerSelectedKeys.filter((selectedKey) => choiceTriggerOption.selection?.type === "choice" && choiceTriggerOption.selection.eligibleHandKeys.includes(selectedKey)); const required = choiceTriggerOption.selection?.type === "choice" ? choiceTriggerOption.selection.cardCountByChoice?.[triggerChoice] ?? (triggerChoice === "discard" ? 1 : 0) : 0; setTriggerSelectedKeys(validKeys.includes(key) ? validKeys.filter((selectedKey) => selectedKey !== key) : validKeys.length < required ? [...validKeys, key] : validKeys); }} onConfirm={(choice, cardKeys) => onAction("trigger", { providerId: choiceTriggerOption.effectId, choice, ...(cardKeys.length ? { cardKeys } : {}) })} />}
      {room.status === "finished" && <div className="victory-banner"><span>MATCH COMPLETE</span><b>{room.log.at(-1)?.replace("! The match is over.", "")}</b><small>All roles are now revealed at the table.</small></div>}
      {groupScopePreview.active && <p className="group-scope-preview-label" data-group-scope-preview={groupScopePreview.cardKind ?? undefined} role="status">PREVIEW · {groupScopePreview.label}</p>}
      <div className="player-board" aria-label="Players" data-player-count={room.players.length} data-seat-topology={room.players.length >= 5 ? "side-column" : "top-row"}>{room.players.filter((player) => player.id !== room.meId).map((player) => { const index = room.players.findIndex((candidate) => candidate.id === player.id); const relativeIndex = (index - myTableIndex + room.players.length) % room.players.length; const selectedTargetCardKind = selectedCanPlayAsAttack ? "Attack" : card?.kind; const cardTargetLegal = Boolean(card && (card.kind === "BorrowedSword" ? borrowedSwordPlayTargetIds.includes(player.id) : selectedTargetCardKind && canTargetCharacter({ sourceId: room.meId, targetId: player.id, targetHero: player.hero, targetHandCount: player.handCount, cardKind: selectedTargetCardKind }))); const targetablePlayer = Boolean((borrowedSwordTargetSelectionActive && borrowedSwordEligibleTargetIds.includes(player.id) && player.alive) || (activeSkillTargetMode && activeSkillTargetIds.includes(player.id) && player.alive) || (triggerTargetSelection?.targetIds.includes(player.id) && triggerTargetMode) || (serpentMode && canPlay) || (card && cardTargetLegal && (selectedCanPlayAsAttack || card.kind === "Dismantle" || card.kind === "Steal" || card.kind === "Duel" || card.kind === "BorrowedSword" || card.kind === "Overindulgence" || card.kind === "RationsDepleted"))); return <OpponentPlayerCard key={`square-${player.id}`} totalPlayers={room.players.length} player={player} viewerId={room.meId} playerHero={heroDefinition(player.hero)} relativeIndex={relativeIndex} isTurn={player.seat === room.turnSeat} isActionPlayer={clientPresentation.stage !== "NEGATION" && player.id === room.actionPlayerId} isSelectedTarget={borrowedSwordTargetId === player.id || targetIds.includes(player.id)} isGroupPreview={groupScopePreview.affectedPlayerIds.includes(player.id)} interactionRoles={projectInteractionSeatRoles(clientPresentation, player.id)} targetSelectionActive={targetSelectionActive} targetablePlayer={targetablePlayer} onTarget={() => { if (borrowedSwordTargetSelectionActive) chooseBorrowedSwordTarget(player.id); else { setTarget(player.id); setTargetCardIndex(null); } }} onInspect={() => setExpandedOpponentId((currentId) => currentId === player.id ? null : player.id)} onHeroInfo={setInfoHero} onInfoCard={setInfoCard} judgementInFlight={judgementInFlight} serpentSelected={serpentSelected} triggerResponse={triggerResponse} triggerSelectionUsesCards={triggerSelectionUsesCards} responseDecisionReady={responseDecisionReady} triggerCardOption={triggerCardOption} onToggleEquipment={(cardId) => setSerpentSelected((ids) => ids.includes(cardId) ? ids.filter((id) => id !== cardId) : ids.length < (triggerResponse && triggerSelectionUsesCards ? triggerSelectionMax : 2) ? [...ids, cardId] : ids)} />; })}</div>
      {seatCountdown && <Countdown key={seatCountdown.key} visibleAt={room.phase === "response" ? room.responseCountdownVisibleAt : 0} durationMs={seatCountdown.durationMs} deadline={seatCountdown.deadline} label={seatCountdown.label} />}
    </section>
    <footer className="play-command">
    <LocalPlayerDock player={me} hero={localHero} selfTargetable={localDockSelfTargetable} selfTargetSelected={localDockSelfTargetSelected} onSelfTarget={() => { setTarget(room.meId); setTargetCardIndex(null); }} isGroupPreview={groupScopePreview.affectedPlayerIds.includes(room.meId)} interactionRoles={projectInteractionSeatRoles(clientPresentation, room.meId)} onHeroInfo={setInfoHero} onInfoCard={setInfoCard} equipmentSelection={localEquipmentSelection} hiddenCardIds={judgementInFlight}
      heroSkillControl={
        <section className="hero-skills local-hero-skills" aria-label="Available hero skills">
          {heroSkillButtons.map((skill) => <button type="button" key={skill.name} className={`hero-skill-button ${skill.active ? "active" : ""}`} aria-label={skill.name} aria-pressed={skill.active} title={skill.description} disabled={!skill.enabled || busy || presentationBusy && !skill.active} onClick={() => skill.onClick?.()}>{skill.active && (me?.hero === "guan-yu" || me?.hero === "zhao-yun") ? `Cancel ${skill.name}` : skill.name}</button>)}
        </section>
      } guidance={
        <div className="console-guidance" data-console-guidance="true">
          <div className={`decision-status ${consoleDecision.controlsVisible ? "decision-status-active" : ""}`} data-console-decision-kind={consoleDecision.kind} data-console-coherent={consoleDecision.coherent ? "true" : "false"} data-console-primary={consoleDecision.primary?.label ?? "none"} data-console-primary-enabled={consoleDecision.primary?.enabled ? "true" : "false"} data-console-selection-count={consoleDecision.selectionCount ?? undefined} data-console-local-cancel={consoleDecision.localCancel.visible ? "true" : "false"} data-console-authoritative-decline={consoleDecision.authoritativeDecline ? "true" : "false"} role="status" aria-live="polite" aria-atomic="true"><small>{consoleDecision.controlsVisible ? "YOUR DECISION" : decisionPresentation.isWaiting ? decisionPresentation.primaryStatus : "GAME STATUS"}</small><strong>{consoleDecision.instruction}</strong>{consoleDecision.selectionSummary && <em>{consoleDecision.selectionSummary}</em>}{consoleDecision.localCancel.visible && <span className="local-target-selection" data-local-target-selection="true"><b>LOCAL CANCEL</b><span>Change your selection before submitting.</span></span>}</div>
          {invalidResponseState && <p className="error" role="status">Waiting for the latest response state…</p>}
          {(activeSkillSelection || activeSkillTargetSelection) && activeSkillOption?.effectId === "diao_chan_lust" && activeSkillSelectedTargetIds.length > 1 && <small role="status">Lust order: {room.players.find((player) => player.id === activeSkillSelectedTargetIds[0])?.name} plays Attack first, then {room.players.find((player) => player.id === activeSkillSelectedTargetIds[1])?.name}.</small>}
        </div>
      }>
        <div className="local-hand-section">
          <div className="local-hand" data-card-origin-anchor={room.meId} aria-label="Your hand">{(() => { const multiSelectMode = room.phase === "discard" || Boolean(activeSkillSelection || serpentMode || responseSelectionMax > 1 || triggerSelectionMax > 1); const responseSelectionLimit = triggerResponse && triggerSelectionUsesCards ? triggerSelection.max : responseSelectionUsesCards ? responseSelection.max : 2; const toggleHandCard = (item: Card) => { const costSelection = serpentMode || canRespond && responseSelectionUsesCards && responseSelectionMax > 1 || triggerResponse && triggerSelectionUsesCards && triggerSelectionMax > 1; if (room.phase === "discard") setDiscardSelected((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : ids.length < excessCards ? [...ids, item.id] : ids); else if (activeSkillSelection) setActiveSkillSelectionState((state) => { if (!state || !activeSkillStateIsCurrent) return state; const validIds = state.cardIds.filter((id) => activeSkillSelection.eligibleCardIds.includes(id)); return validIds.includes(item.id) ? { ...state, cardIds: validIds.filter((id) => id !== item.id) } : validIds.length < activeSkillSelection.max ? { ...state, cardIds: [...validIds, item.id] } : { ...state, cardIds: validIds }; }); else if (costSelection) setSerpentSelected((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : ids.length < responseSelectionLimit ? [...ids, item.id] : ids); else { setSelected((id) => id === item.id ? "" : item.id); setTarget(""); } setTargetCardIndex(null); }; const renderHandCard = (item: Card, index: number) => { const definition = cardDefinition(item.kind); const costSelection = serpentMode || canRespond && responseSelectionUsesCards && responseSelectionMax > 1 || triggerResponse && triggerSelectionUsesCards && triggerSelectionMax > 1; const isSelected = room.phase === "discard" ? discardSelected.includes(item.id) : activeSkillSelection ? activeSkillSelectedCardIds.includes(item.id) : costSelection ? serpentSelected.includes(item.id) : selected === item.id; const singleSelected = !multiSelectMode && isSelected; const maySelect = (room.isMyTurn && (canPlay || room.phase === "discard")) || responseDecisionReady || rescueDecisionReady; const skillModeCardDisabled = Boolean(activeSkillTargetSelection || wushengMode && !wushengEligibleCardIds.has(item.id) || longdanMode && !longdanEligibleCardIds.has(item.id) || activeSkillSelection && !activeSkillSelection.eligibleCardIds.includes(item.id)); const skillModeEligible = wushengMode && wushengEligibleCardIds.has(item.id) || longdanMode && longdanEligibleCardIds.has(item.id) || activeSkillSelection?.eligibleCardIds.includes(item.id) === true; return <div className={`card-slot ${singleSelected ? "single-selected" : ""}`} data-hand-card-id={item.id} key={`rail-${item.id}`} style={{ marginLeft: index === 0 ? 0 : `${handCardLayout.step - 68}px` }}><div className="hand-card-visual"><button disabled={!maySelect || skillModeCardDisabled || (responseDecisionReady && (canRespond || triggerResponse) && !responseCardAllowed(item)) || (rescueDecisionReady && !canRespond && item.kind !== "Peach")} onClick={() => toggleHandCard(item)} className={`game-card ${item.kind.toLowerCase()} ${suitColorClass(item.suit)} ${isSelected ? "selected" : ""} ${skillModeEligible ? "hero-skill-eligible" : ""}`}><span className="corner">{item.rank}<i>{item.suit}</i></span><span className="card-name-mark">{definition.name}</span><strong>{definition.category} card</strong></button><button type="button" className="card-info-button" aria-label={`Explain ${definition.name}`} onClick={(event) => { event.stopPropagation(); setInfoCard(item); }}>i</button></div></div>; };
          // The native scroll region needs keyboard focus; it has no custom selection role.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          return <div ref={handRailRef} onScroll={(event) => { handViewportSnapshotRef.current = captureHandViewportSnapshot(event.currentTarget, room.meId); }} className="local-hand-rail" data-hand-layout={handCardLayout.measured ? "measured" : "pending"} style={{ justifyContent: room.myHand.length === 1 ? "center" : "flex-start" }} data-hand-overflow={handOverflows ? "true" : "false"} tabIndex={handOverflows ? 0 : undefined} role="region" aria-label={handOverflows ? "Hand cards — scroll horizontally to browse" : "Hand cards"}>{room.myHand.map((item, index) => renderHandCard(item, index))}</div>; })()}</div>
        </div>
      <div className="turn-controls" data-console-surface="local-operation" aria-label="Local operation console">
        <div data-action-extras="true">
          {triggerResponse && triggerOptions.filter((option) => !heroTriggerEffectIds.has(option.effectId) || option.selection?.type === "choice").map((option) => option.selection?.type === "target_cards" || option.selection?.type === "choice" && option.allowDecline === false ? null : option.selection ? <button key={option.effectId} className={`serpent-control ${responseProviderId === option.effectId ? "active" : ""}`} disabled={responseControlsDisabled} onClick={() => { const active = responseProviderId === option.effectId; if (active) resetLocalTargetFlow("trigger"); else { setResponseProviderId(option.effectId); setSelected(""); setTargetIds([]); setSerpentSelected([]); setTriggerSelectedKeys([]); setTriggerChoice(""); } }}>{responseProviderId === option.effectId ? `Cancel ${option.label}` : option.selection.type === "target" ? `Use ${option.label}` : option.label}</button> : <button key={option.effectId} className="serpent-control" disabled={responseControlsDisabled} onClick={() => onAction("trigger", { providerId: option.effectId })}>{`Use ${option.label}`}</button>)}
          {canRespond && genericResponse && semanticResponseOptions.length > 0 && genericResponseOptions.map((option) => option.selection ? <button key={option.providerId} className={`serpent-control ${responseProviderId === option.providerId ? "active" : ""}`} disabled={responseControlsDisabled} onClick={() => { const active = responseProviderId === option.providerId; setResponseProviderId(active ? "" : option.providerId); setSelected(""); setSerpentSelected([]); }}>{responseProviderId === option.providerId ? `Cancel ${option.label}` : option.label}</button> : <button key={option.providerId} className="serpent-control" disabled={responseControlsDisabled} onClick={() => submitResponseProvider(option)}>{busy ? "Resolving…" : option.label}</button>)}
          {room.isMyTurn && canPlay && consoleKind === "turn" && canFormSerpentAttack && <button className={`serpent-control ${serpentMode ? "active" : ""}`} onClick={() => { setSerpentMode((active) => !active); setSerpentSelected([]); setSelected(""); setTarget(""); }}>{serpentMode ? "Normal" : "Spear"}</button>}
        </div>
        <div data-action-slots="true">
          <div data-action-slot="cancel">
            {borrowedSwordTargetSelectionActive && consoleDecision.localCancel.visible && <button className="end local-target-cancel" disabled={busy || presentationBusy || !consoleDecision.localCancel.enabled} onClick={cancelLocalTargetSelection}>Cancel</button>}
            {triggerResponse && triggerTargetMode && consoleDecision.localCancel.visible && localTargetSelection.canCancel && !triggerHasProviderCancelSurface && <button className="end local-target-cancel" disabled={responseControlsDisabled || !consoleDecision.localCancel.enabled} onClick={cancelLocalTargetSelection}>Cancel</button>}
            {(activeSkillSelection || activeSkillTargetSelection) && activeSkillTargetMode && consoleDecision.localCancel.visible && localTargetSelection.canCancel && <button className="end local-target-cancel" disabled={busy || !consoleDecision.localCancel.enabled} onClick={cancelLocalTargetSelection}>Cancel</button>}
            {room.isMyTurn && canPlay && consoleKind === "turn" && normalTargetSelectionActive && consoleDecision.localCancel.visible && localTargetSelection.canCancel && !normalHasProviderCancelSurface && <button className="end local-target-cancel" disabled={busy || presentationBusy || !consoleDecision.localCancel.enabled} onClick={cancelLocalTargetSelection}>Cancel</button>}
          </div>
          <div data-action-slot="primary">
            {rescueDecisionReady && !canRespond && consolePrimaryId === "rescue" && <button className="primary" disabled={busy || card?.kind !== "Peach" || !consoleDecision.primary?.enabled} onClick={() => { if (card?.kind === "Peach") void onAction("give_peach", { cardId: card.id }); setSelected(""); }}>{busy ? "Playing…" : "Peach"}</button>}
            {borrowedSwordTargetSelectionActive && consolePrimaryId === "borrowed-sword" && <button className="primary" disabled={busy || presentationBusy || !localTargetSelection.canConfirm || !consoleDecision.primary?.enabled} onClick={() => void confirmBorrowedSwordTarget()}>{busy ? "Confirming…" : "Confirm"}</button>}
            {triggerResponse && selectedTriggerOption?.selection?.type === "cards" && consolePrimaryId === "trigger-cards" && <button className="primary" disabled={responseControlsDisabled || !triggerSubmissionComplete || !consoleDecision.primary?.enabled} onClick={() => submitWithLocalTargetPreview(() => onAction("trigger", { providerId: selectedTriggerOption.effectId, ...(triggerSelectedCardIds.length === 1 ? { cardId: triggerSelectedCardIds[0] } : { cardIds: triggerSelectedCardIds }), ...(triggerTargetSelection ? { targetId: targetIds[0] } : {}) }))}>Confirm</button>}
            {triggerResponse && selectedTriggerOption?.selection?.type === "target" && triggerTargetSelection && consolePrimaryId === "trigger-target" && <button className="primary" disabled={responseControlsDisabled || !localTargetSelection.canConfirm || !consoleDecision.primary?.enabled} onClick={() => submitWithLocalTargetPreview(() => onAction("trigger", { providerId: selectedTriggerOption.effectId, targetIds }))}>Confirm</button>}
            {(activeSkillSelection || activeSkillTargetSelection) && consolePrimaryId === "active-skill" && <button className="primary" disabled={busy || !localTargetSelection.canConfirm && Boolean(activeSkillTargetSelection || activeSkillSelection?.targetIds.length) || !activeSkillComplete || !activeSkillSubmission || !consoleDecision.primary?.enabled} onClick={() => activeSkillSubmission && submitWithLocalTargetPreview(() => onAction("trigger", activeSkillSubmission))}>Confirm</button>}
            {canRespond && genericResponse && semanticResponseOptions.length > 0 && selectedResponseProvider && consolePrimaryId === "response" && <button className="primary" disabled={responseControlsDisabled || !responseSelectionComplete || !consoleDecision.primary?.enabled} onClick={() => submitResponseProvider()}>{busy ? "Confirming…" : "Confirm"}</button>}
            {room.isMyTurn && room.phase === "discard" && consolePrimaryId === "discard" && <button className="primary" disabled={busy || discardSelected.length !== excessCards || !consoleDecision.primary?.enabled} onClick={() => onAction("discard_cards", { cardIds: discardSelected })}>{busy ? "Discarding…" : `Discard ${excessCards} selected`}</button>}
            {room.isMyTurn && canPlay && consoleKind === "turn" && consolePrimaryId === "turn" && <button className="primary" disabled={serpentMode ? busy || presentationBusy || !canDeclareAttack || serpentSelected.length !== 2 || !attackTargetsValid || !consoleDecision.primary?.enabled : busy || presentationBusy || !card || selectedCanPlayAsAttack && (!canDeclareAttack || !attackTargetsValid) || (["Dismantle", "Steal", "Duel", "Overindulgence", "RationsDepleted", "BorrowedSword"].includes(card.kind) && !target) || card?.kind === "BorrowedSword" && !borrowedSwordPlayTargetIds.includes(target) || !selectedCanPlayAsAttack && (card.kind === "Dodge" || card.kind === "Negation") || !consoleDecision.primary?.enabled} onClick={serpentMode ? playSerpentAttack : play}>{busy ? "Playing…" : serpentMode ? "Form Attack" : normalTargetSelectionActive ? "Confirm" : "Play"}</button>}
          </div>
          <div data-action-slot="decline">
            {rescueDecisionReady && !canRespond && consoleDecision.authoritativeDecline && <button className="end" disabled={busy || !consoleDecision.authoritativeDecline.enabled} onClick={() => { void onAction("skip_rescue"); setSelected(""); }}>{busy ? "Skipping…" : "Skip"}</button>}
            {triggerResponse && triggerDeclineAction && !targetCardPickerOption && consoleDecision.authoritativeDecline && <button className="end" disabled={responseControlsDisabled || !consoleDecision.authoritativeDecline.enabled} onClick={() => onAction("decline_trigger")}>Skip</button>}
            {canRespond && consoleDecision.authoritativeDecline && <button className="end" disabled={responseControlsDisabled || !responseDamageAction || !consoleDecision.authoritativeDecline.enabled} onClick={() => responseDamageAction && onAction(responseDamageAction)}>Skip</button>}
            {room.isMyTurn && canPlay && consoleKind === "turn" && <button className="end" disabled={busy || presentationBusy} onClick={() => onAction("end_turn")}>{busy ? "Finishing…" : "End"}</button>}
          </div>
        </div>
      </div>
      </LocalPlayerDock>
    </footer>
    {infoCard && <div className="card-info-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setInfoCard(null)}><section className="card-info-dialog" role="dialog" aria-modal="true" aria-labelledby="card-info-title"><button type="button" className="card-info-close" onClick={() => setInfoCard(null)} aria-label="Close card explanation">×</button><span>PRIVATE CARD INFORMATION</span><small>{infoCard.rank}{infoCard.suit} · {cardDefinition(infoCard.kind).category} card</small><h2 id="card-info-title">{cardDefinition(infoCard.kind).name}</h2><p>{cardDefinition(infoCard.kind).rules}</p><em>Only you can see this explanation.</em></section></div>}{infoHero && <HeroInfoDialog hero={infoHero} onClose={() => setInfoHero(null)} />}
  </main>;
}

type TargetCardSelection = Extract<NonNullable<TriggerOptionView["selection"]>, { type: "target_cards" }>;
type ChoiceTriggerSelection = Extract<NonNullable<TriggerOptionView["selection"]>, { type: "choice" }>;

function PrivateDeckReorderDialog({ cards, minTop, maxTop, disabled, error, onSubmit }: { cards: Card[]; minTop: number; maxTop: number; disabled: boolean; error: string; onSubmit: (topCardIds: string[], bottomCardIds: string[]) => void }) {
  const [topIds, setTopIds] = useState<string[]>([]);
  const [bottomIds, setBottomIds] = useState<string[]>(() => cards.map((card) => card.id));
  const held = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const moveBetween = (id: string, toTop: boolean) => {
    if (toTop) {
      setBottomIds((ids) => ids.filter((candidate) => candidate !== id));
      setTopIds((ids) => [...ids, id]);
    } else {
      setTopIds((ids) => ids.filter((candidate) => candidate !== id));
      setBottomIds((ids) => [...ids, id]);
    }
  };
  const moveWithin = (ids: string[], setIds: (updater: (current: string[]) => string[]) => void, index: number, delta: number) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= ids.length) return;
    setIds((current) => { const next = [...current]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; return next; });
  };
  const complete = topIds.length >= minTop && topIds.length <= maxTop && topIds.length + bottomIds.length === cards.length;
  const renderGroup = (title: string, ids: string[], setIds: (updater: (current: string[]) => string[]) => void, destination: "top" | "bottom") => <section className="deck-reorder-group"><header><strong>{title}</strong><span>{destination === "top" ? "First card draws next" : "Earlier here stays nearer the top"}</span></header><div className="deck-reorder-card-row">{ids.map((id, index) => { const card = held.get(id); if (!card) return null; return <div className="deck-reorder-card" key={id}><CardFace card={card} /><div className="deck-reorder-card-actions"><button type="button" disabled={disabled || index === 0} onClick={() => moveWithin(ids, setIds, index, -1)} aria-label={`Move ${cardDefinition(card.kind).name} earlier`}>↑</button><button type="button" disabled={disabled || index === ids.length - 1} onClick={() => moveWithin(ids, setIds, index, 1)} aria-label={`Move ${cardDefinition(card.kind).name} later`}>↓</button><button type="button" disabled={disabled} onClick={() => moveBetween(id, destination !== "top")}>{destination === "top" ? "Bottom" : "Top"}</button></div></div>; })}</div></section>;
  return <div className="target-card-picker-overlay" role="presentation"><section className="target-card-picker-panel choice-trigger-panel deck-reorder-panel" role="dialog" aria-modal="true" aria-label="Stargazing deck reorder"><header><strong>STARGAZING</strong><span>Place 0–{maxTop} cards on top, then order the rest at the bottom. The top list draws first from left to right.</span></header>{renderGroup("TOP OF DECK", topIds, setTopIds, "top")}{renderGroup("BOTTOM OF DECK", bottomIds, setBottomIds, "bottom")}<div className="target-card-picker-actions"><button type="button" className="primary" disabled={disabled || !complete} onClick={() => onSubmit(topIds, bottomIds)}>Complete Stargazing</button></div>{error && <p className="error" role="alert">{error}</p>}</section></div>;
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

function TargetCardPicker({ option, selection, target, selectedKeys, disabled, canDecline, showCancel, error, onToggle, onUse, onCancel, onDecline }: { option: TriggerOptionView; selection: TargetCardSelection; target: Player; selectedKeys: string[]; disabled: boolean; canDecline: boolean; showCancel: boolean; error: string; onToggle: (key: string) => void; onUse: (keys: string[]) => void; onCancel: () => void; onDecline: () => void }) {
  const validSelectedKeys = selectedKeys.filter((key) => selection.eligibleKeys.includes(key));
  const randomHandZone = selection.eligibleKeys.includes("hand");
  const handKeys = selection.eligibleKeys
    .filter((key) => /^hand:\d+$/.test(key))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));
  const eligiblePublicKeys = new Set(selection.eligibleKeys.filter((key) => key !== "hand" && !/^hand:\d+$/.test(key)));
  const publicCards = [...target.equipmentCards, ...target.judgementCards].filter((item) => eligiblePublicKeys.has(item.id));
  const items = [
    ...(randomHandZone ? [{ key: "hand", label: "Hand", hidden: true, card: null }] : []),
    ...handKeys.map((key) => ({ key, label: `Hidden hand card ${Number(key.slice(5)) + 1}`, hidden: true, card: null })),
    ...publicCards.map((item) => ({ key: item.id, label: cardDefinition(item.kind).name, hidden: false, card: item })),
  ];
  const effectLabel = option.label.replace(/^Use\s+/i, "");
  const amount = selection.min === selection.max ? `${selection.min}` : `${selection.min}–${selection.max}`;
  const subtitle = `Choose ${amount} eligible card${selection.max === 1 ? "" : "s"}`;
  const complete = validSelectedKeys.length >= selection.min && validSelectedKeys.length <= selection.max;
  return <div className="target-card-picker-overlay" role="presentation"><section className="target-card-picker-panel" role="dialog" aria-modal="true" aria-label={`${effectLabel} target card selection`}>
    <header><strong>{effectLabel.toUpperCase()}</strong><span>{subtitle}</span></header>
    <div className="target-card-picker-card-row" aria-label="Eligible cards">
      {items.map((item) => <button type="button" key={item.key} className={`target-card-picker-card ${item.hidden ? "concealed-card" : "equipment"} ${validSelectedKeys.includes(item.key) ? "selected" : ""}`} disabled={disabled} aria-pressed={validSelectedKeys.includes(item.key)} aria-label={item.label} onClick={() => onToggle(item.key)}>{item.hidden ? <span aria-hidden="true">?</span> : item.card && <CardFace card={item.card} />}{validSelectedKeys.includes(item.key) && <span className="target-card-picker-check" aria-hidden="true">✓</span>}</button>)}
    </div>
    <div className="target-card-picker-count" aria-live="polite">{validSelectedKeys.length} / {selection.max} selected</div>
    <div className="target-card-picker-actions">
      {showCancel && <button type="button" className="end" disabled={disabled} onClick={onCancel}>Cancel</button>}
      {canDecline && <button type="button" className="end" disabled={disabled} onClick={onDecline}>Skip</button>}
      <button type="button" className="primary" disabled={disabled || !complete} onClick={() => onUse(validSelectedKeys)}>{`Use ${effectLabel}`}</button>
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
