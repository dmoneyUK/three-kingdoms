# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Attack→Dodge now retains the captured, server-proven root + Dodge graph for 3,000ms of actual graph-ready visibility per viewer. Temporary proof/layout gaps no longer discard the held graph or reset its remaining visible time; a different authoritative root supersedes it immediately. No test files were added or changed.

Three existing server-backed browser specs passed: four-player Attack→Dodge, reduced-motion three-second hold, and immediate superseding Attack. `git diff --check` passed. Targeted ESLint could not complete: Node ran out of heap at both default and 4GB limits. Current remote HEAD `7f7f979e8b5e09c3ab692c57a9a442f2a3c2e3b3`, Actions run `38002051167` (#967), was observed Success before this change; this change's CI/deploy is pending.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. §6.29.1 remains the authority; no Reviewer acceptance is claimed.

## Current task

`UX2-6.29.1-ATTACK-DODGE-3S-VISIBLE-HOLD-03` — verify the pushed change in the real four-player Attack→Dodge path, including the complete graph remaining readable for three seconds; keep §6.29.1 open until the user's visual confirmation and remaining acceptance are complete.
