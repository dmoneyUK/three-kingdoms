# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Phone-only validation; maximum 8 players.

## Latest result

**`UX2-10.9-W4-FIRST-AID-CONVERSION-FRAME` — IMPLEMENTED / DEPLOYED, PENDING USER PHONE REVIEW.** Source `f8d002f9b03331f57e6d7585cf43dcc8313c6c74`; release SHA `48e2853c6ee5c87e29892967f7bdfbeabb7e16ca`; exact-SHA [Actions `40120389446`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40120389446) passed lint/fast, API, browser smoke, D1 migration, Worker deployment and production smoke. Worker `e060f574-06ec-4662-ae85-153b977c3126`; production `/` and `/api/health` returned HTTP 200, health `{"ok":true,"worker":"available"}`. No user acceptance is claimed.

**Latest design reviewed:** `docs/UX2-refine.md` at remote commit `2d257592390603813814719771af2d8222ee98b7` (document blob `d068b0afc0fd60527265aa5aae5d79500cf6ba62`). Compared the intervening update with the previous revision: it adds approved H2-G3 F1/F2 corrections; it explicitly leaves this compatible T3-F1 task in flight. T3-F1 requirements in §10.10.3.1 remain unchanged.

## Exactly one current bounded task

**`UX2-10.10.3.1-T3-F1-STEAL-DISMANTLE-REAL-ROOT-PARKING` — P0, IN PROGRESS.** Correct the original shared public root journey so authentic Steal and Burning Bridges cards stay linked to the true author Seat/Dock across Negation, counters and target choice. Keep a full centre reveal for its normal interval; never turn a missing author anchor into a parked miniature at copied centre coordinates. Hide only an orphaned parked mini, fail closed in trace/DOM geometry, and retry anchor measurement a bounded number of times. Align Steal's ordinary and Negation root journey identity. Preserve genuine Negation cards/ordinals, T1 choosing cue, BCP-2 picker, H4, server permissions, privacy, timers and card identities. No second animation engine.

**Local progress, not yet committed:** Authenticated Worker/D1 phone-browser regression passed for four independent viewers at 390×700 (4 seats), 390×844 (4), 440×894 (6) and 480×900 (8), with Steal and Burning Bridges roots authored from local, top and side seats. It measured the parked card within 6 CSS px of the true author anchor, verified no collision with other anchors/hero, exercised an unavailable-anchor hide-and-remeasure path, confirmed root continuity into the public target-choice state, and checked counter-Negation root/response parking and actor-only legal selection. `npm run build` passed. Focused ESLint reported 0 errors and 16 Hook-dependency warnings; browser syntax and `git diff --check` passed. Exact-SHA Actions, production deployment/smoke and owner iPhone re-review are pending.

Phone-only scope: 390×700, 390×844, 440×894 and 480×900; 4/6/8 seats. Do not expand to desktop or 10-player phone checks. After this task closes, reread the latest design and select one next bounded task. Final status must remain **IMPLEMENTED / DEPLOYED — PENDING USER iPHONE RE-REVIEW** until the user accepts it.
