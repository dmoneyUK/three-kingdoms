# Current Handover

Branch: `ux-v2`

## Latest result

- **EM-01:** deployed on `32b22b8` / `7cc761c`; exact-SHA runs `39078356730` and `39081904968` passed. It remains **PENDING USER REVIEW**. Do not mark accepted.
- **BCP-1 implementation:** commit `8b7fd9a` contains the Harvest root/pool separation, compact public pool, independent Info, actor-only Confirm, local viewer/action-scoped selection and same-card deselect. The authentic root stays visible; server `choose_harvest` authorization and public taken status are unchanged.
- **Validation:** focused browser run passed 6/6; the follow-up real SWITCH/selection touch test passed; build passed. Browser test lint passed. Exact-SHA run `39114141116` passed browser startup smoke but `lint-fast` failed on the now-removed unused Harvest `actor` variable, so it did not deploy. Local 8 GB lint also exposed two pre-existing Inspector effect errors that CI did not report; leave those out of scope.
- **Latest design reviewed:** `origin/ux-v2:docs/UX2-refine.md`, blob `aa979ce2b4e33aadaa5c5b61f5f2adb1619c997e`, §10.17.

## Exactly one current bounded task

**UX2-10.17-BCP1-HARVEST-COMPACT-LAYERS-01 — LINT FIX / EXACT-SHA DELIVERY IN PROGRESS.** Push the unused-variable fix, verify the new exact-SHA Actions run and deployed Worker, then record **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**. Do not mark accepted or begin BCP-2 before this slice is deployed. Keep untracked user file `HANDOVER 3.md` untouched.
