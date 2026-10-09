# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Final multi-target revalidation passed 21/21 real server-backed browser cases,
including an 8-player Raining Arrows graph at 390×844; the focused
PresentationV2 engine file passed 39/39. Build, targeted ESLint, and
`git diff --check` passed. The unchanged remote base SHA
`b98834674e32ecdd8faa6bccdcd64e699a4d93b6` passed all five jobs in Actions run
`37902249037`; the outgoing task SHA is not yet validated. No Reviewer
acceptance is claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `4c56947d9965cde28a7c888e19f5d5fa0612112e`.
Re-reviewed §6.24 dense-table and stale/reconnect acceptance, §6.25–6.27, and
§5.4. P1–P5, §4A/§4B, Phase A, and the §6.27 Attack/Dodge stability/visual
work have focused evidence; do not redo them. The new eight-seat AOE scene
closes the final matrix update required after the Halberd ordered-root render.

## Current task

`UX2-6.24-ATTACK-RECONNECT-FAIL-CLOSED-PROOF-01` — add real server-backed
ordinary-Attack reload/reconnect proof for attacker and defender. During one
open response, reload each client and verify it restores only the same
authoritative root event/interaction with both measured connectors ready; then
advance the real server decision and verify the stale root cannot reappear.
Measure no duplicate Stage, no Seat/Dock movement, and fail-closed behavior if
the exact proof is absent. Keep this to reconnect/stale lifecycle; do not widen
into another card or graph redesign.
