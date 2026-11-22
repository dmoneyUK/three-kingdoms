# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`, worktree `/private/tmp/WTK-AIP-SYNC-04-20261119`. Design AIP-D29.

## Current group — items 10–11 (AI-INT-01 / AI-INT-02)

Owner delivery order is 1–4, 5–9, then 10–11. GitHub Actions owns validation. No local tests ran.

- Group 1 passed [Actions 44982047842](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44982047842) at `bc90145f5ae908d9c01cae29771aed5a7fbbafd5`.
- Group 2 passed [Actions 45003761820](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45003761820) at `ab1636fcac1617e8dab89dcf304dc11753c47e3a`, including canonical terminal API fixtures and the 6.2-minute Staging mobile startup/turn/rejoin smoke. Staging Worker version `620966ea-84a3-41fd-b87c-fb1eacb99cec`, no pending migrations, production skipped. Real iPhone terminal-match evidence still outstanding.
- Group 3 adds actor-private Bot observations, an opaque server-owned candidate router, and a Responses API adapter exercised via an injected mock only. CI includes valid alternate selection, unknown ID rejection without mutation, privacy projection, stale/replay, incomplete/refusal/timeout/HTTP failure handling and zero fetch with the flag OFF. Staging keeps `BOT_AI_ENABLED=false`. The model adapter has no live credential or global fetch path.

Group 3 implementation is `330ba3e282859d78fb71fdfb70344d8f69a1bf50`. Lint repair `85cba9fcf74bfe1d848f91162cde9202d1fb2447` passed lint/build/fast, API (including the injected Responses mock), and browser smoke in [Actions 45005445116](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45005445116). Production was skipped. Staging deployed Worker `2b5efd88-f946-4fa0-85da-3a21bcfe4b43`, but its post-deploy mobile smoke failed.

Read-only Staging D1 confirmed room `BKQA7` remained playing in `resolving` with NULL pending and the last Bot work row still `claimed` on its first attempt. The last committed timeline action was Bot 3 equipping Red Hare. The deterministic play policy and remaining cards point to an ordinary Attack next. Historical Cloudflare telemetry returned HTTP 403, so the exact interruption is unconfirmed. Current action is to make the canonical Bot single-target Attack claim, physical consumption, history, and first resolution state atomic. Preserve the existing room and validate a new room through exact-SHA GitHub Actions. No live OpenAI activation or production changes.

The shared single-target Attack handler now atomically commits the room and physical-card transition. Repair `9e9bdd701a01c68815617c03f324abcfe3cec275` passed lint/build/fast, API (including injected write failure rollback and retry) and browser smoke on [Actions 45007208354](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45007208354). Production was skipped and Staging deployed Worker `b9fc82a3-5f35-4ea0-8369-46de2d3f4fb0` with no pending migrations. Mobile smoke again failed, at a different boundary. Staging D1 showed room `ZECV8` committed 23 Bot steps and was waiting on the human target's mandatory Yin-Yang Swords choice. The option offered `discard` without exposing its one-card cost. The smoke builds the first choice from this projection, so it retried a canonical 409 without a card key.

Current repair exposes the existing `discard: 1` cost in the canonical choice and exercises the actual projected selection through the existing Bot/smoke adapter in API CI. Monitor exact-SHA GitHub Actions and the isolated Staging mobile smoke on a fresh room. Historical logs for `BKQA7` remain unavailable to the local credential (403). No local tests, live OpenAI calls, or production changes.
