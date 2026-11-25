# Smart Bot Player — Coding Agent Handover

Task: **AIP-PERF-01 STAGING-SAFE-DELIVERY-01**. Latest design reviewed: **AIP-D37 / 2026-11-25 16:15 UTC**. Parent `AIP-PERF-01` remains **CHANGES_REQUESTED**; this bounded delivery is **IN_PROGRESS** on `review/aip-staging-lifecycle-01`.

## Published implementation

The existing scoped implementation is preserved in code commits `93c58b12` and `994a9fc2` on top of remote design tip `db5ec3af4f50d0164a320197f3e34d71a1f4bd36`. It adds fixed-target Staging lifecycle preflight/capture/containment with fail-closed ownership/version checks, sanitized evidence and emergency pause documentation; Staging-only generated-config/CI guards (`preview_urls=false`, deployment tagging, bounded cleanup); and bounded browser room rejoin diagnostics. Production workflow guards, UX2 files, game rules, D1 schema and public protocol are unchanged.

The review ref is explicitly non-deploying: no push to `feature/smart-bot-player`, `main` or `ux-v2`; no Cloudflare Worker/D1 operation, migration, Cron activation or Production change is authorized or performed. The previously contained Staging surface remains paused.

## Validation checkpoint

The review ref is ready for the first authorized publication. The remaining work in this same unit is: push this source plus Handover to the review ref, run the required local `CLOUDFLARE_ENV=ai-staging npm run build` and generated-config/Wrangler dry-run (no credentials or cloud writes), then run ordinary exact-SHA lint/build/fast/API/browser CI with both Cloudflare deploy jobs skipped. The existing 32 focused tests are retained and will not be repeated without a related failure.

PM/UX2 impact: **NO IMPACT**. Human review, real iPhone acceptance, effective Free CPU proof and `ACCEPTED` status remain separate gates.

## Next bounded task

Complete `STAGING-SAFE-DELIVERY-01` on this review ref, record the exact code/Handover SHAs and CI outcomes, and finish at **PENDING_REVIEW** (or report an actual blocker). Do not start GET-02, BOT-02, PLAY work, deployment or production changes.
