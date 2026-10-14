# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `ae32bf5f35e8d0ddd2d505f38da2cbf257556f7c`.

## Latest result

- UI-2 delivered in `5357c3950512b697d86b0f1b8dfed1914119733f`; stale SSR contract repaired separately in `f35dff5a8562508b4f2c5f38b387e850a662a606`. Build, targeted lint, 14 focused UI-2 browser cases, three Worker/D1 response cases, and the SSR test (19/19) passed locally.
- Actions run [38647247626](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38647247626) for the repair SHA passed Lint/fast, API, browser smoke, deploy and production smoke. `/api/health` returned `{"ok":true,"worker":"available"}`. UI-2 is delivered awaiting Reviewer acceptance; no acceptance is claimed.

## Current task — §10.6.1 UI-3 (U4 + U8)

Move the single concise, truthful public action or result statement above the currently revealed physical CardFace, positioned from measured card geometry and kept clear of opponent Heroes, timers, Guidance, Dock and Hand. Remove duplicate card headings, action narration and outcome text while retaining server-proven actor/target/event identity and unique public events. Cover Attack/Dodge, Negation/counters, Duel rounds, Dismantle, Deflection cost and multi-target presentation; check Policy-B interruption, parking/reflow, short mobile viewports and reduced motion. Preserve §8.7 timing, public-proof/privacy rules and all game behavior. Deliver focused regression evidence, exact CI/deploy status, add only an awaiting-acceptance progress marker to the design, then continue with UI-4 without waiting for UX acceptance.
