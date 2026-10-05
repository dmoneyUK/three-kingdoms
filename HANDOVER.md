# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest task result — UX2.0VIS-12N

Status: **IMPLEMENTED — CI PENDING**.

Added the four-player screenshot/geometry matrix and corrected compact short-height Stage columns so Group observer and Dying content fit a 390×640 viewport. No gameplay or semantic behavior changed. The 12J single-target screenshot and geometry evidence are attached by the focused browser test; the existing 12K ordinary-turn screenshot/geometry are also included.

Focused validation: the 10-case 12N/12J/12K browser matrix passed 10/10; the 390×640 pair passed 2/2 after the responsive fix; the 12J single-target geometry-attachment rerun passed 1/1. Ten relevant screenshots were visually inspected. No full suite, build, or lint was run locally.

The last confirmed-green baseline is `8407c8dcf14444d107d348bfa43f473ac8331d2c` (Actions run `37240016937`, both required jobs successful). Later documentation revisions through `2af42f4` and the current 12N implementation revision are not claimed green; confirm only the exact implementation revision's Actions result.

## Design review checkpoint

Reviewed remote design blob `f52b6134fd62696c71fc3cba86210319e454832b`, introduced by `d3854354317111af3acb7d8cc7a70ee79392e496`. The full intervening design addition was reviewed: authoritative self-target symmetry, failed response provider distinct from Pass, and complete-path Borrowed Sword legality. Those additions did not change 12N and are not folded into the next visual task.

## Deferred visual finding

The 12N screenshots show Deck/Discard intersecting or showing through active Stage content in Group, Negation, and Dying compositions. Keep this separate from 12N; the next task addresses it under design §0.91.4.

## Next task — UX2.0VIS-12O: Separate Deck/Discard from active Stage content

Scope: four-player Top Row only; responsive layout and focused browser evidence, with no gameplay, semantic, Dock, or seat-topology changes.

Acceptance:
- In Group observer, Negation, and Dying fixtures at 480×900 and 390×640, Deck/Discard remain visible and secondary without intersecting Hero Focus, Group target scope, Reaction Chain, or Dying handoff content.
- Preserve Stage/Safe Zone/Dock containment and page-width bounds; retain screenshot and geometry attachments for each case.
- Stop for human review if separation would require hiding persistent pile state or an unapproved Stage-composition trade-off.

Design authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.91.3–0.91.4. Before the first 12O source edit, perform the workflow's one-time Actions checkpoint for the latest pushed `ux-v2` revision; if it is queued/in progress proceed without waiting, and if failed fix the relevant failure first.
