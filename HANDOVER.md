# Current Handover

Branch: `ux-v2`

## Latest confirmed results

- **U13-A-F multi-discard lift: CODE DEPLOYED / PENDING USER VISUAL REVIEW.** Final SHA `43b9d7acdf367124e36f41ce8dbfee955fac5ea2`; exact-SHA [Actions run 38974290573](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38974290573) passed API, lint/build/fast, browser startup/room smoke (1), deploy, and production `/` plus `/api/health` smoke. Worker version `76ce26e1-f07e-40cf-b482-c700c5a4851d`. The CSS gives all multi-selected cards the normal 48px wrapper + 17px face lift. No local automated tests or real 3-card visual measurements/screenshots were run per user direction; visual review is still required. Original U13-A remains user-rejected.
- **U13-E LUST cost Frame: IMPLEMENTED / DEPLOYED / PENDING HUMAN REVIEW**, code SHA `cc878c7e77024200ac4523135afe215d5250e835`, exact-SHA [Actions run 38973318743](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38973318743), Worker version `634f4a75-bf61-4b0c-a98d-bafb59ad5390`. No LUST-specific phone measurement was run.
- Latest reviewed design blob: `051350c83b32761faaf59285d166cbfe06de3b78`. Preserve the untracked user file `HANDOVER 3.md`.

## Current task

**UX2-10.8.2.2-H2-G1-OPPONENT-COMPACT-PLAYER-HP-EQUIPMENT-01** — `docs/UX2-refine.md` §10.8.2.2.

Within opponent Seats only, render the real `player.name` once as a translucent bar flush with the portrait bottom; remove the Hero name and hearts from the miniature, remove the upper-right HP duplicate and former external player-name row, then place one numeric authoritative HP chip first in the single lower HP/equipment band, followed by only genuine occupied weapon/armor/+1/−1 glyphs. Preserve Hero artwork, real-name accessibility/Inspector details, test-only SWITCH, target/Deflection interaction and genuine equipment IDs. When target selection is active, retain a distinct accessible Inspector affordance that does not steal target taps or SWITCH.

Edit `OpponentPlayerCard()` and final effective rules in `app/sequence-overrides.css` for top-row and side-column seats. Recalculate seat/card-parking geometry from the resulting actual seat footprint without changing card authorship or judgement placement. Do not implement H2-G2 or H2-G3 in this slice. User direction: no local automated tests; rely on exact-SHA CI and leave multi-seat/phone visual measurements for user review. Report unmeasured layout criteria clearly; do not claim human acceptance.
