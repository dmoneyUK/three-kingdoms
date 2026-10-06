# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

UX2.29 audited the `CurrentAction.targetCardSelection` consumer and all five `target_cards` producers (Retaliation, Frost Sword, Kirin Bow, Fanjian, and Yue Jin) against §12.4. No confirmed authoritative external flow is forced into the generic picker: focused targets use shared Selectable Detail, while missing target/zone/focus proof and unsupported self-zone mixtures retain fail-closed fallback. The target-card browser spec passed 34/34. UX2.28 Actions run `37507015662` for exact SHA `f47a9f9cf4548b64281e4e62706a36eaf9d5aafc` is `in_progress`; lint, build, and browser steps succeeded, while `npm test` was still running at last check. Reviewer acceptance is not claimed.

## Design checkpoint

Remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` is unchanged. §§12.0–12.9 and mobile invariants were reviewed. §12.6 compositions and §12.4 supported paths are implemented; §12.9 final integration gate remains open after the UX2.28 pile-clearance correction.

## Current task — UX2.30-UX2-FINAL-INTEGRATION-RECHECK-01

Re-run the representative §12.9 browser matrix against current `ux-v2` after UX2.28. Verify the covered interaction families/topologies and re-measure Oath/Bumper Harvest pile clearance at mobile and wide viewports. Use existing authoritative fixtures; do not broaden into a redesign or change gameplay/projection semantics. If a concrete regression remains, record the smallest blocking gap and stop for a separately bounded repair task.
