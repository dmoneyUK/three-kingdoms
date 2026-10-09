# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

§4D P2 real server-to-production-page browser proof passed 14/14 locally for
Steal, Dismantle/Burning Bridge, Retaliation, Frost Sword, and Kirin Bow,
including mixed-zone privacy and responsive modal geometry. CI repair commit
`b55ca795e85b612fa5a320426f9686b298f69e29` passed Actions run #941
(`37895174379`) on the exact SHA, including Lint/Build/Fast, API, both Browser
shards, and deploy. The repair raises ESLint's heap without reducing rules or
coverage. Reviewer acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`4c56947d9965cde28a7c888e19f5d5fa0612112e`. Reviewed §4C.4, §4C.15–§4C.16,
§4C.21–§4C.28, and §4D Task P2. Title/instruction conflict: §4C.15 requires
“Burning Bridge — Choose 1 card to discard”; §4D P2 specifies “DISMANTLE —
Choose 1 card to discard”. §4C.15 explicitly names `USE BURNING BRIDGE` as the
primary CTA; §4D P2 requires an effect-specific CTA but does not override that
exact label.

## Current task

`UX2-4D-P2-UNIFIED-TARGET-CARD-PRODUCTION-PATH-01` — production routing and
proof are complete; **BLOCKED — USER INPUT REQUIRED** to resolve the conflicting
visible title/instruction (“Burning Bridge” vs “Dismantle”) before closing P2.
Current implementation and primary CTA use “Burning Bridge”. Do not start P3
or Section 6 until this decision is resolved and P2 is closed.
