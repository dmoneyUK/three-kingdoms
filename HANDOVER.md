# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

Reviewed remote design blob `1cb60c4c92e0b108f0e59beb687ef0502267e494`, comparing it with the recorded `1e317378f5bdaaaa8e3b0f4fbb96ca961626b81a`. Intervening edits are progress/status updates for L4/L5, §10.12 L1–L5 and R4-F; no product requirement changed. Remote `HANDOVER.md` still listed R4-F as unfinished, so this handoff closes that stale status.

R4-F is delivered in `4c44288be598b59783c81627c6daf8af3a556f7c`; exact-SHA Actions run [38784154019](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38784154019) passed API tests, browser startup/room smoke, lint/fast tests, D1 migration, build, Worker deployment and production smoke. Focused R4-F browser coverage passed 16/16, existing Details regressions 3/3, Dock render 1/1, and build passed. Geometry and screenshots are under `/tmp/wtk-r4-f-evidence/`. Status: **PENDING REVIEW**, not human-accepted.

## Current task

**§10.8.1.1 / H1-F — compact the local in-game Hero details preview.** Keep the nonmodal battlefield boundary, genuine portrait/name, all real skill names and full descriptions, close/focus/outside-tap behavior and local self-target action. Remove visible `HERO DETAILS`, faction and HP rows; use content height within the measured safe corridor and scroll only skill text; keep the 44×44 close target in the compact profile row. Preserve pre-game `HeroInfoDialog`, opponent Inspector, Local Dock HP, rules and privacy.

**Local implementation and validation complete; exact-SHA CI/deployment pending.** Authenticated Worker/D1 browser regressions passed 10/10 (7 Hero-preview layouts plus 3 self-target regressions); the final screenshot/geometry run passed 7/7. Coverage: 390×844, 390×700, 440×894, 480×900, six/eight seats and 1440×900 reduced motion. Huang Yueying at 390×844 changed from a 340×396 panel with 90.5px unused tail and seat overlap to 340×247.8 with an 11px tail and no overlap. Side-column panels measured 219.6×273.5 (six seats) and 241.8×273.5 (eight seats), with no protected-region overlap. Focused render passed 1/1, targeted ESLint and `git diff --check` passed, and `npm run build` passed. Screenshots and DOM geometry: `/tmp/wtk-h1-f-final/`.

**Design revision reviewed:** remote `docs/UX2-refine.md` blob `1cb60c4c92e0b108f0e59beb687ef0502267e494`. After pushing H1-F, verify its exact-SHA CI and deployment, then mark H1-F **PENDING REVIEW** using progress-only design edits and re-read the latest remote design before selecting the next single task. Preserve untracked `HANDOVER 3.md`; do not include it.
