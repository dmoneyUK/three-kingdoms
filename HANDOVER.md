# HANDOVER

**Latest verified delivery:** §10.81-A, `2d92f1da722b2254b2ca9c1126dc997dd27317aa`; Actions 45747248852 passed lint/fast, API, browser-smoke, D1 migration, deployment and production smoke. Worker `5552482c-fbe2-4081-8bfc-3bb65e65fbf5`; `/api/health` returned `available`.

**Design reviewed:** `docs/UX2-refine.md`, revision 2026-11-25 23:53 UTC.

## Current bounded task — §10.81-B: shared two-stage Judgement presentation

**Status:** implementation and focused validation are ready for one task commit. Exact-SHA CI, Worker deployment and production smoke are pending this push. Owner iPhone review remains pending.

**Changes:** restore the committed Necromancy replacement’s causal frame route when an older original Judgement event stores `resolutionId` only at the authoritative top level; preserve strict raw/projected proof, physical card, target, actor, root and resolution matching. One shared H4 owner presents the original and actual replacement in order; the replacement frame and two-line H4 share one display owner. No game-rule change or private Hand disclosure.

**Validation:** Judgement/display/routing unit tests 24/24; focused API projection test 1/1; `npm run build`; targeted ESLint and `git diff --check` passed. W4-F8 real-gameplay browser scenario passed at 440×894 for actor and observer, including true face/owner, one frame/H4, measured ≥5px H4/PAC clearance, completion/parking, no third reveal and private-card protection. At 390×844 the fixed safe corridor was 190.5px for the 210px frame; the renderer correctly failed closed and kept H4. Browser run/recovery stayed within the five-minute task budget.

**Next boundary:** after this SHA's required CI/deployment/smoke pass, begin §10.82-A. Do not claim USER-ACCEPTED.
