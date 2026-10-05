# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint

Repair head `6d0f4e9d46e17f7c6839229b6cbf58438618fbb0` push run `37373094475` attempt 1 failed: lint/build passed, browser reported 494 passed and one response-timer failure, and `deploy` was skipped. The equipment/Inspect regressions from `10398bf` are fixed; CI showed that fake time continued advancing during suite scheduling, so exact 9s/4s assertions still drifted. The earlier `10398bf` run `37368196967` attempt 2 had 482 passed/12 failed; its attempt 1 was cancelled during the Actions incident. Prior head `ac54b2e` passed run `37364054848` in both jobs.

## Design checkpoint

Rechecked `origin/ux-v2` at `10398bf`; latest design blob `5157af29079cf03f86476b71bc58607a215d6b53` is unchanged. Re-reviewed §§0.6.12–0.6.17, 3–3C, 4–11, 12.0–12.9, and additions A–C. The current task follows §12.4's concealed-zone semantics while retaining the current picker fallback because the selectable-object projection does not support same-Hero-Focus migration.

## Latest result

`UX2.4-CONCEALED-HAND-ZONE-SELECTION-CLARITY-01` was pushed as `10398bf`; CI-only repair `6d0f4e9` restored the REST fixture's `ZhugeCrossbow` kind and added a focused public-Equipment/Inspect regression. Its required Actions run fixed those failures but exposed timer drift under CI scheduling. A second CI-only timer-test repair now pauses the loaded page clock at a forward sample and derives the exact jump to the projected deadline; it keeps the exact 9s/4s and urgency-color checks. Focused browser validation passed 20/20 (including all 11 prior UI19 cases read-only), targeted ESLint had 0 errors (fixture JSX ignored), and `git diff --check` passed. `tests/browser/ui19.spec.mjs` remains unchanged. No full local suite/build was run; the second repair is not yet pushed.

## Current task — CI REPAIR ONLY (timer determinism)

Fix only response-timer clock drift on `6d0f4e9`. After the fixture loads, pause mocked time at a sampled future instant and advance relative to its authoritative deadline so the 9s/4s checks are stable under CI scheduling. Focused browser validation is 20/20 with two workers; keep `ui19.spec.mjs` read-only. Commit/push only the timer test and handoff update. Do not plan a successor until required CI succeeds on the next repair SHA.
