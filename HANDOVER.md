# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2-6.27-CONVERTED-ATTACK-DODGE-PUBLIC-PROOF-01` is implemented locally. The
server-authored proof accepts only an exact `playedAs: attack` root with a
unique physical-card event and shared resolution. Engine-backed API coverage
proves viewer-equal, card-ID-free proof; the production Longdan browser path
proves attacker/defender graph parity, reserved Dodge geometry, interception,
and settlement cleanup. API passed 39/39; the focused browser case passed
2/2 repeats; build, syntax/diff checks, and targeted lint passed. ESLint on
`app/page.tsx` exceeded the local 4GB Node heap; no test was weakened.
Pre-commit remote SHA `2ef038005ab4375a416c89fcfa2b0391479a1e86` passed Actions
run `37921622267`; outgoing task CI is pending. Reviewer acceptance is not
claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`. Re-reviewed §§6.27.1–6.27.4 at
the planning boundary; no intervening design change.

## Next task

`UX2-6.27-GUAN-YU-CONVERTED-ATTACK-DODGE-INTERCEPTION-01` — extend the existing
real Guan Yu red-Peach-as-Attack browser path through an actual defender Dodge.
Verify authoritative proof and viewer parity, preserve the physical Peach face,
and measure stable-root interception and settlement cleanup in both views.
Keep conversion legality server-owned; no gameplay-rule or client-causality
changes.
