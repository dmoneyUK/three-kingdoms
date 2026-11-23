# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`. Latest design reviewed AIP-D37.

## Current task — AIP-PERF-01 (`IN_PROGRESS`)

The bounded atomic target-card change stays **PENDING_REVIEW**. Code `dd8f8d6b00dcf14123146e81915055106679e416` passed [exact-SHA Actions 45277626473, attempt 2](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45277626473/attempts/2), including isolated Staging Chromium rejoin on Worker `4c0eae89-2a67-441d-b2ef-060520bad5a1`. Production skipped.

Same deployed version, separate bounded Chromium run `Q6YYJ` on 2026-11-23. Play began at 22:44:05 UTC, and a fresh authoritative revision was observed at 15m32.6s. **CPU gate failed** with 14/1,091 room GETs and 4/72 Staging room-endpoint POSTs sampled as HTTP 503/`exceededCpu`. The first failure at 11m04.9s coincides with the room's audited `advance_timers` submission. D1 later showed turn 19 and no stranded `resolving` state in that snapshot. The browser rejoin assertion had not completed when the run was stopped. The Ray ID, aborting function, effective CPU limit and owner iPhone evidence are unverified.

Resume with a deterministic, local long-history fixture for the expired response timer and authenticated room projection. Compare sequential GET with GET overlapping the expired-timer POST and a multi-decision POST for the same data and build. Start with request-stage measurements and existing exact-SHA CI evidence. Keep `Q6YYJ`, `P8XE4`, and `JDCA3` unchanged. GET-02 and BOT-02 retain their separate authorization gates. No owner acceptance yet.

Cloudflare confirmed no AI Staging Cron, public ingress, previews, routes, custom domains or Queue consumers. GitHub Staging deployment allow-list stayed at zero. Browser and Tail exited. Local redacted evidence is in `/private/tmp/wtk-ai-staging-pause.2b2b3h/target-long-tail.jsonl` and the local-only measurement harness is saved as `long-play-harness.patch` in the same folder.
