# Smart Bot Player — Coding Agent Handover

Branch: `feature/smart-bot-player` · Worktree: `/private/tmp/WTK-AIP-SYNC-04-20261119` · Design reviewed: AIP-D33 (2026-11-22).

## Latest result — AIP-ROLE-01 (`PENDING_REVIEW`)

Code SHA `a453100d72151d9c0e8f971c9f028d322512eab4` passed exact-SHA [GitHub Actions 45063227604](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45063227604): lint/build/fast, API, browser smoke, isolated AI Staging target guard, D1 migration check, Worker deployment and mobile smoke all succeeded; production `deploy` was skipped. Staging Worker `three-kingdoms-ai-staging` is at `https://three-kingdoms-ai-staging.dai-jinge.workers.dev`, version `939457ee-9ce7-4719-951e-e533e11e133e`; no migrations were pending. Local new/modified focused tests and targeted lint passed; no full local suite/build was run. AIP-ROLE-01 has not been accepted; physical iPhone review is still required.

## Current task — AIP-SYNC-02 (Owner-authorized, in progress)

Perform one pinned, one-way merge from `origin/ux-v2` into `feature/smart-bot-player`. Owner authorization was given after AIP-ROLE-01 reached `PENDING_REVIEW`. Do not modify `ux-v2` or `main`, rebase/force-push, deploy production, or alter AIP-PERF-01 code. Preserve the unaccepted AIP-PERF-01 edits in `app/api/rooms/route.ts`; the supplied 259-byte profile has no application JS stacks, so PERF remains `PENDING_REVIEW` with no proven hotspot.

**Pins and source evidence:** AI remote tip at start `243227aea4312360c03eaf1a4282c1bcb96ce29d`; completed role code SHA `a453100d72151d9c0e8f971c9f028d322512eab4`, Actions `45063227604` above. Pin UX2 tip `dbf57a7c11ce44c4ca438f44a0de345d763e0451`; latest code-bearing ancestor `aedc17d4a925c487259912353170dcc4dd9f027d`, exact-SHA [Actions 45038664443](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45038664443) passed lint/build/fast, API and browser smoke. Merge base: `94381f44163c2158301294396a6cf1b9e6e17b22` (141 AI-only and 28 UX2-only commits from that base at pin time).

**UX2 Planner boundary:** The pinned UX2 `HANDOVER.md` reports §10.69 implemented/deployed and awaiting Owner iPhone review, with no next task authorized there. The current UX2 design independently keeps §10.67 in correction/review, §10.68 unimplemented and §10.69 awaiting phone review; these remain UX2-owned and are merged as upstream work only.

**Resume point and acceptance:** Before source merge, verify the pinned refs and read-only AI Staging D1 applied history/target UUID. Reconcile UX2 migration IDs 0013/0014 against AI Staging history through AI 0016; preserve all applied SQL, snapshots and journals and add a uniquely numbered additive migration only for proven missing schema. If equivalence or migration continuity is uncertain, stop before pushing. Resolve each conflict semantically on a fresh AI-branch integration worktree, run only newly changed focused tests locally, then push the merge commit. Require exact-SHA Actions lint/build/fast/API/browser/Staging migration and mobile smoke all green, production deploy skipped, Worker/D1 isolation verified. Finish with AIP-SYNC-02 `PENDING_REVIEW` and a combined physical iPhone review request for the Bot and current UX2 gameplay.
