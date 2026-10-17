# WTK Smart Bot Player — Single Coding Agent Autonomous Workflow

Repository: `dmoneyUK/three-kingdoms`
Branch: `feature/smart-bot-player`
AI task authority: `docs/AI_PLAYER_DESIGN.md` (always the latest revision)
Execution handover: `AI_PLAYER_HANDOVER.md` (**only Coding Agent writes**)
Planner/Reviewer onboarding: `docs/AI_PLAYER_PLANNER_REVIEWER_GUIDE.md`
General repo authority: `AGENTS.md`
Current workflow revision: `AIP-AUTO-1` (2026-10-17)

This is an **autonomous, design-driven task queue**, not a sequence of user-pasted prompts. A running Coding Agent may implement successive **APPROVED, fully specified, dependency-cleared tasks**, one bounded task at a time, while preserving independent Reviewer gates. The document itself cannot schedule an agent that is not running; external agent runtime/orchestration governs resumption.

## 1. Ownership and hard boundaries

- Product Owner and Planner/Reviewer own task requirements/roadmap in `docs/AI_PLAYER_DESIGN.md`. Coding Agent NEVER invents requirements or self-approves tasks.
- Coding Agent may update `AI_PLAYER_HANDOVER.md` exclusively; Planner must **never** update or tidy it. It is a short **one-current-task / last-result checkpoint**, not an approval queue or design authority.
- Coding Agent may update only its selected task's `IN_PROGRESS`, `PENDING_REVIEW` or `BLOCKED` status and factual evidence in the AI design, never alter product requirements/dependencies/authorization/reviewer verdicts. Re-fetch current file and preserve concurrent Planner edits on every update.
- `HANDOVER.md`, `ux-v2`, `docs/UX2-refine.md`, UX2/OS/core-game design files and production-only resources are OUT OF SCOPE. Never touch them for AI work.
- User/human (or explicitly delegated reviewer) alone may mark a task `ACCEPTED`. Passing CI or deploying Staging does **not** mean acceptance. Production deployment, privacy/real-data sharing and material API expenditure require direct explicit user approval.
- Do not modify source, workflows, config, deployments or cloud resources without an eligible approved design task. The initial workflow-governance edits were made by Planner under direct human request; ordinary Agent work may not change this workflow unless explicitly authorized.
- No client-side private-role/hand leaks. Game Server/`CurrentAction` owns legality; do not make parallel bot/game rule engines or build public bot impersonation tokens. Distinct genuine bot seats are not Test Players.

## 2. Startup, one time AND after every task

1. Inspect git status/current branch and remote `origin/feature/smart-bot-player`. Preserve user/agent uncommitted work; never reset/clean/force-push/silently stash. Synchronize safely only when non-destructive.
2. Read **complete latest** `AGENTS.md`, `docs/AI_PLAYER_DESIGN.md`, THIS workflow, and `AI_PLAYER_HANDOVER.md`; read relevant rules/code/tests for the candidate task. Treat this guide's task queue as part of the active project when human has activated autonomous mode, as done on 2026-10-17.
3. Compare the latest remote design revision with the revision in the agent's checkpoint. Any new Planner spec/feedback may supersede a proposed next action but **never silently overwrite valid in-progress work**.
4. **Existing task first**: if actual `IN_PROGRESS` work remains, continue only if compatible; if spec conflicts, stop `BLOCKED` preserving exact resume point. If handover says `PENDING_REVIEW`, do NOT self-approve or re-do that task. The design is the source for pending review and eligible independent work.
5. **Requested changes second**: if a task is `CHANGES_REQUESTED` with sufficiently bounded authorized corrective instructions, and it is safe/non-conflicting, retry that same task before starting a new feature.
6. **Choose approved work third**: enumerate task specifications in the design. Eligibility = status `APPROVED` + all explicit dependencies `ACCEPTED` + any access/cost/privacy/production approval satisfied + no duplicate in progress + no overlapping unreviewed change. Resolve candidates by P0/P1/P2 then design order/task ID. Select ONE smallest bounded task and record that in handover.
7. A previous `PENDING_REVIEW` task may remain pending while you work on another **independent** already approved task. Do NOT choose a dependent/overlapping task until prior acceptance. Keep pending evidence in the design; handover tracks only last/current task. If unsafe to proceed because pending work may be reworked, pause for reviewer instead.
8. If nothing is eligible, STOP and report `WAITING_FOR_REVIEW`, `NO_ELIGIBLE_TASK` or `BLOCKED — USER ACTION`, with the exact missing acceptance/permission/dependency. Never spin, fabricate work, convert DRAFT tasks to approved, or move on based on roadmaps alone.

