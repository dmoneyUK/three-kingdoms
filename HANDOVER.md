# Current Handover

Branch: `ux-v2`

## Latest relevant result

- Reviewed the latest `docs/UX2-refine.md` at `e0a136c` (blob `a7033d2`), §§10.15.3–10.15.6. Q1 production diagnostics identified the public-root/settlement join gaps and a Group child-view crash caused by reading display-shaped fields from ID-shaped `rootOrigin` proof.
- Q2 repair is pushed in `d2bd2d6`: preserve the proven root identity through child views; retain valid `RESOLVED` participants with no individual outcome; keep the public root until matching settlement proof arrives; and test both Standard AOE card kinds. H4 is unchanged.
- Exact-SHA Actions run [`39043497415`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39043497415) passed browser startup smoke, Lint/fast, API tests, D1 migration, deploy, and production smoke for `d2bd2d692153e9f054ef56a867e080124bf286fc`. Deployed Worker Version ID: `5ef4a4fe-cd33-4a0c-93a3-cf9ef19d0a64`.
- Production Worker/D1 replay completed Barbarian Invasion and Raining Arrows through Negation, target responses, damage/trigger, settlement, and Test Switch. Root event/card/source/interaction/frame identity stayed stable; each settlement proof was public to all four switched viewer seats. Trace showed one parked root thumbnail and no full-size old-root fallback during Group Resolution. Barbarian follow-up: 73 browser API requests, 0 non-OK; Raining Arrows: 75, 0. One browser/Test Switch controller was used; this was not four independent clients. Technical delivery is pending human re-review.
- H4-A/B/C phone acceptance remains in force. Q4 is for cross-player consistency; do not change H4 unless current evidence reproduces an inconsistency.

## Exactly one next bounded task

**UX2-10.15-Q3-VIEWER-REBASE-NO-MOTION-01.** On TEST SWITCH and legitimate resize/topology changes, rebase parked Journey cards to newly measured current-view author anchors before first paint, with no old-view flight, reveal replay, or lifecycle reset. Verify the first painted frame and ≤2px anchor error across the Journey families specified in `docs/UX2-refine.md` §10.15. Stop before Q4.
