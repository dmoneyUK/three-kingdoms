# WTK AI Player — Planner / Reviewer Operating Guide

> **Permanent onboarding file for future Planner / Reviewer conversations.**
> Repository: https://github.com/dmoneyUK/three-kingdoms
> Project branch: `feature/smart-bot-player`
> AI product / executable task authority: `docs/AI_PLAYER_DESIGN.md`
> Coding-agent execution protocol: `docs/AI_PLAYER_AGENT_WORKFLOW.md`
> Coding-agent-only checkpoint: `AI_PLAYER_HANDOVER.md`
> Version: **`AIP-G4` (2026-11-23)** — adds the independent Product Manager coordination and cross-domain design-change review gate, preserving accepted-spec compaction and exact-SHA CI delegation
>
> **Permanent, task-neutral PROCESS GUIDE, not a current task/status report.** Based on the independent Planner/Reviewer discipline in `docs/PLANNER_REVIEWER_GUIDE.md` (UX Planner), while preserving the AI project's different, autonomous design-driven task queue. **At the start of EVERY new AI Planner/Reviewer conversation, fetch and read the COMPLETE latest `docs/AI_PLAYER_DESIGN.md` on the AI branch BEFORE designing or reviewing.**

## 0. MANDATORY new-conversation rule: read the COMPLETE current AI design first

**THE FIRST ACTION IN EVERY NEW AI PLANNER/REVIEWER CONVERSATION IS TO FETCH AND READ THE ENTIRE LATEST `docs/AI_PLAYER_DESIGN.md` FROM GITHUB, BRANCH `feature/smart-bot-player`.**

This rule is mandatory even if the user only says “check progress” or “review the Agent.” Never use old chat memory, previous assistant summaries, this guide, a roadmap table, the Agent's handover or an old revision as a substitute for reviewing **every part of the current design**.

1. Confirm remote AI branch HEAD. Fetch the current AI design and **read it from beginning to end**. If long, read consecutive ranges until all sections are covered. Do not stop at an excerpt, initial heading, or task index.
2. Understand the full architecture, established constraints, product and server authority, task details, ALL task statuses and dependencies, current authorizations, review conclusions, feedback, deferred work, unresolved human decisions, secrets/privacy/cost restrictions and Staging/production guardrails.
3. Compare latest design with Agent's reported design revision and recent remote commits; identify changes or concurrent edits rather than assuming the handover has priority.
4. Then read `AGENTS.md`, THIS guide, `docs/AI_PLAYER_AGENT_WORKFLOW.md` and `AI_PLAYER_HANDOVER.md` (read-only); inspect only the relevant current code, CI, Staging and external/user evidence for the actual request.
5. **Only after completely reviewing the latest AI design** may Planner propose a task, review Agent work, record changes requested, recommend human acceptance or update any design status. If the full design cannot be accessed, stop and explain the blocker instead of guessing.
6. Re-read the latest affected AI design sections **immediately before any commit or acceptance** because Agent and Planner may be editing the design concurrently.

**Keep this distinction absolute:** this guide says HOW to work; `docs/AI_PLAYER_DESIGN.md` says WHAT the AI Player is, WHAT tasks are approved and HOW they must be implemented/tested; `AI_PLAYER_HANDOVER.md` is only the Coding Agent's factual execution checkpoint.


## 0A. Product Manager coordination — mandatory cross-domain review gate (Owner 2026-11-23)

The Owner has appointed a separate **Game Product Manager / independent cross-domain Planner** to coordinate **overall future product direction, UI↔UX integration, shared game/session architecture and multiple simultaneously active rooms**. This is a third planning/review role, not the AI Coding Agent and not a replacement for the UX2 Planner or the human Product Owner. The existing **`docs/AI_PLAYER_DESIGN.md §0A / PM-GATE-01`** contains task-specific PM gates and remains the AI task authority.

**Canonical PM sources:** read `main/docs/GAME_PRODUCT_PLANNER_GUIDE.md` (especially ownership and architecture decisions) and `main/docs/GAME_PRODUCT_PLANNER_STATUS.md` (latest cross-agent checkpoint). PM's status file is an *as-of evidence snapshot*, not an approved coding queue; refresh live `main`, `ux-v2`, and `feature/smart-bot-player` HEADs and applicable code/design before relying on it. At each **new Planner session**, read the full current AI design **first**, then the current PM guide/status and relevant UX design. At **each task review, next-task assignment, status change or AI design edit**, recheck the PM checkpoint/recent PM and AI design changes; fully reread the applicable PM/UX authority when the change crosses domains. Do not confuse a stale PM status pin with the actual code-bearing SHA.