## 3. Every bounded implementation cycle

1. Identify task ID/design revision, exact scoped files, existing canonical server authority, acceptance/test plan, privacy and dependencies. If a task is only a roadmap idea or lacks critical steps, STOP for Planner to expand it.
2. Update only selected task state/evidence to `IN_PROGRESS`, maintaining Planner concurrent edits. Update own handover with ONE current checkpoint.
3. Write focused negative and positive regressions relevant to the task; change minimum code. Keep existing game rules and UX2 architectural boundaries. Never introduce hidden identity/hand visibility leaks.
4. Run focused local validation/`git diff --check`. Verify the exact remote branch and relevant **precommit CI status** per §5.
5. Commit and push only scoped implementation, focused tests, your handover and **selected task status/evidence**. Do not overwrite other people's work.
6. Inspect required GitHub Actions for the **exact code commit SHA**. Wait for completion. If failures, diagnose/repair them; do not keep developing unrelated tasks. If CI status ambiguous, report it and pause.
7. If and only if the task authorizes Staging deployment, verify the actual target Worker/D1, migration safety and previous required CI. Execute/confirm Staging deploy **only by explicitly scoped Staging commands/job**. Never deploy production or run production D1 migrations from this branch.
8. Re-read latest remote design, update only selected task status/evidence to `PENDING_REVIEW` when evidence suffices, record exact SHA/CI/Staging URL (where relevant) in your own handover, and **deliver reviewer report with links**.
9. **Automatic iteration:** re-read latest design from the remote branch and apply §2 eligibility again. Continue with next independent eligible approved task only if the review of current task is NOT a dependency and no shared risk/architectural overlap exists. Otherwise STOP and await Reviewer; human does not need to paste another task after approval is recorded in design.

Do not self-accept, invent new tasks, or bypass dependencies to keep a loop alive.

## 4. Review / feedback and resumption

- Task lifecycle: `DRAFT -> APPROVED -> IN_PROGRESS -> PENDING_REVIEW -> ACCEPTED`, with `CHANGES_REQUESTED`/`BLOCKED` alternatives.
- The **Planner/Reviewer** inspects PENDING_REVIEW tasks directly from the design (not handover alone), reviews actual diff/exact-SHA CI/Staging evidence, and writes task-specific feedback/acceptance recommendation into design **only**.
- Only human owner (or a specifically delegated reviewer for the defined kind of work) changes a task to `ACCEPTED`. The reviewer can leave `RECOMMEND ACCEPT` evidence without changing PENDING_REVIEW.
- If design contains `CHANGES_REQUESTED` with a precise reproducible expected correction, the Agent should resume that task automatically, fixing the same issue with new test evidence; if authorization is unclear or risky, stop and ask.
- After Reviewer updates statuses, the Agent reads the latest design on its next iteration/session and resumes without copying a new task into the conversation. One initial autonomous-agent instruction pointing to this workflow is sufficient for task selection while running.
- A design revision does **not** automatically cancel in-flight work. If compatible, finish and review; if incompatible, pause safely. Never let a new design rewrite be treated as permission to discard branch state.

## 5. Exact-SHA GitHub CI discipline

