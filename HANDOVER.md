# Current Handover

Branch: `ux-v2`

## Latest result

- **U13-D opponent horse badges delivered; PENDING USER REVIEW.** Code commit `68607723a8dc67cc3044f653838048abf97dafc3`; exact-SHA [Actions run 38962040257](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38962040257) passed API, lint/build/fast, browser startup/room smoke (1 test), deploy, and production `/` plus `/api/health` smoke. Worker version: `5e330c4b-af07-4995-9ae5-6eaf0ddd2faa`. No local automated tests or 390px device geometry evidence were run; human visual review remains open.
- Latest design reviewed: remote `ux-v2` head `484861eff058833491d34342f7ead7f0fca1c4cd`, `docs/UX2-refine.md` blob `af2abfab841312e1c4e12542361d9471443dac98`. Re-read §§10.13.4–10.13.5 and §10.13.9; the intervening Planner update records H1-F phone acceptance/H2-F review status and does not alter U13-D/E requirements. H1-F remains accepted; H2-F remains pending human review.
- Preserve pre-existing untracked `HANDOVER 3.md`.

## Current bounded task

**UX2-10.13-U13-E-LUST-COST-FRAME-01.** Follow §10.13.5 and §10.13.9 only: make the proof-backed LUST cost frame a compact vertical composition with the skill title above the real paid-cost CardFace; update all corresponding JS geometry and CSS together; suppress only the redundant notice for the same proven interaction/event identity. Preserve actual card identity, authoritative public proof, reveal/move/park lifecycle, first/second Attack order, public history and distinct later notices. Do not alter gameplay rules or unrelated announcement surfaces. Do not run local automated tests. Inspect the scoped diff, then commit/push and report exact-SHA CI/deployment; deliver U13-E as PENDING USER REVIEW and continue to U13-F.
