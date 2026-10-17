# WTK Smart Bot Player — Product Roadmap and Implementation Design

> Feature branch: `feature/smart-bot-player`
> Design revision: **AIP-D6 / 2026-10-18**
> Owner: **Human Reviewer + Planner**. Planner edits **this file for normal design/review**; governance docs only under explicit user instruction.
> Status: **DESIGN-DRIVEN AUTONOMOUS QUEUE**. AIP-00A is **ACCEPTED by the human Product Owner (2026-10-17)**. AIP-00B is **ACCEPTED following positive Staging device/browser feedback from the user on 2026-10-18**. AIP-00C / AIP-01 remain **pre-approved as a dependency-gated queue**, but may execute only after their respective prior dependency is **ACCEPTED**, and all cloud/API risk gates are satisfied. Other roadmap stages are DRAFT.
> Coding Agent: **one agent, one bounded task per cycle; re-read design and automatically select the next eligible independent APPROVED task after each PENDING_REVIEW delivery**. Never self-accept or bypass dependencies.
> This document is **NOT** a second WTK core-game specification, an OS architecture spec, a UX2 specification, or an agent handover.

## 0. Document boundary / non-duplication rule (mandatory)

This file owns **only AI-player behavior, AI integration, bot-specific privacy/contracts, rollout stages and AI tasks**. Keep the following authorities separate:

| Authority | Owns | AI Player must NOT duplicate/change |
| --- | --- | --- |
| `AGENTS.md` | Cross-repository architecture, server authority, safety, engineering standards | Canonical rules, existing session/visibility contracts |
| `docs/OFFICIAL_CARD_REFERENCE.md`, `docs/STANDARD_108_DECK_MANIFEST.md`, `docs/STANDARD_HERO_REFERENCE.md` | WTK Standard deck, card effects, Hero semantics | Card/Hero rule tables in prompts/code |
| `docs/UX2-refine.md` and UX2 Interaction Stage docs | Public board, presentation and control UX | Game-board redesign, Local Dock / Stage ownership |
| Existing game/OS and deployment code | Room lifecycle, phase/pending engine, D1 state, game transitions, current human session | Parallel bot-specific rules engine, duplicated match server |
| `docs/AI_PLAYER_AGENT_WORKFLOW.md` | Autonomous Agent task selection, CI, stop and safe Staging execution method | Product/strategy requirements |
| `docs/AI_PLAYER_PLANNER_REVIEWER_GUIDE.md` | Onboarding for any future Planner / Reviewer conversation, review procedure, file ownership | Current executable tasks or Agent handover |
| `AI_PLAYER_HANDOVER.md` | Exactly one current Coding Agent assignment/progress + actual CI evidence | Long-term product roadmap |
| **This document** | AI-specific design, staged roadmap, approved task acceptance criteria, reviewer findings | Append-only execution diary or UX2 task queue |

The existing UX2 §5/§6 design and §4A/§4B refinement sequencing stay untouched. UX2 §6 must not be pulled into bot tasks as "necessary UI cleanup". If a bot feature discovers a missing canonical game capability, record the contract and plan a bounded adapter/fix through existing engine ownership instead of copying rules into AI modules.

**Ownership firewall:** During normal AI planning/review, Planner edits **only `docs/AI_PLAYER_DESIGN.md`**. The permanent Planner/Reviewer guide (`docs/AI_PLAYER_PLANNER_REVIEWER_GUIDE.md`) and Agent workflow may be updated **only on an explicit user governance request**, as in AIP-D3. Planner must **NEVER** edit either `AI_PLAYER_HANDOVER.md` or `HANDOVER.md` (nor game source, CI, deployment/test files). Coding Agent alone owns `AI_PLAYER_HANDOVER.md`; it may change *execution status/evidence for its selected task* here while preserving concurrent Planner edits, and may change code/tests/config only when authorized. **`ACCEPTED` requires human Product Owner decision or explicitly delegated technical acceptance authority**. Neither Agent completion nor green CI grants acceptance.

## 1. Product goal and progressive definition of "smart"

Offer genuine AI seats in 4–8-player **WTK Standard** matches, ideally with at least one human host. Bots are autonomous server-controlled game participants, not a human's alternative session or today's host-controlled Test Players. Eventually they can choose generals, complete turns and every continuation, decide about Negation/Dodge/Peach/skills, make probabilistic inferences about hidden roles based on PUBLIC evidence, and carry tactical memory between actions.

**Initial proof** is NOT a live bot seat: determine whether OpenAI can make valid, useful, auditable action selections from concise, correctly scoped WTK observations. The smallest useful success is **safe read-only inference**, not a complete game.

User-facing success at later release: a mixed 4-player game with one human and three bots plays from lobby to terminal result without human switching into bot seats. That is an integration/release gate, *not* acceptance for the first experiment.

Non-goals for initial work: new WTK rules, UX2 replacement, training/fine-tuning a model, RAG/vector DB, game-over bot takeovers, parallel microservices, exposing other players' hidden info, or automatic merging into `main`.

## 2. Current source audit / integration constraints (verified on branch)

