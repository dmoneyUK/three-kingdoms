# Current Handover

Repository: `dmoneyUK/three-kingdoms`

Target: `origin/ux-v2`; worktree branch: `codex/t3-f1-r5-a-f1`

Latest design reviewed: `docs/UX2-refine.md` §10.8.2.2 / §10.24 at `b632b59f06f4af2bf3c4e8dd01b79f82ba76cdb9`.

## Current bounded task

**H2-G3 F2-R2 — Inspector internal reflow. IMPLEMENTED LOCALLY / PENDING CI AND DEPLOYMENT / NOT ACCEPTED.** Preserve the mobile Inspector's outer size, safe-zone bounds, position and close/open behavior. Move the single Hero/player names, HP, Hand count and wrapped skills beside a taller portrait; align the two Judgement and four Equipment slots in a shared bottom strip with equal panel heights and equal slot footprints (≤1 CSS px). No seat direction, seat geometry, game rules or privacy changes.

## Progress and validation

- 2026-10-27 23:47 UTC — Recorded the original 6/8-phone Inspector dimensions and confirmed the old internal Judgement placement conflicted with the approved layout. Existing deployed source baseline: `0928d169d4d38bc9e019c439c53823c8a15d5eb4`; Actions `40581216924` passed and Worker `cbf5d147-2448-4200-97f1-1d298250ca52` was healthy.
- 2026-10-27 23:53 UTC — First focused geometry run failed: Inspector height was +14.70 px because a superseded high-specificity grid still controlled Judgement and Equipment. Removed that obsolete rule and tuned the scoped 6/8-phone grid; intermediate sizing attempts also failed before the final 2 px zone gap matched the original frame.
- 2026-10-28 00:01 UTC — Focused 390×700 six-seat long-name/skill-wrap regression passed 1/1 (7.3 s). Targeted ESLint passed with 0 errors and 2 existing `page.tsx` hook warnings; `git diff --check` passed.
- 2026-10-28 00:01 UTC — Focused 390×700 six-seat and 390×844 eight-seat Inspector geometry regression passed 1/1 (9.3 s). It verifies both original outer dimensions within 1 px, taller art, right-side identity, aligned equal-height lower zones, six equal slots, and no horizontal overflow.
- Remote `ux-v2` advanced from `0fd7863c` to `b632b59f` through documentation-only commits while this task was in progress. The latest design remains compatible. A malformed local duplicate ref was preserved as `codex/t3-f1-r5-a-f1-preserved-20261027`; fetch then succeeded. Source changes remain uncommitted and must be rebased onto the latest `origin/ux-v2` before delivery.

## Delivery / resume point

**No task commit, push, exact-SHA CI, Worker deployment or production smoke has occurred for F2-R2.** Before committing, recheck the latest `ux-v2` push-triggered Actions state. Rebase this scoped change onto `origin/ux-v2`, run `git diff --check`, commit only `HANDOVER.md`, `app/page.tsx`, `app/sequence-overrides.css` and `tests/browser/opponent-inspect-hero-focus.spec.mjs`, then push and wait for that exact commit's required Actions and Worker health checks. Record the actual SHA, run URL/jobs, Worker version and production result here. Final status must be **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**. Do not mark accepted.
