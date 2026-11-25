# HANDOVER

**Latest verified delivery:** §10.76-B implementation `f492ab18d4ee5723b1aeffdc05f7bec423799abe`; exact-SHA [Actions 45650453378](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45650453378) passed and deployed Worker `0dddffbf-727c-4e21-b954-f2f53b122519`. §10.76-B status remains as recorded in the current design; no work on it is being repeated.

## Current bounded task — §10.79 H4-DAMAGE-SOURCE-ATTRIBUTION-01

**Status:** IMPLEMENTED LOCALLY — targeted validation passed; exact-SHA CI/deployment pending.

**Design reviewed:** latest `origin/ux-v2` `b114bd00`; `docs/UX2-refine.md` revision 2026-11-25 21:58 UTC, §10.79. The Owner's execution order begins §10.79 → §10.80 → §10.81-A → §10.81-B → §10.82-A → §10.82-B → §10.83.

**Scope:** At the shared typed committed-damage projection and H4 formatter, include a named effective card/skill only when server proof links it to positive committed damage. Preserve true dealer/recipient/amount, event order, source/card identity and verified player spans; retain truthful fallbacks for unknown source/dealer. Preserve Stauchness terminal copy, conversions, Duel attribution, Lightning's no-dealer semantics, privacy, one H4 owner, §10.76-A synchronization and existing card lifetimes. No gameplay/rule/layout changes.

**Validation boundary:** focused fast/API/projection/formatter/privacy regressions; at most five minutes total local UI/browser testing for this bounded task. Before each commit inspect current branch Actions; after push verify exact-SHA required CI, deployment and production smoke. Update this handoff with actual SHA/results and only then select the next authorized step.

**Validation completed:** `node --import tsx --test tests/api/public-activity.test.mjs tests/api/presentation-semantics.test.mjs` — 60/60 passed; `GAME_TEST_FILES=tests/api/group-root-public-card-proof.test.mjs,tests/api/equipment.test.mjs node tests/run-tests.mjs` — 24/24 passed, including real Raining Arrows damage→H4 and Rock Cleaving Axe forced Attack damage through equipment-loss continuation; `npm run build` passed; `git diff --check` passed. Local UI/browser tests were not needed for this server proof path. Latest relevant remote Actions before commit: run 45650453378 on `f492ab18d4ee5723b1aeffdc05f7bec423799abe`, success and deployed; remote `ux-v2` HEAD `b114bd002f5d59374afbde36af93f7b0223c3b89` is docs-only since that run.

**Resume point:** inspect current typed damage outcome/source proof, canonical `derivePublicInteractionNarration` consumer, and all authoritative positive-damage emitters before editing. Do not infer names from prose, timeline/current turn, conversion-cost materials, or HP deltas. Await final Owner review after all seven ordered steps; never mark USER-ACCEPTED.
