# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-D-ATTACK-WUSHENG-ROOT-PROOF-01` is implemented locally. Typed
public root proof now preserves any valid non-Attack physical CardKind only
when its exact public event is marked `playedAs: attack`; semantic action stays
Attack and the physical ID remains outside the root contract. Real Guan Yu
gameplay proved red Peach authorization, forged black-Peach rejection (409),
and matching Peach-face Attack graphs for attacker and defender. The browser
proof passed 1/1; engine projection 39/39; client/snapshot 75/75; build,
targeted ESLint, syntax checks, and `git diff --check` passed. Exact parent
SHA `f4c9574fbf7c6115e8d332292530062014bfcd13` Actions run `37887836857` had
Lint/fast and API jobs successful; browser shards were still running (0/2)
and deploy had not started when checked. No CI failure was observed.
Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`; unchanged from the prior
checkpoint. Re-fetched and reviewed §6.27.1–§6.27.4 at this task boundary.

## Next task

`UX2.6-PHASE-D-ATTACK-MULTI-TARGET-PROOF-AUDIT-01` — audit the real
Sky-Piercing-Halberd multi-target Attack path against §6.27.4. Establish from
server and public projection evidence whether one physical root and every
ordered target branch are authoritatively linked through response, settlement,
and nested effects. Do not derive branches from seat order, timeline order, or
the card face; document any unsupported semantic proof and the smallest typed
follow-up task.
