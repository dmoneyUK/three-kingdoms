# WTK Smart Bot Player — Single Coding Agent Workflow

Repository: \`dmoneyUK/three-kingdoms\`  
Branch: \`feature/smart-bot-player\`  
Design authority: \`docs/AI_PLAYER_DESIGN.md\`  
Execution handover: \`AI_PLAYER_HANDOVER.md\`  
Existing \`HANDOVER.md\` and UX2 design/workflow are **out of scope**.

## 1. Explicit mode and file ownership

This workflow activates only for work on Smart Bot Player as authorized by the human. Do not interpret UX2 autonomous mode as permission to modify the bot branch (or vice versa).

- Human Reviewer + Planner own the **design**; Planner can edit only \`docs/AI_PLAYER_DESIGN.md\` and is prohibited from updating any handover.
- One Coding Agent owns implementation and \`AI_PLAYER_HANDOVER.md\`. Coding Agent can modify the design document **only** for its own assigned task's \`IN_PROGRESS\` / \`PENDING_REVIEW\` status and factual evidence. No specification rewrite.
- Only the human Reviewer can declare \`ACCEPTED\`. A Planner recommendation, passing tests or green CI is not human acceptance.
- \`AGENTS.md\` general security/server rules remain binding. Direct user instructions override this workflow.

## 2. Startup every session (including resume)

1. Inspect current git branch, HEAD, working tree, and remote \`origin/feature/smart-bot-player\`. Never reset, clean, silently stash, force-push or overwrite others' work. Fast-forward only when safe.
2. Read \`AGENTS.md\`, **complete current** \`docs/AI_PLAYER_DESIGN.md\`, this workflow, and complete \`AI_PLAYER_HANDOVER.md\`.
3. Compare the latest remote design revision with the design revision recorded in handover. Read all changes since the last cycle; do **not** assume previously approved requirements still apply.
4. Read only relevant server, DB, UI, game rules, and focused test files.
5. If handover says \`PAUSED BY USER\`, \`BLOCKED\`, or \`PENDING_REVIEW\`, do not silently resume or choose another task.
6. If design is \`DRAFT\`, or there is no \`APPROVED\` task with \`ACCEPTED\` dependencies, stop; keep handover short at \`AWAITING DESIGN APPROVAL\`.
7. If handover has an in-progress task, continue it only when compatible with latest design. If incompatible, stop and request review without discarding work. A design revision alone does not replace an active task.
8. Otherwise select exactly **one** approved, smallest independent task; do not jump ahead because another task looks interesting.

## 3. Bounded execution

For the selected task record in \`AI_PLAYER_HANDOVER.md\`:
- task ID, design revision/heading, branch/base SHA, state (\`IN_PROGRESS\`, \`BLOCKED\`, \`PENDING_REVIEW\`);
- exact goal/acceptance, relevant code surfaces, implementation checkpoint;
- focused test plan and actual executed results;
- precommit CI run, resulting implementation SHA and post-push CI outcome;
- next explicit reviewer decision. No append-only transcript or stale unrelated history.

Implement one concern only:
1. Verify canonical server authority and privacy before modifying decision logic.
2. Add a regression test for the intended boundary; include negative authorization, privacy, replay/stale and concurrency cases relevant to this task.
3. Implement the minimal source change. Never invent legal actions from public presentation or UI, share bot/human session secrets, or treat Test Players as genuine bots.
4. Run focused local validation, \`git diff --check\`, and any specific type/lint commands needed by the touched files.
5. Inspect current branch's latest **remote exact-SHA CI** before every **source/test/config code commit** (§4).
6. Commit/push only authorized files (implementation, tests, this handover, and task-status-only design changes), then verify remote HEAD and relevant exact-SHA CI.

Do not combine unrelated refactors, other branches, or other agents' work.

## 4. Mandatory CI gate

CI workflow: \`.github/workflows/deploy.yml\`. Bot branch runs lint/build/fast/API/browser startup checks but **must not deploy**. Markdown-only commits should be ignored by the workflow.

**Before a code commit**:
1. Inspect remote \`feature/smart-bot-player\` HEAD and latest applicable push workflow run **for that exact SHA** (and any still-running run). Do not substitute a green run from another branch/SHA.
2. If running/queued: wait and re-check.
3. If failed: diagnose the first actual failing job; make the relevant repair and focused regression. Include the repair with the appropriate scoped code change as requested by the user; if unrelated to the selected feature, isolate it as a dedicated CI-repair commit first. Never knowingly push an ordinary feature commit while a broken known baseline remains unaddressed.
4. If no run exists because HEAD changed only Markdown (or branch is new): walk back to the latest **code-bearing validated ancestor**, check its result and explicitly record that the docs SHA has no run. For the very first feature commit, inspect the inherited \`main\` baseline run as additional context; no CI on a docs-only SHA is **not** a green run.
5. If CI status is ambiguous, preserve work and investigate; never claim green.
6. After push, inspect the exact new SHA's required checks. If failed, prioritize CI repair and do not advance the feature task until successful. Preserve proof of failure, cause, fix, and final passing run.
7. Never make CI green by deleting useful tests, weakening assertions, faking responses or skipping correctness/privacy proof.

A markdown-only update to \`docs/AI_PLAYER_DESIGN.md\` / \`AI_PLAYER_HANDOVER.md\` must not trigger CI. A source+Markdown commit **must** trigger CI. Workflow changes themselves may trigger CI.

**IMPORTANT:** The \`deploy\` job is restricted to \`main\` and \`ux-v2\`. Never deploy the feature branch or merge it into \`main\` without an explicit user decision.

## 5. Task finish and review

1. Re-read latest design before editing status; preserve concurrent Planner changes. Only update the selected task's state/evidence to \`PENDING_REVIEW\`.
2. Replace stale handover with one concise finished-task result plus the **current review gate**, not an unrelated next assignment.
3. Verify commit/push/CI for exact SHA. If CI not yet complete, mark \`CI PENDING\` and remain blocked from claiming readiness; update truthful status when observed.
4. Stop and report to human/Planner with direct links to diff, design task, handover and CI. **Do not** mark \`ACCEPTED\` or automatically start another task.
5. When human accepts, Planner/user updates task status to \`ACCEPTED\` in design. On next authorized cycle, review design again and select one next approved task.
6. If changes requested, only reopen the same task as authorized; do not invent a replacement.

## 6. Block / pause conditions

Mark \`BLOCKED — USER INPUT REQUIRED\` (and preserve precise resume point) when:
- designing a new product behavior not decided in the approved task;
- canonical legal-candidate/projection lacks authority, visibility boundary unclear, or implementation needs a new protocol/worker infrastructure design;
- current design and in-flight work materially conflict;
- a supposed fallback is not demonstrably legal;
- a concurrency or CI issue cannot be repaired within scoped work;
- a schema migration or scheduling mechanism introduces unreviewed operational risk;
- the next step would require guessing hidden identities, game rules or undocumented action payloads.

For explicit user pause: mark \`PAUSED BY USER\` and do not resume without explicit permission.

## 7. Required report format

- Task / design revision / branch.
- Implemented scope, boundaries consciously untouched, and exact commit SHA.
- Focused validation actually run; failed tests and repair, if any.
- Precommit exact-SHA CI check and post-push run ID/conclusion (or truthful \`PENDING\`).
- State: \`PENDING_REVIEW\` with reviewer decision required, or \`BLOCKED\` with smallest question.

Never claim a green CI run, release deployment, or human acceptance that was not observed.
