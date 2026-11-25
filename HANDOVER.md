# HANDOVER

**Latest verified delivery:** §10.72 Stauchness H4 correction is implemented at `2d9e0ea1e6f2f1873ccfa5f316a8f1409654fe07`; exact-SHA correction `ea5970eac14a35053ac3ee910fc49b8851ca8201` passed [Actions 45619701891](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45619701891), including API, browser smoke, lint/fast tests, deployment and production smoke. Worker `e03b298a-94b2-4095-bc2d-a173272ac7f9`; direct production home and `/api/health` checks returned HTTP 200. Owner iPhone review remains pending.

## Current bounded task — §10.75 STAUCHNESS-COMPACT-CHOICE-MODAL-01

**Design:** `docs/UX2-refine.md` revision 2026-11-25 08:17 UTC, commit `362ec98da42d9a2f01c13cfbf93589ef05cda1c4`.

**Scope:** Repair the existing Stauchness mandatory `discard_two` choice so taps in the bottom Hand use the same server-authorized selection keys as the choice stage, selection count, and Confirm. Preserve stale-selection clearing and the `take_damage` branch. Compact only this two-option stage; publish the actual chooser through public PAC without exposing private card choices. Preserve game rules, timeout, mandatory choice, shared controls and accepted Hand scrolling.

**Validation boundary:** No local device test. Keep any local UI/browser run under the combined five-minute cap. Use focused selection/API/privacy assertions and required exact-SHA Actions, deployment and production smoke. Owner iPhone review remains pending.

**Next action:** Inspect the existing `CurrentAction.eligibleHandKeys`, authenticated `myHand` mapping, bottom-Hand selection routing, and Stauchness choice-stage state; implement only the §10.75 contract and its focused regression proof.
