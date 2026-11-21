import type { CurrentAction, ResponseOptionView } from "../game/protocol";
import {
  createBotDecisionRequestV1,
  type BotDecisionRequestV1,
  type BotDecisionResultV1,
} from "./decision-prototype";

export type ResponseCandidatePayloadV1 = Readonly<{
  action: "respond" | "give_peach" | "decline_response" | "skip_rescue";
  providerId?: string;
  cardId?: string;
  windowId?: string;
}>;

export type ResponseCandidateBridgeInputV1 = {
  currentAction: CurrentAction;
  decisionId: string;
  actorId: string;
  actionRevision: string;
  decisionConsumed: boolean;
  self: BotDecisionRequestV1["self"];
  publicContext: BotDecisionRequestV1["publicContext"];
};

export type ResponseCandidateAuthorityV1 = {
  decisionId: string;
  actorId: string;
  actionRevision: string;
  decisionConsumed: boolean;
};

export type ResponseCandidateResolutionV1 =
  | { status: "resolved"; payload: ResponseCandidatePayloadV1 }
  | { status: "denied"; code: "invalid_authority" | "invalid_result" | "stale_decision" | "actor_mismatch" | "stale_revision" | "decision_consumed" | "unknown_candidate" };

export type ResponseCandidateBridgeV1 = {
  /** Only this projection may be passed to a decision policy or transport. */
  request: BotDecisionRequestV1;
  /** Resolves once to an inert payload after matching the latest caller snapshot. */
  resolveResult(result: unknown, current: ResponseCandidateAuthorityV1): ResponseCandidateResolutionV1;
};

export class ResponseCandidateBridgeError extends Error {
  constructor(readonly code: "invalid_context" | "decision_consumed" | "unsupported_decision_family" | "invalid_request") {
    super(code);
    this.name = "ResponseCandidateBridgeError";
  }
}

const RESPONSE_LABELS = new Set([
  "Play Attack",
  "Play Dodge",
  "Play Negation",
  "Play Peach",
  "Use Eight Trigrams",
  "Use Empress Dowager as Dodge",
  "Use Braveheart as Attack",
  "Use Braveheart as Dodge",
  "Use God of War as Attack",
  "Use a red card as Peach (First Aid)",
  "Use Entourage — ask Wei",
  "Use Influencing — ask Shu",
]);

const DECLINE_LABELS = {
  decline_response: "Decline response",
  skip_rescue: "Skip rescue",
} as const;
const GIVE_PEACH_LABEL = "Give Peach";

type InternalPayloadInput = Omit<ResponseCandidatePayloadV1, never>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeOpaque(value: unknown, maxLength = 1024): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && value === value.trim()
    && !Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
    });
}

function unsupported(): never {
  throw new ResponseCandidateBridgeError("unsupported_decision_family");
}

function freezeRequest(request: BotDecisionRequestV1): BotDecisionRequestV1 {
  for (const candidate of request.candidates) Object.freeze(candidate);
  Object.freeze(request.candidates);
  for (const opponent of request.publicContext.revealedOpponents) Object.freeze(opponent);
  Object.freeze(request.publicContext.revealedOpponents);
  Object.freeze(request.publicContext);
  Object.freeze(request.self);
  return Object.freeze(request);
}

function currentWindowId(currentAction: CurrentAction): string | undefined {
  if (currentAction.sharedWindow && currentAction.negationWindowId) return unsupported();
  if (currentAction.sharedWindow) {
    const window = currentAction.sharedWindow;
    if (!safeOpaque(window.windowId, 200) || window.locked !== false || window.choice !== null) return unsupported();
    return window.windowId;
  }
  if (currentAction.negationWindowId !== undefined) {
    if (!safeOpaque(currentAction.negationWindowId, 200)) return unsupported();
    return currentAction.negationWindowId;
  }
  return undefined;
}

