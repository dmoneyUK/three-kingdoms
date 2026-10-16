# Current Handover

Branch: `ux-v2`

## Latest verified result

- **H2-G1 opponent Seat layout: IMPLEMENTED / DEPLOYED / PENDING HUMAN REVIEW.** Code SHA `c3721602140b4bc3308406c494e000c1472835f6`; exact-SHA [Actions run 38975610505](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38975610505) passed API, lint/build/fast, browser startup/room smoke (1), deploy, and production smoke. Worker version `54c0f976-56ed-4551-8e43-b7cc78159c25`. No iPhone/multi-seat geometry acceptance is claimed.
- Current remote tip `92526b1` changed HANDOVER only; latest design source remains commit `242540468e20b8d220a9e3bbefa75d69ebf1c131`, source blob `c71d95e66059bfe2af4fa427e4360ea41c417a35`; current status-only progress blob `3749e167203815807e2d08654e167e3ec6a2a5e1`. Latest relevant code CI is run `38975610505`; docs-only pushes are excluded by workflow path filters. Preserve untracked user file `HANDOVER 3.md`.

## Current task

**UX2-10.15-Q1-ROOT-PRESENTER-AUDIT-01** — `docs/UX2-refine.md` §10.15.3, Q1 only.

The deployed Worker (`c372160…`) was exercised in an authenticated four-seat Worker/D1 game with real Barbarian Invasion, Raining Arrows, Negation windows, group target responses, damage/Legacy, settlement, and authorized TEST SWITCH. At 440 CSS px wide (actual measured viewport 440×767), GROUP_RESOLUTION rendered one static central root (`static=1`, `journey=0`); after a proven Negation stage, a public root Journey appeared. Public event notices and card/stage geometry were measured. The Q1-only trace instrumentation is now coded locally but not yet committed, deployed, or re-run; it records public lifecycle IDs, monotonic/wall time, renderer and motion phases, same-card DOM instances, notice geometry, and public stage/seat/dock bounds. No presentation behavior or gameplay behavior has changed.

Record build/session, public interaction/root/card/author identities, viewer and current participant, revision, renderer/motion/phase, reveal/move timing, same-card full/parked instances, notice identity/rect, and stage/obstacle geometry. Exclude Hand identities and per-seat private Negation availability. The instrumented code is local only; after it is pushed, rely on exact-SHA CI/deploy, then re-run the real Worker/D1 sequence and inspect a privacy-checked UX trace. Local automated tests are not authorized. Complete Q1 findings, mark **PENDING HUMAN REVIEW**, then replace this handoff with Q2 only; do not start Q2 in this task.
