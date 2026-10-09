# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

§4D P2 production-path proof is closed: the real server-backed target-card
browser spec passed 14/14 for Steal, Burning Bridge, Retaliation, Frost Sword,
and Kirin Bow, including hidden-Hand privacy, public zones, exact submissions,
and mixed-zone geometry. During P3, real Da Qiao Deflection gameplay passed
2/2 at 390px and 1440px: server-generated CurrentAction enabled the Skills
button, the browser submitted the exact card/target payload once, and the
redirected player received the Dodge decision. Focused local browser command:
`npm run test:browser -- daqiao-deflection-real-gameplay.spec.mjs`.
Latest observed Actions run #941 (`37895174379`) passed on
`b55ca795e85b612fa5a320426f9686b298f69e29`; remote HEAD
`0aa1eb3a13057591caf6a11ee255d312ac44f972` has no newer run listed. Per direct
user instruction, the empty current-HEAD CI state is treated as success.
Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`. Re-reviewed §4C.15 and §4D P2/P3/
§4D.3. The §4C.15 Burning Bridge visible-name amendment (`a8f0ec65`) is later
than the §4D P2 wording (`268c4f85`); follow Burning Bridge for all player-
visible copy and retain internal `Dismantle` identifiers.

## Current task

`UX2-4D-P3-HERO-SKILLS-REAL-GAME-REACHABILITY-01` — audit every implemented
actionable/optional/response Hero capability through the real server-projected
path to the Local Skills band. For each, prove provider/option authority,
enabled/disabled routing, activation payload and any continuation in a real
server-backed browser flow; verify no duplicate generic Action Row activation
and that absent authority stays unavailable/passive. Fix production gaps found;
fixture/API coverage supplements but does not replace real-path proof. Keep
scope to P3; §4D P4/P5 and Section 6 remain later gates.
