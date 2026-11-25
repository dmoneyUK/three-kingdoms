# HANDOVER

## Current task — §10.75 STAUCHNESS-COMPACT-CHOICE-MODAL-01

**Design reviewed:** `docs/UX2-refine.md`, revision 2026-11-24 22:38 UTC. **Branch:** `ux-v2` delivery target; worktree branch `codex/ux2-1066-turn-boundary-clear`. **Base:** `0c1f93987a00450c3f9f66b26fa76efb1653a343` (matches `origin/ux-v2`).

Implemented the approved compact mandatory Stauchness choice stage. It preserves server-provided choice IDs, eligible viewer-owned Hand cards, original action callbacks and timeout behavior; uses the shared Confirm footer; hides the stage until measured safe placement is ready; keeps the eligible Hand row scrollable; and leaves other mandatory choices on the existing renderer. No gameplay or §10.72 H4 copy changes.

**Local validation observed:**

- `node --import tsx --test tests/room-safety-render.test.mjs` — 28/28 passed.
- `GAME_TEST_FILES=tests/api/judgement.test.mjs node tests/run-tests.mjs` — 14/14 passed.
- `npm run build` — passed; only existing bundle-size/static-route warnings.
- Focused real Stauchness phone-layout browser scenario — 1 passed (11.5s), after rebuilding the local Worker client and capping the internally scrollable choice panel at 240px.
- Combined local UI/browser time remained below five minutes. `git diff --check` — passed immediately before staging.

**Commit gate:** latest relevant remote run checked before implementation commit was `45522229976` for SHA `44ded7566a2ed4f23082b78181900b06d5552520`, successful: https://github.com/dmoneyUK/three-kingdoms/actions/runs/45522229976. No queued/in-progress run was present. This is the previous source checkpoint, not validation of the pending implementation.

**First delivery:** `d638b79dbde2d6f5e73db744f504602a7b3987f2` pushed to `ux-v2`. Exact-SHA run `45526842647` (https://github.com/dmoneyUK/three-kingdoms/actions/runs/45526842647) completed with failure: API and Browser startup/H4 smoke passed; Lint failed with seven `react-hooks/refs` errors because JSX read `placement.ref`, `.ready` and `.top` from the hook result object. Deployment was skipped.

**Local CI repair in progress:** destructured `{ ref, top, ready }` from `useBattlefieldChoicePlacement`, matching existing call sites and preserving geometry/behavior. Focused local ESLint was attempted, but local Node `v26.3.0` overflowed in `react-hooks/rules-of-hooks` on both the changed source and its baseline copy; it cannot independently verify this large file in this environment. The exact CI diagnostic identified only render-time reads from `placement.*`. Run `45526842647` completed: API and Browser jobs passed; Lint failed; deployment skipped. The repair is uncommitted. After that run fully completed, commit only this repair and HANDOVER, push, then wait for exact-SHA CI/deploy/smoke before advancing. Do not mark USER-ACCEPTED; owner iPhone review remains required.
