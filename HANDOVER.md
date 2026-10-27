# Current Handover

Repository: `dmoneyUK/three-kingdoms`

Target: `origin/ux-v2`; worktree branch: `codex/t3-f1-r5-a-f1`

Base SHA: `b4e2ef86bcd14fa614a2bac7f3244a5c6e356370`

Source SHA: `0928d169d4d38bc9e019c439c53823c8a15d5eb4` (pushed to `origin/ux-v2`)

Design reviewed: `docs/UX2-refine.md` §10.10.3.1 at `b4e2ef86bcd14fa614a2bac7f3244a5c6e356370`.

## Current result

**T3-F1 R5-A-F1 — IMPLEMENTATION PUSHED; EXACT-SHA CI/DEPLOYMENT PENDING; NOT ACCEPTED.** Prior deployment `55a46f6bf6441395bdea50c7267578764a06a0d0` / [Actions 40572207968](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40572207968) passed, but owner phone review found the Steal actor still sees a back. Latest design confirms the frontend omitted `rootResolutionId` when constructing the Steal settlement action, making its existing strict private-proof match fail. Current code source `0928d169d4d38bc9e019c439c53823c8a15d5eb4` is pushed; exact-SHA [Actions 40581216924](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40581216924) was observed **IN_PROGRESS at 20:47:52 UTC**. Worker deployment and production health are pending.

## Execution log — 2026-10-27 UTC

- 20:40 — Reviewed latest design and source. Confirmed `SingleTargetCardJourney` already enforces the correct event/root/viewer/private proof; only typed `rootResolutionId` plumbing was missing. Latest push-triggered CI for `origin/ux-v2` code SHA `55a46f6` was green.
- 20:43 — Added optional `settlement.rootResolutionId`, passed the already validated Steal candidate value, and strengthened the existing four-viewer phone scenario to assert the actor's Peach identity/name/rank/suit plus private-proof root ID. Other viewers retain back-only and no-identity assertions.
- 20:43 — `npm run build` passed.
- 20:44 — One filtered four-player 390×844 browser run started; local Wrangler Worker exited with a ProxyWorker error (`browser-worker.log`, 20:44:54 UTC). The run was interrupted without a behavioral result; no retry or broader UI test will be started.
- 20:47 — Targeted ESLint completed with 0 errors and 15 React-hook warnings; `git diff --check` passed.
- 20:47 — Committed as `0928d169d4d38bc9e019c439c53823c8a15d5eb4` and pushed to `origin/ux-v2`; exact-SHA Actions run `40581216924` is in progress.

## Current bounded task

Finish only T3-F1 R5-A-F1: preserve the strict actor-private proof match while passing the validated root-resolution ID through the Steal action. Do not change backend proof semantics, public target-card movement, layout, timing, or other R5 work. Source and focused regression are pushed; the local mobile browser attempt has no result because the Wrangler Worker exited, and no local UI retry will be made. Wait for exact-SHA Actions/deployment and production health, then record actual results here. Final status must be **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**.
