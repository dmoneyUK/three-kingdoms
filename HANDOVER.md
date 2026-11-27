# HANDOVER

## Latest verified delivery

§10.81-B visible-hold correction is pushed at `52e72c55afc8643e3147946c5ef8d52359ab9c00`. Exact-SHA Actions `46046788125` passed Lint/fast, API, browser startup/H4 smoke, D1 migrations, Worker deployment and production smoke; Worker `13d843b6-c874-40ed-bf9b-bfc6491b555e`. Focused non-UI tests 65/65; targeted ESLint 0 errors (15 existing warnings); no local UI/browser/device tests. Owner final iPhone acceptance pending.

Status check: §10.90 implementation is present in `01f95d52` + follow-up `5fbac17f`; exact-SHA Actions `46023545687` passed on the follow-up. Owner says final acceptance is pending. §10.89 was deployed at `7f539e9eff706ca851236bcdcb9dea931b773f93`, Actions `46041180195` passed, Worker `80187227-177a-437c-b9d7-1f5eacf0d8cf`; owner review pending. Do not reimplement either while awaiting review.

## Current task — §10.82-A/B UNIVERSAL-PUBLIC-DISCARD-SETTLEMENT-01

Owner/AI manager's explicit sequence authorizes this combined P1 correction after §10.81-B: fix missing Rock Cleaving Axe cost H4/two-face Frame and Stauchness committed discard faces/H4/skill-frame presentation. Preserve accepted Stauchness H4 details, Burning Bridges, ordinary discard, Kirin Bow, §10.87 rules, Frost closure, real card identity/ownership, privacy and existing lifecycle. The End-turn residual belongs to §10.78 and is outside this correction. Use one implementation commit covering A/B together, with the task IDs in its subject; do not split. Focused API/unit validation only; zero local UI/browser/device tests. After push, verify exact-SHA CI, D1, deployment and production smoke. Owner iPhone review stays pending.

Latest design reviewed: `docs/UX2-refine.md` at `origin/ux-v2` `baf0ac3711b4fe19b4702ca6d072f88aab9e13fc`; this editorial change only removed retired §10.64-B history and leaves §10.82 unchanged.

Implementation checkpoint: both proof-backed cost Frames now bind to their exact current event cursor and retain H4 names/ranks/suits for both physical cards. Pure tests passed 32/32 plus the focused existing Axe assertion 1/1; targeted ESLint passed for shared helper/tests. ESLint on `app/page.tsx` crashed in `react-hooks/rules-of-hooks` at line 5094 with a call-stack overflow; no browser/UI/device tests were run. `git diff --check` passed. No commit or current-task CI/deployment yet. §10.78 owns the separate End-turn residual; unchanged here.
