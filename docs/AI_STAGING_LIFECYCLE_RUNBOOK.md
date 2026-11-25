# AI Staging lifecycle emergency runbook

This is a manual emergency procedure for the isolated AI Staging Worker only. It is not a scheduled service and does not touch Production or D1 data.

Fixed target:

- Worker: `three-kingdoms-ai-staging`
- D1: `three-kingdoms-ai-staging-db` (`62616495-59ea-4a9c-b669-2d3267a83cab`)
- Production D1 is never a valid target: `3151997a-f69e-4a45-ab51-9e4fd062aeb3`

Before pausing, use read-only deployment inventory to record the current version and verify that no authorized Staging workflow is running. Do not continue if the version has changed since that check or if a custom domain, Worker route, or queue consumer is present.

```sh
npx wrangler deployments list --name three-kingdoms-ai-staging --json
```

After recording the exact current version ID, run the fixed-target emergency pause with the existing Cloudflare credential. The command refuses an omitted or mismatched version ID, validates the isolated D1 binding, disables both the Cron schedule and workers.dev/preview access, and performs a final readback.

```sh
STAGING_EMERGENCY_CONFIRM=PAUSE-three-kingdoms-ai-staging \
STAGING_EMERGENCY_VERSION_ID='<exact-read-only-version-id>' \
STAGING_LIFECYCLE_EVIDENCE_DIR=.wrangler/ai-staging-lifecycle \
node scripts/ai-staging-lifecycle.mjs emergency-contain
```

The command must exit non-zero if ownership, permissions, readback, or exposure checks are uncertain. Never paste a token, raw response, room URL, session token, or private game data into an issue or artifact. Inspect the generated `emergency-contain.json` for `access.enabled=false`, `access.previewsEnabled=false`, `cronSchedules=[]`, and zero matching domains/routes/queue consumers. A canceled or killed runner may skip cleanup; repeat this manual fixed-target procedure before any further hosted validation.
