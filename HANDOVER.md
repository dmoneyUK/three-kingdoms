# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2-6.27-ATTACKER-DODGE-GRAPH-CONTINUITY-01` is implemented locally. The
server-backed 6/8-player 390/480 matrix proves identical public Dodge causality
for attacker/defender projections, captures the first response or measured
geometry fallback, keeps a rendered Attack root stable within 1px, and proves
settlement cleanup. At 480px both viewers render the intercepted graph; dense
390px cases that lack safe placement fail closed with measured diagnostics.
The focused browser matrix passed 4/4; targeted ESLint and `git diff --check`
passed. Pre-commit remote SHA `1ec040679ae0e354394aa1db96312e39904734e8`
passed Actions run `37917467356`; outgoing revision/CI will be recorded after
push. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`. Re-reviewed §§6.27.1–6.27.4 at
the planning boundary; no intervening design change.

## Next task

`UX2-6.27-LONGDAN-ATTACK-DODGE-INTERCEPTION-01` — extend the real Longdan
Dodge-as-Attack production path through an actual defender Dodge response.
Verify both viewers retain the server-proven physical Dodge root face, the
submitted response uses the same authoritative root/event relation, the Dodge
intercepts the Attack path when geometry permits, and settlement clears the
graph. Keep this to Longdan presentation/browser proof; do not change gameplay
semantics or infer causality.
