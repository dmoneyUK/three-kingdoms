# WTK UI / Layout — Current Handoff

Branch: `ux-v2`
Mode: `AUTONOMOUS UI RUN`
Authority: this file plus `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.
History: `docs/AUTONOMOUS_UI_ROADMAP.md`; previous handoff preserved in `docs/history/UX_V2_HANDOVER_THROUGH_VIS_12J.md`.

## Latest result — UX2.0VIS-12J

Status: `IMPLEMENTED — CI PENDING`

Revision `3fe440e9caa793b9ec0663c4de523de87ba60490`, Actions run `37228048954`, build-and-test job `111511699964`: lint/build passed; browser step failed; deployment skipped. Anonymous logs did not expose individual failures. Focused local reproduction found four-player Group-observer and Dying Stage overflow at 320×640 (16.06px / 3.88px below Safe Zone).

Correction: apply the centered `min(88%, 410px)` Stage only at 360–480px; below 360px preserve full corridor width. The affected Stage/short-portrait/four-player matrix passed 35/35 after correction. No full local tests/build/lint. Push the correction; inspect its exact CI revision at the next task boundary without waiting.

VIS-12I is `COMPLETED BY AGENT — CI GREEN` on correction revision `b818cff112cec2c9f8fe972351d4c353b41854ee`, run `37227707859`, build-and-test `111510686961` and deploy `111511530346` successful. Human Reviewer acceptance remains separate.

## Current task — UX2.0VIS-12K: Four-Player Ordinary-Turn Visual Gate

Status: `PLANNED`

User evidence: the supplied four-player phone screenshot shows ordinary Play Phase with six local Hand cards and no active Interaction Stage. Existing VIS-12I seat checks use inactive REST or an active interaction; the normal fixture projects ATTACK_RESPONSE even during a turn. This ordinary-turn composition lacks a representative fixture and integrated regression.

Planning gate: all five §19 checks pass. Approved requirements: design §§0.91–0.91.5, 1.2, 1.5–1.5.2, 2.1–2.3, 2.7; workflow §§7.1, 7.7, 12, 19–20. Existing typed REST snapshot, CurrentAction and viewer-private Hand suffice. One bounded validation concern: cover the complete four-player ordinary-turn layout using existing fixtures/geometry helpers.

Requirements:
- Add a valid ordinary-turn REST fixture with active turn CurrentAction and six synthetic local cards; no invented interaction identity.
- At 390/480/650px and a short portrait viewport, validate three opponents in the Top Row, recognizable dominant Hero artwork, public status, stable Hero-left / Skills-and-Equipment-right-top / Hand-right-main / protected actions composition.
- Prove no page overflow or region overlap; inspect representative screenshots and retain an active interaction case.
- Capture any measured design mismatch as a separate bounded task; do not bundle an unapproved product/layout choice into this coverage task.

Scope: browser fixture/tests and handoff/roadmap. Use focused browser validation and targeted test lint only. Before the first source edit inspect the latest ux-v2 push run; fix a completed failure first; proceed if running.
Stop if a discovered layout trade-off requires a product decision or authoritative data is missing.
