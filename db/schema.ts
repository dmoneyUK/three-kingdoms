import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  skillStateJson: text("skill_state_json"),
  causalEnvelopeJson: text("causal_envelope_json"),
  testRoom: integer("test_room", { mode: "boolean" }).notNull().default(false),
  testHandPresetJson: text("test_hand_preset_json"),
  testHandConfigRevision: integer("test_hand_config_revision").notNull().default(0),
}, (table) => [uniqueIndex("rooms_code_unique").on(table.code)]);

export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull(),
  seat: integer("seat").notNull(),
  role: text("role"),
  ready: integer("ready", { mode: "boolean" }).notNull().default(false),
  hero: text("hero"),
  hp: integer("hp"),
  maxHp: integer("max_hp"),
  heroOptionsJson: text("hero_options_json"),
  handJson: text("hand_json"),
  judgementJson: text("judgement_json"),
  equipmentJson: text("equipment_json"),
  alive: integer("alive", { mode: "boolean" }).notNull().default(true),
  isTestPlayer: integer("is_test_player", { mode: "boolean" }).notNull().default(false),
  controllerType: text("controller_type").notNull().default("human"),
  controllerRequestId: text("controller_request_id"),
  connectedAt: integer("connected_at").notNull(),
}, (table) => [
  uniqueIndex("players_room_seat_unique").on(table.roomId, table.seat),
  uniqueIndex("players_room_controller_request_unique").on(table.roomId, table.controllerRequestId),
]);

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

/** Private shared-window intents; never join these rows into public room projections. */
export const negationWindowSubmissions = sqliteTable("negation_window_submissions", {
  roomId: text("room_id").notNull(),
  windowId: text("window_id").notNull(),
  playerId: text("player_id").notNull(),
  submissionJson: text("submission_json").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.windowId, table.playerId] }),
  index("idx_negation_window_submissions_room").on(table.roomId),
]);

/** Durable, bounded server-owned work for deterministic Staging bot actions. */
export const botWork = sqliteTable("bot_work", {
  decisionId: text("decision_id").primaryKey(),
  roomId: text("room_id").notNull(),
  botId: text("bot_id").notNull(),
  actionRevision: text("action_revision").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: integer("available_at").notNull(),
  leaseToken: text("lease_token"),
  leaseUntil: integer("lease_until"),
  budgetReserved: integer("budget_reserved", { mode: "boolean" }).notNull().default(false),
  errorCode: text("error_code"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  check("bot_work_status_check", sql`${table.status} IN ('pending', 'claimed', 'consumed', 'waiting_for_human', 'unsupported', 'stale', 'failed')`),
  check("bot_work_attempts_check", sql`${table.attempts} BETWEEN 0 AND 3`),
  uniqueIndex("bot_work_room_bot_revision_unique").on(table.roomId, table.botId, table.actionRevision),
  index("bot_work_status_available_idx").on(table.status, table.availableAt, table.leaseUntil),
]);

/** Per-room scheduler lease and conservative dispatched-action budget. */
export const botRoomScheduler = sqliteTable("bot_room_scheduler", {
  roomId: text("room_id").primaryKey(),
  leaseToken: text("lease_token"),
  leaseUntil: integer("lease_until").notNull().default(0),
  actionsReserved: integer("actions_reserved").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [check("bot_room_scheduler_budget_check", sql`${table.actionsReserved} BETWEEN 0 AND 200`)]);

/** Global per-hour admission limit for public Staging bot-seat creation. */
export const botDemoRateLimits = sqliteTable("bot_demo_rate_limits", {
  hourBucket: integer("hour_bucket").primaryKey(),
  botAddCount: integer("bot_add_count").notNull().default(0),
}, (table) => [check("bot_demo_rate_limits_add_count_check", sql`${table.botAddCount} BETWEEN 0 AND 12`)]);
