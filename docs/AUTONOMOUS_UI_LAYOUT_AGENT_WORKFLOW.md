# WTK Autonomous UI/Layout Agent Workflow

Repository: dmoneyUK/three-kingdoms  
Working branch: ux-v2

This is the execution guide for autonomous UI/Layout work and is intended to
be sufficient to resume in a fresh conversation. Conversation history is not
task authority: use the current remote HANDOVER.md and the repository's
current design/architecture documents.

## Purpose and activation

Autonomous UI/Layout mode permits the Agent to plan and execute multiple
bounded UI/Layout tasks without waiting for human review after every task. It
changes task cadence only; it does not authorize new product/game semantics or
change any gameplay, authority, privacy, or safety boundary.

The mode is active when the user explicitly says AUTONOMOUS UI RUN: ACTIVE,
or asks the Agent to read/follow this workflow and continue the autonomous
UI/Layout work. AGENTS.md defines the mode-selection rules and the normal
reviewer-authored single-task workflow.

The human Reviewer may inspect work at any time. Agent completion is not
Reviewer acceptance. Never write REVIEWER ACCEPTED; only the human Reviewer
may accept, partially accept, reject, or redirect work.

### Authority map

- Current direct user instructions control the requested scope, including a
  pause or resume.
- AGENTS.md defines repository-wide execution, architecture, privacy, and
  delivery constraints.
- Remote HANDOVER.md defines the current task and its current status, unless
  a newer direct user instruction changes that status or scope.
- This file defines autonomous planning, validation, CI, and handoff cadence.
- docs/UX_V2_INTERACTION_STAGE_DESIGN.md is the product/UI design authority.
- docs/PLANNER_DEVELOPMENT_WORKFLOW.md is the architecture/development
  workflow authority.
- docs/UX_V2_RELEASE_GATE.md records release-gate evidence; it is not a
  substitute for current code or current task authority.
- docs/AUTONOMOUS_UI_ROADMAP.md stores durable history and broad directions,
  not the active task.

If an approved design, authoritative data, or these authorities do not settle
a material product or semantic choice, stop under §14 rather than guessing.

## 1. Fresh-session startup and resume

At the start of a new conversation or when resuming after a pause:

1. Inspect the branch and working-tree state before synchronizing. Preserve all
   existing local changes. Do not discard, overwrite, reset, clean, or commit
   unrelated/unvalidated work.
2. Fetch origin/ux-v2 and fast-forward the local ux-v2 branch when safe; see
   §2. If synchronization would overwrite or entangle local changes, stop and
   report the exact state instead of forcing it.
3. Read AGENTS.md, then the complete current HANDOVER.md, then this entire
   workflow file.
4. Continue the current handover task; do not repeat tasks marked
   COMPLETED BY AGENT — CI GREEN and do not invent a replacement task.
5. Read the current task's cited sections in
   docs/UX_V2_INTERACTION_STAGE_DESIGN.md and, when relevant,
   docs/PLANNER_DEVELOPMENT_WORKFLOW.md.
6. Inspect only the relevant production and test code. Consult
   docs/AUTONOMOUS_UI_ROADMAP.md selectively for planning or historical
   evidence; do not read it in full by default.
7. If the user or HANDOVER marks work PAUSED, do not resume source changes
   or tests until the user resumes it. A pause is not task completion.

At every later task-planning boundary, reread the current interaction design
and this workflow for new or changed requirements before selecting the next
task (§19). Do not reread large unchanged source files without a reason.

## 2. Branch and working-tree safety

The authorized UI/Layout branch is ux-v2; never modify or merge main.

Use a safe fetch/fast-forward flow, for example:

    git status -sb
    git branch --show-current
    git fetch origin ux-v2
    git merge --ff-only origin/ux-v2

Run the fast-forward only when on ux-v2 and Git can apply it without
overwriting local changes. Do not switch branches with a dirty worktree, force
push, rebase away user work, or silently stash changes. If local and remote
state diverge or a fast-forward is unsafe, preserve the work and ask/report
before proceeding. Stage only files in the authorized task; never sweep up
unrelated dirty files.

## 3. HANDOVER and roadmap

HANDOVER.md is the short, current coordination record. It should contain:

- the latest relevant implementation/result and truthful CI state;
- exactly one current or next bounded task;
- its acceptance evidence, validation scope, and stop condition;
- any user-requested pause and the precise resume point.

Do not make HANDOVER an append-only history. During a task, update only the
compact status needed to hand off accurately. When a task closes or blocks,
move durable history to docs/AUTONOMOUS_UI_ROADMAP.md and replace obsolete
HANDOVER material with the latest result and exactly one current/next task.
When the user pauses, record PAUSED BY USER, retain the active task, and do
not mark it complete or plan a substitute task.

