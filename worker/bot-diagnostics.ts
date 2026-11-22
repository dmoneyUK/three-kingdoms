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
  privateStagingEnabled?: boolean;
  scriptVersion?: string;
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

export type BotDecisionDiagnosticContext = {
  enabled: boolean;
  privateStagingEnabled: boolean;
  scriptVersion?: string;
  wakeSource?: BotWakeSource;
  sink?: (line: string, level: "info" | "warn" | "error") => void;
};

export type BotDecisionCard = { cardId: string; canonicalKind: string; canonicalName: string; suit: string; rank: string };
export type BotDecisionOption = {
  providerId: string;
  satisfies: string;
  activation: string;
  selection: { min: number; max: number; eligibleCardIds: string[] } | null;
  playedAs?: string;
};

export type BotDecisionContextEvent = {
  event: "bot_decision_context";
  roomCode: string;
  decisionId: string;
  actionRevision: string;
  botSeat: number;
  hero: string | null;
  role: string | null;
  hp: number | null;
  maxHp: number | null;
  phase: string | null;
  pendingKind: string | null;
  hand: BotDecisionCard[];
  equipment: BotDecisionCard[];
  activeSkills: string[];
  response?: {
    continuationKind: string;
    requirement: string;
    requiredCount: number;
    attackOrigin: string | null;
    sourceSeat: number | null;
    targetSeat: number | null;
    attackCardKind: string | null;
    attackCardSuit: string | null;
    attackCardRank: string | null;
  };
};

export type BotDecisionEvaluationEvent = {
  event: "bot_decision_evaluation";
  roomCode: string;
  decisionId: string;
  actionRevision: string;
  botSeat: number;
  hero: string | null;
  role: string | null;
  phase: string | null;
  pendingKind: string | null;
  decisionPath: string;
  options: BotDecisionOption[];
  selectedAction: string | null;
  cause: string;
};

export type BotDecisionResultEvent = {
  event: "bot_decision_result";
  roomCode: string;
  decisionId: string;
  actionRevision: string;
  botSeat: number;
  hero: string | null;
  role: string | null;
  decisionPath: string;
  selectedAction: string | null;
  cause: string;
  httpStatus: number;
  canonicalOutcome: string;
  mutationCommitted: boolean;
  before: { hp: number | null; hand: BotDecisionCard[]; phase: string | null; pendingKind: string | null };
  after: { hp: number | null; hand: BotDecisionCard[]; phase: string | null; pendingKind: string | null };
  workStatus: string | null;
  workErrorCode: string | null;
  attempts: number | null;
  elapsedMs: number;
};

export type BotDiagnosticIncompleteEvent = {
  event: "diagnostic_incomplete";
  roomCode: string;
  decisionId: string;
  actionRevision: string;
  botSeat: number;
  hero: string | null;
  role: string | null;
  decisionPath: string;
  expectedHandCount: number;
  loggedHandCount: number;
  missingFields: string[];
};

export type BotDecisionDiagnosticEvent = BotDecisionContextEvent | BotDecisionEvaluationEvent | BotDecisionResultEvent | BotDiagnosticIncompleteEvent;

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

const MAX_DECISION_EVENT_BYTES = 220_000;
const SAFE_PRIVATE_ID = /^[A-Za-z0-9._:-]{1,100}$/;
const DECISION_CAUSES = new Set([
  "no_legal_defense_declined", "single_physical_dodge_available_but_unsupported", "single_physical_dodge_supported",
  "ambiguous_multiple_cards", "converted_skill_only", "requires_multiple_dodges", "unsupported_pending_family",
  "unsupported_response_provider", "canonical_validation_rejected", "canonical_response_succeeded", "dispatch_threw",
  "stale_action_revision", "non_response_decision", "no_supported_action", "bot_action_succeeded", "bot_action_rejected",
  "invalid_authority", "missing_target_eligibility", "candidate_overflow", "no_supported_play", "canonical_combat_response", "canonical_judgement",
]);
const DECISION_ACTIONS = new Set(["choose_hero", "draw", "play_card", "serpent_spear_attack", "discard_cards", "end_turn", "decline_response", "skip_rescue", "respond", "choose_harvest", "choose_target_card", "choose_borrowed_sword_target", "trigger", "decline_trigger"]);
const WORK_STATUS_VALUES = new Set(["pending", "claimed", "waiting_for_human", "consumed", "unsupported", "stale", "failed"]);

function safePrivateId(value: unknown) {
  return typeof value === "string" && SAFE_PRIVATE_ID.test(value) ? value : null;
}

function safePrivateText(value: unknown, maximum = 80) {
  return typeof value === "string" && value.length <= maximum && /^[\p{L}\p{N} ._|:-]*$/u.test(value) ? value : null;
}

function safeNullableNumber(value: unknown, maximum = 100) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(maximum, Math.floor(value))) : null;
}

