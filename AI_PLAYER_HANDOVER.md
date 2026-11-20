# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D18
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Latest result — AIP-SYNC-01: PENDING_REVIEW

- Product Owner authorized the one-way `ux-v2` → `feature/smart-bot-player` sync on 2026-11-20 and directed non-overlapping AI Player experiments after it. UX2 tip `94381f44163c2158301294396a6cf1b9e6e17b22` and AI base `509f0ba73fa8693e0616be42050c6a401a34238c` are ancestors of code SHA `5340113d379ab18b2a1c56fa45ee99c66492b8c3`; no writes to `main` or `ux-v2`.
- Exact-SHA [Actions run 44650399437](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44650399437), attempt 2, succeeded on SHA `5340113d379ab18b2a1c56fa45ee99c66492b8c3`. Lint/build/fast, API and browser smoke were green; Staging target guard/build, migration check, deploy and mobile Bot/rejoin smoke were green. Staging smoke passed **1/1 in 4.5m**. Attempt 1 failed at the Host Game enabled assertion; rerunning the failed Staging job on the same SHA passed. Cause of the first failure is unproven. [Staging evidence artifact](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44650399437/artifacts/14591970977).
- Staging deployed SHA `5340113d` to Worker `three-kingdoms-ai-staging` at https://three-kingdoms-ai-staging.dai-jinge.workers.dev. Target guard confirmed its separate D1 binding, production D1 excluded, `BOT_AI_ENABLED=false`, `BOT_DEMO_ENABLED=true`; no migrations were pending. Production `deploy` was **skipped**. AIP-MOB-01 and integrated real-iPhone Safari review remain `PENDING_REVIEW`; no human acceptance is implied.

## Current task: IN_PROGRESS — AIP-02A response candidate bridge

The Product Owner's 2026-11-20 direction authorizes this non-overlapping offline/mock experiment after the sync. Keep it independent of the still-pending mobile review.

### Scope and boundaries

- Own `ai/response-candidates.ts`, `tests/ai-response-candidates.test.mjs`, and append-only registration of that test in `tests/run-fast-tests.mjs`; update only AIP-02A status/evidence here and in the design.
- Build a pure internal mapping from an actor-authorized `CurrentAction` response projection plus opaque decision/action revision to model-safe candidate IDs and exact internal response payloads. Resolve only a selected, still-current candidate after rechecking decision ID, actor, revision and caller-provided consumed-decision state. Never execute an action.
- Follow the detailed AIP-02A support matrix and require at least 12 focused positive/negative/privacy tests. Unsupported multi-card, multi-response, or otherwise unmappable choices fail closed. Keep execution IDs/card IDs out of the serialized `BotDecisionRequestV1`.
- Do not change routes, game rules, UI, Worker, D1/schema/migrations, scheduler, live bot seats or OpenAI transport. No live API call, key use, cost, real-player data transfer or production action. Existing CI may auto-deploy the unchanged AI-disabled Staging configuration.

### Source audit completed; next step

- After the UX2 sync, `CurrentAction` is V3 with actor-specific legal actions/options; `roomState` returns an opaque `actionRevision` separately. `actionRevisionFor` binds phase, projected actor, persisted pending state, skill state and hand revision. Do not parse or recreate that server revision.
- `game/response-decision.ts` remains the server authority for provider choices and live revalidation. `ai/decision-prototype.ts` builds the existing model-safe request and strips actor/provider/physical-card identifiers; keep the new sealed mapping separate from the request object.
- Next: finish the response-family support matrix (ordinary response, Negation, Peach/Dying, shared windows, single-card vs multi-card providers), then implement the pure bridge and focused tests. Do not wire it into the room route or start AIP-02B.

Known separate caveat: one local W4 First Aid presentation test previously observed a parked historical card after its animation wait. It was not changed in this sync; the required exact-SHA browser smoke passed. Do not claim that focused presentation case is fixed.