The roadmap holds completed milestones, implementation/CI history, durable
accepted contracts, deferred gaps, and broad remaining directions. Historical
roadmap entries can cite older versions of this workflow; treat those entries
as history, not current process instructions.

Never write REVIEWER ACCEPTED.

## 4. Non-blocking CI checkpoint

GitHub Actions is the full validation gate. The cadence is deliberately
non-blocking:

1. Complete one bounded task, run only the focused local validation allowed
   by AGENTS.md and the current handover, then commit and push it to
   origin/ux-v2. Record the exact revision as IMPLEMENTED — CI PENDING;
   do not wait for its Actions run.
2. Plan the next bounded task and update HANDOVER before its source edit.
3. At that next task boundary, after syncing and reviewing the current design
   and workflow but before the first source edit, inspect the latest
   push-triggered Actions run on ux-v2 once:
   - Completed success: proceed; mark only the exact tested revision green.
   - Queued or in progress: do not wait or poll; proceed and check again at
     the next task boundary.
   - Completed failure: pause new feature work, inspect only the relevant
     failed job/logs, fix the root cause, and push the correction. Do not wait
     for that correction's run; resume bounded work and check again at the
     following task boundary.
   - Unavailable/ambiguous: record status as unverified and do not claim
     success; proceed only if no known completed failure blocks the work.
4. Do not repeatedly inspect the same run, monitor every log, or infer that an
   earlier revision passed because a later task started or was pushed.

The checkpoint is a status check, not a wait gate. A revision is
COMPLETED BY AGENT — CI GREEN only after its exact required CI jobs are
confirmed successful. CI success is not human Reviewer acceptance or proof of
production health.

Do not run complete local suites/build/lint as a routine step. Follow the
current user and AGENTS.md: focused tests may be run when needed to prove new
tests or reproduce a reported CI failure; leave the full gate to GitHub Actions.
Never claim validation that was not actually run or observed.

## 5. CI failure classification

Classify a reported/observed failure before editing:

- Production regression: fix the task-caused behavior and its proof.
- Test exposes incomplete implementation: finish the implementation.
- Stale assertion conflicts with an accepted design change: update the
  assertion to prove the current contract; do not revert accepted production
  behavior merely to satisfy an obsolete source-shape check.
- Flaky or infrastructure failure: establish that from the relevant logs
  before retrying.

Never make CI green by deleting meaningful tests, weakening assertions until
they prove nothing, force-clicking around real overlap, adding arbitrary waits,
hiding required content, or changing gameplay/server rules to simplify layout.
Keep the fix limited to the actual failure and required regression.

## 6. Non-negotiable architecture and gameplay boundaries

- CurrentAction owns local legal actions. React renders authoritative choices
  and must not reconstruct gameplay legality.
- PresentationSnapshot / PresentationClientView own proven public
  interaction facts. Do not infer source, target, participant, responder,
  resolver, causality, or ordering from timeline order, turn owner,
  actionPlayerId, player/card labels, DOM position, local selection, HP, or
  animation state.
- Correlation is not authority. Use typed projected facts and stable IDs;
  missing or ambiguous evidence fails closed to neutral/no focus.
- Keep public presentation separate from private viewer projections. Never
  expose private hand identities/providers, hidden roles, or viewer-private
  legality in the public Interaction Stage.
- Local controls remain in LocalPlayerDock; do not move gameplay controls
  into the public Stage.
- The viewer's Hero remains in the Local Player Dock and must not be duplicated
  centrally. Physical opponent seat DOM remains fixed; Stage uses semantic
  presentation projections rather than moving seats.
- Preserve existing protocol, server authority, privacy, stale/replay safety,
  semantic continuations, exact physical-card conservation, and fail-closed
  behavior. New card/hero behavior must use shared capability/continuation
  paths, not provider-specific routes/actions.
- WTK Standard is the active ruleset. For card/hero/rule questions, consult
  docs/OFFICIAL_CARD_REFERENCE.md,
  docs/STANDARD_108_DECK_MANIFEST.md, and
  docs/STANDARD_HERO_REFERENCE.md first, as required by AGENTS.md.

## 7. Product design authority (not a second design spec)

Use docs/UX_V2_INTERACTION_STAGE_DESIGN.md for approved visual behavior and
measurements. This workflow intentionally does not restate the detailed UI
specification; cite the current design sections in HANDOVER and compare the
implementation to those sections. When design requirements change, the current
design document wins over a duplicated or historical summary here.

The subtopic anchors below remain for older roadmap references. Each points to
the current design document; none freezes an older measurement or mockup.

### 7.1 Top Row

