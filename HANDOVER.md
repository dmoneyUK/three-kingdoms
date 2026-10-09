# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Repair `f65568c7a86c9471491529da831d9540ed11b49c` failed exact run `37996058074`: Browser shard 1 had 448 passed and one failure; API/Lint and shard 2 passed, with no flaky test. The failure repeats the real 8-player 390×844 Attack handoff (362ms and 417ms versus a 250ms bound); the 480px Dock-clearance case now passes. Diagnosis: a submitted local target preview can keep `local-presentation-precedence` active because its presentation key omitted the newly proven root event. Local repair adds that public root-event identity to the key and a regression assertion. Build, presentation-client tests (59/59), focused browser cases (5/5), test-file ESLint, and `git diff --check` pass; ESLint on `app/page.tsx` OOMed at 3GB heap, so local production-file lint is unverified and CI remains authoritative. Repair commit and exact-HEAD validation pending; no UX work may resume until green.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob `88c73eb523b6e14f769fc10eee5a5ad40b8f93ba` reviewed, including §§6.28–6.29.2. Section 6.29.8 keeps A (Attack/Dodge continuity and public counter hold) separate from B (source-owned AOE root geometry).

## Current task

`UX2-6.29-A-ATTACK-DODGE-CONTINUITY-AND-HOLD-01` — CI-only repairs for the 8-player compact Attack/Dock clearance and stale submitted-preview handoff. Commit and push only these fixes; do not resume UX work until the exact pushed HEAD is green. After CI completes, stop and await the user's next instruction. No Reviewer acceptance is claimed.
