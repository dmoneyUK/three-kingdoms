"use client";

import { FormEvent, useEffect, useState } from "react";

type Hero = { id: string; name: string; faction: string; hp: number; ability: string };
type Card = { id: string; kind: "Strike" | "Dodge" | "Peach"; suit: "♥" | "♦" | "♣" | "♠"; rank: string };
type Player = { id: string; name: string; seat: number; hero: string | null; hp: number | null; maxHp: number | null; alive: boolean; handCount: number; distance: number | null; isHost: boolean; isBot?: boolean; role: string | null };
type Room = { code: string; status: "lobby" | "heroes" | "started" | "playing" | "finished"; maxPlayers: number; isHost: boolean; meId: string; myRole: string | null; myHeroOptions: Hero[]; players: Player[]; myHand: Card[]; turnSeat: number | null; phase: string | null; deckCount: number; discardTop: Card | null; log: string[]; isMyTurn: boolean; pendingAttack: { sourceId: string; targetId: string } | null };

export default function Home() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("three-realms-session");
    if (!saved) return;
    try {
      const session = JSON.parse(saved) as { code: string; token: string; name: string };
      setName(session.name); setToken(session.token); setCode(session.code);
      fetchRoom(session.code, session.token);
    } catch { localStorage.removeItem("three-realms-session"); }
  }, []);

  useEffect(() => {
    if (!room || !token) return;
    const timer = setInterval(() => fetchRoom(room.code, token, true), 2500);
    return () => clearInterval(timer);
  }, [room?.code, token]);

  async function fetchRoom(roomCode: string, playerToken: string, quiet = false) {
    try {
      const response = await fetch(`/api/rooms?code=${roomCode}&token=${playerToken}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Room is no longer available.");
      setRoom(await response.json());
    } catch (cause) { if (!quiet) setError(cause instanceof Error ? cause.message : "Could not reach the room."); }
  }

  async function send(action: "create" | "join" | "start" | "add_test_players" | "choose_hero" | "draw" | "play_card" | "end_turn" | "respond_dodge" | "take_damage" | "discard_card", extra: Record<string, string> = {}) {
    setBusy(true); setError("");
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
          <label>Your display name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={20} placeholder="e.g. Jing" autoComplete="nickname" /></label>
          <button className="gold-button" disabled={busy || name.trim().length < 2} onClick={() => send("create")}>{busy ? "Preparing…" : "Create a room"}</button>
          <div className="divider"><span>OR JOIN A FRIEND</span></div>
          <form onSubmit={(event: FormEvent) => { event.preventDefault(); send("join"); }}>
            <label>Five-character room code<input className="code-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))} maxLength={5} placeholder="ABCDE" autoCapitalize="characters" /></label>
            <button className="outline-button" disabled={busy || name.trim().length < 2 || code.length !== 5}>Join room</button>
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

function GameRoom({ room, busy, error, onAction, onLeave }: { room: Room; busy: boolean; error: string; onAction: (action: "draw" | "play_card" | "end_turn" | "respond_dodge" | "take_damage" | "discard_card", extra?: Record<string, string>) => void; onLeave: () => void }) {
  const [selected, setSelected] = useState(""); const [target, setTarget] = useState("");
  const card = room.myHand.find((item) => item.id === selected); const current = room.players.find((player) => player.seat === room.turnSeat); const me = room.players.find((player) => player.id === room.meId);
  const canPlay = room.phase?.startsWith("play") && room.status === "playing";
  const play = () => { if (!card) return; onAction("play_card", { cardId: card.id, ...(card.kind === "Strike" ? { targetId: target } : {}) }); setSelected(""); setTarget(""); };
  return <main className="game-shell"><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b><span>{current?.name ?? "—"}&apos;s turn</span></div><button className="text-button" onClick={onLeave}>Exit</button></header>
    <section className="play-table"><div className="role-reveal"><span>YOUR SECRET ROLE</span><b>{room.myRole}</b><small>{room.myRole === "Lord" ? "Survive and eliminate every Rebel and Renegade." : room.myRole === "Loyalist" ? "Protect the Lord and eliminate every threat." : room.myRole === "Rebel" ? "Overthrow the Lord." : "Be the last player standing."}</small></div>
      <div className="play-center"><div className="draw-stack"><b>{room.deckCount}</b><span>DECK</span></div><div className="discard-stack"><b>{room.discardTop?.kind ?? "—"}</b><span>DISCARD</span></div></div>
      {room.players.map((player, index) => <button disabled={!room.isMyTurn || !canPlay || !player.alive || player.id === room.meId || (player.distance ?? 99) > 1} onClick={() => card?.kind === "Strike" && setTarget(player.id)} className={`started-player play-seat ${player.seat === room.turnSeat && room.status === "playing" ? "active-turn" : ""} ${target === player.id ? "targeted" : ""} ${!player.alive ? "defeated" : ""}`} key={player.id} style={{ "--angle": `${(360 / room.players.length) * index}deg` } as React.CSSProperties}><div className="seal">{player.name[0]}</div><b>{index + 1}. {player.name}</b><small>{heroName(player.hero)} · {player.role ?? "Role hidden"}</small><span>{"♥".repeat(player.hp ?? 0)} · {player.handCount} cards{player.id !== room.meId ? ` · distance ${player.distance}` : ""}</span></button>)}
      <aside className="battle-log"><span>ACTIVITY</span>{room.log.slice(-4).reverse().map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}</aside>
      {room.status === "finished" && <div className="victory-banner"><span>MATCH COMPLETE</span><b>{room.log.at(-1)?.replace("! The match is over.", "")}</b><small>All roles are now revealed at the table.</small></div>}
    </section>
    <footer className="play-command"><div className="turn-controls"><span>{room.status === "finished" ? "The match has ended" : room.phase === "response" ? room.pendingAttack?.targetId === room.meId ? "You are under attack — play Dodge or take damage" : "Waiting for the defender to answer Strike" : room.phase === "discard" && room.isMyTurn ? `Discard down to your HP limit (${me?.hp ?? 0})` : room.isMyTurn ? room.phase === "draw" ? "Your draw phase" : card?.kind === "Strike" && !target ? "Choose an adjacent opponent (distance 1)" : room.phase === "play-struck" ? "Strike used — play Peach or end your turn" : "Your play phase" : `Waiting for ${current?.name ?? "another player"}`}</span><div>{room.phase === "response" && room.pendingAttack?.targetId === room.meId && <><button className="primary" disabled={busy || !room.myHand.some((item) => item.kind === "Dodge")} onClick={() => onAction("respond_dodge")}>Play Dodge</button><button className="end" disabled={busy} onClick={() => onAction("take_damage")}>Take damage</button></>}{room.isMyTurn && room.phase === "discard" && <button className="end" disabled={busy || !card} onClick={() => card && onAction("discard_card", { cardId: card.id })}>Discard selected</button>}{room.isMyTurn && room.phase === "draw" && <button className="primary" disabled={busy} onClick={() => onAction("draw")}>Draw 2 cards</button>}{room.isMyTurn && canPlay && <><button className="primary" disabled={busy || !card || (card.kind === "Strike" && (!target || room.phase === "play-struck")) || card.kind === "Dodge"} onClick={play}>Play selected</button><button className="end" disabled={busy} onClick={() => onAction("end_turn")}>End turn</button></>}</div></div>
      <div className="play-hand">{room.myHand.map((item) => <button key={item.id} onClick={() => { setSelected(item.id); setTarget(""); }} className={`game-card ${item.kind.toLowerCase()} ${selected === item.id ? "selected" : ""}`}><span className="corner">{item.rank}<i>{item.suit}</i></span><span className="card-glyph">{item.kind === "Strike" ? "⚔" : item.kind === "Dodge" ? "盾" : "桃"}</span><strong>{item.kind}</strong><small>{item.kind === "Dodge" ? "Play when attacked" : item.kind === "Peach" ? "Recover 1 HP" : "Range 1 · deal 1 damage"}</small></button>)}</div>
      {error && <p className="error play-error" role="alert">{error}</p>}<div className="self-summary">{heroName(me?.hero)} · {me?.hp}/{me?.maxHp} HP · Turn order follows numbered seats clockwise</div>
    </footer></main>;
}
