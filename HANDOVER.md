# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2-6.27-ATTACKER-ROOT-FIT-SEARCH-01` is implemented locally. Exhaustive
4px search finds safe attacker roots at 6p 390/480 and 8p 480; 8p 390 remains
fail-closed after both 12px and 8px clearance scans find no solution. Base
`4ba3673cd31def3a4926c4a538c34e652dbddd34` passed Actions run `37911187593`,
all five jobs. Outgoing SHA/CI are not yet available. Build, targeted ESLint,
four dense Attack→Dodge cases, ten-window continuity, and 10-window RAF/poll
continuity passed locally. Reviewer acceptance is not claimed.
Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`. Re-reviewed §§6.27.1–6.27.4 at
the planning boundary; no intervening design change.

## Next task

`UX2-6.27-DODGE-INTERCEPTION-FIT-SEARCH-01` — for real server-backed Attack
roots that reach `ready`, search for a full portrait Dodge placement directly
on the root-to-target segment or, when impossible, nearest to it with the
§6.27.2 12–20px edge gap and a short proven interception mark. Preserve the
Attack root within 1px, keep connectors unobscured, and fail closed with
quantified geometry when no safe position exists. Validate 6/8-player mobile
scenes where a root graph is proven; do not alter Seats, Dock, or gameplay.
