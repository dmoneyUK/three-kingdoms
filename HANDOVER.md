# Current Handover

Branch: `ux-v2`

## Latest result

- **EM-01:** deployed on `32b22b8` / `7cc761c`; exact-SHA runs `39078356730` and `39081904968` passed. It remains **PENDING USER REVIEW**.
- **BCP-1/2:** deployed and pending user phone review. Durable implementation and CI evidence is in `docs/AUTONOMOUS_UI_ROADMAP.md`.
- **BCP-3:** Retaliation now uses the compact picker, with no Cancel and side-by-side Use/Skip; retapping the selected hidden Hand position deselects. Server authorization, hidden-card privacy, and Frost Sword/Kirin Bow actions remain intact. Real gameplay browser tests passed 22/22, focused active-skill tests 45/45, build/lint/smoke, and production health. Exact-SHA run [`39117542770`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39117542770) passed for `f0df9b63fe417f6b2bcc3b743616f9527bdcc2d7`, including D1 migration, Worker deployment, and production smoke. Worker version `736e1301-bc09-4346-b4ac-962a098dfc09`. **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, not accepted. BCP-1/2 evidence is in `docs/AUTONOMOUS_UI_ROADMAP.md`.
- **HUD-4:** Implemented fixed public Equipment positions Weapon | Armour | +1 Horse | −1 Horse, neutral empty slots, and a diagonal sword glyph. The HP row stays left with a measured gap. Local evidence: build passed; server-render regression 20/20; fixed-slot/mobile geometry 37/37; Side Column/H2 geometry 8/8; real viewer switching and Inspector touch 2/2. Screenshots and DOMRects for 390×700 and 440×766 are in `/tmp/hud4-evidence` (not committed). **Implementation pending exact-SHA CI/deploy; user phone review still required after deployment.**
- **Latest design reviewed at planning boundary:** `origin/ux-v2:docs/UX2-refine.md`, blob `aa979ce2b4e33aadaa5c5b61f5f2adb1619c997e`, §10.17.4–10.17.6.

## Exactly one current bounded task

**UX2-10.17-HUD4-FOUR-FIXED-SLOTS-SWORD-01 — IMPLEMENTED LOCALLY; PUSH / EXACT-SHA CI PENDING.** Source and focused regressions are ready for one independent task commit. A Node 26 targeted ESLint attempt with an 8GB heap reported only two existing `react-hooks/set-state-in-effect` findings at untouched lines 3144 and 3149 of `app/page.tsx`; the same source baseline passed exact-SHA CI run `39117542770`. The current HUD-4 commit's CI remains authoritative. After that SHA passes deployment and production smoke, mark **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, then re-read current design and hand off the single next task, INS-5. Preserve untracked user file `HANDOVER 3.md`.
