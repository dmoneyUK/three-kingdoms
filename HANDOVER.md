# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-C-HALBERD-ORDERED-ROOT-GRAPH-01` now renders the typed physical
Attack root with server-ordered Halberd branches through response advance and
child-Dying hold. Snapshot/client validation preserves root order while
allowing a child frame to foreground its paused participant; root-origin checks
use the actual `sourceId` / `targetIds` contract. Real server-backed browser
proof passed at 390×844 and 1440×900, including ≤1 CSS px root stability,
≤3px connector-to-seat/source alignment, and no horizontal overflow. Focused
tests: client 59/59, snapshot 20/20; `npm run build` passed. Focused ESLint did
not complete because Node exhausted the heap at both 2GB and 4GB.

Pre-commit remote HEAD `5914a660b5d4f1a3e67bcdbf6d7d08e96cd05a76` has Actions
run `37890639566` completed successfully. This task's commit/push validation
has not yet been observed. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`; unchanged. Re-reviewed §§4D.1–4D.3,
§6.25, and §6.27.4. The real Host Game → playing-page browser proof and green
run satisfy the §4D P1 entry gate; §6 remains deferred by §4D.3.

## Next task

`UX2-4D-P2-UNIFIED-TARGET-CARD-PRODUCTION-PATH-01` — finish §4C for real
server-generated Steal, Dismantle, Sima Yi Retaliation, Frost Sword, and Kirin
Bow decisions. Route valid CurrentAction target-card authority to one coherent
modal without unrelated Hero Focus / Inspect / transient-preview gates; retain
anonymous Hand positions and public Equipment/Judgment faces; keep grouped
`hand` fallback inside the same visual language. Prove supported flows through
the real server projection and production page, including a mixed-zone case,
and show no normal supported path falling back to the legacy picker. Section 6
work stays deferred until all §4D.3 gates close.
