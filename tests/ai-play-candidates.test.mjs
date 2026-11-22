import assert from "node:assert/strict";
import test from "node:test";
import { buildPlayCandidates, MAX_PLAY_CANDIDATES } from "../ai/play-candidates.ts";

const authority = { decisionId: "decision-private", actorId: "bot-private", actionRevision: "revision-private", decisionConsumed: false };
const eligibility = (cardId, eligibleTargetIds) => ({ mode: "card", effectiveKind: "Attack", cardId, eligibleTargetIds, rejections: [] });
const fixture = (options = {}) => ({
  ...authority,
  phase: "play",
  selfHand: [{ id: "private-b", kind: "Attack" }, { id: "private-a", kind: "Attack" }],
  publicSeatContext: [{ id: "target-two", seat: 2 }, { id: "target-one", seat: 1 }, { id: "out-of-range", seat: 3 }],
  currentAction: { version: 3, kind: "turn", actorId: authority.actorId, legalActions: ["play_card", "end_turn"],
    canDeclareAttack: true, playTargetEligibility: [eligibility("private-a", ["target-two", "target-one"]), eligibility("private-b", ["target-one"])] },
  ...options,
});

test("play catalogue uses each physical card's own eligible targets and keeps canonical payloads private", () => {
  const input = fixture();
  const catalog = buildPlayCandidates(input);
  assert.equal(catalog.status, "ready");
  assert.deepEqual(catalog.publicChoices.map(({ kind }) => kind), ["attack", "attack", "attack", "end_turn"]);
  assert.doesNotMatch(JSON.stringify(catalog.publicChoices), /private|target-one|target-two|out-of-range/);
  assert.equal(new Set(catalog.publicChoices.map(({ id }) => id)).size, 4);
  const requested = [["private-a", "target-one"], ["private-a", "target-two"], ["private-b", "target-one"]];
  for (const [idx, [cardId, targetId]] of requested.entries()) {
    const fresh = buildPlayCandidates(input);
    const choice = fresh.publicChoices[idx];
    assert.deepEqual(fresh.resolve(choice.id, authority), { action: "play_card", cardId, targetId, actionRevision: authority.actionRevision });
  }
  assert.deepEqual(catalog.resolve(catalog.publicChoices[3].id, authority), { action: "end_turn", actionRevision: authority.actionRevision });
});

test("conversion needs both the projected provider and the exact projected target", () => {
  const input = fixture({ selfHand: [{ id: "conversion", kind: "Dodge" }, { id: "full-health-peach", kind: "Peach" }] });
  input.currentAction.playPhaseActions = [{ cardId: "conversion", canPlayAs: "attack" }];
  input.currentAction.playTargetEligibility = [eligibility("conversion", ["target-two"])];
  const catalog = buildPlayCandidates(input);
  assert.equal(catalog.publicChoices.length, 2);
  assert.deepEqual(catalog.resolve(catalog.publicChoices[0].id, authority), { action: "play_card", playAs: "attack", cardId: "conversion", targetId: "target-two", actionRevision: authority.actionRevision });
  input.currentAction.canDeclareAttack = false;
  assert.deepEqual(buildPlayCandidates(input).publicChoices.map(({ kind }) => kind), ["end_turn"]);
});

test("resolver rejects forged or stale authority, mismatched IDs, and reuse", () => {
  const catalog = buildPlayCandidates(fixture());
  const id = catalog.publicChoices[0].id;
  for (const change of [{ actorId: "other" }, { decisionId: "other" }, { actionRevision: "old" }, { decisionConsumed: true }]) {
    assert.equal(catalog.resolve(id, { ...authority, ...change }), null);
  }
  assert.equal(catalog.resolve("unknown", authority), null);
  assert.ok(Object.isFrozen(catalog.resolve(id, authority)));
  assert.equal(catalog.resolve(id, authority), null);
  assert.deepEqual(buildPlayCandidates(fixture({ phase: "draw" })), { status: "unsupported", reason: "invalid_authority" });
});

test("catalogue returns an explicit overflow rather than a partial list", () => {
  const input = fixture();
  input.selfHand = Array.from({ length: MAX_PLAY_CANDIDATES }, (_, i) => ({ id: `card-${i}`, kind: "Attack" }));
  input.currentAction.playTargetEligibility = input.selfHand.map(({ id }) => eligibility(id, ["target-one"]));
  assert.deepEqual(buildPlayCandidates(input), { status: "unsupported", reason: "candidate_overflow" });
});

test("Halberd target counts and stratagem targets come from distinct canonical authority", () => {
  const input = fixture({ selfHand: [{ id: "a", kind: "Attack" }, { id: "d", kind: "Duel" }] });
  input.currentAction.playTargetEligibility = [
    eligibility("a", ["target-one", "target-two"]),
    { ...eligibility("d", ["target-two"]), effectiveKind: "Duel" },
  ];
  const ordinary = buildPlayCandidates(input);
  assert.deepEqual(ordinary.publicChoices.map(({ kind }) => kind), ["attack", "attack", "stratagem", "end_turn"]);
  const duel = ordinary.publicChoices.find(({ kind }) => kind === "stratagem");
  assert.deepEqual(ordinary.resolve(duel.id, authority), { action: "play_card", cardId: "d", targetId: "target-two", actionRevision: authority.actionRevision });

  const halberd = buildPlayCandidates({
    ...input, attackTargetLimit: 3, selfHand: [{ id: "a", kind: "Attack" }],
    currentAction: { ...input.currentAction, playTargetEligibility: [eligibility("a", ["target-one", "target-two"])] },
  });
  assert.deepEqual(halberd.publicChoices.map(({ kind }) => kind), ["attack", "attack", "attack", "end_turn"]);
  const payload = halberd.resolve(halberd.publicChoices[0].id, authority);
  assert.deepEqual(payload.targetIds, ["target-one", "target-two"]);
  assert.ok(Object.isFrozen(payload.targetIds));
});

test("Serpent Spear uses two owned materials and its own projected range", () => {
  const input = fixture({ selfHand: [{ id: "a", kind: "Dodge" }, { id: "b", kind: "Peach" }] });
  input.currentAction.legalActions.push("serpent_spear_attack");
  input.currentAction.playTargetEligibility = [
    { mode: "serpent_spear_attack", effectiveKind: "Attack", eligibleTargetIds: ["target-two"], rejections: [] },
  ];
  const catalogue = buildPlayCandidates(input);
  assert.deepEqual(catalogue.publicChoices.map(({ kind }) => kind), ["attack", "end_turn"]);
  assert.deepEqual(catalogue.resolve(catalogue.publicChoices[0].id, authority),
    { action: "serpent_spear_attack", cardIds: ["a", "b"], targetId: "target-two", actionRevision: authority.actionRevision });
});
