# WTK Autonomous UI/Layout Agent Workflow

Repository: `dmoneyUK/three-kingdoms`  
Working branch: `ux-v2`

This file defines **how** autonomous UI/Layout work is executed. During UX2 refinement, current product/UI behavior belongs in `docs/UX2-refine.md`; the active task belongs in `HANDOVER.md`.

## 1. Activation and authority

Autonomous UI/Layout mode is active only when the user explicitly activates it or asks the Agent to follow this workflow.

Use these roles:

- direct user instruction — current scope, pause/resume, explicit decisions;
- `AGENTS.md` — repository-wide execution and architecture rules;
- `docs/UX2-refine.md` — current UX2 refinement design authority;
- `HANDOVER.md` — current bounded task and current execution status;
- this workflow — execution cadence;
- roadmap/history — historical evidence only.

The current refinement design document is not a task queue. A newly added design requirement does not silently replace a task already in progress. If the current task remains compatible, finish it; if it directly conflicts, stop source edits and replan from the latest `docs/UX2-refine.md` and direct user instructions. Ask the user only when the conflict leaves a material product decision unresolved.

The Reviewer may contribute findings through the design document but does not gate authorized autonomous UI implementation. **Owner standing direction (2026-11-26 17:11 UTC):** within an already authorized active task, Planner publishes necessary evidence-based technical/design corrections directly; Agent synchronizes and resumes safely without separate Owner/Reviewer reapproval or a new launch message. Use latest compatible design; preserve local work. Routine implementation tradeoffs, soft visual spacing, empty reserves and missing optional UI evidence are not user-input blockers. New product scope, gameplay/semantic/privacy authority, genuine unresolved hard interaction conflicts and explicit pauses still require Owner direction. Never claim human acceptance unless explicitly reported.

## 2. Fresh session / resume

Before source or test edits:

1. Inspect branch and working tree. Preserve all local changes.
2. Fetch `origin/ux-v2` and fast-forward only when safe.
3. Read `AGENTS.md`.
4. Read the complete current `HANDOVER.md`.
5. Read this workflow.
6. Review the current remote UX2 refinement design at `docs/UX2-refine.md`:
   - compare it with the design revision recorded in HANDOVER;
   - inspect every intervening design change;
   - read the sections cited by the active task.
7. Inspect only source/tests relevant to the active task.
8. Consult the roadmap only when historical evidence or next-task planning requires it.

If HANDOVER or the user says `PAUSED BY USER`, do not resume implementation until the user explicitly resumes it.

If the worktree cannot be synchronized safely, preserve it and report the exact state instead of forcing a branch operation.

## 3. Current-task rule

Execute the one bounded task in `HANDOVER.md`.

Do not:

- restart completed historical VIS tasks;
- use roadmap items as authorization;
- widen scope because an adjacent issue is visible;
- convert a visual task into a gameplay/semantic change;
- invent a next task while the current task is still open.

A separate discovered problem should be recorded as a candidate for the next planning boundary unless it blocks the current task.

### Current UX2 scope

The latest `docs/UX2-refine.md` governs active product scope. The former visible causal/relationship-graph design and its implementation phases are **SUPERSEDED / CANCELLED**, not deferred or automatically authorized after another task closes. Never restore visible source/target/response connectors, arrows, graph-only Hero/Seat nodes or central causal diagrams. Preserve authoritative server event relationships and real card identity; this is a presentation restriction, not permission to remove semantic contracts or source code.

At a safe planning boundary, use §8 and the current design status index/latest Owner verdicts to choose one authorized bounded task. Do not reopen accepted or superseded items, or redispatch delivered items awaiting Owner phone review. If a stale HANDOVER or historical instruction asks for graph work, stop that conflicting work before source edits and reconcile it against current design and explicit Owner scope; do not resume it. CI cadence and the combined five-minute local UI/browser test limit remain unchanged.

## 4. Task implementation

For the active task:

1. Confirm its objective, design authority, expected scope, acceptance evidence, and stop condition.
2. Inspect the smallest relevant production/test surface.
3. Implement one concern only.
4. Add focused regression proof that would fail on the previous broken behavior where practical.
5. Run only focused local validation needed for that proof.
6. Update HANDOVER with a concise implementation result and exact validation actually run.
7. Commit and push to `ux-v2`. Complete a small bounded correction in one delivery, not artificial stages or separate approvals. When Owner explicitly requires one combined delivery, do not split it. For §10.78 specifically both remaining defects are one implementation and delivery.

### Local UI-test time limit

For each bounded task, cap the **combined local UI/browser testing time at five minutes**. If the needed UI test has not produced a result by then, stop it, record it as **SKIPPED — exceeded five-minute limit**, and do not start another UI test or retry a broader suite. Continue implementation or documentation work only when it remains safe without that evidence; keep the task unverified and do not claim UI behavior was validated. This cap applies to agent-run local UI/browser tests and does not disable the repository's required GitHub Actions release gate in §5.

Prefer behavioral/semantic assertions over source-shape assertions. For layout, use real browser geometry and normal hit/click behavior. Screenshots supplement, but do not replace, measurable assertions.

## 5. Commit-time CI gate

GitHub Actions is the full validation gate.

