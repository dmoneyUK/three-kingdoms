# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX2 TASK`

## Latest result / CI

`UX2-6.36-03-LONGDAN-ATTACK-AS-DODGE-GRAPH-PROOF` is implemented locally. Server proof now accepts Zhao Yun’s exact `zhao_yun_attack_as_dodge` execution only when one physical Attack is consumed as Dodge; the public event keeps its real Attack CardFace and the typed proof binds the effective Dodge to the exact root/response/resolution/frame/source/target. Projection, snapshot validation and overlay layout use that semantic/physical distinction; all three real-gameplay viewers showed the graph with the physical Attack face and `AS DODGE` label. Focused API (40), presentation/snapshot (64), build and converted-response browser checks passed. A separate ordinary-Dodge browser run passed its graph assertions but failed its existing 20-second timing assertion: the test observer saw the exit class about 687ms before its layout-ready `shownAt`; timers are outside this task. Focused ESLint could not complete locally because Node ran out of heap at both default and 4GB limits. Latest relevant pre-task Actions run `38098403261` succeeded for `41187a4`; remote `e5bf5b2` is a documentation-only head with no run. Task 3 exact-SHA CI/deploy is pending commit.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `d966440b487bcbe172d5ea608704cc6945dfe6df` (reviewed; §6.36.4 Task 3 governs this bounded Longdan proof repair).

## Current task

Finish delivery for §6.36.4 Task 3: commit and push only this repair, verify the exact-SHA Actions run and deployment, record those results, then stop for Reviewer/user visual review. Do not start another task.
