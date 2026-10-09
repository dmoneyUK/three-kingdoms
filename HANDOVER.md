# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Task A commit `b06fa59e4a2517f9dbb60ce844073142fc8c8743` failed Browser shard 1 in run `37985293129` (API/Lint and shard 2 passed). Local shard reproduction found Duel at 1440×900 shifted 13.6875px because the new 8px Dock correction affected every root type; the repair now scopes it to single-target Attack→Local Dock. Added per-shard Playwright report/trace artifact upload (14-day retention). After the repair, build, exact Duel geometry, and four-player Attack Dock-endpoint tests pass. The local shard was stopped after 142 passed, this one failure, and two interrupted; 304 did not run. Actions annotations remain generic; unauthenticated log/artifact downloads returned 403/401.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob `88c73eb523b6e14f769fc10eee5a5ad40b8f93ba` reviewed, including §§6.28–6.29.2. Section 6.29.8 keeps A (Attack/Dodge continuity and public counter hold) separate from B (source-owned AOE root geometry).

## Current task

`UX2-6.29-A-ATTACK-DODGE-CONTINUITY-AND-HOLD-01` — repair commit ready; check latest remote CI before commit. Close only when the exact repair SHA is green and its shard-specific Playwright report artifacts are present. Then re-fetch/re-read the design and plan Task B. No Reviewer acceptance is claimed.
