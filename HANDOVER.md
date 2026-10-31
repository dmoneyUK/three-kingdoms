# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target: `ux-v2`
Design authority: `docs/UX2-refine.md` §10.10.1, reviewed at revision `79dd8e56d809a576932cc21c323b5f5f86c5eb72`.

## Latest relevant result

The main ST-DM-NEG-UX-01 implementation is pushed as `60dbd8aa78ac72fac500dfa7758b9c9f5792b5e2`. Exact-SHA Actions run [41196721516](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41196721516) passed lint/fast, API, browser-smoke and deploy. Cloudflare Worker version: `39f5c9ca-0e27-4f4c-a8ba-de6d60c46b82`; production health check passed.

A minimal follow-up is now locally modified and **not yet committed, pushed or deployed**. It makes reveal/move/parked classes mutually exclusive and corrects the focused test's handling of a visible, retained author reservation while fresh layout measurement is pending.

## Current bounded task — ST-DM-NEG-UX-01

**Status: FOLLOW-UP IMPLEMENTED LOCALLY — PENDING EXACT-SHA CI/DEPLOY; PENDING OWNER PHONE REVIEW.** Steal passed the earlier owner phone review; Dismantle is not phone tested. Do not mark accepted.

Scope remains limited to the approved shared Steal/Dismantle presentation: stable lower-centred PAC; remove duplicate result-card transport while preserving genuine root/committed Negation cards, privacy, legal picker, zones and card conservation; proof-backed H4; author-seat parking. No game rules or permissions changed.

### Current execution and validation

- **2026-10-31 11:15–11:28 UTC:** Base implementation completed, committed/pushed as `60dbd8a`; all exact-SHA Actions jobs passed and Worker deployed as recorded above. Local build, targeted lint, 36 announcement/activity tests and 29 stratagem API tests passed; diff check passed.
- **2026-10-31 11:31–11:34 UTC:** A focused 440×894 flow exposed a hidden committed root during the reveal. Cause: `PublicJourneyCard` assigned `is-parked` to reveal-phase cards, so pending-layout CSS hid them. Changed phase classes to be mutually exclusive. After rebuilding `dist`, the mobile flow confirmed the root becomes visible and parks at its real author anchor. No gameplay, privacy or permission code changed.
- **2026-10-31 11:34–11:37 UTC:** The same flow showed a visible, 48×72 root retained 11px from its local Dock while a same-viewer placement measurement remained pending. The DOM marked the prior placement as an authentic author reservation; screenshot showed it under the source Dock. Updated the focused assertion to verify that reservation geometry when pending, and to keep checking visibility, correct author, no Hero overlap and no other-seat overlap.
- **2026-10-31 11:37–11:39 UTC:** One bounded rerun exceeded its 90-second cap and was stopped. It did not yield a final pass. No more local UI/browser tests are authorized for this task. `git diff --check` passed; the latest `npm run build` passed after the source fix.

### Next action

Review only the current diff, commit and push `app/public-card-display.tsx`, `tests/browser/target-card-real-gameplay.spec.mjs` and this handoff update. Wait for exact-SHA required CI, Worker deployment and production health. Record those actual results here, then stop for owner iPhone review. Keep Dismantle marked **NOT PHONE TESTED**.
