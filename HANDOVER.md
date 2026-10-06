# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.24-GROUP-CHILD-DAMAGE-MOBILE-COMPOSITION-01` is implemented locally: coherent Group child-Damage now retains the proven Source → root card → single Target Strip and omits duplicate Hero Focus / Group headings / Active Scope. Focused browser coverage passed 104/104; `room-safety-render` passed 19/19; build, targeted ESLint, and `git diff --check` passed. Before this task commit, current remote SHA `91952258877011792857bc54fd43457b7ca30c36` had exact Actions run `37494887683` completed **success**. Task push status is pending observation; no Reviewer acceptance is claimed.

## Design checkpoint

Re-fetched remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a`; unchanged. At the UX2.24 close boundary, §§0–12.9 and the active implementation status were reviewed. Oath recipient scope/composition and Bumper Harvest ordered-progress/composition already exist in current code (UX2.19–2.22); do not duplicate those projections.

## Current task — UX2.25-GROUP-CHILD-DAMAGE-WIDE-GEOMETRY-01

After UX2.24's structural convergence, add focused measurable §12.6.12 geometry proof for a wide Group child-Damage view (6 players at 1440×900): stable Source/root-card/Target-Strip order and bounds, no viewport overflow, and clear separation from Guidance/Dock. Capture and inspect one screenshot. Make only a design-determined geometry correction if the proof exposes a concrete violation; no gameplay/projection changes. This is not the final UX2 gate.
