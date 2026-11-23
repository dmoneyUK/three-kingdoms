# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`. Latest design reviewed: AIP-D37.

## Current task — AIP-PERF-01 long-room CPU verification (`IN_PROGRESS`)

The bounded `choose_target_card` crash-safety change is **PENDING_REVIEW**. Code `dd8f8d6b00dcf14123146e81915055106679e416` passed [exact-SHA Actions 45277626473, attempt 2](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45277626473/attempts/2) including mobile rejoin. Production skipped. Local focused Worker/D1 results: 66 passed, one skipped. Attempt 1 deployed but its health probe returned 404 with ingress still disabled. The successful attempt temporarily restored ingress and deployed Worker `4c0eae89-2a67-441d-b2ef-060520bad5a1`.

`FC3UM` reached 11m30s of observed gameplay. Tail sampled 1,001 GETs, 67 POSTs and three Cron runs, with no CPU-limit outcome or 5xx. GET CPU P50/P95/P99/max was 5/7/11/60 ms; POST was 12/202/257/257 ms. Four in-play POSTs logged six Bot decisions each. The effective per-invocation limit, controlled 15-minute or equivalent hosted fixture, and device acceptance are open. The redacted trace is `/private/tmp/wtk-ai-staging-pause.2b2b3h/d37-tail-rerun.jsonl`.

After verification, Cloudflare readback showed Cron, public ingress and previews off. The GitHub Staging deployment allow-list returned to zero. The listener exited and a process check found no diagnostics remaining. Reopen only for the next bounded verification. Keep `JDCA3` and `P8XE4` unchanged. GET-02 and BOT-02 retain their separate authorization gates.
