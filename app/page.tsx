"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { cardDefinition, isAttackCard } from "../game/cards";
import type { Card } from "../game/model";

type Hero = { id: string; name: string; faction: string; hp: number; ability: string };
type CardEvent = { id: string; player: string; target: string; card: Card; action?: "play" | "discard" | "gain" | "reveal"; presentation?: boolean };
type CardGroupEvent = { id: string; type: "cards"; player: string; target: string; cards: Card[]; action: "discard" | "reveal"; presentation?: boolean };
type GameEvent = (CardEvent & { type: "card"; message?: string }) | CardGroupEvent | { type: "message"; id: string; message: string; presentation?: boolean };
type Player = { id: string; name: string; seat: number; hero: string | null; hp: number | null; maxHp: number | null; alive: boolean; handCount: number; judgementCards: Card[]; distance: number | null; isHost: boolean; isBot?: boolean; role: string | null };
type Room = { code: string; status: "lobby" | "heroes" | "started" | "playing" | "finished"; maxPlayers: number; isHost: boolean; meId: string; myRole: string | null; myHeroOptions: Hero[]; players: Player[]; myHand: Card[]; turnSeat: number | null; phase: string | null; deckCount: number; discardTop: Card | null; log: string[]; timeline: GameEvent[]; isMyTurn: boolean; actionPlayerId: string | null; actionReason: string; isMyAction: boolean; pendingAttack: { sourceId: string; targetId: string; deadline?: number } | null; pendingDuel: { sourceId: string; targetId: string; actorId: string; opponentId: string; deadline?: number } | null; pendingGroup: { cardKind: "BarbarianInvasion" | "RainingArrows"; sourceId: string; actorId: string; requiredKind: "Attack" | "Dodge"; deadline?: number } | null; pendingNegation: { sourceId: string; actorId: string; effectTargetId: string; cardName: string; negated: boolean; deadline?: number } | null; pendingHarvest: { sourceId: string; actorId: string; revealed: Card[]; availableIds: string[]; choices: { cardId: string; playerId: string; playerName: string }[]; previewCardId: string | null; complete: boolean; countdownUntil: number } | null; pendingDying: { sourceId: string; targetId: string; deadline: number } | null };

function publicPlayerName(name: string) { return name.replace(/^Test General (\d+)$/, "Player $1"); }

function pendingTimelineSequence(room: Room) {
  const sourceId = room.pendingNegation?.sourceId ?? room.pendingDuel?.sourceId ?? room.pendingAttack?.sourceId ?? room.pendingGroup?.sourceId;
  const source = room.players.find((player) => player.id === sourceId);
  if (!source) return [];
  const expectedName = room.pendingNegation?.cardName ?? (room.pendingDuel ? "Duel" : room.pendingGroup ? cardDefinition(room.pendingGroup.cardKind).name : room.pendingAttack ? "Attack" : null);
  const sourceName = publicPlayerName(source.name);
  const initiatingIndex = [...room.timeline].map((event, index) => ({ event, index })).reverse().find(({ event }) => event.type === "card" && event.action !== "gain" && event.action !== "reveal" && publicPlayerName(event.player) === sourceName && (!expectedName || cardDefinition(event.card.kind).name === expectedName))?.index ?? -1;
  if (initiatingIndex < 0) return [];
  return room.timeline.slice(initiatingIndex).filter((event) => event.presentation !== false);
}

function eventCards(event: GameEvent) { return event.type === "card" ? [event.card] : event.type === "cards" ? event.cards : []; }
function movesDirectlyToDiscard(event: GameEvent) {
  return event.type === "cards" ? event.action === "discard" : event.type === "card" ? event.action === "discard" || event.action === "reveal" : false;
}
function retainsAtPlayer(event: GameEvent) {
  return eventCards(event).length === 0 || (!movesDirectlyToDiscard(event) && !(event.type === "card" && event.action === "gain"));
}
function appendUniqueEvents(current: GameEvent[], incoming: GameEvent[]) {
  return incoming.reduce((events, event) => events.some((existing) => existing.id === event.id) ? events : [...events, event], current);
}

const UI_TIMING = {
  roomPoll: 2500,
  harvestPoll: 300,
  turnDrawStart: 100,
  playedCard: 4000,
  eventMessage: 3000,
  privateDraw: 3000,
  sequenceDiscard: 700,
} as const;

