# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Human response windows now use a server-owned 60-second deadline, shown from its start. A newly visible Attack root card has a separate 20-second timer in the relationship graph; a publicly proven Dodge continues to receive its own 20-second graph read/hold. These clocks do not extend or pause one another. No new test declarations were added. Pushed as `ec09c7dbd6343f33388c7cf4101042c57b9c109c`.

CI run `38040320101` for `ec09c7dbd6343f33388c7cf4101042c57b9c109c` failed only at an outdated assertion in `tests/api/equipment.test.mjs:119`: it expected the response countdown start to be in the future, which conflicts with showing the 60-second window from its start. Updated the existing assertion to verify the server deadline is exactly 60 seconds after that start; no new test declarations. `npm run build` passed and the focused equipment API file passed 20/20, including the failing AOE Negation case. Other CI jobs passed; deploy was skipped. Repair commit/CI pending.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. §6.29.7's 3-second wording is superseded for this work by the user's direct 20-second card-graph instruction; response wait is 60 seconds by direct instruction. Real-game graph acceptance is still open.

## Current task

`CI-REPAIR-RESPONSE-TIMER-START-ASSERTION-01` — commit/push the assertion repair and verify the exact repair SHA's Actions run. Do not resume feature work until that SHA is green. Then resume `UX2-6.29.1-ATTACK-DODGE-REAL-TRACE-01`; the supplied MP4 did not include its JSON trace, and the recurring missing-card graph issue remains open.
