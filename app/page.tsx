/* eslint-disable jsx-a11y/label-has-associated-control -- compact zone headings are visual labels, not form fields. */
"use client";

import { Component, FormEvent, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cardDefinition, isAttackCard } from "../game/cards";
import type { Card } from "../game/model";
import { baselineHand, updatePrivateHand } from "../game/private-hand.js";
import { getResponseOptions } from "../game/responses";
import { HEROES, type HeroSkill } from "../game/heroes";
import { normalizeRoomData } from "../game/room-safety.js";
import { canUseAction, type CurrentAction, type GameplayAction, type TriggerOptionView } from "../game/protocol.js";
import { latestPublicMessages } from "../game/messages.js";
import { canTargetCharacter } from "../game/capabilities/targeting";

type Hero = { id: string; name: string; faction: string; hp: number; ability: string; skill?: string; skills?: readonly HeroSkill[] };
type ActiveSkillSelectionState = { revision: string; effectId: string; cardIds: string[]; targetIds: string[] };
type PresentationImportance = "essential" | "informational";
type PresentationEventMeta = { resolutionId?: string; importance?: PresentationImportance; finalResult?: boolean; playedAs?: "attack" | "dodge"; effectNotice?: boolean; judgement?: boolean; initialDeal?: boolean };
type CardEvent = PresentationEventMeta & { id: string; player: string; target: string; card: Card; action?: "play" | "equip" | "activate" | "discard" | "gain" | "reveal" | "draw"; drawPlayerId?: string; presentation?: boolean };
type CardGroupEvent = PresentationEventMeta & { id: string; type: "cards"; player: string; target: string; cards: Card[]; action: "discard" | "reveal" | "play"; presentation?: boolean; message?: string };
type GameEvent = (CardEvent & { type: "card"; message?: string }) | CardGroupEvent | ({ type: "message"; id: string; message: string; drawPlayerId?: string; presentation?: boolean } & PresentationEventMeta);
type Player = { id: string; name: string; seat: number; hero: string | null; generalReady: boolean; ready: boolean; hp: number | null; maxHp: number | null; alive: boolean; connected: boolean; handCount: number; judgementCards: Card[]; equipmentCards: Card[]; attackRange: number; distance: number | null; isHost: boolean; role: string | null };
 type Room = { responseCountdownVisibleAt?: number; actionRevision?: string; code: string; status: "lobby" | "heroes" | "started" | "finished" | "playing"; maxPlayers: number; isHost: boolean; isTestController?: boolean; meId: string; myRole: string | null; myHeroOptions: Hero[]; players: Player[]; myHand: Card[]; turnSeat: number | null; phase: string | null; deckCount: number; discardTop: Card | null; log: string[]; timeline: GameEvent[]; isMyTurn: boolean; actionPlayerId: string | null; actionReason: string; isMyAction: boolean; pending: { kind: CurrentAction["kind"] } | null; currentAction: CurrentAction | null; pendingAttack: { sourceId: string; targetId: string; sequenceStartCardId?: string; deadline?: number } | null; pendingGreenDragon: { sourceId: string; targetId: string; actorId: string; sequenceStartCardId: string; deadline?: number } | null; pendingRockCleaving: { sourceId: string; targetId: string; actorId: string; sequenceStartCardId: string; deadline?: number } | null; pendingFrostSword: { sourceId: string; targetId: string; actorId: string; deadline?: number } | null; pendingDuel: { sourceId: string; targetId: string; actorId: string; opponentId: string; deadline?: number } | null; pendingGroup: { cardKind: "BarbarianInvasion" | "RainingArrows" | "SkyPiercingHalberdAttack"; sourceId: string; requiredKind: "Attack" | "Dodge" } | null; pendingNegation: { sourceId: string; actorId: string | null; effectTargetId: string; cardName: string; responseTarget?: string; latestNegationPlayerId?: string | null; latestNegationCardId?: string | null; chainDepth?: number; negated: boolean; deadline?: number } | null; pendingHarvest: { sourceId: string; actorId: string; revealed: Card[]; choices: { cardId: string; playerId: string; playerName: string }[]; previewCardId: string | null; complete: boolean; countdownUntil: number } | null; pendingTargetCard: { sourceId: string; actorId: string; targetId: string; cardKind: "Dismantle" | "Steal" } | null; pendingBorrowedSword: { sourceId: string; targetId: string; actorId: string; holderId: string; stage: "choose_target" | "force_attack"; weaponId: string | null; eligibleTargetIds: string[] } | null; pendingDying: { sourceId: string; targetId: string; origin?: string | null; recoveryNeeded: number; deadline: number } | null };

