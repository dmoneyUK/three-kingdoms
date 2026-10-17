# Current Handover

Branch: `ux-v2`

## Latest relevant result

- Reviewed `docs/UX2-refine.md` at `6b9f023` (§10.15.3–10.15.6). Q1 diagnostics identified two broken joins in both Barbarian Invasion and Raining Arrows: Test Room's hidden draw shadowed the public root play with the same physical card ID, and the client consumed the final timeline event before its settlement projection arrived. Resolved participants can also validly lack an outcome; the old normalizer discarded that proof.
- Q2 local repair filters root identity to visible public plays, accepts outcome-free `RESOLVED` participants, retains proven final events until their matching snapshot proof arrives, and keeps Group child presentation attached to the same root while validating the current target. H4 remains unchanged; phone acceptance stands, and Q4 is cross-player consistency only.
- Q2 commit `d238cb6` is pushed. Exact-SHA Actions run `39042188164`: build, Lint/fast tests, and browser startup smoke passed; API tests failed before execution because the new API file was missing from `tests/run-api-suite.mjs`'s shard manifest, so deploy was skipped. The shard manifest is corrected locally. Focused evidence before the commit: Node tests 77/77, API regression 1/1, and focused browser regressions 4/4. Targeted ESLint locally hit Node 26's ~2 GB heap limit; Actions lint passed on Node 22. Current-Worker verification remains pending.

## Exactly one active task

**UX2-10.15-Q2-GROUP-ROOT-CANONICAL-JOURNEY-01 — CI repair and deployed verification.** Commit the API shard registration and verify the new exact SHA through Actions, repairing any additional failure. After CI/deploy passes, use the deployed Worker to replay both group cards through Negation, target responses, damage/trigger, settlement, and TEST SWITCH with detailed public-only diagnostics. Stop before Q3. Do not rewrite H4 unless a cross-player inconsistency is reproduced.
