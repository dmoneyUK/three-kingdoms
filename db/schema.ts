import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  hostPlayerId: text("host_player_id").notNull(),
  status: text("status").notNull().default("lobby"),
  maxPlayers: integer("max_players").notNull().default(8),
  createdAt: integer("created_at").notNull(),
  turnSeat: integer("turn_seat"),
  phase: text("phase"),
  deckJson: text("deck_json"),
  discardJson: text("discard_json"),
  logJson: text("log_json"),
  pendingJson: text("pending_json"),
}, (table) => [uniqueIndex("rooms_code_unique").on(table.code)]);

export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull(),
  seat: integer("seat").notNull(),
  role: text("role"),
  hero: text("hero"),
  hp: integer("hp"),
  maxHp: integer("max_hp"),
  heroOptionsJson: text("hero_options_json"),
  handJson: text("hand_json"),
  judgementJson: text("judgement_json"),
  equipmentJson: text("equipment_json"),
  alive: integer("alive", { mode: "boolean" }).notNull().default(true),
  connectedAt: integer("connected_at").notNull(),
}, (table) => [uniqueIndex("players_room_seat_unique").on(table.roomId, table.seat)]);

export const gameAudit = sqliteTable("game_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: text("room_id").notNull(),
  eventKey: text("event_key"),
  eventType: text("event_type").notNull(),
  actorId: text("actor_id"),
  actorName: text("actor_name"),
  action: text("action"),
  phaseBefore: text("phase_before"),
  phaseAfter: text("phase_after"),
  turnSeatBefore: integer("turn_seat_before"),
  turnSeatAfter: integer("turn_seat_after"),
  actingPlayerBefore: text("acting_player_before"),
  actingPlayerAfter: text("acting_player_after"),
  detailJson: text("detail_json"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("idx_game_audit_room_id").on(table.roomId, table.id),
  uniqueIndex("game_audit_room_event_unique").on(table.roomId, table.eventKey),
]);

export const auditScope = sqliteTable("audit_scope", {
  id: integer("id").primaryKey(),
  roomId: text("room_id").notNull(),
});
