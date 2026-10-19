# Current Handover

Working branch: `codex/bcp1-r1-20261019`, based on `origin/ux-v2` at `d36455b6d5cbae268919741b2348dd445c8c0699`. The primary checkout contains unrelated uncommitted work and remains untouched.

## Latest result

- Reviewed `docs/UX2-refine.md` §10.17.1–§10.17.1.2, latest reviewer record `fa957ee69127c4443f571b87b2544cc87a9c6e9b`. Bumper Harvest remains **NOT USER-ACCEPTED**.
- BCP-1-F1 mobile refinement: four-card pool uses content-fit 82–88px faces for active and read-only views; thumbnail rank/suit scale with the authentic card; author names wrap in the reserved adjacent seat slot instead of ellipsizing; Harvest Negation compact copy retains full player names. No gameplay, privacy, or timer rules changed.
- `npm run build` passed. Focused Worker/D1 mobile browser regressions passed for root lifecycle/Info, committed Negation and counter across viewers, SWITCH + Inspector + Info + select/deselect/Confirm at 390×700, 390×844, 440×766 and 480×900, side-seat authors, and 1–8 cards including six/eight-seat swipe. `git diff --check` passed. Focused ESLint had zero errors and 12 existing React hook dependency warnings. One earlier browser run hit a local ProxyWorker disconnect; isolated reruns passed.
- Prior R1/R2 remain deployed at baseline `d36455b6d5cbae268919741b2348dd445c8c0699` (Actions runs `39237607624` and `39241815799`; Worker versions `14c1f7aa-ddec-48e2-a3d3-558a4475464a` and `da544a31-3452-4c14-850e-240687f3dd45`). Those smokes checked `/` and `/api/health`, not an authenticated Harvest session. Current F1 changes have **no commit, CI, or deployment evidence yet**.

## Exactly one active task

**BCP-1-F1 — commit and push the reviewed mobile changes to `ux-v2`, verify exact-SHA Actions/deployment, then request user phone re-review.** Preserve Plan A, accepted H4/INS-5 geometry, public card identities, 4s/380ms motion, 8s Negation, 60s Harvest, server authority and privacy. Keep overall Bumper Harvest **NOT USER-ACCEPTED** until the Reviewer explicitly accepts the deployed phone experience.
