# WTK UX2 — Current Handoff

Branch: `ux-v2`  
Latest reviewed design: `docs/UX2-refine.md`, blob `1ce55dd3356e673d145acf73da7247c776136010`

## Latest implementation result

Gate A implementation is pushed at `9f2bc6be007065f7b458f70e02964124386de28f`. Exact-SHA Actions run `38553507133`, attempt 3: Lint/fast, API, and browser smoke passed; deploy failed at `Apply D1 migrations`, so build, Worker deploy, and production smoke were skipped. `npm run db:generate` had created a duplicate `0013` table migration because `drizzle/meta/0012_snapshot.json` was missing; migration `0012` had already succeeded remotely, then `0013` failed with `table negation_window_submissions already exists`. A local generated `0012_snapshot.json` now makes `db:generate` report no changes, and a fresh local D1 applied migrations `0000`–`0012` successfully. Repair commit and exact-SHA CI are pending.

## Current task

`UX2-9A-CANONICAL-NEGATION-WINDOW-ENGINE` — implement UX2 §9.1 and §9.4 Gate A only, with no client UX redesign.

Gate A is implemented: shared eight-second Negation windows use `NegationWindowPending` and private D1 `(window_id, player_id)` submissions, server-revalidated intents, canonical-seat winner selection, and fresh counter windows. Public views scrub pending actor/resolver fields; private intents do not create optimistic card reveals; legacy sequential pending Negation converts without consuming a card. Current bounded work is the missing Drizzle snapshot repair and verification of the Gate A deployment. Do not start Gate B until this exact-SHA CI/deploy result is green; then continue the authorized sequence.

Acceptance boundary: five-seat Duel with seats 2 and 4 submitting in window #1; seat 2 wins independent of POST order, seat 4 retains its card, the fresh counter window starts after seat 2 and accepts seat 4, and no submissions settle once after the shared deadline. Preserve non-Negation response timing/rules. After exact-SHA CI and deployment succeed, mark Gate A delivered/awaiting review in the design and handoff, then continue §9.4 Gate B.


Validation policy: GitHub Actions remains the full validation gate. When current CI fails, reproduce the reported failure locally before committing; do not run the full suite by default. Before each commit inspect the latest relevant run for the current remote head; after push report exact-SHA job and deployment results.
