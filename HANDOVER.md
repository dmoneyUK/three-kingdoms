# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Attack→Dodge response routing now binds a public Dodge proof to the exact current Attack root (event, interaction, frame, source, target), instead of rejecting it when the room contains multiple historical Dodge proofs. The exact active settlement event remains the hold identity. No test files were added or changed.

Existing server-backed browser spec passed 1/1: `real Attack→Dodge keeps its 3-second public graph without an exit animation under reduced motion`; `git diff --check` passed. Pre-change remote HEAD `6575eae88d1d48184b3bd01f750989f59cd06217` had Actions run `38001261734` Success, including deploy. The follow-up commit's CI has not yet been observed.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. §6.29.1 remains the authority; no Reviewer acceptance is claimed.

## Current task

`UX2-6.29.1-ATTACK-DODGE-HISTORY-BOUND-RESPONSE-02` — deliver only the response-proof routing correction and this handoff, with no test changes. Then re-check the user's real four-player Dodge response screenshot; keep §6.29.1 open until the relationship graph is visibly confirmed.