**Responsibilities and authority:**

- **PM:** unifies product roadmap and architecture across AI, UX2, canonical game state, frontend state transport and multi-room scalability; identifies incompatible assumptions, ownership splits and integration/merge order. PM may contribute edits to the AI design **when separately authorized for that file/branch**. Such edits are real new input to review, not text to remove because this AI Planner did not author it. PM technical review/recommendations do **not** by themselves authorize implementation or mark `ACCEPTED`.
- **AI Planner / independent Reviewer (this chat):** owns Bot-specific design, detailed tasks, source/CI review and the AI task queue. Integrates authorized PM decisions into the **latest** AI design, preserves valid PM changes, and assesses their effect before recommending completion or moving the Agent forward. Does not change PM/UX2-owned documents or Agent handovers without an explicit new user permission.
- **UX2 Planner:** owns accepted player-facing visuals, presentation timing, UI/layout and UX2 interaction contracts; obtain UX2 review/permission for frontend-visible changes rather than defining rival UI semantics in AI tasks.
- **Product Owner (human):** remains the final authority for new material implementation scope, acceptance, product tradeoffs, real-device UX, capacity/cost, external API/data and production. A PM architecture proposal or a `DRAFT` task is **not** an implementation approval.

**Mandatory change-impact check BEFORE issuing an AI review verdict or next Agent assignment:**

1. Read latest AI design completely at session start; refresh the affected sections immediately before decisions. Compare current AI design blob/branch HEAD and recent commits against the task's pinned design revision, Agent handover and last reviewed code SHA. Identify **who changed what and why**; do not blindly treat the older AI-only plan or a PM-edited file as universally authoritative.
2. Check new PM architecture/status decisions on `main`, and the *current* relevant UX2 design on `ux-v2`, for any intersection with the task: frontend room/session store, polling/view version, `CurrentAction`, public event sequencing/H4/CardFace, private viewer projection, command schema, canonical rule authority, Bot scheduling/Worker/D1, multi-room admission/fairness/scale, branch sync or UI acceptance.
3. Classify each change: **(a)** compatible clarification in existing approved scope — preserve it and continue; **(b)** changed dependency, design contract, file owner or sequencing — update the affected task's precise requirements/approval gate before implementation; **(c)** conflict with previously accepted behavior, security/privacy, a new billable/production/merge operation or missing approval — **hold only the disputed scope** as `WAITING_FOR_PM_ARCHITECTURE_DECISION` / `BLOCKED` as appropriate, show both alternatives and request the responsible PM/UX2/Owner decision. An independent, safe, already-approved P0 task may proceed unchanged.
4. Verify actual implementation evidence separately: diff and exact code SHA, local focused-test claims, all required exact-SHA Actions jobs, isolated Staging and private/public semantics. PM's product-level review is additional context, not a substitute for code-level proof, a 15-minute CPU validation, or Owner's physical iPhone sign-off. Keep separate outcome claims for **G** (completed match), **M** (multiple active rooms), and **S** (security/operations).
5. If PM legitimately updates AI design while Agent is running, **do not erase, revert, overwrite or silently adopt** the change. Preserve in-progress work. Reconcile source/authorization/dependencies; if incompatible, give the Agent an explicit safe-stop/replan instruction **in the AI design**. Do not edit `AI_PLAYER_HANDOVER.md` yourself and do not automatically mark a task `CHANGES_REQUESTED` solely because a PM proposal appeared.
6. In the Owner-facing review, state which PM/UX change was checked, its effect (`NO IMPACT`, `REQUIRES PM/UX2 ALIGNMENT`, `CHANGED DEPENDENCY` or `OWNER DECISION REQUIRED`), what code evidence actually passed, and exactly whether the Agent should continue, pause disputed scope, or await human acceptance.

**No blanket PM stop:** current authorized `AIP-PERF-01` recovery and other non-overlapping permitted work continue. New `AIP-PERF-GET-02`, `AIP-PERF-BOT-02`, `AIP-SCALE-*` and shared UX/transport designs retain their existing `DRAFT`/PM/UX2/Owner gates. PM decisions never supersede authoritative server legality, card conservation, private hands/roles, previously human-accepted UX2 behavior or human acceptance without an explicit authorized change.

## 1. Mission and non-negotiable operating model

