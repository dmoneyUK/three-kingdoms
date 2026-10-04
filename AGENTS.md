# WTK project execution workflow

## Mode selection and autonomous UI/Layout shortcut

The normal reviewer-authored single-task workflow remains the default for ordinary coding-agent work.

Autonomous UI/Layout mode is active when the user either:

- explicitly says `AUTONOMOUS UI RUN: ACTIVE`; or
- explicitly tells the Agent to read/follow `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` and continue the autonomous UI work.

When autonomous mode is active, use this startup order:

1. synchronize `ux-v2` from `origin`;
2. read `AGENTS.md`;
3. read `docs/AUTONOMOUS_UI_STATUS.md`;
4. read `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`;
5. read only the design sections cited by the current status/task;
6. inspect only the source/tests relevant to the current task;
7. consult historical `HANDOVER.md` selectively only when older evidence is actually needed.

**Do not read the complete `HANDOVER.md` by default in autonomous mode.**

Historical HANDOVER lookup is appropriate only when an older accepted contract, exact prior measurement, previous SHA/CI result, regression history, or explicit human-review reconstruction is needed.

While autonomous mode is active, the autonomous workflow may:

- derive the next bounded UI/Layout task from the approved design after the previous task is complete;
- continue through multiple bounded tasks;
- wait for and inspect GitHub Actions for its own pushed revision;
- fix real CI failures before continuing;
- keep current/in-progress state in `docs/AUTONOMOUS_UI_STATUS.md`;
- append only one compact archival record to `HANDOVER.md` when a task closes or blocks.

Everything else in this file remains in force, especially server/gameplay authority, privacy boundaries, fail-closed semantics, WTK Standard references, no unrelated scope widening, and truthful validation reporting.

Autonomous mode does **not** authorize new product/game semantics. If approved design or authoritative data is insufficient, follow the workflow's `BLOCKED — HUMAN REVIEW REQUIRED` rule.

## Normal-mode task authority

These rules apply when autonomous UI/Layout mode is **not** active.

- At the start of every normal task, synchronize the current authorized branch from the remote repository and read the complete remote `HANDOVER.md` before changing files.
- The reviewer-authored task in `HANDOVER.md` is the normal-mode project task authority. Understand its objective, scope, acceptance criteria, validation requirements, branch, and handoff instructions before acting.
- Execute only the current handover task. Do not invent a follow-up task, widen the scope, or replace a reviewer requirement with a local preference.
- If the current handover is unclear, malformed, or missing, stop and report that state instead of guessing the next implementation.

In autonomous UI/Layout mode, current task authority comes from `docs/AUTONOMOUS_UI_STATUS.md` plus `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; historical `HANDOVER.md` is an audit ledger, not the default current-state source.

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
- In autonomous UI/Layout mode, follow `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`: the Agent may wait for and inspect the CI run for its own exact revision, fix relevant failures, and continue only after green.
- If a CI failure must be investigated, inspect only the relevant failed job and reproduce the smallest necessary issue.
- Never claim CI or production deployment was verified unless it was actually checked.

## Handover and status closeout

Normal mode:
- follow the reviewer-authored HANDOVER instructions and append the current task execution result as required.

Autonomous UI/Layout mode:
- maintain current/in-progress task state in `docs/AUTONOMOUS_UI_STATUS.md`;
- do not continuously narrate planning, CI-pending state, and retries into HANDOVER;
- when a task becomes `COMPLETED BY AGENT — CI GREEN` or `BLOCKED — HUMAN REVIEW REQUIRED`, append one compact archival entry to `HANDOVER.md`;
- then refresh `docs/AUTONOMOUS_UI_STATUS.md` in place with the new current state.

Keep all records truthful: distinguish tests changed from tests actually run, and never claim remote CI success unless it was actually checked.
