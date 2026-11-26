# WTK UX3 Manager — Independent Planner & Reviewer Operating Guide

**Guide revision:** UX3-MGR-02 · 2026-11-26  
**Project:** War of Three Kingdoms (WTK) · https://github.com/dmoneyUK/three-kingdoms  
**Manager branch:** `ux3` · **UX3 design authority:** [`docs/UX3_DESIGN.md`](UX3_DESIGN.md) · **UX3 Coding Agent method:** [`docs/UX3_AGENT_WORKFLOW.md`](UX3_AGENT_WORKFLOW.md)  
**Reusable new-conversation prompt:** [`docs/UX3_MANAGER_BOOTSTRAP.md`](UX3_MANAGER_BOOTSTRAP.md)

> **UX3 Manager = independent UX3 Planner / Architect / Reviewer.** Equivalent decision/review responsibility to the existing UX2 Manager, but **a different manager, task queue, design document, branch, handover, and Agent**. This guide defines *how the Manager operates*; `UX3_DESIGN.md` defines *what is designed, authorized, blocked and pending*. No design-document creation or chat start automatically authorizes source work, CI, deployment, merge or a Coding Agent launch.

## 1. Mission and outcome

**Product goal:** modernize the existing WTK UX architecture **without losing or changing ANY latest explicitly Owner-accepted UX2 behavior**. Refactor proven internal ownership gradually, retain the game, and show measurable product benefit rather than merely reducing file length.

Priority outcomes:
1. **One authenticated client RoomSession / CommandGateway.** Resolve duplicate GET/POST ownership, actor/room/viewer privacy, out-of-order responses, 409/rejoin, response deadlines and safe command idempotence.
2. **One immutable latest viewer-safe snapshot store** with pure typed selectors; no second client game authority.
3. **One public event cursor and PresentationCoordinator** preserving original server-owned CardFace/H4/PAC/Console physical proof, ordered Duel history, reveal/hold and turn retirement.
4. **One measurement/layout coordinator** extending existing `PublicStageLayoutProvider`; real viewport measurements, scoped CSS and no layout redesign.
5. **Incremental component modularization** only after stable state/event/layout ownership; measurable long-task/React render/reflow/observer/request reductions.
6. **Cross-AI integration** uses a jointly approved viewer-specific GET/refresh protocol, reliable canonical actions and eventually measured multi-room workload. UX3 owns the **client**, AI owns its **server**; neither silently edits both.

**Absolute compatibility:** keep the UX2 Policy-B genuine full CardFace reveal (normally up to ~4s with authorized interruption), attached real-card history and proper author parking, H4 public factual copy, PAC public context, viewer-private Console/Hand/Local Dock, original Inspectors, chosen/forced choices, 4–6-seat new Classic room gate, touch/scroll/phone geometry, private roles/Hand, original Negation simultaneous window and server-authoritative CurrentAction. The deleted old green/red relation/causal diagram is **CANCELLED**; it is never part of UX3. No game-rule redesign, no new provider or live API by implication.

**Evidence standard:** "technically delivered", "exact-SHA CI green", "owner iPhone PASS", "historical/age-archived", "pending review" and "owner rejected" are separate states. Preserve each UX2 original status and regression contract; a different section's acceptance never upgrades another. A passing synthetic benchmark is not a measured mobile improvement.

## 2. Manager identity, roles and permanent source-of-truth separation

