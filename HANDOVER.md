# Current Handover

Branch: `ux-v2`

## Latest result

- **EM-01:** deployed on `32b22b8` / `7cc761c`; exact-SHA runs `39078356730` and `39081904968` passed. It remains **PENDING USER REVIEW**.
- **BCP-1/2:** deployed and pending user phone review. Durable implementation and CI evidence is in `docs/AUTONOMOUS_UI_ROADMAP.md`.
- **BCP-3 local implementation:** Sima Yi Retaliation reuses the compact picker; Cancel is removed for Retaliation only; Use/Skip stay side by side; re-tapping a hidden Hand position deselects it. Skip and card submission still use distinct server-authorized `decline_trigger` and `trigger` actions. Frost Sword and Kirin Bow retain their prior authorization-driven actions. No server rule, protocol or private projection changed.
- **BCP-3 validation:** production build passed; focused `target-card-real-gameplay.spec.mjs` passed 22/22 with real Worker/D1 gameplay, touch at 390×700 and 440×766, actor/nonactor privacy, Inspector/Card Details, retap deselection, single submit and distinct Skip; focused active-skill tests passed 45/45; focused browser-test ESLint and `git diff --check` passed. Screenshot evidence is in the generated Playwright results. App-source ESLint is left to CI due the known local Node heap limit.
- **Latest design reviewed:** `origin/ux-v2:docs/UX2-refine.md`, blob `aa979ce2b4e33aadaa5c5b61f5f2adb1619c997e`, §10.17.3–10.17.6.

## Exactly one current bounded task

**UX2-10.17-BCP3-RETALIATION-CONTROLS-01 — LOCAL VALIDATION PASSED; EXACT-SHA DELIVERY PENDING.** Commit and push only the BCP-3 picker, CSS, focused browser regression and this handover. Verify exact-SHA CI, D1 migration, Worker deployment and production smoke before starting HUD-4. Mark **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, not accepted. Preserve untracked user file `HANDOVER 3.md`.
