# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

Manual UX2 refinement audit: 30 implemented Heroes × 320/390/480/1440px = 120 browser views. All metadata skill names rendered; no horizontal overflow, inter-zone overlap, or target below 44px. Visual failure: Skills bands shrink-wrap; Cao Cao at 390px has a 134.8px status panel but a 105.8px Skills band and `Entourage` wraps; at 480px the panel/band are 204.6/120.3px; at 1440px 954/155.8px. Single words split internally for 15 controls at 320px and 7 at each wider viewport; multi-word labels exceed two lines for 3/2/1/1 labels respectively. Manual Assault and Prodigal Healer selection/cancel paths returned to inactive state without duplicate skill Action Row controls. Focused browser spec: 7/7 passed. Full server-connected all-Hero capability coverage remains unverified; local full-app dev shows duplicate `CausalCreation` declaration in `app/api/rooms/route.ts`, so visual audit used the isolated GameRoom fixture. No production source changes.

Before this documentation handoff, remote HEAD `f832d2332ca43b880fe7d7740f3c1b90e2fb9221` passed Actions run `37539123908`.

## Design checkpoint

Re-fetched and reviewed `docs/UX2-refine.md` blob `9ce1bca462c123a2d73b8618b06fd9d81a012eec`, §1. This supersedes the primary UX2 design as current refinement authority per direct user instruction.

## Next task — not started

`UX2.REFINE-HERO-SKILLS-BAND-WIDTH-WRAPPING-01`: make one-/two-skill layouts use the Skills width allocated by the Local Dock; remove arbitrary within-word wrapping; cap natural multi-word labels at two lines. Add focused regression assertions that fail on the measured Cao Cao 390/480px cases, then verify all 30 Heroes at the four design widths. Preserve CurrentAction legality, response privacy, peer geometry, and 44px targets. Do not claim Reviewer acceptance.
