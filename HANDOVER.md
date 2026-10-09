# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-ATTACK-MOBILE-GEOMETRY-REMEASURE-01` is implemented locally.
The real mobile Attack graph now remeasures on window and visual-viewport
resize/scroll and observes responsive root/response card dimensions. Both
attacker and defender retain the same server-proven root across 390×844 and
480×900 viewport changes; graph endpoints remain within 2.1 CSS px when
geometry is ready. At 390×724 the solver explicitly fails closed with
`geometry-unavailable`; restoring 390×844 restores the same graph, while
480×780 remains graph-ready. No duplicate Stage or horizontal overflow was
observed. The page has no natural document-scroll range at these sizes, so no
artificial overflow was introduced; real-device/address-bar validation is
not claimed.

Focused browser runs passed: mobile viewport remeasurement 1/1 (25.9s) and
10 independently seeded Attack windows 1/1 (2.0m). `npm run build`, targeted
ESLint, `node --check`, and `git diff --check` passed. Pre-commit Actions run
`37879295636` for exact parent SHA
`224915c6c6e9d139ac66e5628fe033740ede11f9` completed successfully. This
task's outgoing Actions status is pending after push. Reviewer acceptance is
not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`; unchanged from the prior
checkpoint. Reviewed §6.27.1–§6.27.4 at this boundary.

## Next task

`UX2.6-PHASE-D-ATTACK-RESPONSE-TIMEOUT-CLEANUP-01` — prove the real
server-owned ordinary Attack response deadline can expire through the existing
timer-advance path, publishes the exact damage settlement for the same proven
root, and clears the public root graph without a stale card or duplicate Stage.
Preserve the existing timer duration, CurrentAction authority, and public
privacy. Add focused server-backed regression proof; do not add gameplay rules
or a test-only production route.
