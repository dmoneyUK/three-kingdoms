# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-PRIVATE-DRAW-COUNTDOWN-CLUSTER-01` now places the viewer-private
Private Draw countdown in the lower-right `StageSystemCluster`, with compact
numeric-only presentation and an accessible full label. Private title/cards,
privacy text, and event duration are unchanged. The new browser regression and
response-timer regressions passed 5/5; targeted ESLint and `git diff --check`
passed. The task commit has not yet been pushed, so its Actions validation is
pending. Previous relevant run #842 (`37599174130`) succeeded on
`33b9a771003ec60a2e5fb39b0472ebad5e4c39fd`.

## Design checkpoint

Reviewed current remote `docs/UX2-refine.md`, blob
`347db2e2bc8768620eaf69bbd84191a1a79792d3`. §4A requires compact event timers
beside System Menu; Private Draw content-height refinement remains separate.
§1.8 keeps cross-Hero passive choices in the viewer's Local Dock Action Row.

## Current task

`UX2.REFINE-PRIVATE-DRAW-COUNTDOWN-CLUSTER-01` — push the focused timer
relocation and browser regression; verify the exact task SHA succeeds in Actions.
Keep event timing, private content, and overlay height unchanged. Then re-read
the latest design before choosing one next bounded task.
