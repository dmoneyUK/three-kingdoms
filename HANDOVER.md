# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Fixed the real Attack→Dodge graph crash: `PublicCounterReadTimer` called `useEffect` without importing it. The graph now shows Attack, the server-proven Dodge, and a visible `0:20` hold timer; the hold is 20 seconds of graph-ready visibility per viewer. A rebuilt local Worker passed the existing server-backed 4-player 390×844 Attack→Dodge browser scenario and produced a screenshot with the full graph. No new tests were added; existing timing assertions were updated to 20 seconds.

Latest completed remote CI before this revision: run `38018860884` (#971), tested code SHA `cddba6bf1e6faa8bc365aabfcb3658dba2801d31`, success including deployment and health smoke. Check the exact pushed revision's CI before any subsequent code commit; that fresh CI has not yet been verified.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. §6.29.7 specifies 3 seconds; the user's direct instruction overrides it to 20 seconds for this bounded Attack→Dodge task. The separate server-owned Attack response deadline remains 30 seconds; the screenshot's `22s` was that response window, not the post-Dodge graph hold. No Reviewer acceptance is claimed.

## Current task

`UX2-6.29.1-ATTACK-DODGE-20S-PRODUCTION-01` — keep open for the user to verify the deployed real-mobile Attack→Dodge graph; local server-backed 390×844 proof passes, but real-device/deployed visual confirmation remains outstanding.
