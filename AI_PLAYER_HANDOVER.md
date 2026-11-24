# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`; latest design reviewed `c7e379d0` (AIP-D37). AIP-PERF-01 remains `IN_PROGRESS / CHANGES_REQUESTED`; do not accept it or start GET-02, BOT-02 or PLAY work.

## Current result

The durable end-turn checkpoint (`e262a4355fb051041e59cee2ef234e4ba81c5a56`), Bot Draw checkpoint (`e9a9e873ed4294f4cb5c75fae5df9910f272b69d`) and target-card atomic settlement (`dd8f8d6b00dc`) remain in scope. Commit `d1cac25bf9cdfafe59b5f93ac63849146d7b490d` adds a private Oath `recovery_checkpoint`: HP/result writes are fenced by the old pending value, recovery publication/resume uses the checkpoint as its CAS fence, Cron and explicit timer wakes retry it idempotently, and public projections show no actor or legal action while it is pending. Focused rebuilt-bundle evidence is green: Lady Gan/Oath 7 passed; Bot scheduler 34 passed/1 skipped; route ESLint, build and diff checks passed.

Exact Actions `45408505292`, attempt 2, matches that SHA. Lint/fast, API and browser startup passed; isolated Staging target guard, D1 migration and Worker deploy passed; Production `deploy` was `SKIPPED`. The mobile smoke then failed at 14:09:52 UTC with Playwright `ECONNRESET` while the human resolved a Negation response. Read-only D1 room `2VZLH` remained `playing/response` with a Negation pending, 25 Bot work rows consumed and 4 revision-stale, with no pending/claimed lease. The same run's Cloudflare Analytics window recorded 353 requests (0 invocation 1102/1101/5xx; one `clientDisconnected`), D1 2,670 read queries / 332 writes / 45,850 rows read / 1,329 rows written, CPU P50/P99 10,648/189,101 microseconds and Wall P50/P99 516,595/20,991,710 microseconds. This is not proof of a CPU-limit breach and is distinct from the repaired Oath interruption.

Worker settings readback shows `usage_model=standard` with no per-Worker `limits.cpu_ms`; the current Cloudflare token cannot read account subscriptions (`Billing Read` denied), so the effective plan/CPU ceiling remains unverified. Staging was closed at 14:12:15 UTC and inventory readback is clean: public/preview disabled, no Cron schedules, domains, queue consumers or routes.

## Next bounded task

Obtain the missing account-plan/CPU-limit evidence (Owner-authorized Cloudflare `Billing Read` or equivalent dashboard proof), then investigate the new client-disconnect/Negation continuation blocker before another hosted run. Keep Harvest/Borrowed Sword as follow-up recommendations only; retain AIP-PERF-01 `CHANGES_REQUESTED`, and do not mark `PENDING_REVIEW` or `ACCEPTED` until the required evidence and Owner's real iPhone Safari 10–15-minute review are complete.
