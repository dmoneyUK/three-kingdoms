# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2-FINAL-AOE-MULTI-TARGET-REVALIDATION-03` passed its 23-case production-path
browser matrix; the Oath screenshot expansion passed a separate 1/1 rerun.
Coverage includes Raining Arrows, Barbarian Invasion, Oath, Bumper Harvest, and
ordered Halberd Attack at 390×844, 480×900, and wide, plus dense 8-player Group
scenes. Fresh major-state screenshots were inspected; focused ESLint and diff
checks passed. Exact pre-commit base `fa48e33cf11376f127536d10209c8652b140a1f1`
passed all five Actions jobs, including deploy, in run `37932531424`. This
revalidation changeset is ready to commit. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e` (unchanged at this boundary).
Section 6 and §6.27.4 were re-read; §4D / §5 prerequisites remain closed.

## Current task

`UX2-6.27-8P-390-ATTACK-DODGE-GEOMETRY-01` — investigate the measured
fail-closed Attack→Dodge layout for the local attacker at 8 players / 390×844.
Using real server-backed Attack and Dodge proof in attacker and defender views,
seek a collision-free placement at the §6.27.1 minimum card sizes and stated
table/control clearances; prove stable root, actual interception, and no Seat,
Dock, control, or overflow collision. Do not shrink below the approved minimum,
move physical Seats, or fabricate links. If those constraints leave no fit,
preserve fail-closed behavior, attach exact geometry evidence, and stop for the
smallest required product decision.
