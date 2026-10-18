# Current Handover

Branch: `ux-v2`

## Latest result

- **`UX2-10.17.1.2-BCP1-F2-HARVEST-NEGATION-READONLY-POOL` — IMPLEMENTED / DEPLOYED, PENDING USER REVIEW.** Exact SHA `6836aa2905a3dc71f7d8dfde8619ae190f6f4e14`; Actions [39131345860](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39131345860) passed and deployed Worker `705b26bf-2802-46d6-9869-e6aceaac282c`. The read-only Harvest pool is tied to the exact typed root/reveal proof and contains no chooser actor or legal action. Focused mobile browser checks at 390×700/440×766 passed.
- **`UX2-10.17.5.1-INS5-F1-R-APPROVED-CONTENT-WRAPPED-PANEL` — IMPLEMENTED, CI REPAIR IN PROGRESS, PENDING USER REVIEW.** Feature source is `8d6efe3630575630fd3f03ff1b4d85e643495210`. Role repair `aef9816d8670c84c568ac8fc5ff43b36143414ef` fixed lint; exact-SHA Actions [39135383308](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39135383308) then failed `test:fast` because legacy assertions still expected a dialog and close button. Remote commit `544c1f8fcbb6905c741e332e2f10d7acb16e0a8b` has a narrower assertion change; its exact-SHA Actions [39135799919](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39135799919) is running. Local follow-up updates the unit and gameplay tests to the approved same-Hero toggle. Narrow fast reproduction passed (1/1), focused ESLint passed, and six selected browser regressions passed at phone viewports (390×700 base; test flows also exercise 390×844 and 440×766). No desktop viewports were checked. Worker deployment remains pending.
- **Latest design reviewed:** `docs/UX2-refine.md` at `7c2bb634cbd00a42df13c04a079a2a530eb01b1f`, §10.17.5.1-R. Preserve accepted H4 placement and the Q1–Q4 pause. Existing unrelated CSS edits and untracked `HANDOVER 2.md`–`HANDOVER 5.md` plus `tests/browser/em01-production-repro.tmp.spec.mjs` are preserved.

## Exactly one current bounded task

**CI repair for `UX2-10.17.5.1-INS5-F1-R-APPROVED-CONTENT-WRAPPED-PANEL` — rebase the validated full stale-test repair onto current `origin/ux-v2`, push it, then verify exact-SHA Actions and Worker/D1 deployment.** Keep the Inspector **PENDING USER REVIEW** after technical delivery. All visual and browser verification for this and subsequent UX tasks is mobile-only; prioritize short-height phones. Do not claim user acceptance.
