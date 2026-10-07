# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-RETALIATION-UNIFIED-TARGET-CARD-MODAL-01` was pushed as
`e5e8df1304b89587a5c059008381ea264745b63f`; Actions run `37637916120`
completed `success` on that exact SHA, including tests, deployment, and
production smoke test. `UX2.REFINE-FROST-SWORD-UNIFIED-TARGET-CARD-MODAL-01`
was pushed as `c7ec91770635261d83b2dac656dbd4bdf0ef1c59`; Actions run
`37639976811` completed `success` on that exact SHA, including the full
build-and-test job, deployment, and production smoke test. Frost-focused
browser tests passed 8/8, the complete target-card picker spec passed 56/56,
and targeted ESLint plus `git diff --check` passed. Current Kirin Bow
implementation is local; its focused browser slice passed 10/10, the full
target-card picker spec passed 59/59, and targeted ESLint plus
`git diff --check` passed. Reviewer acceptance is not claimed.

## Design checkpoint

Latest complete remote design review: `docs/UX2-refine.md` blob
`f8d1ff3bd61be6177de0cf562b3cd38dfb83d888` (unchanged). §4C.18 and §4C.26–27
require Kirin Bow to use the shared modal shell with only eligible public
Mounts, “Choose 1 Mount to discard,” authoritative keys, revision safety,
touch/geometry/accessibility proof, and a safe fail-closed fallback. §5 keeps
Hero/player graph work deferred until the active §1–§4B refinements close.

## Current task

`UX2.REFINE-KIRIN-BOW-UNIFIED-TARGET-CARD-MODAL-01` — route only the proven
external-target Kirin Bow Mount choice to the shared modal's Equipment-only
form. Preserve the existing authoritative eligible Mount keys and trigger
payload; use “Choose 1 Mount to discard”; prove eligible Mount-only display,
selection/submit payload, revision reset, no duplicate Dock Confirm, and
modal/Stage/Dock containment at 320×568, 390×640, 390×844, 480×900, and wide.
Unproven focus or keys must retain the safe fallback. Do not change gameplay
rules or other providers. Before committing, inspect the latest run for the
current remote HEAD; `37639976811` on
`c7ec91770635261d83b2dac656dbd4bdf0ef1c59` completed `success` and satisfies
the current pre-commit gate.
