"use client";

import { FormEvent, useEffect, useState } from "react";

type Player = { id: string; name: string; seat: number; hero: string | null; hp: number | null; isHost: boolean; role: string | null };
type Room = { code: string; status: "lobby" | "started" | "finished"; maxPlayers: number; isHost: boolean; meId: string; myRole: string | null; players: Player[] };

const HEROES = ["Cao Cao", "Liu Bei", "Sun Quan", "Zhao Yun", "Guan Yu", "Zhang Fei", "Diao Chan", "Zhou Yu"];

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

  async function send(action: "create" | "join" | "start") {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, name, code, token }) });
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

  if (room?.status === "started") return <GameRoom room={room} onLeave={leave} />;
  if (room) return <WaitingRoom room={room} busy={busy} error={error} onStart={() => send("start")} onLeave={leave} />;

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

function WaitingRoom({ room, busy, error, onStart, onLeave }: { room: Room; busy: boolean; error: string; onStart: () => void; onLeave: () => void }) {
  const share = async () => { await navigator.clipboard?.writeText(room.code); };
  return <main className="lobby-shell"><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b></div><button className="text-button" onClick={onLeave}>Leave room</button></header>
    <section className="lobby-content"><div className="lobby-heading"><span className="eyebrow">THE GENERALS ASSEMBLE</span><h1>Waiting room</h1><p>Share this code with your friends. The match begins when 4–8 players have joined.</p><button className="copy-code" onClick={share}><span>{room.code}</span><small>Tap to copy room code</small></button></div>
      <div className="seat-grid">{Array.from({ length: room.maxPlayers }, (_, seat) => { const player = room.players.find((item) => item.seat === seat); return <div className={`seat ${player ? "filled" : ""}`} key={seat}>{player ? <><span className="seat-number">{seat + 1}</span><div className="seal">{player.name[0].toUpperCase()}</div><b>{player.name}</b><small>{player.isHost ? "HOST · LORD" : "ROLE HIDDEN"}</small></> : <><span className="seat-number">{seat + 1}</span><div className="empty-seal">+</div><b>Open seat</b><small>WAITING FOR PLAYER</small></>}</div>; })}</div>
      <div className="lobby-actions"><span>{room.players.length} / {room.maxPlayers} players</span>{room.isHost ? <button className="gold-button" disabled={busy || room.players.length < 4} onClick={onStart}>{busy ? "Dealing roles…" : room.players.length < 4 ? `Need ${4 - room.players.length} more` : "Start match"}</button> : <p>Waiting for the host to start…</p>}</div>{error && <p className="error" role="alert">{error}</p>}</section></main>;
}

function GameRoom({ room, onLeave }: { room: Room; onLeave: () => void }) {
  return <main className="game-shell"><header className="topbar"><Brand /><div className="room"><span className="live-dot" /> ROOM <b>{room.code}</b><span>Match started</span></div><button className="text-button" onClick={onLeave}>Exit</button></header>
    <section className="new-table"><div className="role-reveal"><span>YOUR SECRET ROLE</span><b>{room.myRole}</b><small>{room.myRole === "Lord" ? "Survive and eliminate every Rebel and Renegade." : room.myRole === "Loyalist" ? "Protect the Lord and eliminate every threat." : room.myRole === "Rebel" ? "Overthrow the Lord." : "Be the last player standing."}</small></div><div className="table-center"><span>三</span><small>HERO SELECTION COMING NEXT</small></div>{room.players.map((player, index) => <div className="started-player" key={player.id} style={{ "--angle": `${(360 / room.players.length) * index}deg` } as React.CSSProperties}><div className="seal">{player.name[0]}</div><b>{player.name}</b><small>{player.role ?? (player.isHost ? "Lord" : "Role hidden")}</small><span>{"♥".repeat(player.hp ?? 4)}</span></div>)}</section>
    <footer className="phase-footer"><div><span>ROOM READY</span><b>Roles were assigned securely</b></div><p>The multiplayer lobby and private-role system are live. Hero selection and card play are the next rules milestone.</p></footer></main>;
}