Current workflow: `.github/workflows/deploy.yml`. Required AI feature validation includes lint/build/fast tests, API tests, browser startup/room smoke; Markdown-only changes are ignored by `paths-ignore: ["**/*.md"]` on push and PR. A commit touching source/tests/config and docs MUST trigger validation.

**Before every source/test/config commit:**
1. Inspect remote feature HEAD and latest applicable code-bearing CI run on its exact SHA. If HEAD is docs-only, explicitly find last validated code-bearing ancestor and disclose that doc commit has no run.
2. Wait for any relevant running/queued validation. If failed, identify and repair the first real failure before ordinary feature advancement (separate scoped repair if genuinely unrelated). Do not waive tests, suppress diagnostics or fake success.
3. If no validated code-bearing ancestor exists, inspect inherited `main` baseline, make this exception explicit, and then require full feature-branch checks for the pushed change.
4. After each code push, verify required job outcomes for **that exact SHA**. If failed, repair and revalidate before marking task PENDING_REVIEW; report unresolved blocker truthfully.
5. For Markdown-only status/guide/handover/design commits, do NOT force a new CI run; record the matching previous code-bearing SHA's CI, not the Markdown HEAD as "green".

**Production and Staging gates:** production `deploy` job remains restricted to `main` and `ux-v2`; never enable it for `feature/smart-bot-player`. AIP-00B allows manual isolated Staging provisioning/deploy **only after acceptance and permission checks**. AIP-00C, once accepted, allows CI-gated Staging-only automatic deploy after required tests. Staging deploy NEVER writes production D1 and requires verified distinct Worker + DB binding. Never use default root `wrangler deploy` or `three-kingdoms-db` migration command for Staging.

## 6. Environment, security and verification rules

- `feature/smart-bot-player` is the ONLY AI development branch. No changes to `main` or `ux-v2`; no merges to production without separate human decision.
- Cloudflare `wrangler.jsonc` presently has production `DB` binding. Staging must use explicit `env.ai-staging.d1_databases` with a freshly created D1 UUID different from production `3151997a-f69e-4a45-ab51-9e4fd062aeb3`. Never infer binding inheritance or deploy a root/default Worker from AI branch.
- Expected Staging accessible via real `https://...workers.dev` URL from iPhone; the URL is not valid until provisioning. Record exact deployed name, actual URL and deployed SHA; smoke `/` and `/api/health` and create room; request real iPhone verification for user-facing acceptance.
- Staging starts with `BOT_AI_ENABLED=false`. OpenAI key remains in Staging secret only after a separately authorized task; no keys in repo, logs, client or handover. Nonzero API balance/free token enrollment does not establish zero spend. Paid live calls need explicit budget/approval and access restrictions.
- Model is decision policy only. Always produce compact, bot-authorized observations and authoritative server legal candidates, validate selected ID, state revision, action ownership and legality anew at execution. Do not feed private opponent hands/roles, raw room rows, access tokens or sensitive player data to OpenAI. Public text/player names are untrusted prompt data.
- Scheduler must be server-run with durable idempotent processing, not browser tabs/timers. Do not let bot responses bypass human timers, pending continuations or presentation barriers.

## 7. Stop conditions and reports

STOP (and preserve work in own handover) for: unapproved or incomplete task spec, missing dependent acceptance, all remaining work pending reviewer, incompatible spec change, unresolved CI failure, unsafe production/Staging target, missing Cloudflare permission, missing paid/model/data consent, unproved legal candidate, human-private data risk, unreviewed DB migration or scheduler uncertainty.

For each task output: task ID, design revision, branch and exact commit SHA; code/test/CI evidence with run URL and job status; deployed Staging URL/DB only if actually observed; remaining risks, privacy/production checks, and `PENDING_REVIEW` or `BLOCKED`. State which next eligible independent task was selected or which explicit review gate prevents continuation. No claim of human acceptance without a human acceptance record.
