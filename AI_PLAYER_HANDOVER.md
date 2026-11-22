# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`, worktree `/private/tmp/WTK-AIP-SYNC-04-20261119`. Design AIP-D29.

## Current group — items 10–11 (AI-INT-01 / AI-INT-02)

Owner delivery order is 1–4, 5–9, then 10–11. GitHub Actions owns validation. No local tests ran.

- Group 1 passed [Actions 44982047842](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44982047842) at `bc90145f5ae908d9c01cae29771aed5a7fbbafd5`.
- Group 2 passed [Actions 45003761820](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45003761820) at `ab1636fcac1617e8dab89dcf304dc11753c47e3a`, including canonical terminal API fixtures and the 6.2-minute Staging mobile startup/turn/rejoin smoke. Staging Worker version `620966ea-84a3-41fd-b87c-fb1eacb99cec`, no pending migrations, production skipped. Real iPhone terminal-match evidence still outstanding.
- Group 3 adds actor-private Bot observations, an opaque server-owned candidate router, and a Responses API adapter exercised via an injected mock only. CI includes valid alternate selection, unknown ID rejection without mutation, privacy projection, stale/replay, incomplete/refusal/timeout/HTTP failure handling and zero fetch with the flag OFF. Staging keeps `BOT_AI_ENABLED=false`. The model adapter has no live credential or global fetch path.

Group 3 was pushed at `330ba3e282859d78fb71fdfb70344d8f69a1bf50`. [Actions 45004966509](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45004966509) passed browser smoke and failed lint on an unused play-candidate revision binding, now fixed locally. The API suite and its injected Responses mock passed. Staging and production were skipped on the lint-failed SHA. Push the lint correction and recheck every required job and the isolated deployment for the new exact SHA. If a job fails, inspect its exact logs, fix within scope and push a repair. Once green, record evidence and retain independent review status. No live OpenAI activation or production deployment is in scope.
