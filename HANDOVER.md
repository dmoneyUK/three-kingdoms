# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED TEST INFRASTRUCTURE`

## Latest result / CI

`WTK-TEST-PRESET-HANDS-01` shipped in `896938e09ea3462d4bd8994b7cfad7ad1baa6b55`: explicit host-enabled test rooms, persisted server-validated Standard-card presets, and physical-card assignment through the existing post-Hero-selection `beginMatch()` deal. Normal rooms retain random dealing. No feature-specific automated tests are retained per user direction. Local production build and targeted ESLint passed; `db:generate` reports no schema drift. A temporary focused API/browser run before the no-automation instruction passed 6/6 and 2/2 respectively; those test additions were removed and are not acceptance evidence.

Exact-SHA Actions run `38090086059` on `896938e`: **success** for Lint/fast, API, browser startup smoke, and deploy. Production `/api/health` returned `{"ok":true,"worker":"available"}`; the deployed UI displayed the exact `896938e` build SHA. Manual deployed gameplay remains unverified: the available in-app browser restored an older completed match, and macOS Chrome is locked. The existing browser session was not cleared or replaced.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `d966440b487bcbe172d5ea608704cc6945dfe6df` (reviewed; its §6.36 update does not conflict with this direct testing-infrastructure task). Do not modify `docs/UX2-refine.md`.

## Current task

STOP — await a clean/unlocked browser session to perform the deployed four-seat manual acceptance, then hand off for Reviewer/user review. Do not start §6.36 Task 2/3 or other UX work.
