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

The Reviewer may contribute findings through the design document but does not gate authorized autonomous UI implementation. Do not wait for separate Reviewer approval or claim human acceptance unless it was explicitly reported.

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

## 4. Task implementation

For the active task:

1. Confirm its objective, design authority, expected scope, acceptance evidence, and stop condition.
2. Inspect the smallest relevant production/test surface.
3. Implement one concern only.
4. Add focused regression proof that would fail on the previous broken behavior where practical.
5. Run only focused local validation needed for that proof.
6. Update HANDOVER with a concise implementation result and exact validation actually run.
7. Commit and push to `ux-v2`.

Prefer behavioral/semantic assertions over source-shape assertions. For layout, use real browser geometry and normal hit/click behavior. Screenshots supplement, but do not replace, measurable assertions.

## 5. Commit-time CI gate

GitHub Actions is the full validation gate.

Before every commit, inspect the latest relevant push-triggered run for the current remote `ux-v2` head. A normal task commit is allowed only when that exact revision's required CI has completed successfully. A successful run for another SHA does not satisfy this gate.

If the latest run is **failed**, stop normal task delivery and diagnose/fix the failure first. Run the narrowest useful local reproduction and validation. The only commit permitted while the prior CI is failing is a CI-repair-only commit: stage and commit only the repair and its necessary focused regression/documentation, never bundle unrelated feature work. This repair commit is necessary to produce a new CI result. Push it, record its exact SHA as `CI REPAIR PUSHED — VALIDATION PENDING`, and do not resume feature commits until that SHA's required CI succeeds. If it fails again, repeat the repair cycle.

If the latest run is **queued/in progress**, or its state is **unavailable/ambiguous**, do not make a normal task commit yet. Preserve local work and check again at the next commit boundary; never infer success. After each push, record the exact revision and actual CI state. Do not claim CI green, deployment, or acceptance without observing it.

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

If user authorization or semantic authority is missing, stop and ask the user only for the missing decision. Separate Reviewer approval is not a gate. If boundedness is missing, split the work. Never copy a broad roadmap list into HANDOVER.

## 9. User-input stop conditions

Record `BLOCKED — USER INPUT REQUIRED` and stop when:

- current design and direct user instructions materially conflict;
- a new product/gameplay decision is required;
- semantic authority is missing or ambiguous;
- public/private ownership is unclear;
- a visual task would require gameplay/server-rule changes;
- fitting the layout requires a material product decision not specified by the current design or direct user instructions;
- CI can only be made green by weakening meaningful coverage;
- the task unexpectedly requires a large unrelated rewrite;
- any remaining action would require guessing.

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
