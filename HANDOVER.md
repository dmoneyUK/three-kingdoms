# HANDOVER

**Latest verified delivery:** §10.76-B implementation `f492ab18d4ee5723b1aeffdc05f7bec423799abe`; exact-SHA [Actions 45650453378](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45650453378) passed and deployed Worker `0dddffbf-727c-4e21-b954-f2f53b122519`. §10.76-B status remains as recorded in the current design; no work on it is being repeated.

## Current bounded task — §10.79 H4-DAMAGE-SOURCE-ATTRIBUTION-01

**Status:** Implementation pushed as `2b65d67df4593d605299fdfc358993eb1b78cf25`; Actions failed only at an outdated Duel H4 expected string, so deployment was skipped. CI repair is in progress; do not start §10.80 until the repair SHA's required Actions and deployment pass.

**Design reviewed:** latest `origin/ux-v2` `b114bd00`; `docs/UX2-refine.md` revision 2026-11-25 21:58 UTC, §10.79. The Owner's execution order begins §10.79 → §10.80 → §10.81-A → §10.81-B → §10.82-A → §10.82-B → §10.83.

**Scope:** At the shared typed committed-damage projection and H4 formatter, include a named effective card/skill only when server proof links it to positive committed damage. Preserve true dealer/recipient/amount, event order, source/card identity and verified player spans; retain truthful fallbacks for unknown source/dealer. Preserve Stauchness terminal copy, conversions, Duel attribution, Lightning's no-dealer semantics, privacy, one H4 owner, §10.76-A synchronization and existing card lifetimes. No gameplay/rule/layout changes.

**Validation boundary:** focused fast/API/projection/formatter/privacy regressions; at most five minutes total local UI/browser testing for this bounded task. Before each commit inspect current branch Actions; after push verify exact-SHA required CI, deployment and production smoke. Update this handoff with actual SHA/results and only then select the next authorized step.

**Validation completed before push:** `node --import tsx --test tests/api/public-activity.test.mjs tests/api/presentation-semantics.test.mjs` — 60/60 passed; `GAME_TEST_FILES=tests/api/group-root-public-card-proof.test.mjs,tests/api/equipment.test.mjs node tests/run-tests.mjs` — 24/24 passed; `npm run build` and `git diff --check` passed. Exact-SHA Actions run 45712541019: lint/fast and 2-test browser smoke passed; API shard 1 failed one existing `tests/api/diao-chan.test.mjs` assertion that expected the pre-§10.79 Duel text without “with Duel”; other 390 API tests passed. Deployment was skipped. Repair updates only that stale expected copy and reruns its focused API test before a separate repair push. Local UI/browser tests were not needed for this server proof path.

**Resume point:** inspect current typed damage outcome/source proof, canonical `derivePublicInteractionNarration` consumer, and all authoritative positive-damage emitters before editing. Do not infer names from prose, timeline/current turn, conversion-cost materials, or HP deltas. Await final Owner review after all seven ordered steps; never mark USER-ACCEPTED.
