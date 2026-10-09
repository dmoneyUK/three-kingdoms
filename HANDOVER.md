# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2-6.27-DODGE-INTERCEPTION-FIT-SEARCH-01` is implemented locally. The
2px full-card field search finds real direct Dodge placements in dense 6/8p
480×900 scenes; the 6p 390×844 proof exhausts legal geometry and remains
fail-closed. Tests verify rendered 2:3 card bounds, 12px table margin, 8px
obstacle/root clearance, 35–70% placement, interception mark, and root stability
within 1px. Fresh screenshots were inspected. `ffde77740c75ee974355ad68cf15fe4c5b6bfd1e`
passed Actions run `37915411584`. Build, targeted ESLint, diff check, and dense
real-gameplay browser matrix passed. Outgoing SHA/CI will be recorded after
push. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`. Re-reviewed §§6.27.1–6.27.4 at
the planning boundary; no intervening design change.

## Next task

`UX2-6.27-ATTACKER-DODGE-GRAPH-CONTINUITY-01` — on real server-backed dense
6/8-player mobile Attack→Dodge flows, prove that the local attacker receives
and renders the same public Dodge response graph as the defender while its
Attack root remains stable. Capture first visible response state, root/response
identity, connectors, readiness/fallback transitions, and settlement cleanup;
classify any absent/intermittent response without inferring from timeline order.
Keep the change within presentation/test coverage and §6.27.4 authority/privacy
rules; do not change gameplay semantics.
