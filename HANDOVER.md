# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

- Stage A ordinary Attack / Dodge was confirmed complete by the user on 2026-10-12. No design-document change was made.
- Test mode adds a Standard-safe Duel / Attack / Negation preset and manual VIEW controls on every in-game Hero card. Commit `b762aa0e1e97080d9016daee8f8769640991b7d0`; focused API 24/24 and real-server browser 1/1 passed. At 1280×720 all four controls measured 42×28 px, inside their Hero cards and clear of info controls. Small-source ESLint passed; the 6,296-line `app/page.tsx` ESLint process exceeded a 4 GB Node heap, with no lint diagnostic. `git diff --check` and build passed.
- B1 working-tree implementation uses the validated public Duel exchange, retains the fixed root, displays each committed Attack in its actor's viewer-relative half, and keeps routes orthogonal (zero diagonal segments). At 390×844 the root stays at `(104.75,197.14)` across all four response frames; frame-4 fork coordinates are `(68.5,248.8)` and `(232.8,413.6)`. Round 1 remains an unchanged 85% subdued pair after round 2; a measured 1.1px Dock-anchor shift only reflows its attached path endpoint. Focused evidence: build; API engine 40/40; presentation proof 1/1; Duel fixture geometry 5/5; real server-backed Duel/Attack→Dodge 2/2; legacy Duel/delegated-response browser cases 5/5.
- Live evidence JSON and screenshots (ignored browser outputs) are under `tests/browser/test-results/browser/duel-long-chain-test-mode--812c9-roof-backed-two-round-graph/` and `tests/browser/test-results/browser/duel-long-chain-test-mode--177fc-tes-at-four-viewport-widths/`. They include exact root/response IDs, four Duel frames, attacker/defender/observer views, path/card/Seat/Dock geometry and hidden-hand checks.
- B1 commit `b5c94b7fbb8cc6433df5ac0264cbf77279c9a288` was pushed. Exact-SHA Actions run `38336357669`: lint/fast failed on five unused identifiers; API tests and browser startup/room smoke succeeded; deploy was skipped, so no B1 deployment occurred. Targeted ESLint reproduced the five diagnostics and now passes after removing only unused code/test parameters. A lint-only CI repair is prepared; push it and wait for that exact SHA's Actions result before ending at visual acceptance.

## Design checkpoint

Reviewed `docs/UX2-refine.md` blob `6b9ad6ab83e8e64c185b3fdeed4ca03f40310ccb`. §6.38 records the user's Stage A completion. §6.39 defines B1's stable Duel root, server-proven Attack responses, seat-relative halves, orthogonal elbow/fork paths, bright current round and intact subdued prior round. No design-document edit was made.

## Current task — `UX2-6.34-B1-DUEL-LONG-CHAIN-01`

Implement Duel two-round relationship presentation and the §6.39.5 ordinary Attack/Dodge path-balance polish. Keep the Duel root stable; use only authenticated public Duel Attack proof and real viewer-relative Seat/Dock anchors. Cards belong to their author's left/right half. Use horizontal/vertical runs with minimal rounded elbows, retain the immediate prior pair and its genuine green/red paths below in subdued form, and highlight the current round above. Do not infer causality from DOM or timeline order, move old cards arbitrarily, or alter gameplay/protocol/privacy.

**Acceptance / stop:** four screenshots from one real server-backed Duel root after Attack #1–#4 with exact public root/card/event/actor IDs; measured Seat/Dock endpoints, card rectangles, side ownership, SVG paths and fork coordinates; prove the earlier pair remains correctly colored/dimmed while the new pair is highlighted. Also capture live Attack-only and Attack→Dodge before/after stability and route geometry at 390×844, ~440px, 480×900 and wide. Report focused regressions, exact SHA/CI/deploy and screenshots; stop for user/Reviewer visual acceptance. Do not start B2 Negation, Stage C/AOE or Hero layouts.