- `app/api/rooms/route.ts` manages game create/join/start, Hero selection, phase/pending continuation, response/negation, session checking, action revision, authoritative transitions and private `roomState`. Key functions: `legalActionsFor`, `roomState`, `actionRevisionFor`, HTTP `POST`.
- `game/protocol.d.ts` defines `CurrentAction`, `GameplayAction`, response/trigger option shapes. `legalActionsFor` may authorize coarse `play_card` without enumerating all card/target/payload combinations. Therefore **the current API is not yet a ready-made complete LLM candidate catalogue**.
- `game/capabilities/` and `game/decisions/` contain existing game eligibility/effects/continuations; they are reusable authorities, not rules to reimplement.
- `db/schema.ts` has separate `rooms` and `players` with `is_test_player`. Test seats can share host credentials. A production AI seat must not use `is_test_player` or possess host/human bearer credentials.
- `worker/index.ts` is the Cloudflare Worker entry; `wrangler.jsonc` currently binds only D1 (`DB`), NOT Workers AI. OpenAI Responses API needs only server HTTPS access and an API secret, not Cloudflare Workers AI binding.
- `.github/workflows/deploy.yml` currently triggers on pushes/PRs to `main` and `ux-v2`, ignores all Markdown files, and deploys only the two named branches. The AI branch currently has **no CI runs**, as of this design revision. Most recent inherited `main` baseline run: `39037960303`, success for `6743a357ef19ca930a02f7e3faa8cee843bd6a38`. This is NOT AI-branch validation.

Do not treat these as immutable findings: Coding Agent must re-read relevant code and exact remote ref before each task.

## 3. Proposed architecture and sequence

`Human clients / room events` → **existing authoritative WTK action/transition** → persisted D1 room/pending/revision → **Bot Driver** (only when bot decision required) → **Bot Observation Builder** (bot-private + approved public only) → **Canonical Legal Candidate Builder** (server-authored executable choices) → **Policy Router** (unique/deterministic choice or OpenAI decision) → **Action Validator / Shared Executor** → D1 transition → schedule subsequent bot decision or await human.

In-depth responsibility split:

1. **Game Engine (existing):** owns actor, phase, ownership, playable semantics, target legality, one-card physical conservation, HP/outcome, all responses and UI-neutral presentation facts.
2. **Observation Builder (new):** emits minimal typed `BotObservation` for one bot from its own private state plus existing genuinely public projection. NEVER pass raw player rows, deck order, other players' `hand_json`, hidden `role`, `token_hash` or sealed pending data to the AI.
3. **Legal Candidate Builder (new):** uses existing server validators/capabilities to create concrete actions: exact card IDs, target IDs, costs, provider IDs, options, choice keys, contextual action revision. Candidate ID must map to a validated executable payload server-side. NO broad invented "attack anyone" variants. Where canonical authority cannot enumerate safely, report `UNSUPPORTED` and stop/bound that test.
4. **AI Decision Service (new):** injectable policy interface. Calls OpenAI `/v1/responses` from trusted backend, or deterministic/mock policy for tests. GPT sees only sanitized structured observations and candidate summaries; returns a **candidate ID** and short rationale. It NEVER sends HTTP game commands directly.
5. **Bot Controller + Executor (new, later):** looks up returned candidate, re-reads fresh state, compares revision, enforces actor/choice/cost/phase/pending and uses shared authoritative action logic. Old revisions are discarded, not executed.
6. **Scheduler (new, later):** persists bounded and resumable bot work; must work without an open human browser. Candidate Cloudflare Durable Objects Alarms are at-least-once and require lease/idempotency/retry limits. Do not implement scheduling merely via an in-memory timeout or unbounded async recursion.
7. **Bot Memory (new, later):** stores strategic summary derived ONLY from visible events and bot-owned private information, with provenance/uncertainty; no true hidden identities of opponents.

**Human vs bot:** the real game engine owns one transition path. Human and bot are two authorized *decision producers*, not two copies of play-card/Negation/hero rules. Server-side controller authenticates bot actions internally; never manufacture/share a test-player token or create a public bot-control HTTP endpoint.

### Example pure decision request (illustrative, not real API shape)

```json
{
  "observationVersion": 1,
  "decisionId": "fixture-decision-001",
  "self": { "hero": "guan-yu", "role": "Rebel", "hp": 3, "hand": ["Attack", "Peach"] },
  "publicPlayers": [
    { "id": "p2", "hero": "cao-cao", "publicRole": "Lord", "hp": 2, "handCount": 2 }
  ],
  "candidates": [
    { "id": "a1", "label": "Play Attack targeting p2" },
    { "id": "a2", "label": "End play phase" }
  ]
}
```

```json
{ "selectedActionId": "a1", "reason": "The revealed Lord is vulnerable." }
```

The engine must still verify that `a1` is authoritative and executable at that revision. A JSON-schema-valid answer is not proof of legal play or intelligent play.

## 4. AI technologies: choose simple building blocks first

### V0–V1: must use
- **LLM inference**: model chooses among *given choices*, not free-form game commands. Recommended first evaluation model ID: `gpt-6-luna`, configurable; compare alternatives only after measured evals.
- **Prompt engineering**: fixed WTK identity objectives, private/public boundary, one-step decision instruction, concise card/skill descriptions only for supplied candidates. Reference official rules in code; do not copy huge rulebooks or invent card knowledge.
- **Context engineering**: minimum needed observation and candidate list; optionally small bounded public history later.
- **Structured Outputs**: Responses API `text.format: {type:"json_schema", name:"wtk_bot_choice", strict:true, schema:...}`. Typed response includes `selectedActionId` and short `reason`, with schema enforced + server allowlist validation.
- **Evals**: curated repeatable tactical fixtures + mocked transport. Collect selection accuracy, legality, refusal/errors, timing, usage; compare model response to deterministic baseline and reviewer expectations.

