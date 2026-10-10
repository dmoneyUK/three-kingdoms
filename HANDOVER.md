# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

`UX2-ATTACK-ROOT-EVENT-IDENTITY-FIX-01` is implemented locally. The Attack declaration now preserves the original public card-play event ID through Attack-targeted triggers and into the Dodge continuation; projection no longer treats `readyAfterEventId` as the root. Focused validation passed: build, 49 API tests, 44 PresentationV2 tests, and ESLint on the five changed files. Push/Actions/deployment for this change are pending.

Most recent relevant Actions run before this change: `38055057432`, success for code SHA `9c2bfccb7c61a5c53a20be5461a8eff6713f6403`. Current base SHA `09655f1bec6bbcbb8f51d6974a03cc52d1ce9174` is a Markdown-only handoff commit and did not trigger deploy workflow.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed; no change since the previous handoff.

## Current task

`UX2-ATTACK-ROOT-EVENT-IDENTITY-FIX-01` — implementation complete; commit, push, and verify the exact SHA's minimal CI/deployment. Keep `readyAfterEventId` as the decision barrier, require one exact public Attack play event as root, and reject missing, duplicate, non-play, or card-mismatched identities. Do not change settlement priority, timers, or viewport layout.
