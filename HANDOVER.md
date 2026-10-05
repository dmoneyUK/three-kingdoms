# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest task result — UX2.0VIS-12P

Status: **IMPLEMENTED — CI PENDING on the corrective revision**.

Removed repeated current-participant/focus metadata only when the projected Hero Focus has role `CURRENT PARTICIPANT` and the same authoritative player ID. Group Active Scope remains visible without dropping the distinct DECISION fact; a different `CURRENT TARGET` does not suppress the current-participant summary. No gameplay semantics, protocol, legality, private data, Dock, or physical seats changed.

Focused validation: `node --import tsx --test tests/presentation-client.test.mjs` passed 39/39. The selected 21-case 12P/12M/12N/12O/12J/12K browser matrix passed 21/21; two 12P screenshots were visually inspected and Stage geometry assertions passed. After a local build, the full browser suite reproduced only four short-portrait group-observer failures (398/402 passed): the visible `ACTIVE SCOPE` role was omitted from a legacy selector. The selector was updated to include `active-scope`; the four affected cases plus both 12P browser cases then passed 6/6. `git diff --check` passed. The full browser suite was not rerun after this assertion-only correction.

12N Actions run `37250607906` for `e7def50e71f4abb0b53d2e16f6ebd9e35cbc873a` completed successfully. 12O Actions run `37264564194` for `fb29061be7a45763839e666c728dbd3082a34078` completed with both `build-and-test` and `deploy` jobs successful. These are Actions results only, not production-health verification. 12P Actions run `37265642914` for `8aac37ac7a7f1764bd0528367893016740b0b8df` failed at `test:browser`; `lint` and `build` succeeded, and deploy was skipped.

## Design review checkpoint

Reviewed current remote design blob `f52b6134fd62696c71fc3cba86210319e454832b`; it matches the prior checkpoint. 12P remains governed by §§0.91.2 and 0.91.5; the Reviewer additions A–C remain long-term design authority, not a task queue.

## Current task — UX2.0VIS-12P CI correction

The stale short-portrait browser assertion now accepts the visible `active-scope` role as Stage scope metadata. Preserve the approved Stage behavior and all other `ui19.spec.mjs` coverage; no game or UI semantics changed.

Acceptance: all four compact group-observer cases recognize the rendered `active-scope` role while preserving existing geometry/content checks. Commit and push only `tests/browser/ui19.spec.mjs` and `HANDOVER.md`, then fetch and verify the exact revision; inspect its push-triggered Actions result before beginning any next-task source edit.
