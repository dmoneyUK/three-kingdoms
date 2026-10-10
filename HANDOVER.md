# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Attack root projection diagnostics are deployed on `9f188540ac6f14ece031939468fd33c647d39c40` (exact Actions run `38053408522` succeeded, including Worker deploy and production smoke). The exact-response client change is implemented locally; `node --import tsx tests/presentation-v2.test.mjs` passed 44/44 and helper/test lint passed. Page lint could not complete locally: ESLint exhausted 3 GB heap without a diagnostic; exact push CI is required.

Feature SHA `22de2a305a01e3d5cac6f594e49258e38c96cbff` first failed run `38053234928` only for an unused diagnostic binding; API and browser smoke passed, Deploy skipped. CI-only repair SHA `9f188540ac6f14ece031939468fd33c647d39c40` passed exact run `38053408522`: Lint/fast, API, Browser smoke, D1 migrations, Worker deploy, and production smoke all succeeded.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` re-read at this boundary. Direct user timing remains 60-second response / 20-second public-card display; no timer change is part of the next task.

## Current task

`UX2-6.29.1-ATTACK-DODGE-EXACT-RESPONSE-CORRELATION-03` — replace global historical-proof uniqueness fallback with a client record keyed by the newly received public Dodge `responseEventId` and its exact root, resolution, interaction, and frame identity. Preserve that identity through Pending cleanup; fail closed on mismatches. Prove four consecutive Dodge responses bind to their own Attack despite older proofs remaining in timeline. Do not change graph geometry, gameplay, or the 20-second display.
