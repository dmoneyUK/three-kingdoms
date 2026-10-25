# Current Handover

Target branch: `ux-v2`. Mobile-only. Latest design reviewed: `docs/UX2-refine.md` §10.9 at source `b9b207699e54c22f9f81af8d1658168ae29ec6d8`.

## Latest relevant result

**W4 Xiahou Dun Stauchness discard COST Frame — IMPLEMENTED / DEPLOYED, PENDING USER PHONE RE-REVIEW.** Source `b9b207699e54c22f9f81af8d1658168ae29ec6d8`; exact-SHA [Actions `40164369644`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40164369644) passed lint/fast, API, browser startup/room smoke, D1 migrations, Worker deployment and production smoke. Worker `f2cea127-8470-495e-a707-ba016b0f5521`; production `/` and `/api/health` returned HTTP 200. Focused real-gameplay mobile regression passed 2/2 at 390×844 for damage and discard branches with actor, payer and observer; no acceptance is inferred.

## Exactly one current task

**W5 — Rock Cleaving Axe two-card COST Frame.** Follow `docs/UX2-refine.md` §10.9.1, §10.9.3 and §10.9.4, plus the proof inventory. The server already provides `rock_cleaving_axe_attack_dodged` COST evidence for a committed two-card payment linked to the dodged Attack. Implement only a proof-gated shared W2 Frame for the two genuine cards and actual payer. Preserve the original Attack/Dodge, legal forced-damage continuation, private unspent Hand cards, real card identity/zone transitions, and the equipped Axe as the source of the ability; do not represent the two paid cards as separate Attacks or change game rules.

Use one focused mobile real-gameplay regression and keep all local UI/browser testing under five minutes. After implementation, update design and roadmap with exact evidence, keep this file to one task, and verify exact-SHA Actions/deployment before starting the next slice. Final status is **PENDING USER PHONE REVIEW**, never accepted by the Agent.
