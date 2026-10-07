# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-HUANG-GAI-SELF-SACRIFICE-SKILLS-BAND-01` maps the existing
`huang_gai_kurou` CurrentAction capability to the Local Skills button. Its
focused browser spec passed 3/3 at 390×844 and 1440×900, targeted ESLint and
`git diff --check` passed. Pre-commit remote HEAD
`794ac2993b871d52de11eae84c2c837cdabc0b94` completed GitHub Actions run
`37649255906` successfully (API tests, both browser shards, lint/fast tests,
and deploy). No rules/server behavior changed; Reviewer acceptance is not
claimed. Deferred: Bumper Harvest's active choice has no authoritative deadline
in the current projection; do not synthesize a chooser timer.

## Design checkpoint

Latest complete remote design review: `docs/UX2-refine.md` blob
`f8d1ff3bd61be6177de0cf562b3cd38dfb83d888` (unchanged). §1.5/§1.8 require
voluntary Hero skills to activate only from Skills band; §1.10 requires
CurrentAction-gated behavior across the implemented roster. §1.5 names Huang
Gai Self Sacrifice as an activation example. §5 still defers the Hero/player
graph until active pre-§5 refinements close.

## Current task

`UX2.REFINE-SIMA-YI-NECROMANCY-SKILLS-BAND-01` — prove the existing
`sima_yi_guicai` CurrentAction option activates Necromancy from the Skills band.
At 390×844 and wide, verify only the projected private Hand card is selectable,
no duplicate generic Action Row activation appears, and Confirm submits the
existing `trigger` provider/cardIds payload; absent authority stays disabled.
Do not alter Judgement rules, provider semantics, or server projection. At the
next commit boundary, inspect the latest actual job for the remote HEAD; per
Reviewer instruction, empty CI status is success and this task's own CI need
not be awaited.
