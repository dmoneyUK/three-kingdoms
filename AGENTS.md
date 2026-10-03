# WTK project execution workflow

## Task authority

- At the start of every task, synchronize the current authorized branch from the remote repository and read the complete remote `HANDOVER.md` before changing files.
- The reviewer-authored task in `HANDOVER.md` is the only project task authority. Understand its objective, scope, acceptance criteria, validation requirements, branch, and handoff instructions before acting.
- Execute only the current handover task. Do not invent a follow-up task, widen the scope, or replace a reviewer requirement with a local preference.
- If the current handover is unclear, malformed, or missing, stop and report that state instead of guessing the next implementation.

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
- Do not poll GitHub Actions, inspect gate status, or stream workflow logs after pushing. The user receives GitHub notifications and will report test failures. Do not claim that CI or production deployment was verified when it was not checked.
- If the user reports a CI failure, inspect only the relevant failed job and reproduce the smallest necessary issue. Do not fetch or print unrelated workflow logs.
- After the required push, verify only the remote handover content if the current handover requires that verification, then stop. Do not begin another task until a new reviewer handover authorizes it.

## Handover closeout

- Append only the current task's execution result to `HANDOVER.md`.
- Record the implementation SHA, changed files, behavior and authority boundaries, focused test updates, known gaps, validation responsibility transferred to GitHub Actions, and the recommended next bounded task.
- Keep the handover truthful: distinguish changed tests from tests actually run, and never report remote CI success unless the user provides that result or explicitly asks for a status check.
