# Current Handover

Branch: `ux-v2`. Latest design reviewed: `docs/UX2-refine.md §10.18` and §10.17.1.2 (2026-10-20).

## Latest result: BCP-1-F2

- **IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE RE-REVIEW.** Code commit `a66d1ba5b641dbc079595708c8ea0e0b17b7c48d`; CI assertion repair commit `5b5719c21ce742ef8001c05703569e73e29463ca` is deployed. Exact-SHA Actions [39506905518](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39506905518) passed lint/build/fast, API, browser room smoke, D1 migration, Worker deploy and production smoke. Worker version `409364c3-f265-4154-9e96-cb12170a6139`; direct production check returned `/` HTTP 200 and `/api/health` `{"ok":true,"worker":"available"}`.
- Harvest response minis now remeasure the genuine actor Seat for each viewer, avoid the whole Seat, and have a deterministic 6px portrait-edge fallback that protects SWITCH, Inspector, name, HP, equipment, judgement Info, other Seats, pool/H4 and action controls. H4 and local legal response guidance share a target derived from the current proof-backed recipient or current `action.responses`. F1/root layout, H4 position, privacy, timers and game rules were not changed.
- The uploaded trace confirmed event `3e4d5792…` was a real Negation: the actor anchor changed across local/left/centre/right opponent views, but target stayed `(30,396,48×72)` and `pendingLayout` stayed true. No post-deploy multi-viewer trace or real-phone run was performed; required CI's browser job is startup/room smoke only. The existing announcement test was updated for the approved copy; its focused file passed 3/3. Targeted ESLint had 0 errors (15 hook warnings).

## ONE current bounded task: owner phone re-review of BCP-1-F2

On mobile, verify the same committed Negation mini remains beside its true author after switching among all four perspectives, including top-row authors; it is not hidden or left at an old viewer coordinate, and SWITCH/Inspector still work. Confirm H4/local prompt says `Negation: Cancel Harvest for <chooser>?` before a response and `Counter <latest actor>'s Negation?` after one, with `No Negation available. Pass.` preserved where applicable. Keep BCP-1-F1 USER-ACCEPTED/CLOSED. Do not mark F2 USER-ACCEPTED until the owner gives that verdict.