function payloadForOption(option: ResponseOptionView, windowId: string | undefined): ResponseCandidatePayloadV1 {
  if (!RESPONSE_LABELS.has(option.label) || !safeOpaque(option.providerId, 64)) return unsupported();
  if (option.selection === null) {
    return Object.freeze({ action: "respond", providerId: option.providerId, ...(windowId ? { windowId } : {}) });
  }
  const selection = option.selection;
  if (selection.type !== "cards" || selection.min !== 1 || selection.max !== 1
    || selection.eligibleCardIds.length !== 1 || !safeOpaque(selection.eligibleCardIds[0], 200)) {
    return unsupported();
  }
  return Object.freeze({
    action: "respond",
    providerId: option.providerId,
    cardId: selection.eligibleCardIds[0],
    ...(windowId ? { windowId } : {}),
  });
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function validDecisionResult(value: unknown): value is BotDecisionResultV1 {
  return isRecord(value)
    && hasExactKeys(value, ["observationVersion", "decisionId", "selectedCandidateId", "reason"])
    && value.observationVersion === 1
    && safeOpaque(value.decisionId, 64)
    && safeOpaque(value.selectedCandidateId, 32)
    && safeOpaque(value.reason, 160);
}

/**
 * Creates a one-use offline bridge. Its internal provider/card/window bindings
 * are held only in the resolver closure and never appear on the model request.
 * Resolving returns data only; a future server executor must still revalidate
 * live state atomically through the canonical game paths.
 */
export function createResponseCandidateBridgeV1(input: ResponseCandidateBridgeInputV1): ResponseCandidateBridgeV1 {
  const { currentAction, decisionId, actorId, actionRevision, decisionConsumed } = input;
  if (!safeOpaque(decisionId, 64) || !safeOpaque(actorId, 200) || !safeOpaque(actionRevision)) {
    throw new ResponseCandidateBridgeError("invalid_context");
  }
  if (typeof decisionConsumed !== "boolean") throw new ResponseCandidateBridgeError("invalid_context");
  if (decisionConsumed) throw new ResponseCandidateBridgeError("decision_consumed");
  if (!currentAction || currentAction.version !== 3 || currentAction.actorId !== actorId) {
    throw new ResponseCandidateBridgeError("invalid_context");
  }
  if (currentAction.kind !== "response" && currentAction.kind !== "dying") return unsupported();
  if (currentAction.kind === "response"
    && currentAction.requirement !== "attack" && currentAction.requirement !== "dodge" && currentAction.requirement !== "negate") return unsupported();
  if (currentAction.kind === "dying" && currentAction.requirement !== "peach") return unsupported();
  if (currentAction.negationWindowId && currentAction.requirement !== "negate") return unsupported();

  const windowId = currentWindowId(currentAction);
  let request: BotDecisionRequestV1;
  try {
    request = createBotDecisionRequestV1(currentAction, decisionId, input.self, input.publicContext);
  } catch (error) {
    const code = error instanceof Error && error.message === "invalid_request" ? "invalid_request" : "unsupported_decision_family";
    throw new ResponseCandidateBridgeError(code);
  }

  const options = currentAction.options ?? [];
  const payloadByCandidateId: Record<string, ResponseCandidatePayloadV1> = Object.create(null);
  let candidateIndex = 0;

  const bind = (candidateId: string, payload: InternalPayloadInput) => {
    if (Object.hasOwn(payloadByCandidateId, candidateId)) return unsupported();
    payloadByCandidateId[candidateId] = Object.freeze(payload);
  };

  for (const option of options) {
    if (!RESPONSE_LABELS.has(option.label)) return unsupported();
    const candidate = request.candidates[candidateIndex];
    if (!candidate || candidate.kind !== "respond" || candidate.label !== option.label) return unsupported();
    bind(candidate.id, payloadForOption(option, windowId));
    candidateIndex += 1;
  }

  if (currentAction.kind === "dying" && currentAction.legalActions.includes("give_peach")) {
    const candidate = request.candidates[candidateIndex];
    const peachOptions = options.filter((option) => option.satisfies === "peach");
    if (!candidate || candidate.kind !== "respond" || candidate.label !== GIVE_PEACH_LABEL || peachOptions.length !== 1) return unsupported();
    const peach = peachOptions[0];
    const peachPayload = payloadForOption(peach, windowId);
    if (!peachPayload.cardId || !peachPayload.providerId) return unsupported();
    bind(candidate.id, { ...peachPayload, action: "give_peach" });
    candidateIndex += 1;
  }

  const declineCandidate = request.candidates[candidateIndex];
  const declineAction = currentAction.declineAction;
  if ((declineAction !== "decline_response" && declineAction !== "skip_rescue")
    || !declineCandidate || declineCandidate.kind !== "decline"
    || declineCandidate.label !== DECLINE_LABELS[declineAction]) return unsupported();
  bind(declineCandidate.id, { action: declineAction, ...(windowId ? { windowId } : {}) });
  candidateIndex += 1;
  if (candidateIndex !== request.candidates.length) return unsupported();

  const frozenRequest = freezeRequest(request);
  const bindings = Object.freeze(payloadByCandidateId);
  let consumed = false;
  const bridge: ResponseCandidateBridgeV1 = {
    request: frozenRequest,
    resolveResult(result, current) {
      if (!isRecord(current) || !hasExactKeys(current, ["decisionId", "actorId", "actionRevision", "decisionConsumed"])
        || typeof current.decisionConsumed !== "boolean") return { status: "denied", code: "invalid_authority" };
      if (current.decisionId !== decisionId) return { status: "denied", code: "stale_decision" };
      if (current.actorId !== actorId) return { status: "denied", code: "actor_mismatch" };
      if (current.actionRevision !== actionRevision) return { status: "denied", code: "stale_revision" };
      if (current.decisionConsumed === true || consumed) return { status: "denied", code: "decision_consumed" };
      if (!validDecisionResult(result)) return { status: "denied", code: "invalid_result" };
      if (result.observationVersion !== frozenRequest.observationVersion || result.decisionId !== decisionId) {
        return { status: "denied", code: "stale_decision" };
      }
      if (!Object.hasOwn(bindings, result.selectedCandidateId)) return { status: "denied", code: "unknown_candidate" };
      consumed = true;
      return { status: "resolved", payload: bindings[result.selectedCandidateId] };
    },
  };
  return Object.freeze(bridge);
}
