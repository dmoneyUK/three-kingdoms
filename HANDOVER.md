# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-ATTACK-DENSE-CONTINUITY-01` is implemented locally. The
server-backed 6/8-player × 390×844/480×900 matrix covered attacker and
defender (8 views): each preserved the exact root for 12.1–13.0 seconds of
consecutive RAF sampling and 11.0–12.0 seconds of 12–13 actual room polls.
All eight honestly classified the current dense geometry as
`geometry-unavailable` and kept the safe Stage; none claimed graph readiness.
Eight screenshots plus frame, poll, and geometry evidence are in the local
Playwright HTML report. The focused browser test passed 1/1; `node --check`,
targeted ESLint, and `git diff --check` passed. Exact parent SHA
`365634de7d0ebd79384bab0ecc0a820eeba4419a` passed Actions run `37885948819`
(4/4 jobs). Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`; unchanged from the prior
checkpoint. Re-fetched and reviewed §6.27.1–§6.27.4 at this task boundary.

## Next task

`UX2.6-PHASE-D-ATTACK-WUSHENG-ROOT-PROOF-01` — extend the typed public Attack
root proof to a server-authored Guan Yu God of War red-hand-card Attack, while
retaining its real physical card identity and `playedAs: attack`. Prove the
actual server-backed use for attacker and defender, unique matching public
root rendering, and fail-closed malformed proof; do not infer red-card
eligibility in React or expose private hand identity.
