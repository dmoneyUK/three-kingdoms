# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-RETALIATION-UNIFIED-TARGET-CARD-MODAL-01` was pushed as
`e5e8df1304b89587a5c059008381ea264745b63f`. Its Actions run `37637916120`
completed `success` on that exact SHA, including browser/unit tests, deploy,
and production smoke test. The preceding pre-commit run
`37634607717` passed on exact parent SHA `9607280182e5f21a8d2acd5c03a707cb438906f5`.
Retaliation browser coverage passed 56/56; the existing UI-19 Hero Focus
compatibility test passed 1/1; targeted ESLint and `git diff --check` passed.
Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote design blob remains
`f8d1ff3bd61be6177de0cf562b3cd38dfb83d888`; no revision change since the prior
checkpoint. Re-reviewed §4C.15–§4C.28. §4C.17 defines Frost Sword as an
authoritatively offered 1–2 card selection across anonymous Hand positions and
eligible Equipment; §4C.21 requires key/revision safety and privacy. §5/§6
Hero/player visualization remains deferred.

## Current task

`UX2.REFINE-FROST-SWORD-UNIFIED-TARGET-CARD-MODAL-01` — route only the
proven external-target Frost Sword selection to the shared modal. Keep the
CurrentAction key set and existing trigger payload authoritative; use
rule-facing “Choose 1–2 cards to discard” copy; prove one/two-card and mixed
Hand + Equipment selection, max enforcement, revision safety, modal/Stage/Dock
geometry, touch targets, and no overflow at 390×844, 480×900, and wide. Do not
change server rules or unrelated picker flows. Pre-commit gate currently
satisfied by run `37637916120` on exact parent SHA
`e5e8df1304b89587a5c059008381ea264745b63f`; recheck the latest run for the
remote HEAD immediately before commit.
