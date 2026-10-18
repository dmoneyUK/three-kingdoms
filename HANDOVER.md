# Current Handover

Branch: `ux-v2`

## Latest result

- **`UX2-10.17.1.2-BCP1-F2-HARVEST-NEGATION-READONLY-POOL` — IMPLEMENTED / DEPLOYED, PENDING USER REVIEW.** Exact SHA `6836aa2905a3dc71f7d8dfde8619ae190f6f4e14`; Actions [39131345860](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39131345860) passed and deployed Worker `705b26bf-2802-46d6-9869-e6aceaac282c`. The read-only Harvest pool is tied to the exact typed root/reveal proof and contains no chooser actor or legal action. Focused mobile browser checks at 390×700/440×766 passed.
- **`UX2-10.17.5.1-INS5-F1-R-APPROVED-CONTENT-WRAPPED-PANEL` — IMPLEMENTED / DEPLOYED, PENDING USER PHONE RE-REVIEW.** Exact code SHA `44e7afb4435361c8fd7a5edbac0e038371481731`; Actions [39140197505](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39140197505) passed lint, fast/API tests, browser startup smoke, D1 migration, Worker deploy, and production homepage/health smoke. Worker version `2fdd9a9d-8c9d-4922-8e3d-8d5f4fcacbd4`. The phone layout now uses a consistent portrait/main width budget, full-width skill/card Details, and bounded long-text scrolling while preserving readable card sizes, permissions, private projections, H4 placement and board controls. Fifteen focused phone Inspector browser tests passed across 4/6/8/10 seats and 390×700 through 480×900; the real four-player Bumper Harvest SWITCH regression passed at 390×700/440×766. `npm run build`, focused browser-spec ESLint and `git diff --check` passed. The 4 GB local heap was insufficient for page ESLint; CI ESLint passed. No desktop validation was run.
- **Latest design reviewed:** `docs/UX2-refine.md` at `364d213bc71ff44c5299d3fef7175533ed1a19a3`, §10.17.5.1-R. The correction continues this same task. Preserve accepted H4 placement and the Q1–Q4 pause. Existing unrelated CSS edits and untracked `HANDOVER 2.md`–`HANDOVER 5.md` plus `tests/browser/em01-production-repro.tmp.spec.mjs` remain in the original checkout and are preserved.

## Exactly one current bounded task

**Await human phone re-review of `UX2-10.17.5.1-INS5-F1-R-APPROVED-CONTENT-WRAPPED-PANEL`.** The implementation and exact-SHA deployment are complete; leave it **PENDING USER PHONE RE-REVIEW** until the reviewer inspects it. Preserve accepted H4 placement and the Q1–Q4 pause; do not infer human acceptance from CI or deployment.
