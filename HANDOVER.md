# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.26-LOCAL-EQUIPMENT-SELECTABLE-DETAIL-01` moves a self-targeted authoritative `target_cards` choice inline to the Local Dock only when every unique eligible key matches current public Equipment. Mixed zones and unprojected IDs retain the modal fallback. The existing `trigger` provider/`cardKeys` payload and actionRevision reset remain unchanged. Focused target-card browser spec passed 34/34 at 390px, 480px, and 1440px; targeted ESLint and `git diff --check` passed. Prior remote SHA `b1fb2bb27799188788d1e4cef6a7b526f66b0b8b` Actions run `37499022849` completed success (`build-and-test`, `deploy`). Reviewer acceptance is not claimed.

## Design checkpoint

Remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` was unchanged at the UX2.26 boundary. §§12.4, 12.5, 12.6, 12.8, and 12.9 reviewed. Group/AOE, Oath, and Bumper Harvest compositions are present; the §12.5 Cavalry Skills-band entry is already implemented and browser-covered. The remaining gate is representative end-to-end UX2 review.

## Current task — UX2.27-UX2-FINAL-RESPONSIVE-INTEGRATION-GATE-01

Run the §12.9 representative interaction matrix at 2/4/6/10-player topologies, prioritizing portrait and then wide layouts. Cover the listed REST, Inspect, Preview/ACTIVE, target cardinality, Group/AOE, response, rescue, Judgement, selectable detail, Borrowed Sword, skill, self-target, long-guidance, large-Hand, and viewer-switch paths. Reuse existing focused browser coverage; add or adjust only evidence required to close this gate. Record exact specs, viewport/geometry evidence, and any remaining bounded gap. Do not claim Reviewer acceptance or external device validation.