Before every commit, inspect the latest relevant required push-triggered CI for current remote `ux-v2` code. If queued/in progress, wait; if successful, continue. **Markdown-only HEAD exception:** deploy.yml deliberately ignores `**/*.md` changes. If HEAD has no run because intervening commits after latest successfully validated code SHA changed ONLY Markdown documentation paths (including HANDOVER), verify ancestry and complete changed-path diff, record both SHAs and successful run, then proceed. Do not wait for nonexistent CI or require docs-only deploy. If any non-Markdown/build/workflow/test/config change, missing ancestry or uncertain diff exists, exception does not apply. A later failed/running relevant code run cannot be bypassed. Every new code delivery still requires its own exact-SHA CI and deploy/smoke.

If the latest run is **failed**, stop normal task delivery and diagnose/fix the failure first. Run the narrowest useful local reproduction and validation. Commit the CI repair with its necessary focused regression/documentation; never bundle unrelated feature work. Push it, record its exact SHA as `CI REPAIR PUSHED — VALIDATION PENDING`, and do not resume feature commits until that SHA's required CI succeeds. If it fails again, repeat the repair cycle.

The push workflow uses the same-ref Actions concurrency queue (`queue: max`) so new runs wait rather than cancelling an in-progress run. Queueing does not count as validation success. If the run state is **unavailable/ambiguous**, preserve local work and re-check before committing; never infer success. After each push, record the exact revision and actual CI state. Do not claim CI green, deployment, or acceptance without observing it.

## 6. CI failure rules

Classify the failure before editing:

- production regression — fix production behavior and regression proof;
- incomplete implementation — finish the task;
- stale assertion against the current design — update the stale assertion, not the product behavior;
- infrastructure/flaky failure — prove that from relevant evidence before retrying.

Never obtain green CI by deleting meaningful tests, weakening assertions until they prove nothing, using forced clicks to bypass real overlap, adding arbitrary waits, hiding required content, or changing gameplay rules for layout convenience.

## 7. Architecture and privacy guardrails

The non-negotiable repository boundaries in `AGENTS.md` remain active.

In particular:

- local legal actions come from `CurrentAction`;
- public interaction facts come from authoritative presentation projection;
- missing/ambiguous authority fails closed;
- private viewer information stays private;
- the viewer Hero remains in the Local Player Dock;
- opponent seat DOM remains fixed;
- visual work must not invent gameplay semantics.

`docs/UX2-refine.md` owns current UX2 refinement behavior and measurements. Do not duplicate a second design specification here.

## 8. Next-task planning gate

Only plan a next task when the current task has closed or is explicitly blocked.

At the planning boundary:

1. Safely synchronize `ux-v2`.
2. Review the latest remote `docs/UX2-refine.md` and compare it with the revision recorded in HANDOVER.
3. Inspect relevant current code/tests.
4. Consult roadmap/history only for evidence, not authorization.
5. Choose one candidate only if all are true:
   - **authorized** — current design or direct user instruction requires it;
   - **authoritative** — existing server/projection data can support it without inventing semantics;
   - **bounded** — one concern can be implemented/tested independently;
   - **useful** — it is a meaningful remaining player-facing gap;
   - **provable** — focused regression evidence can demonstrate the gap.
6. Write exactly one next bounded task into HANDOVER and record the design revision reviewed.
7. Apply the commit-time CI gate in §5 before the task's first commit and again before every later commit.

If authorization or semantic authority is genuinely missing, stop and ask only for the missing material decision. Published within-scope corrections need no separate approval. Separate Reviewer approval is not a gate. Do not split small bounded work or a combined delivery explicitly required by Owner; split genuinely large work only where authorized. Never copy a broad roadmap list into HANDOVER.

## 9. User-input stop conditions

Record `BLOCKED — USER INPUT REQUIRED` and stop when:

- current design and direct user instructions materially conflict;
- a new product/gameplay decision is required;
- semantic authority is missing or ambiguous;
- public/private ownership is unclear;
- a visual task would require gameplay/server-rule changes;
- fitting layout requires a genuinely unresolved hard product/interaction decision not specified by current design or direct user instructions; soft gaps, nominal empty reserves and permissible foreground layering are not hard blockers;
- CI can only be made green by weakening meaningful coverage;
- the task unexpectedly requires a large unrelated rewrite;
- remaining action requires guessing gameplay, privacy/authority or genuinely material product behavior (not ordinary bounded implementation judgment).

Before blocking, read latest remote design and use permitted fallback. Missing optional local visual evidence is recorded, not an automatic commit veto. If still blocked, report exact remaining hard issue without marking task complete or splitting an explicitly combined delivery.

HANDOVER should contain only the exact blocker, evidence, affected surface, and smallest human decision required.

## 10. HANDOVER and history

Keep HANDOVER concise:

- latest relevant result/CI;
- latest Coding-Agent-reviewed design revision;
- exactly one current/next task;
- precise pause/block/resume point when needed.

When a task closes, move only durable milestone/history information to `docs/AUTONOMOUS_UI_ROADMAP.md` or an archive. Remove stale task text from HANDOVER rather than appending indefinitely.

Roadmap/history never overrides current design, current code, or HANDOVER.

## 11. Pause / resume

On explicit user pause:

- stop source edits/tests;
- preserve uncommitted work;
- mark HANDOVER `PAUSED BY USER`;
- record the precise resume point;
- do not mark the task complete or select a replacement.

On resume, repeat §2.

## 12. Reporting discipline

Keep reports factual and compact:

- exact implementation SHA when pushed;
- tests actually run;
- exact CI revision/run/status when checked;
- measured visual evidence when relevant;
- known gap or blocker.

Do not claim Reviewer acceptance, production health, real-device certification, WCAG certification, or deployment success without direct evidence.
