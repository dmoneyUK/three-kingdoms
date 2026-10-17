# Current Handover

Branch: `ux-v2`

## Latest results

- U13-F was delivered in `2d6c2bbb8a0770d13c3c9f0cadfbfcefecfcc44`; exact-SHA Actions run [39076355080](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39076355080) passed and deployed Worker `8bc9f9d4-699c-471b-bbf4-b02fd2fbedd5`. U13-F remains pending user phone review. Preserve user-accepted H3/H4 copy and H4 placement.
- EM-01 Checkpoint A is implemented locally. Against the current deployed Worker SHA `2d6c2bbb8a0770d13c3c9f0cadfbfcefecfcc44`, the 440×766 mobile hit map showed `.harvest-choice-stage` covering all three SWITCH centers (`pointer-events:auto`, `z-index:12`); an actual SWITCH tap timed out. The local fix makes the stage pass-through and grants pointer input only to the server-authorized actor's bounded Harvest panel. Focused local Worker/D1 browser test `bumper-harvest-touch-pass-through-real-gameplay.spec.mjs` passed with touch clicks: two TEST viewer switches, two accepted Harvest choices, unchanged server actor/confirmed choices/preview/deadline across spectator switches, plus Hero Inspector and private Hand Card Details during the open spectator choice. Targeted ESLint for `app/page.tsx` and the new browser test exhausted Node's ~2 GB heap; targeted build and `git diff --check` passed. Exact-SHA CI/deployment for this change is pending.
- Latest design reviewed: `origin/ux-v2:docs/UX2-refine.md`, blob `18a9e06e821a575b2ca4f6936760a46beddb2e5e`, including §10.16 EM-01. Q1–Q4 and cosmetic work remain superseded until EM-01 closes.

## Exactly one current bounded task

**UX2-10.16-EM01-NONBLOCKING-CHOICE-OVERLAYS — P0; IMPLEMENTATION PENDING USER REVIEW.** Checkpoint A code and focused test are ready for exact-SHA CI/deployment. After that urgent deploy is verified, continue Checkpoint B: audit and fix shared Steal/Burning Bridges, TargetCardPicker, MandatoryChoiceDialog, Stargazing, Legacy distribution and comparable in-game selection surfaces so only the actual authorized decision panel captures input. Then complete Checkpoint C across independent viewers, TEST SWITCH, Hero/Card inspection, mobile sizes, and side-seat layouts. Preserve server authority, private information, selection state and legal submission behavior. Do not mark user-accepted without explicit phone review.
