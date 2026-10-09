# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Task A and the related Browser-shard repair are locally ready. The root now targets the full Local Dock, narrow-screen candidate search clears the top Seat row, and hidden controls are not treated as visible obstacles (Attack still reserves its Deck/Discard lane). The stale blocked-card copy assertion now checks semantic card identity. Focused real-gameplay evidence: four-player private selection, 10 independent selected/unselected windows, 10 dual-viewer polling windows, 6 converted/observer/timeout/reconnect/preemption cases, 4 dense layouts, 3 Negation/Dismantle paths, Attack and Negation 3-second holds; build, targeted ESLint, and `git diff --check` pass. Base `a01ff339978ef96323750b4c2a7aa7e2cde92ea5`: run `37973109533` failed Browser shard 1; duplicate `37973111537` was cancelled; other lint/API/browser-shard-2 jobs succeeded. Public annotations show only generic exit code 1; log download returned 403. Outgoing SHA is not yet pushed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob `88c73eb523b6e14f769fc10eee5a5ad40b8f93ba` reviewed, including §§6.28–6.29.2. Section 6.29.8 keeps A (Attack/Dodge continuity and public counter hold) separate from B (source-owned AOE root geometry).

## Current task

`UX2-6.29-A-ATTACK-DODGE-CONTINUITY-AND-HOLD-01` — ready to commit with the related CI repair; Task A remains open until the exact pushed SHA passes Actions. Then re-fetch/re-read the design and plan Task B. No Reviewer acceptance is claimed.
