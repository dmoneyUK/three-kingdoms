# Three Kingdoms project instructions

- After every functional change or bug fix, update both `README.md` (current stage, roadmap, and next milestone) and `HANDOVER.md` (implemented state, recent work, known boundaries, and recommended next work) before committing.
- Keep the Quick Test opening hand, human multiplayer flows, and deterministic tests current for every implemented card. Quick Test is one human controller switching between human-style seats; bot gameplay is legacy/inactive and is not a product requirement.
- The active ruleset is WTK Standard only. Do not add Endless Legends or Kingdom Wars cards to new games unless the owner explicitly changes this priority.
- Use `docs/OFFICIAL_CARD_REFERENCE.md`, the official WTK Standard rulebook and YOKA Games' official English catalogue filtered to Standard as the terminology and rule source. Do not ship official card artwork without permission.
- Before release, rely on the remote GitHub Actions validation described below unless the user explicitly requests local validation or a remote failure requires local reproduction.
- Unless the user requests local-only work, push the validated commit to GitHub `main`. The GitHub Actions workflow is the only production release path: it validates the commit, applies Cloudflare D1 migrations and deploys the Cloudflare Worker. Do not push or deploy to ChatGPT Sites.

## Remote CI-first project workflow

- After implementing the requested change and updating the required project docs, commit and push to the current authorized remote branch. For the current UX work, follow `HANDOVER.md` for the branch and remote handoff rules; do not push to a different branch merely to run validation.
- GitHub Actions is the default validation gate. Do not run the full local `npm test`, `npm run test:fast`, `npm run test:api`, `npm run build`, or `npm run lint` suite as a routine step before pushing. This saves local time and agent context because `.github/workflows/deploy.yml` runs lint, build, fast tests, API/D1 tests, and (for pushes) deployment smoke tests remotely.
- Do not poll GitHub Actions, inspect gate-job status, or stream workflow logs after a successful push unless the user explicitly asks for CI/deployment status or reports a failure notification. The user receives GitHub notifications; in the normal workflow, hand off after the push and treat the absence of a failure notification as the user's accepted completion signal. Do not claim that CI or production deployment was independently verified when it was not checked.
- If the user asks for status, or a failure notification/error is provided, inspect only the relevant run/job and fetch logs only for the failed job. Do not dump complete workflow logs when a final status or concise failure summary is sufficient.
- Local focused tests, build, lint, or `git diff --check` are allowed when they are the smallest useful reproduction for a known issue, when a task explicitly requires local evidence, or when the user asks for them. They are not a default gate that blocks the remote handoff.

## Completed architecture invariants

The semantic response/trigger architecture milestone is complete. Preserve these boundaries as invariants while implementing new cards or hero abilities. Normal product play is human multiplayer plus Quick Test with one human controller switching between human-style seats. Any remaining bot implementation is legacy/inactive code and is not part of the active product contract.

The completed architecture guarantees, covered by deterministic tests and the isolated synthetic-provider Worker/D1 proofs, are:

- canonical Negation scheduling discovers every legal `negate` provider, preserves deterministic order, toggles parity correctly, and opens counter-windows correctly;
- secondary Judgement returns one semantic satisfied/unsatisfied result and uses the same response-continuation boundary for Attack, Group, Duel, and Negation;
- all secondary-response prerequisites are validated before claiming the room, or every post-claim path performs a deterministic recovery transition;
- human seats use one semantic trigger continuation executor for `attack_dodged_event` and `damage_about_to_apply_event`;
- exhausted damage reactions apply the original damage exactly once and enter Dying/rescue when required;
- required end-to-end regressions cover Negation ordering/parity, Judgement success/failure, trigger exhaustion, and human-seat guarantees across ordinary responses and trigger chains: authoritative actor ownership, correct perspective switching, private hand/provider projection, wrong-seat rejection, stable resolution identity, and stale/double-submission safety;
- synthetic test providers are explicitly registered only in the test Worker and are absent from production registries;
- the semantic protocol is the only supported gameplay protocol; currentAction is the authoritative client decision contract and future cards/heroes must not add concrete provider-specific HTTP actions.

For `attack_targeted`, preserve the established invariant: discover providers semantically from authoritative live state; allow the established source- or target-owned actor; project private choices only to that actor; exhaust resolved effects deterministically; resume the original Attack exactly once; and do not add provider-specific route or UI actions.

For each implementation round, keep these invariants visible in the task notes, hand off validation to remote GitHub Actions by default, and update `README.md` and `HANDOVER.md` to match the actual state. If a future change regresses an invariant, explicitly say the milestone is incomplete rather than claiming completion. Only report local validation counts when those checks were actually run.
