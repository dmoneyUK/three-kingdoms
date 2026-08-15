import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  hostPlayerId: text("host_player_id").notNull(),
  status: text("status").notNull().default("lobby"),
  maxPlayers: integer("max_players").notNull().default(8),
  createdAt: integer("created_at").notNull(),
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
  connectedAt: integer("connected_at").notNull(),
}, (table) => [uniqueIndex("players_room_seat_unique").on(table.roomId, table.seat)]);
