# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint

Remote head `87e067f1e011f43e7df63b57369a13dcf6376681` failed push-triggered Actions run `37360802955` on 2026-10-05. Lint and build succeeded; `test:browser` failed and deployment was skipped. The failure was reproduced locally in Dying Stage regressions. The CI-repair changes below are not yet pushed or covered by CI.

## Design checkpoint

Rechecked `origin/ux-v2` at `87e067f`; design blob `5157af29079cf03f86476b71bc58607a215d6b53` is unchanged. Reviewed §§0.6.15, 12.3, 12.7.2, and 12.8 for Dying identity, Current Effect composition, player-facing Stage language, and task scope.

## Latest result

`UX2.3-ACTIVE-DYING-CURRENT-EFFECT-01` was pushed in `87e067f`. CI exposed two implementation regressions: connected-effect chrome relabelled the proven Dying Hero Focus as Target, and the new composition overflowed compact safe zones. Local repair restores `DYING PLAYER` and compacts the proven Source → Effect → Dying Player row while retaining the complete public rescue handoff. A visually hidden structural Stage label preserves legacy structure checks without adding visible technical chrome. Current Effect browser spec passed 24/24; read-only Dying cases from `tests/browser/ui19.spec.mjs` passed 39/39; targeted ESLint and `git diff --check` passed. `tests/browser/ui19.spec.mjs` remains untouched.

## Current task — CI repair for UX2.3-ACTIVE-DYING-CURRENT-EFFECT-01

Commit and push only `app/page.tsx`, `app/sequence-overrides.css`, `tests/browser/active-current-effect.spec.mjs`, and this handoff as a CI-repair-only change. Record the pushed repair SHA and exact Actions state; do not resume normal task work or plan a successor until that SHA's required CI succeeds. Never modify `tests/browser/ui19.spec.mjs`.
