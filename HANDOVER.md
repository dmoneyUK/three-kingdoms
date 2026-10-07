# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

P4 real server-to-browser parity remains covered for Negation, Raining Arrows,
and public/private Inspect. §4C.29 now refines the real Burning Bridge/Steal
modal: compact anonymous Hand positions, readable public zones, stable selected
state, contained large-Hand scrolling, and approved Burning Bridge copy.
Focused target-card browser group: 89/89; Inspect geometry: 3/3; fast tests:
229/229; build, targeted ESLint, syntax checks, and `git diff --check` passed.
Reviewer acceptance is not claimed.

Before this combined task/CI-repair commit, latest remote head is
`b12d65132a3c4adbaad9b68ebc7c52c39c2d39bb`; Actions run `37692998531` failed:
the REST-settlement assertion expected obsolete filtering, and two Inspect
mobile geometry cases exposed a narrow public-zone row. Focused fixes are in
this commit. New-SHA Actions validation is pending after push.

## Design checkpoint

Reviewed the complete current remote `docs/UX2-refine.md`, blob
`58100b7b1f14d2ff0b1b98e6f79ee1701daa74b4`.

## Current task

`UX2.REFINE-STARGAZING-DECK-REORDER-4.10-01` — complete the single §4.10
private Stargazing reorder refinement on the production rendering path. Prove
four persistent/readable cards after the normal animation, compact top/bottom
sequences and truthful ordering, reorder/transfer behavior, 390×844, 480×900,
320px-class and wide layouts, reachable completion, revision invalidation, and
observer privacy. Section 6 remains gated by §4A, P5, and all §4D prerequisites.
