import { env } from "cloudflare:workers";

export const runtime = "edge";

type Card = { id: string; kind: "Strike" | "Dodge" | "Peach"; suit: "♥" | "♦" | "♣" | "♠"; rank: string };
type AttackPending = { kind: "attack"; sourceId: string; targetId: string; actorId: string; reason: string };
type DyingPending = { kind: "dying"; sourceId: string; targetId: string; actorId: string; reason: string };
type Pending = AttackPending | DyingPending;
type RoomRow = { id: string; code: string; host_player_id: string; status: string; max_players: number; created_at: number; turn_seat: number | null; phase: string | null; deck_json: string | null; discard_json: string | null; log_json: string | null; pending_json: string | null };
type Hero = { id: string; name: string; faction: string; hp: number; ability: string };
type PlayerRow = { id: string; room_id: string; name: string; token_hash: string; seat: number; role: string | null; hero: string | null; hp: number | null; max_hp: number | null; hero_options_json: string | null; hand_json: string | null; alive: number; connected_at: number };

const HEROES: Hero[] = [
  { id: "cao-cao", name: "Cao Cao", faction: "Wei", hp: 4, ability: "After taking damage, you may gain the card that caused it." },
  { id: "simayi", name: "Sima Yi", faction: "Wei", hp: 3, ability: "After taking damage, you may take one card from the source." },
  { id: "xiahou-dun", name: "Xiahou Dun", faction: "Wei", hp: 4, ability: "After taking damage, judge: on red, the source discards or loses HP." },
  { id: "zhang-liao", name: "Zhang Liao", faction: "Wei", hp: 4, ability: "During draw, you may take cards from up to two players instead." },
  { id: "xu-chu", name: "Xu Chu", faction: "Wei", hp: 4, ability: "Draw one fewer card to make your Strike and Duel damage stronger." },
  { id: "guo-jia", name: "Guo Jia", faction: "Wei", hp: 3, ability: "After a judgement or damage, turn revealed cards into resources." },
  { id: "zhen-ji", name: "Zhen Ji", faction: "Wei", hp: 3, ability: "Black cards may be used as Dodge; black judgements can extend your draw." },
  { id: "liu-bei", name: "Liu Bei", faction: "Shu", hp: 4, ability: "Give cards to allies; after giving enough, recover 1 HP." },
  { id: "guan-yu", name: "Guan Yu", faction: "Shu", hp: 4, ability: "Any red card may be used as a Strike." },
  { id: "zhang-fei", name: "Zhang Fei", faction: "Shu", hp: 4, ability: "You may play any number of Strikes during your turn." },
  { id: "zhao-yun", name: "Zhao Yun", faction: "Shu", hp: 4, ability: "Strike and Dodge may be used interchangeably." },
  { id: "ma-chao", name: "Ma Chao", faction: "Shu", hp: 4, ability: "Your attack distance improves; judgement may make a Strike unavoidable." },
  { id: "huang-yueying", name: "Huang Yueying", faction: "Shu", hp: 3, ability: "After using a tactic, draw a card; equipment has no distance limit." },
  { id: "sun-quan", name: "Sun Quan", faction: "Wu", hp: 4, ability: "Once per turn, exchange any number of cards for new ones." },
  { id: "gan-ning", name: "Gan Ning", faction: "Wu", hp: 4, ability: "Any black card may be used to dismantle another player's card." },
  { id: "lü-meng", name: "Lü Meng", faction: "Wu", hp: 4, ability: "If you play no Strike, you may ignore the normal hand limit." },
  { id: "huang-gai", name: "Huang Gai", faction: "Wu", hp: 4, ability: "Lose 1 HP to draw two cards." },
  { id: "zhou-yu", name: "Zhou Yu", faction: "Wu", hp: 3, ability: "Draw an extra card; challenge a player to guess a card's suit." },
  { id: "daqiao", name: "Da Qiao", faction: "Wu", hp: 3, ability: "Diamond cards may delay another player's turn." },
  { id: "lu-xun", name: "Lu Xun", faction: "Wu", hp: 3, ability: "You resist delayed capture; draw when your hand becomes empty." },
  { id: "sun-shangxiang", name: "Sun Shangxiang", faction: "Wu", hp: 3, ability: "Draw when losing equipment; discard equipment to heal an injured ally." },
  { id: "hua-tuo", name: "Hua Tuo", faction: "Neutral", hp: 3, ability: "Red cards may heal others; discard a card to heal yourself once per turn." },
  { id: "lü-bu", name: "Lü Bu", faction: "Neutral", hp: 4, ability: "A target needs two Dodge cards to stop your Strike." },
  { id: "diao-chan", name: "Diao Chan", faction: "Neutral", hp: 3, ability: "Force two male heroes to duel; draw at the end of your turn." },
  { id: "huaxiong", name: "Hua Xiong", faction: "Neutral", hp: 6, ability: "High endurance, but red Strike damage can reward the attacker." },
  { id: "yuanshao", name: "Yuan Shao", faction: "Neutral", hp: 4, ability: "Two same-suit hand cards may become a volley against everyone." },
  { id: "yanliang-wenchou", name: "Yan Liang & Wen Chou", faction: "Neutral", hp: 4, ability: "A black card may launch a Duel." },
  { id: "pangde", name: "Pang De", faction: "Neutral", hp: 4, ability: "Improved attack distance; a dodged Strike can discard a target card." },
];

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function setup() {
  const db = env.DB;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, host_player_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'lobby', max_players INTEGER NOT NULL DEFAULT 8, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, room_id TEXT NOT NULL, name TEXT NOT NULL, token_hash TEXT NOT NULL, seat INTEGER NOT NULL, role TEXT, hero TEXT, hp INTEGER, connected_at INTEGER NOT NULL, UNIQUE(room_id, seat))"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id)"),
  ]);
}

