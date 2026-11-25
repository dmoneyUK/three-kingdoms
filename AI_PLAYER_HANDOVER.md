# Smart Bot Player — Coding Agent Handover

Branch `review/aip-perf-bot-02`, based on the latest `feature/smart-bot-player` tip `4cfd443097deddead1f677b77df1cf34d559fbd3`. Latest design reviewed: AIP-D41 / 2026-11-25. AIP-PERF-01 remains **CHANGES_REQUESTED**; GET-02 and later PLAY work are not started.

## AIP-PERF-BOT-02 (AIP-D41) — implementation delivered for review

The non-deploying review branch contains the compact server-only Bot result path, durable canonical commit proofs (event/checkpoint/shared-submission/authoritative row), correlation checks, and scheduler ack protection. Legacy full projections remain for human/test adapters. S1 adds exact fixed-target read-only D1 room guards with opaque fingerprints before activation and after closure. S2 adds authenticated-request/error/artifact redaction and canary coverage for raw and encoded credentials. The review ref does not run the Staging deploy job; production remains skipped.

Focused evidence on the working tree:

- API scheduler: 37 tests, 36 pass, 1 skipped, 0 fail; long-room fixture reported 203 public events and 150 seeded Bot Work rows.
- Bot outcome, lifecycle/config, S1 guard, reconnect logic and S2 diagnostics: 41/41 pass.
- Targeted ESLint, `npm run build`, and `git diff --check`: pass.

No Hosted Staging run is authorized yet. D41 requires disposition of the historical UV89N credential exposure from the prior hosted artifact and confirmation of controlled, time-bounded access before the single capped hosted validation. No production operation or Cloudflare resource change was made in this delivery.

## Current bounded task

Commit and push this review branch, verify exact-SHA GitHub Actions with Staging deploy and production skipped, then hand to Reviewer as **PENDING_REVIEW** if CI is green. Keep the Hosted gate blocked until the historical credential/access conditions are explicitly satisfied; otherwise record the concrete CI blocker. Do not start AIP-PERF-GET-02.
