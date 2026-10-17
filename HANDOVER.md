# Current Handover

Branch: `ux-v2`

## Latest relevant result

- Reviewed `docs/UX2-refine.md` at `6b9f023` (§10.15.3–10.15.6). Q1 diagnostics identified two broken joins in both Barbarian Invasion and Raining Arrows: Test Room's hidden draw shadowed the public root play with the same physical card ID, and the client consumed the final timeline event before its settlement projection arrived. Resolved participants can also validly lack an outcome; the old normalizer discarded that proof.
- Q2 local repair filters root identity to visible public plays, accepts outcome-free `RESOLVED` participants, retains proven final events until their matching snapshot proof arrives, and keeps Group child presentation attached to the same root while validating the current target. H4 remains unchanged; phone acceptance stands, and Q4 is cross-player consistency only.
- Focused local evidence: build passed before the final hook-dependency cleanup; Node tests 77/77, API regression 1/1, and the focused browser regressions 4/4. `git diff --check` is pending. Targeted ESLint could not run to completion under local Node 26's ~2 GB heap limit. No exact-SHA Actions run or current-Worker verification exists for this change yet.

## Exactly one active task

**UX2-10.15-Q2-GROUP-ROOT-CANONICAL-JOURNEY-01 — exact-SHA CI and deployed verification.** Commit and push only the Q1/Q2 files, repair any failure from the new SHA's Actions run, then use the deployed Worker to replay both group cards through Negation, target responses, damage/trigger, settlement, and TEST SWITCH with detailed public-only diagnostics. Stop before Q3. Do not rewrite H4 unless a cross-player inconsistency is reproduced.
