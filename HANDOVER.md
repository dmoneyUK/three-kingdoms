# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-HERO-CONVERSION-RESPONSE-SKILLS-BAND-01` adds focused browser proof
for Guan Yu Wusheng and Zhao Yun Longdan responses; the spec passed 8/8 at
390×844 and 1440×900, targeted ESLint and `git diff --check` passed. No
production or gameplay behavior changed. Its pre-commit remote HEAD was CI
repair `c3d8f160c291189226e0dbda506790bcfa4b1a7e`; GitHub returned no workflow
runs or status checks for that SHA, treated as success per Reviewer instruction.
The preceding exact-HEAD run `37644841686` on `792d687` failed only at `npm test`
because two Dismantle/Steal assertions were stale; test-only repair was pushed
in `c3d8f16`. Reviewer acceptance is not claimed.
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

`UX2.REFINE-GENERIC-HERO-RESPONSE-SKILLS-BAND-01` — add focused browser proof
for the existing generic mapped response path: Cao Cao Entourage, Liu Bei
Influencing, and Zhen Ji Empress Dowager. Prove Skills-band activation only when
CurrentAction exposes the mapped provider, no duplicate generic Action Row
activation, preserved provider/card or delegation flow, and disabled state when
authority is absent. Do not change provider IDs, legality, rules, or projection;
stop if proof requires server/gameplay changes. At the next commit boundary,
inspect the latest actual job for the remote HEAD; per Reviewer instruction, an
empty CI status is success, and this task's own CI need not be awaited.
