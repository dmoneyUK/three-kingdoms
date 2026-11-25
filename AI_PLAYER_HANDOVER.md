# Smart Bot Player — Coding Agent Handover

Branch `review/aip-perf-bot-02`, based on the latest `feature/smart-bot-player` tip `4cfd443097deddead1f677b77df1cf34d559fbd3`. Latest design reviewed: AIP-D41 / 2026-11-25. AIP-PERF-01 remains **CHANGES_REQUESTED**; GET-02 and later PLAY work are not started.

## AIP-PERF-BOT-02 (AIP-D41) — **PENDING_REVIEW**

Source commit `d2d217172c3da5ecd3b8052ef30d1105aea8e24c` is pushed to this non-deploying review branch. It contains the compact server-only Bot result path, durable canonical commit proofs (event/checkpoint/shared-submission/authoritative row), correlation checks, and scheduler ack protection. Legacy full projections remain for human/test adapters. S1 adds exact fixed-target read-only D1 room guards with opaque fingerprints before activation and after closure. S2 adds authenticated-request/error/artifact redaction and canary coverage for raw and encoded credentials. The review ref does not run the Staging deploy job; production remains skipped.

Focused evidence on the working tree:

- API scheduler: 37 tests, 36 pass, 1 skipped, 0 fail; long-room fixture reported 203 public events and 150 seeded Bot Work rows.
- Bot outcome, lifecycle/config, S1 guard, reconnect logic and S2 diagnostics: 41/41 pass.
- Targeted ESLint, `npm run build`, and `git diff --check`: pass.
- Exact-SHA [Actions 45698425786](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45698425786) for `d2d217172c3da5ecd3b8052ef30d1105aea8e24c`: Lint/Fast, API and Browser **GREEN**; `Deploy isolated AI Staging Worker` **SKIPPED**; production `deploy` **SKIPPED**.

No Hosted Staging run is authorized yet. D41 requires disposition of the historical UV89N credential exposure from the prior hosted artifact and confirmation of controlled, time-bounded access before the single capped hosted validation. No production operation or Cloudflare resource change was made in this delivery.

## Current bounded task

Wait for Reviewer/Owner review of this exact-SHA non-deploying delivery. Keep the single Hosted gate blocked until historical UV89N credential disposition and controlled time-bounded access are explicitly satisfied; no Hosted or production operation was performed. Do not start AIP-PERF-GET-02.
