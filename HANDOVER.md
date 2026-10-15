# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md` blob `37a3a30f80b9a4b2ceb5176445770247772a81c2`; H2 requirements in §10.8.2 were reviewed. After H2 closes, re-fetch and carefully review the latest design from Chapter 8 onward before selecting the next task. Do not change product criteria while recording progress. §11 UX3 remains out of scope.

## Latest result

H2 opponent-seat layout is implemented locally: Hero name on portrait, player name in its own strip, prominent HP chip, and a stable public-equipment row containing only occupied slots. Turn/target/defeat state and seat anchors remain intact. Focused browser geometry suite: 42/42; `room-safety-render`: 19/19; targeted ESLint: 0 errors (three existing Hook dependency warnings in `app/page.tsx`); `git diff --check` clean. Playwright screenshots and seat-rectangle evidence are in `tests/browser/playwright-report/`. H2 exact-SHA CI/deployment is pending. Latest relevant remote source run is `38665890985` for `fbe8e3c5ad5674dec09b3ba27c770327c915a572` (success); `origin/ux-v2` is `2e8fe28d56efefa330fabe6bd0663cb66c9baec1`, a Markdown-only commit excluded by workflow path filters.

## Current task — §10.8.2 H2

Commit and push the six H2 implementation/regression files with this handoff, then verify the exact source SHA's Actions jobs and deployment. On success, record factual H2 progress as **PENDING REVIEW** in §10.8.2 without changing its requirements, then review the newest Chapter 8+ design and replace this handoff with exactly one newly authorized bounded task. No gameplay/server changes, no §11.