function cleanName(value: unknown) { return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 20); }
function randomCode() { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const bytes = crypto.getRandomValues(new Uint8Array(5)); return Array.from(bytes, (byte) => chars[byte % chars.length]).join(""); }
function newToken() { return Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function hash(value: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function parse<T>(value: string | null, fallback: T): T { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function makeDeck() {
  const kinds: Card["kind"][] = [...Array(30).fill("Strike"), ...Array(20).fill("Dodge"), ...Array(12).fill("Peach")];
  const suits: Card["suit"][] = ["♥", "♦", "♣", "♠"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck = kinds.map((kind, index) => ({ id: crypto.randomUUID(), kind, suit: suits[index % 4], rank: ranks[index % 13] }));
  for (let index = deck.length - 1; index > 0; index--) { const swap = Math.floor(Math.random() * (index + 1)); [deck[index], deck[swap]] = [deck[swap], deck[index]]; }
  return deck;
}
function addLog(log: string[], message: string) { return [...log.slice(-199), `@event:${JSON.stringify({ id: crypto.randomUUID(), message })}`]; }
function addHistory(log: string[], message: string) { return [...log.slice(-199), `@history:${JSON.stringify({ id: crypto.randomUUID(), message })}`]; }
function addCardEvent(log: string[], player: string, card: Card, target = player, action: "play" | "discard" = "play") { return [...log.slice(-199), `@card:${JSON.stringify({ id: crypto.randomUUID(), player, target, card, action })}`]; }
function drawCards(deck: Card[], discard: Card[], count: number, log: string[]) {
  const drawn: Card[] = [];
  while (drawn.length < count) {
    if (!deck.length) {
      if (!discard.length) break;
      deck = [...discard]; discard = [];
      for (let index = deck.length - 1; index > 0; index--) { const swap = Math.floor(Math.random() * (index + 1)); [deck[index], deck[swap]] = [deck[swap], deck[index]]; }
      log = addLog(log, "The discard pile is shuffled into a new draw deck.");
    }
    const card = deck.shift(); if (card) drawn.push(card);
  }
  return { deck, discard, drawn, log };
}
function messageEvent(entry: string, index: number) {
  if (!entry.startsWith("@event:")) return { type: "message" as const, id: `legacy-${index}-${entry}`, message: entry };
  try { return { type: "message" as const, ...JSON.parse(entry.slice(7)) as { id: string; message: string } }; } catch { return null; }
}
function gameTimeline(entries: string[]) {
  const events: Array<Record<string, unknown>> = [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (entry.startsWith("@history:")) {
      try { events.push({ type: "message", presentation: false, ...JSON.parse(entry.slice(9)) as { id: string; message: string } }); } catch { /* Ignore malformed historical events. */ }
      continue;
    }
    if (!entry.startsWith("@card:")) {
      const event = messageEvent(entry, index); if (event) events.push(event);
      continue;
    }
    try {
      const card = JSON.parse(entry.slice(6)) as Record<string, unknown>;
      const next = entries[index + 1];
      const detail = next && !next.startsWith("@card:") ? messageEvent(next, index + 1) : null;
      events.push({ type: "card", ...card, ...(detail ? { message: detail.message } : {}) });
      if (detail) index++;
    } catch { /* Ignore malformed historical events. */ }
  }
  return events;
}
function nextAlive(players: PlayerRow[], seat: number) { const alive = players.filter((player) => player.alive).sort((a, b) => a.seat - b.seat); return alive.find((player) => player.seat > seat)?.seat ?? alive[0]?.seat ?? seat; }
function attackDistance(players: PlayerRow[], sourceId: string, targetId: string) { const alive = players.filter((player) => player.alive).sort((a, b) => a.seat - b.seat); const from = alive.findIndex((player) => player.id === sourceId); const to = alive.findIndex((player) => player.id === targetId); if (from < 0 || to < 0) return 99; const clockwise = (to - from + alive.length) % alive.length; return Math.min(clockwise, alive.length - clockwise); }
async function claimTurnAction(roomId: string, seat: number, phase: string) {
  const result = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND status = 'playing' AND turn_seat = ? AND phase = ?").bind(roomId, seat, phase).run();
  return (result.meta.changes ?? 0) === 1;
}
async function finishIfWon(roomId: string) {
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>(); const players = rows.results ?? []; const alive = players.filter((player) => player.alive); const lord = players.find((player) => player.role === "Lord");
  let winner = "";
  if (!lord?.alive) winner = alive.length === 1 && alive[0].role === "Renegade" ? "Renegade victory" : "Rebel victory";
  else if (!alive.some((player) => player.role === "Rebel" || player.role === "Renegade")) winner = "Lord and Loyalist victory";
  if (!winner) return false;
  const room = await db().prepare("SELECT log_json FROM rooms WHERE id = ?").bind(roomId).first<{ log_json: string | null }>(); const log = addLog(parse<string[]>(room?.log_json ?? null, []), `${winner}! The match is over.`);
  await db().prepare("UPDATE rooms SET status = 'finished', phase = 'finished', pending_json = NULL, log_json = ? WHERE id = ?").bind(JSON.stringify(log), roomId).run(); return true;
}

async function beginMatch(roomId: string, players: PlayerRow[]) {
  const deck = makeDeck();
  const updates = players.map((player) => db().prepare("UPDATE players SET hand_json = ?, alive = 1 WHERE id = ?").bind(JSON.stringify(deck.splice(0, 4)), player.id));
  const lord = players.find((player) => player.role === "Lord") ?? players[0];
  await db().batch([...updates, db().prepare("UPDATE rooms SET status = 'playing', turn_seat = ?, phase = 'draw', deck_json = ?, discard_json = '[]', log_json = ? WHERE id = ?").bind(lord.seat, JSON.stringify(deck), JSON.stringify([`${lord.name} begins the match.`]), roomId)]);
}
function db() { return env.DB; }

async function runBots(roomId: string) {
  for (let guard = 0; guard < 12; guard++) {
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
    const players = rows.results ?? []; const bot = players.find((player) => player.seat === room?.turn_seat);
    if (!room || room.status !== "playing" || room.phase === "response" || room.phase === "dying" || !bot?.name.startsWith("Test General ")) return;
    let deck = parse<Card[]>(room.deck_json, []); let discard = parse<Card[]>(room.discard_json, []); let log = parse<string[]>(room.log_json, []); let hand = parse<Card[]>(bot.hand_json, []);
    if (room.phase === "draw") { const draw = drawCards(deck, discard, 2, log); deck = draw.deck; discard = draw.discard; log = addHistory(draw.log, `${bot.name} draws ${draw.drawn.length === 2 ? "two cards" : `${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"}`}.`); hand.push(...draw.drawn); }
    while ((bot.hp ?? 0) < (bot.max_hp ?? 0)) {
      const peach = hand.find((card) => card.kind === "Peach"); if (!peach) break;
      hand = hand.filter((card) => card.id !== peach.id); discard.push(peach); bot.hp = (bot.hp ?? 0) + 1; log = addCardEvent(log, bot.name, peach); log = addLog(log, `${bot.name} plays Peach and recovers 1 HP.`);
    }
    const strike = hand.find((card) => card.kind === "Strike");
    const targets = players.filter((player) => player.alive && player.id !== bot.id && attackDistance(players, bot.id, player.id) === 1).sort((a, b) => (a.hp ?? 99) - (b.hp ?? 99));
    const target = targets[0];
    const writes = [];
    if (strike && target) {
      hand = hand.filter((card) => card.id !== strike.id); discard.push(strike); log = addCardEvent(log, bot.name, strike, target.name);
      if (!target.name.startsWith("Test General ")) {
        const targetHand = parse<Card[]>(target.hand_json, []);
        if (targetHand.some((card) => card.kind === "Dodge")) {
          log = addLog(log, `${bot.name} plays Strike on ${target.name}. Action passes from ${bot.name} to ${target.name} for Dodge response.`);
          writes.push(db().prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), bot.hp, bot.id));
          writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify({ kind: "attack", sourceId: bot.id, targetId: target.id, actorId: target.id, reason: "Respond to Strike: select Dodge or take 1 damage" }), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId));
          await db().batch(writes); return;
        }
        target.hp = Math.max(0, (target.hp ?? 1) - 1); log = addLog(log, `${target.name} has no Dodge and automatically takes 1 damage.${target.hp > 0 ? ` Action returns to ${bot.name}.` : ` Action passes to ${target.name} for Dying rescue.`}`);
        writes.push(db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(target.hp, target.id));
        if (target.hp === 0) {
          writes.push(db().prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), bot.hp, bot.id));
          writes.push(db().prepare("UPDATE rooms SET phase = 'dying', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify({ kind: "dying", sourceId: bot.id, targetId: target.id, actorId: target.id, reason: "Dying rescue: use Peach or accept defeat" }), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId));
          await db().batch(writes); return;
        }
      } else {
        let targetHand = parse<Card[]>(target.hand_json, []); const dodge = targetHand.find((card) => card.kind === "Dodge");
        if (dodge) { targetHand = targetHand.filter((card) => card.id !== dodge.id); discard.push(dodge); log = addCardEvent(log, target.name, dodge, bot.name); log = addLog(log, `${target.name} plays Dodge and blocks the Strike.`); }
        else {
          target.hp = Math.max(0, (target.hp ?? 1) - 1);
          const rescue = target.hp === 0 ? targetHand.find((card) => card.kind === "Peach") : null;
          if (rescue) { targetHand = targetHand.filter((card) => card.id !== rescue.id); discard.push(rescue); target.hp = 1; log = addCardEvent(log, target.name, rescue); log = addLog(log, `${target.name} uses Peach and escapes Dying at 1 HP.`); }
          target.alive = target.hp > 0 ? 1 : 0; if (!target.alive) log = addLog(log, `${target.name} takes 1 damage and is defeated.`); else if (!rescue) log = addLog(log, `${target.name} takes 1 damage.`);
        }
        writes.push(db().prepare("UPDATE players SET hand_json = ?, hp = ?, alive = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.hp, target.alive, target.id));
      }
    }
    const handLimit = Math.max(0, bot.hp ?? 0); let discarded = 0;
    while (hand.length > handLimit) { const card = hand.shift(); if (card) { discard.push(card); log = addCardEvent(log, bot.name, card, bot.name, "discard"); discarded++; } }
    if (discarded) log = addLog(log, `${bot.name} discards ${discarded} card${discarded === 1 ? "" : "s"} to meet the hand limit.`);
    const refreshed = players.map((player) => player.id === target?.id ? target : player); const next = nextAlive(refreshed, bot.seat);
    writes.push(db().prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), bot.hp, bot.id));
    writes.push(db().prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(next, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(addLog(log, `${bot.name} completes Discard and Ending; their turn ends.`)), roomId));
    await db().batch(writes); if (target && !target.alive && await finishIfWon(roomId)) return;
  }
}

async function roomState(code: string, token?: string) {
  const db = env.DB;
  const room = await db.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first<RoomRow>();
  if (!room) return null;
  const result = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
  const players = result.results ?? [];
  const rawLog = parse<string[]>(room.log_json, []);
  const pending = parse<Pending | null>(room.pending_json, null);
  const tokenHash = token ? await hash(token) : "";
  const me = players.find((player) => player.token_hash === tokenHash);
  const turnPlayer = players.find((player) => player.seat === room.turn_seat);
  const actionPlayerId = room.phase === "response" || room.phase === "dying" ? pending?.actorId ?? pending?.targetId ?? turnPlayer?.id ?? null : turnPlayer?.id ?? null;
  const actionReason = pending?.reason ?? (room.phase === "draw" ? "Draw two cards" : room.phase?.startsWith("play") ? "Play cards or finish the Play Phase" : room.phase === "discard" ? "Discard down to the hand limit" : room.phase === "resolving" ? "Resolving the submitted action" : room.phase === "finished" ? "Match complete" : "Waiting for the next legal action");
  return {
    code: room.code, status: room.status, maxPlayers: room.max_players,
    isHost: me?.id === room.host_player_id, meId: me?.id ?? null,
    myRole: room.status !== "lobby" ? me?.role ?? null : null,
    myHeroOptions: room.status === "heroes" && me?.hero_options_json ? JSON.parse(me.hero_options_json) : [],
    turnSeat: room.turn_seat, phase: room.phase, deckCount: parse<Card[]>(room.deck_json, []).length, discardTop: parse<Card[]>(room.discard_json, []).at(-1) ?? null,
    log: rawLog.flatMap((entry, index) => { if (entry.startsWith("@card:")) return []; if (entry.startsWith("@history:")) { try { return [(JSON.parse(entry.slice(9)) as { message: string }).message]; } catch { return []; } } const event = messageEvent(entry, index); return event ? [event.message] : []; }),
    timeline: gameTimeline(rawLog), myHand: me ? parse<Card[]>(me.hand_json, []) : [], isMyTurn: me?.seat === room.turn_seat, actionPlayerId, actionReason, isMyAction: me?.id === actionPlayerId,
    pendingAttack: pending && pending.kind !== "dying" ? pending : null,
    pendingDying: pending?.kind === "dying" ? pending : null,
    players: players.map((player) => ({ id: player.id, name: player.name, seat: player.seat, hero: player.hero, hp: player.hp, maxHp: player.max_hp, alive: Boolean(player.alive), handCount: parse<Card[]>(player.hand_json, []).length, distance: me ? attackDistance(players, me.id, player.id) : null, isHost: player.id === room.host_player_id, isBot: player.name.startsWith("Test General "), role: player.role === "Lord" || room.status === "finished" || player.id === me?.id ? player.role : null })),
  };
}

export async function GET(request: Request) {
  await setup();
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") ?? "").toUpperCase();
  const token = url.searchParams.get("token") ?? "";
  const state = await roomState(code, token);
  return state ? json(state) : json({ error: "Room not found." }, 404);
}

export async function POST(request: Request) {
  await setup();
  const body = await request.json<Record<string, unknown>>().catch(() => ({}));
  const action = String(body.action ?? "");
  const name = cleanName(body.name);
  const db = env.DB;

  if (action === "create") {
    if (name.length < 2) return json({ error: "Enter a name with at least 2 characters." }, 400);
    const roomId = crypto.randomUUID(); const playerId = crypto.randomUUID(); const token = newToken(); let code = randomCode();
    for (let attempt = 0; attempt < 4; attempt++) { const exists = await db.prepare("SELECT 1 FROM rooms WHERE code = ?").bind(code).first(); if (!exists) break; code = randomCode(); }
    await db.batch([
      db.prepare("INSERT INTO rooms (id, code, host_player_id, status, max_players, created_at) VALUES (?, ?, ?, 'lobby', 8, ?)").bind(roomId, code, playerId, Date.now()),
      db.prepare("INSERT INTO players (id, room_id, name, token_hash, seat, connected_at) VALUES (?, ?, ?, ?, 0, ?)").bind(playerId, roomId, name, await hash(token), Date.now()),
    ]);
    return json({ token, room: await roomState(code, token) }, 201);
  }

  const code = String(body.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  const token = String(body.token ?? "");
  const room = await db.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first<RoomRow>();
  if (!room) return json({ error: "Room not found. Check the five-character code." }, 404);

  if (action === "join") {
    if (name.length < 2) return json({ error: "Enter a name with at least 2 characters." }, 400);
    if (room.status !== "lobby") return json({ error: "This match has already started." }, 409);
    const count = await db.prepare("SELECT COUNT(*) AS count FROM players WHERE room_id = ?").bind(room.id).first<{ count: number }>();
    if ((count?.count ?? 0) >= room.max_players) return json({ error: "This room is full." }, 409);
    const used = await db.prepare("SELECT seat FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<{ seat: number }>();
    const seats = new Set((used.results ?? []).map((row) => row.seat)); let seat = 0; while (seats.has(seat)) seat++;
    const playerId = crypto.randomUUID(); const playerToken = newToken();
    await db.prepare("INSERT INTO players (id, room_id, name, token_hash, seat, connected_at) VALUES (?, ?, ?, ?, ?, ?)").bind(playerId, room.id, name, await hash(playerToken), seat, Date.now()).run();
    return json({ token: playerToken, room: await roomState(code, playerToken) }, 201);
  }

  const tokenHash = await hash(token);
  const me = await db.prepare("SELECT * FROM players WHERE room_id = ? AND token_hash = ?").bind(room.id, tokenHash).first<PlayerRow>();

  if (action === "add_test_players") {
    if (!me || me.id !== room.host_player_id) return json({ error: "Only the host can add test players." }, 403);
    if (room.status !== "lobby") return json({ error: "Test players can only be added before the match starts." }, 409);
    const result = await db.prepare("SELECT seat FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<{ seat: number }>();
    const seats = new Set((result.results ?? []).map((row) => row.seat));
    const needed = Math.max(0, 4 - seats.size);
    const inserts = [];
    for (let index = 0; index < needed; index++) {
      let seat = 0; while (seats.has(seat)) seat++; seats.add(seat);
      inserts.push(db.prepare("INSERT INTO players (id, room_id, name, token_hash, seat, connected_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), room.id, `Test General ${index + 1}`, await hash(newToken()), seat, Date.now()));
    }
    if (inserts.length) await db.batch(inserts);
    return json({ room: await roomState(code, token) });
  }

  if (action === "start") {
    if (!me || me.id !== room.host_player_id) return json({ error: "Only the host can start the match." }, 403);
    const result = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    const players = result.results ?? [];
    if (players.length < 4) return json({ error: "Classic mode needs at least 4 players." }, 409);
    const roleSets: Record<number, string[]> = { 4: ["Lord", "Loyalist", "Rebel", "Renegade"], 5: ["Lord", "Loyalist", "Rebel", "Rebel", "Renegade"], 6: ["Lord", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"], 7: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"], 8: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"] };
    const roles = [...roleSets[players.length]].sort(() => Math.random() - 0.5);
    const lordIndex = players.findIndex((player) => player.id === room.host_player_id); const lordAt = roles.indexOf("Lord");
    [roles[lordAt], roles[lordIndex]] = [roles[lordIndex], roles[lordAt]];
    const rulers = HEROES.filter((hero) => ["cao-cao", "liu-bei", "sun-quan"].includes(hero.id));
    const shuffledHeroes = HEROES.filter((hero) => !rulers.some((ruler) => ruler.id === hero.id)).sort(() => Math.random() - 0.5);
    let heroCursor = 0;
    await db.batch([
      ...players.map((player, index) => {
        const options = roles[index] === "Lord" ? [...rulers, ...Array.from({ length: 2 }, () => shuffledHeroes[heroCursor++ % shuffledHeroes.length])] : Array.from({ length: 3 }, () => shuffledHeroes[heroCursor++ % shuffledHeroes.length]);
        const botHero = player.name.startsWith("Test General ") ? options[0] : null;
        const hp = botHero ? botHero.hp + (roles[index] === "Lord" ? 1 : 0) : null;
        return db.prepare("UPDATE players SET role = ?, hero = ?, hp = ?, max_hp = ?, hero_options_json = ? WHERE id = ?").bind(roles[index], botHero?.id ?? null, hp, hp, JSON.stringify(options), player.id);
      }),
      db.prepare("UPDATE rooms SET status = 'heroes' WHERE id = ?").bind(room.id),
    ]);
    return json({ room: await roomState(code, token) });
  }

  if (action === "choose_hero") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    if (room.status !== "heroes") return json({ error: "Hero selection is not active." }, 409);
    if (me.hero) return json({ error: "Your hero is already locked in." }, 409);
    const heroId = String(body.heroId ?? "");
    const options = me.hero_options_json ? JSON.parse(me.hero_options_json) as Hero[] : [];
    const hero = options.find((item) => item.id === heroId);
    if (!hero) return json({ error: "That hero is not one of your choices." }, 400);
    const taken = await db.prepare("SELECT 1 FROM players WHERE room_id = ? AND hero = ?").bind(room.id, hero.id).first();
    if (taken) return json({ error: "That hero was just selected. Choose another." }, 409);
    const hp = hero.hp + (me.role === "Lord" ? 1 : 0);
    await db.prepare("UPDATE players SET hero = ?, hp = ?, max_hp = ? WHERE id = ?").bind(hero.id, hp, hp, me.id).run();
    const remaining = await db.prepare("SELECT COUNT(*) AS count FROM players WHERE room_id = ? AND hero IS NULL").bind(room.id).first<{ count: number }>();
    if ((remaining?.count ?? 0) === 0) {
      const ready = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      await beginMatch(room.id, ready.results ?? []);
      await runBots(room.id);
    }
    return json({ room: await roomState(code, token) });
  }

  if (["respond_dodge", "take_damage"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || !pending || (pending.actorId ?? pending.targetId) !== me.id) return json({ error: "You are not the acting player for this Strike response." }, 409);
    let hand = parse<Card[]>(me.hand_json, []); let discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []); const source = await db.prepare("SELECT * FROM players WHERE id = ?").bind(pending.sourceId).first<PlayerRow>();
    const selectedDodge = action === "respond_dodge" ? hand.find((card) => card.id === String(body.cardId ?? "") && card.kind === "Dodge") : null;
    if (action === "respond_dodge" && !selectedDodge) return json({ error: "Select a Dodge card from your hand first." }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run(); if ((claim.meta.changes ?? 0) !== 1) return json({ error: "That Strike response has already been resolved." }, 409);
    if (action === "respond_dodge") {
      const dodge = selectedDodge as Card;
      hand = hand.filter((card) => card.id !== dodge.id); discard.push(dodge); log = addCardEvent(log, me.name, dodge, source?.name ?? "Strike"); log = addLog(log, `${me.name} plays Dodge and blocks the Strike. Action returns to ${source?.name ?? "the turn owner"}.`);
      await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = 'play-struck', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), room.id)]);
    } else {
      const hp = Math.max(0, (me.hp ?? 1) - 1);
      if (hp === 0) {
        log = addLog(log, `${me.name} takes 1 damage and enters Dying. Action stays with ${me.name} for Dying rescue.`);
        await db.batch([db.prepare("UPDATE players SET hp = 0, alive = 1 WHERE id = ?").bind(me.id), db.prepare("UPDATE rooms SET phase = 'dying', pending_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify({ kind: "dying", sourceId: pending.sourceId, targetId: me.id, actorId: me.id, reason: "Dying rescue: use Peach or accept defeat" }), JSON.stringify(log), room.id)]);
        return json({ room: await roomState(code, token) });
      }
      log = addLog(log, `${me.name} takes 1 damage. Action returns to ${source?.name ?? "the turn owner"}.`);
      await db.batch([db.prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, me.id), db.prepare("UPDATE rooms SET phase = 'play-struck', pending_json = NULL, log_json = ? WHERE id = ?").bind(JSON.stringify(log), room.id)]);
    }
    if (source?.name.startsWith("Test General ")) {
      let sourceHand = parse<Card[]>(source.hand_json, []); const sourceLimit = Math.max(0, source.hp ?? 0); let sourceDiscarded = 0;
      while (sourceHand.length > sourceLimit) { const card = sourceHand.shift(); if (card) { discard.push(card); log = addCardEvent(log, source.name, card, source.name, "discard"); sourceDiscarded++; } }
      if (sourceDiscarded) log = addLog(log, `${source.name} discards ${sourceDiscarded} card${sourceDiscarded === 1 ? "" : "s"} to meet the hand limit.`);
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const next = nextAlive(rows.results ?? [], source.seat);
      await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), source.id), db.prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', discard_json = ?, log_json = ? WHERE id = ?").bind(next, JSON.stringify(discard), JSON.stringify(addLog(log, `${source.name} completes Discard and Ending; their turn ends.`)), room.id)]); await runBots(room.id);
    }
    return json({ room: await roomState(code, token) });
  }

  if (["rescue_self", "accept_defeat"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "dying" || pending?.kind !== "dying" || (pending.actorId ?? pending.targetId) !== me.id) return json({ error: "You are not the acting player for this Dying rescue." }, 409);
    let hand = parse<Card[]>(me.hand_json, []); let discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []); const source = await db.prepare("SELECT * FROM players WHERE id = ?").bind(pending.sourceId).first<PlayerRow>();
    const peach = action === "rescue_self" ? hand.find((card) => card.kind === "Peach") : null;
    if (action === "rescue_self" && !peach) return json({ error: "You do not have a Peach to rescue yourself." }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'dying'").bind(room.id).run(); if ((claim.meta.changes ?? 0) !== 1) return json({ error: "The Dying rescue has already been resolved." }, 409);
    let alive = 0; let hp = 0;
    if (peach) { hand = hand.filter((card) => card.id !== peach.id); discard.push(peach); alive = 1; hp = 1; log = addCardEvent(log, me.name, peach); log = addLog(log, `${me.name} uses Peach and escapes Dying at 1 HP.`); }
    else log = addLog(log, `${me.name} cannot rescue themselves and is defeated.`);
    await db.batch([db.prepare("UPDATE players SET hand_json = ?, hp = ?, alive = ? WHERE id = ?").bind(JSON.stringify(hand), hp, alive, me.id), db.prepare("UPDATE rooms SET phase = 'play-struck', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), room.id)]);
    if (!alive && await finishIfWon(room.id)) return json({ room: await roomState(code, token) });
    if (source?.name.startsWith("Test General ")) {
      const freshSource = await db.prepare("SELECT * FROM players WHERE id = ?").bind(source.id).first<PlayerRow>(); let sourceHand = parse<Card[]>(freshSource?.hand_json ?? null, []); const sourceLimit = Math.max(0, freshSource?.hp ?? 0); let sourceDiscarded = 0;
      while (sourceHand.length > sourceLimit) { const card = sourceHand.shift(); if (card) { discard.push(card); log = addCardEvent(log, source.name, card, source.name, "discard"); sourceDiscarded++; } }
      if (sourceDiscarded) log = addLog(log, `${source.name} discards ${sourceDiscarded} card${sourceDiscarded === 1 ? "" : "s"} to meet the hand limit.`);
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const next = nextAlive(rows.results ?? [], source.seat); log = addLog(log, `${source.name} completes Discard and Ending; their turn ends.`);
      await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), source.id), db.prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', discard_json = ?, log_json = ? WHERE id = ?").bind(next, JSON.stringify(discard), JSON.stringify(log), room.id)]); await runBots(room.id);
    }
    return json({ room: await roomState(code, token) });
  }

  if (["draw", "play_card", "end_turn"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    if (!liveRoom || liveRoom.status !== "playing") return json({ error: "The match is not currently playing." }, 409);
    if (liveRoom.turn_seat !== me.seat || !me.alive) return json({ error: "Wait for your turn." }, 409);
    let deck = parse<Card[]>(liveRoom.deck_json, []); let discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []); let hand = parse<Card[]>(me.hand_json, []); let drawnCards: Card[] = [];

    if (action === "draw") {
      if (liveRoom.phase !== "draw") return json({ error: "You have already drawn this turn." }, 409);
      if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
      const draw = drawCards(deck, discard, 2, log); deck = draw.deck; discard = draw.discard; log = addHistory(draw.log, `${me.name} draws ${draw.drawn.length === 2 ? "two cards" : `${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"}`}.`); hand.push(...draw.drawn);
      drawnCards = draw.drawn;
      await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = 'play', deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id)]);
    } else if (action === "play_card") {
      if (!liveRoom.phase?.startsWith("play")) return json({ error: "Draw before playing a card." }, 409);
      const card = hand.find((item) => item.id === String(body.cardId ?? ""));
      if (!card) return json({ error: "That card is not in your hand." }, 400);
      if (card.kind === "Dodge") return json({ error: "Dodge is played automatically when you are struck." }, 400);
      if (card.kind === "Peach") {
        if ((me.hp ?? 0) >= (me.max_hp ?? 0)) return json({ error: "You are already at full health." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card); log = addLog(log, `${me.name} plays Peach and recovers 1 HP.`);
        await db.batch([db.prepare("UPDATE players SET hand_json = ?, hp = hp + 1 WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(liveRoom.phase, JSON.stringify(discard), JSON.stringify(log), room.id)]);
      } else {
        if (liveRoom.phase === "play-struck") return json({ error: "You may play only one Strike per turn." }, 409);
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent as the target." }, 400);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); if (attackDistance(rows.results ?? [], me.id, target.id) > 1) return json({ error: "That opponent is out of range. Without a weapon, Strike distance is 1." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name);
        if (target.name.startsWith("Test General ")) {
          let targetHand = parse<Card[]>(target.hand_json, []); const dodge = targetHand.find((item) => item.kind === "Dodge");
          if (dodge) { targetHand = targetHand.filter((item) => item.id !== dodge.id); discard.push(dodge); log = addCardEvent(log, target.name, dodge, me.name); log = addLog(log, `${target.name} plays Dodge and blocks the Strike.`); }
          else {
            target.hp = Math.max(0, (target.hp ?? 1) - 1); const rescue = target.hp === 0 ? targetHand.find((item) => item.kind === "Peach") : null;
            if (rescue) { targetHand = targetHand.filter((item) => item.id !== rescue.id); discard.push(rescue); target.hp = 1; log = addCardEvent(log, target.name, rescue); log = addLog(log, `${target.name} uses Peach and escapes Dying at 1 HP.`); }
            target.alive = target.hp > 0 ? 1 : 0; if (!target.alive) log = addLog(log, `${target.name} takes 1 damage and is defeated.`); else if (!rescue) log = addLog(log, `${target.name} takes 1 damage.`);
          }
          await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE players SET hand_json = ?, hp = ?, alive = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.hp, target.alive, target.id), db.prepare("UPDATE rooms SET phase = 'play-struck', discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), room.id)]);
          if (!target.alive && await finishIfWon(room.id)) return json({ room: await roomState(code, token) });
        } else {
          const targetHand = parse<Card[]>(target.hand_json, []);
          if (targetHand.some((item) => item.kind === "Dodge")) {
            log = addLog(log, `${me.name} plays Strike on ${target.name}. Action passes from ${me.name} to ${target.name} for Dodge response.`);
            await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify({ kind: "attack", sourceId: me.id, targetId: target.id, actorId: target.id, reason: "Respond to Strike: select Dodge or take 1 damage" }), JSON.stringify(discard), JSON.stringify(log), room.id)]);
          } else {
            const hp = Math.max(0, (target.hp ?? 1) - 1); log = addLog(log, `${target.name} has no Dodge and automatically takes 1 damage.${hp > 0 ? ` Action returns to ${me.name}.` : ` Action passes to ${target.name} for Dying rescue.`}`);
            if (hp === 0) await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE players SET hp = 0, alive = 1 WHERE id = ?").bind(target.id), db.prepare("UPDATE rooms SET phase = 'dying', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify({ kind: "dying", sourceId: me.id, targetId: target.id, actorId: target.id, reason: "Dying rescue: use Peach or accept defeat" }), JSON.stringify(discard), JSON.stringify(log), room.id)]);
            else await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id), db.prepare("UPDATE rooms SET phase = 'play-struck', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), room.id)]);
          }
        }
      }
    } else {
      if (!liveRoom.phase?.startsWith("play")) return json({ error: "Only the active player can finish the Play Phase." }, 409);
      if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
      if (hand.length > Math.max(0, me.hp ?? 0)) {
        await db.prepare("UPDATE rooms SET phase = 'discard', log_json = ? WHERE id = ?").bind(JSON.stringify(addLog(log, `${me.name} finishes Play and enters Discard. Keep at most ${me.hp ?? 0} cards.`)), room.id).run();
      } else {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const next = nextAlive(rows.results ?? [], me.seat);
        await db.prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', log_json = ? WHERE id = ?").bind(next, JSON.stringify(addLog(log, `${me.name} finishes Play; Ending passes and their turn ends.`)), room.id).run(); await runBots(room.id);
      }
    }
    return json({ room: await roomState(code, token), ...(drawnCards.length ? { drawnCards } : {}) });
  }

  if (action === "discard_cards") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); if (!liveRoom || liveRoom.status !== "playing" || liveRoom.turn_seat !== me.seat || liveRoom.phase !== "discard") return json({ error: "You are not in the discard phase." }, 409);
    let hand = parse<Card[]>(me.hand_json, []); const required = Math.max(0, hand.length - (me.hp ?? 0)); const requested = Array.isArray(body.cardIds) ? [...new Set(body.cardIds.map(String))] : [];
    if (requested.length !== required) return json({ error: `Choose exactly ${required} card${required === 1 ? "" : "s"} to discard.` }, 400);
    const selectedCards = requested.map((id) => hand.find((card) => card.id === id)).filter((card): card is Card => Boolean(card)); if (selectedCards.length !== required) return json({ error: "One of those cards is no longer in your hand." }, 409);
    if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
    const selectedIds = new Set(requested); hand = hand.filter((card) => !selectedIds.has(card.id)); const discard = [...parse<Card[]>(liveRoom.discard_json, []), ...selectedCards]; let log = parse<string[]>(liveRoom.log_json, []); selectedCards.forEach((card) => { log = addCardEvent(log, me.name, card, me.name, "discard"); }); log = addLog(log, `${me.name} discards ${selectedCards.length} selected card${selectedCards.length === 1 ? "" : "s"}.`);
    const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const next = nextAlive(rows.results ?? [], me.seat); log = addLog(log, `${me.name} completes Discard; Ending passes and their turn ends.`); await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', discard_json = ?, log_json = ? WHERE id = ?").bind(next, JSON.stringify(discard), JSON.stringify(log), room.id)]); await runBots(room.id);
    return json({ room: await roomState(code, token) });
  }

  return json({ error: "Unknown action." }, 400);
}
