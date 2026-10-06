# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

UX2.27's responsive matrix passed 246 distinct focused cases and exposed Deck/Discard overlap in Oath and Bumper Harvest. UX2.28 moves those visible piles into the edge lane (preserving the short-phone compact top placement) and adds bounding-box non-overlap checks. Both composition specs passed 18/18; targeted ESLint, `git diff --check`, and mobile/desktop screenshot inspection passed. No gameplay or projection changes. The preceding remote SHA `7779022483f51da5053cd63bc844e7989e68fa6e` Actions run `37504313777` completed successfully for `build-and-test` and `deploy`; CI for the UX2.28 commit is not yet observed. Reviewer acceptance is not claimed.

## Design checkpoint

Remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` is unchanged. §§12.0–12.9 and §0.91.4 were reviewed. Proven Group/AOE, Oath, Bumper Harvest, and Group child-Damage causal compositions are already implemented; §12.4 Selectable Detail remains marked open.

## Current task — UX2.29-SELECTABLE-DETAIL-REMAINDER-AUDIT-01

Audit only existing `CurrentAction.targetCardSelection` consumers and retained picker fallbacks against §12.4. Identify whether any live flow has sufficient authoritative target/zone keys, public identity, and revision safety but still falls back instead of using the shared Selectable Detail surface. Run the focused selector tests and record a small evidence matrix. Do not change gameplay or invent projection authority; retain fail-closed fallbacks where proof is insufficient. If a migration needs new semantic/server authority, stop and report the precise gap.
