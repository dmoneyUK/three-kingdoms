# Current Handover

Branch: `ux-v2`

## Latest result

- **`UX2-10.17.1.2-BCP1-F2-HARVEST-NEGATION-READONLY-POOL` — IMPLEMENTED / DEPLOYED, PENDING USER REVIEW.** Exact SHA `6836aa2905a3dc71f7d8dfde8619ae190f6f4e14`; Actions [39131345860](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39131345860) passed and deployed Worker `705b26bf-2802-46d6-9869-e6aceaac282c`. The read-only Harvest pool is tied to the exact typed root/reveal proof and contains no chooser actor or legal action. Focused mobile browser checks at 390×700/440×766 passed.
- **`UX2-10.17.5.1-INS5-F1-R-APPROVED-CONTENT-WRAPPED-PANEL` source pushed at `8d6efe3630575630fd3f03ff1b4d85e643495210`; redundant-role repair pushed at `aef9816d8670c84c568ac8fc5ff43b36143414ef`.** The mobile geometry, actor/spectator privacy, active-action preservation, nested Card Details, keyboard and touch checks passed (17 focused mobile tests; build/browser jobs passed). Exact-SHA Actions run [39135383308](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39135383308) passed lint/build, API and browser startup, but `test:fast` failed one stale `role="dialog"` assertion; deployment was skipped. The follow-up changes only the test to assert the named Inspector region and its absence during target mode. CI/deployment and user review remain pending. Mobile-only checks were run; no desktop viewports.
- **Latest design reviewed:** `docs/UX2-refine.md` at `7c2bb634cbd00a42df13c04a079a2a530eb01b1f`, §10.17.5.1-R. Preserve accepted H4 placement and the Q1–Q4 pause. Existing unrelated CSS edits and untracked `HANDOVER 2.md`–`HANDOVER 5.md` plus `tests/browser/em01-production-repro.tmp.spec.mjs` are preserved.

## Exactly one current bounded task

**CI follow-up for `UX2-10.17.5.1-INS5-F1-R-APPROVED-CONTENT-WRAPPED-PANEL` — push the focused test correction, verify exact-SHA Actions and Worker/D1 deployment, then integrate the remote `ux-v2` tip into `main` without local uncommitted work.** Keep the Inspector **PENDING USER REVIEW** after technical delivery. All visual and browser verification for this and subsequent UX tasks is mobile-only; prioritize short-height phones. Do not claim user acceptance.
