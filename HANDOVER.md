# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest task result — UX2.0VIS-12P

Status: **IMPLEMENTED — CI PENDING**.

Removed repeated current-participant/focus metadata only when the projected Hero Focus has role `CURRENT PARTICIPANT` and the same authoritative player ID. Group Active Scope remains visible without dropping the distinct DECISION fact; a different `CURRENT TARGET` does not suppress the current-participant summary. No gameplay semantics, protocol, legality, private data, Dock, or physical seats changed.

Focused validation: `node --import tsx --test tests/presentation-client.test.mjs` passed 39/39. The selected 21-case 12P/12M/12N/12O/12J/12K browser matrix passed 21/21; two 12P screenshots were visually inspected and Stage geometry assertions passed. `git diff --check` passed. No full suite, build, or lint was run locally.

12N Actions run `37250607906` for `e7def50e71f4abb0b53d2e16f6ebd9e35cbc873a` completed successfully. 12O Actions run `37264564194` for `fb29061be7a45763839e666c728dbd3082a34078` completed with both `build-and-test` and `deploy` jobs successful. These are Actions results only, not production-health verification. 12P remains CI pending until its exact revision is confirmed.

## Design review checkpoint

Reviewed current remote design blob `f52b6134fd62696c71fc3cba86210319e454832b`; it matches the prior checkpoint. Rechecked the Reviewer additions A–C; they remain long-term design authority, not a task queue. 12P design authority: §§0.91.2 and 0.91.5.

## Current task — UX2.0VIS-12P delivery closeout

Implementation and focused validation are complete. Commit and push only `app/page.tsx`, `game/presentation-client.ts`, `tests/browser/ui19.spec.mjs`, `tests/presentation-client.test.mjs`, `HANDOVER.md`, and `docs/AUTONOMOUS_UI_ROADMAP.md` to `ux-v2`, then fetch and verify the exact remote revision. Keep 12P CI pending until that exact run is confirmed.
