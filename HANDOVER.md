# Current Handover

Working branch: `codex/bcp1-r1-20261019`, based on `origin/ux-v2`. The primary checkout contains unrelated uncommitted work and remains untouched.

## Latest result

- Reviewed `docs/UX2-refine.md` §10.17.1–§10.17.1.2, latest reviewer record `fa957ee69127c4443f571b87b2544cc87a9c6e9b`. Bumper Harvest remains **NOT USER-ACCEPTED**.
- BCP-1-F1 mobile refinement: four-card pool uses content-fit 82–88px faces for active and read-only views; thumbnail rank/suit scale with the authentic card; author names wrap in the reserved adjacent seat slot instead of ellipsizing; Harvest Negation compact copy retains full player names. No gameplay, privacy, or timer rules changed.
- Code SHA `c74cefc27cd4c4d53094eb07af68ca33244af20c` was pushed to `ux-v2`. Exact-SHA Actions run [39246431786](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39246431786) passed browser startup/room smoke, lint/fast, API tests, deployment and production smoke. Worker version: `dfd16898-8f4c-448e-aaa6-efdac7f73f8d`. Production smoke checked `/` and `/api/health`; it did not exercise an authenticated Harvest game.
- `npm run build` passed. Focused Worker/D1 mobile browser regressions passed for root lifecycle/Info, committed Negation and counter across viewers, SWITCH + Inspector + Info + select/deselect/Confirm at 390×700, 390×844, 440×766 and 480×900, side-seat authors, and 1–8 cards including six/eight-seat swipe. `git diff --check` passed. Focused ESLint had zero errors and 12 existing React hook dependency warnings. One earlier browser run hit a local ProxyWorker disconnect; isolated reruns passed.
- Overall Bumper Harvest remains **NOT USER-ACCEPTED** pending real phone re-review of the deployed experience. Prior R1/R2 and this F1 refinement are not reviewer acceptance.

## Exactly one active task

**BCP-1 — reviewer phone re-review of deployed Worker `dfd16898-8f4c-448e-aaa6-efdac7f73f8d`; continue only with any concrete BCP-1 feedback.** Preserve Plan A, accepted H4/INS-5 geometry, public card identities, 4s/380ms motion, 8s Negation, 60s Harvest, server authority and privacy. Keep overall Bumper Harvest **NOT USER-ACCEPTED** until the Reviewer explicitly accepts the deployed phone experience.
