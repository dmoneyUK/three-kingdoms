# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Attack root diagnostics are deployed on `9f188540ac6f14ece031939468fd33c647d39c40` (run `38053408522` succeeded). Exact-response client change `4a34c8478b4a9bbe1e621da776063f6b5ba5415e` failed run `38054321661` only at React Hooks lint (`currentAttackRootIdentity` and `room.timeline` omitted); API and Browser smoke passed, Deploy skipped. CI-only dependency repair is in progress; no further feature work until its exact SHA is green.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` re-read at this boundary. Direct user timing remains 60-second response / 20-second public-card display; no timer change is part of the next task.

## Current task

`UX2-6.29.1-ATTACK-DODGE-EXACT-RESPONSE-CORRELATION-03` — replace global historical-proof uniqueness fallback with a client record keyed by the newly received public Dodge `responseEventId` and its exact root, resolution, interaction, and frame identity. Preserve that identity through Pending cleanup; fail closed on mismatches. Prove four consecutive Dodge responses bind to their own Attack despite older proofs remaining in timeline. Do not change graph geometry, gameplay, or the 20-second display.
