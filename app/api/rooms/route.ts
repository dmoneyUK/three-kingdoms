import { env } from "cloudflare:workers";

export const runtime = "edge";

type RoomRow = { id: string; code: string; host_player_id: string; status: string; max_players: number; created_at: number };
type Hero = { id: string; name: string; faction: string; hp: number; ability: string };
type PlayerRow = { id: string; room_id: string; name: string; token_hash: string; seat: number; role: string | null; hero: string | null; hp: number | null; max_hp: number | null; hero_options_json: string | null; connected_at: number };

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
    players: players.map((player) => ({ id: player.id, name: player.name, seat: player.seat, hero: player.hero, hp: player.hp, maxHp: player.max_hp, isHost: player.id === room.host_player_id, isBot: player.name.startsWith("Test General "), role: room.status === "finished" || player.id === me?.id ? player.role : null })),
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
    if ((remaining?.count ?? 0) === 0) await db.prepare("UPDATE rooms SET status = 'started' WHERE id = ?").bind(room.id).run();
    return json({ room: await roomState(code, token) });
  }

  return json({ error: "Unknown action." }, 400);
}
