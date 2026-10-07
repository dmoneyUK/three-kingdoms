# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-PRIVATE-DRAW-CONTENT-DRIVEN-HEIGHT-01` separates the full-table
Private Draw backdrop from its compact title/card content. For two cards, the
content-to-System-Cluster gap measures within 16–24px at 390×844, 480×900, and
1440×900; card animation samples remain clear of the cluster. Menu, Guidance,
Dock, Deck, and Discard positions remain stable. The Private Draw and existing
response-timer specs passed 6/6; targeted ESLint and `git diff --check` passed.
Current remote base `a37b36a4a9809ae4f1171200b5600c3650f0e337` passed both latest
push-triggered Actions #844 (`37603844083`) and queued #845 (`37603845134`).
This task's source SHA is not yet committed or pushed.

## Design checkpoint

Reviewed current remote `docs/UX2-refine.md`, blob
`347db2e2bc8768620eaf69bbd84191a1a79792d3`. §4A.5 requires content-driven
Private Draw height; §1.8 keeps cross-Hero passive choices in the viewer's
Local Dock Action Row.

## Current task

`UX2.REFINE-PRIVATE-DRAW-CONTENT-DRIVEN-HEIGHT-01` — commit and push this
focused layout/geometry change, then verify the exact task SHA succeeds in
Actions. Preserve private content, 3s duration, timer/menu/Dock behavior, and
all other event layouts; no server/gameplay changes.