### V2+: optional when quality evidence requires
- **Short-lived tactical plan** then per-bot **strategic memory** in D1: publicly observed behavior, suspected allegiance with confidence/provenance, uncertainty and decay.
- **Role-aware heuristics + LLM re-ranking**: simple mandatory/obvious deterministic choices; LLM for meaningful multi-option choices.
- **Model comparison and reasoning effort tuning**: cheap model low/medium effort versus stronger model only for complex decisions; empirical rather than guessed benefit.
- **RAG, embeddings, fine-tuning, Agents SDK, multi-agent chat** are NOT initial requirements. Any new data service or paid tool requires separate human decision.

### Security for prompt and data
- WTK rule/task instructions are developer/system-controlled. Player names/public logs/other text are **untrusted data** and must never override rules or request tool execution.
- Do not send personal account identifiers, access tokens, API secrets, all-player rows, private audit events or real-player chat to OpenAI.
- External LLM response is untrusted. Validate parsed result, candidate ID membership, stale revision, explicit refusal, partial/incomplete and HTTP errors; the model cannot approve its own output.
- Account currently opted in to API data sharing for complimentary tokens. Treat this as a privacy decision: first live experiments must use **synthetic or anonymized fixtures only**, not real user-sensitive gameplay logs, until explicit data policy acceptance.

## 5. Cloudflare / OpenAI configuration plan

**Existing:** Node 22+, TypeScript, Cloudflare Workers/Vinext, D1 + Drizzle, test-fast/API/browser smoke. Existing `wrangler.jsonc` has `DB` binding only.

**P0/P1 local prototype configuration (not yet applied):**
- Create dedicated OpenAI project and **project-scoped API key**; store only as server secret. Never put secret in `wrangler.jsonc` `vars` or GitHub files.
- For local Worker use `.dev.vars` with `OPENAI_API_KEY=...`, and add `.dev.vars*` to `.gitignore` before creating one. `.env*` is already ignored. For test-only Node script, allow the key to be injected as environment variable without committing it.
- Non-secret defaults: `BOT_AI_MODEL=gpt-6-luna`; `BOT_AI_ENABLED=false`; bounded `BOT_AI_MAX_OUTPUT_TOKENS`; `BOT_AI_TIMEOUT_MS`; `BOT_AI_MAX_REQUESTS_PER_RUN`. Defaults remain OFF/fail closed.
- Implement provider-neutral adapter using `fetch` or OpenAI SDK only if justified. `store: false` is requested where supported but does NOT opt out of user-enabled API data sharing.
- Limit prompt/response size, live call count, rate and spending. Positive balance and complimentary-token enrollment do **not** guarantee every request is free. Track actual provider usage and avoid automatic retries that can silently spend.
- The first work must **NOT** change production Cloudflare Worker secrets, D1 schema or deploy. Production secrets require separate authorization and environment isolation.

**Later, when autonomous mixed matches are approved:**
- Add persisted `controller_type` or similar bot seat ownership distinct from `is_test_player`; migration reviewed for live D1 safety.
- Add Bot driver leases/decision versions and scheduler only after confirmed feasibility. Cloudflare Durable Objects alarms are a candidate, not preapproved architecture.
- Public lobby BOT labels only after bot identity boundary exists; UX specifics remain UX design authority and should be referenced, not duplicated here.

**Mandatory CI adjustment (AIP-00A, before Staging config or AI source work):**
- In AIP-00A extend branch triggers for **validation jobs only**, retaining production-only deploy condition. In AIP-00B manual `--env ai-staging` deploy becomes explicitly authorized only after human approval and green CI. In AIP-00C add separate CI-gated Staging-only deployment. Never deploy production or run production migrations from feature branch.
- Retain `paths-ignore: ["**/*.md"]` for push + PR so design and handover Markdown-only commits cause **no CI**.
- Avoid duplicating existing CI workflows, weakening tests, or changing production branch behavior. After source/config workflow push, confirm exact-SHA jobs actually run and no deploy job runs.

Official references to recheck before live implementation:
- https://developers.openai.com/api/docs/models/gpt-6-luna
- https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.cloudflare.com/durable-objects/api/alarms/


### AI Staging environment (required for mobile gameplay review)

**Product requirement, independent of production:** Future bot matches MUST be testable on a persistent HTTPS URL in Safari/Chrome on an iPhone. The phone is a viewer/controller; AI inference, action execution and scheduling are server-side. Staging initially deploys the existing unmodified WTK game with **AI disabled**; the mobile bot experience comes later as bot tasks become usable. The Staging URL does not exist until a real deployment is confirmed.

**Architecture and isolation:**
- Deploy source exclusively from `feature/smart-bot-player` to a distinct Cloudflare Worker through a named Wrangler environment `env.ai-staging`. Expected Worker name `three-kingdoms-ai-staging`; derive and record the *actual* `workers.dev` URL, not a guessed hostname.
- Create a NEW remote D1 database, proposed name `three-kingdoms-ai-staging-db`. Its generated UUID must be **different from production UUID `3151997a-f69e-4a45-ab51-9e4fd062aeb3`**. Declare an explicit `env.ai-staging.d1_databases` binding `DB` to that new database, with `migrations_dir: drizzle`; Wrangler named-environment bindings are not inherited automatically.
- Use the existing checked-in Drizzle migrations but apply them **only** to the verified Staging D1 target with `--env ai-staging` and `--remote`. Verify account, DB name, DB ID and command target before writing remotely. Never run `wrangler d1 migrations apply three-kingdoms-db --remote` for Staging; that refers to production.
- Initial `env.ai-staging.vars` include `BOT_AI_ENABLED=false`. No real OpenAI key or live model calls are authorized by the Staging bootstrap task. Later, after separate approval, store `OPENAI_API_KEY` only as a **Staging-scoped secret**, not in `vars`, JavaScript, GitHub or browser.
- Deploy manually via an explicit Staging command such as `npx wrangler deploy --env ai-staging` only once CI has validated the exact source SHA. Staging remote provisioning/deployment is approved only for the Agent's explicitly authorized AIP-00B task; never deploy the default production Worker, or edit the production D1/migrations as a side effect.
- Staging's `workers.dev` URL is normally publicly accessible. Before enabling OpenAI API calls or sending sensitive/test-player data, gate access using Cloudflare Access or another reviewer-approved control, verify the iPhone authentication flow, and set API use caps. A secret hostname alone is not access control.
- Cloudflare account/API permissions or secure secrets may need direct human action. Agent must STOP as `BLOCKED — USER INPUT REQUIRED` with minimal requested permission; never ask for passwords or keys to be pasted into the repository or handover.

