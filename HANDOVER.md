# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

The Negation counter-chain now renders each server-proven response with a
display-safe counter target, real actor-seat tether, subdued older response,
and root-target restoration only for authoritative `ACTIVE` state. Real
Dismantle → open Negation → Negation → counter-Negation browser proof passed
2/2; Attack → Dodge regression passed 3/3; presentation-client tests passed
55/55; build, targeted ESLint, and `git diff --check` passed. At the commit
boundary, latest Actions run `37750629004` succeeded on `3a9db67561ad2af3866056085bad205c5ffa72eb`; remote HEAD `2de926eb7fef7a994d4cdb3872ec281dea0d1af8` contains only two newer design-document commits and has no newer Actions run. The requested 60-second Bumper Harvest chooser timer is already server-owned and covered by engine/API assertions; no duplicate timer was added. Reviewer acceptance is not claimed.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md`, blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`, through §4.10, §4A, and §6.13–§6.26. The new §4.10 drag-and-drop refinement reopens Stargazing and gates further Section 6 work.

## Current / next task

`UX2.4.10-STARGAZING-DRAG-DROP-01` — replace the approved-away button-grid
Stargazing reorder with three-zone Top / Revealed / Bottom drag-and-drop.
Support pointer/touch with deliberate hold-to-drag, keyboard-accessible
fallback, clear insertion/reorder state, and unclipped drag previews; preserve
the existing `topCardIds` / `bottomCardIds` API and exact visible ordering.
Prove the real server-backed Zhuge Liang path, privacy, stale/rejected submit
safety, responsive geometry, and submitted/deck order. No gameplay or protocol
change; do not resume Section 6 until this refinement closes.
