# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed remote design: `docs/UX2-refine.md` blob `c228d81e27df1d1fd2584e873cbd553b8de82bb2` (remote branch `be8261ab08abd4c754b1a007e8c4b93ec18aec01`).

## Latest result

- R1 implementation is locally validated, pending commit/push and exact-SHA Actions verification. Authenticated Worker/D1 browser: R1 7/7, shared Negation 2/2; targeted test ESLint, `node --check`, `git diff --check`, and `npm run build` pass.
- First-frame measurement after real server acceptance: Dodge at 440px appeared in 11ms; Duel Attack appeared in -9ms (same-frame UI arrival, within the -250ms clock tolerance). Evidence includes 440px screenshots and DOM rectangles in Playwright attachments.
- Latest observed deployed Actions run before R1 code: [38654422695](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38654422695), SHA `9c815e2b15387142e4f58c747a2dfd1c2d3c7cae`, all API/lint/fast/browser/deploy/production-smoke jobs passed. The current code change has no CI result yet.

## Current task — §10.7.1 R1: responses during Policy-B reveal

Reproduce in authenticated Worker/D1 games why a server-authorized time-sensitive response was visually blocked while the root CardFace revealed. Use server-owned `CurrentAction` legal actions to open only the matching response decision and card selection; preserve network-busy/single-submit safety, required selections, deadlines, privacy and gameplay rules. A committed public response must take centre focus immediately. Focused real-game browser regression spans 390/440/480px, Dodge, no-Dodge decline, Longdan conversion, Duel Attack, polling, spectator privacy, screenshots and first-frame timing. No unrelated card-family changes.
