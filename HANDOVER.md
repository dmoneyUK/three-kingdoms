# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md` blob `b3b30952be4907284f6b22514e92b69f0b00e52f`. Full §§8–11 review found no product-criteria delta since the R4 progress-only addition. §8.7 Policy B and §9 secret all-living-seat, 8s-maximum Negation remain; §§8.1–8.5 and §10.5.3 are closed. New §10.8 review details govern H2/H3; §11 UX3 remains out of scope.

## Latest result

H1 delivered in `727b5dabb06889ec6ec6df3079b429518d52c85b` with lint correction `fbe8e3c5ad5674dec09b3ba27c770327c915a572`. Exact-SHA Actions run [38665890985](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38665890985) passed all jobs and production smoke; Worker version `4e677d1c-9e47-46e5-acd5-9847452673da`. `room-safety-render` passed 19/19; isolated ESLint pattern check passed. Whole-file local ESLint hit Node heap limits; CI lint passed. H1-specific authenticated mobile screenshots were not captured. H1 is **PENDING REVIEW**, not accepted.

## Current task — §10.8.2 H2: opponent-seat identity, HP and Equipment layout

Reflow only opponent Hero seats: Hero name over/inside the portrait, actual player name in the lower strip, larger current HP chip upper-right, and a public Equipment row below the name strip. Preserve server identities, target/Switch hit areas, equipment order, Seat anchors and actor-attached histories. Inspect final responsive CSS across 4/6/8/10 seats. Validate 0/1/4 Equipment slots, long names, low HP, turn/target emphasis and history collisions at 390/440/480px and desktop using real browser rectangles. No gameplay/server changes; do not begin H3 or §11. Push, verify exact-SHA CI/deploy, record factual progress and mark **PENDING REVIEW**.