function safeSuit(value: unknown) {
  return ["♥", "♦", "♣", "♠"].includes(value as string) ? value as string : null;
}

function safePrivateCard(card: BotDecisionCard): BotDecisionCard | null {
  const cardId = safePrivateId(card?.cardId);
  const canonicalKind = safePrivateText(card?.canonicalKind, 40);
  const canonicalName = safePrivateText(card?.canonicalName, 64);
  const suit = safeSuit(card?.suit);
  const rank = safePrivateText(card?.rank, 4);
  if (!cardId || !canonicalKind || !canonicalName || !suit || !rank) return null;
  return { cardId, canonicalKind, canonicalName, suit, rank };
}

function safePrivateCards(cards: BotDecisionCard[]) {
  if (!Array.isArray(cards) || cards.length > 108) return null;
  const sanitized = cards.map(safePrivateCard);
  return sanitized.some((card) => !card) ? null : sanitized as BotDecisionCard[];
}

function safePrivateOption(option: BotDecisionOption): BotDecisionOption | null {
  const providerId = safePrivateText(option?.providerId, 64);
  const satisfies = safePrivateText(option?.satisfies, 32);
  const activation = safePrivateText(option?.activation, 32);
  if (!providerId || !satisfies || !activation) return null;
  if (option.selection === null) return { providerId, satisfies, activation, selection: null, ...(safePrivateText(option.playedAs, 32) ? { playedAs: safePrivateText(option.playedAs, 32)! } : {}) };
  if (!option.selection || !Array.isArray(option.selection.eligibleCardIds) || option.selection.eligibleCardIds.length > 108) return null;
  const eligibleCardIds = option.selection.eligibleCardIds.map(safePrivateId);
  if (eligibleCardIds.some((id) => !id)) return null;
  return {
    providerId, satisfies, activation,
    selection: { min: boundedCount(option.selection.min, 108), max: boundedCount(option.selection.max, 108), eligibleCardIds: eligibleCardIds as string[] },
    ...(safePrivateText(option.playedAs, 32) ? { playedAs: safePrivateText(option.playedAs, 32)! } : {}),
  };
}

