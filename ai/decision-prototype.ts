export type BotRoleV1 = "Lord" | "Loyalist" | "Rebel" | "Renegade";
export type ResponseRequirementV1 = "attack" | "dodge" | "negate" | "peach";

/** The narrow existing CurrentAction response fields used by this offline prototype. */
export type CurrentActionResponseProjectionV1 = {
  version: 3;
  kind: "response" | "dying" | string;
  requirement?: ResponseRequirementV1;
  legalActions: readonly string[];
  declineAction?: string;
  options?: readonly {
    providerId: string;
    satisfies: ResponseRequirementV1;
    label: string;
    selection: null | { type: "cards"; min: number; max: number; eligibleCardIds: readonly string[] };
  }[];
};

export type BotDecisionCandidateV1 = {
  id: string;
  kind: "respond" | "decline";
  label: string;
};

export type BotDecisionRequestV1 = {
  observationVersion: 1;
  decisionId: string;
  requirement: ResponseRequirementV1;
  self: {
    hp: number;
    maxHp: number;
    hasPeach: boolean;
    ownRole?: BotRoleV1;
  };
  publicContext: {
    revealedOpponents: Array<{ revealedRole: BotRoleV1; hp: number }>;
  };
  candidates: BotDecisionCandidateV1[];
};

export type BotDecisionResultV1 = {
  observationVersion: 1;
  decisionId: string;
  selectedCandidateId: string;
  reason: string;
};

export type BotDecisionFailureCode =
  | "invalid_request"
  | "invalid_response"
  | "unknown_candidate"
  | "stale_decision"
  | "stale_observation"
  | "incomplete"
  | "refusal"
  | "rate_limited"
  | "server_error"
  | "timeout"
  | "transport_error";

export type BotDecisionTransportReply =
  | { status: "completed"; output: unknown }
  | { status: "incomplete" }
  | { status: "refusal" };

export type BotDecisionTransport = (request: BotDecisionRequestV1) => Promise<BotDecisionTransportReply>;

export type BotDecisionOutcome =
  | { status: "selected"; result: BotDecisionResultV1 }
  | { status: "failed"; code: BotDecisionFailureCode };

const REQUIREMENTS = new Set<ResponseRequirementV1>(["attack", "dodge", "negate", "peach"]);
const ROLES = new Set<BotRoleV1>(["Lord", "Loyalist", "Rebel", "Renegade"]);
const DECISION_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const CANDIDATE_ID = /^[a-z0-9][a-z0-9-]{0,31}$/i;
const MAX_CANDIDATES = 16;
const MAX_PUBLIC_OPPONENTS = 8;
const MAX_LABEL_LENGTH = 100;
const MAX_REASON_LENGTH = 160;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: RecordValue, required: readonly string[], optional: readonly string[] = []): boolean {
  const keys = Object.keys(value);
  return required.every((key) => Object.hasOwn(value, key))
    && keys.every((key) => required.includes(key) || optional.includes(key));
}

function isRole(value: unknown): value is BotRoleV1 {
  return typeof value === "string" && ROLES.has(value as BotRoleV1);
}

function isSafeText(value: unknown, maxLength: number): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && value === value.trim()
    && !Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
    });
}

