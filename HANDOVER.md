# WTK UX2 — Current Handoff

Branch: `ux-v2`  
Latest reviewed design: `docs/UX2-refine.md`, blob `1ce55dd3356e673d145acf73da7247c776136010`

## Latest delivered result

P0 Attack/Dodge crash fix `088216383508ecc4fcd279de87fc042455314fc2` is pushed and deployed. Real local Wrangler Worker/D1 browser proof passed 3/3 at 440×894: Attack→Dodge settlement, Attack→Skip with server-proven damage, and authorized Quick Test seat switching. Focused ESLint and build passed. Exact-SHA Actions run `38538680330` passed Lint/fast, API, browser smoke, Cloudflare deploy, and production smoke. `npx tsc --noEmit` remains nonzero with 512 existing repository diagnostics; none point into the new geometry guard/observer code. A broader pre-existing viewer-switch scenario also timed out after its end/discard actor-seat assertion, while the focused switch test passed.

## Current task

`UX2-9A-CANONICAL-NEGATION-WINDOW-ENGINE` — implement UX2 §9.1 and §9.4 Gate A only, with no client UX redesign.

Implementation in progress: `NegationWindowPending` plus the private D1 `(window_id, player_id)` submission table now hold one immutable eight-second window, per-viewer provider/Pass state, server-revalidated intents, canonical-seat winner selection, and fresh counter windows. Public views scrub pending actor/resolver fields; private intents do not create optimistic card reveals. Legacy sequential pending Negation is converted without consuming a card. Gate A commits `0ddec9fef71a0f767fe018c3ddd43bb49f2abd55`, `a7263138ceab6cd5b1ceb3dbe7af04ef54da18a`, `c92d8c8c64691b57c5df84d2dd55a792d9bada79`, and `a8e9512a78a693dbef4ce421bdbf5a740d93b230` remain under CI repair. Latest remote-head run `38549567363` failed API and fast/lint tests; deployment was skipped. The named API regressions from that run now pass locally 23/23, the two failing snapshot regressions pass 2/2, Node 22 production build and focused ESLint pass. A single local repair commit is ready; its exact-SHA Actions result is pending.

Acceptance boundary: five-seat Duel with seats 2 and 4 submitting in window #1; seat 2 wins independent of POST order, seat 4 retains its card, the fresh counter window starts after seat 2 and accepts seat 4, and no submissions settle once after the shared deadline. Preserve non-Negation response timing/rules. After exact-SHA CI succeeds, record Gate A as delivered/awaiting aggregate review in this design and handoff, then continue §9.4 Gate B without pausing.


Validation policy: GitHub Actions remains the full validation gate. When the current remote-head run fails, reproduce the reported failures locally and make those focused tests pass before committing the repair; do not run the full suite by default. Before each commit inspect the latest relevant run for the current remote head; after push report exact-SHA job and deployment results.
