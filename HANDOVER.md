# Current Handover

Repository: `dmoneyUK/three-kingdoms`
Target branch: `ux-v2`; worktree branch: `codex/t3-f1-r3`
Latest source SHA: `634bd35268bff32cd551206519a230c7109b6c62`
Latest design reviewed: `docs/UX2-refine.md` §10.10.3.1 at `c2cd6be09a3a78bfa1368613e7131c13ec731495` (2026-10-27). The new R5-B phone-review record does not change the approved R5-A-F1 scope.

## Latest relevant result

**T3-F1 R5-C — IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE REVIEW.** Source SHA `634bd35268bff32cd551206519a230c7109b6c62`; exact-SHA [Actions `40567030837`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40567030837) passed Lint/fast, API, browser startup/room smoke, deploy and production smoke. Cloudflare Worker version `86c70ab2-5e16-4b6d-85bb-39675d985ce4`; deployment smoke passed for `/` and `/api/health`. A direct `/api/health` check at 19:23 UTC returned HTTP 200 and `{"ok":true,"worker":"available"}`. The focused local picker browser retry was not repeated after the 32×32 Details hit-target correction because the five-minute UI-test budget was exhausted; owner iPhone re-review remains required.

## Current bounded task — T3-F1 R5-A-F1

**READY TO EXECUTE — owner-approved private result face for concealed-Hand Steal.** Follow the current approved plan in `docs/UX2-refine.md` §10.10.3.1. Bind a private proof of the exact server-chosen CardFace to the committed Steal settlement event, and return it only to the authenticated source/recipient. In `app/page.tsx`, accept it only when room, settlement event/root, source, target, source zone and authenticated viewer all match; pass a viewer-local face override to the existing result group only for the thief. Every other viewer must continue to receive the anonymous back. Missing, stale or mismatched proof fails closed to the back.

Preserve public settlement payloads and existing privacy guards. Do not infer the face from hand diffs, newest-card order, local selection, or TEST SWITCH display identity. No change to game rules, Hand values, legal selection, Negation, H4, Inspector, R5-C picker or result-group lifecycle. Preserve public Equipment/Judgement Steal and Burning Bridges result faces after commitment. Clear scoped private result state on authenticated viewer changes.

Acceptance: one focused authenticated Worker/D1 four-player mobile scenario at 390×844 chooses one of multiple concealed Hand cards. Verify the thief sees the exact committed CardFace; victim and observer see only the back and no private result identity in their API/projection/DOM; no face appears before commit; polling, reload, TEST SWITCH and a second Steal do not leak or reuse stale proof. Preserve the existing R5-A result placement/read/retirement and R4 accepted behavior. Local UI/browser testing is capped at five minutes; use narrow service/privacy tests, then required exact-SHA CI, Worker deployment and production health. Final status must be **IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-iPHONE REVIEW**, never USER-ACCEPTED.

## Progress — 2026-10-27 UTC

- 19:23 — R5-C exact-SHA Actions completed successfully, including deploy. Worker version and production health were verified; R5-C is closed technically, pending owner phone re-review.
- 19:24 — At the safe task boundary, reviewed the latest remote §10.10.3.1 and autonomous workflow. Selected the already owner-approved R5-A-F1 as the sole next bounded task; no implementation changes for it yet.
- 19:31 — Inspected `choose_target_card`, authenticated `roomState`, room normalization and the existing Steal result path. Implemented an actor-private event tied to the exact public settlement event/root, filtered it out before timeline/presentation projection, added a viewer-scoped normalized DTO and gated the result CardFace on authenticated `room.meId` plus matching room/event/root/source/target. Expanded the existing API privacy case to four seats and a two-card Hand.
- 19:32 — A direct `node --import tsx --test --test-name-pattern=... tests/api/stratagems.test.mjs` attempt exited before assertions with `ECONNREFUSED localhost:3137` because the test Worker was not started. This is a harness invocation failure, not a product test result. `npm run build` passed with the existing chunk-size/static-classification warnings; `git diff --check` passed.
- 19:34 — Fetched and fast-forwarded the task branch to `origin/ux-v2` at `c2cd6be`; reviewed the new §10.10.3.1 R5-B phone-review addition and confirmed it does not change the active R5-A-F1 plan. This HANDOVER progress update is being committed separately; implementation remains uncommitted and API/UI validation remains incomplete.
- Resume point — select the narrowest existing API runner that starts the Worker/D1 harness for the updated Steal privacy case; avoid running the whole API suite if the harness cannot isolate it. Then perform at most one focused 390×844 browser scenario within the five-minute local UI cap.
