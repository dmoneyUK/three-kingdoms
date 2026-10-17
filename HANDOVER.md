# Current Handover

Branch: `ux-v2`

## Latest relevant result

- Reviewed the latest `docs/UX2-refine.md` at `e0a136c` (blob `a7033d2`), §§10.15.3–10.15.6. Q1 production diagnostics identified the public-root/settlement join gaps and a Group child-view crash caused by reading display-shaped fields from ID-shaped `rootOrigin` proof.
- Q2 repair is pushed in `d2bd2d6`: preserve the proven root identity through child views; retain valid `RESOLVED` participants with no individual outcome; keep the public root until matching settlement proof arrives; and test both Standard AOE card kinds. H4 is unchanged.
- Exact-SHA Actions run [`39043497415`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39043497415) passed browser startup smoke, Lint/fast, API tests, D1 migration, deploy, and production smoke for `d2bd2d692153e9f054ef56a867e080124bf286fc`. Deployed Worker Version ID: `5ef4a4fe-cd33-4a0c-93a3-cf9ef19d0a64`.
- Production Worker/D1 replay completed Barbarian Invasion and Raining Arrows through Negation, target responses, damage/trigger, settlement, and Test Switch. Root event/card/source/interaction/frame identity stayed stable; each settlement proof was public to all four switched viewer seats. Trace showed one parked root thumbnail and no full-size old-root fallback during Group Resolution. Barbarian follow-up: 73 browser API requests, 0 non-OK; Raining Arrows: 75, 0. One browser/Test Switch controller was used; this was not four independent clients. Technical delivery is pending human re-review.
- H4-A/B/C phone acceptance remains in force. Q4 is for cross-player consistency; do not change H4 unless current evidence reproduces an inconsistency.
- Per the user's reprioritization, Q3 and then Q4 are deferred until a short batch of independent, approved mobile/Inspector fixes is complete. Q3's parked-card first-paint/view-switch risk remains open; Q4 remains verification-first and preserves accepted H4. No replacement handover file is in use.
- R4-H was pushed as `14cc15b` (full SHA `14cc15ba472ddef4de3c7d83e526860752666c42`). Exact-SHA Actions run [`39045299780`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39045299780) passed Lint/fast, API tests, browser startup smoke, D1 migration, deploy, and production smoke; Worker Version ID `ddd137c3-8317-4c66-aa79-0d8ec6d3c3bb`. The visible `DETAILS` label is now an inset 34px circular `i`; accessible 44×44 action, selected-card path, and Card Details preview remain. Existing UI19 visual/accessibility assertions were updated. `git diff --check` passed; focused R4-H browser geometry cases were not run locally and remain to be verified, as does user phone review. Technical delivery is PENDING REVIEW.

## Exactly one next bounded task

**UX2-10.7-R4-H-INSET-HAND-INFO-01.** Replace the selected Hand card's visible `DETAILS` rectangle with the approved inset circular `i`, preserving the existing R4-F preview, selection semantics, accessibility, and fully-contained 44×44 hit target. Verify selected-card and multi-selection geometry across the specified Hand counts/viewports. Mark delivery PENDING USER PHONE REVIEW. After this bounded quick win closes, continue the independent approved quick-win batch; resume Q3 before Q4 after that batch.
