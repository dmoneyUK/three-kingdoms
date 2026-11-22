# HANDOVER — UX2 §10.67 STARGAZING-COMPACT-TWO-ZONE-POOL-01

**Updated:** 2026-11-22 09:48 UTC

**Status:** IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW

**Design reviewed:** `docs/UX2-refine.md` at `158d559445012f1bc4faf9263c9646943a1f82ff`, §10.67 (Owner iPhone verdict 2026-11-22 09:08 UTC).

## Current task

Correct the original §10.67 only. Replace Stargazing's oversized custom face with the same reusable 50×75 CSS px, 2:3 CardFace miniature used by the Steal/Dismantle public target pool. Make four cards in a two-Top/two-Bottom arrangement, both zone labels, and the single Confirm fully visible together without clipping or required scrolling. Preserve accepted zones, copy, card order/identity, drag, keyboard, privacy, and submission behavior.

## Delivery and verification

Implementation commit: `e7fceb4d80290ff001d323334ffba80ef87a0288` (pushed to `ux-v2`). Shared `CardPoolMiniFace` now owns the same authentic 50×75px / 2:3 CardFace used in the public target Equipment/Judgement pool and Stargazing. Removed Stargazing's old large 5:7 face metrics, restored the compact two-zone rows and non-overlay Confirm footer. Four-card 2+2 arrangement remains wholly visible, and existing private card identity/order, drag, keyboard, submission and privacy behavior are preserved.

Validation: focused render/reorder 31/31 PASS; Stargazing API 9/9 PASS; local build, focused ESLint, `node --check`, and `git diff --check` PASS. One focused 440×894 browser scenario PASS (9.1s): exact shared-face presentation and dimensions match, all cards/labels/Confirm fit without scrolling or clipping, touch/keyboard movement works, and the authorized ordered submission occurs once.

Exact-SHA [GitHub Actions run 45008759066](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45008759066) for `e7fceb4d` completed successfully: Lint/fast, API, browser startup smoke, D1 migration, Worker deployment and production smoke all PASS. Cloudflare Worker version: `d53e00c5-8f11-4863-b355-3e2b04a5ccdb`. Live production checks: homepage HTTP 200; `/api/health` HTTP 200 with `{"ok":true,"worker":"available"}`. Remaining gate: Owner iPhone re-review; do not mark USER-ACCEPTED.
