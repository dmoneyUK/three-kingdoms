# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target branch: `ux-v2` · worktree branch: `codex/borrowed-sword-phone-01`

## Latest delivery

**§10.25.3 Step B — EQUIP-H4-01: IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW.** Existing production code emits the exact public equip fact and routes the original physical card to its real slot. Verification on 2026-11-01: `tests/api/equipment.test.mjs` 21/21, `tests/api/public-activity.test.mjs` 16/16, `tests/public-equipment-transition.test.mjs` 3/3, and one 390×844 real-gameplay mobile browser flow 1/1 (11.8s). The browser check verified one exact-name equipment H4 on both the owner and opponent views. The test-only regression is part of this delivery. Current deployed source is included in `36636ab79bade41cce4fbcf60c77c0fa19ca9d26`; exact-SHA [Actions 41331804865](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41331804865) passed all four jobs and deployed Worker `3445b10e-1aa3-4788-84a6-8632d14ef755`; production `/api/health` returned HTTP 200. No owner acceptance is inferred.

**§10.25.3 Step A — BORROWED-SWORD-PHONE-01: IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW.** Verified 8/8 focused API cases and one 440×894 browser flow 1/1 (13.1s); same CI/deployment evidence above. **§10.26 CONSOLE-01** is also technically delivered and pending owner iPhone review.

## Current task

**§10.27 M3 — delayed Judgement attachment and later resolution.**

Design reviewed: latest remote `origin/ux-v2` SHA `6e2ab47b71fb56c6ca2ed142c9e02d458e9db734`; `docs/UX2-refine.md` §§10.27.3–10.27.6, especially §10.27.5 M3; `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§2–5 and 8–10. Step A and Step B technical corrections are now in owner-review status; the current bounded task remains M3.

**Preserved M3 implementation (uncommitted):** in `/Users/jingedai/.codex/worktrees/console-01`, branch `codex/console-01`, base `6e2ab47b`. Changes add server-owned public zone-transition proof and delayed-Judgement routing, UI ownership handoff, proof-only stage filtering from H4, and focused regressions. Files: `app/api/rooms/route.ts`, `app/page.tsx`, `app/public-presentation-routing.ts`, `app/public-judgement-transition.ts`, `game/presentation-semantics.ts`, `game/public-activity.ts`, `tests/api/public-activity.test.mjs`, `tests/public-judgement-transition.test.mjs`. Preserve these edits; do not reset, overwrite, or mix them with unrelated work.

**M3 validation so far:** focused command `node --import tsx --test tests/public-judgement-transition.test.mjs tests/api/public-activity.test.mjs` initially failed 3/19 because one retained public fact was duplicated across snapshot projections. The router now reuses shared `publicFactsForEvent` deduplication; rerun passed 19/19. Targeted ESLint passed with zero errors and two pre-existing hook warnings. A prior broad `npx tsc --noEmit` produced over 1,000 repository-wide diagnostics and did not establish a changed-file typecheck. M3 build and final `git diff --check` remain outstanding. No M3 commit, push, exact-SHA CI or deployment exists.

**Resume point (2026-11-01 17:43 UTC):** Step B source/tests/docs are ready for one scoped commit after the commit-time CI check. Then fast-forward the preserved M3 worktree only across the non-overlapping Step B docs/test commit, confirm its M3 diff is unchanged, and finish M3 with focused validation and required exact-SHA CI/deployment. Keep local UI/browser testing within five minutes total for M3. Do not mark any task USER-ACCEPTED.
