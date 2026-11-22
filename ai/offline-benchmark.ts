import { offlineDecisionFixtures } from "./decision-fixtures";
import {
  createBotDecisionRequestV1,
  requestBotDecisionV1,
  type BotDecisionFailureCode,
  type BotDecisionRequestV1,
  type BotDecisionTransportReply,
} from "./decision-prototype";

type Outcome =
  | { status: "selected"; candidateId: string }
  | { status: "abstained" }
  | { status: "rejected"; code: BotDecisionFailureCode };

export type OfflineBenchmarkCase = Readonly<{
  id: string;
  request: BotDecisionRequestV1;
  allowedCandidateIds: readonly string[];
  hasMeaningfulStrategicPreference: boolean;
  preferredCandidateIds?: readonly string[];
  expected: { status: "selected" } | Exclude<Outcome, { status: "selected" }>;
  expectedTransportCalls: 0 | 1;
  timeoutMs?: number;
}>;

type MockReply = BotDecisionTransportReply | { status: "abstain" };
type MockTransport = (request: BotDecisionRequestV1, caseId: string) => Promise<MockReply>;

const selected = { status: "selected" } as const;
const privacyProbe = {
  version: 3 as const,
  kind: "response",
  requirement: "dodge" as const,
  actorId: "synthetic-private-actor",
  legalActions: ["respond", "decline_response"],
  declineAction: "decline_response",
  options: [{ providerId: "synthetic-private-provider", satisfies: "dodge" as const, label: "Play Dodge",
    selection: { type: "cards" as const, min: 1, max: 1, eligibleCardIds: ["synthetic-private-card"] } }],
  hiddenRole: "synthetic-private-role",
};
const publicContext = { revealedOpponents: [] };
const self = { hp: 2, maxHp: 4, hasPeach: false };

function syntheticCase(
  id: string,
  expected: OfflineBenchmarkCase["expected"],
  changes: Partial<OfflineBenchmarkCase> = {},
): OfflineBenchmarkCase {
  const request = createBotDecisionRequestV1(privacyProbe, `eval-${id}`, self, publicContext);
  return { id, request, allowedCandidateIds: request.candidates.map(({ id }) => id),
    hasMeaningfulStrategicPreference: false, expected, expectedTransportCalls: 1, ...changes };
}

export function offlineBenchmarkCases(): OfflineBenchmarkCase[] {
  const invalidPrivate = syntheticCase("reject-private-field", { status: "rejected", code: "invalid_request" }, { expectedTransportCalls: 0 });
  const injectedRequest = { ...invalidPrivate.request, hiddenRole: privacyProbe.hiddenRole };
  const fixtureCases = offlineDecisionFixtures.map((fixture): OfflineBenchmarkCase => {
    // The existing rescue fixtures explicitly prefer helping within their
    // synthetic scenario. Their supplied skip option remains legal.
    const hasMeaningfulStrategicPreference = fixture.acceptableCandidateIds.length < fixture.request.candidates.length;
    return {
      id: fixture.id, request: fixture.request,
      allowedCandidateIds: fixture.request.candidates.map(({ id }) => id),
      hasMeaningfulStrategicPreference,
      ...(hasMeaningfulStrategicPreference ? { preferredCandidateIds: fixture.acceptableCandidateIds } : {}),
      expected: selected, expectedTransportCalls: 1,
    };
  });
  return [
    ...fixtureCases,
    { ...invalidPrivate, request: injectedRequest },
    syntheticCase("omit-private-projection", selected),
    syntheticCase("unknown-candidate", { status: "rejected", code: "unknown_candidate" }),
    syntheticCase("unsolicited-action-fields", { status: "rejected", code: "invalid_response" }),
    syntheticCase("wrong-decision", { status: "rejected", code: "stale_decision" }),
    syntheticCase("wrong-version", { status: "rejected", code: "stale_observation" }),
    syntheticCase("refusal", { status: "rejected", code: "refusal" }),
    syntheticCase("timeout", { status: "rejected", code: "timeout" }, { timeoutMs: 25 }),
    syntheticCase("abstain", { status: "abstained" }),
  ];
}

export async function offlineFixtureTransport(request: BotDecisionRequestV1, caseId: string): Promise<MockReply> {
  if (caseId === "refusal") return { status: "refusal" };
  if (caseId === "abstain") return { status: "abstain" };
  if (caseId === "timeout") return new Promise(() => {});
  const fixture = offlineDecisionFixtures.find(({ id }) => id === caseId);
  return {
    status: "completed",
    output: {
      observationVersion: caseId === "wrong-version" ? 2 : request.observationVersion,
      decisionId: caseId === "wrong-decision" ? "other-synthetic-decision" : request.decisionId,
      selectedCandidateId: caseId === "unknown-candidate" ? "invented-choice" : fixture?.mockSelectedCandidateId ?? "candidate-1",
      reason: "Fixed synthetic reply.",
      ...(caseId === "unsolicited-action-fields" ? { targetId: "invented-target" } : {}),
    },
  };
}

export async function evaluateOfflineBenchmark(cases: readonly OfflineBenchmarkCase[], transport: MockTransport) {
  const results = [];
  for (const fixture of cases) {
    const startedAt = performance.now();
    let transportCalls = 0;
    let abstained = false;
    const decision = await requestBotDecisionV1(fixture.request, async (request) => {
      transportCalls++;
      const reply = await transport(request, fixture.id);
      if (reply.status !== "abstain") return reply;
      abstained = true;
      return { status: "refusal" };
    }, fixture.timeoutMs ?? 250);
    const outcome: Outcome = decision.status === "selected" ? { status: "selected", candidateId: decision.result.selectedCandidateId }
      : abstained && decision.code === "refusal" ? { status: "abstained" } : { status: "rejected", code: decision.code };
    const legalSelection = outcome.status === "selected" && fixture.allowedCandidateIds.includes(outcome.candidateId);
    const preference = !fixture.hasMeaningfulStrategicPreference ? "UNDERDETERMINED"
      : legalSelection && outcome.status === "selected"
        ? fixture.preferredCandidateIds?.includes(outcome.candidateId) ? "MATCH" : "MISS" : "UNSCORED";
    const passed = transportCalls === fixture.expectedTransportCalls && outcome.status === fixture.expected.status
      && (outcome.status !== "selected" || legalSelection)
      && (outcome.status !== "rejected" || fixture.expected.status === "rejected" && outcome.code === fixture.expected.code);
    results.push({ id: fixture.id, outcome, legalSelection, preference, passed, transportCalls,
      elapsedMs: Math.round((performance.now() - startedAt) * 100) / 100 });
  }
  const summary = {
    cases: results.length,
    passed: results.filter(({ passed }) => passed).length,
    validSelections: results.filter(({ legalSelection }) => legalSelection).length,
    abstentions: results.filter(({ outcome }) => outcome.status === "abstained").length,
    rejections: results.filter(({ outcome }) => outcome.status === "rejected").length,
    modelTokens: 0,
    apiSpend: 0,
  };
  return { results, summary };
}
