# HANDOVER

## Current task — §10.85 Draw Phase presentation decoupling

Design reviewed: `docs/UX2-refine.md` at `cbad72b18b4dd335a59c8ef892c801def617edae`; Owner's latest direct instruction authorizes continuing beyond §10.78. §10.87 was delivered in `b6d0311b086d5273394152c123b92decb96c8840`: exact original Attack materials now survive Dodge, Axe forced-damage and equipment-loss continuations into Cao Cao's existing Treachery/Skip flow. Focused API regressions and exact-SHA Actions `45953782177` passed; D1 migrations, Worker deployment and production smoke passed. Worker version `171e9ae8-c333-4755-a5b2-28fc08d4ca6d`. §10.87 remains pending Owner review, not accepted.

Next implement §10.85 only: decouple an authorized automatic normal Draw from passive prior-turn presentation backlog; reconcile suppressed/ambiguous attempts safely; synchronize the committed public draw-count H4 with fresh recipient-private faces while preserving the existing 3-second reveal and all authoritative draw/Judgement/trigger rules. Use focused tests; no local UI/browser tests per Owner instruction. Required exact-SHA CI, deployment and production smoke remain mandatory. Do not claim phone acceptance.
