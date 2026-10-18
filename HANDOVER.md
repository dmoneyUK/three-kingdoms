# Current Handover

Branch: `ux-v2`

## Latest result

- **EM-01:** deployed on `32b22b8` / `7cc761c`; exact-SHA runs `39078356730` and `39081904968` passed. It remains **PENDING USER REVIEW**.
- **BCP-1/2:** deployed and pending user phone review. Durable implementation and CI evidence is in `docs/AUTONOMOUS_UI_ROADMAP.md`.
- **BCP-3:** Retaliation now uses the compact picker, with no Cancel and side-by-side Use/Skip; retapping the selected hidden Hand position deselects. Server authorization, hidden-card privacy, and Frost Sword/Kirin Bow actions remain intact. Real gameplay browser tests passed 22/22, focused active-skill tests 45/45, build/lint/smoke, and production health. Exact-SHA run [`39117542770`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39117542770) passed for `f0df9b63fe417f6b2bcc3b743616f9527bdcc2d7`, including D1 migration, Worker deployment, and production smoke. Worker version `736e1301-bc09-4346-b4ac-962a098dfc09`. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, not accepted. BCP-1/2 evidence is in `docs/AUTONOMOUS_UI_ROADMAP.md`.
- **HUD-4:** Fixed public Equipment positions Weapon | Armour | +1 Horse | −1 Horse, neutral empty slots, and a diagonal sword glyph; HP remains left with a measured gap. Local evidence: build passed; server-render regression 20/20; fixed-slot/mobile geometry 37/37; Side Column/H2 geometry 8/8; real viewer switching and Inspector touch 2/2. Screenshots and DOMRects for 390×700 and 440×766 are in `/tmp/hud4-evidence` (not committed). Exact-SHA Actions run [`39118588563`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39118588563) passed lint/fast, API, browser startup smoke, D1 migration, Worker deploy, and production smoke for `5a8505efa0d29e4eeea34e41baa5267956419efb`. Worker version `27ff6996-a6bc-4c39-ac5b-4c16461f1a61`. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, not accepted.
- **Latest design reviewed at planning boundary:** `origin/ux-v2:docs/UX2-refine.md`, blob `aa979ce2b4e33aadaa5c5b61f5f2adb1619c997e`, §10.17.5–10.17.6.

## Exactly one current bounded task

**UX2-10.17-INS5-INSPECTOR-TWO-LEVEL-01 — READY.** Rework only the public opponent Inspector composition: larger undistorted Hero portrait at left; right upper level for existing identity/HP/Hand count, vertical compact skills, and exactly two visible Judgement positions with accessible overflow for third+; right lower level for authentic clickable Weapon/Armour/+1/−1 Equipment. Preserve existing detail navigation, privacy, Inspector close, skill semantics, and all rules. Validate zero/multiple skills, 0/2/3+ Judgement, 0–4 Equipment, long names, 390×700 and 440×894, 4/6/8/10 seats, Details/skill-description touch, Dock and TEST SWITCH clearance. HUD-4 is deployed on `5a8505efa0d29e4eeea34e41baa5267956419efb`, exact-SHA run `39118588563` passed, Worker `27ff6996-a6bc-4c39-ac5b-4c16461f1a61`; HUD-4 awaits user phone review. Preserve untracked user file `HANDOVER 3.md`.
