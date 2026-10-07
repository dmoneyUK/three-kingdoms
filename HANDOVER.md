# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result

`UX2.REFINE-LADY-GAN-SKILLS-BAND-ACTIVATION-01` maps Lady Gan's Divine Wisdom
and Prudence CurrentAction options to the Skills band. Fixture-browser proof
passed 5/5 at 390×844 and 1440×900: exact trigger/target payloads, no duplicate
Action Row activation, and unavailable without authoritative options. Targeted
ESLint and `git diff --check` passed. This is fixture evidence only, not §4D
real-game reachability proof; Reviewer acceptance is not claimed.

Pre-commit CI: latest code-path run `37660910916` on
`269f83f821e40d26599b6333bbd3b8400a3c64ce` succeeded; current remote `268c4f8`
adds only `docs/UX2-refine.md`. This task commit's CI state is not yet observed.

## Design checkpoint

Reviewed latest remote `docs/UX2-refine.md`, blob
`9b53efac347e1186eb7195346e3ea2c51f8d17b6`, including §§1.5, 1.10, 4.10,
4D (P1–P5), and 5.4; inspected all changes since the prior handoff revision.
Section 6 remains gated on every active pre-§5 refinement and §4D task.

## Current task

`UX2.REFINE-REAL-SERVER-TO-BROWSER-PROOF-P1-01` — restore a reliable real
server-to-browser validation path required by §4D P1.

Acceptance: room creation works through the product's `/api/rooms` route; a
browser can seed/enter a real server room and reach the production game page
without handcrafted CurrentAction or PresentationSnapshot; one clean server-
backed browser flow proves this path and can support P2–P4. Investigate the
duplicate `CausalCreation` declaration and reported local-runtime failure;
change only what is needed for this bounded validation foundation.
