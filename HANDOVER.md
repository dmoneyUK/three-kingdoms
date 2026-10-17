# Current Handover

Branch: `ux-v2`

## Latest relevant result

- U13-E/F §10.13.5.1 is implemented locally. Focused build and browser checks pass for four authenticated viewers across 390×700, 390×844, 440×894, and 480×900, including root reveal/move/park, two Attack responses, Skip/settlement, alternate-seat Diao Chan, and long Latin/Chinese names. The measured Frame is 168×190 around the complete 90×135 physical card; it is hidden during the 380ms card move after a measured H4 overlap, and no longer obstructs the accepted H4 band. Exact-SHA CI/deploy and deployed Worker/D1 Test Switch replay are pending. H4 remains unchanged; Q3/Q4 remain deferred.
- Prior Q1/Q2, R4-H/I, U13-B-G/C/H results are summarized in `docs/AUTONOMOUS_UI_ROADMAP.md`. H4-A/B/C remains user-accepted. Preserve current L4/L5 review status and do not infer phone acceptance from local evidence.

## Exactly one current bounded task

**UX2-10.13.5.1-U13-E-F-NAMES-TIGHT-FRAME-01 — exact-SHA delivery and production verification.** Push the implemented player-name and compact-frame fix, verify that exact SHA's Actions/deployment, then replay four-player LUST on the deployed Worker/D1 with Test Switch and capture the four required phone sizes. Validate public names, order/actor, Attack responses, Skip/settlement, alternate seats, and cross-view consistency. Finish PENDING USER PHONE REVIEW; preserve accepted U13-E/H4 and L4/L5 review status. Q3/Q4 remain deferred. Reviewed design: `docs/UX2-refine.md` at `e0a136c`, §10.13.5.1.
