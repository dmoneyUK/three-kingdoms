# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-SOWING-DISTRUST-SETTLEMENT-LIFECYCLE-01` is implemented and
locally validated. Sowing Distrust now retains an exact public Effect root
through authoritative settlement, shows the terminal state briefly, and
removes the transient graph without exposing the hidden card. Reduced motion
uses a shorter hold. The failed CI at prior HEAD `6cb6a757d6946081fdbe2b2c406d33e476230182`
was run `37797631764` (lint/fast and Browser shard 1 failed; API and Browser
shard 2 passed). The repair is included here: timer-only response deadlines no
longer invalidate the same decision revision, and response-card controls are
disabled while a request is busy. This commit's Actions result is not yet
available.

Local evidence: build passed; fast tests 244/244; focused API 36/36; Browser
shard 1 414/414; Sowing Distrust real-gameplay browser tests 5/5; Duel
regression repeat 8/8; targeted ESLint and `git diff --check` passed.

## Design checkpoint

Latest `origin/ux-v2:docs/UX2-refine.md` reviewed at blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`. Section 6 Phase D remains active;
§4A timer work is closed. Reviewer acceptance has not been asserted.

## Current / next task

`UX2.6-PHASE-D-SOWING-DISTRUST-SETTLEMENT-LIFECYCLE-01` — implementation,
focused regressions, and repair of the observed prior-CI failures are complete;
commit and push this bounded change, then check the exact pushed SHA's Actions
result at the next commit boundary.