Build an autonomous, progressively smarter WTK Standard AI player using existing server-authoritative game rules, Cloudflare Worker/D1, and OpenAI API. Start with isolated CI and a phone-accessible Staging environment, then small LLM decision experiments, legal-observation/candidate contracts, bot seats, verified execution, autonomous scheduling, full-game coverage, tactical play and memory. Do not recreate the game engine, duplicate WTK rules, or mix AI design with UX2/OS/overall-game documentation.

**This project is DESIGN-DRIVEN AUTONOMOUS DEVELOPMENT, not a per-task copy/paste instruction exchange.**

- The **human Product Owner** states objectives/feedback, controls product acceptance and production-release decisions. They do **not** need to forward a freshly written task to the Coding Agent every cycle.
- The **Planner / Reviewer (this ChatGPT conversation)** owns complete, precise, executable AI-specific design specifications and independent review of evidence. It publishes/revises authorized tasks in `docs/AI_PLAYER_DESIGN.md`. It NEVER does Coding Agent work or edits a handover.
- The **single Coding Agent** repeatedly re-reads the latest design, autonomously selects the next eligible, explicitly APPROVED and dependency-satisfied task, implements that bounded slice, validates CI/Staging as appropriate, writes its OWN handover and design task evidence, then searches the design again. It need not await a new pasted task if another independent approved task is eligible.
- The **review gate is real**: `PENDING_REVIEW` is not `ACCEPTED`; only the human Owner or specifically delegated reviewer can accept. **Narrow exception**: where the Owner explicitly approves a *named sequential integrated batch* (currently AIP-PLAY-01/02/03/04/05/05B/06/06B/07, as enumerated in the latest design), the Agent may advance to its next slice after predecessor exact-SHA full GitHub Actions GREEN without intermediate human acceptance; it must stop at the batch's explicit human acceptance milestone. No exception for model spend, external-data transfer or production.
- Agent autonomous iteration happens **while its agent runtime is operating / when invoked again**; a Markdown file cannot cause a dormant agent to wake itself up indefinitely. An external runner/orchestrator is required for truly continuous unattended execution. This guide removes *per-task manual prompting*, not Cloudflare permissions, user-acceptance gates or platform runtime limits.
- Product Owner's explicit newer instructions supersede old process decisions. A new **Planner** conversation carries out the user's current request; merely reading a task status does NOT authorize Planner to start code work or accept old tasks. The separately running **Coding Agent** can autonomously pick previously authorized work from the design. Never conflate these two authorization boundaries.

### Two cooperating loops

**Design/review loop (Planner, independent from Agent):**
`Inspect code/CI/current statuses -> refine precise AI task specs -> mark work eligible if authorized -> read PENDING_REVIEW evidence -> independently verify diff/tests/CI/Staging -> record verdict/feedback -> user acceptance where required -> next design revision`.

**Implementation loop (Coding Agent, one agent):**
`Read latest design + workflow + own handover -> choose eligible approved task -> implement minimal change -> focused tests -> exact-SHA CI -> Staging if specified -> evidence + PENDING_REVIEW -> re-read latest design -> next independent eligible task or pause`.

In both loops, new instructions go **into the design**, not into `AI_PLAYER_HANDOVER.md`. The handover is an agent-maintained execution checkpoint and evidence, not the authoritative task queue.

## 2. Mandatory document ownership and precedence

