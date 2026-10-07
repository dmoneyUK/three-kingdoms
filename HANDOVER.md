# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

§4.10 real server-backed Stargazing now keeps four private card faces visible,
readable, and reorderable after the generic animation at 390×844, 480×900,
320×640, and 1440×900. The focused browser group passed 6/6, including the
server action payload, observer privacy, revision invalidation, keyboard focus
cycling, pointer blocking, and fixed-modal/Dock geometry. Build, targeted
ESLint, syntax, and `git diff --check` passed; Reviewer acceptance is not
claimed.

Before this task commit, `9982aa426209848007734d1cbdb6661974958019` had Actions
run `37695874026` completed successfully on that exact SHA. New-SHA validation
will be checked before the next commit and recorded after push.

## Design checkpoint

Reviewed the complete current remote `docs/UX2-refine.md`, blob
`58100b7b1f14d2ff0b1b98e6f79ee1701daa74b4`.

## Current task

`UX2.REFINE-TRANSIENT-EVENT-TIMERS-4A-01` — complete §4A's compact, consistent
lower-right timer and content-driven transient-event presentation for Private
Draw and Bumper Harvest. Preserve event/gameplay timing and privacy; use only
server-authoritative deadlines, and do not invent a chooser timeout. Prove the
390×844, 480×900, and wide states, threshold/no-placeholder behavior, event
content spacing, timer/menu and Guidance geometry stability, Dock/table
containment, and Private Draw viewer privacy. Section 6 remains gated by §4A,
P5, and all other §4D prerequisites.