Current product authority: docs/UX_V2_INTERACTION_STAGE_DESIGN.md.

### 7.2 Side Column

Current product authority: docs/UX_V2_INTERACTION_STAGE_DESIGN.md.

### 7.3 Interaction Stage

Current product authority: docs/UX_V2_INTERACTION_STAGE_DESIGN.md.

### 7.4 Multi-target

Current product authority: docs/UX_V2_INTERACTION_STAGE_DESIGN.md.

### 7.5 AOE / Group

Current product authority: docs/UX_V2_INTERACTION_STAGE_DESIGN.md.

### 7.6 Reaction / Negation

Current product authority: docs/UX_V2_INTERACTION_STAGE_DESIGN.md.

### 7.7 Local Player Dock

Current product authority: docs/UX_V2_INTERACTION_STAGE_DESIGN.md.

### 7.8 Action semantics and placement

Current product authority: docs/UX_V2_INTERACTION_STAGE_DESIGN.md, especially
the current action-bar contract. Do not use stale workflow prose to override
that contract.

### 7.9 Guidance

Current product authority: docs/UX_V2_INTERACTION_STAGE_DESIGN.md.

### 7.10 Hero skills

Current product authority: docs/UX_V2_INTERACTION_STAGE_DESIGN.md.

### 7.11 Hand

Current product authority: docs/UX_V2_INTERACTION_STAGE_DESIGN.md.

### 7.12 Judgement

Current product authority: docs/UX_V2_INTERACTION_STAGE_DESIGN.md.

## 8. Accepted implementation evidence

Do not maintain a second static list of accepted implementation details here.
Check docs/UX_V2_RELEASE_GATE.md for its bounded release evidence,
docs/AUTONOMOUS_UI_ROADMAP.md for later task history, and the current source
and tests before making claims about implementation. A historical test shape
does not override a subsequently accepted design. Acceptance by the Agent is
not Reviewer acceptance.

## 9. Current task source

There is no hard-coded starting task in this workflow. The complete current
remote HANDOVER.md identifies the active bounded task and its status. Do not
restart old VIS milestones or use a historical roadmap recommendation as
authorization. If HANDOVER is missing or materially ambiguous, stop and
report it rather than inventing a task.

## 10. Roadmap directions are candidates, not a task queue

Use docs/AUTONOMOUS_UI_ROADMAP.md and the current interaction design to
identify possible remaining concerns only when HANDOVER has no active task or
the current task has closed. Directions are not mandatory sequence, approval,
or permission to bundle multiple concerns. Apply §19 to select exactly one
small, high-impact task. Do not copy an old fixed roadmap into HANDOVER.

## 11. Task decomposition

Prefer one independently reviewable architectural/visual concern per task.
If implementation reveals a separate dependency, finish only the safe bounded
portion, record the exact gap, and create a separate task after applying §19.
Do not opportunistically refactor unrelated code or bundle an entire roadmap
area into one change.

## 12. Regression design

- Prove behavior rather than source text whenever practical.
- Use real browser geometry for layout and normal clicks / hit-testing for
  controls where useful.
- Assert semantic IDs, action payloads, ownership, visibility, and privacy
  where relevant; do not rely only on screenshots.
- Extend existing fixtures/helpers instead of creating parallel test systems.
- A screenshot supplements behavioral/geometry assertions; it does not replace
  them. Inspect actual captures for visual tasks and report evidence honestly.

## 13. Unacceptable shortcuts

Do not use scaling or arbitrary offsets to fake fit/topology; z-index to mask
overlap; forced clicks to bypass blocked controls; clipping/hidden overflow as
the only treatment for required information; unreadable text reduction; moving
the Local Player Dock; aggressive Hand/Hero shrinkage before secondary-density
work; hidden semantic context; client-derived legality/causality; player-name
matching as authority; gameplay changes for layout convenience; or browser-only
production special cases.

## 14. Human-review stop conditions

Stop implementation and record BLOCKED — HUMAN REVIEW REQUIRED when:

1. Approved design sources conflict on player-facing behavior.
2. A new product/design decision is required.
3. Authoritative source, target, participant, actor, resolver, or causal data is
   missing or ambiguous.
4. Presentation would require changing gameplay legality/server semantics.
5. Private/public information ownership is unclear.
6. A layout cannot fit without breaking an accepted invariant and more than
   one reasonable trade-off remains.
7. CI can only be green by weakening meaningful regression coverage.
8. The task requires a large unrelated architecture rewrite.
9. Current implementation contradicts approved design and the correction is
   not decided by existing design authority.
10. Any remaining action would require guessing.

