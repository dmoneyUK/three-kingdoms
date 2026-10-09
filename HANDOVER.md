# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-ATTACK-GRAPH-CONTINUITY-01` found no unexplained graph loss
in the tested ordinary server-proven Attack response. The focused real-gameplay
browser case passed twice. Across ten 4/6/8-player windows, both participants
retained the graph; the first 390×844 window sampled 776 consecutive frames
over 12.9s per viewer (max gap 20ms) and 13 public room polls per viewer, all
with the same root identity and visible edges. Build, targeted ESLint (4GB Node
heap), and `git diff --check` passed. Latest Actions run `37866279249` succeeded
on `202978ee34d6c411d26e91d2e449c6a81caad1a6`; latest remote HEAD
`0bf37f7b779bdab601b49b42a96d7b19ef9a714d` has no run listed. Outgoing task
SHA is not yet pushed/validated. Reviewer acceptance is not claimed.

## Design checkpoint

Latest `docs/UX2-refine.md` blob: `4c56947d9965cde28a7c888e19f5d5fa0612112e`.
Reviewed §6.27–6.27.4. No intermittent disappearance was reproduced after the
ordinary Attack graph reached `ready`; the existing safe Stage fallback remains
for missing proof, explicit local presentation, reveal handoff, or unavailable
geometry. Current yellow/cream connector styling and text-only root card remain
unfinished against §6.27 and must be refined in separate bounded work.

## Current task

`UX2.6-PHASE-D-ATTACK-CARD-FACE-SCALE-01` — render the ordinary Attack root and
successful Dodge response as authentic portrait `CardFace` cards, sized as
large as collision-free space allows at 390×844, 480×900, and wide layouts.
Use §6.27.1/.3 size and 2:3 targets, with safe dense-layout minima; keep the
root position stable (≤1 CSS px) as Dodge appears, and preserve Seats/Dock,
controls, containment, and fail-closed authority. Do not change connector
colors, thickness, arrowhead, or target highlight in this task.