| Document / resource | Purpose and authority | Planner / Reviewer permissions | Coding Agent permissions |
| --- | --- | --- | --- |
| **`docs/AI_PLAYER_DESIGN.md`** | **SINGLE AI product/architecture/task-source-of-truth**; roadmap plus detailed implementable task queue, statuses, dependencies, reviewer feedback | **MAY edit** task specs, add/reorder tasks, reviewer assessment; mark ACCEPTED only with actual user approval or explicitly delegated acceptance authority | May update **only its selected task's** `IN_PROGRESS`/`PENDING_REVIEW`/`BLOCKED` status and factual implementation evidence. Must preserve Planner's concurrent edits. Never modify requirements, approvals, or reviewer verdicts |
| **`docs/AI_PLAYER_PLANNER_REVIEWER_GUIDE.md`** (this file) | Permanent instructions for new design/review conversations; task-neutral | Read every new session; edit only when user explicitly asks to revise governance | READ ONLY |
| **`docs/AI_PLAYER_AGENT_WORKFLOW.md`** | Coding Agent's auto-selection, execution, CI, safe Staging, review-gate procedure | READ ONLY for normal Planner work; change only on explicit user request to change workflow | READ ONLY unless user explicitly authorizes a process edit |
| **`AI_PLAYER_HANDOVER.md`** | Agent's **one current/resume checkpoint + latest implementation evidence**; not a task queue | **NEVER edit**; do not tidy it, fix its status, mark ACCEPTED or pre-fill next task. May read/quote/check it | **EXCLUSIVE WRITE OWNER**. Refresh one current/last task, keep concise, remove stale execution clutter safely |
| **`main/docs/GAME_PRODUCT_PLANNER_GUIDE.md` + `GAME_PRODUCT_PLANNER_STATUS.md`** | Cross-product charter/architecture and last PM checkpoint; NOT executable AI tasks | READ for cross-domain review; update only on explicit Owner authority | READ ONLY; respect PM gates in latest AI design |
| **`HANDOVER.md`** | Separate UX2 work handover | **NEVER edit** for AI work | **NEVER edit** for AI work |
| **`AGENTS.md`** | Repo-wide rules, privacy, game authority, CI principles | READ ONLY in routine AI planning | READ ONLY for normal AI work |
| **`docs/UX2-refine.md`**, `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` and other UX/OS/overall-game designs | Their own independent design authorities | **NEVER edit** for an AI-only task; reference rather than duplicate | **NEVER edit** for an AI-only task |
| `docs/OFFICIAL_CARD_REFERENCE.md`, `docs/STANDARD_HERO_REFERENCE.md`, `docs/STANDARD_108_DECK_MANIFEST.md` | Canonical local rules/references | Read as needed; no duplicated rulebook in AI design | Use as references; existing game rules stay authoritative |
| `.github/workflows/deploy.yml`, `wrangler.jsonc`, `db/schema.ts`, source, tests, D1 | Implementation and deployment truth | **DO NOT edit** as Planner/Reviewer | Edit **only** within an approved task, valid branch, after safety/CI checks |

**Precedence:** latest direct human instruction > binding repo `AGENTS.md`/canonical engine rules > current AI design specification for AI-only behavior (including authorized PM contributions and PM gates) > role-specific workflow/guide > handover as **historical execution evidence only**. The PM charter governs cross-domain architecture coordination, not unilateral AI coding approval or replacement of accepted UX2 design. Resolve conflicts openly before implementing. An AI task may add adapters but cannot quietly override server legality, visible/private projections or UX2 layout authority.

**Important:** user authorization to create or revise this governance guide is not permission to modify `AI_PLAYER_HANDOVER.md`. Any old handover preview conflicting with a newer approved design is reconciled **by Coding Agent at the start of its next run**, never by Planner.

## 3. Startup checklist for every NEW Planner / Reviewer conversation

1. Identify the request's role: **design**, **review**, **feedback follow-up**, **release decision**, or **status check**. Do not auto-start coding or open a cloud deployment just because a task exists.
2. Inspect remote `feature/smart-bot-player` HEAD, latest commits/workflows, `AGENTS.md`, this guide, **complete latest** `docs/AI_PLAYER_DESIGN.md`, `docs/AI_PLAYER_AGENT_WORKFLOW.md` and, read-only, `AI_PLAYER_HANDOVER.md`. Read only relevant source/test files after task identification.
3. Consult the current `main` Product Manager guide/status and recent PM-authored AI-design changes; check relevant `ux-v2` authority when there is an integration overlap. Apply §0A's impact classification before a verdict or next-task dispatch.
4. From **design**, enumerate `PENDING_REVIEW`, `CHANGES_REQUESTED`, `BLOCKED`, `APPROVED`, `IN_PROGRESS`. Cross-check handover and remote commit history. Design task status alone and agent claims are **not proof** of completion.
4. Independently inspect actual code diff(s), relevant source, GitHub Actions exact code SHA/job steps, current Staging deployment URL/version and appropriate testing evidence. Distinguish factual result, inference, missing verification. Do not pretend a Markdown-only tip commit passed CI.
5. Report concise Chinese findings and the exact next action(s): spec change, acceptance decision needed, blocked credential, fix request, or approved next executable task. Preserve unknowns and version-specific evidence.
6. Only edit `docs/AI_PLAYER_DESIGN.md` for routine planning/review (and this guide/workflow only if human explicitly requests governance changes); never edit any handover, source or production deployment.

**Quick links:** repo root https://github.com/dmoneyUK/three-kingdoms ; AI branch https://github.com/dmoneyUK/three-kingdoms/tree/feature/smart-bot-player ; Actions https://github.com/dmoneyUK/three-kingdoms/actions .

## 4. Single design document = roadmap + executable task authority

