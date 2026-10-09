# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Attack→Dodge now keeps the exact server-proven root in the combined relationship graph while its matching `CurrentAction` is still live, allowing the existing 3,000ms public-read timer to start only after graph geometry is ready. After the hold, the bare Attack root will not reappear. New narrow-phone Attack roots use the existing minimum fit step; wider mobile roots start compact, and an already-rendered root retains its size when Dodge arrives. No tests were added or changed.

Focused existing real server-backed browser spec passed 1/1: `real Attack→Dodge keeps its 3-second public graph without an exit animation under reduced motion`. `git diff --check` passed.

Pre-commit remote HEAD `d99e60b28498b36628d87864c6c67ecbb2213c3c` had no checks; per the user's CI rule, empty status is treated as success. Its prior measured gate, run `38000573876` on `52859d7`, succeeded in 2m48s. The new task commit's Actions result is pending after push.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. The user directly authorized this Attack/Dodge repair; §6.29.1 requires the full committed relation to remain readable for 3,000ms. No Reviewer acceptance is claimed.

## Current task

`UX2-6.29.1-ATTACK-DODGE-READ-WINDOW-AND-CARD-SCALE-01` — commit and push only this production fix plus this handoff. Do not add tests. After push, report the task SHA and actual Actions state; leave further UX scope for the user's next direction.
