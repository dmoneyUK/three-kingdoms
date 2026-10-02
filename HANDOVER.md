# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX13 implementation is **CODE-ACCEPTED / EXECUTION REPORT INCOMPLETE**.

Reviewed implementation commit: `37cc4b595ebd6c83c4325a662239b4f1bd04cbc1`.

The same-card Lightning correction is structurally correct: one `transfer-persistent` card transfers Alice -> Bob, Alice's activation settles, Bob later activates that same persisted card with fresh interaction/frame IDs and no parent frame, repeated reads preserve the new identity, and final zone checks prevent duplication. Documentation correctly keeps historical `originRef` PARTIAL and `causalResume.parent` runtime UNPROVEN.

The Agent did not append the required FIX13 execution report, so exact focused/full validation results are missing. Do not start C3 yet.

---

# NEXT TASK — UX2.0C2-FIX13-VERIFY

## Objective

Validate commit `37cc4b595ebd6c83c4325a662239b4f1bd04cbc1` and append the missing execution report. This is verification-only unless validation exposes a real defect.

## Required work

1. Work only on `ux-v2`; fetch, checkout, fast-forward pull, confirm the reviewed commit is in ancestry, and keep `main` untouched.
2. Search `tests/api/stratagems.test.mjs` for `transfer-first`, `transfer-later`, and `transfer-persistent`. Confirm the FIX13 fixture uses one persistent Lightning, does not substitute another Lightning after transfer, does not replace Bob's transferred Judgement card after transfer, and later activation references `transfer-persistent`.
3. Search `causalResume` across app/game/tests/docs/README. Report whether production constructs `kind: "parent"`. Expected: only root is constructed; parent remains reserved/runtime UNPROVEN. Do not invent a synthetic path.
4. Run the corrected same-card Lightning test and focused tests for Judgement Negation/counter-Negation, delayed placement -> activation, no-responder Judgement, Judgement replacement stale/duplicate race, and Stauchness Damage-parent resume. Report exact commands/counts.
5. Run `npm run test:fast`, `npm run test:api`, `npm run build`, `npm run lint`, and `git diff --check`. Report exact counts/status.
6. If all pass, do not change production code. If FIX13 caused a failure, make only the smallest correction and rerun all validation.
7. Append an execution result to this HANDOVER containing: branch, reviewed SHA, any verification-fix SHA, same-card audit, causalResume audit, focused validation, full validation, and remaining C2 work.
8. Include a final matrix for: same card persists A->B; A settles before B; B activates same card; B gets fresh interaction/frame; no parent frame; repeated read stable; second lifecycle no duplicate; historical originRef; synchronous Judgement-Negation parent runtime evidence. Use only PROVEN/PARTIAL/UNPROVEN/NOT IMPLEMENTED IN GAME.
9. Push the appended result to `origin/ux-v2` and STOP.

## Acceptance

Close FIX13 only if the same-card audit and all required validation pass, exact results are appended, originRef remains honest, unused parent-resume is not overclaimed, and no C3/UI work begins.

## Scope exclusions

Do not start C3, redesign Lightning/Judgement, implement originRef, solve Group nested Damage, solve Dying presentation barrier, migrate PresentationV2, or modify React/CSS.
