# Smart Bot Player — Coding Agent Handover

Task: **AIP-PERF-01 STAGING-SAFE-DELIVERY-01**. Latest design reviewed: **AIP-D37 / 2026-11-25 16:15 UTC**. Parent `AIP-PERF-01` remains **CHANGES_REQUESTED**. This engineering unit is **PENDING_REVIEW** on `review/aip-staging-lifecycle-01`; it is not `ACCEPTED`.

## Delivered source and safety boundary

Existing scoped implementation was published as `93c58b12` and `994a9fc2`; review-ref validation guards are in code-bearing SHA `da70879eda1cda3550d6bef57e486bd35212f8ed`. The changes add fixed-target Staging lifecycle preflight/capture/containment with fail-closed ownership/version checks, sanitized evidence, emergency pause documentation, `preview_urls=false`, deployment tagging, bounded cleanup, and browser room rejoin diagnostics. UX2 files, game rules, D1 schema/public protocol and production workflow gates are unchanged.

The review ref is validation-only. No push was made to `feature/smart-bot-player`, `main` or `ux-v2`; no Cloudflare Worker/D1 API write, migration, Cron activation or Production operation occurred. The previously contained AI Staging surface remains paused.

## Validation evidence

- `CLOUDFLARE_ENV=ai-staging npm run build`: **passed**.
- `node scripts/verify-ai-staging-config.mjs`: **passed**; generated config targets Worker `three-kingdoms-ai-staging` and isolated D1 `62616495-59ea-4a9c-b669-2d3267a83cab`, excludes production D1, has `preview_urls=false`, persistent logs/sample 1, invocation logs disabled, Bot AI disabled, and the existing recovery Cron.
- `npx wrangler deploy --dry-run --config dist/server/wrangler.json --name three-kingdoms-ai-staging --tag aip-local-check`: **exit 0**; artifacts were inspected and Wrangler exited before upload, with no credentials or cloud mutation.
- Exact-SHA [GitHub Actions run 45656955698](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45656955698) for `da70879e…`: Lint/Build/Fast **success**, API **success** (467 tests across 34 files/2 shards plus focused Staging opt-out; 0 failures), Browser smoke **success** (2 tests); `Deploy isolated AI Staging Worker` **skipped** ([job](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45656955698/job/139359945660)); production `deploy` **skipped** ([job](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45656955698/job/139359945480)).

The final Handover update is Markdown-only and does not require a new CI run. Effective Cloudflare Free CPU proof, hosted long-room/recovery evidence and real iPhone Safari acceptance remain outstanding; no claim of performance safety or product acceptance is made.

PM/UX2 impact: **NO IMPACT**. Human Reviewer/Owner must inspect the review ref and decide the next status. Do not start GET-02, BOT-02, PLAY work, deployment or production changes from this handover.