**Human iPhone acceptance for Staging:** receive actual HTTPS URL; open on iPhone cellular/Wi‑Fi; see app; enter/create game room; refresh/reconnect; check health endpoint and browser/server evidence. Verify separate Staging/production Worker names, D1 IDs and data, and no production deployment. Staging is a review surface; passing CI or a desktop-only smoke does NOT substitute for user's mobile acceptance.

**Future feedback loop:** after each scoped bot task, Agent reports exact commit/deployed SHA, a reproducible staging room scenario and sanitized decision trace (state revision, legal candidate set or IDs, chosen action, errors, timing/token use). Human sends screenshots and gameplay feedback; Planner determines whether defect is policy/prompt, legal candidate, action executor, scheduler or presentation, then writes only the next bounded AI-specific task. Keep `HANDOVER.md` and all UX2/OS/core-game designs independent and untouched.

**Official deployment references:** https://developers.cloudflare.com/workers/wrangler/environments/ ; https://developers.cloudflare.com/d1/configuration/environments/ ; https://developers.cloudflare.com/d1/wrangler-commands/ ; https://developers.cloudflare.com/workers/configuration/routing/workers-dev/ .

## 6. Delivery roadmap (broad; NOT a standing execution queue)

Each row is a **long-term phase goal**. A task is executable only if the **detailed specification below** is complete and its status is **APPROVED** with all dependencies **ACCEPTED**. The user authorized a bounded initial AIP-00B → AIP-00C → AIP-01 batch in the 2026-10-17 design-driven automation discussion; this does **not** accept any completed task, bypass cloud rights/cost consent, or authorize DRAFT stages.

| Stage | ID | Deliverable | Principal evidence | Status |
| --- | --- | --- | --- | --- |
| Bootstrap | **AIP-00A** | Feature-branch CI gate, no production deploy, Markdown-only ignores | validated exact SHA, no deploy job | **ACCEPTED — HUMAN REVIEW 2026-10-17** |
| Staging | **AIP-00B** | Separate Worker, separate D1, safe manual deployment and iPhone URL | actual URL, unique DB UUID, migrations, mobile smoke | **ACCEPTED — USER DEVICE FEEDBACK 2026-10-18** |
| Automation | **AIP-00C** | Code pushes deploy to Staging only after full CI | exact SHA deploy, production unaffected, docs-only ignores | **APPROVED — ELIGIBLE; STAGING BUILD SAFETY GATE** |
| AI lab | AIP-01 | Offline/read-only OpenAI Decision Prototype (mock first, tiny opt-in live eval) | 10–20 anonymous fixtures, valid candidate IDs, latency, usage report | **APPROVED — MOCK/OFFLINE ONLY UNTIL LIVE BUDGET GATE; WAITING AIP-00C ACCEPTANCE** |
| Legal contracts | AIP-02 | Canonical BotObservation and narrowly scoped legal candidates | privacy, valid cards/targets, stale decisions | DRAFT |
| Player identity | AIP-03 | Dedicated bot seats and host-only lobby lifecycle | auth/race tests; no Test Player token reuse | DRAFT |
| Shared action | AIP-04 | Bot Executor through existing canonical server validation | no forged actor, replay, stale revision, card loss | DRAFT |
| Driver | AIP-05 | Autonomous bot loop and reliable scheduler | restart/duplicate wakeup, human waiting protected | DRAFT |
| Rules coverage | AIP-06 | Full Hero choice, draw/play/respond/discard, Negation/rescue | playable 1-human + 3-bot Staging match | DRAFT |
| Product UX | AIP-07 | Host Add/Remove Bot and public BOT indicator | iPhone responsive/accessibility feedback | DRAFT |
| Tactical AI | AIP-08 | Role-aware targeting, skills and card priorities | benchmark against baseline | DRAFT |
| Memory AI | AIP-09 | Public-action identity inference and tactical memory | provenance and hidden-role privacy tests | DRAFT |
| Release | AIP-10 | Full reliability, privacy and production-readiness review | staging evidence, separate user production approval | DRAFT |

**Dependency / automation rule:** AIP-00A is **ACCEPTED (human decision 2026-10-17)**. AIP-00B is **ACCEPTED** after positive user device/browser testing, so its dependency now unlocks AIP-00C; the Agent must still enforce Staging-specific build/D1 binding safeguards and all other risk gates. AIP-00C → AIP-01 become eligible **automatically when each prior task is ACCEPTED**, not when merely PENDING_REVIEW. Coding Agent does not need another pasted task. AIP-00B needs verified Cloudflare permissions; AIP-01 live paid calls require a separate explicit maximum-spend/data gate; mock-only work is approved. AIP-02+ are **DRAFT**, not automatically executable. Agent may undertake independent APPROVED work while other tasks await review only if dependencies and code ownership are genuinely independent. No bot production release without a new user decision.



## 7. Detailed implementation specs for near-term work