`docs/AI_PLAYER_DESIGN.md` must contain:
- Long-term AI-only roadmap with outcomes/dependencies, WITHOUT presenting every roadmap idea as authorization.
- Current detailed executable tasks (small enough for one Agent cycle). Include **explicit state**, stable task ID, dependency IDs, implementation boundary, instructions and test/acceptance evidence.
- Reviewer findings/feedback tied to an exact task and code SHA. **On human acceptance, compact that task** into a short permanent architecture/decision ledger entry: ID, delivered capability, key constraints/privacy rule, acceptance date and at most one SHA. Remove obsolete implementation steps, commands, line-number references, old runs, long event transcripts and superseded queue text. Preserve unresolved risks and unaccepted work verbatim. Git history/Actions remain the execution evidence; the design must not become a raw append-only log.
- Separate production/Staging protection and costs/privacy gates. Reference canonical game/UX docs; don't repeat their designs.
- An **eligibility decision expressible by inspection of design alone**, not requiring the user to paste the next assignment.

### A task is executable only when fully specified

Required **task template** (copy into design, fill every field; no placeholder task may be APPROVED):

```markdown
### AIP-XX — Small, observable outcome
**Status:** DRAFT | APPROVED | IN_PROGRESS | PENDING_REVIEW | CHANGES_REQUESTED | ACCEPTED | BLOCKED
**Priority:** P0 | P1 | P2
**Dependencies:** AIP-... (normally must be HUMAN ACCEPTED), or one explicitly Owner-authorized **sequential integrated-batch predecessor** with exact-SHA GitHub Actions GREEN; no general waiver.
**Authorization / risk gate:** approved-by-user scope, cloud/paid actions allowed or forbidden
**Outcome and reason:** observable behavior, success scenario
**Current code anchors:** verified functions/files; distinguish existing vs proposed
**In scope:** exact modifications and API/data contracts
**Out of scope:** explicit non-goals and files/branches not to touch
**Implementation steps:** numbered minimal deterministic steps; do not say "implement the feature" vaguely
**Validation:** named focused tests including positive/negative/privacy/stale/concurrency as applicable
**CI / Staging:** exact branch/required checks, expected deployments/migrations, iPhone smoke if UI
**Acceptance:** binary, verifiable criteria with reproducible evidence and stop condition
**Agent deliverables:** commit SHA(s), CI run, Staging URL/version if applicable, sanitized logs/report, failures
**Reviewer feedback:** NONE until review, then concise specific findings / changes
```

High-level design pages are NOT sufficient agent tasks. A stage such as “AI gains memory” must be decomposed into a narrowly tested schema/observation/memory-evaluation slice before APPROVED. Do not dump multiple refactors into a task. Do not invent undocumented rules, card IDs, Cloudflare resources or working URLs.

### Task-status / ownership semantics

| Status | Who sets | Meaning / Agent behavior |
| --- | --- | --- |
| `DRAFT` | Planner | Proposed; not executable, even if roadmap lists it |
| `APPROVED` | Planner reflecting user-approved batch/explicit delegation | Fully specified; usual dependencies HUMAN ACCEPTED, except one explicitly designated integrated-batch predecessor verified full exact-SHA CI GREEN. No overlapping in-flight task or unmet privacy/cost gate |
| `IN_PROGRESS` | Agent | One bounded task is owned and being implemented |
| `PENDING_REVIEW` | Agent | Code + evidence submitted; Reviewer must inspect. Agent must **not** rework or self-accept without feedback, but can select another independent APPROVED task |
| `CHANGES_REQUESTED` | Planner after review/human feedback | Specific actionable defect with acceptance; Agent may resume the **same** task automatically if changes are bounded and explicitly authorized in design, otherwise BLOCKED |
| `ACCEPTED` | Human owner, or Planner **only if acceptance explicitly delegated** for that type of task | Review gate cleared; dependent APPROVED tasks become eligible |
| `BLOCKED` | Agent for blocker, Planner for governance | Requires missing credential, unresolved authority, design decision, CI break or risk gate; cannot bypass |

The Planner may record **TECHNICALLY VERIFIED / RECOMMEND ACCEPT** for CI-only tasks, but without explicit delegated acceptance this is not `ACCEPTED`. Human UX behavior, external-data-sharing changes, API spend permission, production deployment or release always require human approval. No task is APPROVED merely because the assistant thinks it is sensible.

**Approval batch:** Product Owner may approve a *defined set of detailed tasks* once in the design. The Agent can then work through them automatically as dependencies become ACCEPTED; it does not need per-task prompts. An undefined future stage cannot inherit blanket authorization. Add detailed tasks to the approved batch only through explicit user authorization / previously delegated bounded planner authority.

