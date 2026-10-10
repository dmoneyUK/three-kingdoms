# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

The 2026-10-10 11:22 iPhone trace showed the Attack graph ready, then a physical Dodge whose server proof was rejected as `attack-root-public-event-not-unique` (`matchingRootEventCount: 2`). The cause was private `draw` history for the same physical Attack being counted as a public root; the source-side PresentationV2 also counted that private card occurrence, making projection viewer-dependent. Both proof-building and projection now count public `play` events only. The existing server-backed Attack/Dodge API case now includes a source-private draw record for the same Attack and proves a `PROVEN` response plus equal source/target/observer projections while preserving the private timeline boundary.

CI repair complete: run `38049513240` succeeded on exact SHA `48f31169a8bea9b456fe10a8006663b9d0a6672f`. Lint/fast tests, browser startup/room smoke, API tests, D1 migrations, Worker deployment, and production smoke all succeeded. The earlier run `38048566976` failed on `tests/presentation-v2.test.mjs:308` because its duplicate-card fixture omitted `action: "play"`; the assertion now models a duplicate public play and remains fail-closed. Focused local reproduction passed 1/1. No production code changed in this CI repair.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. §6.29.7's 3-second wording is superseded for this work by the user's direct 20-second card-graph instruction; response wait is 60 seconds by direct instruction. Real-game graph acceptance is still open.

## Current task

`UX2-6.29.1-ATTACK-DODGE-REAL-TRACE-01` — now that the fix is deployed, reproduce one real ordinary Attack→physical Dodge and export a new trace. Confirm `server-proof-evaluation.proofBuilder.result === PROVEN`, both projection counts are 1, then inspect graph candidate/readiness and the 20-second graph display. Keep the 60-second response deadline unchanged. The supplied trace established and fixed the proof/projection rejection; deployed real-game verification remains open.
