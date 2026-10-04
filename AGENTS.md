# WTK project execution workflow

## Mode selection and autonomous UI/Layout shortcut

The normal reviewer-authored single-task workflow remains the default for ordinary coding-agent work.

Autonomous UI/Layout mode is active when the user either:

- explicitly says `AUTONOMOUS UI RUN: ACTIVE`; or
- explicitly tells the Agent to read/follow `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` and continue the autonomous UI work.

When autonomous mode is active, use this startup order:

1. inspect the branch and working-tree state, then synchronize `ux-v2` from
   `origin` without overwriting local changes;
2. read `AGENTS.md`;
3. read the complete current `HANDOVER.md` (it is intentionally short);
4. read `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`;
5. read only the design sections cited by the current task;
6. inspect only the source/tests relevant to the current task;
7. consult `docs/AUTONOMOUS_UI_ROADMAP.md` only when next-task planning or older historical evidence is actually needed.

`HANDOVER.md` is the current handoff authority. `docs/AUTONOMOUS_UI_ROADMAP.md` is the long-lived history/roadmap and is not read in full by default.

While autonomous mode is active, the autonomous workflow may:

- derive and begin the next bounded UI/Layout task after the previous implementation is pushed, subject to the latest-run checkpoint below;
- continue through multiple bounded tasks;
- inspect GitHub Actions at the start of each new task without waiting for an in-progress run;
- fix real CI failures before continuing;
- keep the current task, latest execution result, and next handoff in the short `HANDOVER.md`;
- move completed historical detail into `docs/AUTONOMOUS_UI_ROADMAP.md` so HANDOVER does not grow over time.

Everything else in this file remains in force, especially server/gameplay authority, privacy boundaries, fail-closed semantics, WTK Standard references, no unrelated scope widening, and truthful validation reporting.

If the worktree is dirty, preserve existing changes and inspect ownership before
branch switching, staging, committing, or synchronizing. Never assume an
uncommitted change is present on the remote branch or in a new worktree.

Autonomous mode does **not** authorize new product/game semantics. If approved design or authoritative data is insufficient, follow the workflow's `BLOCKED — HUMAN REVIEW REQUIRED` rule.

## Normal-mode task authority

These rules apply when autonomous UI/Layout mode is **not** active.

- At the start of every normal task, synchronize the current authorized branch from the remote repository and read the complete remote `HANDOVER.md` before changing files.
- The reviewer-authored task in `HANDOVER.md` is the normal-mode project task authority. Understand its objective, scope, acceptance criteria, validation requirements, branch, and handoff instructions before acting.
- Execute only the current handover task. Do not invent a follow-up task, widen the scope, or replace a reviewer requirement with a local preference.
- If the current handover is unclear, malformed, or missing, stop and report that state instead of guessing the next implementation.

In autonomous UI/Layout mode, current task authority comes from the short `HANDOVER.md` plus `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`. `docs/AUTONOMOUS_UI_ROADMAP.md` contains long-lived history and roadmap context.

## Rules and reference sources

- The active ruleset is WTK Standard only. Do not add Endless Legends or Kingdom Wars cards to new games unless the reviewer explicitly changes this priority.
- When checking or explaining any card, card rule, physical-card identity, deck membership, hero, or hero skill, consult these repository references first:
  - `docs/OFFICIAL_CARD_REFERENCE.md` — official WTK card wording and terminology.
  - `docs/STANDARD_108_DECK_MANIFEST.md` — the complete physical Standard 108-card manifest.
  - `docs/STANDARD_HERO_REFERENCE.md` — the complete Standard hero and skill reference.
- Use the official WTK Standard rulebook and YOKA Games' official English Standard catalogue for unresolved terminology or rule interpretation.
- Do not ship official card artwork without permission.

## Implementation boundaries

- Preserve server authority, private viewer projections, stale/replay safety, semantic response/trigger continuations, exact physical-card conservation, and `currentAction`-driven React controls.
- Keep legality, response order, rescue order, next responder, winner, hidden-card knowledge, and terminal outcomes on the server. The client must not infer them from timeline order, `actionPlayerId`, turn ownership, HP, resolution IDs, or animation state.
- Preserve the existing semantic protocol. New cards and hero abilities must use shared capability/continuation paths and must not add provider-specific HTTP actions or UI routes.
- Keep Quick Test with one human controller switching between human-style seats, normal human multiplayer, and deterministic tests current for implemented gameplay. Bot gameplay is legacy/inactive and is not a product requirement.
- Update relevant source, focused functional tests, and product documentation for the current handover task. Before committing a functional change, update `README.md` and `HANDOVER.md` as required by the current handover.

## Remote validation and delivery

- GitHub Actions is the validation gate. Do not run local full tests, build, lint, or other complete checks as a routine step:
  - `npm test`
  - `npm run test:fast`
  - `npm run test:api`
  - `npm run build`
  - `npm run lint`
  - `git diff --check`
- Commit and push the implementation, focused tests, documentation, and updated handover files together to the branch required by the current remote `HANDOVER.md`.
- In normal mode, do not poll GitHub Actions after pushing; the user will report failures.
- In autonomous UI/Layout mode, follow `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`'s non-blocking CI checkpoint: after pushing, do not wait or poll. Before editing source for the next task, inspect the latest push-triggered Actions run on `ux-v2`. If it has completed with failure, pause new feature work and fix the actual failure; if it is queued/in progress, do not wait—proceed and check again at the following task boundary. A task remains CI-pending until its exact revision's required jobs are confirmed successful; never label an unverified revision green.
- If a CI failure must be investigated, inspect only the relevant failed job and reproduce the smallest necessary issue.
- Never claim CI or production deployment was verified unless it was actually checked.

## Handover and roadmap closeout

Normal mode:
- follow the reviewer-authored HANDOVER instructions.

Autonomous UI/Layout mode:
- keep `HANDOVER.md` short and current: latest task/result plus exactly one next/current bounded task;
- during implementation, update only the compact execution-result/CI state needed for handoff;
- when a task closes or blocks, move durable historical detail into `docs/AUTONOMOUS_UI_ROADMAP.md`;
- replace stale HANDOVER content instead of appending an ever-growing history;
- at each task boundary, define exactly one next bounded task in HANDOVER and inspect the latest push-triggered CI run before its first source edit; a queued/running run does not block progress, while a completed failure must be fixed before new feature edits.

Keep all records truthful: distinguish tests changed from tests actually run, and never claim remote CI success unless it was actually checked.
