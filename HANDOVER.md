# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Phase B renders the committed Dodge from typed public proof beside its exact
Attack target effect; the incoming relation is interrupted and no Dodge-to-target
arrow is drawn. Real server-backed browser proof passed 13/13 across 4/6/8-player
physical-anchor layouts, Attack→Dodge at 390×844, 480×900, and 1440×900, and
self-target Peach layouts. PresentationV2 contract tests passed 38/38; targeted
ESLint and `git diff --check` passed. Pre-commit remote parent
`80ae488d4520d763e9c5383a35b588b846c7e4e6`, Actions run `37742834438`, was
observed `success`; this local change has not yet been pushed. Reviewer
acceptance is not claimed.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md`, blob
`516fc7d673b0dfcc7e1e01ba8572cd97cdcf6784`, through §6.26. No newer revision.

## Current / next task

`UX2.6-PHASE-B-NEGATION-EXACT-PUBLIC-EVENT-PROOF-01` — extend the existing
server-owned single-target Negation chain proof to link the root action and each
submitted Negation to its exact public timeline event, preserving causal parent
links and exposing no physical card IDs or private controls. Prove a real
Steal→Negation→counter-Negation route for source, responders, and observer;
missing or mismatched event links must fail closed. Do not change graph rendering
in this task.
