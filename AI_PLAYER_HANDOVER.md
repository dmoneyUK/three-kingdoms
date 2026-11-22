# Smart Bot Player — Coding Agent Handover

Branch: `feature/smart-bot-player` · Worktree: `/private/tmp/WTK-AIP-SYNC-04-20261119` · Design reviewed: AIP-D33 (2026-11-22).

## Latest result — AIP-ROLE-01 (`PENDING_REVIEW`)

Code SHA `a453100d72151d9c0e8f971c9f028d322512eab4` passed exact-SHA [GitHub Actions 45063227604](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45063227604): lint/build/fast, API, browser smoke, isolated AI Staging target guard, D1 migration check, Worker deployment and mobile smoke all succeeded; production `deploy` was skipped. Staging Worker `three-kingdoms-ai-staging` is at `https://three-kingdoms-ai-staging.dai-jinge.workers.dev`, version `939457ee-9ce7-4719-951e-e533e11e133e`; no migrations were pending. Local new/modified focused tests and targeted lint passed; no full local suite/build was run. AIP-ROLE-01 has not been accepted; physical iPhone review is still required.

## Current task — AIP-SYNC-02 (Owner-authorized, in progress)

Perform one pinned, one-way merge from `origin/ux-v2` into `feature/smart-bot-player`. Owner authorization was given after AIP-ROLE-01 reached `PENDING_REVIEW`. Do not modify `ux-v2` or `main`, rebase/force-push, deploy production, or alter AIP-PERF-01 code. Preserve the unaccepted AIP-PERF-01 edits in `app/api/rooms/route.ts`; the supplied 259-byte profile has no application JS stacks, so PERF remains `PENDING_REVIEW` with no proven hotspot.

**Pins and source evidence:** AI remote tip at start `243227aea4312360c03eaf1a4282c1bcb96ce29d`; completed role code SHA `a453100d72151d9c0e8f971c9f028d322512eab4`, Actions `45063227604` above. Pin UX2 tip `dbf57a7c11ce44c4ca438f44a0de345d763e0451`; latest code-bearing ancestor `aedc17d4a925c487259912353170dcc4dd9f027d`, exact-SHA [Actions 45038664443](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45038664443) passed lint/build/fast, API and browser smoke. Merge base: `94381f44163c2158301294396a6cf1b9e6e17b22` (141 AI-only and 28 UX2-only commits from that base at pin time).

**UX2 Planner boundary:** The pinned UX2 `HANDOVER.md` reports §10.69 implemented/deployed and awaiting Owner iPhone review, with no next task authorized there. The current UX2 design independently keeps §10.67 in correction/review, §10.68 unimplemented and §10.69 awaiting phone review; these remain UX2-owned and are merged as upstream work only.

**Current progress:** The isolated integration worktree is based on AI remote tip `de35dbc68d164eb464b794374df25ed6ef01c1c1` and has the pinned UX2 tip as its second merge parent. Route imports and the client `Room` projection were resolved by retaining AI Bot/diagnostic fields and UX2 turn-presentation fields/key; no UX2 or main ref was changed. AI route diagnostics and bot handlers remain. AI Drizzle 0013–0016 SQL, journal and snapshots are preserved; remote AI Staging read-only history confirms those exact migrations are applied. The identical UX2 0013 was not replayed; UX2's two-column 0014 is represented by generated additive AI migration `0017_confused_marvel_boy.sql`. The AI API shard runner was retained because it contains every currently discovered API test, including UX2 additions and Bot scheduler, with exact-once shard membership.

**Remaining acceptance:** Run only changed focused non-API tests locally plus static diff checks, inspect the complete staged merge, then create and push one merge commit. GitHub Actions must pass all required exact-SHA lint/build/fast/API/browser, isolated AI Staging D1/Worker/mobile checks, with production `deploy` skipped. Verify the deployed Staging version and that the remote applied journal reaches AI 0017. Then update only AIP-SYNC-02 evidence to `PENDING_REVIEW`; combined physical iPhone review remains required.
