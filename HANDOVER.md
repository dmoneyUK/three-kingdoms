# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`9f52db6` failed run #752 (`37425349025`) at lint because `_localControl` was unused; later steps were skipped. CI repair `331ea94` is pushed; run #753 (`37425718478`) was last observed **in progress**, not validated. Its targeted ESLint, the Quick Test browser regression (1/1), and `git diff --check` passed locally. Full local lint also traversed ignored Playwright trace bundles; those generated-file errors were not present in the CI failure annotation.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.6.4, 0.53, 0.56, 12.7.1–12.7.2, 12.8, and 12.9. Child context must use proven public meaning and player-facing vocabulary; frame identifiers belong in data attributes/diagnostics, not visible copy.

## Current task — UX2.7-PLAYER-FACING-PARENT-CONTEXT-01 (READY TO COMMIT)

Child Frame context now shows `During <card name>` only when the typed root origin exactly matches the parent frame and resolves through the card catalogue; unknown effects and non-immediate roots omit the breadcrumb. Frame IDs remain diagnostic attributes and Borrowed Sword copy is unchanged. Focused PresentationClient/render tests passed 64/64, Borrowed Sword browser cases 6/6, targeted ESLint, and `git diff --check`; no server, gameplay, or protocol behavior changed.
