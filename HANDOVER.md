# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target: `ux-v2`
Design authority: `docs/UX2-refine.md` §10.10.1, reviewed at revision `79dd8e56d809a576932cc21c323b5f5f86c5eb72`.

## Latest relevant result

ST-DM-NEG-UX-01 is pushed to `ux-v2` as `9278cb2677c2abf547a98527137193979f129dae`. Exact-SHA Actions run [41197784356](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41197784356) passed lint/fast, API, browser-smoke and deploy. Cloudflare Worker version: `654c6add-f53b-4bff-8fe8-bcf274f77641`. Workflow smoke and direct production health check passed (`{"ok":true,"worker":"available"}`).

## Current bounded task — ST-DM-NEG-UX-01

**Status: IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE REVIEW.** Steal passed the earlier owner phone review; Dismantle is **NOT PHONE TESTED**. Do not mark accepted.

Scope remains limited to the approved shared Steal/Dismantle presentation: stable lower-centred PAC; remove duplicate result-card transport while preserving genuine root/committed Negation cards, privacy, legal picker, zones and card conservation; proof-backed H4; author-seat parking. No game rules or permissions changed.

### Current execution and validation

- **2026-10-31 11:15–11:28 UTC:** Implemented the shared PAC/H4 and duplicate-result cleanup, preserving genuine root/Negation cards, public discard proof, actual zones and private Steal receipt. Base code commit `60dbd8a` was pushed; build, targeted lint, 36 announcement/activity tests and 29 stratagem API tests passed.
- **2026-10-31 11:31–11:39 UTC:** A focused 440×894 run exposed `reveal` cards also carrying `is-parked`, which hid the committed root while layout was pending. Changed the shared class mapping so `reveal`, `move` and `parked` are mutually exclusive. After rebuilding `dist`, the root became visible and parked at its real source anchor. A post-settlement screenshot showed the 48×72 mini beside its source Dock; DOM preserved its previously measured author reservation while a fresh layout pass remained pending. The focused assertion now checks exact reservation geometry in that state.
- **2026-10-31 11:37–11:39 UTC:** The final bounded mobile run exceeded its 90-second cap and did not complete; no more local UI/browser tests were run. `npm run build` and `git diff --check` passed. Do not report a final pass for the focused flow.
- **2026-10-31 11:39–11:44 UTC:** Follow-up commit `9278cb2` was pushed. Exact-SHA Actions run `41197784356` passed all required jobs; Cloudflare deployed Worker `654c6add-f53b-4bff-8fe8-bcf274f77641`; production health returned `{"ok":true,"worker":"available"}`.

Stop for owner iPhone review. Do not claim Dismantle phone acceptance.
