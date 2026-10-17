# WTK Smart Bot Player — Product Roadmap and Implementation Design

> Feature branch: `feature/smart-bot-player`
> Design revision: **AIP-D2 / 2026-10-17**
> Owner: **Human Reviewer + Planner**. Planner edits **this file only**.
> Status: **PHASED ROADMAP FOR REVIEW; only AIP-00A (AI branch CI) is currently APPROVED for the first Coding Agent trial. AIP-00B (isolated Staging) and AIP-00C (automatic Staging deployment) require separate human acceptance and approval**.
> Coding Agent: **one agent, one task, then PENDING_REVIEW**. No automatic next-task advancement.
> This document is **NOT** a second WTK core-game specification, an OS architecture spec, a UX2 specification, or an agent handover.

## 0. Document boundary / non-duplication rule (mandatory)

This file owns **only AI-player behavior, AI integration, bot-specific privacy/contracts, rollout stages and AI tasks**. Keep the following authorities separate:

| Authority | Owns | AI Player must NOT duplicate/change |
| --- | --- | --- |
| `AGENTS.md` | Cross-repository architecture, server authority, safety, engineering standards | Canonical rules, existing session/visibility contracts |
| `docs/OFFICIAL_CARD_REFERENCE.md`, `docs/STANDARD_108_DECK_MANIFEST.md`, `docs/STANDARD_HERO_REFERENCE.md` | WTK Standard deck, card effects, Hero semantics | Card/Hero rule tables in prompts/code |
| `docs/UX2-refine.md` and UX2 Interaction Stage docs | Public board, presentation and control UX | Game-board redesign, Local Dock / Stage ownership |
| Existing game/OS and deployment code | Room lifecycle, phase/pending engine, D1 state, game transitions, current human session | Parallel bot-specific rules engine, duplicated match server |
| `docs/AI_PLAYER_AGENT_WORKFLOW.md` | Agent operating method, CI/stop/handback | Product/strategy requirements |
| `AI_PLAYER_HANDOVER.md` | Exactly one current Coding Agent assignment/progress + actual CI evidence | Long-term product roadmap |
| **This document** | AI-specific design, staged roadmap, approved task acceptance criteria, reviewer findings | Append-only execution diary or UX2 task queue |

The existing UX2 §5/§6 design and §4A/§4B refinement sequencing stay untouched. UX2 §6 must not be pulled into bot tasks as "necessary UI cleanup". If a bot feature discovers a missing canonical game capability, record the contract and plan a bounded adapter/fix through existing engine ownership instead of copying rules into AI modules.

**Ownership firewall:** Planner may modify ONLY `docs/AI_PLAYER_DESIGN.md` on this branch. Planner must NEVER edit either `AI_PLAYER_HANDOVER.md` or `HANDOVER.md` (nor sources/workflows/tests). Coding Agent alone owns `AI_PLAYER_HANDOVER.md`, may change *status/evidence for its one task* in this design while preserving concurrent Planner edits, and may change code/tests/workflow only for its approved task. Human Reviewer alone marks `ACCEPTED`.

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

Each row is a **bounded phase goal**, not permission to implement every task. Break further into one-testable-concern slices at the planning boundary. Next item only after human accepts the previous item.

| Stage | ID | Deliverable | Principal evidence | Status |
| --- | --- | --- | --- | --- |
| Bootstrap | **AIP-00A** | Feature-branch CI gate, no production deploy, Markdown-only ignores | validated exact SHA, no deploy job | **APPROVED — FIRST AGENT TASK** |
| Staging | **AIP-00B** | Separate Worker, separate D1, safe manual deployment and iPhone URL | actual URL, unique DB UUID, migrations, mobile smoke | DRAFT |
| Automation | **AIP-00C** | Code pushes deploy to Staging only after full CI | exact SHA deploy, production unaffected, docs-only ignores | DRAFT |
| AI lab | AIP-01 | Offline/read-only OpenAI Decision Prototype (mock first, tiny opt-in live eval) | 10–20 anonymous fixtures, valid candidate IDs, latency, usage report | DRAFT |
| Legal contracts | AIP-02 | Canonical BotObservation and narrowly scoped legal candidates | privacy, valid cards/targets, stale decisions | DRAFT |
| Player identity | AIP-03 | Dedicated bot seats and host-only lobby lifecycle | auth/race tests; no Test Player token reuse | DRAFT |
| Shared action | AIP-04 | Bot Executor through existing canonical server validation | no forged actor, replay, stale revision, card loss | DRAFT |
| Driver | AIP-05 | Autonomous bot loop and reliable scheduler | restart/duplicate wakeup, human waiting protected | DRAFT |
| Rules coverage | AIP-06 | Full Hero choice, draw/play/respond/discard, Negation/rescue | playable 1-human + 3-bot Staging match | DRAFT |
| Product UX | AIP-07 | Host Add/Remove Bot and public BOT indicator | iPhone responsive/accessibility feedback | DRAFT |
| Tactical AI | AIP-08 | Role-aware targeting, skills and card priorities | benchmark against baseline | DRAFT |
| Memory AI | AIP-09 | Public-action identity inference and tactical memory | provenance and hidden-role privacy tests | DRAFT |
| Release | AIP-10 | Full reliability, privacy and production-readiness review | staging evidence, separate user production approval | DRAFT |

