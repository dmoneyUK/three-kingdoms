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

---

## C2-FIX13-VERIFY execution result — 2026-10-02

Branch: `ux-v2`
Reviewed commit: `37cc4b595ebd6c83c4325a662239b4f1bd04cbc1`
Verification-fix commit: none; the reviewed implementation required no code correction.
Files changed: `HANDOVER.md` only

### Same-card audit

The reviewed FIX13 fixture contains one Lightning creation, `transfer-persistent`, at `tests/api/stratagems.test.mjs:876`. The audit command:

```
rg "transfer-first|transfer-later|transfer-persistent" tests/api/stratagems.test.mjs
```

returns only that `transfer-persistent` creation. There is no `transfer-first`, no `transfer-later`, no second Lightning creation, no `setJudgement(bobPlayer.id, ...)` after transfer, and no SQL replacement of Bob's `judgement_json` after transfer. The later timeline assertion also references `persistentLightning.id`.

### causalResume audit

The command:

```
rg "causalResume|kind: \"parent\"|kind: \"root\"" app game tests docs README.md
```

finds production construction only at `app/api/rooms/route.ts:2005` with `causalResume: { kind: "root" }`. The `kind: "parent"` branch remains typed and defensively handled, but no production path constructs it. Synchronous Judgement-Negation parent restore therefore remains runtime UNPROVEN and was not synthesized in a test.

### Focused validation

Command:

```
GAME_TEST_FILES=tests/api/stratagems.test.mjs,tests/api/judgement.test.mjs,tests/api/presentation-v2-engine.test.mjs GAME_TEST_PORT=3140 GAME_TEST_URL=http://localhost:3140 GAME_TEST_INSPECTOR_PORT=9240 node tests/run-tests.mjs
```

Result: PASS, 51/51. This includes the corrected same-card Lightning test, delayed Judgement Negation/counter-Negation, delayed placement -> activation, no-responder Judgement, stale/duplicate Judgement replacement, and Stauchness Damage-parent coverage.

### Full validation

- `npm run build` — PASS
- `npm run test:fast` — PASS, 108/108
- `npm run test:api` — PASS, 234/234
- `npm run lint` — PASS
- `git diff --check` — PASS

### Exact FIX13 matrix

| Requirement | Status | Exact evidence | Remaining gap |
| --- | --- | --- | --- |
| exact transferred Lightning card persists A -> B | PROVEN | one `transfer-persistent` creation and immediate exact-ID/kind post-transfer assertions | none for this fixture |
| A activation Interaction settles before B activation | PROVEN | transfer response asserts `causalEnvelope === null` before Bob's later draw | no historical origin link |
| B activates the same transferred physical card | PROVEN | later timeline activation references the persistent card ID | none |
| B activation gets fresh interactionId/frameId | PROVEN | later root IDs differ from A's captured IDs | none |
| B activation has no parent frame from A | PROVEN | B root asserts `parentFrameId === null` | none |
| repeated read preserves B activation identity | PROVEN | repeated Bob read matches interaction and active-frame IDs | no browser reconnect harness |
| second activation settles without duplicating the card | PROVEN | real decline settles the envelope and the DB zone audit counts the card once | no broader card-family matrix |
| historical delayed originRef | PARTIAL | fresh B origin is proven without reusing A's parent | no typed historical `originRef` persistence |
| synchronous Judgement-Negation parent restore runtime evidence | UNPROVEN | only root construction exists in production | requires a real production parent entry |

### Remaining C2 work

FIX13 is now execution-verified. C2 remains partial for historical delayed `originRef` persistence, runtime synchronous Judgement-Negation parent construction, broader automatic-transition envelope coverage, Group-nested/independent Damage child wiring, and the Dying/presentation barrier. C3, React, CSS, and unrelated causal changes remain out of scope.
