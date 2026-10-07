# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-OTHER-PLAYER-INSPECT-SINGLE-EQUIPMENT-READABILITY-01` is locally
complete: one-card Equipment measures 70×105, 76.8×115.2, and 78×117px at
390×844, 480×900, and 1440×900; multiple cards remain ≤60px. Inspect browser
spec passed 14/14, targeted ESLint and `git diff --check` passed, and screenshots
were inspected. The pre-commit remote base `58392a6fc83799b0865ff90ceee0ec180b97afce`
passed Actions #851 (`37622065260`) on that exact SHA. Reviewer acceptance is
not claimed.

## Design checkpoint

Current remote `docs/UX2-refine.md` blob is
`f8d1ff3bd61be6177de0cf562b3cd38dfb83d888`. Reviewer added §4C (unified Target
Card Selection Modal); its actionable picker remains separate from passive
Inspect. §4B.2–4B.5 and §4B.6's single-card Equipment requirement are
complete; §5 remains deferred until active pre-§5 refinements close. Full
design reviewed at this task boundary; no intervening remote design change.

## Next task

`UX2.REFINE-OTHER-PLAYER-INSPECT-ZONE-CONTENT-HEIGHT-01` — implement only
§4B.7's content-driven public-zone sizing: prevent short Inspect zones (notably
Concealed Hand / compact `None`) from stretching to the height of a taller
adjacent public-card zone in the two-column layout. Prove the one-Judgment-card
plus concealed-Hand case at 1440×900 and verify 390×844 / 480×900 containment,
content-sized zone geometry, compact empty state, and unchanged shell/Menu/
Guidance/Dock relationships. Preserve public-only data and card geometry.