**Dependency:** AIP-00A ACCEPTED + human approval of AIP-00B → Staging mobile acceptance + approval of AIP-00C → automatic Staging accepted + approval of AIP-01. Nothing is auto-authorized beyond the current task. Later tasks depend on accepted predecessors; no bot release to production without a separate explicit user decision.



## 7. Detailed implementation specs for near-term work

### AIP-00A — Enable safe feature-branch CI (FIRST TASK)

**Status: APPROVED — only currently authorized implementation task.** It is a short CI/bootstrap step, intentionally before Staging code/config so every later commit has an automatic validation gate.

**Scope:** change `.github/workflows/deploy.yml` so pushes and PRs to `feature/smart-bot-player` run existing lint/build/fast/API/browser-smoke jobs. Keep current `main` and `ux-v2` triggers and production deploy condition unchanged; retain `paths-ignore: ["**/*.md"]`. Absolutely NO game code, `wrangler.jsonc`, DB provisioning, Cloudflare deployment, OpenAI setup, UX or OS changes.

**Agent instructions:** (1) Read `AGENTS.md`, complete latest `docs/AI_PLAYER_DESIGN.md`, `docs/AI_PLAYER_AGENT_WORKFLOW.md` and `AI_PLAYER_HANDOVER.md`. Current handover's obsolete `AIP-D0/AIP-01 bot seat` preview has never started; Coding Agent alone replaces it with the newly approved AIP-00A. (2) Inspect branch/worktree/remote HEAD and CI exact-SHA: inherited `main` baseline run `39037960303` passed but docs-only bot branch has **no own CI yet**; record this truthfully. (3) Make minimal workflow edit; verify YAML triggers and branch-specific deploy gates. (4) Before committing inspect relevant remote CI; address known failures rather than ignoring; push focused change and confirm exact new SHA, all test jobs and **no production deploy/migrations**. (5) Update `AI_PLAYER_HANDOVER.md` with accurate SHA/tests/CI, and change only this task's status/evidence in design to `PENDING_REVIEW`, preserving Planner edits. STOP.

**Acceptance:** feature branch validates on every code push; required CI green for exact SHA; production deployment never executes on feature branch; Markdown-only docs/handover updates remain ignored; original production branch behavior unchanged. If ambiguous/failing, report `BLOCKED`, not accepted.

### AIP-00B — Provision isolated, mobile-accessible Staging

**Status: DRAFT — only approve after human acceptance of AIP-00A.**

**Goal:** deploy the unmodified WTK application to a **separate** Cloudflare Worker and NEW D1 database; create a real HTTPS URL usable in iPhone Safari. No AI model calls in this step.

**Scope:** carefully configure `wrangler.jsonc` `env.ai-staging` with explicit D1 `DB` binding and `BOT_AI_ENABLED=false`; create new remote D1 `three-kingdoms-ai-staging-db`; apply existing Drizzle migrations ONLY to this verified Staging target; use `npx wrangler deploy --env ai-staging` after passing required exact-SHA CI. Cloudflare API credentials must be authorized and kept secret. No edits to production D1, Worker default deployment, production workflow, UX2 or gameplay code; no OpenAI API secret.

**Safety checks:** verify actual account and UUID against production; confirm explicit `--env ai-staging` for deploy and D1 commands; never treat the root `DB` binding as Staging. If any uncertainty or permission issue, STOP and request a small specific human action instead of risking production.

**Agent deliverable:** config diff, exact CI SHA/run, new Worker name and real HTTPS URL, Staging DB name/UUID, migration evidence, health and room creation smoke, no-production-change proof, mobile test instructions. Update own handover and task state only; finish `PENDING_REVIEW` and STOP. Human uses iPhone to verify real URL, lobby and room flow before ACCEPTED.

### AIP-00C — CI-gated automatic Staging deployment

