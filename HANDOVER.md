# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `d7b0869b51545bdc06c50f9a815d4b09fb62b9dd`. The user is reviewing §8.7 on a phone; no acceptance is recorded here.

## Latest result

- §9.5 N0/N1 are delivered. N1 commit `7645fef192f06818eaaacdd01cc448f19a012e62`; Actions run `38621260318` passed API tests, lint/fast, browser smoke, and deploy. Production health returned HTTP 200 with the Worker available.
- §9.5 N2 is implemented locally. Focused Presentation/Snapshot/Client tests passed 128/128; Worker/D1 API tests passed 40/40; `npm run build` passed; real-browser Duel 4/6/8-seat, Group-target, and single-target history regressions passed. N2 push CI and deployment are pending.
- N2 adds exact Group root-play event proof to the server continuation and validated public projections, and renders complete, uniquely proven Negation histories at authors' seats. No private losing card is included.

## Current task — UX2 §9.5 N2 delivery

Commit only N2 implementation, regressions, and progress documentation. Verify exact-SHA Actions jobs and deployment; if CI fails, diagnose and fix it before proceeding. Once N2 CI/deploy are green, update this handoff to the single next task, §9.5 N3 immediate post-commit public presentation, then continue per the approved sequence. Do not modify design requirements, claim §8.7 phone acceptance, start a new card family, or implement §11 UX3.
