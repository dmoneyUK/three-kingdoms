# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

§4.10 Stargazing re-opened acceptance is now proven in the real server-backed
browser flow: no action POST occurs while arranging, and the exact visible Top
sequence is submitted and then drawn in that same order. Browser passed 4/4;
focused Stargazing API passed 8/8; targeted ESLint and `git diff --check` pass.
Pre-commit remote HEAD `9ac6f5042e1405375dd7046d59ac10a1a2964b9a` passed Actions
run `37809951259`. This follow-up is ready to commit; Reviewer acceptance is
not claimed.

## Design checkpoint

Latest `origin/ux-v2:docs/UX2-refine.md` remains blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`. §4.10 and the other pre-§5 gates
are closed in implementation evidence; §6 resumes from its first remaining
Phase A gap. Reviewer acceptance has not been asserted.

## Current / next task

`UX2.6-PHASE-A-DISMANTLE-ROOT-OVERLAY-01` — extend the Phase A physical-seat
root grammar to one real Dismantle decision: prove the exact played-card event,
source, and target from server-owned semantics, then render one stable root card,
source tether, and target arrow. Do not derive relationships from names,
timeline/DOM order, or the modal. Preserve the existing safe fallback when
proof is absent. Add real server-backed browser, privacy, and mobile/wide
geometry evidence; do not alter game rules or mix in other cards/effects.
