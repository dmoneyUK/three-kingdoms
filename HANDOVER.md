# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-OTHER-PLAYER-INSPECT-FLOATING-SHELL-01` implements the compact
Stage-contained Inspect overlay and one `INSPECT · Player` title/close row. At
390×844, 480×900, and 1440×900, shell sizes were 352×223, 442×297, and 680×230
CSS px. Measured overlap with System Menu, Guidance, and Dock was 0; opening /
closing Dock delta was 0px. Focused browser spec passed 7/7; targeted ESLint
and `git diff --check` passed. Reviewer acceptance is not claimed.

Commit gate on base SHA `1508be23428e3f35af2c301d98c3ef575871f4e2`: Actions
#848 (`37613975213`) was observed successful; the fresh combined-status query
was empty and, per the user's instruction, counted as success. CI for the
upcoming task SHA is not yet observed.

## Design checkpoint

Re-read the complete current remote `docs/UX2-refine.md`, blob
`6889c2541f32fe6b4825aadd652b5ade52a6ae39`. §4B.2–4B.3 are complete. §5 still
defers Interaction Stage Hero/Player refactoring until all active pre-§5
refinements are closed.

## Current task

`UX2.REFINE-OTHER-PLAYER-INSPECT-IDENTITY-BLOCK-01` — implement only §4B.4's
Inspect identity-block proportions and readability. Keep public fields and
current Skills/Equipment/Judgment/Hand content unchanged; add no inferred or
private identity data. Prove portrait occupies about 38–44% of panel width,
identity 56–62%, and name/Hero/HP/Explain Hero remain legible at 390×844,
480×900, and wide. Preserve shell geometry, public-only data, Dock stability,
and target Preview/Stage identity behavior.
