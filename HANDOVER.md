# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint

Repair head `53d383330e15e9fe661e5248a750f390fd26abbc` push run `37374223499` attempt 1 failed at `npm test` (201/203); lint, build, and the full browser job passed; deploy was skipped. The two failures are stale target-card picker assertions: Retaliation locates the Hand zone by its former `aria-label`, and the safety-render test expects the former unqualified equipment label. The preceding `6d0f4e9d46e17f7c6839229b6cbf58438618fbb0` run `37373094475` failed only the response-timer check after browser 494 passed. The equipment/Inspect regressions from `10398bf` are fixed. The earlier `10398bf` run `37368196967` attempt 2 had 482 passed/12 failed; its attempt 1 was cancelled during the Actions incident. Prior head `ac54b2e` passed run `37364054848` in both jobs.

## Design checkpoint

Rechecked `origin/ux-v2` at `10398bf`; latest design blob `5157af29079cf03f86476b71bc58607a215d6b53` is unchanged. Re-reviewed §§0.6.12–0.6.17, 3–3C, 4–11, 12.0–12.9, and additions A–C. The current task follows §12.4's concealed-zone semantics while retaining the current picker fallback because the selectable-object projection does not support same-Hero-Focus migration.

## Latest result

`UX2.4-CONCEALED-HAND-ZONE-SELECTION-CLARITY-01` was pushed as `10398bf`; CI-only repair `6d0f4e9` restored the REST fixture's `ZhugeCrossbow` kind and added a focused public-Equipment/Inspect regression. The second CI-only timer repair was pushed as `53d3833`; focused browser validation passed 20/20, including the 11 prior UI19 cases read-only. CI `37374223499` confirmed lint/build/browser pass and exposed two Node tests with stale accessible-name assertions. This repair changes those tests to use the semantic Hand-zone attribute and current Equipment label; `tests/browser/ui19.spec.mjs` remains unchanged. No full local suite/build was run.

## Current task — CI REPAIR ONLY (picker test semantics)

Update only the stale picker assertions exposed by CI run `37374223499`: identify Retaliation's concealed Hand zone through `data-target-card-zone="hand"`, and expect the explicit `Equipment: Nio Shield` accessible name. Run only the two failed Node tests, then commit and push only these tests plus HANDOVER. Do not plan or commit a successor until required CI succeeds on the exact repair SHA. Preserve `tests/browser/ui19.spec.mjs` unchanged.
