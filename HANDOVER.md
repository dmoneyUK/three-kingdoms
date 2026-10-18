# Current Handover

Branch: `ux-v2`

## Latest result

- **`UX2-10.17.1.2-BCP1-F2-HARVEST-NEGATION-READONLY-POOL` — IMPLEMENTED / DEPLOYED, PENDING USER REVIEW.** Exact SHA `6836aa2905a3dc71f7d8dfde8619ae190f6f4e14`; Actions [39131345860](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39131345860) passed and deployed Worker `705b26bf-2802-46d6-9869-e6aceaac282c`. The read-only Harvest pool is tied to the exact typed root/reveal proof and contains no chooser actor or legal action. Focused mobile browser checks at 390×700/440×766 passed.
- **`UX2-10.17.5.1-INS5-F1-R-APPROVED-CONTENT-WRAPPED-PANEL` source pushed at `8d6efe3630575630fd3f03ff1b4d85e643495210`; CI repair required.** The mobile geometry, actor/spectator privacy, active-action preservation, nested Card Details, keyboard and touch checks passed (17 focused mobile tests; build/browser jobs passed). Exact-SHA Actions run [39135140185](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39135140185) failed lint because `<section>` redundantly declared `role="region"` at `app/page.tsx:1220`; deployment was skipped. The repair removes the redundant attribute while the accessible name keeps the section exposed as a region, and updates the regression to query that accessible region. Repair check: 7 focused mobile browser tests, Inspector-spec ESLint and `git diff --check` passed. Mobile-only checks were run; no desktop viewports.
- **Latest design reviewed:** `docs/UX2-refine.md` at `7c2bb634cbd00a42df13c04a079a2a530eb01b1f`, §10.17.5.1-R. Preserve accepted H4 placement and the Q1–Q4 pause. Existing unrelated CSS edits and untracked `HANDOVER 2.md`–`HANDOVER 5.md` plus `tests/browser/em01-production-repro.tmp.spec.mjs` are preserved.

## Exactly one current bounded task

**CI repair for `UX2-10.17.5.1-INS5-F1-R-APPROVED-CONTENT-WRAPPED-PANEL` — commit/push the validated redundant-role fix, then verify its exact-SHA Actions and Worker/D1 deployment.** Keep the Inspector **PENDING USER REVIEW** after technical delivery. All visual and browser verification for this and subsequent UX tasks is mobile-only; prioritize short-height phones. Do not claim user acceptance.
