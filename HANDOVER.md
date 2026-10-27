# Current Handover

Repository: `dmoneyUK/three-kingdoms`
Target branch: `ux-v2`; worktree branch: `codex/t3-f1-r3`
Latest source SHA: `55a46f6bf6441395bdea50c7267578764a06a0d0`
Latest design reviewed: `docs/UX2-refine.md` at `c2cd6be09a3a78bfa1368613e7131c13ec731495` (2026-10-27).

## Latest relevant result

**T3-F1 R5-A-F1 — IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-iPHONE REVIEW.** Source `55a46f6bf6441395bdea50c7267578764a06a0d0`; exact-SHA [Actions `40572207968`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40572207968) passed API, lint/fast, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker version `2485eff3-c793-4a90-9285-13e23bf5fe9c`; direct production `/` and `/api/health` both returned HTTP 200, health `{"ok":true,"worker":"available"}`. Focused API privacy regression passed 1/1; local build and `git diff --check` passed. The focused mobile browser check was **SKIPPED — exceeded the five-minute combined local UI-test cap**; exact actor-only face rendering remains for owner iPhone re-review. No user acceptance is inferred.

## Current bounded task — §10.9 W5 Green Dragon Blade

Implement the **Green Dragon Blade AS ATTACK follow-up Frame** only, following `docs/UX2-refine.md` §10.9. The frame must show the real Green Dragon Blade ability and exactly the newly committed Attack CardFace after the original Attack is dodged. Preserve the same source, target and root; do not show the original Attack as a second physical card, treat the follow-up as a cost, or obscure/alter the target's ordinary Dodge decision. Use only server-authored committed proof; preserve legal responses and private Hands.

Acceptance: one focused authenticated four-player mobile scenario at 390×844 verifies the same true follow-up Attack and attribution for source, target and observer, keeps the new Dodge response usable, and reveals no unowned Hand identities. Run only focused fast validation and one local browser scenario capped at five minutes; if it exceeds the limit, stop and record it as skipped. Then run exact-SHA Actions, deployment and production health checks. Final status: **IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE REVIEW**, never USER-ACCEPTED.
