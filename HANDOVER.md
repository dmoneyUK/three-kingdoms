# Current Handover

Repository: `dmoneyUK/three-kingdoms`; target branch: `ux-v2`.
Worktree: `/Users/jingedai/.codex/worktrees/h2-g3-f1-r5/WTK`; working branch: `codex/quick-test-negation-duel`.
Latest design reviewed: `docs/UX2-refine.md` revision `d2f78c82` (2026-10-28), §10.25.1 F1-R2.

## Latest result

**NEG-COPY-1 F1-R1 — IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-iPHONE RE-REVIEW.** Commit `f76f2df00bde395003f3e941b6df0187c85e83ac` is on `origin/ux-v2`. Exact-SHA [Actions 40775351776](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40775351776) passed all jobs: browser startup/room smoke, API, lint/fast tests, and Cloudflare deploy/production smoke. Worker version `851d84f0-5b7e-4ad6-83a0-cbeffb1fd9d0`; direct production `/api/health` returned `{"ok":true,"worker":"available"}`. Implementation assigns Duel H4 copy to a pure server-identity/stage proof selector, retires Negation/root copy at proven `DUEL_EXCHANGE`, and preserves the genuine Duel/Negation/Attack journey and exchange controls.

Local focused public-announcement tests passed 14/14; `npm run build`, `git diff --check`, and targeted ESLint exited 0. ESLint reported two React Hook dependency warnings in `app/page.tsx` (lines 8289 and 8506). The existing Duel real-gameplay regression was updated but not run locally; CI's browser job runs only room/startup smoke, so no feature-browser or phone acceptance is claimed.

## Current task

**UX2-10.25 NEG-COPY-1 F1-R2 — stabilize H4 announcement visibility and full/compact placement.** F1-R1's focused semantic checks and exact-SHA CI passed, so this sequential step is authorized. Keep the existing H4 design and wording; do not redesign its geometry or change gameplay.

### Scope and acceptance

- Inspect `PublicCardAnnouncement()` and its semantic-copy, placement, geometry, epoch, cache, and late-effect lifecycle in `app/public-card-display.tsx`.
- Reproduce the recorded 440×766 mobile viewport behavior. A legitimate compact 240px announcement is allowed; repeated 240↔420 width or visibility changes for unchanged semantic text, geometry epoch, and obstacles are not.
- Key H4 identity to authoritative stage, revision, checkpoint, and genuine latest response/final event. Keep that identity separate from parked-card motion; stale `useLayoutEffect`/RAF work must not overwrite a newer stage.
- Reuse the last collision-safe placement and copy while inputs are unchanged. Reflow only on material viewport/seat/obstacle changes. If a real CardFace makes placement impossible, preserve a previous position only while safe; otherwise hide with a specific reason and recovery condition.
- Add bounded, privacy-safe, on-change UX Trace fields required by §10.25.1. Keep diagnostics off by default and do not emit frame-by-frame or private-hand data.
- Preserve H4 wording, actual card history, Dock/timer hit targets, and `PublicActivityChip` behavior. Do not modify H2-G3 seat geometry.

### Validation and resume point

Use one focused mobile viewport check at 440×766, within the user's five-minute UI-test cap; do not run a device matrix or broad browser suite locally. Run only relevant fast tests, targeted lint/build if needed, and `git diff --check`, then required exact-SHA CI/deployment. Record every implementation/check result here. Final status remains pending owner real-iPhone review; only the human Reviewer can accept it.

**Started:** 2026-10-28 21:55 UTC. **Status:** design reviewed; beginning source/trace lifecycle inspection. Exported raw UX trace files are not available in this worktree; rely on the extracted §10.25.1 evidence unless the originals are supplied, and do not claim an independent trace reparse.

### Current-task execution log

- **2026-10-28 21:55 UTC — task boundary:** re-read the latest §10.25.1 F1-R2 plan after F1-R1 passed exact-SHA CI/deployment. HANDOVER now contains this one bounded task and the immediately preceding delivery result only.
- **2026-10-28 22:07 UTC — implementation and bounded checks:** `app/page.tsx` now attaches only matching, proven snapshot stage identity; the H4 key uses server revision/stage/checkpoint/latest public event and stable public actor, while selected-presenter revision remains diagnostic. `PublicCardAnnouncement()` invalidates older scheduled placement work on semantic-key changes, reuses the last safe compact/full copy only when its exact geometry/obstacle identity still matches and collision checks pass, and emits the §10.25.1 fields on change (maximum 32 per mounted announcement; no message text/private Hands). Existing browser specimen records copy-key/width/compact/stability while targeting 440×766. Focused `tests/public-card-announcement.test.mjs` passed 14/14; targeted ESLint exited 0 with 15 React Hook dependency warnings across affected files; `git diff --check` passed. The earlier one-shot browser attempt remains failed before H4 geometry sampling; no retry. Implementation is still local and awaits exact-SHA CI/deploy plus owner iPhone re-review.
