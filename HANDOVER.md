# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest task result — UX2.0VIS-13B

Status: **IMPLEMENTED — CI PENDING**.

For failed `eight_trigrams_dodge` Judgements, the server now retains the original Dodge pending, actor, count, continuation and causal interaction; filters only the failed provider and reopens legal choices. Damage occurs only if the player explicitly declines. The initiating provider ID remains internal to the Judgement continuation across Guicai, and is not projected to other viewers. Applies only to ordinary Attack and Group/AOE Dodge responses; other response families are unchanged.

Focused validation: `npm run build` succeeded; the new Eight Trigrams API regressions plus the relevant Wei hero API file passed 25/25; targeted ESLint on the five changed source/test files passed; `git diff --check` passed. The regressions cover Sima Yi's replacement, unchanged two-Dodge count, Group/AOE cursor/causal continuity, explicit Pass, provider privacy, and card conservation. No full suite was run.

13A revision `573ec3d56e8d7acd098673f6b9a3a13552b145ae` Actions run `37268528873` was observed **in progress** once before 13B source edits; it has not been rechecked.

## Design review checkpoint

Reviewed remote design blob `f52b6134fd62696c71fc3cba86210319e454832b`. 13B follows Reviewer addition B. Additions A–C remain design authority, not a task queue.

## Current task — UX2.0VIS-13B delivery checkpoint

Commit and push only `app/api/rooms/route.ts`, `game/pending.ts`, `tests/api/eight-trigrams-failed-response.test.mjs`, `tests/api/lobby-heroes-wei.test.mjs`, `tests/run-api-suite.mjs`, and this handover. Fetch and verify the exact remote revision. Before any successor source edit, reread the complete current workflow, compare the latest remote design with this checkpoint, read the full remote handover, and inspect the 13B push-triggered Actions run once. Do not wait or repeatedly poll; diagnose a relevant failure before starting new feature work.
