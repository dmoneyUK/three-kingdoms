import { GET as getRoom, POST as postRoom } from "../app/api/rooms/route";
import { createBotActionPrincipal } from "./bot-principal";

type PublicBotRoom = {
  status?: string;
  actionRevision?: string;
  actionPlayerId?: string | null;
  players?: Array<{ id?: string; isBot?: boolean }>;
};

type BotStepInput = {
  code: string;
  botId: string;
  actionRevision?: string;
  decisionId?: string;
};

type BotWorkRow = {
  decision_id: string;
  room_id: string;
  bot_id: string;
  action_revision: string;
  status: string;
  attempts: number;
  available_at: number;
  lease_token: string | null;
  lease_until: number | null;
  budget_reserved: number;
};

type BotRoomRow = { id: string; code: string; bot_count: number };
type SchedulerOptions = { maxRoomsPerWakeup?: number; maxStepsPerWakeup?: number };

const MAX_BOT_SEATS_PER_ROOM = 3;
const MAX_ATTEMPTS = 3;
const MAX_ROOM_ACTIONS = 200;
const ROOM_LEASE_MS = 60_000;
const WORK_LEASE_MS = 60_000;
const MAX_ROOMS_PER_WAKEUP = 8;
export const BOT_SCHEDULER_MAX_STEPS_PER_WAKEUP = 4;

export type BotSchedulerSummary = {
  roomsConsidered: number;
  roomsLocked: number;
  steps: number;
  consumed: number;
  waitingForHuman: number;
  unsupported: number;
  stale: number;
  failed: number;
  skippedLocked: number;
};

export async function runBotStep(db: Pick<D1Database, "prepare">, input: BotStepInput): Promise<Response> {
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  if (!code || !input.botId) return Response.json({ error: "A room code and bot ID are required." }, { status: 400 });
  const roomRow = await db.prepare("SELECT id FROM rooms WHERE code = ?").bind(code).first<{ id: string }>();
  if (!roomRow) return Response.json({ error: "Room not found." }, { status: 404 });
  const roomRequest = new Request(`https://internal.invalid/api/rooms?code=${encodeURIComponent(code)}`);
  const roomResponse = await getRoom(roomRequest);
  if (!roomResponse.ok) return roomResponse;
  const room = await roomResponse.json() as PublicBotRoom;
  const bot = room.players?.find((player) => player.id === input.botId && player.isBot);
  if (!bot) return Response.json({ error: "The requested actor is not a bot in this room." }, { status: 403 });
  if (room.status !== "heroes" && room.status !== "playing") return Response.json({ state: "waiting_for_human" });
  if (room.actionPlayerId !== input.botId) return Response.json({ state: "waiting_for_human", actionRevision: room.actionRevision ?? null });
  if (!room.actionRevision) return Response.json({ error: "The server did not provide an action revision." }, { status: 409 });
  if (input.actionRevision && input.actionRevision !== room.actionRevision) {
    return Response.json({ error: "The bot decision is stale." }, { status: 409 });
  }

  const principal = createBotActionPrincipal({
    roomId: roomRow.id,
    botId: input.botId,
    actionRevision: room.actionRevision,
    decisionId: input.decisionId ?? crypto.randomUUID(),
  });
  const actionRequest = new Request("https://internal.invalid/api/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "bot_step", code, token: "" }),
  });
  const actionResponse = await postRoom(actionRequest, principal);
  let payload: unknown;
  try {
    payload = await actionResponse.json();
  } catch {
    return Response.json({ error: "The internal bot action returned an invalid response." }, { status: 502 });
  }
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const safePayload = { ...(payload as Record<string, unknown>) };
    delete safePayload.drawnCards;
    if (safePayload.room && typeof safePayload.room === "object" && !Array.isArray(safePayload.room)) {
      const safeRoom = { ...(safePayload.room as Record<string, unknown>) };
      delete safeRoom.myHand;
      delete safeRoom.myHeroOptions;
      safePayload.room = safeRoom;
    }
    return Response.json(safePayload, { status: actionResponse.status });
  }
  return Response.json({ error: "The internal bot action returned an invalid payload." }, { status: 502 });
}

async function publicRoom(code: string): Promise<PublicBotRoom | null> {
  const response = await getRoom(new Request(`https://internal.invalid/api/rooms?code=${encodeURIComponent(code)}`));
  if (!response.ok) return null;
  return await response.json() as PublicBotRoom;
}

async function acquireRoomLease(db: Pick<D1Database, "prepare">, roomId: string, now: number, leaseToken: string) {
  const result = await db.prepare(`INSERT INTO bot_room_scheduler
    (room_id, lease_token, lease_until, actions_reserved, created_at, updated_at)
    VALUES (?, ?, ?, 0, ?, ?)
    ON CONFLICT(room_id) DO UPDATE SET lease_token = excluded.lease_token,
      lease_until = excluded.lease_until, updated_at = excluded.updated_at
    WHERE bot_room_scheduler.lease_until <= ?`)
    .bind(roomId, leaseToken, now + ROOM_LEASE_MS, now, now, now).run();
  return (result.meta.changes ?? 0) > 0;
}

