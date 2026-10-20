# Current Handover

Branch: `ux-v2`. Latest reviewed design: `docs/UX2-refine.md §10.18` (2026-10-20).

## Latest result and open acceptance

- ST5-1 commit `76d5b89faad227725d3a184468f00e0cefb4a035` is deployed. Five-player phone Seats use two top-aligned content-sized rows with an 8–16px gap; relative seat mapping and 108px Seat height are preserved. No gameplay, public/private projection, H4 or card timing changed.
- Mobile validation: five required viewports, actual SWITCH/Inspector taps, Harvest geometry and other-count regressions passed (9/9); real five-player Harvest + committed Negation author parking passed (1/1). Build, targeted ESLint and `git diff --check` passed.
- Exact-SHA Actions run [39504188992](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39504188992) passed lint/fast, API, browser startup/room smoke, D1 migration, Worker deploy and production smoke. Worker `8e86bd75-5bfd-45c3-9420-7b8523870fe4`; direct production `/` returned 200 and `/api/health` returned `{"ok":true,"worker":"available"}`. Status: **IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE REVIEW**, not accepted.
- `BCP-1-F1` and `INS-5-F1-R` remain USER-ACCEPTED/CLOSED; H4 is unchanged. `BCP-1-F2` remains open. Owner's 22:36 phone screenshots show a Q♠ committed Negation mini in one view but absent after switching to Xiahou Dun; the public pool's J♠ Negation is a different card and remains available. This is the same F2 issue. Add four-player top-row view switching to future F2 re-review; screenshots alone do not identify whether projection, anchor recomputation or occlusion caused the loss.

## ONE next bounded task: INS5-2

Implement only the five-player mobile selected-Hero Inspector anchor in `docs/UX2-refine.md §10.18.2`, following ST5-1's preserved Seat mapping and safe geometry. Keep accepted INS-5-F1-R content and all server-owned permissions/private data unchanged. Validate on phone viewport sizes only. Do not begin BH5-1 in this slice.