### AIP-00A — Enable safe feature-branch CI (FIRST TASK)

**Status: ACCEPTED — Human Product Owner approval on 2026-10-17.** It is a short CI/bootstrap step, intentionally before Staging code/config so every later commit has an automatic validation gate.

**Scope:** change `.github/workflows/deploy.yml` so pushes and PRs to `feature/smart-bot-player` run existing lint/build/fast/API/browser-smoke jobs. Keep current `main` and `ux-v2` triggers and production deploy condition unchanged; retain `paths-ignore: ["**/*.md"]`. Absolutely NO game code, `wrangler.jsonc`, DB provisioning, Cloudflare deployment, OpenAI setup, UX or OS changes.

**Agent instructions:** (1) Read `AGENTS.md`, complete latest `docs/AI_PLAYER_DESIGN.md`, `docs/AI_PLAYER_AGENT_WORKFLOW.md` and `AI_PLAYER_HANDOVER.md`. Current handover's obsolete `AIP-D0/AIP-01 bot seat` preview has never started; Coding Agent alone replaces it with the newly approved AIP-00A. (2) Inspect branch/worktree/remote HEAD and CI exact-SHA: inherited `main` baseline run `39037960303` passed but docs-only bot branch has **no own CI yet**; record this truthfully. (3) Make minimal workflow edit; verify YAML triggers and branch-specific deploy gates. (4) Before committing inspect relevant remote CI; address known failures rather than ignoring; push focused change and confirm exact new SHA, all test jobs and **no production deploy/migrations**. (5) Update `AI_PLAYER_HANDOVER.md` with accurate SHA/tests/CI, and change only this task's status/evidence in design to `PENDING_REVIEW`, preserving Planner edits. STOP.

**Implementation evidence:** Started at feature-branch SHA `b11c8a7a855aafc7370b78f3190f7e7e77e0ce59`; no feature-branch Actions run existed. Inherited `main` baseline run `39037960303` passed on `6743a357ef19ca930a02f7e3faa8cee843bd6a38`, not feature-branch validation. Workflow implementation commit `75073b6bbfffe9281223ef1eaac85349496224af` passed exact-SHA [Actions run 39058906244](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39058906244): lint/build/fast tests, API tests and browser startup/room smoke passed; production `deploy` was skipped, so no production D1 migration or Worker deployment ran. Focused YAML/branch-gate/Markdown-exclusion assertions and `git diff --check` passed; `actionlint` was unavailable. The stale AIP-D0/AIP-01 handover preview was replaced by the AIP-00A assignment.

**Acceptance:** feature branch validates on every code push; required CI green for exact SHA; production deployment never executes on feature branch; Markdown-only docs/handover updates remain ignored; original production branch behavior unchanged. If ambiguous/failing, report `BLOCKED`, not accepted.

**Final reviewer outcome (2026-10-17): ACCEPTED by explicit human Product Owner decision.** Independent review confirmed the only behavior change in `.github/workflows/deploy.yml` was inclusion of `feature/smart-bot-player` in push/PR validation branch filters. Exact implementation SHA `75073b6bbfffe9281223ef1eaac85349496224af`, [run 39058906244](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39058906244): lint/build/fast, API, browser smoke all `success`; production `deploy` job `skipped`. The ensuing docs-only HEAD does not need a new CI run. This reviewer acceptance unlocks AIP-00B by dependency; it is **not** approval to reuse production D1, configure API secrets, or deploy production.

### AIP-00B — Provision isolated, mobile-accessible Staging

**Status: ACCEPTED — Human Product Owner's positive functional Staging feedback on 2026-10-18. Priority: P0. Dependencies: AIP-00A ACCEPTED.** This finished task was pre-approved as part of the initial Staging batch. Cloudflare account permissions must be verified before any remote operation.

**Goal:** deploy the unmodified WTK application to a **separate** Cloudflare Worker and NEW D1 database; create a real HTTPS URL usable in iPhone Safari. No AI model calls in this step.

**Scope:** carefully configure `wrangler.jsonc` `env.ai-staging` with explicit D1 `DB` binding and `BOT_AI_ENABLED=false`; create new remote D1 `three-kingdoms-ai-staging-db`; apply existing Drizzle migrations ONLY to this verified Staging target; use `npx wrangler deploy --env ai-staging` after passing required exact-SHA CI. Cloudflare API credentials must be authorized and kept secret. No edits to production D1, Worker default deployment, production workflow, UX2 or gameplay code; no OpenAI API secret.

**Safety checks:** verify actual account and UUID against production; confirm explicit `--env ai-staging` for deploy and D1 commands; never treat the root `DB` binding as Staging. If any uncertainty or permission issue, STOP and request a small specific human action instead of risking production.

