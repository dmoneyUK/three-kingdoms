# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-GENERIC-HERO-RESPONSE-SKILLS-BAND-01` adds browser proof for Cao Cao
Entourage, Liu Bei Influencing, and Zhen Ji Empress Dowager; the focused spec
passed 9/9 at 390×844 and 1440×900, targeted ESLint and `git diff --check`
passed. Pre-commit remote HEAD `67827c9da7e31ad36edc832596f4f2070fdf8a99` had
no workflow runs or status checks, treated as success per Reviewer instruction.
Earlier run `37644841686` failed only on stale Dismantle/Steal assertions and was
repaired test-only in `c3d8f16`. No production/gameplay behavior changed;
Reviewer acceptance is not claimed. Deferred: Bumper Harvest's active choice
has no authoritative deadline in the current projection; do not synthesize a
chooser timer.

## Design checkpoint

Latest complete remote design review: `docs/UX2-refine.md` blob
`f8d1ff3bd61be6177de0cf562b3cd38dfb83d888` (unchanged). §1.5/§1.8 require
voluntary Hero skills to activate only from Skills band; §1.10 requires
CurrentAction-gated behavior across the implemented roster. §1.5 names Huang
Gai Self Sacrifice as an activation example. §5 still defers the Hero/player
graph until active pre-§5 refinements close.

## Current task

`UX2.REFINE-HUANG-GAI-SELF-SACRIFICE-SKILLS-BAND-01` — connect Huang Gai's
existing authoritative `huang_gai_kurou` CurrentAction option to the Skills-band
`Self Sacrifice` button. Prove enabled only when offered, disabled when absent,
no duplicate generic Action Row activation, and exact existing
`trigger` provider payload at mobile and wide viewports. Do not change HP/draw
rules, provider semantics, or server projection. At the next commit boundary,
inspect the latest actual job for the remote HEAD; per Reviewer instruction,
empty CI status is success and this task's own CI need not be awaited.
