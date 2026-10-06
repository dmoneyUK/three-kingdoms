# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

UX2.30 re-ran the §12.9 representative browser matrix: 16 specs, 209/209 passed. Oath and Bumper Harvest bounding-box assertions show Draw/Discard clear of Source/root/recipient-or-participant/Negation at 390×640, 390×844, 480×900, and 1440×900; 390×844 and 1440×900 screenshots were inspected. No gameplay/projection changes. The pre-commit Actions run `37507856521` for exact SHA `beca49a5c3f978a81830829529c7ceb1f8b9088f` was `in_progress`; lint/build succeeded and browser validation was running at last check. Reviewer acceptance is not claimed.

## Design checkpoint

Remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` is unchanged. §§12.0–12.9 and mobile invariants were reviewed. The §12.9 representative integration matrix now passes; human Reviewer acceptance is unclaimed. §12.4 remains open for per-flow browser proof, next focusing on Fanjian's source-owned concealed-Hand selection.

## Current task — UX2.31-FANJIAN-SELECTABLE-DETAIL-BROWSER-PROOF-01

Add focused browser proof for Zhou Yu Fanjian's existing server-projected anonymous `hand:N` selection. Verify the external source appears as the proven Selectable Detail target, concealed identities remain hidden, selection is local until Confirm, the existing `trigger` payload is submitted once, and action-revision changes clear it. Retain the generic picker when public focus proof is absent. Do not change gameplay or invent semantic projection; if the runtime scene does not prove the source relationship, fail closed and record that exact authority gap.