**Implementation evidence:** AIP-00A is human-accepted; its validated code-bearing commit `75073b6bbfffe9281223ef1eaac85349496224af` passed [Actions run 39058906244](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39058906244). Wrangler 4.128.0 account and write scopes were verified. Created isolated D1 `three-kingdoms-ai-staging-db`, UUID `62616495-59ea-4a9c-b669-2d3267a83cab`, distinct from production UUID `3151997a-f69e-4a45-ab51-9e4fd062aeb3`. Applied migrations `0000`–`0012` only with `--remote --env ai-staging`; follow-up migration listing reports none pending, and a read-only SQL query confirms the application tables. `wrangler.jsonc` defines Worker `three-kingdoms-ai-staging` with `workers_dev=true`, only the Staging D1 binding, and `BOT_AI_ENABLED=false`; a build under `CLOUDFLARE_ENV=ai-staging`, generated-config assertions, and Wrangler dry-run verified those exact settings. The root production D1 binding is unchanged. Config/code commit `fd78a100edd7c629db12b989613be3d3d416852b` passed exact-SHA [Actions run 39075595817](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39075595817): lint/build/fast, API, and browser smoke passed; production deploy was skipped. Deployed from branch SHA `9b36442`, Cloudflare Worker version `b722630a-5794-4f04-ba2c-ae2def827828`, at https://three-kingdoms-ai-staging.dai-jinge.workers.dev. Wrangler confirmed the deployed Staging D1 binding and `BOT_AI_ENABLED=false`. Live smoke: `/` and `/api/health` returned HTTP 200; room creation returned HTTP 201; authenticated lobby read returned HTTP 200 for room `ZNPR5` with one host. Production Worker deployment listing was unchanged by this task, and no production D1 command or deploy was run. On 2026-10-18, the user confirmed the Staging site was accessible and personally tested room selection and Hero selection. This positive functional feedback supports human acceptance of the Staging task. The user did not specifically report refresh/rejoin or the browser used, so those details must not be represented as verified. Stop here until the remaining review is confirmed.

**Agent deliverable:** config diff, exact CI SHA/run, new Worker name and real HTTPS URL, Staging DB name/UUID, migration evidence, health and room creation smoke, no-production-change proof, mobile test instructions. Update own handover and task state only; finish `PENDING_REVIEW` and STOP. Human uses iPhone to verify real URL, lobby and room flow before ACCEPTED.

**Independent Planner review (2026-10-17; NOT human acceptance):**
- **VERIFIED via GitHub:** the only runtime configuration change was an `env.ai-staging` section in `wrangler.jsonc`, with `DB` bound to Staging UUID `62616495-59ea-4a9c-b669-2d3267a83cab` (different from production `3151997a-f69e-4a45-ab51-9e4fd062aeb3`); root production binding unchanged. Required exact-SHA [CI run 39075595817](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39075595817) on `fd78a100edd7c629db12b989613be3d3d416852b` succeeded for lint/fast, API and browser smoke; production deploy job **skipped**. Later commits were Markdown-only.
- **VERIFIED from independent public HTTP fetch:** `https://three-kingdoms-ai-staging.dai-jinge.workers.dev/` returns the real Three Kingdoms homepage, and `/api/health` returns `{"ok":true,"worker":"available"}`. This supports public HTTPS reachability; it is not iPhone device testing.
- **AGENT-REPORTED, NOT INDEPENDENTLY CONFIRMED THROUGH CLOUDFLARE ADMIN:** D1 provisioning, 0000–0012 migrations, deployment version `b722630a-5794-4f04-ba2c-ae2def827828`, deployed D1 binding, room POST 201/authenticated lobby GET 200 and unchanged production deployment listing. GitHub configuration and external health check are compatible with the report but do not independently prove Cloudflare account state or DB contents.
- **HUMAN FUNCTIONAL FEEDBACK RECEIVED (2026-10-18):** the user says the Staging URL works and that they tested room selection and Hero selection. Do NOT assert the user independently verified refresh/rejoin or explicitly reported Safari specifically. Add a refresh/rejoin check to the next Staging smoke tests.
- **PREVENTIVE FOLLOW-UP FOR AIP-00C:** Agent found that a default Vinext build followed by `wrangler deploy --dry-run --env ai-staging` unexpectedly selected the **production DB binding**. Staging-target build used `CLOUDFLARE_ENV=ai-staging npm run build` and a subsequent dry-run to select Staging. AIP-00C automatic pipeline **must** include environment-targeted build, generated-binding verification, and fail-fast UUID checks before any staging migration/deploy; never reuse a root/default build artifact for deployment. This does not invalidate this manual task, but is a critical safeguard for the next task.

**Final reviewer disposition: ACCEPTED (2026-10-18), based on user-confirmed accessible Staging plus room and Hero selection, supported by independently verified GitHub config, passing exact-SHA CI and public HTTPS/health checks.** The user did not specifically report refresh/rejoin; carry that forward as an explicit AIP-00C regression check, not AIP-00B evidence. No production code/DB/cloud changes were performed by this review.


### AIP-00C — CI-gated automatic Staging deployment

**Status: APPROVED (dependency-gated). Priority: P0. Dependencies: AIP-00B ACCEPTED.** No auto-deploy setup or production workflow changes until the user has accepted real mobile Staging.

**Goal:** after all feature-branch CI jobs pass on a source change, automatically apply migrations against **only Staging D1** and deploy **only the Staging Worker**, followed by health/room smoke. No deploy on PRs or pure Markdown updates. Use existing workflow or isolated staging job, with exact `refs/heads/feature/smart-bot-player` push condition and protected Cloudflare credentials. Production `deploy` job and its root database target remain unchanged; no production access from Staging job.

**Additional Staging browser regression (from AIP-00B user review):** include a focused browser/mobile smoke check for refreshing/rejoining an existing Staging room. The user verified room selection and Hero selection but did not specifically report refresh/rejoin. Never claim an actual iPhone/browser scenario passed without evidence.

**Critical build-target prerequisite (from AIP-00B review):** the Cloudflare/Vinext integration can ignore the intended Staging D1 binding if the build uses the default environment, even when the later deploy command uses `--env ai-staging`. The CI Staging job MUST run an environment-targeted build (`CLOUDFLARE_ENV=ai-staging npm run build` or a tested equivalent), then verify the generated Worker name, `DB` binding ID **equals** `62616495-59ea-4a9c-b669-2d3267a83cab` and **does not equal** production UUID `3151997a-f69e-4a45-ab51-9e4fd062aeb3`, and `BOT_AI_ENABLED=false` before any remote migration/deploy. Explicitly reject root/default deploy/build artifacts, and log only sanitized binding IDs/config evidence. Validate `wrangler deploy --dry-run --env ai-staging` against the generated artifact before running a real deploy. No production migration or default Worker deployment.

