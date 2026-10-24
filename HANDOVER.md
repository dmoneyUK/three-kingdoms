# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Phone-only validation; maximum 8 players.

## Latest result

**`UX2-10.10.3.1-T2-F1-STEAL-SETTLEMENT-COPY` — IMPLEMENTED / DEPLOYED, PENDING USER iPHONE RE-REVIEW.** Source/release SHA `51e46f66622d387deb5e2202c8296cfc3969fcf0`; exact-SHA [Actions `40124988163`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40124988163) passed API, lint/fast, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker `4b77c0d6-43d2-40da-a624-26c75d005ca3`; production `/` returned HTTP 200 and `/api/health` returned `{"ok":true,"worker":"available"}`. Local unit copy/privacy 3/3, build, and API/D1 305/305 passed. Four-viewer mobile browser evidence exercised all three Steal source zones with the concise sentence, and the separate Negated/no-settlement case passed. The enclosing six-path browser run later failed on its Burning Bridges/Hand `data-public-card-settlement-outcome` assertion; that run is not claimed green. No owner phone acceptance is claimed.

**Latest design reviewed:** upstream `docs/UX2-refine.md` revision `2d257592390603813814719771af2d8222ee98b7`, including §10.13.5.1's 2026-10-24 P0 participant-name correction. Status updates in the current working change move delivered T2/T3 and W3 work to pending phone review. The current task is the next independently testable P0 substep; the P1 LUST Frame styling remains later.

## Exactly one current bounded task

**`UX2-10.13.5.1-U13-E-F-R1-P0-FULL-PLAYER-NAMES` — P0, IN PROGRESS.** Fix only compact LUST Duel participant copy: remove destructive name truncation from the COST and generated-Duel messages, preserve first/second and first-actor order from proven participant IDs, and display complete names in the existing H4 band with safe multiline wrapping (including full final digits and CJK names). Keep H4 placement, accepted U13-E composition, LUST result copy, frame styling, gameplay, privacy and legal actions unchanged. Add focused phone regression for both first-actor orderings, four independent viewers, normal and long/CJK names, and verify H4/Seat/Dock non-overlap at the task's authorized mobile cases. Then check the current remote-head CI gate, commit/push, verify exact-SHA Actions/deployment/production health, update this handoff, and review the latest design before selecting the next single task.