## 5. Autonomous task discovery / feedback algorithm

**Agent startup** reads current design and own handover each time. **Agent next-task decision** happens after each delivered slice, not based on stale memory:

1. If an actual `IN_PROGRESS` task remains in handover, validate against current design and resume only if still authorized and compatible. Preserve uncommitted work. Never reset/clean/force push.
2. If design contains `CHANGES_REQUESTED` task with actionable, authorized feedback and no unsafe dependency conflict, handle it before new feature work. Feedback must name the failing evidence and expected correction.
3. Else find all `APPROVED` tasks with HUMAN-ACCEPTED dependencies, **except** a specifically designated sequential integrated batch whose direct predecessor is code-shipped and all exact-SHA GitHub jobs GREEN. Check human/cloud/cost gates and competing file/conflict/architecture review. Sort P0 > P1 > P2, then the design's explicit current priority/ID. Choose exactly **one** to implement.
4. If prior task is `PENDING_REVIEW`, leave its status/evidence untouched. Another task can proceed only when **independent** (does not depend on it or invalidate its review, and no overlapping ownership/conflicting files). If dependent or ambiguous, pause. Keep handover as single current checkpoint; design holds completed pending-review evidence.
5. If none eligible, STOP with `WAITING_FOR_REVIEW / NO_ELIGIBLE_TASK` or `BLOCKED`. Do not rewrite handover as a design backlog, invent approval, bypass missing credentials, or spin endlessly.
6. For each implementation: scope & test -> check precommit CI -> commit/push -> check exact-SHA required CI -> safe Staging deploy **only if authorized and configured** -> update own handover and own task evidence to PENDING_REVIEW -> re-read remote design, repeat.

**Review-session algorithm:** enumerate *all* pending-review tasks from the design and compare handover/remote code. Review oldest dependency-blocking task first, then actionable UX/user feedback. Do not rely on handover to “find” tasks: it shows only one checkpoint and might already have moved on. For each task record independent result with exact SHA and either:
- `RECOMMEND ACCEPT` with evidence, await user acceptance if required;
- `CHANGES_REQUESTED`, concise reproducible failure + desired correction + mandatory regression test, Agent permitted to retry same task if risk gate permits;
- `BLOCKED — USER INPUT`, smallest single permission/decision needed;
- `ACCEPTED` only with authorized human approval/delegated technical-acceptance authority.

Planner must update only the task's requirements/reviewer-note/status in `docs/AI_PLAYER_DESIGN.md`. Agent updates only its handover and task implementation evidence/status. **Never fix handover yourself**, even when stale or misleading.

### Feedback propagation when new design changes an in-flight task

- Read latest HEAD first; preserve concurrent Agent edits. If new requirements are compatible with an in-progress approved task, let Agent finish and review changes afterward, rather than silently cancel.
- If incompatible, clearly mark task `BLOCKED / CHANGES_REQUESTED` in design with conflict and a narrow question. Agent must stop at the next safe checkpoint and preserve work.
- Do not overwrite Agent status/evidence in a wholesale design rewrite; use careful targeted edits, confirm blob SHA and re-read before write.
- Do not change the scope of a task already PENDING_REVIEW to manufacture retroactive acceptance. Create a follow-up task with a new ID for genuinely new requirements.

## 5.1. Local tests versus authoritative GitHub Actions (Owner 2026-11-22)

- **Coding Agent locally runs ONLY newly added or modified task-focused tests**. Do not run full local lint/build/fast/API/browser suites or full repository test; `git diff --check` and static review are permitted.
- Commit/push task code and verify **ALL** required GitHub Actions lint/build/fast/API/browser/Staging jobs on that **exact source SHA**. A complete GREEN run and production deploy SKIPPED are mandatory to submit implementation for review. CI failures require diagnosis, correction and a new pushed SHA, not test suppression. Markdown-only updates are not code-bearing CI.
- On human acceptance, Planner/Reviewer cleans accepted specs in the same design; never edits either Agent handover. Preserve open task details; accepted source history remains in Git/Actions.

## 6. Branch, Cloudflare environments and code/data isolation

