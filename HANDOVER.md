# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms`
Target branch: `ux-v2`
Worktree branch: `codex/quick-test-negation-duel`
Latest design reviewed: `docs/UX2-refine.md` §10.25.3, F1-R6C and F1-R6D.

## Latest result — NEG-COPY-1 F1-R6C

**IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW.** Source `e88cce82c9e4d106cfce42e16f4b455530c0d8c5`, with CI test-contract correction `449279deded117501bb15bc8b0d1e33a61446ad9`, passed exact-SHA [Actions 41034693344](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41034693344). Worker `d964660a-15fa-4a58-b12a-6575ccd76e18` deployed; production `/api/health` returned HTTP 200. NEG-COPY-1 remains OWNER NOT ACCEPTED until real-iPhone review.

## Current task — NEG-COPY-1 F1-R6D (IN PROGRESS)

**2026-10-30 09:40 UTC:** Fetched `origin/ux-v2` at `449279de`, reread §10.25.3 and recorded R6C delivery. Investigate the documented 440×766 PAC/H4/card collision and Inspector-related regrouping using the existing placement paths. Permit PAC above parked thumbnails and keep it centered where protected obstacles allow. Preserve H4, real CardFaces, Seat/Inspector behavior and game authority. Local UI/browser testing is capped at five minutes; record the actual evidence and any limitation. Then run focused checks, push the bounded change, and verify exact-SHA CI and Worker deployment. No owner acceptance is implied.

**2026-10-30 09:40 UTC:** The documentation handoff's first `git diff --check` caught three Markdown trailing spaces; removed them before committing.

**2026-10-30 09:42 UTC:** One existing 440×766 real-gameplay browser case failed because PAC was hidden during the fourth Duel Attack reveal. Captured geometry: table 440×472.9, PAC 424×67, active CardFace `175,241–265,376`, H4 `108,186–332,234`, timer `359,428–423,468`, and two parked miniatures `14,400–62,472` and `68,400–116,472`. The placement trace counted both actual and projected parked minis as obstacles; current code also lacks an upper safe-band fallback. Inspector-linked regrouping has not yet been reproduced. Browser budget used approximately 30 seconds of five minutes.

**2026-10-30 09:46 UTC:** Updated the shared PAC placement to ignore only measured parked thumbnails and their thumbnail destinations, prefer a centered safe candidate, and search an upper safe band when the lower band has no legal slot. Added a scoped stacking rule so PAC paints above parked miniatures while Inspector stays above PAC. Build, scoped lint and `git diff --check` passed. The existing 440×766 case has been updated for the approved overlap policy and an Inspector continuity check; run it once within the remaining browser budget.

**2026-10-30 09:47 UTC:** The 440×766 rerun placed PAC at horizontal offset 0 with no protected collision; the test then failed only because its old Card Details assertion required PAC to remain visible. Measured Card Details `50,207–390,357`, H4 `108,107–332,155`, active card `175,241–265,376`, timer `359,428–423,468`, and 424×67 PAC leave no legal 2px-clearance slot. Updated that assertion to accept the documented fail-closed state only when the placement trace confirms Card Details blocked all candidates. Added the requested Inspector and post-damage checks to this same focused case. Browser budget used approximately 60 seconds of five minutes.

**2026-10-30 09:50 UTC:** Real Duel review found that its committed root event ID was not carried into sourced damage; the deployed R6C cannot prove that scenario yet. Correcting the existing server continuation to carry the original committed event ID, with no rule change, before the R6D focused check.

**2026-10-30 09:55 UTC:** Build, scoped ESLint and `git diff --check` passed. The existing 440×766 browser scenario passed in 30.4 seconds, including centered PAC, protected obstacles, Inspector stability and Duel damage announcement; total local browser time approximately 90 seconds. Latest completed CI before submission was green (41034693344); source correction and R6D are ready for exact-SHA CI.
