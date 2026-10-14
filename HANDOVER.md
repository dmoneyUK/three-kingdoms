# WTK UX2 — Current Handoff

Branch: `ux-v2`  
Latest reviewed design: `docs/UX2-refine.md`, blob `1ce55dd3356e673d145acf73da7247c776136010`

## Latest delivered result

P0 Attack/Dodge crash fix `088216383508ecc4fcd279de87fc042455314fc2` is pushed and deployed. Real local Wrangler Worker/D1 browser proof passed 3/3 at 440×894: Attack→Dodge settlement, Attack→Skip with server-proven damage, and authorized Quick Test seat switching. Focused ESLint and build passed. Exact-SHA Actions run `38538680330` passed Lint/fast, API, browser smoke, Cloudflare deploy, and production smoke. `npx tsc --noEmit` remains nonzero with 512 existing repository diagnostics; none point into the new geometry guard/observer code. A broader pre-existing viewer-switch scenario also timed out after its end/discard actor-seat assertion, while the focused switch test passed.

## Current task

`UX2-9A-CANONICAL-NEGATION-WINDOW-ENGINE` — implement UX2 §9.1 and §9.4 Gate A only, with no client UX redesign.

Implementation in progress: `NegationWindowPending` plus the private D1 `(window_id, player_id)` submission table now hold one immutable eight-second window, per-viewer provider/Pass state, server-revalidated intents, canonical-seat winner selection, and fresh counter windows. Public views scrub the pending actor and causal resolver; private intents do not create optimistic card reveals. Legacy sequential pending Negation is converted without consuming a card. API regressions cover five-seat Duel priority in both POST orders, losing-card conservation, counter priority, and no-submission expiry. The test harness waits whenever any human/test seat has a legal option or has submitted. No local automated tests have been run. Gate A commit `0ddec9fef71a0f767fe018c3ddd43bb49f2abd55` run `38541259610` failed: browser smoke passed, lint failed on two now-removed unused locals, API tests failed with only an exit-code annotation available because GitHub logs require login, and deploy was skipped. A lint-only repair is in progress; recheck the API job on its exact SHA before proceeding.

Acceptance boundary: five-seat Duel with seats 2 and 4 submitting in window #1; seat 2 wins independent of POST order, seat 4 retains its card, the fresh counter window starts after seat 2 and accepts seat 4, and no submissions settle once after the shared deadline. Preserve non-Negation response timing/rules. After exact-SHA CI succeeds, record Gate A as delivered/awaiting aggregate review in this design and handoff, then continue §9.4 Gate B without pausing.


Validation policy: GitHub Actions is the validation gate; do not run local automated suites. Before every commit, inspect the latest relevant run for the current remote head. On failure, inspect logs and push a separate minimal CI repair; resume the feature only after that exact repair SHA passes its required jobs.
