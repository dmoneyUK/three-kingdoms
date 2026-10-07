# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

System Menu commit `047e05b230189600b0e9b9650ef01621d360478c` failed exact-SHA Actions run `37561649063` (#821): lint/build passed; browser run had 662 passed and 10 failures from five `ui19.spec.mjs` REST assertions expecting no safe-zone text; `npm test` was not reached and deploy was skipped. Those stale assertions now expect the Stage System Menu while retaining REST chrome/seat proofs; focused cases pass 10/10 and focused ESLint plus `git diff --check` pass. Repair is test-only.

## Design checkpoint

Reviewed the complete current design blob `7e021455c8fdc9e88dc1b3b20d036400da82be44` and compared it with `9f8663afea206be9350153164c2c38e84d54823e`. The substantive change is §5.4 plus new §6: finish non-Hero Sections 1–4 before beginning UX3 Phase A. Current task is within §3 and does not alter deferred Hero/player presentation.

## Current task

`CI-REPAIR-REST-SYSTEM-MENU-ASSERTIONS-01` — local test-only repair is validated 10/10. Commit/push only `tests/browser/ui19.spec.mjs` and this handoff update; wait for exact repair SHA green before resuming `UX2.REFINE-STAGE-SYSTEM-CLUSTER-01`. Then re-read current design and correct/prove the Top Row REST menu-to-Guidance gap (locally measured 2–4px; §3.6 expects 8–12px).
