# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-HALBERD-ORDERED-ATTACK-ROOT-PROJECTION-01` adds a typed public
link from the exact played physical Attack (including valid `playedAs: attack`)
to Halberd's ordered root frame and target progress. PresentationV2, snapshot,
and client boundaries fail closed on missing or mismatched proof. Real API
coverage proves response advance, child-Dying pause/resume, and viewer-equal
projection. Focused projection tests passed 120/120, equipment API tests
20/20, `npm run build`, targeted ESLint, and `git diff --check`.

Pre-commit remote HEAD `2b482ca8d019995966269601cf3b18782f46dc8b` is a
documentation-only handoff commit ignored by the push workflow's `paths-ignore`;
latest relevant code run `37888311102` passed 4/4 on exact SHA
`30d145b24090bc5cc8d2ff26fef0b608429acf7f`. The implementation commit's CI
has not yet been created. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`; unchanged. Re-reviewed §§6.25,
6.27.1–6.27.4 at the task boundary.

## Next task

`UX2.6-PHASE-C-HALBERD-ORDERED-ROOT-GRAPH-01` — use the new typed
`orderedAttackRoot` proof to render one authentic Halberd Attack root and its
server-ordered target branches, emphasizing only the authoritative current
branch. Prove a real server-backed response, target advance, and child-Dying
hold at mobile and wide sizes. Missing proof must retain the safe fallback.
Do not infer links or add terminal-settlement behavior in this task.
