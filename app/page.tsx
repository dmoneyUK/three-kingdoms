"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { cardDefinition, isAttackCard, OFFICIAL_WTK_CARD_CATALOGUE } from "../game/cards";
import type { Card } from "../game/model";

type Hero = { id: string; name: string; faction: string; hp: number; ability: string };
type CardEvent = { id: string; player: string; target: string; card: Card; action?: "play" | "discard" };
type CardGroupEvent = { id: string; type: "cards"; player: string; target: string; cards: Card[]; action: "discard" };
type GameEvent = (CardEvent & { type: "card"; message?: string }) | CardGroupEvent | { type: "message"; id: string; message: string; presentation?: boolean };
type Player = { id: string; name: string; seat: number; hero: string | null; hp: number | null; maxHp: number | null; alive: boolean; handCount: number; distance: number | null; isHost: boolean; isBot?: boolean; role: string | null };
type Room = { code: string; status: "lobby" | "heroes" | "started" | "playing" | "finished"; maxPlayers: number; isHost: boolean; meId: string; myRole: string | null; myHeroOptions: Hero[]; players: Player[]; myHand: Card[]; turnSeat: number | null; phase: string | null; deckCount: number; discardTop: Card | null; log: string[]; timeline: GameEvent[]; isMyTurn: boolean; actionPlayerId: string | null; actionReason: string; isMyAction: boolean; pendingAttack: { sourceId: string; targetId: string } | null; pendingDying: { sourceId: string; targetId: string; deadline: number } | null };

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
    const timer = setInterval(() => fetchRoom(roomCode, token, true), 2500);
    return () => clearInterval(timer);
  }, [roomCode, token, busy, fetchRoom]);

  async function send(action: "create" | "join" | "start" | "add_test_players" | "choose_hero" | "draw" | "play_card" | "end_turn" | "respond_dodge" | "take_damage" | "discard_cards" | "start_rescue_timer" | "give_peach" | "skip_rescue", extra: Record<string, unknown> = {}) {
    stateEpoch.current++; setBusy(true); setError("");
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, name, code, token, ...extra }) });
      const data = await response.json() as { error?: string; token?: string; room?: Room };
      if (!response.ok || !data.room) throw new Error(data.error ?? "Something went wrong.");
      const nextToken = data.token ?? token;
      setToken(nextToken); setRoom(data.room); setCode(data.room.code);
      localStorage.setItem("three-realms-session", JSON.stringify({ code: data.room.code, token: nextToken, name }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong."); }
    finally { setBusy(false); }
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
          <div className="role-row"><Role title="Lord" glyph="主" /><Role title="Loyalist" glyph="忠" /><Role title="Rebel" glyph="反" /><Role title="Renegade" glyph="内" /></div>
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
function phaseName(phase?: string | null) { return phase === "draw" ? "Draw Phase" : phase?.startsWith("play") ? "Play Phase" : phase === "discard" ? "Discard Phase" : phase === "response" ? "Response" : phase === "dying" ? "Dying Rescue" : phase === "resolving" ? "Resolving" : phase === "finished" ? "Finished" : ""; }

function GameRoom({ room, busy, error, onAction, onLeave }: { room: Room; busy: boolean; error: string; onAction: (action: "draw" | "play_card" | "end_turn" | "respond_dodge" | "take_damage" | "discard_cards" | "start_rescue_timer" | "give_peach" | "skip_rescue", extra?: Record<string, unknown>) => void; onLeave: () => void }) {
  const [selected, setSelected] = useState(""); const [target, setTarget] = useState("");
  const [targetCardIndex, setTargetCardIndex] = useState<number | null>(null);
  const [discardSelected, setDiscardSelected] = useState<string[]>([]); const automaticDraw = useRef("");
  const automaticDamage = useRef("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [infoCard, setInfoCard] = useState<Card | null>(null);
  const automaticRescueSkip = useRef("");
  const [turnNotice, setTurnNotice] = useState(""); const onActionRef = useRef(onAction);
  const [privateDrawCards, setPrivateDrawCards] = useState<Card[]>([]); const knownHandCards = useRef(new Set(room.myHand.map((item) => item.id)));
  const [eventQueue, setEventQueue] = useState<GameEvent[]>([]); const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null); const seenEvents = useRef(new Set((room.timeline ?? []).map((event) => event.id)));
  const [processedTimelineKey, setProcessedTimelineKey] = useState(() => room.timeline.map((event) => event.id).join("|"));
  const activeCard = activeEvent?.type === "card" ? activeEvent : null;
  const activeCards = activeEvent?.type === "cards" ? activeEvent : null;
  const roleReveal = activeEvent?.type === "message" ? activeEvent.message.match(/^(.+)'s role is revealed: ([^.]+)\.$/) : null;
  const peachRescue = activeCard?.card.kind === "Peach" && activeCard.target !== activeCard.player;
  const card = room.myHand.find((item) => item.id === selected); const current = room.players.find((player) => player.seat === room.turnSeat); const actor = room.players.find((player) => player.id === room.actionPlayerId); const me = room.players.find((player) => player.id === room.meId); const targetPlayer = room.players.find((player) => player.id === target);
  const excessCards = Math.max(0, room.myHand.length - (me?.hp ?? 0));
  const myTableIndex = Math.max(0, room.players.findIndex((player) => player.id === room.meId));
  const attacker = room.players.find((player) => player.id === room.pendingAttack?.sourceId); const defender = room.players.find((player) => player.id === room.pendingAttack?.targetId);
  const dyingPlayer = room.players.find((player) => player.id === room.pendingDying?.targetId);
  const actionPlayer = room.players.find((player) => player.name === (activeCard?.player ?? activeCards?.player)); const actionTarget = room.players.find((player) => player.name === activeCard?.target);
  const canPlay = room.phase?.startsWith("play") && room.status === "playing";
  const canRespond = room.phase === "response" && room.isMyAction;
  const canRescue = room.phase === "dying" && room.isMyAction;
  const rescuePeaches = canRescue ? room.myHand.filter((item) => item.kind === "Peach") : [];
  const timelineKey = room.timeline.map((event) => event.id).join("|");
  const hasUnseenPresentations = processedTimelineKey !== timelineKey;
  const presentationBusy = Boolean(activeEvent || eventQueue.length || turnNotice || privateDrawCards.length || hasUnseenPresentations);
  const rescueDecisionReady = canRescue && !presentationBusy;
  const drawWaitingForPresentation = room.isMyTurn && room.phase === "draw" && presentationBusy;
  const lastTimelineId = room.timeline.at(-1)?.id ?? "start";
  useEffect(() => { onActionRef.current = onAction; }, [onAction]);
  useEffect(() => { const fresh = room.myHand.filter((item) => !knownHandCards.current.has(item.id)); room.myHand.forEach((item) => knownHandCards.current.add(item.id)); if (fresh.length) setPrivateDrawCards(fresh); }, [room.myHand]);
  useEffect(() => { const fresh = (room.timeline ?? []).filter((event) => !seenEvents.current.has(event.id)); fresh.forEach((event) => seenEvents.current.add(event.id)); const visible = fresh.filter((event) => event.type !== "message" || event.presentation !== false); if (visible.length) setEventQueue((queue) => [...queue, ...visible]); setProcessedTimelineKey(timelineKey); }, [room.timeline, timelineKey]);
  useEffect(() => { const unseenEvents = timelineKey.split("|").filter(Boolean).some((id) => !seenEvents.current.has(id)); const turnKey = `${room.turnSeat}-${lastTimelineId}`; if (room.status !== "playing" || room.phase !== "draw" || activeEvent || eventQueue.length || unseenEvents || automaticDraw.current === turnKey) return; const noticeTimer = setTimeout(() => setTurnNotice(`${current?.name ?? "Player"}'s turn`), 0); const drawTimer = setTimeout(() => { setTurnNotice(""); if (room.isMyTurn && automaticDraw.current !== turnKey) { automaticDraw.current = turnKey; onActionRef.current("draw"); } }, 1600); return () => { clearTimeout(noticeTimer); clearTimeout(drawTimer); }; }, [room.turnSeat, room.phase, room.status, room.isMyTurn, current?.name, lastTimelineId, timelineKey, activeEvent, eventQueue.length]);
  useEffect(() => { if (activeEvent || !eventQueue.length) return; const timer = setTimeout(() => { setActiveEvent(eventQueue[0]); setEventQueue((queue) => queue.slice(1)); }, 0); return () => clearTimeout(timer); }, [activeEvent, eventQueue]);
  useEffect(() => { if (!activeEvent) return; const timer = setTimeout(() => setActiveEvent(null), 5000); return () => clearTimeout(timer); }, [activeEvent]);
  useEffect(() => { if (!privateDrawCards.length || activeEvent || eventQueue.length) return; const timer = setTimeout(() => setPrivateDrawCards([]), 5000); return () => clearTimeout(timer); }, [privateDrawCards, activeEvent, eventQueue.length]);
  useEffect(() => { if (!historyOpen) return; const close = (event: KeyboardEvent) => event.key === "Escape" && setHistoryOpen(false); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [historyOpen]);
  useEffect(() => { if (!infoCard) return; const close = (event: KeyboardEvent) => event.key === "Escape" && setInfoCard(null); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [infoCard]);
  useEffect(() => { const timer = setTimeout(() => { setSelected(""); setTarget(""); setTargetCardIndex(null); setDiscardSelected([]); }, 0); return () => clearTimeout(timer); }, [room.turnSeat, room.phase]);
  useEffect(() => { if (!canRespond) { automaticDamage.current = ""; return; } if (busy || room.myHand.some((item) => item.kind === "Dodge")) return; const key = `${room.pendingAttack?.sourceId}-${room.pendingAttack?.targetId}`; if (automaticDamage.current === key) return; automaticDamage.current = key; onActionRef.current("take_damage"); }, [canRespond, busy, room.myHand, room.pendingAttack]);
  useEffect(() => { if (!canRescue) { automaticRescueSkip.current = ""; return; } if (busy || presentationBusy) return; const key = `${room.pendingDying?.targetId}-${room.actionPlayerId}`; const deadline = room.pendingDying?.deadline ?? 0; if (deadline <= 0) { const startKey = `start-${key}`; if (automaticRescueSkip.current !== startKey) { automaticRescueSkip.current = startKey; onActionRef.current("start_rescue_timer"); } return; } const timerKey = `timer-${key}-${deadline}`; if (automaticRescueSkip.current === timerKey) return; automaticRescueSkip.current = timerKey; const timer = setTimeout(() => { automaticRescueSkip.current = `skip-${key}`; onActionRef.current("skip_rescue"); }, Math.max(0, deadline - Date.now())); return () => clearTimeout(timer); }, [canRescue, busy, presentationBusy, room.pendingDying?.targetId, room.pendingDying?.deadline, room.actionPlayerId]);
  const play = () => { if (!card) return; const needsTarget = isAttackCard(card) || card.kind === "Dismantle"; onAction("play_card", { cardId: card.id, ...(needsTarget ? { targetId: target } : {}), ...(card.kind === "Dismantle" ? { targetCardIndex } : {}) }); setSelected(""); setTarget(""); setTargetCardIndex(null); };
  return <main className="game-shell"><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b></div><div className="top-actions"><button type="button" className="text-button history-button" onClick={() => setHistoryOpen(true)}>Event history</button><button className="text-button" onClick={onLeave}>Exit</button></div></header>
    <section className="action-strip" aria-live="polite"><div className="action-step"><small>TURN OWNER</small><b>{current?.name ?? "—"}</b></div><span className="action-arrow">→</span><div className="action-step"><small>CURRENT PHASE</small><b>{phaseName(room.phase)}</b></div><span className="action-arrow">→</span><div className="action-step acting"><small>{drawWaitingForPresentation ? "NEXT TO ACT" : "ACTING NOW"}</small><b>{actor?.name ?? "—"}{room.isMyAction ? " · YOU" : ""}</b><em>{drawWaitingForPresentation ? "Your draw waits until earlier events finish" : room.actionReason}</em></div></section>
    <section className="play-table">
      {turnNotice && <div className="turn-notice" role="status"><span>TURN BEGINS</span><b>{turnNotice}</b></div>}
      {privateDrawCards.length > 0 && !activeEvent && eventQueue.length === 0 && <div className="played-card-stage private-draw-stage" role="status"><div className="card-action-title"><b>PRIVATE DRAW</b><span>Only you can see these cards</span></div><div className="private-draw-row">{privateDrawCards.map((drawn) => <CardFace card={drawn} key={drawn.id} />)}</div></div>}
      {activeEvent?.type === "message" && !roleReveal && <div className="game-event-stage" role="status"><div><span>GAME EVENT</span><b>{activeEvent.message}</b></div></div>}
      {roleReveal && <div className="game-event-stage role-reveal-stage" role="status"><div><span>ROLE REVEALED</span><b>{roleReveal[1]}</b><strong>{roleReveal[2]}</strong><small>This player’s hidden allegiance is now public.</small></div></div>}
      {rescueDecisionReady && <div className="game-event-stage rescue-decision-stage" role="alertdialog" aria-modal="true" aria-label="Private Peach rescue decision"><div><span>PRIVATE RESCUE DECISION</span><b>{dyingPlayer?.name ?? "A player"} is dying</b><small>{card?.kind === "Peach" ? `${card.rank}${card.suit} Peach selected. Play it now—there is no need to wait for the timer.` : "Tap the Peach you want to use. You have 5 seconds; this choice is visible only to you until the card is played."}</small><div className="rescue-peach-list">{rescuePeaches.map((peach) => <button type="button" className={`rescue-peach-choice ${selected === peach.id ? "selected" : ""}`} aria-pressed={selected === peach.id} key={peach.id} onClick={() => setSelected((id) => id === peach.id ? "" : peach.id)}><strong>{peach.rank}{peach.suit}</strong><i>Peach</i><b>Rescue card</b></button>)}</div><section>{card?.kind === "Peach" && <button className="primary" disabled={busy} onClick={() => { onAction("give_peach", { cardId: card.id }); setSelected(""); }}>{busy ? "Playing…" : "Play selected Peach now"}</button>}<button className="end" disabled={busy} onClick={() => { onAction("skip_rescue"); setSelected(""); }}>{busy ? "Passing…" : "Do not give"}</button></section></div></div>}
      {activeCard && <div className="played-card-stage" role="status"><div className="card-action-title"><b>{activeCard.player}</b><span>{cardEventVerb(activeCard, peachRescue)}</span>{cardEventHasTarget(activeCard, peachRescue) && <strong>{activeCard.target}</strong>}</div><div className="card-battle-row"><ActionHeroCard player={actionPlayer} label="PLAYER" /><div className="action-direction"><span>{cardEventDirection(activeCard, peachRescue)}</span><CardFace card={activeCard.card} /></div>{cardEventHasTarget(activeCard, peachRescue) && <ActionHeroCard player={actionTarget} label={activeCard.card.kind === "Dodge" ? "ATTACKER" : peachRescue ? "DYING PLAYER" : "TARGET"} />}</div></div>}
      {activeCards && <div className="played-card-stage discard-group-stage" role="status"><div className="card-action-title"><b>{activeCards.player}</b><span>discards together</span></div><div className="card-battle-row"><ActionHeroCard player={actionPlayer} label="PLAYER" /><div className="discard-card-row">{activeCards.cards.map((discarded) => <CardFace card={discarded} key={discarded.id} />)}</div></div></div>}
      <div className="play-center"><div className="draw-stack"><b>{room.deckCount}</b><span>DECK</span></div><div className="discard-stack"><b>{room.discardTop ? cardDefinition(room.discardTop.kind).name : "—"}</b><span>DISCARD</span></div></div>
      {room.players.map((player, index) => { const relativeIndex = (index - myTableIndex + room.players.length) % room.players.length; const angle = 180 + (360 / room.players.length) * relativeIndex; const targetable = Boolean(card && (isAttackCard(card) ? (player.distance ?? 99) <= 1 : card.kind === "Dismantle" ? player.handCount > 0 : false)); return <button disabled={!room.isMyTurn || !canPlay || !player.alive || player.id === room.meId || !targetable} onClick={() => { setTarget(player.id); setTargetCardIndex(null); }} className={`started-player play-seat ${player.id === room.meId ? "self-player" : ""} ${player.seat === room.turnSeat && room.status === "playing" ? "active-turn" : ""} ${player.id === room.actionPlayerId && room.status === "playing" ? "active-action" : ""} ${target === player.id ? "targeted" : ""} ${!player.alive ? "defeated" : ""}`} key={player.id} style={{ "--angle": `${angle}deg` } as React.CSSProperties}><div className="seal">{player.name[0]}</div><b>{player.name}</b><small>{heroName(player.hero)} · {player.role ?? "Role hidden"}</small><span>{"♥".repeat(player.hp ?? 0)} · {player.handCount} cards{player.id !== room.meId ? ` · distance ${player.distance}` : ""}</span></button>; })}
      {room.status === "finished" && <div className="victory-banner"><span>MATCH COMPLETE</span><b>{room.log.at(-1)?.replace("! The match is over.", "")}</b><small>All roles are now revealed at the table.</small></div>}
    </section>
    <footer className="play-command"><div className="turn-controls"><span>{presentationBusy ? "Showing the current game event…" : room.status === "finished" ? "The match has ended" : room.phase === "dying" ? room.isMyAction ? `Your private Peach decision is open` : "Waiting — no rescue action is required from you" : canRespond ? `Your action · select a Dodge card, then play it—or take damage` : room.phase === "response" ? `Waiting for ${defender?.name ?? "the target"} to answer ${attacker?.name ?? "the attacker"}` : room.phase === "discard" && room.isMyTurn ? `Your action · Discard Phase · select ${excessCards} card${excessCards === 1 ? "" : "s"} (${discardSelected.length}/${excessCards})` : room.isMyTurn ? room.phase === "draw" ? "Your action · Draw Phase" : card && isAttackCard(card) && !target ? "Your action · Play Phase · choose an adjacent target" : card?.kind === "Dismantle" && !target ? "Your action · choose a player with cards" : card?.kind === "Dismantle" && targetCardIndex === null ? "Your action · choose one hidden card" : room.phase === "play-struck" ? "Your action · Play Phase · Attack used" : "Your action · Play Phase" : `Waiting for ${actor?.name ?? current?.name ?? "another player"}`}</span><div>{canRespond && <><button className="primary" disabled={busy || card?.kind !== "Dodge"} onClick={() => card && onAction("respond_dodge", { cardId: card.id })}>{busy ? "Playing…" : "Play selected"}</button><button className="end" disabled={busy} onClick={() => onAction("take_damage")}>{busy ? "Applying…" : "Take 1 damage"}</button></>}{room.isMyTurn && room.phase === "discard" && <button className="end" disabled={busy || discardSelected.length !== excessCards} onClick={() => onAction("discard_cards", { cardIds: discardSelected })}>{busy ? "Discarding…" : `Discard ${excessCards} selected`}</button>}{room.isMyTurn && canPlay && <><button className="primary" disabled={busy || presentationBusy || !card || (isAttackCard(card) && (!target || room.phase === "play-struck")) || (card.kind === "Dismantle" && (!target || targetCardIndex === null)) || card.kind === "Dodge"} onClick={play}>{busy ? "Playing…" : "Play selected"}</button><button className="end" disabled={busy || presentationBusy} onClick={() => onAction("end_turn")}>{busy ? "Finishing…" : "Finish Play Phase"}</button></>}</div></div>
      {card?.kind === "Dismantle" && targetPlayer && <div className="hidden-card-picker" aria-label={`Choose one hidden card from ${targetPlayer.name}`}><span>{targetPlayer.name}&apos;s hand</span>{Array.from({ length: targetPlayer.handCount }, (_, index) => <button type="button" className={targetCardIndex === index ? "selected" : ""} aria-pressed={targetCardIndex === index} key={index} onClick={() => setTargetCardIndex(index)}>?</button>)}</div>}
      <div className="play-hand">{room.myHand.map((item) => { const definition = cardDefinition(item.kind); const isSelected = room.phase === "discard" ? discardSelected.includes(item.id) : selected === item.id; const maySelect = (room.isMyTurn && (canPlay || room.phase === "discard")) || canRespond || rescueDecisionReady; return <div className="card-slot" key={item.id}><button disabled={!maySelect || (canRespond && item.kind !== "Dodge") || (rescueDecisionReady && item.kind !== "Peach")} onClick={() => { if (room.phase === "discard") setDiscardSelected((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : ids.length < excessCards ? [...ids, item.id] : ids); else setSelected((id) => id === item.id ? "" : item.id); setTarget(""); setTargetCardIndex(null); }} className={`game-card ${item.kind.toLowerCase()} ${isSelected ? "selected" : ""}`}><span className="corner">{item.rank}<i>{item.suit}</i></span><span className="card-name-mark">{definition.name}</span><strong>{definition.category} card</strong><small>{room.phase === "discard" ? isSelected ? "Selected · tap to remove" : "Tap to select" : rescueDecisionReady && item.kind === "Peach" ? isSelected ? "Selected · give this Peach" : "Tap to select this Peach" : canRespond && item.kind === "Dodge" ? isSelected ? "Selected · play it" : "Tap to answer Attack" : definition.description}</small></button><button type="button" className="card-info-button" aria-label={`Explain ${definition.name}`} onClick={() => setInfoCard(item)}>i</button></div>; })}</div>
      {error && <p className="error play-error" role="alert">{error}</p>}<div className="self-summary"><strong>{room.myRole}</strong> · {heroName(me?.hero)} · {me?.hp}/{me?.maxHp} HP · Your position is always at the bottom</div>
    </footer>
    {historyOpen && <div className="history-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setHistoryOpen(false)}><section className="history-window" role="dialog" aria-modal="true" aria-labelledby="history-title"><header><div><span>DEBUG TOOL</span><h2 id="history-title">Event history</h2></div><button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close event history">×</button></header><p className="history-warning">For testing and rule verification. Newest events appear first.</p><div className="history-scroll">{room.timeline.length ? room.timeline.slice().reverse().map((event, index) => <div className="history-entry" key={event.id}><b>{room.timeline.length - index}</b><span>{describeEvent(event)}</span></div>) : <p>No events recorded yet.</p>}</div></section></div>}
    {infoCard && <div className="card-info-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setInfoCard(null)}><section className="card-info-dialog" role="dialog" aria-modal="true" aria-labelledby="card-info-title"><button type="button" className="card-info-close" onClick={() => setInfoCard(null)} aria-label="Close card explanation">×</button><span>PRIVATE CARD INFORMATION</span><small>{infoCard.rank}{infoCard.suit} · {cardDefinition(infoCard.kind).category} card</small><h2 id="card-info-title">{cardDefinition(infoCard.kind).name}</h2><p>{cardDefinition(infoCard.kind).rules}</p><a href={OFFICIAL_WTK_CARD_CATALOGUE} target="_blank" rel="noreferrer">Official WTK card catalogue ↗</a><em>Only you can see this explanation.</em></section></div>}
  </main>;
}

function ActionHeroCard({ player, label }: { player?: Player; label: string }) {
  return <div className="action-hero"><small>{label}</small><div>{player?.name?.[0] ?? "?"}</div><b>{player?.name ?? "Unknown"}</b><span>{heroName(player?.hero)}</span><i>{"♥".repeat(player?.hp ?? 0)}</i></div>;
}

function CardFace({ card }: { card: Card }) {
  const definition = cardDefinition(card.kind);
  return <div className={`played-card ${card.kind.toLowerCase()}`}><i>{card.rank}<small>{card.suit}</small></i><b className="card-name-mark">{definition.name}</b><strong>{definition.category} card</strong></div>;
}

function cardEventVerb(event: CardEvent, peachRescue: boolean) {
  if (event.action === "discard") return "discards";
  if (event.card.kind === "Dodge") return "blocks";
  if (peachRescue) return "rescues";
  if (event.card.kind === "Peach") return "heals self";
  if (event.card.kind === "DrawTwo") return "draws 2 cards";
  if (event.card.kind === "Dismantle") return "burns a bridge against";
  return "attacks";
}

function cardEventHasTarget(event: CardEvent, peachRescue: boolean) {
  return event.action !== "discard" && (isAttackCard(event.card) || event.card.kind === "Dodge" || event.card.kind === "Dismantle" || peachRescue);
}

function cardEventDirection(event: CardEvent, peachRescue: boolean) {
  if (event.action === "discard") return "DISCARD ↓";
  if (peachRescue) return "GIVES →";
  if (event.card.kind === "Dodge") return "← BLOCKS";
  if (isAttackCard(event.card)) return "ATTACKS →";
  if (event.card.kind === "Dismantle") return "BURNING BRIDGES →";
  return "SELF";
}

function describeEvent(event: GameEvent) {
  if (event.type === "message") return event.message;
  if (event.type === "cards") return `${event.player} reveals and discards ${event.cards.map((card) => `${card.rank}${card.suit} ${cardDefinition(card.kind).name}`).join(", ")}.`;
  if (event.action === "discard") return `${event.player} reveals and discards ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name}.`;
  return event.message ?? `${event.player} plays ${event.card.rank}${event.card.suit} ${cardDefinition(event.card.kind).name}${event.target !== event.player ? ` on ${event.target}` : ""}.`;
}