async function markWork(db: Pick<D1Database, "prepare">, work: BotWorkRow, status: string, errorCode: string | null, now: number) {
  await db.prepare(`UPDATE bot_work SET status = ?, error_code = ?, lease_token = NULL,
    lease_until = NULL, updated_at = ? WHERE decision_id = ?`)
    .bind(status, errorCode, now, work.decision_id).run();
}

function testOptions(value: unknown, maximum: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.min(maximum, Math.floor(value)))
    : maximum;
}

/**
 * D1 is the source of truth for pending bot work. The room lease serializes
 * dispatch within a room, while each decision's unique revision row and
 * claim lease recover work after a crashed or duplicated Worker wakeup.
 */
export async function runBotScheduler(
  db: Pick<D1Database, "prepare">,
  options: SchedulerOptions = {},
): Promise<BotSchedulerSummary> {
  const summary: BotSchedulerSummary = {
    roomsConsidered: 0,
    roomsLocked: 0,
    steps: 0,
    consumed: 0,
    waitingForHuman: 0,
    unsupported: 0,
    stale: 0,
    failed: 0,
    skippedLocked: 0,
  };
  const roomLimit = testOptions(options.maxRoomsPerWakeup, MAX_ROOMS_PER_WAKEUP);
  const stepLimit = testOptions(options.maxStepsPerWakeup, BOT_SCHEDULER_MAX_STEPS_PER_WAKEUP);
  const roomsResult = await db.prepare(`SELECT rooms.id, rooms.code, COUNT(players.id) AS bot_count,
      COALESCE(bot_room_scheduler.updated_at, 0) AS scheduler_updated_at
    FROM rooms JOIN players ON players.room_id = rooms.id
    LEFT JOIN bot_room_scheduler ON bot_room_scheduler.room_id = rooms.id
    WHERE rooms.status IN ('heroes', 'playing') AND rooms.test_room = 0
      AND players.controller_type = 'bot' AND players.is_test_player = 0
    GROUP BY rooms.id, rooms.code, rooms.created_at, bot_room_scheduler.updated_at
    HAVING COUNT(players.id) BETWEEN 1 AND ?
    ORDER BY scheduler_updated_at, rooms.created_at LIMIT ?`)
    .bind(MAX_BOT_SEATS_PER_ROOM, roomLimit).all<BotRoomRow>();
  const rooms = roomsResult.results ?? [];

  for (const candidate of rooms) {
    if (summary.steps >= stepLimit) break;
    summary.roomsConsidered++;
    const roomLeaseToken = crypto.randomUUID();
    if (!await acquireRoomLease(db, candidate.id, Date.now(), roomLeaseToken)) {
      summary.skippedLocked++;
      continue;
    }
    summary.roomsLocked++;

    try {
      while (summary.steps < stepLimit) {
        const room = await publicRoom(candidate.code);
        if (!room || room.status !== "heroes" && room.status !== "playing") break;
        const actorId = room.actionPlayerId ?? null;
        const actor = room.players?.find((player) => player.id === actorId && player.isBot);
        if (!actor || !room.actionRevision) break;

        // Any older decision is obsolete once the authoritative room revision
        // advances. An expired in-flight decision is safe to mark stale: the
        // canonical action path compares the same revision before mutation.
        await db.prepare(`UPDATE bot_work SET status = 'stale', error_code = 'revision_changed',
          lease_token = NULL, lease_until = NULL, updated_at = ?
          WHERE room_id = ? AND status IN ('pending', 'claimed') AND action_revision <> ?`)
          .bind(Date.now(), candidate.id, room.actionRevision).run();

        const now = Date.now();
        const proposedDecisionId = crypto.randomUUID();
        await db.prepare(`INSERT OR IGNORE INTO bot_work
          (decision_id, room_id, bot_id, action_revision, status, attempts, available_at, budget_reserved, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'pending', 0, ?, 0, ?, ?)`)
          .bind(proposedDecisionId, candidate.id, actor.id, room.actionRevision, now, now, now).run();
        const work = await db.prepare(`SELECT * FROM bot_work
          WHERE room_id = ? AND bot_id = ? AND action_revision = ?`)
          .bind(candidate.id, actor.id, room.actionRevision).first<BotWorkRow>();
        if (!work) break;
        if (["consumed", "waiting_for_human", "unsupported", "stale", "failed"].includes(work.status)) break;
        if (work.status === "claimed" && (work.lease_until ?? 0) > now) break;
        if (work.available_at > now) break;
        if (work.attempts >= MAX_ATTEMPTS) {
          await markWork(db, work, "failed", "retry_limit", now);
          summary.failed++;
          break;
        }

        if (!work.budget_reserved) {
          await db.prepare(`INSERT OR IGNORE INTO bot_room_scheduler
            (room_id, lease_token, lease_until, actions_reserved, created_at, updated_at)
            VALUES (?, ?, ?, 0, ?, ?)`)
            .bind(candidate.id, roomLeaseToken, now + ROOM_LEASE_MS, now, now).run();
          const budget = await db.prepare(`SELECT actions_reserved, lease_token FROM bot_room_scheduler WHERE room_id = ?`)
            .bind(candidate.id).first<{ actions_reserved: number; lease_token: string | null }>();
          if (budget?.lease_token !== roomLeaseToken || budget.actions_reserved >= MAX_ROOM_ACTIONS) {
            await markWork(db, work, "failed", "action_budget_exhausted", now);
            summary.failed++;
            break;
          }
          // Reserve once per decision before dispatch. The cap is deliberately
          // conservative if a Worker dies between reservation and claim.
          const reserved = await db.prepare(`UPDATE bot_room_scheduler SET actions_reserved = actions_reserved + 1, updated_at = ?
            WHERE room_id = ? AND lease_token = ? AND actions_reserved < ?`)
            .bind(now, candidate.id, roomLeaseToken, MAX_ROOM_ACTIONS).run();
          if ((reserved.meta.changes ?? 0) <= 0) {
            await markWork(db, work, "failed", "action_budget_exhausted", now);
            summary.failed++;
            break;
          }
          await db.prepare("UPDATE bot_work SET budget_reserved = 1 WHERE decision_id = ? AND budget_reserved = 0")
            .bind(work.decision_id).run();
        }

        const decisionLeaseToken = crypto.randomUUID();
        const claimed = await db.prepare(`UPDATE bot_work SET status = 'claimed', attempts = attempts + 1,
          lease_token = ?, lease_until = ?, error_code = NULL, updated_at = ?
          WHERE decision_id = ? AND attempts < ? AND available_at <= ?
            AND (status = 'pending' OR (status = 'claimed' AND COALESCE(lease_until, 0) <= ?))`)
          .bind(decisionLeaseToken, now + WORK_LEASE_MS, now, work.decision_id, MAX_ATTEMPTS, now, now).run();
        if ((claimed.meta.changes ?? 0) <= 0) break;
        summary.steps++;

        let actionResponse: Response;
        try {
          actionResponse = await runBotStep(db, {
            code: candidate.code,
            botId: actor.id,
            actionRevision: room.actionRevision,
            decisionId: work.decision_id,
          });
        } catch {
          const attempts = work.attempts + 1;
          const transientStatus = attempts >= MAX_ATTEMPTS ? "failed" : "pending";
          await db.prepare(`UPDATE bot_work SET status = ?, available_at = ?, error_code = 'dispatch_error',
            lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
            .bind(transientStatus, now + (attempts === 1 ? 1_000 : 5_000), Date.now(), work.decision_id, decisionLeaseToken).run();
          if (transientStatus === "failed") summary.failed++;
          break;
        }

        let result: { state?: unknown; code?: unknown } = {};
        try { result = await actionResponse.json() as typeof result; } catch { /* Status classification below fails closed. */ }
        if (result.state === "unsupported" || result.code === "UNSUPPORTED_BOT_DECISION") {
          await db.prepare(`UPDATE bot_work SET status = 'unsupported', error_code = 'unsupported_bot_decision',
            lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
            .bind(Date.now(), work.decision_id, decisionLeaseToken).run();
          summary.unsupported++;
          break;
        }
        if (result.state === "waiting_for_human") {
          await db.prepare(`UPDATE bot_work SET status = 'waiting_for_human', error_code = NULL,
            lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
            .bind(Date.now(), work.decision_id, decisionLeaseToken).run();
          summary.waitingForHuman++;
          break;
        }
        if (actionResponse.status === 409) {
          await db.prepare(`UPDATE bot_work SET status = 'stale', error_code = 'revision_changed',
            lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
            .bind(Date.now(), work.decision_id, decisionLeaseToken).run();
          summary.stale++;
          break;
        }
        if (actionResponse.status >= 500) {
          const attempts = work.attempts + 1;
          const retry = attempts < MAX_ATTEMPTS;
          await db.prepare(`UPDATE bot_work SET status = ?, available_at = ?, error_code = 'dispatch_error',
            lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
            .bind(retry ? "pending" : "failed", now + (attempts === 1 ? 1_000 : 5_000), Date.now(), work.decision_id, decisionLeaseToken).run();
          if (!retry) summary.failed++;
          break;
        }
        if (!actionResponse.ok) {
          await db.prepare(`UPDATE bot_work SET status = 'failed', error_code = 'dispatch_rejected',
            lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
            .bind(Date.now(), work.decision_id, decisionLeaseToken).run();
          summary.failed++;
          break;
        }

        const consumed = await db.prepare(`UPDATE bot_work SET status = 'consumed', error_code = NULL,
          lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
          .bind(Date.now(), work.decision_id, decisionLeaseToken).run();
        if ((consumed.meta.changes ?? 0) > 0) summary.consumed++;
      }
    } finally {
      await db.prepare(`UPDATE bot_room_scheduler SET lease_token = NULL, lease_until = 0, updated_at = ?
        WHERE room_id = ? AND lease_token = ?`)
        .bind(Date.now(), candidate.id, roomLeaseToken).run();
    }
  }

  return summary;
}
