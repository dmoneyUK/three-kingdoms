# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

UX2.32 adds Kirin Bow browser proof for authoritative public Mount selection: eligible Equipment identities render only with proven external focus, selection stays local until Confirm, the existing `trigger` payload submits once, action-revision changes clear selection, and missing focus/projection proof retains the generic picker. The target-card browser suite passed 47/47 across the focused Kirin Bow cases and existing coverage; targeted ESLint and `git diff --check` passed. Test fixture/spec only; no gameplay or projection changes. Pre-commit Actions run `37510268990` for exact remote SHA `3d64a02cad462ebb6df1fdbed516865693ce4805` completed **success**. Reviewer acceptance is not claimed.

## Design checkpoint

Remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` is unchanged. The authority/privacy baseline and §§12.0–12.9 were reviewed. The representative §12.9 matrix passes; the final gate remains open until remaining approved deltas close. Reviewer acceptance is unclaimed.

## Current task — UX2.32-KIRIN-BOW-SELECTABLE-DETAIL-BROWSER-PROOF-01

Close the completed Kirin Bow Selectable Detail browser-proof task with this commit. Its scope is the existing `target_cards` option against a damaged opponent's publicly identified Mount: projected target focus, public Equipment identity, local-until-Confirm selection, one existing `trigger` payload, action-revision reset, and generic-picker fallback when focus/public-card proof is absent. No gameplay or semantic projection changes.
