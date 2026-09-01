# Standalone Cloudflare deployment

This path hosts Three Kingdoms directly on Cloudflare Workers with Cloudflare D1. It is intentionally separate from the existing ChatGPT Site until the new service has passed a multiplayer smoke test.

## Configured resources

- Worker name: `three-kingdoms-game`
- D1 database name: `three-kingdoms-db`
- D1 database ID: `3151997a-f69e-4a45-ab51-9e4fd062aeb3`
- Application binding: `DB`
- Migration branch: `cloudflare-standalone-deploy`
- Deployment configuration: `wrangler.cloudflare.jsonc`

The binding remains `DB` because the existing server reads `env.DB`. The Cloudflare database name does not need to match that binding.

## One-time GitHub setup

In GitHub, open **Settings → Secrets and variables → Actions**, then add these repository secrets:

1. `CLOUDFLARE_ACCOUNT_ID` — copy the account ID from the Cloudflare dashboard.
2. `CLOUDFLARE_API_TOKEN` — create a scoped token that can edit Workers scripts and D1 for this account.

Do not paste the token into a chat, commit it, or add it to `wrangler.cloudflare.jsonc`. GitHub masks the secret and supplies it only to the deployment job.

Cloudflare documents the token and GitHub Actions setup at <https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/>.

## First deployment

1. Add both repository secrets before pushing `cloudflare-standalone-deploy`, if possible.
2. Push `cloudflare-standalone-deploy` to GitHub. The **Deploy Cloudflare** workflow starts automatically for this migration branch.
3. If the branch was pushed before the secrets were added, the workflow validates successfully and skips its deployment steps. Add the secrets, open that workflow run in GitHub's **Actions** tab and choose **Re-run all jobs**.
4. The workflow installs exact locked dependencies, runs the full tests and lint, builds the standalone Worker, checks the diff, applies every pending D1 migration, deploys the Worker and requests the deployed URL as a smoke test.
5. Open the resulting `workers.dev` URL and verify:
   - create a normal room on one device;
   - join with a second browser or phone;
   - play enough turns to exercise shared state;
   - refresh and confirm rejoin works on the same device; and
   - complete one match and inspect Cloudflare logs for errors.

The D1 migration command is safe to repeat: Wrangler records migrations that have already been applied.

## Cutover and automatic deployment

Only merge the migration branch after the first deployment and multiplayer test succeed. The deploy workflow runs for migration-branch pushes so the standalone service can be tested before cutover, and it runs automatically for later pushes to `main`. Pull requests run validation without deploying.

Keep the ChatGPT Site available during the observation period. A custom domain can be attached in the Cloudflare dashboard after the Worker is stable; it is not required for the initial `workers.dev` deployment.

## Local validation and manual fallback

```bash
npm ci
npm test
npm run lint
npm run build:cloudflare
git diff --check
```

If GitHub Actions is unavailable, an authenticated operator can apply migrations and deploy from the repository root:

```bash
npx wrangler d1 migrations apply three-kingdoms-db --remote --config wrangler.cloudflare.jsonc
npm run deploy:cloudflare
```

Use the GitHub workflow for normal releases so tests, migrations and deployment stay attached to the exact Git commit.

## Rollback

If a release fails after deployment, use **Workers & Pages → three-kingdoms-game → Deployments** in the Cloudflare dashboard to roll back to the previous healthy Worker version. A Worker rollback does not reverse D1 migrations, so schema changes must remain backward-compatible or have an explicit recovery plan.

During the migration period, the unchanged ChatGPT Site is the service-level fallback. Do not change its sharing settings.

## Free-plan operating boundary

This small-group deployment is designed to begin within the Workers and D1 free allowances. The game polls while a room is open, so inactive open tabs still generate Worker requests and D1 reads. Monitor the Cloudflare dashboard after launch and close abandoned game tabs. Current limits and pricing are documented at:

- <https://developers.cloudflare.com/workers/platform/pricing/>
- <https://developers.cloudflare.com/d1/platform/pricing/>
- <https://developers.cloudflare.com/d1/platform/limits/>
