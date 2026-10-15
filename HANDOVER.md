# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Current task

**UX2-10.12-L1-PUBLIC-ACTIVITY-CHIP-01** — implementation and focused validation complete locally; commit, push, exact-SHA CI/deployment verification remain.

Design authority reviewed: `docs/UX2-refine.md` §10.12.1 / §10.12.5, blob `f46a5d8462f1b0b21863308f0821ebe9a0fa7c6e`.

The public chip derives normal turn ownership from public `turnSeat`, and responding actor/action only from matching validated public `PresentationSnapshot` proof. Shared Negation stays generic across viewers. A single compact lower-battlefield chip uses measured collision-safe placement and hides when no safe space exists. No server projection or game rules changed.

## Local evidence

- `npm run build` — passed.
- `node --import tsx --test tests/api/public-activity.test.mjs` — 6/6 passed.
- `npx playwright test --config tests/browser/playwright.config.mjs tests/browser/public-activity-chip-real-gameplay.spec.mjs --workers=1` — 3/3 passed. This includes four authenticated Worker/D1 viewers through turn → shared Negation → proven Duel responder and real Attack presentation; 4/6/8-player games at 390×844, 390×700, 440×894 and 480×900; plus synthetic 10-seat geometry at those sizes. Real game rooms support at most eight players, so ten-seat coverage is layout-fixture-only.
- Targeted ESLint with `NODE_OPTIONS=--max-old-space-size=8192` — 0 errors, 3 existing `app/page.tsx` hook-dependency warnings. The same command at 4GB exhausted Node heap.
- `npx tsc --noEmit --pretty false` — repository-wide baseline failure across untouched Worker/API/game/page files; no diagnostics in `game/public-activity.ts`, `app/public-activity-chip.tsx`, or the new page insertion.
- `git diff --check` — passed.

At 390×844 the chip rectangle was `(138.5,473)–(251.7,496.2)` and the table ended at `504`; at 440×894 it was `(163.5,571)–(276.7,594.2)` and the table ended at `602`. Both sat 13px above Guidance, with no measured protected-region intersections. Screenshots and geometry logs are attached to the local Playwright report; representative captures: `tests/browser/playwright-report/data/5f30d820caf54de051370d4ad13a3aa135c80f7e.png` (shared public turn) and `tests/browser/playwright-report/data/821a3fa36e0f8518f1e419b993d55d9ed4fda89b.png` (Duel response).

## CI gate before this commit

Remote `ux-v2` is `a6859d73049ef8cac046c2096b82a73c256284a9`, equal to the local base. Changes after latest relevant code run `b115c0bf1b21af36a3aa62665aebc5789d2fda8c` are only `HANDOVER.md` and `docs/UX2-refine.md`; Markdown is excluded by the workflow. Actions run `38711938785` for `b115c0b` completed successfully across lint/fast tests, API, browser smoke, deploy and production smoke. The new code commit still requires its own push-triggered run.

## Stop / resume point

After committing and pushing L1, verify that exact SHA's Actions jobs and actual deployment. Then mark L1 **PENDING REVIEW** (not accepted) in the design, update this handoff to the single next task **UX2-10.12-L2-GUIDANCE-SKILL-TOGGLE-01**, and continue only after rereading the latest design section. Do not change UX2 design requirements or claim human visual acceptance.
