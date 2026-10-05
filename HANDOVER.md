# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint — response timer layout

The latest pushed revision is `b1389591235ac4140a8260e436a31cadbb2f16e1`; GitHub Actions run `37332560641` completed **success** on 2026-10-05. Both `build-and-test` and `deploy` jobs succeeded, including lint, build, browser tests, `npm test`, D1 migration, Worker deploy, and production smoke tests. The previous CI-repair SHA `b666335662a4240d54171aedeba0caabcf90c24d` also passed run `37330805764`.

## Design checkpoint

Reviewed the unchanged remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at current `origin/ux-v2`; it remains the revision previously reviewed at `34362d1ff0809c103387bfe3ade2992653980b12`. Fast-response vocabulary in §12.7.2 is `Target`; response timer geometry remains grounded in §§12.7.3, 12.7.6, and 12.8.

## Latest result

Closed `UX2.3-FAST-RESPONSE-TIMER-10P-01`: conditional top-lane geometry keeps the timer clear of 10-player Side Column seats and Stage content at 480x900. The focused response-timer spec passed 4/4; targeted ESLint and `git diff --check` passed; exact pushed SHA `b138959` passed Actions run `37332560641`.

## Current task — UX2.3-FAST-RESPONSE-TIMER-EXIT-CLEARANCE-01

Status: **IMPLEMENTED LOCALLY — READY TO COMMIT**. The latest remote design remains blob `45430bc62b7c50bcbeef40724408ead94ad27120`; §§12.7.3 and 12.7.6 reserve the top-right for the timer and require it to remain clear while global/menu chrome stays usable.

Evidence: `GameRoom` renders `.game-exit` as a direct `play-table` child. It and `.visible-countdown` both used the top-right anchor; the timer has the higher stacking level. The real browser fixture reproduced overlap at 390px: timer `(250,8)-(382,44)`, Exit `(323.8,14)-(376,41)`. The browser fixture mounts the real `GameRoom` and both production stylesheets.

Scope/acceptance: moved only the visible Exit control when the response timer is present; `onLeave`, timer semantics, gameplay, and action authority are unchanged. The real-browser geometry test covers 390/480/1440px, requires at least 8px timer/Exit clearance, verifies no overlap with Game Messages both collapsed and expanded, and performs a normal Exit click. The response-timer spec passed 5/5; targeted ESLint and `git diff --check` passed. Keep unrelated `tests/browser/ui19.spec.mjs` work out of scope. Before committing, re-check the latest exact remote-head Actions run; current head `b1389591235ac4140a8260e436a31cadbb2f16e1` passed run `37332560641`. If a later run fails, repair CI before any normal commit.
