# Current Handover

Branch: `ux-v2`

## Latest result

- **EM-01:** deployed on `32b22b8` / `7cc761c`; exact-SHA runs `39078356730` and `39081904968` passed. It remains **PENDING USER REVIEW**.
- **BCP-1/2:** deployed and pending user phone review. Durable implementation and CI evidence is in `docs/AUTONOMOUS_UI_ROADMAP.md`.
- **BCP-3:** Retaliation now uses the compact picker, with no Cancel and side-by-side Use/Skip; retapping the selected hidden Hand position deselects. Server authorization, hidden-card privacy, and Frost Sword/Kirin Bow actions remain intact. Real gameplay browser tests passed 22/22, focused active-skill tests 45/45, build/lint/smoke, and production health. Exact-SHA run [`39117542770`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39117542770) passed for `f0df9b63fe417f6b2bcc3b743616f9527bdcc2d7`, including D1 migration, Worker deployment, and production smoke. Worker version `736e1301-bc09-4346-b4ac-962a098dfc09`. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, not accepted. BCP-1/2 evidence is in `docs/AUTONOMOUS_UI_ROADMAP.md`.
- **Latest design reviewed at planning boundary:** `origin/ux-v2:docs/UX2-refine.md`, blob `aa979ce2b4e33aadaa5c5b61f5f2adb1619c997e`, §10.17.4–10.17.6.

## Exactly one current bounded task

**UX2-10.17-HUD4-FOUR-FIXED-SLOTS-SWORD-01 — READY.** In `OpponentPlayerCard`, reserve four stable opponent Equipment positions in the approved order Weapon | Armour | +1 Horse | −1 Horse. Empty positions keep their footprints without fake equipped icons. Keep HP left with a clear gap; redraw the opponent sword as a diagonal long-blade/short-handle glyph with crossguard and pommel. Preserve public card data and all game rules. Measure occupied/empty slot x positions and HP gap; cover 0–4 slots, Weapon-only/Horse-only, equip/replace/discard, 390/440px, 4/6/8/10 seats, TEST SWITCH, and touch/overlap. Commit and deploy independently; mark **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, never accepted. Preserve untracked user file `HANDOVER 3.md`.