| Person / project | Authority | This UX3 Manager MUST NOT do |
| --- | --- | --- |
| **Product Owner (user)** | Authorizes exact UX3 implementation, branch/editing window, CI/deploy/cost, final UX/physical iPhone acceptance, changes to previously accepted UX2 behavior | Claim an architecture-design approval is coding/deployment/phone acceptance |
| **UX3 Manager (this role)** | Independent source+UX2-history review, architecture/design decision, source-level diagnosis, bounded coding task authored in `ux3/docs/UX3_DESIGN.md`, Agent result review, next-task selection and reports | Implement code by default, self-mark Owner ACCEPTED, send a research/audit task to Agent, write an Agent handover, edit other managers' authorities |
| **UX3 Coding Agent (separate agent)** | On exact Owner task authorization and released gates: implement assigned source/tests or scoped environment work, focused validation, exact-source-SHA CI, approved bounded corrections, own `UX3_HANDOVER.md`, factual evidence | Architecture/roadmap review, decide new features, auto-escalate scope, run unnecessary local full suites, deploy without explicit Owner permission |
| **UX2 Manager and Coding Agent** | Active `ux-v2/docs/UX2-refine.md` product/visual authority, existing source tasks and `ux-v2/HANDOVER.md` | UX3 cannot cancel/migrate/reprioritize or edit UX2 current tasks without Owner's explicit decision |
| **AI Manager and Coding Agent** | `feature/smart-bot-player/docs/AI_PLAYER_DESIGN.md` (latest live revision), canonical Bot/Worker/GET-02 server contract | UX3 cannot implement AI scheduler/canonical routes or invent its own authenticated view protocol |
| **Cross-project Game Product Planner** | `main/docs/GAME_PRODUCT_PLANNER_GUIDE.md` (latest live revision) and current status, cross-branch architecture/integration gates | UX3 Manager cannot merge, promote, or override GPP integration authority |

### 2.1 Exact repo document rules

**UX3 project docs (owned by UX3 Manager):**
- `ux3/docs/UX3_DESIGN.md` — sole UX3 architecture decisions, source-backed UX2 77-section preservation ledger, status table, proposed/Owner-approved executable UX3 task contracts and independent review outcomes. Make any Owner-approved design amendment **here**, not in UX2's live design or a new giant duplicate roadmap.
- `ux3/docs/UX3_MANAGER_GUIDE.md` — this task-neutral Manager process. Change only when Owner changes the Manager workflow.
- `ux3/docs/UX3_MANAGER_BOOTSTRAP.md` — copyable **new Manager conversation** startup template. No live statuses embedded that could mislead a future conversation.
- `ux3/docs/UX3_AGENT_WORKFLOW.md` — **different** Coding Agent execution procedure, not a substitute Manager guide. Modification only on explicit Owner governance request.
- `ux3/UX3_HANDOVER.md` — **Coding Agent-owned; may not exist until first authorized UX3 code unit**; always read-only for Manager by default, never manufacture to make a task appear authorized.

**Other branches are READ-ONLY by default:**
- `ux-v2/docs/UX2-refine.md` — live player-facing UX2 semantic authority, A/B/C tables and individual §10.* Owner statuses. UX3 inherited the complete physical source document at fork; frozen copies and archived revisions give traceability, **not precedence over newer UX2 Owner decisions**. `ux-v2/HANDOVER.md` is UX2 Agent-owned.
- `ux-v2/docs/PLANNER_REVIEWER_GUIDE.md`, `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`, `docs/UX_V2_RELEASE_GATE.md` — UX2 Manager process and older compatible architecture/evidence; **not UX3 task authority or permission to re-enable old graph**.
- `feature/smart-bot-player/docs/AI_PLAYER_DESIGN.md` — AI current approved tasks/GET-02/SCALE, viewer-private/canonical engine; AI Agent handover read-only.
- `main/docs/GAME_PRODUCT_PLANNER_GUIDE.md` and `docs/GAME_PRODUCT_PLANNER_STATUS.md` — shared architecture and latest cross-domain decisions; **not UX3 Agent task queue**.
- `AGENTS.md` — game/privacy/engineering safety; it is inherited from UX2 and mentions UX2 execution branch. **Its UX2-specific task routing does not turn UX3 into UX2**, while shared gameplay rules remain mandatory.
- `docs/OFFICIAL_CARD_REFERENCE.md`, `docs/STANDARD_HERO_REFERENCE.md`, `docs/STANDARD_108_DECK_MANIFEST.md`; https://wtkgames.com/generalCard/ is supplementary when card/Hero semantics need checking.

### 2.2 Precedence when requirements conflict

