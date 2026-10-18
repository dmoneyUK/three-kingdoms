import type { BotDecisionRequestV1 } from "./decision-prototype.js";

export type OfflineDecisionFixture = {
  id: string;
  description: string;
  request: BotDecisionRequestV1;
  acceptableCandidateIds: string[];
  mockSelectedCandidateId: string;
  rationale: string;
};

const decline = (id = "candidate-2", label = "Decline response"): BotDecisionRequestV1["candidates"][number] => ({ id, kind: "decline", label });
const respond = (id: string, label: string): BotDecisionRequestV1["candidates"][number] => ({ id, kind: "respond", label });

/**
 * Curated, synthetic protocol fixtures only. Mock selections below are fixed
 * inputs for contract tests, not model judgments or game-engine simulations.
 */
export const offlineDecisionFixtures: OfflineDecisionFixture[] = [
  {
    id: "one-dodge-option",
    description: "One Dodge provider and a legal decline are supplied.",
    request: {
      observationVersion: 1, decisionId: "fixture-one-dodge", requirement: "dodge",
      self: { hp: 3, maxHp: 4, hasPeach: false }, publicContext: { revealedOpponents: [] },
      candidates: [respond("candidate-1", "Play Dodge"), decline()],
    },
    acceptableCandidateIds: ["candidate-1", "candidate-2"], mockSelectedCandidateId: "candidate-1",
    rationale: "Both IDs are supplied; this fixture checks single-option parsing, not tactical quality.",
  },
  {
    id: "two-dodge-options",
    description: "Two distinct Dodge providers and a legal decline are supplied.",
    request: {
      observationVersion: 1, decisionId: "fixture-two-dodge", requirement: "dodge",
      self: { hp: 3, maxHp: 4, hasPeach: false }, publicContext: { revealedOpponents: [] },
      candidates: [respond("candidate-1", "Play Dodge"), respond("candidate-2", "Use Braveheart as Dodge"), decline("candidate-3")],
    },
    acceptableCandidateIds: ["candidate-1", "candidate-2", "candidate-3"], mockSelectedCandidateId: "candidate-2",
    rationale: "All three are explicit candidates; no provider internals or physical card IDs are represented.",
  },
  {
    id: "rebel-sees-revealed-lord",
    description: "The bot's own role and one publicly revealed Lord are present.",
    request: {
      observationVersion: 1, decisionId: "fixture-rebel-lord", requirement: "negate",
      self: { hp: 3, maxHp: 4, hasPeach: false, ownRole: "Rebel" },
      publicContext: { revealedOpponents: [{ revealedRole: "Lord", hp: 1 }] },
      candidates: [respond("candidate-1", "Play Negation"), decline()],
    },
    acceptableCandidateIds: ["candidate-1", "candidate-2"], mockSelectedCandidateId: "candidate-2",
    rationale: "The fixture proves revealed-role context survives; the omitted effect means either supplied choice is acceptable.",
  },
  {
    id: "low-hp-peach-rescue",
    description: "A synthetic one-HP bot has one Peach response during rescue.",
    request: {
      observationVersion: 1, decisionId: "fixture-low-hp-peach", requirement: "peach",
      self: { hp: 1, maxHp: 4, hasPeach: true, ownRole: "Loyalist" }, publicContext: { revealedOpponents: [] },
      candidates: [respond("candidate-1", "Play Peach"), respond("candidate-2", "Give Peach"), decline("candidate-3", "Skip rescue")],
    },
    acceptableCandidateIds: ["candidate-1", "candidate-2"], mockSelectedCandidateId: "candidate-1",
    rationale: "Either supplied Peach path is an acceptable rescue choice; the mock does not execute it.",
  },
  {
    id: "no-response-option",
    description: "No response provider is available; only the legal decline is supplied.",
    request: {
      observationVersion: 1, decisionId: "fixture-no-response", requirement: "attack",
      self: { hp: 2, maxHp: 4, hasPeach: false }, publicContext: { revealedOpponents: [] },
      candidates: [decline("candidate-1")],
    },
    acceptableCandidateIds: ["candidate-1"], mockSelectedCandidateId: "candidate-1",
    rationale: "The only candidate is decline; the model cannot invent a response provider.",
  },
  {
    id: "optional-refusal",
    description: "An optional Dodge response may be selected or declined.",
    request: {
      observationVersion: 1, decisionId: "fixture-optional-refusal", requirement: "dodge",
      self: { hp: 4, maxHp: 4, hasPeach: false }, publicContext: { revealedOpponents: [] },
      candidates: [respond("candidate-1", "Play Dodge"), decline()],
    },
    acceptableCandidateIds: ["candidate-1", "candidate-2"], mockSelectedCandidateId: "candidate-2",
    rationale: "Both authoritative options are accepted because the synthetic context omits downstream effect details.",
  },
  {
    id: "unrevealed-role-omitted",
    description: "No opponent role is revealed, so the public role list is empty.",
    request: {
      observationVersion: 1, decisionId: "fixture-hidden-role-omitted", requirement: "negate",
      self: { hp: 3, maxHp: 4, hasPeach: false, ownRole: "Renegade" }, publicContext: { revealedOpponents: [] },
      candidates: [respond("candidate-1", "Play Negation"), decline()],
    },
    acceptableCandidateIds: ["candidate-1", "candidate-2"], mockSelectedCandidateId: "candidate-1",
    rationale: "An unrevealed opponent has no role field or placeholder in the model request.",
  },
  {
    id: "revealed-role-is-public-only",
    description: "A revealed Loyalist and public HP are present without player identity or hand data.",
    request: {
      observationVersion: 1, decisionId: "fixture-public-role", requirement: "attack",
      self: { hp: 2, maxHp: 4, hasPeach: false, ownRole: "Rebel" },
      publicContext: { revealedOpponents: [{ revealedRole: "Loyalist", hp: 2 }] },
      candidates: [respond("candidate-1", "Play Attack"), decline()],
    },
    acceptableCandidateIds: ["candidate-1", "candidate-2"], mockSelectedCandidateId: "candidate-1",
    rationale: "Only the supplied revealed role and HP are present; no hidden opponent facts are inferred.",
  },
  {
    id: "peach-option-with-no-private-card-id",
    description: "A Peach option is summarized without identifying the physical card.",
    request: {
      observationVersion: 1, decisionId: "fixture-peach-summary", requirement: "peach",
      self: { hp: 2, maxHp: 4, hasPeach: true }, publicContext: { revealedOpponents: [] },
      candidates: [respond("candidate-1", "Play Peach"), respond("candidate-2", "Give Peach"), decline("candidate-3", "Skip rescue")],
    },
    acceptableCandidateIds: ["candidate-1", "candidate-2"], mockSelectedCandidateId: "candidate-1",
    rationale: "The request names a legal response summary, not the card's physical ID or the full hand.",
  },
  {
    id: "same-candidate-id-in-next-decision",
    description: "Candidate IDs are reused in a separate decision without cross-decision identity.",
    request: {
      observationVersion: 1, decisionId: "fixture-new-window", requirement: "dodge",
      self: { hp: 2, maxHp: 4, hasPeach: false }, publicContext: { revealedOpponents: [] },
      candidates: [respond("candidate-1", "Play Dodge"), decline()],
    },
    acceptableCandidateIds: ["candidate-1", "candidate-2"], mockSelectedCandidateId: "candidate-1",
    rationale: "IDs are valid only with this decisionId; the same candidate-1 in another request is unrelated.",
  },
  {
    id: "negation-physical-or-decline",
    description: "A Negation response provider and decline are both explicit candidates.",
    request: {
      observationVersion: 1, decisionId: "fixture-negation-choice", requirement: "negate",
      self: { hp: 3, maxHp: 4, hasPeach: false }, publicContext: { revealedOpponents: [] },
      candidates: [respond("candidate-1", "Play Negation"), decline()],
    },
    acceptableCandidateIds: ["candidate-1", "candidate-2"], mockSelectedCandidateId: "candidate-2",
    rationale: "The mock exercises a valid optional decline; no Negation chain is simulated.",
  },
];
