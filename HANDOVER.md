# Current Handover

Branch: `ux-v2`

## Latest result

- **EM-01 Checkpoint A (Harvest):** deployed at `32b22b829c1bfd59a4b533fa36a86b0334a3ad64`; exact-SHA [Actions run 39078356730](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39078356730) passed lint, fast/API/browser-startup checks, D1 migration, deployment and production smoke. Current `/api/health` returned `{"ok":true,"worker":"available"}`. The deployed Harvest regression established that TEST SWITCH works during another viewer's pending choice, preserves the authoritative actor/choice/timer, and keeps Hero Inspector and Hand Card Details reachable.
- **EM-01 Checkpoints B/C (shared overlays):** local implementation and focused browser regression are complete; exact-SHA CI/deployment for this checkpoint is pending. Backdrops pass pointer input through; bounded decision panels remain interactive and internally scroll when needed. Shared picker dialogs are nonmodal, Stargazing no longer traps focus, and TEST SWITCH returns focus to the newly selected Local Player Dock. No game rules, server permissions or private-data projections changed.
- Local evidence on the current working tree: `npm run build`; Harvest Worker/D1 touch test (1/1); shared real-gameplay matrix (14/14); target-card zone/picker suite (71/71); ESLint for the five changed browser specs; `git diff --check` — all passed. Tests cover authenticated viewers and actual touch/click actions, Harvest switching/inspection, Steal/Dismantle, skill/equipment pickers, mandatory choices, Legacy and Stargazing across mobile/side-seat viewports. Full exact-SHA CI/deployment remains the delivery gate.
- **CI repair:** exact-SHA Actions run [39081711636](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39081711636) for `aa961c0e1a32989af588d3862cc91b8f62676708` failed one of 280 fast tests: the Local Player Dock's original-target marker used a nonexistent property. Restored `interactionRoles.isOriginalTarget`; the focused regression now passes 1/1. This repair is being pushed separately; its exact-SHA validation and deployment remain pending. The failed run did not deploy.
- Latest design reviewed: `origin/ux-v2:docs/UX2-refine.md`, blob `18a9e06e821a575b2ca4f6936760a46beddb2e5e`, §10.16 EM-01.

## Exactly one current bounded task

**UX2-10.16-EM01-NONBLOCKING-CHOICE-OVERLAYS — P0; CI REPAIR READY, EXACT-SHA VALIDATION PENDING.** Push the isolated Dock marker correction, wait for its exact-SHA Actions and Worker/D1 deployment/health, then return the deployed result for user phone review. Do not resume U13-F cosmetics or Q1–Q4 before that review; do not mark accepted without explicit user acceptance.
