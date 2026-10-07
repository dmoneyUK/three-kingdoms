# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-PRIVATE-DRAW-COUNTDOWN-CLUSTER-01` places the viewer-private
Private Draw countdown immediately left of System Menu in the lower-right
`StageSystemCluster`, with a numeric-only face and accessible full label. The
private title/cards, viewer privacy, and event duration are unchanged. The new
regression plus response-timer specs passed 5/5 across 390×844, 480×900, and
1440×900; targeted ESLint and `git diff --check` passed. Commit
`1e49694bbf642c4e3a37720932e6f0cc6074576b` passed exact Actions run #843
(`37602622818`; `build-and-test`, `deploy`). Reviewer acceptance is not claimed.

## Design checkpoint

Reviewed current remote `docs/UX2-refine.md`, blob
`347db2e2bc8768620eaf69bbd84191a1a79792d3`; it is unchanged from the prior
checkpoint. §4A.5 requires content-driven Private Draw height; §1.8 keeps
cross-Hero passive choices in the viewer's Local Dock Action Row.

## Current task

`UX2.REFINE-PRIVATE-DRAW-CONTENT-DRIVEN-HEIGHT-01` — separate the Private Draw
backdrop from its title/card content layout; place the content in the usable
table space near the lower system cluster instead of centering it in a full-
height content region. Preserve private content, the existing event duration,
and timer/menu/Dock geometry. Prove full visibility and a normally 16–24px
content-to-cluster gap at 390×844 and 480×900, plus a wide viewport; no
Guidance/Dock overlap or horizontal overflow. Do not change other event layouts,
Deck/Discard state, or gameplay/server semantics.
