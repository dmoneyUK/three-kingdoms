# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.4A-BUMPER-HARVEST-MOBILE-CHOOSER-FIT-01` is implemented. The real
server-backed chooser panel is constrained to the viewport; at 320px, all four
52px choice cards and the local Confirm control fit without clipping. Geometry
and no-page-overflow checks passed at 320×740, 390×844, 480×900, and 1440×900.
The timer, menu, Guidance, Dock, and pile checks remain covered. Focused browser
test passed 1/1; build, `node --check`, targeted ESLint, and `git diff --check`
passed. Exact pre-commit remote HEAD `a68472626272680e67c53b6a4e2cfb67e16a90e1`
passed Actions run `37784998759` (all five jobs successful). This task commit's
CI is pending after push. Reviewer acceptance is not claimed.

## Design checkpoint

Re-fetched `origin/ux-v2`; `docs/UX2-refine.md` remains blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`. Re-reviewed §4.10, §§4A.7–4A.10,
§4C.29, and the §4D gate/tasks. Section 6 remains deferred until §§4.10, 4A,
4C.29 and P1–P5 close.

## Current / next task

`UX2.4D-P1-REAL-ROOM-CREATION-BROWSER-PROOF-01` — prove normal room creation
through `POST /api/rooms` (`action: "create"`) reaches the real production game
page in a clean server-backed browser run, without the test-only seed route or
handcrafted action/presentation state. If the local runtime route still fails,
repair it within this task. Preserve the existing Fanjian/§6 uncommitted work;
do not include it in pre-§5 commits.
