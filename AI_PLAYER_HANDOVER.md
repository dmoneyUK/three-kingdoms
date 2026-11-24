# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`; latest design reviewed `c7e379d0` (AIP-D37). AIP-PERF-01 remains `IN_PROGRESS / CHANGES_REQUESTED`; do not accept it or start GET-02, BOT-02 or PLAY work.

## Current result

The durable end-turn checkpoint (`e262a4355fb051041e59cee2ef234e4ba81c5a56`), Bot Draw checkpoint (`e9a9e873ed4294f4cb5c75fae5df9910f272b69d`) and target-card atomic settlement (`dd8f8d6b00dc`) remain in scope. The new Oath post-Negation interruption window is repaired with a private `recovery_checkpoint`: HP/result writes are fenced by the old pending value, recovery publication/resume uses the checkpoint as its CAS fence, Cron and explicit timer wakes retry it idempotently, and public projections show no actor or legal action while it is pending. Focused rebuilt-bundle evidence is green: Lady Gan/Oath 7 passed; Bot scheduler 34 passed/1 skipped; route ESLint, build and diff checks passed.

Exact Actions `45401772870` on `b649bdc492589c49f40de5c43356e0653158869b` passed lint/fast, API and browser startup; Staging deployed and Production was skipped, but mobile smoke stopped after 12.9 minutes with `SH275 no_revision_progress`: room `SH275` was `playing/resolving`, `pending_json=NULL`, BOT 3 thinking, and only BOT 2 completed. Read-only D1 showed Oath of the Peach Garden's Negation timer finalized at 13:32:44 and recovery at 13:32:45, then no continuation; 25 Bot work rows were consumed, one stale, none pending/claimed. This is a distinct continuation failure, not a proven CPU-limit result. Staging was paused at 13:36:23 UTC; no production mutation.

## Next bounded task

Commit/push this Oath checkpoint repair and focused regressions; verify the exact-SHA full GitHub Actions run with Production `SKIPPED`. If CI is green, run one isolated 10–15-minute Staging fixture (>=200 public events, >=140 Bot work where resources permit) and collect GET/POST CPU vs wall/D1, 1102/5xx counts, four-seat progress, target-card, lease/Cron recovery, idempotency, rejoin and privacy evidence. Close ingress/Cron/diagnostics afterward. Keep AIP-PERF-01 `CHANGES_REQUESTED`; do not mark `PENDING_REVIEW` or `ACCEPTED` until evidence is complete and Owner performs a real iPhone Safari 10–15-minute review.
