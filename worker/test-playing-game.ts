import { makeDeck } from "../game/cards";
import { STANDARD_HEROES } from "../game/heroes";
import { CARD_KINDS, type Card, type CardKind, type CardSuit, type EquipmentZone, type GamePhase } from "../game/model";

type SeedPlayer = {
  name?: string;
  role?: "Lord" | "Loyalist" | "Rebel" | "Renegade";
  hero?: string;
  hp?: number;
  maxHp?: number;
  hand?: Card[];
  equipment?: EquipmentZone;
  judgement?: Card[];
};

export type SeedPlayingGameInput = {
  players?: SeedPlayer[];
  turnSeat?: number;
  phase?: Extract<GamePhase, "draw" | "play" | "discard">;
  deck?: Card[];
  discard?: Card[];
};

type FixturePlayer = Required<Pick<SeedPlayer, "name" | "role" | "hero" | "hp" | "maxHp" | "hand" | "equipment" | "judgement">>;

const DEFAULT_ROLES: SeedPlayer["role"][] = ["Lord", "Loyalist", "Rebel", "Renegade"];
const DEFAULT_HEROES = ["guan-yu", "simayi", "zhao-yun", "xiahou-dun"];
const SUITS = new Set<CardSuit>(["♥", "♦", "♣", "♠"]);
const RANKS = new Set(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]);
const KINDS = new Set<string>(CARD_KINDS);

function fixtureError(message: string): never {
  throw new Error(message);
}

function validCard(value: unknown, label: string): Card {
  if (!value || typeof value !== "object") fixtureError(`${label} must be a card object.`);
  const card = value as Partial<Card>;
  if (typeof card.id !== "string" || !card.id) fixtureError(`${label}.id is required.`);
  if (typeof card.kind !== "string" || !KINDS.has(card.kind)) fixtureError(`${label}.kind is not a Standard card kind.`);
  if (typeof card.suit !== "string" || !SUITS.has(card.suit as CardSuit)) fixtureError(`${label}.suit is invalid.`);
  if (typeof card.rank !== "string" || !RANKS.has(card.rank)) fixtureError(`${label}.rank is invalid.`);
  return { id: card.id, kind: card.kind as CardKind, suit: card.suit as CardSuit, rank: card.rank as Card["rank"] };
}

function validCards(value: unknown, label: string): Card[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fixtureError(`${label} must be an array.`);
  return value.map((card, index) => validCard(card, `${label}[${index}]`));
}

function validEquipment(value: unknown, label: string): EquipmentZone {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) fixtureError(`${label} must be an equipment object.`);
  const input = value as Record<string, unknown>;
  const equipment: EquipmentZone = {};
  for (const slot of ["weapon", "armor", "offensiveHorse", "defensiveHorse"] as const) {
    if (input[slot] !== undefined) equipment[slot] = validCard(input[slot], `${label}.${slot}`);
  }
  return equipment;
}

function normalizePlayer(input: SeedPlayer | undefined, index: number): FixturePlayer {
  const hero = input?.hero ?? DEFAULT_HEROES[index];
  const definition = STANDARD_HEROES.find((candidate) => candidate.id === hero);
  if (!definition) fixtureError(`players[${index}].hero must be a Standard hero.`);
  const role = input?.role ?? DEFAULT_ROLES[index];
  if (!role) fixtureError(`players[${index}].role is invalid.`);
  const maxHp = input?.maxHp ?? definition.hp + (role === "Lord" ? 1 : 0);
  const hp = input?.hp ?? maxHp;
  if (!Number.isInteger(maxHp) || maxHp < 0 || !Number.isInteger(hp) || hp < 0 || hp > maxHp) fixtureError(`players[${index}] HP is invalid.`);
  return {
    name: input?.name?.trim() || `Fixture Player ${index + 1}`,
    role,
    hero,
    hp,
    maxHp,
    hand: validCards(input?.hand, `players[${index}].hand`),
    equipment: validEquipment(input?.equipment, `players[${index}].equipment`),
    judgement: validCards(input?.judgement, `players[${index}].judgement`),
  };
}

function uniqueCards(players: FixturePlayer[], deck: Card[], discard: Card[]) {
  const all = [
    ...players.flatMap((player) => [...player.hand, ...Object.values(player.equipment), ...player.judgement]),
    ...deck,
    ...discard,
  ];
  const ids = new Set<string>();
  for (const card of all) {
    if (ids.has(card.id)) fixtureError(`Card ${card.id} appears in more than one fixture zone.`);
    ids.add(card.id);
  }
}

function token() {
  return crypto.randomUUID().replaceAll("-", "");
}

async function tokenHash(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function roomCode() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase();
}

export async function seedPlayingGame(db: D1Database, input: SeedPlayingGameInput = {}) {
  const players = (input.players ?? DEFAULT_HEROES.map((hero, index) => ({ hero, role: DEFAULT_ROLES[index] }))).map(normalizePlayer);
  if (players.length !== 4) fixtureError("seedPlayingGame requires exactly four players.");
  if (new Set(players.map((player) => player.role)).size !== 4) fixtureError("seedPlayingGame requires one of each four-player role.");
  const turnSeat = input.turnSeat ?? 0;
  if (!Number.isInteger(turnSeat) || turnSeat < 0 || turnSeat >= players.length) fixtureError("turnSeat must identify one fixture player.");
  const phase = input.phase ?? "play";
  const deck = input.deck === undefined ? makeDeck() : validCards(input.deck, "deck");
  const discard = validCards(input.discard, "discard");
  uniqueCards(players, deck, discard);

  const roomId = crypto.randomUUID();
  const code = roomCode();
  const createdAt = Date.now();
  const credentials = await Promise.all(players.map(async (player) => {
    const playerId = crypto.randomUUID();
    const playerToken = token();
    return { ...player, id: playerId, token: playerToken, tokenHash: await tokenHash(playerToken), seat: players.indexOf(player) };
  }));
  const host = credentials[0];
  const statements = [
    db.prepare("INSERT INTO rooms (id, code, host_player_id, status, max_players, created_at, turn_seat, phase, deck_json, discard_json, log_json, pending_json, skill_state_json, last_activity_at) VALUES (?, ?, ?, 'playing', 4, ?, ?, ?, ?, ?, '[]', NULL, ?, ?)")
      .bind(roomId, code, host.id, createdAt, turnSeat, phase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify({ turnPlayerId: credentials[turnSeat].id }), createdAt),
    ...credentials.map((player) => db.prepare("INSERT INTO players (id, room_id, name, token_hash, seat, role, ready, hero, hp, max_hp, hero_options_json, hand_json, judgement_json, equipment_json, alive, connected_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, '[]', ?, ?, ?, 1, ?)")
      .bind(player.id, roomId, player.name, player.tokenHash, player.seat, player.role, player.hero, player.hp, player.maxHp, JSON.stringify(player.hand), JSON.stringify(player.judgement), JSON.stringify(player.equipment), createdAt)),
  ];
  await db.batch(statements);
  return {
    code,
    roomId,
    players: credentials.map(({ id, name, seat, role, hero, token }) => ({ id, name, seat, role, hero, token })),
  };
}
