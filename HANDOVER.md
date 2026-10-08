# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

The P2 production-routing audit and real-game browser proof remain uncommitted:
Steal/Burning Bridge use `CurrentAction.targetCardSelection`; Retaliation/Frost
Sword/Kirin Bow use authoritative trigger options. The shared picker does not
require Hero Focus, Inspect, or preview proof, and no production JSX callsite
for the legacy table picker remains.

The previous parent run `37790885726` failed one Stargazing 390×844
touch-cancel case after mouse drags. The repair kept cancellation/order
assertions, added grip hit-testing, and grouped cancellation with native-touch
operations. The exact repair SHA `9312dcaeb521e5734d09f99f3ab4cfcbdc25487f`
passed Actions run `37793692172`: lint/fast, API, both Browser shards, and
deploy succeeded. Focused Stargazing CI-mode browser proof passed 4/4.

P2's no-reload real-game browser spec passed locally 14/14 and target-card
contract browser passed 68/68 after the repair; targeted ESLint, syntax checks,
and `git diff --check` also passed. P2 changes and existing Fanjian/§6 work
remain uncommitted and separate.

## Design checkpoint

Re-fetched `origin/ux-v2`; `docs/UX2-refine.md` remains blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`, unchanged from the last reviewed
revision. Re-read §§4C.1–4C.29 and §§4D.1–4D.3, including P2. Section 6 remains
deferred until all active pre-§5 gates close.

## Current / next task

`UX2.REFINE-UNIFIED-TARGET-CARD-MODAL-REAL-GAME-P2-01` — finish the real
server-backed production-path proof for Steal, Burning Bridge/Dismantle,
Retaliation, Frost Sword, and Kirin Bow. Keep `CurrentAction` as selection
authority; verify privacy, mixed public zones, action-specific copy/CTA, stale
selection clearing, shared modal routing, and ≥44px targets. Do not include the
separate Fanjian/§6 changes.
