# Current Handover

Branch: `ux-v2`

## Latest result

- **EM-01:** deployed on `32b22b8` / `7cc761c`; exact-SHA runs `39078356730` and `39081904968` passed. It remains **PENDING USER REVIEW**. Do not mark accepted.
- **BCP-1:** Harvest root/pool separation, compact public pool, independent Info, actor-only Confirm, local viewer/action-scoped selection, and same-card deselect are implemented. Server `choose_harvest` authorization and public taken status are unchanged. Commits: `8b7fd9a`, `50e9bb6`.
- **BCP-1 validation/deployment:** focused browser run passed 6/6; SWITCH/selection touch test passed; build passed. Exact-SHA Actions run `39114579762` for `50e9bb6f8c67574214436e3ca49a7547faca1b64` passed API, lint/fast, browser startup smoke, D1 migration, Worker deployment, and production smoke. `/api/health` returned `{"ok":true,"worker":"available"}`. BCP-1 is **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, not accepted.
- **BCP-2 local validation:** mandatory Steal/Burning Bridge picker is compact, removes Cancel, keeps Info separate from selection taps, supports retap deselect, and pins Confirm inside the panel. CurrentAction and server choice authorization remain unchanged. Real browser regression passed 21/21 across 390×700, 390×844, 440×766, 480×900, and 1440×900, including one-card Hand-only and Equipment-only cases, switch/Inspector/privacy, public Info, scrolling, and legal submission. `test:fast` passed 280/280 after updating old Cancel assertions; focused TSX tests passed 45/45; focused ESLint and build passed. Exact-SHA run `39116364899` for `d29f028fa9c3896fc0c0ba37e40f7f5f56f3a3f2` passed API, lint, build, and browser smoke but failed three stale `Cancel` expectations in `tests/active-skill-interactions.test.mjs`, so deployment was skipped. The assertion updates are local and need a new exact-SHA run. App/page lint hit the local Node heap limit. Do not mark accepted.
- **Latest design reviewed:** `origin/ux-v2:docs/UX2-refine.md`, blob `aa979ce2b4e33aadaa5c5b61f5f2adb1619c997e`, §10.17.

## Exactly one current bounded task

**UX2-10.17-BCP2-TARGET-CARD-PICKER-COMPACT-01 — CI FIX / EXACT-SHA DELIVERY IN PROGRESS.** Commit and push the BCP-2 edge-case browser coverage, updated retap/no-Cancel unit assertions, and this handover. Verify the new exact-SHA CI and deployed Worker before starting BCP-3. Preserve untracked user file `HANDOVER 3.md`.