function assertRequest(value: unknown): asserts value is BotDecisionRequestV1 {
  if (!isRecord(value) || !hasExactKeys(value, ["observationVersion", "decisionId", "requirement", "self", "publicContext", "candidates"])) {
    throw new Error("invalid_request");
  }
  if (value.observationVersion !== 1 || typeof value.decisionId !== "string" || !DECISION_ID.test(value.decisionId)) {
    throw new Error("invalid_request");
  }
  if (typeof value.requirement !== "string" || !REQUIREMENTS.has(value.requirement as ResponseRequirementV1)) {
    throw new Error("invalid_request");
  }

  const self = value.self;
  if (!isRecord(self) || !hasExactKeys(self, ["hp", "maxHp", "hasPeach"], ["ownRole"])
    || !Number.isInteger(self.hp) || (self.hp as number) < 1 || (self.hp as number) > 10
    || !Number.isInteger(self.maxHp) || (self.maxHp as number) < 1 || (self.maxHp as number) > 10
    || (self.hp as number) > (self.maxHp as number)
    || typeof self.hasPeach !== "boolean"
    || (Object.hasOwn(self, "ownRole") && !isRole(self.ownRole))) {
    throw new Error("invalid_request");
  }

  const publicContext = value.publicContext;
  if (!isRecord(publicContext) || !hasExactKeys(publicContext, ["revealedOpponents"])
    || !Array.isArray(publicContext.revealedOpponents)
    || publicContext.revealedOpponents.length > MAX_PUBLIC_OPPONENTS) {
    throw new Error("invalid_request");
  }
  for (const opponent of publicContext.revealedOpponents) {
    if (!isRecord(opponent) || !hasExactKeys(opponent, ["revealedRole", "hp"])
      || !isRole(opponent.revealedRole)
      || !Number.isInteger(opponent.hp) || (opponent.hp as number) < 0 || (opponent.hp as number) > 10) {
      throw new Error("invalid_request");
    }
  }

  const candidates = value.candidates;
  if (!Array.isArray(candidates) || candidates.length < 1 || candidates.length > MAX_CANDIDATES) {
    throw new Error("invalid_request");
  }
  const ids = new Set<string>();
  let declineCount = 0;
  for (const candidate of candidates) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ["id", "kind", "label"])) {
      throw new Error("invalid_request");
    }
    if (typeof candidate.id !== "string" || !CANDIDATE_ID.test(candidate.id) || ids.has(candidate.id)) {
      throw new Error("invalid_request");
    }
    ids.add(candidate.id);
    if ((candidate.kind !== "respond" && candidate.kind !== "decline") || !isSafeText(candidate.label, MAX_LABEL_LENGTH)) {
      throw new Error("invalid_request");
    }
    if (candidate.kind === "decline") declineCount += 1;
  }
  if (declineCount !== 1) throw new Error("invalid_request");
}

/**
 * Builds a synthetic, per-decision request from the response fields that the
 * authoritative CurrentAction already exposes. Provider and physical-card IDs
 * are deliberately dropped; this prototype never executes a selected choice.
 */
export function createBotDecisionRequestV1(
  currentAction: CurrentActionResponseProjectionV1,
  decisionId: string,
  self: BotDecisionRequestV1["self"],
  publicContext: BotDecisionRequestV1["publicContext"],
): BotDecisionRequestV1 {
  if (currentAction.version !== 3
    || (currentAction.kind !== "response" && currentAction.kind !== "dying")
    || !currentAction.requirement
    || !REQUIREMENTS.has(currentAction.requirement)
    || !Array.isArray(currentAction.legalActions)) {
    throw new Error("unsupported_decision_family");
  }
  const expectedDecline = currentAction.kind === "dying" ? "skip_rescue" : "decline_response";
  if (currentAction.declineAction !== expectedDecline || !currentAction.legalActions.includes(expectedDecline)) {
    throw new Error("unsupported_decision_family");
  }
  const allowedActions = currentAction.kind === "dying"
    ? new Set(["respond", "skip_rescue", "give_peach"])
    : new Set(["respond", "decline_response"]);
  if (currentAction.legalActions.some((action) => !allowedActions.has(action))) throw new Error("unsupported_decision_family");
  if (currentAction.kind === "dying" && self.hasPeach !== currentAction.legalActions.includes("give_peach")) {
    throw new Error("unsupported_decision_family");
  }
  const options = currentAction.options ?? [];
  if (!Array.isArray(options) || options.length > MAX_CANDIDATES - 1) throw new Error("unsupported_decision_family");
  if ((options.length > 0) !== currentAction.legalActions.includes("respond")) throw new Error("unsupported_decision_family");

  const providerIds = new Set<string>();
  const candidates: BotDecisionCandidateV1[] = options.map((option, index) => {
    if (!isRecord(option) || typeof option.providerId !== "string" || option.providerId.length === 0
      || providerIds.has(option.providerId) || option.satisfies !== currentAction.requirement
      || !isSafeText(option.label, MAX_LABEL_LENGTH)) {
      throw new Error("unsupported_decision_family");
    }
    providerIds.add(option.providerId);
    // A multi-card selection is a separate unresolved decision family. Do not
    // ask a policy to guess a card or expose the eligible physical-card IDs.
    const selection: unknown = option.selection;
    if (selection !== null) {
      if (!isRecord(selection) || selection.type !== "cards"
        || selection.min !== 1 || selection.max !== 1
        || !Array.isArray(selection.eligibleCardIds) || selection.eligibleCardIds.length !== 1
        || typeof selection.eligibleCardIds[0] !== "string") {
        throw new Error("unsupported_decision_family");
      }
    }
    return { id: `candidate-${index + 1}`, kind: "respond", label: option.label };
  });
  if (currentAction.kind === "dying" && currentAction.legalActions.includes("give_peach")) {
    candidates.push({ id: `candidate-${candidates.length + 1}`, kind: "respond", label: "Give Peach" });
  }
  candidates.push({
    id: `candidate-${candidates.length + 1}`,
    kind: "decline",
    label: currentAction.kind === "dying" ? "Skip rescue" : "Decline response",
  });

  const request: BotDecisionRequestV1 = {
    observationVersion: 1,
    decisionId,
    requirement: currentAction.requirement,
    self,
    publicContext,
    candidates,
  };
  assertRequest(request);
  return request;
}

