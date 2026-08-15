import { env } from "cloudflare:workers";

export const runtime = "edge";

type Card = { id: string; kind: "Strike" | "Dodge" | "Peach"; suit: "♥" | "♦" | "♣" | "♠"; rank: string };
type Pending = { sourceId: string; targetId: string };
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
function addLog(log: string[], message: string) { return [...log.slice(-11), message]; }
function nextAlive(players: PlayerRow[], seat: number) { const alive = players.filter((player) => player.alive).sort((a, b) => a.seat - b.seat); return alive.find((player) => player.seat > seat)?.seat ?? alive[0]?.seat ?? seat; }
function attackDistance(players: PlayerRow[], sourceId: string, targetId: string) { const alive = players.filter((player) => player.alive).sort((a, b) => a.seat - b.seat); const from = alive.findIndex((player) => player.id === sourceId); const to = alive.findIndex((player) => player.id === targetId); if (from < 0 || to < 0) return 99; const clockwise = (to - from + alive.length) % alive.length; return Math.min(clockwise, alive.length - clockwise); }
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
    if (!room || room.status !== "playing" || room.phase === "response" || !bot?.name.startsWith("Test General ")) return;
    let deck = parse<Card[]>(room.deck_json, []); let discard = parse<Card[]>(room.discard_json, []); let log = parse<string[]>(room.log_json, []); let hand = parse<Card[]>(bot.hand_json, []);
    if (room.phase === "draw") { hand.push(...deck.splice(0, 2)); log = addLog(log, `${bot.name} draws two cards.`); }
    while ((bot.hp ?? 0) < (bot.max_hp ?? 0)) {
      const peach = hand.find((card) => card.kind === "Peach"); if (!peach) break;
      hand = hand.filter((card) => card.id !== peach.id); discard.push(peach); bot.hp = (bot.hp ?? 0) + 1; log = addLog(log, `${bot.name} plays Peach and recovers 1 HP.`);
    }
    const strike = hand.find((card) => card.kind === "Strike");
    const targets = players.filter((player) => player.alive && player.id !== bot.id && attackDistance(players, bot.id, player.id) === 1).sort((a, b) => (a.hp ?? 99) - (b.hp ?? 99));
    const target = targets[0];
    const writes = [];
    if (strike && target) {
      hand = hand.filter((card) => card.id !== strike.id); discard.push(strike); log = addLog(log, `${bot.name} plays Strike on ${target.name}.`);
      if (!target.name.startsWith("Test General ")) {
        writes.push(db().prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), bot.hp, bot.id));
        writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify({ sourceId: bot.id, targetId: target.id }), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId));
        await db().batch(writes); return;
      }
      let targetHand = parse<Card[]>(target.hand_json, []); const dodge = targetHand.find((card) => card.kind === "Dodge");
      if (dodge) { targetHand = targetHand.filter((card) => card.id !== dodge.id); discard.push(dodge); log = addLog(log, `${target.name} plays Dodge and blocks the Strike.`); }
      else { target.hp = Math.max(0, (target.hp ?? 1) - 1); target.alive = target.hp > 0 ? 1 : 0; log = addLog(log, `${target.name} takes 1 damage${target.alive ? "." : " and is defeated."}`); }
      writes.push(db().prepare("UPDATE players SET hand_json = ?, hp = ?, alive = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.hp, target.alive, target.id));
    }
    const refreshed = players.map((player) => player.id === target?.id ? target : player); const next = nextAlive(refreshed, bot.seat);
    writes.push(db().prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), bot.hp, bot.id));
    writes.push(db().prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(next, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(addLog(log, `${bot.name} ends their turn.`)), roomId));
    await db().batch(writes); if (target && !target.alive && await finishIfWon(roomId)) return;
  }
}