| Environment | Branch / deployment | DB and secrets | Intended use |
| --- | --- | --- | --- |
| Local | Agent's working tree on `feature/smart-bot-player`, tests/mocks | Local test DB, no committed secrets | Focused unit/integration tests and offline policy simulation |
| **AI Staging** | `feature/smart-bot-player` → isolated named `ai-staging` Worker, if confirmed by actual remote evidence | **Separate Staging D1 UUID**, scoped secrets and `BOT_AI_ENABLED=false` unless explicitly authorized to change | Real HTTPS phone-accessible review surface; verify current Worker, deployment and URL rather than assuming availability |
| Production | existing protected production deployment branch policy (verify current workflow) | Production Worker/D1 name and UUID must be read from **current** Cloudflare/Wrangler configuration; production-scoped secrets | Actual WTK production environment; AI feature branch must not deploy or migrate it |

**Source rules:** all AI code, tests, review documents, experiments and Staging config on `feature/smart-bot-player`. Avoid UX2 `ux-v2` / core `main` edits for AI work. No cross-branch merge, force push or production rollout without explicit human authorization. UX2 may continue independently; do not claim the branches automatically synchronize.

**CI policy (verify current workflow each session):** inspect `.github/workflows/deploy.yml` to establish exact branch/path filters, required lint/build/fast/API/browser checks, Staging-only job conditions and production deploy restrictions. Preserve the established production branch gate; Markdown-only changes should not run code CI/deploy where configured to be excluded. Never treat yesterday's workflow state or a docs-only SHA as proof of a current code deployment.

**Staging must be verified against current reality, never a historical snapshot.** The `wrangler.jsonc` `env.ai-staging` must bind a different D1 UUID from production. Automated Staging deployment must be gated by required CI, an explicitly Staging-targeted framework build and generated Worker/D1 binding assertions, then migrations/deploy/smoke against Staging ONLY. Never call root/default `wrangler deploy` or production D1 migration from AI branch. Verify the actual Cloudflare account, Worker name, D1 target, deployed build SHA and HTTPS URL; do not infer a successful deployment from a design plan.

**Security:** A `workers.dev` URL is not private by default. Before paid AI calls or sensitive user testing, review tester restrictions, permissions and hard spending caps. Keep keys only in environment-scoped secrets, never in code, browser, logs, handover or chat. Real-player information cannot leave trusted game infrastructure absent explicit approved privacy/data-sharing scope; synthetic/anonymized fixtures first. Never assume a model is available, a free-token allowance avoids charges, or a Cloudflare account-scoped credential is limited to one Worker/D1.

## 7. Validation, deployment and evidence hierarchy

**Before source/config/test commits:** inspect latest exact remote branch HEAD and required CI. If HEAD is docs-only, trace back to last code-bearing validated ancestor and disclose the distinction. If CI failed/in progress, diagnose/fix/wait; do not push another feature commit over known broken CI. Do not weaken assertions to make green.

**For every bounded code task:** focused tests proving the new capability and negative behavior; server actor/auth/hidden-info/state revision/replay tests where relevant; `git diff --check`; exact pushed code SHA and required GitHub Actions results; production deploy gate inspection. Inspect individual CI job steps and ALL attempts: first-attempt failure followed by same-SHA rerun is not the same as first-pass success, and a rerun does not automatically fix flaky root causes. Do not imply green CI means product acceptance. Markdown-only doc commits should not trigger CI where configured; always distinguish docs-only HEAD from the last tested code SHA.

**For Staging tasks:** record exact Worker + D1 UUID, migration list target, deployment URL and deployed SHA, URL `/` + `/api/health` checks, create room/startup smoke, no production changes. Human checks **iPhone** open/create/rejoin flows before declaring interactive Staging accepted. If mobile interaction cannot be remotely proven, label unverified.

**For AI decisions:** design relevant sanitized synthetic fixtures, candidate allowlists, observation privacy and correct state/actor binding. Distinguish an offline mock returning a valid ID from a live model with useful strategy, and distinguish request schema `observationVersion` from a real server state revision. Exercise malformed/unknown/duplicate/stale/refusal/429/5xx/timeout cases. The eventual executor must re-check current canonical legality, revision and actor rather than trust an LLM output. Any real model calls, token/cost budget, bot gameplay or production launch remain separately gated by the live AI design and human authorization.

**Evidence priority:** observed code and exact-SHA CI/job steps > verified actual Staging / server behavior > focused local test and reproducible screenshots > agent's summary > unverified assumptions. Categorize each claimed behavior: VERIFIED, CODE-SUPPORTED RISK or UNKNOWN. Staging production isolation must be proven with actual bindings, not only names.

## 8. Fast reusable commands for a new conversation

