# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint — ux-v2 failures

The latest pushed revision is `34362d1ff0809c103387bfe3ade2992653980b12`; run `37327380014` completed **failure** at `Run npm test`. Its lint, build, and browser steps passed. The three most recent failed runs are `37323822915` (browser), `37325865676` (`npm test`), and `37327380014` (`npm test`). The browser vocabulary failure was corrected in `ae3f6b8`; subsequent `npm test` failures were stale `CURRENT PARTICIPANT` / `CURRENT TARGET` expectations in the fast-response renderer tests.

## Design checkpoint

Reviewed remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at `origin/ux-v2` commit `34362d1ff0809c103387bfe3ade2992653980b12`; the current fast-response vocabulary in §12.7.2 is `Target`. The response-timer geometry work remains grounded in §§12.7.3, 12.7.6, and 12.8.

## Current task — UX2.3-CI-REPAIR-FAST-RESPONSE-LABELS-01

Status: **LOCALLY REPAIRED AND VALIDATED — REMOTE CI STILL FAILED; REPAIR COMMIT REQUIRED**. Updated three stale role assertions in `tests/room-safety-render.test.mjs` and four in `tests/active-skill-interactions.test.mjs` to expect player-facing `Target`. No production or gameplay behavior changed. `CI=1 npm test` passed locally (build, fast 203/203, API 248/248); targeted ESLint and `git diff --check` passed. GitHub Actions has not run for this repair yet.

Scope: commit and push only this CI repair plus the workflow/handover/roadmap changes that record the failure and enforce the user's new commit-time CI gate. While prior CI is failed, this is a CI-repair-only commit; do not include the response-timer files. After pushing, verify the exact repair SHA until its required Actions run passes. Do not resume feature commits while it is failed, pending, unavailable, or ambiguous.

Resume point after repair CI is green: continue the already-authorized `UX2.3-FAST-RESPONSE-TIMER-10P-01` work from the current working tree. Its modified files are `app/sequence-overrides.css` and `tests/browser/response-timer.spec.mjs`; keep them unstaged during the CI-repair commit. The new 10-player geometry case currently passes within the complete response-timer spec (4/4), and targeted ESLint plus `git diff --check` passed. The measured collision was resolved by reserving a conditional top lane for 10-player Side Column seats and Stage content while preserving the timer's top-right anchor. Before the timer task's next commit, re-read this workflow and the latest remote design, then verify the latest prior CI is green.