/** Emits only fixed, allowlisted private Staging decision fields; it cannot throw into gameplay. */
export function emitBotDecisionDiagnostic(context: BotDecisionDiagnosticContext | undefined, event: BotDecisionDiagnosticEvent) {
  if (!context?.enabled || !context.privateStagingEnabled) return;
  try {
    const roomCode = safeRoomCode(event.roomCode);
    const decisionId = safeDecisionId(event.decisionId);
    const actionRevision = safePrivateText(event.actionRevision, 512);
    const botSeat = safeNullableNumber(event.botSeat, 7);
    const hero = safePrivateText(event.hero, 64);
    const role = safePrivateText(event.role, 32);
    if (!roomCode || !decisionId || !actionRevision || botSeat === null) return;
    const scriptVersion = safePrivateId(context.scriptVersion) ?? "unavailable";
    const common = {
      component: "bot_scheduler",
      schemaVersion: 1,
      eventTimeUtc: new Date().toISOString(),
      scriptVersion,
      ...(context.wakeSource ? { wakeSource: context.wakeSource } : {}),
      roomCode,
      decisionId,
      actionRevision,
      botSeat,
      hero,
      role,
    };
    let record: Record<string, unknown>;
    if (event.event === "bot_decision_context") {
      const hand = safePrivateCards(event.hand);
      const equipment = safePrivateCards(event.equipment);
      const activeSkills = Array.isArray(event.activeSkills) && event.activeSkills.length <= 12
        ? event.activeSkills.map((skill) => safePrivateText(skill, 64)) : null;
      if (!hand || !equipment || !activeSkills || activeSkills.some((skill) => !skill)) {
        record = { ...common, event: "diagnostic_incomplete", decisionPath: "bot_step.context", expectedHandCount: event.hand?.length ?? 0, loggedHandCount: 0, missingFields: ["allowlisted_hand_or_equipment_schema"] };
      } else {
        const phase = safePrivateText(event.phase, 40);
        const pendingKind = safePrivateText(event.pendingKind, 48);
        const response = event.response ? {
          continuationKind: safePrivateText(event.response.continuationKind, 48) ?? "unknown",
          requirement: safePrivateText(event.response.requirement, 32) ?? "unknown",
          requiredCount: boundedCount(event.response.requiredCount, 108),
          attackOrigin: safePrivateText(event.response.attackOrigin, 40),
          sourceSeat: event.response.sourceSeat === null ? null : safeNullableNumber(event.response.sourceSeat, 7),
          targetSeat: event.response.targetSeat === null ? null : safeNullableNumber(event.response.targetSeat, 7),
          attackCardKind: safePrivateText(event.response.attackCardKind, 40),
          attackCardSuit: safeSuit(event.response.attackCardSuit),
          attackCardRank: safePrivateText(event.response.attackCardRank, 4),
        } : undefined;
        record = {
          ...common, event: event.event, hp: safeNullableNumber(event.hp, 99), maxHp: safeNullableNumber(event.maxHp, 99),
          phase, pendingKind, hand, equipment, activeSkills: activeSkills as string[], ...(response ? { response } : {}),
        };
      }
    } else if (event.event === "bot_decision_evaluation") {
      const options = Array.isArray(event.options) && event.options.length <= 32 ? event.options.map(safePrivateOption) : null;
      const cause = DECISION_CAUSES.has(event.cause) ? event.cause : "no_supported_action";
      record = {
        ...common, event: event.event, phase: safePrivateText(event.phase, 40), pendingKind: safePrivateText(event.pendingKind, 48),
        decisionPath: safePrivateText(event.decisionPath, 80) ?? "bot_step.unknown",
        options: options && !options.some((option) => !option) ? options : [],
        selectedAction: event.selectedAction && DECISION_ACTIONS.has(event.selectedAction) ? event.selectedAction : null,
        cause,
      };
      if (!options || options.some((option) => !option)) {
        record.event = "diagnostic_incomplete";
        record.missingFields = ["canonical_response_options"];
        record.expectedHandCount = 0;
        record.loggedHandCount = 0;
      }
    } else if (event.event === "bot_decision_result") {
      const beforeHand = safePrivateCards(event.before.hand);
      const afterHand = safePrivateCards(event.after.hand);
      const actionRevisionResult = safePrivateText(event.actionRevision, 512);
      const cause = DECISION_CAUSES.has(event.cause) ? event.cause : "bot_action_rejected";
      if (!beforeHand || !afterHand || !actionRevisionResult) {
        record = { ...common, event: "diagnostic_incomplete", decisionPath: safePrivateText(event.decisionPath, 80) ?? "bot_step.result", expectedHandCount: event.before.hand?.length ?? 0, loggedHandCount: 0, missingFields: ["before_or_after_hand_schema"] };
      } else {
        record = {
          ...common, event: event.event,
          decisionPath: safePrivateText(event.decisionPath, 80) ?? "bot_step.unknown",
          selectedAction: event.selectedAction && DECISION_ACTIONS.has(event.selectedAction) ? event.selectedAction : null,
          cause, httpStatus: boundedCount(event.httpStatus, 599),
          canonicalOutcome: safePrivateText(event.canonicalOutcome, 48) ?? "unknown",
          mutationCommitted: event.mutationCommitted === true,
          before: { hp: safeNullableNumber(event.before.hp, 99), hand: beforeHand, phase: safePrivateText(event.before.phase, 40), pendingKind: safePrivateText(event.before.pendingKind, 48) },
          after: { hp: safeNullableNumber(event.after.hp, 99), hand: afterHand, phase: safePrivateText(event.after.phase, 40), pendingKind: safePrivateText(event.after.pendingKind, 48) },
          workStatus: WORK_STATUS_VALUES.has(event.workStatus ?? "") ? event.workStatus : null,
          workErrorCode: ERROR_CODES.has(event.workErrorCode as BotErrorCode) ? event.workErrorCode : null,
          attempts: event.attempts === null ? null : boundedCount(event.attempts ?? 0, 3),
          elapsedMs: boundedCount(event.elapsedMs, 120_000),
        };
      }
    } else {
      record = {
        ...common, event: "diagnostic_incomplete",
        decisionPath: safePrivateText(event.decisionPath, 80) ?? "bot_step.unknown",
        expectedHandCount: boundedCount(event.expectedHandCount, 108),
        loggedHandCount: boundedCount(event.loggedHandCount, 108),
        missingFields: Array.isArray(event.missingFields) ? event.missingFields.map((field) => safePrivateText(field, 64)).filter(Boolean).slice(0, 12) : ["unknown"],
      };
    }
    let line = JSON.stringify(record);
    if (new TextEncoder().encode(line).byteLength > MAX_DECISION_EVENT_BYTES && record.event !== "diagnostic_incomplete") {
      line = JSON.stringify({ ...common, event: "diagnostic_incomplete", decisionPath: "bot_step.size_limit", expectedHandCount: event.event === "bot_decision_context" ? event.hand.length : event.event === "bot_decision_result" ? event.before.hand.length : 0, loggedHandCount: 0, missingFields: ["event_over_220kb"] });
      writeLine({ enabled: true, wakeSource: context.wakeSource ?? "postwrite", sink: context.sink }, line, "warn");
      return;
    }
    const level = record.event === "diagnostic_incomplete" ? "warn" : event.event === "bot_decision_result" && !event.mutationCommitted ? "warn" : "info";
    writeLine({ enabled: true, wakeSource: context.wakeSource ?? "postwrite", sink: context.sink }, line, level);
  } catch {
    // Diagnostic failures must never interrupt the canonical action path.
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
