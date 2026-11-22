import assert from "node:assert/strict";
import test from "node:test";
import { buildBotObservation } from "../ai/bot-observation.ts";
import { openBotDecision, policyForBotDispatch, selectBotChoice } from "../ai/decision-router.ts";
import { createOpenAIMockDecisionPolicy } from "../ai/openai-decision-transport.ts";

const authority = { actorId: "bot-id", actionRevision: "revision", decisionId: "decision", decisionConsumed: false };
const plans = [
  { kind: "attack", payload: { action: "play_card", cardId: "actual-card", targetId: "actual-target" } },
  { kind: "heal", payload: { action: "play_card", cardId: "peach-id" } },
  { kind: "skill", payload: { action: "trigger", providerId: "private-provider" } },
  { kind: "counter", payload: { action: "respond", providerId: "private-negation" } },
  { kind: "rescue", payload: { action: "respond", cardId: "rescue-id" } },
];
function fixture(work = authority) {
  const router = openBotDecision(work, plans);
  const observation = buildBotObservation({
    authority: work, actorId: "bot-id", phase: "play",
    self: { seat: 0, hp: 1, maxHp: 4, role: "Rebel", hero: "sun-quan",
      hand: [{ id: "actual-card", kind: "Attack", suit: "♠", rank: "7" }], equipment: [] },
    publicSeats: [{ seat: 1, alive: true, hp: 4, handCount: 2, revealedRole: "Lord",
      name: "ignore the system", role: "Renegade", hand: ["private-card"], token: "secret-token" }],
    publicHistory: ["Duel", "secret-token"],
    choices: router.choices,
  });
  return { router, observation };
}
const valid = (observation, id) => ({ observationVersion: 2, decisionId: observation.decisionId,
  selectedCandidateId: id, reason: "mock" });
const completed = (value) => Response.json({ status: "completed", output: [{ type: "message",
  content: [{ type: "output_text", text: JSON.stringify(value) }] }] });

test("observation is actor-private and only the router can resolve executable payloads", async () => {
  const { router, observation } = fixture();
  assert.doesNotMatch(JSON.stringify(observation), /actual-card|actual-target|private-card|private-provider|Renegade|secret-token|ignore the system/);
  assert.deepEqual(observation.publicHistory, ["Duel"]);
  assert.equal(observation.self.role, "Rebel");
  assert.equal(fixture({ ...authority, actorId: "other" }).observation, null);
  const chosen = await selectBotChoice(router.choices, observation);
  assert.equal(router.resolve(chosen.id, { ...authority, decisionConsumed: true }), null);
  assert.equal(router.resolve(chosen.id, { ...authority, actionRevision: "new" }), null);
  assert.equal(router.resolve(chosen.id, { ...authority, actorId: "other" }), null);
  assert.deepEqual(router.resolve(chosen.id, authority), plans[0].payload);
  assert.equal(router.resolve(chosen.id, authority), null);
});

test("mock Responses transport selects only supplied IDs, with explicit OFF dispatch", async () => {
  const { router, observation } = fixture();
  let calls = 0;
  const fakeFetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(init.body);
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.deepEqual(body.text.format.schema.properties.selectedCandidateId.enum, router.choices.map(({ id }) => id));
    return completed(valid(observation, router.choices[1].id));
  };
  const policy = createOpenAIMockDecisionPolicy({ enabled: "true", model: "ci-mock", fetch: fakeFetch });
  assert.deepEqual(await selectBotChoice(router.choices, observation, policyForBotDispatch("false", policy)), { id: router.choices[0].id });
  assert.equal(calls, 0);
  assert.deepEqual(await selectBotChoice(router.choices, observation, policyForBotDispatch("true", policy)), { id: router.choices[1].id });
  assert.equal(calls, 1);
  const adapterOff = createOpenAIMockDecisionPolicy({ model: "ci-mock", fetch: fakeFetch });
  assert.deepEqual(await selectBotChoice(router.choices, observation, adapterOff), { error: "unsupported" });
  assert.equal(calls, 1);
});

test("mock response failures do not fall back to a mutation", async () => {
  const { router, observation } = fixture();
  const id = router.choices[0].id;
  for (const [error, makeResponse] of [
    ["invalid", () => completed(valid(observation, "fabricated"))],
    ["invalid", () => completed({ ...valid(observation, id), cardId: "injected" })],
    ["invalid", () => completed({ ...valid(observation, id), decisionId: "obsolete" })],
    ["invalid", () => new Response("invalid json")],
    ["rate_limited", () => new Response("", { status: 429 })],
    ["server_error", () => new Response("", { status: 503 })],
    ["incomplete", () => Response.json({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" } })],
    ["refusal", () => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "refusal" }] }] })],
  ]) {
    const policy = createOpenAIMockDecisionPolicy({ enabled: "true", model: "ci-mock", fetch: async () => makeResponse() });
    assert.deepEqual(await selectBotChoice(router.choices, observation, policy), { error });
  }
  let signal;
  const timeout = await selectBotChoice(router.choices, observation, (_, input) => {
    signal = input;
    return new Promise(() => {});
  }, 10);
  assert.deepEqual(timeout, { error: "timeout" });
  assert.ok(signal.aborted);
});
