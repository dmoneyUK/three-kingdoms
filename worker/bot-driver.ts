import type { BotPolicy } from "../ai/decision-router";
import {
  attachBotExecutionContext,
  createBotActionPrincipal,
  createBotExecutionContext,
} from "./bot-principal";
import { emitBotDiagnostic, isBotWorkStatus, type BotErrorCode, type BotSchedulerDiagnosticContext, type BotWorkStatus } from "./bot-diagnostics";
import {
  isBotActionOutcome,
  type BotActionOutcome,
  type BotActionOutcomeBase,
} from "./bot-outcome";

type BotStepInput = {
  code: string;
  botId: string;
  actionRevision?: string;
  decisionId?: string;
  diagnostics?: BotSchedulerDiagnosticContext;
  mockPolicy?: BotPolicy;
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
type SchedulerOptions = { maxRoomsPerWakeup?: number; maxStepsPerWakeup?: number; roomCode?: string };
type BotDispatchResult = BotActionOutcome;

const MAX_BOT_SEATS_PER_ROOM = 3;
const MAX_ATTEMPTS = 3;
const MAX_ROOM_ACTIONS = 200;
const ROOM_LEASE_MS = 60_000;
const WORK_LEASE_MS = 60_000;
const MAX_ROOMS_PER_WAKEUP = 8;
const LIVE_HUMAN_PRESENCE_MS = 90_000;
const RECENT_ROOM_ACTIVITY_MS = 5 * 60_000;
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
  retries: number;
  skippedLocked: number;
};

async function loadRoomRouteHandlers() {
  // Keep the Cloudflare-only room route out of the Worker entry's eager module
  // graph. Ordinary Node SSR/fast-test imports must not load cloudflare:workers.
  return import("../app/api/rooms/route");
}

async function runBotStepInternal(_db: Pick<D1Database, "prepare">, input: BotStepInput, compactResult: boolean): Promise<Response | BotActionOutcome> {
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  const invalidInput = { decisionId: input.decisionId ?? "invalid", actorId: input.botId ?? "invalid", actionRevision: input.actionRevision ?? "invalid", kind: "failed" as const, errorCode: "dispatch_rejected" as const, retryable: false };
  if (!code || !input.botId) return compactResult ? invalidInput : Response.json({ error: "A room code and bot ID are required." }, { status: 400 });
  const { beginBotCompactProjection, botControllerSnapshot, endBotCompactProjection, POST: postRoom } = await loadRoomRouteHandlers();
  const room = await botControllerSnapshot(code);
  if (!room) return compactResult ? { ...invalidInput, actorId: input.botId, actionRevision: input.actionRevision ?? "missing", errorCode: "dispatch_rejected" } : Response.json({ error: "Room not found." }, { status: 404 });
  if (!room.botIds.includes(input.botId)) return compactResult ? { ...invalidInput, actorId: input.botId, actionRevision: room.actionRevision, errorCode: "dispatch_rejected" } : Response.json({ error: "The requested actor is not a bot in this room." }, { status: 403 });
  const decisionId = input.decisionId ?? crypto.randomUUID();
  const requestedRevision = input.actionRevision ?? room.actionRevision;
  const correlation = { decisionId, actorId: input.botId, actionRevision: requestedRevision } satisfies BotActionOutcomeBase;
  if (!room.eligibleBotIds.includes(input.botId)) {
    return compactResult ? { ...correlation, kind: "waiting_for_human" }
      : Response.json({ state: "waiting_for_human", actionRevision: room.actionRevision });
  }
  if (input.actionRevision && input.actionRevision !== room.actionRevision) {
    return compactResult ? { ...correlation, kind: "stale", reason: "revision_changed" }
      : Response.json({ error: "The bot decision is stale." }, { status: 409 });
  }

  const context = compactResult
    ? createBotExecutionContext(correlation, input.diagnostics?.enabled === true && input.diagnostics?.privateStagingEnabled === true)
    : null;
  const principalBase = createBotActionPrincipal({
    roomId: room.roomId,
    botId: input.botId,
    actionRevision: room.actionRevision,
    decisionId,
    ...(input.diagnostics ? { diagnostics: input.diagnostics } : {}),
    ...(input.mockPolicy ? { mockPolicy: input.mockPolicy } : {}),
  });
  const principal = context ? attachBotExecutionContext(principalBase, context) : principalBase;
  const actionRequest = new Request("https://internal.invalid/api/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "bot_step", code, token: "" }),
  });
  if (compactResult) beginBotCompactProjection(code, context!.projectionToken, context!);
  let actionResponse: Response;
  try {
    actionResponse = await postRoom(actionRequest, principal);
  } finally {
    if (compactResult) endBotCompactProjection(code, context!.projectionToken);
  }
  if (compactResult) {
    // The live scheduler consumes the private typed value.  A Response is
    // deliberately not parsed or re-encoded between the canonical executor
    // and the scheduler; a missing proof is an ambiguous retryable result.
    return context.outcome ?? { ...correlation, kind: "failed", errorCode: "malformed_result", retryable: true };
  }
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

