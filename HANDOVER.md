# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `456b76abc34dd9d8f99af9c1672777d32bfb6d5c`. Product requirements are unchanged; UI-1 has a progress-only awaiting-acceptance marker.

## Latest result

- UI-2 implementation is pushed at `5357c3950512b697d86b0f1b8dfed1914119733f`. Build, targeted lint, 14 focused UI-2 browser cases, and three Worker/D1 response cases passed locally.
- Actions run [38646778676](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38646778676) for that SHA: API and browser smoke passed; Lint/fast failed in `tests/room-safety-render.test.mjs` because an SSR assertion still expected one tiny info button per Hand card; deploy was skipped. The stale assertion is being repaired separately.

## Current task — UI-2 CI assertion repair

Update the SSR regression to match UI-2’s single selected-card Dock Details action, then pass `node --import tsx --test --test-concurrency=1 tests/room-safety-render.test.mjs`, commit and push only the repair plus this handoff. After the repair SHA’s required Actions and deployment state are verified, mark UI-2 delivered/awaiting Reviewer acceptance with a progress-only design marker, review the latest design at the planning boundary, and continue with UI-3. User authorized continuing without waiting for acceptance; never claim Reviewer acceptance.
