# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

§4A's Bumper Harvest chooser now has a fresh server-owned 60-second deadline
for each chooser; expiry only updates the display. Phase A now projects a typed,
public root `ATTACK` card only when Pending continuation, causal frame, target,
and the exact linked public play event agree. Snapshot/client adapters recheck
that proof and fail closed; no physical card ID is exposed. Engine-backed API,
presentation/client tests, production build, targeted lint, and diff checks
passed. Actions run `37733553911` on parent SHA
`a59988b5fee795a766edb343ef8383306dfa128e` failed one browser case before its
UI assertions: the real-room page GET was not observed within 15s (391 passed;
other shard passed). This change keeps the GET/success/shell assertions and
extends only that case's bounded readiness window to 30s; focused serial rerun
passed 3/3. Verify this pushed SHA's Actions before any further commit. Reviewer
acceptance is not claimed.

## Design checkpoint

Reviewed latest `docs/UX2-refine.md`, blob
`516fc7d673b0dfcc7e1e01ba8572cd97cdcf6784`, through §6.26. Section 6 is active;
Phase A graph rendering remains incomplete.

## Current / next task

`UX2.6-PHASE-A-ROOT-ACTION-OVERLAY-01` — render the proven ordinary Attack root
action in one `.game-shell` overlay, attached to existing `data-player-anchor`
Seats/Dock with one source tether and one target arrow. Fail closed without the
typed root proof. Keep physical Seat/Dock geometry and controls unchanged; prove
server-backed rendering, 390×844 / 480×900 / wide containment, and no page
overflow. Do not add central player portraits or infer edges in React.
