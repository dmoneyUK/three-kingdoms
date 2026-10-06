# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`9f52db6` (run #752, `37425349025`) failed at `npm run lint` on the unused `_localControl` binding in `tests/browser/quick-test-viewer-reprojection.spec.mjs:9`; build, browser tests, and `npm test` were skipped. Run #749 succeeded for an earlier SHA and does not validate `9f52db6`. The local full lint also traverses ignored `playwright-report/trace/assets` and reports generated bundle errors; targeted ESLint isolates the CI-reported source issue. The fix passes targeted ESLint, the focused browser test (1/1), and `git diff --check`; the repair commit's CI result is pending.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.56, 0.66, 0.75, 12.7, and 12.9. Quick Test changes only viewer projection/private controls; shared public causal facts stay fixed and viewer switching must not replay events.

## Current task — CI-LINT-REPAIR-01 (READY TO COMMIT)

Replace the unused destructuring binding in the Quick Test viewer-reprojection browser test without changing its public-snapshot comparison or assertions. Commit only this CI repair and the handoff update, push to `ux-v2`, and record the exact resulting Actions run/status; do not claim CI green until observed.
