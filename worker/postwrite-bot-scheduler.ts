import { runBotScheduler } from "./bot-driver";
import type { BotSchedulerDiagnosticContext, BotSchedulerOutcome } from "./bot-diagnostics";

type SchedulerDatabase = Pick<D1Database, "prepare">;

export type PostWriteBotScheduler = (
  db: SchedulerDatabase,
  options: { roomCode: string; maxStepsPerWakeup: number },
  diagnostics: BotSchedulerDiagnosticContext,
) => Promise<BotSchedulerOutcome>;

/**
 * Keep the synchronous-after-write wake deliberately to one Bot decision.
 * Remaining eligible work stays durable in bot_work and is resumed by a later
 * room-scoped wake or the existing Cron scheduler after the host request has
 * finished. A waitUntil callback is still charged to the Worker invocation,
 * so this bound is part of the request CPU budget rather than a free loop.
 */
export function runBoundedPostWriteBotScheduler(
  db: SchedulerDatabase,
  roomCode: string,
  diagnostics: BotSchedulerDiagnosticContext,
  scheduler: PostWriteBotScheduler = runBotScheduler,
): Promise<BotSchedulerOutcome> {
  return scheduler(db, { roomCode, maxStepsPerWakeup: 1 }, diagnostics);
}
