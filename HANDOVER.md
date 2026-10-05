# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint

Exact pushed revision `4ff9fbd264c38896c6bc256b8f7090283c0a0908` passed Actions run `37340057118` on 2026-10-05, including build/test and deploy/smoke-test jobs. Its predecessor feature SHA `a551bd36980fcaceaf349ca22926eccfd6233946` failed because one source assertion still expected the former 70px Dock column; repair-only SHA `4ff9fbd` updates the contract to 96px and asserts the 88px Hero cap. Before each commit, check CI for the exact current remote head; if it is not successful, repair it before normal task delivery.

## Design checkpoint

Reviewed latest remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at `origin/ux-v2`; unchanged from the preceding checkpoint. The next task follows §12.7.6 and §12.8, with 10-player Side Column structure in §1.5. The design calls for narrow portrait coverage at 390px and 480px; existing timer-to-seat/Stage regression covers 480px only.

## Latest result

Closed `UX2.3-LOCAL-HERO-MOBILE-HIERARCHY-01`: at 390–480px, the Local Hero now uses an 88px portrait in a 96px identity column while preserving full-size Hand cards and horizontal pan. The focused browser regression passed 6/6 across 390/414/480px and 5/25-card Hands; targeted ESLint and `git diff --check` passed. Feature SHA `a551bd3` had a stale 70px source assertion failure in run `37339005768`; repair-only SHA `4ff9fbd` corrected the contract and passed exact Actions run `37340057118`, including build/test and deploy/smoke-test jobs. `tests/browser/ui19.spec.mjs` remains unchanged.

## Current task — UX2.3-FAST-RESPONSE-TIMER-10P-390-01

Focused implementation is ready to commit: the 390×844 observer regression verifies the timer's top lane, clearance from all nine fixed seats and visible Stage content, Dock separation, neutral public copy, and absence of viewer-private options/actions. The response-timer browser spec passed 6/6 with one worker; targeted ESLint and `git diff --check` passed. A parallel run made an existing fake-clock urgency assertion flaky; its isolated one-worker repro passed, and the full focused spec then passed serially. No product CSS changed. Immediately before this task commit, exact current remote HEAD `4ff9fbd264c38896c6bc256b8f7090283c0a0908` was re-fetched and its Actions run `37340057118` confirmed successful. The new task revision's CI is pending after push; if it fails, repair that failure before another feature commit. `tests/browser/ui19.spec.mjs` remains unchanged.
