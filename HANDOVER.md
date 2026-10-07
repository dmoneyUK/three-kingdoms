# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result

`UX2.REFINE-RETALIATION-OPAQUE-HAND-POSITIONS-01` now projects authoritative
`hand:0...hand:N-1` choices for Sima Yi Retaliation. Selection obtains the exact
live card at that position; stale positions fail closed. Hidden identity stays
private, and legacy grouped `hand` submissions remain compatible.

Focused validation passed: response-capability unit 1/1; Judgement API 12/12;
Yue Jin API 4/4; Retaliation browser 10/10 across 390×844, 480×900, and
1440×900; build; targeted ESLint; and `git diff --check`. The pre-commit base
`1a12e56704edbb774077b4badb4b7d9edc057cac` Actions run `37659752814` completed
success for all jobs. The new task commit's CI has not been checked in this
handoff. Reviewer acceptance is not claimed.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md`, blob `f8d1ff3bd61be6177de0cf562b3cd38dfb83d888`
(design commit `01e436d3a975ade7f16af41c0648153e793912e4`), including §§1.5,
1.10, 4C, and 5. Retaliation now follows §4C's opaque per-position design;
grouped-Hand fallback remains when only grouped authority is supplied. §5
Interaction-Stage Hero/player graph work remains deferred.

## Current task

`UX2.REFINE-LADY-GAN-SKILLS-BAND-ACTIVATION-01` — connect Lady Gan's existing
Divine Wisdom and Prudence CurrentAction options to the single Hero Skills-band
activation surface required by §§1.5 and 1.10.

Scope: add only the two existing provider mappings and focused browser proof
for authoritative activation, exact existing trigger payloads/target selection,
no duplicate Action Row activation, and disabled state when the option is
absent. Cover 390×844 and wide. Do not change gameplay rules or server
projection. Stop after this bounded slice and refresh the handoff at its next
planning boundary.
