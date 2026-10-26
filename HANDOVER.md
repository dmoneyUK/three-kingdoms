# Current Handover

Target branch: `ux-v2`. Phone-only. Current design: `docs/UX2-refine.md` §5.3, including this task's expired-session/trace recovery requirement.

## Current task — Exit expired games and retain trace download access

**Status: IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE REVIEW.**

### Result

The current polling path cleared an expired room and removed its in-game System Menu while suppressing the reason on quiet polls. Manual `leave()` cleared React state but left `three-realms-session`, so reload could restore the departed room. The UX trace itself remained in tab `sessionStorage`.

The fix clears the saved session on explicit exit and current-session expiry, returns expired/invalid sessions to the entry page with an explanation, and keeps trace export available on the entry and render-error recovery screens. Export controls now include a visible `Save trace file` fallback if the browser does not start the download automatically. Existing privacy-filtered JSON export and server/game rules remain unchanged.

Source SHA `485caf7a880489244d4f16faca9f0c3a36522610`. Exact-SHA [Actions 40332537139](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40332537139) passed Lint/fast, API, browser startup/room smoke, D1 migrations, Worker deployment and production smoke. Worker version `6a427408-ad87-4961-a49e-dd26381aadd7`. Direct production checks: `/` returned HTTP 200; `/api/health` returned HTTP 200 and `{"ok":true,"worker":"available"}`.

### Validation and execution record (UTC)

- 2026-10-26 13:36 — inspected primary checkout and worktrees. Primary checkout contained unrelated uncommitted UX changes and was 264 commits behind; it was left untouched. Reused the clean worktree based on current `origin/ux-v2`.
- 2026-10-26 13:36 — reviewed the current handoff, autonomous workflow, and §5.3 design. The existing design already required the System Menu to expose trace download and Exit Game.
- 2026-10-26 13:37 — edited `app/page.tsx`, `app/attack-dodge-ux-trace.ts`, and `app/sequence-overrides.css`. No gameplay/server permission or privacy changes.
- 2026-10-26 13:38 — `npm run build` passed with existing chunk-size and Vinext route-classification notices; targeted ESLint passed with 3 existing Hook dependency warnings; `git diff --check` passed. No local test suite or browser/player test was run.
- 2026-10-26 13:39 — pushed source SHA `485caf7a880489244d4f16faca9f0c3a36522610` to `ux-v2`.
- 2026-10-26 13:41 — exact-SHA Actions browser startup/room smoke passed.
- 2026-10-26 13:42 — exact-SHA Actions Lint/fast, API, D1 migrations, Worker deploy and production smoke passed; deployment reported Worker `6a427408-ad87-4961-a49e-dd26381aadd7`.
- 2026-10-26 13:43 — direct production checks confirmed `/` HTTP 200 and `/api/health` HTTP 200 with `{"ok":true,"worker":"available"}`. Added the behavior to §5.3 and recorded this implementation in the design review table as pending owner phone review.
- 2026-10-26 13:44 — `git diff --check` passed for the final HANDOVER and design update. Both changed files are Markdown-only and excluded from the deploy workflow's path trigger.

Owner phone review remains pending. Do not mark USER-ACCEPTED.
