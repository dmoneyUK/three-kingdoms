# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

§6.31 UI changes are ready locally: paired compact Attack/Dodge faces and 5.5px green authorship tethers; 20-second labels sit beside their card on mobile without covering the red interception path; removed only the long menu note. `npm run build`, existing real server-backed Attack→Dodge scenarios at 390×844 and 480×900, one-off 440×844, `room-safety-render` (19/19), test-file ESLint, and `git diff --check` passed. Existing gameplay assertions confirm the unchanged 19.8–20.2s hold. Targeted multi-file ESLint hit local Node heap OOM; the standalone menu fixture could not boot (`process is not defined`). The compact menu was visually inspected in the real gameplay build; trace/Exit behavior code was not changed. Latest observed push-triggered Actions run `38064028420` is success for `824bbd87`; current remote HEAD `bae361a` adds only the reviewed design-document consolidation and has no newer run. This task's code is not yet CI-validated.

## Design checkpoint

Reviewed current `docs/UX2-refine.md` blob `9958aad43d4c14a5e1995923590b27213f19dc3d` and the full change from `eefc27d`; retired §4D tasks and §5 deferral are historical, while §6.31 mobile sizing/arrow/menu requirements remain compatible with this task. §6.32 memory profiling is a separate area, not part of this task. Remote docs-only HEAD `bae361a` was safely fast-forwarded.

## Current task

`UX2-ATTACK-DODGE-MOBILE-ARROW-AND-TRACE-MENU-01` — commit/push the scoped UI refinement and report the exact SHA and Actions/deploy state. Then stop for the user's visual review of the server-backed 390×844, 440×844 and 480×900 screenshots; do not claim UX acceptance. No new test cases, timing/proof/gameplay changes, or CI-selection changes.
