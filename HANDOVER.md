# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

- Stage A ordinary Attack / Dodge was confirmed complete by the user on 2026-10-12. No design-document change was made.
- Test mode adds the Standard-safe Duel / Attack / Negation preset and manual VIEW controls on each Hero card. Commit `b762aa0e1e97080d9016daee8f8769640991b7d0`; focused API 24/24 and real-server browser 1/1 passed; at 1280×720 each control measured 42×28 px.
- B1 implementation `b5c94b7fbb8cc6433df5ac0264cbf77279c9a288` retains one authenticated Duel root across four genuine Attack responses, with viewer-relative ownership and orthogonal paths. At 390×844 the root remains `(104.75,197.14)`; current cards are 54×81, prior cards 45.89×68.84 (85%), and fork points are `(68.5,248.8)` / `(232.8,413.6)`. Focused evidence: build; API 40/40; presentation proof 1/1; Duel geometry 5/5; real server-backed Duel/Attack→Dodge 2/2; legacy Duel/delegated-response 5/5. Ignored live screenshots/JSON are under `tests/browser/test-results/browser/duel-long-chain-test-mode--812c9-roof-backed-two-round-graph/` and `tests/browser/test-results/browser/duel-long-chain-test-mode--177fc-tes-at-four-viewport-widths/`; four viewer projections matched and no hidden-hand identity leaked.
- B1's first push run `38336357669` exposed five unused identifiers in lint; its API and browser smoke jobs passed, and deploy was skipped. Lint-only repair `76c0db5068fc6890e3af3db7935576fbdfaadb83` is pushed. Exact-SHA run [`38336678712`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38336678712) passed lint/fast, API, browser smoke, D1 migrations, Worker deploy, and production smoke. This is the observed deployment state.

## Design checkpoint

Reviewed `docs/UX2-refine.md` blob `6b9ad6ab83e8e64c185b3fdeed4ca03f40310ccb`. §6.38 records the user's Stage A completion. §6.39 defines B1's stable Duel root, server-proven Attack responses, seat-relative halves, orthogonal elbow/fork paths, bright current round and intact subdued prior round. No design-document edit was made.

## Current task — `UX2-6.34-B1-DUEL-LONG-CHAIN-01` (awaiting user visual acceptance)

Implementation and required evidence are complete for the §6.39.5 Duel long-chain and ordinary Attack/Dodge balance scope. The stop condition is the user's visual review of the real server-backed screenshots and geometry artifacts above. Do not start B2 Negation, Stage C/AOE, Hero layouts, or other refinement tasks until the user accepts or gives new direction.
