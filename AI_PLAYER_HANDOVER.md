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

### AIP-02A support matrix

- **Supported:** `CurrentAction.kind === "response"` with `attack`, `dodge` or `negate`; the server-projected legal decline; provider options whose selection is either null or exactly one eligible physical card. A `negationWindowId` stays only in the internal response payload.
- **Supported when current and open:** shared `response` windows only when the acting `CurrentAction` contains an unlocked, undecided `sharedWindow.windowId`; preserve that ID only in the internal payload. Dying/Peach is limited to `kind === "dying"` plus `requirement === "peach"`; map each one-card provider and skip. Map the separate `give_peach` choice only when it has one unambiguous Peach provider and one physical card.
- **Fail closed:** all play/trigger/unknown action families; Peach outside Dying; shared Dying when its `self.hasPeach` projection conflicts with `legalActions` (the accepted AIP-01 request builder rejects that shape); missing or mismatched actor, decision ID or opaque revision; locked/decided shared window; unknown provider label; multi-card or multiple-eligible-card selection; ambiguous `give_peach`; unsupported/malformed/duplicate candidate; stale or consumed result. Never infer a candidate from labels or construct an action absent from the authoritative projection.
- **Label boundary:** accept only reviewed fixed response-provider labels from `game/capabilities/cards.ts`, `equipment/eight-trigrams.ts`, `heroes/{zhen-ji,zhao-yun,guan-yu,lord-skills,hua-tuo}.ts`, plus the fixed decline/`Give Peach` labels generated by `ai/decision-prototype.ts`. Do not forward arbitrary caller or player text.
- **Resolver:** bind schema version separately from `actionRevision`; require decision ID, actor, unchanged revision and candidate ID; use caller-provided consumed state plus one-use closure state. Return an inert payload only. The future route must still recompute live legality and claim atomically.

### Local implementation checkpoint

- Implemented the pure `ai/response-candidates.ts` bridge. The request is frozen and contains only approved AIP-01 fields; provider/card/window bindings stay in a private one-use resolver closure. It returns an inert payload and has no route, executor, transport, fetch, or D1 dependency.
- Added `tests/ai-response-candidates.test.mjs` and registered it in `tests/run-fast-tests.mjs`. Focused suite: **23/23 passed**. Focused ESLint on the module, test and runner: **0 errors**. `git diff --check` passed for tracked edits; stage all scoped files before the final diff check so new files are included.
- Owner-provided iPhone trace `7bd075c8-f726-43f6-a04e-601d84d4c5b0` is from Staging build `5340113d379ab18b2a1c56fa45ee99c66492b8c3`. After the human Attack, the trace shows `CurrentAction.kind=response`, actor seat 3 and an unresolved response; the screenshot shows BOT 4 `UNSUPPORTED`. The privacy-safe trace exposes hand counts only, so it cannot prove BOT 4 held Dodge. This matches the deployed `bot_step` behavior: it declines only when no response option exists and otherwise returns `UNSUPPORTED_BOT_DECISION`. AIP-02A remains offline and does not change that runtime behavior.
- No exact-code-SHA CI has run for this implementation yet. Current remote feature head is docs-only `136faa3`; latest validated code ancestor is `5340113d` / [Actions 44650399437 attempt 2](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44650399437), green with production `deploy` skipped.

Next: stage and inspect only the AI module, focused test, fast-test registration, AIP-02A evidence and this handover; push a code commit; inspect exact-SHA lint/build/fast, API, browser, Staging guard/deploy/smoke and production skip. Do not wire the bridge into the room route or start AIP-02B.

Known separate caveat: one local W4 First Aid presentation test previously observed a parked historical card after its animation wait. It was not changed in this sync; the required exact-SHA browser smoke passed. Do not claim that focused presentation case is fixed.