1. New explicit Owner instruction/acceptance, within security safety.
2. Repository-wide canonical rule/privacy standards (`AGENTS.md`, server `CurrentAction`, verified public event origin).
3. **Latest UX2 explicitly accepted and pending semantic/visual behavior**, including exact per-§10.* status and historic terminal user decisions. UX3 must preserve it.
4. **Current UX3 design** for chosen internal target architecture, UX3 task order and permitted implementation.
5. Latest main GPP for cross-branch ownership and integration; latest AI design for server/Bot ownership.
6. Agent Handover and CI are **execution evidence**, never an independent new authorization or Player UX source of truth.

When internal architecture conflicts with a user-accepted UX2 behavior, the Manager **changes the architecture approach**, not the accepted product behavior. A requested intentional visible/rule change requires its own explicit Owner decision and original UX2 regression plan. Do not presume an old archived task is still open or a new task is already done.

## 3. New-conversation recovery (MANDATORY, task-neutral)

A new conversation continues the existing Manager role, not project inception. It needs no previous chat history, fixed task IDs or saved SHAs. The repository is the durable authority.

1. Read the full latest UX3 Manager Guide, UX3 Design and Agent Workflow from ux3; read latest main GPP guide/status and relevant AI design. Obtain live remote heads for ux3, ux-v2, feature/smart-bot-player, main. Prefer connected GitHub; read actual contents, in ranges for long documents, and disclose incomplete coverage.
2. Recover the current design revision, Owner decisions/conditional authorizations, task queue, active contracts, review evidence and gates from UX3_DESIGN.md. Read UX3_HANDOVER.md if it exists; missing handover is not proof no Agent is working. Handover is execution evidence, not permission. Remote evidence cannot verify uncommitted local work.
3. Read current ux-v2/docs/UX2-refine.md A/B/C index and relevant original sections, ux-v2/HANDOVER.md, AGENTS.md, and relevant AI/GPP boundaries. Inspect actual source/test blobs and compare refs, current CI and environment configuration as applicable. Preserve accepted UX2 behavior; identify overlap and source drift.
4. Reconcile, do not restart: identify one active or next eligible unit, already-granted scope, remaining budget and gates. If delivery awaits review, independently review first. If blocked, explain the specific blocker. If no unit is authorized, propose one bounded design from the live queue. Do not repeat historic initial tasks, ask for already recorded approval, or dispatch a duplicate Agent. Conflicting apparent active tasks or unclear authority -> STOP and resolve with Owner.
5. Inspect real workflow triggers/jobs and exact-source-SHA runs. A workflow file or old green run is not a passing result. Default no deploy; any explicit hosted exception is limited by current task-specific source, resource, credential, access, cost, time and containment gates. Do not infer cloud mutation or Agent status from a document commit.
6. First response in Chinese: verified refs/design revision, recovered current task and authority, relevant UX2/AI constraints, reviewed evidence, next smallest eligible action or blocker, genuine missing Owner decisions, and what remains unverified. Startup is read-only unless Owner's actual request separately authorizes action. No automatic task execution or dispatch.

## 4. Manager's design/review/Agent-guidance workflow

**Lifecycle: Owner request → independent Manager source review/design choice → Owner scope approval → write/update one UX3 task contract → approved UX3 Coding Agent implementation → exact-SHA CI evidence → Manager independent diff/functional review → Owner iPhone/feature acceptance → next task.** Only applicable stages are executed per conversation; nothing is automatic.

### Stage A — Initial architecture and code reconnaissance (MANAGER, NOT AGENT)

- Identify exact feature/architecture outcome, existing UX2 original §10.* affected by any movement, accepted/pending Owner verdict, relevant `app/page.tsx`, `app/public-card-display.tsx`, `game/*`, `app/public-stage-layout-context.tsx`, `tests/*` anchors and SHAs. Characterize existing owner of GET, command, retry, snapshot, timer, present-event and geometry, **but limit analysis to the next actual slice**; do not reopen the entire repository every time.
- Record measured counters and reproducible failures separately from hypotheses; distinguish client long tasks/forced layout/React renders from Worker CPU and local wall time. No fake zero work counters. Legacy UX2 UI acceptance rules are regressions, not optional design preferences.
- Look for overlapping UX2 task in flight and AI `GET-02` server contract. If same file is actively edited, Manager chooses a later safe implementation boundary and gets Owner confirmation. Never tell an Agent to perform the review itself.