**Required evidence:** failure blocks deployment; successful code commit runs all validation and stages exact commit SHA; no production migration/deploy; Markdown-only commit semantics preserved; actual URL remains phone accessible. Change only own task status to `PENDING_REVIEW` and STOP.

### AIP-01 — Offline OpenAI decision lab, no live bots

**Status: APPROVED for fully offline/mock implementation (dependency-gated). Priority: P1. Dependencies: AIP-00C ACCEPTED.** Live OpenAI API calls, additional paid services or transmitting real-player data remain **BLOCKED without a separate explicit cost/data-sharing approval**. The agent may implement an opt-in script that is OFF by default, but must not invoke real API calls until explicitly authorized.

**Goal:** demonstrate that a single OpenAI call can choose a valid candidate from a small, privacy-safe, trustworthy WTK tactical snapshot, without affecting rooms, D1 or UI.

**Scope and detailed steps:**
1. Inspect current game `CurrentAction` and response/choice authority. Select a deliberately narrow, fully provable scenario family: e.g. responder choosing among explicit `options` vs legal decline, or carefully verified turn choice. Do **not** claim play-phase legal target enumeration already exists.
2. Define pure typed `BotDecisionRequestV1` and `BotDecisionResultV1`, with `observationVersion`, `decisionId`, selected candidate ID, and short reason. Choose candidate ID semantics stable **within one decision only**.
3. Produce 10–20 curated synthetic/anonymous fixtures, including: only-one-choice, two choices, Rebel-versus-revealed-Lord, bot low HP/Peach, no actual legal target, optional refusal, duplicate candidate IDs rejected, hidden hand/role data absent. Establish manually reasoned expected candidate/acceptable set; do not invent legality.
4. Implement **mock transport first**; inject provider dependency so tests never require a key/network. Verify strict input boundary, parser, missing/unknown/stale candidate, API 429/5xx/timeout/incomplete/refusal, and bounded errors. No magical fallback if its legality is unproven.
5. Add opt-in local live evaluation script using `OPENAI_API_KEY` from environment, feature flag default OFF, hard cap e.g. 5 requests per invocation, sanitized fixtures, and an explicit user-approved call budget. Do not log full private observation or raw real-player data.
6. Use `gpt-6-luna` with OpenAI Responses API and strict JSON schema, `store:false` where supported, optional low reasoning effort as benchmark; record per-call elapsed time, token usage, calculated/actual costs if available, chosen action and validity. Compare mocked vs live.
7. Produce concise reviewer artifact/report with fixture-level decisions, expected/actual and failures; don't touch live rooms, game engine, production secrets, database schema, UX, or existing handovers except the AI agent's own handover.

**Acceptance:** mocked tests deterministic/offline; no secrets in git/logs; all successful responses select supplied IDs; malformed and unauthorized outputs fail closed; at least 10 valid privacy-reviewed scenarios; optional live run is **reported honestly** as not run if API key/permission/budget unavailable. AIP-01 may be submitted PENDING_REVIEW with robust mock coverage and the real-call capability disabled. If live evaluation is desired, obtain explicit user approval of hard cost/request budget and secure API key; never infer free tokens guarantee free usage. CI green for any code commit. After PENDING_REVIEW, re-evaluate the design queue for *independent* approved work; do not self-accept.

### AIP-02 — Bot Observation + Canonical Legal Candidates

**Status: DRAFT. Depends on accepted AIP-01 and review of actual candidate gaps.**

Inspect `app/api/rooms/route.ts`, `game/protocol.d.ts`, `game/responses.ts`, capability/decision modules. Expand source-backed candidate enumeration **one decision family at a time**, beginning with the proven AIP-01 response family and then play-phase candidates. Actor-private observation must not leak to public presentation, audit or telemetry. Design recheck includes full candidate payload mapping, stale revision and exact card/target tests; separate large refactor into sub-tasks. Do not start real autonomous seats until this has stable shared executor boundaries.

### Later-task decomposition policy

For AIP-02–AIP-10, Planner must prepare detailed bounded English specifications **in THIS design file** before changing any DRAFT task to APPROVED. Each must specify verified code anchors, exact permitted files and data contracts, step-by-step changes, dependencies and priority, explicit exclusions, focused privacy/replay/concurrency tests, CI/real Staging verification and human UX/release gates. The human may approve a clearly enumerated batch once; Agent will then automatically find the eligible tasks. Do not rely on a verbal summary or handover as the spec. Do not assume a broad roadmap row is implementation authorization.

## 8. Runtime reliability and AI cost contracts (future implementation gates)

- Trigger AI only for meaningful decisions. Unique mandatory actions may use safe deterministic execution **only if proven canonical**.
- LLM text cannot invent game actions. Parse strict schema, map candidate ID through allowlist, re-read revision; executor performs authoritative gameplay checks again.
- Bound request time, output tokens, per-room turns/invocation, model retries, total estimated cost and rate. Track token usage from response payload; token incentives / free credits are account-specific, **not** a reliability assumption.
- If model returns invalid/refusal/timeout/rate limit: record sanitized outcome, prefer a demonstrated legal deterministic choice only if one is available, else block/reschedule boundedly for a human-visible issue. Never consume another seat's cards.
- Bot autonomy must not extend human response timers, advance human pending decisions, or race presentation readiness. Shared Negation requires unique window identity and no duplicate submissions.
- Durable scheduling requires at-least-once processing and compare-and-swap/lease semantics, with test evidence after simulated restart/duplicate wakeups.
- Keep private roles and hands away from telemetry; sanitize diagnostics; policy explanations shown to users should be public-safe, not reveal bot-private cards or unproven enemy identity.

