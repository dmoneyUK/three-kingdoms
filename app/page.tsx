"use client";

import { useState } from "react";

const hand = [
  { suit: "♥", rank: "7", name: "Peach", note: "Recover 1 HP", tone: "peach" },
  { suit: "♠", rank: "K", name: "Strike", note: "Deal 1 damage", tone: "ink" },
  { suit: "♦", rank: "9", name: "Dodge", note: "Cancel a Strike", tone: "jade" },
  { suit: "♣", rank: "A", name: "Duel", note: "Trade Strikes", tone: "gold" },
  { suit: "♠", rank: "5", name: "Strike", note: "Deal 1 damage", tone: "ink" },
];

const players = [
  { name: "Mina", hero: "Sun Shangxiang", hp: 3, max: 3, place: "north", role: "?" },
  { name: "Theo", hero: "Zhao Yun", hp: 4, max: 4, place: "east", role: "?" },
  { name: "Ari", hero: "Zhang Liao", hp: 3, max: 4, place: "west", role: "?" },
];

export default function Home() {
  const [selected, setSelected] = useState<number | null>(1);
  const [message, setMessage] = useState("Your play phase — choose a card or end your turn.");
  const [log, setLog] = useState(["Jing drew 2 cards.", "Judgement phase: no delayed tactics."]);

  function playCard() {
    if (selected === null) return;
    const card = hand[selected];
    setMessage(`${card.name} selected. Choose a valid target at the table.`);
    setLog((items) => [`Jing prepares ${card.name}.`, ...items].slice(0, 4));
  }

  function endTurn() {
    setSelected(null);
    setMessage("Turn ended. Waiting for Mina…");
    setLog((items) => ["Jing ended the turn.", ...items].slice(0, 4));
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">三</span><div><strong>Three Realms</strong><small>Classic hidden-role game</small></div></div>
        <div className="room"><span className="live-dot" /> ROOM <b>RED-CLIFF</b><span>Round 3</span></div>
        <button className="icon-button" aria-label="Game menu">•••</button>
      </header>

      <section className="table-wrap" aria-label="Game table">
        <div className="ambient ambient-one" /><div className="ambient ambient-two" />
        {players.map((player) => (
          <button key={player.name} className={`player player-${player.place}`} onClick={() => setMessage(`${player.hero} is at distance 1.`)}>
            <span className="portrait">{player.hero.split(" ").map((part) => part[0]).join("")}</span>
            <span className="player-copy"><b>{player.name}</b><small>{player.hero}</small><span className="hearts">{"♥".repeat(player.hp)}<i>{"♥".repeat(player.max - player.hp)}</i></span></span>
            <span className="role-seal">{player.role}</span><span className="card-count">▤ 4</span>
          </button>
        ))}
        <div className="draw-pile" aria-label="Draw pile"><span>三</span><small>DRAW</small><b>73</b></div>
        <div className="discard-pile" aria-label="Discard pile"><span>♦ 6</span><strong>Dodge</strong><small>DISCARD · 19</small></div>
        <aside className="turn-panel"><div className="turn-head"><span>YOUR TURN</span><b>38</b></div><ol><li className="done">Start</li><li className="done">Judge</li><li className="done">Draw</li><li className="active">Play</li><li>Discard</li><li>End</li></ol></aside>
        <aside className="history"><span>TABLE LOG</span>{log.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}</aside>
      </section>

      <section className="command-bar">
        <div className="self-card"><span className="lord-seal">LORD</span><div className="avatar">CC</div><div><b>Jing</b><small>Cao Cao · Wei</small><span className="self-hearts">♥ ♥ ♥ <i>♥</i></span></div><span className="skill"><b>Villainous Hero</b><small>After taking damage, gain the card that caused it.</small></span></div>
        <div className="hand-area">
          <div className="prompt"><span>{message}</span><div><button className="quiet" onClick={() => setSelected(null)}>Cancel</button><button className="primary" disabled={selected === null} onClick={playCard}>Play card</button><button className="end" onClick={endTurn}>End turn</button></div></div>
          <div className="cards">
            {hand.map((card, index) => <button key={`${card.name}-${index}`} className={`game-card ${card.tone} ${selected === index ? "selected" : ""}`} onClick={() => { setSelected(index); setMessage(`${card.name} — ${card.note}.`); }}><span className="corner">{card.rank}<i>{card.suit}</i></span><span className="card-glyph">{card.suit}</span><strong>{card.name}</strong><small>{card.note}</small></button>)}
          </div>
        </div>
      </section>
    </main>
  );
}
