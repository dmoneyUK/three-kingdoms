# AIP-01 Offline Decision Prototype — Reviewer Report

Design: AIP-D10 · Scope: synthetic response choices and legal decline · Status: mock-only

## Fixture decisions

Every request uses `observationVersion: 1`, a decision-local ID set, and a bounded reason. “Mock result” is a fixed transport response used to test the parser and allowlist; it is **not** an OpenAI/model judgment or a game-engine simulation.

| Fixture | Manually acceptable candidate IDs | Mock result | Result |
| --- | --- | --- | --- |
| `one-dodge-option` | `candidate-1`, `candidate-2` | `candidate-1` | accepted |
| `two-dodge-options` | `candidate-1`, `candidate-2`, `candidate-3` | `candidate-2` | accepted |
| `rebel-sees-revealed-lord` | `candidate-1`, `candidate-2` | `candidate-2` | accepted; role context is explicitly public |
| `low-hp-peach-rescue` | `candidate-1`, `candidate-2` | `candidate-1` | accepted; either supplied Peach path is legal in fixture |
| `no-response-option` | `candidate-1` | `candidate-1` | accepted; decline is the only candidate |
| `optional-refusal` | `candidate-1`, `candidate-2` | `candidate-2` | accepted; synthetic effects do not establish a tactical preference |
| `unrevealed-role-omitted` | `candidate-1`, `candidate-2` | `candidate-1` | accepted; no hidden role is represented |
| `revealed-role-is-public-only` | `candidate-1`, `candidate-2` | `candidate-1` | accepted; only revealed role and public HP are present |
| `peach-option-with-no-private-card-id` | `candidate-1`, `candidate-2` | `candidate-1` | accepted; physical card ID is absent |
| `same-candidate-id-in-next-decision` | `candidate-1`, `candidate-2` | `candidate-1` | accepted; IDs are scoped by `decisionId` |
| `negation-physical-or-decline` | `candidate-1`, `candidate-2` | `candidate-2` | accepted; no Negation chain is simulated |

The fixture set covers one and multiple choices, Rebel/publicly revealed Lord, low-HP Peach rescue, no response provider, optional decline, public-only roles, and per-decision candidate IDs. A play-phase snapshot with no legal target is rejected as unsupported before the transport is called; it does not receive an invented target candidate.

## Negative and privacy checks

- Duplicate candidate IDs, empty candidate lists, hidden hand/role fields, arbitrary request/output keys, malformed JSON, missing/unknown candidate IDs, stale observation/decision IDs, and overlong reasons fail closed.
- Simulated HTTP 429, HTTP 5xx, timeout, generic transport error, incomplete output, and refusal return bounded error codes. No fallback candidate is selected.
- Response projection strips actor IDs, provider IDs, eligible physical-card IDs, and unrelated player rows. Multi-card selections are rejected as a separate unresolved choice family.
- The transport is injected by tests. This module contains no network client, API key lookup, retry, live request or action execution.

## Validation and usage

- Focused Node tests: **31 passed, 0 failed** (`node --import tsx --test tests/ai-decision-prototype.test.mjs`). The fixture assertions pass 11/11.
- ESLint on the four scoped TypeScript/test files: passed.
- Strict focused TypeScript check on `ai/decision-prototype.ts` and `ai/decision-fixtures.ts`: passed.
- `git diff --check`: passed.
- Measured test-process duration: approximately **271 ms**. This is mock harness time, not model latency.
- Live OpenAI calls: **0**; token usage: **not applicable**; API cost: **0**. No key was read or used. Live evaluation remains unauthorized and unrun.
- A full-repository `tsc --noEmit` attempt reports numerous errors in untouched app/game/worker modules (including missing Cloudflare ambient types); no unrelated fixes were made. Exact-SHA GitHub Actions for the implementation commit is still required.
