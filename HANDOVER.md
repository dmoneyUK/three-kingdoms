# Current Handover

Branch: `ux-v2`

## Latest result

- **EM-01:** deployed on `32b22b8` / `7cc761c`; exact-SHA runs `39078356730` and `39081904968` passed. It remains **PENDING USER REVIEW**. Do not mark accepted.
- **BCP-1:** fixed Harvest root/pool overlap with the authentic root CardFace parked at the table edge; added a compact public pool with independent Info, local viewer/action-scoped selection draft, same-card deselect and actor-only Confirm. Removed shared preview projection; legal `choose_harvest` remains server-authorized. Production reproduction baseline: `/tmp/bcp1-live-before.png`, `/tmp/bcp1-live-second.png`; overlap was 3,689 CSS px² before the fix.
- **Focused validation:** Playwright Harvest touch, timer and public activity tests passed 6/6; build passed; changed browser specs lint passed. `public-card-display.tsx` lint had 0 errors and 12 existing hook warnings. Local lint of `app/page.tsx` hit Node heap OOM (4 GB); exact-SHA CI remains required. `git diff --check` passed.
- **Latest design reviewed:** `origin/ux-v2:docs/UX2-refine.md`, blob `aa979ce2b4e33aadaa5c5b61f5f2adb1619c997e`, §10.17.

## Exactly one current bounded task

**UX2-10.17-BCP1-HARVEST-COMPACT-LAYERS-01 — IMPLEMENTED / PENDING EXACT-SHA CI AND DEPLOY.** Commit only BCP-1 source, focused tests and this handover; inspect the exact commit's Actions and deployed Worker, then record **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**. Do not mark accepted. Keep untracked user file `HANDOVER 3.md` untouched.
