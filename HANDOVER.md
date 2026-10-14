# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `1018f74a144768a52359e9581caac2d3ad263d59` (N0 status marker only; product requirements unchanged). The user is handling §8.7 phone acceptance.

## Latest relevant result

- §9.5 N0 early Negation settlement was delivered in `acfaf968476c4d2bf4b2fb1145e1736205dd24c2`; CI repair/test alignment is `a000124732a38b3fd718c7f422a6d0007075e061`.
- Initial Actions run [`38617527930`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38617527930) exposed two old fixed-wait assertions. Updated tests retain the shared window/checkpoint until the final snapshot seat responds and then verify immediate AOE/Duel continuation. Equipment API file: 20/20; full local API suite: 281/281.
- Exact-SHA Actions run [`38619084918`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38619084918) for `a000124732a38b3fd718c7f422a6d0007075e061`: API tests, lint/fast tests, browser startup smoke and deploy all succeeded. Production `/api/health` returned HTTP 200 with `{"ok":true,"worker":"available"}`.
- N0 code delivery is complete; user/reviewer acceptance is not claimed. §8.7 is deployed and still awaits the user's phone review.

## Current task — UX2 §9.5 N1: unlock Negation choice during root reveal

Trace the legal CurrentAction → response selection → console primary enabled chain while the public root card is still in its central reveal. Allow the authorized viewer to select a server-eligible Negation and Confirm, or Pass, without waiting for visual presentation to finish. Exempt only this shared Negation window from visual-only busy state; preserve network submission busy state, one-submission lock, server legality/deadline checks and all unrelated presentation guards.

Reproduce with authenticated Worker/D1 browser clients, including a player mounted before the root action so the reveal is live. Record window/deadline, action revision, root-card visibility, selected card, Confirm/Pass enabled state and submitted request at 0.2s, 1s, 2s, 3.5s and the final 0.5s. Cover a legal Negation, Pass-only seat, submitted lock and observer privacy. Add a focused regression that demonstrates controls remain usable while the root is visibly revealing.

Validate the focused Worker/D1 browser path and related lint; update design progress and this handoff with exact CI/deployment evidence. Do not begin N2 until N1 is delivered. §8.7 phone acceptance remains the user's task.
