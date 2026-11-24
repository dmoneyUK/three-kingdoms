# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`. Latest design reviewed: `c7e379d0`.

## Current task — AIP-PERF-01 (`IN_PROGRESS` — reviewer `CHANGES_REQUESTED`)

Preserve `e262a4355fb051041e59cee2ef234e4ba81c5a56`'s durable end-turn checkpoint and the green `dd8f8d6b00dc` target-card settlement. The bounded classifier/scheduler correction is code SHA `2d45c5b5451280939f8fd033198e719fe4ff1922`; focused local helper/API checks passed before push.

Exact-SHA Actions [45369946319](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45369946319) for `2d45c5b5451280939f8fd033198e719fe4ff1922` passed Lint/Fast, API and browser startup; production `deploy` was skipped. Staging target guard, build, migration and Worker deploy passed, but mobile refresh/rejoin failed at the fixed 10-minute “human play or discard” wait for `YFQWY` while the room was still making authoritative Bot progress (`response`, Bot work claimed). Read-only D1 later showed the same room advanced to the host's draw phase; Cloudflare aggregate evidence for 10:04–10:18 UTC showed 667 fetch-200, 4 fetch-201 and 5 Cron invocations, 0 errors/5xx, fetch CPU P50/P95/P99 9.7/24.4/104 ms, and D1 4,134 reads / 394 writes. This is a smoke-budget/progress-boundary failure, not proof of CPU safety or scheduler acceptance. Old investigation rooms were read-only and unchanged by this run.

Current bounded corrective slice: extend only the opening smoke wait after an observed `actionRevision` advance, with the existing 180-second no-progress failure and a hard 15-minute cap; add a pure deterministic deadline regression. No gameplay, UX2, GET-02, BOT-02 or PLAY scope. The temporary Staging ingress and Cron were closed after the run and independently verified: public/preview disabled, schedules empty, no matching domains, queues or zone routes.

Next: run the changed focused tests, commit/push this test-only correction, and verify a new exact-SHA full CI with Staging mobile green and production skipped. Only after that gate is green may one controlled 10–15-minute authenticated long-room fixture collect per-request GET/Bot-POST CPU, D1 wait, 1102/5xx, lease/Cron recovery, idempotency, rejoin and privacy evidence. Harvest/Borrowed Sword claim-first windows remain follow-up suggestions only. CPU limit/headroom, hosted long-room proof and real iPhone Safari acceptance remain unproven; do not mark `PENDING_REVIEW` or `ACCEPTED`. Owner still needs one actual iPhone Safari 10–15-minute game review.