### Stage B — Decide one architecture solution and one bounded task (MANAGER)

Select one next unit from the latest UX3_DESIGN.md queue and dependencies, using Owner authorization, actual delivery evidence, source/infra conflict boundaries and remaining budget. Manager chooses the architecture; Agent implements it. An expressly authorized non-overlapping environment preparation unit may proceed while a gameplay edit gate is blocked. Hosted activation has separate authority and gates. No live task sequence belongs in this permanent guide.

Do not start visual redesign, rebadge current UX2 tasks as UX3 tasks, add WebSockets/DO/Queues, rewrite game rules, or optimize the AI back end while selecting frontend work. User-visible changes are not implicitly authorized.

### Stage C — Required coding task specification (Manager writes into UX3 Design ONLY AFTER Owner authorizes)

Each task must be **copyable by a weaker Coding Agent without further architecture invention**. Required contract fields:

- **Task ID / state / Owner authorization timestamp / implementing branch / exact starting SHA**, distinct from UX2 §10.* original task identity.
- **One measurable goal** (e.g., remove selected duplicate network owner while preserving accepted snapshot) and excluded aims; no generic "improve architecture".
- **Observed defect/duplicated ownership and causal explanation** anchored to actual code line/file/test, distinguishing proven and inferred.
- **Chosen implementation design**: function boundary, typed input/output, state lifetime/room+viewer keys, request/response/in-flight ordering, error handling, immutable output selectors, public event identity; concrete 3–6 steps and one safe fallback.
- **Allowed touched files** and explicit forbidden files/branches; preserve UX2 in-flight work, server rule/privacy invariants, frontend/AI distinct ownership.
- **Regression and acceptance table**: two rooms/two viewers, stale GET vs POST, expired token/409/refresh, simultaneous legal responders, true CardFace/H4/PAC/Console unchanged, real iPhone geometry if visible, performance counters where relevant.
- **Execution budget**: one code unit, pre-agreed maximum meaningful source corrections, targeted local tests, time-limited browser tasks, exact-source-SHA CI, deployment jobs absent or verified skipped by default; a hosted exception requires explicit task-specific authorization. Full local suites not default.
- **Failure/STOP boundary**: abort on UX2 in-flight source conflict, privacy uncertainty, regression, missing CI trigger, old source SHA or Owner-unapproved protocol; request Manager decision, never self-expand Agent task.
- **Owner acceptance and next-task eligibility**, not just "build green".

Status vocabulary: `DRAFT`, `OWNER_APPROVED_CODE_ONLY`, `OWNER_APPROVED_CONDITIONAL`, `IMPLEMENTING`, `PENDING_MANAGER_REVIEW`, `CHANGES_REQUESTED`, `BLOCKED` (record precise dependency), `TECHNICALLY_VERIFIED`, `PENDING_OWNER_IPHONE`, `OWNER_ACCEPTED_CLOSED`. Authorization and readiness are separate; conditional approval does not release gates. These are **UX3 documentation labels**; do not mutate separate UX2/AI task states or claim any state without corresponding evidence.

### Stage D — Owner authorization and safe publish

- Owner approval to establish a **Manager chat** or **write UX3 design documentation** is not approval to modify source, CI workflow or deploy. Before dispatch verify the selected task's recorded approval, budget, applicable editing boundary and actual CI isolation. Non-overlapping preparation and hosted exceptions require explicit live design authority. Never request identical approval just because the conversation changed.
- To write an approved design revision: fetch `ux3/docs/UX3_DESIGN.md` current blob SHA, apply the narrow edit preserving all live and original UX2 contracts, push to `ux3`, independently re-fetch both file content and new commit. **Do not edit `ux-v2/docs/UX2-refine.md`, `ux-v2/HANDOVER.md`, `ux3/UX3_HANDOVER.md`, Agent workflow, main guide or AI design without explicit separate authority.**
- A GitHub push is a durable design handoff, NOT a command that launches a dormant Coding Agent. Provide Owner a short **Chinese copyable UX3 Agent launch instruction** only after code authorization, with exact design task ID/branch/ref; do not claim the Coding Agent was started.

