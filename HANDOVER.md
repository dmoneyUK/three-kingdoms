# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Attack graph implementation is on `origin/ux-v2` at
`fb8556b44190dbbda29b0a6f586c566e7785c55c`. CI repair
`c613ca56563178230166a599a3f58a65ee333d94` failed in Actions run
`37836986678` (#916): API and lint/fast passed; browser shard 2 had 417
passes and one Stargazing invalid-drop drag-start failure; shard 1 was
cancelled by matrix `fail-fast`. This repair verifies the card hit target,
uses sampled pointer movement beyond the drag threshold, and lets both shards
finish. The failing 390×844 test passed 3/3 repeated locally; targeted ESLint
and `git diff --check` pass. Repair `ecc31267578da469d250a704fd4d2975b5d1f3a4`
failed in Actions run `37838239973` (#917): API/lint and browser shard 1 passed;
shard 2 again failed the same Stargazing drag-start assertion (417/418 passed).
local pointer trace reproduced it: actual pointerdown/move hit the card row, not
the card, despite an earlier hit check. This repair hovers the card through
Playwright's stable actionability check before measuring/pressing; the test
passed 5/5 locally. The worker's teardown reset is not implicated.

## Design checkpoint

Latest `origin/ux-v2:docs/UX2-refine.md` blob reviewed:
`7feb8af937b6407f3f33c3959325db8d3f188cf4`; rechecked §§6.7, 6.9, 6.18–6.19,
and 6.24–6.26. Reviewer acceptance is not claimed.

## Current task

`UX2-CI-REPAIR-STARGAZING-STALE-POINTER-HIT-01` — preserve real Stargazing
invalid-drop behavior using a stable, actually hit-tested mouse start; retain
failure-only pointer-event diagnostics and both-shard completion; require the
exact pushed SHA to pass CI before feature work resumes.
