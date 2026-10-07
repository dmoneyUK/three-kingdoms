# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-DISMANTLE-STEAL-UNIFIED-TARGET-CARD-MODAL-01` was pushed as
`792d687901b1a2d85d5bd0145fbd0582d70386f4`. Its focused target-card browser
spec passed 67/67; targeted ESLint and `git diff --check` passed. The preceding
exact-HEAD run `37644841686` failed only at `npm test`: two stale Dismantle/Steal
assertions expected the superseded Hero Focus composition. Lint, build, and
browser steps passed. The test-only assertion repair passes local `npm test`
(exit 0), targeted ESLint, and `git diff --check`. CI REPAIR PUSHED —
VALIDATION PENDING. Do not resume feature delivery until that exact repair SHA
is green.
Reviewer acceptance is not claimed. Deferred design gap: active Bumper Harvest
choice has no authoritative deadline in the current projection
(`countdownUntil` comes only from completion), so do not synthesize a chooser
timer.

## Design checkpoint

Latest complete remote design review: `docs/UX2-refine.md` blob
`f8d1ff3bd61be6177de0cf562b3cd38dfb83d888` (unchanged), fully re-read at the
task boundary. §1.5/§1.8 require Guan Yu and Zhao Yun conversion responses to
remain activated in the Hero Skills band without duplicate generic actions.
§5 still defers the Hero/player graph until active pre-§5 refinements close.

## Current task

`UX2.REFINE-HERO-CONVERSION-RESPONSE-SKILLS-BAND-01` — add focused browser
proof that Guan Yu `God of War` and Zhao Yun `Braveheart` activate the existing
authoritative conversion-response providers from the Skills band. Cover red
card→Attack, Dodge→Attack, and Attack→Dodge; assert only CurrentAction-eligible
cards, exact existing `respond` provider/card payloads, no duplicate generic
provider control, and unavailable state when the provider is absent. Do not
change rules, provider semantics, public projection, or deferred Hero/player
Stage geometry. At the next commit boundary, inspect the latest actual job for
the current remote HEAD; do not wait for this task's own CI after pushing.
