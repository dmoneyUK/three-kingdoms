# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint

Pushed task head `16191de7aa01494860837d8263cef828161dc189`, Actions run `37379800040`, is currently in progress. The previous exact head `fa196351fea35ad66b162b88bdbcf6b4b4b28743` passed run `37375430748` in both `build-and-test` and `deploy`; `tests/browser/ui19.spec.mjs` remains unchanged.

## Design checkpoint

Remote design blob `5157af29079cf03f86476b71bc58607a215d6b53` is unchanged. Re-reviewed §0.6.8, §§3B–3C, §§4–11, §§12.0–12.9, and additions A–C. For the next bounded task, the generic random-Hand trigger projection can drive local SELECTABLE DETAIL when its target matches the proven external Hero Focus; opaque `hand:<index>` and `pendingTargetCard` flows remain on the safe picker fallback.

## Latest result

`UX2.4-CONCEALED-HAND-ZONE-SELECTION-CLARITY-01` shipped in `10398bf`; CI-only repairs `6d0f4e9`, `53d3833`, and `fa19635` fixed its fixture, timer determinism, and stale assertions. Focused browser validation passed 20/20; each CI-only Node regression passed 1/1 locally, targeted ESLint and `git diff --check` passed, and exact head `fa19635` passed run `37375430748`. `tests/browser/ui19.spec.mjs` was preserved unchanged.

## Current task — UX2.4-RANDOM-HAND-SELECTABLE-DETAIL-01 (implementation complete locally; CI pending)

For a generic server-projected `target_cards` choice whose eligible keys include the random `hand` zone and whose target matches the proven external Hero Focus, render Hand ×N plus individually public Equipment/Judgement choices as local SELECTABLE DETAIL within that focus. Keep legality in `CurrentAction`, selection state viewer-local, and Confirm / Skip / contextual Cancel in the Local Player Dock; preserve the trigger payload exactly once. Retain the picker fallback for opaque `hand:<index>` and `pendingTargetCard` Steal/Dismantle flows. Add focused 390/480/1440px and large-Hand proof plus submission, privacy, stale-reset, and fallback checks. Do not modify `tests/browser/ui19.spec.mjs`.

Implementation and focused validation are complete locally: the target-card browser cases plus the unchanged UI-19 retained-picker geometry case passed 12/12; the focused Retaliation, generic opaque-key, and `pendingTargetCard` Node tests passed 4/4; targeted ESLint and `git diff --check` passed. `tests/browser/ui19.spec.mjs` is unchanged. The task commit is pushed as `16191de7aa01494860837d8263cef828161dc189`; exact-SHA Actions validation is pending in run `37379800040`.
