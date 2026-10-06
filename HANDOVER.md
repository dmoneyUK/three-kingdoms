# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.27-UX2-FINAL-RESPONSIVE-INTEGRATION-GATE-01` passed 209 tests across 16 focused browser specs plus 37 selected `ui19.spec.mjs` checks (246 distinct cases). Eleven composition geometry cases were rerun; screenshot/geometry attachments cover seven representative scenes. The Group child-Damage spine passed its 10p/390px, 6p/480px, and 6p/1440px checks. Visual inspection found Oath and Bumper Harvest content overlapping the persistent Deck/Discard region, contrary to Design §0.91.4; the final gate remains open pending one bounded fix. These local edits have not received CI. Previous remote SHA `592d2d460aaef2a29b6fac2c36e749f81443080c` Actions run `37501361734` completed success (`build-and-test`, `deploy`). Reviewer acceptance is not claimed.

## Design checkpoint

Remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` was unchanged at the UX2.27 boundary. The active design §§12.0–12.9 and §0.91.4 were reviewed. §0.91.4 requires persistent piles to stay secondary and not overlap the active event card; §§12.6 and 12.9 require the causal composition and responsive gate.

## Current task — UX2.28-ACTIVE-STRATAGEM-PILE-CLEARANCE-01

Keep the public Draw/Discard piles visible but clear of proven Oath and Bumper Harvest Source, root card, participant strip, and public Negation branch at 390px/480px portrait and 1440px wide; include the existing dense ten-player mobile fixtures where supported. Add focused bounding-box non-overlap assertions while preserving causal order, Stage/Dock separation, fixed seats, and server authority. No gameplay or projection changes. Stop and ask only if the approved pile hierarchy cannot be met without an unspecified product decision.
