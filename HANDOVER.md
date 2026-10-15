# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

Reviewed the current remote design blob `1cb60c4c92e0b108f0e59beb687ef0502267e494`; no newer remote design changes were present before this progress-only update. R4-F is delivered and **PENDING REVIEW** in `4c44288be598b59783c81627c6daf8af3a556f7c`; exact-SHA run [`38784154019`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38784154019) passed CI and deployment.

H1-F is delivered in `195e877ba9fa83db85b4d1a5ca467c4814e14b2d`; exact-SHA run [`38787321537`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38787321537) passed API, browser startup/room smoke, lint/fast, D1 migration, build, Worker deployment and production smoke. Authenticated Worker/D1 browser checks passed 10/10; the screenshot/geometry run passed 7/7. Focused render passed 1/1, targeted ESLint and `git diff --check` passed, and `npm run build` passed. At 390×844 the two-skill panel measures 340×247.8px with 11px unused tail and no overlap; six/eight-seat panels measure 219.6×273.5px and 241.8×273.5px with no protected-region overlap. Evidence is in `/tmp/wtk-h1-f-final/`. H1-F is **PENDING REVIEW**, not accepted.

Commands: `npm run test:browser -- tests/browser/local-self-target.spec.mjs tests/browser/hero-details-preview-real-gameplay.spec.mjs --workers=1 --retries=0` (10/10); `H1_F_EVIDENCE_DIR=/tmp/wtk-h1-f-final npm run test:browser -- tests/browser/hero-details-preview-real-gameplay.spec.mjs --workers=1 --retries=0` (7/7); `node --import tsx --test --test-name-pattern='pre-game Hero information' tests/room-safety-render.test.mjs` (1/1); `npx eslint tests/browser/hero-details-preview-real-gameplay.spec.mjs tests/browser/local-self-target.spec.mjs tests/room-safety-render.test.mjs && git diff --check`; `npm run build`.

## Current task

**§10.8.2.1 / H2-F — modestly reduce opponent Hero and player-name type.** Adjust the final-effective 4-seat phone rules from approximately 12px/10px to 10–11px/9–10px, with proportionate readable sizing for denser 6/8/10-seat layouts. Preserve H2's identity locations, portrait, HP, SWITCH, Equipment row, Seat geometry, public-card parking, accessibility labels and all server/game behavior. Review the cascade before editing; use focused authenticated Worker/D1 screenshots and rectangle checks at 390×844, 390×700, 440×894, 480×900, desktop, 4/6/8/10 seats, long Latin/Chinese names, equipment counts and target/public-card states. No JSX or server changes unless the current DOM requires them.

**Design revision reviewed:** `docs/UX2-refine.md` remote blob `1cb60c4c92e0b108f0e59beb687ef0502267e494`, including §§10.8.2.1 and the current execution sequence H1 → H2 → H3. Preserve untracked `HANDOVER 3.md`; do not include it.