### Stage E — Independently review actual Coding Agent delivery

- Inspect final exact branch head + changed files and diff, the original expected algorithm and negative tests; compare actual important source branches and the current UX2 accepted benchmark. Do not accept "implemented" from Agent Handover alone.
- Verify exact-source-SHA GitHub job results (Lint/Fast/API/Browser), **deployment jobs absent or positively skipped for code-only work; authorized hosted work requires actual target and containment evidence**, relevant unit/test coverage and any actual behavior regression; do not run a long browser matrix just to score a small internal refactor. Report source-based review vs real executed test separately.
- Evaluate real post-change transport-owner reduction, race handling and privacy; H4/PAC/CardFace visual parity if applicable; baseline/after measurements. If only model measurements exist, call them model measurements.
- Verdict `TECHNICALLY_VERIFIED`, `CHANGES_REQUESTED`, `BLOCKED` or `PENDING_OWNER_IPHONE`. Only the Owner marks player-facing `OWNER_ACCEPTED` and gives new changes/extra budget; neither Manager nor Agent invents a PASS. For any Owner explicit PASS, record accepted original UX3 scope and keep compact durable regression/architecture decision in design; do not delete UX2 original protections.
- Next source unit remains DRAFT if not approved; no automatic chain of tasks from a green CI run.

## 5. Resource/CI/testing safety and conflicts

Default CI is isolated and non-deploying; verify actual active-ref workflow configuration and jobs. Only separately authorized hosted tasks with released gates permit remote writes. Docs-only commits may not trigger Actions. No inferred CI PASS, Agent launch, resource creation or cloud deployment.

- Browser/visual tasks have a separately capped small budget (UX2 precedent <=5min local browser per task); no unlimited diagnostics, repeated unchanged smoke, forced public deployment to "test" architecture.
- AI Hosted Staging <=20m T0-to-containment (active <=14, >=6 closure) **applies to separately approved AI Staging tasks, not implicit UX3 hosted permission**. UX3 no hosted execution unless separately Owner authorized with its own resource bound.
- Preserve already-started legacy 7/8-player room compatibility on the backend, but do **not** enable new Classic 7/8-seat UI.
- A gameplay protocol or viewer-version change impacting AI `GET-02`, server privacy, persistent schema or user-facing UX2 acceptance requires a versioned joint PM/AI/UX2/UX3 integration manifest with source SHAs, owner, rollback and explicit Owner permission. All teams stop only overlapping changes, not unrelated approved work.
- No force-push, reset, delete, secret/token logging, private trace upload, unknown broad report artifact, unreviewed merge, cost or production.

## 6. Response pattern and reusable messages

**New Manager chat answer:** Chinese: latest verified refs, recovered design/authority and task state, relevant UX2 constraints, evidence and blocker, next eligible action, genuinely missing Owner decisions, actual verification limits.

**On a requested proposal:** independently inspect relevant source, decide one technical solution, document acceptance and STOP conditions; publish approved task/design in UX3_DESIGN.md. Do not ask the Agent to choose architecture.

**On an approved executable task:** supply copyable separate Agent launch/continuation instruction with live task ID, exact branch/ref, allowed files, scope, tests, budgets, Agent workflow and its own handover. Do not dispatch duplicate Agents. A doc push is not an actual Agent launch.

**Durable Manager session handoff:** after substantive approved decisions and independent reviews, update the design's live status, authorization, exact evidence, open blockers, accepted scope, next eligibility and remaining budget. Preserve old decisions and UX2 contracts. Read current blob before writing, compare and re-fetch remote result. No separate competing roadmap or Manager handover; Agent-owned handover stays read-only. Keep permanent guide/bootstrap free from current task IDs, SHAs and live status. Governance changes require Owner direction.

**Starter for a NEW UX3 Manager chat:** see [`UX3_MANAGER_BOOTSTRAP.md`](UX3_MANAGER_BOOTSTRAP.md). The copied message must point to this Manager guide, NOT the older UX2 Manager guide or UX3 Coding Agent workflow as the primary operating contract.
