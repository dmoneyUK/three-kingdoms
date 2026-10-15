# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

Reviewed the current remote design `docs/UX2-refine.md`, blob `477c38f442481b84a10b8bacffe6c3bc40266bc7`; it matches the revision recorded here, so no newer design edits supersede the active task. L1 and L2 remain **PENDING REVIEW**. L2 commit `e66a9559a5e7ab0d9261455252abe8e81695a364` passed all jobs in Actions run [38755050608](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38755050608), including deployment and production smoke. Current remote HEAD `6df6300fc770417d26f449d5f97dba4a02c38594` only changes Markdown and has no Actions run because `deploy.yml` ignores `**/*.md`; its latest underlying code run is the successful L2 run above.

L3 implementation and focused local validation are complete; the code commit's exact-SHA CI/deploy remain pending. `npm run build` passed; Diao Chan Worker/D1 API tests passed 8/8; exact public-proof projection fixture passed 1/1; authenticated Worker/D1 browser regression passed 1/1 at 440×894, including 4s reveal, 380ms park, viewer restoration, privacy and enabled Skip. Targeted ESLint passed with zero errors (remaining warnings are pre-existing); `git diff --check` passed. Screenshots are in the ignored Playwright output at `tests/browser/test-results/browser/hero-active-skills-real-ga-223ab-s-parked-for-another-viewer/`.

## Current task

**§10.12.3 / L3 — single LUST cost Frame.** Commit and push the already implemented strict COST↔ACTIVATION proof and presenter changes. Inspect the exact SHA's Actions jobs and deployment; update this handoff and the design's Coding Agent progress with observed results. Keep L3 **PENDING REVIEW**; then re-read the latest design and continue to the separately typed §10.12.4 / L4 generated-Duel root and author-attached history. Do not weaken printed-Duel proof or fabricate Duel cards.
