# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest task result — UX2.0VIS-12O

Status: **IMPLEMENTED — CI PENDING**.

Separated persistent Deck/Discard piles from active four-player Top Row Stage content. At 480×900 the full-size piles sit at the table's lower edge; at 390×640 compact pile summaries sit in the top-edge strip above the opponent row. No gameplay, semantic behavior, Dock, or seat topology changed.

Focused validation: the six 12O state/viewport cases passed 6/6; a 19-case 12N/12J/12K/12C regression selection passed 19/19. All six 12O screenshots were visually inspected. Geometry assertions verify Stage-content, physical-seat, and Dock separation, table containment, and page-width bounds. `git diff --check` passed. No full suite, build, or lint was run locally.

The last confirmed-green baseline is `8407c8dcf14444d107d348bfa43f473ac8331d2c` (Actions run `37240016937`, both required jobs successful). 12N and 12O are not claimed green; confirm only each exact implementation revision's Actions result.

## Design review checkpoint

Reviewed remote design blob `f52b6134fd62696c71fc3cba86210319e454832b`; it matches the design revision reviewed for 12N. Task authority: §§0.91.3–0.91.4.

## Current task — UX2.0VIS-12O delivery closeout

Implementation and focused validation are complete. Commit and push only `app/sequence-overrides.css`, `tests/browser/ui19.spec.mjs`, `HANDOVER.md`, and `docs/AUTONOMOUS_UI_ROADMAP.md` to `ux-v2`, then fetch and verify the exact remote revision. Keep its CI status pending unless that exact run is confirmed.