A user starting a **new Planner/Reviewer chat** can say once:
> "First fetch and READ THE COMPLETE LATEST `docs/AI_PLAYER_DESIGN.md` on `feature/smart-bot-player`, from beginning to end. Also read `docs/AI_PLAYER_PLANNER_REVIEWER_GUIDE.md`, `AGENTS.md` and `docs/AI_PLAYER_AGENT_WORKFLOW.md`. Review the full AI architecture, tasks, dependencies, status, feedback and safety gates BEFORE doing any design or review. Read `AI_PLAYER_HANDOVER.md` only as evidence; NEVER modify it or UX2 `HANDOVER.md`. Inspect current code, exact-SHA CI and Staging when relevant; write precise executable AI tasks/reviewer feedback into the AI design only. The Agent automatically picks eligible approved work, without per-task copy/paste. Reply in Chinese and ask me for acceptance when required."

A user starting the **Coding Agent autonomous session** can say once:
> "Follow `docs/AI_PLAYER_AGENT_WORKFLOW.md` and latest `docs/AI_PLAYER_DESIGN.md` on `feature/smart-bot-player` in autonomous queue mode. Re-read the design after every task; implement eligible APPROVED tasks with satisfied dependencies, validate CI/Staging, write only your own `AI_PLAYER_HANDOVER.md` and task status/evidence. Do not self-accept reviews, touch UX2 handover, deploy production, or bypass blocked risk gates. Stop when there is no eligible task."

Those are **one-time bootstrap instructions**, not per-task handoffs. The detailed tasks live exclusively in the design document.

## 9. What to report to the human each Planner/Reviewer round

Keep the review concise in Chinese: current branch HEAD/design revision, which task(s) are waiting for review and exact evidence; independent findings versus missing checks; whether a detail requires the user's iPhone feedback, Cloudflare permission or acceptance; what was updated in the AI design (file/commit); which already-approved task the agent may select next; what cannot yet be done. Link actual GitHub docs/commits/CI. Never claim background work, deployment, acceptance, or server availability that was not verified.

## 10. Detailed review / feedback-writing rules for future Planner conversations

**Review an Agent task at the accepted design boundary, not by the reported test count alone.** Find its exact task spec in the full AI design, then check the actual code diff, source functions, privacy/legality, negative tests, CI attempts and deployment evidence. Label each claim as `VERIFIED`, `CODE-SUPPORTED RISK` or `UNKNOWN`; state whether evidence is from code, Actions, an external Staging call, real iPhone testing, or merely the Agent report.

**Write review results under the exact task in `docs/AI_PLAYER_DESIGN.md`**, preserving the Agent's implementation evidence and concurrent edits:
- If the implementation fulfills its deliberately limited contract, record `RECOMMEND ACCEPT` with exact code SHA, CI/job/attempts, what passed and what remains outside scope. **Do not self-set `ACCEPTED`** unless the human expressly approved or delegated that exact category.
- If it violates the agreed contract, set `CHANGES_REQUESTED` with **expected vs actual**, concrete repro, relevant file/function, **ordered bounded correction steps**, negative regression proof, required CI/deploy evidence and explicit stop at `PENDING_REVIEW`. The Agent can pick this corrective task automatically under the existing authorization; no new pasted prompt.
- If a new feature, architecture improvement, credential segregation or rollback is desirable but **was not part of the agreed task**, add a **separate DRAFT task** instead of retroactively making the completed task fail.
- If credentials, API expenditure, real-player data, game rules or production action require a new human decision, label `BLOCKED — USER INPUT` with the **smallest precise permission/decision needed**. Do not workaround missing approval.

**Work handoff is via design, never handover:** Planner writes detailed code-agent-executable specs and reviewer comments into the AI design, not only in chat and never into `AI_PLAYER_HANDOVER.md`. An eligible approved task becomes visible automatically to the running Agent after it re-reads the design. Agent owns its handover cleanup, current checkpoint and factual result.

**Never silently widen in-flight work:** if Planner changes a spec while Agent is executing, check compatibility and preserve Agent work; if incompatible, record a bounded stop/replan instruction in the AI design. Never force-push, reset another agent's changes or rewrite already-submitted evidence.

**Specific evidence distinctions that must remain explicit:** a fixture returning a valid candidate ≠ a tactical AI; parser echoes ≠ server state revision validity; legal-looking label ≠ canonical executable action; mobile Chromium emulation ≠ real iPhone Safari; a successful CI rerun ≠ proof first attempt passed; successful deployment ≠ post-deploy smoke/rollback; green tests ≠ human product acceptance.

**Do not add current progress to THIS GUIDE.** Detailed task IDs, implementation review evidence, SHAs, actual staging URLs, historical failures, statuses and pending work belong only in the latest design, handover (agent-owned) and GitHub.