**Status: DRAFT — only approve after AIP-00B is accepted.**

**Goal:** after all feature-branch CI jobs pass on a source change, automatically apply migrations against **only Staging D1** and deploy **only the Staging Worker**, followed by health/room smoke. No deploy on PRs or pure Markdown updates. Use existing workflow or isolated staging job, with exact `refs/heads/feature/smart-bot-player` push condition and protected Cloudflare credentials. Production `deploy` job and its root database target remain unchanged; no production access from Staging job.

**Required evidence:** failure blocks deployment; successful code commit runs all validation and stages exact commit SHA; no production migration/deploy; Markdown-only commit semantics preserved; actual URL remains phone accessible. Change only own task status to `PENDING_REVIEW` and STOP.

### AIP-01 — Offline OpenAI decision lab, no live bots

**Status: DRAFT — NOT authorized until AIP-00A/B/C are all human ACCEPTED and AIP-01 is separately approved.**

**Goal:** demonstrate that a single OpenAI call can choose a valid candidate from a small, privacy-safe, trustworthy WTK tactical snapshot, without affecting rooms, D1 or UI.

**Scope and detailed steps:**
1. Inspect current game `CurrentAction` and response/choice authority. Select a deliberately narrow, fully provable scenario family: e.g. responder choosing among explicit `options` vs legal decline, or carefully verified turn choice. Do **not** claim play-phase legal target enumeration already exists.
2. Define pure typed `BotDecisionRequestV1` and `BotDecisionResultV1`, with `observationVersion`, `decisionId`, selected candidate ID, and short reason. Choose candidate ID semantics stable **within one decision only**.
3. Produce 10–20 curated synthetic/anonymous fixtures, including: only-one-choice, two choices, Rebel-versus-revealed-Lord, bot low HP/Peach, no actual legal target, optional refusal, duplicate candidate IDs rejected, hidden hand/role data absent. Establish manually reasoned expected candidate/acceptable set; do not invent legality.
4. Implement **mock transport first**; inject provider dependency so tests never require a key/network. Verify strict input boundary, parser, missing/unknown/stale candidate, API 429/5xx/timeout/incomplete/refusal, and bounded errors. No magical fallback if its legality is unproven.
5. Add opt-in local live evaluation script using `OPENAI_API_KEY` from environment, feature flag default OFF, hard cap e.g. 5 requests per invocation, sanitized fixtures, and an explicit user-approved call budget. Do not log full private observation or raw real-player data.
6. Use `gpt-6-luna` with OpenAI Responses API and strict JSON schema, `store:false` where supported, optional low reasoning effort as benchmark; record per-call elapsed time, token usage, calculated/actual costs if available, chosen action and validity. Compare mocked vs live.
7. Produce concise reviewer artifact/report with fixture-level decisions, expected/actual and failures; don't touch live rooms, game engine, production secrets, database schema, UX, or existing handovers except the AI agent's own handover.

**Acceptance:** mocked tests deterministic/offline; no secrets in git/logs; all successful responses select supplied IDs; malformed and unauthorized outputs fail closed; at least 10 valid privacy-reviewed scenarios; optional live run is **reported honestly** as not run if API key/permission unavailable. If live evaluation is blocked by key or rate limit, request the smallest user action instead of treating it as a code defect. CI green for any code commit. Stop at PENDING_REVIEW.

### AIP-02 — Bot Observation + Canonical Legal Candidates

**Status: DRAFT. Depends on accepted AIP-01 and review of actual candidate gaps.**

Inspect `app/api/rooms/route.ts`, `game/protocol.d.ts`, `game/responses.ts`, capability/decision modules. Expand source-backed candidate enumeration **one decision family at a time**, beginning with the proven AIP-01 response family and then play-phase candidates. Actor-private observation must not leak to public presentation, audit or telemetry. Design recheck includes full candidate payload mapping, stale revision and exact card/target tests; separate large refactor into sub-tasks. Do not start real autonomous seats until this has stable shared executor boundaries.

### Later-task decomposition policy

For AIP-03–AIP-10, Planner must prepare one bounded English task only when previous review identifies the next genuine gap. Each must specify: authority, code entry points, data contract, exact permitted files, explicit exclusions, focused tests including privacy/replay/concurrency when relevant, CI evidence, stop boundary, and human UX/release gate where applicable. Do not dump multi-phase work into the handover.

## 8. Runtime reliability and AI cost contracts (future implementation gates)

