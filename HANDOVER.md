# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Attack root reconnect proof was pushed as `ed93c15a3089e282a9c7cf0faf33d6e0ce5aae74`.
Actions run `37906975367` is still in progress: API passed; Lint/fast and both
Browser shards are running. Do not treat the run as green yet.

The fresh Attack/Dodge screenshot audit is complete locally. At 390×844,
480×900, and 1440×900, the inspected four-player screenshots show the approved
green source tether, prominent red Attack arrow, whole-target emphasis,
recognizable cards, and direct Dodge interception without a duplicate Stage.
Some cases in the 6/8-player mobile matrix record `geometry-unavailable` and
the safe Stage fallback. A CSS animation made the old exact-string glow assertion
stale; its numeric ~8px assertion fix, audit note, and roadmap entry are local
and await the `ed93c15` CI gate. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `4c56947d9965cde28a7c888e19f5d5fa0612112e`.
Re-reviewed §§6.24.10–11 and 6.27.4 at the screenshot-audit boundary. The
four-player visuals meet the inspected requirements; dense mobile fallback is
an evidenced remaining limitation, not proof that every dense scene is
impossible. Preserve fail-closed behavior until a collision-free fit is
demonstrated.

## Next task

`UX2-6.27-DENSE-ATTACK-GEOMETRY-INVESTIGATION-01` — explain the measured
`geometry-unavailable` results in the real 6/8-player 390×844 and 480×900
Attack/Dodge matrix. Distinguish “no feasible Attack-root slot” from “root
fits but no reserved Dodge slot” in focused test-only candidate/obstacle
evidence. Support a graph only where the existing approved card sizes fit
without overlapping physical Seats, Dock, controls, or other obstacles.
Preserve the safe fallback wherever no collision-free placement is proven.
Validate both attacker and defender production views, capture screenshots and
geometry, and do not move physical Seats/Dock or infer missing semantic proof.