Update the short HANDOVER with the exact evidence, affected files/measurements,
why current authority is insufficient, alternatives, and the smallest human
decision required. Do not append an unbounded narrative; then stop.

## 15. Completion standard

A task is COMPLETED BY AGENT — CI GREEN only when its implementation is
committed and pushed, the focused regression evidence is recorded, and the
exact revision's required Actions jobs are confirmed successful. A later task
starting while an earlier run is pending does not close that earlier task.
Record durable implementation/CI history in the roadmap and keep HANDOVER
compact. Never imply human Reviewer acceptance or production health.

## 16. User pause and autonomous-run closeout

An explicit user pause stops source edits, feature work, and tests immediately.
Preserve any uncommitted work, update HANDOVER to PAUSED BY USER with the
precise current task/resume point, and do not claim completion or choose a
substitute task. Resume only after a direct user instruction.

When the autonomous run actually stops because the user asks, approved work is
complete, or a human-review blocker is reached, update the roadmap with durable
history and leave HANDOVER as a concise handoff. Do not write a full run
summary after every task. Never claim touch-device certification, WCAG
certification, or deployment health without separate evidence.

## 17. Resume protocol

Use §1 for every fresh session or resumed run. HANDOVER remains the current
task authority; the roadmap is historical context. Re-fetch before relying on
local records, preserve dirty changes, continue the current task, and do not
repeat completed work without new regression evidence.

## 18. Context and token efficiency

- Reference stable architecture/design sections; record only task-specific
  deltas in HANDOVER.
- Keep implementation records focused on SHA, files, measurements, tests
  actually run, CI evidence, and remaining gaps.
- Keep CI records to exact revision/run/job/status and any correction; do not
  reproduce logs or test tables.
- Reuse existing browser fixtures, geometry helpers, and semantic helpers.
- Read source narrowly and do not repeat large unchanged file reads.
- Do not update README for every small visual change; do so only when the
  durable user-facing contract, architecture, setup, usage, or release status
  materially changes.
- Do not invent token percentages when runtime usage is unavailable.
- Prefer two to four bounded implementation tasks between human milestone
  reviews, but do not stop solely because a task count was reached.
- Before starting each next task, give the user a compact progress report:
  completed/current work, exact CI state, known gaps, and approximate remaining
  directions. Then state the next bounded task and its rationale before its
  first source edit.

## 19. Next-task planning gate

Before planning every next task:

1. Synchronize ux-v2 safely from origin (§2).
2. Review the current docs/UX_V2_INTERACTION_STAGE_DESIGN.md and this
   workflow for newly added/changed requirements or execution rules. Check the
   candidate's cited design sections and any newly changed sections.
3. Inspect the actual current code and tests; consult the roadmap selectively
   only for history or broad candidate directions.
4. Answer all five questions from evidence:
   - Approved requirement: Is the desired behavior explicitly in the
     current approved design or a reviewer decision?
   - Authority: Can existing authoritative data support it without new
     gameplay/public semantics?
   - Boundedness: Can one concern be implemented and tested independently?
   - Impact: Is it a high-impact remaining player-facing gap?
   - Regression proof: Can the old gap be demonstrated by focused evidence?
5. Choose the smallest high-impact candidate that passes the gate, update
   HANDOVER with exactly one bounded task, and report progress/remaining work.
6. Before that task's first source edit, perform the one-time latest-run CI
   checkpoint in §4. A completed failure takes priority; queued/running CI does
   not block; unavailable status stays unverified.

If question 1 or 2 is NO, stop as BLOCKED — HUMAN REVIEW REQUIRED. If 3 is
NO, split the task. If 4 is NO, choose a higher-impact approved gap. If 5 is
difficult but the change remains objectively measurable, define the smallest
available geometry/DOM/interaction proof and record its limitation.

For participant density, count participants actually rendered after viewer,
primary, and source exclusions unless an approved design rule explicitly says
otherwise. Do not invent progress, ordering, or outcome semantics.

## 20. New-conversation handoff

To continue in a fresh conversation, use the repository—not the old chat—as
the source of truth. A suitable opening instruction is:

> I am resuming the current WTK autonomous UI/Layout task on ux-v2. First fetch
> and safely fast-forward from origin, then read AGENTS.md, the complete
> HANDOVER.md, and docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md. Follow the
> current task/status, inspect only its cited design/source/tests, preserve
> local changes, and use the non-blocking CI checkpoint. This message resumes
> the task if HANDOVER says PAUSED BY USER.

Before moving conversations, make sure the latest HANDOVER is committed and
pushed. Uncommitted code/test work is not transferred by that push: retain the
same worktree or explicitly tell the new conversation that the handover scope
must be reconstructed from remote source. Never claim an uncommitted change is
available remotely.
