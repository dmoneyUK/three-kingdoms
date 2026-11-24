# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player` (local worktree `codex/aip-perf-01-20261122`). Latest design reviewed: AIP-D37 / `c5fbba9d`; `AIP-PERF-01` remains **CHANGES_REQUESTED**, not accepted. Do not start AIP-PERF-GET-02, AIP-PERF-BOT-02, PLAY work or another hosted retry.

## Current result

Code SHA `4210d4033e9e097cb0229fd53e40e4f2b886fcbe` implements the request-local LOG-DECODE fix: one decoded structured-log representation is reused for public sequence validation, viewer-filtered timeline and legacy text log. It does not change polling, rules, UI, SQL or cross-request caching.

Focused local validation passed:

- `tests/room-log-decode.test.mjs`: 2/2;
- `tests/public-presentation-turn.test.mjs`: 5/5;
- targeted ESLint: 0 errors (existing hook warnings only);
- `git diff --check`: passed.

Exact-SHA [Actions 45486329645](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45486329645) passed Lint/Fast, API, Browser and isolated AI Staging deployment/mobile refresh-rejoin. Staging Worker Version: `6c76a713-a477-411d-984f-49506395296e`; URL: `https://three-kingdoms-ai-staging.dai-jinge.workers.dev`; D1: `three-kingdoms-ai-staging-db`; `BOT_AI_ENABLED=false`; production `deploy` was `skipped`.

## Reliability gate and blocker

The one post-green-CI disposable long-room run used `25VF2` from 21:23:03–21:35:35 UTC, seeded with 203 public records and 150 Bot-work rows. It reached 34 turn epochs, 95 authoritative revisions and 4 target-card settlements. Before archive, D1 readback was `status=playing`, 200 retained records, 241 Bot-work rows and 88 live consumed rows; the room was then archived `finished`.

Tail evidence from the dedicated driver window:

- authenticated GET: 456 samples; CPU P50/P95/P99/max `6/13/26/34 ms`; wall `58/104/136/211 ms`;
- room POST: 105 samples; CPU `40/72/88/102 ms`; wall `755/1011/1148/1190 ms`;
- 8 GET and 3 POST HTTP 503 `outcome=exceededCpu`; HTTP 1102: 0;
- first repeated CPU-failure window: 21:34:50–21:35:04 UTC. The run stopped and was not retried;
- D1 account analytics for 21:22:00–21:37:31 UTC: 6,409 read queries / 620,534 rows read and 984 write queries / 2,370 rows written.

The long fixture did not reach its final privacy/rejoin probes. Exact-SHA CI mobile smoke did pass refresh/rejoin, and focused log projections covered host/other/anonymous/invalid-viewer secrecy. Cloudflare account/version settings reported `usage_model=standard` but no `limits.cpu_ms`, so the effective Staging CPU ceiling is **UNKNOWN**; observed 9–10 ms terminations are runtime evidence, not configuration proof.

Cleanup is complete: fixture archived, no tail/driver process remains, and final Staging inventory is ingress `false`, previews `false`, Cron schedules `0`, domains `0`, matching queue consumers `0`, matching zone routes `0`.

## One next bounded task

Planner/Reviewer must choose one source-backed follow-up to measure and optimize the remaining canonical `roomState` projection/serialization path, including the final settlement POST. Keep the scope inside AIP-PERF-01; do not modify UX2, raise `cpu_ms`, add infrastructure, start GET-02/BOT-02/PLAY, or reopen Staging until that proposal is approved. Owner still needs one real iPhone Safari 10–15 minute 1-human+3-Bot acceptance after engineering evidence is green.
