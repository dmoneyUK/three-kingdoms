# WTK AI Player — Coding Agent Workflow

> **AIP-AUTO-7 / 2026-11-25** — permanent execution procedure, not a task queue.
> Repository: `dmoneyUK/three-kingdoms` · AI branch: `feature/smart-bot-player`
> Task authority: `docs/AI_PLAYER_DESIGN.md` · Agent checkpoint: `AI_PLAYER_HANDOVER.md`
> Reviewer guide: `docs/AI_PLAYER_PLANNER_REVIEWER_GUIDE.md` · Repository rules: `AGENTS.md`

## 1. Role and authority

**Agent executes; Planner/Reviewer reviews and designs.** Never undertake independent code review, source/test coverage audits, architecture assessments, design recommendations or investigation-only assignments. Reading relevant source to implement a specified change, diagnosing and fixing ordinary implementation failures, and measuring the deployed result are execution.

- Owner authorizes scope and acceptance. Planner publishes complete implementation tasks and corrections in the design; PM/UX2 owners resolve their shared contracts. A roadmap or proposal is not approval.
- Latest explicit Owner direction and the authorized current design govern execution within repository rules, canonical game authority and safety limits. Handover is factual evidence, not task authority. Superseded instructions are not executable.
- Agent alone writes its Handover and may update only its selected task's factual evidence and `IN_PROGRESS`, `PENDING_REVIEW` or `BLOCKED` status. Preserve concurrent edits. Never change requirements, approvals, Reviewer verdicts or governance; never self-accept.
- Do not edit other agents' handovers, UX2/main branches or their design documents. Never force-push, reset, destructively clean or silently stash existing work.

## 2. Start and select work

1. Fetch latest remote AI branch; inspect HEAD, local work and Handover. Synchronize non-destructively.
2. At a new session read the complete latest design, this workflow, `AGENTS.md` and own Handover. Within the same session, reuse already-read context and refresh changed design sections, current task and dependencies after each delivery or meaningful remote change. Read the relevant implementation source.
3. Follow the design's current executable unit. Otherwise resume compatible in-progress work, then authorized corrections, then fully specified approved tasks with cleared dependencies in design priority order. An Owner startup command is a pointer to the latest design, not a replacement specification.
4. Normally dependencies require acceptance. An explicitly authorized integrated batch may advance after its predecessor's specified CI/Staging gates pass without intermediate acceptance; stop at the batch's final review gate. Independent approved tasks may proceed only when nonconflicting. Never select Reviewer-only, historical, draft or blocked work.
5. Preserve work and report a concrete blocker if authorization or scope conflicts, or an essential decision is missing. If no eligible work remains, stop. Do not substitute a review or investigation.

## 3. Complete one delivery unit

**Implement → focused tests → commit/push → required CI → authorized Staging deployment and verification → final Handover.** These are internal steps, not separate Owner approvals.

1. Implement the specified code changes, reuse existing working behavior, and add necessary focused positive/negative regressions. Preserve canonical legality, private viewer boundaries, card conservation, stale/replay safety and durable recovery.
2. Locally run only new/modified focused tests, minimal failing-test reproduction, targeted lint/syntax and diff checks. Run a necessary build/dry-run when explicitly required by the task. Full suites belong to GitHub Actions. Do not duplicate passing tests or benchmarks.
3. Commit and push scoped source to the authorized ref. When deployment is held, an explicitly authorized non-deploying review ref may receive actual code; verify workflow/ref guards and publish when directed, without waiting for independent review or a pending build. Do not produce Markdown diff packages or withhold safe publication because an older Handover/hosted CI was blocked.
4. Check required CI jobs on the exact code SHA. Correct ordinary in-scope build/test/CI failures within the unit's stated retry budget; do not weaken tests or rerun an unchanged failing SHA without evidence of a transient failure. Do not pursue unrelated features while required checks fail.
5. If Staging is authorized, deploy and verify actual behavior (section 4). Do not stop at local tests when the task requires deployment. Do not repeat long hosted tests on unchanged code.
6. Push final code and concise Handover. Mark `PENDING_REVIEW` only if the specified engineering gates pass; otherwise record the actual failure/blocker. Reviewer fetches the source/diff/CI independently. Refresh design and continue eligible work without a new pasted prompt. A dormant agent is not awakened by a document update.

## 4. Deployment and monitoring

- Use only the explicitly authorized environment and existing credentials. **Cloudflare Free only; no paid resources or quota increases.** No production deploy/migration, real model expenditure or real-player data transfer without separate explicit Owner authority.
- Before deployment, verify the workflow/ref, exact account/Worker, distinct isolated D1 binding, generated config, migration scope, CI and operational safeguards specified in the current task. Never use the default production deploy/migration command. No conflicting deployment or unsafe target.
- After deployment, verify actual code SHA/Worker version, health and the required gameplay/reconnect behavior. Inspect Cloudflare monitoring, invocation CPU/errors, relevant D1 metrics and logs as specified; distinguish CPU from wall time. Record factual evidence without private cards, hidden roles, session tokens, credentials or raw sensitive URLs.
- Execute task-specified cleanup/containment and verify its readback, including on failure. Report residual exposure or access failures; never claim cleanup or deployment was verified if it was not.
- If a non-deploying review ref is authorized, both cloud deployment jobs must be skipped; ordinary CI does not clear the outstanding hosted gate. CI success and mobile emulation do not constitute Owner's physical-device acceptance.
- Model decisions must use authorized observations/legal candidates and the canonical server executor; no parallel rule engine, public bot impersonation, opponent-private data exposure or bypass of actor/revision checks. Server owns scheduling and recovery.

## 5. Delivery record and stop conditions

Keep Handover short: one current/last unit, design revision, exact code SHA and remote ref, focused-test results, CI run/job outcomes, actual deployment/monitoring/cleanup evidence if applicable, unresolved failure or gate, and next eligible unit if any. Markdown-only commits do not require new code CI.

Stop only after delivery when review/dependencies prevent further work, or for a real authorization, safety, credentials, architecture, privacy, cost or exhausted retry-budget blocker. Report the precise failure and preserve accessible source; do not invent another research task or ask the Owner to relay intermediate results.
