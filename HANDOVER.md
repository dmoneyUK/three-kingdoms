# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Attack physical-seat graph implementation is on `origin/ux-v2` at
`fb8556b44190dbbda29b0a6f586c566e7785c55c`. Its CI failed first on a stale
Bumper Harvest Negation fixture; repair `a40f63455ac792a7dd7ea52f17df07f7a000c9f1`
restored exact event links, but Actions run `37834703399` (#915) failed when
the shared Wrangler browser Worker exited at test 131/418. The remaining
`ECONNREFUSED` errors cascaded from that exit. Same-shard local reproduction
did not reproduce the Worker exit; it exposed and now fixes an Oath resize
measurement race. Focused Bumper/Oath browser tests pass 11/11; targeted
ESLint and `git diff --check` pass. The repair adds upload of Wrangler's
failure log for direct diagnosis if the runner exit recurs.

## Design checkpoint

Latest `origin/ux-v2:docs/UX2-refine.md` blob reviewed:
`7feb8af937b6407f3f33c3959325db8d3f188cf4`; rechecked §§6.7, 6.9, 6.18–6.19,
and 6.24–6.26. Reviewer acceptance is not claimed.

## Current task

`UX2-CI-REPAIR-WRANGLER-DIAGNOSTICS-AND-OATH-RESIZE-RACE-01` — retain the
Bumper event-proof regression; wait for measured Oath self-Hero geometry after
viewport changes; preserve Wrangler logs as a failed-browser-job artifact;
commit/push only this CI repair and require the exact pushed SHA to pass before
resuming feature work.
