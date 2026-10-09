# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

P2's real server-generated Steal, Dismantle, Retaliation, Frost Sword, and
Kirin Bow production-page browser proof passed 14/14 locally, including mixed
Hand/Equipment/Judgment privacy and modal geometry. Exact remote HEAD
`d44805190d0238c041ab34d7a178b05a11f1a9dd` Actions run `37893195651` completed
with API and both Browser shards successful; Lint/fast failed because ESLint
exhausted its 4GB Node heap before Build/fast tests, so deploy was skipped.
The CI-only repair raises the lint-step heap to 8GB without changing rules or
coverage. ESLint over all tracked JS/TS-family files passed locally with 0
errors (2 ignored-file warnings). Repair commit/push and exact-SHA validation
are pending. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`; unchanged. Re-reviewed §§4D.1–4D.3,
§6.25, and §6.27.4. The real Host Game → playing-page browser proof and green
run satisfy the §4D P1 entry gate; §6 remains deferred by §4D.3.

## Current task

`UX2-4D-P2-UNIFIED-TARGET-CARD-PRODUCTION-PATH-01` — finish §4C for real
server-generated Steal, Dismantle, Sima Yi Retaliation, Frost Sword, and Kirin
Bow decisions. Route valid CurrentAction target-card authority to one coherent
modal without unrelated Hero Focus / Inspect / transient-preview gates; retain
anonymous Hand positions and public Equipment/Judgment faces; keep grouped
`hand` fallback inside the same visual language. Prove supported flows through
the real server projection and production page, including a mixed-zone case,
and show no normal supported path falling back to the legacy picker. Section 6
work stays deferred until all §4D.3 gates close.
