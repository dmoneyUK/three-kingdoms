import { env } from "cloudflare:workers";

export const runtime = "edge";

type RoomRow = { id: string; code: string; host_player_id: string; status: string; max_players: number; created_at: number };
type PlayerRow = { id: string; room_id: string; name: string; token_hash: string; seat: number; role: string | null; hero: string | null; hp: number | null; connected_at: number };

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function setup() {
  const db = env.DB;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, host_player_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'lobby', max_players INTEGER NOT NULL DEFAULT 8, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, room_id TEXT NOT NULL, name TEXT NOT NULL, token_hash TEXT NOT NULL, seat INTEGER NOT NULL, role TEXT, hero TEXT, hp INTEGER, connected_at INTEGER NOT NULL, UNIQUE(room_id, seat))"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id)"),
  ]);
}

function cleanName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 20);
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

function newToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hash(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
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
    code: room.code,
    status: room.status,
    maxPlayers: room.max_players,
    isHost: me?.id === room.host_player_id,
    meId: me?.id ?? null,
    myRole: room.status === "started" ? me?.role ?? null : null,
    players: players.map((player) => ({ id: player.id, name: player.name, seat: player.seat, hero: player.hero, hp: player.hp, isHost: player.id === room.host_player_id, role: room.status === "finished" || player.id === me?.id ? player.role : null })),
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
    const roomId = crypto.randomUUID();
    const playerId = crypto.randomUUID();
    const token = newToken();
    let code = randomCode();
    for (let attempt = 0; attempt < 4; attempt++) {
      const exists = await db.prepare("SELECT 1 FROM rooms WHERE code = ?").bind(code).first();
      if (!exists) break;
      code = randomCode();
    }
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
    const seats = new Set((used.results ?? []).map((row) => row.seat));
    let seat = 0; while (seats.has(seat)) seat++;
    const playerId = crypto.randomUUID();
    const playerToken = newToken();
    await db.prepare("INSERT INTO players (id, room_id, name, token_hash, seat, connected_at) VALUES (?, ?, ?, ?, ?, ?)").bind(playerId, room.id, name, await hash(playerToken), seat, Date.now()).run();
    return json({ token: playerToken, room: await roomState(code, playerToken) }, 201);
  }

  if (action === "start") {
    const tokenHash = await hash(token);
    const me = await db.prepare("SELECT * FROM players WHERE room_id = ? AND token_hash = ?").bind(room.id, tokenHash).first<PlayerRow>();
    if (!me || me.id !== room.host_player_id) return json({ error: "Only the host can start the match." }, 403);
    const result = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    const players = result.results ?? [];
    if (players.length < 4) return json({ error: "Classic mode needs at least 4 players." }, 409);
    const roleSets: Record<number, string[]> = {
      4: ["Lord", "Loyalist", "Rebel", "Renegade"],
      5: ["Lord", "Loyalist", "Rebel", "Rebel", "Renegade"],
      6: ["Lord", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"],
      7: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"],
      8: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"],
    };
    const roles = [...roleSets[players.length]].sort(() => Math.random() - 0.5);
    const lordIndex = players.findIndex((player) => player.id === room.host_player_id);
    const lordAt = roles.indexOf("Lord");
    [roles[lordAt], roles[lordIndex]] = [roles[lordIndex], roles[lordAt]];
    await db.batch([
      ...players.map((player, index) => db.prepare("UPDATE players SET role = ?, hp = ? WHERE id = ?").bind(roles[index], roles[index] === "Lord" && players.length >= 5 ? 5 : 4, player.id)),
      db.prepare("UPDATE rooms SET status = 'started' WHERE id = ?").bind(room.id),
    ]);
    return json({ room: await roomState(code, token) });
  }

  return json({ error: "Unknown action." }, 400);
}
