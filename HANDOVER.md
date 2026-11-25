# HANDOVER

**Latest verified delivery:** §10.75 implementation `0e85333dd83b49791e448646d7a49d2313adc2c4` is pushed to `ux-v2`; exact-SHA [Actions 45626531207](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45626531207) passed API, lint/fast tests, browser startup/H4 smoke, D1 migration, deployment and production smoke. Worker version `9d43c451-c2fc-4cc1-865c-10fd39e375cb`. Direct production `/` and `/api/health` returned HTTP 200 (`{"ok":true,"worker":"available"}`). Focused local logic/render tests passed 69/69; API tests passed 14/14; build and diff checks passed. Full local page ESLint attempt overflowed in `react-hooks/rules-of-hooks`; exact-SHA CI lint passed. No local phone/browser test was run; the focused gameplay regression was added but awaits Owner iPhone review. §10.75 is **IMPLEMENTED / DEPLOYED — PENDING OWNER REVIEW**, not accepted.

## Current bounded task — §10.78 FROST-SWORD-SHARED-POOL-AND-DISCARD-DISPLAY-01

**Design:** latest remote `docs/UX2-refine.md`, revision 2026-11-25 08:17 UTC; §10.78. HEAD and `origin/ux-v2` are both `0e85333dd83b49791e448646d7a49d2313adc2c4`.

**Scope:** Migrate only Frost Sword's authorized opposing-player `target_cards` selector to the existing shared tabbed pool used by Dismantle/Steal. Use one active Hand/Equipment row, preserve anonymous Hand positions and actual public Equipment identities, retain mixed-zone selections/count across tabs, obey CurrentAction min/max, and use shared Confirm/authorized Skip without Cancel. Preserve the existing two-card server rule and privacy. Verify actual committed discards, damage prevention, and the §10.76-B/§10.77 effect-frame/H4 integration without duplicating settlement logic.

**Validation boundary:** Preserve accepted Dismantle, Steal, Retaliation, Kirin, Harvest, Inspector and Hand behavior. No local device/browser test per Owner direction; use focused unit/API/privacy checks plus required exact-SHA Actions, deployment and production smoke. Do not claim Owner acceptance.

**Next action:** Inspect current Frost Sword selector routing and shared tab/selection state, then implement only this §10.78 contract. Keep HANDOVER to this single bounded task.