- Trigger AI only for meaningful decisions. Unique mandatory actions may use safe deterministic execution **only if proven canonical**.
- LLM text cannot invent game actions. Parse strict schema, map candidate ID through allowlist, re-read revision; executor performs authoritative gameplay checks again.
- Bound request time, output tokens, per-room turns/invocation, model retries, total estimated cost and rate. Track token usage from response payload; token incentives / free credits are account-specific, **not** a reliability assumption.
- If model returns invalid/refusal/timeout/rate limit: record sanitized outcome, prefer a demonstrated legal deterministic choice only if one is available, else block/reschedule boundedly for a human-visible issue. Never consume another seat's cards.
- Bot autonomy must not extend human response timers, advance human pending decisions, or race presentation readiness. Shared Negation requires unique window identity and no duplicate submissions.
- Durable scheduling requires at-least-once processing and compare-and-swap/lease semantics, with test evidence after simulated restart/duplicate wakeups.
- Keep private roles and hands away from telemetry; sanitize diagnostics; policy explanations shown to users should be public-safe, not reveal bot-private cards or unproven enemy identity.

## 9. Agent execution and reviewer feedback loop

**Task state machine:** `DRAFT` → `APPROVED` → `IN_PROGRESS` → `PENDING_REVIEW` → `ACCEPTED`, or `CHANGES_REQUESTED` / `BLOCKED` / `PAUSED_BY_USER`. Only Human Reviewer marks accepted. Agent may adjust the selected task's execution-state/evidence fields, NEVER its acceptance criteria or another task's approval.

**Coding Agent each invocation:**
1. Inspect active branch, clean/dirty tree and remote commits safely; read complete latest design + `docs/AI_PLAYER_AGENT_WORKFLOW.md` + `AGENTS.md` + its own `AI_PLAYER_HANDOVER.md`.
2. Compare current design revision and any intervening Planner edits with previous handover, preserve uncommitted work.
3. If handover is PENDING_REVIEW, BLOCKED or PAUSED, stop. If no in-progress task, choose exactly ONE `APPROVED` task with ACCEPTED prerequisites; update **its own** handover, deleting stale handover preview only when safe. The initial handover currently mentions old AIP-01 bot-seat preview; it was never started and is superseded by approved AIP-00.
4. Before source commits inspect latest exact-SHA relevant branch CI (or validated code-bearing ancestor if HEAD docs-only). If failure, reproduce/repair first, and include scoped CI correction before/with commit. If ambiguous, wait/investigate. Never claim docs SHA green.
5. Build one bounded slice, focused negative/positive tests, confirm build where required; commit/push only scoped files. Validate exact pushed SHA and run status; if CI fails, repair. Separate documentation-only updates must not trigger CI.
6. When task meets tests and required CI, mark the single design task `PENDING_REVIEW`, summarize evidence + exact SHA in agent handover and STOP. Do not automatically pick the next task. Human + Planner review and return feedback in **this design file**; only user can accept and approve next.
7. Never rewrite `HANDOVER.md`, `docs/UX2-refine.md`, OS/overall-game specs or ongoing UX tasks. Do not merge to main or deploy production without explicit user permission.

**Planner / Reviewer every review round:** inspect actual diff, tests, exact-SHA CI, Staging URL/deployed SHA when relevant, API usage (if relevant), iPhone screenshots and user feedback. Classify VERIFIED / CODE RISK / UNKNOWN, and write bounded design clarification or follow-up to this file only. Do not treat passed CI as human UX/gameplay acceptance. Don't modify `AI_PLAYER_HANDOVER.md`.

## 10. Review gates and unresolved product decisions

**Approved now:** independent AI feature branch and design authority; OpenAI API as planned backend; mandatory separate mobile-accessible Staging Worker/D1; CI first (AIP-00A), then safe Staging bootstrap (AIP-00B), then staging-only automatic deploy (AIP-00C), then decision lab (AIP-01); no production merge/deploy; one-agent PENDING_REVIEW workflow. **Only AIP-00A is authorized to start now.**

**Still requires explicit human review before corresponding phase:** real player bot/human room composition (default one human host), whether bots can replace absent humans (defer), bot difficulty setting (defer), selection of durable scheduler technology (defer), human-facing bot pacing/reason display, live player-data external transmission/retention, live API financial budget, first usable match acceptance rubric.

**After AIP-00A returns PENDING_REVIEW:** human checks CI + no-deploy evidence; if satisfied, marks AIP-00A ACCEPTED and explicitly authorizes AIP-00B. After iPhone Staging acceptance, approve AIP-00C. Only then authorize AIP-01. The Planner updates only this design; the Coding Agent updates only its handover and selected task status. Do not start AIP-01 as part of AIP-00 delivery.
