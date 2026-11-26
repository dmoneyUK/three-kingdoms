# HANDOVER

Design reviewed: latest `docs/UX2-refine.md` at `origin/ux-v2` `d14601eb` (2026-11-26); active sections §10.80 and §10.81-B.

§10.80 delivered at `b1e42ce8122a805da9dd7cec39aff99a99e5f028`. Exact-SHA Actions `45887588763` passed Lint/fast, API, build, browser startup/H4 smoke, D1 migration and production smoke; Worker `dff82d76-78c8-4174-b2d2-6f18e7d4a77a`. Focused routing test passed 13/13. Owner iPhone review remains pending; source-zone and other-viewer visibility were not verified.

## Current task — §10.81-B replacement CardFace/H4 cursor ownership

Ensure the validated real Necromancy replacement CardFace is the selected shared Effect Frame while its exact replacement H4 event is the public presentation cursor. Require exact event, stage, physical-card, actor/target and causal-frame proof. Preserve original reveal, two-line H4, normal interruption by later events, privacy, continuation and no-replay behavior. Do not change layout or rules.

Focused Judgement/routing tests: 18/18 passed; targeted lint for the shared Judgement module and tests and `git diff --check` passed. Local lint of `app/page.tsx` hits the same `react-hooks/rules-of-hooks` stack overflow reproduced against the unmodified baseline; exact-SHA CI is the authoritative full lint check. No local UI/browser test was run. Exact-SHA CI, deployment, smoke and Owner iPhone review for this correction remain pending.
