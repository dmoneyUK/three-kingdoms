# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2-6.27-GUAN-YU-CONVERTED-ATTACK-DODGE-INTERCEPTION-01` is implemented
locally. Real Guan Yu red-Peach-as-Attack now reaches an actual defender Dodge;
API/browser proof covers viewer-equal public causality, physical Peach identity,
stable root position, Dodge interception and settlement cleanup in both views.
API: 39/39; Guan browser: 1/1 after immediate response-frame screenshot capture;
full browser shard 1/2: 443 passed, 2 flaky, and those two Group Negation cases
passed isolated 6/6. Build, targeted ESLint, syntax and diff checks passed.

Remote `ux-v2` SHA `b325d905bf485caa6ef35117371f07ac7fb1ddd9`, Actions run
`37923975635`: lint/fast, API, and browser shard 2/2 succeeded; browser shard
1/2 failed. GitHub exposes only the failing step without sign-in; no exact test
log is available. Local reruns did not reproduce a final failure. Outgoing
commit validation remains pending; Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`. The complete current document was
re-read at the planning boundary; the roadmap records the §4D / §5 prerequisites
closed for Section 6.

## Next task

`UX2-FINAL-AOE-MULTI-TARGET-REVALIDATION-03` — rerun production-path Raining
Arrows, Barbarian Invasion, Oath, Bumper Harvest, and ordered Halberd Attack
coverage against the post-§6.27 code. Measure 390×844, 480×900, wide, and
supported dense 8-player layouts; verify viewer parity, authoritative branches,
stable root/Seat geometry, settlement, containment, and fresh screenshots.
Preserve fail-closed behavior; do not invent missing semantic proof.