async function roomState(code: string, token?: string) {
  const db = env.DB;
  const room = await db.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first<RoomRow>();
  if (!room) return null;
  const result = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
  const players = result.results ?? [];
  const tokenHash = token ? await hash(token) : "";
  const me = players.find((player) => player.token_hash === tokenHash);
  return {
    code: room.code, status: room.status, maxPlayers: room.max_players,
    isHost: me?.id === room.host_player_id, meId: me?.id ?? null,
    myRole: room.status !== "lobby" ? me?.role ?? null : null,
    myHeroOptions: room.status === "heroes" && me?.hero_options_json ? JSON.parse(me.hero_options_json) : [],
    turnSeat: room.turn_seat, phase: room.phase, deckCount: parse<Card[]>(room.deck_json, []).length, discardTop: parse<Card[]>(room.discard_json, []).at(-1) ?? null, log: parse<string[]>(room.log_json, []), myHand: me ? parse<Card[]>(me.hand_json, []) : [], isMyTurn: me?.seat === room.turn_seat,
    pendingAttack: parse<Pending | null>(room.pending_json, null),
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
    const shuffledHeroes = [...HEROES].sort(() => Math.random() - 0.5);
    let heroCursor = 0;
    await db.batch([
      ...players.map((player, index) => {
        const choiceCount = roles[index] === "Lord" ? 5 : 3;
        const options = Array.from({ length: choiceCount }, () => shuffledHeroes[heroCursor++ % shuffledHeroes.length]);
        const botHero = player.name.startsWith("Test General ") ? options[0] : null;
        const hp = botHero ? botHero.hp + (roles[index] === "Lord" && players.length >= 5 ? 1 : 0) : null;
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
    const hp = hero.hp + (me.role === "Lord" && (await db.prepare("SELECT COUNT(*) AS count FROM players WHERE room_id = ?").bind(room.id).first<{ count: number }>())!.count >= 5 ? 1 : 0);
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
    if (!liveRoom || liveRoom.phase !== "response" || !pending || pending.targetId !== me.id) return json({ error: "There is no Strike for you to answer." }, 409);
    let hand = parse<Card[]>(me.hand_json, []); let discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []); const source = await db.prepare("SELECT * FROM players WHERE id = ?").bind(pending.sourceId).first<PlayerRow>();
    if (action === "respond_dodge") {
      const dodge = hand.find((card) => card.kind === "Dodge"); if (!dodge) return json({ error: "You do not have a Dodge card." }, 409);
      hand = hand.filter((card) => card.id !== dodge.id); discard.push(dodge); log = addLog(log, `${me.name} plays Dodge and blocks the Strike.`);
      await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = 'play-struck', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), room.id)]);
    } else {
      const hp = Math.max(0, (me.hp ?? 1) - 1); const alive = hp > 0 ? 1 : 0; log = addLog(log, `${me.name} takes 1 damage${alive ? "." : " and is defeated."}`);
      await db.batch([db.prepare("UPDATE players SET hp = ?, alive = ? WHERE id = ?").bind(hp, alive, me.id), db.prepare("UPDATE rooms SET phase = 'play-struck', pending_json = NULL, log_json = ? WHERE id = ?").bind(JSON.stringify(log), room.id)]);
      if (!alive && await finishIfWon(room.id)) return json({ room: await roomState(code, token) });
    }
    if (source?.name.startsWith("Test General ")) {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const next = nextAlive(rows.results ?? [], source.seat);
      await db.prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', log_json = ? WHERE id = ?").bind(next, JSON.stringify(addLog(log, `${source.name} ends their turn.`)), room.id).run(); await runBots(room.id);
    }
    return json({ room: await roomState(code, token) });
  }

  if (["draw", "play_card", "end_turn"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    if (!liveRoom || liveRoom.status !== "playing") return json({ error: "The match is not currently playing." }, 409);
    if (liveRoom.turn_seat !== me.seat || !me.alive) return json({ error: "Wait for your turn." }, 409);
    let deck = parse<Card[]>(liveRoom.deck_json, []); let discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []); let hand = parse<Card[]>(me.hand_json, []);

    if (action === "draw") {
      if (liveRoom.phase !== "draw") return json({ error: "You have already drawn this turn." }, 409);
      hand.push(...deck.splice(0, 2)); log = addLog(log, `${me.name} draws two cards.`);
      await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = 'play', deck_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(deck), JSON.stringify(log), room.id)]);
    } else if (action === "play_card") {
      if (!liveRoom.phase?.startsWith("play")) return json({ error: "Draw before playing a card." }, 409);
      const card = hand.find((item) => item.id === String(body.cardId ?? ""));
      if (!card) return json({ error: "That card is not in your hand." }, 400);
      if (card.kind === "Dodge") return json({ error: "Dodge is played automatically when you are struck." }, 400);
      if (card.kind === "Peach") {
        if ((me.hp ?? 0) >= (me.max_hp ?? 0)) return json({ error: "You are already at full health." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addLog(log, `${me.name} plays Peach and recovers 1 HP.`);
        await db.batch([db.prepare("UPDATE players SET hand_json = ?, hp = hp + 1 WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), room.id)]);
      } else {
        if (liveRoom.phase === "play-struck" && me.hero !== "zhang-fei") return json({ error: "You may normally play only one Strike per turn." }, 409);
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent as the target." }, 400);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); if (attackDistance(rows.results ?? [], me.id, target.id) > 1) return json({ error: "That opponent is out of range. Without a weapon, Strike distance is 1." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addLog(log, `${me.name} plays Strike on ${target.name}. Waiting for Dodge.`);
        if (target.name.startsWith("Test General ")) {
          let targetHand = parse<Card[]>(target.hand_json, []); const dodge = targetHand.find((item) => item.kind === "Dodge");
          if (dodge) { targetHand = targetHand.filter((item) => item.id !== dodge.id); discard.push(dodge); log = addLog(log, `${target.name} plays Dodge and blocks the Strike.`); }
          else { target.hp = Math.max(0, (target.hp ?? 1) - 1); target.alive = target.hp > 0 ? 1 : 0; log = addLog(log, `${target.name} takes 1 damage${target.alive ? "." : " and is defeated."}`); }
          await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE players SET hand_json = ?, hp = ?, alive = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.hp, target.alive, target.id), db.prepare("UPDATE rooms SET phase = 'play-struck', discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), room.id)]);
          if (!target.alive && await finishIfWon(room.id)) return json({ room: await roomState(code, token) });
        } else await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify({ sourceId: me.id, targetId: target.id }), JSON.stringify(discard), JSON.stringify(log), room.id)]);
      }
    } else {
      if (!liveRoom.phase?.startsWith("play")) return json({ error: "Draw before ending your turn." }, 409);
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const next = nextAlive(rows.results ?? [], me.seat);
      await db.prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', log_json = ? WHERE id = ?").bind(next, JSON.stringify(addLog(log, `${me.name} ends their turn.`)), room.id).run();
      await runBots(room.id);
    }
    return json({ room: await roomState(code, token) });
  }

  return json({ error: "Unknown action." }, 400);
}
