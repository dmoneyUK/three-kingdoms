# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target branch: `ux-v2`

## Latest relevant delivery

- `BORROWED-SWORD-PHONE-01` source `d3010365b68b15658acd798b73ecc218f88970d2`; exact-SHA Actions [41323628038](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41323628038) passed. Worker `3fcf8dde-a25d-4d13-8def-5d01b09a7d6e` deployed; `/api/health` returned healthy. PENDING OWNER iPHONE REVIEW.
- `CONSOLE-01` correction source `197d284e0b1f9f78dd8a427d0f3469b30ff40494`; exact-SHA Actions [41321826159](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41321826159) passed and Worker `bca7e8ba-e4ab-4b35-b0f2-aa5de625c7f7` deployed. PENDING OWNER iPHONE REVIEW.

## Current task

`EQUIP-H4-01 — docs/UX2-refine.md §10.25.3 Step B (B1–B3)` · design revision 2026-11-01, source reviewed at `origin/ux-v2` `d3010365b68b15658acd798b73ecc218f88970d2`.

Source inspection found the normal Equipment path commits the real public `equip` card event and updates the actual Equipment slot, but emits no typed public H4 fact. Thus the physical arrival remains owned by `TableResolutionSequence`, while the existing `PublicInteractionAnnouncementLayer` has no event proof to render. The bounded correction adds a generic validated `CARD_EQUIPPED` fact to that same committed event, routes it through the existing retained snapshot/H4 renderer, and expires its copy after 2.6 seconds. It must not create another CardFace or change equipment gameplay/arrival.

**Preserve boundaries:** genuine event/card/slot identity, equal public projection for all viewers, no hidden Hand disclosure, no false copy without proof, replacement/loss behavior, and all accepted equipment/Inspector semantics. One focused API/projection test set; no broad player/browser matrix. Mark implementation PENDING OWNER iPHONE REVIEW after exact-SHA CI, Worker deployment, and health verification.

## Current implementation state

Uncommitted edits are limited to `app/api/rooms/route.ts`, `app/page.tsx`, `app/public-card-display.tsx`, `game/presentation-semantics.ts`, `game/public-activity.ts`, and focused API tests in `tests/api/{equipment,presentation-semantics,public-activity}.test.mjs`. Root cause and code path are confirmed. Final focused checks pass: semantics/activity 33/33, equipment API 21/21, build, targeted ESLint (0 errors; 15 existing hook-dependency warnings), and `git diff --check`. Review the full diff, recheck latest `ux-v2` Actions state, then commit/push and verify exact-SHA CI/Worker/health. Do not begin §10.27 until this task is deployed and the handoff reaches its review boundary.

**2026-11-01 16:11 UTC validation checkpoint:** `npm run build` passed with existing chunk-size/route-classification warnings; `git diff --check` passed. The focused semantics/activity run was 32/33: the new activity test used a `rootFrameId` inconsistent with its shared snapshot fixture. This is a test-fixture failure, not evidence against production behavior; correct the fixture and rerun this focused command before the API projection check.

**2026-11-01 16:13 UTC validation checkpoint:** Fixed the test fixture and reran semantics/activity (33/33) plus the focused Equipment API file (21/21); the new route test confirms public H4 equality across Host/Alice, real Frost Sword slot arrival, and Blue Steel Sword replacement. Targeted ESLint then failed on a synchronous timer-state reset in `PublicInteractionAnnouncementLayer`; remove that reset, keep the event-keyed expiry callback, and rerun targeted lint plus the 33 pure tests.

**2026-11-01 16:14 UTC validation checkpoint:** Removed the synchronous effect reset; timer expiry remains keyed to the committed event ID, so new events show and prior events cannot replay on polling/view rebases. Final build passed; focused semantics/activity passed 33/33; Equipment API passed 21/21 including the cross-viewer H4 and replacement route; targeted ESLint passed with 0 errors and 15 existing exhaustive-deps warnings; `git diff --check` passed. No local UI/browser run was needed for this projection correction; the owner phone boundary remains required.
