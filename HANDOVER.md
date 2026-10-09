# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Task A implementation is locally complete: fixed stale Dodge causal-envelope reuse, preserved the complete Attack/Dodge and Negation counter graph for the viewer-local 3,000ms read, and kept public polling current without delaying server actions. Focused browser validation passed 8/8 core cases, 4/4 converted/observer/timeout cases, and a post-lint-fix Negation retest 1/1; build, split targeted ESLint, and `git diff --check` passed. Latest remote Actions run `37956890975` for base SHA `0a840be400f3aad9a9936c2189cfbabb58c0c2ac` failed Browser shard 1; its other validation jobs passed. GitHub's unauthenticated log download returned 403 and artifact download 401, so no console log is claimed. Task changes are uncommitted; exact outgoing-SHA CI remains pending.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob `88c73eb523b6e14f769fc10eee5a5ad40b8f93ba` reviewed, including §§6.28–6.29.2. Section 6.29.8 keeps A (Attack/Dodge continuity and public counter hold) separate from B (source-owned AOE root geometry).

## Current task

`UX2-6.29-A-ATTACK-DODGE-CONTINUITY-AND-HOLD-01` — implementation and focused local evidence are complete. Next: recheck the latest remote CI immediately before commit, commit/push only Task A files with the related CI repair, then wait for that exact SHA's Actions result. Close Task A only when it is green; re-read current design at that boundary before planning Task B. No Reviewer acceptance is claimed.
