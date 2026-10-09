# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

§4D P3 real server-to-Skills audit is complete: 51 focused browser tests passed
across the mapped 37 unique provider IDs and a 25-Hero no-authority matrix.
They verify CurrentAction routing, exact activation/continuation payloads,
stable disabled controls without authority, and no duplicate Action Row entry.
Latest observed parent Actions run `37899520578` on `2052b7926a5a7fb5e3c6e21527df7f411e04a8c3` failed only ESLint for an unused `attacker` local in
`daqiao-deflection-real-gameplay.spec.mjs:45`; API tests, build, and both
browser shards passed. The unused local is removed in this task commit; its
Actions validation is pending. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`; no newer design change since the
last checkpoint. Re-reviewed §1.10 and §4D P3/P4/§4D.3. The §4C.15 Burning
Bridge visible-name amendment (`a8f0ec65`) remains later than the §4D P2
wording (`268c4f85`); follow Burning Bridge for visible copy and retain
internal `Dismantle` identifiers.

## Current task

`UX2-4D-P4-REAL-PRODUCTION-PATH-PARITY-01` — verify the approved Negation
open/first/counter/settlement path, Raining Arrows with and without Dodge, and
Opponent Inspect public Hero/skill/equipment/judgment plus concealed-Hand
projection through server-generated rooms and the production page. Repair any
real-path mismatch; fixture/API evidence is supplementary. Section 6 and P5
remain gated until their own bounded tasks close.
