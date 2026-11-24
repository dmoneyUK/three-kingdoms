# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`; latest design reviewed `c7e379d0` (AIP-D37). AIP-PERF-01 remains `IN_PROGRESS / CHANGES_REQUESTED`; no acceptance, GET-02, BOT-02 or PLAY work.

## Current result

The durable end-turn checkpoint (`e262a4355fb051041e59cee2ef234e4ba81c5a56`), Bot Draw checkpoint (`e9a9e873ed4294f4cb5c75fae5df9910f272b69d`) and target-card atomic settlement (`dd8f8d6b00dc`) remain in scope. Focused rebuilt-bundle evidence is green: Bot scheduler 33 passed/1 skipped, Yue Jin 6 passed, concurrency 19 passed; build, route ESLint, syntax and diff checks passed. Local `app/page.tsx` ESLint still hits the pre-existing React Hooks stack overflow and is not claimed.

Exact Actions `45398237899` on `4baafc4462c8a865371885b8cf2116a482463da9` passed lint/fast, API and browser startup; Staging deployed and Production was skipped, but the mobile smoke failed at authenticated `GET /api/rooms` in `waitForRoom` with only `response.ok() === false` recorded. Read-only D1 room `VAL2L` (test name `STAGING REJOIN HFXF`) later advanced through `response → resolving → draw` at 13:10:35 UTC, so the failure is not proven to be a permanent checkpoint stall. The HTTP status/body and any 1102/5xx classification remain unknown. Staging was then shut down: Cron empty, public and preview subdomains disabled at 13:14:26 UTC; no production mutation.

## Next bounded task

Commit/push the scoped Staging smoke diagnostic that records non-2xx status/body without weakening the assertion; verify exact-SHA full Actions and Production `SKIPPED`. Only if that run is green may one controlled isolated 10–15-minute Staging long-room fixture begin (>=200 public events, >=140 Bot work, GET/POST CPU vs wall/D1, lease/Cron recovery, rejoin/privacy). Close ingress/Cron/diagnostics afterward. Keep AIP-PERF-01 `CHANGES_REQUESTED`; do not mark `PENDING_REVIEW` or `ACCEPTED` until evidence is complete and Owner performs one real iPhone Safari 10–15-minute review.