export class BotDecisionTransportError extends Error {
  constructor(readonly kind: "http" | "timeout" | "transport", readonly statusCode?: number) {
    super(kind);
    this.name = "BotDecisionTransportError";
  }
}

class BotDecisionParseError extends Error {
  constructor(readonly code: Extract<BotDecisionFailureCode, "invalid_response" | "unknown_candidate" | "stale_decision" | "stale_observation">) {
    super(code);
    this.name = "BotDecisionParseError";
  }
}

function parseOutput(value: unknown, request: BotDecisionRequestV1): BotDecisionResultV1 {
  let decoded = value;
  if (typeof value === "string") {
    try {
      decoded = JSON.parse(value) as unknown;
    } catch {
      throw new BotDecisionParseError("invalid_response");
    }
  }
  if (!isRecord(decoded) || !hasExactKeys(decoded, ["observationVersion", "decisionId", "selectedCandidateId", "reason"])) {
    throw new BotDecisionParseError("invalid_response");
  }
  if (decoded.observationVersion !== request.observationVersion) throw new BotDecisionParseError("stale_observation");
  if (decoded.decisionId !== request.decisionId) throw new BotDecisionParseError("stale_decision");
  if (typeof decoded.selectedCandidateId !== "string" || !request.candidates.some(({ id }) => id === decoded.selectedCandidateId)) {
    throw new BotDecisionParseError("unknown_candidate");
  }
  if (!isSafeText(decoded.reason, MAX_REASON_LENGTH)) throw new BotDecisionParseError("invalid_response");
  return {
    observationVersion: 1,
    decisionId: request.decisionId,
    selectedCandidateId: decoded.selectedCandidateId,
    reason: decoded.reason,
  };
}

function failure(code: BotDecisionFailureCode): BotDecisionOutcome {
  return { status: "failed", code };
}

async function awaitTransport(
  request: BotDecisionRequestV1,
  transport: BotDecisionTransport,
  timeoutMs: number,
): Promise<BotDecisionTransportReply> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new BotDecisionTransportError("timeout")), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(() => transport(request)), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Runs one injected transport. No fetch, credentials, retries, or fallback exist here. */
export async function requestBotDecisionV1(
  request: BotDecisionRequestV1,
  transport: BotDecisionTransport,
  timeoutMs = 1_000,
): Promise<BotDecisionOutcome> {
  try {
    assertRequest(request);
  } catch {
    return failure("invalid_request");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10_000) return failure("invalid_request");

  let reply: BotDecisionTransportReply;
  try {
    reply = await awaitTransport(request, transport, timeoutMs);
  } catch (error) {
    if (error instanceof BotDecisionTransportError) {
      if (error.kind === "timeout") return failure("timeout");
      if (error.kind === "http" && error.statusCode === 429) return failure("rate_limited");
      if (error.kind === "http" && typeof error.statusCode === "number" && error.statusCode >= 500 && error.statusCode <= 599) return failure("server_error");
    }
    return failure("transport_error");
  }

  if (!isRecord(reply) || typeof reply.status !== "string") return failure("invalid_response");
  if (reply.status === "incomplete") return failure("incomplete");
  if (reply.status === "refusal") return failure("refusal");
  if (reply.status !== "completed" || !Object.hasOwn(reply, "output")) return failure("invalid_response");
  try {
    return { status: "selected", result: parseOutput(reply.output, request) };
  } catch (error) {
    if (error instanceof BotDecisionParseError) return failure(error.code);
    return failure("invalid_response");
  }
}
