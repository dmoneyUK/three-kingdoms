# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest task result — UX2.0VIS-12O

Status: **IMPLEMENTED — CI PENDING**.

Separated persistent Deck/Discard piles from active four-player Top Row Stage content. At 480×900 the full-size piles sit at the table's lower edge; at 390×640 compact pile summaries sit in the top-edge strip above the opponent row. No gameplay, semantic behavior, Dock, or seat topology changed.

Focused validation: the six 12O state/viewport cases passed 6/6; a 19-case 12N/12J/12K/12C regression selection passed 19/19. All six 12O screenshots were visually inspected. Geometry assertions verify Stage-content, physical-seat, and Dock separation, table containment, and page-width bounds. `git diff --check` passed. No full suite, build, or lint was run locally.

The last confirmed-green baseline is `8407c8dcf14444d107d348bfa43f473ac8331d2c` (Actions run `37240016937`, both required jobs successful). 12O's exact push run `37264564194` for `fb29061be7a45763839e666c728dbd3082a34078` was `in_progress` at the 12P planning checkpoint; it was not waited on. 12N/12O are not claimed green.

## Design review checkpoint

Reviewed current remote design blob `f52b6134fd62696c71fc3cba86210319e454832b`; it matches the prior checkpoint. Rechecked the Reviewer additions A–C; they remain long-term design authority, not a task queue. Next-task authority: §§0.91.2 and 0.91.5.

## Next task — UX2.0VIS-12P: Deduplicate proven current-participant metadata

When the Interaction Stage Hero Focus already presents the same projection-proven current participant, remove the redundant current-participant/focus identity summary. Preserve distinct active-scope, decision-actor, source, and other proven facts; ambiguous Group focus must remain fail-closed.

Scope: presentation-only Stage metadata and focused browser/unit regressions. No gameplay semantics, protocol, legality, private data, Local Dock, or physical-seat changes.

Acceptance: cover a current-participant Group composition and a target-owned CHOICE at compact portrait widths; prove duplicate identity prose is absent while multi-target active scope and distinct DECISION context remain. Keep the ambiguous Group `No proven focus` path unchanged. Before the first source edit, inspect the latest push-triggered Actions run for `fb29061be7a45763839e666c728dbd3082a34078` once; follow workflow §5 without waiting on an in-progress run.
