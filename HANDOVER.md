# HANDOVER

## Latest verified delivery — §10.81-B

SHA `7dcaace129dcc48013fed549936565424063863f`; exact-SHA Actions [46132393768](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46132393768) passed Lint/Fast/Build, API, browser startup/H4 smoke, D1 migration, Worker deployment and production smoke. Worker `88e6f127-8b13-4945-8205-d385fbf8b166`. Focused tests 43/43, Fast 531/531, API 397/397; no local UI/browser/device tests. §6C audit: retired Guicai-specific shared lifecycle/paint/H4 branches and the string completion flag; `sima_yi_guicai` remains only in the domain proof adapter. Owner review remains pending.

## Current task — §10.82-A/B canonical discard construction retirement

Design reviewed at `docs/UX2-refine.md` `2d8adec54fd1b90fbab01fab54b011606062749c`, Table A and §10.82, plus Planner Guide §6C. Implemented one shared, proof-bound descriptor-to-Action/copy factory and migrated the committed discard COST/EFFECT Frame paths, including Stauchness, Axe, Frost Sword, Yin-Yang Swords, Kirin Bow and related skills. Preserved exact event/material ordering and identity, source/owner, visual roles, cursor priority, Kirin's separately proven damage settlement, Dismantle's distinct role adapter, and independent non-discard actions. Removed the superseded per-skill Action construction and post-selection copy overwrite path (`publicEffectFrameActionSeed`, `attachCanonicalPublicDiscardCopy`, `withCanonicalPublicDiscardCopy`) plus the candidate-only owner arbitration helpers. Deleted-reference audit passes; remaining legacy names are negative assertions in tests only.

Validation before delivery: focused discard/copy tests 43/43, `npm run test:fast` 531/531, `npm run test:api` 397/397, and `git diff --check` passed. No local UI/browser/device tests. Commit, exact-SHA Actions, deployment and production smoke are pending. No Owner acceptance claimed.
