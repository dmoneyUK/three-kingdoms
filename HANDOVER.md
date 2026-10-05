# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint

Remote head `10398bf8db9dc73eda85ccb952ec4b68c786284f` push run `37368196967` attempt 2 failed in `build-and-test`: lint/build passed, browser reported 482 passed and 12 failed; `deploy` was skipped. Eleven failures were UI19 public-Equipment/Inspect checks caused by the new fixture omitting ZhugeCrossbow's `kind`; one response-timer test had a clock-step assertion failure. Attempt 1 had been cancelled before steps during the Actions incident. Prior head `ac54b2e` passed run `37364054848` in both jobs.

## Design checkpoint

Rechecked `origin/ux-v2` at `10398bf`; latest design blob `5157af29079cf03f86476b71bc58607a215d6b53` is unchanged. Re-reviewed §§0.6.12–0.6.17, 3–3C, 4–11, 12.0–12.9, and additions A–C. The current task follows §12.4's concealed-zone semantics while retaining the current picker fallback because the selectable-object projection does not support same-Hero-Focus migration.

## Latest result

`UX2.4-CONCEALED-HAND-ZONE-SELECTION-CLARITY-01` was pushed as `10398bf`; its attempt-2 browser suite failed as described above. The CI-only repair restores the REST fixture's `ZhugeCrossbow` kind, adds a focused public-Equipment/Inspect regression, and makes the timer test advance the mocked clock deterministically while asserting urgency colors without testing transition timing. The focused browser selection passed 20/20, including all 11 failed UI19 cases read-only; `tests/browser/ui19.spec.mjs` remains unchanged. No full suite/build was run. Repair is locally validated but not yet pushed.

## Current task — CI REPAIR ONLY for UX2.4

Fix only the two browser failures on `10398bf`: restore the missing fixture `kind` behind the 11 public Equipment/Inspect failures, and make the response-timer fake-clock/color assertion deterministic without weakening its 9s/4s urgency checks. Focused validation is the relevant picker tests, the response-timer case, and the 11 UI19 cases run read-only. Commit/push only these repairs and this handoff update; do not plan a successor until required CI succeeds on the repair SHA. Preserve `tests/browser/ui19.spec.mjs` unchanged.
