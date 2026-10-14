# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `d7b0869b51545bdc06c50f9a815d4b09fb62b9dd` (N0/N1 progress markers only; product requirements unchanged). The user is handling §8.7 phone acceptance.

## Latest result

- §9.5 N0 and N1 code are delivered. N0 test-alignment commit: `a000124732a38b3fd718c7f422a6d0007075e061`; N1: `7645fef192f06818eaaacdd01cc448f19a012e62`.
- N1 real Worker/D1 browser regression at 440×894 passed for reveal-time Negation selection, Confirm, Pass and observer privacy. The submitted-window no-controls regression passed.
- Exact-SHA Actions run [`38621260318`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38621260318) passed API tests, lint/fast tests, browser startup smoke and deploy. Production `/api/health` returned HTTP 200 with `{"ok":true,"worker":"available"}`.
- N0/N1 code delivery is complete; user/reviewer acceptance remains pending. §8.7 phone acceptance is with the user.

## Current task — UX2 §9.5 N2: complete proven Negation/counter seat history

Trace proof-backed Negation winners and counter-winners through the public projection and card journeys. In particular, inspect `duelNegationPublicAction.responses` versus `DuelCardJourney`; ensure the full committed root and counter history is passed through with exact public event/card identities, actor IDs, order and causal links. Compare the already-working single-target projection path. Never derive history from timeline order alone or expose private losing intents/cards.

Validate Duel root → winner A → counter B → counter-counter A and permitted single-target/group cases across 4/6/8-seat geometries, refresh/reconnect, early/late screenshots and retirement. Preserve the current Duel exchange lifecycle; no duplicate or missing cards, incorrect authors, stale counters or privacy leak. Add focused regressions that fail on latest-only history, run the relevant Worker/browser path and CI, then record exact SHA, deployment and pending acceptance. Do not start N3 until N2 delivery is green.
