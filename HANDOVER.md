# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

§4D P2 production-path proof is closed: the real server-backed target-card
browser spec passed 14/14 for Steal, Burning Bridge, Retaliation, Frost Sword,
and Kirin Bow, including hidden-Hand privacy, public zones, exact submissions,
and mixed-zone geometry. Actions run #941 (`37895174379`) passed all jobs on
validation SHA `b55ca795e85b612fa5a320426f9686b298f69e29`. Latest remote HEAD
`848ef06cd7a08fa7118f5dcb9dd8381d30039f5b` is a HANDOVER-only commit with no
push-triggered run listed; per direct user instruction, an empty CI state is
treated as success. Reviewer acceptance is not claimed.

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
