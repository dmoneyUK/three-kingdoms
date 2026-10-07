# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result

P4 real production-path parity is implemented. Seven server-backed browser
scenarios cover single-target Negation open/first/counter/settlement, Raining
Arrows with and without Dodge, and private/public Opponent Inspect at 390, 480,
and 1440px. The related browser regression group passed 16/16; the focused
PresentationV2 engine API suite passed 33/33. Build, targeted ESLint, JS syntax
checks, and `git diff --check` passed. Reviewer acceptance is not claimed.

Commit gate observed before P4: remote `a8f0ec65ce86c5cff8c4f8b604e5afad11d82abb`
had no Actions run; latest relevant push run `37681849830` for
`6d1cf013e086cab9b74842761a89ff090f7d7c19` completed success. Per the user's
no-status rule, work may proceed; P4's pushed SHA/status must be recorded after
push.

## Design checkpoint

Reviewed current remote `docs/UX2-refine.md`, blob
`58100b7b1f14d2ff0b1b98e6f79ee1701daa74b4`. The new §4C.29 is compatible with
closed P4 and is a mandatory pre-Section-6 refinement.

## Current task

`UX2.REFINE-MOBILE-TARGET-CARD-MODAL-LAYOUT-4C29-01` — implement §4C.29 as one
responsive modal-layout refinement. Prove real-authority Burning Bridge and
Steal at 390×844, 480×900, and wide: four anonymous Hand positions, selected
state without obscuring neighbors, Hand + Equipment + Judgment, larger-Hand
contained overflow, ≥44px targets, no page overflow, and reachable actions.
Use the approved player-facing name **Burning Bridge** while preserving internal
`Dismantle` protocol identifiers. Section 6 remains gated by §4.10, §4A,
§4C.29, P5, and all other §4D requirements.
