# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`1d4b3253009d38e63a74fcff4dffa05b498a2783` is pushed; exact Actions run
`37807849267` completed `SUCCESS` on that SHA. The prior
`63ae1abcb72aaa972199e26ac7bd2bdf2811e22a` Browser shard-2 flake was reproduced
as a scroll-event race and repaired in that push; 30/30 focused repetitions
passed without weakening assertions. The active Attack→Dodge settlement hold
is implemented locally; build, targeted ESLint, diff check, and real-gameplay
Browser tests passed 4/4, including measured normal/reduced-motion exit.

## Design checkpoint

Latest `origin/ux-v2:docs/UX2-refine.md` remains blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`. Section 6 Phase D is active;
Reviewer acceptance has not been asserted.

## Current / next task

`UX2.6-PHASE-D-ATTACK-DODGE-SETTLEMENT-HOLD-01` — for the already-proven,
server-authored ordinary Attack→physical Dodge relation, show a concise settled
blocked state, hold it for the §6.17 reduced-motion-aware interval, then fade
and remove the temporary graph. Preserve the stable root, public-only facts,
and fail-closed behavior. Real API/browser proof and mobile/wide timing checks
pass; the scoped task change is ready to commit.
