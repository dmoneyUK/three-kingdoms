# Current Handover

Branch: `ux-v2`

## Latest result

- **EM-01 Checkpoint A (Harvest):** deployed at `32b22b829c1bfd59a4b533fa36a86b0334a3ad64`; exact-SHA [Actions run 39078356730](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39078356730) passed lint, fast/API/browser-startup checks, D1 migration, deployment and production smoke. Current `/api/health` returned `{"ok":true,"worker":"available"}`. The deployed Harvest regression established that TEST SWITCH works during another viewer's pending choice, preserves the authoritative actor/choice/timer, and keeps Hero Inspector and Hand Card Details reachable.
- **EM-01 Checkpoints B/C (shared overlays):** implemented and deployed at `7cc761c34ecdbbe12e7bb4af852a3975d8873206`; exact-SHA [Actions run 39081904968](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39081904968) passed lint/fast, API, browser startup, D1 migration, Worker deployment and production smoke. Worker Version ID: `2b516f4a-96d7-4342-93bc-dc1f6888ceb5`; production `/api/health` returned `{"ok":true,"worker":"available"}`. Backdrops pass pointer input through; bounded decision panels remain interactive and internally scroll when needed. Shared picker dialogs are nonmodal, Stargazing no longer traps focus, and TEST SWITCH returns focus to the newly selected Local Player Dock. No game rules, server permissions or private-data projections changed. The pre-repair `aa961c0` fast-test failure was the Dock marker typo; the focused test and subsequent complete exact-SHA run passed.
- Local evidence: `npm run build`; Harvest Worker/D1 touch test (1/1); shared real-gameplay matrix (14/14); target-card zone/picker suite (71/71); ESLint for the five changed browser specs; `git diff --check` — all passed. Tests cover authenticated viewers and actual touch/click actions, Harvest switching/inspection, Steal/Dismantle, skill/equipment pickers, mandatory choices, Legacy and Stargazing across mobile/side-seat viewports.
- Latest design reviewed: `origin/ux-v2:docs/UX2-refine.md`, blob `18a9e06e821a575b2ca4f6936760a46beddb2e5e`, §10.16 EM-01.

## Exactly one current bounded task

**UX2-10.16-EM01-NONBLOCKING-CHOICE-OVERLAYS — IMPLEMENTED / PENDING USER REVIEW.** The user can now review Bumper Harvest switching/inspection and the shared selection overlays on phone. Keep U13-F cosmetics and Q1–Q4 paused until this review; do not mark accepted without explicit user acceptance.