## 9. Design-driven autonomous implementation and independent review

**Governance source for new conversations:** `docs/AI_PLAYER_PLANNER_REVIEWER_GUIDE.md`. **Single Agent execution method:** `docs/AI_PLAYER_AGENT_WORKFLOW.md`. AI task queue **lives HERE**, not in any handover.

**States:** `DRAFT` (not actionable) -> `APPROVED` (fully specified and authorized, may still be dependency-blocked) -> `IN_PROGRESS` (Agent owns one bounded task) -> `PENDING_REVIEW` (evidence submitted) -> `ACCEPTED` (human / explicitly delegated technical reviewer signoff); alternative `CHANGES_REQUESTED` or `BLOCKED`. A future task is not authorized solely because it appears on the Roadmap.

**Required detail for every APPROVED task:**
1. Unique ID, title, **Priority**, exact dependencies, clear status and human authorization/risk gate.
2. Observable objective; verified current code entry points; exact file/contracts touched; explicit non-goals.
3. Step-by-step implementable instructions precise enough for an Agent to act **without guessing design or requesting a pasted task**.
4. Named positive/negative tests, privacy/actor/stale/concurrency cases as applicable; exact-SHA GitHub CI expectations and real Staging/iPhone criteria when relevant.
5. Output evidence: commit SHA, CI run/job outcomes, actual Staging Worker/DB/URL, smoke/AI fixture results, risks; precise STOP condition.
6. Reviewer feedback appended **to the task** with reproducible expected versus observed behavior and action. Do not silently rewrite completed requirements as a workaround.

**Coding Agent autonomous loop:** after each bounded task, re-fetch the full latest design + workflow + its own handover; reconcile status; prioritize authorized `CHANGES_REQUESTED` corrections; otherwise select highest-priority `APPROVED` task with **all** dependencies `ACCEPTED` and any Cloudflare/API/security gates satisfied. Record only one current task in **its own** `AI_PLAYER_HANDOVER.md`. Implement / focused tests / precommit CI check / push / exact-SHA required checks / Staging if expressly authorized / task evidence -> `PENDING_REVIEW`. Then automatically re-evaluate eligibility. It MAY implement another independent task while the first awaits review if no dependency/conflicting code risk; it MUST NOT self-accept or run dependent tasks. If no eligible task, stop `WAITING_FOR_REVIEW` or `BLOCKED` and report the smallest missing decision/permission. Automatic selection only works while an Agent execution session or external runner is active; a Markdown spec does not self-schedule background execution.

**Planner / Reviewer review loop:** every new design/review session first reads `docs/AI_PLAYER_PLANNER_REVIEWER_GUIDE.md`, this current document, the read-only `AI_PLAYER_HANDOVER.md`, relevant source and GitHub CI. Search `PENDING_REVIEW`/**`CHANGES_REQUESTED`** in **this design file**, not just handover. Inspect actual diff, exact-SHA code-bearing CI jobs, Staging deployed SHA/URL where relevant, privacy and iPhone evidence, record `VERIFIED` / `RISK` / `UNKNOWN`. If issues, set `CHANGES_REQUESTED` with numbered actionable fixes. If passed, recommend acceptance, then mark `ACCEPTED` **only when human has accepted or explicitly delegated the particular category of technical acceptance**. Never touch any handover; only Agent can reconcile stale handover after the design changes. Human still approves production, model-data sharing, budget and phone UX.

**Scope/ownership:** Planner may update **this** design. Under direct user governance request only, Planner may update its own guide or Agent workflow. Agent may alter only status/evidence for the **selected task**, not requirements or approvals. Both preserve remote concurrent changes; stop on conflicts. UX2 `HANDOVER.md`, OS/core-game and UX2 documents never change as a side effect.

## 10. Review gates and unresolved product decisions

**Design-driven execution approved:** independent AI branch, OpenAI backend, isolated mobile-accessible Staging, CI safety, and an initial *detailed* task batch AIP-00B, AIP-00C and AIP-01 (mock-only until cost gate). Agent picks tasks automatically from approved detailed specs when dependencies are **ACCEPTED**. AIP-00A was explicitly ACCEPTED by the human on 2026-10-17; this acceptance is recorded above and does not imply acceptance of any subsequent task. No production deployment, hidden data transmission or paid API use granted by this batch.

**Still requires explicit human review before corresponding phase:** real player bot/human room composition (default one human host), whether bots can replace absent humans (defer), bot difficulty setting (defer), selection of durable scheduler technology (defer), human-facing bot pacing/reason display, live player-data external transmission/retention, live API financial budget, first usable match acceptance rubric.

**Current reviewer gate:** AIP-00A was ACCEPTED on 2026-10-17; AIP-00B is ACCEPTED on 2026-10-18 after the user's positive Staging functional check (website access, room selection and Hero selection), alongside independently verified CI/config and public endpoint checks. **AIP-00C is the next eligible approved task**, automatically selectable by the Coding Agent on its next run without a pasted task. It must guard the Staging-specific Vinext build artifact and D1 binding before automated deployment, and include refresh/rejoin checks that were not confirmed for AIP-00B. AIP-01 follows only after AIP-00C acceptance. The Planner writes statuses/feedback **only here**; Coding Agent alone maintains AI handover. Do not start dependent work while its prerequisite remains pending review.
