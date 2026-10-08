# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.4.10-STARGAZING-DRAG-DROP-01` is implemented locally: the real
server-triggered Stargazing decision now has three ordered zones, deliberate
touch/pointer drag, accessible Move controls, and safe edge auto-scroll. The
real gameplay browser suite passed 4/4 across 320×640, 390×844, 480×900, and
1440×900; the Stargazing API suite passed 8/8; build, targeted ESLint, and
`git diff --check` passed. Fresh real-path screenshots are attached by the
browser test. Before this task commit, Actions run `37754303907` succeeded on
exact remote parent `1a8492e46c84764b6ed12cbf9c0ffc9951ca54ae`. Task commit/CI
status is not yet available. Reviewer acceptance is not claimed.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md`, blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`, including §4.10, §4A–§4D,
§6.12, and §6.21–§6.26. The pre-Section-6 gates are recorded complete; Phase
A/B work is already present, so the next Section-6 task continues with the
first unclosed Phase-C semantic proof.

## Current / next task

`UX2.6-PHASE-C-DUEL-PERSISTENT-ROOT-AUTHORITY-01` — add a typed, viewer-equal
public proof linking the persistent Duel root to each actually submitted
Attack response and the server-owned alternating participant/direction.
Validate against the live Duel continuation and exact public events; preserve
the root identity across handoffs, expose no private response options or
physical card IDs, and fail closed for missing, stale, duplicated, or
mismatched links. Add focused engine/API and projection regressions. This task
is semantic projection only; graph rendering remains a later bounded task.
