# Current Handover

Branch: `ux-v2`

## Latest confirmed technical result

- **U13-D Equipment horse glyphs: CODE DELIVERED / PENDING HUMAN REVIEW**, commit `68607723a8dc67cc3044f653838048abf97dafc3`; exact-SHA [Actions run 38962040257](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38962040257) passed API, lint/build/fast, browser startup/room smoke (1), deployment and production / plus /api/health smoke; Worker version `5e330c4b-af07-4995-9ae5-6eaf0ddd2faa`. No real 390px multi-device geometry was run.
- **USER-REJECTED U13-A on real iPhone 2026-10-16**: code commit `9d75811b424afc145074bee52c0fc9ada7e9e027` had green CI but **FAILS** the essential 3-card Discard visual. After tapping card A/B/C in required THREE-card discard, only most recent card visibly rises; earlier selected card visually returns to original row. Original U13-A cannot be marked accepted; source audit confirms distinct 48+17px single vs 0+17px multi card wrapper movement. The runtime ID/click/overlap cause still requires proof.
- User **H2-F phone review accepted** original typography, then approved separate **H2-G1/G2/G3 new seat layouts**; H2-G remains unimplemented. Preserve accepted R4-F and H1-F.
- Latest authoritative `docs/UX2-refine.md` blob **`498df77693bf3c6986e958d22c402dfd9eaa249d`** (includes **§10.13.1.1 U13-A-F** P0 proof-first correction). Re-read on each new bounded task. Preserve local untracked `HANDOVER 3.md`.

## CURRENT TASK (do not preempt in-flight work)

**UX2-10.13-U13-E-LUST-COST-FRAME-01.** Complete already-started proof-backed LUST cost Frame: skill title above the one genuine cost CardFace, tighter adaptive geometry, correct CSS/JS dimensions, no redundant same-event notice. Preserve real card proof, normal Duel vs Lust-generated-Duel distinction, author parking/history, Policy B, real response order, privacy. Scope to §10.13.5 and §10.13.9; do not bundle multi-discard into U13-E. Do not overwrite any uncommitted Agent work. Once technically complete, record actual code SHA/CI/deploy and mark U13-E **PENDING HUMAN REVIEW**.

## NEXT TASK — P0 U13-A-F (supersedes old H2-G1 next priority)

**ID:** `UX2-10.13-U13-A-F-MULTI-DISCARD-FULL-VISUAL-LIFT-01`.

**READ:** `docs/UX2-refine.md §10.13.1.1` plus current `app/page.tsx renderHandCard()`, `app/sequence-overrides.css` final hand rail rules. Human explicitly FAILED prior U13-A on REAL iPhone; don't declare it fixed without full 3-card physical visual proof.

1. **Reproduce with THREE required discards** (not merely two, and not simulated action state only): real authenticated Worker/D1 4-viewer setup, player in actual Discard phase (`room.phase==="discard"`), `excessCards===3`, own Hand >=5. Tap A, then B, then C on iPhone-like 390x844 and short 390x700; repeat in reverse overlap order. At each click capture selected IDs/count, clicked physical `data-hand-card-id` and `document.elementFromPoint` hit, `data-card-selected`, `aria-pressed`, `getComputedStyle` on `.hand-card-visual`/`.game-card`, bounds, z-index, visible painted region, scrollLeft, local action API requests and screenshot/video frame. Establish whether prior card actually deselects, is merely obscured, or is still selected but not raised. Never presume backend uses one-card Play.
2. **Code defect already grounded:** Dock `--selected-rise:48px` + `--selected-face-rise:17px`, but `.card-slot.multi-selected .hand-card-visual {transform:none}` and only inner card rises 17px; single selection lifts outer 48px plus inner 17px. With 68px wide overlapping slots and earlier selections painted over later via inline z-index, this is not the SAME visual model. Fix at the proper shared wrapper/face level: EVERY actually selected multi card raises >=40px actual visible top displacement (ideally matches single's final ~65px), stays raised as more selected, retains border and readable face; all 3 individually visible/tappable. Do not merely set a selected data attribute or replace 17 with another tiny shift; measure card bounding rectangles and exposed pixels after third tap. Ensure correct actual click-to-id mapping despite z-index and native rail scrolling.
3. **Acceptance assertion:** A up → A+B BOTH up → A+B+C ALL 3 up with count3/3. Deselect B → ONLY B down, A+C still up, count2/3. Select D → A+C+D up; Confirm sends **exactly A,C,D** in ONE real `discard_cards` action; NO `play_card` request before or after selection. Test variant A/B/C reversal, 5 and 8-card overlapping Hand, 390x700/844, 440x894, 480x900, native iPhone Safari/WebKit if available (declare if unavailable); assert DOMRects/visible raised cards, not merely 3 true classes. No fourth card accepted when excess is 3.
4. **Regressions/limits:** Preserve active-turn single Play lift and real card confirmation, R4-F 44px inset Details, R4-G inspection-only planned state, genuine out-of-turn Dodge/Negation/Duel, two-card multi-cost, discards/HP/legal action, Hand scroll/focus and server privacy. Focused browser/JS and API, lint/build, normal exact-SHA CI/deploy. Record ACTUAL test commands, visual screenshots/measurements, code SHA and CI results. If no real-browser end-to-end test, state limitation; don't pass based on smoke alone.
5. **Result:** Mark **U13-A-F technically delivered / PENDING REAL-IP​HONE USER RE-REVIEW** only after step 3 is demonstrated; **original U13-A remains USER-REJECTED** until user passes. Do not ask them to retest the same previous deployment.

## AFTER U13-A-F — preserve approved queue

Run separate already-approved **H2-G1 → H2-G2 → H2-G3** seat/own-dock layout tasks from §10.8.2.2, after this P0 fix. Keep **U13-F/G/H**, Beauty B1–B3, R4-G off-turn Hand Details, R2-D ordinals, W2–W6 Hero/Equipment presentation, T1–T3 Steal/Dismantle, G1–G2 Stargazing, and delivered U13-B/C/D/H4 pending phone review. Do not cancel, combine, or self-accept work; UX3 remains out of scope. Maintain a short current/result handover and remove stale queued tasks at each execution boundary.
