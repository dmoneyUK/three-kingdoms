# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-ATTACK-CONVERTED-CARD-ROOT-PROOF-01` is implemented locally.
The engine, snapshot, and client preserve semantic Attack separately from a
physical Dodge played as Attack; React links the face only to the unique,
matching public root event. Real Longdan gameplay exposed two routing defects:
the console rejected a CurrentAction-authorized Dodge-as-Attack, and the graph
layout keyed fit/reserved-response geometry to the physical face instead of
Attack semantics. Both are fixed without client-side legality inference. The
server-backed Longdan browser path passed 1/1 for attacker and defender; the
ordinary Attack timeout regression passed 1/1 (48.7s). API projection file
passed 38/38, PresentationClient passed 57/57, build and targeted ESLint
passed, and `git diff --check` passed. Repo-wide `tsc --noEmit` remains
non-green with broad environment/type errors; it is not a configured CI job.
Pre-commit parent Actions run `37884026647` succeeded for exact SHA
`1747464555e334c75940dfdeb234b45af6422067`; this commit's outgoing run has
not yet been observed. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`; unchanged from the prior
checkpoint. Re-fetched and reviewed §6.27.1–§6.27.4 at this task boundary.

## Next task

`UX2.6-PHASE-D-ATTACK-DENSE-CONTINUITY-01` — extend §6.27.4 real Attack
stability evidence to supported 6/8-player mobile scenes at 390×844 and
480×900. Cover both local attacker and defender, preserve the exact server root
identity through a 12-second RAF observation and repeated room polls, and
classify unsupported geometry only through the explicit fail-closed reason.
Attach actual screenshots/frame evidence. Do not change card sizes, connector
styling, gameplay rules, or dense layouts merely to force graph readiness.
