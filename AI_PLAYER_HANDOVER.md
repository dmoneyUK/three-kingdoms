# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`

Design authority: `docs/AI_PLAYER_DESIGN.md` — AIP-D10 (2026-10-18)

Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current task: IN_PROGRESS — AIP-01 offline decision prototype

- AIP-00A, AIP-00B and AIP-00C are accepted. AIP-01 is approved for mock/offline implementation only; no AIP-01 reviewer feedback or changes-requested item is present in AIP-D10.
- The clean feature branch is at `0b78dde2031825f5b7914d4f6a3d8ba058b5d11b`; this is a docs-only descendant of the last code-bearing commit `ce897a842b13529fd9d7b2087b4ebfbf6525b1d1`. The exact-SHA [Actions run 39079095884](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39079095884) passed lint/build/fast tests, API tests, browser startup/room smoke and isolated Staging checks; production `deploy` was skipped. No CI run exists for the docs-only branch HEAD.
- Source audit selected the narrow response-choice family: server `CurrentAction.requirement/options/declineAction`, `responseDecisionFor()` and `legalActionsFor()` provide response choices and legal decline. Play-phase target enumeration is outside this prototype. The prototype will remain synthetic/read-only and will not be wired into room actions.
- Implemented a pure typed V1 request/result and response projection that strips actor/provider/physical-card IDs, rejects unsupported multi-card decisions, and keeps per-decision candidate IDs. Added 11 synthetic fixtures, an injected-only transport, fail-closed parser/error cases, fast-test registration, and [the fixture-level report](docs/AIP-01_OFFLINE_EVALUATION.md). The focused suite passed 31/31; scoped ESLint, strict TypeScript check, and `git diff --check` passed.
- A full-repository `tsc --noEmit` attempt reported many diagnostics in untouched app/game/worker modules (including unavailable Cloudflare ambient types); no unrelated files were changed. Live API calls/key use remain at zero.
- Final scope review: exactly seven task files are staged; no workflow, room/game, schema, UX or production config files are changed. Precommit fetch confirmed remote HEAD remains `0b78dde2031825f5b7914d4f6a3d8ba058b5d11b`; there is no queued/running branch validation, and its last code-bearing ancestor remains the passing `ce897a842b13529fd9d7b2087b4ebfbf6525b1d1` / run `39079095884`.
- Remaining work: commit/push, inspect exact-SHA Actions (including Staging remaining AI-disabled and production `deploy` skipped), then move AIP-01 to `PENDING_REVIEW`.
- Privacy/cost boundary: no OpenAI key use, network request, live model adapter execution, paid usage, real-player data, Staging AI enablement, production change or Cloudflare resource change. Live evaluation remains unrun pending separate budget/privacy/key authorization.

## Stop condition

Finish AIP-01 at `PENDING_REVIEW` with exact code SHA, focused validation, exact-SHA Actions results and fixture report. Do not self-accept or start AIP-02.
