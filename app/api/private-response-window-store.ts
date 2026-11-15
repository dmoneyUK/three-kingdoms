import { parsePrivateWindowSubmission, type PrivateWindowSubmission, type PrivateWindowSubmissionRow } from "../../game/shared-response-window";

/** Table names are compile-time policies, never client input. Each feature has independent rows. */
export type ResponseSubmissionTable = "negation_window_submissions" | "shared_response_window_submissions";
export async function responseWindowRows(database: D1Database, table: ResponseSubmissionTable, roomId: string, windowId: string): Promise<PrivateWindowSubmissionRow[]> {
  const result = await database.prepare(`SELECT player_id, submission_json, created_at FROM ${table} WHERE room_id = ? AND window_id = ?`)
    .bind(roomId, windowId).all<PrivateWindowSubmissionRow>();
  return result.results ?? [];
}
export async function ownResponseWindowChoice(database: D1Database, table: ResponseSubmissionTable, roomId: string, windowId: string, playerId: string): Promise<PrivateWindowSubmission | null> {
  const row = await database.prepare(`SELECT submission_json FROM ${table} WHERE room_id = ? AND window_id = ? AND player_id = ?`)
    .bind(roomId, windowId, playerId).first<{ submission_json: string }>();
  return row ? parsePrivateWindowSubmission(row.submission_json) : null;
}
export async function insertResponseWindowChoice(database: D1Database, table: ResponseSubmissionTable, input: {
  roomId: string; windowId: string; playerId: string; expectedPending: string; submission: PrivateWindowSubmission; now: number;
}): Promise<"inserted" | "identical" | "conflict" | "closed"> {
  const serialized = JSON.stringify(input.submission);
  const existing = await ownResponseWindowChoice(database, table, input.roomId, input.windowId, input.playerId);
  if (existing) return JSON.stringify(existing) === serialized ? "identical" : "conflict";
  const result = await database.prepare(`INSERT OR IGNORE INTO ${table} (room_id, window_id, player_id, submission_json, created_at)
    SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM rooms WHERE id = ? AND ${table === "shared_response_window_submissions" ? "phase IN ('response', 'dying')" : "phase = 'response'"} AND pending_json = ?
      AND json_extract(pending_json, '$.windowId') = ? AND json_extract(pending_json, '$.deadline') > ?)`)
    .bind(input.roomId, input.windowId, input.playerId, serialized, input.now, input.roomId, input.expectedPending, input.windowId, input.now).run();
  if ((result.meta.changes ?? 0) > 0) return "inserted";
  const raced = await ownResponseWindowChoice(database, table, input.roomId, input.windowId, input.playerId);
  return raced ? JSON.stringify(raced) === serialized ? "identical" : "conflict" : "closed";
}
