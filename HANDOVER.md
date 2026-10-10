# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

The 2026-10-10 11:22 iPhone trace showed the Attack graph ready, then a physical Dodge whose server proof was rejected as `attack-root-public-event-not-unique` (`matchingRootEventCount: 2`). The cause was private `draw` history for the same physical Attack being counted as a public root; the source-side PresentationV2 also counted that private card occurrence, making projection viewer-dependent. Both proof-building and projection now count public `play` events only. The existing server-backed Attack/Dodge API case now includes a source-private draw record for the same Attack and proves a `PROVEN` response plus equal source/target/observer projections while preserving the private timeline boundary.

Local validation: `npm run build` passed; `GAME_TEST_FILES=tests/api/presentation-v2-engine.test.mjs GAME_TEST_PORT=3237 GAME_TEST_INSPECTOR_PORT=9237 node tests/run-tests.mjs` passed 39/39; targeted ESLint for the two production files and API test passed; `git diff --check` passed. Latest base Actions run observed: `38047823947`, Success on SHA `340657897dbeb893f456fc72afd3aa54d7237c84`. New fix commit/CI status is pending.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. §6.29.7's 3-second wording is superseded for this work by the user's direct 20-second card-graph instruction; response wait is 60 seconds by direct instruction. Real-game graph acceptance is still open.

## Current task

`UX2-6.29.1-ATTACK-DODGE-REAL-TRACE-01` — after this fix deploys, reproduce one real ordinary Attack→physical Dodge and export a new trace. Confirm `server-proof-evaluation.proofBuilder.result === PROVEN`, both projection counts are 1, then inspect graph candidate/readiness and the 20-second graph display. Keep the 60-second response deadline unchanged. The supplied trace established and fixed the proof/projection rejection; deployed real-game verification of the fix remains open.
