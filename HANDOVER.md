# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `9d95fa132d4cb3b5607fde45e082b07155b33210` (Policy B §8.7 remains active; progress annotation added after implementation).

Latest user decision: §8.1 Duel layout passed visual validation. §8.7 is still awaiting the user's visual acceptance.

## Latest implementation and CI

Implementation SHA `871f3071056c21aeb1b1c961276d54115a888a22`; Actions run [`38603216133`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38603216133) passed Lint/fast tests, API tests, browser startup/room smoke, and deploy. Production `/api/health` returned `{"ok":true,"worker":"available"}`. No local automated tests, authenticated gameplay screenshots, or device verification were run; manual visual acceptance is pending.

## Current task — `UX2-CENTRE-REVEAL-4S-P0` (§8.7 Policy B)

Keep each newly committed public CardFace full-size and centred for 4,000 ms from its first visible painted frame. Only a different server-confirmed public response in the same interaction may interrupt: move the old card to its proven actor's Seat/Dock over 380 ms while the new card takes centre immediately with a fresh 4,000 ms hold. Apply this consistently to Attack/Dodge, Duel, Negation and single-target journeys. Polling, phase changes, private choices, Pass/timeout and settlement alone do not interrupt.

The implementation is pushed. It preserves remaining visible time while the presenter is hidden and records event/actor/card identity, viewer, phase, elapsed reveal time, actual/target rectangles and layout reason in the UX trace. No local automated tests or authenticated gameplay screenshots were run, per the user's instruction; `git diff --check` passed before commit.

**Boundary / stop:** preserve public-proof validation, `CurrentAction`, privacy, gameplay deadlines, existing Duel history and the no-graph design. Do not begin another card-family task. Implementation, exact-SHA CI/deployment verification, and progress-only document updates are complete. Stop here for the user's manual visual acceptance; do not claim visual acceptance or start another task.
