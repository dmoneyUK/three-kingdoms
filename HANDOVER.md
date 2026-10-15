# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

**UX2-10.9-W1-SERVER-TO-PUBLIC-PROOF-AUDIT-01 — implementation complete; PENDING REVIEW.** Added `docs/UX2_PUBLIC_CARD_PROOF_INVENTORY.md` for the §10.9 Hero and Equipment cases. Filled demonstrated server-to-public proof gaps with allowlisted typed proofs, preserving authoritative physical-card IDs, root linkage, zone movement and viewer privacy. Yin-Yang Swords now exposes its target Hand card only after committed discard; the exact event links to the original Attack, and the continuation persists the discard exactly once. No renderer or visual UX was changed.

Focused Worker/D1 API regression: 199/199 across the 13 W1-related suites passed. `npm run build` passed. Targeted ESLint passed with 0 errors and 3 `app/page.tsx` hook-dependency warnings on unchanged code. `git diff --check` passed. Code commit/push: `b115c0bf1b21af36a3aa62665aebc5789d2fda8c`. Exact-SHA [Actions run 38711938785](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38711938785) succeeded: Lint/fast tests, API tests, Browser startup/room smoke, and deploy. Production `/api/health` returned HTTP 200 with `{"ok":true,"worker":"available"}`. No visual acceptance is claimed.

## Planner's latest product-review decisions (2026-10-15)

Current definitive UX design: `docs/UX2-refine.md`, blob `fbc12dc683b86cdd9151366c0e31d04a981a0483`. **Preserve the latest completed W1 technical result above; no additional code implementation or CI/deploy is claimed by this handover update.**

- **USER-ACCEPTED/CLOSED:** §10.7 R1 (Dodge during previous Attack reveal), original R2-A/B/C (true-author Negation chain centre→Seat parking) and R3 (contextual TAKE DAMAGE vs PASS labels). These must not be reopened because of separate visual requests.
- **USER DID NOT ACCEPT visual:** R4 original selected-Hand `DETAILS` outer strip / over-large Card Details and H1 local Hero Details. They are specifically **NEW independent correction tasks**, `§10.7.4.1 R4-F` and `§10.8.1.1 H1-F`. Screenshots supplied in human review 2026-10-15; screenshots are in that conversation, not repo artefacts. Original R4/H1 implementations are factual delivered baselines, **not visual acceptance**.
- **Still READY, not yet technically delivered:** R2-D global within-chain physical CardFace numbered badges, `§10.8.4 H4-A/B` *stable central public announcement*, `§10.9 W2–W6` (W1 proof already delivered), `§10.10 T1–T3` public Steal/Dismantle multi-view, and `§10.11 G1–G2` Stargazing whole-card touch drag.
- **Human review queue is independent of Coding Agent work:** next **H2 opponent-seat layout**, then H3. Only one reviewer acceptance topic at a time. Do NOT self-mark either R4-F or H1-F accepted. Preserve current H2 code until actual user feedback.

## Next bounded Coding Agent task — R4-F (queued; conditional UX execution)

**READ FIRST:** `docs/UX2-refine.md §10.7.4.1 R4-F` and current actual `app/page.tsx` + final-effective CSS. **User's former pause on entering UX implementation should be respected until a direct new instruction authorizes/resumes coding**; documentation task queue preparation itself is not that start instruction. On explicit resume, do ONE task at a time and preserve all accepted rules and visual behavior.

**Task ID:** `UX2-10.7.4.1-R4-F-COMPACT-CARD-DETAILS-01`

1. Reproduce the submitted iPhone visual: raised selected Attack; separate large `DETAILS` button outside its lower card border; big detail popup with redundant visible `CARD DETAILS`, `PRIVATE TO YOU`, `RULES`, empty space.
2. Implement minimal JSX/CSS only: put actual accessible `DETAILS` target **inside the selected CardFace's bottom edge**, no external add-on; panel content height follows true art and rules, with compact nonmodal battlefield-local layout and accessible close. Remove the three redundant visual labels, **not** genuine private rules, accessibility semantics or private-card security.
3. Verify through real-browsing measured card and button rectangles at 390×844 and 390×700, 440×894, 480×900 with 3/5/8 cards, crowded Hand rail, swipe scrolling, multi-select, press DETAILS versus Play (no accidental use), private Hand versus other views, long descriptions, keyboard/focus and view switching. Keep CardDetails and HeroDetails fixes **separate**.
4. Run focused automated tests and actual screenshots, build/lint, exact-SHA CI/deploy if normal practice; mark **R4-F PENDING REVIEW**, include actual code SHA + tests + screenshot evidence. **Do not mark acceptance yourself.**

**Next after R4-F (distinct subsequent bounded task):** `UX2-10.8.1.1-H1-F-COMPACT-HERO-DETAILS-01`. Follow §10.8.1.1 exactly: remove visible `HERO DETAILS`/faction/`HP X/Y` ONLY from local in-game Hero preview; keep hero name/illustrated art and *every named full skill description*; change `height:min(440px,100%)` to content-fit with a true battlefield-safe max-height and internal long-skills scrolling; close button compactly integrated in header/profile, not a full decorative header row. The local Dock's genuine HP remains untouched. Verify actual two-skill Huang Yueying phone baseline and short/long Heroes at mobile 390/440/480 and short 390×700; nonblocking underlying game, pregame HeroInfoDialog and opponent Inspector regressions. Submit separate SHA/tests/evidence and **H1-F PENDING REVIEW** when technically delivered.

**Queued after those:** R2-D and H4-A/B remain separate from accepted R2/R1; **H4 vertical and horizontal stability are ONE combined task**, not merely Dodge centering. See authoritative section status for sequencing as the user continues reviewing H2/H3.