export const HERO_ART_BY_ID: Record<string, string> = {
  "cao-cao": "/hero-cao-cao.jpg",
  "liu-bei": "/hero-liu-bei.jpg",
  "sun-quan": "/hero-sun-quan.jpg",
  "simayi": "/hero-sima-yi.jpg",
  "xiahou-dun": "/hero-xiahou-dun.jpg",
  "zhang-liao": "/hero-zhang-liao.jpg",
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

function hpDisplay(hp: number | null) { return hp !== null && hp <= 0 ? `${hp} HP` : "♥".repeat(Math.max(0, hp ?? 0)); }
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

  if (room?.status === "started" || room?.status === "playing" || room?.status === "finished") return <GameRoomErrorBoundary room={room} onRecover={leave}><GameRoom room={room} busy={busy} error={error} onAction={send} onLeave={leave} /></GameRoomErrorBoundary>;
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
function phaseName(phase?: string | null) { return phase?.startsWith("draw") ? "Draw Phase" : phase?.startsWith("play") ? "Play Phase" : phase === "discard" ? "Discard Phase" : phase === "response" ? "Response" : phase === "dying" ? "Dying Rescue" : phase === "resolving" ? "Resolving" : phase === "finished" ? "Finished" : ""; }

function pendingKind(room: Room) { return room.pending?.kind ?? null; }

class GameRoomErrorBoundary extends Component<{ room: Room; onRecover: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("[GameRoom render failure]", {
      status: this.props.room.status,
      phase: this.props.room.phase,
      pendingKind: pendingKind(this.props.room),
      error: error.message,
      component: info.componentStack?.split("\n").find(Boolean) ?? "GameRoom",
    });
    this.setState({ failed: true });
  }

  recover = () => {
    localStorage.removeItem("three-realms-session");
    this.props.onRecover();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="landing-shell"><section className="entry-card recovery-card"><span className="eyebrow">ROOM RECOVERY</span><h1>Previous game data is no longer compatible.</h1><p>Your saved room could not be rendered safely. Start a new game to continue.</p><button className="gold-button" onClick={this.recover}>Start a new game</button></section></main>;
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

// These are stable semantic capability IDs, not display-label matches. A
// missing entry intentionally leaves the metadata-backed skill visible but
// disabled until its existing projected capability is available.
const HERO_SKILL_EFFECT_IDS: Record<string, Record<string, readonly string[]>> = {
  "cao-cao": { Treachery: ["cao_cao_jianxiong"], Entourage: ["cao_cao_hujia"] },
  simayi: { Retaliation: ["sima_yi_fankui"], Necromancy: ["sima_yi_guicai"] },
  "xiahou-dun": { Stauchness: ["xiahou_dun_ganglie"] },
  "zhang-liao": { Assault: ["zhang_liao_assault"] },
  "xu-chu": { "Bared Bodied": ["xu_chu_bared_bodied"] },
  "guo-jia": { "Jealousy of God": ["guo_jia_jealousy_of_god"], Legacy: ["guo_jia_legacy"] },
  "liu-bei": { Benevolence: ["liu_bei_rende"], Influencing: ["liu_bei_jijiang"] },
  "sun-quan": { Equilibrium: ["sun_quan_zhiheng"], Deliverance: ["sun_quan_jiuyuan"] },
  "gan-ning": { Ambushment: ["gan_ning_qixi"] },
  "lu-meng": { Composure: ["lu_meng_keji"] },
  "yue-jin": { Dauntless: ["yue_jin_dauntless"] },
  "zhou-yu": { Heroic: ["zhou_yu_yingzi"] },
  "lu-xun": { "Second Wind": ["lu_xun_second_wind"] },
};

type LocalPlayerDockProps = {
  player: Player | null;
  hero: Hero | null;
  children: ReactNode;
  heroSkillControl?: ReactNode;
  onHeroInfo: (hero: Hero) => void;
  onInfoCard: (card: Card) => void;
  equipmentSelection?: { eligibleIds: string[]; selectedIds: string[]; max: number; disabled: boolean; onToggle: (cardId: string) => void } | null;
  hiddenCardIds?: ReadonlySet<string>;
};

export function LocalPlayerDock({ player, hero, children, heroSkillControl, onHeroInfo, onInfoCard, equipmentSelection = null, hiddenCardIds = new Set() }: LocalPlayerDockProps) {
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
  const renderZoneCard = (card: Card, selected = false, selectable = false) => <div className={`local-zone-card ${suitColorClass(card.suit)} ${selected ? "selected-cost" : ""}`} key={card.id} data-equipment-id={cardDefinition(card.kind).equipmentSlot ? card.id : undefined} data-judgement-id={!cardDefinition(card.kind).equipmentSlot ? card.id : undefined} style={{ visibility: hiddenCardIds.has(card.id) ? "hidden" : "visible" }}>
    <CardFace card={card} />
    {selectable ? <button type="button" className="local-zone-card-button" aria-label={`Select ${cardDefinition(card.kind).name}`} disabled={!equipmentSelection || equipmentSelection.disabled || !equipmentSelection.eligibleIds.includes(card.id)} onClick={() => equipmentSelection?.onToggle(card.id)} /> : <button type="button" className="local-zone-card-button" aria-label={`Explain ${cardDefinition(card.kind).name}`} onClick={() => onInfoCard(card)} />}
    <button type="button" className="zone-info-button" aria-label={`Explain ${cardDefinition(card.kind).name}`} onClick={(event) => { event.stopPropagation(); onInfoCard(card); }}>i</button>
  </div>;
  return <section className="local-player-dock" data-player-anchor={player?.id ?? undefined} aria-label="Your player area">
    <div className="local-dock-identity">
      {hero ? <button type="button" className="local-hero-card" aria-label={`Explain ${hero.name}`} onClick={() => onHeroInfo(hero)}><span className="local-hero-portrait" data-hero-id={hero.id} aria-hidden="true"><HeroPortrait hero={hero} /><span className="local-hero-label">{hero.name}</span></span></button> : <div className="local-hero-card local-hero-card-empty" aria-label="Hero not selected"><span className="local-hero-portrait" aria-hidden="true"><span className="local-hero-label">HERO</span></span></div>}
      <div className="local-hero-skill">{heroSkillControl ?? <section className="hero-skills local-hero-skills" aria-label="Hero skills">{fallbackSkills.map((skill) => <button type="button" className="hero-skill-button" key={skill.name} title={skill.description} disabled>{skill.name}</button>)}</section>}</div>
    </div>
    <div className="local-dock-zones" aria-label="Your status and equipment zones">
      <div className="local-status-panel">
        <span className="local-status-hp">HP {player?.hp ?? 0}/{player?.maxHp ?? 0}</span>
        <span className="local-status-hearts">{hpDisplay(player?.hp ?? null)}</span>
        <strong className="local-status-role">{player?.role ?? "Role pending"}</strong>
      </div>
      <div className="local-equipment-panel" aria-label="Equipment">
        <div className="local-equipment-slots">{LOCAL_EQUIPMENT_SLOTS.map(({ key }) => { const card = equipmentBySlot.get(key); const selectable = Boolean(card && equipmentSelection); return <div className="local-equipment-slot" key={key} data-slot={key} aria-label={`${slotLabel(key)} slot`} role="group">{card ? renderZoneCard(card, equipmentSelection?.selectedIds.includes(card.id), selectable) : <span className="local-zone-empty" aria-label={`${slotLabel(key)} empty`}><span className="local-zone-empty-label">{slotLabel(key)}</span></span>}</div>; })}</div>
      </div>
      <div className="local-judgement-panel" aria-label="Judgement zone">
        <div ref={judgementRailRef} className="local-judgement-cards" data-judgement-layout={judgementCardLayout.measured ? "measured" : "pending"} style={{ justifyContent: judgementCards.length === 1 ? "center" : "flex-start" }}>
          {judgementCards.map((card, index) => <div className="local-judgement-card-slot" key={card.id} style={{ marginLeft: index === 0 ? 0 : `${judgementCardLayout.step - 34}px` }}>{renderZoneCard(card)}</div>)}
        </div>
      </div>
    </div>
    {children}
  </section>;
}

export function GameRoom({ room, busy, error, onAction, onLeave }: { room: Room; busy: boolean; error: string; onAction: (action: GameplayAction, extra?: Record<string, unknown>) => Promise<boolean>; onLeave: () => void }) {
  const initialPendingSequence = pendingTimelineSequence(room);
  const initialHeldCardIds = new Set(initialPendingSequence.flatMap(eventCards).map((item) => item.id));
  const [selected, setSelected] = useState(""); const [wushengMode, setWushengMode] = useState<"play" | "response" | null>(null); const [longdanMode, setLongdanMode] = useState<"play" | "response" | null>(null); const [targetIds, setTargetIds] = useState<string[]>([]); const target = targetIds[0] ?? "";
  const handRailRef = useRef<HTMLDivElement | null>(null);
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
  const [triggerChoice, setTriggerChoice] = useState("");
  const [discardSelected, setDiscardSelected] = useState<string[]>([]); const automaticDraw = useRef("");
  // Equipment cost selections use the selected-cost visual state.
  // Equipment cost selection remains presentation-compatible with the compact
  // visible dock while preserving the existing card IDs and callbacks.
  // Legacy seat semantics retain presence-dot, started-player, and play-seat terminology.
  const [messagesCollapsed, setMessagesCollapsed] = useState(false);
  const [effectNotice, setEffectNotice] = useState<string | null>(null);
  const [infoCard, setInfoCard] = useState<Card | null>(null);
  const [infoHero, setInfoHero] = useState<Hero | null>(null);
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
  const attacker = room.players.find((player) => player.id === room.pendingAttack?.sourceId); const defender = room.players.find((player) => player.id === room.pendingAttack?.targetId);
  const canPlay = room.phase?.startsWith("play") && room.status === "playing";
  const canChooseHarvest = room.phase === "response" && Boolean(room.pendingHarvest) && !room.pendingHarvest?.complete && room.isMyAction;
  const canChooseTargetCard = room.phase === "response" && Boolean(room.pendingTargetCard) && room.isMyAction;
  const canChooseBorrowedSword = room.phase === "response" && room.isMyAction && room.pendingBorrowedSword?.stage === "choose_target";
  // `currentAction` is the server's canonical response discriminator and
  // capability list. Legacy pending fields below only supply presentation
  // detail while the API migrates away from its compatibility projection.
  const responseType = room.phase === "response" && !room.pendingHarvest && !room.pendingTargetCard && !canChooseBorrowedSword && room.isMyAction
    ? room.currentAction?.kind ?? null
    : null;
  const invalidResponseState = room.phase === "response" && room.isMyAction && !room.pendingHarvest && !room.pendingTargetCard && !canChooseBorrowedSword && !responseType;
  // Canonical rooms project `response`; retain the legacy discriminators while
  // old saved rooms and compatibility tests are still supported. A trigger is
  // deliberately separate: it is not a semantic Attack/Dodge/Negation reply.
  const canRespond = responseType !== null && responseType !== "trigger";
  const duelResponse = responseType === "duel";
  const negationResponse = responseType === "negation";
  // Canonical trigger decisions render exclusively from currentAction. Legacy
  // pending projections are retained only so an old saved room can be read.
  // Canonical damage reactions are ordinary trigger decisions. The retained
  // legacy projection is presentation-only and never selects controls.
  const triggerResponse = room.currentAction?.kind === "trigger" && room.isMyAction;
  const responseTimerActive = canRespond || triggerResponse;
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
  const responseSelectionComplete = Boolean(responseSelectionUsesCards && responseSelectedCardIds.length >= responseSelection.min && responseSelectedCardIds.length <= responseSelection.max);
  const requiredResponseKind = room.currentAction?.requirement === "negate" ? "Negation" : room.currentAction?.requirement === "attack" ? "Attack" : room.currentAction?.requirement === "dodge" ? "Dodge" : negationResponse ? "Negation" : duelResponse || room.pendingGroup?.requiredKind === "Attack" ? "Attack" : responseType ? "Dodge" : null;
  const triggerOptions = room.currentAction?.triggerOptions ?? [];
  const privateDistribution = room.currentAction?.kind === "card_distribution" && room.isMyAction ? room.currentAction.distribution ?? null : null;
  const activeSkillOptions = room.currentAction?.kind === "turn" && room.isMyAction ? triggerOptions : [];
  const activeSkillOption = activeSkillOptions.find((option) => option.effectId === kingSkillId) ?? null;
  const activeSkillSelection = activeSkillOption?.selection?.type === "cards" ? activeSkillOption.selection : null;
  const activeSkillTargetSelection = activeSkillOption?.selection?.type === "target" ? activeSkillOption.selection : null;
  const activeActionRevision = room.actionRevision ?? "";
  const activeSkillStateIsCurrent = Boolean(activeSkillOption && activeSkillSelectionState?.revision === activeActionRevision && activeSkillSelectionState.effectId === activeSkillOption.effectId);
  const activeSkillSelectedCardIds = activeSkillSelection && activeSkillStateIsCurrent ? activeSkillSelectionState?.cardIds.filter((id) => activeSkillSelection.eligibleCardIds.includes(id)) ?? [] : [];
  const activeSkillTargetIds = activeSkillSelection?.targetIds ?? activeSkillTargetSelection?.targetIds ?? [];
  const activeSkillTargetId = activeSkillStateIsCurrent ? activeSkillSelectionState?.targetIds[0] ?? "" : "";
  const activeSkillComplete = Boolean(activeSkillOption && activeSkillStateIsCurrent && (activeSkillSelection ? activeSkillSelectedCardIds.length >= activeSkillSelection.min && activeSkillSelectedCardIds.length <= activeSkillSelection.max : activeSkillTargetSelection) && (activeSkillTargetIds.length === 0 || activeSkillTargetId && activeSkillTargetIds.includes(activeSkillTargetId)));
  const activeSkillSubmission = activeSkillOption && activeSkillStateIsCurrent ? { providerId: activeSkillOption.effectId, ...(activeSkillSelection ? { cardIds: activeSkillSelectedCardIds } : {}), ...(activeSkillTargetId ? { targetId: activeSkillTargetId } : {}) } : null;
  const mandatoryChoiceTriggerOption = triggerOptions.find((option) => option.selection?.type === "choice" && option.allowDecline === false) ?? null;
  const selectedTriggerOption = mandatoryChoiceTriggerOption ?? triggerOptions.find((option) => option.effectId === responseProviderId) ?? null;
  const targetCardPickerOption = triggerOptions.find((option) => option.selection?.type === "target_cards") ?? null;
  const targetCardPickerSelection = targetCardPickerOption?.selection?.type === "target_cards" ? targetCardPickerOption.selection : null;
  const targetCardPickerTarget = targetCardPickerSelection ? room.players.find((player) => player.id === targetCardPickerSelection.targetId) ?? null : null;
  const triggerCardOption = selectedTriggerOption?.selection?.type === "cards" ? selectedTriggerOption : null;
  const triggerSelection = selectedTriggerOption?.selection ?? null;
  const triggerSelectionUsesCards = triggerSelection?.type === "cards";
  const triggerSelectionUsesChoice = triggerSelection?.type === "choice";
  const triggerSelectionMax = triggerSelectionUsesCards ? triggerSelection.max : 0;
  const triggerSelectedCardIds = triggerSelectionMax === 1 ? (selected ? [selected] : []) : serpentSelected;
  const triggerSelectionKeys = triggerSelectionUsesChoice ? triggerSelectedKeys : [];
  const triggerChoiceHandCount = triggerSelectionUsesChoice && triggerChoice ? triggerSelection.cardCountByChoice?.[triggerChoice] ?? (triggerChoice === "discard" ? 1 : 0) : 0;
  const triggerSelectionComplete = Boolean(triggerSelection && ((triggerSelectionUsesCards && triggerSelectedCardIds.length >= triggerSelection.min && triggerSelectedCardIds.length <= triggerSelection.max) || (triggerSelectionUsesChoice && triggerChoice && triggerSelectionKeys.length === triggerChoiceHandCount)));
  const localEquipmentSelection = activeSkillSelection
    ? { eligibleIds: activeSkillSelection.eligibleCardIds, selectedIds: activeSkillSelectedCardIds, max: activeSkillSelection.max, disabled: busy || presentationBusy, onToggle: (cardId: string) => setActiveSkillSelectionState((state) => { if (!state || !activeSkillStateIsCurrent) return state; const validIds = state.cardIds.filter((id) => activeSkillSelection.eligibleCardIds.includes(id)); return validIds.includes(cardId) ? { ...state, cardIds: validIds.filter((id) => id !== cardId) } : validIds.length < activeSkillSelection.max ? { ...state, cardIds: [...validIds, cardId] } : { ...state, cardIds: validIds }; }) }
    : triggerResponse && triggerSelectionUsesCards
      ? { eligibleIds: triggerCardOption?.selection?.type === "cards" ? triggerCardOption.selection.eligibleCardIds : [], selectedIds: serpentSelected, max: triggerSelectionMax, disabled: busy || !responseDecisionReady, onToggle: (cardId: string) => setSerpentSelected((ids) => ids.includes(cardId) ? ids.filter((id) => id !== cardId) : ids.length < triggerSelectionMax ? [...ids, cardId] : ids) }
      : null;
  const responseCardAllowed = (item: Card) => selectedResponseProvider?.selection?.type === "cards"
    ? selectedResponseProvider.selection.eligibleCardIds.includes(item.id)
    : triggerCardOption?.selection?.type === "cards" && triggerCardOption.selection.eligibleCardIds.includes(item.id);
  const genericResponseOptions = semanticResponseOptions.filter((option) => option.activation === "explicit" && !(me?.hero === "guan-yu" && option.providerId === "guan_yu_red_card_attack") && !(me?.hero === "zhao-yun" && (option.providerId === "zhao_yun_dodge_as_attack" || option.providerId === "zhao_yun_attack_as_dodge"))).map((option) => ({ ...option, label: conciseActionLabel(option.label) }));
  const responseDamageAction = canUseAction(room.currentAction, "decline_response") ? "decline_response" as GameplayAction : canUseAction(room.currentAction, "decline_trigger") ? "decline_trigger" as GameplayAction : null;
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
  const halberdAttack = Boolean(canDeclareAttack && selectedCanPlayAsAttack && me?.equipmentCards.some((equipment) => equipment.kind === "SkyPiercingHalberd") && room.myHand.length === 1);
  const setTarget = (playerId: string) => {
    if (!playerId) {
      setTargetIds([]);
      if (activeSkillStateIsCurrent) setActiveSkillSelectionState((state) => state ? { ...state, targetIds: [] } : state);
      return;
    }
    if (triggerTargetMode && triggerTargetSelection) {
      setTargetIds((ids) => ids.includes(playerId) ? ids.filter((id) => id !== playerId) : ids.length < triggerTargetMax ? [...ids, playerId] : ids);
      return;
    }
    if (activeSkillStateIsCurrent) {
      setActiveSkillSelectionState((state) => state ? { ...state, targetIds: [playerId] } : state);
      setTargetIds([playerId]);
      return;
    }
    setTargetIds((ids) => activeSkillTargetIds.length ? [playerId] : halberdAttack ? ids.includes(playerId) ? ids.filter((id) => id !== playerId) : ids.length < 3 ? [...ids, playerId] : ids : [playerId]);
  };
  const attackTargetsValid = targetIds.length > 0 && targetIds.every((id) => room.players.some((player) => player.id === id && player.alive && player.id !== room.meId && (player.distance ?? 99) <= (me?.attackRange ?? 1)));
  const canFormSerpentAttack = hasSerpentSpear && room.myHand.length >= 2 && room.isMyTurn && canPlay && canDeclareAttack;
  const responseDeadline = room.currentAction?.deadline ?? room.pendingNegation?.deadline ?? room.pendingGreenDragon?.deadline ?? room.pendingRockCleaving?.deadline ?? room.pendingDuel?.deadline ?? room.pendingAttack?.deadline ?? 0;
  const canRescue = room.phase === "dying" && room.isMyAction;
  const timelineKey = room.timeline.map((event) => event.id).join("|");
  const hasUnseenPresentations = room.timeline.some((event) => event.type !== "message" && event.presentation !== false && !presentedEventIds.has(event.id));
  const presentationBusy = Boolean(optimisticPlay || activeEvent || eventQueue.length || resolutionClosing || turnNotice || privateDrawCards.length || hasUnseenPresentations);
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
  const handCardLayout = useMemo(() => {
    const cardWidth = 68;
    const minStep = 30;
    const count = room.myHand.length;
    if (count <= 1) return { step: cardWidth, measured: handRailWidth > 0 };
    if (handRailWidth <= 0) return { step: cardWidth, measured: false };
    const naturalStep = (handRailWidth - cardWidth) / (count - 1);
    return { step: naturalStep >= cardWidth ? naturalStep : Math.max(minStep, naturalStep), measured: handRailWidth > 0 };
  }, [handRailWidth, room.myHand.length]);
  const gameMessages = useMemo(() => latestPublicMessages(room.timeline, describeEvent), [room.timeline]);
  // A response is one decision, even when it has several providers.  Do not
  // expose (or start timing) one provider before the preceding public effect
  // has finished presenting: every provider and the decline branch open
  // together once the decision is visible.
  const responseReadyAfterEventId = room.currentAction?.presentation?.readyAfterEventId ?? null;
  const responseBarrierEvent = responseReadyAfterEventId ? room.timeline.find((event) => event.id === responseReadyAfterEventId) : null;
  const responsePresentationReady = !responseReadyAfterEventId
    || responseBarrierEvent?.type === "message"
    || responseBarrierEvent?.importance === "informational"
    || presentedEventIds.has(responseReadyAfterEventId);
  const responseDecisionReady = (canRespond || triggerResponse) && responsePresentationReady;
  const triggerTargetSelection = selectedTriggerOption?.selection?.type === "target" ? selectedTriggerOption.selection : null;
  const triggerTargetMin = triggerTargetSelection?.min ?? 1;
  const triggerTargetMax = triggerTargetSelection?.max ?? 1;
  const triggerTargetMode = Boolean(triggerResponse && responseDecisionReady && triggerTargetSelection && responseProviderId === selectedTriggerOption?.effectId);
  const triggerTargetComplete = Boolean(triggerTargetMode && targetIds.length >= triggerTargetMin && targetIds.length <= triggerTargetMax);
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
    const effectIds = HERO_SKILL_EFFECT_IDS[me?.hero ?? ""]?.[skill.name] ?? [];
    const option = activeSkillOptions.find((candidate) => effectIds.includes(candidate.effectId));
    const active = Boolean(option && kingSkillId === option.effectId);
    return {
      name: skill.name,
      description: skill.description,
      enabled: Boolean(option),
      active,
      onClick: option ? () => {
        if (option.selection?.type === "cards" || option.selection?.type === "target") {
          const activating = kingSkillId !== option.effectId;
          setKingSkillId(activating ? option.effectId : "");
          setActiveSkillSelectionState(activating ? { revision: activeActionRevision, effectId: option.effectId, cardIds: [], targetIds: [] } : null);
          setSerpentSelected([]); setSelected(""); setTargetIds([]);
        } else void onAction("trigger", { providerId: option.effectId });
      } : undefined,
    };
  });
  const responseControlsDisabled = busy || !responseDecisionReady;
  const rescueDecisionReady = canRescue && !presentationBusy;
  const drawWaitingForPresentation = room.isMyTurn && Boolean(room.phase?.startsWith("draw")) && presentationBusy;
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
  useEffect(() => { if (!infoCard && !infoHero) return; const close = (event: KeyboardEvent) => { if (event.key !== "Escape") return; setInfoCard(null); setInfoHero(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [infoCard, infoHero]);
  useEffect(() => { const timer = setTimeout(() => { setSelected(""); setKingSkillId(""); setActiveSkillSelectionState(null); setWushengMode(null); setLongdanMode(null); setTargetIds([]); setTargetCardIndex(null); setTargetCardZone(""); setTargetCardId(""); setDiscardSelected([]); setSerpentMode(false); setSerpentSelected([]); setResponseProviderId(""); }, 0); return () => clearTimeout(timer); }, [room.turnSeat, room.phase, room.meId]);
  // A response may advance to another decision without changing the turn,
  // phase, or acting seat. The authoritative revision identifies that new
  // decision and prevents a previous provider/cost from leaking into it.
  useEffect(() => { const timer = setTimeout(() => { setKingSkillId(""); setActiveSkillSelectionState(null); setWushengMode(null); setLongdanMode(null); setResponseProviderId(""); setSelected(""); setTargetIds([]); setSerpentSelected([]); setTriggerSelectedKeys([]); setTriggerChoice(""); }, 0); return () => clearTimeout(timer); }, [room.actionRevision]);
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
    const responseTarget = room.pendingDuel ? room.players.find((player) => player.id === room.pendingDuel?.opponentId)?.name ?? me.name : me.name;
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
    const accepted = await onAction(action, { cardIds: materials.map((item) => item.id), targetId: target });
    if (!accepted && presentImmediately) {
      materials.forEach((item) => optimisticallyPresentedCards.current.delete(item.id));
      setOptimisticPlay(null); setResolutionEvents((events) => events.filter((event) => event.id !== optimisticEvent.id));
    }
  };
  const chooseBorrowedSwordTarget = (playerId: string) => { if (!canChooseBorrowedSword || presentationBusy || !room.pendingBorrowedSword?.eligibleTargetIds.includes(playerId)) return; void onAction("choose_borrowed_sword_target", { targetId: playerId }); };
  const play = async () => { if (!card || !me || (selectedCanPlayAsAttack && (!canDeclareAttack || !attackTargetsValid))) return; const playedCard = card; const definition = cardDefinition(card.kind); const needsTarget = selectedCanPlayAsAttack || card.kind === "Dismantle" || card.kind === "Steal" || card.kind === "Duel" || card.kind === "Overindulgence" || card.kind === "RationsDepleted" || card.kind === "BorrowedSword"; const displayTarget = halberdAttack ? targetIds.map((id) => room.players.find((player) => player.id === id)?.name).filter(Boolean).join(", ") : targetPlayer?.name ?? (card.kind === "BumperHarvest" || card.kind === "Oath" ? "All living players" : card.kind === "BarbarianInvasion" || card.kind === "RainingArrows" ? "All other players" : me.name); const optimisticEvent: CardEvent & { type: "card" } = { id: `optimistic-${card.id}`, type: "card", player: me.name, target: displayTarget, card, action: definition.equipmentSlot && !selectedCanPlayAsAttack ? "equip" : "play", ...(selectedCanPlayAsAttack && !isAttackCard(card) ? { playedAs: "attack" } : {}) }; resolutionRevision.current += 1; optimisticallyPresentedCards.current.add(playedCard.id); setResolutionClosing(false); setResolutionEvents(retainsAtPlayer(optimisticEvent) ? [optimisticEvent] : []); setOptimisticPlay(optimisticEvent); setSelected(""); setTargetIds([]); const accepted = await onAction("play_card", { cardId: playedCard.id, ...(selectedCanPlayAsAttack ? { playAs: "attack" } : {}), ...(needsTarget ? { targetId: target, ...(halberdAttack ? { targetIds } : {}) } : {}) }); if (!accepted) { optimisticallyPresentedCards.current.delete(playedCard.id); setOptimisticPlay(null); setResolutionEvents([]); } };
  const commandPrompt = !responseDecisionReady && (canRespond || triggerResponse) ? "Showing the current game event…"
    : room.status === "finished" ? "The match has ended"
    : room.phase === "dying" ? room.isMyAction ? "Your action · select a Peach and play it, or skip rescue" : "Waiting — no rescue action is required from you"
    : room.pendingHarvest ? room.pendingHarvest.complete ? "Bumper Harvest · showing all confirmed choices" : canChooseHarvest ? "Your action · choose one revealed Bumper Harvest card" : `Waiting for ${actor?.name ?? "the next player"} to choose from Bumper Harvest`
    : room.pendingTargetCard ? canChooseTargetCard ? `Your action · choose a current card from ${pendingTargetPlayer?.name ?? "the target"}` : `Waiting for ${actor?.name ?? "the source player"} to choose a target card`
    : room.pendingBorrowedSword?.stage === "choose_target" ? canChooseBorrowedSword ? "Your action · Borrowed Sword · choose a target for the forced Attack" : `Waiting for ${actor?.name ?? "the Borrowed Sword player"} to choose an Attack target`
    : privateDistribution ? "Your action · Legacy · assign both private cards" : room.currentAction?.kind === "card_distribution" ? `Waiting for ${actor?.name ?? "Guo Jia"} to assign Legacy cards`
    : canRespond ? responseProviderId && selectedResponseProvider && responseSelectionUsesCards ? `Your action · choose ${responseSelection.min === responseSelection.max ? responseSelection.min : `${responseSelection.min}-${responseSelection.max}`} card${responseSelection.max === 1 ? "" : "s"} for ${selectedResponseProvider.label} (${responseSelectedCardIds.length}/${responseSelection.max})` : requiredResponseKind === "Negation" ? `Your action · choose how to Negate ${room.pendingNegation?.responseTarget ?? room.pendingNegation?.cardName ?? "the latest effect"}, or skip` : `Your action · choose how to provide ${requiredResponseKind} for ${room.pendingGroup ? room.pendingGroup.cardKind === "SkyPiercingHalberdAttack" ? "Sky Piercing Halberd Attack" : cardDefinition(room.pendingGroup.cardKind).name : room.pendingDuel ? "the Duel" : "the Attack"}, or skip and take damage`
    : room.phase === "response" ? room.pendingNegation ? `Waiting for Negation · ${room.pendingNegation.responseTarget ?? room.pendingNegation.cardName}` : room.pendingGreenDragon ? `Waiting for ${actor?.name ?? "the attacker"} to decide whether Green Dragon Blade continues` : room.pendingRockCleaving ? `Waiting for ${actor?.name ?? "the attacker"} to decide whether Rock Cleaving Axe forces damage` : room.pendingGroup ? `Waiting for ${actor?.name ?? "the target"} to play ${room.pendingGroup.requiredKind}` : room.pendingDuel ? `Waiting for ${actor?.name ?? "the duelist"} to play Attack` : `Waiting for ${defender?.name ?? "the target"} to answer ${attacker?.name ?? "the attacker"}`
    : room.phase === "discard" && room.isMyTurn ? `Your action · Discard Phase · select ${excessCards} card${excessCards === 1 ? "" : "s"} (${discardSelected.length}/${excessCards})`
    : room.isMyTurn ? room.phase?.startsWith("draw") ? "Your action · Draw Phase" : serpentMode ? `Your action · choose 2 cards for Serpent Spear (${serpentSelected.length}/2), then choose a target` : halberdAttack && targetIds.length === 0 ? `Your action · Sky Piercing Halberd · choose 1 to 3 targets within Attack Range ${me?.attackRange ?? 1}` : halberdAttack ? `Your action · Sky Piercing Halberd · ${targetIds.length}/3 targets selected` : selectedCanPlayAsAttack && !target ? `Your action · Play Phase · choose a target within Attack Range ${me?.attackRange ?? 1}` : card?.kind === "Dismantle" && !target ? "Your action · choose a player with cards" : card?.kind === "Steal" && !target ? "Your action · choose a player within distance 1" : card?.kind === "Duel" && !target ? "Your action · choose any other player" : card?.kind === "Overindulgence" && !target ? "Your action · choose a player without Overindulgence" : card?.kind === "RationsDepleted" && !target ? "Your action · choose a player within distance 1 without Rations Depleted" : room.phase === "play-struck" ? "Your action · Play Phase · Attack used" : "Your action · Play Phase"
    : `Waiting for ${actor?.name ?? current?.name ?? "another player"}`;
  return <main className="game-shell"><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b></div><div className="top-actions"><button className="text-button" onClick={onLeave}>Exit</button></div></header>
    <section className="action-strip" aria-live="polite"><div className="action-step"><small>TURN OWNER</small><b>{current?.name ?? "—"}</b></div><span className="action-arrow">→</span><div className="action-step"><small>CURRENT PHASE</small><b>{phaseName(room.phase)}</b></div><span className="action-arrow">→</span><div className="action-step acting"><small>{drawWaitingForPresentation ? "NEXT TO ACT" : "ACTING NOW"}</small><b>{room.pendingNegation ? room.isMyAction ? `${actor?.name ?? "You"} · YOU` : "Waiting for Negation" : `${actor?.name ?? "—"}${room.isMyAction ? " · YOU" : ""}`}</b><em>{drawWaitingForPresentation ? "Your draw waits until earlier events finish" : room.actionReason}</em></div></section>
    <section className={`play-table ${sequenceEvents.length > 0 ? "sequence-active" : ""} ${resolutionClosing ? "sequence-concluding" : ""}`}>
      <aside className={`game-messages ${messagesCollapsed ? "collapsed" : ""}`} aria-label="Game Messages"><header><button type="button" onClick={() => setMessagesCollapsed((collapsed) => !collapsed)} aria-label={messagesCollapsed ? "Expand game messages" : "Collapse game messages"} aria-expanded={!messagesCollapsed}>{messagesCollapsed ? "▣" : "—"}</button></header>{!messagesCollapsed && <div aria-live="polite">{gameMessages.length ? gameMessages.map((entry, index) => <p className={index === gameMessages.length - 1 ? "latest" : ""} key={entry.id}><span>{entry.message}</span></p>) : <p className="empty">No gameplay messages yet.</p>}</div>}</aside>
      <button type="button" className="game-exit" onClick={onLeave}>Exit</button>
      {turnNotice && <div className="turn-notice" role="status"><span>TURN BEGINS</span><b>{turnNotice}</b></div>}
      {effectNotice && <div className="turn-notice effect-notice" role="status"><span>EFFECT TRIGGERED</span><b>{effectNotice}</b></div>}
      {canChooseBorrowedSword && <div className="turn-notice borrowed-sword-notice" role="status"><span>BORROWED SWORD</span><b>Choose a legal Attack target</b></div>}
      {canChooseBorrowedSword && !presentationBusy && room.pendingBorrowedSword && <div className="borrowed-sword-picker" role="dialog" aria-label="Borrowed Sword target selection"><span>Choose target for the forced Attack</span><div>{room.players.map((player) => { const eligible = room.pendingBorrowedSword?.eligibleTargetIds.includes(player.id) ?? false; return <button type="button" key={player.id} className={eligible ? "eligible" : ""} disabled={!eligible || busy || presentationBusy} onClick={() => chooseBorrowedSwordTarget(player.id)}><strong>{player.name}</strong><small>{heroName(player.hero)}</small></button>; })}</div></div>}
      {privateDrawCards.length > 0 && !activeEvent && eventQueue.length === 0 && <div className="played-card-stage private-draw-stage" role="status"><Countdown key={privateDrawCards.map((drawn) => drawn.id).join("-")} durationMs={UI_TIMING.privateDraw} label="Cards close in" /><div className="card-action-title"><b>PRIVATE DRAW</b><span>Only you can see these cards</span></div><div className="private-draw-row">{privateDrawCards.map((drawn) => <CardFace card={drawn} key={drawn.id} />)}</div></div>}
      {privateDistribution && !presentationBusy && <PrivateCardDistributionDialog key={room.actionRevision} cards={privateDistribution.cards} players={room.players.filter((player) => privateDistribution.eligibleRecipientIds.includes(player.id) && player.alive)} disabled={busy} error={error} onSubmit={(assignments) => onAction("trigger", { providerId: "private_card_distribution", assignments })} />}
      {tablePresentationVisible && <TableResolutionSequence events={sequenceEvents} activeEvent={displayedEvent} players={room.players} myTableIndex={myTableIndex} concluding={resolutionClosing} />}
      {room.pendingHarvest && !presentationBusy && <div className="game-event-stage harvest-choice-stage" role="dialog" aria-label="Bumper Harvest card choice"><div><span>BUMPER HARVEST</span><b>{room.pendingHarvest.complete ? "All choices complete" : harvestSubmitting ? "Your choice is submitted" : canChooseHarvest ? "Your turn — choose one card" : `${actor?.name ?? "The next player"} is choosing`}</b><small>{room.pendingHarvest.complete ? "The final shaded card remains visible before Bumper Harvest closes." : harvestSubmitting ? "Your card is shaded immediately while the next choice is prepared." : canChooseHarvest ? "Tap any available card to change your selection, then confirm. Selection changes are instant." : "Watch the current player's card rise, then become shaded when confirmed."}</small><div className="harvest-card-row">{room.pendingHarvest.revealed.map((choice) => { const takenBy = room.pendingHarvest?.choices.find((entry) => entry.cardId === choice.id); const submittedByMe = harvestSubmitting?.cardId === choice.id; const available = room.pendingHarvest?.availableIds.includes(choice.id); const awaitingConfirmation = !submittedByMe && activeHarvestSelection === choice.id; return <button type="button" className={`harvest-card-choice ${takenBy || submittedByMe ? "taken" : ""} ${awaitingConfirmation ? "pending-choice" : ""}`} disabled={!canChooseHarvest || Boolean(harvestSubmitting) || busy || !available} aria-pressed={awaitingConfirmation} aria-label={takenBy ? `${cardDefinition(choice.kind).name}, taken by ${takenBy.playerName}` : submittedByMe ? `${cardDefinition(choice.kind).name}, choice submitted by ${harvestSubmitting?.playerName ?? "ME"}` : `${cardDefinition(choice.kind).name}, ${awaitingConfirmation ? `selected by ${actor?.name ?? "current player"}, awaiting confirmation` : "available"}`} key={choice.id} onClick={() => { const nextCardId = activeHarvestSelection === choice.id ? "" : choice.id; setHarvestSelected(nextCardId); void publishHarvestPreview(nextCardId); }}><CardFace card={choice} />{takenBy && <strong className="harvest-taken-label">Taken by {takenBy.playerName}</strong>}{submittedByMe && !takenBy && <strong className="harvest-taken-label">Chosen by {harvestSubmitting?.playerName ?? "ME"}</strong>}{awaitingConfirmation && <strong className="harvest-pending-label">Selected by {actor?.name ?? "player"}</strong>}</button>; })}</div>{canChooseHarvest && (harvestSubmitting ? <div className="harvest-confirm-row"><small>Choice submitted · moving to the next player</small></div> : <div className="harvest-confirm-row"><small>{harvestSelectedCard ? `${cardDefinition(harvestSelectedCard.kind).name} selected` : "Select a card before confirming"}</small><button type="button" className="primary" disabled={busy || !harvestSelectedCard} onClick={async () => { if (!harvestSelectedCard || !me) return; const submission = { cardId: harvestSelectedCard.id, playerId: me.id, playerName: me.name }; queuedHarvestPreview.current = null; setHarvestSubmitting(submission); setHarvestSelected(""); const accepted = await onAction("choose_harvest", { cardId: submission.cardId }); if (!accepted) setHarvestSubmitting(null); }}>Confirm choice</button></div>)}</div></div>}
      <div className="play-center" aria-label="Card piles"><div className="draw-stack" data-draw-anchor="true" aria-label={`Draw pile, ${room.deckCount} cards`}><b>{room.deckCount}</b><span>DECK</span></div><div className="discard-stack" data-discard-anchor="true" data-discard-kind={visibleDiscardTop?.kind} aria-label={visibleDiscardTop ? `Discard pile, ${cardDefinition(visibleDiscardTop.kind).name}` : "Discard pile, empty"}>{visibleDiscardTop ? <CardFace card={visibleDiscardTop} /> : <b className="discard-empty">—</b>}<span>DISCARD</span></div></div>
      {canChooseTargetCard && pickerTarget && <div className="hidden-card-picker table-hidden-card-picker target-card-picker" style={{ "--angle": `${targetAngle}deg` } as React.CSSProperties} role="dialog" aria-modal="true" aria-label={`Choose one current card from ${pickerTarget.name}`}><span>{pickerTarget.name}&apos;s cards</span>{pickerTarget.handCount > 0 && <section><small>Hand</small><div>{Array.from({ length: pickerTarget.handCount }, (_, index) => <button type="button" className={targetCardZone === "hand" && targetCardIndex === index ? "selected" : ""} aria-pressed={targetCardZone === "hand" && targetCardIndex === index} key={index} onClick={() => { setTargetCardZone("hand"); setTargetCardIndex(index); setTargetCardId(""); }}>?</button>)}</div></section>}{pickerTarget.equipmentCards.length > 0 && <section><small>Equipment</small><div>{pickerTarget.equipmentCards.map((item) => <button type="button" className={targetCardZone === "equipment" && targetCardId === item.id ? "selected named" : "named"} aria-pressed={targetCardZone === "equipment" && targetCardId === item.id} key={item.id} onClick={() => { setTargetCardZone("equipment"); setTargetCardId(item.id); setTargetCardIndex(null); }}>{cardDefinition(item.kind).name}</button>)}</div></section>}{pickerTarget.judgementCards.length > 0 && <section><small>Judgement</small><div>{pickerTarget.judgementCards.map((item) => <button type="button" className={targetCardZone === "judgement" && targetCardId === item.id ? "selected named" : "named"} aria-pressed={targetCardZone === "judgement" && targetCardId === item.id} key={item.id} onClick={() => { setTargetCardZone("judgement"); setTargetCardId(item.id); setTargetCardIndex(null); }}>{cardDefinition(item.kind).name}</button>)}</div></section>}<div className="target-picker-actions">{canChooseTargetCard && <button className="primary" disabled={busy || !targetCardZone || targetCardZone === "hand" && targetCardIndex === null || targetCardZone !== "hand" && !targetCardId} onClick={() => onAction("choose_target_card", { targetCardZone, ...(targetCardZone === "hand" ? { targetCardIndex } : { targetCardId }) })}>{busy ? "Resolving…" : room.pendingTargetCard?.cardKind === "Steal" ? "Obtain selected" : "Discard selected"}</button>}</div>{error && <p className="error" role="alert">{error}</p>}</div>}
      {triggerResponse && responseDecisionReady && targetCardPickerOption && targetCardPickerSelection && targetCardPickerTarget && <TargetCardPicker option={targetCardPickerOption} selection={targetCardPickerSelection} target={targetCardPickerTarget} selectedKeys={triggerSelectedKeys} disabled={responseControlsDisabled} canDecline={triggerDeclineAction} error={error} onToggle={(key) => setTriggerSelectedKeys((keys) => { const validKeys = keys.filter((selectedKey) => targetCardPickerSelection.eligibleKeys.includes(selectedKey)); return validKeys.includes(key) ? validKeys.filter((selectedKey) => selectedKey !== key) : validKeys.length < targetCardPickerSelection.max ? [...validKeys, key] : validKeys; })} onUse={(keys) => onAction("trigger", { providerId: targetCardPickerOption.effectId, cardKeys: keys })} onDecline={() => onAction("decline_trigger")} />}
      {triggerResponse && responseDecisionReady && mandatoryChoiceTriggerOption?.selection?.type === "choice" && <MandatoryChoiceDialog option={mandatoryChoiceTriggerOption} selection={mandatoryChoiceTriggerOption.selection} hand={room.myHand} selectedChoice={triggerChoice} selectedKeys={triggerSelectionKeys} disabled={responseControlsDisabled} error={error} onChoice={(choice) => { setTriggerChoice(choice); setTriggerSelectedKeys([]); }} onToggle={(key) => setTriggerSelectedKeys((keys) => { const validKeys = keys.filter((selectedKey) => mandatoryChoiceTriggerOption.selection?.type === "choice" && mandatoryChoiceTriggerOption.selection.eligibleHandKeys.includes(selectedKey)); const required = mandatoryChoiceTriggerOption.selection?.type === "choice" ? mandatoryChoiceTriggerOption.selection.cardCountByChoice?.[triggerChoice] ?? (triggerChoice === "discard" ? 1 : 0) : 0; return validKeys.includes(key) ? validKeys.filter((selectedKey) => selectedKey !== key) : validKeys.length < required ? [...validKeys, key] : validKeys; })} onConfirm={(choice, cardKeys) => onAction("trigger", { providerId: mandatoryChoiceTriggerOption.effectId, choice, ...(cardKeys.length ? { cardKeys } : {}) })} />}
      {room.status === "finished" && <div className="victory-banner"><span>MATCH COMPLETE</span><b>{room.log.at(-1)?.replace("! The match is over.", "")}</b><small>All roles are now revealed at the table.</small></div>}
      <div className="player-board" aria-label="Players">{room.players.filter((player) => player.id !== room.meId).map((player) => { const index = room.players.findIndex((candidate) => candidate.id === player.id); const relativeIndex = (index - myTableIndex + room.players.length) % room.players.length; const selectedTargetCardKind = selectedCanPlayAsAttack ? "Attack" : card?.kind; const cardTargetLegal = Boolean(card && selectedTargetCardKind && canTargetCharacter({ sourceId: room.meId, targetId: player.id, targetHero: player.hero, cardKind: selectedTargetCardKind })); const targetablePlayer = Boolean((activeSkillTargetIds.includes(player.id) && canPlay) || (triggerTargetSelection?.targetIds.includes(player.id) && triggerTargetMode) || (serpentMode && canPlay) || (card && cardTargetLegal && (selectedCanPlayAsAttack || card.kind === "Dismantle" || card.kind === "Steal" || card.kind === "Duel" || card.kind === "BorrowedSword" || card.kind === "Overindulgence" || card.kind === "RationsDepleted"))); const targetInteraction = (room.isMyTurn && canPlay) || triggerTargetMode; const playerHero = heroDefinition(player.hero); const miniEquipment = player.equipmentCards.map((equipment) => <span className="mini-zone-card mini-equipment-card" data-equipment-id={equipment.id} key={equipment.id}><button type="button" className={`mini-equipment-button ${serpentSelected.includes(equipment.id) ? "selected-cost" : ""}`} disabled={!(triggerResponse && triggerSelectionUsesCards) || !responseDecisionReady || player.id !== room.meId || Boolean(triggerCardOption && !triggerCardOption.selection?.eligibleCardIds.includes(equipment.id))} onClick={() => setSerpentSelected((ids) => ids.includes(equipment.id) ? ids.filter((id) => id !== equipment.id) : ids.length < (triggerResponse && triggerSelectionUsesCards ? triggerSelection.max : 2) ? [...ids, equipment.id] : ids)}><CardFace card={equipment} /></button><button type="button" className="zone-info-button" aria-label={`Explain ${cardDefinition(equipment.kind).name}`} onClick={(event) => { event.stopPropagation(); setInfoCard(equipment); }}>i</button></span>); const miniJudgement = player.judgementCards.map((judgement) => <span className="mini-zone-card judgement-mini" data-judgement-id={judgement.id} key={judgement.id} style={{ visibility: judgementInFlight.has(judgement.id) ? "hidden" : "visible" }}><span><small>{judgement.rank}{judgement.suit}</small><b>{cardDefinition(judgement.kind).name}</b></span><button type="button" className="zone-info-button" aria-label={`Explain ${cardDefinition(judgement.kind).name}`} onClick={() => setInfoCard(judgement)}>i</button></span>); return <article className={`player-square player-square-${relativeIndex} ${player.seat === room.turnSeat ? "turn-square" : ""} ${player.id === room.actionPlayerId ? "action-square" : ""} ${targetIds.includes(player.id) ? "selected-target" : ""} ${!player.alive ? "defeated-square" : ""}`} data-player-anchor={player.id} key={`square-${player.id}`}><div className="player-hero-card"><button type="button" className="player-square-target" disabled={!targetInteraction || !player.alive || player.id === room.meId || !targetablePlayer} onClick={() => { setTarget(player.id); setTargetCardIndex(null); }}>{playerHero && <span className="player-square-portrait" data-hero-id={playerHero.id}><HeroPortrait hero={playerHero} /></span>}<strong>{player.name}</strong><span>{playerHero?.name ?? heroName(player.hero)}</span><span className="player-hp">HP {player.hp ?? 0}/{player.maxHp ?? 0}</span><span className="player-hearts">{hpDisplay(player.hp)}</span><small className="player-hand-count">Hand cards: {player.handCount}</small></button>{playerHero && <button type="button" className="hero-card-info-button" aria-label={`Explain ${playerHero.name}`} onClick={() => setInfoHero(playerHero)}>i</button>}</div>{player.equipmentCards.length > 0 && <div className="square-zone"><label>Equipment</label><div>{miniEquipment}</div></div>}{player.judgementCards.length > 0 && <div className="square-zone judgement-square-zone"><label>Judgement</label><div>{miniJudgement}</div></div>}</article>; })}</div>
      {seatCountdown && <Countdown key={seatCountdown.key} visibleAt={room.phase === "response" ? room.responseCountdownVisibleAt : 0} durationMs={seatCountdown.durationMs} deadline={seatCountdown.deadline} label={seatCountdown.label} />}
    </section>
    <footer className="play-command">
    <LocalPlayerDock player={me} hero={localHero} onHeroInfo={setInfoHero} onInfoCard={setInfoCard} equipmentSelection={localEquipmentSelection} hiddenCardIds={judgementInFlight}
      heroSkillControl={
        <section className="hero-skills local-hero-skills" aria-label="Available hero skills">
          {heroSkillButtons.map((skill) => <button type="button" key={skill.name} className={`hero-skill-button ${skill.active ? "active" : ""}`} aria-label={skill.name} aria-pressed={skill.active} title={skill.description} disabled={!skill.enabled || busy || presentationBusy && !skill.active} onClick={() => skill.onClick?.()}>{skill.active && (me?.hero === "guan-yu" || me?.hero === "zhao-yun") ? `Cancel ${skill.name}` : skill.name}</button>)}
        </section>
      }>
        <div className="local-hand-section">
          <div className="local-hand" data-card-origin-anchor={room.meId} aria-label="Your hand">{(() => { const multiSelectMode = room.phase === "discard" || Boolean(activeSkillSelection || serpentMode || responseSelectionMax > 1 || triggerSelectionMax > 1); const responseSelectionLimit = triggerResponse && triggerSelectionUsesCards ? triggerSelection.max : responseSelectionUsesCards ? responseSelection.max : 2; const toggleHandCard = (item: Card) => { const costSelection = serpentMode || canRespond && responseSelectionUsesCards && responseSelectionMax > 1 || triggerResponse && triggerSelectionUsesCards && triggerSelectionMax > 1; if (room.phase === "discard") setDiscardSelected((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : ids.length < excessCards ? [...ids, item.id] : ids); else if (activeSkillSelection) setActiveSkillSelectionState((state) => { if (!state || !activeSkillStateIsCurrent) return state; const validIds = state.cardIds.filter((id) => activeSkillSelection.eligibleCardIds.includes(id)); return validIds.includes(item.id) ? { ...state, cardIds: validIds.filter((id) => id !== item.id) } : validIds.length < activeSkillSelection.max ? { ...state, cardIds: [...validIds, item.id] } : { ...state, cardIds: validIds }; }); else if (costSelection) setSerpentSelected((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : ids.length < responseSelectionLimit ? [...ids, item.id] : ids); else { setSelected((id) => id === item.id ? "" : item.id); setTarget(""); } setTargetCardIndex(null); }; const renderHandCard = (item: Card, index: number) => { const definition = cardDefinition(item.kind); const costSelection = serpentMode || canRespond && responseSelectionUsesCards && responseSelectionMax > 1 || triggerResponse && triggerSelectionUsesCards && triggerSelectionMax > 1; const isSelected = room.phase === "discard" ? discardSelected.includes(item.id) : activeSkillSelection ? activeSkillSelectedCardIds.includes(item.id) : costSelection ? serpentSelected.includes(item.id) : selected === item.id; const singleSelected = !multiSelectMode && isSelected; const maySelect = (room.isMyTurn && (canPlay || room.phase === "discard")) || responseDecisionReady || rescueDecisionReady; const skillModeCardDisabled = Boolean(activeSkillTargetSelection || wushengMode && !wushengEligibleCardIds.has(item.id) || longdanMode && !longdanEligibleCardIds.has(item.id) || activeSkillSelection && !activeSkillSelection.eligibleCardIds.includes(item.id)); const skillModeEligible = wushengMode && wushengEligibleCardIds.has(item.id) || longdanMode && longdanEligibleCardIds.has(item.id) || activeSkillSelection?.eligibleCardIds.includes(item.id) === true; return <div className={`card-slot ${singleSelected ? "single-selected" : ""}`} data-hand-card-id={item.id} key={`rail-${item.id}`} style={{ marginLeft: index === 0 ? 0 : `${handCardLayout.step - 68}px` }}><div className="hand-card-visual"><button disabled={!maySelect || skillModeCardDisabled || (responseDecisionReady && (canRespond || triggerResponse) && !responseCardAllowed(item)) || (rescueDecisionReady && item.kind !== "Peach")} onClick={() => toggleHandCard(item)} className={`game-card ${item.kind.toLowerCase()} ${suitColorClass(item.suit)} ${isSelected ? "selected" : ""} ${skillModeEligible ? "hero-skill-eligible" : ""}`}><span className="corner">{item.rank}<i>{item.suit}</i></span><span className="card-name-mark">{definition.name}</span><strong>{definition.category} card</strong></button><button type="button" className="card-info-button" aria-label={`Explain ${definition.name}`} onClick={(event) => { event.stopPropagation(); setInfoCard(item); }}>i</button></div></div>; }; return <div ref={handRailRef} className="local-hand-rail" data-hand-layout={handCardLayout.measured ? "measured" : "pending"} style={{ justifyContent: room.myHand.length === 1 ? "center" : "flex-start" }} aria-label="Peek hand cards">{room.myHand.map((item, index) => renderHandCard(item, index))}</div>; })()}</div>
        </div>
      <div className="turn-controls">
        <span>{commandPrompt}</span>
        <div>

          {rescueDecisionReady && <><button className="primary" disabled={busy || card?.kind !== "Peach"} onClick={() => { if (card?.kind === "Peach") void onAction("give_peach", { cardId: card.id }); setSelected(""); }}>{busy ? "Playing…" : "Peach"}</button><button className="end" disabled={busy} onClick={() => { void onAction("skip_rescue"); setSelected(""); }}>{busy ? "Skipping…" : "Skip"}</button></>}
          {invalidResponseState && <p className="error" role="status">Waiting for the latest response state…</p>}
          {triggerResponse && <>{triggerOptions.map((option) => option.selection?.type === "target_cards" || option.selection?.type === "choice" && option.allowDecline === false ? null : option.selection ? <button key={option.effectId} className={`serpent-control ${responseProviderId === option.effectId ? "active" : ""}`} disabled={responseControlsDisabled} onClick={() => { const active = responseProviderId === option.effectId; setResponseProviderId(active ? "" : option.effectId); setSelected(""); setTargetIds([]); setSerpentSelected([]); setTriggerSelectedKeys([]); }}>{responseProviderId === option.effectId ? `Cancel ${option.label}` : option.selection.type === "target" ? `Use ${option.label}` : option.label}</button> : <button key={option.effectId} className="primary" disabled={responseControlsDisabled} onClick={() => onAction("trigger", { providerId: option.effectId })}>{`Use ${option.label}`}</button>)}{selectedTriggerOption?.selection?.type === "cards" && <button className="primary" disabled={responseControlsDisabled || !triggerSelectionComplete} onClick={() => onAction("trigger", { providerId: selectedTriggerOption.effectId, ...(triggerSelectedCardIds.length === 1 ? { cardId: triggerSelectedCardIds[0] } : { cardIds: triggerSelectedCardIds }) })}>{`Use ${selectedTriggerOption.label}`}</button>}{triggerTargetSelection && <button className="primary" disabled={responseControlsDisabled || !triggerTargetComplete} onClick={() => onAction("trigger", { providerId: selectedTriggerOption.effectId, targetIds })}>{`Use ${selectedTriggerOption.label}`}</button>}{triggerDeclineAction && !targetCardPickerOption && <button className="end" disabled={responseControlsDisabled} onClick={() => onAction("decline_trigger")}>Skip</button>}</>}
          {(activeSkillSelection || activeSkillTargetSelection) && <button className="primary" disabled={busy || presentationBusy || !activeSkillComplete || !activeSkillSubmission} onClick={() => activeSkillSubmission && onAction("trigger", activeSkillSubmission)}>{`Use ${activeSkillOption?.label}`}</button>}
          {canRespond && <>{genericResponse && semanticResponseOptions.length > 0 && <>{genericResponseOptions.map((option) => option.selection ? <button key={option.providerId} className={`serpent-control ${responseProviderId === option.providerId ? "active" : ""}`} disabled={responseControlsDisabled} onClick={() => { const active = responseProviderId === option.providerId; setResponseProviderId(active ? "" : option.providerId); setSelected(""); setSerpentSelected([]); }}>{responseProviderId === option.providerId ? `Cancel ${option.label}` : option.label}</button> : <button key={option.providerId} className="primary" disabled={responseControlsDisabled} onClick={() => submitResponseProvider(option)}>{busy ? "Resolving…" : option.label}</button>)}{selectedResponseProvider?.selection && <button className="primary" disabled={responseControlsDisabled || !responseSelectionComplete} onClick={() => submitResponseProvider()}>{busy ? "Playing…" : selectedResponseProvider.activation === "implicit" ? selectedResponseProvider.label : `Use ${selectedResponseProvider.label}`}</button>}</>}<button className="end" disabled={responseControlsDisabled || !responseDamageAction} onClick={() => responseDamageAction && onAction(responseDamageAction)}>Skip</button></>}
          {room.isMyTurn && room.phase === "discard" && <button className="end" disabled={busy || discardSelected.length !== excessCards} onClick={() => onAction("discard_cards", { cardIds: discardSelected })}>{busy ? "Discarding…" : `Discard ${excessCards} selected`}</button>}
          {room.isMyTurn && canPlay && <>{canFormSerpentAttack && <button className={`serpent-control ${serpentMode ? "active" : ""}`} onClick={() => { setSerpentMode((active) => !active); setSerpentSelected([]); setSelected(""); setTarget(""); }}>{serpentMode ? "Normal" : "Spear"}</button>}<button className="primary" disabled={serpentMode ? busy || presentationBusy || !canDeclareAttack || serpentSelected.length !== 2 || !attackTargetsValid : busy || presentationBusy || !card || selectedCanPlayAsAttack && (!canDeclareAttack || !attackTargetsValid) || (["Dismantle", "Steal", "Duel", "Overindulgence", "RationsDepleted"].includes(card.kind) && !target) || !selectedCanPlayAsAttack && (card.kind === "Dodge" || card.kind === "Negation")} onClick={serpentMode ? playSerpentAttack : play}>{busy ? "Playing…" : serpentMode ? "Form Attack" : "Play"}</button><button className="end" disabled={busy || presentationBusy} onClick={() => onAction("end_turn")}>{busy ? "Finishing…" : "End"}</button></>}
        </div>
      </div>
      </LocalPlayerDock>
    </footer>
    {infoCard && <div className="card-info-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setInfoCard(null)}><section className="card-info-dialog" role="dialog" aria-modal="true" aria-labelledby="card-info-title"><button type="button" className="card-info-close" onClick={() => setInfoCard(null)} aria-label="Close card explanation">×</button><span>PRIVATE CARD INFORMATION</span><small>{infoCard.rank}{infoCard.suit} · {cardDefinition(infoCard.kind).category} card</small><h2 id="card-info-title">{cardDefinition(infoCard.kind).name}</h2><p>{cardDefinition(infoCard.kind).rules}</p><em>Only you can see this explanation.</em></section></div>}{infoHero && <HeroInfoDialog hero={infoHero} onClose={() => setInfoHero(null)} />}
  </main>;
}

type TargetCardSelection = Extract<NonNullable<TriggerOptionView["selection"]>, { type: "target_cards" }>;
type ChoiceTriggerSelection = Extract<NonNullable<TriggerOptionView["selection"]>, { type: "choice" }>;

function PrivateCardDistributionDialog({ cards, players, disabled, error, onSubmit }: { cards: Card[]; players: Player[]; disabled: boolean; error: string; onSubmit: (assignments: Array<{ cardId: string; recipientId: string }>) => void }) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const complete = cards.length > 0 && cards.every((card) => Boolean(assignments[card.id]));
  const submit = () => onSubmit(cards.map((card) => ({ cardId: card.id, recipientId: assignments[card.id] })));
  return <div className="target-card-picker-overlay" role="presentation"><section className="target-card-picker-panel choice-trigger-panel" role="dialog" aria-modal="true" aria-label="Legacy card distribution">
    <header><strong>LEGACY</strong><span>Look at the top 2 cards, then give each card to any living character.</span></header>
    <div className="legacy-distribution-row">{cards.map((card) => <div className="legacy-distribution-card" key={card.id}><CardFace card={card} /><label>Give this card to<select value={assignments[card.id] ?? ""} disabled={disabled} onChange={(event) => setAssignments((current) => ({ ...current, [card.id]: event.target.value }))}><option value="">Choose a character</option>{players.map((player) => <option value={player.id} key={player.id}>{player.name}</option>)}</select></label></div>)}</div>
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
  const labelForChoice = (choice: { id: string; label: string }) => choice.id === "draw" ? "Keep hand — attacker draws 1 card" : choice.label;
  return <div className="target-card-picker-overlay" role="presentation"><section className="target-card-picker-panel choice-trigger-panel" role="dialog" aria-modal="true" aria-label={`${option.label} decision`}>
    <header><strong>{option.label.toUpperCase()}</strong><span>{option.description ?? "Choose one:"}</span></header>
    <div className="choice-trigger-options">{selection.choices.map((choice) => <button type="button" key={choice.id} className={selectedChoice === choice.id ? "selected" : ""} disabled={disabled} aria-pressed={selectedChoice === choice.id} onClick={() => onChoice(choice.id)}>{labelForChoice(choice)}</button>)}</div>
    {needsHandCard && <><div className="target-card-picker-card-row choice-trigger-card-row" aria-label="Eligible hand cards">{handKeys.map((key) => { const index = Number(key.slice(5)); const card = hand[index]; if (!card) return null; const selected = validSelectedKeys.includes(key); return <button type="button" key={key} className={`target-card-picker-card ${selected ? "selected" : ""}`} disabled={disabled} aria-pressed={selected} aria-label={`${cardDefinition(card.kind).name} ${card.rank}${card.suit}`} onClick={() => onToggle(key)}><CardFace card={card} />{selected && <span className="target-card-picker-check" aria-hidden="true">✓</span>}</button>; })}</div><div className="target-card-picker-count" aria-live="polite">{validSelectedKeys.length} / {requiredHandCount} selected</div></>}
    <div className="target-card-picker-actions"><button type="button" className="primary" disabled={disabled || !complete} onClick={() => onConfirm(selectedChoice, validSelectedKeys)}>Confirm choice</button></div>
    {error && <p className="error" role="alert">{error}</p>}
  </section></div>;
}

function TargetCardPicker({ option, selection, target, selectedKeys, disabled, canDecline, error, onToggle, onUse, onDecline }: { option: TriggerOptionView; selection: TargetCardSelection; target: Player; selectedKeys: string[]; disabled: boolean; canDecline: boolean; error: string; onToggle: (key: string) => void; onUse: (keys: string[]) => void; onDecline: () => void }) {
  const validSelectedKeys = selectedKeys.filter((key) => selection.eligibleKeys.includes(key));
  const handKeys = selection.eligibleKeys
    .filter((key) => /^hand:\d+$/.test(key))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));
  const eligiblePublicKeys = new Set(selection.eligibleKeys.filter((key) => !/^hand:\d+$/.test(key)));
  const publicCards = [...target.equipmentCards, ...target.judgementCards].filter((item) => eligiblePublicKeys.has(item.id));
  const items = [
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
