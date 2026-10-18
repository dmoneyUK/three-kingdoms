import assert from "node:assert/strict";
import test from "node:test";
import { offlineDecisionFixtures } from "../ai/decision-fixtures.ts";
import {
  BotDecisionTransportError,
  createBotDecisionRequestV1,
  requestBotDecisionV1,
} from "../ai/decision-prototype.ts";

const completed = (request, selectedCandidateId, reason = "Selected a supplied candidate.") => ({
  status: "completed",
  output: JSON.stringify({
    observationVersion: request.observationVersion,
    decisionId: request.decisionId,
    selectedCandidateId,
    reason,
  }),
});

test("offline decision fixtures use only supplied candidate IDs", async (t) => {
  assert.equal(offlineDecisionFixtures.length >= 10 && offlineDecisionFixtures.length <= 20, true);
  for (const fixture of offlineDecisionFixtures) {
    await t.test(fixture.id, async () => {
      assert.ok(fixture.acceptableCandidateIds.includes(fixture.mockSelectedCandidateId));
      let receivedRequest;
      const outcome = await requestBotDecisionV1(fixture.request, async (request) => {
        receivedRequest = request;
        return completed(request, fixture.mockSelectedCandidateId, fixture.rationale);
      });
      assert.equal(outcome.status, "selected");
      assert.equal(receivedRequest, fixture.request);
      assert.ok(fixture.request.candidates.some(({ id }) => id === outcome.result.selectedCandidateId));
      assert.ok(fixture.acceptableCandidateIds.includes(outcome.result.selectedCandidateId));
    });
  }
});

test("response request projection strips actor, provider and physical-card identifiers", () => {
  const response = {
    version: 3,
    kind: "response",
    actorId: "synthetic-actor-private-id",
    requirement: "dodge",
    legalActions: ["respond", "decline_response"],
    declineAction: "decline_response",
    options: [{
      providerId: "synthetic-provider-private-id",
      satisfies: "dodge",
      activation: "explicit",
      label: "Use Braveheart as Dodge",
      playedAs: "dodge",
      selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["synthetic-card-private-id"] },
    }],
    // Irrelevant CurrentAction fields are intentionally not copied.
    playerRows: [{ id: "private-player", hand: ["private-card"], hiddenRole: "Renegade" }],
  };
  const request = createBotDecisionRequestV1(
    response,
    "fixture-projection",
    { hp: 3, maxHp: 4, hasPeach: false, ownRole: "Rebel" },
    { revealedOpponents: [{ revealedRole: "Lord", hp: 1 }] },
  );
  const serialized = JSON.stringify(request);
  for (const forbidden of ["synthetic-actor-private-id", "synthetic-provider-private-id", "synthetic-card-private-id", "private-player", "hiddenRole", "playerRows"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(request.candidates, [
    { id: "candidate-1", kind: "respond", label: "Use Braveheart as Dodge" },
    { id: "candidate-2", kind: "decline", label: "Decline response" },
  ]);
});

test("a response with no legal provider exposes only its authoritative decline", () => {
  const request = createBotDecisionRequestV1({
    version: 3,
    kind: "response",
    requirement: "dodge",
    legalActions: ["decline_response"],
    declineAction: "decline_response",
    options: [],
  }, "fixture-no-provider", { hp: 2, maxHp: 4, hasPeach: false }, { revealedOpponents: [] });
  assert.deepEqual(request.candidates, [{ id: "candidate-1", kind: "decline", label: "Decline response" }]);
});

test("the current Dying response projection preserves only Peach-or-skip choices", () => {
  const request = createBotDecisionRequestV1({
    version: 3,
    kind: "dying",
    requirement: "peach",
    legalActions: ["respond", "skip_rescue", "give_peach"],
    declineAction: "skip_rescue",
    options: [{
      providerId: "private-peach-provider",
      satisfies: "peach",
      activation: "implicit",
      label: "Play Peach",
      playedAs: "peach",
      selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["private-peach-card"] },
    }],
  }, "fixture-dying-peach", { hp: 1, maxHp: 4, hasPeach: true }, { revealedOpponents: [] });
  assert.deepEqual(request.candidates, [
    { id: "candidate-1", kind: "respond", label: "Play Peach" },
    { id: "candidate-2", kind: "respond", label: "Give Peach" },
    { id: "candidate-3", kind: "decline", label: "Skip rescue" },
  ]);
  assert.equal(JSON.stringify(request).includes("private-peach-card"), false);
  assert.equal(JSON.stringify(request).includes("private-peach-provider"), false);
});

test("play-phase decisions with no legal target are unsupported and never reach transport", async () => {
  let called = false;
  const currentAction = {
    version: 3,
    kind: "turn",
    actorId: "synthetic-actor",
    legalActions: ["end_turn"],
    canDeclareAttack: false,
    playPhaseActions: [],
  };
  assert.throws(() => createBotDecisionRequestV1(currentAction, "fixture-no-target", { hp: 3, maxHp: 4, hasPeach: false }, { revealedOpponents: [] }), /unsupported_decision_family/);
  const outcome = await requestBotDecisionV1({
    observationVersion: 1,
    decisionId: "fixture-no-target",
    requirement: "attack",
    self: { hp: 3, maxHp: 4, hasPeach: false },
    publicContext: { revealedOpponents: [] },
    candidates: [],
  }, async () => {
    called = true;
    return { status: "refusal" };
  });
  assert.deepEqual(outcome, { status: "failed", code: "invalid_request" });
  assert.equal(called, false);
});