export default function Home() {
  const name = "ME";
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const stateEpoch = useRef(0);

  const fetchRoom = useCallback(async (roomCode: string, playerToken: string, quiet = false) => {
    const epoch = stateEpoch.current;
    try {
      const response = await fetch(`/api/rooms?code=${roomCode}&token=${playerToken}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Room is no longer available.");
      const nextRoom = await response.json(); if (epoch === stateEpoch.current) setRoom(nextRoom);
    } catch (cause) { if (!quiet) setError(cause instanceof Error ? cause.message : "Could not reach the room."); }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("three-realms-session");
    if (!saved) return;
    try {
      const session = JSON.parse(saved) as { code: string; token: string };
      const timer = setTimeout(() => { setToken(session.token); setCode(session.code); fetchRoom(session.code, session.token); }, 0);
      return () => clearTimeout(timer);
    } catch { localStorage.removeItem("three-realms-session"); }
  }, [fetchRoom]);

  const roomCode = room?.code;
  useEffect(() => {
    if (!roomCode || !token || busy) return;
    const timer = setInterval(() => fetchRoom(roomCode, token, true), room?.pendingHarvest || room?.pendingNegation ? UI_TIMING.harvestPoll : UI_TIMING.roomPoll);
    return () => clearInterval(timer);
  }, [roomCode, token, busy, fetchRoom, room?.pendingHarvest, room?.pendingNegation]);

  async function send(action: "create" | "join" | "start" | "add_test_players" | "choose_hero" | "draw" | "play_card" | "end_turn" | "respond_dodge" | "take_damage" | "respond_duel" | "take_duel_damage" | "respond_group" | "take_group_damage" | "respond_negation" | "pass_negation" | "preview_harvest" | "choose_harvest" | "discard_cards" | "start_response_timer" | "start_rescue_timer" | "give_peach" | "skip_rescue", extra: Record<string, unknown> = {}) {
    const epoch = ++stateEpoch.current; const backgroundPreview = action === "preview_harvest"; const nonBlocking = backgroundPreview || action === "choose_harvest";
    if (!nonBlocking) { setBusy(true); setError(""); }
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, name, code, token, ...extra }) });
      const data = await response.json() as { error?: string; token?: string; room?: Room };
      if (!response.ok || !data.room) throw new Error(data.error ?? "Something went wrong.");
      const nextToken = data.token ?? token;
      if (epoch === stateEpoch.current) { setToken(nextToken); setRoom(data.room); setCode(data.room.code); }
      localStorage.setItem("three-realms-session", JSON.stringify({ code: data.room.code, token: nextToken, name }));
      return true;
    } catch (cause) { if (!backgroundPreview) setError(cause instanceof Error ? cause.message : "Something went wrong."); return false; }
    finally { if (!nonBlocking) setBusy(false); }
  }

  function leave() {
    localStorage.removeItem("three-realms-session"); setRoom(null); setToken(""); setCode(""); setError("");
  }

  if (room?.status === "started" || room?.status === "playing" || room?.status === "finished") return <GameRoom room={room} busy={busy} error={error} onAction={send} onLeave={leave} />;
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
          <div className="role-row"><Role title="Lord" glyph="主" /><Role title="Loyalist" glyph="忠" /><Role title="Rebel" glyph="反" /><Role title="Traitor" glyph="内" /></div>
        </div>
        <div className="entry-card">
          <div className="entry-title"><span>ENTER THE REALM</span><small>4–8 players · One device each</small></div>
          <div className="test-player-name"><span>YOU ARE PLAYING AS</span><b>ME</b></div>
          <button className="gold-button" disabled={busy} onClick={() => send("create", { quickStart: true })}>{busy ? "Preparing…" : "Start test game"}</button>
          <div className="divider"><span>OR JOIN A FRIEND</span></div>
          <form onSubmit={(event: FormEvent) => { event.preventDefault(); send("join"); }}>
            <label>Five-character room code<input className="code-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))} maxLength={5} placeholder="ABCDE" autoCapitalize="characters" /></label>
            <button className="outline-button" disabled={busy || code.length !== 5}>Join room</button>
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

function WaitingRoom({ room, busy, error, onStart, onAddTestPlayers, onLeave }: { room: Room; busy: boolean; error: string; onStart: () => void; onAddTestPlayers: () => void; onLeave: () => void }) {
  const share = async () => { await navigator.clipboard?.writeText(room.code); };
  return <main className="lobby-shell"><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b></div><button className="text-button" onClick={onLeave}>Leave room</button></header>
    <section className="lobby-content"><div className="lobby-heading"><span className="eyebrow">THE GENERALS ASSEMBLE</span><h1>Waiting room</h1><p>Share this code with your friends. The match begins when 4–8 players have joined.</p><button className="copy-code" onClick={share}><span>{room.code}</span><small>Tap to copy room code</small></button></div>
      <div className="seat-grid">{Array.from({ length: room.maxPlayers }, (_, seat) => { const player = room.players.find((item) => item.seat === seat); return <div className={`seat ${player ? "filled" : ""} ${player?.isBot ? "bot-seat" : ""}`} key={seat}>{player ? <><span className="seat-number">{seat + 1}</span><div className="seal">{player.name[0].toUpperCase()}</div><b>{player.name}</b><small>{player.isHost ? "HOST · LORD" : player.isBot ? "TEST PLAYER · BOT" : "ROLE HIDDEN"}</small></> : <><span className="seat-number">{seat + 1}</span><div className="empty-seal">+</div><b>Open seat</b><small>WAITING FOR PLAYER</small></>}</div>; })}</div>
      <div className="lobby-actions"><span>{room.players.length} / {room.maxPlayers} players</span>{room.isHost ? <div className="host-actions">{room.players.length < 4 && <button className="test-button" disabled={busy} onClick={onAddTestPlayers}>+ Add test players</button>}<button className="gold-button" disabled={busy || room.players.length < 4} onClick={onStart}>{busy ? "Preparing…" : room.players.length < 4 ? `Need ${4 - room.players.length} more` : "Start match"}</button></div> : <p>Waiting for the host to start…</p>}</div>{error && <p className="error" role="alert">{error}</p>}</section></main>;
}

function HeroSelection({ room, busy, error, onChoose, onLeave }: { room: Room; busy: boolean; error: string; onChoose: (heroId: string) => void; onLeave: () => void }) {
  const [selected, setSelected] = useState(room.myHeroOptions[0]?.id ?? "");
  const me = room.players.find((player) => player.id === room.meId);
  const waiting = Boolean(me?.hero);
  const chosenCount = room.players.filter((player) => player.hero).length;
  return <main className="hero-shell"><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b><span>Choose a hero</span></div><button className="text-button" onClick={onLeave}>Exit</button></header>
    <section className="hero-stage"><div className="hero-stage-head"><span className="eyebrow">YOUR SECRET ROLE · {room.myRole?.toUpperCase()}</span><h1>{waiting ? "Your general is chosen" : "Choose your general"}</h1><p>{waiting ? `Waiting for the other players · ${chosenCount}/${room.players.length} ready` : room.myRole === "Lord" ? "As Lord, choose from five generals. Your identity will be visible at the table." : "Choose one of your three private candidates."}</p></div>
      {waiting ? <div className="chosen-wait"><div className="seal">✓</div><b>{heroName(me?.hero)}</b><span>Locked in</span><div className="ready-list">{room.players.map((player) => <small key={player.id} className={player.hero ? "ready" : ""}>{player.name} {player.hero ? "✓" : "…"}</small>)}</div></div> : <div className="hero-choice-grid">{room.myHeroOptions.map((hero) => <button key={hero.id} className={`hero-choice ${hero.faction.toLowerCase()} ${selected === hero.id ? "selected" : ""}`} onClick={() => setSelected(hero.id)}><span className="faction">{hero.faction}</span><div className="hero-monogram">{hero.name.split(" ").map((part) => part[0]).join("")}</div><h2>{hero.name}</h2><span className="hero-hp">{"♥".repeat(hero.hp)}</span><p>Hero abilities will be added after the general rules are complete.</p><i>{selected === hero.id ? "SELECTED" : "CHOOSE"}</i></button>)}</div>}
      {!waiting && <div className="hero-confirm"><span>Hero choices are private until locked in.</span><button className="gold-button" disabled={busy || !selected} onClick={() => onChoose(selected)}>{busy ? "Locking in…" : `Confirm ${room.myHeroOptions.find((hero) => hero.id === selected)?.name ?? "hero"}`}</button></div>}{error && <p className="error hero-error" role="alert">{error}</p>}
    </section></main>;
}

function heroName(id?: string | null) { return id ? id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") : "Unknown"; }
function phaseName(phase?: string | null) { return phase?.startsWith("draw") ? "Draw Phase" : phase?.startsWith("play") ? "Play Phase" : phase === "discard" ? "Discard Phase" : phase === "response" ? "Response" : phase === "dying" ? "Dying Rescue" : phase === "resolving" ? "Resolving" : phase === "finished" ? "Finished" : ""; }

function Countdown({ durationMs, deadline = 0, label = "Continuing in" }: { durationMs: number; deadline?: number; label?: string }) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  useEffect(() => {
    const endAt = deadline > 0 ? deadline : Date.now() + durationMs;
    const update = () => setRemainingMs(Math.max(0, endAt - Date.now()));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [deadline, durationMs]);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  return <div className="visible-countdown" aria-label={`${label} ${remainingSeconds} seconds`}><span>{label}</span><b>{remainingSeconds}s</b></div>;
}

function GameRoom({ room, busy, error, onAction, onLeave }: { room: Room; busy: boolean; error: string; onAction: (action: "draw" | "play_card" | "end_turn" | "respond_dodge" | "take_damage" | "respond_duel" | "take_duel_damage" | "respond_group" | "take_group_damage" | "respond_negation" | "pass_negation" | "preview_harvest" | "choose_harvest" | "discard_cards" | "start_response_timer" | "start_rescue_timer" | "give_peach" | "skip_rescue", extra?: Record<string, unknown>) => Promise<boolean>; onLeave: () => void }) {
  const initialPendingSequence = pendingTimelineSequence(room);
  const initialHeldCardIds = new Set(initialPendingSequence.flatMap(eventCards).map((item) => item.id));
  const [selected, setSelected] = useState(""); const [target, setTarget] = useState("");
  const [harvestSelected, setHarvestSelected] = useState("");
  const queuedHarvestPreview = useRef<string | null>(null); const harvestPreviewInFlight = useRef(false);
  const [harvestSubmitting, setHarvestSubmitting] = useState<{ cardId: string; playerId: string; playerName: string } | null>(null);
  const [optimisticPlay, setOptimisticPlay] = useState<(CardEvent & { type: "card" }) | null>(null);
  const optimisticallyPresentedCards = useRef(new Set<string>());
  const [targetCardIndex, setTargetCardIndex] = useState<number | null>(null);
  const [discardSelected, setDiscardSelected] = useState<string[]>([]); const automaticDraw = useRef("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [infoCard, setInfoCard] = useState<Card | null>(null);
  const automaticResponseTimeout = useRef("");
  const automaticRescueSkip = useRef("");
  const [turnNotice, setTurnNotice] = useState(""); const onActionRef = useRef(onAction);
  const [privateDrawCards, setPrivateDrawCards] = useState<Card[]>([]); const knownHandCards = useRef(new Set(room.myHand.map((item) => item.id)));
  const [eventQueue, setEventQueue] = useState<GameEvent[]>([]); const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null); const seenEvents = useRef(new Set((room.timeline ?? []).map((event) => event.id)));
  const instantPresentationEvents = useRef(new Set<string>());
  const [resolutionEvents, setResolutionEvents] = useState<GameEvent[]>(initialPendingSequence);
  const [resolutionClosing, setResolutionClosing] = useState(false);
  const resolutionRevision = useRef(0);
  const [visibleDiscardTop, setVisibleDiscardTop] = useState<Card | null>(() => room.discardTop && initialHeldCardIds.has(room.discardTop.id) ? null : room.discardTop);
  const latestDiscardTop = useRef(room.discardTop);
  const [processedTimelineKey, setProcessedTimelineKey] = useState(() => room.timeline.map((event) => event.id).join("|"));
  const card = room.myHand.find((item) => item.id === selected); const current = room.players.find((player) => player.seat === room.turnSeat); const actor = room.players.find((player) => player.id === room.actionPlayerId); const me = room.players.find((player) => player.id === room.meId); const targetPlayer = room.players.find((player) => player.id === target);
  const excessCards = Math.max(0, room.myHand.length - (me?.hp ?? 0));
  const myTableIndex = Math.max(0, room.players.findIndex((player) => player.id === room.meId));
  const targetTableIndex = targetPlayer ? room.players.findIndex((player) => player.id === targetPlayer.id) : -1;
  const targetRelativeIndex = targetTableIndex >= 0 ? (targetTableIndex - myTableIndex + room.players.length) % room.players.length : 0;
  const targetAngle = 180 + (360 / room.players.length) * targetRelativeIndex;
  const attacker = room.players.find((player) => player.id === room.pendingAttack?.sourceId); const defender = room.players.find((player) => player.id === room.pendingAttack?.targetId);
  const dyingPlayer = room.players.find((player) => player.id === room.pendingDying?.targetId);
  const canPlay = room.phase?.startsWith("play") && room.status === "playing";
  const canChooseHarvest = room.phase === "response" && Boolean(room.pendingHarvest) && !room.pendingHarvest?.complete && room.isMyAction;
  const canRespond = room.phase === "response" && !room.pendingHarvest && room.isMyAction;
  const duelResponse = canRespond && Boolean(room.pendingDuel);
  const groupResponse = canRespond && Boolean(room.pendingGroup);
  const negationResponse = canRespond && Boolean(room.pendingNegation);
  const requiredResponseKind = negationResponse ? "Negation" : duelResponse || room.pendingGroup?.requiredKind === "Attack" ? "Attack" : "Dodge";
  const responseCardAllowed = (item: Card) => requiredResponseKind === "Negation" ? item.kind === "Negation" : requiredResponseKind === "Attack" ? isAttackCard(item) : item.kind === "Dodge";
  const responsePlayAction = negationResponse ? "respond_negation" : groupResponse ? "respond_group" : duelResponse ? "respond_duel" : "respond_dodge";
  const responseDamageAction = negationResponse ? "pass_negation" : groupResponse ? "take_group_damage" : duelResponse ? "take_duel_damage" : "take_damage";
  const responseDeadline = room.pendingNegation?.deadline ?? room.pendingGroup?.deadline ?? room.pendingDuel?.deadline ?? room.pendingAttack?.deadline ?? 0;
  const canRescue = room.phase === "dying" && room.isMyAction;
  const rescuePeaches = canRescue ? room.myHand.filter((item) => item.kind === "Peach") : [];
  const timelineKey = room.timeline.map((event) => event.id).join("|");
  const hasUnseenPresentations = processedTimelineKey !== timelineKey;
  const presentationBusy = Boolean(optimisticPlay || activeEvent || eventQueue.length || resolutionClosing || turnNotice || privateDrawCards.length || hasUnseenPresentations);
  const rescueDecisionReady = canRescue && !presentationBusy;
  const drawWaitingForPresentation = room.isMyTurn && Boolean(room.phase?.startsWith("draw")) && presentationBusy;
  const sharedHarvestSelection = room.pendingHarvest?.previewCardId && room.pendingHarvest.availableIds.includes(room.pendingHarvest.previewCardId) ? room.pendingHarvest.previewCardId : "";
  const activeHarvestSelection = canChooseHarvest && room.pendingHarvest?.availableIds.includes(harvestSelected) ? harvestSelected : sharedHarvestSelection;
  const harvestSelectedCard = room.pendingHarvest?.revealed.find((choice) => choice.id === activeHarvestSelection);
  const lastTimelineId = room.timeline.at(-1)?.id ?? "start";
  const pendingSequenceEvents = pendingTimelineSequence(room).filter(retainsAtPlayer);
  const sequenceEvents = [...pendingSequenceEvents, ...resolutionEvents].filter((event, index, all) => all.findIndex((candidate) => candidate.id === event.id || event.type === "card" && candidate.type === "card" && candidate.card.id === event.card.id) === index);
  const displayedEvent = activeEvent ?? optimisticPlay;
  const tablePresentationVisible = sequenceEvents.length > 0 || Boolean(displayedEvent && eventCards(displayedEvent).length);
  const displayedEventPlayer = displayedEvent?.type === "card" || displayedEvent?.type === "cards" ? room.players.find((player) => publicPlayerName(player.name) === publicPlayerName(displayedEvent.player)) : actor ?? current;
  const seatCountdown = room.phase === "response" && room.actionPlayerId && responseDeadline > 0 ? { playerId: room.actionPlayerId, key: `response-${room.actionPlayerId}-${responseDeadline}`, durationMs: 0, deadline: responseDeadline, label: "Respond" }
    : displayedEvent ? { playerId: displayedEventPlayer?.id ?? room.meId, key: displayedEvent.id, durationMs: displayedEvent.type === "card" || displayedEvent.type === "cards" ? UI_TIMING.playedCard : UI_TIMING.eventMessage, deadline: 0, label: "Next step" }
    : room.pendingHarvest?.countdownUntil ? { playerId: room.pendingHarvest.actorId, key: `harvest-${room.pendingHarvest.actorId}-${room.pendingHarvest.countdownUntil}`, durationMs: 0, deadline: room.pendingHarvest.countdownUntil, label: room.pendingHarvest.complete ? "Closing" : "Choosing" }
    : rescueDecisionReady && room.pendingDying?.deadline ? { playerId: room.actionPlayerId ?? room.meId, key: `rescue-${room.pendingDying.deadline}`, durationMs: 0, deadline: room.pendingDying.deadline, label: "Rescue" }
    : null;
  useEffect(() => { latestDiscardTop.current = room.discardTop; }, [room.discardTop]);
  useEffect(() => { onActionRef.current = onAction; }, [onAction]);
  useEffect(() => {
    const publicGains = new Set(room.timeline.filter((event) => event.type === "card" && event.action === "gain" && event.player === me?.name).map((event) => event.card.id));
    const harvestGains = new Set([...(room.pendingHarvest?.choices.map((choice) => choice.cardId) ?? []), harvestSubmitting?.cardId].filter((id): id is string => Boolean(id)));
    const fresh = room.myHand.filter((item) => !knownHandCards.current.has(item.id) && !publicGains.has(item.id) && !harvestGains.has(item.id));
    room.myHand.forEach((item) => knownHandCards.current.add(item.id));
    if (room.pendingHarvest) return;
    if (fresh.length) setPrivateDrawCards(fresh);
  }, [room.myHand, room.timeline, room.pendingHarvest, me?.name, harvestSubmitting?.cardId]);
  useEffect(() => {
    const fresh = (room.timeline ?? []).filter((event) => !seenEvents.current.has(event.id));
    fresh.forEach((event) => seenEvents.current.add(event.id));
    const visible = fresh.filter((event) => {
      if (event.presentation === false) return false;
      if (event.type === "card" && optimisticallyPresentedCards.current.delete(event.card.id)) return false;
      return true;
    });
    if (visible.length) {
      setResolutionClosing(false);
      const cardsArrived = visible.some((event) => eventCards(event).length > 0);
      if (cardsArrived) resolutionRevision.current += 1;
      if (cardsArrived) visible.filter((event) => event.type === "message").forEach((event) => instantPresentationEvents.current.add(event.id));
      if (!optimisticPlay && !activeEvent && eventQueue.length === 0) {
        const first = visible[0];
        if (first) {
          setActiveEvent(first);
          if (retainsAtPlayer(first)) setResolutionEvents((events) => appendUniqueEvents(events, [first]));
        }
        setEventQueue(visible.slice(1));
      } else setEventQueue((queue) => [...queue, ...visible]);
    }
    setProcessedTimelineKey(timelineKey);
  }, [room.timeline, timelineKey, optimisticPlay, activeEvent, eventQueue.length]);
  useEffect(() => { if (!optimisticPlay) return; const timer = setTimeout(() => setOptimisticPlay(null), UI_TIMING.playedCard); return () => clearTimeout(timer); }, [optimisticPlay]);
  useEffect(() => { if (!harvestSubmitting || room.pendingHarvest?.actorId === harvestSubmitting.playerId && !room.pendingHarvest.choices.some((choice) => choice.cardId === harvestSubmitting.cardId && choice.playerId === harvestSubmitting.playerId)) return; const timer = setTimeout(() => setHarvestSubmitting(null), 0); return () => clearTimeout(timer); }, [harvestSubmitting, room.pendingHarvest]);
  useEffect(() => { const unseenEvents = timelineKey.split("|").filter(Boolean).some((id) => !seenEvents.current.has(id)); const turnKey = `${room.turnSeat}-${lastTimelineId}`; if (room.status !== "playing" || !room.phase?.startsWith("draw") || activeEvent || eventQueue.length || unseenEvents || automaticDraw.current === turnKey) return; const noticeTimer = setTimeout(() => setTurnNotice(`${current?.name ?? "Player"}'s turn`), 0); const drawTimer = setTimeout(() => { setTurnNotice(""); if (room.isMyTurn && automaticDraw.current !== turnKey) { automaticDraw.current = turnKey; onActionRef.current("draw"); } }, UI_TIMING.turnDrawStart); return () => { clearTimeout(noticeTimer); clearTimeout(drawTimer); }; }, [room.turnSeat, room.phase, room.status, room.isMyTurn, current?.name, lastTimelineId, timelineKey, activeEvent, eventQueue.length]);
  useEffect(() => { if (optimisticPlay || activeEvent || !eventQueue.length) return; const timer = setTimeout(() => { const next = eventQueue[0]; setActiveEvent(next); if (retainsAtPlayer(next)) setResolutionEvents((events) => appendUniqueEvents(events, [next])); setEventQueue((queue) => queue.slice(1)); }, 0); return () => clearTimeout(timer); }, [optimisticPlay, activeEvent, eventQueue]);
  useEffect(() => { if (!activeEvent) return; const instant = instantPresentationEvents.current.delete(activeEvent.id); const displayTime = instant ? 0 : activeEvent.type === "card" || activeEvent.type === "cards" ? UI_TIMING.playedCard : UI_TIMING.eventMessage; const timer = setTimeout(() => { if (movesDirectlyToDiscard(activeEvent)) setVisibleDiscardTop(latestDiscardTop.current); setActiveEvent(null); }, displayTime); return () => clearTimeout(timer); }, [activeEvent]);
  useEffect(() => { const resolutionPending = room.phase === "response" || room.phase === "dying" || room.phase === "resolving"; if (optimisticPlay || activeEvent || eventQueue.length || hasUnseenPresentations || resolutionPending || resolutionClosing || !resolutionEvents.length) return; const timer = setTimeout(() => setResolutionClosing(true), 0); return () => clearTimeout(timer); }, [optimisticPlay, activeEvent, eventQueue.length, hasUnseenPresentations, room.phase, resolutionClosing, resolutionEvents.length]);
  useEffect(() => { if (!resolutionClosing) return; const closingRevision = resolutionRevision.current; const timer = setTimeout(() => { if (resolutionRevision.current !== closingRevision) { setResolutionClosing(false); return; } setResolutionEvents([]); setResolutionClosing(false); }, UI_TIMING.sequenceDiscard); return () => clearTimeout(timer); }, [resolutionClosing]);
  useEffect(() => { const resolutionPending = room.phase === "response" || room.phase === "dying" || room.phase === "resolving"; if (sequenceEvents.length || optimisticPlay || activeEvent || eventQueue.length || hasUnseenPresentations || resolutionPending || resolutionClosing) return; const timer = setTimeout(() => setVisibleDiscardTop(room.discardTop), 0); return () => clearTimeout(timer); }, [room.discardTop, room.phase, sequenceEvents.length, optimisticPlay, activeEvent, eventQueue.length, hasUnseenPresentations, resolutionClosing]);
  useEffect(() => { if (!privateDrawCards.length || activeEvent || eventQueue.length) return; const timer = setTimeout(() => setPrivateDrawCards([]), UI_TIMING.privateDraw); return () => clearTimeout(timer); }, [privateDrawCards, activeEvent, eventQueue.length]);
  useEffect(() => { if (!historyOpen) return; const close = (event: KeyboardEvent) => event.key === "Escape" && setHistoryOpen(false); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [historyOpen]);
  useEffect(() => { if (!infoCard) return; const close = (event: KeyboardEvent) => event.key === "Escape" && setInfoCard(null); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [infoCard]);
  useEffect(() => { const timer = setTimeout(() => { setSelected(""); setTarget(""); setTargetCardIndex(null); setDiscardSelected([]); }, 0); return () => clearTimeout(timer); }, [room.turnSeat, room.phase]);
  useEffect(() => { if (!canRespond) { automaticResponseTimeout.current = ""; return; } if (busy) return; const key = `${room.actionPlayerId}-${room.pendingNegation?.cardName ?? room.pendingGroup?.cardKind ?? room.pendingDuel?.sourceId ?? room.pendingAttack?.sourceId ?? "response"}`; if (responseDeadline <= 0) { const startKey = `start-${key}`; if (automaticResponseTimeout.current !== startKey) { automaticResponseTimeout.current = startKey; onActionRef.current("start_response_timer"); } return; } automaticResponseTimeout.current = `timer-${key}-${responseDeadline}`; const timer = setTimeout(() => { automaticResponseTimeout.current = `expired-${key}-${responseDeadline}`; onActionRef.current(responseDamageAction); }, Math.max(0, responseDeadline - Date.now())); return () => clearTimeout(timer); }, [canRespond, busy, responseDeadline, responseDamageAction, room.actionPlayerId, room.pendingNegation?.cardName, room.pendingGroup?.cardKind, room.pendingDuel?.sourceId, room.pendingAttack?.sourceId]);
  useEffect(() => { if (!canRescue) { automaticRescueSkip.current = ""; return; } if (busy || presentationBusy) return; const key = `${room.pendingDying?.targetId}-${room.actionPlayerId}`; const deadline = room.pendingDying?.deadline ?? 0; if (deadline <= 0) { const startKey = `start-${key}`; if (automaticRescueSkip.current !== startKey) { automaticRescueSkip.current = startKey; onActionRef.current("start_rescue_timer"); } return; } const timerKey = `timer-${key}-${deadline}`; if (automaticRescueSkip.current === timerKey) return; automaticRescueSkip.current = timerKey; const timer = setTimeout(() => { automaticRescueSkip.current = `skip-${key}`; onActionRef.current("skip_rescue"); }, Math.max(0, deadline - Date.now())); return () => clearTimeout(timer); }, [canRescue, busy, presentationBusy, room.pendingDying?.targetId, room.pendingDying?.deadline, room.actionPlayerId]);
  const publishHarvestPreview = async (cardId: string) => { queuedHarvestPreview.current = cardId; if (harvestPreviewInFlight.current) return; harvestPreviewInFlight.current = true; while (queuedHarvestPreview.current !== null) { const nextCardId = queuedHarvestPreview.current; queuedHarvestPreview.current = null; await onAction("preview_harvest", { cardId: nextCardId || null }); } harvestPreviewInFlight.current = false; };
  const playResponseCard = async () => { if (!card || !me || !responseCardAllowed(card)) return; const responseCard = card; const responseTarget = room.pendingDuel ? room.players.find((player) => player.id === room.pendingDuel?.opponentId)?.name ?? me.name : me.name; const optimisticEvent: CardEvent & { type: "card" } = { id: `optimistic-response-${responseCard.id}`, type: "card", player: me.name, target: responseTarget, card: responseCard, action: "play" }; const presentImmediately = !optimisticPlay && !activeEvent && eventQueue.length === 0; if (presentImmediately) { resolutionRevision.current += 1; optimisticallyPresentedCards.current.add(responseCard.id); setResolutionClosing(false); setResolutionEvents((events) => events.some((event) => event.type === "card" && event.card.id === responseCard.id) ? events : [...events, optimisticEvent]); setOptimisticPlay(optimisticEvent); } setSelected(""); const accepted = await onAction(responsePlayAction, { cardId: responseCard.id }); if (!accepted && presentImmediately) { optimisticallyPresentedCards.current.delete(responseCard.id); setOptimisticPlay(null); setResolutionEvents((events) => events.filter((event) => event.id !== optimisticEvent.id)); } };
  const play = async () => { if (!card || !me) return; const playedCard = card; const needsTarget = isAttackCard(card) || card.kind === "Dismantle" || card.kind === "Steal" || card.kind === "Duel" || card.kind === "Overindulgence"; const displayTarget = targetPlayer?.name ?? (card.kind === "BumperHarvest" || card.kind === "Oath" ? "All living players" : card.kind === "BarbarianInvasion" || card.kind === "RainingArrows" ? "All other players" : me.name); const optimisticEvent: CardEvent & { type: "card" } = { id: `optimistic-${card.id}`, type: "card", player: me.name, target: displayTarget, card, action: "play" }; resolutionRevision.current += 1; optimisticallyPresentedCards.current.add(playedCard.id); setResolutionClosing(false); setResolutionEvents([optimisticEvent]); setOptimisticPlay(optimisticEvent); setSelected(""); setTarget(""); setTargetCardIndex(null); const accepted = await onAction("play_card", { cardId: playedCard.id, ...(needsTarget ? { targetId: target } : {}), ...(["Dismantle", "Steal"].includes(playedCard.kind) ? { targetCardIndex } : {}) }); if (!accepted) { optimisticallyPresentedCards.current.delete(playedCard.id); setOptimisticPlay(null); setResolutionEvents([]); } };
  return <main className="game-shell"><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b></div><div className="top-actions"><button type="button" className="text-button history-button" onClick={() => setHistoryOpen(true)}>Event history</button><button className="text-button" onClick={onLeave}>Exit</button></div></header>
    <section className="action-strip" aria-live="polite"><div className="action-step"><small>TURN OWNER</small><b>{current?.name ?? "—"}</b></div><span className="action-arrow">→</span><div className="action-step"><small>CURRENT PHASE</small><b>{phaseName(room.phase)}</b></div><span className="action-arrow">→</span><div className="action-step acting"><small>{drawWaitingForPresentation ? "NEXT TO ACT" : "ACTING NOW"}</small><b>{actor?.name ?? "—"}{room.isMyAction ? " · YOU" : ""}</b><em>{drawWaitingForPresentation ? "Your draw waits until earlier events finish" : room.actionReason}</em></div></section>
    <section className={`play-table ${sequenceEvents.length > 0 ? "sequence-active" : ""} ${resolutionClosing ? "sequence-concluding" : ""}`}>
      {turnNotice && <div className="turn-notice" role="status"><span>TURN BEGINS</span><b>{turnNotice}</b></div>}
      {privateDrawCards.length > 0 && !activeEvent && eventQueue.length === 0 && <div className="played-card-stage private-draw-stage" role="status"><Countdown key={privateDrawCards.map((drawn) => drawn.id).join("-")} durationMs={UI_TIMING.privateDraw} label="Cards close in" /><div className="card-action-title"><b>PRIVATE DRAW</b><span>Only you can see these cards</span></div><div className="private-draw-row">{privateDrawCards.map((drawn) => <CardFace card={drawn} key={drawn.id} />)}</div></div>}
      {tablePresentationVisible && <TableResolutionSequence events={sequenceEvents} activeEvent={displayedEvent} waitingReason={!activeEvent && !optimisticPlay && !eventQueue.length && (room.phase === "response" || room.phase === "dying" || room.phase === "resolving") ? room.actionReason : ""} players={room.players} myTableIndex={myTableIndex} concluding={resolutionClosing} />}
      {rescueDecisionReady && <div className="game-event-stage rescue-decision-stage" role="alertdialog" aria-modal="true" aria-label="Private Peach rescue decision"><div><span>PRIVATE RESCUE DECISION</span><b>{dyingPlayer?.name ?? "A player"} is dying</b><small>{card?.kind === "Peach" ? `${card.rank}${card.suit} Peach selected. Play it now—there is no need to wait for the timer.` : "Tap the Peach you want to use. You have 5 seconds; this choice is visible only to you until the card is played."}</small><div className="rescue-peach-list">{rescuePeaches.map((peach) => <button type="button" className={`rescue-peach-choice ${selected === peach.id ? "selected" : ""}`} aria-pressed={selected === peach.id} key={peach.id} onClick={() => setSelected((id) => id === peach.id ? "" : peach.id)}><strong>{peach.rank}{peach.suit}</strong><i>Peach</i><b>Rescue card</b></button>)}</div><section>{card?.kind === "Peach" && <button className="primary" disabled={busy} onClick={() => { onAction("give_peach", { cardId: card.id }); setSelected(""); }}>{busy ? "Playing…" : "Play selected Peach now"}</button>}<button className="end" disabled={busy} onClick={() => { onAction("skip_rescue"); setSelected(""); }}>{busy ? "Passing…" : "Do not give"}</button></section></div></div>}
      {room.pendingHarvest && !presentationBusy && <div className="game-event-stage harvest-choice-stage" role="dialog" aria-label="Bumper Harvest card choice"><div><span>BUMPER HARVEST</span><b>{room.pendingHarvest.complete ? "All choices complete" : harvestSubmitting ? "Your choice is submitted" : canChooseHarvest ? "Your turn — choose one card" : `${actor?.name ?? "The next player"} is choosing`}</b><small>{room.pendingHarvest.complete ? "The final shaded card remains visible before Bumper Harvest closes." : harvestSubmitting ? "Your card is shaded immediately while the next choice is prepared." : canChooseHarvest ? "Tap any available card to change your selection, then confirm. Selection changes are instant." : "Watch the current player's card rise, then become shaded when confirmed."}</small><div className="harvest-card-row">{room.pendingHarvest.revealed.map((choice) => { const takenBy = room.pendingHarvest?.choices.find((entry) => entry.cardId === choice.id); const submittedByMe = harvestSubmitting?.cardId === choice.id; const available = room.pendingHarvest?.availableIds.includes(choice.id); const awaitingConfirmation = !submittedByMe && activeHarvestSelection === choice.id; return <button type="button" className={`harvest-card-choice ${takenBy || submittedByMe ? "taken" : ""} ${awaitingConfirmation ? "pending-choice" : ""}`} disabled={!canChooseHarvest || Boolean(harvestSubmitting) || busy || !available} aria-pressed={awaitingConfirmation} aria-label={takenBy ? `${cardDefinition(choice.kind).name}, taken by ${takenBy.playerName}` : submittedByMe ? `${cardDefinition(choice.kind).name}, choice submitted by ${harvestSubmitting?.playerName ?? "ME"}` : `${cardDefinition(choice.kind).name}, ${awaitingConfirmation ? `selected by ${actor?.name ?? "current player"}, awaiting confirmation` : "available"}`} key={choice.id} onClick={() => { const nextCardId = activeHarvestSelection === choice.id ? "" : choice.id; setHarvestSelected(nextCardId); void publishHarvestPreview(nextCardId); }}><CardFace card={choice} />{takenBy && <strong className="harvest-taken-label">Taken by {takenBy.playerName}</strong>}{submittedByMe && !takenBy && <strong className="harvest-taken-label">Chosen by {harvestSubmitting?.playerName ?? "ME"}</strong>}{awaitingConfirmation && <strong className="harvest-pending-label">Selected by {actor?.name ?? "player"}</strong>}</button>; })}</div>{canChooseHarvest && (harvestSubmitting ? <div className="harvest-confirm-row"><small>Choice submitted · moving to the next player</small></div> : <div className="harvest-confirm-row"><small>{harvestSelectedCard ? `${cardDefinition(harvestSelectedCard.kind).name} selected` : "Select a card before confirming"}</small><button type="button" className="primary" disabled={busy || !harvestSelectedCard} onClick={async () => { if (!harvestSelectedCard || !me) return; const submission = { cardId: harvestSelectedCard.id, playerId: me.id, playerName: me.name }; queuedHarvestPreview.current = null; setHarvestSubmitting(submission); setHarvestSelected(""); const accepted = await onAction("choose_harvest", { cardId: submission.cardId }); if (!accepted) setHarvestSubmitting(null); }}>Confirm choice</button></div>)}</div></div>}
      <div className="play-center"><div className="draw-stack"><b>{room.deckCount}</b><span>DECK</span></div><div className="discard-stack"><b>{visibleDiscardTop ? cardDefinition(visibleDiscardTop.kind).name : "—"}</b><span>DISCARD</span></div></div>
      {["Dismantle", "Steal"].includes(card?.kind ?? "") && targetPlayer && <div className="hidden-card-picker table-hidden-card-picker" style={{ "--angle": `${targetAngle}deg` } as React.CSSProperties} aria-label={`Choose one hidden card from ${targetPlayer.name}`}><span>{targetPlayer.name}&apos;s hand</span><div>{Array.from({ length: targetPlayer.handCount }, (_, index) => <button type="button" className={targetCardIndex === index ? "selected" : ""} aria-pressed={targetCardIndex === index} key={index} onClick={() => setTargetCardIndex(index)}>?</button>)}</div></div>}
      {room.players.map((player, index) => { const relativeIndex = (index - myTableIndex + room.players.length) % room.players.length; const angle = 180 + (360 / room.players.length) * relativeIndex; const radians = angle * Math.PI / 180; const targetable = Boolean(card && (isAttackCard(card) ? (player.distance ?? 99) <= 1 : card.kind === "Dismantle" ? player.handCount > 0 : card.kind === "Steal" ? player.handCount > 0 && (player.distance ?? 99) <= 1 : card.kind === "Duel" || card.kind === "Overindulgence" && !player.judgementCards.some((delayed) => delayed.kind === "Overindulgence"))); return <button disabled={!room.isMyTurn || !canPlay || !player.alive || player.id === room.meId || !targetable} onClick={() => { setTarget(player.id); setTargetCardIndex(null); }} className={`started-player play-seat ${player.id === room.meId ? "self-player" : ""} ${player.seat === room.turnSeat && room.status === "playing" ? "active-turn" : ""} ${player.id === room.actionPlayerId && room.status === "playing" ? "active-action" : ""} ${target === player.id ? "targeted" : ""} ${!player.alive ? "defeated" : ""}`} key={player.id} style={{ "--angle": `${angle}deg`, "--countdown-x": `${Math.cos(radians) * 76}px`, "--countdown-y": `${Math.sin(radians) * 54}px` } as React.CSSProperties}><div className="seal">{player.name[0]}</div><b>{player.name}</b><small>{heroName(player.hero)} · {player.role ?? "Role hidden"}</small><span>{"♥".repeat(player.hp ?? 0)} · {player.handCount} cards{player.id !== room.meId ? ` · distance ${player.distance}` : ""}</span>{player.judgementCards.length > 0 && <em className="judgement-zone">Judgement · {player.judgementCards.map((delayed) => cardDefinition(delayed.kind).name).join(", ")}</em>}{seatCountdown?.playerId === player.id && <Countdown key={seatCountdown.key} durationMs={seatCountdown.durationMs} deadline={seatCountdown.deadline} label={seatCountdown.label} />}</button>; })}
      {room.status === "finished" && <div className="victory-banner"><span>MATCH COMPLETE</span><b>{room.log.at(-1)?.replace("! The match is over.", "")}</b><small>All roles are now revealed at the table.</small></div>}
    </section>
    <footer className="play-command"><div className="turn-controls"><span>{presentationBusy && !canRespond ? "Showing the current game event…" : room.status === "finished" ? "The match has ended" : room.phase === "dying" ? room.isMyAction ? `Your private Peach decision is open` : "Waiting — no rescue action is required from you" : room.pendingHarvest ? room.pendingHarvest.complete ? "Bumper Harvest · showing all confirmed choices" : canChooseHarvest ? "Your action · choose one revealed Bumper Harvest card" : `Waiting for ${actor?.name ?? "the next player"} to choose from Bumper Harvest` : canRespond ? negationResponse ? `Your action · play Negation on ${room.pendingNegation?.cardName}, or skip` : `Your action · play ${requiredResponseKind} for ${room.pendingGroup ? cardDefinition(room.pendingGroup.cardKind).name : room.pendingDuel ? "the Duel" : "the Attack"}, or skip and take damage` : room.phase === "response" ? room.pendingNegation ? `Waiting for ${actor?.name ?? "the next player"} to answer ${room.pendingNegation.cardName}` : room.pendingGroup ? `Waiting for ${actor?.name ?? "the target"} to play ${room.pendingGroup.requiredKind}` : room.pendingDuel ? `Waiting for ${actor?.name ?? "the duelist"} to play Attack` : `Waiting for ${defender?.name ?? "the target"} to answer ${attacker?.name ?? "the attacker"}` : room.phase === "discard" && room.isMyTurn ? `Your action · Discard Phase · select ${excessCards} card${excessCards === 1 ? "" : "s"} (${discardSelected.length}/${excessCards})` : room.isMyTurn ? room.phase === "draw" ? "Your action · Draw Phase" : card && isAttackCard(card) && !target ? "Your action · Play Phase · choose an adjacent target" : card?.kind === "Dismantle" && !target ? "Your action · choose a player with cards" : card?.kind === "Steal" && !target ? "Your action · choose a player within distance 1" : card?.kind === "Duel" && !target ? "Your action · choose any other player" : card?.kind === "Overindulgence" && !target ? "Your action · choose a player without Overindulgence" : ["Dismantle", "Steal"].includes(card?.kind ?? "") && targetCardIndex === null ? "Your action · choose one hidden card" : room.phase === "play-struck" ? "Your action · Play Phase · Attack used" : "Your action · Play Phase" : `Waiting for ${actor?.name ?? current?.name ?? "another player"}`}</span><div>{canRespond && <><button className="primary" disabled={busy || !card || !responseCardAllowed(card)} onClick={playResponseCard}>{busy ? "Playing…" : `Play ${requiredResponseKind}`}</button><button className="end" disabled={busy} onClick={() => onAction(responseDamageAction)}>{busy ? "Skipping…" : negationResponse ? "Skip response" : "Skip · take 1 damage"}</button></>}{room.isMyTurn && room.phase === "discard" && <button className="end" disabled={busy || discardSelected.length !== excessCards} onClick={() => onAction("discard_cards", { cardIds: discardSelected })}>{busy ? "Discarding…" : `Discard ${excessCards} selected`}</button>}{room.isMyTurn && canPlay && <><button className="primary" disabled={busy || presentationBusy || !card || (isAttackCard(card) && (!target || room.phase === "play-struck")) || (["Dismantle", "Steal"].includes(card.kind) && (!target || targetCardIndex === null)) || (["Duel", "Overindulgence"].includes(card.kind) && !target) || card.kind === "Dodge" || card.kind === "Negation"} onClick={play}>{busy ? "Playing…" : "Play selected"}</button><button className="end" disabled={busy || presentationBusy} onClick={() => onAction("end_turn")}>{busy ? "Finishing…" : "Finish Play Phase"}</button></>}</div></div>
      <div className="play-hand">{room.myHand.map((item) => { const definition = cardDefinition(item.kind); const isSelected = room.phase === "discard" ? discardSelected.includes(item.id) : selected === item.id; const maySelect = (room.isMyTurn && (canPlay || room.phase === "discard")) || canRespond || rescueDecisionReady; return <div className="card-slot" key={item.id}><button disabled={!maySelect || (canRespond && !responseCardAllowed(item)) || (rescueDecisionReady && item.kind !== "Peach")} onClick={() => { if (room.phase === "discard") setDiscardSelected((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : ids.length < excessCards ? [...ids, item.id] : ids); else setSelected((id) => id === item.id ? "" : item.id); setTarget(""); setTargetCardIndex(null); }} className={`game-card ${item.kind.toLowerCase()} ${isSelected ? "selected" : ""}`}><span className="corner">{item.rank}<i>{item.suit}</i></span><span className="card-name-mark">{definition.name}</span><strong>{definition.category} card</strong></button><button type="button" className="card-info-button" aria-label={`Explain ${definition.name}`} onClick={() => setInfoCard(item)}>i</button></div>; })}</div>
      {error && <p className="error play-error" role="alert">{error}</p>}<div className="self-summary"><strong>{room.myRole}</strong> · {heroName(me?.hero)} · {me?.hp}/{me?.maxHp} HP · Your position is always at the bottom</div>
    </footer>
    {historyOpen && <div className="history-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setHistoryOpen(false)}><section className="history-window" role="dialog" aria-modal="true" aria-labelledby="history-title"><header><div><span>DEBUG TOOL</span><h2 id="history-title">Event history</h2></div><button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close event history">×</button></header><p className="history-warning">For testing and rule verification. Newest events appear first.</p><div className="history-scroll">{room.timeline.length ? room.timeline.slice().reverse().map((event, index) => <div className="history-entry" key={event.id}><b>{room.timeline.length - index}</b><span>{describeEvent(event)}</span></div>) : <p>No events recorded yet.</p>}</div></section></div>}
    {infoCard && <div className="card-info-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setInfoCard(null)}><section className="card-info-dialog" role="dialog" aria-modal="true" aria-labelledby="card-info-title"><button type="button" className="card-info-close" onClick={() => setInfoCard(null)} aria-label="Close card explanation">×</button><span>PRIVATE CARD INFORMATION</span><small>{infoCard.rank}{infoCard.suit} · {cardDefinition(infoCard.kind).category} card</small><h2 id="card-info-title">{cardDefinition(infoCard.kind).name}</h2><p>{cardDefinition(infoCard.kind).rules}</p><em>Only you can see this explanation.</em></section></div>}
  </main>;
}

function TableResolutionSequence({ events, activeEvent, waitingReason, players, myTableIndex, concluding }: { events: GameEvent[]; activeEvent: GameEvent | null; waitingReason: string; players: Player[]; myTableIndex: number; concluding: boolean }) {
  const cards = events.flatMap((event) => event.type === "card" ? [{ event, card: event.card, key: event.id }] : event.type === "cards" ? event.cards.map((card) => ({ event, card, key: `${event.id}-${card.id}` })) : []);
  const cardPlayers = players.filter((player) => cards.some(({ event }) => publicPlayerName(event.player) === publicPlayerName(player.name)));
  const activeCards = activeEvent?.type === "card" ? [activeEvent.card] : activeEvent?.type === "cards" ? activeEvent.cards : [];
  const activeCardIds = new Set(activeCards.map((card) => card.id));
  const activePlayer = activeEvent?.type === "card" || activeEvent?.type === "cards" ? players.find((player) => publicPlayerName(player.name) === publicPlayerName(activeEvent.player)) : undefined;
  const activePlayerIndex = activePlayer ? players.findIndex((player) => player.id === activePlayer.id) : myTableIndex;
  const activeRelativeIndex = (activePlayerIndex - myTableIndex + players.length) % players.length;
  const activeAngle = 180 + (360 / players.length) * activeRelativeIndex;
  const activeRadians = activeAngle * Math.PI / 180;
  const directDiscard = Boolean(activeEvent && movesDirectlyToDiscard(activeEvent) && !events.some((event) => event.id === activeEvent.id));
  const activeStyle = { "--origin-x": `${50 + Math.sin(activeRadians) * 38}%`, "--origin-y": `${50 - Math.cos(activeRadians) * 34}%`, "--settle-x": `${50 + Math.sin(activeRadians) * 24}%`, "--settle-y": `${50 - Math.cos(activeRadians) * 26}%` } as React.CSSProperties;
  return <div className={`table-resolution-layer ${concluding ? "concluding" : ""}`} role="status">
    {activeEvent && !concluding && <div className="active-step-label">{describeEvent(activeEvent)}</div>}
    {activeCards.length > 0 && !concluding && <div className={`active-table-reveal ${directDiscard ? "direct-discard" : ""}`} key={activeEvent?.id} style={activeStyle}><div>{activeCards.map((shown) => <CardFace card={shown} key={shown.id} />)}</div></div>}
    {cardPlayers.map((player) => {
      const playerIndex = players.findIndex((candidate) => candidate.id === player.id);
      const relativeIndex = (playerIndex - myTableIndex + players.length) % players.length;
      const angle = 180 + (360 / players.length) * relativeIndex;
      const radians = angle * Math.PI / 180;
      const playerCards = cards.filter(({ event }) => publicPlayerName(event.player) === publicPlayerName(player.name));
      const playerStyle = { "--seat-x": `${50 + Math.sin(radians) * 24}%`, "--seat-y": `${50 - Math.cos(radians) * 26}%` } as React.CSSProperties;
      return <div className="player-played-cards" key={player.id} style={playerStyle}><span>{publicPlayerName(player.name)}</span><div>{playerCards.map(({ card, key }, index) => activeCardIds.has(card.id) ? null : <div className="table-played-card settled" key={key}><em>{index + 1}</em><CardFace card={card} /></div>)}</div></div>;
    })}
    <section className="resolution-table-caption"><header><span>RESOLUTION</span><b>{concluding ? "Moving all played cards to discard" : waitingReason ? "Waiting for the next response" : activeEvent ? describeEvent(activeEvent) : "Sequence in progress"}</b></header><ol>{events.map((event, index) => { const roleReveal = event.type === "message" && /^(.+)'s role is revealed: ([^.]+)\.$/.test(event.message); return <li className={event.id === activeEvent?.id ? "active" : ""} key={event.id}><em>{index + 1}</em><span>{roleReveal && <strong>ROLE REVEALED · </strong>}{describeEvent(event)}</span></li>; })}</ol></section>
  </div>;
}

function CardFace({ card }: { card: Card }) {
  const definition = cardDefinition(card.kind);
  return <div className={`played-card ${card.kind.toLowerCase()}`}><i>{card.rank}<small>{card.suit}</small></i><b className="card-name-mark">{definition.name}</b><strong>{definition.category} card</strong></div>;
}

function describeEvent(event: GameEvent) {
  if (event.type === "message") return event.message;
  if (event.type === "cards") return event.action === "reveal" ? `${event.player} reveals ${event.cards.map((card) => `${card.rank}${card.suit} ${cardDefinition(card.kind).name}`).join(", ")} for Bumper Harvest.` : `${event.player} reveals and discards ${event.cards.map((card) => `${card.rank}${card.suit} ${cardDefinition(card.kind).name}`).join(", ")}.`;
  if (event.action === "discard") return `${event.player} reveals and discards ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name}.`;
  if (event.action === "gain") return `${event.player} chooses ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name} from Bumper Harvest.`;
  if (event.action === "reveal") return `${event.player} reveals for judgement: ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name}.`;
  if (event.target === event.player && (isAttackCard(event.card) || event.card.kind === "Dodge")) return `${event.player} responds with ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name}.`;
  return event.message ?? `${event.player} plays ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name}${event.target !== event.player ? ` on ${event.target}` : ""}.`;
}
