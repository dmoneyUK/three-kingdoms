# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Phone-only validation; maximum 8 players.

## Latest result

**`UX2-10.9-W4-FIRST-AID-CONVERSION-FRAME` — IMPLEMENTED / DEPLOYED, PENDING USER PHONE REVIEW.** Source commit `f8d002f9b03331f57e6d7585cf43dcc8313c6c74`; validated/deployed at release SHA `48e2853c6ee5c87e29892967f7bdfbeabb7e16ca`. Exact-SHA [Actions `40120389446`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40120389446) passed lint/fast, API, browser smoke, D1 migration, Worker deployment and production smoke. Worker `e060f574-06ec-4662-ae85-153b977c3126`; production `/` and `/api/health` returned HTTP 200, health `{"ok":true,"worker":"available"}`. Focused authenticated Worker/D1 regression passed 1/1 with four independent viewers at 390×844 and 440×894: genuine red non-Peach material, First Aid / AS PEACH, true actor and Dying target, rescue result, single announcement, actor Seat/Dock parking and owner-private unspent Hand. Build and `git diff --check` passed. This is pending phone review; no acceptance is claimed.

**Latest design reviewed:** `docs/UX2-refine.md` at `cbfad0cb1539b65411a15bb18f25222e9e10d138`, including §10.9 and new §10.10.3.1 / §10.13.5.1 findings. W4 First Aid was delivered without altering those findings. Source review confirms the T3-F1 centre-mini fallback remains present and the original mobile correction is still open.

## Exactly one current bounded task

**`UX2-10.10.3.1-T3-F1-STEAL-DISMANTLE-REAL-ROOT-PARKING` — P0 reproduce and correct the original root-card journey.** Use current authenticated Worker/D1 games to capture Steal and Burning Bridges authored by a local player and a top-row opponent, during ordinary resolution and Negation/counter-Negation. Record each mobile viewer's event identity, phase, layout-pending reason, measured author anchors and card/obstacle rectangles. Replace any centre-to-parked-mini fallback with a measured true-author Seat/Dock target or a safe retry/omission while keeping the real root event/card/actor stable. Preserve the separate real Negation cards, accepted T1 choosing cue, BCP-2 picker, H4, server permissions and privacy. Phone validation only at 390×700, 390×844, 440×894 and 480×900, with 4/6/8-seat topologies; exact-SHA CI/deploy and owner iPhone re-review remain required. Do not create a second animation engine.
