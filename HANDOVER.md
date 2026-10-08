# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Phase B now links the proven single-target Negation root and each submitted
Negation to its unique public card event. Engine-backed Steal → Negation →
counter-Negation proof covers source, responders, observer equality, privacy,
stale replay, and fail-closed root/response event mismatches. Presentation tests
passed 109/109; the focused engine API file passed 34/34; build, targeted ESLint,
and `git diff --check` passed. Pre-commit remote HEAD
`a55d9b6cdd43f6fe47afe9db2442ce722b57fa66`, Actions run `37745870122`, was
observed `success`; this task's commit CI is not yet observed. Reviewer
acceptance is not claimed.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md`, blob
`516fc7d673b0dfcc7e1e01ba8572cd97cdcf6784`, through §6.26. No newer revision.

## Current / next task

`UX2.6-PHASE-B-NEGATION-ROOT-DISPOSITION-AUTHORITY-01` — project the
server-owned single-target Negation root disposition (`ACTIVE` / `BLOCKED`)
through PresentationV2, Snapshot, and Client, bound to the proven root and
public event links. Prove open → first Negation → counter-Negation transitions
for all viewers; malformed or missing disposition authority fails closed.
Do not change React graph rendering in this task.
