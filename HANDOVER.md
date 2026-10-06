# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

CI REPAIR PUSHED — VALIDATION PENDING. Remote HEAD `b6a25e249da299eb176dd64d495d51c37451d55c` failed Actions run `37516354859` in `npm run test:browser`: eight Dying geometry checks reproduced a mobile layout regression from UX2.34, not an infrastructure failure. The compact causal row now activates when the measured safe zone cannot clear the Stage and bottom card-pile area, while preserving the established primary Hero portrait sizes and public/Dock ownership. Focused browser validation passed 19/19 (`Dying 650x900`, 480x900 pile clearance, proven Dying causal geometry and six safe-zone cases); targeted ESLint and `git diff --check` passed. No gameplay/projection changes. Resume UX2.35 only after the exact pushed repair HEAD is green. Reviewer acceptance is not claimed.

## Design checkpoint

Remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` is unchanged and was re-read at the task boundary. The §12.0–12.9 status and authority/privacy contracts were reviewed. Group/AOE, Oath, and Bumper Harvest structural compositions are implemented; the final gate remains open until remaining approved deltas close. Reviewer acceptance is unclaimed.

## Current task — UX2.35-BORROWED-SWORD-MOBILE-CAUSAL-SPINE-01

For a proven Borrowed Sword forced-Attack child scene on mobile Top Row portrait, make the current attacker → Attack → forced target read top-to-bottom when safe-zone space permits. Preserve the immutable root-source/holder/target proof, two-player Dock ownership, fail-closed behavior when root proof is absent, the compact layout under short safe-zone pressure, Side Column and wide layouts. Add geometry proof for causal order and safe-zone/Dock containment. No gameplay or projection changes. Authority: current Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a`, §§12.3 and 12.7.
