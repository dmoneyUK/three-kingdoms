export type BotWakeSource = "postwrite" | "cron";
export type BotWorkStatus = "pending" | "claimed" | "waiting_for_human" | "consumed" | "unsupported" | "stale" | "failed";
export type BotErrorCode =
  | "unsupported_bot_decision"
  | "revision_changed"
  | "retry_limit"
  | "action_budget_exhausted"
  | "dispatch_error"
  | "dispatch_rejected";

export type BotSchedulerDiagnosticContext = {
  enabled: boolean;
  wakeSource: BotWakeSource;
  maxSuccessfulTransitions?: number;
  successfulTransitionsLogged?: number;
  /** Test-only callers may collect the already-sanitized line instead of writing it. */
  sink?: (line: string, level: "info" | "warn" | "error") => void;
};

type BotWorkTransitionEvent = {
  event: "bot_work_transition";
  roomCode: string;
  decisionId: string;
  previousStatus: BotWorkStatus;
  nextStatus: BotWorkStatus;
  errorCode?: BotErrorCode;
  attempts: number;
  elapsedMs?: number;
};

type BotSchedulerErrorEvent = {
  event: "bot_scheduler_error";
  errorCode: "scheduler_rejected";
};

type BotSchedulerSummaryEvent = {
  event: "bot_scheduler_summary";
  roomsConsidered: number;
  roomsLocked: number;
  steps: number;
  consumed: number;
  unsupported: number;
  stale: number;
  failed: number;
  retries: number;
};

export type BotDiagnosticEvent = BotWorkTransitionEvent | BotSchedulerErrorEvent | BotSchedulerSummaryEvent;

export type BotSchedulerOutcome = {
  roomsConsidered: number;
  roomsLocked: number;
  steps: number;
  consumed: number;
  unsupported: number;
  stale: number;
  failed: number;
  retries: number;
};

const BOT_DIAGNOSTIC_VERSION = 1;
const STATUSES = new Set<BotWorkStatus>([
  "pending", "claimed", "waiting_for_human", "consumed", "unsupported", "stale", "failed",
]);
const ERROR_CODES = new Set<BotErrorCode>([
  "unsupported_bot_decision", "revision_changed", "retry_limit", "action_budget_exhausted", "dispatch_error", "dispatch_rejected",
]);

export function isBotWorkStatus(value: string): value is BotWorkStatus {
  return STATUSES.has(value as BotWorkStatus);
}

function boundedCount(value: number, maximum: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(maximum, Math.floor(value))) : 0;
}

function safeRoomCode(value: string) {
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9]{1,5}$/.test(code) ? code : null;
}

function safeDecisionId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : null;
}

function writeLine(context: BotSchedulerDiagnosticContext, line: string, level: "info" | "warn" | "error") {
  try {
    if (context.sink) context.sink(line, level);
    else console[level](line);
  } catch {
    // Diagnostics must never affect a committed game action or client response.
  }
}

export function emitBotDiagnostic(context: BotSchedulerDiagnosticContext | undefined, event: BotDiagnosticEvent) {
  if (!context?.enabled || context.wakeSource !== "postwrite" && context.wakeSource !== "cron") return;

  try {
    const common = {
      component: "bot_scheduler",
      version: BOT_DIAGNOSTIC_VERSION,
      event: event.event,
      wakeSource: context.wakeSource,
    };

    if (event.event === "bot_work_transition") {
      const roomCode = safeRoomCode(event.roomCode);
      const decisionId = safeDecisionId(event.decisionId);
      if (!roomCode || !decisionId || !STATUSES.has(event.previousStatus) || !STATUSES.has(event.nextStatus)) return;
      if (event.nextStatus === "consumed") {
        const logged = context.successfulTransitionsLogged ?? 0;
        const cap = boundedCount(context.maxSuccessfulTransitions ?? 8, 8);
        if (logged >= cap) return;
        context.successfulTransitionsLogged = logged + 1;
      }
      const abnormal = event.nextStatus === "unsupported" || event.nextStatus === "stale" || event.nextStatus === "failed"
        || event.nextStatus === "pending" && event.errorCode === "dispatch_error";
      const record = {
        ...common,
        level: event.nextStatus === "failed" ? "error" : abnormal ? "warn" : "info",
        roomCode,
        decisionId,
        previousStatus: event.previousStatus,
        nextStatus: event.nextStatus,
        ...(event.errorCode && ERROR_CODES.has(event.errorCode) ? { errorCode: event.errorCode } : {}),
        attempts: boundedCount(event.attempts, 3),
        ...(event.elapsedMs === undefined ? {} : { elapsedMs: boundedCount(event.elapsedMs, 120_000) }),
      };
      writeLine(context, JSON.stringify(record), record.level);
      return;
    }

    if (event.event === "bot_scheduler_error") {
      const record = { ...common, level: "error", errorCode: "scheduler_rejected" };
      writeLine(context, JSON.stringify(record), record.level);
      return;
    }

    const record = {
      ...common,
      level: "warn",
      roomsConsidered: boundedCount(event.roomsConsidered, 16),
      roomsLocked: boundedCount(event.roomsLocked, 16),
      steps: boundedCount(event.steps, 16),
      consumed: boundedCount(event.consumed, 16),
      unsupported: boundedCount(event.unsupported, 16),
      stale: boundedCount(event.stale, 16),
      failed: boundedCount(event.failed, 16),
      retries: boundedCount(event.retries, 16),
    };
    writeLine(context, JSON.stringify(record), record.level);
  } catch {
    // A malformed diagnostic must not escape into the scheduler or game path.
  }
}

/** Run one scheduler wake, logging at most one bounded summary or one sanitized rejection. */
export async function runBotSchedulerWake<T extends BotSchedulerOutcome>(
  context: BotSchedulerDiagnosticContext,
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    const outcome = await run();
    if (outcome.unsupported + outcome.stale + outcome.failed + outcome.retries > 0) {
      emitBotDiagnostic(context, { event: "bot_scheduler_summary", ...outcome });
    }
    return outcome;
  } catch {
    emitBotDiagnostic(context, { event: "bot_scheduler_error", errorCode: "scheduler_rejected" });
    return null;
  }
}
