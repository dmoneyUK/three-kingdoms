# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`. AI design and PM overlay reviewed at `750794c6`.

## Current task — AIP-PERF-01 (`PENDING_REVIEW`)

Evidence submitted for review. The 15-minute reliability gate and Owner acceptance are open. The atomic `choose_target_card` implementation is unchanged at `dd8f8d6b00dcf14123146e81915055106679e416`. [Exact-SHA Actions 45277626473, attempt 2](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45277626473/attempts/2) passed CI, isolated Staging and mobile Chromium rejoin. Production skipped.

Cloudflare dashboard confirmed Workers Free with a 10 ms plan CPU limit per invocation. The active Staging version `4c0eae89-2a67-441d-b2ef-060520bad5a1` exposed no custom override via its settings or version API. Tail CPU and wall are separate fields. The 1.42 ms D1 result was SQL execution for a standalone snapshot. Room-request D1 wait was not measured.

One controlled Staging run `TNX5F` started at 00:02:15 UTC on 2026-11-24 with 203 projected public events and 150 historical Bot work rows. Four target-card choices committed, and the replay returned 409. At 3m52s the game entered `resolving` on turn epoch 27 without a pending continuation after BOT 3's public Play-end marker. The last claim expired and successive room-targeted wakes could not advance the revision. The driver stopped after three minutes without progress. The 15-minute checkpoint and fresh Chromium rejoin failed to verify. The adjacent POST (Ray `a5f42a547a0fdfb4`) had 11 logged Bot decisions, HTTP 200, 414 ms CPU and 5,846 ms wall. The reason the continuation stopped is unconfirmed.

Tail CPU P50/P95/P99/max was 6/12/26/31 ms for 253 authenticated room GETs and 320/414/414/414 ms for five POSTs with 5–12 logged Bot decisions. Both groups and all 55 sampled room POSTs had zero 1102 or 5xx in this shortened run. The earlier 15m32s `Q6YYJ` sample still had 14 GET and four POST CPU terminations. CPU safety is unproven. Nine focused local checks passed, including actual scheduled recovery for expired unexecuted and committed-but-unacknowledged Bot claims, retry/card conservation, and four separate viewers' private hands and roles. The global hosted Cron stayed off to preserve historical rooms and audit data.

Source findings for review. The likely ordinary `end_turn` path persists bare `resolving` before `beginTurnEnd`. Harvest pick and Borrowed Sword target choices also claim the phase before a separate settlement. Consider atomic settlement or durable recovery for each path with failure injection and replay tests. Preserve the accepted UX2 discard barrier, turn identity and private decision boundaries. PM/UX2 impact of this evidence-only delivery is **NO IMPACT**. A shared turn-end fix needs coordination before changing the contract. No follow-up task was started.

Tail and browsers exited. Cloudflare confirmed AI Staging public/preview ingress and Cron off, with no routes, domains or Queue consumers. The synthetic room was archived and GitHub's deployment allow-list is zero. Redacted local evidence is at `/private/tmp/wtk-perf-proof-nov23/`. Owner review requires one actual 10–15-minute iPhone Safari game after the stalled path is resolved and a temporary test window is arranged.
