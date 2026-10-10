# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Human response windows now use a server-owned 60-second deadline, shown from its start. A newly visible Attack root card has a separate 20-second timer in the relationship graph; a publicly proven Dodge continues to receive its own 20-second graph read/hold. These clocks do not extend or pause one another. No new test declarations were added. Pushed as `ec09c7dbd6343f33388c7cf4101042c57b9c109c`.

CI repair: run `38040902028` succeeded for exact SHA `853afff53b95779bb8bc319f266b4918fa8948da`; API tests, Lint/fast tests, Browser startup/room smoke, and deploy all passed. The prior failure was a stale assertion in `tests/api/equipment.test.mjs:119` expecting the response countdown start to be in the future; it now verifies the server deadline is exactly 60 seconds after that start. No new test declarations. Local `npm run build` and focused equipment API file (20/20) passed.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. §6.29.7's 3-second wording is superseded for this work by the user's direct 20-second card-graph instruction; response wait is 60 seconds by direct instruction. Real-game graph acceptance is still open.

## Current task

`UX2-6.29.1-ATTACK-DODGE-REAL-TRACE-01` — awaiting the user's next instruction before resuming. When authorized, reproduce one real Attack→Dodge case with the deployed recorder, export its JSON, identify the first failing projection/proof/overlay/layout stage, and fix only that production cause. The supplied MP4 did not include its JSON trace; the recurring missing-card graph issue remains open.
