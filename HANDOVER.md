# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-ATTACK-RESPONSE-TIMEOUT-CLEANUP-01` is implemented locally.
With no Skip click, the real browser waited for the server-owned 30-second
ordinary response deadline and automatically submitted `decline_response`.
The server published one `ATTACK_DAMAGE_APPLIED` proof for the same root,
reduced target HP from 4 to 3, and the graph showed the settlement before
clearing; no stale card or duplicate Stage remained. Pre-commit Actions run
`37882419728` for exact parent SHA `13b5641bd9a108c2a5eda39cb9df9e4cc9946910`
failed only in Browser shard 1: the real Attack→Dodge spec queried a 600ms
settlement graph through sequential browser calls and lost it under suite
load. The test now records actual DOM/style/geometry at the first settlement
frame and keeps semantic, geometry, and exit assertions; CSS transition
measurements allow at most 0.01px stroke and 0.005 opacity rounding. The CI
repair is included with this task. Local focused browser validation passed
4/4 across 390×844, 480×900, 1440×900, and the real 30-second timeout path;
the 1440px case also passed 3/3 repeats with 2 workers. Targeted ESLint,
`node --check`, and `git diff --check` passed. Outgoing Actions status is
pending after push. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`; unchanged from the prior
checkpoint. Re-fetched and reviewed §6.27.1–§6.27.4 at this task boundary.

## Next task

`UX2.6-PHASE-D-ATTACK-CONVERTED-CARD-ROOT-PROOF-01` — audit and, if needed,
extend typed public root proof for exactly one real single-target converted
Attack: Zhao Yun's Longdan physical Dodge played as Attack. Preserve exact
server-proven source, target, frame/checkpoint, and physical card identity/type;
render the real card face without inferring Attack causality in React. Add a
server-backed browser proof from skill activation through target response.
Keep multi-target Attack out of scope; malformed or missing conversion proof
must fail closed.