export async function runBotStep(_db: Pick<D1Database, "prepare">, input: BotStepInput): Promise<Response> {
  const result = await runBotStepInternal(_db, input, false);
  return result instanceof Response ? result : Response.json({ error: "The internal bot action returned no human response." }, { status: 502 });
}

export async function runBotStepOutcome(_db: Pick<D1Database, "prepare">, input: BotStepInput): Promise<BotActionOutcome> {
  const candidate = await runBotStepInternal(_db, { ...input, decisionId: input.decisionId ?? crypto.randomUUID() }, true);
  if (isBotActionOutcome(candidate)) return candidate;
  return {
    decisionId: input.decisionId ?? "missing",
    actorId: input.botId,
    actionRevision: input.actionRevision ?? "missing",
    kind: "failed",
    errorCode: "malformed_result",
    retryable: true,
  };
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

async function markWork(
  db: Pick<D1Database, "prepare">,
  work: BotWorkRow,
  status: BotWorkStatus,
  errorCode: BotErrorCode,
  now: number,
) {
  const result = await db.prepare(`UPDATE bot_work SET status = ?, error_code = ?, lease_token = NULL,
    lease_until = NULL, updated_at = ? WHERE decision_id = ? AND status = ?`)
    .bind(status, errorCode, now, work.decision_id, work.status).run();
  return (result.meta.changes ?? 0) > 0;
}

function logWorkTransition(
  diagnostics: BotSchedulerDiagnosticContext | undefined,
  roomCode: string,
  decisionId: string,
  previousStatus: string,
  nextStatus: BotWorkStatus,
  errorCode: BotErrorCode | undefined,
  attempts: number,
  elapsedMs?: number,
) {
  if (!isBotWorkStatus(previousStatus)) return;
  emitBotDiagnostic(diagnostics, {
    event: "bot_work_transition",
    roomCode,
    decisionId,
    previousStatus,
    nextStatus,
    ...(errorCode ? { errorCode } : {}),
    attempts,
    ...(elapsedMs === undefined ? {} : { elapsedMs }),
  });
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
  diagnostics?: BotSchedulerDiagnosticContext,
  dispatchStep: (_db: Pick<D1Database, "prepare">, input: BotStepInput) => Promise<BotDispatchResult> = runBotStepOutcome,
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
    retries: 0,
    skippedLocked: 0,
  };
  const roomLimit = testOptions(options.maxRoomsPerWakeup, MAX_ROOMS_PER_WAKEUP);
  const stepLimit = testOptions(options.maxStepsPerWakeup, BOT_SCHEDULER_MAX_STEPS_PER_WAKEUP);
  const now = Date.now();
  // Use an empty sentinel instead of a nullable bind for the unscoped Cron
  // query. It keeps the admission predicate explicit across local D1 and
  // Cloudflare D1's parameter coercion paths.
  const requestedRoomCode = options.roomCode ?? "";
  const roomsResult = await db.prepare(`SELECT rooms.id, rooms.code, COUNT(players.id) AS bot_count,
      COALESCE(bot_room_scheduler.updated_at, 0) AS scheduler_updated_at
    FROM rooms JOIN players ON players.room_id = rooms.id
    LEFT JOIN bot_room_scheduler ON bot_room_scheduler.room_id = rooms.id
    WHERE rooms.status IN ('heroes', 'playing') AND rooms.test_room = 0
      AND (? = '' OR rooms.code = ?)
      -- A global Cron wake may only touch a room with recent activity or a
      -- live human. Explicit post-write/diagnostic room targeting remains
      -- available for durable recovery of a known room, including a stale
      -- checkpoint, without allowing an unscoped wake to mutate old forensic
      -- rooms.
      AND (? <> '' OR COALESCE(NULLIF(rooms.last_activity_at, 0), rooms.created_at) >= ?
        OR EXISTS (SELECT 1 FROM players AS active_human WHERE active_human.room_id = rooms.id
          AND active_human.controller_type = 'human' AND active_human.is_test_player = 0
          AND active_human.connected_at >= ?))
      AND players.controller_type = 'bot' AND players.is_test_player = 0
    GROUP BY rooms.id, rooms.code, rooms.created_at, bot_room_scheduler.updated_at
    HAVING COUNT(players.id) BETWEEN 1 AND ?
    ORDER BY CASE
      WHEN EXISTS (SELECT 1 FROM players AS human WHERE human.room_id = rooms.id
        AND human.controller_type = 'human' AND human.is_test_player = 0 AND human.connected_at >= ?) THEN 0
      WHEN COALESCE(NULLIF(rooms.last_activity_at, 0), rooms.created_at) >= ? THEN 1
      ELSE 2 END ASC,
      scheduler_updated_at, rooms.created_at LIMIT ?`)
    .bind(requestedRoomCode, requestedRoomCode, requestedRoomCode,
      now - RECENT_ROOM_ACTIVITY_MS, now - LIVE_HUMAN_PRESENCE_MS, MAX_BOT_SEATS_PER_ROOM,
      now - LIVE_HUMAN_PRESENCE_MS, now - RECENT_ROOM_ACTIVITY_MS, roomLimit).all<BotRoomRow>();
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
        const { botControllerSnapshot } = await loadRoomRouteHandlers();
        const room = await botControllerSnapshot(candidate.code, true);
        if (!room || room.status !== "heroes" && room.status !== "playing") break;
        const actorId = room.eligibleBotIds[0];
        if (!actorId || !room.actionRevision) break;

        // Any older decision is obsolete once the authoritative room revision
        // advances. An expired in-flight decision is safe to mark stale: the
        // canonical action path compares the same revision before mutation.
        const obsoleteWork = await db.prepare(`SELECT decision_id, status, attempts FROM bot_work
          WHERE room_id = ? AND status IN ('pending', 'claimed') AND action_revision <> ?`)
          .bind(candidate.id, room.actionRevision).all<{ decision_id: string; status: string; attempts: number }>();
        for (const obsolete of obsoleteWork.results ?? []) {
          const updated = await db.prepare(`UPDATE bot_work SET status = 'stale', error_code = 'revision_changed',
            lease_token = NULL, lease_until = NULL, updated_at = ?
            WHERE decision_id = ? AND status = ? AND action_revision <> ?`)
            .bind(Date.now(), obsolete.decision_id, obsolete.status, room.actionRevision).run();
          if ((updated.meta.changes ?? 0) > 0) {
            summary.stale++;
            logWorkTransition(diagnostics, candidate.code, obsolete.decision_id, obsolete.status, "stale", "revision_changed", obsolete.attempts);
          }
        }

        const now = Date.now();
        const proposedDecisionId = crypto.randomUUID();
        await db.prepare(`INSERT OR IGNORE INTO bot_work
          (decision_id, room_id, bot_id, action_revision, status, attempts, available_at, budget_reserved, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'pending', 0, ?, 0, ?, ?)`)
          .bind(proposedDecisionId, candidate.id, actorId, room.actionRevision, now, now, now).run();
        const work = await db.prepare(`SELECT * FROM bot_work
          WHERE room_id = ? AND bot_id = ? AND action_revision = ?`)
          .bind(candidate.id, actorId, room.actionRevision).first<BotWorkRow>();
        if (!work) break;
        if (["consumed", "waiting_for_human", "unsupported", "stale", "failed"].includes(work.status)) break;
        if (work.status === "claimed" && (work.lease_until ?? 0) > now) break;
        if (work.available_at > now) break;
        if (work.attempts >= MAX_ATTEMPTS) {
          if (await markWork(db, work, "failed", "retry_limit", now)) {
            summary.failed++;
            logWorkTransition(diagnostics, candidate.code, work.decision_id, work.status, "failed", "retry_limit", work.attempts);
          }
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
            if (await markWork(db, work, "failed", "action_budget_exhausted", now)) {
              summary.failed++;
              logWorkTransition(diagnostics, candidate.code, work.decision_id, work.status, "failed", "action_budget_exhausted", work.attempts);
            }
            break;
          }
          // Reserve once per decision before dispatch. The cap is deliberately
          // conservative if a Worker dies between reservation and claim.
          const reserved = await db.prepare(`UPDATE bot_room_scheduler SET actions_reserved = actions_reserved + 1, updated_at = ?
            WHERE room_id = ? AND lease_token = ? AND actions_reserved < ?`)
            .bind(now, candidate.id, roomLeaseToken, MAX_ROOM_ACTIONS).run();
          if ((reserved.meta.changes ?? 0) <= 0) {
            if (await markWork(db, work, "failed", "action_budget_exhausted", now)) {
              summary.failed++;
              logWorkTransition(diagnostics, candidate.code, work.decision_id, work.status, "failed", "action_budget_exhausted", work.attempts);
            }
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

        const dispatchStartedAt = Date.now();
        let actionOutcome: BotActionOutcome;
        try {
          const dispatched = await dispatchStep(db, {
            code: candidate.code,
            botId: actorId,
            actionRevision: room.actionRevision,
            decisionId: work.decision_id,
            diagnostics,
          });
          actionOutcome = dispatched;
        } catch {
          const attempts = work.attempts + 1;
          const transientStatus: BotWorkStatus = attempts >= MAX_ATTEMPTS ? "failed" : "pending";
          const retryAt = Date.now();
          const updated = await db.prepare(`UPDATE bot_work SET status = ?, available_at = ?, error_code = 'dispatch_error',
            lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
            .bind(transientStatus, retryAt + (attempts === 1 ? 1_000 : 5_000), retryAt, work.decision_id, decisionLeaseToken).run();
          if ((updated.meta.changes ?? 0) > 0) {
            if (transientStatus === "failed") summary.failed++;
            else summary.retries++;
            logWorkTransition(diagnostics, candidate.code, work.decision_id, "claimed", transientStatus, "dispatch_error", attempts, Date.now() - dispatchStartedAt);
          }
          break;
        }

        const expectedOutcome = { decisionId: work.decision_id, actorId, actionRevision: room.actionRevision } satisfies BotActionOutcomeBase;
        const correlated = isBotActionOutcome(actionOutcome) && actionOutcome.decisionId === expectedOutcome.decisionId
          && actionOutcome.actorId === expectedOutcome.actorId && actionOutcome.actionRevision === expectedOutcome.actionRevision;
        if (!correlated) {
          const updated = await db.prepare(`UPDATE bot_work SET status = 'failed', error_code = 'dispatch_rejected',
            lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
            .bind(Date.now(), work.decision_id, decisionLeaseToken).run();
          if ((updated.meta.changes ?? 0) > 0) {
            summary.failed++;
            logWorkTransition(diagnostics, candidate.code, work.decision_id, "claimed", "failed", "dispatch_rejected", work.attempts + 1, Date.now() - dispatchStartedAt);
          }
          break;
        }
        if (actionOutcome.kind === "unsupported") {
          const updated = await db.prepare(`UPDATE bot_work SET status = 'unsupported', error_code = 'unsupported_bot_decision',
            lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
            .bind(Date.now(), work.decision_id, decisionLeaseToken).run();
          if ((updated.meta.changes ?? 0) > 0) {
            summary.unsupported++;
            logWorkTransition(diagnostics, candidate.code, work.decision_id, "claimed", "unsupported", "unsupported_bot_decision", work.attempts + 1, Date.now() - dispatchStartedAt);
          }
          break;
        }
        if (actionOutcome.kind === "waiting_for_human") {
          await db.prepare(`UPDATE bot_work SET status = 'waiting_for_human', error_code = NULL,
            lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
            .bind(Date.now(), work.decision_id, decisionLeaseToken).run();
          summary.waitingForHuman++;
          break;
        }
        if (actionOutcome.kind === "stale") {
          const updated = await db.prepare(`UPDATE bot_work SET status = 'stale', error_code = 'revision_changed',
            lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
            .bind(Date.now(), work.decision_id, decisionLeaseToken).run();
          if ((updated.meta.changes ?? 0) > 0) {
            summary.stale++;
            logWorkTransition(diagnostics, candidate.code, work.decision_id, "claimed", "stale", "revision_changed", work.attempts + 1, Date.now() - dispatchStartedAt);
          }
          break;
        }
        if (actionOutcome.kind === "failed" && actionOutcome.retryable) {
          const attempts = work.attempts + 1;
          const retry = attempts < MAX_ATTEMPTS;
          const nextStatus: BotWorkStatus = retry ? "pending" : "failed";
          const retryAt = Date.now();
          const updated = await db.prepare(`UPDATE bot_work SET status = ?, available_at = ?, error_code = 'dispatch_error',
            lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
            .bind(nextStatus, retryAt + (attempts === 1 ? 1_000 : 5_000), retryAt, work.decision_id, decisionLeaseToken).run();
          if ((updated.meta.changes ?? 0) > 0) {
            if (retry) summary.retries++;
            else summary.failed++;
            logWorkTransition(diagnostics, candidate.code, work.decision_id, "claimed", nextStatus, "dispatch_error", attempts, Date.now() - dispatchStartedAt);
          }
          break;
        }
        if (actionOutcome.kind !== "committed" || actionOutcome.commitProof.roomId !== candidate.id
          || actionOutcome.commitProof.decisionId !== expectedOutcome.decisionId
          || actionOutcome.commitProof.actorId !== expectedOutcome.actorId
          || actionOutcome.commitProof.actionRevision !== expectedOutcome.actionRevision) {
          const updated = await db.prepare(`UPDATE bot_work SET status = 'failed', error_code = 'dispatch_rejected',
            lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
            .bind(Date.now(), work.decision_id, decisionLeaseToken).run();
          if ((updated.meta.changes ?? 0) > 0) {
            summary.failed++;
            logWorkTransition(diagnostics, candidate.code, work.decision_id, "claimed", "failed", "dispatch_rejected", work.attempts + 1, Date.now() - dispatchStartedAt);
          }
          break;
        }

        const consumed = await db.prepare(`UPDATE bot_work SET status = 'consumed', error_code = NULL,
          lease_token = NULL, lease_until = NULL, updated_at = ? WHERE decision_id = ? AND lease_token = ?`)
          .bind(Date.now(), work.decision_id, decisionLeaseToken).run();
        if ((consumed.meta.changes ?? 0) > 0) {
          summary.consumed++;
          logWorkTransition(diagnostics, candidate.code, work.decision_id, "claimed", "consumed", undefined, work.attempts + 1, Date.now() - dispatchStartedAt);
        }
      }
    } finally {
      await db.prepare(`UPDATE bot_room_scheduler SET lease_token = NULL, lease_until = 0, updated_at = ?
        WHERE room_id = ? AND lease_token = ?`)
        .bind(Date.now(), candidate.id, roomLeaseToken).run();
    }
  }

  return summary;
}
