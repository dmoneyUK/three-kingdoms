# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest delivery / CI checkpoint — UX2.3-FAST-RESPONSE-10P-NEGATION-01

Implementation adds a 10-player / 480px Side Column case to the proven Negation Current Effect matrix. The four Negation cases passed 4/4; targeted ESLint and `git diff --check` passed. The 10-player Stage, Source, Effect, Target and Reaction Chain all measured inside the central safe zone, with no Stage/Dock overlap and Root before Active. Existing responsive CSS already meets the contract, so no production change was needed. This checkpoint includes the preceding pushed CI assertion repair; run `37325865676` for `ae3f6b8f193396e1681e95605e9c6a9f2168d9ba` was observed `in_progress` at the 2026-10-05 planning boundary; no result is inferred. The current 10-player update is ready to commit/push; its CI will be pending after push.

## Design checkpoint

Reviewed remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at `origin/ux-v2` commit `ae3f6b8f193396e1681e95605e9c6a9f2168d9ba`; no intervening design change. Re-read §§12.7.1–12.7.6 and 12.8. The next task is grounded in the top-right response timer contract (§12.7.3), timer/Stage usability (§12.7.6), and the 10-player final visual gate (§12.8).

## Current task — UX2.3-FAST-RESPONSE-TIMER-10P-01

Status: **PLANNED — CHECK LATEST PUSH RUN ONCE BEFORE SOURCE EDIT**. The 10-player Negation geometry update is ready to commit/push. Before the timer task's first source edit, inspect that exact resulting push run once; if queued/in progress, proceed without waiting; if failed, resolve CI first.

Bounded scope: add one 10-player / 480x900 Side Column observer case to `tests/browser/response-timer.spec.mjs`. Prove the authoritative shared-window timer stays top-right within the table and does not overlap visible opponent seats or the actual Stage content; verify the observer timer remains generic and exposes no responder/action identity. If measured overlap exists, make only the minimum responsive positioning correction needed to preserve the designed top-right timer and fixed seat DOM. Do not change timer authority, gameplay, server/API/projection, protocol, or legal controls.

Acceptance: at 480x900 with 10 players, `Response Time` is visible in the top-right, within the table, clear of visible seat and Stage-content boxes, and still above the Dock; public timer copy and observer CurrentAction remain identity-free/action-free. Preserve existing 390/480/1440 timer cases. Run only the response-timer spec, targeted ESLint if source changes require it, and `git diff --check`; no full local suite/build/lint.

Resume point: extend the response timer geometry test with count 10 at 480px and compare its rect against each visible Stage content region and fixed opponent seat. Preserve privacy and existing top-right inset checks. If geometry fails, inspect only timer/Stage responsive positioning. After focused validation, update roadmap/handoff with actual results, commit/push only task files, record CI pending, and do not poll. At the next planning boundary reread the workflow/design and inspect that exact run once before source edits.
