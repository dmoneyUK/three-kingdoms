# Current Handover

Branch: `ux-v2`

## Latest result

- **`UX2-10.17.1.2-BCP1-F2-HARVEST-NEGATION-READONLY-POOL` — IMPLEMENTED / DEPLOYED, PENDING USER REVIEW.** Exact SHA `6836aa2905a3dc71f7d8dfde8619ae190f6f4e14`; Actions [39131345860](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39131345860) passed and deployed Worker `705b26bf-2802-46d6-9869-e6aceaac282c`. The read-only Harvest pool is tied to the exact typed root/reveal proof and contains no chooser actor or legal action. Focused mobile browser checks at 390×700/440×766 passed.
- **`UX2-10.17.5.1-INS5-F1-R-APPROVED-CONTENT-WRAPPED-PANEL` phone correction — IMPLEMENTED LOCALLY, EXACT-SHA CI/DEPLOY PENDING.** Rebalanced the portrait/main width budget, made skill/card Details use the full panel width, and bounded short-phone scrolling without changing game permissions, private projections or H4 placement. Fifteen focused phone-viewport Inspector browser tests passed across 4/6/8/10 seats and 390×700 through 480×900; the real four-player Bumper Harvest SWITCH regression also passed on 390×700/440×766. `npm run build`, focused browser-spec ESLint and `git diff --check` passed. Local ESLint of `app/page.tsx` exceeded the local Node heap (4 GB); the exact-SHA CI lint gate remains pending. Keep this same task **PENDING USER PHONE RE-REVIEW** after deployment.
- **Latest design reviewed:** `docs/UX2-refine.md` at `364d213bc71ff44c5299d3fef7175533ed1a19a3`, §10.17.5.1-R. The correction continues this same task. Preserve accepted H4 placement and the Q1–Q4 pause. Existing unrelated CSS edits and untracked `HANDOVER 2.md`–`HANDOVER 5.md` plus `tests/browser/em01-production-repro.tmp.spec.mjs` remain in the original checkout and are preserved.

## Exactly one current bounded task

**Push and verify the in-place phone correction for `UX2-10.17.5.1-INS5-F1-R-APPROVED-CONTENT-WRAPPED-PANEL` on `ux-v2`.** Verify CI, Worker deployment and production smoke against the exact code SHA, then leave the Inspector **PENDING USER PHONE RE-REVIEW**. Preserve accepted H4 placement and the Q1–Q4 pause; do not infer human acceptance from CI or deployment.