test("duplicate candidate IDs are rejected before the injected transport runs", async () => {
  let called = false;
  const invalid = {
    ...offlineDecisionFixtures[0].request,
    candidates: [
      { id: "duplicate", kind: "respond", label: "Play Dodge" },
      { id: "duplicate", kind: "decline", label: "Decline response" },
    ],
  };
  const outcome = await requestBotDecisionV1(invalid, async () => {
    called = true;
    return { status: "refusal" };
  });
  assert.deepEqual(outcome, { status: "failed", code: "invalid_request" });
  assert.equal(called, false);
});

test("hidden hand, hidden role and arbitrary request fields fail closed", async () => {
  const base = offlineDecisionFixtures[0].request;
  const invalidRequests = [
    { ...base, hand: ["hidden-card"] },
    { ...base, publicContext: { revealedOpponents: [{ revealedRole: "Lord", hp: 2, hiddenRole: "Rebel" }] } },
    { ...base, self: { ...base.self, hand: ["hidden-card"] } },
    { ...base, publicContext: { revealedOpponents: [], rawRoom: { sessionToken: "synthetic-secret" } } },
  ];
  for (const request of invalidRequests) {
    const outcome = await requestBotDecisionV1(request, async () => ({ status: "refusal" }));
    assert.deepEqual(outcome, { status: "failed", code: "invalid_request" });
  }
});

test("candidate IDs may be reused only in a separately identified decision", async () => {
  const [first, second] = offlineDecisionFixtures.filter((fixture) => fixture.request.candidates.some(({ id }) => id === "candidate-1")).slice(0, 2);
  assert.notEqual(first.request.decisionId, second.request.decisionId);
  for (const fixture of [first, second]) {
    const outcome = await requestBotDecisionV1(fixture.request, async (request) => completed(request, "candidate-1"));
    assert.equal(outcome.status, "selected");
    assert.equal(outcome.result.decisionId, fixture.request.decisionId);
  }
});

test("missing, malformed, extra-field and overlong responses fail closed", async (t) => {
  const request = offlineDecisionFixtures[0].request;
  const badReplies = [
    { status: "completed", output: {} },
    { status: "completed", output: "not json" },
    { status: "completed", output: { observationVersion: 1, decisionId: request.decisionId, reason: "No candidate" } },
    { status: "completed", output: { observationVersion: 1, decisionId: request.decisionId, selectedCandidateId: "not-supplied", reason: "No" } },
    { status: "completed", output: { observationVersion: 1, decisionId: request.decisionId, selectedCandidateId: "candidate-1", reason: "R".repeat(161) } },
    { status: "completed", output: { observationVersion: 1, decisionId: request.decisionId, selectedCandidateId: "candidate-1", reason: "Valid", unexpected: true } },
    { status: "completed", output: { observationVersion: 0, decisionId: request.decisionId, selectedCandidateId: "candidate-1", reason: "Stale version" } },
    { status: "completed", output: { observationVersion: 1, decisionId: "older-decision", selectedCandidateId: "candidate-1", reason: "Stale decision" } },
  ];
  const expectedCodes = ["invalid_response", "invalid_response", "invalid_response", "unknown_candidate", "invalid_response", "invalid_response", "stale_observation", "stale_decision"];
  for (let index = 0; index < badReplies.length; index += 1) {
    await t.test(`invalid result ${index + 1}`, async () => {
      assert.deepEqual(await requestBotDecisionV1(request, async () => badReplies[index]), { status: "failed", code: expectedCodes[index] });
    });
  }
});

test("incomplete, refusal, 429, 5xx, timeout and transport errors are bounded without fallback", async () => {
  const request = offlineDecisionFixtures[0].request;
  const cases = [
    [async () => ({ status: "incomplete" }), "incomplete"],
    [async () => ({ status: "refusal" }), "refusal"],
    [async () => { throw new BotDecisionTransportError("http", 429); }, "rate_limited"],
    [async () => { throw new BotDecisionTransportError("http", 503); }, "server_error"],
    [async () => { throw new BotDecisionTransportError("timeout"); }, "timeout"],
    [async () => { throw new Error("synthetic raw provider secret"); }, "transport_error"],
  ];
  for (const [transport, code] of cases) {
    const outcome = await requestBotDecisionV1(request, transport);
    assert.deepEqual(outcome, { status: "failed", code });
    assert.equal(JSON.stringify(outcome).includes("synthetic raw provider secret"), false);
    assert.equal(Object.hasOwn(outcome, "result"), false);
  }
});

test("a never-settling mock transport hits the bounded timeout", async () => {
  const request = offlineDecisionFixtures[0].request;
  const outcome = await requestBotDecisionV1(request, () => new Promise(() => {}), 5);
  assert.deepEqual(outcome, { status: "failed", code: "timeout" });
});

test("multi-card selections and duplicate source providers are unsupported", () => {
  const base = {
    version: 3,
    kind: "response",
    requirement: "dodge",
    legalActions: ["respond", "decline_response"],
    declineAction: "decline_response",
  };
  const option = {
    providerId: "physical-dodge",
    satisfies: "dodge",
    activation: "implicit",
    label: "Play Dodge",
    selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["card-1", "card-2"] },
  };
  assert.throws(() => createBotDecisionRequestV1({ ...base, options: [option] }, "fixture-multi-card", { hp: 2, maxHp: 4, hasPeach: false }, { revealedOpponents: [] }), /unsupported_decision_family/);
  assert.throws(() => createBotDecisionRequestV1({ ...base, options: [option, { ...option }] }, "fixture-duplicate-provider", { hp: 2, maxHp: 4, hasPeach: false }, { revealedOpponents: [] }), /unsupported_decision_family/);
});
