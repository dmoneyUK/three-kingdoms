# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `e5e2266cd0601e38a540c863f1cee5927385a2fe` (P0 §8.7 implementation record; design requirements unchanged).

Latest user decision: §8.1 Duel layout passed visual validation. §8.7 Attack reveal implementation is delivered, but still awaits real-game visual validation.

## Latest result

`UX2-CENTRE-REVEAL-4S-P0` implementation pushed at `b1edbfe7d50e759c7bf5ef4888e0f0119a0f1a59`. Actions run `38600084278` for that exact SHA succeeded: Lint/fast, API, browser startup/room smoke, Cloudflare Worker deploy and production smoke. Local automated tests were not run per the user's instruction. No authenticated gameplay timing trace or iPhone screenshot was captured, so visual acceptance is pending.

## Current task — UX2-CENTRE-REVEAL-4S-P0 (§8.7), awaiting user visual validation

Manually verify on a real Worker/D1 game at 440×894: a newly played Attack remains full-size and centred at 0.5s, 2.5s and 3.5s; at four seconds it starts one ~380ms move to the actual actor's Seat/Dock. Confirm an immediate Dodge queues behind the Attack and receives its own four-second reveal; a Skip keeps the server-confirmed damage result readable after parking. Check that no duplicate legacy card appears and legal controls/timers continue throughout.

**Boundaries:** no local automated tests unless the user changes that instruction; preserve server proof, `CurrentAction`, gameplay deadlines, privacy, manual test-player switching and the accepted §8.1 Duel layout. Do not start Dismantle or another card-family task until the user accepts this visual repair.
