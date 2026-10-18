# Current Handover

Branch: `ux-v2`

## Latest result

- **`UX2-10.17.1.2-BCP1-F2-HARVEST-NEGATION-READONLY-POOL` — implementation complete; exact-SHA CI/deploy pending; user review pending.** The Negation projection links the identical read-only pool to the exact typed Harvest root and public reveal event, validates the `ACTIVE`/`BLOCKED` branch state, and exposes no chooser actor or legal action. The keyed UI keeps card identity through read-only-to-chooser promotion; Negation has no selection or Confirm controls. Build passed; focused Worker/D1 API tests 44/44, room-safety tests 11/11, and browser tests 2/2 at 390×700/440×766 passed. Browser coverage includes four TEST SWITCH seat projections, no `choose_harvest` POST on card touch, Info, Inspector, and interactive chooser promotion.
- **`UX2-10.17.5.1-INS5-F1-COMPACT-WRAPPED-HERO-INSPECTOR` — IMPLEMENTED / DEPLOYED, PENDING USER REVIEW.** Source SHA `72bf1206086df2f617ea59afcfabc8ca087ffaa3`; Actions run [39129627112](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39129627112) passed and production Worker version `72dcd0df-f1ba-455b-9122-25a6915afa9a` was verified.
- **Latest design reviewed:** remote `docs/UX2-refine.md` commit `7be342124b7d3c5a88e1a298ffa901b709189ff5`; §§10.17.1.1–10.17.1.2 and 10.17.4.1. Preserve accepted H4 copy and Q1–Q4 pause. Existing unrelated CSS edits and untracked `HANDOVER 2.md`–`HANDOVER 5.md` plus `tests/browser/em01-production-repro.tmp.spec.mjs` are preserved.

## Exactly one current bounded task

**`UX2-10.17.1.2-BCP1-F2-HARVEST-NEGATION-READONLY-POOL` — exact-SHA CI/deploy and production verification.** The implementation and focused local evidence are complete. Wait for the pushed source SHA's full Actions/deployment result, verify production smoke/version for that exact SHA, then mark **IMPLEMENTED / DEPLOYED — PENDING USER REVIEW**. Do not claim user acceptance.
