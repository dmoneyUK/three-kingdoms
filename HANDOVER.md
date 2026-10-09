# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

The four-player Attack/Dodge screenshot audit is pushed as
`e0d87cb3af2532dc26b14398c04c9cd0c2ed5556`. Actions run `37908137423` for
that exact SHA is SUCCESS, all five jobs including deploy smoke test.

Dense geometry diagnosis is complete locally: build, targeted ESLint, four
real 6/8-player Attack→Dodge cases, and the ten-window ordinary Attack
continuity test passed. The current 108-point root search finds no collision-
free candidate for the local attacker in the tested dense matrix; this does not
prove no broader placement exists. Actual Dodge fit is measured separately.
Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`. Re-reviewed §§6.27.1–6.27.4 at
the planning boundary; no intervening design change.

## Next task

`UX2-6.27-ATTACKER-ROOT-FIT-SEARCH-01` — determine whether the 6/8-player
390×844 and 480×900 local-attacker scenes have a collision-free, visibly
traceable Attack-root placement beyond the current 108 path-based candidates.
Use measured production Seat/Dock/control geometry and existing approved card
fit steps; favor the §6.27.1 source→target placement band while allowing safe
lateral routing. Keep at least 12px table margin and 8–12px obstacle clearance,
and reject connector routes obscured by Seats, Dock, or controls. Implement
only placements proven by browser geometry; otherwise retain the safe fallback
with a quantified reason. Do not move Seats/Dock, change gameplay, or infer
public semantics.
